/**
 * Den gamle adminrollen: «Gi tilgang til verktøyene» i brukerlista, og veien
 * tilbake. Den lokale administrasjonen av et fagmiljø følger ikke med.
 *
 * Rollen kan bare settes herfra: nettleseren har ikke skriverett på kolonnen.
 * Hvem som får endre hvem, avgjøres i databasen
 * (`kontooperasjon_sett_rolle`, `docs/fagmiljoer.md`, «Myndighet over
 * kontoer»), i samme transaksjon som endringen: bare en systemarkitekt kan gi
 * eller ta adminrollen, ingen kan endre sin egen eller en annen
 * systemarkitekts, og den siste med rollen kan ikke miste den.
 */
import { erRolle, type Profil } from '../_delt/profil.ts'
import { Avvist, brukerIdFelt, endepunkt, tekstfelt } from '../_edge/kontekst.ts'
import { kontofunksjon } from '../_edge/kontooperasjoner.ts'

Deno.serve(
  endepunkt(async ({ kropp, innlogget, admin }) => {
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
