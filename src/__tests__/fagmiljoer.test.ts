/**
 * Fagmiljøene, medlemskapene, systemrollene og de lokale administratorene fra
 * P1.1 (docs/fagmiljoer.md, docs/ousfar-nasjonal-p0-kartlegging.md §8).
 *
 * Tilbakefyllingen bare kjøres i produksjonen, så her kjøres den mot
 * syntetiske kontoer som finnes før strukturen kommer, slik produksjonens
 * kontoer gjør: én gang med `maxhag` som tidligere administrator og én gang
 * som vanlig bruker. Begge skal gi samme sluttilstand for `maxhag`.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Rolle } from '@delt/profil'
import { feilFra, kjorMigrasjoner, migrasjonsfiler, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

const STRUKTUR = '20261113140000_fagmiljoer.sql'
const TILBAKEFYLLING = '20261113140100_fagmiljoer_tilbakefylling.sql'
const tilbakefyllingen = readFileSync(resolve(__dirname, '../../supabase/migrations', TILBAKEFYLLING), 'utf8')

const KF = 'ous-klinisk-farmakologi'
const RT = 'ous-rettstoksikologi'

type Konto = 'peohol' | 'maxhag' | 'admin2' | 'bruker1' | 'bruker2'

interface Oppsett {
  db: PGlite
  id: Record<Konto, string>
  fagmiljo: Record<typeof KF | typeof RT, string>
}

/** Dagens kontoer, syntetisk: to administratorer utenom `maxhag`, og to vanlige brukere. */
async function opprettDagensKontoer(db: PGlite, maxhag: Rolle): Promise<Record<Konto, string>> {
  const konto = (brukernavn: string, rolle: Rolle) =>
    opprettBruker(db, { brukernavn, fornavn: 'Test', etternavn: brukernavn, rolle })
  return {
    peohol: await konto('peohol', 'admin'),
    maxhag: await konto('maxhag', maxhag),
    admin2: await konto('admin.to', 'admin'),
    bruker1: await konto('bruker.en', 'user'),
    bruker2: await konto('bruker.to', 'user'),
  }
}

/** En database med dagens kontoer, strukturen fra P1.1 og (uten `utenTilbakefylling`) tilbakefyllingen. */
async function oppsett(maxhag: Rolle, { utenTilbakefylling = false } = {}): Promise<Oppsett> {
  const db = await nyDatabase({ til: STRUKTUR })
  const id = await opprettDagensKontoer(db, maxhag)
  await kjorMigrasjoner(db, { fra: STRUKTUR })
  if (!utenTilbakefylling) await db.exec(tilbakefyllingen)
  const { rows } = await db.query<{ nokkel: typeof KF; id: string }>('select nokkel, id from public.fagmiljoer')
  return { db, id, fagmiljo: Object.fromEntries(rows.map((r) => [r.nokkel, r.id])) as Oppsett['fagmiljo'] }
}

/**
 * Kjører arbeidet i en transaksjon der invariantene kontrolleres med en gang,
 * og ruller den alltid tilbake. Gir feilen, eller `null`.
 */
async function provIsolert(db: PGlite, arbeid: (tx: Transaction) => Promise<unknown>) {
  return feilFra(() =>
    db.transaction(async (tx) => {
      await tx.exec('set constraints all immediate')
      await arbeid(tx)
      await tx.rollback()
    }),
  )
}

async function aktiveAdministratorer(db: PGlite): Promise<string[]> {
  const { rows } = await db.query<{ par: string }>(
    `select p.username || '@' || f.nokkel as par
     from public.fagmiljoadministratorer a
     join public.profiles p on p.id = a.bruker_id
     join public.fagmiljoer f on f.id = a.fagmiljo_id
     where a.til is null order by 1`,
  )
  return rows.map((r) => r.par)
}

async function primaermedlemskap(db: PGlite): Promise<Record<string, string>> {
  const { rows } = await db.query<{ username: string; nokkel: string }>(
    `select p.username, f.nokkel
     from public.medlemskap m
     join public.profiles p on p.id = m.bruker_id
     join public.fagmiljoer f on f.id = m.fagmiljo_id
     where m.primaer and m.status = 'aktiv' order by 1`,
  )
  return Object.fromEntries(rows.map((r) => [r.username, r.nokkel]))
}

it('legger tilbakefyllingen rett etter strukturen og holder den utenfor nye databaser', () => {
  const filer = migrasjonsfiler()
  expect(filer.indexOf(TILBAKEFYLLING)).toBe(filer.indexOf(STRUKTUR) + 1)
  expect(filer.at(-1)).toBe(TILBAKEFYLLING)
})

describe.each<Rolle>(['admin', 'user'])('tilbakefyllingen med maxhag som %s fra før', (maxhagRolle) => {
  let o: Oppsett
  let rollerFor: Record<string, string>

  beforeAll(async () => {
    o = await oppsett(maxhagRolle, { utenTilbakefylling: true })
    const { rows } = await o.db.query<{ username: string; role: string }>('select username, role from public.profiles')
    rollerFor = Object.fromEntries(rows.map((r) => [r.username, r.role]))
    await o.db.exec(tilbakefyllingen)
  }, 120_000)

  afterAll(async () => {
    await o.db.close()
  })

  it('gir maxhag primærmedlemskap i OUS Rettstoksikologi og alle andre i OUS Klinisk farmakologi', async () => {
    expect(await primaermedlemskap(o.db)).toEqual({
      'admin.to': KF,
      'bruker.en': KF,
      'bruker.to': KF,
      maxhag: RT,
      peohol: KF,
    })
    const { rows } = await o.db.query<{ n: number }>(`select count(*)::int as n from public.medlemskap`)
    expect(rows[0]!.n).toBe(5)
  })

  it('gjør hver tidligere administrator til lokal administrator i sitt eget fagmiljø, og maxhag i Rettstoksikologi', async () => {
    expect(await aktiveAdministratorer(o.db)).toEqual([`admin.to@${KF}`, `maxhag@${RT}`, `peohol@${KF}`])
    const { rows } = await o.db.query<{ nokkel: string; administratorer: number }>(
      `select f.nokkel, count(distinct a.bruker_id)::int as administratorer
       from public.fagmiljoer f left join public.fagmiljoadministratorer a on a.fagmiljo_id = f.id and a.til is null
       group by f.nokkel order by 1`,
    )
    expect(rows).toEqual([
      { nokkel: KF, administratorer: 2 },
      { nokkel: RT, administratorer: 1 },
    ])
  })

  it('gjør peohol og maxhag til systemarkitekter, knyttet til konto-ID-ene', async () => {
    const { rows } = await o.db.query<{ bruker_id: string }>(
      `select bruker_id from public.systemroller where tilbakekalt_kl is null and rolle = 'systemarkitekt' order by 1`,
    )
    expect(rows.map((r) => r.bruker_id)).toEqual([o.id.peohol, o.id.maxhag].sort())
  })

  it('endrer ingen roller og ingen adminrettigheter', async () => {
    const { rows } = await o.db.query<{ username: string; role: string }>('select username, role from public.profiles')
    expect(Object.fromEntries(rows.map((r) => [r.username, r.role]))).toEqual(rollerFor)
    for (const [konto, rolle] of [
      [o.id.maxhag, maxhagRolle],
      [o.id.bruker1, 'user'],
      [o.id.admin2, 'admin'],
    ] as const) {
      const erAdmin = await som(o.db, konto, async (tx) => (await tx.query<{ a: boolean }>('select public.er_admin() as a')).rows[0]!.a)
      expect(erAdmin).toBe(rolle === 'admin')
    }
  })

  it('fører alt i tilgangsloggen, med begrunnelse og uten innlogget aktør', async () => {
    const { rows } = await o.db.query<{ handling: string; n: number; uten_grunn: number; med_aktor: number }>(
      `select handling, count(*)::int as n,
              count(*) filter (where grunn is null)::int as uten_grunn,
              count(*) filter (where aktor is not null)::int as med_aktor
       from public.tilgangslogg group by handling order by 1`,
    )
    expect(rows).toEqual([
      { handling: 'fagmiljoadministratorer.insert', n: 3, uten_grunn: 0, med_aktor: 0 },
      { handling: 'fagmiljoer.insert', n: 2, uten_grunn: 0, med_aktor: 0 },
      { handling: 'medlemskap.insert', n: 5, uten_grunn: 0, med_aktor: 0 },
      { handling: 'systemroller.insert', n: 2, uten_grunn: 0, med_aktor: 0 },
    ])
  })

  it('endrer ingenting når den kjøres på nytt', async () => {
    const { rows: for_ } = await o.db.query<{ n: number }>('select count(*)::int as n from public.tilgangslogg')
    await o.db.exec(tilbakefyllingen)
    const { rows: etter } = await o.db.query<{ n: number }>('select count(*)::int as n from public.tilgangslogg')
    expect(etter[0]!.n).toBe(for_[0]!.n)
  })
})

describe('tilbakefyllingen stopper', () => {
  let o: Oppsett

  beforeAll(async () => {
    o = await oppsett('user', { utenTilbakefylling: true })
  }, 120_000)

  afterAll(async () => {
    await o.db.close()
  })

  const kjorI = (forarbeid: string) =>
    feilFra(() =>
      o.db.transaction(async (tx) => {
        await tx.exec(forarbeid)
        await tx.exec(tilbakefyllingen)
      }),
    )

  it('uten kontoen maxhag', async () => {
    const feil = await kjorI(`delete from auth.users where email like 'maxhag@%'`)
    expect(feil?.message).toMatch(/peohol og maxhag må finnes/)
  })

  it('uten kontoen peohol', async () => {
    const feil = await kjorI(`delete from auth.users where email like 'peohol@%'`)
    expect(feil?.message).toMatch(/peohol og maxhag må finnes/)
  })

  it('når OUS Klinisk farmakologi ville stått uten administrator', async () => {
    const feil = await kjorI(`update public.profiles set role = 'user' where username <> 'maxhag'`)
    expect(feil?.message).toMatch(/OUS Klinisk farmakologi ville stått uten administrator/)
  })

  it('når noen alt har medlemskap i et annet fagmiljø enn D1 sier', async () => {
    const feil = await kjorI(`
      insert into public.systemroller (bruker_id, rolle) values ('${o.id.bruker1}', 'systemarkitekt');
      insert into public.medlemskap (bruker_id, fagmiljo_id, primaer) values ('${o.id.bruker1}', '${o.fagmiljo[RT]}', true);
    `)
    expect(feil?.message).toMatch(/annet fagmiljø enn D1/)
  })

  it('og lar databasen stå urørt etter et stopp', async () => {
    const { rows } = await o.db.query<{ n: number }>(
      `select (select count(*) from public.medlemskap) + (select count(*) from public.systemroller)
            + (select count(*) from public.fagmiljoadministratorer) as n`,
    )
    expect(Number(rows[0]!.n)).toBe(0)
  })
})

describe('reglene etter tilbakefyllingen', () => {
  let o: Oppsett

  beforeAll(async () => {
    o = await oppsett('user')
  }, 120_000)

  afterAll(async () => {
    await o.db.close()
  })

  it('gir en ny konto aktivt primærmedlemskap i OUS Klinisk farmakologi', async () => {
    const ny = await opprettBruker(o.db, { brukernavn: 'ny.bruker', fornavn: 'Ny', etternavn: 'Bruker', rolle: 'user' })
    expect((await primaermedlemskap(o.db))['ny.bruker']).toBe(KF)
    const { rows } = await o.db.query<{ n: number }>(
      `select count(*)::int as n from public.tilgangslogg where handling = 'medlemskap.insert' and bruker_id = $1`,
      [ny],
    )
    expect(rows[0]!.n).toBe(1)
  })

  it('lar ingen andre enn systemarkitektene bli medlem av OUS Rettstoksikologi før startporten S2', async () => {
    const vanlig = await provIsolert(o.db, (tx) =>
      tx.query(`insert into public.medlemskap (bruker_id, fagmiljo_id) values ($1, $2)`, [o.id.bruker1, o.fagmiljo[RT]]),
    )
    expect(vanlig?.message).toMatch(/tar ikke imot medlemmer ennå \(startport S2\)/)
    const admin = await provIsolert(o.db, (tx) =>
      tx.query(`insert into public.medlemskap (bruker_id, fagmiljo_id) values ($1, $2)`, [o.id.admin2, o.fagmiljo[RT]]),
    )
    expect(admin?.message).toMatch(/startport S2/)
    const arkitekt = await provIsolert(o.db, (tx) =>
      tx.query(`insert into public.medlemskap (bruker_id, fagmiljo_id) values ($1, $2)`, [o.id.peohol, o.fagmiljo[RT]]),
    )
    expect(arkitekt).toBeNull()
  })

  it('krever nøyaktig ett aktivt primærmedlemskap per konto', async () => {
    const avsluttet = await provIsolert(o.db, (tx) =>
      tx.query(`update public.medlemskap set status = 'deaktivert', til = now() where bruker_id = $1`, [o.id.bruker1]),
    )
    expect(avsluttet?.message).toMatch(/nøyaktig ett aktivt primærmedlemskap/)
  })

  it('krever aktivt medlemskap i samme fagmiljø for en lokal administrator', async () => {
    const utenMedlemskap = await provIsolert(o.db, (tx) =>
      tx.query(`insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ($1, $2)`, [
        o.id.admin2,
        o.fagmiljo[RT],
      ]),
    )
    expect(utenMedlemskap?.message).toMatch(/aktivt medlemskap i fagmiljøet/)
  })

  it('lar ikke et fagmiljø miste sin siste administrator, i noen av de to', async () => {
    const avslutt = (bruker: string, fagmiljo: string) => (tx: Transaction) =>
      tx.query(`update public.fagmiljoadministratorer set til = now() where bruker_id = $1 and fagmiljo_id = $2`, [
        bruker,
        fagmiljo,
      ])
    expect((await provIsolert(o.db, avslutt(o.id.maxhag, o.fagmiljo[RT])))?.message).toMatch(/minst én aktiv administrator/)
    expect(await provIsolert(o.db, avslutt(o.id.peohol, o.fagmiljo[KF]))).toBeNull()
    const begge = await provIsolert(o.db, async (tx) => {
      await avslutt(o.id.peohol, o.fagmiljo[KF])(tx)
      await avslutt(o.id.admin2, o.fagmiljo[KF])(tx)
    })
    expect(begge?.message).toMatch(/minst én aktiv administrator/)
  })

  it('krever en administrator når et fagmiljø opprettes', async () => {
    const feil = await provIsolert(o.db, (tx) =>
      tx.query(`insert into public.fagmiljoer (nokkel, navn) values ('nytt-miljo', 'Nytt miljø')`),
    )
    expect(feil?.message).toMatch(/minst én aktiv administrator/)
  })

  it('lar ikke den siste systemarkitekten tilbakekalles', async () => {
    const tilbakekall = (bruker: string) => (tx: Transaction) =>
      tx.query(`update public.systemroller set tilbakekalt_kl = now() where bruker_id = $1`, [bruker])
    expect(await provIsolert(o.db, tilbakekall(o.id.peohol))).toBeNull()
    const begge = await provIsolert(o.db, async (tx) => {
      await tilbakekall(o.id.peohol)(tx)
      await tilbakekall(o.id.maxhag)(tx)
    })
    expect(begge?.message).toMatch(/siste systemarkitekten/)
  })

  it('sletter ikke medlemskap, roller eller fagmiljøer, og låser feltene som identifiserer dem', async () => {
    for (const sql of [
      `delete from public.medlemskap where bruker_id = '${o.id.bruker1}'`,
      `delete from public.systemroller where bruker_id = '${o.id.peohol}'`,
      `delete from public.fagmiljoadministratorer where bruker_id = '${o.id.admin2}'`,
      `delete from public.fagmiljoer where nokkel = '${RT}'`,
      `truncate public.medlemskap cascade`,
    ]) {
      expect((await provIsolert(o.db, (tx) => tx.exec(sql)))?.message, sql).toMatch(/slettes ikke/)
    }
    const flytt = await provIsolert(o.db, (tx) =>
      tx.query(`update public.medlemskap set fagmiljo_id = $2 where bruker_id = $1`, [o.id.bruker1, o.fagmiljo[RT]]),
    )
    expect(flytt?.message).toMatch(/Feltet fagmiljo_id kan ikke endres/)
    const nokkel = await provIsolert(o.db, (tx) => tx.exec(`update public.fagmiljoer set nokkel = 'annen' where nokkel = '${KF}'`))
    expect(nokkel?.message).toMatch(/Feltet nokkel kan ikke endres/)
  })

  it('lar en konto slettes som før, men ikke den siste administratoren i et fagmiljø', async () => {
    const vanlig = await provIsolert(o.db, async (tx) => {
      await tx.query('delete from auth.users where id = $1', [o.id.bruker2])
      const { rows } = await tx.query<{ n: number }>('select count(*)::int as n from public.medlemskap where bruker_id = $1', [
        o.id.bruker2,
      ])
      expect(rows[0]!.n).toBe(0)
    })
    expect(vanlig).toBeNull()
    expect(await provIsolert(o.db, (tx) => tx.query('delete from auth.users where id = $1', [o.id.admin2]))).toBeNull()
    const sisteAdmin = await provIsolert(o.db, (tx) => tx.query('delete from auth.users where id = $1', [o.id.maxhag]))
    expect(sisteAdmin?.message).toMatch(/minst én aktiv administrator/)
  })

  it('lar ikke tilgangsloggen endres, slettes eller tømmes', async () => {
    for (const sql of [
      `update public.tilgangslogg set grunn = 'endret'`,
      `delete from public.tilgangslogg`,
      `truncate public.tilgangslogg`,
    ]) {
      expect((await provIsolert(o.db, (tx) => tx.exec(sql)))?.message, sql).toMatch(/Tilgangsloggen kan ikke endres/)
    }
  })

  describe('fra nettleseren', () => {
    it('ser brukeren bare sine egne medlemskap og fagmiljøet sitt', async () => {
      const sett = await som(o.db, o.id.bruker1, async (tx) => ({
        medlemskap: (await tx.query<{ bruker_id: string }>('select bruker_id from public.medlemskap')).rows,
        fagmiljoer: (await tx.query<{ navn: string }>('select navn from public.fagmiljoer')).rows,
      }))
      expect(sett).toEqual({ medlemskap: [{ bruker_id: o.id.bruker1 }], fagmiljoer: [{ navn: 'OUS Klinisk farmakologi' }] })
      const maxhag = await som(o.db, o.id.maxhag, async (tx) => (await tx.query<{ navn: string }>('select navn from public.fagmiljoer')).rows)
      expect(maxhag).toEqual([{ navn: 'OUS Rettstoksikologi' }])
    })

    it('kan verken lese roller, administratorer eller loggen, eller skrive noe', async () => {
      for (const bruker of [o.id.bruker1, o.id.peohol]) {
        for (const sql of [
          'select * from public.systemroller',
          'select * from public.fagmiljoadministratorer',
          'select * from public.tilgangslogg',
          `insert into public.medlemskap (bruker_id, fagmiljo_id) values ('${bruker}', '${o.fagmiljo[RT]}')`,
          `update public.medlemskap set status = 'deaktivert', til = now()`,
          `insert into public.fagmiljoer (nokkel, navn) values ('x', 'X')`,
          `insert into public.systemroller (bruker_id, rolle) values ('${bruker}', 'systemarkitekt')`,
        ]) {
          expect((await feilFra(() => som(o.db, bruker, (tx) => tx.query(sql))))?.code, sql).toBe('42501')
        }
      }
    })

    it('gir en anonym ingenting', async () => {
      for (const tabell of ['fagmiljoer', 'medlemskap', 'systemroller', 'fagmiljoadministratorer', 'tilgangslogg']) {
        expect((await feilFra(() => som(o.db, null, (tx) => tx.query(`select * from public.${tabell}`))))?.code).toBe('42501')
      }
    })
  })
})
