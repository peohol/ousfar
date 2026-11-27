import { assertInvariants, DomainError } from './commands.ts';
import { formatDateNo, todayIn } from './dates.ts';
import { assertCan, seesExemptionDetails } from './permissions.ts';
import { dayKind } from './people.ts';
import { atDate, coverageEffects, dayCoverage, entriesByDate, entryAt, personById, planSet, requiredCount, rulesForDate, statusIndex, type Cell, type CoverageEffect, type EntryDraft, type SetPlan } from './rules.ts';
import type { CalendarEntry, IsoDate, PlannerState, Role } from './types.ts';

/**
 * Flytting av en status til en annen medarbeider eller dato, med dra-og-slipp
 * eller tastatur. UI-uavhengig: alle visninger bruker de samme funksjonene
 * (docs/personal-design.md §4, B18). Visningene tolker et slipp med
 * `analyzeDrop`, likt i dag, uke, måned og helår.
 *
 * `analyzeMove`, flytting til en bestemt celle (person og dato):
 * - Til en celle uten status flyttes statusen direkte.
 * - Har mottakeren en status, kan de to byttes («Bytt statusene»), eller den
 *   flyttede kan erstatte mottakerens («Flytt og erstatt»). Bare alternativer
 *   som gir en gyldig plan, tilbys.
 * - En flytting til en annen persons celle tar aldri over en vakt fra en
 *   tredje person. Er vakten tatt på måldatoen, avvises den med årsak. Til
 *   egen rad gir `analyzeDrop` i stedet de samme valgene som i måneden.
 *
 * «Til stede» uten status kan dras som en virtuell celle (`analyzePresenceMove`):
 * slippes den på en celle med status, flyttes den statusen til den tomme
 * kilden, og målet blir uten status. Tom til tom endrer ingenting.
 *
 * I månedsvisningen flyttes personen med statusen til en ny dato
 * (`analyzeDateMove`). Er vakttypen alt fullt bemannet av andre den dagen,
 * tilbys bare de uttrykkelige valgene «Bytt vaktdager» og «Overta vakten».
 *
 * Merknad, klokkeslett og lås følger statusen, men ikke et administrativt
 * vaktfritak. Hver plassering vurderes av den vanlige regelmotoren
 * (`planSet`) med regler og medarbeidere slik de gjelder måldatoen, så
 * kvalifikasjon, arbeidsdag og at hver vakt bare finnes én gang per dag
 * gjelder uendret, og alle berørte celler valideres samlet. Hele operasjonen
 * er én endring, som kan angres med én handling.
 */

/**
 * `move`, `swap`, `replace`: se over. `swapDates`: to personer bytter dato for
 * samme vakttype. `takeOver`: personen tar vakten på måldatoen fra den som
 * har den, og kildedatoen blir udekket.
 */
export type MoveKind = 'move' | 'swap' | 'replace' | 'swapDates' | 'takeOver';

export interface MoveOption {
  kind: MoveKind;
  /** Kalenderen etter operasjonen. */
  state: PlannerState;
  /** Statuser som forsvinner. */
  removed: CalendarEntry[];
  /** Statuser som flyttes til den opprinnelige cellen (bytte). */
  swapped: CalendarEntry[];
  /** Vakter som blir udekket (eller flere udekket). */
  uncovered: CoverageEffect[];
  /** Motparten i `swapDates` og `takeOver`: den som har vakten på måldatoen. */
  counterpart?: CalendarEntry;
}

export interface MoveAnalysis {
  entry: CalendarEntry;
  to: Cell;
  /** same: samme sted; ok: kan flyttes direkte; conflict: mottakeren har status, velg løsning; rejected: ikke mulig. */
  outcome: 'same' | 'ok' | 'conflict' | 'rejected';
  /** Statusen mottakeren har nå. */
  blocker?: CalendarEntry;
  reasons: string[];
  /** Bare alternativer som gir en gyldig plan. */
  options: MoveOption[];
}

/** Flytting av en person med status til en ny dato (månedsvisningen). */
export interface DateMoveAnalysis extends MoveAnalysis {
  /**
   * De som har samme vakttype på måldatoen når den er fullt bemannet. Med
   * flere plasser velges motparten bare her, aldri hvem som skal motta den
   * flyttede statusen.
   */
  counterparts: CalendarEntry[];
}

function entryById(state: PlannerState, id: string): CalendarEntry {
  const e = state.entries.find((x) => x.id === id);
  if (!e) throw new DomainError('Fant ikke statusen.');
  return e;
}

/** Statusen på et nytt sted: samme status, merknad og klokkeslett. */
function draftAt(entry: CalendarEntry, to: Cell): EntryDraft {
  return { ...to, statusId: entry.statusId, ...(entry.time ? { time: entry.time } : {}), ...(entry.note ? { note: entry.note } : {}) };
}

/** Hvorfor planen ikke kan brukes i en flytting, eller tom liste. En vakt tas aldri over fra en tredje person. */
function planReasons(state: PlannerState, plan: SetPlan, today: IsoDate): string[] {
  const reasons = plan.violations.map((v) => v.message);
  if (plan.takesOver) {
    const name = statusIndex(rulesForDate(state, plan.draft.date, today)).get(plan.draft.statusId)?.name ?? 'Vakten';
    reasons.push(`${name} er alt tildelt ${personById(state, plan.takesOver.personId)?.name ?? 'en annen'} ${formatDateNo(plan.draft.date)}.`);
  }
  return reasons;
}

/**
 * Den flyttede statusen på det nye stedet, med samme ID, merknad, tid og lås.
 * Et administrativt vaktfritak følger aldri med: det gjelder bare personen og
 * dagen det ble innvilget for, så det ikke kan innvilges indirekte ved flytting.
 */
function moved(state: PlannerState, entry: CalendarEntry, to: Cell, today: IsoDate): CalendarEntry {
  const { exempt: _exempt, ...rest } = entry;
  return { ...rest, personId: to.personId, date: to.date, ruleVersion: rulesForDate(state, to.date, today).version };
}

function result(state: PlannerState, kind: MoveKind, remove: CalendarEntry[], add: CalendarEntry[], parts: Pick<MoveOption, 'removed' | 'swapped' | 'counterpart'>, today: IsoDate): MoveOption {
  const ids = new Set(remove.map((e) => e.id));
  const next = { ...state, entries: [...state.entries.filter((e) => !ids.has(e.id)), ...add] };
  const dates = [...remove, ...add].map((e) => e.date);
  return { kind, state: assertInvariants(next, dates, today), ...parts, uncovered: coverageEffects(state, next, dates, today) };
}

/**
 * To registreringer med helt likt innhold slik rollen ser dem: status,
 * merknad, klokkeslett og lås, og vaktfritak bare for roller med myndighet
 * over det (`seesExemptionDetails`). Uten myndighet avgjøres likheten uten
 * fritaket, så utfallet av en flytting aldri røper et skjult fritak.
 */
export function identicalEntries(a: CalendarEntry, b: CalendarEntry, withExemption: boolean): boolean {
  const time = (e: CalendarEntry) => (e.time ? `${e.time.start}-${e.time.end}` : '');
  return a.statusId === b.statusId && (a.note ?? '') === (b.note ?? '') && time(a) === time(b) && !!a.locked === !!b.locked && (!withExemption || !!a.exempt === !!b.exempt);
}

/**
 * Vurder å flytte en status til en celle. Endrer ingenting. Et bytte mellom
 * to helt like statuser samme dag eller hos samme person endrer ingenting og
 * gir `same`, uten markering eller advarsel (Peder 27.11.2026).
 */
export function analyzeMove(state: PlannerState, role: Role, entryId: string, to: Cell, today: IsoDate = todayIn(state.unit.timeZone)): MoveAnalysis {
  assertCan(role, 'editCalendar');
  const entry = entryById(state, entryId);
  const base: MoveAnalysis = { entry, to, outcome: 'rejected', reasons: [], options: [] };
  if (!personById(state, to.personId)) return { ...base, reasons: ['Ukjent medarbeider.'] };
  if (entry.personId === to.personId && entry.date === to.date) return { ...base, outcome: 'same' };
  const origin: Cell = { personId: entry.personId, date: entry.date };
  const blocker = entryAt(state, to.personId, to.date);
  if (blocker && (blocker.date === entry.date || blocker.personId === entry.personId) && identicalEntries(blocker, entry, seesExemptionDetails(role))) return { ...base, outcome: 'same', blocker };

  if (!blocker) {
    const reasons = planReasons(state, planSet(state, draftAt(entry, to), today, new Set([entry.id])), today);
    if (reasons.length) return { ...base, reasons };
    return { ...base, outcome: 'ok', options: [result(state, 'move', [entry], [moved(state, entry, to, today)], { removed: [], swapped: [] }, today)] };
  }

  const both = new Set([entry.id, blocker.id]);
  const there = planReasons(state, planSet(state, draftAt(entry, to), today, both), today);
  if (there.length) return { ...base, blocker, reasons: there };
  const options: MoveOption[] = [];
  const back = planReasons(state, planSet(state, draftAt(blocker, origin), today, both), today);
  if (!back.length) options.push(result(state, 'swap', [entry, blocker], [moved(state, entry, to, today), moved(state, blocker, origin, today)], { removed: [], swapped: [blocker] }, today));
  options.push(result(state, 'replace', [entry, blocker], [moved(state, entry, to, today)], { removed: [blocker], swapped: [] }, today));
  return { ...base, outcome: 'conflict', blocker, reasons: back.length ? [`Kan ikke byttes: ${back.join(' ')}`] : [], options };
}

/**
 * Gjennomfør en flytting. Den vurderes på nytt mot gjeldende kalender, så et
 * valg gjort mot en eldre tilstand aldri overskriver nyere endringer: er
 * alternativet ikke lenger mulig, lagres ingenting.
 */
export function commitMove(current: PlannerState, role: Role, entryId: string, to: Cell, kind: MoveKind, today: IsoDate = todayIn(current.unit.timeZone)): MoveOption {
  return chosen(analyzeMove(current, role, entryId, to, today), kind);
}

function chosen(a: MoveAnalysis, kind: MoveKind, counterpartId?: string): MoveOption {
  const option = a.options.find((o) => o.kind === kind && (counterpartId === undefined || o.counterpart?.id === counterpartId));
  if (!option) throw new DomainError(`Flyttingen kan ikke lagres: ${a.reasons.join(' ') || 'kalenderen er endret.'} Ingenting er endret.`);
  return option;
}

// ---------------------------------------------------------------------------
// Til stede som virtuell celle (B18)
// ---------------------------------------------------------------------------

/** Kan cellen dras som «Til stede»: aktiv, planlagt til stede på en arbeidsdag og uten registrert status? */
export function presenceDraggable(state: PlannerState, cell: Cell, today: IsoDate = todayIn(state.unit.timeZone)): boolean {
  const s = atDate(state, cell.date, today);
  return !entryAt(state, cell.personId, cell.date) && dayKind(personById(s, cell.personId), cell.date, s.rules) === 'work';
}

/**
 * Vurder å slippe den virtuelle «Til stede»-cellen `from` på `to`. Har målet
 * en status, er det et uttrykkelig bytte: statusen flyttes til den tomme
 * kilden, og målet blir uten status. Det er den samme flyttingen som å dra
 * målets status til kilden, med de samme kravene og rettighetene. Ingen
 * status lagres for «Til stede». Tom til tom endrer ingenting (`same`).
 */
export function analyzePresenceMove(state: PlannerState, role: Role, from: Cell, to: Cell, today: IsoDate = todayIn(state.unit.timeZone)): MoveAnalysis {
  assertCan(role, 'editCalendar');
  if (!presenceDraggable(state, from, today)) throw new DomainError('Bare en dag der personen er planlagt til stede uten status, kan flyttes som «Til stede».');
  const target = entryAt(state, to.personId, to.date);
  if (!target) {
    const placeholder: CalendarEntry = { id: '', ...from, statusId: '', ruleVersion: 0 };
    return { entry: placeholder, to, outcome: 'same', reasons: [], options: [] };
  }
  return analyzeMove(state, role, target.id, from, today);
}

export function commitPresenceMove(current: PlannerState, role: Role, from: Cell, to: Cell, today: IsoDate = todayIn(current.unit.timeZone)): MoveOption {
  return chosen(analyzePresenceMove(current, role, from, to, today), 'move');
}

// ---------------------------------------------------------------------------
// Månedsvisningen: personen med statusen til en ny dato (B18)
// ---------------------------------------------------------------------------

/** Er statusen en vakttype på datoen: én per dag eller med bemanningsbehov? */
function isDutyType(state: PlannerState, statusId: string, date: IsoDate, today: IsoDate): boolean {
  const rules = atDate(state, date, today).rules;
  return !!statusIndex(rules).get(statusId)?.uniquePerDay || requiredCount(rules, statusId, date) > 0;
}

/** De andre som har statusen på datoen, når den er en vakt (én per dag) eller behovet er fullt. */
function fullCounterparts(state: PlannerState, entry: CalendarEntry, date: IsoDate, today: IsoDate): CalendarEntry[] {
  const s = atDate(state, date, today);
  const def = statusIndex(s.rules).get(entry.statusId);
  if (!def) return [];
  const others = (entriesByDate(state.entries).get(date) ?? []).filter((e) => e.statusId === entry.statusId && e.personId !== entry.personId);
  if (!others.length) return [];
  if (def.uniquePerDay) return others;
  const slot = dayCoverage(state, date, today).find((sl) => sl.status.id === entry.statusId);
  return slot && slot.required > 0 && slot.valid.length >= slot.required ? others : [];
}

/**
 * Vurder å flytte personen med statusen til en annen dato (månedsvisningen).
 * Uten konflikt er dette en vanlig flytting til personens egen celle på
 * måldatoen. Har en annen samme vakttype den dagen og behovet er fullt,
 * tilbys for hver motpart:
 *
 * - `swapDates` (Bytt vaktdager): de to bytter dato. A Vakt 1 mandag og B
 *   Vakt 1 torsdag gir B mandag og A torsdag.
 * - `takeOver` (Overta vakten): A tar vakten på måldatoen, Bs vakt der
 *   fjernes, og kildedatoen blir udekket.
 *
 * Statuser personene har på datoene de flyttes til, erstattes og vises i
 * `removed`; ingen tredje tildeling forsvinner lydløst. Merknad, tid og lås
 * følger hver sin vakt; administrativt vaktfritak følger aldri med. Alle
 * berørte celler valideres samlet; bare gyldige valg tilbys.
 */
export function analyzeDateMove(state: PlannerState, role: Role, entryId: string, toDate: IsoDate, today: IsoDate = todayIn(state.unit.timeZone), counterpartPersonId?: string): DateMoveAnalysis {
  const entry = entryById(state, entryId);
  const to: Cell = { personId: entry.personId, date: toDate };
  const plain = analyzeMove(state, role, entryId, to, today);
  const counterparts = plain.outcome === 'same' ? [] : fullCounterparts(state, entry, toDate, today).filter((e) => counterpartPersonId === undefined || e.personId === counterpartPersonId);
  if (!counterparts.length) return { ...plain, counterparts };

  const ownThere = entryAt(state, entry.personId, toDate);
  const options: MoveOption[] = [];
  const reasons: string[] = [];
  for (const other of counterparts) {
    const otherThere = entryAt(state, other.personId, entry.date);
    const involved = new Set([entry.id, other.id, ...(ownThere ? [ownThere.id] : [])]);
    const here = planReasons(state, planSet(state, draftAt(entry, to), today, involved), today);
    if (here.length) {
      reasons.push(...here);
      continue;
    }
    const removedHere = ownThere ? [ownThere] : [];
    options.push(result(state, 'takeOver', [entry, other, ...removedHere], [moved(state, entry, to, today)], { removed: [other, ...removedHere], swapped: [], counterpart: other }, today));

    const back: Cell = { personId: other.personId, date: entry.date };
    const swapIgnore = new Set([...involved, ...(otherThere ? [otherThere.id] : [])]);
    const backReasons = planReasons(state, planSet(state, draftAt(other, back), today, swapIgnore), today);
    if (backReasons.length) {
      reasons.push(`Kan ikke bytte vaktdager med ${personById(state, other.personId)?.name ?? 'den andre'}: ${backReasons.join(' ')}`);
      continue;
    }
    const removedBack = otherThere ? [otherThere] : [];
    options.push(result(state, 'swapDates', [entry, other, ...removedHere, ...removedBack], [moved(state, entry, to, today), moved(state, other, back, today)], { removed: [...removedHere, ...removedBack], swapped: [other], counterpart: other }, today));
  }
  const uniqueReasons = [...new Set(reasons)];
  return { entry, to, outcome: options.length ? 'conflict' : 'rejected', ...(ownThere ? { blocker: ownThere } : {}), reasons: uniqueReasons, options, counterparts };
}

/** Gjennomfør en datoflytting med valgt alternativ og motpart, vurdert på nytt mot gjeldende kalender. */
export function commitDateMove(current: PlannerState, role: Role, entryId: string, toDate: IsoDate, kind: MoveKind, counterpartId?: string, today: IsoDate = todayIn(current.unit.timeZone)): MoveOption {
  return chosen(analyzeDateMove(current, role, entryId, toDate, today), kind, counterpartId);
}

/** Kort beskrivelse av operasjonen, brukt i meldinger og angre-historikken. */
export function describeMove(state: PlannerState, a: Pick<MoveAnalysis, 'entry' | 'to' | 'blocker'>, kind: MoveKind, counterpart?: CalendarEntry): string {
  const statuses = statusIndex(state.rules);
  const name = (e: CalendarEntry) => statuses.get(e.statusId)?.name ?? 'Status';
  const who = (id: string) => personById(state, id)?.name ?? 'ukjent';
  const sameDay = a.entry.date === a.to.date;
  const where = `${who(a.to.personId)}${sameDay ? '' : `, ${formatDateNo(a.to.date)}`}`;
  if (kind === 'swapDates' && counterpart) return `${who(a.entry.personId)} og ${who(counterpart.personId)} byttet vaktdager for ${name(a.entry).toLowerCase()}: ${formatDateNo(a.entry.date)} og ${formatDateNo(a.to.date)}`;
  if (kind === 'takeOver' && counterpart) return `${who(a.entry.personId)} overtok ${name(a.entry).toLowerCase()} ${formatDateNo(a.to.date)} fra ${who(counterpart.personId)}`;
  if (kind === 'swap' && a.blocker) return `${name(a.entry)} og ${name(a.blocker)} byttet mellom ${who(a.entry.personId)} og ${where}`;
  if (kind === 'replace' && a.blocker) return `${name(a.entry)} flyttet til ${where} og erstattet ${name(a.blocker)}`;
  return `${name(a.entry)} flyttet til ${where}`;
}

// ---------------------------------------------------------------------------
// Ett felles slipp for dag, uke, måned og helår (Peder 27.11.2026)
// ---------------------------------------------------------------------------

/** Det som dras: en status, eller den virtuelle «Til stede» i en tom celle. */
export type DropSource = { kind: 'entry'; entryId: string } | { kind: 'presence'; cell: Cell };

/** Der det slippes: en dato (måned) eller en persons celle (dag, uke, helår). */
export interface DropTarget {
  personId?: string;
  date: IsoDate;
}

/**
 * Tolker et slipp likt i alle visningene, både for markeringen under dra og
 * for selve lagringen:
 *
 * - En status sluppet på en dato (måned), på sin egen rad, eller på en annens
 *   celle med samme status en annen dag, flytter personen med statusen til
 *   datoen. Er vakten tatt, tilbys «Bytt vaktdager» og overtakelse
 *   (`analyzeDateMove`); i det siste tilfellet bare med personen i cellen
 *   som motpart.
 * - Ellers flyttes statusen til cellen, med bytte eller erstatning når
 *   cellen har en annen status (`analyzeMove`). Sluppet rett på en annens
 *   status er det et forsøk på å bytte de to statusene.
 * - Til stede sluppet på en status bytter dem (`analyzePresenceMove`).
 *
 * Svaret har alltid `counterparts`; tom liste når det ikke er en datoflytting.
 */
export function analyzeDrop(state: PlannerState, role: Role, source: DropSource, target: DropTarget, today: IsoDate = todayIn(state.unit.timeZone)): DateMoveAnalysis {
  if (source.kind === 'presence') {
    const cell: Cell = { personId: target.personId ?? source.cell.personId, date: target.date };
    return { ...analyzePresenceMove(state, role, source.cell, cell, today), counterparts: [] };
  }
  const entry = entryById(state, source.entryId);
  if (!target.personId || target.personId === entry.personId) return analyzeDateMove(state, role, entry.id, target.date, today);
  const there = entryAt(state, target.personId, target.date);
  // Bare for vakttyper (én per dag eller med bemanningsbehov): ellers er det et vanlig bytte mellom de to cellene.
  if (there && there.statusId === entry.statusId && target.date !== entry.date && isDutyType(state, entry.statusId, target.date, today)) return analyzeDateMove(state, role, entry.id, target.date, today, target.personId);
  return { ...analyzeMove(state, role, entry.id, { personId: target.personId, date: target.date }, today), counterparts: [] };
}

/** Lagre et slipp med valgt alternativ, vurdert på nytt mot gjeldende kalender. */
export function commitDrop(current: PlannerState, role: Role, source: DropSource, target: DropTarget, kind: MoveKind, counterpartId?: string, today: IsoDate = todayIn(current.unit.timeZone)): MoveOption {
  return chosen(analyzeDrop(current, role, source, target, today), kind, counterpartId);
}
