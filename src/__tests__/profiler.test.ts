/**
 * P2c: profiler og profilbilder etter dataminimering
 * (`supabase/migrations/20261114121500_profiler_dataminimering.sql`,
 * docs/fagmiljoer.md «Profiler og profilbilder»).
 *
 * Prøver regelen for hvem som ser hvem for hvert par i persongalleriet, at
 * andre bare får profilkortet, at forfatterne og varslene gjør en person
 * synlig bare så langt den innloggede kan lese dem, at profilbildene følger
 * profilene, og at egen profil og brukerlista virker. Alt er syntetisk.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PROFILKORT } from '@delt/profil'
import { byggPersongalleri, PERSONER, type Fagmiljo, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

let db: PGlite
let galleri: Persongalleri

beforeAll(async () => {
  db = await nyDatabase()
  galleri = await byggPersongalleri(db)
}, 120_000)

afterAll(async () => {
  await db.close()
})

const PERSONLISTE = Object.keys(PERSONER) as Person[]

type Definisjon = (typeof PERSONER)[Person] & {
  systemarkitekt?: boolean
  ogsaAktivI?: readonly Fagmiljo[]
  lokalAdminI?: readonly Fagmiljo[]
}
const def = (p: Person) => PERSONER[p] as Definisjon

/** De aktive medlemskapene etter definisjonen i galleriet. */
const aktiveI = (p: Person): Fagmiljo[] => [...(def(p).primaer ? [def(p).primaer!] : []), ...(def(p).ogsaAktivI ?? [])]
const harTilgang = (p: Person) => aktiveI(p).length > 0 || def(p).systemarkitekt === true
const felles = (a: readonly Fagmiljo[], b: readonly Fagmiljo[]) => a.some((f) => b.includes(f))

/** Regelen i docs/fagmiljoer.md, uten samhandlingsdata: hvem `seer` ser profilkortet til. */
function skalSe(seer: Person, bruker: Person): boolean {
  if (!harTilgang(seer)) return false
  return (
    seer === bruker ||
    def(seer).systemarkitekt === true ||
    felles(aktiveI(seer), aktiveI(bruker)) ||
    felles(def(seer).lokalAdminI ?? [], aktiveI(bruker))
  )
}

/** Kjører spørringen som personen i en transaksjon som alltid rulles tilbake. */
async function somPerson<T>(person: Person, arbeid: (tx: Transaction) => Promise<T>): Promise<T> {
  return som(db, galleri.id[person], async (tx) => {
    try {
      return await arbeid(tx)
    } finally {
      await tx.rollback()
    }
  })
}

const synlige = (person: Person) =>
  somPerson(person, async (tx) => (await tx.query<{ id: string }>('select id from public.profiles')).rows.map((r) => r.id))

const navnFor = (ider: readonly string[]) =>
  ider.map((id) => PERSONLISTE.find((p) => galleri.id[p] === id) ?? id).sort()

/** Kjører arbeidet som eieren og rydder det bort etterpå. */
async function medData<T>(oppsett: (tx: Transaction) => Promise<void>, prov: () => Promise<T>): Promise<T> {
  await db.transaction(oppsett)
  try {
    return await prov()
  } finally {
    await db.exec(`
      delete from public.diskusjonskommentarer; delete from public.diskusjoner; delete from public.diskusjonskategorier;
      delete from public.idekommentarer; delete from public.ideer; delete from public.varsler;
      delete from storage.objects where bucket_id = 'avatarer';
      update public.profiles set avatar_path = null where avatar_path is not null;
    `)
  }
}

describe('hvem som ser hvem', () => {
  it('følger regelen for hvert par i persongalleriet når ingen har skrevet noe', async () => {
    for (const seer of PERSONLISTE) {
      const ventet = PERSONLISTE.filter((b) => skalSe(seer, b)).sort()
      expect(navnFor(await synlige(seer)), seer).toEqual(ventet)
    }
  })

  it('gjør forfatteren av en idé synlig, men bare for dem som kan lese idéen', async () => {
    const { adminB } = galleri.id
    const sett = await medData(
      async (tx) => {
        await tx.query(`insert into public.ideer (kategori, tittel, tekst, forfatter_id) values ('fag', 'Syntetisk', '{}'::jsonb, $1)`, [adminB])
        // Varselet om den nye idéen gjør også forfatteren synlig; det prøves for seg under.
        await tx.exec('delete from public.varsler')
      },
      async () => ({
        vanligA: navnFor(await synlige('vanligA')),
        // Uten tillatende leseregel på idéene (som P2b kan gi en lokal idé),
        // teller ikke forfatteren.
        skjult: await somPerson('vanligA', async (tx) => {
          await tx.exec('reset role')
          await tx.exec(`alter policy "Innloggede leser idéene" on public.ideer using (false)`)
          await tx.query(`select set_config('role', 'authenticated', true)`)
          return navnFor((await tx.query<{ id: string }>('select id from public.profiles')).rows.map((r) => r.id))
        }),
      }),
    )
    expect(sett.vanligA).toContain('adminB')
    expect(sett.skjult).not.toContain('adminB')
    expect(sett.skjult).toEqual(PERSONLISTE.filter((b) => skalSe('vanligA', b)).sort())
  })

  it('gjør den som står bak en hendelse i et eget varsel synlig for mottakeren, og bare for den', async () => {
    const { adminB, vanligA } = galleri.id
    const sett = await medData(
      async (tx) => {
        await tx.query(
          `insert into public.varsler (mottaker_id, kategori, gruppe, hendelser)
           values ($1, 'nye_ideer', 'syntetisk', jsonb_build_array(jsonb_build_object('kl', now(), 'av', $2::uuid)))`,
          [vanligA, adminB],
        )
      },
      async () => ({ mottaker: navnFor(await synlige('vanligA')), annen: navnFor(await synlige('adminA')) }),
    )
    expect(sett.mottaker).toContain('adminB')
    expect(sett.annen).not.toContain('adminB')
  })

  it('kan ikke lures med en annens ID, en manipulert sti eller den gamle adminrollen', async () => {
    const { adminB, vanligA } = galleri.id
    // Direkte oppslag på ID-en til en som ikke er synlig.
    expect(await somPerson('vanligA', async (tx) => (await tx.query('select id from public.profiles where id = $1', [adminB])).rows)).toEqual([])
    // Svaret fra funksjonen regelen bruker, er det samme som tabellen gir.
    expect(await somPerson('vanligA', async (tx) => (await tx.query<{ m: string[] }>('select public.mine_synlige_profiler() as m')).rows[0]!.m)).not.toContain(adminB)
    // Den gamle adminrollen gir ingen innsyn: tidligereAdmin har den, men ingen aktive medlemskap.
    expect(await synlige('tidligereAdmin')).toEqual([])
    // Egen bildesti kan ikke peke på en annens bilde (fra 20260922115504).
    const feil = await feilFra(() =>
      somPerson('vanligA', (tx) => tx.query('update public.profiles set avatar_path = $1 where id = $2', [`${adminB}/avatar.webp`, vanligA])),
    )
    expect(feil?.code).toBe('23514')
  })

  it('prøver forfatterne i hver tabell med samhandling som den innloggede', async () => {
    // Alle tabellene nettleseren leser som har en forfatter, og ingen andre.
    const { rows } = await db.query<{ tabell: string }>(
      `select c.table_name as tabell from information_schema.columns c
       where c.table_schema = 'public' and c.column_name = 'forfatter_id'
         and has_table_privilege('authenticated', 'public.' || c.table_name, 'select')
       order by 1`,
    )
    const regel = (await db.query<{ qual: string }>(
      `select qual from pg_policies where tablename = 'profiles' and policyname = 'Innloggede ser profilene de samhandler med'`,
    )).rows[0]!.qual
    expect(rows.map((r) => r.tabell).sort()).toEqual(['diskusjoner', 'diskusjonskommentarer', 'ideer', 'idekommentarer'].sort())
    for (const { tabell } of rows) expect(regel, tabell).toMatch(new RegExp(`FROM ${tabell} \\w+\\s+WHERE \\(\\w+\\.forfatter_id = profiles\\.id\\)`))
  })
})

describe('profilkortet', () => {
  it('er det eneste andre får lese, og er de samme feltene som appen ber om', async () => {
    const { rows } = await db.query<{ kolonne: string }>(
      `select column_name as kolonne from information_schema.column_privileges
       where table_schema = 'public' and table_name = 'profiles' and grantee = 'authenticated' and privilege_type = 'SELECT'
       order by column_name`,
    )
    expect(rows.map((r) => r.kolonne)).toEqual([...PROFILKORT].sort())
  })

  it('gir ikke rollen eller kontostatusen, heller ikke den egne, fra tabellen', async () => {
    for (const kolonne of ['role', 'must_change_password', 'onboarding_completed', 'created_at', '*']) {
      const feil = await feilFra(() =>
        somPerson('vanligA', (tx) => tx.query(`select ${kolonne} from public.profiles where id = $1`, [galleri.id.vanligA])),
      )
      expect(feil?.code, kolonne).toBe('42501')
    }
  })

  it('lar brukeren fortsatt endre navn og bildesti på egen rad, og bare der', async () => {
    const { vanligA, adminA } = galleri.id
    const endret = await somPerson('vanligA', async (tx) => {
      await tx.query(`update public.profiles set first_name = 'Endret', avatar_path = $1 where id = $2`, [`${vanligA}/avatar.webp`, vanligA])
      return (await tx.query<{ first_name: string; role: string }>('select first_name, role from public.min_profil()')).rows[0]
    })
    expect(endret).toEqual({ first_name: 'Endret', role: 'user' })
    // Appen lagrer og får profilkortet tilbake i samme forespørsel (lagreEgenProfil).
    const tilbake = await somPerson('vanligA', async (tx) =>
      (await tx.query(`update public.profiles set last_name = 'Lagret' where id = $1 returning ${PROFILKORT.join(', ')}`, [vanligA])).rows,
    )
    expect(tilbake).toMatchObject([{ id: vanligA, last_name: 'Lagret' }])
    const andres = await somPerson('vanligA', async (tx) =>
      (await tx.query(`update public.profiles set first_name = 'Endret' where id = $1 returning id`, [adminA])).rows,
    )
    expect(andres).toEqual([])
    const rolle = await feilFra(() => somPerson('vanligA', (tx) => tx.query(`update public.profiles set role = 'admin' where id = $1`, [vanligA])))
    expect(rolle?.code).toBe('42501')
  })
})

describe('egen profil', () => {
  it('gis hel til hver aktiv person, og er tom uten aktivt medlemskap', async () => {
    for (const p of PERSONLISTE) {
      const rader = await somPerson(p, async (tx) =>
        (await tx.query<{ id: string; role: string }>('select id, role from public.min_profil()')).rows,
      )
      expect(rader, p).toEqual(harTilgang(p) ? [{ id: galleri.id[p], role: PERSONER[p].rolle }] : [])
    }
  })
})

describe('brukerlista', () => {
  it('gir systemarkitekten alle, en lokal administrator medlemmene i eget fagmiljø, og andre ingenting', async () => {
    for (const p of PERSONLISTE) {
      const kontoer = await somPerson(p, async (tx) =>
        (await tx.query<{ id: string }>('select id from public.brukeroversikt()')).rows.map((r) => r.id),
      ).catch((f: { code?: string }) => f.code)
      if (!harTilgang(p)) {
        expect(kontoer, p).toBe('42501')
        continue
      }
      const ventet = def(p).systemarkitekt
        ? PERSONLISTE
        : PERSONLISTE.filter((b) => felles(def(p).lokalAdminI ?? [], aktiveI(b)))
      expect(navnFor(kontoer as string[]), p).toEqual([...ventet].sort())
    }
  })
})

describe('profilbildene', () => {
  const bilde = (p: Person) => `${galleri.id[p]}/avatar.webp`
  const lastOpp = (p: Person) => (tx: Transaction) =>
    tx.query(`insert into storage.objects (bucket_id, name) values ('avatarer', $1)`, [bilde(p)])
  const serBilde = (seer: Person, eier: Person) =>
    somPerson(seer, async (tx) => (await tx.query('select id from storage.objects where name = $1', [bilde(eier)])).rows.length === 1)

  it('kan sees nøyaktig av dem som ser profilen som peker på det', async () => {
    const sett = await medData(
      async (tx) => {
        for (const p of ['vanligA', 'adminB', 'dobbeltAB'] as const) {
          await tx.query(`insert into storage.objects (bucket_id, name) values ('avatarer', $1)`, [bilde(p)])
          await tx.query('update public.profiles set avatar_path = $1 where id = $2', [bilde(p), galleri.id[p]])
        }
      },
      async () => {
        const ut: Record<string, boolean> = {}
        for (const seer of PERSONLISTE) for (const eier of ['vanligA', 'adminB', 'dobbeltAB'] as const) ut[`${seer}→${eier}`] = await serBilde(seer, eier)
        return ut
      },
    )
    for (const seer of PERSONLISTE) {
      for (const eier of ['vanligA', 'adminB', 'dobbeltAB'] as const) {
        expect(sett[`${seer}→${eier}`], `${seer}→${eier}`).toBe(skalSe(seer, eier))
      }
    }
  })

  it('kan sees av eieren før profilen peker på det, men ikke av andre', async () => {
    const sett = await medData(
      async (tx) => {
        await tx.query(`insert into storage.objects (bucket_id, name) values ('avatarer', $1)`, [bilde('vanligA')])
      },
      async () => ({ eier: await serBilde('vanligA', 'vanligA'), kollega: await serBilde('adminA', 'vanligA') }),
    )
    expect(sett).toEqual({ eier: true, kollega: false })
  })

  it('lar eieren laste opp sitt eget, og ingen laste opp i en annens navn', async () => {
    expect(await feilFra(() => somPerson('vanligA', lastOpp('vanligA')))).toBeNull()
    expect((await feilFra(() => somPerson('vanligA', lastOpp('adminA'))))?.code).toBe('42501')
  })
})

describe('ytelsen', () => {
  it('slår opp forfatterne og bildene med indeks', async () => {
    const { rows } = await db.query<{ indexdef: string }>(
      `select indexdef from pg_indexes where schemaname = 'public'
       and indexname in ('diskusjoner_forfatter_idx', 'diskusjonskommentarer_forfatter_idx', 'ideer_forfatter_idx', 'idekommentarer_forfatter_idx', 'profiles_avatar_path_idx')`,
    )
    expect(rows).toHaveLength(5)
  })
})
