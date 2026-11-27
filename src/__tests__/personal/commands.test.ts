import { describe, expect, it } from 'vitest';
import './hjelp';
import { added, d, makeState, newStatus } from './fixtures';
import { defaultRuleSet, STATUS_IDS as S } from '@delt/personal/catalog';
import {
  applyToCells,
  commitRules,
  DomainError,
  removedStatusErrors,
  removeEntry,
  ruleImpact,
  setStatus,
  staffableStatuses,
  statusChangeDraft,
  updateDetails,
  upsertPerson,
  validateRules,
} from '@delt/personal/commands';
import { dayCoverage, entryAt, invalidEntries } from '@delt/personal/rules';
import type { PlannerState, RuleSet } from '@delt/personal/types';

/** Syntetiske data (oppdiktede navn). */
const TUE = '2026-11-24';
const WED = '2026-11-25';
const SAT = '2026-11-28';

const names = (s: PlannerState, date = TUE) => s.entries.filter((e) => e.date === date).map((e) => `${e.personId}:${e.statusId}`).sort();

describe('setStatus: én endring i én celle', () => {
  it('ny status får gjeldende regelversjon; tom merknad lagres ikke', () => {
    const s = added(makeState(), d('f1', TUE, S.duty1, { note: '   ' }));
    expect(s.entries).toHaveLength(1);
    expect(s.entries[0]).toMatchObject({ personId: 'f1', date: TUE, statusId: S.duty1, ruleVersion: 1 });
    expect(s.entries[0]!.note).toBeUndefined();
    expect(s.entries[0]!.time).toBeUndefined();
  });

  it('et statusbytte erstatter statusen og beholder merknad og klokkeslett', () => {
    let s = added(makeState(), d('f1', TUE, S.homeOffice, { note: 'Møte kl. 10', time: { start: 480, end: 720 } }));
    const r = setStatus(s, 'planner', statusChangeDraft(s, { personId: 'f1', date: TUE }, S.referent));
    expect(r.applied).toBe(true);
    s = r.state;
    expect(s.entries).toHaveLength(1);
    expect(s.entries[0]).toMatchObject({ statusId: S.referent, note: 'Møte kl. 10', time: { start: 480, end: 720 } });
  });

  it('en endring med brudd lagres ikke', () => {
    const s = makeState();
    const r = setStatus(s, 'planner', d('f3', TUE, S.duty1));
    expect(r.applied).toBe(false);
    expect(r.state).toBe(s);
    expect(r.plan.violations.map((v) => v.code)).toEqual(['notQualified']);
  });

  it('en status som gjør en vakt udekket, sier fra om det', () => {
    const s = added(makeState(), d('f1', TUE, S.duty1));
    const r = setStatus(s, 'planner', d('f1', TUE, S.away));
    expect(r.applied).toBe(true);
    expect(r.uncovered.map((u) => u.statusId)).toEqual([S.duty1]);
    expect(dayCoverage(r.state, TUE).find((x) => x.status.id === S.duty1)?.missing).toBe(1);
  });

  it('andres statuser og andre dager berøres ikke', () => {
    let s = added(makeState(), d('f1', TUE, S.duty1));
    s = added(s, d('f4', TUE, S.duty2));
    s = added(s, d('f1', WED, S.referent));
    const next = setStatus(s, 'planner', d('f1', TUE, S.away)).state;
    expect(names(next)).toEqual(['f1:borte', 'f4:vakt2']);
    expect(names(next, WED)).toEqual(names(s, WED));
  });
});

describe('vaktovertakelse', () => {
  const base = () => added(added(makeState(), d('f4', TUE, S.duty1, { note: 'Vakttelefon' })), d('f1', TUE, S.homeOffice));

  it('uten bekreftelse lagres ingenting, og planen viser hvem vakten tas fra og hva som erstattes', () => {
    const s = base();
    const r = setStatus(s, 'planner', d('f1', TUE, S.duty1));
    expect(r.applied).toBe(false);
    expect(r.state).toBe(s);
    expect(r.plan.takesOver?.personId).toBe('f4');
    expect(r.plan.replaces?.statusId).toBe(S.homeOffice);
  });

  it('med bekreftelse flyttes vakten i én samlet endring: fjernes hos den andre, erstatter mottakerens status', () => {
    const s = base();
    const r = setStatus(s, 'planner', d('f1', TUE, S.duty1), { takeOver: true });
    expect(r.applied).toBe(true);
    expect(names(r.state)).toEqual(['f1:vakt1']);
    expect(r.uncovered).toEqual([]);
  });

  it('reglene for hvem som kan ha vakten gjelder fortsatt', () => {
    const s = base();
    const r = setStatus(s, 'planner', d('f3', TUE, S.duty1), { takeOver: true });
    expect(r.applied).toBe(false);
    expect(r.state).toBe(s);
  });

  it('overtar man Vakt 1 fra noen mens man selv har Vakt 2, blir Vakt 2 udekket, og det sies fra', () => {
    let s = added(makeState(), d('f4', TUE, S.duty1));
    s = added(s, d('f1', TUE, S.duty2));
    const r = setStatus(s, 'planner', d('f1', TUE, S.duty1), { takeOver: true });
    expect(names(r.state)).toEqual(['f1:vakt1']);
    expect(r.uncovered.map((u) => u.statusId)).toEqual([S.duty2]);
  });
});

describe('merknad, klokkeslett og sletting', () => {
  it('updateDetails endrer merknad og tid og beholder registreringen; null tid er hele dagen', () => {
    let s = added(makeState(), d('f1', TUE, S.referent));
    const id = s.entries[0]!.id;
    s = updateDetails(s, 'planner', id, { note: 'Morgenmøtet', time: { start: 480, end: 540 } }).state;
    expect(s.entries).toEqual([expect.objectContaining({ id, note: 'Morgenmøtet', time: { start: 480, end: 540 } })]);
    s = updateDetails(s, 'planner', id, { time: null }).state;
    expect(s.entries[0]!.time).toBeUndefined();
    expect(s.entries[0]!.note).toBe('Morgenmøtet');
    s = updateDetails(s, 'planner', id, { note: '' }).state;
    expect(s.entries[0]!.note).toBeUndefined();
  });

  it('ugyldig tidsrom og sensitiv merknad lagres ikke', () => {
    const s = added(makeState(), d('f1', TUE, S.referent));
    const id = s.entries[0]!.id;
    expect(updateDetails(s, 'planner', id, { time: { start: 600, end: 540 } }).applied).toBe(false);
    expect(updateDetails(s, 'planner', id, { note: 'Legetime' }).applied).toBe(false);
  });

  it('removeEntry fjerner statusen og sier fra om udekket vakt; ukjent ID kaster', () => {
    const s = added(makeState(), d('f1', TUE, S.duty1));
    const r = removeEntry(s, 'planner', s.entries[0]!.id);
    expect(r.state.entries).toEqual([]);
    expect(r.uncovered.map((u) => u.statusId)).toEqual([S.duty1]);
    expect(() => removeEntry(s, 'planner', 'finnes-ikke')).toThrow(DomainError);
  });

  it('årsskifte: 1.1.2027 er helligdag, så vakt avvises og ingen dekning kreves', () => {
    expect(setStatus(makeState(), 'planner', d('f1', '2027-01-01', S.duty1)).applied).toBe(false);
    expect(dayCoverage(makeState(), '2027-01-01')).toEqual([]);
    const s = added(added(makeState(), d('f1', '2026-12-31', S.away)), d('f1', '2027-01-01', S.away));
    expect(entryAt(s, 'f1', '2026-12-31')?.statusId).toBe(S.away);
    expect(entryAt(s, 'f1', '2027-01-01')?.statusId).toBe(S.away);
  });
});

describe('flervalg', () => {
  const cells = [
    { personId: 'f1', date: TUE },
    { personId: 'f3', date: TUE }, // ukvalifisert
    { personId: 'f2', date: WED },
    { personId: 'f4', date: SAT }, // helg
  ];

  it('setter statusen der det er mulig og hopper over resten med årsak', () => {
    const r = applyToCells(makeState(), 'planner', cells, { type: 'set', statusId: S.duty2 });
    expect(r.results.map((x) => x.outcome)).toEqual(['set', 'skipped', 'set', 'skipped']);
    expect(r.results[1]!.reason).toMatch(/kvalifisert/);
    expect(r.appliedCount).toBe(2);
  });

  it('vurderer hver celle mot tilstanden etter de foregående: samme vakt gis ikke to samme dag', () => {
    const r = applyToCells(makeState(), 'planner', [{ personId: 'f1', date: TUE }, { personId: 'f4', date: TUE }], { type: 'set', statusId: S.duty1 });
    expect(r.results.map((x) => x.outcome)).toEqual(['set', 'skipped']);
    expect(r.results[1]!.reason).toMatch(/Allerede tildelt Kari Prøvesen/);
  });

  it('erstatter eksisterende statuser og viser hva som forsvinner; fjerning hopper over tomme celler', () => {
    const s = added(makeState(), d('f1', TUE, S.duty1));
    const r = applyToCells(s, 'planner', [{ personId: 'f1', date: TUE }, { personId: 'f4', date: TUE }], { type: 'set', statusId: S.away });
    expect(r.results.map((x) => x.outcome)).toEqual(['replace', 'set']);
    expect(r.results[0]!.replaced?.statusId).toBe(S.duty1);
    expect(r.uncovered.map((u) => u.statusId)).toEqual([S.duty1]);
    const cleared = applyToCells(r.state, 'planner', [{ personId: 'f1', date: TUE }, { personId: 'f2', date: TUE }], { type: 'clear' });
    expect(cleared.results.map((x) => x.outcome)).toEqual(['clear', 'skipped']);
    expect(names(cleared.state)).toEqual(['f4:borte']);
  });

  it('en forhåndsvisning endrer ikke tilstanden', () => {
    const s = makeState();
    applyToCells(s, 'planner', cells, { type: 'set', statusId: S.away });
    expect(s.entries).toEqual([]);
  });
});

describe('regelendringer', () => {
  /** Referent krever kvalifikasjon: registreringer på ukvalifiserte blir ugyldige fremover. */
  const strictReferent = (r: RuleSet): RuleSet => ({ ...r, statuses: r.statuses.map((x) => (x.id === S.referent ? { ...x, requiresQualification: true } : x)) });
  function plan() {
    let s = makeState();
    s = added(s, d('f1', '2026-11-02', S.referent)); // fortid
    s = added(s, d('f1', '2026-11-30', S.referent)); // fremtid
    s = added(s, d('f5', '2026-11-30', S.away)); // ikke berørt
    return s;
  }

  it('ruleImpact viser fremtidige registreringer som blir ugyldige, ignorerer fortiden og endrer ingenting', () => {
    const s = plan();
    const snapshot = structuredClone(s.entries);
    const impact = ruleImpact(s, strictReferent(s.rules), '2026-11-24');
    expect(impact.newlyInvalid.map((x) => `${x.entry.date}:${x.entry.statusId}`)).toEqual([`2026-11-30:${S.referent}`]);
    expect(impact.newlyValid).toEqual([]);
    expect(s.entries).toEqual(snapshot);
  });

  it('registreringer på selve fra-datoen regnes som fremtidige', () => {
    const s = added(makeState(), d('f1', TUE, S.referent));
    expect(ruleImpact(s, strictReferent(s.rules), TUE).newlyInvalid).toHaveLength(1);
    expect(ruleImpact(s, strictReferent(s.rules), WED).newlyInvalid).toHaveLength(0);
  });

  it('commitRules endrer ikke registreringene, men markerer dem som ugyldige; tilbakestilling gjør dem gyldige igjen', () => {
    const s = plan();
    const after = commitRules(s, 'localAdmin', strictReferent(s.rules));
    expect(after.entries).toEqual(s.entries);
    expect(invalidEntries(after, '2026-11-24', '2026-12-31')).toHaveLength(1);
    expect(ruleImpact(after, s.rules, '2026-11-24').newlyValid).toHaveLength(1);
  });

  it('ruleImpact viser endret tilstedeværelse når en status bytter kategori', () => {
    const s = plan();
    const next = { ...s.rules, statuses: s.rules.statuses.map((x) => (x.id === S.away ? { ...x, group: 'tilstede', present: true } : x)) };
    expect(ruleImpact(s, next, '2026-11-24').presence).toEqual([{ personId: 'f5', date: '2026-11-30', before: 'away', after: 'present' }]);
  });

  it('validateRules godtar standardsettet og avviser feil i katalog og bemanningsbehov', () => {
    const r = defaultRuleSet();
    expect(validateRules(r)).toEqual([]);
    expect(validateRules({ ...r, statuses: [...r.statuses, newStatus('x', { group: 'fravaer', present: false, uniquePerDay: true })] })).not.toEqual([]);
    expect(validateRules({ ...r, statuses: [...r.statuses, newStatus(S.duty1)] })).not.toEqual([]);
    expect(validateRules({ ...r, staffing: [...r.staffing, { statusId: S.away, perWeekday: [1, 1, 1, 1, 1, 0, 0], onHolidays: false }] })).not.toEqual([]);
    expect(validateRules({ ...r, staffing: r.staffing.map((x) => ({ ...x, perWeekday: [2, 1, 1, 1, 1, 0, 0] as typeof x.perWeekday })) })).not.toEqual([]);
    expect(validateRules({ ...r, staffing: [...r.staffing, r.staffing[0]!] })).not.toEqual([]);
  });

  it('bemanningsbehov kan bare gjelde aktive statuser som er til stede og ikke gir vaktfritak', () => {
    // Opplæring er til stede, men gir alltid vaktfritak, og kan derfor ikke ha bemanningsbehov.
    expect(staffableStatuses(defaultRuleSet()).map((x) => x.id)).toEqual([S.duty1, S.duty2, S.referent]);
  });

  it('en status som er i bruk, kan ikke fjernes fra katalogen', () => {
    const s = added(makeState(), d('f1', TUE, S.research));
    const next = { ...s.rules, statuses: s.rules.statuses.filter((x) => x.id !== S.research) };
    expect(removedStatusErrors(s, next)).not.toEqual([]);
  });
});

describe('medarbeidere', () => {
  it('upsertPerson validerer navn og kategori', () => {
    const s = makeState();
    const p = s.people[0]!;
    expect(() => upsertPerson(s, 'planner', { ...p, name: ' ' })).toThrow(DomainError);
    expect(() => upsertPerson(s, 'planner', { ...p, categoryId: 'ukjent' })).toThrow(DomainError);
    const next = upsertPerson(s, 'planner', { ...p, name: 'Kari Nytt-Navn' });
    expect(next.people.find((x) => x.id === p.id)!.name).toBe('Kari Nytt-Navn');
    expect(next.people).toHaveLength(s.people.length);
  });

  it('fjernet kvalifikasjon gjør eksisterende vakt ugyldig (markeres, endres ikke)', () => {
    const s = added(makeState(), d('f1', WED, S.duty1));
    const next = upsertPerson(s, 'planner', { ...s.people[0]!, qualifications: [S.duty2] });
    expect(next.entries).toEqual(s.entries);
    const problems = invalidEntries(next, WED, WED);
    expect(problems).toHaveLength(1);
    expect(problems[0]!.problems.map((p) => p.code)).toContain('notQualified');
  });
});
