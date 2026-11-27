import { defaultRuleSet, RULES_EPOCH, STATUS_IDS as S } from '@delt/personal/catalog';
import { addDays, eachDay, holidayName, weekdayIndex } from '@delt/personal/dates';
import { isScheduledWorkday } from '@delt/personal/people';
import { requiredCount } from '@delt/personal/rules';
import type { CalendarEntry, DutyShareSchedule, IsoDate, Person, PlannerState, StaffCategory, TimeRange, Unit } from '@delt/personal/types';

/**
 * Syntetiske eksempeldata fra prototypen (peohol/vaktplan v0.11, `seed.ts`),
 * brukt som testgrunnlag for fasitene og regresjonstestene. Alle navn er
 * oppdiktet, og ingen data er hentet fra en arbeidsplass (docs/personal.md
 * §3.1). Genereringen er deterministisk (fast frø).
 */

/** Pilotens fagmiljø i testene: Europe/Oslo, helg og helligdager skjult som standard er av. */
export const TEST_UNIT: Unit = { id: 'unit-demo', name: 'Eksempellaboratoriet', workYearStartMonth: 1, timeZone: 'Europe/Oslo', hideWeekendsByDefault: false };

export const SEED_START: IsoDate = '2026-01-01';
export const SEED_END: IsoDate = '2027-06-30';
/** Eksempelvaktene (bare i testene) fylles bare inn hit; senere vakter står udekket for å vise behovet. */
export const SEED_DUTY_UNTIL: IsoDate = '2026-12-18';
/** Vaktplanen i eksempeldataene er publisert hit; senere vakter er godkjent, men ikke publisert. */
export const SEED_PUBLISHED_THROUGH: IsoDate = '2026-11-30';

export const CATEGORIES: StaffCategory[] = [
  { id: 'lis', name: 'LIS', short: 'LIS' },
  { id: 'overlege', name: 'Overlege', short: 'OL' },
];

/** Oppdiktede medarbeidere. */
function syntheticPeople(): Person[] {
  const p = (id: string, name: string, categoryId: string, qualifications: string[]): Person => ({ id, name, categoryId, qualifications, active: true });
  const both = [S.duty1, S.duty2];
  return [
    p('p01', 'Alma Berg', 'lis', both),
    p('p02', 'Jonas Vik', 'lis', both),
    p('p03', 'Sanna Myhre', 'lis', both),
    p('p04', 'Emil Østby', 'lis', both),
    p('p05', 'Noor Aasen', 'lis', both),
    p('p06', 'Tobias Lunde', 'lis', [S.duty1]),
    p('p07', 'Ida Strand', 'lis', []),
    p('p08', 'Maja Holte', 'overlege', both),
    p('p09', 'Fredrik Solvik', 'overlege', both),
    p('p10', 'Ingrid Falk', 'overlege', both),
    p('p11', 'Henrik Dahl', 'overlege', both),
    p('p12', 'Live Rønning', 'overlege', [S.duty2]),
  ];
}

/**
 * Oppdiktede vaktandeler: de fleste 100 %. Noor Aasen og Ingrid Falk har
 * redusert vaktandel (de har også fridager i kalenderen, som ikke gir noen
 * ytterligere reduksjon), Jonas Vik har en midlertidig redusert vaktandel,
 * Henrik Dahl går ned til 80 % fra nyttår, og Tobias Lunde har en måned med
 * 0 % (tildeles ikke vakt automatisk).
 */
function syntheticDutyShares(people: Person[]): Record<string, DutyShareSchedule> {
  const special: Record<string, DutyShareSchedule> = {
    p05: { ordinary: [{ from: RULES_EPOCH, percent: 80 }], temporary: [] },
    p10: { ordinary: [{ from: RULES_EPOCH, percent: 60 }], temporary: [] },
    p02: { ordinary: [{ from: RULES_EPOCH, percent: 100 }], temporary: [{ id: 'va-p02-1', from: '2026-12-01', to: '2027-02-28', percent: 50 }] },
    p11: { ordinary: [{ from: RULES_EPOCH, percent: 100 }, { from: '2027-01-01', percent: 80 }], temporary: [] },
    p06: { ordinary: [{ from: RULES_EPOCH, percent: 100 }], temporary: [{ id: 'va-p06-1', from: '2027-03-01', to: '2027-03-31', percent: 0 }] },
  };
  return Object.fromEntries(people.map((p) => [p.id, special[p.id] ?? { ordinary: [{ from: RULES_EPOCH, percent: 100 }], temporary: [] }]));
}

/** Ukedager en medarbeider med variabel deltid typisk er borte (bare for å lage variasjon i eksempeldataene). */
const PART_TIME_DAYS_OFF: Record<string, number[]> = { p03: [4], p05: [2], p10: [1, 3], p12: [0, 2] };

/** Liten deterministisk tallgenerator (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SeedOptions {
  /**
   * Ta med eksempelvakter (vakt 1 og vakt 2) frem til `SEED_DUTY_UNTIL`. Bare
   * for testene, som bygger på dem. Appens startdata har ingen vakter, så
   * vaktfordelingen kan prøves fra blanke ark (Issue #14).
   */
  withSampleDuties?: boolean;
}

export function createSeedState({ withSampleDuties = false }: SeedOptions = {}): PlannerState {
  const rules = defaultRuleSet();
  const people = syntheticPeople();
  const rand = rng(20261124);
  const entries: CalendarEntry[] = [];
  const taken = new Set<string>();
  let n = 0;
  const key = (pid: string, d: IsoDate) => `${d}|${pid}`;
  const free = (pid: string, d: IsoDate) => !taken.has(key(pid, d));
  /** Én status per medarbeider og dag: en celle som alt har status, endres ikke. */
  const put = (pid: string, date: IsoDate, statusId: string, extra: { time?: TimeRange; note?: string; exempt?: true } = {}) => {
    if (!free(pid, date)) return;
    n += 1;
    entries.push({ id: `s${n}`, personId: pid, date, statusId, ruleVersion: 1, ...extra });
    taken.add(key(pid, date));
  };
  const work = (person: Person, d: IsoDate) => isScheduledWorkday(person, d, rules);
  const days = eachDay(SEED_START, SEED_END);
  const hours = (a: number, b: number): TimeRange => ({ start: a * 60, end: b * 60 });

  // 1. Ferie og fravær: sommerferie, høstferie, vinterferie og spredte enkeltdager.
  people.forEach((person, i) => {
    const summerStart = addDays('2026-06-29', (i % 4) * 7);
    // Sommerferie og vinterferie er Ferie (vaktfritak). Borte i oktober har for noen et
    // administrativt vaktfritak (ingen årsak registreres); for de andre er det vanlig fravær.
    const blocks: [IsoDate, number, string, boolean?][] = [
      [summerStart, 21, S.vacation],
      [addDays('2026-02-16', (i % 3) * 7), 5, S.vacation],
      [addDays('2026-10-05', (i % 2) * 7), 5, S.away, i % 4 === 2],
      [addDays('2027-02-15', (i % 3) * 7), 5, S.vacation],
    ];
    if (i % 3 === 0) blocks.push([addDays('2026-12-21', (i % 2) * 7), 5, S.away]);
    for (const [start, len, statusId, exempt] of blocks) {
      for (let k = 0; k < len; k++) {
        const d = addDays(start, k);
        if (work(person, d)) put(person.id, d, statusId, exempt ? { exempt: true } : {});
      }
    }
    for (const d of days) {
      if (!work(person, d) || !free(person.id, d)) continue;
      // Variabel deltid: oftest borte på én bestemt ukedag, men ikke hver uke.
      if (PART_TIME_DAYS_OFF[person.id]?.includes(weekdayIndex(d)) && rand() < 0.8) put(person.id, d, S.away);
      else if (rand() < 0.012) put(person.id, d, S.away);
      else if (rand() < 0.006) put(person.id, d, S.timeOff);
    }
  });

  // 2. Hjemmekontor, forskning, ønsker, ukentlig undervisning og opplæring for nyansatt.
  people.forEach((person, i) => {
    for (const d of days) {
      if (!work(person, d) || !free(person.id, d)) continue;
      const wd = weekdayIndex(d);
      if (i % 4 === 1 && wd === 4 && rand() < 0.6) put(person.id, d, S.homeOffice);
      else if (person.categoryId === 'overlege' && wd === i % 5 && rand() < 0.5) put(person.id, d, S.research);
      else if (rand() < 0.01) put(person.id, d, S.wishOff);
    }
  });
  for (const d of days) {
    if (weekdayIndex(d) === 3) {
      const candidates = people.filter((p) => p.categoryId === 'overlege' && work(p, d) && free(p.id, d));
      const t = candidates[Math.floor(rand() * candidates.length)];
      if (t) put(t.id, d, S.teaching, { time: hours(12, 13), note: 'Kurs for LIS' });
    }
    const trainee = people.find((p) => p.id === 'p07')!;
    if (d >= '2026-08-17' && d <= '2026-10-30' && work(trainee, d)) put(trainee.id, d, S.training);
  }

  // 3. Vakter, bare til ledige medarbeidere. Enkel rotasjon for å lage gyldige
  //    eksempeldata; dette er ikke vaktfordelingsmotoren (delmål B). Vaktene
  //    lages alltid, så de andre statusene (som referent) blir de samme med og
  //    uten eksempelvakter, og tas bort til slutt når de ikke skal være med.
  const count: Record<string, number> = Object.fromEntries(people.map((p) => [p.id, 0]));
  const last: Record<string, IsoDate> = {};
  let mondays = 0;
  const eligible = (p: Person, d: IsoDate, sid: string) => p.qualifications.includes(sid) && work(p, d) && free(p.id, d);
  for (const d of days) {
    if (d > SEED_DUTY_UNTIL) break;
    for (const sid of [S.duty1, S.duty2]) {
      if (requiredCount(rules, sid, d) === 0) continue;
      const ranked = people
        .filter((p) => eligible(p, d, sid))
        .map((p) => {
          const gap = last[p.id] ? (Date.parse(d) - Date.parse(last[p.id]!)) / 86_400_000 : 30;
          const weight = sid === S.duty1 ? (p.categoryId === 'lis' ? 2 : 1) : p.categoryId === 'lis' ? 1 : 2;
          return { p, score: count[p.id]! / weight - Math.min(gap, 14) * 0.35 + rand() * 0.6 };
        })
        .sort((a, b) => a.score - b.score);
      const chosen = ranked[0]?.p;
      // Noen få hull i fremtiden, slik at udekkede vakter vises.
      if (!chosen || (d > '2026-11-30' && rand() < 0.06)) continue;
      // Av og til et klokkeslett og en merknad, som tilleggsinformasjon til kollegene.
      put(chosen.id, d, sid, rand() < 0.04 ? { time: hours(8, 12), note: 'Bytter med kollega etter lunsj' } : {});
      count[chosen.id]! += 1;
      last[chosen.id] = d;
    }
    // Referent på mandager, på omgang, blant dem som er ledige.
    if (weekdayIndex(d) === 0 && !holidayName(d, 'no')) {
      mondays += 1;
      for (let k = 0; k < people.length; k++) {
        const r = people[(mondays + k) % people.length]!;
        if (work(r, d) && free(r.id, d)) {
          put(r.id, d, S.referent, { note: 'Morgenmøtet' });
          break;
        }
      }
    }
  }

  return {
    unit: structuredClone(TEST_UNIT),
    categories: structuredClone(CATEGORIES),
    people,
    rules,
    ruleVersions: [],
    ruleVersionSeq: rules.version,
    peopleFrom: RULES_EPOCH,
    peopleHistory: [],
    dutyShares: syntheticDutyShares(people),
    entries: withSampleDuties ? entries : entries.filter((e) => e.statusId !== S.duty1 && e.statusId !== S.duty2),
    publishedThrough: SEED_PUBLISHED_THROUGH,
  };
}
