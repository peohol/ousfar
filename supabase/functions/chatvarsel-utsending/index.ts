/**
 * Utsendingen av varslene om nye chatmeldinger (docs/chatvarsler.md).
 *
 * Kalles bare av databasen: utløseren på en ny melding ber om utsendingen med
 * pg_net etter at meldingen er lagret (`intern.chatvarsel_vekk`), med den
 * hemmelige nøkkelen i hodet `x-chatvarsel-utloser`. Uten den svarer
 * funksjonen 401 før noe annet skjer. Kallet har ingen innhold; hvem som får
 * varsel og hva det står, avgjøres i databasen (`chatvarsel_hent`).
 *
 * Funksjonen svarer med en gang og sender i bakgrunnen: den venter først litt,
 * så en mottaker som har samtalen åpen, rekker å lese (`chatvarsel_ventetid`),
 * og prøver igjen etter en midlertidig feil (`sendChatvarsler`).
 */
import { createClient } from 'npm:@supabase/supabase-js@2'
import { erUtloser, sendChatvarsler, UTLOSER_HODE, UTLOSER_MILJO, vapidFraMiljo } from '../_edge/chatvarsler.ts'

/** Litt lenger enn `intern.chatvarsel_ventetid()`. */
const VENT_MS = 2000

declare const EdgeRuntime: { waitUntil(arbeid: Promise<unknown>): void } | undefined

Deno.serve(async (request) => {
  if (!erUtloser(request.headers.get(UTLOSER_HODE), Deno.env.get(UTLOSER_MILJO))) {
    return Response.json({ feil: 'Ikke tillatt.' }, { status: 401 })
  }
  if (request.method !== 'POST') return Response.json({ feil: 'Ukjent forespørsel.' }, { status: 405 })

  const nokler = vapidFraMiljo((navn) => Deno.env.get(navn))
  const adresse = Deno.env.get('SUPABASE_URL')
  const hemmelig = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const kontakt = Deno.env.get('CHATVARSEL_KONTAKT') ?? adresse
  if (!nokler || !adresse || !hemmelig || !kontakt) {
    return Response.json({ feil: 'Varsler er ikke satt opp ennå.' }, { status: 503 })
  }

  const db = createClient(adresse, hemmelig, { auth: { persistSession: false, autoRefreshToken: false } })
  const arbeid = (async () => {
    await new Promise((ferdig) => setTimeout(ferdig, VENT_MS))
    const utfall = await sendChatvarsler({ db, nokler, kontakt })
    console.log('Chatvarsler:', JSON.stringify(utfall))
  })().catch((feil: unknown) => console.error('Chatvarsler feilet:', feil instanceof Error ? feil.message : String(feil)))

  if (typeof EdgeRuntime !== 'undefined') {
    EdgeRuntime.waitUntil(arbeid)
    return Response.json({ ok: true }, { status: 202 })
  }
  await arbeid
  return Response.json({ ok: true })
})
