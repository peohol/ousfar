/**
 * Kurateringsgrenene i OUSFAR, slik køen leser dem fra `/api/kuratering-ko`
 * (`docs/kurateringsko.md`, «Kurateringsgrenene»). Køen kaller med et
 * OIDC-token GitHub utsteder for kjøringen, så ingen hemmelighet lagres.
 */
import { jobbgrenI } from '../kuratorjobb/rydding'
import { GRENSTATUSER, type Greninfo } from './modell'

type Miljo = Record<string, string | undefined>
type Hent = (adresse: string, valg?: RequestInit) => Promise<Response>

/** Publikummet tokenet utstedes for; det samme som serveren krever (`GITHUB_OIDC.publikum`). */
export const OIDC_PUBLIKUM = 'ousfar'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

/** Et OIDC-token fra GitHub Actions for kjøringen, eller `null` utenfor Actions (eller uten `id-token: write`). */
export async function oidcToken(miljo: Miljo, hent: Hent = fetch): Promise<string | null> {
  const url = miljo.ACTIONS_ID_TOKEN_REQUEST_URL
  const token = miljo.ACTIONS_ID_TOKEN_REQUEST_TOKEN
  if (!url || !token) return null
  const svar = await hent(`${url}&audience=${OIDC_PUBLIKUM}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!svar.ok) throw new Error(`GitHub ga ikke noe OIDC-token (${svar.status}).`)
  const verdi = ((await svar.json()) as { value?: unknown }).value
  if (typeof verdi !== 'string' || !verdi) throw new Error('GitHub ga et tomt OIDC-token.')
  return verdi
}

/** Én gren fra svaret, kontrollert; noe annet enn det køen forventer, tas ikke med. */
function lesGren(v: unknown): Greninfo | null {
  if (typeof v !== 'object' || v === null) return null
  const g = v as Record<string, unknown>
  if (typeof g.id !== 'string' || !UUID.test(g.id) || typeof g.stoff !== 'string') return null
  if (!GRENSTATUSER.includes(g.status as never) || !['kuratering', 'de_novo', 'gjenoppretting'].includes(g.art as string)) return null
  if (typeof g.revisjon !== 'number' || typeof g.runde !== 'number' || typeof g.oppdatert_kl !== 'string') return null
  return {
    id: g.id,
    stoff: g.stoff,
    art: g.art as Greninfo['art'],
    status: g.status as Greninfo['status'],
    revisjon: g.revisjon,
    runde: g.runde,
    oppdatert_kl: g.oppdatert_kl,
    publisert_kl: typeof g.publisert_kl === 'string' ? g.publisert_kl : null,
    // Bare nøkler; noe annet enn en liste med tekster gir ingen utsatte punkter.
    utsatte: Array.isArray(g.utsatte) ? g.utsatte.filter((n): n is string => typeof n === 'string' && n.trim() !== '') : [],
    // Bare gyldige navn på jobbgrener; resten av teksten i evidensjournalen tas aldri med.
    ...(Array.isArray(g.kuratorjobber) ? { kuratorjobber: [...new Set(g.kuratorjobber.map(jobbgrenI).filter((n): n is string => n !== null))] } : {}),
  }
}

/** Koblingene til jobbgrenene, når de er en liste med gyldige grennavn og ingenting annet; ellers `null`. */
function bareJobbgrener(v: unknown): string[] | null {
  return Array.isArray(v) && v.every((n) => jobbgrenI(n) === n) ? (v as string[]) : null
}

export interface Grenlesing {
  /**
   * Krev hele datasettet, slik oppryddingen av jobbgrenene gjør før den
   * sletter noe: ingen tom liste, ingen oppføring med ukjent form, og
   * koblingene til jobbgrenene (`kuratorjobber`) på hver gren. Uten dette
   * hoppes en ukjent oppføring over, som køen alltid har gjort.
   */
  komplett?: boolean
}

/**
 * Leseren køen og oppryddingen får: `null` når adressen eller tokenet mangler
 * (lokalt, eller uten tilgangen i arbeidsflyten). Et svar som ikke er i orden,
 * er en feil, så ingen tror at grenene er borte.
 */
export function lagGrenleser(miljo: Miljo, hent: Hent = fetch, { komplett = false }: Grenlesing = {}): (() => Promise<Greninfo[]>) | null {
  const adresse = miljo.OUSFAR_KO_ADRESSE?.trim()
  if (!adresse || !miljo.ACTIONS_ID_TOKEN_REQUEST_URL) return null
  return async () => {
    const token = await oidcToken(miljo, hent)
    if (!token) throw new Error('Mangler OIDC-tokenet.')
    const svar = await hent(adresse, { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (!svar.ok) throw new Error(`${adresse} svarte ${svar.status}.`)
    const data = (await svar.json()) as { grener?: unknown }
    if (!Array.isArray(data.grener)) throw new Error(`${adresse} ga ingen liste over grenene.`)
    const grener = data.grener.map(lesGren)
    if (komplett) {
      if (grener.length === 0) throw new Error(`${adresse} ga ingen kurateringsgrener.`)
      const ukjente = grener.filter((g) => g === null).length
      if (ukjente > 0) throw new Error(`${ukjente} av ${grener.length} kurateringsgrener fra ${adresse} har ukjent form.`)
      const utenKoblinger = data.grener.filter((g) => bareJobbgrener((g as { kuratorjobber?: unknown }).kuratorjobber) === null).length
      if (utenKoblinger > 0) {
        throw new Error(`${utenKoblinger} av ${grener.length} kurateringsgrener fra ${adresse} mangler gyldige koblinger til jobbgrenene (kuratorjobber); databasen har trolig ikke fått den nyeste migrasjonen.`)
      }
    }
    return grener.filter((g): g is Greninfo => g !== null)
  }
}
