/**
 * Varslene på enheten om nye chatmeldinger (docs/chatvarsler.md).
 *
 * `{ handling: 'nokkel' }` gir den offentlige VAPID-nøkkelen nettleseren
 * abonnerer med. Utsendingen skjer i `chatvarsel-utsending`, som databasen
 * ber om når en melding er lagret; appen sender ingenting selv.
 *
 * Den private nøkkelen ligger bare i miljøet til funksjonene.
 */
import { vapidFraMiljo } from '../_edge/chatvarsler.ts'
import { Avvist, endepunkt } from '../_edge/kontekst.ts'

Deno.serve(
  endepunkt(async ({ kropp }) => {
    const nokler = vapidFraMiljo((navn) => Deno.env.get(navn))
    if (!nokler) throw new Avvist('Varsler er ikke satt opp ennå.', 503)
    if ((kropp.handling ?? 'nokkel') !== 'nokkel') throw new Avvist('Ukjent handling.')
    return { nokkel: nokler.offentlig }
  }),
)
