/**
 * Nettleserkontrollen av raden over overskriften på sidene med «Tilbake til …»
 * (`Tilbakelenke` i `grupper/gruppedeler.tsx`) og luften under toppmenyen på
 * mobil (`--sidetopp`), i det lokale testmiljøet (docs/qa-testmiljo.md):
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/tilbakeradnettleser.ts
 *
 * Punktene: på mobil står «Gruppeinnstillinger» på samme rad som lenken
 * tilbake, i hvert sitt hjørne, og gruppenavnet får en linje for seg selv uten
 * å brytes midt i ordet; lenken står tett under toppmenyen (også på oversikten
 * over gruppene, forsiden og søkesiden); det samme oppsettet på PC; i mørkt tema.
 */
import { randomBytes } from 'node:crypto'
import { sikreAdministrator, sikreTestkonto, startLokalDatabase } from './lokalmiljo'
import { arkiverTidligereGrupper, klient, krev, lagKontroll, rpc, type Side } from './kontroll'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('tilbakerad')
// Navnet fra skjermbildet som ble meldt: ett langt ord, som før ble brutt midt i.
const NAVN = 'Systemarkitekter'
// Høyst så mye luft mellom toppmenyen og det første på siden på mobil (px).
const MOBILLUFT = 32

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const pw = randomBytes(18).toString('base64url')
const adaId = await sikreTestkonto(s, 'qa-chat-ada', pw, ['Ada', 'Testesen'])
const miljo = await apneTestmiljo()

type Boks = { x: number; y: number; width: number; height: number }
const boks = async (side: Side, velger: string): Promise<Boks> => {
  const b = await side.locator(velger).first().boundingBox()
  krev(b, `${velger} vises`)
  return b
}
const midt = (b: Boks) => b.y + b.height / 2

/** Luften mellom bunnen av toppmenyen og toppen av `velger`. */
async function luftUnderMenyen(side: Side, velger: string): Promise<number> {
  const meny = await boks(side, '.toppmeny')
  return Math.round((await boks(side, velger)).y - (meny.y + meny.height))
}

/** Lenken og knappen står på én rad, lenken til venstre og knappen helt til høyre. */
async function iHvertSittHjorne(side: Side): Promise<string> {
  const rad = await boks(side, '.tilbakerad')
  const lenke = await boks(side, '.tilbakerad .tilbakelenke')
  const knapp = await boks(side, '.tilbakerad .knapp')
  krev(Math.abs(midt(lenke) - midt(knapp)) < 4, `samme rad (midt ${midt(lenke)} / ${midt(knapp)})`)
  krev(Math.abs(lenke.x - rad.x) < 2, 'lenken i venstre hjørne')
  krev(Math.abs(knapp.x + knapp.width - (rad.x + rad.width)) < 2, 'knappen i høyre hjørne')
  return `rad ${Math.round(rad.width)} px`
}

/** Gruppenavnet står på én linje: overskriften er ikke høyere enn én linje. */
async function navnetPaaEnLinje(side: Side): Promise<void> {
  const { hoyde, linje } = await side.locator('.gruppeside__tittel').evaluate((h: HTMLElement) => ({
    hoyde: h.getBoundingClientRect().height,
    linje: parseFloat(getComputedStyle(h).lineHeight),
  }))
  krev(hoyde < linje * 1.5, `navnet på én linje (${Math.round(hoyde)} px, linje ${Math.round(linje)} px)`)
}

try {
  const admin = await klient(s, 'qa-admin', adminpassord)
  await arkiverTidligereGrupper(admin, NAVN)
  const adaK = await klient(s, 'qa-chat-ada', pw)
  const gruppe = await rpc<string>(admin, 'opprett_gruppe', { navn: NAVN, beskrivelse: null, fagmiljo: null })
  await rpc(admin, 'inviter_til_gruppe', { gruppe, brukernavn: 'qa-chat-ada' })
  await rpc(adaK, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  await rpc(admin, 'sett_grupperolle', { gruppe, bruker: adaId, rolle: 'ansvarlig' })

  const mobil: Side = paa(
    await miljo.brukerside('qa-chat-ada', pw, { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }),
  )

  await punkt('T1 mobil: knappen ved lenken tilbake, navnet på en egen linje', async () => {
    paa(mobil)
    await mobil.goto(`${miljo.url}/#/grupper/${gruppe}`)
    await mobil.getByRole('heading', { name: NAVN }).waitFor({ timeout: 30_000 })
    const hjorner = await iHvertSittHjorne(mobil)
    await navnetPaaEnLinje(mobil)
    const luft = await luftUnderMenyen(mobil, '.tilbakerad')
    krev(luft <= MOBILLUFT, `lenken tett under menyen (${luft} px)`)
    await bilde(mobil, '01-gruppe-mobil')
    return `${hjorner}, ${luft} px under menyen`
  })

  await punkt('T2 mobil: oversikten over gruppene, forsiden og søket begynner tett under menyen', async () => {
    paa(mobil)
    await mobil.goto(`${miljo.url}/#/grupper`)
    await mobil.getByRole('heading', { name: 'Grupper', exact: true }).waitFor({ timeout: 30_000 })
    const oversikt = await luftUnderMenyen(mobil, '.tilbakerad')
    krev(oversikt <= MOBILLUFT, `oversikten (${oversikt} px)`)
    await bilde(mobil, '02-grupper-mobil')
    await mobil.goto(`${miljo.url}/#/`)
    await mobil.locator('.forside').waitFor({ timeout: 30_000 })
    const forside = await luftUnderMenyen(mobil, '.forside > *')
    krev(forside <= MOBILLUFT, `forsiden (${forside} px)`)
    await bilde(mobil, '03-forside-mobil')
    await mobil.goto(`${miljo.url}/#/sok`)
    await mobil.locator('.sokeside').waitFor({ timeout: 30_000 })
    const sok = await luftUnderMenyen(mobil, '.sokeside > *')
    krev(sok <= MOBILLUFT, `søkesiden (${sok} px)`)
    return `oversikten ${oversikt} px, forsiden ${forside} px, søkesiden ${sok} px`
  })

  await punkt('T3 mobil i mørkt tema', async () => {
    paa(mobil)
    await mobil.emulateMedia({ colorScheme: 'dark' })
    await mobil.goto(`${miljo.url}/#/grupper/${gruppe}`)
    await mobil.getByRole('heading', { name: NAVN }).waitFor({ timeout: 30_000 })
    await iHvertSittHjorne(mobil)
    await bilde(mobil, '04-gruppe-mobil-moerkt')
    await mobil.emulateMedia({ colorScheme: 'light' })
  })

  const pc: Side = paa(await miljo.brukerside('qa-chat-ada', pw, { viewport: { width: 1440, height: 900 } }))
  await punkt('T4 PC: det samme oppsettet, med luften som før', async () => {
    paa(pc)
    await pc.goto(`${miljo.url}/#/grupper/${gruppe}`)
    await pc.getByRole('heading', { name: NAVN }).waitFor({ timeout: 30_000 })
    const hjorner = await iHvertSittHjorne(pc)
    await navnetPaaEnLinje(pc)
    const luft = await luftUnderMenyen(pc, '.tilbakerad')
    krev(luft > MOBILLUFT, `PC beholder luften (${luft} px)`)
    await bilde(pc, '05-gruppe-pc')
    return `${hjorner}, ${luft} px under menyen`
  })
} catch (e) {
  oppsettFeilet(e)
} finally {
  await miljo.avslutt()
}
rapport()
