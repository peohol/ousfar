/**
 * Nettleserkontrollen av direktemeldingene (docs/direktemeldinger-personvern.md)
 * i det lokale testmiljøet (docs/qa-testmiljo.md), med de syntetiske kontoene
 * `qa-chat-ada` og `qa-chat-bo` i hver sin nettleser, og bryterne for chatten
 * og direktemeldingene på i den lokale databasen mens den går:
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/direktemeldingnettleser.ts
 *
 * Punktene: bryterne står av fra starten; «Ny chat» og søket; sanntid begge
 * veier gjennom dørklokken på `direktesamtaler` (med kolonnerettighetene);
 * en mottaker som slår av, gir den låste linjen med historikken intakt;
 * blokkering i en åpen fane; aktivitetsprikken; tap av tilgangen til OUSFAR
 * stenger samtalen innen ett minutt; mobil og mørkt tema; fanen Chat i
 * Innstillinger med de samme bryterne.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { internAuthAdresse } from '@delt/brukernavn'
import { lokalSql, sikreTestkonto, slaPaFunksjoner, startLokalDatabase, type Status } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Side = any
const logg = (t: string) => console.log(`[direktemeldinger] ${t}`)
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
// Et rent utgangspunkt i den lokale databasen: valgene, blokkeringene og samtalen mellom dem fra tidligere kjøringer.
const begge = `('${adaId}', '${boId}')`
lokalSql(s, `delete from public.chatvalg where bruker_id in ${begge}; delete from public.direktemelding_blokkeringer where blokkerer in ${begge};
  delete from public.chataktivitet where bruker_id in ${begge};
  delete from public.direktesamtaler where bruker_lav in ${begge} and bruker_hoy in ${begge};`)
const tilbakestillBrytere = slaPaFunksjoner(s, 'gruppechat_aktivert', 'direktemeldinger_aktivert')
let deaktivert = ''
const miljo = await apneTestmiljo()
try {
  const boK = await klient(s, 'qa-chat-bo', pw.bo)
  const ada: Side = await miljo.brukerside('qa-chat-ada', pw.ada, { viewport: { width: 1440, height: 900 } })
  const bo: Side = await miljo.brukerside('qa-chat-bo', pw.bo, { viewport: { width: 1280, height: 860 } })
  const meny = (side: Side) => side.getByRole('complementary', { name: 'Grupper og samtaler' })
  const helside = (side: Side) => side.getByRole('main', { name: 'Grupper og samtaler' })
  /** Menyen åpen, på oversikten. */
  async function aapneMenyen(side: Side) {
    await side.goto(`${miljo.url}/#/`)
    const boble = side.locator('.chatboble')
    await boble.or(meny(side)).first().waitFor({ timeout: 30_000 })
    if (await boble.isVisible()) await boble.click()
    const tilbake = meny(side).getByRole('button', { name: 'Til alle samtaler' })
    if (await tilbake.isVisible()) await tilbake.click()
    await meny(side).getByRole('region', { name: 'Samtaler' }).waitFor({ timeout: 15_000 })
  }
  let samtale = ''

  await punkt('D1 bryterne står av fra starten', async () => {
    await aapneMenyen(ada)
    const tillat = meny(ada).getByRole('switch', { name: /Tillat direktemeldinger/ })
    const aktiv = meny(ada).getByRole('switch', { name: /Vis når jeg er aktiv/ })
    await tillat.waitFor({ timeout: 15_000 })
    krev(!(await tillat.isChecked()) && !(await aktiv.isChecked()), 'en bryter står på')
    await bilde(ada, '01-brytere-av-pc')
  })

  await punkt('D2 «Ny chat» ber om å slå på; søket finner bare den som tillater', async () => {
    await meny(ada).getByRole('button', { name: 'Ny chat' }).click()
    await meny(ada).getByRole('heading', { name: 'Ny direktemelding' }).waitFor()
    await meny(ada).getByRole('button', { name: 'Slå på' }).click()
    const sok = meny(ada).getByRole('searchbox', { name: 'Søk etter navn eller brukernavn' })
    await sok.waitFor({ timeout: 10_000 })
    await sok.fill('qa-chat-bo')
    await innen(5_000, 'ingen treff før Bo slår på', async () => (await meny(ada).getByText('Ingen treff.').count()) > 0)
    await rpc(boK, 'sett_chatvalg', { tillat: true, vis_aktiv: null })
    await sok.fill('qa-chat-b')
    await sok.fill('qa-chat-bo')
    await innen(5_000, 'Bo i treffene', async () => (await meny(ada).getByRole('button', { name: /Bo Prøvesen/ }).count()) > 0)
    await bilde(ada, '02-ny-direktemelding-pc')
    await meny(ada).getByRole('button', { name: /Bo Prøvesen/ }).click()
    await meny(ada).getByRole('heading', { name: 'Bo Prøvesen' }).waitFor({ timeout: 10_000 })
    samtale = lokalSql(s, `select id from public.direktesamtaler where bruker_lav in ${begge} and bruker_hoy in ${begge}`)
    krev(samtale, 'samtalen finnes')
    krev(await meny(ada).getByText('Bare dere to kan lese samtalen.').isVisible(), 'lesertekst')
  })

  await punkt('D3 sanntid begge veier gjennom dørklokken', async () => {
    await meny(ada).getByLabel('Melding til Bo Prøvesen').fill('Syntetisk hei Bo')
    await ada.keyboard.press('Enter')
    await bo.goto(`${miljo.url}/#/chat/direkte/${samtale}`)
    await helside(bo).getByText('Syntetisk hei Bo').waitFor({ timeout: 20_000 })
    await helside(bo).getByLabel('Melding til Ada Testesen').fill('Syntetisk svar fra Bo')
    const start = Date.now()
    await bo.keyboard.press('Enter')
    await innen(10_000, 'Ada får svaret', async () => (await meny(ada).getByText('Syntetisk svar fra Bo').count()) > 0)
    const brukt = Date.now() - start
    await helside(bo).getByLabel('Melding til Ada Testesen').fill('Syntetisk nummer to')
    await bo.keyboard.press('Enter')
    await innen(10_000, 'Ada får nummer to', async () => (await meny(ada).getByText('Syntetisk nummer to').count()) > 0)
    await bilde(ada, '03-samtale-meny-pc')
    await bilde(bo, '04-samtale-helside-pc')
    return `${(brukt / 1000).toFixed(1)} s`
  })

  await punkt('D4 mottakeren slår av: låst linje, historikken står', async () => {
    await helside(bo).getByRole('button', { name: 'Til alle samtaler' }).click().catch(() => undefined)
    const tillat = helside(bo).getByRole('switch', { name: /Tillat direktemeldinger/ })
    await tillat.click({ force: true })
    await innen(5_000, 'av hos Bo', async () => !(await tillat.isChecked()))
    await meny(ada).getByLabel('Melding til Bo Prøvesen').fill('Syntetisk etter av')
    await ada.keyboard.press('Enter')
    const laast = 'Bo Prøvesen kan ikke motta nye direktemeldinger. Samtalen kan fortsatt leses.'
    await innen(10_000, 'låst linje hos Ada', async () => (await meny(ada).getByText(laast).count()) > 0)
    krev((await meny(ada).getByText('Syntetisk svar fra Bo').count()) > 0, 'historikken står')
    krev((await meny(ada).getByLabel('Melding til Bo Prøvesen').count()) === 0, 'skrivefeltet er borte')
    await bilde(ada, '05-laast-mottaker-pc')
    await helside(bo).locator('.chatrad__knapp', { hasText: 'Ada Testesen' }).click()
    await helside(bo).getByText('Du har slått av direktemeldinger. Slå dem på for å skrive.').waitFor({ timeout: 10_000 })
    await bilde(bo, '06-laast-selv-av-pc')
    await rpc(boK, 'sett_chatvalg', { tillat: true, vis_aktiv: null })
  })

  await punkt('D5 blokkering virker i en åpen fane, begge veier, og kan oppheves', async () => {
    await innen(60_000, 'Ada kan skrive igjen', async () => (await meny(ada).getByLabel('Melding til Bo Prøvesen').count()) > 0)
    await meny(ada).getByRole('button', { name: 'Valg for samtalen med Bo Prøvesen' }).click()
    await ada.getByRole('button', { name: 'Blokker Bo Prøvesen' }).click()
    await meny(ada).getByRole('group', { name: 'Blokkere Bo Prøvesen?' }).getByRole('button', { name: 'Blokker' }).click()
    await meny(ada).getByText('Du har blokkert Bo Prøvesen. Opphev blokkeringen for å skrive.').waitFor({ timeout: 10_000 })
    await bilde(ada, '07-blokkert-selv-pc')
    // Bo har samtalen åpen og prøver å sende: avvist, og den felles linjen står.
    await bo.reload()
    await helside(bo).getByLabel('Melding til Ada Testesen').or(helside(bo).getByText(/kan ikke motta/)).first().waitFor({ timeout: 20_000 })
    if ((await helside(bo).getByLabel('Melding til Ada Testesen').count()) > 0) {
      await helside(bo).getByLabel('Melding til Ada Testesen').fill('Syntetisk etter blokkering')
      await bo.keyboard.press('Enter')
    }
    await helside(bo).getByText('Ada Testesen kan ikke motta nye direktemeldinger. Samtalen kan fortsatt leses.').waitFor({ timeout: 10_000 })
    await bilde(bo, '08-blokkert-mottaker-pc')
    // Oppheves under «Blokkerte».
    await meny(ada).getByRole('button', { name: 'Til alle samtaler' }).click()
    await meny(ada).getByRole('button', { name: 'Blokkerte' }).click()
    await meny(ada).getByRole('button', { name: 'Opphev' }).click()
    await innen(10_000, 'opphevet', async () => (await meny(ada).getByText('Du har ikke blokkert noen.').count()) > 0)
    await meny(ada).getByRole('button', { name: 'Blokkerte' }).click()
  })

  await punkt('D6 aktivitetsprikken bare når den andre har slått den på', async () => {
    const prikk = meny(ada).locator('.chatperson__aktiv[aria-label="Aktiv nå"]')
    krev((await prikk.count()) === 0, 'prikk før Bo slo på')
    const vis = helside(bo).getByRole('switch', { name: /Vis når jeg er aktiv/ })
    await helside(bo).getByRole('button', { name: 'Til alle samtaler' }).click().catch(() => undefined)
    await vis.click({ force: true })
    await bo.mouse.wheel(0, 50)
    await innen(75_000, 'prikk hos Ada', async () => (await prikk.count()) > 0)
    await bilde(ada, '09-aktiv-prikk-pc')
    await vis.click({ force: true })
  })

  await punkt('D7 mobil og mørkt tema', async () => {
    const mobil: Side = await miljo.brukerside('qa-chat-bo', pw.bo, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
    await mobil.goto(`${miljo.url}/#/`)
    const knapp = mobil.locator('.chatknapp button')
    await knapp.waitFor({ timeout: 30_000 })
    await knapp.click()
    const m = meny(mobil)
    await m.getByRole('region', { name: 'Samtaler' }).waitFor()
    await bilde(mobil, '10-meny-mobil')
    await m.locator('.chatrad__knapp', { hasText: 'Ada Testesen' }).click()
    await m.getByRole('log').waitFor()
    await bilde(mobil, '11-samtale-mobil')
    await mobil.emulateMedia({ colorScheme: 'dark' })
    await bilde(mobil, '12-samtale-mobil-moerkt')
    await m.getByRole('button', { name: 'Til alle samtaler' }).click()
    await m.getByRole('button', { name: 'Ny chat' }).click()
    await bilde(mobil, '13-ny-mobil-moerkt')
    await ada.emulateMedia({ colorScheme: 'dark' })
    await ada.goto(`${miljo.url}/#/chat/direkte/${samtale}`)
    await helside(ada).getByRole('log').waitFor({ timeout: 20_000 })
    await bilde(ada, '14-helside-pc-moerkt')
    await ada.emulateMedia({ colorScheme: 'light' })
  })

  await punkt('D9 fanen Chat i Innstillinger har de samme bryterne som chatmenyen', async () => {
    await aapneMenyen(ada)
    await ada.getByRole('button', { name: /^Kontoen din/ }).click()
    await ada.getByRole('button', { name: 'Innstillinger' }).click()
    const vindu = ada.getByRole('dialog', { name: 'Innstillinger' })
    await vindu.getByRole('tab', { name: 'Chat' }).click()
    const aktiv = vindu.getByRole('switch', { name: /Vis når jeg er aktiv/ })
    krev(await vindu.getByRole('switch', { name: /Tillat direktemeldinger/ }).isChecked(), '«Tillat» av i fanen')
    krev(!(await aktiv.isChecked()), '«Vis når jeg er aktiv» på i fanen')
    await bilde(ada, '15-innstillinger-chat-pc')
    await aktiv.click({ force: true })
    await innen(10_000, 'på i fanen', () => aktiv.isChecked())
    await ada.keyboard.press('Escape')
    const iMenyen = meny(ada).getByRole('switch', { name: /Vis når jeg er aktiv/ })
    await innen(10_000, 'på i chatmenyen', () => iMenyen.isChecked())
    await iMenyen.click({ force: true })
    await innen(10_000, 'av igjen', async () => !(await iMenyen.isChecked()))
  })

  await punkt('D8 tap av tilgangen til OUSFAR stenger samtalen innen ett minutt', async () => {
    await bo.goto(`${miljo.url}/#/chat/direkte/${samtale}`)
    await helside(bo).getByRole('log').waitFor({ timeout: 20_000 })
    const start = Date.now()
    deaktivert = lokalSql(s, `with d as (update public.medlemskap set status = 'deaktivert', til = fra where bruker_id = '${boId}' and status = 'aktiv' returning fagmiljo_id) select string_agg(fagmiljo_id::text, ',') from d`)
    krev(deaktivert, 'Bo hadde ikke aktivt medlemskap')
    // Meldingene er borte fra skjermen: samtalen er stengt, eller appen står bak porten for kontoer uten tilgang.
    await innen(65_000, 'meldingene er borte', async () => (await bo.getByText('Syntetisk hei Bo').count()) === 0)
    const brukt = Date.now() - start
    const stengt = (await bo.getByText('Samtalen finnes ikke, eller du har ikke tilgang til den.').count()) > 0
    await bilde(bo, '15-uten-tilgang-pc')
    krev(brukt <= 60_000, `${brukt} ms`)
    return `${(brukt / 1000).toFixed(1)} s, ${stengt ? 'samtalen stengt' : 'appen stengt'}`
  })
} finally {
  if (deaktivert) lokalSql(s, `update public.medlemskap set status = 'aktiv', til = null where bruker_id = '${boId}' and fagmiljo_id = any(string_to_array('${deaktivert}', ',')::uuid[])`)
  tilbakestillBrytere()
  await miljo.avslutt()
  console.log('\nRESULTAT')
  for (const u of utfall) console.log(`${u.ok ? 'OK  ' : 'FEIL'} ${u.punkt} ${u.merknad}`)
  process.exit(utfall.every((u) => u.ok) ? 0 : 1)
}
