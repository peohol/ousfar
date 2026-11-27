import { describe, expect, it } from 'vitest';
import './hjelp';
import { added, d, makeState, onlyDuties, person, withHistory, workdays } from './fixtures';
import { STATUS_IDS as S } from '@delt/personal/catalog';
import { DomainError } from '@delt/personal/commands';
import {
  changesPast,
  dutySharePercentAt,
  dutySharesChangePast,
  dutyScheduleOf,
  dutyShareTimeline,
  PAST_CHANGE_MESSAGE,
  periodTense,
  removeOrdinaryDutyShare,
  removeTemporaryDutyShare,
  setOrdinaryDutyShare,
  upsertTemporaryDutyShare,
  validateDutySchedule,
} from '@delt/personal/dutyShare';
import { canTransition, missingAction, PermissionError } from '@delt/personal/permissions';
import { buildProblem, HISTORY_WINDOW } from '@delt/personal/allocation/model';
import { aboveCatchUpGoal, explainSlot, proposeAllocation, setEntryLocked } from '@delt/personal/allocation/proposal';
import { workload } from '@delt/personal/allocation/workload';
import type { DutyShareSchedule, PlannerState } from '@delt/personal/types';

/**
 * Individuell vaktandel (Issue #16): ordinær vaktandel fra en dato,
 * midlertidige perioder, historikk og 0 %. Fasit regnet for hånd.
 */

const TODAY = '2026-11-24';
const base = (): PlannerState => onlyDuties({ ...makeState(), people: [person('a', 'lis'), person('b', 'lis')] }, [S.duty1]);
const pct = (s: PlannerState, date: string, id = 'a') => dutySharePercentAt(dutyScheduleOf(s, id), date);

describe('vaktandel over tid', () => {
  it('standard er 100 %, også for en medarbeider uten registrert vaktandel', () => {
    expect(pct(base(), '2026-01-01')).toBe(100);
    expect(dutyScheduleOf(base(), 'a')).toEqual({ ordinary: [], temporary: [] });
  });

  it('ordinær vaktandel gjelder fra datoen og på ubestemt tid; en senere ordinær tar over', () => {
    let s = setOrdinaryDutyShare(base(), 'planner', 'a', '2026-12-01', 60, TODAY);
    s = setOrdinaryDutyShare(s, 'planner', 'a', '2027-03-01', 80, TODAY);
    expect([pct(s, '2026-11-30'), pct(s, '2026-12-01'), pct(s, '2027-02-28'), pct(s, '2027-03-01'), pct(s, '2030-01-01')]).toEqual([100, 60, 60, 80, 80]);
    // Samme dato erstatter.
    s = setOrdinaryDutyShare(s, 'planner', 'a', '2027-03-01', 90, TODAY);
    expect(dutyScheduleOf(s, 'a').ordinary).toEqual([
      { from: '2026-12-01', percent: 60 },
      { from: '2027-03-01', percent: 90 },
    ]);
    // En fremtidig ordinær kan fjernes; den forrige gjelder videre.
    s = removeOrdinaryDutyShare(s, 'planner', 'a', '2027-03-01', TODAY);
    expect(pct(s, '2030-01-01')).toBe(60);
  });

  it('midlertidig periode: begge datoer med, og etterpå gjeninnføres den ordinære som gjelder da', () => {
    let s = setOrdinaryDutyShare(base(), 'planner', 'a', '2027-02-01', 80, TODAY);
    s = upsertTemporaryDutyShare(s, 'planner', 'a', { from: '2027-01-10', to: '2027-02-10', percent: 50 }, TODAY);
    expect([pct(s, '2027-01-09'), pct(s, '2027-01-10'), pct(s, '2027-02-10'), pct(s, '2027-02-11')]).toEqual([100, 50, 50, 80]);
    expect(dutyShareTimeline(dutyScheduleOf(s, 'a'), '2026-11-01')).toEqual([
      { from: '2026-11-01', to: '2027-01-09', percent: 100 },
      { from: '2027-01-10', to: '2027-02-10', percent: 50, temporaryId: dutyScheduleOf(s, 'a').temporary[0]!.id },
      { from: '2027-02-11', percent: 80 },
    ]);
  });

  it('overlappende midlertidige perioder avvises, også når bare én dag overlapper; inntil hverandre er lov', () => {
    const s = upsertTemporaryDutyShare(base(), 'planner', 'a', { from: '2027-01-10', to: '2027-01-20', percent: 50 }, TODAY);
    expect(() => upsertTemporaryDutyShare(s, 'planner', 'a', { from: '2027-01-20', to: '2027-01-25', percent: 40 }, TODAY)).toThrow(/overlappe/);
    expect(() => upsertTemporaryDutyShare(s, 'planner', 'a', { from: '2027-01-01', to: '2027-01-31', percent: 40 }, TODAY)).toThrow(/overlappe/);
    const next = upsertTemporaryDutyShare(s, 'planner', 'a', { from: '2027-01-21', to: '2027-01-25', percent: 40 }, TODAY);
    expect(dutyScheduleOf(next, 'a').temporary).toHaveLength(2);
    // Redigering av samme periode overlapper ikke med seg selv.
    const id = dutyScheduleOf(s, 'a').temporary[0]!.id;
    expect(pct(upsertTemporaryDutyShare(s, 'planner', 'a', { id, from: '2027-01-10', to: '2027-01-22', percent: 30 }, TODAY), '2027-01-22')).toBe(30);
  });

  it('ugyldige verdier avvises: utenfor 0–100, desimaler, tildato før fradato', () => {
    for (const percent of [-1, 101, 50.5, Number.NaN]) expect(() => setOrdinaryDutyShare(base(), 'planner', 'a', TODAY, percent, TODAY)).toThrow(DomainError);
    expect(() => upsertTemporaryDutyShare(base(), 'planner', 'a', { from: '2027-01-10', to: '2027-01-09', percent: 50 }, TODAY)).toThrow(/Tildatoen/);
    expect(validateDutySchedule({ ordinary: [{ from: '2027-01-01', percent: 50 }, { from: '2027-01-01', percent: 60 }], temporary: [] })).not.toEqual([]);
    expect(() => setOrdinaryDutyShare(base(), 'planner', 'ukjent', TODAY, 50, TODAY)).toThrow(/Ukjent medarbeider/);
  });

  it('historikk bevares: tidligere dager kan aldri få en annen vaktandel', () => {
    let s = upsertTemporaryDutyShare(base(), 'planner', 'a', { from: '2026-12-01', to: '2026-12-31', percent: 50 }, '2026-11-01');
    s = setOrdinaryDutyShare(s, 'planner', 'a', '2026-11-10', 70, '2026-11-01');
    // I dag er 24.11.: ordinær fra en tidligere dato avvises, og den fra 10.11. kan ikke fjernes.
    expect(() => setOrdinaryDutyShare(s, 'planner', 'a', '2026-11-20', 60, TODAY)).toThrow(PAST_CHANGE_MESSAGE);
    expect(() => removeOrdinaryDutyShare(s, 'planner', 'a', '2026-11-10', TODAY)).toThrow(PAST_CHANGE_MESSAGE);
    // En ordinær vaktandel fra i dag er lov.
    expect(pct(setOrdinaryDutyShare(s, 'planner', 'a', TODAY, 60, TODAY), TODAY)).toBe(60);
    // En pågående periode kan avsluttes tidligst i går; å flytte starten bakover avvises.
    const id = dutyScheduleOf(s, 'a').temporary[0]!.id;
    const dec10 = '2026-12-10';
    expect(() => upsertTemporaryDutyShare(s, 'planner', 'a', { id, from: '2026-11-25', to: '2026-12-31', percent: 50 }, dec10)).toThrow(PAST_CHANGE_MESSAGE);
    expect(() => upsertTemporaryDutyShare(s, 'planner', 'a', { id, from: '2026-12-01', to: '2026-12-05', percent: 50 }, dec10)).toThrow(PAST_CHANGE_MESSAGE);
    const ended = upsertTemporaryDutyShare(s, 'planner', 'a', { id, from: '2026-12-01', to: '2026-12-09', percent: 50 }, dec10);
    expect([pct(ended, '2026-12-09'), pct(ended, dec10)]).toEqual([50, 70]);
    // Å fjerne en pågående periode avslutter den i går; en avsluttet kan ikke fjernes.
    const removed = removeTemporaryDutyShare(s, 'planner', 'a', id, dec10);
    expect(dutyScheduleOf(removed, 'a').temporary[0]).toMatchObject({ from: '2026-12-01', to: '2026-12-09' });
    expect(() => removeTemporaryDutyShare(s, 'planner', 'a', id, '2027-01-05')).toThrow(/avsluttet/);
    // En fremtidig periode fjernes helt.
    expect(dutyScheduleOf(removeTemporaryDutyShare(s, 'planner', 'a', id, TODAY), 'a').temporary).toEqual([]);
  });

  it('changesPast sammenligner hele fortiden, også dager mellom bruddpunktene', () => {
    const a: DutyShareSchedule = { ordinary: [{ from: '2026-01-01', percent: 80 }], temporary: [] };
    const b: DutyShareSchedule = { ordinary: [{ from: '2026-01-01', percent: 80 }], temporary: [{ id: 't', from: '2026-05-01', to: '2026-05-02', percent: 0 }] };
    expect(changesPast(a, b, '2026-05-01')).toBe(false);
    expect(changesPast(a, b, '2026-05-02')).toBe(true);
    expect(changesPast(a, { ordinary: [], temporary: [] }, '2025-12-31')).toBe(false);
    expect(changesPast(a, { ordinary: [], temporary: [] }, '2026-01-02')).toBe(true);
  });

  it('periodene vises som tidligere, gjeldende og fremtidige', () => {
    expect(periodTense({ from: '2026-01-01', to: '2026-11-23' }, TODAY)).toBe('past');
    expect(periodTense({ from: '2026-01-01', to: TODAY }, TODAY)).toBe('current');
    expect(periodTense({ from: TODAY }, TODAY)).toBe('current');
    expect(periodTense({ from: '2026-11-25' }, TODAY)).toBe('future');
  });
});

describe('vaktandel og tilgang', () => {
  it('vaktplanansvarlig og lokal administrator kan endre vaktandel; leser og systemarkitekt uten lokal myndighet kan ikke', () => {
    expect(pct(setOrdinaryDutyShare(base(), 'planner', 'a', TODAY, 50, TODAY), TODAY)).toBe(50);
    expect(pct(setOrdinaryDutyShare(base(), 'localAdmin', 'a', TODAY, 50, TODAY), TODAY)).toBe(50);
    for (const role of ['reader', 'outsideArchitect'] as const) {
      expect(() => setOrdinaryDutyShare(base(), role, 'a', TODAY, 50, TODAY)).toThrow(PermissionError);
      expect(() => upsertTemporaryDutyShare(base(), role, 'a', { from: TODAY, to: TODAY, percent: 50 }, TODAY)).toThrow(PermissionError);
    }
  });

  it('angre og gjør om av en endret vaktandel krever samme rettighet', () => {
    const s0 = base();
    const s1 = setOrdinaryDutyShare(s0, 'planner', 'a', TODAY, 50, TODAY);
    expect(canTransition('planner', s1, s0)).toBe(true);
    expect(missingAction('reader', s1, s0)).toBe('editDutyShare');
  });
});

describe('vaktandel i fordelingen', () => {
  const DAYS = workdays('2027-01-04', '2027-01-15');
  const req = { from: DAYS[0]!, to: DAYS[DAYS.length - 1]!, mode: 'new' as const };

  it('0 % utelukker automatisk vakttildeling og gir ingen forventning, med årsak i forklaringen', () => {
    const s = upsertTemporaryDutyShare(base(), 'planner', 'a', { from: DAYS[0]!, to: DAYS[DAYS.length - 1]!, percent: 0 }, TODAY);
    const p = proposeAllocation(s, 'planner', req, TODAY);
    expect(p.state.entries.filter((e) => e.personId === 'a')).toEqual([]);
    expect(p.problem.targets[HISTORY_WINDOW]![0]).toEqual([0, 10]);
    const why = explainSlot(p, 0).find((c) => c.personId === 'a')!;
    expect(why).toMatchObject({ verdict: 'blocked', group: 'Vaktandel 0 %' });
  });

  it('låste, publiserte og manuelle vakter står, en dag uten dekning blir udekket, og forventningen følger vaktandelen', () => {
    // a 50 %, b 100 %: hver dag ⅓ og ⅔, uansett kalender. b har en låst vakt dag 1; a en manuell vakt dag 2,
    // og planen er publisert til og med dag 3. Dag 6 er begge borte (uten fritak).
    let s = setOrdinaryDutyShare(base(), 'planner', 'a', TODAY, 50, TODAY);
    s = added(s, d('b', DAYS[0]!, S.duty1));
    s = setEntryLocked(s, 'planner', s.entries.find((e) => e.date === DAYS[0])!.id, true);
    s = added(s, d('a', DAYS[1]!, S.duty1));
    s = { ...added(added(s, d('a', DAYS[5]!, S.away)), d('b', DAYS[5]!, S.away)), publishedThrough: DAYS[2]! };
    const p = proposeAllocation(s, 'planner', req, TODAY);
    const kept = (date: string) => p.state.entries.filter((e) => e.date === date);
    expect(kept(DAYS[0]!)).toEqual(s.entries.filter((e) => e.date === DAYS[0]));
    expect(kept(DAYS[1]!)).toEqual(s.entries.filter((e) => e.date === DAYS[1]));
    expect(kept(DAYS[2]!)).toEqual([]);
    expect(p.uncovered.map((u) => u.date)).toEqual([DAYS[5]]);
    const [ta, tb] = p.problem.targets[HISTORY_WINDOW]![0]!;
    expect(tb!).toBeCloseTo(2 * ta!, 6);
  });

  it('taket på ekstra utjevning: ingen får mer enn 50 % ekstra, og ingen får et mål under null i perioden', () => {
    // a og b 90 %, c 20 %: i perioden forventet 4,5, 4,5 og 1. Tidligere 20 dager hadde c alle vaktene
    // (forventet 9, 9 og 2), så c ligger 18 over. a og b kan ta igjen høyst 2,25 hver; c gir fra seg høyst sin ene.
    let s = onlyDuties({ ...makeState(), people: [person('a', 'lis'), person('b', 'lis'), person('c', 'lis')] }, [S.duty1]);
    s = { ...s, dutyShares: { a: { ordinary: [{ from: '2000-01-01', percent: 90 }], temporary: [] }, b: { ordinary: [{ from: '2000-01-01', percent: 90 }], temporary: [] }, c: { ordinary: [{ from: '2000-01-01', percent: 20 }], temporary: [] } } };
    s = withHistory(s, S.duty1, [['c', 20]], workdays('2026-10-26', '2026-11-20'));
    const pr = buildProblem(s, req, TODAY);
    const before = [0, 0, 20];
    const inPeriod = pr.historyGoals[0]!.map((g, i) => g - before[i]!);
    expect(inPeriod.map((x) => Math.round(x * 1000) / 1000)).toEqual([5, 5, 0]);
    expect(inPeriod.reduce((n, x) => n + x, 0)).toBeCloseTo(10, 6);
  });

  it('taket begrenser målet, ikke faktisk antall: dekning går foran, og overskridelsen vises', () => {
    // To likt stilte, ti vakter på ti dager. b har forskning alle dagene (ikke vaktfritak), så begge
    // forventes å ha 5. Selv med 50 % tak får a alle 10 for å dekke behovet.
    let s = base();
    for (const day of DAYS.slice(0, 10)) s = added(s, d('b', day, S.research));
    const ten = { ...req, to: DAYS[9]! };
    const p = proposeAllocation(s, 'planner', ten, TODAY);
    expect(p.uncovered).toEqual([]);
    const row = (id: string) => p.fairness.find((r) => r.personId === id)!;
    expect([row('a').target, row('b').target]).toEqual([5, 5]);
    expect([row('a').count, row('b').count]).toEqual([10, 0]);
    // Målet for a er høyst 5 + 50 % av 5 (her ingen tidligere skjevhet, så 5).
    expect(row('a').historyGoal).toBeCloseTo(5, 6);
    expect(aboveCatchUpGoal(p).map((r) => [r.personId, r.historyCount])).toEqual([['a', 10]]);
    // Uten konflikt er ingen over målet.
    expect(aboveCatchUpGoal(proposeAllocation(base(), 'planner', ten, TODAY))).toEqual([]);
  });

  it('en datoovergang midt i perioden regnes dag for dag', () => {
    // a 50 % de første fire dagene, så 100 %: 4 · ⅓ + 6 · ½ = 13/3.
    const s = upsertTemporaryDutyShare(base(), 'planner', 'a', { from: DAYS[0]!, to: DAYS[3]!, percent: 50 }, TODAY);
    const t = buildProblem(s, req, TODAY).targets[HISTORY_WINDOW]![0]!;
    expect(t[0]).toBeCloseTo(4 / 3 + 3, 6);
    expect(t[1]).toBeCloseTo(4 * (2 / 3) + 3, 6);
  });

  it('en endret vaktandel omskriver ikke tidligere forventet vaktbelastning', () => {
    // 10 tidligere vakter delt likt (5 og 5). a går ned til 50 % fra i dag.
    const past = workdays('2026-11-09', '2026-11-20');
    let s = base();
    s = { ...s, entries: past.map((date, k) => ({ id: `h${k}`, personId: k % 2 ? 'b' : 'a', date, statusId: S.duty1, ruleVersion: 1 })) };
    const before = workload(s, past[0]!, past[past.length - 1]!, TODAY).types[0]!.rows.map((r) => r.before.expected);
    const after = setOrdinaryDutyShare(s, 'planner', 'a', TODAY, 50, TODAY);
    expect(workload(after, past[0]!, past[past.length - 1]!, TODAY).types[0]!.rows.map((r) => r.before.expected)).toEqual(before);
    expect(before).toEqual([5, 5]);
  });

  it('oversikten viser vaktandelen i tidsrommet, også når den varierer', () => {
    const s = upsertTemporaryDutyShare(base(), 'planner', 'a', { from: '2027-01-06', to: '2027-01-08', percent: 40 }, TODAY);
    const p = proposeAllocation(s, 'planner', req, TODAY);
    const row = workload(s, req.from, req.to, TODAY, { proposal: { state: p.state, from: req.from, to: req.to } }).types[0]!.rows.find((r) => r.personId === 'a')!;
    expect(row.share).toMatchObject({ min: 40, max: 100 });
    expect(row.share.segments.map((x) => x.percent)).toEqual([100, 40, 100]);
  });
});

describe('tidligere vaktandeler ved angre og gjør om', () => {
  // Kontrollen som brukes for hver lagret endring og ved angre og gjør om (store.tsx), med datoen da det utføres.
  const DAY1 = '2026-11-24';
  const DAY2 = '2026-11-25';
  const DAY3 = '2026-11-26';

  it('angre etter at virkningsdatoen har passert, avvises; før den har passert, er det lov', () => {
    const before = base();
    const fromToday = setOrdinaryDutyShare(before, 'planner', 'a', DAY1, 60, DAY1);
    // Samme dag: angre er lov.
    expect(dutySharesChangePast(fromToday, before, DAY1)).toBe(false);
    // Neste dag: angre ville gitt 24.11 100 % igjen.
    expect(dutySharesChangePast(fromToday, before, DAY2)).toBe(true);
    // En endring som gjelder fra 26.11, kan angres 25.11, men ikke 27.11.
    const later = setOrdinaryDutyShare(before, 'planner', 'a', DAY3, 60, DAY1);
    expect(dutySharesChangePast(later, before, DAY2)).toBe(false);
    expect(dutySharesChangePast(later, before, '2026-11-27')).toBe(true);
  });

  it('gjør om etter at virkningsdatoen har passert, avvises', () => {
    const before = base();
    const fromTomorrow = upsertTemporaryDutyShare(before, 'planner', 'a', { from: DAY2, to: DAY3, percent: 0 }, DAY1);
    expect(dutySharesChangePast(before, fromTomorrow, DAY2)).toBe(false);
    expect(dutySharesChangePast(before, fromTomorrow, DAY3)).toBe(true);
  });

  it('endringer som ikke gjelder vaktandel, eller bare gjelder fremtiden, slipper gjennom', () => {
    const s = base();
    expect(dutySharesChangePast(s, { ...s, entries: [] } as PlannerState, DAY3)).toBe(false);
    const future = setOrdinaryDutyShare(s, 'planner', 'b', '2027-01-01', 0, DAY1);
    expect(dutySharesChangePast(s, future, DAY3)).toBe(false);
  });
});
