/**
 * «Trappe ned antidepressiv» (P7 i `docs/verktøy-utviklingsplan.md`):
 *
 * - Dekningen (P7.1) har hvert antidepressivum i kildetabellen, uten
 *   johannesurt, med Stop-oppføringen fra P3, og statusen stemmer med
 *   regelsettet, P3-kildeoppføringene og FEST-uttrekket.
 * - Regelutkastene (P7.2, regelversjon 5 etter fagkontrollen 30.10.2026)
 *   består kontrollene, er ikke godkjent, viser til sin egen Stop-oppføring og
 *   er startforslag med minstetider som må bekreftes sammen med organfunksjon
 *   og interaksjoner, med svar om behandlingstid og doseramme. Valgene følger
 *   risikogruppene (høyest risiko 5–10 % og minst 28 dager, ellers standard
 *   25 % og minst 14 dager, 28 for fluoksetin), og den langsomme varianten
 *   etter tidligere seponeringssymptomer har 1–5 % og minst 28 dager, testet
 *   ved grensene. Ingen plan går til null, og ingen har en fast nedre grense:
 *   planen stopper ved den tekniske planhorisonten, ved formuleringens
 *   praktiske grense (venlafaksin 37,5 mg, duloksetin 30 mg) eller ved minste
 *   dose beregningen viser, og siste beregnede dose er aldri «siste dose før
 *   seponering». Fluoksetin 20 mg annenhver dag er en egen valgfri regel;
 *   bupropion og agomelatin er bare fagtekst. Den hyperbolske citalopramregelen
 *   er bare i sammenligningssettet, og paroksetins studievariant er fjernet.
 * - Doseplanmotoren (P5) gir planer som står på siste dose som kan gis til
 *   avslutningen er vurdert, og stopper med forklaring og faktisk reduksjon når
 *   allerede første trinn ikke kan gis, med syntetiske preparater i FESTs form.
 *   Bare regler godkjent i testen gir en klinisk plan, og bare med fersk FEST.
 * - De nye reglene brukes bare av verktøyene, ikke av fortolkningen.
 *
 * Alle preparater og doser her er syntetiske; ingen pasientopplysninger.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dekningFor, dekningstekst, NEDTRAPPINGSDEKNING } from '../verktoy/dekning'
import { DEKNINGSRAPPORTFIL, lagDekningsrapport, seponeringsregler, stopOppforing } from '../verktoy/dekningsrapport'
import { begrunnelseshjelp, beregnPlan, inndataFor, kanKreveBegrunnelse, mangler, medRegel, TOMT_SKJEMA, type Planskjema } from '../verktoy/doseplan'
import { lesKartdata } from '../verktoy/kartdata'
import { markedsgrunnlag, preparaterFor } from '../verktoy/kartlegging'
import { beregnDoseplan, planform } from '../verktoy/motor/plan'
import { syntetiskUtvalg, type Testpreparat } from '../verktoy/motor/syntetisk'
import { VERKTOY, virkestoffvalg } from '../verktoy/register'
import { AVSLUTNING_FELLES, beregn, kortform, MINSTE_VISTE_MG, nulldagfeil, trinnTilHorisont, type Forlopsresultat, type Periode } from '../verktoy/regler/beregning'
import { erKliniskGodkjent } from '../verktoy/regler/godkjenning'
import { kontrollerRegelsett, lesKontrollgrunnlag } from '../verktoy/regler/kontroll'
import { apneValg, henvisninger, justerbare, nulltrinnfeil, type Beregningsinndata, type Nedtrappingsstrategi, type Regel } from '../verktoy/regler/modell'
import { NICE, PLANHORISONT_TRINN, RCPSYCH } from '../verktoy/regler/bygg'
import {
  JUSTERING,
  LANG_BEHANDLINGSTID,
  NEDTRAPPINGSSETT,
  ORGANFUNKSJON_ID,
  SAMMENLIGNINGSSETT,
  STARTFORSLAG,
  TEKNISK_MAKS_DAGER,
  TIDLIGERE_SYMPTOMER_ID,
  TIDLIGERE_VURDERT_ID,
  UTENFOR_DOSERAMME_ID,
} from '../verktoy/regler/nedtrapping'
import { PILOTSETT } from '../verktoy/regler/pilotsett'
import { REGELSETT, tilgjengelighet } from '../verktoy/tilgjengelighet'
import { godkjennITest, testFestFor, TESTKLOKKE } from './hjelp/verktoyplan'

const TRAPPE_NED = VERKTOY.find((v) => v.id === 'trappe-ned-antidepressiv')!
const KART = lesKartdata()
const P3 = lesKontrollgrunnlag()
const regel = (nokkel: string) => NEDTRAPPINGSSETT.regler.find((r) => r.id === `seponering-${nokkel}`)!
const P7SETT = [NEDTRAPPINGSSETT, SAMMENLIGNINGSSETT]
const P7REGLER = P7SETT.flatMap((s) => s.regler)
const BEREGNBARE = NEDTRAPPINGSSETT.regler.filter((r) => r.beregnbarhet !== 'bare_tekstlig')
const ANNENHVER_DAG = regel('fluoksetin-annenhver-dag')
const LANGSOMME = BEREGNBARE.filter((r) => r.id.endsWith('-langsom'))
/** Hovedregelen per stoff; hver har en langsom variant. */
const HOVEDREGLER = BEREGNBARE.filter((r) => r !== ANNENHVER_DAG && !LANGSOMME.includes(r))
/** Alle reglene som trapper ned prosentvis. */
const NEDTRAPPINGER = [...HOVEDREGLER, ...LANGSOMME]
const HYPERBOLSK = SAMMENLIGNINGSSETT.regler[0]!

/** Svarene på spørsmålene: kort behandlingstid og dose innenfor rammen, eller lang behandlingstid. */
const KORT = { [LANG_BEHANDLINGSTID.id]: false, [UTENFOR_DOSERAMME_ID]: false }
const LANG = { ...KORT, [LANG_BEHANDLINGSTID.id]: true }
const UTENFOR = { ...KORT, [UTENFOR_DOSERAMME_ID]: true }
/** En syntetisk begrunnelse; aldri pasientopplysninger. */
const BEGRUNNELSE = 'Syntetisk begrunnelse: kort behandlingstid og ingen tidligere seponeringssymptomer.'
const INGEN_REDUKSJON = /har regelen ingen reduksjon før avslutningen, og regelen har ingen godkjent avslutning; den må vurderes individuelt/
const UNDER_PRAKTISK = /ville neste trinn \([\d,]+ mg\) vært under [\d,]+ mg, den laveste dosen som kan gis med formuleringen regelen gjelder\. Regelen har ingen beregnede trinn under den/
/** Siste linje i hver plan uten nulltrinn. */
const AVSLUTNING = /; avslutning vurderes individuelt$/
const HORISONT = `teknisk planhorisont: ${PLANHORISONT_TRINN} reduksjoner; avslutning vurderes individuelt`

/** Inndata med startforslag og organfunksjon bekreftet, hvert unntak avkreftet, kort behandlingstid og dose innenfor rammen, som i eksemplene. */
const besvart = (r: Regel, startdose_mg: number, x: Partial<Beregningsinndata> = {}): Beregningsinndata => ({
  startdose_mg,
  bekreftet: r.bekreftelser.map((b) => b.id),
  pasientforhold: Object.fromEntries(r.unntak.map((u) => [u.id, false])),
  ...((r.sporsmal ?? []).length > 0 && { svar: { ...KORT } }),
  ...x,
})
const kort = (r: Regel, startdose_mg: number, x?: Partial<Beregningsinndata>) => kortform(beregn(r, besvart(r, startdose_mg, x)))
const stoppet = (r: Regel, startdose_mg: number, x?: Partial<Beregningsinndata>) => (kort(r, startdose_mg, x).stopp ?? []).join(' ')
/** Stiene til forskriverens valg i en P7-regel. */
const PROSENT = 'plan.forlop[0].faser[0].strategi.prosent'
const DAGER = 'plan.forlop[0].faser[0].trinnlengde'
/** Stoffene RCPsych regner med høyest potensiell risiko for seponeringssymptomer. */
const HOY_RISIKO = ['duloksetin', 'mirtazapin', 'moklobemid', 'paroksetin', 'venlafaksin']
const nokkel = (r: Regel) => (r.fra.type === 'virkestoff' ? r.fra.nokkel : '')
/**
 * En feilbygd variant av regelen som går via 0 mg og opp igjen: en vanlig
 * nedtrapping til 0, så 0 mg i 14 dager, opptrapping til 20 mg og til slutt
 * regelens egen nedtrapping med individuell avslutning.
 */
function viaNullFor(r: Regel): Regel {
  const x = structuredClone(r)
  const ned = x.plan.forlop[0]!.faser[0]!
  if (ned.type !== 'nedtrapping' || ned.strategi.type !== 'prosent_av_aktuell') throw new Error(r.id)
  const { avslutning: _a, horisont: _h, ...uten } = ned
  const dager = { ...ned.trinnlengde, verdi: 14 }
  const tilNull = { ...uten, strategi: { ...ned.strategi, sluttdose_mg: { ...dager, verdi: 2.5, enhet: 'mg' as const } } }
  x.plan.forlop[0]!.faser = [
    tilNull,
    { type: 'hold', dose: { type: 'aktuell' }, varighet: { type: 'dager', dager } },
    { type: 'opptrapping', trinn: [{ mg: { ...dager, verdi: 20, enhet: 'mg' }, dager }] },
    ned,
  ]
  return x
}
/** Den praktiske grensen i regelen: laveste dose formuleringen kan gi. */
const praktiskGrense = (r: Regel) => r.plan.forlop[0]!.dosevalg?.min_mg?.verdi

describe('Dekningen (P7.1)', () => {
  it('har hvert antidepressivum i verktøyet nøyaktig én gang, med raden i kildetabellen, og aldri johannesurt', () => {
    const valg = virkestoffvalg(TRAPPE_NED).map((v) => v.nokkel)
    expect(NEDTRAPPINGSDEKNING.map((d) => d.nokkel)).toEqual([...valg].sort())
    expect(NEDTRAPPINGSDEKNING).toHaveLength(23)
    expect(JSON.stringify(NEDTRAPPINGSDEKNING).toLowerCase()).not.toMatch(/johannes|hypericum|st\.? john/)
    for (const d of NEDTRAPPINGSDEKNING) {
      const rad = KART.kartlegging.kildeidentiteter.SwitchAntidepressants.find((i) => i.kode === d.kode)
      expect(rad, d.nokkel).toMatchObject({ type: 'virkestoff', virkestoff: d.nokkel })
    }
  })

  it('har Stop-oppføringen fra P3 for hvert stoff, og sier når den er utilgjengelig eller hentet fra en annen adresse', () => {
    for (const d of NEDTRAPPINGSDEKNING) {
      const stop = P3.kildeoppforinger.get(stopOppforing(d.kode))
      expect(stop, d.nokkel).toMatchObject({ type: 'seponering', fra: { virkestoffer: [d.nokkel] } })
      expect(d.forhold.includes('stop_utilgjengelig'), d.nokkel).toBe(stop!.tilgjengelighet === 'utilgjengelig')
      expect(d.forhold.includes('stop_alternativ_adresse'), d.nokkel).toBe(stop!.tilgjengelighet === 'alternativ_adresse')
    }
  })

  it('stemmer med de norske preparatene i FEST-uttrekket', () => {
    for (const d of NEDTRAPPINGSDEKNING) {
      const marked = markedsgrunnlag(preparaterFor(KART, d.nokkel))
      expect(d.forhold.includes('ingen_preparater'), d.nokkel).toBe(marked === 'ingen_preparater')
      expect(d.forhold.includes('bare_godkjenningsfritak'), d.nokkel).toBe(marked === 'kun_godkjenningsfritak')
    }
  })

  it('har en regel når statusen sier det, og ellers ingen: en Stop-oppføring alene gir aldri en regel', () => {
    for (const d of NEDTRAPPINGSDEKNING) {
      const regler = seponeringsregler(d.nokkel)
      if (d.status === 'regel_til_kontroll') {
        expect(regler.length, d.nokkel).toBeGreaterThan(0)
        for (const r of regler) expect(r.beregnbarhet, r.id).toBe('beregnbar_etter_avklaring')
      } else if (d.status === 'bare_fagtekst') {
        expect(regler.map((r) => r.beregnbarhet), d.nokkel).toEqual(['bare_tekstlig'])
      } else {
        expect(regler, d.nokkel).toEqual([])
      }
    }
    // Hver seponeringsregel for et antidepressivum står i dekningen.
    const dekket = new Set(NEDTRAPPINGSDEKNING.flatMap((d) => seponeringsregler(d.nokkel).map((r) => r.id)))
    expect(REGELSETT.regler.filter((r) => r.til === null && virkestoffvalg(TRAPPE_NED).some((v) => r.fra.type === 'virkestoff' && v.nokkel === r.fra.nokkel)).map((r) => r.id).sort()).toEqual([...dekket].sort())
  })

  it('gir verktøyet statusen: faglig kontroll gjenstår for stoffene med regel, og en forklaring for de andre', () => {
    for (const d of NEDTRAPPINGSDEKNING) {
      const t = tilgjengelighet(TRAPPE_NED, { fra: { nokkel: d.nokkel, formulering: 'standard' } })
      if (d.status === 'regel_til_kontroll' || d.status === 'bare_fagtekst') {
        expect(t.status, d.nokkel).toBe('til_kontroll')
      } else {
        expect(t, d.nokkel).toEqual({ status: 'ikke_stottet', regler: [], grunner: [dekningstekst(d)] })
        expect(t.grunner[0], d.nokkel).toMatch(/OUSFAR har derfor ingen regel/)
      }
    }
    expect(dekningFor(TRAPPE_NED, 'johannesurt')).toBeUndefined()
    expect(dekningFor(VERKTOY.find((v) => v.id === 'bytte-antidepressiv')!, 'dosulepin')).toBeUndefined()
  })

  it('matrisen er oppdatert', () => {
    expect(readFileSync(new URL(`../../${DEKNINGSRAPPORTFIL}`, import.meta.url), 'utf8'), 'Lag den på nytt med `npm run verktoy:regler -- rapport`.').toBe(lagDekningsrapport())
  })
})

describe('Regelutkastene (P7.2)', () => {
  it('består kontrollene: kilder, påstandsnære henvisninger, grunnlag og regneeksempler', () => {
    for (const sett of P7SETT) expect(kontrollerRegelsett(sett), sett.id).toEqual([])
    expect([HOVEDREGLER.length, LANGSOMME.length, NEDTRAPPINGSSETT.regler.length]).toEqual([14, 14, 31])
    expect(LANGSOMME.map((r) => r.id)).toEqual(HOVEDREGLER.map((r) => `${r.id}-langsom`))
    expect(NEDTRAPPINGSSETT.regler.filter((r) => r.beregnbarhet === 'bare_tekstlig').map((r) => r.id)).toEqual(['seponering-bupropion', 'seponering-agomelatin'])
    expect(SAMMENLIGNINGSSETT.regler.map((r) => r.id)).toEqual(['seponering-citalopram-hyperbolsk'])
    // Escitalopram er flyttet fra pilotsettet til P7; appen bruker begge, og ingen regel-ID finnes i begge.
    expect(PILOTSETT.regler.map((r) => r.id)).not.toContain('seponering-escitalopram')
    expect(regel('escitalopram').godkjenning.historikk.at(-2)!.merknad).toMatch(/fagkontrollen 30\.10\.2026/)
    expect(new Set(REGELSETT.regler.map((r) => r.id)).size).toBe(REGELSETT.regler.length)
  })

  it('er ikke godkjent: alle er til faglig kontroll, valgområdene er avklart i fagkontrollene, og planhorisonten og startdosen står åpne', () => {
    for (const r of P7REGLER) {
      expect(erKliniskGodkjent(r), r.id).toBe(false)
      expect(r.godkjenning.historikk.every((s) => s.status !== 'klinisk_godkjent'), r.id).toBe(true)
    }
    // Også agomelatins tekstregel, som fagkontrollen sa kan godkjennes faglig: statusen settes ikke av OUSFAR Dev.
    for (const r of NEDTRAPPINGSSETT.regler) expect(r.godkjenning.status, r.id).toBe('til_faglig_kontroll')
    // Reglene er omarbeidet etter hver kontroll og sendt til kontroll på nytt hver gang; de nye reglene er versjon 1.
    const steg = (n: number) => Array.from({ length: n }, (_, i) => [`utkast ${i + 1}`, `til_faglig_kontroll ${i + 1}`]).flat()
    const historikk = (r: Regel) => [r.versjon, r.godkjenning.historikk.map((s) => `${s.status} ${s.regelversjon}`)]
    for (const r of HOVEDREGLER) expect(historikk(r), r.id).toEqual([5, steg(5)])
    for (const r of [...LANGSOMME, ANNENHVER_DAG]) expect(historikk(r), r.id).toEqual([1, steg(1)])
    for (const r of BEREGNBARE) {
      expect(r.godkjenning.historikk.at(-2)!.merknad, r.id).toMatch(/^(Omarbeidet etter|Ny regel etter) fagkontrollen 30\.10\.2026/)
      expect(r.godkjenning.historikk.at(-1)!.dato, r.id).toBe('2026-10-30')
      // Valgområdene (prosent og dager, med kravene om begrunnelse) er avklart av den uavhengige kontrolløren for denne versjonen.
      for (const [sti, p] of justerbare(r)) {
        const g = p.grunnlag
        expect(g.type === 'ousfar_vurdering' && g.avklaring, `${r.id} ${sti}`).toMatchObject({ rolle: 'uavhengig_kontrollor', regelversjon: r.versjon, merknad: expect.stringMatching(/^(Beslutning 1 i fagvurderingen 29\.10|Fagkontrollen 30\.10\.2026, Beslutning)/) })
      }
    }
    // Bare den tekniske planhorisonten og startdosen står åpne; resten er avklart.
    for (const r of NEDTRAPPINGER) expect(apneValg(r), r.id).toEqual(['plan.forlop[0].faser[0].horisont (åpent forslag)', 'inndata.startdose (åpent forslag)'])
    expect(apneValg(ANNENHVER_DAG)).toEqual([])
  })

  it('viser bare til sin egen Stop-oppføring, og Psychiatrienet er aldri grunnlag', () => {
    for (const r of P7REGLER) {
      const d = NEDTRAPPINGSDEKNING.find((x) => r.fra.type === 'virkestoff' && x.nokkel === r.fra.nokkel)!
      expect(r.referanser, r.id).toEqual([{ kilde: 'psychiatrienet', kildeoppforing: stopOppforing(d.kode) }])
      const utenReferanser = JSON.stringify({ ...r, referanser: [] })
      expect(utenReferanser, r.id).not.toMatch(/"kilde":"psychiatrienet"/)
    }
  })

  it('gir bare et startforslag: det må bekreftes sammen med organfunksjon og interaksjoner, begge spørsmålene må besvares, og etter tidligere seponeringssymptomer gjelder den langsomme varianten', () => {
    for (const r of NEDTRAPPINGER) {
      const langsom = LANGSOMME.includes(r)
      expect(r.bekreftelser.map((b) => b.id), r.id).toEqual([STARTFORSLAG.id, ORGANFUNKSJON_ID, ...(langsom ? [TIDLIGERE_VURDERT_ID] : [])])
      expect(r.unntak.some((u) => u.id === TIDLIGERE_SYMPTOMER_ID), r.id).toBe(!langsom)
      expect(r.sporsmal?.map((s) => s.id), r.id).toEqual([LANG_BEHANDLINGSTID.id, UTENFOR_DOSERAMME_ID])
      const dose = r.eksempler.find((e) => !e.stopp)!.inndata.startdose_mg
      expect(kort(r, dose).fra!.at(-1), r.id).toMatch(AVSLUTNING)
      expect(stoppet(r, dose, { bekreftet: [] }), r.id).toMatch(/Må bekreftes før beregning: Planen er et startforslag/)
      expect(stoppet(r, dose, { bekreftet: [STARTFORSLAG.id] }), r.id).toMatch(/Må bekreftes før beregning: Lever- og nyrefunksjon og interaksjoner er vurdert\./)
      if (langsom) {
        expect(stoppet(r, dose, { bekreftet: [STARTFORSLAG.id, ORGANFUNKSJON_ID] }), r.id).toMatch(/Må bekreftes før beregning: Et tidligere forsøk .* har gitt symptomer som forskriveren har vurdert som seponeringssymptomer/)
      } else {
        expect(stoppet(r, dose, { pasientforhold: {} }), r.id).toMatch(/Må avklares før beregning \(ukjent\): Et tidligere forsøk/)
        expect(stoppet(r, dose, { pasientforhold: { ...besvart(r, dose).pasientforhold, [TIDLIGERE_SYMPTOMER_ID]: true } }), r.id).toMatch(/Regelen gjelder ikke: Et tidligere forsøk .*; da gjelder den langsomme varianten av regelen\./)
      }
      const ubesvart = stoppet(r, dose, { svar: {} })
      expect(ubesvart, r.id).toMatch(/Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger\?/)
      expect(ubesvart, r.id).toMatch(/Må besvares før beregning: Er dosen utenfor preparatomtalens doseramme/)
      expect(stoppet(r, dose, { svar: { ...KORT, annet: true } }), r.id).toBe('Svaret «annet» gjelder ikke et spørsmål i regelen.')
    }
    // Svaret står i planen.
    const res = beregn(regel('sertralin'), besvart(regel('sertralin'), 100, { svar: LANG, justert: { [PROSENT]: 10 } }))
    expect(res.status === 'modellberegning' && res.kontroller).toContainEqual({ krav: `${LANG_BEHANDLINGSTID.tekst} Ja`, oppfylt: true, detalj: 'Oppgitt av forskriveren.' })
    // Startforslaget er den felles håndteringsregelen fra fagvurderingen, med NICEs og RCPsychs råd.
    expect(STARTFORSLAG.grunnlag).toEqual({ type: 'kilde', henvisninger: [NICE.tempo, NICE.alvorlig, RCPSYCH.tid, RCPSYCH.smaa] })
    expect(STARTFORSLAG.tekst).toMatch(/dagene per trinn er minstetider\. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet/)
    expect(STARTFORSLAG.tekst).toMatch(/beregnes en ny plan fra dosen pasienten da bruker/)
    expect(LANG_BEHANDLINGSTID.grunnlag).toEqual({ type: 'kilde', henvisninger: [RCPSYCH.langvarig, RCPSYCH.fireUker, NICE.halveringstid] })
    // Unntaket, den langsomme varianten og organfunksjonen er avklart i fagkontrollen 30.10.2026.
    const c = regel('citalopram')
    expect(c.unntak[0]!.grunnlag).toMatchObject({ type: 'ousfar_vurdering', avklaring: { dato: '2026-10-30', merknad: expect.stringMatching(/Beslutning 5\.6: en egen langsom variant/) } })
    expect(c.bekreftelser[1]!.grunnlag).toMatchObject({ type: 'ousfar_vurdering', avklaring: { dato: '2026-10-30', merknad: expect.stringMatching(/organfunksjon og interaksjoner må vurderes for alle stoffer/) } })
    // Moklobemid har i tillegg et unntak ved alvorlig nedsatt leverfunksjon, der preparatomtalen reduserer dosen; det gjelder også den langsomme varianten.
    for (const r of [regel('moklobemid'), regel('moklobemid-langsom')]) {
      expect(stoppet(r, 300, { pasientforhold: { ...besvart(r, 300).pasientforhold, nedsatt_leverfunksjon: true } }), r.id).toMatch(/Regelen gjelder ikke: Pasienten har alvorlig nedsatt leverfunksjon/)
    }
  })

  it('krever begrunnelse for en dose utenfor rammen for indikasjon eller pasientgruppe, og regner da som ellers', () => {
    const krever = 'Svaret ja (dose utenfor rammen for indikasjon eller pasientgruppe) krever en skriftlig begrunnelse fra forskriveren, en særskilt vurdering. Skriv begrunnelsen, eller vurder om regelen passer.'
    for (const r of NEDTRAPPINGER) {
      const dose = r.eksempler.find((e) => !e.stopp)!.inndata.startdose_mg
      expect(stoppet(r, dose, { svar: UTENFOR }), r.id).toBe(krever)
      expect(stoppet(r, dose, { svar: UTENFOR, begrunnelse: '  ' }), r.id).toBe(krever)
      expect(kort(r, dose, { svar: UTENFOR, begrunnelse: BEGRUNNELSE }), r.id).toEqual(kort(r, dose))
    }
    // Svaret og begrunnelsen står i planen.
    const res = beregn(regel('citalopram'), besvart(regel('citalopram'), 20, { svar: UTENFOR, begrunnelse: BEGRUNNELSE }))
    expect(res.status === 'modellberegning' && res.kontroller.map((k) => k.krav).join(' | ')).toMatch(/Er dosen utenfor preparatomtalens doseramme.* Ja/)
    // Startdosen kan fortsatt ikke være over preparatomtalens høyeste døgndose, heller ikke med begrunnelse.
    expect(stoppet(regel('citalopram'), 40.01, { svar: UTENFOR, begrunnelse: BEGRUNNELSE })).toMatch(/utenfor det regelen gjelder for \(høyst 40 mg\)/)
  })

  it('har ingen fast nedre grense: en teknisk planhorisont, og praktiske grenser bare der formuleringen setter dem', () => {
    for (const r of [...NEDTRAPPINGER, HYPERBOLSK]) {
      const fase = r.plan.forlop[0]!.faser[0]!
      if (fase.type !== 'nedtrapping') throw new Error(r.id)
      expect([fase.avslutning, fase.minste_varighet, fase.horisont?.verdi, fase.horisont?.enhet], r.id).toEqual(['individuell', undefined, PLANHORISONT_TRINN, 'trinn'])
      // Horisonten er et teknisk valg, ikke en klinisk grense, og står åpen.
      expect(fase.horisont!.grunnlag, r.id).toMatchObject({ type: 'ousfar_vurdering', avklaring: null })
      expect(fase.strategi.type === 'prosent_av_aktuell' && fase.strategi.sluttdose_mg, r.id).toBe(r === HYPERBOLSK ? false : undefined)
    }
    expect(Object.fromEntries(NEDTRAPPINGER.flatMap((r) => (praktiskGrense(r) === undefined ? [] : [[r.id, praktiskGrense(r)]])))).toEqual({
      'seponering-duloksetin': 30,
      'seponering-duloksetin-langsom': 30,
      'seponering-venlafaksin': 37.5,
      'seponering-venlafaksin-langsom': 37.5,
    })
    for (const r of [regel('duloksetin'), regel('venlafaksin')]) {
      const min = r.plan.forlop[0]!.dosevalg!.min_mg!
      expect(min.art, r.id).toBe('bindende_krav')
      expect(min.grunnlag, r.id).toMatchObject({ type: 'ousfar_vurdering', avklaring: { merknad: expect.stringMatching(/Beslutning 3: ingen fast klinisk nedre grense/) } })
    }
  })

  it('stopper planen ved horisonten, ved den praktiske grensen, ved minste viste dose eller ved strategiens siste trinn før null', () => {
    const s: Nedtrappingsstrategi = { type: 'prosent_av_aktuell', prosent: { verdi: 10, enhet: 'prosent', art: 'veiledende_preferanse', grunnlag: { type: 'kilde', henvisninger: [] } } }
    const tolvte = 100 * 0.9 ** 12
    // Akkurat 12 reduksjoner til horisonten; med horisont 11 og 13 én færre eller flere.
    for (const h of [11, 12, 13]) expect(trinnTilHorisont(s, 100, h).serie, String(h)).toHaveLength(h)
    expect(trinnTilHorisont(s, 100, 12)).toMatchObject({ slutt: 'horisont' })
    expect(trinnTilHorisont(s, 100, 12).neste).toBeCloseTo(100 * 0.9 ** 13)
    // Er 12. trinn akkurat lik den praktiske grensen, er horisonten nådd; like over den stopper planen ved den praktiske grensen etter 11.
    expect(trinnTilHorisont(s, 100, 12, tolvte)).toMatchObject({ slutt: 'horisont' })
    expect(trinnTilHorisont(s, 100, 12, tolvte + 0.001)).toMatchObject({ slutt: 'praktisk_grense' })
    expect(trinnTilHorisont(s, 100, 12, tolvte + 0.001).serie).toHaveLength(11)
    // Den minste dosen beregningen viser, 0,01 mg: aldri «0 mg».
    expect(MINSTE_VISTE_MG).toBe(0.01)
    expect(trinnTilHorisont({ ...s, prosent: { ...s.prosent, verdi: 50 } }, 0.04, 12)).toMatchObject({ serie: [0.02, 0.01], slutt: 'minste_viste_dose' })
    expect(kort(regel('fluoksetin'), 20, { justert: { [PROSENT]: 50 }, begrunnelse: BEGRUNNELSE }).fra!.slice(-2)).toEqual(['fra dag 253: 0,02 mg', 'teknisk grense: ingen trinn under 0,01 mg; avslutning vurderes individuelt'])
    // En strategi som når 0 av seg selv (den hyperbolske i sammenligningssettet), stopper på siste trinn før null.
    expect(kortform(beregn(HYPERBOLSK, { startdose_mg: 20 })).fra!.slice(-2)).toEqual(['fra dag 85: 0,41 mg', 'siste trinn før null; avslutning vurderes individuelt'])
  })

  it('holder ved den praktiske grensen: ingen beregnede trinn under 37,5 mg venlafaksin eller 30 mg duloksetin', () => {
    // 10 %: 41,67 mg gir 37,503 mg (over 37,5 mg); 41,66 mg gir 37,494 mg (under).
    expect(kort(regel('venlafaksin'), 41.67).fra).toEqual(['fra dag 1: 37,5 mg', 'praktisk grense: ingen trinn under 37,5 mg; avslutning vurderes individuelt'])
    expect(stoppet(regel('venlafaksin'), 41.66)).toMatch(UNDER_PRAKTISK)
    expect(stoppet(regel('venlafaksin'), 37.5)).toMatch(/Fra 37,5 mg av venlafaksin ville neste trinn \(33,75 mg\) vært under 37,5 mg/)
    // 10 %: 33,34 mg gir 30,006 mg; 33,33 mg gir 29,997 mg.
    expect(kort(regel('duloksetin'), 33.34).fra).toEqual(['fra dag 1: 30,01 mg', 'praktisk grense: ingen trinn under 30 mg; avslutning vurderes individuelt'])
    expect(stoppet(regel('duloksetin'), 33.33)).toMatch(UNDER_PRAKTISK)
    // Den langsomme varianten har samme grense: 5 % fra 39,48 mg gir 37,506 mg; fra 39,47 mg 37,4965 mg.
    expect(kort(regel('venlafaksin-langsom'), 39.48).fra![0]).toBe('fra dag 1: 37,51 mg')
    expect(stoppet(regel('venlafaksin-langsom'), 39.47)).toMatch(UNDER_PRAKTISK)
    // Fra høyeste dose når planen horisonten før grensen; fra 60 mg duloksetin grensen etter 6 reduksjoner.
    expect(kort(regel('venlafaksin'), 375).fra!.at(-1)).toBe(HORISONT)
    expect(kort(regel('duloksetin'), 60).fra!.slice(-2)).toEqual(['fra dag 141: 31,89 mg', 'praktisk grense: ingen trinn under 30 mg; avslutning vurderes individuelt'])
    // De andre stoffene har ingen praktisk grense i regelen: lave doser beregnes.
    expect(kort(regel('sertralin'), 6.24).fra![0]).toBe('dag 1–28: 4,68 mg')
    expect(kort(regel('paroksetin'), 2).fra![0]).toBe('dag 1–28: 1,8 mg')
  })

  it('fortsetter fra faktisk dose: 5 % per trinn fra 2,5 mg citalopram når om lag 1 mg etter 18 reduksjoner, over to planer', () => {
    const forste = kort(regel('citalopram'), 2.5, { justert: { [PROSENT]: 5 } }).fra!
    expect(forste).toHaveLength(PLANHORISONT_TRINN + 1)
    expect(forste.slice(-2)).toEqual(['fra dag 309: 1,35 mg', HORISONT])
    // Ny plan fra dosen pasienten da bruker: reduksjon 18 er 0,99 mg.
    expect(kort(regel('citalopram'), 1.35, { justert: { [PROSENT]: 5 } }).fra![5]).toBe('dag 141–168: 0,99 mg')
    expect(Math.round(2.5 * 0.95 ** 18 * 100) / 100).toBe(0.99)
  })

  it('følger risikogruppene fra fagvurderingen: 10 % (5–10 %) og minst 28 dager ved høyest risiko, ellers 25 % (5–50 %) og minst 14 dager (28 for fluoksetin)', () => {
    expect(HOVEDREGLER.filter((r) => r.tittel.includes('høy risiko')).map(nokkel)).toEqual(HOY_RISIKO)
    for (const r of HOVEDREGLER) {
      const n = nokkel(r)
      const hoy = HOY_RISIKO.includes(n)
      const dose = r.inndata[0]!.omrade![1]
      expect(kort(r, dose).fra![0], r.id).toBe(`dag 1–28: ${String(Math.round(dose * (hoy ? 0.9 : 0.75) * 100) / 100).replace('.', ',')} mg`)
      const valg = justerbare(r).map(([sti, p]) => [sti, p.verdi, p.omrade, p.teknisk_maks ?? false])
      expect(valg, r.id).toEqual([
        [PROSENT, hoy ? 10 : 25, hoy ? [5, 10] : [5, 50], false],
        [DAGER, 28, [hoy || n === 'fluoksetin' ? 28 : 14, TEKNISK_MAKS_DAGER], true],
      ])
      // Risikogruppen er det RCPsych oppgir for stoffet; NICEs særlige varsomhet gjelder bare paroksetin og venlafaksin.
      expect(henvisninger(r), r.id).toContainEqual(hoy ? RCPSYCH.hoyRisiko : RCPSYCH.middelsRisiko)
      expect(henvisninger(r), r.id).not.toContainEqual(hoy ? RCPSYCH.middelsRisiko : RCPSYCH.hoyRisiko)
      expect(henvisninger(r).some((h) => h.faktum === NICE.saerligRisiko.faktum), r.id).toBe(['paroksetin', 'venlafaksin'].includes(n))
      const fase = r.plan.forlop[0]!.faser[0]!
      const strategi = fase.type === 'nedtrapping' ? fase.strategi : null
      // Mindre trinn ved lav dose bare når en større reduksjon kan velges; ikke ved høyest risiko eller for fluoksetin.
      expect(strategi?.type === 'prosent_av_aktuell' && strategi.lav_prosent?.verdi, r.id).toBe(hoy || n === 'fluoksetin' ? undefined : 25)
    }
    for (const n of HOY_RISIKO) expect(RCPSYCH.hoyRisiko.faktum, n).toContain(n)
    expect(RCPSYCH.middelsRisiko.faktum).toMatch(/lav har blant andre vortioksetin/)
  })

  it('har en langsom variant for hvert stoff etter tidligere seponeringssymptomer: 1–5 % (standard 5 %) og minst 28 dager, uten begrunnelse som åpner for mer', () => {
    for (const r of LANGSOMME) {
      const valg = justerbare(r).map(([sti, p]) => [sti, p.verdi, p.omrade, p.teknisk_maks ?? false])
      expect(valg, r.id).toEqual([
        [PROSENT, 5, [1, 5], false],
        [DAGER, 28, [28, TEKNISK_MAKS_DAGER], true],
      ])
      const dose = r.eksempler.find((e) => !e.stopp)!.inndata.startdose_mg
      expect(kort(r, dose).fra![0], r.id).toBe(`dag 1–28: ${String(Math.round(dose * 0.95 * 100) / 100).replace('.', ',')} mg`)
      for (const prosent of [1, 5]) expect(stoppet(r, dose, { justert: { [PROSENT]: prosent } }), `${r.id} ${prosent}`).toBe('')
      for (const prosent of [0.99, 5.01]) {
        expect(stoppet(r, dose, { justert: { [PROSENT]: prosent }, begrunnelse: BEGRUNNELSE }), `${r.id} ${prosent}`).toBe(`${JUSTERING.prosent}: ${String(prosent).replace('.', ',')} % er utenfor det regelen tillater (1–5 %).`)
      }
      expect(stoppet(r, dose, { justert: { [DAGER]: 27 }, begrunnelse: BEGRUNNELSE }), r.id).toMatch(/27 dager er utenfor det regelen tillater \(minst 28 dager/)
      expect(stoppet(r, dose, { svar: LANG }), r.id).toBe('')
    }
    // Appen viser begge reglene for stoffet, så forskriveren velger varianten.
    expect(tilgjengelighet(TRAPPE_NED, { fra: { nokkel: 'paroksetin', formulering: 'standard' } }).regler.map((r) => r.id)).toEqual(['seponering-paroksetin', 'seponering-paroksetin-langsom'])
    expect(kort(regel('citalopram-langsom'), 20, { justert: { [PROSENT]: 1 } }).fra!.slice(0, 2)).toEqual(['dag 1–28: 19,8 mg', 'dag 29–56: 19,6 mg'])
  })

  it('bygger trinnlengden på RCPsychs to til fire uker, og NICEs én til to uker bare på fluoksetin', () => {
    const ANTIDEPRESSIVA = ['kryssnedtrapping-sertralin-mirtazapin', 'mao-fluoksetin-fenelzin']
    const pilot = PILOTSETT.regler.filter((r) => ANTIDEPRESSIVA.includes(r.id))
    expect(pilot.map((r) => r.id)).toEqual(ANTIDEPRESSIVA)
    for (const r of [...HOVEDREGLER, ...pilot, HYPERBOLSK]) {
      for (const f of r.plan.forlop) {
        for (const fase of f.faser) {
          if (fase.type !== 'nedtrapping' || fase.trinnlengde.grunnlag.type !== 'ousfar_vurdering') continue
          const kilder = fase.trinnlengde.grunnlag.henvisninger ?? []
          const fluoksetin = f.virkestoff.type === 'virkestoff' && f.virkestoff.nokkel === 'fluoksetin'
          expect(kilder, r.id).toContainEqual(fluoksetin ? RCPSYCH.fluoksetin : RCPSYCH.tid)
          expect(kilder.some((h) => 'sted' in h && h.sted.startsWith('anbefaling 1.4.18')), r.id).toBe(fluoksetin)
        }
      }
    }
    // Pilotreglene beholder sine trinnlengder: 14 dager (7–14 ved bytte), og fluoksetins fire uker uten valg før MAO-hemmeren.
    const trinn = (r: Regel) => r.plan.forlop[0]!.faser.flatMap((f) => (f.type === 'nedtrapping' ? [[f.trinnlengde.verdi, f.trinnlengde.omrade]] : []))
    expect([HYPERBOLSK, ...pilot].map(trinn)).toEqual([[[14, [14, 28]]], [[14, [7, 14]]], [[28, undefined]]])
    expect('sted' in NICE.fluoksetinVurdering && NICE.fluoksetinVurdering.sted).toBe('anbefaling 1.4.18 (om fluoksetin)')
  })

  it('har den hyperbolske citalopramregelen bare i sammenligningssettet, og paroksetins studievariant ikke i noe sett', () => {
    expect(REGELSETT.regler.map((r) => r.id)).not.toContain(HYPERBOLSK.id)
    expect(tilgjengelighet(TRAPPE_NED, { fra: { nokkel: 'citalopram', formulering: 'standard' } }).regler.map((r) => r.id)).toEqual(['seponering-citalopram', 'seponering-citalopram-langsom'])
    expect(HYPERBOLSK.godkjenning.status).toBe('utkast')
    expect(HYPERBOLSK.godkjenning.historikk.at(-1)).toMatchObject({ status: 'utkast', regelversjon: HYPERBOLSK.versjon, merknad: expect.stringMatching(/ikke godkjent som valgbar klinisk strategi/) })
    for (const r of [...REGELSETT.regler, ...P7REGLER]) expect(r.id, r.id).not.toMatch(/studievariant/)
    // Studiene står bare som historisk bakgrunn i paroksetinregelen, og beregnes ikke.
    expect(regel('paroksetin').fortolkning.tilpasninger.map((t) => t.tekst).join(' ')).toMatch(/ikke en anbefaling, og den beregnes ikke/)
  })

  it('krever begrunnelse ved raske valg, ved grensene, og ikke ellers', () => {
    const krever = /krever en skriftlig begrunnelse fra forskriveren/
    // Middels risiko: over 25 %, og etter lang behandlingstid over 10 % eller under 28 dager.
    for (const n of ['amitriptylin', 'citalopram', 'escitalopram', 'fluvoksamin', 'klomipramin', 'nortriptylin', 'sertralin']) {
      const r = regel(n)
      const d = r.inndata[0]!.omrade![1]
      expect(stoppet(r, d, { justert: { [PROSENT]: 25 } }), n).toBe('')
      expect(stoppet(r, d, { justert: { [PROSENT]: 25.01 } }), n).toMatch(krever)
      expect(stoppet(r, d, { justert: { [PROSENT]: 25.01 }, begrunnelse: BEGRUNNELSE }), n).toBe('')
      expect(stoppet(r, d, { justert: { [PROSENT]: 50 }, begrunnelse: '   ' }), n).toMatch(krever)
      expect(stoppet(r, d, { svar: LANG, justert: { [PROSENT]: 10 } }), n).toBe('')
      expect(stoppet(r, d, { svar: LANG, justert: { [PROSENT]: 10.01 } }), n).toMatch(krever)
      expect(stoppet(r, d, { svar: LANG }), n).toMatch(/Reduksjon per trinn \(% av aktuell dose\) 25 % krever en skriftlig begrunnelse fra forskriveren \(over 10 % ved lang behandlingstid\)/)
      expect(stoppet(r, d, { svar: LANG, justert: { [PROSENT]: 10, [DAGER]: 27 } }), n).toBe(`${JUSTERING.dager} 27 dager krever en skriftlig begrunnelse fra forskriveren (under 28 dager ved lang behandlingstid). Skriv begrunnelsen, eller velg en annen verdi.`)
      expect(stoppet(r, d, { justert: { [DAGER]: 14 } }), n).toBe('')
      expect(stoppet(r, d, { justert: { [DAGER]: 13 } }), n).toBe(`${JUSTERING.dager}: 13 dager er utenfor det regelen tillater (minst 14 dager, av tekniske grunner høyst 365 dager).`)
    }
    // Høyest risiko: 5–10 % og minst 28 dager; ingen begrunnelse kan åpne for mer.
    for (const n of HOY_RISIKO) {
      const r = regel(n)
      const d = r.inndata[0]!.omrade![1]
      expect(stoppet(r, d, { svar: LANG, justert: { [PROSENT]: 5, [DAGER]: 28 } }), n).toBe('')
      expect(stoppet(r, d, { justert: { [PROSENT]: 10.01 }, begrunnelse: BEGRUNNELSE }), n).toBe(`${JUSTERING.prosent}: 10,01 % er utenfor det regelen tillater (5–10 %).`)
      expect(stoppet(r, d, { justert: { [DAGER]: 27 }, begrunnelse: BEGRUNNELSE }), n).toMatch(/27 dager er utenfor det regelen tillater \(minst 28 dager/)
    }
    // Fluoksetin: over 25 % krever begrunnelse; lang behandlingstid alene gjør ikke det, og trinnene er minst 28 dager.
    const f = regel('fluoksetin')
    expect(stoppet(f, 40, { svar: LANG })).toBe('')
    expect(stoppet(f, 40, { justert: { [PROSENT]: 25.01 } })).toMatch(krever)
    expect(stoppet(f, 40, { justert: { [DAGER]: 27 } })).toMatch(/27 dager er utenfor/)
    // Lav risiko (vortioksetin): over 25 %, og under 28 dager etter lang behandlingstid.
    const v = regel('vortioksetin')
    expect(stoppet(v, 20, { svar: LANG })).toBe('')
    expect(stoppet(v, 20, { justert: { [PROSENT]: 25.01 } })).toMatch(krever)
    expect(stoppet(v, 20, { svar: LANG, justert: { [DAGER]: 27 } })).toMatch(krever)
    expect(stoppet(v, 20, { justert: { [DAGER]: 14 } })).toBe('')
    // Begrunnelsen står i planen som en kontroll, sammen med valget.
    const res = beregn(regel('sertralin'), besvart(regel('sertralin'), 100, { justert: { [PROSENT]: 50 }, begrunnelse: ` ${BEGRUNNELSE} ` }))
    expect(res.status === 'modellberegning' && res.kontroller.filter((k) => /forskriveren|begrunnelse/.test(k.krav))).toEqual([
      { krav: `${JUSTERING.prosent} er valgt av forskriveren innenfor regelens område`, oppfylt: true, detalj: '50 % i stedet for regelens forslag 25 %; regelen tillater 5–50 %.' },
      { krav: `${JUSTERING.prosent}: 50 % krever begrunnelse (over 25 %)`, oppfylt: true, detalj: `Forskriverens begrunnelse: «${BEGRUNNELSE}».` },
    ])
  })

  it('lar forskriveren velge trinnstørrelse og trinnlengde bare innenfor regelens områder, og viser valget', () => {
    const s = regel('sertralin')
    // Grensene for reduksjonen er med; rett utenfor stopper.
    expect(kort(s, 100, { justert: { [PROSENT]: 5 } }).fra!.slice(0, 2)).toEqual(['dag 1–28: 95 mg', 'dag 29–56: 90,25 mg'])
    expect(kort(s, 100, { justert: { [PROSENT]: 50 }, begrunnelse: BEGRUNNELSE }).fra![0]).toBe('dag 1–28: 50 mg')
    expect(stoppet(s, 100, { justert: { [PROSENT]: 4.99 } })).toBe(`${JUSTERING.prosent}: 4,99 % er utenfor det regelen tillater (5–50 %).`)
    expect(stoppet(s, 100, { justert: { [PROSENT]: 50.01 } })).toMatch(/50,01 % er utenfor det regelen tillater/)
    // Trinnlengden har ingen klinisk øvre grense, bare en teknisk; deler av dager stopper.
    expect(kort(s, 100, { justert: { [DAGER]: 14 } }).fra![0]).toBe('dag 1–14: 75 mg')
    expect(kort(s, 100, { justert: { [DAGER]: 365 } }).fra!.slice(0, 2)).toEqual(['dag 1–365: 75 mg', 'dag 366–730: 56,25 mg'])
    expect(stoppet(s, 100, { justert: { [DAGER]: 366 } })).toMatch(/366 dager er utenfor det regelen tillater \(minst 14 dager, av tekniske grunner høyst 365 dager\)/)
    expect(stoppet(s, 100, { justert: { [DAGER]: 14.5 } })).toMatch(/14,5 dager kan ikke brukes; regelen tillater hele dager/)
    // Det som ikke er justerbart, kan ikke endres: planhorisonten.
    expect(stoppet(s, 100, { justert: { 'plan.forlop[0].faser[0].horisont': 20 } })).toMatch(/kan ikke justeres i denne regelen/)
    // Valget står som kontroll i resultatet; regelens forslag gir ingen.
    const valgt = (x: Record<string, number>) => {
      const res = beregn(s, besvart(s, 100, { justert: x }))
      return res.status === 'modellberegning' ? res.kontroller.filter((k) => /forskriveren/.test(k.krav)) : null
    }
    expect(valgt({ [PROSENT]: 10, [DAGER]: 42 })).toEqual([
      { krav: `${JUSTERING.prosent} er valgt av forskriveren innenfor regelens område`, oppfylt: true, detalj: '10 % i stedet for regelens forslag 25 %; regelen tillater 5–50 %.' },
      { krav: `${JUSTERING.dager} er valgt av forskriveren innenfor regelens område`, oppfylt: true, detalj: '42 dager i stedet for regelens forslag 28 dager; regelen tillater minst 14 dager, av tekniske grunner høyst 365 dager.' },
    ])
    expect(valgt({ [PROSENT]: 25, [DAGER]: 28 })).toEqual([])
    // Regelen selv endres ikke av valget.
    expect(s.plan.forlop[0]!.faser[0]!.type === 'nedtrapping' && s.plan.forlop[0]!.faser[0]!.trinnlengde.verdi).toBe(28)
  })

  it('bruker aldri et større trinn ved lav dose enn forskriveren har valgt', () => {
    // Fra laveste døgndose er trinnet høyst 25 %: med 50 % valgt blir det 25 %, med 10 % valgt 10 %.
    expect(kort(regel('sertralin'), 20, { justert: { [PROSENT]: 50 }, begrunnelse: BEGRUNNELSE }).fra![0]).toBe('dag 1–28: 15 mg')
    expect(kort(regel('sertralin'), 20, { justert: { [PROSENT]: 10 } }).fra!.slice(0, 2)).toEqual(['dag 1–28: 18 mg', 'dag 29–56: 16,2 mg'])
    // Like over grensen for lav dose er trinnet 50 %, ved grensen 25 %.
    expect(kort(regel('sertralin'), 25.02, { justert: { [PROSENT]: 50 }, begrunnelse: BEGRUNNELSE }).fra![0]).toBe('dag 1–28: 12,51 mg')
    expect(kort(regel('sertralin'), 25, { justert: { [PROSENT]: 50 }, begrunnelse: BEGRUNNELSE }).fra![0]).toBe('dag 1–28: 18,75 mg')
  })

  it('går aldri til null og foreslår aldri siste dose: hver plan står på siste beregnede dose, og avslutningen vurderes individuelt', () => {
    for (const r of [...P7REGLER, ...REGELSETT.regler.filter((x) => x.plan.form === 'seponering')]) {
      for (const e of r.eksempler.filter((x) => !x.stopp)) {
        const res = beregn(r, e.inndata)
        const linjer = kortform(res).fra!
        expect(linjer.at(-1), `${r.id} ${e.id}`).toMatch(AVSLUTNING)
        expect(linjer.at(-2), `${r.id} ${e.id}`).toMatch(/^fra dag \d+: [\d,]+ mg( annenhver dag)?$/)
        expect(linjer.join(' '), `${r.id} ${e.id}`).not.toMatch(/seponert|0 mg$/)
        // Siste beregnede dose er ikke «siste dose før seponering», og planen har ingen dato for siste dose.
        expect(res.merknader, `${r.id} ${e.id}`).toContainEqual(expect.stringContaining(AVSLUTNING_FELLES))
        expect(res.status === 'modellberegning' && res.forlop.map((f) => f.siste_dosedag), `${r.id} ${e.id}`).toEqual([null])
      }
    }
    expect(AVSLUTNING_FELLES).toMatch(/^Siste beregnede dose er ikke nødvendigvis den siste dosen pasienten trenger før seponering\. Planen går ikke til null og foreslår ingen dato for siste dose/)
    // Heller ikke ved grensene og med de minste og største trinnene: ingen beregning gir seponering.
    for (const r of NEDTRAPPINGER) {
      const [, maks] = r.inndata[0]!.omrade!
      const [lavest, hoyest] = justerbare(r)[0]![1].omrade
      for (const dose of [maks, 1, 0.05, 0.01])
        for (const prosent of [lavest, hoyest]) {
          const res = beregn(r, besvart(r, dose, { justert: { [PROSENT]: prosent }, begrunnelse: BEGRUNNELSE }))
          if (res.status === 'modellberegning') expect(res.forlop.map((f) => f.siste_dosedag), `${r.id} ${dose} ${prosent}`).toEqual([null])
          else expect(res.stoppgrunner.join(' '), `${r.id} ${dose} ${prosent}`).toMatch(praktiskGrense(r) ? UNDER_PRAKTISK : INGEN_REDUKSJON)
        }
    }
  })

  it('godtar ingen seponeringsregel som går til null, og krever en planhorisont uten sluttdose når avslutningen er individuell', () => {
    const sett = (x: Regel) => ({ ...NEDTRAPPINGSSETT, regler: [x] })
    const variant = (endre: (f: Extract<Regel['plan']['forlop'][number]['faser'][number], { type: 'nedtrapping' }>) => void) => {
      const r = structuredClone(regel('citalopram'))
      const fase = r.plan.forlop[0]!.faser[0]!
      if (fase.type !== 'nedtrapping' || fase.strategi.type !== 'prosent_av_aktuell') throw new Error()
      endre(fase)
      return kontrollerRegelsett(sett(r)).join(' ')
    }
    const utenAvslutning = variant((f) => delete f.avslutning)
    expect(utenAvslutning).toMatch(/forløp fra slutter ikke med en nedtrapping med individuell avslutning eller en intervalldosering; ingen avslutning er godkjent, så en seponeringsregel kan ikke gå til null/)
    expect(utenAvslutning).toMatch(/har en planhorisont uten individuell avslutning/)
    expect(utenAvslutning).toMatch(/trapper ned prosentvis uten sluttdose og uten individuell avslutning; dosen når aldri 0/)
    expect(variant((f) => delete f.horisont)).toMatch(/har individuell avslutning uten teknisk planhorisont/)
    expect(variant((f) => f.strategi.type === 'prosent_av_aktuell' && (f.strategi.sluttdose_mg = { ...f.horisont!, verdi: 2.5, enhet: 'mg' }))).toMatch(/har både sluttdose og individuell avslutning; ingen nedre grense for beregnede trinn er godkjent/)
    expect(variant((f) => (f.minste_varighet = { verdi: 28, enhet: 'dager', art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [RCPSYCH.fireUker] } }))).toMatch(/har både minste varighet og individuell avslutning/)
    expect(variant((f) => (f.horisont = { ...f.horisont!, enhet: 'dager' }))).toMatch(/horisont er ugyldig: enheten er dager, men horisont skal være i trinn/)
    expect(variant(() => undefined)).toBe('')
    // Et begrunnelseskrav må ha en grense innenfor området og vise til et spørsmål regelen har.
    const k = structuredClone(regel('sertralin'))
    const p = justerbare(k)[0]![1]
    p.begrunnelseskrav = [{ over: 60, ved: 'ukjent', grunnlag: p.grunnlag }, { grunnlag: p.grunnlag }]
    const feil = kontrollerRegelsett(sett(k)).join(' ')
    expect(feil).toMatch(/begrunnelseskrav\[0\] har en grense utenfor området 5–50/)
    expect(feil).toMatch(/begrunnelseskrav\[0\] gjelder spørsmålet ukjent, som regelen ikke har/)
    expect(feil).toMatch(/begrunnelseskrav\[1\] har verken over eller under/)
  })

  it('godtar ingen annen vei til null i en beregnbar seponeringsregel: ingen seponering, ingen nedtrapping før den siste, og ingen fase etter den', () => {
    const sett = (x: Regel) => ({ ...NEDTRAPPINGSSETT, regler: [x] })
    const med = (faser: (f: Regel['plan']['forlop'][number]['faser']) => Regel['plan']['forlop'][number]['faser'], r0 = regel('citalopram')) => {
      const r = structuredClone(r0)
      r.plan.forlop[0]!.faser = faser(r.plan.forlop[0]!.faser)
      return r
    }
    const SLUTTER_IKKE = 'slutter ikke med en nedtrapping med individuell avslutning eller en intervalldosering'
    // Seponering fra dag 1 i stedet for nedtrappingen, seponering etter den, og en fase etter den som holder dosen og så slutter.
    const direkte = med(() => [{ type: 'seponer' }])
    expect(nulltrinnfeil(direkte)).toEqual([
      'forløp fra seponerer; ingen avslutning er godkjent, så en seponeringsregel kan ikke seponere',
      `forløp fra ${SLUTTER_IKKE}; ingen avslutning er godkjent, så en seponeringsregel kan ikke gå til null`,
    ])
    expect(kontrollerRegelsett(sett(direkte)).join(' ')).toMatch(/forløp fra seponerer/)
    expect(nulltrinnfeil(med((f) => [...f, { type: 'seponer' }])).join(' ')).toMatch(new RegExp(`seponerer.*${SLUTTER_IKKE}`))
    expect(nulltrinnfeil(med((f) => [...f, { type: 'hold', dose: { type: 'aktuell' }, varighet: { type: 'dager', dager: f[0]!.type === 'nedtrapping' ? f[0]!.trinnlengde : null! } }])).join(' ')).toMatch(new RegExp(`trapper ned før siste fase.*${SLUTTER_IKKE}`))
    // Intervalldoseringen fortsetter uten null, men ikke med en seponering etter seg.
    expect(nulltrinnfeil(ANNENHVER_DAG)).toEqual([])
    expect(nulltrinnfeil(med((f) => [...f, { type: 'seponer' }], ANNENHVER_DAG)).join(' ')).toMatch(new RegExp(`seponerer.*${SLUTTER_IKKE}`))
    // Et gruppemedlems egne faser gjelder like mye.
    const gruppe = { ...structuredClone(regel('citalopram')), medlemmer: [{ nokkel: 'citalopram', validering: 'validert' as const, begrunnelse: 'Syntetisk.', faser: [{ type: 'seponer' as const }] }] }
    gruppe.plan.forlop[0]!.virkestoff = { type: 'gruppe', gruppe: 'test' }
    expect(nulltrinnfeil(gruppe)).toHaveLength(2)
    expect(nulltrinnfeil(gruppe)[0]).toMatch(/^forløp fra for citalopram seponerer/)
    // Godkjent i testen med riktig fingeravtrykk er regelen likevel ikke klinisk godkjent, og beregningen er ikke klinisk.
    const godkjent = godkjennITest(direkte, 'test-direkte')
    expect(godkjent.godkjenning.status).toBe('klinisk_godkjent')
    expect(erKliniskGodkjent(godkjent)).toBe(false)
    expect(beregn(godkjent, besvart(godkjent, 20)).klinisk_godkjent).toBe(false)
    // For en godkjent regel kontrollerer beregningen i tillegg selve planen, uavhengig av hvordan regelen er bygd: ingen dag uten dose, og ingen slutt.
    const forlop = (perioder: Periode[], siste_dosedag: number | null = null): Forlopsresultat => ({ id: 'fra', virkestoff: 'x', administrasjon: 'peroral', start: 1, perioder, injeksjoner: [], siste_dosedag })
    expect(nulldagfeil([forlop([{ fra: 1, til: 28, mg: 10 }, { fra: 29, til: null, mg: 5 }])])).toEqual([])
    expect(nulldagfeil([forlop([{ fra: 1, til: null, mg: 20, hver: 2 }])])).toEqual([])
    expect(nulldagfeil([forlop([{ fra: 1, til: 28, mg: 10 }, { fra: 43, til: null, mg: 5 }])])).toEqual(['fra er uten dose før dag 43, men regelen har ingen godkjent avslutning'])
    expect(nulldagfeil([forlop([{ fra: 2, til: null, mg: 5 }])])).toEqual(['fra er uten dose før dag 2, men regelen har ingen godkjent avslutning'])
    for (const x of [forlop([{ fra: 1, til: 28, mg: 10 }], 28), forlop([], 0), forlop([{ fra: 1, til: 28, mg: 10 }])]) {
      expect(nulldagfeil([x])).toEqual(['fra går til 0 mg, men regelen har ingen godkjent avslutning'])
    }
    // Via 0 mg og opp igjen: en vanlig nedtrapping til 0, så 0 mg i 14 dager, opptrapping og til slutt en nedtrapping med individuell avslutning.
    const viaNull = viaNullFor(regel('citalopram'))
    expect(nulltrinnfeil(viaNull)).toEqual(['forløp fra trapper ned før siste fase; bare siste fase kan trappe ned, så forløpet aldri er på 0 mg underveis'])
    expect(kontrollerRegelsett(sett(viaNull)).join(' ')).toMatch(/forløp fra trapper ned før siste fase/)
    const viaNullGodkjent = godkjennITest(viaNull, 'test-via-null')
    expect(viaNullGodkjent.godkjenning.status).toBe('klinisk_godkjent')
    expect(erKliniskGodkjent(viaNullGodkjent)).toBe(false)
    const res = beregn(viaNullGodkjent, besvart(viaNullGodkjent, 20))
    expect(res.klinisk_godkjent).toBe(false)
    expect(kortform(res).stopp!.join(' ')).toMatch(/0 mg/)
    // Tillatt: seponering ved bytte (før et annet legemiddel), og en regel som bare er tekstlig.
    for (const r of [...PILOTSETT.regler.filter((x) => x.plan.form !== 'seponering'), regel('agomelatin'), regel('bupropion')]) expect(nulltrinnfeil(r), r.id).toEqual([])
    expect(PILOTSETT.regler.some((x) => x.plan.form !== 'seponering' && x.plan.forlop.some((f) => f.faser.some((fase) => fase.type === 'seponer')))).toBe(true)
    // Og alle de virkelige seponeringsreglene oppfyller kravet.
    for (const r of [...P7REGLER, ...PILOTSETT.regler]) expect(nulltrinnfeil(r), r.id).toEqual([])
  })

  it('gjelder enhver dose over 0 opp til høyeste dose, også lave restdoser, uten å kalle en lav dose ugyldig', () => {
    for (const r of NEDTRAPPINGER) {
      const [min, maks] = r.inndata[0]!.omrade!
      expect(min, r.id).toBe(0)
      expect(stoppet(r, maks), r.id).toBe('')
      expect(stoppet(r, maks + 0.01), r.id).toMatch(new RegExp(`utenfor det regelen gjelder for \\(høyst ${String(maks).replace('.', ',')} mg\\)`))
      expect(stoppet(r, 0), r.id).toMatch(/Startdosen må være et positivt tall/)
      for (const dose of [0.01, 0.5, 2]) expect(stoppet(r, dose), `${r.id} ${dose}`).not.toMatch(/utenfor|nedre grense/)
    }
    expect(kort(regel('sertralin'), 12.5).fra!.slice(0, 2)).toEqual(['dag 1–28: 9,38 mg', 'dag 29–56: 7,03 mg'])
    expect(kort(regel('nortriptylin'), 15).fra!.slice(-2)).toEqual(['fra dag 309: 0,48 mg', HORISONT])
    expect(kort(regel('venlafaksin'), 20).fra).toBeUndefined()
    expect(stoppet(regel('citalopram'), 0.01)).toMatch(INGEN_REDUKSJON)
    // Ved høyest risiko er trinnet 10 % i hele doseområdet.
    expect(kort(regel('moklobemid'), 300).fra![0]).toBe('dag 1–28: 270 mg')
    expect(kort(regel('moklobemid'), 600).fra![0]).toBe('dag 1–28: 540 mg')
  })

  it('tåler stresstesten fra fagvurderingen: 5 % per trinn fra 20 mg paroksetin gir 12 reduksjoner til horisonten og ingen nulltrinn', () => {
    const linjer = kort(regel('paroksetin'), 20, { justert: { [PROSENT]: 5 } }).fra!
    expect(linjer).toHaveLength(PLANHORISONT_TRINN + 1)
    expect(linjer.slice(-2)).toEqual(['fra dag 309: 10,81 mg', HORISONT])
    // Lengre trinn enn 28 dager, f.eks. for å fange opp sene symptomer etter fluoksetin.
    expect(kort(regel('fluoksetin'), 20, { justert: { [DAGER]: 42 } }).fra!.slice(0, 2)).toEqual(['dag 1–42: 15 mg', 'dag 43–84: 11,25 mg'])
  })

  it('gir fluoksetin 20 mg annenhver dag som egen valgfri regel: bare fra 20 mg daglig, i minst 28 dager, og uten automatisk seponering', () => {
    const r = ANNENHVER_DAG
    expect(r.inndata[0]!.verdier).toEqual([20])
    expect(r.bekreftelser.map((b) => b.id)).toEqual([ORGANFUNKSJON_ID, 'revurdering'])
    expect(kort(r, 20).fra).toEqual(['fra dag 1: 20 mg annenhver dag', 'annenhver dag i minst 28 dager; avslutning vurderes individuelt'])
    expect(stoppet(r, 40)).toBe('Startdosen 40 mg er utenfor det regelen gjelder for (20 mg).')
    expect(stoppet(r, 10)).toMatch(/utenfor det regelen gjelder for \(20 mg\)/)
    // Minstetiden kan forlenges, ikke kortes ned.
    const [sti] = justerbare(r)[0]!
    expect(kort(r, 20, { justert: { [sti]: 42 } }).fra!.at(-1)).toBe('annenhver dag i minst 42 dager; avslutning vurderes individuelt')
    expect(stoppet(r, 20, { justert: { [sti]: 27 } })).toMatch(/27 dager er utenfor det regelen tillater \(minst 28 dager/)
    // Bare fluoksetin har regelen.
    expect(NEDTRAPPINGSSETT.regler.filter((x) => x.plan.forlop.some((f) => f.faser.some((fase) => fase.type === 'intervalldosering'))).map((x) => x.id)).toEqual([r.id])
    const res = beregn(r, besvart(r, 20))
    expect(res.status === 'modellberegning' && res.forlop[0]!.perioder).toEqual([{ fra: 1, til: null, mg: 20, hver: 2 }])
    expect(res.merknader.join(' ')).toMatch(/planen gjør ingen ny reduksjon av seg selv/)
  })

  it('har bupropion og agomelatin bare som fagtekst, uten beregning', () => {
    for (const n of ['bupropion', 'agomelatin']) {
      const r = regel(n)
      expect(r.beregnbarhet, n).toBe('bare_tekstlig')
      expect(stoppet(r, r.inndata[0]!.omrade![0]), n).toMatch(/bare tekstlig/)
    }
    // Bupropion finnes bare som depottabletter, som ikke kan deles: ingen trinn under 150 mg, og prosentregelen kan ikke beregnes.
    expect(regel('bupropion').plan.forlop[0]!.faser).toEqual([expect.objectContaining({ type: 'uten_beregning' })])
    expect(regel('bupropion').godkjenning.historikk.at(-2)!.merknad).toMatch(/fagkontrollen 30\.10\.2026/)
    expect(NEDTRAPPINGSDEKNING.find((d) => d.nokkel === 'bupropion')!.status).toBe('bare_fagtekst')
  })
})

/* --- Doseplanene med syntetiske preparater ---------------------------------------- */

const p = (id: string, form: Testpreparat['form'], mg: number, x: Partial<Testpreparat> = {}): Testpreparat => ({ id, virkestoff: 'testoksetin', varenavn: `Syntetisk ${id}`, form, mg, ...x })
const OMGIVELSE = { idag: '2026-11-01', naa: '2026-11-01T12:00:00Z' }
const TABLETTER = { fra: { klasse: 'peroral' as const, legemiddelformer: ['SYN-TAB'] } }

/** Planen etter regelen (ikke godkjent: en modellberegning), med syntetiske preparater for virkestoffet. */
function beregnet(r: Regel | string, startdose_mg: number, preparater: Testpreparat[], formvalg?: Record<string, { klasse: 'peroral'; legemiddelformer: string[] }>, x: Partial<Beregningsinndata> = {}) {
  const rr = typeof r === 'string' ? regel(r) : r
  const grunnlag = { utvalg: syntetiskUtvalg(preparater), koblinger: { [nokkel(rr)]: ['ID_SYNTETISK-TESTOKSETIN'] }, overstyringer: [] }
  return beregnDoseplan(rr, { ...besvart(rr, startdose_mg, x), ...(formvalg && { formvalg }) }, grunnlag, OMGIVELSE)
}
const plan = (...x: Parameters<typeof beregnet>) => planform(beregnet(...x))
const stopp = (...x: Parameters<typeof beregnet>) => (plan(...x).stopp ?? []).join(' ')
const merknader = (...x: Parameters<typeof beregnet>) => beregnet(...x).merknader.join(' ')
/** Halvering med begrunnelse, så alle trinnene kan gis med delbare tabletter. */
const HALVERING = { justert: { [PROSENT]: 50 }, begrunnelse: BEGRUNNELSE }

const SERTRALIN = [p('S25', 'tablett', 25), p('S50', 'tablett', 50, { deling: '2' }), p('S100', 'tablett', 100, { deling: '2' })]
const FLUOKSETIN = [p('F20', 'tablett', 20, { deling: '4' })]
const NAERMESTE = /kan ikke gis med preparatene i FEST nøyaktig\. Nærmeste doser som kan settes sammen: .*En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv\./
const KAN_IKKE_GIS = 'neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt'

describe('Doseplanene (P7.3–P7.4)', () => {
  it('gir en plan med alle trinnene som kan gis, og står på siste dose som kan gis til avslutningen er vurdert', () => {
    expect(plan('fluoksetin', 40, FLUOKSETIN, undefined, HALVERING)).toEqual({
      fra: ['dag 1–28: 20 mg = 1 tablett à 20 mg', 'dag 29–56: 10 mg = ½ tablett à 20 mg', 'fra dag 57: 5 mg = ¼ tablett à 20 mg', KAN_IKKE_GIS],
    })
    // Forklaringen sier hvilket trinn som ikke kan gis, hvor planen stopper, og at siste dose ikke er siste dose før seponering.
    const m = merknader('fluoksetin', 40, FLUOKSETIN, undefined, HALVERING)
    expect(m).toMatch(/fluoksetin dag 85–112: den ideelle dosen 2,5 mg kan ikke gis med preparatene i FEST nøyaktig/)
    expect(m).toMatch(/Planen stopper derfor ved trinnet før: fra dag 57 står pasienten på 5 mg av fluoksetin til planen revurderes\./)
    expect(m).toContain(AVSLUTNING_FELLES)
    expect(m).not.toMatch(/Planen viser \d+ reduksjoner/)
  })

  it('stopper ved trinnet før når et senere trinn ikke kan gis, uten å runde av til en styrke', () => {
    // Sertralin 100 mg: 75 mg kan gis, men 56,25 mg ikke; planen står på 75 mg.
    expect(plan('sertralin', 100, SERTRALIN)).toEqual({ fra: ['fra dag 1: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg', KAN_IKKE_GIS] })
    expect(merknader('sertralin', 100, SERTRALIN)).toMatch(/sertralin dag 29–56: den ideelle dosen 56,25 mg kan ikke gis.*50 mg \(-11,11 %\) og 75 mg \(\+33,33 %\)/)
    // Klomipramin 100 mg: 75 mg går med tre 25 mg-tabletter, men 56,25 mg kan ikke gis med hele og halve 10 og 25 mg-tabletter.
    expect(plan('klomipramin', 100, [p('K10', 'tablett', 10, { deling: '2' }), p('K25', 'tablett', 25, { deling: '2' })])).toEqual({ fra: ['fra dag 1: 75 mg = 3 tabletter à 25 mg', KAN_IKKE_GIS] })
    // Med kvartdelbare 25 mg-tabletter kan ett trinn til gis.
    expect(plan('sertralin', 100, [p('S25', 'tablett', 25, { deling: '4' })]).fra).toEqual(['dag 1–28: 75 mg = 3 tabletter à 25 mg', 'fra dag 29: 56,25 mg = 2¼ tabletter à 25 mg', KAN_IKKE_GIS])
  })

  it('stopper med forklaring, nærmeste doser og faktisk reduksjon når allerede første trinn ikke kan gis', () => {
    // Duloksetin finnes i 30 og 60 mg, og kapsler deles ikke: 10 % mindre kan ikke gis, og ingen trinn under 30 mg.
    expect(stopp('duloksetin', 60, [p('D30', 'kapsel', 30), p('D60', 'kapsel', 60)])).toMatch(/dag 1–28: den ideelle dosen 54 mg kan ikke gis med preparatene i FEST nøyaktig og ikke under 30 mg\. Nærmeste doser som kan settes sammen: 30 mg \(-44,44 %, faktisk reduksjon 50 % fra 60 mg\) og 60 mg \(\+11,11 %\)/)
    expect(stopp('duloksetin', 90, [p('D30', 'kapsel', 30), p('D60', 'kapsel', 60)])).toMatch(/den ideelle dosen 81 mg kan ikke gis.*60 mg \(-25,93 %, faktisk reduksjon 33,33 % fra 90 mg\) og 90 mg \(\+11,11 %\)/)
    // Venlafaksin 150 mg: 135 mg kan ikke gis; heller ikke 67,5 mg fra 75 mg.
    expect(stopp('venlafaksin', 150, [p('V37', 'kapsel', 37.5), p('V75', 'kapsel', 75), p('V150', 'kapsel', 150)])).toMatch(/dag 1–28: den ideelle dosen 135 mg kan ikke gis.*112,5 mg \(-16,67 %, faktisk reduksjon 25 % fra 150 mg\)/)
    expect(stopp('venlafaksin', 75, [p('V37', 'kapsel', 37.5), p('V75', 'kapsel', 75)])).toMatch(/den ideelle dosen 67,5 mg kan ikke gis.*og ikke under 37,5 mg.*37,5 mg \(-44,44 %, faktisk reduksjon 50 % fra 75 mg\)/)
    // Paroksetin 40 mg med delbare 20 mg-tabletter: 36 mg kan ikke gis.
    expect(stopp('paroksetin', 40, [p('P20', 'tablett', 20, { deling: '2' })])).toMatch(/dag 1–28: den ideelle dosen 36 mg kan ikke gis.*30 mg \(-16,67 %, faktisk reduksjon 25 % fra 40 mg\) og 40 mg \(\+11,11 %\)/)
    // Fra en uvanlig startdose: de nærmeste dosene, uten å avvike fra regelen; og bare en større dose når ingen mindre kan gis.
    const s = stopp('sertralin', 50, SERTRALIN)
    expect(s).toMatch(/dag 1–28: den ideelle dosen 37,5 mg kan ikke gis.*25 mg \(-33,33 %, faktisk reduksjon 50 % fra 50 mg\) og 50 mg \(\+33,33 %\)/)
    expect(s).toMatch(NAERMESTE)
    expect(stopp('vortioksetin', 5, [p('V5', 'tablett', 5), p('V10', 'tablett', 10)])).toMatch(/dag 1–28: den ideelle dosen 3,75 mg kan ikke gis.*Nærmeste doser som kan settes sammen: 5 mg \(\+33,33 %\)\. En annen dose/)
    expect(plan('sertralin', 250, SERTRALIN).stopp).toEqual(['Startdosen 250 mg er utenfor det regelen gjelder for (høyst 200 mg).'])
  })

  it('deler bare tabletter FEST oppgir som delbare', () => {
    expect(plan('fluoksetin', 40, [p('F20', 'tablett', 20, { deling: '2' })], undefined, HALVERING).fra).toEqual(['dag 1–28: 20 mg = 1 tablett à 20 mg', 'fra dag 29: 10 mg = ½ tablett à 20 mg', KAN_IKKE_GIS])
    for (const prep of [p('F20', 'tablett', 20), p('F20K', 'kapsel', 20)]) {
      expect(plan('fluoksetin', 40, [prep], undefined, HALVERING).fra, prep.id).toEqual([`fra dag 1: 20 mg = 1 ${prep.form} à 20 mg`, KAN_IKKE_GIS])
      expect(merknader('fluoksetin', 40, [prep], undefined, HALVERING), prep.id).toMatch(/dag 29–56: den ideelle dosen 10 mg kan ikke gis.*20 mg \(\+100 %\)/)
    }
  })

  it('bruker dråper når de er valgt, men ikke en mikstur uten doseringsoppløsning', () => {
    const DRAPER = p('FD', 'draper', 20, { nevner: { verdi: 1, enhet: 'ml' }, per_drape: 1 })
    const MIKSTUR = p('SM', 'mikstur', 20, { nevner: { verdi: 1, enhet: 'ml' } })
    expect(plan('fluoksetin', 20, [DRAPER], { fra: { klasse: 'peroral', legemiddelformer: ['SYN-DRAP'] } }, HALVERING).fra).toEqual(['dag 1–28: 10 mg = 10 dråper à 1 mg', 'fra dag 29: 5 mg = 5 dråper à 1 mg', KAN_IKKE_GIS])
    expect(stopp('sertralin', 50, [...SERTRALIN, MIKSTUR], { fra: { klasse: 'peroral', legemiddelformer: ['SYN-MIKST'] } })).toMatch(/flytende \(20 mg\/ml\) uten dokumentert doseringsoppløsning/)
    // Uten valg brukes tablettene, og miksturen blir ikke tatt med.
    const s = stopp('sertralin', 50, [...SERTRALIN, MIKSTUR])
    expect(s).toMatch(/dag 1–28: den ideelle dosen 37,5 mg kan ikke gis/)
    expect(s).not.toMatch(/flytende/)
  })

  it('gir fluoksetin annenhver dag med én tablett eller kapsel, aldri 0 mg', () => {
    const r = ANNENHVER_DAG
    for (const prep of [p('F20', 'tablett', 20, { deling: '4' }), p('F20K', 'kapsel', 20)]) {
      expect(plan(r, 20, [prep]).fra, prep.id).toEqual([`fra dag 1: 20 mg annenhver dag = 1 ${prep.form} à 20 mg`, 'annenhver dag i minst 28 dager; avslutning vurderes individuelt'])
    }
    expect(stopp(r, 20, [p('F10', 'tablett', 10)])).toBe('')
    expect(plan(r, 20, [p('F10', 'tablett', 10)]).fra![0]).toBe('fra dag 1: 20 mg annenhver dag = 2 tabletter à 10 mg')
  })

  it('stopper den hyperbolske citalopramregelen i sammenligningssettet når tablettene ikke gir trinnet', () => {
    const s = stopp(HYPERBOLSK, 20, [p('C10', 'tablett', 10), p('C20', 'tablett', 20, { deling: '2' })])
    expect(s).toMatch(/dag 1–14: den ideelle dosen 10,08 mg kan ikke gis/)
    expect(s).toMatch(NAERMESTE)
  })
})

describe('Klinisk plan i appen', () => {
  const valg = { fra: { nokkel: 'fluoksetin', formulering: 'standard' as const } }
  const skjema = (startdose: string, x: Partial<Planskjema> = {}): Planskjema => ({
    ...TOMT_SKJEMA,
    startdose,
    bekreftet: [STARTFORSLAG.id, ORGANFUNKSJON_ID],
    pasientforhold: { [TIDLIGERE_SYMPTOMER_ID]: false },
    svar: { ...KORT },
    justert: { [PROSENT]: '50' },
    begrunnelse: BEGRUNNELSE,
    formvalg: { fra: { klasse: 'peroral', legemiddelform: TABLETTER.fra.legemiddelformer[0] } },
    ...x,
  })
  const GODKJENT = godkjennITest(regel('fluoksetin'), 'test-fluoksetin')
  const NAA = TESTKLOKKE()
  const fest = (kontroll?: Parameters<typeof testFestFor>[2]) => testFestFor('fluoksetin', FLUOKSETIN, kontroll)

  it('gir ingen plan etter et regelutkast, selv med fersk FEST', () => {
    const r = beregnPlan(regel('fluoksetin'), valg, skjema('40'), fest(), NAA)
    expect(r.status).toBe('stoppet')
    expect(r.status === 'stoppet' && r.stoppgrunner.join(' ')).toMatch(/Ingen klinisk doseplan.*ikke klinisk godkjent/)
  })

  it('gir en klinisk plan bare etter en regel godkjent i testen, med fersk FEST, bekreftelser, svar og begrunnelse, og oppgir regelsettet', () => {
    const r = beregnPlan(GODKJENT, valg, skjema('40'), fest(), NAA)
    expect(r).toMatchObject({ status: 'doseplan', klinisk: true })
    expect(planform(r).fra).toEqual(['dag 1–28: 20 mg = 1 tablett à 20 mg', 'dag 29–56: 10 mg = ½ tablett à 20 mg', 'fra dag 57: 5 mg = ¼ tablett à 20 mg', KAN_IKKE_GIS])
    expect(r.status === 'doseplan' && r.merknader.join(' ')).toMatch(/Planen stopper derfor ved trinnet før: fra dag 57 står pasienten på 5 mg av fluoksetin/)
    expect(beregnPlan(regel('fluoksetin'), valg, skjema('40'), fest(), NAA).regelsett).toEqual({ id: NEDTRAPPINGSSETT.id, versjon: NEDTRAPPINGSSETT.versjon })
    const ufullstendige: Partial<Planskjema>[] = [
      { bekreftet: [] },
      { bekreftet: [STARTFORSLAG.id] },
      { pasientforhold: {} },
      { pasientforhold: { [TIDLIGERE_SYMPTOMER_ID]: true } },
      { svar: {} },
      { svar: { ...UTENFOR }, begrunnelse: '', justert: {} },
      { begrunnelse: ' ' },
    ]
    for (const x of ufullstendige) {
      expect(beregnPlan(GODKJENT, valg, skjema('40', x), fest(), NAA).status, JSON.stringify(x)).toBe('stoppet')
    }
  })

  it('gir ingen plan etter en regel som seponerer direkte eller går via 0 mg, selv om den er merket klinisk godkjent med riktig fingeravtrykk', () => {
    const direkte = structuredClone(regel('fluoksetin'))
    direkte.plan.forlop[0]!.faser = [{ type: 'seponer' }]
    for (const [r, grunn] of [
      [direkte, /Ingen klinisk doseplan.*forløp fra seponerer/],
      [viaNullFor(regel('fluoksetin')), /^Beregningen ga en ugyldig plan: fra har perioden dag \d+–\d+ med 0 mg\.$/],
    ] as const) {
      const res = beregnPlan(godkjennITest(r, 'test-feilbygd'), valg, skjema('40'), fest(), NAA)
      expect(res.status).toBe('stoppet')
      expect(res.status === 'stoppet' && res.stoppgrunner.join(' | ')).toMatch(grunn)
    }
  })

  it('tar med forskriverens valg, svar og begrunnelse, sier fra om et valg som ikke er et tall over 0, og glemmer alt med en annen strategi', () => {
    expect(mangler(GODKJENT, skjema('40', { justert: { [PROSENT]: '0' } }))).toEqual([`${JUSTERING.prosent} må være et tall større enn 0, eller stå tomt for regelens forslag.`])
    expect(mangler(GODKJENT, skjema('40', { justert: { [PROSENT]: ' ' } }))).toEqual([])
    const inn = inndataFor(GODKJENT, valg, skjema('40', { justert: { [PROSENT]: '25,5', [DAGER]: '42' }, svar: { ...LANG, annet: true }, begrunnelse: `  ${BEGRUNNELSE}\n` }))
    expect([inn.justert, inn.svar, inn.begrunnelse]).toEqual([{ [PROSENT]: 25.5, [DAGER]: 42 }, LANG, BEGRUNNELSE])
    // Et valg for en verdi regelen ikke lar forskriveren justere, tas ikke med, og en tom begrunnelse heller ikke.
    expect(inndataFor(GODKJENT, valg, skjema('40', { justert: { 'plan.forlop[0].faser[0].horisont': '20', [PROSENT]: '' }, begrunnelse: ' ' }))).not.toHaveProperty('justert')
    expect(inndataFor(GODKJENT, valg, skjema('40', { begrunnelse: ' ' }))).not.toHaveProperty('begrunnelse')
    // Godkjenningen gjelder området, så valget gir en klinisk beregning; med 25 % kan 22,5 mg ikke gis, og planen står på 30 mg.
    const r = beregnPlan(GODKJENT, valg, skjema('40', { justert: { [PROSENT]: '25' } }), fest(), NAA)
    expect(r).toMatchObject({ status: 'doseplan', klinisk: true })
    expect(planform(r).fra).toEqual(['fra dag 1: 30 mg = 1½ tabletter à 20 mg', KAN_IKKE_GIS])
    expect(r.status === 'doseplan' && r.merknader.join(' ')).toMatch(/dag 29–56: den ideelle dosen 22,5 mg kan ikke gis/)
    // Skjemaet viser begrunnelsesfeltet også når bare svaret om doserammen kan kreve det, og sier når det kreves.
    expect(kanKreveBegrunnelse(ANNENHVER_DAG)).toBe(true)
    expect(begrunnelseshjelp(ANNENHVER_DAG)).toBe('dose utenfor rammen for indikasjon eller pasientgruppe')
    expect(begrunnelseshjelp(regel('sertralin'))).toMatch(/over 25 %.*; dose utenfor rammen for indikasjon eller pasientgruppe$/)
    expect(inndataFor(ANNENHVER_DAG, valg, skjema('20', { svar: UTENFOR, begrunnelse: BEGRUNNELSE })).begrunnelse).toBe(BEGRUNNELSE)
    const annen = medRegel(skjema('40', { justert: { [PROSENT]: '25' } }), 'en-annen-strategi')
    expect([annen.justert, annen.svar, annen.begrunnelse]).toEqual([{}, {}, ''])
  })

  it('gir ingen plan med en foreldet FEST-kopi', () => {
    const r = beregnPlan(GODKJENT, valg, skjema('40'), fest({ kontrollert_kl: '2026-10-29T04:20:00Z' }), NAA)
    expect(r.status).toBe('stoppet')
    expect(r.status === 'stoppet' && r.stoppgrunner.join(' ')).toMatch(/sist kontrollert mot FEST/)
    expect(r.status === 'stoppet' && r.stoppgrunner.join(' ')).not.toMatch(/ikke klinisk godkjent/)
  })
})

describe('Fortolkningen', () => {
  it('bruker ikke de nye reglene eller dekningen; bare verktøyene gjør det', () => {
    const rot = new URL('../', import.meta.url).pathname
    const filer = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const sti = join(dir, f)
        return statSync(sti).isDirectory() ? filer(sti) : /\.tsx?$/.test(f) ? [sti] : []
      })
    const brukere = filer(rot)
      .map((f) => relative(rot, f))
      .filter((f) => !f.startsWith('__tests__/') && /(?:regler\/nedtrapping|\/dekning|['"]\.\/dekning)['"]/.test(readFileSync(join(rot, f), 'utf8')))
    expect(brukere.every((f) => f.startsWith('verktoy/') || f.startsWith('components/verktoy/')), brukere.join(', ')).toBe(true)
    expect(brukere).toContain('verktoy/tilgjengelighet.ts')
  })
})
