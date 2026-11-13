/**
 * Planleggingen bak utrullingen av Edge-funksjonene (docs/edge-funksjoner.md).
 *
 * Utrullingen er tilstandsbasert: den sammenligner kildefilene hver funksjon i
 * repoet består av (inngangsfila og alt den importerer fra `_edge/` og
 * `_delt/`), med kildefilene funksjonen i produksjonen faktisk kjører. Bare
 * funksjoner som avviker, rulles ut, og en endring i en felles fil rammer
 * nøyaktig de funksjonene som importerer den. Ingenting slettes.
 *
 * Alt her er rene funksjoner; innhentingen og utrullingen står i
 * `scripts/edgeutrulling.ts`.
 */
import { posix } from 'node:path'

/** Kildefilene til én funksjon: sti relativt til `supabase/functions/` → innhold. */
export type Kildefiler = Readonly<Record<string, string>>

/** Inngangsfila i hver funksjonsmappe. */
export const INNGANG = 'index.ts'

/** Gyldig navn (slug) på en Edge-funksjon i Supabase. */
const SLUG = /^[a-z0-9][a-z0-9_-]*$/

/** Om mappen i `supabase/functions/` er en funksjon: mapper som begynner med `_` er felles kode. */
export function erFunksjonsmappe(navn: string): boolean {
  return !navn.startsWith('_') && !navn.startsWith('.') && SLUG.test(navn)
}

/**
 * De relative importene i en TypeScript-fil (`./` og `../`) som blir med i
 * bunten Supabase lager, i rekkefølge. Rene typeimporter (`import type …`,
 * `export type … from`) fjernes av bunteren og tas ikke med, slik at
 * sammenligningen med produksjonen ser de samme filene. Eksterne importer
 * (`npm:`, `jsr:`, `https:`) løses av Supabase og er en del av teksten som
 * sammenlignes, så de trenger ikke følges.
 */
export function relativeImporter(kode: string): string[] {
  const uten = kode.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
  const funn = [
    ...uten.matchAll(/\b(import|export)\s+(type\s+)?(?:[\w*{}\s,$]+?\s+from\s+)?['"]([^'"]+)['"]/g),
    ...uten.matchAll(/\b(import)\s*\(\s*()['"]([^'"]+)['"]\s*\)/g),
  ]
    .filter((m) => !m[2])
    .map((m) => m[3] as string)
    .filter((s) => s.startsWith('./') || s.startsWith('../'))
  return [...new Set(funn)]
}

export class Utrullingsfeil extends Error {}

/**
 * Alle kildefilene funksjonen består av, fra inngangsfila og videre gjennom de
 * relative importene. `les` gir innholdet i en fil under `supabase/functions/`,
 * eller `undefined` når den ikke finnes.
 */
export function funksjonsfiler(slug: string, les: (sti: string) => string | undefined): Kildefiler {
  const filer: Record<string, string> = {}
  const ko = [`${slug}/${INNGANG}`]
  while (ko.length) {
    const sti = ko.shift() as string
    if (sti in filer) continue
    const innhold = les(sti)
    if (innhold === undefined) throw new Utrullingsfeil(`${slug}: finner ikke ${sti}`)
    filer[sti] = innhold
    for (const imp of relativeImporter(innhold)) {
      const mal = posix.normalize(posix.join(posix.dirname(sti), imp))
      if (mal.startsWith('../') || posix.isAbsolute(mal)) {
        throw new Utrullingsfeil(`${slug}: ${sti} importerer ${imp}, som ligger utenfor supabase/functions/`)
      }
      ko.push(mal)
    }
  }
  return sortert(filer)
}

function sortert(filer: Record<string, string>): Kildefiler {
  return Object.fromEntries(Object.entries(filer).sort(([a], [b]) => a.localeCompare(b)))
}

/**
 * `verify_jwt` for hver funksjon i `supabase/config.toml`. Utrullingen leser
 * bare dette ene feltet; andre felt under `[functions.*]` (egen inngangsfil,
 * import map, statiske filer) støttes ikke og stopper utrullingen.
 */
export function funksjonsoppsett(toml: string): Record<string, { verifyJwt: boolean }> {
  const oppsett: Record<string, { verifyJwt?: boolean }> = {}
  let gjeldende: string | undefined
  for (const [nr, raa] of toml.split('\n').entries()) {
    const linje = raa.replace(/#.*$/, '').trim()
    if (!linje) continue
    const seksjon = /^\[\s*([^\]]+?)\s*\]$/.exec(linje)
    if (seksjon) {
      const navn = (seksjon[1] as string).replace(/"/g, '')
      gjeldende = navn.startsWith('functions.') ? navn.slice('functions.'.length) : undefined
      if (gjeldende !== undefined) {
        if (gjeldende in oppsett) throw new Utrullingsfeil(`config.toml: [functions.${gjeldende}] står to ganger`)
        oppsett[gjeldende] = {}
      }
      continue
    }
    if (gjeldende === undefined) continue
    const felt = /^([\w-]+)\s*=\s*(.+)$/.exec(linje)
    if (felt?.[1] === 'verify_jwt' && /^(true|false)$/.test(felt[2] as string)) {
      ;(oppsett[gjeldende] as { verifyJwt?: boolean }).verifyJwt = felt[2] === 'true'
    } else {
      throw new Utrullingsfeil(`config.toml linje ${nr + 1}: [functions.${gjeldende}] støtter bare verify_jwt = true|false`)
    }
  }
  return Object.fromEntries(
    Object.entries(oppsett).map(([slug, o]) => {
      if (o.verifyJwt === undefined) throw new Utrullingsfeil(`config.toml: [functions.${slug}] mangler verify_jwt`)
      return [slug, { verifyJwt: o.verifyJwt }]
    }),
  )
}

/**
 * Kildefilene til en utrullet funksjon, med stiene slik repoet har dem.
 * Supabase legger inngangsfila i en mappe (som `…/source/index.ts`) og de
 * felles filene ved siden av den (`…/_edge/kontekst.ts`); mappen over
 * inngangsfilas mappe svarer til `supabase/functions/`. En fil utenfor den
 * beholder stien sin med `?/` foran, så den alltid gir et avvik.
 */
export function normaliserUtrullet(slug: string, inngang: string, filer: Readonly<Record<string, string>>): Kildefiler {
  const mappe = posix.dirname(inngang)
  const rot = posix.dirname(mappe)
  const relativ = (sti: string, fra: string) => (fra === '.' ? sti : sti.startsWith(`${fra}/`) ? sti.slice(fra.length + 1) : undefined)
  const ut: Record<string, string> = {}
  for (const [sti, innhold] of Object.entries(filer)) {
    const iMappe = relativ(sti, mappe)
    const iRot = relativ(sti, rot)
    ut[iMappe !== undefined ? `${slug}/${iMappe}` : iRot !== undefined ? iRot : `?/${sti}`] = innhold
  }
  return sortert(ut)
}

/** Filnavnene funksjonen lastes opp med: relativt til funksjonsmappen, med `../` for felles filer. */
export function opplastingsnavn(slug: string, filer: Kildefiler): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filer).map(([sti, innhold]) => [sti.startsWith(`${slug}/`) ? sti.slice(slug.length + 1) : `../${sti}`, innhold]),
  )
}

/** Filene som er lagt til, fjernet eller endret mellom to versjoner. */
export function endredeFiler(fra: Kildefiler, til: Kildefiler): string[] {
  return [...new Set([...Object.keys(fra), ...Object.keys(til)])].filter((s) => fra[s] !== til[s]).sort()
}

export const likeFiler = (a: Kildefiler, b: Kildefiler) => endredeFiler(a, b).length === 0

export interface Repofunksjon {
  filer: Kildefiler
  verifyJwt: boolean
  /** Funksjonens tidligere versjoner i `main`, eldst først. */
  tidligere: readonly Kildefiler[]
}

export interface Utrullet {
  filer: Kildefiler
  verifyJwt: boolean
  status: string
  versjon: number
}

export type Handling =
  /** Produksjonen kjører det repoet har. */
  | 'uendret'
  /** Finnes i repoet, ikke i produksjonen: opprettes. */
  | 'ny'
  /** Produksjonen kjører en tidligere versjon fra repoet, eller et annet oppsett: oppdateres. */
  | 'oppdater'
  /** Produksjonen kjører kode som ikke finnes i repoets historikk: stopper, overskrives bare på uttrykkelig valg. */
  | 'avvik'
  /** Finnes bare i produksjonen: røres aldri, meldes. */
  | 'bare-i-produksjonen'

export interface Planpunkt {
  slug: string
  handling: Handling
  grunn: string
  filer: string[]
}

/** Hva som skal gjøres med hver funksjon, sortert etter navn. */
export function planlegg(
  repo: Readonly<Record<string, Repofunksjon>>,
  produksjon: Readonly<Record<string, Utrullet>>,
  overskriv: readonly string[] = [],
): Planpunkt[] {
  const plan: Planpunkt[] = []
  for (const slug of [...new Set([...Object.keys(repo), ...Object.keys(produksjon)])].sort()) {
    const r = repo[slug]
    const p = produksjon[slug]
    if (!r) {
      plan.push({ slug, handling: 'bare-i-produksjonen', grunn: 'finnes ikke i repoet; slettes ikke av utrullingen', filer: [] })
    } else if (!p) {
      plan.push({ slug, handling: 'ny', grunn: 'finnes ikke i produksjonen', filer: Object.keys(r.filer) })
    } else {
      const filer = endredeFiler(p.filer, r.filer)
      const grunner = [
        ...(filer.length ? [`${filer.length} fil(er) er endret`] : []),
        ...(p.verifyJwt !== r.verifyJwt ? [`verify_jwt er ${p.verifyJwt} i produksjonen, ${r.verifyJwt} i repoet`] : []),
        ...(p.status !== 'ACTIVE' ? [`status i produksjonen er ${p.status}`] : []),
      ]
      if (!grunner.length) plan.push({ slug, handling: 'uendret', grunn: `versjon ${p.versjon} er lik repoet`, filer })
      else if (!filer.length || r.tidligere.some((t) => likeFiler(t, p.filer))) {
        plan.push({ slug, handling: 'oppdater', grunn: grunner.join('; '), filer })
      } else if (overskriv.includes(slug)) {
        plan.push({ slug, handling: 'oppdater', grunn: `${grunner.join('; ')}; overskriver kode som ikke finnes i repoet (uttrykkelig valgt)`, filer })
      } else {
        plan.push({ slug, handling: 'avvik', grunn: `produksjonen kjører kode som ikke finnes i repoets historikk (${grunner.join('; ')})`, filer })
      }
    }
  }
  return plan
}

/** Funksjonene planen ruller ut. */
export const skalRullesUt = (plan: readonly Planpunkt[]) => plan.filter((p) => p.handling === 'ny' || p.handling === 'oppdater')

/** Det som stopper utrullingen. */
export const stoppendeAvvik = (plan: readonly Planpunkt[]) => plan.filter((p) => p.handling === 'avvik')

/** Planen som en Markdown-tabell, for sammendraget i GitHub Actions. */
export function planTabell(plan: readonly Planpunkt[]): string {
  const rader = plan.map((p) => `| \`${p.slug}\` | ${p.handling} | ${p.grunn}${p.filer.length && p.handling !== 'ny' ? `: ${p.filer.map((f) => `\`${f}\``).join(', ')}` : ''} |`)
  return ['| Funksjon | Handling | Hvorfor |', '| --- | --- | --- |', ...rader].join('\n')
}
