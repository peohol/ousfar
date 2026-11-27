import { describe, expect, it } from 'vitest';
import './hjelp';
import { added, d, makeState, onlyDuties, person, workdays } from './fixtures';
import { STATUS_IDS as S } from '@delt/personal/catalog';
import { applyToCells, commitRules, DomainError, removeEntry, setExemption, setStatus, updateDetails, validateRules } from '@delt/personal/commands';
import { analyzeMove, commitMove } from '@delt/personal/move';
import { canTransition, missingAction, PermissionError, ROLES, seesExemptionDetails } from '@delt/personal/permissions';
import { entryAt, isDutyExempt } from '@delt/personal/rules';
import { buildProblem, HISTORY_WINDOW } from '@delt/personal/allocation/model';
import { acceptProposal, explainSlot, proposeAllocation } from '@delt/personal/allocation/proposal';
import { workload } from '@delt/personal/allocation/workload';
import type { PlannerState } from '@delt/personal/types';

/**
 * Vaktfritak (Issue #16): Ferie og Opplæring gir alltid fritak, Borte bare
 * med administrativt fritak innvilget av lokal administrator. Fritaket kan
 * ikke innvilges indirekte, og ingen årsak registreres.
 */

const TODAY = '2026-11-24';
const DAY = '2026-11-26';
const base = (): PlannerState => onlyDuties({ ...makeState(), people: [person('a', 'lis'), person('b', 'lis')] }, [S.duty1]);
const withAway = (s = base(), personId = 'a', date = DAY) => added(s, d(personId, date, S.away));
const idAt = (s: PlannerState, personId: string, date: string) => entryAt(s, personId, date)!.id;
/** Borte for a med innvilget fritak. */
const granted = (): PlannerState => {
  const s = withAway();
  return setExemption(s, 'localAdmin', idAt(s, 'a', DAY), true, TODAY);
};

describe('administrativt vaktfritak', () => {
  it('lokal administrator kan innvilge og trekke tilbake fritak på Borte; ingen årsak lagres', () => {
    const s = withAway();
    const id = idAt(s, 'a', DAY);
    const granted = setExemption(s, 'localAdmin', id, true, TODAY);
    const entry = entryAt(granted, 'a', DAY)!;
    expect(entry.exempt).toBe(true);
    expect(Object.keys(entry).sort()).toEqual(['date', 'exempt', 'id', 'personId', 'ruleVersion', 'statusId']);
    expect(isDutyExempt(granted, entry, TODAY)).toBe(true);
    expect(entryAt(setExemption(granted, 'localAdmin', id, false, TODAY), 'a', DAY)!.exempt).toBeUndefined();
  });

  it('negativt: vaktplanansvarlig, leser og systemarkitekt uten lokal myndighet kan ikke innvilge fritak, heller ikke for seg selv', () => {
    const s = withAway();
    const id = idAt(s, 'a', DAY);
    for (const role of ['planner', 'reader', 'outsideArchitect'] as const) {
      expect(() => setExemption(s, role, id, true, TODAY)).toThrow(PermissionError);
    }
    // Et utkast med fritak gir ikke fritak: setStatus tar ikke imot feltet.
    const sneaky = setStatus(base(), 'planner', { ...d('a', DAY, S.away), exempt: true } as never, { today: TODAY });
    expect(entryAt(sneaky.state, 'a', DAY)!.exempt).toBeUndefined();
  });

  it('bare statuser med administrativt fritak kan få det; ferie og opplæring har det alltid', () => {
    const s = added(added(base(), d('a', DAY, S.research)), d('b', DAY, S.vacation));
    expect(() => setExemption(s, 'localAdmin', idAt(s, 'a', DAY), true, TODAY)).toThrow(/kan ikke ha administrativt vaktfritak/);
    expect(() => setExemption(s, 'localAdmin', idAt(s, 'b', DAY), true, TODAY)).toThrow(DomainError);
    expect(isDutyExempt(s, entryAt(s, 'b', DAY), TODAY)).toBe(true);
    expect(isDutyExempt(s, entryAt(s, 'a', DAY), TODAY)).toBe(false);
  });

  it('kan ikke innvilges indirekte ved flytting, bytte eller flervalg', () => {
    const s = granted();
    const id = idAt(s, 'a', DAY);
    // Flytting til en annen person eller dato: fritaket følger ikke med, uansett rolle.
    for (const role of ['planner', 'localAdmin'] as const) {
      for (const to of [{ personId: 'b', date: DAY }, { personId: 'a', date: '2026-11-27' }]) {
        const moved = commitMove(s, role, id, to, 'move', TODAY).state;
        expect(entryAt(moved, to.personId, to.date)).toMatchObject({ statusId: S.away });
        expect(entryAt(moved, to.personId, to.date)!.exempt).toBeUndefined();
      }
    }
    // Bytte med en annen Borte: ingen av dem har fritak etterpå.
    const both = withAway(s, 'b', '2026-11-27');
    const swap = analyzeMove(both, 'planner', id, { personId: 'b', date: '2026-11-27' }, TODAY).options.find((o) => o.kind === 'swap')!;
    expect(swap.state.entries.filter((e) => e.exempt)).toEqual([]);
    // Flervalg («kopiering») setter vanlig Borte uten fritak.
    const bulk = applyToCells(base(), 'planner', [{ personId: 'a', date: DAY }, { personId: 'b', date: DAY }], { type: 'set', statusId: S.away }, { today: TODAY });
    expect(bulk.state.entries.filter((e) => e.exempt)).toEqual([]);
  });

  it('fritaket beholdes når merknad eller klokkeslett endres, og forsvinner når statusen erstattes eller slettes', () => {
    const s = granted();
    const id = idAt(s, 'a', DAY);
    expect(entryAt(updateDetails(s, 'planner', id, { note: 'Tilbake fredag' }, TODAY).state, 'a', DAY)!.exempt).toBe(true);
    expect(entryAt(setStatus(s, 'planner', d('a', DAY, S.timeOff), { today: TODAY }).state, 'a', DAY)!.exempt).toBeUndefined();
    expect(removeEntry(s, 'planner', id, TODAY).state.entries).toEqual([]);
  });

  it('en endring som gir et fritak tilbake (som angre), krever myndighet', () => {
    const s0 = withAway();
    const s1 = setExemption(s0, 'localAdmin', idAt(s0, 'a', DAY), true, TODAY);
    // Gjør om innvilgelsen, eller angre tilbaketrekkingen: bare lokal administrator.
    expect(missingAction('planner', s0, s1)).toBe('manageExemption');
    expect(missingAction('planner', s1, s0)).toBe('manageExemption');
    expect(canTransition('localAdmin', s0, s1)).toBe(true);
    // Vaktplanansvarlig sletter Borte med fritak. Å angre det ville gitt fritaket tilbake.
    const deleted = removeEntry(s1, 'planner', idAt(s1, 'a', DAY), TODAY).state;
    expect(canTransition('planner', s1, deleted)).toBe(true);
    expect(missingAction('planner', deleted, s1)).toBe('manageExemption');
  });

  it('et fritaksflagg på en status som ikke kan ha det, gir ikke vaktfritak', () => {
    const s = added(base(), d('a', DAY, S.research));
    const bad: PlannerState = { ...s, entries: s.entries.map((e) => ({ ...e, exempt: true })) };
    expect(isDutyExempt(bad, entryAt(bad, 'a', DAY), TODAY)).toBe(false);
    expect(isDutyExempt(granted(), entryAt(granted(), 'a', DAY), TODAY)).toBe(true);
  });

  it('regler: en vakt eller en status med bemanningsbehov kan ikke gi vaktfritak', () => {
    const s = base();
    const rules = { ...s.rules, statuses: s.rules.statuses.map((x) => (x.id === S.duty1 ? { ...x, dutyExemption: 'always' as const } : x)) };
    expect(validateRules(rules).join(' ')).toContain('kan ikke gi vaktfritak');
    expect(() => commitRules(s, 'localAdmin', rules, TODAY)).toThrow(DomainError);
  });
});

describe('vaktfritak i forventet vaktbelastning', () => {
  const TEN = workdays('2027-01-04', '2027-01-15');
  const req = { from: TEN[0]!, to: TEN[9]!, mode: 'new' as const };
  const targetsWith = (statusId: string, exempt = false) => {
    let s = base();
    for (const day of TEN.slice(0, 4)) s = added(s, d('a', day, statusId));
    if (exempt) s = s.entries.reduce((acc, e) => setExemption(acc, 'localAdmin', e.id, true, TODAY), s);
    return buildProblem(s, req, TODAY).targets[HISTORY_WINDOW]![0]!.map((x) => Math.round(x * 1000) / 1000);
  };

  it('eksempel 2 og 3: ferie, opplæring og innvilget fritak gir 3 og 7; forskning og vanlig Borte gir 5 og 5', () => {
    expect(targetsWith(S.vacation)).toEqual([3, 7]);
    expect(targetsWith(S.training)).toEqual([3, 7]);
    expect(targetsWith(S.away, true)).toEqual([3, 7]);
    expect(targetsWith(S.research)).toEqual([5, 5]);
    expect(targetsWith(S.away)).toEqual([5, 5]);
  });

  it('ferie skaper ikke vaktgjeld: etter en plan med ferie er avviket null og neste plan deler likt', () => {
    let s = base();
    for (const day of TEN.slice(0, 4)) s = added(s, d('a', day, S.vacation));
    const first = acceptProposal(s, 'planner', proposeAllocation(s, 'planner', req, TODAY), TODAY);
    const rows = workload(first, TEN[0]!, TEN[9]!, TODAY).types[0]!.rows;
    expect(rows.map((r) => [r.before.count, Math.round(r.before.expected! * 1000) / 1000])).toEqual([
      [3, 3],
      [7, 7],
    ]);
    const next = workdays('2027-01-18', '2027-01-29');
    const p = proposeAllocation(first, 'planner', { from: next[0]!, to: next[9]!, mode: 'new' }, TODAY);
    const count = (id: string) => p.state.entries.filter((e) => e.personId === id && e.date >= next[0]! && e.date <= next[9]!).length;
    expect([count('a'), count('b')]).toEqual([5, 5]);
  });

  it('vakter registrert før i dag teller som før; manglende vakter gir ingen vaktgjeld', () => {
    // Ferie bakover i tid uten registrerte vakter: ingen forventning der.
    let s = base();
    for (const day of workdays('2026-11-02', '2026-11-06')) s = added(s, d('a', day, S.vacation));
    expect(workload(s, '2026-11-02', '2026-11-06', TODAY).types[0]!.rows).toEqual([]);
  });
});

describe('skjermet vaktfritak i lesemodellen', () => {
  // To likt stilte, én vakt 1 på én dag. a er Borte og b har vakten; bare fritaket skiller de to kalenderne.
  const plain = () => added(withAway(), d('b', DAY, S.duty1));
  const exempt = () => {
    const s = plain();
    return setExemption(s, 'localAdmin', idAt(s, 'a', DAY), true, TODAY);
  };
  const view = (s: PlannerState, role: (typeof ROLES)[number]) => workload(s, DAY, DAY, TODAY, { exemptionDetails: seesExemptionDetails(role) });

  it('bare lokal administrator har myndigheten', () => {
    expect(ROLES.filter(seesExemptionDetails)).toEqual(['localAdmin']);
  });

  it('med myndighet: forventet antall viser fritaket (½ og ½ uten, 0 og 1 med)', () => {
    const exp = (s: PlannerState) => view(s, 'localAdmin').types[0]!.rows.map((r) => r.before.expected);
    expect(exp(plain())).toEqual([0.5, 0.5]);
    expect(exp(exempt())).toEqual([0, 1]);
  });

  it('negativt: leser og vaktplanansvarlig får nøyaktig samme oversikt med og uten fritak, uten forventet antall', () => {
    for (const role of ['reader', 'planner'] as const) {
      const without = view(plain(), role);
      expect(view(exempt(), role)).toEqual(without);
      expect(without.exemptionDetails).toBe(false);
      const rows = without.types[0]!.rows;
      // Begge er med (utvalget avhenger ikke av fritak), med vakttall, vaktandel og ledige dager, men uten forventet antall.
      expect(rows.map((r) => [r.personId, r.before.count, r.before.expected, r.availability.free])).toEqual([
        ['a', 0, null, 0],
        ['b', 1, null, 1],
      ]);
    }
  });

  it('negativt: også over lengre tidsrom med et forslag er oversikten uten myndighet lik med og uten fritak', () => {
    const range = { from: '2026-11-23', to: '2026-12-04' };
    const withProposal = (s: PlannerState) => {
      const p = proposeAllocation(s, 'planner', { from: '2026-11-30', to: range.to, mode: 'new' }, TODAY);
      return workload(s, range.from, range.to, TODAY, { proposal: { state: p.state, from: '2026-11-30', to: range.to }, exemptionDetails: false });
    };
    const a = withProposal(plain());
    expect(withProposal(exempt())).toEqual(a);
    expect(a.types[0]!.rows.every((r) => r.before.expected === null && r.after!.expected === null)).toBe(true);
  });

  it('vurderingen av kandidatene har uten myndighet verken tall eller rekkefølge etter tall', () => {
    const s = onlyDuties({ ...makeState(), people: [person('c', 'lis'), person('b', 'lis'), person('a', 'lis')] }, [S.duty1]);
    const p = proposeAllocation(s, 'planner', { from: '2026-11-30', to: '2026-12-04', mode: 'new' }, TODAY);
    const slot = p.changes.find((c) => c.slot !== undefined)!.slot!;
    const brief = explainSlot(p, slot, { detailed: false });
    expect(brief.every((r) => r.delta === undefined && r.breakdown === undefined)).toBe(true);
    const possible = brief.filter((r) => r.verdict === 'possible').map((r) => r.name);
    expect(possible).toEqual([...possible].sort((x, y) => x.localeCompare(y, 'nb')));
    expect(explainSlot(p, slot).some((r) => r.delta !== undefined)).toBe(true);
  });
});
