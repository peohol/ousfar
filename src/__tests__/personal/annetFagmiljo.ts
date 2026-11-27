import { RULES_EPOCH } from '@delt/personal/catalog';
import type { Person, PlannerState, RuleSet, StaffCategory, StatusDefinition, Unit } from '@delt/personal/types';

/**
 * Et syntetisk andre fagmiljø for K-KON-2 (docs/personal.md §8.6): andre
 * navn, tre kategorier, andre oppgaver med mer enn én person per oppgave og
 * dag, egne visningsgrupper og en arbeidskalender med helg og helligdager.
 * Bare oppsett og data, ingen endring i motoren. Alle navn er oppdiktet.
 */

export const POST_IDS = {
  medication: 'medisinansvar',
  teamLead: 'teamleder',
  secondment: 'hospitering',
  leave: 'permisjon',
  away: 'ikke-til-stede',
} as const;

const P = POST_IDS;

export const POST_UNIT: Unit = { id: 'unit-post', name: 'Eksempelposten', workYearStartMonth: 7, timeZone: 'Europe/Oslo', hideWeekendsByDefault: false };

export const POST_CATEGORIES: StaffCategory[] = [
  { id: 'spl', name: 'Sykepleier', short: 'SPL' },
  { id: 'hfa', name: 'Helsefagarbeider', short: 'HFA' },
  { id: 'stud', name: 'Student', short: 'ST' },
];

const status = (s: Partial<StatusDefinition> & Pick<StatusDefinition, 'id' | 'name' | 'group' | 'present'>): StatusDefinition => ({
  icon: 'circle',
  tone: 'slate',
  uniquePerDay: false,
  requiresQualification: false,
  active: true,
  ...s,
});

export function postRules(): RuleSet {
  return {
    version: 1,
    effectiveFrom: RULES_EPOCH,
    groups: [
      { id: 'paa-posten', name: 'På posten' },
      { id: 'ute', name: 'Ute' },
      { id: 'ikke-paa-jobb', name: 'Ikke på jobb' },
    ],
    statuses: [
      status({ id: P.medication, name: 'Medisinansvar', group: 'paa-posten', present: true, highlighted: true, requiresQualification: true, icon: 'pill', tone: 'teal' }),
      status({ id: P.teamLead, name: 'Teamleder', group: 'paa-posten', present: true, highlighted: true, uniquePerDay: true, requiresQualification: true, icon: 'star', tone: 'amber' }),
      status({ id: P.secondment, name: 'Hospitering', group: 'ute', present: false, icon: 'route' }),
      status({ id: P.leave, name: 'Permisjon', group: 'ikke-paa-jobb', present: false, dutyExemption: 'always', icon: 'sun' }),
      status({ id: P.away, name: 'Ikke til stede', group: 'ikke-paa-jobb', present: false, dutyExemption: 'administrative', icon: 'cross', tone: 'red' }),
    ],
    staffing: [
      // To med medisinansvar hver dag, også i helger og på helligdager.
      { statusId: P.medication, perWeekday: [2, 2, 2, 2, 2, 2, 2], onHolidays: true, categoryWeights: { spl: 2, hfa: 1, stud: 0 } },
      { statusId: P.teamLead, perWeekday: [1, 1, 1, 1, 1, 1, 1], onHolidays: true, load: 1.5 },
    ],
    // Døgnbemannet post: alle dager er arbeidsdager, også helligdager.
    workCalendar: { weekdays: [true, true, true, true, true, true, true], holidays: true, holidayCalendar: 'no' },
  };
}

function postPeople(): Person[] {
  const p = (id: string, name: string, categoryId: string, qualifications: string[]): Person => ({ id, name, categoryId, qualifications, active: true });
  const both = [P.medication, P.teamLead];
  return [
    p('q1', 'Vilde Brekke', 'spl', both),
    p('q2', 'Sindre Moen', 'spl', both),
    p('q3', 'Hedda Lie', 'spl', both),
    p('q4', 'Kasper Ruud', 'spl', [P.medication]),
    p('q5', 'Selma Haugen', 'spl', [P.medication]),
    p('q6', 'Olav Næss', 'hfa', [P.medication]),
    p('q7', 'Tiril Bakke', 'hfa', [P.medication]),
    p('q8', 'Aron Fjeld', 'hfa', []),
    p('q9', 'Mina Sæther', 'stud', []),
  ];
}

export function createPostState(): PlannerState {
  const people = postPeople();
  return {
    unit: structuredClone(POST_UNIT),
    categories: structuredClone(POST_CATEGORIES),
    people,
    rules: postRules(),
    ruleVersions: [],
    ruleVersionSeq: 1,
    peopleFrom: RULES_EPOCH,
    peopleHistory: [],
    dutyShares: {},
    entries: [],
  };
}
