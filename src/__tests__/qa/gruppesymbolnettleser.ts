/**
 * Nettleserkontrollen av gruppesymbolene (docs/fagmiljoer.md, «Gruppesymbolet»)
 * i det lokale testmiljøet (docs/qa-testmiljo.md), med de syntetiske kontoene
 * `qa-chat-ada` (ansvarlig) og `qa-chat-bo` (medlem) i hver sin nettleser, og
 * bryteren for chatten på mens den går:
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/gruppesymbolnettleser.ts
 *
 * Punktene: den ansvarlige velger en emoji og laster opp et bilde i
 * gruppeinnstillingene; tekst avvises som emoji; medlemmet ser symbolene i
 * «Mine grupper», samtalelista, hodet på gruppechatten og gruppeoversikten,
 * også på mobil og i mørkt tema; å fjerne bildet sletter fila og gir
 * gruppeikonet tilbake.
 */
import { randomBytes } from 'node:crypto'
import { lokalSql, sikreAdministrator, sikreTestkonto, slaPaFunksjoner, startLokalDatabase } from './lokalmiljo'
import { arkiverTidligereGrupper, innen, klient, krev, lagKontroll, lukkChatmenyen, rpc, vent, type Side } from './kontroll'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('gruppesymboler')
const PREFIKS = 'Syntetisk symbol '

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const pw = { ada: randomBytes(18).toString('base64url'), bo: randomBytes(18).toString('base64url') }
const adaId = await sikreTestkonto(s, 'qa-chat-ada', pw.ada, ['Ada', 'Testesen'])
await sikreTestkonto(s, 'qa-chat-bo', pw.bo, ['Bo', 'Prøvesen'])
const tilbakestillBrytere = slaPaFunksjoner(s, 'gruppechat_aktivert')
const miljo = await apneTestmiljo()

/** Antall filer i bøtta for gruppens symbol. */
const symbolfiler = (gruppe: string) => Number(lokalSql(s, `select count(*) from storage.objects where bucket_id = 'gruppesymboler' and name = '${gruppe}/symbol.webp'`))

/** Et syntetisk bilde (en fargeovergang med en sirkel), laget i nettleseren som PNG. */
async function lagBilde(side: Side): Promise<Buffer> {
  const data: string = await side.evaluate(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 400
    const x = c.getContext('2d')!
    const g = x.createLinearGradient(0, 0, 400, 400)
    g.addColorStop(0, '#2f6fb3')
    g.addColorStop(1, '#4fb38a')
    x.fillStyle = g
    x.fillRect(0, 0, 400, 400)
    x.fillStyle = '#ffffff'
    x.beginPath()
    x.arc(200, 200, 90, 0, Math.PI * 2)
    x.fill()
    return c.toDataURL('image/png')
  })
  return Buffer.from(data.split(',')[1]!, 'base64')
}

/** Åpner gruppeinnstillingene på gruppesiden; gir vinduet. */
async function innstillinger(side: Side, gruppe: string): Promise<Side> {
  await side.goto(`${miljo.url}/#/grupper/${gruppe}`)
  await side.getByRole('button', { name: 'Gruppeinnstillinger' }).click({ timeout: 30_000 })
  const vindu = side.getByRole('dialog', { name: /Gruppeinnstillinger/ })
  await vindu.getByRole('region', { name: 'Symbol' }).waitFor()
  return vindu
}

/** Lukker et vindu med Escape og venter til det er borte. */
async function lukk(side: Side, vindu: Side) {
  await side.keyboard.press('Escape')
  await innen(5_000, 'vinduet lukket', async () => !(await vindu.isVisible()))
}

/** Sant når et bilde i `rot` er lastet (ikke bare lenket). */
const bildetVises = (rot: Side) =>
  rot.locator('.gruppesymbol img').first().evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)

try {
  const admin = await klient(s, 'qa-admin', adminpassord)
  await arkiverTidligereGrupper(admin, PREFIKS)
  const adaK = await klient(s, 'qa-chat-ada', pw.ada)
  const boK = await klient(s, 'qa-chat-bo', pw.bo)
  const tid = new Date().toISOString().slice(11, 19)
  const emojinavn = `${PREFIKS}emoji ${tid}`
  const bildenavn = `${PREFIKS}bilde ${tid}`
  const grupper: string[] = []
  for (const navn of [emojinavn, bildenavn]) {
    const g = await rpc<string>(admin, 'opprett_gruppe', { navn, beskrivelse: 'Nettleserkontroll (syntetisk).', fagmiljo: null })
    for (const b of ['qa-chat-ada', 'qa-chat-bo']) await rpc(admin, 'inviter_til_gruppe', { gruppe: g, brukernavn: b })
    await rpc(adaK, 'svar_paa_gruppeinvitasjon', { gruppe: g, godta: true })
    await rpc(boK, 'svar_paa_gruppeinvitasjon', { gruppe: g, godta: true })
    await rpc(admin, 'sett_grupperolle', { gruppe: g, bruker: adaId, rolle: 'ansvarlig' })
    await rpc(boK, 'send_gruppemelding', { gruppe: g, klient_id: crypto.randomUUID(), tekst: 'Syntetisk hei' })
    grupper.push(g)
  }
  const [emojigruppe, bildegruppe] = grupper as [string, string]

  const ada: Side = paa(await miljo.brukerside('qa-chat-ada', pw.ada, { viewport: { width: 1440, height: 900 } }))
  await ada.goto(`${miljo.url}/#/`)
  await lukkChatmenyen(ada)

  await punkt('S1 den ansvarlige velger en emoji; tekst avvises', async () => {
    paa(ada)
    const vindu = await innstillinger(ada, emojigruppe)
    const symbol = vindu.getByRole('region', { name: 'Symbol' })
    await symbol.getByLabel('Annen emoji').fill('abc')
    await symbol.getByRole('button', { name: 'Bruk', exact: true }).click()
    await symbol.getByText('Skriv inn én emoji.').waitFor({ timeout: 5_000 })
    await symbol.getByLabel('Annen emoji').fill('')
    await symbol.getByRole('button', { name: '🧪' }).click()
    await vindu.getByText('Symbolet er lagret.').waitFor({ timeout: 10_000 })
    krev((await symbol.getByRole('button', { name: '🧪' }).getAttribute('aria-pressed')) === 'true', 'emojien er markert')
    krev((await symbol.locator('.gruppesymbol__emoji').first().innerText()) === '🧪', 'forhåndsvisningen viser emojien')
    await bilde(ada, '01-emoji-valgt-pc')
    await lukk(ada, vindu)
    await innen(10_000, 'emojien i tittelraden', async () => (await ada.locator('.gruppeside .gruppesymbol__emoji').first().innerText()) === '🧪')
    await bilde(ada, '02-gruppeside-emoji-pc')
  })

  await punkt('S2 den ansvarlige laster opp et bilde, beskåret til en sirkel', async () => {
    paa(ada)
    const vindu = await innstillinger(ada, bildegruppe)
    await vindu.locator('input[type="file"]').setInputFiles({ name: 'symbol.png', mimeType: 'image/png', buffer: await lagBilde(ada) })
    await vindu.getByRole('button', { name: 'Bruk bildet' }).waitFor()
    await bilde(ada, '03-beskjaering-pc')
    await vindu.getByRole('button', { name: 'Bruk bildet' }).click()
    await vindu.getByText('Symbolet er lagret.').waitFor({ timeout: 15_000 })
    krev(symbolfiler(bildegruppe) === 1, 'fila ligger i bøtta')
    await innen(10_000, 'bildet i forhåndsvisningen', () => bildetVises(vindu))
    await bilde(ada, '04-bilde-valgt-pc')
    await lukk(ada, vindu)
  })

  const bo: Side = paa(await miljo.brukerside('qa-chat-bo', pw.bo, { viewport: { width: 1440, height: 900 } }))
  await punkt('S3 medlemmet ser symbolene i chatmenyen og i hodet på gruppechatten', async () => {
    paa(bo)
    await bo.goto(`${miljo.url}/#/`)
    await lukkChatmenyen(bo, { tilLista: true })
    await bo.locator('.chatboble').click()
    const menyen = bo.getByRole('complementary', { name: 'Grupper og samtaler' })
    await menyen.getByRole('region', { name: 'Samtaler' }).waitFor()
    const mine = menyen.locator('.chatgrupper__lenke')
    await innen(15_000, 'emojien i Mine grupper', async () => (await mine.filter({ hasText: emojinavn }).locator('.gruppesymbol__emoji').innerText()) === '🧪')
    await innen(15_000, 'bildet i Mine grupper', () => bildetVises(mine.filter({ hasText: bildenavn })))
    const rader = menyen.locator('.chatrad')
    await innen(15_000, 'emojien i samtalelista', async () => (await rader.filter({ hasText: emojinavn }).locator('.gruppesymbol__emoji').innerText()) === '🧪')
    await innen(15_000, 'bildet i samtalelista', () => bildetVises(rader.filter({ hasText: bildenavn })))
    await bilde(bo, '05-chatmeny-pc')
    await menyen.getByRole('button', { name: new RegExp(bildenavn) }).click()
    await menyen.getByRole('log').waitFor()
    await innen(10_000, 'bildet i hodet på samtalen', () => bildetVises(menyen.locator('.chatsamtale__hode')))
    await bilde(bo, '06-samtale-bilde-pc')
    await menyen.getByRole('button', { name: 'Til alle samtaler' }).click()
  })

  await punkt('S4 medlemmet ser symbolene i gruppeoversikten, og har ingen symbolvelger', async () => {
    paa(bo)
    await bo.goto(`${miljo.url}/#/grupper`)
    const liste = bo.getByRole('region', { name: 'Gruppene dine' })
    await innen(20_000, 'emojien i oversikten', async () => (await liste.locator('li', { hasText: emojinavn }).locator('.gruppesymbol__emoji').innerText()) === '🧪')
    await innen(15_000, 'bildet i oversikten', () => bildetVises(liste.locator('li', { hasText: bildenavn })))
    await bilde(bo, '07-gruppeoversikt-pc')
    await bo.goto(`${miljo.url}/#/grupper/${emojigruppe}`)
    await bo.locator('.gruppeside .gruppesymbol__emoji').first().waitFor({ timeout: 20_000 })
    const knapp = bo.getByRole('button', { name: 'Gruppeinnstillinger' })
    if (await knapp.isVisible()) {
      await knapp.click()
      const vindu = bo.getByRole('dialog', { name: /Gruppeinnstillinger/ })
      await vindu.waitFor()
      krev((await vindu.getByRole('region', { name: 'Symbol' }).count()) === 0, 'et medlem ser ikke symbolvelgeren')
      await lukk(bo, vindu)
    }
  })

  const mobil: Side = await miljo.brukerside('qa-chat-bo', pw.bo, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await punkt('S5 mobil og mørkt tema', async () => {
    paa(mobil)
    await mobil.emulateMedia({ colorScheme: 'dark' })
    await mobil.goto(`${miljo.url}/#/`)
    const knapp = mobil.locator('.chatknapp button')
    await knapp.waitFor({ timeout: 30_000 })
    await knapp.click()
    const m = mobil.getByRole('complementary', { name: 'Grupper og samtaler' })
    await m.getByRole('region', { name: 'Samtaler' }).waitFor()
    await innen(15_000, 'bildet i samtalelista', () => bildetVises(m.locator('.chatrad', { hasText: bildenavn })))
    await bilde(mobil, '08-chatmeny-mobil-moerkt')
    await mobil.emulateMedia({ colorScheme: 'light' })
    await bilde(mobil, '09-chatmeny-mobil')
  })

  await punkt('S6 å fjerne bildet sletter fila og gir gruppeikonet tilbake', async () => {
    paa(ada)
    const vindu = await innstillinger(ada, bildegruppe)
    await vindu.getByRole('button', { name: 'Fjern symbolet' }).click()
    await vindu.getByText('Symbolet er fjernet.').waitFor({ timeout: 10_000 })
    await innen(10_000, 'fila er slettet', () => symbolfiler(bildegruppe) === 0)
    krev((await vindu.locator('.gruppesymbol__ikon').count()) > 0, 'gruppeikonet i forhåndsvisningen')
    await lukk(ada, vindu)
    await bo.goto(`${miljo.url}/#/grupper`)
    const rad = bo.getByRole('region', { name: 'Gruppene dine' }).locator('li', { hasText: bildenavn })
    await innen(20_000, 'gruppeikonet hos medlemmet', async () => (await rad.locator('.gruppesymbol__ikon').count()) > 0)
    await vent(300)
    await bilde(bo, '10-fjernet-pc')
  })
} catch (e) {
  oppsettFeilet(e)
} finally {
  tilbakestillBrytere()
  await miljo.avslutt()
}
rapport()
