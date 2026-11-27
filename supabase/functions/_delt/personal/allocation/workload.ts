import { diffDays, isIsoDate, todayIn } from '../dates.ts';
import { DomainError } from '../commands.ts';
import { dutyScheduleOf, dutyShareTimeline, type DutyShareSegment } from '../dutyShare.ts';
import type { IsoDate, PlannerState } from '../types.ts';
import { dayNumber, expectedIn, shareTable, type Window } from './expected.ts';
import { allocatedTypes } from './model.ts';

/**
 * Oversikt over vaktbelastning: for hver vakttype og medarbeider
 * vaktandelen, den praktiske tilgjengeligheten, antall vakter i et tidsrom,
 * forventet antall og avviket, regnet med den samme funksjonen som
 * fordelingen (expected.ts: stillingsvekt × vaktandel × fritaksfaktor per
 * dag). Oversikten bygger på registrerte vakter, ikke på fremtidig
 * bemanningsbehov; fordelingen bruker behovet for dagene den planlegger. Forventet antall bygger på vaktene som faktisk
 * står i kalenderen i tidsrommet, så summen av avvikene er null og
 * manglende registreringer ikke gir inntrykk av for få vakter.
 *
 * Med et forslag regnes det samme for kalenderen slik den blir om forslaget
 * godtas, over nøyaktig det samme tidsrommet. Hver vakt telles én gang: en
 * vakt som flyttes til en annen, telles bare hos den som har den etterpå.
 */

/** Lengste tidsrom oversikten regner over. */
export const MAX_WORKLOAD_DAYS = 731;

export interface WorkloadStat {
  count: number;
  /**
   * Forventet antall, eller null når rollen ikke har myndighet over
   * administrativt vaktfritak (`seesExemptionDetails`): forventet antall over
   * et selvvalgt kort tidsrom kan avsløre et skjult fritak, så tallet vises
   * ikke i stedet for å vises feil.
   */
  expected: number | null;
}

export interface WorkloadRow {
  personId: string;
  name: string;
  /** Vaktandelen i tidsrommet i prosent: laveste og høyeste, og tidslinjen når den varierer. */
  share: { min: number; max: number; segments: DutyShareSegment[] };
  /**
   * Praktisk tilgjengelighet: dager med vakter av typen i tidsrommet der
   * personen kunne hatt vakten etter kravene (aktiv, kvalifisert, arbeidsdag),
   * og av dem dagene personen var ledig (ingen annen status).
   */
  availability: { days: number; free: number };
  before: WorkloadStat;
  /** Med forslag: vakter i den foreslåtte planen (forslagets periode innenfor tidsrommet). */
  planned?: number;
  /** Med forslag: samlet etter at forslaget eventuelt godtas. */
  after?: WorkloadStat;
}

export interface WorkloadType {
  statusId: string;
  rows: WorkloadRow[];
}

export interface Workload {
  from: IsoDate;
  to: IsoDate;
  /** Om forventet antall og avvik er med (se `WorkloadStat.expected`). */
  exemptionDetails: boolean;
  /** Forslagets periode, klippet til tidsrommet, når et forslag er med. */
  plan?: { from: IsoDate; to: IsoDate };
  types: WorkloadType[];
}

export interface WorkloadProposal {
  /** Kalenderen slik den blir om forslaget godtas. */
  state: PlannerState;
  from: IsoDate;
  to: IsoDate;
}

/** Avviket fra forventet antall, eller null når forventet antall ikke vises. */
export const deviation = (s: WorkloadStat): number | null => (s.expected === null ? null : s.count - s.expected);

export interface WorkloadOptions {
  /** Med forslag: kalenderen slik den blir om forslaget godtas. */
  proposal?: WorkloadProposal;
  /**
   * Ta med forventet antall og avvik. Bare for roller med myndighet over
   * administrativt vaktfritak; ellers er alt annet i oversikten likt med og
   * uten fritak (lesemodellen i OUSFAR docs/personal.md §6.2).
   */
  exemptionDetails?: boolean;
}

export function checkWorkloadPeriod(from: IsoDate, to: IsoDate): string | null {
  if (!isIsoDate(from) || !isIsoDate(to)) return 'Velg både fra- og tildato.';
  if (from > to) return 'Tidsrommet må slutte på eller etter startdatoen.';
  if (diffDays(from, to) + 1 > MAX_WORKLOAD_DAYS) return `Tidsrommet kan være høyst ${MAX_WORKLOAD_DAYS} dager.`;
  return null;
}

export function workload(state: PlannerState, from: IsoDate, to: IsoDate, today: IsoDate = todayIn(state.unit.timeZone), { proposal, exemptionDetails = true }: WorkloadOptions = {}): Workload {
  const error = checkWorkloadPeriod(from, to);
  if (error) throw new DomainError(error);
  const types = allocatedTypes(state).map((r) => r.statusId);
  const people = state.people;
  const personIndex = new Map(people.map((p, i) => [p.id, i]));
  const window: Window = { start: dayNumber(from), end: dayNumber(to) };
  const days = window.end - window.start + 1;

  /** Vaktene per vakttype og person, og per vakttype og dag, i tidsrommet. */
  const tally = (s: PlannerState, range: { from: IsoDate; to: IsoDate } = { from, to }) => {
    const perPerson = types.map(() => new Array<number>(people.length).fill(0));
    const perDay = types.map(() => new Uint16Array(days));
    for (const e of s.entries) {
      const t = types.indexOf(e.statusId);
      const i = personIndex.get(e.personId);
      if (t < 0 || i === undefined || e.date < range.from || e.date > range.to) continue;
      perPerson[t]![i]! += 1;
      perDay[t]![dayNumber(e.date) - window.start]! += 1;
    }
    return { perPerson, perDay };
  };
  const before = tally(state);
  const clipped = proposal ? { from: proposal.from > from ? proposal.from : from, to: proposal.to < to ? proposal.to : to } : undefined;
  const plan = clipped && clipped.from <= clipped.to ? clipped : undefined;
  const after = proposal ? tally(proposal.state) : undefined;
  // Uten overlapp med tidsrommet har den foreslåtte planen ingen vakter her.
  const planned = proposal ? (plan ? tally(proposal.state, plan).perPerson : types.map(() => new Array<number>(people.length).fill(0))) : undefined;

  // Tilstedeværelsen avhenger ikke av vaktene, så én tabell gjelder både før og etter.
  const table = shareTable(state, people, types, window, today, (date, statusId) => {
    const t = types.indexOf(statusId);
    const k = dayNumber(date) - window.start;
    return Math.max(before.perDay[t]![k]!, after?.perDay[t]![k]! ?? 0);
  });

  const exp = (values: number[] | undefined, i: number) => (exemptionDetails ? values![i]! : null);
  return {
    from,
    to,
    exemptionDetails,
    ...(plan ? { plan } : {}),
    types: types.map((statusId, t) => {
      const expBefore = expectedIn(table, t, window, before.perDay[t]!);
      const expAfter = after ? expectedIn(table, t, window, after.perDay[t]!) : undefined;
      const rows: WorkloadRow[] = people.map((p, i) => ({
        personId: p.id,
        name: p.name,
        share: shareSummary(state, p.id, from, to),
        availability: availabilityOf(table, i, t),
        before: { count: before.perPerson[t]![i]!, expected: exp(expBefore, i) },
        ...(planned ? { planned: planned[t]![i]! } : {}),
        ...(after ? { after: { count: after.perPerson[t]![i]!, expected: exp(expAfter, i) } } : {}),
      }));
      // Med: alle med vakter, og alle som kunne hatt vakten en dag med vakter og har vaktandel over 0 %.
      // Utvalget avhenger ikke av vaktfritak, så det avslører ikke et skjult fritak.
      const relevant = (r: WorkloadRow) => r.before.count > 0 || (r.after?.count ?? 0) > 0 || (r.availability.days > 0 && r.share.max > 0);
      return { statusId, rows: rows.filter(relevant) };
    }),
  };
}

function shareSummary(state: PlannerState, personId: string, from: IsoDate, to: IsoDate): WorkloadRow['share'] {
  const segments = dutyShareTimeline(dutyScheduleOf(state, personId), from, to);
  const values = segments.map((x) => x.percent);
  return { min: Math.min(...values), max: Math.max(...values), segments };
}

function availabilityOf(table: ReturnType<typeof shareTable>, person: number, t: number): WorkloadRow['availability'] {
  let days = 0;
  let free = 0;
  table.demand[t]!.forEach((n, k) => {
    if (!n || !table.qualified[person]![t]![k]) return;
    days += 1;
    free += table.available[person]![t]![k]!;
  });
  return { days, free };
}
