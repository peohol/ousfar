/**
 * Nettleserkontrollen av diskusjonene i sanntid (docs/diskusjoner.md,
 * «Sanntiden») i det lokale testmiljøet (docs/qa-testmiljo.md). Ada har
 * gruppesiden åpen i nettleseren; Bo skriver gjennom databasen, som appen
 * gjør, med sin egen innlogging:
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/diskusjonsnettleser.ts
 *
 * L1 Bos kommentar kommer opp i tråden Ada har åpen, uten at siden lastes.
 * L2 Bos nye tråd kommer opp i lista Ada ser.
 * L3 Med menyen lukket får boblen merket for noe nytt når Bo skriver.
 *
 * At den som mister tilgangen ikke får flere hendelser, prøves uten nettleser
 * i `diskusjonssanntid.ts`.
 */
import { randomBytes } from 'node:crypto'
import { sikreAdministrator, sikreTestkonto, startLokalDatabase } from './lokalmiljo'
import { arkiverTidligereGrupper, innen, klient, krev, lagKontroll, rpc, vent, type Side } from './kontroll'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('diskusjoner i sanntid')
const PREFIKS = 'Syntetisk diskusjon '
const DOK = (tekst: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tekst }] }] })

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const pw = { ada: randomBytes(18).toString('base64url'), bo: randomBytes(18).toString('base64url') }
await sikreTestkonto(s, 'qa-chat-ada', pw.ada, ['Ada', 'Testesen'])
await sikreTestkonto(s, 'qa-chat-bo', pw.bo, ['Bo', 'Prøvesen'])
const miljo = await apneTestmiljo()

try {
  const admin = await klient(s, 'qa-admin', adminpassord)
  await arkiverTidligereGrupper(admin, PREFIKS)
  const adaK = await klient(s, 'qa-chat-ada', pw.ada)
  const boK = await klient(s, 'qa-chat-bo', pw.bo)
  const navn = `${PREFIKS}${new Date().toISOString().slice(11, 19)}`
  const gruppe = await rpc<string>(admin, 'opprett_gruppe', { navn, beskrivelse: 'Nettleserkontroll (syntetisk).', fagmiljo: null })
  for (const b of ['qa-chat-ada', 'qa-chat-bo']) await rpc(admin, 'inviter_til_gruppe', { gruppe, brukernavn: b })
  await rpc(adaK, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  await rpc(boK, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  const side = `gruppe:${gruppe}`
  const traad = await rpc<string>(adaK, 'opprett_diskusjon', {
    side, tittel: 'Syntetisk dosering', tekst: DOK('Syntetisk spørsmål om dosering.'), kategori: null, ny_kategori: 'Syntetisk', ny_emoji: '🧪',
  })
  const kommenter = async (tekst: string, traaden = traad) => {
    const { error } = await boK.from('diskusjonskommentarer').insert({ diskusjon_id: traaden, tekst: DOK(tekst) })
    if (error) throw new Error(error.message)
  }

  const ada: Side = paa(await miljo.brukerside('qa-chat-ada', pw.ada, { viewport: { width: 1440, height: 900 } }))
  await ada.goto(`${miljo.url}/#/grupper/${gruppe}`)
  const panel = ada.locator('.diskusjonspanel')
  const boble = ada.locator('.diskusjonsboble')
  await ada.locator('.diskusjonsboble:visible, .diskusjonspanel:visible').first().waitFor({ timeout: 30_000 })
  await vent(1500)
  if (!(await panel.isVisible())) await boble.click()
  await panel.locator('.traadknapp', { hasText: 'Syntetisk dosering' }).click({ timeout: 20_000 })
  await panel.getByText('Syntetisk spørsmål om dosering.').waitFor({ timeout: 20_000 })
  // Realtime lytter på databasen litt etter at kanalen er tilkoblet første gang.
  await vent(3000)

  await punkt('L1 Bos kommentar kommer opp i tråden Ada har åpen, uten at siden lastes', async () => {
    paa(ada)
    const start = Date.now()
    await kommenter('Syntetisk svar fra Bo i sanntid.')
    await panel.getByText('Syntetisk svar fra Bo i sanntid.').waitFor({ timeout: 15_000 })
    const tid = Date.now() - start
    await vent(300)
    await bilde(ada, '01-kommentar-i-sanntid-pc')
    return `etter ${tid} ms`
  })

  await punkt('L2 Bos nye tråd kommer opp i lista Ada ser', async () => {
    paa(ada)
    await panel.getByRole('button', { name: 'Alle tråder' }).click()
    await panel.locator('.traadknapp', { hasText: 'Syntetisk dosering' }).waitFor()
    await rpc(boK, 'opprett_diskusjon', { side, tittel: 'Syntetisk ny tråd fra Bo', tekst: null, kategori: null, ny_kategori: 'Fra Bo', ny_emoji: '🧭' })
    await panel.locator('.traadknapp', { hasText: 'Syntetisk ny tråd fra Bo' }).waitFor({ timeout: 15_000 })
    await vent(300)
    await bilde(ada, '02-ny-traad-i-sanntid-pc')
  })

  await punkt('L3 med menyen lukket får boblen merket for noe nytt når Bo skriver', async () => {
    paa(ada)
    await panel.locator('.traadknapp', { hasText: 'Syntetisk dosering' }).click()
    await panel.getByText('Syntetisk svar fra Bo i sanntid.').waitFor()
    await panel.getByRole('button', { name: 'Alle tråder' }).click()
    await panel.getByRole('button', { name: 'Lukk diskusjonene' }).click()
    await boble.waitFor()
    const merke = boble.locator('.nyttmerke')
    const for_ = (await merke.count()) ? Number(await merke.innerText()) : 0
    await kommenter('Syntetisk enda et svar fra Bo.')
    await innen(15_000, 'merket på boblen øker', async () => (await merke.count()) > 0 && Number(await merke.innerText()) > for_)
    await bilde(ada, '03-boble-med-nytt-pc')
    krev((await boble.getAttribute('aria-label'))?.includes('med nytt'), 'boblen sier at noe er nytt')
  })
} catch (e) {
  oppsettFeilet(e)
} finally {
  await miljo.avslutt()
}
rapport()
