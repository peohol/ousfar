import { HISTORY_WINDOW, PERIOD_WINDOW, type Problem } from './model.ts';

/**
 * Kostnaden til en fordeling: summen av de myke målene, hvert med sin vekt
 * fra innstillingene. Lavere er bedre. Hvert ledd er en enkel, etterprøvbar
 * formel, og leddene kan vises hver for seg (se `TERM_LABELS`):
 *
 * - history (historisk utjevning): for hver person og vakttype:
 *   (antall − mål)² over tidshorisonten bakover fra periodens slutt
 *   (standard 365 dager), med tidligere vakter. Målet er forventet antall
 *   (hver dags plasser fordelt etter stillingsvekt × vaktandel ×
 *   fritaksfaktor, expected.ts; før perioden teller bare vaktene som faktisk
 *   ble satt opp), men slik at målet i én plan er høyst `catchUpLimit` % flere
 *   vakter enn forventet i perioden for å ta igjen (`historyGoals` i
 *   model.ts). Dekning er et hardt mål og går foran.
 * - period (rettferdighet i perioden): det samme, bare for den nye perioden
 *   isolert sett.
 *   De to har hver sin vekt og samme skala (kvadrert avvik i antall vakter),
 *   så forholdet mellom vektene sier direkte hvor mye historikken veier: med
 *   vekt h og p havner en person der h·(x − H)² + p·(x − P)² er minst, altså
 *   h / (h + p) av veien mot full historisk utjevning. Vakttypene regnes hver
 *   for seg, uten motregning.
 * - shortTerm: for hvert kort, glidende vindu: (belastning − forventet
 *   belastning)², der belastning er vakter vektet med vakttypens belastning.
 *   Skalert med 7 / vinduslengden, siden hver dag ligger i flere vinduer.
 * - spacing: for hvert par av påfølgende vakter for samme person:
 *   gjennomsnittlig belastning / avstand², avstand i kalenderdager. Én dag gir
 *   1, tre dager 0,11, åtte dager 0,016.
 * - weekday: per person og vakttype: Σ (antall på ukedagen − forventet)²,
 *   der forventet følger antall mulige dager per ukedag. Vektet med belastning.
 * - mixedCategories: 1 for hvert par av ulike vakttyper samme dag med samme
 *   stillingskategori.
 * - change: i ny plan, 1 for hver plass der en gyldig tildeling byttes ut
 *   (vekten `stability` i innstillingene). I oppdatering telles endringer for seg
 *   og veier tyngre enn alle myke mål.
 */

export const TERMS = ['history', 'period', 'shortTerm', 'spacing', 'weekday', 'mixedCategories', 'change'] as const;
export type Term = (typeof TERMS)[number];
export type Breakdown = Record<Term, number>;

export const TERM_LABELS: Record<Term, string> = {
  history: 'Historisk utjevning',
  period: 'Rettferdighet i perioden',
  shortTerm: 'Jevn belastning over tid',
  spacing: 'Avstand mellom vakter',
  weekday: 'Variasjon i ukedager',
  mixedCategories: 'Ulik kategori samme dag',
  change: 'Endringer',
};

export const zero = (): Breakdown => ({ history: 0, period: 0, shortTerm: 0, spacing: 0, weekday: 0, mixedCategories: 0, change: 0 });

export function add(a: Breakdown, b: Breakdown, sign = 1): Breakdown {
  const out = zero();
  for (const t of TERMS) out[t] = a[t] + sign * b[t];
  return out;
}

export const sum = (b: Breakdown): number => TERMS.reduce((n, t) => n + b[t], 0);

export interface Shift {
  day: number;
  type: number;
}

/** De personlige leddene (alle unntatt kategori samme dag og endringer) for én person med gitte vakter. */
export function personCost(pr: Problem, person: number, extra: Shift[]): Breakdown {
  const s = pr.settings;
  const shifts = mergeShifts(pr.fixed[person]!, extra);
  const out = zero();
  const nTypes = pr.types.length;

  // Antall per vakttype mot forventet, over tidshorisonten og i perioden.
  const deviation = (w: number, goal: (t: number) => number) => {
    const win = pr.windows[w]!;
    const counts = new Array<number>(nTypes).fill(0);
    for (const sh of shifts) if (sh.day >= win.start && sh.day <= win.end) counts[sh.type]! += 1;
    let sum = 0;
    for (let t = 0; t < nTypes; t++) {
      const d = counts[t]! - goal(t);
      sum += d * d;
    }
    return sum;
  };
  out.history = s.historyFairness * deviation(HISTORY_WINDOW, (t) => pr.historyGoals[t]![person]!);
  out.period = s.periodFairness * deviation(PERIOD_WINDOW, (t) => pr.targets[PERIOD_WINDOW]![t]![person]!);

  // Korte vinduer: hver vakt bidrar til vinduene som inneholder den (regnet ut direkte, ikke ved å lete).
  const nShort = pr.shortWindows.length;
  const loads = new Array<number>(nShort).fill(0);
  for (const sh of shifts) {
    if (sh.day < pr.horizon.start || sh.day > pr.horizon.end) continue;
    const first = Math.max(0, Math.ceil((sh.day - pr.shortStart - pr.shortLength + 1) / 7));
    const last = Math.min(nShort - 1, Math.floor((sh.day - pr.shortStart) / 7));
    for (let k = first; k <= last; k++) loads[k]! += pr.load[sh.type]!;
  }
  for (let k = 0; k < nShort; k++) {
    const d = loads[k]! - pr.shortTargets[k]![person]!;
    out.shortTerm += d * d;
  }
  out.shortTerm *= s.shortTerm * (7 / pr.shortLength);

  // Avstand mellom påfølgende vakter.
  for (let i = 1; i < shifts.length; i++) {
    const a = shifts[i - 1]!;
    const b = shifts[i]!;
    const gap = Math.max(0.5, b.day - a.day);
    out.spacing += (pr.load[a.type]! + pr.load[b.type]!) / 2 / (gap * gap);
  }
  out.spacing *= s.spacing;

  // Ukedager.
  const ww = pr.windows[pr.weekdayWindow]!;
  for (let t = 0; t < nTypes; t++) {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    let n = 0;
    for (const sh of shifts) {
      if (sh.type !== t || sh.day < ww.start || sh.day > ww.end) continue;
      counts[weekdayOfDay(sh.day)]! += 1;
      n += 1;
    }
    if (!n) continue;
    const possible = pr.weekdayEligible[person]![t]!;
    const total = possible.reduce((a, b) => a + b, 0);
    if (!total) continue;
    let dev = 0;
    for (let wd = 0; wd < 7; wd++) {
      const d = counts[wd]! - (n * possible[wd]!) / total;
      dev += d * d;
    }
    out.weekday += dev * pr.load[t]!;
  }
  out.weekday *= s.weekday;
  return out;
}

/** Dagnummer 0 (2000-01-01) var en lørdag; mandag = 0. */
export function weekdayOfDay(day: number): number {
  return (((day + 5) % 7) + 7) % 7;
}

function mergeShifts(fixed: Shift[], extra: Shift[]): Shift[] {
  if (!extra.length) return fixed;
  return [...fixed, ...extra].sort((a, b) => a.day - b.day || a.type - b.type);
}

/** Leddet for ulik kategori én dag, for vaktene som står den dagen. */
export function dayCost(pr: Problem, day: number, assigned: { person: number; type: number }[]): number {
  const all = [...(pr.fixedByDay.get(day) ?? []), ...assigned];
  let n = 0;
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i]!;
      const b = all[j]!;
      if (a.type !== b.type && a.person !== b.person && pr.category[a.person] === pr.category[b.person]) n += 1;
    }
  }
  return n * pr.settings.mixedCategories;
}
