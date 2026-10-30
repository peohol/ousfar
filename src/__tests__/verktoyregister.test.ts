/**
 * Verktøyregisteret, adressene, søket, regelstatusen og doseplanen slik
 * verktøysidene får den (P6 i `docs/verktøy-utviklingsplan.md`).
 *
 * Med pilotreglene og nedtrappingsreglene (P7), som ingen er klinisk godkjent, kan ingenting beregnes. De
 * positive visningene bruker de isolerte testdataene i `hjelp/verktoyplan.ts`.
 */
import { describe, expect, it } from 'vitest'
import { adresse, lesRute, sidesti, verktoyadresse } from '../domain/rute'
import { beregnPlan, festIderFor, formvalgFor, gjelderFortsatt, inndataFor, lesDose, mangler, medRegel, osloDato, skjemaFor, TOMT_SKJEMA, valgidentitet } from '../verktoy/doseplan'
import { planTekst, planvisning } from '../verktoy/planvisning'
import { finnVirkestoff, KARTLEGGING, sokVerktoy, VERKTOY, verktoyFor, virkestoffvalg } from '../verktoy/register'
import { NEDTRAPPINGSSETT } from '../verktoy/regler/nedtrapping'
import { PILOTSETT } from '../verktoy/regler/pilotsett'
import { REGELSETT, regeloversikt, reglerFor, tilgjengelighet, type Verktoyvalg } from '../verktoy/tilgjengelighet'
import { godkjennITest, TEST_DEPOT, TEST_KRYSS, TEST_NEDTRAPPING, TESTKLOKKE, testFest, testsett } from './hjelp/verktoyplan'

const [TRAPPE_NED, BYTTE_AD, BYTTE_AP] = VERKTOY.map((v) => v)
const v = (nokkel: string, formulering: 'standard' | 'LA' | 'ER' | 'MA' = 'standard') => ({ nokkel, formulering })
const NAA = TESTKLOKKE()

describe('Verktøyregisteret', () => {
  it('har de tre verktøyene med stabile ID-er, norske navn, aliaser og adresser', () => {
    expect(VERKTOY.map((x) => [x.id, x.navn, x.type, x.tabell])).toEqual([
      ['trappe-ned-antidepressiv', 'Trappe ned antidepressiv', 'seponering', 'SwitchAntidepressants'],
      ['bytte-antidepressiv', 'Bytte antidepressiv', 'bytte', 'SwitchAntidepressants'],
      ['bytte-antipsykotikum', 'Bytte antipsykotikum', 'bytte', 'SwitchAntipsychotics'],
    ])
    expect(new Set(VERKTOY.map((x) => x.id)).size).toBe(VERKTOY.length)
    for (const x of VERKTOY) {
      expect(x.aliaser.length).toBeGreaterThan(0)
      expect(verktoyFor(x.id)).toBe(x)
      expect(lesRute(verktoyadresse(x.id))).toEqual({ side: 'verktoy', verktoy: x.id })
    }
    expect(verktoyFor('finnes-ikke')).toBeUndefined()
  })

  it('har bare virkestoffer som valg: gruppene løses opp, og johannesurt er aldri med', () => {
    for (const x of VERKTOY) {
      const valg = virkestoffvalg(x)
      const tekster = valg.flatMap((s) => [s.nokkel, s.navn, ...s.aliaser]).join(' ').toLowerCase()
      expect(tekster).not.toMatch(/johannesurt|hypericum|perikum|john.?s wort/)
      expect(tekster).not.toMatch(/rest ap|partial agonist|partiell/)
      for (const g of KARTLEGGING.grupper) expect(valg.map((s) => s.nokkel)).not.toContain(g.id)
      expect(new Set(valg.map((s) => s.nokkel)).size).toBe(valg.length)
    }
    const ad = virkestoffvalg(TRAPPE_NED!)
    expect(ad).toHaveLength(23)
    expect(ad.every((s) => s.formuleringer.join() === 'standard')).toBe(true)
    const ap = virkestoffvalg(BYTTE_AP!)
    // Medlemmene i Rest AP og Partial agonist er egne valg.
    expect(ap.map((s) => s.nokkel)).toEqual(expect.arrayContaining(['zuklopentiksol', 'klorprotiksen', 'brekspiprazol', 'kariprazin', 'aripiprazol']))
    // Formuleringene fra kilden: aripiprazol peroralt (gruppen) og som depot.
    expect(ap.find((s) => s.nokkel === 'aripiprazol')!.formuleringer).toEqual(['standard', 'LA'])
    expect(ap.find((s) => s.nokkel === 'paliperidon')!.formuleringer).toEqual(['standard', 'ER'])
    expect(ap.find((s) => s.nokkel === 'zuklopentiksol')!.formuleringer).toEqual(['standard', 'LA', 'MA'])
  })

  it('finner et virkestoff etter navn, nøkkel eller alias, men ikke en gruppe eller johannesurt', () => {
    const ad = virkestoffvalg(TRAPPE_NED!)
    expect(finnVirkestoff(ad, 'Escitalopram')?.nokkel).toBe('escitalopram')
    expect(finnVirkestoff(ad, '  ESCITALOPRAM ')?.nokkel).toBe('escitalopram')
    expect(finnVirkestoff(ad, 'escitalopram')?.nokkel).toBe('escitalopram')
    expect(finnVirkestoff(ad, 'Johannesurt')).toBeUndefined()
    expect(finnVirkestoff(ad, 'Hypericum')).toBeUndefined()
    expect(finnVirkestoff(virkestoffvalg(BYTTE_AP!), 'Rest AP')).toBeUndefined()
    expect(finnVirkestoff(ad, '')).toBeUndefined()
  })
})

describe('Adressene', () => {
  it('leser, skriver og navngir oversikten og hvert verktøy', () => {
    expect(lesRute('#/verktoy')).toEqual({ side: 'verktoy' })
    expect(lesRute('#/verktoy/')).toEqual({ side: 'verktoy' })
    expect(lesRute('#/verktoy/Bytte-Antidepressiv')).toEqual({ side: 'verktoy', verktoy: 'bytte-antidepressiv' })
    expect(adresse({ side: 'verktoy' })).toBe('#/verktoy')
    expect(adresse({ side: 'verktoy', verktoy: 'bytte-antidepressiv' })).toBe('#/verktoy/bytte-antidepressiv')
    expect(sidesti({ side: 'verktoy' })).toBe('verktoy')
    expect(sidesti({ side: 'verktoy', verktoy: 'bytte-antidepressiv' })).toBe('verktoy/bytte-antidepressiv')
    // En adresse som ikke kan være et verktøy, er fortolkningen, som andre ukjente adresser.
    expect(lesRute('#/verktoy/a/b')).toEqual({ side: 'fortolkning' })
    expect(lesRute('#/verktoyx')).toEqual({ side: 'fortolkning' })
  })
})

describe('Søket etter verktøy', () => {
  const ider = (q: string) => sokVerktoy(q).map((t) => t.verktoy.id)

  it('finner verktøyene på navn og aliaser, og bare på begynnelsen av ord', () => {
    expect(ider('bytte')).toEqual(['bytte-antidepressiv', 'bytte-antipsykotikum'])
    expect(ider('trappe ned')).toEqual(['trappe-ned-antidepressiv'])
    expect(ider('antidep')).toEqual(['trappe-ned-antidepressiv', 'bytte-antidepressiv'])
    expect(ider('Antipsykotikum')).toEqual(['bytte-antipsykotikum'])
    expect(ider('nedtrapping')).toEqual(['trappe-ned-antidepressiv'])
    expect(sokVerktoy('nedtrapping')[0]).toMatchObject({ alias: 'nedtrapping' })
    expect(ider('depot')).toEqual(['bytte-antipsykotikum'])
    expect(ider('kryssnedtrapping')).toEqual(['bytte-antidepressiv', 'bytte-antipsykotikum'])
    // Midt i et ord, et stoffnavn eller et tomt søk gir ingen verktøy.
    expect(ider('pressiv')).toEqual([])
    expect(ider('sertralin')).toEqual([])
    expect(ider('  ')).toEqual([])
  })
})

describe('Regelstatusen', () => {
  it('sier at faglig kontroll gjenstår for alle reglene i pilotsettet og P7, som ingen er godkjent', () => {
    const tilfeller: [typeof TRAPPE_NED, Verktoyvalg, string[]][] = [
      // Den hyperbolske pilotregelen står ved siden av P7-regelen; klinikeren velger strategi.
      [TRAPPE_NED, { fra: v('citalopram') }, ['seponering-citalopram-hyperbolsk', 'seponering-citalopram']],
      [BYTTE_AD, { fra: v('sertralin'), til: v('mirtazapin') }, ['kryssnedtrapping-sertralin-mirtazapin']],
      [BYTTE_AD, { fra: v('fluoksetin'), til: v('fenelzin') }, ['mao-fluoksetin-fenelzin']],
      [BYTTE_AP, { fra: v('olanzapin'), til: v('kvetiapin') }, ['antipsykotikabytte-olanzapin-kvetiapin']],
      [BYTTE_AP, { fra: v('zuklopentiksol'), til: v('aripiprazol') }, ['gruppe-rest-ap-aripiprazol']],
      [BYTTE_AP, { fra: v('aripiprazol'), til: v('aripiprazol', 'LA') }, ['depot-aripiprazol-maintena']],
      [BYTTE_AP, { fra: v('paliperidon'), til: v('paliperidon', 'ER') }, ['depot-paliperidon-xeplion']],
      ...NEDTRAPPINGSSETT.regler
        .filter((r) => r.id !== 'seponering-citalopram')
        .map((r): [typeof TRAPPE_NED, Verktoyvalg, string[]] => [TRAPPE_NED, { fra: v(r.fra.type === 'virkestoff' ? r.fra.nokkel : '') }, [r.id]]),
    ]
    for (const [verktoy, valg, regler] of tilfeller) {
      const t = tilgjengelighet(verktoy!, valg)
      expect(t.status, regler[0]).toBe('til_kontroll')
      expect(t.regler.map((r) => r.id)).toEqual(regler)
      expect(t.grunner.join(' ')).toMatch(/faglig kontroll/)
    }
    expect(new Set(tilfeller.flatMap(([, , r]) => r))).toEqual(new Set(REGELSETT.regler.map((r) => r.id)))
    expect(REGELSETT.regler).toHaveLength(PILOTSETT.regler.length + NEDTRAPPINGSSETT.regler.length)
    for (const x of VERKTOY) expect(regeloversikt(x).tilgjengelige).toBe(0)
    expect(VERKTOY.map((x) => regeloversikt(x).tilKontroll)).toEqual([1 + NEDTRAPPINGSSETT.regler.length, 2, 4])
  })

  it('forklarer hvorfor et antidepressivum uten regel ikke kan trappes ned, med dekningen fra P7', () => {
    expect(tilgjengelighet(TRAPPE_NED!, { fra: v('dosulepin') })).toEqual({ status: 'ikke_stottet', regler: [], grunner: ['Dosulepin har ingen preparater i FEST. OUSFAR har derfor ingen regel for dosulepin.'] })
    expect(tilgjengelighet(TRAPPE_NED!, { fra: v('fenelzin') }).grunner.join(' ')).toMatch(/godkjenningsfritak.*Stop-oppføring er ikke tilgjengelig/)
    // Dekningen gjelder seponeringen; et bytte uten regel får den vanlige teksten.
    expect(tilgjengelighet(BYTTE_AD!, { fra: v('dosulepin'), til: v('sertralin') }).grunner).toEqual(['OUSFAR har ingen regel for denne kombinasjonen.'])
  })

  it('skiller retning, formulering og verktøy: ingen regel gjelder baklengs, med feil formulering eller i feil verktøy', () => {
    expect(tilgjengelighet(BYTTE_AD!, { fra: v('mirtazapin'), til: v('sertralin') }).status).toBe('ikke_stottet')
    // Peroral aripiprazol til peroral aripiprazol er det samme legemidlet.
    expect(tilgjengelighet(BYTTE_AP!, { fra: v('aripiprazol'), til: v('aripiprazol') })).toMatchObject({ status: 'ikke_stottet', grunner: [expect.stringMatching(/samme legemidlet/)] })
    // Depotregelen gjelder fra peroral, ikke fra depot.
    expect(tilgjengelighet(BYTTE_AP!, { fra: v('aripiprazol', 'LA'), til: v('aripiprazol', 'LA') }).status).toBe('ikke_stottet')
    expect(tilgjengelighet(BYTTE_AP!, { fra: v('zuklopentiksol', 'MA'), til: v('aripiprazol') })).toMatchObject({ status: 'ikke_stottet', grunner: [expect.stringMatching(/middels langtidsvirkende/)] })
    // Seponeringsregelen er ikke et bytte, og byttet er ikke en seponering.
    expect(reglerFor(BYTTE_AD!, { fra: v('escitalopram'), til: v('sertralin') })).toEqual([])
    expect(reglerFor(TRAPPE_NED!, { fra: v('sertralin') }).map((r) => r.id)).toEqual(['seponering-sertralin'])
    expect(reglerFor(BYTTE_AD!, { fra: v('sertralin'), til: v('escitalopram') })).toEqual([])
    expect(tilgjengelighet(TRAPPE_NED!, { fra: v('maprotilin') })).toMatchObject({ status: 'ikke_stottet', grunner: [expect.stringMatching(/ingen regel/)] })
  })

  it('er tilgjengelig bare med en gyldig godkjent regel, og ikke når regelen er endret etter godkjenningen', () => {
    expect(tilgjengelighet(TRAPPE_NED!, { fra: v('escitalopram') }, testsett(TEST_NEDTRAPPING))).toMatchObject({ status: 'tilgjengelig', regler: [TEST_NEDTRAPPING] })
    const endret = structuredClone(TEST_NEDTRAPPING)
    endret.tittel = 'Endret etter godkjenningen'
    expect(tilgjengelighet(TRAPPE_NED!, { fra: v('escitalopram') }, testsett(endret)).status).toBe('til_kontroll')
    expect(regeloversikt(TRAPPE_NED!, testsett(TEST_NEDTRAPPING))).toEqual({ tilgjengelige: 1, tilKontroll: 1 })
  })

  it('viser bare fagtekst for en godkjent regel uten beregning', () => {
    const tekst = structuredClone(TEST_NEDTRAPPING)
    tekst.beregnbarhet = 'bare_tekstlig'
    const r = godkjennITest(tekst, 'test-fagtekst')
    expect(tilgjengelighet(TRAPPE_NED!, { fra: v('escitalopram') }, testsett(r))).toMatchObject({ status: 'fagtekst', regler: [r] })
    // Oversikten sier det samme: en godkjent regel uten beregning kan ikke beregnes, og venter ikke på kontroll.
    expect(regeloversikt(TRAPPE_NED!, testsett(r))).toEqual({ tilgjengelige: 0, tilKontroll: 1 })
  })
})

describe('Doseplanen i verktøyene', () => {
  const valg: Verktoyvalg = { fra: v('escitalopram') }
  // Testoksetin finnes i flere formuleringer og former i FEST; tablettene er valgt, slik skjemaet ber om.
  const skjema = { ...TOMT_SKJEMA, startdose: '20', formvalg: { fra: { klasse: 'peroral', legemiddelform: 'SYN-TAB' } } }

  it('beholder utfyllingen bare så lenge virkestoffene, formuleringene og strategien er de samme', () => {
    const id = valgidentitet(valg)
    const utfylt = { ...skjema, gjelder: id, regel: 'a', maldose: '5', startdato: '2026-11-02', bekreftet: ['x'], pasientforhold: { u: true }, godkjenningsfritak: true }
    expect(skjemaFor(utfylt, id)).toBe(utfylt)
    expect(valgidentitet({ fra: v('escitalopram') })).toBe(id)
    for (const annen of [{ fra: v('citalopram') }, { fra: v('escitalopram'), til: v('mirtazapin') }, { fra: v('escitalopram', 'LA') }]) {
      const ny = valgidentitet(annen)
      expect(ny).not.toBe(id)
      expect(skjemaFor(utfylt, ny)).toEqual({ ...TOMT_SKJEMA, gjelder: ny })
    }
    expect(medRegel(utfylt, 'a')).toBe(utfylt)
    // Ny strategi: bekreftelser, unntak, måldose, formvalg og fritak gjaldt den gamle; dose og startdato følger pasienten.
    expect(medRegel(utfylt, 'b')).toEqual({ ...TOMT_SKJEMA, gjelder: id, regel: 'b', startdose: '20', startdato: '2026-11-02' })
  })

  it('leser doser med komma og punktum, og krever måldose bare når regelen har den', () => {
    expect([lesDose('12,5'), lesDose('12.5'), lesDose('0'), lesDose('-1'), lesDose('1e3'), lesDose(''), lesDose('abc')]).toEqual([12.5, 12.5, undefined, undefined, undefined, undefined, undefined])
    expect(mangler(TEST_NEDTRAPPING, TOMT_SKJEMA)).toEqual(['Aktuell døgndose må fylles inn som et tall større enn 0.'])
    expect(mangler(TEST_KRYSS, { ...TOMT_SKJEMA, startdose: '20' })).toEqual(['Måldosen må fylles inn som et tall større enn 0.'])
    expect(inndataFor(TEST_NEDTRAPPING, valg, { ...skjema, maldose: '30' })).not.toHaveProperty('maldose_mg')
    // Ingen skjult måldose: uten noe skrevet inn er det ingen måldose.
    expect(inndataFor(TEST_KRYSS, { fra: v('escitalopram'), til: v('mirtazapin') }, skjema)).not.toHaveProperty('maldose_mg')
  })

  it('gir aldri en plan etter pilotreglene, selv med fersk FEST', () => {
    for (const r of PILOTSETT.regler) {
      const res = beregnPlan(r, { fra: v('escitalopram') }, skjema, testFest(), NAA)
      expect(res.status, r.id).toBe('stoppet')
      expect(planvisning(res, r)).toBeNull()
    }
  })

  it('gir en klinisk plan med en regel godkjent i testen og fersk FEST, med dager, datoer, styrker og deling', () => {
    expect(festIderFor(TEST_NEDTRAPPING, valg)).toEqual(KARTLEGGING.virkestoffer.find((x) => x.nokkel === 'escitalopram')!.fest)
    const r = beregnPlan(TEST_NEDTRAPPING, valg, { ...skjema, startdose: '25', startdato: '2026-11-02' }, testFest(), NAA)
    expect(r).toMatchObject({ status: 'doseplan', klinisk: true, sperre: [] })
    expect(gjelderFortsatt(r, NAA)).toBe(true)
    const p = planvisning(r, TEST_NEDTRAPPING, '2026-11-02')!
    expect(p.kolonner).toEqual([{ navn: 'Escitalopram', administrasjon: 'peroralt' }])
    expect(p.rader[0]).toMatchObject({ type: 'periode', dager: 'Dag 1–14', datoer: '02.11.2026–15.11.2026', celler: [{ dose: '12,5 mg', elementer: ['1 tablett à 10 mg', '½ tablett à 5 mg'] }] })
    // Planen går ikke til null: siste dose fortsetter til avslutningen er vurdert.
    expect(p.rader.at(-1)).toEqual({ type: 'periode', dager: 'Fra dag 15', datoer: 'fra 16.11.2026', celler: [{ dose: '6,25 mg', elementer: ['1¼ tabletter à 5 mg'] }] })
    expect(p.rader).toHaveLength(2)
    expect(p.versjoner).toEqual([
      expect.stringMatching(/^Regel test-nedtrapping, versjon 1, fingeravtrykk [0-9a-f]{12}$/),
      expect.stringMatching(/^Regelsett /),
      expect.stringMatching(/^Regelmodell \d+, beregningsmotor \d+, doseplanmotor \d+$/),
      'FEST-uttrekk 2026-10-15, kontrollert 2026-11-01T04:20:00Z, preparatstatus per 01.11.2026',
      expect.stringMatching(/^Preparatgrunnlag [0-9a-f]{12}$/),
    ])
    expect(p.advarsler.join(' ')).toMatch(/klinisk godkjent regelversjon/)
    const tekst = planTekst(p, 'Trappe ned antidepressiv')
    expect(tekst).toMatch(/^Trappe ned antidepressiv\n/)
    expect(tekst).toMatch(/Dag 1–14 \(02\.11\.2026–15\.11\.2026\): Escitalopram peroralt: 12,5 mg = 1 tablett à 10 mg \+ ½ tablett à 5 mg/)
    expect(tekst).toMatch(/Versjoner:/)
  })

  it('viser depotinjeksjonene som egne hendelser', () => {
    const r = beregnPlan(TEST_DEPOT, { fra: v('paliperidon'), til: v('paliperidon', 'ER') }, { ...TOMT_SKJEMA, startdose: '6', pasientforhold: { testunntak: false } }, testFest(), NAA)
    expect(r).toMatchObject({ status: 'doseplan', klinisk: true })
    const p = planvisning(r, TEST_DEPOT)!
    const injeksjoner = p.rader.filter((x) => x.type === 'injeksjon')
    expect(injeksjoner.map((x) => x.type === 'injeksjon' && [x.dager, x.dose, x.kolonne])).toEqual([
      ['Dag 1', '150 mg', 1],
      ['Dag 8', '100 mg', 1],
      ['Hver måned fra 1 måned etter dag 8', '100 mg', 1],
    ])
    expect(planTekst(p, 'Bytte antipsykotikum')).toMatch(/Dag 8: Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg \(±4 dager\)/)
  })

  it('stopper uten svar på et unntak, og når FEST er foreldet, mangler eller ikke er FEST', () => {
    const depot = { fra: v('paliperidon'), til: v('paliperidon', 'ER') }
    expect(beregnPlan(TEST_DEPOT, depot, { ...TOMT_SKJEMA, startdose: '6' }, testFest(), NAA).status).toBe('stoppet')
    const grunner = (utvalg: ReturnType<typeof testFest>) => {
      const r = beregnPlan(TEST_NEDTRAPPING, valg, skjema, utvalg, NAA)
      return r.status === 'stoppet' ? r.stoppgrunner.join(' ') : ''
    }
    expect(grunner(testFest('2026-10-29T12:00:00Z'))).toMatch(/sist kontrollert mot FEST/)
    expect(grunner(testFest(null))).toMatch(/ingen vellykket henting/)
    expect(grunner(testFest('ugyldig'))).toMatch(/ikke et gyldig tidspunkt/)
    expect(grunner({ ...testFest(), kilde: 'Syntetiske testdata' })).toMatch(/ikke fra FEST/)
  })

  it('lar en plan som er vist, slutte å gjelde når FEST blir foreldet eller dagen skifter', () => {
    const r = beregnPlan(TEST_NEDTRAPPING, valg, skjema, testFest(), NAA)
    expect(gjelderFortsatt(r, new Date('2026-11-01T22:00:00Z'))).toBe(true)
    // Midnatt i Norge er en ny dag for preparatstatusen.
    expect(osloDato(new Date('2026-11-01T23:30:00Z'))).toBe('2026-11-02')
    expect(gjelderFortsatt(r, new Date('2026-11-01T23:30:00Z'))).toBe(false)
    expect(gjelderFortsatt(r, new Date('2026-11-03T04:21:00Z'))).toBe(false)
  })

  it('ber om formuleringen og formen når FEST har flere, og velger dem ikke selv', () => {
    const uten = { ...skjema, formvalg: {} }
    const alt = formvalgFor(TEST_NEDTRAPPING, valg, uten, testFest(), NAA)
    expect(alt.fra?.klasser.map((k) => k.kode)).toEqual(['peroral', 'peroral_modifisert'])
    const r = beregnPlan(TEST_NEDTRAPPING, valg, uten, testFest(), NAA)
    expect(r.status === 'stoppet' && r.stoppgrunner.join(' ')).toMatch(/formuleringen må velges/)
    // Med formuleringen valgt gjenstår formen, med alternativene innenfor formuleringen.
    const peroral = { ...skjema, formvalg: { fra: { klasse: 'peroral' } } }
    const former = formvalgFor(TEST_NEDTRAPPING, valg, peroral, testFest(), NAA).fra!
    expect(former.legemiddelformer.map((f) => f.kode)).toContain('SYN-TAB')
    expect(former.legemiddelformer.map((f) => f.kode)).not.toContain('SYN-DEPTAB')
    expect(beregnPlan(TEST_NEDTRAPPING, valg, peroral, testFest(), NAA).status).toBe('stoppet')
    // Alternativene står fortsatt etter valget, så det kan endres; valget i skjemaet er blant dem.
    const valgt = formvalgFor(TEST_NEDTRAPPING, valg, skjema, testFest(), NAA).fra!
    expect(valgt.legemiddelformer.map((f) => f.kode)).toContain(skjema.formvalg.fra.legemiddelform)
  })
})
