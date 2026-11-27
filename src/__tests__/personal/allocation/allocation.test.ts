import { describe, expect, it } from 'vitest';
import '../hjelp';
import { added, d, makeState, onlyDuties, person, withHistory as withHistoryOn, workdays } from '../fixtures';
import { DEFAULT_ALLOCATION, DEFAULT_STATUSES, STATUS_IDS as S } from '@delt/personal/catalog';
import { addDays, diffDays } from '@delt/personal/dates';
import { PermissionError } from '@delt/personal/permissions';
import { analyzeMove, commitMove } from '@delt/personal/move';
import { entryProblems, presenceOf } from '@delt/personal/rules';
import type { CalendarEntry, Person, PlannerState, StaffingRequirement } from '@delt/personal/types';
import { acceptProposal, explainSlot, proposeAllocation, PUBLISHED_WITHOUT_PERMISSION, publishPlan, setEntryLocked, STALE_PROPOSAL_MESSAGE, type Proposal } from '@delt/personal/allocation/proposal';
import { allocationPeriodError, buildProblem, HISTORY_WINDOW, type AllocationRequest } from '@delt/personal/allocation/model';
import { improve, Solution } from '@delt/personal/allocation/search';

/**
 * Fasit for fordelingen etter designspesifikasjonen §5 B. Forventede tall er
 * regnet for hånd fra reglene (rollevekt 2:1, mulige dager), og dekningen i
 * små tilfeller sammenlignes med et uavhengig, uttømmende søk som ikke
 * bruker motoren.
 */

const TODAY = '2026-11-24';
const DUTIES: string[] = [S.duty1, S.duty2];

/** 12 hverdager uten helligdager: 4.–19. januar 2027. */
const JAN_FROM = '2027-01-04';
const JAN_TO = '2027-01-19';

function stateWith(people: Person[], entries: CalendarEntry[] = []): PlannerState {
  return { ...makeState(), people, entries };
}

const twoAndTwo = () => stateWith([person('l1', 'lis'), person('l2', 'lis'), person('o1', 'overlege'), person('o2', 'overlege')]);

function propose(s: PlannerState, req: Partial<AllocationRequest> = {}): Proposal {
  return proposeAllocation(s, 'planner', { from: JAN_FROM, to: JAN_TO, mode: 'new', ...req }, TODAY);
}

const duties = (s: PlannerState, from = JAN_FROM, to = JAN_TO) => s.entries.filter((e) => DUTIES.includes(e.statusId) && e.date >= from && e.date <= to);
const countOf = (s: PlannerState, personId: string, statusId: string, from?: string, to?: string) => duties(s, from, to).filter((e) => e.personId === personId && e.statusId === statusId).length;
const allValid = (s: PlannerState) => s.entries.every((e) => entryProblems(s, e, TODAY).length === 0);

/** Samme tilstand med et annet bemanningsbehov per ukedag for vaktene. */
function withStaffing(s: PlannerState, perDay: (n: number, weekday: number) => number): PlannerState {
  return { ...s, rules: { ...s.rules, staffing: s.rules.staffing.map((r) => (DUTIES.includes(r.statusId) ? { ...r, perWeekday: r.perWeekday.map(perDay) as StaffingRequirement['perWeekday'] } : r)) } };
}

function away(s: PlannerState, personId: string, dates: string[]): PlannerState {
  return dates.reduce((acc, date) => added(acc, d(personId, date, S.away), true), s);
}

describe('fasit: rollevekter og rettferdighet', () => {
  it('to like LIS og to like overleger, 12 plasser av hver: 4 og 2 førstevakter, omvendt for andrevakt', () => {
    expect(workdays(JAN_FROM, JAN_TO)).toHaveLength(12);
    const p = propose(twoAndTwo());
    const s = p.state;
    expect(p.uncovered).toEqual([]);
    expect(['l1', 'l2', 'o1', 'o2'].map((id) => countOf(s, id, S.duty1))).toEqual([4, 4, 2, 2]);
    expect(['l1', 'l2', 'o1', 'o2'].map((id) => countOf(s, id, S.duty2))).toEqual([2, 2, 4, 4]);
    expect(allValid(s)).toBe(true);
  });

  it('ved like gode alternativer: ulik kategori samme dag, ingen vakt to dager på rad', () => {
    const s = propose(twoAndTwo()).state;
    const cat = new Map(s.people.map((p) => [p.id, p.categoryId]));
    for (const date of workdays(JAN_FROM, JAN_TO)) {
      const day = duties(s).filter((e) => e.date === date);
      expect(day).toHaveLength(2);
      expect(cat.get(day[0]!.personId)).not.toBe(cat.get(day[1]!.personId));
    }
    // Hver person har 6 av 12 hverdager; det går uten å ha vakt to kalenderdager på rad.
    for (const p of s.people) {
      const dates = duties(s).filter((e) => e.personId === p.id).map((e) => e.date).sort();
      for (let i = 1; i < dates.length; i++) expect(diffDays(dates[i - 1]!, dates[i]!)).toBeGreaterThan(1);
    }
  });

  it('ukedagene varierer: ingen får samme vakttype på samme ukedag mer enn nødvendig', () => {
    // 8 uker, 40 førstevakter: hver LIS har 40 · 2/6 ≈ 13, altså 2–3 per ukedag.
    const s = propose(twoAndTwo(), { from: '2027-01-04', to: '2027-02-26' }).state;
    for (const id of ['l1', 'l2']) {
      const perWeekday = [0, 0, 0, 0, 0];
      for (const e of duties(s, '2027-01-04', '2027-02-26')) if (e.personId === id && e.statusId === S.duty1) perWeekday[(new Date(e.date).getUTCDay() + 6) % 7]! += 1;
      expect([13, 14]).toContain(perWeekday.reduce((a, b) => a + b));
      expect(Math.max(...perWeekday) - Math.min(...perWeekday)).toBeLessThanOrEqual(1);
    }
  });

  it('ingen korttidsklumping, selv når årssummen ville vært lik', () => {
    // 8 uker, 80 plasser: 20 per person. I hvert vindu på 14 dager (10 hverdager, 20 plasser) er forventet 5.
    const s = propose(twoAndTwo(), { from: '2027-01-04', to: '2027-02-26' }).state;
    for (const p of s.people) {
      for (let start = '2027-01-04'; start <= '2027-02-13'; start = addDays(start, 1)) {
        const end = addDays(start, 13);
        const n = duties(s, start, end).filter((e) => e.personId === p.id).length;
        expect(n).toBeGreaterThanOrEqual(4);
        expect(n).toBeLessThanOrEqual(6);
      }
    }
  });

  it('fravær uten fritak: forventet antall påvirkes ikke, bare hvor vaktene kan plasseres', () => {
    let s = twoAndTwo();
    // l2 er borte halvparten av dagene.
    s = away(s, 'l2', workdays(JAN_FROM, JAN_TO).filter((_, i) => i % 2 === 0));
    const p = propose(s);
    const row = (id: string, statusId: string) => p.fairness.find((r) => r.personId === id && r.statusId === statusId)!;
    expect(row('l2', S.duty1).eligibleDays).toBe(6);
    expect(row('l1', S.duty1).eligibleDays).toBe(12);
    // Mål for vakt 1: hver dag 2 : 2 : 1 : 1, så 4 og 4 for LIS, uansett tilgjengelighet.
    expect(row('l1', S.duty1).target).toBeCloseTo(4);
    expect(row('l2', S.duty1).target).toBeCloseTo(4);
    // l2 kan bare ha vakt de 6 dagene uten status.
    expect(countOf(p.state, 'l2', S.duty1) + countOf(p.state, 'l2', S.duty2)).toBeLessThanOrEqual(6);
    expect(allValid(p.state)).toBe(true);
  });

  it('ferie gir vaktfritak: forventet antall regnes dag for dag', () => {
    let s = twoAndTwo();
    s = workdays(JAN_FROM, JAN_TO)
      .filter((_, i) => i % 2 === 0)
      .reduce((acc, date) => added(acc, d('l2', date, S.vacation)), s);
    const p = propose(s);
    const row = (id: string) => p.fairness.find((r) => r.personId === id && r.statusId === S.duty1)!;
    // 6 ferie dager (2 : 0 : 1 : 1) og 6 andre (2 : 2 : 1 : 1): l1 6·½ + 6·⅓ = 5, l2 6·⅓ = 2, overlegene 6·¼ + 6·⅙ = 2,5.
    expect([row('l1').target, row('l2').target, row('o1').target, row('o2').target].map((x) => Math.round(x * 1000) / 1000)).toEqual([5, 2, 2.5, 2.5]);
    expect(row('l2').eligibleDays).toBe(6);
  });

  it('historikk: den som har hatt mange førstevakter nylig, får færre nå', () => {
    let s = twoAndTwo();
    for (const date of workdays('2026-11-02', '2026-11-13')) s = added(s, d('l1', date, S.duty1));
    const p = propose(s);
    expect(countOf(p.state, 'l1', S.duty1)).toBeLessThan(countOf(p.state, 'l2', S.duty1));
    // Fortiden er ikke endret.
    expect(duties(p.state, '2026-11-02', '2026-11-13')).toEqual(duties(s, '2026-11-02', '2026-11-13'));
  });

  it('rollevektene er konfigurasjon, ikke kode: like vekter gir lik fordeling', () => {
    const s = twoAndTwo();
    const rules = { ...s.rules, staffing: s.rules.staffing.map((r) => ({ ...r, categoryWeights: {} })) };
    const p = propose({ ...s, rules });
    expect(['l1', 'l2', 'o1', 'o2'].map((id) => countOf(p.state, id, S.duty1))).toEqual([3, 3, 3, 3]);
  });
});

describe('rettferdighet over tid (Peders fasit 26.11.2026)', () => {
  // 20 hverdager før i dag med én vakt per dag, og en ny periode på 10 hverdager.
  const PAST = workdays('2026-10-26', '2026-11-20');
  const NEW = { from: '2027-01-04', to: '2027-01-15' };

  const onlyDuty1 = (s: PlannerState) => onlyDuties(s, [S.duty1]);
  const withHistory = (s: PlannerState, statusId: string, counts: [string, number][], days = PAST) => withHistoryOn(s, statusId, counts, days);

  const newCounts = (s: PlannerState, statusId: string, ids: string[], req: Partial<AllocationRequest> = {}) => {
    const r = { ...NEW, ...req };
    const p = propose(s, r);
    expect(p.uncovered).toEqual([]);
    return ids.map((id) => countOf(p.state, id, statusId, r.from, r.to));
  };

  const twoLis = () => onlyDuty1(stateWith([person('a', 'lis'), person('b', 'lis')]));

  it('eksempelet: 12 og 8 tidligere (forventet 10 og 10) gir 3 og 7 nye, 15 og 15 samlet', () => {
    expect(PAST).toHaveLength(20);
    expect(workdays(NEW.from, NEW.to)).toHaveLength(10);
    const s = withHistory(twoLis(), S.duty1, [['a', 12], ['b', 8]]);
    expect(newCounts(s, S.duty1, ['a', 'b'])).toEqual([3, 7]);
    // Fasit for forventet antall over tidshorisonten: 30 vakter, like andeler.
    const row = (id: string) => propose(s, NEW).fairness.find((r) => r.personId === id && r.statusId === S.duty1)!;
    expect([row('a').historyTarget, row('b').historyTarget]).toEqual([15, 15]);
    expect([row('a').historyCount, row('b').historyCount]).toEqual([15, 15]);
    expect(row('a').historyDays).toBe(365);
  });

  it('også en liten skjevhet kompenseres: 11 og 9 tidligere gir 4 og 6 nye', () => {
    const s = withHistory(twoLis(), S.duty1, [['a', 11], ['b', 9]]);
    expect(newCounts(s, S.duty1, ['a', 'b'])).toEqual([4, 6]);
  });

  it('uten historikk, eller med lik historikk, deles perioden likt', () => {
    expect(newCounts(twoLis(), S.duty1, ['a', 'b'])).toEqual([5, 5]);
    expect(newCounts(withHistory(twoLis(), S.duty1, [['a', 10], ['b', 10]]), S.duty1, ['a', 'b'])).toEqual([5, 5]);
  });

  it('manglende registreringer gir ikke inntrykk av for få vakter: dager uten vakter gir ingen forventning', () => {
    // Bare de siste 10 av de 20 dagene er registrert, 5 og 5. Resten mangler.
    const s = withHistory(twoLis(), S.duty1, [['a', 5], ['b', 5]], PAST.slice(10));
    expect(newCounts(s, S.duty1, ['a', 'b'])).toEqual([5, 5]);
    // En nyansatt (c) uten tidligere vakter er bare forventet å ha vakter fra hen begynte (her: i perioden).
    const withNew: PlannerState = { ...s, people: [...s.people, person('c', 'lis')], peopleHistory: [{ effectiveFrom: '2026-01-01', people: s.people }], peopleFrom: TODAY };
    const [a, b, c] = newCounts(withNew, S.duty1, ['a', 'b', 'c']);
    expect(c).toBeGreaterThanOrEqual(3);
    expect(c).toBeLessThanOrEqual(4);
    expect(a! + b! + c!).toBe(10);
  });

  it('fravær bakover i tid: uten fritak jevnes skjevheten ut, med fritak gir det ingen vaktgjeld', () => {
    // b var borte 8 av de 20 dagene, og a hadde vakt de dagene. De andre 12 dagene: a 4, b 8. Samlet 12 og 8, som i eksempelet.
    const awayDays = PAST.filter((_, k) => k % 5 < 2);
    expect(awayDays).toHaveLength(8);
    const make = (statusId: string, exempt = false) => {
      let s = twoLis();
      s = { ...s, entries: awayDays.map((date): CalendarEntry => ({ id: `b-${date}`, personId: 'b', date, statusId, ruleVersion: 1, ...(exempt ? { exempt: true } : {}) })) };
      s = withHistory(s, S.duty1, [['a', 8]], awayDays);
      return withHistory(s, S.duty1, [['a', 4], ['b', 8]], PAST.filter((x) => !awayDays.includes(x)));
    };
    const row = (s: PlannerState, id: string) => propose(s, NEW).fairness.find((r) => r.personId === id && r.statusId === S.duty1)!;
    // Borte uten fritak (ordinær redusert tilgjengelighet): forventet 15 og 15, så skjevheten jevnes ut: 3 og 7.
    const plain = make(S.away);
    expect([row(plain, 'a').historyTarget, row(plain, 'b').historyTarget]).toEqual([15, 15]);
    expect(newCounts(plain, S.duty1, ['a', 'b'])).toEqual([3, 7]);
    // Ferie eller innvilget fritak: a hadde alene vekt de 8 dagene. Forventet a 8 + 6 + 5 = 19, b 6 + 5 = 11, så a 7 og b 3.
    for (const s of [make(S.vacation), make(S.away, true)]) {
      expect([row(s, 'a').historyTarget, row(s, 'b').historyTarget]).toEqual([19, 11]);
      expect(newCounts(s, S.duty1, ['a', 'b'])).toEqual([7, 3]);
    }
  });

  it('stillingskategori: rollevektene gjelder også det historiske målet (LIS 2, overlege 1 på vakt 1)', () => {
    // 24 dager tidligere, 6 hver. Forventet var LIS 8 og overlege 4: LIS ligger 2 under, overlegene 2 over.
    // Med 12 nye blir forventet samlet LIS 12 og overlege 6, så LIS får 6 nye hver og overlegene ingen.
    const s = withHistory(onlyDuty1(twoAndTwo()), S.duty1, [['l1', 6], ['l2', 6], ['o1', 6], ['o2', 6]], workdays('2026-10-20', '2026-11-20'));
    expect(newCounts(s, S.duty1, ['l1', 'l2', 'o1', 'o2'], { from: JAN_FROM, to: JAN_TO })).toEqual([6, 6, 0, 0]);
  });

  it('vakt 1 og vakt 2 vurderes hver for seg, uten motregning', () => {
    // a hadde flere førstevakter og færre andrevakter enn b; samlet hadde de like mange vakter.
    let s = stateWith([person('a', 'lis'), person('b', 'lis')]);
    s = { ...s, rules: { ...s.rules, staffing: s.rules.staffing.map((r) => ({ ...r, categoryWeights: {} })) } };
    s = withHistory(s, S.duty1, [['a', 12], ['b', 8]]);
    s = withHistory(s, S.duty2, [['a', 8], ['b', 12]]);
    expect(newCounts(s, S.duty1, ['a', 'b'])).toEqual([3, 7]);
    expect(newCounts(s, S.duty2, ['a', 'b'])).toEqual([7, 3]);
  });

  it('tidshorisonten er konfigurerbar: vakter eldre enn horisonten teller ikke', () => {
    const s = withHistory(twoLis(), S.duty1, [['a', 12], ['b', 8]]);
    // 60 dager bakover fra 15.1.2027 begynner 17.11.2026; bare de fire siste tidligere dagene er med (a 2, b 2).
    const short: PlannerState = { ...s, rules: { ...s.rules, allocation: { ...DEFAULT_ALLOCATION, historyDays: 50 } } };
    expect(newCounts(short, S.duty1, ['a', 'b'])).toEqual([5, 5]);
    expect(DEFAULT_ALLOCATION.historyDays).toBe(365);
  });

  it('historisk utjevning og rettferdighet i perioden har hver sin vekt', () => {
    const s = withHistory(twoLis(), S.duty1, [['a', 12], ['b', 8]]);
    const weights = (historyFairness: number, periodFairness: number): PlannerState => ({ ...s, rules: { ...s.rules, allocation: { ...DEFAULT_ALLOCATION, historyFairness, periodFairness } } });
    // Bare rettferdighet i perioden: likt i perioden. Bare historikk: full utjevning.
    expect(newCounts(weights(0, 10), S.duty1, ['a', 'b'])).toEqual([5, 5]);
    expect(newCounts(weights(10, 0), S.duty1, ['a', 'b'])).toEqual([3, 7]);
    const p = propose(s, NEW);
    expect(p.score.breakdown.history).toBeCloseTo(0, 6);
    expect(p.score.breakdown.period).toBeCloseTo(DEFAULT_ALLOCATION.periodFairness * (2 * 2 + 2 * 2), 6);
  });

  it('«Oppdater vaktplan» beholder gyldige tildelinger, selv når historikken er skjev', () => {
    const s0 = withHistory(twoLis(), S.duty1, [['a', 12], ['b', 8]]);
    const s = workdays(NEW.from, NEW.to).reduce((acc, date, k) => added(acc, d(k % 2 ? 'b' : 'a', date, S.duty1)), s0);
    const repair = propose(s, { ...NEW, mode: 'repair' });
    expect(repair.changes).toEqual([]);
    // En ny plan utjevner i stedet.
    expect(newCounts(s, S.duty1, ['a', 'b'])).toEqual([3, 7]);
  });
});

describe('tilstedeværelse og tilgjengelighet (produktregelen, uavhengig av grensesnittet)', () => {
  // Fasit fra kravet, skrevet ut for hånd: [til stede, ledig for ny vakt].
  const FASIT: Record<string, [boolean, boolean]> = {
    '': [true, true],
    [S.duty1]: [true, false],
    [S.duty2]: [true, false],
    [S.referent]: [true, false],
    [S.training]: [true, false],
    [S.away]: [false, false],
    [S.vacation]: [false, false],
    [S.homeOffice]: [false, false],
    [S.research]: [false, false],
    [S.teaching]: [false, false],
    [S.timeOff]: [false, false],
    [S.wishOff]: [false, false],
  };
  const DAY = '2027-01-06';

  it('fasiten dekker hele standardkatalogen', () => {
    expect(Object.keys(FASIT).filter(Boolean).sort()).toEqual(DEFAULT_STATUSES.map((x) => x.id).sort());
  });

  for (const [statusId, [present, available]] of Object.entries(FASIT)) {
    it(`${statusId || 'ingen status'}: ${present ? 'til stede' : 'ikke til stede'}, ${available ? 'ledig' : 'ikke ledig'} for ny vakt`, () => {
      // o1 er eneste kvalifiserte for vakt 1 den dagen; de andre kan bare ha vakt 2.
      let s = stateWith([person('o1', 'overlege'), person('l1', 'lis', [S.duty2]), person('l2', 'lis', [S.duty2])]);
      if (statusId) s = added(s, d('o1', DAY, statusId));
      expect(presenceOf(s, 'o1', DAY, TODAY) === 'present').toBe(present);
      const p = proposeAllocation(s, 'planner', { from: DAY, to: DAY, mode: 'new' }, TODAY);
      const mine = p.state.entries.filter((e) => e.date === DAY && e.personId === 'o1');
      if (DUTIES.includes(statusId)) {
        // Vakten o1 har, kan byttes mot den andre vakten samme dag, men o1 får aldri en vakt til.
        expect(mine).toHaveLength(1);
        expect(DUTIES).toContain(mine[0]!.statusId);
      } else {
        // Ellers får o1 vakt 1 bare når o1 er ledig, og aldri to statuser samme dag.
        expect(mine.some((e) => e.statusId === S.duty1)).toBe(available);
        expect(mine).toHaveLength(statusId || available ? 1 : 0);
      }
      if (!available && !DUTIES.includes(statusId)) {
        const reasons = p.uncovered.find((u) => u.statusId === S.duty1)?.reasons.join(' ') ?? '';
        expect(reasons).toContain(present ? 'Har en annen oppgave samme dag' : 'Ikke til stede');
      }
    });
  }

  it('ønske om fri, borte og andre oppgaver gjør personen opptatt, men gir ikke færre forventede vakter', () => {
    const days = workdays(JAN_FROM, JAN_TO);
    const row = (statusId: string) => {
      let s = twoAndTwo();
      for (const day of days.slice(0, 4)) s = added(s, d('l2', day, statusId));
      return propose(s).fairness.find((r) => r.personId === 'l2' && r.statusId === S.duty1)!;
    };
    for (const statusId of [S.wishOff, S.away, S.referent, S.research, S.teaching, S.homeOffice]) {
      expect(row(statusId).eligibleDays).toBe(8);
      expect(row(statusId).target).toBeCloseTo(4, 6);
    }
    // Ferie og opplæring gir vaktfritak: 4 dager uten vekt (2 : 0 : 1 : 1) og 8 med (2 : 2 : 1 : 1) gir 8 · ⅓.
    for (const statusId of [S.vacation, S.training]) expect(row(statusId).target).toBeCloseTo(8 / 3, 6);
  });
});

describe('vaktfritak per status (Peders tabell 26.11.2026)', () => {
  // [ledig for ny vakt, vaktfritak]. Borte gir fritak bare når det er innvilget administrativt.
  const FASIT: Record<string, [boolean, boolean]> = {
    '': [true, false],
    [S.duty1]: [false, false],
    [S.duty2]: [false, false],
    [S.referent]: [false, false],
    [S.training]: [false, true],
    [S.vacation]: [false, true],
    [S.away]: [false, false],
    [S.homeOffice]: [false, false],
    [S.research]: [false, false],
    [S.teaching]: [false, false],
    [S.timeOff]: [false, false],
    [S.wishOff]: [false, false],
  };
  // To likt stilte medarbeidere deler 10 førstevakter på 10 arbeidsdager; a har statusen 4 av dagene.
  const TEN = workdays('2027-01-04', '2027-01-15');
  const make = (statusId: string, exempt = false): PlannerState => {
    let s = onlyDuties(stateWith([person('a', 'lis'), person('b', 'lis')]), [S.duty1]);
    if (!statusId) return s;
    for (const day of TEN.slice(0, 4)) s = added(s, d('a', day, statusId), true);
    return exempt ? { ...s, entries: s.entries.map((e) => (e.statusId === S.away ? { ...e, exempt: true } : e)) } : s;
  };
  const target = (s: PlannerState) => {
    const pr = buildProblem(s, { from: TEN[0]!, to: TEN[TEN.length - 1]!, mode: 'new' }, TODAY);
    const t = pr.types.indexOf(S.duty1);
    return [pr.targets[HISTORY_WINDOW]![t]![0]!, pr.targets[HISTORY_WINDOW]![t]![1]!];
  };

  it('fasiten dekker hele standardkatalogen', () => {
    expect(Object.keys(FASIT).filter(Boolean).sort()).toEqual(DEFAULT_STATUSES.map((x) => x.id).sort());
    expect(DEFAULT_STATUSES.filter((x) => x.dutyExemption).map((x) => [x.id, x.dutyExemption])).toEqual([
      [S.training, 'always'],
      [S.away, 'administrative'],
      [S.vacation, 'always'],
    ]);
  });

  for (const [statusId, [available, exempt]] of Object.entries(FASIT)) {
    if (DUTIES.includes(statusId)) continue;
    it(`${statusId || 'ingen status'}: ${available ? 'ledig' : 'ikke ledig'}, ${exempt ? 'vaktfritak (eksempel 2: 3 og 7)' : 'ingen vaktfritak (eksempel 3: 5 og 5)'}`, () => {
      const [a, b] = target(make(statusId));
      expect(a).toBeCloseTo(exempt ? 3 : 5, 6);
      expect(b).toBeCloseTo(exempt ? 7 : 5, 6);
    });
  }

  it('Borte med administrativt vaktfritak: som ferie (3 og 7)', () => {
    const [a, b] = target(make(S.away, true));
    expect(a).toBeCloseTo(3, 6);
    expect(b).toBeCloseTo(7, 6);
  });

  it('eksempel 3: når 5 og 5 ikke kan oppnås, vises skjevheten og jevnes ut i neste plan', () => {
    // a har forskning 8 av 10 dager og kan bare ha vakt 2 dager: 2 og 8, men forventet 5 og 5.
    let s = onlyDuties(stateWith([person('a', 'lis'), person('b', 'lis')]), [S.duty1]);
    for (const day of TEN.slice(0, 8)) s = added(s, d('a', day, S.research));
    const p = propose(s, { from: TEN[0]!, to: TEN[TEN.length - 1]! });
    const row = (id: string) => p.fairness.find((r) => r.personId === id && r.statusId === S.duty1)!;
    expect([row('a').count, row('b').count]).toEqual([2, 8]);
    expect([row('a').target, row('b').target]).toEqual([5, 5]);
    // Neste periode (10 nye dager, alle ledige): a skal ta igjen. Forventet samlet 10 og 10; a har 2, b 8.
    // Én plan gir høyst 50 % mer enn forventet i perioden (5 + 2,5), og b gir fra seg like mye: mål 9,5 og 10,5.
    const next = workdays('2027-01-18', '2027-01-29');
    const req = { from: next[0]!, to: next[next.length - 1]! };
    const after = propose(p.state, req);
    expect(after.problem.historyGoals[0]).toEqual([9.5, 10.5]);
    const n = (q: Proposal, id: string) => countOf(q.state, id, S.duty1, req.from, req.to);
    expect(n(after, 'a')).toBeGreaterThanOrEqual(7);
    // Uten tak er målet full utjevning (10 og 10); med tak 0 % jevnes ingenting ut i denne planen (7 og 13).
    const limit = (catchUpLimit: number): PlannerState => ({ ...p.state, rules: { ...p.state.rules, allocation: { ...DEFAULT_ALLOCATION, catchUpLimit } } });
    expect(propose(limit(200), req).problem.historyGoals[0]).toEqual([10, 10]);
    expect(propose(limit(0), req).problem.historyGoals[0]).toEqual([7, 13]);
    expect(n(propose(limit(0), req), 'a')).toBeLessThan(n(after, 'a'));
  });
});

describe('vaktandel (Peders eksempel 1, 26.11.2026)', () => {
  // A 100 %, B 60 % og C 100 % i samme kategori deler 52 vakter på 52 arbeidsdager.
  // B er registrert Borte uten vaktfritak 40 % av dagene (ordinær deltidsfri, B17), C har forskning 40 % av dagene (andre oppgaver).
  const DAYS = workdays('2027-01-04', '2027-03-16');
  const make = (withCalendar = true) => {
    let s = onlyDuties(stateWith([person('a', 'lis'), person('b', 'lis'), person('c', 'lis')]), [S.duty1]);
    s = { ...s, dutyShares: { b: { ordinary: [{ from: '2000-01-01', percent: 60 }], temporary: [] } } };
    if (!withCalendar) return s;
    DAYS.forEach((day, k) => {
      if (k % 5 < 2) s = added(s, d('b', day, S.away));
      if (k % 5 >= 3) s = added(s, d('c', day, S.research));
    });
    return s;
  };
  const targets = (s: PlannerState) => {
    const pr = buildProblem(s, { from: DAYS[0]!, to: DAYS[DAYS.length - 1]!, mode: 'new' }, TODAY);
    return pr.targets[HISTORY_WINDOW]![0]!.map((x) => Math.round(x * 1000) / 1000);
  };

  it('52 vakter gir 20, 12 og 20: ingen dobbel reduksjon for B, ingen reduksjon for C', () => {
    expect(DAYS).toHaveLength(52);
    // Hver dag 1 : 0,6 : 1, så 52 · 1/2,6 = 20 og 52 · 0,6/2,6 = 12.
    expect(targets(make())).toEqual([20, 12, 20]);
    // Kalenderen påvirker ikke forventet antall: uten fridager og forskning blir det det samme.
    expect(targets(make(false))).toEqual([20, 12, 20]);
  });

  it('skjevheten C får fordi C sjelden er ledig, vises i forslaget', () => {
    const p = proposeAllocation(make(), 'planner', { from: DAYS[0]!, to: DAYS[DAYS.length - 1]!, mode: 'new' }, TODAY);
    const row = (id: string) => p.fairness.find((r) => r.personId === id && r.statusId === S.duty1)!;
    expect(row('c').target).toBeCloseTo(20, 6);
    expect(row('c').eligibleDays).toBe(32);
    expect(row('b').eligibleDays).toBe(30);
    expect(p.uncovered).toEqual([]);
    expect(row('a').count + row('b').count + row('c').count).toBe(52);
  });
});

describe('harde krav og dekning', () => {
  it('umulig dekning: plassen står udekket med årsak, og ingen harde krav brytes', () => {
    let s = twoAndTwo();
    s = away(s, 'l1', ['2027-01-05']);
    s = away(s, 'l2', ['2027-01-05']);
    s = away(s, 'o1', ['2027-01-05']);
    const p = propose(s);
    expect(p.uncovered).toHaveLength(1);
    expect(p.uncovered[0]!.date).toBe('2027-01-05');
    expect(p.uncovered[0]!.reasons.join(' ')).toMatch(/Ikke til stede.*Person l1, Person l2, Person o1/);
    expect(p.uncovered[0]!.reasons.join(' ')).toMatch(/samme dag: Person o2/);
    expect(allValid(p.state)).toBe(true);
    expect(p.notes.join(' ')).toContain('1 plasser kan ikke dekkes');
  });

  it('kvalifikasjon og én status per dag respekteres: ingen dobbel vakt, og en med annen status får ikke vakt', () => {
    let s = stateWith([person('l1', 'lis', [S.duty1]), person('l2', 'lis', [S.duty2]), person('o1', 'overlege'), person('o2', 'overlege', [])]);
    s = added(s, d('o1', '2027-01-06', S.homeOffice));
    const p = propose(s);
    expect(allValid(p.state)).toBe(true);
    expect(duties(p.state).some((e) => e.personId === 'o2')).toBe(false);
    expect(duties(p.state).some((e) => e.personId === 'l1' && e.statusId === S.duty2)).toBe(false);
    expect(duties(p.state).some((e) => e.personId === 'o1' && e.date === '2027-01-06')).toBe(false);
  });

  it('dekningen er like høy som et uavhengig, uttømmende søk gir', () => {
    // Liten instans med tilfeldig, men fast, fravær og kvalifikasjoner.
    const people = [person('a', 'lis', [S.duty1]), person('b', 'lis'), person('c', 'overlege', [S.duty2]), person('e', 'overlege')];
    const days = workdays('2027-01-04', '2027-01-15');
    const absent: Record<string, string[]> = { a: [days[0]!, days[3]!, days[4]!], b: [days[0]!, days[1]!, days[4]!, days[7]!], c: [days[2]!, days[4]!], e: [days[0]!, days[4]!, days[5]!] };
    let s = stateWith(people);
    for (const [id, dates] of Object.entries(absent)) s = away(s, id, dates);
    // Uavhengig fasit: for hver dag, største antall plasser som kan fylles med to ulike, kvalifiserte, tilstedeværende personer.
    const can = (p: Person, date: string, statusId: string) => p.qualifications.includes(statusId) && !absent[p.id]!.includes(date);
    let best = 0;
    for (const date of days) {
      let dayBest = 0;
      for (const v1 of [null, ...people]) {
        for (const v2 of [null, ...people]) {
          if (v1 && v2 && v1.id === v2.id) continue;
          if ((v1 && !can(v1, date, S.duty1)) || (v2 && !can(v2, date, S.duty2))) continue;
          dayBest = Math.max(dayBest, (v1 ? 1 : 0) + (v2 ? 1 : 0));
        }
      }
      best += dayBest;
    }
    const p = propose(s, { from: days[0], to: days[days.length - 1] });
    expect(duties(p.state, days[0], days[days.length - 1])).toHaveLength(best);
    expect(p.uncovered).toHaveLength(days.length * 2 - best);
    expect(allValid(p.state)).toBe(true);
  });

  it('fyller en plass ved å flytte en annen vakt samme dag når det er eneste måte å dekke begge', () => {
    // b kan bare ha vakt 1, a kan begge. Står a på vakt 1, kan vakt 2 bare dekkes ved å flytte a.
    let s = stateWith([person('a', 'lis'), person('b', 'overlege', [S.duty1])]);
    s = added(s, d('a', '2027-01-04', S.duty1));
    const p = proposeAllocation(s, 'planner', { from: '2027-01-04', to: '2027-01-04', mode: 'repair' }, TODAY);
    expect(p.uncovered).toEqual([]);
    expect(p.changes).toHaveLength(2);
    expect(duties(p.state).map((e) => `${e.personId}:${e.statusId}`).sort()).toEqual([`a:${S.duty2}`, `b:${S.duty1}`].sort());
  });
});

describe('søkets grenser og trekk', () => {
  it('mange plasser samme dag: søket er begrenset, dekker alt og sier fra om grensen', () => {
    // Hver vakt finnes én gang per dag; her har i tillegg referent fire plasser per dag, til sammen seks.
    const people = ['a', 'b', 'c', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm'].map((id, n) => person(id, n % 2 ? 'lis' : 'overlege'));
    const base = stateWith(people);
    const s = { ...base, rules: { ...base.rules, staffing: [...base.rules.staffing, { statusId: S.referent, perWeekday: [4, 4, 4, 4, 4, 0, 0] as StaffingRequirement['perWeekday'], onHolidays: false }] } };
    const started = performance.now();
    const p = propose(s, { from: '2027-01-04', to: '2027-01-08' });
    expect(performance.now() - started).toBeLessThan(5000);
    expect(p.uncovered).toEqual([]);
    expect(p.state.entries.filter((e) => e.date >= '2027-01-04' && e.date <= '2027-01-08')).toHaveLength(5 * 6);
    expect(new Set(p.state.entries.map((e) => `${e.date}|${e.personId}`)).size).toBe(p.state.entries.length);
    expect(allValid(p.state)).toBe(true);
    expect(p.notes.join(' ')).toContain('5 dager hadde for mange kombinasjoner');
  });

  it('vanlig bemanning: søket er fullstendig og dekningen bevist høyest mulig', () => {
    expect(propose(twoAndTwo()).notes.join(' ')).toContain('Dekningen er den høyest mulige');
  });

  it('udekket plass på en dag uten arbeid (helg) får en årsak', () => {
    const s = withStaffing(twoAndTwo(), () => 1);
    const p = propose(s, { from: '2027-01-09', to: '2027-01-09' });
    expect(p.uncovered).toHaveLength(2);
    expect(p.uncovered.every((u) => u.reasons.join(' ') === 'Ikke en arbeidsdag: alle medarbeidere.')).toBe(true);
  });

  it('lokalt søk flytter en person fra en dekket til en udekket plass samme dag når det gir bedre fordeling', () => {
    // a er alene og kan bare ha én vakt per dag. Står a på vakt 2 begge dager, er det jevnere med én av hver.
    const s = stateWith([person('a', 'lis')]);
    const pr = buildProblem(s, { from: '2027-01-04', to: '2027-01-05', mode: 'new' }, TODAY);
    const sol = new Solution(pr);
    const duty2 = pr.types.indexOf(S.duty2);
    sol.apply(pr.slots.filter((x) => x.type === duty2).map((x) => [x.index, 0]));
    const before = sol.score();
    improve(sol);
    const after = sol.score();
    expect(after.uncovered).toBe(before.uncovered);
    expect(after.cost).toBeLessThan(before.cost);
    expect(new Set(pr.slots.filter((x) => sol.person[x.index] === 0).map((x) => x.type)).size).toBe(2);
  });

  it('ny plan: å fjerne en gyldig vakt koster like mye stabilitet som å bytte den ut', () => {
    const s = added(stateWith([person('a', 'lis'), person('b', 'lis')]), d('a', '2027-01-04', S.duty1));
    const pr = buildProblem(s, { from: '2027-01-04', to: '2027-01-04', mode: 'new' }, TODAY);
    const sol = new Solution(pr);
    const slot = pr.slots.find((x) => pr.types[x.type] === S.duty1)!.index;
    sol.apply([[slot, 0]]);
    expect(sol.delta([[slot, -1]]).breakdown.change).toBeCloseTo(0.5);
    expect(sol.delta([[slot, 1]]).breakdown.change).toBeCloseTo(0.5);
  });
});

describe('historikk med endret stillingskategori og regler', () => {
  // Ti hverdager før i dag og to fra i dag, med én førstevakt per dag i et vindu på 16 kalenderdager.
  const past = ['2026-11-10', '2026-11-11', '2026-11-12', '2026-11-13', '2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19', '2026-11-20', '2026-11-23'];
  const entry = (personId: string, date: string): CalendarEntry => ({ id: `h-${date}`, personId, date, statusId: S.duty1, time: { start: 480, end: 930 }, ruleVersion: 1 });

  function history(weights: { then: Record<string, number>; now: Record<string, number> }): PlannerState {
    const base = stateWith([person('a', 'overlege'), person('b', 'lis')]);
    const staffing = (w: Record<string, number>) => base.rules.staffing.map((r) => (r.statusId === S.duty1 ? { ...r, categoryWeights: w } : { ...r, perWeekday: r.perWeekday.map(() => 0) as StaffingRequirement['perWeekday'] }));
    return {
      ...base,
      // a var LIS frem til i dag, og er overlege fra i dag.
      peopleHistory: [{ effectiveFrom: '2026-01-01', people: [person('a', 'lis'), person('b', 'lis')] }],
      peopleFrom: TODAY,
      rules: { ...base.rules, version: 2, effectiveFrom: TODAY, staffing: staffing(weights.now), allocation: { ...DEFAULT_ALLOCATION, historyDays: 16 } },
      ruleVersions: [{ ...base.rules, version: 1, effectiveFrom: '2026-01-01', staffing: staffing(weights.then) }],
      ruleVersionSeq: 2,
      entries: past.map((date, k) => entry(k % 2 ? 'b' : 'a', date)),
    };
  }

  const targets = (s: PlannerState) => {
    const pr = buildProblem(s, { from: TODAY, to: '2026-11-25', mode: 'new' }, TODAY);
    const t = pr.types.indexOf(S.duty1);
    return [pr.targets[HISTORY_WINDOW]![t]![0]!, pr.targets[HISTORY_WINDOW]![t]![1]!];
  };

  it('kategoribytte: kategorien slik den var hver dag (fasit a 10·½ + 2·⅓, b 10·½ + 2·⅔)', () => {
    const [a, b] = targets(history({ then: { lis: 2, overlege: 1 }, now: { lis: 2, overlege: 1 } }));
    expect(a).toBeCloseTo(5 + 2 / 3, 6);
    expect(b).toBeCloseTo(5 + 4 / 3, 6);
  });

  it('regelendring: rollevektene slik de var hver dag (fasit a 10·½ + 2·⅓, b 10·½ + 2·⅔)', () => {
    // Før i dag like vekter (begge LIS), fra i dag LIS 2 og overlege 1.
    const [a, b] = targets(history({ then: { lis: 1, overlege: 1 }, now: { lis: 2, overlege: 1 } }));
    expect(a).toBeCloseTo(5 + 2 / 3, 6);
    expect(b).toBeCloseTo(5 + 4 / 3, 6);
  });
});

describe('oppdatering av eksisterende plan', () => {
  it('klokkeslett påvirker ikke fordelingen: en vakt med eget klokkeslett beholdes og teller som dekket', () => {
    let s = twoAndTwo();
    s = added(s, d('l1', '2027-01-04', S.duty1, { time: { start: 480, end: 720 }, note: 'Bytter med kollega etter lunsj' }));
    const p = proposeAllocation(s, 'planner', { from: '2027-01-04', to: '2027-01-04', mode: 'repair' }, TODAY);
    expect(p.changes.some((c) => c.statusId === S.duty1)).toBe(false);
    expect(p.uncovered).toEqual([]);
    expect(p.state.entries.find((e) => e.statusId === S.duty1)).toMatchObject({ personId: 'l1', time: { start: 480, end: 720 } });
  });

  it('en gyldig vakt beholdes uendret når statusen senere blir utgått', () => {
    const plan = acceptProposal(twoAndTwo(), 'planner', propose(twoAndTwo()), TODAY);
    const before = duties(plan);
    expect(before).toHaveLength(24);
    const changed: PlannerState = { ...plan, rules: { ...plan.rules, statuses: plan.rules.statuses.map((x) => (x.id === S.duty1 ? { ...x, active: false } : x)) } };
    expect(duties(changed).every((e) => entryProblems(changed, e, TODAY).length === 0)).toBe(true);
    const p = proposeAllocation(changed, 'planner', { from: JAN_FROM, to: JAN_TO, mode: 'repair' }, TODAY);
    expect(p.changes).toEqual([]);
    expect(duties(p.state).map((e) => e.id)).toEqual(before.map((e) => e.id));
  });

  it('en allerede gyldig plan endres ikke', () => {
    const plan = acceptProposal(twoAndTwo(), 'planner', propose(twoAndTwo()), TODAY);
    const p = propose(plan, { mode: 'repair' });
    expect(p.changes).toEqual([]);
    expect(p.state).toBe(plan);
  });

  it('én ugyldig vakt med en gyldig, ledig erstatter: bare den plassen endres', () => {
    const plan = acceptProposal(twoAndTwo(), 'planner', propose(twoAndTwo()), TODAY);
    const original = duties(plan).find((e) => e.date === '2027-01-07')!;
    // Vakten er gitt utenom kalenderens kontroll (f.eks. fra et annet system) til en som ikke er kvalifisert.
    const target = { ...original, personId: 'x' };
    const broken: PlannerState = { ...plan, people: [...plan.people, person('x', 'lis', [])], entries: plan.entries.map((e) => (e.id === original.id ? target : e)) };
    expect(entryProblems(broken, target, TODAY).length).toBeGreaterThan(0);
    const p = propose(broken, { mode: 'repair' });
    expect(p.changes).toHaveLength(1);
    expect(p.changes[0]).toMatchObject({ kind: 'replace', date: target.date, statusId: target.statusId, before: { id: target.id } });
    expect(p.changes[0]!.reason).toContain('kan ikke ha vakten');
    const others = (s: PlannerState) => duties(s).filter((e) => e.id !== target.id && e.date !== target.date || (e.date === target.date && e.statusId !== target.statusId));
    expect(others(p.state)).toEqual(others(broken));
    expect(allValid(p.state)).toBe(true);
  });

  it('et vaktbytte endrer ikke andre vakter, og vakten teller for den som faktisk har den', () => {
    const plan = acceptProposal(twoAndTwo(), 'planner', propose(twoAndTwo()), TODAY);
    const day = duties(plan).filter((e) => e.date === '2027-01-08');
    const [v1, v2] = [day.find((e) => e.statusId === S.duty1)!, day.find((e) => e.statusId === S.duty2)!];
    const a = analyzeMove(plan, 'planner', v1.id, { personId: v2.personId, date: v2.date }, TODAY);
    expect(a.options.map((o) => o.kind)).toContain('swap');
    const swapped = commitMove(plan, 'planner', v1.id, { personId: v2.personId, date: v2.date }, 'swap', TODAY).state;
    const p = propose(swapped, { mode: 'repair' });
    expect(p.changes).toEqual([]);
    const row = p.fairness.find((r) => r.personId === v2.personId && r.statusId === S.duty1)!;
    expect(row.count).toBe(countOf(plan, v2.personId, S.duty1) + 1);
  });

  it('låste vakter endres ikke, heller ikke i ny plan', () => {
    let s = twoAndTwo();
    // Alle førstevaktene i perioden står på o1 og er låst; o1 får dermed langt over forventet antall.
    for (const date of workdays(JAN_FROM, '2027-01-08')) s = added(s, d('o1', date, S.duty1));
    for (const e of duties(s)) s = setEntryLocked(s, 'planner', e.id, true);
    const p = propose(s);
    for (const date of workdays(JAN_FROM, '2027-01-08')) expect(duties(p.state).find((e) => e.date === date && e.statusId === S.duty1)!.personId).toBe('o1');
    expect(p.notes.join(' ')).toContain('5 låste vakter');
  });

  it('publiserte vakter endres bare med uttrykkelig tillatelse', () => {
    let s = twoAndTwo();
    for (const date of workdays(JAN_FROM, '2027-01-08')) s = added(s, d('o1', date, S.duty1));
    s = publishPlan(s, 'planner', '2027-01-08');
    const kept = propose(s);
    expect(duties(kept.state, JAN_FROM, '2027-01-08').filter((e) => e.statusId === S.duty1).every((e) => e.personId === 'o1')).toBe(true);
    expect(kept.notes.join(' ')).toContain('publisert til og med');
    const allowed = propose(s, { allowPublished: true });
    expect(duties(allowed.state, JAN_FROM, '2027-01-08').filter((e) => e.statusId === S.duty1).every((e) => e.personId === 'o1')).toBe(false);
  });

  it('ledige plasser på publiserte datoer fylles ikke uten tillatelse; med tillatelse er endringene merket som publisert', () => {
    const s = publishPlan(twoAndTwo(), 'planner', '2027-01-08');
    const published = workdays(JAN_FROM, '2027-01-08').length * 2;

    const kept = propose(s);
    expect(kept.changes.some((c) => c.date <= '2027-01-08')).toBe(false);
    expect(duties(kept.state, JAN_FROM, '2027-01-08')).toHaveLength(0);
    expect(kept.uncovered.some((u) => u.date <= '2027-01-08')).toBe(false);
    expect(kept.notes.join(' ')).toContain(`${published} ledige plasser der er ikke fylt`);
    expect(kept.changes.every((c) => !c.published)).toBe(true);
    const next = acceptProposal(s, 'planner', kept, TODAY);
    expect(duties(next, JAN_FROM, '2027-01-08')).toHaveLength(0);

    const allowed = propose(s, { allowPublished: true });
    const inPublished = allowed.changes.filter((c) => c.date <= '2027-01-08');
    expect(inPublished).toHaveLength(published);
    expect(inPublished.every((c) => c.published)).toBe(true);
    expect(allowed.changes.filter((c) => c.date > '2027-01-08').every((c) => !c.published)).toBe(true);
    expect(allowed.notes.join(' ')).toContain(`${published} av endringene gjelder publisert vaktplan`);
    expect(duties(acceptProposal(s, 'planner', allowed, TODAY), JAN_FROM, '2027-01-08')).toHaveLength(published);

    // Uten tillatelse i forespørselen kan endringer i publisert plan aldri lagres.
    const tampered = { ...allowed, request: { ...allowed.request, allowPublished: false } };
    expect(() => acceptProposal(s, 'planner', tampered, TODAY)).toThrow(PUBLISHED_WITHOUT_PERMISSION);
  });

  it('dager før i dag endres aldri', () => {
    let s = twoAndTwo();
    s = added(s, d('o1', '2026-11-23', S.duty1));
    const p = proposeAllocation(s, 'planner', { from: '2026-11-16', to: '2026-11-27', mode: 'new' }, TODAY);
    expect(p.changes.every((c) => c.date >= TODAY)).toBe(true);
    expect(duties(p.state, '2026-11-16', '2026-11-23')).toEqual(duties(s, '2026-11-16', '2026-11-23'));
    expect(p.notes.join(' ')).toContain('Dager før i dag');
  });
});

describe('forslag, godkjenning og forklaring', () => {
  it('et forslag lagrer ingenting; godtatt blir det én endring', () => {
    const s = twoAndTwo();
    const p = propose(s);
    expect(s.entries).toHaveLength(0);
    const next = acceptProposal(s, 'planner', p, TODAY);
    expect(duties(next)).toHaveLength(24);
  });

  it('et foreldet forslag avvises', () => {
    const s = twoAndTwo();
    const p = propose(s);
    const changed = added(s, d('l1', '2027-01-06', S.referent));
    expect(() => acceptProposal(changed, 'planner', p, TODAY)).toThrow(STALE_PROPOSAL_MESSAGE);
    // En endring langt utenfor det beregningen leser, gjør ikke forslaget foreldet, men alt kontrolleres på nytt.
    const outside = added(s, d('l1', '2028-03-01', S.referent));
    expect(duties(acceptProposal(outside, 'planner', p, TODAY))).toHaveLength(24);
  });

  it('et forslag er foreldet når historikk før perioden eller vakter like etter endres', () => {
    const s = twoAndTwo();
    const p = propose(s, { from: JAN_FROM, to: '2027-01-08' });
    // Historikk teller i rettferdigheten, og vakter på begge sider teller i avstanden.
    for (const changed of [added(s, d('l1', '2026-12-31', S.duty1)), added(s, d('o1', '2027-01-11', S.duty1)), added(s, d('o2', '2026-12-01', S.away))]) {
      expect(() => acceptProposal(changed, 'planner', p, TODAY)).toThrow(STALE_PROPOSAL_MESSAGE);
    }
    // Ingenting er overskrevet: tilstanden som ble avvist, er urørt.
    expect(duties(added(s, d('l1', '2026-12-31', S.duty1)), JAN_FROM, '2027-01-08')).toHaveLength(0);
  });

  it('bare planlegger kan lage, godta og publisere', () => {
    const s = twoAndTwo();
    expect(() => proposeAllocation(s, 'reader', { from: JAN_FROM, to: JAN_TO, mode: 'new' }, TODAY)).toThrow(PermissionError);
    expect(() => proposeAllocation(s, 'outsideArchitect', { from: JAN_FROM, to: JAN_TO, mode: 'new' }, TODAY)).toThrow(PermissionError);
    expect(() => acceptProposal(s, 'reader', propose(s), TODAY)).toThrow(PermissionError);
    expect(() => publishPlan(s, 'reader', JAN_TO)).toThrow(PermissionError);
  });

  it('samme data gir samme forslag', () => {
    const shape = (p: Proposal) => p.changes.map((c) => `${c.kind} ${c.date} ${c.statusId} ${c.after?.personId ?? '-'}`);
    expect(shape(propose(twoAndTwo()))).toEqual(shape(propose(twoAndTwo())));
  });

  it('forklaringen viser hvorfor hver kandidat ble valgt eller ikke', () => {
    let s = twoAndTwo();
    s = away(s, 'o2', ['2027-01-05']);
    const p = propose(s);
    const slot = p.problem.slots.find((x) => x.date === '2027-01-05' && p.problem.types[x.type] === S.duty1)!;
    const rows = explainSlot(p, slot.index);
    expect(rows[0]!.verdict).toBe('chosen');
    expect(rows.find((r) => r.personId === 'o2')).toMatchObject({ verdict: 'blocked' });
    const possible = rows.filter((r) => r.verdict === 'possible');
    // Et lokalt optimum: ingen annen kandidat gir en bedre plan.
    expect(possible.every((r) => r.delta! >= -1e-9)).toBe(true);
    expect(rows.some((r) => r.verdict === 'busy' && /vakt 2 samme dag/.test(r.reason!))).toBe(true);
  });

  it('ugyldig periode avvises', () => {
    expect(() => propose(twoAndTwo(), { from: JAN_TO, to: JAN_FROM })).toThrow('Perioden');
    expect(() => propose(twoAndTwo(), { from: '2027-01-01', to: '2028-06-01' })).toThrow('høyst');
    // En periode som er helt før i dag, gir en tydelig feil i stedet for et tomt forslag (Peder 26.11.2026).
    expect(() => propose(twoAndTwo(), { from: '2026-01-05', to: '2026-08-02' })).toThrow('Hele perioden er før i dag');
    expect(allocationPeriodError('2026-01-05', TODAY, TODAY)).toBeNull();
  });
});
