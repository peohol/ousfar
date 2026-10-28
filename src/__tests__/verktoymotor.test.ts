/**
 * Doseplanmotoren for OUSFAR Verktøy (P5 i `docs/verktøy-utviklingsplan.md`),
 * med syntetiske regler og preparater: at preparatene leses riktig fra FEST
 * (styrke, saltforhold, deling, formulering, preparattype og markedsstatus),
 * at deling bare brukes der FEST sier det, at dosene velges etter de harde
 * kravene og så minst avvik og kompleksitet, ved grenseverdiene for toleranse
 * og dosegrenser, at utvasking, depot og datoer håndteres, at beregningen
 * stopper i stedet for å gjette, at hver dose har et spor til konkrete
 * preparater, at den er deterministisk og bærer versjonene, at ingen
 * pilotregel og ingen syntetisk regel kan gi en klinisk plan, at testtilfellene
 * stemmer, at rapporten er oppdatert, og at bare verktøymodulene bruker motoren.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Legemiddelutvalg } from '../legemiddeldata/lesing'
import { beregn } from '../verktoy/regler/beregning'
import { fingeravtrykk } from '../verktoy/regler/godkjenning'
import { REGELMODELLVERSJON, type Nedtrappingsstrategi, type Regel } from '../verktoy/regler/modell'
import { PILOTSETT } from '../verktoy/regler/pilotsett'
import { byggesteiner, type Byggestein } from '../verktoy/motor/byggesteiner'
import { doser, MAKS_DRAPER, MAKS_ENHETER, styrkevalg, velgSerie, type Dosekandidat } from '../verktoy/motor/dosevalg'
import {
  antallTekst,
  beregnDoseplan,
  FORBEHOLD_IKKE_KLINISK,
  FORBEHOLD_LAGER,
  kliniskDoseplan,
  kliniskSperre,
  PLANMOTORVERSJON,
  planform,
  type Doseplaninndata,
  type Doseplanresultat,
  type Omgivelse,
} from '../verktoy/motor/plan'
import { lagMotorrapport, MOTORRAPPORTFIL } from '../verktoy/motor/rapport'
import {
  depotregel,
  FORMER,
  KRYSSREGEL,
  nedtrappingsregel,
  OMGIVELSE,
  sp,
  syntetiskGrunnlag,
  TESTAZAPIN,
  TESTOKSETIN,
  TESTPERIDON,
  TESTTILFELLER,
  type Testpreparat,
} from '../verktoy/motor/syntetisk'

const TABLETT = { klasse: 'peroral' as const, legemiddelformer: [FORMER.tablett.kode] }
const ALLE = [...TESTOKSETIN, ...TESTAZAPIN, ...TESTPERIDON]
const g = syntetiskGrunnlag(ALLE)
const stein = (preparater: Testpreparat[], nokkel: Testpreparat['virkestoff'] = 'testoksetin', idag = OMGIVELSE.idag) => byggesteiner(syntetiskGrunnlag(preparater), nokkel, idag)
const en = (p: Omit<Testpreparat, 'virkestoff' | 'varenavn' | 'id'> & Partial<Testpreparat>): Byggestein =>
  stein([{ id: 'X', virkestoff: 'testoksetin', varenavn: 'Testoksetin X', ...p }], p.virkestoff ?? 'testoksetin')[0]!
const stopp = (r: Doseplanresultat) => (r.status === 'stoppet' ? r.stoppgrunner.join(' ') : '')
const plan = (regel: Regel, inndata: Doseplaninndata, preparater: Testpreparat[] = ALLE, omgivelse: Omgivelse = OMGIVELSE) =>
  beregnDoseplan(regel, inndata, syntetiskGrunnlag(preparater), omgivelse)
/** Opptrapping av testazapin med faste trinn og dosevalget, til å prøve grensene for én dose. */
const fastDose = (mg: number[], dosevalg?: Regel['plan']['forlop'][number]['dosevalg']): Regel => ({
  ...KRYSSREGEL,
  id: 'syntetisk-fast',
  til: null,
  plan: {
    form: 'seponering',
    forlop: [
      {
        id: 'fra',
        virkestoff: { type: 'virkestoff', nokkel: 'testazapin' },
        administrasjon: 'peroral',
        utgangsdose: null,
        start: { type: 'dag', dag: 1 },
        faser: [{ type: 'opptrapping', trinn: mg.map((x) => ({ mg: sp(x, 'mg'), dager: sp(7, 'dager') })) }],
        ...(dosevalg ? { dosevalg } : {}),
      },
    ],
  },
})
const AZA = { startdose_mg: 1, formvalg: { fra: TABLETT } }
/** Et utvalg merket som FEST, men med syntetiske preparater: bare til å prøve sperrene. */
const somFest = (u: Legemiddelutvalg, kontrollert_kl = '2026-11-01T04:20:00Z'): Legemiddelutvalg => ({ ...u, kilde: 'FEST', kontrollert_kl })

describe('Byggesteinene fra FEST', () => {
  it('deler en tablett bare når FEST sier delbar i 2 eller 4; uklar deling er ikke deling', () => {
    expect(en({ form: 'tablett', mg: 10, deling: '2' })).toMatchObject({ deling: 2, deling_grunnlag: 'FEST: «Delbar i 2»' })
    expect(en({ form: 'tablett', mg: 10, deling: '4' })).toMatchObject({ deling: 4 })
    expect(en({ form: 'tablett', mg: 10, deling: '1' })).toMatchObject({ deling: 1, deling_grunnlag: 'FEST: «Ikke delbar»' })
    expect(en({ form: 'tablett', mg: 10, deling: '0' })).toMatchObject({ deling: 1, deling_grunnlag: 'FEST oppgir ikke deling; regnes som ikke delbar' })
    expect(en({ form: 'tablett', mg: 10 })).toMatchObject({ deling: 1 })
  })

  it('deler eller åpner aldri en kapsel, selv om FEST skulle oppgi deling, og deler aldri en injeksjon', () => {
    expect(en({ form: 'kapsel', mg: 20, deling: '2' })).toMatchObject({ doseenhet: 'kapsel', deling: 1, deling_grunnlag: 'Kapsel: deles eller åpnes aldri i beregningen' })
    expect(en({ virkestoff: 'testperidon', form: 'depotinjeksjon', mg: 100, deling: '2' })).toMatchObject({ doseenhet: 'injeksjon', deling: 1 })
  })

  it('deler modifisert frisetting bare når FEST sier det for akkurat det preparatet, og sier det', () => {
    expect(en({ form: 'depottablett', mg: 15, deling: '2' })).toMatchObject({ klasse: 'peroral_modifisert', deling: 2, deling_grunnlag: expect.stringMatching(/modifisert frisetting/) })
    expect(en({ form: 'depottablett', mg: 15 })).toMatchObject({ klasse: 'peroral_modifisert', deling: 1 })
  })

  it('regner med styrken i mg moderstoff per enhet, per sprøyte eller per dråpe, og ellers ikke', () => {
    expect(en({ form: 'tablett', mg: 2.5 })).toMatchObject({ mg: 2.5, doseenhet: 'tablett', begrensninger: [] })
    expect(en({ virkestoff: 'testperidon', form: 'depotinjeksjon', mg: 150, nevner: { verdi: 1, enhet: 'sprøyte' } })).toMatchObject({ mg: 150, doseenhet: 'injeksjon', klasse: 'depotinjeksjon' })
    expect(en({ form: 'draper', mg: 20, nevner: { verdi: 1, enhet: 'ml' }, per_drape: 0.5 })).toMatchObject({ mg: 0.5, doseenhet: 'drape', begrensninger: [] })
    expect(en({ form: 'mikstur', mg: 4, nevner: { verdi: 1, enhet: 'ml' } })).toMatchObject({ mg: null, begrensninger: [expect.stringMatching(/flytende .* uten dokumentert doseringsoppløsning/)] })
    expect(en({ form: 'tablett', mg: 4, salt: true })).toMatchObject({ mg: null, begrensninger: [expect.stringMatching(/saltet .* omregning til moderstoffet er ikke dokumentert/)] })
    expect(en({ form: 'tablett', mg: 6, kombinasjon: true }).begrensninger).toEqual(['er et kombinasjonspreparat'])
  })

  it('bruker ikke en styrke som er et intervall, ikke «lik», eller ikke i mg', () => {
    const u = syntetiskGrunnlag([{ id: 'X', virkestoff: 'testoksetin', varenavn: 'X', form: 'tablett', mg: 10 }])
    const med = (endre: (s: Legemiddelutvalg['styrker'][number]) => void) => {
      const kopi = structuredClone(u)
      endre(kopi.utvalg.styrker[0]!)
      return byggesteiner(kopi, 'testoksetin', OMGIVELSE.idag)[0]!.begrensninger
    }
    expect(med((s) => (s.ovre = { verdi: 20, enhet: 'mg' }))).toEqual(['har ikke én entydig styrke i FEST'])
    expect(med((s) => (s.operator = { kode: 'M', tekst: 'Mindre enn' }))).toEqual(['har ikke én entydig styrke i FEST'])
    expect(med((s) => (s.styrke = { verdi: 6, enhet: 'mmol' }))).toEqual(['har styrken i mmol, ikke mg'])
    expect(med((s) => (s.styrke = null))).toEqual(['mangler én styrke i FEST'])
  })

  it('skiller registrert, godkjenningsfritak og andre preparattyper', () => {
    expect(en({ form: 'tablett', mg: 1 })).toMatchObject({ registrering: 'registrert', begrensninger: [] })
    expect(en({ form: 'tablett', mg: 1, type: 'fritak' })).toMatchObject({ registrering: 'godkjenningsfritak', begrensninger: [] })
    expect(en({ form: 'tablett', mg: 1, type: 'sykehus' })).toMatchObject({ registrering: 'annen', begrensninger: [expect.stringMatching(/Sykehuspreparat/)] })
  })

  it('leser markedsstatusen på dagen, med meldte endringer, og er inklusiv på datoene', () => {
    const marked = (pakninger: Testpreparat['pakninger'], idag = '2026-11-01') => {
      const b = stein([{ id: 'X', virkestoff: 'testoksetin', varenavn: 'X', form: 'tablett', mg: 1, pakninger }], 'testoksetin', idag)[0]!
      return [b.marked, b.marked_til, b.begrensninger.join()]
    }
    expect(marked([{}])).toEqual(['markedsfort', null, ''])
    expect(marked([{ avregistrert: '2026-11-01' }])).toEqual(['avregistrert', null, 'er avregistrert i FEST'])
    expect(marked([{ avregistrert: '2026-11-02' }])).toEqual(['markedsfort', '2026-11-02', ''])
    expect(marked([{ utgatt: '2026-11-01' }])).toEqual(['midlertidig_utgatt', null, 'er midlertidig utgått i FEST fra 01.11.2026'])
    expect(marked([{ fra: '2026-11-02' }])).toEqual(['ikke_markedsfort', null, 'er ikke markedsført ennå i FEST'])
    expect(marked([])).toEqual(['uten_pakning', null, 'har ingen pakninger i FEST'])
    // Én pakning på markedet holder; preparatet forsvinner først når den siste gjør det.
    expect(marked([{ avregistrert: '2026-12-01' }, { avregistrert: '2027-03-01' }])).toEqual(['markedsfort', '2027-03-01', ''])
    expect(marked([{ avregistrert: '2026-12-01' }, { utgatt: '2026-12-15' }])).toEqual(['markedsfort', '2026-12-15', ''])
  })

  it('tar bare med preparater med virkestoffet (også saltene), og er uavhengig av rekkefølgen i FEST', () => {
    expect(stein(ALLE, 'testazapin').map((b) => b.varenavn)).toEqual(expect.arrayContaining(['Testazapin Syntetisk', 'Testoksetin Kombi']))
    expect(stein(ALLE, 'testazapin').some((b) => b.varenavn === 'Testoksetin Syntetisk')).toBe(false)
    expect(byggesteiner({ ...g, koblinger: {} }, 'testoksetin', OMGIVELSE.idag)).toEqual([])
    const snudd = structuredClone(g)
    for (const k of ['virkestoff', 'styrker', 'merkevarer', 'pakninger'] as const) snudd.utvalg[k].reverse()
    expect(byggesteiner(snudd, 'testoksetin', OMGIVELSE.idag)).toEqual(byggesteiner(g, 'testoksetin', OMGIVELSE.idag))
  })
})

describe('Dosene som kan settes sammen', () => {
  const valg = (...p: Testpreparat[]) => styrkevalg(stein(p))
  const tab = (id: string, mg: number, deling?: Testpreparat['deling']): Testpreparat => ({ id, virkestoff: 'testoksetin', varenavn: id, form: 'tablett', mg, deling })

  it('gir hele, halve og kvarte enheter bare etter delingen, høyst fire tabletter', () => {
    expect(doser(valg(tab('A', 10, '1')), 0.001, 100).map((k) => k.mg)).toEqual([10, 20, 30, 40])
    expect(doser(valg(tab('A', 10, '2')), 0.001, 12).map((k) => k.mg)).toEqual([5, 10])
    expect(doser(valg(tab('A', 10, '4')), 0.001, 12).map((k) => k.mg)).toEqual([2.5, 5, 7.5, 10])
    expect(MAKS_ENHETER).toBe(4)
    expect(doser(styrkevalg(stein([{ id: 'D', virkestoff: 'testoksetin', varenavn: 'D', form: 'draper', mg: 20, nevner: { verdi: 1, enhet: 'ml' }, per_drape: 1 }])), 0.001, 1000).at(-1)!.mg).toBe(MAKS_DRAPER)
  })

  it('bruker bare de preparatene i en styrke som faktisk kan deles, når dosen krever deling', () => {
    const [halv] = doser(valg(tab('DELBAR', 10, '2'), tab('UDELBAR', 10, '0')), 5, 5)
    expect(halv!.elementer[0]!.preparater.map((b) => b.varenavn)).toEqual(['DELBAR'])
    const [hel] = doser(valg(tab('DELBAR', 10, '2'), tab('UDELBAR', 10, '0')), 10, 10)
    expect(hel!.elementer[0]!.preparater.map((b) => b.varenavn).sort()).toEqual(['DELBAR', 'UDELBAR'])
  })

  it('velger den enkleste sammensetningen av en dose: færrest delinger, så færrest tabletter', () => {
    const v = valg(tab('A', 10, '2'), tab('B', 5, '4'), tab('C', 20, '4'))
    const k = (mg: number) => doser(v, mg, mg)[0]!.elementer.map((e) => `${e.antall}×${e.mg}`).join('+')
    expect(k(15)).toBe('1×10+1×5')
    expect(k(20)).toBe('1×20')
    expect(k(11.25)).toBe('1×10+0.25×5')
  })

  it('setter aldri sammen injeksjoner', () => {
    const v = styrkevalg(stein(TESTPERIDON, 'testperidon')).filter((s) => s.doseenhet === 'injeksjon')
    expect(doser(v, 0.001, 1000).every((k) => k.elementer.length === 1 && k.elementer[0]!.antall === 1)).toBe(true)
  })

  const kandidat = (mg: number): Dosekandidat => ({ mg, elementer: [], kompleksitet: [0, 0, 1, 1] })

  it('går aldri motsatt vei av kurven, og velger heller en større avvik tidlig enn å bryte retningen', () => {
    // Nærmest for første periode er 9,5, men da kan andre periode (bare 9,7) ikke gis uten å øke under nedtrapping.
    const serie = velgSerie([
      { ideell: 10, kandidater: [kandidat(9.5), kandidat(10.6)] },
      { ideell: 9.9, kandidater: [kandidat(9.7)] },
    ])
    expect(serie?.map((k) => k.mg)).toEqual([10.6, 9.7])
    expect(velgSerie([{ ideell: 10, kandidater: [kandidat(9.5)] }, { ideell: 9.9, kandidater: [kandidat(9.7)] }])).toBeNull()
    // Opptrapping: ikke lavere enn forrige.
    expect(velgSerie([{ ideell: 10, kandidater: [kandidat(10.4)] }, { ideell: 10.5, kandidater: [kandidat(10.2), kandidat(10.9)] }])?.map((k) => k.mg)).toEqual([10.4, 10.9])
  })

  it('velger minst endring fra forrige dose ved likt avvik: en nedtrapping rundes opp', () => {
    expect(velgSerie([{ ideell: 15, kandidater: [kandidat(15)] }, { ideell: 11.25, kandidater: [kandidat(10), kandidat(12.5)] }])?.map((k) => k.mg)).toEqual([15, 12.5])
    expect(velgSerie([{ ideell: 10, kandidater: [kandidat(10)] }, { ideell: 13.75, kandidater: [kandidat(12.5), kandidat(15)] }])?.map((k) => k.mg)).toEqual([10, 12.5])
  })
})

describe('Doseplanen', () => {
  it('godtar et avvik nøyaktig på toleransen, og stopper rett over', () => {
    // 12 mg → 15 mg er +25 %; 11,99 mg → 15 mg er over.
    expect(planform(plan(fastDose([12], { avvik_prosent: sp(25, 'prosent') }), AZA))).toEqual({ fra: ['dag 1–7: 15 mg = 1 tablett à 15 mg (ideelt 12 mg, +25 %)', 'fra dag 8: seponert'] })
    expect(stopp(plan(fastDose([11.99], { avvik_prosent: sp(25, 'prosent') }), AZA))).toMatch(/11,99 mg kan ikke gis med preparatene i FEST innenfor ±25 %/)
    expect(stopp(plan(fastDose([12]), AZA))).toMatch(/12 mg kan ikke gis med preparatene i FEST nøyaktig/)
  })

  it('holder dosegrensene: aldri over største eller under minste dose, også innenfor toleransen', () => {
    expect(stopp(plan(fastDose([40], { avvik_prosent: sp(20, 'prosent'), maks_mg: sp(44, 'mg') }), AZA))).toMatch(/40 mg kan ikke gis .* og ikke over 44 mg/)
    expect(planform(plan(fastDose([40], { avvik_prosent: sp(20, 'prosent'), maks_mg: sp(45, 'mg') }), AZA)).fra![0]).toMatch(/^dag 1–7: 45 mg/)
    expect(stopp(plan(fastDose([16], { avvik_prosent: sp(10, 'prosent'), min_mg: sp(16, 'mg') }), AZA))).toMatch(/og ikke under 16 mg/)
    expect(stopp(plan(fastDose([16], { min_mg: sp(20, 'mg'), maks_mg: sp(10, 'mg') }), AZA))).toMatch(/minste dose over største/)
  })

  it('stopper når en verdi i dosevalget mangler eller er ugyldig', () => {
    expect(stopp(plan(fastDose([15], { avvik_prosent: sp(null, 'prosent') }), AZA))).toMatch(/fra\.dosevalg\.avvik_prosent mangler/)
    expect(stopp(plan(fastDose([15], { avvik_prosent: sp(10, 'mg') }), AZA))).toMatch(/fra\.dosevalg\.avvik_prosent er ugyldig: enheten er mg/)
    expect(stopp(plan(fastDose([15], { avvik_prosent: sp(150, 'prosent') }), AZA))).toMatch(/kan ikke være over 100 %/)
  })

  it('sier fra når et trinn gir samme dose som perioden før', () => {
    const r = plan(fastDose([15, 16], { avvik_prosent: sp(10, 'prosent') }), AZA)
    expect(planform(r).fra!.slice(0, 2)).toEqual(['dag 1–7: 15 mg = 1 tablett à 15 mg', 'dag 8–14: 15 mg = 1 tablett à 15 mg (ideelt 16 mg, -6,25 %)'])
    expect(r.status === 'doseplan' && r.avvik).toEqual(['testazapin dag 8–14: 15 mg i stedet for 16 mg (-6,25 %).', 'testazapin dag 8–14: samme dose som perioden før, selv om den ideelle dosen endres; trinnet blir i praksis lengre.'])
  })

  it('bruker et preparat som skal avregistreres bare i perioder som slutter før', () => {
    const tre = (startdato?: string) => planform(plan(fastDose([45]), { ...AZA, ...(startdato ? { startdato } : {}) })).fra![0]
    expect(tre('2026-11-01')).toBe('dag 1–7 [01.11.2026–07.11.2026]: 45 mg = 1 tablett à 45 mg')
    expect(tre('2026-11-24')).toBe('dag 1–7 [24.11.2026–30.11.2026]: 45 mg = 1 tablett à 45 mg')
    expect(tre('2026-11-25')).toBe('dag 1–7 [25.11.2026–01.12.2026]: 45 mg = 1 tablett à 15 mg + 1 tablett à 30 mg')
    expect(tre()).toBe('dag 1–7: 45 mg = 1 tablett à 15 mg + 1 tablett à 30 mg')
  })

  it('følger den ideelle kurven fra P4 for hver nedtrappingsstrategi; prosent av startdose og av aktuell dose er ulike', () => {
    const strategier: Nedtrappingsstrategi[] = [
      { type: 'prosent_av_startdose', prosent: sp(25, 'prosent') },
      { type: 'prosent_av_aktuell', prosent: sp(25, 'prosent'), sluttdose_mg: sp(2.5, 'mg') },
      { type: 'absolutt', mg: sp(5, 'mg') },
      { type: 'hyperbolsk', ed50_mg: sp(5, 'mg'), trinn: sp(4, 'trinn') },
    ]
    const inndata = { startdose_mg: 20, formvalg: { fra: { klasse: 'peroral' as const, legemiddelformer: [FORMER.draper.kode] } } }
    const ideelle = strategier.map((s) => {
      const regel = nedtrappingsregel(s, { avvik_prosent: sp(30, 'prosent') })
      const r = plan(regel, inndata)
      const p4 = beregn(regel, inndata)
      expect(r.status).toBe('doseplan')
      if (r.status !== 'doseplan' || p4.status !== 'modellberegning') return []
      expect(r.forlop[0]!.perioder.map((p) => [p.fra, p.til, p.ideell_mg])).toEqual(p4.forlop[0]!.perioder.map((p) => [p.fra, p.til, p.mg]))
      expect(r.forlop[0]!.siste_dosedag).toBe(p4.forlop[0]!.siste_dosedag)
      return r.forlop[0]!.perioder.map((p) => p.ideell_mg)
    })
    expect(ideelle[0]).toEqual([15, 10, 5])
    expect(ideelle[1]!.slice(0, 3)).toEqual([15, 11.25, 8.4375])
  })

  it('bevarer utvaskingen i den praktiske planen', () => {
    const t = TESTTILFELLER.find((x) => x.id === 'sekvensielt-utvasking')!
    const r = plan(t.regel, t.inndata, t.preparater)
    expect(r.status === 'doseplan' && r.kontroller.find((k) => k.krav.startsWith('Utvasking i doseplanen'))).toEqual({ krav: 'Utvasking i doseplanen: minst 14 dager uten testoksetin før testazapin', oppfylt: true, detalj: '14 dager uten legemiddel.' })
  })

  it('gir depot med nøyaktig én hel injeksjon av preparatet regelen nevner, med godkjenningsfritak bare når det er valgt', () => {
    const r = plan(depotregel(['Testdepot Månedlig'], 75), { startdose_mg: 6, godkjenningsfritak: true })
    expect(planform(r).til!.at(-1)).toBe('vedlikehold hver 1. måned fra dag 8: 75 mg = 1 injeksjon à 75 mg')
    expect(r.status === 'doseplan' && r.forlop[1]!.injeksjoner.at(-1)!.element.preparater.map((b) => [b.varenavn, b.registrering])).toEqual([['Testdepot Månedlig', 'godkjenningsfritak']])
    expect(stopp(plan(depotregel(['Testdepot Månedlig'], 250), { startdose_mg: 6 }))).toMatch(/vedlikeholdet er 250 mg, men FEST har ingen brukbar injeksjon .* Deler av eller flere injeksjoner settes ikke sammen/)
    expect(stopp(plan(depotregel(['Testdepot Finnes Ikke']), { startdose_mg: 6 }))).toMatch(/FEST har ingen depotpreparater \(Testdepot Finnes Ikke\) av testperidon. Det finnes ingen bekreftet norsk løsning/)
  })

  it('foretrekker et registrert preparat framfor godkjenningsfritak når begge gir dosen', () => {
    const begge: Testpreparat[] = [
      { id: 'R', virkestoff: 'testazapin', varenavn: 'Registrert', form: 'tablett', mg: 15 },
      { id: 'F', virkestoff: 'testazapin', varenavn: 'Fritak', form: 'tablett', mg: 15, type: 'fritak' },
    ]
    const r = plan(fastDose([15]), { ...AZA, godkjenningsfritak: true }, begge)
    expect(r.status === 'doseplan' && r.forlop[0]!.perioder[0]!.elementer[0]!.preparater.map((b) => b.varenavn)).toEqual(['Registrert'])
  })

  it('stopper uten preparater for virkestoffet, og sier at ingen norsk løsning er bekreftet', () => {
    expect(stopp(plan(fastDose([15]), AZA, TESTOKSETIN.filter((p) => !p.kombinasjon)))).toMatch(/FEST har ingen perorale preparater av testazapin. Det finnes ingen bekreftet norsk løsning/)
  })

  it('stopper når forskriverens valg utelukker alle preparatene, og sier hvorfor', () => {
    expect(stopp(plan(fastDose([15]), { ...AZA, formvalg: { fra: { ...TABLETT, preparater: ['ID_SYNTETISK-OKS-TAB10'] } } }))).toMatch(/Ingen av de perorale preparatene av testazapin i FEST kan brukes med valgene som er gjort/)
    // Et preparat som er meldt avregistrert, sies fra om når det er grunnen til at dosen ikke kan gis.
    expect(stopp(plan(fastDose([45]), { ...AZA, formvalg: { fra: { ...TABLETT, preparater: ['ID_SYNTETISK-AZA-TAB45'] } } }))).toMatch(
      /45 mg kan ikke gis .*Testazapin Syntetisk tablett 45 mg brukes ikke her, fordi FEST melder at det ikke er markedsført hele perioden/,
    )
  })
})

describe('Kildedata, versjoner og determinisme', () => {
  it('stopper uten en vellykket henting av FEST, med ugyldig dato eller tidspunkt, eller med en annen kilde', () => {
    const regel = fastDose([15])
    const med = (u: Partial<Legemiddelutvalg>, o: Partial<Omgivelse> = {}) => stopp(beregnDoseplan(regel, AZA, { ...g, utvalg: { ...g.utvalg, ...u } }, { ...OMGIVELSE, ...o }))
    expect(med({ kontrollert_kl: null })).toMatch(/ingen vellykket henting av FEST/)
    expect(med({ kildedato: null })).toMatch(/ingen vellykket henting av FEST/)
    expect(med({ kilde: 'HAPI' })).toMatch(/Preparatdataene er fra «HAPI», ikke fra FEST/)
    expect(med({}, { idag: '2026-02-30' })).toMatch(/ikke en gyldig dato/)
    expect(med({}, { naa: 'i går' })).toMatch(/Tidspunktet «i går» er ikke gyldig/)
  })

  it('merker planen med regel, fingeravtrykk, versjoner og FEST-uttrekket', () => {
    const regel = fastDose([15])
    const r = plan(regel, AZA)
    expect(r).toMatchObject({
      regel: { id: 'syntetisk-fast', versjon: 1, fingeravtrykk: fingeravtrykk(regel), godkjenning: 'utkast' },
      modell: REGELMODELLVERSJON,
      motor: 1,
      planmotor: PLANMOTORVERSJON,
      fest: { kilde: 'Syntetiske testdata', kildedato: '2026-10-15', kontrollert_kl: '2026-11-01T04:20:00Z', statusdato: '2026-11-01' },
      preparatgrunnlag: expect.stringMatching(/^[0-9a-f]{64}$/),
    })
    expect(r.status === 'doseplan' && r.forbehold).toEqual([FORBEHOLD_IKKE_KLINISK, FORBEHOLD_LAGER, expect.stringMatching(/døgndoser/)])
  })

  it('gir samme resultat for like inndata, uansett rekkefølgen dataene kommer i', () => {
    for (const t of TESTTILFELLER) {
      const grunnlag = syntetiskGrunnlag(t.preparater, t.fest)
      const a = beregnDoseplan(t.regel, t.inndata, grunnlag, t.omgivelse ?? OMGIVELSE)
      expect(beregnDoseplan(t.regel, t.inndata, grunnlag, t.omgivelse ?? OMGIVELSE), t.id).toEqual(a)
      const snudd = structuredClone(grunnlag)
      for (const k of ['virkestoff', 'styrker', 'merkevarer', 'pakninger'] as const) snudd.utvalg[k].reverse()
      expect(beregnDoseplan(t.regel, t.inndata, snudd, t.omgivelse ?? OMGIVELSE), t.id).toEqual(a)
    }
  })

  it('kaster aldri, heller ikke på meningsløse inndata', () => {
    const verdier = [undefined, null, -1, 0, Number.NaN, Infinity, 'x', 1e9, 0.0001, 15]
    for (const t of TESTTILFELLER) {
      for (const v of verdier) {
        const inndata = { ...t.inndata, startdose_mg: v, maldose_mg: v, startdato: typeof v === 'string' ? v : undefined, formvalg: v === null ? (null as never) : t.inndata.formvalg } as unknown as Doseplaninndata
        const r = beregnDoseplan(t.regel, inndata, syntetiskGrunnlag(t.preparater), OMGIVELSE)
        expect(['doseplan', 'stoppet']).toContain(r.status)
      }
    }
  })
})

describe('Sporet til preparatene', () => {
  const resultater = TESTTILFELLER.map((t) => [t, beregnDoseplan(t.regel, t.inndata, syntetiskGrunnlag(t.preparater, t.fest), t.omgivelse ?? OMGIVELSE)] as const)

  it('har for hver dose konkrete, brukbare preparater som gir nøyaktig den dosen, med tillatt deling', () => {
    let doserSett = 0
    for (const [t, r] of resultater) {
      if (r.status !== 'doseplan') continue
      for (const f of r.forlop) {
        for (const p of f.perioder) {
          doserSett++
          expect(p.elementer.length, t.id).toBeGreaterThan(0)
          expect(p.elementer.reduce((s, e) => s + e.antall * e.mg, 0), t.id).toBeCloseTo(p.mg, 9)
          expect(p.mg, t.id).toBeGreaterThan(0)
          expect(Math.abs(p.mg - p.ideell_mg), t.id).toBeLessThanOrEqual((p.ideell_mg * f.toleranse_prosent) / 100 + 1e-9)
          for (const e of p.elementer) {
            expect(e.preparater.length, t.id).toBeGreaterThan(0)
            for (const b of e.preparater) {
              expect(b.begrensninger, t.id).toEqual([])
              expect(b.mg, t.id).toBe(e.mg)
              expect(b.marked, t.id).toBe('markedsfort')
              expect(Number.isInteger(e.antall * b.deling), `${t.id}: ${b.navn_form_styrke} ×${e.antall}`).toBe(true)
              if (b.doseenhet === 'kapsel' || b.doseenhet === 'injeksjon') expect(Number.isInteger(e.antall)).toBe(true)
              if (b.registrering === 'godkjenningsfritak') expect(t.inndata.godkjenningsfritak, t.id).toBe(true)
            }
          }
        }
        for (const i of f.injeksjoner) {
          doserSett++
          expect(i.element.antall).toBe(1)
          expect(i.element.mg).toBe(i.mg)
          expect(i.element.preparater.every((b) => b.doseenhet === 'injeksjon' && b.klasse === 'depotinjeksjon')).toBe(true)
        }
      }
    }
    expect(doserSett).toBeGreaterThan(20)
  })

  it('bruker aldri en kapsel, en dråpe eller en injeksjon i deler', () => {
    for (const [, r] of resultater) {
      if (r.status !== 'doseplan') continue
      for (const e of r.forlop.flatMap((f) => [...f.perioder.flatMap((p) => p.elementer), ...f.injeksjoner.map((i) => i.element)])) {
        if (e.doseenhet !== 'tablett') expect(Number.isInteger(e.antall)).toBe(true)
      }
    }
  })
})

describe('Sperren mot klinisk bruk', () => {
  const NAA = new Date('2026-11-01T12:00:00Z')

  it('ingen av P4s pilotregler kan gi en klinisk plan, uansett preparatdata', () => {
    expect(PILOTSETT.regler).toHaveLength(8)
    const fest = somFest(g.utvalg)
    for (const r of PILOTSETT.regler) {
      expect(r.godkjenning.status).not.toBe('klinisk_godkjent')
      expect(kliniskSperre(r, fest, NAA).join(' '), r.id).toMatch(/ikke klinisk godkjent/)
      // Med preparater for virkestoffene (syntetiske, merket som FEST) stopper den kliniske planen likevel.
      const koblinger = Object.fromEntries([...new Set(r.plan.forlop.flatMap((f) => (f.virkestoff.type === 'virkestoff' ? [f.virkestoff.nokkel] : (r.medlemmer ?? []).map((m) => m.nokkel))))].map((n) => [n, ['ID_SYNTETISK-TESTOKSETIN']]))
      for (const e of r.eksempler) {
        const res = kliniskDoseplan(r, e.inndata, { ...g, utvalg: fest, koblinger }, OMGIVELSE)
        expect(res.status, `${r.id} ${e.id}`).toBe('stoppet')
        expect(res.klinisk).toBe(false)
      }
    }
  })

  it('en syntetisk testregel eller syntetiske preparater gir aldri en klinisk plan, heller ikke med en godkjenning', () => {
    const regel = fastDose([15])
    regel.godkjenning = {
      status: 'klinisk_godkjent',
      historikk: [{ status: 'klinisk_godkjent', dato: '2026-11-01', av: 'Syntetisk kontrollør', rolle: 'uavhengig_kontrollor', regelversjon: 1, fingeravtrykk: fingeravtrykk(regel), merknad: 'Syntetisk test av sperren.' }],
    }
    const r = beregnDoseplan(regel, AZA, { ...g, utvalg: somFest(g.utvalg) }, OMGIVELSE)
    expect(r).toMatchObject({ status: 'doseplan', klinisk: false })
    expect(r.status === 'doseplan' && r.sperre).toEqual(['Regelen er en syntetisk testregel.', expect.stringMatching(/åpne valg/)])
    expect(kliniskSperre(regel, g.utvalg, NAA)).toContain('Preparatene er fra «Syntetiske testdata», ikke fra FEST.')
    const k = kliniskDoseplan(regel, AZA, g, OMGIVELSE)
    expect(k).toMatchObject({ status: 'stoppet', klinisk: false, stoppgrunner: ['Ingen klinisk doseplan kan vises.', 'Regelen er en syntetisk testregel.', expect.anything(), expect.anything()] })
    for (const t of TESTTILFELLER) expect(kliniskDoseplan(t.regel, t.inndata, syntetiskGrunnlag(t.preparater, t.fest), OMGIVELSE).status, t.id).toBe('stoppet')
  })

  it('sperrer når FEST-kopien ikke er kontrollert de siste 48 timene', () => {
    const regel = fastDose([15])
    expect(kliniskSperre(regel, somFest(g.utvalg, '2026-10-30T12:00:00Z'), NAA).join(' ')).not.toMatch(/sist kontrollert mot FEST/)
    expect(kliniskSperre(regel, somFest(g.utvalg, '2026-10-30T11:59:00Z'), NAA).join(' ')).toMatch(/sist kontrollert mot FEST/)
  })

  it('viser bare publisert OUSFAR-fagtekst når beregningen stopper', () => {
    const fagtekst = [
      { fagside: 'testoksetin', tittel: 'Publisert', tekst: 'Publisert fagtekst.', publisert: true },
      { fagside: 'testoksetin', tittel: 'Utkast', tekst: 'Utkast.', publisert: false },
    ]
    const r = plan(fastDose([12]), AZA, ALLE, { ...OMGIVELSE, fagtekst })
    expect(r.status === 'stoppet' && r.fagtekst.map((t) => t.tittel)).toEqual(['Publisert'])
    expect(kliniskDoseplan(fastDose([15]), AZA, g, { ...OMGIVELSE, fagtekst })).toMatchObject({ fagtekst: [fagtekst[0]] })
  })

  it('pilotreglenes depotforløp sier ikke hvilket preparat de gjelder, så motoren stopper for dem', () => {
    for (const id of ['depot-paliperidon-xeplion', 'depot-aripiprazol-maintena']) {
      const r = PILOTSETT.regler.find((x) => x.id === id)
      expect(r, id).toBeDefined()
      expect(r!.plan.forlop.filter((f) => f.administrasjon === 'depotinjeksjon').every((f) => !f.preparater)).toBe(true)
    }
    const xeplion = PILOTSETT.regler.find((x) => x.id === 'depot-paliperidon-xeplion')!
    const res = beregnDoseplan(xeplion, { startdose_mg: 6, bekreftet: ['indikasjon'], pasientforhold: { nedsatt_nyrefunksjon: false } }, { ...g, koblinger: { paliperidon: ['ID_SYNTETISK-TESTPERIDON'] } }, OMGIVELSE)
    expect(stopp(res)).toMatch(/Regelen sier ikke hvilket depotpreparat paliperidon \(til\) gjelder/)
  })
})

describe('Testtilfellene', () => {
  for (const t of TESTTILFELLER) {
    it(`${t.id}: ${t.beskrivelse.slice(0, 80)}`, () => {
      const r = beregnDoseplan(t.regel, t.inndata, syntetiskGrunnlag(t.preparater, t.fest), t.omgivelse ?? OMGIVELSE)
      expect(t.regel.id.startsWith('syntetisk-')).toBe(true)
      expect(r.klinisk).toBe(false)
      if ('stopp' in t.forventet && t.forventet.stopp instanceof RegExp) {
        expect(r.status).toBe('stoppet')
        expect(stopp(r)).toMatch(t.forventet.stopp)
      } else expect(planform(r)).toEqual(t.forventet)
    })
  }

  it('skriver delte antall som brøk', () => {
    expect([0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 3].map(antallTekst)).toEqual(['¼', '½', '¾', '1', '1¼', '1½', '1¾', '3'])
  })
})

describe('Motoren', () => {
  it('brukes ikke av appen: bare verktøymodulene og testene bruker den', () => {
    const filer: string[] = []
    const gaa = (mappe: string) => {
      for (const n of readdirSync(mappe)) {
        const sti = join(mappe, n)
        if (statSync(sti).isDirectory()) gaa(sti)
        else if (/\.(ts|tsx)$/.test(n)) filer.push(sti)
      }
    }
    const rot = new URL('../', import.meta.url).pathname
    gaa(rot)
    const brukere = filer
      .filter((f) => /verktoy\/motor\/|from '\.\/motor\//.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(rot.length))
      .filter((f) => !f.startsWith('verktoy/motor/') && !f.startsWith('__tests__/'))
    expect(brukere).toEqual([])
  })

  it('testdataene er tydelig syntetiske', () => {
    expect(ALLE.every((p) => /^Test/.test(p.varenavn))).toBe(true)
    expect(g.utvalg.kilde).toBe('Syntetiske testdata')
    expect(TESTTILFELLER.every((t) => t.regel.tittel.startsWith('SYNTETISK TESTREGEL'))).toBe(true)
  })

  it('rapporten er oppdatert', () => {
    const ny = 'Lag den på nytt med `npm run verktoy:regler -- motorrapport`.'
    expect(readFileSync(new URL(`../../${MOTORRAPPORTFIL}`, import.meta.url), 'utf8'), ny).toBe(lagMotorrapport())
  })
})
