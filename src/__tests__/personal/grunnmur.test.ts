/**
 * Personalkalenderen P2b, del 1 (#616, docs/personal-database.md): funksjonen
 * og rollene, det versjonerte oppsettet, medarbeiderne og Sandkasse, prøvd i
 * databasen bygd av migrasjonene, med persongalleriet og bare syntetiske
 * medarbeidere.
 *
 * Akseptkriteriene (docs/personal.md §8): K-SKJ-1–6, K-SKJ-9–10, K-TIL-1–3 og
 * K-TIL-5, K-MED-4, K-KON-3–4.
 */
import { ALLOCATION_FIELD_LIMITS, DEFAULT_ALLOCATION, STATUS_IDS as S_ID } from '@delt/personal/catalog'
import { validateRules } from '@delt/personal/commands'
import { can, ROLES, type Action } from '@delt/personal/permissions'
import type { RuleSet } from '@delt/personal/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { avsluttMedlemskap, opprettMedlem, type Person } from '../hjelp/persongalleri'
import { feilFra, opprettBruker } from '../hjelp/testdatabase'
import { byggPersonaldatabase, grunnlag, migrasjon, PILOT, type Personaldatabase } from './database'

let p: Personaldatabase

beforeAll(async () => {
  p = await byggPersonaldatabase()
}, 120_000)

afterAll(async () => {
  await p.db.close()
})

const grunnlagsfeil = (person: Person | string, fagmiljo: string) => p.feilkode(person, 'select public.personal_grunnlag($1)', [fagmiljo])
const settBryter = (fagmiljo: string, tilstand: string) =>
  p.kall('systemarkitekt', `select public.sett_funksjonsbryter('personal', $1, $2, 'Test av personalkalenderen')`, [fagmiljo, tilstand])
const oppsettfeil = async (regler: unknown) => (await p.db.query<{ f: string[] }>('select personal.oppsettfeil($1) as f', [JSON.stringify(regler)])).rows[0]!.f
const lagre = (person: Person | string, regler: unknown, forventet: number | null, enhet: unknown = { timeZone: 'Europe/Oslo', workYearStartMonth: 1, hideWeekendsByDefault: false }) =>
  p.kall<{ version: number; effectiveFrom: string }>(person, 'select public.personal_lagre_oppsett($1, $2, $3)', [p.S, JSON.stringify({ enhet, regler }), forventet])

describe('funksjonen og rollene', () => {
  it('fører funksjonen inn i katalogen uten noen godkjenning for ordinær bruk', async () => {
    const { rows } = await p.db.query(`select nokkel from public.funksjoner where nokkel = 'personal'`)
    expect(rows).toHaveLength(1)
    expect((await p.db.query(`select 1 from public.funksjonsgodkjenninger where funksjon = 'personal'`)).rows).toEqual([])
  })

  it('har den samme policytabellen i databasen som i domenet', async () => {
    const handlinger: Action[] = ['view', 'editCalendar', 'editPeople', 'editDutyShare', 'editRules', 'manageExemption', 'managePlanners']
    for (const rolle of ROLES) {
      for (const h of handlinger) {
        const iDb = (await p.db.query<{ k: boolean }>('select personal.kan($1, $2) as k', [rolle === 'outsideArchitect' ? null : rolle, h])).rows[0]!.k
        expect(iDb, `${rolle} ${h}`).toBe(can(rolle, h))
      }
    }
  })

  it('setter Sandkasse på utprøving, og lar ingen slå den på i et fagmiljø som ikke er testmiljø (K-SKJ-10)', async () => {
    expect((await p.db.query<{ t: string }>(`select intern.funksjonstilstand('personal', $1) as t`, [p.S])).rows[0]!.t).toBe('utprøving')
    for (const f of [p.galleri.fagmiljo.A, p.galleri.fagmiljo.B]) {
      expect((await p.db.query<{ t: string }>(`select intern.funksjonstilstand('personal', $1) as t`, [f])).rows[0]!.t).toBe('av')
      for (const t of ['utprøving', 'på']) {
        expect(await p.feilkode('systemarkitekt', `select public.sett_funksjonsbryter('personal', $1, $2, 'Forsøk i testen')`, [f, t])).toBe('23514')
      }
    }
  })

  it('gir under utprøving bare systemarkitekter som selv er medlemmer, kalenderen, med rollen fra fagmiljøet (K-SKJ-1, B2)', async () => {
    expect((await grunnlag(p, 'arkitektB')).rolle).toBe('localAdmin')
    expect((await grunnlag(p, 'systemarkitekt')).rolle).toBe('reader')
    // Vanlige medlemmer og lokale administratorer andre steder: som om funksjonen ikke fantes (K-SKJ-3).
    for (const person of ['vanligB', 'adminB'] as const) expect(await grunnlagsfeil(person, p.S), person).toBe('P0002')
  })

  it('svarer som om funksjonen ikke fantes for alle utenfor, også systemarkitekter uten medlemskap (K-SKJ-3, K-SKJ-5, K-TIL-1)', async () => {
    for (const person of ['vanligA', 'adminA', 'dobbeltAB', 'avsluttetA', 'redaktorFortolkningA'] as const) {
      expect(await grunnlagsfeil(person, p.S), person).toBe('P0002')
    }
    // Uten aktivt medlemskap: stoppet før alt annet (P2.0).
    for (const person of ['utenMedlemskap', 'tidligereAdmin'] as const) expect(await grunnlagsfeil(person, p.S), person).toBe('42501')
    // I fagmiljøene der funksjonen er av, også for administratorene og systemarkitektene.
    for (const person of ['systemarkitekt', 'arkitektB', 'adminA', 'adminB', 'vanligA'] as const) {
      for (const f of [p.galleri.fagmiljo.A, p.galleri.fagmiljo.B]) expect(await grunnlagsfeil(person, f), person).toBe('P0002')
    }
    // Et fagmiljø som ikke finnes, svarer det samme.
    expect(await grunnlagsfeil('arkitektB', '00000000-0000-4000-8000-00000000abcd')).toBe('P0002')
  })

  it('røper ikke funksjonen i rettighetene til dem som ikke har den (K-SKJ-2)', async () => {
    const funksjoner = (person: Person) => p.kall<{ funksjon: string; fagmiljo: string }[]>(person, 'select public.mine_funksjoner()')
    expect(await funksjoner('arkitektB')).toContainEqual({ funksjon: 'personal', fagmiljo: p.S })
    for (const person of ['vanligB', 'adminB', 'vanligA', 'adminA'] as const) expect(await funksjoner(person), person).toEqual([])
  })

  it('gir alle egne medlemmer, og bare dem, kalenderen når funksjonen er på i testmiljøet (K-SKJ-6)', async () => {
    await settBryter(p.S, 'på')
    try {
      for (const person of ['vanligB', 'adminB', 'systemarkitekt'] as const) expect((await grunnlag(p, person)).rolle, person).toBe('reader')
      expect((await grunnlag(p, 'arkitektB')).rolle).toBe('localAdmin')
      for (const person of ['vanligA', 'adminA'] as const) expect(await grunnlagsfeil(person, p.S), person).toBe('P0002')
    } finally {
      await settBryter(p.S, 'utprøving')
    }
  })

  it('lar bare den lokale administratoren utpeke vaktplanansvarlige, flere samtidig, og logger det (K-TIL-5, B3)', async () => {
    await settBryter(p.S, 'på')
    try {
      const sett = (aktor: Person, bruker: Person, ansvarlig: boolean) =>
        p.kall(aktor, 'select public.personal_sett_vaktplanansvarlig($1, $2, $3)', [p.S, p.id(bruker), ansvarlig])
      // Kolleger og systemarkitekter uten lokal myndighet kan ikke.
      for (const aktor of ['vanligB', 'systemarkitekt'] as const) {
        expect(await p.feilkode(aktor, 'select public.personal_sett_vaktplanansvarlig($1, $2, true)', [p.S, p.id(aktor)]), aktor).toBe('42501')
      }
      // Bare et eget aktivt medlem kan utpekes.
      expect(await p.feilkode('arkitektB', 'select public.personal_sett_vaktplanansvarlig($1, $2, true)', [p.S, p.id('vanligA')])).toBe('22023')

      await sett('arkitektB', 'vanligB', true)
      await sett('arkitektB', 'adminB', true)
      // Det som alt står, endrer ingenting.
      await sett('arkitektB', 'adminB', true)
      expect((await grunnlag(p, 'vanligB')).rolle).toBe('planner')
      expect((await grunnlag(p, 'adminB')).rolle).toBe('planner')
      expect((await grunnlag(p, 'vanligB')).vaktplanansvarlige.map((v) => v.bruker).sort()).toEqual([p.id('vanligB'), p.id('adminB')].sort())
      // En vaktplanansvarlig kan ikke utpeke andre.
      expect(await p.feilkode('vanligB', 'select public.personal_sett_vaktplanansvarlig($1, $2, true)', [p.S, p.id('systemarkitekt')])).toBe('42501')

      await sett('arkitektB', 'adminB', false)
      expect((await grunnlag(p, 'adminB')).rolle).toBe('reader')

      const logg = await p.db.query<{ handling: string; aktor: string; bruker_id: string; grunn: string }>(
        `select handling, aktor, bruker_id, grunn from public.tilgangslogg where handling like 'vaktplanansvarlige.%' order by id`,
      )
      expect(logg.rows.map((r) => [r.handling, r.bruker_id])).toEqual([
        ['vaktplanansvarlige.insert', p.id('vanligB')],
        ['vaktplanansvarlige.insert', p.id('adminB')],
        ['vaktplanansvarlige.update', p.id('adminB')],
      ])
      expect(new Set(logg.rows.map((r) => r.aktor))).toEqual(new Set([p.id('arkitektB')]))
      expect(logg.rows.every((r) => r.grunn.startsWith('Personal:'))).toBe(true)
    } finally {
      await settBryter(p.S, 'utprøving')
    }
  })

  it('tar rollen fra den som slutter, og gir den ikke tilbake med et nytt medlemskap (K-TIL-3)', async () => {
    await settBryter(p.S, 'på')
    try {
      expect((await grunnlag(p, 'vanligB')).rolle).toBe('planner')
      await avsluttMedlemskap(p.db, p.id('vanligB'), p.S)
      expect(await grunnlagsfeil('vanligB', p.S)).toBe('P0002')
      await opprettMedlem(p.db, p.id('vanligB'), p.S)
      expect((await grunnlag(p, 'vanligB')).rolle).toBe('reader')
      expect((await grunnlag(p, 'arkitektB')).vaktplanansvarlige).toEqual([])
      // En ny utpeking gjelder i det nye medlemskapet.
      await p.kall('arkitektB', 'select public.personal_sett_vaktplanansvarlig($1, $2, true)', [p.S, p.id('vanligB')])
      expect((await grunnlag(p, 'vanligB')).rolle).toBe('planner')
    } finally {
      await settBryter(p.S, 'utprøving')
    }
  })
})

describe('Sandkasse', () => {
  it('har pilotoppsettet fra domenet, med rollevektene på stillingene i appen', async () => {
    const tekst = /\$pilot\$([\s\S]*?)\$pilot\$/.exec(migrasjon('personal_utproving'))![1]!
    expect(JSON.parse(tekst)).toEqual(PILOT)

    const g = await grunnlag(p, 'arkitektB')
    expect(g.enhet).toMatchObject({ id: p.S, name: 'Sandkasse', timeZone: 'Europe/Oslo', workYearStartMonth: 1, hideWeekendsByDefault: false })
    expect(g.regelsett).toHaveLength(1)
    const stilling = (navn: string) => g.kategorier.find((k) => k.name === navn)!.id
    const { version, effectiveFrom, staffing, ...resten } = g.regelsett[0] as unknown as RuleSet
    expect([version, effectiveFrom]).toEqual([1, '2000-01-01'])
    const { staffing: pilotbehov, ...pilotresten } = PILOT
    expect(resten).toEqual(pilotresten)
    expect(staffing).toEqual(
      pilotbehov.map((b) => ({
        ...b,
        categoryWeights: { [stilling('LIS')]: b.categoryWeights!.lis, [stilling('Overlege')]: b.categoryWeights!.overlege },
      })),
    )
  })

  it('har bare de tolv syntetiske medarbeiderne, ingen innlogget konto (K-SKJ-9)', async () => {
    const g = await grunnlag(p, 'arkitektB')
    expect(g.medarbeidere).toHaveLength(12)
    expect(g.medarbeidere.every((m) => m.syntetisk)).toBe(true)
    expect((await p.db.query('select 1 from personal.medarbeidere where bruker_id is not null')).rows).toEqual([])
    const navn = new Map(g.medarbeidere.map((m) => [m.navn, m]))
    expect(navn.get('Tobias Lunde')!.kvalifikasjoner!.map((k) => k.status)).toEqual([S_ID.duty1])
    expect(navn.get('Ida Strand')!.kvalifikasjoner).toEqual([])
    expect(navn.get('Maja Holte')!.stilling).toBe(g.kategorier.find((k) => k.name === 'Overlege')!.id)
  })

  it('gir kvalifikasjonene bare til rollene som redigerer kalenderen', async () => {
    const g = await grunnlag(p, 'systemarkitekt')
    expect(g.rolle).toBe('reader')
    expect(g.medarbeidere.every((m) => !('kvalifikasjoner' in m))).toBe(true)
  })

  it('tåler å kjøres på nytt uten å lage noe to ganger', async () => {
    await p.somServer((tx) => tx.exec(migrasjon('personal_utproving')))
    expect((await grunnlag(p, 'arkitektB')).medarbeidere).toHaveLength(12)
    expect((await grunnlag(p, 'arkitektB')).regelsett).toHaveLength(1)
  })
})

describe('medarbeiderne og testmiljøet (K-MED-4, K-SKJ-10)', () => {
  const nySyntetisk = (fagmiljo: string, navn: string) =>
    p.somServer((tx) => tx.query(`insert into personal.medarbeidere (fagmiljo_id, syntetisk_navn, aktiv_fra) values ($1, $2, current_date)`, [fagmiljo, navn]))
  const nyVirkelig = (fagmiljo: string, bruker: string) =>
    p.somServer((tx) => tx.query(`insert into personal.medarbeidere (fagmiljo_id, bruker_id, aktiv_fra) values ($1, $2, current_date)`, [fagmiljo, bruker]))
  const kode = async (arbeid: () => Promise<unknown>) => {
    try {
      await arbeid()
      return null
    } catch (e) {
      return (e as { code: string }).code
    }
  }

  it('avviser en innlogget konto som medarbeider i et testmiljø', async () => {
    expect(await kode(() => nyVirkelig(p.S, p.id('vanligB')))).toBe('23514')
  })

  it('avviser syntetiske medarbeidere i et fagmiljø som ikke er testmiljø', async () => {
    for (const f of [p.galleri.fagmiljo.A, p.galleri.fagmiljo.B]) expect(await kode(() => nySyntetisk(f, 'Oppdiktet Person'))).toBe('23514')
  })

  it('lar ikke testmerkingen fjernes mens det finnes syntetiske medarbeidere', async () => {
    expect(await p.feilkode('systemarkitekt', `select public.sett_testmiljo($1, false, 'Forsøk i testen')`, [p.S])).toBe('23514')
    // Heller ikke forbi funksjonen.
    expect(await kode(() => p.somServer((tx) => tx.query('update public.fagmiljoer set testmiljo = false where id = $1', [p.S])))).toBe('23514')
  })

  it('lar ikke et fagmiljø med virkelige medarbeidere bli testmiljø, og flytter ingen medarbeider', async () => {
    await nyVirkelig(p.galleri.fagmiljo.B, p.id('vanligB'))
    try {
      expect(await p.feilkode('systemarkitekt', `select public.sett_testmiljo($1, true, 'Forsøk i testen')`, [p.galleri.fagmiljo.B])).toBe('23514')
      expect(
        await kode(() => p.somServer((tx) => tx.query('update personal.medarbeidere set fagmiljo_id = $1 where bruker_id = $2', [p.S, p.id('vanligB')]))),
      ).toBe('42501')
      expect(
        await kode(() =>
          p.somServer((tx) => tx.query(`update personal.medarbeidere set fagmiljo_id = $1 where fagmiljo_id = $2 and syntetisk_navn = 'Alma Berg'`, [p.galleri.fagmiljo.B, p.S])),
        ),
      ).toBe('42501')
    } finally {
      await p.somServer((tx) => tx.query('delete from personal.medarbeidere where bruker_id = $1', [p.id('vanligB')]))
    }
  })

  it('avviser overlappende kvalifikasjoner og en kvalifikasjon som slutter før den begynner', async () => {
    const alma = (await p.db.query<{ id: string }>(`select id from personal.medarbeidere where syntetisk_navn = 'Alma Berg'`)).rows[0]!.id
    const ny = (fra: string, til: string | null) =>
      kode(() => p.somServer((tx) => tx.query('insert into personal.kvalifikasjoner (medarbeider_id, status_id, fra, til) values ($1, $2, $3, $4)', [alma, S_ID.duty1, fra, til])))
    expect(await ny('2026-06-01', '2026-06-30')).toBe('23P01')
    expect(await ny('2025-01-01', '2026-01-01')).toBe('23P01')
    expect(await ny('2025-06-01', '2025-05-01')).toBe('23514')
    expect(await ny('2025-01-01', '2025-12-31')).toBeNull()
    await p.somServer((tx) => tx.query(`delete from personal.kvalifikasjoner where medarbeider_id = $1 and fra = '2025-01-01'`, [alma]))
  })

  it('gir nettleseren ingen tilgang til skjemaet', async () => {
    for (const tabell of ['medarbeidere', 'kvalifikasjoner', 'oppsett', 'vaktplanansvarlige']) {
      expect(await p.feilkode('arkitektB', `select count(*) from personal.${tabell}`), tabell).toBe('42501')
    }
    expect(await p.feilkode('arkitektB', `select personal.rolle($1, $2)`, [p.S, p.id('arkitektB')])).toBe('42501')
  })
})

describe('oppsettet', () => {
  it('godtar pilotoppsettet og et annet fagmiljøs oppsett', async () => {
    expect(await oppsettfeil(PILOT)).toEqual([])
  })

  /** Endringer av pilotoppsettet med feil, og at databasen gir de samme meldingene som `validateRules`. */
  const UGYLDIGE: [string, (r: Omit<RuleSet, 'version' | 'effectiveFrom'>) => void][] = [
    ['ingen visningsgrupper', (r) => (r.groups = [])],
    ['gruppe uten navn', (r) => (r.groups[0]!.name = '  ')],
    ['to like grupper', (r) => r.groups.push({ ...r.groups[0]! })],
    ['ukjent gruppe', (r) => (r.statuses[4]!.group = 'finnes-ikke')],
    ['status uten ID', (r) => (r.statuses[4]!.id = '')],
    ['to like status-ID-er', (r) => (r.statuses[5]!.id = r.statuses[4]!.id)],
    ['status uten navn', (r) => (r.statuses[4]!.name = ' ')],
    ['to like navn', (r) => (r.statuses[5]!.name = ` ${r.statuses[4]!.name.toUpperCase()} `)],
    ['uten tilstedeværelse', (r) => delete (r.statuses[4] as Partial<typeof r.statuses[4]>).present],
    ['ukjent ikon', (r) => (r.statuses[4]!.icon = '1ikon')],
    ['ukjent farge', (r) => (r.statuses[4]!.tone = 'rød farge')],
    ['én per dag uten tilstedeværelse', (r) => Object.assign(r.statuses[2]!, { present: false })],
    ['ukjent vaktfritak', (r) => Object.assign(r.statuses[4]!, { dutyExemption: 'noen ganger' })],
    ['vakt med vaktfritak', (r) => Object.assign(r.statuses[0]!, { dutyExemption: 'always' })],
    ['bemannet oppgave med vaktfritak', (r) => r.staffing.push({ statusId: S_ID.training, perWeekday: [1, 1, 1, 1, 1, 0, 0], onHolidays: false })],
    ['behov for ukjent status', (r) => r.staffing.push({ statusId: 'finnes-ikke', perWeekday: [1, 0, 0, 0, 0, 0, 0], onHolidays: false })],
    ['behov for fravær', (r) => r.staffing.push({ statusId: S_ID.away, perWeekday: [1, 0, 0, 0, 0, 0, 0], onHolidays: false })],
    ['to på en vakt', (r) => (r.staffing[0]!.perWeekday[0] = 2)],
    ['negativt behov', (r) => (r.staffing[1]!.perWeekday[2] = -1)],
    ['brøk i behovet', (r) => (r.staffing[1]!.perWeekday[2] = 0.5)],
    ['seks ukedager', (r) => (r.staffing[1]!.perWeekday = [1, 1, 1, 1, 1, 0] as never)],
    ['behov på lørdag', (r) => (r.staffing[1]!.perWeekday[5] = 1)],
    ['behov på helligdager', (r) => (r.staffing[0]!.onHolidays = true)],
    ['for høy rollevekt', (r) => (r.staffing[0]!.categoryWeights = { lis: 11 })],
    ['for lav belastning', (r) => (r.staffing[0]!.load = 0.05)],
    ['to behov for samme status', (r) => r.staffing.push({ ...r.staffing[0]! })],
    ['for mange på en oppgave', (r) => r.staffing.push({ statusId: S_ID.homeOffice, perWeekday: [21, 0, 0, 0, 0, 0, 0], onHolidays: false })],
    ['arbeidskalender med seks dager', (r) => (r.workCalendar = { weekdays: [true, true, true, true, true, false] as never, holidays: false })],
    ['ukjent helligdagskalender', (r) => (r.workCalendar = { ...r.workCalendar!, holidayCalendar: 'se' as never })],
    ['ukjent fordelingsinnstilling', (r) => (r.allocation = { ...DEFAULT_ALLOCATION, ukjent: 1 } as never)],
    ['for stor vekt', (r) => (r.allocation = { ...DEFAULT_ALLOCATION, spacing: 101 })],
    ...Object.entries(ALLOCATION_FIELD_LIMITS).flatMap(([felt, { min, max }]) =>
      [min - 1, max + 1, min + 0.5].map(
        (v): [string, (r: Omit<RuleSet, 'version' | 'effectiveFrom'>) => void] => [`${felt} = ${v}`, (r) => (r.allocation = { ...DEFAULT_ALLOCATION, [felt]: v })],
      ),
    ),
  ]

  it.each(UGYLDIGE)('avviser %s med de samme meldingene som domenet (K-KON-4)', async (_hva, endre) => {
    const regler = structuredClone(PILOT)
    endre(regler)
    const iDomenet = [...new Set(validateRules({ ...regler, version: 1, effectiveFrom: '2000-01-01' }))].sort()
    expect(iDomenet.length).toBeGreaterThan(0)
    expect(await oppsettfeil(regler)).toEqual(iDomenet)
  })

  it('godtar det samme som domenet ved grensene', async () => {
    for (const [felt, { min, max }] of Object.entries(ALLOCATION_FIELD_LIMITS)) {
      for (const v of [min, max]) expect(await oppsettfeil({ ...PILOT, allocation: { ...DEFAULT_ALLOCATION, [felt]: v } }), `${felt} ${v}`).toEqual([])
    }
    const helg = structuredClone(PILOT)
    helg.workCalendar = { weekdays: [true, true, true, true, true, true, true], holidays: true, holidayCalendar: 'none' }
    helg.staffing[0]!.perWeekday = [1, 1, 1, 1, 1, 1, 1]
    helg.staffing[0]!.onHolidays = true
    expect(validateRules({ ...helg, version: 1, effectiveFrom: '2000-01-01' })).toEqual([])
    expect(await oppsettfeil(helg)).toEqual([])
  })

  it('avviser feil form, også det typene i appen ellers sikrer', async () => {
    for (const [i, regler] of [
      null,
      [],
      { ...PILOT, ekstra: true },
      { groups: PILOT.groups, statuses: PILOT.statuses },
      { ...PILOT, statuses: [{ ...PILOT.statuses[0]!, uniquePerDay: 'ja' }] },
      { ...PILOT, statuses: [...PILOT.statuses, { ...PILOT.statuses[4]!, id: 'Ny Status', name: 'Ny' }] },
      { ...PILOT, statuses: [...PILOT.statuses, { ...PILOT.statuses[4]!, id: 'ny', name: 'Ny', grunn: 'syk' }] },
      { ...PILOT, statuses: [...PILOT.statuses, { ...PILOT.statuses[4]!, id: 'ny', name: 'Ny', description: '010101 12345 x'.replace('010101 12345', '01010112345') }] },
    ].entries()) {
      expect((await oppsettfeil(regler)).length, `tilfelle ${i}`).toBeGreaterThan(0)
    }
  })

  it('lagrer en ny versjon fra i dag for den lokale administratoren, og bare for den (K-KON-3, B3b)', async () => {
    await settBryter(p.S, 'på')
    try {
      const nytt = structuredClone(PILOT)
      nytt.statuses[4]!.name = 'Hjemme'
      for (const person of ['vanligB', 'systemarkitekt'] as const) {
        expect(await p.feilkode(person, 'select public.personal_lagre_oppsett($1, $2, 1)', [p.S, JSON.stringify({ enhet: { timeZone: 'Europe/Oslo', workYearStartMonth: 1, hideWeekendsByDefault: false }, regler: nytt })]), person).toBe('42501')
      }
      const v2 = await lagre('arkitektB', nytt, 1)
      const iDag = (await grunnlag(p, 'arkitektB')).i_dag
      expect(v2).toMatchObject({ version: 2, effectiveFrom: iDag })

      // En annen har lagret imens: konflikt, ingenting lagres.
      expect(await p.feilkode('arkitektB', 'select public.personal_lagre_oppsett($1, $2, 1)', [p.S, JSON.stringify({ enhet: { timeZone: 'Europe/Oslo', workYearStartMonth: 1, hideWeekendsByDefault: false }, regler: PILOT })])).toBe('PT409')
      // Flere versjoner samme dag, og tidligere dager vurderes etter versjonen som gjaldt da.
      const v3 = await lagre('arkitektB', PILOT, 2, { timeZone: 'Europe/Oslo', workYearStartMonth: 8, hideWeekendsByDefault: true })
      expect(v3).toMatchObject({ version: 3, effectiveFrom: iDag })
      const versjonFor = async (dato: string) =>
        (await p.db.query<{ v: number }>('select (personal.oppsett_for($1, $2)).versjon as v', [p.S, dato])).rows[0]!.v
      expect(await versjonFor('2026-01-01')).toBe(1)
      expect(await versjonFor(iDag)).toBe(3)
      expect(await versjonFor('2099-12-31')).toBe(3)
      expect((await grunnlag(p, 'vanligB')).enhet).toMatchObject({ workYearStartMonth: 8, hideWeekendsByDefault: true })
      expect((await grunnlag(p, 'vanligB')).regelsett.map((r) => r.version)).toEqual([1, 2, 3])
    } finally {
      await settBryter(p.S, 'utprøving')
    }
  })

  it('avviser et ugyldig oppsett med feilene, og en status som er i bruk (K-KON-4)', async () => {
    const ugyldig = structuredClone(PILOT)
    ugyldig.staffing[0]!.perWeekday[0] = 2
    const feil = await p.feil('arkitektB', 'select public.personal_lagre_oppsett($1, $2, 3)', [p.S, JSON.stringify({ enhet: { timeZone: 'Europe/Oslo', workYearStartMonth: 1, hideWeekendsByDefault: false }, regler: ugyldig })])
    expect(feil).toMatchObject({ code: '22023', message: 'Bemanningsbehovet for «Vakt 1» må være hele tall mellom 0 og 1.' })

    for (const enhet of [
      { timeZone: 'Europa/Andeby', workYearStartMonth: 1, hideWeekendsByDefault: false },
      { timeZone: 'Europe/Oslo', workYearStartMonth: 13, hideWeekendsByDefault: false },
      { timeZone: 'Europe/Oslo', workYearStartMonth: 1 },
    ]) {
      expect(await p.feilkode('arkitektB', 'select public.personal_lagre_oppsett($1, $2, 3)', [p.S, JSON.stringify({ enhet, regler: PILOT })]), JSON.stringify(enhet)).toBe('22023')
    }

    // Vakt 1 har kvalifikasjoner og kan ikke fjernes; den kan i stedet settes som utgått.
    const utenVakt1 = structuredClone(PILOT)
    utenVakt1.statuses = utenVakt1.statuses.filter((s) => s.id !== S_ID.duty1)
    utenVakt1.staffing = utenVakt1.staffing.filter((s) => s.statusId !== S_ID.duty1)
    expect(await p.feil('arkitektB', 'select public.personal_lagre_oppsett($1, $2, 3)', [p.S, JSON.stringify({ enhet: { timeZone: 'Europe/Oslo', workYearStartMonth: 1, hideWeekendsByDefault: false }, regler: utenVakt1 })])).toMatchObject({
      code: '22023',
      message: '«Vakt 1» er i bruk og kan ikke fjernes.',
    })
  })

  it('lar ingen versjon endres eller fjernes, heller ikke forbi funksjonene', async () => {
    for (const sql of ['update personal.oppsett set skjul_helg = not skjul_helg where fagmiljo_id = $1', 'delete from personal.oppsett where fagmiljo_id = $1']) {
      const e = await p.somServer((tx) => tx.query(sql, [p.S])).then(() => null, (x: { code: string }) => x.code)
      expect(e, sql).toBe('42501')
    }
    // Et ugyldig oppsett kan heller ikke legges inn direkte.
    const e = await p
      .somServer((tx) =>
        tx.query(`insert into personal.oppsett (fagmiljo_id, versjon, gjelder_fra, tidssone, arbeidsaar_start, skjul_helg, regler) values ($1, 4, current_date, 'Europe/Oslo', 1, false, $2)`, [p.S, JSON.stringify({ ...PILOT, groups: [] })]),
      )
      .then(() => null, (x: { code: string }) => x.code)
    expect(e).toBe('23514')
  })
})

describe('kontosletting (docs/brukere.md)', () => {
  const tabell = <R>(sql: string, parametre: unknown[] = []) => p.db.query<R>(sql, parametre).then((r) => r.rows)
  const server = (sql: string, parametre: unknown[] = []) => feilFra(() => p.somServer((tx) => tx.query(sql, parametre))).then((e) => e?.code ?? null)

  it('lar en administrator som har lagret oppsettet og utpekt vaktplanansvarlige, slettes som før, og loggen står', async () => {
    const konto = await opprettBruker(p.db, { brukernavn: 'test.personalsletting', fornavn: 'Test', etternavn: 'Personalsletting', rolle: 'user' })
    await opprettMedlem(p.db, konto, p.S)
    await p.somServer((tx) => tx.query('insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ($1, $2)', [konto, p.S]))
    await settBryter(p.S, 'på')
    try {
      const forrige = (await grunnlag(p, konto)).regelsett.at(-1)!.version
      const { version } = await lagre(konto, PILOT, forrige)
      const sett = (bruker: Person, ansvarlig: boolean) => p.kall(konto, 'select public.personal_sett_vaktplanansvarlig($1, $2, $3)', [p.S, p.id(bruker), ansvarlig])
      await sett('systemarkitekt', true)
      await sett('systemarkitekt', false)
      await sett('adminB', true)

      const ider = (await tabell<{ id: string }>('select id from personal.vaktplanansvarlige where $1 in (tildelt_av, avsluttet_av) order by fra', [konto])).map((r) => r.id)
      expect(ider).toHaveLength(2)

      expect(await server('delete from auth.users where id = $1', [konto])).toBeNull()

      expect(await tabell('select versjon, lagret_av from personal.oppsett where fagmiljo_id = $1 and versjon = $2', [p.S, version])).toEqual([{ versjon: version, lagret_av: null }])
      const utpekinger = await tabell('select bruker_id, tildelt_av, avsluttet_av, til is null as aktiv from personal.vaktplanansvarlige where id = any ($1) order by fra', [ider])
      expect(utpekinger).toEqual([
        { bruker_id: p.id('systemarkitekt'), tildelt_av: null, avsluttet_av: null, aktiv: false },
        { bruker_id: p.id('adminB'), tildelt_av: null, avsluttet_av: null, aktiv: true },
      ])
      expect((await grunnlag(p, 'adminB')).rolle).toBe('planner')
    } finally {
      await settBryter(p.S, 'utprøving')
    }
  })

  it('lar fortsatt ingen endre det som står fast, heller ikke til tomt', async () => {
    for (const sql of [
      'update personal.oppsett set lagret_av = null where fagmiljo_id = $1 and lagret_av is not null',
      'update personal.oppsett set lagret_av = (select id from public.profiles limit 1) where fagmiljo_id = $1 and lagret_av is null',
      'update personal.vaktplanansvarlige set tildelt_av = null where fagmiljo_id = $1 and tildelt_av is not null',
      'update personal.vaktplanansvarlige set tildelt_av = (select id from public.profiles limit 1) where fagmiljo_id = $1 and tildelt_av is null',
      'update personal.vaktplanansvarlige set avsluttet_av = null, til = null where fagmiljo_id = $1 and til is not null',
    ]) {
      expect(await server(sql, [p.S]), sql).toBe('42501')
    }
  })
})

describe('isolasjonsnivået', () => {
  it('stopper endringer i repeatable read heller enn å avgjøre dem på gamle data', async () => {
    const alma = (await p.db.query<{ id: string }>(`select id from personal.medarbeidere where syntetisk_navn = 'Alma Berg'`)).rows[0]!.id
    const e = await feilFra(() =>
      p.db.transaction(async (tx) => {
        await tx.query('set transaction isolation level repeatable read')
        await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Test: personalkalenderen (syntetisk)', true)`)
        await tx.query(`insert into personal.kvalifikasjoner (medarbeider_id, status_id, fra) values ($1, 'vakt1', '2099-01-01')`, [alma])
      }),
    )
    expect(e).toMatchObject({ code: '25001' })
  })
})
