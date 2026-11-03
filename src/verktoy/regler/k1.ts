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
 * Sluttdosen, det minste trinnet og oppfølgingen etter seponering er OUSFARs
 * forslag og åpne spørsmål til den uavhengige kontrolløren (K1.9 og K1.10 i
 * `docs/verktøy-k1-nedtrapping-kontrollgrunnlag.md`); ingenting her er
 * forhåndsgodkjent, og regelen er ikke klinisk godkjent.
 */
import { h, NICE, RCPSYCH, steg, utsagn } from './bygg'
import type { Fase, Forlop, Grunnlag, Kildehenvisning, Parameter, Regel, Utsagn, Vurderingspunkt } from './modell'

export const K1_DATO = '2026-11-03'

/** Fakta fra kildene K1 bruker i tillegg til de felles, med egne ord. */
export const K1_KILDER = {
  draape: h('dmp-cipralex-draper', 'pkt. 2', 'Hver dråpe inneholder 1 mg escitalopram (20 mg/ml).'),
  bioekvivalens: h('dmp-cipralex-draper', 'pkt. 5.2', 'Dråpene er bioekvivalente med Cipralex tabletter.'),
  seponering: h('dmp-cipralex-draper', 'pkt. 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og deretter trappe ned mer gradvis.'),
  symptomer: h('dmp-cipralex-draper', 'pkt. 4.4', 'Seponeringssymptomer kommer vanligvis de første dagene etter seponering og går vanligvis over innen to uker, men kan hos noen vare to til tre måneder eller mer. Legemidlet bør trappes gradvis ned over uker eller måneder etter pasientens behov.'),
  heltSlutt: h('rcpsych-stopping', 'If you have been taking antidepressants for longer', 'Uansett hvor lav dosen er blitt, kan seponeringssymptomer komme når legemidlet stoppes helt; da kan det være nødvendig å starte igjen med en lav dose en tid før nedtrappingen fortsetter.'),
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

/** Escitalopram med dråper: 3 → 2 → 1 mg og seponering fra 1 mg, som forslag til kontrolløren (K0 03.11.2026). */
export const K1_ESCITALOPRAM: Avslutningsforslag = {
  regel: 'seponering-escitalopram',
  fra_versjon: 12,
  form: 'dråper på 1 mg per dråpe',
  min_mg: { verdi: 1, kilde: K1_KILDER.draape },
  minste_trinn: { fra_mg: 3, maks_prosent: 50 },
  sluttdose_mg: 1,
  etter_seponering: [
    { dager: 7, begrunnelse: 'Seponeringssymptomer kommer vanligvis de første dagene etter seponering (preparatomtalen pkt. 4.4).', henvisninger: [K1_KILDER.symptomer] },
    { dager: 14, begrunnelse: 'Seponeringssymptomer går vanligvis over innen to uker (preparatomtalen pkt. 4.4).', henvisninger: [K1_KILDER.symptomer] },
    {
      dager: 28,
      begrunnelse: 'Symptomene kan vare lenger enn to uker (preparatomtalen pkt. 4.4), og tilbakefall må vurderes. Samme tid som standardtrinnet (28 dager); tiden er OUSFARs valg, ingen kilde angir en bestemt oppfølgingstid etter seponering.',
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
      tekst: 'Doser under 5 mg krever dråper (1 mg per dråpe) eller deling. Hele dråper gir bare hele milligram, og avrunding til hele dråper er ingen toleranse. Fra 3 mg kan forskriveren velge ett minste trinn på én dråpe (3 → 2 mg er 33 %, 2 → 1 mg er 50 %), større enn de 25 % NICE bruker som eksempel ved lav dose; mindre trinn under 3 mg ville krevd fortynning eller oppmåling, som ikke er dokumentert.',
    },
    {
      tekst: 'Sluttdosen 1 mg (én dråpe) er ikke en dokumentert terskel: ingen kilde angir en dose som er lav nok før seponering. RCPsych beskriver at noen trenger å gå ned mot 2 % av opprinnelig dose (0,2–0,4 mg fra 10–20 mg), som ikke kan gis med dråpene uten fortynning, og at seponeringssymptomer kan komme uansett hvor lav dosen er. Sluttdosen er OUSFARs forslag og et åpent spørsmål til kontrolløren. Trenger pasienten mindre trinn enn én dråpe, beregner verktøyet dem ikke: dosen holdes på siste tolererte dose, og videre nedtrapping planlegges individuelt uten fortynning eller oppmåling fra verktøyet.',
    },
  ],
  eksempler: {
    // 25 % per trinn fra 20 mg, regnet uten preparater: neste trinn etter 1,13 mg (0,85 mg) er under laveste dose (1 mg), og 1,13 mg er over sluttdosen, så planen seponerer ikke.
    'fra-20-mg': {
      beskrivelse: 'Fra 20 mg med standardvalgene: 25 % per trinn, minst 28 dager, regnet uten preparater. Neste trinn etter 1,13 mg er under laveste dose (1 mg), og 1,13 mg er over sluttdosen, så denne beregningen seponerer ikke. Med dråper gir forskriverens valg og det minste trinnet hele milligram ned til 1 mg (kontrollgrunnlaget).',
      forventet: ['dag 1–28: 15 mg', 'dag 29–56: 11,25 mg', 'dag 57–84: 8,44 mg', 'dag 85–112: 6,33 mg', 'dag 113–140: 4,75 mg', 'dag 141–168: 3,56 mg', 'dag 169–196: 2,67 mg', 'dag 197–224: 2 mg', 'dag 225–252: 1,5 mg', 'fra dag 253: 1,13 mg', 'regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 1,13 mg); praktisk grense: ingen trinn under 1 mg; avslutning vurderes individuelt'],
    },
    // 10 % per trinn fra 10 mg: 10 · 0,9^12 = 2,82 mg, over 1 mg, så planen seponerer ikke og stopper ved horisonten.
    'fra-10-mg-lang': {
      forventet: ['dag 1–28: 9 mg', 'dag 29–56: 8,1 mg', 'dag 57–84: 7,29 mg', 'dag 85–112: 6,56 mg', 'dag 113–140: 5,9 mg', 'dag 141–168: 5,31 mg', 'dag 169–196: 4,78 mg', 'dag 197–224: 4,3 mg', 'dag 225–252: 3,87 mg', 'dag 253–280: 3,48 mg', 'dag 281–308: 3,13 mg', 'fra dag 309: 2,82 mg', 'regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 2,82 mg); teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt'],
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

  const nyFase: Fase = {
    ...fase,
    strategi: {
      ...fase.strategi,
      minste_trinn: {
        fra_mg: parameter(
          fra_mg,
          'mg',
          apent(
            `Fra ${tall(fra_mg)} mg kan ikke neste trinn gis innenfor valgområdet med ${a.form} (${trinnene.join(', ')}), så forskriveren kan velge den nærmeste lavere dosen som kan gis. Mindre trinn ville krevd fortynning eller oppmåling, som ikke er dokumentert.`,
            [a.min_mg.kilde, NICE.andel, RCPSYCH.lavDose],
          ),
        ),
        maks_prosent: parameter(
          maks_prosent,
          'prosent',
          apent(
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
        apent(
          `Seponering planlegges bare fra ${tall(a.sluttdose_mg)} mg eller lavere, den laveste dosen ${a.form} gir uten fortynning. Ingen kilde angir en dose som er lav nok før seponering: RCPsych beskriver at noen trenger svært lave doser, og at seponeringssymptomer kan komme uansett hvor lav dosen er. Sluttdosen er OUSFARs forslag og et åpent spørsmål til kontrolløren.`,
          [a.min_mg.kilde, RCPSYCH.lavDose, K1_KILDER.heltSlutt, NICE.andel],
        ),
      ),
      grunnlag: apent(avslutningstekst(navn, a), [NICE.andel, NICE.tempo, a.spc.seponering, RCPSYCH.lavDose, K1_KILDER.heltSlutt]),
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
        nar: { type: 'etter_seponering', dager: parameter(e.dager, 'dager', apent(e.begrunnelse, e.henvisninger)) },
        tekst: `Vurder seponeringssymptomer og tegn på tilbakefall ${e.dager} dager etter siste dose.`,
        ved_funn: 'Seponeringssymptomer kan komme selv etter svært lave doser. Ved plagsomme symptomer kan legemidlet startes igjen i lav dose en tid før en ny og langsommere nedtrapping; ved tilbakefall vurderes behandlingen på nytt. Trengs mindre trinn enn én dråpe (1 mg), kan verktøyet ikke beregne dem, og videre nedtrapping planlegges individuelt.',
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
        utsagn('Nedtrappingen går trinnvis helt til null; noen trenger svært lave doser før de slutter, og seponeringssymptomer kan komme når legemidlet stoppes, uansett hvor lav dosen er.', NICE.andel, RCPSYCH.lavDose, K1_KILDER.heltSlutt),
        utsagn('Seponeringssymptomer kommer vanligvis de første dagene etter seponering og går vanligvis over innen to uker, men kan hos noen vare i måneder.', a.spc.symptomer),
      ],
      tilpasninger: [...r.fortolkning.tilpasninger.map(bytt), ...(a.tilpasninger ?? [])],
      usikkerhet: [...r.fortolkning.usikkerhet.filter((u) => !erstattes.some((x) => x.test(u))), ...a.usikkerhet.map((u) => u.tekst)],
    },
    godkjenning: {
      status: 'til_faglig_kontroll',
      historikk: [
        ...r.godkjenning.historikk,
        steg('utkast', versjon, merknad, K1_DATO),
        steg('til_faglig_kontroll', versjon, 'Sendt til uavhengig faglig kontroll (K1, ny runde etter kontrollen av PR #323). Sluttdosen og det minste trinnet er åpne spørsmål til kontrolløren. Ikke klinisk godkjent.', K1_DATO),
      ],
    },
  }
}

/** Reglene med avslutning der et forslag gjelder; alle andre uendret. */
export function medAvslutninger(regler: Regel[], forslag: readonly Avslutningsforslag[] = K1_AVSLUTNINGER): Regel[] {
  const ukjent = forslag.filter((a) => !regler.some((r) => r.id === a.regel))
  if (ukjent.length > 0) throw new Error(`Avslutning for ukjente regler: ${ukjent.map((a) => a.regel).join(', ')}`)
  return regler.map((r) => {
    const a = forslag.find((x) => x.regel === r.id)
    return a ? medAvslutning(r, a) : r
  })
}
