/**
 * Varsler på enheten (docs/enhetsvarsler.md): det som er felles for alle
 * formålene, chatten og de planlagte varslene (#600). Leses av
 * Edge-funksjonene og av appen.
 *
 * Tjenestearbeideren (`public/chatvarsler.js`) viser bare det som står i
 * varselet, og åpner bare adresser i appen med formen {@link VARSELSTI}.
 */

/** Innholdet i et varsel, slik tjenestearbeideren viser det. */
export interface Enhetsvarselinnhold {
  tittel: string
  tekst: string
  /** Adressen i appen et trykk på varselet åpner. */
  sti: string
  /** Et nyere varsel med samme merke erstatter det forrige på enheten. */
  merke: string
}

/**
 * Adressene et varsel kan åpne: en adresse i appen, høyst {@link MAKS_STI}
 * tegn. Den samme formen står i databasen (`intern.enhetsvarsler_sti()`) og i
 * tjenestearbeideren; hvert formål har i tillegg sitt eget mønster
 * (`sti_monster`).
 */
export const VARSELSTI = /^#\/[A-Za-z0-9_./-]*$/
export const MAKS_STI = 300

/** Om `sti` er en adresse et varsel kan åpne. */
export const erVarselsti = (sti: string): boolean => sti.length <= MAKS_STI && VARSELSTI.test(sti)

/** Merket på et varsel. */
export const VARSELMERKE = /^[A-Za-z0-9:_.-]{1,120}$/

/**
 * Push-tjenestene nettleserne bruker. Et abonnement med et annet endepunkt
 * får ingen varsler, så funksjonen aldri sender noe til en adresse en bruker
 * har funnet på.
 */
export const PUSHTJENESTER = [
  'fcm.googleapis.com',
  'android.googleapis.com',
  'push.services.mozilla.com',
  'push.apple.com',
  'notify.windows.com',
] as const

/** Om endepunktet er en HTTPS-adresse hos en av push-tjenestene. */
export function erPushtjeneste(endepunkt: string): boolean {
  let url: URL
  try {
    url = new URL(endepunkt)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || url.port !== '' || url.username !== '' || url.password !== '') return false
  const vert = url.hostname.toLowerCase()
  return PUSHTJENESTER.some((t) => vert === t || vert.endsWith(`.${t}`))
}

/**
 * Emnet push-tjenesten slår sammen ventende varsler på (`Topic`), så en enhet
 * som har vært av, får bare det siste. Høyst 32 tegn fra base64url-alfabetet;
 * en UUID uten bindestreker er det.
 */
export function pushemne(id: string): string {
  return id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32)
}
