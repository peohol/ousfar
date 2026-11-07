/**
 * Alle skript som styrer appen i en nettleser, skal gå gjennom
 * `apneTestmiljo()` (`testmiljo.ts`), så de kjører lokalt som standard og bare
 * med vernet mot produksjonen (`docs/qa-testmiljo.md`). Testen leser de
 * innsjekkede filene: et nytt eller endret skript som laster Playwright selv,
 * stopper `npm test` og dermed CI før det kan slås sammen.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROT = join(__dirname, '..', '..', '..')
const MAPPER = ['src', 'scripts', 'supabase', 'api', 'e2e', 'tests']
const KODE = /\.(c|m)?(j|t)sx?$/
const HOPP_OVER = new Set(['node_modules', 'dist', '.git', 'coverage'])

/** Den eneste filen som får starte en nettleser. */
const TESTMILJO = 'src/__tests__/qa/testmiljo.ts'
/** Denne testen, som selv nevner bibliotekene. */
const DENNE = relative(ROT, __filename).split(sep).join('/')

/** Nettleserstyring: bibliotekene ved navn (import, require, dynamisk import), eller oppstart av Chromium. */
const BIBLIOTEKER = ['playwright', 'playwright-core', '@playwright/test', 'puppeteer', 'puppeteer-core']
const NETTLESER = new RegExp(`['"\`](${BIBLIOTEKER.map((b) => b.replace(/[/@-]/g, '\\$&')).join('|')})(/[^'"\`]*)?['"\`]|\\bchromium\\s*\\.\\s*launch`)

/** Skriptene `docs/qa-testmiljo.md` nevner ved navn. Alle er sjekket inn og må finnes. */
const KJENTE_SKRIPT = ['src/__tests__/qa/appkontroll.ts', 'src/__tests__/qa/maling.ts', 'scripts/verktoy-p0-app.mjs']

function kodefiler(mappe: string): string[] {
  const full = join(ROT, mappe)
  if (!existsSync(full)) return []
  return readdirSync(full, { withFileTypes: true }).flatMap((d) => {
    if (HOPP_OVER.has(d.name)) return []
    const sti = `${mappe}/${d.name}`
    if (d.isDirectory()) return kodefiler(sti)
    return KODE.test(d.name) ? [sti] : []
  })
}

const rotfiler = readdirSync(ROT, { withFileTypes: true })
  .filter((d) => d.isFile() && KODE.test(d.name))
  .map((d) => d.name)
const filer = [...rotfiler, ...MAPPER.flatMap(kodefiler)]
const les = (sti: string) => readFileSync(join(ROT, sti), 'utf8')
const brukerTestmiljo = (kode: string) => /\bapneTestmiljo\s*\(/.test(kode) && /['"`][^'"`]*\btestmiljo(\.ts)?['"`]/.test(kode)

describe('nettleserkontrollene går gjennom testmiljøet', () => {
  it('finner kildefilene og kjenner igjen nettleserstyring', () => {
    expect(filer).toContain(TESTMILJO)
    expect(filer.length).toBeGreaterThan(100)
    for (const kode of ["createRequire(import.meta.url)('playwright')", "import { chromium } from 'playwright'", 'await import(`playwright-core`)', "from '@playwright/test'", "require('puppeteer')", 'chromium.launch()'])
      expect(NETTLESER.test(kode), kode).toBe(true)
    for (const kode of ['// Playwright er forhåndsinstallert', "'playwrights'", 'les_stoffer']) expect(NETTLESER.test(kode), kode).toBe(false)
  })

  it('bare testmiljo.ts starter en nettleser', () => {
    const selvstendige = filer.filter((f) => f !== TESTMILJO && f !== DENNE && NETTLESER.test(les(f)))
    expect(selvstendige, 'Disse filene styrer en nettleser selv. Bruk apneTestmiljo() fra src/__tests__/qa/testmiljo.ts i stedet (docs/qa-testmiljo.md).').toEqual([])
  })

  it('de kjente skriptene, også den innsjekkede P0-driveren, finnes og bruker apneTestmiljo()', () => {
    for (const f of KJENTE_SKRIPT) {
      expect(existsSync(join(ROT, f)), `${f} mangler; er den flyttet, oppdater KJENTE_SKRIPT og docs/qa-testmiljo.md`).toBe(true)
      expect(brukerTestmiljo(les(f)), `${f} må starte med apneTestmiljo()`).toBe(true)
    }
  })
})
