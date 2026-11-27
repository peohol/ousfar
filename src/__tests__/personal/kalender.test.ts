/**
 * Personalkalenderen P2b, del 2 (#616, docs/personal-database.md): kalenderen
 * i databasen, med persongalleriet, et syntetisk Sandkasse og et andre
 * syntetisk testmiljø, og bare syntetiske medarbeidere.
 *
 * Rollene i Sandkasse (S), med funksjonen `på` (et testmiljø kan ha det):
 * arkitektB er lokal administrator, systemarkitekt og adminB er
 * vaktplanansvarlige, og vanligB er kollega. I det andre testmiljøet (T) er
 * systemarkitekt lokal administrator.
 *
 * Akseptkriteriene (docs/personal.md §8): K-TIL-1–4, K-DAT-1–2 og K-KON-3;
 * samtidigheten med to forbindelser (K-DAT-3) står i
 * `src/__tests__/personalkalender.samtidighet.test.ts`.
 */
import { defaultRuleSet, STATUS_IDS as S_ID } from '@delt/personal/catalog'
import { addDays, holidaysForYear, weekdayIndex } from '@delt/personal/dates'
import { checkNote } from '@delt/personal/privacy'
import { dayKind } from '@delt/personal/people'
import { planSet, requiredCount, rulesForDate, staffingCap, statusIndex } from '@delt/personal/rules'
import type { RuleSet, StatusDefinition } from '@delt/personal/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { avsluttMedlemskap, opprettFagmiljo, opprettMedlem, type Person } from '../hjelp/persongalleri'
import { som } from '../hjelp/testdatabase'
import { byggPersonaldatabase, grunnlag, kalender, PILOT, tilstand, type Oppforing, type Personaldatabase } from './database'

let p: Personaldatabase
/** Det andre testmiljøet. */
let T: string
let iDag: string
/** Medarbeiderne i S og T etter navn. */
const ider = new Map<string, string>()
const id = (navn: string) => ider.get(navn)!

/** Mandagen i uke `n` fra og med uka etter neste, uten helligdager mandag–fredag. */
function uke(n: number): string {
  let mandag = addDays(iDag, 14 - weekdayIndex(iDag) + 7 * n)
  for (;;) {
    const dager = [0, 1, 2, 3, 4].map((i) => addDays(mandag, i))
    if (dager.every((d) => !holidaysForYear(Number(d.slice(0, 4))).has(d))) return mandag
    mandag = addDays(mandag, 7)
  }
}

/** Den første helligdagen på en hverdag minst en uke frem. */
function helligdag(): string {
  for (const aar of [Number(iDag.slice(0, 4)), Number(iDag.slice(0, 4)) + 1]) {
    for (const d of [...holidaysForYear(aar).keys()].sort()) if (d > addDays(iDag, 7) && weekdayIndex(d) < 5) return d
  }
  throw new Error('Ingen helligdag')
}

interface Endring {
  medarbeider: string
  dato: string
  revisjon?: number | null
  status?: string | null
  tid?: { start: number; end: number }
  merknad?: string
}

const ENDRE = 'select public.personal_endre_kalender($1, $2)'
const FRITAK = 'select public.personal_sett_fritak($1, $2, $3, $4, $5, $6)'

const endre = (person: Person, endringer: Endring[], fagmiljo = p.S) =>
  p.kall<{ oppforinger: { medarbeider: string; dato: string; oppforing: Oppforing | null }[] }>(person, ENDRE, [fagmiljo, JSON.stringify(endringer)])
const endreFeil = (person: Person, endringer: unknown, fagmiljo = p.S) => p.feil(person, ENDRE, [fagmiljo, JSON.stringify(endringer)])

/** Cellen slik den lokale administratoren ser den, eller undefined. */
async function celle(navn: string, dato: string): Promise<Oppforing | undefined> {
  return (await kalender(p, 'arkitektB', dato, dato)).oppforinger.find((o) => o.medarbeider === id(navn))
}

/** Setter statusen i cellen med revisjonen den har nå. */
async function sett(person: Person, navn: string, dato: string, status: string | null, ekstra: Partial<Endring> = {}) {
  const c = await celle(navn, dato)
  return endre(person, [{ medarbeider: id(navn), dato, revisjon: c?.revisjon ?? null, status, ...ekstra }])
}

const settFritak = (person: Person, navn: string, dato: string, fritak: boolean, o: Pick<Oppforing, 'revisjon' | 'fritak_revisjon'>) =>
  p.kall<Oppforing>(person, FRITAK, [p.S, id(navn), dato, fritak, o.revisjon, o.fritak_revisjon])

const lagreOppsett = async (regler: Omit<RuleSet, 'version' | 'effectiveFrom'>) => {
  const g = await grunnlag(p, 'arkitektB')
  return p.kall<RuleSet>('arkitektB', 'select public.personal_lagre_oppsett($1, $2, $3)', [
    p.S,
    JSON.stringify({ enhet: { timeZone: 'Europe/Oslo', workYearStartMonth: 1, hideWeekendsByDefault: false }, regler }),
    g.regelsett.at(-1)!.version,
  ])
}

beforeAll(async () => {
  p = await byggPersonaldatabase()
  await p.kall('systemarkitekt', `select public.sett_funksjonsbryter('personal', $1, 'på', 'Testmiljø i testen')`, [p.S])
  for (const v of ['systemarkitekt', 'adminB'] as const) {
    await p.kall('arkitektB', 'select public.personal_sett_vaktplanansvarlig($1, $2, true)', [p.S, p.id(v)])
  }

  T = await opprettFagmiljo(p.db, { nokkel: 'sandkasse-to', navn: 'Sandkasse to', administrator: p.id('systemarkitekt') })
  await som(p.db, p.id('systemarkitekt'), (tx) => tx.query(`select public.sett_testmiljo($1, true, 'Andre testmiljø i testen')`, [T]))
  await p.somServer(async (tx) => {
    await tx.query(
      `insert into personal.oppsett (fagmiljo_id, versjon, gjelder_fra, tidssone, arbeidsaar_start, skjul_helg, regler)
       values ($1, 1, '2000-01-01', 'Europe/Oslo', 1, false, $2)`,
      [T, JSON.stringify({ ...PILOT, staffing: PILOT.staffing.map((b) => ({ ...b, categoryWeights: {} })) })],
    )
    for (const navn of ['Tora Tvers', 'Ulrik Utenfor']) {
      const { rows } = await tx.query<{ id: string }>(
        `insert into personal.medarbeidere (fagmiljo_id, syntetisk_navn, aktiv_fra) values ($1, $2, '2026-01-01') returning id`,
        [T, navn],
      )
      await tx.query(`insert into personal.kvalifikasjoner (medarbeider_id, status_id, fra) values ($1, 'vakt1', '2026-01-01')`, [rows[0]!.id])
    }
  })
  await p.kall('systemarkitekt', `select public.sett_funksjonsbryter('personal', $1, 'på', 'Testmiljø i testen')`, [T])

  const g = await grunnlag(p, 'arkitektB')
  iDag = g.i_dag
  for (const m of [...g.medarbeidere, ...(await grunnlag(p, 'systemarkitekt', T)).medarbeidere]) ider.set(m.navn, m.id)
}, 120_000)

afterAll(async () => {
  await p.db.close()
})

describe('tilgangen til kalenderen (K-TIL-1–3, K-SKJ-3)', () => {
  const FUNKSJONER: [string, (f: string) => unknown[]][] = [
    ['select public.personal_kalender($1, $2, $3)', (f) => [f, '2026-06-01', '2026-06-30']],
    ['select public.personal_historikk($1, $2, $3)', (f) => [f, '2026-06-01', '2026-06-30']],
    [ENDRE, (f) => [f, JSON.stringify([{ medarbeider: id('Alma Berg'), dato: '2026-06-01', revisjon: null, status: S_ID.away }])]],
    [FRITAK, (f) => [f, id('Alma Berg'), '2026-06-01', true, 1, 1]],
  ]

  it.each(FUNKSJONER)('%s: 42501 uten aktivt medlemskap, «Finnes ikke» utenfor fagmiljøet', async (sql, argumenter) => {
    for (const person of ['utenMedlemskap', 'tidligereAdmin'] as const) expect(await p.feilkode(person, sql, argumenter(p.S)), person).toBe('42501')
    for (const person of ['vanligA', 'adminA', 'dobbeltAB', 'avsluttetA'] as const) expect(await p.feilkode(person, sql, argumenter(p.S)), person).toBe('P0002')
    // Funksjonen er av i alle virkelige fagmiljøer, også for systemarkitektene og de lokale administratorene der.
    for (const [person, f] of [
      ['systemarkitekt', p.galleri.fagmiljo.A],
      ['arkitektB', p.galleri.fagmiljo.B],
      ['adminB', p.galleri.fagmiljo.B],
    ] as const) {
      expect(await p.feilkode(person, sql, argumenter(f)), `${person} ${f}`).toBe('P0002')
    }
    // Et annet testmiljø der personen ikke er medlem.
    for (const person of ['arkitektB', 'adminB', 'vanligB'] as const) expect(await p.feilkode(person, sql, argumenter(T)), person).toBe('P0002')
  })

  it('gir kollegaen bare lesing, og vaktplanansvarlige ikke fritaket (K-TIL-3)', async () => {
    const dato = uke(0)
    expect((await kalender(p, 'vanligB', dato, dato)).oppforinger).toEqual([])
    for (const [sql, argumenter] of FUNKSJONER.slice(1)) expect(await p.feilkode('vanligB', sql, argumenter(p.S)), sql).toBe('42501')
    await sett('systemarkitekt', 'Alma Berg', dato, S_ID.away)
    const o = (await celle('Alma Berg', dato))!
    for (const planlegger of ['systemarkitekt', 'adminB'] as const) {
      expect(await p.feilkode(planlegger, FRITAK, [p.S, id('Alma Berg'), dato, true, o.revisjon, o.fritak_revisjon])).toBe('42501')
    }
    expect((await celle('Alma Berg', dato))!.fritak).toBe(false)
    await sett('systemarkitekt', 'Alma Berg', dato, null)
  })

  it('stopper utprøvingen for alle som ikke er systemarkitekter med eget medlemskap (K-SKJ-1)', async () => {
    await p.kall('systemarkitekt', `select public.sett_funksjonsbryter('personal', $1, 'utprøving', 'Tilbake til utprøving i testen')`, [p.S])
    try {
      for (const person of ['vanligB', 'adminB'] as const) {
        for (const [sql, argumenter] of FUNKSJONER) expect(await p.feilkode(person, sql, argumenter(p.S)), `${person} ${sql}`).toBe('P0002')
      }
      expect(await kalender(p, 'systemarkitekt', '2026-06-01', '2026-06-30')).toMatchObject({ oppforinger: [] })
    } finally {
      await p.kall('systemarkitekt', `select public.sett_funksjonsbryter('personal', $1, 'på', 'Testmiljø i testen')`, [p.S])
    }
  })

  it('holder hvert fagmiljø for seg, også med medarbeidere og datoer fra det andre (K-TIL-1)', async () => {
    const dato = uke(0)
    await sett('systemarkitekt', 'Alma Berg', dato, S_ID.away)
    await endre('systemarkitekt', [{ medarbeider: id('Tora Tvers'), dato, revisjon: null, status: S_ID.away }], T)

    // Lokal administrator i T ser bare T, og når ikke S-medarbeidere gjennom T.
    expect((await kalender(p, 'systemarkitekt', dato, dato, T)).oppforinger.map((o) => o.medarbeider)).toEqual([id('Tora Tvers')])
    expect((await endreFeil('systemarkitekt', [{ medarbeider: id('Alma Berg'), dato, revisjon: null, status: S_ID.homeOffice }], T))?.message).toBe('Ukjent medarbeider.')
    const alma = (await celle('Alma Berg', dato))!
    expect((await p.feil('systemarkitekt', FRITAK, [T, id('Alma Berg'), dato, true, alma.revisjon, alma.fritak_revisjon]))?.message).toBe('Fant ikke registreringen.')
    expect((await p.kall<unknown[]>('systemarkitekt', 'select public.personal_historikk($1, $2, $3)', [T, dato, dato])).length).toBe(1)
    // Og T-medarbeidere ikke gjennom S.
    expect((await endreFeil('systemarkitekt', [{ medarbeider: id('Tora Tvers'), dato, revisjon: null, status: S_ID.homeOffice }]))?.message).toBe('Ukjent medarbeider.')
    expect((await kalender(p, 'arkitektB', dato, dato)).oppforinger.map((o) => o.medarbeider)).toEqual([id('Alma Berg')])

    await sett('systemarkitekt', 'Alma Berg', dato, null)
    await endre('systemarkitekt', [{ medarbeider: id('Tora Tvers'), dato, revisjon: (await kalender(p, 'systemarkitekt', dato, dato, T)).oppforinger[0]!.revisjon, status: null }], T)
  })

  it('tar fra den som går ut av fagmiljøet tilgangen, og gir ikke planleggerrollen tilbake (K-TIL-3)', async () => {
    const dato = uke(0)
    await avsluttMedlemskap(p.db, p.id('adminB'), p.S)
    expect(await p.feilkode('adminB', 'select public.personal_kalender($1, $2, $3)', [p.S, dato, dato])).toBe('P0002')
    await opprettMedlem(p.db, p.id('adminB'), p.S)
    expect((await grunnlag(p, 'adminB')).rolle).toBe('reader')
    expect((await endreFeil('adminB', [{ medarbeider: id('Alma Berg'), dato, revisjon: null, status: S_ID.away }]))?.code).toBe('42501')
    await p.kall('arkitektB', 'select public.personal_sett_vaktplanansvarlig($1, $2, true)', [p.S, p.id('adminB')])
  })

  it('gir nettleseren ingen tilgang til kalendertabellene eller hjelperne', async () => {
    for (const tabell of ['oppforinger', 'endringer', 'dager']) expect(await p.feilkode('arkitektB', `select count(*) from personal.${tabell}`), tabell).toBe('42501')
    expect(await p.feilkode('arkitektB', `select personal.statusbrudd(null, current_date, 'borte', true, null, false)`)).toBe('42501')
    expect(await p.feilkode('arkitektB', `select personal.las_dag($1, current_date)`, [p.S])).toBe('42501')
  })
})

describe('kalenderreglene på serveren (K-DAT-2)', () => {
  /** Det domenet sier om endringen: bruddene fra `planSet`, og en vakt som alt er tatt. */
  function iDomenet(s: ReturnType<typeof tilstand>, d: { personId: string; date: string; statusId: string; time?: { start: number; end: number }; note?: string }): string {
    const plan = planSet(s, d, iDag)
    const def = statusIndex(rulesForDate(s, d.date, iDag)).get(d.statusId)
    return [...plan.violations.map((v) => v.message), ...(plan.takesOver ? [`${def!.name} er alt tildelt samme dag.`] : [])].join(' ')
  }

  it('gir de samme bruddene som domenet for hver medarbeider, status og dag (regelpariteten)', async () => {
    const mandag = uke(1)
    const dager = [mandag, addDays(mandag, 5), helligdag(), addDays(uke(-4), 2)]
    // Utgangspunktet: Alma har vakt 1 og Maja vakt 2 på mandagen, og Ida er borte med en merknad.
    await endre('systemarkitekt', [
      { medarbeider: id('Alma Berg'), dato: mandag, revisjon: null, status: S_ID.duty1 },
      { medarbeider: id('Maja Holte'), dato: mandag, revisjon: null, status: S_ID.duty2 },
      { medarbeider: id('Ida Strand'), dato: mandag, revisjon: null, status: S_ID.away, merknad: 'Kurs i Bergen' },
    ])
    const g = await grunnlag(p, 'arkitektB')
    const fra = dager.reduce((a, b) => (a < b ? a : b))
    const til = dager.reduce((a, b) => (a > b ? a : b))
    const k = await kalender(p, 'arkitektB', fra, til)
    const s = tilstand(g, k.oppforinger)
    const statuser = [...s.rules.statuses.map((x) => x.id), 'ukjent']
    const varianter: { tid?: { start: number; end: number }; merknad?: string }[] = [{}, { tid: { start: 600, end: 540 }, merknad: 'Var syk i går' }, { tid: { start: 480, end: 960 }, merknad: '  Møte   kl 9 ' }]
    let prøvd = 0
    for (const navn of ['Alma Berg', 'Tobias Lunde', 'Ida Strand', 'Live Rønning']) {
      for (const dato of dager) {
        const forrige = k.oppforinger.find((o) => o.medarbeider === id(navn) && o.dato === dato)
        for (const status of statuser) {
          for (const v of varianter) {
            const forventet = iDomenet(s, { personId: id(navn), date: dato, statusId: status, ...(v.tid ? { time: v.tid } : {}), ...(v.merknad ? { note: v.merknad } : {}) })
            const svar = await p.prov<unknown>('systemarkitekt', ENDRE, [p.S, JSON.stringify([{ medarbeider: id(navn), dato, revisjon: forrige?.revisjon ?? null, status, ...v }])])
            const hva = `${navn} ${dato} ${status} ${JSON.stringify(v)}`
            if (forventet) expect('feil' in svar ? `${svar.feil.code} ${svar.feil.message}` : 'lagret', hva).toBe(`22023 ${forventet}`)
            else expect('feil' in svar ? `${svar.feil.code} ${svar.feil.message}` : 'lagret', hva).toBe('lagret')
            prøvd++
          }
        }
      }
    }
    expect(prøvd).toBeGreaterThan(500)
  })

  it('regner helligdagene, dagene og bemanningsbehovet som domenet', async () => {
    const { rows } = await p.db.query<{ d: string; navn: string }>(
      `select d::date::text as d, personal.helligdag(d::date) as navn from generate_series('2000-01-01'::date, '2099-12-31'::date, '1 day') d
       where personal.helligdag(d::date) is not null order by 1`,
    )
    const fasit = Array.from({ length: 100 }, (_, i) => [...holidaysForYear(2000 + i)].sort(([a], [b]) => a.localeCompare(b))).flat()
    expect(rows.map((r) => [r.d, r.navn])).toEqual(fasit)

    const varianter: RuleSet[] = [
      { ...defaultRuleSet() },
      { ...defaultRuleSet(), workCalendar: { weekdays: [true, true, true, true, true, true, false], holidays: true } },
      { ...defaultRuleSet(), workCalendar: { weekdays: [true, false, true, false, true, false, true], holidays: false, holidayCalendar: 'none' } },
      { ...defaultRuleSet(), workCalendar: undefined, staffing: [{ statusId: S_ID.duty1, perWeekday: [1, 2, 3, 0, 1, 0, 0], onHolidays: true }] },
    ]
    for (const regler of varianter) {
      const { rows: dager } = await p.db.query<{ d: string; slag: string; behov: number; tak: number | null }>(
        `select d::date::text as d, personal.dagtype($1, d::date) as slag, personal.behov($1, 'vakt1', d::date) as behov, personal.tak($1, 'vakt1', d::date) as tak
         from generate_series('2026-01-01'::date, '2027-12-31'::date, '1 day') d order by 1`,
        [JSON.stringify(regler)],
      )
      const person = { id: 'x', name: 'X', categoryId: '', qualifications: [], active: true }
      for (const r of dager) {
        expect(r.slag, r.d).toBe(dayKind(person, r.d, regler))
        expect(r.behov, r.d).toBe(requiredCount(regler, S_ID.duty1, r.d))
        expect(r.tak ?? undefined, r.d).toBe(staffingCap(regler, S_ID.duty1, r.d))
      }
    }
  })

  it('kontrollerer merknaden som domenet', async () => {
    const merknader = [
      '',
      '   ',
      'Kurs i Bergen',
      '  Møte\t\n kl 9  ',
      ' Møte kl 9 ',
      'x'.repeat(120),
      'x'.repeat(121),
      '😀'.repeat(60),
      '😀'.repeat(61),
      'Er syk',
      'SYKEMELDT',
      'Sykt travelt',
      'Barnesykdom',
      'forkjølet',
      'FORKJØLELSE',
      'legetime kl 10',
      'Legebesøk',
      'Lege',
      'Kollegene',
      'Influensa',
      'innlagt',
      'Innlagte',
      'psykolog',
      'terapi',
      'Fysioterapi',
      'behandlingen',
      'Gravid',
      'begravelse',
      'kreftforskning',
      'Kørona',
      'covid-19',
      'diagnose',
      'operasjonsstue',
      'depresjon',
      'svangerskapspermisjon',
      'feber',
      'febersyk',
      'Ring 01010112345',
      'Ring 010101 12345',
      'Ring 010101-12345',
      'Tlf 12345678901',
      'Kode 1234567890',
      'Tlf 22 11 33 44',
    ]
    const { rows } = await p.db.query<{ m: string; feil: string | null; verdi: string | null }>(
      `select m, personal.merknadsfeil(m) as feil, personal.merknad(m) as verdi from unnest($1::text[]) m`,
      [merknader],
    )
    for (const r of rows) {
      const fasit = checkNote(r.m)
      expect({ feil: r.feil, verdi: r.verdi }, JSON.stringify(r.m)).toEqual({ feil: fasit.error ?? null, verdi: fasit.value || null })
    }
  })

  it('tar over en vakt bare når den fjernes hos den som har den, i samme endring', async () => {
    const dato = addDays(uke(2), 1)
    await sett('systemarkitekt', 'Alma Berg', dato, S_ID.duty1)
    expect((await endreFeil('systemarkitekt', [{ medarbeider: id('Tobias Lunde'), dato, revisjon: null, status: S_ID.duty1 }]))?.message).toBe('Vakt 1 er alt tildelt samme dag.')
    const alma = (await celle('Alma Berg', dato))!
    const svar = await endre('adminB', [
      { medarbeider: id('Alma Berg'), dato, revisjon: alma.revisjon, status: null },
      { medarbeider: id('Tobias Lunde'), dato, revisjon: null, status: S_ID.duty1 },
    ])
    expect(svar.oppforinger.map((c) => [c.medarbeider, c.oppforing?.status ?? null])).toEqual([
      [id('Alma Berg'), null],
      [id('Tobias Lunde'), S_ID.duty1],
    ])
  })

  it('bytter vakter mellom to dager i én endring', async () => {
    const [d1, d2] = [addDays(uke(2), 2), addDays(uke(2), 3)]
    await sett('systemarkitekt', 'Alma Berg', d1, S_ID.duty1)
    await sett('systemarkitekt', 'Sanna Myhre', d2, S_ID.duty1)
    const [a, b] = [(await celle('Alma Berg', d1))!, (await celle('Sanna Myhre', d2))!]
    await endre('systemarkitekt', [
      { medarbeider: id('Alma Berg'), dato: d1, revisjon: a.revisjon, status: null },
      { medarbeider: id('Sanna Myhre'), dato: d2, revisjon: b.revisjon, status: null },
      { medarbeider: id('Alma Berg'), dato: d2, revisjon: null, status: S_ID.duty1 },
      { medarbeider: id('Sanna Myhre'), dato: d1, revisjon: null, status: S_ID.duty1 },
    ])
    expect((await celle('Alma Berg', d2))!.status).toBe(S_ID.duty1)
    expect((await celle('Sanna Myhre', d1))!.status).toBe(S_ID.duty1)
    expect(await celle('Alma Berg', d1)).toBeUndefined()
  })

  it('lagrer alt eller ingenting', async () => {
    const dato = addDays(uke(2), 4)
    const feil = await endreFeil('systemarkitekt', [
      { medarbeider: id('Alma Berg'), dato, revisjon: null, status: S_ID.away },
      { medarbeider: id('Ida Strand'), dato, revisjon: null, status: S_ID.duty1 },
    ])
    expect(feil).toMatchObject({ code: '22023', message: 'Ida Strand er ikke kvalifisert for vakt 1.' })
    expect(JSON.parse(feil!.detail!)).toEqual({ endring: 2, medarbeider: id('Ida Strand'), dato })
    expect(await celle('Alma Berg', dato)).toBeUndefined()
  })

  it('beholder registreringen ved ny merknad eller tid, og lager en ny ved ny status', async () => {
    const dato = addDays(uke(3), 0)
    await sett('systemarkitekt', 'Jonas Vik', dato, S_ID.homeOffice, { merknad: '  Skriver   rapport ', tid: { start: 480, end: 720 } })
    const forste = (await celle('Jonas Vik', dato))!
    expect(forste).toMatchObject({ status: S_ID.homeOffice, merknad: 'Skriver rapport', tid: { start: 480, end: 720 }, regelversjon: 1 })
    await sett('systemarkitekt', 'Jonas Vik', dato, S_ID.homeOffice, { merknad: 'Ny merknad' })
    const andre = (await celle('Jonas Vik', dato))!
    expect(andre.id).toBe(forste.id)
    expect(andre.revisjon).toBeGreaterThan(forste.revisjon)
    expect(andre.tid).toBeUndefined()
    await sett('systemarkitekt', 'Jonas Vik', dato, S_ID.research)
    expect((await celle('Jonas Vik', dato))!.id).not.toBe(forste.id)
  })

  it('avviser feil form, ukjente medarbeidere og ugyldige datoer', async () => {
    const dato = uke(3)
    const gyldig = { medarbeider: id('Alma Berg'), dato, revisjon: null, status: S_ID.away }
    for (const endringer of [
      null,
      {},
      [],
      Array.from({ length: 501 }, () => gyldig),
      [gyldig, gyldig],
      [{ ...gyldig, ekstra: 1 }],
      [{ ...gyldig, medarbeider: 'Alma Berg' }],
      [{ ...gyldig, dato: '2026-02-30' }],
      [{ ...gyldig, dato: '1999-12-31' }],
      [{ ...gyldig, dato: '27.11.2026' }],
      [{ ...gyldig, revisjon: 1.5 }],
      [{ ...gyldig, revisjon: '1' }],
      [{ ...gyldig, status: 1 }],
      [{ ...gyldig, status: null, merknad: 'x' }],
      [{ ...gyldig, tid: { start: 1, end: 2, x: 3 } }],
      [{ ...gyldig, tid: { start: '08:00', end: '09:00' } }],
      [{ ...gyldig, merknad: 5 }],
      [{ medarbeider: gyldig.medarbeider, dato, revisjon: null }],
      [{ medarbeider: gyldig.medarbeider, dato, status: S_ID.away }],
    ]) {
      expect((await endreFeil('systemarkitekt', endringer))?.code, JSON.stringify(endringer)?.slice(0, 80)).toBe('22023')
    }
    expect((await endreFeil('systemarkitekt', [{ ...gyldig, medarbeider: '00000000-0000-4000-8000-000000000000' }]))?.message).toBe('Ukjent medarbeider.')
    expect((await endreFeil('systemarkitekt', [{ ...gyldig, dato: '2025-12-31' }]))?.message).toBe('Alma Berg var ikke registrert som medarbeider denne dagen.')
    // En manglende status fjerner ikke registreringen; bare en uttrykkelig null gjør det.
    await sett('systemarkitekt', 'Alma Berg', dato, S_ID.away)
    const { revisjon } = (await celle('Alma Berg', dato))!
    expect((await endreFeil('systemarkitekt', [{ medarbeider: gyldig.medarbeider, dato, revisjon }]))?.code).toBe('22023')
    expect((await celle('Alma Berg', dato))?.status).toBe(S_ID.away)
  })

  it('avviser en endring mot en celle som er endret siden den ble hentet', async () => {
    const dato = addDays(uke(3), 1)
    await sett('systemarkitekt', 'Alma Berg', dato, S_ID.away)
    const o = (await celle('Alma Berg', dato))!
    await endre('adminB', [{ medarbeider: id('Alma Berg'), dato, revisjon: o.revisjon, status: S_ID.away, merknad: 'Hos en annen' }])
    for (const revisjon of [o.revisjon, null]) {
      expect((await endreFeil('systemarkitekt', [{ medarbeider: id('Alma Berg'), dato, revisjon, status: S_ID.vacation }]))?.code).toBe('PT409')
    }
    // Og en tom celle med en revisjon.
    expect((await endreFeil('systemarkitekt', [{ medarbeider: id('Emil Østby'), dato, revisjon: o.revisjon, status: S_ID.vacation }]))?.code).toBe('PT409')
    expect((await celle('Alma Berg', dato))!.merknad).toBe('Hos en annen')
  })

  it('henter kalenderen for et avgrenset tidsrom', async () => {
    for (const [fra, til] of [
      ['2026-06-02', '2026-06-01'],
      ['2026-01-01', '2027-02-06'],
    ]) {
      expect(await p.feilkode('vanligB', 'select public.personal_kalender($1, $2, $3)', [p.S, fra, til])).toBe('22023')
    }
    expect((await kalender(p, 'vanligB', '2026-01-01', '2027-02-05')).fra).toBe('2026-01-01')
  })
})

describe('fritaket (K-TIL-4, K-DAT-1)', () => {
  it('gir kollegaen og vaktplanansvarlig nøyaktig det samme svaret med og uten fritak', async () => {
    const dato = addDays(uke(4), 0)
    await sett('systemarkitekt', 'Noor Aasen', dato, S_ID.away, { merknad: 'Hjemme' })
    const uten = {
      vanligB: await kalender(p, 'vanligB', dato, dato),
      systemarkitekt: await kalender(p, 'systemarkitekt', dato, dato),
      historikk: await p.kall('systemarkitekt', 'select public.personal_historikk($1, $2, $3)', [p.S, dato, dato]),
    }
    expect(JSON.stringify(uten)).not.toMatch(/fritak/)

    const o = (await celle('Noor Aasen', dato))!
    const etter = await settFritak('arkitektB', 'Noor Aasen', dato, true, o)
    expect(etter).toMatchObject({ fritak: true, revisjon: o.revisjon })
    expect(etter.fritak_revisjon).toBeGreaterThan(o.fritak_revisjon!)

    expect({
      vanligB: await kalender(p, 'vanligB', dato, dato),
      systemarkitekt: await kalender(p, 'systemarkitekt', dato, dato),
      historikk: await p.kall('systemarkitekt', 'select public.personal_historikk($1, $2, $3)', [p.S, dato, dato]),
    }).toEqual(uten)
    // Den lokale administratoren ser fritaket, også i historikken.
    expect((await celle('Noor Aasen', dato))!.fritak).toBe(true)
    const historikk = await p.kall<{ etter: { fritak?: boolean } }[]>('arkitektB', 'select public.personal_historikk($1, $2, $3)', [p.S, dato, dato])
    expect(historikk[0]!.etter.fritak).toBe(true)
  })

  it('beholder fritaket ved ny merknad, uten å vise det til planleggeren, og tar det bort ved ny status', async () => {
    const dato = addDays(uke(4), 0)
    const svar = await sett('systemarkitekt', 'Noor Aasen', dato, S_ID.away, { merknad: 'Hjemme hele dagen' })
    expect(JSON.stringify(svar)).not.toMatch(/fritak/)
    expect((await celle('Noor Aasen', dato))!.fritak).toBe(true)
    await sett('systemarkitekt', 'Noor Aasen', dato, S_ID.homeOffice)
    expect((await celle('Noor Aasen', dato))!.fritak).toBe(false)
  })

  it('avviser fritak på en status som ikke kan ha det, og mot en foreldet revisjon', async () => {
    const dato = addDays(uke(4), 1)
    await sett('systemarkitekt', 'Ingrid Falk', dato, S_ID.vacation)
    const ferie = (await celle('Ingrid Falk', dato))!
    expect((await p.feil('arkitektB', FRITAK, [p.S, id('Ingrid Falk'), dato, true, ferie.revisjon, ferie.fritak_revisjon]))?.message).toBe(
      'Statusen kan ikke ha administrativt vaktfritak.',
    )
    await sett('systemarkitekt', 'Ingrid Falk', dato, S_ID.away)
    const borte = (await celle('Ingrid Falk', dato))!
    for (const [rev, frev] of [
      [ferie.revisjon, borte.fritak_revisjon],
      [borte.revisjon, borte.fritak_revisjon! - 1],
    ]) {
      expect(await p.feilkode('arkitektB', FRITAK, [p.S, id('Ingrid Falk'), dato, true, rev, frev])).toBe('PT409')
    }
    expect(await p.feilkode('arkitektB', FRITAK, [p.S, id('Ingrid Falk'), addDays(dato, 1), true, 1, 1])).toBe('22023')
    // Heller ikke rett i tabellen.
    await sett('systemarkitekt', 'Henrik Dahl', dato, S_ID.vacation)
    const henrik = (await celle('Henrik Dahl', dato))!
    expect(
      await p.somServer((tx) => tx.query('update personal.oppforinger set fritak = true where id = $1', [henrik.id])).then(
        () => null,
        (e: { code: string }) => e.code,
      ),
    ).toBe('23514')
  })
})

describe('bemanningsgrensene og oppsettet over tid (K-KON-3)', () => {
  const POLIKLINIKK: StatusDefinition = { id: 'poliklinikk', name: 'Poliklinikk', group: 'tilstede', present: true, icon: 'house', tone: 'teal', uniquePerDay: false, requiresQualification: false, active: true }
  const medPoliklinikk = (antall: number): Omit<RuleSet, 'version' | 'effectiveFrom'> => ({
    ...PILOT,
    statuses: [...PILOT.statuses, POLIKLINIKK],
    staffing: [...PILOT.staffing, { statusId: POLIKLINIKK.id, perWeekday: [antall, antall, antall, antall, antall, 0, 0], onHolidays: false }],
  })
  const tidligere = () => addDays(uke(-4), 0)
  const kode = (arbeid: Promise<unknown>) =>
    arbeid.then(
      () => null,
      (e: { code: string; message: string }) => `${e.code} ${e.message}`,
    )

  beforeAll(async () => {
    // En dag før endringen har reglene som gjaldt da (versjon 1).
    await sett('systemarkitekt', 'Fredrik Solvik', tidligere(), S_ID.away)
    await lagreOppsett(medPoliklinikk(2))
  })

  it('vurderer tidligere dager etter oppsettet som gjaldt da', async () => {
    expect((await endreFeil('systemarkitekt', [{ medarbeider: id('Alma Berg'), dato: tidligere(), revisjon: null, status: POLIKLINIKK.id }]))?.message).toBe('Ukjent status.')
    const dato = uke(5)
    await sett('systemarkitekt', 'Alma Berg', dato, POLIKLINIKK.id)
    expect((await celle('Alma Berg', dato))!.regelversjon).toBe(2)
    expect((await celle('Fredrik Solvik', tidligere()))!.regelversjon).toBe(1)
  })

  it('stopper flere enn behovet, og tillater endringer som ikke øker et overskudd', async () => {
    const dato = uke(5)
    await sett('systemarkitekt', 'Sanna Myhre', dato, POLIKLINIKK.id)
    expect((await endreFeil('systemarkitekt', [{ medarbeider: id('Emil Østby'), dato, revisjon: null, status: POLIKLINIKK.id }]))?.message).toBe(
      'Alle 2 plassene for poliklinikk er fylt samme dag.',
    )
    // Heller ikke rett i tabellen.
    expect(
      await kode(
        p.somServer((tx) =>
          tx.query(`insert into personal.oppforinger (fagmiljo_id, medarbeider_id, dato, status_id, regelversjon) values ($1, $2, $3, 'poliklinikk', 2)`, [p.S, id('Emil Østby'), dato]),
        ),
      ),
    ).toBe(`23514 Poliklinikk har flere enn 2 ${dato}.`)
    // Behovet senkes etterpå: dagen har to, ett mer enn behovet.
    await lagreOppsett(medPoliklinikk(1))
    await sett('systemarkitekt', 'Sanna Myhre', dato, POLIKLINIKK.id, { merknad: 'Rom 3' })
    expect((await endreFeil('systemarkitekt', [{ medarbeider: id('Emil Østby'), dato, revisjon: null, status: POLIKLINIKK.id }]))?.message).toBe(
      'Alle 1 plassene for poliklinikk er fylt samme dag.',
    )
    await sett('systemarkitekt', 'Sanna Myhre', dato, null)
    expect((await endreFeil('systemarkitekt', [{ medarbeider: id('Sanna Myhre'), dato, revisjon: null, status: POLIKLINIKK.id }]))?.message).toBe(
      'Alle 1 plassene for poliklinikk er fylt samme dag.',
    )
  })

  it('holder grensene i databasen også utenom kommandoene', async () => {
    const dato = addDays(uke(5), 1)
    const ny = (navn: string, status: string) =>
      p.somServer((tx) =>
        tx.query(
          `insert into personal.oppforinger (fagmiljo_id, medarbeider_id, dato, status_id, regelversjon) values ($1, $2, $3, $4, 3)`,
          [p.S, id(navn), dato, status],
        ),
      )
    await ny('Alma Berg', S_ID.duty1)
    expect(await kode(ny('Tobias Lunde', S_ID.duty1))).toBe(`23514 Vakt 1 er tildelt flere ${dato}.`)
    await ny('Alma Berg', POLIKLINIKK.id).catch(() => undefined)
    await ny('Jonas Vik', POLIKLINIKK.id)
    expect(await kode(ny('Emil Østby', POLIKLINIKK.id))).toBe(`23514 Poliklinikk er tildelt flere ${dato}.`)
    expect((await kode(ny('Jonas Vik', S_ID.away)))?.slice(0, 5)).toBe('23505')
    // En dato som alt er over grensen, kan endres uten å øke.
    const overskudd = uke(5)
    expect(
      await kode(p.somServer((tx) => tx.query(`update personal.oppforinger set merknad = 'Rom 4' where fagmiljo_id = $1 and dato = $2 and status_id = 'poliklinikk'`, [p.S, overskudd]))),
    ).toBeNull()
  })

  it('lar ikke en status i bruk i kalenderen fjernes fra oppsettet', async () => {
    const uten = { ...medPoliklinikk(1), statuses: PILOT.statuses, staffing: PILOT.staffing }
    expect((await p.feil('arkitektB', 'select public.personal_lagre_oppsett($1, $2, $3)', [
      p.S,
      JSON.stringify({ enhet: { timeZone: 'Europe/Oslo', workYearStartMonth: 1, hideWeekendsByDefault: false }, regler: uten }),
      3,
    ]))?.message).toBe('«Poliklinikk» er i bruk og kan ikke fjernes.')
  })
})

describe('endringsloggen', () => {
  it('fører hver endring med hvem og når, og kan ikke endres', async () => {
    const dato = addDays(uke(6), 0)
    await sett('systemarkitekt', 'Live Rønning', dato, S_ID.away)
    await sett('adminB', 'Live Rønning', dato, S_ID.vacation)
    await sett('systemarkitekt', 'Live Rønning', dato, null)
    const h = await p.kall<{ aktor: string; aktor_navn: string; foer?: { status: string }; etter?: { status: string } }[]>(
      'systemarkitekt',
      'select public.personal_historikk($1, $2, $3)',
      [p.S, dato, dato],
    )
    expect(h.map((x) => [x.aktor, x.foer?.status ?? null, x.etter?.status ?? null])).toEqual([
      [p.id('systemarkitekt'), S_ID.vacation, null],
      [p.id('adminB'), S_ID.away, S_ID.vacation],
      [p.id('systemarkitekt'), null, S_ID.away],
    ])
    for (const sql of ['update personal.endringer set aktor = null', 'delete from personal.endringer']) {
      expect(await p.somServer((tx) => tx.query(sql)).then(() => null, (e: { code: string }) => e.code), sql).toBe('42501')
    }
    expect(await p.feilkode('systemarkitekt', 'select public.personal_historikk($1, $2, $3)', [p.S, '2026-01-01', '2027-12-31'])).toBe('22023')
  })
})

it('har bare syntetiske medarbeidere i kalenderen (K-SKJ-9)', async () => {
  const { rows } = await p.db.query(
    `select 1 from personal.oppforinger o join personal.medarbeidere m on m.id = o.medarbeider_id where m.bruker_id is not null`,
  )
  expect(rows).toEqual([])
})
