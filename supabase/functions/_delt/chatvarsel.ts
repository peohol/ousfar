/**
 * Varslene på enheten om nye chatmeldinger (docs/chatvarsler.md): adressen til
 * en samtale, hva varselet sier, og hvilke push-tjenester det kan sendes til.
 *
 * Leses av Edge-funksjonen `chatvarsel`, som lager varslene, og av appen, som
 * har de samme adressene i `src/domain/rute.ts`. Tjenestearbeideren
 * (`public/chatvarsler.js`) viser bare det som står i varselet.
 *
 * Varselet sier aldri hva som er skrevet eller hvem som skrev det
 * (docs/gruppechat-personvern.md, docs/direktemeldinger-personvern.md): bare
 * gruppens navn eller «Direktemelding», og hvor mange uleste det er.
 */

/** Slagene samtaler i chatten, slik de står i adressen: gruppechatter og direktesamtaler (D5). */
export const SAMTALETYPER = ['gruppe', 'direkte'] as const
export type Samtaletype = (typeof SAMTALETYPER)[number]

/** Én samtale i chatten: slaget og ID-en (for en gruppechat gruppens, for en direktesamtale samtalens). */
export interface Samtalenokkel {
  type: Samtaletype
  id: string
}

/** Adressen til helsiden for chatten. */
export const CHATADRESSE = '#/chat'

/** Adressen til helsiden for chatten, med samtalen som er valgt. */
export function chatadresse(samtale?: Samtalenokkel | null): string {
  return samtale ? `${CHATADRESSE}/${samtale.type}/${samtale.id}` : CHATADRESSE
}

/** Det databasen gir for hvert varsel som skal sendes (`chatvarsel_hent`), uten abonnementet. */
export interface Chatvarselgrunnlag {
  slag: Samtaletype
  samtale: string
  /** Gruppens navn; bare for gruppechatter. */
  gruppenavn: string | null
  /** Uleste meldinger fra andre i samtalen nå, minst 1. */
  uleste: number
}

/** Innholdet i varselet, slik tjenestearbeideren viser det. */
export interface Chatvarselinnhold {
  tittel: string
  tekst: string
  /** Adressen i appen et trykk på varselet åpner. */
  sti: string
  /** Et nyere varsel om den samme samtalen erstatter det forrige. */
  merke: string
}

const flertall = (n: number, en: string, flere: string) => (n === 1 ? en : `${n} ${flere}`)

/** Varselet om en samtale, uten tekst og uten avsender. */
export function chatvarselinnhold(v: Chatvarselgrunnlag): Chatvarselinnhold {
  const uleste = Math.max(1, Math.floor(v.uleste))
  const gruppe = v.slag === 'gruppe'
  return {
    tittel: gruppe ? (v.gruppenavn?.trim() || 'Gruppechat') : 'Direktemelding',
    tekst: gruppe
      ? flertall(uleste, 'Ny melding i gruppechatten', 'uleste meldinger i gruppechatten')
      : flertall(uleste, 'Du har fått en ny direktemelding', 'uleste direktemeldinger'),
    sti: chatadresse({ type: v.slag, id: v.samtale }),
    merke: `chat:${v.slag}:${v.samtale}`,
  }
}

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
 * Emnet push-tjenesten slår sammen ventende varsler på (`Topic`): ett per
 * samtale, så en enhet som har vært av, får bare det siste. Høyst 32 tegn fra
 * base64url-alfabetet; en UUID uten bindestreker er det.
 */
export function chatvarselemne(samtale: string): string {
  return samtale.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32)
}
