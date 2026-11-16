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
  forslag: string
  begrunnelse: string
  kilder: readonly Kildeutkast[]
}

/** Sender forslaget. Gir ID-en. */
export async function sendForslag({ mal, forslag, begrunnelse, kilder }: Nyttforslag): Promise<string> {
  const id = await kall('foresla_endring', {
    ressurs: mal.ressurs,
    element: mal.element,
    grunnrevisjon: mal.grunnrevisjon,
    sideversjon: null,
    sted: mal.sted.trim().slice(0, 200) || null,
    utdrag: utdragTilLagring(mal.utdrag),
    forslag,
    begrunnelse,
    kilder: kilderTilLagring(kilder),
  })
  if (typeof id !== 'string') throw new Error(UVENTET_FEIL)
  return id
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
