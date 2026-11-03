/**
 * K1 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`: nedtrapping av
 * antidepressiv helt til seponering der det kan forsvares og gjennomføres med
 * norske preparater.
 *
 * Nedtrappingsreglene i P7 (`nedtrapping.ts`) går aldri til null: planen
 * stopper ved siste dose som kan beregnes, og avslutningen vurderes
 * individuelt (fagkontrollene 29. og 30.10.2026). Det gir delplaner. Her får
 * utvalgte regler en ny versjon med en **avslutning**: når nedtrappingen har
 * nådd en dose på eller under laveste døgndose preparatomtalen oppgir for
 * voksne, gis siste dose et helt trinn, og legemidlet seponeres etter en
 * eksplisitt vurdering. Stopper nedtrappingen over den dosen, er planen en
 * delplan som før, og planen sier hvorfor.
 *
 * Grensen leses fra regelens egen `lav_grense_mg` (laveste døgndose i
 * preparatomtalen, allerede kontrollert i P7), så ingen ny dose er skrevet inn
 * her. Hver ny versjon bygger på nøyaktig versjonen i {@link Avslutningsforslag},
 * er ikke klinisk godkjent og må kontrolleres for nøyaktig versjonen og
 * fingeravtrykket (`docs/verktøy-k1-nedtrapping-kontrollgrunnlag.md`).
 */
import { NICE, RCPSYCH, steg, utsagn } from './bygg'
import type { Avklaring, Fase, Forlop, Grunnlag, Kildehenvisning, Parameter, Regel, Utsagn, Vurderingspunkt } from './modell'

export const K1_DATO = '2026-11-03'

/** En regel som får en ny versjon med avslutning: versjonen den bygger på, og eventuelle nye startdoser i det kliniske omfanget. */
export interface Avslutningsforslag {
  regel: string
  /** Versjonen den nye bygger på; er regelen endret siden, stopper byggingen i stedet for å bygge på noe som ikke er vurdert. */
  fra_versjon: number
  /** Startdoser ved kort behandlingstid som legges til i det kliniske omfanget, per FEST-legemiddelform. */
  nye_startdoser?: Record<string, number[]>
  /**
   * Den forventede planen for hvert regneeksempel med plan i versjonen det
   * bygger på, regnet ut for hånd med avslutningen; et eksempel uten ny
   * forventning stopper byggingen, så ingen forventning arves ukontrollert.
   */
  eksempler: Record<string, string[]>
  /** Nye regneeksempler, med inndata fra eksempelet `som` og en annen startdose. */
  nye_eksempler?: { id: string; beskrivelse: string; som: string; startdose_mg: number; forventet: string[] }[]
}

/** Første del av en plan som er lik i flere eksempler: tolv reduksjoner med 25 % per trinn og 28 dager, fra 50 mg (amitriptylin og nortriptylin). */
const FRA_50_MG = ['dag 1–28: 37,5 mg', 'dag 29–56: 28,13 mg', 'dag 57–84: 21,1 mg', 'dag 85–112: 15,83 mg', 'dag 113–140: 11,87 mg', 'dag 141–168: 8,9 mg', 'dag 169–196: 6,68 mg', 'dag 197–224: 5,01 mg', 'dag 225–252: 3,76 mg', 'dag 253–280: 2,82 mg', 'dag 281–308: 2,12 mg', 'dag 309–336: 1,59 mg', 'fra dag 337: seponert']

/** Reglene i K1, i den rekkefølgen kontrollgrunnlaget viser dem. */
export const K1_AVSLUTNINGER: readonly Avslutningsforslag[] = [
  {
    regel: 'seponering-escitalopram',
    fra_versjon: 12,
    eksempler: {
      // 25 % per trinn fra 20 mg: tolv reduksjoner til 0,64 mg, under 5 mg, så 0,64 mg holdes ett trinn og seponeres.
      'fra-20-mg': ['dag 1–28: 15 mg', 'dag 29–56: 11,25 mg', 'dag 57–84: 8,44 mg', 'dag 85–112: 6,33 mg', 'dag 113–140: 4,75 mg', 'dag 141–168: 3,56 mg', 'dag 169–196: 2,67 mg', 'dag 197–224: 2 mg', 'dag 225–252: 1,5 mg', 'dag 253–280: 1,13 mg', 'dag 281–308: 0,85 mg', 'dag 309–336: 0,64 mg', 'fra dag 337: seponert'],
      // 10 % per trinn fra 10 mg: 10 · 0,9^12 = 2,82 mg, under 5 mg.
      'fra-10-mg-lang': ['dag 1–28: 9 mg', 'dag 29–56: 8,1 mg', 'dag 57–84: 7,29 mg', 'dag 85–112: 6,56 mg', 'dag 113–140: 5,9 mg', 'dag 141–168: 5,31 mg', 'dag 169–196: 4,78 mg', 'dag 197–224: 4,3 mg', 'dag 225–252: 3,87 mg', 'dag 253–280: 3,48 mg', 'dag 281–308: 3,13 mg', 'dag 309–336: 2,82 mg', 'fra dag 337: seponert'],
    },
    nye_eksempler: [
      {
        // 10 % per trinn fra 20 mg: 20 · 0,9^12 = 5,65 mg, over 5 mg, så planen er en delplan ved horisonten.
        id: 'fra-20-mg-lang-delplan',
        beskrivelse: 'Fra 20 mg etter lang behandlingstid med 10 % per trinn: etter tolv reduksjoner er dosen 5,65 mg, over 5 mg, så planen seponerer ikke og stopper ved horisonten.',
        som: 'fra-10-mg-lang',
        startdose_mg: 20,
        forventet: ['dag 1–28: 18 mg', 'dag 29–56: 16,2 mg', 'dag 57–84: 14,58 mg', 'dag 85–112: 13,12 mg', 'dag 113–140: 11,81 mg', 'dag 141–168: 10,63 mg', 'dag 169–196: 9,57 mg', 'dag 197–224: 8,61 mg', 'dag 225–252: 7,75 mg', 'dag 253–280: 6,98 mg', 'dag 281–308: 6,28 mg', 'fra dag 309: 5,65 mg', 'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt'],
      },
    ],
  },
  {
    regel: 'seponering-nortriptylin',
    fra_versjon: 12,
    eksempler: {
      'fra-50-mg': FRA_50_MG,
      // 25 % per trinn fra 15 mg: 15 · 0,75^12 = 0,48 mg.
      'fra-15-mg': ['dag 1–28: 11,25 mg', 'dag 29–56: 8,44 mg', 'dag 57–84: 6,33 mg', 'dag 85–112: 4,75 mg', 'dag 113–140: 3,56 mg', 'dag 141–168: 2,67 mg', 'dag 169–196: 2 mg', 'dag 197–224: 1,5 mg', 'dag 225–252: 1,13 mg', 'dag 253–280: 0,85 mg', 'dag 281–308: 0,64 mg', 'dag 309–336: 0,48 mg', 'fra dag 337: seponert'],
    },
  },
  { regel: 'seponering-amitriptylin', fra_versjon: 12, eksempler: { 'fra-50-mg': FRA_50_MG } },
]

const tall = (x: number) => String(x).replace('.', ',')

/** Det gamle utsagnet om at planen aldri går til null, som en avslutning erstatter. */
const UTEN_NULL = /går ikke til null/

const vurdering = (begrunnelse: string, henvisninger: Kildehenvisning[], avklaring: Avklaring | null = null): Grunnlag => ({ type: 'ousfar_vurdering', begrunnelse, henvisninger, avklaring })

/**
 * Peders valg i K1-tråden 03.11.2026 av hvor seponeringen kan planlegges fra
 * (beslutningskortet «Fra hvilken dose skal verktøyet kunne planlegge selve
 * seponeringen?», alternativ A). Det avklarer bare grensen; resten av
 * avslutningen og vurderingspunktene er åpne forslag til uavhengig kontroll,
 * og ingenting er klinisk godkjent.
 */
export const PEDERS_GRENSE = (regelversjon: number): Avklaring => ({
  dato: K1_DATO,
  av: 'Peder (faglig beslutningstaker)',
  rolle: 'faglig_beslutningstaker',
  regelversjon,
  merknad: 'Valgt i K1 03.11.2026: seponering kan planlegges fra laveste døgndose preparatomtalen oppgir for voksne, eller lavere. Ikke en klinisk godkjenning; regelen skal fortsatt kontrolleres uavhengig.',
})

function nedtrappingsfase(r: Regel): Extract<Fase, { type: 'nedtrapping' }> & { strategi: { type: 'prosent_av_aktuell'; lav_grense_mg: Parameter } } {
  const f = r.plan.forlop[0]?.faser.at(-1)
  if (f?.type !== 'nedtrapping' || f.strategi.type !== 'prosent_av_aktuell' || !f.strategi.lav_grense_mg || f.avslutning !== 'individuell')
    throw new Error(`${r.id}: avslutning krever en prosentvis nedtrapping med laveste døgndose og individuell avslutning som siste fase.`)
  return f as ReturnType<typeof nedtrappingsfase>
}

/** Teksten om avslutningen, skrevet ut fra verdiene så den aldri kan avvike fra dem. */
export const avslutningstekst = (navn: string, mg: number) =>
  `Stopper nedtrappingen på ${tall(mg)} mg eller lavere (laveste døgndose preparatomtalen oppgir for voksne), fordi neste trinn ikke kan gis med norske preparater innenfor valgområdet eller planhorisonten er nådd, gis siste dose et helt trinn, og ${navn} seponeres deretter, først når forskriveren ved vurderingen har funnet at dosen er tolerert uten plagsomme seponeringssymptomer. Stopper den over ${tall(mg)} mg, er planen en delplan: pasienten fortsetter med dosen til forskriveren har vurdert videre nedtrapping. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.`

/** Ny versjon av regelen med avslutning; regelen må være nøyaktig versjonen forslaget bygger på. */
export function medAvslutning(r: Regel, a: Avslutningsforslag): Regel {
  if (r.id !== a.regel) throw new Error(`Forslaget gjelder ${a.regel}, ikke ${r.id}.`)
  if (r.versjon !== a.fra_versjon) throw new Error(`${r.id} er versjon ${r.versjon}, men avslutningen bygger på versjon ${a.fra_versjon}; vurder endringen og oppdater forslaget.`)
  const fase = nedtrappingsfase(r)
  const lav = fase.strategi.lav_grense_mg
  const mg = lav.verdi!
  const navn = r.tittel.replace(/^Seponering av /, '').replace(/,.*$/, '')
  const dosekilde = lav.grunnlag.type === 'ousfar_vurdering' || lav.grunnlag.type === 'kilde' ? (lav.grunnlag.henvisninger ?? []) : []
  const versjon = r.versjon + 1
  const trinn = fase.trinnlengde.verdi!

  const fra_hoyst_mg: Parameter = {
    verdi: mg,
    enhet: 'mg',
    art: 'bindende_krav',
    grunnlag: vurdering(
      `Seponering planlegges bare fra ${tall(mg)} mg eller lavere, laveste døgndose preparatomtalen oppgir for voksne. NICE beskriver nedtrapping trinnvis til null, og RCPsych at noen trenger svært lave doser før de slutter, og at seponeringssymptomer kan komme uansett hvor lav dosen er. Ingen kilde angir en bestemt dose som er lav nok; grensen er valgt av Peder som faglig beslutningstaker og skal kontrolleres uavhengig.`,
      [...dosekilde, NICE.andel, RCPSYCH.lavDose, RCPSYCH.heltSlutt],
      PEDERS_GRENSE(versjon),
    ),
  }
  const nyFase: Fase = {
    ...fase,
    avslutning: {
      type: 'seponering',
      fra_hoyst_mg,
      grunnlag: vurdering(avslutningstekst(navn, mg), [NICE.andel, NICE.tempo, RCPSYCH.eksempel1, RCPSYCH.heltSlutt]),
    },
  }
  const vurderinger: Vurderingspunkt[] = [
    {
      id: 'for_hver_reduksjon',
      nar: { type: 'for_hvert_trinn' },
      tekst: 'Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.',
      ved_funn: 'Ved mer uttalte symptomer: gå tilbake til siste tolererte dose og fortsett senere med mindre trinn. Ny plan beregnes fra dosen pasienten da bruker.',
      grunnlag: { type: 'kilde', henvisninger: [NICE.tempo, NICE.alvorlig, RCPSYCH.smaa] },
    },
    {
      id: 'etter_seponering',
      nar: {
        type: 'etter_seponering',
        dager: { verdi: trinn, enhet: 'dager', art: 'veiledende_preferanse', grunnlag: vurdering(`Samme minstetid som et trinn (${trinn} dager).`, [RCPSYCH.tid]) },
      },
      tekst: `Vurder seponeringssymptomer og tegn på tilbakefall ${trinn} dager etter siste dose.`,
      ved_funn: 'Seponeringssymptomer kan komme selv etter svært lave doser. Ved plagsomme symptomer kan legemidlet startes igjen i lav dose en tid før en ny og langsommere nedtrapping; ved tilbakefall vurderes behandlingen på nytt.',
      grunnlag: vurdering(
        `Oppfølgingen etter siste dose har samme minstetid som et trinn (${trinn} dager), så pasienten vurderes like lenge etter seponeringen som etter hver reduksjon. Tiden er OUSFARs valg; kildene angir ingen bestemt oppfølgingstid etter seponering.`,
        [RCPSYCH.heltSlutt, NICE.alvorlig],
      ),
    },
  ]
  const forlop: Forlop = { ...r.plan.forlop[0]!, faser: [...r.plan.forlop[0]!.faser.slice(0, -1), nyFase], vurderinger }

  const bytt = (u: Utsagn): Utsagn =>
    UTEN_NULL.test(u.tekst) ? { ...u, tekst: u.tekst.replace(/(?:Planen viser høyst \d+ reduksjoner \(en teknisk planhorisont\) og går ikke til null[^.]*\.|Planen går ikke til null[^]*$)/, avslutningstekst(navn, mg)) } : u
  const eksempler = [
    ...r.eksempler.map((e) => {
      if (e.stopp || !e.forventet.fra) return e
      const fra = a.eksempler[e.id]
      if (!fra) throw new Error(`${r.id}: regneeksempelet ${e.id} mangler forventet plan med avslutning.`)
      return { ...e, forventet: { ...e.forventet, fra } }
    }),
    ...(a.nye_eksempler ?? []).map((n) => {
      const som = r.eksempler.find((e) => e.id === n.som)
      if (!som) throw new Error(`${r.id}: regneeksempelet ${n.som} finnes ikke.`)
      return { ...som, id: n.id, beskrivelse: n.beskrivelse, inndata: { ...som.inndata, startdose_mg: n.startdose_mg }, forventet: { fra: n.forventet } }
    }),
  ]
  const ukjente = Object.keys(a.eksempler).filter((id) => !r.eksempler.some((e) => e.id === id))
  if (ukjente.length > 0) throw new Error(`${r.id}: forventet plan for ukjente regneeksempler: ${ukjente.join(', ')}`)
  const merknad = `Ny versjon i K1 (${K1_DATO}): avslutning med seponering fra ${tall(mg)} mg eller lavere etter en eksplisitt vurdering, og vurderingspunkter før hver reduksjon og etter siste dose. Ellers uendret fra versjon ${r.versjon}.`
  return {
    ...r,
    versjon,
    plan: { ...r.plan, forlop: [forlop, ...r.plan.forlop.slice(1)] },
    eksempler,
    fortolkning: {
      ...r.fortolkning,
      kildetro: [
        ...r.fortolkning.kildetro,
        utsagn('Nedtrappingen går trinnvis helt til null; noen trenger svært lave doser før de slutter, og seponeringssymptomer kan komme når legemidlet stoppes, uansett hvor lav dosen er.', NICE.andel, RCPSYCH.lavDose, RCPSYCH.heltSlutt),
      ],
      tilpasninger: r.fortolkning.tilpasninger.map(bytt),
      usikkerhet: [
        ...r.fortolkning.usikkerhet.filter((x) => !/^Ingen fast nedre grense/.test(x)),
        `Grensen for når seponering kan planlegges (${tall(mg)} mg, laveste døgndose i preparatomtalen) er ikke en dokumentert terskel: RCPsych viser eksempler som går mye lavere med flytende form før seponering. Når planen stopper over grensen, er den en delplan.`,
      ],
    },
    ...(a.nye_startdoser && r.klinisk_omfang && { klinisk_omfang: utvidOmfang(r, a.nye_startdoser) }),
    godkjenning: {
      status: 'til_faglig_kontroll',
      historikk: [...r.godkjenning.historikk, steg('utkast', versjon, merknad, K1_DATO), steg('til_faglig_kontroll', versjon, 'Sendt til uavhengig faglig kontroll (K1). Ikke klinisk godkjent.', K1_DATO)],
    },
  }
}

/** Det kliniske omfanget med nye startdoser ved kort behandlingstid (tilfellene uten ja-svar). */
function utvidOmfang(r: Regel, nye: Record<string, number[]>): NonNullable<Regel['klinisk_omfang']> {
  const o = r.klinisk_omfang!
  return {
    ...o,
    tilfeller: o.tilfeller.map((t) =>
      t.legemiddelform && nye[t.legemiddelform] && Object.keys(t.svar).length === 0 ? { ...t, startdoser: [...new Set([...t.startdoser, ...nye[t.legemiddelform]!])].sort((x, y) => x - y) } : t,
    ),
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
