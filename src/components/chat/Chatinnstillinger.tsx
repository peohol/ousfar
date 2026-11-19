import { direktemeldingene } from '../../direktemeldinger/useDirekte'
import { useChatstatus } from './chatstyring'
import { Chatvalg } from './Chatvalg'
import { Chatvarslervalg } from './Chatvarslervalg'

/**
 * Innstillingene for chatten, ett sted: bak ⚙ nederst til høyre i
 * chatmenyen og i fanen Chat under Konto → Innstillinger (samme komponent,
 * samme kontoinnstillinger). Øverst varslene på denne enheten
 * (`Chatvarslervalg`, docs/chatvarsler.md), så valgene for direktemeldingene
 * (`Chatvalg`: «Tillat direktemeldinger», «Vis når jeg er aktiv» og
 * «Blokkerte»); nye chatinnstillinger legges til her, så begge stedene får
 * dem.
 *
 * Henter det den viser selv: direktemeldingene publiseres av chatmenyen
 * (`direktemeldingene`). Varslene gjelder både gruppechatten og
 * direktemeldingene, og står derfor også når bare gruppechatten er slått på.
 */
export function Chatinnstillinger() {
  const direkte = direktemeldingene.bruk()
  if (!useHarChatinnstillinger()) return null
  return (
    <>
      <Chatvarslervalg />
      {direkte && <Chatvalg valg={direkte.valg} onEndre={direkte.settValg} onBlokkeringEndret={direkte.oppdater} />}
    </>
  )
}

/**
 * Om det finnes chatinnstillinger for den innloggede: ⚙ i chatmenyen og fanen
 * Chat vises bare da. Det gjør det når gruppechatten (chatmenyen står) eller
 * direktemeldingene er slått på.
 */
export function useHarChatinnstillinger(): boolean {
  const gruppechat = useChatstatus().finnes
  return direktemeldingene.bruk() !== null || gruppechat
}
