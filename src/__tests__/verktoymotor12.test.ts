/**
 * Regelmodell 12, beregningsmotor 10 og doseplanmotor 10: det felles
 * grunnlaget for komplette forløp (`docs/verktøy-klinisk-leveranseplan-2026-11.md`,
 * strøm G). Godkjent avslutning, vurderingspunkter, tillegg med uendret dose,
 * opptrapping annenhver dag, planutfall (komplett eller delplan) og depot som
 * stoppes. Alle regler og preparater er syntetiske og godkjennes bare i testen.
 */
import { describe, expect, it } from 'vitest'
import { beregnDoseplan, formvalgSomTrengs, KOMPLETT_IKKE_TILGJENGELIG, kliniskDelplan, kliniskDoseplan, mellomtrinntekst, sluttmalMangler, type Doseplanresultat, type Praktiskforlop } from '../verktoy/motor/plan'
import { ALLE_TESTPREPARATER, depotregel, nedtrappingsregel, OMGIVELSE, sp, syntetiskGrunnlag, TESTOKSETIN, trinnvalgUtenNull } from '../verktoy/motor/syntetisk'
import { doseenhet, mangler, startdosenavn, TOMT_SKJEMA, ubesvart } from '../verktoy/doseplan'
import { DELPLAN, KOMPLETT, planTekst, planutfall, planvisning, UENDRET } from '../verktoy/planvisning'
import { VALGTEKSTER, VERKTOY } from '../verktoy/register'
import { beregn } from '../verktoy/regler/beregning'
import { DOMENESETT } from '../verktoy/regler/domenesett'
import { godkjenningsfeil } from '../verktoy/regler/godkjenning'
import { kontrollerRegelsett } from '../verktoy/regler/kontroll'
import { apneValg, gjeldendeBekreftelser, nulltrinnfeil, tilleggsfeil, type Avslutning, type Fase, type Grunnlag, type Regel } from '../verktoy/regler/modell'
import { avSlaget, eierAv, REGELSETT, REGELSETTENE, settFor } from '../verktoy/tilgjengelighet'
import { godkjennITest } from './hjelp/verktoyplan'

const kilde: Grunnlag = { type: 'kilde', henvisninger: [] }
const vurdert: Grunnlag = { type: 'ousfar_vurdering', begrunnelse: 'Syntetisk.', avklaring: null }
const GRUNNLAG = (() => {
  const g = syntetiskGrunnlag(ALLE_TESTPREPARATER, { kontrollert_kl: '2026-11-01T04:20:00Z', kildedato: '2026-10-15' })
  return { ...g, utvalg: { ...g.utvalg, kilde: 'FEST' } }
})()
const TABLETT = { fra: { klasse: 'peroral' as const, legemiddelformer: ['SYN-TAB'] } }

const avslutning = (fra_hoyst: number): Avslutning => ({ type: 'seponering', fra_hoyst_mg: sp(fra_hoyst, 'mg'), grunnlag: vurdert })

/** Seponering av testoksetin, 50 % per trinn, 14 dager per trinn, med godkjent avslutning fra `fra_hoyst` mg og eventuelt laveste dose. */
function medAvslutning(fra_hoyst: number, min?: number, id = 'avslutning'): Regel {
  const r = nedtrappingsregel({ type: 'prosent_av_aktuell', prosent: sp(50, 'prosent') }, min ? { min_mg: sp(min, 'mg') } : undefined, id)
  const fase = r.plan.forlop[0]!.faser[0]!
  if (fase.type === 'nedtrapping') fase.avslutning = avslutning(fra_hoyst)
  r.plan.forlop[0]!.vurderinger = [
    { id: 'symptomer', nar: { type: 'for_hvert_trinn' }, tekst: 'Vurder seponeringssymptomer.', ved_funn: 'Hold dosen.', grunnlag: vurdert },
    { id: 'oppfolging', nar: { type: 'etter_endring', dager: sp(7, 'dager') }, tekst: 'Følg opp en uke etter endringen.', grunnlag: vurdert },
  ]
  return godkjennITest(r, `test-${id}`)
}

const plan = (r: Regel, startdose: number, ekstra: object = {}) => kliniskDoseplan(r, { startdose_mg: startdose, formvalg: TABLETT, ...ekstra }, GRUNNLAG, OMGIVELSE)
/** Det motoren beregner når planen ikke når sluttmålet; klinikere får det aldri ({@link kliniskDelplan}). */
const delplan = (r: Regel, startdose: number, ekstra: object = {}) => kliniskDelplan(r, { startdose_mg: startdose, formvalg: TABLETT, ...ekstra }, GRUNNLAG, OMGIVELSE)
const kort = (p: Doseplanresultat) => (p.status === 'doseplan' ? p.forlop.map((f) => [f.perioder.map((x) => `${x.fra}–${x.til ?? '…'}: ${x.mg}${x.hver ? ` hver ${x.hver}.` : ''}`), f.siste_dosedag]) : p.stoppgrunner)

describe('Godkjent avslutning (regelmodell 12)', () => {
  it('godkjent regelavslutning: trapper ned til regelens dokumenterte laveste dose og seponerer etter siste trinn, når siste dose ikke er over grensen', () => {
    const r = medAvslutning(5, 5)
    expect(nulltrinnfeil(r)).toEqual([])
    expect(godkjenningsfeil(r)).toEqual([])
    const p = plan(r, 20)
    expect(kort(p)).toEqual([[['1–14: 10', '15–28: 5'], 28]])
    const v = planvisning(p, r)!
    expect(v.utfall).toMatchObject({ komplett: true, mangler: [], sluttmal: ['testoksetin seponert fra dag 29'] })
    expect(v.utfall.tekst.startsWith(KOMPLETT)).toBe(true)
    expect(v.rader.filter((x) => x.type === 'periode').at(-1)).toMatchObject({ dager: 'Fra dag 29', celler: [{ dose: 'Seponert' }] })
    expect(v.undertittel).toBeNull()
  })

  it('gjelder ved grensen: nøyaktig grensen avslutter, like under gir en delplan som sier hvorfor', () => {
    expect(kort(plan(medAvslutning(5, 5), 20))).toEqual([[['1–14: 10', '15–28: 5'], 28]])
    const over = medAvslutning(4.99, 5, 'over')
    // Klinikeren får ingen delplan, bare grunnen.
    expect(kort(plan(over, 20))).toEqual(['Komplett plan ikke tilgjengelig: testoksetin: regelens avslutning gjelder bare fra 4,99 mg eller lavere (planen står på 5 mg); praktisk grense: ingen trinn under 5 mg; avslutning vurderes individuelt.'])
    const p = delplan(over, 20)
    expect(kort(p)).toEqual([[['1–14: 10', '15–…: 5'], null]])
    const v = planvisning(p, over)!
    expect(v.utfall.komplett).toBe(false)
    expect(v.utfall.tekst.startsWith(DELPLAN)).toBe(true)
    expect(v.advarsler.join(' ')).toMatch(/avslutning av testoksetin gjelder bare fra 4,99 mg eller lavere, og planen står på 5 mg/)
  })

  it('gir dosen pasienten bruker ett trinn før seponering når ingen reduksjon kan beregnes', () => {
    expect(kort(plan(medAvslutning(5, 5), 5))).toEqual([[['1–14: 5'], 14]])
  })

  it('seponerer aldri fra trinnet før når neste trinn ikke kan gis med preparatene, heller ikke innenfor grensen (FEST-hull)', () => {
    // Uten laveste dose: 20 → 10 → 5 → 2,5 → 1,25, og 0,63 mg kan ikke gis nøyaktig med preparatene.
    const innenfor = medAvslutning(2.5, undefined, 'innenfor')
    const ideell = beregn(innenfor, { startdose_mg: 20 })
    expect(ideell.status === 'modellberegning' && ideell.forlop[0]!.perioder.length).toBeGreaterThan(4)
    // 1,25 mg er under avslutningsgrensen, men en manglende styrke er ikke et faglig grunnlag for siste dose: planen stopper uten seponering.
    const p = plan(innenfor, 20)
    expect(kort(p)).toEqual(['Komplett plan ikke tilgjengelig: testoksetin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt.'])
    expect(planvisning(p, innenfor)).toBeNull()
    const intern = delplan(innenfor, 20)
    expect(kort(intern)).toEqual([[['1–14: 10', '15–28: 5', '29–42: 2.5', '43–…: 1.25'], null]])
    expect(intern.status === 'doseplan' && intern.forlop[0]!.siste_dosedag).toBeNull()
  })

  it('stopper uten seponering når en styrke forsvinner fra FEST, også der planen var komplett med alle styrkene', () => {
    const r = medAvslutning(5, 5, 'styrke')
    // Med alle styrkene: 20 → 10 → 5 mg og seponering etter regelens avslutning.
    expect(kort(plan(r, 20))).toEqual([[['1–14: 10', '15–28: 5'], 28]])
    // Uten 5 mg (bare 20 mg delt i to): 10 mg kan gis, 5 mg kan ikke. Planen seponerer ikke fra 10 mg og gir ingen kopierbar plan.
    const bare20 = syntetiskGrunnlag([{ ...TESTOKSETIN.find((x) => x.id === 'OKS-TAB20')!, deling: '2' }], { kontrollert_kl: '2026-11-01T04:20:00Z', kildedato: '2026-10-15' })
    const g = { ...bare20, utvalg: { ...bare20.utvalg, kilde: 'FEST' } }
    const p = kliniskDoseplan(r, { startdose_mg: 20, formvalg: TABLETT }, g, OMGIVELSE)
    expect(p.status).toBe('stoppet')
    expect(p.status === 'stoppet' && p.stoppgrunner.join(' ')).toMatch(/^Komplett plan ikke tilgjengelig: testoksetin: /)
    expect('forlop' in p).toBe(false)
    expect(planvisning(p, r)).toBeNull()
    const intern = kliniskDelplan(r, { startdose_mg: 20, formvalg: TABLETT }, g, OMGIVELSE)
    expect(intern.status === 'doseplan' && intern.forlop[0]!.siste_dosedag).toBeNull()
    const utenfor = medAvslutning(1, undefined, 'utenfor')
    expect(kort(plan(utenfor, 20)).join(' ')).toMatch(/^Komplett plan ikke tilgjengelig: testoksetin: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere \(planen står på 1,25 mg\)\.$/)
    const q = delplan(utenfor, 20)
    expect(kort(q)).toEqual([[['1–14: 10', '15–28: 5', '29–42: 2.5', '43–…: 1.25'], null]])
    expect(planvisning(q, utenfor)!.utfall).toMatchObject({ komplett: false })
  })

  it('avslutter ikke når forskriveren kan velge dosen for neste trinn: planen venter på valget', () => {
    const r = trinnvalgUtenNull()
    const fase = r.plan.forlop[0]!.faser[0] as Extract<Fase, { type: 'nedtrapping' }>
    fase.avslutning = avslutning(20)
    delete fase.horisont
    const g = godkjennITest(r, 'test-valg-avslutning')
    const p = beregnDoseplan(g, { startdose_mg: 20, formvalg: TABLETT }, GRUNNLAG, OMGIVELSE)
    expect(p.trinnvalg?.length).toBeGreaterThan(0)
    expect(p.status === 'doseplan' && p.forlop[0]!.siste_dosedag).toBeNull()
  })

  it('sier hvorfor avslutningen ikke gjelder, også når en dose kan velges for neste trinn', () => {
    const r = trinnvalgUtenNull()
    const fase = r.plan.forlop[0]!.faser[0] as Extract<Fase, { type: 'nedtrapping' }>
    fase.avslutning = avslutning(1)
    delete fase.horisont
    const g = godkjennITest(r, 'test-valg-over-avslutning')
    const p = beregnDoseplan(g, { startdose_mg: 20, formvalg: TABLETT }, GRUNNLAG, OMGIVELSE)
    expect(p.trinnvalg?.length).toBeGreaterThan(0)
    if (p.status !== 'doseplan') throw new Error(p.stoppgrunner.join(' '))
    const f = p.forlop[0]!
    const sist = f.perioder.at(-1)!.mg
    expect(sist).toBeGreaterThan(1)
    expect(f.avslutning).toMatch(new RegExp(`avslutning av testoksetin gjelder bare fra 1 mg eller lavere, og planen står på ${String(sist).replace('.', ',')} mg`))
    expect(planvisning(p, g)!.utfall.mangler.join(' ')).toMatch(/regelens avslutning gjelder bare fra 1 mg eller lavere/)
  })

  it('godtar en ren seponering bare med en uttrykkelig avslutning, også som siste seponeringsfase', () => {
    const r = medAvslutning(5, 5)
    const uten = structuredClone(r)
    ;(uten.plan.forlop[0]!.faser[0] as Extract<Fase, { type: 'nedtrapping' }>).avslutning = undefined
    expect(nulltrinnfeil(uten).join(' ')).toMatch(/ingen avslutning er godkjent/)
    const hold = structuredClone(r)
    hold.plan.forlop[0]!.faser = [{ type: 'hold', dose: { type: 'aktuell' }, varighet: { type: 'dager', dager: sp(14, 'dager') } }, { type: 'seponer', avslutning: avslutning(5) }]
    expect(nulltrinnfeil(hold)).toEqual([])
    const godkjent = godkjennITest(hold, 'test-hold-seponer')
    expect(kort(plan(godkjent, 5))).toEqual([[['1–14: 5'], 14]])
    // Over grensen kan seponeringsfasen ikke seponere.
    expect(kort(plan(godkjent, 10)).join(' ')).toMatch(/gjelder bare fra 5 mg eller lavere, og planen står på 10 mg/)
    const uteni = structuredClone(hold)
    uteni.plan.forlop[0]!.faser[1] = { type: 'seponer' }
    expect(nulltrinnfeil(uteni).join(' ')).toMatch(/seponerer; ingen avslutning er godkjent/)
  })

  it('krever at avslutningen og vurderingspunktene er faglig avklart før godkjenning', () => {
    const r = nedtrappingsregel({ type: 'prosent_av_aktuell', prosent: sp(50, 'prosent') })
    ;(r.plan.forlop[0]!.faser[0] as Extract<Fase, { type: 'nedtrapping' }>).avslutning = avslutning(5)
    r.plan.forlop[0]!.vurderinger = [{ id: 'v', nar: { type: 'for_hvert_trinn' }, tekst: 'Vurder.', grunnlag: vurdert }]
    expect(apneValg(r)).toEqual(expect.arrayContaining(['fra.faser[0].avslutning (åpent forslag)', 'fra.vurderinger.v (åpent forslag)']))
  })
})

describe('Vurderingspunktene', () => {
  it('står før hver doseendring og et antall dager etter hver endring, også seponeringen', () => {
    const r = medAvslutning(5, 5)
    const v = planvisning(plan(r, 20, { startdato: '2026-11-02' }), r, '2026-11-02')!
    const vurderinger = v.rader.filter((x) => x.type === 'vurdering').map((x) => [x.dager, x.datoer, x.type === 'vurdering' && x.tekst])
    expect(vurderinger).toEqual([
      ['Dag 8', '09.11.2026', 'Følg opp en uke etter endringen.'],
      ['Dag 15', '16.11.2026', 'Før endringen: Vurder seponeringssymptomer.'],
      ['Dag 22', '23.11.2026', 'Følg opp en uke etter endringen.'],
      ['Dag 29', '30.11.2026', 'Før endringen: Vurder seponeringssymptomer.'],
      ['Dag 36', '07.12.2026', 'Følg opp en uke etter endringen.'],
    ])
    // Vurderingen før en endring står foran perioden som starter samme dag.
    const i = v.rader.findIndex((x) => x.type === 'vurdering' && x.dager === 'Dag 15')
    expect(v.rader[i + 1]).toMatchObject({ type: 'periode', dager: 'Dag 15–28' })
    expect(v.vurderinger).toEqual([
      'testoksetin, før hver doseendring (dag 15, 29): Vurder seponeringssymptomer. Ved funn: Hold dosen.',
      'testoksetin, 7 dager etter hver doseendring (dag 8, 22, 36): Følg opp en uke etter endringen.',
    ])
    const tekst = planTekst(v, 'Trappe ned')
    expect(tekst.split('\n')[2]).toBe(v.utfall.tekst)
    expect(tekst).toMatch(/\nVurderingspunkter:\n- testoksetin, før hver doseendring/)
    expect(tekst).toMatch(/Dag 15 \(16\.11\.2026\): Vurdering \(testoksetin\): Før endringen: Vurder seponeringssymptomer\./)
  })

  it('kan stå bare et antall dager etter siste dose, når planen faktisk seponerer', () => {
    const regel = (min: number) => {
      const r = medAvslutning(5, min, `etter-seponering-${min}`)
      r.plan.forlop[0]!.vurderinger = [{ id: 'etter', nar: { type: 'etter_seponering', dager: sp(14, 'dager') }, tekst: 'Følg opp seponeringssymptomer og tilbakefall.', grunnlag: vurdert }]
      return godkjennITest(r, `test-etter-seponering-${min}`)
    }
    const g = regel(5)
    const v = planvisning(plan(g, 20, { startdato: '2026-11-02' }), g, '2026-11-02')!
    // Siste dose er dag 28, så punktet står på dag 42, og bare der.
    expect(v.rader.filter((x) => x.type === 'vurdering').map((x) => x.dager)).toEqual(['Dag 42'])
    expect(v.vurderinger).toEqual(['testoksetin, 14 dager etter siste dose (dag 42): Følg opp seponeringssymptomer og tilbakefall.'])
    // Flere punkter etter seponering i samme forløp, for eksempel 7, 14 og 28 dager, står hver på sin dag.
    const flere = medAvslutning(5, 5, 'etter-seponering-flere')
    flere.plan.forlop[0]!.vurderinger = [7, 14, 28].map((dager) => ({ id: `etter-${dager}`, nar: { type: 'etter_seponering' as const, dager: sp(dager, 'dager') }, tekst: `Oppfølging etter ${dager} dager.`, grunnlag: vurdert }))
    const fg = godkjennITest(flere, 'test-etter-seponering-flere')
    const fv = planvisning(plan(fg, 20), fg)!
    expect(fv.rader.filter((x) => x.type === 'vurdering').map((x) => x.dager)).toEqual(['Dag 35', 'Dag 42', 'Dag 56'])
    expect(fv.vurderinger).toHaveLength(3)
    // En plan som stopper over grensen (laveste dose 10 mg), seponerer ikke; punktet står da uten dag.
    const h = regel(10)
    expect(kort(plan(h, 80)).join(' ')).toMatch(/^Komplett plan ikke tilgjengelig: /)
    const over = planvisning(delplan(h, 80), h)!
    expect(over.utfall.komplett).toBe(false)
    expect(over.rader.some((x) => x.type === 'vurdering')).toBe(false)
    expect(over.vurderinger).toEqual(['testoksetin, 14 dager etter siste dose: Følg opp seponeringssymptomer og tilbakefall.'])
  })
})

describe('Minste trinn ved lav dose (regelmodell 12)', () => {
  const DRAPER = { fra: { klasse: 'peroral' as const, legemiddelformer: ['SYN-DRAP'] } }
  /** 25 % per trinn (valgområde 5–50 %, over 25 % krever begrunnelse), dråper på 1 mg, minste trinn fra `fra` mg på høyst 50 % og avslutning fra 1 mg. */
  const regel = (fra = 3) => {
    const r = trinnvalgUtenNull()
    const fase = r.plan.forlop[0]!.faser[0] as Extract<Fase, { type: 'nedtrapping' }>
    if (fase.strategi.type !== 'prosent_av_aktuell') throw new Error()
    fase.strategi.minste_trinn = { fra_mg: sp(fra, 'mg'), maks_prosent: sp(50, 'prosent') }
    fase.avslutning = avslutning(1)
    delete fase.horisont
    r.plan.forlop[0]!.dosevalg = { min_mg: sp(1, 'mg') }
    return godkjennITest(r, `test-minste-trinn-${fra}`)
  }
  const med = (r: Regel, valg: [number, number, number][] = []) =>
    kliniskDoseplan(r, { startdose_mg: 4, formvalg: DRAPER, trinnvalg: valg.map(([trinn, fra_mg, mg]) => ({ forlop: 'fra', trinn, fra_mg, mg })) }, GRUNNLAG, OMGIVELSE)
  const tilbudt = (p: Doseplanresultat) => p.trinnvalg?.map((t) => [t.trinn, t.fra_mg, t.doser.map((d) => d.mg), t.minste_trinn?.maks_prosent ?? null])

  it('tilbyr ved og under grensen bare den nærmeste lavere dosen, når ingen dose innenfor valgområdet kan gis, og når så avslutningen', () => {
    const r = regel()
    // 4 → 3 mg kan gis; 2,25 mg kan ikke, og ingen dose fra 2,25 til 2,85 mg kan gis med dråper, så bare 2 mg (−33,33 %) tilbys.
    const a = med(r)
    expect(a.status === 'stoppet' && a.stoppgrunner.join(' ')).toMatch(/^Komplett plan ikke tilgjengelig: /)
    expect(tilbudt(a)).toEqual([[2, 3, [2], 50]])
    const b = med(r, [[2, 3, 2]])
    expect(tilbudt(b)).toEqual([[3, 2, [1], 50]])
    // Også med valgte doser kreves en komplett plan: 2 mg er over avslutningen, så klinikeren får ingen doser, bare grunnen og neste valg.
    expect(b.status).toBe('stoppet')
    expect(b.status === 'stoppet' && b.stoppgrunner).toEqual([expect.stringMatching(/^Komplett plan ikke tilgjengelig: testoksetin: .*planen står på 2 mg/)])
    expect('forlop' in b).toBe(false)
    expect(planvisning(b, r)).toBeNull()
    const intern = kliniskDelplan(r, { startdose_mg: 4, formvalg: DRAPER, trinnvalg: [{ forlop: 'fra', trinn: 2, fra_mg: 3, mg: 2 }] }, GRUNNLAG, OMGIVELSE)
    expect(kort(intern)).toEqual([[['1–14: 3', '15–…: 2'], null]])
    // Fra 1 mg kan ingen lavere dose over 0 gis, så avslutningen seponerer: planen er komplett.
    const c = med(r, [[2, 3, 2], [3, 2, 1]])
    expect(kort(c)).toEqual([[['1–14: 3', '15–28: 2', '29–42: 1'], 42]])
    if (c.status !== 'doseplan') throw new Error(c.stoppgrunner.join(' '))
    expect(planvisning(c, r)!.utfall.komplett).toBe(true)
    expect(c.kontroller.map((k) => k.krav).join(' ')).toMatch(/er et minste trinn valgt av forskriveren .* høyst 50 %/)
  })

  it('gjelder ikke over grensen, og godtar ikke et annet eller større trinn', () => {
    // Med grensen 2 mg tilbys ingenting fra 3 mg, så planen stopper over avslutningen og er ikke komplett.
    const over = med(regel(2))
    expect(over.trinnvalg).toBeUndefined()
    expect(over.status === 'stoppet' && over.stoppgrunner.join(' ')).toMatch(/^Komplett plan ikke tilgjengelig: .*avslutning gjelder bare fra 1 mg eller lavere \(planen står på 3 mg\)/)
    const valgtOver = med(regel(2), [[2, 3, 2]])
    expect(valgtOver.status === 'stoppet' && valgtOver.stoppgrunner.join(' ')).toMatch(/utenfor valgområdet 5–25 %/)
    // 1 mg fra 3 mg er en reduksjon på 66,67 %, over det minste trinnet.
    const stort = med(regel(), [[2, 3, 1]])
    expect(stort.status === 'stoppet' && stort.stoppgrunner.join(' ')).toMatch(/66,67 % fra 3 mg, utenfor valgområdet/)
  })
})

/** Tillegg av testazapin til testoksetin, som fortsetter uendret: 15 mg annenhver dag i 14 dager, 15 mg daglig i 14 dager og så måldosen. */
function tillegg(): Regel {
  const r = nedtrappingsregel({ type: 'prosent_av_aktuell', prosent: sp(50, 'prosent') }, undefined, 'tillegg')
  return {
    ...r,
    til: { type: 'virkestoff', nokkel: 'testazapin' },
    plan: {
      form: 'tillegg',
      forlop: [
        { id: 'fra', virkestoff: { type: 'virkestoff', nokkel: 'testoksetin' }, administrasjon: 'peroral', utgangsdose: 'startdose', start: { type: 'dag', dag: 1 }, faser: [{ type: 'uendret', grunnlag: kilde }] },
        {
          id: 'til',
          virkestoff: { type: 'virkestoff', nokkel: 'testazapin' },
          administrasjon: 'peroral',
          utgangsdose: null,
          start: { type: 'dag', dag: 1 },
          faser: [
            { type: 'opptrapping', trinn: [{ mg: sp(15, 'mg'), dager: sp(14, 'dager'), hver: sp(2, 'dager') }, { mg: sp(15, 'mg'), dager: sp(14, 'dager') }] },
            { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
          ],
          vurderinger: [{ id: 'kontroll', nar: { type: 'dag', dag: sp(10, 'dag') }, tekst: 'Syntetisk kontroll.', grunnlag: kilde }],
        },
      ],
    },
  }
}

describe('Tillegg (K4)', () => {
  it('beholder legemidlet pasienten bruker uendret uten preparater, og trapper opp tillegget annenhver dag', () => {
    const r = godkjennITest(tillegg(), 'test-tillegg')
    expect(tilleggsfeil(r)).toEqual([])
    expect(godkjenningsfeil(r)).toEqual([])
    const inndata = { startdose_mg: 20, maldose_mg: 30 }
    // Det eksisterende legemidlet brukes ikke, så formen må ikke velges for det.
    expect(Object.keys(formvalgSomTrengs(r, inndata, GRUNNLAG, OMGIVELSE.idag))).not.toContain('fra')
    const p = kliniskDoseplan(r, inndata, GRUNNLAG, OMGIVELSE)
    expect(kort(p)).toEqual([[[], null], [['1–14: 15 hver 2.', '15–28: 15', '29–…: 30'], null]])
    const v = planvisning(p, r)!
    expect(v.utfall).toMatchObject({ komplett: true, sluttmal: ['testoksetin fortsetter uendret på 20 mg', 'testazapin fortsetter på 30 mg fra dag 29'] })
    const perioder = v.rader.filter((x) => x.type === 'periode')
    expect(perioder.map((x) => x.type === 'periode' && [x.dager, x.celler.map((c) => c?.dose)])).toEqual([
      ['Dag 1–14', ['20 mg', '15 mg annenhver dag']],
      ['Dag 15–28', ['20 mg', '15 mg']],
      ['Fra dag 29', ['20 mg', '30 mg']],
    ])
    expect(perioder[0]!.type === 'periode' && perioder[0]!.celler[0]!.elementer).toEqual([UENDRET.bekreftet])
    expect(v.rader.find((x) => x.type === 'vurdering')).toMatchObject({ dager: 'Dag 10', kolonne: 1 })
  })

  it('viser legemidlet som fortsetter uendret fra første dag, også når tillegget starter senere', () => {
    const r = tillegg()
    r.plan.forlop[1]!.start = { type: 'dag', dag: 8 }
    const g = godkjennITest(r, 'test-tillegg-senere')
    const v = planvisning(kliniskDoseplan(g, { startdose_mg: 20, maldose_mg: 30 }, GRUNNLAG, OMGIVELSE), g)!
    expect(v.rader.filter((x) => x.type === 'periode').map((x) => x.type === 'periode' && [x.dager, x.celler.map((c) => c?.dose ?? null)])).toEqual([
      ['Dag 1–7', ['20 mg', null]],
      ['Dag 8–21', ['20 mg', '15 mg annenhver dag']],
      ['Dag 22–35', ['20 mg', '15 mg']],
      ['Fra dag 36', ['20 mg', '30 mg']],
    ])
  })

  it('viser den uendrede dosen med enhet, mmol og tabletter, og sier om den er kontrollert mot regelens doser eller bare bekreftet', () => {
    const med = (verdier?: number[]) => {
      const r = tillegg()
      const fase = r.plan.forlop[0]!.faser[0]!
      if (fase.type !== 'uendret') throw new Error()
      fase.visning = { enhet: 'mg Li⁺', tablett: { navn: 'Syntetisk 42 mg depottablett', mg: 42, mmol: 6 } }
      if (verdier) r.inndata = [...r.inndata, { navn: 'startdose', verdier, art: 'bindende_krav', grunnlag: kilde }]
      const g = godkjennITest(r, `test-tillegg-visning-${verdier ? 'krav' : 'uten'}`)
      return { g, v: planvisning(kliniskDoseplan(g, { startdose_mg: 168, maldose_mg: 30 }, GRUNNLAG, OMGIVELSE), g)! }
    }
    const kontrollert = med([126, 168, 210])
    const celle = (x: typeof kontrollert) => {
      const rad = x.v.rader.find((y) => y.type === 'periode')!
      return rad.type === 'periode' ? rad.celler[0] : null
    }
    expect(celle(kontrollert)).toEqual({ dose: '168 mg Li⁺ (24 mmol)', elementer: [`4 tabletter Syntetisk 42 mg depottablett; ${UENDRET.kontrollert}`] })
    expect(kontrollert.v.utfall.sluttmal[0]).toBe('testoksetin fortsetter uendret på 168 mg Li⁺ (24 mmol)')
    expect(planTekst(kontrollert.v, 'Kombinere')).toContain('168 mg Li⁺ (24 mmol) = 4 tabletter Syntetisk 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke')
    // Uten et krav til startdosen er dosen bare bekreftet av forskriveren, og planen sier det.
    expect(celle(med())).toEqual({ dose: '168 mg Li⁺ (24 mmol)', elementer: [`4 tabletter Syntetisk 42 mg depottablett; ${UENDRET.bekreftet}`] })
    // Kontrollen krever en tablett med navn og positive verdier.
    const feil = tillegg()
    const fase = feil.plan.forlop[0]!.faser[0]!
    if (fase.type !== 'uendret') throw new Error()
    fase.visning = { enhet: ' ', tablett: { navn: '', mg: 0, mmol: -1 } }
    const sett = DOMENESETT[0]!.sett
    expect(kontrollerRegelsett({ ...sett, regler: [godkjennITest(feil, 'test-tillegg-visning-feil')] }).join(' ')).toMatch(/tom enhet.*tablett uten navn.*0 per tablett.*-1 mmol per tablett/)
  })

  it('holder retningen: det eksisterende legemidlet kan ikke trappes ned eller seponeres, og tillegget må ende på en dose som fortsetter', () => {
    const r = tillegg()
    const seponerer = structuredClone(r)
    seponerer.plan.forlop[0]!.faser = [{ type: 'seponer' }]
    expect(tilleggsfeil(seponerer).join(' ')).toMatch(/kan bare fortsette/)
    expect(godkjenningsfeil(godkjennITest(seponerer, 'test-feil')).join(' ')).toMatch(/Regelen er ugyldig/)
    const utenTil = { ...structuredClone(r), til: null }
    expect(tilleggsfeil(utenTil).join(' ')).toMatch(/må ha et legemiddel som legges til/)
    const slutter = structuredClone(r)
    slutter.plan.forlop[1]!.faser = [{ type: 'opptrapping', trinn: [{ mg: sp(15, 'mg'), dager: sp(14, 'dager') }] }]
    expect(tilleggsfeil(slutter).join(' ')).toMatch(/må slutte med en dose som fortsetter/)
    // Holdes eller vedlikeholdes legemidlet, er det bare på dosen pasienten bruker.
    for (const fase of [{ type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } }, { type: 'hold', dose: { type: 'fast', mg: sp(10, 'mg') }, varighet: { type: 'dager', dager: sp(7, 'dager') } }] as Fase[]) {
      const endrer = structuredClone(r)
      endrer.plan.forlop[0]!.faser = [fase, { type: 'uendret', grunnlag: kilde }]
      expect(tilleggsfeil(endrer).join(' '), fase.type).toMatch(/kan bare holdes eller vedlikeholdes på dosen pasienten bruker/)
    }
    const holder = structuredClone(r)
    holder.plan.forlop[0]!.faser = [{ type: 'vedlikehold', dose: { type: 'aktuell' } }]
    expect(tilleggsfeil(holder)).toEqual([])
    // Et bytte er ikke et tillegg.
    expect(tilleggsfeil({ ...r, plan: { ...r.plan, form: 'kryssnedtrapping' } })).toEqual([])
  })

  it('tilbys bare i verktøyet for tillegg, aldri i bytteverktøyene, og omvendt', () => {
    const r = tillegg()
    const [seponering, bytteAd, , kombinere] = VERKTOY
    expect(kombinere).toMatchObject({ id: 'kombinere-stemningsstabiliserende', type: 'tillegg', tabell: 'CombiningMoodstabilizers' })
    expect([seponering, bytteAd, kombinere].map((v) => avSlaget(v!, r))).toEqual([false, false, true])
    const bytte = { ...r, plan: { ...r.plan, form: 'kryssnedtrapping' as const } }
    expect([seponering, bytteAd, kombinere].map((v) => avSlaget(v!, bytte))).toEqual([false, true, false])
    expect(VALGTEKSTER.tillegg).toMatchObject({ gruppe: 'Kombinasjonen', fra: 'Eksisterende legemiddel', til: 'Legemiddel som legges til' })
  })

  it('finner settet som eier regelen, også for en kopi av regelen', () => {
    for (const sett of REGELSETTENE)
      for (const r of sett.regler) {
        expect(eierAv(r)).toBe(sett)
        expect(eierAv(structuredClone(r))).toBe(sett)
        expect(settFor(structuredClone(r))).toBe(sett)
      }
    expect(eierAv({ id: 'finnes-ikke' })).toBeUndefined()
    expect(settFor({ ...REGELSETTENE[0]!.regler[0]!, id: 'finnes-ikke' })).toBe(REGELSETT)
  })

  it('har faste plasser for leveransenes regelsett, som verktøyene leser', () => {
    expect(DOMENESETT.map((d) => d.sett.id)).toEqual(['ousfar-verktoy-antidepressivbytter', 'ousfar-verktoy-antipsykotikabytter', 'ousfar-verktoy-tillegg'])
    for (const d of DOMENESETT) expect(REGELSETTENE).toContain(d.sett)
  })
})

describe('Depot som stoppes (K3)', () => {
  it('viser at depotet som stoppes ikke får flere injeksjoner, og ber ikke om form for det', () => {
    const r = depotregel()
    r.plan.forlop[0] = { ...r.plan.forlop[0]!, administrasjon: 'depotinjeksjon', preparater: ['Testdepot Tremånedlig'] }
    const g = godkjennITest(r, 'test-depot-depot')
    expect(Object.keys(formvalgSomTrengs(g, { startdose_mg: 6 }, GRUNNLAG, OMGIVELSE.idag))).not.toContain('fra')
    const v = planvisning(kliniskDoseplan(g, { startdose_mg: 6 }, GRUNNLAG, OMGIVELSE), g)!
    expect(v.rader[0]).toMatchObject({ type: 'periode', dager: 'Fra dag 1', celler: [{ dose: 'Seponert', elementer: ['ingen flere injeksjoner'] }, null] })
    expect(v.utfall).toMatchObject({ komplett: true, sluttmal: ['testperidon seponert fra dag 1', 'testperidon vedlikehold 100 mg hver måned fra 1 måned etter dag 8'] })
  })
})

describe('Startdosen for et depot (K3)', () => {
  it('spør etter dosen per injeksjon når legemidlet pasienten bruker, er et depot, ellers etter døgndosen', () => {
    const peroral = nedtrappingsregel({ type: 'prosent_av_aktuell', prosent: sp(50, 'prosent') })
    expect(startdosenavn(peroral)).toBe('Aktuell døgndose')
    expect(startdosenavn(undefined)).toBe('Aktuell døgndose')
    const depot = structuredClone(peroral)
    depot.plan.forlop[0]!.administrasjon = 'depotinjeksjon'
    expect(startdosenavn(depot)).toBe('Aktuell dose (mg per injeksjon)')
    expect(mangler(depot, TOMT_SKJEMA)).toContain('Aktuell dose (mg per injeksjon) må fylles inn som et tall større enn 0.')
    expect(mangler(peroral, TOMT_SKJEMA)).toContain('Aktuell døgndose må fylles inn som et tall større enn 0.')
  })

  it('bruker regelens egen enhet for dosen når den har en', () => {
    const depot = nedtrappingsregel({ type: 'prosent_av_aktuell', prosent: sp(50, 'prosent') })
    depot.plan.forlop[0]!.administrasjon = 'depotinjeksjon'
    depot.inndata = [{ navn: 'startdose', omrade: [25, 50], enhet: 'mg per injeksjon hver 2. uke', art: 'bindende_krav', grunnlag: kilde }]
    expect(doseenhet(depot, 'startdose')).toBe('mg per injeksjon hver 2. uke')
    expect(startdosenavn(depot)).toBe('Aktuell dose (mg per injeksjon hver 2. uke)')
    expect(doseenhet(depot, 'maldose')).toBeUndefined()
  })
})

describe('Valg av dose per trinn i prosent av startdosen (K3)', () => {
  const nedtrapping = (prosent: number): Fase => ({ type: 'nedtrapping', strategi: { type: 'prosent_av_startdose', prosent: sp(prosent, 'prosent') }, trinnlengde: sp(14, 'dager', 'veiledende_preferanse'), trinnvalg: vurdert })
  /** Kryssnedtrapping fra testoksetin til testazapin: testoksetin trappes ned til 0 med `prosent` % av startdosen per 14 dager, og forskriveren kan velge dosen når et trinn ikke kan gis. */
  function tempo(prosent = 30, endre?: (f: Extract<Fase, { type: 'nedtrapping' }>) => void): Regel {
    const t = tillegg()
    const fase = nedtrapping(prosent) as Extract<Fase, { type: 'nedtrapping' }>
    endre?.(fase)
    const r: Regel = { ...t, plan: { form: 'kryssnedtrapping', forlop: [{ ...t.plan.forlop[0]!, faser: [fase] }, t.plan.forlop[1]!] } }
    return godkjennITest(r, `test-tempo-${prosent}`)
  }
  const grunner = (p: Doseplanresultat) => (p.status === 'stoppet' ? p.stoppgrunner.join(' ') : '')
  const valg = (...trinn: [number, number, number][]) => ({ trinnvalg: trinn.map(([t, fra_mg, mg]) => ({ forlop: 'fra', trinn: t, fra_mg, mg })) })
  const kryss = (r: Regel, startdose: number, ekstra: object = {}) => kliniskDoseplan(r, { startdose_mg: startdose, maldose_mg: 30, formvalg: TABLETT, ...ekstra }, GRUNNLAG, OMGIVELSE)
  const fra = (p: Doseplanresultat) => (p.status === 'doseplan' ? kort(p)[0] : p.stoppgrunner)

  it('tilbyr de nærmeste dosene, med et lengre trinn for en større reduksjon, og regner neste trinn fra den valgte dosen', () => {
    const r = tempo()
    expect(godkjenningsfeil(r)).toEqual([])
    // 15 mg − 4,5 mg = 10,5 mg kan ikke gis; 10 mg er 5 mg reduksjon og varer 14 × 5 / 4,5 → 16 dager, 11,25 mg varer 14 dager.
    const forste = kryss(r, 15)
    expect(forste.status).toBe('stoppet')
    expect(forste.trinnvalg).toMatchObject([{ trinn: 1, fra_mg: 15, beregnet_mg: 10.5, tempo: { steg_mg: 4.5, prosent: 30, dager: 14 }, doser: [{ mg: 10, dager: 16 }, { mg: 11.25, dager: 14 }] }])
    expect(forste.status === 'stoppet' && forste.stoppgrunner.join(' ')).toMatch(/nærmeste dosene som kan gis: 10 mg \(−33,33 %, 16 dager\) eller 11,25 mg \(−25 %, 14 dager\)\. Trinnet varer da minst 14 dager/)
    // Etter 10 mg er neste beregnede 5,5 mg; etter 5 mg er det 0,5 mg, der bare 1,25 mg over kan velges; etter 1,25 mg seponeres legemidlet.
    expect(kryss(r, 15, valg([1, 15, 10])).trinnvalg).toMatchObject([{ trinn: 2, fra_mg: 10, doser: [{ mg: 5, dager: 16 }, { mg: 6.25, dager: 14 }] }])
    expect(kryss(r, 15, valg([1, 15, 10], [2, 10, 5])).trinnvalg).toMatchObject([{ trinn: 3, fra_mg: 5, doser: [{ mg: 1.25, dager: 14 }] }])
    const ferdig = kryss(r, 15, valg([1, 15, 10], [2, 10, 5], [3, 5, 1.25]))
    expect(fra(ferdig)).toEqual([['1–16: 10', '17–32: 5', '33–46: 1.25'], 46])
    expect(planvisning(ferdig, r)!.utfall.komplett).toBe(true)
  })

  it('krever en komplett plan også med valgte doser', () => {
    const r = tempo()
    // Etter 10 mg kan 5,5 mg ikke gis: klinikeren får ingen doser for trinn 1, bare grunnen og valget for trinn 2.
    const p = kryss(r, 15, valg([1, 15, 10]))
    expect(p.status).toBe('stoppet')
    expect('forlop' in p).toBe(false)
    expect(planvisning(p, r)).toBeNull()
    expect(p.trinnvalg?.map((t) => [t.trinn, t.fra_mg])).toEqual([[2, 10]])
    // Det samme når regelen ikke er klinisk godkjent: da tilbys heller ikke et valg.
    const utkast = { ...r, godkjenning: { ...r.godkjenning, status: 'utkast' as const } }
    const q = kryss(utkast, 15, valg([1, 15, 10]))
    expect(q.status).toBe('stoppet')
    expect(q.trinnvalg).toBeUndefined()
  })

  describe('Et mindre siste trinn før seponeringen', () => {
    const medMellomtrinn = () =>
      tempo(25, (f) => {
        if (f.strategi.type === 'prosent_av_startdose') f.strategi.mellomtrinn = vurdert
      })
    const tilbudt = (p: Doseplanresultat) => p.trinnvalg?.map((t) => [t.trinn, t.fra_mg, t.beregnet_mg, t.mellomtrinn ?? false, t.doser.map((d) => [d.mg, d.dager])])

    it('tilbyr den laveste og den nærmeste lavere dosen i en komplett plan, og seponerer etter mellomtrinnet', () => {
      const r = medMellomtrinn()
      expect(godkjenningsfeil(r)).toEqual([])
      expect(kontrollerRegelsett({ ...DOMENESETT[0]!.sett, regler: [r] }).filter((x) => x.includes('mellomtrinn'))).toEqual([])
      // 20 → 15 → 10 → 5 → 0: planen er komplett uten valg, og trinn 4 kan i stedet være 1,25 mg eller 3,75 mg fra 5 mg, hver i 14 dager.
      const uten = kryss(r, 20)
      expect(uten.status).toBe('doseplan')
      expect(fra(uten)).toEqual([['1–14: 15', '15–28: 10', '29–42: 5'], 42])
      expect(tilbudt(uten)).toEqual([[4, 5, 0, true, [[1.25, 14], [3.75, 14]]]])
      expect(mellomtrinntekst(uten.trinnvalg![0]!)).toBe('Siste trinn går fra 5 mg til 0 (−100 %), og så seponeres legemidlet. Regelen lar forskriveren velge et mindre siste trinn før seponeringen; uten valg gjelder trinnet til 0.')
      const med = kryss(r, 20, valg([4, 5, 1.25]))
      if (med.status !== 'doseplan') throw new Error(med.stoppgrunner.join(' '))
      expect(fra(med)).toEqual([['1–14: 15', '15–28: 10', '29–42: 5', '43–56: 1.25'], 56])
      // Bare ett mellomtrinn per forløp.
      expect(med.trinnvalg).toBeUndefined()
      expect(planvisning(med, r)!.utfall.komplett).toBe(true)
      expect(med.kontroller.map((k) => k.krav).join(' ')).toMatch(/Trinn 4 av testoksetin er et mindre siste trinn før seponeringen, valgt av forskriveren i stedet for trinnet fra 5 mg til 0/)
      expect(planTekst(planvisning(med, r)!, r.tittel)).toMatch(/1,25 mg.*mindre siste trinn valgt av forskriveren \(−75 %\)/)
    })

    it('godtar bare de tilbudte dosene, ett mellomtrinn og bare når regelen har det', () => {
      const r = medMellomtrinn()
      expect(grunner(kryss(r, 20, valg([4, 5, 2.5])))).toMatch(/den valgte dosen 2,5 mg for trinn 4 er ikke en av dosene som kan velges som et mindre siste trinn \(1,25 mg eller 3,75 mg\)/)
      expect(grunner(kryss(r, 20, valg([4, 5, 3.75], [5, 3.75, 1.25])))).toMatch(/Valget 1,25 mg for trinn 5 .* gjelder ikke lenger/)
      // Uten `mellomtrinn` i regelen er trinnet til 0 seponeringen, og et valg der gjelder ikke.
      const uten = tempo(25)
      expect(kryss(uten, 20).trinnvalg).toBeUndefined()
      expect(grunner(kryss(uten, 20, valg([4, 5, 1.25])))).toMatch(/Valget 1,25 mg for trinn 4 .* gjelder ikke lenger/)
      // Et mellomtrinn uten valg av dose per trinn er en feil i regelen.
      const feil = tempo(25, (f) => {
        if (f.strategi.type === 'prosent_av_startdose') f.strategi.mellomtrinn = vurdert
        delete f.trinnvalg
      })
      expect(kontrollerRegelsett({ ...DOMENESETT[0]!.sett, regler: [feil] })).toContainEqual(expect.stringMatching(/har et mellomtrinn før seponeringen uten valg av dose per trinn/))
    })
  })

  it('godtar bare en av de nærmeste dosene, og bare når den beregnede ikke kan gis', () => {
    const r = tempo()
    expect(grunner(kryss(r, 15, valg([1, 15, 5])))).toMatch(/den valgte dosen 5 mg for trinn 1 er ikke en av de nærmeste dosene som kan gis \(10 mg eller 11,25 mg\)/)
    // 25 % av 20 mg = 5 mg kan gis, så ingen dose tilbys, og et valg avvises.
    const g = tempo(25)
    expect(kryss(g, 20).trinnvalg).toBeUndefined()
    expect(grunner(kryss(g, 20, valg([1, 20, 10])))).toMatch(/den beregnede dosen 15 mg for trinn 1 kan gis med preparatene i FEST, så valget 10 mg gjelder ikke/)
  })
})

describe('Forsiktighetsgrensen (K3)', () => {
  it('sier om dosen er over, under eller utenfor grensen', () => {
    const r = nedtrappingsregel({ type: 'prosent_av_aktuell', prosent: sp(50, 'prosent') }, undefined, 'forsiktig')
    const grense = (krav: object) => {
      r.inndata = [{ navn: 'startdose', art: 'veiledende_preferanse', krever_begrunnelse: true, grunnlag: kilde, ...krav }]
      return (mg: number) => {
        const p = beregn(r, { startdose_mg: mg })
        return p.status === 'stoppet' ? p.stoppgrunner.join(' ') : ''
      }
    }
    const omrade = grense({ omrade: [4, 6] })
    expect(omrade(8)).toMatch(/^Startdosen 8 mg er over forsiktighetsgrensen/)
    expect(omrade(2)).toMatch(/^Startdosen 2 mg er under forsiktighetsgrensen/)
    expect(omrade(4)).toBe('')
    expect(grense({ verdier: [75] })(50)).toMatch(/^Startdosen 50 mg er utenfor forsiktighetsgrensen/)
  })
})

describe('Aldri en delplan for klinikere (Peders beslutning 03.11.2026)', () => {
  it('viser ingen doser når planen ikke når sluttmålet, bare grunnen, også sammen med sperren', () => {
    const r = medAvslutning(4.99, 5, 'krever-over')
    const p = plan(r, 20)
    if (p.status !== 'stoppet') throw new Error('planen skulle stoppet')
    expect(p.stoppgrunner).toEqual([`${KOMPLETT_IKKE_TILGJENGELIG}: testoksetin: regelens avslutning gjelder bare fra 4,99 mg eller lavere (planen står på 5 mg); praktisk grense: ingen trinn under 5 mg; avslutning vurderes individuelt.`])
    expect(p.merknader).toEqual([])
    expect(planvisning(p, r)).toBeNull()
    // Internt (kontrollgrunnlag) gir den ufiltrerte beregningen fortsatt delplanen.
    const intern = beregnDoseplan(r, { startdose_mg: 20, formvalg: TABLETT }, GRUNNLAG, OMGIVELSE)
    expect(intern.status === 'doseplan' && planutfall(intern.forlop, () => 'testoksetin').komplett).toBe(false)
    // En regel som ikke er godkjent, sier begge grunnene.
    const ikkeGodkjent = { ...r, godkjenning: { ...r.godkjenning, status: 'utkast' as const } }
    const q = plan(ikkeGodkjent, 20)
    // Sperren står først, så det viktigste ikke drukner, og grunnen til at planen ikke er komplett står sist.
    expect(q.status === 'stoppet' && q.stoppgrunner[0]).toBe('Ingen klinisk doseplan kan vises.')
    expect(q.status === 'stoppet' && q.stoppgrunner.join(' ')).toMatch(/ikke klinisk godkjent/)
    expect(q.status === 'stoppet' && q.stoppgrunner.at(-1)!.startsWith(KOMPLETT_IKKE_TILGJENGELIG)).toBe(true)
  })

  it('viser planen når den er komplett', () => {
    expect(kort(plan(medAvslutning(5, 5, 'krever-inne'), 20))).toEqual([[['1–14: 10', '15–28: 5'], 28]])
  })
})

describe('Komplett betyr det konkrete sluttmålet (ChatGPTs kontroll av 30eadd5)', () => {
  /** Et praktisk forløp som slutter slik `endre` sier; ellers seponert dag 15. */
  const forlop = (endre: Partial<Praktiskforlop>): Praktiskforlop => ({
    id: 'fra',
    virkestoff: 'testazapin',
    administrasjon: 'peroral',
    start: 1,
    perioder: [],
    injeksjoner: [],
    siste_dosedag: 14,
    toleranse_prosent: 0,
    begrensninger: [],
    ...endre,
  })
  const periode = (fra: number, til: number | null, mg: number) => ({ fra, til, mg, ideell_mg: mg, avvik_prosent: 0, elementer: [] })

  it('godtar bare planer som faktisk ender på målet', () => {
    expect(sluttmalMangler(forlop({ mal: { type: 'seponert' }, perioder: [periode(1, 14, 10)] }))).toBeUndefined()
    expect(sluttmalMangler(forlop({ mal: { type: 'vedlikehold', mg: 30, maldose: true }, siste_dosedag: null, perioder: [periode(1, 14, 15), periode(15, null, 30)] }))).toBeUndefined()
    expect(sluttmalMangler(forlop({ mal: { type: 'uendret', mg: 20 }, siste_dosedag: null, uendret_mg: 20 }))).toBeUndefined()
  })

  it('avviser feil vedlikeholdsdose, en oppstartsdose som fortsetter, feil depotmål, manglende seponering og en vurdering som gjenstår', () => {
    // Feil vedlikeholdsdose: planen står på 28 mg, men forskriverens måldose er 30 mg.
    expect(sluttmalMangler(forlop({ mal: { type: 'vedlikehold', mg: 30, maldose: true }, siste_dosedag: null, perioder: [periode(1, 14, 15), periode(15, null, 28)] }))).toBe('planen står på 28 mg, ikke måldosen 30 mg')
    // Oppstartsdosen fortsetter og når aldri vedlikeholdet.
    expect(sluttmalMangler(forlop({ mal: { type: 'vedlikehold', mg: 30, maldose: true }, siste_dosedag: null, perioder: [periode(1, null, 15)] }))).toBe('planen står på 15 mg, ikke måldosen 30 mg')
    expect(sluttmalMangler(forlop({ mal: { type: 'vedlikehold', mg: 30, maldose: false }, perioder: [periode(1, 14, 15)] }))).toBe('planen når ikke vedlikeholdsdosen 30 mg')
    // En dose som bare fortsetter, uten et sluttmål fra regelen.
    expect(sluttmalMangler(forlop({ siste_dosedag: null, perioder: [periode(1, null, 15)] }))).toBe('planen har ikke et definert sluttmål')
    // Feil depotmål.
    const injeksjon = (mg: number) => ({ dag: null, mg, vedlikehold: { maaneder: 1, etter_dag: 8 }, element: { preparater: [], antall: 1 } }) as unknown as Praktiskforlop['injeksjoner'][number]
    expect(sluttmalMangler(forlop({ administrasjon: 'depotinjeksjon', mal: { type: 'depot', mg: 100 }, siste_dosedag: null, injeksjoner: [injeksjon(75)] }))).toBe('depotvedlikeholdet er 75 mg, ikke regelens 100 mg')
    expect(sluttmalMangler(forlop({ administrasjon: 'depotinjeksjon', mal: { type: 'depot', mg: 100 }, siste_dosedag: null }))).toBe('planen når ikke depotvedlikeholdet på 100 mg')
    // Seponert som mål, men planen seponerer ikke.
    expect(sluttmalMangler(forlop({ mal: { type: 'seponert' }, siste_dosedag: null, perioder: [periode(1, null, 5)] }))).toBe('planen seponerer ikke legemidlet')
    // En klinisk vurdering gjenstår (individuell avslutning).
    expect(sluttmalMangler(forlop({ mal: { type: 'seponert' }, avslutning: 'Vurderes individuelt.', avslutning_kort: 'avslutning vurderes individuelt' }))).toBe('avslutning vurderes individuelt')
    expect(sluttmalMangler(forlop({ mal: { type: 'uendret', mg: 20 }, siste_dosedag: null, uendret_mg: 25 }))).toBe('planen holder ikke dosen uendret på 20 mg')
    // Målet kontrolleres også mot forskriverens måldose slik den er gitt inn.
    const vedlikehold = forlop({ mal: { type: 'vedlikehold', mg: 30, maldose: true }, siste_dosedag: null, perioder: [periode(1, null, 30)] })
    expect(sluttmalMangler(vedlikehold, { maldose_mg: 30 })).toBeUndefined()
    expect(sluttmalMangler(vedlikehold, { maldose_mg: 45 })).toBe('målet 30 mg er ikke forskriverens måldose 45 mg')
    expect(sluttmalMangler(vedlikehold, {})).toBe('forskriverens måldose mangler')
  })

  it('stopper for klinikeren når tillegget ender på en annen dose enn den valgte måldosen', () => {
    // Måldosen 31 mg kan ikke gis; med 10 % toleranse ville planen stått på en annen dose, og det er ikke målet.
    const r = tillegg()
    r.plan.forlop[1]!.dosevalg = { avvik_prosent: sp(10, 'prosent', 'veiledende_preferanse') }
    const g = godkjennITest(r, 'test-tillegg-maldose')
    const intern = kliniskDelplan(g, { startdose_mg: 20, maldose_mg: 31 }, GRUNNLAG, OMGIVELSE)
    if (intern.status !== 'doseplan') throw new Error(intern.stoppgrunner.join(' '))
    const sist = intern.forlop[1]!.perioder.at(-1)!
    expect(sist.til).toBeNull()
    expect(sist.mg).not.toBe(31)
    const p = kliniskDoseplan(g, { startdose_mg: 20, maldose_mg: 31 }, GRUNNLAG, OMGIVELSE)
    expect(p.status === 'stoppet' && p.stoppgrunner).toEqual([`${KOMPLETT_IKKE_TILGJENGELIG}: testazapin: planen står på ${String(sist.mg).replace('.', ',')} mg, ikke måldosen 31 mg.`])
    // Stopp uten kopierbar plan.
    expect('forlop' in p).toBe(false)
    expect(planvisning(p, g)).toBeNull()
    // Med en måldose som kan gis nøyaktig, er planen komplett.
    expect(kliniskDoseplan(g, { startdose_mg: 20, maldose_mg: 30 }, GRUNNLAG, OMGIVELSE).status).toBe('doseplan')
  })
})

describe('Bekreftelser ved et svar (K4)', () => {
  /** En syntetisk regel der to bekreftelser bare gjelder når pasienten kan bli gravid. */
  function medPpp(): Regel {
    const r = nedtrappingsregel({ type: 'prosent_av_aktuell', prosent: sp(50, 'prosent') }, undefined, 'ppp')
    r.sporsmal = [{ id: 'kan_bli_gravid', tekst: 'Kan pasienten bli gravid?', ja: 'kan bli gravid', grunnlag: kilde }]
    r.bekreftelser = [
      { id: 'alltid', tekst: 'Syntetisk forutsetning.', grunnlag: kilde },
      { id: 'ppp_test', tekst: 'Syntetisk graviditetstest.', ved: { sporsmal: 'kan_bli_gravid', svar: true }, grunnlag: kilde },
      { id: 'ppp_prevensjon', tekst: 'Syntetisk prevensjon.', ved: { sporsmal: 'kan_bli_gravid', svar: true }, grunnlag: kilde },
    ]
    return r
  }

  it('kreves bare ved svaret, og stopper på spørsmålet uten svar', () => {
    const r = medPpp()
    expect(gjeldendeBekreftelser(r, undefined).map((b) => b.id)).toEqual(['alltid'])
    expect(gjeldendeBekreftelser(r, { kan_bli_gravid: false }).map((b) => b.id)).toEqual(['alltid'])
    expect(gjeldendeBekreftelser(r, { kan_bli_gravid: true }).map((b) => b.id)).toEqual(['alltid', 'ppp_test', 'ppp_prevensjon'])
    const stopp = (svar: Record<string, boolean>, bekreftet: string[]) => {
      const p = beregn(r, { startdose_mg: 20, svar, bekreftet })
      return p.status === 'stoppet' ? p.stoppgrunner : []
    }
    expect(stopp({}, ['alltid'])).toEqual(['Må besvares før beregning: Kan pasienten bli gravid?'])
    expect(stopp({ kan_bli_gravid: false }, ['alltid'])).toEqual([])
    expect(stopp({ kan_bli_gravid: true }, ['alltid', 'ppp_test'])).toEqual(['Må bekreftes før beregning: Syntetisk prevensjon.'])
    expect(stopp({ kan_bli_gravid: true }, ['alltid', 'ppp_test', 'ppp_prevensjon'])).toEqual([])
    // Skjemaet merker bare bekreftelsene som gjelder med svaret.
    expect(ubesvart(r, { ...TOMT_SKJEMA, svar: { kan_bli_gravid: false }, bekreftet: ['alltid'] }).bekreftelser).toEqual([])
    expect(ubesvart(r, { ...TOMT_SKJEMA, svar: { kan_bli_gravid: true }, bekreftet: ['alltid'] }).bekreftelser).toEqual(['ppp_test', 'ppp_prevensjon'])
  })
})
