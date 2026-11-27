import { workCalendarOf } from './catalog.ts';
import { addDays, formatRange, holidayName, isValidRange, todayIn, weekdayIndex } from './dates.ts';
import { DAY_KIND_LABELS, dayKind } from './people.ts';
import { checkNote } from './privacy.ts';
import type { CalendarEntry, IsoDate, Person, PlannerState, RuleSet, StatusDefinition, TimeRange } from './types.ts';

/**
 * Regelmotoren for kalenderen. Rene funksjoner uten UI-avhengigheter.
 *
 * Grunnmodellen er enkel: en medarbeider har høyst én status per dag, og en
 * status med `uniquePerDay` (vaktene) har høyst én medarbeider per dag. Alle
 * endringer i kalenderen planlegges av `planSet`, som sier hva endringen
 * erstatter i cellen, om den tar over en vakt fra en annen, og om den bryter
 * et krav (kvalifikasjon, arbeidsdag, klokkeslett, merknad). Den samme
 * vurderingen brukes av popoveren, flyttingen, flervalget og vaktfordelingen.
 * Klokkeslett er bare tilleggsinformasjon og påvirker ingen regler.
 */

export type ViolationCode =
  | 'unknownPerson'
  | 'unknownStatus'
  | 'inactiveStatus'
  | 'inactivePerson'
  | 'notWorkday'
  | 'notQualified'
  | 'invalidTime'
  | 'note'
  /** Cellen har alt en annen status (bare der det ikke er lov å erstatte, som i vaktfordelingen). */
  | 'occupied'
  /** Vakttypen er alt tildelt en annen samme dag (bare der overtakelse ikke er lov). */
  | 'dutyTaken'
  /** Vaktandel 0 %: tildeles ikke vakt automatisk (bare i vaktfordelingen). */
  | 'noDutyShare';

export interface Violation {
  code: ViolationCode;
  message: string;
  /** Registreringen bruddet gjelder, hvis noen. */
  entryId?: string;
}

export interface EntryDraft {
  personId: string;
  date: IsoDate;
  statusId: string;
  /** Utelatt = hele dagen. */
  time?: TimeRange;
  note?: string;
}

export interface Cell {
  personId: string;
  date: IsoDate;
}

// ---------------------------------------------------------------------------
// Regelsett og medarbeidere per dato
// ---------------------------------------------------------------------------

/** Den siste av kandidatene (i lagringsrekkefølge) som gjelder fra datoen eller før; ellers den første. */
function inEffect<T extends { effectiveFrom: IsoDate }>(candidates: T[], date: IsoDate): T {
  let chosen: T | undefined;
  for (const c of candidates) if (c.effectiveFrom <= date) chosen = c;
  return chosen ?? candidates[0]!;
}

/**
 * Regelsettet som gjelder en dato. I dag og fremover gjelder det gjeldende
 * regelsettet. Tidligere dager vurderes etter regelsettet som gjaldt da,
 * slik at historikk og historisk vaktdekning ikke endres i etterkant.
 */
export function rulesForDate(state: PlannerState, date: IsoDate, today: IsoDate = todayIn(state.unit.timeZone)): RuleSet {
  if (date >= today || !state.ruleVersions.length) return state.rules;
  return inEffect([...state.ruleVersions, state.rules], date);
}

/** Regelsettet med et bestemt versjonsnummer, f.eks. versjonen en registrering ble lagret under. */
export function ruleSetByVersion(state: PlannerState, version: number): RuleSet | undefined {
  return state.rules.version === version ? state.rules : state.ruleVersions.find((r) => r.version === version);
}

/**
 * Medarbeiderlisten som gjelder en dato: kvalifikasjoner og om personen er
 * aktiv. Endringer gjelder fra dagen de lagres, så tidligere dager vurderes
 * etter det som gjaldt da.
 */
export function peopleForDate(state: PlannerState, date: IsoDate, today: IsoDate = todayIn(state.unit.timeZone)): Person[] {
  if (date >= today || !state.peopleHistory.length) return state.people;
  return inEffect([...state.peopleHistory, { effectiveFrom: state.peopleFrom, people: state.people }], date).people;
}

/** Tilstanden sett fra en dato: samme registreringer, men med regler og medarbeidere slik de gjaldt da. */
export function atDate(state: PlannerState, date: IsoDate, today: IsoDate = todayIn(state.unit.timeZone)): PlannerState {
  const rules = rulesForDate(state, date, today);
  const people = peopleForDate(state, date, today);
  return rules === state.rules && people === state.people ? state : { ...state, rules, people };
}

/** Personen slik den var registrert på datoen; `undefined` hvis den ikke var registrert da. */
export function personAt(state: PlannerState, personId: string, date: IsoDate, today: IsoDate = todayIn(state.unit.timeZone)): Person | undefined {
  return personById(atDate(state, date, today), personId);
}

/** Medarbeidere som var registrert og aktive datoen, slik de var registrert da. */
export function activePeopleAt(state: PlannerState, date: IsoDate, today: IsoDate = todayIn(state.unit.timeZone)): Person[] {
  return peopleForDate(state, date, today).filter((p) => p.active);
}

/**
 * Medarbeidere som inngår i en periode: aktive på minst én dag i perioden
 * etter medarbeiderlisten som gjaldt dagen, eller med en registrering i
 * perioden. Rekkefølge og navn som i dagens liste, så radene er stabile.
 */
export function peopleInPeriod(state: PlannerState, start: IsoDate, end: IsoDate, today: IsoDate = todayIn(state.unit.timeZone)): Person[] {
  const ids = new Set<string>();
  const lists = new Set<Person[]>();
  for (let d = start; d <= end; d = addDays(d, 1)) lists.add(peopleForDate(state, d, today));
  for (const list of lists) for (const p of list) if (p.active) ids.add(p.id);
  for (const e of state.entries) if (e.date >= start && e.date <= end) ids.add(e.personId);
  return state.people.filter((p) => ids.has(p.id));
}

// ---------------------------------------------------------------------------
// Oppslag og indekser
// ---------------------------------------------------------------------------

const statusIndexCache = new WeakMap<StatusDefinition[], Map<string, StatusDefinition>>();
export function statusIndex(rules: RuleSet): Map<string, StatusDefinition> {
  let idx = statusIndexCache.get(rules.statuses);
  if (!idx) {
    idx = new Map(rules.statuses.map((s) => [s.id, s]));
    statusIndexCache.set(rules.statuses, idx);
  }
  return idx;
}

export function cellKey(personId: string, date: IsoDate): string {
  return `${date}|${personId}`;
}

const entryIndexCache = new WeakMap<CalendarEntry[], Map<string, CalendarEntry>>();
/** Registreringen per person og dato. Bygges én gang per versjon av listen. */
export function entryIndex(entries: CalendarEntry[]): Map<string, CalendarEntry> {
  let idx = entryIndexCache.get(entries);
  if (!idx) {
    idx = new Map();
    for (const e of entries) idx.set(cellKey(e.personId, e.date), e);
    entryIndexCache.set(entries, idx);
  }
  return idx;
}

const dateIndexCache = new WeakMap<CalendarEntry[], Map<IsoDate, CalendarEntry[]>>();
export function entriesByDate(entries: CalendarEntry[]): Map<IsoDate, CalendarEntry[]> {
  let idx = dateIndexCache.get(entries);
  if (!idx) {
    idx = new Map();
    for (const e of entries) {
      const list = idx.get(e.date);
      if (list) list.push(e);
      else idx.set(e.date, [e]);
    }
    dateIndexCache.set(entries, idx);
  }
  return idx;
}

/** Statusen til en person en dag, eller `undefined` (ingen status). */
export function entryAt(state: PlannerState, personId: string, date: IsoDate): CalendarEntry | undefined {
  return entryIndex(state.entries).get(cellKey(personId, date));
}

const personIndexCache = new WeakMap<Person[], Map<string, Person>>();
export function personById(state: PlannerState, id: string): Person | undefined {
  let idx = personIndexCache.get(state.people);
  if (!idx) {
    idx = new Map(state.people.map((p) => [p.id, p]));
    personIndexCache.set(state.people, idx);
  }
  return idx.get(id);
}

/** Klokkeslettene for visning, eller null når registreringen gjelder hele dagen. */
export function timeText(entry: { time?: TimeRange }): string | null {
  return entry.time ? formatRange(entry.time) : null;
}

/**
 * Feil i modellens to faste krav for et sett registreringer: høyst én status
 * per medarbeider og dato, og høyst én medarbeider per dato for statuser med
 * `uniquePerDay`. Tom liste betyr at kravene holder.
 */
export function invariantErrors(entries: CalendarEntry[], statuses: Map<string, StatusDefinition>): string[] {
  const errors: string[] = [];
  const cells = new Set<string>();
  const unique = new Set<string>();
  for (const e of entries) {
    const cell = cellKey(e.personId, e.date);
    if (cells.has(cell)) errors.push(`To statuser for samme medarbeider ${e.date}.`);
    cells.add(cell);
    const def = statuses.get(e.statusId);
    if (!def?.uniquePerDay) continue;
    const key = `${e.date}|${e.statusId}`;
    if (unique.has(key)) errors.push(`${def.name} er tildelt flere ${e.date}.`);
    unique.add(key);
  }
  return [...new Set(errors)];
}

// ---------------------------------------------------------------------------
// Krav til én status
// ---------------------------------------------------------------------------

/**
 * Krav som gjelder statusen alene for personen og dagen. `isNew`: statusen
 * tas i bruk nå (deaktiverte statuser og inaktive medarbeidere avvises).
 * Eksisterende registreringer vurderes uten disse, så historikk beholdes.
 */
function statusProblems(rules: RuleSet, person: Person | undefined, def: StatusDefinition | undefined, item: { date: IsoDate; time?: TimeRange; note?: string }, isNew: boolean): Violation[] {
  if (!person) return [{ code: 'unknownPerson', message: 'Ukjent medarbeider.' }];
  if (!def) return [{ code: 'unknownStatus', message: 'Ukjent status.' }];
  const v: Violation[] = [];
  if (isNew && !def.active) v.push({ code: 'inactiveStatus', message: `${def.name} er utgått og kan ikke velges.` });
  if (isNew && !person.active) v.push({ code: 'inactivePerson', message: `${person.name} er ikke aktiv.` });
  if (def.requiresQualification && !person.qualifications.includes(def.id)) {
    v.push({ code: 'notQualified', message: `${person.name} er ikke kvalifisert for ${def.name.toLowerCase()}.` });
  }
  // Statuser som regnes som fysisk til stede, gjelder arbeidsdager etter arbeidskalenderen (B17).
  if (def.present) {
    const kind = dayKind(person, item.date, rules);
    if (kind !== 'work') v.push({ code: 'notWorkday', message: `${def.name} gjelder arbeidsdager, og dagen er: ${DAY_KIND_LABELS[kind].toLowerCase()}.` });
  }
  if (item.time && !isValidRange(item.time)) v.push({ code: 'invalidTime', message: 'Klokkeslettene er ugyldige: «Til» må være etter «Fra».' });
  if (isNew) {
    const note = checkNote(item.note);
    if (!note.ok) v.push({ code: 'note', message: note.error! });
  }
  return v;
}

/**
 * Problemer med en eksisterende registrering under reglene og
 * medarbeiderlisten som gjelder dagen (se `rulesForDate`). Brukes til å
 * markere registreringer som er blitt ugyldige (f.eks. etter en endret
 * kvalifikasjon), uten å endre dem.
 */
export function entryProblems(state: PlannerState, entry: CalendarEntry, today: IsoDate = todayIn(state.unit.timeZone)): Violation[] {
  return problemsIn(atDate(state, entry.date, today), entry);
}

/** Som `entryProblems`, men med regelsettet allerede valgt. */
function problemsIn(state: PlannerState, entry: CalendarEntry): Violation[] {
  return statusProblems(state.rules, personById(state, entry.personId), statusIndex(state.rules).get(entry.statusId), entry, false).map((v) => ({ ...v, entryId: entry.id }));
}

export interface CellProblem {
  entry: CalendarEntry;
  problems: Violation[];
}

/** Alle ugyldige registreringer i et datointervall. */
export function invalidEntries(state: PlannerState, from: IsoDate, to: IsoDate, today: IsoDate = todayIn(state.unit.timeZone)): CellProblem[] {
  const out: CellProblem[] = [];
  for (const e of state.entries) {
    if (e.date < from || e.date > to) continue;
    const problems = entryProblems(state, e, today);
    if (problems.length) out.push({ entry: e, problems });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Planlegging av en endring
// ---------------------------------------------------------------------------

export interface SetPlan {
  draft: EntryDraft;
  /** Statusen i cellen som erstattes (også samme status med ny merknad eller tid). */
  replaces?: CalendarEntry;
  /** Samme vakt hos en annen medarbeider samme dag. Fjernes ved overtakelse. */
  takesOver?: CalendarEntry;
  violations: Violation[];
}

/**
 * Hva det vil si å gi en person en status en dag. Ignorerte registreringer
 * regnes som borte (brukes når flere endringer vurderes samlet, som i et bytte).
 */
export function planSet(state: PlannerState, draft: EntryDraft, today: IsoDate = todayIn(state.unit.timeZone), ignore: ReadonlySet<string> = new Set()): SetPlan {
  const s = atDate(state, draft.date, today);
  const known = personById(state, draft.personId);
  const person = personById(s, draft.personId);
  const def = statusIndex(s.rules).get(draft.statusId);
  const existing = entryAt(state, draft.personId, draft.date);
  const replaces = existing && !ignore.has(existing.id) ? existing : undefined;
  // Samme status i samme celle er bare ny merknad eller tid: da gjelder bare kravene til dem,
  // så en registrering som er blitt ugyldig (f.eks. etter endret kvalifikasjon) fortsatt kan redigeres.
  const same = replaces?.statusId === draft.statusId;
  const violations =
    !person && known
      ? [{ code: 'unknownPerson' as const, message: `${known.name} var ikke registrert som medarbeider denne dagen.` }]
      : statusProblems(s.rules, person, def, draft, true).filter((v) => !same || DETAIL_CODES.has(v.code));
  const takesOver = def?.uniquePerDay
    ? (entriesByDate(state.entries).get(draft.date) ?? []).find((e) => e.statusId === def.id && e.personId !== draft.personId && !ignore.has(e.id))
    : undefined;
  return { draft: normalize(draft), ...(replaces ? { replaces } : {}), ...(takesOver ? { takesOver } : {}), violations };
}

const DETAIL_CODES: ReadonlySet<ViolationCode> = new Set(['invalidTime', 'note']);

function normalize(draft: EntryDraft): EntryDraft {
  const note = checkNote(draft.note).value;
  return { personId: draft.personId, date: draft.date, statusId: draft.statusId, ...(draft.time ? { time: { ...draft.time } } : {}), ...(note ? { note } : {}) };
}

/**
 * Registreringen som planen lagrer. Samme status i samme celle beholder ID,
 * lås og regelversjon (intern historikk); en ny status er en ny registrering.
 */
export function entryFromPlan(state: PlannerState, plan: SetPlan, newId: () => string, today: IsoDate = todayIn(state.unit.timeZone)): CalendarEntry {
  const { draft, replaces } = plan;
  const same = replaces?.statusId === draft.statusId;
  return {
    id: same ? replaces!.id : newId(),
    ...draft,
    ruleVersion: same ? replaces!.ruleVersion : rulesForDate(state, draft.date, today).version,
    ...(same && replaces!.locked ? { locked: true } : {}),
    // Et innvilget vaktfritak følger bare den samme registreringen (ny merknad eller tid), aldri en ny status.
    ...(same && replaces!.exempt ? { exempt: true } : {}),
  };
}

/** Tilstanden etter planen: det som erstattes og tas over, fjernes, og den nye registreringen legges til. */
export function applyPlan(state: PlannerState, plan: SetPlan, entry: CalendarEntry): PlannerState {
  const remove = new Set([plan.replaces?.id, plan.takesOver?.id].filter(Boolean));
  return { ...state, entries: [...state.entries.filter((e) => !remove.has(e.id)), entry] };
}

// ---------------------------------------------------------------------------
// Tilstedeværelse og tilgjengelighet
// ---------------------------------------------------------------------------

/**
 * Planlagt tilstedeværelse: `present` på en arbeidsdag uten status eller med
 * en status som regnes som fysisk til stede, `away` med en status som ikke
 * gjør det (også «Jobber et annet sted»), `off` på en dag som ikke er
 * arbeidsdag eller når personen ikke er aktiv. Visningsgruppen og
 * klokkeslett påvirker ikke tilstedeværelsen.
 */
export type Presence = 'present' | 'away' | 'off';

export function presenceOf(state: PlannerState, personId: string, date: IsoDate, today: IsoDate = todayIn(state.unit.timeZone)): Presence {
  const s = atDate(state, date, today);
  const entry = entryAt(s, personId, date);
  const def = entry ? statusIndex(s.rules).get(entry.statusId) : undefined;
  if (def && !def.present) return 'away';
  return dayKind(personById(s, personId), date, s.rules) === 'work' ? 'present' : 'off';
}

/**
 * Kan personen tildeles en ny vakt (eller annen status) uten å erstatte noe?
 * Bare en medarbeider uten status er ledig: alle statuser, også de som regnes
 * som til stede, gjør personen opptatt. Ledigheten kan ikke konfigureres
 * (docs/personal.md §7.2). Gir bruddene, tom liste = ledig.
 */
export function freeForNew(state: PlannerState, draft: EntryDraft, today: IsoDate = todayIn(state.unit.timeZone)): Violation[] {
  const plan = planSet(state, draft, today);
  const v = [...plan.violations];
  if (plan.replaces) {
    const def = statusIndex(rulesForDate(state, draft.date, today)).get(plan.replaces.statusId);
    v.push({ code: 'occupied', message: `Har ${def?.name.toLowerCase() ?? 'en annen status'} samme dag.`, entryId: plan.replaces.id });
  }
  if (plan.takesOver) v.push({ code: 'dutyTaken', message: `${statusIndex(rulesForDate(state, draft.date, today)).get(draft.statusId)?.name ?? 'Vakten'} er alt tildelt samme dag.`, entryId: plan.takesOver.id });
  return v;
}

/**
 * Gir registreringen vaktfritak (ingen forventet vaktbelastning den dagen)?
 * Etter statusens egenskap i regelsettet som gjaldt dagen: `always` (ferie,
 * opplæring), eller `administrative` når fritaket er innvilget (Borte).
 */
export function isDutyExempt(state: PlannerState, entry: CalendarEntry | undefined, today: IsoDate = todayIn(state.unit.timeZone)): boolean {
  if (!entry) return false;
  const kind = statusIndex(rulesForDate(state, entry.date, today)).get(entry.statusId)?.dutyExemption;
  return kind === 'always' || (kind === 'administrative' && entry.exempt === true);
}

/** Kan registreringen få administrativt vaktfritak etter regelsettet som gjaldt dagen? */
export function allowsAdministrativeExemption(state: PlannerState, entry: CalendarEntry, today: IsoDate = todayIn(state.unit.timeZone)): boolean {
  return statusIndex(rulesForDate(state, entry.date, today)).get(entry.statusId)?.dutyExemption === 'administrative';
}

// ---------------------------------------------------------------------------
// Bemanning
// ---------------------------------------------------------------------------

export function requiredCount(rules: RuleSet, statusId: string, date: IsoDate): number {
  const req = rules.staffing.find((r) => r.statusId === statusId);
  if (!req) return 0;
  if (!req.onHolidays && holidayName(date, workCalendarOf(rules).holidayCalendar ?? 'no')) return 0;
  return req.perWeekday[weekdayIndex(date)] ?? 0;
}

export interface CoverageSlot {
  status: StatusDefinition;
  required: number;
  assigned: CalendarEntry[];
  /** Gyldige tildelinger. Bare disse teller som dekning. */
  valid: CalendarEntry[];
  /** Tildelinger som bryter reglene (f.eks. etter en endret kvalifikasjon). */
  invalid: CalendarEntry[];
  /** Plasser som ikke er dekket av en gyldig tildeling. */
  missing: number;
  /** Gyldige tildelinger utover behovet. */
  surplus: number;
}

/**
 * Vaktdekning for en dag. Samme beregning brukes i alle visninger og i
 * konsekvensvurderingen: bare gyldige tildelinger teller.
 */
export function dayCoverage(state: PlannerState, date: IsoDate, today: IsoDate = todayIn(state.unit.timeZone)): CoverageSlot[] {
  const s = atDate(state, date, today);
  const statuses = statusIndex(s.rules);
  const dayEntries = entriesByDate(s.entries).get(date) ?? [];
  const slots: CoverageSlot[] = [];
  for (const req of s.rules.staffing) {
    const status = statuses.get(req.statusId);
    if (!status) continue;
    const required = requiredCount(s.rules, req.statusId, date);
    const assigned = dayEntries.filter((e) => e.statusId === req.statusId);
    if (required === 0 && assigned.length === 0) continue;
    const valid: CalendarEntry[] = [];
    const invalid: CalendarEntry[] = [];
    // Bare statuser som regnes som fysisk til stede, kan dekke et behov (A-STA-09), selv om oppsettet er endret.
    const counts = status.present;
    for (const e of assigned) (counts && problemsIn(s, e).length === 0 ? valid : invalid).push(e);
    slots.push({ status, required, assigned, valid, invalid, missing: Math.max(0, required - valid.length), surplus: Math.max(0, valid.length - required) });
  }
  return slots;
}

/** Antall udekkede plasser en dag, summert over alle bemannede statuser. */
export function missingCount(slots: CoverageSlot[]): number {
  return slots.reduce((n, sl) => n + sl.missing, 0);
}

export interface CoverageEffect {
  date: IsoDate;
  statusId: string;
  statusName: string;
  missingBefore: number;
  missingAfter: number;
}

/** Vakter som blir udekket, eller får flere udekkede plasser, fra `before` til `after` på datoene. */
export function coverageEffects(before: PlannerState, after: PlannerState, dates: Iterable<IsoDate>, today: IsoDate = todayIn(before.unit.timeZone)): CoverageEffect[] {
  const out: CoverageEffect[] = [];
  for (const date of [...new Set(dates)].sort()) {
    const was = new Map(dayCoverage(before, date, today).map((s) => [s.status.id, s.missing]));
    for (const slot of dayCoverage(after, date, today)) {
      const missingBefore = was.get(slot.status.id) ?? 0;
      if (slot.missing > missingBefore) out.push({ date, statusId: slot.status.id, statusName: slot.status.name, missingBefore, missingAfter: slot.missing });
    }
  }
  return out;
}
