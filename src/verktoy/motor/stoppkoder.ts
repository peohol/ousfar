/**
 * Strukturerte stoppkoder (B1 i `docs/verktøy-brukervennlighet-2026-11.md`):
 * hver stoppgrunn i en doseplan får en kode ved siden av teksten, så
 * spørsmålsflyten kan forklare stoppet med en handling («velg form», «svar på
 * spørsmålet») uten å tolke fri tekst. Tekstene er uendret; koden er et
 * tillegg (`Doseplanresultat.stoppkoder`, i samme rekkefølge som
 * `stoppgrunner`). Navnene er avtalt med spørsmålsflyten
 * (`Stoppkodenavn` i `src/verktoy/flyt/typer.ts`).
 *
 * `ref` peker på det stoppet gjelder når det er én ting: id-en til unntaket,
 * bekreftelsen eller spørsmålet, eller forløpet.
 */
import { gjeldendeBekreftelser, type Regel } from '../regler/modell'

/** Kodene og hva hver betyr. En ny kode legges til her, i spørsmålsflytens kodeliste og i `docs/verktøy-praktisk-dosering.md`. */
export const STOPPKODER = {
  unntak_gjelder: 'Et unntak i regelen er besvart ja (ref: unntaket).',
  unntak_ukjent: 'Et unntak i regelen er ikke besvart (ref: unntaket).',
  sporsmal_ubesvart: 'Et spørsmål i regelen er ikke besvart (ref: spørsmålet).',
  bekreftelse_mangler: 'En bekreftelse i regelen er ikke gitt (ref: bekreftelsen).',
  begrunnelse_trengs: 'Et svar, en dose eller en verdi krever skriftlig begrunnelse.',
  dose_utenfor: 'Startdosen eller måldosen er utenfor et bindende krav i regelen.',
  utenfor_omfang: 'Planen er utenfor det kliniske omfanget (startdose, form, svar, verdi, styrke eller deling).',
  formvalg_trengs: 'Formuleringen eller legemiddelformen må velges (ref: forløpet). Et valg, ikke et reelt stopp.',
  trinnvalg_trengs: 'Et trinn kan ikke gis nøyaktig, og forskriveren kan velge en av dosene som tilbys (ref: forløpet). Et valg, ikke et reelt stopp.',
  valg_ugyldig: 'Et valg som er gjort, gjelder ikke (lenger) og må fjernes eller gjøres på nytt.',
  ingen_preparater: 'FEST har ingen preparater som kan brukes i forløpet (ref: forløpet).',
  godkjenningsfritak_trengs: 'Bare preparater som krever godkjenningsfritak kan brukes i forløpet (ref: forløpet).',
  ingen_dose: 'En dose i planen kan ikke gis med preparatene i FEST: ikke nøyaktig, ikke fordelt slik preparatomtalen krever, eller ikke i kurvens retning (ref: forløpet).',
  ikke_komplett: 'Planen når ikke sluttmålet, og klinikere får aldri en delplan (ref: forløpet).',
  ikke_klinisk: 'Regelen er ikke gyldig klinisk godkjent eller er erstattet, eller FEST-kopien er ikke bekreftet fersk og gyldig.',
  sperret: 'En nødstopp gjelder (settes av appen, ikke av motoren).',
  regelfeil: 'Regelen er ugyldig eller mangler en verdi.',
  annet: 'Alt annet.',
} as const

export type Stoppkode = keyof typeof STOPPKODER

export interface Stoppgrunn {
  kode: Stoppkode
  tekst: string
  ref?: string
}

export const grunn = (kode: Stoppkode, tekst: string, ref?: string): Stoppgrunn => (ref === undefined ? { kode, tekst } : { kode, tekst, ref })
export const kodet = (kode: Stoppkode, xs: readonly string[]): Stoppgrunn[] => xs.map((t) => grunn(kode, t))
export const tekster = (g: readonly Stoppgrunn[]): string[] => g.map((x) => x.tekst)

/** Tekstene regelmotoren (`beregn`) lager av regelens egne vilkår, med kode og id. */
function vilkarstekster(regel: Regel, svar: Record<string, boolean> | undefined): Map<string, Omit<Stoppgrunn, 'tekst'>> {
  const m = new Map<string, Omit<Stoppgrunn, 'tekst'>>()
  for (const u of regel.unntak) {
    m.set(`Regelen gjelder ikke: ${u.tekst}`, { kode: 'unntak_gjelder', ref: u.id })
    m.set(`Må avklares før beregning (ukjent): ${u.tekst}`, { kode: 'unntak_ukjent', ref: u.id })
  }
  for (const b of [...regel.bekreftelser, ...gjeldendeBekreftelser(regel, svar)]) m.set(`Må bekreftes før beregning: ${b.tekst}`, { kode: 'bekreftelse_mangler', ref: b.id })
  for (const s of regel.sporsmal ?? []) m.set(`Må besvares før beregning: ${s.tekst}`, { kode: 'sporsmal_ubesvart', ref: s.id })
  return m
}

/** Innledningene regelmotoren bruker for de andre stoppene, med koden. Rekkefølgen avgjør ved overlapp. */
const INNLEDNINGER: readonly [RegExp, Stoppkode][] = [
  [/krever en skriftlig begrunnelse/, 'begrunnelse_trengs'],
  [/^(Startdosen|Måldosen) [\d,]+ mg er utenfor det regelen gjelder for/, 'dose_utenfor'],
  [/^Valget |^Regelen lar ikke forskriveren velge dosen/, 'valg_ugyldig'],
  [/^Regelversjonen er /, 'ikke_klinisk'],
  [/^(Regelen er ugyldig:|Verdien |Beregningen ga en ugyldig plan:|Beregningen kunne ikke fullføres:|Regelen er bare tekstlig|Det finnes ingen anbefaling)/, 'regelfeil'],
]

/**
 * Kodene for stoppgrunnene fra regelmotoren. Unntak, bekreftelser og spørsmål
 * kjennes igjen på nøyaktig teksten regelmotoren lager av regelens egen tekst,
 * så de får id-en; de andre på innledningen; resten er `annet`.
 */
export function regelmotorkoder(regel: Regel, svar: Record<string, boolean> | undefined, grunner: readonly string[]): Stoppgrunn[] {
  const kjente = vilkarstekster(regel, svar)
  return grunner.map((tekst) => {
    const k = kjente.get(tekst)
    if (k) return { ...k, tekst }
    return grunn(INNLEDNINGER.find(([x]) => x.test(tekst))?.[1] ?? 'annet', tekst)
  })
}
