/**
 * Inngangen til personalfunksjonene (OUSFAR Personal, docs/personal.md §8.3
 * og §8.8): hvem som ser dem, og menyvalgene under «Personal».
 *
 * Personalfunksjonene vises bare i fagmiljøet den innloggede arbeider i, og
 * bare når hen har funksjonen `personal` der (`public.mine_funksjoner()`,
 * funksjonsbryterne i #598). Under utprøvingen er det bare systemarkitekter
 * som selv er aktive medlemmer av et testmiljø (K-SKJ-1). For alle andre
 * finnes ingenting: ingen meny, og adressen er nøyaktig som en ukjent
 * adresse (K-SKJ-2). Koden til sidene ligger i `src/personal/` og hentes
 * bare når den vises for noen med tilgang (K-SKJ-8); ingenting utenfor den
 * mappa importerer den, unntatt den ene lastingen i `src/sidekode.ts`.
 *
 * Dette er et grensesnitt, ikke en kontroll. Databasen svarer «Finnes ikke.»
 * på hvert kall fra den som ikke har funksjonen (`personal.krev_tilgang`,
 * K-SKJ-3).
 */
import { harFunksjon, type Fagmiljoreferanse, type Rettigheter } from './auth/rettigheter'
import type { Menypunkt } from './components/meny/menytre'
import { kalenderadresse, ukjent, adresse, type Rute } from './domain/rute'

/** Nøkkelen til personalfunksjonen i katalogen over funksjoner (`public.funksjoner`). */
export const PERSONALFUNKSJON = 'personal'

/**
 * Fagmiljøet personalfunksjonene gjelder: det den innloggede arbeider i, når
 * hen har funksjonen der, ellers `null`. Har hen funksjonen bare i et annet
 * fagmiljø, vises ingenting før hen bytter til det (K-TIL-1).
 */
export function personalfagmiljo(r: Rettigheter): Fagmiljoreferanse | null {
  const fagmiljo = r.arbeidsfagmiljo
  return fagmiljo && harFunksjon(r, PERSONALFUNKSJON, fagmiljo.id) ? fagmiljo : null
}

/**
 * Ruten slik appen viser den: en personalside er en ukjent adresse for den
 * som ikke har funksjonen, med adressen slik den sto (K-SKJ-2). Alt som
 * følger ruten — siden, tittelen, menyen, diskusjonene og meldingen om en ny
 * versjon — ser da det samme som for en adresse appen ikke kjenner.
 */
export function synligRute(rute: Rute, fagmiljo: Fagmiljoreferanse | null): Rute {
  return rute.side === 'kalender' && !fagmiljo ? ukjent(adresse(rute)) : rute
}

/**
 * Valgene under «Personal» i hovedmenyen (#606). Uten funksjonen er lista
 * tom, og grenen «Personal» vises ikke (`rensNiva`).
 */
export function personalvalg(r: Rettigheter, rute: Rute): Menypunkt[] {
  if (!personalfagmiljo(r)) return []
  return [{ id: 'kalender', navn: 'Kalender', ikon: 'kalender', adresse: kalenderadresse(), gjeldende: rute.side === 'kalender' }]
}
