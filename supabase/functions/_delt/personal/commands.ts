import { ALLOCATION_FIELD_LIMITS, DEFAULT_ALLOCATION, isAllocationLimitedField, workCalendarOf } from './catalog.ts';
import { addDays, todayIn } from './dates.ts';
import { assertCan } from './permissions.ts';
import {
  allowsAdministrativeExemption,
  applyPlan,
  coverageEffects,
  dayCoverage,
  entriesByDate,
  entryAt,
  entryFromPlan,
  entryProblems,
  invariantErrors,
  personById,
  planSet,
  presenceOf,
  rulesForDate,
  statusIndex,
  type Cell,
  type CoverageEffect,
  type EntryDraft,
  type Presence,
  type SetPlan,
} from './rules.ts';
import type { CalendarEntry, IsoDate, Person, PlannerState, Role, RuleSet, StaffingRequirement, StatusDefinition, TimeRange } from './types.ts';

/**
 * Kommandoer som endrer tilstanden. Alle er rene funksjoner
 * (tilstand inn, ny tilstand ut) og sjekker rollen før de gjør noe, slik en
 * server ville gjort. UI-et kaller bare disse.
 */

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  const rnd = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}-${rnd}`;
}

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DomainError';
  }
}

// ---------------------------------------------------------------------------
// Kalender
// ---------------------------------------------------------------------------

export interface SetResult {
  state: PlannerState;
  plan: SetPlan;
  /** Lagret. Ikke lagret ved brudd, eller når en vakt må tas over uten at det er bekreftet. */
  applied: boolean;
  /** Vakter som blir udekket (eller flere udekket) av endringen. */
  uncovered: CoverageEffect[];
}

export interface SetOptions {
  /** Ta over vakten fra den som har den samme dag. Uten dette lagres ingenting når vakten er tildelt en annen. */
  takeOver?: boolean;
  today?: IsoDate;
}

/** Kontroller modellens faste krav for datoene som er endret. Kaster ved brudd (programfeil, ikke brukerfeil). */
export function assertInvariants(next: PlannerState, dates: Iterable<IsoDate>, today: IsoDate = todayIn(next.unit.timeZone)): PlannerState {
  for (const date of new Set(dates)) {
    const errors = invariantErrors(entriesByDate(next.entries).get(date) ?? [], statusIndex(rulesForDate(next, date, today)));
    if (errors.length) throw new DomainError(`Endringen kan ikke lagres: ${errors.join(' ')}`);
  }
  return next;
}

/**
 * Gi en person en status en dag. En eksisterende status i cellen erstattes.
 * Er statusen en vakt som en annen har samme dag, tas den over bare med
 * `takeOver`, som én samlet endring: vakten fjernes hos den andre og gis til
 * denne personen. Endringer med brudd lagres ikke.
 */
export function setStatus(state: PlannerState, role: Role, draft: EntryDraft, opts: SetOptions = {}): SetResult {
  assertCan(role, 'editCalendar');
  const today = opts.today ?? todayIn(state.unit.timeZone);
  const plan = planSet(state, draft, today);
  if (plan.violations.length || (plan.takesOver && !opts.takeOver)) return { state, plan, applied: false, uncovered: [] };
  const next = assertInvariants(applyPlan(state, plan, entryFromPlan(state, plan, () => newId('e'), today)), [draft.date], today);
  return { state: next, plan, applied: true, uncovered: coverageEffects(state, next, [draft.date], today) };
}

/**
 * Utkastet for et ordinært statusbytte i en celle: merknad og klokkeslett på
 * statusen som erstattes, beholdes, så tilleggsinformasjon ikke går tapt.
 */
export function statusChangeDraft(state: PlannerState, cell: Cell, statusId: string): EntryDraft {
  const old = entryAt(state, cell.personId, cell.date);
  return { ...cell, statusId, ...(old?.time ? { time: old.time } : {}), ...(old?.note ? { note: old.note } : {}) };
}

/** Ny merknad og/eller nye klokkeslett på en registrering. `time: null` = hele dagen. */
export function updateDetails(state: PlannerState, role: Role, entryId: string, details: { note?: string; time?: TimeRange | null }, today: IsoDate = todayIn(state.unit.timeZone)): SetResult {
  const entry = state.entries.find((e) => e.id === entryId);
  if (!entry) throw new DomainError('Fant ikke registreringen.');
  const time = details.time === undefined ? entry.time : details.time ?? undefined;
  const note = details.note === undefined ? entry.note : details.note;
  return setStatus(state, role, { personId: entry.personId, date: entry.date, statusId: entry.statusId, ...(time ? { time } : {}), ...(note ? { note } : {}) }, { today });
}

export function removeEntry(state: PlannerState, role: Role, entryId: string, today: IsoDate = todayIn(state.unit.timeZone)): { state: PlannerState; uncovered: CoverageEffect[] } {
  assertCan(role, 'editCalendar');
  const entry = state.entries.find((e) => e.id === entryId);
  if (!entry) throw new DomainError('Fant ikke registreringen.');
  const next = { ...state, entries: state.entries.filter((e) => e.id !== entryId) };
  return { state: next, uncovered: coverageEffects(state, next, [entry.date], today) };
}

/**
 * Innvilg eller trekk tilbake administrativt vaktfritak på en registrering
 * (Borte). Bare roller med myndighet (lokal administrator). Ingen årsak
 * registreres. Fritaket påvirker bare forventet vaktbelastning, ikke hvem som
 * kan få vakt.
 */
export function setExemption(state: PlannerState, role: Role, entryId: string, exempt: boolean, today: IsoDate = todayIn(state.unit.timeZone)): PlannerState {
  assertCan(role, 'manageExemption');
  const entry = state.entries.find((e) => e.id === entryId);
  if (!entry) throw new DomainError('Fant ikke registreringen.');
  if (!allowsAdministrativeExemption(state, entry, today)) throw new DomainError('Statusen kan ikke ha administrativt vaktfritak.');
  if (!!entry.exempt === exempt) return state;
  const { exempt: _old, ...rest } = entry;
  const next: CalendarEntry = exempt ? { ...rest, exempt: true } : rest;
  return { ...state, entries: state.entries.map((e) => (e.id === entryId ? next : e)) };
}

export type BulkOperation = { type: 'set'; statusId: string } | { type: 'clear' };

export interface BulkCellResult {
  cell: Cell;
  /** `set`: ny status uten å erstatte noe; `replace`: erstatter en status; `clear`: statusen fjernes; `skipped`: ingen endring. */
  outcome: 'set' | 'replace' | 'clear' | 'skipped';
  replaced?: CalendarEntry;
  reason?: string;
}

export interface BulkResult {
  state: PlannerState;
  results: BulkCellResult[];
  appliedCount: number;
  uncovered: CoverageEffect[];
}

/**
 * Samme endring på mange celler, vurdert celle for celle mot tilstanden etter
 * de foregående. En status som ikke kan gis, hoppes over med årsak. En vakt
 * som en annen alt har samme dag, tas ikke over i flervalg.
 */
export function applyToCells(state: PlannerState, role: Role, cells: Cell[], op: BulkOperation, opts: { today?: IsoDate } = {}): BulkResult {
  assertCan(role, 'editCalendar');
  const today = opts.today ?? todayIn(state.unit.timeZone);
  let current = state;
  const results: BulkCellResult[] = [];
  for (const cell of cells) {
    const old = entryAt(current, cell.personId, cell.date);
    if (op.type === 'clear') {
      if (!old) {
        results.push({ cell, outcome: 'skipped', reason: 'Ingen status' });
        continue;
      }
      current = { ...current, entries: current.entries.filter((e) => e.id !== old.id) };
      results.push({ cell, outcome: 'clear', replaced: old });
      continue;
    }
    if (old?.statusId === op.statusId) {
      results.push({ cell, outcome: 'skipped', reason: 'Har allerede statusen' });
      continue;
    }
    const r = setStatus(current, role, statusChangeDraft(current, cell, op.statusId), { today });
    if (!r.applied) {
      const holder = r.plan.takesOver ? personById(current, r.plan.takesOver.personId)?.name : undefined;
      const reason = r.plan.violations.map((v) => v.message).join(' ') || `Allerede tildelt ${holder ?? 'en annen'} denne dagen.`;
      results.push({ cell, outcome: 'skipped', reason });
      continue;
    }
    current = r.state;
    results.push({ cell, outcome: old ? 'replace' : 'set', ...(old ? { replaced: old } : {}) });
  }
  const appliedCount = results.filter((r) => r.outcome !== 'skipped').length;
  return { state: current, results, appliedCount, uncovered: coverageEffects(state, current, cells.map((c) => c.date), today) };
}

// ---------------------------------------------------------------------------
// Regler: statuskatalog, bemanningsbehov og fordelingsvekter
// ---------------------------------------------------------------------------

export interface CoverageChange {
  date: IsoDate;
  statusId: string;
  required: number;
  missingBefore: number;
  missingAfter: number;
}

export interface PresenceChange {
  personId: string;
  date: IsoDate;
  before: Presence;
  after: Presence;
}

export interface RuleImpact {
  /** Fremtidige registreringer som var gyldige og blir ugyldige. */
  newlyInvalid: { entry: CalendarEntry; reasons: string[] }[];
  /** Fremtidige registreringer som var ugyldige og blir gyldige. */
  newlyValid: CalendarEntry[];
  /** Dager og statuser der antallet udekkede plasser endres. */
  coverage: CoverageChange[];
  /** Personer og dager der tilstedeværelsen endres (f.eks. når en status bytter kategori). */
  presence: PresenceChange[];
  /** Siste dag som er vurdert. */
  horizon: IsoDate;
}

/** Hvor langt frem virkningen av en regelendring beregnes uten registreringer lenger frem. */
export const IMPACT_MIN_DAYS = 365;

/**
 * Virkningen av en regelendring fra og med `from` (i dag): registreringer som
 * blir ugyldige eller gyldige, endret vaktdekning og endret tilstedeværelse.
 * Registreringene endres ikke, og dager før `from` vurderes fortsatt etter
 * reglene som gjaldt da (se `rulesForDate`).
 */
export function ruleImpact(before: PlannerState, afterRules: RuleSet, from: IsoDate): RuleImpact {
  const after: PlannerState = { ...before, rules: afterRules };
  const newlyInvalid: RuleImpact['newlyInvalid'] = [];
  const newlyValid: CalendarEntry[] = [];
  const presence: PresenceChange[] = [];
  let horizon = addDays(from, IMPACT_MIN_DAYS - 1);
  for (const e of before.entries) {
    if (e.date < from) continue;
    if (e.date > horizon) horizon = e.date;
    const was = entryProblems(before, e, from).length === 0;
    const problems = entryProblems(after, e, from);
    if (was && problems.length) newlyInvalid.push({ entry: e, reasons: problems.map((p) => p.message) });
    if (!was && problems.length === 0) newlyValid.push(e);
    const a = presenceOf(before, e.personId, e.date, from);
    const b = presenceOf(after, e.personId, e.date, from);
    if (a !== b) presence.push({ personId: e.personId, date: e.date, before: a, after: b });
  }
  const coverage: CoverageChange[] = [];
  for (let d = from; d <= horizon; d = addDays(d, 1)) {
    const was = new Map(dayCoverage(before, d, from).map((sl) => [sl.status.id, sl]));
    for (const sl of dayCoverage(after, d, from)) {
      const missingBefore = was.get(sl.status.id)?.missing ?? 0;
      was.delete(sl.status.id);
      if (missingBefore !== sl.missing) coverage.push({ date: d, statusId: sl.status.id, required: sl.required, missingBefore, missingAfter: sl.missing });
    }
    // Bemanningskrav som faller bort helt.
    for (const sl of was.values()) if (sl.missing) coverage.push({ date: d, statusId: sl.status.id, required: 0, missingBefore: sl.missing, missingAfter: 0 });
  }
  return { newlyInvalid, newlyValid, coverage, presence, horizon };
}

const EXEMPTIONS = new Set(['always', 'administrative']);
const HOLIDAY_CALENDARS = new Set(['no', 'none']);
/** Ikon- og tonenøkler oversettes av brukergrensesnittet (P3); her kontrolleres bare formen. */
const KEY = /^[a-zA-Z][a-zA-Z0-9-]{0,39}$/;

/** Feil i visningsgruppene og arbeidskalenderen i et regelsett. */
function layoutErrors(rules: RuleSet): string[] {
  const errors: string[] = [];
  if (!rules.groups.length) errors.push('Oppsettet mangler visningsgrupper.');
  const groupIds = new Set<string>();
  for (const g of rules.groups) {
    if (!g.id.trim() || !g.name.trim()) errors.push('En visningsgruppe mangler ID eller navn.');
    if (groupIds.has(g.id)) errors.push(`Visningsgruppen «${g.id}» finnes flere ganger.`);
    groupIds.add(g.id);
  }
  for (const s of rules.statuses) if (!groupIds.has(s.group)) errors.push(`«${s.name}» har ukjent visningsgruppe.`);
  const cal = rules.workCalendar;
  if (cal) {
    if (cal.weekdays.length !== 7 || cal.weekdays.some((w) => typeof w !== 'boolean')) errors.push('Arbeidskalenderen må si for hver ukedag om den er arbeidsdag.');
    if (typeof cal.holidays !== 'boolean') errors.push('Arbeidskalenderen må si om helligdager er arbeidsdager.');
    if (cal.holidayCalendar !== undefined && !HOLIDAY_CALENDARS.has(cal.holidayCalendar)) errors.push('Ukjent helligdagskalender.');
  }
  return errors;
}

export function validateRules(rules: RuleSet): string[] {
  const errors: string[] = layoutErrors(rules);
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const s of rules.statuses) {
    if (!s.id.trim()) errors.push('En status mangler ID.');
    if (ids.has(s.id)) errors.push(`Status-ID-en «${s.id}» finnes flere ganger.`);
    ids.add(s.id);
    if (!s.name.trim()) errors.push('En status mangler navn.');
    const n = s.name.trim().toLowerCase();
    if (names.has(n)) errors.push(`Navnet «${s.name}» er brukt flere ganger.`);
    names.add(n);
    if (typeof s.present !== 'boolean') errors.push(`«${s.name}» må si om statusen regnes som fysisk til stede.`);
    if (!KEY.test(s.icon)) errors.push(`«${s.name}» har ukjent ikon.`);
    if (!KEY.test(s.tone)) errors.push(`«${s.name}» har ukjent farge.`);
    // Hard garanti: en vakttype krever fysisk tilstedeværelse (A-STA-09).
    if (s.uniquePerDay && !s.present) errors.push(`«${s.name}» er én per dag og må regnes som fysisk til stede.`);
    if (s.dutyExemption !== undefined && !EXEMPTIONS.has(s.dutyExemption)) errors.push(`«${s.name}» har ukjent vaktfritak.`);
    // En vakt kan aldri samtidig være vaktfritak.
    if (s.dutyExemption && (s.uniquePerDay || rules.staffing.some((r) => r.statusId === s.id))) errors.push(`«${s.name}» bemannes og kan ikke gi vaktfritak.`);
  }
  for (const s of rules.staffing) {
    const def = rules.statuses.find((x) => x.id === s.statusId);
    if (!def) {
      errors.push('Et bemanningsbehov viser til en status som ikke finnes.');
      continue;
    }
    // Fravær skal aldri kunne gi gyldig bemanning: alt som bemannes, regnes som fysisk til stede (A-STA-09).
    if (!def.present) errors.push(`«${def.name}» brukes i bemanningsbehov og må regnes som fysisk til stede.`);
    const max = def.uniquePerDay ? 1 : 20;
    if (s.perWeekday.length !== 7 || s.perWeekday.some((n) => !Number.isInteger(n) || n < 0 || n > max)) errors.push(`Bemanningsbehovet for «${def.name}» må være hele tall mellom 0 og ${max}.`);
    // Et behov på en dag som ikke er arbeidsdag, kunne aldri dekkes: statuser som er til stede, gjelder bare arbeidsdager.
    const cal = workCalendarOf(rules);
    if (s.perWeekday.some((n, i) => n > 0 && cal.weekdays[i] === false)) errors.push(`Bemanningsbehovet for «${def.name}» gjelder en ukedag som ikke er arbeidsdag i arbeidskalenderen.`);
    if (s.onHolidays && !cal.holidays && cal.holidayCalendar !== 'none') errors.push(`Bemanningsbehovet for «${def.name}» gjelder helligdager, men helligdager er ikke arbeidsdager i arbeidskalenderen.`);
    if (Object.values(s.categoryWeights ?? {}).some((w) => !(Number.isFinite(w) && w >= 0 && w <= 10))) errors.push('Rollevekter må være tall mellom 0 og 10.');
    if (s.load !== undefined && !(Number.isFinite(s.load) && s.load >= 0.1 && s.load <= 10)) errors.push('Belastning må være et tall mellom 0,1 og 10.');
  }
  if (new Set(rules.staffing.map((s) => s.statusId)).size !== rules.staffing.length) errors.push('Samme status har flere bemanningsbehov.');
  const a = rules.allocation;
  if (a) {
    for (const [key, v] of Object.entries(a)) {
      if (!(key in DEFAULT_ALLOCATION)) errors.push(`Ukjent innstilling i vaktfordelingen: ${key}.`);
      else if (isAllocationLimitedField(key)) {
        const { min, max, label, unit } = ALLOCATION_FIELD_LIMITS[key];
        if (!Number.isInteger(v) || v < min || v > max) errors.push(`${label} må være mellom ${min} og ${max} ${unit === 'prosent' ? '%' : 'dager'}.`);
      } else if (!(Number.isFinite(v) && v >= 0 && v <= 100)) errors.push('Vektene i vaktfordelingen må være tall mellom 0 og 100.');
    }
  }
  return [...new Set(errors)];
}

/** Statuser i bruk (registreringer, kvalifikasjoner) som et regelutkast ikke lenger har. */
export function removedStatusErrors(state: PlannerState, next: RuleSet): string[] {
  const kept = new Set(next.statuses.map((s) => s.id));
  const used = new Set([...state.entries.map((e) => e.statusId), ...state.people.flatMap((p) => p.qualifications)]);
  return state.rules.statuses.filter((s) => !kept.has(s.id) && used.has(s.id)).map((s) => `«${s.name}» er i bruk og kan ikke fjernes.`);
}

/**
 * Lagre et nytt regelsett. Det gjelder fra og med i dag; det forrige
 * regelsettet tas vare på. Regelversjonen øker og gjenbrukes aldri, heller
 * ikke etter angre.
 */
export function commitRules(state: PlannerState, role: Role, next: RuleSet, today: IsoDate = todayIn(state.unit.timeZone)): PlannerState {
  assertCan(role, 'editRules');
  const errors = [...validateRules(next), ...removedStatusErrors(state, next)];
  if (errors.length) throw new DomainError(errors.join(' '));
  const version = Math.max(state.ruleVersionSeq, state.rules.version) + 1;
  // Alle tidligere versjoner beholdes, også flere fra samme dag, slik at
  // regelversjonen på hver registrering alltid kan slås opp.
  return {
    ...state,
    rules: { ...next, version, effectiveFrom: today },
    ruleVersions: [...state.ruleVersions, state.rules],
    ruleVersionSeq: version,
  };
}

/**
 * Ved angre og gjør om: tilstanden det hoppes til, men med telleren for
 * regelversjoner fra den nyeste tilstanden, slik at et versjonsnummer aldri
 * får to betydninger.
 */
export function carryRuleVersionSeq(target: PlannerState, current: PlannerState): PlannerState {
  const seq = Math.max(target.ruleVersionSeq, current.ruleVersionSeq);
  return seq === target.ruleVersionSeq ? target : { ...target, ruleVersionSeq: seq };
}

/** Sett et bemanningsbehov. Raden beholder plassen sin; også en rad med bare nuller beholdes. */
export function setStaffing(rules: RuleSet, req: StaffingRequirement): RuleSet {
  const exists = rules.staffing.some((s) => s.statusId === req.statusId);
  return { ...rules, staffing: exists ? rules.staffing.map((s) => (s.statusId === req.statusId ? req : s)) : [...rules.staffing, req] };
}

export function removeStaffing(rules: RuleSet, statusId: string): RuleSet {
  return { ...rules, staffing: rules.staffing.filter((s) => s.statusId !== statusId) };
}

/** Statuser som kan få bemanningsbehov: aktive statuser som regnes som fysisk til stede og ikke gir vaktfritak. */
export function staffableStatuses(rules: RuleSet): StatusDefinition[] {
  return rules.statuses.filter((s) => s.active && s.present && !s.dutyExemption);
}

// ---------------------------------------------------------------------------
// Medarbeidere
// ---------------------------------------------------------------------------

export function validatePerson(person: Person, state: PlannerState): string[] {
  const errors: string[] = [];
  if (!person.name.trim()) errors.push('Navn mangler.');
  if (/\d{4,}/.test(person.name)) errors.push('Navnet kan ikke inneholde tallrekker.');
  if (!state.categories.some((c) => c.id === person.categoryId)) errors.push('Ukjent stillingskategori.');
  return [...new Set(errors)];
}

/**
 * Lagre en medarbeider. Endringen gjelder fra og med i dag; listen slik den
 * var, tas vare på for dagene før, slik at f.eks. en deaktivering eller et
 * endret kvalifikasjon ikke gjør tidligere vakter ugyldige.
 */
export function upsertPerson(state: PlannerState, role: Role, person: Person, today: IsoDate = todayIn(state.unit.timeZone)): PlannerState {
  assertCan(role, 'editPeople');
  const errors = validatePerson(person, state);
  if (errors.length) throw new DomainError(errors.join(' '));
  const exists = state.people.some((p) => p.id === person.id);
  const people = exists ? state.people.map((p) => (p.id === person.id ? person : p)) : [...state.people, person];
  // En liste som ble innført i dag, har aldri gjeldt for en tidligere dag.
  const keepCurrent = state.peopleFrom < today;
  return {
    ...state,
    people,
    peopleFrom: today,
    peopleHistory: keepCurrent ? [...state.peopleHistory, { effectiveFrom: state.peopleFrom, people: state.people }] : state.peopleHistory,
  };
}
