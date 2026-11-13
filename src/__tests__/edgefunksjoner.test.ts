/** Planleggingen bak utrullingen av Edge-funksjonene, og at funksjonene i repoet kan rulles ut (docs/edge-funksjoner.md). */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  endredeFiler,
  erFunksjonsmappe,
  funksjonsfiler,
  funksjonsoppsett,
  type Kildefiler,
  normaliserUtrullet,
  opplastingsnavn,
  planlegg,
  relativeImporter,
  type Repofunksjon,
  skalRullesUt,
  stoppendeAvvik,
  type Utrullet,
  Utrullingsfeil,
} from '../drift/edgefunksjoner'

const ROT = fileURLToPath(new URL('../../', import.meta.url))
const FUNKSJONER = join(ROT, 'supabase/functions')

describe('importene som blir med i bunten', () => {
  it('finner relative importer og eksporter, også dynamiske', () => {
    const kode = [
      "import { a } from '../_edge/a.ts'",
      "import * as b from './b.ts'",
      "export { c } from '../_delt/c.ts'",
      "import './sideeffekt.ts'",
      "const d = await import('../_edge/d.ts')",
      "import { withSupabase } from 'npm:@supabase/server@1'",
      "import x from 'https://example.com/x.ts'",
    ].join('\n')
    expect(relativeImporter(kode)).toEqual(['../_edge/a.ts', './b.ts', '../_delt/c.ts', './sideeffekt.ts', '../_edge/d.ts'])
  })

  it('tar ikke med rene typeimporter, som bunteren fjerner', () => {
    const kode = "import type { Profil } from '../_delt/profil.ts'\nexport type { P } from './p.ts'\nimport { type Q, r } from './r.ts'"
    expect(relativeImporter(kode)).toEqual(['./r.ts'])
  })

  it('ser bort fra importer i kommentarer', () => {
    expect(relativeImporter("// import { a } from './a.ts'\n/* import './b.ts' */\nconst u = 'https://x//y'")).toEqual([])
  })
})

describe('kildefilene til en funksjon', () => {
  const tre: Record<string, string> = {
    'f/index.ts': "import { a } from '../_edge/a.ts'\nimport type { T } from '../_delt/t.ts'",
    '_edge/a.ts': "import { b } from '../_delt/b.ts'\nimport { a2 } from './a.ts'",
    '_delt/b.ts': 'export const b = 1',
    '_delt/t.ts': 'export type T = 1',
  }

  it('følger importene gjennom de felles mappene, én gang per fil', () => {
    expect(Object.keys(funksjonsfiler('f', (s) => tre[s]))).toEqual(['_delt/b.ts', '_edge/a.ts', 'f/index.ts'])
  })

  it('stopper når en importert fil mangler eller ligger utenfor supabase/functions/', () => {
    expect(() => funksjonsfiler('f', (s) => (s === '_delt/b.ts' ? undefined : tre[s]))).toThrow(Utrullingsfeil)
    expect(() => funksjonsfiler('g', (s) => (s === 'g/index.ts' ? "import '../../src/x.ts'" : undefined))).toThrow(/utenfor/)
  })

  it('skiller funksjonsmapper fra felles kode', () => {
    expect(['sett-rolle', '_edge', '_delt', '.temp', 'Stor'].filter(erFunksjonsmappe)).toEqual(['sett-rolle'])
  })
})

describe('oppsettet i config.toml', () => {
  it('leser verify_jwt per funksjon og ignorerer resten av fila', () => {
    const toml = '[auth]\nenable_signup = false\n\n[functions.a]\nverify_jwt = true # kommentar\n\n[functions.b]\nverify_jwt = false\n'
    expect(funksjonsoppsett(toml)).toEqual({ a: { verifyJwt: true }, b: { verifyJwt: false } })
  })

  it('stopper ved felt utrullingen ikke støtter, manglende verify_jwt og doble seksjoner', () => {
    expect(() => funksjonsoppsett('[functions.a]\nverify_jwt = true\nentrypoint = "./x.ts"')).toThrow(/støtter bare/)
    expect(() => funksjonsoppsett('[functions.a]\n')).toThrow(/mangler verify_jwt/)
    expect(() => funksjonsoppsett('[functions.a]\nverify_jwt = true\n[functions.a]\nverify_jwt = true')).toThrow(/to ganger/)
  })
})

describe('stiene i den utrullede bunten', () => {
  it('gjenkjenner oppsettet Supabase lager i dag', () => {
    const fn = 'user_fn_ref_id_2'
    expect(
      normaliserUtrullet('sett-rolle', `${fn}/source/index.ts`, {
        [`${fn}/source/index.ts`]: 'i',
        [`${fn}/_edge/kontekst.ts`]: 'k',
      }),
    ).toEqual({ '_edge/kontekst.ts': 'k', 'sett-rolle/index.ts': 'i' })
  })

  it('gjenkjenner en bunt uten mappe foran, og merker filer utenfor', () => {
    expect(normaliserUtrullet('d', 'source/index.ts', { 'source/index.ts': 'i', '_delt/a.ts': 'a' })).toEqual({ '_delt/a.ts': 'a', 'd/index.ts': 'i' })
    expect(normaliserUtrullet('d', 'x/source/index.ts', { 'x/source/index.ts': 'i', 'y/a.ts': 'a' })).toEqual({ '?/y/a.ts': 'a', 'd/index.ts': 'i' })
  })

  it('laster opp filene relativt til funksjonsmappen, som gir det samme oppsettet tilbake', () => {
    const filer = { '_edge/a.ts': 'a', 'f/index.ts': 'i', 'f/hjelp.ts': 'h' }
    expect(opplastingsnavn('f', filer)).toEqual({ '../_edge/a.ts': 'a', 'index.ts': 'i', 'hjelp.ts': 'h' })
  })
})

describe('planen', () => {
  const v1: Kildefiler = { '_edge/a.ts': 'a1', 'f/index.ts': 'i' }
  const v2: Kildefiler = { '_edge/a.ts': 'a2', 'f/index.ts': 'i' }
  const repo = (filer: Kildefiler, tidligere: Kildefiler[] = [], verifyJwt = true): Repofunksjon => ({ filer, verifyJwt, tidligere })
  const prod = (filer: Kildefiler, verifyJwt = true, status = 'ACTIVE'): Utrullet => ({ filer, verifyJwt, status, versjon: 3 })
  const handling = (...args: Parameters<typeof planlegg>) => planlegg(...args).map((p) => [p.slug, p.handling])

  it('rører ikke en funksjon som kjører det repoet har', () => {
    expect(handling({ f: repo(v2, [v1, v2]) }, { f: prod(v2) })).toEqual([['f', 'uendret']])
  })

  it('oppdaterer når en felles fil er endret og produksjonen kjører en tidligere versjon fra repoet', () => {
    const plan = planlegg({ f: repo(v2, [v1, v2]) }, { f: prod(v1) })
    expect(plan[0]).toMatchObject({ handling: 'oppdater', filer: ['_edge/a.ts'] })
    expect(skalRullesUt(plan).map((p) => p.slug)).toEqual(['f'])
  })

  it('oppdaterer når bare verify_jwt eller statusen avviker', () => {
    expect(handling({ f: repo(v2, [v2]) }, { f: prod(v2, false) })).toEqual([['f', 'oppdater']])
    expect(handling({ f: repo(v2, [v2]) }, { f: prod(v2, true, 'THROTTLED') })).toEqual([['f', 'oppdater']])
  })

  it('stopper ved kode i produksjonen som ikke finnes i repoets historikk, til den uttrykkelig overskrives', () => {
    const ukjent = { ...v1, 'f/index.ts': 'lagt ut for hånd' }
    const plan = planlegg({ f: repo(v2, [v1, v2]) }, { f: prod(ukjent) })
    expect(stoppendeAvvik(plan).map((p) => p.slug)).toEqual(['f'])
    expect(skalRullesUt(plan)).toEqual([])
    expect(handling({ f: repo(v2, [v1, v2]) }, { f: prod(ukjent) }, ['f'])).toEqual([['f', 'oppdater']])
  })

  it('oppretter nye funksjoner og sletter aldri funksjoner som bare finnes i produksjonen', () => {
    const plan = planlegg({ ny: repo(v2) }, { gammel: prod(v1) })
    expect(plan.map((p) => [p.slug, p.handling])).toEqual([
      ['gammel', 'bare-i-produksjonen'],
      ['ny', 'ny'],
    ])
    expect(skalRullesUt(plan).map((p) => p.slug)).toEqual(['ny'])
  })

  it('viser hvilke filer som er lagt til, fjernet eller endret', () => {
    expect(endredeFiler({ a: '1', b: '2' }, { b: '3', c: '4' })).toEqual(['a', 'b', 'c'])
  })
})

describe('funksjonene i repoet', () => {
  const mapper = readdirSync(FUNKSJONER, { withFileTypes: true })
    .filter((d) => d.isDirectory() && erFunksjonsmappe(d.name))
    .map((d) => d.name)
  const oppsett = funksjonsoppsett(readFileSync(join(ROT, 'supabase/config.toml'), 'utf8'))
  const les = (sti: string) => (existsSync(join(FUNKSJONER, sti)) ? readFileSync(join(FUNKSJONER, sti), 'utf8') : undefined)

  it('har hver sin seksjon med verify_jwt i config.toml, og ingen seksjon uten mappe', () => {
    expect(mapper.length).toBeGreaterThan(0)
    expect(Object.keys(oppsett).sort()).toEqual([...mapper].sort())
  })

  it.each(mapper)('%s kan rulles ut: inngangsfila og alt den importerer finnes i supabase/functions/', (slug) => {
    const filer = funksjonsfiler(slug, les)
    expect(filer).toHaveProperty([`${slug}/index.ts`])
    for (const sti of Object.keys(filer)) expect(sti.startsWith(`${slug}/`) || /^_(edge|delt)\//.test(sti), sti).toBe(true)
  })

  it('har ingen mapper i supabase/functions/ utrullingen ikke kjenner', () => {
    const ukjente = readdirSync(FUNKSJONER).filter((n) => !erFunksjonsmappe(n) && !['_edge', '_delt'].includes(n))
    expect(ukjente).toEqual([])
  })
})
