/**
 * Nettleserkontrollen av varslene om nye chatmeldinger (docs/chatvarsler.md)
 * i det lokale testmiljøet (docs/qa-testmiljo.md), med de syntetiske kontoene
 * `qa-chat-ada` og `qa-chat-bo`:
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/chatvarslernettleser.ts
 *
 * Det lokale miljøet har ingen Edge-funksjoner, så kallene til `chatvarsel`
 * besvares i nettleseren med en nøkkel laget her. Push-tjenesten nås ikke
 * herfra: abonnementet hos den lages i nettleseren av skriptet, og varselet
 * leveres rett til tjenestearbeideren gjennom DevTools, slik nettleseren gjør
 * når det kommer fra push-tjenesten. Krypteringen og sendingen er prøvd i
 * `chatvarsler.test.ts` og `chatvarsler.webpush.test.ts`.
 *
 * Punktene: bryteren står av i Innstillinger → Chat; å slå på lagrer
 * abonnementet; en ny direktemelding legges i køen og gir varsel til Ada; hver
 * push viser et varsel, også mens appen er i bruk, med tittel og tekst uten
 * meldingen; trykk åpner samtalen i vinduet som er åpent; mobil og
 * mørkt tema; utlogging sletter abonnementet.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomBytes, webcrypto } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { internAuthAdresse } from '@delt/brukernavn'
import { chatvarselinnhold } from '@delt/chatvarsel'
import { lokalSql, sikreTestkonto, slaPaFunksjoner, startLokalDatabase, type Status } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Side = any
const logg = (t: string) => console.log(`[chatvarsler] ${t}`)
const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

async function klient(s: Status, brukernavn: string, passord: string): Promise<SupabaseClient> {
  const k = createClient(s.API_URL, s.PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await k.auth.signInWithPassword({ email: internAuthAdresse(brukernavn), password: passord })
  if (error) throw error
  return k
}
async function rpc<T>(k: SupabaseClient, navn: string, a: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await k.rpc(navn, a)
  if (error) throw new Error(`${navn}: ${error.message}`)
  return data as T
}

const utfall: { punkt: string; ok: boolean; merknad: string }[] = []
const mappe = process.env.QA_SKJERMBILDER
if (mappe) mkdirSync(mappe, { recursive: true })
async function bilde(side: Side, navn: string) {
  if (mappe) await side.screenshot({ path: join(mappe, `${navn}.png`) }).catch(() => undefined)
}
async function punkt(kode: string, arbeid: () => Promise<string | void>) {
  logg(kode)
  try {
    const m = (await arbeid()) ?? ''
    utfall.push({ punkt: kode, ok: true, merknad: m })
    logg(`  ok ${m}`)
  } catch (e) {
    const m = e instanceof Error ? e.message.split('\n')[0]! : String(e)
    utfall.push({ punkt: kode, ok: false, merknad: m })
    logg(`  FEIL ${m}`)
  }
}
function krev(b: unknown, hva: string): asserts b {
  if (!b) throw new Error(hva)
}
async function innen(ms: number, hva: string, sjekk: () => Promise<boolean>) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (await sjekk().catch(() => false)) return Date.now() - start
    await vent(250)
  }
  throw new Error(`Ikke innen ${ms / 1000} s: ${hva}`)
}

const s = await startLokalDatabase()
const pw = { ada: randomBytes(18).toString('base64url'), bo: randomBytes(18).toString('base64url') }
const adaId = await sikreTestkonto(s, 'qa-chat-ada', pw.ada, ['Ada', 'Testesen'])
const boId = await sikreTestkonto(s, 'qa-chat-bo', pw.bo, ['Bo', 'Prøvesen'])
const begge = `('${adaId}', '${boId}')`
lokalSql(s, `delete from public.pushabonnementer where bruker_id in ${begge}; delete from intern.chatvarselko where avsender in ${begge};
  delete from public.direktemelding_blokkeringer where blokkerer in ${begge};
  delete from public.direktesamtaler where bruker_lav in ${begge} and bruker_hoy in ${begge};`)
const tilbakestillBrytere = slaPaFunksjoner(s, 'gruppechat_aktivert', 'direktemeldinger_aktivert')

// VAPID-nøkkelen Edge-funksjonen ville gitt.
const par = (await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as CryptoKeyPair
const offentlig = Buffer.from(await webcrypto.subtle.exportKey('raw', par.publicKey)).toString('base64url')

// Det hodeløse skallet svarer «denied» på varsler, uansett tillatelse.
const miljo = await apneTestmiljo({ helChromium: true })
try {
  const adaK = await klient(s, 'qa-chat-ada', pw.ada)
  const boK = await klient(s, 'qa-chat-bo', pw.bo)
  for (const k of [adaK, boK]) await rpc(k, 'sett_chatvalg', { tillat: true, vis_aktiv: null })
  const samtale = await rpc<string>(adaK, 'aapne_direktesamtale', { mottaker: boId })

  const ada: Side = await miljo.brukerside('qa-chat-ada', pw.ada, { viewport: { width: 1440, height: 900 } })
  const kontekst = ada.context()
  await kontekst.grantPermissions(['notifications'])
  const kall: string[] = []
  await kontekst.route('**/functions/v1/chatvarsel', async (route: Side) => {
    const kropp = route.request().postDataJSON() as { handling?: string }
    kall.push(kropp.handling ?? 'send')
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(kropp.handling === 'nokkel' ? { nokkel: offentlig } : { sendt: 0 }) })
  })

  // Push-tjenesten (FCM) kan ikke nås fra testmiljøet, og Chromium avviser da
  // abonnementet. Abonnementet lages derfor her, med ekte nøkler, og huskes i
  // det lokale lageret slik nettleseren husker sitt.
  const ua = (await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  const falskt = {
    endepunkt: `https://fcm.googleapis.com/fcm/send/qa-${randomBytes(8).toString('hex')}`,
    p256dh: [...new Uint8Array(await webcrypto.subtle.exportKey('raw', ua.publicKey))],
    auth: [...randomBytes(16)],
  }
  await kontekst.addInitScript((f: typeof falskt) => {
    const NOKKEL = 'qa-pushabonnement'
    const lag = (lagret: { nokkel: number[] }) => ({
      endpoint: f.endepunkt,
      options: { applicationServerKey: new Uint8Array(lagret.nokkel).buffer, userVisibleOnly: true },
      getKey: (navn: string) => new Uint8Array(navn === 'auth' ? f.auth : f.p256dh).buffer,
      unsubscribe: async () => {
        localStorage.removeItem(NOKKEL)
        return true
      },
    })
    PushManager.prototype.getSubscription = async function () {
      const lagret = localStorage.getItem(NOKKEL)
      return (lagret ? lag(JSON.parse(lagret)) : null) as unknown as PushSubscription
    }
    PushManager.prototype.subscribe = async function (valg?: PushSubscriptionOptionsInit) {
      const nokkel = [...new Uint8Array(valg!.applicationServerKey as ArrayBuffer)]
      localStorage.setItem(NOKKEL, JSON.stringify({ nokkel }))
      return lag({ nokkel }) as unknown as PushSubscription
    }
  }, falskt)
  await ada.reload()

  async function aapneChatfanen(side: Side) {
    await side.goto(`${miljo.url}/#/`)
    await side.getByRole('button', { name: /^Kontoen din/ }).click({ timeout: 30_000 })
    await side.getByRole('button', { name: 'Innstillinger' }).click()
    const vindu = side.getByRole('dialog', { name: 'Innstillinger' })
    await vindu.getByRole('tab', { name: 'Chat' }).click()
    return vindu
  }
  const bryter = (vindu: Side) => vindu.getByRole('switch', { name: /Varsler på denne enheten/ })

  await punkt('V1 bryteren står av i Innstillinger → Chat, over de andre chatvalgene', async () => {
    const vindu = await aapneChatfanen(ada)
    await bryter(vindu).waitFor({ timeout: 15_000 })
    await bilde(ada, '01-innstillinger-av-pc')
    krev(!(await bryter(vindu).isChecked()), 'står på')
    const tekst = await vindu.locator('.chatvarslervalg').textContent()
    krev(tekst?.includes('Ingen varsler om nye meldinger på denne enheten.'), `forklaringen: ${tekst}`)
  })

  await punkt('V2 å slå på registrerer tjenestearbeideren og lagrer abonnementet', async () => {
    const vindu = ada.getByRole('dialog', { name: 'Innstillinger' })
    await bryter(vindu).click({ force: true })
    await innen(20_000, 'på eller feil', async () => (await bryter(vindu).isChecked()) || (await vindu.locator('.skjemafeil').count()) > 0)
    const feil = await vindu.locator('.skjemafeil').textContent().catch(() => null)
    krev(await bryter(vindu).isChecked(), `ikke på: ${feil ?? 'ukjent'}`)
    krev(kall.includes('nokkel'), 'hentet ikke nøkkelen')
    const rad = lokalSql(s, `select count(*) from public.pushabonnementer where bruker_id = '${adaId}'`)
    krev(rad === '1', `abonnementer: ${rad}`)
    await bilde(ada, '02-innstillinger-pa-pc')
    await ada.keyboard.press('Escape')
    return lokalSql(s, `select split_part(endepunkt, '/', 3) from public.pushabonnementer where bruker_id = '${adaId}'`)
  })

  await punkt('V3 en ny direktemelding legges i køen, og varselet til Ada har verken tekst eller avsender', async () => {
    await rpc(boK, 'send_direktemelding', { samtale, klient_id: crypto.randomUUID(), tekst: 'Syntetisk hemmelig tekst' })
    krev(lokalSql(s, `select count(*) from intern.chatvarselko where avsender = '${boId}'`) === '1', 'ikke i køen')
    const varsler = lokalSql(s, `select public.chatvarsel_hent('${boId}')::text`)
    const lest = JSON.parse(varsler) as { slag: string; samtale: string; uleste: number; gruppenavn: string | null }[]
    krev(lest.length === 1 && lest[0]!.slag === 'direkte' && lest[0]!.samtale === samtale && lest[0]!.uleste === 1, varsler)
    krev(!varsler.includes('Syntetisk') && !varsler.includes('Bo'), 'tekst eller navn i varselet')
    krev(lokalSql(s, `select count(*) from intern.chatvarselko where avsender = '${boId}'`) === '0', 'køen ble ikke tømt')
  })

  // Varselet slik tjenestearbeideren får det fra push-tjenesten (dekryptert).
  const innhold = chatvarselinnhold({ slag: 'direkte', samtale, gruppenavn: null, uleste: 1 })
  const cdp = await kontekst.newCDPSession(ada)
  const registreringer: { registrationId: string; scopeURL: string }[] = []
  cdp.on('ServiceWorker.workerRegistrationUpdated', (h: { registrations: { registrationId: string; scopeURL: string }[] }) =>
    registreringer.push(...h.registrations),
  )
  await cdp.send('ServiceWorker.enable')
  await innen(10_000, 'registreringen', async () => registreringer.some((r) => r.scopeURL.startsWith(miljo.url)))
  const registrering = registreringer.find((r) => r.scopeURL.startsWith(miljo.url))!
  const lever = () =>
    cdp.send('ServiceWorker.deliverPushMessage', { origin: new URL(miljo.url).origin, registrationId: registrering.registrationId, data: JSON.stringify(innhold) })
  const arbeider = () => kontekst.serviceWorkers().find((w: Side) => w.url().endsWith('/chatvarsler.js'))
  const synlige = async () =>
    (await arbeider().evaluate(async () => {
      const r = (globalThis as unknown as { registration: ServiceWorkerRegistration }).registration
      return (await r.getNotifications()).map((n) => ({ tittel: n.title, tekst: n.body, merke: n.tag, sti: (n.data as { sti?: string })?.sti }))
    })) as { tittel: string; tekst: string; merke: string; sti: string }[]

  await punkt('V4 hver push viser et varsel, også mens appen er i bruk (userVisibleOnly)', async () => {
    await ada.bringToFront()
    await lever()
    await innen(5_000, 'varselet', async () => (await synlige()).length > 0)
    await arbeider().evaluate(async () => {
      const r = (globalThis as unknown as { registration: ServiceWorkerRegistration }).registration
      for (const n of await r.getNotifications()) n.close()
    })
  })

  await punkt('V5 med appen i bakgrunnen vises varselet, med tittel og tekst uten meldingen', async () => {
    const annen: Side = await kontekst.newPage()
    await annen.goto('about:blank')
    await annen.bringToFront()
    await lever()
    await innen(5_000, 'varselet', async () => (await synlige()).length > 0)
    const [v] = await synlige()
    krev(v!.tittel === 'Direktemelding' && v!.tekst === 'Du har fått en ny direktemelding', JSON.stringify(v))
    krev(v!.sti === `#/chat/direkte/${samtale}` && v!.merke === `chat:direkte:${samtale}`, JSON.stringify(v))
    await annen.close()
    return `«${v!.tittel}: ${v!.tekst}»`
  })

  await punkt('V6 trykk på varselet åpner samtalen i vinduet som er åpent', async () => {
    await ada.goto(`${miljo.url}/#/`)
    await ada.getByRole('button', { name: /^Kontoen din/ }).waitFor({ timeout: 30_000 })
    // Det tjenestearbeideren gjør ved et trykk; å gi fokus krever et ekte trykk og kan avvises her.
    await arbeider()
      .evaluate((sti: string) => (globalThis as unknown as { apne: (s: string) => Promise<unknown> }).apne(sti), innhold.sti)
      .catch(() => undefined)
    await innen(10_000, 'adressen', async () => (await ada.evaluate(() => location.hash)) === innhold.sti)
    await ada.getByRole('main', { name: 'Grupper og samtaler' }).getByText('Syntetisk hemmelig tekst').waitFor({ timeout: 20_000 })
    await bilde(ada, '03-samtalen-apnet-pc')
  })

  await punkt('V7 mobil og mørkt tema', async () => {
    const mobil: Side = await miljo.brukerside('qa-chat-bo', pw.bo, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    const vindu = await aapneChatfanen(mobil)
    await bryter(vindu).waitFor({ timeout: 15_000 })
    await bilde(mobil, '04-innstillinger-mobil')
    await mobil.emulateMedia({ colorScheme: 'dark' })
    await bilde(mobil, '05-innstillinger-mobil-moerkt')
  })

  await punkt('V8 utlogging sletter abonnementet', async () => {
    await ada.goto(`${miljo.url}/#/`)
    await ada.getByRole('button', { name: /^Kontoen din/ }).click({ timeout: 30_000 })
    await ada.getByRole('button', { name: /Logg ut/ }).click()
    await ada.locator('input[name=username]').waitFor({ timeout: 20_000 })
    const igjen = lokalSql(s, `select count(*) from public.pushabonnementer where bruker_id = '${adaId}'`)
    krev(igjen === '0', `abonnementer igjen: ${igjen}`)
  })
} finally {
  lokalSql(s, `delete from public.pushabonnementer where bruker_id in ${begge}`)
  tilbakestillBrytere()
  await miljo.avslutt()
  console.log('\nRESULTAT')
  for (const u of utfall) console.log(`${u.ok ? 'OK  ' : 'FEIL'} ${u.punkt} ${u.merknad}`)
  process.exit(utfall.every((u) => u.ok) ? 0 : 1)
}
