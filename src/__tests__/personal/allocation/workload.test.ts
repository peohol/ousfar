import { describe, expect, it } from 'vitest';
import '../hjelp';
import { added, d, makeState, onlyDuties, person, withHistory, workdays } from '../fixtures';
import { STATUS_IDS as S } from '@delt/personal/catalog';
import type { CalendarEntry, PlannerState, StaffingRequirement } from '@delt/personal/types';
import { acceptProposal, previewAcceptance, proposeAllocation } from '@delt/personal/allocation/proposal';
import { deviation, workload, type WorkloadProposal, type WorkloadRow } from '@delt/personal/allocation/workload';

/**
 * Oversikten over vaktbelastning, med tall regnet for hånd. Peders eksempel
 * (26.11.2026): to likt stilte medarbeidere, 12 og 8 tidligere vakter, 3 og 7
 * nye, 15 og 15 samlet.
 */

const TODAY = '2026-11-24';
const PAST = workdays('2026-10-26', '2026-11-20');
const NEW = { from: '2027-01-04', to: '2027-01-15' };
/** Tidsrommet i oversikten: fra den første tidligere vakten til forslagets slutt. */
const RANGE = { from: '2026-10-26', to: NEW.to };

const base = () => withHistory(onlyDuties({ ...makeState(), people: [person('a', 'lis'), person('b', 'lis')] }, [S.duty1]), S.duty1, [['a', 12], ['b', 8]], PAST);

const rowsOf = (s: PlannerState, from = RANGE.from, to = RANGE.to, proposal?: WorkloadProposal) => workload(s, from, to, TODAY, { proposal }).types.find((t) => t.statusId === S.duty1)!.rows;
const round = (n: number | null) => (n === null ? NaN : Math.round(n * 1000) / 1000);

describe('oversikt over vaktbelastning', () => {
  it('uten forslag: antall, forventet og avvik (12 og 8 mot forventet 10 og 10)', () => {
    const rows = rowsOf(base());
    expect(rows.map((r) => [r.personId, r.before.count, r.before.expected, deviation(r.before)])).toEqual([
      ['a', 12, 10, 2],
      ['b', 8, 10, -2],
    ]);
    expect(rows[0]!.after).toBeUndefined();
    expect(rows[0]!.planned).toBeUndefined();
  });

  it('med forslag: foreslått plan, samlet etter og forventet etter over samme tidsrom (3 og 7 nye, 15 og 15 samlet)', () => {
    const s = base();
    const p = proposeAllocation(s, 'planner', { ...NEW, mode: 'new' }, TODAY);
    const w = workload(s, RANGE.from, RANGE.to, TODAY, { proposal: { state: p.state, ...NEW } });
    expect(w.plan).toEqual(NEW);
    const rows = w.types.find((t) => t.statusId === S.duty1)!.rows;
    expect(rows.map((r) => [r.personId, r.before.count, r.planned, r.after!.count, r.after!.expected, deviation(r.after!)])).toEqual([
      ['a', 12, 3, 15, 15, 0],
      ['b', 8, 7, 15, 15, 0],
    ]);
  });

  it('omfordeling av eksisterende vakter telles ikke dobbelt', () => {
    // Perioden har alt en plan med 5 og 5. En ny plan gir 3 og 7: samlet blir 15 og 15, ikke 17 og 13 pluss de nye.
    const s = workdays(NEW.from, NEW.to).reduce((acc, date, k) => added(acc, d(k % 2 ? 'b' : 'a', date, S.duty1)), base());
    const p = proposeAllocation(s, 'planner', { ...NEW, mode: 'new' }, TODAY);
    expect(p.changes.length).toBeGreaterThanOrEqual(2);
    expect(p.changes.every((c) => c.kind === 'replace')).toBe(true);
    const rows = rowsOf(s, RANGE.from, RANGE.to, { state: p.state, ...NEW });
    expect(rows.map((r) => [r.before.count, r.before.expected, r.planned, r.after!.count, r.after!.expected])).toEqual([
      [17, 15, 3, 15, 15],
      [13, 15, 7, 15, 15],
    ]);
    // Samlet antall vakter er det samme før og etter (30), og summen av avvikene er null.
    const sum = (f: (r: WorkloadRow) => number) => rows.reduce((n, r) => n + f(r), 0);
    expect(sum((r) => r.before.count)).toBe(30);
    expect(sum((r) => r.after!.count)).toBe(30);
    expect(round(sum((r) => deviation(r.before)!))).toBe(0);
    expect(round(sum((r) => deviation(r.after!)!))).toBe(0);
  });

  it('samme tidsrom før og etter: et forslag utenfor tidsrommet endrer ingenting, og planen klippes til tidsrommet', () => {
    const s = base();
    const p = proposeAllocation(s, 'planner', { ...NEW, mode: 'new' }, TODAY);
    const pastOnly = rowsOf(s, PAST[0]!, PAST[PAST.length - 1]!, { state: p.state, ...NEW });
    expect(pastOnly.map((r) => [r.before.count, r.planned, r.after!.count])).toEqual([
      [12, 0, 12],
      [8, 0, 8],
    ]);
    expect(workload(s, PAST[0]!, PAST[PAST.length - 1]!, TODAY, { proposal: { state: p.state, ...NEW } }).plan).toBeUndefined();
    // Én enkelt dag utenfor forslaget, med vakter: ingen i foreslått plan (Codex 26.11.2026).
    const day = PAST[0]!;
    const one = workload(s, day, day, TODAY, { proposal: { state: p.state, ...NEW } });
    expect(one.plan).toBeUndefined();
    expect(one.types.flatMap((t) => t.rows).map((r) => [r.before.count, r.planned])).toEqual([
      [1, 0],
      [0, 0],
    ]);
    const half = workload(s, RANGE.from, '2027-01-08', TODAY, { proposal: { state: p.state, ...NEW } });
    expect(half.plan).toEqual({ from: NEW.from, to: '2027-01-08' });
  });

  it('manglende registreringer: dager uten vakter gir ingen forventning, og uten vakter vises ingen', () => {
    expect(rowsOf(onlyDuties({ ...makeState(), people: [person('a', 'lis'), person('b', 'lis')] }, [S.duty1]))).toEqual([]);
    // Med vakter bare de siste ti dagene er forventningen bare for dem.
    const s = withHistory(onlyDuties({ ...makeState(), people: [person('a', 'lis'), person('b', 'lis')] }, [S.duty1]), S.duty1, [['a', 6], ['b', 4]], PAST.slice(10));
    expect(rowsOf(s).map((r) => [r.before.count, r.before.expected])).toEqual([
      [6, 5],
      [4, 5],
    ]);
  });

  it('fravær uten vaktfritak gir ikke færre forventede vakter, men ferie og innvilget fritak gjør det', () => {
    // b var borte 8 av 20 dager (a hadde vakt da). Uten fritak: 20 vakter delt likt hver dag gir 10 og 10.
    const awayDays = PAST.filter((_, k) => k % 5 < 2);
    const make = (statusId: string, exempt = false) => {
      let s: PlannerState = onlyDuties({ ...makeState(), people: [person('a', 'lis'), person('b', 'lis')] }, [S.duty1]);
      s = { ...s, entries: awayDays.map((date): CalendarEntry => ({ id: `b-${date}`, personId: 'b', date, statusId, ruleVersion: 1, ...(exempt ? { exempt: true } : {}) })) };
      s = withHistory(s, S.duty1, [['a', 8]], awayDays);
      return withHistory(s, S.duty1, [['a', 4], ['b', 8]], PAST.filter((x) => !awayDays.includes(x)));
    };
    for (const statusId of [S.away, S.research, S.teaching, S.timeOff, S.wishOff]) {
      expect(rowsOf(make(statusId)).map((r) => [r.before.count, r.before.expected])).toEqual([
        [12, 10],
        [8, 10],
      ]);
    }
    // Med vaktfritak de 8 dagene får a hele vakten der: a 8 + 12·½ = 14, b 12·½ = 6.
    for (const [statusId, exempt] of [[S.vacation, false], [S.away, true]] as const) {
      expect(rowsOf(make(statusId, exempt)).map((r) => [r.before.count, r.before.expected])).toEqual([
        [12, 14],
        [8, 6],
      ]);
    }
    // Praktisk tilgjengelighet: b var ledig 12 av 20 vaktdager, a alle.
    expect(rowsOf(make(S.research)).map((r) => [r.availability.free, r.availability.days])).toEqual([
      [20, 20],
      [12, 20],
    ]);
  });

  it('stillingskategori, kvalifikasjon og fordelingsvekter: LIS 2, overlege 1 på vakt 1; den uten kvalifikasjon vises ikke', () => {
    let s: PlannerState = onlyDuties({ ...makeState(), people: [person('l', 'lis'), person('o', 'overlege'), person('u', 'lis', [])] }, [S.duty1]);
    s = withHistory(s, S.duty1, [['l', 10], ['o', 5]], PAST.slice(0, 15));
    expect(rowsOf(s).map((r) => [r.personId, r.before.count, round(r.before.expected)])).toEqual([
      ['l', 10, 10],
      ['o', 5, 5],
    ]);
    // Like vekter: 7,5 og 7,5.
    const equal = { ...s, rules: { ...s.rules, staffing: s.rules.staffing.map((r) => ({ ...r, categoryWeights: {} })) } };
    expect(rowsOf(equal).map((r) => r.before.expected)).toEqual([7.5, 7.5]);
  });

  it('historiske endringer: kategori og rollevekter slik de var hver dag', () => {
    // a var LIS frem til 9.11 og er overlege fra 9.11; vektene er LIS 2, overlege 1. 10 dager før (a 2 : b 2) og 10 etter (a 1 : b 2).
    const s0 = withHistory(onlyDuties({ ...makeState(), people: [person('a', 'overlege'), person('b', 'lis')] }, [S.duty1]), S.duty1, [['a', 10], ['b', 10]], PAST);
    const s: PlannerState = { ...s0, peopleHistory: [{ effectiveFrom: '2026-01-01', people: [person('a', 'lis'), person('b', 'lis')] }], peopleFrom: '2026-11-09' };
    // Hver dag for seg: før 9.11 a ½ og b ½ (2 : 2), fra 9.11 a ⅓ og b ⅔ (1 : 2). a 10·½ + 10·⅓ = 25/3, b 10·½ + 10·⅔ = 35/3.
    expect(rowsOf(s).map((r) => round(r.before.expected))).toEqual([round(25 / 3), round(35 / 3)]);
    // Rollevekter endret 9.11 fra like (1:1) til 2:1 (a LIS og b overlege hele tiden).
    const staffing = (w: Record<string, number>): StaffingRequirement[] => s0.rules.staffing.map((r) => (r.statusId === S.duty1 ? { ...r, categoryWeights: w } : r));
    const rules: PlannerState = {
      ...s0,
      people: [person('a', 'lis'), person('b', 'overlege')],
      rules: { ...s0.rules, version: 2, effectiveFrom: '2026-11-09', staffing: staffing({ lis: 2, overlege: 1 }) },
      ruleVersions: [{ ...s0.rules, version: 1, effectiveFrom: '2000-01-01', staffing: staffing({ lis: 1, overlege: 1 }) }],
      ruleVersionSeq: 2,
    };
    // Før 9.11 like (½ hver), fra 9.11 a LIS ⅔ og b overlege ⅓: a 5 + 20/3 = 35/3, b 5 + 10/3 = 25/3.
    expect(rowsOf(rules).map((r) => round(r.before.expected))).toEqual([round(35 / 3), round(25 / 3)]);
  });

  it('oppdateres med kalenderen: en ny vakt endrer tallene med en gang', () => {
    const s = base();
    const next = added(s, d('b', '2026-11-23', S.duty1));
    expect(rowsOf(next).map((r) => [r.before.count, round(r.before.expected)])).toEqual([
      [12, 10.5],
      [9, 10.5],
    ]);
  });

  it('etter-tallene bygger på dagens kalender: angre utenfor forslaget gir ikke vakter som ikke finnes etter godkjenning (ChatGPT 26.11.2026)', () => {
    const JUNE = '2027-06-01';
    const withJune = added(base(), d('a', JUNE, S.duty1));
    const p = proposeAllocation(withJune, 'planner', { ...NEW, mode: 'new' }, TODAY);
    // Angre: juni-vakten er borte igjen. Juni ligger utenfor det forslaget bygger på, så forslaget kan fortsatt godtas.
    const undone = base();
    const accepted = acceptProposal(undone, 'planner', p, TODAY);
    const preview = previewAcceptance(undone, p, TODAY);
    expect(preview).toEqual(accepted);
    expect(accepted.entries.some((e) => e.date === JUNE)).toBe(false);

    const proposal = { state: preview!, ...NEW };
    const june = workload(undone, JUNE, JUNE, TODAY, { proposal }).types.flatMap((t) => t.rows);
    expect(june.map((r) => [r.before.count, r.planned, r.after!.count])).toEqual([]);
    // Over hele tidsrommet stemmer etter-tallene med kalenderen som faktisk blir lagret.
    const all = workload(undone, RANGE.from, JUNE, TODAY, { proposal }).types.find((t) => t.statusId === S.duty1)!.rows;
    const savedCount = (id: string) => accepted.entries.filter((e) => e.personId === id && e.statusId === S.duty1 && e.date >= RANGE.from && e.date <= JUNE).length;
    expect(all.map((r) => r.after!.count)).toEqual(all.map((r) => savedCount(r.personId)));
    // Et foreldet forslag gir ingen forhåndsvisning.
    expect(previewAcceptance(added(undone, d('b', NEW.from, S.duty1)), p, TODAY)).toBeNull();
  });

  it('ugyldig tidsrom avvises', () => {
    expect(() => workload(base(), '2027-01-02', '2027-01-01', TODAY)).toThrow(/slutte på eller etter/);
    expect(() => workload(base(), '2024-01-01', '2027-01-01', TODAY)).toThrow(/høyst/);
  });
});
