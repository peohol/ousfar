import { allocationSettings } from '../catalog.ts';
import { diffDays, formatDateNo, isIsoDate, todayIn, weekdayIndex } from '../dates.ts';
import { DomainError } from '../commands.ts';
import { dutyShareAt } from '../dutyShare.ts';
import { entryProblems, freeForNew, personById, requiredCount, rulesForDate, staffingCap, statusIndex, type EntryDraft, type Violation } from '../rules.ts';
import type { AllocationSettings, CalendarEntry, IsoDate, Person, PlannerState, StaffingRequirement } from '../types.ts';
import { dateOfDay, dayNumber, expectedIn, possibleDay, shareTable, type Window } from './expected.ts';

export { dateOfDay, dayNumber, type Window } from './expected.ts';

/**
 * Fordelingsproblemet: hvilke plasser som skal fylles, hvem som oppfyller de
 * harde kravene for hver plass, og konstantene de myke målene regnes mot.
 *
 * Harde krav vurderes av den samme regelmotoren som kalenderen, mot
 * kalenderen med de åpne tildelingene tatt ut. Tilstedeværelse og
 * tilgjengelighet er atskilt:
 *
 * - Tilgjengelig for en ny vakt er bare den som ikke har noen status den
 *   dagen (`freeForNew`), og som oppfyller kravene til vakten
 *   (kvalifikasjon, arbeidsdag, aktiv).
 * - Forventet antall avhenger ikke av tilgjengeligheten, men av
 *   stillingsvekt × vaktandel × fritaksfaktor (expected.ts). Andre oppgaver i
 *   kalenderen gir derfor ikke færre forventede vakter; skjevheten de gir,
 *   synes i oversikten og jevnes ut i senere planer. Vaktfritak (ferie,
 *   opplæring, innvilget fritak) gir ingen forventning og ingen vaktgjeld.
 * - Vaktandel 0 % utelukker automatisk tildeling.
 *
 * Klokkeslett påvirker ingenting her. Samme person kan aldri ha to plasser
 * samme dag (én status per dag). Ingen harde krav går på tvers av dager, så
 * dekningen kan avgjøres dag for dag.
 *
 * Publiserte datoer er en del av den publiserte vaktplanen. Uten uttrykkelig
 * tillatelse lages ingen plasser der, heller ikke for ledige plasser.
 */

export type AllocationMode = 'repair' | 'new';

export interface AllocationRequest {
  from: IsoDate;
  to: IsoDate;
  /** `repair`: fyll hull med færrest mulige endringer. `new`: fordel perioden på nytt med vekt på rettferdighet. */
  mode: AllocationMode;
  /** Publiserte vakter kan endres. Krever uttrykkelig tillatelse. */
  allowPublished?: boolean;
}

/** Lengste periode som kan fordeles i én operasjon. */
export const MAX_PERIOD_DAYS = 366;

/** Hvor langt bakover og fremover vakter utenfor perioden tas med i avstandsvurderingen. */
const SPACING_MARGIN = 60;

/** Plassen i `Problem.windows` for perioden og for tidshorisonten for historisk utjevning. */
export const PERIOD_WINDOW = 0;
export const HISTORY_WINDOW = 1;

export interface Slot {
  index: number;
  date: IsoDate;
  day: number;
  /** Indeks i `Problem.types`. */
  type: number;
  /** Gyldig tildeling som står her nå, og som kan beholdes. */
  incumbent?: CalendarEntry;
  /** Personindekser som oppfyller alle harde krav for plassen. */
  candidates: number[];
  /**
   * Plassen trengs for dekningen, men det er ikke fysisk plass til en til
   * (tildelinger som står fast, fyller grensen). Den har ingen kandidater og
   * vises som udekket med denne årsaken.
   */
  blocked?: string;
}

export interface Problem {
  base: PlannerState;
  today: IsoDate;
  request: AllocationRequest;
  settings: AllocationSettings;
  /** Første dag som kan endres: periodens start, men aldri før i dag. */
  start: IsoDate;
  /** Vakttypene som fordeles (status-IDer med bemanningsbehov). */
  types: string[];
  load: number[];
  people: Person[];
  personIndex: Map<string, number>;
  category: string[];
  slots: Slot[];
  slotsByDay: Map<number, number[]>;
  /** Åpne tildelinger som tas ut og eventuelt settes inn igjen. */
  open: CalendarEntry[];
  /** Åpne tildelinger som bryter reglene og derfor fjernes uansett. */
  invalid: { entry: CalendarEntry; problems: Violation[] }[];
  /** Vakter som ikke endres (fortid, låste, publiserte, utenfor perioden), per person, sortert. */
  fixed: { day: number; type: number }[][];
  /** De samme, per dag (for målet om ulik kategori samme dag). */
  fixedByDay: Map<number, { person: number; type: number }[]>;
  /** Låste eller publiserte vakter som bryter reglene. De endres ikke, men vises. */
  untouchedInvalid: CalendarEntry[];
  /** Kan samme person ha begge plassene samme dag? Aldri: én status per medarbeider per dag. */
  sameDayOk: (a: number, b: number, person: number) => boolean;
  /** Ledige plasser på publiserte datoer som ikke fylles uten tillatelse. */
  publishedGaps: number;
  /** Kalenderen med de åpne tildelingene tatt ut. Kandidatene er vurdert mot denne. */
  cleared: PlannerState;
  /** Første og siste dag (dagnummer) vaktene telles i. */
  horizon: Window;
  /**
   * Vinduene antall måles i: perioden (`PERIOD_WINDOW`) og tidshorisonten for
   * historisk utjevning bakover fra periodens slutt (`HISTORY_WINDOW`), som
   * alltid omfatter hele perioden. Ukedagsvariasjonen måles i det lengste.
   */
  windows: Window[];
  weekdayWindow: number;
  shortWindows: Window[];
  /** Start (før klipping) på det første korte vinduet; de neste starter 7, 14, … dager senere. */
  shortStart: number;
  shortLength: number;
  /** Forventet antall per vindu, vakttype og person. */
  targets: number[][][];
  /**
   * Målet for historisk utjevning per vakttype og person: forventet antall
   * over tidshorisonten, men slik at målet i én plan er høyst `catchUpLimit` %
   * flere vakter enn forventet i perioden, og de andre gir fra seg
   * tilsvarende. En større skjevhet jevnes ut over flere planer, så
   * utjevningen ikke gir en urimelig tett vaktplan. Det er et mål i
   * kostnadsfunksjonen, ikke en grense for faktisk antall: dekning, låste og
   * publiserte vakter og tilgjengelighet går foran.
   */
  historyGoals: number[][];
  /** Forventet belastning per kort vindu og person. */
  shortTargets: number[][];
  /** Dager personen kunne fått vakttypen (ledig og med vekt over null), per person, vakttype og ukedag i vinduet for ukedagsvariasjon. */
  weekdayEligible: number[][][];
  /** Dager i perioden personen kunne fått vakttypen (ledig og med vekt over null), per person og vakttype. */
  eligibleInPeriod: number[][];
}

/**
 * Hvorfor personen ikke kan tildeles en ny vakt automatisk: kalenderens krav
 * (`freeForNew`: ingen status den dagen, kvalifikasjon, arbeidsdag, aktiv) og
 * vaktandel over 0 %. Tom liste = kan tildeles.
 */
export function allocationBlockers(state: PlannerState, draft: EntryDraft, today: IsoDate): Violation[] {
  const v = freeForNew(state, draft, today);
  if (!v.length && dutyShareAt(state, draft.personId, draft.date) <= 0) {
    v.push({ code: 'noDutyShare', message: `${personById(state, draft.personId)?.name ?? 'Medarbeideren'} har vaktandel 0 % og tildeles ikke vakt automatisk.` });
  }
  return v;
}

/** Hvorfor perioden ikke kan fordeles, eller null. Brukes både her og i skjemaet. */
export function allocationPeriodError(from: IsoDate, to: IsoDate, today: IsoDate): string | null {
  if (!isIsoDate(from) || !isIsoDate(to)) return 'Velg både fra- og tildato.';
  if (from > to) return 'Perioden må slutte på eller etter startdatoen.';
  if (diffDays(from, to) + 1 > MAX_PERIOD_DAYS) return `Perioden kan være høyst ${MAX_PERIOD_DAYS} dager.`;
  if (to < today) return `Hele perioden er før i dag (${formatDateNo(today)}), og tidligere dager endres aldri. Velg en periode som slutter i dag eller senere.`;
  return null;
}

function checkRequest(request: AllocationRequest, today: IsoDate): void {
  const error = allocationPeriodError(request.from, request.to, today);
  if (error) throw new DomainError(error);
}

/** Årsaken til at en plass ikke kan fylles fordi grensen alt er nådd av tildelinger som står fast. */
function fullReason(rules: PlannerState['rules'], statusId: string, cap: number): string {
  const name = statusIndex(rules).get(statusId)?.name ?? 'Oppgaven';
  return cap === 1
    ? `${name} er alt tildelt en som ikke kan endres (låst eller publisert), selv om tildelingen bryter reglene.`
    : `Alle ${cap} plassene for ${name.toLowerCase()} er i bruk, også av tildelinger som ikke kan endres (låste eller publiserte).`;
}

/** Vakttypene som fordeles: statuser med bemanningsbehov minst én ukedag. */
export function allocatedTypes(state: PlannerState): StaffingRequirement[] {
  const statuses = statusIndex(state.rules);
  return state.rules.staffing.filter((r) => statuses.has(r.statusId) && r.perWeekday.some((n) => n > 0));
}

/** Er datoen en del av den publiserte vaktplanen, som fordelingen ikke endrer uten tillatelse? */
export function isProtectedPublished(state: PlannerState, date: IsoDate, request: AllocationRequest): boolean {
  return !request.allowPublished && !!state.publishedThrough && date <= state.publishedThrough;
}

/** Er tildelingen åpen for fordelingen (kan tas ut og settes inn på nytt)? */
export function isOpen(state: PlannerState, entry: CalendarEntry, request: AllocationRequest, start: IsoDate, typeIds: Set<string>): boolean {
  if (!typeIds.has(entry.statusId) || entry.date < start || entry.date > request.to || entry.locked) return false;
  return !isProtectedPublished(state, entry.date, request);
}

/** Dagene beregningen bygger på: tidshorisonten bakover, perioden og avstandsmarginen på begge sider. */
interface Span {
  start: IsoDate;
  startDay: number;
  fromDay: number;
  toDay: number;
  /** Første dag i tidshorisonten for historisk utjevning (dagnummer). */
  historyStart: number;
  /** Første dag i vinduene (dagnummer). */
  hStart: number;
  shortLength: number;
}

function spanOf(settings: AllocationSettings, request: AllocationRequest, today: IsoDate): Span {
  const start = request.from < today ? today : request.from;
  const startDay = dayNumber(start);
  const fromDay = dayNumber(request.from);
  const toDay = dayNumber(request.to);
  const shortLength = Math.max(7, settings.shortWindowDays);
  const historyStart = Math.min(fromDay, toDay - Math.max(1, settings.historyDays) + 1);
  return { start, startDay, fromDay, toDay, historyStart, hStart: Math.min(historyStart, startDay - shortLength + 1), shortLength };
}

/**
 * Første og siste dato som kan påvirke et forslag: historikk i tidshorisonten,
 * perioden og vakter på begge sider som teller i avstanden.
 */
export function inputRange(state: PlannerState, request: AllocationRequest, today: IsoDate): { from: IsoDate; to: IsoDate } {
  const span = spanOf(allocationSettings(state.rules), request, today);
  return { from: dateOfDay(span.hStart - SPACING_MARGIN), to: dateOfDay(span.toDay + SPACING_MARGIN) };
}

export function buildProblem(base: PlannerState, request: AllocationRequest, today: IsoDate = todayIn(base.unit.timeZone)): Problem {
  checkRequest(request, today);
  const settings = allocationSettings(base.rules);
  const reqs = allocatedTypes(base);
  const types = reqs.map((r) => r.statusId);
  const typeIndex = new Map(types.map((t, i) => [t, i]));
  const typeIds = new Set(types);
  const load = reqs.map((r) => (r.load && r.load > 0 ? r.load : 1));
  const people = base.people;
  const personIndex = new Map(people.map((p, i) => [p.id, i]));
  const category = people.map((p) => p.categoryId);
  const { start, startDay, fromDay, toDay, historyStart, hStart, shortLength: L } = spanOf(settings, request, today);

  // Vinduer: perioden, tidshorisonten for historisk utjevning bakover fra periodens slutt, og korte glidende vinduer.
  const horizon: Window = { start: hStart, end: toDay };
  const windows: Window[] = [];
  windows[PERIOD_WINDOW] = { start: fromDay, end: toDay };
  windows[HISTORY_WINDOW] = { start: historyStart, end: toDay };
  const weekdayWindow = HISTORY_WINDOW;
  // Korte vinduer med start hver 7. dag, slik at hver dag i perioden ligger i like mange vinduer.
  const shortStart = Math.min(startDay - L + 7, toDay - L + 1);
  const shortWindows: Window[] = [];
  for (let s = shortStart; s <= Math.max(shortStart, toDay - 6); s += 7) shortWindows.push({ start: Math.max(hStart, s), end: Math.min(toDay, s + L - 1) });

  // Åpne tildelinger og plasser.
  const byDate = new Map<IsoDate, CalendarEntry[]>();
  for (const e of base.entries) {
    if (!typeIds.has(e.statusId)) continue;
    const list = byDate.get(e.date);
    if (list) list.push(e);
    else byDate.set(e.date, [e]);
  }
  const slots: Slot[] = [];
  const open: CalendarEntry[] = [];
  const invalid: Problem['invalid'] = [];
  const untouchedInvalid: CalendarEntry[] = [];
  let publishedGaps = 0;
  for (let day = startDay; day <= toDay; day++) {
    const date = dateOfDay(day);
    const rules = rulesForDate(base, date, today);
    const dayEntries = (byDate.get(date) ?? []).slice().sort((a, b) => a.id.localeCompare(b.id));
    types.forEach((statusId, type) => {
      const required = requiredCount(rules, statusId, date);
      const assigned = dayEntries.filter((e) => e.statusId === statusId);
      const fixedValid: CalendarEntry[] = [];
      const openValid: CalendarEntry[] = [];
      let fixedInvalid = 0;
      for (const e of assigned) {
        const problems = entryProblems(base, e, today);
        const isFree = isOpen(base, e, request, start, typeIds);
        if (problems.length) {
          if (isFree) {
            invalid.push({ entry: e, problems });
            open.push(e);
          } else {
            untouchedInvalid.push(e);
            fixedInvalid++;
          }
        } else (isFree ? openValid : fixedValid).push(e);
      }
      const need = Math.max(0, required - fixedValid.length);
      if (isProtectedPublished(base, date, request)) {
        publishedGaps += need;
        return;
      }
      // Fysisk plass skilles fra gyldig dekning: alt som står fast, også ugyldige låste eller publiserte
      // tildelinger, tar plass under grensen. Søket lager aldri flere plasser enn det er rom for, så et
      // forslag kan alltid lagres. Er datoen alt over grensen (behovet er senket), står de åpne
      // tildelingene urørt, og overskuddet øker aldri.
      const cap = staffingCap(rules, statusId, date) ?? required;
      const room = cap - fixedValid.length - fixedInvalid;
      const usable = fixedValid.length + fixedInvalid + openValid.length > cap ? 0 : Math.min(need, Math.max(0, room));
      for (let k = 0; k < usable; k++) {
        const incumbent = openValid[k];
        if (incumbent) open.push(incumbent);
        slots.push({ index: slots.length, date, day, type, ...(incumbent ? { incumbent } : {}), candidates: [] });
      }
      const blocked = need - usable - Math.max(0, openValid.length - usable);
      for (let k = 0; k < blocked; k++) slots.push({ index: slots.length, date, day, type, candidates: [], blocked: fullReason(rules, statusId, cap) });
      // Gyldige tildelinger utover behovet står urørt.
    });
  }

  const openIds = new Set(open.map((e) => e.id));
  const cleared: PlannerState = { ...base, entries: base.entries.filter((e) => !openIds.has(e.id)) };

  // Kandidater for en ny tildeling: ledige medarbeidere (ingen status når de åpne vaktene er tatt ut) som
  // oppfyller kravene til vakten og har vaktandel over 0 %. Den som har plassen nå, er kandidat til å beholde den: tildelingen er
  // gyldig etter kalenderens vurdering av eksisterende registreringer (`entryProblems`).
  const incumbentOf = (slot: Slot) => (slot.incumbent ? personIndex.get(slot.incumbent.personId) ?? -1 : -1);
  for (const slot of slots) {
    const statusId = types[slot.type]!;
    const inc = incumbentOf(slot);
    people.forEach((p, i) => {
      if (slot.blocked) return;
      if (i === inc || allocationBlockers(cleared, { personId: p.id, date: slot.date, statusId }, today).length === 0) slot.candidates.push(i);
    });
  }
  const slotsByDay = new Map<number, number[]>();
  for (const s of slots) {
    const list = slotsByDay.get(s.day);
    if (list) list.push(s.index);
    else slotsByDay.set(s.day, [s.index]);
  }

  // Én status per dag: samme person kan aldri ha to plasser samme dag.
  const sameDayOk = () => false;

  // Vakter som ikke endres, i hele vurderingsrommet.
  const fixed: Problem['fixed'] = people.map(() => []);
  const fixedByDay: Problem['fixedByDay'] = new Map();
  for (const e of cleared.entries) {
    const type = typeIndex.get(e.statusId);
    const person = personIndex.get(e.personId);
    if (type === undefined || person === undefined) continue;
    const day = dayNumber(e.date);
    if (day < hStart - SPACING_MARGIN || day > toDay + SPACING_MARGIN) continue;
    fixed[person]!.push({ day, type });
    const list = fixedByDay.get(day);
    if (list) list.push({ person, type });
    else fixedByDay.set(day, [{ person, type }]);
  }
  for (const list of fixed) list.sort((a, b) => a.day - b.day || a.type - b.type);

  // Forventet antall (se expected.ts). Før perioden: vaktene som faktisk ble satt opp, så manglende
  // registreringer ikke gir inntrykk av for få vakter. Fra perioden: behovet.
  const table = shareTable(base, people, types, horizon, today, (date, statusId, rules) =>
    dayNumber(date) < startDay ? (byDate.get(date) ?? []).filter((e) => e.statusId === statusId && personIndex.has(e.personId)).length : requiredCount(rules, statusId, date),
  );
  const targetsFor = (w: Window) => types.map((_, t) => expectedIn(table, t, w));
  const targets = windows.map(targetsFor);
  const historyGoals = catchUpGoals(settings, people.length, types.length, fixed, windows, targets);
  const adjust = compensation(settings, people.length, types.length, slots, fixed, windows, targets, historyGoals);
  const openIn = (w: Window, t: number) => slots.filter((sl) => sl.type === t && sl.day >= w.start && sl.day <= w.end).length;
  const openTotal = types.map((_, t) => openIn(windows[PERIOD_WINDOW]!, t));
  const shortTargets = shortWindows.map((w) => {
    const t = targetsFor(w);
    const share = types.map((_, k) => (openTotal[k] ? openIn(w, k) / openTotal[k]! : 0));
    return people.map((_, i) => types.reduce((sum, _t, k) => sum + load[k]! * (t[k]![i]! + adjust[i]![k]! * share[k]!), 0));
  });
  const ww = windows[weekdayWindow]!;
  const weekdayEligible = people.map((_, i) =>
    types.map((_, t) => {
      const per = [0, 0, 0, 0, 0, 0, 0];
      for (let d = ww.start; d <= ww.end; d++) if (possibleDay(table, i, t, d - horizon.start)) per[weekdayIndex(dateOfDay(d))]! += 1;
      return per;
    }),
  );
  const periodWindow = windows[PERIOD_WINDOW]!;
  const eligibleInPeriod = people.map((_, i) =>
    types.map((_, t) => {
      let n = 0;
      for (let d = Math.max(periodWindow.start, horizon.start); d <= periodWindow.end; d++) if (possibleDay(table, i, t, d - horizon.start)) n += 1;
      return n;
    }),
  );

  return {
    base,
    today,
    request,
    settings,
    start,
    types,
    load,
    people,
    personIndex,
    category,
    slots,
    slotsByDay,
    open,
    invalid,
    fixed,
    fixedByDay,
    untouchedInvalid,
    sameDayOk,
    publishedGaps,
    cleared,
    horizon,
    windows,
    weekdayWindow,
    shortWindows,
    shortStart,
    shortLength: L,
    targets,
    historyGoals,
    shortTargets,
    weekdayEligible,
    eligibleInPeriod,
  };
}

/**
 * Hvor mye flere (eller færre) vakter av hver type hver person skal ha i
 * perioden enn rettferdighet i perioden isolert sett gir, når den historiske
 * utjevningen også regnes med. Brukes til at målet om jevn belastning i korte
 * vinduer ikke motarbeider utjevningen: den forventede belastningen i et
 * vindu flyttes med justeringen, fordelt jevnt på de åpne plassene.
 *
 * For hver person og vakttype: behovet over tidshorisonten (målet for historisk utjevning minus
 * vakter som ikke endres der) og i perioden (det samme), veid med vektene
 * for historisk utjevning og rettferdighet i perioden, slik leddene i
 * kostnaden gjør (cost.ts). Ingen kan få færre enn null, og summen per
 * vakttype er antall åpne plasser.
 */
function compensation(
  settings: AllocationSettings,
  nPeople: number,
  nTypes: number,
  slots: Slot[],
  fixed: { day: number; type: number }[][],
  windows: Window[],
  targets: number[][][],
  historyGoals: number[][],
): number[][] {
  const h = settings.historyFairness;
  const p = settings.periodFairness;
  const fixedIn = (i: number, t: number, w: Window) => fixed[i]!.filter((x) => x.type === t && x.day >= w.start && x.day <= w.end).length;
  const out = Array.from({ length: nPeople }, () => new Array<number>(nTypes).fill(0));
  if (!(h + p > 0)) return out;
  const hw = windows[HISTORY_WINDOW]!;
  const pw = windows[PERIOD_WINDOW]!;
  for (let t = 0; t < nTypes; t++) {
    const open = slots.filter((sl) => sl.type === t).length;
    if (!open) continue;
    const needPeriod = out.map((_, i) => targets[PERIOD_WINDOW]![t]![i]! - fixedIn(i, t, pw));
    const intended = out.map((_, i) => Math.max(0, (h * (historyGoals[t]![i]! - fixedIn(i, t, hw)) + p * needPeriod[i]!) / (h + p)));
    const sum = intended.reduce((a, b) => a + b, 0);
    const sumPeriod = needPeriod.reduce((a, b) => a + b, 0);
    if (!(sum > 0)) continue;
    // Skalert til de åpne plassene, og trukket fra det perioden isolert sett gir (skalert likt).
    out.forEach((row, i) => (row[t] = (open * intended[i]!) / sum - (sumPeriod > 0 ? (open * needPeriod[i]!) / sumPeriod : 0)));
  }
  return out;
}

/**
 * Målet for historisk utjevning (se `Problem.historyGoals`). Full utjevning
 * gir personen P + A vakter i perioden, der P er forventet antall i perioden
 * og A avviket: forventet antall over tidshorisonten minus vaktene der
 * utenfor perioden (tidligere vakter) minus P.
 *
 * Målet i én plan er likevel høyst `catchUpLimit` % av P i tillegg for den
 * som skal ta igjen (A > 0), så planen ikke blir urimelig tett. Det begrenser
 * ønsket kompensasjon, ikke faktisk antall (se `aboveCatchUpGoal`). Den som har hatt for
 * mange (A < 0), gir fra seg høyst hele sin andel av perioden, aldri mer (et
 * mål under null i perioden kan ikke oppfylles). Det som flyttes, må gå opp i
 * plassene: begge sider skaleres ned til den minste av dem, så summen av
 * justeringene er null. Resten av skjevheten står igjen og jevnes ut i senere
 * planer.
 */
function catchUpGoals(settings: AllocationSettings, nPeople: number, nTypes: number, fixed: { day: number; type: number }[][], windows: Window[], targets: number[][][]): number[][] {
  const hw = windows[HISTORY_WINDOW]!;
  const pw = windows[PERIOD_WINDOW]!;
  const limit = Math.max(0, settings.catchUpLimit) / 100;
  const sum = (xs: number[]) => xs.reduce((n, x) => n + x, 0);
  return Array.from({ length: nTypes }, (_, t) => {
    const before = Array.from({ length: nPeople }, (_, i) => fixed[i]!.filter((x) => x.type === t && x.day >= hw.start && x.day <= hw.end && (x.day < pw.start || x.day > pw.end)).length);
    const period = targets[PERIOD_WINDOW]![t]!;
    const full = before.map((b, i) => targets[HISTORY_WINDOW]![t]![i]! - b - period[i]!);
    // Hver side for seg, begrenset per person: taket opp, hele periodeandelen ned.
    const up = full.map((a, i) => Math.min(Math.max(a, 0), period[i]! * limit));
    const down = full.map((a, i) => Math.min(Math.max(-a, 0), period[i]!));
    const transfer = Math.min(sum(up), sum(down));
    const scale = (xs: number[]) => (sum(xs) > 0 ? transfer / sum(xs) : 0);
    const su = scale(up);
    const sd = scale(down);
    return full.map((_, i) => before[i]! + period[i]! + up[i]! * su - down[i]! * sd);
  });
}
