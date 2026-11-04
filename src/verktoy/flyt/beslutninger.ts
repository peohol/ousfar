/**
 * Beslutningene i §10 i `docs/verktøy-brukervennlighet-2026-11.md` som
 * avgjør hvordan flyten oppfyller bekreftelser og stoppforhold. Hver står av
 * til ChatGPT (og Peder ved prinsipielle valg) uttrykkelig har akseptert den;
 * da settes den på her i en egen PR som viser aksepten.
 *
 * - `B1`: bekreftelser som er **forbehold**, vises i planen og kopien i stedet for å krysses av.
 * - `B2`: bekreftelser som er **avledet** av et uttrykkelig valg (preparat), oppfylles av valget.
 * - `B4`: når bare én legemiddelform kan gi en komplett plan innenfor godkjent omfang, velger verktøyet den selv og sier det.
 * - `B5`: en gruppe stoppforhold kan besvares med «Ingen av disse», som setter de ubesvarte til «Nei».
 *
 * Til en beslutning er akseptert, vises forbehold og avledede bekreftelser som
 * én samlet avkrysning til slutt (§4.1), og «Ingen av disse» tilbys ikke.
 */
export interface Beslutninger {
  B1: boolean
  B2: boolean
  B4: boolean
  B5: boolean
}

export const BESLUTNINGER: Readonly<Beslutninger> = Object.freeze({ B1: false, B2: false, B4: false, B5: false })
