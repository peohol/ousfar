/**
 * Nettleserkontrollen av den hierarkiske hovedmenyen (Issue #604,
 * `docs/navigasjon.md`, «Hovedmenyen») i det lokale testmiljøet
 * (docs/qa-testmiljo.md): systemarkitekten `qa-admin` og den vanlige,
 * syntetiske brukeren `qa-meny-vanlig`, på PC og mobil (også en liten
 * telefon, stående og liggende), i lyst og mørkt tema.
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/hovedmenynettleser.ts
 */
import { randomBytes } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { sikreAdministrator, sikreTestkonto, startLokalDatabase } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Side = any
const logg = (t: string) => console.log(`[hovedmeny] ${t}`)
const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

const utfall: { punkt: string; ok: boolean; merknad: string }[] = []
const mappe = process.env.QA_SKJERMBILDER
if (mappe) mkdirSync(mappe, { recursive: true })
async function bilde(side: Side, navn: string) {
  // Glidningen mellom nivåene er over før bildet tas.
  await vent(350)
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
    await vent(100)
  }
  throw new Error(`Ikke innen ${ms / 1000} s: ${hva}`)
}

const apenMeny = async (side: Side) => (await side.locator('nav.sidemeny').getAttribute('data-apen')) === 'ja'
const nivaet = (side: Side): Promise<string> => side.locator('nav.sidemeny .sidemeny__tittel').innerText()
const valgene = (side: Side): Promise<string[]> => side.locator('nav.sidemeny .menyniva .menyvalg__navn').allInnerTexts()
/** Hvor siden står, til feilmeldingene. */
const tilstand = (side: Side): Promise<string> =>
  side.evaluate(() =>
    JSON.stringify({
      hash: location.hash,
      niva: document.querySelector('.sidemeny__tittel')?.textContent,
      merket: [...document.querySelectorAll('nav.sidemeny [aria-current]')].map((e) => e.textContent),
      fokus: document.activeElement?.outerHTML.slice(0, 100),
    }),
  )
const fokus = (side: Side): Promise<string> =>
  side.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    const felt = el instanceof HTMLInputElement ? el.labels?.[0]?.textContent : null
    return felt ?? el?.getAttribute('aria-label') ?? el?.querySelector('.menyvalg__navn')?.textContent ?? el?.textContent?.trim() ?? ''
  })

/** Ctrl + M til menyen står åpen. Rett etter et sidebytte kan siden ennå holde tastene. */
async function apne(side: Side) {
  for (let forsok = 0; forsok < 3 && !(await apenMeny(side)); forsok++) {
    await side.keyboard.press('Control+m')
    await innen(1_000, 'menyen åpen', () => apenMeny(side)).catch(() => undefined)
  }
  krev(await apenMeny(side), 'menyen åpnet seg ikke')
}

/** Til hovedmenyen, og derfra ned gjennom undermenyene med disse navnene. */
async function gaaTil(side: Side, ...navn: string[]) {
  const meny = side.getByRole('navigation', { name: 'Meny', exact: true })
  for (const etikett of ['Til hovedmenyen', /^Tilbake til/]) {
    const knapp = meny.getByRole('button', { name: etikett })
    if (await knapp.count()) await knapp.first().click()
  }
  for (const n of navn) {
    await meny.getByRole('button', { name: new RegExp(`^${n}`) }).first().click()
    await innen(3_000, `nivået ${n}`, async () => (await nivaet(side)) === n)
  }
}

/**
 * Elementene i panelet som kan rulle (innhold høyere eller bredere enn dem,
 * med `overflow` som lar det rulle), og om noe stikker ut sidelengs.
 */
const rulleomrader = (side: Side): Promise<{ loddrett: string[]; vannrett: string[] }> =>
  side.evaluate(() => {
    const panel = document.querySelector('nav.sidemeny')!
    const alle = [panel, ...panel.querySelectorAll('*')] as HTMLElement[]
    const navn = (e: HTMLElement) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`
    const kan = (v: string) => v === 'auto' || v === 'scroll'
    return {
      loddrett: alle.filter((e) => kan(getComputedStyle(e).overflowY) && e.scrollHeight > e.clientHeight + 1).map(navn),
      vannrett: alle.filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'hidden').map(navn),
    }
  })

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const vanligpassord = randomBytes(18).toString('base64url')
await sikreTestkonto(s, 'qa-meny-vanlig', vanligpassord, ['Vera', 'Vanlig'])
const miljo = await apneTestmiljo()
try {
  const pc: Side = await miljo.brukerside('qa-admin', adminpassord, { viewport: { width: 1440, height: 900 } })
  await pc.goto(`${miljo.url}/#/`)
  await pc.locator('button.menyknapp').waitFor({ timeout: 30_000 })
  const meny = pc.getByRole('navigation', { name: 'Meny', exact: true })

  await punkt('H1 lukket meny ved oppstart: bare hovedmenyens få valg står i siden, ingen stoffliste', async () => {
    await vent(1_500)
    const lenker: number = await pc.locator('nav.sidemeny a[href]').count()
    krev(lenker <= 10, `${lenker} lenker i den lukkede menyen`)
    return `${lenker} lenker i den lukkede menyen`
  })

  await punkt('H2 hovedmenyen for systemarkitekten: strukturen, ingen faner, ingen Personal', async () => {
    await apne(pc)
    krev((await nivaet(pc)) === 'Meny', `nivået ${await nivaet(pc)}`)
    const valg = await valgene(pc)
    for (const n of ['Forsiden', 'Fortolkning', 'Fag', 'Grupper', 'Endringsforslag', 'Apputvikling', 'Administrasjon'])
      krev(valg.includes(n), `mangler ${n}: ${valg.join(' | ')}`)
    krev(!valg.includes('Personal'), 'Personal vises uten valg')
    krev((await meny.getByRole('tab').count()) === 0, 'faner')
    krev((await meny.locator('[aria-expanded]').count()) === 0, 'skuffer')
    krev((await meny.locator('.menyvalg[data-undermeny] .menyvalg__pil').count()) >= 3, 'pilene mot høyre')
    await bilde(pc, '01-hovedmeny-pc')
    const prikk = await meny.getByRole('button', { name: /^Administrasjon/ }).locator('.nyprikk').count()
    return `${valg.join(' | ')}; prikk ved Administrasjon: ${prikk > 0 ? 'ja' : 'nei'} (knappen: «${await pc.locator('button.menyknapp').getAttribute('aria-label')}»)`
  })

  await punkt('H3 Fag › Stoffregister: søk, helsiden og kategoriene; ett rulleområde, ingen vannrett rulling', async () => {
    await gaaTil(pc, 'Fag')
    const fag = await valgene(pc)
    krev(fag.join('|') === 'Stoffregister|Verktøy|Favoritter', `Fag: ${fag.join(' | ')}`)
    await bilde(pc, '02-fag-pc')
    await gaaTil(pc, 'Fag', 'Stoffregister')
    krev(await meny.getByRole('searchbox', { name: 'Søk i stoffregisteret' }).isVisible(), 'søkefeltet')
    krev(await meny.getByRole('link', { name: 'Hele stoffregisteret' }).isVisible(), 'helsiden')
    krev(await meny.getByRole('button', { name: 'Tilbake til Fag' }).isVisible(), 'Tilbake')
    krev(await meny.getByRole('button', { name: 'Til hovedmenyen' }).isVisible(), 'Til hovedmenyen')
    krev(await meny.getByRole('button', { name: 'Lukk menyen' }).isVisible(), 'Lukk')
    const r = await rulleomrader(pc)
    krev(r.loddrett.every((n) => n.includes('sidemeny__innhold')), `rulleområder: ${r.loddrett.join(', ')}`)
    krev(r.vannrett.length === 0, `vannrett: ${r.vannrett.join(', ')}`)
    await bilde(pc, '03-stoffregister-pc')
    return `${(await valgene(pc)).length} valg; rulleområder: ${r.loddrett.join(', ') || 'ingen (alt får plass)'}`
  })

  await punkt('H4 en kategori: stoffene med underkategoriene som mellomoverskrifter, og uten', async () => {
    await meny.getByRole('button', { name: /^Antidepressiver/ }).click()
    await innen(3_000, 'kategorien', async () => (await nivaet(pc)) === 'Antidepressiver')
    const overskrifter: string[] = await meny.locator('.menyavsnitt__overskrift').allInnerTexts()
    krev(overskrifter.includes('SSRI') && overskrifter.includes('TCA'), `overskriftene: ${overskrifter.join(' | ')}`)
    await bilde(pc, '04-kategori-pc')
    await meny.getByRole('switch', { name: 'Vis underkategorier' }).click({ force: true })
    await innen(3_000, 'uten underkategorier', async () => (await meny.locator('.menyavsnitt__overskrift').count()) === 0)
    await bilde(pc, '05-kategori-uten-underkategorier-pc')
    await meny.getByRole('switch', { name: 'Vis underkategorier' }).click({ force: true })
    return overskrifter.join(' | ')
  })

  await punkt('H5 rulleplassen på nivået bak står der igjen etter Tilbake', async () => {
    await gaaTil(pc, 'Fag', 'Stoffregister')
    const innhold = pc.locator('nav.sidemeny .sidemeny__innhold')
    const hoyde: { scroll: number; klient: number } = await innhold.evaluate((e: HTMLElement) => ({ scroll: e.scrollHeight, klient: e.clientHeight }))
    // Et lavt vindu, så lista ruller.
    await pc.setViewportSize({ width: 1440, height: 520 })
    await innhold.evaluate((e: HTMLElement) => (e.scrollTop = e.scrollHeight))
    const for_: number = await innhold.evaluate((e: HTMLElement) => e.scrollTop)
    krev(for_ > 0, `lista ruller ikke (${hoyde.scroll}/${hoyde.klient})`)
    await meny.locator('.menyvalg[data-undermeny]').last().click()
    await innen(3_000, 'nytt nivå', async () => (await nivaet(pc)) !== 'Stoffregister')
    const nede: number = await innhold.evaluate((e: HTMLElement) => e.scrollTop)
    krev(nede === 0, `det nye nivået begynner ikke øverst (${nede})`)
    await meny.getByRole('button', { name: 'Tilbake til Stoffregister' }).click()
    await innen(3_000, 'tilbake', async () => (await nivaet(pc)) === 'Stoffregister')
    const etter: number = await innhold.evaluate((e: HTMLElement) => e.scrollTop)
    krev(Math.abs(etter - for_) <= 2, `rulleplassen ${etter}, var ${for_}`)
    await pc.setViewportSize({ width: 1440, height: 900 })
    return `${for_} → ${etter} px`
  })

  await punkt('H6 søket finner stoffet; valget åpner fagsiden, lukker menyen og legger ett steg i historikken', async () => {
    await gaaTil(pc, 'Fag', 'Stoffregister')
    const historikk: number = await pc.evaluate(() => history.length)
    await meny.getByRole('searchbox', { name: 'Søk i stoffregisteret' }).fill('sert')
    const treff: string[] = await meny.locator('.menyniva a[href]').evaluateAll((a: HTMLAnchorElement[]) => a.map((x) => x.getAttribute('href')))
    krev(treff.includes('#/stoff/sertralin'), `treffene: ${treff.join(', ')}`)
    await bilde(pc, '06-sok-pc')
    await meny.getByRole('link', { name: /^Sertralin/ }).click()
    await innen(10_000, 'fagsiden', async () => (await pc.evaluate(() => location.hash)) === '#/stoff/sertralin')
    await innen(3_000, 'menyen lukket', async () => !(await apenMeny(pc)))
    krev((await pc.evaluate(() => history.length)) === historikk + 1, 'historikken')
    // Ctrl + M: samme nivå, med søket og stoffet merket.
    await apne(pc)
    krev((await nivaet(pc)) === 'Stoffregister', `nivået ${await nivaet(pc)}`)
    const merket = await innen(3_000, 'stoffet merket', async () => (await meny.getByRole('link', { name: /^Sertralin/ }).getAttribute('aria-current')) === 'page').catch(async () => {
      throw new Error(`stoffet er ikke merket: ${await tilstand(pc)}`)
    })
    await pc.keyboard.press('Escape')
    return `${treff.join(', ')} (merket etter ${merket} ms)`
  })

  await punkt('H7 tastaturet: piltastene inn og ut, fokus der det hører hjemme, Escape lukker med fokus på menyknappen', async () => {
    await pc.goto(`${miljo.url}/#/`)
    await pc.locator('button.menyknapp').waitFor({ timeout: 30_000 })
    await apne(pc)
    if ((await nivaet(pc)) !== 'Meny') await gaaTil(pc)
    // Fokus på panelet, som rett etter åpning.
    await pc.locator('nav.sidemeny').focus()
    await pc.keyboard.press('ArrowDown')
    krev((await fokus(pc)) === 'Forsiden', `fokus på ${await tilstand(pc)}`)
    await pc.keyboard.press('ArrowDown')
    await pc.keyboard.press('ArrowDown')
    krev((await fokus(pc)) === 'Fag', `fokus på ${await fokus(pc)}`)
    await pc.keyboard.press('ArrowRight')
    await innen(3_000, 'Fag', async () => (await nivaet(pc)) === 'Fag')
    krev((await fokus(pc)) === 'Stoffregister', `fokus på ${await fokus(pc)}`)
    await pc.keyboard.press('Enter')
    await innen(3_000, 'Stoffregister', async () => (await nivaet(pc)) === 'Stoffregister')
    krev((await fokus(pc)) === 'Søk i stoffregisteret', `fokus på ${await fokus(pc)}`)
    await pc.keyboard.press('ArrowDown')
    await pc.keyboard.press('ArrowLeft')
    await innen(3_000, 'tilbake til Fag', async () => (await nivaet(pc)) === 'Fag')
    krev((await fokus(pc)) === 'Stoffregister', `fokus på ${await fokus(pc)}`)
    // Tabulator går rundt i panelet.
    for (let i = 0; i < 8; i++) await pc.keyboard.press('Tab')
    krev(await pc.evaluate(() => !!document.activeElement?.closest('nav.sidemeny')), 'fokus forlot menyen')
    await bilde(pc, '07-tastatur-pc')
    await pc.keyboard.press('Escape')
    await innen(3_000, 'menyen lukket', async () => !(await apenMeny(pc)))
    krev((await fokus(pc)).startsWith('Vis menyen'), `fokus på ${await fokus(pc)}`)
  })

  await punkt('H8 Apputvikling og Administrasjon åpner vinduene sine og lukker menyen', async () => {
    await apne(pc)
    await gaaTil(pc, 'Apputvikling')
    const app = await valgene(pc)
    krev(app.join('|') === 'Idéer for appen|Planlagte oppgaver', `Apputvikling: ${app.join(' | ')}`)
    await meny.getByRole('button', { name: /^Idéer for appen/ }).click()
    await pc.getByRole('dialog', { name: 'Idéer' }).waitFor({ timeout: 10_000 })
    krev(!(await apenMeny(pc)), 'menyen står åpen')
    await pc.keyboard.press('Escape')
    await innen(3_000, 'idéene lukket', async () => (await pc.locator('dialog[open]').count()) === 0)
    await apne(pc)
    await gaaTil(pc, 'Administrasjon')
    const admin = await valgene(pc)
    krev(admin.includes('Brukere') && admin.includes('Datakilder'), `Administrasjon: ${admin.join(' | ')}`)
    await bilde(pc, '08-administrasjon-pc')
    await meny.getByRole('button', { name: /^Brukere/ }).click()
    await pc.getByRole('dialog').first().waitFor({ timeout: 10_000 })
    await pc.keyboard.press('Escape')
    await innen(3_000, 'vinduet lukket', async () => (await pc.locator('dialog[open]').count()) === 0)
    krev((await fokus(pc)).startsWith('Vis menyen'), `fokus på ${await fokus(pc)}`)
    return admin.join(' | ')
  })

  await punkt('H9 direktelenke rett til en fagside: menyen merker veien dit, og stoffet er en vanlig lenke', async () => {
    await pc.goto(`${miljo.url}/#/stoff/bupropion`)
    await pc.getByRole('heading', { level: 1, name: 'Bupropion' }).waitFor({ timeout: 30_000 })
    await apne(pc)
    await gaaTil(pc)
    krev((await meny.getByRole('button', { name: /^Fag/ }).getAttribute('data-gjeldende')) === 'under', 'Fag er ikke merket')
    await gaaTil(pc, 'Fag', 'Stoffregister', 'Antidepressiver')
    const lenke = meny.getByRole('link', { name: /^Bupropion/ }).first()
    krev((await lenke.getAttribute('href')) === '#/stoff/bupropion', 'lenken')
    krev((await lenke.getAttribute('aria-current')) === 'page', 'merket')
    await pc.keyboard.press('Escape')
  })

  await punkt('H10 mørkt tema på PC', async () => {
    await pc.emulateMedia({ colorScheme: 'dark' })
    await apne(pc)
    await bilde(pc, '09-kategori-pc-moerkt')
    await gaaTil(pc)
    await bilde(pc, '10-hovedmeny-pc-moerkt')
    await pc.keyboard.press('Escape')
    await pc.emulateMedia({ colorScheme: 'light' })
  })

  const vanlig: Side = await miljo.brukerside('qa-meny-vanlig', vanligpassord, { viewport: { width: 1440, height: 900 } })
  await punkt('H11 en vanlig bruker: ingen Administrasjon, bare idéene i Apputvikling, ingen verktøy i Fag', async () => {
    await vanlig.goto(`${miljo.url}/#/`)
    await vanlig.locator('button.menyknapp').waitFor({ timeout: 30_000 })
    await apne(vanlig)
    const rot = await valgene(vanlig)
    krev(!rot.includes('Administrasjon') && !rot.includes('Personal'), `hovedmenyen: ${rot.join(' | ')}`)
    await bilde(vanlig, '11-hovedmeny-vanlig-pc')
    await gaaTil(vanlig, 'Apputvikling')
    const app = await valgene(vanlig)
    krev(app.join('|') === 'Idéer for appen', `Apputvikling: ${app.join(' | ')}`)
    await gaaTil(vanlig, 'Fag')
    const fag = await valgene(vanlig)
    krev(!fag.includes('Verktøy'), `Fag: ${fag.join(' | ')}`)
    // Adressen til et verktøy fører fortsatt til forsiden: å skjule valget er ikke tilgangskontrollen.
    await vanlig.goto(`${miljo.url}/#/verktoy/bytte-antidepressiv`)
    await innen(15_000, 'forsiden', async () => (await vanlig.evaluate(() => location.hash)) === '#/')
    return `${rot.join(' | ')}; Fag: ${fag.join(' | ')}`
  })

  const telefon: Side = await miljo.brukerside('qa-meny-vanlig', vanligpassord, { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })
  await punkt('H12 liten telefon: hele bredden, trykkflater på minst 44 px, ingen vannrett rulling, lyst og mørkt', async () => {
    await telefon.goto(`${miljo.url}/#/`)
    await telefon.locator('button.menyknapp').waitFor({ timeout: 30_000 })
    await telefon.locator('button.menyknapp').tap()
    await innen(3_000, 'menyen åpen', () => apenMeny(telefon))
    const bredde: number = await telefon.locator('nav.sidemeny').evaluate((e: Element) => e.getBoundingClientRect().width)
    krev(bredde >= 359, `bredden ${bredde}`)
    const hoyder: number[] = await telefon.locator('nav.sidemeny .menyvalg').evaluateAll((v: HTMLElement[]) => v.map((e) => e.getBoundingClientRect().height))
    krev(hoyder.every((h) => h >= 43.5), `trykkflatene: ${Math.min(...hoyder)} px`)
    await bilde(telefon, '12-hovedmeny-telefon')
    await gaaTil(telefon, 'Fag', 'Stoffregister', 'Antidepressiver')
    const r = await rulleomrader(telefon)
    krev(r.loddrett.every((n) => n.includes('sidemeny__innhold')), `rulleområder: ${r.loddrett.join(', ')}`)
    krev(r.vannrett.length === 0, `vannrett: ${r.vannrett.join(', ')}`)
    const side: boolean = await telefon.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    krev(side, 'siden ruller sidelengs')
    await bilde(telefon, '13-kategori-telefon')
    await telefon.emulateMedia({ colorScheme: 'dark' })
    await bilde(telefon, '14-kategori-telefon-moerkt')
    await gaaTil(telefon, 'Fag', 'Stoffregister')
    await bilde(telefon, '15-stoffregister-telefon-moerkt')
    await telefon.emulateMedia({ colorScheme: 'light' })
    return `${bredde} px bred, minste trykkflate ${Math.min(...hoyder).toFixed(1)} px`
  })

  await punkt('H13 liggende telefon: toppfeltet står, og det siste valget nås ved å rulle lista', async () => {
    await telefon.setViewportSize({ width: 640, height: 360 })
    await gaaTil(telefon, 'Fag', 'Stoffregister', 'Antidepressiver')
    const topp: number = await telefon.locator('nav.sidemeny .sidemeny__topp').evaluate((e: Element) => e.getBoundingClientRect().height)
    const innhold = telefon.locator('nav.sidemeny .sidemeny__innhold')
    await innhold.evaluate((e: HTMLElement) => (e.scrollTop = e.scrollHeight))
    await vent(200)
    const siste: { bunn: number; vindu: number } = await telefon.locator('nav.sidemeny .menyvalg').last().evaluate((e: Element) => ({
      bunn: e.getBoundingClientRect().bottom,
      vindu: window.innerHeight,
    }))
    krev(siste.bunn <= siste.vindu, `det siste valget slutter ved ${siste.bunn} av ${siste.vindu}`)
    krev(topp < 80, `toppfeltet er ${topp} px`)
    await bilde(telefon, '16-kategori-telefon-liggende')
    await telefon.setViewportSize({ width: 360, height: 640 })
    await telefon.getByRole('button', { name: 'Lukk menyen' }).tap()
    await innen(3_000, 'menyen lukket', async () => !(await apenMeny(telefon)))
    return `toppfeltet ${topp} px, siste valg slutter ved ${siste.bunn} av ${siste.vindu}`
  })
} finally {
  await miljo.avslutt()
  console.log('\nRESULTAT')
  for (const u of utfall) console.log(`${u.ok ? 'OK  ' : 'FEIL'} ${u.punkt} ${u.merknad}`)
  process.exit(utfall.every((u) => u.ok) ? 0 : 1)
}
