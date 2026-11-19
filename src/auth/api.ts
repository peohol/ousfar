/**
 * Alt appen sier til Supabase om brukere og profiler.
 *
 * Den egne profilen hentes hel (`min_profil`). Andre brukere leses som
 * profilkort rett fra profiltabellen, der radsikkerheten bare gir dem den
 * innloggede samhandler med (docs/fagmiljoer.md, «Profiler og
 * profilbilder»). Medlemslista i administrasjonen har sin egen funksjon.
 * Medlemskapene endres med databasefunksjoner som kontrollerer myndigheten
 * selv (docs/fagmiljoer.md, «Medlemskap og kontosperring»); passord og den
 * gamle adminrollen går gjennom Edge-funksjonene.
 */
import {
  erGyldigBrukernavn,
  internAuthAdresse,
  normaliserBrukernavn,
} from '@delt/brukernavn'
import { AVATAR_BOTTE, avatarSti, PROFILKORT, type Profil, type Profilkort, type Rolle } from '@delt/profil'
import { klient } from './klient'

/**
 * Den ene meldingen som gis ved mislykket innlogging.
 *
 * Den sier med vilje ikke om det var brukernavnet eller passordet som var
 * feil, slik at siden ikke kan brukes til å finne ut hvem som har konto.
 */
export const INNLOGGING_FEILET = 'Feil brukernavn eller passord.'

const UVENTET_FEIL = 'Noe gikk galt. Prøv igjen.'

/** Svaret en Edge-funksjon gir når noe blir avvist. */
async function feilmeldingFra(feil: unknown): Promise<string> {
  const svar = (feil as { context?: Response } | null)?.context
  if (svar && typeof svar.json === 'function') {
    try {
      const kropp: unknown = await svar.json()
      const melding = (kropp as { feil?: unknown } | null)?.feil
      if (typeof melding === 'string' && melding !== '') return melding
    } catch {
      // Svaret var ikke JSON. Da står den generelle meldingen igjen.
    }
  }
  return UVENTET_FEIL
}

/** Kaller en Edge-funksjon og gjør et avslag om til en lesbar feil. */
async function kall<T>(navn: string, kropp: Record<string, unknown>): Promise<T> {
  const { data, error } = await klient().functions.invoke<T>(navn, { body: kropp })
  if (error) throw new Error(await feilmeldingFra(error))
  if (data === null) throw new Error(UVENTET_FEIL)
  return data
}

/**
 * Logger inn med brukernavn og passord.
 *
 * Den interne Auth-adressen utledes her, av brukernavnet alene. Brukeren ser
 * aldri noe annet enn brukernavnet sitt.
 */
export async function loggInn(brukernavn: string, passord: string): Promise<string | null> {
  const normalisert = normaliserBrukernavn(brukernavn)
  // Et brukernavn som ikke kan være gyldig, finnes heller ikke. Vi svarer
  // som om passordet var feil, i stedet for å røpe formkravene.
  if (!erGyldigBrukernavn(normalisert) || passord === '') return INNLOGGING_FEILET

  const { error } = await klient().auth.signInWithPassword({
    email: internAuthAdresse(normalisert),
    password: passord,
  })
  return error ? INNLOGGING_FEILET : null
}

export async function loggUt(): Promise<void> {
  await klient().auth.signOut()
}

/**
 * Den innloggedes egen profil, hel, eller `null` når den ikke er synlig:
 * kontoen er uten aktivt medlemskap eller slettet (`hentMedlemskapsstatus`).
 */
export async function hentProfil(): Promise<Profil | null> {
  const { data, error } = await klient().rpc('min_profil').maybeSingle()
  if (error) throw error
  return (data as Profil | null) ?? null
}

/** Den innloggedes egen kontostatus, sett fra databasen (P2.0). */
export type Medlemskapsstatus = 'aktiv' | 'avsluttet' | 'ingen_konto'

/**
 * Hvorfor profilen ikke kom: kontoen er uten aktivt medlemskap (`avsluttet`;
 * databasen gir da ingenting annet), eller den er slettet (`ingen_konto`).
 */
export async function hentMedlemskapsstatus(): Promise<Medlemskapsstatus> {
  const { data, error } = await klient().rpc('min_medlemskapsstatus')
  if (error) throw error
  if (data !== 'aktiv' && data !== 'avsluttet' && data !== 'ingen_konto') throw new Error(`Ukjent medlemskapsstatus: ${String(data)}`)
  return data
}

/** Profilkortene den innloggede får se: navn og bilde til dem hen samhandler med. */
export async function hentProfilkort(): Promise<Profilkort[]> {
  const { data, error } = await klient().from('profiles').select(PROFILKORT.join(','))
  if (error) throw error
  return (data ?? []) as unknown as Profilkort[]
}

/**
 * De ordinære profilopplysningene brukeren selv rår over. Endringen og svaret
 * er én forespørsel: profilkortet som ble lagret, lagt over den egne profilen
 * (rollen og kontostatusen kan ikke endres herfra).
 */
export async function lagreEgenProfil(
  profil: Profil,
  endring: { first_name: string; last_name: string; avatar_path?: string | null },
): Promise<Profil> {
  const { data, error } = await klient()
    .from('profiles')
    .update(endring)
    .eq('id', profil.id)
    .select(PROFILKORT.join(','))
    .single()
  if (error) throw error
  return { ...profil, ...(data as unknown as Profilkort) }
}

/** Bytter passordet til den som allerede er logget inn. */
export async function byttPassord(nyttPassord: string): Promise<void> {
  const { error } = await klient().auth.updateUser({ password: nyttPassord })
  if (error) {
    throw new Error(
      error.message.toLowerCase().includes('password')
        ? 'Passordet ble ikke godtatt. Velg et annet.'
        : UVENTET_FEIL,
    )
  }
}

/** Laster opp profilbildet til brukerens egen mappe og gir stien tilbake. */
export async function lastOppAvatar(brukerId: string, bilde: Blob): Promise<string> {
  const sti = avatarSti(brukerId)
  const { error } = await klient()
    .storage.from(AVATAR_BOTTE)
    .upload(sti, bilde, { upsert: true, contentType: 'image/webp' })
  if (error) throw new Error('Bildet ble ikke lastet opp. Prøv igjen.')
  return sti
}

/**
 * Hvor lenge en signert bildelenke er gyldig, i sekunder. Lenkene fornyes før
 * det — se `useBildelenker`.
 */
export const BILDELENKE_LEVETID = 60 * 60

/**
 * Midlertidige lenker til bildene i en privat bøtte: profilbildene
 * (`AVATAR_BOTTE`) og gruppesymbolene.
 *
 * Bøttene er private, så bildene hentes med signerte lenker. Lenkene er
 * ferske hver gang, og et nytt bilde vises derfor med én gang — det gamle kan
 * ikke bli hengende igjen i nettleserens mellomlager.
 */
export async function signerteBildelenker(botte: string, stier: string[]): Promise<Map<string, string>> {
  const unike = [...new Set(stier)].filter((sti) => sti !== '')
  const lenker = new Map<string, string>()
  if (unike.length === 0) return lenker

  const { data, error } = await klient().storage.from(botte).createSignedUrls(unike, BILDELENKE_LEVETID)
  if (error) return lenker

  for (const oppf of data ?? []) {
    if (oppf.path && oppf.signedUrl) lenker.set(oppf.path, oppf.signedUrl)
  }
  return lenker
}

/** Svaret fra funksjonene som lager et midlertidig passord. */
export interface Midlertidig {
  brukernavn: string
  midlertidigPassord: string
  /** Fagmiljøet en ny bruker ble medlem av (bare når kontoen nettopp er opprettet). */
  fagmiljo?: { id: string; navn: string }
}

/**
 * Oppretter en ny bruker som medlem av `fagmiljo`. Krever myndighet til å
 * opprette brukere der (`useRettigheter().opprettBrukerI`) — kontrolleres
 * server-side.
 */
export function opprettBruker(brukernavn: string, fagmiljo: string): Promise<Midlertidig> {
  return kall<Midlertidig>('opprett-bruker', { brukernavn, fagmiljo })
}

/** Gir en bruker et nytt midlertidig passord. Krever myndighet over kontoen — kontrolleres server-side. */
export function nyttMidlertidigPassord(brukerId: string): Promise<Midlertidig> {
  return kall<Midlertidig>('nytt-passord', { brukerId })
}

/** Endrer rollen til en annen bruker. Krever systemarkitekt — kontrolleres server-side. */
export async function settRolle(brukerId: string, rolle: Rolle): Promise<Profil> {
  const svar = await kall<{ profil: Profil }>('sett-rolle', { brukerId, rolle })
  return svar.profil
}

/**
 * Fullfører førstegangsoppsettet: passord, navn og eventuelt profilbilde.
 *
 * Passordet settes server-side, og Supabase kaster da den gjeldende økten.
 * Uten en ny innlogging ville brukeren falt ut av appen i det
 * tilgangstokenet gikk ut — en time senere, midt i arbeidet. Derfor logges
 * det inn på nytt med det passordet brukeren nettopp valgte.
 */
export async function fullforOppsett(oppsett: {
  brukernavn: string
  passord: string
  fornavn: string
  etternavn: string
  avatarSti?: string | null
}): Promise<Profil> {
  const { brukernavn, ...kropp } = oppsett
  const svar = await kall<{ profil: Profil }>('fullfor-oppsett', { ...kropp })

  if (await loggInn(brukernavn, oppsett.passord)) {
    throw new Error('Passordet er byttet. Logg inn på nytt med det nye passordet.')
  }
  return svar.profil
}

/* --- Medlemskapene ---------------------------------------------------------- */

/** Avslagene databasen gir med en melding til den som prøvde. Alt annet er en uventet feil. */
const AVSLAG_MED_MELDING = new Set(['42501', 'P0002', '22023', '23505', '23514', '55000'])

/** Kaller en databasefunksjon og gjør et avslag om til en lesbar feil. */
async function rpc<T>(navn: string, argumenter: Record<string, unknown>): Promise<T> {
  const { data, error } = await klient().rpc(navn, argumenter)
  if (error) throw new Error(AVSLAG_MED_MELDING.has(error.code) && error.message ? error.message : UVENTET_FEIL)
  return data as T
}

/** Ett medlem i medlemslista, med handlingene databasen tillater den innloggede. */
export interface Medlem extends Profilkort {
  status: 'aktiv' | 'invitert' | 'avsluttet'
  fra: string
  til: string | null
  /** Lokal administrator i fagmiljøet. */
  administrator: boolean
  systemarkitekt: boolean
  /** Den gamle adminrollen (`profiles.role`). */
  rolle: Rolle
  maa_bytte_passord: boolean
  /** Står uten aktivt medlemskap noe sted, og er sperret i Auth. */
  sperret: boolean
  /** Det aktive medlemskapet her er kontoens eneste. */
  eneste_medlemskap: boolean
  kan_avslutte: boolean
  kan_gi_tilgang: boolean
  kan_gjore_til_administrator: boolean
  kan_fjerne_som_administrator: boolean
  nytt_passord: boolean
  endre_rolle: boolean
}

/** Svaret etter en endring av et medlemskap. */
export interface Medlemskapssvar {
  bruker: string
  fagmiljo: string
  status: 'aktiv' | 'invitert' | 'avsluttet' | 'ingen'
  administrator: boolean
  sperret: boolean
}

/**
 * Medlemmene i et fagmiljø den innloggede administrerer, de gjeldende først
 * og de tidligere etter. Bare for visningen; operasjonene kontrollerer på nytt.
 */
export async function hentMedlemsoversikt(fagmiljo: string): Promise<Medlem[]> {
  const rader = await rpc<(Omit<Medlem, 'id'> & { bruker_id: string })[] | null>('medlemsoversikt', { fagmiljo })
  return (rader ?? []).map(({ bruker_id, ...rad }) => ({ ...rad, id: bruker_id }))
}

/** Avslutter medlemskapet. Var det det siste, sperres kontoen og logges ut overalt. */
export function avsluttMedlemskap(bruker: string, fagmiljo: string): Promise<Medlemskapssvar> {
  return rpc('avslutt_medlemskap', { bruker, fagmiljo })
}

/** Gir en konto (igjen) aktivt medlemskap i fagmiljøet. */
export function giMedlemskap(bruker: string, fagmiljo: string): Promise<Medlemskapssvar> {
  return rpc('gi_medlemskap', { bruker, fagmiljo })
}

/** Gir en eksisterende konto, oppgitt med brukernavnet, medlemskap i fagmiljøet. */
export function leggTilMedlem(brukernavn: string, fagmiljo: string): Promise<Medlemskapssvar> {
  return rpc('legg_til_medlem', { brukernavn, fagmiljo })
}

/** Utpeker eller fjerner en lokal administrator. Bare systemarkitektene. */
export function settFagmiljoadministrator(bruker: string, fagmiljo: string, administrator: boolean): Promise<Medlemskapssvar> {
  return rpc('sett_fagmiljoadministrator', { bruker, fagmiljo, administrator })
}

/** Oppretter et nytt, lukket fagmiljø. Bare systemarkitektene. */
export function opprettFagmiljo(navn: string): Promise<{ id: string; nokkel: string; navn: string }> {
  return rpc('opprett_fagmiljo', { navn })
}
