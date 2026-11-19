/**
 * Det profilkortet ved hovering viser i tillegg til navnet og bildet
 * (`public.profilkortdetaljer`, docs/fagmiljoer.md «Profilkortet»).
 */

export interface Profilkortdetaljer {
  id: string
  /** Fagmiljøene personen er aktivt medlem av, primærfagmiljøet først. */
  fagmiljoer: string[]
  /** Stillingen, når personen har oppgitt en og databasen gir den. */
  stilling?: string | null
  /** Det kan sendes direktemeldinger til personen nå. Én grunn for alt. */
  kan_chatte: boolean
}

const erTekst = (x: unknown): x is string => typeof x === 'string'

/** Svaret fra databasen, eller `null` når kortet ikke har mer å vise (personen er ikke synlig, eller finnes ikke). */
export function lesProfilkortdetaljer(verdi: unknown): Profilkortdetaljer | null {
  if (!verdi || typeof verdi !== 'object') return null
  const v = verdi as Record<string, unknown>
  if (!erTekst(v.id)) return null
  return {
    id: v.id,
    fagmiljoer: Array.isArray(v.fagmiljoer) ? v.fagmiljoer.filter(erTekst) : [],
    ...('stilling' in v && { stilling: erTekst(v.stilling) && v.stilling.trim() !== '' ? v.stilling : null }),
    kan_chatte: v.kan_chatte === true,
  }
}
