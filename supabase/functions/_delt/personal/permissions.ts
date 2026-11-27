import type { PlannerState, Role } from './types.ts';

/**
 * Demonstrerte roller (OUSFAR docs/personal.md §3.3 og §6.2). Prototypen har
 * ingen ekte kontoer eller sikker tilgangskontroll, men alle kommandoer
 * kontrollerer rollen slik en server ville gjort, ikke bare ved å skjule
 * knapper. I OUSFAR skal de samme reglene håndheves på serversiden,
 * avgrenset til eget fagmiljø.
 *
 * - Leser (kollega): ser planen.
 * - Vaktplanansvarlig: egen rolle, uavhengig av redaktørroller. Redigerer
 *   kalenderen, medarbeiderne og vaktandelene, og lager, godtar og
 *   publiserer vaktplanen.
 * - Lokal administrator (også systemarkitekt med myndighet i fagmiljøet): det
 *   samme, og i tillegg regler og administrativt vaktfritak.
 * - Systemarkitekt uten lokal myndighet: ingen tilgang. Systemarkitektrollen
 *   gir ikke i seg selv innsyn i personalopplysninger i et fagmiljø.
 */

export type Action =
  | 'view'
  | 'editCalendar'
  | 'editPeople'
  /** Sette ordinær vaktandel og midlertidige perioder. */
  | 'editDutyShare'
  | 'editRules'
  /** Se og innvilge (eller trekke tilbake) administrativt vaktfritak ved Borte. */
  | 'manageExemption'
  /** Tilbakestille hele prototypen til eksempeldata. Demooperasjon som bare finnes i prototypen. */
  | 'resetDemo';

const MATRIX: Record<Role, ReadonlySet<Action>> = {
  reader: new Set(['view']),
  planner: new Set(['view', 'editCalendar', 'editPeople', 'editDutyShare', 'resetDemo']),
  localAdmin: new Set(['view', 'editCalendar', 'editPeople', 'editDutyShare', 'editRules', 'manageExemption', 'resetDemo']),
  outsideArchitect: new Set([]),
};

/** Alle demoroller, i visningsrekkefølge. */
export const ROLES: readonly Role[] = ['reader', 'planner', 'localAdmin', 'outsideArchitect'];

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role, action: Action): boolean {
  return isRole(role) && MATRIX[role].has(action);
}

export const ROLE_LABELS: Record<Role, string> = {
  reader: 'Leser',
  planner: 'Vaktplanansvarlig',
  localAdmin: 'Lokal administrator',
  outsideArchitect: 'Systemarkitekt uten lokal myndighet',
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  reader: 'Ser planen, men kan ikke endre noe.',
  planner: 'Redigerer kalenderen, medarbeiderne og vaktandelene, lager og godtar forslag til vaktfordeling og publiserer vaktplanen.',
  localAdmin: 'Som vaktplanansvarlig, og endrer i tillegg regler og innvilger administrativt vaktfritak. Gjelder også systemarkitekter med myndighet i fagmiljøet.',
  outsideArchitect: 'Ingen tilgang: systemarkitektrollen gir ikke i seg selv innsyn i personalopplysninger i et fagmiljø.',
};

export function permissionMessage(role: Role, action: Action): string {
  return `Rollen ${(isRole(role) ? ROLE_LABELS[role] : 'ukjent').toLowerCase()} har ikke tilgang til å ${ACTION_TEXT[action]}.`;
}

export class PermissionError extends Error {
  constructor(role: Role, action: Action) {
    super(permissionMessage(role, action));
    this.name = 'PermissionError';
  }
}

const ACTION_TEXT: Record<Action, string> = {
  view: 'se planen',
  editCalendar: 'endre kalenderen',
  editPeople: 'endre medarbeidere',
  editDutyShare: 'endre vaktandeler',
  editRules: 'endre statuser og regler',
  manageExemption: 'innvilge eller trekke tilbake administrativt vaktfritak',
  resetDemo: 'tilbakestille prototypen',
};

export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) throw new PermissionError(role, action);
}

/**
 * Rettighetene som trengs for å gå fra én tilstand til en annen, avledet av
 * hvilke deler som er endret. Brukes for angre og gjør om, slik at en rolle
 * ikke kan angre eller gjøre om en endring den selv ikke har lov til å gjøre.
 */
export function requiredActions(from: PlannerState, to: PlannerState): Action[] {
  const out: Action[] = [];
  if (from.rules !== to.rules || from.ruleVersions !== to.ruleVersions) out.push('editRules');
  if (from.entries !== to.entries || from.publishedThrough !== to.publishedThrough) out.push('editCalendar');
  if (from.people !== to.people || from.peopleHistory !== to.peopleHistory || from.peopleFrom !== to.peopleFrom || from.categories !== to.categories || from.unit !== to.unit) out.push('editPeople');
  if (from.dutyShares !== to.dutyShares) out.push('editDutyShare');
  // Et vaktfritak kan ikke innvilges indirekte, heller ikke ved angre eller gjør om.
  if (from.entries !== to.entries && (exemptionsAdded(from, to) || exemptionsRemoved(from, to))) out.push('manageExemption');
  return out;
}

export function canTransition(role: Role, from: PlannerState, to: PlannerState): boolean {
  return requiredActions(from, to).every((a) => can(role, a));
}

/** Første manglende rettighet for overgangen, for en forklarende melding. */
export function missingAction(role: Role, from: PlannerState, to: PlannerState): Action | null {
  return requiredActions(from, to).find((a) => !can(role, a)) ?? null;
}

const exemptKeys = (s: PlannerState): Set<string> => new Set(s.entries.filter((e) => e.exempt).map((e) => `${e.id}|${e.personId}|${e.date}|${e.statusId}`));

/** Har `to` et administrativt vaktfritak som `from` ikke har (samme registrering, person, dato og status)? */
export function exemptionsAdded(from: PlannerState, to: PlannerState): boolean {
  const before = exemptKeys(from);
  return [...exemptKeys(to)].some((k) => !before.has(k));
}

/**
 * Trekkes et administrativt vaktfritak tilbake uten at registreringen
 * forsvinner (samme registrering står igjen uten fritak)? At fritaket faller
 * bort fordi statusen slettes eller erstattes, er en vanlig kalenderendring.
 */
export function exemptionsRemoved(from: PlannerState, to: PlannerState): boolean {
  const after = new Map(to.entries.map((e) => [e.id, e]));
  return from.entries.some((e) => e.exempt && after.get(e.id)?.personId === e.personId && after.get(e.id)?.date === e.date && after.get(e.id)?.statusId === e.statusId && !after.get(e.id)!.exempt);
}

/**
 * Lesemodellen for administrativt vaktfritak (OUSFAR docs/personal.md §6.2).
 * Bare roller med myndighet over fritaket ser det, og bare de ser tall og
 * forklaringer som avhenger av det: forventet antall og avvik i oversikten og
 * forslaget, og tallene i vurderingen av hver kandidat. Ellers kunne et skjult
 * fritak leses ut av forventet antall over et selvvalgt kort tidsrom. Vanlig
 * kalenderinnsyn, antall vakter og det å lage og godta planer er likt for alle.
 */
export const seesExemptionDetails = (role: Role): boolean => can(role, 'manageExemption');
