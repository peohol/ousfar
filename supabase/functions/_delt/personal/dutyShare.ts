import { DomainError, newId } from './commands.ts';
import { addDays, isIsoDate, todayIn } from './dates.ts';
import { assertCan } from './permissions.ts';
import type { DutySharePeriod, DutyShareSchedule, IsoDate, PlannerState, Role } from './types.ts';

/**
 * Individuell vaktandel (OUSFAR docs/personal.md §6.2): medarbeiderens
 * relative vaktbelastning i prosent, 100 % som standard. Den er uavhengig av
 * stillingsprosent og av tilgjengeligheten i kalenderen, og inngår i
 * fordelingsvekten (`expected.ts`):
 *
 *   vekt = stillingsvekt × vaktandel × fritaksfaktor
 *
 * - En ordinær vaktandel gjelder fra en dato og på ubestemt tid, til neste
 *   ordinære vaktandel.
 * - Midlertidige perioder (fra og til, begge med) har en annen vaktandel. De
 *   kan ikke overlappe hverandre. Etter perioden gjelder den ordinære
 *   vaktandelen som gjelder da.
 * - Endringer gjelder bare fra i dag og fremover. Vaktandelen for en tidligere
 *   dag endres aldri, så tidligere forventet vaktbelastning ikke skrives om.
 * - 0 % utelukker automatisk vakttildeling.
 */

export const DEFAULT_DUTY_SHARE = 100;
const EMPTY: DutyShareSchedule = { ordinary: [], temporary: [] };

/** Vaktandelen til en medarbeider over tid. Mangler den, gjelder 100 %. */
export function dutyScheduleOf(state: Pick<PlannerState, 'dutyShares'>, personId: string): DutyShareSchedule {
  return (Object.hasOwn(state.dutyShares, personId) ? state.dutyShares[personId] : undefined) ?? EMPTY;
}

/** Den ordinære vaktandelen på datoen, i prosent. */
export function ordinaryShareAt(schedule: DutyShareSchedule, date: IsoDate): number {
  let percent = DEFAULT_DUTY_SHARE;
  for (const o of schedule.ordinary) if (o.from <= date) percent = o.percent;
  return percent;
}

/** Den midlertidige perioden som gjelder datoen, hvis noen. */
export function temporaryAt(schedule: DutyShareSchedule, date: IsoDate): DutySharePeriod | undefined {
  return schedule.temporary.find((t) => t.from <= date && date <= t.to);
}

/** Vaktandelen på datoen, i prosent. */
export function dutySharePercentAt(schedule: DutyShareSchedule, date: IsoDate): number {
  return temporaryAt(schedule, date)?.percent ?? ordinaryShareAt(schedule, date);
}

/** Vaktandelen til en medarbeider på datoen, som brøk mellom 0 og 1. */
export function dutyShareAt(state: Pick<PlannerState, 'dutyShares'>, personId: string, date: IsoDate): number {
  return dutySharePercentAt(dutyScheduleOf(state, personId), date) / 100;
}

/** Et sammenhengende tidsrom med samme vaktandel. `to` utelatt = på ubestemt tid. */
export interface DutyShareSegment {
  from: IsoDate;
  to?: IsoDate;
  percent: number;
  /** Den midlertidige perioden segmentet hører til, eller utelatt for ordinær vaktandel. */
  temporaryId?: string;
}

/** Datoene der vaktandelen kan endre seg (første dag med ny verdi), sortert. */
function breakpoints(schedule: DutyShareSchedule): IsoDate[] {
  const dates = new Set<IsoDate>();
  for (const o of schedule.ordinary) dates.add(o.from);
  for (const t of schedule.temporary) {
    dates.add(t.from);
    dates.add(addDays(t.to, 1));
  }
  return [...dates].sort();
}

/**
 * Vaktandelen som tidslinje, fra og med `from` (og eventuelt til og med
 * `to`), med tidligere, gjeldende og fremtidige verdier. Brukes i
 * innstillingene og i oversikten over vaktbelastning.
 */
export function dutyShareTimeline(schedule: DutyShareSchedule, from: IsoDate, to?: IsoDate): DutyShareSegment[] {
  const out: DutyShareSegment[] = [];
  const points = [from, ...breakpoints(schedule).filter((d) => d > from && (!to || d <= to))];
  points.forEach((start, k) => {
    const next = points[k + 1];
    const end = next ? addDays(next, -1) : to;
    const tmp = temporaryAt(schedule, start);
    const percent = tmp?.percent ?? ordinaryShareAt(schedule, start);
    const last = out[out.length - 1];
    if (last && last.percent === percent && last.temporaryId === tmp?.id) {
      if (end) last.to = end;
      else delete last.to;
      return;
    }
    out.push({ from: start, ...(end ? { to: end } : {}), percent, ...(tmp ? { temporaryId: tmp.id } : {}) });
  });
  return out;
}

/** Den første dagen tidslinjen trenger for å vise hele historikken. */
export function scheduleStart(schedule: DutyShareSchedule, fallback: IsoDate): IsoDate {
  const first = breakpoints(schedule)[0];
  return first && first < fallback ? first : fallback;
}

const isPercent = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100;

/** Feil i en tidsplan for vaktandel. Tom liste betyr at den er gyldig. */
export function validateDutySchedule(schedule: DutyShareSchedule): string[] {
  const errors: string[] = [];
  let last = '';
  for (const o of schedule.ordinary) {
    if (!isIsoDate(o.from)) errors.push('En ordinær vaktandel mangler gyldig dato.');
    else if (o.from <= last) errors.push('To ordinære vaktandeler kan ikke gjelde fra samme dato.');
    last = o.from;
    if (!isPercent(o.percent)) errors.push('Vaktandelen må være et helt tall mellom 0 og 100 %.');
  }
  const ids = new Set<string>();
  const periods = [...schedule.temporary].sort((a, b) => a.from.localeCompare(b.from));
  periods.forEach((t, i) => {
    if (!t.id || ids.has(t.id)) errors.push('En midlertidig periode mangler en entydig ID.');
    ids.add(t.id);
    if (!isIsoDate(t.from) || !isIsoDate(t.to)) errors.push('En midlertidig periode mangler gyldige datoer.');
    else if (t.to < t.from) errors.push('Tildatoen må være på eller etter fradatoen.');
    if (!isPercent(t.percent)) errors.push('Vaktandelen må være et helt tall mellom 0 og 100 %.');
    const prev = periods[i - 1];
    if (prev && t.from <= prev.to) errors.push('Midlertidige perioder kan ikke overlappe hverandre.');
  });
  return [...new Set(errors)];
}

/**
 * Endrer den nye tidsplanen vaktandelen for en dag før i dag? Begge er
 * stykkevis konstante, så det holder å sammenligne i startpunktet og i hvert
 * punkt der en av dem kan endre seg.
 */
export function changesPast(before: DutyShareSchedule, after: DutyShareSchedule, today: IsoDate): boolean {
  const points = new Set(['0000-01-01', ...breakpoints(before), ...breakpoints(after)].filter((d) => d < today));
  return [...points].some((d) => dutySharePercentAt(before, d) !== dutySharePercentAt(after, d));
}

/**
 * Endrer overgangen fra én tilstand til en annen vaktandelen for en dag før i
 * dag, for noen medarbeider? Kontrolleres for hver lagret endring og ved
 * angre og gjør om, som ellers kunne gjenopprette en vaktandel for en dag som
 * har passert siden endringen ble gjort (f.eks. når appen står åpen over
 * midnatt). `today` skal være datoen når overgangen utføres.
 */
export function dutySharesChangePast(before: Pick<PlannerState, 'dutyShares'>, after: Pick<PlannerState, 'dutyShares'>, today: IsoDate): boolean {
  if (before.dutyShares === after.dutyShares) return false;
  const ids = new Set([...Object.keys(before.dutyShares), ...Object.keys(after.dutyShares)]);
  return [...ids].some((id) => changesPast(dutyScheduleOf(before, id), dutyScheduleOf(after, id), today));
}

/** Forklaringen når angre eller gjør om ville endret vaktandelen for en tidligere dag. */
export const pastStepMessage = (direction: 'undo' | 'redo', label: string): string =>
  `«${label}» kan ikke ${direction === 'undo' ? 'angres' : 'gjøres om'} lenger: det ville endret vaktandelen for dager som har passert siden, og tidligere forventet vaktbelastning skrives ikke om. Gjør en ny endring fra i dag i stedet.`;

export const PAST_CHANGE_MESSAGE = 'Vaktandelen for tidligere dager kan ikke endres, så tidligere forventet vaktbelastning ikke skrives om. Velg en dato i dag eller senere.';

function commitSchedule(state: PlannerState, role: Role, personId: string, next: DutyShareSchedule, today: IsoDate): PlannerState {
  assertCan(role, 'editDutyShare');
  if (!state.people.some((p) => p.id === personId)) throw new DomainError('Ukjent medarbeider.');
  const errors = validateDutySchedule(next);
  if (errors.length) throw new DomainError(errors.join(' '));
  if (changesPast(dutyScheduleOf(state, personId), next, today)) throw new DomainError(PAST_CHANGE_MESSAGE);
  return { ...state, dutyShares: { ...state.dutyShares, [personId]: next } };
}

/**
 * Sett den ordinære vaktandelen fra og med en dato (i dag eller senere), på
 * ubestemt tid. Senere ordinære vaktandeler som allerede er lagt inn, beholdes.
 */
export function setOrdinaryDutyShare(state: PlannerState, role: Role, personId: string, from: IsoDate, percent: number, today: IsoDate = todayIn(state.unit.timeZone)): PlannerState {
  if (!isIsoDate(from)) throw new DomainError('Velg en gyldig dato.');
  if (from < today) throw new DomainError(PAST_CHANGE_MESSAGE);
  const s = dutyScheduleOf(state, personId);
  const ordinary = [...s.ordinary.filter((o) => o.from !== from), { from, percent }].sort((a, b) => a.from.localeCompare(b.from));
  return commitSchedule(state, role, personId, { ...s, ordinary }, today);
}

/** Fjern en fremtidig ordinær vaktandel. Den forrige gjelder da videre. */
export function removeOrdinaryDutyShare(state: PlannerState, role: Role, personId: string, from: IsoDate, today: IsoDate = todayIn(state.unit.timeZone)): PlannerState {
  const s = dutyScheduleOf(state, personId);
  if (!s.ordinary.some((o) => o.from === from)) throw new DomainError('Fant ikke vaktandelen.');
  return commitSchedule(state, role, personId, { ...s, ordinary: s.ordinary.filter((o) => o.from !== from) }, today);
}

/**
 * Legg til eller rediger en midlertidig periode (fra og til, begge med).
 * Perioder kan ikke overlappe, og dager før i dag kan ikke endres: en
 * pågående periode kan forlenges eller avsluttes tidligst i går.
 */
export function upsertTemporaryDutyShare(
  state: PlannerState,
  role: Role,
  personId: string,
  period: Omit<DutySharePeriod, 'id'> & { id?: string },
  today: IsoDate = todayIn(state.unit.timeZone),
): PlannerState {
  const s = dutyScheduleOf(state, personId);
  if (period.id && !s.temporary.some((t) => t.id === period.id)) throw new DomainError('Fant ikke perioden.');
  const item: DutySharePeriod = { id: period.id ?? newId('va'), from: period.from, to: period.to, percent: period.percent };
  const temporary = [...s.temporary.filter((t) => t.id !== item.id), item].sort((a, b) => a.from.localeCompare(b.from));
  return commitSchedule(state, role, personId, { ...s, temporary }, today);
}

/**
 * Fjern en midlertidig periode. En pågående periode kan ikke fjernes
 * bakover i tid; den avsluttes i går, så de tidligere dagene beholder sin
 * vaktandel. En avsluttet periode kan ikke fjernes.
 */
export function removeTemporaryDutyShare(state: PlannerState, role: Role, personId: string, periodId: string, today: IsoDate = todayIn(state.unit.timeZone)): PlannerState {
  const s = dutyScheduleOf(state, personId);
  const period = s.temporary.find((t) => t.id === periodId);
  if (!period) throw new DomainError('Fant ikke perioden.');
  if (period.to < today) throw new DomainError('En avsluttet periode kan ikke fjernes, så tidligere forventet vaktbelastning ikke skrives om.');
  const temporary =
    period.from < today ? s.temporary.map((t) => (t.id === periodId ? { ...t, to: addDays(today, -1) } : t)) : s.temporary.filter((t) => t.id !== periodId);
  return commitSchedule(state, role, personId, { ...s, temporary }, today);
}

/** Når perioden er i forhold til i dag. */
export function periodTense(p: { from: IsoDate; to?: IsoDate }, today: IsoDate): 'past' | 'current' | 'future' {
  if (p.to && p.to < today) return 'past';
  return p.from > today ? 'future' : 'current';
}
