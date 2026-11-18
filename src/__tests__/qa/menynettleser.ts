/**
 * Nettleserkontrollen av D6 (toppmenyen, hovedmenyen, kontomenyen,
 * Innstillinger og oversikten over endringsforslag) i det lokale testmiljøet
 * (docs/qa-testmiljo.md): systemarkitekten `qa-admin` og den vanlige,
 * syntetiske brukeren `qa-meny-vanlig`, på PC og mobil, i lyst og mørkt tema.
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/menynettleser.ts
 */
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { sikreAdministrator, sikreTestkonto, startLokalDatabase } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Side = any
const logg = (t: string) => console.log(`[meny] ${t}`)
const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

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
    await vent(150)
  }
  throw new Error(`Ikke innen ${ms / 1000} s: ${hva}`)
}

/** Navnene på knappene i selve toppmenyen, uten hovedmenyen og nedtrekkene som henger i den. */
const toppknapper = (side: Side): Promise<string[]> =>
  side.evaluate(() =>
    [...document.querySelectorAll('nav[aria-label="Toppmeny"] button')]
      .filter((k) => !k.closest('.sidemeny, .nedtrekk__panel, .toppmeny__kontekst') && (k as HTMLElement).offsetParent !== null)
      .map((k) => k.getAttribute('aria-label') ?? k.textContent ?? ''),
  )
const fokusNavn = (side: Side): Promise<string> => side.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? '')
const hovedmenyApen = async (side: Side) => (await side.locator('nav.sidemeny').getAttribute('data-apen')) === 'ja'

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const vanligpassord = randomBytes(18).toString('base64url')
await sikreTestkonto(s, 'qa-meny-vanlig', vanligpassord, ['Vera', 'Vanlig'])
const miljo = await apneTestmiljo()
try {
  const admin: Side = await miljo.brukerside('qa-admin', adminpassord, { viewport: { width: 1440, height: 900 } })
  await admin.goto(`${miljo.url}/#/`)
  const menyknapp = admin.locator('button.menyknapp')
  await menyknapp.waitFor({ timeout: 30_000 })
  const meny = admin.getByRole('navigation', { name: 'Meny' })

  await punkt('M1 toppmenyen har bare hovedmeny, fagsøk, varsler og konto; hovedmenyen har alt for systemarkitekten', async () => {
    const knapper = await toppknapper(admin)
    krev(!knapper.some((k) => /Idéer|Administrasjon/.test(k)), `toppmenyen: ${knapper.join(' | ')}`)
    await admin.keyboard.press('Control+m')
    await innen(3_000, 'menyen åpen', () => hovedmenyApen(admin))
    for (const navn of ['Forsiden', 'Fortolkning', 'Grupper', 'Endringsforslag'])
      krev(await meny.getByRole('link', { name: new RegExp(`^${navn}`) }).isVisible(), `lenken ${navn}`)
    for (const navn of ['Idéer for appen', 'Planlagte oppgaver', 'Administrasjon'])
      krev(await meny.getByRole('button', { name: new RegExp(`^${navn}`) }).isVisible(), `valget ${navn}`)
    krev(await meny.getByRole('tab', { name: 'Stoffregister' }).isVisible(), 'fanene står under')
    await bilde(admin, '01-hovedmeny-pc')
    return knapper.join(' | ')
  })

  await punkt('M2 administrasjonen folder ut, åpner samme vindu, og Escape gir fokus tilbake til menyknappen', async () => {
    await meny.getByRole('button', { name: /^Administrasjon/ }).click()
    const brukere = meny.getByRole('button', { name: 'Brukere' })
    await brukere.waitFor({ timeout: 3_000 })
    await bilde(admin, '02-administrasjon-pc')
    await brukere.click()
    const vindu = admin.getByRole('dialog')
    await vindu.first().waitFor({ timeout: 10_000 })
    krev(!(await hovedmenyApen(admin)), 'hovedmenyen lukket')
    await admin.keyboard.press('Escape')
    await innen(3_000, 'vinduet lukket', async () => (await admin.locator('dialog[open]').count()) === 0)
    krev((await fokusNavn(admin)).startsWith('Vis menyen'), `fokus på ${await fokusNavn(admin)}`)
  })

  await punkt('M3 idéene fra hovedmenyen; Escape i hovedmenyen lukker den', async () => {
    await admin.keyboard.press('Control+m')
    await innen(3_000, 'menyen åpen', () => hovedmenyApen(admin))
    await meny.getByRole('button', { name: /^Idéer for appen/ }).click()
    await admin.getByRole('dialog', { name: 'Idéer' }).waitFor({ timeout: 10_000 })
    await admin.keyboard.press('Escape')
    await innen(3_000, 'idéene lukket', async () => (await admin.locator('dialog[open]').count()) === 0)
    await admin.keyboard.press('Control+m')
    await innen(3_000, 'menyen åpen', () => hovedmenyApen(admin))
    await admin.keyboard.press('Escape')
    await innen(3_000, 'menyen lukket', async () => !(await hovedmenyApen(admin)))
    krev((await fokusNavn(admin)).startsWith('Vis menyen'), `fokus på ${await fokusNavn(admin)}`)
  })

  await punkt('M4 kontomenyen uten Grupper, og Innstillinger som vindu', async () => {
    await admin.getByRole('button', { name: /^Kontoen din/ }).click()
    const konto = admin.getByRole('group', { name: 'Konto' })
    await konto.waitFor()
    const valg: string[] = await konto.getByRole('button').allInnerTexts()
    krev(!valg.some((v) => /^Grupper|^Preferanser/.test(v)), `kontomenyen: ${valg.join(' | ')}`)
    await bilde(admin, '03-konto-pc')
    await konto.getByRole('button', { name: 'Innstillinger' }).click()
    const vindu = admin.getByRole('dialog', { name: 'Innstillinger' })
    await vindu.waitFor()
    krev(await vindu.getByRole('switch', { name: 'Vis hurtigtaster' }).isVisible(), 'hurtigtastene')
    krev(await vindu.getByRole('slider', { name: 'Tema' }).isVisible(), 'temaet')
    await bilde(admin, '04-innstillinger-pc')
    await admin.keyboard.press('Escape')
    await innen(3_000, 'lukket', async () => !(await vindu.isVisible()))
    krev((await fokusNavn(admin)).startsWith('Kontoen din'), `fokus på ${await fokusNavn(admin)}`)
    return valg.map((v) => v.split('\n')[0]).join(' | ')
  })

  await punkt('M5 mørkt tema: hovedmenyen og Innstillinger', async () => {
    await admin.emulateMedia({ colorScheme: 'dark' })
    await admin.keyboard.press('Control+m')
    await innen(3_000, 'menyen åpen', () => hovedmenyApen(admin))
    await bilde(admin, '05-hovedmeny-pc-moerkt')
    await admin.keyboard.press('Escape')
    await admin.getByRole('button', { name: /^Kontoen din/ }).click()
    await admin.getByRole('group', { name: 'Konto' }).getByRole('button', { name: 'Innstillinger' }).click()
    await admin.getByRole('dialog', { name: 'Innstillinger' }).waitFor()
    await bilde(admin, '06-innstillinger-pc-moerkt')
    await admin.keyboard.press('Escape')
    await admin.emulateMedia({ colorScheme: 'light' })
  })

  await punkt('M6 endringsforslagene viser det som venter på deg først', async () => {
    await admin.goto(`${miljo.url}/#/forslag`)
    const oversikt = admin.getByRole('region', { name: 'Det som venter på deg' })
    await oversikt.waitFor({ timeout: 15_000 })
    const tall: string[] = await oversikt.getByRole('link').allInnerTexts()
    await bilde(admin, '07-forslag-pc')
    return tall.map((t) => t.replace('\n', ' ')).join(' | ')
  })

  const vanlig: Side = await miljo.brukerside('qa-meny-vanlig', vanligpassord, { viewport: { width: 1440, height: 900 } })
  await punkt('M7 en vanlig bruker har ikke Planlagte oppgaver eller Administrasjon', async () => {
    await vanlig.goto(`${miljo.url}/#/`)
    await vanlig.locator('button.menyknapp').waitFor({ timeout: 30_000 })
    await vanlig.keyboard.press('Control+m')
    const m = vanlig.getByRole('navigation', { name: 'Meny' })
    await innen(3_000, 'menyen åpen', () => hovedmenyApen(vanlig))
    krev(await m.getByRole('button', { name: /^Idéer for appen/ }).isVisible(), 'idéene')
    krev((await m.getByRole('button', { name: /^Planlagte oppgaver/ }).count()) === 0, 'Planlagte oppgaver vises')
    krev((await m.getByRole('button', { name: /^Administrasjon/ }).count()) === 0, 'Administrasjon vises')
    await bilde(vanlig, '08-hovedmeny-vanlig-pc')
    await vanlig.keyboard.press('Escape')
  })

  const mobil: Side = await miljo.brukerside('qa-meny-vanlig', vanligpassord, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  await punkt('M8 mobil: dokken som før, hovedmenyen fyller skjermen, lyst og mørkt', async () => {
    await mobil.goto(`${miljo.url}/#/forslag`)
    await mobil.getByRole('region', { name: 'Det som venter på deg' }).waitFor({ timeout: 30_000 })
    await innen(3_000, 'dokken', async () => mobil.evaluate(() => document.documentElement.hasAttribute('data-dokk')))
    await bilde(mobil, '09-forslag-mobil')
    await mobil.locator('button.menyknapp').click()
    await innen(3_000, 'menyen åpen', () => hovedmenyApen(mobil))
    const bredde: number = await mobil.locator('nav.sidemeny').evaluate((e: Element) => e.getBoundingClientRect().width)
    krev(bredde >= 380, `bredden ${bredde}`)
    await bilde(mobil, '10-hovedmeny-mobil')
    await mobil.emulateMedia({ colorScheme: 'dark' })
    await bilde(mobil, '11-hovedmeny-mobil-moerkt')
    await mobil.emulateMedia({ colorScheme: 'light' })
    await mobil.getByRole('button', { name: 'Lukk menyen' }).click()
    await innen(3_000, 'menyen lukket', async () => !(await hovedmenyApen(mobil)))
    return `${bredde} px`
  })
} finally {
  await miljo.avslutt()
  console.log('\nRESULTAT')
  for (const u of utfall) console.log(`${u.ok ? 'OK  ' : 'FEIL'} ${u.punkt} ${u.merknad}`)
  process.exit(utfall.every((u) => u.ok) ? 0 : 1)
}
