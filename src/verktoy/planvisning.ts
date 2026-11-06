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
import { norskDato, type Doseenhet } from './motor/byggesteiner'
import { elementtekst, EN_REDUKSJON_KORT, fordelingSuffiks, preparatliste, seponeringsdag, sluttmalMangler, type Doseplanresultat, type Praktiskforlop } from './motor/plan'
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
  /** Doseenheten for hvert element i `elementer` (tablett, dråpe …), til symbolene i tidslinjen; `null` når elementet ikke er én enhet. */
  enheter?: (Doseenhet | null)[]
  /** «ideelt 12,5 mg (+20 %)» når dosen avviker fra regelens kurve. */
  avvik?: string
}

export type Planrad =
  | { type: 'periode'; dager: string; datoer?: string; celler: (Dosecelle | null)[] }
  /** Et vurderingspunkt i forløpet i kolonnen (regelmodell 12). */
  | { type: 'vurdering'; dager: string; datoer?: string; kolonne: number; tekst: string }
  | { type: 'injeksjon'; dager: string; datoer?: string; kolonne: number; dose: string; element: string; enhet: Doseenhet; detalj?: string }

export interface Plankilde {
  tittel: string
  utgiver: string
  url: string
  versjon: string
  /** Hvor i kilden, eller kildeoppføringene for Psychiatrienet. */
  steder: string[]
}

/**
 * Hva planen dekker (leveranseplanen §3): en komplett plan har hvert forløp
 * beregnet til et definert sluttmål (seponert, fast vedlikehold eller uendret
 * dose); en delplan sier hva den ikke dekker. Planer uten et klinisk
 * resultat vises ikke i det hele tatt ({@link planvisning} gir `null`).
 */
export interface Planutfall {
  komplett: boolean
  /** «Komplett plan til sluttmålet» eller «Delplan», med sluttmålet eller hva som mangler. */
  tekst: string
  /** Sluttmålet for hvert forløp som er beregnet til ende. */
  sluttmal: string[]
  /** Hva planen ikke dekker, per forløp; tom for en komplett plan. */
  mangler: string[]
}

export interface Planvisning {
  tittel: string
  /** Om planen er komplett eller en delplan, øverst i planen og i kopien. */
  utfall: Planutfall
  /** Vurderings- og kontrollpunktene i klartekst, med tidspunkt og hva som gjøres ved funn. */
  vurderinger: string[]
  /** Hva planen er når den ikke er en fullstendig nedtrapping, rett under tittelen; ellers `null`. */
  undertittel: string | null
  kolonner: { navn: string; administrasjon: string }[]
  rader: Planrad[]
  /** Alt som står under «Advarsler» i kopien: de generelle forbeholdene først, så det som gjelder denne planen. */
  advarsler: string[]
  /** De generelle forbeholdene, som står for hver plan; siden viser dem for seg, foran det som gjelder akkurat denne planen. */
  forbehold: string[]
  /** Hvem som har godkjent regelen, når og for hvilken versjon ({@link godkjenningstekst}). */
  godkjenning: string | null
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

/** Hva cellen sier dagen legemidlet er seponert: et depot som stoppes, får ingen flere injeksjoner. */
const seponert = (f: Praktiskforlop): Dosecelle =>
  f.administrasjon === 'depotinjeksjon' && f.perioder.length === 0 ? { dose: 'Seponert', elementer: ['ingen flere injeksjoner'] } : { dose: 'Seponert', elementer: [] }

/** Periodene i alle forløpene slått sammen til felles dager, og injeksjonene som egne rader, i dagenes rekkefølge. */
function rader(forlop: Praktiskforlop[], startdato: string | undefined, vurderinger: readonly Vurdering[] = []): Planrad[] {
  const grenser = new Set<number>()
  for (const f of forlop) {
    for (const p of f.perioder) {
      grenser.add(p.fra)
      if (p.til !== null) grenser.add(p.til + 1)
    }
    const s = seponeringsdag(f)
    if (s !== null) grenser.add(s)
    // Et legemiddel som fortsetter uendret, står fra sin første dag, også før de andre forløpene har perioder.
    if (f.uendret_mg !== undefined) grenser.add(f.start)
  }
  const starter = [...grenser].sort((a, b) => a - b)
  const apen = forlop.some((f) => f.perioder.some((p) => p.til === null) || f.uendret_mg !== undefined)
  const ut: { dag: number; rad: Planrad }[] = []
  for (const [i, fra] of starter.entries()) {
    const neste = starter[i + 1]
    const til = neste !== undefined ? neste - 1 : apen ? null : fra
    const celler = forlop.map((f): Dosecelle | null => {
      const p = f.perioder.find((x) => x.fra <= fra && (x.til === null || x.til >= fra))
      if (p) {
        const avvik = [Math.abs(p.avvik_prosent) > 1e-7 && `ideelt ${mg(p.ideell_mg)} (${p.avvik_prosent > 0 ? '+' : ''}${String(avrund(p.avvik_prosent)).replace('.', ',')} %)`, valgtTekst(p)].filter(Boolean).join('; ')
        return {
          dose: `${mg(p.mg)}${p.hver ? ` ${hverTekst(p.hver)}` : ''}${fordelingSuffiks(p)}`,
          elementer: p.elementer.map(elementtekst),
          enheter: p.elementer.map((e) => e.doseenhet),
          ...(avvik && { avvik }),
        }
      }
      if (f.uendret_mg !== undefined && fra >= f.start) return uendretCelle(f)
      return fra === seponeringsdag(f) ? seponert(f) : null
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
          enhet: inj.element.doseenhet,
          ...(detalj && { detalj }),
        },
      })
    }
  }
  for (const v of vurderinger) {
    for (const d of v.dager) {
      // En vurdering før en endring står foran perioden som starter den dagen, en vurdering etter en endring etter den.
      ut.push({ dag: v.for ? d - 0.5 : d + 0.25, rad: { type: 'vurdering', dager: `Dag ${d}`, ...(startdato && { datoer: dato(startdato, d) }), kolonne: v.kolonne, tekst: v.for ? `Før endringen: ${v.tekst}` : v.tekst } })
    }
  }
  // Stabil sortering: en injeksjon står etter perioden som starter samme dag.
  return ut.sort((a, b) => a.dag - b.dag).map((x) => x.rad)
}

/** Hva planen sier om en uendret dose, etter om den er kontrollert mot regelens doser eller bare bekreftet av forskriveren. */
export const UENDRET = {
  kontrollert: 'uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke',
  bekreftet: 'uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke',
} as const

const tallord = (x: number) => String(avrund(x)).replace('.', ',')

/** Den uendrede dosen i regelens enhet, med mmol når tabletten har det: «168 mg Li⁺ (24 mmol)». */
export function uendretDose(f: Pick<Praktiskforlop, 'uendret_mg' | 'uendret_visning'>): string {
  const x = f.uendret_mg!
  const t = f.uendret_visning?.tablett
  const mmol = t?.mmol !== undefined ? ` (${tallord((x * t.mmol) / t.mg)} mmol)` : ''
  return `${tallord(x)} ${f.uendret_visning?.enhet ?? 'mg'}${mmol}`
}

/** Cellen for et legemiddel som fortsetter med uendret dose: dosen, tablettene den gis med og om den er kontrollert. */
function uendretCelle(f: Praktiskforlop): Dosecelle {
  const t = f.uendret_visning?.tablett
  const antall = t ? f.uendret_mg! / t.mg : 0
  const hel = Math.abs(antall - Math.round(antall)) < 1e-9 && Math.round(antall) > 0
  const tabletter = !t ? [] : hel ? [`${Math.round(antall)} ${Math.round(antall) === 1 ? 'tablett' : 'tabletter'} ${t.navn}`] : [`ikke et helt antall tabletter ${t.navn}`]
  return { dose: uendretDose(f), elementer: [[...tabletter, UENDRET[f.uendret_kontrollert ? 'kontrollert' : 'bekreftet']].join('; ')] }
}

/** Ett vurderingspunkt i en plan, med dagene det gjelder. */
interface Vurdering {
  kolonne: number
  tekst: string
  tidspunkt: string
  ved_funn?: string
  /** Står foran en endring (før hver doseendring). */
  for: boolean
  dager: number[]
}

/**
 * Dagene doseringen av forløpet endres: første dag med en annen dose enn
 * forløpet starter fra (oppstart eller første reduksjon), hver senere
 * doseendring, dagen legemidlet er seponert, og startinjeksjonene.
 */
export function endringsdager(f: Praktiskforlop): number[] {
  const dager = new Set<number>()
  for (const [i, p] of f.perioder.entries()) {
    const forrige = f.perioder[i - 1]
    const endret = forrige ? Math.abs(forrige.mg - p.mg) > 1e-9 || forrige.hver !== p.hver : Math.abs((f.utgangsdose_mg ?? 0) - p.mg) > 1e-9 || p.hver !== undefined
    if (endret) dager.add(p.fra)
  }
  const s = seponeringsdag(f)
  if (s !== null && f.perioder.length > 0) dager.add(s)
  for (const inj of f.injeksjoner) if (inj.dag !== null) dager.add(inj.dag)
  return [...dager].sort((a, b) => a - b)
}

const verdien = (p: { verdi: number | null }) => p.verdi ?? 0

/** Vurderingspunktene i regelens forløp, med dagene de gjelder i den praktiske planen. */
function vurderingerFor(regel: Regel, forlop: readonly Praktiskforlop[]): Vurdering[] {
  return forlop.flatMap((f, kolonne) => {
    const def = regel.plan.forlop.find((x) => x.id === f.id)
    const endringer = endringsdager(f)
    return (def?.vurderinger ?? []).map((v): Vurdering => {
      const felles = { kolonne, tekst: v.tekst, ...(v.ved_funn && { ved_funn: v.ved_funn }) }
      switch (v.nar.type) {
        case 'for_hvert_trinn':
          // Før hver endring etter den første dagen i forløpet; selve oppstarten er beslutningen om planen.
          return { ...felles, for: true, tidspunkt: 'før hver doseendring', dager: endringer.filter((d) => d > f.start) }
        case 'etter_endring': {
          const n = verdien(v.nar.dager)
          return { ...felles, for: false, tidspunkt: `${n} dager etter hver doseendring`, dager: [...new Set(endringer.map((d) => d + n))] }
        }
        case 'etter_seponering': {
          // Bare når planen faktisk seponerer forløpet; ellers står punktet uten dag.
          const n = verdien(v.nar.dager)
          const dager = seponeringsdag(f) !== null && f.siste_dosedag !== null ? [f.siste_dosedag + n] : []
          return { ...felles, for: false, tidspunkt: `${n} dager etter siste dose`, dager }
        }
        case 'dag': {
          const d = f.start + verdien(v.nar.dag) - 1
          return { ...felles, for: false, tidspunkt: `dag ${d}`, dager: [d] }
        }
      }
    })
  })
}

/** Linjen for et vurderingspunkt under «Vurderingspunkter». */
const vurderingslinje = (v: Vurdering, navn: string) =>
  `${navn}, ${v.tidspunkt}${v.dager.length > 0 && v.tidspunkt.startsWith('dag') === false ? ` (dag ${v.dager.join(', ')})` : ''}: ${v.tekst}${v.ved_funn ? ` Ved funn: ${v.ved_funn}` : ''}`

/** Sluttmålet for ett forløp, eller hva planen ikke dekker for det. */
function sluttFor(f: Praktiskforlop, navn: string): { sluttmal?: string; mangler?: string } {
  const ikke = sluttmalMangler(f)
  if (ikke) return { mangler: `${navn}: ${ikke}` }
  if (f.uendret_mg !== undefined) return { sluttmal: `${navn} fortsetter uendret på ${uendretDose(f)}` }
  const s = seponeringsdag(f)
  if (s !== null) return { sluttmal: `${navn} seponert fra dag ${s}` }
  const vedlikehold = f.injeksjoner.find((i) => i.vedlikehold)
  if (vedlikehold) return { sluttmal: `${navn} vedlikehold ${mg(vedlikehold.mg)} ${injeksjonstidspunkt(vedlikehold)}` }
  const sist = f.perioder.at(-1)
  return { sluttmal: `${navn} fortsetter på ${mg(sist!.mg)}${sist!.hver ? ` ${hverTekst(sist!.hver)}` : ''} fra dag ${sist!.fra}` }
}

/** Om planen er komplett eller en delplan ({@link Planutfall}). */
export function planutfall(forlop: readonly Praktiskforlop[], navn: (i: number) => string): Planutfall {
  const deler = forlop.map((f, i) => sluttFor(f, navn(i)))
  const sluttmal = deler.flatMap((d) => (d.sluttmal ? [d.sluttmal] : []))
  const mangler = deler.flatMap((d) => (d.mangler ? [d.mangler] : []))
  const komplett = mangler.length === 0
  return {
    komplett,
    tekst: komplett ? `${KOMPLETT}: ${sluttmal.join('; ')}.` : `${DELPLAN}: ${mangler.join('; ')}.`,
    sluttmal,
    mangler,
  }
}

/** Overskriften for en plan der hvert forløp er beregnet til et sluttmål. */
export const KOMPLETT = 'Komplett plan til sluttmålet'
/** Overskriften for en plan som ikke dekker hele forløpet. */
export const DELPLAN = 'Delplan, ikke en komplett plan. Ikke dekket'

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

/** Linjen under «Versjoner» som sier hvilken regelversjon planen er beregnet etter. */
export const regellinje = (r: Pick<Regel, 'id' | 'versjon'> & { fingeravtrykk: string }) => `Regel ${r.id}, versjon ${r.versjon}, fingeravtrykk ${r.fingeravtrykk.slice(0, 12)}`

/** Linjen under «Versjoner» som sier hvilket regelsett regelen hører til. */
export const settlinje = (s: { id: string; versjon: number }) => `Regelsett ${s.id}, versjon ${s.versjon}`

/** Én kilde under «Kilder» i teksten som kopieres. */
export const kildelinje = (k: Plankilde) => `${k.tittel} (${k.utgiver}, ${k.versjon}): ${k.url}${k.steder.length > 0 ? ` – ${k.steder.join('; ')}` : ''}`

/** Visningen av en klinisk doseplan; `null` for alt som ikke er en klinisk plan. */
export function planvisning(r: Doseplanresultat, regel: Regel, startdato?: string): Planvisning | null {
  if (r.status !== 'doseplan' || !r.klinisk || r.sperre.length > 0 || r.regel.id !== regel.id || r.regel.fingeravtrykk !== fingeravtrykk(regel)) return null
  const kolonner = r.forlop.map((f) => ({ navn: virkestoffnavn(f.virkestoff), administrasjon: ADMINISTRASJON[f.administrasjon] }))
  const vurderinger = vurderingerFor(regel, r.forlop)
  return {
    tittel: regel.tittel,
    undertittel: undertittelFor(r.forlop),
    utfall: planutfall(r.forlop, (i) => kolonner[i]!.navn),
    vurderinger: vurderinger.map((v) => vurderingslinje(v, kolonner[v.kolonne]!.navn)),
    kolonner,
    rader: rader(r.forlop, startdato, vurderinger),
    advarsler: [...r.forbehold, ...r.merknader, ...r.forlop.flatMap((f, i) => f.begrensninger.map((b) => `${kolonner[i]!.navn}: ${b}`))],
    forbehold: r.forbehold,
    godkjenning: godkjenningstekst(regel),
    antakelser: regel.fortolkning.forutsetninger,
    usikkerhet: regel.fortolkning.usikkerhet,
    avvik: r.avvik,
    kontroller: r.kontroller.map((k) => `${k.krav.replace(/[.:]$/, '')}: ${k.oppfylt ? 'oppfylt' : 'ikke oppfylt'} (${k.detalj})`),
    preparater: preparatliste(r),
    kilder: kildeliste(regel),
    versjoner: [
      regellinje(r.regel),
      ...(r.regelsett ? [settlinje(r.regelsett)] : []),
      `Regelmodell ${r.modell}, beregningsmotor ${r.motor}, doseplanmotor ${r.planmotor}`,
      `FEST-uttrekk ${r.fest.kildedato ?? 'ukjent'}, kontrollert ${r.fest.kontrollert_kl ?? 'ukjent'}, preparatstatus per ${norskDato(r.fest.statusdato)}`,
      ...(r.preparatgrunnlag ? [`Preparatgrunnlag ${r.preparatgrunnlag.slice(0, 12)}`] : []),
    ],
  }
}

/** Advarslene som gjelder akkurat denne planen, uten de generelle forbeholdene foran. */
export const egneAdvarsler = (v: Pick<Planvisning, 'advarsler' | 'forbehold'>): string[] => v.advarsler.slice(v.forbehold.length)

/**
 * Listene etter tabellen i teksten som kopieres, i rekkefølgen de står i;
 * kildene og versjonene står etter dem. Skjermen har de samme listene, men
 * viser advarslene for planen ved tabellen og resten under «Faglig grunnlag»
 * (`Doseplanvisning`). Kopien har hver linje i disse listene; godkjenningen
 * ({@link Planvisning.godkjenning}) står bare på skjermen, og
 * regelversjonen står i kopien under «Versjoner».
 */
export const PLANDELER = [
  { tittel: 'Vurderingspunkter', felt: 'vurderinger' },
  { tittel: 'Advarsler', felt: 'advarsler' },
  { tittel: 'Avvik fra regelens kurve', felt: 'avvik' },
  { tittel: 'Antakelser', felt: 'antakelser' },
  { tittel: 'Usikkerhet', felt: 'usikkerhet' },
  { tittel: 'Preparater planen bygger på', felt: 'preparater' },
  { tittel: 'Kontroller', felt: 'kontroller' },
] as const satisfies readonly { tittel: string; felt: keyof Planvisning }[]

const punkter = (overskrift: string, linjer: readonly string[]) => (linjer.length > 0 ? [``, `${overskrift}:`, ...linjer.map((l) => `- ${l}`)] : [])

/**
 * Planen som ren tekst, til utklippstavlen: det samme som står på skjermen,
 * i tidslinjens rekkefølge. `forutsatt` er de avledede svarene og
 * forbeholdene flyten har lagt til grunn (§4.1); de står etter planen.
 */
export function planTekst(v: Planvisning, overskrift: string, forutsatt: readonly string[] = []): string {
  // Navnet med administrasjonsformen, som kolonnene på skjermen: samme virkestoff kan stå både peroralt og som depot.
  const kolonne = (i: number) => `${v.kolonner[i]!.navn} ${v.kolonner[i]!.administrasjon}`
  const celle = (c: Dosecelle | null, i: number) =>
    c && `${kolonne(i)}: ${c.dose}${c.elementer.length > 0 ? ` = ${c.elementer.join(' + ')}` : ''}${c.avvik ? ` (${c.avvik})` : ''}`
  const linjer = v.rader.map((r) => {
    const naar = `${r.dager}${r.datoer ? ` (${r.datoer})` : ''}`
    if (r.type === 'injeksjon') return `${naar}: ${kolonne(r.kolonne)} ${r.dose} = ${r.element}${r.detalj ? ` (${r.detalj})` : ''}`
    if (r.type === 'vurdering') return `${naar}: Vurdering (${v.kolonner[r.kolonne]!.navn}): ${r.tekst}`
    return `${naar}: ${r.celler.map(celle).filter(Boolean).join('; ') || 'ingen dose'}`
  })
  return [
    overskrift,
    v.tittel,
    ...(v.undertittel ? [v.undertittel] : []),
    v.utfall.tekst,
    '',
    ...linjer,
    ...punkter('Forutsatt', forutsatt),
    ...PLANDELER.flatMap((d) => punkter(d.tittel, v[d.felt])),
    ...punkter('Kilder', v.kilder.map(kildelinje)),
    ...punkter('Versjoner', v.versjoner),
  ].join('\n')
}
