/**
 * «Trappe ned antidepressiv» (P7 i `docs/verktøy-utviklingsplan.md`):
 *
 * - Dekningen (P7.1) har hvert antidepressivum i kildetabellen, uten
 *   johannesurt, med Stop-oppføringen fra P3, og statusen stemmer med
 *   regelsettet, P3-kildeoppføringene og FEST-uttrekket.
 * - Regelutkastene (P7.2) består kontrollene, er ikke godkjent, viser til sin
 *   egen Stop-oppføring, har sluttdosen fra laveste norske styrke og holder ved
 *   grensene for dose og varighet.
 * - Doseplanmotoren (P5) gir planer som ender med seponering, og forklarte
 *   stopp når et trinn ikke kan gis nøyaktig, med syntetiske preparater i
 *   FESTs form. Bare regler godkjent i testen gir en klinisk plan, og bare med
 *   fersk FEST.
 * - De nye reglene brukes bare av verktøyene, ikke av fortolkningen.
 *
 * Alle preparater og doser her er syntetiske; ingen pasientopplysninger.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dekningFor, dekningstekst, NEDTRAPPINGSDEKNING } from '../verktoy/dekning'
import { DEKNINGSRAPPORTFIL, lagDekningsrapport, lavesteStyrke, seponeringsregler, stopOppforing } from '../verktoy/dekningsrapport'
import { beregnPlan, TOMT_SKJEMA, type Planskjema } from '../verktoy/doseplan'
import { lesKartdata } from '../verktoy/kartdata'
import { markedsgrunnlag, preparaterFor } from '../verktoy/kartlegging'
import { beregnDoseplan, planform } from '../verktoy/motor/plan'
import { syntetiskUtvalg, type Testpreparat } from '../verktoy/motor/syntetisk'
import { VERKTOY, virkestoffvalg } from '../verktoy/register'
import { beregn, kortform } from '../verktoy/regler/beregning'
import { erKliniskGodkjent } from '../verktoy/regler/godkjenning'
import { kontrollerRegelsett, lesKontrollgrunnlag } from '../verktoy/regler/kontroll'
import { apneValg, type Regel } from '../verktoy/regler/modell'
import { LAVESTE_STYRKE, NEDTRAPPINGSSETT, sluttdoseFor } from '../verktoy/regler/nedtrapping'
import { REGELSETT, tilgjengelighet } from '../verktoy/tilgjengelighet'
import { godkjennITest, testFestFor, TESTKLOKKE } from './hjelp/verktoyplan'

const TRAPPE_NED = VERKTOY.find((v) => v.id === 'trappe-ned-antidepressiv')!
const KART = lesKartdata()
const P3 = lesKontrollgrunnlag()
const regel = (nokkel: string) => NEDTRAPPINGSSETT.regler.find((r) => r.id === `seponering-${nokkel}`)!
const kort = (r: Regel, startdose_mg: number) => kortform(beregn(r, { startdose_mg }))

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
    expect(kontrollerRegelsett(NEDTRAPPINGSSETT)).toEqual([])
    expect(NEDTRAPPINGSSETT.regler).toHaveLength(15)
    // Appen bruker pilotsettet og P7 sammen; ingen regel-ID finnes i begge.
    expect(new Set(REGELSETT.regler.map((r) => r.id)).size).toBe(REGELSETT.regler.length)
  })

  it('er ikke godkjent: alle er til faglig kontroll, og OUSFARs valg står åpne', () => {
    for (const r of NEDTRAPPINGSSETT.regler) {
      expect(r.godkjenning.status, r.id).toBe('til_faglig_kontroll')
      expect(erKliniskGodkjent(r), r.id).toBe(false)
      expect(r.godkjenning.historikk.every((s) => s.status !== 'klinisk_godkjent'), r.id).toBe(true)
      if (r.beregnbarhet !== 'bare_tekstlig') expect(apneValg(r).length, r.id).toBeGreaterThan(0)
    }
  })

  it('viser bare til sin egen Stop-oppføring, og Psychiatrienet er aldri grunnlag', () => {
    for (const r of NEDTRAPPINGSSETT.regler) {
      const d = NEDTRAPPINGSDEKNING.find((x) => r.fra.type === 'virkestoff' && x.nokkel === r.fra.nokkel)!
      expect(r.referanser, r.id).toEqual([{ kilde: 'psychiatrienet', kildeoppforing: stopOppforing(d.kode) }])
      const utenReferanser = JSON.stringify({ ...r, referanser: [] })
      expect(utenReferanser, r.id).not.toMatch(/"kilde":"psychiatrienet"/)
    }
  })

  it('har sluttdosen fra laveste markedsførte styrke i FEST, halvert bare når den kan deles', () => {
    for (const [nokkel, laveste] of Object.entries(LAVESTE_STYRKE)) {
      expect(lavesteStyrke(preparaterFor(KART, nokkel)), nokkel).toBe(laveste.mg)
      const fase = regel(nokkel).plan.forlop[0]!.faser[0]!
      expect(fase.type === 'nedtrapping' && fase.strategi.type === 'prosent_av_aktuell' && fase.strategi.sluttdose_mg.verdi, nokkel).toBe(sluttdoseFor(laveste))
    }
    expect(Object.keys(LAVESTE_STYRKE)).toHaveLength(13)
  })

  it('ender hver beregnet plan med seponering', () => {
    for (const r of NEDTRAPPINGSSETT.regler) {
      for (const e of r.eksempler.filter((x) => !x.stopp)) expect(kort(r, e.inndata.startdose_mg).fra!.at(-1), `${r.id} ${e.id}`).toMatch(/^fra dag \d+: seponert$/)
    }
  })

  it('holder ved grensene for startdosen: ytterpunktene gjelder, rett utenfor stopper', () => {
    for (const r of NEDTRAPPINGSSETT.regler.filter((x) => x.beregnbarhet !== 'bare_tekstlig')) {
      const [min, maks] = r.inndata[0]!.omrade!
      for (const dose of [min, maks]) expect((kort(r, dose).stopp ?? []).join(' '), `${r.id} ${dose}`).not.toMatch(/utenfor/)
      for (const dose of [min - 0.01, maks + 0.01]) expect(kort(r, dose).stopp?.join(' '), `${r.id} ${dose}`).toMatch(/utenfor det regelen gjelder for/)
    }
  })

  it('holder ved grensene for varighet og lav dose', () => {
    // Minst 14 dager: ett trinn på 14 dager holder, ingen trinn stopper.
    expect(kort(regel('citalopram'), 20).fra).toEqual(['dag 1–14: 10 mg', 'fra dag 15: seponert'])
    expect(kort(regel('citalopram'), 10).stopp!.join(' ')).toMatch(/kortere enn 14 dager/)
    expect(kort(regel('duloksetin'), 60).fra).toEqual(['dag 1–14: 30 mg', 'fra dag 15: seponert'])
    expect(kort(regel('duloksetin'), 59.99).stopp!.join(' ')).toMatch(/kortere enn 14 dager/)
    // Like over grensen for lav dose er trinnet 50 %, ved grensen 25 %.
    expect(kort(regel('fluvoksamin'), 100).fra!.slice(0, 2)).toEqual(['dag 1–14: 50 mg', 'dag 15–28: 37,5 mg'])
    expect(kort(regel('moklobemid'), 300).fra![0]).toBe('dag 1–14: 225 mg')
    expect(kort(regel('moklobemid'), 600).fra![0]).toBe('dag 1–14: 300 mg')
    // Under sluttdosen seponeres det; uten krav om varighet kan det være fra dag 1.
    expect(kort(regel('vortioksetin'), 5).fra).toEqual(['fra dag 1: seponert'])
    expect(kort(regel('bupropion'), 300).fra).toEqual(['dag 1–14: 150 mg', 'fra dag 15: seponert'])
  })
})

/* --- Doseplanene med syntetiske preparater ---------------------------------------- */

const p = (id: string, form: Testpreparat['form'], mg: number, x: Partial<Testpreparat> = {}): Testpreparat => ({ id, virkestoff: 'testoksetin', varenavn: `Syntetisk ${id}`, form, mg, ...x })
const OMGIVELSE = { idag: '2026-11-01', naa: '2026-11-01T12:00:00Z' }
const TABLETTER = { fra: { klasse: 'peroral' as const, legemiddelformer: ['SYN-TAB'] } }

/** Planen etter regelen (ikke godkjent: en modellberegning), med syntetiske preparater for virkestoffet. */
function plan(nokkel: string, startdose_mg: number, preparater: Testpreparat[], formvalg?: Record<string, { klasse: 'peroral'; legemiddelformer: string[] }>) {
  const grunnlag = { utvalg: syntetiskUtvalg(preparater), koblinger: { [nokkel]: ['ID_SYNTETISK-TESTOKSETIN'] }, overstyringer: [] }
  return planform(beregnDoseplan(regel(nokkel), { startdose_mg, ...(formvalg && { formvalg }) }, grunnlag, OMGIVELSE))
}

const SERTRALIN = [p('S25', 'tablett', 25), p('S50', 'tablett', 50, { deling: '2' }), p('S100', 'tablett', 100, { deling: '2' })]
const NAERMESTE = /kan ikke gis med preparatene i FEST nøyaktig\. Nærmeste doser som kan settes sammen: .*krever en ny faglig beslutning; beregningen gjør det ikke selv\./

describe('Doseplanene (P7.3–P7.4)', () => {
  it('gir en plan helt til seponering for vanlige startdoser', () => {
    expect(plan('sertralin', 100, SERTRALIN)).toEqual({ fra: ['dag 1–14: 50 mg = 1 tablett à 50 mg', 'dag 15–28: 25 mg = 1 tablett à 25 mg', 'fra dag 29: seponert'] })
    expect(plan('duloksetin', 120, [p('D30', 'kapsel', 30), p('D60', 'kapsel', 60)])).toEqual({ fra: ['dag 1–14: 60 mg = 1 kapsel à 60 mg', 'dag 15–28: 30 mg = 1 kapsel à 30 mg', 'fra dag 29: seponert'] })
  })

  it('stopper med de nærmeste dosene når et trinn fra en uvanlig startdose ikke kan gis nøyaktig, uten å avvike fra regelen', () => {
    const s = plan('sertralin', 150, SERTRALIN).stopp!.join(' ')
    expect(s).toMatch(/dag 15–28: den ideelle dosen 37,5 mg/)
    expect(s).toMatch(/25 mg \(-33,33 %\) og 50 mg \(\+33,33 %\)/)
    expect(s).toMatch(NAERMESTE)
    expect(plan('sertralin', 250, SERTRALIN).stopp).toEqual(['Startdosen 250 mg er utenfor det regelen gjelder for (25–200 mg).'])
  })

  it('stopper når Norge mangler styrken et trinn krever', () => {
    // Duloksetin finnes i 30 og 60 mg; 45 mg kan ikke settes sammen, og kapsler deles ikke.
    expect(plan('duloksetin', 90, [p('D30', 'kapsel', 30), p('D60', 'kapsel', 60)]).stopp!.join(' ')).toMatch(/dag 1–14: den ideelle dosen 45 mg kan ikke gis.*30 mg \(-33,33 %\) og 60 mg \(\+33,33 %\)/)
    expect(plan('venlafaksin', 225, [p('V37', 'kapsel', 37.5), p('V75', 'kapsel', 75), p('V150', 'kapsel', 150)]).stopp!.join(' ')).toMatch(/56,25 mg kan ikke gis/)
  })

  it('følger den raske kildevarianten for paroksetin og den langvarige nedtrappingen for sertralin', () => {
    const PAROKSETIN = [p('P20', 'tablett', 20, { deling: '2' })]
    expect(plan('paroksetin', 40, PAROKSETIN)).toEqual({
      fra: ['dag 1–7: 30 mg = 1½ tabletter à 20 mg', 'dag 8–14: 20 mg = 1 tablett à 20 mg', 'dag 15–21: 10 mg = ½ tablett à 20 mg', 'fra dag 22: seponert'],
    })
    expect(plan('paroksetin', 20, PAROKSETIN)).toEqual({ fra: ['dag 1–7: 10 mg = ½ tablett à 20 mg', 'fra dag 8: seponert'] })
    expect(plan('sertralin', 200, SERTRALIN).fra).toEqual(['dag 1–14: 100 mg = 1 tablett à 100 mg', 'dag 15–28: 50 mg = 1 tablett à 50 mg', 'dag 29–42: 25 mg = 1 tablett à 25 mg', 'fra dag 43: seponert'])
  })

  it('stopper ved de små trinnene i en lang nedtrapping når tablettene ikke gir dosen', () => {
    // Klomipramin 150 mg: den ideelle kurven går til dag 85, men 18,75 mg kan ikke gis med halve 10 og 25 mg-tabletter.
    expect(kort(regel('klomipramin'), 150).fra!.at(-1)).toBe('fra dag 85: seponert')
    const s = plan('klomipramin', 150, [p('K10', 'tablett', 10, { deling: '2' }), p('K25', 'tablett', 25, { deling: '2' })]).stopp!.join(' ')
    expect(s).toMatch(/dag 29–42: den ideelle dosen 18,75 mg kan ikke gis.*17,5 mg \(-6,67 %\) og 20 mg \(\+6,67 %\)/)
  })

  it('deler bare tabletter FEST oppgir som delbare: lav sluttdose med halv tablett, stopp med kapsler', () => {
    expect(plan('fluoksetin', 40, [p('F20', 'tablett', 20, { deling: '2' })]).fra).toEqual(['dag 1–14: 20 mg = 1 tablett à 20 mg', 'dag 15–28: 10 mg = ½ tablett à 20 mg', 'fra dag 29: seponert'])
    expect(plan('fluoksetin', 40, [p('F20', 'tablett', 20)]).stopp!.join(' ')).toMatch(/den ideelle dosen 10 mg kan ikke gis.*20 mg \(\+100 %\)/)
    expect(plan('fluoksetin', 40, [p('F20K', 'kapsel', 20)]).stopp!.join(' ')).toMatch(/den ideelle dosen 10 mg kan ikke gis/)
    expect(plan('vortioksetin', 5, [p('V5', 'tablett', 5), p('V10', 'tablett', 10)])).toEqual({ fra: ['fra dag 1: seponert'] })
  })

  it('bruker dråper når de er valgt, men ikke en mikstur uten doseringsoppløsning', () => {
    const DRAPER = p('SD', 'draper', 20, { nevner: { verdi: 1, enhet: 'ml' }, per_drape: 1 })
    const MIKSTUR = p('SM', 'mikstur', 20, { nevner: { verdi: 1, enhet: 'ml' } })
    expect(plan('sertralin', 50, [...SERTRALIN, DRAPER], { fra: { klasse: 'peroral', legemiddelformer: ['SYN-DRAP'] } }).fra).toEqual(['dag 1–14: 25 mg = 25 dråper à 1 mg', 'fra dag 15: seponert'])
    expect(plan('sertralin', 50, [...SERTRALIN, MIKSTUR], { fra: { klasse: 'peroral', legemiddelformer: ['SYN-MIKST'] } }).stopp!.join(' ')).toMatch(/flytende \(20 mg\/ml\) uten dokumentert doseringsoppløsning/)
    // Uten valg brukes tablettene, og miksturen blir ikke tatt med.
    expect(plan('sertralin', 50, [...SERTRALIN, MIKSTUR]).fra).toEqual(['dag 1–14: 25 mg = 1 tablett à 25 mg', 'fra dag 15: seponert'])
  })
})

describe('Klinisk plan i appen', () => {
  const valg = { fra: { nokkel: 'sertralin', formulering: 'standard' as const } }
  const skjema = (startdose: string): Planskjema => ({ ...TOMT_SKJEMA, startdose, formvalg: { fra: { klasse: 'peroral', legemiddelform: TABLETTER.fra.legemiddelformer[0] } } })
  const GODKJENT = godkjennITest(regel('sertralin'), 'test-sertralin')
  const NAA = TESTKLOKKE()

  it('gir ingen plan etter et regelutkast, selv med fersk FEST', () => {
    const r = beregnPlan(regel('sertralin'), valg, skjema('100'), testFestFor('sertralin', SERTRALIN), NAA)
    expect(r.status).toBe('stoppet')
    expect(r.status === 'stoppet' && r.stoppgrunner.join(' ')).toMatch(/Ingen klinisk doseplan.*ikke klinisk godkjent/)
  })

  it('gir en klinisk plan bare etter en regel godkjent i testen, med fersk FEST, og oppgir regelsettet regelen hører til', () => {
    const r = beregnPlan(GODKJENT, valg, skjema('100'), testFestFor('sertralin', SERTRALIN), NAA)
    expect(r).toMatchObject({ status: 'doseplan', klinisk: true })
    expect(planform(r).fra).toEqual(['dag 1–14: 50 mg = 1 tablett à 50 mg', 'dag 15–28: 25 mg = 1 tablett à 25 mg', 'fra dag 29: seponert'])
    expect(beregnPlan(regel('sertralin'), valg, skjema('100'), testFestFor('sertralin', SERTRALIN), NAA).regelsett).toEqual({ id: NEDTRAPPINGSSETT.id, versjon: NEDTRAPPINGSSETT.versjon })
  })

  it('gir ingen plan med en foreldet FEST-kopi', () => {
    const r = beregnPlan(GODKJENT, valg, skjema('100'), testFestFor('sertralin', SERTRALIN, { kontrollert_kl: '2026-10-29T04:20:00Z' }), NAA)
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
