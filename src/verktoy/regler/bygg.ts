/**
 * Felles byggesteiner for regelsettene (pilotsettet i P4 og nedtrappingsreglene
 * i P7): henvisninger, utsagn, parametre med grunnlag, godkjenningssteg og
 * fakta fra NICE som flere regler bygger på. Faktaene er gjengitt med egne
 * ord, med sted i kilden (`kilder.ts`).
 */
import type { Godkjenningssteg, Kildehenvisning, Parameter, Parameterart, Utsagn } from './modell'

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

/* --- Fakta fra NICE, med egne ord ------------------------------------------------- */

export const NICE = {
  andel: h('nice-ng222', 'anbefaling 1.4.16', 'Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav.'),
  tempo: h('nice-ng222', 'anbefaling 1.4.16', 'Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder.'),
  bytte: h('nice-ng222', 'anbefaling 1.4.16', 'Raskere nedtrapping kan være aktuelt ved bytte av antidepressiv.'),
  flytende: h('nice-ng222', 'anbefaling 1.4.16', 'Flytende formuleringer kan vurderes når svært små doser ikke kan gis med tabletter eller kapsler.'),
  vurdering: h('nice-ng222', 'anbefaling 1.4.18', 'Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste.'),
  fluoksetin: h('nice-ng222', 'anbefaling 1.4.18', 'Fluoksetin virker lenge: ved 20 mg daglig kan en periode med dosering annenhver dag være en egnet reduksjon; ved 40–60 mg daglig brukes gradvis nedtrapping.'),
  mao: h('nice-ng222', 'anbefaling 1.9.5', 'Bytte til eller fra en MAO-hemmer skal skje i, eller med råd fra, spesialisthelsetjenesten. Bytte kan kreve kryssnedtrapping.'),
  kombinasjon: h('nice-ng222', 'anbefaling 1.9.9', 'Mirtazapin lagt til et SSRI er et kombinasjonsalternativ; SSRI sammen med MAO-hemmer kan være farlig og skal unngås.'),
  halveringstid: h('nice-ng222', 'anbefaling 1.4.16', 'Ved nedtrapping tas det hensyn til farmakokinetikken og behandlingstiden; antidepressiva med kort halveringstid må trappes ned langsommere.'),
  saerligRisiko: h('nice-ng222', 'anbefaling 1.4.18', 'Seponeringssymptomer kan komme med mange antidepressiva; paroksetin og venlafaksin gir dem oftere og krever særlig varsomhet.'),
  tidligere: h('nice-ng222', 'anbefaling 1.4.15', 'Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes.'),
  alvorlig: h('nice-ng222', 'anbefaling 1.4.21', 'Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte.'),
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
