import { describe, expect, it } from 'vitest';
import './hjelp';
import { added, d, makeState } from './fixtures';
import { DEFAULT_GROUPS, DEFAULT_STATUSES, defaultRuleSet, GROUP_IDS as G, STATUS_IDS as S, statusesByGroup } from '@delt/personal/catalog';
import { setStatus } from '@delt/personal/commands';
import { dayCoverage, entryAt, entryIndex, entryProblems, freeForNew, invariantErrors, planSet, presenceOf, statusIndex } from '@delt/personal/rules';
import type { CalendarEntry, PlannerState } from '@delt/personal/types';

/** Syntetiske data (oppdiktede navn). Tirsdag 24.11.2026 er en vanlig arbeidsdag. */
const TUE = '2026-11-24';
const SAT = '2026-11-28';
const HOLIDAY = '2026-05-14'; // Kristi himmelfartsdag

let seq = 0;
function entry(personId: string, date: string, statusId: string, extra: Partial<CalendarEntry> = {}): CalendarEntry {
  seq += 1;
  return { id: `t${seq}`, personId, date, statusId, ruleVersion: 1, ...extra };
}
const withEntries = (...entries: CalendarEntry[]): PlannerState => ({ ...makeState(), entries });

describe('statuskatalogen', () => {
  it('har statusene i de tre visningsgruppene fra vedtaket 27.11.2026, i fast rekkefølge (B17, A-STA-04)', () => {
    const rules = defaultRuleSet();
    const groups = statusesByGroup(rules).map((g) => [g.group.name, g.items.map((x) => `${x.name}:${x.icon}`)]);
    expect(groups).toEqual([
      ['Til stede', ['Vakt 1:shield', 'Vakt 2:shield', 'Referent:pencil', 'Opplæring:bulb']],
      ['Jobber et annet sted', ['Hjemmekontor:house', 'Forskning:microscope', 'Undervisning:cap']],
      ['Fraværende', ['Borte:cross', 'Ferie:sun', 'Avspasering:clock', 'Ønske om fri:question']],
    ]);
    expect(rules.groups).toEqual(DEFAULT_GROUPS);
    // Fri er slått sammen med Ferie og finnes ikke som nytt valg.
    expect(rules.statuses.some((x) => x.name === 'Fri')).toBe(false);
  });

  it('bare Til stede-statusene regnes som fysisk til stede; vaktene og Referent er fremhevede oppgaver', () => {
    const rules = defaultRuleSet();
    expect(rules.statuses.filter((x) => x.present).map((x) => x.id)).toEqual([S.duty1, S.duty2, S.referent, S.training]);
    expect(rules.statuses.filter((x) => x.highlighted).map((x) => x.id)).toEqual([S.duty1, S.duty2, S.referent]);
    expect(rules.statuses.filter((x) => x.present).every((x) => x.group === G.present)).toBe(true);
  });

  it('vaktene er grønn og blå, finnes én gang per dag og krever kvalifikasjon; Borte er rød; Ønske om fri er merket som ønske', () => {
    const idx = statusIndex(defaultRuleSet());
    expect(idx.get(S.duty1)).toMatchObject({ tone: 'green', uniquePerDay: true, requiresQualification: true });
    expect(idx.get(S.duty2)).toMatchObject({ tone: 'blue', uniquePerDay: true, requiresQualification: true });
    expect(idx.get(S.away)).toMatchObject({ tone: 'red', group: G.absent, present: false });
    expect(idx.get(S.wishOff)).toMatchObject({ wish: true, group: G.absent, present: false });
    expect(idx.get(S.vacation)).toMatchObject({ icon: 'sun', dutyExemption: 'always', group: G.absent });
    expect(defaultRuleSet().statuses.filter((x) => x.uniquePerDay).map((x) => x.id)).toEqual([S.duty1, S.duty2]);
  });

  it('regelsettet har ingen kombinasjons- eller eksklusjonsregler', () => {
    expect(Object.keys(defaultRuleSet()).sort()).toEqual(['effectiveFrom', 'groups', 'staffing', 'statuses', 'version', 'workCalendar']);
  });
});

describe('én status per medarbeider per dag', () => {
  it('en ny status erstatter den som står i cellen', () => {
    const s = withEntries(entry('f1', TUE, S.homeOffice));
    const plan = planSet(s, d('f1', TUE, S.duty1));
    expect(plan.violations).toEqual([]);
    expect(plan.replaces?.statusId).toBe(S.homeOffice);
    const next = setStatus(s, 'planner', d('f1', TUE, S.duty1)).state;
    expect(next.entries.map((e) => e.statusId)).toEqual([S.duty1]);
  });

  it('samme status med ny merknad eller tid beholder registreringen (ID, regelversjon og lås)', () => {
    const s = withEntries(entry('f1', TUE, S.referent, { id: 'r1', ruleVersion: 1, locked: true }));
    const next = setStatus(s, 'planner', d('f1', TUE, S.referent, { note: 'Morgenmøtet', time: { start: 480, end: 540 } })).state;
    expect(next.entries).toEqual([{ id: 'r1', personId: 'f1', date: TUE, statusId: S.referent, note: 'Morgenmøtet', time: { start: 480, end: 540 }, ruleVersion: 1, locked: true }]);
  });

  it('invariantene oppdager to statuser i en celle og to av samme vakt samme dag', () => {
    const statuses = statusIndex(defaultRuleSet());
    expect(invariantErrors([entry('f1', TUE, S.referent), entry('f1', TUE, S.training)], statuses)).toHaveLength(1);
    expect(invariantErrors([entry('f1', TUE, S.duty1), entry('f4', TUE, S.duty1)], statuses)).toHaveLength(1);
    expect(invariantErrors([entry('f1', TUE, S.referent), entry('f4', TUE, S.referent), entry('f2', TUE, S.duty2)], statuses)).toEqual([]);
  });

  it('cellen har høyst én registrering i oppslaget', () => {
    const s = withEntries(entry('f1', TUE, S.referent));
    expect(entryIndex(s.entries).get(`${TUE}|f1`)?.statusId).toBe(S.referent);
    expect(entryAt(s, 'f1', TUE)?.statusId).toBe(S.referent);
    expect(entryAt(s, 'f2', TUE)).toBeUndefined();
  });
});

describe('vakter og overtakelse', () => {
  it('en vakt som en annen har samme dag, kan bare tas over: planen viser hvem den tas fra', () => {
    const s = withEntries(entry('f4', TUE, S.duty1, { id: 'v1' }));
    const plan = planSet(s, d('f1', TUE, S.duty1));
    expect(plan.violations).toEqual([]);
    expect(plan.takesOver?.id).toBe('v1');
  });

  it('samme vakt på samme person er ikke en overtakelse', () => {
    const s = withEntries(entry('f1', TUE, S.duty1));
    expect(planSet(s, d('f1', TUE, S.duty1, { note: 'Kort merknad' })).takesOver).toBeUndefined();
  });

  it('Vakt 1 og Vakt 2 kan ha hver sin person samme dag', () => {
    const s = added(added(makeState(), d('f1', TUE, S.duty1)), d('f4', TUE, S.duty2));
    expect(s.entries.map((e) => `${e.personId}:${e.statusId}`).sort()).toEqual([`f1:${S.duty1}`, `f4:${S.duty2}`]);
  });
});

describe('krav til statusen', () => {
  const codes = (s: PlannerState, personId: string, date: string, statusId: string, extra = {}) => planSet(s, d(personId, date, statusId, extra)).violations.map((v) => v.code);

  it('vakt krever kvalifikasjon for akkurat den vakten', () => {
    expect(codes(makeState(), 'f3', TUE, S.duty1)).toEqual(['notQualified']);
    expect(codes(makeState(), 'f2', TUE, S.duty1)).toEqual(['notQualified']);
    expect(codes(makeState(), 'f2', TUE, S.duty2)).toEqual([]);
  });

  it('statuser på kontoret krever en arbeidsdag; statuser utenfor kontoret kan registreres i helg og på helligdag', () => {
    for (const date of [SAT, HOLIDAY]) {
      expect(codes(makeState(), 'f1', date, S.duty1)).toEqual(['notWorkday']);
      expect(codes(makeState(), 'f3', date, S.referent)).toEqual(['notWorkday']);
      expect(codes(makeState(), 'f1', date, S.away)).toEqual([]);
      expect(codes(makeState(), 'f1', date, S.wishOff)).toEqual([]);
    }
  });

  it('klokkeslett er valgfritt, men et ugyldig tidsrom kan ikke lagres', () => {
    expect(codes(makeState(), 'f1', TUE, S.duty1, { time: { start: 480, end: 720 } })).toEqual([]);
    expect(codes(makeState(), 'f1', TUE, S.duty1, { time: { start: 720, end: 480 } })).toEqual(['invalidTime']);
    expect(codes(makeState(), 'f1', TUE, S.duty1, { time: { start: 600, end: 600 } })).toEqual(['invalidTime']);
  });

  it('merknaden følger personvernreglene for fritekst', () => {
    expect(codes(makeState(), 'f1', TUE, S.away, { note: 'Kurs i Bergen' })).toEqual([]);
    expect(codes(makeState(), 'f1', TUE, S.away, { note: 'sykemeldt' })).toEqual(['note']);
    expect(codes(makeState(), 'f1', TUE, S.away, { note: '010190 12345' })).toEqual(['note']);
  });

  it('en utgått status kan ikke velges, men gamle registreringer står og er gyldige', () => {
    const base = withEntries(entry('f3', TUE, S.research, { id: 'old' }));
    const s: PlannerState = { ...base, rules: { ...base.rules, statuses: base.rules.statuses.map((x) => (x.id === S.research ? { ...x, active: false } : x)) } };
    expect(codes(s, 'f1', TUE, S.research)).toEqual(['inactiveStatus']);
    expect(entryProblems(s, s.entries[0]!)).toEqual([]);
    // Merknaden på en utgått status kan fortsatt endres.
    expect(codes(s, 'f3', TUE, S.research, { note: 'Skriver artikkel' })).toEqual([]);
  });

  it('en vakt som er blitt ugyldig, markeres, men endres ikke', () => {
    const s0 = added(makeState(), d('f1', TUE, S.duty1));
    const s: PlannerState = { ...s0, people: s0.people.map((p) => (p.id === 'f1' ? { ...p, qualifications: [] } : p)) };
    expect(entryProblems(s, s.entries[0]!).map((v) => v.code)).toEqual(['notQualified']);
    expect(s.entries).toEqual(s0.entries);
  });
});

describe('tilstedeværelse', () => {
  it('uten status til stede på arbeidsdager; på kontoret er til stede; utenfor kontoret er borte; helg er ikke arbeidsdag', () => {
    let s = makeState();
    expect(presenceOf(s, 'f1', TUE)).toBe('present');
    expect(presenceOf(s, 'f1', SAT)).toBe('off');
    s = added(s, d('f1', TUE, S.referent));
    expect(presenceOf(s, 'f1', TUE)).toBe('present');
    for (const x of DEFAULT_STATUSES.filter((x) => !x.present)) {
      expect(presenceOf(withEntries(entry('f1', TUE, x.id)), 'f1', TUE)).toBe('away');
    }
  });

  it('klokkeslett påvirker ikke tilstedeværelsen', () => {
    const s = withEntries(entry('f1', TUE, S.away, { time: { start: 480, end: 600 } }));
    expect(presenceOf(s, 'f1', TUE)).toBe('away');
  });

  it('ledig for ny vakt bare uten status; alle statuser gjør personen opptatt', () => {
    expect(freeForNew(makeState(), d('f1', TUE, S.duty1))).toEqual([]);
    for (const x of DEFAULT_STATUSES.filter((x) => x.id !== S.duty1)) {
      expect(freeForNew(withEntries(entry('f1', TUE, x.id)), d('f1', TUE, S.duty1)).map((v) => v.code)).toContain('occupied');
    }
    expect(freeForNew(withEntries(entry('f4', TUE, S.duty1)), d('f1', TUE, S.duty1)).map((v) => v.code)).toEqual(['dutyTaken']);
  });
});

describe('dagsdekning', () => {
  it('viser manglende vakter på vanlige arbeidsdager, ingen behov i helg og på helligdag', () => {
    const slots = dayCoverage(makeState(), TUE);
    expect(slots.map((x) => [x.status.id, x.missing])).toEqual([[S.duty1, 1], [S.duty2, 1]]);
    expect(dayCoverage(makeState(), SAT)).toEqual([]);
    expect(dayCoverage(makeState(), HOLIDAY)).toEqual([]);
  });

  it('en vakt med eget klokkeslett dekker hele plassen', () => {
    const s = added(makeState(), d('f1', TUE, S.duty1, { time: { start: 480, end: 720 } }));
    expect(dayCoverage(s, TUE).find((x) => x.status.id === S.duty1)?.missing).toBe(0);
  });

  it('en ugyldig tildeling teller ikke som dekning', () => {
    const s = withEntries(entry('f3', TUE, S.duty1));
    const slot = dayCoverage(s, TUE).find((x) => x.status.id === S.duty1)!;
    expect(slot.invalid).toHaveLength(1);
    expect(slot.missing).toBe(1);
  });
});
