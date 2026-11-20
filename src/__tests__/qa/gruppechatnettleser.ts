/**
 * Nettleserkontrollen av gruppechatten (docs/p7-testplan.md, avsnitt 6,
 * N1–N10) i det lokale testmiljøet, med Supabase Realtime og bryteren slått
 * på i den lokale databasen mens kontrollen går. Aldri mot produksjonen:
 * `brukerside()` finnes bare lokalt.
 *
 * To syntetiske medlemmer, Ada og Bo (`qa-chat-ada`, `qa-chat-bo`, nye
 * tilfeldige passord hver gang), i hver sin nettleserkontekst i en ny,
 * tverrfaglig gruppe som testadministratoren lager. Hvert punkt prøves for
 * seg; et punkt som feiler, stopper ikke de neste. Rapporten skrives som
 * én linje per punkt, og skjermbildene til `QA_SKJERMBILDER` når den er satt.
 *
 *   npx vite-node src/__tests__/qa/gruppechatnettleser.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { internAuthAdresse } from '@delt/brukernavn'
import { PASIENTREGEL } from '@delt/pasientopplysninger'
import { syntetiskPersonnummer } from '../hjelp/syntetiskPersonnummer'
import { sikreAdministrator, sikreTestkonto, slaPaFunksjoner, startLokalDatabase, type Status } from './lokalmiljo'
import { arkiverTidligereGrupper, chatabonnementer, lagAvslagsvakt, lukkChatmenyen } from './kontroll'
import { apneTestmiljo } from './testmiljo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Side = any

const logg = (tekst: string) => console.log(`[gruppechat i nettleseren] ${tekst}`)
const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
/** Kontrakten: en åpen chat skal tømmes innen ett minutt etter at tilgangen er tatt (kriterium 4). */
const TILGANG_TAPT_MS = 60_000
/** Gjenoppkoblingen etter et brudd har ingen slik grense; livstegnet og litt til. */
const GJENOPPKOBLING_MS = 75_000

async function klient(s: Status, brukernavn: string, passord: string): Promise<SupabaseClient> {
  const k = createClient(s.API_URL, s.PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await k.auth.signInWithPassword({ email: internAuthAdresse(brukernavn), password: passord })
  if (error) throw error
  return k
}

async function rpc<T>(k: SupabaseClient, navn: string, argumenter: Record<string, unknown>): Promise<T> {
  const { data, error } = await k.rpc(navn, argumenter)
  if (error) throw new Error(`${navn}: ${error.message}`)
  return data as T
}

/**
 * En melding sendt rett til databasen, utenom nettleseren. Databasen tar høyst
 * 20 per minutt fra hver avsender; da ventes det og prøves igjen.
 */
async function sendDirekte(k: SupabaseClient, gruppe: string, tekst: string): Promise<void> {
  for (let forsok = 0; ; forsok++) {
    const { error } = await k.rpc('send_gruppemelding', { gruppe, klient_id: crypto.randomUUID(), tekst })
    if (!error) return
    if (error.code !== '54000' || forsok > 12) throw new Error(`send_gruppemelding: ${error.message}`)
    await vent(5_000)
  }
}

// --- Punktene og rapporten ---------------------------------------------------

interface Utfall {
  punkt: string
  hva: string
  ok: boolean
  merknad: string
}
const utfall: Utfall[] = []
const skjermbilder = process.env.QA_SKJERMBILDER
if (skjermbilder) mkdirSync(skjermbilder, { recursive: true })

async function punkt(kode: string, hva: string, sider: Record<string, Side>, arbeid: () => Promise<string | void>) {
  logg(`${kode}: ${hva}`)
  try {
    const merknad = (await arbeid()) ?? ''
    utfall.push({ punkt: kode, hva, ok: true, merknad })
    logg(`  ok${merknad ? `: ${merknad}` : ''}`)
  } catch (feil) {
    const merknad = feil instanceof Error ? feil.message.split('\n')[0]! : String(feil)
    utfall.push({ punkt: kode, hva, ok: false, merknad })
    logg(`  FEIL: ${merknad}`)
  }
  if (skjermbilder) {
    for (const [navn, side] of Object.entries(sider)) {
      await side.screenshot({ path: join(skjermbilder, `${kode}-${navn}.png`), fullPage: false }).catch(() => undefined)
    }
  }
}

function krev(betingelse: unknown, hva: string): asserts betingelse {
  if (!betingelse) throw new Error(hva)
}

// --- Det appen viser -----------------------------------------------------------

const logglinjer = (side: Side): Promise<string[]> =>
  side.$$eval('[role=log] .chatmelding .chatmelding__tekst', (el: Element[]) => el.map((e) => (e.firstChild?.textContent ?? '').trim()))
const skrivefelt = (side: Side, gruppenavn: string) => side.getByLabel(`Melding til ${gruppenavn}`, { exact: true })

async function innen(ms: number, hva: string, sjekk: () => Promise<boolean>): Promise<number> {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (await sjekk().catch(() => false)) return Date.now() - start
    await vent(200)
  }
  throw new Error(`Ikke innen ${ms / 1000} s: ${hva}`)
}

/**
 * Tar tilgangen (`endring`) og venter til den åpne chatten på `side` sier at
 * tilgangen er borte og ikke viser noen meldinger, høyst {@link TILGANG_TAPT_MS}
 * regnet fra før endringen. Det verste tilfellet prøves: endringen gjøres rett
 * etter at chatten har hentet endringene (livstegnet), så det går lengst mulig
 * til neste henting. Gir tiden det tok.
 */
async function tilgangenTas(side: Side, hvem: string, endring: () => Promise<unknown>): Promise<number> {
  await side.waitForResponse((r: Side) => r.url().includes('/rpc/gruppechat_endringer'), { timeout: GJENOPPKOBLING_MS })
  const start = Date.now()
  await endring()
  const stengt = async () =>
    (await side.getByText('Du har ikke lenger tilgang til denne gruppen.').count()) > 0 && (await side.locator('.chatmelding').count()) === 0
  // Det ventes litt over grensen, så rapporten kan si hvor lenge det faktisk tok.
  await innen(TILGANG_TAPT_MS + 30_000, `${hvem}s åpne chat er tømt og sier at tilgangen er borte`, stengt)
  const tid = Date.now() - start
  krev(tid <= TILGANG_TAPT_MS, `${hvem}s åpne chat ble tømt først etter ${(tid / 1000).toFixed(1)} s; grensen er ${TILGANG_TAPT_MS / 1000} s`)
  return tid
}

// --- Kjøringen -------------------------------------------------------------------

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const passord = { ada: randomBytes(18).toString('base64url'), bo: randomBytes(18).toString('base64url') }
await sikreTestkonto(s, 'qa-chat-ada', passord.ada, ['Ada', 'Testesen'])
const boId = await sikreTestkonto(s, 'qa-chat-bo', passord.bo, ['Bo', 'Prøvesen'])

const tilbakestillBrytere = slaPaFunksjoner(s, 'gruppechat_aktivert')
// Avslag som kommer som HTTP 500 (issue #470), som når Bo er fjernet og gruppen hentes.
const avslag = lagAvslagsvakt()
const miljo = await apneTestmiljo()
try {
  const admin = await klient(s, 'qa-admin', adminpassord)
  // Grupper fra tidligere kjøringer teller ellers med blant de uleste.
  await arkiverTidligereGrupper(admin, 'Syntetisk ')
  const adaKlient = await klient(s, 'qa-chat-ada', passord.ada)
  const boKlient = await klient(s, 'qa-chat-bo', passord.bo)
  const navn = `Syntetisk chat ${new Date().toISOString().slice(11, 19)}`
  const gruppe = await rpc<string>(admin, 'opprett_gruppe', { navn, beskrivelse: 'Nettleserkontroll (syntetisk).', fagmiljo: null })
  for (const brukernavn of ['qa-chat-ada', 'qa-chat-bo']) await rpc(admin, 'inviter_til_gruppe', { gruppe, brukernavn })
  await rpc(adaKlient, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  await rpc(boKlient, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  logg(`gruppen «${navn}» med Ada og Bo`)

  const chatadresse = `${miljo.url}/#/grupper/${gruppe}/chat`
  const ada = await avslag.lytt(await miljo.brukerside('qa-chat-ada', passord.ada))
  const bo = await avslag.lytt(await miljo.brukerside('qa-chat-bo', passord.bo))
  const begge = { ada, bo }
  for (const side of [ada, bo]) {
    await side.goto(chatadresse)
    await skrivefelt(side, navn).waitFor({ timeout: 30_000 })
  }
  // Dørklokken lytter når Realtime har registrert begge; en melding sendt før det kommer først med neste livstegn.
  await innen(60_000, 'Realtime lytter på chatten hos begge', async () => chatabonnementer(s, gruppe) >= 2)

  await punkt('N8', 'navnene skjermleseren leser', begge, async () => {
    const logg_ = ada.getByRole('log', { name: `Meldinger i ${navn}` })
    krev((await logg_.count()) === 1, 'lista har role="log" og navnet «Meldinger i <gruppe>»')
    const beskrivelse: string = await skrivefelt(ada, navn).evaluate((el: HTMLElement) =>
      (el.getAttribute('aria-describedby') ?? '')
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent ?? '')
        .join(' '),
    )
    krev(beskrivelse.includes('Enter sender'), 'skrivefeltet sier at Enter sender')
    await sendDirekte(boKlient, gruppe, 'Syntetisk N8 fra Bo')
    await innen(10_000, 'Bos melding hos Ada', async () => (await logglinjer(ada)).includes('Syntetisk N8 fra Bo'))
    const melding = ada.locator('.chatmelding', { hasText: 'Syntetisk N8 fra Bo' })
    const hode: string = await melding.innerText()
    // Fornavnet alene, når ingen andre i chatten heter Bo (Peder 19.11.2026).
    const avsender: string = await melding.locator('.chatmelding__navn').innerText()
    krev(avsender === 'Bo' && /\d{2}[:.]\d{2}/.test(hode), `avsender og tid står ved meldingen («${hode.replace(/\s+/g, ' ')}»)`)
  })

  await punkt('N1', 'to brukere skriver til hverandre i sanntid', begge, async () => {
    await skrivefelt(ada, navn).fill('Syntetisk hei fra Ada')
    await skrivefelt(ada, navn).press('Enter')
    const tid = await innen(10_000, 'Adas melding hos Bo uten omlasting', async () => (await logglinjer(bo)).includes('Syntetisk hei fra Ada'))
    await skrivefelt(bo, navn).fill('Syntetisk svar fra Bo')
    await skrivefelt(bo, navn).press('Enter')
    const tilbake = await innen(10_000, 'Bos svar hos Ada', async () => (await logglinjer(ada)).includes('Syntetisk svar fra Bo'))
    krev(JSON.stringify(await logglinjer(ada)) === JSON.stringify(await logglinjer(bo)), 'Ada og Bo ser de samme meldingene i samme rekkefølge')
    return `Ada → Bo ${tid} ms, Bo → Ada ${tilbake} ms`
  })

  await punkt('N6', 'hele flyten med tastatur', begge, async () => {
    const felt = skrivefelt(ada, navn)
    await felt.focus()
    await ada.keyboard.type('Syntetisk linje 1')
    await ada.keyboard.press('Shift+Enter')
    await ada.keyboard.type('Syntetisk linje 2')
    await ada.keyboard.press('Enter')
    await innen(10_000, 'flerlinjemeldingen hos Bo', async () => (await logglinjer(bo)).some((t) => t === 'Syntetisk linje 1\nSyntetisk linje 2'))
    krev(await felt.evaluate((el: HTMLElement) => el === document.activeElement), 'fokus står i skrivefeltet etter sending')
    krev((await felt.inputValue()) === '', 'skrivefeltet er tømt')
    // Menyen på en egen melding nås med tastaturet: Shift+Tab fra feltet går bakover gjennom lista.
    let navnet = ''
    for (let i = 0; i < 40 && !navnet.startsWith('Handlinger for meldingen din'); i++) {
      await ada.keyboard.press('Shift+Tab')
      navnet = await ada.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
    }
    krev(navnet.startsWith('Handlinger for meldingen din'), 'menyknappen på en egen melding nås med Shift+Tab')
    await ada.keyboard.press('Enter')
    await ada.getByRole('menuitem', { name: /Endre/ }).or(ada.getByRole('button', { name: /^Endre/ })).first().waitFor({ timeout: 5_000 })
    await ada.keyboard.press('Escape')
    const fokus: string = await ada.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.tagName ?? '')
    krev(fokus.startsWith('Handlinger for meldingen din'), `fokus tilbake på menyknappen etter Escape (står på «${fokus}»)`)
  })

  await punkt('N9', 'tekst med et syntetisk fødselsnummer', begge, async () => {
    const nummer = syntetiskPersonnummer(14, 3, 87)
    const felt = skrivefelt(ada, navn)
    await felt.fill(`Syntetisk N9 ${nummer}`)
    await felt.press('Enter')
    await ada.getByText(PASIENTREGEL.avvist).first().waitFor({ timeout: 10_000 })
    await vent(2_000)
    krev(!(await logglinjer(bo)).some((t) => t.includes(nummer)), 'meldingen kom aldri fram til Bo')
    // Den avviste meldingen forkastes, så den ikke står igjen.
    await ada.getByRole('button', { name: /Forkast/ }).first().click()
  })

  await punkt('N2', 'lista står stille når man leser eldre meldinger', begge, async () => {
    for (let i = 1; i <= 30; i++) await sendDirekte(i % 2 ? admin : adaKlient, gruppe, `Syntetisk fyll ${i}`)
    await innen(15_000, 'fyllmeldingene hos Bo', async () => (await logglinjer(bo)).includes('Syntetisk fyll 30'))
    const lista = bo.getByRole('log')
    await lista.evaluate((el: HTMLElement) => (el.scrollTop = 0))
    await vent(500)
    for (const i of [1, 2]) await sendDirekte(admin, gruppe, `Syntetisk ny ${i}`)
    await innen(15_000, 'de nye meldingene hos Bo', async () => (await logglinjer(bo)).includes('Syntetisk ny 2'))
    const knapp = bo.locator('.chatlogg__tilnye')
    await knapp.waitFor({ timeout: 5_000 })
    const tekst: string = await knapp.innerText()
    krev(/2 nye meldinger/i.test(tekst), `knappen sier «2 nye meldinger» (står «${tekst}»)`)
    krev((await lista.evaluate((el: HTMLElement) => el.scrollTop)) < 50, 'lista står stille øverst')
    await knapp.click()
    await innen(5_000, 'lista følger igjen etter knappen', async () =>
      lista.evaluate((el: HTMLElement) => el.scrollHeight - el.scrollTop - el.clientHeight < 80),
    )
  })

  await punkt('N5', 'nettverket av og på', begge, async () => {
    await bo.context().setOffline(true)
    try {
      for (const i of [1, 2, 3]) await sendDirekte(admin, gruppe, `Syntetisk frakoblet ${i}`)
      await vent(3_000)
      krev(!(await logglinjer(bo)).includes('Syntetisk frakoblet 1'), 'Bo får ingenting mens nettet er av')
    } finally {
      await bo.context().setOffline(false)
    }
    const tid = await innen(GJENOPPKOBLING_MS, 'meldingene fra mens Bo var borte', async () => (await logglinjer(bo)).includes('Syntetisk frakoblet 3'))
    const linjer = await logglinjer(bo)
    const mine = linjer.filter((t) => t.startsWith('Syntetisk frakoblet'))
    krev(JSON.stringify(mine) === JSON.stringify(['Syntetisk frakoblet 1', 'Syntetisk frakoblet 2', 'Syntetisk frakoblet 3']), `i rekkefølge og uten duplikater (${mine.join(', ')})`)
    krev(new Set(linjer).size === linjer.length, 'ingen duplikater i lista (alle testtekstene er ulike)')
    return `meldingene kom ${tid} ms etter at nettet var tilbake`
  })

  // D4b: chatten er ute av bjella; uleste står på chatboblen og i samtalelista.
  await punkt('N10', 'nye meldinger på chatboblen, ikke i bjella', begge, async () => {
    await bo.goto(`${miljo.url}/#/grupper`)
    const boble = bo.locator('.chatboble')
    const meny = bo.getByRole('complementary', { name: 'Grupper og samtaler' })
    // Menyen lukkes på lista før meldingen sendes: står samtalen åpen i den, er meldingen lest med en gang.
    await lukkChatmenyen(bo, { tilLista: true })
    await sendDirekte(adaKlient, gruppe, 'Syntetisk varseltekst N10')
    await innen(15_000, 'uleste på chatboblen', async () => /\d+ ulest/.test((await boble.getAttribute('aria-label')) ?? ''))
    await bo.getByRole('button', { name: /^Varsler/ }).first().click()
    const vindu = bo.getByRole('dialog', { name: 'Varsler' })
    await vindu.waitFor({ timeout: 10_000 })
    krev((await vindu.getByText(navn).count()) === 0, 'bjella nevner ikke chatten')
    await bo.keyboard.press('Escape')
    await boble.click()
    const rad = meny.locator('.chatrad', { hasText: navn })
    krev((await rad.getAttribute('data-ulest')) !== null, 'raden er merket ulest')
    krev(!(await rad.innerText()).includes('Syntetisk varseltekst'), 'raden har ingen meldingstekst')
    await rad.getByRole('button').click()
    await skrivefelt(bo, navn).waitFor({ timeout: 10_000 })
  })

  await punkt('N7', 'smal skjerm med berøring', {}, async () => {
    const mobil = await avslag.lytt(await miljo.brukerside('qa-chat-bo', passord.bo, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }))
    await mobil.goto(chatadresse)
    const felt = skrivefelt(mobil, navn)
    await felt.waitFor({ timeout: 30_000 })
    const bredde = await mobil.evaluate(() => ({ dok: document.documentElement.scrollWidth, vindu: window.innerWidth }))
    krev(bredde.dok <= bredde.vindu, `ingen vannrett rulling (${bredde.dok} > ${bredde.vindu})`)
    await felt.tap()
    await felt.fill('Syntetisk mobil linje 1')
    await felt.press('Enter')
    await mobil.keyboard.type('Syntetisk mobil linje 2')
    krev((await felt.inputValue()).includes('\n'), 'Enter gir ny linje på berøringsskjerm')
    await mobil.getByRole('button', { name: 'Send', exact: true }).tap()
    await innen(10_000, 'mobilmeldingen hos Ada', async () => (await logglinjer(ada)).some((t) => t.startsWith('Syntetisk mobil linje 1')))
    if (skjermbilder) await mobil.screenshot({ path: join(skjermbilder, 'N7-mobil.png') })
  })

  await punkt('N3', 'Bo fjernes mens chatten står åpen', begge, async () => {
    await bo.goto(chatadresse)
    await skrivefelt(bo, navn).waitFor({ timeout: 30_000 })
    const tid = await tilgangenTas(bo, 'Bo', () => rpc(admin, 'avslutt_gruppemedlemskap', { gruppe, bruker: boId }))
    return `tømt etter ${Math.round(tid / 1000)} s (grense ${TILGANG_TAPT_MS / 1000} s)`
  })

  await punkt('N4', 'gruppen arkiveres', { ada }, async () => {
    const for_ = (await logglinjer(ada)).length
    // Kontrakten: en arkivert gruppe leses bare av systemarkitektene. Ada mister
    // tilgangen; det åpne vinduet får vite det ved livstegnet eller neste henting.
    const levende = await tilgangenTas(ada, 'Ada', () => rpc(admin, 'arkiver_gruppe', { gruppe, arkivert: true }))
    // Systemarkitekten ser historikken, uten skrivefelt.
    const sa = await avslag.lytt(await miljo.side())
    await sa.goto(chatadresse)
    await sa.getByText(/Gruppen er arkivert/).first().waitFor({ timeout: 30_000 })
    krev((await skrivefelt(sa, navn).count()) === 0, 'skrivefeltet er borte for systemarkitekten')
    const historikk = (await logglinjer(sa)).length
    krev(historikk >= for_ - 1, `historikken står for systemarkitekten (${historikk} av ${for_})`)
    if (skjermbilder) await sa.screenshot({ path: join(skjermbilder, 'N4-systemarkitekt.png') })
    return `Adas åpne chat tømt etter ${Math.round(levende / 1000)} s (grense ${TILGANG_TAPT_MS / 1000} s); systemarkitekten leser ${historikk} meldinger`
  })
  await punkt('X', 'ingen svar med 5xx fra databasen underveis', {}, async () => avslag.rapport())
} catch (feil) {
  utfall.push({ punkt: '–', hva: 'oppsettet', ok: false, merknad: feil instanceof Error ? feil.message : String(feil) })
} finally {
  await miljo.avslutt()
  tilbakestillBrytere()
}

console.log('\n| Punkt | Hva | Utfall | Merknad |\n| --- | --- | --- | --- |')
for (const u of utfall) console.log(`| ${u.punkt} | ${u.hva} | ${u.ok ? 'OK' : 'FEIL'} | ${u.merknad.replaceAll('|', '/')} |`)
process.exit(utfall.every((u) => u.ok) ? 0 : 1)
