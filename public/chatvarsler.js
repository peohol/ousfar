/*
 * Tjenestearbeideren for varslene på enheten: om nye chatmeldinger
 * (docs/chatvarsler.md) og for de andre formålene (docs/enhetsvarsler.md).
 * Navnet er fra den gang den bare viste chatvarsler.
 *
 * Den gjør bare to ting: viser et varsel som kommer fra push-tjenesten, og
 * åpner adressen i appen når brukeren trykker på det. Den mellomlagrer ingenting og
 * svarer ikke på noen forespørsler, så appen lastes som før.
 *
 * Varselet er kryptert for denne nettleseren og har bare tittel, tekst,
 * adressen i appen og et merke (`supabase/functions/_delt/enhetsvarsel.ts`).
 * Hver push viser et varsel: abonnementet er laget med `userVisibleOnly`, og
 * nettlesere som ikke får se et varsel, viser sitt eget eller slutter å levere.
 * Har mottakeren alt lest meldingen, sendes det ikke noe.
 */

/** Adressene et varsel kan åpne: en adresse i appen (`VARSELSTI` og `MAKS_STI` i `_delt/enhetsvarsel.ts`). */
const STI = /^#\/[A-Za-z0-9_./-]*$/
const MAKS_STI = 300
const erSti = (sti) => typeof sti === 'string' && sti.length <= MAKS_STI && STI.test(sti)

/** Det appen lytter etter (`src/chatvarsler/enhet.ts`). */
const MELDING = 'ousfar-chatvarsel-apne'

const ikon = new URL('ikon-192.png', self.registration.scope).href

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (hendelse) => hendelse.waitUntil(self.clients.claim()))

function lesVarsel(data) {
  try {
    const v = data && data.json()
    if (v && typeof v.tittel === 'string' && typeof v.tekst === 'string' && erSti(v.sti)) {
      return { tittel: v.tittel, tekst: v.tekst, sti: v.sti, merke: typeof v.merke === 'string' ? v.merke : 'ousfar' }
    }
  } catch {
    // Ukjent innhold: varselet under sier bare at det er noe nytt.
  }
  return { tittel: 'OUSFAR', tekst: 'Du har et nytt varsel', sti: '#/', merke: 'ousfar' }
}

async function vis(hendelse) {
  const varsel = lesVarsel(hendelse.data)
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

XX
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
