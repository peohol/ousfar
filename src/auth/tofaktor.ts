/**
 * Tofaktor med en autentiseringsapp (TOTP), slik Supabase Auth har den: en
 * person melder inn appen sin under Konto, og etter det spør innloggingen om
 * koden appen viser, før noe av appen vises (`docs/s4-pilotplan.md` §3.1,
 * tiltak 7).
 *
 * Inntil kravet er slått på (D5a) er tofaktor frivillig for alle. Koden løfter
 * økten fra `aal1` til `aal2`; databasen krever ingenting av det ennå.
 */
import type { Factor } from '@supabase/supabase-js'
import { klient } from './klient'

/** Hvor mange apper en person kan ha meldt inn samtidig: den gamle og den nye telefonen. */
export const FAKTORER_MEST = 2

/** Antall sifre i koden appen viser. */
export const KODELENGDE = 6

/** En innmeldt autentiseringsapp. */
export interface Faktor {
  id: string
  navn: string
  /** Når den ble meldt inn. */
  laget: string
}

/** En innmelding som venter på den første koden fra appen. */
export interface Innmelding {
  id: string
  /** QR-koden som bilde-adresse (`data:`), til å skanne med appen. */
  qr: string
  /** Hemmeligheten bak QR-koden, til å skrive inn for hånd. */
  hemmelighet: string
}

const UVENTET = 'Noe gikk galt. Prøv igjen.'
const FEIL_KODE = 'Koden stemmer ikke. Skriv inn koden appen viser nå.'

/** Koden slik den skal sendes, uten mellomrom, eller hvorfor den ikke kan sendes. */
export function lesKode(kode: string): { kode: string } | { feil: string } {
  const ren = kode.replace(/\s/g, '')
  return new RegExp(`^\\d{${KODELENGDE}}$`).test(ren) ? { kode: ren } : { feil: `Koden har ${KODELENGDE} sifre.` }
}

/** Om økten mangler koden: kontoen har en app, men økten er bare logget inn med passordet. */
export async function trengerKode(): Promise<boolean> {
  const { data, error } = await klient().auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) throw error
  return data.currentLevel === 'aal1' && data.nextLevel === 'aal2'
}

const somFaktor = (f: Factor): Faktor => ({ id: f.id, navn: f.friendly_name ?? 'Autentiseringsapp', laget: f.created_at })

async function alleTotp(): Promise<Factor[]> {
  const { data, error } = await klient().auth.mfa.listFactors()
  if (error) throw new Error(UVENTET)
  return data.all.filter((f) => f.factor_type === 'totp')
}

/** Appene den innloggede har meldt inn og bekreftet, eldst først. */
export async function hentFaktorer(): Promise<Faktor[]> {
  return (await alleTotp())
    .filter((f) => f.status === 'verified')
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map(somFaktor)
}

/**
 * Fjerner innmeldinger som aldri ble bekreftet, for eksempel fordi vinduet
 * ble lukket midt i. De teller ellers mot grensen og stenger navnet.
 */
async function ryddUbekreftede(): Promise<void> {
  for (const f of (await alleTotp()).filter((f) => f.status !== 'verified')) {
    await klient().auth.mfa.unenroll({ factorId: f.id })
  }
}

/** Begynner innmeldingen av en ny app med navnet `navn`. */
export async function meldInn(navn: string): Promise<Innmelding> {
  const rent = navn.trim()
  if (rent === '') throw new Error('Gi appen et navn, for eksempel «Telefonen min».')
  await ryddUbekreftede()
  const finnes = await hentFaktorer()
  if (finnes.length >= FAKTORER_MEST) throw new Error(`Du kan ha ${FAKTORER_MEST} apper. Fjern en før du legger til en ny.`)
  if (finnes.some((f) => f.navn.toLowerCase() === rent.toLowerCase())) throw new Error('Du har alt en app med det navnet.')
  const { data, error } = await klient().auth.mfa.enroll({ factorType: 'totp', friendlyName: rent, issuer: 'OUSFAR' })
  if (error) throw new Error(UVENTET)
  const qr = data.totp.qr_code
  return { id: data.id, qr: qr.startsWith('data:') ? qr : `data:image/svg+xml;utf-8,${qr}`, hemmelighet: data.totp.secret }
}

/** Avbryter en innmelding som ikke er bekreftet. */
export async function avbrytInnmelding(id: string): Promise<void> {
  await klient().auth.mfa.unenroll({ factorId: id })
}

async function bekreftMed(id: string, kode: string): Promise<boolean> {
  const { error } = await klient().auth.mfa.challengeAndVerify({ factorId: id, code: kode })
  return !error
}

/** Bekrefter innmeldingen med den første koden appen viser. Gir en feilmelding, eller `null`. */
export async function bekreftInnmelding(id: string, kode: string): Promise<string | null> {
  const lest = lesKode(kode)
  if ('feil' in lest) return lest.feil
  return (await bekreftMed(id, lest.kode)) ? null : FEIL_KODE
}

/**
 * Det andre steget i innloggingen: koden fra en av appene kontoen har. Med to
 * apper prøves begge, så personen ikke må si hvilken telefon koden kom fra.
 * Gir en feilmelding, eller `null` når økten er løftet til `aal2`.
 */
export async function loggInnMedKode(kode: string): Promise<string | null> {
  const lest = lesKode(kode)
  if ('feil' in lest) return lest.feil
  const faktorer = await hentFaktorer()
  for (const f of faktorer) if (await bekreftMed(f.id, lest.kode)) return null
  return FEIL_KODE
}

/**
 * Fjerner en av den innloggedes egne apper. Supabase krever da at økten er
 * logget inn med koden (`aal2`); bare personen selv kan fjerne sin egen
 * (tiltak 7, «Tapt telefon før D5b»).
 */
export async function fjernFaktor(id: string): Promise<void> {
  const { error } = await klient().auth.mfa.unenroll({ factorId: id })
  if (error) throw new Error('Appen ble ikke fjernet. Logg ut og inn igjen med koden, og prøv på nytt.')
}
