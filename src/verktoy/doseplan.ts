/**
 * Appens eneste vei inn til doseplanmotoren (P6 i
 * `docs/verktøy-utviklingsplan.md`). Verktøysidene bygger inndataene her, med
 * preparatene fra den eksisterende FEST-lesingen (`les_legemidler`), og får en
 * plan bare gjennom {@link kliniskDoseplan}, som stopper alt som ikke er en
 * klinisk plan: en regel som ikke er gyldig klinisk godkjent, en syntetisk
 * testregel, og preparatdata som ikke er en fersk FEST-kopi.
 * Modellberegningene og testdataene fra P4 og P5 når aldri hit; det håndheves
 * av `src/__tests__/verktoyapp.test.ts`.
 */
import type { Legemiddelutvalg } from '../legemiddeldata/lesing'
import type { Preparatgrunnlag } from './motor/byggesteiner'
import { festFerskhet, formvalgSomTrengs, kliniskDoseplan, type Doseplaninndata, type Doseplanresultat, type Formalternativer, type Formvalg } from './motor/plan'
import { festkoblinger, KARTLEGGING } from './register'
import type { Regel, Regelsett } from './regler/modell'
import type { Formuleringsklasse } from './festformuleringer'
import { medlemFor, REGELSETT, type Verktoyvalg } from './tilgjengelighet'

/** Det forskriveren har fylt inn, slik feltene står. Tas vare på når appen oppdateres; planen gjør aldri det. */
export interface Planskjema {
  startdose: string
  maldose: string
  /** `ÅÅÅÅ-MM-DD`, eller tom. */
  startdato: string
  /** Regelen (strategien) som er valgt når flere kan brukes. */
  regel: string
  bekreftet: string[]
  /** Unntakets id → om forholdet gjelder. Et unntak uten svar er ukjent. */
  pasientforhold: Record<string, boolean>
  /** Forløpets id → formuleringen og legemiddelformen som er valgt. */
  formvalg: Record<string, { klasse?: string; legemiddelform?: string }>
  godkjenningsfritak: boolean
}

export const TOMT_SKJEMA: Planskjema = {
  startdose: '',
  maldose: '',
  startdato: '',
  regel: '',
  bekreftet: [],
  pasientforhold: {},
  formvalg: {},
  godkjenningsfritak: false,
}

/** Et tall slik det er skrevet, med komma eller punktum; `undefined` når feltet er tomt eller ikke et positivt tall. */
export function lesDose(tekst: string): number | undefined {
  const t = tekst.trim().replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(t)) return undefined
  const x = Number(t)
  return x > 0 && Number.isFinite(x) ? x : undefined
}

/** Om regelen spør etter en måldose. Ingen regel har en skjult standardverdi. */
export const trengerMaldose = (r: Regel) => r.inndata.some((k) => k.navn === 'maldose')

/** Det som mangler før planen kan beregnes, i klartekst; tom når alt er fylt inn. */
export function mangler(r: Regel, skjema: Planskjema): string[] {
  const ut: string[] = []
  if (lesDose(skjema.startdose) === undefined) ut.push('Aktuell døgndose må fylles inn som et tall større enn 0.')
  if (trengerMaldose(r) && lesDose(skjema.maldose) === undefined) ut.push('Måldosen må fylles inn som et tall større enn 0.')
  if (skjema.startdato && !/^\d{4}-\d{2}-\d{2}$/.test(skjema.startdato)) ut.push('Startdatoen er ikke en gyldig dato.')
  return ut
}

/** Inndataene til motoren, fra valgene i verktøyet og skjemaet. */
export function inndataFor(r: Regel, valg: Verktoyvalg, skjema: Planskjema): Doseplaninndata {
  const formvalg: Record<string, Formvalg> = {}
  for (const [id, v] of Object.entries(skjema.formvalg)) {
    if (!r.plan.forlop.some((f) => f.id === id)) continue
    formvalg[id] = {
      ...(v.klasse && { klasse: v.klasse as Formuleringsklasse }),
      ...(v.legemiddelform && { legemiddelformer: [v.legemiddelform] }),
    }
  }
  const medlem = medlemFor(r, valg)
  const maldose = trengerMaldose(r) ? lesDose(skjema.maldose) : undefined
  const pasientforhold = Object.fromEntries(r.unntak.flatMap((u) => (u.id in skjema.pasientforhold ? [[u.id, skjema.pasientforhold[u.id]!]] : [])))
  return {
    startdose_mg: lesDose(skjema.startdose) ?? 0,
    ...(maldose !== undefined && { maldose_mg: maldose }),
    ...(skjema.startdato && { startdato: skjema.startdato }),
    ...(medlem && { medlem }),
    bekreftet: skjema.bekreftet.filter((id) => r.bekreftelser.some((b) => b.id === id)),
    pasientforhold,
    formvalg,
    godkjenningsfritak: skjema.godkjenningsfritak,
  }
}

/** Virkestoffene regelen trenger preparater for: valgene, og medlemmet for en gruppe. */
export function virkestofferFor(r: Regel, valg: Verktoyvalg): string[] {
  const nokler = r.plan.forlop.map((f) => (f.virkestoff.type === 'virkestoff' ? f.virkestoff.nokkel : medlemFor(r, valg)))
  return [...new Set(nokler.filter((n): n is string => !!n))].sort()
}

/** FEST-ID-ene som skal leses for regelen og valgene. */
export const festIderFor = (r: Regel, valg: Verktoyvalg): string[] => [...new Set(Object.values(festkoblinger(virkestofferFor(r, valg))).flat())].sort()

function grunnlagFor(r: Regel, valg: Verktoyvalg, utvalg: Legemiddelutvalg): Preparatgrunnlag {
  return { utvalg, koblinger: festkoblinger(virkestofferFor(r, valg)), overstyringer: KARTLEGGING.festoverstyringer }
}

const OSLO = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Oslo', year: 'numeric', month: '2-digit', day: '2-digit' })

/** Dagen i Norge for tidspunktet, `ÅÅÅÅ-MM-DD`: dagen preparatstatusen i FEST gjelder. */
export const osloDato = (naa: Date): string => OSLO.format(naa)

/** Valgene av formulering og legemiddelform skjemaet må be om før beregningen, med alternativene fra FEST. */
export function formvalgFor(r: Regel, valg: Verktoyvalg, skjema: Planskjema, utvalg: Legemiddelutvalg, naa: Date): Record<string, Formalternativer> {
  return formvalgSomTrengs(r, inndataFor(r, valg, skjema), grunnlagFor(r, valg, utvalg), osloDato(naa))
}

/** Doseplanen, bare når den er klinisk; ellers en stopp med grunnene. */
export function beregnPlan(r: Regel, valg: Verktoyvalg, skjema: Planskjema, utvalg: Legemiddelutvalg, naa: Date, regelsett: Regelsett = REGELSETT): Doseplanresultat {
  return kliniskDoseplan(r, inndataFor(r, valg, skjema), grunnlagFor(r, valg, utvalg), { idag: osloDato(naa), naa: naa.toISOString(), fagtekst: [] }, regelsett)
}

/**
 * Om en plan som er vist, fortsatt gjelder ved `naa`: den er klinisk,
 * FEST-kopien er fortsatt fersk, og preparatstatusen gjelder i dag. Ellers må
 * den beregnes på nytt.
 */
export function gjelderFortsatt(r: Doseplanresultat, naa: Date): boolean {
  return r.status === 'doseplan' && r.klinisk && r.sperre.length === 0 && r.fest.statusdato === osloDato(naa) && festFerskhet(r.fest, naa).length === 0
}
