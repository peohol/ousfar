/**
 * «Trappe ned antidepressiv» (P7 i `docs/verktøy-utviklingsplan.md`):
 *
 * - Dekningen (P7.1) har hvert antidepressivum i kildetabellen, uten
 *   johannesurt, med Stop-oppføringen fra P3, og statusen stemmer med
 *   regelsettet, P3-kildeoppføringene og FEST-uttrekket.
 * - Regelutkastene (P7.2, regelversjon 6 etter substanskontrollen 30.10.2026,
 *   runde 3) består kontrollene, viser til sin egen Stop-oppføring og er
 *   startforslag med minstetider som må bekreftes sammen med organfunksjon og
 *   interaksjoner, med svar om behandlingstid, doseramme og stoffets egne
 *   spørsmål om pasientgruppe og indikasjon. Bare tekstreglene for bupropion
 *   (versjon 5) og agomelatin (versjon 1) er klinisk godkjent, med
 *   kontrollørens fingeravtrykk. Valgene følger risikogruppene (høyest risiko
 *   5–10 % og minst 28 dager, ellers standard 25 % og minst 14 dager, 28 for
 *   fluoksetin), og den langsomme varianten etter tidligere
 *   seponeringssymptomer har 1–5 % og minst 28 dager, testet ved grensene.
 *   Startdosen stopper over preparatomtalens høyeste voksendose og ved
 *   grensene for pasientgruppe og indikasjon; en forsiktighetsgrense krever
 *   begrunnelse; under 18 år, akutte forhold, ustabil dose og
 *   kontraindikasjoner stopper. Ingen plan går til null: planen viser høyst 12
 *   reduksjoner (6 i de langsomme variantene), avrunder hvert trinn til den
 *   viste dosen og stopper når neste reduksjon forsvinner i avrundingen.
 *   Fluoksetin 20 mg annenhver dag er en egen valgfri regel fra nøyaktig
 *   20 mg; bupropion, agomelatin, duloksetin og venlafaksin er bare fagtekst.
 *   Den hyperbolske citalopramregelen er bare i sammenligningssettet.
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
import { beregnDoseplan, kliniskDoseplan, planform } from '../verktoy/motor/plan'
import { syntetiskUtvalg, type Testpreparat } from '../verktoy/motor/syntetisk'
import { VERKTOY, virkestoffvalg } from '../verktoy/register'
import { akseptsett, AKSEPTSTOFFER, AKSEPTTESTFIL, annenhverDag, besvart, FEST_AKSEPTTEST, KORT, LANG, lagAksepttestrapport, reduksjoner, valgtekst, vanligDose, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { AVSLUTNING_FELLES, avrund, beregn, kortform, MINSTE_VISTE_MG, nulldagfeil, SISTE_DOSE, TIDLIGSTE_DATOER, trinnTilHorisont, type Forlopsresultat, type Periode } from '../verktoy/regler/beregning'
import { erKliniskGodkjent, fingeravtrykk } from '../verktoy/regler/godkjenning'
import { kontrollerRegelsett, lesKontrollgrunnlag } from '../verktoy/regler/kontroll'
import { apneValg, henvisninger, justerbare, nulltrinnfeil, type Beregningsinndata, type Fase, type Nedtrappingsstrategi, type Regel } from '../verktoy/regler/modell'
import { NICE, PLANHORISONT_LANGSOM, PLANHORISONT_TRINN, RCPSYCH } from '../verktoy/regler/bygg'
import {
  AKUTT_ID,
  JUSTERING,
  LANG_BEHANDLINGSTID,
  NEDTRAPPINGSSETT,
  ORGANFUNKSJON_ID,
  SAMMENLIGNINGSSETT,
  STARTFORSLAG,
  TEKNISK_MAKS_DAGER,
  TIDLIGERE_SYMPTOMER_ID,
  TIDLIGERE_VURDERT_ID,
  UNDER_18_ID,
  USTABIL_ID,
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
/** P7s regler; sammenligningssettet har også gruppebyttet fra P4 (beslutning P4-A), som ikke er en seponering. */
const P7REGLER = P7SETT.flatMap((s) => s.regler).filter((r) => r.plan.form === 'seponering')
const BEREGNBARE = NEDTRAPPINGSSETT.regler.filter((r) => r.beregnbarhet !== 'bare_tekstlig')
/**
 * Stoffene med høyest risiko der ingen dose i valgområdet for første trinn kan
 * gis med de norske formene; kontrolløren besluttet 30.10.2026 (P7-A) at de
 * står som fagtekst uten langsom variant.
 */
const FORMTEKST = ['mirtazapin', 'moklobemid', 'paroksetin']
const TEKSTREGLER = ['seponering-bupropion', 'seponering-agomelatin', 'seponering-duloksetin', 'seponering-venlafaksin', ...FORMTEKST.map((n) => `seponering-${n}`)]
/** De to kliniske godkjenningene fra substanskontrollen 30.10.2026, med fingeravtrykkene kontrolløren oppga. */
const GODKJENT = {
  'seponering-bupropion': { versjon: 5, fingeravtrykk: 'e7536668ac7f2d4dfd9959f24cfdfc4874182a4fc295355f0d10a05f438b5f5f' },
  'seponering-agomelatin': { versjon: 1, fingeravtrykk: '6d42863f3573fb2e0d6dbffd27ff78a7f1c2b539c8dce2cfcd36ad417b61a2d1' },
} as const
const ANNENHVER_DAG = regel('fluoksetin-annenhver-dag')
const LANGSOMME = BEREGNBARE.filter((r) => r.id.endsWith('-langsom'))
/** Hovedregelen per stoff; hver har en langsom variant. */
const HOVEDREGLER = BEREGNBARE.filter((r) => r !== ANNENHVER_DAG && !LANGSOMME.includes(r))
/** Alle reglene som trapper ned prosentvis. */
const NEDTRAPPINGER = [...HOVEDREGLER, ...LANGSOMME]
const HYPERBOLSK = SAMMENLIGNINGSSETT.regler[0]!

/** Svarene på spørsmålene: kort behandlingstid og dose innenfor rammen, eller lang behandlingstid. */
const UTENFOR = { ...KORT, [UTENFOR_DOSERAMME_ID]: true }
/** En syntetisk begrunnelse; aldri pasientopplysninger. */
const BEGRUNNELSE = 'Syntetisk begrunnelse: kort behandlingstid og ingen tidligere seponeringssymptomer.'
/** Første reduksjon forsvinner når dosen vises med to desimaler: planen har ingen trinn. */
const FORSTE_BORTE = /blir første reduksjon \(til [\d,]+ mg\) borte når dosen vises med to desimaler, så planen har ingen trinn/
/** Siste linje i hver plan uten nulltrinn. */
const AVSLUTNING = /; avslutning vurderes individuelt$/
const HORISONT = `teknisk planhorisont: ${PLANHORISONT_TRINN} reduksjoner; avslutning vurderes individuelt`

/** Startdosen i regelens første beregnede eksempel; innenfor alle grensene med svarene i {@link besvart}. */
const start = vanligDose
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
        // Fagteksten for bupropion og agomelatin er klinisk godkjent og vises; de andre venter på kontroll.
        expect(t.status, d.nokkel).toBe(seponeringsregler(d.nokkel).some((r) => r.id in GODKJENT) ? 'fagtekst' : 'til_kontroll')
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
    expect([HOVEDREGLER.length, LANGSOMME.length, NEDTRAPPINGSSETT.regler.length]).toEqual([9, 9, 26])
    expect(LANGSOMME.map((r) => r.id)).toEqual(HOVEDREGLER.map((r) => `${r.id}-langsom`))
    expect(NEDTRAPPINGSSETT.regler.filter((r) => r.beregnbarhet === 'bare_tekstlig').map((r) => r.id)).toEqual(TEKSTREGLER)
    // Gruppebyttet til aripiprazol er ikke godkjent som modell (beslutning P4-A) og står som demonstrasjon i sammenligningssettet.
    expect(SAMMENLIGNINGSSETT.regler.map((r) => r.id)).toEqual(['seponering-citalopram-hyperbolsk', 'gruppe-rest-ap-aripiprazol'])
    // Escitalopram er flyttet fra pilotsettet til P7; appen bruker begge, og ingen regel-ID finnes i begge.
    expect(PILOTSETT.regler.map((r) => r.id)).not.toContain('seponering-escitalopram')
    expect(regel('escitalopram').godkjenning.historikk.at(-6)!.merknad).toMatch(/substanskontrollen 30\.10\.2026, runde 3/)
    expect(new Set(REGELSETT.regler.map((r) => r.id)).size).toBe(REGELSETT.regler.length)
  })

  it('er klinisk godkjent bare for tekstreglene for bupropion og agomelatin, med kontrollørens fingeravtrykk; resten er til faglig kontroll, uten åpne valg', () => {
    // Bare de to uttrykkelige godkjenningene fra substanskontrollen 30.10.2026 er registrert, og de gjelder nøyaktig det kontrollerte innholdet.
    expect(P7REGLER.filter(erKliniskGodkjent).map((r) => r.id)).toEqual(Object.keys(GODKJENT))
    for (const [id, g] of Object.entries(GODKJENT)) {
      const r = NEDTRAPPINGSSETT.regler.find((x) => x.id === id)!
      expect([r.versjon, fingeravtrykk(r), r.beregnbarhet], id).toEqual([g.versjon, g.fingeravtrykk, 'bare_tekstlig'])
      expect(r.godkjenning.status, id).toBe('klinisk_godkjent')
      expect(r.godkjenning.historikk.at(-1), id).toEqual({
        status: 'klinisk_godkjent',
        dato: '2026-10-30',
        av: 'ChatGPT (uavhengig fagkontrollør)',
        rolle: 'uavhengig_kontrollor',
        regelversjon: g.versjon,
        fingeravtrykk: g.fingeravtrykk,
        merknad: expect.stringMatching(/^Substanskontrollen 30\.10\.2026, runde 3: /),
      })
      // Ingen tidligere steg er en klinisk godkjenning; ingen ble satt av OUSFAR Dev.
      expect(r.godkjenning.historikk.slice(0, -1).every((x) => x.status !== 'klinisk_godkjent' && x.rolle === 'utvikler'), id).toBe(true)
    }
    // Avgrensningen står i godkjenningen: bupropion bare som tekstregel, agomelatin bare utsagnet om at nedtrapping ikke trengs.
    expect(regel('bupropion').godkjenning.historikk.at(-1)!.merknad).toMatch(/Godkjent som den står, bare som tekstregel/)
    expect(regel('agomelatin').godkjenning.historikk.at(-1)!.merknad).toMatch(/gjelder bare agomelatin og utsagnet om at nedtrapping ikke er nødvendig; den gjelder ikke tilbakefallsrisiko, oppfølging av depresjon, leverskade eller overgang til andre legemidler/)
    // Endres regelen, faller godkjenningen bort.
    const endret = structuredClone(regel('agomelatin'))
    endret.fortolkning.tilpasninger = []
    expect(erKliniskGodkjent(endret)).toBe(false)
    for (const r of P7REGLER.filter((x) => !(x.id in GODKJENT))) {
      expect(erKliniskGodkjent(r), r.id).toBe(false)
      expect(r.godkjenning.historikk.every((x) => x.status !== 'klinisk_godkjent'), r.id).toBe(true)
    }
    for (const r of NEDTRAPPINGSSETT.regler.filter((x) => !(x.id in GODKJENT))) expect(r.godkjenning.status, r.id).toBe('til_faglig_kontroll')
    // Reglene er omarbeidet etter hver kontroll og sendt til kontroll på nytt hver gang.
    const steg = (n: number) => Array.from({ length: n }, (_, i) => [`utkast ${i + 1}`, `til_faglig_kontroll ${i + 1}`]).flat()
    const historikk = (r: Regel) => [r.versjon, r.godkjenning.historikk.map((x) => `${x.status} ${x.regelversjon}`)]
    const formtekst = FORMTEKST.map((n) => regel(n))
    // Fluvoksamin og moklobemid har én versjon fra kontrollrunden 30.10.2026 med like store deldoser; kravet er tatt bort igjen (P7-B).
    const LIKE_STORE = ['seponering-fluvoksamin', 'seponering-fluvoksamin-langsom', 'seponering-moklobemid']
    const likeStore = (r: Regel) => LIKE_STORE.includes(r.id)
    // Nedtrappingene og de tre formtekstene har én til: forskriveren kan velge blant dosene som kan gis (bidragsyterens valg 30.10.2026).
    const valgAvDose = (r: Regel) => NEDTRAPPINGER.includes(r) || formtekst.includes(r)
    // Og én etter kontrollørens beslutninger 30.10.2026: rettet (nedtrappingene) eller gjort om til fagtekst (P7-A).
    const etterBeslutning = (r: Regel) => NEDTRAPPINGER.includes(r) || formtekst.includes(r)
    const etter = (r: Regel) => Number(likeStore(r)) + Number(valgAvDose(r)) + Number(etterBeslutning(r))
    for (const r of [...HOVEDREGLER, ...formtekst, regel('duloksetin'), regel('venlafaksin')]) expect(historikk(r), r.id).toEqual([6 + etter(r), steg(6 + etter(r))])
    for (const r of [...LANGSOMME, ANNENHVER_DAG]) expect(historikk(r), r.id).toEqual([2 + etter(r), steg(2 + etter(r))])
    expect(ANNENHVER_DAG.versjon).toBe(2)
    for (const r of [...BEREGNBARE, ...formtekst]) {
      if (etterBeslutning(r)) {
        const merknad = formtekst.includes(r) ? /^Gjort om til fagtekst etter kontrollørens beslutninger 30\.10\.2026 \(P7\.5, beslutning P7-A\)/ : /^Rettet etter kontrollørens beslutninger 30\.10\.2026 \(P7\.5, P7-A og P7-B\)/
        expect(r.godkjenning.historikk.at(-2)!.merknad, r.id).toMatch(merknad)
        expect(r.godkjenning.historikk.at(-4)!.merknad, r.id).toMatch(/^Etter bidragsyterens valg 30\.10\.2026 \(P7\.5\): når et trinn ikke kan gis nøyaktig/)
      }
      if (likeStore(r)) expect(r.godkjenning.historikk.at(-6)!.merknad, r.id).toMatch(/^Rettet etter kontrollrunden 30\.10\.2026 \(P7\.5\): at deldosene skal være like store, er regelens eget konservative valg/)
      expect(r.godkjenning.historikk.at(-2 - 2 * etter(r))!.merknad, r.id).toMatch(/^Omarbeidet etter substanskontrollen 30\.10\.2026, runde 3 \(P7\.5\): godkjent med endring/)
      expect(r.godkjenning.historikk.at(-1)!.dato, r.id).toBe('2026-10-30')
      // Valgområdene (prosent og dager, med kravene om begrunnelse) er avklart av den uavhengige kontrolløren for denne versjonen.
      for (const [sti, p] of justerbare(r)) {
        const g = p.grunnlag
        expect(g.type === 'ousfar_vurdering' && g.avklaring, `${r.id} ${sti}`).toMatchObject({ rolle: 'uavhengig_kontrollor', regelversjon: r.versjon, merknad: expect.stringMatching(/^(Beslutning 1 i fagvurderingen 29\.10|Fagkontrollen 30\.10\.2026, Beslutning|Substanskontrollen 30\.10\.2026, Beslutning)/) })
      }
      // Planhorisonten og startdosen er avklart i beslutning 6 og 7, og valget blant dosene som kan gis i beslutning P7-A; ingen valg står åpne.
      expect(apneValg(r), r.id).toEqual([])
      const fase = r.plan.forlop[0]!.faser[0]!
      if (NEDTRAPPINGER.includes(r)) {
        expect(fase.type === 'nedtrapping' && fase.trinnvalg, r.id).toMatchObject({ type: 'ousfar_vurdering', avklaring: { regelversjon: r.versjon, merknad: expect.stringMatching(/^Kontrollørens beslutninger 30\.10\.2026, Beslutning P7-A: valg blant dosene som kan gis er akseptert som prinsipp/) } })
      }
      // Ingen regel krever lenger like store deldoser (P7-B).
      expect(JSON.stringify(r.plan), r.id).not.toMatch(/like_store/)
    }
    for (const r of NEDTRAPPINGER) {
      const fase = r.plan.forlop[0]!.faser[0]!
      expect(fase.type === 'nedtrapping' && fase.horisont!.grunnlag, r.id).toMatchObject({ type: 'ousfar_vurdering', avklaring: { regelversjon: r.versjon, merknad: expect.stringMatching(/^Substanskontrollen 30\.10\.2026, Beslutning 6: /) } })
      expect(r.inndata[0]!.grunnlag, r.id).toMatchObject({ type: 'ousfar_vurdering', avklaring: { merknad: expect.stringMatching(/Beslutning 7: positiv startdose opp til preparatomtalens høyeste voksendose/) } })
    }
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
      // Behandlingstiden først og doserammen sist; stoffets egne spørsmål om pasientgruppe og indikasjon står mellom.
      const sporsmal = r.sporsmal!.map((x) => x.id)
      expect([sporsmal[0], sporsmal.at(-1)], r.id).toEqual([LANG_BEHANDLINGSTID.id, UTENFOR_DOSERAMME_ID])
      const dose = start(r)
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
      expect(ubesvart, r.id).toMatch(/Må besvares før beregning: Er dosen ellers utenfor preparatomtalens doseramme/)
      expect(stoppet(r, dose, { svar: { ...KORT, annet: true } }), r.id).toBe('Svaret «annet» gjelder ikke et spørsmål i regelen.')
    }
    // Svaret står i planen.
    const res = beregn(regel('sertralin'), besvart(regel('sertralin'), 100, { svar: LANG, justert: { [PROSENT]: 10 } }))
    expect(res.status === 'modellberegning' && res.kontroller).toContainEqual({ krav: `${LANG_BEHANDLINGSTID.tekst} Ja`, oppfylt: true, detalj: 'Oppgitt av forskriveren.' })
    // Startforslaget er den felles håndteringsregelen fra fagvurderingen, med NICEs og RCPsychs råd.
    expect(STARTFORSLAG.grunnlag).toEqual({ type: 'kilde', henvisninger: [NICE.tempo, NICE.alvorlig, RCPSYCH.tid, RCPSYCH.smaa] })
    expect(STARTFORSLAG.tekst).toMatch(/dagene per trinn er minstetider\. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet/)
    expect(STARTFORSLAG.tekst).toMatch(/^Planen er et startforslag, ikke en forhåndsgodkjenning av alle reduksjonene: hvert trinn forutsetter en ny vurdering av toleransen/)
    expect(STARTFORSLAG.tekst).toMatch(/beregnes en ny plan fra dosen pasienten faktisk bruker\.$/)
    expect(LANG_BEHANDLINGSTID.grunnlag).toEqual({ type: 'kilde', henvisninger: [RCPSYCH.langvarig, RCPSYCH.fireUker, NICE.halveringstid] })
    // Unntaket, den langsomme varianten og organfunksjonen er avklart i fagkontrollen 30.10.2026.
    const c = regel('citalopram')
    expect(c.unntak.find((u) => u.id === TIDLIGERE_SYMPTOMER_ID)!.grunnlag).toMatchObject({ type: 'ousfar_vurdering', avklaring: { dato: '2026-10-30', merknad: expect.stringMatching(/Beslutning 5\.6: en egen langsom variant/) } })
    expect(c.bekreftelser[1]!.grunnlag).toMatchObject({ type: 'ousfar_vurdering', avklaring: { dato: '2026-10-30', merknad: expect.stringMatching(/organfunksjon og interaksjoner må vurderes for alle stoffer/) } })
    // Fagteksten for moklobemid beholder unntaket ved alvorlig nedsatt leverfunksjon, der preparatomtalen reduserer dosen, og kontraindikasjonen.
    expect(regel('moklobemid').unntak.map((u) => u.tekst).join(' ')).toMatch(/Pasienten har alvorlig nedsatt leverfunksjon/)
  })

  it('stopper under 18 år, ved akutte forhold, ustabil dose eller bytte og ved kontraindikasjoner, også med begrunnelse', () => {
    const felles: [string, RegExp][] = [
      [UNDER_18_ID, /^Regelen gjelder ikke: Pasienten er under 18 år\./],
      [AKUTT_ID, /^Regelen gjelder ikke: Pasienten har en akutt alvorlig bivirkning, en forgiftning eller en alvorlig interaksjon/],
      [USTABIL_ID, /^Regelen gjelder ikke: Dosen er ikke stabil, pasienten tar legemidlet uregelmessig, eller seponeringen er del av et bytte/],
    ]
    const med = (r: Regel, id: string) => stoppet(r, start(r), { pasientforhold: { ...besvart(r, start(r)).pasientforhold, [id]: true }, begrunnelse: BEGRUNNELSE })
    for (const r of [...NEDTRAPPINGER, ANNENHVER_DAG]) {
      for (const [id, grunn] of felles) expect(med(r, id), `${r.id} ${id}`).toMatch(grunn)
      expect(r.unntak.find((u) => u.id === UNDER_18_ID)!.grunnlag, r.id).toMatchObject({ avklaring: { merknad: expect.stringMatching(/Beslutning 7: under 18 år/) } })
    }
    // Kontraindikasjonene i preparatomtalen kan ikke begrunnes bort; de gjelder også den langsomme varianten.
    const kontra = { citalopram: 'qt_forlengelse', escitalopram: 'qt_forlengelse' }
    for (const [n, id] of Object.entries(kontra)) {
      for (const r of [regel(n), regel(`${n}-langsom`)]) expect(med(r, id), `${r.id} ${id}`).toMatch(/^Regelen gjelder ikke: .* Det er en kontraindikasjon i preparatomtalen; en generell begrunnelse kan ikke overstyre den/)
    }
    expect(regel('duloksetin').unntak.map((u) => u.id)).toEqual([UNDER_18_ID, AKUTT_ID, USTABIL_ID, 'leversykdom', 'alvorlig_nyresvikt'])
    // Fagtekstene for de tre stoffene uten form som kan gis (P7-A) har de samme felles stoppene og sine egne kontraindikasjoner.
    for (const n of FORMTEKST) expect(regel(n).unntak.slice(0, 3).map((u) => u.id), n).toEqual([UNDER_18_ID, AKUTT_ID, USTABIL_ID])
    expect(regel('moklobemid').unntak.map((u) => u.id)).toContain('kontraindisert_interaksjon')
  })

  it('følger preparatomtalens grenser for pasientgruppe og indikasjon: en høyeste dose stopper, en forsiktighetsgrense krever begrunnelse, testet ved og rett over grensen', () => {
    const FORSIKTIG = /er over forsiktighetsgrensen .* og krever en skriftlig begrunnelse fra forskriveren/
    // [stoff, spørsmål og svar, grensen, art]
    const grenser: [string, Record<string, boolean>, number, 'maks' | 'forsiktighet'][] = [
      ['citalopram', { eldre: true }, 20, 'maks'],
      ['citalopram', { nedsatt_leverfunksjon: true }, 20, 'maks'],
      ['escitalopram', { eldre: true }, 10, 'maks'],
      ['escitalopram', { nedsatt_leverfunksjon: true }, 10, 'maks'],
      ['escitalopram', { langsom_cyp2c19: true }, 10, 'maks'],
      ['vortioksetin', { eldre: true }, 10, 'forsiktighet'],
      ['amitriptylin', { eldre_hjerte: true }, 100, 'forsiktighet'],
      ['amitriptylin', { smerte_migrene: true }, 75, 'forsiktighet'],
      ['klomipramin', { depresjon_tvang: true }, 150, 'forsiktighet'],
      ['klomipramin', { depresjon_tvang: false }, 150, 'maks'],
      ['nortriptylin', {}, 150, 'forsiktighet'],
      ['nortriptylin', { eldre: true }, 50, 'forsiktighet'],
    ]
    for (const [n, svar, grense, art] of grenser) {
      for (const r of [regel(n), regel(`${n}-langsom`)]) {
        const hvor = `${r.id} ${JSON.stringify(svar)} ${grense}`
        // Nedsatt leverfunksjon krever i tillegg en begrunnelse; den gir ingen høyere grense.
        const x = { svar: { ...KORT, ...svar }, ...(art === 'maks' && { begrunnelse: BEGRUNNELSE }) }
        expect(stoppet(r, grense, x), hvor).toBe('')
        if (art === 'maks') {
          expect(stoppet(r, grense + 0.01, x), hvor).toMatch(/er utenfor det regelen gjelder for/)
        } else {
          expect(stoppet(r, grense + 0.01, x), hvor).toMatch(FORSIKTIG)
          expect(stoppet(r, grense + 0.01, { ...x, begrunnelse: BEGRUNNELSE }), hvor).toBe('')
          // Begrunnelsen står i planen.
          const res = beregn(r, besvart(r, grense + 0.01, { ...x, begrunnelse: BEGRUNNELSE }))
          expect(res.status === 'modellberegning' && res.kontroller.some((k) => k.oppfylt && k.krav.endsWith('(forsiktighetsgrense)') && k.detalj.includes(BEGRUNNELSE)), hvor).toBe(true)
        }
      }
    }
    // Den ytre rammen er høyeste voksendose: ved den regnes det, rett over stopper det, også med begrunnelse og ja på doserammen.
    for (const [n, maks] of [['citalopram', 40], ['sertralin', 200], ['fluvoksamin', 300]] as const) {
      expect(stoppet(regel(n), maks), n).toBe('')
      expect(stoppet(regel(n), maks + 0.01, { svar: UTENFOR, begrunnelse: BEGRUNNELSE }), n).toMatch(new RegExp(`utenfor det regelen gjelder for \\(høyst ${maks} mg\\)`))
    }
    // 0 mg er ingen dose, og den minste positive dosen gir ingen reduksjon som kan vises: begge stopper med forklaring.
    expect(stoppet(regel('citalopram'), 0)).toMatch(/Startdosen må være et positivt tall/)
    expect(stoppet(regel('citalopram'), 0.01)).toMatch(FORSTE_BORTE)
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
    expect(res.status === 'modellberegning' && res.kontroller.map((k) => k.krav).join(' | ')).toMatch(/Er dosen ellers utenfor preparatomtalens doseramme.* Ja/)
    // Startdosen kan fortsatt ikke være over preparatomtalens høyeste døgndose, heller ikke med begrunnelse.
    expect(stoppet(regel('citalopram'), 40.01, { svar: UTENFOR, begrunnelse: BEGRUNNELSE })).toMatch(/utenfor det regelen gjelder for \(høyst 40 mg\)/)
  })

  it('har ingen fast nedre grense: en teknisk planhorisont på 12 reduksjoner, 6 i de langsomme variantene, og ingen praktisk grense', () => {
    for (const r of [...NEDTRAPPINGER, HYPERBOLSK]) {
      const fase = r.plan.forlop[0]!.faser[0]!
      if (fase.type !== 'nedtrapping') throw new Error(r.id)
      const horisont = LANGSOMME.includes(r) ? PLANHORISONT_LANGSOM : PLANHORISONT_TRINN
      expect([fase.avslutning, fase.minste_varighet, fase.horisont?.verdi, fase.horisont?.enhet], r.id).toEqual(['individuell', undefined, horisont, 'trinn'])
      // Horisonten er et teknisk valg, ikke en klinisk grense; i P7 er den avklart i substanskontrollen, i sammenligningssettet står den åpen.
      expect(fase.horisont!.grunnlag, r.id).toMatchObject({ type: 'ousfar_vurdering', avklaring: r === HYPERBOLSK ? null : expect.objectContaining({ merknad: expect.stringMatching(/Beslutning 6/) }) })
      expect(fase.strategi.type === 'prosent_av_aktuell' && fase.strategi.sluttdose_mg, r.id).toBe(r === HYPERBOLSK ? false : undefined)
      // Ingen regel har en praktisk grense: et trinn som ikke kan gis, stopper planen i doseplanmotoren (P5).
      expect(r.plan.forlop[0]!.dosevalg, r.id).toBeUndefined()
    }
    expect([PLANHORISONT_TRINN, PLANHORISONT_LANGSOM]).toEqual([12, 6])
  })

  it('stopper planen ved horisonten, ved den praktiske grensen, ved minste viste dose, når reduksjonen forsvinner i avrundingen, eller ved strategiens siste trinn før null', () => {
    const s: Nedtrappingsstrategi = { type: 'prosent_av_aktuell', prosent: { verdi: 10, enhet: 'prosent', art: 'veiledende_preferanse', grunnlag: { type: 'kilde', henvisninger: [] } } }
    // Hvert trinn avrundes til den viste dosen, og neste trinn regnes fra den: 59,05 × 0,9 = 53,145, vist og gitt som 53,15 mg.
    expect(trinnTilHorisont(s, 100, 6).serie).toEqual([90, 81, 72.9, 65.61, 59.05, 53.15])
    // Akkurat 12 reduksjoner til horisonten; med horisont 11 og 13 én færre eller flere.
    for (const h of [11, 12, 13]) expect(trinnTilHorisont(s, 100, h).serie, String(h)).toHaveLength(h)
    const { serie, slutt, neste } = trinnTilHorisont(s, 100, 12)
    const tolvte = serie[11]!
    expect(slutt).toBe('horisont')
    expect(neste).toBeCloseTo(tolvte * 0.9)
    // Er 12. trinn akkurat lik den praktiske grensen, er horisonten nådd; like over den stopper planen ved den praktiske grensen etter 11.
    expect(trinnTilHorisont(s, 100, 12, tolvte)).toMatchObject({ slutt: 'horisont' })
    expect(trinnTilHorisont(s, 100, 12, tolvte + 0.001)).toMatchObject({ slutt: 'praktisk_grense' })
    expect(trinnTilHorisont(s, 100, 12, tolvte + 0.001).serie).toHaveLength(11)
    // En reduksjon som forsvinner i avrundingen, er ikke et trinn: 0,01 × 0,5 = 0,005 vises som 0,01 mg.
    const halvering = { ...s, prosent: { ...s.prosent, verdi: 50 } }
    expect(trinnTilHorisont(halvering, 0.04, 12)).toMatchObject({ serie: [0.02, 0.01], slutt: 'avrundet_bort' })
    // Den minste dosen beregningen viser, 0,01 mg: aldri «0 mg». 0,01 × 0,25 = 0,0025 vises som 0 mg.
    expect(MINSTE_VISTE_MG).toBe(0.01)
    expect(trinnTilHorisont({ ...s, prosent: { ...s.prosent, verdi: 75 } }, 0.02, 12)).toMatchObject({ serie: [0.01], slutt: 'minste_viste_dose' })
    expect(kort(regel('fluoksetin'), 20, { justert: { [PROSENT]: 50 }, begrunnelse: BEGRUNNELSE }).fra!.slice(-2)).toEqual(['fra dag 281: 0,01 mg', 'neste reduksjon forsvinner i avrundingen; avslutning vurderes individuelt'])
    // I den langsomme varianten med 1 %: fra 0,55 mg fem trinn, så forsvinner neste reduksjon; fra 0,5 mg ingen trinn.
    const c = regel('citalopram-langsom')
    expect(kort(c, 0.55, { justert: { [PROSENT]: 1 } }).fra).toEqual(['dag 1–28: 0,54 mg', 'dag 29–56: 0,53 mg', 'dag 57–84: 0,52 mg', 'dag 85–112: 0,51 mg', 'fra dag 113: 0,5 mg', 'neste reduksjon forsvinner i avrundingen; avslutning vurderes individuelt'])
    expect(stoppet(c, 0.5, { justert: { [PROSENT]: 1 } })).toMatch(/Fra 0,5 mg av citalopram blir første reduksjon \(til 0,495 mg\) borte når dosen vises med to desimaler/)
    // En strategi som når 0 av seg selv (den hyperbolske i sammenligningssettet), stopper på siste trinn før null.
    expect(kortform(beregn(HYPERBOLSK, { startdose_mg: 20 })).fra!.slice(-2)).toEqual(['fra dag 85: 0,41 mg', 'siste trinn før null; avslutning vurderes individuelt'])
  })

  it('fortsetter fra faktisk dose: 5 % per trinn fra 2,5 mg citalopram når 1 mg etter 18 reduksjoner, over to planer', () => {
    const forste = kort(regel('citalopram'), 2.5, { justert: { [PROSENT]: 5 } }).fra!
    expect(forste).toHaveLength(PLANHORISONT_TRINN + 1)
    expect(forste.slice(-2)).toEqual(['fra dag 309: 1,36 mg', HORISONT])
    // Ny plan fra dosen pasienten da bruker: reduksjon 18 er 1 mg.
    expect(kort(regel('citalopram'), 1.36, { justert: { [PROSENT]: 5 } }).fra![5]).toBe('dag 141–168: 1 mg')
  })

  it('følger risikogruppene fra fagvurderingen: ellers 25 % (5–50 %), 10 % etter lang behandlingstid, og minst 14 dager (28 for fluoksetin); stoffene med høyest risiko er fagtekst', () => {
    // Ingen dose i valgområdet ved høyest risiko (5–10 %) kunne gis med de norske formene, så de stoffene er fagtekst uten langsom variant (P7-A).
    expect(HOVEDREGLER.filter((r) => r.tittel.includes('høy risiko'))).toEqual([])
    for (const n of HOY_RISIKO) {
      expect(regel(n).beregnbarhet, n).toBe('bare_tekstlig')
      expect(NEDTRAPPINGSSETT.regler.find((r) => r.id === `seponering-${n}-langsom`), n).toBeUndefined()
    }
    for (const n of FORMTEKST) expect(regel(n).plan.forlop[0]!.faser[0], n).toMatchObject({ type: 'uten_beregning', grunn: expect.stringMatching(/ingen dose som kan gis innenfor valgområdet for første trinn \(5–10 % av aktuell dose ved høy risiko\), heller ikke blant de nærmeste dosene forskriveren kan velge/) })
    for (const r of HOVEDREGLER) {
      const n = nokkel(r)
      const dose = start(r)
      // Vortioksetin har lav risiko og ingen grense for trinnstørrelsen etter lang behandlingstid.
      const lav = n === 'vortioksetin'
      const forste = (andel: number) => new RegExp(`^dag 1–28: ${String(Math.round(dose * andel * 100) / 100).replace('.', ',')} mg(, fordelt på .*)?$`)
      expect(kort(r, dose).fra![0], r.id).toMatch(forste(0.75))
      // Etter lang behandlingstid er forslaget 10 % (beslutning P7-A); mer krever begrunnelse.
      expect(kort(r, dose, { svar: LANG }).fra![0], r.id).toMatch(forste(lav ? 0.75 : 0.9))
      const valg = justerbare(r).map(([sti, p]) => [sti, p.verdi, p.omrade, p.teknisk_maks ?? false, p.standard_ved?.ved, p.standard_ved?.verdi])
      expect(valg, r.id).toEqual([
        [PROSENT, 25, [5, 50], false, ...(lav ? [undefined, undefined] : [LANG_BEHANDLINGSTID.id, 10])],
        [DAGER, 28, [n === 'fluoksetin' ? 28 : 14, TEKNISK_MAKS_DAGER], true, undefined, undefined],
      ])
      if (lav) continue
      const forslag = justerbare(r)[0]![1].standard_ved!.grunnlag
      expect(forslag, r.id).toMatchObject({ type: 'ousfar_vurdering', avklaring: { rolle: 'uavhengig_kontrollor', regelversjon: r.versjon, merknad: expect.stringMatching(/Beslutning P7-A: etter lang behandlingstid i middelsgruppen er 5–10 % det foretrukne utgangspunktet/) } })
      // Risikogruppen er det RCPsych oppgir for stoffet; NICEs særlige varsomhet gjelder paroksetin og venlafaksin, som er fagtekst.
      expect(henvisninger(r), r.id).toContainEqual(RCPSYCH.middelsRisiko)
      expect(henvisninger(r), r.id).not.toContainEqual(RCPSYCH.hoyRisiko)
      expect(henvisninger(r).some((h) => h.faktum === NICE.saerligRisiko.faktum), r.id).toBe(false)
      const fase = r.plan.forlop[0]!.faser[0]!
      const strategi = fase.type === 'nedtrapping' ? fase.strategi : null
      // Mindre trinn ved lav dose bare når en større reduksjon kan velges; ikke for fluoksetin.
      expect(strategi?.type === 'prosent_av_aktuell' && strategi.lav_prosent?.verdi, r.id).toBe(n === 'fluoksetin' ? undefined : 25)
    }
    for (const n of HOY_RISIKO) expect(RCPSYCH.hoyRisiko.faktum, n).toContain(n)
    expect(RCPSYCH.middelsRisiko.faktum).toMatch(/lav har blant andre vortioksetin/)
    // Forslaget ved lang behandlingstid står som kontroll i planen.
    const res = beregn(regel('sertralin'), besvart(regel('sertralin'), 100, { svar: LANG }))
    expect(res.status === 'modellberegning' && res.kontroller.filter((k) => k.krav.startsWith(JUSTERING.prosent))).toEqual([
      { krav: `${JUSTERING.prosent}: regelens forslag ved ${LANG_BEHANDLINGSTID.ja} er 10 %`, oppfylt: true, detalj: 'I stedet for 25 %, som gjelder ellers.' },
    ])
  })

  it('har en langsom variant for hvert stoff etter tidligere seponeringssymptomer: 1–5 % (standard 5 %) og minst 28 dager, uten begrunnelse som åpner for mer', () => {
    for (const r of LANGSOMME) {
      const valg = justerbare(r).map(([sti, p]) => [sti, p.verdi, p.omrade, p.teknisk_maks ?? false])
      expect(valg, r.id).toEqual([
        [PROSENT, 5, [1, 5], false],
        [DAGER, 28, [28, TEKNISK_MAKS_DAGER], true],
      ])
      const dose = r.eksempler.find((e) => !e.stopp)!.inndata.startdose_mg
      expect(kort(r, dose).fra![0], r.id).toMatch(new RegExp(`^dag 1–28: ${String(Math.round(dose * 0.95 * 100) / 100).replace('.', ',')} mg(, fordelt på .*)?$`))
      // Høyst 6 reduksjoner i planen.
      expect(kort(r, dose).fra!.length, r.id).toBeLessThanOrEqual(PLANHORISONT_LANGSOM + 1)
      for (const prosent of [1, 5]) expect(stoppet(r, dose, { justert: { [PROSENT]: prosent } }), `${r.id} ${prosent}`).toBe('')
      for (const prosent of [0.99, 5.01]) {
        expect(stoppet(r, dose, { justert: { [PROSENT]: prosent }, begrunnelse: BEGRUNNELSE }), `${r.id} ${prosent}`).toBe(`${JUSTERING.prosent}: ${String(prosent).replace('.', ',')} % er utenfor det regelen tillater (1–5 %).`)
      }
      expect(stoppet(r, dose, { justert: { [DAGER]: 27 }, begrunnelse: BEGRUNNELSE }), r.id).toMatch(/27 dager er utenfor det regelen tillater \(minst 28 dager/)
      expect(stoppet(r, dose, { svar: LANG }), r.id).toBe('')
    }
    // Appen viser begge reglene for stoffet, så forskriveren velger varianten.
    expect(tilgjengelighet(TRAPPE_NED, { fra: { nokkel: 'sertralin', formulering: 'standard' } }).regler.map((r) => r.id)).toEqual(['seponering-sertralin', 'seponering-sertralin-langsom'])
    expect(kort(regel('citalopram-langsom'), 20, { justert: { [PROSENT]: 1 } }).fra!.slice(0, 2)).toEqual(['dag 1–28: 19,8 mg', 'dag 29–56: 19,6 mg'])
    expect(kort(regel('citalopram-langsom'), 20).fra!.slice(-2)).toEqual(['fra dag 141: 14,71 mg', `teknisk planhorisont: ${PLANHORISONT_LANGSOM} reduksjoner; avslutning vurderes individuelt`])
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
      const d = start(r)
      expect(stoppet(r, d, { justert: { [PROSENT]: 25 } }), n).toBe('')
      expect(stoppet(r, d, { justert: { [PROSENT]: 25.01 } }), n).toMatch(krever)
      expect(stoppet(r, d, { justert: { [PROSENT]: 25.01 }, begrunnelse: BEGRUNNELSE }), n).toBe('')
      expect(stoppet(r, d, { justert: { [PROSENT]: 50 }, begrunnelse: '   ' }), n).toMatch(krever)
      expect(stoppet(r, d, { svar: LANG, justert: { [PROSENT]: 10 } }), n).toBe('')
      expect(stoppet(r, d, { svar: LANG, justert: { [PROSENT]: 10.01 } }), n).toMatch(krever)
      // Etter lang behandlingstid er 10 % forslaget; 25 % er et synlig avvik som krever begrunnelse (P7-A).
      expect(stoppet(r, d, { svar: LANG }), n).toBe('')
      expect(stoppet(r, d, { svar: LANG, justert: { [PROSENT]: 25 } }), n).toMatch(/Reduksjon per trinn \(% av aktuell dose\) 25 % krever en skriftlig begrunnelse fra forskriveren \(over 10 % ved lang behandlingstid\)/)
      expect(stoppet(r, d, { svar: LANG, justert: { [DAGER]: 27 } }), n).toBe(`${JUSTERING.dager} 27 dager krever en skriftlig begrunnelse fra forskriveren (under 28 dager ved lang behandlingstid). Skriv begrunnelsen, eller velg en annen verdi.`)
      expect(stoppet(r, d, { justert: { [DAGER]: 14 } }), n).toBe('')
      expect(stoppet(r, d, { justert: { [DAGER]: 13 } }), n).toBe(`${JUSTERING.dager}: 13 dager er utenfor det regelen tillater (minst 14 dager, av tekniske grunner høyst 365 dager).`)
    }
    // Fluoksetin: over 25 % krever begrunnelse, og etter lang behandlingstid over 10 % (substanskontrollen 30.10.2026); trinnene er minst 28 dager.
    const f = regel('fluoksetin')
    expect(stoppet(f, 40, { svar: LANG })).toBe('')
    expect(stoppet(f, 40, { svar: LANG, justert: { [PROSENT]: 25 } })).toMatch(/Reduksjon per trinn \(% av aktuell dose\) 25 % krever en skriftlig begrunnelse fra forskriveren \(over 10 % ved lang behandlingstid\)/)
    expect(stoppet(f, 40, { svar: LANG, justert: { [PROSENT]: 25 }, begrunnelse: BEGRUNNELSE })).toBe('')
    expect(stoppet(f, 40, { svar: LANG, justert: { [PROSENT]: 10 } })).toBe('')
    expect(stoppet(f, 40, { svar: LANG, justert: { [PROSENT]: 10.01 } })).toMatch(krever)
    expect(stoppet(f, 40)).toBe('')
    expect(stoppet(f, 40, { justert: { [PROSENT]: 25.01 } })).toMatch(krever)
    expect(f.plan.forlop[0]!.faser[0]!.type === 'nedtrapping' && f.plan.forlop[0]!.faser[0]!.strategi.type === 'prosent_av_aktuell' && f.plan.forlop[0]!.faser[0]!.strategi.prosent.begrunnelseskrav).toContainEqual(
      expect.objectContaining({ over: 10, ved: LANG_BEHANDLINGSTID.id, grunnlag: expect.objectContaining({ avklaring: expect.objectContaining({ merknad: expect.stringMatching(/Beslutning 8: fluoksetin krever begrunnelse/) }) }) }),
    )
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
        expect(linjer.at(-2), `${r.id} ${e.id}`).toMatch(/^fra dag \d+: [\d,]+ mg( annenhver dag|, fordelt på [\d, ]+(eller \d+ )?doser)?$/)
        expect(linjer.join(' '), `${r.id} ${e.id}`).not.toMatch(/seponert|0 mg$/)
        // Siste beregnede dose er ikke «siste dose før seponering», og planen har ingen dato for siste dose.
        expect(res.merknader, `${r.id} ${e.id}`).toContainEqual(r === ANNENHVER_DAG ? expect.stringMatching(/Fortsett med denne doseringen inntil forskriveren har vurdert videre nedtrapping; den er ikke nødvendigvis en sluttdosering\./) : expect.stringContaining(AVSLUTNING_FELLES))
        expect(res.status === 'modellberegning' && res.forlop.map((f) => f.siste_dosedag), `${r.id} ${e.id}`).toEqual([null])
      }
    }
    // Kontrollørens tekst om siste dose (beslutning 6), ordrett.
    expect(SISTE_DOSE).toBe('Planen stopper her av tekniske grunner. Fortsett med denne dosen inntil forskriveren har vurdert videre nedtrapping. Dosen er ikke nødvendigvis en sluttdose.')
    expect(AVSLUTNING_FELLES).toMatch(new RegExp(`^${SISTE_DOSE.replace(/\./g, '\\.')} Planen går ikke til null og foreslår ingen dato for siste dose\\. En ny plan beregnes fra dosen pasienten faktisk bruker`))
    // Heller ikke ved grensene og med de minste og største trinnene: ingen beregning gir seponering.
    for (const r of NEDTRAPPINGER) {
      const [lavest, hoyest] = justerbare(r)[0]![1].omrade
      for (const dose of [start(r), 1, 0.05, 0.01])
        for (const prosent of [lavest, hoyest]) {
          const res = beregn(r, besvart(r, dose, { justert: { [PROSENT]: prosent }, begrunnelse: BEGRUNNELSE }))
          if (res.status === 'modellberegning') expect(res.forlop.map((f) => f.siste_dosedag), `${r.id} ${dose} ${prosent}`).toEqual([null])
          else expect(res.stoppgrunner.join(' '), `${r.id} ${dose} ${prosent}`).toMatch(FORSTE_BORTE)
        }
    }
    // Dagene er tidligste tidspunkt: et utsatt trinn forskyver resten.
    expect(beregn(regel('sertralin'), besvart(regel('sertralin'), 100)).merknader).toContain(TIDLIGSTE_DATOER)
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
    expect(variant((f) => f.strategi.type === 'prosent_av_aktuell' && (f.strategi.sluttdose_mg = { ...f.horisont!, verdi: 2.5, enhet: 'mg' }))).toMatch(/har både sluttdose og individuell avslutning; ingen nedre grense for beregnede trinn ved seponering er godkjent/)
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
      // Ved høyeste voksendose regnes det når svarene ikke utløser en lavere høyeste dose (og med begrunnelse over en forsiktighetsgrense); rett over stopper det.
      const tillatt = Object.fromEntries(r.inndata.filter((k) => k.ved && k.art === 'bindende_krav').map((k) => [k.ved!.sporsmal, !k.ved!.svar]))
      expect(stoppet(r, maks, { svar: { ...KORT, ...tillatt }, begrunnelse: BEGRUNNELSE }), r.id).toBe('')
      expect(stoppet(r, maks + 0.01, { svar: { ...KORT, ...tillatt }, begrunnelse: BEGRUNNELSE }), r.id).toMatch(new RegExp(`utenfor det regelen gjelder for \\(høyst ${String(maks).replace('.', ',')} mg\\)`))
      expect(stoppet(r, 0), r.id).toMatch(/Startdosen må være et positivt tall/)
      for (const dose of [0.01, 0.5, 2]) expect(stoppet(r, dose), `${r.id} ${dose}`).not.toMatch(/utenfor|nedre grense/)
    }
    expect(kort(regel('sertralin'), 12.5).fra!.slice(0, 2)).toEqual(['dag 1–28: 9,38 mg', 'dag 29–56: 7,04 mg'])
    expect(kort(regel('nortriptylin'), 15).fra!.slice(-2)).toEqual(['fra dag 309: 0,48 mg', HORISONT])
    expect(stoppet(regel('citalopram'), 0.01)).toMatch(FORSTE_BORTE)
    // Fluvoksamin: døgndoser over 150 mg fordeles på 2 eller 3 doser, til og med 150 mg ikke.
    expect(kort(regel('fluvoksamin'), 200).fra!.slice(0, 2)).toEqual(['dag 1–28: 150 mg', 'dag 29–56: 112,5 mg'])
    expect(kort(regel('fluvoksamin'), 200.02).fra![0]).toBe('dag 1–28: 150,02 mg, fordelt på 2 eller 3 doser')
  })

  it('tåler stresstesten fra fagvurderingen: 5 % per trinn fra 20 mg gir 12 reduksjoner til horisonten og ingen nulltrinn', () => {
    // Stresstesten gjaldt paroksetin, som nå er fagtekst (P7-A); samme regning med citalopram.
    const linjer = kort(regel('citalopram'), 20, { justert: { [PROSENT]: 5 } }).fra!
    expect(linjer).toHaveLength(PLANHORISONT_TRINN + 1)
    expect(linjer.slice(-2)).toEqual(['fra dag 309: 10,81 mg', HORISONT])
    // Lengre trinn enn 28 dager, f.eks. for å fange opp sene symptomer etter fluoksetin.
    expect(kort(regel('fluoksetin'), 20, { justert: { [DAGER]: 42 } }).fra!.slice(0, 2)).toEqual(['dag 1–42: 15 mg', 'dag 43–84: 11,25 mg'])
  })

  it('gir fluoksetin 20 mg annenhver dag som egen valgfri regel: bare fra 20 mg daglig, i minst 28 dager, og uten automatisk seponering', () => {
    const r = ANNENHVER_DAG
    expect(r.inndata[0]!.verdier).toEqual([20])
    expect(r.inndata[0]!.grunnlag).toMatchObject({ avklaring: { merknad: expect.stringMatching(/inngangen er nøyaktig 20 mg daglig/) } })
    expect(r.bekreftelser.map((b) => b.id)).toEqual([ORGANFUNKSJON_ID, 'revurdering'])
    expect(kort(r, 20).fra).toEqual(['fra dag 1: 20 mg annenhver dag', 'annenhver dag i minst 28 dager; avslutning vurderes individuelt'])
    expect(stoppet(r, 40)).toBe('Startdosen 40 mg er utenfor det regelen gjelder for (20 mg).')
    // Inngangen er nøyaktig 20 mg daglig: rett under og rett over stopper.
    for (const dose of [10, 19.99, 20.01]) expect(stoppet(r, dose), String(dose)).toMatch(/utenfor det regelen gjelder for \(20 mg\)/)
    // Symptomer kan kreve vurdering før dag 28.
    expect(r.bekreftelser.find((b) => b.id === 'revurdering')!.tekst).toMatch(/symptomer kan kreve en vurdering tidligere enn dag 28/)
    // Etter tidligere seponeringssymptomer gjelder ikke strategien.
    expect(stoppet(r, 20, { pasientforhold: { ...besvart(r, 20).pasientforhold, [TIDLIGERE_SYMPTOMER_ID]: true } })).toMatch(/^Regelen gjelder ikke: Et tidligere forsøk/)
    // Minstetiden kan forlenges, ikke kortes ned.
    const [sti] = justerbare(r)[0]!
    expect(kort(r, 20, { justert: { [sti]: 42 } }).fra!.at(-1)).toBe('annenhver dag i minst 42 dager; avslutning vurderes individuelt')
    expect(stoppet(r, 20, { justert: { [sti]: 27 } })).toMatch(/27 dager er utenfor det regelen tillater \(minst 28 dager/)
    // Bare fluoksetin har regelen.
    expect(NEDTRAPPINGSSETT.regler.filter((x) => x.plan.forlop.some((f) => f.faser.some((fase) => fase.type === 'intervalldosering'))).map((x) => x.id)).toEqual([r.id])
    const res = beregn(r, besvart(r, 20))
    expect(res.status === 'modellberegning' && res.forlop[0]!.perioder).toEqual([{ fra: 1, til: null, mg: 20, hver: 2 }])
    expect(res.merknader.join(' ')).toMatch(/Planen gjør ingen ny reduksjon av seg selv og går ikke til null/)
  })

  it('har bupropion, agomelatin, duloksetin og venlafaksin bare som fagtekst, uten beregning', () => {
    for (const id of TEKSTREGLER) {
      const r = NEDTRAPPINGSSETT.regler.find((x) => x.id === id)!
      expect(r.beregnbarhet, id).toBe('bare_tekstlig')
      expect(r.eksempler, id).toEqual([])
      expect(stoppet(r, r.inndata[0]!.omrade![1]), id).toMatch(/bare tekstlig/)
      expect(NEDTRAPPINGSDEKNING.find((d) => d.nokkel === nokkel(r))!.status, id).toBe('bare_fagtekst')
    }
    // Bupropion finnes bare som depottabletter, som ikke kan deles: ingen trinn under 150 mg, og prosentregelen kan ikke beregnes.
    expect(regel('bupropion').plan.forlop[0]!.faser).toEqual([expect.objectContaining({ type: 'uten_beregning' })])
    const sisteUtkast = (r: Regel) => [...r.godkjenning.historikk].reverse().find((x) => x.status === 'utkast')!.merknad
    expect(sisteUtkast(regel('bupropion'))).toMatch(/fagkontrollen 30\.10\.2026/)
    // Duloksetin og venlafaksin: ikke godkjent som beregnbar plan med dagens formuleringer (substanskontrollen 30.10.2026).
    for (const n of ['duloksetin', 'venlafaksin']) {
      const r = regel(n)
      expect(r.plan.forlop[0]!.faser, n).toEqual([expect.objectContaining({ type: 'uten_beregning', grunn: expect.stringMatching(/regelen beregner ingen trinn/) })])
      expect(sisteUtkast(r), n).toMatch(/^Gjort om til fagtekst etter substanskontrollen 30\.10\.2026, runde 3/)
      expect(r.fortolkning.tilpasninger[0]!.tekst, n).toMatch(/en beregnet .*plan er derfor ikke godkjent før en dokumentert metode for mindre doser foreligger/)
      expect(NEDTRAPPINGSSETT.regler.some((x) => x.id === `seponering-${n}-langsom`), n).toBe(false)
    }
    // Venlafaksin: høyst 225 mg utenom depressive episoder, 375 mg ved dem.
    expect(regel('venlafaksin').inndata.map((k) => [k.omrade, k.ved ?? null, k.art])).toEqual([
      [[0, 375], null, 'bindende_krav'],
      [[0, 225], { sporsmal: 'depressive_episoder', svar: false }, 'bindende_krav'],
    ])
    expect(regel('duloksetin').inndata.map((k) => k.omrade)).toEqual([[0, 120]])
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
    expect(merknader('sertralin', 100, SERTRALIN)).toMatch(/sertralin dag 29–56: den ideelle dosen 56,25 mg kan ikke gis.*50 mg \(-11,11 %, faktisk reduksjon 33,33 % fra 75 mg\) og 75 mg \(\+33,33 %\)/)
    // Klomipramin 100 mg: 75 mg går med tre 25 mg-tabletter, men 56,25 mg kan ikke gis med hele og halve 10 og 25 mg-tabletter.
    expect(plan('klomipramin', 100, [p('K10', 'tablett', 10, { deling: '2' }), p('K25', 'tablett', 25, { deling: '2' })])).toEqual({ fra: ['fra dag 1: 75 mg = 3 tabletter à 25 mg', KAN_IKKE_GIS] })
    // Med kvartdelbare 25 mg-tabletter kan ett trinn til gis.
    expect(plan('sertralin', 100, [p('S25', 'tablett', 25, { deling: '4' })]).fra).toEqual(['dag 1–28: 75 mg = 3 tabletter à 25 mg', 'fra dag 29: 56,25 mg = 2¼ tabletter à 25 mg', KAN_IKKE_GIS])
  })

  it('stopper med forklaring, nærmeste doser og faktisk reduksjon når allerede første trinn ikke kan gis', () => {
    // Duloksetin, venlafaksin, paroksetin, mirtazapin og moklobemid har ingen beregnet plan med dagens formuleringer; doseplanen stopper ved regelen.
    expect(stopp('duloksetin', 60, [p('D30', 'kapsel', 30), p('D60', 'kapsel', 60)])).toMatch(/bare tekstlig/)
    expect(stopp('paroksetin', 40, [p('P20', 'tablett', 20, { deling: '2' })])).toMatch(/bare tekstlig/)
    // Fra en uvanlig startdose: de nærmeste dosene, uten å avvike fra regelen; og bare en større dose når ingen mindre kan gis.
    const s = stopp('sertralin', 50, SERTRALIN)
    expect(s).toMatch(/dag 1–28: den ideelle dosen 37,5 mg kan ikke gis.*25 mg \(-33,33 %, faktisk reduksjon 50 % fra 50 mg\) og 50 mg \(\+33,33 %\)/)
    // Her kan forskriveren velge en dose som kan gis (se testene av valgene); beregningen velger ikke selv.
    expect(s).toMatch(/Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 50 mg innenfor valgområdet 5–50 %: 25 mg \(−50 %, krever begrunnelse\)\. Beregningen velger ikke selv\./)
    expect(stopp('vortioksetin', 5, [p('V5', 'tablett', 5), p('V10', 'tablett', 10)])).toMatch(
      /dag 1–28: den ideelle dosen 3,75 mg kan ikke gis.*Nærmeste doser som kan settes sammen: 5 mg \(\+33,33 %\)\. Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet\. En annen dose/,
    )
    expect(stopp('vortioksetin', 5, [p('V5', 'tablett', 5), p('V10', 'tablett', 10)])).toMatch(NAERMESTE)
    expect(plan('sertralin', 250, SERTRALIN).stopp).toEqual(['Startdosen 250 mg er utenfor det regelen gjelder for (høyst 200 mg).'])
  })

  it('lar forskriveren velge blant de nærmeste dosene som kan gis, med faktisk reduksjon innenfor valgområdet (P7.5)', () => {
    // Sertralin 100 mg: trinn 2 (56,25 mg) kan ikke gis; planen står på 75 mg og tilbyr 50 mg, som er 33,33 % fra 75 mg og krever begrunnelse (over 25 %).
    const r = beregnet('sertralin', 100, SERTRALIN)
    expect(r.status).toBe('doseplan')
    expect(r.trinnvalg?.map((t) => [t.forlop, t.trinn, t.fra_dag, t.fra_mg, t.beregnet_mg, t.omrade, t.doser.map((d) => [d.mg, avrund(d.prosent), d.krever_begrunnelse])])).toEqual([
      ['fra', 2, 29, 75, 56.25, [5, 50], [[50, 33.33, true]]],
    ])
    const valg = (mg: number, trinn = 2, fra_mg = 75) => ({ trinnvalg: [{ forlop: 'fra', trinn, fra_mg, mg }] })
    // Uten begrunnelse stopper valget; med begrunnelse fortsetter planen fra den valgte dosen, og neste trinn regnes fra den.
    expect(stopp('sertralin', 100, SERTRALIN, undefined, valg(50))).toMatch(/Trinn 2 av sertralin: den valgte dosen 50 mg er en reduksjon på 33,33 % og krever en skriftlig begrunnelse fra forskriveren \(over 25 %\)/)
    const med = beregnet('sertralin', 100, SERTRALIN, undefined, { ...valg(50), begrunnelse: BEGRUNNELSE })
    expect(planform(med).fra).toEqual([
      'dag 1–28: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg',
      'fra dag 29: 50 mg = 1 tablett à 50 mg, valgt av forskriveren (beregnet 56,25 mg; −33,33 %)',
      KAN_IKKE_GIS,
    ])
    expect(med.status === 'doseplan' && med.kontroller.map((k) => k.krav).join(' ')).toMatch(/Trinn 2 av sertralin er valgt av forskriveren fordi den beregnede dosen \(56,25 mg\) ikke kan gis; den faktiske reduksjonen er innenfor valgområdet 5–50 %/)
    expect(med.trinnvalg?.map((t) => [t.trinn, t.fra_mg, t.beregnet_mg, t.doser.map((d) => d.mg)])).toEqual([[3, 50, 37.5, [25]]])
    // Utenfor valgområdet, ikke lavere, ikke vist nøyaktig: stopp med grunnen.
    expect(stopp('sertralin', 100, SERTRALIN, undefined, { ...valg(25), begrunnelse: BEGRUNNELSE })).toMatch(/den valgte dosen 25 mg er en reduksjon på 66,67 % fra 75 mg, utenfor valgområdet 5–50 %/)
    expect(stopp('sertralin', 100, SERTRALIN, undefined, valg(75))).toMatch(/den valgte dosen 75 mg er ikke lavere enn dosen før \(75 mg\)/)
    expect(stopp('sertralin', 100, SERTRALIN, undefined, valg(56.255))).toMatch(/kan ikke vises nøyaktig med to desimaler/)
    // Et valg gjelder bare når den beregnede dosen ikke kan gis: trinn 1 (75 mg) kan gis, så 50 mg der stopper planen.
    expect(stopp('sertralin', 100, SERTRALIN, undefined, { ...valg(50, 1, 100), begrunnelse: BEGRUNNELSE })).toMatch(/den beregnede dosen 75 mg for trinn 1 kan gis med preparatene i FEST, så valget 50 mg gjelder ikke\. Fjern valget\./)
    // Et valg fra en annen dose enn planen nå har før trinnet, er foreldet og avvises (P7-A): planen stopper og ber om et nytt valg.
    expect(stopp('sertralin', 100, SERTRALIN, undefined, valg(50, 2, 80))).toBe(
      'Valget 50 mg for trinn 2 (fra, fra 80 mg) gjelder ikke lenger: planen har ikke det trinnet fra den dosen, for eksempel etter endret dose eller andre valg. Fjern valget, og velg på nytt om trinnet ikke kan gis.',
    )
    expect(plan('sertralin', 100, SERTRALIN, undefined, valg(50, 2, 80)).fra).toBeUndefined()
  })

  it('holder valgene innenfor valgområdet for risikogruppen, også ved grensene', () => {
    // Middels risiko: 5–50 %, men fra laveste døgndose (sertralin 25 mg) høyst 25 %.
    const lav = (mg: number) => stoppet(regel('sertralin'), 25, { trinnvalg: [{ forlop: 'fra', trinn: 1, fra_mg: 25, mg }], begrunnelse: BEGRUNNELSE })
    expect(lav(18.75)).toBe('')
    expect(lav(18.74)).toMatch(/reduksjon på 25,04 % fra 25 mg, utenfor valgområdet 5–25 %/)
    expect(lav(23.75)).toBe('')
    expect(lav(23.76)).toMatch(/reduksjon på 4,96 % fra 25 mg, utenfor valgområdet 5–25 %/)
    // Over laveste døgndose gjelder hele området; 25 % krever ingen begrunnelse, over 25 % gjør.
    const fra50 = (mg: number, x: Partial<Beregningsinndata> = {}) => stoppet(regel('sertralin'), 50, { trinnvalg: [{ forlop: 'fra', trinn: 1, fra_mg: 50, mg }], ...x })
    expect(fra50(37.5)).toBe('')
    expect(fra50(37.49)).toMatch(/reduksjon på 25,02 % og krever en skriftlig begrunnelse fra forskriveren \(over 25 %\)/)
    expect(fra50(25, { begrunnelse: BEGRUNNELSE })).toBe('')
    expect(fra50(24.99, { begrunnelse: BEGRUNNELSE })).toMatch(/utenfor valgområdet 5–50 %/)
    // Etter lang behandlingstid krever mer enn 10 % begrunnelse.
    expect(fra50(45, { svar: LANG, justert: { [PROSENT]: 10 } })).toBe('')
    expect(fra50(44.99, { svar: LANG, justert: { [PROSENT]: 10 } })).toMatch(/krever en skriftlig begrunnelse fra forskriveren \(over 10 % ved lang behandlingstid\)/)
    // Den langsomme varianten: 1–5 %, så 75 mg fra 100 mg (25 %) tilbys ikke og kan ikke velges, heller ikke med begrunnelse.
    const langsom = regel('sertralin-langsom')
    expect(beregnet(langsom, 100, SERTRALIN).trinnvalg).toBeUndefined()
    expect(stoppet(langsom, 100, { trinnvalg: [{ forlop: 'fra', trinn: 1, fra_mg: 100, mg: 75 }], begrunnelse: BEGRUNNELSE })).toMatch(/reduksjon på 25 % fra 100 mg, utenfor valgområdet 1–5 %/)
    expect(stoppet(langsom, 100, { trinnvalg: [{ forlop: 'fra', trinn: 1, fra_mg: 100, mg: 95 }] })).toBe('')
    expect(stoppet(langsom, 100, { trinnvalg: [{ forlop: 'fra', trinn: 1, fra_mg: 100, mg: 94.99 }], begrunnelse: BEGRUNNELSE })).toMatch(/utenfor valgområdet 1–5 %/)
    // En regel uten valg per trinn tar ikke imot valg, og valgene må ha riktig form.
    expect(stoppet(ANNENHVER_DAG, 20, { trinnvalg: [{ forlop: 'fra', trinn: 1, fra_mg: 20, mg: 10 }] })).toMatch(/lar ikke forskriveren velge dosen per trinn/)
    expect(stoppet(regel('sertralin'), 50, { trinnvalg: [{ forlop: 'fra', trinn: 0, fra_mg: 50, mg: 25 }] })).toMatch(/Valgene av dose per trinn må oppgis som forløp, trinn \(fra 1\)/)
  })

  it('tilbyr valg bare når planen kan bli klinisk, og kontrollen krever område, individuell avslutning og ingen toleranse', () => {
    // Regelen er ikke klinisk godkjent: appens inngang stopper uten å tilby valg.
    const rr = regel('sertralin')
    const grunnlag = { utvalg: syntetiskUtvalg(SERTRALIN), koblinger: { [nokkel(rr)]: ['ID_SYNTETISK-TESTOKSETIN'] }, overstyringer: [] }
    const k = kliniskDoseplan(rr, besvart(rr, 50), grunnlag, OMGIVELSE)
    expect([k.status, k.trinnvalg]).toEqual(['stoppet', undefined])
    // Kontrollen av regelen.
    const endre = (f: (fase: Extract<Fase, { type: 'nedtrapping' }>, r: Regel) => void) => {
      const r = structuredClone(rr)
      const fase = r.plan.forlop[0]!.faser[0]!
      if (fase.type !== 'nedtrapping') throw new Error()
      f(fase, r)
      return kontrollerRegelsett({ ...NEDTRAPPINGSSETT, regler: [r] }, P3)
    }
    expect(endre(() => {})).toEqual([])
    expect(endre((fase) => { if (fase.strategi.type === 'prosent_av_aktuell') delete fase.strategi.prosent.omrade })).toEqual(expect.arrayContaining([expect.stringMatching(/velge dose per trinn uten et område for reduksjonen/)]))
    expect(endre((fase) => { delete fase.avslutning })).toEqual(expect.arrayContaining([expect.stringMatching(/velge dose per trinn uten individuell avslutning/)]))
    const toleranse = (fase: Extract<Fase, { type: 'nedtrapping' }>, r: Regel) => {
      if (fase.strategi.type === 'prosent_av_aktuell') r.plan.forlop[0]!.dosevalg = { avvik_prosent: { ...fase.strategi.prosent, verdi: 5 } }
    }
    expect(endre(toleranse)).toEqual(expect.arrayContaining([expect.stringMatching(/velge dose per trinn og har samtidig en toleranse/)]))
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
    pasientforhold: besvart(regel('fluoksetin'), 40).pasientforhold!,
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

describe('Aksepttesten med norske preparater (P7.5, del E.2)', () => {
  const uttrekk = JSON.parse(readFileSync(new URL(`../../${FEST_AKSEPTTEST}`, import.meta.url), 'utf8')) as Festuttrekk
  const sett = akseptsett(uttrekk)
  const planer = [...sett.flatMap((t) => t.resultater.flatMap((r) => (r.plan ? [r.plan] : []))), ...annenhverDag(uttrekk).map((a) => a.plan)]

  it('er oppdatert', () => {
    expect(readFileSync(new URL(`../../${AKSEPTTESTFIL}`, import.meta.url), 'utf8'), 'Lag den på nytt med `npm run verktoy:regler -- aksepttest`.').toBe(lagAksepttestrapport(uttrekk))
  })

  it('regner hver hovedregel og langsom variant med de faktiske preparatene i FEST, i hver form, for alle scenariene', () => {
    expect(uttrekk.utvalg.kilde).toBe('FEST')
    expect(uttrekk.utvalg.kildedato).toBeTruthy()
    expect(AKSEPTSTOFFER.map((s) => s.hoved)).toEqual(HOVEDREGLER)
    expect(AKSEPTSTOFFER.map((s) => s.langsom)).toEqual(LANGSOMME)
    expect(new Set(sett.map((t) => t.nokkel))).toEqual(new Set(HOVEDREGLER.map(nokkel)))
    for (const t of sett) expect(t.resultater.map((r) => r.scenario), t.nokkel).toEqual(['a', 'b', 'c', 'd', 'f', 'h'])
    // Escitalopram har både tabletter og dråper, og hver form regnes for seg.
    expect(sett.filter((t) => t.nokkel === 'escitalopram').map((t) => t.form.navn)).toEqual(expect.arrayContaining(['Tablett', 'Dråper, oppløsning']))
  })

  it('gir aldri en klinisk plan eller en plan til null, og hver plan ender med individuell avslutning', () => {
    for (const p of planer) {
      expect(p.klinisk).toBe(false)
      if (p.status !== 'doseplan') continue
      const linjer = planform(p).fra!
      expect(linjer.join('\n')).not.toMatch(/seponert|: 0 mg/)
      expect(linjer.at(-1)).toMatch(AVSLUTNING)
    }
  })

  it('bruker hele dråper for escitalopram', () => {
    const drapeplaner = sett.filter((t) => t.nokkel === 'escitalopram' && t.form.navn === 'Dråper, oppløsning').flatMap((t) => t.resultater.flatMap((r) => (r.plan?.status === 'doseplan' ? [r.plan] : [])))
    expect(drapeplaner.length).toBeGreaterThan(0)
    for (const p of drapeplaner) for (const e of p.forlop[0]!.perioder.flatMap((x) => x.elementer)) expect([e.doseenhet, Number.isInteger(e.antall)]).toEqual(['drape', true])
  })

  it('viser dosene forskriveren kan velge, og hvor langt planen kommer med et valg ved hvert trinn som ikke kan gis (h)', () => {
    const rapport = readFileSync(new URL(`../../${AKSEPTTESTFIL}`, import.meta.url), 'utf8')
    const tilbud = sett.flatMap((t) => t.resultater.flatMap((r) => r.plan?.trinnvalg ?? []))
    expect(tilbud.length).toBeGreaterThan(0)
    for (const t of tilbud) {
      expect(rapport).toContain(valgtekst(t))
      // Hver dose som tilbys, er innenfor valgområdet, lavere enn dosen før og vises nøyaktig.
      for (const d of t.doser) {
        expect(d.prosent).toBeGreaterThanOrEqual(t.omrade[0] - 1e-9)
        expect(d.prosent).toBeLessThanOrEqual(t.omrade[1] + 1e-9)
        expect(d.mg).toBeLessThan(t.fra_mg)
        expect(avrund(d.mg)).toBe(d.mg)
      }
    }
    // Med valg kommer planen aldri kortere enn uten, og de valgte trinnene står i planen.
    for (const t of sett) {
      const [a, h] = [t.resultater[0]!.plan!, t.resultater.find((r) => r.scenario === 'h')!.plan!]
      expect(reduksjoner(h), `${t.nokkel} ${t.form.navn}`).toBeGreaterThanOrEqual(reduksjoner(a))
      if (reduksjoner(h) > reduksjoner(a)) expect(planform(h).fra!.join('\n')).toMatch(/valgt av forskriveren \(beregnet .* mg; −.* %\)/)
    }
  })

  it('viser hvor ofte planen stopper allerede ved første trinn (g)', () => {
    const vanlig = sett.map((t) => reduksjoner(t.resultater[0]!.plan!))
    expect(vanlig.some((n) => n === 0)).toBe(true)
    expect(readFileSync(new URL(`../../${AKSEPTTESTFIL}`, import.meta.url), 'utf8')).toContain(`I (a) stopper ${vanlig.filter((n) => n === 0).length} av ${sett.length} kombinasjoner`)
  })
})
