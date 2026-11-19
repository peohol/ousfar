/*
 * Tjenestearbeideren for varslene om nye chatmeldinger (docs/chatvarsler.md).
 *
 * Den gjør bare to ting: viser et varsel som kommer fra push-tjenesten, og
 * åpner samtalen når brukeren trykker på det. Den mellomlagrer ingenting og
 * svarer ikke på noen forespørsler, så appen lastes som før.
 *
 * Varselet er kryptert for denne nettleseren og har bare tittel, tekst,
 * adressen til samtalen og et merke (`supabase/functions/_delt/chatvarsel.ts`).
 * Er appen åpen og i bruk i et vindu, vises det ikke: chatknappen viser da de
 * uleste. Safari krever at hvert varsel vises, så der vises det alltid.
 */

/** Adressene et varsel kan åpne: chatten, med eller uten en samtale. */
const CHATSTI = /^#\/chat(\/(gruppe|direkte)\/[0-9a-f-]{36})?$/i

/** Det appen lytter etter (`src/chatvarsler/enhet.ts`). */
const MELDING = 'ousfar-chatvarsel-apne'

const ikon = new URL('ikon-192.png', self.registration.scope).href

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (hendelse) => hendelse.waitUntil(self.clients.claim()))

function lesVarsel(data) {
  try {
    const v = data && data.json()
    if (v && typeof v.tittel === 'string' && typeof v.tekst === 'string' && CHATSTI.test(v.sti)) {
      return { tittel: v.tittel, tekst: v.tekst, sti: v.sti, merke: typeof v.merke === 'string' ? v.merke : 'chat' }
    }
  } catch {
    // Ukjent innhold: varselet under sier bare at det er noe nytt.
  }
  return { tittel: 'OUSFAR', tekst: 'Ny melding i chatten', sti: '#/chat', merke: 'chat' }
}

const erSafari = () => /Safari\//.test(navigator.userAgent) && !/Chrom(e|ium)\/|Android/.test(navigator.userAgent)

async function appenErIBruk() {
  const vinduer = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  return vinduer.some((v) => v.focused && v.visibilityState === 'visible')
}

async function vis(hendelse) {
  const varsel = lesVarsel(hendelse.data)
  if (!erSafari() && (await appenErIBruk())) return
  await self.registration.showNotification(varsel.tittel, {
    body: varsel.tekst,
    tag: varsel.merke,
    renotify: true,
    icon: ikon,
    badge: ikon,
    data: { sti: varsel.sti },
  })
}

self.addEventListener('push', (hendelse) => hendelse.waitUntil(vis(hendelse)))

/** Åpner samtalen: i et vindu med appen som alt er åpent, ellers i et nytt. */
async function apne(sti) {
  const trygg = CHATSTI.test(sti) ? sti : '#/chat'
  const adresse = new URL(self.registration.scope)
  adresse.hash = trygg
  const vinduer = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  const vindu = vinduer.find((v) => new URL(v.url).origin === adresse.origin)
  if (vindu) {
    vindu.postMessage({ type: MELDING, sti: trygg })
    return vindu.focus()
  }
  return self.clients.openWindow(adresse.href)
}

self.addEventListener('notificationclick', (hendelse) => {
  hendelse.notification.close()
  hendelse.waitUntil(apne(hendelse.notification.data && hendelse.notification.data.sti))
})
