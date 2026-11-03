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
import { alleGrunnlag, type Klinisktilfelle, type Regel, type Regelsett } from './regler/modell'
import { K1_DATO } from './regler/avslutning'
import { STI } from './regler/nedtrapping'
import { ETTER_RETTELSENE } from './kontrollsett'
import { avregistrert, avvikFra, kjorKasus, type Kontrollregel, nyStyrke, type Pilotkasus, type Pilotutfall, SIMULERT_KONTROLLOR, simulerGodkjenning, type Uttrekkene } from './regler/pilotmatrise'
import { grunnlag, liste, tabell, tall, utsagn } from './regler/rapport'
import { DELPLAN, EN_FORSTE_REDUKSJON, KOMPLETT, STARTFORLOP } from './planvisning'
import { tilfelletekst, UTENFOR_OMFANG } from './motor/plan'
import { REGELSETT, REGELSETTENE, samlet, type Verktoyvalg } from './tilgjengelighet'

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
  /** Regelsettene kasuset kjøres med, når de ikke er settene appen bruker nå (et grunnlag for eldre versjoner). */
  settene?: readonly Regelsett[]
  tilbyr: number[]
  /** Planutfallet planen skal vise ({@link planutfallstekst}), når kasuset sier det. */
  planutfall?: string
  /** Testkasuset i en plan kasuset gjør til en test (kolonnen {@link Kontrollforslag.refkolonne}), f.eks. i `docs/verktøy-vdk2-prioritering.md`. */
  ref?: string
}

export interface Kontrollforslag {
  nr: number
  tittel: string
  fil: string
  /** Dagen grunnlaget ble laget; den simulerte godkjenningen dateres hit. */
  dato: string
  verktoy: string
  /**
   * Regelsettene grunnlaget er laget med, når de ikke er settene appen bruker
   * nå: et grunnlag for versjoner som senere er erstattet, kan fortsatt
   * etterprøves mot nøyaktig versjonene det gjaldt.
   */
  settene?: readonly Regelsett[]
  regler: Kontrollregel[]
  /** Overskriften; standard «VDK-3, forslag N: kontrollgrunnlag». */
  overskrift?: string
  /** Avsnittene under overskriften, med datoen FEST-uttrekket er hentet; standard innledningen til et VDK-3-forslag. */
  innledning?: (festHentet: string) => string[]
  /** Egne avsnitt etter spørsmålene til kontrolløren. */
  avsnitt?: { tittel: string; tekst: string }[]
  /** Innledningen til de syntetiske testkasusene; standard teksten for et VDK-3-forslag. */
  kasusinnledning?: string
  /** Kolonnen med testkasuset i planen hvert kasus gjør til en test ({@link Kontrollkasus.ref}); standard «VDK-2». */
  refkolonne?: string
  /** Om oversikten og planene viser planutfallet: komplett plan til sluttmålet eller delplan. */
  visPlanutfall?: boolean
  /** Om planene regnes med en simulert avklaring av regelens åpne valg i tillegg til den simulerte godkjenningen ({@link somGodkjent}). */
  simulerAvklaring?: boolean
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
 *
 * Med `avklar` får hvert åpent valg i kopien først en simulert avklaring, som
 * om kontrolløren godtok det som foreslått; godkjenningen gjelder da kopien
 * med avklaringene, men bare når regelen før avklaringene er nøyaktig
 * versjonen under kontroll.
 */
export function somGodkjent(k: Kontrollregel, dato: string, avklar = false): NonNullable<Pilotkasus['regel']> {
  if (!avklar) return { id: k.id, endre: { hva: `simulert klinisk godkjenning av versjon ${k.versjon}, bare på en kopi`, endre: (r: Regel) => simulerGodkjenning(r, k, dato) } }
  return {
    id: k.id,
    endre: {
      hva: `simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon ${k.versjon}, bare på en kopi`,
      endre: (r: Regel) => {
        const uendret = fingeravtrykk(r) === k.fingeravtrykk
        simulerAvklaringer(r, dato)
        simulerGodkjenning(r, uendret ? { ...k, fingeravtrykk: fingeravtrykk(r) } : k, dato)
      },
    },
  }
}

/** Hvert åpent valg i regelen (på en kopi) avklart av den simulerte kontrolløren, som foreslått. */
function simulerAvklaringer(r: Regel, dato: string): void {
  for (const [, g] of alleGrunnlag(r))
    if (g.type === 'ousfar_vurdering' && !g.avklaring)
      g.avklaring = { dato, av: SIMULERT_KONTROLLOR, rolle: 'uavhengig_kontrollor', regelversjon: r.versjon, merknad: 'Simulert for å vise hva verktøyet ville vist; ingen avklaring.' }
}

const regelMedId = (id: string, settene: readonly Regelsett[] = REGELSETTENE) => {
  const r = (settene === REGELSETTENE ? REGELSETT : samlet(settene)).regler.find((x) => x.id === id)
  if (!r) throw new Error(`Regelen ${id} finnes ikke.`)
  return r
}

/** Det som ville hindret en registrert godkjenning av versjonen, utenom selve kontrollen; tom når ingenting gjør det. */
export function godkjenningshindringer(k: Kontrollregel, dato: string, settene?: readonly Regelsett[]): string[] {
  const r = structuredClone(regelMedId(k.id, settene))
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
  const kjor = () => kjorKasus({ ...k, skjema: { ...k.skjema, trinnvalg } }, uttrekkene, k.settene)
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
    ...(k.planutfall === undefined || planutfallstekst(u) === k.planutfall ? [] : [`planutfallet er «${planutfallstekst(u)}», ventet «${k.planutfall}»`]),
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
  const r = regelMedId(k.id, f.settene)
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
    regel: somGodkjent(k, f.dato, f.simulerAvklaring),
    forventet: { utfall: 'sperret' },
  }
  const forsok = kjorKasus(grunn, uttrekkene, f.settene)
  const formvalg = forsok.utfall === 'formvalg' && form ? Object.fromEntries(forsok.forlop.map((id) => [id, { legemiddelform: form }])) : {}
  const veier: Planvei[] = []
  const folg = (valg: Planvalg[]) => {
    const trinnvalg = valg.map((v) => ({ forlop: v.trinn.forlop, trinn: v.trinn.trinn, fra_mg: v.trinn.fra_mg, mg: v.valgt }))
    const u = kjorKasus({ ...grunn, skjema: { ...grunn.skjema, formvalg, trinnvalg } }, uttrekkene, f.settene)
    const t = u.resultat?.trinnvalg?.[0]
    if (!t || valg.length >= MAKS_VALG) return void veier.push({ valg, utfall: u })
    for (const d of t.doser) folg([...valg, { trinn: t, valgt: d.mg }])
  }
  folg([])
  return { regel: k, tilfelle, startdose_mg, form, veier }
}

export function omfangsplaner(f: Kontrollforslag, uttrekkene: Uttrekkene): Omfangsplan[] {
  return f.regler.flatMap((k) => (regelMedId(k.id, f.settene).klinisk_omfang?.tilfeller ?? []).flatMap((t) => t.startdoser.map((mg) => planerFor(f, k, t, mg, uttrekkene))))
}

/* --- Forslag 1 ------------------------------------------------------------------ */

const SEPONERING = 'trappe-ned-antidepressiv'

const AMITRIPTYLIN: Kontrollregel = { id: 'seponering-amitriptylin', versjon: 12, fingeravtrykk: 'a43c1164e4061a1757fefea381da027b8cefe92c077d742855fd4e2f5486b6e3' }
const NORTRIPTYLIN: Kontrollregel = { id: 'seponering-nortriptylin', versjon: 12, fingeravtrykk: '300a71b147bf87eb61dbeaeccd27aa07add900435b579c14291061f38f63616c' }
const ESCITALOPRAM: Kontrollregel = { id: 'seponering-escitalopram', versjon: 12, fingeravtrykk: '7710be648e96682c1c8a35a8e4d9c4428109b294f29b63ae9401ef29b41bd3c1' }
const ESCITALOPRAM_LANGSOM: Kontrollregel = { id: 'seponering-escitalopram-langsom', versjon: 8, fingeravtrykk: '4e49c175ac6aa49cba89d7db711f710c14b654681cc3138994dbaaaebb69c095' }

const DATO_1 = '2026-11-03'
/** Regelsettene forslag 1 ble kontrollert med: nedtrappingsreglene før K1 ga escitalopram, nortriptylin, amitriptylin og sertralin en ny versjon. */
const SETTENE_1 = ETTER_RETTELSENE
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
const endretEtter = (k: Kontrollregel, hva: string, endre: (r: Regel) => void, dato = DATO_1, avklar = false): NonNullable<Pilotkasus['regel']> => {
  const g = somGodkjent(k, dato, avklar)
  return { id: k.id, endre: { hva: `${g.endre!.hva}; deretter ${hva}`, endre: (r) => (g.endre!.endre(r), endre(r)) } }
}

/**
 * Kasus for et forslag i nedtrappingsverktøyet: `regel` er den simulerte
 * godkjenningen av regelen (med simulert avklaring når `avklar`), med mindre
 * kasuset sier noe annet.
 */
const kasusFor =
  (dato: string, settene?: readonly Regelsett[], avklar = false) =>
  (id: string, kategori: Pilotkasus['kategori'], hva: string, r: Kontrollregel, dose: string, forventning: Pilotkasus['forventet'] & { planutfall?: string }, tilbyr: number[] = [], x: Partial<Kontrollkasus> = {}): Kontrollkasus => {
    const { planutfall, ...forventet } = forventning
    return {
      id,
      kategori,
      hva,
      verktoy: SEPONERING,
      valg: valgFor(regelMedId(r.id, settene)),
      uttrekk: 'aksept',
      dose,
      ...(settene && { settene }),
      regel: somGodkjent(r, dato, avklar),
      forventet: forventet as Pilotkasus['forventet'],
      tilbyr,
      ...(planutfall && { planutfall }),
      ...x,
    }
  }

const k1 = kasusFor(DATO_1, SETTENE_1)

export const FORSLAG_1: Kontrollforslag = {
  nr: 1,
  tittel: 'Kontroll av eksisterende nedtrappingsregler i eksisterende omfang',
  fil: 'docs/verktøy-vdk3-forslag1-kontrollgrunnlag.md',
  dato: DATO_1,
  verktoy: SEPONERING,
  settene: SETTENE_1,
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
    k1('F1-01', 'vanlig_dose', 'amitriptylin 50 mg, kort behandlingstid, før forskriveren har valgt', AMITRIPTYLIN, '50', stopp('amitriptylin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig.'), [40], { ref: 'K1-01' }),
    k1('F1-02', 'vanlig_dose', 'amitriptylin 50 mg, kort, forskriveren velger dosen som tilbys ved hvert trinn', AMITRIPTYLIN, '50', plan(STARTFORLOP, 'Dag 1–28: Amitriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))', 'Dag 29–56: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg', 'Dag 57–84: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))', 'Fra dag 85: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))'), [], { velger: [40, 25, 20] , ref: 'K1-02' }),
    k1('F1-03', 'vanlig_dose', 'amitriptylin 25 mg, kort, laveste startdose i omfanget', AMITRIPTYLIN, '25', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))'), [], { velger: [20] }),
    k1('F1-04', 'vanlig_dose', 'amitriptylin 150 mg, kort, høyeste startdose i omfanget', AMITRIPTYLIN, '150', plan(STARTFORLOP, 'Dag 1–28: Amitriptylin peroralt: 120 mg = 2 tabletter à 10 mg + 2 tabletter à 50 mg (valgt av forskriveren (beregnet 112,5 mg; −20 %))', 'Dag 29–56: Amitriptylin peroralt: 100 mg = 2 tabletter à 50 mg (valgt av forskriveren (beregnet 90 mg; −16,67 %))', 'Dag 57–84: Amitriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg', 'Dag 85–112: Amitriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))', 'Dag 113–140: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg', 'Dag 141–168: Amitriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))', 'Dag 169–196: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))', 'Dag 197–224: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))', 'Fra dag 225: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))'), [], { velger: [120, 100, 60, 35, 30, 25, 20] }),
    k1('F1-05', 'pasientforhold', 'amitriptylin 50 mg, lang behandlingstid', AMITRIPTYLIN, '50', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg'), [], { skjema: { svar: LANG }, ref: 'K1-03' }),
    k1('F1-06', 'pasientforhold', 'amitriptylin 75 mg, lang behandlingstid', AMITRIPTYLIN, '75', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Amitriptylin peroralt: 70 mg = 2 tabletter à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 67,5 mg; −6,67 %))'), [], { skjema: { svar: LANG }, velger: [70] }),
    k1('F1-07', 'uvanlig_dose', 'amitriptylin 100 mg, lang behandlingstid (utenfor omfanget)', AMITRIPTYLIN, '100', stopp(utenforOmfang(100), UTENFOR_OMFANG), [], { skjema: { svar: LANG } }),
    k1('F1-08', 'uvanlig_dose', 'amitriptylin 60 mg, kort (startdose utenfor omfanget)', AMITRIPTYLIN, '60', ingenPlan(utenforOmfang(60)), [], { ref: 'K1-06' }),
    k1('F1-09', 'uvanlig_dose', 'amitriptylin 10 mg, kort (laveste styrke)', AMITRIPTYLIN, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], { ref: 'K1-05' }),
    k1('F1-10', 'uvanlig_dose', 'amitriptylin 50 mg, kort, trinnstørrelsen endret til 20 %', AMITRIPTYLIN, '50', ingenPlan('Reduksjon per trinn (% av aktuell dose) 20 % er ikke verdien som er kontrollert (25 %), heller ikke med begrunnelse.', UTENFOR_OMFANG), [], { skjema: { justert: { [STI.prosent]: '20' } } }),
    k1('F1-11', 'pasientforhold', 'amitriptylin 50 mg, eldre eller hjerte- og karsykdom', AMITRIPTYLIN, '50', stopp(utenforOmfang(50), UTENFOR_OMFANG), [], { skjema: { svar: { eldre_hjerte: true } } }),
    k1('F1-12', 'pasientforhold', 'amitriptylin 50 mg, tidligere seponeringssymptomer', AMITRIPTYLIN, '50', stopp('Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen.'), [], { skjema: { pasientforhold: { tidligere_seponeringssymptomer: true } } }),
    k1('F1-13', 'ikke_godkjent', 'amitriptylin 50 mg, den langsomme varianten (ikke i forslaget)', AMITRIPTYLIN, '50', stopp('ikke et tilfelle godkjenningen kan gjelde for; ingen tilfeller er kontrollert', UTENFOR_OMFANG), [], { regel: { id: 'seponering-amitriptylin-langsom' }, ref: 'K1-04' }),
    k1('F1-14', 'interaksjon', 'amitriptylin 50 mg, organfunksjon og interaksjoner ikke vurdert', AMITRIPTYLIN, '50', stopp('Må bekreftes før beregning: Lever- og nyrefunksjon og interaksjoner er vurdert.'), [], { skjema: { bekreftet: ['startforslag'] } }),
    // --- Nortriptylin v12
    k1('F1-15', 'vanlig_dose', 'nortriptylin 50 mg, kort, forskriveren velger ved hvert trinn', NORTRIPTYLIN, '50', plan(STARTFORLOP, 'Dag 1–28: Nortriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))', 'Dag 29–56: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg', 'Dag 57–84: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))', 'Fra dag 85: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))'), [], { velger: [40, 25, 20] , ref: 'K1-07' }),
    k1('F1-16', 'vanlig_dose', 'nortriptylin 150 mg, kort', NORTRIPTYLIN, '150', plan(STARTFORLOP, 'Dag 1–28: Nortriptylin peroralt: 120 mg = 2 tabletter à 10 mg + 2 tabletter à 50 mg (valgt av forskriveren (beregnet 112,5 mg; −20 %))', 'Dag 29–56: Nortriptylin peroralt: 100 mg = 2 tabletter à 50 mg (valgt av forskriveren (beregnet 90 mg; −16,67 %))', 'Dag 57–84: Nortriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg', 'Dag 85–112: Nortriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))', 'Dag 113–140: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg', 'Dag 141–168: Nortriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))', 'Dag 169–196: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))', 'Dag 197–224: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))', 'Fra dag 225: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))'), [], { velger: [120, 100, 60, 35, 30, 25, 20] }),
    k1('F1-17', 'pasientforhold', 'nortriptylin 50 mg, lang behandlingstid', NORTRIPTYLIN, '50', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg'), [], { skjema: { svar: LANG } }),
    k1('F1-18', 'uvanlig_dose', 'nortriptylin 75 mg, kort (startdose utenfor omfanget)', NORTRIPTYLIN, '75', stopp(utenforOmfang(75), UTENFOR_OMFANG), [], { ref: 'K1-08' }),
    k1('F1-19', 'pasientforhold', 'nortriptylin 50 mg, eldre', NORTRIPTYLIN, '50', stopp(utenforOmfang(50), UTENFOR_OMFANG), [], { skjema: { svar: { eldre: true } } }),
    // --- Escitalopram v12 og den langsomme varianten v8
    k1('F1-20', 'vanlig_dose', 'escitalopram tablett 20 mg, kort', ESCITALOPRAM, '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Escitalopram peroralt: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg'), [], { skjema: form(TABLETT) , ref: 'K1-12' }),
    k1('F1-21', 'uvanlig_dose', 'escitalopram tablett 10 mg, kort (utenfor omfanget)', ESCITALOPRAM, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], { skjema: form(TABLETT) , ref: 'K1-13' }),
    k1('F1-22', 'uvanlig_dose', 'escitalopram tablett 20 mg, lang behandlingstid (utenfor omfanget)', ESCITALOPRAM, '20', stopp(utenforOmfang(20), UTENFOR_OMFANG), [], { skjema: { ...form(TABLETT), svar: LANG } }),
    k1('F1-23', 'vanlig_dose', 'escitalopram dråper 20 mg, kort, forskriveren velger ved hvert trinn', ESCITALOPRAM, '20', plan(STARTFORLOP, 'Dag 1–28: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg', 'Dag 29–56: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,25 mg; −20 %))', 'Dag 57–84: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg', 'Dag 85–112: Escitalopram peroralt: 7 mg = 7 dråper à 1 mg (valgt av forskriveren (beregnet 6,75 mg; −22,22 %))', 'Dag 113–140: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg (valgt av forskriveren (beregnet 5,25 mg; −14,29 %))', 'Dag 141–168: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))', 'Dag 169–196: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))', 'Fra dag 197: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg'), [], { skjema: form(DRAPER), velger: [12, 7, 6, 5, 4] , ref: 'K1-09' }),
    k1('F1-24', 'vanlig_dose', 'escitalopram dråper 10 mg, kort, forskriveren velger ved hvert trinn', ESCITALOPRAM, '10', plan(STARTFORLOP, 'Dag 1–28: Escitalopram peroralt: 8 mg = 8 dråper à 1 mg (valgt av forskriveren (beregnet 7,5 mg; −20 %))', 'Dag 29–56: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg', 'Dag 57–84: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))', 'Dag 85–112: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))', 'Fra dag 113: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg'), [], { skjema: form(DRAPER), velger: [8, 5, 4] }),
    k1('F1-25', 'pasientforhold', 'escitalopram dråper 20 mg, lang behandlingstid, før forskriveren har valgt', ESCITALOPRAM, '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Escitalopram peroralt: 18 mg = 18 dråper à 1 mg'), [17], { skjema: { ...form(DRAPER), svar: LANG }, ref: 'K1-10' }),
    k1('F1-26', 'pasientforhold', 'escitalopram dråper 20 mg, lang behandlingstid, forskriveren velger ved hvert trinn', ESCITALOPRAM, '20', plan(STARTFORLOP, 'Dag 1–28: Escitalopram peroralt: 18 mg = 18 dråper à 1 mg', 'Dag 29–56: Escitalopram peroralt: 17 mg = 17 dråper à 1 mg (valgt av forskriveren (beregnet 16,2 mg; −5,56 %))', 'Dag 57–84: Escitalopram peroralt: 16 mg = 16 dråper à 1 mg (valgt av forskriveren (beregnet 15,3 mg; −5,88 %))', 'Dag 85–112: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg (valgt av forskriveren (beregnet 14,4 mg; −6,25 %))', 'Dag 113–140: Escitalopram peroralt: 14 mg = 14 dråper à 1 mg (valgt av forskriveren (beregnet 13,5 mg; −6,67 %))', 'Dag 141–168: Escitalopram peroralt: 13 mg = 13 dråper à 1 mg (valgt av forskriveren (beregnet 12,6 mg; −7,14 %))', 'Dag 169–196: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,7 mg; −7,69 %))', 'Dag 197–224: Escitalopram peroralt: 11 mg = 11 dråper à 1 mg (valgt av forskriveren (beregnet 10,8 mg; −8,33 %))', 'Dag 225–252: Escitalopram peroralt: 10 mg = 10 dråper à 1 mg (valgt av forskriveren (beregnet 9,9 mg; −9,09 %))', 'Fra dag 253: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg'), [], { skjema: { ...form(DRAPER), svar: LANG }, velger: [17, 16, 15, 14, 13, 12, 11, 10] }),
    k1('F1-27', 'pasientforhold', 'escitalopram dråper 10 mg, lang behandlingstid', ESCITALOPRAM, '10', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg'), [], { skjema: { ...form(DRAPER), svar: LANG } }),
    k1('F1-28', 'uvanlig_dose', 'escitalopram dråper 15 mg, kort (startdose utenfor omfanget)', ESCITALOPRAM, '15', stopp(utenforOmfang(15), UTENFOR_OMFANG), [], { skjema: form(DRAPER) }),
    k1('F1-29', 'uvanlig_dose', 'escitalopram dråper 1 mg', ESCITALOPRAM, '1', stopp(utenforOmfang(1), UTENFOR_OMFANG), [], { skjema: form(DRAPER) , ref: 'K1-15' }),
    k1('F1-30', 'pasientforhold', 'escitalopram dråper 20 mg, 65 år eller eldre', ESCITALOPRAM, '20', stopp('Startdosen 20 mg er utenfor det regelen gjelder for (høyst 10 mg ved eldre over 65 år).', UTENFOR_OMFANG), [], { skjema: { ...form(DRAPER), svar: { eldre: true } }, ref: 'K1-14' }),
    k1('F1-31', 'pasientforhold', 'escitalopram dråper 20 mg, QT-forlengelse', ESCITALOPRAM, '20', stopp('Regelen gjelder ikke: Pasienten har kjent QT-forlengelse eller medfødt langt QT-syndrom, eller bruker et annet legemiddel som forlenger QT-intervallet.'), [], { skjema: { ...form(DRAPER), pasientforhold: { qt_forlengelse: true } } }),
    k1('F1-32', 'vanlig_dose', 'escitalopram dråper 20 mg, tidligere seponeringssymptomer (langsom variant)', ESCITALOPRAM_LANGSOM, '20', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Escitalopram peroralt: 19 mg = 19 dråper à 1 mg'), [], { skjema: form(DRAPER) , ref: 'K1-11' }),
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

/* --- K1: nedtrapping til seponering --------------------------------------------- */

const K1_AMITRIPTYLIN: Kontrollregel = { id: 'seponering-amitriptylin', versjon: 13, fingeravtrykk: 'b2af54866d179898436bcd1a1cdbcfb680b40cdf863ca4b2733d9c191c8dd330' }
const K1_NORTRIPTYLIN: Kontrollregel = { id: 'seponering-nortriptylin', versjon: 13, fingeravtrykk: '924e9ca1f319b03a412edcf769ee37e9f48ac24ee98388e7a5807a316aa58728' }
const K1_ESCITALOPRAM: Kontrollregel = { id: 'seponering-escitalopram', versjon: 13, fingeravtrykk: '4c5529f5bc5432b55ad18f89536cc8378c908460ed67b1a8c73bdd5d9f1b65e0' }
const K1_SERTRALIN: Kontrollregel = { id: 'seponering-sertralin', versjon: 13, fingeravtrykk: '15981a63e41e5be569b7c05300a4bb75aed90b080e5c660db0b1af63b9b950fc' }

const DATO_K1 = K1_DATO
/** Kasus for K1: reglene appen bruker, med simulert avklaring av de åpne valgene og simulert godkjenning. */
const kk = kasusFor(DATO_K1, undefined, true)
/** Kasus for K1 med bare den simulerte godkjenningen, uten avklaringene. */
const kkUtenAvklaring = kasusFor(DATO_K1)

/** Vurderingspunktet før hver doseendring og etter siste dose, slik planen viser det (regelen i `regler/avslutning.ts`). */
const FOR_ENDRING = 'Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.'
const ETTER_SISTE = 'Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.'
const startdag = (linje: string) => Number(/^(?:Dag|Fra dag) (\d+)/.exec(linje)![1])
/** Radene i planen: doseradene, med vurderingspunktet før hver endring, og etter seponeringen vurderingen 28 dager etter siste dose. */
const medVurderinger = (navn: string, doser: string[], seponert?: number) => [
  ...doser.flatMap((l, i) => (i === 0 ? [l] : [`Dag ${startdag(l)}: Vurdering (${navn}): ${FOR_ENDRING}`, l])),
  ...(seponert ? [`Dag ${seponert}: Vurdering (${navn}): ${FOR_ENDRING}`, `Fra dag ${seponert}: ${navn} peroralt: Seponert`, `Dag ${seponert - 1 + 28}: Vurdering (${navn}): ${ETTER_SISTE}`] : []),
]
/** En komplett plan til seponering: ingen undertittel, og planutfallet sier når legemidlet er seponert. */
const komplett = (navn: string, seponert: number, doser: string[]) => ({ ...plan(null, ...medVurderinger(navn, doser, seponert)), planutfall: `${KOMPLETT}: ${navn} seponert fra dag ${seponert}.` })
/** En delplan, med undertittelen og hva planen ikke dekker. */
const delplan = (navn: string, undertittel: string, ikkeDekket: string, doser: string[]) => ({ ...plan(undertittel, ...medVurderinger(navn, doser)), planutfall: `${DELPLAN}: ${navn}: ${ikkeDekket}.` })
const EN_REDUKSJON_IKKE_DEKKET = 'én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene'
/** Hva en delplan som stopper over grensen for avslutningen, ikke dekker. */
const overGrensen = (fra: number, star: number) => `neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra ${tall(fra)} mg eller lavere (planen står på ${tall(star)} mg)`

const NOR_20 = (dager: string) => `${dager}: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))`
const NOR_50 = [
  'Dag 1–28: Nortriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))',
  'Dag 29–56: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg',
  'Dag 57–84: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))',
  NOR_20('Dag 85–112'),
]
const NOR_150 = [
  'Dag 1–28: Nortriptylin peroralt: 120 mg = 2 tabletter à 10 mg + 2 tabletter à 50 mg (valgt av forskriveren (beregnet 112,5 mg; −20 %))',
  'Dag 29–56: Nortriptylin peroralt: 100 mg = 2 tabletter à 50 mg (valgt av forskriveren (beregnet 90 mg; −16,67 %))',
  'Dag 57–84: Nortriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg',
  'Dag 85–112: Nortriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))',
  'Dag 113–140: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg',
  'Dag 141–168: Nortriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))',
  'Dag 169–196: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))',
  'Dag 197–224: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))',
  NOR_20('Dag 225–252'),
]
const AMI_50 = [
  'Dag 1–28: Amitriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))',
  'Dag 29–56: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg',
  'Dag 57–84: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))',
  'Fra dag 85: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))',
]
const ESC_DRAPER_10 = [
  'Dag 1–28: Escitalopram peroralt: 8 mg = 8 dråper à 1 mg (valgt av forskriveren (beregnet 7,5 mg; −20 %))',
  'Dag 29–56: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg',
  'Dag 57–84: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))',
  'Dag 85–112: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))',
  'Dag 113–140: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg',
]
const ESC_DRAPER_20 = [
  'Dag 1–28: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg',
  'Dag 29–56: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,25 mg; −20 %))',
  'Dag 57–84: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg',
  'Dag 85–112: Escitalopram peroralt: 7 mg = 7 dråper à 1 mg (valgt av forskriveren (beregnet 6,75 mg; −22,22 %))',
  'Dag 113–140: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg (valgt av forskriveren (beregnet 5,25 mg; −14,29 %))',
  'Dag 141–168: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))',
  'Dag 169–196: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))',
  'Dag 197–224: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg',
]
const SERT_75 = (dager: string) => `${dager}: Sertralin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg`
const SERT_200 = [
  'Dag 1–28: Sertralin peroralt: 150 mg = 1 tablett à 100 mg + 1 tablett à 50 mg',
  'Dag 29–56: Sertralin peroralt: 125 mg = 1 tablett à 100 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 112,5 mg; −16,67 %))',
  'Dag 57–84: Sertralin peroralt: 100 mg = 1 tablett à 100 mg (valgt av forskriveren (beregnet 93,75 mg; −20 %))',
  SERT_75('Fra dag 85'),
]
const NOR_75 = [
  'Dag 1–28: Nortriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))',
  'Dag 29–56: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg',
  'Dag 57–84: Nortriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))',
  'Dag 85–112: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))',
  'Dag 113–140: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))',
  NOR_20('Dag 141–168'),
]
const NOR_100 = [
  'Dag 1–28: Nortriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg',
  'Dag 29–56: Nortriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))',
  'Dag 57–84: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg',
  'Dag 85–112: Nortriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))',
  'Dag 113–140: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))',
  'Dag 141–168: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))',
  NOR_20('Dag 169–196'),
]
const ESC_DRAPER_15 = [
  'Dag 1–28: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,25 mg; −20 %))',
  'Dag 29–56: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg',
  'Dag 57–84: Escitalopram peroralt: 7 mg = 7 dråper à 1 mg (valgt av forskriveren (beregnet 6,75 mg; −22,22 %))',
  'Dag 85–112: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg (valgt av forskriveren (beregnet 5,25 mg; −14,29 %))',
  'Dag 113–140: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))',
  'Dag 141–168: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))',
  'Dag 169–196: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg',
]
const ESC_DRAPER_20_LANG = [
  'Dag 1–28: Escitalopram peroralt: 18 mg = 18 dråper à 1 mg',
  'Dag 29–56: Escitalopram peroralt: 17 mg = 17 dråper à 1 mg (valgt av forskriveren (beregnet 16,2 mg; −5,56 %))',
  'Dag 57–84: Escitalopram peroralt: 16 mg = 16 dråper à 1 mg (valgt av forskriveren (beregnet 15,3 mg; −5,88 %))',
  'Dag 85–112: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg (valgt av forskriveren (beregnet 14,4 mg; −6,25 %))',
  'Dag 113–140: Escitalopram peroralt: 14 mg = 14 dråper à 1 mg (valgt av forskriveren (beregnet 13,5 mg; −6,67 %))',
  'Dag 141–168: Escitalopram peroralt: 13 mg = 13 dråper à 1 mg (valgt av forskriveren (beregnet 12,6 mg; −7,14 %))',
  'Dag 169–196: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,7 mg; −7,69 %))',
  'Dag 197–224: Escitalopram peroralt: 11 mg = 11 dråper à 1 mg (valgt av forskriveren (beregnet 10,8 mg; −8,33 %))',
  'Dag 225–252: Escitalopram peroralt: 10 mg = 10 dråper à 1 mg (valgt av forskriveren (beregnet 9,9 mg; −9,09 %))',
  'Fra dag 253: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg',
]

export const FORSLAG_K1: Kontrollforslag = {
  nr: 2,
  overskrift: 'K1: nedtrapping av antidepressiv til seponering – kontrollgrunnlag',
  tittel: 'Ny versjon med avslutning for escitalopram, nortriptylin, amitriptylin og sertralin',
  fil: 'docs/verktøy-k1-nedtrapping-kontrollgrunnlag.md',
  dato: DATO_K1,
  verktoy: SEPONERING,
  simulerAvklaring: true,
  visPlanutfall: true,
  regler: [K1_AMITRIPTYLIN, K1_NORTRIPTYLIN, K1_ESCITALOPRAM, K1_SERTRALIN],
  innledning: (fest) => [
    `**Ny versjon med avslutning for escitalopram, nortriptylin, amitriptylin og sertralin.** Grunnlag for uavhengig faglig kontroll av K1 i \`docs/verktøy-klinisk-leveranseplan-2026-11.md\`, laget ${norskDato(DATO_K1)}.`,
    `**Ingen regel er godkjent eller aktivert.** De fire reglene har fått versjon 13 med en avslutning: når nedtrappingen stopper på laveste døgndose i preparatomtalen eller lavere, gis siste dose et helt trinn, og legemidlet seponeres etter en eksplisitt vurdering, med en ny vurdering 28 dager etter siste dose. Stopper den over grensen, er planen fortsatt en delplan som sier hva den ikke dekker. Versjonene er til faglig kontroll; verktøyet tilbyr ingen beregning for dem (kasus K1-15–K1-18), og sperrene og synligheten bare for administratorer er uendret. For å vise hva verktøyet ville vist om nøyaktig disse versjonene ble godkjent, er planene under regnet på en kopi av hver regel der de åpne valgene er avklart som foreslått og regelen er godkjent, begge simulert («${SIMULERT_KONTROLLOR}»), gjennom den samme veien som verktøysiden og med de norske preparatene i FEST-uttrekket hentet ${fest}. Kopien lagres ikke og brukes ikke av appen. Kasusene er syntetiske; pasientopplysninger inngår ikke, og ingen tekst fra Psychiatrienet vises.`,
  ],
  forutsetninger: [
    'Kontrollen gjelder nøyaktig versjonen og fingeravtrykket i tabellen over. De tre åpne valgene i hver regel (avslutningens grunnlag, oppfølgingstiden etter siste dose og grunnlaget for vurderingen etter seponering) må avklares av kontrolløren. Grensen for når seponering kan planlegges, er valgt av Peder som faglig beslutningstaker (beslutningskortet i K1-tråden 03.11.2026) og står som avklaring av den; den er ikke uavhengig kontrollert.',
    'Fagkontrollene 29. og 30.10.2026 godkjente ingen avslutning og ingen fast nedre grense (beslutning 2–4). K1 endrer dette med Peders valg; kontrolløren må ta stilling til konflikten (spørsmål K1.1), ikke bare til beregningene.',
    'Godkjenningen registreres i en egen PR, med avklaringene som en ny regelversjon og kontrollørens avgrensning. Endres en regel før det, stemmer ikke fingeravtrykket, og kontrollen må gjøres på nytt.',
    'Tråd F har avsluttet kildefunnene i RCPsych «Stopping antidepressants» (`rcpsych-stopping`, sak 4 og 5, 03.11.2026); faktumet om små reduksjoner fra starten er rettet (`docs/verktøy-rettelse-langvarig.md`). Avslutningen bygger i tillegg på to nye utdrag fra samme kilde (`RCPSYCH.heltSlutt` og `RCPSYCH.eksempel1`).',
    'Sperrene for de kliniske verktøyene og synligheten bare for administratorer beholdes til verktøyene er klare for klinisk prøvebruk og Peder har godkjent åpning for vanlige brukere.',
  ],
  sporsmal: [
    {
      nr: 'K1.1',
      sporsmal: 'Kan seponering planlegges når nedtrappingen stopper på laveste døgndose preparatomtalen oppgir for voksne, eller lavere (escitalopram 5 mg, nortriptylin 25 mg, amitriptylin 10 mg, sertralin 25 mg)? Ingen kilde angir en dose som er lav nok, og RCPsych viser eksempler som går mye lavere med flytende form før seponering.',
      anbefalt: 'Ja, som en avgrenset første avslutning: grensen er en dose preparatomtalen selv bruker, seponeringen skjer først etter en eksplisitt vurdering av symptomer, og planen følger opp etter siste dose. Peder har valgt grensen; den erstatter beslutning 2–4 fra 29. og 30.10.2026 bare for disse fire reglene. Peder valgte grensen som prinsipp for escitalopram, nortriptylin og amitriptylin; sertralin er lagt til etter samme prinsipp (spørsmål K1.8).',
    },
    {
      nr: 'K1.2',
      sporsmal: 'Siste trinn er seponering fra den siste dosen som kan gis: escitalopram dråper fra 3 mg, nortriptylin fra 20 mg (15 mg kan ikke gis med hele tabletter, og 10 mg er 50 % reduksjon). For nortriptylin er det siste trinnet dermed større enn de andre. Er det akseptabelt?',
      anbefalt: 'Ja for escitalopram dråper. For nortriptylin anbefales en særskilt vurdering: alternativet er et mellomtrinn på 10 mg, som krever en reduksjon på 50 %, som verktøyet i dag ikke tilbyr. Uten et slikt valg er seponering fra 20 mg etter en vurdering det som kan gis.',
    },
    {
      nr: 'K1.3',
      sporsmal: 'Siste dose gis et helt trinn (minst 28 dager) før seponering, og seponeringen forutsetter at forskriveren har funnet dosen tolerert. Er det akseptabelt som avslutningens grunnlag (åpent valg)?',
      anbefalt: 'Ja. Det er samme minstetid og samme symptomstyrte vurdering som ved hver reduksjon (NICE, RCPsych).',
    },
    {
      nr: 'K1.4',
      sporsmal: 'Vurderingen etter siste dose er satt til 28 dager etter siste dose, samme minstetid som et trinn (åpent valg). Kildene angir ingen bestemt oppfølgingstid. Er det akseptabelt?',
      anbefalt: 'Ja, som en minstetid for en planlagt vurdering; seponeringssymptomer kan komme senere, og teksten sier hva som gjøres ved funn.',
    },
    {
      nr: 'K1.5',
      sporsmal: 'K0-01 (escitalopram 10 mg tablett) kan ikke fullføres med tabletter. Fra 10 mg dråper er forløpet komplett (K1-01). Skal verktøyet tilby overgang fra tablett til dråper med samme døgndose?',
      anbefalt: 'Ikke i K1. Overgangen krever at preparatomtalen for dråpene registreres som kilde og at mg-ekvivalensen er dokumentert; det bør være en egen, avgrenset kontroll.',
    },
    {
      nr: 'K1.6',
      sporsmal: 'K0-02 (sertralin 100 mg) og K0-03 (amitriptylin 25 mg) kan ikke fullføres: med de norske styrkene og høyst 25 % per trinn stopper planene over grensen (sertralin på 75 mg etter én reduksjon, amitriptylin på 20 mg). RCPsychs eksempel 1 bruker om lag 50 % per trinn. Skal et større siste trinn tillates under en grense?',
      anbefalt: 'Ikke i K1. Planene er delplaner som sier hva de ikke dekker. Et større siste trinn er en ny faglig beslutning som bør vurderes samlet for alle stoffene, med kildegrunnlaget.',
    },
    {
      nr: 'K1.7',
      sporsmal: 'Ved lang behandlingstid (10 % per trinn) når ingen plan grensen innenfor planhorisonten eller med preparatene, så de forblir delplaner. Er det akseptabelt?',
      anbefalt: 'Ja. Planen sier at den ikke er komplett og hvorfor, og en ny plan beregnes fra dosen pasienten bruker.',
    },
    {
      nr: 'K1.8',
      sporsmal: 'Skal sertralin ha den samme avslutningen, med grensen 25 mg? 25 mg er laveste startdose i preparatomtalen (ved enkelte angstlidelser; ved depresjon er startdosen 50 mg). Med tablettene på 25, 50 og 100 mg (FEST oppgir bare deling i to, til 25 mg) når ingen plan i omfanget grensen: 100 mg stopper på 75 mg (K1-21), 200 mg på 75 mg (K1-22). Konsentratet til mikstur (Zoloft 20 mg/ml) er markedsført, men brukes ikke før doseringen per ml og måleoppløsningen er dokumentert (P5). I den godkjente kryssnedtrappingen sertralin → mirtazapin (v10) er 25 → 0 mg uttrykkelig utenfor og planlegges individuelt.',
      anbefalt: 'Ja, som regel: planene forblir delplaner som sier hvorfor, og avslutningen tas i bruk først når et større siste trinn (K1.6) eller konsentratet er avklart. Avgrensningen i kryssnedtrappingen sertralin → mirtazapin gjelder fortsatt den regelen og endres ikke.',
    },
  ],
  avsnitt: [
    {
      tittel: 'Hva klinikeren kan gjøre, og hvilke forløp som er komplette',
      tekst: `Med godkjenning ville verktøyet planlegge en nedtrapping helt til seponering, med vurdering før hver reduksjon og 28 dager etter siste dose, i disse tilfellene i det kliniske omfanget:

${liste([
        'Nortriptylin tablett 25, 50, 75, 100 og 150 mg ved kort behandlingstid: seponert fra dag 29, 113, 169, 197 og 253 (kasus K1-03–K1-05, K1-23 og K1-24). Siste dose er 20 mg.',
        'Escitalopram dråper 10, 15 og 20 mg ved kort behandlingstid: seponert fra dag 141, 197 og 225 (kasus K1-01, K1-25 og K1-02). Siste dose er 3 mg.',
      ])}

Disse forløpene er fortsatt delplaner, og planen sier hva den ikke dekker:

${liste([
        'Amitriptylin ved kort behandlingstid stopper på 20 mg, over grensen på 10 mg, fordi 15 mg ikke kan gis med hele tabletter (K1-06 og K1-07).',
        'Escitalopram tablett 20 mg gir én reduksjon til 15 mg (K1-08).',
        'Lang behandlingstid stopper over grensen for escitalopram, nortriptylin og amitriptylin (K1-09 og K1-10); for sertralin er lang behandlingstid utenfor omfanget.',
        'Sertralin tablett 100 og 200 mg stopper på 75 mg, over grensen på 25 mg, fordi 56,25 mg ikke kan gis og 50 mg er en reduksjon på 33 % (K1-21 og K1-22). Konsentratet til mikstur brukes ikke (spørsmål K1.8).',
      ])}

Tabellen i avsnitt 8 viser hvert tilfelle i omfanget med planutfallet.

**K0-kasusene:**

${tabell(
        ['K0', 'Situasjon', 'Resultat i K1'],
        [
          ['K0-01', 'Escitalopram 10 mg tablett, kort', 'Ikke komplett. Tablett 10 mg er utenfor omfanget (K1-11). Fra 10 mg dråper er forløpet komplett til seponering (K1-01); overgang fra tablett er spørsmål K1.5.'],
          ['K0-02', 'Sertralin 100 mg tablett, kort', 'Delplan: én reduksjon til 75 mg, over grensen på 25 mg (K1-21). Spørsmål K1.6 og K1.8.'],
          ['K0-03', 'Amitriptylin 25 mg tablett, kort', 'Delplan: én reduksjon til 20 mg, over grensen på 10 mg (K1-06). Spørsmål K1.6.'],
        ],
      )}`,
    },
    {
      tittel: 'Hva som er endret fra versjon 12',
      tekst: liste([
        'Nedtrappingsfasen har fått en avslutning med seponering fra høyst laveste døgndose i preparatomtalen (`fra_hoyst_mg`), lest fra regelens egen grense for lav dose, så ingen ny dose er skrevet inn. Peders valg står som avklaring av grensen.',
        'Forløpet har to vurderingspunkter: før hver reduksjon og før seponering (kildegrunnlag NICE og RCPsych), og 28 dager etter siste dose (åpent valg).',
        'Teksten om at planen ikke går til null er erstattet av teksten om avslutningen, og et nytt kildetro utsagn sier at nedtrappingen går helt til null, og at seponeringssymptomer kan komme uansett hvor lav dosen er.',
        'Regneeksemplene viser planene til seponering; escitalopram og sertralin har hvert sitt nye eksempel der planen stopper over grensen (fra 20 og 100 mg ved lang behandlingstid).',
        'Det kliniske omfanget ved kort behandlingstid er utvidet med vanlige startdoser innenfor preparatomtalens doseområde: nortriptylin tablett 75 og 100 mg (dmp-noritren pkt. 4.2: 50–75 mg i starten, opptil 150 mg) og escitalopram dråper 15 mg (dmp-cipralex pkt. 4.2: 5–20 mg). Begge gir komplette forløp (K1-23–K1-25).',
        'Resten av omfanget, trinnstørrelser, trinnlengder, spørsmål, unntak og bekreftelser er uendret. Den langsomme varianten for hvert stoff er uendret og har ingen avslutning.',
        'Planene for de andre nedtrappingsreglene er uendret; de godkjente reglene (vortioksetin v12, bupropion v5, agomelatin v1) har samme fingeravtrykk som før.',
      ]),
    },
    {
      tittel: 'Kjente mangler',
      tekst: liste([
        'Vurderingspunktet 28 dager etter siste dose står også i delplaner, uten dag, fordi planen ikke seponerer.',
        'En delplan med bare én reduksjon sier at neste trinn ikke kan gis, men ikke at avslutningen bare gjelder fra grensen (K1-06, K1-08 og K1-21).',
      ]),
    },
  ],
  kasusinnledning:
    'Kasusene går gjennom den samme veien som verktøysiden og kjøres i testene (`src/__tests__/verktoyk1.test.ts`). De viser de komplette forløpene, delplanene, grensene for omfanget, at verktøyet i dag ikke tilbyr beregning, at en godkjenning uten avklaring av de åpne valgene ikke gir plan, og at en endret grense etter godkjenningen stopper planen. Kolonnen K0 viser kasuset i leveranseplanen hvert kasus svarer på. Uten annen merknad er regelen den simulert avklarte og godkjente kopien, organfunksjon og interaksjoner er bekreftet, og svaret er nei på alle unntak og spørsmål.',
  refkolonne: 'K0',
  kasus: [
    // --- Komplette forløp til seponering
    kk('K1-01', 'vanlig_dose', 'escitalopram dråper 10 mg, kort behandlingstid', K1_ESCITALOPRAM, '10', komplett('Escitalopram', 141, ESC_DRAPER_10), [], { skjema: form(DRAPER), velger: [8, 5, 4], ref: 'K0-01' }),
    kk('K1-02', 'vanlig_dose', 'escitalopram dråper 20 mg, kort behandlingstid', K1_ESCITALOPRAM, '20', komplett('Escitalopram', 225, ESC_DRAPER_20), [], { skjema: form(DRAPER), velger: [12, 7, 6, 5, 4] }),
    kk('K1-03', 'vanlig_dose', 'nortriptylin 25 mg, kort behandlingstid', K1_NORTRIPTYLIN, '25', komplett('Nortriptylin', 29, [NOR_20('Dag 1–28')]), [], { velger: [20] }),
    kk('K1-04', 'vanlig_dose', 'nortriptylin 50 mg, kort behandlingstid', K1_NORTRIPTYLIN, '50', komplett('Nortriptylin', 113, NOR_50), [], { velger: [40, 25, 20] }),
    kk('K1-05', 'vanlig_dose', 'nortriptylin 150 mg, kort behandlingstid', K1_NORTRIPTYLIN, '150', komplett('Nortriptylin', 253, NOR_150), [], { velger: [120, 100, 60, 35, 30, 25, 20] }),
    // --- Delplaner: forløpet kan ikke fullføres, og planen sier det
    kk('K1-06', 'vanlig_dose', 'amitriptylin 25 mg, kort behandlingstid', K1_AMITRIPTYLIN, '25', delplan('Amitriptylin', EN_FORSTE_REDUKSJON, EN_REDUKSJON_IKKE_DEKKET, ['Fra dag 1: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))']), [], { velger: [20], ref: 'K0-03' }),
    kk('K1-07', 'vanlig_dose', 'amitriptylin 50 mg, kort behandlingstid', K1_AMITRIPTYLIN, '50', delplan('Amitriptylin', STARTFORLOP, overGrensen(10, 20), AMI_50), [], { velger: [40, 25, 20] }),
    kk('K1-08', 'vanlig_dose', 'escitalopram tablett 20 mg, kort behandlingstid', K1_ESCITALOPRAM, '20', delplan('Escitalopram', EN_FORSTE_REDUKSJON, EN_REDUKSJON_IKKE_DEKKET, ['Fra dag 1: Escitalopram peroralt: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg']), [], { skjema: form(TABLETT) }),
    kk('K1-09', 'pasientforhold', 'escitalopram dråper 20 mg, lang behandlingstid', K1_ESCITALOPRAM, '20', delplan('Escitalopram', STARTFORLOP, overGrensen(5, 9), ESC_DRAPER_20_LANG), [], { skjema: { ...form(DRAPER), svar: LANG }, velger: [17, 16, 15, 14, 13, 12, 11, 10] }),
    kk('K1-10', 'pasientforhold', 'nortriptylin 50 mg, lang behandlingstid', K1_NORTRIPTYLIN, '50', delplan('Nortriptylin', EN_FORSTE_REDUKSJON, EN_REDUKSJON_IKKE_DEKKET, ['Fra dag 1: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg']), [], { skjema: { svar: LANG } }),
    // --- Utenfor omfanget og stopp
    kk('K1-11', 'uvanlig_dose', 'escitalopram tablett 10 mg, kort behandlingstid (utenfor omfanget)', K1_ESCITALOPRAM, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], { skjema: form(TABLETT), ref: 'K0-01' }),
    kk('K1-12', 'uvanlig_dose', 'nortriptylin 125 mg, kort behandlingstid (utenfor omfanget)', K1_NORTRIPTYLIN, '125', stopp(utenforOmfang(125), UTENFOR_OMFANG)),
    kk('K1-13', 'pasientforhold', 'escitalopram dråper 20 mg, tidligere seponeringssymptomer', K1_ESCITALOPRAM, '20', stopp('Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen.'), [], { skjema: { ...form(DRAPER), pasientforhold: { tidligere_seponeringssymptomer: true } } }),
    kk('K1-14', 'preparat', 'nortriptylin 50 mg, kort, 10 mg avregistrert', K1_NORTRIPTYLIN, '50', stopp('nortriptylin (fra): styrken 10 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert.', UTENFOR_OMFANG), [], { fest: avregistrert('nortriptylin', 10) }),
    // --- Uten godkjenning, uten avklaring og med endret regel
    kk('K1-15', 'ikke_godkjent', 'escitalopram slik verktøyet er i dag', K1_ESCITALOPRAM, '10', { utfall: 'ingen', status: 'til_kontroll' }, [], { regel: undefined }),
    kk('K1-16', 'ikke_godkjent', 'nortriptylin slik verktøyet er i dag', K1_NORTRIPTYLIN, '50', { utfall: 'ingen', status: 'til_kontroll' }, [], { regel: undefined }),
    kk('K1-17', 'ikke_godkjent', 'amitriptylin slik verktøyet er i dag', K1_AMITRIPTYLIN, '25', { utfall: 'ingen', status: 'til_kontroll' }, [], { regel: undefined, ref: 'K0-03' }),
    kk('K1-18', 'ikke_godkjent', 'sertralin slik verktøyet er i dag', K1_SERTRALIN, '100', { utfall: 'ingen', status: 'til_kontroll' }, [], { regel: undefined }),
    kkUtenAvklaring('K1-19', 'regelendring', 'escitalopram dråper 20 mg, godkjent uten at de åpne valgene er avklart', K1_ESCITALOPRAM, '20', ingenPlan('Regelen har åpne valg som må avklares faglig'), [], { skjema: form(DRAPER) }),
    kk('K1-20', 'regelendring', 'escitalopram dråper 20 mg med grensen for seponering endret etter godkjenningen', K1_ESCITALOPRAM, '20', ingenPlan('Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke)'), [], {
      skjema: form(DRAPER),
      regel: endretEtter(K1_ESCITALOPRAM, 'grensen for seponering 5 → 6 mg', (r) => { const f = r.plan.forlop[0]!.faser.at(-1)!; if (f.type === 'nedtrapping' && typeof f.avslutning === 'object') f.avslutning.fra_hoyst_mg.verdi = 6 }, DATO_K1, true),
    }),
    // --- Sertralin (K0-02): tablettene når ikke grensen, så planene er delplaner
    kk('K1-21', 'vanlig_dose', 'sertralin tablett 100 mg, kort behandlingstid', K1_SERTRALIN, '100', delplan('Sertralin', EN_FORSTE_REDUKSJON, EN_REDUKSJON_IKKE_DEKKET, [SERT_75('Fra dag 1')]), [], { ref: 'K0-02' }),
    kk('K1-22', 'vanlig_dose', 'sertralin tablett 200 mg, kort behandlingstid', K1_SERTRALIN, '200', delplan('Sertralin', STARTFORLOP, overGrensen(25, 75), SERT_200), [], { velger: [125, 100] }),
    // --- Utvidet omfang: vanlige startdoser innenfor preparatomtalens doseområde
    kk('K1-23', 'vanlig_dose', 'nortriptylin 75 mg, kort behandlingstid', K1_NORTRIPTYLIN, '75', komplett('Nortriptylin', 169, NOR_75), [], { velger: [60, 35, 30, 25, 20] }),
    kk('K1-24', 'vanlig_dose', 'nortriptylin 100 mg, kort behandlingstid', K1_NORTRIPTYLIN, '100', komplett('Nortriptylin', 197, NOR_100), [], { velger: [60, 35, 30, 25, 20] }),
    kk('K1-25', 'vanlig_dose', 'escitalopram dråper 15 mg, kort behandlingstid', K1_ESCITALOPRAM, '15', komplett('Escitalopram', 197, ESC_DRAPER_15), [], { skjema: form(DRAPER), velger: [12, 7, 6, 5, 4] }),
  ],
}

export const KONTROLLFORSLAG: readonly Kontrollforslag[] = [FORSLAG_1, FORSLAG_K1]

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

/** Planutfallet slik planen viser det: «Komplett plan til sluttmålet: …» eller «Delplan, …»; `null` når ingen plan vises. */
export const planutfallstekst = (u: Pilotutfall): string | null =>
  ((u as ReturnType<typeof kjorKasus>).tekst ?? '').split('\n').find((l) => l.startsWith(KOMPLETT) || l.startsWith(DELPLAN)) ?? null

/** Doseendringene i planen, uten vurderingspunktene. */
const reduksjonslinjer = (linjer: string[]) => linjer.filter((l) => !/^Dag \d+: Vurdering \(/.test(l))

function veitekst(v: Planvei, visUtfall = false): string {
  const valg = v.valg.length > 0 ? `${liste(v.valg.map((x) => `${valgtekst(x.trinn)} Valgt: ${tall(x.valgt)} mg.`))}\n\n` : 'Ingen trinn krever forskriverens valg.\n\n'
  const u = v.utfall
  const utfall = visUtfall && planutfallstekst(u)
  const vist = u.utfall === 'plan' ? `${u.undertittel ? `*${u.undertittel}*\n\n` : ''}${utfall ? `**${utfall}**\n\n` : ''}${liste(u.linjer)}` : `**Ingen plan vises** (${u.utfall}):\n\n${liste('grunner' in u ? u.grunner : [])}`
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
  const regler = f.regler.map((k) => ({ k, r: regelMedId(k.id, f.settene) }))
  const planer = omfangsplaner(f, uttrekkene)
  const alleValg = planer.flatMap((o) => o.veier.flatMap((v) => v.valg))
  const enDose = alleValg.every((v) => v.trinn.doser.length === 1)
  const identitet = tabell(
    ['Regel', 'Versjon', 'Fingeravtrykk', 'Status i dag', 'Vurdert av kontrolløren', 'Tekniske hindringer for en godkjenning'],
    regler.map(({ k, r }) => {
      // Kontrollørens vurdering av nøyaktig denne versjonen og dette innholdet, om den finnes.
      const vurdert = r.godkjenning.historikk.find((x) => x.status === 'ikke_godkjent' && x.rolle === 'uavhengig_kontrollor' && x.regelversjon === k.versjon && x.fingeravtrykk === k.fingeravtrykk)
      const hindringer = godkjenningshindringer(k, f.dato, f.settene)
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
    ['Regel', 'Tilfelle', 'Planer', 'Reduksjoner', 'Valg forskriveren gjør', 'Siste dose', f.visPlanutfall ? 'Planutfall' : 'Undertittel'],
    planer.flatMap((o) => {
      const r = regelMedId(o.regel.id, f.settene)
      return o.veier.map((v) => {
        const n = v.utfall.utfall === 'plan' ? reduksjonslinjer(v.utfall.linjer).filter((l) => !/: Seponert$/.test(l)).length : 0
        const siste = sisteDose(v.utfall)
        const sist = v.utfall.utfall === 'plan' ? (f.visPlanutfall ? (planutfallstekst(v.utfall) ?? '–') : (v.utfall.undertittel ?? '–')) : 'ingen plan'
        return [`\`${o.regel.id}\``, tilfellenavn(r, o, uttrekkene), String(o.veier.length), String(n), String(v.valg.length), siste === null ? '–' : `${tall(siste)} mg`, sist]
      })
    }),
  )
  const detaljer = planer
    .map((o) => {
      const r = regelMedId(o.regel.id, f.settene)
      const veier = o.veier.length === 1 ? veitekst(o.veier[0]!, f.visPlanutfall) : o.veier.map((v, i) => `**Plan ${i + 1}.**\n\n${veitekst(v, f.visPlanutfall)}`).join('\n\n')
      return `#### ${r.tittel}: ${tilfellenavn(r, o, uttrekkene)}\n\n${veier}`
    })
    .join('\n\n')
  const regelavsnitt = regler
    .map(({ k, r }) => {
      const betingelser = [
        ...r.bekreftelser.map((b) => `Må bekreftes (\`${b.id}\`): ${b.tekst} (${grunnlag(b.grunnlag)})`),
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
    ['ID', f.refkolonne ?? 'VDK-2', 'Hva', 'Regel', 'Forventet', 'Resultat'],
    f.kasus.map((k) => {
      const avvik = kontrollavvik(k, uttrekkene)
      const regel = k.regel ? `${k.regel.id}${k.regel.endre ? ` (${k.regel.endre.hva})` : ''}` : 'den verktøyet tilbyr i dag'
      return [k.id, k.ref ?? '–', `${k.hva}${k.velger?.length ? `; forskriveren velger ${k.velger.map((mg) => `${tall(mg)} mg`).join(', ')}` : ''}`, regel, forventningstekst(k), avvik.length === 0 ? 'som forventet' : `**avvik:** ${avvik.join(' ')}`]
    }),
  )
  const innledning = f.innledning?.(norskDato(u.hentet.slice(0, 10))) ?? [
    `**${f.tittel}.** Grunnlag for uavhengig faglig kontroll av forslag ${f.nr} i \`docs/verktøy-vdk2-prioritering.md\`, laget ${norskDato(f.dato)}.`,
    `**Ingen regel er godkjent eller aktivert, og denne PR-en endrer ingen regel.** Verktøyet tilbyr i dag ingen beregning for disse reglene (kasus ${f.kasus.filter((k) => !k.regel).map((k) => k.id).join(', ')}). For å vise hva verktøyet ville vist om nøyaktig disse versjonene ble godkjent, er planene under regnet på en kopi av hver regel med en simulert godkjenning («${SIMULERT_KONTROLLOR}»), gjennom den samme veien som verktøysiden og med de norske preparatene i FEST-uttrekket hentet ${norskDato(u.hentet.slice(0, 10))}. Kopien lagres ikke og brukes ikke av appen. Kasusene er syntetiske; pasientopplysninger inngår ikke, og ingen tekst fra Psychiatrienet vises.`,
  ]
  // Avsnittene nummereres fortløpende, med forslagets egne avsnitt etter spørsmålene.
  const egne = f.avsnitt ?? []
  const nr = { regler: 4 + egne.length, planer: 5 + egne.length, kasus: 6 + egne.length }
  const kasusinnledning =
    f.kasusinnledning ??
    'Kasusene går gjennom den samme veien som verktøysiden og kjøres i testene (`src/__tests__/verktoyvdk3.test.ts`). De prøver grensene for omfanget: startdoser like utenfor, lang behandlingstid, pasientgruppe, unntak, endret trinnstørrelse, den langsomme varianten, en endret regel og endrede preparater. Kolonnen VDK-2 viser testkasuset i planen hvert kasus gjør til en test; F1-numrene erstatter K1-numrene. Uten annen merknad er regelen den simulert godkjente kopien, organfunksjon og interaksjoner er bekreftet, og svaret er nei på alle unntak og spørsmål.'
  return `<!-- Laget av \`npm run verktoy:regler -- kontrollgrunnlag\`; rediger ikke for hånd. -->
# ${f.overskrift ?? `VDK-3, forslag ${f.nr}: kontrollgrunnlag`}

${innledning.join('\n\n')}

${f.avgrensning ? `**Kontrollørens avgrensning ${norskDato(f.avgrensning.dato)} (ChatGPT):** ${f.avgrensning.tekst}\n\n` : ''}## 1. Regelversjonene til kontroll

Kontrolløren bes vurdere hver regel for nøyaktig versjonen og fingeravtrykket i tabellen, i det kliniske omfanget i avsnitt ${nr.regler}. «Tekniske hindringer» er det som ville stoppet en registrert godkjenning utenom selve kontrollen, som åpne valg uten avklaring.

${identitet}

## 2. Før en godkjenning kan registreres

${liste(f.forutsetninger)}

## 3. Spørsmål til kontrolløren

${tabell(['#', 'Spørsmål', 'Anbefalt svar'], f.sporsmal.map((x) => [x.nr, x.sporsmal, x.anbefalt]))}

${egne.map((a, i) => `## ${4 + i}. ${a.tittel}\n\n${a.tekst}\n\n`).join('')}## ${nr.regler}. Reglene

${regelavsnitt}

## ${nr.planer}. Alle planer i det kliniske omfanget

Hver startdose i hvert tilfelle i reglenes kliniske omfang, med hver plan forskriverens valg kan gi: ved hvert trinn som ikke kan gis nøyaktig, er hver dose som tilbys, fulgt. ${enDose ? `I alle ${alleValg.length} valgene tilbys nøyaktig én dose, så hver startdose gir én plan.` : 'Noen valg tilbyr flere doser, og hver gir sin egen plan.'} Radene er slik verktøysiden og kopien av planen ville vist dem; dagene er minstetider, og hvert trinn forutsetter en ny vurdering.

${oversikt}

${detaljer}

## ${nr.kasus}. Syntetiske testkasus

${kasusinnledning}

${kasus}
`
}
