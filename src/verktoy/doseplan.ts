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
import { festFerskhet, formvalgSomTrengs, kliniskDoseplan, type Doseplaninndata, type Doseplanresultat, type Formalternativer, type Formvalg, type Trinnvalg } from './motor/plan'
import { festkoblinger, KARTLEGGING } from './register'
import { inndatagrenser, inndatavilkar, kravtekst, medEnhet, omradetekst } from './regler/beregning'
import { justerbare, parametre, type Regel, type Regelsett, type Trinnvalgsvar } from './regler/modell'
import type { Formuleringsklasse } from './festformuleringer'
import { medlemFor, REGELSETT, settFor, type Verktoyvalg } from './tilgjengelighet'

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
  /** Spørsmålets id → forskriverens svar (ja eller nei). Et spørsmål uten svar stopper beregningen. */
  svar: Record<string, boolean>
  /** Forskriverens begrunnelse for valg som krever det; står i planen. */
  begrunnelse: string
  /** Forløpets id → formuleringen og legemiddelformen som er valgt. */
  formvalg: Record<string, { klasse?: string; legemiddelform?: string }>
  godkjenningsfritak: boolean
  /**
   * Parameterstien → forskriverens valg for en verdi regelen lar forskriveren
   * justere (f.eks. dager per trinn), slik feltet står. Tomt felt gir regelens
   * forslag; om valget er innenfor regelens område, avgjør beregningen.
   */
  justert: Record<string, string>
  /**
   * Dosene forskriveren har valgt for trinn som ikke kan gis nøyaktig
   * (`Fase.trinnvalg`), i trinnenes rekkefølge. Et valg gjelder bare fra dosen
   * det ble gjort fra; ellers sier planen at det ikke er brukt.
   */
  trinnvalg: Trinnvalgsvar[]
  /**
   * Valgene skjemaet er fylt ut for ({@link valgidentitet}). Skifter
   * virkestoffet eller formuleringen, begynner skjemaet på nytt, så ingen dose,
   * bekreftelse eller svar på et unntak følger med til andre valg.
   */
  gjelder: string
}

export const TOMT_SKJEMA: Planskjema = {
  startdose: '',
  maldose: '',
  startdato: '',
  regel: '',
  bekreftet: [],
  pasientforhold: {},
  svar: {},
  begrunnelse: '',
  formvalg: {},
  godkjenningsfritak: false,
  justert: {},
  trinnvalg: [],
  gjelder: '',
}

/** Identiteten til valgene: virkestoffene og formuleringene på begge sider. */
export const valgidentitet = (valg: Verktoyvalg): string =>
  JSON.stringify([valg.fra.nokkel, valg.fra.formulering, valg.til?.nokkel ?? null, valg.til?.formulering ?? null])

/** Skjemaet slik det gjelder for valgene `gjelder`: et skjema fylt ut for andre valg, begynner på nytt. */
export const skjemaFor = (s: Planskjema, gjelder: string): Planskjema => (s.gjelder === gjelder ? s : { ...TOMT_SKJEMA, gjelder })

/**
 * Skjemaet med en annen strategi. Alt som hører til regelen — måldosen,
 * bekreftelsene, svarene på unntakene og spørsmålene, formvalgene, justeringene,
 * begrunnelsen, valgene av dose per trinn og godkjenningsfritaket —
 * begynner på nytt; dosen pasienten bruker og startdatoen står.
 */
export const medRegel = (s: Planskjema, regel: string): Planskjema =>
  s.regel === regel ? s : { ...TOMT_SKJEMA, gjelder: s.gjelder, regel, startdose: s.startdose, startdato: s.startdato }

/**
 * Skjemaet med forskriverens valg av `mg` for trinnet i `t`. Valg for senere
 * trinn i samme forløp faller bort, fordi de ble gjort fra en plan som nå
 * endres.
 */
export const medTrinnvalg = (s: Planskjema, t: Pick<Trinnvalg, 'forlop' | 'trinn' | 'fra_mg'>, mg: number): Planskjema => ({
  ...s,
  trinnvalg: [...s.trinnvalg.filter((v) => v.forlop !== t.forlop || v.trinn < t.trinn), { forlop: t.forlop, trinn: t.trinn, fra_mg: t.fra_mg, mg }],
})

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
  for (const [sti, p] of justerbare(r)) {
    if (skjema.justert[sti]?.trim() && justertVerdi(skjema, sti) === undefined) ut.push(`${p.justerbar} må være et tall større enn 0, eller stå tomt for regelens forslag.`)
  }
  return ut
}

/** Spørsmålene der et ja krever en skriftlig begrunnelse. */
const sporsmalMedBegrunnelse = (r: Regel) => (r.sporsmal ?? []).filter((s) => s.krever_begrunnelse)

/** Forsiktighetsgrensene for dosene: en dose utenfor krever begrunnelse i stedet for å stoppe. */
const doserMedBegrunnelse = (r: Regel) => r.inndata.filter((k) => k.krever_begrunnelse)

/** Om et valg, svar eller en dose i regelen kan kreve en skriftlig begrunnelse; da viser skjemaet feltet for den. */
export const kanKreveBegrunnelse = (r: Regel) =>
  parametre(r.plan).some(([, p]) => (p.begrunnelseskrav ?? []).length > 0) || sporsmalMedBegrunnelse(r).length > 0 || doserMedBegrunnelse(r).length > 0

/** Når regelen krever begrunnelse, i klartekst: «Reduksjon per trinn over 25 %; …; dose utenfor rammen …». */
export const begrunnelseshjelp = (r: Regel): string =>
  [
    ...parametre(r.plan).flatMap(([sti, p]) => (p.begrunnelseskrav ?? []).map((k) => `${p.justerbar ?? sti} ${kravtekst(k, p, r.sporsmal)}`)),
    ...sporsmalMedBegrunnelse(r).map((s) => s.ja),
    ...doserMedBegrunnelse(r).map((k) => `${k.navn === 'startdose' ? 'Aktuell døgndose' : 'Måldose'} over ${inndatagrenser(k)}${inndatavilkar(k, r.sporsmal)}`),
  ].join('; ')

/** Verdiene forskriveren kan justere i regelen: stien, navnet og en hjelpetekst med forslaget og området. */
export const justeringsfelt = (r: Regel): { sti: string; navn: string; forslag: string; hjelp: string }[] =>
  justerbare(r).map(([sti, p]) => {
    const forslag = p.verdi === null ? '' : medEnhet(p.verdi, p)
    return { sti, navn: p.justerbar, forslag, hjelp: `${forslag ? `Regelens forslag er ${forslag}; tomt felt bruker forslaget. ` : ''}Regelen tillater ${omradetekst(p)}.` }
  })

/** Forskriverens valg for den justerbare verdien på `sti`; `undefined` når feltet er tomt eller ikke et tall. */
const justertVerdi = (skjema: Planskjema, sti: string) => lesDose(skjema.justert[sti] ?? '')

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
  const svar = Object.fromEntries((r.sporsmal ?? []).flatMap((x) => (x.id in skjema.svar ? [[x.id, skjema.svar[x.id]!]] : [])))
  const begrunnelse = kanKreveBegrunnelse(r) ? skjema.begrunnelse.trim() : ''
  const justert = Object.fromEntries(justerbare(r).flatMap(([sti]) => {
    const x = justertVerdi(skjema, sti)
    return x === undefined ? [] : [[sti, x]]
  }))
  return {
    startdose_mg: lesDose(skjema.startdose) ?? 0,
    ...(maldose !== undefined && { maldose_mg: maldose }),
    ...(skjema.startdato && { startdato: skjema.startdato }),
    ...(medlem && { medlem }),
    bekreftet: skjema.bekreftet.filter((id) => r.bekreftelser.some((b) => b.id === id)),
    pasientforhold,
    ...(Object.keys(svar).length > 0 && { svar }),
    ...(Object.keys(justert).length > 0 && { justert }),
    ...(begrunnelse && { begrunnelse }),
    ...(skjema.trinnvalg.length > 0 && { trinnvalg: skjema.trinnvalg.filter((v) => r.plan.forlop.some((f) => f.id === v.forlop)) }),
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
  return kliniskDoseplan(r, inndataFor(r, valg, skjema), grunnlagFor(r, valg, utvalg), { idag: osloDato(naa), naa: naa.toISOString(), fagtekst: [] }, settFor(r, regelsett))
}

/**
 * Om en plan som er vist, fortsatt gjelder ved `naa`: den er klinisk,
 * FEST-kopien er fortsatt fersk, og preparatstatusen gjelder i dag. Ellers må
 * den beregnes på nytt.
 */
export function gjelderFortsatt(r: Doseplanresultat, naa: Date): boolean {
  return r.status === 'doseplan' && r.klinisk && r.sperre.length === 0 && r.fest.statusdato === osloDato(naa) && festFerskhet(r.fest, naa).length === 0
}
