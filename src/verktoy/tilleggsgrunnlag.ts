/**
 * Kontrollgrunnlaget for tilleggsreglene i K4 (`regler/tillegg.ts`,
 * `docs/verktøy-klinisk-leveranseplan-2026-11.md`): syntetiske kasus som går
 * den samme veien som verktøysiden (`kjorKasus`), med preparatene i det
 * lagrede FEST-uttrekket `src/data/verktoy/fest-tillegg.json`, og hele
 * planteksten slik kopien ville vist den.
 *
 * Begge reglene er klinisk godkjent av en uavhengig kontrollør for nøyaktig
 * sin versjon og sitt fingeravtrykk (`TILLEGGSVEDTAK`), så kasusene bruker de
 * godkjente reglene slik appen har dem, uten simulering. Bare kasusene som
 * endrer en kopi av regelen (en endret regel, en annen måldose), sier det.
 *
 * Kasusene er syntetiske: ingen pasientopplysninger, bare doser og svar valgt
 * for å prøve reglene, også ved grensene. Rapporten skrives med
 * `npm run verktoy:regler -- tilleggsgrunnlag`, og testene sier fra når den
 * ikke er oppdatert.
 */
import { KOMPLETT } from './planvisning'
import type { Festuttrekk } from './regler/aksepttest'
import { fingeravtrykk } from './regler/godkjenning'
import type { Regel } from './regler/modell'
import {
  avvikFra,
  bareFritak,
  kjorKasus,
  KATEGORIER,
  midlertidigUtgatt,
  type Kontrollregel,
  type Pilotkasus,
  type Pilotutfall,
  simulerGodkjenning,
  type Festendring,
  type Uttrekkene,
} from './regler/pilotmatrise'
import { liste, tabell } from './regler/rapport'
import { LITIUM_LAMOTRIGIN, TILLEGGSSETT, VALPROAT_LAMOTRIGIN } from './regler/tillegg'
import type { Verktoysperre } from './sperrer'

export const TILLEGGSGRUNNLAGFIL = 'docs/verktøy-k4-kontrollgrunnlag.md'
export const FEST_TILLEGG = 'src/data/verktoy/fest-tillegg.json'

/** Virkestoffene uttrekket `FEST_TILLEGG` har: lamotrigin og de eksisterende legemidlene i reglene. */
export const TILLEGGSSTOFFER: readonly string[] = [...new Set(TILLEGGSSETT.regler.flatMap((r) => r.plan.forlop.flatMap((f) => (f.virkestoff.type === 'virkestoff' ? [f.virkestoff.nokkel] : []))))]

const VERKTOY = 'kombinere-stemningsstabiliserende'
const DATO = '2026-11-03'
const STARTDATO = '2026-11-09'

/** Versjonen og fingeravtrykket kontrolløren bes vurdere. */
export const kontrollregel = (r: Regel): Kontrollregel => ({ id: r.id, versjon: r.versjon, fingeravtrykk: fingeravtrykk(r) })

/** Den godkjente regelen slik appen har den, eventuelt endret på en kopi som aldri går til appen. */
const regelen = (r: Regel, etter?: { hva: string; endre: (x: Regel) => void }): NonNullable<Pilotkasus['regel']> => ({ id: r.id, ...(etter && { endre: etter }) })

const peroral = (nokkel: string) => ({ nokkel, formulering: 'standard' as const })
const valgFor = (fra: string) => ({ fra: peroral(fra), til: peroral('lamotrigin') })

export interface Tilleggskasus extends Pilotkasus {
  /** Regelen kasuset prøver, til grupperingen i rapporten; `null` når valget ikke har noen regel. */
  gjelder: string | null
}

const kasus = (
  id: string,
  gjelder: Regel | null,
  fra: string,
  kategori: Pilotkasus['kategori'],
  hva: string,
  dose: string,
  forventet: Pilotkasus['forventet'],
  x: Partial<Pilotkasus> = {},
): Tilleggskasus => ({
  id,
  gjelder: gjelder?.id ?? null,
  kategori,
  hva,
  verktoy: VERKTOY,
  valg: valgFor(fra),
  uttrekk: 'pilot',
  dose,
  ...x,
  skjema: { startdato: STARTDATO, ...(gjelder ? { maldose: String(maldoseFor(gjelder)) } : {}), ...x.skjema },
  forventet,
})

/** Den første stabiliserende måldosen regelen gjelder for: forskriveren velger den, og kasusene gjør det med mindre de prøver noe annet. */
const maldoseFor = (r: Regel) => r.inndata.find((k) => k.navn === 'maldose')?.verdier?.[0] ?? ''

/** Kopien med en annen måldose regelen gjelder for. */
const medMaldose = (x: Regel, mg: number) => {
  const krav = x.inndata.find((k) => k.navn === 'maldose')
  if (!krav) throw new Error(`${x.id}: regelen har ikke noe krav til måldosen`)
  krav.verdier = [mg]
}

const sperre = (omfang: Verktoysperre['omfang'], mal: string | null): Verktoysperre => ({ id: `sperre-${mal ?? 'alle'}`, omfang, mal, grunn: 'Syntetisk nødstopp i kontrollgrunnlaget.', satt_kl: '2026-11-03T12:00:00Z', satt_av: null })

const UNNTAK = 'Regelen gjelder ikke'
const LITIUMDOSE = 'er utenfor det regelen gjelder for (42, 84, 126, 168, 210, 252, 294, 336, 378, 420 mg)'

/**
 * De to pakningene i FEST med navnet «Lamictal tyggetab/disperg tab 25 mg»:
 * den ordinære, markedsførte som planen bruker, og en fritakspakning som er
 * midlertidig utgått (kontrollørens gjennomgang av 4e0e650).
 */
export const LAMICTAL_25 = { ordinaer: '196808', fritak: '279054' } as const

/** Pakningen med varenummeret er midlertidig utgått fra i dag. */
const pakningUtgatt = (varenr: string): Festendring => ({
  hva: `pakningen med varenr. ${varenr} midlertidig utgått`,
  endre: (u, idag) => {
    const p = u.pakninger.find((x) => x.varenr === varenr)
    if (!p) throw new Error(`FEST-uttrekket har ingen pakning med varenr. ${varenr}`)
    p.midlertidig_utgatt_dato = idag
  },
})

const V = VALPROAT_LAMOTRIGIN
const L = LITIUM_LAMOTRIGIN

/**
 * Radene i planen for lamotrigin lagt til valproat 1000 mg og til litium
 * 168 mg, med startdato 09.11.2026, slik tabellen og kopien viser dem.
 * Kontrollert for hånd mot tabell 3 i preparatomtalen; testene sier fra når
 * beregningen gir noe annet.
 */
export const PLAN_VALPROAT: readonly string[] = [
  'Dag 1–14 (09.11.2026–22.11.2026): Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke; Lamotrigin peroralt: 25 mg annenhver dag = 1 tablett à 25 mg',
  'Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen, punkt 1: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Punkt 2: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
  'Dag 15–28 (23.11.2026–06.12.2026): Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg',
  'Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen, punkt 1: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Punkt 2: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
  'Dag 29–35 (07.12.2026–13.12.2026): Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg',
  'Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen, punkt 1: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Punkt 2: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
  'Fra dag 36 (fra 14.12.2026): Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg',
  'Dag 36 (14.12.2026): Vurdering (Lamotrigin): Punkt 3: Den første stabiliserende måldosen som er valgt (100 mg/dag), er nådd. Punkt 4: Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin.',
]

export const PLAN_LITIUM: readonly string[] = [
  'Dag 1–14 (09.11.2026–22.11.2026): Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg',
  'Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen, punkt 1: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Punkt 2: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
  'Dag 15–28 (23.11.2026–06.12.2026): Litium peroralt: 168 mg Li⁺ (24 mmol) = uendret dose; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg',
  'Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen, punkt 1: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Punkt 2: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
  'Dag 29–35 (07.12.2026–13.12.2026): Litium peroralt: 168 mg Li⁺ (24 mmol) = uendret dose; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg',
  'Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen, punkt 1: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Punkt 2: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
  'Fra dag 36 (fra 14.12.2026): Litium peroralt: 168 mg Li⁺ (24 mmol) = uendret dose; Lamotrigin peroralt: 200 mg = 1 tablett à 200 mg',
  'Dag 36 (14.12.2026): Vurdering (Lamotrigin): Punkt 3: Den første stabiliserende måldosen som er valgt (200 mg/dag), er nådd. Punkt 4: Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin.',
]

export const TILLEGGSKASUS: readonly Tilleggskasus[] = [
  // Slik appen er nå: begge reglene er godkjent, og verktøyet gir planen.
  kasus('K4-01', V, 'valproat', 'vanlig_dose', 'den godkjente regelen i appen, uten simulering: hele opptrappingen', '1000', { utfall: 'plan', linjer: [...PLAN_VALPROAT] }),
  kasus('K4-02', L, 'litium', 'vanlig_dose', 'den godkjente regelen i appen, uten simulering: hele opptrappingen', '168', { utfall: 'plan', linjer: [...PLAN_LITIUM] }),
  // Valproat → lamotrigin.
  kasus('K4-10', V, 'valproat', 'vanlig_dose', 'hele opptrappingen med valproat', '1000', { utfall: 'plan', linjer: [...PLAN_VALPROAT] }, { regel: regelen(V) }),
  kasus('K4-11', V, 'valproat', 'pasientforhold', 'pasienten er under 18 år', '1000', { utfall: 'stopp', grunner: [UNNTAK] }, { regel: regelen(V), skjema: { pasientforhold: { under_18: true } } }),
  kasus('K4-12', V, 'valproat', 'pasientforhold', 'tidligere utslett på lamotrigin', '1000', { utfall: 'stopp', grunner: [UNNTAK] }, { regel: regelen(V), skjema: { pasientforhold: { tidligere_reaksjon: true } } }),
  kasus('K4-13', V, 'valproat', 'pasientforhold', 'graviditet er ikke vurdert (ubesvart)', '1000', { utfall: 'stopp', grunner: ['Må avklares før beregning (ukjent): Pasienten er gravid'] }, { regel: regelen(V), ubesvart: ['graviditet'] }),
  // Jenter og kvinner som kan bli gravide: hvert vilkår i det graviditetsforebyggende programmet for valproat bekreftes for seg.
  kasus('K4-14', V, 'valproat', 'pasientforhold', 'kan bli gravid, og alle vilkårene i det graviditetsforebyggende programmet er bekreftet hver for seg', '1000', { utfall: 'plan', linjer: [...PLAN_VALPROAT] }, { regel: regelen(V), skjema: { svar: { kan_bli_gravid: true } } }),
  kasus('K4-26', V, 'valproat', 'pasientforhold', 'kan bli gravid, men sikker prevensjon er ikke bekreftet', '1000', { utfall: 'stopp', grunner: ['Må bekreftes før beregning: Pasienten bruker sikker prevensjon uten avbrudd'] }, {
    regel: regelen(V),
    skjema: { svar: { kan_bli_gravid: true }, bekreftet: V.bekreftelser.map((b) => b.id).filter((id) => id !== 'ppp_prevensjon') },
  }),
  kasus('K4-27', V, 'valproat', 'pasientforhold', 'det er ikke besvart om pasienten kan bli gravid', '1000', { utfall: 'stopp', grunner: ['Må besvares før beregning: Er pasienten jente eller kvinne som kan bli gravid?'] }, { regel: regelen(V), ubesvart: ['kan_bli_gravid'] }),
  kasus('K4-28', V, 'valproat', 'pasientforhold', 'kan bli gravid og alle vilkårene er bekreftet, men pasienten planlegger graviditet: stopper, vilkårene løser ikke det', '1000', { utfall: 'stopp', grunner: [UNNTAK] }, {
    regel: regelen(V),
    skjema: { svar: { kan_bli_gravid: true }, pasientforhold: { graviditet: true } },
  }),
  kasus('K4-29', V, 'valproat', 'pasientforhold', 'kan ikke bli gravid: vilkårene i programmet spørres ikke etter', '1000', { utfall: 'plan', linjer: [...PLAN_VALPROAT] }, {
    regel: regelen(V),
    skjema: { bekreftet: V.bekreftelser.filter((b) => !b.ved).map((b) => b.id) },
  }),
  // Valproatdosen: preparatet og dosen bekreftes som pasientens nåværende, i mg natriumvalproat som i legemiddellisten.
  kasus('K4-43', V, 'valproat', 'pasientforhold', 'det er ikke bekreftet at pasienten bruker et natriumvalproatpreparat i den innfylte dosen', '1000', { utfall: 'stopp', grunner: ['Må bekreftes før beregning: Pasienten bruker et natriumvalproatpreparat'] }, {
    regel: regelen(V),
    skjema: { bekreftet: V.bekreftelser.filter((b) => !b.ved).map((b) => b.id).filter((id) => id !== 'aktuell_dose') },
  }),
  // Gutter og menn som kan bli fedre: egne forholdsregler for valproat, adskilt fra programmet for kvinner.
  kasus('K4-44', V, 'valproat', 'pasientforhold', 'kan bli far, og informasjonen og vurderingen for menn som bruker valproat er bekreftet hver for seg', '1000', { utfall: 'plan', linjer: [...PLAN_VALPROAT] }, {
    regel: regelen(V),
    skjema: { svar: { kan_bli_far: true }, bekreftet: V.bekreftelser.filter((b) => b.ved?.sporsmal !== 'kan_bli_gravid').map((b) => b.id) },
  }),
  kasus('K4-45', V, 'valproat', 'pasientforhold', 'kan bli far, men informasjonen om risiko, prevensjon og sæddonasjon er ikke bekreftet', '1000', { utfall: 'stopp', grunner: ['Må bekreftes før beregning: Pasienten er informert om den mulige risikoen'] }, {
    regel: regelen(V),
    skjema: { svar: { kan_bli_far: true }, bekreftet: V.bekreftelser.map((b) => b.id).filter((id) => id !== 'far_informasjon') },
  }),
  kasus('K4-46', V, 'valproat', 'pasientforhold', 'det er ikke besvart om pasienten kan bli far', '1000', { utfall: 'stopp', grunner: ['Må besvares før beregning: Er pasienten gutt eller mann som kan gjøre en partner gravid?'] }, { regel: regelen(V), ubesvart: ['kan_bli_far'] }),
  kasus('K4-15', V, 'valproat', 'uvanlig_dose', 'ingen dose av valproat er fylt inn', '', { utfall: 'mangler', grunner: ['Aktuell døgndose må fylles inn'] }, { regel: regelen(V) }),
  kasus('K4-16', V, 'valproat', 'foreldet_fest', 'FEST-kopien er 49 timer gammel', '1000', { utfall: 'stopp', grunner: ['Den nattlige oppdateringen har ikke gått'] }, { regel: regelen(V), timer: 49 }),
  kasus('K4-17', V, 'valproat', 'preparat', 'alle lamotriginpreparatene krever godkjenningsfritak', '1000', { utfall: 'stopp', grunner: ['godkjenningsfritak'] }, { regel: regelen(V), fest: bareFritak('lamotrigin') }),
  kasus('K4-18', V, 'valproat', 'preparat', `alle pakningene av Lamictal 25 mg (varenr. ${LAMICTAL_25.ordinaer} og ${LAMICTAL_25.fritak}) er midlertidig utgått: 25 mg annenhver dag kan ikke gis, og planen stopper i stedet for å velge en annen dose`, '1000', { utfall: 'stopp', grunner: ['den ideelle dosen 25 mg annenhver dag kan ikke gis'] }, { regel: regelen(V), fest: midlertidigUtgatt('lamotrigin', 25, 'Lamictal') }),
  kasus('K4-47', V, 'valproat', 'preparat', `den ordinære pakningen Lamictal 25 mg (varenr. ${LAMICTAL_25.ordinaer}) er midlertidig utgått, og den eneste andre 25 mg-pakningen (varenr. ${LAMICTAL_25.fritak}) er en fritakspakning som allerede er utgått: planen stopper`, '1000', { utfall: 'stopp', grunner: ['den ideelle dosen 25 mg annenhver dag kan ikke gis'] }, { regel: regelen(V), fest: pakningUtgatt(LAMICTAL_25.ordinaer) }),
  kasus('K4-19', V, 'valproat', 'regelendring', 'regelen er endret etter godkjenningen (måldose 150 mg)', '1000', { utfall: 'stopp', grunner: ['Regelen er endret etter godkjenningen'] }, {
    regel: regelen(V, { hva: 'måldosen endret til 150 mg', endre: (x) => medMaldose(x, 150) }),
    skjema: { maldose: '150' },
  }),
  kasus('K4-20', V, 'valproat', 'uvanlig_dose', 'høyeste dose sammen med valproat: en plan over 200 mg stopper (godkjenningen simulert for den endrede kopien)', '1000', { utfall: 'stopp', grunner: ['den ideelle dosen 250 mg kan ikke gis med preparatene i FEST nøyaktig og ikke over 200 mg'] }, {
    regel: { id: V.id, endre: { hva: 'måldosen endret til 250 mg, deretter simulert godkjenning av kopien', endre: (x) => {
      medMaldose(x, 250)
      simulerGodkjenning(x, kontrollregel(x), DATO)
    } } },
    skjema: { maldose: '250' },
  }),
  kasus('K4-22', V, 'valproat', 'uvanlig_dose', 'forskriveren velger 200 mg som mål: regelen trapper bare opp til den første stabiliserende måldosen', '1000', { utfall: 'stopp', grunner: ['Måldosen 200 mg er utenfor det regelen gjelder for (100 mg)'] }, { regel: regelen(V), skjema: { maldose: '200' } }),
  kasus('K4-23', V, 'valproat', 'interaksjon', 'østrogenholdig prevensjon uten skriftlig vurdering av måldosen', '1000', { utfall: 'stopp', grunner: ['skriftlig begrunnelse'] }, { regel: regelen(V), skjema: { svar: { ostrogen: true } } }),
  kasus('K4-24', V, 'valproat', 'interaksjon', 'østrogenholdig prevensjon med skriftlig vurdering av måldosen', '1000', { utfall: 'plan', linjer: [...PLAN_VALPROAT] }, {
    regel: regelen(V),
    skjema: { svar: { ostrogen: true }, begrunnelse: 'Syntetisk: måldosen vurderes på nytt etter titreringen, med serumkonsentrasjon av lamotrigin.' },
  }),
  kasus('K4-25', V, 'valproat', 'pasientforhold', 'spørsmålet om østrogenholdig behandling er ubesvart', '1000', { utfall: 'stopp', grunner: ['østrogenholdig'] }, { regel: regelen(V), ubesvart: ['ostrogen'] }),
  kasus('K4-21', V, 'valproat', 'nodstopp', 'verktøyet er deaktivert med nødstoppen', '1000', { utfall: 'sperret' }, { regel: regelen(V), sperrer: [sperre('verktoy', VERKTOY)] }),
  // Litium → lamotrigin.
  kasus('K4-30', L, 'litium', 'vanlig_dose', 'hele opptrappingen med litium', '168', { utfall: 'plan', linjer: [...PLAN_LITIUM] }, { regel: regelen(L) }),
  kasus('K4-31', L, 'litium', 'interaksjon', 'pasienten bruker også karbamazepin', '168', { utfall: 'stopp', grunner: [UNNTAK] }, { regel: regelen(L), skjema: { pasientforhold: { valproat_eller_induserende: true } } }),
  kasus('K4-32', L, 'litium', 'interaksjon', 'pasienten bruker et legemiddel med ukjent interaksjon med lamotrigin', '168', { utfall: 'stopp', grunner: [UNNTAK] }, { regel: regelen(L), skjema: { pasientforhold: { ukjent_interaksjon: true } } }),
  kasus('K4-33', L, 'litium', 'pasientforhold', 'moderat nedsatt leverfunksjon', '168', { utfall: 'stopp', grunner: [UNNTAK] }, { regel: regelen(L), skjema: { pasientforhold: { nedsatt_leverfunksjon: true } } }),
  kasus('K4-34', L, 'litium', 'pasientforhold', 'bruker lamotrigin allerede (ikke en oppstart)', '168', { utfall: 'stopp', grunner: [UNNTAK] }, { regel: regelen(L), skjema: { pasientforhold: { bruker_lamotrigin: true } } }),
  kasus('K4-35', L, 'litium', 'pasientforhold', 'det er ikke bekreftet at den innfylte litiumdosen er den pasienten bruker nå', '168', { utfall: 'stopp', grunner: ['Må bekreftes før beregning: Pasienten bruker Lithionit 42 mg depottabletter'] }, {
    regel: regelen(L),
    skjema: { bekreftet: ['fortsetter_litium', 'utslett_informert'] },
  }),
  // Litiumdosen må være hele Lithionit-tabletter (42 mg Li⁺), opp til den høyeste veiledende vedlikeholdsdosen.
  kasus('K4-36', L, 'litium', 'uvanlig_dose', 'en usannsynlig litiumdose (0,5 mg) stopper', '0,5', { utfall: 'stopp', grunner: [LITIUMDOSE] }, { regel: regelen(L) }),
  kasus('K4-37', L, 'litium', 'uvanlig_dose', 'en dose som ikke er hele Lithionit-tabletter (170 mg, for eksempel mg litiumsalt), stopper', '170', { utfall: 'stopp', grunner: [LITIUMDOSE] }, { regel: regelen(L) }),
  kasus('K4-38', L, 'litium', 'uvanlig_dose', 'grensen: 10 tabletter (420 mg Li⁺) er innenfor', '420', { utfall: 'plan', linjer: PLAN_LITIUM.map((l) => l.replace('168 mg Li⁺ (24 mmol)', '420 mg Li⁺ (60 mmol)').replace('= 4 tabletter', '= 10 tabletter')) }, { regel: regelen(L) }),
  kasus('K4-39', L, 'litium', 'uvanlig_dose', 'grensen: 11 tabletter (462 mg Li⁺) er over den høyeste veiledende vedlikeholdsdosen og stopper', '462', { utfall: 'stopp', grunner: [LITIUMDOSE] }, { regel: regelen(L) }),
  kasus('K4-40', L, 'litium', 'uvanlig_dose', 'forskriveren velger 300 mg som mål: regelen trapper bare opp til den første stabiliserende måldosen', '168', { utfall: 'stopp', grunner: ['Måldosen 300 mg er utenfor det regelen gjelder for (200 mg)'] }, { regel: regelen(L), skjema: { maldose: '300' } }),
  kasus('K4-41', L, 'litium', 'pasientforhold', 'måldosen er ikke bekreftet som pasientens kliniske mål', '168', { utfall: 'stopp', grunner: ['Må bekreftes før beregning: Den første stabiliserende måldosen (200 mg/dag) er det kliniske målet'] }, {
    regel: regelen(L),
    skjema: { bekreftet: L.bekreftelser.map((b) => b.id).filter((id) => id !== 'maldose_valgt') },
  }),
  kasus('K4-42', L, 'litium', 'interaksjon', 'østrogenholdig behandling med skriftlig begrunnelse, men den særskilte vurderingen av måldosen er ikke bekreftet', '168', { utfall: 'stopp', grunner: ['Må bekreftes før beregning: Måldosen er vurdert særskilt'] }, {
    regel: regelen(L),
    skjema: { svar: { ostrogen: true }, begrunnelse: 'Syntetisk: vurdert.', bekreftet: L.bekreftelser.map((b) => b.id).filter((id) => id !== 'ostrogen_maldose') },
  }),
  // Kombinasjoner uten regel: verktøyet sier det, og beregner ingenting.
  kasus('K4-50', null, 'karbamazepin', 'ikke_godkjent', 'karbamazepin → lamotrigin (induserende legemiddel) har ingen regel', '600', { utfall: 'ingen', status: 'ikke_stottet' }),
  { ...kasus('K4-51', null, 'lamotrigin', 'ikke_godkjent', 'motsatt retning: lamotrigin → valproat har ingen regel', '200', { utfall: 'ingen', status: 'ikke_stottet' }), valg: { fra: peroral('lamotrigin'), til: peroral('valproat') } },
  kasus('K4-52', null, 'kvetiapin', 'ikke_godkjent', 'kvetiapin → lamotrigin har ingen regel', '300', { utfall: 'ingen', status: 'ikke_stottet' }),
]


/** Uttrekkene kasusene leses fra: tilleggsuttrekket på begge plassene. */
export const uttrekkeneFor = (u: Festuttrekk): Uttrekkene => ({ pilot: u, aksept: u })

/** Utfallet av hvert kasus, og hvorfor det avviker fra forventningen (tom når det ikke gjør det). */
export function kjorTilleggskasus(u: Festuttrekk) {
  return TILLEGGSKASUS.map((k) => {
    const res = kjorKasus(k, uttrekkeneFor(u))
    return { k, res, avvik: avvikFra(k, res) }
  })
}

const celle = (x: string) => x.replaceAll('|', '\\|').replaceAll('\n', ' ')

function utfallstekst(u: Pilotutfall): string {
  switch (u.utfall) {
    case 'plan':
      return `plan (${u.linjer.length} rader)`
    case 'stopp':
    case 'mangler':
      return `${u.utfall}: ${u.grunner.join(' ')}`
    case 'formvalg':
      return `formvalg: ${u.forlop.join(', ')}`
    case 'fagtekst':
      return `fagtekst: ${u.regler.join(', ')}`
    case 'ingen':
      return `ingen plan (${u.status}): ${u.grunner.join(' ')}`
    case 'sperret':
      return 'deaktivert med nødstoppen'
  }
}

/** Kontrollspørsmålene til den uavhengige faglige kontrollen, med OUSFARs anbefaling. */
export const TILLEGGSSPORSMAL: readonly { nr: string; sporsmal: string; anbefalt: string }[] = [
  {
    nr: 'K4.1',
    sporsmal: 'Er opptrappingene og måldosene gjengitt riktig fra tabell 3 i Lamictal-preparatomtalen (valproat: 25 mg annenhver dag i 14 dager, 25 mg i 14 dager, 50 mg i 7 dager, 100 mg; uten valproat og induserende legemidler: 25, 50 og 100 mg, så 200 mg)?',
    anbefalt: 'Ja; dosene er hentet direkte fra tabellen, og planen går ikke over dem.',
  },
  {
    nr: 'K4.2',
    sporsmal: 'Forskriveren må nå velge måldosen, og regelen gjelder bare preparatomtalens vanlige første stabiliserende måldose (100 mg med valproat, 200 mg ellers); et annet mål stopper (K4-22, K4-40), og videre justering er et vurderingspunkt som ikke beregnes. Forskriveren bekrefter i tillegg at denne måldosen er pasientens kliniske mål etter indikasjon, respons og interaksjoner; uten det beregnes ingen plan (K4-41). Er planen da riktig betegnet som komplett til det valgte målet?',
    anbefalt: 'Ja; preparatomtalen kaller dem vanlige måldoser og sier at måldosen avhenger av klinisk respons. Etter kontrollen 03.11.2026 er målet gjort til et eksplisitt valg i stedet for en skjult forutsetning.',
  },
  {
    nr: 'K4.3',
    sporsmal: 'Skal planen bare bruke Lamictal tyggetabletter/dispergerbare tabletter (FEST-form 524), siden vanlige lamotrigintabletter i FEST krever godkjenningsfritak?',
    anbefalt: 'Ja; alle dosene kan gis med hele dispergerbare tabletter.',
  },
  {
    nr: 'K4.4',
    sporsmal: 'Er unntakene (under 18 år, tidligere alvorlig reaksjon, lamotrigin i bruk eller nylig avsluttet, moderat/alvorlig leversvikt, betydelig nyresvikt, graviditet/amming, HLA-B*1502) og bekreftelsene riktige og tilstrekkelige som stopp?',
    anbefalt: 'Ja, som en forsiktig første avgrensning; hver av dem har en egen dosering eller vurdering i preparatomtalen som regelen ikke beregner.',
  },
  {
    nr: 'K4.5',
    sporsmal: 'Unntaket for nylig avsluttet lamotrigin oppgir ca. 7 og ca. 15 døgn (fem gjennomsnittlige halveringstider, alene og med valproat, fra pkt. 5.2). Er det forsvarlig å vise disse omtrentlige tallene?',
    anbefalt: 'Ja, som veiledning i teksten; regelen bruker dem ikke i beregningen.',
  },
  {
    nr: 'K4.6',
    sporsmal: 'Etter kontrollen 03.11.2026 må forskriveren svare på om pasienten kan bli gravid. Ved ja må fire vilkår i det graviditetsforebyggende programmet bekreftes hver for seg (indikasjon og årlig spesialistvurdering, informasjon og risikoskjema, sikker prevensjon, graviditetstest og kontakt ved graviditet); hvert som mangler, stopper (K4-14, K4-26–K4-29). Graviditet, planlagt graviditet og amming stopper uansett, også når vilkårene er bekreftet. Er vilkårene og formuleringene riktige og tilstrekkelige?',
    anbefalt: 'Ja; de følger vilkårene i pkt. 4.4 i Orfiril-preparatomtalen, og et ja løser aldri en graviditet. Gutter og menn har egne forholdsregler (K4.9).',
  },
  {
    nr: 'K4.7',
    sporsmal: 'Litiumdosen oppgis i mg litium (Li⁺) som på Lithionit 42 mg (6 mmol per tablett), og regelen gjelder bare hele Lithionit 42 mg-tabletter fra 1 til 10 tabletter daglig (den høyeste veiledende vedlikeholdsdosen); andre doser og andre litiumpreparater stopper (K4-36–K4-39). Er avgrensningen og enhetsangivelsen riktig?',
    anbefalt: 'Ja; den fjerner forvekslingen mellom mg Li⁺ og mg litiumsalt og hindrer en dose som ikke kan gis med Lithionit.',
  },
  {
    nr: 'K4.8',
    sporsmal: 'Opptrappingen er den samme ved østrogenholdig prevensjon eller behandling, men forskriveren må svare på det. Et ja krever både en bekreftet særskilt vurdering av måldosen og en skriftlig begrunnelse, fordi vedlikeholdsdosen kan måtte bli opptil dobbelt så høy (K4-23–K4-25, K4-42). I tillegg står det som vurderingspunkt ved måldosen. Er det tilstrekkelig?',
    anbefalt: 'Ja; preparatomtalen endrer ikke opptrappingen, men sier at vedlikeholdsdosen kan måtte økes.',
  },
  {
    nr: 'K4.9',
    sporsmal: 'Etter kontrollen 03.11.2026 må forskriveren også svare på om pasienten er gutt eller mann som kan gjøre en partner gravid. Ved ja må to forholdsregler fra pkt. 4.4 i Orfiril-preparatomtalen bekreftes hver for seg: informasjon om den mulige risikoen, om prevensjon (også for en kvinnelig partner) og om sæddonasjon, og at behandlingen er vurdert, med andre alternativer ved planlagt farskap. Hver som mangler, eller et ubesvart spørsmål, stopper (K4-44–K4-46). Planlagt farskap stopper ikke planen. Er det riktig og tilstrekkelig?',
    anbefalt: 'Ja; preparatomtalen beskriver forsiktighetstiltak og en vurdering, ikke en kontraindikasjon, og årsakssammenhengen er usikker. Bekreftelsene holdes adskilt fra programmet for jenter og kvinner.',
  },
  {
    nr: 'K4.10',
    sporsmal: 'Valproatdosen oppgis i mg natriumvalproat, og kopien viser til pasientens preparat og fordeling over døgnet i legemiddellisten i stedet for å angi et preparat. Forskriveren bekrefter at pasienten bruker et natriumvalproatpreparat i den dosen, og dosen kontrolleres ikke (K4-10, K4-43). Er det riktig å overlate preparatet til legemiddellisten i stedet for å avgrense regelen til bestemte valproatpreparater?',
    anbefalt: 'Ja; preparatomtalen fastsetter dosen individuelt og gir ingen dose regelen kan kontrollere mot, og verktøyet konverterer ikke mellom preparater. Preparater der dosen ikke oppgis i mg natriumvalproat, er utenfor regelen.',
  },
]

/** Kombinasjonene verktøyet bevisst ikke dekker ennå, med grunnen. */
export const IKKE_DEKKET: readonly string[] = [
  'Karbamazepin → lamotrigin (og andre induserende legemidler): preparatomtalen har en egen opptrapping der døgndoser fra 100 mg skal fordeles på to doser; fordelingen per trinn er ikke modellert ennå.',
  'Aripiprazol, olanzapin, gabapentin og topiramat → lamotrigin: samme opptrapping som med litium etter tabell 6, men hvert par må vurderes for seg før det legges til.',
  'Kvetiapin, risperidon og ziprasidon → lamotrigin: interaksjonen er ikke beskrevet i tabell 6; preparatomtalen sier da at opptrappingen for samtidig valproat skal brukes. Ikke laget.',
  'Lamotrigin → valproat (motsatt retning): lamotrigindosen skal halveres når valproat legges til (tabell 5), men opptrappingen av valproat er ikke vurdert. Ikke laget.',
  'Valproatdosen kontrolleres ikke: Orfiril-preparatomtalen fastsetter den individuelt etter respons og gir ikke noe område, og valproatpreparatene har mange styrker og flytende former. Planen gjentar den innfylte dosen i mg natriumvalproat og viser til pasientens preparat og fordeling over døgnet i legemiddellisten; forskriveren bekrefter at det er pasientens aktuelle preparat og dose (K4-43). Preparater der dosen ikke oppgis i mg natriumvalproat, er utenfor regelen. Litiumdosen kontrolleres mot hele Lithionit 42 mg-tabletter (K4-36–K4-39).',
  'Andre litiumpreparater enn Lithionit 42 mg (Lithionit 83 mg, Carblit og preparater med godkjenningsfritak, der styrken kan være oppgitt som mg litiumsalt): utenfor regelen til enhet og styrke er vurdert for hvert preparat.',
  'En annen måldose enn preparatomtalens første stabiliserende måldose: videre opptrapping etter klinisk respons beregnes ikke (K4-22, K4-40).',
  'Alle andre par i Combining Moodstabilizers (110 i alt): ingen kildeforankret regel ennå.',
]

/** Rapporten til den uavhengige faglige kontrollen. */
export function lagTilleggsgrunnlag(u: Festuttrekk): string {
  const resultater = kjorTilleggskasus(u)
  const avvik = resultater.filter((x) => x.avvik.length > 0)
  const linjer = [
    '# OUSFAR Verktøy – K4: kontrollgrunnlag for kombinasjon av stemningsstabiliserende',
    '',
    '> Generert av `npm run verktoy:regler -- tilleggsgrunnlag` fra `src/verktoy/tilleggsgrunnlag.ts`. Ikke rediger for hånd; testene sier fra når rapporten ikke er oppdatert.',
    '',
    'Kasusene går den samme veien som verktøysiden, med preparatene i det lagrede FEST-uttrekket. **Begge reglene er klinisk godkjent av en uavhengig kontrollør (ChatGPT, 04.11.2026, PR #322, kommentar 6620240499) for nøyaktig versjonen og fingeravtrykket under**, og kasusene bruker dem slik appen har dem. Kasusene som endrer en kopi av regelen, sier det; kopien går aldri til appen. Kasusene er syntetiske, uten pasientopplysninger. Selve reglene, kildene og fakta står i `docs/verktøy-k4-tillegg.md`.',
    '',
    `FEST-uttrekket: \`${FEST_TILLEGG}\` (hentet ${u.hentet}, kontrollert ${u.utvalg.kontrollert_kl}).`,
    '',
    '## Versjonene under kontroll',
    '',
    tabell(
      ['Regel', 'Versjon', 'Fingeravtrykk'],
      TILLEGGSSETT.regler.map((r) => [`\`${r.id}\``, String(r.versjon), `\`${fingeravtrykk(r)}\``]),
    ),
    '',
    '## Kontrollspørsmål',
    '',
    tabell(['Nr.', 'Spørsmål', 'OUSFARs anbefaling'], TILLEGGSSPORSMAL.map((s) => [s.nr, s.sporsmal, s.anbefalt])),
    '',
    '## Ikke dekket',
    '',
    liste([...IKKE_DEKKET]),
    '',
    '## Kasusene',
    '',
    `**${resultater.length} kasus.** ${avvik.length === 0 ? 'Alle utfallene er som forventet.' : `**${avvik.length} utfall avviker fra forventningen.**`}`,
    '',
    tabell(
      ['Kasus', 'Regel', 'Kategori', 'Hva', 'Dose', 'Utfall'],
      resultater.map(({ k, res, avvik: a }) => [`${k.id}${a.length > 0 ? ' ✗' : ''}`, k.gjelder ? `\`${k.gjelder}\`` : '–', KATEGORIER[k.kategori], celle(k.hva), `«${k.dose}»`, celle(utfallstekst(res))]),
    ),
  ]
  for (const { k, res } of resultater.filter(({ res }) => res.utfall === 'plan')) {
    linjer.push('', `## ${k.id}: ${k.hva}`, '', `Planutfall: ${res.tekst?.includes(KOMPLETT) ? KOMPLETT : 'ikke komplett'}.`, '', '```text', res.tekst ?? '', '```')
  }
  return `${linjer.join('\n')}\n`
}
