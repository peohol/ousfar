/**
 * Hvilke endringer som er slått sammen i `main`, og i hvilken rekkefølge, lest
 * fra Git når appen bygges. Brukes av byggingen (`vite.config.ts`) og testene,
 * aldri av appen i nettleseren; den får resultatet ferdig beregnet.
 *
 * Rekkefølgen er førsteforelder-historikken til commiten som bygges: commitene
 * slik de ble lagt på `main`, én per sammenslått PR. En endring regnes som
 * publisert i commiten som la til fila dens der. Det er samme svar hver gang
 * den commiten bygges, også senere, og en ny sammenslåing legger bare til
 * commits etter den. Tidspunktet PR-en eller føringen ble laget, og
 * filnavnenes rekkefølge, betyr ingenting.
 *
 * Byggingen stopper med en tydelig feil i stedet for å gjette når
 * historikken ikke kan leses helt, når en publisert endring er slettet, eller
 * når leddet den økte eller hvem den vises for, er endret etterpå.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { HISTORISKE_ENDRINGER } from '../data/endringshistorikk'
import type { Endring } from '../domain/versjon'
import { lesEndringsforing, nummerer, startversjon, type Endringsforing, type Publisering } from '../domain/versjonering'

/** Mappa med én fil per endring, fra repoets rot. */
export const ENDRINGSMAPPE = 'src/data/endringer'

/** Feil som gjør at versjonen ikke kan beregnes sikkert. Byggingen stopper på den. */
export class Versjoneringsfeil extends Error {
  constructor(melding: string) {
    super(`Versjonen kan ikke beregnes: ${melding}`)
    this.name = 'Versjoneringsfeil'
  }
}

export interface Endringshistorikk {
  /** Endringene som er slått sammen, med commiten som tok dem inn. */
  publiserte: Publisering[]
  /** Filer i arbeidstreet som ikke er i historikken ennå, som i et lokalt bygg. */
  upubliserte: Endringsforing[]
}

type Miljo = Record<string, string | undefined>

function git(rot: string, args: readonly string[], input?: string): string {
  return execFileSync('git', args, { cwd: rot, encoding: 'utf8', input, maxBuffer: 1 << 28, stdio: ['pipe', 'pipe', 'pipe'] })
}

function gitBuffer(rot: string, args: readonly string[], input: string): Buffer {
  return execFileSync('git', args, { cwd: rot, input, maxBuffer: 1 << 28, stdio: ['pipe', 'pipe', 'pipe'] })
}

function prov(handling: () => unknown): boolean {
  try {
    handling()
    return true
  } catch {
    return false
  }
}

/**
 * Stedene den fulle historikken kan hentes fra: `origin` når den finnes, og
 * ellers repoet byggetjenesten oppgir. Vercel kloner bare de siste ti
 * commitene og setter ingen `origin`; GitHub Actions henter ofte bare én.
 */
export function historikkilder(rot: string, miljo: Miljo): string[] {
  const kilder: string[] = []
  if (prov(() => git(rot, ['remote', 'get-url', 'origin']))) kilder.push('origin')
  if (miljo.VERCEL_GIT_REPO_OWNER && miljo.VERCEL_GIT_REPO_SLUG && (miljo.VERCEL_GIT_PROVIDER ?? 'github') === 'github')
    kilder.push(`https://github.com/${miljo.VERCEL_GIT_REPO_OWNER}/${miljo.VERCEL_GIT_REPO_SLUG}.git`)
  if (miljo.GITHUB_SERVER_URL && miljo.GITHUB_REPOSITORY) kilder.push(`${miljo.GITHUB_SERVER_URL}/${miljo.GITHUB_REPOSITORY}.git`)
  return [...new Set(kilder)]
}

/**
 * Sørger for at hele historikken bak commiten som bygges, er her. En grunn
 * klone (`git clone --depth`) hentes ut; går ikke det, stopper byggingen.
 */
export function sikreHelHistorikk(rot: string, miljo: Miljo = process.env, logg: (linje: string) => void = console.log): void {
  if (!prov(() => git(rot, ['rev-parse', '--is-inside-work-tree']))) {
    throw new Versjoneringsfeil(`${rot} er ikke et Git-arbeidstre, så rekkefølgen endringene ble slått sammen i, er ukjent.`)
  }
  const grunn = () => git(rot, ['rev-parse', '--is-shallow-repository']).trim() === 'true'
  if (!grunn()) return
  const commit = git(rot, ['rev-parse', 'HEAD']).trim()
  for (const kilde of historikkilder(rot, miljo)) {
    logg(`Henter hele Git-historikken for å beregne versjonen (${kilde.replace(/\/\/[^@/]*@/, '//')})`)
    // Først commiten som bygges, som også finnes når grenen er en PR; ellers alt kilden har.
    const hentet =
      prov(() => git(rot, ['fetch', '--quiet', '--no-tags', '--unshallow', kilde, commit])) ||
      prov(() => git(rot, ['fetch', '--quiet', '--no-tags', '--unshallow', kilde]))
    if (hentet && !grunn()) return
  }
  throw new Versjoneringsfeil(
    'Git-historikken er avkortet, og hele historikken kunne ikke hentes. Uten den er rekkefølgen endringene ble slått sammen i, ukjent.',
  )
}

interface Tillegg {
  commit: string
  tidspunkt: string
  rekkefolge: number
}

/** Hvor endringsfilene ble lagt til i førsteforelder-historikken, og om noen er slettet. */
function lesTillegg(rot: string): Map<string, Tillegg> {
  const utskrift = git(rot, [
    'log',
    '--first-parent',
    '--diff-merges=first-parent',
    '--reverse',
    '--no-renames',
    '--format=%x1e%H%x1f%cI',
    '--name-status',
    'HEAD',
    '--',
    ENDRINGSMAPPE,
  ])
  const tillegg = new Map<string, Tillegg>()
  let rekkefolge = 0
  for (const blokk of utskrift.split('\x1e').slice(1)) {
    const [hode = '', ...linjer] = blokk.split('\n')
    const [commit = '', tidspunkt = ''] = hode.split('\x1f')
    for (const linje of linjer) {
      const [status = '', sti = ''] = linje.split('\t')
      const navn = endringsnavn(sti)
      if (!navn) continue
      const tidligere = tillegg.get(navn)
      if (status.startsWith('D') && tidligere) {
        throw new Versjoneringsfeil(
          `endringen ${navn} ble publisert i ${tidligere.commit.slice(0, 7)} og slettet i ${commit.slice(0, 7)}. ` +
            'En publisert endring kan ikke fjernes eller gis nytt navn; en tilbakerulling føres som en ny endring.',
        )
      }
      if (status.startsWith('A') && !tidligere) tillegg.set(navn, { commit, tidspunkt, rekkefolge })
    }
    rekkefolge++
  }
  return tillegg
}

/** ID-en til en endringsfil rett under mappa, eller `null` for alt annet. */
function endringsnavn(sti: string): string | null {
  const treff = new RegExp(`^${ENDRINGSMAPPE}/([^/]+)\\.json$`).exec(sti)
  return treff?.[1] ?? null
}

/** Innholdet i filene slik de var i commitene som publiserte dem, med én `git cat-file`. */
function lesVedPublisering(rot: string, tillegg: Map<string, Tillegg>): Map<string, Endringsforing> {
  const navn = [...tillegg.keys()]
  if (navn.length === 0) return new Map()
  const ut = gitBuffer(
    rot,
    ['cat-file', '--batch'],
    navn.map((n) => `${tillegg.get(n)!.commit}:${ENDRINGSMAPPE}/${n}.json\n`).join(''),
  )
  const foringer = new Map<string, Endringsforing>()
  let pos = 0
  for (const n of navn) {
    const linjeslutt = ut.indexOf(0x0a, pos)
    const hode = ut.subarray(pos, linjeslutt).toString('utf8')
    const storrelse = /^\S+ blob (\d+)$/.exec(hode)?.[1]
    if (storrelse === undefined) throw new Versjoneringsfeil(`fant ikke endringen ${n} i commiten som publiserte den (${hode}).`)
    const innhold = ut.subarray(linjeslutt + 1, linjeslutt + 1 + Number(storrelse)).toString('utf8')
    foringer.set(n, lesFil(innhold, n))
    pos = linjeslutt + 1 + Number(storrelse) + 1
  }
  return foringer
}

function lesFil(innhold: string, navn: string): Endringsforing {
  let data: unknown
  try {
    data = JSON.parse(innhold)
  } catch (feil) {
    throw new Versjoneringsfeil(`endringen ${navn} er ikke gyldig JSON (${(feil as Error).message}).`)
  }
  try {
    return lesEndringsforing(data, navn)
  } catch (feil) {
    throw new Versjoneringsfeil((feil as Error).message)
  }
}

/** Endringsfilene i arbeidstreet, etter ID. */
export function lesEndringsfiler(rot: string): Map<string, Endringsforing> {
  const mappe = join(rot, ENDRINGSMAPPE)
  const filer = existsSync(mappe) ? readdirSync(mappe).filter((f) => f.endsWith('.json')).sort() : []
  return new Map(filer.map((f) => [f.slice(0, -'.json'.length), lesFil(readFileSync(join(mappe, f), 'utf8'), f.slice(0, -5))]))
}

/**
 * Endringene som er slått sammen, i rekkefølge, og dem som bare finnes i
 * arbeidstreet. Teksten i en publisert endring kan rettes senere; at den
 * finnes, hvilket ledd den økte og hvem den vises for, kan ikke.
 */
export function lesEndringshistorikk(rot: string, miljo: Miljo = process.env, logg?: (linje: string) => void): Endringshistorikk {
  sikreHelHistorikk(rot, miljo, logg)
  const tillegg = lesTillegg(rot)
  const vedPublisering = lesVedPublisering(rot, tillegg)
  const iTreet = lesEndringsfiler(rot)

  const publiserte: Publisering[] = []
  for (const [navn, t] of tillegg) {
    const naa = iTreet.get(navn)
    const da = vedPublisering.get(navn)!
    if (!naa) {
      throw new Versjoneringsfeil(
        `endringen ${navn} ble publisert i ${t.commit.slice(0, 7)}, men fila finnes ikke lenger. ` +
          'En publisert endring kan ikke fjernes; en tilbakerulling føres som en ny endring.',
      )
    }
    if (naa.semver !== da.semver) {
      throw new Versjoneringsfeil(
        `endringen ${navn} ble publisert som ${da.semver}, men fila sier nå ${naa.semver}. Leddet en publisert endring økte, kan ikke endres.`,
      )
    }
    if ((naa.bareSystemarkitekter === true) !== (da.bareSystemarkitekter === true)) {
      const hvem = (f: Endringsforing) => (f.bareSystemarkitekter ? 'bare for systemarkitektene' : 'for alle')
      throw new Versjoneringsfeil(
        `endringen ${navn} ble publisert ${hvem(da)}, men fila sier nå ${hvem(naa)}. Hvem en publisert endring vises for, kan ikke endres; ` +
          'skriv en ny føring for alle når funksjonen tas i bruk (docs/endringslogg.md).',
      )
    }
    publiserte.push({ foring: naa, semver: da.semver, commit: t.commit, tidspunkt: t.tidspunkt, rekkefolge: t.rekkefolge })
  }
  const upubliserte = [...iTreet.values()].filter((f) => !tillegg.has(f.id))
  return { publiserte, upubliserte }
}

/**
 * Endringene med egen fil, nummerert og nyest først, slik byggingen legger dem
 * inn i appen. Versjonene fortsetter fra den øverste i arkivet.
 */
export function beregnNyeEndringer(rot: string, miljo: Miljo = process.env, logg: (linje: string) => void = console.log): Endring[] {
  const { publiserte, upubliserte } = lesEndringshistorikk(rot, miljo, logg)
  const start = startversjon(HISTORISKE_ENDRINGER)
  const nye = nummerer(start, publiserte, upubliserte)
  const versjon = nye.find((e) => !e.bareSystemarkitekter)?.versjon ?? start
  const forelopige = upubliserte.length ? `, ${upubliserte.length} ikke slått sammen ennå (foreløpige numre)` : ''
  const utproving = nye.filter((e) => e.bareSystemarkitekter).length
  const skjulte = utproving ? `, ${utproving} av dem bare for systemarkitektene` : ''
  logg(`Versjon ${versjon}: ${nye.length} endringer etter ${start}${skjulte}${forelopige}`)
  return nye
}
