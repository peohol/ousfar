import { DomainError, newId } from '../commands.ts';
import { formatDateNo, isIsoDate, todayIn } from '../dates.ts';
import { assertCan } from '../permissions.ts';
import { personById, rulesForDate, statusIndex, type Violation } from '../rules.ts';
import type { CalendarEntry, IsoDate, PlannerState, Role } from '../types.ts';
import { type Breakdown } from './cost.ts';
import { windowLength } from './expected.ts';
import { allocationBlockers, buildProblem, HISTORY_WINDOW, inputRange, isProtectedPublished, PERIOD_WINDOW, type AllocationRequest, type Problem } from './model.ts';
import { solve, type Delta, type Solution } from './search.ts';

/**
 * Forslag, godkjenning og publisering er atskilte tilstander:
 *
 * - `proposeAllocation` lager et forslag. Ingenting lagres.
 * - `acceptProposal` lagrer forslaget i kalenderen (godkjent, ikke publisert),
 *   som én endring som kan angres. Et forslag laget før en senere endring i
 *   noe det bygger på, avvises.
 * - `publishPlan` publiserer vaktplanen til og med en dato.
 *
 * Publisering gjelder datoer. Uten uttrykkelig tillatelse endrer fordelingen
 * ingenting på publiserte datoer, heller ikke ledige plasser. Med tillatelse
 * er endringene der en endring av den publiserte planen, og forslaget sier
 * hvilke det gjelder.
 */

export type ChangeKind = 'add' | 'replace' | 'remove';

export interface ProposalChange {
  kind: ChangeKind;
  date: IsoDate;
  statusId: string;
  /** Tildelingen som tas bort. */
  before?: CalendarEntry;
  /** Den nye tildelingen. */
  after?: CalendarEntry;
  /** Hvorfor endringen gjøres. */
  reason: string;
  /** Plassen i forslaget (for forklaring). */
  slot?: number;
  /** Gjelder endringen en publisert dato (bare mulig med tillatelse)? */
  published: boolean;
}

export interface UncoveredSlot {
  date: IsoDate;
  statusId: string;
  /** Hvorfor ingen kan ta plassen, gruppert etter årsak. */
  reasons: string[];
}

export interface FairnessRow {
  personId: string;
  statusId: string;
  /** Antall i perioden (også vakter som ikke endres). */
  count: number;
  /** Forventet antall i perioden etter rollevekt og mulige dager. */
  target: number;
  /** Antall og forventet over tidshorisonten for historisk utjevning, med tidligere vakter. */
  historyCount: number;
  historyTarget: number;
  /**
   * Målet for antall over tidshorisonten etter taket på ekstra utjevning i én
   * plan (`catchUpLimit`). Taket begrenser ønsket kompensasjon i
   * kostnadsfunksjonen; dekning, låste og publiserte vakter og
   * tilgjengelighet går foran, så det faktiske antallet kan bli høyere.
   */
  historyGoal: number;
  historyDays: number;
  /** Dager i perioden personen kunne hatt vakttypen. */
  eligibleDays: number;
}

/**
 * Medarbeidere som får minst én vakt mer enn målet for utjevning
 * (`FairnessRow.historyGoal`), fordi dekning og andre harde forhold går
 * foran. Avhenger av vaktfritak, så det vises bare med `seesExemptionDetails`.
 */
export function aboveCatchUpGoal(p: Pick<Proposal, 'fairness'>): FairnessRow[] {
  return p.fairness.filter((r) => r.historyCount - r.historyGoal >= 1 - 1e-9);
}

export interface Proposal {
  request: AllocationRequest;
  base: PlannerState;
  today: IsoDate;
  fingerprint: string;
  /** Kalenderen slik den blir hvis forslaget godtas. */
  state: PlannerState;
  changes: ProposalChange[];
  uncovered: UncoveredSlot[];
  fairness: FairnessRow[];
  score: Delta;
  /** Kompromisser og begrensninger brukeren bør vite om. */
  notes: string[];
  localOptimum: boolean;
  problem: Problem;
  solution: Solution;
}

/**
 * Alt et forslag bygger på: regler og medarbeidere med historikk,
 * vaktandeler, publisering, og alle registreringer (vakter, fravær og annet) i dagene
 * beregningen leser, det vil si historikkvinduene, perioden og
 * avstandsmarginen etter perioden. Endres noe av dette, er forslaget foreldet.
 */
export function proposalFingerprint(state: PlannerState, request: AllocationRequest, today: IsoDate): string {
  const range = inputRange(state, request, today);
  const entries = state.entries.filter((e) => e.date >= range.from && e.date <= range.to).sort((a, b) => a.id.localeCompare(b.id));
  return JSON.stringify([state.rules, state.ruleVersions, state.peopleFrom, state.people, state.peopleHistory, state.dutyShares, state.publishedThrough ?? null, entries]);
}

export const PUBLISHED_WITHOUT_PERMISSION = 'Forslaget endrer publisert vaktplan uten tillatelse. Ingenting er lagret.';

function newEntry(state: PlannerState, personId: string, date: IsoDate, statusId: string, today: IsoDate): CalendarEntry {
  const rules = rulesForDate(state, date, today);
  return { id: newId('e'), personId, date, statusId, ruleVersion: rules.version };
}

/**
 * Utfør endringene på en tilstand, og kontroller hver nye tildeling med
 * regelmotoren mot resultatet. Brukes både når forslaget lages og når det
 * godtas, så det som lagres alltid er kontrollert mot gjeldende kalender.
 */
function applyChanges(state: PlannerState, request: AllocationRequest, changes: ProposalChange[], today: IsoDate): PlannerState {
  if (changes.some((c) => isProtectedPublished(state, c.date, request))) throw new DomainError(PUBLISHED_WITHOUT_PERMISSION);
  const removed = new Set(changes.flatMap((c) => (c.before ? [c.before.id] : [])));
  const added = changes.flatMap((c) => (c.after ? [c.after] : []));
  let next: PlannerState = { ...state, entries: state.entries.filter((e) => !removed.has(e.id)) };
  for (const e of added) {
    const problems = allocationBlockers(next, { personId: e.personId, date: e.date, statusId: e.statusId }, today);
    if (problems.length) throw new DomainError(`Forslaget kan ikke lagres: ${formatDateNo(e.date)}: ${problems.map((v) => v.message).join(' ')}`);
    next = { ...next, entries: [...next.entries, e] };
  }
  return removed.size || added.length ? next : state;
}

const name = (state: PlannerState, id: string) => personById(state, id)?.name ?? 'Ukjent';

/** Kort årsak til at en person ikke kan ta en plass, gruppert for oversikt. */
function reasonGroup(v: Violation, state: PlannerState, date: IsoDate, today: IsoDate): string | null {
  switch (v.code) {
    case 'occupied': {
      const other = v.entryId ? state.entries.find((e) => e.id === v.entryId) : undefined;
      const def = other ? statusIndex(rulesForDate(state, date, today)).get(other.statusId) : undefined;
      return def && !def.present ? 'Ikke til stede' : 'Har en annen oppgave samme dag';
    }
    case 'notQualified':
      return 'Ikke kvalifisert';
    case 'notWorkday':
      return 'Ikke en arbeidsdag';
    case 'noDutyShare':
      return 'Vaktandel 0 %';
    case 'inactivePerson':
    case 'unknownPerson':
      return null;
    default:
      return v.message;
  }
}

/** Hvorfor hver medarbeider kan eller ikke kan ta en plass. */
export interface CandidateExplanation {
  personId: string;
  name: string;
  verdict: 'chosen' | 'possible' | 'busy' | 'blocked';
  /** For `possible`: hvor mye dårligere forslaget blir med denne personen (lavere er bedre), med ledd. */
  delta?: number;
  breakdown?: Breakdown;
  reason?: string;
  /** Årsaken gruppert (f.eks. «Ikke kvalifisert»), for oversikt over udekkede plasser. */
  group?: string;
}

/**
 * Vurderingen av hver medarbeider for en plass. Med `detailed: false` (roller
 * uten `seesExemptionDetails`) er tallene og rekkefølgen etter dem utelatt,
 * fordi de bygger på forventet antall og dermed på vaktfritak.
 */
export function explainSlot(p: Pick<Proposal, 'problem' | 'solution'>, slotIndex: number, { detailed = true }: { detailed?: boolean } = {}): CandidateExplanation[] {
  const { problem: pr, solution: sol } = p;
  const slot = pr.slots[slotIndex]!;
  const statusId = pr.types[slot.type]!;
  const cur = sol.person[slotIndex]!;
  const out: CandidateExplanation[] = [];
  pr.people.forEach((person, i) => {
    const base = { personId: person.id, name: person.name };
    if (i === cur) return out.push({ ...base, verdict: 'chosen' });
    if (!slot.candidates.includes(i)) {
      const v = allocationBlockers(pr.cleared, { personId: person.id, date: slot.date, statusId }, pr.today)[0];
      if (!v) return;
      const group = reasonGroup(v, pr.cleared, slot.date, pr.today);
      if (group === null) return;
      return out.push({ ...base, verdict: 'blocked', reason: v.message, group });
    }
    if (!sol.feasible([[slotIndex, i]])) {
      const other = pr.slotsByDay.get(slot.day)!.find((s) => sol.person[s] === i);
      const otherName = other !== undefined ? statusIndex(pr.base.rules).get(pr.types[pr.slots[other]!.type]!)?.name : undefined;
      return out.push({ ...base, verdict: 'busy', reason: otherName ? `Har ${otherName.toLowerCase()} samme dag.` : 'Opptatt samme dag.' });
    }
    if (!detailed) return out.push({ ...base, verdict: 'possible' });
    const d = sol.delta([[slotIndex, i]]);
    out.push({ ...base, verdict: 'possible', delta: d.cost, breakdown: d.breakdown });
  });
  const order = { chosen: 0, possible: 1, busy: 2, blocked: 3 };
  return out.sort((a, b) => order[a.verdict] - order[b.verdict] || (a.delta ?? 0) - (b.delta ?? 0) || a.name.localeCompare(b.name, 'nb'));
}

function uncoveredReasons(p: Pick<Proposal, 'problem' | 'solution'>, slotIndex: number): string[] {
  const groups = new Map<string, string[]>();
  for (const c of explainSlot(p, slotIndex)) {
    if (c.verdict !== 'busy' && c.verdict !== 'blocked') continue;
    const key = (c.group ?? c.reason ?? '').replace(/\.$/, '');
    groups.set(key, [...(groups.get(key) ?? []), c.name]);
  }
  // Gjelder årsaken alle (f.eks. helg), er det klarere å si det enn å ramse opp navnene.
  return [...groups].map(([reason, names]) => `${reason}: ${names.length === p.problem.people.length && names.length > 1 ? 'alle medarbeidere' : names.join(', ')}.`);
}

export function proposeAllocation(state: PlannerState, role: Role, request: AllocationRequest, today: IsoDate = todayIn(state.unit.timeZone)): Proposal {
  assertCan(role, 'editCalendar');
  const pr = buildProblem(state, request, today);
  const { solution: sol, localOptimum, cutDays } = solve(pr);
  const statuses = statusIndex(state.rules);
  const statusName = (id: string) => statuses.get(id)?.name ?? id;

  // Endringer: ugyldige tildelinger som fjernes, og plasser som får ny person.
  const invalidLeft = [...pr.invalid];
  const draft: Omit<ProposalChange, 'published'>[] = [];
  const uncovered: UncoveredSlot[] = [];
  for (const slot of pr.slots) {
    const statusId = pr.types[slot.type]!;
    const p = sol.person[slot.index]!;
    const inc = slot.incumbent;
    if (p < 0) uncovered.push({ date: slot.date, statusId, reasons: uncoveredReasons({ problem: pr, solution: sol }, slot.index) });
    if (!sol.isChange(slot.index, p)) continue;
    const after = p >= 0 ? newEntry(state, pr.people[p]!.id, slot.date, statusId, today) : undefined;
    if (inc) {
      draft.push(
        after
          ? { kind: 'replace', date: slot.date, statusId, before: inc, after, slot: slot.index, reason: `${name(state, after.personId)} i stedet for ${name(state, inc.personId)}.` }
          : { kind: 'remove', date: slot.date, statusId, before: inc, slot: slot.index, reason: 'Fjernet.' },
      );
      continue;
    }
    const k = invalidLeft.findIndex((x) => x.entry.date === slot.date && x.entry.statusId === statusId);
    const replaced = k >= 0 ? invalidLeft.splice(k, 1)[0] : undefined;
    if (replaced) {
      draft.push({ kind: 'replace', date: slot.date, statusId, before: replaced.entry, ...(after ? { after } : {}), slot: slot.index, reason: `${name(state, replaced.entry.personId)} kan ikke ha vakten: ${replaced.problems[0]!.message}` });
    } else if (after) {
      draft.push({ kind: 'add', date: slot.date, statusId, after, slot: slot.index, reason: 'Ledig plass fylt.' });
    }
  }
  for (const x of invalidLeft) {
    draft.push({ kind: 'remove', date: x.entry.date, statusId: x.entry.statusId, before: x.entry, reason: `${name(state, x.entry.personId)} kan ikke ha vakten: ${x.problems[0]!.message}` });
  }
  const isPublished = (date: IsoDate) => !!state.publishedThrough && date <= state.publishedThrough;
  const changes: ProposalChange[] = draft
    .map((c) => ({ ...c, published: isPublished(c.date) }))
    .sort((a, b) => a.date.localeCompare(b.date) || pr.types.indexOf(a.statusId) - pr.types.indexOf(b.statusId));

  // Fordeling per person og vakttype.
  const fairness: FairnessRow[] = [];
  const hw = pr.windows[HISTORY_WINDOW]!;
  const period = pr.windows[PERIOD_WINDOW]!;
  const shiftsOf = (i: number) => [
    ...pr.fixed[i]!,
    ...pr.slots.filter((s) => sol.person[s.index] === i).map((s) => ({ day: s.day, type: s.type })),
  ];
  pr.people.forEach((person, i) => {
    const shifts = shiftsOf(i);
    pr.types.forEach((statusId, t) => {
      const inWin = (w: { start: number; end: number }) => shifts.filter((s) => s.type === t && s.day >= w.start && s.day <= w.end).length;
      const row: FairnessRow = {
        personId: person.id,
        statusId,
        count: inWin(period),
        target: pr.targets[PERIOD_WINDOW]![t]![i]!,
        historyCount: inWin(hw),
        historyTarget: pr.targets[HISTORY_WINDOW]![t]![i]!,
        historyGoal: pr.historyGoals[t]![i]!,
        historyDays: windowLength(hw),
        eligibleDays: pr.eligibleInPeriod[i]![t]!,
      };
      if (row.count || row.target > 0.05 || row.historyCount) fairness.push(row);
    });
  });

  const notes: string[] = [];
  if (request.from < pr.start) notes.push(`Dager før i dag (${formatDateNo(pr.start)}) endres ikke.`);
  if (!request.allowPublished && state.publishedThrough && state.publishedThrough >= pr.start) {
    notes.push(
      `Vaktplanen er publisert til og med ${formatDateNo(state.publishedThrough)}. Ingenting der er endret${pr.publishedGaps ? `, og ${pr.publishedGaps} ledige plasser der er ikke fylt. Tillat endringer i publisert vaktplan for å fylle dem` : ''}.`,
    );
  }
  const publishedChanges = changes.filter((c) => c.published).length;
  if (publishedChanges) {
    notes.push(
      `${publishedChanges} av endringene gjelder publisert vaktplan (til og med ${formatDateNo(state.publishedThrough!)}). De blir en del av den publiserte planen straks forslaget godtas. Resten er ikke publisert.`,
    );
  }
  const locked = state.entries.filter((e) => e.locked && e.date >= pr.start && e.date <= request.to && pr.types.includes(e.statusId)).length;
  if (locked) notes.push(`${locked} låste vakter er ikke endret.`);
  if (pr.untouchedInvalid.length) {
    notes.push(
      `Disse vaktene bryter reglene, men er låste eller publiserte og er ikke endret: ${pr.untouchedInvalid.map((e) => `${statusName(e.statusId)} ${formatDateNo(e.date)} (${name(state, e.personId)})`).join(', ')}.`,
    );
  }
  if (uncovered.length) notes.push(`${uncovered.length} plasser kan ikke dekkes uten å bryte et hardt krav. Årsakene står ved hver plass.`);
  notes.push(
    cutDays
      ? `Dekningen er kontrollert dag for dag, men ${cutDays} ${cutDays === 1 ? 'dag' : 'dager'} hadde for mange kombinasjoner til å prøve alle. Der er dekningen den beste søket fant, ikke bevist høyest mulig.`
      : 'Dekningen er den høyest mulige, kontrollert dag for dag.',
  );
  notes.push(
    localOptimum
      ? 'Fordelingen er et lokalt optimum: ingen enkelt flytting eller ombytting gir en bedre plan. Det er ikke bevist at ingen bedre plan finnes.'
      : 'Søket etter bedre fordeling stoppet etter største antall gjennomganger; planen kan forbedres.',
  );

  return {
    request,
    base: state,
    today,
    fingerprint: proposalFingerprint(state, request, today),
    state: applyChanges(state, request, changes, today),
    changes,
    uncovered,
    fairness,
    score: sol.score(),
    notes,
    localOptimum,
    problem: pr,
    solution: sol,
  };
}

export const STALE_PROPOSAL_MESSAGE = 'Kalenderen er endret siden forslaget ble laget. Ingenting er lagret. Lag et nytt forslag.';

/** Godta forslaget: lagres i kalenderen som én endring. Et foreldet forslag avvises. */
/** Kalenderen slik den blir når forslagets endringer legges på `current`. Kaster om forslaget er foreldet. */
function accepted(current: PlannerState, proposal: Proposal, today: IsoDate): PlannerState {
  if (today !== proposal.today && proposal.changes.some((c) => c.date < today)) throw new DomainError(STALE_PROPOSAL_MESSAGE);
  if (current !== proposal.base && proposalFingerprint(current, proposal.request, proposal.today) !== proposal.fingerprint) throw new DomainError(STALE_PROPOSAL_MESSAGE);
  return applyChanges(current, proposal.request, proposal.changes, today);
}

export function acceptProposal(current: PlannerState, role: Role, proposal: Proposal, today: IsoDate = todayIn(current.unit.timeZone)): PlannerState {
  assertCan(role, 'editCalendar');
  return accepted(current, proposal, today);
}

/**
 * Forhåndsvisning av godkjenningen: nøyaktig kalenderen `acceptProposal` ville
 * gitt nå, bygd på dagens kalender (også endringer utenfor det forslaget
 * bygger på). `null` når forslaget ikke kan godtas.
 */
export function previewAcceptance(current: PlannerState, proposal: Proposal, today: IsoDate = todayIn(current.unit.timeZone)): PlannerState | null {
  try {
    return accepted(current, proposal, today);
  } catch (e) {
    if (e instanceof DomainError) return null;
    throw e;
  }
}

/** Publiser vaktplanen til og med en dato, eller trekk publiseringen tilbake (`null`). */
export function publishPlan(state: PlannerState, role: Role, through: IsoDate | null): PlannerState {
  assertCan(role, 'editCalendar');
  if (through !== null && !isIsoDate(through)) throw new DomainError('Ugyldig dato.');
  const { publishedThrough: _old, ...rest } = state;
  return through === null ? rest : { ...rest, publishedThrough: through };
}

/** Lås eller lås opp en registrering. Låste vakter endres aldri av fordelingen. */
export function setEntryLocked(state: PlannerState, role: Role, entryId: string, locked: boolean): PlannerState {
  assertCan(role, 'editCalendar');
  const entry = state.entries.find((e) => e.id === entryId);
  if (!entry) throw new DomainError('Fant ikke registreringen.');
  if (!!entry.locked === locked) return state;
  const { locked: _l, ...rest } = entry;
  const next: CalendarEntry = locked ? { ...rest, locked: true } : rest;
  return { ...state, entries: state.entries.map((e) => (e.id === entryId ? next : e)) };
}

