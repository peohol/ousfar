/**
 * Søkene etter personer som kan velges (docs/fagmiljoer.md, «Personsøket»).
 * Databasen kontrollerer selv hvem den innloggede kan finne, og gir de samme
 * avslagene som handlingen treffet brukes til.
 */
import { lesbarFeil } from '../auth/databasefeil'
import { klient } from '../auth/klient'
import { lesPersontreff, type Personkilde } from './modell'

async function sok(navn: string, argumenter: Record<string, unknown>) {
  const { data, error } = await klient().rpc(navn, argumenter)
  if (error) throw lesbarFeil(error)
  return lesPersontreff(data)
}

/** Hvem den som styrer gruppen, kan invitere. */
export const gruppekandidater =
  (gruppe: string): Personkilde =>
  (tekst) =>
    sok('sok_gruppekandidater', { gruppe, sok: tekst })

/** Hvem en administrator kan legge til i fagmiljøet. */
export const medlemskandidater =
  (fagmiljo: string): Personkilde =>
  (tekst) =>
    sok('sok_medlemskandidater', { fagmiljo, sok: tekst })
