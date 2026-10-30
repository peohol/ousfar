/**
 * «Trappe ned antidepressiv» (P7 i `docs/verktøy-utviklingsplan.md`):
 *
 * - Dekningen (P7.1) har hvert antidepressivum i kildetabellen, uten
 *   johannesurt, med Stop-oppføringen fra P3, og statusen stemmer med
 *   regelsettet, P3-kildeoppføringene og FEST-uttrekket.
 * - Regelutkastene (P7.2) består kontrollene, er ikke godkjent, viser til sin
 *   egen Stop-oppføring og er startforslag med minstetider som må bekreftes,
 *   med svar på om behandlingstiden er lang. Valgene følger risikogruppene fra
 *   fagvurderingen 29.10.2026 (høyest risiko 5–10 % og minst 28 dager, ellers
 *   standard 25 % og minst 14 dager, 28 for fluoksetin), med begrunnelse for
 *   raske valg, testet ved grensene. Ingen plan går til null: den nedre
 *   grensen er en uavklart modellforutsetning, ikke en styrke og aldri et
 *   sluttpunkt. Paroksetins raske studievariant er bare i
 *   sammenligningssettet. Reglene holder ved grensene for dose, lav dose og
 *   justering, også for lave restdoser og 5 % per trinn.
 * - Doseplanmotoren (P5) gir planer som står på siste dose til avslutningen
 *   er vurdert, og forklarte stopp når et trinn ikke kan gis nøyaktig, med
 *   syntetiske preparater i FESTs form. Bare regler godkjent i testen gir en
 *   klinisk plan, og bare med fersk FEST.
 * - De nye reglene brukes bare av verktøyene, ikke av fortolkningen.
 *
 * Alle preparater og doser her er syntetiske; ingen pasientopplysninger.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dekningFor, dekningstekst, NEDTRAPPINGSDEKNING } from '../verktoy/dekning'
import { DEKNINGSRAPPORTFIL, lagDekningsrapport, lavesteStyrke, seponeringsregler, stopOppforing } from '../verktoy/dekningsrapport'
import { beregnPlan, inndataFor, mangler, medRegel, TOMT_SKJEMA, type Planskjema } from '../verktoy/doseplan'
import { lesKartdata } from '../verktoy/kartdata'
import { markedsgrunnlag, preparaterFor } from '../verktoy/kartlegging'
import { beregnDoseplan, planform } from '../verktoy/motor/plan'
import { syntetiskUtvalg, type Testpreparat } from '../verktoy/motor/syntetisk'
import { VERKTOY, virkestoffvalg } from '../verktoy/register'
import { AVSLUTNING_KORT, beregn, kortform, nulldagfeil, type Forlopsresultat, type Periode } from '../verktoy/regler/beregning'
import { erKliniskGodkjent } from '../verktoy/regler/godkjenning'
import { kontrollerRegelsett, lesKontrollgrunnlag } from '../verktoy/regler/kontroll'
import { apneValg, henvisninger, justerbare, nulltrinnfeil, type Beregningsinndata, type Regel } from '../verktoy/regler/modell'
import { NICE, RCPSYCH } from '../verktoy/regler/bygg'
import { JUSTERING, LANG_BEHANDLINGSTID, NEDTRAPPINGSSETT, SAMMENLIGNINGSSETT, STARTFORSLAG, TEKNISK_MAKS_DAGER, TIDLIGERE_SYMPTOMER } from '../verktoy/regler/nedtrapping'
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
const STUDIEVARIANT = SAMMENLIGNINGSSETT.regler[0]!

/** Svarene om behandlingstiden. */
const KORT = { [LANG_BEHANDLINGSTID.id]: false }
const LANG = { [LANG_BEHANDLINGSTID.id]: true }
/** En syntetisk begrunnelse; aldri pasientopplysninger. */
const BEGRUNNELSE = 'Syntetisk begrunnelse: kort behandlingstid og ingen tidligere seponeringssymptomer.'
const INGEN_REDUKSJON = /har regelen ingen reduksjon før avslutningen, og regelen har ingen godkjent avslutning; den må vurderes individuelt/

/** Inndata med startforslaget bekreftet, hvert unntak avkreftet og kort behandlingstid, som i eksemplene. */
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
  if (ned.type !== 'nedtrapping') throw new Error(r.id)
  const { avslutning: _, ...tilNull } = ned
  const dager = { ...ned.trinnlengde, verdi: 14 }
  x.plan.forlop[0]!.faser = [
    tilNull,
    { type: 'hold', dose: { type: 'aktuell' }, varighet: { type: 'dager', dager } },
    { type: 'opptrapping', trinn: [{ mg: { ...dager, verdi: 20, enhet: 'mg' }, dager }] },
    ned,
  ]
  return x
}
const nedreGrense = (r: Regel) => {
  const fase = r.plan.forlop[0]!.faser[0]!
  return fase.type === 'nedtrapping' && fase.strategi.type === 'prosent_av_aktuell' ? fase.strategi.sluttdose_mg.verdi : null
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
    expect(NEDTRAPPINGSSETT.regler).toHaveLength(16)
    expect(SAMMENLIGNINGSSETT.regler).toHaveLength(1)
    // Escitalopram er flyttet fra pilotsettet til P7; appen bruker begge, og ingen regel-ID finnes i begge.
    expect(PILOTSETT.regler.map((r) => r.id)).not.toContain('seponering-escitalopram')
    expect(regel('escitalopram').godkjenning.historikk.at(-2)!.merknad).toMatch(/fagvurderingen 29\.10\.2026/)
    expect(new Set(REGELSETT.regler.map((r) => r.id)).size).toBe(REGELSETT.regler.length)
  })

  it('er ikke godkjent: alle er til faglig kontroll, valgområdene er avklart i fagvurderingen, og de andre valgene står åpne', () => {
    for (const r of P7REGLER) {
      expect(r.godkjenning.status, r.id).toBe('til_faglig_kontroll')
      expect(erKliniskGodkjent(r), r.id).toBe(false)
      expect(r.godkjenning.historikk.every((s) => s.status !== 'klinisk_godkjent'), r.id).toBe(true)
      if (r.beregnbarhet !== 'bare_tekstlig') expect(apneValg(r).length, r.id).toBeGreaterThan(0)
    }
    // Reglene er omarbeidet etter hver kontroll og fagvurderingen, og sendt til kontroll på nytt hver gang.
    const steg = (n: number) => Array.from({ length: n }, (_, i) => [`utkast ${i + 1}`, `til_faglig_kontroll ${i + 1}`]).flat()
    for (const r of BEREGNBARE) expect([r.versjon, r.godkjenning.historikk.map((s) => `${s.status} ${s.regelversjon}`)], r.id).toEqual([4, steg(4)])
    expect([STUDIEVARIANT.versjon, STUDIEVARIANT.godkjenning.historikk.map((s) => `${s.status} ${s.regelversjon}`)]).toEqual([3, steg(3)])
    for (const r of [...BEREGNBARE, STUDIEVARIANT]) {
      expect(r.godkjenning.historikk.at(-2)!.merknad, r.id).toMatch(/^Omarbeidet etter fagvurderingen 29\.10\.2026/)
      expect(r.godkjenning.historikk.at(-1)!.dato, r.id).toBe('2026-10-29')
    }
    for (const r of BEREGNBARE) {
      // Valgområdene (prosent og dager, med kravene om begrunnelse) er avklart av den uavhengige kontrolløren for denne versjonen.
      for (const [sti, p] of justerbare(r)) {
        const g = p.grunnlag
        expect(g.type === 'ousfar_vurdering' && g.avklaring, `${r.id} ${sti}`).toMatchObject({ rolle: 'uavhengig_kontrollor', regelversjon: r.versjon, dato: '2026-10-29', merknad: expect.stringMatching(/^Beslutning 1 i fagvurderingen/) })
      }
      // Den nedre grensen, trinnet ved lav dose, startdosen og unntaket står åpne til P7.5.
      const apne = apneValg(r).join(' ')
      for (const x of ['strategi.sluttdose_mg (åpent forslag)', 'inndata.startdose (åpent forslag)', `${TIDLIGERE_SYMPTOMER.id} (åpent forslag)`]) expect(apne, r.id).toContain(x)
      for (const [sti] of justerbare(r)) expect(apne, `${r.id} ${sti}`).not.toContain(`${sti} (åpent forslag)`)
    }
    // OUSFARs måte å følge rådet om 5–10 % etter lang behandlingstid er ikke avklart.
    expect(apneValg(regel('sertralin')).join(' ')).toContain(`${PROSENT}.begrunnelseskrav[1] (åpent forslag)`)
  })

  it('viser bare til sin egen Stop-oppføring, og Psychiatrienet er aldri grunnlag', () => {
    for (const r of P7REGLER) {
      const d = NEDTRAPPINGSDEKNING.find((x) => r.fra.type === 'virkestoff' && x.nokkel === r.fra.nokkel)!
      expect(r.referanser, r.id).toEqual([{ kilde: 'psychiatrienet', kildeoppforing: stopOppforing(d.kode) }])
      const utenReferanser = JSON.stringify({ ...r, referanser: [] })
      expect(utenReferanser, r.id).not.toMatch(/"kilde":"psychiatrienet"/)
    }
  })

  it('gir bare et startforslag med minstetider: det må bekreftes, behandlingstiden må oppgis, og regelen gjelder ikke etter seponeringssymptomer ved et tidligere forsøk', () => {
    for (const r of [...BEREGNBARE, STUDIEVARIANT]) {
      expect(r.bekreftelser, r.id).toEqual([STARTFORSLAG])
      expect(r.unntak[0], r.id).toEqual(TIDLIGERE_SYMPTOMER)
      expect(r.sporsmal, r.id).toEqual([LANG_BEHANDLINGSTID])
      const dose = r.eksempler.find((e) => !e.stopp)!.inndata.startdose_mg
      expect(kort(r, dose).fra!.at(-1), r.id).toBe(AVSLUTNING_KORT)
      expect(stoppet(r, dose, { bekreftet: [] }), r.id).toMatch(/Må bekreftes før beregning: Planen er et startforslag/)
      expect(stoppet(r, dose, { pasientforhold: {} }), r.id).toMatch(/Må avklares før beregning \(ukjent\): Et tidligere forsøk/)
      expect(stoppet(r, dose, { pasientforhold: { ...besvart(r, dose).pasientforhold, [TIDLIGERE_SYMPTOMER.id]: true } }), r.id).toMatch(/Regelen gjelder ikke: Et tidligere forsøk/)
      expect(stoppet(r, dose, { svar: {} }), r.id).toBe('Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?')
      expect(stoppet(r, dose, { svar: { ...KORT, annet: true } }), r.id).toBe('Svaret «annet» gjelder ikke et spørsmål i regelen.')
    }
    // Svaret står i planen.
    const res = beregn(regel('sertralin'), besvart(regel('sertralin'), 100, { svar: LANG, justert: { [PROSENT]: 10 } }))
    expect(res.status === 'modellberegning' && res.kontroller).toContainEqual({ krav: `${LANG_BEHANDLINGSTID.tekst} Ja`, oppfylt: true, detalj: 'Oppgitt av forskriveren.' })
    // Startforslaget er den felles håndteringsregelen fra fagvurderingen, med NICEs og RCPsychs råd; unntaket er OUSFARs valg og står åpent.
    expect(STARTFORSLAG.grunnlag).toEqual({ type: 'kilde', henvisninger: [NICE.tempo, NICE.alvorlig, RCPSYCH.tid, RCPSYCH.smaa] })
    expect(STARTFORSLAG.tekst).toMatch(/dagene per trinn er minstetider\. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet/)
    expect(STARTFORSLAG.tekst).toMatch(/beregnes en ny plan fra dosen pasienten da bruker/)
    expect(LANG_BEHANDLINGSTID.grunnlag).toEqual({ type: 'kilde', henvisninger: [RCPSYCH.langvarig, RCPSYCH.fireUker, NICE.halveringstid] })
    expect(TIDLIGERE_SYMPTOMER.grunnlag).toMatchObject({ type: 'ousfar_vurdering', avklaring: null, henvisninger: [NICE.tidligere, NICE.alvorlig, RCPSYCH.langvarig] })
    // Moklobemid har i tillegg et unntak ved alvorlig nedsatt leverfunksjon, der preparatomtalen reduserer dosen.
    expect(stoppet(regel('moklobemid'), 300, { pasientforhold: { tidligere_seponeringssymptomer: false, nedsatt_leverfunksjon: true } })).toMatch(/Regelen gjelder ikke: Pasienten har alvorlig nedsatt leverfunksjon/)
  })

  it('har en nedre grense, en firedel av laveste døgndose i preparatomtalen, som er en uavklart modellforutsetning, aldri et sluttpunkt og aldri en styrke i FEST', () => {
    for (const r of BEREGNBARE) {
      const grense = nedreGrense(r)!
      const fase = r.plan.forlop[0]!.faser[0]!
      const grunnlag = fase.type === 'nedtrapping' && fase.strategi.type === 'prosent_av_aktuell' ? fase.strategi.sluttdose_mg.grunnlag : null
      expect(grunnlag, r.id).toMatchObject({ type: 'ousfar_vurdering', avklaring: null, begrunnelse: expect.stringMatching(/^Uavklart modellforutsetning: planens nedre grense.*går aldri til null.*avviste grensen som automatisk sluttpunkt/) })
      expect(grunnlag?.henvisninger, r.id).toContainEqual(RCPSYCH.lavDose)
      expect(r.fortolkning.usikkerhet.join(' '), r.id).toMatch(/uavklart modellforutsetning, ikke en validert seponeringsterskel/)
      const laveste = lavesteStyrke(preparaterFor(KART, nokkel(r)))!
      expect(grense, r.id).toBeLessThan(laveste)
    }
    expect(Object.fromEntries(BEREGNBARE.map((r) => [nokkel(r), nedreGrense(r)]))).toEqual({
      amitriptylin: 2.5,
      bupropion: 37.5,
      citalopram: 2.5,
      duloksetin: 7.5,
      escitalopram: 1.25,
      fluoksetin: 5,
      fluvoksamin: 12.5,
      klomipramin: 2.5,
      mirtazapin: 3.75,
      moklobemid: 75,
      nortriptylin: 6.25,
      paroksetin: 2.5,
      sertralin: 6.25,
      venlafaksin: 9.375,
      vortioksetin: 1.25,
    })
  })

  it('følger risikogruppene fra fagvurderingen: 10 % (5–10 %) og minst 28 dager ved høyest risiko, ellers 25 % (5–50 %) og minst 14 dager (28 for fluoksetin)', () => {
    expect(BEREGNBARE.filter((r) => r.tittel.includes('høy risiko')).map(nokkel)).toEqual(HOY_RISIKO)
    for (const r of BEREGNBARE) {
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
      // Planen går aldri til null, og har ingen minste varighet å måle til.
      expect(fase.type === 'nedtrapping' && [fase.avslutning, fase.minste_varighet], r.id).toEqual(['individuell', undefined])
    }
    for (const n of HOY_RISIKO) expect(RCPSYCH.hoyRisiko.faktum, n).toContain(n)
    expect(RCPSYCH.middelsRisiko.faktum).toMatch(/lav har blant andre vortioksetin/)
  })

  it('bygger trinnlengden på RCPsychs to til fire uker, og NICEs én til to uker bare på fluoksetin', () => {
    const ANTIDEPRESSIVA = ['seponering-citalopram-hyperbolsk', 'kryssnedtrapping-sertralin-mirtazapin', 'mao-fluoksetin-fenelzin']
    const pilot = PILOTSETT.regler.filter((r) => ANTIDEPRESSIVA.includes(r.id))
    expect(pilot.map((r) => r.id)).toEqual(ANTIDEPRESSIVA)
    for (const r of [...BEREGNBARE, ...pilot]) {
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
    const trinn = (id: string) => pilot.find((r) => r.id === id)!.plan.forlop[0]!.faser.flatMap((f) => (f.type === 'nedtrapping' ? [[f.trinnlengde.verdi, f.trinnlengde.omrade]] : []))
    expect(ANTIDEPRESSIVA.map(trinn)).toEqual([[[14, [14, 28]]], [[14, [7, 14]]], [[28, undefined]]])
    expect('sted' in NICE.fluoksetinVurdering && NICE.fluoksetinVurdering.sted).toBe('anbefaling 1.4.18 (om fluoksetin)')
  })

  it('har paroksetins raske studievariant bare til sammenligning, ikke i verktøyet, og heller ikke den går til null', () => {
    expect(STUDIEVARIANT.id).toBe('seponering-paroksetin-studievariant')
    expect(STUDIEVARIANT.tittel).toMatch(/rask studievariant til sammenligning \(ikke klinisk anbefaling\)/)
    expect(REGELSETT.regler.map((r) => r.id)).not.toContain(STUDIEVARIANT.id)
    expect(tilgjengelighet(TRAPPE_NED, { fra: { nokkel: 'paroksetin', formulering: 'standard' } }).regler.map((r) => r.id)).toEqual(['seponering-paroksetin'])
    expect(kort(STUDIEVARIANT, 20).fra).toEqual(['fra dag 1: 10 mg', AVSLUTNING_KORT])
    expect(kort(regel('paroksetin'), 20).fra!.slice(-2)).toEqual(['fra dag 505: 2,7 mg', AVSLUTNING_KORT])
  })

  it('krever begrunnelse ved raske valg, ved grensene, og ikke ellers', () => {
    const krever = /krever en skriftlig begrunnelse fra forskriveren/
    // Middels risiko: over 25 %, og etter lang behandlingstid over 10 % eller under 28 dager.
    for (const n of ['amitriptylin', 'bupropion', 'citalopram', 'escitalopram', 'fluvoksamin', 'klomipramin', 'nortriptylin', 'sertralin']) {
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
    // Det som ikke er justerbart, kan ikke endres: den nedre grensen.
    expect(stoppet(s, 100, { justert: { 'plan.forlop[0].faser[0].strategi.sluttdose_mg': 3 } })).toMatch(/kan ikke justeres i denne regelen/)
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

  it('går aldri til null: hver plan stopper på siste dose over den nedre grensen, og avslutningen vurderes individuelt', () => {
    for (const r of P7REGLER) {
      for (const e of r.eksempler.filter((x) => !x.stopp)) {
        const res = beregn(r, e.inndata)
        const linjer = kortform(res).fra!
        expect(linjer.at(-1), `${r.id} ${e.id}`).toBe(AVSLUTNING_KORT)
        expect(linjer.at(-2), `${r.id} ${e.id}`).toMatch(/^fra dag \d+: [\d,]+ mg$/)
        expect(linjer.join(' '), `${r.id} ${e.id}`).not.toMatch(/seponert/)
        expect(res.merknader.join(' '), `${r.id} ${e.id}`).toMatch(/Planen går ikke til null\. Fra dag \d+ står pasienten på [\d,]+ mg av \w+ til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning \(nulltrinn\)\./)
      }
    }
    // Heller ikke ved grensene og med de minste og største trinnene: ingen beregning gir seponering.
    for (const r of BEREGNBARE) {
      const [, maks] = r.inndata[0]!.omrade!
      const grense = nedreGrense(r)!
      const [lavest, hoyest] = justerbare(r)[0]![1].omrade
      for (const dose of [maks, grense * 1.5, grense * 3])
        for (const prosent of [lavest, hoyest]) {
          const res = beregn(r, besvart(r, dose, { justert: { [PROSENT]: prosent }, begrunnelse: BEGRUNNELSE }))
          if (res.status === 'modellberegning') expect(res.forlop.map((f) => f.siste_dosedag), `${r.id} ${dose} ${prosent}`).toEqual([null])
          else expect(res.stoppgrunner.join(' '), `${r.id} ${dose} ${prosent}`).toMatch(INGEN_REDUKSJON)
        }
    }
    // Det holder også for alle seponeringsregler appen bruker, også den hyperbolske pilotregelen.
    for (const r of REGELSETT.regler.filter((x) => x.plan.form === 'seponering' && x.beregnbarhet !== 'bare_tekstlig')) {
      for (const e of r.eksempler.filter((x) => !x.stopp)) expect(beregn(r, e.inndata).status === 'modellberegning' && kortform(beregn(r, e.inndata)).fra!.at(-1), `${r.id} ${e.id}`).toBe(AVSLUTNING_KORT)
    }
  })

  it('godtar ingen seponeringsregel som går til null, eller som både har individuell avslutning og minste varighet', () => {
    const r = structuredClone(regel('citalopram'))
    const fase = r.plan.forlop[0]!.faser[0]!
    if (fase.type !== 'nedtrapping') throw new Error()
    delete fase.avslutning
    const sett = (x: Regel) => ({ ...NEDTRAPPINGSSETT, regler: [x] })
    expect(kontrollerRegelsett(sett(r)).join(' ')).toMatch(/forløp fra slutter ikke med en nedtrapping med individuell avslutning; ingen avslutning er godkjent, så en seponeringsregel kan ikke gå til null/)
    fase.avslutning = 'individuell'
    fase.minste_varighet = { verdi: 28, enhet: 'dager', art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [RCPSYCH.fireUker] } }
    expect(kontrollerRegelsett(sett(r)).join(' ')).toMatch(/har både minste varighet og individuell avslutning/)
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
    const med = (faser: (f: Regel['plan']['forlop'][number]['faser']) => Regel['plan']['forlop'][number]['faser']) => {
      const r = structuredClone(regel('citalopram'))
      r.plan.forlop[0]!.faser = faser(r.plan.forlop[0]!.faser)
      return r
    }
    // Seponering fra dag 1 i stedet for nedtrappingen, seponering etter den, og en fase etter den som holder dosen og så slutter.
    const direkte = med(() => [{ type: 'seponer' }])
    expect(nulltrinnfeil(direkte)).toEqual([
      'forløp fra seponerer; ingen avslutning er godkjent, så en seponeringsregel kan ikke seponere',
      'forløp fra slutter ikke med en nedtrapping med individuell avslutning; ingen avslutning er godkjent, så en seponeringsregel kan ikke gå til null',
    ])
    expect(kontrollerRegelsett(sett(direkte)).join(' ')).toMatch(/forløp fra seponerer/)
    expect(nulltrinnfeil(med((f) => [...f, { type: 'seponer' }])).join(' ')).toMatch(/seponerer.*slutter ikke med en nedtrapping/)
    expect(nulltrinnfeil(med((f) => [...f, { type: 'hold', dose: { type: 'aktuell' }, varighet: { type: 'dager', dager: f[0]!.type === 'nedtrapping' ? f[0]!.trinnlengde : null! } }])).join(' ')).toMatch(/trapper ned før siste fase.*slutter ikke med en nedtrapping/)
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
    for (const r of [...PILOTSETT.regler.filter((x) => x.plan.form !== 'seponering'), regel('agomelatin')]) expect(nulltrinnfeil(r), r.id).toEqual([])
    expect(PILOTSETT.regler.some((x) => x.plan.form !== 'seponering' && x.plan.forlop.some((f) => f.faser.some((fase) => fase.type === 'seponer')))).toBe(true)
    expect(regel('agomelatin').beregnbarhet).toBe('bare_tekstlig')
    // Og alle de virkelige seponeringsreglene oppfyller kravet.
    for (const r of [...P7REGLER, ...PILOTSETT.regler]) expect(nulltrinnfeil(r), r.id).toEqual([])
  })

  it('gjelder enhver lav dose opp til høyeste dose; under den nedre grensen, eller når første trinn ville vært under den, stopper den uten å kalle dosen ugyldig', () => {
    const UNDER = /er under regelens nedre grense \(.*\)\. Regelen har ingen trinn under den og ingen godkjent avslutning; videre nedtrapping og avslutning må vurderes individuelt\./
    for (const r of BEREGNBARE) {
      const [min, maks] = r.inndata[0]!.omrade!
      const grense = nedreGrense(r)!
      expect(min, r.id).toBe(0)
      expect(stoppet(r, maks), r.id).toBe('')
      expect(stoppet(r, maks + 0.01), r.id).toMatch(new RegExp(`utenfor det regelen gjelder for \\(høyst ${String(maks).replace('.', ',')} mg\\)`))
      for (const dose of [0.01, grense / 2, grense - 0.01]) {
        expect(stoppet(r, dose), `${r.id} ${dose}`).toMatch(UNDER)
        expect(stoppet(r, dose), `${r.id} ${dose}`).not.toMatch(/utenfor/)
      }
      // Ved grensen ville første trinn vært under den, også med 5 %: ingen reduksjon, og ingen seponering fra dag 1.
      for (const prosent of [undefined, 5]) expect(stoppet(r, grense, { ...(prosent && { justert: { [PROSENT]: prosent } }) }), r.id).toMatch(INGEN_REDUKSJON)
    }
  })

  it('holder ved grensen der første trinn så vidt er over den nedre grensen', () => {
    // 25 %: 3,34 mg gir 2,505 mg (over 2,5 mg); 3,33 mg gir 2,4975 mg (under).
    expect(kort(regel('citalopram'), 3.34).fra).toEqual(['fra dag 1: 2,51 mg', AVSLUTNING_KORT])
    expect(stoppet(regel('citalopram'), 3.33)).toMatch(INGEN_REDUKSJON)
    // 10 %: 4,17 mg gir 3,753 mg (over 3,75 mg); 4,16 mg gir 3,744 mg (under).
    expect(kort(regel('mirtazapin'), 4.17).fra).toEqual(['fra dag 1: 3,75 mg', AVSLUTNING_KORT])
    expect(stoppet(regel('mirtazapin'), 4.16)).toMatch(INGEN_REDUKSJON)
    // Ved høyest risiko er trinnet 10 % i hele doseområdet.
    expect(kort(regel('moklobemid'), 300).fra![0]).toBe('dag 1–28: 270 mg')
    expect(kort(regel('moklobemid'), 600).fra![0]).toBe('dag 1–28: 540 mg')
  })

  it('beregner lave restdoser under ordinært doseområde', () => {
    expect(kort(regel('sertralin'), 12.5).fra).toEqual(['dag 1–28: 9,38 mg', 'fra dag 29: 7,03 mg', AVSLUTNING_KORT])
    expect(kort(regel('nortriptylin'), 15).fra).toEqual(['dag 1–28: 11,25 mg', 'dag 29–56: 8,44 mg', 'fra dag 57: 6,33 mg', AVSLUTNING_KORT])
    expect(kort(regel('venlafaksin'), 20).fra![0]).toBe('dag 1–28: 18 mg')
    expect(stoppet(regel('sertralin'), 6.24)).toMatch(/Dosen 6,24 mg av sertralin er under regelens nedre grense \(6,25 mg\)/)
    expect(stoppet(regel('paroksetin'), 2)).toMatch(/Dosen 2 mg av paroksetin er under regelens nedre grense \(2,5 mg\)/)
  })

  it('tåler stresstesten fra fagvurderingen: 5 % per trinn fra 20 mg paroksetin gir 40 reduksjoner og ingen nulltrinn', () => {
    const linjer = kort(regel('paroksetin'), 20, { justert: { [PROSENT]: 5 } }).fra!
    expect(linjer).toHaveLength(41)
    expect(linjer.slice(-3)).toEqual(['dag 1065–1092: 2,71 mg', 'fra dag 1093: 2,57 mg', AVSLUTNING_KORT])
    // Lengre trinn enn 28 dager, f.eks. for å fange opp sene symptomer etter fluoksetin.
    expect(kort(regel('fluoksetin'), 20, { justert: { [DAGER]: 42 } }).fra).toEqual(['dag 1–42: 15 mg', 'dag 43–84: 11,25 mg', 'dag 85–126: 8,44 mg', 'fra dag 127: 6,33 mg', AVSLUTNING_KORT])
  })
})

/* --- Doseplanene med syntetiske preparater ---------------------------------------- */

const p = (id: string, form: Testpreparat['form'], mg: number, x: Partial<Testpreparat> = {}): Testpreparat => ({ id, virkestoff: 'testoksetin', varenavn: `Syntetisk ${id}`, form, mg, ...x })
const OMGIVELSE = { idag: '2026-11-01', naa: '2026-11-01T12:00:00Z' }
const TABLETTER = { fra: { klasse: 'peroral' as const, legemiddelformer: ['SYN-TAB'] } }

/** Planen etter regelen (ikke godkjent: en modellberegning), med syntetiske preparater for virkestoffet. */
function plan(r: Regel | string, startdose_mg: number, preparater: Testpreparat[], formvalg?: Record<string, { klasse: 'peroral'; legemiddelformer: string[] }>, x: Partial<Beregningsinndata> = {}) {
  const rr = typeof r === 'string' ? regel(r) : r
  const grunnlag = { utvalg: syntetiskUtvalg(preparater), koblinger: { [nokkel(rr)]: ['ID_SYNTETISK-TESTOKSETIN'] }, overstyringer: [] }
  return planform(beregnDoseplan(rr, { ...besvart(rr, startdose_mg, x), ...(formvalg && { formvalg }) }, grunnlag, OMGIVELSE))
}
const stopp = (...x: Parameters<typeof plan>) => (plan(...x).stopp ?? []).join(' ')
/** Halvering med begrunnelse, så alle trinnene kan gis med delbare tabletter. */
const HALVERING = { justert: { [PROSENT]: 50 }, begrunnelse: BEGRUNNELSE }

const SERTRALIN = [p('S25', 'tablett', 25), p('S50', 'tablett', 50, { deling: '2' }), p('S100', 'tablett', 100, { deling: '2' })]
const FLUOKSETIN = [p('F20', 'tablett', 20, { deling: '4' })]
const NAERMESTE = /kan ikke gis med preparatene i FEST nøyaktig\. Nærmeste doser som kan settes sammen: .*krever en ny faglig beslutning; beregningen gjør det ikke selv\./

describe('Doseplanene (P7.3–P7.4)', () => {
  it('gir en plan med alle trinnene når de kan gis, og står på siste dose til avslutningen er vurdert', () => {
    expect(plan('fluoksetin', 40, FLUOKSETIN, undefined, HALVERING)).toEqual({
      fra: ['dag 1–28: 20 mg = 1 tablett à 20 mg', 'dag 29–56: 10 mg = ½ tablett à 20 mg', 'fra dag 57: 5 mg = ¼ tablett à 20 mg', AVSLUTNING_KORT],
    })
  })

  it('stopper med begrunnelse når et trinn ikke kan gis, i stedet for å slutte ved laveste styrke', () => {
    // Sertralin 100 mg: 75 mg kan gis, men 56,25 mg ikke; planen slutter ikke ved en styrke.
    const s = stopp('sertralin', 100, SERTRALIN)
    expect(s).toMatch(/dag 29–56: den ideelle dosen 56,25 mg kan ikke gis/)
    expect(s).toMatch(NAERMESTE)
    // Duloksetin finnes i 30 og 60 mg, og kapsler deles ikke: 10 % mindre kan ikke gis.
    expect(stopp('duloksetin', 60, [p('D30', 'kapsel', 30), p('D60', 'kapsel', 60)])).toMatch(/dag 1–28: den ideelle dosen 54 mg kan ikke gis.*30 mg \(-44,44 %\) og 60 mg \(\+11,11 %\)/)
    // Venlafaksin 150 mg: 135 mg kan ikke gis.
    expect(stopp('venlafaksin', 150, [p('V37', 'kapsel', 37.5), p('V75', 'kapsel', 75), p('V150', 'kapsel', 150)])).toMatch(/dag 1–28: den ideelle dosen 135 mg kan ikke gis/)
    // Bupropion fra 150 mg: ingen dose under 150 mg kan gis.
    expect(stopp('bupropion', 150, [p('B150', 'tablett', 150), p('B300', 'tablett', 300)])).toMatch(/dag 1–28: den ideelle dosen 112,5 mg kan ikke gis/)
  })

  it('stopper med de nærmeste dosene når et trinn fra en uvanlig startdose ikke kan gis nøyaktig, uten å avvike fra regelen', () => {
    const s = stopp('sertralin', 150, SERTRALIN, undefined, HALVERING)
    expect(s).toMatch(/dag 29–56: den ideelle dosen 37,5 mg/)
    expect(s).toMatch(/25 mg \(-33,33 %\) og 50 mg \(\+33,33 %\)/)
    expect(s).toMatch(NAERMESTE)
    expect(plan('sertralin', 250, SERTRALIN).stopp).toEqual(['Startdosen 250 mg er utenfor det regelen gjelder for (høyst 200 mg).'])
    expect(stopp('duloksetin', 90, [p('D30', 'kapsel', 30), p('D60', 'kapsel', 60)])).toMatch(/dag 1–28: den ideelle dosen 81 mg kan ikke gis.*60 mg \(-25,93 %\) og 90 mg \(\+11,11 %\)/)
  })

  it('følger den langsomme paroksetinregelen i appens regelsett, og den raske studievarianten bare til sammenligning', () => {
    const PAROKSETIN = [p('P20', 'tablett', 20, { deling: '2' })]
    expect(stopp('paroksetin', 40, PAROKSETIN)).toMatch(/dag 1–28: den ideelle dosen 36 mg kan ikke gis.*30 mg \(-16,67 %\) og 40 mg \(\+11,11 %\)/)
    expect(plan(STUDIEVARIANT, 40, PAROKSETIN)).toEqual({
      fra: ['dag 1–7: 30 mg = 1½ tabletter à 20 mg', 'dag 8–14: 20 mg = 1 tablett à 20 mg', 'fra dag 15: 10 mg = ½ tablett à 20 mg', AVSLUTNING_KORT],
    })
  })

  it('stopper ved de små trinnene i en lang nedtrapping når tablettene ikke gir dosen', () => {
    // Klomipramin 100 mg: 75 mg går med tre 25 mg-tabletter, men 56,25 mg kan ikke gis med hele og halve 10 og 25 mg-tabletter.
    expect(kort(regel('klomipramin'), 150).fra!.slice(-2)).toEqual(['fra dag 365: 2,67 mg', AVSLUTNING_KORT])
    expect(stopp('klomipramin', 100, [p('K10', 'tablett', 10, { deling: '2' }), p('K25', 'tablett', 25, { deling: '2' })])).toMatch(/dag 29–56: den ideelle dosen 56,25 mg kan ikke gis.*55 mg \(-2,22 %\) og 57,5 mg \(\+2,22 %\)/)
  })

  it('deler bare tabletter FEST oppgir som delbare', () => {
    expect(stopp('fluoksetin', 40, [p('F20', 'tablett', 20, { deling: '2' })], undefined, HALVERING)).toMatch(/fra dag 57: den ideelle dosen 5 mg kan ikke gis.*10 mg \(\+100 %\)/)
    expect(stopp('fluoksetin', 40, [p('F20', 'tablett', 20)], undefined, HALVERING)).toMatch(/den ideelle dosen 10 mg kan ikke gis.*20 mg \(\+100 %\)/)
    expect(stopp('fluoksetin', 40, [p('F20K', 'kapsel', 20)], undefined, HALVERING)).toMatch(/den ideelle dosen 10 mg kan ikke gis/)
    expect(stopp('vortioksetin', 5, [p('V5', 'tablett', 5), p('V10', 'tablett', 10)])).toMatch(/dag 1–28: den ideelle dosen 3,75 mg kan ikke gis.*5 mg \(\+33,33 %\)/)
  })

  it('bruker dråper når de er valgt, men ikke en mikstur uten doseringsoppløsning', () => {
    const DRAPER = p('FD', 'draper', 20, { nevner: { verdi: 1, enhet: 'ml' }, per_drape: 1 })
    const MIKSTUR = p('SM', 'mikstur', 20, { nevner: { verdi: 1, enhet: 'ml' } })
    expect(plan('fluoksetin', 20, [DRAPER], { fra: { klasse: 'peroral', legemiddelformer: ['SYN-DRAP'] } }, HALVERING).fra).toEqual(['dag 1–28: 10 mg = 10 dråper à 1 mg', 'fra dag 29: 5 mg = 5 dråper à 1 mg', AVSLUTNING_KORT])
    expect(stopp('sertralin', 50, [...SERTRALIN, MIKSTUR], { fra: { klasse: 'peroral', legemiddelformer: ['SYN-MIKST'] } })).toMatch(/flytende \(20 mg\/ml\) uten dokumentert doseringsoppløsning/)
    // Uten valg brukes tablettene, og miksturen blir ikke tatt med.
    const s = stopp('sertralin', 50, [...SERTRALIN, MIKSTUR])
    expect(s).toMatch(/dag 1–28: den ideelle dosen 37,5 mg kan ikke gis/)
    expect(s).not.toMatch(/flytende/)
  })

  it('beholder de lave trinnene i den hyperbolske citalopramregelen uten nulltrinnet, og stopper når tablettene ikke gir dem', () => {
    const hyperbolsk = PILOTSETT.regler.find((r) => r.id === 'seponering-citalopram-hyperbolsk')!
    // Den kliniske kurven går under 1 mg, langt under laveste styrke, og tar ikke det siste trinnet til null.
    expect(kortform(beregn(hyperbolsk, { startdose_mg: 20 })).fra!.slice(-3)).toEqual(['dag 71–84: 0,92 mg', 'fra dag 85: 0,41 mg', AVSLUTNING_KORT])
    // Med tabletter på 10 og 20 mg stopper motoren ved første trinn i stedet for å runde av til en styrke.
    const s = stopp(hyperbolsk, 20, [p('C10', 'tablett', 10), p('C20', 'tablett', 20, { deling: '2' })])
    expect(s).toMatch(/dag 1–14: den ideelle dosen 10,08 mg kan ikke gis/)
    expect(s).toMatch(NAERMESTE)
  })
})

describe('Klinisk plan i appen', () => {
  const valg = { fra: { nokkel: 'fluoksetin', formulering: 'standard' as const } }
  const skjema = (startdose: string, x: Partial<Planskjema> = {}): Planskjema => ({
    ...TOMT_SKJEMA,
    startdose,
    bekreftet: [STARTFORSLAG.id],
    pasientforhold: { [TIDLIGERE_SYMPTOMER.id]: false },
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

  it('gir en klinisk plan bare etter en regel godkjent i testen, med fersk FEST, bekreftet startforslag, svar og begrunnelse, og oppgir regelsettet', () => {
    const r = beregnPlan(GODKJENT, valg, skjema('40'), fest(), NAA)
    expect(r).toMatchObject({ status: 'doseplan', klinisk: true })
    expect(planform(r).fra).toEqual(['dag 1–28: 20 mg = 1 tablett à 20 mg', 'dag 29–56: 10 mg = ½ tablett à 20 mg', 'fra dag 57: 5 mg = ¼ tablett à 20 mg', AVSLUTNING_KORT])
    expect(r.status === 'doseplan' && r.merknader.join(' ')).toMatch(/Planen går ikke til null\. Fra dag 57 står pasienten på 5 mg av fluoksetin/)
    expect(beregnPlan(regel('fluoksetin'), valg, skjema('40'), fest(), NAA).regelsett).toEqual({ id: NEDTRAPPINGSSETT.id, versjon: NEDTRAPPINGSSETT.versjon })
    for (const x of [{ bekreftet: [] }, { pasientforhold: {} }, { pasientforhold: { [TIDLIGERE_SYMPTOMER.id]: true } }, { svar: {} }, { begrunnelse: ' ' }]) {
      expect(beregnPlan(GODKJENT, valg, skjema('40', x), fest(), NAA).status, JSON.stringify(x)).toBe('stoppet')
    }
  })

  it('gir ingen plan etter en regel som seponerer direkte eller går via 0 mg, selv om den er merket klinisk godkjent med riktig fingeravtrykk', () => {
    const direkte = structuredClone(regel('fluoksetin'))
    direkte.plan.forlop[0]!.faser = [{ type: 'seponer' }]
    for (const [r, grunn] of [
      [direkte, /Ingen klinisk doseplan.*forløp fra seponerer/],
      [viaNullFor(regel('fluoksetin')), /^Beregningen ga en ugyldig plan: fra har perioden dag 85–98 med 0 mg\.$/],
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
    expect(inndataFor(GODKJENT, valg, skjema('40', { justert: { 'plan.forlop[0].faser[0].strategi.sluttdose_mg': '3', [PROSENT]: '' }, begrunnelse: ' ' }))).not.toHaveProperty('justert')
    expect(inndataFor(GODKJENT, valg, skjema('40', { begrunnelse: ' ' }))).not.toHaveProperty('begrunnelse')
    // Godkjenningen gjelder området, så valget gir en klinisk beregning; 25 % gir her et trinn tablettene ikke kan gi.
    const r = beregnPlan(GODKJENT, valg, skjema('40', { justert: { [PROSENT]: '25' } }), fest(), NAA)
    expect(r.status === 'stoppet' && r.stoppgrunner.join(' ')).toMatch(/dag 29–56: den ideelle dosen 22,5 mg kan ikke gis/)
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
