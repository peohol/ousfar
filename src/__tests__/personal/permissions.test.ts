import { describe, expect, it } from 'vitest';
import './hjelp';
import { defaultRuleSet, RULES_EPOCH, STATUS_IDS as S } from '@delt/personal/catalog';
import { applyToCells, commitRules, removeEntry, setStatus, updateDetails, upsertPerson } from '@delt/personal/commands';
import { assertCan, can, PermissionError } from '@delt/personal/permissions';
import { CATEGORIES, TEST_UNIT } from './seed';
import type { PlannerState, Role } from '@delt/personal/types';

function makeState(): PlannerState {
  return {
    unit: { ...TEST_UNIT, id: 'u', name: 'Testenhet' },
    categories: structuredClone(CATEGORIES),
    people: [
      {
        id: 'f1', name: 'Kari Prøvesen', categoryId: 'lis', qualifications: [S.duty1, S.duty2], active: true,
      },
    ],
    rules: defaultRuleSet(),
    ruleVersions: [],
    ruleVersionSeq: 1,
    peopleFrom: RULES_EPOCH,
    peopleHistory: [],
    dutyShares: {},
    entries: [{ id: 'e1', personId: 'f1', date: '2026-11-24', statusId: S.referent, ruleVersion: 1, time: { start: 480, end: 540 } }],
  };
}

const DRAFT = { personId: 'f1', date: '2026-11-25', statusId: S.duty1 };

describe('roller', () => {
  it('rettighetsmatrise', () => {
    expect(can('reader', 'view')).toBe(true);
    expect(can('reader', 'editCalendar')).toBe(false);
    expect(can('reader', 'editPeople')).toBe(false);
    expect(can('reader', 'editRules')).toBe(false);
    expect(can('planner', 'editCalendar')).toBe(true);
    expect(can('planner', 'editPeople')).toBe(true);
    expect(can('planner', 'editRules')).toBe(false);
    expect(can('planner', 'editDutyShare')).toBe(true);
    expect(can('planner', 'manageExemption')).toBe(false);
    expect(can('reader', 'editDutyShare')).toBe(false);
    expect(can('reader', 'manageExemption')).toBe(false);
    expect(can('localAdmin', 'editRules')).toBe(true);
    expect(can('localAdmin', 'editCalendar')).toBe(true);
    expect(can('localAdmin', 'editDutyShare')).toBe(true);
    expect(can('localAdmin', 'manageExemption')).toBe(true);
    // Systemarkitektrollen gir ikke i seg selv innsyn i et fagmiljø.
    for (const a of ['view', 'editCalendar', 'editPeople', 'editDutyShare', 'editRules', 'manageExemption', 'resetDemo'] as const) expect(can('outsideArchitect', a)).toBe(false);
    // Eldre demorolle fra lagrede preferanser er ikke lenger gyldig.
    expect(can('ruleAdmin' as Role, 'editRules')).toBe(false);
    expect(() => assertCan('reader', 'editCalendar')).toThrow(PermissionError);
  });

  describe('leser', () => {
    const role: Role = 'reader';
    it('kan ikke endre kalenderen', () => {
      const s = makeState();
      expect(() => setStatus(s, role, DRAFT)).toThrow(PermissionError);
      expect(() => removeEntry(s, role, 'e1')).toThrow(PermissionError);
      expect(() => updateDetails(s, role, 'e1', { note: 'Ny merknad' })).toThrow(PermissionError);
      expect(() => applyToCells(s, role, [{ personId: 'f1', date: '2026-11-25' }], { type: 'set', statusId: S.duty1 })).toThrow(PermissionError);
    });
    it('kan ikke endre regler eller medarbeidere', () => {
      const s = makeState();
      expect(() => commitRules(s, role, s.rules)).toThrow(PermissionError);
      expect(() => upsertPerson(s, role, s.people[0]!)).toThrow(PermissionError);
    });
  });

  describe('systemarkitekt uten lokal myndighet', () => {
    const role: Role = 'outsideArchitect';
    it('kan ikke endre kalenderen, medarbeidere eller regler', () => {
      const s = makeState();
      expect(() => setStatus(s, role, DRAFT)).toThrow(PermissionError);
      expect(() => removeEntry(s, role, 'e1')).toThrow(PermissionError);
      expect(() => upsertPerson(s, role, s.people[0]!)).toThrow(PermissionError);
      expect(() => commitRules(s, role, s.rules)).toThrow(PermissionError);
    });
  });

  describe('lokal administrator', () => {
    const role: Role = 'localAdmin';
    it('kan endre regler', () => {
      const s = makeState();
      const next = commitRules(s, role, { ...s.rules, statuses: s.rules.statuses.map((x) => (x.id === S.teaching ? { ...x, name: 'Undervisning (ny)' } : x)) });
      expect(next.rules.version).toBe(2);
    });
  });

  describe('planlegger', () => {
    const role: Role = 'planner';
    it('kan ikke endre regler', () => {
      const s = makeState();
      expect(() => commitRules(s, role, s.rules)).toThrow(PermissionError);
    });
    it('kan endre kalender og medarbeidere', () => {
      const s = makeState();
      expect(setStatus(s, role, DRAFT).applied).toBe(true);
      expect(removeEntry(s, role, 'e1').state.entries).toHaveLength(0);
      expect(upsertPerson(s, role, { ...s.people[0]!, name: 'Kari Omdøpt' }).people[0]!.name).toBe('Kari Omdøpt');
    });
  });

  it('avvist rolle endrer ikke tilstanden', () => {
    const s = makeState();
    const snapshot = structuredClone(s);
    try {
      setStatus(s, 'reader', DRAFT);
    } catch {
      /* forventet */
    }
    expect(s).toEqual(snapshot);
  });
});
