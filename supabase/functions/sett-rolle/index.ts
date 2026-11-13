/**
 * «Gjør til administrator» og veien tilbake.
 *
 * Rollen kan bare settes herfra: nettleseren har ikke skriverett på kolonnen.
 * Hvem som får endre hvem, avgjøres i databasen
 * (`supabase/migrations/20261113203000_kontomyndighet.sql`), i samme
 * transaksjon som endringen: bare en systemarkitekt kan gi eller ta
 * adminrollen, ingen kan endre sin egen eller en annen systemarkitekts, og den
 * siste administratoren kan ikke fjernes.
 */
import { erRolle, type Profil } from '../_delt/profil.ts'
import { Avvist, brukerIdFelt, endepunkt, tekstfelt } from '../_edge/kontekst.ts'
import { kontofunksjon } from '../_edge/kontooperasjoner.ts'

Deno.serve(
  endepunkt({ krevAdmin: false }, async ({ kropp, innlogget, admin }) => {
    const brukerId = brukerIdFelt(kropp)
    const rolle = tekstfelt(kropp, 'rolle')
    if (!erRolle(rolle)) throw new Avvist('Ukjent rolle.')

    const profil = await kontofunksjon<Profil>(admin, 'kontooperasjon_sett_rolle', {
      aktor: innlogget.id,
      mal: brukerId,
      rolle,
    })
    return { profil }
  }),
)
