/**
 * Nettleserkontrollen av personsøket (docs/fagmiljoer.md, «Personsøket») i
 * det lokale testmiljøet (docs/qa-testmiljo.md), med de syntetiske kontoene
 * `qa-admin`, `qa-chat-ada` og `qa-chat-bo`:
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/personsoknettleser.ts
 *
 * Punktene: invitasjonen til en gruppe finner Bo på navnet med en skrivefeil
 * og inviterer med tastaturet; «Legg til medlem» under «Brukere» søker i
 * fagmiljøet som vises og tilbyr det nøyaktige brukernavnet når ingen finnes;
 * «Ny direktemelding» finner Bo på fornavn og etternavn; mobil og mørkt tema.
 */
import { randomBytes } from 'node:crypto'
import { arkiverTidligereGrupper, innen, klient, krev, lagKontroll, rpc, type Side } from './kontroll'
import { lokalSql, sikreAdministrator, sikreTestkonto, slaPaFunksjoner, startLokalDatabase } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('personsøket')

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const pw = { ada: randomBytes(18).toString('base64url'), bo: randomBytes(18).toString('base64url') }
const adaId = await sikreTestkonto(s, 'qa-chat-ada', pw.ada, ['Ada', 'Testesen'])
const boId = await sikreTestkonto(s, 'qa-chat-bo', pw.bo, ['Bo', 'Prøvesen'])
const begge = `('${adaId}', '${boId}')`
lokalSql(s, `delete from public.chatvalg where bruker_id in ${begge}; delete from public.direktemelding_blokkeringer where blokkerer in ${begge};
  delete from public.direktesamtaler where bruker_lav in ${begge} and bruker_hoy in ${begge};`)
const tilbakestill = slaPaFunksjoner(s, 'gruppechat_aktivert', 'direktemeldinger_aktivert')
const miljo = await apneTestmiljo()

/** Navnene på treffene som vises nå. */
const treffene = async (side: Side): Promise<string[]> =>
  ((await side.locator('.personsok__treff [role="option"] .personsok__navn').allInnerTexts()) as string[]).map((t) => t.trim())

try {
  const admin = await klient(s, 'qa-admin', adminpassord)
  await arkiverTidligereGrupper(admin, 'Syntetisk personsøk')
  const adaK = await klient(s, 'qa-chat-ada', pw.ada)
  const boK = await klient(s, 'qa-chat-bo', pw.bo)
  const fagmiljo = lokalSql(s, `select id from public.fagmiljoer where standard`).trim()
  const navn = `Syntetisk personsøk ${new Date().toISOString().slice(11, 19)}`
  const gruppe = await rpc<string>(admin, 'opprett_gruppe', { navn, beskrivelse: 'Nettleserkontroll (syntetisk).', fagmiljo })
  const sa: Side = paa(await miljo.brukerside('qa-admin', adminpassord, { viewport: { width: 1440, height: 900 } }))

  await punkt('P1 gruppen: Bo finnes på navnet med en skrivefeil, og inviteres med Enter', async () => {
    await sa.goto(`${miljo.url}/#/grupper/${gruppe}`)
    await sa.getByRole('heading', { name: navn }).waitFor({ timeout: 30_000 })
    await sa.getByRole('button', { name: /Vis medlemmer/ }).click()
    const vindu = sa.getByRole('dialog', { name: 'Medlemmer' })
    await vindu.waitFor()
    const felt = vindu.getByRole('combobox', { name: 'Inviter' })
    await felt.fill('provesn')
    await innen(5_000, 'Bo i treffene', async () => (await treffene(sa)).includes('Bo Prøvesen'))
    const linje = await vindu.locator('[role="option"] .personsok__linje').first().innerText()
    krev(linje.includes('@qa-chat-bo'), `linja under navnet («${linje}»)`)
    await bilde(sa, '01-gruppe-inviter-pc')
    await felt.press('Enter')
    await vindu.getByText('Bo Prøvesen er invitert.').waitFor({ timeout: 10_000 })
    await innen(5_000, 'Bo venter på svar', async () => (await vindu.getByRole('list', { name: `Inviterte til ${navn}` }).getByText('Bo Prøvesen').count()) > 0)
    krev((await felt.inputValue()) === '', 'feltet tømt')
    await felt.fill('bo prøv')
    await innen(5_000, 'Bo er borte fra treffene', async () => (await sa.getByText('Ingen treff.').count()) > 0)
    await bilde(sa, '02-gruppe-invitert-pc')
    await sa.keyboard.press('Escape')
    await sa.keyboard.press('Escape')
    return linje
  })

  await punkt('P2 «Legg til medlem» søker i fagmiljøet som vises, og tilbyr det nøyaktige brukernavnet', async () => {
    await sa.goto(`${miljo.url}/#/`)
    await sa.keyboard.press('Control+m')
    const meny = sa.getByRole('navigation', { name: 'Meny' })
    await meny.getByRole('button', { name: /^Administrasjon/ }).click()
    await meny.getByRole('button', { name: 'Brukere' }).click()
    const vindu = sa.getByRole('dialog', { name: 'Brukere' })
    await vindu.waitFor({ timeout: 10_000 })
    await vindu.getByRole('button', { name: 'Legg til medlem' }).click()
    const felt = vindu.getByRole('combobox', { name: 'Legg til medlem' })
    krev(await felt.evaluate((e: Element) => e === document.activeElement), 'feltet har fokus')
    // Ada er alt medlem av standardfagmiljøet, så hun er ikke med i treffene.
    await felt.fill('ada testsen')
    await innen(5_000, 'svaret', async () => (await sa.getByText('Ingen treff.').count()) + (await treffene(sa)).length > 0)
    krev(!(await treffene(sa)).includes('Ada Testesen'), 'Ada (alt medlem) i treffene')
    await felt.fill('qa-ukjent.konto')
    await innen(5_000, 'valget for brukernavnet', async () => (await vindu.getByRole('option', { name: /Bruk brukernavnet «qa-ukjent\.konto»/ }).count()) > 0)
    await bilde(sa, '03-brukere-legg-til-pc')
    await vindu.getByRole('button', { name: 'Avbryt' }).click()
    await sa.keyboard.press('Escape')
  })

  await punkt('P3 «Ny direktemelding» finner Bo på fornavn og etternavn', async () => {
    await rpc(adaK, 'sett_chatvalg', { tillat: true, vis_aktiv: null })
    await rpc(boK, 'sett_chatvalg', { tillat: true, vis_aktiv: null })
    const ada: Side = paa(await miljo.brukerside('qa-chat-ada', pw.ada, { viewport: { width: 1440, height: 900 } }))
    await ada.goto(`${miljo.url}/#/chat`)
    await ada.getByRole('button', { name: 'Ny chat' }).first().click()
    const felt = ada.getByRole('combobox', { name: 'Søk etter navn eller brukernavn' })
    await felt.waitFor({ timeout: 10_000 })
    await felt.fill('bo prøvesen')
    await innen(5_000, 'Bo i treffene', async () => (await treffene(ada)).includes('Bo Prøvesen'))
    await bilde(ada, '04-ny-direktemelding-pc')
    await ada.emulateMedia({ colorScheme: 'dark' })
    await bilde(ada, '05-ny-direktemelding-pc-moerkt')
  })

  await punkt('P4 mobil: invitasjonen i gruppen', async () => {
    const mobil: Side = paa(await miljo.brukerside('qa-admin', adminpassord, { viewport: { width: 390, height: 844 } }))
    await mobil.goto(`${miljo.url}/#/grupper/${gruppe}`)
    await mobil.getByRole('heading', { name: navn }).waitFor({ timeout: 30_000 })
    await mobil.getByRole('button', { name: /Vis medlemmer/ }).click()
    const felt = mobil.getByRole('dialog', { name: 'Medlemmer' }).getByRole('combobox', { name: 'Inviter' })
    await felt.fill('ada')
    await innen(5_000, 'Ada i treffene', async () => (await treffene(mobil)).includes('Ada Testesen'))
    await bilde(mobil, '06-gruppe-inviter-mobil')
  })
} catch (e) {
  oppsettFeilet(e)
} finally {
  tilbakestill()
  await miljo.avslutt()
}
rapport()
