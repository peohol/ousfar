import { expect } from 'vitest';
import './hjelp';
import { defaultRuleSet, GROUP_IDS, RULES_EPOCH, STATUS_IDS as S } from '@delt/personal/catalog';
import { setStatus } from '@delt/personal/commands';
import type { EntryDraft } from '@delt/personal/rules';
import { CATEGORIES, TEST_UNIT } from './seed';
import { eachDay, isWeekend } from '@delt/personal/dates';
import type { CalendarEntry, IsoDate, Person, PlannerState, StaffingRequirement, StatusDefinition } from '@delt/personal/types';

/** Felles syntetiske testdata for testene av personaldomenet (oppdiktede navn). */

export function makeState(): PlannerState {
  return {
    unit: { ...TEST_UNIT, id: 'u', name: 'Testenhet' },
    categories: structuredClone(CATEGORIES),
    people: [
      { id: 'f1', name: 'Kari Prøvesen', categoryId: 'lis', qualifications: [S.duty1, S.duty2], active: true },
      { id: 'f2', name: 'Ola Testmann', categoryId: 'overlege', qualifications: [S.duty2], active: true },
      { id: 'f3', name: 'Siri Eksempel', categoryId: 'lis', qualifications: [], active: true },
      { id: 'f4', name: 'Per Hansen', categoryId: 'lis', qualifications: [S.duty1, S.duty2], active: true },
      { id: 'f5', name: 'Lise Fiktiv', categoryId: 'overlege', qualifications: [S.duty1, S.duty2], active: true },
    ],
    rules: defaultRuleSet(),
    ruleVersions: [],
    ruleVersionSeq: 1,
    peopleFrom: RULES_EPOCH,
    peopleHistory: [],
    dutyShares: {},
    entries: [],
  };
}

export function d(personId: string, date: string, statusId: string, extra: Partial<EntryDraft> = {}): EntryDraft {
  return { personId, date, statusId, ...extra };
}

/** Gi en status og krev at den lagres. `takeOver` tar over en vakt fra en annen. */
export function added(state: PlannerState, dr: EntryDraft, takeOver = false): PlannerState {
  const r = setStatus(state, 'planner', dr, { takeOver });
  expect(r.plan.violations).toEqual([]);
  expect(r.applied).toBe(true);
  return r.state;
}

export function newStatus(id: string, extra: Partial<StatusDefinition> = {}): StatusDefinition {
  return { id, name: `Ny ${id}`, group: GROUP_IDS.present, present: true, icon: 'circle', tone: 'slate', uniquePerDay: false, requiresQualification: false, active: true, ...extra };
}

/** En syntetisk medarbeider, kvalifisert for begge vaktene med mindre annet er oppgitt. */
export const person = (id: string, categoryId: string, qualifications: string[] = [S.duty1, S.duty2]): Person => ({ id, name: `Person ${id}`, categoryId, qualifications, active: true });

/** Hverdagene i tidsrommet (lørdag og søndag tatt ut; helligdager er med). */
export const workdays = (from: IsoDate, to: IsoDate): IsoDate[] => eachDay(from, to).filter((x) => !isWeekend(x));

/** Bare de oppgitte vakttypene har bemanningsbehov; de andre settes til null. */
export function onlyDuties(s: PlannerState, statusIds: string[]): PlannerState {
  const keep = new Set(statusIds);
  return { ...s, rules: { ...s.rules, staffing: s.rules.staffing.map((r) => (keep.has(r.statusId) ? r : { ...r, perWeekday: r.perWeekday.map(() => 0) as StaffingRequirement['perWeekday'] })) } };
}

/**
 * Tidligere vakter av én type, én per dag, fordelt jevnt utover dagene med
 * `counts` per person (summen er antall dager). Legges inn direkte, som
 * historikk.
 */
export function withHistory(s: PlannerState, statusId: string, counts: [string, number][], days: IsoDate[]): PlannerState {
  const order = counts.flatMap(([id, n]) => Array.from({ length: n }, (_, i) => ({ id, at: (i + 0.5) / n }))).sort((a, b) => a.at - b.at || a.id.localeCompare(b.id));
  expect(order).toHaveLength(days.length);
  const entries = order.map(({ id }, k): CalendarEntry => ({ id: `h-${statusId}-${days[k]}`, personId: id, date: days[k]!, statusId, ruleVersion: 1 }));
  return { ...s, entries: [...s.entries, ...entries] };
}

