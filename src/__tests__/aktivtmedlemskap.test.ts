/**
 * P2.0: en innlogget med fortsatt gyldig token, men uten et aktivt medlemskap
 * i et aktivt fagmiljø, får verken lest eller skrevet noe
 * (docs/fagmiljoer.md, «Aktivt medlemskap»; P0 §6.4).
 *
 * Testene prøver hver inngang nettleseren når, lest ut av katalogen, slik at
 * en ny tabell eller funksjon kommer med av seg selv:
 *
 * - hver `security definer`-funksjon stopper med 42501, uansett argumenter,
 *   fordi kontrollen står først;
 * - hver funksjon som kjøres som den innloggede, gir ingenting;
 * - hver tabell og visning gir null rader, og ingen tabell kan skrives til.
 *
 * I tillegg: at systemarkitekten har tilgangen uten medlemskap, at et arkivert
 * fagmiljø ikke gir tilgang, at serverprosessene slipper gjennom som før, og
 * at Edge-funksjonene får det samme svaret som radsikkerheten.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { AVSLUTTET_MEDLEMSKAP } from '@delt/profil'
import { byggPersongalleri, leggInnTestdata, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'
import { funksjonsinnganger, tabellinnganger, type Funksjonsinngang } from './hjelp/tilgangsinnganger'

/** Personene med gyldig token, men uten aktive medlemskap. */
const UTESTENGTE = ['utenMedlemskap', 'tidligereAdmin'] as const satisfies readonly Person[]

/** Funksjonene som bare svarer om den innloggede selv, og derfor ikke stopper; med svaret til en utestengt. */
/** `null`: ingen rader. */
const SVARER_OM_SEG_SELV: Readonly<Record<string, boolean | string | readonly string[] | null>> = {
  'er_admin()': false,
  'er_systemarkitekt()': false,
  'har_aktivt_medlemskap()': false,
  'min_medlemskapsstatus()': 'avsluttet',
  'min_profil()': null,
  'mine_administrerte_fagmiljoer()': [],
  'mine_lesbare_fagmiljoer()': [],
  'mine_synlige_profiler()': [],
}

let db: PGlite
let galleri: Persongalleri
let funksjoner: Funksjonsinngang[]
let argumenter: Map<string, string[]>

beforeAll(async () => {
  db = await nyDatabase()
  galleri = await byggPersongalleri(db)
  await leggInnTestdata(db, galleri)
  funksjoner = (await funksjonsinnganger(db)).filter((f) => f.kontroll !== 'offentlig' && f.kontroll !== 'utloser')
  argumenter = await provargumenter(db)
}, 120_000)

afterAll(async () => {
  await db.close()
})

/**
 * Et gyldig argument av riktig type for hver parameter i hver funksjon i
 * `public`, som SQL. Verdiene er bevisst uten mening: kontrollen skal stoppe
 * før argumentene brukes. Oppregningstyper får `publisert` når den finnes,
 * ellers den første verdien; sammensatte typer får `null`.
 */
async function provargumenter(d: PGlite): Promise<Map<string, string[]>> {
  const { rows } = await d.query<{ signatur: string; verdier: string[] }>(`
    select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signatur,
      array(
        select case
          when t.typtype = 'e' then quote_literal(coalesce(
            (select e.enumlabel from pg_enum e where e.enumtypid = t.oid and e.enumlabel = 'publisert'),
            (select e.enumlabel from pg_enum e where e.enumtypid = t.oid order by e.enumsortorder limit 1)
          )) || '::' || format_type(t.oid, null)
          when t.typtype = 'c' then 'null::' || format_type(t.oid, null)
          when t.typcategory = 'A' then '''{}''::' || format_type(t.oid, null)
          else case format_type(t.oid, null)
            when 'uuid' then '''00000000-0000-4000-8000-000000000000''::uuid'
            when 'text' then '''x''::text'
            when 'integer' then '1'
            when 'bigint' then '1::bigint'
            when 'boolean' then 'false'
            when 'jsonb' then '''{}''::jsonb'
            when 'timestamp with time zone' then 'now()'
          end
        end
        from unnest(p.proargtypes::oid[]) with ordinality a(typ, nr)
        join pg_type t on t.oid = a.typ
        order by a.nr
      ) as verdier
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace`)
  return new Map(rows.map((r) => [r.signatur, r.verdier]))
}

/** Kaller funksjonen som personen, i en transaksjon som rulles tilbake. */
async function kall(person: Person, f: Funksjonsinngang) {
  const verdier = argumenter.get(f.signatur)!
  expect(verdier.every((v) => v !== null), `${f.signatur}: mangler prøveverdi for en argumenttype`).toBe(true)
  const sql = `select * from public.${f.navn}(${verdier.join(', ')})`
  return feilFraEllerSvar(() =>
    som(db, galleri.id[person], async (tx) => {
      const { rows } = await tx.query<Record<string, unknown>>(sql)
      await tx.rollback()
      return rows
    }),
  )
}

async function feilFraEllerSvar<T>(arbeid: () => Promise<T>): Promise<{ feil: string | null; svar?: T }> {
  try {
    return { feil: null, svar: await arbeid() }
  } catch (feil) {
    return { feil: (feil as { code?: string }).code ?? String(feil) }
  }
}

/** Sant når svaret ikke inneholder noe: ingen rader, eller bare tomme verdier. */
function erTomt(verdi: unknown): boolean {
  if (verdi === null || verdi === undefined || verdi === false || verdi === 0 || verdi === '') return true
  if (Array.isArray(verdi)) return verdi.every(erTomt)
  if (typeof verdi === 'object') return Object.values(verdi as object).every(erTomt)
  return false
}

describe('en bruker uten aktivt medlemskap', () => {
  it('stoppes med 42501 i hver security definer-funksjon nettleseren kan kalle', async () => {
    const definer = funksjoner.filter((f) => f.definer && !(f.signatur in SVARER_OM_SEG_SELV))
    expect(definer.length).toBeGreaterThan(90)
    for (const person of UTESTENGTE) {
      const slapp = []
      for (const f of definer) {
        const { feil } = await kall(person, f)
        if (feil !== '42501') slapp.push(`${f.signatur}: ${feil ?? 'svarte'}`)
      }
      expect(slapp, person).toEqual([])
    }
  })

  it('får bare nei eller «avsluttet» fra funksjonene som svarer om den innloggede selv', async () => {
    for (const person of UTESTENGTE) {
      for (const [signatur, ventet] of Object.entries(SVARER_OM_SEG_SELV)) {
        const f = funksjoner.find((x) => x.signatur === signatur)!
        const { feil, svar } = await kall(person, f)
        expect(feil, signatur).toBeNull()
        if (ventet === null) expect(svar, `${person}: ${signatur}`).toEqual([])
        else expect(Object.values(svar![0]!)[0], `${person}: ${signatur}`).toEqual(ventet)
      }
    }
  })

  it('får ingenting fra funksjonene som kjøres som den innloggede', async () => {
    const invoker = funksjoner.filter((f) => !f.definer)
    expect(invoker.length).toBeGreaterThan(20)
    for (const person of UTESTENGTE) {
      const ga = []
      for (const f of invoker) {
        const { feil, svar } = await kall(person, f)
        if (feil === null ? !erTomt(svar) : feil !== '42501') ga.push(`${f.signatur}: ${feil ?? JSON.stringify(svar).slice(0, 120)}`)
      }
      expect(ga, person).toEqual([])
    }
  })

  it('ser null rader i hver tabell og visning, og kan ikke skrive til noen tabell', async () => {
    const innganger = await tabellinnganger(db)
    const lesbare = innganger.filter((t) => t.rettigheter.includes('authenticated:SELECT'))
    expect(lesbare.length).toBeGreaterThan(60)
    for (const person of UTESTENGTE) {
      const synlige = []
      const skrevet = []
      for (const t of lesbare) {
        const { svar } = await feilFraEllerSvar(() =>
          som(db, galleri.id[person], async (tx) => (await tx.query<{ n: number }>(`select count(*)::int as n from ${t.navn}`)).rows[0]!.n),
        )
        if (svar !== 0) synlige.push(`${t.navn}: ${svar}`)
      }
      for (const t of innganger.filter((x) => !x.visning)) {
        for (const [rettighet, sql] of [
          ['INSERT', `insert into ${t.navn} default values`],
          ['UPDATE', `update ${t.navn} set ${await forsteKolonne(t.navn)} = ${await forsteKolonne(t.navn)}`],
          ['DELETE', `delete from ${t.navn}`],
        ] as const) {
          if (!t.rettigheter.includes(`authenticated:${rettighet}`)) continue
          const { feil, svar } = await feilFraEllerSvar(() =>
            som(db, galleri.id[person], async (tx) => {
              const resultat = await tx.query(sql)
              await tx.rollback()
              return resultat.affectedRows ?? 0
            }),
          )
          // Avvist (42501), eller ingen rader berørt fordi ingen er synlige.
          if (!(feil === '42501' || (feil === null && svar === 0))) skrevet.push(`${rettighet} ${t.navn}: ${feil ?? svar}`)
        }
      }
      expect(synlige, person).toEqual([])
      expect(skrevet, person).toEqual([])
    }
  })

  it('får beskjeden appen viser, også fra databasen', async () => {
    const f = funksjoner.find((x) => x.navn === 'ideoversikt')!
    const melding = await som(db, galleri.id.utenMedlemskap, (tx) => tx.query('select public.ideoversikt()')).then(
      () => null,
      (e: Error) => e.message,
    )
    expect(f).toBeDefined()
    expect(melding).toBe(AVSLUTTET_MEDLEMSKAP)
  })
})

/** Den første kolonnen i tabellen, for en oppdatering som ikke endrer noe. */
async function forsteKolonne(tabell: string): Promise<string> {
  const { rows } = await db.query<{ navn: string }>(
    `select quote_ident(attname) as navn from pg_attribute where attrelid = $1::regclass and attnum > 0 and not attisdropped order by attnum limit 1`,
    [tabell],
  )
  return rows[0]!.navn
}

/** Gjør `arbeid` i en transaksjon med invariantene slått av, og ruller den tilbake. */
async function utenInvarianter<T>(arbeid: (tx: Transaction) => Promise<T>): Promise<T> {
  let resultat: T | undefined
  await db.transaction(async (tx) => {
    await tx.exec('set local session_replication_role = replica')
    resultat = await arbeid(tx)
    await tx.rollback()
  })
  return resultat as T
}

/** Kjører `sql` som brukeren inne i en åpen transaksjon, og går tilbake til eieren etterpå. */
async function somIGjeldende<T>(tx: Transaction, bruker: string, sql: string): Promise<T[]> {
  await tx.query(`select set_config('role', 'authenticated', true)`)
  await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: bruker, role: 'authenticated' })])
  try {
    return (await tx.query<T>(sql)).rows
  } finally {
    await tx.exec('reset role')
    await tx.query(`select set_config('request.jwt.claims', '', true)`)
  }
}

/**
 * Sikkerhetsport S3 (P0 §6.3): én og samme innlogging før og etter at
 * medlemskapet avsluttes. Tokenet gjelder fortsatt (de samme kravene i
 * JWT-en), men etter avslutningen skal både tabellene, søket, diskusjonene,
 * skrivingen og Edge-svaret stenge, uten at noe annet endres.
 */
describe('S3: samme gyldige innlogging før og etter avsluttet medlemskap', () => {
  /** Kjører `sql` som brukeren innenfor et lagringspunkt, så en feil ikke avbryter transaksjonen. */
  async function proev(tx: Transaction, bruker: string, sql: string) {
    await tx.exec('savepoint s3')
    await tx.query(`select set_config('role', 'authenticated', true)`)
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: bruker, role: 'authenticated' })])
    let resultat: { feil: string | null; rader: Record<string, unknown>[] }
    try {
      resultat = { feil: null, rader: (await tx.query<Record<string, unknown>>(sql)).rows }
    } catch (feil) {
      resultat = { feil: (feil as { code?: string }).code ?? 'ukjent', rader: [] }
    }
    // Tilbake til lagringspunktet uansett: også rollen og kravene går tilbake.
    await tx.exec('rollback to savepoint s3')
    return resultat
  }

  it('stenger tabeller, søk, diskusjoner, skriving og Edge-svaret når medlemskapet avsluttes', async () => {
    const bruker = galleri.id.vanligA
    const svar = await utenInvarianter(async (tx) => {
      const side = (await tx.query<{ side: string }>('select side from public.diskusjoner limit 1')).rows[0]!.side
      const kall = {
        diskusjoner: 'select count(*)::int as n from public.diskusjoner',
        egenProfil: `select count(*)::int as n from public.profiles where id = '${bruker}'`,
        egneMedlemskap: `select count(*)::int as n from public.medlemskap where bruker_id = '${bruker}'`,
        sokedata: 'select count(*)::int as n from public.sokedata_versjoner()',
        virkestoffsok: `select count(*)::int as n from public.sok_virkestoff('a', 5)`,
        // Ett jsonb-svar: tellingen er trådene i det.
        diskusjonsoversikt: `select jsonb_array_length(public.diskusjonsoversikt('${side}') -> 'diskusjoner') as n`,
        varsler: 'select count(*)::int as n from public.mine_varsler()',
        skrivProfil: `update public.profiles set first_name = first_name where id = '${bruker}' returning id`,
        skrivVarsler: 'select count(*)::int as n from public.merk_varsler_lest(array[]::uuid[], now())',
        status: 'select public.min_medlemskapsstatus() as s',
      }
      const kjor = async () => {
        const ut: Record<string, Awaited<ReturnType<typeof proev>>> = {}
        for (const [k, sql] of Object.entries(kall)) ut[k] = await proev(tx, bruker, sql)
        return ut as Record<keyof typeof kall, Awaited<ReturnType<typeof proev>>>
      }
      const edge = async () =>
        (await tx.query<{ a: boolean }>('select public.kontooperasjon_aktivt_medlemskap($1) as a', [bruker])).rows[0]!.a

      const foer = { ...(await kjor()), edge: await edge() }
      await tx.query(`update public.medlemskap set status = 'deaktivert', til = now() where bruker_id = $1 and status = 'aktiv'`, [bruker])
      const etter = { ...(await kjor()), edge: await edge() }
      return { foer, etter }
    })

    const { foer, etter } = svar
    // Før: alt virker som for enhver aktiv bruker.
    for (const k of ['diskusjoner', 'egenProfil', 'egneMedlemskap', 'sokedata', 'virkestoffsok', 'diskusjonsoversikt', 'varsler', 'skrivVarsler'] as const)
      expect(foer[k].feil, `før: ${k}`).toBeNull()
    expect(foer.diskusjoner.rader[0]!.n, 'før: diskusjoner').toBeGreaterThan(0)
    expect(foer.diskusjonsoversikt.rader[0]!.n, 'før: diskusjonsoversikt').toBeGreaterThan(0)
    expect(foer.egenProfil.rader[0]!.n).toBe(1)
    expect(foer.skrivProfil.rader).toHaveLength(1)
    expect(foer.status.rader[0]!.s).toBe('aktiv')
    expect(foer.edge).toBe(true)

    // Etter: med de samme kravene gir tabellene ingenting, og funksjonene stopper.
    // `diskusjonsoversikt` kjøres som den innloggede, så radsikkerheten tømmer den.
    for (const k of ['diskusjoner', 'egenProfil', 'egneMedlemskap', 'diskusjonsoversikt'] as const) {
      expect(etter[k].feil, `etter: ${k}`).toBeNull()
      expect(etter[k].rader[0]!.n, `etter: ${k}`).toBe(0)
    }
    for (const k of ['sokedata', 'virkestoffsok', 'varsler', 'skrivVarsler'] as const)
      expect(etter[k].feil, `etter: ${k}`).toBe('42501')
    expect(etter.skrivProfil.feil).toBeNull()
    expect(etter.skrivProfil.rader).toHaveLength(0)
    expect(etter.status.rader[0]!.s).toBe('avsluttet')
    expect(etter.edge).toBe(false)
  })
})

describe('hva som gir aktivt medlemskap', () => {
  it('gir systemarkitekten tilgangen også uten medlemskap', async () => {
    const svar = await utenInvarianter(async (tx) => {
      await tx.query(`update public.medlemskap set status = 'deaktivert', til = now() where bruker_id = $1`, [galleri.id.systemarkitekt])
      return somIGjeldende<{ aktiv: boolean; n: number; admin: boolean }>(
        tx,
        galleri.id.systemarkitekt,
        'select public.har_aktivt_medlemskap() as aktiv, (select count(*)::int from public.diskusjoner) as n, public.er_admin() as admin',
      )
    })
    expect(svar[0]).toEqual({ aktiv: true, n: 2, admin: true })
  })

  it('gir ikke tilgang gjennom et medlemskap i et arkivert fagmiljø', async () => {
    const svar = await utenInvarianter(async (tx) => {
      await tx.query(`update public.fagmiljoer set status = 'arkivert', standard = false where id = $1`, [galleri.fagmiljo.B])
      return somIGjeldende<{ person: string; aktiv: boolean }>(tx, galleri.id.vanligB, 'select public.har_aktivt_medlemskap() as aktiv')
    })
    expect(svar[0]!.aktiv).toBe(false)
  })

  it('regner ikke et invitert medlemskap som aktivt', async () => {
    const svar = await utenInvarianter(async (tx) => {
      await tx.query(`update public.medlemskap set status = 'invitert', primaer = false where bruker_id = $1`, [galleri.id.vanligA])
      return somIGjeldende<{ aktiv: boolean }>(tx, galleri.id.vanligA, 'select public.har_aktivt_medlemskap() as aktiv')
    })
    expect(svar[0]!.aktiv).toBe(false)
  })

  it('svarer ja for alle aktive i galleriet, også den med medlemskap i både A og B og den som bare er aktiv i B', async () => {
    for (const person of ['systemarkitekt', 'vanligA', 'vanligB', 'adminA', 'adminB', 'dobbeltAB', 'avsluttetA'] as const) {
      const aktiv = await som(db, galleri.id[person], async (tx) =>
        (await tx.query<{ a: boolean }>('select public.har_aktivt_medlemskap() as a')).rows[0]!.a,
      )
      expect(aktiv, person).toBe(true)
    }
  })

  it('skiller en konto uten aktivt medlemskap fra en slettet konto i statusen appen spør om', async () => {
    const status = (bruker: string) =>
      som(db, bruker, async (tx) => (await tx.query<{ s: string }>('select public.min_medlemskapsstatus() as s')).rows[0]!.s)
    expect(await status(galleri.id.vanligA)).toBe('aktiv')
    expect(await status(galleri.id.systemarkitekt)).toBe('aktiv')
    for (const person of UTESTENGTE) expect(await status(galleri.id[person]), person).toBe('avsluttet')
    // Et fortsatt gyldig token for en konto som er slettet: ingen profil.
    expect(await status('00000000-0000-4000-8000-0000000000ff')).toBe('ingen_konto')
  })

  it('lar ikke den gamle adminrollen alene gi adminrettigheter', async () => {
    const svar = (person: Person) =>
      som(db, galleri.id[person], async (tx) => (await tx.query<{ a: boolean }>('select public.er_admin() as a')).rows[0]!.a)
    expect(await svar('tidligereAdmin')).toBe(false)
    expect(await svar('adminA')).toBe(true)
  })
})

describe('serverprosessene', () => {
  /** Kontrollen med kravene en forespørsel ville hatt, eller uten forespørsel (`null`). */
  const kontroll = (krav: Record<string, string> | null) =>
    feilFra(() =>
      db.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [krav ? JSON.stringify(krav) : ''])
        await tx.query('select intern.krev_aktivt_medlemskap()')
        // En funksjon med kontrollen først, slik en jobb i databasen kaller den.
        await tx.query('select public.les_kurateringer()')
      }),
    )

  it('slipper gjennom med den hemmelige nøkkelen og uten forespørsel, som før', async () => {
    expect(await kontroll({ role: 'service_role' })).toBeNull()
    expect(await kontroll(null)).toBeNull()
  })

  it('stopper en sluttbruker, også uten bruker-ID, og også om rollen i kravene er en annen', async () => {
    // En bruker-ID i JWT-en gjør kallet til en sluttbrukers, uansett rolle.
    expect((await kontroll({ sub: galleri.id.utenMedlemskap, role: 'service_role' }))?.code).toBe('42501')
    expect((await kontroll({ sub: galleri.id.utenMedlemskap, role: 'authenticated' }))?.code).toBe('42501')
    expect((await kontroll({ role: 'anon' }))?.code).toBe('42501')
    expect((await kontroll({ role: 'authenticated' }))?.code).toBe('42501')
    expect(await kontroll({ sub: galleri.id.vanligA, role: 'authenticated' })).toBeNull()
  })

  it('gir Edge-funksjonene det samme svaret som radsikkerheten, bare med den hemmelige nøkkelen', async () => {
    const svar = async (person: Person) =>
      (
        await db.query<{ a: boolean }>('select public.kontooperasjon_aktivt_medlemskap($1) as a', [galleri.id[person]])
      ).rows[0]!.a
    expect(await svar('utenMedlemskap')).toBe(false)
    expect(await svar('tidligereAdmin')).toBe(false)
    expect(await svar('avsluttetA')).toBe(true)
    expect(await svar('systemarkitekt')).toBe(true)
    const rett = await db.query<{ anon: boolean; innlogget: boolean; tjeneste: boolean }>(
      `select has_function_privilege('anon', 'public.kontooperasjon_aktivt_medlemskap(uuid)', 'execute') as anon,
              has_function_privilege('authenticated', 'public.kontooperasjon_aktivt_medlemskap(uuid)', 'execute') as innlogget,
              has_function_privilege('service_role', 'public.kontooperasjon_aktivt_medlemskap(uuid)', 'execute') as tjeneste`,
    )
    expect(rett.rows[0]).toEqual({ anon: false, innlogget: false, tjeneste: true })
  })
})

describe('Edge-funksjonene', () => {
  const kontekst = readFileSync(resolve(__dirname, '../../supabase/functions/_edge/kontekst.ts'), 'utf8')
  const migrasjon = readFileSync(resolve(__dirname, '../../supabase/migrations/20261114103000_aktivt_medlemskap.sql'), 'utf8')

  it('krever aktivt medlemskap i den felles innloggingskontrollen alle fire bygger på', () => {
    const innlogget = kontekst.slice(kontekst.indexOf('async function hentInnlogget'))
    expect(innlogget).toContain(`rpc('kontooperasjon_aktivt_medlemskap'`)
    expect(innlogget).toContain('throw new Avvist(AVSLUTTET_MEDLEMSKAP, 403)')
    // Kontrollen kommer før funksjonen får gjøre noe: `hentInnlogget` kalles før `handling`.
    expect(kontekst.indexOf('await hentInnlogget(ctx)')).toBeLessThan(kontekst.indexOf('await handling('))
  })

  it('bruker den samme beskjeden som databasen', () => {
    expect(migrasjon).toContain(`'${AVSLUTTET_MEDLEMSKAP}'`)
  })
})

describe('Vercel-endepunktene', () => {
  it('slipper inn en innlogget bare gjennom er_admin(), som krever aktivt medlemskap', () => {
    const tilgang = readFileSync(resolve(__dirname, '../server/tilgang.ts'), 'utf8')
    // Den eneste brukerkontrollen: tokenet prøves mot databasen som den innloggede.
    expect(tilgang.match(/\.rpc\('(\w+)'/g)).toEqual([`.rpc('er_admin'`])
  })
})
