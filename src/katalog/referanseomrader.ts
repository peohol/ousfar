import type { SupabaseClient } from '@supabase/supabase-js'
import { referanseomraderI, type Analyttkatalog, type Eldrekatalog } from '../domain/analyttkatalog'
import type { Referanseomrade } from '../domain/piller'
import { kortetsForbindelse } from '../faginnhold/datakortplasser'
import { tilFeil } from '../faginnhold/lagring'

/**
 * Referanseområdene fortolkningen viser over knappene i steg 2: fagmiljøets
 * egne, i analyttkatalogen (`referanseomraderI`).
 *
 * Overgangen (`docs/domener.md`, «Overgangen»): appen og databasen rulles ut
 * hver for seg. Møter appen en database der
 * `20261118090000_fortolkning_skilt_fra_fagsidene.sql` ikke er kjørt ennå, eller
 * der den stoppet, har katalogen ikke områdene (`Analyttkatalog.eldre`). Da
 * finnes de som før, på fagsidene, etter samme regel som migrasjonen kopierer
 * dem med, så steg 2 viser de samme tallene før og etter. Kan de ikke leses,
 * feiler hentingen, og fortolkningen sier fra i stedet for å vise steg 2 uten
 * grensene. Dette er det eneste stedet fortolkningen leser fra fagsidene, og
 * det fjernes med overgangen (#405).
 */
export async function lesReferanseomrader(
  katalog: Analyttkatalog,
  lesFagsidekort: () => Promise<unknown>,
): Promise<ReadonlyMap<string, Referanseomrade>> {
  return katalog.eldre ? referanseomraderFraFagsidene(await lesFagsidekort(), katalog.eldre) : referanseomraderI(katalog)
}

/** Referanseområdekortene på de publiserte fagsidene (`les_stoffreferanseomrader`), for `lesReferanseomrader`. */
export function fagsidekortFra(klient: SupabaseClient): () => Promise<unknown> {
  return async () => {
    const { data, error } = await klient.rpc('les_stoffreferanseomrader', { sidetilstand: 'publisert' })
    if (error) throw tilFeil(error)
    return data
  }
}

const tallEllerNull = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Et kort som `les_stoffreferanseomrader` gir det, med området, eller `null` uten noen grense. */
function fagsidekort(verdi: unknown): { stoff: string; gjelder: string | null; omrade: Referanseomrade | null } {
  if (typeof verdi !== 'object' || verdi === null) throw new Error('Et referanseområdekort på fagsidene mangler.')
  const { stoff, gjelder, verdi: data } = verdi as Record<string, unknown>
  if (typeof stoff !== 'string') throw new Error('Et referanseområdekort på fagsidene mangler stoffet.')
  const f = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>
  const nedre = tallEllerNull(f.nedre)
  const ovre = tallEllerNull(f.ovre)
  return {
    stoff,
    gjelder: typeof gjelder === 'string' && gjelder !== '' ? gjelder : null,
    omrade: nedre === null && ovre === null ? null : { nedre, ovre, enhet: typeof f.enhet === 'string' ? f.enhet.trim() : '' },
  }
}

/**
 * Området for hver kode, som migrasjonen kopierer det: det første kortet med
 * en grense på siden til kodens primære stoff som koden brukte, sidens eget
 * eller forbindelsens. Et kort med en analyttkode i `gjelder` fra før (#405)
 * gjelder forbindelsen koden måler, etter katalogen eller
 * `ELDRE_DATAKORTKODER`.
 */
export function referanseomraderFraFagsidene(svar: unknown, eldre: Eldrekatalog): Map<string, Referanseomrade> {
  const kort = (Array.isArray(svar) ? svar : []).map(fagsidekort).filter((k) => k.omrade !== null)
  const forbindelse = (gjelder: string | null) => (gjelder === null ? null : (eldre.forbindelser.get(gjelder) ?? kortetsForbindelse(gjelder)))
  return new Map(
    eldre.bruk.flatMap(({ kode, stoff, gjelder }) => {
      const treff = kort.find((k) => k.stoff === stoff && forbindelse(k.gjelder) === gjelder)
      return treff ? [[kode, treff.omrade!] as const] : []
    }),
  )
}
