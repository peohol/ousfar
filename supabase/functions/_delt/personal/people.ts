import { workCalendarOf } from './catalog.ts';
import { holidayName, isWeekend, weekdayIndex } from './dates.ts';
import type { IsoDate, Person, RuleSet } from './types.ts';

/**
 * Planlagt tilstedeværelse. Det finnes ikke faste arbeidsmønstre: en aktiv
 * medarbeider regnes som planlagt til stede på fagmiljøets arbeidsdager
 * (arbeidskalenderen i regelsettet, B17), og fravær registreres med
 * statuser, også ordinære arbeidsfrie dager ved deltid (Borte uten fritak).
 */

export type DayKind = 'work' | 'weekend' | 'nonWorkday' | 'holiday' | 'inactive' | 'unregistered';

/**
 * Hva dagen er for personen etter arbeidskalenderen i regelsettet som gjaldt
 * datoen. `undefined` betyr at personen ikke fantes i medarbeiderlisten som
 * gjaldt datoen (f.eks. før vedkommende ble lagt inn). `weekend` er lørdag
 * eller søndag uten arbeid, `nonWorkday` en annen ukedag uten arbeid.
 */
export function dayKind(person: Person | undefined, date: IsoDate, rules: RuleSet): DayKind {
  if (!person) return 'unregistered';
  if (!person.active) return 'inactive';
  const calendar = workCalendarOf(rules);
  if (!calendar.holidays && holidayName(date, calendar.holidayCalendar ?? 'no')) return 'holiday';
  if (calendar.weekdays[weekdayIndex(date)]) return 'work';
  return isWeekend(date) ? 'weekend' : 'nonWorkday';
}

/** Dagen ligger utenfor perioden personen var aktiv medarbeider (før, etter eller i et opphold). */
export function outsideEmployment(kind: DayKind): boolean {
  return kind === 'inactive' || kind === 'unregistered';
}

export function isScheduledWorkday(person: Person, date: IsoDate, rules: RuleSet): boolean {
  return dayKind(person, date, rules) === 'work';
}

export const DAY_KIND_LABELS: Record<DayKind, string> = {
  work: 'Arbeidsdag',
  weekend: 'Helg',
  nonWorkday: 'Ikke arbeidsdag',
  holiday: 'Helligdag',
  inactive: 'Ikke aktiv',
  unregistered: 'Ikke registrert',
};
