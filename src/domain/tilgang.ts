/**
 * Hva brukeren får se: innloggingssiden, førstegangsoppsettet eller appen.
 *
 * Regelen står her alene, uten noe rundt seg, slik at den kan kontrolleres
 * for seg selv. Den er en portvakt i grensesnittet, ikke en sikkerhetsgrense:
 * det er radsikkerheten og Edge-funksjonene som avgjør hva som faktisk kan
 * leses og skrives. En bruker som skrur av dette i nettleseren, kommer ikke
 * lenger enn til et tomt skall.
 */
import type { Profil } from '@delt/profil'

export type Tilgang =
  /** Økten er ikke avklart ennå. Ingenting skal vises. */
  | 'venter'
  | 'innlogging'
  | 'oppsett'
  | 'app'
  /** Innlogget, men profilen lot seg ikke hente. */
  | 'feil'
  /**
   * Innlogget med et gyldig token, men uten aktivt medlemskap i noe
   * fagmiljø (P2.0). Databasen gir da ingenting; brukeren får en beskjed.
   */
  | 'avsluttet'

export interface Oktstatus {
  /** Sant når økten og profilen er ferdig hentet. */
  klar: boolean
  harOkt: boolean
  profil: Profil | null
  /** Sant når oppslaget mot profilen feilet — nett eller tjeneste nede. */
  profilfeil: boolean
  /** Sant når databasen har svart at kontoen ikke har et aktivt medlemskap. */
  avsluttet?: boolean
}

/**
 * Sant så lenge kontoen står i førstegangsoppsett.
 *
 * Begge feltene teller. `must_change_password` settes også når en
 * administrator gir brukeren et nytt midlertidig passord, og da skal veien
 * gå gjennom oppsettet på nytt.
 */
export function maaGjennomOppsett(profil: Profil): boolean {
  return profil.must_change_password || !profil.onboarding_completed
}

export function tilgangFor(status: Oktstatus): Tilgang {
  if (!status.klar) return 'venter'
  if (!status.harOkt) return 'innlogging'
  // Gikk oppslaget galt, skal brukeren få vite det og kunne prøve igjen. Uten
  // dette skillet ville en kortvarig nettfeil sett ut som evig lasting.
  if (status.profilfeil) return 'feil'
  if (status.avsluttet) return 'avsluttet'
  // Økt uten profil ennå: raden hentes fortsatt. Appen skal ikke blinke fram
  // i mellomtiden.
  if (!status.profil) return 'venter'
  return maaGjennomOppsett(status.profil) ? 'oppsett' : 'app'
}
