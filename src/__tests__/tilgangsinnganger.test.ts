/**
 * Kartleggingen av datainngangene før P2.0 (docs/p2-0-forberedelse.md).
 *
 * 1. Hver tabell, visning og funksjon nettleseren når, hører til et område i
 *    P2 (a–d), og hver Edge-funksjon står i dokumentet.
 * 2. P2.0 er ikke aktivert: ingen inngang kontrollerer aktivt medlemskap ennå.
 * 3. En prototype av P2.0, i en transaksjon som rulles tilbake, viser at én
 *    begrensende regel per tabell og kontrollen i de fire portfunksjonene
 *    stenger en bruker uten aktivt medlemskap ute, uten å endre hva aktive
 *    brukere ser. Den gir også restlisten av funksjoner som må endres én for én.
 *
 * Ingen regel endres i databasen; alt i prototypen rulles tilbake.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { OMRADER, omradeFor } from './data/tilgangsomrader'
import { byggPersongalleri, leggInnTestdata, type Person, type Persongalleri, type Testdata } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'
import {
  funksjonsinnganger,
  lesetilgang,
  medlemskapsdekning,
  tabellinnganger,
  type Tabellinngang,
} from './hjelp/tilgangsinnganger'

/** Mønsteret for kontrollen P2.0 innfører (prototypens navn; P2.0 kan velge andre). */
const KONTROLL = /\b(har_aktivt_medlemskap|krev_aktivt_medlemskap)\s*\(/

/** Portfunksjonene P0 §2.2 peker ut; prototypen legger kontrollen inn i dem. */
const PORTER = ['intern.krev_innlogget', 'intern.krev_registerbruker', 'intern.krev_admin'] as const

const DOKUMENT = readFileSync(resolve(__dirname, '../../docs/p2-0-forberedelse.md'), 'utf8')

let db: PGlite
let galleri: Persongalleri
let data: Testdata
let tabeller: Tabellinngang[]

beforeAll(async () => {
  db = await nyDatabase()
  galleri = await byggPersongalleri(db)
  data = await leggInnTestdata(db, galleri)
  tabeller = await tabellinnganger(db)
}, 120_000)

afterAll(async () => {
  await db.close()
})

describe('kartleggingen', () => {
  it('plasserer hver tabell, visning og funksjon nettleseren når, i et område i P2', async () => {
    const innganger = [...tabeller.map((t) => t.navn), ...(await funksjonsinnganger(db)).map((f) => f.signatur)]
    expect(innganger.filter((i) => omradeFor(i) === null)).toEqual([])
    // Alle fire områdene er i bruk; et tomt område betyr at en regel har tatt for mye.
    expect(new Set(innganger.map(omradeFor))).toEqual(new Set(Object.keys(OMRADER)))
  })

  it('tar med Supabase sine tabeller for filer, med radsikkerhet på alle tabeller', () => {
    for (const navn of ['storage.objects', 'storage.buckets']) {
      expect(tabeller.find((t) => t.navn === navn)?.rettigheter, navn).toContain('authenticated:SELECT')
    }
    expect(tabeller.filter((t) => !t.visning && !t.radsikkerhet).map((t) => t.navn)).toEqual([])
  })

  it('fanger en ny tabell nettleseren når, også i storage', async () => {
    const funnet = await iTilbakerulling(async (tx) => {
      await tx.exec(`
        create table storage.hull (id int);
        grant select on storage.hull to authenticated;
      `)
      const innganger = await tabellinnganger(tx)
      return {
        inngang: innganger.find((t) => t.navn === 'storage.hull'),
        udekket: (await medlemskapsdekning(tx, KONTROLL)).tabeller,
      }
    })
    expect(funnet.inngang).toMatchObject({ radsikkerhet: false, rettigheter: ['authenticated:SELECT'] })
    expect(lesetilgang(funnet.inngang!)).toBe('uten-radsikkerhet')
    expect(funnet.udekket).toContain('storage.hull')
  })

  it('kjenner lesetilgangen til hver tabell', () => {
    const tabellerUtenVisninger = tabeller.filter((t) => !t.visning)
    expect(tabellerUtenVisninger.filter((t) => lesetilgang(t) === 'uten-radsikkerhet').map((t) => t.navn)).toEqual([])
    // P0 §2.2: 18 tabeller kan leses av alle innloggede. Tallet kan bare gå ned.
    expect(tabellerUtenVisninger.filter((t) => lesetilgang(t) === 'alle-innloggede').length).toBeLessThanOrEqual(18)
  })

  it('har hver Edge-funksjon i repoet med i dokumentet', () => {
    const mapper = readdirSync(resolve(__dirname, '../../supabase/functions'), { withFileTypes: true })
      .filter((m) => m.isDirectory() && !m.name.startsWith('_'))
      .map((m) => m.name)
    expect(mapper.length).toBeGreaterThan(0)
    expect(mapper.filter((m) => !DOKUMENT.includes(`\`${m}\``))).toEqual([])
  })
})

describe('P2.0 er ikke aktivert', () => {
  it('ingen tabell og ingen security definer-funksjon kontrollerer aktivt medlemskap ennå', async () => {
    // Når P2.0 innføres, byttes denne testen ut med at begge listene er tomme
    // (bortsett fra unntakene P2.0 dokumenterer).
    const udekket = await medlemskapsdekning(db, KONTROLL)
    const tabellerMedData = tabeller.filter((t) => !t.visning).map((t) => t.navn)
    const funksjonerMedData = (await funksjonsinnganger(db)).filter(
      (f) => f.definer && f.kontroll !== 'offentlig' && f.kontroll !== 'utloser',
    )
    expect(udekket.tabeller).toEqual(tabellerMedData)
    expect(udekket.funksjoner.length).toBe(funksjonerMedData.length)
  })

  it('lar en bruker uten aktivt medlemskap lese og skrive som før', async () => {
    const { utenMedlemskap, tidligereAdmin } = galleri.id
    const diskusjoner = await som(db, utenMedlemskap, async (tx) => (await tx.query('select id from public.diskusjoner')).rows)
    expect(diskusjoner.length).toBeGreaterThan(0)
    const erAdmin = await som(db, tidligereAdmin, async (tx) =>
      (await tx.query<{ a: boolean }>('select public.er_admin() as a')).rows[0]!.a,
    )
    expect(erAdmin).toBe(true)
  })
})

/** Prototypen av P2.0, i transaksjonen `tx`. Rulles tilbake av den som kaller. */
async function innforPrototype(tx: Transaction, tabellnavn: readonly string[]) {
  await tx.exec(/* sql */ `
    create function public.har_aktivt_medlemskap() returns boolean
    language sql stable security definer set search_path = '' as $$
      select exists (
        select 1 from public.medlemskap m join public.fagmiljoer f on f.id = m.fagmiljo_id
        where m.bruker_id = (select auth.uid()) and m.status = 'aktiv' and f.status = 'aktiv'
      ) or exists (
        select 1 from public.systemroller s
        where s.bruker_id = (select auth.uid()) and s.tilbakekalt_kl is null
      )
    $$;
    grant execute on function public.har_aktivt_medlemskap() to authenticated;

    create function intern.krev_aktivt_medlemskap() returns void
    language plpgsql stable security definer set search_path = '' as $$
    begin
      if not public.har_aktivt_medlemskap() then
        raise exception 'Du har ikke et aktivt medlemskap.' using errcode = '42501';
      end if;
    end;
    $$;

    create or replace function public.er_admin() returns boolean
    language sql stable security definer set search_path = '' as $$
      select public.har_aktivt_medlemskap() and exists (
        select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'
      )
    $$;
  `)
  for (const port of PORTER) {
    const { rows } = await tx.query<{ def: string }>(`select pg_get_functiondef($1::regproc) as def`, [port])
    const def = rows[0]!.def
    const ny = def.replace(/\nbegin\n/, '\nbegin\n  perform intern.krev_aktivt_medlemskap();\n')
    if (ny === def) throw new Error(`Fant ikke begin i ${port}.`)
    await tx.exec(ny)
  }
  for (const tabell of tabellnavn) {
    await tx.exec(
      `create policy p20_aktivt_medlemskap on ${tabell} as restrictive for all to authenticated
       using ((select public.har_aktivt_medlemskap())) with check ((select public.har_aktivt_medlemskap()))`,
    )
  }
}

/** Kjører `arbeid` i en transaksjon som alltid rulles tilbake. */
async function iTilbakerulling<T>(arbeid: (tx: Transaction) => Promise<T>): Promise<T> {
  let resultat: T | undefined
  await db.transaction(async (tx) => {
    resultat = await arbeid(tx)
    await tx.rollback()
  })
  return resultat as T
}

/** Kjører som den innloggede inne i en åpen transaksjon, og går tilbake til eieren etterpå. */
async function somInnlogget<T>(tx: Transaction, brukerId: string, arbeid: () => Promise<T>): Promise<T> {
  await tx.exec('savepoint innlogget')
  await tx.query(`select set_config('role', 'authenticated', true)`)
  await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
    JSON.stringify({ sub: brukerId, role: 'authenticated' }),
  ])
  try {
    return await arbeid()
  } finally {
    await tx.exec('rollback to savepoint innlogget')
    await tx.exec('reset role')
  }
}

/** Radene hver person ser i hver tabell nettleseren kan lese. */
async function synligeRader(tx: Transaction, personer: readonly Person[]) {
  const lesbare = tabeller.filter((t) => t.rettigheter.includes('authenticated:SELECT')).map((t) => t.navn)
  const resultat: Record<string, Record<string, number>> = {}
  for (const p of personer) {
    resultat[p] = await somInnlogget(tx, galleri.id[p], async () => {
      const antall: Record<string, number> = {}
      for (const t of lesbare) {
        antall[t] = (await tx.query<{ n: number }>(`select count(*)::int as n from ${t}`)).rows[0]!.n
      }
      return antall
    })
  }
  return resultat
}

describe('prototypen av P2.0 (rulles tilbake)', () => {
  const AKTIVE: readonly Person[] = ['systemarkitekt', 'vanligA', 'vanligB', 'adminA', 'adminB', 'dobbeltAB', 'avsluttetA']
  const UTESTENGTE: readonly Person[] = ['utenMedlemskap', 'tidligereAdmin']
  const tabellerUtenVisninger = () => tabeller.filter((t) => !t.visning).map((t) => t.navn)

  it('dekker alle tabellene med én begrensende regel hver', async () => {
    const udekket = await iTilbakerulling(async (tx) => {
      await innforPrototype(tx, tabellerUtenVisninger())
      return medlemskapsdekning(tx, KONTROLL)
    })
    expect(udekket.tabeller).toEqual([])
  })

  it('stenger en bruker uten aktivt medlemskap ute fra alle tabeller, og endrer ingenting for de aktive', async () => {
    const for_ = await iTilbakerulling((tx) => synligeRader(tx, [...AKTIVE, ...UTESTENGTE]))
    const etter = await iTilbakerulling(async (tx) => {
      await innforPrototype(tx, tabellerUtenVisninger())
      return synligeRader(tx, [...AKTIVE, ...UTESTENGTE])
    })
    for (const p of AKTIVE) expect(etter[p], p).toEqual(for_[p])
    for (const p of UTESTENGTE) {
      // Før prototypen ser de det samme som en vanlig bruker i A.
      expect(Object.values(for_[p]!).some((n) => n > 0), p).toBe(true)
      expect(Object.entries(etter[p]!).filter(([, n]) => n > 0), p).toEqual([])
    }
  })

  it('stopper skriving og adminrettigheter for en bruker uten aktivt medlemskap gjennom portfunksjonene', async () => {
    const { utenMedlemskap, tidligereAdmin, vanligA } = galleri.id
    const prov = (bruker: string, sql: string, parametre: unknown[] = []) =>
      iTilbakerulling(async (tx) => {
        await innforPrototype(tx, tabellerUtenVisninger())
        return feilFra(() => somInnlogget(tx, bruker, () => tx.query(sql, parametre)))
      })
    const nyKategori = `select public.opprett_stoffkategori('Prøve', null)`
    const nyTraad = `select public.opprett_diskusjonskategori('stoff:proeve', 'Prøve', '🧪')`
    const nyttUtkast = `select public.opprett_utkast('kommentar', '{"navn": "Prøve", "tekst": "Prøve.", "plassholdere": []}')`
    expect((await prov(utenMedlemskap, nyKategori))?.code).toBe('42501')
    expect((await prov(utenMedlemskap, nyTraad))?.code).toBe('42501')
    expect((await prov(tidligereAdmin, nyttUtkast))?.code).toBe('42501')
    expect(await prov(vanligA, nyKategori)).toBeNull()
    expect(await prov(vanligA, nyTraad)).toBeNull()
    const erAdmin = await iTilbakerulling(async (tx) => {
      await innforPrototype(tx, tabellerUtenVisninger())
      return somInnlogget(tx, tidligereAdmin, async () =>
        (await tx.query<{ a: boolean }>('select public.er_admin() as a')).rows[0]!.a,
      )
    })
    expect(erAdmin).toBe(false)
  })

  it('stopper lesing og skriving av profilbilder for en bruker uten aktivt medlemskap, og lar de aktive beholde sine', async () => {
    const eget = (id: string) => `${id}/avatar.webp`
    const lastOpp = `insert into storage.objects (bucket_id, name) values ('avatarer', $1)`
    const prov = (bruker: string, sql: string, parametre: unknown[], medPrototype: boolean) =>
      iTilbakerulling(async (tx) => {
        if (medPrototype) await innforPrototype(tx, tabellerUtenVisninger())
        return feilFra(() => somInnlogget(tx, bruker, () => tx.query(sql, parametre)))
      })
    const lese = (bruker: string, medPrototype: boolean) =>
      iTilbakerulling(async (tx) => {
        if (medPrototype) await innforPrototype(tx, tabellerUtenVisninger())
        return somInnlogget(tx, bruker, async () =>
          (await tx.query('select id from storage.objects where id = $1', [data.profilbilde])).rows.length,
        )
      })
    const endreEget = `update storage.objects set name = name where id = $1 and name = $2`

    for (const p of UTESTENGTE) {
      const id = galleri.id[p]
      // I dag: leser andres bilde og laster opp sitt eget, som en vanlig innlogget.
      expect(await lese(id, false), p).toBe(1)
      expect(await prov(id, lastOpp, [eget(id)], false), p).toBeNull()
      // Med P2.0: ingenting.
      expect(await lese(id, true), p).toBe(0)
      expect((await prov(id, lastOpp, [eget(id)], true))?.code, p).toBe('42501')
    }
    for (const p of ['vanligA', 'vanligB', 'adminB'] as const) {
      expect(await lese(galleri.id[p], true), p).toBe(1)
    }
    const { vanligA, adminB } = galleri.id
    expect(await prov(vanligA, endreEget, [data.profilbilde, eget(vanligA)], true)).toBeNull()
    expect(await prov(adminB, lastOpp, [eget(adminB)], true)).toBeNull()
    // Radsikkerheten fra før står: ingen laster opp i en annens navn.
    expect((await prov(adminB, lastOpp, [eget(vanligA)], true))?.code).toBe('42501')
  })

  it('gir restlisten av security definer-funksjoner som må få kontrollen én for én', async () => {
    const udekket = await iTilbakerulling(async (tx) => {
      await innforPrototype(tx, tabellerUtenVisninger())
      return medlemskapsdekning(tx, KONTROLL)
    })
    const alle = (await funksjonsinnganger(db)).filter((f) => f.definer && f.kontroll !== 'offentlig' && f.kontroll !== 'utloser')
    // Portene dekker en god del; resten leser forbi radsikkerheten uten port.
    expect(udekket.funksjoner.length).toBeLessThan(alle.length)
    for (const dekket of ['opprett_diskusjon(', 'opprett_stoffkategori(', 'lagre_utkast(', 'publiser_utkast(']) {
      expect(udekket.funksjoner.filter((f) => f.startsWith(dekket)), dekket).toEqual([])
    }
    for (const igjen of ['direktelenke(', 'mine_varsler(', 'ideoversikt(', 'les_kjemi(']) {
      expect(udekket.funksjoner.some((f) => f.startsWith(igjen)), igjen).toBe(true)
    }
    // Restlisten står i dokumentet, slik at P2.0 kan planlegges ut fra den.
    expect(udekket.funksjoner.filter((f) => !DOKUMENT.includes(`\`${f.slice(0, f.indexOf('('))}\``))).toEqual([])
  })
})
