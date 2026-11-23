/**
 * Nettleserkontrollen av endringsloggen ti om gangen (issue #532,
 * docs/endringslogg.md «Slik får appen loggen»), i det lokale testmiljøet
 * (docs/qa-testmiljo.md):
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/endringsloggnettleser.ts
 *
 * Punktene: appen henter ingen side av loggen før den åpnes; loggen viser de
 * ti nyeste med fokus på den øverste; «Vis flere» henter ti til og flytter
 * fokuset til den første av dem, med tastaturet; på mobil og i mørkt tema.
 */
import { krev, lagKontroll, type Side } from './kontroll'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('endringslogg')
const PC = { viewport: { width: 1440, height: 900 } }
const MOBIL = { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }
/** Pakkene med sidene av loggen (`chunkFileNames` i `vite.config.ts`). */
const SIDEPAKKE = /\/assets\/klinisk-endringslogg-\d+-/

const miljo = await apneTestmiljo()

/** Pakkene med sider av loggen siden har hentet, fra nå av. */
function sidehentinger(side: Side): string[] {
  const hentet: string[] = []
  side.on('request', (f: { url(): string }) => {
    if (SIDEPAKKE.test(f.url())) hentet.push(f.url())
  })
  return hentet
}

const foringer = (side: Side) => side.locator('dialog[open] .logg__liste > li').count()

async function apneLoggen(side: Side) {
  // Et lag som står åpent fra før (det huskes), lukkes først.
  if (await side.locator('dialog[open]').count()) await side.keyboard.press('Escape')
  await side.goto(`${miljo.url}/#/`)
  const pille = side.locator('.versjonspille')
  await pille.waitFor({ timeout: 30_000 })
  await pille.click()
  await side.locator('dialog[open] .loggskuff').first().waitFor({ timeout: 15_000 })
}

try {
  const pc: Side = paa(await miljo.side(PC))

  await punkt('E1 ingen side av loggen før den åpnes, så de ti nyeste med fokus', async () => {
    const hentet = sidehentinger(pc)
    await pc.goto(`${miljo.url}/#/`)
    await pc.locator('.versjonspille').waitFor({ timeout: 30_000 })
    // Litt tid til det appen henter av seg selv når den står.
    await pc.waitForTimeout(3_000)
    krev(hentet.length === 0, `hentet før åpning: ${hentet.join(', ')}`)
    await pc.locator('.versjonspille').click()
    await pc.locator('dialog[open] .loggskuff').first().waitFor({ timeout: 15_000 })
    const antall = await foringer(pc)
    krev(antall === 10, `viser ${antall} føringer`)
    const fokus = await pc.evaluate(() => document.activeElement?.className)
    krev(fokus === 'loggskuff__tittel', `fokus på ${fokus}`)
    await bilde(pc, '01-ti-nyeste-pc')
    return `${antall} føringer, ${hentet.length} sidepakke(r) hentet ved åpning`
  })

  await punkt('E2 «Vis flere» med tastaturet henter ti til og flytter fokus til den første av dem', async () => {
    const knapp = pc.getByRole('button', { name: 'Vis flere' })
    await knapp.focus()
    await pc.keyboard.press('Enter')
    await pc.waitForFunction(() => document.querySelectorAll('dialog[open] .logg__liste > li').length === 20)
    const fokus = await pc.evaluate(() => {
      const titler = [...document.querySelectorAll('dialog[open] .loggskuff__tittel')]
      return titler.indexOf(document.activeElement as Element)
    })
    krev(fokus === 10, `fokus på føring ${fokus}`)
    await bilde(pc, '02-vis-flere-pc')
    return '20 føringer, fokus på nr. 11'
  })

  await punkt('E3 mørkt tema', async () => {
    await pc.emulateMedia({ colorScheme: 'dark' })
    await apneLoggen(pc)
    await pc.getByRole('button', { name: 'Vis flere' }).scrollIntoViewIfNeeded()
    await bilde(pc, '03-ti-nyeste-pc-moerkt')
    await pc.emulateMedia({ colorScheme: 'light' })
  })

  await punkt('E4 mobil', async () => {
    const mobil: Side = paa(await miljo.side(MOBIL))
    await apneLoggen(mobil)
    krev((await foringer(mobil)) === 10, 'ti føringer')
    await mobil.getByRole('button', { name: 'Vis flere' }).scrollIntoViewIfNeeded()
    await bilde(mobil, '04-vis-flere-mobil')
  })
} catch (e) {
  oppsettFeilet(e)
} finally {
  await miljo.avslutt()
}
rapport()
