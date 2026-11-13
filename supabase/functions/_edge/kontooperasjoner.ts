/**
 * Kontooperasjonene som trenger forhøyede rettigheter, samlet ett sted fordi
 * flere endepunkter bruker de samme stegene.
 */
import type { SupabaseContext } from 'npm:@supabase/server@1'
import { genererMidlertidigPassord } from '../_delt/passord.ts'
import { Avvist } from './kontekst.ts'

type Adminklient = SupabaseContext['supabaseAdmin']

/**
 * Klarerer ett brukernavn for kontoopprettelse.
 *
 * Databasetriggeren på `auth.users` krever en slik reservasjon og bruker den
 * opp. Den kan bare legges inn med hemmelig nøkkel, og er dermed beviset på
 * at kontoen kommer fra adminveien og ikke fra en selvregistrering.
 */
export async function reserverBrukernavn(
  admin: Adminklient,
  brukernavn: string,
): Promise<void> {
  const { error } = await admin
    .from('kontoreservasjoner')
    .upsert({ username: brukernavn, reservert_kl: new Date().toISOString() })
  if (error) throw error
}

/** Tar reservasjonen tilbake når kontoen likevel ikke ble opprettet. */
export async function frigiBrukernavn(admin: Adminklient, brukernavn: string): Promise<void> {
  await admin.from('kontoreservasjoner').delete().eq('username', brukernavn)
}

/**
 * Svarene fra kontooperasjonene i databasen som er ment for den som kalte,
 * med HTTP-statusen de skal gi. Meldingen skrives i databasen; alt annet blir
 * en generisk feil.
 */
const AVSLAG: Readonly<Record<string, number>> = {
  '42501': 403, // nektet: mangler myndighet
  P0002: 404, // ukjent bruker
  '22023': 400, // ugyldig forespørsel
  '23514': 409, // ville brutt en regel, som å fjerne den siste administratoren
  '40001': 409, // tilgangene ble endret underveis
  '55000': 409, // kontoen er ikke klar, som før førstegangsoppsettet
  '55P03': 409, // en annen tilbakestilling av samme konto er i gang
}

/**
 * Kaller en av kontooperasjonene i databasen (`kontooperasjon_*`). De
 * kontrollerer selv om den innloggede har myndighet, med den felles låsen
 * holdt, og gjør endringen i samme transaksjon.
 */
export async function kontofunksjon<T>(
  admin: Adminklient,
  navn: string,
  argumenter: Record<string, unknown>,
): Promise<T> {
  const { data, error } = await admin.rpc(navn, argumenter)
  if (error) {
    const status = AVSLAG[error.code ?? '']
    if (status !== undefined) throw new Avvist(error.message, status)
    throw error
  }
  return data as T
}

/**
 * Gir brukeren et nytt midlertidig passord i Auth.
 *
 * Bare passordet: myndigheten kontrolleres, og kontoen settes tilbake i
 * førstegangsoppsett, av kontooperasjonene i databasen før og etter (se
 * `nytt-passord`). Passordet returneres én gang, til den administratoren som
 * ba om det. Det lagres ingen steder og kan ikke hentes fram igjen — mistes
 * det, må det lages et nytt.
 */
export async function settMidlertidigPassord(
  admin: Adminklient,
  brukerId: string,
): Promise<string> {
  const midlertidig = genererMidlertidigPassord()

  const { error } = await admin.auth.admin.updateUserById(brukerId, { password: midlertidig })
  if (error) throw error

  return midlertidig
}
