/**
 * «Tilbakestill passord» — en administrator gir en bruker et nytt midlertidig
 * passord.
 *
 * Det gamle passordet kan ikke hentes fram; veien videre er alltid et nytt.
 * Kontoen settes samtidig tilbake i førstegangsoppsett, slik at brukeren må
 * velge sitt eget passord ved neste innlogging.
 *
 * Hvem som får gi nytt passord til hvem, avgjøres i databasen
 * (`supabase/migrations/20261113203000_kontomyndighet.sql`): ingen kan gi det
 * til noen med samme eller høyere myndighet, og en lokal administrator bare
 * til vanlige brukere i sine egne fagmiljøer. Passordet byttes i Auth mellom
 * to kontroller, og gis bare ut når tilgangene til kontoen var uendret hele
 * veien og ingen annen tilbakestilling av den samme kontoen kom imellom.
 */
import { brukerIdFelt, endepunkt } from '../_edge/kontekst.ts'
import { kontofunksjon, settMidlertidigPassord } from '../_edge/kontooperasjoner.ts'

Deno.serve(
  endepunkt(async ({ kropp, innlogget, admin }) => {
    const brukerId = brukerIdFelt(kropp)
    const parter = { aktor: innlogget.id, mal: brukerId }

    // Reserverer kontoen: bare én tilbakestilling av den kan være i gang.
    const reservasjon = await kontofunksjon<string>(admin, 'kontooperasjon_klarer_passord', parter)
    try {
      const midlertidigPassord = await settMidlertidigPassord(admin, brukerId)
      const brukernavn = await kontofunksjon<string>(admin, 'kontooperasjon_fullfor_passord', {
        ...parter,
        reservasjon,
      })
      return { brukernavn, midlertidigPassord }
    } catch (feil) {
      // Passordet ble ikke byttet eller ikke gitt ut: la en ny tilbakestilling
      // starte med en gang. Går frigivelsen galt, er reservasjonen ute av seg selv.
      await admin.rpc('kontooperasjon_frigi_passord', { ...parter, reservasjon })
      throw feil
    }
  }),
)
