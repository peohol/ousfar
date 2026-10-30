/**
 * Beregningen av en regel i regelmodellen (P4 i
 * `docs/verktøy-utviklingsplan.md`): fra en regel og syntetiske inndata til
 * en **modellberegning** av doseforløpene, eller en stopp med grunnene.
 *
 * Dette er den faglige dosekurven, ikke en plan med preparater: dosene er
 * ideelle og avrundet til to desimaler, og hvilke doser som faktisk kan gis
 * med norske preparater, avgjøres av motoren i P5 (FEST, deling). Resultatet
 * er aldri en klinisk anbefaling i seg selv: `klinisk_godkjent` er bare sann
 * når nøyaktig denne regelversjonen er klinisk godkjent etter uavhengig
 * faglig kontroll (`godkjenning.ts`).
 *
 * Beregningen gjetter aldri: mangler en verdi, en bekreftelse, et svar på et
 * unntak, et klinisk dosevalg eller et validert gruppemedlem, gjelder et
 * unntak, er inndata eller en parameter ugyldig, eller bryter resultatet et
 * bindende krav, stopper den og sier hvorfor. Den kaster aldri. Like inndata
 * og like versjoner gir samme resultat.
 */
import { godkjenningsfeil } from './godkjenning'
import {
  erRenSeponering,
  parameterfeil,
  parametre,
  REGELMODELLVERSJON,
  tallfeil,
  type Dosekilde,
  type Fase,
  type Forlop,
  type Godkjenningsstatus,
  type Nedtrappingsstrategi,
  type Parameter,
  type Regel,
  type Regelsett,
  type Beregningsinndata,
  type Inndatakrav,
  type Begrunnelseskrav,
  type Sporsmal,
  justerbare,
} from './modell'

/** Økes når beregningen endres slik at like inndata kan gi et annet resultat. */
export const MOTORVERSJON = 5

/** En sammenhengende periode med samme dose. `til` er `null` når dosen fortsetter. */
export interface Periode {
  fra: number
  til: number | null
  /** Døgndosen, eller med `hver` dosen hver av dagene den gis. */
  mg: number
  /** Dosen gis hver `hver`. dag (2 er annenhver dag); uten den daglig. */
  hver?: number
  /** Døgndosen er over forløpets grense for én dose og gis fordelt på et av disse antallene doser (`Forlop.fordeling`). */
  fordeles?: number[]
  fra_dato?: string
  til_dato?: string | null
}

export interface Injeksjon {
  /** Planens dag for en startinjeksjon; `null` for vedlikeholdet. */
  dag: number | null
  dato?: string
  mg: number
  sted?: string
  vindu_dager?: number
  /** Vedlikehold: hver `maaneder` måned, første gang `maaneder` måned etter dag `etter_dag`. */
  vedlikehold?: { maaneder: number; etter_dag: number; tidligst_dager?: number; forste_dato?: string }
}

export interface Forlopsresultat {
  id: string
  /** P1-nøkkelen; for en gruppe medlemmet pasienten bruker. */
  virkestoff: string
  administrasjon: Forlop['administrasjon']
  formulering?: string
  /** Første dag forløpet kan starte. */
  start: number
  perioder: Periode[]
  injeksjoner: Injeksjon[]
  /** Siste dag med dose; 0 når legemidlet seponeres før dag 1; `null` når forløpet fortsetter. */
  siste_dosedag: number | null
  /** Når doseringen ikke beregnes: hvorfor. */
  uten_beregning?: string
  /** Datoene for `start` og dagen etter `siste_dosedag`, når planen har startdato. */
  start_dato?: string
  seponert_dato?: string
  /**
   * Når planen ikke går til 0 (individuell avslutning eller intervalldosering):
   * hvorfor planen stopper der, med dosen pasienten står på. Siste periode
   * fortsetter da (`til` er `null`).
   */
  avslutning?: string
  /** Det samme kort, til kortformen og rapporten. */
  avslutning_kort?: string
}

/** Et bindende krav beregningen er kontrollert mot. */
export interface Kontroll {
  krav: string
  oppfylt: boolean
  detalj: string
}

interface Versjoner {
  regel: { id: string; versjon: number; godkjenning: Godkjenningsstatus }
  regelsett: { id: string; versjon: number } | null
  modell: number
  motor: number
  /** Bare sann når godkjenningen gjelder nøyaktig denne regelversjonen; da er beregningen fortsatt ikke en vurdering av den enkelte pasient. */
  klinisk_godkjent: boolean
  merknader: string[]
}

export type Beregningsresultat =
  | (Versjoner & { status: 'modellberegning'; forbehold: string; forlop: Forlopsresultat[]; kontroller: Kontroll[] })
  | (Versjoner & { status: 'stoppet'; stoppgrunner: string[] })

export const FORBEHOLD_IKKE_GODKJENT =
  'Modellberegning etter en regel som ikke er klinisk godkjent. Den er ikke en klinisk anbefaling, er ikke empirisk validert som plan, og skal ikke vises i appen.'
export const FORBEHOLD_GODKJENT =
  'Beregnet etter en klinisk godkjent regelversjon. Den erstatter ikke klinisk vurdering av den enkelte pasient.'

const EPS = 1e-9
const MAKS_TRINN = 200

/** Avrunding til to desimaler for visning; beregningen bruker de uavrundede dosene. */
export const avrund = (x: number) => Math.round((x + EPS) * 100) / 100

const verdi = (p: Parameter) => p.verdi as number

/* --- Datoer ------------------------------------------------------------------- */

const tilDato = (iso: string) => new Date(`${iso}T00:00:00Z`)
const iso = (d: Date) => d.toISOString().slice(0, 10)

/** En gyldig kalenderdato som `ÅÅÅÅ-MM-DD`; `2027-02-31` er ikke det. */
export function erIsoDato(x: unknown): x is string {
  if (typeof x !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(x)) return false
  const d = tilDato(x)
  return !Number.isNaN(d.getTime()) && iso(d) === x
}

export function datoFor(startdato: string, dag: number): string {
  const d = tilDato(startdato)
  d.setUTCDate(d.getUTCDate() + dag - 1)
  return iso(d)
}

/** Samme dag `n` måneder senere, eller siste dag i måneden når den er kortere. */
export function leggTilMaaneder(dato: string, n: number): string {
  const d = tilDato(dato)
  const dagen = d.getUTCDate()
  d.setUTCDate(1)
  d.setUTCMonth(d.getUTCMonth() + n)
  const siste = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(dagen, siste))
  return iso(d)
}

/* --- Nedtrapping ---------------------------------------------------------------- */

/** Neste dose etter `aktuell` i trinn `k` (fra 1), uavrundet; 0 når strategien seponerer. */
function nesteFor(s: Nedtrappingsstrategi, d0: number): (aktuell: number, k: number) => number {
  return (aktuell, k) => {
    switch (s.type) {
      case 'prosent_av_aktuell': {
        // Ved lav dose blir trinnet mindre, aldri større enn ellers (også når prosenten er justert ned).
        const lav = s.lav_prosent && s.lav_grense_mg && aktuell <= verdi(s.lav_grense_mg) + EPS
        const d = aktuell * (1 - (lav ? Math.min(verdi(s.lav_prosent!), verdi(s.prosent)) : verdi(s.prosent)) / 100)
        return s.sluttdose_mg && d < verdi(s.sluttdose_mg) - EPS ? 0 : d
      }
      case 'prosent_av_startdose':
        return aktuell - (d0 * verdi(s.prosent)) / 100
      case 'absolutt':
        return aktuell - verdi(s.mg)
      case 'hyperbolsk': {
        const ed50 = verdi(s.ed50_mg)
        const n = verdi(s.trinn)
        if (k >= n) return 0
        const f = (d0 / (ed50 + d0)) * (1 - k / n)
        return (ed50 * f) / (1 - f)
      }
    }
  }
}

/**
 * Dosene etter `d0` til og med siste dose over 0, uavrundet. Første dose er
 * allerede redusert; etter siste dose seponeres legemidlet.
 */
export function trinnserie(s: Nedtrappingsstrategi, d0: number): number[] {
  const neste = nesteFor(s, d0)
  const serie: number[] = []
  let aktuell = d0
  for (let k = 1; k <= MAKS_TRINN; k++) {
    const d = neste(aktuell, k)
    if (d <= EPS) return serie
    serie.push(d)
    aktuell = d
  }
  throw new Error(`Nedtrappingen (${s.type}) når ikke 0 på ${MAKS_TRINN} trinn`)
}

/**
 * Hvorfor en nedtrapping uten nulltrinn stopper: horisonten, laveste dose som
 * kan gis, minste dose beregningen viser, en reduksjon som forsvinner i
 * avrundingen, eller strategiens siste trinn før 0.
 */
export type Trinnslutt = 'horisont' | 'praktisk_grense' | 'minste_viste_dose' | 'avrundet_bort' | 'siste_trinn'

/** Den minste dosen beregningen viser (to desimaler); et trinn under den ville sett ut som 0 mg. En teknisk grense, ikke en klinisk. */
export const MINSTE_VISTE_MG = 0.01

/**
 * Dosene etter `d0` når planen ikke går til 0 (individuell avslutning): høyst
 * `horisont` reduksjoner (den tekniske planhorisonten), og aldri et trinn
 * under `min_mg` eller til 0. Hvert trinn avrundes til den viste dosen (to
 * desimaler), og neste trinn regnes fra den, så beregnet, vist og gitt dose
 * er den samme (fagkontrollen 30.10.2026, beslutning 6). En reduksjon som
 * forsvinner i avrundingen, er ikke et trinn: planen stopper ved dosen før.
 * `neste` er dosen som ville kommet etter siste, uavrundet.
 */
export function trinnTilHorisont(s: Nedtrappingsstrategi, d0: number, horisont: number, min_mg?: number): { serie: number[]; slutt: Trinnslutt; neste: number } {
  const neste = nesteFor(s, d0)
  const serie: number[] = []
  let aktuell = d0
  for (let k = 1; k <= Math.min(horisont, MAKS_TRINN); k++) {
    const raa = neste(aktuell, k)
    if (raa <= EPS) return { serie, slutt: 'siste_trinn', neste: 0 }
    const d = avrund(raa)
    if (min_mg !== undefined && d < min_mg - EPS) return { serie, slutt: 'praktisk_grense', neste: raa }
    if (d < MINSTE_VISTE_MG - EPS) return { serie, slutt: 'minste_viste_dose', neste: raa }
    if (d >= avrund(aktuell) - EPS) return { serie, slutt: 'avrundet_bort', neste: raa }
    serie.push(d)
    aktuell = d
  }
  return { serie, slutt: 'horisont', neste: neste(aktuell, serie.length + 1) }
}

/** «fordelt på 2 eller 3 doser». */
export const fordelingstekst = (antall: readonly number[]) => `fordelt på ${antall.length <= 1 ? antall.join('') : `${antall.slice(0, -1).join(', ')} eller ${antall.at(-1)}`} doser`

/** «annenhver dag» eller «hver 3. dag». */
export const hverTekst = (hver: number) => (hver === 2 ? 'annenhver dag' : `hver ${hver}. dag`)

/**
 * Det hver plan uten nulltrinn sier om siste dose (fagkontrollen 30.10.2026,
 * beslutning 6, med kontrollørens tekst): planen stopper av tekniske grunner,
 * og dosen er ikke nødvendigvis en sluttdose.
 */
export const SISTE_DOSE = 'Planen stopper her av tekniske grunner. Fortsett med denne dosen inntil forskriveren har vurdert videre nedtrapping. Dosen er ikke nødvendigvis en sluttdose.'

/** Hva datoene og dagene i en plan betyr (beslutning 6): tidligste tidspunkter, ikke faste avtaler. */
export const TIDLIGSTE_DATOER =
  'Dagene og datoene er tidligste mulige tidspunkt dersom alle tidligere reduksjoner gjennomføres som planlagt; utsettes et trinn, forskyves alle senere tidspunkter tilsvarende.'

/** Det hver plan uten nulltrinn sier om slutten (beslutning 3, 4 og 6): ingen nulltrinn, ingen dato for siste dose, og en ny plan regnes fra dosen som faktisk brukes. */
export const AVSLUTNING_FELLES = `${SISTE_DOSE} Planen går ikke til null og foreslår ingen dato for siste dose. En ny plan beregnes fra dosen pasienten faktisk bruker når forskriveren revurderer, ikke nødvendigvis siste dose her, og tidligere symptomer, toleranse og utsettelser må vurderes.`

/* --- Beregningen ------------------------------------------------------------------ */

interface Kontekst {
  inndata: Beregningsinndata
  medlem: string | null
  resultater: Map<string, Forlopsresultat>
  kontroller: Kontroll[]
}

function dose(k: Dosekilde | { type: 'aktuell' }, aktuell: number, ctx: Kontekst): number {
  switch (k.type) {
    case 'aktuell':
      return aktuell
    case 'fast':
      return verdi(k.mg)
    case 'inndata':
      return k.navn === 'startdose' ? ctx.inndata.startdose_mg : (ctx.inndata.maldose_mg as number)
    case 'tabell': {
      // Et spenn i tabellen er et klinisk valg: dosen må oppgis som måldose, og beregningen velger aldri selv.
      const start = ctx.inndata.startdose_mg
      const valgt = ctx.inndata.maldose_mg
      const rad = k.rader.find((r) => Math.abs(r.fra_mg - start) < EPS)
      if (!rad) throw new Stopp(`Startdosen ${tall(start)} mg finnes ikke i omregningstabellen.`)
      if (!Array.isArray(rad.til_mg)) {
        if (valgt !== undefined && Math.abs(valgt - rad.til_mg) > EPS) {
          throw new Stopp(`Måldosen ${tall(valgt)} mg stemmer ikke med omregningstabellen, som gir ${tall(rad.til_mg)} mg ved ${tall(start)} mg.`)
        }
        return rad.til_mg
      }
      const [lav, hoy] = rad.til_mg
      if (valgt === undefined) {
        throw new Stopp(
          `Ved ${tall(start)} mg gir omregningstabellen et spenn på ${tall(lav)}–${tall(hoy)} mg. Dosen i spennet er et klinisk valg og må oppgis som måldose; beregningen velger ikke selv.`,
        )
      }
      if (valgt < lav - EPS || valgt > hoy + EPS) throw new Stopp(`Måldosen ${tall(valgt)} mg er utenfor spennet ${tall(lav)}–${tall(hoy)} mg i omregningstabellen.`)
      return valgt
    }
  }
}

class Stopp extends Error {}

/** Fasene for forløpet: gruppemedlemmets egne når de finnes. */
function faserFor(regel: Regel, f: Forlop, medlem: string | null): Fase[] {
  if (f.virkestoff.type !== 'gruppe') return f.faser
  return regel.medlemmer?.find((m) => m.nokkel === medlem)?.faser ?? f.faser
}

function beregnForlop(regel: Regel, f: Forlop, ctx: Kontekst): Forlopsresultat {
  const { inndata } = ctx
  const virkestoff = f.virkestoff.type === 'virkestoff' ? f.virkestoff.nokkel : (ctx.medlem as string)
  let start: number
  if (f.start.type === 'dag') start = f.start.dag
  else {
    const forrige = ctx.resultater.get(f.start.forlop)
    if (!forrige) throw new Error(`${regel.id}: forløpet ${f.id} starter etter ${f.start.forlop}, som ikke er beregnet før`)
    if (forrige.siste_dosedag === null) throw new Stopp(`${forrige.virkestoff} avsluttes ikke i planen, så utvaskingen før ${virkestoff} kan ikke beregnes.`)
    const utvasking = verdi(f.start.utvasking)
    start = forrige.siste_dosedag + utvasking + 1
    const fra = forrige.siste_dosedag + 1
    ctx.kontroller.push({
      krav: `Minst ${utvasking} dager uten ${forrige.virkestoff} før ${virkestoff} (${f.start.utvasking.art === 'bindende_krav' ? 'bindende' : 'veiledende'})`,
      oppfylt: true,
      detalj: `Uten legemiddel dag ${fra}–${start - 1} (${start - fra} dager); ${virkestoff} tidligst dag ${start}.`,
    })
  }

  const perioder: Periode[] = []
  const injeksjoner: Injeksjon[] = []
  const fordeling = f.fordeling && { over: f.fordeling.over_mg ? verdi(f.fordeling.over_mg) : 0, antall: f.fordeling.antall }
  const legg = (fra: number, til: number | null, mg: number, hver?: number) => {
    if (til !== null && til < fra) return
    const forrige = perioder.at(-1)
    if (forrige && forrige.til === fra - 1 && Math.abs(forrige.mg - mg) < EPS && forrige.hver === hver) forrige.til = til
    else perioder.push({ fra, til, mg, ...(hver !== undefined && { hver }), ...(fordeling && mg > fordeling.over + EPS && { fordeles: fordeling.antall }) })
  }

  let dag = start
  let aktuell = f.utgangsdose === 'startdose' ? inndata.startdose_mg : 0
  let fortsetter = false
  let uten: string | undefined
  let avslutning: string | undefined
  let avslutning_kort: string | undefined

  for (const fase of faserFor(regel, f, ctx.medlem)) {
    switch (fase.type) {
      case 'hold': {
        const mg = dose(fase.dose, aktuell, ctx)
        let n: number
        if (fase.varighet.type === 'dager') n = verdi(fase.varighet.dager)
        else {
          const annet = ctx.resultater.get(fase.varighet.forlop)
          if (!annet) throw new Error(`${regel.id}: ${f.id} holder til ${fase.varighet.forlop}, som ikke er beregnet før`)
          if (annet.siste_dosedag === null) throw new Stopp(`${annet.virkestoff} avsluttes ikke i planen, så ${virkestoff} kan ikke holdes til da.`)
          n = Math.max(0, annet.siste_dosedag - dag + 1)
        }
        legg(dag, dag + n - 1, mg)
        dag += n
        aktuell = mg
        break
      }
      case 'nedtrapping': {
        const fasestart = dag
        const lengde = verdi(fase.trinnlengde)
        const individuell = fase.avslutning === 'individuell'
        if (individuell) {
          // Uten godkjent avslutning tas aldri trinnet til 0: planen viser trinnene frem til horisonten eller laveste dose som kan gis, og siste dose fortsetter.
          const min = f.dosevalg?.min_mg?.verdi ?? undefined
          const { serie, slutt, neste } = trinnTilHorisont(fase.strategi, aktuell, verdi(fase.horisont!), min)
          if (serie.length === 0) {
            throw new Stopp(
              slutt === 'praktisk_grense'
                ? `Fra ${tall(aktuell)} mg av ${virkestoff} ville neste trinn (${tall(neste)} mg) vært under ${tall(min!)} mg, den laveste dosen som kan gis med formuleringen regelen gjelder. Regelen har ingen beregnede trinn under den; lavere doser krever en annen dokumentert formulering, og videre nedtrapping eller avslutning må vurderes individuelt.`
                : slutt === 'avrundet_bort' || slutt === 'minste_viste_dose'
                  ? `Fra ${tall(aktuell)} mg av ${virkestoff} blir første reduksjon (til ${presis(neste)} mg) borte når dosen vises med to desimaler, så planen har ingen trinn som kan vises og gis nøyaktig. Videre nedtrapping må vurderes individuelt.`
                  : `Fra ${tall(aktuell)} mg av ${virkestoff} har regelen ingen reduksjon før avslutningen, og regelen har ingen godkjent avslutning; den må vurderes individuelt.`,
            )
          }
          for (const mg of serie.slice(0, -1)) {
            legg(dag, dag + lengde - 1, mg)
            dag += lengde
          }
          aktuell = serie.at(-1)!
          legg(dag, null, aktuell)
          const star = `Fra dag ${dag} står pasienten på ${tall(aktuell)} mg av ${virkestoff} til planen revurderes`
          if (slutt === 'horisont') {
            avslutning = `Planen viser ${serie.length} reduksjoner, regelens tekniske planhorisont, ikke en klinisk grense. ${star}. ${AVSLUTNING_FELLES}`
            avslutning_kort = `teknisk planhorisont: ${serie.length} reduksjoner; avslutning vurderes individuelt`
          } else if (slutt === 'praktisk_grense') {
            avslutning = `Neste trinn (${tall(neste)} mg) ville vært under ${tall(min!)} mg, den laveste dosen som kan gis med formuleringen regelen gjelder (en praktisk grense, ikke en klinisk). ${star}; lavere doser krever en annen dokumentert formulering. ${AVSLUTNING_FELLES}`
            avslutning_kort = `praktisk grense: ingen trinn under ${tall(min!)} mg; avslutning vurderes individuelt`
          } else if (slutt === 'avrundet_bort') {
            avslutning = `Neste reduksjon (til ${presis(neste)} mg) blir borte når dosen vises med to desimaler, så den er ikke et trinn som kan vises og gis nøyaktig. ${star}. ${AVSLUTNING_FELLES}`
            avslutning_kort = 'neste reduksjon forsvinner i avrundingen; avslutning vurderes individuelt'
          } else if (slutt === 'minste_viste_dose') {
            avslutning = `Neste trinn ville vært under ${tall(MINSTE_VISTE_MG)} mg, den minste dosen beregningen viser (en teknisk grense, ikke en klinisk). ${star}. ${AVSLUTNING_FELLES}`
            avslutning_kort = `teknisk grense: ingen trinn under ${tall(MINSTE_VISTE_MG)} mg; avslutning vurderes individuelt`
          } else {
            avslutning = `Regelens siste trinn før null er nådd. ${star}. ${AVSLUTNING_FELLES}`
            avslutning_kort = 'siste trinn før null; avslutning vurderes individuelt'
          }
          fortsetter = true
          break
        }
        // Under sluttdosen har regelen ingen trinn; dosen er ikke ugyldig, men videre nedtrapping er ikke en del av regelen.
        if (fase.strategi.type === 'prosent_av_aktuell' && fase.strategi.sluttdose_mg && aktuell < verdi(fase.strategi.sluttdose_mg) - EPS) {
          throw new Stopp(
            `Dosen ${tall(aktuell)} mg av ${virkestoff} er under regelens sluttdose (${tall(verdi(fase.strategi.sluttdose_mg))} mg), der regelen går over til seponering. Regelen har ingen godkjent videre nedtrapping eller seponering fra en så lav dose; det må vurderes individuelt.`,
          )
        }
        const serie = trinnserie(fase.strategi, aktuell)
        for (const mg of serie) {
          legg(dag, dag + lengde - 1, mg)
          dag += lengde
        }
        aktuell = 0
        if (fase.minste_varighet) {
          const minst = verdi(fase.minste_varighet)
          const varighet = dag - fasestart
          const k = {
            krav: `Nedtrappingen av ${virkestoff} varer minst ${minst} dager (${fase.minste_varighet.art === 'bindende_krav' ? 'bindende' : 'veiledende'})`,
            oppfylt: varighet >= minst,
            detalj: `Nedtrapping dag ${fasestart}–${dag - 1} (${varighet} dager).`,
          }
          ctx.kontroller.push(k)
          // Et veiledende minimum blir en merknad; et bindende stopper beregningen.
          if (!k.oppfylt && fase.minste_varighet.art === 'bindende_krav') {
            throw new Stopp(`Nedtrappingen av ${virkestoff} blir ${varighet} dager, kortere enn ${minst} dager. Beregningen forlenger den ikke av seg selv.`)
          }
        }
        break
      }
      case 'opptrapping':
        for (const t of fase.trinn) {
          const n = verdi(t.dager)
          legg(dag, dag + n - 1, verdi(t.mg))
          dag += n
          aktuell = verdi(t.mg)
        }
        break
      case 'vedlikehold':
        aktuell = dose(fase.dose, aktuell, ctx)
        legg(dag, null, aktuell)
        fortsetter = true
        break
      case 'intervalldosering': {
        const mg = dose(fase.dose, aktuell, ctx)
        const hver = verdi(fase.hver)
        const minst = verdi(fase.minstetid)
        legg(dag, null, mg, hver)
        aktuell = mg
        avslutning = `Fra dag ${dag} gis ${tall(mg)} mg av ${virkestoff} ${hverTekst(hver)}, i minst ${minst} dager før pasienten revurderes; symptomer kan kreve en vurdering tidligere. Planen gjør ingen ny reduksjon av seg selv og går ikke til null. Fortsett med denne doseringen inntil forskriveren har vurdert videre nedtrapping; den er ikke nødvendigvis en sluttdosering.`
        avslutning_kort = `${hverTekst(hver)} i minst ${minst} dager; avslutning vurderes individuelt`
        fortsetter = true
        break
      }
      case 'seponer':
        aktuell = 0
        break
      case 'uten_beregning':
        uten = fase.grunn
        fortsetter = true
        break
      case 'injeksjoner': {
        let sist = dag
        for (const s of fase.start) {
          const d = dag - 1 + verdi(s.dag)
          sist = d
          injeksjoner.push({
            dag: d,
            mg: dose(s.dose, aktuell, ctx),
            ...(s.sted ? { sted: s.sted } : {}),
            ...(s.vindu_dager ? { vindu_dager: verdi(s.vindu_dager) } : {}),
          })
        }
        const v = fase.vedlikehold
        injeksjoner.push({
          dag: null,
          mg: dose(v.dose, aktuell, ctx),
          ...(v.sted ? { sted: v.sted } : {}),
          ...(v.vindu_dager ? { vindu_dager: verdi(v.vindu_dager) } : {}),
          vedlikehold: { maaneder: verdi(v.maaneder), etter_dag: sist, ...(v.tidligst_dager ? { tidligst_dager: verdi(v.tidligst_dager) } : {}) },
        })
        fortsetter = true
        break
      }
    }
    if (fortsetter) break
  }

  const resultat: Forlopsresultat = {
    id: f.id,
    virkestoff,
    administrasjon: f.administrasjon,
    ...(f.formulering ? { formulering: f.formulering } : {}),
    start,
    perioder,
    injeksjoner,
    siste_dosedag: fortsetter ? null : dag - 1,
    ...(uten ? { uten_beregning: uten } : {}),
    ...(avslutning ? { avslutning, avslutning_kort } : {}),
  }
  if (inndata.startdato) dater(resultat, inndata.startdato)
  return resultat
}

function dater(r: Forlopsresultat, startdato: string) {
  r.start_dato = datoFor(startdato, r.start)
  if (r.siste_dosedag !== null) r.seponert_dato = datoFor(startdato, r.siste_dosedag + 1)
  for (const p of r.perioder) {
    p.fra_dato = datoFor(startdato, p.fra)
    p.til_dato = p.til === null ? null : datoFor(startdato, p.til)
  }
  for (const i of r.injeksjoner) {
    if (i.dag !== null) i.dato = datoFor(startdato, i.dag)
    if (i.vedlikehold) i.vedlikehold.forste_dato = leggTilMaaneder(datoFor(startdato, i.vedlikehold.etter_dag), i.vedlikehold.maaneder)
  }
}

/* --- Forhåndskontrollene -------------------------------------------------------- */

const tall = (x: number) => String(avrund(x)).replace('.', ',')
/** En uavrundet dose med fire desimaler, når avrundingen er poenget: «0,495». */
const presis = (x: number) => String(Math.round(x * 10_000) / 10_000).replace('.', ',')

/** Dosene et inndatakrav tillater, i klartekst; nedre grense 0 er enhver positiv dose. */
export const inndatagrenser = (krav: Pick<Inndatakrav, 'omrade' | 'verdier'>): string =>
  krav.omrade ? (krav.omrade[0] === 0 ? `høyst ${tall(krav.omrade[1])} mg` : `${tall(krav.omrade[0])}–${tall(krav.omrade[1])} mg`) : `${(krav.verdier ?? []).map(tall).join(', ')} mg`

/** Når et inndatakrav gjelder, i klartekst: « ved eldre over 65 år», eller tomt når det alltid gjelder. */
export function inndatavilkar(krav: Pick<Inndatakrav, 'ved'>, sporsmal: readonly Sporsmal[] = []): string {
  if (!krav.ved) return ''
  const s = sporsmal.find((x) => x.id === krav.ved!.sporsmal)
  const hva = krav.ved.svar ? s?.ja : s?.nei
  return ` ved ${hva ?? `${krav.ved.svar ? 'ja' : 'nei'} på ${s?.tekst ?? krav.ved.sporsmal}`}`
}

/**
 * Kontrollerer ett inndatakrav; et brudd på et bindende krav blir en
 * stoppgrunn, på en forsiktighetsgrense en stoppgrunn uten begrunnelse og en
 * kontroll med den, og ellers en merknad. Et krav med `ved` gjelder bare ved
 * det svaret; uten svar stopper beregningen allerede på spørsmålet.
 */
function kontrollerInndata(regel: Regel, krav: Inndatakrav, x: number | undefined, inndata: Beregningsinndata, stopp: string[], merknader: string[], kontroller: Kontroll[]) {
  if (krav.ved && inndata.svar?.[krav.ved.sporsmal] !== krav.ved.svar) return
  const navn = krav.navn === 'startdose' ? 'Startdosen' : 'Måldosen'
  if (x === undefined) {
    stopp.push(`${navn} må oppgis${krav.navn === 'maldose' ? '; regelen har ingen standard måldose' : ''}.`)
    return
  }
  if (!positivt(x)) {
    stopp.push(`${navn} må være et positivt tall i mg.`)
    return
  }
  if (!krav.omrade && !krav.verdier) return
  const utenfor =
    (krav.omrade && (x < krav.omrade[0] - EPS || x > krav.omrade[1] + EPS)) || (krav.verdier && !krav.verdier.some((v) => Math.abs(v - x) < EPS))
  const gyldig = `${inndatagrenser(krav)}${inndatavilkar(krav, regel.sporsmal)}`
  const art = krav.art === 'bindende_krav' ? 'bindende' : krav.krever_begrunnelse ? 'forsiktighetsgrense' : 'veiledende'
  const begrunnelse = inndata.begrunnelse?.trim()
  const begrunnet = !!(utenfor && krav.krever_begrunnelse && begrunnelse)
  kontroller.push({ krav: `${navn} er ${gyldig} (${art})`, oppfylt: !utenfor || begrunnet, detalj: begrunnet ? `${tall(x)} mg; forskriverens begrunnelse: «${begrunnelse}».` : `${tall(x)} mg.` })
  if (!utenfor || begrunnet) return
  const tekst = `${navn} ${tall(x)} mg er utenfor det regelen gjelder for (${gyldig}).`
  if (krav.art === 'bindende_krav') stopp.push(tekst)
  else if (krav.krever_begrunnelse) stopp.push(`${navn} ${tall(x)} mg er over forsiktighetsgrensen (${gyldig}) og krever en skriftlig begrunnelse fra forskriveren, en særskilt vurdering. Skriv begrunnelsen, eller vurder om regelen passer.`)
  else merknader.push(`${tekst} Det er en veiledende grense; vurder om regelen passer.`)
}

const brukerMaldose = (x: unknown) => JSON.stringify(x).includes('"navn":"maldose"')
const positivt = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x) && x > 0

/** Inndata som har feil form (ikke bare feil verdi), som stoppgrunner. */
function inndatafeil(i: Beregningsinndata): string[] {
  const feil: string[] = []
  if (i.startdato !== undefined && !erIsoDato(i.startdato)) feil.push(`Startdatoen «${String(i.startdato)}» er ikke en gyldig dato (ÅÅÅÅ-MM-DD).`)
  if (i.medlem !== undefined && typeof i.medlem !== 'string') feil.push('Virkestoffet pasienten bruker må oppgis som tekst.')
  if (i.bekreftet !== undefined && !(Array.isArray(i.bekreftet) && i.bekreftet.every((x) => typeof x === 'string'))) feil.push('Bekreftelsene må være en liste med id-er.')
  const forhold = i.pasientforhold as unknown
  if (forhold !== undefined && (!forhold || typeof forhold !== 'object' || Array.isArray(forhold) || Object.values(forhold).some((x) => typeof x !== 'boolean'))) {
    feil.push('Pasientforholdene må oppgis som ja eller nei for hvert unntak.')
  }
  const justert = i.justert as unknown
  if (justert !== undefined && (!justert || typeof justert !== 'object' || Array.isArray(justert) || Object.values(justert).some((x) => typeof x !== 'number' || !Number.isFinite(x)))) {
    feil.push('Justeringene må oppgis som tall.')
  }
  const svar = i.svar as unknown
  if (svar !== undefined && (!svar || typeof svar !== 'object' || Array.isArray(svar) || Object.values(svar).some((x) => typeof x !== 'boolean'))) {
    feil.push('Svarene må oppgis som ja eller nei for hvert spørsmål.')
  }
  if (i.begrunnelse !== undefined && typeof i.begrunnelse !== 'string') feil.push('Begrunnelsen må oppgis som tekst.')
  return feil
}

/** Siste kontroll før en plan returneres: hele planens dager fra 1 og endelige, positive doser. */
function planfeil(forlop: Forlopsresultat[]): string[] {
  const feil: string[] = []
  const dag = (x: unknown) => typeof x === 'number' && Number.isInteger(x) && x >= 1
  const dose = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x > 0
  for (const f of forlop) {
    if (!dag(f.start)) feil.push(`${f.id} starter dag ${String(f.start)}`)
    for (const p of f.perioder) {
      if (!dag(p.fra) || (p.til !== null && (!dag(p.til) || p.til < p.fra)) || !dose(p.mg)) feil.push(`${f.id} har perioden dag ${p.fra}–${String(p.til)} med ${p.mg} mg`)
      if (p.hver !== undefined && !(Number.isInteger(p.hver) && p.hver >= 2)) feil.push(`${f.id} har perioden dag ${p.fra}–${String(p.til)} med dose hver ${String(p.hver)}. dag`)
    }
    for (const i of f.injeksjoner) {
      if ((i.dag !== null && !dag(i.dag)) || !dose(i.mg)) feil.push(`${f.id} har en injeksjon dag ${String(i.dag)} med ${i.mg} mg`)
      if (i.vedlikehold && (!dag(i.vedlikehold.etter_dag) || !dag(i.vedlikehold.maaneder))) feil.push(`${f.id} har et ugyldig vedlikeholdsintervall`)
    }
  }
  return feil
}

/**
 * Dagene uten dose i en klinisk godkjent ren seponering, uansett hvordan
 * regelen er bygd: hvert forløp må ha dose hver dag fra start og fortsette
 * uten slutt, fordi ingen avslutning (nulltrinn) er godkjent (`nulltrinnfeil`
 * i `modell.ts`). Syntetiske modellberegninger uten godkjenning (P5) kan gå
 * til 0; de blir aldri en klinisk plan.
 */
export function nulldagfeil(forlop: Forlopsresultat[]): string[] {
  return forlop.flatMap((f) => {
    const p = f.perioder
    const hull = p.findIndex((x, i) => x.fra !== (i === 0 ? f.start : (p[i - 1]!.til ?? Number.NaN) + 1))
    return [
      ...(hull >= 0 ? [`${f.id} er uten dose før dag ${p[hull]!.fra}, men regelen har ingen godkjent avslutning`] : []),
      ...(p.length === 0 || p.at(-1)!.til !== null || f.siste_dosedag !== null ? [`${f.id} går til 0 mg, men regelen har ingen godkjent avslutning`] : []),
    ]
  })
}

const ENHETSTEKST: Partial<Record<Parameter['enhet'], string>> = { prosent: '%', dager: 'dager', mg: 'mg' }
/** Et tall med parameterens enhet, slik forskriveren ser det. */
export const medEnhet = (x: number, p: Parameter) => `${tall(x)}${p.enhet === 'prosent' ? ' %' : ` ${ENHETSTEKST[p.enhet] ?? p.enhet}`}`

/** Området en justerbar verdi kan velges i, med enhet; uten klinisk øvre grense «minst …» med den tekniske grensen. */
export const omradetekst = (p: Parameter & { omrade: [number, number] }) =>
  p.teknisk_maks ? `minst ${medEnhet(p.omrade[0], p)}, av tekniske grunner høyst ${medEnhet(p.omrade[1], p)}` : `${tall(p.omrade[0])}–${medEnhet(p.omrade[1], p)}`

/** Når et begrunnelseskrav gjelder, i klartekst: «over 25 %», «under 28 dager ved lang behandlingstid». */
export function kravtekst(k: Begrunnelseskrav, p: Parameter, sporsmal: readonly Sporsmal[] = []): string {
  const grenser = [k.over !== undefined && `over ${medEnhet(k.over, p)}`, k.under !== undefined && `under ${medEnhet(k.under, p)}`].filter(Boolean).join(' eller ')
  const ved = k.ved && (sporsmal.find((s) => s.id === k.ved)?.ja ?? k.ved)
  return ved ? `${grenser} ved ${ved}` : grenser
}

/**
 * Begrunnelseskravene verdiene i regelen (etter forskriverens valg) utløser:
 * hver blir en kontroll med begrunnelsen, eller en stoppgrunn når den mangler.
 * Et krav med `ved` gjelder bare når spørsmålet er besvart med ja.
 */
function kontrollerBegrunnelser(regel: Regel, inndata: Beregningsinndata, stopp: string[], kontroller: Kontroll[]) {
  const begrunnelse = inndata.begrunnelse?.trim() ?? ''
  for (const [sti, p] of parametre(regel.plan, 'plan')) {
    if (p.verdi === null) continue
    const x = p.verdi
    for (const k of p.begrunnelseskrav ?? []) {
      if (k.ved && inndata.svar?.[k.ved] !== true) continue
      if (!((k.over !== undefined && x > k.over + EPS) || (k.under !== undefined && x < k.under - EPS))) continue
      const navn = p.justerbar ?? sti
      const krav = `${navn}: ${medEnhet(x, p)} krever begrunnelse (${kravtekst(k, p, regel.sporsmal)})`
      if (begrunnelse) kontroller.push({ krav, oppfylt: true, detalj: `Forskriverens begrunnelse: «${begrunnelse}».` })
      else stopp.push(`${navn} ${medEnhet(x, p)} krever en skriftlig begrunnelse fra forskriveren (${kravtekst(k, p, regel.sporsmal)}). Skriv begrunnelsen, eller velg en annen verdi.`)
    }
  }
  // Et ja på et spørsmål som krever en særskilt vurdering, krever en begrunnelse uansett verdiene.
  for (const s of regel.sporsmal ?? []) {
    if (!s.krever_begrunnelse || inndata.svar?.[s.id] !== true) continue
    const krav = `${s.tekst} Ja: krever begrunnelse (${s.ja})`
    if (begrunnelse) kontroller.push({ krav, oppfylt: true, detalj: `Forskriverens begrunnelse: «${begrunnelse}».` })
    else stopp.push(`Svaret ja (${s.ja}) krever en skriftlig begrunnelse fra forskriveren, en særskilt vurdering. Skriv begrunnelsen, eller vurder om regelen passer.`)
  }
}

/**
 * Regelen med forskriverens valg for de justerbare parametrene. Et valg for en
 * parameter som ikke er justerbar, eller utenfor området regelen tillater,
 * gir en feil; hvert gyldig valg blir en kontroll, så planen viser at den
 * avviker fra regelens forslag.
 */
export function juster(regel: Regel, justert: Record<string, number>): { regel: Regel; feil: string[]; kontroller: Kontroll[] } {
  const valg = Object.entries(justert)
  if (valg.length === 0) return { regel, feil: [], kontroller: [] }
  const kopi = structuredClone(regel)
  const parametere = new Map(justerbare(kopi))
  const feil: string[] = []
  const kontroller: Kontroll[] = []
  for (const [sti, x] of valg) {
    const p = parametere.get(sti)
    if (!p) {
      feil.push(`«${sti}» kan ikke justeres i denne regelen.`)
      continue
    }
    const [a, b] = p.omrade
    const tillatt = omradetekst(p)
    if (x < a - EPS || x > b + EPS) {
      feil.push(`${p.justerbar}: ${medEnhet(x, p)} er utenfor det regelen tillater (${tillatt}).`)
      continue
    }
    if (parameterfeil({ ...p, verdi: x }, sti)) {
      feil.push(`${p.justerbar}: ${medEnhet(x, p)} kan ikke brukes; regelen tillater ${p.enhet === 'dager' ? 'hele dager' : 'tall'} i området ${tillatt}.`)
      continue
    }
    if (p.verdi !== null && Math.abs(x - p.verdi) < EPS) continue
    kontroller.push({ krav: `${p.justerbar} er valgt av forskriveren innenfor regelens område`, oppfylt: true, detalj: `${medEnhet(x, p)} i stedet for regelens forslag ${p.verdi === null ? '(mangler)' : medEnhet(p.verdi, p)}; regelen tillater ${tillatt}.` })
    p.verdi = x
  }
  return { regel: kopi, feil, kontroller }
}

/**
 * Beregner `regel` for `inndata`. `regelsett` er settet regelen hører til,
 * når den beregnes som del av et.
 */
export function beregn(regel: Regel, inndata: Beregningsinndata, regelsett?: Regelsett): Beregningsresultat {
  const ugyldigGodkjenning = godkjenningsfeil(regel)
  const klinisk_godkjent = ugyldigGodkjenning.length === 0
  const merknader: string[] = []
  if (regel.godkjenning.status === 'klinisk_godkjent' && !klinisk_godkjent) {
    merknader.push(`Regelen er merket klinisk godkjent, men godkjenningen gjelder ikke denne regelversjonen: ${ugyldigGodkjenning.join(' ')} Beregningen er behandlet som ikke godkjent.`)
  }
  const versjoner = (): Versjoner => ({
    regel: { id: regel.id, versjon: regel.versjon, godkjenning: regel.godkjenning.status },
    regelsett: regelsett ? { id: regelsett.id, versjon: regelsett.versjon } : null,
    modell: REGELMODELLVERSJON,
    motor: MOTORVERSJON,
    klinisk_godkjent,
    merknader,
  })
  const stopp: string[] = []
  const stoppet = (): Beregningsresultat => ({ ...versjoner(), klinisk_godkjent: false, status: 'stoppet', stoppgrunner: stopp })

  if (regel.beregnbarhet === 'bare_tekstlig' || regel.beregnbarhet === 'mangler_anbefaling') {
    stopp.push(regel.beregnbarhet === 'bare_tekstlig' ? 'Regelen er bare tekstlig veiledning og har ingen beregnbar plan.' : 'Det finnes ingen anbefaling å beregne.')
  }
  if (regel.godkjenning.status === 'avvist' || regel.godkjenning.status === 'trukket') stopp.push(`Regelversjonen er ${regel.godkjenning.status}.`)
  const formfeil = inndatafeil(inndata)
  if (formfeil.length > 0) {
    stopp.push(...formfeil)
    return stoppet()
  }
  // Forskriverens justeringer etter godkjenningskontrollen: godkjenningen gjelder regelen med områdene, ikke det enkelte valget.
  const justering = juster(regel, inndata.justert ?? {})
  if (justering.feil.length > 0) {
    stopp.push(...justering.feil)
    return stoppet()
  }
  regel = justering.regel

  // Unntakene (B7): hvert må være besvart. Ukjent stopper like mye som et forhold som gjelder; bare et eksplisitt «nei» slipper gjennom.
  const kontroller: Kontroll[] = [...justering.kontroller]
  const forhold = inndata.pasientforhold ?? {}
  for (const u of regel.unntak) {
    const svar = forhold[u.id]
    if (svar === true) stopp.push(`Regelen gjelder ikke: ${u.tekst}`)
    else if (svar === undefined) stopp.push(`Må avklares før beregning (ukjent): ${u.tekst}`)
    else kontroller.push({ krav: `Avkreftet: ${u.tekst}`, oppfylt: true, detalj: 'Vurdert og avkreftet av forskriveren.' })
  }
  for (const [id, svar] of Object.entries(forhold)) {
    if (svar && !regel.unntak.some((u) => u.id === id)) stopp.push(`Pasientforholdet «${id}» er ukjent for regelen; det må vurderes individuelt.`)
  }
  for (const b of regel.bekreftelser) {
    const ja = inndata.bekreftet?.includes(b.id) ?? false
    kontroller.push({ krav: `Bekreftet: ${b.tekst}`, oppfylt: ja, detalj: ja ? 'Bekreftet av forskriveren.' : 'Ikke bekreftet.' })
    if (!ja) stopp.push(`Må bekreftes før beregning: ${b.tekst}`)
  }
  // Spørsmålene: hvert må være besvart, og svaret står i planen.
  const sporsmal = regel.sporsmal ?? []
  for (const s of sporsmal) {
    const svar = inndata.svar?.[s.id]
    if (svar === undefined) stopp.push(`Må besvares før beregning: ${s.tekst}`)
    else kontroller.push({ krav: `${s.tekst} ${svar ? 'Ja' : 'Nei'}`, oppfylt: true, detalj: 'Oppgitt av forskriveren.' })
  }
  for (const id of Object.keys(inndata.svar ?? {})) if (!sporsmal.some((s) => s.id === id)) stopp.push(`Svaret «${id}» gjelder ikke et spørsmål i regelen.`)
  kontrollerBegrunnelser(regel, inndata, stopp, kontroller)

  const gjelder = (k: Inndatakrav) => !k.gjelder_medlem || k.gjelder_medlem === inndata.medlem
  const startkrav = regel.inndata.filter((k) => k.navn === 'startdose' && gjelder(k))
  if (startkrav.length === 0) startkrav.push({ navn: 'startdose', art: 'bindende_krav', grunnlag: { type: 'ousfar_vurdering', begrunnelse: '', avklaring: null } })
  for (const k of startkrav) kontrollerInndata(regel, k, inndata.startdose_mg, inndata, stopp, merknader, kontroller)
  const malkrav = regel.inndata.filter((k) => k.navn === 'maldose' && gjelder(k))
  if (malkrav.length === 0 && brukerMaldose(regel.plan)) malkrav.push({ navn: 'maldose', art: 'bindende_krav', grunnlag: { type: 'ousfar_vurdering', begrunnelse: '', avklaring: null } })
  for (const k of malkrav) kontrollerInndata(regel, k, inndata.maldose_mg, inndata, stopp, merknader, kontroller)
  if (malkrav.length === 0 && inndata.maldose_mg !== undefined && !positivt(inndata.maldose_mg)) stopp.push('Måldosen må være et positivt tall i mg.')

  // Gruppemedlemmet (B4): bare et medlem som er foreslått eller validert, kan beregnes.
  let medlem: string | null = null
  if (regel.plan.forlop.some((f) => f.virkestoff.type === 'gruppe')) {
    const m = regel.medlemmer?.find((x) => x.nokkel === inndata.medlem)
    if (!inndata.medlem) stopp.push('Regelen gjelder en gruppe; virkestoffet pasienten bruker må oppgis.')
    else if (!m) stopp.push(`${inndata.medlem} er ikke medlem av gruppen regelen gjelder.`)
    else if (m.validering === 'ikke_vurdert') stopp.push(`${m.nokkel} er ikke vurdert individuelt for gruppeanbefalingen: ${m.begrunnelse}`)
    else medlem = m.nokkel
  }

  // Parametre uten gyldig verdi i de fasene som faktisk brukes.
  for (const f of regel.plan.forlop) {
    for (const [sti, p] of parametre({ start: f.start, faser: faserFor(regel, f, medlem) }, f.id)) {
      const ugyldig = parameterfeil(p, sti)
      if (p.verdi === null) stopp.push(`Verdien ${sti} mangler og må avklares faglig.`)
      else if (ugyldig) stopp.push(`Verdien ${sti} er ugyldig: ${ugyldig}.`)
    }
  }
  for (const x of tallfeil(regel)) stopp.push(`Regelen er ugyldig: ${x}.`)

  if (stopp.length > 0) return stoppet()

  const ctx: Kontekst = { inndata, medlem, resultater: new Map(), kontroller }
  try {
    for (const f of regel.plan.forlop) ctx.resultater.set(f.id, beregnForlop(regel, f, ctx))
  } catch (e) {
    // Også en feil i regelen selv gir en kontrollert stopp, aldri et unntak hos den som beregner.
    stopp.push(e instanceof Stopp ? e.message : `Beregningen kunne ikke fullføres: ${e instanceof Error ? e.message : String(e)}`)
    return stoppet()
  }
  // En klinisk godkjent ren seponering kontrolleres også på selve planen, i tillegg til regelens oppbygning (`nulltrinnfeil`).
  const ugyldigPlan = [...planfeil([...ctx.resultater.values()]), ...(klinisk_godkjent && erRenSeponering(regel) ? nulldagfeil([...ctx.resultater.values()]) : [])]
  if (ugyldigPlan.length > 0) {
    stopp.push(...ugyldigPlan.map((x) => `Beregningen ga en ugyldig plan: ${x}.`))
    return stoppet()
  }
  for (const k of ctx.kontroller) if (!k.oppfylt) merknader.push(`${k.krav}: ikke oppfylt. ${k.detalj}`)
  for (const f of ctx.resultater.values()) if (f.avslutning) merknader.push(f.avslutning)
  if ([...ctx.resultater.values()].some((f) => f.avslutning && f.perioder.length > 1)) merknader.push(TIDLIGSTE_DATOER)

  return {
    ...versjoner(),
    status: 'modellberegning',
    forbehold: klinisk_godkjent ? FORBEHOLD_GODKJENT : FORBEHOLD_IKKE_GODKJENT,
    forlop: [...ctx.resultater.values()],
    kontroller: ctx.kontroller,
  }
}

/* --- Kort form, til eksemplene og rapporten ----------------------------------------- */

const mg = tall
const norskDato = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`

const parentes = (...deler: (string | undefined | false)[]) => {
  const d = deler.filter(Boolean)
  return d.length > 0 ? ` (${d.join(', ')})` : ''
}

function periodetekst(p: Periode): string {
  const dager = p.til === null ? `fra dag ${p.fra}` : p.til === p.fra ? `dag ${p.fra}` : `dag ${p.fra}–${p.til}`
  const dato = p.fra_dato && (p.til_dato && p.til !== p.fra ? `${norskDato(p.fra_dato)}–${norskDato(p.til_dato)}` : norskDato(p.fra_dato))
  return `${dager}${parentes(dato)}: ${mg(p.mg)} mg${p.hver ? ` ${hverTekst(p.hver)}` : ''}${p.fordeles ? `, ${fordelingstekst(p.fordeles)}` : ''}`
}

/** Når injeksjonen gis: `dag 8`, eller for vedlikehold intervallet og første gang (`hver måned fra 1 måned etter dag 8`). */
export function injeksjonstidspunkt(i: Pick<Injeksjon, 'dag' | 'vedlikehold'>): string {
  const v = i.vedlikehold
  if (!v) return `dag ${i.dag}`
  const hver = v.maaneder === 1 ? 'hver måned' : `hver ${v.maaneder}. måned`
  return `${hver} fra ${v.maaneder} ${v.maaneder === 1 ? 'måned' : 'måneder'} etter dag ${v.etter_dag}`
}

function injeksjonstekst(i: Injeksjon): string {
  const vindu = i.vindu_dager ? `±${i.vindu_dager} dager` : undefined
  const sted = i.sted ? `, ${i.sted}` : ''
  const dato = i.vedlikehold ? i.vedlikehold.forste_dato : i.dato
  const tidligst = i.vedlikehold?.tidligst_dager ? `, tidligst ${i.vedlikehold.tidligst_dager} dager etter forrige` : ''
  return `${injeksjonstidspunkt(i)}${parentes(dato && norskDato(dato), vindu)}${tidligst}: ${mg(i.mg)} mg injeksjon${sted}`
}

/**
 * Linjen for et forløp regelen ikke beregner videre: en oppstart som ikke
 * doseres (som fenelzin etter utvasking), eller dosering etter de beregnede
 * periodene som planlegges individuelt (som olanzapin etter de første dagene).
 */
export function utenBeregningLinje(f: Pick<Forlopsresultat, 'start' | 'start_dato' | 'perioder'>, datotekst = (d: string | undefined) => parentes(d && norskDato(d))): string {
  const siste = f.perioder.at(-1)
  if (!siste) return `tidligst dag ${f.start}${datotekst(f.start_dato)}: oppstart, dosering beregnes ikke`
  const dag = (siste.til ?? siste.fra) + 1
  return `fra dag ${dag}${datotekst(siste.til_dato ? datoFor(siste.til_dato, 2) : undefined)}: videre dosering beregnes ikke; planlegges individuelt`
}

/** Hvert forløp som korte linjer (`dag 1–14: 10 mg`), eller `stopp` med grunnene. */
export function kortform(r: Beregningsresultat): Record<string, string[]> {
  if (r.status === 'stoppet') return { stopp: r.stoppgrunner }
  return Object.fromEntries(
    r.forlop.map((f) => {
      const linjer = [...f.perioder.map(periodetekst), ...f.injeksjoner.map(injeksjonstekst)]
      if (f.uten_beregning) linjer.push(utenBeregningLinje(f))
      if (f.siste_dosedag !== null) linjer.push(`fra dag ${f.siste_dosedag + 1}${parentes(f.seponert_dato && norskDato(f.seponert_dato))}: seponert`)
      if (f.avslutning_kort) linjer.push(f.avslutning_kort)
      return [f.id, linjer]
    }),
  )
}
