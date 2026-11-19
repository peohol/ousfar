/**
 * Nettleserkontrollen av profilkortet ved hovering (docs/designsystem.md,
 * «Profilkortet») i det lokale testmiljøet (docs/qa-testmiljo.md), med de
 * syntetiske kontoene `qa-chat-ada` og `qa-chat-bo` i en gruppe med chat:
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/profilkortnettleser.ts
 *
 * Punktene: kortet ved Bos bilde og navn i gruppechatten, med stillingen Bo
 * har valgt, uten chatknapp når Bo ikke tillater direktemeldinger;
 * chatknappen når Bo gjør det, og en ny samtale fra kortet når Ada først må
 * slå på sine; kortet over dialogvinduet med medlemmene; ingen kort for en
 * selv; tastaturet; mobil og mørkt tema.
 */
import { randomBytes } from 'node:crypto'
import { arkiverTidligereGrupper, innen, klient, krev, lagKontroll, lukkChatmenyen, rpc, type Side } from './kontroll'
import { lokalSql, sikreAdministrator, sikreTestkonto, slaPaFunksjoner, startLokalDatabase } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('profilkortet')

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const pw = { ada: randomBytes(18).toString('base64url'), bo: randomBytes(18).toString('base64url') }
const adaId = await sikreTestkonto(s, 'qa-chat-ada', pw.ada, ['Ada', 'Testesen'])
const boId = await sikreTestkonto(s, 'qa-chat-bo', pw.bo, ['Bo', 'Prøvesen'])
// Et rent utgangspunkt: valgene, blokkeringene og samtalen mellom dem fra tidligere kjøringer.
const begge = `('${adaId}', '${boId}')`
lokalSql(s, `delete from public.chatvalg where bruker_id in ${begge}; delete from public.direktemelding_blokkeringer where blokkerer in ${begge};
  delete from public.direktesamtaler where bruker_lav in ${begge} and bruker_hoy in ${begge};
  update public.profiles set stilling_id = null where id in ${begge};`)
const tilbakestill = slaPaFunksjoner(s, 'gruppechat_aktivert', 'direktemeldinger_aktivert')
const miljo = await apneTestmiljo()

/** Kortet som står åpent, i det øverste laget. */
const kortet = (side: Side) => side.locator('.profilboble.tipsboble--klar')
/** Bos bilde ved meldingen i chatten. */
const bosBilde = (side: Side) => side.locator('.chatmelding__bilde .profilutlos').first()

/** Kortet kommer etter at pekeren har hvilt, og forsvinner når den går. */
async function hvil(side: Side, anker: ReturnType<Side['locator']>) {
  await anker.scrollIntoViewIfNeeded()
  await anker.hover()
  await kortet(side).waitFor({ timeout: 5_000 })
}

/** Det kortet sier, på én linje. */
const korttekst = async (side: Side) => ((await kortet(side).innerText()) as string).replace(/\s+/g, ' ').trim()

try {
  const admin = await klient(s, 'qa-admin', adminpassord)
  await arkiverTidligereGrupper(admin, 'Syntetisk profilkort')
  const adaK = await klient(s, 'qa-chat-ada', pw.ada)
  const boK = await klient(s, 'qa-chat-bo', pw.bo)
  const navn = `Syntetisk profilkort ${new Date().toISOString().slice(11, 19)}`
  const gruppe = await rpc<string>(admin, 'opprett_gruppe', { navn, beskrivelse: 'Nettleserkontroll (syntetisk).', fagmiljo: null })
  for (const brukernavn of ['qa-chat-ada', 'qa-chat-bo']) await rpc(admin, 'inviter_til_gruppe', { gruppe, brukernavn })
  await rpc(adaK, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  await rpc(boK, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  await rpc(boK, 'send_gruppemelding', { gruppe, klient_id: crypto.randomUUID(), tekst: 'Syntetisk melding fra Bo' })
  await rpc(adaK, 'send_gruppemelding', { gruppe, klient_id: crypto.randomUUID(), tekst: 'Syntetisk svar fra Ada' })

  const chat = `${miljo.url}/#/grupper/${gruppe}/chat`
  const ada: Side = paa(await miljo.brukerside('qa-chat-ada', pw.ada, { viewport: { width: 1440, height: 900 } }))
  /** En ny side, så svarene appen husker et minutt, hentes på nytt. Bare adressen etter # ville ikke lastet siden. */
  async function tilChatten(side: Side) {
    await side.goto(chat)
    await side.reload()
    await side.getByText('Syntetisk melding fra Bo').first().waitFor({ timeout: 30_000 })
  }

  await punkt('K1 kortet ved Bos bilde i gruppechatten, med stillingen og uten chatknapp', async () => {
    // Bo velger en stilling fra lista slik databasen har den.
    const { data: stillinger, error } = await boK.from('stillinger').select('id, navn').order('navn').limit(1)
    krev(!error && stillinger?.length, 'stillingslista kan leses')
    const stilling = stillinger![0] as { id: string; navn: string }
    await rpc(boK, 'sett_stilling', { bruker: boId, stilling: stilling.id })
    await tilChatten(ada)
    await hvil(ada, bosBilde(ada))
    const tekst = await korttekst(ada)
    krev(tekst.includes('Bo Prøvesen'), `hele navnet står på kortet («${tekst}»)`)
    krev((await kortet(ada).locator('.profilkort__stilling').innerText()) === stilling.navn, `stillingen «${stilling.navn}» står på kortet («${tekst}»)`)
    krev(/OUS|Sandkasse|fagmiljø/i.test(tekst), `fagmiljøet står på kortet («${tekst}»)`)
    krev((await kortet(ada).getByRole('button', { name: /^Chat med/ }).count()) === 0, 'ingen chatknapp når Bo ikke tillater direktemeldinger')
    const boks = await kortet(ada).boundingBox()
    krev(boks && boks.x >= 0 && boks.y >= 0 && boks.x + boks.width <= 1440 && boks.y + boks.height <= 900, 'kortet står helt i vinduet')
    await bilde(ada, '01-kort-uten-chat-pc')
    await ada.mouse.move(1300, 60)
    await innen(3_000, 'kortet lukkes når pekeren går', async () => (await kortet(ada).count()) === 0)
    return tekst
  })

  await punkt('K2 ingen kort for en selv', async () => {
    const egen = ada.locator('.chatmelding[data-egen] .chatmelding__navn')
    if ((await egen.count()) > 0) {
      krev((await egen.locator('.profilutlos__knapp').count()) === 0, 'eget navn er ingen knapp')
    }
    krev((await ada.locator('.chatmelding[data-egen] .chatmelding__bilde .profilutlos__knapp').count()) === 0, 'eget bilde er ingen knapp')
  })

  await punkt('K3 chatknappen når Bo tillater direktemeldinger, og en ny samtale fra kortet', async () => {
    await rpc(boK, 'sett_chatvalg', { tillat: true, vis_aktiv: null })
    await tilChatten(ada)
    await hvil(ada, bosBilde(ada))
    const knapp = kortet(ada).getByRole('button', { name: 'Chat med Bo' })
    await knapp.waitFor({ timeout: 10_000 })
    await bilde(ada, '02-kort-med-chat-pc')
    await knapp.click()
    // Ada har ikke slått på direktemeldinger: kortet spør først.
    const slaPa = kortet(ada).getByRole('button', { name: 'Slå på og start' })
    await slaPa.waitFor({ timeout: 5_000 })
    await bilde(ada, '03-kort-sla-pa-pc')
    await slaPa.click()
    // Tittelen viser det korte navnet; knappen i den har hele navnet.
    const tittel = ada.locator('.chatsamtale[data-direkte] .chatsamtale__tittel')
    await tittel.getByRole('button', { name: 'Bo Prøvesen, vis profilkortet' }).first().waitFor({ timeout: 15_000 })
    await bilde(ada, '04-direktesamtale-fra-kortet-pc')
    const samtaler = await rpc<{ motpart: { id: string } | null }[]>(adaK, 'mine_direktesamtaler')
    krev(samtaler.some((x) => x.motpart?.id === boId), 'samtalen med Bo finnes')
    const valg = await rpc<{ tillat_direktemeldinger: boolean }>(adaK, 'mine_chatvalg')
    krev(valg.tillat_direktemeldinger, 'Adas bryter er slått på')
  })

  await punkt('K4 kortet over dialogvinduet med medlemmene', async () => {
    await lukkChatmenyen(ada, { tilLista: true })
    await ada.goto(`${miljo.url}/#/grupper/${gruppe}`)
    await ada.reload()
    await ada.getByRole('button', { name: /Vis medlemmer/ }).click()
    const dialog = ada.getByRole('dialog').filter({ hasText: 'Bo Prøvesen' }).first()
    await dialog.waitFor({ timeout: 10_000 })
    const navnet = dialog.getByRole('button', { name: 'Bo Prøvesen, vis profilkortet' })
    await hvil(ada, navnet)
    const boks = await kortet(ada).boundingBox()
    krev(boks, 'kortet vises')
    const topp = await ada.evaluate(
      ([x, y]: [number, number]) => !!document.elementFromPoint(x, y)?.closest('.profilboble'),
      [boks.x + boks.width / 2, boks.y + Math.min(24, boks.height / 2)],
    )
    krev(topp, 'kortet ligger over dialogvinduet')
    await bilde(ada, '05-kort-over-medlemmene-pc')
  })

  await punkt('K5 tastaturet: Enter åpner, Escape lukker og gir fokus tilbake', async () => {
    const dialog = ada.getByRole('dialog').filter({ hasText: 'Bo Prøvesen' }).first()
    await ada.mouse.move(5, 5)
    await innen(3_000, 'kortet lukkes', async () => (await kortet(ada).count()) === 0)
    const navnet = dialog.getByRole('button', { name: 'Bo Prøvesen, vis profilkortet' })
    await navnet.focus()
    await ada.keyboard.press('Enter')
    await kortet(ada).waitFor({ timeout: 5_000 })
    await ada.keyboard.press('Tab')
    const iKortet = await ada.evaluate(() => !!document.activeElement?.closest('.profilboble'))
    krev(iKortet, 'Tab går inn i kortet, til chatknappen')
    await ada.keyboard.press('Escape')
    await innen(3_000, 'Escape lukker kortet', async () => (await kortet(ada).count()) === 0)
    const fokus = await ada.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
    krev(fokus === 'Bo Prøvesen, vis profilkortet', `fokus tilbake på navnet («${fokus}»)`)
    krev(await dialog.isVisible(), 'dialogvinduet står')
  })

  await punkt('K6 mobil og mørkt tema: et trykk på navnet fester kortet', async () => {
    const mobil: Side = paa(
      await miljo.brukerside('qa-chat-ada', pw.ada, { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, colorScheme: 'dark' }),
    )
    await tilChatten(mobil)
    const navnet = mobil.locator('.chatmelding__navn .profilutlos__knapp').first()
    await navnet.scrollIntoViewIfNeeded()
    await navnet.tap()
    await kortet(mobil).waitFor({ timeout: 5_000 })
    const boks = await kortet(mobil).boundingBox()
    krev(boks && boks.x >= 0 && boks.x + boks.width <= 390, 'kortet står innenfor skjermen')
    await bilde(mobil, '06-kort-mobil-moerkt')
    await mobil.locator('.chatmelding__tekst, .chatmelding__boble').first().tap().catch(() => mobil.mouse.click(200, 120))
    await innen(3_000, 'et trykk utenfor lukker kortet', async () => (await kortet(mobil).count()) === 0)
  })
} catch (e) {
  oppsettFeilet(e)
} finally {
  tilbakestill()
  await miljo.avslutt()
}
rapport()
