/**
 * Nedtrapping av antidepressiva (P7 i `docs/verktøy-utviklingsplan.md`):
 * dekningen har nøyaktig én status for hvert antidepressivum og stemmer med
 * reglene, statusen er skilt fra kildens Stop-oppføring, ingen regel er
 * klinisk godkjent, hver beregnbar regel ender i seponering og stopper ved
 * grenseverdiene i stedet for å seponere brått eller gjette, kontrollene slår
 * ut på feil, og rapporten er oppdatert.
 *
 * Doseplanmotoren prøves med syntetiske preparater i FESTs form, koblet til
 * virkestoffet i testen: vanlige og uvanlige startdoser, rask og lang
 * nedtrapping, lave sluttdoser, delbare og udelbare tabletter, kapsler,
 * flytende former, manglende norske styrker, godkjenningsfritak og fersk og
 * foreldet FEST. Bare en godkjenning laget i testen gir en klinisk plan.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Preparatgrunnlag } from '../verktoy/motor/byggesteiner'
import { beregnDoseplan, formvalgSomTrengs, kliniskDoseplan, planform, type Doseplaninndata, type Doseplanresultat } from '../verktoy/motor/plan'
import { OMGIVELSE, syntetiskUtvalg, type Testpreparat } from '../verktoy/motor/syntetisk'
import { VERKTOY, virkestoffvalg } from '../verktoy/register'
import { beregn, kortform } from '../verktoy/regler/beregning'
import { NEDTRAPPINGSDEKNING, type Dekningsstatus, type Nedtrappingsdekning } from '../verktoy/regler/dekning'
import { erKliniskGodkjent } from '../verktoy/regler/godkjenning'
import { kontrollerDekning, kontrollerRegelsett, lesKontrollgrunnlag, stoppoppforing } from '../verktoy/regler/kontroll'
import { apneValg, type Regel } from '../verktoy/regler/modell'
import { NEDTRAPPINGSSETT } from '../verktoy/regler/nedtrapping'
import { PILOTSETT } from '../verktoy/regler/pilotsett'
import { lagNedtrappingsrapport, NEDTRAPPINGSRAPPORTFIL } from '../verktoy/regler/rapport'
import { REGELSETT, tilgjengelighet } from '../verktoy/tilgjengelighet'
import { godkjennITest } from './hjelp/verktoyplan'

const GRUNNLAG = lesKontrollgrunnlag()
const TRAPPE_NED = VERKTOY.find((x) => x.id === 'trappe-ned-antidepressiv')!
const regel = (nokkel: string) => structuredClone(NEDTRAPPINGSSETT.regler.find((r) => r.id === `seponering-${nokkel}`)!)
const nokkelFor = (r: Regel) => (r.fra.type === 'virkestoff' ? r.fra.nokkel : '')
const BEREGNBARE = NEDTRAPPINGSSETT.regler.filter((r) => r.beregnbarhet !== 'bare_tekstlig')
const FAGTEKST = NEDTRAPPINGSSETT.regler.filter((r) => r.beregnbarhet === 'bare_tekstlig')
const valg = (nokkel: string) => ({ fra: { nokkel, formulering: 'standard' as const } })

/** Den ideelle kurven fra regelen: linjene for forløpet, eller stoppgrunnene. */
function ideell(nokkel: string, startdose_mg: number): string[] | string {
  const res = beregn(regel(nokkel), { startdose_mg }, NEDTRAPPINGSSETT)
  return res.status === 'stoppet' ? res.stoppgrunner.join(' ') : kortform(res).fra!
}

/* --- Syntetiske preparater: testvirkestoffet koblet til virkestoffet i testen, aldri virkelige preparater --- */

const preparat = (form: Testpreparat['form'], mg: number, ekstra: Partial<Testpreparat> = {}): Testpreparat => ({
  id: `${form}-${mg}-${ekstra.deling ?? ''}-${ekstra.type ?? ''}`,
  virkestoff: 'testoksetin',
  varenavn: 'Syntetisk',
  form,
  mg,
  ...ekstra,
})
const tab = (mg: number, deling: Testpreparat['deling'] = '1', ekstra: Partial<Testpreparat> = {}) => preparat('tablett', mg, { deling, ...ekstra })
const kaps = (mg: number) => preparat('kapsel', mg)
/** 1 mg per dråpe, som FESTs alternative styrke. */
const DRAPER = preparat('draper', 20, { nevner: { verdi: 1, enhet: 'ml' }, per_drape: 1 })
/** En mikstur uten dose per dråpe eller målt mengde kan ikke doseres av motoren. */
const MIKSTUR = preparat('mikstur', 20, { nevner: { verdi: 1, enhet: 'ml' } })

function grunnlag(nokkel: string, preparater: Testpreparat[], fest: Parameters<typeof syntetiskUtvalg>[1] = {}, kilde?: 'FEST'): Preparatgrunnlag {
  const utvalg = syntetiskUtvalg(preparater, fest)
  return { utvalg: kilde ? { ...utvalg, kilde } : utvalg, koblinger: { [nokkel]: ['ID_SYNTETISK-TESTOKSETIN'] }, overstyringer: [] }
}
const plan = (nokkel: string, startdose_mg: number, preparater: Testpreparat[], ekstra: Partial<Doseplaninndata> = {}) =>
  beregnDoseplan(regel(nokkel), { startdose_mg, ...ekstra }, grunnlag(nokkel, preparater), OMGIVELSE, NEDTRAPPINGSSETT)
const linjer = (r: Doseplanresultat) => planform(r).fra ?? planform(r).stopp
const stopp = (r: Doseplanresultat) => (r.status === 'stoppet' ? r.stoppgrunner.join(' ') : `ikke stoppet: ${JSON.stringify(planform(r))}`)
const TABLETTER = { fra: { legemiddelformer: ['SYN-TAB'] } }
const DRAPEFORM = { fra: { legemiddelformer: ['SYN-DRAP'] } }

describe('Dekningen (P7.1)', () => {
  it('har nøyaktig én status for hvert antidepressivum i verktøyet, uten johannesurt', () => {
    expect(NEDTRAPPINGSDEKNING.map((d) => d.nokkel).sort()).toEqual(virkestoffvalg(TRAPPE_NED).map((v) => v.nokkel).sort())
    expect(JSON.stringify(NEDTRAPPINGSDEKNING)).not.toMatch(/johannesurt|hypericum|perikum/i)
    const per: Partial<Record<Dekningsstatus, string[]>> = {}
    for (const d of NEDTRAPPINGSDEKNING) (per[d.status] ??= []).push(d.nokkel)
    expect(per).toEqual({
      beregnbar_regel: ['citalopram', 'duloksetin', 'escitalopram', 'fluoksetin', 'fluvoksamin', 'mirtazapin', 'paroksetin', 'sertralin', 'venlafaksin'],
      bare_fagtekst: ['agomelatin', 'bupropion', 'vortioksetin'],
      begrenset: ['amitriptylin', 'klomipramin', 'nortriptylin'],
      mangler_anbefaling: ['doksepin', 'dosulepin', 'fenelzin', 'imipramin', 'maprotilin', 'moklobemid', 'tranylcypromin', 'trazodon'],
    })
    expect(kontrollerDekning(NEDTRAPPINGSDEKNING, REGELSETT, GRUNNLAG)).toEqual([])
  })

  it('skiller OUSFARs status fra kildens Stop-oppføring', () => {
    const stopp = (nokkel: string) => GRUNNLAG.kildeoppforinger.get(stoppoppforing(nokkel, GRUNNLAG))
    for (const d of NEDTRAPPINGSDEKNING) expect(stopp(d.nokkel), d.nokkel).toBeDefined()
    // Kilden har en Stop-oppføring for vortioksetin, men OUSFAR beregner ingen plan; for fenelzin er oppføringen utilgjengelig.
    expect(stopp('vortioksetin')!.tilgjengelighet).not.toBe('utilgjengelig')
    expect(stopp('fenelzin')!.tilgjengelighet).toBe('utilgjengelig')
    for (const r of NEDTRAPPINGSSETT.regler) {
      expect(r.referanser, r.id).toEqual([{ kilde: 'psychiatrienet', kildeoppforing: stoppoppforing(nokkelFor(r), GRUNNLAG) }])
    }
  })

  it('kontrollen slår ut på manglende, doble og feil statuser', () => {
    const f = (d: readonly Nedtrappingsdekning[], s = REGELSETT) => kontrollerDekning(d, s, GRUNNLAG).join('\n')
    const endre = (nokkel: string, endring: Partial<Nedtrappingsdekning>) => NEDTRAPPINGSDEKNING.map((d) => (d.nokkel === nokkel ? { ...d, ...endring } : d))
    expect(f(NEDTRAPPINGSDEKNING.filter((d) => d.nokkel !== 'trazodon'))).toMatch(/trazodon mangler status/)
    expect(f([...NEDTRAPPINGSDEKNING, NEDTRAPPINGSDEKNING[0]!])).toMatch(/agomelatin har flere statuser/)
    expect(f([...NEDTRAPPINGSDEKNING, { nokkel: 'johannesurt', status: 'mangler_anbefaling', grunn: 'x', henvisninger: [], apne: [] }])).toMatch(/johannesurt/)
    expect(f(endre('sertralin', { status: 'mangler_anbefaling' }))).toMatch(/sertralin: har status mangler_anbefaling, men settet har en beregnbar regel/)
    expect(f(endre('dosulepin', { status: 'beregnbar_regel' }))).toMatch(/dosulepin: har status beregnbar regel, men settet har ingen beregnbar/)
    expect(f(endre('vortioksetin', { status: 'mangler_anbefaling' }))).toMatch(/vortioksetin: har status mangler_anbefaling, men settet har regler/)
    expect(f(endre('nortriptylin', { henvisninger: [] }))).toMatch(/nortriptylin: en begrensning må ha kildegrunnlaget/)
    expect(f(endre('amitriptylin', { henvisninger: [{ kilde: 'psychiatrienet', kildeoppforing: 'SwitchAntidepressants:At>Stop' }] }))).toMatch(/psychiatrienet kan ikke gi fakta/)
    expect(f(endre('moklobemid', { grunn: ' ' }))).toMatch(/moklobemid: har ingen grunn/)
    // Uten nedtrappingsreglene har de beregnbare statusene ingen regel å stå på.
    expect(f(NEDTRAPPINGSDEKNING, { ...REGELSETT, regler: PILOTSETT.regler })).toMatch(/sertralin: har status beregnbar regel/)
  })
})

describe('Regelutkastene (P7.2)', () => {
  it('er kontrollert, til faglig kontroll, med OUSFARs valg åpne, og ingen er klinisk godkjent', () => {
    expect(kontrollerRegelsett(NEDTRAPPINGSSETT, GRUNNLAG)).toEqual([])
    expect(kontrollerRegelsett(REGELSETT, GRUNNLAG)).toEqual([])
    expect(REGELSETT.regler.filter(erKliniskGodkjent)).toEqual([])
    for (const r of NEDTRAPPINGSSETT.regler) {
      expect(r.godkjenning.status, r.id).toBe('til_faglig_kontroll')
      expect(r.godkjenning.historikk.map((s) => s.status)).toEqual(['utkast', 'til_faglig_kontroll'])
      expect([r.plan.form, r.til], r.id).toEqual(['seponering', null])
      expect(r.fortolkning.kildetro.length, r.id).toBeGreaterThan(0)
      expect(r.fortolkning.tilpasninger.length, r.id).toBeGreaterThan(0)
    }
    for (const r of BEREGNBARE) expect(apneValg(r).length, r.id).toBeGreaterThan(0)
  })

  it('halverer ned til sluttdosen med 14 dager per trinn, unntatt paroksetin, som følger regimet i preparatomtalen', () => {
    const oppsummering = Object.fromEntries(
      BEREGNBARE.map((r) => {
        const fase = r.plan.forlop[0]!.faser[0]!
        if (fase.type !== 'nedtrapping') return [nokkelFor(r), fase.type]
        const s = fase.strategi
        const trinn = s.type === 'prosent_av_aktuell' ? [s.prosent.verdi, '%', 'til', s.sluttdose_mg.verdi] : s.type === 'absolutt' ? [s.mg.verdi, 'mg'] : [s.type]
        const inndata = r.inndata[0]!
        return [nokkelFor(r), [...trinn, fase.trinnlengde.verdi, fase.minste_varighet?.verdi, fase.minste_varighet?.art, inndata.omrade]]
      }),
    )
    expect(oppsummering).toEqual({
      citalopram: [50, '%', 'til', 10, 14, 14, 'bindende_krav', [10, 40]],
      duloksetin: [50, '%', 'til', 30, 14, 14, 'bindende_krav', [30, 120]],
      fluoksetin: [50, '%', 'til', 10, 14, 14, 'bindende_krav', [20, 60]],
      fluvoksamin: [50, '%', 'til', 50, 14, 14, 'bindende_krav', [50, 300]],
      mirtazapin: [50, '%', 'til', 15, 14, 14, 'bindende_krav', [15, 45]],
      paroksetin: [10, 'mg', 7, 7, 'bindende_krav', [10, 60]],
      sertralin: [50, '%', 'til', 25, 14, 14, 'bindende_krav', [25, 200]],
      venlafaksin: [50, '%', 'til', 37.5, 14, 14, 'bindende_krav', [37.5, 375]],
    })
  })

  it('regneeksemplene stemmer, og hver plan ender med seponering', () => {
    for (const r of BEREGNBARE) {
      expect(r.eksempler.length, r.id).toBeGreaterThanOrEqual(3)
      expect(r.eksempler.some((e) => e.stopp), `${r.id} har et eksempel som stopper`).toBe(true)
      for (const e of r.eksempler) {
        const res = beregn(r, e.inndata, NEDTRAPPINGSSETT)
        if (e.stopp) {
          expect(res.status, `${r.id} ${e.id}`).toBe('stoppet')
          continue
        }
        expect(res.status, `${r.id} ${e.id}`).toBe('modellberegning')
        expect(kortform(res).fra, `${r.id} ${e.id}`).toEqual(e.forventet.fra)
        expect(kortform(res).fra!.at(-1)).toMatch(/^fra dag \d+: seponert$/)
      }
    }
  })

  it('beholder sluttdosen når dosen er lik den, og seponerer like under i stedet for å gi et kort forløp', () => {
    expect(ideell('citalopram', 20)).toEqual(['dag 1–14: 10 mg', 'fra dag 15: seponert'])
    expect(ideell('citalopram', 20.02)).toEqual(['dag 1–14: 10,01 mg', 'fra dag 15: seponert'])
    // Neste dose er under sluttdosen: nedtrappingen blir 0 dager, og beregningen stopper i stedet for å seponere brått.
    expect(ideell('citalopram', 19.98)).toMatch(/Nedtrappingen av citalopram blir 0 dager, kortere enn 14 dager/)
    expect(ideell('venlafaksin', 75)).toEqual(['dag 1–14: 37,5 mg', 'fra dag 15: seponert'])
    expect(ideell('venlafaksin', 74.9)).toMatch(/blir 0 dager/)
    expect(ideell('mirtazapin', 15)).toMatch(/blir 0 dager, kortere enn 14 dager/)
  })

  it('bruker doseområdet fra preparatomtalen som bindende grense', () => {
    expect(ideell('citalopram', 40)).toEqual(['dag 1–14: 20 mg', 'dag 15–28: 10 mg', 'fra dag 29: seponert'])
    expect(ideell('citalopram', 40.01)).toMatch(/Startdosen 40,01 mg er utenfor det regelen gjelder for \(10–40 mg\)/)
    expect(ideell('citalopram', 9.99)).toMatch(/er utenfor/)
    expect(ideell('sertralin', 200)).toEqual(['dag 1–14: 100 mg', 'dag 15–28: 50 mg', 'dag 29–42: 25 mg', 'fra dag 43: seponert'])
    expect(ideell('sertralin', 201)).toMatch(/er utenfor/)
  })

  it('paroksetin: 10 mg mindre hver uke, minst én uke, og fra 10 mg ingen nedtrapping å beregne', () => {
    expect(ideell('paroksetin', 30)).toEqual(['dag 1–7: 20 mg', 'dag 8–14: 10 mg', 'fra dag 15: seponert'])
    expect(ideell('paroksetin', 10)).toMatch(/Nedtrappingen av paroksetin blir 0 dager, kortere enn 7 dager/)
    // Like store mg-trinn gir et lite siste trinn når startdosen ikke er hele 10 mg; om det kan gis, avgjør FEST (åpent faglig spørsmål).
    expect(ideell('paroksetin', 11)).toEqual(['dag 1–7: 1 mg', 'fra dag 8: seponert'])
    // Uken på 10 mg er OUSFARs valg: den amerikanske preparatomtalen sier at studieregimet sluttet etter 20 mg. Konflikten står i regelen.
    const r = regel('paroksetin')
    expect(r.fortolkning.tilpasninger.some((u) => u.tekst.includes('en uke på 10 mg') && u.henvisninger.some((h) => h.kilde === 'fda-paxil'))).toBe(true)
    expect(r.fortolkning.usikkerhet.join(' ')).toMatch(/slutte etter 20 mg eller fortsette med en uke på 10 mg, må avklares faglig/)
  })

  it('fagtekstreglene har ingen beregning og vises bare når de er godkjent', () => {
    expect(FAGTEKST.map(nokkelFor)).toEqual(['agomelatin', 'bupropion', 'vortioksetin'])
    for (const r of FAGTEKST) {
      expect(r.plan.forlop.flatMap((f) => f.faser)).toEqual([])
      expect(beregn(r, { startdose_mg: 10 }, NEDTRAPPINGSSETT)).toMatchObject({ status: 'stoppet', stoppgrunner: [expect.stringMatching(/bare tekstlig veiledning/)] })
      expect(tilgjengelighet(TRAPPE_NED, valg(nokkelFor(r))).status, r.id).toBe('til_kontroll')
      const godkjent = godkjennITest(r, `${r.id}-test`)
      expect(tilgjengelighet(TRAPPE_NED, valg(nokkelFor(r)), { ...REGELSETT, regler: [godkjent] })).toMatchObject({ status: 'fagtekst', regler: [godkjent] })
    }
  })

  it('kontrollen slår ut på en seponering som ikke ender i seponering, og beregningen stopper', () => {
    const r = regel('sertralin')
    r.plan.forlop[0]!.faser.push({ type: 'vedlikehold', dose: { type: 'aktuell' } })
    expect(kontrollerRegelsett({ ...NEDTRAPPINGSSETT, regler: [r] }, GRUNNLAG).join()).toMatch(/forløp fra ender med vedlikehold, ikke med seponering/)
    const res = beregn(r, { startdose_mg: 100 }, NEDTRAPPINGSSETT)
    expect(res.status === 'stoppet' && res.stoppgrunner.join()).toMatch(/fra ender ikke med seponering/)
    const bytte = regel('sertralin')
    bytte.til = { type: 'virkestoff', nokkel: 'mirtazapin' }
    expect(kontrollerRegelsett({ ...NEDTRAPPINGSSETT, regler: [bytte] }, GRUNNLAG).join()).toMatch(/er en seponering, men har et til-virkestoff/)
  })
})

describe('Doseplanen med syntetiske preparater (P7.3–P7.4)', () => {
  it('vanlig startdose med hele tabletter: hver dose har et spor til preparatene, og planen ender med seponering', () => {
    const r = plan('citalopram', 40, [tab(10), tab(20), tab(40)])
    expect(r).toMatchObject({ status: 'doseplan', klinisk: false, avvik: [] })
    expect(linjer(r)).toEqual(['dag 1–14: 20 mg = 1 tablett à 20 mg', 'dag 15–28: 10 mg = 1 tablett à 10 mg', 'fra dag 29: seponert'])
  })

  it('uvanlig startdose: en delbar tablett gir dosen, en udelbar eller uoppgitt deling stopper med forklaring', () => {
    expect(linjer(plan('citalopram', 30, [tab(10, '2'), tab(20)]))).toEqual(['dag 1–14: 15 mg = 1½ tabletter à 10 mg', 'fra dag 15: seponert'])
    for (const deling of ['1', '0'] as const) {
      expect(stopp(plan('citalopram', 30, [tab(10, deling), tab(20, deling)]))).toMatch(
        /citalopram dag 1–14: den ideelle dosen 15 mg kan ikke gis med preparatene i FEST nøyaktig\. Nærmeste doser som kan settes sammen: 10 mg \(-33,33 %\) og 20 mg \(\+33,33 %\)\. .*krever en ny faglig beslutning/,
      )
    }
  })

  it('rask nedtrapping (paroksetin 20 mg) og lang nedtrapping (sertralin 200 mg, venlafaksin 300 mg)', () => {
    expect(linjer(plan('paroksetin', 20, [tab(20, '2')]))).toEqual(['dag 1–7: 10 mg = ½ tablett à 20 mg', 'fra dag 8: seponert'])
    expect(linjer(plan('sertralin', 200, [tab(25), tab(50, '2'), tab(100, '2')]))).toEqual([
      'dag 1–14: 100 mg = 1 tablett à 100 mg',
      'dag 15–28: 50 mg = 1 tablett à 50 mg',
      'dag 29–42: 25 mg = 1 tablett à 25 mg',
      'fra dag 43: seponert',
    ])
    expect(linjer(plan('venlafaksin', 300, [kaps(37.5), kaps(75), kaps(150)]))).toEqual([
      'dag 1–14: 150 mg = 1 kapsel à 150 mg',
      'dag 15–28: 75 mg = 1 kapsel à 75 mg',
      'dag 29–42: 37,5 mg = 1 kapsel à 37,5 mg',
      'fra dag 43: seponert',
    ])
  })

  it('lav startdose lik sluttdosen: stopper i stedet for å seponere brått', () => {
    expect(stopp(plan('citalopram', 10, [tab(10)]))).toMatch(/Nedtrappingen av citalopram blir 0 dager, kortere enn 14 dager/)
    expect(stopp(plan('mirtazapin', 15, [tab(15, '2')]))).toMatch(/Nedtrappingen av mirtazapin blir 0 dager/)
    expect(stopp(plan('paroksetin', 10, [tab(20, '2')]))).toMatch(/Nedtrappingen av paroksetin blir 0 dager, kortere enn 7 dager/)
  })

  it('kapsler deles aldri: en dose mellom styrkene stopper', () => {
    expect(stopp(plan('duloksetin', 90, [kaps(30), kaps(60)]))).toMatch(/duloksetin dag 1–14: den ideelle dosen 45 mg kan ikke gis/)
    expect(stopp(plan('venlafaksin', 225, [kaps(37.5), kaps(75), kaps(150)]))).toMatch(/venlafaksin dag 15–28: den ideelle dosen 56,25 mg kan ikke gis/)
    expect(linjer(plan('duloksetin', 120, [kaps(30), kaps(60)]))).toEqual(['dag 1–14: 60 mg = 1 kapsel à 60 mg', 'dag 15–28: 30 mg = 1 kapsel à 30 mg', 'fra dag 29: seponert'])
  })

  it('flytende form brukes når FEST oppgir dosen per dråpe, og formen velges når det finnes flere', () => {
    expect(linjer(plan('fluoksetin', 60, [DRAPER]))).toEqual(['dag 1–14: 30 mg = 30 dråper à 1 mg', 'dag 15–28: 15 mg = 15 dråper à 1 mg', 'fra dag 29: seponert'])
    expect(stopp(plan('fluoksetin', 60, [MIKSTUR]))).toMatch(/Ingen av de perorale preparatene av fluoksetin i FEST kan brukes/)
    // Tabletter og dråper: formen velges, beregningen blander dem ikke.
    const begge = [tab(20, '2'), DRAPER]
    expect(Object.keys(formvalgSomTrengs(regel('fluoksetin'), { startdose_mg: 60 }, grunnlag('fluoksetin', begge), OMGIVELSE.idag))).toEqual(['fra'])
    expect(stopp(plan('fluoksetin', 60, begge))).toMatch(/flere legemiddelformer.*formen må velges/)
    expect(stopp(plan('fluoksetin', 60, begge, { formvalg: TABLETTER }))).toMatch(/dag 15–28: den ideelle dosen 15 mg kan ikke gis/)
    expect(linjer(plan('fluoksetin', 60, begge, { formvalg: DRAPEFORM }))).toEqual(linjer(plan('fluoksetin', 60, [DRAPER])))
  })

  it('manglende norske styrker eller preparater stopper med grunnen', () => {
    expect(stopp(plan('citalopram', 40, []))).toMatch(/FEST har ingen perorale preparater av citalopram\. Det finnes ingen bekreftet norsk løsning/)
    expect(stopp(plan('paroksetin', 25, [tab(20, '2')]))).toMatch(/paroksetin dag 1–7: den ideelle dosen 15 mg kan ikke gis/)
    expect(stopp(plan('mirtazapin', 45, [tab(15), tab(30)]))).toMatch(/den ideelle dosen 22,5 mg kan ikke gis/)
  })

  it('preparater med godkjenningsfritak brukes bare med et uttrykkelig ja', () => {
    const fritak = [tab(25, '1', { type: 'fritak' })]
    expect(stopp(plan('sertralin', 50, fritak))).toMatch(/krever godkjenningsfritak, som ikke er valgt/)
    expect(linjer(plan('sertralin', 50, fritak, { godkjenningsfritak: true }))).toEqual(['dag 1–14: 25 mg = 1 tablett à 25 mg', 'fra dag 15: seponert'])
  })

  it('gir en klinisk plan bare med en godkjenning laget i testen og en fersk FEST-kopi', () => {
    const preparater = [tab(10), tab(20)]
    const inndata = { startdose_mg: 40 }
    const fest = (kontrollert_kl: string | null) => grunnlag('citalopram', preparater, { kontrollert_kl }, 'FEST')
    const godkjent = godkjennITest(regel('citalopram'), 'seponering-citalopram-test')
    const fersk = kliniskDoseplan(godkjent, inndata, fest('2026-11-01T04:20:00Z'), OMGIVELSE)
    expect(fersk).toMatchObject({ status: 'doseplan', klinisk: true })
    expect(linjer(fersk)).toEqual(['dag 1–14: 20 mg = 1 tablett à 20 mg', 'dag 15–28: 10 mg = 1 tablett à 10 mg', 'fra dag 29: seponert'])
    // Foreldet, manglende eller syntetisk preparatgrunnlag gir ingen klinisk plan.
    expect(stopp(kliniskDoseplan(godkjent, inndata, fest('2026-10-29T04:20:00Z'), OMGIVELSE))).toMatch(/Ingen klinisk doseplan kan vises\..*sist kontrollert mot FEST/)
    expect(kliniskDoseplan(godkjent, inndata, fest(null), OMGIVELSE)).toMatchObject({ status: 'stoppet', klinisk: false })
    expect(stopp(kliniskDoseplan(godkjent, inndata, grunnlag('citalopram', preparater), OMGIVELSE))).toMatch(/ikke fra FEST/)
    // Regelen slik den er, uten godkjenning, gir ingen klinisk plan, heller ikke med fersk FEST.
    expect(stopp(kliniskDoseplan(regel('citalopram'), inndata, fest('2026-11-01T04:20:00Z'), OMGIVELSE))).toMatch(/Ingen klinisk doseplan kan vises\./)
  })

  it('ingen nedtrappingsregel gir en klinisk plan, uansett preparatdata', () => {
    const alle = [tab(5, '2'), tab(10, '4'), tab(15, '2'), tab(20, '4'), tab(25, '2'), tab(30, '2'), tab(50, '2'), tab(100, '2'), DRAPER].map((p) => ({ ...p, id: `${p.id}-alle` }))
    for (const r of BEREGNBARE) {
      const g = grunnlag(nokkelFor(r), alle, {}, 'FEST')
      for (const e of r.eksempler) {
        const res = kliniskDoseplan(r, { ...e.inndata, formvalg: TABLETTER }, g, OMGIVELSE)
        expect(res, `${r.id} ${e.id}`).toMatchObject({ status: 'stoppet', klinisk: false })
      }
    }
    for (const r of [...PILOTSETT.regler, ...NEDTRAPPINGSSETT.regler]) {
      if (r.til === null) expect(tilgjengelighet(TRAPPE_NED, valg(nokkelFor(r))).status, r.id).toBe('til_kontroll')
    }
  })
})

describe('Rapporten (P7)', () => {
  it('viser hele matrisen og sier at ingen regel er godkjent', () => {
    const rapport = lagNedtrappingsrapport()
    expect(rapport).toMatch(/\*\*11 nye regler, 0 klinisk godkjent\.\*\*/)
    expect(rapport).toMatch(/Alle 23 antidepressiva i kildetabellen \(johannesurt er utelatt\): 9 med beregnbar regel til faglig kontroll, 3 med bare fagtekst, 8 der anbefaling mangler og 3 med en annen begrunnet begrensning\./)
    for (const d of NEDTRAPPINGSDEKNING) expect(rapport).toMatch(new RegExp(`^\\| ${d.nokkel} \\|`, 'm'))
    expect(rapport).toMatch(/Regler fra pilotsettet \(P4\) er tatt med for citalopram og escitalopram\./)
  })

  it('er oppdatert', () => {
    const ny = 'Lag den på nytt med `npm run verktoy:regler -- rapport`.'
    expect(readFileSync(new URL(`../../${NEDTRAPPINGSRAPPORTFIL}`, import.meta.url), 'utf8'), ny).toBe(lagNedtrappingsrapport())
  })
})
