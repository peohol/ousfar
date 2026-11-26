/**
 * Én kjøring av oppryddingen av kuratorjobbgrenene: henter grenene,
 * resultatene, kurateringskøen, de åpne PR-ene og kurateringsgrenene i
 * OUSFAR, vurderer hver jobbgren etter reglene i `./rydding`, og sletter de
 * som kan slettes. GitHub og OUSFAR kommer inn utenfra, så kjøringen kan
 * prøves uten nettverk.
 */
import { createHash } from 'node:crypto'
import type { Grensletter, Slettutfall } from '../github/gitslett'
import { alleGrener, githubRest, grenerIBruk, grenNa, lesPrer } from '../github/rest'
import { slettRunde } from '../github/slettrunde'
import type { Greninfo } from '../kurateringsko/modell'
import { FORESPORSELSFIL, JOBBGRENPREFIKS, STATUSFIL } from './modell'
import { vurderAlle, type Jobbgren, type Ryddeoversikt } from './rydding'

/** Grenen kurateringskøen holder tilstanden sin på. Ligger utenfor `kuratorjobb/` og røres aldri her. */
export const KOGREN = 'kurateringsko/tilstand'
export const KOFIL = 'kurateringsko/ko.json'

/** Eldre kø enn dette regnes som usikker, og ingenting slettes. */
const KO_MAKS_ALDER = 86_400_000

/** Det kjøringen trenger fra GitHub. */
export interface Ryddegithub {
  /** Alle grenene i repoet, med commiten hver peker på. */
  grener(): Promise<{ navn: string; sha: string; beskyttet: boolean }[]>
  /** Én gren nå, med tidspunktet for commiten; `null` når den er borte. */
  gren(navn: string): Promise<{ sha: string; commit_kl: string | null } | null>
  /** En fil på en gren, eller `null` når den mangler. */
  fil(sti: string, gren: string): Promise<Buffer | null>
  /** Grenene åpne PR-er kommer fra eller skal inn i (også fra et annet repo). Feiler heller enn å gi en ufullstendig liste. */
  apnePr(): Promise<string[]>
  /** Sletter grenen bare om den fortsatt står på commiten; kaster ved en driftsfeil. */
  slett(navn: string, sha: string): Promise<Slettutfall>
}

export interface Ryddevalg {
  github: Ryddegithub
  /** Kurateringsgrenene i OUSFAR. */
  grener: () => Promise<readonly Greninfo[]>
  kunVis: boolean
  na: string
  logg?: (linje: string) => void
}

export interface Ryddeutfall {
  oversikt: Ryddeoversikt
  slettet: Set<string>
  /** Grener reglene ville slettet, men som ble beholdt fordi noe endret seg underveis, med hvorfor. */
  underveis: Map<string, string>
  /** Feilen som stoppet slettingen, eller `null`. */
  feil: string | null
  alleGrener: number
}

/** Innholdet som JSON, eller `null` når det mangler eller ikke er gyldig JSON. */
function json(bytes: Buffer | null): unknown {
  if (!bytes) return null
  try {
    return JSON.parse(bytes.toString('utf8'))
  } catch {
    return null
  }
}

/** Jobbgrenene kurateringskøen har koblet til noe: en reservasjon, et gjenopptak, en kurateringsgren eller en PR. */
export function jobbgrenerIKoen(ko: unknown): Set<string> {
  const ut = new Set<string>()
  const stoffer = (ko as { stoffer?: unknown })?.stoffer
  if (typeof stoffer !== 'object' || stoffer === null) return ut
  for (const s of Object.values(stoffer as Record<string, Record<string, unknown> | null>)) {
    for (const del of ['reservasjon', 'gjenoppta', 'appgren', 'pr']) {
      const navn = (s?.[del] as { jobbgren?: unknown } | null | undefined)?.jobbgren
      if (typeof navn === 'string' && navn.startsWith(JOBBGRENPREFIKS)) ut.add(navn)
    }
  }
  return ut
}

/** Køen, når den har kjent form og er oppdatert siste døgn; ellers en feil, så ingenting slettes. */
function kontrollerKo(ko: unknown, na: number) {
  const k = ko as { versjon?: unknown; oppdatert_kl?: unknown; stoffer?: unknown } | null
  const oppdatert = typeof k?.oppdatert_kl === 'string' ? Date.parse(k.oppdatert_kl) : NaN
  if (!k || k.versjon !== 1 || typeof k.stoffer !== 'object' || k.stoffer === null || !Number.isFinite(oppdatert) || oppdatert > na + 60_000 || na - oppdatert > KO_MAKS_ALDER) {
    throw new Error('Kurateringskøen mangler, har ukjent form eller er eldre enn ett døgn. Ingen grener slettes.')
  }
}

/**
 * Kurateringsgrenene er fasiten for hva som pågår og hva som er ferdig brukt.
 * Uten dem alle, og uten koblingene til jobbgrenene på hver, kan en jobb
 * en pågående kuratering trenger, se ubrukt ut; da slettes ingenting.
 */
export function kontrollerGrener(grener: readonly Greninfo[]) {
  if (grener.length === 0) throw new Error('Fikk ingen kurateringsgrener fra OUSFAR. Ingen grener slettes.')
  const uten = grener.filter((g) => !Array.isArray(g.kuratorjobber)).length
  if (uten > 0) throw new Error(`${uten} av ${grener.length} kurateringsgrener fra OUSFAR mangler koblingene til jobbgrenene. Ingen grener slettes.`)
}

export async function kjorRydding({ github, grener: lesGrener, kunVis, na, logg = console.log }: Ryddevalg): Promise<Ryddeutfall> {
  const naTid = Date.parse(na)
  const ko = json(await github.fil(KOFIL, KOGREN))
  kontrollerKo(ko, naTid)
  const kurateringsgrener = await lesGrener()
  kontrollerGrener(kurateringsgrener)
  const [alle, apnePr] = await Promise.all([github.grener(), github.apnePr()])
  const jobbgrener = alle.filter((g) => g.navn.startsWith(JOBBGRENPREFIKS))

  const jobber: (Jobbgren & { sha: string })[] = []
  for (const g of jobbgrener) {
    // Filene leses fra commiten grenen ble listet med, så de hører sammen.
    const [detaljer, status, foresporsel] = await Promise.all([github.gren(g.navn), github.fil(STATUSFIL, g.sha), github.fil(FORESPORSELSFIL, g.sha)])
    if (!detaljer) continue // Slettet av noen andre underveis.
    jobber.push({
      navn: g.navn,
      sha: g.sha,
      beskyttet: g.beskyttet,
      commit_kl: detaljer.sha === g.sha ? detaljer.commit_kl : null,
      status: json(status),
      foresporsel_sha256: foresporsel ? createHash('sha256').update(foresporsel).digest('hex') : null,
    })
  }

  const oversikt = vurderAlle(jobber, { na, apnePr: new Set(apnePr), iKoen: jobbgrenerIKoen(ko), grener: kurateringsgrener })
  const runde = await slettRunde({
    grener: oversikt.slettes.map((v) => ({ gren: v.gren, sha: jobber.find((j) => j.navn === v.gren)!.sha, grunn: v.grunn })),
    kunVis,
    iBruk: async () => new Set(await github.apnePr()),
    slett: (gren, sha) => github.slett(gren, sha),
    logg,
  })
  for (const v of oversikt.beholdes) logg(`BEHOLDT: ${v.gren} (${v.grunn})`)
  for (const a of oversikt.advarsler) logg(`ADVARSEL: ${a}`)
  return { oversikt, ...runde, alleGrener: alle.length }
}

/** `Ryddegithub` gjennom GitHubs REST-API med arbeidsflytens nøkkel; slettingen gjennom git (`../github/gitslett`). */
export function lagRyddegithub(repo: string, token: string, sletter: Grensletter, hent: typeof fetch = fetch): Ryddegithub {
  const api = githubRest(repo, token, hent)
  return {
    grener: () => alleGrener(api),
    gren: (navn) => grenNa(api, navn),
    async fil(sti, ref) {
      const f = (await api(`contents/${sti}?ref=${encodeURIComponent(ref)}`)) as { type?: string; encoding?: string; content?: string } | null
      if (!f || f.type !== 'file' || f.encoding !== 'base64' || typeof f.content !== 'string') return null
      return Buffer.from(f.content.replace(/\s/g, ''), 'base64')
    },
    apnePr: async () => [...grenerIBruk(await lesPrer(api, repo, 'open'))],
    async slett(navn, sha) {
      if (!navn.startsWith(JOBBGRENPREFIKS)) throw new Error(`Sletter bare jobbgrener, ikke ${navn}.`)
      return sletter(navn, sha)
    },
  }
}
