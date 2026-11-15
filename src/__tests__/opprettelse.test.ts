/**
 * Opprettelse av brukere direkte i fagmiljøet den som oppretter, administrerer
 * (issue #395, punkt 2; docs/fagmiljoer.md «Opprettelse av brukere»), med
 * syntetiske kontoer fra persongalleriet.
 *
 * Hele veien går slik Edge-funksjonen `opprett-bruker` og Supabase Auth gjør
 * den: klareringen med den hemmelige nøkkelen og den innloggedes ID
 * (`kontooperasjon_klarer_konto`), og så Auth-brukeren, som utløseren på
 * `auth.users` gjør til en profil og et medlemskap i samme transaksjon.
 *
 * - En lokal administrator i B oppretter en vanlig bruker med primærmedlemskap
 *   bare i B, uten innom A, og med seg selv i tilgangsloggen.
 * - Ingen kan opprette brukere i et fagmiljø de ikke administrerer, i et
 *   lukket eller arkivert fagmiljø, eller uten aktivt medlemskap; et ukjent
 *   fagmiljø gir samme svar som et fremmed.
 * - Mister den som oppretter, myndigheten underveis, eller lukkes fagmiljøet,
 *   blir det ingen konto, profil eller medlemskap.
 * - En annens ferske klarering av samme brukernavn står.
 * - Knappene appen viser (`mine_rettigheter().opprett_bruker_i`), stemmer med
 *   det klareringen slipper gjennom.
 * - Etterpå har administratoren i B, og ikke den i A, myndighet over kontoen.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { byggPersongalleri, PERSONER, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

let db: PGlite
let galleri: Persongalleri
/** Et lukket fagmiljø, slik `opprett_fagmiljo` lager det. */
let lukket: string

const UKJENT = '00000000-0000-4000-8000-000000000000'

beforeAll(async () => {
  db = await nyDatabase()
  galleri = await byggPersongalleri(db)
  lukket = await som(db, galleri.id.systemarkitekt, async (tx) => {
    const { rows } = await tx.query<{ f: { id: string } }>(`select public.opprett_fagmiljo('Lukket testmiljø') as f`)
    return rows[0]!.f.id
  })
}, 120_000)

afterAll(async () => {
  await db.close()
})

/** Gjør transaksjonen til den Edge-funksjonen bruker: den hemmelige nøkkelen, uten innlogget bruker. */
async function somServer(tx: Transaction): Promise<void> {
  await tx.exec('set local role service_role')
  await tx.query(`select set_config('request.jwt.claims', '{"role": "service_role"}', true)`)
}

/** Klarerer `brukernavn` i `tx` slik `opprett-bruker` gjør det. Gir fagmiljøet tilbake. */
async function klarerI(tx: Transaction, aktor: string, brukernavn: string, fagmiljo: string | null) {
  await somServer(tx)
  const { rows } = await tx.query<{ f: { id: string; navn: string } }>(
    'select public.kontooperasjon_klarer_konto($1, $2, $3) as f',
    [aktor, brukernavn, fagmiljo],
  )
  await tx.exec('reset role')
  return rows[0]!.f
}

/** Oppretter Auth-brukeren slik Auth gjør det. */
const authBruker = (tx: Transaction, brukernavn: string) =>
  tx.query<{ id: string }>('insert into auth.users (email) values ($1) returning id', [`${brukernavn}@${INTERN_AUTH_DOMENE}`])

/** Kjører `steg` i en transaksjon som rulles tilbake, og gir feilkoden og meldingen, eller `null`. */
const iProve = (steg: (tx: Transaction) => Promise<unknown>) =>
  feilFra(() =>
    db.transaction(async (tx) => {
      await steg(tx)
      await tx.rollback()
    }),
  )

/** Klarerer i en transaksjon som rulles tilbake: feilkoden og om reservasjonen ble lagt inn. */
async function klarer(aktor: string, brukernavn: string, fagmiljo: string | null) {
  let reservert = false
  const feil = await iProve(async (tx) => {
    await tx.exec('savepoint klarering')
    const f = await feilFra(() => klarerI(tx, aktor, brukernavn, fagmiljo))
    if (f) {
      await tx.exec('rollback to savepoint klarering')
      throw f
    }
    const { rows } = await tx.query<{ n: number }>('select count(*)::int as n from public.kontoreservasjoner where username = $1', [brukernavn])
    reservert = rows[0]!.n === 1
  })
  return { feil: feil?.code ?? null, melding: feil?.message ?? null, reservert }
}

/** Det som finnes om kontoen med brukernavnet etter opprettelsen. */
async function kontoen(tx: Transaction | PGlite, brukernavn: string) {
  const { rows } = await tx.query<{
    konto: boolean
    medlemskap: { fagmiljo: string; primaer: boolean; status: string; tildelt_av: string | null }[]
    rolle: string | null
    systemarkitekt: boolean
    administrator: boolean
    reservasjon: boolean
  }>(
    `select
       exists (select 1 from public.profiles p where p.username = $1) as konto,
       coalesce((select json_agg(json_build_object('fagmiljo', m.fagmiljo_id, 'primaer', m.primaer, 'status', m.status, 'tildelt_av', m.tildelt_av))
                 from public.medlemskap m join public.profiles p on p.id = m.bruker_id where p.username = $1), '[]') as medlemskap,
       (select p.role from public.profiles p where p.username = $1) as rolle,
       exists (select 1 from public.systemroller s join public.profiles p on p.id = s.bruker_id where p.username = $1) as systemarkitekt,
       exists (select 1 from public.fagmiljoadministratorer a join public.profiles p on p.id = a.bruker_id where p.username = $1) as administrator,
       exists (select 1 from public.kontoreservasjoner r where r.username = $1) as reservasjon`,
    [brukernavn],
  )
  return rows[0]!
}

/**
 * Hele opprettelsen i én transaksjon som rulles tilbake: klareringen, så det
 * som skjer `imellom` (som en annen administrator), så Auth-brukeren.
 */
async function opprett(
  aktor: string,
  brukernavn: string,
  fagmiljo: string | null,
  imellom: (tx: Transaction) => Promise<unknown> = async () => {},
) {
  let tilstand: Awaited<ReturnType<typeof kontoen>> | null = null
  let feil: { code: string; message: string } | null = null
  await db.transaction(async (tx) => {
    await klarerI(tx, aktor, brukernavn, fagmiljo)
    await imellom(tx)
    await tx.exec('savepoint opprettelse')
    feil = await feilFra(() => authBruker(tx, brukernavn))
    if (feil) await tx.exec('rollback to savepoint opprettelse')
    tilstand = await kontoen(tx, brukernavn)
    await tx.rollback()
  })
  return { feil: (feil as { code: string } | null)?.code ?? null, ...tilstand! }
}

const medGrunn = async (tx: Transaction) => tx.query(`select set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true)`)

describe('en lokal administrator utenfor standardfagmiljøet', () => {
  it('oppretter en vanlig bruker med primærmedlemskap bare i sitt fagmiljø', async () => {
    const r = await opprett(galleri.id.adminB, 'ny.rt', galleri.fagmiljo.B)
    expect(r).toEqual({
      feil: null,
      konto: true,
      medlemskap: [{ fagmiljo: galleri.fagmiljo.B, primaer: true, status: 'aktiv', tildelt_av: galleri.id.adminB }],
      rolle: 'user',
      systemarkitekt: false,
      administrator: false,
      reservasjon: false,
    })
  })

  it('gir fagmiljøet tilbake fra klareringen, så kvitteringen kan si hvor brukeren ble medlem', async () => {
    await db.transaction(async (tx) => {
      expect(await klarerI(tx, galleri.id.adminB, 'ny.rt', galleri.fagmiljo.B)).toMatchObject({
        id: galleri.fagmiljo.B,
        navn: 'OUS Rettstoksikologi',
      })
      await tx.rollback()
    })
  })

  it('kan ikke opprette brukere i et annet fagmiljø, heller ikke standarden, og ikke gjennom et ukjent', async () => {
    const fremmed = await klarer(galleri.id.adminB, 'ny.bruker', galleri.fagmiljo.A)
    expect(fremmed).toMatchObject({ feil: '42501', reservert: false })
    expect(await klarer(galleri.id.adminB, 'ny.bruker', null)).toMatchObject({ feil: '42501', reservert: false })
    expect(await klarer(galleri.id.adminA, 'ny.bruker', galleri.fagmiljo.B)).toMatchObject({ feil: '42501', reservert: false })
    // Et ukjent fagmiljø gir det samme svaret, så svaret ikke røper hvilke som finnes.
    expect(await klarer(galleri.id.adminB, 'ny.bruker', UKJENT)).toEqual(fremmed)
    expect(await klarer(galleri.id.adminB, 'ny.bruker', lukket)).toEqual(fremmed)
  })
})

describe('hvem som kan opprette brukere hvor', () => {
  /** Personene og fagmiljøene, og om klareringen slipper gjennom. */
  const fagmiljoer = () => ({ A: galleri.fagmiljo.A, B: galleri.fagmiljo.B, lukket })
  const FORVENTET: Partial<Record<Person, readonly ('A' | 'B')[]>> = {
    systemarkitekt: ['A', 'B'],
    arkitektB: ['A', 'B'],
    adminA: ['A'],
    adminB: ['B'],
  }

  it('følger myndigheten i fagmiljøet, og knappene i appen stemmer med klareringen', async () => {
    for (const person of Object.keys(PERSONER) as Person[]) {
      const aktor = galleri.id[person]
      const kan = new Set(FORVENTET[person] ?? [])
      const slapp: string[] = []
      for (const [navn, id] of Object.entries(fagmiljoer())) {
        const { feil } = await klarer(aktor, 'ny.bruker', id)
        if (feil === null) slapp.push(navn)
        else expect(['42501', '55000'], `${person} i ${navn}`).toContain(feil)
      }
      expect(slapp, person).toEqual([...kan])

      // Det appen viser: en bruker uten aktivt medlemskap får ingen rettigheter i det hele tatt.
      const rettigheter = await feilFra(() =>
        som(db, aktor, async (tx) => {
          const { rows } = await tx.query<{ r: { opprett_bruker: boolean; opprett_bruker_i: { id: string }[] } }>(
            'select public.mine_rettigheter() as r',
          )
          const ider = rows[0]!.r.opprett_bruker_i.map((f) => f.id)
          const navn = Object.entries(fagmiljoer()).filter(([, id]) => ider.includes(id)).map(([n]) => n)
          expect(navn, person).toEqual([...kan])
          expect(rows[0]!.r.opprett_bruker, person).toBe(kan.size > 0)
        }),
      )
      if (PERSONER[person].primaer === null) expect(rettigheter?.code, person).toBe('42501')
      else expect(rettigheter, person).toBeNull()
    }
  })

  it('stopper også en ukjent aktør og kontoer uten aktivt medlemskap før noe er klarert', async () => {
    for (const aktor of [UKJENT, galleri.id.utenMedlemskap, galleri.id.tidligereAdmin]) {
      expect(await klarer(aktor, 'ny.bruker', galleri.fagmiljo.A)).toMatchObject({ feil: '42501', reservert: false })
    }
  })

  it('tar ikke imot nye brukere i et lukket eller arkivert fagmiljø, heller ikke fra en systemarkitekt', async () => {
    const r = await klarer(galleri.id.systemarkitekt, 'ny.bruker', lukket)
    expect(r).toMatchObject({ feil: '42501', reservert: false })
    expect(r.melding).toMatch(/startport S2/)
    const arkivert = await iProve(async (tx) => {
      await medGrunn(tx)
      await tx.query(`update public.fagmiljoer set status = 'arkivert' where id = $1`, [galleri.fagmiljo.B])
      await klarerI(tx, galleri.id.systemarkitekt, 'ny.bruker', galleri.fagmiljo.B)
    })
    expect(arkivert?.code).toBe('55000')
  })

  it('gir standardfagmiljøet når ingen fagmiljø er oppgitt, som for en eldre versjon av appen', async () => {
    const r = await opprett(galleri.id.adminA, 'ny.kf', null)
    expect(r.medlemskap).toEqual([{ fagmiljo: galleri.fagmiljo.A, primaer: true, status: 'aktiv', tildelt_av: galleri.id.adminA }])
  })

  it('gir standardfagmiljøet for en reservasjon uten aktør (oppstartsskriptet og testene)', async () => {
    const feil = await iProve(async (tx) => {
      await tx.query('insert into public.kontoreservasjoner (username) values ($1)', ['server.konto'])
      await authBruker(tx, 'server.konto')
      expect((await kontoen(tx, 'server.konto')).medlemskap).toEqual([
        { fagmiljo: galleri.fagmiljo.A, primaer: true, status: 'aktiv', tildelt_av: null },
      ])
    })
    expect(feil).toBeNull()
  })

  it('kan ikke kalles fra nettleseren, og reservasjonene kan ikke skrives der', async () => {
    const kall = await feilFra(() =>
      som(db, galleri.id.adminB, (tx) =>
        tx.query('select public.kontooperasjon_klarer_konto($1, $2, $3)', [galleri.id.adminB, 'ny.bruker', galleri.fagmiljo.B]),
      ),
    )
    expect(kall?.code).toBe('42501')
    const skriv = await feilFra(() =>
      som(db, galleri.id.adminB, (tx) =>
        tx.query('insert into public.kontoreservasjoner (username, aktor, fagmiljo_id) values ($1, $2, $3)', [
          'ny.bruker',
          galleri.id.adminB,
          galleri.fagmiljo.B,
        ]),
      ),
    )
    expect(skriv?.code).toBe('42501')
  })
})

describe('feil underveis', () => {
  const ingenting = { konto: false, medlemskap: [], rolle: null, systemarkitekt: false, administrator: false }

  it('gir ingen konto når administratoren mister myndigheten mellom klareringen og opprettelsen', async () => {
    const tilbakekall = async (tx: Transaction) => {
      await medGrunn(tx)
      // arkitektB er også administrator i B, så B har fortsatt en (regel 3).
      await tx.query(`update public.fagmiljoadministratorer set til = now() where bruker_id = $1 and til is null`, [galleri.id.adminB])
    }
    expect(await opprett(galleri.id.adminB, 'ny.rt', galleri.fagmiljo.B, tilbakekall)).toMatchObject({ feil: '42501', ...ingenting })
  })

  it('gir ingen konto når fagmiljøet lukkes eller administratoren mister medlemskapet underveis', async () => {
    const lukk = async (tx: Transaction) => {
      await medGrunn(tx)
      await tx.query(`update public.fagmiljoer set apent_for_medlemmer = false where id = $1`, [galleri.fagmiljo.B])
    }
    expect(await opprett(galleri.id.adminB, 'ny.rt', galleri.fagmiljo.B, lukk)).toMatchObject({ feil: '42501', ...ingenting })
  })

  it('lar en eksisterende konto stå urørt når brukernavnet alt er i bruk', async () => {
    const vanligB = (await db.query<{ username: string }>('select username from public.profiles where id = $1', [galleri.id.vanligB])).rows[0]!.username
    const for_ = await kontoen(db, vanligB)
    const r = await opprett(galleri.id.adminB, vanligB, galleri.fagmiljo.B)
    expect(r.feil).not.toBeNull()
    expect({ ...r, feil: null, reservasjon: false }).toEqual({ ...for_, feil: null, reservasjon: false })
  })

  it('lar en annens ferske klarering av samme brukernavn stå, men tar over en som er gått ut', async () => {
    const feil = await iProve(async (tx) => {
      await klarerI(tx, galleri.id.adminA, 'omstridt', galleri.fagmiljo.A)
      await tx.exec('savepoint b')
      // Ellers kunne administratoren i A fått ut passordet til en konto i B.
      const b = await feilFra(() => klarerI(tx, galleri.id.adminB, 'omstridt', galleri.fagmiljo.B))
      expect(b?.code).toBe('55P03')
      await tx.exec('rollback to savepoint b')
      // Den samme aktøren kan gjenta en brutt klarering; også en systemarkitekt må vente på en annen.
      await klarerI(tx, galleri.id.adminA, 'omstridt', galleri.fagmiljo.A)
      await tx.exec('savepoint s')
      expect((await feilFra(() => klarerI(tx, galleri.id.systemarkitekt, 'omstridt', galleri.fagmiljo.A)))?.code).toBe('55P03')
      await tx.exec('rollback to savepoint s')
      const { rows } = await tx.query<{ aktor: string; fagmiljo_id: string }>(
        'select aktor, fagmiljo_id from public.kontoreservasjoner where username = $1',
        ['omstridt'],
      )
      expect(rows).toEqual([{ aktor: galleri.id.adminA, fagmiljo_id: galleri.fagmiljo.A }])

      await tx.query(`update public.kontoreservasjoner set reservert_kl = now() - interval '16 minutes' where username = 'omstridt'`)
      await klarerI(tx, galleri.id.adminB, 'omstridt', galleri.fagmiljo.B)
      await authBruker(tx, 'omstridt')
      expect((await kontoen(tx, 'omstridt')).medlemskap).toEqual([
        { fagmiljo: galleri.fagmiljo.B, primaer: true, status: 'aktiv', tildelt_av: galleri.id.adminB },
      ])
    })
    expect(feil).toBeNull()
  })
})

describe('etter opprettelsen', () => {
  let ny: string

  beforeAll(async () => {
    ny = await db.transaction(async (tx) => {
      await klarerI(tx, galleri.id.adminB, 'rt.etterpa', galleri.fagmiljo.B)
      return (await authBruker(tx, 'rt.etterpa')).rows[0]!.id
    })
  })

  it('står i tilgangsloggen med administratoren som aktør og fagmiljøet', async () => {
    const { rows } = await db.query<{ aktor: string; fagmiljo_id: string }>(
      `select aktor, fagmiljo_id from public.tilgangslogg where bruker_id = $1 and handling = 'medlemskap.insert'`,
      [ny],
    )
    expect(rows).toEqual([{ aktor: galleri.id.adminB, fagmiljo_id: galleri.fagmiljo.B }])
  })

  it('er ikke sperret, og arbeider i fagmiljøet den ble opprettet i', async () => {
    const { rows } = await db.query<{ sperret: boolean }>('select banned_until is not null as sperret from auth.users where id = $1', [ny])
    expect(rows[0]!.sperret).toBe(false)
    const r = await som(db, ny, async (tx) => (await tx.query<{ r: Record<string, unknown> }>('select public.mine_rettigheter() as r')).rows[0]!.r)
    expect(r).toMatchObject({
      systemarkitekt: false,
      administrerer: [],
      opprett_bruker: false,
      arbeidsfagmiljo: { id: galleri.fagmiljo.B },
      mine_fagmiljoer: [{ id: galleri.fagmiljo.B }],
    })
  })

  it('kan få nytt passord av administratoren i B, ikke av den i A', async () => {
    const klarerPassord = (aktor: string) =>
      iProve(async (tx) => {
        await somServer(tx)
        await tx.query('select public.kontooperasjon_klarer_passord($1, $2)', [aktor, ny])
      })
    expect(await klarerPassord(galleri.id.adminB)).toBeNull()
    expect((await klarerPassord(galleri.id.adminA))?.code).toBe('42501')
  })

  it('vises i medlemslista i B for administratoren der, og ikke i A', async () => {
    const medlemmer = (aktor: string, fagmiljo: string) =>
      som(db, aktor, async (tx) =>
        (await tx.query<{ bruker_id: string }>('select bruker_id from public.medlemsoversikt($1)', [fagmiljo])).rows.map((r) => r.bruker_id),
      )
    expect(await medlemmer(galleri.id.adminB, galleri.fagmiljo.B)).toContain(ny)
    expect(await medlemmer(galleri.id.adminA, galleri.fagmiljo.A)).not.toContain(ny)
  })
})
