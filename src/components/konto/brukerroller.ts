import { visningsnavn } from '@delt/profil'
import type { Medlem } from '../../auth/api'
import type { Ikonnavn } from '../ikon/register'

/** Hva et medlem er i et fagmiljø, fra mest til minst myndighet. */
export type Brukerrolle = 'systemarkitekt' | 'administrator' | 'bruker'

export interface Rolledefinisjon {
  rolle: Brukerrolle
  /** Overskriften over gruppen, i flertall. */
  tittel: string
  ikon: Ikonnavn
  /** Hva rollen betyr, med navnet på fagmiljøet lista gjelder. */
  forklaring: (fagmiljo: string) => string
}

/**
 * Rollene i brukerlista, i den rekkefølgen gruppene står. Ikonet og fargen
 * hører til rollen (fargen står i `konto.css`, `[data-rolle]`), så en ny
 * rolle legges til her og der.
 */
export const BRUKERROLLER: readonly Rolledefinisjon[] = [
  {
    rolle: 'systemarkitekt',
    tittel: 'Systemarkitekter',
    ikon: 'rolleSystemarkitekt',
    forklaring: () => 'Har ansvaret for hele OUSFAR, på tvers av fagmiljøene.',
  },
  {
    rolle: 'administrator',
    tittel: 'Administratorer',
    ikon: 'rolleAdministrator',
    forklaring: (fagmiljo) => `Administrerer medlemmene og det lokale innholdet i ${fagmiljo}.`,
  },
  {
    rolle: 'bruker',
    tittel: 'Brukere',
    ikon: 'user',
    forklaring: (fagmiljo) => `Vanlige medlemmer av ${fagmiljo}.`,
  },
]

/** Rollen til et medlem; en systemarkitekt som også administrerer fagmiljøet, er systemarkitekt. */
export function brukerrolle(medlem: Pick<Medlem, 'systemarkitekt' | 'administrator'>): Brukerrolle {
  if (medlem.systemarkitekt) return 'systemarkitekt'
  return medlem.administrator ? 'administrator' : 'bruker'
}

const alfabetisk = new Intl.Collator('nb', { sensitivity: 'base' })

/** Medlemmene alfabetisk etter navnet som vises, med brukernavnet som skille ved likt navn. */
export function etterNavn<T extends Pick<Medlem, 'first_name' | 'last_name' | 'username'>>(medlemmer: readonly T[]): T[] {
  return [...medlemmer].sort(
    (a, b) => alfabetisk.compare(visningsnavn(a), visningsnavn(b)) || alfabetisk.compare(a.username, b.username),
  )
}

export interface Rollegruppe<T> {
  definisjon: Rolledefinisjon
  medlemmer: T[]
}

/** Medlemmene gruppert etter rolle i rekkefølgen i `BRUKERROLLER`, alfabetisk i hver gruppe. Tomme grupper utelates. */
export function grupperEtterRolle<T extends Pick<Medlem, 'systemarkitekt' | 'administrator' | 'first_name' | 'last_name' | 'username'>>(
  medlemmer: readonly T[],
): Rollegruppe<T>[] {
  const sortert = etterNavn(medlemmer)
  return BRUKERROLLER.map((definisjon) => ({
    definisjon,
    medlemmer: sortert.filter((m) => brukerrolle(m) === definisjon.rolle),
  })).filter((gruppe) => gruppe.medlemmer.length > 0)
}
