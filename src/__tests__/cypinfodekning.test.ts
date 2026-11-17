/**
 * Dekningen for CYPinfo (`src/faginnhold/cypinfodekning.ts`) og koblingene
 * for legemidlene uten FEST-ID (`cypinfokoblinger.ts`), mot katalogen i
 * utdraget og fagsidene med FEST-koblingene i produksjonen 16.11.2026
 * (`data/cypinfo/`). Akseptkriteriene i docs/cypinfo-integrasjon.md: de 34
 * legemidlene med FEST-ID som har en side, gir nøyaktig 33 fagsider;
 * kariprazin står bare på Kariprazin; Hydroksyrisperidon kobles ikke; og ingen
 * side er uavklart.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { lesLegemiddel } from '../cypinfo/modell'
import { cypinfodekning, cypinfodekningstelling, navnenokkel, type Cypinfodekning, type Katalogoppforing } from '../faginnhold/cypinfodekning'
import { CYPINFOKOBLINGER } from '../faginnhold/cypinfokoblinger'
import { CYPINFO } from './hjelp/cypinfo'

const KATALOG: Katalogoppforing[] = CYPINFO.legemidler.map((r) => {
  const l = lesLegemiddel(r)!
  return { id: l.id, navn: l.data.navn, fest: l.data.fest, atc: l.data.atc }
})
const REGISTER = (JSON.parse(readFileSync(new URL('../data/stoffregister.json', import.meta.url), 'utf8')) as {
  stoffer: { navn: string; aliaser?: string[] }[]
}).stoffer
const aliaser = new Map(REGISTER.map((s) => [s.navn, s.aliaser ?? []]))
const SIDER = CYPINFO.fagsider.map((s) => ({ ...s, aliaser: aliaser.get(s.side) ?? [] }))
const DEKNING = cypinfodekning(KATALOG, SIDER)
const perSide = new Map<string, Cypinfodekning>(DEKNING.map((d) => [d.side, d]))
const katalogAtc = new Map(CYPINFO.legemidler.map((r) => [String(r._id), lesLegemiddel(r)!.data.atc]))

describe('dekningen', () => {
  it('gir hver fagside nøyaktig én status, og ingen er uavklart', () => {
    expect(DEKNING).toHaveLength(SIDER.length)
    expect(perSide.size).toBe(SIDER.length)
    expect(DEKNING.filter((d) => d.status === 'uavklart')).toEqual([])
    const telling = cypinfodekningstelling(DEKNING)
    expect(Object.values(telling).reduce((a, b) => a + b, 0)).toBe(SIDER.length)
  })

  it('kobler de 34 legemidlene med FEST-ID til nøyaktig 33 fagsider', () => {
    const fest = DEKNING.filter((d) => d.status === 'koblet_fest')
    expect(fest).toHaveLength(33)
    expect(new Set(fest.flatMap((d) => d.legemidler.map((l) => l.id))).size).toBe(34)
    expect(perSide.get('Amfetamin')!.legemidler.map((l) => l.navn).sort()).toEqual(['deksamfetamin', 'lisdeksamfetamin'])
    expect(perSide.get('Brekspiprazol')!.legemidler.map((l) => l.navn)).toEqual(['brexpiprazol'])
  })

  it('kobler legemidlene uten FEST-ID bare etter listen: kariprazin på Kariprazin, esketamin på Ketamin', () => {
    const liste = DEKNING.filter((d) => d.status === 'koblet_liste')
    expect(liste.map((d) => d.side).sort()).toEqual(CYPINFOKOBLINGER.flatMap((k) => (k.side ? [k.side] : [])).sort())
    expect(perSide.get('Kariprazin')!.legemidler.map((l) => l.navn)).toEqual(['kariprazin'])
    expect(perSide.get('Ketamin')!.legemidler.map((l) => l.navn)).toEqual(['esketamin'])
    expect(perSide.get('Hydroksyrisperidon')).toMatchObject({ status: 'metabolitt', legemidler: [] })
    expect(perSide.get('Dehydroaripiprazol')).toMatchObject({ status: 'metabolitt' })
  })

  it('melder en side som uavklart når CYPinfo har navnet uten kobling', () => {
    const utenListe = cypinfodekning(KATALOG, SIDER, CYPINFOKOBLINGER.filter((k) => k.side !== 'Klozapin'))
    expect(utenListe.find((d) => d.side === 'Klozapin')).toMatchObject({ status: 'uavklart', legemidler: [{ navn: 'klozapin' }] })
    expect(navnenokkel('Paliperidon (hydroksyrisperidon)')).toBe('paliperidon')
  })
})

describe('koblingene uten FEST-ID', () => {
  it('gjelder legemidler i CYPinfo uten FEST-ID, med navnet og ATC-koden de har der', () => {
    const katalog = new Map(KATALOG.map((l) => [l.id, l]))
    for (const k of CYPINFOKOBLINGER) {
      const l = katalog.get(k.cypinfo_id)
      expect(l, k.navn).toBeDefined()
      expect(l!.navn, k.cypinfo_id).toBe(k.navn)
      expect(l!.fest, k.navn).toEqual([])
      if (k.atc) expect(katalogAtc.get(k.cypinfo_id), k.navn).toContain(k.atc)
      if (k.side) expect(perSide.has(k.side), k.side).toBe(true)
    }
    expect(new Set(CYPINFOKOBLINGER.map((k) => k.cypinfo_id)).size).toBe(CYPINFOKOBLINGER.length)
  })

  it('dekker alle legemidlene i CYPinfo uten FEST-ID, så synkroniseringen ikke melder noen', () => {
    const koblet = new Set(CYPINFOKOBLINGER.map((k) => k.cypinfo_id))
    expect(KATALOG.filter((l) => l.fest.length === 0 && !koblet.has(l.id)).map((l) => l.navn)).toEqual([])
  })

  it('kobler aldri på navnet alene', () => {
    for (const k of CYPINFOKOBLINGER) if (k.side) expect(k.grunnlag.length, k.navn).toBeGreaterThan(0)
  })
})
