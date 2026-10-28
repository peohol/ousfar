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
import { elementtekst, preparatliste, type Doseplanresultat, type Praktiskforlop } from './motor/plan'
import { KARTLEGGING } from './register'
import { avrund, injeksjonstidspunkt } from './regler/beregning'
import { fingeravtrykk } from './regler/godkjenning'
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

/** Periodene i alle forløpene slått sammen til felles dager, og injeksjonene som egne rader, i dagenes rekkefølge. */
function rader(forlop: Praktiskforlop[], startdato: string | undefined): Planrad[] {
  const grenser = new Set<number>()
  for (const f of forlop) {
    for (const p of f.perioder) {
      grenser.add(p.fra)
      if (p.til !== null) grenser.add(p.til + 1)
    }
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
        const avvik = Math.abs(p.avvik_prosent) > 1e-7 ? `ideelt ${mg(p.ideell_mg)} (${p.avvik_prosent > 0 ? '+' : ''}${String(avrund(p.avvik_prosent)).replace('.', ',')} %)` : undefined
        return { dose: mg(p.mg), elementer: p.elementer.map(elementtekst), ...(avvik && { avvik }) }
      }
      return f.perioder.length > 0 && f.siste_dosedag !== null && fra === f.siste_dosedag + 1 ? { dose: 'Seponert', elementer: [] } : null
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

/** Visningen av en klinisk doseplan; `null` for alt som ikke er en klinisk plan. */
export function planvisning(r: Doseplanresultat, regel: Regel, startdato?: string): Planvisning | null {
  if (r.status !== 'doseplan' || !r.klinisk || r.sperre.length > 0 || r.regel.id !== regel.id || r.regel.fingeravtrykk !== fingeravtrykk(regel)) return null
  const kolonner = r.forlop.map((f) => ({ navn: virkestoffnavn(f.virkestoff), administrasjon: ADMINISTRASJON[f.administrasjon] }))
  return {
    tittel: regel.tittel,
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
    '',
    ...linjer,
    ...PLANDELER.flatMap((d) => punkter(d.tittel, v[d.felt])),
    ...punkter('Kilder', v.kilder.map((k) => `${k.tittel} (${k.utgiver}, ${k.versjon}): ${k.url}${k.steder.length > 0 ? ` – ${k.steder.join('; ')}` : ''}`)),
    ...punkter('Versjoner', v.versjoner),
  ].join('\n')
}
