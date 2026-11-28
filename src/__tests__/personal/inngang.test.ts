/**
 * Inngangen til personalfunksjonene (#606, docs/personal.md §8.3 og §8.8):
 * adressen `#/kalender`, hvem som ser den, menyvalget under «Personal», og at
 * koden i `src/personal/` bare nås gjennom den ene lastingen i
 * `src/sidekode.ts` (K-SKJ-2, K-SKJ-8). Bare syntetiske fagmiljøer.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { INGEN_RETTIGHETER, type Fagmiljoreferanse, type Rettigheter } from '../../auth/rettigheter'
import { adresse, KALENDERFANER, lesRute, sidesti, type Rute } from '../../domain/rute'
import { KALENDERFANEDEFINISJONER, fanerFor } from '../../personal/faner'
import { personalfagmiljo, personalvalg, synligRute, utenPersonal } from '../../personaltilgang'

const fagmiljo = (id: string, navn: string): Fagmiljoreferanse => ({ id, nokkel: id, navn, standard: false, apent: true, ikon: 'laboratorium' })
const SANDKASSE = fagmiljo('sandkasse', 'Sandkasse')
const ANNET = fagmiljo('annet', 'Syntetisk lab')

/** En systemarkitekt som arbeider i `arbeid`, med personalfunksjonen i `med`. */
const rettigheter = (arbeid: Fagmiljoreferanse | null, med: readonly string[], funksjon = 'personal'): Rettigheter => ({
  ...INGEN_RETTIGHETER,
  systemarkitekt: true,
  arbeidsfagmiljo: arbeid,
  mineFagmiljoer: [SANDKASSE, ANNET],
  funksjoner: med.map((f) => ({ funksjon, fagmiljo: f })),
})

describe('adressen til kalenderen', () => {
  it('leser og skriver #/kalender og fanene, og sidestien følger adressen', () => {
    expect(lesRute('#/kalender')).toEqual({ side: 'kalender' })
    expect(lesRute('#/kalender/')).toEqual({ side: 'kalender' })
    expect(lesRute('#/Kalender/Medarbeidere')).toEqual({ side: 'kalender', fane: 'medarbeidere' })
    for (const fane of KALENDERFANER) {
      const rute: Rute = { side: 'kalender', fane }
      expect(lesRute(adresse(rute))).toEqual(rute)
      expect(sidesti(rute)).toBe(`kalender/${fane}`)
    }
    expect(adresse({ side: 'kalender' })).toBe('#/kalender')
    expect(sidesti({ side: 'kalender' })).toBe('kalender')
  })

  it('gir en ukjent adresse for et ledd som ikke er en fane', () => {
    expect(lesRute('#/kalender/noe-annet')).toEqual({ side: 'ukjent', adresse: '#/kalender/noe-annet' })
    expect(lesRute('#/kalender/medarbeidere/x')).toEqual({ side: 'ukjent', adresse: '#/kalender/medarbeidere/x' })
  })
})

describe('hvem som ser personalfunksjonene', () => {
  it('bare med funksjonen i fagmiljøet hen arbeider i', () => {
    expect(personalfagmiljo(rettigheter(SANDKASSE, ['sandkasse']))).toBe(SANDKASSE)
    // Funksjonen i et annet fagmiljø gir ingenting her (K-TIL-1).
    expect(personalfagmiljo(rettigheter(ANNET, ['sandkasse']))).toBeNull()
    // Uten arbeidsfagmiljø, uten funksjonen og med en annen funksjon: ingenting.
    expect(personalfagmiljo(rettigheter(null, ['sandkasse']))).toBeNull()
    expect(personalfagmiljo(rettigheter(SANDKASSE, []))).toBeNull()
    expect(personalfagmiljo(rettigheter(SANDKASSE, ['sandkasse'], 'noe-annet'))).toBeNull()
    expect(personalfagmiljo(INGEN_RETTIGHETER)).toBeNull()
  })

  it('tar bort bare personalfunksjonen når databasen har avvist kalenderen', () => {
    const r = { ...rettigheter(SANDKASSE, ['sandkasse', 'annet']), funksjoner: [{ funksjon: 'personal', fagmiljo: 'sandkasse' }, { funksjon: 'noe-annet', fagmiljo: 'sandkasse' }] }
    const uten = utenPersonal(r)
    expect(uten.funksjoner).toEqual([{ funksjon: 'noe-annet', fagmiljo: 'sandkasse' }])
    expect(personalfagmiljo(uten)).toBeNull()
    expect({ ...uten, funksjoner: r.funksjoner }).toEqual(r)
    // Uten funksjonen er rettighetene de samme.
    expect(utenPersonal(INGEN_RETTIGHETER)).toBe(INGEN_RETTIGHETER)
  })

  it('gjør kalenderen til en ukjent adresse, med adressen slik den sto, for den uten tilgang', () => {
    for (const rute of [{ side: 'kalender' }, { side: 'kalender', fane: 'medarbeidere' }] as Rute[]) {
      expect(synligRute(rute, null)).toEqual({ side: 'ukjent', adresse: adresse(rute) })
      expect(synligRute(rute, SANDKASSE)).toBe(rute)
    }
    // Andre sider røres ikke.
    const forside: Rute = { side: 'forside' }
    expect(synligRute(forside, null)).toBe(forside)
  })

  it('har Kalender under Personal bare med tilgang, merket når brukeren står i kalenderen', () => {
    expect(personalvalg(rettigheter(ANNET, ['sandkasse']), { side: 'kalender' })).toEqual([])
    expect(personalvalg(INGEN_RETTIGHETER, { side: 'forside' })).toEqual([])
    const [kalender, ...andre] = personalvalg(rettigheter(SANDKASSE, ['sandkasse']), { side: 'kalender', fane: 'medarbeidere' })
    expect(andre).toEqual([])
    expect(kalender).toMatchObject({ id: 'kalender', navn: 'Kalender', ikon: 'kalender', adresse: '#/kalender', gjeldende: true })
    expect(personalvalg(rettigheter(SANDKASSE, ['sandkasse']), { side: 'forside' })[0]?.gjeldende).toBe(false)
  })
})

describe('fanene i kalenderen', () => {
  it('har én fane for selve kalenderen og én for hver fane i adressen', () => {
    expect(KALENDERFANEDEFINISJONER.map((f) => f.id)).toEqual([undefined, ...KALENDERFANER])
  })

  it('viser Medarbeidere bare for vaktplanansvarlige og lokale administratorer', () => {
    expect(fanerFor('reader').map((f) => f.navn)).toEqual(['Kalender'])
    expect(fanerFor('planner').map((f) => f.navn)).toEqual(['Kalender', 'Medarbeidere'])
    expect(fanerFor('localAdmin').map((f) => f.navn)).toEqual(['Kalender', 'Medarbeidere'])
    expect(fanerFor('outsideArchitect')).toEqual([])
  })
})

// --- Importgrensen (K-SKJ-8) --------------------------------------------------

const ROT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const SRC = join(ROT, 'src')
const DELT = join(ROT, 'supabase/functions/_delt')
const PERSONALKODE = [join(SRC, 'personal'), join(DELT, 'personal')]
const erPersonalkode = (fil: string) => PERSONALKODE.some((mappe) => fil.startsWith(`${mappe}/`))

/** Kildefilene under `mappe`, uten testene. */
function kildefiler(mappe: string): string[] {
  return readdirSync(mappe).flatMap((navn) => {
    const sti = join(mappe, navn)
    if (statSync(sti).isDirectory()) return navn === '__tests__' ? [] : kildefiler(sti)
    return /\.(ts|tsx)$/.test(navn) ? [sti] : []
  })
}

/** Fila en import peker på, eller `null` for en pakke utenfra. */
function losOpp(fra: string, spesifikator: string): string | null {
  const base = spesifikator.startsWith('@delt/')
    ? join(DELT, spesifikator.slice('@delt/'.length))
    : spesifikator.startsWith('.')
      ? resolve(dirname(fra), spesifikator)
      : null
  if (!base) return null
  const kandidater = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]
  return kandidater.find((k) => existsSync(k) && statSync(k).isFile()) ?? null
}

/**
 * Importene som lastes med fila: `import … from`, `export … from` og
 * `import '…'`, men ikke rene typeimporter (de forsvinner i bygget) og ikke
 * `import(…)`, som hentes først når den kjøres.
 */
function statiskeImporter(fil: string): string[] {
  const kilde = readFileSync(fil, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const monster = /(?:^|\n)\s*(import|export)\s+(type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g
  return [...kilde.matchAll(monster)].filter((t) => !t[2]).map((t) => t[3]!)
}

/** Alle filene `start` drar med seg statisk. */
function statiskTre(start: string): Set<string> {
  const sett = new Set<string>()
  const ko = [start]
  while (ko.length > 0) {
    const fil = ko.pop()!
    if (sett.has(fil)) continue
    sett.add(fil)
    for (const s of statiskeImporter(fil)) {
      const neste = losOpp(fil, s)
      if (neste && /\.(ts|tsx)$/.test(neste)) ko.push(neste)
    }
  }
  return sett
}

/** Modulene appen henter med `import(…)`, hver med sin egen pakke. */
function dynamiskeImporter(fil: string): string[] {
  return [...readFileSync(fil, 'utf8').matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)]
    .map((t) => losOpp(fil, t[1]!))
    .filter((m): m is string => m !== null)
}

describe('koden til personalfunksjonene', () => {
  it('lastes ikke med resten av appen: ingen statisk import fra inngangen eller en annen side når src/personal/ eller domenet', () => {
    // Inngangen og hver pakke appen henter senere (appen bak veggen og sidene i
    // den), utenom personalsiden selv.
    const starter = [join(SRC, 'main.tsx'), ...kildefiler(SRC).filter((f) => !erPersonalkode(f)).flatMap(dynamiskeImporter)]
    const tre = new Set(starter.filter((f) => !erPersonalkode(f)).flatMap((f) => [...statiskTre(f)]))
    // Treet er det ventede: appen og sidekoden er med.
    expect(tre.has(join(SRC, 'App.tsx'))).toBe(true)
    expect(tre.has(join(SRC, 'sidekode.ts'))).toBe(true)
    expect([...tre].filter(erPersonalkode).map((f) => relative(ROT, f))).toEqual([])
  })

  it('nås bare gjennom den ene lastingen i src/sidekode.ts', () => {
    const utenfor = kildefiler(SRC).filter((f) => !erPersonalkode(f))
    const viser = utenfor
      .flatMap((fil) =>
        [...readFileSync(fil, 'utf8').matchAll(/['"]((?:\.{1,2}\/)+[^'"]*|@delt\/[^'"]*)['"]/g)]
          .map((t) => losOpp(fil, t[1]!))
          .filter((m): m is string => m !== null && erPersonalkode(m))
          .map(() => relative(ROT, fil)),
      )
    expect(viser).toEqual(['src/sidekode.ts'])
    expect(readFileSync(join(SRC, 'sidekode.ts'), 'utf8')).toContain("senere(() => import('./personal/Personalside'), 'Personalside')")
  })

  it('kjenner igjen en statisk import, så kontrollen ikke kan gå grønn av seg selv', () => {
    const tre = statiskTre(join(SRC, 'personal/Personalside.tsx'))
    expect(tre.has(join(SRC, 'personal/faner.tsx'))).toBe(true)
    expect(tre.has(join(DELT, 'personal/permissions.ts'))).toBe(true)
  })
})
