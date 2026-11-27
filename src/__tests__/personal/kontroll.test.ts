import { describe, expect, it, vi } from 'vitest';
import { added, d, makeState, newStatus } from './fixtures';
import { createPostState, POST_IDS as P } from './annetFagmiljo';
import { TEST_TODAY } from './hjelp';
import { STATUS_IDS as S } from '@delt/personal/catalog';
import { applyToCells, carryRuleVersionSeq, commitRules, DomainError, ruleImpact, setStaffing, setStatus, updateDetails, upsertPerson, validateRules } from '@delt/personal/commands';
import { analyzeMove, commitMove } from '@delt/personal/move';
import { canTransition, missingAction } from '@delt/personal/permissions';
import { dayKind } from '@delt/personal/people';
import { activePeopleAt, atDate, dayCoverage, entryAt, entryProblems, peopleInPeriod, personAt, planSet, presenceOf, ruleSetByVersion, rulesForDate, statusIndex } from '@delt/personal/rules';
import type { PlannerState, RuleSet, StatusDefinition } from '@delt/personal/types';

/**
 * Regresjonstester for funnene i de uavhengige kontrollene, tilpasset
 * modellen med én status per medarbeider per dag. «I dag» er fast
 * (TEST_TODAY, tirsdag 24.11.2026). Bare syntetiske medarbeidere.
 */

const PAST = '2026-11-17'; // tirsdag forrige uke
const YESTERDAY = '2026-11-23';
const FUTURE = '2026-12-01'; // tirsdag neste uke
const WEEKDAYS = [1, 1, 1, 1, 1, 0, 0] as const;

/** Lagring som JSON og innlesing igjen, slik tilstanden går gjennom databasen og nettverket. */
const roundTrip = (s: PlannerState): PlannerState => JSON.parse(JSON.stringify(s)) as PlannerState;

const withStatus = (rules: RuleSet, id: string, change: Partial<StatusDefinition>): RuleSet => ({ ...rules, statuses: rules.statuses.map((x) => (x.id === id ? { ...x, ...change } : x)) });
const slot = (s: PlannerState, date: string, statusId: string) => dayCoverage(s, date).find((x) => x.status.id === statusId)!;
const codes = (s: PlannerState, e: { id: string }) => entryProblems(s, s.entries.find((x) => x.id === e.id)!).map((p) => p.code);

/** Tilstand der reglene ble lagret for lenge siden, slik at et nytt regelsett i dag tar vare på det gamle. Referent har et bemanningsbehov. */
function withOldRules(): PlannerState {
  const s = makeState();
  const rules = setStaffing(s.rules, { statusId: S.referent, perWeekday: [...WEEKDAYS], onHolidays: false });
  return { ...s, rules: { ...rules, effectiveFrom: '2026-01-01' } };
}

describe('1. Historisk betydning bevares', () => {
  it('nytt kvalifikasjonskrav gjør bare kommende registreringer ugyldige; tidligere dag og dens dekning er uendret', () => {
    let s = withOldRules();
    for (const date of [PAST, FUTURE]) s = added(s, d('f3', date, S.referent));
    const coverageBefore = dayCoverage(s, PAST);
    const next = withStatus(s.rules, S.referent, { requiresQualification: true });
    expect(ruleImpact(s, next, TEST_TODAY).newlyInvalid.map((x) => x.entry.date)).toEqual([FUTURE]);

    const after = commitRules(s, 'localAdmin', next);
    expect(after.entries).toEqual(s.entries);
    const [past, future] = after.entries;
    expect(codes(after, past!)).toEqual([]);
    expect(codes(after, future!)).toEqual(['notQualified']);
    expect(dayCoverage(after, PAST)).toEqual(coverageBefore);
    expect(slot(after, FUTURE, S.referent).missing).toBe(1);
    // Regelversjonen på den gamle registreringen kan slås opp.
    expect(rulesForDate(after, PAST).version).toBe(past!.ruleVersion);
  });

  it('regelhistorikken og betydningen overlever lagring og omlasting', () => {
    let s = added(withOldRules(), d('f3', PAST, S.referent));
    s = commitRules(s, 'localAdmin', withStatus(s.rules, S.referent, { requiresQualification: true }));
    const loaded = roundTrip(s);
    expect(loaded).toEqual(s);
    expect(loaded.entries.every((e) => entryProblems(loaded, e).length === 0)).toBe(true);
  });

  it('tilbakeføring og ny regelendring gjenbruker ikke en regelversjon med en annen betydning', () => {
    const s0 = withOldRules();
    const s1 = commitRules(s0, 'localAdmin', withStatus(s0.rules, S.referent, { requiresQualification: true }));
    // Regelendringen føres tilbake (til s0), men versjonstelleren fortsetter.
    const restored = carryRuleVersionSeq(s0, s1);
    const s2 = commitRules(restored, 'localAdmin', withStatus(restored.rules, S.training, { name: 'Kurs' }));
    expect(s1.rules.version).toBe(2);
    expect(s2.rules.version).toBe(3);
  });

  it('flere regelendringer samme dag: alle refererte versjoner beholdes, også gjennom merknad, klokkeslett, lagring og omlasting', () => {
    const s0 = withOldRules();
    const s1 = commitRules(s0, 'localAdmin', withStatus(s0.rules, S.training, { name: 'Kurs' }));
    const withEntry = added(s1, d('f1', FUTURE, S.duty1, { time: { start: 480, end: 900 } }));
    expect(withEntry.entries[0]!.ruleVersion).toBe(2);
    const s2 = commitRules(withEntry, 'localAdmin', withStatus(withEntry.rules, S.referent, { requiresQualification: true }));
    expect(s2.rules.version).toBe(3);
    expect(ruleSetByVersion(s2, 2)).toBe(s1.rules);
    expect(ruleSetByVersion(s2, 1)).toBe(s0.rules);
    // Datooppslag og opprinnelig versjon er to ting.
    expect(rulesForDate(s2, PAST)).toBe(s0.rules);
    expect(rulesForDate(s2, FUTURE)).toBe(s2.rules);
    // Ren merknadsendring beholder versjonen og klokkeslettet registreringen ble lagret med.
    const noted = updateDetails(s2, 'planner', s2.entries[0]!.id, { note: 'Møterom 2' }).state;
    expect(noted.entries[0]).toMatchObject({ ruleVersion: 2, time: { start: 480, end: 900 }, note: 'Møterom 2' });
    const loaded = roundTrip(noted);
    expect(ruleSetByVersion(loaded, loaded.entries[0]!.ruleVersion)).toEqual(s1.rules);
  });

  it('virkningsoversikten viser endret dekning og tilstedeværelse, ikke bare nye regelbrudd', () => {
    let s = withOldRules();
    s = added(s, d('f3', FUTURE, S.referent));
    s = added(s, d('f2', FUTURE, S.training));
    const more = setStaffing(s.rules, { statusId: S.referent, perWeekday: [1, 2, 1, 1, 1, 0, 0], onHolidays: false });
    expect(ruleImpact(s, more, TEST_TODAY).coverage.find((c) => c.date === FUTURE && c.statusId === S.referent)).toMatchObject({ missingBefore: 0, missingAfter: 1 });
    // En status som bytter kategori, endrer tilstedeværelsen.
    const moved = withStatus(s.rules, S.training, { group: 'fravaer', present: false });
    expect(ruleImpact(s, moved, TEST_TODAY).presence).toContainEqual({ personId: 'f2', date: FUTURE, before: 'present', after: 'away' });
  });
});

describe('Kontroll 2: kvalifikasjon og medarbeiderhistorikk', () => {
  const nextDay = () => vi.setSystemTime(new Date('2026-11-25T12:00:00'));

  it('ny bakoverdatert vakt til en ukvalifisert person avvises, fra enkeltcelle, flervalg og flytting', () => {
    const s = makeState();
    expect(planSet(s, d('f3', YESTERDAY, S.duty1)).violations.map((v) => v.code)).toEqual(['notQualified']);
    expect(setStatus(s, 'planner', d('f3', YESTERDAY, S.duty1)).applied).toBe(false);
    const bulk = applyToCells(s, 'planner', [{ personId: 'f3', date: YESTERDAY }], { type: 'set', statusId: S.duty1 });
    expect(bulk.appliedCount).toBe(0);
    const withDuty = added(s, d('f1', YESTERDAY, S.duty1));
    const to = { personId: 'f3', date: YESTERDAY };
    expect(analyzeMove(withDuty, 'planner', withDuty.entries[0]!.id, to).outcome).toBe('rejected');
    expect(() => commitMove(withDuty, 'planner', withDuty.entries[0]!.id, to, 'move')).toThrow(DomainError);
  });

  it('en vakt som er ugyldig i dag fordi kvalifikasjonen er fjernet, er fortsatt ugyldig når dagen blir fortid', () => {
    let s = added(makeState(), d('f1', TEST_TODAY, S.duty1));
    s = upsertPerson(s, 'planner', { ...s.people[0]!, qualifications: [S.duty2] });
    const e = s.entries[0]!;
    expect(codes(s, e)).toContain('notQualified');
    nextDay();
    expect(codes(s, e)).toContain('notQualified');
    expect(slot(s, TEST_TODAY, S.duty1).missing).toBe(1);
  });

  it('kvalifikasjon fjernet i dag gjør ikke gårsdagens vakt ugyldig, men gjelder fremover', () => {
    let s = added(added(makeState(), d('f1', YESTERDAY, S.duty1)), d('f1', FUTURE, S.duty1));
    s = upsertPerson(s, 'planner', { ...s.people[0]!, qualifications: [S.duty2] });
    const [past, future] = s.entries;
    expect(codes(s, past!)).toEqual([]);
    expect(codes(s, future!)).toContain('notQualified');
  });

  it('deaktivering i dag gjør ikke gårsdagens vakt ugyldig eller udekket, heller ikke dagen etter', () => {
    let s = added(makeState(), d('f1', YESTERDAY, S.duty1));
    s = upsertPerson(s, 'planner', { ...s.people[0]!, active: false });
    expect(codes(s, s.entries[0]!)).toEqual([]);
    expect(slot(s, YESTERDAY, S.duty1).missing).toBe(0);
    expect(presenceOf(s, 'f1', YESTERDAY)).toBe('present');
    expect(presenceOf(s, 'f1', FUTURE)).toBe('off');
    nextDay();
    expect(codes(s, s.entries[0]!)).toEqual([]);
    expect(slot(s, YESTERDAY, S.duty1).missing).toBe(0);
  });

  it('endret statusbetydning: tidligere dager vises og vurderes med den gamle katalogen', () => {
    let s = added(withOldRules(), d('f3', YESTERDAY, S.training));
    s = commitRules(s, 'localAdmin', withStatus(s.rules, S.training, { name: 'Kurs utenfor huset', group: 'fravaer', present: false }));
    expect(statusIndex(atDate(s, YESTERDAY).rules).get(S.training)!.name).toBe('Opplæring');
    expect(presenceOf(s, 'f3', YESTERDAY)).toBe('present');
    expect(statusIndex(atDate(s, TEST_TODAY).rules).get(S.training)!.name).toBe('Kurs utenfor huset');
  });

  it('en person som er lagt til i dag, kan ikke få registreringer før i dag', () => {
    const s = upsertPerson(makeState(), 'planner', { ...makeState().people[0]!, id: 'ny', name: 'Ny Ansatt' });
    expect(planSet(s, d('ny', YESTERDAY, S.research)).violations.length).toBeGreaterThan(0);
    expect(planSet(s, d('ny', TEST_TODAY, S.research)).violations).toEqual([]);
  });
});

describe('2. Fravær kan aldri telle som gyldig vakt', () => {
  it('en vakt må regnes som fysisk til stede (A-STA-09)', () => {
    const s = makeState();
    for (const id of [S.duty1, S.duty2]) {
      const rules = withStatus(s.rules, id, { group: 'fravaer', present: false });
      expect(validateRules(rules).length).toBeGreaterThan(0);
      expect(() => commitRules(s, 'localAdmin', rules)).toThrow(DomainError);
    }
  });

  it('en status som ikke er til stede, kan ikke ha bemanningsbehov', () => {
    const s = makeState();
    const staffed = setStaffing({ ...s.rules, statuses: [...s.rules.statuses, newStatus('fravar-x', { group: 'fravaer', present: false })] }, { statusId: 'fravar-x', perWeekday: [...WEEKDAYS], onHolidays: false });
    expect(() => commitRules(s, 'localAdmin', staffed)).toThrow(/bemanningsbehov/);
  });

  it('selv med manipulerte regler gir en vakt som ikke er til stede, aldri dekning', () => {
    const s = makeState();
    const tampered: PlannerState = { ...s, rules: withStatus(s.rules, S.duty1, { group: 'fravaer', present: false }), entries: [{ id: 'x', personId: 'f1', date: FUTURE, statusId: S.duty1, ruleVersion: 1 }] };
    expect(slot(tampered, FUTURE, S.duty1)).toMatchObject({ missing: 1, valid: [] });
  });
});

describe('3. Rollene gjelder også tilbakeføringer', () => {
  it('bare roller som kan gjøre endringen, kan føre den tilbake', () => {
    const s0 = makeState();
    const calendar = added(s0, d('f1', FUTURE, S.duty1));
    const rules = commitRules(s0, 'localAdmin', withStatus(s0.rules, S.referent, { requiresQualification: true }));
    expect(canTransition('planner', calendar, s0)).toBe(true);
    expect(canTransition('reader', calendar, s0)).toBe(false);
    expect(canTransition('outsideArchitect', calendar, s0)).toBe(false);
    expect(canTransition('localAdmin', calendar, s0)).toBe(true);
    expect(canTransition('localAdmin', rules, s0)).toBe(true);
    expect(canTransition('planner', rules, s0)).toBe(false);
    expect(missingAction('planner', rules, s0)).toBe('editRules');
  });
});

describe('4. Vaktdekning og konsekvenser', () => {
  it('Borte på den som har vakten, erstatter vakten og sier at den blir udekket', () => {
    const s = added(makeState(), d('f1', FUTURE, S.duty1));
    const r = setStatus(s, 'planner', d('f1', FUTURE, S.away));
    expect(r.applied).toBe(true);
    expect(r.plan.replaces?.statusId).toBe(S.duty1);
    expect(r.uncovered.map((u) => [u.date, u.statusId])).toEqual([[FUTURE, S.duty1]]);
    expect(entryAt(r.state, 'f1', FUTURE)?.statusId).toBe(S.away);
  });

  it('en ugyldig tildeling dekker ikke plassen', () => {
    let s = added(makeState(), d('f1', FUTURE, S.duty1));
    s = { ...s, people: s.people.map((p) => (p.id === 'f1' ? { ...p, qualifications: [] } : p)) };
    expect(slot(s, FUTURE, S.duty1)).toMatchObject({ assigned: [expect.anything()], valid: [], missing: 1 });
  });

  it('overbemanning etter at behovet er senket, vises som overskudd, ikke som manglende, og kan ikke økes', () => {
    // Det andre fagmiljøet: to med medisinansvar, så senkes behovet til én.
    const s0 = added(added(createPostState(), d('q1', FUTURE, P.medication)), d('q6', FUTURE, P.medication));
    const s = commitRules(s0, 'localAdmin', { ...s0.rules, staffing: s0.rules.staffing.map((r) => (r.statusId === P.medication ? { ...r, perWeekday: [1, 1, 1, 1, 1, 1, 1] } : r)) }, TEST_TODAY);
    expect(slot(s, FUTURE, P.medication)).toMatchObject({ required: 1, missing: 0, surplus: 1 });
    // Datoen kan fortsatt endres så lenge antallet ikke øker, men ingen får en tredje plass.
    expect(setStatus(s, 'planner', d('q2', FUTURE, P.secondment), { today: TEST_TODAY }).applied).toBe(true);
    expect(setStatus(s, 'planner', d('q7', FUTURE, P.medication), { today: TEST_TODAY }).plan.violations.map((v) => v.code)).toEqual(['staffingFull']);
  });

  it('flytting til en person som ikke kan ta vakten, avvises og beholder den opprinnelige tildelingen', () => {
    const s = added(makeState(), d('f1', FUTURE, S.duty1));
    const a = analyzeMove(s, 'planner', s.entries[0]!.id, { personId: 'f3', date: FUTURE });
    expect(a.outcome).toBe('rejected');
    expect(a.options).toEqual([]);
  });
});

describe('Merknad', () => {
  it('alle statuser kan ha en kort, praktisk merknad, men ikke fraværsgrunn eller helseopplysninger', () => {
    const s = makeState();
    expect(setStatus(s, 'planner', d('f1', FUTURE, S.away, { note: 'Kurs i Bergen' })).applied).toBe(true);
    for (const note of ['influensa', 'sykemeldt', 'Legetime kl. 10', '010190 12345']) {
      expect(setStatus(s, 'planner', d('f1', FUTURE, S.away, { note })).applied).toBe(false);
    }
    const r = added(s, d('f1', FUTURE, S.homeOffice));
    expect(updateDetails(r, 'planner', r.entries[0]!.id, { note: 'Har feber' }).applied).toBe(false);
  });
});

describe('Kontroll 3: visningene bruker medarbeiderlisten som gjaldt datoen', () => {
  const ids = (people: { id: string }[]) => people.map((p) => p.id);

  it('en medarbeider uten registreringer som deaktiveres i dag, telles og vises fortsatt i går', () => {
    const s = upsertPerson(makeState(), 'planner', { ...makeState().people[0]!, active: false });
    expect(ids(activePeopleAt(s, YESTERDAY))).toContain('f1');
    expect(presenceOf(s, 'f1', YESTERDAY)).toBe('present');
    expect(ids(activePeopleAt(s, TEST_TODAY))).not.toContain('f1');
    expect(ids(peopleInPeriod(s, YESTERDAY, YESTERDAY))).toContain('f1');
    expect(ids(peopleInPeriod(s, TEST_TODAY, FUTURE))).not.toContain('f1');
    // Uken som spenner over deaktiveringen viser personen, og dagene etter er merket.
    expect(ids(peopleInPeriod(s, YESTERDAY, FUTURE))).toContain('f1');
    expect(dayKind(personAt(s, 'f1', YESTERDAY), YESTERDAY, s.rules)).toBe('work');
    expect(dayKind(personAt(s, 'f1', TEST_TODAY), TEST_TODAY, s.rules)).toBe('inactive');
  });

  it('en ny medarbeider vises ikke før vedkommende ble registrert', () => {
    const base = makeState();
    const s = upsertPerson(base, 'planner', { ...base.people[0]!, id: 'ny', name: 'Ny Ansatt' });
    expect(ids(activePeopleAt(s, YESTERDAY))).not.toContain('ny');
    expect(ids(peopleInPeriod(s, PAST, YESTERDAY))).not.toContain('ny');
    expect(dayKind(personAt(s, 'ny', YESTERDAY), YESTERDAY, s.rules)).toBe('unregistered');
    expect(presenceOf(s, 'ny', YESTERDAY)).toBe('off');
    expect(ids(peopleInPeriod(s, YESTERDAY, TEST_TODAY))).toContain('ny');
    expect(dayKind(personAt(s, 'ny', TEST_TODAY), TEST_TODAY, s.rules)).toBe('work');
  });

  it('gjelder også etter at dagen har skiftet', () => {
    const base = makeState();
    let s = upsertPerson(base, 'planner', { ...base.people[0]!, active: false });
    s = upsertPerson(s, 'planner', { ...base.people[1]!, id: 'ny', name: 'Ny Ansatt' });
    vi.setSystemTime(new Date('2026-11-25T10:00:00'));
    expect(ids(activePeopleAt(s, YESTERDAY))).toContain('f1');
    expect(ids(activePeopleAt(s, YESTERDAY))).not.toContain('ny');
    expect(ids(activePeopleAt(s, TEST_TODAY))).toEqual(expect.arrayContaining(['ny']));
    expect(ids(activePeopleAt(s, TEST_TODAY))).not.toContain('f1');
  });
});
