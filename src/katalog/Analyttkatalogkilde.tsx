/**
 * Analyttkatalogen appen bruker: fagmiljøets egen, hentet fra databasen når
 * appen åpnes (`public.les_analyttkatalog()`), og forfra når fagmiljøet
 * fortolkningen gjelder (arbeidskonteksten), byttes.
 *
 * Katalogen lagres ikke i nettleserens mellomlager. Den er liten, og et
 * lagret svar kunne ellers ha blitt brukt i et annet fagmiljø.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { byggKatalog, lesKatalogdata, TOM_KATALOG, type Analyttkatalog } from '../domain/analyttkatalog'
import { tilFeil } from '../faginnhold/lagring'
import { useHenting } from '../hooks/useHenting'

/** Katalogen for arbeidskonteksten til den innloggede. */
export async function lesAnalyttkatalog(klient: SupabaseClient): Promise<Analyttkatalog> {
  const { data, error } = await klient.rpc('les_analyttkatalog')
  if (error) throw tilFeil(error)
  return byggKatalog(lesKatalogdata(data))
}

/** Katalogen slik appen har den. */
export type Katalogtilstand =
  | { status: 'laster' }
  | { status: 'feil'; melding: string; provIgjen: () => void }
  | { status: 'klar'; katalog: Analyttkatalog }

/** Henter katalogen, og forfra når `kontekst` (arbeidskonteksten) byttes. */
export function useHentAnalyttkatalog(
  hent: () => Promise<Analyttkatalog>,
  kontekst: string | null,
): Katalogtilstand {
  const { tilstand, hentPaNytt } = useHenting(hent, kontekst)
  return useMemo(() => {
    if (tilstand.status === 'klar') return { status: 'klar', katalog: tilstand.data }
    if (tilstand.status === 'feil') return { status: 'feil', melding: tilstand.melding, provIgjen: hentPaNytt }
    return tilstand
  }, [tilstand, hentPaNytt])
}

/** Katalogen appen bruker, og hvorfor den eventuelt er tom. */
export interface Katalogkilde {
  katalog: Analyttkatalog
  /** Meldingen når katalogen ikke kunne hentes, med veien til å prøve igjen. */
  feil: { melding: string; provIgjen: () => void } | null
}

const Kontekst = createContext<Katalogkilde>({ katalog: TOM_KATALOG, feil: null })

export function AnalyttkatalogKilde({ verdi, children }: { verdi: Katalogkilde; children: ReactNode }) {
  return <Kontekst.Provider value={verdi}>{children}</Kontekst.Provider>
}

/** Katalogen appen er gitt; en tom utenfor {@link AnalyttkatalogKilde}. */
export function useAnalyttkatalog(): Analyttkatalog {
  return useContext(Kontekst).katalog
}

/** Hele kilden, med feilen. */
export function useKatalogkilde(): Katalogkilde {
  return useContext(Kontekst)
}

/**
 * Hvorfor fortolkningen ikke kan brukes, når den ikke kan det: katalogen
 * kunne ikke hentes, eller fagmiljøet har ingen. `null` når katalogen har
 * noe å fortolke. Det finnes ingen reserve: et fagmiljø uten egen katalog
 * får aldri et annet fagmiljøs.
 */
export function katalogstopp({ katalog, feil }: Katalogkilde): { melding: string; provIgjen: () => void } | null {
  if (feil) return { melding: `Analyttkatalogen kunne ikke hentes. ${feil.melding}`.trim(), provIgjen: feil.provIgjen }
  if (katalog.fortolkninger.length > 0) return null
  const hvor = katalog.fagmiljo ? ` for ${katalog.fagmiljo.navn}` : ''
  return {
    melding: katalog.fagmiljo
      ? `Fortolkningen er ikke satt opp${hvor} ennå: fagmiljøet har ingen analyttkatalog. Si fra til en systemarkitekt.`
      : 'Du har ikke noe aktivt fagmiljø å fortolke i. Si fra til administratoren i fagmiljøet ditt.',
    provIgjen: () => window.location.reload(),
  }
}

/** Kilden for en tilstand som ikke laster lenger. */
export function katalogkildeFor(tilstand: Exclude<Katalogtilstand, { status: 'laster' }>): Katalogkilde {
  return tilstand.status === 'klar'
    ? { katalog: tilstand.katalog, feil: null }
    : { katalog: TOM_KATALOG, feil: { melding: tilstand.melding, provIgjen: tilstand.provIgjen } }
}

