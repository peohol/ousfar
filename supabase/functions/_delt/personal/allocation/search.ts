import { add, dayCost, personCost, sum, zero, type Breakdown, type Shift } from './cost.ts';
import type { Problem } from './model.ts';

/**
 * Søket etter en god fordeling. Fremgangsmåten er etterprøvbar og
 * deterministisk (samme data gir samme forslag):
 *
 * 1. Dag for dag, i datorekkefølge, prøves kombinasjoner av kandidater for
 *    dagens plasser, de mest lovende først. Den beste etter rekkefølgen
 *    (færrest udekkede, så færrest endringer i oppdatering, så lavest
 *    kostnad) velges. Grener med flere udekkede enn beste funn så langt
 *    hoppes over. Siden ingen harde krav går på tvers av dager, gir et
 *    fullført søk høyest mulig dekning, og i oppdatering færrest mulige
 *    endringer. Søket per dag er begrenset til `MAX_DAY_NODES` steg, så
 *    mange vakttyper samme dag ikke låser nettleseren; dager der grensen
 *    nås, telles og nevnes i forslaget.
 * 2. Lokalt søk: én plass gis til en annen kandidat, eller to plasser innen
 *    et kort vindu bytter person (også mellom en dekket og en udekket
 *    plass), så lenge det forbedrer resultatet i samme rekkefølge. Søket
 *    stopper når ingen slik endring gir forbedring (et lokalt optimum), eller
 *    etter `MAX_PASSES` gjennomganger.
 *
 * Resultatet er ikke bevist globalt optimalt for de myke målene.
 */

export const MAX_PASSES = 30;
export const MAX_DAY_NODES = 20_000;
const EPS = 1e-9;

export interface Score {
  uncovered: number;
  changes: number;
  cost: number;
}

export interface Delta extends Score {
  breakdown: Breakdown;
}

type Change = [slot: number, person: number];

export class Solution {
  readonly person: Int32Array;
  private readonly slotsOf: Set<number>[];
  private readonly personCosts: Breakdown[];
  private readonly dayCosts = new Map<number, number>();
  private readonly candidate: Uint8Array[];
  private readonly incumbentPerson: Int32Array;

  constructor(readonly pr: Problem) {
    this.person = new Int32Array(pr.slots.length).fill(-1);
    this.slotsOf = pr.people.map(() => new Set());
    this.personCosts = pr.people.map((_, i) => personCost(pr, i, []));
    for (const day of pr.slotsByDay.keys()) this.dayCosts.set(day, dayCost(pr, day, []));
    this.candidate = pr.slots.map((s) => {
      const a = new Uint8Array(pr.people.length);
      for (const c of s.candidates) a[c] = 1;
      return a;
    });
    this.incumbentPerson = Int32Array.from(pr.slots, (s) => (s.incumbent ? pr.personIndex.get(s.incumbent.personId) ?? -1 : -1));
  }

  incumbentOf(slot: number): number {
    return this.incumbentPerson[slot]!;
  }

  isChange(slot: number, person: number): boolean {
    const inc = this.incumbentPerson[slot]!;
    return inc >= 0 ? person !== inc : person >= 0;
  }

  private changeCost(slot: number, person: number): number {
    if (this.pr.request.mode !== 'new') return 0;
    const inc = this.incumbentPerson[slot]!;
    return inc >= 0 && person !== inc ? this.pr.settings.stability : 0;
  }

  /** Oppfyller kombinasjonen de harde kravene (kandidat for plassen, og forenlig med personens andre plasser samme dag)? */
  feasible(changes: Change[]): boolean {
    const mod = new Map(changes);
    const of = (s: number) => (mod.has(s) ? mod.get(s)! : this.person[s]!);
    for (const [slot, p] of changes) {
      if (p < 0) continue;
      if (!this.candidate[slot]![p]) return false;
      const s = this.pr.slots[slot]!;
      for (const other of this.pr.slotsByDay.get(s.day)!) {
        if (other !== slot && of(other) === p && !this.pr.sameDayOk(slot, other, p)) return false;
      }
    }
    return true;
  }

  /** Virkningen av endringene, uten å utføre dem. */
  delta(changes: Change[]): Delta {
    const pr = this.pr;
    const mod = new Map(changes);
    const of = (s: number) => (mod.has(s) ? mod.get(s)! : this.person[s]!);
    const persons = new Set<number>();
    const days = new Set<number>();
    let uncovered = 0;
    let changeCount = 0;
    let change = 0;
    for (const [slot, p] of changes) {
      const old = this.person[slot]!;
      if (old === p) continue;
      if (old >= 0) persons.add(old);
      if (p >= 0) persons.add(p);
      days.add(pr.slots[slot]!.day);
      uncovered += (p < 0 ? 1 : 0) - (old < 0 ? 1 : 0);
      changeCount += (this.isChange(slot, p) ? 1 : 0) - (this.isChange(slot, old) ? 1 : 0);
      change += this.changeCost(slot, p) - this.changeCost(slot, old);
    }
    let breakdown = zero();
    breakdown.change = change;
    for (const p of persons) {
      const shifts: Shift[] = [];
      for (const s of this.slotsOf[p]!) if (of(s) === p) shifts.push(this.shift(s));
      for (const [s, q] of mod) if (q === p && this.person[s] !== p) shifts.push(this.shift(s));
      breakdown = add(breakdown, add(personCost(pr, p, shifts), this.personCosts[p]!, -1));
    }
    for (const day of days) {
      const assigned = pr.slotsByDay.get(day)!.flatMap((s) => (of(s) >= 0 ? [{ person: of(s), type: pr.slots[s]!.type }] : []));
      breakdown.mixedCategories += dayCost(pr, day, assigned) - this.dayCosts.get(day)!;
    }
    return { uncovered, changes: changeCount, cost: sum(breakdown), breakdown };
  }

  private shift(slot: number): Shift {
    const s = this.pr.slots[slot]!;
    return { day: s.day, type: s.type };
  }

  apply(changes: Change[]): void {
    const persons = new Set<number>();
    const days = new Set<number>();
    for (const [slot, p] of changes) {
      const old = this.person[slot]!;
      if (old === p) continue;
      if (old >= 0) {
        this.slotsOf[old]!.delete(slot);
        persons.add(old);
      }
      if (p >= 0) {
        this.slotsOf[p]!.add(slot);
        persons.add(p);
      }
      this.person[slot] = p;
      days.add(this.pr.slots[slot]!.day);
    }
    for (const p of persons) this.personCosts[p] = personCost(this.pr, p, [...this.slotsOf[p]!].map((s) => this.shift(s)));
    for (const day of days) {
      const assigned = this.pr.slotsByDay.get(day)!.flatMap((s) => (this.person[s]! >= 0 ? [{ person: this.person[s]!, type: this.pr.slots[s]!.type }] : []));
      this.dayCosts.set(day, dayCost(this.pr, day, assigned));
    }
  }

  /** Samlet resultat med alle ledd. */
  score(): Delta {
    let breakdown = zero();
    for (const c of this.personCosts) breakdown = add(breakdown, c);
    for (const c of this.dayCosts.values()) breakdown.mixedCategories += c;
    let uncovered = 0;
    let changes = 0;
    this.person.forEach((p, slot) => {
      if (p < 0) uncovered += 1;
      if (this.isChange(slot, p)) changes += 1;
      breakdown.change += this.changeCost(slot, p);
    });
    return { uncovered, changes, cost: sum(breakdown), breakdown };
  }

  /** Personene som har en plass samme dag. */
  personsOnDay(day: number): number[] {
    return this.pr.slotsByDay.get(day)!.map((s) => this.person[s]!).filter((p) => p >= 0);
  }
}

/** Er endringen en forbedring etter rekkefølgen for modusen? */
export function improves(mode: Problem['request']['mode'], d: Score): boolean {
  if (d.uncovered !== 0) return d.uncovered < 0;
  if (mode === 'repair' && d.changes !== 0) return d.changes < 0;
  return d.cost < -EPS;
}

function better(mode: Problem['request']['mode'], a: Score, b: Score): boolean {
  return improves(mode, { uncovered: a.uncovered - b.uncovered, changes: a.changes - b.changes, cost: a.cost - b.cost });
}

/** Sammenligning etter rekkefølgen for modusen, til sortering. */
function compare(mode: Problem['request']['mode'], a: Score, b: Score): number {
  return better(mode, a, b) ? -1 : better(mode, b, a) ? 1 : 0;
}

/** Steg 1: beste kombinasjon dag for dag. Gir antall dager der søket nådde grensen. */
function fillDays(sol: Solution): number {
  const pr = sol.pr;
  const mode = pr.request.mode;
  let cutDays = 0;
  for (const day of [...pr.slotsByDay.keys()].sort((a, b) => a - b)) {
    const slots = pr.slotsByDay.get(day)!;
    // Oppdatering: står gyldige tildelinger på alle plassene, er det ingenting å endre.
    if (mode === 'repair') {
      const keep: Change[] = slots.map((s) => [s, sol.incumbentOf(s)]);
      if (keep.every(([, p]) => p >= 0) && sol.feasible(keep)) {
        sol.apply(keep);
        continue;
      }
    }
    // De som passer best alene prøves først, så det første fullstendige valget er godt og grensen sjelden betyr noe.
    const options = slots.map((slot) => [
      ...pr.slots[slot]!.candidates
        .map((p) => ({ p, d: sol.delta([[slot, p]]) }))
        .sort((a, b) => compare(mode, a.d, b.d) || a.p - b.p)
        .map((x) => x.p),
      -1,
    ]);
    let best: { changes: Change[]; score: Score } | null = null;
    let nodes = 0;
    let cut = false;
    const choice: Change[] = [];
    const visit = (k: number, missing: number) => {
      if (k === slots.length) {
        if (!sol.feasible(choice)) return;
        const d = sol.delta(choice);
        if (!best || better(mode, d, best.score)) best = { changes: choice.map((c) => [...c] as Change), score: d };
        return;
      }
      const slot = slots[k]!;
      for (const p of options[k]!) {
        if (cut) return;
        // Plassene er tomme før dagen fylles, så antall udekkede i valget er `missing` minus antall plasser.
        if (p < 0 && best && missing + 1 - slots.length > (best as { score: Score }).score.uncovered) continue;
        if (p >= 0 && !choice.every(([s, q]) => q !== p || pr.sameDayOk(s, slot, p))) continue;
        if (++nodes > MAX_DAY_NODES) {
          cut = true;
          return;
        }
        choice.push([slot, p]);
        visit(k + 1, missing + (p < 0 ? 1 : 0));
        choice.pop();
      }
    };
    visit(0, 0);
    if (cut) cutDays += 1;
    if (best) sol.apply((best as { changes: Change[] }).changes);
  }
  return cutDays;
}

/** Steg 2: lokalt søk med flytting av én plass og bytte mellom to plasser. */
export function improve(sol: Solution): number {
  const pr = sol.pr;
  const mode = pr.request.mode;
  const L = pr.shortLength;
  // Bytter vurderes mellom plasser innen et kort vindu, også mellom ulike vakttyper.
  const partners = pr.slots.map((a) => pr.slots.filter((b) => b.index > a.index && Math.abs(b.day - a.day) < L).map((b) => b.index));
  let passes = 0;
  for (; passes < MAX_PASSES; passes++) {
    let improved = false;
    for (const slot of pr.slots) {
      const i = slot.index;
      const cur = sol.person[i]!;
      let best: { changes: Change[]; d: Score } | null = null;
      const consider = (changes: Change[]) => {
        if (!sol.feasible(changes)) return;
        const d = sol.delta(changes);
        if (improves(mode, d) && (!best || better(mode, d, best.d))) best = { changes, d };
      };
      for (const p of slot.candidates) if (p !== cur) consider([[i, p]]);
      // Bytte med en udekket plass flytter personen dit, så det blir dekket der i stedet.
      for (const j of partners[i]!) {
        const q = sol.person[j]!;
        if (q !== cur) consider([[i, q], [j, cur]]);
      }
      if (best) {
        sol.apply((best as { changes: Change[] }).changes);
        improved = true;
      }
    }
    if (!improved) break;
  }
  return passes;
}

export interface SearchResult {
  solution: Solution;
  passes: number;
  /** Stoppet søket fordi ingen enkel endring ga forbedring (lokalt optimum)? */
  localOptimum: boolean;
  /** Dager der søket etter beste kombinasjon nådde grensen, så dekningen der ikke er bevist høyest mulig. */
  cutDays: number;
}

export function solve(pr: Problem): SearchResult {
  const solution = new Solution(pr);
  const cutDays = fillDays(solution);
  const passes = improve(solution);
  return { solution, passes, localOptimum: passes < MAX_PASSES, cutDays };
}
