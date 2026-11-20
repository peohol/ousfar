/**
 * Nettleserkontrollen av chatmenyen (docs/gruppechat.md, «Chatmenyen») i det
 * lokale testmiljøet (docs/qa-testmiljo.md), med de syntetiske kontoene
 * `qa-chat-ada` og `qa-chat-bo` og bryteren for chatten på mens den går:
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/chatmenynettleser.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { internAuthAdresse } from '@delt/brukernavn'
import { sikreAdministrator, sikreTestkonto, slaPaFunksjoner, startLokalDatabase, type Status } from './lokalmiljo'
import { arkiverTidligereGrupper, lukkChatmenyen } from './kontroll'
import { apneTestmiljo } from './testmiljo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Side = any
const logg = (t: string) => console.log(`[chatmeny] ${t}`)
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
/**
 * Knappene i hjørnet (×, og «Utvid» på brede flater) står på samme linje som
 * den første raden («Mine grupper» eller «Til alle samtaler»), uten å overlappe den.
 */
async function sammeLinje(meny: Side, rad: string) {
  const r = await meny.locator(rad).first().boundingBox()
  const k = await meny.locator('.chatpanel__topp').boundingBox()
  const x = await meny.locator('.chatpanel__lukk').boundingBox()
  krev(r && k && x, `fant ikke ${rad} eller knappene`)
  const midt = (b: { y: number; height: number }) => b.y + b.height / 2
  krev(Math.abs(midt(r) - midt(x)) <= 2, `${rad} står ikke på linje med × (${midt(r)} mot ${midt(x)})`)
  krev(r.x + r.width <= k.x + 1, `${rad} går inn under knappene`)
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
const adaId = await sikreTestkonto(s, 'qa-chat-ada', pw.ada, ['Ada', 'Testesen'])
await sikreTestkonto(s, 'qa-chat-bo', pw.bo, ['Bo', 'Prøvesen'])
const tilbakestillBrytere = slaPaFunksjoner(s, 'gruppechat_aktivert')
const miljo = await apneTestmiljo()
try {
  const admin = await klient(s, 'qa-admin', adminpassord)
  // Grupper fra tidligere kjøringer teller ellers med blant de uleste.
  await arkiverTidligereGrupper(admin, 'Syntetisk ')
  const adaK = await klient(s, 'qa-chat-ada', pw.ada)
  const boK = await klient(s, 'qa-chat-bo', pw.bo)
  const tid = new Date().toISOString().slice(11, 19)
  const sandnavn = `Syntetisk sandkasse ${tid}`
  const fagnavn = `Syntetisk faglig ${tid}`
  const grupper: string[] = []
  for (const navn of [sandnavn, fagnavn]) {
    const g = await rpc<string>(admin, 'opprett_gruppe', { navn, beskrivelse: 'Nettleserkontroll (syntetisk).', fagmiljo: null })
    for (const b of ['qa-chat-ada', 'qa-chat-bo']) await rpc(admin, 'inviter_til_gruppe', { gruppe: g, brukernavn: b })
    await rpc(adaK, 'svar_paa_gruppeinvitasjon', { gruppe: g, godta: true })
    await rpc(boK, 'svar_paa_gruppeinvitasjon', { gruppe: g, godta: true })
    grupper.push(g)
  }
  const [sandkasse, faglig] = grupper as [string, string]
  await rpc(boK, 'send_gruppemelding', { gruppe: faglig, klient_id: crypto.randomUUID(), tekst: 'Syntetisk eldre melding' })
  await vent(1100)
  await rpc(boK, 'send_gruppemelding', { gruppe: sandkasse, klient_id: crypto.randomUUID(), tekst: 'Syntetisk hei fra Bo' })
  await rpc(boK, 'send_gruppemelding', { gruppe: sandkasse, klient_id: crypto.randomUUID(), tekst: 'Syntetisk nummer to' })
  const uleste = async () => (await rpc<{ samhandling: { chat_uleste: number } }>(adaK, 'gruppeoversikt', { gruppe: sandkasse })).samhandling.chat_uleste

  const ada: Side = await miljo.brukerside('qa-chat-ada', pw.ada, { viewport: { width: 1440, height: 900 } })
  await ada.goto(`${miljo.url}/#/`)
  const boble = ada.locator('.chatboble')
  const menyen = ada.getByRole('complementary', { name: 'Grupper og samtaler' })

  await punkt('P1 boblen viser uleste', async () => {
    // Menyen husker at den sto åpen fra en tidligere kjøring; da lukkes den først.
    await lukkChatmenyen(ada)
    await innen(15_000, 'merket 3', async () => (await boble.getAttribute('aria-label'))?.includes('3 uleste') ?? false)
    await bilde(ada, '01-boble-pc')
  })

  await punkt('P2 å åpne menyen merker ingenting lest; lista nyeste først', async () => {
    await boble.click()
    await menyen.getByRole('region', { name: 'Samtaler' }).waitFor()
    await vent(2500)
    krev((await uleste()) === 2, `uleste i databasen etter åpning: ${await uleste()}`)
    const rader: string[] = await menyen.locator('.chatrad__navn').allInnerTexts()
    krev(rader[0] === sandnavn, `første rad er ${rader[0]}`)
    await sammeLinje(menyen, '.chatgrupper__veksle')
    await bilde(ada, '02-meny-apen-pc')
  })

  await punkt('P3 samtalen i menyen merkes lest når den vises; sanntid inn', async () => {
    await menyen.getByRole('button', { name: new RegExp(sandnavn) }).click()
    await menyen.getByRole('log').waitFor()
    await innen(10_000, 'lest i databasen', async () => (await uleste()) === 0)
    await rpc(boK, 'send_gruppemelding', { gruppe: sandkasse, klient_id: crypto.randomUUID(), tekst: 'Syntetisk i sanntid' })
    await innen(10_000, 'ny melding vises', async () => (await menyen.getByText('Syntetisk i sanntid').count()) > 0)
    await sammeLinje(menyen, '.chatsamtale__tilbake')
    await bilde(ada, '03-samtale-meny-pc')
  })

  await punkt('P4 utkast følger med til #/chat, Escape gjenoppretter', async () => {
    await menyen.getByLabel(`Melding til ${sandnavn}`).fill('Syntetisk utkast')
    await menyen.getByRole('button', { name: 'Utvid' }).click()
    await innen(5_000, 'adressen', async () => ada.url().endsWith(`#/chat/gruppe/${sandkasse}`))
    const helside = ada.getByRole('main', { name: 'Grupper og samtaler' })
    krev((await helside.getByLabel(`Melding til ${sandnavn}`).inputValue()) === 'Syntetisk utkast', 'utkastet på helsiden')
    await bilde(ada, '04-helside-pc')
    await helside.getByLabel(`Melding til ${sandnavn}`).click()
    await ada.keyboard.press('Escape')
    await innen(5_000, 'tilbake på forsiden', async () => /#\/$/.test(ada.url()))
    krev((await menyen.getByLabel(`Melding til ${sandnavn}`).inputValue()) === 'Syntetisk utkast', 'utkastet i menyen')
    // Neste Escape slipper fokus, menyen står.
    await menyen.getByLabel(`Melding til ${sandnavn}`).focus()
    await ada.keyboard.press('Escape')
    krev(await menyen.isVisible(), 'menyen står')
    krev((await ada.evaluate(() => document.activeElement?.tagName)) !== 'TEXTAREA', 'fokus er sluppet')
    await menyen.getByLabel(`Melding til ${sandnavn}`).fill('')
  })

  await punkt('P5 hovedmenyen parkerer chatten', async () => {
    // Escape slipper fokuset i chatten (laget over appen), så når Ctrl + M hovedmenyen.
    await ada.keyboard.press('Escape')
    await ada.keyboard.press('Control+m')
    await innen(3_000, 'parkert', async () => (await ada.locator('.chatmeny').evaluate((e: Element) => getComputedStyle(e).visibility)) === 'hidden')
    await bilde(ada, '05-parkert-pc')
    await ada.keyboard.press('Escape')
    await innen(3_000, 'tilbake', async () => (await ada.locator('.chatmeny').evaluate((e: Element) => getComputedStyle(e).visibility)) === 'visible')
  })

  await punkt('P6 chat og diskusjoner: den sist åpnede vinner når det er trangt', async () => {
    await ada.goto(`${miljo.url}/#/grupper/${sandkasse}`)
    const diskboble = ada.locator('.diskusjonsboble')
    await diskboble.waitFor({ timeout: 20_000 })
    await diskboble.click()
    await innen(3_000, 'chatmenyen lukket', async () => (await ada.evaluate(() => document.documentElement.dataset.chatmeny)) === 'lukket')
    await bilde(ada, '06-diskusjoner-vant-1440')
    await ada.setViewportSize({ width: 1920, height: 1000 })
    await boble.click()
    await vent(500)
    const begge = await ada.evaluate(() => [document.documentElement.dataset.chatmeny, document.documentElement.dataset.diskusjonsmeny])
    krev(begge[0] === 'apen' && begge[1] === 'apen', `begge åpne på 1920: ${begge}`)
    await bilde(ada, '07-begge-1920')
    await ada.locator('.diskusjonspanel__lukk').click()
    await ada.setViewportSize({ width: 1440, height: 900 })
  })

  await punkt('P7 mørkt tema, helside', async () => {
    await ada.emulateMedia({ colorScheme: 'dark' })
    await ada.goto(`${miljo.url}/#/chat/gruppe/${faglig}`)
    const hel = ada.getByRole('main', { name: 'Grupper og samtaler' })
    await hel.getByRole('log').waitFor({ timeout: 20_000 })
    // Lista står ved siden av; «Til alle samtaler» trengs ikke på brede flater.
    krev(!(await hel.getByRole('button', { name: 'Til alle samtaler' }).isVisible()), 'ingen tilbakeknapp på PC')
    await bilde(ada, '08-helside-pc-moerkt')
    await ada.emulateMedia({ colorScheme: 'light' })
  })

  const mobil: Side = await miljo.brukerside('qa-chat-bo', pw.bo, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await punkt('P8 mobil: knapp i toppmenyen, chatten fyller skjermen, Escape lukker', async () => {
    await rpc(adaK, 'send_gruppemelding', { gruppe: faglig, klient_id: crypto.randomUUID(), tekst: 'Syntetisk til Bo' })
    await mobil.goto(`${miljo.url}/#/`)
    const knapp = mobil.locator('.chatknapp button')
    await knapp.waitFor({ timeout: 30_000 })
    await bilde(mobil, '09-forside-mobil')
    await knapp.click()
    const m = mobil.getByRole('complementary', { name: 'Grupper og samtaler' })
    await m.getByRole('region', { name: 'Samtaler' }).waitFor()
    // Boblen, håndtaket og «Utvid» hører til de brede flatene.
    krev(!(await mobil.locator('.chatboble').isVisible()), 'ingen boble på mobil')
    krev(!(await m.getByRole('button', { name: 'Utvid' }).isVisible()), 'ingen Utvid på mobil')
    await sammeLinje(m, '.chatgrupper__veksle')
    await bilde(mobil, '10-meny-mobil')
    await m.getByRole('button', { name: new RegExp(fagnavn) }).click()
    await m.getByRole('log').waitFor()
    await sammeLinje(m, '.chatsamtale__tilbake')
    await bilde(mobil, '11-samtale-mobil')
    await mobil.keyboard.press('Escape')
    await innen(3_000, 'lukket', async () => !(await m.isVisible()))
    await mobil.emulateMedia({ colorScheme: 'dark' })
    await knapp.click()
    await bilde(mobil, '12-samtale-mobil-moerkt')
    await mobil.emulateMedia({ colorScheme: 'light' })
    // Helsiden i én kolonne: «Til alle samtaler» er veien tilbake til lista.
    await mobil.goto(`${miljo.url}/#/chat/gruppe/${faglig}`)
    const hel = mobil.getByRole('main', { name: 'Grupper og samtaler' })
    await hel.getByRole('log').waitFor({ timeout: 20_000 })
    await hel.getByRole('button', { name: 'Til alle samtaler' }).click()
    await hel.getByRole('region', { name: 'Samtaler' }).waitFor({ timeout: 5_000 })
    krev(mobil.url().endsWith('#/chat'), `adressen ${mobil.url()}`)
    await bilde(mobil, '12b-helside-liste-mobil')
  })

  await punkt('P9 fjernet medlem mister samtalen innen ett minutt', async () => {
    await ada.goto(`${miljo.url}/#/`)
    await menyen.waitFor()
    const start = Date.now()
    await rpc(admin, 'avslutt_gruppemedlemskap', { gruppe: faglig, bruker: adaId })
    await innen(65_000, 'stengt', async () => (await ada.getByText('Du har ikke lenger tilgang til denne gruppen.').count()) > 0)
    const brukt = Date.now() - start
    krev(brukt <= 60_000, `${brukt} ms`)
    await menyen.getByRole('button', { name: 'Til alle samtaler' }).click()
    await innen(15_000, 'borte fra samtalene', async () => (await menyen.locator('.chatrad__navn', { hasText: fagnavn }).count()) === 0)
    await innen(15_000, 'borte fra Mine grupper', async () => (await menyen.getByText(fagnavn).count()) === 0)
    await bilde(ada, '13-fjernet-pc')
    return `${(brukt / 1000).toFixed(1)} s`
  })
} finally {
  tilbakestillBrytere()
  await miljo.avslutt()
  console.log('\nRESULTAT')
  for (const u of utfall) console.log(`${u.ok ? 'OK  ' : 'FEIL'} ${u.punkt} ${u.merknad}`)
  process.exit(utfall.every((u) => u.ok) ? 0 : 1)
}
