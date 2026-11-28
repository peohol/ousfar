/**
 * Fanene i personalkalenderen (`#/kalender`, docs/personal.md §8.8), i den
 * rekkefølgen de står. En ny fane er én oppføring her og ett ledd i
 * `KALENDERFANER` (`src/domain/rute.ts`); siden, adressen og fanelista følger
 * av den.
 *
 * `vis` sier hvilke roller som ser fanen, etter rollen databasen gir
 * (`personal.kan`). Det er et grensesnitt, ikke en kontroll: hver kommando
 * kontrollerer rollen på nytt på serveren (K-TIL-2).
 */
import type { ComponentType } from 'react'
import { can } from '@delt/personal/permissions'
import type { Role } from '@delt/personal/types'
import type { Fagmiljoreferanse } from '../auth/rettigheter'
import type { Kalenderfane } from '../domain/rute'
import type { Personalgrunnlag } from './grunnlag'
import { Medarbeidere } from './medarbeidere/Medarbeidere'

/** Det hver fane får: fagmiljøet og grunnlaget for kalenderen der. */
export interface Faneinnhold {
  fagmiljo: Fagmiljoreferanse
  grunnlag: Personalgrunnlag
  /** Henter grunnlaget på nytt, etter en endring. */
  hentPaNytt: () => void
}

export interface Kalenderfanedefinisjon {
  /** Leddet i adressen; `undefined` for selve kalenderen (`#/kalender`). */
  id: Kalenderfane | undefined
  navn: string
  vis: (rolle: Role) => boolean
  Innhold: ComponentType<Faneinnhold>
}

/** Kalenderens fire visninger kommer i P3. */
function Kalenderen() {
  return <p className="gruppeside__ingress">Kalenderen kommer her.</p>
}

export const KALENDERFANEDEFINISJONER: readonly Kalenderfanedefinisjon[] = [
  { id: undefined, navn: 'Kalender', vis: (rolle) => can(rolle, 'view'), Innhold: Kalenderen },
  { id: 'medarbeidere', navn: 'Medarbeidere', vis: (rolle) => can(rolle, 'editPeople'), Innhold: Medarbeidere },
]

/** Fanene rollen ser. Selve kalenderen ser alle som ser siden. */
export const fanerFor = (rolle: Role) => KALENDERFANEDEFINISJONER.filter((f) => f.vis(rolle))
