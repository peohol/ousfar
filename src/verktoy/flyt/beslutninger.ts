/**
 * Beslutningene i §10 i `docs/verktøy-brukervennlighet-2026-11.md` som
 * avgjør hvordan flyten oppfyller bekreftelser og stoppforhold. ChatGPT
 * avgjorde alle 04.11.2026, med avgrensningene under. B1, B2 og B5 virker
 * bare gjennom katalogen, altså bare for en regelversjon med kontrollert
 * katalogavtrykk (S5b); ellers gjelder reservevisningen (S5).
 *
 * - `B1`: bekreftelser som er rent informative **forbehold**, vises i planen og kopien i stedet for å krysses av. En reell klinisk vurdering eller sikkerhetskritisk bekreftelse spørres fortsatt om.
 * - `B2`: bekreftelser som er **avledet** av et eksakt, eksplisitt valg (preparat, enhetsmengde, formulering) står i planen som forutsatt, med testet avbildning. Fravær av kontraindikasjoner, vurdert toleranse og annet som ikke følger logisk av valget, avledes aldri.
 * - `B4`: når bare én legemiddelform dokumentert i FEST kan gi en komplett plan innenfor godkjent omfang, velger verktøyet den selv og sier det. Blanding av former er ikke omfattet.
 * - `B5`: sjeldne stoppforhold kan besvares med «Ingen av disse» som et aktivt valg. Det er aldri forhåndsutfylt, setter bare ubesvarte forhold til «Nei», endrer aldri et «Ja» eller «Ukjent», og gjelder ikke forhold som endrer planen.
 *
 * Med en beslutning av (bare i tester) vises forbehold og avledede
 * bekreftelser som én samlet avkrysning til slutt, og «Ingen av disse» tilbys ikke.
 */
export interface Beslutninger {
  B1: boolean
  B2: boolean
  B4: boolean
  B5: boolean
}

export const BESLUTNINGER: Readonly<Beslutninger> = Object.freeze({ B1: true, B2: true, B4: true, B5: true })
