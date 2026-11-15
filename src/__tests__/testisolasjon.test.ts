// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { PRODUKSJONSVARIABLER } from './hjelp/produksjonsvariabler'
import { erKonfigurert } from '../auth/klient'

/**
 * Tiltak 10 i `docs/s4-pilotplan.md`: testene skal ikke kunne kontakte
 * produksjonen, heller ikke når adressen og nøklene står i miljøet de kjøres i.
 */
describe('testene når aldri en ekte Supabase', () => {
  it('har ingen av produksjonsvariablene, verken i process.env eller import.meta.env', () => {
    for (const navn of PRODUKSJONSVARIABLER) {
      expect(process.env[navn], navn).toBeUndefined()
      expect((import.meta.env as Record<string, unknown>)[navn], navn).toBeUndefined()
    }
  })

  it('lager ingen Supabase-klient i appens kode', () => {
    expect(erKonfigurert()).toBe(false)
  })

  it('fjerner variablene før hver testfil', () => {
    const oppsett = readFileSync(resolve(__dirname, '../../vite.config.ts'), 'utf8')
    expect(oppsett).toMatch(/setupFiles:\s*\[[^\]]*utenProduksjon/)
  })
})
