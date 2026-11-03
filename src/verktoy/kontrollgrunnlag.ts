/**
 * VDK-3 i `docs/verktøy-omlegging-2026-11.md`: det faglige kontrollgrunnlaget
 * for ett forslag i `docs/verktøy-vdk2-prioritering.md`, laget av de faktiske
 * reglene, preparatene i det lagrede FEST-uttrekket og den samme veien som
 * verktøysiden (`kjorKasus` i P11-testmatrisen), så grunnlaget ikke kan vise
 * noe annet enn appen ville vist.
 *
 * Reglene er ikke godkjent. For å vise kontrolløren hva verktøyet ville vist
 * om nøyaktig den versjonen ble godkjent, regnes planene på en kopi av regelen
 * med en simulert godkjenning ({@link somGodkjent}) bundet til versjonen og
 * fingeravtrykket under kontroll. Kopien lagres aldri, går aldri til
 * verktøysiden, og en endret regel gir ingen plan. Modulen brukes bare av
 * skriptet og testene; `npm run verktoy:regler -- kontrollgrunnlag` skriver
 * rapporten, og testene sier fra når den ikke er oppdatert.
 *
 * Kasusene er syntetiske: ingen pasientopplysninger, bare doser og svar valgt
 * for å prøve reglene, også ved grensene. Ingen tekst fra Psychiatrienet vises.
 */
import type { Trinnvalg } from './motor/plan'
import { norskDato } from './motor/byggesteiner'
import { valgtekst } from './regler/aksepttest'
import { fingeravtrykk, godkjenningsfeil, KONTROLLUTFALL, kontrollutfall } from './regler/godkjenning'
import type { Klinisktilfelle, Regel } from './regler/modell'
import { STI } from './regler/nedtrapping'
import { avregistrert, avvikFra, kjorKasus, type Kontrollregel, nyStyrke, type Pilotkasus, type Pilotutfall, SIMULERT_KONTROLLOR, simulerGodkjenning, type Uttrekkene } from './regler/pilotmatrise'
import { grunnlag, liste, tabell, tall, utsagn } from './regler/rapport'
import { inndatavilkar } from './regler/beregning'
import { EN_FORSTE_REDUKSJON, STARTFORLOP } from './planvisning'
import { kliniskDelplan, tilfelletekst, UTENFOR_OMFANG } from './motor/plan'
import { REGELSETT, REGELSETTENE, type Verktoyvalg } from './tilgjengelighet'

export { type Kontrollregel, SIMULERT_KONTROLLOR }

export interface Kontrollsporsmal {
  nr: string
  sporsmal: string
  anbefalt: string
}

/**
 * Et syntetisk kasus som går den samme veien som verktøysiden. Forskriveren
 * velger dosene i `velger`, i rekkefølge, ved hvert trinn som ikke kan gis
 * nøyaktig; `tilbyr` er dosene verktøyet til slutt tilbyr for neste trinn
 * (tom når ingen tilbys).
 */
export interface Kontrollkasus extends Pilotkasus {
  velger?: number[]
  tilbyr: number[]
  /** Testkasuset i `docs/verktøy-vdk2-prioritering.md` kasuset gjør til en test. */
  vdk2?: string
}

export interface Kontrollforslag {
  nr: number
  tittel: string
  fil: string
  /** Dagen grunnlaget ble laget; den simulerte godkjenningen dateres hit. */
  dato: string
  verktoy: string
  regler: Kontrollregel[]
  /** Kontrollørens avgrensning av hva kontrollgrunnlaget betyr, når kontrolløren har gitt en. */
  avgrensning?: { dato: string; tekst: string }
  /** Hva som må være på plass før en godkjenning kan registreres, utenom selve kontrollen. */
  forutsetninger: string[]
  sporsmal: Kontrollsporsmal[]
  kasus: Kontrollkasus[]
}

/* --- Den simulerte godkjenningen ------------------------------------------------ */

/**
 * Regelen på en kopi med en simulert klinisk godkjenning av nøyaktig
 * versjonen og fingeravtrykket under kontroll, til `regel` i et kasus. Er
 * regelen endret, stemmer ikke fingeravtrykket, og ingen plan vises.
 */
export function somGodkjent(k: Kontrollregel, dato: string): NonNullable<Pilotkasus['regel']> {
  return { id: k.id, endre: { hva: `simulert klinisk godkjenning av versjon ${k.versjon}, bare på en kopi`, endre: (r: Regel) => simulerGodkjenning(r, k, dato) } }
}

const regelMedId = (id: string) => {
  const r = REGELSETT.regler.find((x) => x.id === id)
  if (!r) throw new Error(`Regelen ${id} finnes ikke.`)
  return r
}

/** Det som ville hindret en registrert godkjenning av versjonen, utenom selve kontrollen; tom når ingenting gjør det. */
export function godkjenningshindringer(k: Kontrollregel, dato: string): string[] {
  const r = structuredClone(regelMedId(k.id))
  somGodkjent(k, dato).endre!.endre(r)
  return godkjenningsfeil(r)
}

/** Valget i verktøyet regelen gjelder: virkestoffet den trapper ned fra. */
export function valgFor(r: Regel): Verktoyvalg {
  if (r.fra?.type !== 'virkestoff') throw new Error(`Regelen ${r.id} gjelder ikke ett virkestoff.`)
  return { fra: { nokkel: r.fra.nokkel, formulering: 'standard' } }
}

/* --- Kasusene ------------------------------------------------------------------- */

const lik = (a: number, b: number) => Math.abs(a - b) < 1e-9

/** Kasuset med forskriverens valg gjort ett og ett, slik på verktøysiden; `feil` når et valg ikke tilbys. */
export function kjorKontrollkasus(k: Kontrollkasus, uttrekkene: Uttrekkene): ReturnType<typeof kjorKasus> & { feil: string[] } {
  let trinnvalg = k.skjema?.trinnvalg ?? []
  const kjor = () => kjorKasus({ ...k, skjema: { ...k.skjema, trinnvalg } }, uttrekkene, REGELSETTENE, kliniskDelplan)
  let u = kjor()
  for (const mg of k.velger ?? []) {
    const t = u.resultat?.trinnvalg?.[0]
    if (!t || !t.doser.some((d) => lik(d.mg, mg))) return { ...u, feil: [`${tall(mg)} mg tilbys ikke (${t ? `tilbys: ${t.doser.map((d) => `${tall(d.mg)} mg`).join(', ')}` : 'ingen valg'}).`] }
    trinnvalg = [...trinnvalg, { forlop: t.forlop, trinn: t.trinn, fra_mg: t.fra_mg, mg }]
    u = kjor()
  }
  return { ...u, feil: [] }
}

/** Dosene verktøyet tilbyr for neste trinn. */
const tilbudt = (u: ReturnType<typeof kjorKasus>) => (u.resultat?.trinnvalg?.[0]?.doser ?? []).map((d) => d.mg)

/** Hvorfor kasuset ikke gir det det forventer; tom når det gjør det. */
export function kontrollavvik(k: Kontrollkasus, uttrekkene: Uttrekkene): string[] {
  const u = kjorKontrollkasus(k, uttrekkene)
  const tilbys = tilbudt(u)
  return [
    ...u.feil,
    ...avvikFra(k, u),
    ...(tilbys.length === k.tilbyr.length && tilbys.every((mg, i) => lik(mg, k.tilbyr[i]!)) ? [] : [`tilbyr ${JSON.stringify(tilbys)}, ventet ${JSON.stringify(k.tilbyr)}`]),
  ]
}

/* --- Alle planene i det kliniske omfanget -------------------------------------- */

/** Ett valg forskriveren gjør i en plan: trinnet, dosene som tilbys, og dosen som er valgt. */
export interface Planvalg {
  trinn: Trinnvalg
  valgt: number
}

export interface Planvei {
  valg: Planvalg[]
  utfall: Pilotutfall
}

/** Én startdose i ett tilfelle i regelens kliniske omfang, med hver plan forskriverens valg kan gi. */
export interface Omfangsplan {
  regel: Kontrollregel
  tilfelle: Klinisktilfelle
  startdose_mg: number
  form: string | null
  veier: Planvei[]
}

/** Grense for antall valg i én plan; hvert valg gir minst ett trinn til, så planhorisonten nås lenge før. */
const MAKS_VALG = 30

const iTekst = (x: Record<string, number> | undefined) => Object.fromEntries(Object.entries(x ?? {}).map(([sti, v]) => [sti, String(v)]))

/**
 * Hver plan verktøyet kan vise for én startdose i tilfellet, med regelen som
 * godkjent på en kopi: ved hvert trinn som ikke kan gis nøyaktig, følges hver
 * dose som tilbys. Formen velges bare når verktøysiden ber om det.
 */
export function planerFor(f: Kontrollforslag, k: Kontrollregel, tilfelle: Klinisktilfelle, startdose_mg: number, uttrekkene: Uttrekkene): Omfangsplan {
  const r = regelMedId(k.id)
  const form = tilfelle.legemiddelform ?? null
  const grunn: Pilotkasus = {
    id: `${k.id}-${form ?? 'form'}-${startdose_mg}`,
    kategori: 'vanlig_dose',
    hva: 'plan i det kliniske omfanget',
    verktoy: f.verktoy,
    valg: valgFor(r),
    uttrekk: 'aksept',
    dose: String(startdose_mg),
    skjema: { svar: tilfelle.svar, justert: iTekst(tilfelle.justert) },
    regel: somGodkjent(k, f.dato),
    forventet: { utfall: 'sperret' },
  }
  const forsok = kjorKasus(grunn, uttrekkene, REGELSETTENE, kliniskDelplan)
  const formvalg = forsok.utfall === 'formvalg' && form ? Object.fromEntries(forsok.forlop.map((id) => [id, { legemiddelform: form }])) : {}
  const veier: Planvei[] = []
  const folg = (valg: Planvalg[]) => {
    const trinnvalg = valg.map((v) => ({ forlop: v.trinn.forlop, trinn: v.trinn.trinn, fra_mg: v.trinn.fra_mg, mg: v.valgt }))
    const u = kjorKasus({ ...grunn, skjema: { ...grunn.skjema, formvalg, trinnvalg } }, uttrekkene, REGELSETTENE, kliniskDelplan)
    const t = u.resultat?.trinnvalg?.[0]
    if (!t || valg.length >= MAKS_VALG) return void veier.push({ valg, utfall: u })
    for (const d of t.doser) folg([...valg, { trinn: t, valgt: d.mg }])
  }
  folg([])
  return { regel: k, tilfelle, startdose_mg, form, veier }
}

export function omfangsplaner(f: Kontrollforslag, uttrekkene: Uttrekkene): Omfangsplan[] {
  return f.regler.flatMap((k) => (regelMedId(k.id).klinisk_omfang?.tilfeller ?? []).flatMap((t) => t.startdoser.map((mg) => planerFor(f, k, t, mg, uttrekkene))))
}

/* --- Forslag 1 ------------------------------------------------------------------ */

const SEPONERING = 'trappe-ned-antidepressiv'

const AMITRIPTYLIN: Kontrollregel = { id: 'seponering-amitriptylin', versjon: 12, fingeravtrykk: 'a43c1164e4061a1757fefea381da027b8cefe92c077d742855fd4e2f5486b6e3' }
const NORTRIPTYLIN: Kontrollregel = { id: 'seponering-nortriptylin', versjon: 12, fingeravtrykk: '300a71b147bf87eb61dbeaeccd27aa07add900435b579c14291061f38f63616c' }
const ESCITALOPRAM: Kontrollregel = { id: 'seponering-escitalopram', versjon: 12, fingeravtrykk: '7710be648e96682c1c8a35a8e4d9c4428109b294f29b63ae9401ef29b41bd3c1' }
const ESCITALOPRAM_LANGSOM: Kontrollregel = { id: 'seponering-escitalopram-langsom', versjon: 8, fingeravtrykk: '4e49c175ac6aa49cba89d7db711f710c14b654681cc3138994dbaaaebb69c095' }

const DATO_1 = '2026-11-03'
const TABLETT = '53'
const DRAPER = '748'
const LANG = { lang_behandlingstid: true }

const form = (kode: string) => ({ formvalg: { fra: { legemiddelform: kode } } })
const plan = (undertittel: string | null, ...linjer: string[]) => ({ utfall: 'plan' as const, linjer, undertittel })
const stopp = (...grunner: string[]) => ({ utfall: 'stopp' as const, grunner })
const ingenPlan = (...grunner: string[]) => stopp('Ingen klinisk doseplan kan vises.', ...grunner)
/** Startdosen er ikke et tilfelle i regelens kliniske omfang. */
const utenforOmfang = (mg: number) => `Startdosen ${tall(mg)} mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for`

/** Regelen med den simulerte godkjenningen, deretter endret på kopien: det som skjer om regelen endres etter en godkjenning. */
const endretEtter = (k: Kontrollregel, hva: string, endre: (r: Regel) => void): NonNullable<Pilotkasus['regel']> => {
  const g = somGodkjent(k, DATO_1)
  return { id: k.id, endre: { hva: `${g.endre!.hva}; deretter ${hva}`, endre: (r) => (g.endre!.endre(r), endre(r)) } }
}

/** Et kasus for forslag 1; `regel` er den simulerte godkjenningen av regelen, med mindre kasuset sier noe annet. */
const k1 = (
  id: string,
  kategori: Pilotkasus['kategori'],
  hva: string,
  r: Kontrollregel,
  dose: string,
  forventet: Pilotkasus['forventet'],
  tilbyr: number[] = [],
  x: Partial<Kontrollkasus> = {},
): Kontrollkasus => ({
  id,
  kategori,
  hva,
  verktoy: SEPONERING,
  valg: valgFor(regelMedId(r.id)),
  uttrekk: 'aksept',
  dose,
  regel: somGodkjent(r, DATO_1),
  forventet,
  tilbyr,
  ...x,
})

export const FORSLAG_1: Kontrollforslag = {
  nr: 1,
  tittel: 'Kontroll av eksisterende nedtrappingsregler i eksisterende omfang',
  fil: 'docs/verktøy-vdk3-forslag1-kontrollgrunnlag.md',
  dato: DATO_1,
  verktoy: SEPONERING,
  regler: [AMITRIPTYLIN, NORTRIPTYLIN, ESCITALOPRAM, ESCITALOPRAM_LANGSOM],
  avgrensning: {
    dato: '2026-11-03',
    tekst:
      'At dette kontrollgrunnlaget slås sammen, er ingen klinisk godkjenning av forslag 1 eller av spørsmålene 1.1–1.7. RCPsych og NICE støtter prinsippene om trinnvis og individuelt tilpasset nedtrapping, men ikke alene en automatisk godkjenning av hele beregnede kjeder, særlig de ti reduksjonene for escitalopram dråper over 252 dager. `rcpsych-stopping` må avklares som forutsatt, og hver regelversjon og hvert klinisk omfang må få en egen, eksplisitt og kildeforankret klinisk kontroll før aktivering.',
  },
  forutsetninger: [
    'Tråd F har slått fast at delene av RCPsych «Stopping antidepressants» (`rcpsych-stopping`) reglene bygger på, tempo og risikogrupper, er uendret etter kildefunnet (`docs/verktøy-kildefunn-1-2.md`). Kontrollen kan gjøres nå, men en godkjenning bør først registreres etterpå.',
    'Godkjenningen registreres i en egen PR, for nøyaktig versjonen og fingeravtrykket i tabellen over og med kontrollørens avgrensning, slik den godkjente vortioksetinregelen. Registreringen (`godkjent` i `src/verktoy/regler/nedtrapping.ts`) gjelder i dag bare hovedreglene og viser til kontrollørens gjennomgang av f77e1a9; den må få navnet og datoen for den nye kontrollen og kunne dekke den langsomme varianten. Det er en teknisk endring som ikke endrer fingeravtrykkene.',
    'Ingen regel endres i denne PR-en, og ingen godkjenning registreres. Endres en regel før kontrollen, stemmer ikke fingeravtrykket, og kontrollen må gjøres på nytt for den nye versjonen.',
    'Etter kontrollørens vurdering 03.11.2026 er faktumet fra RCPsych om små reduksjoner fra starten presisert (`RCPSYCH.langvarig`, `docs/verktøy-rettelse-langvarig.md`). De fire reglene viser til det og har derfor fått en ny versjon som bare skiller seg i dette faktumet fra versjonen som ble vurdert 31.10.2026. Kontrolløren har vurdert de nye versjonene som kontrollert, ikke godkjent, som før. Tabellen over gjelder de nye versjonene, og planene og kasusene er uendret.',
  ],
  sporsmal: [
    {
      nr: '1.1',
      sporsmal: 'Gjelder en godkjenning hele kjeden av reduksjoner der forskriveren velger dosen som tilbys ved hvert trinn som ikke kan gis nøyaktig, eller bare første reduksjon?',
      anbefalt: 'Hele kjeden innenfor det foretrukne området. Hvert valg er eksplisitt og merket i planen, hver reduksjon krever ny vurdering av toleransen, og prinsippet er alt akseptert i P7-A. Ved hvert valg i omfanget tilbys nøyaktig én dose (avsnitt 5), så kjeden er bestemt av startdosen.',
    },
    {
      nr: '1.2',
      sporsmal: 'Er en delplan som stopper ved 20 mg (amitriptylin og nortriptylin), 3 mg (escitalopram dråper, kort behandlingstid) eller 9 mg (escitalopram dråper, lang behandlingstid) akseptabel når planen sier at avslutningen vurderes individuelt?',
      anbefalt: 'Ja. Det er samme utfall som for vortioksetin, planen går aldri til null, og undertittelen sier at den ikke er en fullstendig plan.',
    },
    {
      nr: '1.3',
      sporsmal: 'Skal amitriptylin og nortriptylin godkjennes for alle startdosene i omfanget, eller bare der første reduksjon kan gis nøyaktig?',
      anbefalt: 'Alle startdosene i omfanget. Der første reduksjon ikke kan gis nøyaktig, tilbys én dose innenfor 5–25 %, og planen vises først når forskriveren har valgt den.',
    },
    {
      nr: '1.4',
      sporsmal: 'Escitalopram dråper fra 20 mg ved lang behandlingstid gir ti reduksjoner over 252 dager ned til 9 mg, der åtte trinn på 1 mg er valgt av forskriveren (−5,56 % til −9,09 %). Skal godkjenningen ved lang behandlingstid gjelde hele kjeden, eller bare første reduksjon?',
      anbefalt: 'Hele kjeden. Hvert trinn er innenfor 5–10 % per trinn, som kontrolløren valgte for lang behandlingstid i P7-B, og hvert trinn har minst 28 dager og ny vurdering.',
    },
    {
      nr: '1.5',
      sporsmal: 'Skal den langsomme varianten for escitalopram (dråper 20 mg, én reduksjon til 19 mg, −5 %) godkjennes? Med både hovedregelen og den langsomme varianten godkjent må forskriveren velge strategien; hovedregelen stopper ved tidligere seponeringssymptomer, og den langsomme varianten krever at de er vurdert.',
      anbefalt: 'Ja, som én mulig reduksjon med revurdering, avgrenset slik som vortioksetin. Registreringen trenger den tekniske endringen i avsnitt 2.',
    },
    {
      nr: '1.6',
      sporsmal: 'Planene for amitriptylin og nortriptylin bruker bare hele tabletter, men noen trinn trenger flere tabletter (for eksempel 40 mg som 4 × 10 mg og 120 mg som 2 × 10 mg + 2 × 50 mg). Er det akseptabelt?',
      anbefalt: 'Ja. Det er hele tabletter i de kontrollerte styrkene uten deling, og sammensetningen står i planen. Verktøyet foreslår ingen pakning.',
    },
    {
      nr: '1.7',
      sporsmal: 'Skal godkjenningen registreres før tråd F har avklart kildefunnet i `rcpsych-stopping`?',
      anbefalt: 'Nei. Kontrollen kan gjøres nå, men registreringen bør vente til tråd F har slått fast at tempo og risikogrupper er uendret.',
    },
  ],
  kasus: [
    // --- Amitriptylin v12
    k1('F1-01', 'vanlig_dose', 'amitriptylin 50 mg, kort behandlingstid, før forskriveren har valgt', AMITRIPTYLIN, '50', stopp('amitriptylin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig.'), [40], { vdk2: 'K1-01' }),
    k1('F1-02', 'vanlig_dose', 'amitriptylin 50 mg, kort, forskriveren velger dosen som tilbys ved hvert trinn', AMITRIPTYLIN, '50', plan(STARTFORLOP, 'Dag 1–28: Amitriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))', 'Dag 29–56: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg', 'Dag 57–84: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))', 'Fra dag 85: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))'), [], { velger: [40, 25, 20] , vdk2: 'K1-02' }),
    k1('F1-03', 'vanlig_dose', 'amitriptylin 25 mg, kort, laveste startdose i omfanget', AMITRIPTYLIN, '25', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))'), [], { velger: [20] }),
    k1('F1-04', 'vanlig_dose', 'amitriptylin 150 mg, kort, høyeste startdose i omfanget', AMITRIPTYLIN, '150', plan(STARTFORLOP, 'Dag 1–28: Amitriptylin peroralt: 120 mg = 2 tabletter à 10 mg + 2 tabletter à 50 mg (valgt av forskriveren (beregnet 112,5 mg; −20 %))', 'Dag 29–56: Amitriptylin peroralt: 100 mg = 2 tabletter à 50 mg (valgt av forskriveren (beregnet 90 mg; −16,67 %))', 'Dag 57–84: Amitriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg', 'Dag 85–112: Amitriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))', 'Dag 113–140: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg', 'Dag 141–168: Amitriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))', 'Dag 169–196: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))', 'Dag 197–224: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))', 'Fra dag 225: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))'), [], { velger: [120, 100, 60, 35, 30, 25, 20] }),
    k1('F1-05', 'pasientforhold', 'amitriptylin 50 mg, lang behandlingstid', AMITRIPTYLIN, '50', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg'), [], { skjema: { svar: LANG }, vdk2: 'K1-03' }),
    k1('F1-06', 'pasientforhold', 'amitriptylin 75 mg, lang behandlingstid', AMITRIPTYLIN, '75', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Amitriptylin peroralt: 70 mg = 2 tabletter à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 67,5 mg; −6,67 %))'), [], { skjema: { svar: LANG }, velger: [70] }),
    k1('F1-07', 'uvanlig_dose', 'amitriptylin 100 mg, lang behandlingstid (utenfor omfanget)', AMITRIPTYLIN, '100', stopp(utenforOmfang(100), UTENFOR_OMFANG), [], { skjema: { svar: LANG } }),
    k1('F1-08', 'uvanlig_dose', 'amitriptylin 60 mg, kort (startdose utenfor omfanget)', AMITRIPTYLIN, '60', ingenPlan(utenforOmfang(60)), [], { vdk2: 'K1-06' }),
    k1('F1-09', 'uvanlig_dose', 'amitriptylin 10 mg, kort (laveste styrke)', AMITRIPTYLIN, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], { vdk2: 'K1-05' }),
    k1('F1-10', 'uvanlig_dose', 'amitriptylin 50 mg, kort, trinnstørrelsen endret til 20 %', AMITRIPTYLIN, '50', ingenPlan('Reduksjon per trinn (% av aktuell dose) 20 % er ikke verdien som er kontrollert (25 %), heller ikke med begrunnelse.', UTENFOR_OMFANG), [], { skjema: { justert: { [STI.prosent]: '20' } } }),
    k1('F1-11', 'pasientforhold', 'amitriptylin 50 mg, eldre eller hjerte- og karsykdom', AMITRIPTYLIN, '50', stopp(utenforOmfang(50), UTENFOR_OMFANG), [], { skjema: { svar: { eldre_hjerte: true } } }),
    k1('F1-12', 'pasientforhold', 'amitriptylin 50 mg, tidligere seponeringssymptomer', AMITRIPTYLIN, '50', stopp('Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen.'), [], { skjema: { pasientforhold: { tidligere_seponeringssymptomer: true } } }),
    k1('F1-13', 'ikke_godkjent', 'amitriptylin 50 mg, den langsomme varianten (ikke i forslaget)', AMITRIPTYLIN, '50', stopp('ikke et tilfelle godkjenningen kan gjelde for; ingen tilfeller er kontrollert', UTENFOR_OMFANG), [], { regel: { id: 'seponering-amitriptylin-langsom' }, vdk2: 'K1-04' }),
    k1('F1-14', 'interaksjon', 'amitriptylin 50 mg, organfunksjon og interaksjoner ikke vurdert', AMITRIPTYLIN, '50', stopp('Må bekreftes før beregning: Lever- og nyrefunksjon og interaksjoner er vurdert.'), [], { skjema: { bekreftet: ['startforslag'] } }),
    // --- Nortriptylin v12
    k1('F1-15', 'vanlig_dose', 'nortriptylin 50 mg, kort, forskriveren velger ved hvert trinn', NORTRIPTYLIN, '50', plan(STARTFORLOP, 'Dag 1–28: Nortriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))', 'Dag 29–56: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg', 'Dag 57–84: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))', 'Fra dag 85: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))'), [], { velger: [40, 25, 20] , vdk2: 'K1-07' }),
    k1('F1-16', 'vanlig_dose', 'nortriptylin 150 mg, kort', NORTRIPTYLIN, '150', plan(STARTFORLOP, 'Dag 1–28: Nortriptylin peroralt: 120 mg = 2 tabletter à 10 mg + 2 tabletter à 50 mg (valgt av forskriveren (beregnet 112,5 mg; −20 %))', 'Dag 29–56: Nortriptylin peroralt: 100 mg = 2 tabletter à 50 mg (valgt av forskriveren (beregnet 90 mg; −16,67 %))', 'Dag 57–84: Nortriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg', 'Dag 85–112: Nortriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))', 'Dag 113–140: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg', 'Dag 141–168: Nortriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))', 'Dag 169–196: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))', 'Dag 197–224: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))', 'Fra dag 225: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))'), [], { velger: [120, 100, 60, 35, 30, 25, 20] }),
    k1('F1-17', 'pasientforhold', 'nortriptylin 50 mg, lang behandlingstid', NORTRIPTYLIN, '50', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg'), [], { skjema: { svar: LANG } }),
    k1('F1-18', 'uvanlig_dose', 'nortriptylin 75 mg, kort (startdose utenfor omfanget)', NORTRIPTYLIN, '75', stopp(utenforOmfang(75), UTENFOR_OMFANG), [], { vdk2: 'K1-08' }),
    k1('F1-19', 'pasientforhold', 'nortriptylin 50 mg, eldre', NORTRIPTYLIN, '50', stopp(utenforOmfang(50), UTENFOR_OMFANG), [], { skjema: { svar: { eldre: true } } }),
    // --- Escitalopram v12 og den langsomme varianten v8
    k1('F1-20', 'vanlig_dose', 'escitalopram tablett 20 mg, kort', ESCITALOPRAM, '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Escitalopram peroralt: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg'), [], { skjema: form(TABLETT) , vdk2: 'K1-12' }),
    k1('F1-21', 'uvanlig_dose', 'escitalopram tablett 10 mg, kort (utenfor omfanget)', ESCITALOPRAM, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], { skjema: form(TABLETT) , vdk2: 'K1-13' }),
    k1('F1-22', 'uvanlig_dose', 'escitalopram tablett 20 mg, lang behandlingstid (utenfor omfanget)', ESCITALOPRAM, '20', stopp(utenforOmfang(20), UTENFOR_OMFANG), [], { skjema: { ...form(TABLETT), svar: LANG } }),
    k1('F1-23', 'vanlig_dose', 'escitalopram dråper 20 mg, kort, forskriveren velger ved hvert trinn', ESCITALOPRAM, '20', plan(STARTFORLOP, 'Dag 1–28: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg', 'Dag 29–56: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,25 mg; −20 %))', 'Dag 57–84: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg', 'Dag 85–112: Escitalopram peroralt: 7 mg = 7 dråper à 1 mg (valgt av forskriveren (beregnet 6,75 mg; −22,22 %))', 'Dag 113–140: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg (valgt av forskriveren (beregnet 5,25 mg; −14,29 %))', 'Dag 141–168: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))', 'Dag 169–196: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))', 'Fra dag 197: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg'), [], { skjema: form(DRAPER), velger: [12, 7, 6, 5, 4] , vdk2: 'K1-09' }),
    k1('F1-24', 'vanlig_dose', 'escitalopram dråper 10 mg, kort, forskriveren velger ved hvert trinn', ESCITALOPRAM, '10', plan(STARTFORLOP, 'Dag 1–28: Escitalopram peroralt: 8 mg = 8 dråper à 1 mg (valgt av forskriveren (beregnet 7,5 mg; −20 %))', 'Dag 29–56: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg', 'Dag 57–84: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))', 'Dag 85–112: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))', 'Fra dag 113: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg'), [], { skjema: form(DRAPER), velger: [8, 5, 4] }),
    k1('F1-25', 'pasientforhold', 'escitalopram dråper 20 mg, lang behandlingstid, før forskriveren har valgt', ESCITALOPRAM, '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Escitalopram peroralt: 18 mg = 18 dråper à 1 mg'), [17], { skjema: { ...form(DRAPER), svar: LANG }, vdk2: 'K1-10' }),
    k1('F1-26', 'pasientforhold', 'escitalopram dråper 20 mg, lang behandlingstid, forskriveren velger ved hvert trinn', ESCITALOPRAM, '20', plan(STARTFORLOP, 'Dag 1–28: Escitalopram peroralt: 18 mg = 18 dråper à 1 mg', 'Dag 29–56: Escitalopram peroralt: 17 mg = 17 dråper à 1 mg (valgt av forskriveren (beregnet 16,2 mg; −5,56 %))', 'Dag 57–84: Escitalopram peroralt: 16 mg = 16 dråper à 1 mg (valgt av forskriveren (beregnet 15,3 mg; −5,88 %))', 'Dag 85–112: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg (valgt av forskriveren (beregnet 14,4 mg; −6,25 %))', 'Dag 113–140: Escitalopram peroralt: 14 mg = 14 dråper à 1 mg (valgt av forskriveren (beregnet 13,5 mg; −6,67 %))', 'Dag 141–168: Escitalopram peroralt: 13 mg = 13 dråper à 1 mg (valgt av forskriveren (beregnet 12,6 mg; −7,14 %))', 'Dag 169–196: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,7 mg; −7,69 %))', 'Dag 197–224: Escitalopram peroralt: 11 mg = 11 dråper à 1 mg (valgt av forskriveren (beregnet 10,8 mg; −8,33 %))', 'Dag 225–252: Escitalopram peroralt: 10 mg = 10 dråper à 1 mg (valgt av forskriveren (beregnet 9,9 mg; −9,09 %))', 'Fra dag 253: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg'), [], { skjema: { ...form(DRAPER), svar: LANG }, velger: [17, 16, 15, 14, 13, 12, 11, 10] }),
    k1('F1-27', 'pasientforhold', 'escitalopram dråper 10 mg, lang behandlingstid', ESCITALOPRAM, '10', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg'), [], { skjema: { ...form(DRAPER), svar: LANG } }),
    k1('F1-28', 'uvanlig_dose', 'escitalopram dråper 15 mg, kort (startdose utenfor omfanget)', ESCITALOPRAM, '15', stopp(utenforOmfang(15), UTENFOR_OMFANG), [], { skjema: form(DRAPER) }),
    k1('F1-29', 'uvanlig_dose', 'escitalopram dråper 1 mg', ESCITALOPRAM, '1', stopp(utenforOmfang(1), UTENFOR_OMFANG), [], { skjema: form(DRAPER) , vdk2: 'K1-15' }),
    k1('F1-30', 'pasientforhold', 'escitalopram dråper 20 mg, 65 år eller eldre', ESCITALOPRAM, '20', stopp('Startdosen 20 mg er utenfor det regelen gjelder for (høyst 10 mg ved eldre over 65 år).', UTENFOR_OMFANG), [], { skjema: { ...form(DRAPER), svar: { eldre: true } }, vdk2: 'K1-14' }),
    k1('F1-31', 'pasientforhold', 'escitalopram dråper 20 mg, QT-forlengelse', ESCITALOPRAM, '20', stopp('Regelen gjelder ikke: Pasienten har kjent QT-forlengelse eller medfødt langt QT-syndrom, eller bruker et annet legemiddel som forlenger QT-intervallet.'), [], { skjema: { ...form(DRAPER), pasientforhold: { qt_forlengelse: true } } }),
    k1('F1-32', 'vanlig_dose', 'escitalopram dråper 20 mg, tidligere seponeringssymptomer (langsom variant)', ESCITALOPRAM_LANGSOM, '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Escitalopram peroralt: 19 mg = 19 dråper à 1 mg'), [], { skjema: form(DRAPER) , vdk2: 'K1-11' }),
    k1('F1-33', 'uvanlig_dose', 'escitalopram dråper 10 mg, langsom variant (utenfor omfanget)', ESCITALOPRAM_LANGSOM, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], { skjema: form(DRAPER) }),
    k1('F1-34', 'uvanlig_dose', 'escitalopram tablett 20 mg, langsom variant (utenfor omfanget)', ESCITALOPRAM_LANGSOM, '20', stopp(utenforOmfang(20), UTENFOR_OMFANG), [], { skjema: form(TABLETT) }),
    // --- Uten simulert godkjenning, endret regel og endrede preparater
    k1('F1-35', 'ikke_godkjent', 'amitriptylin slik verktøyet er i dag', AMITRIPTYLIN, '50', { utfall: 'ingen', status: 'ikke_godkjent' }, [], { regel: undefined }),
    k1('F1-36', 'ikke_godkjent', 'nortriptylin slik verktøyet er i dag', NORTRIPTYLIN, '50', { utfall: 'ingen', status: 'ikke_godkjent' }, [], { regel: undefined }),
    k1('F1-37', 'ikke_godkjent', 'escitalopram slik verktøyet er i dag', ESCITALOPRAM, '20', { utfall: 'ingen', status: 'ikke_godkjent' }, [], { regel: undefined }),
    k1('F1-38', 'regelendring', 'amitriptylin 100 mg med trinnlengden endret etter godkjenningen', AMITRIPTYLIN, '100', ingenPlan('Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke)'), [], { regel: endretEtter(AMITRIPTYLIN, 'trinnlengden 28 → 21 dager', (r) => { const f = r.plan.forlop[0]!.faser[0]!; if (f.type === 'nedtrapping') f.trinnlengde.verdi = 21 }) }),
    k1('F1-39', 'preparat', 'amitriptylin 50 mg, kort, 10 mg avregistrert', AMITRIPTYLIN, '50', stopp('amitriptylin (fra): styrken 10 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert.', UTENFOR_OMFANG), [], { fest: avregistrert('amitriptylin', 10) }),
    k1('F1-40', 'preparat', 'amitriptylin 50 mg, kort, ny styrke 20 mg i FEST', AMITRIPTYLIN, '50', plan(STARTFORLOP, 'Dag 1–28: Amitriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))', 'Dag 29–56: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg', 'Dag 57–84: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))', 'Fra dag 85: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))'), [], { fest: nyStyrke('amitriptylin', 10, 20, 'nytt'), velger: [40, 25, 20] }),
  ],
}

export const KONTROLLFORSLAG: readonly Kontrollforslag[] = [FORSLAG_1]

/* --- Rapporten ------------------------------------------------------------------ */

const fingerkort = (x: string) => `\`${x.slice(0, 12)}…\``

/** Kort navn på tilfellet: legemiddelformen og svarene som er ja. */
function tilfellenavn(r: Regel, o: Omfangsplan, uttrekkene: Uttrekkene): string {
  const form = o.form === null ? 'eneste form' : (uttrekkene.aksept.utvalg.merkevarer.find((m) => m.legemiddelform?.kode === o.form)?.legemiddelform?.tekst ?? `FEST-form ${o.form}`)
  const ja = (r.sporsmal ?? []).filter((x) => o.tilfelle.svar[x.id] === true).map((x) => x.ja)
  return `${form.toLowerCase()}, ${tall(o.startdose_mg)} mg, ${ja.length > 0 ? ja.join(' og ') : 'kort behandlingstid'}`
}

/** Siste dose i planen, eller `null` når ingen plan vises. */
const sisteDose = (u: Pilotutfall & { resultat?: { status: string } }) => {
  const res = (u as ReturnType<typeof kjorKasus>).resultat
  return u.utfall === 'plan' && res?.status === 'doseplan' ? (res.forlop[0]?.perioder.at(-1)?.mg ?? null) : null
}

function veitekst(v: Planvei): string {
  const valg = v.valg.length > 0 ? `${liste(v.valg.map((x) => `${valgtekst(x.trinn)} Valgt: ${tall(x.valgt)} mg.`))}\n\n` : 'Ingen trinn krever forskriverens valg.\n\n'
  const u = v.utfall
  const vist = u.utfall === 'plan' ? `${u.undertittel ? `*${u.undertittel}*\n\n` : ''}${liste(u.linjer)}` : `**Ingen plan vises** (${u.utfall}):\n\n${liste('grunner' in u ? u.grunner : [])}`
  return `${valg}${vist}`
}

const forventningstekst = (k: Kontrollkasus) => {
  const f = k.forventet
  const tilbys = k.tilbyr.length > 0 ? ` Tilbyr ${k.tilbyr.map((mg) => `${tall(mg)} mg`).join(', ')} for neste trinn.` : ''
  if (f.utfall === 'plan') return `Plan: ${f.linjer.map((l) => l.replace(/^(Fra dag \d+|Dag [\d–]+): [^:]+: /, '').replace(/ = .*$/, '')).join(' → ')}.${tilbys}`
  if (f.utfall === 'stopp') {
    const grunner = f.grunner.filter((g) => g !== 'Ingen klinisk doseplan kan vises.' && g !== UTENFOR_OMFANG).join(' ').replace(/\.$/, '')
    return `Ingen plan: ${grunner}${f.grunner.includes(UTENFOR_OMFANG) ? ' (utenfor omfanget)' : ''}.${tilbys}`
  }
  if (f.utfall === 'ingen') return `Verktøyet tilbyr ingen beregning (${f.status.replace('_', ' ')}).`
  return f.utfall
}

export function lagKontrollgrunnlag(f: Kontrollforslag, uttrekkene: Uttrekkene): string {
  const u = uttrekkene.aksept
  const regler = f.regler.map((k) => ({ k, r: regelMedId(k.id) }))
  const planer = omfangsplaner(f, uttrekkene)
  const alleValg = planer.flatMap((o) => o.veier.flatMap((v) => v.valg))
  const enDose = alleValg.every((v) => v.trinn.doser.length === 1)
  const identitet = tabell(
    ['Regel', 'Versjon', 'Fingeravtrykk', 'Status i dag', 'Vurdert av kontrolløren', 'Tekniske hindringer for en godkjenning'],
    regler.map(({ k, r }) => {
      // Kontrollørens vurdering av nøyaktig denne versjonen og dette innholdet, om den finnes.
      const vurdert = r.godkjenning.historikk.find((x) => x.status === 'ikke_godkjent' && x.rolle === 'uavhengig_kontrollor' && x.regelversjon === k.versjon && x.fingeravtrykk === k.fingeravtrykk)
      const hindringer = godkjenningshindringer(k, f.dato)
      return [
        `\`${k.id}\``,
        String(r.versjon === k.versjon ? k.versjon : `${r.versjon} (kontrollen gjelder ${k.versjon})`),
        fingeravtrykk(r) === k.fingeravtrykk ? `\`${k.fingeravtrykk}\`` : `**endret:** ${fingerkort(fingeravtrykk(r))} (kontrollen gjelder ${fingerkort(k.fingeravtrykk)})`,
        KONTROLLUTFALL[kontrollutfall(r)],
        vurdert ? `ja, ${norskDato(vurdert.dato)}` : '**nei**',
        hindringer.length === 0 ? 'ingen' : hindringer.join(' '),
      ]
    }),
  )
  const oversikt = tabell(
    ['Regel', 'Tilfelle', 'Planer', 'Reduksjoner', 'Valg forskriveren gjør', 'Siste dose', 'Undertittel'],
    planer.flatMap((o) => {
      const r = regelMedId(o.regel.id)
      return o.veier.map((v) => {
        const n = v.utfall.utfall === 'plan' ? v.utfall.linjer.length : 0
        const siste = sisteDose(v.utfall)
        return [`\`${o.regel.id}\``, tilfellenavn(r, o, uttrekkene), String(o.veier.length), String(n), String(v.valg.length), siste === null ? '–' : `${tall(siste)} mg`, v.utfall.utfall === 'plan' ? (v.utfall.undertittel ?? '–') : 'ingen plan']
      })
    }),
  )
  const detaljer = planer
    .map((o) => {
      const r = regelMedId(o.regel.id)
      const veier = o.veier.length === 1 ? veitekst(o.veier[0]!) : o.veier.map((v, i) => `**Plan ${i + 1}.**\n\n${veitekst(v)}`).join('\n\n')
      return `#### ${r.tittel}: ${tilfellenavn(r, o, uttrekkene)}\n\n${veier}`
    })
    .join('\n\n')
  const regelavsnitt = regler
    .map(({ k, r }) => {
      const betingelser = [
        ...r.bekreftelser.map((b) => `Må bekreftes (\`${b.id}\`)${inndatavilkar(b, r.sporsmal)}: ${b.tekst} (${grunnlag(b.grunnlag)})`),
        ...r.unntak.map((x) => `Unntak (\`${x.id}\`): ${x.tekst} (${grunnlag(x.grunnlag)})`),
        ...(r.sporsmal ?? []).map((x) => `Må besvares (\`${x.id}\`): ${x.tekst}${x.krever_begrunnelse ? ' Et ja krever en skriftlig begrunnelse.' : ''} (${grunnlag(x.grunnlag)})`),
      ]
      const omfang = r.klinisk_omfang?.tilfeller.map((t) => tilfelletekst(r, t)) ?? []
      return `### ${r.tittel}

\`${k.id}\`, versjon ${k.versjon}. Hele regelen med parametre og regneeksempler står i \`docs/verktøy-p7-regelutkast.md\`.

**Det som følger direkte av kildene:**

${liste(r.fortolkning.kildetro.map(utsagn))}

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

${liste(r.fortolkning.tilpasninger.map(utsagn))}

**Betingelser:**

${liste(betingelser)}

**Klinisk omfang** (en godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring):

${liste(omfang)}`
    })
    .join('\n\n')
  const kasus = tabell(
    ['ID', 'VDK-2', 'Hva', 'Regel', 'Forventet', 'Resultat'],
    f.kasus.map((k) => {
      const avvik = kontrollavvik(k, uttrekkene)
      const regel = k.regel ? `${k.regel.id}${k.regel.endre ? ` (${k.regel.endre.hva})` : ''}` : 'den verktøyet tilbyr i dag'
      return [k.id, k.vdk2 ?? '–', `${k.hva}${k.velger?.length ? `; forskriveren velger ${k.velger.map((mg) => `${tall(mg)} mg`).join(', ')}` : ''}`, regel, forventningstekst(k), avvik.length === 0 ? 'som forventet' : `**avvik:** ${avvik.join(' ')}`]
    }),
  )
  return `<!-- Laget av \`npm run verktoy:regler -- kontrollgrunnlag\`; rediger ikke for hånd. -->
# VDK-3, forslag ${f.nr}: kontrollgrunnlag

**${f.tittel}.** Grunnlag for uavhengig faglig kontroll av forslag ${f.nr} i \`docs/verktøy-vdk2-prioritering.md\`, laget ${norskDato(f.dato)}.

**Ingen regel er godkjent eller aktivert, og denne PR-en endrer ingen regel.** Verktøyet tilbyr i dag ingen beregning for disse reglene (kasus ${f.kasus.filter((k) => !k.regel).map((k) => k.id).join(', ')}). For å vise hva verktøyet ville vist om nøyaktig disse versjonene ble godkjent, er planene under regnet på en kopi av hver regel med en simulert godkjenning («${SIMULERT_KONTROLLOR}»), gjennom den samme veien som verktøysiden og med de norske preparatene i FEST-uttrekket hentet ${norskDato(u.hentet.slice(0, 10))}. Kopien lagres ikke og brukes ikke av appen. En plan som ikke når sluttmålet (en delplan), står her slik motoren beregner den, for kontrollens skyld: verktøysiden viser aldri en delplan, men «Komplett plan ikke tilgjengelig» med grunnen (Peders beslutning 03.11.2026). Kasusene er syntetiske; pasientopplysninger inngår ikke, og ingen tekst fra Psychiatrienet vises.

${f.avgrensning ? `**Kontrollørens avgrensning ${norskDato(f.avgrensning.dato)} (ChatGPT):** ${f.avgrensning.tekst}\n\n` : ''}## 1. Regelversjonene til kontroll

Kontrolløren bes vurdere hver regel for nøyaktig versjonen og fingeravtrykket i tabellen, i det kliniske omfanget i avsnitt 4. «Tekniske hindringer» er det som ville stoppet en registrert godkjenning utenom selve kontrollen, som åpne valg uten avklaring.

${identitet}

## 2. Før en godkjenning kan registreres

${liste(f.forutsetninger)}

## 3. Spørsmål til kontrolløren

${tabell(['#', 'Spørsmål', 'Anbefalt svar'], f.sporsmal.map((x) => [x.nr, x.sporsmal, x.anbefalt]))}

## 4. Reglene

${regelavsnitt}

## 5. Alle planer i det kliniske omfanget

Hver startdose i hvert tilfelle i reglenes kliniske omfang, med hver plan forskriverens valg kan gi: ved hvert trinn som ikke kan gis nøyaktig, er hver dose som tilbys, fulgt. ${enDose ? `I alle ${alleValg.length} valgene tilbys nøyaktig én dose, så hver startdose gir én plan.` : 'Noen valg tilbyr flere doser, og hver gir sin egen plan.'} Radene er slik planen og kopien av den ville stått om delplaner ble vist; dagene er minstetider, og hvert trinn forutsetter en ny vurdering.

${oversikt}

${detaljer}

## 6. Syntetiske testkasus

Kasusene går gjennom den samme veien som verktøysiden og kjøres i testene (\`src/__tests__/verktoyvdk3.test.ts\`). De prøver grensene for omfanget: startdoser like utenfor, lang behandlingstid, pasientgruppe, unntak, endret trinnstørrelse, den langsomme varianten, en endret regel og endrede preparater. Kolonnen VDK-2 viser testkasuset i planen hvert kasus gjør til en test; F1-numrene erstatter K1-numrene. Uten annen merknad er regelen den simulert godkjente kopien, organfunksjon og interaksjoner er bekreftet, og svaret er nei på alle unntak og spørsmål.

${kasus}
`
}
