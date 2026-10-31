/**
 * En klinisk doseplan gjort klar til visning, kopiering og utskrift (P6.7 i
 * `docs/verktøy-utviklingsplan.md`): en dag- og datotabell med døgndosen for
 * hvert virkestoff, preparatstyrkene og antallet med deling, depotinjeksjonene
 * som egne hendelser, og det planen bygger på — advarsler, antakelser, avvik,
 * kontroller, preparater, kildehenvisninger og versjonene. Skjermen og teksten
 * som kopieres, bygger på det samme, så de sier det samme.
 *
 * Bare en klinisk plan kan vises ({@link planvisning} gir `null` for alt
 * annet). Kildene står som henvisninger med lenke; Psychiatrienet bare som
 * kildeoppføringen, aldri med innhold.
 */
import { norskDato } from './motor/byggesteiner'
import { elementtekst, EN_REDUKSJON_KORT, fordelingSuffiks, preparatliste, type Doseplanresultat, type Praktiskforlop } from './motor/plan'
import { KARTLEGGING } from './register'
import { avrund, hverTekst, injeksjonstidspunkt, valgtTekst } from './regler/beregning'
import { erKliniskGodkjent, fingeravtrykk } from './regler/godkjenning'
import { kildeFor } from './regler/kilder'
import { henvisninger, type Regel } from './regler/modell'

export interface Dosecelle {
  /** «15 mg», eller «Seponert» første dag uten dose. */
  dose: string
  /** «1½ tablett à 10 mg» per styrke. */
  elementer: string[]
  /** «ideelt 12,5 mg (+20 %)» når dosen avviker fra regelens kurve. */
  avvik?: string
}

export type Planrad =
  | { type: 'periode'; dager: string; datoer?: string; celler: (Dosecelle | null)[] }
  | { type: 'injeksjon'; dager: string; datoer?: string; kolonne: number; dose: string; element: string; detalj?: string }

export interface Plankilde {
  tittel: string
  utgiver: string
  url: string
  versjon: string
  /** Hvor i kilden, eller kildeoppføringene for Psychiatrienet. */
  steder: string[]
}

export interface Planvisning {
  tittel: string
  /** Hva planen er når den ikke er en fullstendig nedtrapping, rett under tittelen; ellers `null`. */
  undertittel: string | null
  kolonner: { navn: string; administrasjon: string }[]
  rader: Planrad[]
  advarsler: string[]
  antakelser: string[]
  usikkerhet: string[]
  avvik: string[]
  kontroller: string[]
  preparater: string[]
  kilder: Plankilde[]
  versjoner: string[]
}

const mg = (x: number) => `${String(avrund(x)).replace('.', ',')} mg`

const ADMINISTRASJON: Record<Praktiskforlop['administrasjon'], string> = { peroral: 'peroralt', depotinjeksjon: 'depotinjeksjon' }

const virkestoffnavn = (nokkel: string) => KARTLEGGING.virkestoffer.find((v) => v.nokkel === nokkel)?.navn ?? nokkel

/** Datoen for planens dag `dag` når dag 1 er `startdato`. */
function dato(startdato: string, dag: number): string {
  const d = new Date(`${startdato}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + dag - 1)
  return norskDato(d.toISOString().slice(0, 10))
}

const dagtekst = (fra: number, til: number | null) => (til === null ? `Fra dag ${fra}` : til === fra ? `Dag ${fra}` : `Dag ${fra}–${til}`)

function datotekst(startdato: string | undefined, fra: number, til: number | null): string | undefined {
  if (!startdato) return undefined
  if (til === null) return `fra ${dato(startdato, fra)}`
  return til === fra ? dato(startdato, fra) : `${dato(startdato, fra)}–${dato(startdato, til)}`
}

/**
 * Dagen et peroralt legemiddel er seponert fra, også når det seponeres før
 * første dag i planen (bytte til depot, P11.4): da står seponeringen i
 * tabellen, så planen aldri kan leses som om det perorale skal fortsette.
 * Et forløp med bare injeksjoner har ingen seponeringsdag.
 */
const seponeringsdag = (f: Praktiskforlop): number | null =>
  f.siste_dosedag !== null && (f.perioder.length > 0 || f.administrasjon === 'peroral') ? f.siste_dosedag + 1 : null

/** Periodene i alle forløpene slått sammen til felles dager, og injeksjonene som egne rader, i dagenes rekkefølge. */
function rader(forlop: Praktiskforlop[], startdato: string | undefined): Planrad[] {
  const grenser = new Set<number>()
  for (const f of forlop) {
    for (const p of f.perioder) {
      grenser.add(p.fra)
      if (p.til !== null) grenser.add(p.til + 1)
    }
    const s = seponeringsdag(f)
    if (s !== null) grenser.add(s)
  }
  const starter = [...grenser].sort((a, b) => a - b)
  const apen = forlop.some((f) => f.perioder.some((p) => p.til === null))
  const ut: { dag: number; rad: Planrad }[] = []
  for (const [i, fra] of starter.entries()) {
    const neste = starter[i + 1]
    const til = neste !== undefined ? neste - 1 : apen ? null : fra
    const celler = forlop.map((f): Dosecelle | null => {
      const p = f.perioder.find((x) => x.fra <= fra && (x.til === null || x.til >= fra))
      if (p) {
        const avvik = [Math.abs(p.avvik_prosent) > 1e-7 && `ideelt ${mg(p.ideell_mg)} (${p.avvik_prosent > 0 ? '+' : ''}${String(avrund(p.avvik_prosent)).replace('.', ',')} %)`, valgtTekst(p)].filter(Boolean).join('; ')
        return { dose: `${mg(p.mg)}${p.hver ? ` ${hverTekst(p.hver)}` : ''}${fordelingSuffiks(p)}`, elementer: p.elementer.map(elementtekst), ...(avvik && { avvik }) }
      }
      return fra === seponeringsdag(f) ? { dose: 'Seponert', elementer: [] } : null
    })
    // Etter siste periode står bare dagen legemidlene er seponert.
    const sisteDag = neste === undefined && !apen
    ut.push({ dag: fra, rad: { type: 'periode', dager: sisteDag ? `Fra dag ${fra}` : dagtekst(fra, til), datoer: sisteDag ? datotekst(startdato, fra, null) : datotekst(startdato, fra, til), celler } })
  }
  for (const [kolonne, f] of forlop.entries()) {
    for (const inj of f.injeksjoner) {
      const forste = inj.vedlikehold?.forste_dato ?? inj.dato
      const detalj = [inj.vindu_dager && `±${inj.vindu_dager} dager`, inj.sted, inj.vedlikehold?.tidligst_dager && `tidligst ${inj.vedlikehold.tidligst_dager} dager etter forrige`].filter(Boolean).join(', ')
      const tidspunkt = injeksjonstidspunkt(inj)
      ut.push({
        dag: inj.dag ?? Infinity,
        rad: {
          type: 'injeksjon',
          dager: tidspunkt.charAt(0).toUpperCase() + tidspunkt.slice(1),
          ...(forste && { datoer: `${inj.vedlikehold ? 'første ' : ''}${norskDato(forste)}` }),
          kolonne,
          dose: mg(inj.mg),
          element: elementtekst(inj.element),
          ...(detalj && { detalj }),
        },
      })
    }
  }
  // Stabil sortering: en injeksjon står etter perioden som starter samme dag.
  return ut.sort((a, b) => a.dag - b.dag).map((x) => x.rad)
}

/**
 * Hvem som har godkjent regelen klinisk, når, for hvilken versjon og med
 * hvilken avgrensning (kontrollørens merknad); null når regelen ikke er gyldig
 * klinisk godkjent.
 */
export function godkjenningstekst(regel: Regel): string | null {
  const sist = regel.godkjenning.historikk.at(-1)
  if (!sist || !erKliniskGodkjent(regel)) return null
  return `Klinisk godkjent ${norskDato(sist.dato)} av ${sist.av}, regelversjon ${sist.regelversjon}. ${sist.merknad}`
}

/** Kildene regelen henviser til, med stedene i hver; Psychiatrienet bare med kildeoppføringen. */
export function kildeliste(regel: Regel): Plankilde[] {
  const per = new Map<string, Set<string>>()
  for (const h of henvisninger([regel.referanser, regel.fortolkning])) {
    const steder = per.get(h.kilde) ?? new Set<string>()
    steder.add('kildeoppforing' in h && h.kildeoppforing ? `kildeoppføring ${h.kildeoppforing}` : (h as { sted: string }).sted)
    per.set(h.kilde, steder)
  }
  return [...per].flatMap(([id, steder]) => {
    const k = kildeFor(id)
    return k ? [{ tittel: k.tittel, utgiver: k.utgiver, url: k.url, versjon: k.versjon, steder: [...steder].sort() }] : []
  })
}

/**
 * Undertittelen til en plan med bare én reduksjon: regeltittelen sier hva
 * regelen kan, ikke hva planen er (kontrollørens gjennomgang av 5699ce6, P7.5).
 */
export const EN_FORSTE_REDUKSJON = 'Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.'

/**
 * Undertittelen til en plan som stopper før forløpet er avsluttet (et
 * startforløp, som kryssnedtrappingen fra sertralin): planen viser starten,
 * og resten vurderes individuelt (pilotgjennomgangen P11.4).
 */
export const STARTFORLOP = 'Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.'

/** Undertittelen som sier at planen ikke er fullstendig; `null` når alle forløpene er beregnet til ende. */
const undertittelFor = (forlop: readonly Praktiskforlop[]) =>
  forlop.some((f) => f.avslutning_kort === EN_REDUKSJON_KORT) ? EN_FORSTE_REDUKSJON : forlop.some((f) => f.avslutning_kort) ? STARTFORLOP : null

/** Visningen av en klinisk doseplan; `null` for alt som ikke er en klinisk plan. */
export function planvisning(r: Doseplanresultat, regel: Regel, startdato?: string): Planvisning | null {
  if (r.status !== 'doseplan' || !r.klinisk || r.sperre.length > 0 || r.regel.id !== regel.id || r.regel.fingeravtrykk !== fingeravtrykk(regel)) return null
  const kolonner = r.forlop.map((f) => ({ navn: virkestoffnavn(f.virkestoff), administrasjon: ADMINISTRASJON[f.administrasjon] }))
  return {
    tittel: regel.tittel,
    undertittel: undertittelFor(r.forlop),
    kolonner,
    rader: rader(r.forlop, startdato),
    advarsler: [...r.forbehold, ...r.merknader, ...r.forlop.flatMap((f, i) => f.begrensninger.map((b) => `${kolonner[i]!.navn}: ${b}`))],
    antakelser: regel.fortolkning.forutsetninger,
    usikkerhet: regel.fortolkning.usikkerhet,
    avvik: r.avvik,
    kontroller: r.kontroller.map((k) => `${k.krav.replace(/[.:]$/, '')}: ${k.oppfylt ? 'oppfylt' : 'ikke oppfylt'} (${k.detalj})`),
    preparater: preparatliste(r),
    kilder: kildeliste(regel),
    versjoner: [
      `Regel ${r.regel.id}, versjon ${r.regel.versjon}, fingeravtrykk ${r.regel.fingeravtrykk.slice(0, 12)}`,
      ...(r.regelsett ? [`Regelsett ${r.regelsett.id}, versjon ${r.regelsett.versjon}`] : []),
      `Regelmodell ${r.modell}, beregningsmotor ${r.motor}, doseplanmotor ${r.planmotor}`,
      `FEST-uttrekk ${r.fest.kildedato ?? 'ukjent'}, kontrollert ${r.fest.kontrollert_kl ?? 'ukjent'}, preparatstatus per ${norskDato(r.fest.statusdato)}`,
      ...(r.preparatgrunnlag ? [`Preparatgrunnlag ${r.preparatgrunnlag.slice(0, 12)}`] : []),
    ],
  }
}

/**
 * Listene under tabellen, i rekkefølgen de står i. Skjermen og teksten som
 * kopieres, bruker den samme lista, så kopien har alt skjermen har. Kildene
 * og versjonene står etter dem.
 */
export const PLANDELER = [
  { tittel: 'Advarsler', felt: 'advarsler', tone: 'advarsel' },
  { tittel: 'Avvik fra regelens kurve', felt: 'avvik' },
  { tittel: 'Antakelser', felt: 'antakelser' },
  { tittel: 'Usikkerhet', felt: 'usikkerhet' },
  { tittel: 'Preparater planen bygger på', felt: 'preparater' },
  { tittel: 'Kontroller', felt: 'kontroller' },
] as const satisfies readonly { tittel: string; felt: keyof Planvisning; tone?: 'advarsel' | 'spor' }[]

const punkter = (overskrift: string, linjer: readonly string[]) => (linjer.length > 0 ? [``, `${overskrift}:`, ...linjer.map((l) => `- ${l}`)] : [])

/** Planen som ren tekst, til utklippstavlen: det samme som står på skjermen. */
export function planTekst(v: Planvisning, overskrift: string): string {
  // Navnet med administrasjonsformen, som kolonnene på skjermen: samme virkestoff kan stå både peroralt og som depot.
  const kolonne = (i: number) => `${v.kolonner[i]!.navn} ${v.kolonner[i]!.administrasjon}`
  const celle = (c: Dosecelle | null, i: number) =>
    c && `${kolonne(i)}: ${c.dose}${c.elementer.length > 0 ? ` = ${c.elementer.join(' + ')}` : ''}${c.avvik ? ` (${c.avvik})` : ''}`
  const linjer = v.rader.map((r) => {
    const naar = `${r.dager}${r.datoer ? ` (${r.datoer})` : ''}`
    if (r.type === 'injeksjon') return `${naar}: ${kolonne(r.kolonne)} ${r.dose} = ${r.element}${r.detalj ? ` (${r.detalj})` : ''}`
    return `${naar}: ${r.celler.map(celle).filter(Boolean).join('; ') || 'ingen dose'}`
  })
  return [
    overskrift,
    v.tittel,
    ...(v.undertittel ? [v.undertittel] : []),
    '',
    ...linjer,
    ...PLANDELER.flatMap((d) => punkter(d.tittel, v[d.felt])),
    ...punkter('Kilder', v.kilder.map((k) => `${k.tittel} (${k.utgiver}, ${k.versjon}): ${k.url}${k.steder.length > 0 ? ` – ${k.steder.join('; ')}` : ''}`)),
    ...punkter('Versjoner', v.versjoner),
  ].join('\n')
}
