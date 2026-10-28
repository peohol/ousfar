/**
 * «Trappe ned antidepressiv» (P7 i `docs/verktøy-utviklingsplan.md`):
 *
 * - Dekningen (P7.1) har hvert antidepressivum i kildetabellen, uten
 *   johannesurt, med Stop-oppføringen fra P3, og statusen stemmer med
 *   regelsettet, P3-kildeoppføringene og FEST-uttrekket.
 * - Regelutkastene (P7.2) består kontrollene, er ikke godkjent, viser til sin
 *   egen Stop-oppføring og er startforslag som må bekreftes. Sluttdosen er en
 *   uavklart modellforutsetning (en firedel av laveste døgndose), ikke en
 *   styrke. Trinnstørrelsen følger RCPsychs risikogrupper, trinnlengden
 *   RCPsychs to til fire uker (fluoksetin fire), og hele nedtrappingen varer
 *   minst 28 dager. Forskriveren kan velge trinnstørrelse og trinnlengde bare
 *   innenfor regelens områder. Paroksetins raske studievariant er bare i
 *   sammenligningssettet. Reglene holder ved grensene for dose, lav dose,
 *   varighet og justering, også for lave restdoser.
 * - Doseplanmotoren (P5) gir planer som ender med seponering, og forklarte
 *   stopp når et trinn ikke kan gis nøyaktig, også i de lave trinnene, med
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
import { beregn, kortform } from '../verktoy/regler/beregning'
import { erKliniskGodkjent } from '../verktoy/regler/godkjenning'
import { kontrollerRegelsett, lesKontrollgrunnlag } from '../verktoy/regler/kontroll'
import { apneValg, henvisninger, justerbare, type Beregningsinndata, type Regel } from '../verktoy/regler/modell'
import { NICE, RCPSYCH } from '../verktoy/regler/bygg'
import { JUSTERING, NEDTRAPPINGSSETT, SAMMENLIGNINGSSETT, STARTFORSLAG, TIDLIGERE_SYMPTOMER } from '../verktoy/regler/nedtrapping'
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

/** Inndata med startforslaget bekreftet og hvert unntak avkreftet, som i eksemplene. */
const besvart = (r: Regel, startdose_mg: number, x: Partial<Beregningsinndata> = {}): Beregningsinndata => ({
  startdose_mg,
  bekreftet: r.bekreftelser.map((b) => b.id),
  pasientforhold: Object.fromEntries(r.unntak.map((u) => [u.id, false])),
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
const sluttdose = (r: Regel) => {
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
    expect(NEDTRAPPINGSSETT.regler).toHaveLength(15)
    expect(SAMMENLIGNINGSSETT.regler).toHaveLength(1)
    // Appen bruker pilotsettet og P7 sammen; ingen regel-ID finnes i begge.
    expect(new Set(REGELSETT.regler.map((r) => r.id)).size).toBe(REGELSETT.regler.length)
  })

  it('er ikke godkjent: alle er til faglig kontroll, og OUSFARs valg står åpne', () => {
    for (const r of P7REGLER) {
      expect(r.godkjenning.status, r.id).toBe('til_faglig_kontroll')
      expect(erKliniskGodkjent(r), r.id).toBe(false)
      expect(r.godkjenning.historikk.every((s) => s.status !== 'klinisk_godkjent'), r.id).toBe(true)
      if (r.beregnbarhet !== 'bare_tekstlig') expect(apneValg(r).length, r.id).toBeGreaterThan(0)
    }
    // Reglene er omarbeidet etter hver av de to kontrollene og sendt til kontroll på nytt hver gang.
    const steg = (n: number) => Array.from({ length: n }, (_, i) => [`utkast ${i + 1}`, `til_faglig_kontroll ${i + 1}`]).flat()
    for (const r of BEREGNBARE) expect([r.versjon, r.godkjenning.historikk.map((s) => `${s.status} ${s.regelversjon}`)], r.id).toEqual([3, steg(3)])
    expect([STUDIEVARIANT.versjon, STUDIEVARIANT.godkjenning.historikk.map((s) => `${s.status} ${s.regelversjon}`)]).toEqual([2, steg(2)])
    expect(BEREGNBARE.every((r) => r.godkjenning.historikk.at(-2)!.merknad.includes('andre uavhengige kontroll'))).toBe(true)
    // Ingen justerbar verdi, trinnlengde eller sluttdose er avklart: alle står åpne til P7.5.
    for (const r of BEREGNBARE) {
      const apne = apneValg(r).join(' ')
      for (const [sti] of justerbare(r)) expect(apne, `${r.id} ${sti}`).toContain(`${sti} (åpent forslag)`)
      expect(apne, r.id).toContain('strategi.sluttdose_mg (åpent forslag)')
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

  it('gir bare et startforslag: det må bekreftes, og regelen gjelder ikke etter seponeringssymptomer ved et tidligere forsøk', () => {
    for (const r of [...BEREGNBARE, STUDIEVARIANT]) {
      expect(r.bekreftelser, r.id).toEqual([STARTFORSLAG])
      expect(r.unntak[0], r.id).toEqual(TIDLIGERE_SYMPTOMER)
      const dose = r.eksempler.find((e) => !e.stopp)!.inndata.startdose_mg
      expect(kort(r, dose).fra!.at(-1), r.id).toMatch(/seponert$/)
      expect(stoppet(r, dose, { bekreftet: [] }), r.id).toMatch(/Må bekreftes før beregning: Planen er et startforslag/)
      expect(stoppet(r, dose, { pasientforhold: {} }), r.id).toMatch(/Må avklares før beregning \(ukjent\): Et tidligere forsøk/)
      expect(stoppet(r, dose, { pasientforhold: { ...besvart(r, dose).pasientforhold, [TIDLIGERE_SYMPTOMER.id]: true } }), r.id).toMatch(/Regelen gjelder ikke: Et tidligere forsøk/)
    }
    // Startforslaget bygger på NICEs og RCPsychs råd om tempo; unntaket er OUSFARs valg og står åpent.
    expect(STARTFORSLAG.grunnlag).toEqual({ type: 'kilde', henvisninger: [NICE.tempo, NICE.halveringstid, RCPSYCH.plan, RCPSYCH.langvarig] })
    expect(STARTFORSLAG.tekst).toMatch(/vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn/)
    expect(STARTFORSLAG.tekst).toMatch(/trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker/)
    expect(TIDLIGERE_SYMPTOMER.grunnlag).toMatchObject({ type: 'ousfar_vurdering', avklaring: null, henvisninger: [NICE.tidligere, NICE.alvorlig, RCPSYCH.langvarig] })
    // Moklobemid har i tillegg et unntak ved alvorlig nedsatt leverfunksjon, der preparatomtalen reduserer dosen.
    expect(stoppet(regel('moklobemid'), 300, { pasientforhold: { tidligere_seponeringssymptomer: false, nedsatt_leverfunksjon: true } })).toMatch(/Regelen gjelder ikke: Pasienten har alvorlig nedsatt leverfunksjon/)
  })

  it('har en sluttdose, en firedel av laveste døgndose i preparatomtalen, som er en uavklart modellforutsetning og aldri en styrke i FEST', () => {
    for (const r of BEREGNBARE) {
      const slutt = sluttdose(r)!
      const fase = r.plan.forlop[0]!.faser[0]!
      const grunnlag = fase.type === 'nedtrapping' && fase.strategi.type === 'prosent_av_aktuell' ? fase.strategi.sluttdose_mg.grunnlag : null
      expect(grunnlag, r.id).toMatchObject({ type: 'ousfar_vurdering', avklaring: null, begrunnelse: expect.stringMatching(/^Uavklart modellforutsetning: .*Må vurderes for stoffet før godkjenning\.$/) })
      expect(grunnlag?.henvisninger, r.id).toContainEqual(RCPSYCH.lavDose)
      expect(r.fortolkning.usikkerhet.join(' '), r.id).toMatch(/uavklart modellforutsetning, ikke en validert klinisk terskel/)
      const laveste = lavesteStyrke(preparaterFor(KART, r.fra.type === 'virkestoff' ? r.fra.nokkel : ''))!
      expect(slutt, r.id).toBeLessThan(laveste)
    }
    expect(Object.fromEntries(BEREGNBARE.map((r) => [r.id.replace('seponering-', ''), sluttdose(r)]))).toEqual({
      amitriptylin: 2.5,
      bupropion: 37.5,
      citalopram: 2.5,
      duloksetin: 7.5,
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

  it('velger trinnstørrelsen etter RCPsychs risikogruppe: 10 % ved høyest risiko, ellers 50 % med 25 % ved lav dose', () => {
    expect(BEREGNBARE.filter((r) => r.tittel.includes('høy risiko')).map(nokkel)).toEqual(HOY_RISIKO)
    for (const r of BEREGNBARE) {
      const hoy = HOY_RISIKO.includes(nokkel(r))
      const fluoksetin = nokkel(r) === 'fluoksetin'
      const dose = r.inndata[0]!.omrade![1]
      expect(kort(r, dose).fra![0], r.id).toBe(`dag 1–${fluoksetin ? 28 : 14}: ${String(Math.round(dose * (hoy ? 0.9 : 0.5) * 100) / 100).replace('.', ',')} mg`)
      // Risikogruppen er det RCPsych oppgir for stoffet; NICEs særlige varsomhet gjelder bare paroksetin og venlafaksin.
      expect(henvisninger(r), r.id).toContainEqual(hoy ? RCPSYCH.hoyRisiko : RCPSYCH.middelsRisiko)
      expect(henvisninger(r), r.id).not.toContainEqual(hoy ? RCPSYCH.middelsRisiko : RCPSYCH.hoyRisiko)
      expect(henvisninger(r).some((h) => h.faktum === NICE.saerligRisiko.faktum), r.id).toBe(['paroksetin', 'venlafaksin'].includes(nokkel(r)))
      const strategi = r.plan.forlop[0]!.faser[0]!.type === 'nedtrapping' ? r.plan.forlop[0]!.faser[0]!.strategi : null
      // Mindre trinn ved lav dose bare ved 50 %; ikke ved høyest risiko eller for fluoksetin.
      expect(strategi?.type === 'prosent_av_aktuell' && strategi.lav_prosent?.verdi, r.id).toBe(hoy || fluoksetin ? undefined : 25)
    }
    for (const n of HOY_RISIKO) expect(RCPSYCH.hoyRisiko.faktum, n).toContain(n)
  })

  it('bygger trinnlengden på RCPsychs to til fire uker, og NICEs én til to uker bare på fluoksetin', () => {
    const ANTIDEPRESSIVA = ['seponering-escitalopram', 'seponering-citalopram-hyperbolsk', 'kryssnedtrapping-sertralin-mirtazapin', 'mao-fluoksetin-fenelzin']
    const pilot = PILOTSETT.regler.filter((r) => ANTIDEPRESSIVA.includes(r.id))
    expect(pilot).toHaveLength(ANTIDEPRESSIVA.length)
    for (const r of [...BEREGNBARE, ...pilot]) {
      for (const f of r.plan.forlop) {
        for (const fase of f.faser) {
          if (fase.type !== 'nedtrapping' || fase.trinnlengde.grunnlag.type !== 'ousfar_vurdering') continue
          const kilder = fase.trinnlengde.grunnlag.henvisninger ?? []
          const fluoksetin = f.virkestoff.type === 'virkestoff' && f.virkestoff.nokkel === 'fluoksetin'
          expect(kilder, r.id).toContainEqual(fluoksetin ? RCPSYCH.fluoksetin : RCPSYCH.tid)
          expect(kilder.some((h) => 'sted' in h && h.sted.startsWith('anbefaling 1.4.18')), r.id).toBe(fluoksetin)
          // 14 dager er nedre del av to til fire uker, ikke et tak; fluoksetin har fire uker uten valg.
          expect([fase.trinnlengde.verdi, fase.trinnlengde.omrade], r.id).toEqual(fluoksetin ? [28, undefined] : [14, r.id === 'kryssnedtrapping-sertralin-mirtazapin' ? [7, 14] : [14, 28]])
        }
      }
    }
    expect('sted' in NICE.fluoksetinVurdering && NICE.fluoksetinVurdering.sted).toBe('anbefaling 1.4.18 (om fluoksetin)')
  })

  it('har paroksetins raske studievariant bare til sammenligning, ikke i verktøyet', () => {
    expect(STUDIEVARIANT.id).toBe('seponering-paroksetin-studievariant')
    expect(STUDIEVARIANT.tittel).toMatch(/rask studievariant til sammenligning \(ikke klinisk anbefaling\)/)
    expect(REGELSETT.regler.map((r) => r.id)).not.toContain(STUDIEVARIANT.id)
    expect(tilgjengelighet(TRAPPE_NED, { fra: { nokkel: 'paroksetin', formulering: 'standard' } }).regler.map((r) => r.id)).toEqual(['seponering-paroksetin'])
    expect(kort(STUDIEVARIANT, 20).fra).toEqual(['dag 1–7: 10 mg', 'fra dag 8: seponert'])
    expect(kort(regel('paroksetin'), 20).fra!.at(-1)).toBe('fra dag 267: seponert')
  })

  it('krever minst 28 dager i alt etter RCPsych, og sier hva preparatomtalen selv sier', () => {
    for (const r of BEREGNBARE) {
      const fase = r.plan.forlop[0]!.faser[0]!
      const m = fase.type === 'nedtrapping' ? fase.minste_varighet : undefined
      expect([m?.verdi, m?.art], r.id).toEqual([28, 'bindende_krav'])
      expect(m!.grunnlag, r.id).toMatchObject({ type: 'ousfar_vurdering', avklaring: null, begrunnelse: expect.stringMatching(/^Preparatomtalen .*RCPsych anbefaler å trappe ned over minst fire uker.*OUSFARs forslag/) })
      expect(m!.grunnlag.henvisninger, r.id).toContainEqual(RCPSYCH.fireUker)
    }
  })

  it('lar forskriveren velge trinnstørrelse og trinnlengde bare innenfor regelens områder, og viser valget', () => {
    for (const r of BEREGNBARE) {
      const valg = justerbare(r).map(([sti, p]) => [sti, p.justerbar, p.omrade])
      const prosent = [PROSENT, JUSTERING.prosent, [5, 50]]
      expect(valg, r.id).toEqual(nokkel(r) === 'fluoksetin' ? [prosent] : [prosent, [DAGER, JUSTERING.dager, [14, 28]]])
    }
    const s = regel('sertralin')
    // Grensene for reduksjonen er med; rett utenfor stopper.
    expect(kort(s, 100, { justert: { [PROSENT]: 5 } }).fra!.slice(0, 2)).toEqual(['dag 1–14: 95 mg', 'dag 15–28: 90,25 mg'])
    expect(kort(s, 100, { justert: { [PROSENT]: 50 } }).fra![0]).toBe('dag 1–14: 50 mg')
    expect(stoppet(s, 100, { justert: { [PROSENT]: 4.99 } })).toBe('Reduksjon per trinn (% av aktuell dose): 4,99 % er utenfor det regelen tillater (5–50 %).')
    expect(stoppet(s, 100, { justert: { [PROSENT]: 50.01 } })).toMatch(/50,01 % er utenfor det regelen tillater/)
    // Grensene for trinnlengden er med; rett utenfor og deler av dager stopper.
    expect(kort(s, 100, { justert: { [DAGER]: 14 } }).fra![0]).toBe('dag 1–14: 50 mg')
    expect(kort(s, 100, { justert: { [DAGER]: 28 } }).fra!.slice(0, 2)).toEqual(['dag 1–28: 50 mg', 'dag 29–56: 25 mg'])
    expect(stoppet(s, 100, { justert: { [DAGER]: 13 } })).toBe('Dager per trinn: 13 dager er utenfor det regelen tillater (14–28 dager).')
    expect(stoppet(s, 100, { justert: { [DAGER]: 29 } })).toMatch(/29 dager er utenfor/)
    expect(stoppet(s, 100, { justert: { [DAGER]: 14.5 } })).toMatch(/14,5 dager kan ikke brukes; regelen tillater hele dager/)
    // Det som ikke er justerbart, kan ikke endres: sluttdosen, og fluoksetins fire uker.
    expect(stoppet(s, 100, { justert: { 'plan.forlop[0].faser[0].strategi.sluttdose_mg': 3 } })).toMatch(/kan ikke justeres i denne regelen/)
    expect(stoppet(regel('fluoksetin'), 40, { justert: { [DAGER]: 14 } })).toMatch(/kan ikke justeres i denne regelen/)
    // Valget står som kontroll i resultatet; regelens forslag gir ingen.
    const valgt = (x: Record<string, number>) => {
      const res = beregn(s, besvart(s, 100, { justert: x }))
      return res.status === 'modellberegning' ? res.kontroller.filter((k) => /forskriveren/.test(k.krav)) : null
    }
    expect(valgt({ [PROSENT]: 25, [DAGER]: 21 })).toEqual([
      { krav: `${JUSTERING.prosent} er valgt av forskriveren innenfor regelens område`, oppfylt: true, detalj: '25 % i stedet for regelens forslag 50 %; regelen tillater 5–50 %.' },
      { krav: `${JUSTERING.dager} er valgt av forskriveren innenfor regelens område`, oppfylt: true, detalj: '21 dager i stedet for regelens forslag 14 dager; regelen tillater 14–28 dager.' },
    ])
    expect(valgt({ [PROSENT]: 50 })).toEqual([])
    // Regelen selv endres ikke av valget.
    expect(s.plan.forlop[0]!.faser[0]!.type === 'nedtrapping' && s.plan.forlop[0]!.faser[0]!.trinnlengde.verdi).toBe(14)
  })

  it('bruker aldri et større trinn ved lav dose enn forskriveren har valgt', () => {
    // Under 25 mg er trinnet 25 %, men med 10 % valgt blir det 10 %.
    expect(kort(regel('sertralin'), 20).fra![0]).toBe('dag 1–14: 15 mg')
    expect(kort(regel('sertralin'), 20, { justert: { [PROSENT]: 10 } }).fra!.slice(0, 2)).toEqual(['dag 1–14: 18 mg', 'dag 15–28: 16,2 mg'])
  })

  it('ender hver beregnet plan med seponering', () => {
    for (const r of P7REGLER) {
      for (const e of r.eksempler.filter((x) => !x.stopp)) expect(kortform(beregn(r, e.inndata)).fra!.at(-1), `${r.id} ${e.id}`).toMatch(/^fra dag \d+: seponert$/)
    }
  })

  it('gjelder enhver lav dose opp til høyeste dose; under sluttdosen stopper den fordi regelen ikke har flere trinn, ikke fordi dosen er ugyldig', () => {
    const UNDER = /er under regelens sluttdose \(.*\), der regelen går over til seponering\. Regelen har ingen godkjent videre nedtrapping eller seponering fra en så lav dose; det må vurderes individuelt\./
    for (const r of BEREGNBARE) {
      const [min, maks] = r.inndata[0]!.omrade!
      const slutt = sluttdose(r)!
      expect(min, r.id).toBe(0)
      expect(stoppet(r, maks), r.id).not.toMatch(/utenfor/)
      expect(stoppet(r, maks + 0.01), r.id).toMatch(new RegExp(`utenfor det regelen gjelder for \\(høyst ${String(maks).replace('.', ',')} mg\\)`))
      for (const dose of [0.01, slutt / 2, slutt - 0.01]) {
        expect(stoppet(r, dose), `${r.id} ${dose}`).toMatch(UNDER)
        expect(stoppet(r, dose), `${r.id} ${dose}`).not.toMatch(/utenfor/)
      }
    }
  })

  it('seponerer aldri fra dag 1: ved sluttdosen blir nedtrappingen 0 dager, og beregningen stopper', () => {
    for (const r of BEREGNBARE) {
      const slutt = sluttdose(r)!
      expect(stoppet(r, slutt), r.id).toMatch(/blir 0 dager, kortere enn 28 dager/)
      // Heller ikke forskriverens minste trinn gir seponering uten nedtrapping.
      expect(stoppet(r, slutt, { justert: { [PROSENT]: 5 } }), r.id).toMatch(/kortere enn 28 dager/)
    }
  })

  it('beregner lave restdoser under ordinært doseområde', () => {
    expect(kort(regel('sertralin'), 12.5).fra).toEqual(['dag 1–14: 9,38 mg', 'dag 15–28: 7,03 mg', 'fra dag 29: seponert'])
    expect(kort(regel('nortriptylin'), 15).fra).toEqual(['dag 1–14: 11,25 mg', 'dag 15–28: 8,44 mg', 'dag 29–42: 6,33 mg', 'fra dag 43: seponert'])
    expect(kort(regel('venlafaksin'), 20).fra![0]).toBe('dag 1–14: 18 mg')
    expect(stoppet(regel('sertralin'), 6.24)).toMatch(/Dosen 6,24 mg av sertralin er under regelens sluttdose \(6,25 mg\)/)
    expect(stoppet(regel('paroksetin'), 2)).toMatch(/Dosen 2 mg av paroksetin er under regelens sluttdose \(2,5 mg\)/)
  })

  it('holder ved grensene for varighet og lav dose', () => {
    // Minst 28 dager: to trinn holder (4,45 → 3,34 → 2,5 mg), ett trinn stopper (4,44 → 3,33 mg, så under 2,5 mg).
    expect(kort(regel('citalopram'), 4.45).fra).toEqual(['dag 1–14: 3,34 mg', 'dag 15–28: 2,5 mg', 'fra dag 29: seponert'])
    expect(stoppet(regel('citalopram'), 4.44)).toMatch(/blir 14 dager, kortere enn 28 dager/)
    // Det samme med 10 % per trinn.
    expect(kort(regel('mirtazapin'), 4.63).fra).toEqual(['dag 1–14: 4,17 mg', 'dag 15–28: 3,75 mg', 'fra dag 29: seponert'])
    expect(stoppet(regel('mirtazapin'), 4.62)).toMatch(/blir 14 dager, kortere enn 28 dager/)
    // Like over grensen for lav dose er trinnet 50 %, ved grensen 25 %.
    expect(kort(regel('sertralin'), 25.02).fra![0]).toBe('dag 1–14: 12,51 mg')
    expect(kort(regel('sertralin'), 25).fra![0]).toBe('dag 1–14: 18,75 mg')
    // Ved høyest risiko er trinnet 10 % i hele doseområdet.
    expect(kort(regel('moklobemid'), 300).fra![0]).toBe('dag 1–14: 270 mg')
    expect(kort(regel('moklobemid'), 600).fra![0]).toBe('dag 1–14: 540 mg')
    // Fluoksetin har ikke mindre trinn ved lav dose, og fire uker per trinn.
    expect(kort(regel('fluoksetin'), 20).fra).toEqual(['dag 1–28: 10 mg', 'dag 29–56: 5 mg', 'fra dag 57: seponert'])
    // Ved sluttdosen blir nedtrappingen 0 dager, kortere enn 28: ingen seponering uten nedtrapping.
    expect(stoppet(regel('vortioksetin'), 1.25)).toMatch(/blir 0 dager, kortere enn 28 dager/)
    expect(stoppet(regel('bupropion'), 37.5)).toMatch(/blir 0 dager, kortere enn 28 dager/)
  })
})

/* --- Doseplanene med syntetiske preparater ---------------------------------------- */

const p = (id: string, form: Testpreparat['form'], mg: number, x: Partial<Testpreparat> = {}): Testpreparat => ({ id, virkestoff: 'testoksetin', varenavn: `Syntetisk ${id}`, form, mg, ...x })
const OMGIVELSE = { idag: '2026-11-01', naa: '2026-11-01T12:00:00Z' }
const TABLETTER = { fra: { klasse: 'peroral' as const, legemiddelformer: ['SYN-TAB'] } }

/** Planen etter regelen (ikke godkjent: en modellberegning), med syntetiske preparater for virkestoffet. */
function plan(r: Regel | string, startdose_mg: number, preparater: Testpreparat[], formvalg?: Record<string, { klasse: 'peroral'; legemiddelformer: string[] }>, justert?: Record<string, number>) {
  const rr = typeof r === 'string' ? regel(r) : r
  const grunnlag = { utvalg: syntetiskUtvalg(preparater), koblinger: { [nokkel(rr)]: ['ID_SYNTETISK-TESTOKSETIN'] }, overstyringer: [] }
  return planform(beregnDoseplan(rr, { ...besvart(rr, startdose_mg, { ...(justert && { justert }) }), ...(formvalg && { formvalg }) }, grunnlag, OMGIVELSE))
}
const stopp = (...x: Parameters<typeof plan>) => (plan(...x).stopp ?? []).join(' ')

const SERTRALIN = [p('S25', 'tablett', 25), p('S50', 'tablett', 50, { deling: '2' }), p('S100', 'tablett', 100, { deling: '2' })]
const FLUOKSETIN = [p('F20', 'tablett', 20, { deling: '4' })]
const NAERMESTE = /kan ikke gis med preparatene i FEST nøyaktig\. Nærmeste doser som kan settes sammen: .*krever en ny faglig beslutning; beregningen gjør det ikke selv\./

describe('Doseplanene (P7.3–P7.4)', () => {
  it('gir en plan helt til seponering når alle trinnene kan gis', () => {
    expect(plan('fluoksetin', 40, FLUOKSETIN)).toEqual({
      fra: ['dag 1–28: 20 mg = 1 tablett à 20 mg', 'dag 29–56: 10 mg = ½ tablett à 20 mg', 'dag 57–84: 5 mg = ¼ tablett à 20 mg', 'fra dag 85: seponert'],
    })
  })

  it('stopper med begrunnelse når den kliniske sluttdosen ikke kan nås, i stedet for å slutte ved laveste styrke', () => {
    // Sertralin 100 mg: 50 og 25 mg kan gis, men 18,75 mg ikke; planen slutter ikke ved 25 mg.
    const s = stopp('sertralin', 100, SERTRALIN)
    expect(s).toMatch(/dag 29–42: den ideelle dosen 18,75 mg kan ikke gis/)
    expect(s).toMatch(NAERMESTE)
    // Duloksetin finnes i 30 og 60 mg, og kapsler deles ikke: 10 % mindre kan ikke gis.
    expect(stopp('duloksetin', 60, [p('D30', 'kapsel', 30), p('D60', 'kapsel', 60)])).toMatch(/dag 1–14: den ideelle dosen 54 mg kan ikke gis.*30 mg \(-44,44 %\) og 60 mg \(\+11,11 %\)/)
    // Venlafaksin 150 mg: 135 mg kan ikke gis; med 50 % valgt går 75 og 37,5 mg, men ikke 18,75 mg.
    const VENLAFAKSIN = [p('V37', 'kapsel', 37.5), p('V75', 'kapsel', 75), p('V150', 'kapsel', 150)]
    expect(stopp('venlafaksin', 150, VENLAFAKSIN)).toMatch(/dag 1–14: den ideelle dosen 135 mg kan ikke gis/)
    expect(stopp('venlafaksin', 150, VENLAFAKSIN, undefined, { [PROSENT]: 50 })).toMatch(/dag 29–42: den ideelle dosen 18,75 mg kan ikke gis.*37,5 mg \(\+100 %\)/)
    // Bupropion fra 150 mg: ingen dose under 150 mg kan gis.
    expect(stopp('bupropion', 150, [p('B150', 'tablett', 150), p('B300', 'tablett', 300)])).toMatch(/dag 1–14: den ideelle dosen 112,5 mg kan ikke gis/)
  })

  it('stopper med de nærmeste dosene når et trinn fra en uvanlig startdose ikke kan gis nøyaktig, uten å avvike fra regelen', () => {
    const s = stopp('sertralin', 150, SERTRALIN)
    expect(s).toMatch(/dag 15–28: den ideelle dosen 37,5 mg/)
    expect(s).toMatch(/25 mg \(-33,33 %\) og 50 mg \(\+33,33 %\)/)
    expect(s).toMatch(NAERMESTE)
    expect(plan('sertralin', 250, SERTRALIN).stopp).toEqual(['Startdosen 250 mg er utenfor det regelen gjelder for (høyst 200 mg).'])
    expect(stopp('duloksetin', 90, [p('D30', 'kapsel', 30), p('D60', 'kapsel', 60)])).toMatch(/dag 1–14: den ideelle dosen 81 mg kan ikke gis.*60 mg \(-25,93 %\) og 90 mg \(\+11,11 %\)/)
  })

  it('følger den langsomme paroksetinregelen i appens regelsett, og den raske studievarianten bare til sammenligning', () => {
    const PAROKSETIN = [p('P20', 'tablett', 20, { deling: '2' })]
    expect(stopp('paroksetin', 40, PAROKSETIN)).toMatch(/dag 1–14: den ideelle dosen 36 mg kan ikke gis.*30 mg \(-16,67 %\) og 40 mg \(\+11,11 %\)/)
    expect(stopp('paroksetin', 40, PAROKSETIN, undefined, { [PROSENT]: 25 })).toMatch(/dag 15–28: den ideelle dosen 22,5 mg kan ikke gis/)
    expect(plan(STUDIEVARIANT, 40, PAROKSETIN)).toEqual({
      fra: ['dag 1–7: 30 mg = 1½ tabletter à 20 mg', 'dag 8–14: 20 mg = 1 tablett à 20 mg', 'dag 15–21: 10 mg = ½ tablett à 20 mg', 'fra dag 22: seponert'],
    })
  })

  it('stopper ved de små trinnene i en lang nedtrapping når tablettene ikke gir dosen', () => {
    // Klomipramin 150 mg: den ideelle kurven går til dag 113, men 18,75 mg kan ikke gis med halve 10 og 25 mg-tabletter.
    expect(kort(regel('klomipramin'), 150).fra!.at(-1)).toBe('fra dag 113: seponert')
    expect(stopp('klomipramin', 150, [p('K10', 'tablett', 10, { deling: '2' }), p('K25', 'tablett', 25, { deling: '2' })])).toMatch(/dag 29–42: den ideelle dosen 18,75 mg kan ikke gis.*17,5 mg \(-6,67 %\) og 20 mg \(\+6,67 %\)/)
  })

  it('deler bare tabletter FEST oppgir som delbare', () => {
    expect(stopp('fluoksetin', 40, [p('F20', 'tablett', 20, { deling: '2' })])).toMatch(/dag 57–84: den ideelle dosen 5 mg kan ikke gis.*10 mg \(\+100 %\)/)
    expect(stopp('fluoksetin', 40, [p('F20', 'tablett', 20)])).toMatch(/den ideelle dosen 10 mg kan ikke gis.*20 mg \(\+100 %\)/)
    expect(stopp('fluoksetin', 40, [p('F20K', 'kapsel', 20)])).toMatch(/den ideelle dosen 10 mg kan ikke gis/)
    expect(stopp('vortioksetin', 5, [p('V5', 'tablett', 5), p('V10', 'tablett', 10)])).toMatch(/dag 1–14: den ideelle dosen 3,75 mg kan ikke gis.*5 mg \(\+33,33 %\)/)
  })

  it('bruker dråper når de er valgt, men ikke en mikstur uten doseringsoppløsning', () => {
    const DRAPER = p('FD', 'draper', 20, { nevner: { verdi: 1, enhet: 'ml' }, per_drape: 1 })
    const MIKSTUR = p('SM', 'mikstur', 20, { nevner: { verdi: 1, enhet: 'ml' } })
    expect(plan('fluoksetin', 20, [DRAPER], { fra: { klasse: 'peroral', legemiddelformer: ['SYN-DRAP'] } }).fra).toEqual(['dag 1–28: 10 mg = 10 dråper à 1 mg', 'dag 29–56: 5 mg = 5 dråper à 1 mg', 'fra dag 57: seponert'])
    expect(stopp('sertralin', 50, [...SERTRALIN, MIKSTUR], { fra: { klasse: 'peroral', legemiddelformer: ['SYN-MIKST'] } })).toMatch(/flytende \(20 mg\/ml\) uten dokumentert doseringsoppløsning/)
    // Uten valg brukes tablettene, og miksturen blir ikke tatt med.
    const s = stopp('sertralin', 50, [...SERTRALIN, MIKSTUR])
    expect(s).toMatch(/dag 15–28: den ideelle dosen 18,75 mg kan ikke gis/)
    expect(s).not.toMatch(/flytende/)
  })

  it('beholder de lave trinnene i den hyperbolske citalopramregelen og stopper når tablettene ikke gir dem', () => {
    const hyperbolsk = PILOTSETT.regler.find((r) => r.id === 'seponering-citalopram-hyperbolsk')!
    // Den kliniske kurven går under 1 mg før seponering, langt under laveste styrke.
    expect(kortform(beregn(hyperbolsk, { startdose_mg: 20 })).fra!.slice(-3)).toEqual(['dag 71–84: 0,92 mg', 'dag 85–98: 0,41 mg', 'fra dag 99: seponert'])
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

  it('gir en klinisk plan bare etter en regel godkjent i testen, med fersk FEST og bekreftet startforslag, og oppgir regelsettet', () => {
    const r = beregnPlan(GODKJENT, valg, skjema('40'), fest(), NAA)
    expect(r).toMatchObject({ status: 'doseplan', klinisk: true })
    expect(planform(r).fra).toEqual(['dag 1–28: 20 mg = 1 tablett à 20 mg', 'dag 29–56: 10 mg = ½ tablett à 20 mg', 'dag 57–84: 5 mg = ¼ tablett à 20 mg', 'fra dag 85: seponert'])
    expect(beregnPlan(regel('fluoksetin'), valg, skjema('40'), fest(), NAA).regelsett).toEqual({ id: NEDTRAPPINGSSETT.id, versjon: NEDTRAPPINGSSETT.versjon })
    for (const x of [{ bekreftet: [] }, { pasientforhold: {} }, { pasientforhold: { [TIDLIGERE_SYMPTOMER.id]: true } }]) {
      expect(beregnPlan(GODKJENT, valg, skjema('40', x), fest(), NAA).status, JSON.stringify(x)).toBe('stoppet')
    }
  })

  it('tar med forskriverens valg, sier fra om et valg som ikke er et tall over 0, og glemmer valget med en annen strategi', () => {
    expect(mangler(GODKJENT, skjema('40', { justert: { [PROSENT]: '0' } }))).toEqual([`${JUSTERING.prosent} må være et tall større enn 0, eller stå tomt for regelens forslag.`])
    expect(mangler(GODKJENT, skjema('40', { justert: { [PROSENT]: ' ' } }))).toEqual([])
    expect(inndataFor(GODKJENT, valg, skjema('40', { justert: { [PROSENT]: '25,5' } })).justert).toEqual({ [PROSENT]: 25.5 })
    // Et valg for en verdi regelen ikke lar forskriveren justere, tas ikke med.
    expect(inndataFor(GODKJENT, valg, skjema('40', { justert: { [DAGER]: '14', [PROSENT]: '' } })).justert).toBeUndefined()
    // Godkjenningen gjelder området, så valget gir en klinisk beregning; 25 % gir her et trinn tablettene ikke kan gi.
    const r = beregnPlan(GODKJENT, valg, skjema('40', { justert: { [PROSENT]: '25' } }), fest(), NAA)
    expect(r.status === 'stoppet' && r.stoppgrunner.join(' ')).toMatch(/dag 29–56: den ideelle dosen 22,5 mg kan ikke gis/)
    expect(medRegel(skjema('40', { justert: { [PROSENT]: '25' } }), 'en-annen-strategi').justert).toEqual({})
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
