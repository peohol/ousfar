import { describe, expect, it } from 'vitest';
import './hjelp';
import { added, d, makeState, newStatus } from './fixtures';
import { GROUP_IDS as G, STATUS_IDS as S, statusesByGroup, workCalendarOf } from '@delt/personal/catalog';
import { commitRules, DomainError, setStatus, validateRules } from '@delt/personal/commands';
import { dayCoverage, entryAt, entryProblems, freeForNew, isDutyExempt, presenceOf, rulesForDate } from '@delt/personal/rules';
import type { PlannerState, RuleSet, StatusDefinition, WorkCalendar } from '@delt/personal/types';

/**
 * Vedtak B17 (27.11.2026): Fri er slått sammen med Ferie, Borte uten fritak
 * brukes for ordinære arbeidsfrie dager ved deltid, statusene står i tre
 * visningsgrupper, og tilstedeværelse, fremheving og arbeidskalender er
 * oppsett per fagmiljø (akseptmatrisen A-STA-04–10, A-UX-03, A-UX-06).
 * Bare syntetiske medarbeidere.
 */

const TODAY = '2026-11-24';
const PAST = '2026-11-17';
const FUTURE = '2026-12-01';
const FRI = 'fri';

const withStatus = (rules: RuleSet, id: string, change: Partial<StatusDefinition>): RuleSet => ({ ...rules, statuses: rules.statuses.map((x) => (x.id === id ? { ...x, ...change } : x)) });

/** Et fagmiljø som brukte Fri (uten vaktfritak) før vedtaket, med en registrering forrige uke. */
function withHistoricFri(): PlannerState {
  const s = makeState();
  const old: RuleSet = { ...s.rules, effectiveFrom: '2026-01-01', statuses: [...s.rules.statuses, newStatus(FRI, { name: 'Fri', group: G.absent, present: false })] };
  return added({ ...s, rules: old }, d('f1', PAST, FRI), false);
}

describe('Fri er slått sammen med Ferie (A-UX-03)', () => {
  it('Ferie gir alltid vaktfritak; Borte for en ordinær arbeidsfri dag gir det ikke', () => {
    let s = added(makeState(), d('f1', FUTURE, S.vacation));
    s = added(s, d('f4', FUTURE, S.away));
    expect(isDutyExempt(s, entryAt(s, 'f1', FUTURE), TODAY)).toBe(true);
    expect(isDutyExempt(s, entryAt(s, 'f4', FUTURE), TODAY)).toBe(false);
    // Begge er fravær og gjør personen utilgjengelig for ny vakt.
    expect(presenceOf(s, 'f1', FUTURE)).toBe('away');
    expect(presenceOf(s, 'f4', FUTURE)).toBe('away');
  });

  it('historisk Fri beholder sin betydning uten tilbakevirkende fritak, og kan ikke velges på nytt', () => {
    const s0 = withHistoricFri();
    const s1 = commitRules(s0, 'localAdmin', withStatus(s0.rules, FRI, { active: false }), TODAY);
    const past = entryAt(s1, 'f1', PAST)!;
    expect(past.statusId).toBe(FRI);
    expect(entryProblems(s1, past, TODAY)).toEqual([]);
    expect(isDutyExempt(s1, past, TODAY)).toBe(false);
    expect(rulesForDate(s1, PAST, TODAY).statuses.find((x) => x.id === FRI)!.active).toBe(true);
    const fresh = setStatus(s1, 'planner', d('f1', FUTURE, FRI), { today: TODAY });
    expect(fresh.applied).toBe(false);
    expect(fresh.plan.violations.map((v) => v.code)).toContain('inactiveStatus');
  });
});

describe('visningsgruppene og tilstedeværelsen er oppsett (A-STA-04, A-STA-07)', () => {
  it('visningsgruppen påvirker ingen beregning: bare «regnes som til stede» gjør det', () => {
    const s = added(makeState(), d('f1', FUTURE, S.homeOffice));
    // Flytt Hjemmekontor til gruppen Til stede uten å endre tilstedeværelsen.
    const regrouped: PlannerState = { ...s, rules: withStatus(s.rules, S.homeOffice, { group: G.present }) };
    expect(presenceOf(regrouped, 'f1', FUTURE)).toBe(presenceOf(s, 'f1', FUTURE));
    expect(dayCoverage(regrouped, FUTURE)).toEqual(dayCoverage(s, FUTURE));
    expect(statusesByGroup(regrouped.rules)[0]!.items.map((x) => x.id)).toContain(S.homeOffice);
    // Et fagmiljø der hjemmekontor regnes som til stede, får en annen tilstedeværelse.
    const present: PlannerState = { ...s, rules: withStatus(s.rules, S.homeOffice, { present: true }) };
    expect(presenceOf(present, 'f1', FUTURE)).toBe('present');
    // Ledig for ny vakt er fortsatt bare den uten status (personal.md §7.2).
    expect(freeForNew(present, d('f1', FUTURE, S.duty1), TODAY).map((v) => v.code)).toEqual(['occupied']);
  });

  it('fremheving er bare visning: Referent uten fremheving har samme dekning', () => {
    const s = added(makeState(), d('f3', FUTURE, S.referent));
    const plain: PlannerState = { ...s, rules: withStatus(s.rules, S.referent, { highlighted: false }) };
    expect(validateRules(plain.rules)).toEqual([]);
    expect(dayCoverage(plain, FUTURE)).toEqual(dayCoverage(s, FUTURE).map((c) => (c.status.id === S.referent ? { ...c, status: { ...c.status, highlighted: false } } : c)));
  });

  it.each<[string, (r: RuleSet) => RuleSet, string]>([
    ['ingen visningsgrupper', (r) => ({ ...r, groups: [] }), 'mangler visningsgrupper'],
    ['samme gruppe to ganger', (r) => ({ ...r, groups: [...r.groups, r.groups[0]!] }), 'finnes flere ganger'],
    ['status i ukjent gruppe', (r) => withStatus(r, S.research, { group: 'finnes-ikke' }), 'ukjent visningsgruppe'],
    ['tilstedeværelse mangler', (r) => withStatus(r, S.research, { present: undefined as unknown as boolean }), 'fysisk til stede'],
    ['vakt som ikke er til stede', (r) => withStatus(r, S.duty1, { present: false }), 'må regnes som fysisk til stede'],
    ['arbeidskalender med seks dager', (r) => ({ ...r, workCalendar: { ...workCalendarOf(r), weekdays: [true, true, true, true, true, false] as unknown as WorkCalendar['weekdays'] } }), 'hver ukedag'],
    ['ukjent helligdagskalender', (r) => ({ ...r, workCalendar: { ...workCalendarOf(r), holidayCalendar: 'se' as 'no' } }), 'helligdagskalender'],
    ['ukjent ikon', (r) => withStatus(r, S.research, { icon: '<svg>' }), 'ukjent ikon'],
  ])('avviser oppsett med %s', (_label, change, message) => {
    const s = makeState();
    const rules = change(s.rules);
    expect(validateRules(rules).join(' ')).toContain(message);
    expect(() => commitRules(s, 'localAdmin', rules, TODAY)).toThrow(DomainError);
  });

  it('negativt: bare lokal administrator kan endre oppsettet', () => {
    const s = makeState();
    const rules = withStatus(s.rules, S.homeOffice, { present: true });
    for (const role of ['planner', 'reader', 'outsideArchitect'] as const) expect(() => commitRules(s, role, rules, TODAY)).toThrow();
    expect(commitRules(s, 'localAdmin', rules, TODAY).rules.version).toBe(2);
  });
});
