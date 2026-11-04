/**
 * Grensesnittet mellom den nye arbeidsflyten i verktøyene og resten av
 * appen (§9 i `docs/verktøy-brukervennlighet-2026-11.md`). Tråd C eier
 * typene; tråd A bygger visningen mot dem, og tråd B leverer stoppkodene
 * ({@link Stoppkode}) fra motoren.
 *
 * Alt her er ren logikk uten React. Flyten avgjør aldri noe klinisk alene:
 * svarene avbildes til nøyaktig de feltene motoren leser i dag (`svar`,
 * `pasientforhold`, `bekreftet` i `Planskjema`), og planen kommer bare fra
 * `kliniskDoseplan` (S1).
 */

/** Svaret på et ja/nei-spørsmål. «Ukjent» er aldri det trygge svaret: det gir ingen plan (S4). */
export type Svar = 'ja' | 'nei' | 'ukjent'

/**
 * Ett svaralternativ slik det vises: verdien flyten regner med og teksten på
 * knappen. Ja/nei-spørsmål bruker {@link Svar} som verdi; aldersspørsmålet og
 * senere flervalg har egne verdier.
 */
export interface Svaralternativ {
  verdi: string
  tekst: string
}

/** Rekkefølgen spørsmålene stilles i (§4.3): stoppforhold først, så det som endrer planen, så kliniske vurderinger. */
export type Sporsmalsgruppe = 'stopp' | 'endrer' | 'vurdering'

/**
 * Hvordan betingelsen er klassifisert i katalogen (§4.1).
 * - `sikkerhetsopplysning`: et forhold ved pasienten som kan stoppe eller endre planen; spørres med Ja/Nei/Ukjent.
 * - `avledet`: følger av et annet svar eller av valget av legemiddel, preparat eller dose; står i planen som «Forutsatt».
 * - `forbehold`: hvordan planen skal brukes, ikke et forhold ved pasienten; står i planen og kopien.
 * - `klinisk_vurdering`: noe klinikeren må ha vurdert; spørres med «Ja»/«Ikke ennå».
 * - `uklassifisert`: ikke i katalogen eller katalogen er ikke kontrollert for regelversjonen; spørres med regelens egen tekst (S5, S5b).
 */
export type Kategori = 'sikkerhetsopplysning' | 'avledet' | 'forbehold' | 'klinisk_vurdering' | 'uklassifisert'

/** Ett spørsmål slik flyten viser det. */
export interface Flytsporsmal {
  /** Stabil id i flyten (katalogens id, eller `regel:<betingelse>` for en betingelse uten katalogoppføring). */
  id: string
  tekst: string
  /** Hjelpetekst bare der spørsmålet kan misforstås. */
  hjelp?: string
  gruppe: Sporsmalsgruppe
  kategori: Kategori
  /** `valg`: segmenterte knapper. `avkrysning`: én bekreftelse (trygg standard, S5b, og samlet bekreftelse til B1–B2 er akseptert). */
  art: 'valg' | 'avkrysning'
  /** Verdiene som kan velges, i visningsrekkefølge. Lik `alternativer.map(a => a.verdi)`. */
  svar: readonly string[]
  alternativer: readonly Svaralternativ[]
  /** Svarene som gjør at ingen plan kan lages. */
  stopperVed?: readonly string[]
  /** Én setning ved et stoppende svar: hva det betyr og hva klinikeren kan gjøre i stedet. */
  forklaring?: string
  /** Ved en samlet avkrysning: tekstene som bekreftes. */
  punkter?: readonly string[]
  /** Svaret som er gitt; mangler når spørsmålet er ubesvart. */
  valgt?: string
}

/**
 * En kort forklaring på hvorfor en plan ikke kan lages ennå, til klinikeren.
 * `losning` sier om det kan løses i verktøyet (et valg, et svar) eller må
 * vurderes individuelt utenfor.
 */
export interface Stoppforklaring {
  kode: string
  tekst: string
  handling?: string
  kilde?: string
  losning?: 'i_verktoyet' | 'individuelt'
  /** Spørsmålet i flyten forklaringen gjelder, så visningen kan vise den ved spørsmålet. */
  sporsmal?: string
}

/** Utfallet av forhåndskontrollen (§5). Den lover aldri en plan (S9). */
export type Kontrollutfall = 'ukjent' | 'kan_lages_hvis' | 'kan_ikke'

export interface Forhandskontroll {
  utfall: Kontrollutfall
  grunner: Stoppforklaring[]
  /** Antall synlige spørsmål og valg som ennå ikke er besvart. */
  gjenstar: number
}

export interface Flyttilstand {
  steg: 'hva' | 'behandling' | 'pasient' | 'plan'
  /** Bare de synlige spørsmålene, i rekkefølge. */
  sporsmal: Flytsporsmal[]
  /** Avledede svar og forbehold, til planen og kopien. */
  forutsatt: string[]
  kontroll: Forhandskontroll
}

/**
 * Den strukturerte koden B legger ved hver stoppgrunn i `Doseplanresultat`
 * (tekstene uendret). `ref` er betingelsen eller forløpet grunnen gjelder,
 * når den gjelder én. Kodene som er «valg trengs», er gjenstående
 * opplysninger, ikke reelle stopp (§5 punkt 4).
 */
export interface Stoppkode {
  kode: Stoppkodenavn
  tekst: string
  ref?: string
}

/**
 * Kodelisten C foreslår for B (avtales i B1):
 * - `unntak_gjelder`: et unntak er besvart ja (`ref`: unntakets id).
 * - `unntak_ukjent`: et unntak er ikke besvart.
 * - `sporsmal_ubesvart`: et spørsmål er ikke besvart.
 * - `bekreftelse_mangler`: en bekreftelse er ikke gitt.
 * - `begrunnelse_trengs`: et svar, en dose eller en verdi krever skriftlig begrunnelse.
 * - `dose_utenfor`: startdosen eller måldosen er utenfor et bindende krav i regelen.
 * - `utenfor_omfang`: utenfor det kliniske omfanget (startdose, form, svar, verdi, styrke, deling).
 * - `formvalg_trengs`: formuleringen eller legemiddelformen må velges (valg trengs).
 * - `trinnvalg_trengs`: en dose for et trinn må velges (valg trengs).
 * - `valg_ugyldig`: et valg som er gjort, gjelder ikke lenger.
 * - `ingen_preparater`: FEST har ingen brukbare preparater for forløpet.
 * - `godkjenningsfritak_trengs`: bare preparater som krever godkjenningsfritak kan brukes.
 * - `ikke_komplett`: planen når ikke sluttmålet.
 * - `ikke_klinisk`: regelen er ikke gyldig godkjent, FEST er ikke fersk, eller en annen sperre.
 * - `sperret`: en nødstopp gjelder.
 * - `regelfeil`: regelen er ugyldig eller mangler en verdi.
 * - `annet`: alt annet.
 */
export type Stoppkodenavn =
  | 'unntak_gjelder'
  | 'unntak_ukjent'
  | 'sporsmal_ubesvart'
  | 'bekreftelse_mangler'
  | 'begrunnelse_trengs'
  | 'dose_utenfor'
  | 'utenfor_omfang'
  | 'formvalg_trengs'
  | 'trinnvalg_trengs'
  | 'valg_ugyldig'
  | 'ingen_preparater'
  | 'godkjenningsfritak_trengs'
  | 'ikke_komplett'
  | 'ikke_klinisk'
  | 'sperret'
  | 'regelfeil'
  | 'annet'

/** Kodene som betyr at et valg trengs, ikke at planen er umulig. */
export const VALG_TRENGS: readonly Stoppkodenavn[] = ['formvalg_trengs', 'trinnvalg_trengs']
