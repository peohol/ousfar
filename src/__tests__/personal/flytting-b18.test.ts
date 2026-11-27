import { describe, expect, it } from 'vitest';
import './hjelp';
import { added, d, makeState } from './fixtures';
import { STATUS_IDS as S } from '@delt/personal/catalog';
import { setStaffing, setExemption, DomainError } from '@delt/personal/commands';
import { setEntryLocked } from '@delt/personal/allocation/index';
import { PermissionError } from '@delt/personal/permissions';
import {
  analyzeDateMove,
  analyzeMove,
  analyzePresenceMove,
  commitDateMove,
  commitPresenceMove,
  describeMove,
  presenceDraggable,
} from '@delt/personal/move';
import { entryAt, entryProblems, isDutyExempt } from '@delt/personal/rules';
import type { PlannerState } from '@delt/personal/types';

/**
 * Flytteregler etter B18 (personal-design.md §4, akseptmatrisen A-FLY-01–07
 * og A-UX-04). «I dag» er tirsdag 24.11.2026 (TEST_TODAY). Bare syntetiske
 * medarbeidere: f1 Kari Prøvesen (A) og f4 Per Hansen (B) er kvalifisert for
 * begge vaktene.
 */

const TODAY = '2026-11-24';
const MON = '2026-11-30';
const TUE = '2026-12-01';
const THU = '2026-12-03';
const SAT = '2026-12-05';

const idAt = (s: PlannerState, personId: string, date: string) => entryAt(s, personId, date)!.id;
const cell = (s: PlannerState, personId: string, date: string) => {
  const e = entryAt(s, personId, date);
  return e && { statusId: e.statusId, note: e.note, locked: e.locked, exempt: e.exempt };
};
const allValid = (s: PlannerState) => s.entries.every((e) => entryProblems(s, e, TODAY).length === 0);

/** A-UX-04: A har Vakt 1 mandag, B har Vakt 1 torsdag, hver med sin merknad. */
function fasit(): PlannerState {
  let s = added(makeState(), d('f1', MON, S.duty1, { note: 'Vakttelefon A' }));
  s = added(s, d('f4', THU, S.duty1, { note: 'Vakttelefon B' }));
  return s;
}

describe('månedsvisningen: personen med statusen til en ny dato (A-UX-04, A-FLY-07)', () => {
  it('full vakttype gir bare de uttrykkelige valgene «Bytt vaktdager» og «Overta vakten», og analysen endrer ingenting', () => {
    const s = fasit();
    const before = structuredClone(s);
    const a = analyzeDateMove(s, 'planner', idAt(s, 'f1', MON), THU, TODAY);
    expect(a.outcome).toBe('conflict');
    expect(a.counterparts.map((e) => e.personId)).toEqual(['f4']);
    expect(a.options.map((o) => o.kind).sort()).toEqual(['swapDates', 'takeOver']);
    // Avbryt er å ikke lagre noe: kalenderen er uendret.
    expect(s).toEqual(before);
  });

  it('Bytt vaktdager: B får mandag og A torsdag, og hver merknad følger sin vakt', () => {
    const s = fasit();
    const r = commitDateMove(s, 'planner', idAt(s, 'f1', MON), THU, 'swapDates', undefined, TODAY);
    expect(cell(r.state, 'f4', MON)).toMatchObject({ statusId: S.duty1, note: 'Vakttelefon B' });
    expect(cell(r.state, 'f1', THU)).toMatchObject({ statusId: S.duty1, note: 'Vakttelefon A' });
    expect(entryAt(r.state, 'f1', MON)).toBeUndefined();
    expect(entryAt(r.state, 'f4', THU)).toBeUndefined();
    expect(r.state.entries).toHaveLength(2);
    expect(r.removed).toEqual([]);
    expect(r.uncovered).toEqual([]);
    expect(allValid(r.state)).toBe(true);
    expect(describeMove(s, { entry: s.entries[0]!, to: { personId: 'f1', date: THU } }, 'swapDates', r.counterpart)).toContain('byttet vaktdager');
  });

  it('Overta vakten: mandag blir udekket, A har torsdag, Bs vakt torsdag forsvinner og vises som konsekvens', () => {
    const s = fasit();
    const b = entryAt(s, 'f4', THU)!;
    const r = commitDateMove(s, 'planner', idAt(s, 'f1', MON), THU, 'takeOver', undefined, TODAY);
    expect(entryAt(r.state, 'f1', MON)).toBeUndefined();
    expect(cell(r.state, 'f1', THU)).toMatchObject({ statusId: S.duty1, note: 'Vakttelefon A' });
    expect(entryAt(r.state, 'f4', THU)).toBeUndefined();
    expect(r.removed).toEqual([b]);
    expect(r.uncovered.map((u) => [u.date, u.statusId, u.missingAfter])).toEqual([[MON, S.duty1, 1]]);
  });

  it('ingen delvis endring: et valg gjort mot en eldre kalender lagres ikke', () => {
    const s = fasit();
    const id = idAt(s, 'f1', MON);
    // En annen har i mellomtiden fjernet Bs vakt torsdag: da finnes det ingen motpart å bytte med.
    const newer: PlannerState = { ...s, entries: s.entries.filter((e) => e.personId !== 'f4') };
    expect(() => commitDateMove(newer, 'planner', id, THU, 'swapDates', undefined, TODAY)).toThrow(DomainError);
    expect(commitDateMove(newer, 'planner', id, THU, 'move', undefined, TODAY).kind).toBe('move');
  });

  it('lås følger hver sin vakt; administrativt vaktfritak følger aldri med', () => {
    let s = fasit();
    s = setEntryLocked(s, 'planner', idAt(s, 'f4', THU), true);
    const swapped = commitDateMove(s, 'planner', idAt(s, 'f1', MON), THU, 'swapDates', undefined, TODAY).state;
    expect(cell(swapped, 'f4', MON)!.locked).toBe(true);
    expect(cell(swapped, 'f1', THU)!.locked).toBeUndefined();

    let away = added(makeState(), d('f1', MON, S.away));
    away = setExemption(away, 'localAdmin', idAt(away, 'f1', MON), true, TODAY);
    expect(isDutyExempt(away, entryAt(away, 'f1', MON), TODAY)).toBe(true);
    const movedAway = commitDateMove(away, 'planner', idAt(away, 'f1', MON), TUE, 'move', undefined, TODAY).state;
    expect(cell(movedAway, 'f1', TUE)).toMatchObject({ statusId: S.away, exempt: undefined });
    expect(isDutyExempt(movedAway, entryAt(movedAway, 'f1', TUE), TODAY)).toBe(false);
  });

  it('uten konflikt er det en vanlig flytting til personens egen celle, med de vanlige reglene', () => {
    const s = fasit();
    const ok = analyzeDateMove(s, 'planner', idAt(s, 'f1', MON), TUE, TODAY);
    expect(ok.outcome).toBe('ok');
    expect(ok.counterparts).toEqual([]);
    // Vakt på lørdag er ikke en arbeidsdag i piloten og avvises med grunn.
    const weekend = analyzeDateMove(s, 'planner', idAt(s, 'f1', MON), SAT, TODAY);
    expect(weekend.outcome).toBe('rejected');
    expect(weekend.reasons.length).toBeGreaterThan(0);
  });

  it('statuser personene har på datoene de flyttes til, erstattes bare synlig (vises som fjernet)', () => {
    let s = fasit();
    s = added(s, d('f4', MON, S.homeOffice));
    s = added(s, d('f1', THU, S.research));
    const r = commitDateMove(s, 'planner', idAt(s, 'f1', MON), THU, 'swapDates', undefined, TODAY);
    expect(r.removed.map((e) => [e.personId, e.statusId]).sort()).toEqual([['f1', S.research], ['f4', S.homeOffice]]);
    expect(cell(r.state, 'f4', MON)!.statusId).toBe(S.duty1);
    expect(cell(r.state, 'f1', THU)!.statusId).toBe(S.duty1);
  });

  it('bytte som erstatter motpartens andre vakt, viser at den vakten blir udekket', () => {
    let s = fasit();
    // B har Vakt 2 mandag. Én status per dag: bytter de vaktdager, erstattes Bs Vakt 2.
    s = added(s, d('f4', MON, S.duty2));
    const a = analyzeDateMove(s, 'planner', idAt(s, 'f1', MON), THU, TODAY);
    // Bytte ville erstattet Bs Vakt 2 mandag; Vakt 2 blir da udekket, og det vises.
    const swap = a.options.find((o) => o.kind === 'swapDates')!;
    expect(swap.removed.map((e) => e.statusId)).toEqual([S.duty2]);
    expect(swap.uncovered.map((u) => [u.date, u.statusId])).toEqual([[MON, S.duty2]]);
  });

  it('flere plasser: motparten velges konkret, aldri hvem som mottar den flyttede statusen', () => {
    let s = makeState();
    s = { ...s, rules: setStaffing(s.rules, { statusId: S.referent, perWeekday: [2, 2, 2, 2, 2, 0, 0], onHolidays: false }) };
    s = added(s, d('f1', MON, S.referent, { note: 'Morgenmøtet' }));
    s = added(s, d('f3', THU, S.referent));
    s = added(s, d('f5', THU, S.referent));
    const a = analyzeDateMove(s, 'planner', idAt(s, 'f1', MON), THU, TODAY);
    expect(a.counterparts.map((e) => e.personId).sort()).toEqual(['f3', 'f5']);
    expect(a.options).toHaveLength(4);
    const r = commitDateMove(s, 'planner', idAt(s, 'f1', MON), THU, 'swapDates', idAt(s, 'f5', THU), TODAY);
    expect(cell(r.state, 'f5', MON)!.statusId).toBe(S.referent);
    expect(cell(r.state, 'f3', THU)!.statusId).toBe(S.referent);
    expect(cell(r.state, 'f1', THU)).toMatchObject({ statusId: S.referent, note: 'Morgenmøtet' });
  });

  it('negativt: leser og systemarkitekt uten lokal myndighet kan ikke flytte', () => {
    const s = fasit();
    for (const role of ['reader', 'outsideArchitect'] as const) {
      expect(() => analyzeDateMove(s, role, idAt(s, 'f1', MON), THU, TODAY)).toThrow(PermissionError);
    }
  });
});

describe('rutenettet (uke og helår): slipp på en full vakt avvises med grunn (A-FLY-03)', () => {
  it('å legge As vakt i As celle torsdag, der B har vakten, avvises; Bs vakt tas aldri over lydløst', () => {
    const s = fasit();
    const a = analyzeMove(s, 'planner', idAt(s, 'f1', MON), { personId: 'f1', date: THU }, TODAY);
    expect(a.outcome).toBe('rejected');
    expect(a.options).toEqual([]);
    expect(a.reasons.join(' ')).toContain('alt tildelt Per Hansen');
  });
});

describe('Til stede som virtuell celle (A-FLY-01, A-FLY-02)', () => {
  const withHomeOffice = () => added(makeState(), d('f4', TUE, S.homeOffice, { note: 'Rapport' }));

  it('bare en arbeidsdag uten status kan dras som Til stede', () => {
    const s = withHomeOffice();
    expect(presenceDraggable(s, { personId: 'f1', date: TUE }, TODAY)).toBe(true);
    expect(presenceDraggable(s, { personId: 'f4', date: TUE }, TODAY)).toBe(false);
    expect(presenceDraggable(s, { personId: 'f1', date: SAT }, TODAY)).toBe(false);
    expect(() => analyzePresenceMove(s, 'planner', { personId: 'f1', date: SAT }, { personId: 'f4', date: TUE }, TODAY)).toThrow(DomainError);
  });

  it('Til stede på en statuscelle bytter: den faktiske statusen flyttes tilbake til kilden, målet blir uten status', () => {
    const s = withHomeOffice();
    const a = analyzePresenceMove(s, 'planner', { personId: 'f1', date: TUE }, { personId: 'f4', date: TUE }, TODAY);
    expect(a.outcome).toBe('ok');
    const r = commitPresenceMove(s, 'planner', { personId: 'f1', date: TUE }, { personId: 'f4', date: TUE }, TODAY);
    expect(cell(r.state, 'f1', TUE)).toMatchObject({ statusId: S.homeOffice, note: 'Rapport' });
    expect(entryAt(r.state, 'f4', TUE)).toBeUndefined();
    // Aldri skjult sletting: ingen status forsvinner, og ingen status lagres for Til stede.
    expect(r.removed).toEqual([]);
    expect(r.state.entries).toHaveLength(1);
  });

  it('tom til tom endrer ingenting', () => {
    const s = withHomeOffice();
    const a = analyzePresenceMove(s, 'planner', { personId: 'f1', date: TUE }, { personId: 'f5', date: TUE }, TODAY);
    expect(a.outcome).toBe('same');
    expect(a.options).toEqual([]);
    expect(() => commitPresenceMove(s, 'planner', { personId: 'f1', date: TUE }, { personId: 'f5', date: TUE }, TODAY)).toThrow(DomainError);
  });

  it('byttet følger de vanlige reglene: en vakt kan ikke flyttes til en som ikke er kvalifisert', () => {
    const s = added(makeState(), d('f1', TUE, S.duty1));
    // f3 Siri Eksempel har ingen kvalifikasjoner.
    const a = analyzePresenceMove(s, 'planner', { personId: 'f3', date: TUE }, { personId: 'f1', date: TUE }, TODAY);
    expect(a.outcome).toBe('rejected');
  });

  it('negativt: en leser kan ikke flytte Til stede', () => {
    const s = withHomeOffice();
    expect(() => analyzePresenceMove(s, 'reader', { personId: 'f1', date: TUE }, { personId: 'f4', date: TUE }, TODAY)).toThrow(PermissionError);
  });
});
