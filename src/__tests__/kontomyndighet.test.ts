/**
 * Myndigheten over kontoer (P1.2a, docs/fagmiljoer.md «Myndighet over
 * kontoer»): hvem som kan gi nytt passord til og endre rollen til hvem.
 *
 * Kontooperasjonene i databasen kjøres slik Edge-funksjonene kaller dem, som
 * `service_role` med den innloggedes ID, mot et persongalleri med to
 * fagmiljøer, systemarkitekter, lokale administratorer og brukere med flere,
 * inviterte og avsluttede medlemskap. Hvert kall kjøres i en transaksjon som
 * rulles tilbake, så tilfellene ikke påvirker hverandre.
 *
 * Samtidige kall mot ekte Postgres står i `fagmiljoer.samtidighet.test.ts`.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Rolle } from '@delt/profil'
import { feilFra, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

const KF = 'ous-klinisk-farmakologi'
const RT = 'ous-rettstoksikologi'

/** Hvem som finnes, med det som gir dem myndighet. */
const GALLERI = {
  peohol: { rolle: 'admin', systemarkitekt: true, admin: [KF] },
  maxhag: { rolle: 'user', systemarkitekt: true, primaer: RT, admin: [RT] },
  adminKF: { rolle: 'admin', admin: [KF] },
  adminKF2: { rolle: 'admin', admin: [KF] },
  adminRT: { rolle: 'admin', primaer: RT, admin: [RT] },
  // Lokal administrator uten den gamle rollen: den nye modellen avgjør.
  lokalUtenRolle: { rolle: 'user', admin: [KF] },
  // Den gamle rollen uten lokal tildeling: beskyttet, men uten myndighet.
  gammelAdmin: { rolle: 'admin' },
  tidligereAdmin: { rolle: 'user', admin: [KF], avsluttetAdmin: true },
  brukerKF: { rolle: 'user' },
  brukerKF2: { rolle: 'user' },
  // Primært i RT; medlemskapet i KF er avsluttet.
  brukerRT: { rolle: 'user', primaer: RT },
  brukerBegge: { rolle: 'user', ogsa: { [RT]: 'aktiv' } },
  brukerInvitert: { rolle: 'user', ogsa: { [RT]: 'invitert' } },
  nyBruker: { rolle: 'user', nyKonto: true },
} satisfies Record<string, Person>

interface Person {
  rolle: Rolle
  systemarkitekt?: boolean
  primaer?: string
  admin?: string[]
  avsluttetAdmin?: boolean
  ogsa?: Record<string, 'aktiv' | 'invitert'>
  nyKonto?: boolean
}

type Navn = keyof typeof GALLERI

let db: PGlite
const id = {} as Record<Navn, string>
const fagmiljo = {} as Record<string, string>

async function byggGalleri(): Promise<void> {
  const { rows } = await db.query<{ nokkel: string; id: string }>('select nokkel, id from public.fagmiljoer')
  for (const r of rows) fagmiljo[r.nokkel] = r.id
  // Bare standarden er åpen før S2; testen trenger medlemmer i begge.
  await db.query('update public.fagmiljoer set apent_for_medlemmer = true where nokkel = $1', [RT])

  for (const [navn, p] of Object.entries(GALLERI) as [Navn, Person][]) {
    id[navn] = await opprettBruker(db, { brukernavn: navn.toLowerCase(), fornavn: 'Test', etternavn: navn, rolle: p.rolle })
  }

  await db.transaction(async (tx) => {
    for (const [navn, p] of Object.entries(GALLERI) as [Navn, Person][]) {
      const bruker = id[navn]
      if (p.systemarkitekt) {
        await tx.query(`insert into public.systemroller (bruker_id, rolle) values ($1, 'systemarkitekt')`, [bruker])
      }
      if (p.primaer && p.primaer !== KF) {
        await tx.query(
          `update public.medlemskap set status = 'deaktivert', til = now(), primaer = false where bruker_id = $1`,
          [bruker],
        )
        await tx.query(`insert into public.medlemskap (bruker_id, fagmiljo_id, primaer) values ($1, $2, true)`, [
          bruker,
          fagmiljo[p.primaer],
        ])
      }
      for (const [nokkel, status] of Object.entries(p.ogsa ?? {})) {
        await tx.query(`insert into public.medlemskap (bruker_id, fagmiljo_id, status) values ($1, $2, $3)`, [
          bruker,
          fagmiljo[nokkel],
          status,
        ])
      }
      for (const nokkel of p.admin ?? []) {
        await tx.query(`insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ($1, $2)`, [
          bruker,
          fagmiljo[nokkel],
        ])
      }
      if (p.nyKonto) {
        await tx.query(
          `update public.profiles set must_change_password = true, onboarding_completed = false where id = $1`,
          [bruker],
        )
      }
    }
  })
  // Avsluttes for seg, etter at fagmiljøet har fått andre administratorer.
  for (const [navn, p] of Object.entries(GALLERI) as [Navn, Person][]) {
    if (p.avsluttetAdmin) {
      await db.query('update public.fagmiljoadministratorer set til = now() where bruker_id = $1', [id[navn]])
    }
  }
}

beforeAll(async () => {
  db = await nyDatabase()
  await byggGalleri()
}, 120_000)

afterAll(async () => {
  await db.close()
})

/** Gjør transaksjonen til et kall fra Edge-funksjonene: `service_role`, ingen innlogget i JWT-en. */
async function somServer(tx: Transaction): Promise<void> {
  await tx.query(`select set_config('role', 'service_role', true)`)
  await tx.query(`select set_config('request.jwt.claims', '{"role":"service_role"}', true)`)
}

/** Kjører arbeidet og ruller alltid tilbake. Gir feilen, eller `null`. */
async function isolert(arbeid: (tx: Transaction) => Promise<unknown>) {
  return feilFra(() =>
    db.transaction(async (tx) => {
      await arbeid(tx)
      await tx.rollback()
    }),
  )
}

async function klarer(tx: Transaction, aktor: string, mal: string): Promise<number> {
  await somServer(tx)
  const { rows } = await tx.query<{ v: number }>('select public.kontooperasjon_klarer_passord($1, $2)::int as v', [
    aktor,
    mal,
  ])
  return rows[0]!.v
}

async function fullfor(tx: Transaction, aktor: string, mal: string, merke: number): Promise<string> {
  await somServer(tx)
  const { rows } = await tx.query<{ v: string }>('select public.kontooperasjon_fullfor_passord($1, $2, $3) as v', [
    aktor,
    mal,
    merke,
  ])
  return rows[0]!.v
}

async function settRolle(tx: Transaction, aktor: string, mal: string, rolle: Rolle): Promise<void> {
  await somServer(tx)
  await tx.query('select public.kontooperasjon_sett_rolle($1, $2, $3)', [aktor, mal, rolle])
}

/** Hele `nytt-passord`, uten selve Auth-kallet. Gir feilkoden, eller `null`. */
async function nyttPassord(aktor: Navn, mal: Navn): Promise<string | null> {
  const feil = await isolert(async (tx) => {
    const merke = await klarer(tx, id[aktor], id[mal])
    await fullfor(tx, id[aktor], id[mal], merke)
  })
  return feil?.code ?? null
}

async function rolle(aktor: Navn, mal: Navn, ny: Rolle): Promise<{ code: string; message: string } | null> {
  return isolert((tx) => settRolle(tx, id[aktor], id[mal], ny))
}

describe('nytt passord', () => {
  const TILLATT: [Navn, Navn][] = [
    ['peohol', 'brukerKF'],
    ['peohol', 'brukerRT'],
    ['peohol', 'brukerBegge'],
    ['peohol', 'adminKF'],
    ['peohol', 'adminRT'],
    ['peohol', 'gammelAdmin'],
    ['peohol', 'lokalUtenRolle'],
    ['peohol', 'nyBruker'],
    ['maxhag', 'brukerKF'],
    ['maxhag', 'adminKF'],
    ['adminKF', 'brukerKF'],
    ['adminKF', 'nyBruker'],
    ['adminKF', 'tidligereAdmin'],
    ['adminRT', 'brukerRT'],
    ['lokalUtenRolle', 'brukerKF'],
  ]

  const NEKTET: [Navn, Navn, string][] = [
    // Samme eller høyere myndighet, og en selv.
    ['peohol', 'peohol', 'seg selv'],
    ['peohol', 'maxhag', 'en annen systemarkitekt'],
    ['maxhag', 'peohol', 'en annen systemarkitekt'],
    ['adminKF', 'adminKF', 'seg selv'],
    ['adminKF', 'peohol', 'en systemarkitekt'],
    ['adminKF', 'maxhag', 'en systemarkitekt'],
    ['adminKF', 'adminKF2', 'en lokal administrator i samme fagmiljø'],
    ['adminKF', 'adminRT', 'en lokal administrator i et annet fagmiljø'],
    ['adminKF', 'gammelAdmin', 'en med den gamle adminrollen'],
    ['adminKF', 'lokalUtenRolle', 'en lokal administrator uten den gamle rollen'],
    ['adminRT', 'maxhag', 'en systemarkitekt med rollen user'],
    // Kontoglobalt: alle medlemskapene må være i fagmiljøer den administrerer.
    ['adminKF', 'brukerRT', 'en bruker som bare er medlem av et annet fagmiljø'],
    ['adminKF', 'brukerBegge', 'en bruker som også er aktiv i et annet fagmiljø'],
    ['adminKF', 'brukerInvitert', 'en bruker som er invitert til et annet fagmiljø'],
    ['adminRT', 'brukerKF', 'en bruker i et annet fagmiljø'],
    ['adminRT', 'brukerBegge', 'en bruker som også er aktiv i et annet fagmiljø'],
    // Uten myndighet i noe fagmiljø.
    ['brukerKF', 'brukerKF2', 'en vanlig bruker'],
    ['brukerKF', 'nyBruker', 'en vanlig bruker'],
    ['gammelAdmin', 'brukerKF', 'den gamle adminrollen alene'],
    ['tidligereAdmin', 'brukerKF', 'en avsluttet lokal administrator'],
  ]

  it.each(TILLATT)('%s kan gi %s nytt passord', async (aktor, mal) => {
    expect(await nyttPassord(aktor, mal)).toBeNull()
  })

  it.each(NEKTET)('%s kan ikke gi %s nytt passord (%s)', async (aktor, mal) => {
    expect(await nyttPassord(aktor, mal)).toBe('42501')
  })

  it('nekter allerede i første steg, før passordet byttes i Auth', async () => {
    for (const [aktor, mal] of NEKTET) {
      const feil = await isolert((tx) => klarer(tx, id[aktor], id[mal]))
      expect(feil?.code, `${aktor} → ${mal}`).toBe('42501')
    }
  })

  it('svarer «ukjent bruker» for en konto som ikke finnes', async () => {
    const feil = await isolert((tx) => klarer(tx, id.peohol, '00000000-0000-4000-8000-00000000abcd'))
    expect(feil?.code).toBe('P0002')
  })

  it('setter kontoen i førstegangsoppsett og fører hvem som gjorde det i loggen', async () => {
    const feil = await isolert(async (tx) => {
      const merke = await klarer(tx, id.adminKF, id.brukerKF)
      expect(await fullfor(tx, id.adminKF, id.brukerKF, merke)).toBe('brukerkf')
      const { rows: profil } = await tx.query<{ must_change_password: boolean }>(
        'select must_change_password from public.profiles where id = $1',
        [id.brukerKF],
      )
      expect(profil[0]!.must_change_password).toBe(true)
      const { rows: logg } = await tx.query<{ aktor: string; handling: string; grunn: string }>(
        `select aktor, handling, grunn from public.tilgangslogg where bruker_id = $1 order by id desc limit 1`,
        [id.brukerKF],
      )
      expect(logg[0]).toEqual({ aktor: id.adminKF, handling: 'passord.update', grunn: 'nytt-passord' })
    })
    expect(feil).toBeNull()
  })

  describe('gir ikke ut passordet når tilgangene endres underveis', () => {
    const ENDRINGER: [string, (tx: Transaction) => Promise<unknown>, string][] = [
      ['brukeren blir administrator', (tx) => settRolle(tx, id.peohol, id.brukerKF, 'admin'), '42501'],
      [
        'brukeren blir administrator og så vanlig bruker igjen',
        async (tx) => {
          await settRolle(tx, id.peohol, id.brukerKF, 'admin')
          await settRolle(tx, id.peohol, id.brukerKF, 'user')
        },
        '40001',
      ],
      [
        'brukeren får et medlemskap i et annet fagmiljø',
        (tx) =>
          tx.query(`insert into public.medlemskap (bruker_id, fagmiljo_id, status) values ($1, $2, 'invitert')`, [
            id.brukerKF,
            fagmiljo[RT],
          ]),
        '42501',
      ],
      [
        'brukeren får den gamle rollen direkte i databasen',
        (tx) => tx.query(`update public.profiles set role = 'admin' where id = $1`, [id.brukerKF]),
        '42501',
      ],
    ]

    it.each(ENDRINGER)('%s', async (_, endring, kode) => {
      const feil = await isolert(async (tx) => {
        const merke = await klarer(tx, id.adminKF, id.brukerKF)
        await tx.query(`select set_config('role', 'postgres', true)`)
        await endring(tx)
        await fullfor(tx, id.adminKF, id.brukerKF, merke)
      })
      expect(feil?.code).toBe(kode)
    })

    it('også når det er systemarkitekten som gir passordet', async () => {
      const feil = await isolert(async (tx) => {
        const merke = await klarer(tx, id.peohol, id.brukerKF)
        await settRolle(tx, id.peohol, id.brukerKF, 'admin')
        await settRolle(tx, id.peohol, id.brukerKF, 'user')
        await fullfor(tx, id.peohol, id.brukerKF, merke)
      })
      expect(feil?.code).toBe('40001')
    })

    it('og når den som gir passordet mister myndigheten', async () => {
      const feil = await isolert(async (tx) => {
        const merke = await klarer(tx, id.adminKF, id.brukerKF)
        await settRolle(tx, id.peohol, id.adminKF, 'user')
        await fullfor(tx, id.adminKF, id.brukerKF, merke)
      })
      expect(feil?.code).toBe('42501')
    })
  })
})

describe('rolle', () => {
  it('lar en systemarkitekt gjøre en vanlig bruker til administrator i sitt primære fagmiljø', async () => {
    for (const [aktor, mal, nokkel] of [
      ['peohol', 'brukerKF', KF],
      ['maxhag', 'brukerRT', RT],
      ['peohol', 'brukerBegge', KF],
    ] as const) {
      const feil = await isolert(async (tx) => {
        await settRolle(tx, id[aktor], id[mal], 'admin')
        await tx.query(`select set_config('role', 'postgres', true)`)
        await tx.exec('set constraints all immediate')
        const { rows } = await tx.query<{ role: string; fagmiljoer: string[] }>(
          `select p.role, array(select f.nokkel from public.fagmiljoadministratorer a
                                join public.fagmiljoer f on f.id = a.fagmiljo_id
                                where a.bruker_id = p.id and a.til is null and a.tildelt_av = $2) as fagmiljoer
           from public.profiles p where p.id = $1`,
          [id[mal], id[aktor]],
        )
        expect(rows[0]).toEqual({ role: 'admin', fagmiljoer: [nokkel] })
        const { rows: logg } = await tx.query<{ handling: string; aktor: string; grunn: string }>(
          `select handling, aktor, grunn from public.tilgangslogg where bruker_id = $1 order by id`,
          [id[mal]],
        )
        expect(logg.slice(-2)).toEqual([
          { handling: 'profiles.update', aktor: id[aktor], grunn: 'sett-rolle: admin' },
          { handling: 'fagmiljoadministratorer.insert', aktor: id[aktor], grunn: 'sett-rolle: admin' },
        ])
      })
      expect(feil, `${aktor} → ${mal}`).toBeNull()
    }
  })

  it('lar en systemarkitekt fjerne adminstatus, også den lokale', async () => {
    for (const mal of ['adminKF', 'lokalUtenRolle', 'gammelAdmin'] as const) {
      const feil = await isolert(async (tx) => {
        await settRolle(tx, id.peohol, id[mal], 'user')
        await tx.query(`select set_config('role', 'postgres', true)`)
        await tx.exec('set constraints all immediate')
        const { rows } = await tx.query<{ role: string; aktive: number }>(
          `select p.role, (select count(*)::int from public.fagmiljoadministratorer a
                           where a.bruker_id = p.id and a.til is null) as aktive
           from public.profiles p where p.id = $1`,
          [id[mal]],
        )
        expect(rows[0]).toEqual({ role: 'user', aktive: 0 })
      })
      expect(feil, mal).toBeNull()
    }
  })

  const NEKTET: [Navn, Navn, Rolle, string][] = [
    // Ingen øker sin egen myndighet eller endrer sin egen rolle.
    ['brukerKF', 'brukerKF', 'admin', 'seg selv'],
    ['adminKF', 'adminKF', 'user', 'seg selv'],
    ['peohol', 'peohol', 'user', 'seg selv'],
    ['lokalUtenRolle', 'lokalUtenRolle', 'admin', 'seg selv'],
    // Bare systemarkitekter gir eller tar den gamle globale rollen.
    ['adminKF', 'brukerKF', 'admin', 'en lokal administrator gir den globale rollen'],
    ['adminRT', 'brukerRT', 'admin', 'en lokal administrator gir den globale rollen'],
    ['lokalUtenRolle', 'brukerKF', 'admin', 'en lokal administrator uten rolle gir den'],
    ['gammelAdmin', 'brukerKF', 'admin', 'den gamle rollen alene'],
    ['brukerKF', 'brukerKF2', 'admin', 'en vanlig bruker'],
    ['adminKF', 'adminKF2', 'user', 'en lokal administrator fjerner en annen'],
    ['adminKF', 'peohol', 'user', 'en lokal administrator fjerner en systemarkitekt'],
    ['adminRT', 'maxhag', 'admin', 'en lokal administrator endrer en systemarkitekt'],
    // Samme myndighet.
    ['peohol', 'maxhag', 'admin', 'en systemarkitekt endrer en annen'],
    ['maxhag', 'peohol', 'user', 'en systemarkitekt endrer en annen'],
  ]

  it.each(NEKTET)('%s kan ikke endre rollen til %s til %s (%s)', async (aktor, mal, ny) => {
    expect((await rolle(aktor, mal, ny))?.code).toBe('42501')
  })

  it('gjør ikke en konto med midlertidig passord til administrator', async () => {
    const feil = await rolle('peohol', 'nyBruker', 'admin')
    expect(feil?.code).toBe('42501')
    expect(feil?.message).toContain('valgt sitt eget passord')
  })

  it('fjerner ikke den eneste administratoren i et aktivt fagmiljø', async () => {
    const feil = await isolert(async (tx) => {
      await tx.query(
        `update public.fagmiljoadministratorer set til = now() where bruker_id = $1 and fagmiljo_id = $2`,
        [id.maxhag, fagmiljo[RT]],
      )
      await settRolle(tx, id.peohol, id.adminRT, 'user')
    })
    expect(feil?.code).toBe('23514')
    expect(feil?.message).toContain('OUS Rettstoksikologi')
  })

  it('fjerner ikke den siste med den gamle adminrollen', async () => {
    const feil = await isolert(async (tx) => {
      await tx.query(`update public.profiles set role = 'user' where id <> $1`, [id.gammelAdmin])
      await settRolle(tx, id.peohol, id.gammelAdmin, 'user')
    })
    expect(feil?.code).toBe('23514')
    expect(feil?.message).toContain('siste administratoren')
  })

  it('beskytter systemarkitekten uansett den gamle rollen', async () => {
    // maxhag har rollen user, men er systemarkitekt.
    expect((await rolle('peohol', 'maxhag', 'admin'))?.code).toBe('42501')
    expect(await nyttPassord('adminRT', 'maxhag')).toBe('42501')
    expect(await nyttPassord('peohol', 'maxhag')).toBe('42501')
  })
})

describe('tilgangen til operasjonene', () => {
  const KALL = [
    `select public.kontooperasjon_klarer_passord($1, $2)`,
    `select public.kontooperasjon_fullfor_passord($1, $2, 0)`,
    `select public.kontooperasjon_sett_rolle($1, $2, 'admin')`,
    `select public.kontooperasjon_forste_administrator($2) from (select $1::uuid) x`,
  ]

  it.each(KALL)('kan ikke kalles fra nettleseren: %s', async (sql) => {
    for (const bruker of [id.peohol, id.adminKF, id.brukerKF, null]) {
      const feil = await feilFra(() => som(db, bruker, (tx) => tx.query(sql, [bruker ?? id.peohol, id.brukerKF2])))
      expect(feil?.code, String(bruker)).toBe('42501')
      expect(feil?.message).toMatch(/permission denied/)
    }
  })

  it('stopper heller enn å avgjøre på et gammelt øyeblikksbilde', async () => {
    const feil = await feilFra(() =>
      db.transaction(async (tx) => {
        await tx.exec('set transaction isolation level repeatable read')
        await settRolle(tx, id.peohol, id.brukerKF, 'admin')
      }),
    )
    expect(feil?.code).toBe('25001')
  })

  it('fører også endringer av den gamle rollen utenfor operasjonene i loggen', async () => {
    const feil = await isolert(async (tx) => {
      await tx.query(`update public.profiles set role = 'admin' where id = $1`, [id.brukerKF2])
      const { rows } = await tx.query<{ handling: string; aktor: string | null; foer: unknown; etter: unknown }>(
        `select handling, aktor, foer, etter from public.tilgangslogg where bruker_id = $1 order by id desc limit 1`,
        [id.brukerKF2],
      )
      expect(rows[0]).toEqual({
        handling: 'profiles.update',
        aktor: null,
        foer: { role: 'user' },
        etter: { role: 'admin' },
      })
    })
    expect(feil).toBeNull()
  })

  it('lar ikke en innlogget føre en endring på en annen i loggen', async () => {
    const { rows } = await som(db, id.brukerKF, async (tx) => {
      await tx.query(`select set_config('ousfar.tilgangsaktor', $1, true)`, [id.peohol])
      await tx.query(`select set_config('role', 'postgres', true)`)
      return tx.query<{ aktor: string }>('select intern.tilgangsaktor() as aktor')
    })
    expect(rows[0]!.aktor).toBe(id.brukerKF)
  })
})

describe('den første administratoren', () => {
  async function tilstand(d: PGlite | Transaction, bruker: string) {
    const { rows } = await d.query<{ role: string; systemarkitekt: boolean; fagmiljoer: string[] }>(
      `select p.role,
              exists (select 1 from public.systemroller s where s.bruker_id = p.id and s.tilbakekalt_kl is null) as systemarkitekt,
              array(select f.nokkel from public.fagmiljoadministratorer a join public.fagmiljoer f on f.id = a.fagmiljo_id
                    where a.bruker_id = p.id and a.til is null) as fagmiljoer
       from public.profiles p where p.id = $1`,
      [bruker],
    )
    return rows[0]
  }

  it('gir adminrollen og lokal tildeling, men ingen systemrolle når det finnes systemarkitekter', async () => {
    const feil = await isolert(async (tx) => {
      await somServer(tx)
      await tx.query('select public.kontooperasjon_forste_administrator($1)', [id.brukerKF2])
      expect(await tilstand(tx, id.brukerKF2)).toEqual({ role: 'admin', systemarkitekt: false, fagmiljoer: [KF] })
    })
    expect(feil).toBeNull()
  })

  it('gjør den første kontoen i en tom database til systemarkitekt, så den kan administrere de andre', async () => {
    const tom = await nyDatabase()
    try {
      const forste = await opprettBruker(tom, { brukernavn: 'forste', fornavn: 'F', etternavn: 'A', rolle: 'user' })
      const andre = await opprettBruker(tom, { brukernavn: 'andre', fornavn: 'A', etternavn: 'B', rolle: 'user' })
      await tom.transaction(async (tx) => {
        await somServer(tx)
        await tx.query('select public.kontooperasjon_forste_administrator($1)', [forste])
      })
      expect(await tilstand(tom, forste)).toEqual({ role: 'admin', systemarkitekt: true, fagmiljoer: [KF] })
      // Kan nå gi andre nytt passord og adminstatus, som før P1.2a.
      await tom.transaction(async (tx) => {
        await somServer(tx)
        const { rows } = await tx.query<{ v: number }>('select public.kontooperasjon_klarer_passord($1, $2)::int as v', [forste, andre])
        await tx.query('select public.kontooperasjon_fullfor_passord($1, $2, $3)', [forste, andre, rows[0]!.v])
      })
      // Ikke den som ble kjørt på nytt: den andre blir ikke systemarkitekt.
      await tom.query(`update public.profiles set must_change_password = false where id = $1`, [andre])
      await tom.transaction(async (tx) => {
        await somServer(tx)
        await tx.query('select public.kontooperasjon_forste_administrator($1)', [andre])
      })
      expect(await tilstand(tom, andre)).toEqual({ role: 'admin', systemarkitekt: false, fagmiljoer: [KF] })
    } finally {
      await tom.close()
    }
  }, 120_000)
})

describe('Edge-funksjonene', () => {
  const FUNKSJONER = resolve(__dirname, '../../supabase/functions')
  const kode = Object.fromEntries(
    readdirSync(FUNKSJONER)
      .filter((f) => !f.startsWith('_'))
      .map((f) => [f, readFileSync(resolve(FUNKSJONER, f, 'index.ts'), 'utf8')]),
  )

  it('kaller bare kontooperasjoner som finnes, og bare serveren kan kalle', async () => {
    const kalt = Object.values(kode).flatMap((k) => [...k.matchAll(/kontofunksjon<[^>]+>\(\s*admin,\s*'([a-z_]+)'/g)].map((m) => m[1]!))
    expect(new Set(kalt)).toEqual(
      new Set(['kontooperasjon_klarer_passord', 'kontooperasjon_fullfor_passord', 'kontooperasjon_sett_rolle']),
    )
    for (const navn of kalt) {
      const { rows } = await db.query<{ server: boolean; nettleser: boolean; anonym: boolean }>(
        `select bool_or(has_function_privilege('service_role', p.oid, 'execute')) as server,
                bool_or(has_function_privilege('authenticated', p.oid, 'execute')) as nettleser,
                bool_or(has_function_privilege('anon', p.oid, 'execute')) as anonym
         from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname = $1`,
        [navn],
      )
      expect(rows[0], navn).toEqual({ server: true, nettleser: false, anonym: false })
    }
  })

  it('gir kontooperasjonene den innloggedes ID fra JWT-en, aldri noe fra kroppen', () => {
    for (const navn of ['nytt-passord', 'sett-rolle']) {
      expect(kode[navn], navn).toContain('aktor: innlogget.id')
      expect(kode[navn], navn).not.toMatch(/aktor:\s*kropp/)
    }
  })

  it('kontrollerer myndigheten både før og etter at passordet byttes i Auth', () => {
    const k = kode['nytt-passord']!
    const forst = k.indexOf("'kontooperasjon_klarer_passord'")
    const bytte = k.indexOf('settMidlertidigPassord(admin')
    const sist = k.indexOf("'kontooperasjon_fullfor_passord'")
    expect(forst).toBeGreaterThan(-1)
    expect(forst).toBeLessThan(bytte)
    expect(bytte).toBeLessThan(sist)
    expect(k.indexOf('return { brukernavn, midlertidigPassord }')).toBeGreaterThan(sist)
  })
})
