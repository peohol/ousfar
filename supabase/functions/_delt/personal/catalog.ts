import type { AllocationSettings, RuleSet, StaffingRequirement, StatusDefinition, StatusGroup, WorkCalendar } from './types.ts';

/**
 * Pilotoppsettet for det første fagmiljøet (OUS Klinisk farmakologi) og de
 * generelle standardene. Oppsettet er data, ikke kode: et annet fagmiljø kan
 * få andre statuser, visningsgrupper, arbeidsdager og bemanningsbehov uten
 * endringer i regelmotoren eller vaktfordelingen (K-KON-2). I OUSFAR lagres
 * det som versjonert konfigurasjon per fagmiljø (P2b); her er startverdiene.
 *
 * En medarbeider har høyst én status per dag. Statusene er gjensidig
 * ekskluderende per konstruksjon, så det finnes ingen eksklusjonsregler.
 *
 * Statuskatalogen følger vedtaket 27.11.2026 (B17, docs/personal.md §6.2 og
 * §7.2): Fri er slått sammen med Ferie, som har solikon og gir vaktfritak,
 * og visningsgruppene er Til stede, Jobber et annet sted og Fraværende.
 */

export const STATUS_IDS = {
  duty1: 'vakt1',
  duty2: 'vakt2',
  referent: 'referent',
  training: 'opplaering',
  away: 'borte',
  vacation: 'ferie',
  homeOffice: 'hjemmekontor',
  research: 'forskning',
  teaching: 'undervisning',
  timeOff: 'avspasering',
  wishOff: 'onske-fri',
} as const;

export const GROUP_IDS = {
  present: 'tilstede',
  elsewhere: 'annetsted',
  absent: 'fravaer',
} as const;

const S = STATUS_IDS;
const G = GROUP_IDS;

/** Pilotens visningsgrupper i fast rekkefølge (B17). */
export const DEFAULT_GROUPS: StatusGroup[] = [
  { id: G.present, name: 'Til stede' },
  { id: G.elsewhere, name: 'Jobber et annet sted' },
  { id: G.absent, name: 'Fraværende' },
];

type StatusData = Omit<StatusDefinition, 'active' | 'uniquePerDay' | 'requiresQualification'> & Partial<Pick<StatusDefinition, 'uniquePerDay' | 'requiresQualification'>>;
const status = (s: StatusData): StatusDefinition => ({ uniquePerDay: false, requiresQualification: false, active: true, ...s });

export const DEFAULT_STATUSES: StatusDefinition[] = [
  status({ id: S.duty1, name: 'Vakt 1', group: G.present, present: true, highlighted: true, icon: 'shield', tone: 'green', uniquePerDay: true, requiresQualification: true, description: 'Førstevakt.' }),
  status({ id: S.duty2, name: 'Vakt 2', group: G.present, present: true, highlighted: true, icon: 'shield', tone: 'blue', uniquePerDay: true, requiresQualification: true, description: 'Andrevakt.' }),
  status({ id: S.referent, name: 'Referent', group: G.present, present: true, highlighted: true, icon: 'pencil', tone: 'violet' }),
  status({ id: S.training, name: 'Opplæring', group: G.present, present: true, icon: 'bulb', tone: 'teal', dutyExemption: 'always', description: 'Gir vaktfritak: ingen forventede vakter disse dagene.' }),
  status({ id: S.homeOffice, name: 'Hjemmekontor', group: G.elsewhere, present: false, icon: 'house', tone: 'slate' }),
  status({ id: S.research, name: 'Forskning', group: G.elsewhere, present: false, icon: 'microscope', tone: 'rose' }),
  status({ id: S.teaching, name: 'Undervisning', group: G.elsewhere, present: false, icon: 'cap', tone: 'sky' }),
  status({ id: S.away, name: 'Borte', group: G.absent, present: false, icon: 'cross', tone: 'red', dutyExemption: 'administrative', description: 'Ikke til stede, også ordinære arbeidsfrie dager ved deltid. Ingen grunn registreres. En administrator kan innvilge vaktfritak.' }),
  status({ id: S.vacation, name: 'Ferie', group: G.absent, present: false, icon: 'sun', tone: 'gold', dutyExemption: 'always', description: 'Faktisk ferie, også ulønnet ferie. Gir vaktfritak: ingen forventede vakter disse dagene.' }),
  status({ id: S.timeOff, name: 'Avspasering', group: G.absent, present: false, icon: 'clock', tone: 'amber' }),
  status({ id: S.wishOff, name: 'Ønske om fri', group: G.absent, present: false, icon: 'question', tone: 'gold', wish: true, description: 'Regnes som fravær i vaktfordelingen, men vises annerledes enn registrert fravær.' }),
];

/** Mandag–fredag, ikke norske helligdager (piloten). */
export const DEFAULT_WORK_CALENDAR: WorkCalendar = {
  weekdays: [true, true, true, true, true, false, false],
  holidays: false,
};

/** Arbeidskalenderen i et regelsett, med standarden når den mangler. */
export function workCalendarOf(rules: RuleSet): WorkCalendar {
  return rules.workCalendar ?? DEFAULT_WORK_CALENDAR;
}

/**
 * Startverdier for det første fagmiljøet: vakt 1 fordeles omtrent 2:1 mellom
 * LIS og overleger, vakt 2 omvendt, og vakt 1 er mer belastende. Dette er
 * konfigurasjon (data), ikke regler i fordelingsmotoren, og kan endres av
 * lokal administrator.
 */
export const DEFAULT_ALLOCATION_WEIGHTS: Record<string, Pick<StaffingRequirement, 'categoryWeights' | 'load'>> = {
  [S.duty1]: { categoryWeights: { lis: 2, overlege: 1 }, load: 1.5 },
  [S.duty2]: { categoryWeights: { lis: 1, overlege: 2 }, load: 1 },
};

/** Én vakt 1 og én vakt 2 per vanlig arbeidsdag (man–fre, ikke helligdager). */
export const DEFAULT_STAFFING: StaffingRequirement[] = [
  { statusId: S.duty1, perWeekday: [1, 1, 1, 1, 1, 0, 0], onHolidays: false, ...DEFAULT_ALLOCATION_WEIGHTS[S.duty1] },
  { statusId: S.duty2, perWeekday: [1, 1, 1, 1, 1, 0, 0], onHolidays: false, ...DEFAULT_ALLOCATION_WEIGHTS[S.duty2] },
];

/**
 * Standardvekter for de myke målene i fordelingen. Utgangspunkt, ikke
 * vedtatte tall. Rekkefølgen i prioritet (Peder 26.11.2026): historisk
 * utjevning, avstand og jevn belastning høyt; rettferdighet i perioden
 * isolert sett og variasjon i ukedager lavere.
 */
export const DEFAULT_ALLOCATION: AllocationSettings = {
  historyFairness: 20,
  periodFairness: 1,
  shortTerm: 2,
  spacing: 6,
  weekday: 0.5,
  mixedCategories: 3,
  historyDays: 365,
  shortWindowDays: 42,
  catchUpLimit: 50,
  stability: 0.5,
};

/**
 * Feltene i fordelingsinnstillingene som ikke er vekter, med grenser: antall
 * dager og prosent (hele tall). De andre feltene er vekter mellom 0 og 100.
 */
export const ALLOCATION_FIELD_LIMITS: Record<'historyDays' | 'shortWindowDays' | 'catchUpLimit', { min: number; max: number; label: string; unit: 'dager' | 'prosent' }> = {
  historyDays: { min: 28, max: 730, label: 'Tidshorisonten for historisk utjevning', unit: 'dager' },
  shortWindowDays: { min: 7, max: 120, label: 'Det korte vinduet', unit: 'dager' },
  catchUpLimit: { min: 0, max: 200, label: 'Største ekstra utjevning i én plan', unit: 'prosent' },
};

export const isAllocationLimitedField = (key: string): key is keyof typeof ALLOCATION_FIELD_LIMITS => Object.hasOwn(ALLOCATION_FIELD_LIMITS, key);

/** Fordelingsvektene i et regelsett, med standardverdier for det som mangler. */
export function allocationSettings(rules: RuleSet): AllocationSettings {
  return { ...DEFAULT_ALLOCATION, ...rules.allocation };
}

/** Første dag eksempelregelsettet gjelder fra. */
export const RULES_EPOCH = '2000-01-01';

export function defaultRuleSet(): RuleSet {
  return {
    version: 1,
    effectiveFrom: RULES_EPOCH,
    groups: structuredClone(DEFAULT_GROUPS),
    statuses: structuredClone(DEFAULT_STATUSES),
    workCalendar: structuredClone(DEFAULT_WORK_CALENDAR),
    staffing: structuredClone(DEFAULT_STAFFING),
  };
}

/**
 * Statusene gruppert etter visningsgruppe i oppsettets rekkefølge, med
 * katalogens rekkefølge innen hver gruppe. Tomme grupper utelates. Bare
 * visning: grupperingen påvirker ingen beregning.
 */
export function statusesByGroup(rules: Pick<RuleSet, 'groups' | 'statuses'>, statuses: readonly StatusDefinition[] = rules.statuses): { group: StatusGroup; items: StatusDefinition[] }[] {
  return rules.groups.map((group) => ({ group, items: statuses.filter((s) => s.group === group.id) })).filter((g) => g.items.length);
}
