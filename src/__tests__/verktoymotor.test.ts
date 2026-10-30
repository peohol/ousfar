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
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Legemiddelutvalg } from '../legemiddeldata/lesing'
import { beregn, MOTORVERSJON } from '../verktoy/regler/beregning'
import { fingeravtrykk } from '../verktoy/regler/godkjenning'
import { REGELMODELLVERSJON, type Nedtrappingsstrategi, type Regel } from '../verktoy/regler/modell'
import { PILOTSETT } from '../verktoy/regler/pilotsett'
import { byggesteiner, type Byggestein } from '../verktoy/motor/byggesteiner'
import { doser, fordel, MAKS_DRAPER, MAKS_ENHETER, styrkevalg, velgSerie, type Dosekandidat } from '../verktoy/motor/dosevalg'
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
import { FEST_AKSEPTTEST, FEST_PILOT, omgivelseFor, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { festkoblinger, KARTLEGGING } from '../verktoy/register'
import { godkjennITest } from './hjelp/verktoyplan'
import {
  depotregel,
  fastDose,
  FORMER,
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

  it('velger den enkleste sammensetningen som kan fordeles, når døgndosen må fordeles', () => {
    // 100 mg som én tablett kan ikke fordeles på to doser; fire tabletter à 25 mg kan (50 + 50 mg).
    const v = valg(tab('A', 25), tab('B', 100))
    const k = (godta?: (k: Dosekandidat) => boolean) => doser(v, 100, 100, godta)[0]!.elementer.map((e) => `${e.antall}×${e.mg}`).join('+')
    expect(k()).toBe('1×100')
    expect(k((x) => fordel(x, [2], Infinity) !== null)).toBe('4×25')
    expect(doser(v, 100, 100, () => false)).toEqual([])
  })

  it('setter aldri sammen injeksjoner', () => {
    const v = styrkevalg(stein(TESTPERIDON, 'testperidon')).filter((s) => s.doseenhet === 'injeksjon')
    expect(doser(v, 0.001, 1000).every((k) => k.elementer.length === 1 && k.elementer[0]!.antall === 1)).toBe(true)
  })

  const kandidat = (mg: number): Dosekandidat => ({ mg, elementer: [], kompleksitet: [0, 0, 1, 1] })

  it('går aldri motsatt vei av kurven, og velger heller en større avvik tidlig enn å bryte retningen', () => {
    // Nærmest for første periode er 9,5, men da kan andre periode (bare 9,7) ikke gis uten å øke under nedtrapping.
    // Første periode holder dosen forløpet starter med (10 mg), så den har ingen retning.
    const serie = velgSerie(
      [
        { ideell: 10, kandidater: [kandidat(9.5), kandidat(10.6)] },
        { ideell: 9.9, kandidater: [kandidat(9.7)] },
      ],
      10,
    )
    expect(serie?.map((k) => k.mg)).toEqual([10.6, 9.7])
    expect(velgSerie([{ ideell: 10, kandidater: [kandidat(9.5)] }, { ideell: 9.9, kandidater: [kandidat(9.7)] }], 10)).toBeNull()
    // Opptrapping: ikke lavere enn forrige.
    expect(velgSerie([{ ideell: 10, kandidater: [kandidat(10.4)] }, { ideell: 10.5, kandidater: [kandidat(10.2), kandidat(10.9)] }], 10)?.map((k) => k.mg)).toEqual([10.4, 10.9])
  })

  it('måler retningen i første periode fra dosen forløpet starter med', () => {
    // Nedtrapping fra 10 mg: første ideelle dose er 9 mg; 10,5 mg ville økt dosen.
    expect(velgSerie([{ ideell: 9, kandidater: [kandidat(10.5)] }], 10)).toBeNull()
    expect(velgSerie([{ ideell: 9, kandidater: [kandidat(8), kandidat(10.5)] }], 10)?.map((k) => k.mg)).toEqual([8])
    // Akkurat dagens dose er ikke motsatt vei.
    expect(velgSerie([{ ideell: 9, kandidater: [kandidat(10)] }], 10)?.map((k) => k.mg)).toEqual([10])
    // Opptrapping fra 10 mg: første ideelle dose er 11 mg; 9,5 mg ville senket dosen.
    expect(velgSerie([{ ideell: 11, kandidater: [kandidat(9.5)] }], 10)).toBeNull()
    expect(velgSerie([{ ideell: 11, kandidater: [kandidat(9.5), kandidat(12)] }], 10)?.map((k) => k.mg)).toEqual([12])
    // Et nytt legemiddel starter fra 0.
    expect(velgSerie([{ ideell: 11, kandidater: [kandidat(9.5)] }], 0)?.map((k) => k.mg)).toEqual([9.5])
  })

  it('runder mot forrige dose ved ellers likt avvik i hvert trinn: nedtrapping opp, opptrapping ned', () => {
    // Samme sum av avvik og endringer; avrundingen bestemmer mellomtrinnet.
    const ned = [15, 11.25, 5].map((ideell) => ({ ideell, kandidater: [5, 10, 12.5, 15].map(kandidat).filter((k) => Math.abs(k.mg - ideell) / ideell <= 0.12) }))
    expect(velgSerie(ned, 15)?.map((k) => k.mg)).toEqual([15, 12.5, 5])
    const opp = [5, 13.75, 20].map((ideell) => ({ ideell, kandidater: [5, 12.5, 15, 20].map(kandidat).filter((k) => Math.abs(k.mg - ideell) / ideell <= 0.1) }))
    expect(velgSerie(opp, 0)?.map((k) => k.mg)).toEqual([5, 12.5, 20])
    // Flere mellomtrinn med likt avvik: hvert rundes mot forrige dose.
    const lang = [20, 13.75, 11.25, 5].map((ideell) => ({ ideell, kandidater: [5, 10, 12.5, 15, 20].map(kandidat).filter((k) => Math.abs(k.mg - ideell) / ideell <= 0.12) }))
    expect(velgSerie(lang, 20)?.map((k) => k.mg)).toEqual([20, 15, 12.5, 5])
    // Avviket går foran avrundingen: nærmest vinner selv om det er ned i en nedtrapping.
    expect(velgSerie([{ ideell: 11, kandidater: [kandidat(10.5), kandidat(12)] }], 15)?.map((k) => k.mg)).toEqual([10.5])
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

  it('starter aldri en nedtrapping med å øke dosen, eller en opptrapping med å senke den', () => {
    // Fra 10 mg, 10 % ned til under 8,5 mg: ideelt 9 mg; bare en udelelig 10,5 mg-tablett finnes.
    const ned = nedtrappingsregel({ type: 'prosent_av_aktuell', prosent: sp(10, 'prosent'), sluttdose_mg: sp(8.5, 'mg') }, { avvik_prosent: sp(25, 'prosent') })
    const bare = (mg: number): Testpreparat[] => [{ id: 'T', virkestoff: 'testoksetin', varenavn: 'Testoksetin T', form: 'tablett', mg, deling: '1' }]
    const inndata = { startdose_mg: 10, formvalg: { fra: TABLETT } }
    expect(stopp(plan(ned, inndata, bare(10.5)))).toMatch(/første periode er ideelt 9 mg, men ingen dose innenfor rammene er lavere enn dosen forløpet starter med \(10 mg\)/)
    expect(planform(plan(ned, inndata, bare(8))).fra![0]).toBe('dag 1–14: 8 mg = 1 tablett à 8 mg (ideelt 9 mg, -11,11 %)')
    // Fra 10 mg opp til 11 mg: 9,5 mg ville senket dosen.
    const opp: Regel = { ...ned, plan: { ...ned.plan, forlop: [{ ...ned.plan.forlop[0]!, faser: [{ type: 'opptrapping', trinn: [{ mg: sp(11, 'mg'), dager: sp(7, 'dager') }] }] }] } }
    expect(stopp(plan(opp, inndata, bare(9.5)))).toMatch(/første periode er ideelt 11 mg, men ingen dose innenfor rammene er høyere enn dosen forløpet starter med \(10 mg\)/)
    expect(planform(plan(opp, inndata, bare(12))).fra![0]).toBe('dag 1–7: 12 mg = 1 tablett à 12 mg (ideelt 11 mg, +9,09 %)')
  })

  it('holder grensen på dråper for hele døgndosen, også over to styrker', () => {
    const draper = (mg: number, per_drape: number): Testpreparat => ({ id: `D${per_drape}`, virkestoff: 'testazapin', varenavn: `Testazapin D${per_drape}`, form: 'draper', mg, nevner: { verdi: 1, enhet: 'ml' }, per_drape })
    const to = [draper(20, 1), draper(40, 2)]
    const valg = { fra: { klasse: 'peroral' as const, legemiddelformer: [FORMER.draper.kode] } }
    // 120 mg = 60 dråper à 2 mg; 121 mg krever 61 dråper (1 à 1 mg + 60 à 2 mg) og stopper.
    expect(planform(plan(fastDose([120]), { ...AZA, formvalg: valg }, to)).fra![0]).toBe('dag 1–7: 120 mg = 60 dråper à 2 mg')
    expect(planform(plan(fastDose([119]), { ...AZA, formvalg: valg }, to)).fra![0]).toBe('dag 1–7: 119 mg = 1 dråpe à 1 mg + 59 dråper à 2 mg')
    expect(stopp(plan(fastDose([121]), { ...AZA, formvalg: valg }, to))).toMatch(/121 mg kan ikke gis med preparatene i FEST nøyaktig/)
    const v = styrkevalg(stein(to, 'testazapin'))
    expect(doser(v, 0, 1000).every((k) => k.elementer.reduce((n, e) => n + e.antall, 0) <= MAKS_DRAPER)).toBe(true)
  })

  it('bevarer utvaskingen i den praktiske planen', () => {
    const t = TESTTILFELLER.find((x) => x.id === 'sekvensielt-utvasking')!
    const r = plan(t.regel, t.inndata, t.preparater)
    expect(r.status === 'doseplan' && r.kontroller.find((k) => k.krav.startsWith('Utvasking i doseplanen'))).toEqual({ krav: 'Utvasking i doseplanen: minst 14 dager uten testoksetin før testazapin', oppfylt: true, detalj: '14 dager uten legemiddel.' })
  })

  it('gir depot med nøyaktig én hel injeksjon av preparatet regelen nevner, med godkjenningsfritak bare når det er valgt', () => {
    const r = plan(depotregel(['Testdepot Månedlig'], 75), { startdose_mg: 6, godkjenningsfritak: true })
    expect(planform(r).til!.slice(-2)).toEqual(['dag 8: 100 mg = 1 injeksjon à 100 mg', 'hver måned fra 1 måned etter dag 8: 75 mg = 1 injeksjon à 75 mg'])
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
      motor: MOTORVERSJON,
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

  it('tilbyr de nærmeste dosene som kan gis bare når regelen tillater det, og velger ikke selv (P7.5)', () => {
    const t = TESTTILFELLER.find((x) => x.id === 'trinnvalg-tilbys')!
    const beregnet = (r: typeof t.regel) => beregnDoseplan(r, t.inndata, syntetiskGrunnlag(t.preparater), OMGIVELSE)
    const r = beregnet(t.regel)
    expect(r.trinnvalg?.map((x) => [x.trinn, x.fra_mg, x.beregnet_mg, x.omrade, x.doser.map((d) => [d.mg, Math.round(d.prosent * 100) / 100, d.krever_begrunnelse])])).toEqual([
      [2, 18.75, 14.06, [5, 50], [[13.75, 26.67, true], [15, 20, false]]],
    ])
    // Den foretrukne reduksjonen står først; en dose som krever begrunnelse, er merket som avvik, ikke som et anbefalt trinn.
    expect(r.merknader.join(' ')).toMatch(
      /Den foretrukne reduksjonen til 14,06 mg \(−25,01 % fra 18,75 mg\) kan ikke gis med preparatene\. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 18,75 mg innenfor valgområdet 5–50 %: 13,75 mg \(−26,67 %, avvik som krever begrunnelse\) eller 15 mg \(−20 %\)\. En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering\. Beregningen velger ikke selv\./,
    )
    // Uten valg per trinn i regelen: ingen doser tilbys, og stoppet sier at en annen dose krever en ny faglig vurdering.
    const uten = structuredClone(t.regel)
    const fase = uten.plan.forlop[0]!.faser[0]!
    if (fase.type === 'nedtrapping') delete fase.trinnvalg
    const u = beregnet(uten)
    expect(u.trinnvalg).toBeUndefined()
    expect(u.merknader.join(' ')).toMatch(/En annen dose, et større avvik eller en annen formulering er et nytt forslag/)
  })

  it('avviser et valg som ikke lenger passer planen eller ikke kan gis, i stedet for å la det stå ubrukt (P7.5, beslutning P7-A)', () => {
    const t = TESTTILFELLER.find((x) => x.id === 'trinnvalg-valgt')!
    const med = (trinnvalg: Doseplaninndata['trinnvalg']) => beregnDoseplan(t.regel, { ...t.inndata, trinnvalg }, syntetiskGrunnlag(t.preparater), OMGIVELSE)
    expect(med(t.inndata.trinnvalg).status).toBe('doseplan')
    // Fra en annen dose (f.eks. etter endret startdose) gjelder valget ikke lenger.
    expect(stopp(med([{ forlop: 'fra', trinn: 2, fra_mg: 20, mg: 15 }]))).toMatch(/Valget 15 mg for trinn 2 \(fra, fra 20 mg\) gjelder ikke lenger: planen har ikke det trinnet fra den dosen.*Fjern valget/)
    // 14,5 mg er innenfor valgområdet (−22,67 %), men kan ikke gis med tablettene.
    expect(stopp(med([{ forlop: 'fra', trinn: 2, fra_mg: 18.75, mg: 14.5 }]))).toMatch(/testoksetin dag 15–28: den valgte dosen 14,5 mg for trinn 2 kan ikke gis med preparatene i FEST for perioden\. Fjern valget, og velg på nytt\./)
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
    expect(PILOTSETT.regler).toHaveLength(5)
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
    // Den går også til null uten individuell avslutning, så den er ugyldig som seponeringsregel uansett godkjenning.
    expect(r.status === 'doseplan' && r.sperre).toEqual(['Regelen er en syntetisk testregel.', expect.stringMatching(/^Regelen er ugyldig: forløp fra slutter ikke med en nedtrapping med individuell avslutning/), expect.stringMatching(/åpne valg/)])
    expect(kliniskSperre(regel, g.utvalg, NAA)).toContain('Preparatene er fra «Syntetiske testdata», ikke fra FEST.')
    const k = kliniskDoseplan(regel, AZA, g, OMGIVELSE)
    expect(k).toMatchObject({ status: 'stoppet', klinisk: false, stoppgrunner: ['Ingen klinisk doseplan kan vises.', 'Regelen er en syntetisk testregel.', expect.anything(), expect.anything(), expect.anything()] })
    for (const t of TESTTILFELLER) expect(kliniskDoseplan(t.regel, t.inndata, syntetiskGrunnlag(t.preparater, t.fest), OMGIVELSE).status, t.id).toBe('stoppet')
  })

  /**
   * Positiv kontroll: en regel som bare finnes i denne testen, med en
   * godkjenning laget her og ikke syntetisk id, så den faktisk kan passere
   * godkjenningssperren. Da er det bare FEST-kopien som avgjør om planen er
   * klinisk. Ingen virkelig regel eller godkjenning endres.
   */
  const positivKontroll = (): Regel => {
    // 30 mg i en uke og så 15 mg til avslutningen er vurdert: som enhver seponeringsregel går den ikke til null (P7.5).
    const regel: Regel = structuredClone({ ...fastDose([30]), id: 'positivkontroll-bare-i-test' })
    regel.plan.forlop[0]!.faser.push({
      type: 'nedtrapping',
      strategi: { type: 'prosent_av_aktuell', prosent: sp(50, 'prosent') },
      trinnlengde: sp(7, 'dager'),
      avslutning: 'individuell',
      horisont: sp(1, 'trinn'),
    })
    const av = { dato: '2026-11-01', av: 'Testkontrollør', rolle: 'uavhengig_kontrollor' as const, regelversjon: 1 }
    const avklar = (x: unknown): void => {
      if (Array.isArray(x)) x.forEach(avklar)
      else if (x && typeof x === 'object') {
        if ((x as { type?: string }).type === 'ousfar_vurdering') (x as { avklaring: unknown }).avklaring = { ...av, merknad: 'Avklart bare for testen.' }
        Object.values(x).forEach(avklar)
      }
    }
    avklar(regel.plan)
    regel.godkjenning = { status: 'klinisk_godkjent', historikk: [{ status: 'klinisk_godkjent', ...av, fingeravtrykk: fingeravtrykk(regel), merknad: 'Positiv kontroll av sperren, bare i testen.' }] }
    return regel
  }
  const klinisk = (fest: Partial<Pick<Legemiddelutvalg, 'kontrollert_kl' | 'kildedato'>>, naa = OMGIVELSE.naa) => {
    const regel = positivKontroll()
    return kliniskDoseplan(regel, AZA, { ...g, utvalg: { ...somFest(g.utvalg), ...fest } }, { ...OMGIVELSE, naa })
  }

  it('den positive kontrollen gir en klinisk plan med fersk FEST, så sperren er det som prøves', () => {
    expect(kliniskSperre(positivKontroll(), somFest(g.utvalg), NAA)).toEqual([])
    expect(klinisk({})).toMatchObject({ status: 'doseplan', klinisk: true, sperre: [] })
    expect(kliniskSperre(positivKontroll(), g.utvalg, NAA)).toEqual(['Preparatene er fra «Syntetiske testdata», ikke fra FEST.'])
  })

  it('krever et gyldig FEST-tidspunkt innenfor 48 timer tilbake og høyst 5 minutter fram', () => {
    const grunner = (kontrollert_kl: string | null, naa?: string) => {
      const r = klinisk({ kontrollert_kl }, naa)
      return r.status === 'stoppet' ? r.stoppgrunner.join(' ') : ''
    }
    // Akkurat 48 timer gammel er fersk; ett minutt til er foreldet.
    expect(klinisk({ kontrollert_kl: '2026-10-30T12:00:00Z' })).toMatchObject({ status: 'doseplan', klinisk: true })
    expect(grunner('2026-10-30T11:59:00Z')).toMatch(/sist kontrollert mot FEST/)
    // Fram i tid: 5 minutter godtas som klokkeavvik, mer ikke.
    expect(klinisk({ kontrollert_kl: '2026-11-01T12:05:00Z' })).toMatchObject({ status: 'doseplan', klinisk: true })
    expect(grunner('2026-11-01T12:06:00Z')).toMatch(/fram i tid; tidsstemplet kan ikke stoles på/)
    expect(grunner('2099-01-01T00:00:00Z')).toMatch(/fram i tid/)
    // Tidssone og brøkdeler av sekunder, slik databasen skriver det.
    expect(klinisk({ kontrollert_kl: '2026-11-01T05:20:00.123456+01:00' })).toMatchObject({ status: 'doseplan', klinisk: true })
    // Ugyldige tidspunkter stopper beregningen helt.
    for (const x of ['not-a-timestamp', '2026-11-01', '2026-11-01T04:20:00', '2026-13-01T04:20:00Z', '2026-11-01T24:00:00Z', '2026-11-01T04:60:00Z', '2026-11-01T04:20:00+25:00', '']) expect(grunner(x), x).toMatch(/ingen vellykket henting|ikke et gyldig tidspunkt/)
    // En dag som ikke finnes i kalenderen, flyttes ikke til neste måned.
    const mars = '2026-03-02T12:00:00Z'
    expect(klinisk({ kontrollert_kl: '2026-03-01T12:00:00Z', kildedato: '2026-02-15' }, mars)).toMatchObject({ status: 'doseplan', klinisk: true })
    for (const x of ['2026-02-30T12:00:00Z', '2026-02-29T12:00:00Z']) {
      const r = klinisk({ kontrollert_kl: x, kildedato: '2026-02-15' }, mars)
      expect(r.status === 'stoppet' && r.stoppgrunner.join(' '), x).toMatch(/ikke et gyldig tidspunkt/)
    }
    expect(klinisk({ kontrollert_kl: '2026-11-31T12:00:00Z' })).toMatchObject({ status: 'stoppet' })
    // 29. februar i et skuddår er gyldig.
    expect(klinisk({ kontrollert_kl: '2028-02-29T12:00:00Z', kildedato: '2028-02-15' }, '2028-03-01T12:00:00Z')).toMatchObject({ status: 'doseplan', klinisk: true })
    expect(grunner(null)).toMatch(/ingen vellykket henting av FEST/)
    expect(beregnDoseplan(positivKontroll(), AZA, { ...g, utvalg: somFest(g.utvalg, 'not-a-timestamp') }, OMGIVELSE)).toMatchObject({ status: 'stoppet' })
    // Et ugyldig tidspunkt for beregningen gir heller ingen klinisk plan.
    expect(kliniskSperre(positivKontroll(), somFest(g.utvalg), new Date('ugyldig'))).toEqual([expect.stringMatching(/alder kan ikke bekreftes/)])
  })

  it('krever en gyldig kildedato som ikke ligger etter kontrollen', () => {
    const grunner = (kildedato: string) => {
      const r = klinisk({ kildedato })
      return r.status === 'stoppet' ? r.stoppgrunner.join(' ') : ''
    }
    expect(klinisk({ kildedato: '2026-11-01' })).toMatchObject({ status: 'doseplan', klinisk: true })
    // Slik FEST-synken lagrer den: dato og klokkeslett uten tidssone. Den beholdes uendret i sporet.
    const r = klinisk({ kildedato: '2026-10-08T03:09:06' })
    expect(r).toMatchObject({ status: 'doseplan', klinisk: true, fest: { kildedato: '2026-10-08T03:09:06' } })
    for (const x of ['2026-10-08T03:09', '2026-10-08T03:09:06.5', '2026-10-08T03:09:06Z']) expect(klinisk({ kildedato: x }), x).toMatchObject({ klinisk: true })
    for (const x of ['2026-02-30T03:09:06', '2026-10-08T25:09:06', '2026-10-08 03:09:06']) expect(grunner(x), x).toMatch(/ikke en gyldig dato/)
    // Ett døgns slingring for tidssonen kontrolltidspunktet er skrevet i.
    expect(klinisk({ kildedato: '2026-11-02' })).toMatchObject({ status: 'doseplan', klinisk: true })
    expect(grunner('2026-11-03')).toMatch(/kildedatoen til FEST-kopien \(03\.11\.2026\) ligger etter tidspunktet den ble kontrollert/i)
    for (const x of ['2026-02-30', '15.10.2026', 'ukjent']) expect(grunner(x), x).toMatch(/ikke en gyldig dato/)
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

})

describe('Depotreglene i pilotsettet med preparatene i FEST (P4.8, beslutning P4-B)', () => {
  const u = JSON.parse(readFileSync(new URL(`../../${FEST_PILOT}`, import.meta.url), 'utf8')) as Festuttrekk
  const grunnlag = { utvalg: u.utvalg, koblinger: festkoblinger(['aripiprazol', 'paliperidon']), overstyringer: KARTLEGGING.festoverstyringer }
  const omgivelse = omgivelseFor(u)
  const regel = (id: string) => PILOTSETT.regler.find((x) => x.id === id)!
  const MAINTENA = regel('depot-aripiprazol-maintena')
  const XEPLION = regel('depot-paliperidon-xeplion')
  const TABLETT_FEST = { legemiddelformer: ['53'] }
  const maintena: Doseplaninndata = { startdose_mg: 15, bekreftet: ['indikasjon'], pasientforhold: { cyp2d6_langsom: false, sterk_cyp_hemmer: false, cyp3a4_induktor: false }, formvalg: { fra: TABLETT_FEST } }
  const xeplion = (startdose_mg: number, x: Partial<Doseplaninndata> = {}): Doseplaninndata => ({ startdose_mg, bekreftet: ['indikasjon'], pasientforhold: { nedsatt_nyrefunksjon: false }, ...x })
  const depotpreparater = (r: Doseplanresultat) =>
    r.status === 'doseplan' ? [...new Set(r.forlop.flatMap((f) => f.injeksjoner.flatMap((i) => i.element.preparater.map((b) => `${b.varenavn} [${b.legemiddelform?.kode}] ${b.registrering}`))))].sort() : []

  it('hver depotregel sier hvilket depotpreparat den gjelder, så motoren aldri velger selv', () => {
    for (const r of [MAINTENA, XEPLION]) expect(r.plan.forlop.filter((f) => f.administrasjon === 'depotinjeksjon').map((f) => f.preparater), r.id).toEqual([[r === MAINTENA ? 'Abilify Maintena' : 'Xeplion']])
    expect(MAINTENA.plan.forlop[1]!.legemiddelformer).toEqual(['819'])
  })

  it('Abilify Maintena: oppstart og etterfølgende injeksjoner med den månedlige presentasjonen, aldri den annenhver måned', () => {
    const r = beregnDoseplan(MAINTENA, maintena, grunnlag, omgivelse)
    expect(planform(r)).toEqual({
      fra: ['dag 1–14: 15 mg = 1 tablett à 15 mg', 'fra dag 15: seponert'],
      til: ['dag 1: 400 mg = 1 injeksjon à 400 mg', 'hver måned fra 1 måned etter dag 1: 400 mg = 1 injeksjon à 400 mg'],
    })
    expect(r.status === 'doseplan' && r.forlop[1]!.injeksjoner.map((i) => [i.mg, i.element.doseenhet, i.vedlikehold?.tidligst_dager ?? null])).toEqual([
      [400, 'injeksjon', null],
      [400, 'injeksjon', 26],
    ])
    expect(depotpreparater(r)).toEqual(['Abilify Maintena [819] registrert'])
    // Presentasjonen til injeksjon annenhver måned (720 og 960 mg) kan ikke velges.
    expect(stopp(beregnDoseplan(MAINTENA, { ...maintena, formvalg: { ...maintena.formvalg, til: { legemiddelformer: ['913'] } } }, grunnlag, omgivelse))).toMatch(
      /Ingen av depotpreparatene \(Abilify Maintena\) av aripiprazol i FEST kan brukes med valgene som er gjort/,
    )
  })

  it('Abilify Maintena: CYP2D6, hemmere og induktorer stopper, også ubesvart', () => {
    expect(stopp(beregnDoseplan(MAINTENA, { ...maintena, pasientforhold: { ...maintena.pasientforhold, cyp2d6_langsom: true } }, grunnlag, omgivelse))).toMatch(/Regelen gjelder ikke: Pasienten er kjent langsom CYP2D6-omsetter/)
    expect(stopp(beregnDoseplan(MAINTENA, { ...maintena, pasientforhold: { cyp2d6_langsom: false } }, grunnlag, omgivelse))).toMatch(/Må avklares før beregning \(ukjent\): Pasienten bruker en sterk CYP2D6- eller CYP3A4-hemmer/)
  })

  it('Xeplion: oppstart i deltoideus, vedlikehold etter omregningen, og deltoideus framhevet etter bytte fra 9–12 mg', () => {
    const fra6 = beregnDoseplan(XEPLION, xeplion(6, { startdato: '2026-11-02' }), grunnlag, omgivelse)
    expect(planform(fra6).til).toEqual([
      'dag 1 [02.11.2026]: 150 mg = 1 injeksjon à 150 mg, deltoideus',
      'dag 8 [09.11.2026]: 100 mg = 1 injeksjon à 100 mg, deltoideus',
      'hver måned fra 1 måned etter dag 8 [09.12.2026]: 75 mg = 1 injeksjon à 75 mg, deltoideus eller setemuskel',
    ])
    // Bare registrerte Xeplion-preparater uten godkjenningsfritak; Trevicta, Palmeux og de andre paliperidondepotene brukes aldri.
    expect(depotpreparater(fra6)).toEqual(['Xeplion [913] registrert'])
    for (const [start, vedlikehold] of [[9, 100], [12, 150]] as const) {
      expect(planform(beregnDoseplan(XEPLION, xeplion(start), grunnlag, omgivelse)).til!.at(-1), `${start} mg`).toBe(
        `hver måned fra 1 måned etter dag 8: ${vedlikehold} mg = 1 injeksjon à ${vedlikehold} mg, deltoideus eller setemuskel; etter bytte fra 9–12 mg kan setemuskelen gi lavere eksponering de første seks månedene, så deltoideus bør vurderes`,
      )
    }
    expect(planform(beregnDoseplan(XEPLION, xeplion(3, { maldose_mg: 50 }), grunnlag, omgivelse)).til!.at(-1)).toBe('hver måned fra 1 måned etter dag 8: 50 mg = 1 injeksjon à 50 mg, deltoideus eller setemuskel')
  })

  it('Xeplion: nedsatt nyrefunksjon stopper, også ubesvart', () => {
    expect(stopp(beregnDoseplan(XEPLION, xeplion(6, { pasientforhold: { nedsatt_nyrefunksjon: true } }), grunnlag, omgivelse))).toMatch(/Regelen gjelder ikke: Pasienten har kreatininclearance under 80 ml\/min/)
    expect(stopp(beregnDoseplan(XEPLION, xeplion(6, { pasientforhold: {} }), grunnlag, omgivelse))).toMatch(/Må avklares før beregning \(ukjent\): Pasienten har kreatininclearance under 80 ml\/min/)
  })

  it('stopper når depotpreparatet med dosen er utgått, og bruker ikke et annet depot i stedet', () => {
    const utgatt = structuredClone(grunnlag)
    const ider = new Set(utgatt.utvalg.merkevarer.filter((m) => m.varenavn === 'Xeplion').map((m) => m.id))
    const styrke75 = byggesteiner(grunnlag, 'paliperidon', omgivelse.idag).filter((b) => b.varenavn === 'Xeplion' && b.mg === 75).map((b) => b.id)
    for (const p of utgatt.utvalg.pakninger) if (p.merkevarer.some((m) => styrke75.includes(m) && ider.has(m))) p.avregistrert_dato = '2026-01-01'
    expect(stopp(beregnDoseplan(XEPLION, xeplion(6), utgatt, omgivelse))).toMatch(/paliperidon \(til\): vedlikeholdet er 75 mg, men FEST har ingen brukbar injeksjon med den styrken \(brukbare styrker: 50, 100, 150 mg\)/)
  })

  it('gir en klinisk plan med de faktiske preparatene når regelen er klinisk godkjent (her bare i testen)', () => {
    for (const [r, inndata] of [
      [MAINTENA, maintena],
      [XEPLION, xeplion(6)],
    ] as const) {
      const res = kliniskDoseplan(godkjennITest(r, r.id), inndata, grunnlag, omgivelse)
      expect(res.status, r.id).toBe('doseplan')
      expect(res.klinisk, r.id).toBe(true)
    }
    // Uten godkjenning sperres planen som før.
    expect(kliniskDoseplan(XEPLION, xeplion(6), grunnlag, omgivelse).status).toBe('stoppet')
  })
})

describe('Kvetiapin i byttet fra olanzapin med preparatene i FEST (P4.8, gjennomgangen av fe08fac)', () => {
  const u = JSON.parse(readFileSync(new URL(`../../${FEST_PILOT}`, import.meta.url), 'utf8')) as Festuttrekk
  const grunnlag = { utvalg: u.utvalg, koblinger: festkoblinger(['olanzapin', 'kvetiapin']), overstyringer: KARTLEGGING.festoverstyringer }
  const omgivelse = omgivelseFor(u)
  const REGEL = PILOTSETT.regler.find((x) => x.id === 'antipsykotikabytte-olanzapin-kvetiapin')!
  const tabletter = (koder: string[]) => ({ klasse: 'peroral' as const, legemiddelformer: koder })
  const inndata = (maldose_mg: number, til?: ReturnType<typeof tabletter>): Doseplaninndata => ({
    startdose_mg: 10,
    maldose_mg,
    bekreftet: REGEL.bekreftelser.map((b) => b.id),
    formvalg: { fra: tabletter(['53']), ...(til && { til }) },
  })
  const kvetiapin = (r: Doseplanresultat) => (r.status === 'doseplan' ? r.forlop.find((f) => f.id === 'til')! : undefined)

  it('regelen er bundet til tabletter med vanlig frisetting og krever to doser hver dag, også ved vedlikehold', () => {
    const til = REGEL.plan.forlop.find((f) => f.id === 'til')!
    expect(til.legemiddelformer).toEqual(['53'])
    expect(til.fordeling).toMatchObject({ antall: [2] })
    expect(til.fordeling!.over_mg).toBeUndefined()
  })

  it('dag 1 er 25 + 25 mg, og hver døgndose etter det er fordelt på to doser med de faktiske tablettene', () => {
    const r = beregnDoseplan(REGEL, inndata(400), grunnlag, omgivelse)
    expect(planform(r).til).toEqual([
      'dag 1: 50 mg = 2 tabletter à 25 mg, fordelt på 2 doser: 25 + 25 mg',
      'dag 2: 100 mg = 4 tabletter à 25 mg, fordelt på 2 doser: 50 + 50 mg',
      'dag 3: 200 mg = 2 tabletter à 100 mg, fordelt på 2 doser: 100 + 100 mg',
      'dag 4: 300 mg = 1 tablett à 100 mg + 1 tablett à 200 mg, fordelt på 2 doser: 200 + 100 mg (ulik fordeling)',
      'fra dag 5: 400 mg = 2 tabletter à 200 mg, fordelt på 2 doser: 200 + 200 mg',
    ])
    const f = kvetiapin(r)!
    expect(f.perioder.map((p) => p.doser)).toEqual([[25, 25], [50, 50], [100, 100], [200, 100], [200, 200]])
    // Bare registrerte tabletter med vanlig frisetting (FEST-form 53), aldri depottabletter eller mikstur.
    const preparater = f.perioder.flatMap((p) => p.elementer.flatMap((e) => e.preparater))
    expect(new Set(preparater.map((b) => `${b.legemiddelform?.kode} ${b.registrering}`))).toEqual(new Set(['53 registrert']))
    expect(preparater.some((b) => b.varenavn === 'Seroquel')).toBe(true)
    expect(f.perioder.flatMap((p) => p.elementer.map((e) => e.mg)).every((mg) => [25, 100, 200, 300].includes(mg))).toBe(true)
    // Vedlikeholdsdosen 300 og 450 mg er også fordelt på to doser.
    expect(planform(beregnDoseplan(REGEL, inndata(300), grunnlag, omgivelse)).til!.at(-1)).toBe(
      'fra dag 4: 300 mg = 1 tablett à 100 mg + 1 tablett à 200 mg, fordelt på 2 doser: 200 + 100 mg (ulik fordeling)',
    )
    expect(planform(beregnDoseplan(REGEL, inndata(450), grunnlag, omgivelse)).til!.at(-1)).toBe(
      'fra dag 5: 450 mg = 2 tabletter à 200 mg + 2 tabletter à 25 mg, fordelt på 2 doser: 225 + 225 mg',
    )
  })

  it('avviser depottabletter og mikstur, også ved eksplisitt formvalg', () => {
    for (const koder of [['25'], ['840'], ['25', '53']]) {
      const r = beregnDoseplan(REGEL, inndata(400, tabletter(koder)), grunnlag, omgivelse)
      if (koder.includes('53')) {
        // Et formvalg som også omfatter depottabletter, gir bare tablettene med vanlig frisetting.
        expect(new Set(kvetiapin(r)!.perioder.flatMap((p) => p.elementer.flatMap((e) => e.preparater.map((b) => b.legemiddelform?.kode)))), koder.join()).toEqual(new Set(['53']))
      } else expect(stopp(r), koder.join()).toMatch(/Ingen av de perorale preparatene av kvetiapin i FEST kan brukes med valgene som er gjort/)
    }
    expect(stopp(beregnDoseplan(REGEL, { ...inndata(400, tabletter(['25'])), godkjenningsfritak: true }, grunnlag, omgivelse))).toMatch(/Ingen av de perorale preparatene av kvetiapin/)
  })

  it('stopper når en døgndose ikke kan fordeles på to doser med preparatene, i stedet for å gi den som én dose', () => {
    const uten25 = structuredClone(grunnlag)
    const styrke25 = byggesteiner(grunnlag, 'kvetiapin', omgivelse.idag).filter((b) => b.legemiddelform?.kode === '53' && b.mg === 25).map((b) => b.id)
    for (const p of uten25.utvalg.pakninger) if (p.merkevarer.some((m) => styrke25.includes(m))) p.avregistrert_dato = '2026-01-01'
    expect(stopp(beregnDoseplan(REGEL, inndata(400), uten25, omgivelse))).toMatch(/kvetiapin dag 1: døgndosen 50 mg skal gis fordelt på 2 doser \(preparatomtalen\), men ingen nøyaktig dose/)
  })
})

describe('Fenelzin etter fluoksetin med preparatene i FEST (P4.8, gjennomgangen av fe08fac)', () => {
  const u = JSON.parse(readFileSync(new URL(`../../${FEST_AKSEPTTEST}`, import.meta.url), 'utf8')) as Festuttrekk
  const grunnlag = { utvalg: u.utvalg, koblinger: festkoblinger(['fluoksetin', 'fenelzin']), overstyringer: KARTLEGGING.festoverstyringer }
  const REGEL = PILOTSETT.regler.find((x) => x.id === 'mao-fluoksetin-fenelzin')!
  const utvasket = (dag: number, dato: string) =>
    `tidligst dag ${dag} [${dato}]: 35 dagers utvasking fullført; fenelzin er ikke startet eller dosert av planen. Klinisk oppstart kan først vurderes etter kontroll av kontraindikasjoner, interaksjoner og øvrige forhold`

  it('viser at utvaskingen er fullført og at fenelzin ikke er startet, aldri en oppstart', () => {
    for (const [startdose_mg, dag, dato] of [
      [20, 64, '04.01.2027'],
      [40, 92, '01.02.2027'],
    ] as const) {
      const r = beregnDoseplan(REGEL, { startdose_mg, startdato: '2026-11-02', bekreftet: REGEL.bekreftelser.map((b) => b.id), formvalg: { fra: { klasse: 'peroral', legemiddelformer: ['53'] } } }, grunnlag, omgivelseFor(u))
      expect(planform(r).til, `${startdose_mg} mg`).toEqual([utvasket(dag, dato)])
      expect(planform(r).til!.join(' ')).not.toMatch(/oppstart, dosering|: oppstart/)
    }
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
