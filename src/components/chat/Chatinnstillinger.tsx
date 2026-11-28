import { direktemeldingene } from '../../direktemeldinger/useDirekte'
import { apneVarsler } from '../../varsler/bjella'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { useChatstatus } from './chatstyring'
import { Chatvalg } from './Chatvalg'

/**
 * Innstillingene for chatten, ett sted: bak ⚙ nederst til høyre i
 * chatmenyen og i fanen Chat under Konto → Innstillinger (samme komponent,
 * samme kontoinnstillinger). Øverst veien til varslene på denne enheten, som
 * står i varselinnstillingene sammen med varslene for de andre formålene
 * (`Enhetsvarsler`, docs/enhetsvarsler.md), så valgene for direktemeldingene
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
      <Chatvarselvei />
      {direkte && <Chatvalg valg={direkte.valg} onEndre={direkte.settValg} onBlokkeringEndret={direkte.oppdater} />}
    </>
  )
}

/** «Varsler på denne enheten»: knappen åpner varselinnstillingene, der bryteren står. */
function Chatvarselvei() {
  return (
    <section className="chatvalg chatvarselvei" aria-label="Varsler">
      <ul className="chatvalg__liste">
        <li className="chatvalg__rad">
          <span className="chatvalg__tekst">
            <span className="chatvalg__navn">Varsler på denne enheten</span>
            <span className="chatvalg__forklaring">Slå på og velg hva du vil ha varsel om, i varselinnstillingene.</span>
          </span>
          <Button variant="kant" className="knapp--kompakt" icon={<Ikon navn="bell" />} onClick={() => apneVarsler('innstillinger')}>
            Varselinnstillinger
          </Button>
        </li>
      </ul>
    </section>
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
