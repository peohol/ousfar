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
import { dutySharePercentAt, removeOrdinaryDutyShare, removeTemporaryDutyShare, setOrdinaryDutyShare, upsertTemporaryDutyShare } from '@delt/personal/dutyShare'
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
}

/** Innstillingene slik kommandoene gir dem tilbake. */
export interface Innstillinger {
  id: string
  revisjon: number
  kvalifikasjoner: Kvalifikasjonsperiode[]
  vaktandel: DutyShareSchedule
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
  }
}

export function lesInnstillinger(v: unknown): Innstillinger {
  const o = objekt(v)
  return {
    id: tekst(o.id) ?? '',
    revisjon: typeof o.revisjon === 'number' ? o.revisjon : 0,
    kvalifikasjoner: lesKvalifikasjoner(o.kvalifikasjoner),
    vaktandel: lesVaktandel(o.vaktandel),
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

/** Kvalifikasjonene som gjelder i dag. */
export function kvalifisertI(m: Medarbeider, iDag: IsoDate): string[] {
  return [...new Set(m.kvalifikasjoner.filter((k) => k.fra <= iDag && (k.til === null || iDag <= k.til)).map((k) => k.status))].sort()
}

/** Ny i kalenderen: har aldri fått noen kvalifikasjon, så en planlegger bør velge vaktene (§8.5). */
export const erNy = (m: Medarbeider): boolean => m.kvalifikasjoner.length === 0

/** Medarbeiderne fanen viser: de som er med fremover, de nye først, ellers i rekkefølgen fra databasen. */
export function iFanen(g: Medarbeidergrunnlag): Medarbeider[] {
  const med = g.medarbeidere.filter((m) => erMedFremover(m, g.iDag))
  return [...med.filter(erNy), ...med.filter((m) => !erNy(m))]
}

export const vaktandelI = (m: Medarbeider, dag: IsoDate): number => dutySharePercentAt(m.vaktandel, dag)

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

