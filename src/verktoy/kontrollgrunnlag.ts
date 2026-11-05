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
import { erKliniskGodkjent, fingeravtrykk, godkjenningsfeil, KONTROLLUTFALL, kontrollutfall } from './regler/godkjenning'
import { alleGrunnlag, type Klinisktilfelle, type Regel, type Regelsett } from './regler/modell'
import { B2_DATO, B2_ESCITALOPRAM, B2_GODKJENNING_0511, B2_KONTROLL_0411, K1_9_AVGJORELSE, K1_DATO, K1_GODKJENNING_0411, K1_KONTROLL_0411 } from './regler/k1'
import { STI } from './regler/nedtrapping'
import { ETTER_RETTELSENE, FOR_B2 } from './kontrollsett'
import { avregistrert, avvikFra, kjorKasus, type Kontrollregel, nyStyrke, type Pilotkasus, type Pilotutfall, SIMULERT_KONTROLLOR, simulerGodkjenning, type Uttrekkene } from './regler/pilotmatrise'
import { grunnlag, liste, tabell, tall, utsagn } from './regler/rapport'
import { inndatavilkar } from './regler/beregning'
import { DELPLAN, EN_FORSTE_REDUKSJON, KOMPLETT, STARTFORLOP } from './planvisning'
import { KOMPLETT_IKKE_TILGJENGELIG, kliniskDelplan, kliniskDoseplan, tilfelletekst, UTENFOR_OMFANG } from './motor/plan'
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
  /** Veien kasuset kjøres gjennom; standard {@link kliniskDelplan}, som viser en delplan for kontrollens skyld. */
  motor?: typeof kliniskDoseplan
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
  /** Veien planene regnes gjennom; standard {@link kliniskDelplan}. Med `kliniskDoseplan` viser grunnlaget nøyaktig det verktøysiden viser. */
  motor?: typeof kliniskDoseplan
  regler: Kontrollregel[]
  /** Overskriften; standard «VDK-3, forslag N: kontrollgrunnlag». */
  overskrift?: string
  /** Avsnittene under overskriften, med datoen FEST-uttrekket er hentet; standard innledningen til et VDK-3-forslag. */
  innledning?: (festHentet: string) => string[]
  /** Egne avsnitt etter spørsmålene til kontrolløren. */
  avsnitt?: { tittel: string; tekst: string }[]
  /**
   * Hvor planene stopper med versjonene forslaget bygger på (f.eks. før et
   * krav om komplett plan), regnet med den samme simulerte godkjenningen:
   * et eget avsnitt etter forslagets egne, som bare er grunnlag for kontrollen.
   */
  utgangspunkt?: { tittel: string; settene: readonly Regelsett[]; regler: Kontrollregel[] }
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

/**
 * Regelen i kasusene: når nøyaktig versjonen og fingeravtrykket under kontroll
 * er klinisk godkjent i regelsettet, regelen slik verktøyet har den
 * (`undefined`, uten simulering, gjennom verktøyets egen tilgjengelighet);
 * ellers den simulert godkjente kopien ({@link somGodkjent}).
 */
export function godkjentEllerSimulert(k: Kontrollregel, dato: string, avklar = false, settene?: readonly Regelsett[]): Pilotkasus['regel'] {
  return erRegistrertGodkjent(k, settene) ? undefined : somGodkjent(k, dato, avklar)
}

/** Om nøyaktig versjonen og fingeravtrykket er registrert klinisk godkjent i regelsettet. */
export function erRegistrertGodkjent(k: Kontrollregel, settene?: readonly Regelsett[]): boolean {
  const r = regelMedId(k.id, settene)
  return r.versjon === k.versjon && fingeravtrykk(r) === k.fingeravtrykk && erKliniskGodkjent(r)
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
  const kjor = () => kjorKasus({ ...k, skjema: { ...k.skjema, trinnvalg } }, uttrekkene, k.settene, k.motor ?? kliniskDelplan)
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
  const form = tilfelle.legemiddelform ?? tilfelle.legemiddelformer?.[0] ?? null
  const grunn: Pilotkasus = {
    id: `${k.id}-${form ?? 'form'}-${startdose_mg}`,
    kategori: 'vanlig_dose',
    hva: 'plan i det kliniske omfanget',
    verktoy: f.verktoy,
    valg: valgFor(r),
    uttrekk: 'aksept',
    dose: String(startdose_mg),
    skjema: { svar: tilfelle.svar, justert: iTekst(tilfelle.justert) },
    regel: godkjentEllerSimulert(k, f.dato, f.simulerAvklaring, f.settene),
    forventet: { utfall: 'sperret' },
  }
  const motor = f.motor ?? kliniskDelplan
  const forsok = kjorKasus(grunn, uttrekkene, f.settene, motor)
  const formvalg = forsok.utfall === 'formvalg' && form ? Object.fromEntries(forsok.forlop.map((id) => [id, { legemiddelform: form }])) : {}
  const veier: Planvei[] = []
  const folg = (valg: Planvalg[]) => {
    const trinnvalg = valg.map((v) => ({ forlop: v.trinn.forlop, trinn: v.trinn.trinn, fra_mg: v.trinn.fra_mg, mg: v.valgt }))
    const u = kjorKasus({ ...grunn, skjema: { ...grunn.skjema, formvalg, trinnvalg } }, uttrekkene, f.settene, motor)
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

/** Regelen med den registrerte eller simulerte godkjenningen, deretter endret på kopien: det som skjer om regelen endres etter en godkjenning. */
const endretEtter = (k: Kontrollregel, hva: string, endre: (r: Regel) => void, dato = DATO_1, avklar = false): NonNullable<Pilotkasus['regel']> => {
  const g = godkjentEllerSimulert(k, dato, avklar)
  if (!g) return { id: k.id, endre: { hva: `den registrerte godkjenningen av versjon ${k.versjon}; deretter ${hva} på en kopi`, endre } }
  return { id: k.id, endre: { hva: `${g.endre!.hva}; deretter ${hva}`, endre: (r) => (g.endre!.endre(r), endre(r)) } }
}

/**
 * En kopi der avklaringene av valgene `sti` treffer er fjernet, og deretter
 * en simulert godkjenning av akkurat den kopien: viser at en godkjenning ikke
 * kan gjøre et åpent valg beregnbart.
 */
const godkjentUtenAvklaring = (k: Kontrollregel, sti: RegExp, hva: string, dato: string): NonNullable<Pilotkasus['regel']> => ({
  id: k.id,
  endre: {
    hva: `${hva} uten avklaring, deretter simulert klinisk godkjenning av kopien`,
    endre: (r) => {
      for (const [s, g] of alleGrunnlag(r)) if (sti.test(s) && g.type === 'ousfar_vurdering') g.avklaring = null
      simulerGodkjenning(r, { ...k, fingeravtrykk: fingeravtrykk(r) }, dato)
    },
  },
})

/**
 * Kasus for et forslag i nedtrappingsverktøyet: `regel` er den simulerte
 * godkjenningen av regelen (med simulert avklaring når `avklar`), med mindre
 * kasuset sier noe annet.
 */
const kasusFor =
  (dato: string, settene?: readonly Regelsett[], avklar = false) =>
  (
    id: string,
    kategori: Pilotkasus['kategori'],
    hva: string,
    r: Kontrollregel,
    dose: string,
    forventning: Pilotkasus['forventet'] & { planutfall?: string },
    tilbyr: number[] = [],
    x: Partial<Kontrollkasus> = {},
  ): Kontrollkasus => {
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
      regel: godkjentEllerSimulert(r, dato, avklar, settene),
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
      anbefalt:
        'Hele kjeden innenfor det foretrukne området. Hvert valg er eksplisitt og merket i planen, hver reduksjon krever ny vurdering av toleransen, og prinsippet er alt akseptert i P7-A. Ved hvert valg i omfanget tilbys nøyaktig én dose (avsnitt 5), så kjeden er bestemt av startdosen.',
    },
    {
      nr: '1.2',
      sporsmal:
        'Er en delplan som stopper ved 20 mg (amitriptylin og nortriptylin), 3 mg (escitalopram dråper, kort behandlingstid) eller 9 mg (escitalopram dråper, lang behandlingstid) akseptabel når planen sier at avslutningen vurderes individuelt?',
      anbefalt: 'Ja. Det er samme utfall som for vortioksetin, planen går aldri til null, og undertittelen sier at den ikke er en fullstendig plan.',
    },
    {
      nr: '1.3',
      sporsmal: 'Skal amitriptylin og nortriptylin godkjennes for alle startdosene i omfanget, eller bare der første reduksjon kan gis nøyaktig?',
      anbefalt: 'Alle startdosene i omfanget. Der første reduksjon ikke kan gis nøyaktig, tilbys én dose innenfor 5–25 %, og planen vises først når forskriveren har valgt den.',
    },
    {
      nr: '1.4',
      sporsmal:
        'Escitalopram dråper fra 20 mg ved lang behandlingstid gir ti reduksjoner over 252 dager ned til 9 mg, der åtte trinn på 1 mg er valgt av forskriveren (−5,56 % til −9,09 %). Skal godkjenningen ved lang behandlingstid gjelde hele kjeden, eller bare første reduksjon?',
      anbefalt: 'Hele kjeden. Hvert trinn er innenfor 5–10 % per trinn, som kontrolløren valgte for lang behandlingstid i P7-B, og hvert trinn har minst 28 dager og ny vurdering.',
    },
    {
      nr: '1.5',
      sporsmal:
        'Skal den langsomme varianten for escitalopram (dråper 20 mg, én reduksjon til 19 mg, −5 %) godkjennes? Med både hovedregelen og den langsomme varianten godkjent må forskriveren velge strategien; hovedregelen stopper ved tidligere seponeringssymptomer, og den langsomme varianten krever at de er vurdert.',
      anbefalt: 'Ja, som én mulig reduksjon med revurdering, avgrenset slik som vortioksetin. Registreringen trenger den tekniske endringen i avsnitt 2.',
    },
    {
      nr: '1.6',
      sporsmal:
        'Planene for amitriptylin og nortriptylin bruker bare hele tabletter, men noen trinn trenger flere tabletter (for eksempel 40 mg som 4 × 10 mg og 120 mg som 2 × 10 mg + 2 × 50 mg). Er det akseptabelt?',
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
    k1(
      'F1-01',
      'vanlig_dose',
      'amitriptylin 50 mg, kort behandlingstid, før forskriveren har valgt',
      AMITRIPTYLIN,
      '50',
      stopp('amitriptylin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig.'),
      [40],
      { ref: 'K1-01' },
    ),
    k1(
      'F1-02',
      'vanlig_dose',
      'amitriptylin 50 mg, kort, forskriveren velger dosen som tilbys ved hvert trinn',
      AMITRIPTYLIN,
      '50',
      plan(
        STARTFORLOP,
        'Dag 1–28: Amitriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))',
        'Dag 29–56: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg',
        'Dag 57–84: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))',
        'Fra dag 85: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))',
      ),
      [],
      { velger: [40, 25, 20], ref: 'K1-02' },
    ),
    k1(
      'F1-03',
      'vanlig_dose',
      'amitriptylin 25 mg, kort, laveste startdose i omfanget',
      AMITRIPTYLIN,
      '25',
      plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))'),
      [],
      { velger: [20] },
    ),
    k1(
      'F1-04',
      'vanlig_dose',
      'amitriptylin 150 mg, kort, høyeste startdose i omfanget',
      AMITRIPTYLIN,
      '150',
      plan(
        STARTFORLOP,
        'Dag 1–28: Amitriptylin peroralt: 120 mg = 2 tabletter à 10 mg + 2 tabletter à 50 mg (valgt av forskriveren (beregnet 112,5 mg; −20 %))',
        'Dag 29–56: Amitriptylin peroralt: 100 mg = 2 tabletter à 50 mg (valgt av forskriveren (beregnet 90 mg; −16,67 %))',
        'Dag 57–84: Amitriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg',
        'Dag 85–112: Amitriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))',
        'Dag 113–140: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg',
        'Dag 141–168: Amitriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))',
        'Dag 169–196: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))',
        'Dag 197–224: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))',
        'Fra dag 225: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))',
      ),
      [],
      { velger: [120, 100, 60, 35, 30, 25, 20] },
    ),
    k1(
      'F1-05',
      'pasientforhold',
      'amitriptylin 50 mg, lang behandlingstid',
      AMITRIPTYLIN,
      '50',
      plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg'),
      [],
      { skjema: { svar: LANG }, ref: 'K1-03' },
    ),
    k1(
      'F1-06',
      'pasientforhold',
      'amitriptylin 75 mg, lang behandlingstid',
      AMITRIPTYLIN,
      '75',
      plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Amitriptylin peroralt: 70 mg = 2 tabletter à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 67,5 mg; −6,67 %))'),
      [],
      { skjema: { svar: LANG }, velger: [70] },
    ),
    k1('F1-07', 'uvanlig_dose', 'amitriptylin 100 mg, lang behandlingstid (utenfor omfanget)', AMITRIPTYLIN, '100', stopp(utenforOmfang(100), UTENFOR_OMFANG), [], { skjema: { svar: LANG } }),
    k1('F1-08', 'uvanlig_dose', 'amitriptylin 60 mg, kort (startdose utenfor omfanget)', AMITRIPTYLIN, '60', ingenPlan(utenforOmfang(60)), [], { ref: 'K1-06' }),
    k1('F1-09', 'uvanlig_dose', 'amitriptylin 10 mg, kort (laveste styrke)', AMITRIPTYLIN, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], { ref: 'K1-05' }),
    k1(
      'F1-10',
      'uvanlig_dose',
      'amitriptylin 50 mg, kort, trinnstørrelsen endret til 20 %',
      AMITRIPTYLIN,
      '50',
      ingenPlan('Reduksjon per trinn (% av aktuell dose) 20 % er ikke verdien som er kontrollert (25 %), heller ikke med begrunnelse.', UTENFOR_OMFANG),
      [],
      { skjema: { justert: { [STI.prosent]: '20' } } },
    ),
    k1('F1-11', 'pasientforhold', 'amitriptylin 50 mg, eldre eller hjerte- og karsykdom', AMITRIPTYLIN, '50', stopp(utenforOmfang(50), UTENFOR_OMFANG), [], {
      skjema: { svar: { eldre_hjerte: true } },
    }),
    k1(
      'F1-12',
      'pasientforhold',
      'amitriptylin 50 mg, tidligere seponeringssymptomer',
      AMITRIPTYLIN,
      '50',
      stopp('Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen.'),
      [],
      { skjema: { pasientforhold: { tidligere_seponeringssymptomer: true } } },
    ),
    k1(
      'F1-13',
      'ikke_godkjent',
      'amitriptylin 50 mg, den langsomme varianten (ikke i forslaget)',
      AMITRIPTYLIN,
      '50',
      stopp('ikke et tilfelle godkjenningen kan gjelde for; ingen tilfeller er kontrollert', UTENFOR_OMFANG),
      [],
      { regel: { id: 'seponering-amitriptylin-langsom' }, ref: 'K1-04' },
    ),
    k1(
      'F1-14',
      'interaksjon',
      'amitriptylin 50 mg, organfunksjon og interaksjoner ikke vurdert',
      AMITRIPTYLIN,
      '50',
      stopp('Må bekreftes før beregning: Lever- og nyrefunksjon og interaksjoner er vurdert.'),
      [],
      { skjema: { bekreftet: ['startforslag'] } },
    ),
    // --- Nortriptylin v12
    k1(
      'F1-15',
      'vanlig_dose',
      'nortriptylin 50 mg, kort, forskriveren velger ved hvert trinn',
      NORTRIPTYLIN,
      '50',
      plan(
        STARTFORLOP,
        'Dag 1–28: Nortriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))',
        'Dag 29–56: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg',
        'Dag 57–84: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))',
        'Fra dag 85: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))',
      ),
      [],
      { velger: [40, 25, 20], ref: 'K1-07' },
    ),
    k1(
      'F1-16',
      'vanlig_dose',
      'nortriptylin 150 mg, kort',
      NORTRIPTYLIN,
      '150',
      plan(
        STARTFORLOP,
        'Dag 1–28: Nortriptylin peroralt: 120 mg = 2 tabletter à 10 mg + 2 tabletter à 50 mg (valgt av forskriveren (beregnet 112,5 mg; −20 %))',
        'Dag 29–56: Nortriptylin peroralt: 100 mg = 2 tabletter à 50 mg (valgt av forskriveren (beregnet 90 mg; −16,67 %))',
        'Dag 57–84: Nortriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg',
        'Dag 85–112: Nortriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))',
        'Dag 113–140: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg',
        'Dag 141–168: Nortriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))',
        'Dag 169–196: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))',
        'Dag 197–224: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))',
        'Fra dag 225: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))',
      ),
      [],
      { velger: [120, 100, 60, 35, 30, 25, 20] },
    ),
    k1(
      'F1-17',
      'pasientforhold',
      'nortriptylin 50 mg, lang behandlingstid',
      NORTRIPTYLIN,
      '50',
      plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg'),
      [],
      { skjema: { svar: LANG } },
    ),
    k1('F1-18', 'uvanlig_dose', 'nortriptylin 75 mg, kort (startdose utenfor omfanget)', NORTRIPTYLIN, '75', stopp(utenforOmfang(75), UTENFOR_OMFANG), [], { ref: 'K1-08' }),
    k1('F1-19', 'pasientforhold', 'nortriptylin 50 mg, eldre', NORTRIPTYLIN, '50', stopp(utenforOmfang(50), UTENFOR_OMFANG), [], { skjema: { svar: { eldre: true } } }),
    // --- Escitalopram v12 og den langsomme varianten v8
    k1(
      'F1-20',
      'vanlig_dose',
      'escitalopram tablett 20 mg, kort',
      ESCITALOPRAM,
      '20',
      plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Escitalopram peroralt: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg'),
      [],
      { skjema: form(TABLETT), ref: 'K1-12' },
    ),
    k1('F1-21', 'uvanlig_dose', 'escitalopram tablett 10 mg, kort (utenfor omfanget)', ESCITALOPRAM, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], { skjema: form(TABLETT), ref: 'K1-13' }),
    k1('F1-22', 'uvanlig_dose', 'escitalopram tablett 20 mg, lang behandlingstid (utenfor omfanget)', ESCITALOPRAM, '20', stopp(utenforOmfang(20), UTENFOR_OMFANG), [], {
      skjema: { ...form(TABLETT), svar: LANG },
    }),
    k1(
      'F1-23',
      'vanlig_dose',
      'escitalopram dråper 20 mg, kort, forskriveren velger ved hvert trinn',
      ESCITALOPRAM,
      '20',
      plan(
        STARTFORLOP,
        'Dag 1–28: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg',
        'Dag 29–56: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,25 mg; −20 %))',
        'Dag 57–84: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg',
        'Dag 85–112: Escitalopram peroralt: 7 mg = 7 dråper à 1 mg (valgt av forskriveren (beregnet 6,75 mg; −22,22 %))',
        'Dag 113–140: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg (valgt av forskriveren (beregnet 5,25 mg; −14,29 %))',
        'Dag 141–168: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))',
        'Dag 169–196: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))',
        'Fra dag 197: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg',
      ),
      [],
      { skjema: form(DRAPER), velger: [12, 7, 6, 5, 4], ref: 'K1-09' },
    ),
    k1(
      'F1-24',
      'vanlig_dose',
      'escitalopram dråper 10 mg, kort, forskriveren velger ved hvert trinn',
      ESCITALOPRAM,
      '10',
      plan(
        STARTFORLOP,
        'Dag 1–28: Escitalopram peroralt: 8 mg = 8 dråper à 1 mg (valgt av forskriveren (beregnet 7,5 mg; −20 %))',
        'Dag 29–56: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg',
        'Dag 57–84: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))',
        'Dag 85–112: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))',
        'Fra dag 113: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg',
      ),
      [],
      { skjema: form(DRAPER), velger: [8, 5, 4] },
    ),
    k1(
      'F1-25',
      'pasientforhold',
      'escitalopram dråper 20 mg, lang behandlingstid, før forskriveren har valgt',
      ESCITALOPRAM,
      '20',
      plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Escitalopram peroralt: 18 mg = 18 dråper à 1 mg'),
      [17],
      { skjema: { ...form(DRAPER), svar: LANG }, ref: 'K1-10' },
    ),
    k1(
      'F1-26',
      'pasientforhold',
      'escitalopram dråper 20 mg, lang behandlingstid, forskriveren velger ved hvert trinn',
      ESCITALOPRAM,
      '20',
      plan(
        STARTFORLOP,
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
      ),
      [],
      { skjema: { ...form(DRAPER), svar: LANG }, velger: [17, 16, 15, 14, 13, 12, 11, 10] },
    ),
    k1('F1-27', 'pasientforhold', 'escitalopram dråper 10 mg, lang behandlingstid', ESCITALOPRAM, '10', plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg'), [], {
      skjema: { ...form(DRAPER), svar: LANG },
    }),
    k1('F1-28', 'uvanlig_dose', 'escitalopram dråper 15 mg, kort (startdose utenfor omfanget)', ESCITALOPRAM, '15', stopp(utenforOmfang(15), UTENFOR_OMFANG), [], { skjema: form(DRAPER) }),
    k1('F1-29', 'uvanlig_dose', 'escitalopram dråper 1 mg', ESCITALOPRAM, '1', stopp(utenforOmfang(1), UTENFOR_OMFANG), [], { skjema: form(DRAPER), ref: 'K1-15' }),
    k1(
      'F1-30',
      'pasientforhold',
      'escitalopram dråper 20 mg, 65 år eller eldre',
      ESCITALOPRAM,
      '20',
      stopp('Startdosen 20 mg er utenfor det regelen gjelder for (høyst 10 mg ved eldre over 65 år).', UTENFOR_OMFANG),
      [],
      { skjema: { ...form(DRAPER), svar: { eldre: true } }, ref: 'K1-14' },
    ),
    k1(
      'F1-31',
      'pasientforhold',
      'escitalopram dråper 20 mg, QT-forlengelse',
      ESCITALOPRAM,
      '20',
      stopp('Regelen gjelder ikke: Pasienten har kjent QT-forlengelse eller medfødt langt QT-syndrom, eller bruker et annet legemiddel som forlenger QT-intervallet.'),
      [],
      { skjema: { ...form(DRAPER), pasientforhold: { qt_forlengelse: true } } },
    ),
    k1(
      'F1-32',
      'vanlig_dose',
      'escitalopram dråper 20 mg, tidligere seponeringssymptomer (langsom variant)',
      ESCITALOPRAM_LANGSOM,
      '20',
      plan(EN_FORSTE_REDUKSJON, 'Fra dag 1: Escitalopram peroralt: 19 mg = 19 dråper à 1 mg'),
      [],
      { skjema: form(DRAPER), ref: 'K1-11' },
    ),
    k1('F1-33', 'uvanlig_dose', 'escitalopram dråper 10 mg, langsom variant (utenfor omfanget)', ESCITALOPRAM_LANGSOM, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], { skjema: form(DRAPER) }),
    k1('F1-34', 'uvanlig_dose', 'escitalopram tablett 20 mg, langsom variant (utenfor omfanget)', ESCITALOPRAM_LANGSOM, '20', stopp(utenforOmfang(20), UTENFOR_OMFANG), [], { skjema: form(TABLETT) }),
    // --- Uten simulert godkjenning, endret regel og endrede preparater
    k1('F1-35', 'ikke_godkjent', 'amitriptylin slik verktøyet er i dag', AMITRIPTYLIN, '50', { utfall: 'ingen', status: 'ikke_godkjent' }, [], { regel: undefined }),
    k1('F1-36', 'ikke_godkjent', 'nortriptylin slik verktøyet er i dag', NORTRIPTYLIN, '50', { utfall: 'ingen', status: 'ikke_godkjent' }, [], { regel: undefined }),
    k1('F1-37', 'ikke_godkjent', 'escitalopram slik verktøyet er i dag', ESCITALOPRAM, '20', { utfall: 'ingen', status: 'ikke_godkjent' }, [], { regel: undefined }),
    k1(
      'F1-38',
      'regelendring',
      'amitriptylin 100 mg med trinnlengden endret etter godkjenningen',
      AMITRIPTYLIN,
      '100',
      ingenPlan('Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke)'),
      [],
      {
        regel: endretEtter(AMITRIPTYLIN, 'trinnlengden 28 → 21 dager', (r) => {
          const f = r.plan.forlop[0]!.faser[0]!
          if (f.type === 'nedtrapping') f.trinnlengde.verdi = 21
        }),
      },
    ),
    k1(
      'F1-39',
      'preparat',
      'amitriptylin 50 mg, kort, 10 mg avregistrert',
      AMITRIPTYLIN,
      '50',
      stopp(
        'amitriptylin (fra): styrken 10 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert.',
        UTENFOR_OMFANG,
      ),
      [],
      { fest: avregistrert('amitriptylin', 10) },
    ),
    k1(
      'F1-40',
      'preparat',
      'amitriptylin 50 mg, kort, ny styrke 20 mg i FEST',
      AMITRIPTYLIN,
      '50',
      plan(
        STARTFORLOP,
        'Dag 1–28: Amitriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))',
        'Dag 29–56: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg',
        'Dag 57–84: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))',
        'Fra dag 85: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))',
      ),
      [],
      { fest: nyStyrke('amitriptylin', 10, 20, 'nytt'), velger: [40, 25, 20] },
    ),
  ],
}

/* --- K1: nedtrapping til seponering --------------------------------------------- */

/** Versjon 13 av escitalopramregelen: minste trinn fra 3 mg og avslutning fra 1 mg med dråper, som forslag (`regler/k1.ts`). */
const K1_ESCITALOPRAM: Kontrollregel = { id: 'seponering-escitalopram', versjon: 13, fingeravtrykk: 'e8a3c17edda10da43b1df4171a733a23133da50ebcda31cd71a771022a8a78d7' }
/** Versjon 12 av sertralinregelen, uendret i K1 (de tre andre versjon 12-reglene står i forslag 1). */
const SERTRALIN: Kontrollregel = { id: 'seponering-sertralin', versjon: 12, fingeravtrykk: '5be29652a2afc47a60cbd394a45bf5cdbad92dfe259e1fa263751e5476a8198e' }

const DATO_K1 = K1_DATO
/** Kasus gjennom den samme veien som verktøysiden, som aldri viser en delplan ({@link kliniskDoseplan}). */
const somVerktoysiden =
  (f: ReturnType<typeof kasusFor>): ReturnType<typeof kasusFor> =>
  (...a) => ({ ...f(...a), motor: kliniskDoseplan })
/** Regelsettene K1 gjelder: versjon 13 slik appen brukte den til versjon 14 (B2) ble godkjent 05.11.2026 og erstattet den. */
const SETTENE_K1 = FOR_B2
/** Kasus for K1 med regelversjoner uten åpne valg (versjon 12), med simulert godkjenning. */
const kk = somVerktoysiden(kasusFor(DATO_K1, SETTENE_K1))
/** Kasus for escitalopram versjon 13: den registrerte godkjenningen, gjennom verktøyets egen tilgjengelighet; uten den simulert. */
const ke = somVerktoysiden(kasusFor(DATO_K1, SETTENE_K1, true))

/** Stoppet når planen ikke når sluttmålet ({@link KOMPLETT_IKKE_TILGJENGELIG}). */
const ikkeKomplett = (stoff: string, hvorfor: string) => stopp(`${KOMPLETT_IKKE_TILGJENGELIG}: ${stoff}: ${hvorfor}.`)
const IKKE_VIDERE = 'neste trinn kan ikke gis med preparatene'
const EN_REDUKSJON = 'én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene'
/** Escitalopram versjon 13 står over sluttdosen. */
const overSluttdosen = (mg: number) => `regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på ${tall(mg)} mg)`

/** Vurderingspunktet før hver doseendring i escitalopram versjon 13. */
const vurderingFor = (dag: number) =>
  `Dag ${dag}: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.`
/**
 * Radene i en komplett plan med escitalopram dråper og 28 dager per trinn:
 * hvert trinn er `[mg]` eller `[mg, beregnet mg, faktisk reduksjon i %]` når
 * forskriveren har valgt dosen, så seponering og oppfølgingen 7, 14 og 28
 * dager etter siste dose.
 */
function draperTilSeponering(trinn: ([number] | [number, number, number])[]): string[] {
  const rader = trinn.flatMap(([mg, beregnet, prosent], i) => {
    const fra = 1 + 28 * i
    const dose = `Dag ${fra}–${fra + 27}: Escitalopram peroralt: ${tall(mg)} mg = ${mg} ${mg === 1 ? 'dråpe' : 'dråper'} à 1 mg${beregnet === undefined ? '' : ` (valgt av forskriveren (beregnet ${tall(beregnet)} mg; −${tall(prosent!)} %))`}`
    return [...(i === 0 ? [] : [vurderingFor(fra)]), dose]
  })
  const seponert = 1 + 28 * trinn.length
  return [
    ...rader,
    vurderingFor(seponert),
    `Fra dag ${seponert}: Escitalopram peroralt: Seponert`,
    ...[7, 14, 28].map((d) => `Dag ${seponert - 1 + d}: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall ${d} dager etter siste dose.`),
  ]
}

/** Forskriverens valg i K1-01 (escitalopram dråper fra 10 mg), gjort på forhånd: trinn, dosen før og valgt dose. */
const VALG_FRA_10_MG = (
  [
    [1, 10, 8],
    [3, 6, 5],
    [4, 5, 4],
    [6, 3, 2],
    [7, 2, 1],
  ] as const
).map(([trinn, fra_mg, mg]) => ({ forlop: 'fra', trinn, fra_mg, mg }))

export const FORSLAG_K1: Kontrollforslag = {
  nr: 2,
  overskrift: 'K1: nedtrapping av antidepressiv til seponering – kontrollgrunnlag',
  tittel: 'Escitalopram med dråper helt til seponering (3 → 2 → 1 mg), og ellers «komplett plan ikke tilgjengelig»',
  fil: 'docs/verktøy-k1-nedtrapping-kontrollgrunnlag.md',
  dato: DATO_K1,
  verktoy: SEPONERING,
  regler: [K1_ESCITALOPRAM],
  settene: SETTENE_K1,
  motor: kliniskDoseplan,
  simulerAvklaring: true,
  visPlanutfall: true,
  innledning: (fest) => [
    `**Escitalopram med dråper helt til seponering (3 → 2 → 1 mg), og ellers «${KOMPLETT_IKKE_TILGJENGELIG}».** Grunnlag for uavhengig faglig kontroll av K1 i \`docs/verktøy-klinisk-leveranseplan-2026-11.md\`, ny runde etter kontrollen av PR #323 ${norskDato(DATO_K1)}.`,
    `**Escitalopram versjon 13 er klinisk godkjent av kontrolløren ${norskDato(K1_GODKJENNING_0411.dato)}, bare i et snevert omfang.** Med dråper (1 mg per dråpe) kan forskriveren fra 3 mg velge et minste trinn på én dråpe, 3 → 2 → 1 mg, og fra 1 mg holdes dosen et helt trinn før seponering, med vurdering før hver endring og 7, 14 og 28 dager etter siste dose. Sluttdosen 1 mg er avgjort faglig av Peder ${norskDato(K1_9_AVGJORELSE.dato)} for et avgrenset omfang (K1.9, avsnittet «Peders avgjørelse på K1.9»); det minste trinnet og oppfølgingsdagene er avklart av kontrolløren ${norskDato(K1_KONTROLL_0411.minste_trinn.dato)} (K1.10 og K1.12). Kontrolløren godkjente deretter nøyaktig denne versjonen og dette fingeravtrykket (avsnittet «Kontrollørens godkjenning av versjon 13»). Peder har ikke godkjent noe annet enn K1.9. Alle andre regler, også nortriptylin, amitriptylin og sertralin, er uendret og ikke godkjent. Motoren (#319) viser aldri en delplan: når en plan ikke når sluttmålet, står det «${KOMPLETT_IKKE_TILGJENGELIG}» og grunnen, uten doser. Sperrene og synligheten bare for administratorer er uendret.`,
    `**K1-milepælen er ikke nådd.** Ett virkestoff med to startdoser oppfyller ikke målet om to ulike vanlige nedtrappingsscenarier i relevant bredde. Godkjenningen gjelder bare denne første leveransen; dekningsarbeidet for de andre stoffene og pasientgruppene fortsetter separat (avsnittet «Hva som gjenstår»).`,
    `**Versjon 13 er erstattet i appen av versjon 14 med tabletter og dråper (B2), som kontrolløren godkjente ${norskDato(B2_GODKJENNING_0511.dato)} (\`docs/verktøy-b2-escitalopram-kontrollgrunnlag.md\`).** Kasusene her regnes derfor med regelsettene slik appen brukte dem til da, så grunnlaget fortsatt gjelder nøyaktig versjon 13; godkjenningen av versjon 13 er uendret.`,
    `Kasusene for escitalopram går uten simulert godkjenning, gjennom verktøyets egen tilgjengelighet og den samme veien som verktøysiden, som aldri viser en delplan, med de norske preparatene i FEST-uttrekket hentet ${fest}. Bare kasusene som prøver en endret regel (K1-22 og K1-23), bruker en kopi. Planene for nortriptylin, amitriptylin og sertralin er regnet på en kopi med en simulert godkjenning («${SIMULERT_KONTROLLOR}») for å vise at de stopper selv om de ble godkjent; kopien lagres ikke og brukes ikke av appen. Kasusene er syntetiske; pasientopplysninger inngår ikke, og ingen tekst fra Psychiatrienet vises.`,
  ],
  avgrensning: {
    dato: DATO_K1,
    tekst:
      'Den sikre stoppen godtas, men K1 er ikke godtatt som produkt. Lag minst ett avgrenset, kildeforankret positivt klinisk forløp der det faktisk kan forsvares: definert startdose og behandlingshistorikk, små relative lavdosetrinn, dokumentert presisjon og administrasjon (også tablett ↔ dråper når aktuelt), symptomstyrt lengde og en særskilt vurdert siste dose → null. Laveste dose i preparatomtalen er ikke sluttgrensen, og algoritmen skal aldri finne opp oppmåling eller seponeringsgrense. Uten faglig og praktisk forsvarlig komplett plan: full stopp uten kopierbar delplan. Den globale sperren mot delplaner hører hjemme i motoren (#319). Lag positive og negative ende-til-ende-tester med faktiske norske preparater, og verifiser regelversjon og fingeravtrykk separat. Ingen av de fire K1-reglene er godkjent.',
  },
  forutsetninger: [
    'Godkjenningen gjelder nøyaktig versjonen og fingeravtrykket i tabellen over. Sluttdosen og seponeringen fra 1 mg er avklart av Peder (K1.9); det minste trinnet og oppfølgingsdagene er avklart av kontrolløren (K1.10 og K1.12). Regelen har ingen åpne valg.',
    `Kontrolløren ville ikke avgjøre sluttdosen alene og ba om en uavhengig, eksplisitt avklaring. Peder avgjorde K1.9 ${norskDato(K1_9_AVGJORELSE.dato)} for et avgrenset omfang; avgjørelsen gjelder ikke det minste trinnet, oppfølgingsdagene eller regelen som helhet. Grensen «laveste døgndose i preparatomtalen» fra en tidligere runde brukes ikke.`,
    'Godkjenningen er registrert i regelen (rollen uavhengig kontrollør, med fingeravtrykket og kontrollørens avgrensning). Endres regelen, stemmer ikke fingeravtrykket, verktøyet gir ingen plan, og kontrollen må gjøres på nytt (kasus K1-23).',
    'Motoren (#319) har en global sperre: verktøysiden viser aldri en delplan, for noen regel. Nortriptylin, amitriptylin og sertralin trenger derfor ingen ny versjon for å gi «komplett plan ikke tilgjengelig».',
    'Sperrene for de kliniske verktøyene og synligheten bare for administratorer beholdes til verktøyene er klare for klinisk prøvebruk og Peder har godkjent åpning for vanlige brukere.',
  ],
  sporsmal: [
    {
      nr: 'K1.9',
      sporsmal:
        'Sluttdose for escitalopram: er 1 mg (én dråpe), holdt et helt trinn (minst 28 dager som standard, lenger ved symptomer), en forsvarlig siste dose før seponering? Ingen registrert kilde angir en sluttdose. 1 mg er 5 % av 20 mg og 10 % av 10 mg; RCPsych beskriver at noen trenger å gå ned mot 2 % av opprinnelig dose, og at seponeringssymptomer kan komme uansett hvor lav dosen er. Doser under 1 mg krever fortynning, som ikke er dokumentert. Etterkontrollen av 0c25831 ba om en uavhengig og eksplisitt avklaring av hvilke pasienter 1 mg → 0 etter symptomstyrt hold er faglig forsvarlig for. Forslaget gjelder bare regelens kliniske omfang: voksne under 65 år, kort behandlingstid, ingen tidligere seponeringssymptomer eller mislykket nedtrapping, ikke nedsatt leverfunksjon og ikke kjent langsom CYP2C19-metaboliserer, med dråper. Trengs mindre trinn enn én dråpe, beregner verktøyet dem ikke: dosen holdes på siste tolererte dose, og videre nedtrapping planlegges individuelt, uten fortynning eller oppmåling fra verktøyet. Er 1 mg → 0 forsvarlig for denne gruppen?',
      anbefalt: `Avgjort av Peder ${norskDato(K1_9_AVGJORELSE.dato)}: «${K1_9_AVGJORELSE.valg}», avgrenset slik avsnittet «Peders avgjørelse på K1.9» siterer. Regelens kliniske omfang er det samme eller snevrere, og alle utenfor får et sikkert stopp (kasus K1-06, K1-07, K1-12, K1-13 og K1-25–K1-28). Kontrolløren har kontrollert at regelen følger avgjørelsen, og godkjent regelen (avsnittet «Kontrollørens godkjenning av versjon 13»).`,
    },
    {
      nr: 'K1.10',
      sporsmal:
        'Minste trinn: fra 3 mg er 3 → 2 mg en reduksjon på 33 % og 2 → 1 mg 50 %. Trinnene er større enn NICE-eksempelet på 25 % ved lav dose, og svaret på K1.6 var nei til et generelt større siste trinn på om lag 50 % som snarvei. Er ett minste trinn på én dråpe akseptabelt her, når det bare gjelder escitalopram dråper fra 3 mg eller lavere (der ingen mindre dose kan gis), forskriveren velger det aktivt, og tempoet styres av symptomer?',
      anbefalt: `Avklart av kontrolløren ${norskDato(K1_KONTROLL_0411.minste_trinn.dato)}: ja, avgrenset til dette escitalopramforløpet (avsnittet «Kontrollørens avklaring av K1.10 og K1.12»).`,
    },
    {
      nr: 'K1.11',
      sporsmal:
        'Overgang fra escitalopram tablett til dråper (K0-01): regelen sier nå at en pasient som bruker tabletter, kan gå over til dråper med samme døgndose i mg når planen starter. Grunnlaget er preparatomtalen for Cipralex 20 mg/ml dråper (DMP 07-4892, oppdatert 02.05.2024), registrert som kilden `dmp-cipralex-draper`: pkt. 2 (én dråpe er 1 mg) og pkt. 5.2 (dråpene er bioekvivalente med Cipralex tabletter). Generiske tabletter er godkjent mot Cipralex tabletter, men ikke sammenlignet direkte med dråpene. Er dette tilstrekkelig?',
      anbefalt: `Ja, mg for mg, slik regelen sier det. Planen starter da med dråper fra døgndosen pasienten bruker (kasus K1-01). Omfattet av kontrollørens godkjenning ${norskDato(K1_GODKJENNING_0411.dato)}, som viser til kasus K1-01 og K1-02.`,
    },
    {
      nr: 'K1.12',
      sporsmal:
        'Oppfølging etter siste dose: vurdering 7, 14 og 28 dager etter siste dose, i tillegg til vurderingen før hver endring. 7 og 14 dager bygger på preparatomtalen (symptomene kommer vanligvis de første dagene og går vanligvis over innen to uker); 28 dager er OUSFARs valg, fordi symptomene kan vare lenger og tilbakefall må vurderes. Er punktene riktige?',
      anbefalt: `Avklart av kontrolløren ${norskDato(K1_KONTROLL_0411.oppfolging.dato)}: ja, som kontrollpunkter, ikke som obligatoriske eller optimale dager for alle (avsnittet «Kontrollørens avklaring av K1.10 og K1.12»).`,
    },
    {
      nr: 'K1.13',
      sporsmal:
        'Escitalopram etter lang behandlingstid (10 % per trinn): dråpene gir hele milligram, så planen stopper på 9 mg (9 → 8 mg er 11 %), og verktøyet viser «komplett plan ikke tilgjengelig». Skal det være slik til en metode for mindre trinn er dokumentert?',
      anbefalt: 'Ja. Det minste trinnet gjelder bare fra 3 mg, og ingen dokumentert metode gir trinn på høyst 10 % under 10 mg.',
    },
    {
      nr: 'K1.14',
      sporsmal:
        'Nortriptylin og amitriptylin (K0-03): tablettene er 10, 25 og 50 mg, og verken FEST eller preparatomtalene for 10 mg-tablettene (Noritren, DMP 0000-04957, oppdatert 20.06.2024; Sarotex, 0000-04327; Amitriptylin Orifarm, 17-11692; Amitriptylin Abcur, 16-11418) oppgir deling. Amitriptylin mikstur 10 mg/5 ml finnes bare med godkjenningsfritak, og måleskjeen gir 5 og 10 mg. Planene stopper derfor på 20 mg med «komplett plan ikke tilgjengelig». Finnes en dokumentert metode?',
      anbefalt: 'Nei, ikke i dag. Reglene er uendret (versjon 12), og verktøyet gir «komplett plan ikke tilgjengelig».',
    },
    {
      nr: 'K1.15',
      sporsmal:
        'Sertralin (K0-02): tablettene er 25, 50 og 100 mg. Konsentratet til mikstur (Zoloft 20 mg/ml) har en gradert pipette, men preparatomtalen oppgir ikke graderingen, og konsentratet skal fortynnes. Kan konsentratet brukes når graderingen er dokumentert, og skal verktøyet kunne bruke en validert apotektilberedning?',
      anbefalt:
        'Bare når graderingen og den minste dosen som kan måles, er dokumentert, eller en navngitt tilberedning har dokumentert styrke, holdbarhet og måleutstyr. Ingen av delene er dokumentert i dag, så sertralin gir «komplett plan ikke tilgjengelig».',
    },
  ],
  avsnitt: [
    {
      tittel: 'Kontrollørens krav 03.11.2026, og hva som er gjort',
      tekst: tabell(
        ['Krav', 'Hva er gjort'],
        [
          [
            'Minst ett avgrenset, kildeforankret positivt forløp med små relative lavdosetrinn, dokumentert presisjon og administrasjon, symptomstyrt lengde og en særskilt vurdert siste dose → 0',
            'Escitalopram dråper fra 10 og 20 mg ved kort behandlingstid (kasus K1-01 og K1-02, avsnittet «Hvilke forløp som er komplette»): trinn på høyst 25 % til 3 mg, så 3 → 2 → 1 mg med dråper på 1 mg, 1 mg et helt trinn og seponering. Vurdering før hver endring og 7, 14 og 28 dager etter siste dose. Sluttdosen er avgjort av Peder (K1.9), og det minste trinnet og oppfølgingen er avklart av kontrolløren (K1.10 og K1.12).',
          ],
          ['Tablett ↔ dråper med eksakt ekvivalens og administrasjon', 'Preparatomtalen for dråpene er registrert som kilde (`dmp-cipralex-draper`); overgangen er mg for mg (K1.11, kasus K1-01).'],
          [
            'Ingen oppfunnet oppmåling eller seponeringsgrense',
            'Bare hele dråper; ingen fortynning, oppmåling eller apotektilberedning. Sluttdosen er ingen grense fra en kilde, men en dokumentert faglig avgjørelse for et avgrenset omfang (K1.9).',
          ],
          [
            'Ellers full stopp uten kopierbar delplan',
            'Motorens globale sperre (#319). Lang behandlingstid, escitalopram tablett, nortriptylin, amitriptylin og sertralin gir «komplett plan ikke tilgjengelig» (kasus K1-06–K1-08 og K1-14–K1-18).',
          ],
          [
            'Positive og negative ende-til-ende-tester med norske preparater; versjon og fingeravtrykk separat',
            '`src/__tests__/verktoyk1.test.ts`: kasusene her, alle planer i omfanget, og egne tester av versjon og fingeravtrykk.',
          ],
        ],
      ),
    },
    {
      tittel: 'Peders avgjørelse på K1.9',
      tekst: `${liste([
        `Dato: ${norskDato(K1_9_AVGJORELSE.dato)}, etter at kontrolløren ved kontrollene 03.11.2026 ikke ville avgjøre sluttdosen alene og ba om en uavhengig, eksplisitt avklaring eller at seponeringen ble sperret.`,
        `Beslutningskortet: «${K1_9_AVGJORELSE.kort}». Valgt alternativ: «${K1_9_AVGJORELSE.valg}».`,
        `Avgrensning, ordrett: «${K1_9_AVGJORELSE.avgrensning}»`,
        `Beslutningsregel, ordrett: «${K1_9_AVGJORELSE.beslutningsregel}»`,
        'Avgjørelsen gjelder bare K1.9: sluttdosen 1 mg og seponeringen fra 1 mg. Den gjelder ikke det minste trinnet (K1.10), oppfølgingsdagene (K1.12) eller regelen som helhet. Seponeringen fra 1 mg er en individuell klinisk vurdering i det avgrensede forløpet, ikke en påstand om at den minste hele dråpen i seg selv er en trygg terskel.',
      ])}

${tabell(
  ['Avgrensningen', 'Regelens kliniske omfang', 'Utenfor: sikkert stopp'],
  [
    ['Voksne', 'Under 18 år stopper ordinær planlegging', 'K1-28'],
    [
      'Under 65 år',
      'Bare nei på spørsmålet om alder over 65 år; også nei om nedsatt leverfunksjon og kjent langsom CYP2C19-metaboliserer, som er snevrere enn avgrensningen',
      'K1-12, K1-25, K1-26, K1-27',
    ],
    ['Kort behandlingstid', 'Komplett plan bare ved kort behandlingstid; lang behandlingstid gir «komplett plan ikke tilgjengelig»', 'K1-06, K1-07'],
    ['Uten tidligere seponeringsplager', 'Tidligere seponeringssymptomer eller mislykket nedtrapping: regelen gjelder ikke', 'K1-13'],
    ['Fra 10 eller 20 mg', 'Dråper fra 10 eller 20 mg; tablettpasienter går over til dråper med samme dose (K1.11)', 'K1-08, K1-10, K1-11'],
  ],
)}`,
    },
    {
      tittel: 'Kontrollørens avklaring av K1.10 og K1.12',
      tekst: `Kontrollen av 80e557b ${norskDato(K1_KONTROLL_0411.minste_trinn.dato)} besvarte de to siste åpne valgene uavhengig. Avklaringene er registrert på valgene i regelen (rollen uavhengig kontrollør, regelversjon 13) og gjelder nøyaktig dette forløpet og omfanget. De er ingen samlet godkjenning av regelen.

${liste([K1_KONTROLL_0411.minste_trinn.merknad, K1_KONTROLL_0411.oppfolging.merknad])}

Kontrolløren skrev også at et siste trinn til null er nødvendig ved seponering, og at det å være 100 % av gjenværende døgndose ikke alene er et faglig motargument. Begrunnelsen for 1 mg → 0 er en individuell klinisk vurdering i det avgrensede forløpet, ikke at den minste hele dråpen i seg selv er en trygg terskel.`,
    },
    {
      tittel: 'Kontrollørens godkjenning av versjon 13',
      tekst: `${K1_GODKJENNING_0411.kontroll} kom til en positiv, uavhengig faglig konklusjon for nøyaktig den snevre escitalopramregelen og godkjente den klinisk. Godkjenningen er registrert i regelen som siste steg i historikken, med rollen uavhengig kontrollør, regelversjon 13 og fingeravtrykket \`${K1_GODKJENNING_0411.fingeravtrykk}\`. Verktøyet gir planen bare så lenge regelen har nøyaktig dette fingeravtrykket.

${liste([
  `Avgrensning: ${K1_GODKJENNING_0411.avgrensning}`,
  'Kontrolløren støttet seg på NICE NG222 anbefaling 1.4.16, RCPsych «Stopping antidepressants» og den norske preparatomtalen for Cipralex dråper, som støtter individuelt tempo og en dokumentert doseform, men ikke angir en universell sluttdose. Dosereduksjon til null betyr heller ikke at eksponeringen opphører med en gang.',
  'Kasusene K1-01 og K1-02 viser de komplette planene og den kopierbare teksten uten simulert godkjenning; de negative kasusene viser at alle utenfor omfanget stopper uten doser.',
])}`,
    },
    {
      tittel: 'Hva som gjenstår',
      tekst: `${tabell(
        ['Funn', 'Status'],
        [
          [
            '1 mg → 0 er ikke klinisk validert; avklar uavhengig og eksplisitt hvilke pasienter det er forsvarlig for, og oppgi trygg håndtering når mindre trinn trengs',
            'Avgjort av Peder (K1.9, avsnittet under). Regelen sier at verktøyet ikke beregner trinn under én dråpe: dosen holdes på siste tolererte dose, og videre nedtrapping planlegges individuelt. Ingen fortynning eller oppmåling er lagt til.',
          ],
          ['De positive eksemplene er ett virkestoff med samme sluttrinn; de andre stoffene har ingen komplett plan', 'Riktig, og et reelt gjenstående leveransegap (under). K1 er ikke ferdig.'],
          [
            'Global sikring i #319 og kontroll etter integrasjonen; simulert godkjenning er ikke klinisk godkjenning',
            'Motoren (#319) har den globale sperren. Kontrollørens godkjenning er nå registrert i regelen, og kasusene for escitalopram går uten simulering gjennom verktøyets egen tilgjengelighet. Integrert kontroll av hele appen gjøres i QA (#321) etter at PR-ene er flettet.',
          ],
        ],
      )}

Funnene over er fra etterkontrollen av 0c25831 (03.11.2026).

**Gjenstående leveransegap (K1-milepælen er ikke nådd):** ett virkestoff med to startdoser oppfyller ikke målet om to ulike vanlige nedtrappingsscenarier i relevant bredde. Dekningsarbeidet fortsetter separat og sperrer ikke denne første leveransen.

${liste([
  'Nortriptylin og amitriptylin: ingen komplett plan; planen stopper på 20 mg til deling eller en flytende form er dokumentert (K1.14).',
  'Sertralin: ingen komplett plan; planen stopper på 75 mg til en målemetode eller tilberedning er dokumentert (K1.15).',
  'Escitalopram etter lang behandlingstid: ingen komplett plan; planen stopper på 9 mg (K1.13).',
  'Escitalopram tablett uten overgang til dråper: ingen komplett plan; planen stopper på 15 mg fra 20 mg.',
  'Escitalopram etter 65 år, ved nedsatt leverfunksjon, ved kjent langsom CYP2C19-metabolisme, ved tidligere seponeringsplager og fra andre startdoser enn 10 og 20 mg: ingen komplett plan (utenfor omfanget).',
])}`,
    },
    {
      tittel: 'Kontrollørens svar på K1.1–K1.8 (03.11.2026)',
      tekst: tabell(
        ['#', 'Spørsmålet', 'Svar', 'Hva det betyr nå'],
        [
          ['K1.1', 'Seponering fra laveste døgndose i preparatomtalen', 'Nei', 'Brukes ikke. Sluttdosen er et eget, åpent spørsmål (K1.9).'],
          ['K1.2', 'Seponering fra den siste dosen som kan gis (nortriptylin 20 mg)', 'Nei', 'Nortriptylin og amitriptylin gir «komplett plan ikke tilgjengelig».'],
          ['K1.3', 'Siste dose et helt trinn før seponering', 'Ja, som standard, med varighet styrt av symptomer', '1 mg holdes et helt trinn og forlenges ved symptomer.'],
          ['K1.4', 'Vurdering 28 dager etter siste dose', 'Ett oppfølgingspunkt, ikke det eneste', 'Vurdering 7, 14 og 28 dager etter siste dose (K1.12).'],
          ['K1.5', 'Overgang fra escitalopram tablett til dråper', 'Dokumenter eksakt ekvivalens', 'Dokumentert mg for mg (K1.11).'],
          ['K1.6', 'Større siste trinn (om lag 50 %)', 'Nei, ikke generelt', 'Bare ett minste trinn på én dråpe fra 3 mg for escitalopram (K1.10).'],
          ['K1.7', 'Delplaner ved lang behandlingstid', 'Nei, delplaner er ikke et klinisk produkt', '«Komplett plan ikke tilgjengelig» (K1.13).'],
          ['K1.8', 'Sertralin med grensen 25 mg', 'Nei', 'Ingen grense; sertralin gir «komplett plan ikke tilgjengelig» (K1.15).'],
        ],
      ),
    },
    {
      tittel: 'Hvilke forløp som er komplette',
      tekst: `${tabell(
        ['Tilfelle', 'Resultat med versjon 13', 'Kasus'],
        [
          ['Escitalopram dråper 10 mg, kort behandlingstid (også pasient på 10 mg tabletter, overgang mg for mg)', 'Komplett: 8 → 6 → 5 → 4 → 3 → 2 → 1 mg, seponert fra dag 197', 'K1-01 (K0-01)'],
          ['Escitalopram dråper 20 mg, kort behandlingstid', 'Komplett: 15 → 12 → 9 → 7 → 6 → 5 → 4 → 3 → 2 → 1 mg, seponert fra dag 281', 'K1-02'],
          ['Escitalopram dråper 10 og 20 mg, lang behandlingstid', '«Komplett plan ikke tilgjengelig»: stopper på 9 mg', 'K1-06, K1-07'],
          ['Escitalopram tablett 20 mg, kort behandlingstid', '«Komplett plan ikke tilgjengelig»: stopper på 15 mg; dråper gir en komplett plan', 'K1-08'],
          ['Nortriptylin, amitriptylin (versjon 12)', '«Komplett plan ikke tilgjengelig»: stopper på 20 mg', 'K1-14–K1-16 (K0-03)'],
          ['Sertralin (versjon 12)', '«Komplett plan ikke tilgjengelig»: stopper på 75 mg', 'K1-17, K1-18 (K0-02)'],
        ],
      )}

Ved hvert trinn som ikke kan gis nøyaktig, tilbyr verktøyet nøyaktig én dose, så de to komplette planene er bestemt av startdosen. Den siste dosen over 0 er alltid 1 mg, og planen viser seponeringen og oppfølgingen etter siste dose.`,
    },
    {
      tittel: 'Lave doser med norske preparater, og kildene',
      tekst: `${tabell(
        ['Stoff', 'Hva som finnes', 'Hva som mangler for små trinn', 'Kilde'],
        [
          [
            'Escitalopram',
            'Tabletter 5, 10 og 20 mg (10 og 20 mg kan deles i to). Dråper 20 mg/ml, én dråpe er 1 mg, bioekvivalente med Cipralex tabletter.',
            'Under 1 mg krever fortynning, som ikke er dokumentert. Under 3 mg er trinnene over 25 % (K1.10).',
            'FEST-uttrekket; dmp-cipralex; dmp-cipralex-draper (pkt. 2, 4.2, 4.4 og 5.2)',
          ],
          ['Nortriptylin', 'Tabletter 10, 25 og 50 mg.', 'Deling er ikke oppgitt i FEST eller preparatomtalen. Ingen flytende form (K1.14).', 'FEST-uttrekket; dmp-noritren'],
          [
            'Amitriptylin',
            'Tabletter 10, 25 og 50 mg. Mikstur 10 mg/5 ml og 50 mg/5 ml bare med godkjenningsfritak.',
            'Deling er ikke oppgitt. Måleskjeen til miksturen på 10 mg/5 ml gir 2,5 og 5 ml, det vil si 5 og 10 mg (K1.14).',
            'FEST-uttrekket; dmp-sarotex; preparatomtalen for Amitriptyline 10 mg/5 ml oral solution (Syri Limited, revidert 09.12.2025, pkt. 6.5)',
          ],
          [
            'Sertralin',
            'Tabletter 25, 50 og 100 mg (noen 50 og 100 mg kan deles i to). Konsentrat til mikstur 20 mg/ml.',
            'Pipetten er gradert, men graderingen er ikke oppgitt, og konsentratet skal fortynnes (K1.15).',
            'FEST-uttrekket; dmp-zoloft; svensk preparatomtale for Zoloft konsentrat pkt. 6.5 og 6.6',
          ],
        ],
      )}

Ingen tabeller fra Psychiatrienet er brukt eller konvertert. Ingen validert apotektilberedning er dokumentert.`,
    },
    {
      tittel: 'Hva som er endret fra versjon 12 av escitalopramregelen',
      tekst: liste([
        'Minste trinn (`strategi.minste_trinn`): fra 3 mg, når ingen dose innenfor valgområdet kan gis, kan forskriveren velge den nærmeste lavere dosen, med faktisk reduksjon høyst 50 %. Avklart av kontrolløren 04.11.2026 (K1.10).',
        `Avslutning (\`avslutning\`): fra 1 mg eller lavere holdes siste dose et helt trinn, og escitalopram seponeres etter en vurdering. Avgjort faglig av Peder ${norskDato(K1_9_AVGJORELSE.dato)} (K1.9).`,
        'Laveste dose (`dosevalg.min_mg`): 1 mg, én dråpe (preparatomtalen pkt. 2).',
        'Vurderingspunkter: før hver doseendring, med preparatomtalen pkt. 4.2 som grunnlag, og 7, 14 og 28 dager etter siste dose; dagene er avklart av kontrolløren 04.11.2026 (K1.12).',
        'Fortolkningen: overgangen fra tablett til dråper mg for mg (K1.11), at nedtrappingen går til null og at symptomer kan komme uansett hvor lav dosen er, og usikkerheten om sluttdosen. Teksten om at planen ikke går til null er erstattet.',
        'Regneeksemplene er regnet på nytt: uten preparater stopper planen fra 20 mg på 1,13 mg, over sluttdosen, så den seponerer ikke; fra 10 mg ved lang behandlingstid på 2,82 mg.',
        'Det kliniske omfanget, trinnstørrelsene, trinnlengdene, spørsmålene og unntakene er uendret. Den langsomme varianten og alle andre regler er uendret; de godkjente reglene har samme fingeravtrykk som før.',
      ]),
    },
  ],
  utgangspunkt: {
    tittel: 'Hvor nedtrappingen stopper med versjon 12',
    settene: SETTENE_1,
    regler: [AMITRIPTYLIN, NORTRIPTYLIN, ESCITALOPRAM, SERTRALIN],
  },
  kasusinnledning:
    'Kasusene går gjennom den samme veien som verktøysiden, som aldri viser en delplan, og kjøres i testene (`src/__tests__/verktoyk1.test.ts`). De viser de komplette planene, at hver plan som ikke når seponering, stopper uten doser, grensene for omfanget, hva verktøyet tilbyr i dag for de andre stoffene, og at en endret regel eller et endret preparat stopper planen. Kolonnen K0 viser kasuset i leveranseplanen hvert kasus svarer på. Uten annen merknad er escitalopramregelen den registrert godkjente regelen slik verktøyet har den, uten simulering; for nortriptylin, amitriptylin og sertralin er regelen den simulert godkjente kopien. Organfunksjon og interaksjoner er bekreftet, og svaret er nei på alle unntak og spørsmål.',
  refkolonne: 'K0',
  kasus: [
    // --- Komplette planer: escitalopram dråper til seponering
    ke(
      'K1-01',
      'vanlig_dose',
      'escitalopram 10 mg, kort behandlingstid; pasienten bruker tabletter og går over til dråper med samme døgndose',
      K1_ESCITALOPRAM,
      '10',
      {
        ...plan(null, ...draperTilSeponering([[8, 7.5, 20], [6], [5, 4.5, 16.67], [4, 3.75, 20], [3], [2, 2.25, 33.33], [1, 1.5, 50]])),
        planutfall: `${KOMPLETT}: Escitalopram seponert fra dag 197.`,
      },
      [],
      { skjema: form(DRAPER), velger: [8, 5, 4, 2, 1], ref: 'K0-01' },
    ),
    ke(
      'K1-02',
      'vanlig_dose',
      'escitalopram dråper 20 mg, kort behandlingstid',
      K1_ESCITALOPRAM,
      '20',
      {
        ...plan(null, ...draperTilSeponering([[15], [12, 11.25, 20], [9], [7, 6.75, 22.22], [6, 5.25, 14.29], [5, 4.5, 16.67], [4, 3.75, 20], [3], [2, 2.25, 33.33], [1, 1.5, 50]])),
        planutfall: `${KOMPLETT}: Escitalopram seponert fra dag 281.`,
      },
      [],
      { skjema: form(DRAPER), velger: [12, 7, 6, 5, 4, 2, 1] },
    ),
    // --- Underveis: verktøyet tilbyr én dose og viser ingen doser før planen er komplett
    ke(
      'K1-03',
      'vanlig_dose',
      'escitalopram dråper 10 mg, før forskriveren har valgt',
      K1_ESCITALOPRAM,
      '10',
      stopp('escitalopram dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig'),
      [8],
      { skjema: form(DRAPER) },
    ),
    ke(
      'K1-04',
      'vanlig_dose',
      'escitalopram dråper 10 mg, valgt ned til 3 mg: minste trinn til 2 mg tilbys',
      K1_ESCITALOPRAM,
      '10',
      ikkeKomplett('escitalopram', `${IKKE_VIDERE}, og ${overSluttdosen(3)}`),
      [2],
      { skjema: form(DRAPER), velger: [8, 5, 4] },
    ),
    ke(
      'K1-05',
      'vanlig_dose',
      'escitalopram dråper 10 mg, valgt ned til 2 mg: minste trinn til 1 mg tilbys',
      K1_ESCITALOPRAM,
      '10',
      ikkeKomplett('escitalopram', `${IKKE_VIDERE}, og ${overSluttdosen(2)}`),
      [1],
      { skjema: form(DRAPER), velger: [8, 5, 4, 2] },
    ),
    // --- Ingen komplett plan
    ke('K1-06', 'pasientforhold', 'escitalopram dråper 20 mg, lang behandlingstid', K1_ESCITALOPRAM, '20', ikkeKomplett('escitalopram', `${IKKE_VIDERE}, og ${overSluttdosen(9)}`), [], {
      skjema: { ...form(DRAPER), svar: LANG },
      velger: [17, 16, 15, 14, 13, 12, 11, 10],
    }),
    ke('K1-07', 'pasientforhold', 'escitalopram dråper 10 mg, lang behandlingstid', K1_ESCITALOPRAM, '10', ikkeKomplett('escitalopram', `${EN_REDUKSJON}, og ${overSluttdosen(9)}`), [], {
      skjema: { ...form(DRAPER), svar: LANG },
    }),
    ke('K1-08', 'vanlig_dose', 'escitalopram tablett 20 mg, kort behandlingstid', K1_ESCITALOPRAM, '20', ikkeKomplett('escitalopram', `${EN_REDUKSJON}, og ${overSluttdosen(15)}`), [], {
      skjema: form(TABLETT),
    }),
    // --- Utenfor omfanget og stopp
    ke('K1-09', 'uvanlig_dose', 'escitalopram tablett 10 mg, kort behandlingstid (utenfor omfanget; dråper i K1-01)', K1_ESCITALOPRAM, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], {
      skjema: form(TABLETT),
      ref: 'K0-01',
    }),
    ke('K1-10', 'uvanlig_dose', 'escitalopram dråper 15 mg, kort behandlingstid (omfanget er ikke utvidet)', K1_ESCITALOPRAM, '15', stopp(utenforOmfang(15), UTENFOR_OMFANG), [], {
      skjema: form(DRAPER),
    }),
    ke('K1-11', 'uvanlig_dose', 'escitalopram dråper 3 mg som startdose (det minste trinnet gir ingen nye startdoser)', K1_ESCITALOPRAM, '3', stopp(utenforOmfang(3), UTENFOR_OMFANG), [], {
      skjema: form(DRAPER),
    }),
    ke(
      'K1-12',
      'pasientforhold',
      'escitalopram dråper 20 mg, 65 år eller eldre',
      K1_ESCITALOPRAM,
      '20',
      stopp('Startdosen 20 mg er utenfor det regelen gjelder for (høyst 10 mg ved eldre over 65 år).', UTENFOR_OMFANG),
      [],
      { skjema: { ...form(DRAPER), svar: { eldre: true } } },
    ),
    ke(
      'K1-13',
      'pasientforhold',
      'escitalopram dråper 20 mg, tidligere seponeringssymptomer',
      K1_ESCITALOPRAM,
      '20',
      stopp('Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen.'),
      [],
      { skjema: { ...form(DRAPER), pasientforhold: { tidligere_seponeringssymptomer: true } } },
    ),
    // --- Nortriptylin, amitriptylin og sertralin, uendret (versjon 12)
    kk('K1-14', 'vanlig_dose', 'nortriptylin 50 mg, kort behandlingstid', NORTRIPTYLIN, '50', ikkeKomplett('nortriptylin', `${IKKE_VIDERE}; avslutning vurderes individuelt`), [], {
      velger: [40, 25, 20],
    }),
    kk('K1-15', 'vanlig_dose', 'amitriptylin 25 mg, kort behandlingstid', AMITRIPTYLIN, '25', ikkeKomplett('amitriptylin', EN_REDUKSJON), [], { velger: [20], ref: 'K0-03' }),
    kk(
      'K1-16',
      'vanlig_dose',
      'amitriptylin 50 mg, kort, før forskriveren har valgt',
      AMITRIPTYLIN,
      '50',
      stopp('amitriptylin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig.'),
      [40],
    ),
    kk('K1-17', 'vanlig_dose', 'sertralin tablett 100 mg, kort behandlingstid', SERTRALIN, '100', ikkeKomplett('sertralin', EN_REDUKSJON), [], { ref: 'K0-02' }),
    kk('K1-18', 'vanlig_dose', 'sertralin tablett 200 mg, kort behandlingstid', SERTRALIN, '200', ikkeKomplett('sertralin', `${IKKE_VIDERE}; avslutning vurderes individuelt`), [], {
      velger: [125, 100],
    }),
    // --- Verktøyet i dag, endret regel og endrede preparater
    ke('K1-19', 'preparat', 'escitalopram 10 mg slik verktøyet er i dag, før legemiddelformen er valgt: verktøyet ber om valget', K1_ESCITALOPRAM, '10', { utfall: 'formvalg', forlop: ['fra'] }, [], {
      ref: 'K0-01',
    }),
    kk('K1-20', 'ikke_godkjent', 'amitriptylin slik verktøyet er i dag', AMITRIPTYLIN, '25', { utfall: 'ingen', status: 'ikke_godkjent' }, [], { regel: undefined, ref: 'K0-03' }),
    kk('K1-21', 'ikke_godkjent', 'sertralin slik verktøyet er i dag', SERTRALIN, '100', { utfall: 'ingen', status: 'ikke_godkjent' }, [], { regel: undefined, ref: 'K0-02' }),
    ke(
      'K1-22',
      'ikke_godkjent',
      'escitalopram dråper 10 mg, godkjent med det minste trinnet uten avklaring (K1.10), med valgene fra K1-01',
      K1_ESCITALOPRAM,
      '10',
      ingenPlan('Regelen har åpne valg som må avklares faglig'),
      [],
      { skjema: { ...form(DRAPER), trinnvalg: VALG_FRA_10_MG }, regel: godkjentUtenAvklaring(K1_ESCITALOPRAM, /minste_trinn/, 'det minste trinnet', DATO_K1) },
    ),
    ke(
      'K1-23',
      'regelendring',
      'escitalopram dråper 10 mg med sluttdosen endret til 2 mg etter godkjenningen, med valgene fra K1-01',
      K1_ESCITALOPRAM,
      '10',
      ingenPlan('Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke)'),
      [],
      {
        skjema: { ...form(DRAPER), trinnvalg: VALG_FRA_10_MG },
        regel: endretEtter(
          K1_ESCITALOPRAM,
          'sluttdosen 1 → 2 mg',
          (r) => {
            const f = r.plan.forlop[0]!.faser[0]!
            if (f.type === 'nedtrapping' && typeof f.avslutning === 'object') f.avslutning.fra_hoyst_mg.verdi = 2
          },
          DATO_K1,
          true,
        ),
      },
    ),
    ke(
      'K1-24',
      'preparat',
      'escitalopram dråper 10 mg, dråpene avregistrert',
      K1_ESCITALOPRAM,
      '10',
      stopp('Ingen av de perorale preparatene av escitalopram i FEST kan brukes med valgene som er gjort', 'er avregistrert i FEST'),
      [],
      { skjema: form(DRAPER), fest: avregistrert('escitalopram', 1) },
    ),
    // --- Utenfor Peders avgrensning (K1.9): sikre stopp, også fra 10 mg der preparatomtalen tillater dosen
    ke('K1-25', 'pasientforhold', 'escitalopram dråper 10 mg, kort, 65 år eller eldre', K1_ESCITALOPRAM, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], {
      skjema: { ...form(DRAPER), svar: { eldre: true } },
    }),
    ke('K1-26', 'pasientforhold', 'escitalopram dråper 10 mg, kort, nedsatt leverfunksjon', K1_ESCITALOPRAM, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], {
      skjema: { ...form(DRAPER), svar: { nedsatt_leverfunksjon: true } },
    }),
    ke('K1-27', 'pasientforhold', 'escitalopram dråper 10 mg, kort, kjent langsom CYP2C19-metaboliserer', K1_ESCITALOPRAM, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], {
      skjema: { ...form(DRAPER), svar: { langsom_cyp2c19: true } },
    }),
    ke('K1-28', 'pasientforhold', 'escitalopram dråper 10 mg, kort, under 18 år', K1_ESCITALOPRAM, '10', stopp('Regelen gjelder ikke: Pasienten er under 18 år.'), [], {
      skjema: { ...form(DRAPER), pasientforhold: { under_18: true } },
    }),
    ke(
      'K1-29',
      'pasientforhold',
      'escitalopram dråper 10 mg, kort, kjent QT-forlengelse (kontraindikasjon)',
      K1_ESCITALOPRAM,
      '10',
      stopp('Regelen gjelder ikke: Pasienten har kjent QT-forlengelse', 'Det er en kontraindikasjon i preparatomtalen'),
      [],
      { skjema: { ...form(DRAPER), pasientforhold: { qt_forlengelse: true } } },
    ),
  ],
}

/* --- B2: escitalopram med tabletter så lenge de gir dosen, så dråper ------------------ */

/** Escitalopram med tabletter og dråper (B2), versjon 14: egen regel som erstatter versjon 13 når den er godkjent (`regler/k1.ts`). */
const B2_REGEL: Kontrollregel = { id: B2_ESCITALOPRAM.id, versjon: 14, fingeravtrykk: '01b2fb560a8defe0114f9552d619bc6bf15e27b07fa6352d6331d9beb500721f' }
/** Kasus for B2 med simulert avklaring av de åpne valgene og simulert godkjenning, gjennom den samme veien som verktøysiden. */
const kb = somVerktoysiden(kasusFor(B2_DATO, undefined, true))
/** Valgene i K1-01 og K1-02 (dråper fra 10 og 20 mg), som forskriveren gjør i B2 også. */
const VELGER_10 = [8, 5, 4, 2, 1]
const VELGER_20 = [12, 7, 6, 5, 4, 2, 1]
const TRINN_10: ([number] | [number, number, number])[] = [[8, 7.5, 20], [6], [5, 4.5, 16.67], [4, 3.75, 20], [3], [2, 2.25, 33.33], [1, 1.5, 50]]
const FRA_10 = draperTilSeponering(TRINN_10)
const TRINN_20: ([number] | [number, number, number])[] = [[15], [12, 11.25, 20], [9], [7, 6.75, 22.22], [6, 5.25, 14.29], [5, 4.5, 16.67], [4, 3.75, 20], [3], [2, 2.25, 33.33], [1, 1.5, 50]]
const FRA_20 = draperTilSeponering(TRINN_20)
/** Planen fra 20 mg tabletter: første trinn (15 mg) med hele tabletter, så de samme dråpene som fra 20 mg dråper. */
const FRA_20_TABLETTER = ['Dag 1–28: Escitalopram peroralt: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg', ...FRA_20.slice(1)]
const SEPONERT_10 = `${KOMPLETT}: Escitalopram seponert fra dag 197.`
const SEPONERT_20 = `${KOMPLETT}: Escitalopram seponert fra dag 281.`
/**
 * Pakningene regnestykket i B2.3 bygger på. Fra FEST-uttrekket for
 * aksepttesten (30.10.2026): Cipralex dråper finnes bare som flaske à 15 ml,
 * og de minste pakningene med 5 og 10 mg tabletter har 28 stk. 20 dråper per
 * ml følger av 20 mg/ml og 1 mg per dråpe (preparatomtalen for dråpene pkt. 2).
 * Holdbarheten etter anbrudd, 8 uker (preparatomtalen for dråpene pkt. 6.3),
 * står ikke i FEST; den er oppgitt av kontrolløren 04.11.2026 med henvisning
 * til Felleskatalogen og må stå i kildegrunnlaget før en godkjenning.
 * Testene kontrollerer pakningene mot uttrekket.
 */
export const B2_PAKNINGER = { flaske_ml: 15, draper_per_ml: 20, holdbarhet_etter_anbrudd_dager: 56, minste_tablettpakning: { 5: 28, 10: 28 } } as const
const TRINNDAGER = 28
const FLASKE = B2_PAKNINGER.flaske_ml * B2_PAKNINGER.draper_per_ml
const ml = (draper: number) => tall(Math.round((draper / B2_PAKNINGER.draper_per_ml) * 10) / 10)

/**
 * Flaskene et forløp med dråper trenger, dag for dag: en åpnet flaske brukes
 * til den er tom eller holdbarheten etter anbrudd er ute, og resten kastes. En
 * dose som ikke er dekket av resten i den åpne flasken, tas fra en ny flaske.
 */
export function flaskerOverTid(draperPerDag: readonly number[], flaske: number = FLASKE, holdbarhet: number = B2_PAKNINGER.holdbarhet_etter_anbrudd_dager): number {
  let antall = 0
  let igjen = 0
  let apnet = -Infinity
  draperPerDag.forEach((dose, dag) => {
    if (dag - apnet >= holdbarhet) igjen = 0
    if (dose <= igjen) {
      igjen -= dose
      return
    }
    const rest = dose - igjen
    if (rest > flaske) throw new Error(`En dose på ${dose} dråper får ikke plass i én flaske.`)
    antall += 1
    apnet = dag
    igjen = flaske - rest
  })
  return antall
}
/** Dråpene per dag i trinnene, ett trinn per {@link TRINNDAGER} dager, med 1 mg per dråpe. */
const dagligeDraper = (trinn: readonly (readonly number[])[]) => trinn.flatMap(([mg]) => Array<number>(TRINNDAGER).fill(mg!))
/** Første trinn fra 20 mg (15 mg) med tabletter: én tablett à 10 mg og én à 5 mg daglig. */
const TABLETTER_15: Record<5 | 10, number> = { 10: 1, 5: 1 }
const B2_3 = (() => {
  const forste = dagligeDraper(TRINN_20.slice(0, 1))
  const etter = dagligeDraper(TRINN_20.slice(1))
  const tablettpakninger = (Object.entries(TABLETTER_15) as [`${5 | 10}`, number][]).reduce((sum, [mg, n]) => sum + Math.ceil((n * TRINNDAGER) / B2_PAKNINGER.minste_tablettpakning[mg]), 0)
  const sum = (d: number[]) => d.reduce((a, b) => a + b, 0)
  const tablettForst = { flasker: flaskerOverTid(etter), uten_holdbarhet: flaskerOverTid(etter, FLASKE, Infinity), draper: sum(etter) }
  const draperFraStart = { flasker: flaskerOverTid([...forste, ...etter]), uten_holdbarhet: flaskerOverTid([...forste, ...etter], FLASKE, Infinity), draper: sum(forste) + sum(etter) }
  return { forste: { draper: sum(forste), flasker: flaskerOverTid(forste) }, tablettForst, draperFraStart, tablettpakninger }
})()
/**
 * B2.6: dosene med tabletter og dråper i samme dose (`samtidig` på
 * overgangen), som motoren gir dem på en kopi med simulert godkjenning (kasus
 * B2-20 og B2-21; ikke i forslaget). Dosene som ikke står her, gis med dråper
 * alene som i versjon 14. Tablettene står med antall per styrke i mg.
 */
type Sammensetning = { tabletter: Partial<Record<5 | 10, number>>; draper: number }
const SAMTIDIG: Record<number, Sammensetning> = {
  15: { tabletter: { 10: 1, 5: 1 }, draper: 0 },
  12: { tabletter: { 10: 1 }, draper: 2 },
  9: { tabletter: { 5: 1 }, draper: 4 },
  8: { tabletter: { 5: 1 }, draper: 3 },
  7: { tabletter: { 5: 1 }, draper: 2 },
  6: { tabletter: { 5: 1 }, draper: 1 },
}
const flertall = (n: number, en: string, flere: string) => `${n} ${n === 1 ? en : flere}`
const sammensetning = ({ tabletter, draper }: Sammensetning) =>
  [
    ...([10, 5] as const).flatMap((mg) => (tabletter[mg] ? [`${flertall(tabletter[mg]!, 'tablett', 'tabletter')} à ${mg} mg`] : [])),
    ...(draper > 0 ? [`${flertall(draper, 'dråpe', 'dråper')} à 1 mg`] : []),
  ].join(' + ')
/** Planlinjene med dråper alene, med tabletter og dråper i samme dose der {@link SAMTIDIG} har dosen. */
const medSamtidig = (linjer: string[]) =>
  linjer.map((l) => l.replace(/: (\d+) mg = \d+ dråper? à 1 mg/, (hel, mg: string) => (SAMTIDIG[Number(mg)] ? `: ${mg} mg = ${sammensetning(SAMTIDIG[Number(mg)]!)}` : hel)))
/** Tablettene og flaskene et forløp trenger, med dosene i trinnene og {@link SAMTIDIG} der den brukes. */
const forbruk = (trinn: readonly (readonly number[])[], samtidig: boolean, tablettForst = false) => {
  const dose = (mg: number, i: number): Sammensetning => (samtidig && SAMTIDIG[mg]) || (tablettForst && i === 0 ? { tabletter: TABLETTER_15, draper: 0 } : { tabletter: {}, draper: mg })
  const doser = trinn.map(([mg], i) => dose(mg!, i))
  const tabletter = ([10, 5] as const).map((mg) => doser.reduce((sum, d) => sum + (d.tabletter[mg] ?? 0) * TRINNDAGER, 0))
  const flasker = flaskerOverTid(doser.flatMap((d) => Array<number>(TRINNDAGER).fill(d.draper)).filter((_, dag, alle) => alle.findIndex((x) => x > 0) <= dag))
  const pakninger = tabletter.reduce((sum, n, i) => sum + Math.ceil(n / B2_PAKNINGER.minste_tablettpakning[([10, 5] as const)[i]!]), 0) + flasker
  return { tabletter: { 10: tabletter[0]!, 5: tabletter[1]! }, flasker, pakninger, mest: Math.max(...doser.map((d) => d.draper)) }
}
const B2_6 = { v14: forbruk(TRINN_20, false, true), samtidig: forbruk(TRINN_20, true), v14_10: forbruk(TRINN_10, false), samtidig_10: forbruk(TRINN_10, true) }
/** Det rettede aldersspørsmålet i versjon 14 (B2.4). */
const ELDRE = B2_ESCITALOPRAM.sporsmal!.find((x) => x.id === 'eldre')!
const OVER_ALDERSGRENSEN = (mg: number) => `Startdosen ${tall(mg)} mg er utenfor det regelen gjelder for (høyst 10 mg ved ${ELDRE.ja}).`

export const FORSLAG_B2: Kontrollforslag = {
  nr: 3,
  overskrift: 'B2: escitalopram med tabletter og dråper – kontrollgrunnlag',
  tittel: 'Escitalopram fra tabletter: tabletter så lenge de gir dosen, så dråper til seponering',
  fil: 'docs/verktøy-b2-escitalopram-kontrollgrunnlag.md',
  dato: B2_DATO,
  verktoy: SEPONERING,
  regler: [B2_REGEL],
  motor: kliniskDoseplan,
  simulerAvklaring: true,
  visPlanutfall: true,
  innledning: (fest) => [
    `**Escitalopram fra tabletter (10 eller 20 mg): tabletter så lenge hele tabletter gir dosen i trinnet, så dråper mg for mg til seponering.** Grunnlag for uavhengig faglig kontroll av B2 i \`docs/verktøy-brukervennlighet-2026-11.md\` (§6) og \`docs/verktøy-praktisk-dosering.md\`. Versjon 14 er en egen regel (\`${B2_REGEL.id}\`) som bygger på den godkjente versjon 13 og erstatter den i det øyeblikket den selv er klinisk godkjent; til da gjaldt versjon 13 uendret.`,
    `**Versjon 14 er klinisk godkjent av kontrolløren ${norskDato(B2_GODKJENNING_0511.dato)}, bare i et snevert omfang, og har erstattet versjon 13 i appen.** Godkjenningen av versjon 13 gjaldt ikke versjon 14; den har sin egen godkjenning for nøyaktig versjonen og fingeravtrykket (avsnittet «Kontrollørens godkjenning av versjon 14»). Overgangen fra tabletter til dråper og dråpepreferansen var nye valg; kontrolløren avklarte dem (B2.1–B2.3) og svarte nei på tabletter og dråper i samme dose (B2.6) før den samlede kontrollen. Startdosene, trinnene, sluttdosen, seponeringen og oppfølgingen er de samme som i versjon 13. Aldersspørsmålet er rettet til «${ELDRE.tekst}», så pasientgruppen er nøyaktig Peders avgrensning (under 65 år); det retter et avvik i versjon 13, som spør «Er pasienten over 65 år?» (B2.4).`,
    `Hva som er nytt for klinikeren: med versjon 13 må en pasient på 20 mg tabletter gå over til 15 dråper første dag, og verktøyet stopper hvis tablett er valgt (kasus K1-08 og K1-09). Med versjon 14 gis første trinn (15 mg) med hele tabletter, og planen går over til dråper fra andre trinn. Fra 10 mg tabletter kan ingen hel tablett gi 8 mg, så planen går over til dråper fra første trinn, som i versjon 13. Pasienter som allerede bruker dråper, får nøyaktig den samme planen som i versjon 13.`,
    `Kasusene går uten simulert godkjenning, gjennom verktøyets egen tilgjengelighet og den samme veien som verktøysiden, som aldri viser en delplan, med de norske preparatene i FEST-uttrekket hentet ${fest}. Bare kasusene som prøver en endret regel eller en godkjenning uten avklaring (B2-13, B2-14, B2-20 og B2-21), bruker en kopi, og B2-15 viser verktøyet slik det var før godkjenningen. Kopiene lagres ikke og brukes ikke av appen. Visningen og kopien på den virkelige verktøysiden er prøvd i \`src/__tests__/verktoyb2side.test.tsx\`. Kasusene er syntetiske; pasientopplysninger inngår ikke, og ingen tekst fra Psychiatrienet vises.`,
  ],
  forutsetninger: [
    `Godkjenningen gjelder nøyaktig versjonen og fingeravtrykket i tabellen over, og bare det kliniske omfanget i avsnittet «Reglene». Avklaringene av overgangen (B2.1) og dråpepreferansen (B2.2) er registrert på valgene i regelen (${B2_KONTROLL_0411.kontroll}); det endret fingeravtrykket, så den samlede kontrollen gjaldt det nye. Kontrolløren godkjente nøyaktig dette fingeravtrykket ${norskDato(B2_GODKJENNING_0511.dato)}; endres regelen, kreves en ny faglig kontroll.`,
    'Peders avgjørelse på K1.9 (seponering fra 1 mg) gjelder bare når omfanget er uendret eller snevrere. Vurderingen står i B2.4; mener kontrolløren at omfanget er utvidet, må Peder spørres på nytt før en godkjenning.',
    'Versjon 13 trekkes i det øyeblikket versjon 14 er gyldig klinisk godkjent (`Regel.erstatter`), og det er den nå. Blir godkjenningen av versjon 14 ugyldig (for eksempel fordi regelen endres), gjelder versjon 13 igjen uendret.',
    'Sperrene for de kliniske verktøyene og synligheten bare for administratorer er uendret.',
    `Holdbarheten etter anbrudd for dråpene (${B2_PAKNINGER.holdbarhet_etter_anbrudd_dager / 7} uker, preparatomtalen pkt. 6.3) er oppgitt av kontrolløren 04.11.2026 og brukes bare i regnestykket for pakninger (B2.3 og B2.6); den er ikke en del av regelen.`,
  ],
  sporsmal: (
    [
      {
        nr: 'B2.1',
        sporsmal: `Overgangen: ${B2_ESCITALOPRAM.overgang.begrunnelse} Grunnlaget for mg for mg er det samme som i K1.11 (preparatomtalen for Cipralex dråper pkt. 2 og 5.2). Er det riktig at overgangen skjer når hele tabletter ikke lenger gir dosen, og ikke allerede ved start?`,
        anbefalt: 'Ja. Det sparer pasienten for mange dråper ved høye doser, krever ingen deling og blander ikke to preparater i samme dose (kasus B2-01 og B2-02).',
      },
      {
        nr: 'B2.2',
        sporsmal: `Dråpepreferansen (B6): ${B2_ESCITALOPRAM.praktisk.begrunnelse} Er ${B2_ESCITALOPRAM.praktisk.draper} riktig verdi?`,
        anbefalt: 'Ja, som preferanse. Den avgjør bare om 15 mg gis som tabletter eller 15 dråper (kasus B2-01 og B2-16); 12 dråper og færre gis med dråper fordi ingen hel tablett gir dosen.',
      },
      {
        nr: 'B2.3',
        sporsmal: `Første trinn fra 20 mg er 15 mg i ${TRINNDAGER} dager. Med tabletter er det én tablett à 10 mg og én à 5 mg daglig (to styrker, ingen deling): én pakning à ${B2_PAKNINGER.minste_tablettpakning[10]} stk av hver styrke, i alt ${B2_3.tablettpakninger}. Med dråper er det 15 dråper daglig, ${B2_3.forste.draper} dråper eller ${ml(B2_3.forste.draper)} ml, altså ${B2_3.forste.flasker} flasker à ${B2_PAKNINGER.flaske_ml} ml (${FLASKE} dråper). Flaskene er regnet dag for dag: en åpnet flaske brukes til den er tom eller ${B2_PAKNINGER.holdbarhet_etter_anbrudd_dager / 7} uker etter åpning (holdbarheten etter anbrudd, preparatomtalen pkt. 6.3), og resten kastes. Hele forløpet fra 20 mg trenger da med tabletter først ${B2_3.tablettpakninger} tablettpakninger og ${B2_3.tablettForst.flasker} flasker (${B2_3.tablettForst.draper} dråper fra dag ${TRINNDAGER + 1}), i alt ${B2_3.tablettpakninger + B2_3.tablettForst.flasker} pakninger, og med dråper fra start ${B2_3.draperFraStart.flasker} flasker (${B2_3.draperFraStart.draper} dråper). Uten holdbarheten ville det vært ${B2_3.tablettForst.uten_holdbarhet} og ${B2_3.draperFraStart.uten_holdbarhet} flasker: ved de laveste dosene kastes det meste av hver flaske. Antallet pakninger avgjør altså ikke valget; tablettene sparer pasienten for å telle 15 dråper daglig i ${TRINNDAGER} dager. Er tablettene det mest praktiske for pasienten i første trinn?`,
        anbefalt: `Ja, som en praktisk preferanse uten klinisk kilde (B6). Det avgjørende er to hele tabletter mot 15 dråper per administrasjon: pakningene er like mange i første trinn (${B2_3.tablettpakninger} mot ${B2_3.forste.flasker}) og i hele forløpet (${B2_3.tablettpakninger + B2_3.tablettForst.flasker} mot ${B2_3.draperFraStart.flasker}). Velger kontrolløren dråper fra start, kan dråpepreferansen tas ut, og regelen gir da planen i versjon 13 for alle (kasus B2-16).`,
      },
      {
        nr: 'B2.4',
        sporsmal: `Omfanget for Peders avgjørelse på K1.9 («${K1_9_AVGJORELSE.avgrensning}»): versjon 14 har de samme startdosene (10 og 20 mg), de samme trinnene fra 12 mg og den samme sluttdosen med dråper (1 mg → 0), og pasientgruppen er voksne under 65 år med kort behandlingstid, uten tidligere seponeringsplager, og nei på nedsatt leverfunksjon og langsom CYP2C19-metabolisme. Versjon 13 spør «Er pasienten over 65 år?», så en pasient på nøyaktig 65 år kan svare nei og få planen, selv om avgjørelsen gjelder under 65 år. Versjon 14 spør «${ELDRE.tekst}», så 65 år regnes med og stopper (kasus B2-17–B2-19 ved 64, 65 og 66 år); det retter avviket i versjon 13 og gjør omfanget snevrere, aldri bredere. Tablettpasienter var allerede med i versjon 13 gjennom overgangen mg for mg ved start (K1.11), og ellers er bare tidspunktet for overgangen endret. Er omfanget uendret eller snevrere, slik at avgjørelsen kan brukes uten å spørre Peder på nytt?`,
        anbefalt:
          'Ja, snevrere på ett punkt og ellers uendret. Ingen ny pasientgruppe, startdose eller sluttdose; 65 år er nå utenfor, som avgjørelsen sier, og alle utenfor får et sikkert stopp (kasus B2-05–B2-09 og B2-17–B2-19).',
      },
      {
        nr: 'B2.5',
        sporsmal: `Erstatningen: versjon 14 er en egen regel som erstatter versjon 13 (\`seponering-escitalopram\`) når den er godkjent, så det aldri finnes to godkjente regler for samme nedtrapping. Den gir dråpepasienter nøyaktig den samme planen som versjon 13 (kasus B2-03 og B2-04). Er det riktig at versjon 13 trekkes når versjon 14 godkjennes?`,
        anbefalt: 'Ja. Versjon 14 gir det samme som versjon 13 for alle tilfellene versjon 13 er godkjent for, og i tillegg en komplett plan fra tabletter.',
      },
      {
        nr: 'B2.6',
        sporsmal: `Tabletter og dråper i samme dose: versjon 14 gir hver dose med én form, så fra 20 mg tabletter gis ${B2_6.v14.mest} dråper daglig i andre trinn og 9, 7 og 6 dråper i de neste. Med begge formene i samme dose i overgangen (\`samtidig\`, som motoren alt støtter) blir 12 mg ${sammensetning(SAMTIDIG[12]!)}, 9 mg ${sammensetning(SAMTIDIG[9]!)}, 7 mg ${sammensetning(SAMTIDIG[7]!)} og 6 mg ${sammensetning(SAMTIDIG[6]!)}, så over til dråper alene fra 5 mg; planen går fortsatt aldri tilbake. Det gir høyst ${B2_6.samtidig.mest} dråper per administrasjon gjennom hele forløpet, mot ${B2_6.v14.mest}, men to preparater i samme dose i fire trinn og flere pakninger: ${B2_6.samtidig.tabletter[10]} tabletter à 10 mg, ${B2_6.samtidig.tabletter[5]} à 5 mg og ${B2_6.samtidig.flasker} flasker (i alt ${B2_6.samtidig.pakninger} pakninger: tablettpakninger à ${B2_PAKNINGER.minste_tablettpakning[5]} stk og flasker), mot ${B2_6.v14.pakninger} i versjon 14. Fra 10 mg blir 8 mg ${sammensetning(SAMTIDIG[8]!)} og 6 mg ${sammensetning(SAMTIDIG[6]!)}: høyst ${B2_6.samtidig_10.mest} dråper mot ${B2_6.v14_10.mest}, ${B2_6.samtidig_10.pakninger} pakninger mot ${B2_6.v14_10.pakninger}. Kasus B2-20 og B2-21 viser planene på en kopi; de er ikke i forslaget. Skal versjon 14 gi tabletter og dråper i samme dose?`,
        anbefalt: `Kontrollørens avveining. OUSFARs forslag er ja, dersom kontrolløren godtar to preparater i samme dose: det følger dråpepreferansen (B6) i hele forløpet uten deling og uten oppmåling, og bioekvivalensen mg for mg (pkt. 5.2) er den samme som for overgangen i B2.1. Prisen er flere pakninger og to preparater å holde orden på i fire trinn. Ja endrer regelen (\`samtidig\` på overgangen), så versjon 14 får et nytt fingeravtrykk og et nytt kontrollgrunnlag; nei lar versjon 14 stå som den er.`,
      },
    ] as Kontrollsporsmal[]
  ).map((q) => ({ ...q, anbefalt: `**Kontrolløren ${norskDato(B2_DATO)}: ${B2_KONTROLL_0411.svar[q.nr as keyof typeof B2_KONTROLL_0411.svar]}.** ${q.anbefalt}` })),
  avsnitt: [
    {
      tittel: 'Kontrollørens avklaring av B2.1–B2.6',
      tekst: `${B2_KONTROLL_0411.kontroll} svarte på spørsmålene i avsnitt 3. Avklaringene av B2.1 og B2.2 er registrert på valgene i regelen (rollen uavhengig kontrollør, regelversjon 14). De er ingen klinisk godkjenning av regelen: den kommer først etter den samlede kontrollen av nøyaktig versjonen og fingeravtrykket i tabellen. Svaret nei på B2.6 betyr at versjon 14 gir hver dose med én form; tabletter og dråper i samme dose kan eventuelt vurderes senere som et valgfritt alternativ med egen versjon og kontroll. Den detaljerte kurven med 28 dager per trinn er et startforslag med minstetider, ikke en universelt optimal plan.\n\n${liste([B2_KONTROLL_0411.overgang.merknad, B2_KONTROLL_0411.praktisk.merknad])}`,
    },
    {
      tittel: 'Kontrollørens godkjenning av versjon 14',
      tekst: `${B2_GODKJENNING_0511.kontroll} kom til en positiv, uavhengig faglig konklusjon for nøyaktig versjon 14 og godkjente den klinisk. Godkjenningen er registrert i regelen som siste steg i historikken, med rollen uavhengig kontrollør, regelversjon 14 og fingeravtrykket \`${B2_GODKJENNING_0511.fingeravtrykk}\`. Verktøyet gir planen bare så lenge regelen har nøyaktig dette fingeravtrykket, og versjon 13 er trukket fra appen i samme øyeblikk.

${liste([
  `Avgrensning: ${B2_GODKJENNING_0511.avgrensning}`,
  'Kontrolløren kontrollerte de 21 positive og negative kasusene, planene i omfanget, testen av den atomiske erstatningen og FEST-uttrekket fra 30.10.2026, og de norske preparatopplysningene for Cipralex (1 mg per dråpe, 15 ml per flaske, åtte ukers holdbarhet etter anbrudd) og NICE NG222 anbefaling 1.4.16–1.4.17.',
  'Kasusene B2-01–B2-04 viser de komplette planene uten simulert godkjenning; de negative kasusene viser at alle utenfor omfanget stopper uten doser.',
])}`,
    },
    {
      tittel: 'Hva som er endret fra versjon 13',
      tekst: liste([
        `Egen regel \`${B2_REGEL.id}\` med \`erstatter: ['seponering-escitalopram']\`: versjon 13 gjaldt til versjon 14 ble godkjent ${norskDato(B2_GODKJENNING_0511.dato)}.`,
        `Formovergang tablett (FEST-form ${B2_ESCITALOPRAM.overgang.fra}) → dråper (FEST-form ${B2_ESCITALOPRAM.overgang.til}) i forløpet, aldri tilbake, én form per dose (B2.1).`,
        `Praktisk dosering med høyst ${B2_ESCITALOPRAM.praktisk.draper} dråper per administrasjon som preferanse (B2.2, B6).`,
        `Klinisk omfang: tilfellet «tablett 20 mg» (som aldri ga en komplett plan) er erstattet av «tabletter så dråper, 10 og 20 mg», med styrkene ${Object.entries(
          B2_ESCITALOPRAM.tilfelle.formstyrker,
        )
          .map(([f, s]) => `${s.map(tall).join(', ')} mg (form ${f})`)
          .join(' og ')}. Tilfellene med dråper er uendret.`,
        'Fortolkningen: teksten om overgangen fra tabletter til dråper sier nå at tablettene brukes så lenge de gir dosen.',
        `Aldersspørsmålet er rettet fra «Er pasienten over 65 år?» til «${ELDRE.tekst}» (B2.4): ${ELDRE.begrunnelse} Svaret ja stopper som før; versjon 13, med avviket, er trukket nå som versjon 14 er godkjent.`,
        'Alt annet er uendret: trinnene, valgområdene, det minste trinnet, sluttdosen, seponeringen, vurderingspunktene, de andre spørsmålene, unntakene og regneeksemplene.',
      ]),
    },
    {
      tittel: 'Hvilke forløp som er komplette',
      tekst: tabell(
        ['Tilfelle', `Versjon 13 (til ${norskDato(B2_GODKJENNING_0511.dato)})`, 'Versjon 14', 'Kasus'],
        [
          [
            'Tablett 20 mg, kort behandlingstid',
            '«Komplett plan ikke tilgjengelig» (stopper på 15 mg tabletter); med dråper valgt: 15 dråper fra dag 1',
            'Komplett: 15 mg som tabletter (10 + 5 mg), så dråper 12 → 9 → 7 → 6 → 5 → 4 → 3 → 2 → 1 mg, seponert fra dag 281',
            'B2-01, B2-15',
          ],
          [
            'Tablett 10 mg, kort behandlingstid',
            'Utenfor omfanget; med dråper valgt: komplett',
            'Komplett, dråper fra første trinn: 8 → 6 → 5 → 4 → 3 → 2 → 1 mg, seponert fra dag 197',
            'B2-02 (K0-01)',
          ],
          ['Dråper 20 og 10 mg, kort behandlingstid', 'Komplett', 'Nøyaktig den samme planen', 'B2-03, B2-04'],
          ['Lang behandlingstid, andre startdoser, eldre enn 65 år, tidligere seponeringsplager', 'Stopp', 'Stopp', 'B2-05–B2-09'],
          ['Nøyaktig 65 år', 'Plan, fordi 65 år svarer nei på «over 65 år» (avviket fra K1.9)', 'Stopp', 'B2-18, B2-19'],
          ['64 år', 'Komplett', 'Komplett', 'B2-17'],
        ],
      ),
    },
  ],
  kasusinnledning:
    'Kasusene går gjennom den samme veien som verktøysiden, som aldri viser en delplan, og kjøres i testene (`src/__tests__/verktoyb2.test.ts`). Uten annen merknad er regelen den godkjente versjon 14, slik verktøyet har den. Organfunksjon og interaksjoner er bekreftet, og svaret er nei på alle unntak og spørsmål.',
  refkolonne: 'K0',
  kasus: [
    // --- Komplette planer
    kb('B2-01', 'vanlig_dose', 'escitalopram tablett 20 mg, kort behandlingstid: 15 mg med tabletter, så dråper', B2_REGEL, '20', { ...plan(null, ...FRA_20_TABLETTER), planutfall: SEPONERT_20 }, [], {
      skjema: form(TABLETT),
      velger: VELGER_20,
    }),
    kb('B2-02', 'vanlig_dose', 'escitalopram tablett 10 mg, kort behandlingstid: dråper fra første trinn', B2_REGEL, '10', { ...plan(null, ...FRA_10), planutfall: SEPONERT_10 }, [], {
      skjema: form(TABLETT),
      velger: VELGER_10,
      ref: 'K0-01',
    }),
    kb('B2-03', 'vanlig_dose', 'escitalopram dråper 20 mg, kort behandlingstid: som versjon 13 (K1-02)', B2_REGEL, '20', { ...plan(null, ...FRA_20), planutfall: SEPONERT_20 }, [], {
      skjema: form(DRAPER),
      velger: VELGER_20,
    }),
    kb('B2-04', 'vanlig_dose', 'escitalopram dråper 10 mg, kort behandlingstid: som versjon 13 (K1-01)', B2_REGEL, '10', { ...plan(null, ...FRA_10), planutfall: SEPONERT_10 }, [], {
      skjema: form(DRAPER),
      velger: VELGER_10,
    }),
    // --- Grenser og stopp
    kb('B2-05', 'uvanlig_dose', 'escitalopram tablett 15 mg (omfanget er ikke utvidet)', B2_REGEL, '15', stopp(utenforOmfang(15), UTENFOR_OMFANG), [], { skjema: form(TABLETT) }),
    kb('B2-06', 'uvanlig_dose', 'escitalopram tablett 5 mg (omfanget er ikke utvidet)', B2_REGEL, '5', stopp(utenforOmfang(5), UTENFOR_OMFANG), [], { skjema: form(TABLETT) }),
    kb('B2-07', 'pasientforhold', 'escitalopram tablett 20 mg, lang behandlingstid', B2_REGEL, '20', ikkeKomplett('escitalopram', `${EN_REDUKSJON}, og ${overSluttdosen(18)}`), [17], {
      skjema: { ...form(TABLETT), svar: LANG },
    }),
    kb('B2-08', 'pasientforhold', 'escitalopram tablett 20 mg, 66 år (ja på «65 år eller eldre»)', B2_REGEL, '20', stopp(OVER_ALDERSGRENSEN(20), UTENFOR_OMFANG), [], {
      skjema: { ...form(TABLETT), svar: { eldre: true } },
    }),
    kb(
      'B2-09',
      'pasientforhold',
      'escitalopram tablett 20 mg, tidligere seponeringssymptomer',
      B2_REGEL,
      '20',
      stopp('Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen.'),
      [],
      { skjema: { ...form(TABLETT), pasientforhold: { tidligere_seponeringssymptomer: true } } },
    ),
    kb(
      'B2-10',
      'vanlig_dose',
      'escitalopram tablett 20 mg, før forskriveren har valgt dosen i andre trinn: ingen doser vises, 12 mg tilbys',
      B2_REGEL,
      '20',
      ikkeKomplett('escitalopram', `${EN_REDUKSJON}, og ${overSluttdosen(15)}`),
      [12],
      { skjema: form(TABLETT) },
    ),
    kb(
      'B2-11',
      'preparat',
      'escitalopram tablett 20 mg, dråpene avregistrert',
      B2_REGEL,
      '20',
      stopp('styrken 1 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST', UTENFOR_OMFANG),
      [],
      { skjema: form(TABLETT), fest: avregistrert('escitalopram', 1) },
    ),
    kb(
      'B2-12',
      'preparat',
      'escitalopram tablett 20 mg, 5 mg-tablettene avregistrert',
      B2_REGEL,
      '20',
      stopp('styrken 5 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST', UTENFOR_OMFANG),
      [],
      { skjema: form(TABLETT), fest: avregistrert('escitalopram', 5) },
    ),
    // --- Endret regel og åpne valg
    kb(
      'B2-13',
      'regelendring',
      'escitalopram tablett 20 mg med dråpepreferansen endret til 3 etter godkjenningen',
      B2_REGEL,
      '20',
      ingenPlan('Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke)'),
      [],
      {
        skjema: form(TABLETT),
        regel: endretEtter(B2_REGEL, 'dråpepreferansen 5 → 3', (r) => void (r.plan.forlop[0]!.dosevalg!.praktisk!.draper = 3), B2_DATO, true),
      },
    ),
    kb('B2-14', 'ikke_godkjent', 'escitalopram tablett 20 mg, godkjent med overgangen uten avklaring (B2.1)', B2_REGEL, '20', ingenPlan('Regelen har åpne valg som må avklares faglig'), [], {
      skjema: form(TABLETT),
      regel: godkjentUtenAvklaring(B2_REGEL, /formoverganger/, 'overgangen', B2_DATO),
    }),
    // --- Versjon 13 gjaldt uendret til versjon 14 ble godkjent, og hva preferansen gjør
    kb(
      'B2-15',
      'ikke_godkjent',
      'escitalopram tablett 20 mg slik verktøyet var før godkjenningen: med versjon 14 til faglig kontroll brukte verktøyet versjon 13 (som K1-08)',
      B2_REGEL,
      '20',
      ikkeKomplett('escitalopram', `${EN_REDUKSJON}, og ${overSluttdosen(15)}`),
      [],
      { skjema: form(TABLETT), regel: undefined, settene: FOR_B2 },
    ),
    kb('B2-16', 'regelendring', 'escitalopram tablett 20 mg uten dråpepreferansen: 15 dråper fra første trinn', B2_REGEL, '20', { ...plan(null, ...FRA_20), planutfall: SEPONERT_20 }, [], {
      skjema: form(TABLETT),
      velger: VELGER_20,
      regel: endretEtter(
        B2_REGEL,
        'uten dråpepreferansen, deretter simulert godkjenning av kopien',
        (r) => {
          delete r.plan.forlop[0]!.dosevalg!.praktisk
          simulerGodkjenning(r, { ...B2_REGEL, fingeravtrykk: fingeravtrykk(r) }, B2_DATO)
        },
        B2_DATO,
        true,
      ),
    }),
    // --- Aldersgrensen i Peders avgjørelse (K1.9, under 65 år) ved 64, 65 og 66 år; 66 år er B2-08
    kb('B2-17', 'pasientforhold', 'escitalopram tablett 10 mg, 64 år (nei på «65 år eller eldre»): komplett', B2_REGEL, '10', { ...plan(null, ...FRA_10), planutfall: SEPONERT_10 }, [], {
      skjema: { ...form(TABLETT), svar: { eldre: false } },
      velger: VELGER_10,
    }),
    kb('B2-18', 'pasientforhold', 'escitalopram tablett 10 mg, nøyaktig 65 år (ja på «65 år eller eldre»): stopp', B2_REGEL, '10', stopp(utenforOmfang(10), UTENFOR_OMFANG), [], {
      skjema: { ...form(TABLETT), svar: { eldre: true } },
    }),
    kb('B2-19', 'pasientforhold', 'escitalopram tablett 20 mg, nøyaktig 65 år (ja på «65 år eller eldre»): stopp', B2_REGEL, '20', stopp(OVER_ALDERSGRENSEN(20), UTENFOR_OMFANG), [], {
      skjema: { ...form(TABLETT), svar: { eldre: true } },
    }),
    // --- B2.6: tabletter og dråper i samme dose (ikke i forslaget), på en kopi med simulert godkjenning
    ...(
      [
        ['B2-20', '20', medSamtidig(FRA_20_TABLETTER), SEPONERT_20, VELGER_20],
        ['B2-21', '10', medSamtidig(FRA_10), SEPONERT_10, VELGER_10],
      ] as const
    ).map(([id, dose, linjer, planutfall, velger]) =>
      kb(id, 'regelendring', `escitalopram tablett ${dose} mg med tabletter og dråper i samme dose (B2.6, ikke i forslaget)`, B2_REGEL, dose, { ...plan(null, ...linjer), planutfall }, [], {
        skjema: form(TABLETT),
        velger: [...velger],
        regel: endretEtter(
          B2_REGEL,
          'tabletter og dråper i samme dose i overgangen, deretter simulert godkjenning av kopien',
          (r) => {
            r.plan.forlop[0]!.formoverganger![0]!.samtidig = true
            simulerGodkjenning(r, { ...B2_REGEL, fingeravtrykk: fingeravtrykk(r) }, B2_DATO)
          },
          B2_DATO,
          true,
        ),
      }),
    ),
  ],
}

export const KONTROLLFORSLAG: readonly Kontrollforslag[] = [FORSLAG_1, FORSLAG_K1, FORSLAG_B2]

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
export const planutfallstekst = (u: Pilotutfall): string | null => ((u as ReturnType<typeof kjorKasus>).tekst ?? '').split('\n').find((l) => l.startsWith(KOMPLETT) || l.startsWith(DELPLAN)) ?? null

/** Doseendringene i planen, uten vurderingspunktene. */
const reduksjonslinjer = (linjer: string[]) => linjer.filter((l) => !/^Dag \d+: Vurdering \(/.test(l))

function veitekst(v: Planvei, visUtfall = false): string {
  const valg = v.valg.length > 0 ? `${liste(v.valg.map((x) => `${valgtekst(x.trinn)} Valgt: ${tall(x.valgt)} mg.`))}\n\n` : 'Ingen trinn krever forskriverens valg.\n\n'
  const u = v.utfall
  const utfall = visUtfall && planutfallstekst(u)
  const vist =
    u.utfall === 'plan'
      ? `${u.undertittel ? `*${u.undertittel}*\n\n` : ''}${utfall ? `**${utfall}**\n\n` : ''}${liste(u.linjer)}`
      : `**Ingen plan vises** (${u.utfall}):\n\n${liste('grunner' in u ? u.grunner : [])}`
  return `${valg}${vist}`
}

const forventningstekst = (k: Kontrollkasus) => {
  const f = k.forventet
  const tilbys = k.tilbyr.length > 0 ? ` Tilbyr ${k.tilbyr.map((mg) => `${tall(mg)} mg`).join(', ')} for neste trinn.` : ''
  if (f.utfall === 'plan') return `Plan: ${f.linjer.map((l) => l.replace(/^(Fra dag \d+|Dag [\d–]+): [^:]+: /, '').replace(/ = .*$/, '')).join(' → ')}.${tilbys}`
  if (f.utfall === 'stopp') {
    const grunner = f.grunner
      .filter((g) => g !== 'Ingen klinisk doseplan kan vises.' && g !== UTENFOR_OMFANG)
      .join(' ')
      .replace(/\.$/, '')
    return `Ingen plan: ${grunner}${f.grunner.includes(UTENFOR_OMFANG) ? ' (utenfor omfanget)' : ''}.${tilbys}`
  }
  if (f.utfall === 'ingen') return `Verktøyet tilbyr ingen beregning (${f.status.replace('_', ' ')}).`
  return f.utfall
}

/** Avsnittet om hvor planene stopper med versjonene forslaget bygger på ({@link Kontrollforslag.utgangspunkt}). */
function utgangspunktavsnitt(f: Kontrollforslag, x: NonNullable<Kontrollforslag['utgangspunkt']>, uttrekkene: Uttrekkene): { tittel: string; tekst: string } {
  const planer = omfangsplaner({ ...f, settene: x.settene, regler: x.regler, simulerAvklaring: false, motor: kliniskDelplan }, uttrekkene)
  const rader = planer.flatMap((o) => {
    const r = regelMedId(o.regel.id, x.settene)
    return o.veier.map((v) => {
      const siste = sisteDose(v.utfall)
      return [
        `\`${o.regel.id}\` v${o.regel.versjon}`,
        tilfellenavn(r, o, uttrekkene),
        v.valg.length > 0 ? v.valg.map((c) => `${tall(c.valgt)} mg`).join(', ') : '–',
        siste === null ? '–' : `${tall(siste)} mg`,
        planutfallstekst(v.utfall) ?? (v.utfall.utfall === 'plan' ? '–' : 'ingen plan'),
      ]
    })
  })
  return {
    tittel: x.tittel,
    tekst: `Hver startdose i det kliniske omfanget, regnet med versjonene forslaget bygger på og den samme simulerte godkjenningen, med forskriverens valg der et trinn ikke kan gis nøyaktig. Planene vises ikke i appen; tabellen viser bare hvor langt de dokumenterte metodene rekker.

${tabell(['Regel', 'Tilfelle', 'Valg forskriveren gjør', 'Siste dose', 'Planutfall'], rader)}`,
  }
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
      const vurdert = r.godkjenning.historikk.find(
        (x) => (x.status === 'ikke_godkjent' || x.status === 'klinisk_godkjent') && x.rolle === 'uavhengig_kontrollor' && x.regelversjon === k.versjon && x.fingeravtrykk === k.fingeravtrykk,
      )
      const hindringer = godkjenningshindringer(k, f.dato, f.settene)
      return [
        `\`${k.id}\``,
        String(r.versjon === k.versjon ? k.versjon : `${r.versjon} (kontrollen gjelder ${k.versjon})`),
        fingeravtrykk(r) === k.fingeravtrykk ? `\`${k.fingeravtrykk}\`` : `**endret:** ${fingerkort(fingeravtrykk(r))} (kontrollen gjelder ${fingerkort(k.fingeravtrykk)})`,
        KONTROLLUTFALL[kontrollutfall(r)],
        vurdert ? `ja, ${vurdert.status === 'klinisk_godkjent' ? 'godkjent ' : ''}${norskDato(vurdert.dato)}` : '**nei**',
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
    ['ID', f.refkolonne ?? 'VDK-2', 'Hva', 'Regel', 'Forventet', 'Resultat'],
    f.kasus.map((k) => {
      const avvik = kontrollavvik(k, uttrekkene)
      const regel = k.regel ? `${k.regel.id}${k.regel.endre ? ` (${k.regel.endre.hva})` : ''}` : 'den verktøyet tilbyr i dag'
      return [
        k.id,
        k.ref ?? '–',
        `${k.hva}${k.velger?.length ? `; forskriveren velger ${k.velger.map((mg) => `${tall(mg)} mg`).join(', ')}` : ''}`,
        regel,
        forventningstekst(k),
        avvik.length === 0 ? 'som forventet' : `**avvik:** ${avvik.join(' ')}`,
      ]
    }),
  )
  const innledning = f.innledning?.(norskDato(u.hentet.slice(0, 10))) ?? [
    `**${f.tittel}.** Grunnlag for uavhengig faglig kontroll av forslag ${f.nr} i \`docs/verktøy-vdk2-prioritering.md\`, laget ${norskDato(f.dato)}.`,
    `**Ingen regel er godkjent eller aktivert, og denne PR-en endrer ingen regel.** Verktøyet tilbyr i dag ingen beregning for disse reglene (kasus ${f.kasus
      .filter((k) => !k.regel)
      .map((k) => k.id)
      .join(
        ', ',
      )}). For å vise hva verktøyet ville vist om nøyaktig disse versjonene ble godkjent, er planene under regnet på en kopi av hver regel med en simulert godkjenning («${SIMULERT_KONTROLLOR}»), gjennom den samme veien som verktøysiden og med de norske preparatene i FEST-uttrekket hentet ${norskDato(u.hentet.slice(0, 10))}. Kopien lagres ikke og brukes ikke av appen. En plan som ikke når sluttmålet (en delplan), står her slik motoren beregner den, for kontrollens skyld: verktøysiden viser aldri en delplan, men «${KOMPLETT_IKKE_TILGJENGELIG}» med grunnen (Peders beslutning 03.11.2026). Kasusene er syntetiske; pasientopplysninger inngår ikke, og ingen tekst fra Psychiatrienet vises.`,
  ]
  // Avsnittene nummereres fortløpende, med forslagets egne avsnitt etter spørsmålene.
  const egne = [...(f.avsnitt ?? []), ...(f.utgangspunkt ? [utgangspunktavsnitt(f, f.utgangspunkt, uttrekkene)] : [])]
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

${tabell(
  ['#', 'Spørsmål', 'Anbefalt svar'],
  f.sporsmal.map((x) => [x.nr, x.sporsmal, x.anbefalt]),
)}

${egne.map((a, i) => `## ${4 + i}. ${a.tittel}\n\n${a.tekst}\n\n`).join('')}## ${nr.regler}. Reglene

${regelavsnitt}

## ${nr.planer}. Alle planer i det kliniske omfanget

Hver startdose i hvert tilfelle i reglenes kliniske omfang, med hver plan forskriverens valg kan gi: ved hvert trinn som ikke kan gis nøyaktig, er hver dose som tilbys, fulgt. ${enDose ? `I alle ${alleValg.length} valgene tilbys nøyaktig én dose, så hver startdose gir én plan.` : 'Noen valg tilbyr flere doser, og hver gir sin egen plan.'} Radene er slik planen og kopien av den ville stått om delplaner ble vist; dagene er minstetider, og hvert trinn forutsetter en ny vurdering.

${oversikt}

${detaljer}

## ${nr.kasus}. Syntetiske testkasus

${kasusinnledning}

${kasus}
`
}
