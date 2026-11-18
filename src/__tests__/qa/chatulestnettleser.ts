/**
 * Nettleserkontrollen av D4b (docs/gruppechat.md, «Den gamle chatsiden» og
 * «Uleste») i det lokale testmiljøet (docs/qa-testmiljo.md): chatten er borte
 * fra gruppesiden, den gamle adressen åpner samtalen i chatmenyen, og uleste
 * chatmeldinger står på chatboblen og chatknappen, ikke i bjella. Syntetiske
 * kontoer `qa-chat-ada` og `qa-chat-bo`, med bryteren for chatten på mens den går:
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/chatulestnettleser.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { internAuthAdresse } from '@delt/brukernavn'
import { sikreAdministrator, sikreTestkonto, startLokalDatabase, type Status } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Side = any
const logg = (t: string) => console.log(`[chat ut av bjella] ${t}`)
const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

function settBryter(s: Status, pa: boolean) {
  const sql = `create or replace function intern.gruppechat_aktivert() returns boolean language sql stable set search_path = '' as $$ select ${pa} $$;`
  const r = spawnSync('psql', [s.DB_URL!, '-v', 'ON_ERROR_STOP=1', '-qc', sql], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(r.stderr)
}
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
/** Siden et punkt sist arbeidet på; den tas bilde av når punktet feiler. */
let sist: Side = null
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
    if (sist) await bilde(sist, `feil-${kode.split(' ')[0]}`)
  }
}
function krev(b: unknown, hva: string): asserts b {
  if (!b) throw new Error(hva)
}
async function innen(ms: number, hva: string, sjekk: () => Promise<boolean>) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (await sjekk().catch(() => false)) return Date.now() - start
    await vent(200)
  }
  throw new Error(`Ikke innen ${ms / 1000} s: ${hva}`)
}

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const pw = { ada: randomBytes(18).toString('base64url'), bo: randomBytes(18).toString('base64url') }
await sikreTestkonto(s, 'qa-chat-ada', pw.ada, ['Ada', 'Testesen'])
const boId = await sikreTestkonto(s, 'qa-chat-bo', pw.bo, ['Bo', 'Prøvesen'])
settBryter(s, true)
const miljo = await apneTestmiljo()
try {
  const admin = await klient(s, 'qa-admin', adminpassord)
  const adaK = await klient(s, 'qa-chat-ada', pw.ada)
  const boK = await klient(s, 'qa-chat-bo', pw.bo)
  const navn = `Syntetisk D4b ${new Date().toISOString().slice(11, 19)}`
  const gruppe = await rpc<string>(admin, 'opprett_gruppe', { navn, beskrivelse: 'Nettleserkontroll (syntetisk).', fagmiljo: null })
  for (const b of ['qa-chat-ada', 'qa-chat-bo']) await rpc(admin, 'inviter_til_gruppe', { gruppe, brukernavn: b })
  await rpc(adaK, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  await rpc(boK, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  const send = (k: SupabaseClient, tekst: string) => rpc(k, 'send_gruppemelding', { gruppe, klient_id: crypto.randomUUID(), tekst })
  const uleste = async (k: SupabaseClient) =>
    (await rpc<{ samhandling: { chat_uleste: number } }>(k, 'gruppeoversikt', { gruppe })).samhandling.chat_uleste
  const ulesteVarsler = async (k: SupabaseClient) => rpc<Record<string, number>>(k, 'uleste_varsler')

  const ada: Side = await miljo.brukerside('qa-chat-ada', pw.ada, { viewport: { width: 1440, height: 900 } })
  const boble = ada.locator('.chatboble')
  const menyen = ada.getByRole('complementary', { name: 'Grupper og samtaler' })
  const bjella = ada.getByRole('button', { name: /^Varsler/ }).first()
  /**
   * Lukker menyen om den står åpen (den huskes per konto og hentes etter at
   * siden står, så det ventes litt først). Boblen står inne i menyen.
   */
  const lukkMenyen = async () => {
    const panel = ada.locator('.chatpanel')
    await boble.or(panel).first().waitFor({ timeout: 30_000 })
    await vent(2000)
    if (await panel.isVisible()) await menyen.getByRole('button', { name: 'Lukk chatten' }).click()
    await boble.waitFor({ timeout: 10_000 })
  }

  sist = ada
  let bjelleFor = ''
  await punkt('E0 forsiden med chatboblen', async () => {
    await ada.goto(`${miljo.url}/#/`)
    await lukkMenyen()
    bjelleFor = (await bjella.getAttribute('aria-label')) ?? ''
  })

  await punkt('E1 boblen teller chatten, bjella gjør det ikke', async () => {
    await send(boK, 'Syntetisk én')
    await send(boK, 'Syntetisk to')
    await innen(20_000, 'boblen viser 2 uleste', async () => (await boble.getAttribute('aria-label'))?.includes('2 uleste meldinger') ?? false)
    krev(!('gruppechat' in (await ulesteVarsler(adaK))), 'databasen teller ingen chatvarsler')
    await vent(1500)
    const bjelleEtter: string = (await bjella.getAttribute('aria-label')) ?? ''
    krev(bjelleEtter === bjelleFor, `bjella er uendret («${bjelleFor}» → «${bjelleEtter}»)`)
    await bjella.click()
    const vindu = ada.getByRole('dialog', { name: 'Varsler' })
    await vindu.waitFor({ timeout: 10_000 })
    krev((await vindu.getByText(navn).count()) === 0, 'vinduet nevner ikke gruppechatten')
    await bilde(ada, '01-bjella-uten-chat-pc')
    await ada.keyboard.press('Escape')
    await bilde(ada, '02-boble-med-uleste-pc')
  })

  await punkt('E2 gruppesiden har ingen chat; «Åpne chat» åpner menyen uten å merke lest før samtalen vises', async () => {
    await ada.goto(`${miljo.url}/#/grupper/${gruppe}`)
    const panel = ada.getByRole('region', { name: 'Gruppechat' })
    await panel.waitFor({ timeout: 20_000 })
    krev((await ada.locator('.gruppeside').getByRole('log').count()) === 0, 'ingen chat på gruppesiden')
    krev((await panel.getByRole('link').count()) === 0, 'ingen lenke til en chatside')
    const adresse = ada.url()
    await lukkMenyen()
    // Å åpne bare menyen merker ingenting lest.
    await boble.click()
    await menyen.getByRole('region', { name: 'Samtaler' }).waitFor()
    await vent(2000)
    krev((await uleste(adaK)) === 2, 'menyen alene merker ingenting lest')
    await menyen.getByRole('button', { name: 'Lukk chatten' }).click()
    await panel.getByRole('button', { name: 'Åpne chat' }).click()
    await menyen.getByRole('log', { name: `Meldinger i ${navn}` }).waitFor({ timeout: 10_000 })
    krev(ada.url() === adresse, `siden står (${ada.url()})`)
    await innen(10_000, 'lest når samtalen vises', async () => (await uleste(adaK)) === 0)
    await innen(10_000, 'tallet i panelet følger med', async () => /Ingen uleste/.test(await panel.innerText()))
    await bilde(ada, '03-gruppeside-chat-i-menyen-pc')
  })

  await punkt('E3 den gamle adressen åpner samtalen i menyen og skrives om uten ny historikk', async () => {
    await menyen.getByRole('button', { name: 'Lukk chatten' }).click()
    await ada.goto(`${miljo.url}/#/`)
    await boble.waitFor()
    await ada.goto(`${miljo.url}/#/grupper/${gruppe}/chat`)
    await innen(10_000, 'adressen skrevet om', async () => ada.url().endsWith(`#/grupper/${gruppe}`))
    await menyen.getByRole('log', { name: `Meldinger i ${navn}` }).waitFor({ timeout: 10_000 })
    await ada.getByRole('heading', { level: 1, name: navn }).waitFor()
    await bilde(ada, '04-gammel-adresse-pc')
    await ada.goBack()
    await innen(10_000, 'tilbake til forsiden', async () => /#\/$/.test(ada.url()))
  })

  await punkt('E4 lastet rett på den gamle adressen (ny fane), også i mørkt tema', async () => {
    const ny: Side = await miljo.brukerside('qa-chat-ada', pw.ada, { viewport: { width: 1440, height: 900 }, colorScheme: 'dark' })
    await ny.goto(`${miljo.url}/#/grupper/${gruppe}/chat`)
    await ny.getByRole('complementary', { name: 'Grupper og samtaler' }).getByRole('log').waitFor({ timeout: 30_000 })
    krev(ny.url().endsWith(`#/grupper/${gruppe}`), `adressen ${ny.url()}`)
    await bilde(ny, '05-gammel-adresse-pc-moerkt')
    await ny.close()
  })

  const mobil: Side = await miljo.brukerside('qa-chat-bo', pw.bo, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  sist = mobil
  await punkt('E5 mobil: chatknappen teller, bjella ikke; den gamle adressen åpner chatten over siden', async () => {
    await send(adaK, 'Syntetisk til Bo')
    await mobil.goto(`${miljo.url}/#/`)
    const knapp = mobil.locator('.chatknapp button')
    await knapp.waitFor({ timeout: 30_000 })
    await innen(20_000, 'chatknappen viser uleste', async () => /\d+ ulest/.test((await knapp.getAttribute('aria-label')) ?? ''))
    const bjelle: string = (await mobil.getByRole('button', { name: /^Varsler/ }).first().getAttribute('aria-label')) ?? ''
    krev(!('gruppechat' in (await ulesteVarsler(boK))), `bjella teller ikke chatten («${bjelle}»)`)
    await bilde(mobil, '06-chatknapp-mobil')
    await mobil.goto(`${miljo.url}/#/grupper/${gruppe}/chat`)
    const m = mobil.getByRole('complementary', { name: 'Grupper og samtaler' })
    await m.getByRole('log').waitFor({ timeout: 20_000 })
    krev(mobil.url().endsWith(`#/grupper/${gruppe}`), `adressen ${mobil.url()}`)
    krev((await mobil.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)) === true, 'ingen vannrett rulling')
    await bilde(mobil, '07-gammel-adresse-mobil')
    await mobil.emulateMedia({ colorScheme: 'dark' })
    await bilde(mobil, '08-gammel-adresse-mobil-moerkt')
    await mobil.emulateMedia({ colorScheme: 'light' })
  })

  await punkt('E6 et fjernet medlem ser ingen uleste fra gruppen', async () => {
    await rpc(admin, 'avslutt_gruppemedlemskap', { gruppe, bruker: boId })
    await send(adaK, 'Syntetisk etter fjerningen')
    await mobil.goto(`${miljo.url}/#/`)
    await mobil.reload()
    await vent(3000)
    const knapp = mobil.locator('.chatknapp button')
    const etikett: string = (await knapp.count()) ? ((await knapp.getAttribute('aria-label')) ?? '') : ''
    krev(!/\d+ ulest/.test(etikett), `ingen uleste på chatknappen («${etikett}»)`)
    krev(!('gruppechat' in (await ulesteVarsler(boK))), 'ingen chatvarsler')
    const samtaler = await rpc<{ gruppe: { id: string } }[]>(boK, 'mine_gruppesamtaler')
    krev(!samtaler.some((x) => x.gruppe.id === gruppe), 'gruppen er borte fra samtalene')
  })
} catch (e) {
  // Feiler oppsettet før punktene, skal kjøringen ikke se grønn ut.
  utfall.push({ punkt: 'oppsettet', ok: false, merknad: e instanceof Error ? e.message.split('\n')[0]! : String(e) })
} finally {
  settBryter(s, false)
  await miljo.avslutt()
  console.log('\nRESULTAT')
  for (const u of utfall) console.log(`${u.ok ? 'OK  ' : 'FEIL'} ${u.punkt} ${u.merknad}`)
  process.exit(utfall.every((u) => u.ok) ? 0 : 1)
}
