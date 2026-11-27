import { addDays, diffDays } from '../dates.ts';
import { dutyShareAt } from '../dutyShare.ts';
import { entryAt, isDutyExempt, peopleForDate, planSet, rulesForDate } from '../rules.ts';
import type { IsoDate, Person, PlannerState, RuleSet } from '../types.ts';

/**
 * Forventet vaktbelastning (OUSFAR docs/personal.md §6.2), felles for
 * fordelingsmotoren og oversikten over vaktbelastning, så de alltid regner
 * likt.
 *
 * For hver medarbeider, vakttype og dato er fordelingsvekten
 *
 *   vekt = stillingsvekt × vaktandel × fritaksfaktor
 *
 * Stillingsvekten er rollevekten for stillingskategorien slik den gjaldt
 * dagen, vaktandelen er medarbeiderens vaktandel den dagen (0–1), og
 * fritaksfaktoren er 0 ved vaktfritak (ferie, opplæring, innvilget fritak ved
 * Borte) og ellers 1. Bare medarbeidere som var aktive og kvalifisert for
 * vakttypen (og hadde arbeidsdag), har vekt.
 *
 * Dagens vakter fordeles på medarbeiderne i forhold til vektene, og forventet
 * antall er summen over tidsrommet. Den daglige beregningen gjør at endringer
 * i vaktandel, kvalifikasjon, stillingskategori og vaktfritak ikke gir
 * kunstige skjevheter over lengre tidsrom.
 *
 * Kalenderen ellers (forskning, undervisning, fri og andre oppgaver) avgjør
 * bare hvor vaktene kan plasseres (`available`), ikke hvor mange en skal ha.
 * Hvor mange plasser en dag har, bestemmer den som bruker tabellen: for
 * tidligere dager vaktene som faktisk står der, så en dag uten registrerte
 * vakter ikke gir forventning og manglende historikk ikke gir kunstig
 * vaktgjeld.
 */

const EPOCH = '2000-01-01';
export const dayNumber = (date: IsoDate): number => diffDays(EPOCH, date);
export const dateOfDay = (day: number): IsoDate => addDays(EPOCH, day);

/** Et tidsrom i dagnummer, begge ender med. */
export interface Window {
  start: number;
  end: number;
}

export const windowLength = (w: Window): number => w.end - w.start + 1;

/** Rollevekten for en stillingskategori; mangler den, teller kategorien som 1. */
export function categoryWeight(weights: Record<string, number> | undefined, categoryId: string): number {
  const w = weights?.[categoryId];
  return w === undefined || !(w >= 0) ? 1 : w;
}

/** Vekter og tilgjengelighet per dag i et tidsrom. Indekser: [person][vakttype][dag − start] og [vakttype][dag − start]. */
export interface ShareTable {
  window: Window;
  /** Antall plasser per vakttype og dag. */
  demand: Uint16Array[];
  /** Fordelingsvekten (stillingsvekt × vaktandel × fritaksfaktor) på dager med plasser, ellers 0. */
  weight: Float64Array[][];
  /** Summen av vektene per vakttype og dag. */
  weightSum: Float64Array[];
  /** 1 når personen var aktiv, kvalifisert og hadde arbeidsdag (kunne hatt vakten etter kravene), uansett status. */
  qualified: Uint8Array[][];
  /** 1 når personen i tillegg var ledig for vakten: ingen annen status enn vaktene som fordeles. */
  available: Uint8Array[][];
  /** 1 når personen hadde vaktfritak den dagen. [person][dag − start] */
  exempt: Uint8Array[];
}

/** Plasser en dag for en vakttype, etter reglene som gjaldt den dagen. */
export type DemandOf = (date: IsoDate, statusId: string, rules: RuleSet) => number;

/**
 * Bygg tabellen. `types` er vakttypene som fordeles; de tas alle ut av
 * kalenderen før tilgjengeligheten vurderes, så den som har en av dem, regnes
 * som ledig for alle.
 */
export function shareTable(base: PlannerState, people: Person[], types: string[], window: Window, today: IsoDate, demandOf: DemandOf): ShareTable {
  const typeIds = new Set(types);
  const noDuty: PlannerState = { ...base, entries: base.entries.filter((e) => !typeIds.has(e.statusId)) };
  const days = windowLength(window);
  const demand = types.map(() => new Uint16Array(days));
  const weightSum = types.map(() => new Float64Array(days));
  const weight = people.map(() => types.map(() => new Float64Array(days)));
  const qualified = people.map(() => types.map(() => new Uint8Array(days)));
  const available = people.map(() => types.map(() => new Uint8Array(days)));
  const exempt = people.map(() => new Uint8Array(days));
  for (let day = window.start; day <= window.end; day++) {
    const date = dateOfDay(day);
    const k = day - window.start;
    const rules = rulesForDate(base, date, today);
    let categoryThen: Map<string, string> | undefined;
    people.forEach((p, i) => {
      if (isDutyExempt(base, entryAt(noDuty, p.id, date), today)) exempt[i]![k] = 1;
    });
    types.forEach((statusId, t) => {
      const n = demandOf(date, statusId, rules);
      demand[t]![k] = n;
      if (!n) return;
      categoryThen ??= new Map(peopleForDate(base, date, today).map((p) => [p.id, p.categoryId]));
      const weights = rules.staffing.find((r) => r.statusId === statusId)?.categoryWeights;
      people.forEach((p, i) => {
        const other = entryAt(noDuty, p.id, date);
        // Kravene til personen og dagen (aktiv, kvalifisert, arbeidsdag), uten hensyn til statusen som står der.
        if (planSet(noDuty, { personId: p.id, date, statusId }, today, new Set(other ? [other.id] : [])).violations.length) return;
        qualified[i]![t]![k] = 1;
        if (!other) available[i]![t]![k] = 1;
        const w = exempt[i]![k] ? 0 : categoryWeight(weights, categoryThen!.get(p.id) ?? p.categoryId) * dutyShareAt(base, p.id, date);
        weight[i]![t]![k] = w;
        weightSum[t]![k]! += w;
      });
    });
  }
  return { window, demand, weight, weightSum, qualified, available, exempt };
}

/** Summen av en dagrekke i et tidsrom (klippet til tabellens tidsrom). */
export function sumIn(table: ShareTable, values: ArrayLike<number>, w: Window): number {
  let n = 0;
  const from = Math.max(w.start, table.window.start);
  const to = Math.min(w.end, table.window.end);
  for (let d = from; d <= to; d++) n += values[d - table.window.start]!;
  return n;
}

/** Dager i tidsrommet med plasser der personen kunne få vakten: ledig og med vekt over null. */
export function possibleDay(table: ShareTable, person: number, t: number, k: number): boolean {
  return table.available[person]![t]![k] === 1 && table.weight[person]![t]![k]! > 0;
}

/**
 * Forventet antall per person for vakttype `t` i tidsrommet: hver dags
 * plasser fordelt etter dagens vekter, summert. `demand` kan erstatte
 * tabellens plasser (samme dager eller færre), f.eks. for kalenderen før og
 * etter et forslag med samme tabell. En dag der ingen har vekt, gir ingen
 * forventning.
 */
export function expectedIn(table: ShareTable, t: number, w: Window, demand: ArrayLike<number> = table.demand[t]!): number[] {
  const from = Math.max(w.start, table.window.start) - table.window.start;
  const to = Math.min(w.end, table.window.end) - table.window.start;
  const out = table.weight.map(() => 0);
  for (let k = from; k <= to; k++) {
    const n = demand[k]!;
    const total = table.weightSum[t]![k]!;
    if (!n || !(total > 0)) continue;
    table.weight.forEach((perType, i) => (out[i]! += (n * perType[t]![k]!) / total));
  }
  return out;
}
