/**
 * Personalkalenderen P2c (#620, docs/personal-database.md, «Medarbeiderne»,
 * «Innstillingene» og «Vis som»): medarbeiderne 1:1 med medlemmene,
 * kvalifikasjonene og vaktandelen, og «Vis som», prøvd i databasen bygd av
 * migrasjonene.
 *
 * Bare syntetiske kontoer og medarbeidere. Det virkelige fagmiljøet R er et
 * syntetisk fagmiljø som ikke er testmiljø, med en syntetisk godkjenning i
 * testdatabasen, slik 1:1-tilknytningen skal prøves (personal.md §8.3).
 *
 * Akseptkriteriene (docs/personal.md §8): K-MED-1–5, K-SKJ-7, og at
 * K-SKJ-1–6, K-SKJ-9–10 og K-TIL-1–5 står.
 */
import { STATUS_IDS as S_ID } from '@delt/personal/catalog'
import { addDays } from '@delt/personal/dates'
import { changesPast, validateDutySchedule } from '@delt/personal/dutyShare'
import type { DutyShareSchedule } from '@delt/personal/types'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { avsluttMedlemskap, opprettFagmiljo, opprettMedlem, type Person } from '../hjelp/persongalleri'
import { feilFra, opprettBruker } from '../hjelp/testdatabase'
import { byggPersonaldatabase, grunnlag, kalender, PILOT, type Grunnlag, type Personaldatabase } from './database'

let p: Personaldatabase
/** Det syntetiske «virkelige» fagmiljøet, og kontoene der. */
let R: string
const konto: Record<'adminR' | 'planR' | 'kollegaR' | 'nyR' | 'invitertR', string> = { adminR: '', planR: '', kollegaR: '', nyR: '', invitertR: '' }
let iDag: string

const GRUNN = 'Test av personalkalenderen (syntetisk)'
const settBryter = (fagmiljo: string, tilstand: string) =>
  p.kall('systemarkitekt', `select public.sett_funksjonsbryter('personal', $1, $2, $3)`, [fagmiljo, tilstand, GRUNN])
const navnI = (g: Grunnlag) => g.medarbeidere.map((m) => m.navn).sort()
const aktiveI = (g: Grunnlag, dag: string) =>
  g.medarbeidere.filter((m) => (m as Medarbeider).perioder.some((x) => x.fra <= dag && (x.til === null || dag <= x.til))).map((m) => m.navn).sort()
const medarbeiderI = async (person: Person | string, fagmiljo: string, navn: string) => {
  const m = (await grunnlag(p, person, fagmiljo)).medarbeidere.find((x) => x.navn === navn)
  if (!m) throw new Error(`Fant ikke ${navn}`)
  return m as Medarbeider
}
const endre = (person: Person | string, fagmiljo: string, endringer: unknown[]) =>
  p.kall(person, 'select public.personal_endre_kalender($1, $2)', [fagmiljo, JSON.stringify(endringer)])
const kode = async (arbeid: () => Promise<unknown>) => (await feilFra(arbeid))?.code ?? null

type Medarbeider = Grunnlag['medarbeidere'][number] & {
  perioder: { fra: string; til: string | null }[]
  revisjon: number
  vaktandel: DutyShareSchedule
}
interface Innstillinger {
  id: string
  revisjon: number
  kvalifikasjoner: { status: string; fra: string; til: string | null }[]
  vaktandel: DutyShareSchedule
}
const settKvalifikasjoner = (person: Person | string, fagmiljo: string, medarbeider: string, statuser: unknown, revisjon: number) =>
  p.kall<Innstillinger>(person, 'select public.personal_sett_kvalifikasjoner($1, $2, $3, $4)', [fagmiljo, medarbeider, JSON.stringify(statuser), revisjon])
const lagreVaktandel = (person: Person | string, fagmiljo: string, medarbeider: string, plan: unknown, revisjon: number) =>
  p.kall<Innstillinger>(person, 'select public.personal_lagre_vaktandel($1, $2, $3, $4)', [fagmiljo, medarbeider, JSON.stringify(plan), revisjon])
const visSom = (person: Person | string, fagmiljo: string, rolle: string | null, medarbeider: string | null = null) =>
  p.kall<{ rolle: string; reell_rolle: string; vis_som: unknown; meg: string | null }>(person, 'select public.personal_vis_som($1, $2, $3)', [fagmiljo, rolle, medarbeider])

beforeAll(async () => {
  p = await byggPersonaldatabase()
  const ny = (brukernavn: string, fornavn: string) => opprettBruker(p.db, { brukernavn, fornavn, etternavn: 'Testesen', rolle: 'user' })
  konto.adminR = await ny('test.adminr', 'Ada')
  R = await opprettFagmiljo(p.db, { nokkel: 'test-reelt-r', navn: 'Fagmiljø R', administrator: konto.adminR })
  konto.planR = await ny('test.planr', 'Pia')
  konto.kollegaR = await ny('test.kollegar', 'Kari')
  konto.nyR = await ny('test.nyr', 'Nils')
  konto.invitertR = await ny('test.invitertr', 'Ivar')
  for (const k of [konto.planR, konto.kollegaR]) await opprettMedlem(p.db, k, R, { primaer: true })
  await p.somServer((tx) =>
    tx.query(`insert into public.medlemskap (bruker_id, fagmiljo_id, status) values ($1, $2, 'invitert')`, [konto.invitertR, R]),
  )
  iDag = (await p.db.query<{ d: string }>(`select personal.i_dag($1)::text as d`, [R])).rows[0]!.d
}, 120_000)

afterAll(async () => {
  await p.db.close()
})

describe('medarbeiderne 1:1 med medlemmene (B13, K-MED-1, K-MED-3, K-MED-5)', () => {
  it('knytter ikke medlemmene til seg før funksjonen er på i fagmiljøet', async () => {
    for (const tabell of ['personal.medarbeidere', 'personal.tilknyttede_fagmiljoer']) {
      expect((await p.db.query(`select 1 from ${tabell} where fagmiljo_id = $1`, [R])).rows, tabell).toEqual([])
    }
  })

  it('gjør de aktive medlemmene, og bare dem, til medarbeidere når funksjonen slås på, uten noen handling', async () => {
    await p.somServer((tx) =>
      tx.query(`insert into public.funksjonsgodkjenninger (funksjon, fagmiljo_id, grunnlag) values ('personal', $1, 'Syntetisk godkjenning i testen')`, [R]),
    )
    await settBryter(R, 'på')
    await p.kall(konto.adminR, 'select public.personal_lagre_oppsett($1, $2, null)', [
      R,
      JSON.stringify({ enhet: { timeZone: 'Europe/Oslo', workYearStartMonth: 1, hideWeekendsByDefault: false }, regler: PILOT }),
    ])
    const g = await grunnlag(p, konto.adminR, R)
    expect(navnI(g)).toEqual(['Ada Testesen', 'Kari Testesen', 'Pia Testesen'])
    expect(aktiveI(g, iDag)).toEqual(['Ada Testesen', 'Kari Testesen', 'Pia Testesen'])
    for (const m of g.medarbeidere as Medarbeider[]) {
      expect(m.syntetisk).toBe(false)
      expect(m.perioder).toEqual([{ fra: iDag, til: null }])
      expect(m.vaktandel).toEqual({ ordinary: [], temporary: [] })
      // Ingen kvalifikasjon som standard (§8.5): systemet gjetter ikke.
      expect(m.kvalifikasjoner).toEqual([])
    }
    // Den inviterte er ikke aktivt medlem og er ikke med.
    expect(navnI(g)).not.toContain('Ivar Testesen')
  })

  it('tar et nytt aktivt medlem med samme dag, og en invitasjon først når den er tatt imot (K-MED-1)', async () => {
    await opprettMedlem(p.db, konto.nyR, R, { primaer: true })
    expect(aktiveI(await grunnlag(p, konto.adminR, R), iDag)).toContain('Nils Testesen')
    await p.somServer((tx) => tx.query(`update public.medlemskap set status = 'aktiv' where bruker_id = $1 and fagmiljo_id = $2`, [konto.invitertR, R]))
    const ivar = await medarbeiderI(konto.adminR, R, 'Ivar Testesen')
    expect(ivar.perioder).toEqual([{ fra: iDag, til: null }])
    // Lagt til i dag: ingen registrering før i dag (A-MED-04), i dag går.
    expect((await feilFra(() => endre(konto.adminR, R, [{ medarbeider: ivar.id, dato: addDays(iDag, -1), revisjon: null, status: S_ID.vacation }])))?.message).toBe(
      'Ivar Testesen var ikke registrert som medarbeider denne dagen.',
    )
    await endre(konto.adminR, R, [{ medarbeider: ivar.id, dato: iDag, revisjon: null, status: S_ID.vacation }])
    await endre(konto.adminR, R, [{ medarbeider: ivar.id, dato: iDag, revisjon: (await kalender(p, konto.adminR, iDag, iDag, R)).oppforinger.find((o) => o.medarbeider === ivar.id)!.revisjon, status: null }])
    // Medarbeiderne er nøyaktig de aktive medlemmene.
    const { rows } = await p.db.query<{ n: string }>(
      `select concat_ws(' ', p.first_name, p.last_name) as n from public.medlemskap m join public.profiles p on p.id = m.bruker_id
       where m.fagmiljo_id = $1 and m.status = 'aktiv' order by 1`,
      [R],
    )
    expect(aktiveI(await grunnlag(p, konto.adminR, R), iDag)).toEqual(rows.map((r) => r.n))
  })

  it('henter stillingen og stillingskategoriene fra appen, også når de endres, uten noen handling (K-MED-5, B14)', async () => {
    const stillinger = (await p.db.query<{ id: string; navn: string }>('select id, navn from public.stillinger')).rows
    let g = await grunnlag(p, konto.adminR, R)
    expect(g.kategorier.map((k) => k.id).sort()).toEqual(stillinger.map((s) => s.id).sort())
    // Uten stilling vises medarbeideren med tom stilling; planleggeren ser at den mangler.
    expect((await medarbeiderI(konto.adminR, R, 'Kari Testesen')).stilling).toBeNull()
    const lis = stillinger.find((s) => s.navn === 'LIS')!.id
    await p.somServer((tx) => tx.query('update public.profiles set stilling_id = $2 where id = $1', [konto.kollegaR, lis]))
    expect((await medarbeiderI(konto.adminR, R, 'Kari Testesen')).stilling).toBe(lis)
    await p.somServer((tx) =>
      tx.query(`insert into public.stillinger (kategori_id, navn, rekkefolge) select id, 'Testerstilling', 99 from public.stillingskategorier order by rekkefolge limit 1`),
    )
    g = await grunnlag(p, konto.adminR, R)
    expect(g.kategorier.map((k) => k.name)).toContain('Testerstilling')
  })

  it('avslutter perioden samme dag et medlemskap avsluttes, fjerner de fremtidige registreringene og står ellers urørt (K-MED-3)', async () => {
    const kari = await medarbeiderI(konto.adminR, R, 'Kari Testesen')
    await settKvalifikasjoner(konto.adminR, R, kari.id, [S_ID.duty1], kari.revisjon)
    const imorgen = addDays(iDag, 1)
    const omEnUke = addDays(iDag, 7)
    await endre(konto.adminR, R, [iDag, imorgen, omEnUke].map((dato) => ({ medarbeider: kari.id, dato, revisjon: null, status: S_ID.vacation })))
    // En registrering fra en tidligere periode, lagt inn som før medlemskapet.
    const fortid = addDays(iDag, -3)
    await p.somServer(async (tx) => {
      await tx.query(`set local session_replication_role = replica`)
      await tx.query(`update personal.medarbeiderperioder set fra = $2 where medarbeider_id = $1`, [kari.id, addDays(iDag, -10)])
      await tx.query(
        `insert into personal.oppforinger (fagmiljo_id, medarbeider_id, dato, status_id, regelversjon) values ($1, $2, $3, $4, 1)`,
        [R, kari.id, fortid, S_ID.vacation],
      )
    })

    await avsluttMedlemskap(p.db, konto.kollegaR, R)

    const etter = await medarbeiderI(konto.adminR, R, 'Kari Testesen')
    expect(etter.perioder).toEqual([{ fra: addDays(iDag, -10), til: iDag }])
    expect(etter.aktiv_til).toBe(iDag)
    const dager = (await kalender(p, konto.adminR, fortid, omEnUke, R)).oppforinger.filter((o) => o.medarbeider === kari.id).map((o) => o.dato)
    expect(dager).toEqual([fortid, iDag])
    // Kvalifikasjonen gjelder til og med i dag.
    expect(etter.kvalifikasjoner).toEqual([{ status: S_ID.duty1, fra: iDag, til: iDag }])
    // Fjerningen står i kalenderens logg, med den som avsluttet medlemskapet.
    const logg = (await p.db.query<{ dato: string; foer: unknown; etter: unknown }>(
      `select dato::text, foer, etter from personal.endringer where medarbeider_id = $1 and etter is null order by dato`,
      [kari.id],
    )).rows
    expect(logg.map((l) => l.dato)).toEqual([imorgen, omEnUke])
    expect((await p.db.query(`select hva, etter from personal.innstillingslogg where medarbeider_id = $1 and hva = 'medlemskap'`, [kari.id])).rows).toContainEqual({
      hva: 'medlemskap',
      etter: { aktiv: false, til: iDag },
    })
    // Ute av planleggingen etter i dag; i dag kan planleggeren fortsatt rette.
    expect((await feilFra(() => endre(konto.adminR, R, [{ medarbeider: kari.id, dato: imorgen, revisjon: null, status: S_ID.vacation }])))?.message).toBe(
      'Kari Testesen var ikke registrert som medarbeider denne dagen.',
    )
    // Også rett i tabellen, forbi kommandoen.
    const direkte = await feilFra(() =>
      p.somServer((tx) =>
        tx.query(`insert into personal.oppforinger (fagmiljo_id, medarbeider_id, dato, status_id, regelversjon) values ($1, $2, $3, $4, 1)`, [
          R,
          kari.id,
          imorgen,
          S_ID.vacation,
        ]),
      ),
    )
    expect([direkte?.code, direkte?.message]).toEqual(['23514', 'Kari Testesen var ikke registrert som medarbeider denne dagen.'])
    // Tilgangen stopper samme dag.
    expect(await p.feilkode(konto.kollegaR, 'select public.personal_grunnlag($1)', [R])).toBe('42501')
    // Innstillingene kan ikke lenger endres.
    expect((await feilFra(() => settKvalifikasjoner(konto.adminR, R, kari.id, [], etter.revisjon)))?.message).toBe('Kari Testesen er ikke lenger medarbeider.')
    expect(await p.db.query<{ f: string[] }>('select array(select personal.stilling_styrer_vakter($1)) as f', [konto.kollegaR]).then((r) => r.rows[0]!.f)).toEqual([])
  })

  it('gir et nytt medlemskap samme dag den samme perioden, og senere en ny periode uten kvalifikasjonene', async () => {
    await opprettMedlem(p.db, konto.kollegaR, R, { primaer: true })
    let kari = await medarbeiderI(konto.adminR, R, 'Kari Testesen')
    expect(kari.perioder).toEqual([{ fra: addDays(iDag, -10), til: null }])
    // Som om det forrige medlemskapet sluttet for en uke siden.
    await p.somServer(async (tx) => {
      await tx.query(`set local session_replication_role = replica`)
      await tx.query(`update personal.medarbeiderperioder set til = $2 where medarbeider_id = $1`, [kari.id, addDays(iDag, -7)])
    })
    await avsluttMedlemskap(p.db, konto.kollegaR, R)
    await opprettMedlem(p.db, konto.kollegaR, R, { primaer: true })
    kari = await medarbeiderI(konto.adminR, R, 'Kari Testesen')
    expect(kari.perioder).toEqual([
      { fra: addDays(iDag, -10), til: addDays(iDag, -7) },
      { fra: iDag, til: null },
    ])
    // Kvalifikasjonen sluttet med medlemskapet i dag; fra i morgen har hen ingen.
    expect(kari.kvalifikasjoner!.filter((k) => k.til === null || k.til > iDag)).toEqual([])
    // Mellom periodene var hen ikke medarbeider.
    expect((await feilFra(() => endre(konto.adminR, R, [{ medarbeider: kari.id, dato: addDays(iDag, -5), revisjon: null, status: S_ID.vacation }])))?.message).toBe(
      'Kari Testesen var ikke registrert som medarbeider denne dagen.',
    )
    expect(await p.db.query<{ f: string[] }>('select array(select personal.stilling_styrer_vakter($1)) as f', [konto.kollegaR]).then((r) => r.rows[0]!.f)).toEqual([R])
  })

  it('lar perioder ikke endres bakover i tid, overlappe eller gis til syntetiske medarbeidere', async () => {
    const kari = await medarbeiderI(konto.adminR, R, 'Kari Testesen')
    const alma = (await p.db.query<{ id: string }>(`select id from personal.medarbeidere where syntetisk_navn = 'Alma Berg'`)).rows[0]!.id
    const sql = (q: string, v: unknown[]) => kode(() => p.somServer((tx) => tx.query(q, v)))
    expect(await sql('update personal.medarbeiderperioder set fra = fra - 1 where medarbeider_id = $1 and til is null', [kari.id])).toBe('42501')
    expect(await sql('update personal.medarbeiderperioder set til = $2 where medarbeider_id = $1 and til is not null', [kari.id, iDag])).toBe('42501')
    expect(await sql('delete from personal.medarbeiderperioder where medarbeider_id = $1', [kari.id])).toBe('42501')
    expect(await sql('insert into personal.medarbeiderperioder (medarbeider_id, fra) values ($1, $2)', [kari.id, addDays(iDag, 3)])).toBe('23P01')
    expect(await sql('insert into personal.medarbeiderperioder (medarbeider_id, fra) values ($1, $2)', [alma, iDag])).toBe('23514')
  })

  it('følger medlemskapene videre mens funksjonen er av, så periodene er de faktiske når den slås på igjen', async () => {
    const perioderFor = async (bruker: string) =>
      (
        await p.db.query<{ fra: string; til: string | null }>(
          `select p.fra::text, p.til::text from personal.medarbeiderperioder p join personal.medarbeidere m on m.id = p.medarbeider_id
           where m.bruker_id = $1 and m.fagmiljo_id = $2 order by p.fra`,
          [bruker, R],
        )
      ).rows
    const nils = await medarbeiderI(konto.adminR, R, 'Nils Testesen')
    await settKvalifikasjoner(konto.adminR, R, nils.id, [S_ID.duty1], nils.revisjon)
    // R ble tatt i bruk tidligere i dag og står som tilknyttet derfra.
    expect((await p.db.query('select fra::text from personal.tilknyttede_fagmiljoer where fagmiljo_id = $1', [R])).rows).toEqual([{ fra: iDag }])

    await settBryter(R, 'av')
    // Nils slutter mens funksjonen er av: perioden og kvalifikasjonen slutter den dagen.
    await avsluttMedlemskap(p.db, konto.nyR, R)
    expect(await perioderFor(konto.nyR)).toEqual([{ fra: iDag, til: iDag }])
    // Som om han var medarbeider fra for ti dager siden og sluttet for fire dager siden.
    await p.somServer(async (tx) => {
      await tx.query(`set local session_replication_role = replica`)
      await tx.query(`update personal.medarbeiderperioder set fra = $2, til = $3 where medarbeider_id = $1`, [nils.id, addDays(iDag, -10), addDays(iDag, -4)])
      await tx.query(`update personal.kvalifikasjoner set fra = $2, til = $3 where medarbeider_id = $1`, [nils.id, addDays(iDag, -10), addDays(iDag, -4)])
    })
    // Han kommer tilbake i dag, mens funksjonen fortsatt er av: en ny periode, uten kvalifikasjonen.
    await opprettMedlem(p.db, konto.nyR, R, { primaer: true })
    expect(await perioderFor(konto.nyR)).toEqual([
      { fra: addDays(iDag, -10), til: addDays(iDag, -4) },
      { fra: iDag, til: null },
    ])
    // Ivar slutter og kommer ikke tilbake; en ny konto blir medlem mens funksjonen er av.
    await avsluttMedlemskap(p.db, konto.invitertR, R)
    const sen = await opprettBruker(p.db, { brukernavn: 'test.senr', fornavn: 'Siv', etternavn: 'Testesen', rolle: 'user' })
    await opprettMedlem(p.db, sen, R, { primaer: true })

    await settBryter(R, 'på')
    // Påslaget endrer ingenting: periodene er de faktiske.
    expect(await perioderFor(konto.nyR)).toEqual([
      { fra: addDays(iDag, -10), til: addDays(iDag, -4) },
      { fra: iDag, til: null },
    ])
    expect(await perioderFor(konto.invitertR)).toEqual([{ fra: iDag, til: iDag }])
    expect(await perioderFor(sen)).toEqual([{ fra: iDag, til: null }])
    // I gapet var Nils ikke medarbeider: ingen registrering, heller ikke rett i tabellen, og ingen kvalifikasjon.
    for (const dato of [addDays(iDag, -3), addDays(iDag, -1)]) {
      expect((await feilFra(() => endre(konto.adminR, R, [{ medarbeider: nils.id, dato, revisjon: null, status: S_ID.vacation }])))?.message).toBe(
        'Nils Testesen var ikke registrert som medarbeider denne dagen.',
      )
      const direkte = await feilFra(() =>
        p.somServer((tx) =>
          tx.query(`insert into personal.oppforinger (fagmiljo_id, medarbeider_id, dato, status_id, regelversjon) values ($1, $2, $3, $4, 1)`, [R, nils.id, dato, S_ID.vacation]),
        ),
      )
      expect(direkte?.code).toBe('23514')
      expect((await p.db.query<{ k: string[] }>('select personal.kvalifikasjoner_paa($1, $2) as k', [nils.id, dato])).rows[0]!.k).toEqual([])
    }
    // Før og etter gapet går det.
    for (const dato of [addDays(iDag, -5), iDag]) {
      await endre(konto.adminR, R, [{ medarbeider: nils.id, dato, revisjon: null, status: S_ID.vacation }])
    }
    expect((await p.db.query<{ k: string[] }>('select personal.kvalifikasjoner_paa($1, $2) as k', [nils.id, addDays(iDag, -5)])).rows[0]!.k).toEqual([S_ID.duty1])
    expect((await medarbeiderI(konto.adminR, R, 'Nils Testesen')).kvalifikasjoner!.filter((k) => k.til === null || k.til >= iDag)).toEqual([])
  })

  it('følger ingen medlemskap i et fagmiljø der funksjonen aldri har vært i bruk', async () => {
    const Q = await opprettFagmiljo(p.db, { nokkel: 'test-reelt-q', navn: 'Fagmiljø Q', administrator: konto.planR })
    await opprettMedlem(p.db, konto.kollegaR, Q)
    await avsluttMedlemskap(p.db, konto.kollegaR, Q)
    await opprettMedlem(p.db, konto.kollegaR, Q)
    // Godkjent, men aldri slått på: fortsatt ingenting.
    await p.somServer((tx) =>
      tx.query(`insert into public.funksjonsgodkjenninger (funksjon, fagmiljo_id, grunnlag) values ('personal', $1, 'Syntetisk godkjenning i testen')`, [Q]),
    )
    await settBryter(Q, 'av')
    for (const tabell of ['personal.medarbeidere', 'personal.tilknyttede_fagmiljoer']) {
      expect((await p.db.query(`select 1 from ${tabell} where fagmiljo_id = $1`, [Q])).rows, tabell).toEqual([])
    }
    // Tilknytningen står fast.
    expect(await kode(() => p.somServer((tx) => tx.query('delete from personal.tilknyttede_fagmiljoer where fagmiljo_id = $1', [R])))).toBe('42501')
  })

  it('gjør ingen fra andre fagmiljøer til medarbeidere, og holder R skjult for dem (K-TIL-1, K-TIL-3)', async () => {
    for (const person of ['vanligB', 'adminB', 'arkitektB', 'systemarkitekt', 'vanligA'] as const) {
      expect(await p.feilkode(person, 'select public.personal_grunnlag($1)', [R]), person).toMatch(/^(P0002|42501)$/)
    }
    const { rows } = await p.db.query<{ n: number }>(
      `select count(*)::int as n from personal.medarbeidere m where m.fagmiljo_id = $1 and m.bruker_id not in (select bruker_id from public.medlemskap where fagmiljo_id = $1)`,
      [R],
    )
    expect(rows[0]!.n).toBe(0)
  })

  it('gjør ingen innlogget konto til medarbeider i Sandkasse (K-SKJ-9)', async () => {
    await opprettMedlem(p.db, konto.nyR, p.S, { primaer: true })
    const { rows } = await p.db.query('select 1 from personal.medarbeidere where fagmiljo_id = $1 and bruker_id is not null', [p.S])
    expect(rows).toEqual([])
    expect((await grunnlag(p, 'arkitektB')).medarbeidere.every((m) => m.syntetisk)).toBe(true)
  })
})

describe('medarbeiderinnstillingene (K-MED-2, B4)', () => {
  const alma = () => medarbeiderI('arkitektB', p.S, 'Alma Berg')

  it('lar bare vaktplanansvarlig og lokal administrator endre dem, og bare i eget fagmiljø', async () => {
    const a = await alma()
    // systemarkitekt er kollega i Sandkasse.
    expect(await p.feilkode('systemarkitekt', 'select public.personal_sett_kvalifikasjoner($1, $2, $3, $4)', [p.S, a.id, '[]', a.revisjon])).toBe('42501')
    expect(await p.feilkode('systemarkitekt', 'select public.personal_lagre_vaktandel($1, $2, $3, $4)', [p.S, a.id, '{"ordinary":[],"temporary":[]}', a.revisjon])).toBe('42501')
    // Uten funksjonen: som om den ikke fantes.
    for (const person of ['vanligB', 'adminB', 'vanligA', 'adminA'] as const) {
      expect(await p.feilkode(person, 'select public.personal_sett_kvalifikasjoner($1, $2, $3, $4)', [p.S, a.id, '[]', a.revisjon]), person).toMatch(/^(P0002|42501)$/)
    }
    // En medarbeider fra et annet fagmiljø finnes ikke her.
    const pia = await medarbeiderI(konto.adminR, R, 'Pia Testesen')
    expect((await feilFra(() => settKvalifikasjoner('arkitektB', p.S, pia.id, [], pia.revisjon)))?.message).toBe('Ukjent medarbeider.')
    expect(await p.feilkode(konto.adminR, 'select public.personal_sett_kvalifikasjoner($1, $2, $3, $4)', [p.S, a.id, '[]', a.revisjon])).toMatch(/^(P0002|42501)$/)

    await p.kall('arkitektB', 'select public.personal_sett_vaktplanansvarlig($1, $2, true)', [p.S, p.id('systemarkitekt')])
    try {
      const svar = await settKvalifikasjoner('systemarkitekt', p.S, a.id, [S_ID.duty1], a.revisjon)
      expect(svar.revisjon).toBe(a.revisjon + 1)
      expect(await p.kall('systemarkitekt', 'select (public.personal_grunnlag($1)) ->> $2', [p.S, 'rolle'])).toBe('planner')
    } finally {
      await p.kall('arkitektB', 'select public.personal_sett_vaktplanansvarlig($1, $2, false)', [p.S, p.id('systemarkitekt')])
    }
  })

  it('setter kvalifikasjonene fra i dag; en som fjernes, gjelder til og med i går, og tidligere dager står', async () => {
    const a = await alma()
    const for_ = a.kvalifikasjoner!
    const vakt1Før = for_.find((k) => k.status === S_ID.duty1 && k.fra < iDag)
    const svar = await settKvalifikasjoner('arkitektB', p.S, a.id, [S_ID.duty2], a.revisjon)
    const vakt1 = svar.kvalifikasjoner.filter((k) => k.status === S_ID.duty1)
    expect(vakt1.length).toBeGreaterThan(0)
    if (vakt1Før) expect(vakt1).toContainEqual({ status: S_ID.duty1, fra: vakt1Før.fra, til: addDays(iDag, -1) })
    expect(vakt1.every((k) => k.til !== null && k.til < iDag)).toBe(true)
    expect(svar.kvalifikasjoner.filter((k) => k.status === S_ID.duty2 && (k.til === null || k.til >= iDag))).toHaveLength(1)
    const igjen = await settKvalifikasjoner('arkitektB', p.S, a.id, [S_ID.duty1, S_ID.duty2], svar.revisjon)
    expect(igjen.kvalifikasjoner).toContainEqual({ status: S_ID.duty1, fra: iDag, til: null })
    // Det samme en gang til er ingen endring.
    expect((await settKvalifikasjoner('arkitektB', p.S, a.id, [S_ID.duty2, S_ID.duty1], igjen.revisjon)).revisjon).toBe(igjen.revisjon)
    const logg = (await p.db.query(`select foer, etter, aktor from personal.innstillingslogg where medarbeider_id = $1 and hva = 'kvalifikasjoner' order by id`, [a.id])).rows
    expect(logg.at(-1)).toEqual({ foer: [S_ID.duty2], etter: [S_ID.duty1, S_ID.duty2], aktor: p.id('arkitektB') })
  })

  it('avviser en oppgave som ikke krever kvalifikasjon, feil form og en foreldet revisjon', async () => {
    const a = await alma()
    expect((await feilFra(() => settKvalifikasjoner('arkitektB', p.S, a.id, [S_ID.vacation], a.revisjon)))?.message).toBe('Ukjent oppgave.')
    expect((await feilFra(() => settKvalifikasjoner('arkitektB', p.S, a.id, ['finnes-ikke'], a.revisjon)))?.message).toBe('Ukjent oppgave.')
    for (const feil of [{}, 'vakt1', [1], [null]]) {
      expect(await p.feilkode('arkitektB', 'select public.personal_sett_kvalifikasjoner($1, $2, $3, $4)', [p.S, a.id, JSON.stringify(feil), a.revisjon])).toBe('22023')
    }
    expect(await p.feilkode('arkitektB', 'select public.personal_sett_kvalifikasjoner($1, $2, $3, $4)', [p.S, a.id, '[]', a.revisjon - 1])).toBe('PT409')
    expect(await p.feilkode('arkitektB', 'select public.personal_lagre_vaktandel($1, $2, $3, $4)', [p.S, a.id, '{"ordinary":[],"temporary":[]}', a.revisjon + 5])).toBe('PT409')
  })

  it('gir alle rollene vaktandelen, og bare planleggerne kvalifikasjonene', async () => {
    const kollega = (await grunnlag(p, 'systemarkitekt')).medarbeidere as Medarbeider[]
    expect(kollega.every((m) => m.vaktandel && m.kvalifikasjoner === undefined)).toBe(true)
    expect(((await grunnlag(p, 'arkitektB')).medarbeidere as Medarbeider[]).every((m) => Array.isArray(m.kvalifikasjoner))).toBe(true)
  })

  it('lagrer vaktandelen fra i dag, og ingen endring av en tidligere dag, heller ikke rett i tabellen (§6.2)', async () => {
    const a = await alma()
    const plan: DutyShareSchedule = {
      ordinary: [{ from: iDag, percent: 60 }],
      temporary: [{ id: 'va-1', from: addDays(iDag, 10), to: addDays(iDag, 20), percent: 0 }],
    }
    const svar = await lagreVaktandel('arkitektB', p.S, a.id, plan, a.revisjon)
    expect(svar.vaktandel).toEqual(plan)
    expect((await medarbeiderI('systemarkitekt', p.S, 'Alma Berg')).vaktandel).toEqual(plan)
    // Bakover i tid: avvist med domenets melding.
    const bakover = { ...plan, ordinary: [{ from: addDays(iDag, -1), percent: 50 }] }
    expect((await feilFra(() => lagreVaktandel('arkitektB', p.S, a.id, bakover, svar.revisjon)))?.message).toBe(
      'Vaktandelen for tidligere dager kan ikke endres, så tidligere forventet vaktbelastning ikke skrives om. Velg en dato i dag eller senere.',
    )
    // Som om planen ble lagt inn i går: den kan ikke lenger tas bort eller endres for i går.
    await p.somServer(async (tx) => {
      await tx.query(`set local session_replication_role = replica`)
      await tx.query(`update personal.vaktandeler set plan = $2 where medarbeider_id = $1`, [a.id, JSON.stringify({ ordinary: [{ from: addDays(iDag, -1), percent: 60 }], temporary: [] })])
    })
    for (const sql of [
      `update personal.vaktandeler set plan = '{"ordinary": [], "temporary": []}' where medarbeider_id = $1`,
      `delete from personal.vaktandeler where medarbeider_id = $1`,
    ]) {
      expect(await kode(() => p.somServer((tx) => tx.query(sql, [a.id]))), sql).toBe('22023')
    }
    // En ny ordinær vaktandel fra i dag går.
    const naa = await medarbeiderI('arkitektB', p.S, 'Alma Berg')
    const videre = { ordinary: [{ from: addDays(iDag, -1), percent: 60 }, { from: iDag, percent: 80 }], temporary: [] }
    expect((await lagreVaktandel('arkitektB', p.S, a.id, videre, naa.revisjon)).vaktandel).toEqual(videre)
    // Ugyldige verdier stoppes også i tabellen.
    expect(
      await kode(() =>
        p.somServer((tx) => tx.query(`update personal.vaktandeler set plan = $2 where medarbeider_id = $1`, [a.id, JSON.stringify({ ...videre, ordinary: [...videre.ordinary, { from: addDays(iDag, 5), percent: 101 }] })])),
      ),
    ).toBe('23514')
  })

  it('gir de samme feilene som domenet for vaktandelen (paritet)', async () => {
    const d = (n: number) => addDays(iDag, n)
    const kandidater: unknown[] = [
      { ordinary: [], temporary: [] },
      { ordinary: [{ from: d(1), percent: 100 }, { from: d(1), percent: 50 }], temporary: [] },
      { ordinary: [{ from: d(5), percent: 100 }, { from: d(1), percent: 50 }], temporary: [] },
      { ordinary: [{ from: '2026-02-30', percent: 50 }], temporary: [] },
      { ordinary: [{ from: d(1), percent: 50.5 }, { from: d(2), percent: -1 }, { from: d(3), percent: '50' }], temporary: [] },
      { ordinary: [], temporary: [{ id: 'a', from: d(1), to: d(5), percent: 50 }, { id: 'a', from: d(3), to: d(9), percent: 50 }] },
      { ordinary: [], temporary: [{ id: '', from: d(5), to: d(1), percent: 200 }] },
      { ordinary: [], temporary: [{ id: 'x', from: d(1), to: '2026-13-01', percent: 50 }, { id: 'y', from: d(1), to: d(1), percent: 50 }] },
      { ordinary: [{ from: d(0), percent: 0 }], temporary: [{ id: 'b', from: d(9), to: d(9), percent: 100 }, { id: 'c', from: d(2), to: d(8), percent: 30 }] },
    ]
    for (const k of kandidater) {
      const sql = (await p.db.query<{ f: string[] }>('select personal.vaktandelfeil($1) as f', [JSON.stringify(k)])).rows[0]!.f
      expect(sql, JSON.stringify(k)).toEqual(validateDutySchedule(k as DutyShareSchedule))
    }
    for (const feil of [null, [], { ordinary: [] }, { ordinary: [], temporary: [], x: 1 }, { ordinary: [{ from: 1, percent: 1 }], temporary: [] }, { ordinary: [], temporary: [{ from: d(1), to: d(2), percent: 1 }] }]) {
      expect((await p.db.query<{ f: string[] }>('select personal.vaktandelfeil($1) as f', [JSON.stringify(feil)])).rows[0]!.f).toEqual(['Vaktandelen har feil form.'])
    }

    // `changesPast` mot databasen, for en rekke par av tidsplaner rundt i dag.
    const planer: DutyShareSchedule[] = [
      { ordinary: [], temporary: [] },
      { ordinary: [{ from: d(-30), percent: 60 }], temporary: [] },
      { ordinary: [{ from: d(-30), percent: 60 }, { from: d(-10), percent: 60 }], temporary: [] },
      { ordinary: [{ from: d(-30), percent: 60 }, { from: d(0), percent: 80 }], temporary: [] },
      { ordinary: [{ from: d(-30), percent: 60 }], temporary: [{ id: 't', from: d(-5), to: d(5), percent: 20 }] },
      { ordinary: [{ from: d(-30), percent: 60 }], temporary: [{ id: 't', from: d(-5), to: d(-1), percent: 20 }] },
      { ordinary: [{ from: d(-30), percent: 60 }], temporary: [{ id: 't', from: d(-5), to: d(9), percent: 20 }] },
      { ordinary: [{ from: d(1), percent: 0 }], temporary: [{ id: 'u', from: d(2), to: d(4), percent: 100 }] },
      { ordinary: [], temporary: [{ id: 'v', from: d(-5), to: d(5), percent: 100 }] },
    ]
    for (const a of planer) {
      for (const b of planer) {
        const sql = (await p.db.query<{ f: boolean }>('select personal.vaktandel_endrer_fortid($1, $2, $3) as f', [JSON.stringify(a), JSON.stringify(b), iDag])).rows[0]!.f
        expect(sql, `${JSON.stringify(a)} → ${JSON.stringify(b)}`).toBe(changesPast(a, b, iDag))
      }
    }
  })
})

describe('«Vis som» (K-SKJ-7)', () => {
  it('lar den lokale administratoren prøve som kollega og vaktplanansvarlig, håndhevet på serveren', async () => {
    const a = await medarbeiderI('arkitektB', p.S, 'Alma Berg')
    expect(await visSom('arkitektB', p.S, 'reader')).toMatchObject({ rolle: 'reader', reell_rolle: 'localAdmin', meg: null })
    const g = await grunnlag(p, 'arkitektB')
    expect(g.rolle).toBe('reader')
    expect(g.medarbeidere.every((m) => m.kvalifikasjoner === undefined)).toBe(true)
    expect(await p.feilkode('arkitektB', 'select public.personal_sett_kvalifikasjoner($1, $2, $3, $4)', [p.S, a.id, '[]', a.revisjon])).toBe('42501')
    expect(await p.feilkode('arkitektB', 'select public.personal_medlemmer($1)', [p.S])).toBe('42501')
    expect(await p.feilkode('arkitektB', 'select public.personal_historikk($1, $2, $3)', [p.S, iDag, iDag])).toBe('42501')

    await visSom('arkitektB', p.S, 'planner')
    expect((await grunnlag(p, 'arkitektB')).rolle).toBe('planner')
    expect(await p.feilkode('arkitektB', 'select public.personal_sett_fritak($1, $2, $3, true, 1, 1)', [p.S, a.id, iDag])).toBe('42501')
    expect(await p.feilkode('arkitektB', 'select public.personal_lagre_oppsett($1, $2, 1)', [p.S, '{}'])).toBe('42501')
    // Kalenderen gir planleggeren den uten fritaket.
    const oppforinger = (await kalender(p, 'arkitektB', addDays(iDag, -30), addDays(iDag, 30))).oppforinger
    expect(oppforinger.every((o) => !('fritak' in o) && !('fritak_revisjon' in o))).toBe(true)

    expect(await visSom('arkitektB', p.S, null)).toMatchObject({ rolle: 'localAdmin', vis_som: null })
    expect(Array.isArray((await p.kall('arkitektB', 'select public.personal_medlemmer($1)', [p.S])))).toBe(true)
  })

  it('kan aldri gi flere rettigheter enn den virkelige rollen', async () => {
    // systemarkitekt er kollega i Sandkasse.
    for (const rolle of ['planner', 'localAdmin']) {
      expect(await p.feilkode('systemarkitekt', 'select public.personal_vis_som($1, $2, null)', [p.S, rolle]), rolle).toBe('42501')
    }
    expect(await p.feilkode('systemarkitekt', 'select public.personal_vis_som($1, $2, null)', [p.S, 'outsideArchitect'])).toBe('22023')
    // En lavere rolle som står, gir ikke mer når den virkelige rollen faller bort.
    await visSom('arkitektB', p.S, 'planner')
    expect((await grunnlag(p, 'systemarkitekt')).rolle).toBe('reader')
    await visSom('arkitektB', p.S, null)
  })

  it('lar den innloggede handle som én syntetisk medarbeider i testmiljøet', async () => {
    const a = await medarbeiderI('systemarkitekt', p.S, 'Alma Berg')
    expect(await visSom('systemarkitekt', p.S, null, a.id)).toMatchObject({ rolle: 'reader', meg: a.id })
    expect((await grunnlag(p, 'systemarkitekt') as Grunnlag & { meg: string | null }).meg).toBe(a.id)
    // Andres rolle og identitet er urørt.
    expect((await grunnlag(p, 'arkitektB') as Grunnlag & { meg: string | null }).meg).toBeNull()
    // Bare en syntetisk medarbeider i det samme fagmiljøet.
    const pia = await medarbeiderI(konto.adminR, R, 'Pia Testesen')
    expect((await feilFra(() => visSom('systemarkitekt', p.S, null, pia.id)))?.message).toBe('Ukjent medarbeider.')
    await visSom('systemarkitekt', p.S, null, null)
  })

  it('virker aldri utenfor et testmiljø, heller ikke forbi funksjonen', async () => {
    expect(await p.feilkode(konto.adminR, 'select public.personal_vis_som($1, $2, null)', [R, 'reader'])).toBe('P0002')
    expect(await kode(() => p.somServer((tx) => tx.query(`insert into personal.vis_som (bruker_id, fagmiljo_id, rolle) values ($1, $2, 'reader')`, [konto.adminR, R])))).toBe('23514')
    // Selv en rad som er tvunget inn, gir ingen virkning der.
    await p.somServer(async (tx) => {
      await tx.query(`set local session_replication_role = replica`)
      await tx.query(`insert into personal.vis_som (bruker_id, fagmiljo_id, rolle) values ($1, $2, 'reader')`, [konto.adminR, R])
    })
    const g = (await grunnlag(p, konto.adminR, R)) as Grunnlag & { simulering: unknown; meg: string }
    expect(g.rolle).toBe('localAdmin')
    expect(g.simulering).toBeNull()
    expect(g.meg).toBe((await medarbeiderI(konto.adminR, R, 'Ada Testesen')).id)
    await p.somServer((tx) => tx.query('delete from personal.vis_som where fagmiljo_id = $1', [R]))
  })

  it('svarer som om den ikke fantes for dem uten funksjonen, og fjernes når fagmiljøet ikke lenger er testmiljø', async () => {
    for (const person of ['vanligB', 'adminB', 'vanligA'] as const) {
      expect(await p.feilkode(person, 'select public.personal_vis_som($1, $2, null)', [p.S, 'reader']), person).toMatch(/^(P0002|42501)$/)
    }
    const T = await opprettFagmiljo(p.db, { nokkel: 'test-vis-som', navn: 'Testmiljø T', administrator: p.id('arkitektB') })
    await p.kall('systemarkitekt', `select public.sett_testmiljo($1, true, $2)`, [T, GRUNN])
    await settBryter(T, 'utprøving')
    await visSom('arkitektB', T, 'reader')
    expect((await grunnlag(p, 'arkitektB', T)).rolle).toBe('reader')
    await settBryter(T, 'av')
    await p.kall('systemarkitekt', `select public.sett_testmiljo($1, false, $2)`, [T, GRUNN])
    expect((await p.db.query('select 1 from personal.vis_som where fagmiljo_id = $1', [T])).rows).toEqual([])
  })
})

describe('vaktplanansvarlige i medarbeiderne (B3, K-TIL-5)', () => {
  it('gir den lokale administratoren medlemmene å velge blant, og bare den', async () => {
    const medlemmer = await p.kall<{ bruker: string; navn: string; vaktplanansvarlig: boolean }[]>(konto.adminR, 'select public.personal_medlemmer($1)', [R])
    // De aktive medlemmene i R, slik de står etter de foregående testene.
    const aktive = await p.db.query<{ bruker_id: string }>(`select bruker_id from public.medlemskap where fagmiljo_id = $1 and status = 'aktiv'`, [R])
    expect(aktive.rows.length).toBeGreaterThan(1)
    expect(medlemmer.map((m) => m.bruker).sort()).toEqual(aktive.rows.map((r) => r.bruker_id).sort())
    expect(medlemmer.map((m) => m.navn)).toEqual([...medlemmer.map((m) => m.navn)].sort((a, b) => a.localeCompare(b, 'nb')))
    await p.kall(konto.adminR, 'select public.personal_sett_vaktplanansvarlig($1, $2, true)', [R, konto.planR])
    expect((await p.kall<{ bruker: string; vaktplanansvarlig: boolean }[]>(konto.adminR, 'select public.personal_medlemmer($1)', [R])).find((m) => m.bruker === konto.planR)!.vaktplanansvarlig).toBe(true)
    expect((await grunnlag(p, konto.planR, R)).rolle).toBe('planner')
    expect(await p.feilkode(konto.planR, 'select public.personal_medlemmer($1)', [R])).toBe('42501')
    // Planleggeren endrer innstillingene til en kollega i eget fagmiljø.
    const kari = await medarbeiderI(konto.planR, R, 'Kari Testesen')
    expect((await settKvalifikasjoner(konto.planR, R, kari.id, [S_ID.duty2], kari.revisjon)).kvalifikasjoner).toContainEqual({ status: S_ID.duty2, fra: iDag, til: null })
  })
})
