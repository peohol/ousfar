/**
 * K1 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`: nedtrapping av
 * antidepressiv helt til seponering, der det kan forsvares og gjennomføres med
 * norske preparater, og ellers et eksplisitt svar om at det ikke går.
 *
 * Nedtrappingsreglene i P7 (`nedtrapping.ts`) går aldri til null: planen
 * stopper ved siste dose som kan gis. Kontrollen av K1 03.11.2026 (PR #323)
 * avviste både en seponeringsgrense ved laveste døgndose i preparatomtalen og
 * delplaner som klinisk produkt. Motoren viser derfor aldri en delplan, bare
 * «Komplett plan ikke tilgjengelig» med grunnen (Peders beslutning
 * 03.11.2026), og det gjelder alle regler uten at noe må endres i dem.
 *
 * Her får bare regler med en dokumentert lavdosemetode en ny versjon med en
 * avslutning: escitalopram med dråper på 1 mg per dråpe (Cipralex 20 mg/ml,
 * DMP 07-4892). Fra 3 mg kan forskriveren velge et minste trinn på én dråpe
 * (3 → 2 → 1 mg), og fra 1 mg holdes dosen et helt trinn før seponering.
 * Sluttdosen (K1.9 i `docs/verktøy-k1-nedtrapping-kontrollgrunnlag.md`) er
 * avgjort faglig av Peder 04.11.2026 for et avgrenset omfang
 * ({@link K1_SLUTTDOSE_PEDER}). Det minste trinnet og oppfølgingen etter
 * seponering (K1.10 og K1.12) er avklart av den uavhengige kontrolløren
 * samme dag ({@link K1_KONTROLL_0411}). Kontrolløren godkjente deretter
 * nøyaktig versjon 13 klinisk i et snevert omfang ({@link K1_GODKJENNING_0411});
 * alle andre tilfeller og stoffer gir fortsatt «Komplett plan ikke
 * tilgjengelig».
 */
import { h, KONTROLLOREN, NICE, RCPSYCH, steg, utsagn } from './bygg'
import type { Avklaring, Fase, Forlop, Grunnlag, Kildehenvisning, Parameter, Regel, Utsagn, Vurderingspunkt } from './modell'

export const K1_DATO = '2026-11-03'

/** Fakta fra kildene K1 bruker i tillegg til de felles, med egne ord. */
export const K1_KILDER = {
  draape: h('dmp-cipralex-draper', 'pkt. 2', 'Hver dråpe inneholder 1 mg escitalopram (20 mg/ml).'),
  bioekvivalens: h('dmp-cipralex-draper', 'pkt. 5.2', 'Dråpene er bioekvivalente med Cipralex tabletter.'),
  seponering: h(
    'dmp-cipralex-draper',
    'pkt. 4.2',
    'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og deretter trappe ned mer gradvis.',
  ),
  symptomer: h(
    'dmp-cipralex-draper',
    'pkt. 4.4',
    'Seponeringssymptomer kommer vanligvis de første dagene etter seponering og går vanligvis over innen to uker, men kan hos noen vare to til tre måneder eller mer. Legemidlet bør trappes gradvis ned over uker eller måneder etter pasientens behov.',
  ),
  heltSlutt: h(
    'rcpsych-stopping',
    'If you have been taking antidepressants for longer',
    'Uansett hvor lav dosen er blitt, kan seponeringssymptomer komme når legemidlet stoppes helt; da kan det være nødvendig å starte igjen med en lav dose en tid før nedtrappingen fortsetter.',
  ),
} as const

/** En regel som får en ny versjon med avslutning, med verdiene OUSFAR foreslår. */
export interface Avslutningsforslag {
  regel: string
  /** Versjonen den nye bygger på; er regelen endret siden, stopper byggingen i stedet for å bygge på noe som ikke er vurdert. */
  fra_versjon: number
  /** Formen avslutningen er mulig med, i tekst (f.eks. «dråper på 1 mg per dråpe»). */
  form: string
  /** Laveste dose formen kan gi uten fortynning eller oppmåling (`dosevalg.min_mg`). */
  min_mg: { verdi: number; kilde: Kildehenvisning }
  /** Det minste trinnet ved lave doser (`strategi.minste_trinn`). */
  minste_trinn: { fra_mg: number; maks_prosent: number }
  /** Dosen seponeringen planlegges fra (`avslutning.fra_hoyst_mg`). */
  sluttdose_mg: number
  /**
   * Dokumenterte avklaringer av OUSFARs valg: sluttdosen og seponeringen
   * (`sluttdose`), det minste trinnet (`minste_trinn`) og dagene for
   * oppfølging etter siste dose (`oppfolging`). Et valg uten avklaring er et
   * åpent forslag til kontrolløren.
   */
  avklaringer?: { sluttdose?: Avklaring; minste_trinn?: Avklaring; oppfolging?: Avklaring }
  /**
   * Kontrollørens kliniske godkjenning av den nye versjonen, når den er gitt:
   * bundet til fingeravtrykket kontrolløren oppga og med kontrollørens
   * avgrensning. Uten den står versjonen til faglig kontroll. Stemmer ikke
   * fingeravtrykket med regelen, er godkjenningen ugyldig, og motoren gir
   * ingen plan (`godkjenningsfeil`).
   */
  godkjent?: { dato: string; kontroll: string; fingeravtrykk: string; avgrensning: string }
  /** Dager etter siste dose med oppfølging, hvert med grunnlaget for dagen. */
  etter_seponering: { dager: number; begrunnelse: string; henvisninger: Kildehenvisning[] }[]
  /** Kildene for seponeringen og oppfølgingen i preparatomtalen. */
  spc: { seponering: Kildehenvisning; symptomer: Kildehenvisning }
  /** Nye utsagn i fortolkningen, f.eks. overgang mellom former. */
  tilpasninger?: Utsagn[]
  /** Usikkerheter som erstatter dem som ikke lenger stemmer (matchet med `erstatter`). */
  usikkerhet: { erstatter?: RegExp; tekst: string }[]
  /**
   * Den forventede planen for hvert regneeksempel med plan i versjonen det
   * bygger på, regnet ut på nytt med avslutningen; et eksempel uten ny
   * forventning stopper byggingen, så ingen forventning arves ukontrollert.
   */
  eksempler: Record<string, { beskrivelse?: string; forventet: string[] }>
}

const tall = (x: number) => String(x).replace('.', ',')

/** Et åpent forslag: OUSFARs vurdering uten avklaring, til uavhengig kontroll. */
const apent = (begrunnelse: string, henvisninger: Kildehenvisning[]): Grunnlag => ({ type: 'ousfar_vurdering', begrunnelse, henvisninger, avklaring: null })
const parameter = (verdi: number, enhet: Parameter['enhet'], grunnlag: Grunnlag): Parameter => ({ verdi, enhet, art: 'bindende_krav', grunnlag })

/**
 * Peders faglige avgjørelse på K1.9 (sluttdosen for escitalopram med dråper),
 * med ordlyden fra beslutningskortet i K0-tråden 04.11.2026 kl. 03:07 UTC.
 * Den gjelder bare K1.9; det minste trinnet (K1.10) og oppfølgingsdagene
 * (K1.12) er avklart av kontrolløren, og regelen er godkjent av kontrolløren.
 */
export const K1_9_AVGJORELSE = {
  dato: '2026-11-04',
  kort: 'ChatGPT vil ikke avgjøre alene: kan escitalopram-dråper stoppes fra 1 mg?',
  valg: 'Ja, stopp fra 1 mg',
  avgrensning: 'Gjelder voksne under 65 år med kort behandlingstid, uten tidligere seponeringsplager. Gir første komplette nedtrapping (fra 10 eller 20 mg), etter ChatGPTs kontroll av resten.',
  beslutningsregel: '1 mg er 5–10 % av startdosen. Hvert trinn styres av symptomer, og det følges opp etter 7, 14 og 28 dager. Ved plager vurderes resten individuelt.',
} as const

export const K1_SLUTTDOSE_PEDER: Avklaring = {
  dato: K1_9_AVGJORELSE.dato,
  av: 'Peder (faglig beslutningstaker)',
  rolle: 'faglig_beslutningstaker',
  regelversjon: 13,
  merknad:
    `Peders faglige avgjørelse på K1.9, ${K1_9_AVGJORELSE.dato} (beslutningskortet «${K1_9_AVGJORELSE.kort}», valgt alternativ «${K1_9_AVGJORELSE.valg}»). ` +
    `Avgrensning, ordrett: «${K1_9_AVGJORELSE.avgrensning}» Beslutningsregel, ordrett: «${K1_9_AVGJORELSE.beslutningsregel}» ` +
    'Gjelder bare sluttdosen og seponeringen fra 1 mg (K1.9), ikke det minste trinnet (K1.10), oppfølgingsdagene (K1.12) eller regelen som helhet.',
}

/**
 * Kontrollørens uavhengige avklaring av K1.10 og K1.12 i kontrollen av
 * 80e557b 04.11.2026, for nøyaktig dette escitalopramforløpet og omfanget.
 * Ingen samlet godkjenning av regelen; den er {@link K1_GODKJENNING_0411}.
 */
const KONTROLLEN_0411 = { ...KONTROLLOREN, dato: '2026-11-04', regelversjon: 13 } as const
export const K1_KONTROLL_0411: { minste_trinn: Avklaring; oppfolging: Avklaring } = {
  minste_trinn: {
    ...KONTROLLEN_0411,
    merknad:
      'Kontrollørens gjennomgang av 80e557b 04.11.2026 (K1.10): ja, avgrenset til dette escitalopramforløpet. 3 → 2 mg (33 %) og 2 → 1 mg (50 %) med hele Cipralex-dråper kan være forsvarlige for den dokumenterte korttids- og lavrisikogruppen når hvert trinn holdes tilstrekkelig lenge, forskriveren velger dosene og symptomer avgjør videre tempo. Prosentene er ingen generell sikkerhetsterskel og skal ikke generaliseres til langvarig behandling, plagsomme seponeringssymptomer eller andre antidepressiver.',
  },
  oppfolging: {
    ...KONTROLLEN_0411,
    merknad:
      'Kontrollørens gjennomgang av 80e557b 04.11.2026 (K1.12): ja, som kontrollpunkter 7, 14 og 28 dager etter siste dose, i tillegg til vurdering før hvert trinn. Ikke dokumentasjon for at akkurat disse dagene er obligatoriske eller optimale for alle; oppfølgingen må kunne fremskyndes eller forlenges etter symptomer og tilbakefallsrisiko.',
  },
}

/**
 * Kontrollørens samlede kontroll av 255dd94 04.11.2026 (PR #323, kommentar
 * 6622813839): positiv faglig konklusjon og klinisk godkjenning av nøyaktig
 * escitalopram versjon 13 med dette fingeravtrykket, i kontrollørens snevre
 * omfang. Ingen godkjenning av andre stoffer, pasientgrupper eller K1 som helhet.
 */
export const K1_GODKJENNING_0411 = {
  dato: '2026-11-04',
  kontroll: 'Kontrollørens samlede kontroll av 255dd94 04.11.2026 (PR #323, kommentar 6622813839)',
  fingeravtrykk: 'e8a3c17edda10da43b1df4171a733a23133da50ebcda31cd71a771022a8a78d7',
  avgrensning:
    'et symptomstyrt, pragmatisk komplett forløp fra 10 eller 20 mg hos voksne under 65 år med kort behandlingstid, ingen tidligere seponeringsplager og avklarte interaksjoner og kontraindikasjoner, med hele Cipralex-dråper (1 mg per dråpe), valgt gradvis reduksjon til 3 → 2 → 1 mg, siste dose holdt og vurdert individuelt før 1 → 0, og fleksible kontrollpunkter 7, 14 og 28 dager etter siste dose. ' +
    'Godkjenningen er ingen generell garanti mot seponeringsplager, ingen automatisk terskel for andre preparater eller pasientgrupper, og ingen fullført K1-dekning. 1 mg er en praktisk formuleringsterskel, ikke en dokumentert universell trygg seponeringsgrense.',
} as const

/** Escitalopram med dråper: 3 → 2 → 1 mg og seponering fra 1 mg; sluttdosen avgjort av Peder (K1.9), K1.10 og K1.12 avklart og regelen godkjent av kontrolløren. */
export const K1_ESCITALOPRAM: Avslutningsforslag = {
  regel: 'seponering-escitalopram',
  fra_versjon: 12,
  form: 'dråper på 1 mg per dråpe',
  min_mg: { verdi: 1, kilde: K1_KILDER.draape },
  minste_trinn: { fra_mg: 3, maks_prosent: 50 },
  sluttdose_mg: 1,
  avklaringer: { sluttdose: K1_SLUTTDOSE_PEDER, ...K1_KONTROLL_0411 },
  godkjent: K1_GODKJENNING_0411,
  etter_seponering: [
    { dager: 7, begrunnelse: 'Seponeringssymptomer kommer vanligvis de første dagene etter seponering (preparatomtalen pkt. 4.4).', henvisninger: [K1_KILDER.symptomer] },
    { dager: 14, begrunnelse: 'Seponeringssymptomer går vanligvis over innen to uker (preparatomtalen pkt. 4.4).', henvisninger: [K1_KILDER.symptomer] },
    {
      dager: 28,
      begrunnelse:
        'Symptomene kan vare lenger enn to uker (preparatomtalen pkt. 4.4), og tilbakefall må vurderes. Samme tid som standardtrinnet (28 dager); tiden er OUSFARs valg, ingen kilde angir en bestemt oppfølgingstid etter seponering.',
      henvisninger: [K1_KILDER.symptomer, RCPSYCH.tid],
    },
  ],
  spc: { seponering: K1_KILDER.seponering, symptomer: K1_KILDER.symptomer },
  tilpasninger: [
    utsagn(
      'En pasient som bruker escitalopram tabletter, kan gå over til dråper med samme døgndose i mg når planen starter: én dråpe er 1 mg, og dråpene er bioekvivalente med Cipralex tabletter. Planen med dråper regnes da fra døgndosen pasienten bruker. Generiske tabletter er godkjent mot Cipralex tabletter, men ikke sammenlignet direkte med dråpene.',
      K1_KILDER.draape,
      K1_KILDER.bioekvivalens,
    ),
  ],
  usikkerhet: [
    {
      erstatter: /^Doser under 5 mg krever dråper/,
      tekst:
        'Doser under 5 mg krever dråper (1 mg per dråpe) eller deling. Hele dråper gir bare hele milligram, og avrunding til hele dråper er ingen toleranse. Fra 3 mg kan forskriveren velge ett minste trinn på én dråpe (3 → 2 mg er 33 %, 2 → 1 mg er 50 %), større enn de 25 % NICE bruker som eksempel ved lav dose. Kontrolløren har godtatt trinnene bare for dette forløpet (K1.10), ikke som en generell terskel; mindre trinn under 3 mg ville krevd fortynning eller oppmåling, som ikke er dokumentert.',
    },
    {
      tekst:
        'Sluttdosen 1 mg (én dråpe) er ikke en dokumentert terskel: ingen kilde angir en dose som er lav nok før seponering. RCPsych beskriver at noen trenger å gå ned mot 2 % av opprinnelig dose (0,2–0,4 mg fra 10–20 mg), som ikke kan gis med dråpene uten fortynning, og at seponeringssymptomer kan komme uansett hvor lav dosen er. Sluttdosen er avgjort faglig av Peder 04.11.2026 (K1.9) bare for voksne under 65 år med kort behandlingstid, uten tidligere seponeringsplager, med dråper fra 10 eller 20 mg; seponeringen er en individuell klinisk vurdering i dette forløpet, og 1 mg er ikke en terskel fra en kilde. Trenger pasienten mindre trinn enn én dråpe, beregner verktøyet dem ikke: dosen holdes på siste tolererte dose, og videre nedtrapping planlegges individuelt uten fortynning eller oppmåling fra verktøyet.',
    },
  ],
  eksempler: {
    // 25 % per trinn fra 20 mg, regnet uten preparater: neste trinn etter 1,13 mg (0,85 mg) er under laveste dose (1 mg), og 1,13 mg er over sluttdosen, så planen seponerer ikke.
    'fra-20-mg': {
      beskrivelse:
        'Fra 20 mg med standardvalgene: 25 % per trinn, minst 28 dager, regnet uten preparater. Neste trinn etter 1,13 mg er under laveste dose (1 mg), og 1,13 mg er over sluttdosen, så denne beregningen seponerer ikke. Med dråper gir forskriverens valg og det minste trinnet hele milligram ned til 1 mg (kontrollgrunnlaget).',
      forventet: [
        'dag 1–28: 15 mg',
        'dag 29–56: 11,25 mg',
        'dag 57–84: 8,44 mg',
        'dag 85–112: 6,33 mg',
        'dag 113–140: 4,75 mg',
        'dag 141–168: 3,56 mg',
        'dag 169–196: 2,67 mg',
        'dag 197–224: 2 mg',
        'dag 225–252: 1,5 mg',
        'fra dag 253: 1,13 mg',
        'regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 1,13 mg); praktisk grense: ingen trinn under 1 mg; avslutning vurderes individuelt',
      ],
    },
    // 10 % per trinn fra 10 mg: 10 · 0,9^12 = 2,82 mg, over 1 mg, så planen seponerer ikke og stopper ved horisonten.
    'fra-10-mg-lang': {
      forventet: [
        'dag 1–28: 9 mg',
        'dag 29–56: 8,1 mg',
        'dag 57–84: 7,29 mg',
        'dag 85–112: 6,56 mg',
        'dag 113–140: 5,9 mg',
        'dag 141–168: 5,31 mg',
        'dag 169–196: 4,78 mg',
        'dag 197–224: 4,3 mg',
        'dag 225–252: 3,87 mg',
        'dag 253–280: 3,48 mg',
        'dag 281–308: 3,13 mg',
        'fra dag 309: 2,82 mg',
        'regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 2,82 mg); teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
      ],
    },
  },
}

/** Reglene i K1 med ny versjon. */
export const K1_AVSLUTNINGER: readonly Avslutningsforslag[] = [K1_ESCITALOPRAM]

/** Teksten om slutten av planen, skrevet ut fra verdiene så den aldri kan avvike fra dem. */
export const avslutningstekst = (navn: string, a: Avslutningsforslag) =>
  `Med ${a.form} kan forskriveren fra ${tall(a.minste_trinn.fra_mg)} mg velge et minste trinn på høyst ${tall(a.minste_trinn.maks_prosent)} % når ingen dose innenfor valgområdet kan gis, ned til ${tall(a.sluttdose_mg)} mg. Når planen har nådd ${tall(a.sluttdose_mg)} mg eller lavere, holdes siste dose et helt trinn, og ${navn} seponeres deretter, først når forskriveren ved vurderingen har funnet at dosen er tolerert uten plagsomme seponeringssymptomer. Når planen ikke når dit, er den ikke komplett, og verktøyet viser ingen doser. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.`

function nedtrappingsfase(r: Regel): Extract<Fase, { type: 'nedtrapping' }> & { strategi: { type: 'prosent_av_aktuell' } } {
  const f = r.plan.forlop[0]?.faser.at(-1)
  if (f?.type !== 'nedtrapping' || f.strategi.type !== 'prosent_av_aktuell' || !f.strategi.prosent.omrade || !f.trinnvalg || f.avslutning !== 'individuell')
    throw new Error(`${r.id}: avslutningen krever en prosentvis nedtrapping med valg av dose per trinn og individuell avslutning som siste fase.`)
  return f as ReturnType<typeof nedtrappingsfase>
}

/** Ny versjon av regelen med avslutning; regelen må være nøyaktig versjonen forslaget bygger på. */
export function medAvslutning(r: Regel, a: Avslutningsforslag): Regel {
  if (r.id !== a.regel) throw new Error(`Forslaget gjelder ${a.regel}, ikke ${r.id}.`)
  if (r.versjon !== a.fra_versjon) throw new Error(`${r.id} er versjon ${r.versjon}, men avslutningen bygger på versjon ${a.fra_versjon}; vurder endringen og oppdater forslaget.`)
  const fase = nedtrappingsfase(r)
  const navn = r.tittel.replace(/^Seponering av /, '').replace(/,.*$/, '')
  const versjon = r.versjon + 1
  const { fra_mg, maks_prosent } = a.minste_trinn
  const ned = (fra: number, til: number) => `${tall(fra)} → ${tall(til)} mg er ${tall(Math.round(((fra - til) / fra) * 10000) / 100)} %`
  const trinnene = Array.from({ length: Math.round(fra_mg - a.sluttdose_mg) }, (_, i) => ned(fra_mg - i, fra_mg - i - 1))

  // OUSFARs valg: avklart der forslaget har en dokumentert avklaring, ellers åpne forslag.
  const valg =
    (avklaring: Avklaring | undefined) =>
    (begrunnelse: string, henvisninger: Kildehenvisning[]): Grunnlag =>
      avklaring ? { type: 'ousfar_vurdering', begrunnelse, henvisninger, avklaring } : apent(begrunnelse, henvisninger)
  const sluttdose = valg(a.avklaringer?.sluttdose)
  const minsteTrinn = valg(a.avklaringer?.minste_trinn)
  const oppfolging = valg(a.avklaringer?.oppfolging)

  const nyFase: Fase = {
    ...fase,
    strategi: {
      ...fase.strategi,
      minste_trinn: {
        fra_mg: parameter(
          fra_mg,
          'mg',
          minsteTrinn(
            `Fra ${tall(fra_mg)} mg kan ikke neste trinn gis innenfor valgområdet med ${a.form} (${trinnene.join(', ')}), så forskriveren kan velge den nærmeste lavere dosen som kan gis. Mindre trinn ville krevd fortynning eller oppmåling, som ikke er dokumentert.`,
            [a.min_mg.kilde, NICE.andel, RCPSYCH.lavDose],
          ),
        ),
        maks_prosent: parameter(
          maks_prosent,
          'prosent',
          minsteTrinn(
            `Høyst ${tall(maks_prosent)} % i ett minste trinn, så det siste trinnet ned til ${tall(a.sluttdose_mg)} mg kan gis. RCPsych bruker om lag 50 % per trinn som utgangspunkt ved middels risiko; NICE bruker 25 % som eksempel når dosen blir lav. Trinnene er derfor større enn NICE-eksempelet, og tempoet styres av symptomene: neste trinn først når eventuelle seponeringssymptomer er borte eller tålelige.`,
            [RCPSYCH.plan, RCPSYCH.middelsRisiko, NICE.andel, NICE.tempo, RCPSYCH.tid],
          ),
        ),
      },
    },
    avslutning: {
      type: 'seponering',
      fra_hoyst_mg: parameter(
        a.sluttdose_mg,
        'mg',
        sluttdose(
          `Seponering planlegges bare fra ${tall(a.sluttdose_mg)} mg eller lavere, etter en individuell klinisk vurdering i det avgrensede forløpet: siste dose er holdt et helt trinn og tolerert. ${tall(a.sluttdose_mg)} mg er den laveste dosen ${a.form} gir uten fortynning, men den minste hele dosen er ikke i seg selv en trygg terskel. Ingen kilde angir en dose som er lav nok før seponering: RCPsych beskriver at noen trenger svært lave doser, og at seponeringssymptomer kan komme uansett hvor lav dosen er. ${a.avklaringer?.sluttdose ? 'Sluttdosen er avgjort faglig av en navngitt faglig beslutningstaker for et avgrenset omfang (avklaringen), ikke dokumentert i en kilde.' : 'Sluttdosen er OUSFARs forslag og et åpent spørsmål til kontrolløren.'}`,
          [a.min_mg.kilde, RCPSYCH.lavDose, K1_KILDER.heltSlutt, NICE.andel],
        ),
      ),
      grunnlag: sluttdose(avslutningstekst(navn, a), [NICE.andel, NICE.tempo, a.spc.seponering, RCPSYCH.lavDose, K1_KILDER.heltSlutt]),
    },
  }
  const vurderinger: Vurderingspunkt[] = [
    {
      id: 'for_hver_reduksjon',
      nar: { type: 'for_hvert_trinn' },
      tekst: 'Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.',
      ved_funn: 'Ved utålelige symptomer: gå tilbake til forrige dose og fortsett senere mer gradvis. Ny plan beregnes fra dosen pasienten da bruker.',
      grunnlag: { type: 'kilde', henvisninger: [a.spc.seponering, NICE.tempo, NICE.alvorlig, RCPSYCH.tid] },
    },
    ...a.etter_seponering.map(
      (e): Vurderingspunkt => ({
        id: `etter_seponering_${e.dager}`,
        nar: { type: 'etter_seponering', dager: parameter(e.dager, 'dager', oppfolging(e.begrunnelse, e.henvisninger)) },
        tekst: `Vurder seponeringssymptomer og tegn på tilbakefall ${e.dager} dager etter siste dose.`,
        ved_funn:
          'Seponeringssymptomer kan komme selv etter svært lave doser. Ved plagsomme symptomer kan legemidlet startes igjen i lav dose en tid før en ny og langsommere nedtrapping; ved tilbakefall vurderes behandlingen på nytt. Trengs mindre trinn enn én dråpe (1 mg), kan verktøyet ikke beregne dem, og videre nedtrapping planlegges individuelt. Oppfølgingen kan fremskyndes eller forlenges etter symptomer og risiko for tilbakefall.',
        // Hva som vurderes og gjøres, står i kildene; dagen er det åpne valget (`nar.dager`).
        grunnlag: { type: 'kilde', henvisninger: [a.spc.symptomer, K1_KILDER.heltSlutt, NICE.alvorlig] },
      }),
    ),
  ]
  const forste = r.plan.forlop[0]!
  const forlop: Forlop = {
    ...forste,
    dosevalg: {
      ...forste.dosevalg,
      min_mg: { verdi: a.min_mg.verdi, enhet: 'mg', art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [a.min_mg.kilde] } },
    },
    faser: [...forste.faser.slice(0, -1), nyFase],
    vurderinger,
  }

  // Tekstene om at planen aldri går til null, erstattes av avslutningen.
  const UTEN_NULL = /(?:Planen viser høyst \d+ reduksjoner \(en teknisk planhorisont\) og går ikke til null[^.]*\.|^Planen går ikke til null[^]*$)/
  const bytt = (u: Utsagn): Utsagn => (UTEN_NULL.test(u.tekst) ? { ...u, tekst: u.tekst.replace(UTEN_NULL, avslutningstekst(navn, a)) } : u)
  const byttet = r.fortolkning.tilpasninger.filter((u) => UTEN_NULL.test(u.tekst)).length
  if (byttet === 0) throw new Error(`${r.id}: fant ingen tekst om at planen ikke går til null; oppdater forslaget.`)

  const eksempler = r.eksempler.map((e) => {
    if (e.stopp || !e.forventet.fra) return e
    const ny = a.eksempler[e.id]
    if (!ny) throw new Error(`${r.id}: regneeksempelet ${e.id} mangler forventet plan med avslutning.`)
    return { ...e, ...(ny.beskrivelse && { beskrivelse: ny.beskrivelse }), forventet: { ...e.forventet, fra: ny.forventet } }
  })
  const ukjente = Object.keys(a.eksempler).filter((id) => !r.eksempler.some((e) => e.id === id))
  if (ukjente.length > 0) throw new Error(`${r.id}: forventet plan for ukjente regneeksempler: ${ukjente.join(', ')}`)
  const erstattes = a.usikkerhet.flatMap((u) => (u.erstatter ? [u.erstatter] : []))
  for (const x of erstattes) if (!r.fortolkning.usikkerhet.some((u) => x.test(u))) throw new Error(`${r.id}: fant ingen usikkerhet som ${x} kan erstatte.`)

  const avklart = [a.avklaringer?.sluttdose && 'sluttdosen (K1.9)', a.avklaringer?.minste_trinn && 'det minste trinnet (K1.10)', a.avklaringer?.oppfolging && 'oppfølgingsdagene (K1.12)'].filter(
    Boolean,
  )
  const sisteAvklaring = Object.values(a.avklaringer ?? {})
    .map((x) => x.dato)
    .sort()
    .at(-1)
  const tilKontroll = `Sendt til uavhengig faglig kontroll (K1, ny runde etter kontrollen av PR #323). ${avklart.length > 0 ? `Avklart: ${avklart.join(', ')}. ` : ''}${avklart.length === 3 ? 'Ingen åpne valg; til samlet faglig kontroll av regelen.' : 'Andre valg er åpne spørsmål til kontrolløren.'} Ikke klinisk godkjent.`
  const merknad = `Ny versjon i K1 (${K1_DATO}): minste trinn fra ${tall(fra_mg)} mg (høyst ${tall(maks_prosent)} %), avslutning med seponering fra ${tall(a.sluttdose_mg)} mg etter en eksplisitt vurdering, laveste dose ${tall(a.min_mg.verdi)} mg og vurderingspunkter før hver reduksjon og ${a.etter_seponering.map((e) => e.dager).join(', ')} dager etter siste dose; alle som åpne forslag til kontrolløren. Ellers uendret fra versjon ${r.versjon}.`
  return {
    ...r,
    versjon,
    plan: { ...r.plan, forlop: [forlop, ...r.plan.forlop.slice(1)] },
    eksempler,
    fortolkning: {
      ...r.fortolkning,
      kildetro: [
        ...r.fortolkning.kildetro,
        utsagn(
          'Nedtrappingen går trinnvis helt til null; noen trenger svært lave doser før de slutter, og seponeringssymptomer kan komme når legemidlet stoppes, uansett hvor lav dosen er.',
          NICE.andel,
          RCPSYCH.lavDose,
          K1_KILDER.heltSlutt,
        ),
        utsagn('Seponeringssymptomer kommer vanligvis de første dagene etter seponering og går vanligvis over innen to uker, men kan hos noen vare i måneder.', a.spc.symptomer),
      ],
      tilpasninger: [...r.fortolkning.tilpasninger.map(bytt), ...(a.tilpasninger ?? [])],
      usikkerhet: [...r.fortolkning.usikkerhet.filter((u) => !erstattes.some((x) => x.test(u))), ...a.usikkerhet.map((u) => u.tekst)],
    },
    godkjenning: {
      status: a.godkjent ? 'klinisk_godkjent' : 'til_faglig_kontroll',
      historikk: [
        ...r.godkjenning.historikk,
        steg('utkast', versjon, merknad, K1_DATO),
        steg('til_faglig_kontroll', versjon, tilKontroll, sisteAvklaring ?? K1_DATO),
        ...(a.godkjent
          ? [
              {
                ...KONTROLLOREN,
                status: 'klinisk_godkjent' as const,
                dato: a.godkjent.dato,
                regelversjon: versjon,
                fingeravtrykk: a.godkjent.fingeravtrykk,
                merknad: `${a.godkjent.kontroll}: faglig akseptert og klinisk godkjent bare for nøyaktig denne regelversjonen og dette fingeravtrykket, avgrenset til ${a.godkjent.avgrensning}`,
              },
            ]
          : []),
      ],
    },
  }
}

/**
 * Reglene med avslutning der et forslag gjelder, alle andre uendret, og så
 * de nye reglene med formovergang ({@link medFormovergang}), bygd på reglene
 * med avslutning.
 */
export function medAvslutninger(regler: Regel[], forslag: readonly Avslutningsforslag[] = K1_AVSLUTNINGER, overganger: readonly Formovergangsforslag[] = K1_OVERGANGER): Regel[] {
  const ukjent = forslag.filter((a) => !regler.some((r) => r.id === a.regel))
  if (ukjent.length > 0) throw new Error(`Avslutning for ukjente regler: ${ukjent.map((a) => a.regel).join(', ')}`)
  const med = regler.map((r) => {
    const a = forslag.find((x) => x.regel === r.id)
    return a ? medAvslutning(r, a) : r
  })
  const nye = overganger.map((o) => {
    const r = med.find((x) => x.id === o.regel)
    if (!r) throw new Error(`Formovergang for en ukjent regel: ${o.regel}`)
    return medFormovergang(r, o)
  })
  return [...med, ...nye]
}

/* --- B2: tabletter så lenge de gir dosen, så dråper (escitalopram) --------------- */

/**
 * B2 i `docs/verktøy-brukervennlighet-2026-11.md`: en ny regel som bygger på
 * en godkjent K1-versjon og lar en pasient som bruker tabletter, fortsette
 * med tabletter så lenge de gir dosen, og så gå over til dråper med samme
 * døgndose i mg (`Forlop.formoverganger`), med praktisk dosering
 * (`Dosevalg.praktisk`). Regelen har en egen id og erstatter den gamle
 * (`Regel.erstatter`), så den gamle gjelder som før til den nye er klinisk
 * godkjent. Ingenting arver godkjenningen: valgene er åpne forslag til
 * kontrolløren til de er avklart.
 */
export interface Formovergangsforslag {
  /** Regelen og versjonen den nye bygger på; er regelen endret siden, stopper byggingen. */
  regel: string
  fra_versjon: number
  /** Den nye regelens id og tittel. */
  id: string
  tittel: string
  /** Overgangen mellom formene (FEST-koder) og kildene for at de kan byttes mg for mg. */
  overgang: { fra: string; til: string; samtidig?: true; begrunnelse: string; henvisninger: Kildehenvisning[] }
  /** Dråpepreferansen per administrasjon (B6) og begrunnelsen. */
  praktisk: { draper: number; begrunnelse: string; henvisninger: Kildehenvisning[] }
  /**
   * Det nye kliniske tilfellet: startdosene med formene i rekkefølge og
   * styrkene per form. Det erstatter tilfellene som bare gjelder den første
   * formen; de andre tilfellene i regelen står uendret.
   */
  tilfelle: { startdoser: number[]; formstyrker: Record<string, number[]> }
  /** Teksten i fortolkningen om overgangen, som erstatter den gamle (matchet med `erstatter`). */
  tilpasning: { erstatter: RegExp; tekst: string; henvisninger: Kildehenvisning[] }
  /**
   * Spørsmål som rettes i den nye versjonen (samme id, så svarene og kravene
   * som bruker spørsmålet, står), med begrunnelsen for rettelsen.
   */
  sporsmal?: readonly { id: string; tekst: string; ja: string; begrunnelse: string }[]
  /** Dokumenterte avklaringer av overgangen og den praktiske doseringen; uten dem er de åpne forslag. */
  avklaringer?: { overgang?: Avklaring; praktisk?: Avklaring }
  /** Kontrollørens kliniske godkjenning, når den er gitt (som {@link Avslutningsforslag.godkjent}). */
  godkjent?: Avslutningsforslag['godkjent']
}

/** B2: escitalopram fra tabletter til dråper, med versjon 13 som grunnlag. */
export const B2_DATO = '2026-11-04'
export const B2_ESCITALOPRAM: Formovergangsforslag = {
  regel: 'seponering-escitalopram',
  fra_versjon: 13,
  id: 'seponering-escitalopram-tabletter-og-draper',
  tittel: 'Seponering av escitalopram med tabletter og dråper, gjentatt prosentvis nedtrapping',
  overgang: {
    fra: '53',
    til: '748',
    begrunnelse:
      'En pasient som bruker tabletter, fortsetter med hele tabletter så lenge de gir dosen i trinnet nøyaktig, og går over til dråper med samme døgndose i mg (mg for mg, som K1.11) når tablettene ikke lenger gjør det; planen går aldri tilbake til tabletter, og hver dose gis med én form. Én dråpe er 1 mg, og dråpene er bioekvivalente med Cipralex tabletter. Tidspunktet for overgangen er OUSFARs valg: det sparer pasienten for mange dråper ved høye doser, uten å kombinere to preparater i samme dose.',
    henvisninger: [K1_KILDER.draape, K1_KILDER.bioekvivalens],
  },
  praktisk: {
    draper: 5,
    begrunnelse:
      'Blant dosene som følger kurven like godt, velges den som gir færrest dråper over 5 per administrasjon, så delte tabletter, så færrest tabletter eller målinger og færrest styrker. 5 dråper er en preferanse for enkel administrasjon (B6), ikke en grense og ikke en kilde: flere dråper gis når ingenting enklere gir dosen. Verdien er OUSFARs valg og avgjøres i kontrollen.',
    henvisninger: [K1_KILDER.draape],
  },
  tilfelle: { startdoser: [10, 20], formstyrker: { '53': [5, 10, 20], '748': [1] } },
  sporsmal: [
    {
      id: 'eldre',
      tekst: 'Er pasienten 65 år eller eldre?',
      ja: '65 år eller eldre',
      begrunnelse:
        'Peders avgjørelse på K1.9 gjelder voksne under 65 år, men versjon 13 spør «Er pasienten over 65 år?», så en pasient på nøyaktig 65 år kan svare nei og få en plan utenfor avgrensningen. Versjon 14 spør om 65 år eller eldre, så 65 år regnes med og stopper (ChatGPTs kontroll av planen for brukervennlighet, 04.11.2026).',
    },
  ],
  tilpasning: {
    erstatter: /^En pasient som bruker escitalopram tabletter, kan gå over til dråper/,
    tekst:
      'En pasient som bruker escitalopram tabletter, fortsetter med hele tabletter så lenge de gir dosen i trinnet, og går så over til dråper med samme døgndose i mg: én dråpe er 1 mg, og dråpene er bioekvivalente med Cipralex tabletter. Planen går ikke tilbake til tabletter, og hver dose gis med én form. Generiske tabletter er godkjent mot Cipralex tabletter, men ikke sammenlignet direkte med dråpene.',
    henvisninger: [K1_KILDER.draape, K1_KILDER.bioekvivalens],
  },
}

/** Reglene med formovergang (B2). */
export const K1_OVERGANGER: readonly Formovergangsforslag[] = [B2_ESCITALOPRAM]

/** Den nye regelen med formovergang, bygd på nøyaktig versjonen forslaget gjelder. */
export function medFormovergang(r: Regel, a: Formovergangsforslag): Regel {
  if (r.id !== a.regel) throw new Error(`Forslaget gjelder ${a.regel}, ikke ${r.id}.`)
  if (r.versjon !== a.fra_versjon) throw new Error(`${r.id} er versjon ${r.versjon}, men formovergangen bygger på versjon ${a.fra_versjon}; vurder endringen og oppdater forslaget.`)
  if (r.plan.forlop.length !== 1 || r.plan.forlop[0]!.administrasjon !== 'peroral') throw new Error(`${r.id}: formovergangen krever ett peroralt forløp.`)
  if (!r.fortolkning.tilpasninger.some((u) => a.tilpasning.erstatter.test(u.tekst))) throw new Error(`${r.id}: fant ingen tekst om overgangen som ${a.tilpasning.erstatter} kan erstatte.`)
  const valg =
    (avklaring: Avklaring | undefined) =>
    (begrunnelse: string, henvisninger: Kildehenvisning[]): Grunnlag =>
      avklaring ? { type: 'ousfar_vurdering', begrunnelse, henvisninger, avklaring } : apent(begrunnelse, henvisninger)
  const sporsmal = (r.sporsmal ?? []).map((s) => {
    const rettet = a.sporsmal?.find((x) => x.id === s.id)
    return rettet ? { ...s, tekst: rettet.tekst, ja: rettet.ja } : s
  })
  const ukjente = (a.sporsmal ?? []).filter((x) => !r.sporsmal?.some((s) => s.id === x.id))
  if (ukjente.length > 0) throw new Error(`${r.id}: spørsmålene ${ukjente.map((x) => x.id).join(', ')} finnes ikke i regelen.`)
  const rettelser = (a.sporsmal ?? []).map((x) => ` Spørsmålet «${x.id}» er rettet til «${x.tekst}»: ${x.begrunnelse}`).join('')
  const versjon = r.versjon + 1
  const forste = r.plan.forlop[0]!
  const forlop: Forlop = {
    ...forste,
    formoverganger: [
      { fra: a.overgang.fra, til: a.overgang.til, ...(a.overgang.samtidig && { samtidig: true }), grunnlag: valg(a.avklaringer?.overgang)(a.overgang.begrunnelse, a.overgang.henvisninger) },
    ],
    dosevalg: { ...forste.dosevalg, praktisk: { draper: a.praktisk.draper, grunnlag: valg(a.avklaringer?.praktisk)(a.praktisk.begrunnelse, a.praktisk.henvisninger) } },
  }
  const omfang = r.klinisk_omfang
  if (!omfang) throw new Error(`${r.id}: formovergangen krever et klinisk omfang.`)
  // Tilfellene som bare gjelder den første formen, erstattes av tilfellet med begge formene; de andre står uendret.
  const tilfeller = [
    ...omfang.tilfeller.filter((t) => t.legemiddelform !== a.overgang.fra),
    {
      legemiddelformer: [a.overgang.fra, a.overgang.til],
      startdoser: a.tilfelle.startdoser,
      svar: {},
      styrker: { fra: [...new Set(Object.values(a.tilfelle.formstyrker).flat())].sort((x, y) => x - y) },
      formstyrker: a.tilfelle.formstyrker,
    },
  ]
  const avklart = [a.avklaringer?.overgang && 'overgangen', a.avklaringer?.praktisk && 'den praktiske doseringen'].filter(Boolean)
  return {
    ...r,
    id: a.id,
    tittel: a.tittel,
    versjon,
    erstatter: [r.id],
    ...(r.sporsmal && { sporsmal }),
    plan: { ...r.plan, forlop: [forlop] },
    klinisk_omfang: { ...omfang, tilfeller },
    fortolkning: { ...r.fortolkning, tilpasninger: r.fortolkning.tilpasninger.map((u) => (a.tilpasning.erstatter.test(u.tekst) ? utsagn(a.tilpasning.tekst, ...a.tilpasning.henvisninger) : u)) },
    godkjenning: {
      status: a.godkjent ? 'klinisk_godkjent' : 'til_faglig_kontroll',
      historikk: [
        ...r.godkjenning.historikk,
        steg(
          'utkast',
          versjon,
          `Ny versjon i B2 (${B2_DATO}) som egen regel som erstatter ${r.id} når den er godkjent: pasienter som bruker tabletter, fortsetter med tabletter så lenge de gir dosen og går så over til dråper mg for mg, og praktisk dosering med høyst ${a.praktisk.draper} dråper som preferanse. Startdosene, pasientgruppen, trinnene, sluttdosen og oppfølgingen er uendret fra versjon ${r.versjon}.${rettelser}`,
          B2_DATO,
        ),
        steg(
          'til_faglig_kontroll',
          versjon,
          `Sendt til uavhengig faglig kontroll (B2). ${avklart.length > 0 ? `Avklart: ${avklart.join(', ')}. ` : ''}${avklart.length === 2 ? 'Ingen åpne valg.' : 'Overgangen og den praktiske doseringen er åpne forslag til kontrolløren.'} Ikke klinisk godkjent; godkjenningen av versjon ${r.versjon} gjelder ikke denne versjonen.`,
          B2_DATO,
        ),
        ...(a.godkjent
          ? [
              {
                ...KONTROLLOREN,
                status: 'klinisk_godkjent' as const,
                dato: a.godkjent.dato,
                regelversjon: versjon,
                fingeravtrykk: a.godkjent.fingeravtrykk,
                merknad: `${a.godkjent.kontroll}: faglig akseptert og klinisk godkjent bare for nøyaktig denne regelversjonen og dette fingeravtrykket, avgrenset til ${a.godkjent.avgrensning}`,
              },
            ]
          : []),
      ],
    },
  }
}
