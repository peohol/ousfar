/**
 * P2d: rettighetene i stoffregisteret, administrasjonen og datakildene
 * (docs/fagmiljoer.md, «Systemrettigheter»; P0 §5.2 og beslutningen D3).
 *
 * - Den gamle adminrollen gir ingenting i dette området: ingen funksjon eller
 *   regel i det bruker `er_admin()`, `krev_admin()` eller `profiles.role`.
 * - Hver funksjon som krever systemarkitekt eller rett til å endre
 *   stoffregisteret, lest ut av katalogen, stopper vanlige brukere, lokale
 *   administratorer og den gamle adminrollen med 42501, og slipper
 *   systemarkitektene gjennom, også uten den gamle rollen (som maxhag).
 * - `mine_rettigheter()` svarer for hver person det funksjonene gjør.
 * - Bare en systemarkitekt, eller en lokal administrator i fagmiljøet nye
 *   kontoer blir medlemmer av, kan opprette brukere.
 * - Serverprosessene (synkene, kurateringsagentene) går ikke gjennom
 *   kontrollene og berøres ikke.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { omradeFor } from './data/tilgangsomrader'
import { byggPersongalleri, leggInnTestdata, type Person, type Persongalleri } from './hjelp/persongalleri'
import { provargumenter } from './hjelp/provargumenter'
import { feilFra, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'
import { funksjonsinnganger, tabellinnganger, type Funksjonsinngang } from './hjelp/tilgangsinnganger'

/** Personene som ikke skal ha noen systemrettigheter, med og uten den gamle adminrollen. */
const UTEN_RETTIGHETER = ['vanligA', 'vanligB', 'adminA', 'adminB', 'dobbeltAB', 'avsluttetA'] as const satisfies readonly Person[]
/** Systemarkitektene, med og uten den gamle adminrollen. */
const ARKITEKTER = ['systemarkitekt', 'arkitektB'] as const satisfies readonly Person[]

/** Den gamle adminrollen i området. `er_admin()` selv er overgangen P2a og P2b bytter ut. */
const GAMMEL_ADMINKONTROLL = /\b(er_admin|krev_admin|krev_idevalg_admin)\s*\(|\brole\s*=\s*'admin'/

let db: PGlite
let galleri: Persongalleri
let funksjoner: Funksjonsinngang[]
let argumenter: Map<string, string[]>
/** En konto med den gamle adminrollen og aktivt medlemskap, men uten lokalt adminskap eller systemrolle. */
let bareRollen: string

beforeAll(async () => {
  db = await nyDatabase()
  galleri = await byggPersongalleri(db)
  await leggInnTestdata(db, galleri)
  bareRollen = await opprettBruker(db, { brukernavn: 'bare.rollen', fornavn: 'Bare', etternavn: 'Rollen', rolle: 'admin' })
  funksjoner = await funksjonsinnganger(db)
  argumenter = await provargumenter(db)
}, 120_000)

afterAll(async () => {
  await db.close()
})

const hvem = (person: Person | 'bareRollen') => (person === 'bareRollen' ? bareRollen : galleri.id[person])

/** Kaller funksjonen med prøveargumentene som personen, i en transaksjon som rulles tilbake. Gir feilkoden, eller `null`. */
async function kall(person: Person | 'bareRollen', f: Funksjonsinngang): Promise<string | null> {
  const sql = `select * from public.${f.navn}(${argumenter.get(f.signatur)!.join(', ')})`
  const feil = await feilFra(() =>
    som(db, hvem(person), async (tx) => {
      await tx.query(sql)
      await tx.rollback()
    }),
  )
  return feil?.code ?? (feil ? String(feil) : null)
}

const avKontroll = (kontroll: string) => funksjoner.filter((f) => f.kontroll === kontroll)

describe('den gamle adminrollen i området', () => {
  it('brukes ikke av noen funksjon eller radsikkerhetsregel i stoffregisteret og administrasjonen', async () => {
    const funksjonene = funksjoner
      .filter((f) => omradeFor(f.signatur) === 'd' && f.navn !== 'er_admin')
      .filter((f) => GAMMEL_ADMINKONTROLL.test(f.kilde))
      .map((f) => f.signatur)
    expect(funksjonene).toEqual([])
    const reglene = (await tabellinnganger(db))
      .filter((t) => omradeFor(t.navn) === 'd')
      .flatMap((t) => t.regler.filter((r) => GAMMEL_ADMINKONTROLL.test(`${r.bruk ?? ''} ${r.sjekk ?? ''}`)).map((r) => `${t.navn}: ${r.navn}`))
    expect(reglene).toEqual([])
  })

  it('brukes heller ikke av kontrollene bak, som kurateringenes adminaktør og stoffregisterets port', async () => {
    const { rows } = await db.query<{ navn: string; kilde: string }>(
      `select n.nspname || '.' || p.proname as navn, p.prosrc as kilde
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where (n.nspname, p.proname) in (('kuratering', 'admin_aktor'), ('intern', 'krev_registerbruker'), ('intern', 'har_registerrett'),
                                        ('intern', 'krev_systemarkitekt'), ('intern', 'opprettelsesavslag'))`,
    )
    expect(rows).toHaveLength(5)
    for (const r of rows) expect(GAMMEL_ADMINKONTROLL.test(r.kilde), r.navn).toBe(false)
  })
})

describe('funksjonene som krever systemarkitekt', () => {
  it('finnes, og er alle i stoffregisteret og administrasjonen', () => {
    const navn = avKontroll('systemarkitekt').map((f) => f.navn)
    expect(navn.sort()).toEqual(
      [
        'beslutt_fagsak',
        'datakilder_status',
        'kuratering_admin',
        'les_fagsaker',
        'les_kildeovervaking',
        'opphev_verktoysperre',
        'sett_verktoysperre',
        'slett_stoff_for_godt',
        'tom_stoffpapirkurven',
        'verktoysperrehistorikk',
      ].sort(),
    )
    for (const f of avKontroll('systemarkitekt')) expect(omradeFor(f.signatur), f.signatur).toBe('d')
  })

  it('stopper vanlige brukere, lokale administratorer og den gamle adminrollen med 42501', async () => {
    const slapp: string[] = []
    for (const person of [...UTEN_RETTIGHETER, 'bareRollen'] as const) {
      for (const f of avKontroll('systemarkitekt')) {
        const feil = await kall(person, f)
        if (feil !== '42501') slapp.push(`${person}: ${f.signatur}: ${feil ?? 'svarte'}`)
      }
    }
    expect(slapp).toEqual([])
  })

  it('slipper systemarkitektene forbi kontrollen, også uten den gamle adminrollen', async () => {
    const stoppet: string[] = []
    for (const person of ARKITEKTER) {
      for (const f of avKontroll('systemarkitekt')) {
        // Prøveargumentene er uten mening, så funksjonen kan si nei til dem
        // etterpå; det som teller, er at den ikke sier nei til personen.
        if ((await kall(person, f)) === '42501') stoppet.push(`${person}: ${f.signatur}`)
      }
    }
    expect(stoppet).toEqual([])
  })
})

describe('funksjonene som endrer stoffregisteret', () => {
  it('er alle i stoffregisteret, og går gjennom porten', () => {
    const fns = avKontroll('stoffregister')
    expect(fns.map((f) => f.navn).sort()).toEqual(
      [
        'arkiver_stoff',
        'arkiver_stoffkategori',
        'endre_stoffkategori',
        'flytt_stoffkategori',
        'gjenopprett_stoff',
        'opprett_stoffkategori',
        'plasser_stoff',
        'rydd_stoffpapirkurven',
        'slett_stoff',
        'slett_stoffkategori',
      ].sort(),
    )
    for (const f of fns) expect(f.kilde, f.signatur).toMatch(/\bintern\.krev_registerbruker\(\)/)
  })

  it('stopper alle uten rett til å endre registeret med 42501, også den gamle adminrollen', async () => {
    const slapp: string[] = []
    for (const person of [...UTEN_RETTIGHETER, 'bareRollen'] as const) {
      for (const f of avKontroll('stoffregister')) {
        const feil = await kall(person, f)
        if (feil !== '42501') slapp.push(`${person}: ${f.signatur}: ${feil ?? 'svarte'}`)
      }
    }
    expect(slapp).toEqual([])
  })

  it('slipper systemarkitektene forbi kontrollen', async () => {
    const stoppet: string[] = []
    for (const person of ARKITEKTER) {
      for (const f of avKontroll('stoffregister')) if ((await kall(person, f)) === '42501') stoppet.push(`${person}: ${f.signatur}`)
    }
    expect(stoppet).toEqual([])
  })

  it('lar alle aktive medlemmer lese registeret, men bare systemarkitektene se utkastene', async () => {
    const lesSider = (person: Person) =>
      som(db, galleri.id[person], async (tx) => {
        const { rows } = await tx.query<{ d: { sider: { slug: string }[] } }>(`select public.les_stoffregister('utkast') as d`)
        return rows[0]!.d.sider.length
      })
    const publisert = await som(db, galleri.id.vanligA, async (tx) => {
      const { rows } = await tx.query<{ d: { sider: unknown[] } }>(`select public.les_stoffregister('publisert') as d`)
      return rows[0]!.d.sider.length
    })
    // Ber de andre om utkastet, får de det publiserte.
    for (const person of UTEN_RETTIGHETER) expect(await lesSider(person), person).toBe(publisert)
  })
})

describe('mine_rettigheter()', () => {
  const rettigheter = (person: Person | 'bareRollen') =>
    som(db, hvem(person), async (tx) => {
      const { rows } = await tx.query<{ r: Record<string, unknown> }>('select public.mine_rettigheter() as r')
      return rows[0]!.r
    })

  it('svarer for hver person det funksjonene gjør', async () => {
    const A = { id: galleri.fagmiljo.A, nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi' }
    const B = { id: galleri.fagmiljo.B, nokkel: 'ous-rettstoksikologi', navn: 'OUS Rettstoksikologi' }
    const ingen = { systemarkitekt: false, administrerer: [], stoffregister: false, opprett_bruker: false }
    // En systemarkitekt administrerer alle fagmiljøene (`public.mine_administrerte_fagmiljoer`).
    const alle = (await db.query<{ id: string; nokkel: string; navn: string }>('select id, nokkel, navn from public.fagmiljoer order by navn')).rows
    const arkitekt = { systemarkitekt: true, administrerer: alle, stoffregister: true, opprett_bruker: true }
    expect(alle).toEqual(expect.arrayContaining([A, B]))
    expect(await rettigheter('systemarkitekt')).toEqual(arkitekt)
    expect(await rettigheter('arkitektB')).toEqual(arkitekt)
    // Nye kontoer blir medlemmer av A (standarden), så bare den lokale administratoren der kan opprette dem.
    expect(await rettigheter('adminA')).toEqual({ ...ingen, administrerer: [A], opprett_bruker: true })
    expect(await rettigheter('adminB')).toEqual({ ...ingen, administrerer: [B] })
    for (const person of ['vanligA', 'vanligB', 'dobbeltAB', 'avsluttetA', 'bareRollen'] as const) {
      expect(await rettigheter(person), person).toEqual(ingen)
    }
  })

  it('stopper en bruker uten aktivt medlemskap, og kan ikke kalles uten innlogging', async () => {
    for (const person of ['utenMedlemskap', 'tidligereAdmin'] as const) {
      expect((await feilFra(() => rettigheter(person)))?.code, person).toBe('42501')
    }
    expect((await feilFra(() => som(db, null, (tx) => tx.query('select public.mine_rettigheter()'))))?.code).toBe('42501')
  })

  it('svarer på er_systemarkitekt() bare om den innloggede selv', async () => {
    const er = (person: Person | 'bareRollen') =>
      som(db, hvem(person), async (tx) => (await tx.query<{ a: boolean }>('select public.er_systemarkitekt() as a')).rows[0]!.a)
    for (const person of ARKITEKTER) expect(await er(person), person).toBe(true)
    for (const person of [...UTEN_RETTIGHETER, 'bareRollen', 'utenMedlemskap', 'tidligereAdmin'] as const) {
      expect(await er(person), person).toBe(false)
    }
  })
})

describe('opprettelse av brukere', () => {
  /** Klarerer et brukernavn slik Edge-funksjonen `opprett-bruker` gjør det: med den hemmelige nøkkelen og den innloggedes ID. */
  const klarer = (aktor: string, brukernavn: string) =>
    db.transaction(async (tx) => {
      await tx.exec(`set local role service_role`)
      await tx.query(`select set_config('request.jwt.claims', '{"role": "service_role"}', true)`)
      await tx.exec('savepoint klarering')
      const feil = await feilFra(() => tx.query('select public.kontooperasjon_klarer_konto($1, $2)', [aktor, brukernavn]))
      if (feil) await tx.exec('rollback to savepoint klarering')
      const { rows } = await tx.query<{ n: number }>('select count(*)::int as n from public.kontoreservasjoner where username = $1', [brukernavn])
      await tx.rollback()
      return { feil: feil?.code ?? null, reservert: rows[0]!.n === 1 }
    })

  it('lar systemarkitektene og den lokale administratoren i standardfagmiljøet klarere et brukernavn', async () => {
    for (const person of ['systemarkitekt', 'arkitektB', 'adminA'] as const) {
      expect(await klarer(galleri.id[person], 'ny.bruker'), person).toEqual({ feil: null, reservert: true })
    }
  })

  it('stopper alle andre før noe er klarert, også den gamle adminrollen og lokale administratorer i andre fagmiljøer', async () => {
    for (const person of ['adminB', 'vanligA', 'dobbeltAB', 'utenMedlemskap', 'tidligereAdmin', 'bareRollen'] as const) {
      expect(await klarer(hvem(person), 'ny.bruker'), person).toEqual({ feil: '42501', reservert: false })
    }
    expect(await klarer('00000000-0000-4000-8000-000000000000', 'ny.bruker')).toEqual({ feil: '42501', reservert: false })
  })

  it('kontrollerer myndigheten på nytt når kontoen opprettes, så en tilbakekalt lokal administrator ikke får noen konto', async () => {
    /** Klarerer som `aktor`, kjører `imellom`, og oppretter så Auth-brukeren slik Auth gjør det. */
    const opprett = (aktor: string, brukernavn: string, imellom: (tx: Transaction) => Promise<unknown> = async () => {}) =>
      db.transaction(async (tx) => {
        await tx.exec(`set local role service_role`)
        await tx.query(`select set_config('request.jwt.claims', '{"role": "service_role"}', true)`)
        await tx.query('select public.kontooperasjon_klarer_konto($1, $2)', [aktor, brukernavn])
        await tx.exec('reset role')
        await imellom(tx)
        await tx.exec('savepoint opprettelse')
        const feil = await feilFra(() => tx.query('insert into auth.users (email) values ($1)', [`${brukernavn}@${INTERN_AUTH_DOMENE}`]))
        if (feil) await tx.exec('rollback to savepoint opprettelse')
        const { rows } = await tx.query<{ n: number }>('select count(*)::int as n from public.profiles where username = $1', [brukernavn])
        await tx.rollback()
        return { feil: feil?.code ?? null, konto: rows[0]!.n === 1 }
      })
    expect(await opprett(galleri.id.adminA, 'ny.bruker')).toEqual({ feil: null, konto: true })
    const tilbakekall = (tx: Transaction) =>
      tx.query(`update public.fagmiljoadministratorer set til = now() where bruker_id = $1 and til is null`, [galleri.id.adminA])
    expect(await opprett(galleri.id.adminA, 'ny.bruker', tilbakekall)).toEqual({ feil: '42501', konto: false })
  })

  it('kan ikke kalles fra nettleseren', async () => {
    const feil = await feilFra(() =>
      som(db, galleri.id.systemarkitekt, (tx) => tx.query('select public.kontooperasjon_klarer_konto($1, $2)', [galleri.id.systemarkitekt, 'ny.bruker'])),
    )
    expect(feil?.code).toBe('42501')
  })
})

describe('serverprosessene', () => {
  it('når datakildene og kurateringene uten en innlogget bruker, som før', async () => {
    // Synkene og agentene kaller ikke funksjonene her, men en jobb uten
    // bruker (migrasjoner, pg_cron) skal ikke stoppes av kontrollen av aktivt
    // medlemskap foran den.
    const feil = await feilFra(() =>
      db.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claims', '{"role": "service_role"}', true)`)
        await tx.query('select public.les_kurateringer()')
        await tx.query('select public.legemiddeldata_status()')
        await tx.rollback()
      }),
    )
    expect(feil).toBeNull()
  })
})
