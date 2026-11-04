/**
 * Kasusene for de tre godkjente antipsykotikabyttene fra K3
 * (`ANTIPSYKOTIKAVEDTAK` i `antipsykotikabytter.ts`): syntetiske kasus som
 * går den samme veien som verktøysiden (`kjorKasus`), med reglene slik appen
 * har dem, uten simulert godkjenning, og preparatene i FEST-uttrekket for K3.
 * Testmatrisen (P11) prøver hver godkjent regel også gjennom disse.
 *
 * Kasusene er syntetiske: ingen pasientopplysninger, bare doser og svar valgt
 * for å prøve reglene ved grensene for den godkjente avgrensningen.
 */
import type { Festuttrekk } from './aksepttest'
import { avvikFra, kjorKasus, type Pilotkasus } from './pilotmatrise'

const BYTTE = 'bytte-antipsykotikum'
const TABLETTER = { legemiddelform: '53' }
const peroral = (nokkel: string) => ({ nokkel, formulering: 'standard' as const })
const XEPLION = { fra: peroral('risperidon'), til: { nokkel: 'paliperidon', formulering: 'ER' as const } }
const OLANZAPIN = { fra: peroral('olanzapin'), til: peroral('aripiprazol') }
const RISPERIDON = { fra: peroral('risperidon'), til: peroral('aripiprazol') }
const TIL_ARIPIPRAZOL = { formvalg: { fra: TABLETTER, til: TABLETTER } }

const stopp = (...grunner: string[]) => ({ utfall: 'stopp' as const, grunner })
const kasus = (id: string, kategori: Pilotkasus['kategori'], hva: string, valg: Pilotkasus['valg'], dose: string, forventet: Pilotkasus['forventet'], x: Partial<Pilotkasus> = {}): Pilotkasus => ({
  id,
  kategori,
  hva,
  verktoy: BYTTE,
  valg,
  uttrekk: 'pilot',
  dose,
  forventet,
  ...x,
})

/** Vurderingen før injeksjonene i Xeplion-planen, som den står i kopien. */
const XEPLION_VURDERING =
  'Dag 8 (08.12.2026): Vurdering (Paliperidon): Før endringen: Før injeksjonen dag 8 og før hver månedlige vedlikeholdsinjeksjon: psykotiske symptomer, ekstrapyramidale og andre bivirkninger og reaksjoner etter forrige injeksjon vurderes, og pasienten følges tett gjennom byttet.'
const ARIPIPRAZOL_OKNING = 'Vurdering (Aripiprazol): Før endringen: Før hver økning av aripiprazol: toleransen vurderes (akatisi, uro, aktivering og søvnvansker).'
const reduksjon = (stoff: string, plager: string) =>
  `Vurdering (${stoff}): Før endringen: Før hver reduksjon av ${stoff.toLowerCase()}, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: ${plager}, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet.`
const seponert = (stoff: string, plager: string) => `Vurdering (${stoff}): ${stoff} er seponert: tilstanden vurderes på nytt (forverring av psykosen og seponeringsplager: ${plager}, og akatisi, dystoni og dyskinesi).`
const OLANZAPINPLAGER = 'kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting'
const RISPERIDONPLAGER = 'kvalme, oppkast, svette og søvnløshet'

export const ANTIPSYKOTIKAKASUS: readonly Pilotkasus[] = [
  // --- Xeplion fra peroral risperidon (v8): bare 3 mg risperidon og 75 mg månedlig.
  kasus('K3-01', 'vanlig_dose', 'risperidon 3 mg → Xeplion 75 mg månedlig', XEPLION, '3', {
    utfall: 'plan',
    linjer: [
      'Fra dag 1 (fra 01.12.2026): Risperidon peroralt: Seponert',
      'Dag 1 (01.12.2026): Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus)',
      XEPLION_VURDERING,
      'Dag 8 (08.12.2026): Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus)',
      'Hver måned fra 1 måned etter dag 8 (første 08.01.2027): Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel)',
    ],
  }, { skjema: { maldose: '75', startdato: '2026-12-01' } }),
  kasus('K3-02', 'uvanlig_dose', 'risperidon 4 mg → Xeplion 75 mg: for lav vedlikeholdseksponering, avvist', XEPLION, '4', stopp('Startdosen 4 mg er utenfor det regelen gjelder for (3 mg).'), { skjema: { maldose: '75' } }),
  kasus('K3-03', 'uvanlig_dose', 'risperidon 3 mg → Xeplion 100 mg: en annen vedlikeholdsdose enn 75 mg', XEPLION, '3', stopp('Måldosen 100 mg er utenfor det regelen gjelder for (75 mg).'), { skjema: { maldose: '100' } }),
  kasus('K3-04', 'pasientforhold', 'risperidon 3 mg → Xeplion med overvekt', XEPLION, '3', stopp('Regelen gjelder ikke: Pasienten har overvekt eller fedme'), { skjema: { maldose: '75', pasientforhold: { overvekt: true } } }),
  kasus('K3-05', 'interaksjon', 'risperidon 3 mg → Xeplion med CYP2D6-hemmer', XEPLION, '3', stopp('Regelen gjelder ikke: Pasienten bruker en CYP2D6-hemmer'), { skjema: { maldose: '75', pasientforhold: { risperidon_interaksjon: true } } }),
  kasus('K3-06', 'foreldet_fest', 'risperidon 3 mg → Xeplion med FEST-kopi kontrollert for 49 timer siden', XEPLION, '3', stopp('sist kontrollert mot FEST'), { skjema: { maldose: '75' }, timer: 49 }),

  // --- Olanzapin 20 mg → aripiprazol (v8, TARC 2018).
  kasus('K3-10', 'vanlig_dose', 'olanzapin 20 mg → aripiprazol 15 mg, kryss-titrering til seponert', OLANZAPIN, '20', {
    utfall: 'plan',
    linjer: [
      'Dag 1–7 (01.12.2026–07.12.2026): Olanzapin peroralt: 20 mg = 2 tabletter à 10 mg; Aripiprazol peroralt: 5 mg = 1 tablett à 5 mg',
      `Dag 8 (08.12.2026): ${ARIPIPRAZOL_OKNING}`,
      'Dag 8–14 (08.12.2026–14.12.2026): Olanzapin peroralt: 20 mg = 2 tabletter à 10 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      `Dag 15 (15.12.2026): ${ARIPIPRAZOL_OKNING}`,
      'Dag 15–28 (15.12.2026–28.12.2026): Olanzapin peroralt: 20 mg = 2 tabletter à 10 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      `Dag 29 (29.12.2026): ${reduksjon('Olanzapin', OLANZAPINPLAGER)}`,
      'Dag 29–42 (29.12.2026–11.01.2027): Olanzapin peroralt: 15 mg = 2 tabletter à 7,5 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      `Dag 43 (12.01.2027): ${reduksjon('Olanzapin', OLANZAPINPLAGER)}`,
      'Dag 43–56 (12.01.2027–25.01.2027): Olanzapin peroralt: 10 mg = 1 tablett à 10 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      `Dag 57 (26.01.2027): ${reduksjon('Olanzapin', OLANZAPINPLAGER)}`,
      'Dag 57–70 (26.01.2027–08.02.2027): Olanzapin peroralt: 5 mg = 1 tablett à 5 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      `Dag 71 (09.02.2027): ${reduksjon('Olanzapin', OLANZAPINPLAGER)}`,
      'Fra dag 71 (fra 09.02.2027): Olanzapin peroralt: Seponert; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg',
      `Dag 84 (22.02.2027): ${seponert('Olanzapin', OLANZAPINPLAGER)}`,
    ],
  }, { skjema: { ...TIL_ARIPIPRAZOL, maldose: '15', startdato: '2026-12-01' } }),
  kasus('K3-11', 'uvanlig_dose', 'olanzapin 15 mg → aripiprazol: en annen startdose enn kildens eksempel', OLANZAPIN, '15', stopp('Startdosen 15 mg er utenfor det regelen gjelder for (20 mg).'), { skjema: { ...TIL_ARIPIPRAZOL, maldose: '15' } }),
  kasus('K3-12', 'pasientforhold', 'olanzapin 20 mg → aripiprazol med tidligere seponeringsplager', OLANZAPIN, '20', stopp('Regelen gjelder ikke: Pasienten har tidligere fått seponeringsplager'), { skjema: { ...TIL_ARIPIPRAZOL, maldose: '15', pasientforhold: { seponeringsplager: true } } }),

  // --- Risperidon 4 mg → aripiprazol (v8, TARC 2018).
  kasus('K3-20', 'vanlig_dose', 'risperidon 4 mg → aripiprazol 10 mg, kryss-titrering til seponert', RISPERIDON, '4', {
    utfall: 'plan',
    linjer: [
      'Dag 1–7: Risperidon peroralt: 4 mg = 1 tablett à 4 mg; Aripiprazol peroralt: 5 mg = 1 tablett à 5 mg',
      `Dag 8: ${ARIPIPRAZOL_OKNING}`,
      'Dag 8–28: Risperidon peroralt: 4 mg = 1 tablett à 4 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      `Dag 29: ${reduksjon('Risperidon', RISPERIDONPLAGER)}`,
      'Dag 29–42: Risperidon peroralt: 3 mg = 1 tablett à 3 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      `Dag 43: ${reduksjon('Risperidon', RISPERIDONPLAGER)}`,
      'Dag 43–56: Risperidon peroralt: 2 mg = 1 tablett à 2 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      `Dag 57: ${reduksjon('Risperidon', RISPERIDONPLAGER)}`,
      'Dag 57–70: Risperidon peroralt: 1 mg = 1 tablett à 1 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      `Dag 71: ${reduksjon('Risperidon', RISPERIDONPLAGER)}`,
      'Fra dag 71: Risperidon peroralt: Seponert; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg',
      `Dag 84: ${seponert('Risperidon', RISPERIDONPLAGER)}`,
    ],
  }, { skjema: { ...TIL_ARIPIPRAZOL, maldose: '10' } }),
  kasus('K3-21', 'uvanlig_dose', 'risperidon 6 mg → aripiprazol: en annen startdose enn kildens eksempel', RISPERIDON, '6', stopp('Startdosen 6 mg er utenfor det regelen gjelder for (4 mg).'), { skjema: { ...TIL_ARIPIPRAZOL, maldose: '10' } }),
  kasus('K3-22', 'pasientforhold', 'risperidon 4 mg → aripiprazol med tidligere seponeringsplager', RISPERIDON, '4', stopp('Regelen gjelder ikke: Pasienten har tidligere fått seponeringsplager'), { skjema: { ...TIL_ARIPIPRAZOL, maldose: '10', pasientforhold: { seponeringsplager: true } } }),
]

/** Utfallet av hvert kasus med FEST-uttrekket for K3, og hvorfor det avviker fra forventningen (tom når det ikke gjør det). */
export function kjorAntipsykotikakasus(u: Festuttrekk, aksept: Festuttrekk) {
  return ANTIPSYKOTIKAKASUS.map((k) => {
    const res = kjorKasus(k, { pilot: u, aksept })
    return { k, res, avvik: avvikFra(k, res) }
  })
}
