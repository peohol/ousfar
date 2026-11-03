/**
 * Regelmodell 12, beregningsmotor 10 og doseplanmotor 10: det felles
 * grunnlaget for komplette forløp (`docs/verktøy-klinisk-leveranseplan-2026-11.md`,
 * strøm G). Godkjent avslutning, vurderingspunkter, tillegg med uendret dose,
 * opptrapping annenhver dag, planutfall (komplett eller delplan) og depot som
 * stoppes. Alle regler og preparater er syntetiske og godkjennes bare i testen.
 */
import { describe, expect, it } from 'vitest'
import { beregnDoseplan, formvalgSomTrengs, kliniskDoseplan, type Doseplanresultat } from '../verktoy/motor/plan'
import { ALLE_TESTPREPARATER, depotregel, nedtrappingsregel, OMGIVELSE, sp, syntetiskGrunnlag, trinnvalgUtenNull } from '../verktoy/motor/syntetisk'
import { DELPLAN, KOMPLETT, planTekst, planvisning, UENDRET } from '../verktoy/planvisning'
import { VALGTEKSTER, VERKTOY } from '../verktoy/register'
import { beregn } from '../verktoy/regler/beregning'
import { DOMENESETT } from '../verktoy/regler/domenesett'
import { godkjenningsfeil } from '../verktoy/regler/godkjenning'
import { apneValg, nulltrinnfeil, tilleggsfeil, type Avslutning, type Fase, type Grunnlag, type Regel } from '../verktoy/regler/modell'
import { avSlaget, REGELSETTENE } from '../verktoy/tilgjengelighet'
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
const kort = (p: Doseplanresultat) => (p.status === 'doseplan' ? p.forlop.map((f) => [f.perioder.map((x) => `${x.fra}–${x.til ?? '…'}: ${x.mg}${x.hver ? ` hver ${x.hver}.` : ''}`), f.siste_dosedag]) : p.stoppgrunner)

describe('Godkjent avslutning (regelmodell 12)', () => {
  it('trapper ned til laveste dose og seponerer etter siste trinn, når siste dose ikke er over grensen', () => {
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
    const p = plan(over, 20)
    expect(kort(p)).toEqual([[['1–14: 10', '15–…: 5'], null]])
    const v = planvisning(p, over)!
    expect(v.utfall.komplett).toBe(false)
    expect(v.utfall.tekst.startsWith(DELPLAN)).toBe(true)
    expect(v.advarsler.join(' ')).toMatch(/avslutning av testoksetin gjelder bare fra 4,99 mg eller lavere, og planen står på 5 mg/)
  })

  it('gir dosen pasienten bruker ett trinn før seponering når ingen reduksjon kan beregnes', () => {
    expect(kort(plan(medAvslutning(5, 5), 5))).toEqual([[['1–14: 5'], 14]])
  })

  it('kontrollerer den siste dosen som faktisk kan gis: neste trinn som ikke kan gis, avslutter fra trinnet før bare innenfor grensen', () => {
    // Uten laveste dose: 20 → 10 → 5 → 2,5 → 1,25, og 0,63 mg kan ikke gis nøyaktig med preparatene.
    const innenfor = medAvslutning(2.5, undefined, 'innenfor')
    const ideell = beregn(innenfor, { startdose_mg: 20 })
    expect(ideell.status === 'modellberegning' && ideell.forlop[0]!.perioder.length).toBeGreaterThan(4)
    const p = plan(innenfor, 20)
    expect(kort(p)).toEqual([[['1–14: 10', '15–28: 5', '29–42: 2.5', '43–56: 1.25'], 56]])
    expect(p.merknader.join(' ')).toMatch(/avslutning gjelder fra 1,25 mg \(høyst 2,5 mg\)/)
    expect(planvisning(p, innenfor)!.utfall.komplett).toBe(true)
    const utenfor = medAvslutning(1, undefined, 'utenfor')
    const q = plan(utenfor, 20)
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
    // En plan som stopper over grensen (laveste dose 10 mg), seponerer ikke; punktet står da uten dag.
    const h = regel(10)
    const over = planvisning(plan(h, 80), h)!
    expect(over.utfall.komplett).toBe(false)
    expect(over.rader.some((x) => x.type === 'vurdering')).toBe(false)
    expect(over.vurderinger).toEqual(['testoksetin, 14 dager etter siste dose: Følg opp seponeringssymptomer og tilbakefall.'])
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
    expect(perioder[0]!.type === 'periode' && perioder[0]!.celler[0]!.elementer).toEqual([UENDRET])
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
