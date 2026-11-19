import { direktemeldingene } from '../../direktemeldinger/useDirekte'
import { Chatvalg } from './Chatvalg'

/**
 * Innstillingene for chatten, ett sted: bak ⚙ nederst til høyre i
 * chatmenyen og i fanen Chat under Konto → Innstillinger (samme komponent,
 * samme kontoinnstillinger). I dag valgene for direktemeldingene
 * (`Chatvalg`: «Tillat direktemeldinger», «Vis når jeg er aktiv» og
 * «Blokkerte»); nye chatinnstillinger legges til her, så begge stedene får
 * dem.
 *
 * Henter det den viser selv: direktemeldingene publiseres av chatmenyen
 * (`direktemeldingene`).
 */
export function Chatinnstillinger() {
  const direkte = direktemeldingene.bruk()
  if (!direkte) return null
  return <Chatvalg valg={direkte.valg} onEndre={direkte.settValg} onBlokkeringEndret={direkte.oppdater} />
}

/** Om det finnes chatinnstillinger for den innloggede: ⚙ i chatmenyen og fanen Chat vises bare da. */
export function useHarChatinnstillinger(): boolean {
  return direktemeldingene.bruk() !== null
}
