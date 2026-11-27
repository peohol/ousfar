import { describe, expect, it } from 'vitest';
import './hjelp';
import { added, d } from './fixtures';
import { createPostState, POST_IDS as P, postRules } from './annetFagmiljo';
import { defaultRuleSet, statusesByGroup } from '@delt/personal/catalog';
import { assertInvariants, commitRules, DomainError, setStatus, upsertPerson, validateRules } from '@delt/personal/commands';
import { eachDay, holidayName, weekdayIndex } from '@delt/personal/dates';
import { analyzeDateMove, commitDateMove } from '@delt/personal/move';
import { dayKind, isScheduledWorkday } from '@delt/personal/people';
import { dayCoverage, entryAt, entryProblems, isDutyExempt, presenceOf, requiredCount } from '@delt/personal/rules';
import { acceptProposal, proposeAllocation, setEntryLocked } from '@delt/personal/allocation/proposal';
import type { PlannerState } from '@delt/personal/types';

/**
 * K-KON-2 (docs/personal.md §8.6, akseptmatrisen A-UX-06): et annet
 * syntetisk fagmiljø med andre navn, tre kategorier, andre oppgaver, en
 * arbeidskalender med helg og helligdager og mer enn én person per oppgave og
 * dag virker uten endring i motoren. Oppsettet står i `annetFagmiljo.ts`.
 */

const TODAY = '2026-11-24';
const SAT = '2026-12-05';
const CHRISTMAS = '2026-12-25';
const FROM = '2026-12-21';
const TO = '2027-01-03';

const slot = (s: PlannerState, date: string, statusId: string) => dayCoverage(s, date, TODAY).find((c) => c.status.id === statusId)!;

describe('oppsettet', () => {
  it('er gyldig og kan lagres av lokal administrator uten endring i motoren', () => {
    const s = createPostState();
    expect(validateRules(s.rules)).toEqual([]);
    expect(commitRules(s, 'localAdmin', { ...s.rules, statuses: s.rules.statuses.map((x) => (x.id === P.secondment ? { ...x, name: 'Hospitering ute' } : x)) }, TODAY).rules.version).toBe(2);
  });

  it('har egne visningsgrupper og egne fremhevede oppgaver, og piloten berøres ikke', () => {
    const s = createPostState();
    expect(statusesByGroup(s.rules).map((g) => [g.group.name, g.items.map((x) => x.name)])).toEqual([
      ['På posten', ['Medisinansvar', 'Teamleder']],
      ['Ute', ['Hospitering']],
      ['Ikke på jobb', ['Permisjon', 'Ikke til stede']],
    ]);
    expect(s.rules.statuses.filter((x) => x.highlighted).map((x) => x.id)).toEqual([P.medication, P.teamLead]);
    expect(defaultRuleSet().statuses.map((x) => x.id)).not.toContain(P.medication);
    expect(s.categories).toHaveLength(3);
  });

  it('helg og helligdager er arbeidsdager med bemanningsbehov', () => {
    const s = createPostState();
    for (const date of [SAT, CHRISTMAS]) {
      expect(dayKind(s.people[0]!, date, s.rules)).toBe('work');
      expect(isScheduledWorkday(s.people[0]!, date, s.rules)).toBe(true);
      expect(requiredCount(s.rules, P.medication, date)).toBe(2);
      expect(requiredCount(s.rules, P.teamLead, date)).toBe(1);
      expect(presenceOf(s, 'q1', date, TODAY)).toBe('present');
    }
  });
});

describe('flere personer per oppgave og dag', () => {
  it('to med medisinansvar dekker behovet; en tredje avvises, uten lydløs overtakelse', () => {
    let s = added(createPostState(), d('q1', SAT, P.medication));
    expect(slot(s, SAT, P.medication)).toMatchObject({ required: 2, missing: 1 });
    s = added(s, d('q6', SAT, P.medication));
    expect(slot(s, SAT, P.medication)).toMatchObject({ missing: 0, surplus: 0 });
    const third = setStatus(s, 'planner', d('q7', SAT, P.medication), { today: TODAY, takeOver: true });
    expect(third.applied).toBe(false);
    expect(third.plan.violations.map((v) => v.code)).toEqual(['staffingFull']);
    expect(third.plan.takesOver).toBeUndefined();
    // Modellens faste krav stopper også en tredje som kommer utenom kommandoene.
    const forced: PlannerState = { ...s, entries: [...s.entries, { ...s.entries[0]!, id: 'x', personId: 'q7' }] };
    expect(() => assertInvariants(forced, [SAT], TODAY, s)).toThrow(DomainError);
    expect(s.entries.every((e) => entryProblems(s, e, TODAY).length === 0)).toBe(true);
  });

  it('teamleder er én per dag og krever kvalifikasjon, også i helgen', () => {
    const s = added(createPostState(), d('q1', SAT, P.teamLead));
    expect(setStatus(s, 'planner', d('q2', SAT, P.teamLead), { today: TODAY }).plan.takesOver?.personId).toBe('q1');
    expect(setStatus(s, 'planner', d('q8', SAT, P.teamLead), { today: TODAY }).plan.violations.map((v) => v.code)).toContain('notQualified');
  });

  it('permisjon gir alltid vaktfritak; Ikke til stede bare med administrativt fritak', () => {
    let s = added(createPostState(), d('q1', SAT, P.leave));
    s = added(s, d('q2', SAT, P.away));
    expect(isDutyExempt(s, entryAt(s, 'q1', SAT), TODAY)).toBe(true);
    expect(isDutyExempt(s, entryAt(s, 'q2', SAT), TODAY)).toBe(false);
  });

  it('i måneden velges en konkret motpart når medisinansvaret er fullt', () => {
    let s = added(createPostState(), d('q1', '2026-12-04', P.medication, { note: 'Morgen' }));
    s = added(added(s, d('q6', SAT, P.medication)), d('q7', SAT, P.medication));
    const a = analyzeDateMove(s, 'planner', entryAt(s, 'q1', '2026-12-04')!.id, SAT, TODAY);
    expect(a.counterparts.map((e) => e.personId).sort()).toEqual(['q6', 'q7']);
    const r = commitDateMove(s, 'planner', a.entry.id, SAT, 'swapDates', entryAt(s, 'q7', SAT)!.id, TODAY);
    expect(entryAt(r.state, 'q7', '2026-12-04')!.statusId).toBe(P.medication);
    expect(entryAt(r.state, 'q1', SAT)).toMatchObject({ statusId: P.medication, note: 'Morgen' });
    expect(entryAt(r.state, 'q6', SAT)!.statusId).toBe(P.medication);
  });
});

describe('vaktfordelingen i det andre fagmiljøet', () => {
  it('fordeler jul og nyttår med helg og helligdager: alt dekket, gyldig, bare kvalifiserte og ingen med to oppgaver samme dag', () => {
    const s = createPostState();
    const proposal = proposeAllocation(s, 'planner', { from: FROM, to: TO, mode: 'new' }, TODAY);
    expect(proposal.uncovered).toEqual([]);
    const next = acceptProposal(s, 'planner', proposal, TODAY);
    const days = eachDay(FROM, TO);
    for (const date of days) {
      expect(slot(next, date, P.medication)).toMatchObject({ required: 2, missing: 0 });
      expect(slot(next, date, P.teamLead)).toMatchObject({ required: 1, missing: 0 });
    }
    expect(next.entries.every((e) => entryProblems(next, e, TODAY).length === 0)).toBe(true);
    expect(next.entries.some((e) => weekdayIndex(e.date) >= 5)).toBe(true);
    expect(next.entries.filter((e) => ['q8', 'q9'].includes(e.personId))).toEqual([]);
    const cells = next.entries.map((e) => `${e.personId}|${e.date}`);
    expect(new Set(cells).size).toBe(cells.length);
  });

  it('rollevektene i oppsettet styrer fordelingen: sykepleiere får mer medisinansvar enn helsefagarbeidere', () => {
    const s = createPostState();
    const next = proposeAllocation(s, 'planner', { from: FROM, to: TO, mode: 'new' }, TODAY).state;
    const medication = (ids: string[]) => next.entries.filter((e) => e.statusId === P.medication && ids.includes(e.personId)).length / ids.length;
    expect(medication(['q4', 'q5'])).toBeGreaterThan(medication(['q6', 'q7']));
  });

  it('oppsettet endres bare som data: samme motor med en hverdagskalender gir ingen oppgaver i helg og på helligdager', () => {
    const rules = postRules();
    const weekdaysOnly: PlannerState = {
      ...createPostState(),
      rules: {
        ...rules,
        workCalendar: { weekdays: [true, true, true, true, true, false, false], holidays: false, holidayCalendar: 'no' },
        staffing: rules.staffing.map((r) => ({ ...r, perWeekday: r.perWeekday.map((n, i) => (i < 5 ? n : 0)) as typeof r.perWeekday, onHolidays: false })),
      },
    };
    expect(validateRules(weekdaysOnly.rules)).toEqual([]);
    const next = proposeAllocation(weekdaysOnly, 'planner', { from: FROM, to: TO, mode: 'new' }, TODAY).state;
    expect(next.entries.length).toBeGreaterThan(0);
    expect(next.entries.filter((e) => weekdayIndex(e.date) >= 5 || holidayName(e.date, 'no'))).toEqual([]);
  });
});

describe('bemanningsgrensen i fordelingssøket', () => {
  const D = '2026-12-02';
  const medicationOn = (s: PlannerState) => s.entries.filter((e) => e.date === D && e.statusId === P.medication);
  const withNeed = (s: PlannerState, n: number): PlannerState =>
    commitRules(s, 'localAdmin', { ...s.rules, staffing: s.rules.staffing.map((r) => (r.statusId === P.medication ? { ...r, perWeekday: [n, n, n, n, n, n, n] as typeof r.perWeekday } : r)) }, TODAY);

  it('en låst tildeling som er blitt ugyldig, tar plass: forslaget fyller bare den ene ledige plassen og kan lagres', () => {
    let s = added(createPostState(), d('q4', D, P.medication));
    s = setEntryLocked(s, 'planner', entryAt(s, 'q4', D)!.id, true);
    // Kvalifikasjonen fjernes etter låsingen: tildelingen står, men dekker ikke.
    s = upsertPerson(s, 'planner', { ...s.people.find((x) => x.id === 'q4')!, qualifications: [] }, TODAY);
    expect(slot(s, D, P.medication)).toMatchObject({ required: 2, missing: 2 });
    const p = proposeAllocation(s, 'planner', { from: D, to: D, mode: 'new' }, TODAY);
    expect(p.uncovered).toEqual([{ date: D, statusId: P.medication, reasons: [expect.stringContaining('Alle 2 plassene for medisinansvar er i bruk')] }]);
    const next = acceptProposal(s, 'planner', p, TODAY);
    expect(medicationOn(next)).toHaveLength(2);
    expect(entryAt(next, 'q4', D)).toMatchObject({ statusId: P.medication, locked: true });
    expect(slot(next, D, P.medication)).toMatchObject({ missing: 1 });
  });

  it('etter at behovet er senket fra 3 til 2, står de tre urørt: forslaget øker aldri overskuddet og kan lagres', () => {
    let s = withNeed(createPostState(), 3);
    s = added(added(added(s, d('q1', D, P.medication)), d('q6', D, P.medication)), d('q7', D, P.medication));
    s = withNeed(s, 2);
    expect(slot(s, D, P.medication)).toMatchObject({ required: 2, surplus: 1 });
    for (const mode of ['new', 'repair'] as const) {
      const p = proposeAllocation(s, 'planner', { from: D, to: D, mode }, TODAY);
      expect(p.uncovered).toEqual([]);
      const next = acceptProposal(s, 'planner', p, TODAY);
      expect(medicationOn(next).map((e) => e.personId).sort()).toEqual(['q1', 'q6', 'q7']);
      expect(() => assertInvariants(next, [D], TODAY, s)).not.toThrow();
    }
  });

  it('negativt: et forslag gir aldri flere enn behovet, heller ikke over flere dager med ledige folk', () => {
    const s = createPostState();
    const next = acceptProposal(s, 'planner', proposeAllocation(s, 'planner', { from: FROM, to: TO, mode: 'new' }, TODAY), TODAY);
    for (const date of eachDay(FROM, TO)) {
      expect(next.entries.filter((e) => e.date === date && e.statusId === P.medication)).toHaveLength(2);
      expect(next.entries.filter((e) => e.date === date && e.statusId === P.teamLead)).toHaveLength(1);
    }
    // Alt som står fast, er med i grunnlaget, så forslaget kan lagres uten avvik.
    expect(() => assertInvariants(next, eachDay(FROM, TO), TODAY, s)).not.toThrow();
  });
});
