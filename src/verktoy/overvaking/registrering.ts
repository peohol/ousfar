/**
 * Det serverendepunktet gjør med en kjøring av kildeovervåkingen (P12.1,
 * `docs/verktøy-p12-overvaking.md` §5): kontrollerer formen på rapporten og
 * melder den til databasen (`registrer_kildeovervaking`), med et avtrykk per
 * funn som krever vurdering. Databasen avgjør hvilke funn som er nye, endret
 * eller borte; en del som ikke ble kontrollert, rører ingen funn der.
 *
 * Bare funnene som krever vurdering, lagres som funn. De informative står i
 * kjøringen med id, kilde, art og etikett. Ingen kildetekst lagres.
 */
import type { Databasekall } from '../../legemiddeldata/lager.js'
import type { Utlost } from '../../server/tilgang.js'
import { KILDETEKST, ARTTEKST, NIVATEKST, PRIORITETSTEKST, type Overvakingsfunn, type Overvakingsrapport } from './modell.js'
import { funnavtrykk, kreverVurdering } from './rapport.js'

/** Lenken til kjøringen i GitHub Actions. */
export const KJORINGSLENKE = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/runs\/\d+$/

const tekst = (x: unknown, maks = 2000): x is string => typeof x === 'string' && x.length > 0 && x.length <= maks
const tekster = (x: unknown): x is string[] => Array.isArray(x) && x.length <= 200 && x.every((t) => tekst(t, 5000))
const en = <T extends string>(x: unknown, lov: Record<T, unknown>): x is T => typeof x === 'string' && Object.hasOwn(lov, x)

function erFunn(x: unknown): x is Overvakingsfunn {
  const f = x as Partial<Overvakingsfunn> | null
  return (
    !!f &&
    tekst(f.id, 300) &&
    !/\s/.test(f.id) &&
    en(f.kilde, KILDETEKST) &&
    en(f.art, ARTTEKST) &&
    en(f.niva, NIVATEKST) &&
    tekst(f.objekt, 300) &&
    tekst(f.etikett, 500) &&
    tekster(f.detaljer) &&
    Array.isArray(f.berorte) &&
    f.berorte.every((b) => !!b && tekst(b.regelsett, 200) && tekst(b.regel, 200) && Number.isInteger(b.versjon) && tekst(b.fingeravtrykk, 200) && tekst(b.hvorfor, 2000)) &&
    (f.niva === 'krever_vurdering' ? en(f.prioritet, PRIORITETSTEKST) : f.prioritet === undefined)
  )
}

/** Rapporten slik skriptet skrev den (`funn.json`), eller `null` når formen ikke stemmer. */
export function lesRapport(x: unknown): Overvakingsrapport | null {
  const r = x as Partial<Overvakingsrapport> | null
  if (
    !r ||
    r.versjon !== 1 ||
    !tekst(r.kjort_kl, 40) ||
    Number.isNaN(Date.parse(r.kjort_kl)) ||
    !Array.isArray(r.grunnlag) ||
    !r.grunnlag.every((g) => !!g && en(g.kilde, KILDETEKST) && typeof g.kjort === 'boolean' && Number.isInteger(g.kontrollert) && tekst(g.beskrivelse, 2000)) ||
    !Array.isArray(r.funn) ||
    r.funn.length > 2000 ||
    !r.funn.every(erFunn) ||
    !(r.feil === undefined || (Array.isArray(r.feil) && r.feil.every((t) => tekst(t, 5000)))) ||
    !(r.provesak === undefined || typeof r.provesak === 'boolean')
  ) {
    return null
  }
  // En prøvekjøring har bare det syntetiske funnet og kontrollerer ingen kilde, så den aldri kan merke reelle funn som borte.
  if (r.provesak && (r.grunnlag.some((g) => g.kjort) || r.funn.some((f) => f.id !== 'provesak:syntetisk'))) return null
  if (!r.provesak && r.funn.some((f) => f.id === 'provesak:syntetisk')) return null
  return { versjon: 1, kjort_kl: r.kjort_kl, grunnlag: r.grunnlag, funn: r.funn, feil: r.feil ?? [], ...(r.provesak ? { provesak: true } : {}) }
}

/** Det databasen får (`registrer_kildeovervaking`). */
export function melding(r: Overvakingsrapport, utlost: Utlost, lenke: string | null) {
  return {
    kjort_kl: r.kjort_kl,
    utlost,
    prove: !!r.provesak,
    lenke,
    grunnlag: r.grunnlag,
    feil: r.feil,
    informative: r.funn.filter((f) => f.niva === 'informativ').map(({ id, kilde, art, etikett }) => ({ id, kilde, art, etikett })),
    funn: kreverVurdering(r).map((f) => ({ avtrykk: funnavtrykk(f), innhold: f })),
  }
}

export interface Registrert {
  kjoring: number
  nye: number
  borte: number
  apne: number
}

export async function registrer(kall: Databasekall, r: Overvakingsrapport, utlost: Utlost, lenke: string | null): Promise<Registrert> {
  return (await kall('registrer_kildeovervaking', { melding: melding(r, utlost, lenke) })) as Registrert
}

/** Den tekniske vurderingen fra en agent, for det åpne funnet med nøkkelen. */
export async function tekniskFraAgent(kall: Databasekall, funn: string, vurdering: string, agent: string): Promise<number> {
  return Number(await kall('kildefunn_teknisk_fra_agent', { funn, vurdering, agent }))
}
