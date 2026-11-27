import { describe, expect, it } from 'vitest';
import './hjelp';
import { added, d, makeState, onlyDuties, person, withHistory, workdays } from './fixtures';
import { createPostState } from './annetFagmiljo';
import { STATUS_IDS as S } from '@delt/personal/catalog';
import { commitRules, DomainError, setExemption, upsertPerson, validateRules } from '@delt/personal/commands';
import { calendarView } from '@delt/personal/permissions';
import { entryAt, presenceOf } from '@delt/personal/rules';
import { proposeAllocation, proposalView } from '@delt/personal/allocation/proposal';
import { workload } from '@delt/personal/allocation/workload';
import type { PlannerState, RuleSet } from '@delt/personal/types';

/**
 * Regresjonstester for funnene i den automatiske kontrollen av P2a
 * (PR #612). «I dag» er tirsdag 24.11.2026. Bare syntetiske medarbeidere.
 */

const TODAY = '2026-11-24';
const FUTURE = '2026-12-01';

describe('administrativt vaktfritak i lesemodellen for kalender og forslag', () => {
  /** Kari Prøvesen er Borte med innvilget fritak 1.12., og et forslag fordeler desember. */
  function withProposal() {
    let s = added(makeState(), d('f1', FUTURE, S.away));
    s = setExemption(s, 'localAdmin', entryAt(s, 'f1', FUTURE)!.id, true, TODAY);
    return { s, p: proposeAllocation(s, 'planner', { from: FUTURE, to: '2026-12-11', mode: 'new' }, TODAY) };
  }
  const hasExempt = (value: unknown) => JSON.stringify(value).includes('"exempt"');

  it('negativt: vaktplanansvarlig og leser får forslaget og kalenderen uten fritak og uten tall som avhenger av det', () => {
    const { s, p } = withProposal();
    expect(hasExempt(p.state)).toBe(true);
    for (const role of ['planner', 'reader'] as const) {
      const view = proposalView(p, role);
      expect(hasExempt(view)).toBe(false);
      expect(view.fairness).toBeNull();
      for (const key of ['base', 'fingerprint', 'problem', 'solution']) expect(view).not.toHaveProperty(key);
      expect(hasExempt(calendarView(s, role))).toBe(false);
      // Borte står fortsatt; bare fritaket er skjult.
      expect(entryAt(view.state, 'f1', FUTURE)!.statusId).toBe(S.away);
    }
  });

  it('lokal administrator ser fritaket og tallene', () => {
    const { s, p } = withProposal();
    const view = proposalView(p, 'localAdmin');
    expect(entryAt(view.state, 'f1', FUTURE)!.exempt).toBe(true);
    expect(view.fairness).toEqual(p.fairness);
    expect(calendarView(s, 'localAdmin')).toBe(s);
  });
});

describe('bemanningsbehov bare på arbeidsdager', () => {
  const withStaffing = (rules: RuleSet, change: Partial<RuleSet['staffing'][number]>): RuleSet => ({ ...rules, staffing: rules.staffing.map((r) => (r.statusId === S.duty1 ? { ...r, ...change } : r)) });

  it('avviser behov på en ukedag eller helligdag som ikke er arbeidsdag, så behovet aldri blir umulig å dekke', () => {
    const s = makeState();
    const saturday = withStaffing(s.rules, { perWeekday: [1, 1, 1, 1, 1, 1, 0] });
    const holidays = withStaffing(s.rules, { onHolidays: true });
    expect(validateRules(saturday).join(' ')).toContain('ikke er arbeidsdag');
    expect(validateRules(holidays).join(' ')).toContain('helligdager er ikke arbeidsdager');
    for (const rules of [saturday, holidays]) expect(() => commitRules(s, 'localAdmin', rules, TODAY)).toThrow(DomainError);
  });

  it('godtar det samme behovet når arbeidskalenderen har helg og helligdager (det andre fagmiljøet)', () => {
    expect(validateRules(createPostState().rules)).toEqual([]);
  });
});

describe('tilstedeværelse for en medarbeider som ikke er aktiv', () => {
  it('er «off» også med en status som ikke er til stede', () => {
    let s = added(makeState(), d('f1', FUTURE, S.vacation));
    expect(presenceOf(s, 'f1', FUTURE, TODAY)).toBe('away');
    s = upsertPerson(s, 'planner', { ...s.people[0]!, active: false }, TODAY);
    expect(presenceOf(s, 'f1', FUTURE, TODAY)).toBe('off');
  });
});

describe('belastningsoversikten for et tidligere tidsrom', () => {
  it('beholder en vakttype som hadde bemanningsbehov da, selv om behovet er fjernet i dag', () => {
    const past = workdays('2026-10-26', '2026-11-20');
    const s0: PlannerState = withHistory(onlyDuties({ ...makeState(), people: [person('a', 'lis'), person('b', 'lis')] }, [S.duty1]), S.duty1, [['a', 12], ['b', 8]], past);
    const s1 = commitRules(s0, 'localAdmin', { ...s0.rules, staffing: [] }, TODAY);
    const w = workload(s1, past[0]!, past[past.length - 1]!, TODAY);
    const duty1 = w.types.find((t) => t.statusId === S.duty1)!;
    expect(duty1.rows.map((r) => [r.personId, r.before.count])).toEqual([['a', 12], ['b', 8]]);
    // Fremover har vakttypen ikke lenger bemanningsbehov.
    expect(workload(s1, FUTURE, '2026-12-31', TODAY).types).toEqual([]);
  });
});
