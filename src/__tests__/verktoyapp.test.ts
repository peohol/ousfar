/**
 * Hva appen får bruke av verktøymotoren (P6 i `docs/verktøy-utviklingsplan.md`).
 *
 * Appen er alt som kan nås med import fra `src/main.tsx`. Der skal det ikke
 * finnes modellberegninger, syntetiske testdata, rapporter eller kildearkivet,
 * og den eneste veien til en doseplan er {@link kliniskDoseplan} i
 * `verktoy/doseplan.ts`, som sperrer alt som ikke er en klinisk plan.
 * Erstatter de midlertidige testene fra P4 og P5 som forbød all bruk.
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { kliniskDoseplan } from '../verktoy/motor/plan'

const ROT = resolve(new URL('../', import.meta.url).pathname)
const relativ = (fil: string) => fil.slice(ROT.length + 1)

interface Importsetning {
  fra: string
  /** Navnene som importeres ved kjøring, `*` for hele modulen; tom for en import bare for sideeffekten. */
  navn: string[]
}

/** Importene som finnes ved kjøring; `import type` og `export type` forsvinner i byggingen. */
function importer(kilde: string): Importsetning[] {
  const ut: Importsetning[] = []
  for (const m of kilde.matchAll(/\b(?:import|export)\s+(type\s+)?(?:([\w$*{}\s,]+?)\s+from\s+)?['"]([^'"]+)['"]/g)) {
    if (m[1]) continue
    const klammer = /\{([^}]*)\}/.exec(m[2] ?? '')?.[1] ?? ''
    const navn = klammer
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith('type '))
      .map((s) => s.split(/\s+as\s+/)[0]!)
    // `* as x` og `export *` tar med alt modulen eksporterer.
    if (/\*/.test(m[2] ?? '')) navn.push('*')
    ut.push({ fra: m[3]!, navn })
  }
  for (const m of kilde.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) ut.push({ fra: m[1]!, navn: [] })
  return ut
}

function finnFil(fra: string, spesifikasjon: string): string | null {
  if (!spesifikasjon.startsWith('.')) return null
  const sti = resolve(dirname(fra), spesifikasjon)
  // `./x.js` i TypeScript peker på `./x.ts`.
  const uten = sti.replace(/\.js$/, '')
  for (const k of [sti, `${uten}.ts`, `${uten}.tsx`, `${sti}/index.ts`, `${sti}/index.tsx`]) {
    if (existsSync(k) && statSync(k).isFile()) return k
  }
  throw new Error(`${relativ(fra)} importerer ${spesifikasjon}, som ikke finnes`)
}

/** Alle kildefilene appen når fra `main.tsx`, med importene i hver. */
function appen(): Map<string, { importer: Importsetning[]; filer: (string | null)[] }> {
  const graf = new Map<string, { importer: Importsetning[]; filer: (string | null)[] }>()
  const ko = [resolve(ROT, 'main.tsx')]
  while (ko.length > 0) {
    const fil = ko.pop()!
    if (graf.has(fil)) continue
    const im = /\.tsx?$/.test(fil) ? importer(readFileSync(fil, 'utf8')) : []
    const filer = im.map((i) => finnFil(fil, i.fra))
    graf.set(fil, { importer: im, filer })
    for (const f of filer) if (f && !graf.has(f)) ko.push(f)
  }
  return graf
}

const GRAF = appen()
const NAADD = [...GRAF.keys()].map(relativ)

describe('Verktøyene i appen', () => {
  it('når verktøysidene og doseplanen fra main.tsx', () => {
    expect(NAADD).toEqual(expect.arrayContaining(['App.tsx', 'components/verktoy/Verktoyside.tsx', 'verktoy/doseplan.ts', 'verktoy/planvisning.ts', 'verktoy/motor/plan.ts']))
  })

  it('tar ikke med modellberegninger, syntetiske testdata, rapporter, kildearkivet eller testene', () => {
    const forbudt = NAADD.filter(
      (f) =>
        f.startsWith('__tests__/') ||
        /^verktoy\/(?:motor\/(?:syntetisk|rapport)|regler\/(?:rapport|kontroll)|kartdata|rapport|kilde[^/]*)\.ts$/.test(f) ||
        /\.test\.tsx?$/.test(f),
    )
    expect(forbudt).toEqual([])
  })

  it('får en doseplan bare gjennom kliniskDoseplan i verktoy/doseplan.ts, aldri gjennom modellberegningene', () => {
    const navn = 'kliniskDoseplan' satisfies keyof { kliniskDoseplan: typeof kliniskDoseplan }
    const bruk: Record<string, string[]> = {}
    for (const [fil, { importer: im, filer }] of GRAF) {
      const r = relativ(fil)
      if (/^verktoy\/(?:motor|regler)\//.test(r)) continue
      im.forEach((i, n) => {
        const mal = filer[n] && relativ(filer[n]!)
        if (!mal || !/^verktoy\/(?:motor|regler)\//.test(mal)) return
        for (const x of i.navn) if (['beregn', 'beregnDoseplan', '*', navn].includes(x)) (bruk[x] ??= []).push(r)
      })
    }
    expect(bruk).toEqual({ [navn]: ['verktoy/doseplan.ts'] })
  })
})
