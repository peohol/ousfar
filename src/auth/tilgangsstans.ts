/**
 * Når medlemskapet avsluttes mens fanen står åpen (P3, docs/fagmiljoer.md,
 * «Medlemskap og kontosperring»), svarer databasen og Edge-funksjonene på
 * neste forespørsel med at kontoen ikke lenger har et aktivt medlemskap.
 * Klienten henter gjennom `sporetFetch`, som viser hvert svar hit; økten
 * (`okt.tsx`) lytter og stenger appen forståelig i stedet for å vise tomme
 * sider og feil.
 *
 * Bare avslag (401 og 403) leses, og bare en kopi av svaret, så den som
 * hentet, får det uendret. Et brudd i nettet sier ingenting om tilgangen og
 * gir ikke noe signal.
 */
import { AVSLUTTET_MEDLEMSKAP } from '@delt/profil'

const lyttere = new Set<() => void>()

/** Kaller `lytter` når et svar sier at medlemskapet er avsluttet. Gir en funksjon som melder den av igjen. */
export function vedAvsluttetTilgang(lytter: () => void): () => void {
  lyttere.add(lytter)
  return () => {
    lyttere.delete(lytter)
  }
}

/** Ser etter avslaget i svaret, uten å røre det. */
export function lesTilgangFra(svar: Response): void {
  if ((svar.status !== 401 && svar.status !== 403) || typeof svar.clone !== 'function') return
  svar
    .clone()
    .text()
    .then(
      (tekst) => {
        if (tekst.includes(AVSLUTTET_MEDLEMSKAP)) for (const lytter of [...lyttere]) lytter()
      },
      () => undefined,
    )
}
