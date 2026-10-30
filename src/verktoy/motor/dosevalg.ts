/**
 * Praktiske doser (P5.5–P5.6 i `docs/verktøy-utviklingsplan.md`): hvilke
 * døgndoser som kan settes sammen av byggesteinene i FEST, og valget av én
 * dose per periode så hele forløpet følger den ideelle kurven.
 *
 * Rekkefølgen i valget er fast (B3):
 *
 * 1. **Harde krav.** Hver dose ligger innenfor regelens tillatte avvik fra den
 *    ideelle (uten toleranse bare nøyaktig), innenfor regelens dosegrenser, og
 *    over 0. Dosen går aldri motsatt vei av kurven: synker den ideelle dosen,
 *    øker ikke den praktiske, og omvendt. Det gjelder også første periode,
 *    målt fra dosen forløpet starter med (pasientens aktuelle dose, eller 0
 *    for et nytt legemiddel).
 * 2. **Minst avvik**: summen av de relative avvikene over periodene.
 * 3. **Minst kompleksitet**: færrest preparater med godkjenningsfritak, så
 *    færrest delinger (en kvart teller som to halve), så færrest tabletter
 *    eller kapsler, så færrest styrker.
 * 4. **Avrunding mot forrige dose** ved ellers likt: summen over periodene av
 *    det relative avviket regnet mot kurvens retning, så en nedtrapping rundes
 *    heller opp og en opptrapping heller ned, i hvert trinn. Det er en fast
 *    regel for å skille like gode kandidater, ikke en påstand om at hele
 *    forløpet blir mildere: runder ett trinn opp, blir neste reduksjon større.
 * 5. **Fast rekkefølge**: lavest dose først.
 *
 * En dose består av høyst {@link MAKS_STYRKER} styrker og til sammen høyst
 * {@link MAKS_ENHETER} tabletter eller kapsler eller {@link MAKS_DRAPER}
 * dråper. Det er en praktisk ramme for
 * søket, ikke en klinisk grense: finnes ingen dose innenfor den, stopper
 * beregningen og sier det.
 */
import type { Kode } from '../../legemiddeldata/fest'
import type { Formuleringsklasse } from '../festformuleringer'
import type { Byggestein, Doseenhet, Registrering } from './byggesteiner'

export const MAKS_STYRKER = 2
export const MAKS_ENHETER = 4
export const MAKS_DRAPER = 60

const EPS = 1e-9

/** Preparater med samme formulering, form, doseenhet, styrke og registrering: de kan gi de samme dosene. */
export interface Styrkevalg {
  nokkel: string
  klasse: Formuleringsklasse
  legemiddelform: Kode | null
  doseenhet: Doseenhet
  mg: number
  registrering: Registrering
  /** Største deling noen av preparatene tillater. */
  deling: 1 | 2 | 4
  preparater: Byggestein[]
}

/** Én styrke i en dose: `antall` enheter, f.eks. 1,5 tablett. `preparater` er de som kan gi akkurat dette (delbare når antallet er delt). */
export interface Doseelement {
  styrke: string
  mg: number
  doseenhet: Doseenhet
  antall: number
  preparater: Byggestein[]
}

export interface Dosekandidat {
  mg: number
  elementer: Doseelement[]
  /** [godkjenningsfritak, delinger (halv 1, kvart 2), tabletter/kapsler/målinger, styrker] */
  kompleksitet: [number, number, number, number]
}

/** Grupperer brukbare byggesteiner (med styrke og doseenhet) i styrkevalg, sortert. */
export function styrkevalg(steiner: readonly Byggestein[]): Styrkevalg[] {
  const grupper = new Map<string, Styrkevalg>()
  for (const b of steiner) {
    if (b.mg === null || b.doseenhet === null) continue
    const nokkel = [b.klasse, b.legemiddelform?.kode ?? '', b.doseenhet, b.mg, b.registrering].join('|')
    const g = grupper.get(nokkel)
    if (g) {
      g.preparater.push(b)
      if (b.deling > g.deling) g.deling = b.deling
    } else grupper.set(nokkel, { nokkel, klasse: b.klasse, legemiddelform: b.legemiddelform, doseenhet: b.doseenhet, mg: b.mg, registrering: b.registrering, deling: b.deling, preparater: [b] })
  }
  return [...grupper.values()].sort((a, b) => (a.nokkel < b.nokkel ? -1 : a.nokkel > b.nokkel ? 1 : 0))
}

/** Delingen et antall krever: 1 for hele, 2 for halve, 4 for kvarte. */
const delingFor = (antall: number): 1 | 2 | 4 => {
  const brok = Math.round((antall % 1) * 4)
  return brok === 0 ? 1 : brok === 2 ? 2 : 4
}

function element(v: Styrkevalg, antall: number): Doseelement {
  const d = delingFor(antall)
  return { styrke: v.nokkel, mg: v.mg, doseenhet: v.doseenhet, antall, preparater: v.preparater.filter((b) => b.deling % d === 0) }
}

/** Hvor mye en deling teller: en kvart som to halve. */
const DELINGER = { 1: 0, 2: 1, 4: 2 } as const

const enheter = (e: Doseelement) => (e.doseenhet === 'drape' || e.doseenhet === 'injeksjon' ? 1 : Math.ceil(e.antall - EPS))

/** Høyst så mange av doseenheten i én døgndose, til sammen over styrkene. */
const RAMME: Record<Doseenhet, number> = { tablett: MAKS_ENHETER, kapsel: MAKS_ENHETER, drape: MAKS_DRAPER, injeksjon: 1 }
/** Tabletter og kapsler telles sammen, hele enheter (en delt tablett er én tablett). */
const rammegruppe = (d: Doseenhet) => (d === 'kapsel' ? 'tablett' : d)

/** Om dosen holder seg innenfor rammene for hver doseenhet, til sammen over styrkene. */
function innenforRammene(elementer: readonly Doseelement[]): boolean {
  const sum = new Map<Doseenhet, number>()
  for (const e of elementer) {
    const d = rammegruppe(e.doseenhet)
    sum.set(d, (sum.get(d) ?? 0) + Math.ceil(e.antall - EPS))
  }
  return [...sum].every(([d, n]) => n <= RAMME[d])
}

function kandidat(elementer: Doseelement[], fritak: ReadonlySet<string>): Dosekandidat {
  return {
    mg: elementer.reduce((s, e) => s + e.antall * e.mg, 0),
    elementer,
    kompleksitet: [
      elementer.filter((e) => fritak.has(e.styrke)).length,
      elementer.reduce((s, e) => s + DELINGER[delingFor(e.antall)], 0),
      elementer.reduce((s, e) => s + enheter(e), 0),
      elementer.length,
    ],
  }
}

/** Antallene én styrke kan gis i, fra det minste: hele, halve eller kvarte enheter etter delingen. Injeksjoner bare én. */
function antallFor(v: Styrkevalg, maksMg: number): number[] {
  if (v.doseenhet === 'injeksjon') return v.mg <= maksMg + EPS ? [1] : []
  const ut: number[] = []
  const steg = 1 / v.deling
  for (let k = 1; ; k++) {
    const antall = k * steg
    if (antall * v.mg > maksMg + EPS) break
    if (Math.ceil(antall - EPS) > RAMME[v.doseenhet]) break
    ut.push(antall)
  }
  return ut
}

/**
 * Alle doser mellom `fra` og `til` mg (inklusive) som kan settes sammen av
 * styrkevalgene innenfor rammene, én kandidat per dose: den enkleste.
 * Injeksjoner settes aldri sammen; én dose er én hel injeksjon.
 */
export function doser(valg: readonly Styrkevalg[], fra: number, til: number): Dosekandidat[] {
  const fritak = new Set(valg.filter((v) => v.registrering === 'godkjenningsfritak').map((v) => v.nokkel))
  const beste = new Map<string, Dosekandidat>()
  const legg = (elementer: Doseelement[]) => {
    if (elementer.some((e) => e.preparater.length === 0)) return
    const k = kandidat(elementer, fritak)
    if (k.mg < fra - EPS || k.mg > til + EPS) return
    if (!innenforRammene(elementer)) return
    const nokkel = k.mg.toFixed(6)
    const forrige = beste.get(nokkel)
    if (!forrige || sammenlign(k.kompleksitet, forrige.kompleksitet) < 0 || (sammenlign(k.kompleksitet, forrige.kompleksitet) === 0 && elementnokkel(k) < elementnokkel(forrige))) {
      beste.set(nokkel, k)
    }
  }
  const per = valg.map((v) => ({ v, antall: antallFor(v, til) }))
  for (const [i, a] of per.entries()) {
    for (const x of a.antall) {
      legg([element(a.v, x)])
      if (a.v.doseenhet === 'injeksjon' || MAKS_STYRKER < 2) continue
      for (const b of per.slice(i + 1)) {
        if (b.v.doseenhet === 'injeksjon') continue
        for (const y of b.antall) {
          if ((x * a.v.mg + y * b.v.mg) > til + EPS) break
          legg([element(a.v, x), element(b.v, y)])
        }
      }
    }
  }
  return [...beste.values()].sort((a, b) => a.mg - b.mg)
}

export const elementnokkel = (k: Pick<Dosekandidat, 'elementer'>) => k.elementer.map((e) => `${e.styrke}×${e.antall}`).join('+')

/** Leksikografisk sammenligning av to kostnader med toleranse for flyttall. */
export function sammenlign(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0)
    if (Math.abs(d) > 1e-7) return d < 0 ? -1 : 1
  }
  return 0
}

/** Én periode i et forløp: den ideelle døgndosen og dosene som oppfyller de harde kravene. */
export interface Periodevalg {
  ideell: number
  kandidater: Dosekandidat[]
}

const relativtAvvik = (ideell: number, mg: number) => Math.abs(mg - ideell) / ideell

/** Retningen fra `fra` til `til`: -1, 0 eller 1, med toleranse for flyttall. */
const retningFra = (fra: number, til: number) => (Math.abs(til - fra) <= EPS * Math.max(1, Math.abs(fra)) ? 0 : Math.sign(til - fra))

/**
 * Velger én dose per periode etter rekkefølgen øverst i filen. Retningen
 * følger den ideelle kurven fra `start` (dosen forløpet starter med): synker
 * den, kan den praktiske dosen ikke øke, og omvendt. `null` når ingen rekke
 * oppfyller kravene.
 */
export function velgSerie(perioder: readonly Periodevalg[], start: number): Dosekandidat[] | null {
  type Tilstand = { mg: number; kost: number[]; forrige: number }
  let forrige: (Tilstand | null)[] = [{ mg: start, kost: [0, 0, 0, 0, 0, 0], forrige: -1 }]
  let fraIdeell = start
  const lag: (Tilstand | null)[][] = []
  for (const p of perioder) {
    const retning = retningFra(fraIdeell, p.ideell)
    const naa = p.kandidater.map((k): Tilstand | null => {
      const egen = [relativtAvvik(p.ideell, k.mg), ...k.kompleksitet, (retning * (k.mg - p.ideell)) / p.ideell]
      let best: Tilstand | null = null
      for (const [j, t] of forrige.entries()) {
        if (!t || (retning < 0 && k.mg > t.mg + EPS) || (retning > 0 && k.mg < t.mg - EPS)) continue
        const kost = egen.map((x, n) => x + t.kost[n]!)
        if (!best || sammenlign(kost, best.kost) < 0) best = { mg: k.mg, kost, forrige: j }
      }
      return best
    })
    lag.push(naa)
    forrige = naa
    fraIdeell = p.ideell
  }
  let j = -1
  for (const [n, t] of forrige.entries()) if (t && (j < 0 || sammenlign(t.kost, forrige[j]!.kost) < 0)) j = n
  if (j < 0) return perioder.length === 0 ? [] : null
  const serie: Dosekandidat[] = []
  for (let i = perioder.length - 1; i >= 0; i--) {
    serie.unshift(perioder[i]!.kandidater[j]!)
    j = lag[i]![j]!.forrige
  }
  return serie
}

/**
 * Fordelingen av en døgndose på flere doser over døgnet, når regelen krever
 * det (`Forlop.fordeling`, f.eks. fluvoksamin over 150 mg): det første
 * antallet i `antall` som lar enhetene i dosen (hele og delte tabletter,
 * kapsler eller dråper) fordeles så hver dose er over 0 og høyst `maks` mg.
 * En delt tablett hører til én dose. Blant mulige fordelinger velges den
 * jevneste (minst største dose). Dosene i mg, største først; `null` når ingen
 * fordeling går.
 */
export function fordel(k: Pick<Dosekandidat, 'elementer'>, antall: readonly number[], maks: number): number[] | null {
  // Enhetene som stykker av samme størrelse med et antall: hele enheter, og en eventuell delt enhet per styrke.
  const stykker = new Map<number, number>()
  const legg = (mg: number, n: number) => n > 0 && stykker.set(mg, (stykker.get(mg) ?? 0) + n)
  for (const e of k.elementer) {
    const hele = Math.floor(e.antall + EPS)
    legg(e.mg, hele)
    if (e.antall - hele > EPS) legg((e.antall - hele) * e.mg, 1)
  }
  const typer = [...stykker.entries()].sort((a, b) => b[0] - a[0])
  for (const n of antall) {
    let best: number[] | null = null
    // Fordeler stykkene dose for dose; den siste dosen får resten.
    const sok = (igjen: number[], doser: number[]) => {
      if (doser.length === n - 1) {
        const rest = igjen.reduce((s, c, i) => s + c * typer[i]![0], 0)
        const alle = [...doser, rest].sort((a, b) => b - a)
        if (alle.some((d) => d <= EPS || d > maks + EPS)) return
        if (!best || sammenlign(alle, best) < 0) best = alle
        return
      }
      const valg = (i: number, bruk: number[]): void => {
        if (i === typer.length) {
          const mg = bruk.reduce((s, c, j) => s + c * typer[j]![0], 0)
          if (mg > EPS && mg <= maks + EPS) sok(igjen.map((c, j) => c - bruk[j]!), [...doser, mg])
          return
        }
        for (let c = 0; c <= igjen[i]!; c++) valg(i + 1, [...bruk, c])
      }
      valg(0, [])
    }
    sok(typer.map(([, c]) => c), [])
    if (best) return best
  }
  return null
}
