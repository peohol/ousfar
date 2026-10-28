/**
 * Byggesteinene regelsettene i OUSFAR Verktøy deles om: hjelperne som skriver
 * en kildehenvisning, en kildeverdi eller et OUSFAR-forslag, godkjenningssteg,
 * og fakta fra NICE og preparatomtalene for antidepressiva som brukes av både
 * pilotsettet (P4, `pilotsett.ts`) og nedtrappingsreglene (P7,
 * `nedtrapping.ts`). Fakta er gjengitt med egne ord, aldri som sitat, og
 * Psychiatrienet står bare som henvisning til kildeoppføringen fra P3.
 */
import type { Godkjenningssteg, Kildehenvisning, Parameter, Parameterart, Utsagn } from './modell'

/* --- Hjelpere ---------------------------------------------------------------------- */

export const h = (kilde: string, sted: string, faktum: string): Kildehenvisning => ({ kilde, sted, faktum })
export const pn = (kildeoppforing: string): Kildehenvisning => ({ kilde: 'psychiatrienet', kildeoppforing })
export const utsagn = (tekst: string, ...henvisninger: Kildehenvisning[]): Utsagn => ({ tekst, henvisninger })

/** En verdi kilden selv oppgir. */
export const kilde = (verdi: number, enhet: Parameter['enhet'], art: Parameterart, ...henvisninger: Kildehenvisning[]): Parameter => ({
  verdi,
  enhet,
  art,
  grunnlag: { type: 'kilde', henvisninger },
})

/** OUSFARs eget valg, eventuelt innenfor det en kilde tillater. */
export const forslag = (
  verdi: number | null,
  enhet: Parameter['enhet'],
  begrunnelse: string,
  valg: { art?: Parameterart; omrade?: [number, number]; henvisninger?: Kildehenvisning[] } = {},
): Parameter => ({
  verdi,
  enhet,
  art: valg.art ?? 'veiledende_preferanse',
  grunnlag: { type: 'ousfar_vurdering', begrunnelse, ...(valg.henvisninger ? { henvisninger: valg.henvisninger } : {}), avklaring: null },
  ...(valg.omrade ? { omrade: valg.omrade } : {}),
})

export const steg = (status: Godkjenningssteg['status'], regelversjon: number, merknad: string): Godkjenningssteg => ({
  status,
  dato: '2026-10-28',
  av: 'Claude Code',
  rolle: 'utvikler',
  regelversjon,
  merknad,
})

/* --- Fakta fra kildene, med egne ord ------------------------------------------------- */

export const NICE = {
  andel: h('nice-ng222', 'anbefaling 1.4.16', 'Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav.'),
  tempo: h('nice-ng222', 'anbefaling 1.4.16', 'Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder.'),
  bytte: h('nice-ng222', 'anbefaling 1.4.16', 'Raskere nedtrapping kan være aktuelt ved bytte av antidepressiv.'),
  flytende: h('nice-ng222', 'anbefaling 1.4.16', 'Flytende formuleringer kan vurderes når svært små doser ikke kan gis med tabletter eller kapsler.'),
  vurdering: h('nice-ng222', 'anbefaling 1.4.18', 'Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste.'),
  fluoksetin: h('nice-ng222', 'anbefaling 1.4.18', 'Fluoksetin virker lenge: ved 20 mg daglig kan en periode med dosering annenhver dag være en egnet reduksjon; ved 40–60 mg daglig brukes gradvis nedtrapping.'),
  mao: h('nice-ng222', 'anbefaling 1.9.5', 'Bytte til eller fra en MAO-hemmer skal skje i, eller med råd fra, spesialisthelsetjenesten. Bytte kan kreve kryssnedtrapping.'),
  kombinasjon: h('nice-ng222', 'anbefaling 1.9.9', 'Mirtazapin lagt til et SSRI er et kombinasjonsalternativ; SSRI sammen med MAO-hemmer kan være farlig og skal unngås.'),
}

/** Fakta fra preparatomtalene for antidepressiva som brukes i flere regelsett. */
export const SPC_AD = {
  cipralexDose: h('dmp-cipralex', 'pkt. 4.2', 'Dosene som oppgis er 5–20 mg daglig; sikkerheten over 20 mg daglig er ikke vist.'),
  cipralexSeponering: h('dmp-cipralex', 'pkt. 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere.'),
  cipramilDose: h('dmp-cipramil', 'pkt. 4.2', 'Anbefalt dose er 20 mg daglig, maksimalt 40 mg; ved panikklidelse startes det med 10 mg.'),
  cipramilSeponering: h('dmp-cipramil', 'pkt. 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere.'),
  zoloftDose: h('dmp-zoloft', 'pkt. 4.2', 'Startdose 50 mg daglig (25 mg ved enkelte angstlidelser); økning i trinn på 50 mg til maksimalt 200 mg daglig.'),
  zoloftSeponering: h('dmp-zoloft', 'pkt. 4.2 og 4.4', 'Dosen reduseres gradvis over minst én til to uker; noen trenger nedtrapping over flere uker eller måneder.'),
  remeronDose: h('dmp-remeron', 'pkt. 4.2', 'Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis.'),
  fluoksetinDose: h('dmp-fluoxetin', 'pkt. 4.2', 'Anbefalt dose ved depresjon er 20 mg daglig, maksimalt 60 mg.'),
  fluoksetinSeponering: h('dmp-fluoxetin', 'pkt. 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Aktivt stoff finnes i kroppen i flere uker etter seponering.'),
  fluoksetinMao: h('dmp-fluoxetin', 'pkt. 4.3 og 4.5', 'Kontraindisert sammen med irreversibel, ikke-selektiv MAO-hemmer; det skal gå minst 5 uker etter seponering av fluoksetin før en slik MAO-hemmer startes.'),
}

/* --- Felles forslag ----------------------------------------------------------------------- */

export const minst14 = (seponering: Kildehenvisning) =>
  forslag(14, 'dager', '«Minst én til to uker» er lest konservativt som minst 14 dager.', { art: 'bindende_krav', henvisninger: [seponering] })

export const trinn14 = (begrunnelse: string, ...henvisninger: Kildehenvisning[]) =>
  forslag(14, 'dager', begrunnelse, { omrade: [7, 14], henvisninger: [NICE.vurdering, ...henvisninger] })

export const halvering = (sluttdose: Parameter, lav?: { prosent: Parameter; grense: Parameter }) => ({
  type: 'prosent_av_aktuell' as const,
  prosent: forslag(50, 'prosent', 'Eksempelet i NICE er 50 % av forrige dose.', { henvisninger: [NICE.andel] }),
  ...(lav ? { lav_prosent: lav.prosent, lav_grense_mg: lav.grense } : {}),
  sluttdose_mg: sluttdose,
})

export const FORUTSETNINGER_FELLES = [
  'Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.',
  'Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.',
  'Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.',
]
