/**
 * Regelmodellen for OUSFAR Verktøy (P4 i `docs/verktøy-utviklingsplan.md`):
 * hvordan en regel for nedtrapping eller bytte av psykofarmaka skrives,
 * uavhengig av hvilken kilde den bygger på. Bakgrunnen og valgene står i
 * `docs/verktøy-p4-regelmodell.md`.
 *
 * Seks ting holdes fra hverandre:
 *
 * 1. **Kilden** (`Kilde`, `Kildehenvisning`): hva en preparatomtale,
 *    retningslinje eller artikkel sier, med sted og OUSFARs egen korte
 *    gjengivelse av faktumet. En Psychiatrienet-anbefaling vises bare som en
 *    henvisning til kildeoppføringen fra P3, aldri med innhold.
 * 2. **Den faglige fortolkningen** (`Fortolkning`): hva som følger direkte av
 *    kildene, og hva som er OUSFARs egen tilpasning, forutsetninger og
 *    usikkerhet.
 * 3. **Den matematiske regelen** (`Plan`): doseforløp med faser, strategier og
 *    tidsrelasjoner, og parametre som hver sier om de er bindende krav eller
 *    veiledende preferanser, og hva de bygger på.
 * 4. **Betingelsene** (`Inndatakrav`, `Bekreftelse`, `Unntak`, `Sporsmal`):
 *    når regelen gjelder, hva forskriveren må bekrefte og svare på, og når den
 *    ikke gjelder.
 * 5. **Godkjenningen** (`Godkjenning`): utkast, til faglig kontroll, klinisk
 *    godkjent, avvist eller trukket, med historikk.
 * 6. **Beregningsresultatet** (`Beregningsresultat`, i `beregning.ts`): en
 *    modellberegning knyttet til regel-, regelsett-, modell- og motorversjon,
 *    aldri en klinisk anbefaling i seg selv.
 *
 * Modellen har ingen felt for en kildes tekst: OUSFAR viser aldri
 * Psychiatrienets anbefalinger, verken ordrett, oversatt eller omskrevet
 * (`docs/verktøy-p3-rettigheter.md`).
 */

import type { Formuleringsklasse } from '../festformuleringer'

/** Økes når formen på regler eller regelsett endres. */
export const REGELMODELLVERSJON = 5

/* --- Kilder ----------------------------------------------------------------- */

export type Kildetype = 'preparatomtale' | 'retningslinje' | 'primærlitteratur' | 'oversiktsartikkel' | 'kildeoppføring'

export interface Kilde {
  id: string
  type: Kildetype
  /** Bibliografisk tittel eller preparatnavn. */
  tittel: string
  utgiver: string
  url: string
  /** Kildens egen versjon: oppdateringsdato, revisjon, DOI eller årgang. */
  versjon: string
  /** Når OUSFAR hentet og leste dokumentet (UTC). */
  hentet: string
  /**
   * SHA-256 av dokumentet slik det ble hentet, så en senere endring kan
   * oppdages. `null` når OUSFAR bare har lest sammendraget, og for
   * P3-arkivet, som har kontrollsum per oppføring.
   */
  sha256: string | null
  /** Hva OUSFAR kan gjøre med kilden: henvise til den og gjengi fakta med egne ord, aldri teksten. */
  bruk: string
}

/**
 * Hvor i en kilde et faktum står. `faktum` er OUSFARs egen korte gjengivelse
 * av et medisinsk faktum (en dose, en frist, en metode), ikke et sitat. En
 * henvisning til Psychiatrienet har i stedet `kildeoppforing` (P3-oppføringens
 * id) og aldri noe `faktum`.
 */
export type Kildehenvisning =
  | { kilde: string; sted: string; faktum: string }
  | { kilde: 'psychiatrienet'; kildeoppforing: string; faktum?: never }

/* --- Faglig fortolkning ----------------------------------------------------- */

/** Et utsagn i fortolkningen, med henvisningene det bygger på (tom for OUSFARs egne vurderinger). */
export interface Utsagn {
  tekst: string
  henvisninger: Kildehenvisning[]
}

export interface Fortolkning {
  /** Det som følger direkte av kildene. Hvert utsagn har minst én henvisning. */
  kildetro: Utsagn[]
  /** OUSFARs selvstendige faglige tilpasninger og valg, som må kontrolleres. */
  tilpasninger: Utsagn[]
  /** Kliniske forutsetninger regelen bygger på. */
  forutsetninger: string[]
  /** Kjent usikkerhet og begrensninger i kunnskapsgrunnlaget. */
  usikkerhet: string[]
}

/**
 * Hvor mye av regelen som kan beregnes (P4.4). Ingen automatisk regel ved
 * tvetydighet: bare `entydig_beregnbar` og `beregnbar_etter_avklaring` har en
 * plan, og den siste først etter at de markerte valgene er avklart faglig.
 */
export type Beregnbarhet = 'entydig_beregnbar' | 'beregnbar_etter_avklaring' | 'bare_tekstlig' | 'mangler_anbefaling'

/* --- Parametre ---------------------------------------------------------------- */

/** Et bindende krav må overholdes (f.eks. utvasking); en veiledende preferanse kan justeres faglig (f.eks. trinnlengde). P4.3. */
export type Parameterart = 'bindende_krav' | 'veiledende_preferanse'

/**
 * En eksplisitt faglig avklaring av en OUSFAR-vurdering: hvem som har vurdert
 * og akseptert valget, i hvilken regelversjon. Avklaringen endrer ikke
 * opprinnelsen; valget er fortsatt OUSFARs, ikke et faktum fra en kilde.
 */
export interface Avklaring {
  dato: string
  av: string
  rolle: Exclude<Rolle, 'utvikler'>
  regelversjon: number
  merknad: string
}

export type Grunnlag =
  | { type: 'kilde'; henvisninger: Kildehenvisning[] }
  /**
   * OUSFARs egen faglige vurdering. Opprinnelsen (`type`) er alltid OUSFAR;
   * statusen er `avklaring`: `null` er et åpent forslag som må avklares før
   * regelen kan godkjennes, ellers den eksplisitte avklaringen. `henvisninger`
   * er det valget bygger på, når det er et valg innenfor en kilde.
   */
  | { type: 'ousfar_vurdering'; begrunnelse: string; henvisninger?: Kildehenvisning[]; avklaring: Avklaring | null }

/** `dager` er en varighet, `dag` en dag i planen (dag 1 er første dag). */
export type Enhet = 'mg' | 'dager' | 'dag' | 'maaneder' | 'prosent' | 'trinn'

export interface Parameter {
  /** `null` når verdien mangler og må avklares; da kan regelen ikke beregnes. */
  verdi: number | null
  enhet: Enhet
  art: Parameterart
  grunnlag: Grunnlag
  /** Området kilden eller vurderingen tillater, når verdien er et valg innenfor det. */
  omrade?: [number, number]
  /**
   * Når forskriveren kan velge en annen verdi innenfor `omrade` for den enkelte
   * planen: teksten feltet vises med, f.eks. «Dager per trinn». Verdien i
   * regelen er da forslaget; området er det som godkjennes.
   */
  justerbar?: string
  /**
   * Den øvre grensen i `omrade` er bare teknisk (en grense for hvor lang en
   * beregnet plan kan bli), ikke klinisk: verdien har ingen klinisk fastsatt
   * øvre grense, og teksten sier «minst …».
   */
  teknisk_maks?: true
  /** Verdier som bare kan brukes med en skriftlig begrunnelse fra forskriveren. */
  begrunnelseskrav?: Begrunnelseskrav[]
}

/**
 * En verdi over `over` eller under `under` krever en skriftlig begrunnelse fra
 * forskriveren; med `ved` bare når forskriveren har svart ja på det spørsmålet
 * (`Sporsmal`). Kravet gjelder verdien som brukes, også regelens forslag.
 */
export interface Begrunnelseskrav {
  over?: number
  under?: number
  ved?: string
  grunnlag: Grunnlag
}

/* --- Planen ------------------------------------------------------------------- */

export type Administrasjon = 'peroral' | 'depotinjeksjon'

/** Et virkestoff (P1-nøkkel), eller en gruppe fra P1-kartleggingen. */
export type Virkestoffvalg = { type: 'virkestoff'; nokkel: string } | { type: 'gruppe'; gruppe: string }

/** Hvor en dose kommer fra. */
export type Dosekilde =
  | { type: 'fast'; mg: Parameter }
  /** Pasientens dose når planen starter, eller måldosen forskriveren oppgir. */
  | { type: 'inndata'; navn: 'startdose' | 'maldose' }
  /** Slått opp i en tabell fra startdosen, f.eks. peroral dose → depotdose. */
  | { type: 'tabell'; rader: { fra_mg: number; til_mg: number | [number, number] }[]; grunnlag: Grunnlag }

/**
 * Hvordan en nedtrapping regner ut neste dose. «Prosent» er alltid enten av
 * startdosen eller av den aktuelle dosen, aldri uspesifisert (B1).
 */
export type Nedtrappingsstrategi =
  /** Hvert trinn er `prosent` lavere enn forrige dose (gjentatt prosentvis); `lav_prosent` når dosen er nådd `lav_grense_mg`. Under `sluttdose_mg` seponeres. */
  | { type: 'prosent_av_aktuell'; prosent: Parameter; lav_prosent?: Parameter; lav_grense_mg?: Parameter; sluttdose_mg: Parameter }
  /** Hvert trinn er `prosent` av startdosen lavere (lineært). */
  | { type: 'prosent_av_startdose'; prosent: Parameter }
  /** Hvert trinn er `mg` lavere (lineært, absolutt). */
  | { type: 'absolutt'; mg: Parameter }
  /**
   * Like store trinn i beregnet reseptorbinding (hyperbolsk i dose): binding
   * f = D / (ED50 + D) relativt til maksimal binding, f senkes med like
   * store trinn til 0, og dosen er D = ED50 · f / (1 − f).
   */
  | { type: 'hyperbolsk'; ed50_mg: Parameter; trinn: Parameter }

export type Varighet = { type: 'dager'; dager: Parameter } | { type: 'til_forlop_er_avsluttet'; forlop: string }

/** Planens dag når forløpet starter: et helt tall fra 1. */
export type Dag = number

export type Fase =
  /** Holder en dose i en periode. */
  | { type: 'hold'; dose: Dosekilde | { type: 'aktuell' }; varighet: Varighet }
  /**
   * Trapper ned fra den aktuelle dosen til 0, med `trinnlengde` dager per
   * trinn. Første trinn er allerede redusert. Blir nedtrappingen kortere enn
   * `minste_varighet` dager, stopper beregningen i stedet for å forlenge den.
   * Med `avslutning: 'individuell'` går planen ikke til 0: siste trinn
   * fortsetter, og avslutningen må vurderes individuelt, fordi regelen ikke
   * har noen godkjent avslutning (nulltrinn). Da er trinnlengden en minstetid.
   */
  | { type: 'nedtrapping'; strategi: Nedtrappingsstrategi; trinnlengde: Parameter; minste_varighet?: Parameter; avslutning?: 'individuell' }
  /** Fast opptrapping: hver dose i sitt antall dager. */
  | { type: 'opptrapping'; trinn: { mg: Parameter; dager: Parameter }[] }
  /** Dosen planen ender med (ingen sluttdato). */
  | { type: 'vedlikehold'; dose: Dosekilde | { type: 'aktuell' } }
  /** Seponering når fasen starter: siste dose er dagen før. */
  | { type: 'seponer' }
  /** Doseringen beregnes ikke (bare når forløpet kan starte), f.eks. fordi preparatomtale mangler. */
  | { type: 'uten_beregning'; grunn: string }
  /** Depotinjeksjoner: startinjeksjoner på faste dager, deretter månedlig vedlikehold. */
  | {
      type: 'injeksjoner'
      start: { dag: Parameter; dose: Dosekilde; sted?: string; vindu_dager?: Parameter }[]
      vedlikehold: { dose: Dosekilde; maaneder: Parameter; tidligst_dager?: Parameter; vindu_dager?: Parameter; sted?: string }
    }

/** Når et forløp starter. */
export type Forlopsstart =
  | { type: 'dag'; dag: Dag }
  /** Sekvensielt: når forløpet `forlop` er avsluttet, etter minst `utvasking` dager uten legemiddel. */
  | { type: 'etter_utvasking'; forlop: string; utvasking: Parameter }

/**
 * Hvor langt en praktisk dose kan avvike fra den ideelle (P5). Uten
 * `avvik_prosent` godtas bare doser som kan gis nøyaktig; motoren velger aldri
 * selv en toleranse. Grensene gjelder døgndosen i hver periode med dose.
 */
export interface Dosevalg {
  /** Største tillatte avvik fra den ideelle dosen, i prosent av den, begge veier. */
  avvik_prosent?: Parameter
  /** Høyeste døgndose som kan gis i forløpet. */
  maks_mg?: Parameter
  /** Laveste døgndose som kan gis i en periode med dose. */
  min_mg?: Parameter
}

export interface Forlop {
  /** `fra` og `til`, eller en annen id når en plan har flere. */
  id: string
  virkestoff: Virkestoffvalg
  administrasjon: Administrasjon
  /** Kildens formulering når den betyr noe (depot, frisetting), som tekst. */
  formulering?: string
  /** Formuleringsklassene (P1) forløpet gjelder, når regelen avgrenser dem; ellers må forskriveren velge når flere finnes (P5). */
  klasser?: Formuleringsklasse[]
  /**
   * Varenavnene forløpet gjelder (FESTs `Varenavn`), når formuleringen er
   * preparatspesifikk. Påkrevd for depotinjeksjoner: FEST skiller ikke
   * f.eks. månedlig og tremånedlig paliperidon i formen (P5).
   */
  preparater?: string[]
  /** Hvor langt de praktiske dosene kan avvike fra den ideelle kurven (P5). */
  dosevalg?: Dosevalg
  /** `startdose` når pasienten bruker legemidlet når planen starter; ellers starter forløpet uten dose. */
  utgangsdose: 'startdose' | null
  start: Forlopsstart
  faser: Fase[]
}

export type Bytteform = 'seponering' | 'kryssnedtrapping' | 'sekvensielt' | 'direkte' | 'oppstart_depot'

export interface Plan {
  form: Bytteform
  forlop: Forlop[]
}

/* --- Betingelser -------------------------------------------------------------- */

/**
 * Et krav til inndata: at dosen er oppgitt, og ligger i området eller er én
 * av verdiene regelen gjelder for. Et bindende krav stopper beregningen når
 * det ikke er oppfylt; en veiledende preferanse gir en merknad. Det finnes
 * ingen standardverdi: en måldose må alltid oppgis (P6.8).
 */
export interface Inndatakrav {
  navn: 'startdose' | 'maldose'
  /** Dosene regelen gjelder for. Nedre grense 0 betyr enhver positiv dose (bare en øvre grense). */
  omrade?: [number, number]
  verdier?: number[]
  /** For en gruppeplan: kravet gjelder bare dette medlemmet. */
  gjelder_medlem?: string
  art: Parameterart
  grunnlag: Grunnlag
}

/** Noe forskriveren må bekrefte før planen kan beregnes, f.eks. at peroral behandling er tolerert. */
export interface Bekreftelse {
  id: string
  tekst: string
  grunnlag: Grunnlag
}

/** Et pasientforhold som gjør at regelen ikke gjelder (en annen regel eller individuell vurdering trengs). */
export interface Unntak {
  id: string
  tekst: string
  grunnlag: Grunnlag
}

/**
 * Et spørsmål forskriveren må svare ja eller nei på før beregningen, f.eks. om
 * behandlingstiden er lang. Svaret står i planen og kan avgjøre om et
 * begrunnelseskrav gjelder. Et spørsmål uten svar stopper beregningen.
 */
export interface Sporsmal {
  id: string
  tekst: string
  /** Hva et ja betyr, kort, til teksten i planen og kravene: «lang behandlingstid». */
  ja: string
  grunnlag: Grunnlag
}

/** Gruppemedlemmer må valideres hver for seg (B4); bare `foreslatt` og `validert` kan beregnes. */
export type Medlemsvalidering = 'ikke_vurdert' | 'foreslatt' | 'validert'

export interface Gruppemedlem {
  nokkel: string
  validering: Medlemsvalidering
  /** Planen for akkurat dette medlemmet, når den skiller seg fra gruppens. */
  faser?: Fase[]
  begrunnelse: string
}

/* --- Godkjenning -------------------------------------------------------------- */

export type Godkjenningsstatus = 'utkast' | 'til_faglig_kontroll' | 'klinisk_godkjent' | 'avvist' | 'trukket'

export type Rolle = 'utvikler' | 'uavhengig_kontrollor' | 'faglig_beslutningstaker'

export interface Godkjenningssteg {
  status: Godkjenningsstatus
  dato: string
  av: string
  rolle: Rolle
  /** Regelversjonen steget gjelder. */
  regelversjon: number
  /**
   * Fingeravtrykket av regelen steget gjelder (`fingeravtrykk` i
   * `godkjenning.ts`). Påkrevd for en klinisk godkjenning: den gjelder bare
   * nøyaktig det innholdet som ble kontrollert.
   */
  fingeravtrykk?: string
  merknad: string
}

export interface Godkjenning {
  status: Godkjenningsstatus
  historikk: Godkjenningssteg[]
}

/* --- Regel og regelsett ------------------------------------------------------- */

/** Et beregningseksempel med forventet resultat, regnet ut for hånd og kontrollert av testene. */
export interface Regneeksempel {
  id: string
  beskrivelse: string
  inndata: Beregningsinndata
  /** Forventede perioder per forløp som `dag–dag: dose`, og hendelser som `dag N: …`. Kontrolleres mot beregningen. */
  forventet: Record<string, string[]>
  /** Når eksemplet skal stoppe: grunnen beregningen skal gi. */
  stopp?: RegExp
}

export interface Beregningsinndata {
  startdose_mg: number
  maldose_mg?: number
  /** Valgfri dato for dag 1 (ISO). */
  startdato?: string
  /** For en gruppeplan: medlemmet pasienten bruker. */
  medlem?: string
  /** Bekreftelser forskriveren har gitt (id-ene). Det som ikke er bekreftet, regnes som ikke bekreftet. */
  bekreftet?: string[]
  /**
   * Forskriverens svar på hvert unntak (id → `true` når forholdet gjelder,
   * `false` når det er vurdert og avkreftet). Et unntak uten svar er ukjent,
   * og ukjent stopper beregningen like mye som et forhold som gjelder.
   */
  pasientforhold?: Record<string, boolean>
  /**
   * Forskriverens valg for parametrene som er justerbare (stien fra
   * {@link parametre} → verdien), innenfor området regelen tillater.
   */
  justert?: Record<string, number>
  /** Forskriverens svar på spørsmålene (id → ja eller nei). Et spørsmål uten svar stopper beregningen. */
  svar?: Record<string, boolean>
  /** Forskriverens skriftlige begrunnelse, når et valg krever det (`Begrunnelseskrav`). */
  begrunnelse?: string
}

export interface Regel {
  id: string
  /** Økes ved hver faglig endring; en godkjenning gjelder én versjon. */
  versjon: number
  tittel: string
  fra: Virkestoffvalg
  til: Virkestoffvalg | null
  plan: Plan
  inndata: Inndatakrav[]
  bekreftelser: Bekreftelse[]
  unntak: Unntak[]
  /** Spørsmål forskriveren må svare på før beregningen. */
  sporsmal?: Sporsmal[]
  /** For en gruppe: hvert medlem og om det er validert. */
  medlemmer?: Gruppemedlem[]
  beregnbarhet: Beregnbarhet
  fortolkning: Fortolkning
  /** Psychiatrienet og andre referanser regelen kan sammenlignes med, uten at den bygger på teksten deres. */
  referanser: Kildehenvisning[]
  eksempler: Regneeksempel[]
  godkjenning: Godkjenning
}

export interface Regelsett {
  id: string
  versjon: number
  modell: number
  beskrivelse: string
  regler: Regel[]
}

/* --- Oppslag ------------------------------------------------------------------ */

const heltall: Enhet[] = ['dager', 'dag', 'maaneder', 'trinn']

/**
 * Enheten hvert parameterfelt i en plan skal ha, etter feltets navn (siste
 * ledd i stien, uten indeks). Et felt som ikke står her, er ikke en del av
 * modellen.
 */
export const FELTENHET: Record<string, Enhet> = {
  trinnlengde: 'dager',
  minste_varighet: 'dager',
  utvasking: 'dager',
  dager: 'dager',
  vindu_dager: 'dager',
  tidligst_dager: 'dager',
  dag: 'dag',
  maaneder: 'maaneder',
  trinn: 'trinn',
  prosent: 'prosent',
  lav_prosent: 'prosent',
  mg: 'mg',
  lav_grense_mg: 'mg',
  sluttdose_mg: 'mg',
  ed50_mg: 'mg',
  avvik_prosent: 'prosent',
  maks_mg: 'mg',
  min_mg: 'mg',
}

const feltnavn = (sti: string) => sti.replace(/\[\d+\]/g, '').split('.').at(-1) ?? ''

/**
 * Hva som er galt med en parameter på stien `sti`, eller `null` når den er
 * gyldig (en manglende verdi er ikke ugyldig, men må avklares). Enheten må
 * være den feltet krever (`FELTENHET`); doser og varigheter er positive og
 * endelige, prosenter over 0 og høyst 100, og dager, måneder og trinn hele
 * tall.
 */
export function parameterfeil(p: Parameter, sti: string): string | null {
  const navn = feltnavn(sti)
  const forventet = FELTENHET[navn]
  if (!forventet) return `feltet ${navn || '(uten navn)'} er ikke en parameter i regelmodellen`
  if (p.enhet !== forventet) return `enheten er ${p.enhet}, men ${navn} skal være i ${forventet}`
  const feil = (v: number): string | null => {
    if (typeof v !== 'number' || !Number.isFinite(v)) return 'er ikke et endelig tall'
    if (v <= 0) return 'må være over 0'
    if (p.enhet === 'prosent' && v > 100) return 'kan ikke være over 100 %'
    if (heltall.includes(p.enhet) && !Number.isInteger(v)) return 'må være et helt tall'
    return null
  }
  if (p.verdi !== null) {
    const f = feil(p.verdi)
    if (f) return `${p.verdi} ${p.enhet} ${f}`
  }
  if (p.omrade) {
    const f = feil(p.omrade[0]) ?? feil(p.omrade[1])
    if (f || p.omrade[0] > p.omrade[1]) return `området ${p.omrade.join('–')} ${p.enhet} er ugyldig`
  }
  return null
}

const positiv = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x > 0
const heltallFra1 = (x: unknown) => typeof x === 'number' && Number.isInteger(x) && x >= 1

/**
 * Feil i regelens tall som ikke er parametre: startdagen for et forløp,
 * radene i en omregningstabell og grensene i inndatakravene. Brukes både av
 * regelkontrollen og før en beregning.
 */
export function tallfeil(r: Pick<Regel, 'plan' | 'inndata'>): string[] {
  const feil: string[] = []
  for (const f of r.plan.forlop) {
    if (f.start.type === 'dag' && !heltallFra1(f.start.dag)) feil.push(`forløp ${f.id} starter dag ${String(f.start.dag)}; startdagen må være et helt tall fra 1`)
    for (const fase of f.faser) {
      if (fase.type !== 'injeksjoner') continue
      for (const dose of [...fase.start.map((x) => x.dose), fase.vedlikehold.dose]) {
        if (dose.type !== 'tabell') continue
        for (const rad of dose.rader) {
          const til = Array.isArray(rad.til_mg) ? rad.til_mg : [rad.til_mg]
          if (!positiv(rad.fra_mg) || !til.every(positiv) || (til.length === 2 && til[0]! >= til[1]!)) feil.push(`forløp ${f.id}: omregningsraden ${String(rad.fra_mg)} mg er ugyldig`)
        }
      }
    }
  }
  for (const x of r.inndata) {
    const tall = [...(x.omrade ?? []), ...(x.verdier ?? [])].filter((v, i) => !(i === 0 && x.omrade && v === 0))
    if (!tall.every(positiv) || (x.omrade && x.omrade[0] > x.omrade[1])) feil.push(`inndatakravet for ${x.navn} har ugyldige grenser`)
  }
  return feil
}

/**
 * Valgene som fortsatt er åpne: OUSFAR-vurderinger uten avklaring, verdier
 * som mangler, og gruppemedlemmer som bare er foreslått. En regel kan ikke
 * godkjennes klinisk før listen er tom.
 */
export function apneValg(r: Regel): string[] {
  return [
    ...alleGrunnlag(r)
      .filter(([, g]) => g.type === 'ousfar_vurdering' && !g.avklaring)
      .map(([sti]) => `${sti} (åpent forslag)`),
    ...parametre(r)
      .filter(([, p]) => p.verdi === null)
      .map(([sti]) => `${sti} (mangler)`),
    ...(r.medlemmer ?? []).filter((m) => m.validering === 'foreslatt').map((m) => `${m.nokkel} (medlem foreslått, ikke validert)`),
  ]
}

/**
 * Brudd på kravet om at en ren seponering aldri går til 0 av seg selv: ingen
 * avslutning (nulltrinn) er godkjent faglig (P7.5). Hvert forløp i en
 * beregnbar seponeringsregel, også et gruppemedlems egne faser, må slutte med
 * en nedtrapping med individuell avslutning og kan ikke seponere. Bytter
 * (seponering før et annet legemiddel) og regler som bare er tekstlige, er
 * unntatt. Kontrollen og godkjenningen bruker begge denne, så en regel som
 * bryter kravet, er aldri klinisk godkjent, uansett status.
 */
export function nulltrinnfeil(r: Pick<Regel, 'plan' | 'beregnbarhet' | 'medlemmer'>): string[] {
  if (r.plan.form !== 'seponering' || r.beregnbarhet === 'bare_tekstlig') return []
  return r.plan.forlop.flatMap((f) => {
    const varianter: [string, Fase[]][] = [
      [`forløp ${f.id}`, f.faser],
      ...(f.virkestoff.type === 'gruppe' ? (r.medlemmer ?? []).flatMap((m) => (m.faser ? [[`forløp ${f.id} for ${m.nokkel}`, m.faser] as [string, Fase[]]] : [])) : []),
    ]
    return varianter.flatMap(([hvor, faser]) => {
      const sist = faser.at(-1)
      return [
        ...(faser.some((x) => x.type === 'seponer') ? [`${hvor} seponerer; ingen avslutning er godkjent, så en seponeringsregel kan ikke seponere`] : []),
        ...(sist?.type !== 'nedtrapping' || sist.avslutning !== 'individuell'
          ? [`${hvor} slutter ikke med en nedtrapping med individuell avslutning; ingen avslutning er godkjent, så en seponeringsregel kan ikke gå til null`]
          : []),
      ]
    })
  })
}

/** Grunnlaget for hver omregningstabell i planen. */
export function grunnlagITabeller(r: Pick<Regel, 'plan'>): [string, Grunnlag][] {
  return r.plan.forlop.flatMap((f) =>
    f.faser.flatMap((fase) =>
      fase.type === 'injeksjoner' && fase.vedlikehold.dose.type === 'tabell' ? [[`${f.id}.vedlikehold.tabell`, fase.vedlikehold.dose.grunnlag] as [string, Grunnlag]] : [],
    ),
  )
}

/** Alle grunnlag i regelen med stien dit: parametre og begrunnelseskravene deres, inndata, bekreftelser, unntak, spørsmål og tabeller. */
export function alleGrunnlag(r: Regel): [string, Grunnlag][] {
  return [
    ...parametre(r).flatMap(([sti, p]) => [
      [sti, p.grunnlag] as [string, Grunnlag],
      ...(p.begrunnelseskrav ?? []).map((k, i) => [`${sti}.begrunnelseskrav[${i}]`, k.grunnlag] as [string, Grunnlag]),
    ]),
    ...r.inndata.map((x) => [`inndata.${x.navn}`, x.grunnlag] as [string, Grunnlag]),
    ...[...r.bekreftelser, ...r.unntak, ...(r.sporsmal ?? [])].map((x) => [x.id, x.grunnlag] as [string, Grunnlag]),
    ...grunnlagITabeller(r),
  ]
}

const erParameter = (x: unknown): x is Parameter =>
  !!x && typeof x === 'object' && 'verdi' in x && 'enhet' in x && 'art' in x && 'grunnlag' in x

/** Alle parametre i `x` (en plan, en fase, en strategi …), med stien dit. */
export function parametre(x: unknown, sti = ''): [string, Parameter][] {
  if (erParameter(x)) return [[sti, x]]
  if (Array.isArray(x)) return x.flatMap((y, i) => parametre(y, `${sti}[${i}]`))
  if (x && typeof x === 'object') return Object.entries(x).flatMap(([n, y]) => parametre(y, sti ? `${sti}.${n}` : n))
  return []
}

/** Parametrene forskriveren kan justere for den enkelte planen, med stien dit. */
export const justerbare = (r: Pick<Regel, 'plan'>): [string, Parameter & { justerbar: string; omrade: [number, number] }][] =>
  parametre(r.plan, 'plan').filter((x): x is [string, Parameter & { justerbar: string; omrade: [number, number] }] => !!x[1].justerbar && !!x[1].omrade)

/** Alle kildehenvisninger i `x`. */
export function henvisninger(x: unknown): Kildehenvisning[] {
  if (Array.isArray(x)) return x.flatMap(henvisninger)
  if (!x || typeof x !== 'object') return []
  if ('kilde' in x && typeof x.kilde === 'string' && ('sted' in x || 'kildeoppforing' in x)) return [x as Kildehenvisning]
  return Object.values(x).flatMap(henvisninger)
}
