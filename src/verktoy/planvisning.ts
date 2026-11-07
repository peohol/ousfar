/**
 * En klinisk doseplan gjort klar til visning, kopiering og utskrift (P6.7 i
 * `docs/verktøy-utviklingsplan.md`), delt i to (P3 i
 * `docs/verktøy-produktrevisjon-2026-11.md`):
 *
 * - **Standardplanen** er det klinikeren trenger for å gjennomføre
 *   behandlingen: utgangspunktet og sluttmålet, en dag- og datotabell med
 *   døgndosen, hva som gis og formskifter, hvilke preparater og resepter
 *   planen trenger, vurderingspunktene én gang hver, det som gjelder akkurat
 *   denne planen og forbeholdene.
 * - **Det faglige grunnlaget** er alt annet planen bygger på: avvik fra
 *   regelens kurve, antakelser, usikkerhet, hele preparatlisten fra FEST,
 *   preparater som ikke brukes, kontrollene, godkjenningen, kildene og
 *   versjonene.
 *
 * Ingenting forsvinner: standardplanen står først i begge kopiene, og den
 * utvidede kopien har i tillegg hele grunnlaget. Skjermen og teksten som
 * kopieres, bygger på det samme, så de sier det samme.
 *
 * Bare en klinisk plan kan vises ({@link planvisning} gir `null` for alt
 * annet). Kildene står som henvisninger med lenke; Psychiatrienet bare som
 * kildeoppføringen, aldri med innhold.
 */
import { DOSEENHETER, norskDato, type Doseenhet } from './motor/byggesteiner'
import { elementtekst, EN_REDUKSJON_KORT, fordelingSuffiks, preparatliste, seponeringsdag, sluttmalMangler, type Doseplanresultat, type Praktiskforlop } from './motor/plan'
import { KARTLEGGING } from './register'
import { avrund, hverTekst, injeksjonstidspunkt, KRAV, valgtTekst } from './regler/beregning'
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
  /** «ideelt 12,5 mg (+20 %)» når dosen avviker fra regelens kurve; står bare i det faglige grunnlaget og den utvidede kopien. */
  avvik?: string
  /** «Over til dråper» når legemidlet gis i en annen form enn før ({@link Formskifte}). */
  skifte?: Formskifte
}

/**
 * Et skifte av legemiddelform: fra forrige periode, eller fra formen
 * pasienten bruker nå til første periode (P0 U4: tablettene stoppes og
 * dråpene trenger resept).
 */
export interface Formskifte {
  /** «dråper», «tabletter og dråper». */
  til: string
  /** Skiftet skjer på planens første dag for et legemiddel pasienten allerede bruker. */
  fraNaa: boolean
}

export type Planrad =
  | { type: 'periode'; dager: string; datoer?: string; celler: (Dosecelle | null)[] }
  /**
   * Vurderingspunktene i kolonnen samme dag, i én rad (regelmodell 12):
   * `punkter` er numrene i {@link Planvisning.oppfolging}, og `tekst` er en
   * kort påminnelse med numrene; hele teksten står én gang under
   * «Vurderingspunkter».
   */
  | { type: 'vurdering'; dager: string; datoer?: string; kolonne: number; punkter: number[]; tekst: string }
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
  /** Dosen pasienten bruker nå av legemidlene planen endrer: «Escitalopram 10 mg per døgn»; `null` når planen bare starter nye legemidler. */
  utgangspunkt: string | null
  /** Vurderings- og kontrollpunktene i klartekst, med tidspunkt og hva som gjøres ved funn, som regelen gir dem. */
  vurderinger: string[]
  /**
   * De samme vurderingspunktene i standardplanen, nummerert i denne
   * rekkefølgen (tidslinjen viser numrene): uten legemiddelnavnet når planen
   * har ett legemiddel, og med «som punkt N» når hva som gjøres ved funn, er
   * ordrett det samme som i et punkt før.
   */
  oppfolging: string[]
  /** Hva planen er når den ikke er en fullstendig nedtrapping, rett under tittelen; ellers `null`. */
  undertittel: string | null
  kolonner: { navn: string; administrasjon: string }[]
  rader: Planrad[]
  /** Styrkene og formene planen bruker per legemiddel, med påminnelse om resept for nye legemidler og nye former. */
  preparatbehov: string[]
  /**
   * De klinisk avgjørende forutsetningene for denne pasienten, kort: svarene
   * som avgjør hvilke vilkår regelen stiller (f.eks. om pasienten kan bli
   * gravid), med vilkårene som da er bekreftet ({@link avklart}). Står i
   * standardplanen; alle kontrollene står i det faglige grunnlaget.
   */
  avklart: string[]
  /** Det motoren sier om akkurat denne planen (veiledende grenser, avslutning, krav som ikke er oppfylt); står i standardplanen. */
  viktig: string[]
  /** De generelle forbeholdene, som står for hver plan. */
  forbehold: string[]
  /** Regelversjonen og FEST-uttrekket i én kort linje til standardplanen; id og fingeravtrykk står i {@link versjoner}. */
  spor: string
  /** Hvem som har godkjent regelen, når og for hvilken versjon ({@link godkjenningstekst}). */
  godkjenning: string | null
  antakelser: string[]
  usikkerhet: string[]
  avvik: string[]
  kontroller: string[]
  preparater: string[]
  /** Preparater i FEST for legemidlene som planen ikke bruker, med grunnen (godkjenningsfritak, styrke utenfor omfanget …). */
  ikkeBrukt: string[]
  kilder: Plankilde[]
  versjoner: string[]
}

/** Formen pasienten bruker nå, per forløp, slik skjemaet har den (FEST-kode for legemiddelformen). */
export type Utgangsformer = Readonly<Record<string, { legemiddelform?: string } | undefined>>

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

/** Enhetene en celle gis med, som en fast nøkkel: «drape», «drape+tablett». */
const formnokkel = (c: Dosecelle | null) => (c ? [...new Set((c.enheter ?? []).filter((e): e is Doseenhet => e !== null))].sort().join('+') : '')

/** «tabletter og dråper» for nøkkelen fra {@link formnokkel}. */
const formnavn = (nokkel: string) =>
  nokkel
    .split('+')
    .map((e) => DOSEENHETER[e as Doseenhet]?.flere ?? e)
    .join(' og ')

/**
 * Om første periode av forløpet gis i en annen legemiddelform enn den
 * pasienten bruker nå: bare for et legemiddel pasienten allerede bruker, og
 * bare når skjemaet har formen. Ingen av preparatene i første periode har da
 * den formen.
 */
function nyFormFraStart(f: Praktiskforlop, utgang: Utgangsformer | undefined): boolean {
  const kode = utgang?.[f.id]?.legemiddelform
  const forste = f.perioder[0]
  if (!kode || !forste || !(f.utgangsdose_mg ?? 0)) return false
  return !forste.elementer.some((e) => e.preparater.some((b) => b.legemiddelform?.kode === kode))
}

/**
 * Formskiftene i radene, satt på cellene: når et legemiddel gis i en annen
 * form enn i perioden før, og når første periode bruker en annen form enn
 * pasienten bruker nå (`fraStart`, per kolonne).
 */
function medFormskifter(rader: Planrad[], fraStart: readonly boolean[]): void {
  const forrige = new Map<number, string>()
  for (const r of rader) {
    if (r.type !== 'periode') continue
    r.celler.forEach((c, k) => {
      const ny = formnokkel(c)
      if (!c || !ny) return
      const gammel = forrige.get(k)
      if (gammel === undefined ? fraStart[k] : gammel !== ny) c.skifte = { til: formnavn(ny), fraNaa: gammel === undefined }
      forrige.set(k, ny)
    })
  }
}

/** Periodene i alle forløpene slått sammen til felles dager, og injeksjonene og vurderingspunktene som egne rader, i dagenes rekkefølge. */
function rader(forlop: Praktiskforlop[], startdato: string | undefined, vurderinger: readonly Vurdering[] = [], utgang?: Utgangsformer): Planrad[] {
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
  // Et legemiddel som fortsetter uendret, står med hele forklaringen bare første gang.
  const forsteUendret = new Set<string>()
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
      if (f.uendret_mg !== undefined && fra >= f.start) return uendretCelle(f, forsteUendret.has(f.id) ? false : !!forsteUendret.add(f.id))
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
          dager: storForbokstav(tidspunkt),
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
  // Vurderingspunktene i samme kolonne samme dag, og på samme side av endringen, står i én rad.
  const samme = new Map<string, { dag: number; kolonne: number; for: boolean; d: number; punkter: { nr: number; tekst: string }[] }>()
  for (const [i, v] of vurderinger.entries()) {
    for (const d of v.dager) {
      const nokkel = `${v.kolonne}|${d}|${v.for}`
      const rad = samme.get(nokkel) ?? { dag: v.for ? d - 0.5 : d + 0.25, kolonne: v.kolonne, for: v.for, d, punkter: [] }
      rad.punkter.push({ nr: i + 1, tekst: forsteSetning(v.tekst) })
      samme.set(nokkel, rad)
    }
  }
  for (const v of samme.values()) {
    // En vurdering før en endring står foran perioden som starter den dagen, en vurdering etter en endring etter den.
    const punkter = v.punkter.map((p, j) => `${j === 0 && v.for ? 'Før endringen, punkt' : 'Punkt'} ${p.nr}: ${p.tekst}`).join(' ')
    ut.push({ dag: v.dag, rad: { type: 'vurdering', dager: `Dag ${v.d}`, ...(startdato && { datoer: dato(startdato, v.d) }), kolonne: v.kolonne, punkter: v.punkter.map((p) => p.nr), tekst: punkter } })
  }
  // Stabil sortering: en injeksjon står etter perioden som starter samme dag.
  const ferdig = ut.sort((a, b) => a.dag - b.dag).map((x) => x.rad)
  medFormskifter(
    ferdig,
    forlop.map((f) => nyFormFraStart(f, utgang)),
  )
  return ferdig
}

const storForbokstav = (x: string) => x.charAt(0).toUpperCase() + x.slice(1)

/**
 * Første setning i en vurderingstekst, til påminnelsen i tidslinjen; hele
 * teksten står under «Vurderingspunkter». En setning slutter med punktum,
 * spørsmålstegn eller utropstegn foran stor bokstav eller slutten.
 */
export const forsteSetning = (tekst: string) => /^[\s\S]*?[.!?](?=\s+[A-ZÆØÅ]|\s*$)/.exec(tekst.trim())?.[0] ?? tekst.trim()

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

/** Det cellen sier om en uendret dose etter første rad; hele forklaringen ({@link UENDRET}) står i første rad. */
export const UENDRET_KORT = 'uendret dose'

/**
 * Cellen for et legemiddel som fortsetter med uendret dose: dosen, tablettene
 * den gis med og om den er kontrollert (`forste`), eller i senere rader bare
 * dosen og at den er uendret.
 */
function uendretCelle(f: Praktiskforlop, forste = true): Dosecelle {
  if (!forste) return { dose: uendretDose(f), elementer: [UENDRET_KORT] }
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

/** Tidspunktet for et vurderingspunkt med dagene: «før hver doseendring (dag 29, 57)», «dag 36». */
const narTekst = (v: Vurdering) => `${v.tidspunkt}${v.dager.length > 0 && v.tidspunkt.startsWith('dag') === false ? ` (dag ${v.dager.join(', ')})` : ''}`

/** Linjen for et vurderingspunkt, som regelen gir det. */
const vurderingslinje = (v: Vurdering, navn: string) => `${navn}, ${narTekst(v)}: ${v.tekst}${v.ved_funn ? ` Ved funn: ${v.ved_funn}` : ''}`

/**
 * Vurderingspunktene i standardplanen, i samme rekkefølge som numrene i
 * tidslinjen: legemiddelnavnet bare når planen har flere legemidler, og «som
 * punkt N» når hva som gjøres ved funn, står ordrett i et punkt før.
 */
function oppfolgingslinjer(vurderinger: readonly Vurdering[], navn: (kolonne: number) => string, flere: boolean): string[] {
  const forste = new Map<string, number>()
  return vurderinger.map((v, i) => {
    const tidligere = v.ved_funn === undefined ? undefined : forste.get(v.ved_funn)
    if (v.ved_funn !== undefined && tidligere === undefined) forste.set(v.ved_funn, i + 1)
    const ved = v.ved_funn === undefined ? '' : ` Ved funn: ${tidligere === undefined ? v.ved_funn : `som punkt ${tidligere}.`}`
    return `${flere ? `${navn(v.kolonne)}, ${narTekst(v)}` : storForbokstav(narTekst(v))}: ${v.tekst}${ved}`
  })
}

/** « (24.05.2027)» når planen har startdato. */
const datoParentes = (d: string | null | undefined) => (d ? ` (${norskDato(d)})` : '')

/** Sluttmålet for ett forløp, eller hva planen ikke dekker for det. */
function sluttFor(f: Praktiskforlop, navn: string): { sluttmal?: string; mangler?: string } {
  const ikke = sluttmalMangler(f)
  if (ikke) return { mangler: `${navn}: ${ikke}` }
  if (f.uendret_mg !== undefined) return { sluttmal: `${navn} fortsetter uendret på ${uendretDose(f)}` }
  const s = seponeringsdag(f)
  if (s !== null) return { sluttmal: `${navn} seponert fra dag ${s}${datoParentes(f.seponert_dato)}` }
  const vedlikehold = f.injeksjoner.find((i) => i.vedlikehold)
  if (vedlikehold) return { sluttmal: `${navn} vedlikehold ${mg(vedlikehold.mg)} ${injeksjonstidspunkt(vedlikehold)}` }
  const sist = f.perioder.at(-1)
  return { sluttmal: `${navn} fortsetter på ${mg(sist!.mg)}${sist!.hver ? ` ${hverTekst(sist!.hver)}` : ''} fra dag ${sist!.fra}${datoParentes(sist!.fra_dato)}` }
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

/**
 * Preparatene og resepten planen trenger, én linje per legemiddel planen
 * doserer: hver styrke og form med dagene den brukes, preparatnavnet når alle
 * preparatene for styrken har samme navn, og en påminnelse om resept for et
 * nytt legemiddel og for en legemiddelform pasienten ikke bruker nå (et
 * formskifte i planen, eller en annen form enn skjemaet sier at pasienten
 * bruker). Et legemiddel som fortsetter uendret eller bare seponeres, står
 * ikke her. Hele preparatlisten fra FEST står i det faglige grunnlaget.
 */
function preparatbehov(forlop: readonly Praktiskforlop[], navn: (i: number) => string, utgang: Utgangsformer | undefined): string[] {
  return forlop.flatMap((f, k) => {
    if (f.uendret_mg !== undefined) return []
    const grupper = new Map<string, { enhet: Doseenhet; mg: number; dager: [number, number | null][]; navn: Set<string> }>()
    const nye = new Set<Doseenhet>()
    let forrige: Set<Doseenhet> | null = null
    const legg = (e: Praktiskforlop['perioder'][number]['elementer'][number], fra: number | null, til: number | null) => {
      const g = grupper.get(`${e.doseenhet}|${e.mg}`) ?? { enhet: e.doseenhet, mg: e.mg, dager: [], navn: new Set<string>() }
      // Sammenhengende perioder slås sammen: «dag 1–28 og 43–56».
      const sist = g.dager.at(-1)
      if (fra !== null && sist && sist[1] !== null && sist[1] + 1 === fra) sist[1] = til
      else if (fra !== null) g.dager.push([fra, til])
      for (const b of e.preparater) g.navn.add(b.navn_form_styrke)
      grupper.set(`${e.doseenhet}|${e.mg}`, g)
    }
    for (const p of f.perioder) {
      const enheter = new Set(p.elementer.map((e) => e.doseenhet))
      const nyeHer = forrige === null ? (nyFormFraStart(f, utgang) ? [...enheter] : []) : [...enheter].filter((e) => !forrige!.has(e))
      for (const e of nyeHer) nye.add(e)
      for (const e of p.elementer) legg(e, p.fra, p.til)
      forrige = enheter
    }
    for (const inj of f.injeksjoner) legg(inj.element, null, null)
    if (grupper.size === 0) return []
    const deler = [...grupper.values()].map((g) => {
      const produkt = g.navn.size === 1 ? ` (${[...g.navn][0]})` : ''
      const dager = g.dager.length === 0 ? '' : ` ${g.dager.map(([fra, til]) => dagtekst(fra, til).toLowerCase()).join(' og ')}`
      return `${DOSEENHETER[g.enhet].flere} à ${mg(g.mg)}${produkt}${dager}`
    })
    const nytt = !(f.utgangsdose_mg ?? 0)
    const resept = nytt ? ' Nytt i planen: husk resept.' : nye.size > 0 ? ` Ny legemiddelform (${[...nye].map((e) => DOSEENHETER[e].flere).join(' og ')}): husk resept.` : ''
    return [`${navn(k)}: ${deler.join('; ')}.${resept}`]
  })
}

/** Dosen pasienten bruker nå av legemidlene planen endrer ({@link Planvisning.utgangspunkt}). */
function utgangspunkt(forlop: readonly Praktiskforlop[], kolonner: Planvisning['kolonner']): string | null {
  const deler = forlop.flatMap((f, i) =>
    f.uendret_mg !== undefined || !(f.utgangsdose_mg ?? 0) ? [] : [f.administrasjon === 'peroral' ? `${kolonner[i]!.navn} ${mg(f.utgangsdose_mg!)} per døgn` : `${kolonner[i]!.navn} ${kolonner[i]!.administrasjon} ${mg(f.utgangsdose_mg!)}`],
  )
  return deler.length > 0 ? deler.join('; ') : null
}

/** Regelversjonen og datoen for FEST-uttrekket i én linje ({@link Planvisning.spor}). */
/**
 * De klinisk avgjørende forutsetningene for planen, utledet av motorens
 * kontroller (bare det motoren faktisk har kontrollert og funnet oppfylt) og
 * regelens omfang, med regelens egne tekster: svaret på hvert spørsmål som
 * avgjør om det kreves egne bekreftelser (`Bekreftelse.ved`), i svarets korte
 * form fra regelen («Kan bli gravid»), og hver bekreftelse svaret krever, som
 * «Bekreftet: …». Avkreftede unntak, ubetingede bekreftelser, svar som ikke
 * styrer vilkår, og begrunnelser i fritekst står bare i det faglige
 * grunnlaget; uten slike spørsmål er listen tom og delen vises ikke.
 */
function avklart(r: Extract<Doseplanresultat, { status: 'doseplan' }>, regel: Regel): string[] {
  const oppfylt = new Set(r.kontroller.filter((k) => k.oppfylt).map((k) => k.krav))
  return (regel.sporsmal ?? []).flatMap((s) => {
    const vilkar = regel.bekreftelser.filter((b) => b.ved?.sporsmal === s.id)
    const svar = [true, false].find((x) => oppfylt.has(KRAV.svar(s, x)))
    if (vilkar.length === 0 || svar === undefined) return []
    // Svaret i regelens korte form, uten instruksen til skjemaet etter semikolon.
    const kort = (svar ? s.ja : s.nei)?.split(';')[0]?.trim()
    return [
      kort ? `${storForbokstav(kort)}.` : KRAV.svar(s, svar),
      ...vilkar.filter((b) => b.ved!.svar === svar && oppfylt.has(KRAV.bekreftet(b))).map(KRAV.bekreftet),
    ]
  })
}

export const sporlinje = (versjon: number, festdato: string | null) =>
  `Beregnet etter regelversjon ${versjon} med FEST-uttrekk fra ${festdato ? norskDato(festdato.slice(0, 10)) : 'ukjent dato'}.`

/**
 * Visningen av en klinisk doseplan; `null` for alt som ikke er en klinisk
 * plan. `utgang` er formen pasienten bruker nå per forløp, fra skjemaet; med
 * den sier planen fra når første trinn bruker en annen form.
 */
export function planvisning(r: Doseplanresultat, regel: Regel, startdato?: string, utgang?: Utgangsformer): Planvisning | null {
  if (r.status !== 'doseplan' || !r.klinisk || r.sperre.length > 0 || r.regel.id !== regel.id || r.regel.fingeravtrykk !== fingeravtrykk(regel)) return null
  const kolonner = r.forlop.map((f) => ({ navn: virkestoffnavn(f.virkestoff), administrasjon: ADMINISTRASJON[f.administrasjon] }))
  const navn = (i: number) => kolonner[i]!.navn
  const vurderinger = vurderingerFor(regel, r.forlop)
  return {
    tittel: regel.tittel,
    undertittel: undertittelFor(r.forlop),
    utfall: planutfall(r.forlop, navn),
    utgangspunkt: utgangspunkt(r.forlop, kolonner),
    vurderinger: vurderinger.map((v) => vurderingslinje(v, navn(v.kolonne))),
    oppfolging: oppfolgingslinjer(vurderinger, navn, kolonner.length > 1),
    kolonner,
    rader: rader(r.forlop, startdato, vurderinger, utgang),
    preparatbehov: preparatbehov(r.forlop, (i) => `${navn(i)} ${kolonner[i]!.administrasjon}`, utgang),
    avklart: avklart(r, regel),
    viktig: r.merknader,
    forbehold: r.forbehold,
    spor: sporlinje(r.regel.versjon, r.fest.kildedato),
    godkjenning: godkjenningstekst(regel),
    antakelser: regel.fortolkning.forutsetninger,
    usikkerhet: regel.fortolkning.usikkerhet,
    avvik: r.avvik,
    kontroller: r.kontroller.map((k) => `${k.krav.replace(/[.:]$/, '')}: ${k.oppfylt ? 'oppfylt' : 'ikke oppfylt'} (${k.detalj})`),
    preparater: preparatliste(r),
    ikkeBrukt: r.forlop.flatMap((f, i) => f.begrensninger.map((b) => `${navn(i)}: ${b}`)),
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

type Listefelt = { [K in keyof Planvisning]: Planvisning[K] extends readonly string[] ? K : never }[keyof Planvisning]

/**
 * Delene etter tidslinjen i standardplanen, i rekkefølgen de står i på
 * skjermen, i utskriften og i begge kopiene. Vurderingspunktene er nummerert,
 * fordi tidslinjen viser til numrene.
 */
export const STANDARDDELER = [
  { tittel: 'Avklart for denne pasienten', felt: 'avklart' },
  { tittel: 'Legemiddelform og resepter', felt: 'preparatbehov' },
  { tittel: 'Vurderingspunkter', felt: 'oppfolging', nummerert: true },
  { tittel: 'Viktig for denne planen', felt: 'viktig' },
  { tittel: 'Forbehold', felt: 'forbehold' },
] as const satisfies readonly { tittel: string; felt: Listefelt; nummerert?: boolean }[]

/**
 * Det faglige grunnlaget, i rekkefølgen det står i den utvidede kopien;
 * kildene og versjonene står etter. På skjermen står de samme delene i den
 * sammenleggbare delen nederst (`FagligGrunnlag`).
 */
export const FAGLIGE_DELER = [
  { tittel: 'Avvik fra regelens kurve', felt: 'avvik' },
  { tittel: 'Antakelser', felt: 'antakelser' },
  { tittel: 'Usikkerhet', felt: 'usikkerhet' },
  { tittel: 'Preparater planen bygger på', felt: 'preparater' },
  { tittel: 'Preparater i FEST som ikke brukes', felt: 'ikkeBrukt' },
  { tittel: 'Kontroller', felt: 'kontroller' },
] as const satisfies readonly { tittel: string; felt: Listefelt }[]

const punkter = (overskrift: string, linjer: readonly string[], nummerert = false) =>
  linjer.length > 0 ? [``, `${overskrift}:`, ...linjer.map((l, i) => `${nummerert ? `${i + 1}.` : '-'} ${l}`)] : []

/** Innrykket som skiller en formskiftelinje i kopien fra radene med doser (`planTekst`). */
export const SKIFTEINNRYKK = '  '

/** Teksten i tidslinjen når et legemiddel går over til en annen form ({@link Formskifte}). */
export const skiftetekst = (s: Formskifte) => `Over til ${s.til}${s.fraNaa ? ' fra første dag' : ''} – husk resept`

/**
 * Planen som ren tekst, til utklippstavlen, i tidslinjens rekkefølge.
 * Standardkopien har standardplanen: tittelen, sluttmålet og utgangspunktet,
 * tidslinjen med formskifter, `forutsatt` (de avledede svarene og
 * forbeholdene flyten har lagt til grunn, §4.1), delene i
 * {@link STANDARDDELER} og regelversjonen. Den utvidede kopien (`utvidet`)
 * har i tillegg avvikene fra regelens kurve ved dosene og hele det faglige
 * grunnlaget med kilder og versjoner.
 */
export function planTekst(v: Planvisning, overskrift: string, forutsatt: readonly string[] = [], utvidet = false): string {
  // Navnet med administrasjonsformen, som kolonnene på skjermen: samme virkestoff kan stå både peroralt og som depot.
  const kolonne = (i: number) => `${v.kolonner[i]!.navn} ${v.kolonner[i]!.administrasjon}`
  const celle = (c: Dosecelle | null, i: number) =>
    c && `${kolonne(i)}: ${c.dose}${c.elementer.length > 0 ? ` = ${c.elementer.join(' + ')}` : ''}${utvidet && c.avvik ? ` (${c.avvik})` : ''}`
  const linjer = v.rader.flatMap((r) => {
    const naar = `${r.dager}${r.datoer ? ` (${r.datoer})` : ''}`
    if (r.type === 'injeksjon') return [`${naar}: ${kolonne(r.kolonne)} ${r.dose} = ${r.element}${r.detalj ? ` (${r.detalj})` : ''}`]
    if (r.type === 'vurdering') return [`${naar}: Vurdering (${v.kolonner[r.kolonne]!.navn}): ${r.tekst}`]
    // Et formskifte står på egen linje under dosen, uten kolon, så linjen ikke leses som en celle.
    const skifter = r.celler.flatMap((c, i) => (c?.skifte ? [`${SKIFTEINNRYKK}${kolonne(i)} – ${skiftetekst(c.skifte).toLowerCase()}`] : []))
    return [`${naar}: ${r.celler.map(celle).filter(Boolean).join('; ') || 'ingen dose'}`, ...skifter]
  })
  return [
    overskrift,
    v.tittel,
    ...(v.undertittel ? [v.undertittel] : []),
    v.utfall.tekst,
    ...(v.utgangspunkt ? [`Utgangspunkt: ${v.utgangspunkt}.`] : []),
    '',
    ...linjer,
    ...punkter('Forutsatt', forutsatt),
    ...STANDARDDELER.flatMap((d) => punkter(d.tittel, v[d.felt], 'nummerert' in d && d.nummerert)),
    '',
    v.spor,
    ...(utvidet
      ? [
          '',
          'FAGLIG GRUNNLAG',
          ...FAGLIGE_DELER.flatMap((d) => punkter(d.tittel, v[d.felt])),
          ...punkter('Klinisk godkjenning', v.godkjenning ? [v.godkjenning] : []),
          ...punkter('Kilder', v.kilder.map(kildelinje)),
          ...punkter('Versjoner', v.versjoner),
        ]
      : []),
  ].join('\n')
}
