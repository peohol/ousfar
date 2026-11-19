/**
 * Om det er lagt ut en nyere versjon av appen enn den som kjører.
 *
 * Hvert bygg får en identitet (`bygg`, commiten det er bygget fra) og legger
 * den sammen med versjonene sine i `versjon.json` ved siden av `index.html`
 * (se `vite.config.ts`). Appen som kjører, spør jevnlig etter den fila. Brukeren
 * bes om å oppdatere når versjonen de skal oppdatere til (`oppdatering`) er en
 * annen enn den som kjører — som regel en nyere, men det gjelder også når en
 * versjon er trukket tilbake. Et bygg som bare er en stille designjustering
 * eller en føring med `utenVarsel`, ber altså ingen oppdatere. Fila sier også
 * hvilke sider de nyeste føringene gjelder, så brukeren bare bes om å
 * oppdatere når siden hen er på, er berørt (`sider.ts`). Den ligger utenfor
 * innloggingsveggen og sier ikke noe annet enn dette.
 */
import { BYGG } from 'virtual:ousfar-bygg'
import { VERSJONSFIL, type Byggopplysninger } from './byggopplysninger'
import type { Endringsomrade } from './sider'

export { VERSJONSFIL, type Byggopplysninger } from './byggopplysninger'

/** Bygget som kjører, beregnet da det ble bygget (`versjonsfil()` i `vite.config.ts`). */
export const KJORER: Byggopplysninger = BYGG

function erEndringsomrader(data: unknown): data is Endringsomrade[] {
  return (
    Array.isArray(data) &&
    data.every((e: Partial<Record<keyof Endringsomrade, unknown>> | null) => {
      if (typeof e?.versjon !== 'string') return false
      return e.gjelder === undefined || (Array.isArray(e.gjelder) && e.gjelder.every((o) => typeof o === 'string'))
    })
  )
}

function erByggopplysninger(data: unknown): data is Byggopplysninger {
  const { bygg, versjon, oppdatering } = (data ?? {}) as Partial<Record<keyof Byggopplysninger, unknown>>
  return (
    typeof bygg === 'string' &&
    bygg !== '' &&
    typeof versjon === 'string' &&
    (oppdatering === undefined || typeof oppdatering === 'string')
  )
}

/** En bygd fil ved siden av `index.html`, og ingenting annet: appen henter den. */
const BYGD_FIL = /^assets\/[\w.-]+\.js$/

/**
 * Bygget som er lagt ut nå, eller `null` når det ikke lar seg finne ut — uten
 * nett, eller i utviklingsserveren, som ikke har fila. Svaret skal aldri komme
 * fra et mellomlager.
 */
export async function hentUtlagtBygg(hent: typeof fetch = fetch): Promise<Byggopplysninger | null> {
  try {
    const svar = await hent(new URL(VERSJONSFIL, document.baseURI), { cache: 'no-store' })
    if (!svar.ok) return null
    const data: unknown = await svar.json()
    if (!erByggopplysninger(data)) return null
    // Sidene føringene gjelder, er et tillegg: kan de ikke leses, kan en ny
    // versjon berøre alle sider, som før de fantes.
    const { endringer, klinisk, ...resten } = data
    return {
      ...resten,
      ...(endringer !== undefined && erEndringsomrader(endringer) && { endringer }),
      // Stien til den kliniske delen likeså: uten den lastes siden på nytt uten å sjekke først.
      ...(typeof klinisk === 'string' && BYGD_FIL.test(klinisk) && { klinisk }),
    }
  } catch {
    return null
  }
}

/**
 * Den utlagte versjonen, når brukeren skal bes om å oppdatere til den: når
 * den har en annen `oppdatering` enn den som kjører. Med `alleBygg` holder det
 * at bygget er et annet — det gjelder når en del av appen ikke lar seg laste,
 * for da er filene til bygget som kjører, borte, også etter en stille endring.
 */
export function nyVersjon(
  utlagt: Byggopplysninger | null,
  kjorer: Byggopplysninger = KJORER,
  { alleBygg = false }: { alleBygg?: boolean } = {},
): Byggopplysninger | null {
  if (!utlagt || utlagt.bygg === kjorer.bygg) return null
  return alleBygg || utlagt.oppdatering === undefined || utlagt.oppdatering !== kjorer.oppdatering ? utlagt : null
}
