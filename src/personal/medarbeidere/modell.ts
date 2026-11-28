/**
 * Medarbeiderne slik Medarbeidere-fanen trenger dem, lest fra grunnlaget
 * databasen gir (`public.personal_grunnlag`, docs/personal-database.md,
 * «1:1 med medlemmene» og «Innstillingene»), og vaktandelen endret med
 * domenefunksjonene (`dutyShare.ts`), så appen gir de samme feilene som
 * serveren før noe sendes.
 *
 * Grunnlaget er det databasen avgjør. Det som står her, er bare visningen;
 * hver endring kontrolleres på nytt på serveren (K-TIL-2).
 */
import { can } from '@delt/personal/permissions'
import { addDays } from '@delt/personal/dates'
import { dutySharePercentAt, periodTense, removeOrdinaryDutyShare, removeTemporaryDutyShare, setOrdinaryDutyShare, upsertTemporaryDutyShare } from '@delt/personal/dutyShare'
import type { DutyShareSchedule, IsoDate, PlannerState, Role, StaffCategory, StatusDefinition } from '@delt/personal/types'
import type { Personalgrunnlag } from '../grunnlag'

export interface Kvalifikasjonsperiode {
  status: string
  fra: IsoDate
  til: IsoDate | null
}

export interface Medarbeider {
  id: string
  navn: string
  /** Stillingen fra profilen; `null` når den mangler (B14). */
  stilling: string | null
  syntetisk: boolean
  aktivFra: IsoDate
  aktivTil: IsoDate | null
  perioder: { fra: IsoDate; til: IsoDate | null }[]
  revisjon: number
  vaktandel: DutyShareSchedule
  /** Bare for planleggerne; ellers tom. */
  kvalifikasjoner: Kvalifikasjonsperiode[]
  /** Vaktene er ikke valgt i den gjeldende perioden (`personal.er_ny`); bare for planleggerne. */
  ny: boolean
}

/** Innstillingene slik kommandoene gir dem tilbake. */
export interface Innstillinger {
  id: string
  revisjon: number
  kvalifikasjoner: Kvalifikasjonsperiode[]
  vaktandel: DutyShareSchedule
  ny: boolean
}

const tekst = (v: unknown): string | null => (typeof v === 'string' ? v : null)
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const objekt = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

const TOM_VAKTANDEL: DutyShareSchedule = { ordinary: [], temporary: [] }

function lesVaktandel(v: unknown): DutyShareSchedule {
  const o = objekt(v)
  return Array.isArray(o.ordinary) && Array.isArray(o.temporary) ? (o as unknown as DutyShareSchedule) : TOM_VAKTANDEL
}

function lesKvalifikasjoner(v: unknown): Kvalifikasjonsperiode[] {
  return liste(v).flatMap((k) => {
    const o = objekt(k)
    const status = tekst(o.status)
    const fra = tekst(o.fra)
    return status && fra ? [{ status, fra, til: tekst(o.til) }] : []
  })
}

function lesMedarbeider(v: unknown): Medarbeider | null {
  const o = objekt(v)
  const id = tekst(o.id)
  const aktivFra = tekst(o.aktiv_fra)
  if (!id || !aktivFra) return null
  return {
    id,
    navn: tekst(o.navn) ?? '',
    stilling: tekst(o.stilling),
    syntetisk: o.syntetisk === true,
    aktivFra,
    aktivTil: tekst(o.aktiv_til),
    perioder: liste(o.perioder).flatMap((p) => {
      const x = objekt(p)
      const fra = tekst(x.fra)
      return fra ? [{ fra, til: tekst(x.til) }] : []
    }),
    revisjon: typeof o.revisjon === 'number' ? o.revisjon : 0,
    vaktandel: lesVaktandel(o.vaktandel),
    kvalifikasjoner: lesKvalifikasjoner(o.kvalifikasjoner),
    ny: o.ny === true,
  }
}

export function lesInnstillinger(v: unknown): Innstillinger {
  const o = objekt(v)
  return {
    id: tekst(o.id) ?? '',
    revisjon: typeof o.revisjon === 'number' ? o.revisjon : 0,
    kvalifikasjoner: lesKvalifikasjoner(o.kvalifikasjoner),
    vaktandel: lesVaktandel(o.vaktandel),
    ny: o.ny === true,
  }
}

/** Det fanen viser: dagens dato i fagmiljøet, medarbeiderne, stillingene og oppgavene som krever kvalifikasjon. */
export interface Medarbeidergrunnlag {
  iDag: IsoDate
  rolle: Role
  medarbeidere: Medarbeider[]
  stillinger: StaffCategory[]
  /** Oppgavene i dagens oppsett som krever kvalifikasjon og kan velges. */
  oppgaver: StatusDefinition[]
}

export function lesMedarbeidergrunnlag(g: Personalgrunnlag): Medarbeidergrunnlag {
  const regelsett = liste(g.svar.regelsett)
  const gjeldende = objekt(regelsett[regelsett.length - 1])
  return {
    iDag: tekst(g.svar.i_dag) ?? '',
    rolle: g.rolle,
    medarbeidere: liste(g.svar.medarbeidere).flatMap((m) => lesMedarbeider(m) ?? []),
    stillinger: liste(g.svar.kategorier) as StaffCategory[],
    oppgaver: (liste(gjeldende.statuses) as StatusDefinition[]).filter((s) => s.requiresQualification && s.active),
  }
}

/** Med i planleggingen etter i dag: ellers kan innstillingene ikke endres (`personal.aktiv_fremover`). */
export function erMedFremover(m: Medarbeider, iDag: IsoDate): boolean {
  if (m.syntetisk) return m.aktivTil === null || m.aktivTil > iDag
  return m.perioder.some((p) => p.til === null || p.til > iDag)
}

/**
 * Begynnelsen av medarbeiderens gjeldende periode, som databasen
 * (`personal.er_ny`): den siste medlemskapsperioden, eller `aktiv_fra`.
 */
export function periodestart(m: Medarbeider): IsoDate {
  return m.perioder.reduce((siste, p) => (p.fra > siste ? p.fra : siste), m.perioder.length ? '' : m.aktivFra)
}

/** Kvalifikasjonene som gjelder i dag. */
export function kvalifisertI(m: Medarbeider, iDag: IsoDate): string[] {
  return [...new Set(m.kvalifikasjoner.filter((k) => k.fra <= iDag && (k.til === null || iDag <= k.til)).map((k) => k.status))].sort()
}

/** Lesemodellen gir kvalifikasjonene bare dem som planlegger (`editCalendar`, som `personal_grunnlag`). */
export const serKvalifikasjoner = (rolle: Role): boolean => can(rolle, 'editCalendar')

/** Om rollen kan åpne en medarbeider og endre noe; serveren kontrollerer hver endring. */
export const kanEndreMedarbeidere = (rolle: Role): boolean => can(rolle, 'editPeople') || can(rolle, 'editDutyShare')

/**
 * Ny i kalenderen: vaktene er ikke valgt i den gjeldende perioden, så en
 * planlegger bør velge dem (§8.5). Databasen avgjør det (`personal.er_ny`), og
 * et valg uten vakter kvitterer også.
 */
export const erNy = (m: Medarbeider): boolean => m.ny

/**
 * Medarbeiderne fanen viser: de som er med fremover, for planleggerne de nye
 * først, ellers i rekkefølgen fra databasen.
 */
export function iFanen(g: Medarbeidergrunnlag): Medarbeider[] {
  const med = g.medarbeidere.filter((m) => erMedFremover(m, g.iDag))
  if (!serKvalifikasjoner(g.rolle)) return med
  return [...med.filter(erNy), ...med.filter((m) => !erNy(m))]
}

export const vaktandelI = (m: Medarbeider, dag: IsoDate): number => dutySharePercentAt(m.vaktandel, dag)

/** En ordinær vaktandel som periode: til dagen før den neste begynner. */
export interface OrdinaerPeriode {
  fra: IsoDate
  til: IsoDate | null
  prosent: number
  tid: 'past' | 'current' | 'future'
}

/**
 * Den ordinære vaktandelen som perioder, tidligere, gjeldende og fremtidige
 * (§6.2), med når hver gjelder etter `periodTense`. Bare de fremtidige kan
 * fjernes; de andre står som historikk.
 */
export function ordinaerePerioder(m: Medarbeider, iDag: IsoDate): OrdinaerPeriode[] {
  const sortert = [...m.vaktandel.ordinary].sort((a, b) => a.from.localeCompare(b.from))
  return sortert.map((o, i) => {
    const neste = sortert[i + 1]
    const til = neste ? addDays(neste.from, -1) : null
    return { fra: o.from, til, prosent: o.percent, tid: periodTense({ from: o.from, to: til ?? undefined }, iDag) }
  })
}

/**
 * En endring av vaktandelen, gjort med domenefunksjonene på denne ene
 * medarbeideren. De trenger bare medarbeideren og vaktandelene av tilstanden,
 * og kaster `DomainError` med de samme meldingene som serveren.
 */
export type Vaktandelendring =
  | { slag: 'ordinaer'; fra: IsoDate; prosent: number }
  | { slag: 'fjern-ordinaer'; fra: IsoDate }
  | { slag: 'midlertidig'; fra: IsoDate; til: IsoDate; prosent: number; id?: string }
  | { slag: 'fjern-midlertidig'; id: string }

export function endreVaktandel(m: Medarbeider, rolle: Role, endring: Vaktandelendring, iDag: IsoDate): DutyShareSchedule {
  const tilstand = { people: [{ id: m.id }], dutyShares: { [m.id]: m.vaktandel } } as unknown as PlannerState
  const etter = (() => {
    switch (endring.slag) {
      case 'ordinaer':
        return setOrdinaryDutyShare(tilstand, rolle, m.id, endring.fra, endring.prosent, iDag)
      case 'fjern-ordinaer':
        return removeOrdinaryDutyShare(tilstand, rolle, m.id, endring.fra, iDag)
      case 'midlertidig':
        return upsertTemporaryDutyShare(tilstand, rolle, m.id, { id: endring.id, from: endring.fra, to: endring.til, percent: endring.prosent }, iDag)
      case 'fjern-midlertidig':
        return removeTemporaryDutyShare(tilstand, rolle, m.id, endring.id, iDag)
    }
  })()
  return etter.dutyShares[m.id] ?? TOM_VAKTANDEL
}

