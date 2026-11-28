/**
 * Formålene for varsler på enheten slik appen viser dem (docs/enhetsvarsler.md,
 * #600). Hvilke formål den innloggede har, og valget for hvert, avgjør
 * databasen (`mine_enhetsvarselformal`); her står bare navnet og
 * forklaringen. Et formål databasen gir, men som ikke står her, vises ikke.
 *
 * Et nytt formål (som kalenderen fra OUSFAR Personal) føres inn her og i
 * databasen. Har det egne innstillinger under bryteren, lastes de bare for
 * dem som har formålet (`Innstillinger`, med `lazy`).
 */
import type { ComponentType, LazyExoticComponent } from 'react'

export interface Varselformal {
  /** Navnet på bryteren. */
  tittel: string
  /** Hva man får varsel om. */
  forklaring: string
  /** Formålets egne innstillinger, vist under bryteren når den står på. */
  Innstillinger?: LazyExoticComponent<ComponentType>
}

export const VARSELFORMAL: Readonly<Record<string, Varselformal>> = {
  chat: {
    tittel: 'Chatmeldinger',
    forklaring: 'Når noen skriver i gruppene dine eller sender deg en direktemelding. Varselet viser ikke selve meldingen.',
  },
}

/** Ett formål den innloggede har, med valget. */
export interface Formalvalg {
  formal: string
  pa: boolean
}

/** Svaret fra `mine_enhetsvarselformal`: bare formål appen kjenner, i rekkefølgen databasen gir. */
export function lesFormalvalg(data: unknown, kjente: Readonly<Record<string, Varselformal>> = VARSELFORMAL): Formalvalg[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((r): Formalvalg[] => {
    if (r === null || typeof r !== 'object') return []
    const { formal, pa } = r as Record<string, unknown>
    return typeof formal === 'string' && typeof pa === 'boolean' && Object.hasOwn(kjente, formal) ? [{ formal, pa }] : []
  })
}
