/**
 * Nettleserkontrollen av knappene (issue #510, docs/designsystem.md
 * «Knapper»): det som er en handling, ser ut som en knapp og ikke som en lenke
 * eller vanlig tekst, i stil med «Åpne fortolkning». I det lokale testmiljøet
 * (docs/qa-testmiljo.md):
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/knappenettleser.ts
 *
 * Punktene: forsiden («Gå til gruppeoversikten», «Alle varsler», «Tilpass
 * forsiden»), gruppesiden («Tilbake til …», «Vis medlemmer», «Åpne …»),
 * samtalen i chatten («Til gruppen», «Gjenopprett», «Ny chat»), sidemenyen
 * («Åpne hele stoffregisteret») og fortolkningen («Til forsiden»), på PC, på
 * mobil og i mørkt tema.
 */
import { randomBytes } from 'node:crypto'
import { arkiverTidligereGrupper, klient, krev, lagKontroll, rpc, vent, type Side } from './kontroll'
import { sikreAdministrator, sikreTestkonto, slaPaFunksjoner, startLokalDatabase } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('knapper')
const NAVN = 'Knappegruppen'
const PC = { viewport: { width: 1440, height: 900 } }
const MOBIL = { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }

/**
 * Knappen med navnet `navn` ser ut som en knapp: den har en flate eller en
 * kant, ingen strek under teksten, og er høy nok til å treffe.
 */
async function serUtSomKnapp(side: Side, navn: string | RegExp, rolle: 'button' | 'link' = 'button'): Promise<string> {
  const knapp = side.getByRole(rolle, { name: navn, exact: typeof navn === 'string' }).first()
  await knapp.waitFor({ timeout: 30_000 })
  const stil = await knapp.evaluate((e: HTMLElement) => {
    const s = getComputedStyle(e)
    return {
      klasse: e.className,
      flate: s.backgroundColor,
      kant: parseFloat(s.borderTopWidth) > 0 && s.borderTopColor !== 'rgba(0, 0, 0, 0)',
      strek: s.textDecorationLine,
      hoyde: e.getBoundingClientRect().height,
    }
  })
  const harFlate = stil.flate !== 'rgba(0, 0, 0, 0)' && stil.flate !== 'transparent'
  krev(harFlate || stil.kant, `«${navn}» har verken flate eller kant (${stil.klasse})`)
  krev(!stil.strek.includes('underline'), `«${navn}» er understreket`)
  krev(stil.hoyde >= 32, `«${navn}» er bare ${Math.round(stil.hoyde)} px høy`)
  return `${navn}: ${stil.klasse.split(' ').find((k: string) => k.startsWith('knapp--')) ?? stil.klasse}`
}

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const pw = { ada: randomBytes(18).toString('base64url'), bo: randomBytes(18).toString('base64url') }
const adaId = await sikreTestkonto(s, 'qa-chat-ada', pw.ada, ['Ada', 'Testesen'])
await sikreTestkonto(s, 'qa-chat-bo', pw.bo, ['Bo', 'Testesen'])
const tilbakestillBrytere = slaPaFunksjoner(s, 'gruppechat_aktivert', 'direktemeldinger_aktivert')
const miljo = await apneTestmiljo()
try {
  const admin = await klient(s, 'qa-admin', adminpassord)
  await arkiverTidligereGrupper(admin, NAVN)
  const adaK = await klient(s, 'qa-chat-ada', pw.ada)
  const boK = await klient(s, 'qa-chat-bo', pw.bo)
  const gruppe = await rpc<string>(admin, 'opprett_gruppe', { navn: NAVN, beskrivelse: 'Syntetisk.', fagmiljo: null })
  for (const [brukernavn, k] of [
    ['qa-chat-ada', adaK],
    ['qa-chat-bo', boK],
  ] as const) {
    await rpc(admin, 'inviter_til_gruppe', { gruppe, brukernavn })
    await rpc(k, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  }
  await rpc(admin, 'sett_grupperolle', { gruppe, bruker: adaId, rolle: 'ansvarlig' })
  await rpc(boK, 'send_gruppemelding', { gruppe, klient_id: crypto.randomUUID(), tekst: 'Syntetisk melding fra Bo' })

  const pc: Side = paa(await miljo.brukerside('qa-chat-ada', pw.ada, PC))

  await punkt('K1 forsiden: «Gå til gruppeoversikten» og de andre er knapper, «Alle grupper» er borte', async () => {
    paa(pc)
    await pc.goto(`${miljo.url}/#/`)
    const knapp = pc.getByRole('link', { name: 'Gå til gruppeoversikten', exact: true })
    await knapp.waitFor({ timeout: 30_000 })
    krev((await knapp.getAttribute('href')) === '#/grupper', 'fører til gruppeoversikten')
    krev((await pc.getByText('Alle grupper', { exact: true }).count()) === 0, '«Alle grupper» står fortsatt')
    const svar = [
      await serUtSomKnapp(pc, 'Gå til gruppeoversikten', 'link'),
      // «Alle varsler» åpner varselvinduet, så den er en knapp og ikke en lenke.
      await serUtSomKnapp(pc, 'Alle varsler'),
      await serUtSomKnapp(pc, 'Tilpass forsiden'),
    ]
    await bilde(pc, '01-forside-pc')
    return svar.join(', ')
  })

  await punkt('K2 gruppesiden: «Tilbake til …», «Vis medlemmer» og «Åpne …» er knapper', async () => {
    paa(pc)
    await pc.goto(`${miljo.url}/#/grupper/${gruppe}`)
    await pc.getByRole('heading', { name: NAVN }).waitFor({ timeout: 30_000 })
    const svar = [
      await serUtSomKnapp(pc, /^Tilbake til/),
      await serUtSomKnapp(pc, /Vis medlemmer/),
      await serUtSomKnapp(pc, 'Gruppeinnstillinger'),
      await serUtSomKnapp(pc, 'Åpne idéer', 'link'),
      await serUtSomKnapp(pc, 'Åpne chat'),
    ]
    await bilde(pc, '02-gruppe-pc')
    return svar.join(', ')
  })

  await punkt('K3 samtalen: «Til gruppen», «Gjenopprett» og «Ny chat» er knapper', async () => {
    paa(pc)
    await pc.goto(`${miljo.url}/#/chat/gruppe/${gruppe}`)
    const svar = [
      await serUtSomKnapp(pc, 'Til gruppen', 'link'),
      await serUtSomKnapp(pc, 'Gjenopprett'),
      await serUtSomKnapp(pc, 'Ny chat'),
    ]
    await bilde(pc, '03-samtale-pc')
    return svar.join(', ')
  })

  await punkt('K4 sidemenyen: «Åpne hele stoffregisteret» er en knapp; menyvalgene er som før', async () => {
    paa(pc)
    await pc.goto(`${miljo.url}/#/`)
    await pc.locator('button.menyknapp').click()
    const meny = pc.getByRole('navigation', { name: 'Meny' })
    await meny.getByRole('tab', { name: 'Stoffregister' }).click()
    await vent(500)
    const svar = await serUtSomKnapp(pc, 'Åpne hele stoffregisteret', 'link')
    // Et menyvalg er ikke en knapp: kategoriene beholder utseendet.
    const kategori = await meny.locator('.menyskuff__tittel').first().evaluate((e: HTMLElement) => getComputedStyle(e).backgroundColor)
    krev(kategori === 'rgba(0, 0, 0, 0)', `menyvalgene har fått flate (${kategori})`)
    await bilde(pc, '04-sidemeny-pc')
    await pc.keyboard.press('Escape')
    return svar
  })

  await punkt('K5 fortolkningen: «Til forsiden» er en knapp', async () => {
    paa(pc)
    await pc.goto(`${miljo.url}/#/fortolkning`)
    const svar = await serUtSomKnapp(pc, 'Til forsiden')
    await bilde(pc, '05-fortolkning-pc')
    return svar
  })

  const mobil: Side = paa(await miljo.brukerside('qa-chat-ada', pw.ada, MOBIL))
  await punkt('K6 mobil: forsiden, gruppesiden og samtalen', async () => {
    paa(mobil)
    await mobil.goto(`${miljo.url}/#/`)
    const svar = [await serUtSomKnapp(mobil, 'Gå til gruppeoversikten', 'link')]
    await mobil.getByRole('link', { name: 'Gå til gruppeoversikten' }).scrollIntoViewIfNeeded()
    await bilde(mobil, '06-forside-mobil')
    await mobil.goto(`${miljo.url}/#/grupper/${gruppe}`)
    svar.push(await serUtSomKnapp(mobil, /^Tilbake til/))
    await bilde(mobil, '07-gruppe-mobil')
    await mobil.goto(`${miljo.url}/#/chat/gruppe/${gruppe}`)
    svar.push(await serUtSomKnapp(mobil, 'Til gruppen', 'link'))
    await bilde(mobil, '08-samtale-mobil')
    return svar.join(', ')
  })

  await punkt('K7 mørkt tema: forsiden og gruppesiden', async () => {
    paa(pc)
    await pc.emulateMedia({ colorScheme: 'dark' })
    await pc.goto(`${miljo.url}/#/`)
    const svar = [await serUtSomKnapp(pc, 'Gå til gruppeoversikten', 'link'), await serUtSomKnapp(pc, 'Tilpass forsiden')]
    await bilde(pc, '09-forside-pc-moerkt')
    await pc.goto(`${miljo.url}/#/grupper/${gruppe}`)
    svar.push(await serUtSomKnapp(pc, /^Tilbake til/))
    await bilde(pc, '10-gruppe-pc-moerkt')
    await pc.emulateMedia({ colorScheme: 'light' })
    return svar.join(', ')
  })
} catch (e) {
  oppsettFeilet(e)
} finally {
  tilbakestillBrytere()
  await miljo.avslutt()
}
rapport()
