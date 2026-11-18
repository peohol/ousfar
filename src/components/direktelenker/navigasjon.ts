import { adresseForSide, diskusjonssideFor } from '../../diskusjoner/modell'
import { hentLenkemaal } from '../../direktelenker/api'
import type { Lenkemal } from '../../direktelenker/mal'
import { lesRute } from '../../domain/rute'
import { erstattAdressen } from '../../hooks/useRute'
import { lagSignal } from '../../domain/signal'
import { visDiskusjon } from '../diskusjoner/diskusjonsvisning'
import { forlatSkjemaene, visGruppeide } from '../grupper/gruppevisning'
import { visIde } from '../ideer/idevisning'

const feil = lagSignal<string>()

/** Hører etter lenker som ikke kunne åpnes (`Lenkemelding`). Gir tilbake funksjonen som slutter å høre etter. */
export const lyttEtterLenkefeil = feil.lytt

/**
 * Går dit en direktelenke peker: til siden tråden står på, med tråden åpen i
 * diskusjonsmenyen, til idéen i Idéer, eller til en gruppeidé på gruppesiden —
 * og til kommentaren, når lenken peker på en. Hvor tråden står, slås opp på
 * nytt, så lenken følger den når den er flyttet. Gir `false`, og sier fra,
 * når det lenken peker på, ikke finnes eller ikke kunne slås opp.
 *
 * Med `erstatt` skrives adressefeltet om uten å legge noe nytt i historikken:
 * lenken ble limt inn der, og tilbakeknappen skal gå dit man var før den.
 */
export async function apneDirektelenke(mal: Lenkemal, { erstatt = false }: { erstatt?: boolean } = {}): Promise<boolean> {
  let maal
  try {
    maal = await hentLenkemaal(mal, { fersk: true })
  } catch {
    feil.send('Fikk ikke åpnet lenken. Prøv igjen.')
    return false
  }
  if (!maal) {
    feil.send('Lenken peker på noe som ikke finnes lenger.')
    return false
  }
  if (maal.slag === 'ide') {
    if (maal.gruppe) visGruppeide(maal.gruppe.id, mal.id, mal.kommentar, { erstatt })
    else visIde({ id: mal.id, kommentar: mal.kommentar })
    return true
  }
  // Tråden står bak idélagene, som lukkes først, og et skjema på gruppesiden spør først.
  const { side } = maal
  forlatSkjemaene(() => {
    visDiskusjon(side, mal.id, mal.kommentar)
    if (diskusjonssideFor(lesRute(window.location.hash)) !== side) {
      const adresse = adresseForSide(side)
      if (erstatt) erstattAdressen(adresse)
      else window.location.hash = adresse
    }
  })
  return true
}

/** En direktelenke limt inn i adressefeltet: åpnes, og står ikke igjen i historikken. */
export function apneFraAdressen(mal: Lenkemal): void {
  void apneDirektelenke(mal, { erstatt: true })
}
