/**
 * Én kjøring av oppryddingen av kuratorjobbgrenene: henter grenene,
 * resultatene, kurateringskøen, de åpne PR-ene og kurateringsgrenene i
 * OUSFAR, vurderer hver jobbgren etter reglene i `./rydding`, og sletter de
 * som kan slettes. GitHub og OUSFAR kommer inn utenfra, så kjøringen kan
 * prøves uten nettverk.
 */
import { createHash } from 'node:crypto'
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
  /** Grenene i dette repoet som åpne PR-er kommer fra. */
  apnePr(): Promise<string[]>
  slett(navn: string): Promise<void>
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
  const slettet = new Set<string>()
  for (const v of oversikt.slettes) {
    const sha = jobber.find((j) => j.navn === v.gren)!.sha
    if (kunVis) {
      logg(`VILLE SLETTET: ${v.gren} (${v.grunn})`)
      continue
    }
    // Ingen sletting av en gren som er endret siden den ble vurdert.
    const nyss = await github.gren(v.gren)
    if (!nyss || nyss.sha !== sha) {
      logg(`BEHOLDT: ${v.gren} (endret underveis)`)
      continue
    }
    await github.slett(v.gren)
    slettet.add(v.gren)
    logg(`SLETTET: ${v.gren} (${v.grunn})`)
  }
  for (const v of oversikt.beholdes) logg(`BEHOLDT: ${v.gren} (${v.grunn})`)
  for (const a of oversikt.advarsler) logg(`ADVARSEL: ${a}`)
  return { oversikt, slettet, alleGrener: alle.length }
}

/** `Ryddegithub` gjennom GitHubs REST-API med arbeidsflytens nøkkel. */
export function lagRyddegithub(repo: string, token: string, hent: typeof fetch = fetch): Ryddegithub {
  const hode = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  async function api(sti: string, metode = 'GET'): Promise<unknown> {
    const svar = await hent(`https://api.github.com/repos/${repo}/${sti}`, { method: metode, headers: hode })
    if (svar.status === 404) return null
    if (!svar.ok) throw new Error(`GitHub svarte ${svar.status} på ${metode} ${sti.split('?')[0]}.`)
    return svar.status === 204 ? null : svar.json()
  }
  const refsti = (navn: string) => navn.split('/').map(encodeURIComponent).join('/')
  return {
    async grener() {
      const ut: { navn: string; sha: string; beskyttet: boolean }[] = []
      for (let side = 1; ; side += 1) {
        const rader = await api(`branches?per_page=100&page=${side}`)
        if (!Array.isArray(rader)) throw new Error('Fikk ingen gyldig liste over grenene.')
        for (const r of rader as { name: string; commit: { sha: string }; protected?: boolean }[]) ut.push({ navn: r.name, sha: r.commit.sha, beskyttet: r.protected === true })
        if (rader.length < 100) return ut
        if (side === 30) throw new Error('Over 3000 grener: avbryter for sikkerhets skyld.')
      }
    },
    async gren(navn) {
      // Hele navnet er én parameter i GitHubs API, også skråstreken.
      const r = (await api(`branches/${encodeURIComponent(navn)}`)) as { commit?: { sha?: string; commit?: { committer?: { date?: string } } } } | null
      if (!r?.commit?.sha) return null
      return { sha: r.commit.sha, commit_kl: r.commit.commit?.committer?.date ?? null }
    },
    async fil(sti, ref) {
      const f = (await api(`contents/${sti}?ref=${encodeURIComponent(ref)}`)) as { type?: string; encoding?: string; content?: string } | null
      if (!f || f.type !== 'file' || f.encoding !== 'base64' || typeof f.content !== 'string') return null
      return Buffer.from(f.content.replace(/\s/g, ''), 'base64')
    },
    async apnePr() {
      const ut: string[] = []
      for (let side = 1; side <= 20; side += 1) {
        const rader = ((await api(`pulls?state=open&per_page=100&page=${side}`)) ?? []) as { head?: { ref?: string; repo?: { full_name?: string } | null } }[]
        for (const r of rader) if (r.head?.repo?.full_name === repo && r.head.ref) ut.push(r.head.ref)
        if (rader.length < 100) break
      }
      return ut
    },
    async slett(navn) {
      if (!navn.startsWith(JOBBGRENPREFIKS)) throw new Error(`Sletter bare jobbgrener, ikke ${navn}.`)
      await api(`git/refs/heads/${refsti(navn)}`, 'DELETE')
    },
  }
}
