/**
 * Kallene endringsforslagene gjør mot Supabase. Alt går gjennom funksjonene
 * i databasen, som kontrollerer tilgangen selv og sier avslagene sine på
 * norsk (docs/redaktorer-og-forslag.md, «Grensesnittene»). Tabellene nås ikke
 * fra nettleseren.
 */
import { lesbarFeil, UVENTET_FEIL } from '../auth/databasefeil'
import { klient } from '../auth/klient'
import { kilderTilLagring, lesForslag, lesForslagsrader, utdragTilLagring, type Forslag, type Forslagsmal, type Forslagsrad, type Kildeutkast } from './modell'

export async function kall(navn: string, argumenter: Record<string, unknown> = {}): Promise<unknown> {
  const { data, error } = await klient().rpc(navn, argumenter)
  if (error) throw lesbarFeil(error)
  return data
}

export interface Nyttforslag {
  mal: Forslagsmal
  /** Fagsidens versjon da skjemaet ble åpnet, eller `null` (da lagres den nyeste). */
  sideversjon?: number | null
  forslag: string
  begrunnelse: string
  kilder: readonly Kildeutkast[]
}

/** Sender forslaget. Gir ID-en. */
export async function sendForslag({ mal, sideversjon = null, forslag, begrunnelse, kilder }: Nyttforslag): Promise<string> {
  const id = await kall('foresla_endring', {
    ressurs: mal.ressurs,
    element: mal.element,
    grunnrevisjon: mal.grunnrevisjon,
    sideversjon,
    sted: mal.sted.trim().slice(0, 200) || null,
    utdrag: utdragTilLagring(mal.utdrag),
    forslag,
    begrunnelse,
    kilder: kilderTilLagring(kilder),
  })
  if (typeof id !== 'string') throw new Error(UVENTET_FEIL)
  return id
}

/**
 * Den nyeste versjonen av fagsiden (`les_sideversjoner`, nyeste først), eller
 * `null` når den ikke finnes. Leses når skjemaet åpnes, så forslaget viser
 * til siden slik den var da, ikke slik den er når det sendes.
 */
export async function hentSideversjon(stoff: string): Promise<number | null> {
  const versjoner = await kall('les_sideversjoner', { stoff })
  const nr = Array.isArray(versjoner) ? (versjoner[0] as { nr?: unknown } | undefined)?.nr : undefined
  return typeof nr === 'number' && Number.isInteger(nr) && nr >= 1 ? nr : null
}

export async function hentMineForslag(): Promise<Forslagsrad[]> {
  return lesForslagsrader(await kall('les_mine_forslag'))
}

export async function hentForslag(forslag: string): Promise<Forslag> {
  const svar = lesForslag(await kall('les_forslag', { forslag }))
  if (!svar) throw new Error(UVENTET_FEIL)
  return svar
}

export async function trekkForslag(forslag: string, begrunnelse: string | null): Promise<void> {
  await kall('trekk_forslag', { forslag, begrunnelse: begrunnelse?.trim() || null })
}

export async function svarPaForslag(forslag: string, tekst: string): Promise<void> {
  await kall('svar_pa_forslag', { forslag, tekst })
}
