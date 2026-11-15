/**
 * «Opprett bruker» — den eneste veien inn i OUSFAR.
 *
 * En systemarkitekt, eller en lokal administrator i fagmiljøet, oppgir et
 * brukernavn og fagmiljøet kontoen skal høre til (uten fagmiljø gjelder
 * standardfagmiljøet, for en eldre versjon av appen). Myndigheten i
 * fagmiljøet avgjøres i databasen når brukernavnet klareres
 * (`reserverBrukernavn`), og på nytt når kontoen opprettes; den gamle
 * adminrollen gir ingen. Kontoen blir en vanlig bruker med primærmedlemskap i
 * fagmiljøet, og får et generert midlertidig passord som returneres én gang,
 * og som brukeren må bytte ved første innlogging. Det sendes ingen e-post;
 * den interne Auth-adressen er en teknisk nøkkel utledet av brukernavnet.
 *
 * Feiler noe før Auth-brukeren finnes, trekkes denne klareringen tilbake
 * (med nøkkelen sin, så et nyere forsøk står). Auth-
 * brukeren, profilen og medlemskapet blir til i én transaksjon i databasen;
 * mangler noe av det likevel etterpå, slettes kontoen igjen, så ingen konto
 * blir liggende halvferdig.
 */
import { brukernavnFeil, internAuthAdresse, normaliserBrukernavn } from '../_delt/brukernavn.ts'
import { genererMidlertidigPassord } from '../_delt/passord.ts'
import { Avvist, endepunkt, tekstfelt, valgfriIdFelt } from '../_edge/kontekst.ts'
import { frigiBrukernavn, reserverBrukernavn } from '../_edge/kontooperasjoner.ts'

Deno.serve(
  endepunkt(async ({ kropp, innlogget, admin }) => {
    const brukernavn = normaliserBrukernavn(tekstfelt(kropp, 'brukernavn'))
    const feil = brukernavnFeil(brukernavn)
    if (feil) throw new Avvist(feil)
    const onsket = valgfriIdFelt(kropp, 'fagmiljo', 'Ukjent fagmiljø.')

    // Klareringen triggeren i databasen krever, som også avgjør om den
    // innloggede har myndighet til å opprette brukere i fagmiljøet. Den legges
    // inn først, slik at ingen uten myndighet får vite noe om brukernavnene,
    // og trekkes tilbake igjen dersom kontoen ikke blir noe av.
    const { fagmiljo, reservasjon } = await reserverBrukernavn(admin, innlogget.id, brukernavn, onsket)
    const frigi = () => frigiBrukernavn(admin, brukernavn, reservasjon)

    // Den unike indeksen i databasen er den endelige sperren; dette oppslaget
    // er her for å kunne si tydelig fra før kontoen forsøkes opprettet.
    const { data: finnes, error: oppslagsfeil } = await admin
      .from('profiles')
      .select('id')
      .eq('username', brukernavn)
      .maybeSingle()
    if (oppslagsfeil || finnes) await frigi()
    if (oppslagsfeil) throw oppslagsfeil
    if (finnes) throw new Avvist('Brukernavnet er allerede i bruk.', 409)

    const midlertidigPassord = genererMidlertidigPassord()

    const { data: opprettet, error: opprettelsesfeil } = await admin.auth.admin.createUser({
      email: internAuthAdresse(brukernavn),
      password: midlertidigPassord,
      // Ingen bekreftelse skal sendes eller ventes på — adressen er intern.
      email_confirm: true,
    })

    if (opprettelsesfeil) {
      await frigi()
      const melding = opprettelsesfeil.message.toLowerCase()
      if (melding.includes('already') || melding.includes('registered')) {
        throw new Avvist('Brukernavnet er allerede i bruk.', 409)
      }
      throw opprettelsesfeil
    }

    const nyId = opprettet.user?.id
    if (!nyId) throw new Error('Auth opprettet ingen bruker')

    // Triggeren `paa_ny_auth_bruker` har laget profilen og medlemskapet i
    // fagmiljøet (medlemskapet krever profilen). Mangler det likevel, er
    // kontoen ubrukelig eller i feil fagmiljø — da ryddes den heller bort enn
    // å bli liggende igjen.
    const { data: medlemskap, error: kontrollfeil } = await admin
      .from('medlemskap')
      .select('id')
      .eq('bruker_id', nyId)
      .eq('fagmiljo_id', fagmiljo.id)
      .eq('status', 'aktiv')
      .eq('primaer', true)
      .maybeSingle()

    if (kontrollfeil || !medlemskap) {
      await admin.auth.admin.deleteUser(nyId)
      throw new Error('Profilen og medlemskapet ble ikke opprettet sammen med kontoen')
    }

    return { brukernavn, midlertidigPassord, fagmiljo }
  }),
)
