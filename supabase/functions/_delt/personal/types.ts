/**
 * Felles datamodell for personalkalenderen og vaktfordelingen i OUSFAR
 * (docs/personal.md §8, P2a). Overført fra prototypen peohol/vaktplan v0.11
 * og gjort generell etter vedtakene 27.11.2026 (B17, B18): visningsgrupper,
 * fysisk tilstedeværelse, fremhevede oppgaver og arbeidskalenderen er data
 * per fagmiljø.
 *
 * Modellen er ren TypeScript uten avhengigheter (supabase/AGENTS.md), og
 * brukes både av appen (`@delt/personal/...`) og av serveren. Alle datoer er
 * ISO-strenger (YYYY-MM-DD) i fagmiljøets kalendertid; klokkeslett er
 * minutter etter midnatt. Alle eksempler og tester bruker syntetiske
 * medarbeidere (docs/personal.md §3.1).
 */

export type IsoDate = string;
/** Minutter etter midnatt, 0–1440. */
export type Minutes = number;

export interface TimeRange {
  start: Minutes;
  end: Minutes;
}

// ---------------------------------------------------------------------------
// Statuskatalog
// ---------------------------------------------------------------------------

/**
 * En visningsgruppe i fagmiljøets oppsett, for eksempel «Til stede», «Jobber
 * et annet sted» og «Fraværende» i piloten (B17). Gruppen styrer bare
 * visningen (forsiden, dagsvisningen, statusvalget); tilstedeværelse,
 * ledighet, dekning og fordeling avgjøres av statusens egne egenskaper.
 */
export interface StatusGroup {
  /** Stabil ID. */
  id: string;
  name: string;
}

/**
 * Nøkkel til et ikon. Brukergrensesnittet oversetter nøkkelen til OUSFARs
 * ikonregister (P3); domenet tolker den ikke.
 */
export type StatusIcon = string;

/** Visuell tone; brukergrensesnittet oversetter den til OUSFARs fargetokens. Ikke en farge i seg selv. */
export type StatusTone = string;

/**
 * En status i fagmiljøets katalog. Katalogen er data, ikke kode, slik at et
 * annet fagmiljø kan få andre statuser og egenskaper uten endringer i motoren.
 * En medarbeider har høyst én status per dag; uten status regnes personen som
 * til stede og ledig på ordinære arbeidsdager.
 */
export interface StatusDefinition {
  /** Stabil ID. Endres aldri, også om navnet endres. */
  id: string;
  name: string;
  /** Visningsgruppen (`RuleSet.groups`). Påvirker ingen beregning. */
  group: string;
  /**
   * Regnes som fysisk til stede (B17). Bare slike statuser kan bemannes og
   * dekke et behov, og de gjelder arbeidsdager etter arbeidskalenderen.
   * Uten status regnes en aktiv medarbeider som planlagt til stede på
   * arbeidsdager.
   */
  present: boolean;
  /** Fremhevet oppgave på forsiden og i dagsvisningen (f.eks. vaktene og Referent). Påvirker ingen beregning. */
  highlighted?: boolean;
  icon: StatusIcon;
  tone: StatusTone;
  /** Bare én medarbeider kan ha statusen samme dag (vaktene og Referent i piloten). Uavhengig av om den fordeles automatisk. */
  uniquePerDay: boolean;
  /** Krever kvalifikasjon for akkurat denne statusen (f.eks. vakttype). */
  requiresQualification: boolean;
  /** Et ønske, ikke en innvilget status. Regnes som fravær, men vises adskilt. */
  wish?: boolean;
  /** Utgått status fra eldre data: kan ikke velges, men gamle registreringer beholdes. */
  active: boolean;
  description?: string;
  /**
   * Vaktfritak: dager med statusen gir ingen forventet vaktbelastning (ingen
   * vaktgjeld). `always`: alltid (ferie, opplæring). `administrative`: bare
   * når en administrator har innvilget fritak på registreringen (Borte).
   * Utelatt: aldri. Statuser som bemannes, kan ikke gi fritak.
   */
  dutyExemption?: DutyExemption;
}

export type DutyExemption = 'always' | 'administrative';

export interface RuleSet {
  /**
   * Øker ved hver endring av statuskatalog eller regler. Et versjonsnummer
   * brukes aldri om igjen, heller ikke etter angre (se PlannerState.ruleVersionSeq).
   */
  version: number;
  /** Første dag regelsettet gjelder for. */
  effectiveFrom: IsoDate;
  /** Visningsgruppene i fast rekkefølge. Hver status hører til én av dem. */
  groups: StatusGroup[];
  statuses: StatusDefinition[];
  /** Arbeidskalenderen: hvilke dager som er arbeidsdager. Utelatt = mandag–fredag uten helligdager. */
  workCalendar?: WorkCalendar;
  /** Bemanningskrav: hva som skal dekkes, og hva den automatiske fordelingen fordeler. */
  staffing: StaffingRequirement[];
  /** Vekter for de myke målene i den automatiske fordelingen. Utelatt = standardverdiene. */
  allocation?: AllocationSettings;
}

/**
 * Vekter for de myke målene i den automatiske fordelingen (delmål B). Ingen
 * av dem er harde krav; de velger mellom gyldige planer. Historisk utjevning
 * og rettferdighet i perioden har hver sin vekt, så den ene kan prioriteres
 * uten at den andre også øker.
 */
export interface AllocationSettings {
  /** Antall i forhold til forventet antall over tidshorisonten (`historyDays`), med tidligere vakter. */
  historyFairness: number;
  /** Antall i forhold til forventet antall i den nye perioden isolert sett. */
  periodFairness: number;
  /** Belastning i korte, glidende vinduer (motvirker klumping på tvers av vakttyper). */
  shortTerm: number;
  /** Avstand i kalenderdager mellom vaktene til samme person. */
  spacing: number;
  /** Variasjon i ukedager per person og vakttype. */
  weekday: number;
  /** Ulik stillingskategori på vaktene samme dag. */
  mixedCategories: number;
  /** Tidshorisonten for historisk utjevning i dager, bakover fra periodens slutt. */
  historyDays: number;
  /** Lengden på de korte, glidende vinduene i dager. */
  shortWindowDays: number;
  /**
   * Hvor mange prosent flere vakter enn forventet i perioden målet i én plan
   * kan gi en medarbeider for å ta igjen tidligere underskudd. Resten tas
   * igjen i senere planer, så utjevningen ikke gir en urimelig tett vaktplan.
   * Begrenser ønsket kompensasjon, ikke faktisk antall: dekning, låste og
   * publiserte vakter og tilgjengelighet går foran. Justerbar standard, ikke
   * en arbeidstidsgrense.
   */
  catchUpLimit: number;
  /**
   * Stabilitet ved «Fordel på nytt»: kostnad per gyldig tildeling i perioden
   * som byttes ut, så planen ikke endres uten grunn mellom ellers like planer.
   */
  stability: number;
}

/**
 * Fagmiljøets arbeidskalender (B17). Tilstedestatuser, også vaktene, gjelder
 * arbeidsdager; ingen status betyr planlagt til stede bare på arbeidsdager.
 * Bemanningsbehovet per dag står i `StaffingRequirement`. Visningsfilteret
 * for helg og helligdager påvirker aldri dette.
 */
export interface WorkCalendar {
  /** Arbeidsdag per ukedag, indeksert man=0 … søn=6. */
  weekdays: [boolean, boolean, boolean, boolean, boolean, boolean, boolean];
  /** Er helligdager arbeidsdager (når ukedagen er det)? */
  holidays: boolean;
  /** Helligdagskalenderen (beregnet, ikke lagret). Utelatt = norske helligdager. */
  holidayCalendar?: HolidayCalendar;
}

export interface StaffingRequirement {
  statusId: string;
  /** Antall per dag, indeksert man=0 … søn=6. */
  perWeekday: [number, number, number, number, number, number, number];
  /** Gjelder også på helligdager? */
  onHolidays: boolean;
  /**
   * Rollevekter for fordelingen: forventet andel per stillingskategori,
   * relativt til de andre kategoriene. Manglende kategori teller 1.
   */
  categoryWeights?: Record<string, number>;
  /** Hvor belastende vakttypen er, relativt (1 = vanlig). Brukt i spredning og korttidsbelastning. */
  load?: number;
}

// ---------------------------------------------------------------------------
// Medarbeidere
// ---------------------------------------------------------------------------

export interface StaffCategory {
  id: string;
  name: string;
  short: string;
}

export interface Person {
  id: string;
  name: string;
  categoryId: string;
  /** Status-IDer personen er kvalifisert for (bare relevant for statuser som krever det). */
  qualifications: string[];
  active: boolean;
}

// ---------------------------------------------------------------------------
// Kalenderoppføringer
// ---------------------------------------------------------------------------

/**
 * Statusen til én medarbeider én dag. Det finnes høyst én registrering per
 * medarbeider og dato, høyst én per dato for statuser med `uniquePerDay`, og
 * høyst bemanningsbehovet for en annen bemannet oppgave (`staffingCap`).
 */
export interface CalendarEntry {
  id: string;
  personId: string;
  date: IsoDate;
  statusId: string;
  /**
   * Klokkeslett som tilleggsinformasjon til kollegene. Utelatt = hele dagen.
   * Påvirker verken tilstedeværelsen eller vaktfordelingen.
   */
  time?: TimeRange;
  /** Kort, ikke-sensitiv planleggingsmerknad. Aldri fraværsgrunn eller helseopplysninger. */
  note?: string;
  /** Regelversjonen som gjaldt da oppføringen ble lagret (intern historikk, vises ikke). */
  ruleVersion: number;
  /** Låst: den automatiske fordelingen endrer den aldri (manuell avtale). */
  locked?: boolean;
  /**
   * Administrativt vaktfritak er innvilget (bare statuser med
   * `dutyExemption: 'administrative'`, som Borte). Ingen årsak registreres, og
   * bare roller som kan innvilge fritak, ser det; andre ser bare statusen.
   */
  exempt?: boolean;
}

// ---------------------------------------------------------------------------
// Roller
// ---------------------------------------------------------------------------

/**
 * Rollene i policytabellen (`permissions.ts`, docs/personal.md §8.4):
 * kollega (`reader`), vaktplanansvarlig (`planner`), lokal administrator
 * (`localAdmin`, også systemarkitekt med lokal myndighet, B2) og
 * systemarkitekt uten lokal myndighet (`outsideArchitect`), som ikke har
 * innsyn. I OUSFAR avledes rollen på serveren fra medlemskapet og de lokale
 * rollene (P2b); tabellen her er fasiten kommandoene og testene bruker.
 */
export type Role = 'reader' | 'planner' | 'localAdmin' | 'outsideArchitect';

// ---------------------------------------------------------------------------
// Samlet tilstand
// ---------------------------------------------------------------------------

export interface Unit {
  id: string;
  name: string;
  /** Første måned (1–12) i arbeidsåret. */
  workYearStartMonth: number;
  /**
   * Fagmiljøets tidssone (IANA, f.eks. Europe/Oslo). «I dag» regnes i den,
   * også på serveren, så midnatt og sommertid følger fagmiljøet.
   */
  timeZone: string;
  /** Om helger og helligdager er skjult som standard i visningene. Bare visning. */
  hideWeekendsByDefault: boolean;
}

/** `no`: norske helligdager. `none`: ingen helligdager. */
export type HolidayCalendar = 'no' | 'none';

/**
 * Medarbeiderens individuelle vaktandel over tid: den relative
 * vaktbelastningen, uavhengig av stillingsprosent og av tilgjengeligheten i
 * kalenderen. Endringer kan bare gjelde fra i dag og fremover, så tidligere
 * forventet vaktbelastning ikke skrives om.
 */
export interface DutyShareSchedule {
  /** Ordinære vaktandeler i prosent, sortert etter dato; hver gjelder fra datoen til den neste. Før den første gjelder 100 %. */
  ordinary: { from: IsoDate; percent: number }[];
  /** Midlertidige perioder med en annen vaktandel, begge datoer med. Overlapper ikke hverandre. */
  temporary: DutySharePeriod[];
}

export interface DutySharePeriod {
  id: string;
  from: IsoDate;
  to: IsoDate;
  percent: number;
}

/** Medarbeiderlisten slik den gjaldt fra en dato. */
export interface PeopleSnapshot {
  effectiveFrom: IsoDate;
  people: Person[];
}

export interface PlannerState {
  unit: Unit;
  categories: StaffCategory[];
  people: Person[];
  /** Gjeldende regelsett. Brukes for i dag og fremover. */
  rules: RuleSet;
  /**
   * Alle tidligere regelversjoner i den rekkefølgen de ble lagret, også flere
   * fra samme dag. Ingen fjernes, slik at regelversjonen på en registrering
   * alltid kan slås opp. Dager før i dag vurderes etter den siste versjonen
   * med gyldighetsdato på eller før dagen.
   */
  ruleVersions: RuleSet[];
  /** Høyeste regelversjon som er tatt i bruk. Følger med gjennom angre. */
  ruleVersionSeq: number;
  /** Første dag gjeldende medarbeiderliste (kvalifikasjoner, mønstre, aktiv) gjelder for. */
  peopleFrom: IsoDate;
  /** Tidligere medarbeiderlister, eldst først. Brukes for dager før i dag. */
  peopleHistory: PeopleSnapshot[];
  entries: CalendarEntry[];
  /** Vaktandel per medarbeider-ID. Mangler en medarbeider, er vaktandelen 100 %. */
  dutyShares: Record<string, DutyShareSchedule>;
  /**
   * Vaktplanen er publisert til og med denne datoen. Den automatiske
   * fordelingen endrer publiserte vakter bare med uttrykkelig tillatelse.
   */
  publishedThrough?: IsoDate;
}
