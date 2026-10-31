/**
 * At hvert npm-skript arbeidsflytene i GitHub Actions kjører, finnes i
 * `package.json`, og at filen skriptet starter, finnes. `npm run -s` med et
 * ukjent skript stopper uten å si noe, så uten denne kontrollen oppdages feilen
 * først når arbeidsflyten kjører på main.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROT = fileURLToPath(new URL('../../', import.meta.url))
const MAPPE = '.github/workflows'
const skript = (JSON.parse(readFileSync(join(ROT, 'package.json'), 'utf8')) as { scripts: Record<string, string> }).scripts
const arbeidsflyter = readdirSync(join(ROT, MAPPE)).filter((f) => /\.ya?ml$/.test(f))

/** Skriptnavnene en arbeidsflyt kjører med `npm run`, med eller uten flagg foran navnet. */
const npmSkript = (tekst: string) => [...tekst.matchAll(/\bnpm run(?:\s+-{1,2}[a-z]+)*\s+([\w:.-]+)/g)].map((m) => m[1] as string)

describe('npm-skriptene arbeidsflytene kjører', () => {
  it('finner skriptnavnet med og uten flagg', () => {
    expect(npmSkript('npm run -s verktoy:overvaking -- kontroll\nnpm run build\nnpm run --silent a.b-c')).toEqual(['verktoy:overvaking', 'build', 'a.b-c'])
  })

  it.each(arbeidsflyter)('%s kjører bare skript som finnes, med filene de starter', (fil) => {
    for (const navn of npmSkript(readFileSync(join(ROT, MAPPE, fil), 'utf8'))) {
      expect(skript, `${fil}: npm run ${navn}`).toHaveProperty([navn])
      for (const [, sti] of (skript[navn] ?? '').matchAll(/\b(?:vite-node|node|python3)\s+(\S+\.(?:ts|mjs|js|py))/g)) {
        expect(existsSync(join(ROT, sti as string)), `${fil}: ${navn} → ${sti}`).toBe(true)
      }
    }
  })
})
