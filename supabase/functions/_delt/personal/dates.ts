import type { HolidayCalendar, IsoDate, Minutes, TimeRange } from './types.ts';

/** Datoregning på ISO-datoer i UTC, slik at sommertid aldri flytter en dag. */

const DAY_MS = 86_400_000;

export function toUtc(date: IsoDate): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d));
}

export function fromUtc(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is IsoDate {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromUtc(toUtc(value)) === value;
}

const dayFormats = new Map<string, Intl.DateTimeFormat>();

/**
 * Datoen nå i en tidssone (IANA, f.eks. Europe/Oslo). Fagmiljøets «i dag»
 * regnes alltid slik, også på serveren, så midnatt og sommertid følger
 * fagmiljøet og ikke maskinens klokke.
 */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
  let format = dayFormats.get(timeZone);
  if (!format) {
    format = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
    dayFormats.set(timeZone, format);
  }
  const parts = format.formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function addDays(date: IsoDate, n: number): IsoDate {
  return fromUtc(new Date(toUtc(date).getTime() + n * DAY_MS));
}

export function diffDays(a: IsoDate, b: IsoDate): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / DAY_MS);
}

/** Ukedag med mandag = 0 … søndag = 6. */
export function weekdayIndex(date: IsoDate): number {
  return (toUtc(date).getUTCDay() + 6) % 7;
}

export function isWeekend(date: IsoDate): boolean {
  return weekdayIndex(date) >= 5;
}

export function startOfWeek(date: IsoDate): IsoDate {
  return addDays(date, -weekdayIndex(date));
}

export function startOfMonth(date: IsoDate): IsoDate {
  return `${date.slice(0, 7)}-01`;
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate();
}

export function endOfMonth(date: IsoDate): IsoDate {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  return `${date.slice(0, 7)}-${String(daysInMonth(y, m)).padStart(2, '0')}`;
}

/** Flytter n måneder og klemmer dagen til siste dag i målmåneden. */
export function addMonths(date: IsoDate, n: number): IsoDate {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7)) - 1 + n;
  const ty = y + Math.floor(m / 12);
  const tm = ((m % 12) + 12) % 12 + 1;
  const d = Math.min(Number(date.slice(8, 10)), daysInMonth(ty, tm));
  return `${ty}-${String(tm).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function eachDay(start: IsoDate, end: IsoDate): IsoDate[] {
  const out: IsoDate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) out.push(d);
  return out;
}

/** ISO 8601-ukenummer. */
export function isoWeek(date: IsoDate): number {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7));
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - firstThursday.getTime()) / DAY_MS - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

/** Arbeidsåret som inneholder datoen, gitt første måned i arbeidsåret. */
export function workYearRange(date: IsoDate, startMonth: number): { start: IsoDate; end: IsoDate; label: string } {
  const y = Number(date.slice(0, 4));
  const m = Number(date.slice(5, 7));
  const startYear = m >= startMonth ? y : y - 1;
  const start = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
  const end = addDays(addMonths(start, 12), -1);
  const label = startMonth === 1 ? String(startYear) : `${startYear}/${String(startYear + 1).slice(2)}`;
  return { start, end, label };
}

// ---------------------------------------------------------------------------
// Norske helligdager (beregnet, ingen eksterne data)
// ---------------------------------------------------------------------------

function easterSunday(year: number): IsoDate {
  // Anonym gregoriansk algoritme (Meeus/Jones/Butcher).
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const holidayCache = new Map<number, Map<IsoDate, string>>();

export function holidaysForYear(year: number): Map<IsoDate, string> {
  const cached = holidayCache.get(year);
  if (cached) return cached;
  const easter = easterSunday(year);
  const list: [IsoDate, string][] = [
    [`${year}-01-01`, 'Første nyttårsdag'],
    [addDays(easter, -3), 'Skjærtorsdag'],
    [addDays(easter, -2), 'Langfredag'],
    [easter, 'Første påskedag'],
    [addDays(easter, 1), 'Andre påskedag'],
    [`${year}-05-01`, 'Arbeidernes dag'],
    [`${year}-05-17`, 'Grunnlovsdagen'],
    [addDays(easter, 39), 'Kristi himmelfartsdag'],
    [addDays(easter, 49), 'Første pinsedag'],
    [addDays(easter, 50), 'Andre pinsedag'],
    [`${year}-12-25`, 'Første juledag'],
    [`${year}-12-26`, 'Andre juledag'],
  ];
  const map = new Map(list);
  holidayCache.set(year, map);
  return map;
}

/** Helligdagen datoen er i kalenderen, eller `undefined`. `none` har ingen helligdager. */
export function holidayName(date: IsoDate, calendar: HolidayCalendar): string | undefined {
  return calendar === 'no' ? holidaysForYear(Number(date.slice(0, 4))).get(date) : undefined;
}

// ---------------------------------------------------------------------------
// Klokkeslett
// ---------------------------------------------------------------------------

export const FULL_DAY: TimeRange = { start: 0, end: 1440 };

export function parseTime(value: string): Minutes | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 24 || min > 59 || (h === 24 && min > 0)) return null;
  return h * 60 + min;
}

export function formatTime(minutes: Minutes): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

export function formatRange(r: TimeRange): string {
  return `${formatTime(r.start)}–${formatTime(r.end)}`;
}

export function isValidRange(r: TimeRange): boolean {
  return Number.isInteger(r.start) && Number.isInteger(r.end) && r.start >= 0 && r.end <= 1440 && r.start < r.end;
}

/** Kort norsk dato (dd.mm.åååå) for meldinger fra domenet. */
export function formatDateNo(date: IsoDate): string {
  const [y, m, d] = date.split('-');
  return `${d}.${m}.${y}`;
}
