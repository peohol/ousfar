import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { FASTE_HODER, innholdsregler, medInnholdsregler, skriptsum } from '../drift/sikkerhetshoder'
import { systemvalgskript } from '../domain/systemvalg'

/** Sikkerhetsreglene nettleseren får (`docs/s4-pilotplan.md` tiltak 5, `src/drift/sikkerhetshoder.ts`). */
describe('sikkerhetsreglene i nettleseren', () => {
  const regel = (regler: string, navn: string) => regler.split('; ').find((r) => r.split(' ')[0] === navn)

  it('står som HTTP-hoder på alle svar i vercel.json', () => {
    const vercel = JSON.parse(readFileSync(resolve(__dirname, '../../vercel.json'), 'utf8')) as {
      headers?: { source: string; headers: { key: string; value: string }[] }[]
    }
    const alle = vercel.headers?.find((h) => h.source === '/(.*)')
    expect(Object.fromEntries(alle?.headers.map((h) => [h.key, h.value]) ?? [])).toEqual(FASTE_HODER)
    expect(FASTE_HODER['Content-Security-Policy']).toContain("frame-ancestors 'none'")
  })

  it('tillater bare appen selv og den ene Supabase-adressen bygget bruker', () => {
    const regler = innholdsregler('https://abc.supabase.co', [])
    expect(regel(regler, 'default-src')).toBe("default-src 'self'")
    expect(regel(regler, 'script-src')).toBe("script-src 'self'")
    expect(regel(regler, 'connect-src')).toBe("connect-src 'self' https://abc.supabase.co wss://abc.supabase.co")
    expect(regel(regler, 'img-src')).toBe("img-src 'self' data: blob: https://abc.supabase.co")
    expect(regel(regler, 'object-src')).toBe("object-src 'none'")
    expect(regel(regler, 'frame-src')).toBe("frame-src 'none'")
    expect(regler).not.toMatch(/\*|unsafe-eval|https:(?!\/\/abc)/)
    // Det lokale testmiljøet bruker http og ws.
    expect(regel(innholdsregler('http://127.0.0.1:54329', []), 'connect-src')).toBe("connect-src 'self' http://127.0.0.1:54329 ws://127.0.0.1:54329")
    // Uten Supabase kan appen bare snakke med seg selv.
    expect(regel(innholdsregler(undefined, []), 'connect-src')).toBe("connect-src 'self'")
  })

  it('tillater et innebygd skript bare med sin sum, og legger reglene først i head', () => {
    const skript = systemvalgskript()
    const html = `<!doctype html>\n<html><head>\n<meta charset="UTF-8" />\n<script>${skript}</script>\n<script type="module" src="/a.js"></script></head><body></body></html>`
    const ut = medInnholdsregler(html, 'https://abc.supabase.co')
    const meta = /<meta charset="UTF-8" \/>\s*<meta http-equiv="Content-Security-Policy" content="([^"]+)" \/>/.exec(ut)
    expect(meta).not.toBeNull()
    expect(regel(meta![1]!, 'script-src')).toBe(`script-src 'self' ${skriptsum(skript)}`)
    expect(meta![1]).not.toContain("'unsafe-inline' 'sha")
    // Et endret skript får en annen sum, så det ikke kjøres med en gammel regel.
    expect(skriptsum(`${skript} `)).not.toBe(skriptsum(skript))
    expect(() => medInnholdsregler('<html><body></body></html>', undefined)).toThrow(/head/)
  })
})
