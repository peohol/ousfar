/**
 * Varslene på enheten om nye chatmeldinger (docs/chatvarsler.md).
 *
 * - `{ handling: 'nokkel' }`: den offentlige VAPID-nøkkelen nettleseren
 *   abonnerer med.
 * - `{ handling: 'send' }` (standard): sender varslene om den innloggedes egne
 *   nye meldinger. Appen kaller den etter at en melding er sendt. Hvem som får
 *   varsel, og at det bare sendes én gang per melding, avgjøres i databasen
 *   (`chatvarsel_hent`); den innloggede kan ikke velge noe av det.
 *
 * Den private nøkkelen ligger bare i miljøet til funksjonen.
 */
import { sendChatvarsler, vapidFraMiljo } from '../_edge/chatvarsler.ts'
import { Avvist, endepunkt } from '../_edge/kontekst.ts'

const IKKE_SATT_OPP = 'Varsler er ikke satt opp ennå.'

Deno.serve(
  endepunkt(async ({ kropp, innlogget, admin }) => {
    const nokler = vapidFraMiljo((navn) => Deno.env.get(navn))
    if (!nokler) throw new Avvist(IKKE_SATT_OPP, 503)

    const handling = kropp.handling ?? 'send'
    if (handling === 'nokkel') return { nokkel: nokler.offentlig }
    if (handling !== 'send') throw new Avvist('Ukjent handling.')

    const kontakt = Deno.env.get('CHATVARSEL_KONTAKT') ?? Deno.env.get('SUPABASE_URL')
    if (!kontakt) throw new Avvist(IKKE_SATT_OPP, 503)
    return await sendChatvarsler({ db: admin, avsender: innlogget.id, nokler, kontakt })
  }),
)
