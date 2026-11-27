import { describe, expect, it } from 'vitest';
import './hjelp';
import { STATUS_IDS as S } from '@delt/personal/catalog';
import { assertInvariants, commitRules, DomainError, setStatus } from '@delt/personal/commands';
import type { PlannerState, RuleSet, StatusDefinition } from '@delt/personal/types';
import { createSeedState } from './seed';

/** Harde garantier som ikke skal kunne konfigureres bort. */

function base(): PlannerState {
  const s = createSeedState();
  // Tom kalender med én oppdiktet, kvalifisert person.
  return { ...s, entries: [], people: [{ id: 'x1', name: 'Kari Prøvesen', categoryId: 'lis', qualifications: [S.duty1, S.duty2], active: true }] };
}
const day = '2026-11-25';
const change = (r: RuleSet, id: string, patch: Partial<StatusDefinition>): RuleSet => ({ ...r, statuses: r.statuses.map((x) => (x.id === id ? { ...x, ...patch } : x)) });

describe('vakter og fravær i regelsettet', () => {
  it('en vakt må være en status på kontoret, så fravær aldri kan telle som vakt', () => {
    const s = base();
    expect(() => commitRules(s, 'localAdmin', change(s.rules, S.duty1, { group: 'fravaer', present: false }))).toThrow(DomainError);
  });
  it('bemanningsbehov kan bare gjelde statuser på kontoret, og en vakt høyst én per dag', () => {
    const s = base();
    expect(() => commitRules(s, 'localAdmin', { ...s.rules, staffing: [...s.rules.staffing, { statusId: S.away, perWeekday: [1, 1, 1, 1, 1, 0, 0], onHolidays: false }] })).toThrow(DomainError);
    expect(() => commitRules(s, 'localAdmin', { ...s.rules, staffing: s.rules.staffing.map((x) => ({ ...x, perWeekday: [2, 2, 2, 2, 2, 0, 0] as typeof x.perWeekday })) })).toThrow(DomainError);
  });
  it('navn og farge kan endres; endringen blir en ny regelversjon', () => {
    const s = base();
    const next = commitRules(s, 'localAdmin', change(s.rules, S.duty1, { name: 'Førstevakt', tone: 'teal' }));
    expect(next.rules.statuses.find((x) => x.id === S.duty1)!.name).toBe('Førstevakt');
    expect(next.rules.version).toBe(s.rules.version + 1);
  });
});

describe('én status per medarbeider per dag i datamodellen', () => {
  it('samme status to ganger samme dag gir fortsatt én registrering', () => {
    let s = base();
    s = setStatus(s, 'planner', { personId: 'x1', date: day, statusId: S.away }).state;
    s = setStatus(s, 'planner', { personId: 'x1', date: day, statusId: S.away, note: 'Kurs' }).state;
    expect(s.entries).toHaveLength(1);
  });
  it('en tilstand med to statuser i en celle kan ikke lagres av kommandoene', () => {
    const s: PlannerState = { ...base(), entries: [
      { id: 'a', personId: 'x1', date: day, statusId: S.referent, ruleVersion: 1 },
      { id: 'b', personId: 'x1', date: day, statusId: S.training, ruleVersion: 1 },
    ] };
    expect(() => assertInvariants(s, [day])).toThrow(DomainError);
  });
  it('to statuser i en celle eller samme vakt to ganger samme dag bryter invariantene (databasen får de samme kravene, P2b)', () => {
    const s = base();
    const two = { ...s, people: [...s.people, { ...s.people[0]!, id: 'x2', name: 'Ola Testmann' }] };
    const cell = { ...two, entries: [{ id: 'a', personId: 'x1', date: day, statusId: S.referent, ruleVersion: 1 }, { id: 'b', personId: 'x1', date: day, statusId: S.away, ruleVersion: 1 }] };
    const duty = { ...two, entries: [{ id: 'a', personId: 'x1', date: day, statusId: S.duty1, ruleVersion: 1 }, { id: 'b', personId: 'x2', date: day, statusId: S.duty1, ruleVersion: 1 }] };
    expect(() => assertInvariants(cell, [day])).toThrow(DomainError);
    expect(() => assertInvariants(duty, [day])).toThrow(DomainError);
    expect(() => assertInvariants(two, [day])).not.toThrow();
  });
});
