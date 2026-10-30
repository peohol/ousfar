/**
 * Doseplanmotoren for OUSFAR Verktøy (P5 i `docs/verktøy-utviklingsplan.md`):
 * fra en regel, inndata og preparatene i FEST til en doseplan med faktiske
 * preparater, eller en stopp med grunnene. Den samme motoren brukes av alle
 * tre verktøyene. Bakgrunnen og valgene står i
 * `docs/verktøy-p5-beregningsmotor.md`.
 *
 * Først beregnes den ideelle kurven med regelmotoren fra P4 (`beregn`). Så
 * finnes, for hvert forløp, de preparatene i FEST som kan brukes
 * (`byggesteiner.ts`), og for hver periode en døgndose som kan settes sammen
 * av dem og oppfyller regelens krav (`dosevalg.ts`). Depotinjeksjoner har sin
 * egen tidsmodell fra P4 og må gis med nøyaktig én hel injeksjon av et
 * preparat regelen nevner.
 *
 * Motoren gjetter aldri: mangler en gyldig regel, et brukbart preparat, et
 * valg av formulering eller form, eller en dose innenfor rammene, stopper den
 * og sier hvorfor. Hver dose i en plan har et spor til konkrete preparater i
 * FEST. Like inndata og like versjoner gir samme resultat, uansett rekkefølgen
 * dataene kommer i.
 *
 * En plan er bare klinisk når regelversjonen er gyldig klinisk godkjent, ikke
 * er en syntetisk testregel, og preparatene er fra en FEST-kopi som er
 * bekreftet fersk ({@link festFerskhet}; se {@link kliniskSperre}). Appen skal bare bruke
 * {@link kliniskDoseplan}, som stopper alt annet.
 */
import { FEST_FORELDET_ETTER_TIMER, festForeldet } from '../../legemiddeldata/referanser'
import { FORMULERINGSKLASSER, type Formuleringsklasse } from '../festformuleringer'
import { AVSLUTNING_FELLES, avrund, beregn, erIsoDato, fordelingstekst, hverTekst, injeksjonstidspunkt, utenBeregningLinje, utlosteKrav, valgtSuffiks, trinnvalgOmrade, type Forlopsresultat, type Injeksjon, type Kontroll, type Periode } from '../regler/beregning'
import { fingeravtrykk, godkjenningsfeil, kanonisk, sha256 } from '../regler/godkjenning'
import { parameterfeil, type Beregningsinndata, type Fase, type Forlop, type Parameter, type Regel, type Regelsett } from '../regler/modell'
import { byggesteiner, DOSEENHETER, norskDato, type Byggestein, type Preparatgrunnlag } from './byggesteiner'
import { doser, fordel, styrkevalg, velgSerie, type Dosekandidat, type Doseelement, type Periodevalg, type Styrkevalg } from './dosevalg'

/** Økes når doseplanen endres slik at like inndata kan gi et annet resultat. */
export const PLANMOTORVERSJON = 6

/** Id-ene til syntetiske testregler begynner slik; de kan aldri gi en klinisk plan. */
export const SYNTETISK_REGEL = 'syntetisk-'
/** Kilden til syntetiske testpreparater; bare `FEST` kan gi en klinisk plan. */
export const SYNTETISK_KILDE = 'Syntetiske testdata'

const EPS = 1e-9

/** Forskriverens valg for ett forløp når FEST har flere muligheter: formuleringen, legemiddelformene (FEST-koder) og preparatene (merkevare-ID-er). */
export interface Formvalg {
  klasse?: Formuleringsklasse
  legemiddelformer?: string[]
  preparater?: string[]
}

export interface Doseplaninndata extends Beregningsinndata {
  /** Forløpets id → valgene for det. */
  formvalg?: Record<string, Formvalg>
  /** Om preparater som krever godkjenningsfritak kan brukes. Uten et uttrykkelig ja brukes de ikke. */
  godkjenningsfritak?: boolean
}

/** OUSFAR-fagtekst som kan vises når beregningen stopper; bare publisert (godkjent) tekst vises, aldri en kildes tekst. */
export interface Fagtekst {
  fagside: string
  tittel: string
  tekst: string
  publisert: boolean
}

/** Det beregningen gjelder utenfor regelen: dagen preparatstatusen gjelder, tidspunktet FEST-kopiens alder måles fra, og fagtekst til en stopp. */
export interface Omgivelse {
  /** `ÅÅÅÅ-MM-DD`. */
  idag: string
  /** ISO-tidspunkt. */
  naa: string
  fagtekst?: Fagtekst[]
}

/** Én periode med døgndose: den ideelle dosen fra regelen og den som faktisk gis. */
export interface Praktiskperiode extends Periode {
  ideell_mg: number
  avvik_prosent: number
  elementer: Doseelement[]
  /** Når døgndosen skal fordeles (`fordeles`): dosene i mg, største først. */
  doser?: number[]
}

/**
 * Dosene forskriveren kan velge for et trinn som ikke kan gis nøyaktig
 * (`Fase.trinnvalg`): de nærmeste dosene som kan gis på hver side av den
 * beregnede, med faktisk reduksjon fra dosen før innenfor `omrade`.
 * Beregningen velger aldri selv; valget gis inn som `Beregningsinndata.trinnvalg`.
 */
export interface Trinnvalg {
  forlop: string
  virkestoff: string
  /** Trinnet, fra 1. */
  trinn: number
  /** Dagen trinnet starter. */
  fra_dag: number
  /** Dosen før trinnet, som reduksjonen regnes fra. */
  fra_mg: number
  /** Den beregnede dosen, som ikke kan gis nøyaktig. */
  beregnet_mg: number
  /** Valgområdet for faktisk reduksjon, i prosent. */
  omrade: [number, number]
  doser: Trinndose[]
}

export interface Trinndose {
  mg: number
  /** Faktisk reduksjon fra dosen før, i prosent. */
  prosent: number
  elementer: Doseelement[]
  /** Fordelingen når døgndosen skal fordeles. */
  doser?: number[]
  /** Om reduksjonen utløser et krav om begrunnelse. */
  krever_begrunnelse: boolean
}

export interface Praktiskinjeksjon extends Injeksjon {
  element: Doseelement
}

export interface Praktiskforlop extends Omit<Forlopsresultat, 'perioder' | 'injeksjoner'> {
  perioder: Praktiskperiode[]
  injeksjoner: Praktiskinjeksjon[]
  /** Toleransen som er brukt, i prosent; 0 når bare nøyaktige doser godtas. */
  toleranse_prosent: number
  /** Preparater i FEST for virkestoffet som ikke kan brukes i dette forløpet, med grunnen (P5.4). */
  begrensninger: string[]
}

interface Planversjoner {
  regel: { id: string; versjon: number; fingeravtrykk: string; godkjenning: Regel['godkjenning']['status'] }
  regelsett: { id: string; versjon: number } | null
  modell: number
  motor: number
  planmotor: number
  fest: { kilde: string; kildedato: string | null; kontrollert_kl: string | null; statusdato: string }
  /** SHA-256 av preparatene planen bruker, slik FEST beskrev dem. */
  preparatgrunnlag: string | null
  merknader: string[]
}

export type Doseplanresultat =
  | (Planversjoner & {
      status: 'doseplan'
      klinisk: boolean
      /** Hvorfor planen ikke er klinisk; tom når den er det. */
      sperre: string[]
      forbehold: string[]
      forlop: Praktiskforlop[]
      kontroller: Kontroll[]
      /** Hvert avvik fra den ideelle kurven, i klartekst (P5.6). */
      avvik: string[]
      /** Trinn der planen stopper fordi dosen ikke kan gis, men forskriveren kan velge en dose som kan gis. */
      trinnvalg?: Trinnvalg[]
    })
  | (Planversjoner & { status: 'stoppet'; klinisk: false; stoppgrunner: string[]; fagtekst: Fagtekst[]; trinnvalg?: Trinnvalg[] })

export const FORBEHOLD_LAGER = 'FEST viser hva som er registrert og markedsført, ikke hva apoteket har på lager.'
export const FORBEHOLD_DOGNDOSE = 'Dosene er døgndoser; fordelingen over døgnet er ikke en del av regelen, unntatt der planen viser den fordi preparatomtalen krever det.'
export const FORBEHOLD_IKKE_KLINISK = 'Modellberegning, ikke en klinisk doseplan. Den skal ikke vises i appen.'
export const FORBEHOLD_KLINISK = 'Beregnet etter en klinisk godkjent regelversjon. Den erstatter ikke klinisk vurdering av den enkelte pasient.'

const tall = (x: number) => String(avrund(x)).replace('.', ',')
const dager = (p: { fra: number; til: number | null }) => (p.til === null ? `fra dag ${p.fra}` : p.til === p.fra ? `dag ${p.fra}` : `dag ${p.fra}–${p.til}`)
/** «, annenhver dag» når dosen ikke gis daglig. */
const hverSuffiks = (p: { hver?: number }) => (p.hver ? ` ${hverTekst(p.hver)}` : '')
/** «, fordelt på 2 doser: 100 + 50 mg (ulik fordeling)» når døgndosen er fordelt; en ulik fordeling merkes (P7.5, beslutning P7-B). */
export const fordelingSuffiks = (p: { doser?: number[] }) =>
  p.doser ? `, fordelt på ${p.doser.length} doser: ${p.doser.map(tall).join(' + ')} mg${p.doser.some((d) => Math.abs(d - p.doser![0]!) > EPS) ? ' (ulik fordeling)' : ''}` : ''

/**
 * Hvor langt FEST-kontrollen kan ligge foran klokken her før tidsstemplet
 * ikke godtas (ulike klokker). En teknisk driftsregel, ikke en klinisk grense.
 */
export const KLOKKEAVVIK_MINUTTER = 5
/** Et ISO-tidspunkt: dato, eventuelt klokkeslett med sekunder, brøkdeler og tidssone. */
const ISO_TIDSPUNKT = /^(\d{4}-\d{2}-\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?(Z|[+-](\d{2}):(\d{2}))?)?$/
const DOGN = 86_400_000

/**
 * Kalenderdatoen i `x` når hele tidspunktet er gyldig, ellers `null`. Datoen
 * kontrolleres før tidspunktet tolkes, så `2026-02-30` ikke flyttes til mars.
 * `medSone` krever klokkeslett og tidssone (kontrolltidspunktet); kildedatoen
 * fra FEST lagres som dato og klokkeslett uten tidssone.
 */
function tidspunktdato(x: string, medSone: boolean): string | null {
  const m = ISO_TIDSPUNKT.exec(x)
  if (!m || !erIsoDato(m[1])) return null
  const [, dato, t, min, sek, sone, st, sm] = m
  if (medSone && sone === undefined) return null
  if (t !== undefined && (Number(t) > 23 || Number(min) > 59 || Number(sek ?? 0) > 59)) return null
  if (st !== undefined && (Number(st) > 23 || Number(sm) > 59)) return null
  return dato!
}

/** Hvorfor tidsstemplene til FEST-kopien ikke kan brukes i det hele tatt; tom når de er gyldige. */
function festdatofeil(utvalg: Pick<Preparatgrunnlag['utvalg'], 'kontrollert_kl' | 'kildedato'>): string[] {
  const { kontrollert_kl: kl, kildedato } = utvalg
  if (!kl || !kildedato) return ['Det finnes ingen vellykket henting av FEST å regne med; preparatene kan ikke bekreftes.']
  const feil: string[] = []
  const kontrollert = tidspunktdato(kl, true) === null ? NaN : Date.parse(kl)
  if (Number.isNaN(kontrollert)) feil.push(`Tidspunktet FEST sist ble kontrollert («${kl}») er ikke et gyldig tidspunkt.`)
  const uttrekk = tidspunktdato(kildedato, false)
  if (uttrekk === null) feil.push(`Kildedatoen til FEST-kopien («${kildedato}») er ikke en gyldig dato.`)
  // Ett døgns slingring for tidssonen kontrolltidspunktet er skrevet i.
  else if (!Number.isNaN(kontrollert) && uttrekk > new Date(kontrollert + DOGN).toISOString().slice(0, 10)) {
    feil.push(`Kildedatoen til FEST-kopien (${norskDato(uttrekk)}) ligger etter tidspunktet den ble kontrollert.`)
  }
  return feil
}

/**
 * Hvorfor FEST-kopien ikke er bekreftet fersk ved `naa`; tom når den er det.
 * Kravet er positivt: kontrolltidspunktet og kildedatoen må være gyldige, og
 * kontrollen må ligge mellom {@link KLOKKEAVVIK_MINUTTER} minutter fram og
 * {@link FEST_FORELDET_ETTER_TIMER} timer tilbake i tid.
 */
export function festFerskhet(utvalg: Pick<Preparatgrunnlag['utvalg'], 'kontrollert_kl' | 'kildedato'>, naa: Date): string[] {
  const feil = festdatofeil(utvalg)
  if (feil.length > 0) return feil
  if (Number.isNaN(naa.getTime())) return ['Tidspunktet beregningen gjøres er ikke gyldig, så FEST-kopiens alder kan ikke bekreftes.']
  const alder = naa.getTime() - Date.parse(utvalg.kontrollert_kl!)
  if (alder < -KLOKKEAVVIK_MINUTTER * 60_000) return [`FEST-kopien oppgir å være kontrollert ${utvalg.kontrollert_kl}, fram i tid; tidsstemplet kan ikke stoles på.`]
  if (alder > FEST_FORELDET_ETTER_TIMER * 3_600_000) return [festForeldet(utvalg, naa)!]
  return []
}

/** Hvorfor en plan etter `regel` med preparatene i `utvalg` ikke kan være klinisk; tom når den kan. */
export function kliniskSperre(regel: Regel, utvalg: Preparatgrunnlag['utvalg'], naa: Date): string[] {
  const sperre: string[] = []
  if (regel.id.startsWith(SYNTETISK_REGEL)) sperre.push('Regelen er en syntetisk testregel.')
  sperre.push(...godkjenningsfeil(regel))
  if (utvalg.kilde !== 'FEST') sperre.push(`Preparatene er fra «${utvalg.kilde}», ikke fra FEST.`)
  sperre.push(...festFerskhet(utvalg, naa))
  return sperre
}

class Stopp extends Error {}

/** Verdien til en parameter i regelens dosevalg; stopper når den mangler eller er ugyldig. */
function dosegrense(p: Parameter | undefined, sti: string): number | null {
  if (!p) return null
  if (p.verdi === null) throw new Stopp(`Verdien ${sti} mangler og må avklares faglig.`)
  const feil = parameterfeil(p, sti)
  if (feil) throw new Stopp(`Verdien ${sti} er ugyldig: ${feil}.`)
  return p.verdi
}

const listeOg = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} og ${xs.at(-1)}`)

/** Om preparatet ligger utenfor det forløpet gjelder: administrasjonsveien, og formuleringen, varenavnet og legemiddelformen når regelen avgrenser dem. */
function utenforForlop(def: Forlop, b: Byggestein): boolean {
  if (def.administrasjon === 'peroral') {
    if (!(b.klasse === 'peroral' || b.klasse === 'peroral_modifisert') || !b.administrasjonsveier.includes('Oral bruk')) return true
  } else if (b.klasse !== 'depotinjeksjon') return true
  if (def.preparater && !def.preparater.includes(b.varenavn)) return true
  if (def.legemiddelformer && !def.legemiddelformer.includes(b.legemiddelform?.kode ?? '')) return true
  return !!def.klasser && !def.klasser.includes(b.klasse)
}

/** Preparatene som kan brukes i forløpet, etter regelens og forskriverens avgrensninger, og begrensningene for resten. */
function utvalgFor(def: Forlop, steiner: Byggestein[], valg: Formvalg, fritak: boolean): { brukbare: Byggestein[]; begrensninger: string[] } {
  const begrensninger: string[] = []
  const brukbare: Byggestein[] = []
  for (const b of steiner) {
    if (utenforForlop(def, b)) continue
    if (valg.klasse && b.klasse !== valg.klasse) continue
    if (valg.legemiddelformer && !valg.legemiddelformer.includes(b.legemiddelform?.kode ?? '')) continue
    if (valg.preparater && !valg.preparater.includes(b.id)) continue
    const grunner = [...b.begrensninger]
    if (b.registrering === 'godkjenningsfritak' && !fritak) grunner.push('krever godkjenningsfritak, som ikke er valgt')
    if (grunner.length > 0) begrensninger.push(`${b.navn_form_styrke}: ${grunner.join('; ')}`)
    else brukbare.push(b)
  }
  return { brukbare, begrensninger }
}

/** Som {@link utvalgFor}, men stopper med grunnen når ingen preparater kan brukes. */
function preparaterFor(def: Forlop, virkestoff: string, steiner: Byggestein[], valg: Formvalg, fritak: boolean): { brukbare: Byggestein[]; begrensninger: string[] } {
  const { brukbare, begrensninger } = utvalgFor(def, steiner, valg, fritak)
  if (brukbare.length === 0) {
    const finnes = steiner.filter((b) => !utenforForlop(def, b))
    const depot = def.preparater ? ` (${def.preparater.join(', ')})` : ''
    const [hva, bestemt] = def.administrasjon === 'peroral' ? ['perorale preparater', 'de perorale preparatene'] : [`depotpreparater${depot}`, `depotpreparatene${depot}`]
    throw new Stopp(
      finnes.length === 0
        ? `FEST har ingen ${hva} av ${virkestoff}. Det finnes ingen bekreftet norsk løsning, og beregningen antar ikke at noe er tilgjengelig.`
        : `Ingen av ${bestemt} av ${virkestoff} i FEST kan brukes${valg.klasse || valg.legemiddelformer || valg.preparater ? ' med valgene som er gjort' : ''}: ${begrensninger.join(' · ') || 'ingen passer valgene'}.`,
    )
  }
  return { brukbare, begrensninger: begrensninger.sort() }
}

/** At preparatene ikke spenner over flere formuleringer eller former uten at forskriveren har valgt. */
function entydig(f: string, virkestoff: string, brukbare: Byggestein[], valg: Formvalg) {
  const klasser = [...new Set(brukbare.map((b) => b.klasse))].sort()
  if (klasser.length > 1) {
    throw new Stopp(`${virkestoff} (${f}) finnes i flere formuleringer (${listeOg(klasser.map((k) => `${FORMULERINGSKLASSER[k].toLowerCase()} [${k}]`))}); formuleringen må velges, beregningen velger ikke selv.`)
  }
  const former = [...new Map(brukbare.map((b) => [b.legemiddelform?.kode ?? '', b.legemiddelform?.tekst ?? '(uten form)'])).entries()].sort()
  if (former.length > 1 && !valg.legemiddelformer) {
    throw new Stopp(`${virkestoff} (${f}) finnes i flere legemiddelformer (${listeOg(former.map(([k, t]) => `${t} [${k}]`))}); formen må velges, beregningen blander dem ikke av seg selv.`)
  }
}

/** Det forskriveren kan velge mellom i ett forløp: formuleringene og legemiddelformene (FEST-koder). */
export interface Formalternativer {
  klasser: { kode: Formuleringsklasse; navn: string }[]
  legemiddelformer: { kode: string; navn: string }[]
}

/**
 * Forløpene der preparatene i FEST spenner over flere formuleringer eller
 * legemiddelformer, med alternativene, så skjemaet kan be om valget før
 * beregningen (P6.6). En liste med ett alternativ eller færre trenger ikke
 * noe valg. Formene gjelder formuleringen som er valgt; uten valg alle.
 */
export function formvalgSomTrengs(regel: Regel, inndata: Doseplaninndata, grunnlag: Preparatgrunnlag, idag: string): Record<string, Formalternativer> {
  const ut: Record<string, Formalternativer> = {}
  for (const def of regel.plan.forlop) {
    const virkestoff = def.virkestoff.type === 'virkestoff' ? def.virkestoff.nokkel : inndata.medlem
    if (!virkestoff) continue
    const valg = inndata.formvalg?.[def.id] ?? {}
    const { brukbare } = utvalgFor(def, byggesteiner(grunnlag, virkestoff, idag), {}, inndata.godkjenningsfritak === true)
    const klasser = [...new Set(brukbare.map((b) => b.klasse))].sort().map((kode) => ({ kode, navn: FORMULERINGSKLASSER[kode] }))
    const former = [...new Map(brukbare.filter((b) => !valg.klasse || b.klasse === valg.klasse).map((b) => [b.legemiddelform?.kode ?? '', b.legemiddelform?.tekst ?? '(uten form)'])).entries()]
      .sort()
      .map(([kode, navn]) => ({ kode, navn }))
    if (klasser.length > 1 || former.length > 1) ut[def.id] = { klasser: klasser.length > 1 ? klasser : [], legemiddelformer: former.length > 1 ? former : [] }
  }
  return ut
}

/**
 * Styrkevalgene med bare preparater FEST viser som markedsført hele perioden:
 * en meldt avregistrering eller midlertidig utgang før periodens siste dag
 * utelukker preparatet. Uten startdato, og for et vedlikehold uten slutt, kan
 * det ikke vises, så da utelukker enhver meldt endring preparatet.
 */
function tilgjengelig(v: Styrkevalg[], til_dato: string | null): Styrkevalg[] {
  return v
    .map((s) => ({ ...s, preparater: s.preparater.filter((b) => !b.marked_til || (til_dato !== null && b.marked_til > til_dato)) }))
    .filter((s) => s.preparater.length > 0)
    .map((s) => ({ ...s, deling: s.preparater.reduce((d, b) => (b.deling > d ? b.deling : d), 1 as 1 | 2 | 4) }))
}

/**
 * Forklaringen når ingen dose i en periode oppfyller kravene: de nærmeste
 * dosene som kan settes sammen, med avviket fra den ideelle og, når dosen før
 * er kjent (`fra`), den faktiske reduksjonen fra den.
 */
function ingenDose(f: Forlopsresultat, p: Periode, valg: Styrkevalg[], alleValg: Styrkevalg[], tol: number, grenser: string, fra?: number, tv?: Trinnvalg | null): string {
  const brukbare = new Set(valg.flatMap((v) => v.preparater.map((b) => b.id)))
  const utenfor = alleValg.flatMap((v) => v.preparater).filter((b) => !brukbare.has(b.id) && b.marked_til)
  const alle = doser(valg, EPS, p.mg * 2 + Math.max(...valg.map((v) => v.mg), 0))
  const under = alle.filter((k) => k.mg < p.mg - EPS).at(-1)
  const over = alle.find((k) => k.mg > p.mg + EPS)
  const reduksjon = (mg: number) => (fra !== undefined && mg < fra - EPS ? `, faktisk reduksjon ${tall((1 - mg / fra) * 100)} % fra ${tall(fra)} mg` : '')
  const naermeste = [under, over].filter((k): k is Dosekandidat => !!k).map((k) => `${tall(k.mg)} mg (${k.mg > p.mg ? '+' : ''}${tall(((k.mg - p.mg) / p.mg) * 100)} %${reduksjon(k.mg)})`)
  return (
    `${f.virkestoff} ${dager(p)}: den ideelle dosen ${tall(p.mg)} mg${hverSuffiks(p)} kan ikke gis med preparatene i FEST ${tol > 0 ? `innenfor ±${tall(tol * 100)} %` : 'nøyaktig'}${grenser}. ` +
    (naermeste.length > 0 ? `Nærmeste doser som kan settes sammen: ${naermeste.join(' og ')}. ` : '') +
    (utenfor.length > 0 ? `${listeOg(utenfor.map((b) => b.navn_form_styrke))} brukes ikke her, fordi FEST melder at ${utenfor.length === 1 ? 'det' : 'de'} ikke er markedsført hele perioden. ` : '') +
    (tv === undefined ? ANNEN_DOSE : trinnvalgtekst(tv))
  )
}

const ANNEN_DOSE = 'En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.'

/** Det stoppet sier når regelen lar forskriveren velge dosen for trinnet (`tv`), eller når ingen dose er innenfor valgområdet (`null`). */
function trinnvalgtekst(tv: Trinnvalg | null): string {
  if (!tv) return `Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. ${ANNEN_DOSE}`
  const valg = tv.doser.map((d) => `${tall(d.mg)} mg (−${tall(d.prosent)} %${d.krever_begrunnelse ? ', krever begrunnelse' : ''})`)
  return `Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra ${tall(tv.fra_mg)} mg innenfor valgområdet ${tall(tv.omrade[0])}–${tall(tv.omrade[1])} %: ${valg.join(' eller ')}. Beregningen velger ikke selv.`
}

/** Nedtrappingsfasen i forløpet der forskriveren kan velge dosen per trinn. */
const trinnvalgFase = (def: Forlop) => def.faser.find((x): x is Extract<Fase, { type: 'nedtrapping' }> => x.type === 'nedtrapping' && !!x.trinnvalg)

/**
 * Dosene forskriveren kan velge for periode `p` (trinn `p.trinn`) fra `fra`
 * mg: blant dosene som kan gis og fordeles, den nærmeste under og den
 * nærmeste over den beregnede, når den faktiske reduksjonen er innenfor
 * valgområdet og dosen vises nøyaktig. `null` når ingen er det.
 */
function trinnvalgFor(def: Forlop, f: Forlopsresultat, p: Periode, v: Styrkevalg[], fra: number, min: number | null, fordelt: (k: Dosekandidat) => number[] | null | undefined, svar: Beregningsinndata['svar']): Trinnvalg | null {
  const fase = trinnvalgFase(def)!
  const omrade = trinnvalgOmrade(fase.strategi, fra)!
  const prosent = (mg: number) => (1 - mg / fra) * 100
  const mulige = doser(v, Math.max(fra * (1 - omrade[1] / 100), min ?? 0, EPS) - EPS * fra, fra * (1 - omrade[0] / 100) + EPS * fra).filter(
    (k) => k.mg < fra - EPS && Math.abs(avrund(k.mg) - k.mg) < EPS && prosent(k.mg) >= omrade[0] - EPS && prosent(k.mg) <= omrade[1] + EPS && fordelt(k) !== null,
  )
  const naermeste = [mulige.filter((k) => k.mg < p.mg).at(-1), mulige.find((k) => k.mg > p.mg)].filter((k): k is Dosekandidat => !!k)
  if (naermeste.length === 0) return null
  const s = fase.strategi
  return {
    forlop: f.id,
    virkestoff: f.virkestoff,
    trinn: p.trinn!,
    fra_dag: p.fra,
    fra_mg: fra,
    beregnet_mg: p.mg,
    omrade,
    doser: naermeste.map((k) => ({
      mg: k.mg,
      prosent: prosent(k.mg),
      elementer: k.elementer,
      ...(p.fordeles && { doser: fordelt(k)! }),
      krever_begrunnelse: s.type === 'prosent_av_aktuell' && utlosteKrav(s.prosent, prosent(k.mg), svar).length > 0,
    })),
  }
}

/** Hvorfor perioden ikke kan gis når døgndosen må fordeles og ingen dose som kan gis, kan fordeles slik preparatomtalen krever. */
const ingenFordeling = (f: Forlopsresultat, p: Periode, over: number | null) =>
  `${f.virkestoff} ${dager(p)}: døgndosen ${tall(p.mg)} mg skal gis ${fordelingstekst(p.fordeles!)}${over !== null ? `, hver høyst ${tall(over)} mg` : ''} (preparatomtalen), men ingen nøyaktig dose med preparatene i FEST kan fordeles slik.` +
  ' En annen dose eller fordeling er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.'

/** Hvorfor perioden ikke kan gis i kurvens retning, når hver dose for seg kan gis. */
const motKurven = (f: Forlopsresultat, p: Periode) =>
  `${f.virkestoff} ${dager(p)}: den ideelle dosen ${tall(p.mg)} mg kan gis, men ikke i kurvens retning (en praktisk dose ville økt under nedtrapping). En annen dose er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.`

function praktiskForlop(def: Forlop, f: Forlopsresultat, g: Preparatgrunnlag, inndata: Doseplaninndata, idag: string, kontroller: Kontroll[], trinnvalg: Trinnvalg[]): Praktiskforlop {
  const grunn = { ...f, toleranse_prosent: 0, begrensninger: [] as string[] }
  if (f.perioder.length === 0 && f.injeksjoner.length === 0) return { ...grunn, perioder: [], injeksjoner: [] }
  const valg = inndata.formvalg?.[f.id] ?? {}
  if (def.administrasjon === 'depotinjeksjon' && !def.preparater?.length) {
    throw new Stopp(`Regelen sier ikke hvilket depotpreparat ${f.virkestoff} (${f.id}) gjelder; FEST skiller ikke depotformuleringer med ulike intervaller i formen, så beregningen velger ikke selv.`)
  }
  const { brukbare, begrensninger } = preparaterFor(def, f.virkestoff, byggesteiner(g, f.virkestoff, idag), valg, inndata.godkjenningsfritak === true)
  entydig(f.id, f.virkestoff, brukbare, valg)
  const alleValg = styrkevalg(brukbare)
  const ut: Praktiskforlop = { ...grunn, begrensninger, perioder: [], injeksjoner: [] }
  for (const b of brukbare) {
    if (b.marked_til) ut.begrensninger.push(`${b.navn_form_styrke}: FEST melder at det ikke er markedsført fra ${norskDato(b.marked_til)}; brukes bare i perioder som slutter før`)
  }
  ut.begrensninger.sort()
  const sluttdato = (p: { til: number | null; til_dato?: string | null }) => (inndata.startdato && p.til !== null ? (p.til_dato ?? null) : null)

  // Perorale døgndoser: innenfor toleransen og dosegrensene, i kurvens retning.
  if (f.perioder.length > 0) {
    const d = def.dosevalg
    const tol = (dosegrense(d?.avvik_prosent, `${f.id}.dosevalg.avvik_prosent`) ?? 0) / 100
    const maks = dosegrense(d?.maks_mg, `${f.id}.dosevalg.maks_mg`)
    const min = dosegrense(d?.min_mg, `${f.id}.dosevalg.min_mg`)
    if (maks !== null && min !== null && min > maks) throw new Stopp(`Regelen er ugyldig: ${f.id}.dosevalg har minste dose over største.`)
    const grenser = [min !== null && ` og ikke under ${tall(min)} mg`, maks !== null && ` og ikke over ${tall(maks)} mg`].filter(Boolean).join('')
    // Døgndoser over grensen for én dose må kunne fordeles på doser som hver kan gis (preparatomtalen).
    const over = dosegrense(def.fordeling?.over_mg, `${f.id}.fordeling.over_mg`)
    const fordelt = (p: Periode, k: Dosekandidat) => (p.fordeles ? fordel(k, p.fordeles, over ?? Infinity) : undefined)
    ut.toleranse_prosent = tol * 100
    // En plan uten nulltrinn stopper ved første trinn som ikke kan gis (P7.5, beslutning 3); en annen plan stopper helt.
    const avkortbar = !!f.avslutning
    const start = def.utgangsdose === 'startdose' ? inndata.startdose_mg : 0
    const perioder: Periodevalg[] = []
    let stans: string | undefined
    const kanGis = (v: Styrkevalg[], mg: number) => doser(v, Math.max(mg * (1 - tol), min ?? 0, EPS), Math.min(mg * (1 + tol), maks ?? Infinity))
    const valgbar = !!trinnvalgFase(def)
    for (const [i, p] of f.perioder.entries()) {
      const v = tilgjengelig(alleValg, sluttdato(p))
      const forrige = i === 0 ? start : f.perioder[i - 1]!.mg
      // Et valgt trinn gjelder bare når den beregnede dosen faktisk ikke kan gis.
      if (p.valgt && kanGis(v, p.valgt.beregnet_mg).some((k) => Math.abs(k.mg - p.valgt!.beregnet_mg) < EPS * Math.max(1, k.mg) && fordelt(p, k) !== null)) {
        throw new Stopp(`${f.virkestoff} ${dager(p)}: den beregnede dosen ${tall(p.valgt.beregnet_mg)} mg for trinn ${p.trinn} kan gis med preparatene i FEST, så valget ${tall(p.mg)} mg gjelder ikke. Fjern valget.`)
      }
      const innenfor = kanGis(v, p.mg).filter((k) => Math.abs(k.mg - p.mg) <= p.mg * tol + EPS * Math.max(1, p.mg))
      const kandidater = innenfor.filter((k) => fordelt(p, k) !== null)
      if (kandidater.length === 0) {
        // Et valg som ikke kan gis (preparatet er utgått eller valgene endret), avvises; planen stopper ikke stille ved trinnet før (P7.5, beslutning P7-A).
        if (p.valgt) throw new Stopp(`${f.virkestoff} ${dager(p)}: den valgte dosen ${tall(p.mg)} mg for trinn ${p.trinn} kan ikke gis${p.fordeles ? ' og fordeles' : ''} med preparatene i FEST for perioden. Fjern valget, og velg på nytt.`)
        // Kan en nøyaktig dose gis, men ikke fordeles, er det fordelingen som stopper planen.
        const fordelingen = !!p.fordeles && innenfor.length > 0
        // Lar regelen forskriveren velge en dose som kan gis, regnes de nærmeste ut; et valgt trinn tilbys ikke på nytt.
        const tv = valgbar && avkortbar && p.trinn !== undefined && !p.valgt ? trinnvalgFor(def, f, p, v, forrige, min, (k) => fordelt(p, k), inndata.svar) : undefined
        const hvorfor = fordelingen
          ? ingenFordeling(f, p, over) + (tv === undefined ? '' : ` ${trinnvalgtekst(tv)}`)
          : ingenDose(f, p, v, alleValg, tol, grenser, forrige, tv)
        if (tv) trinnvalg.push(tv)
        if (!avkortbar || i === 0) throw new Stopp(hvorfor)
        stans = fordelingen || tv !== undefined ? hvorfor : ingenDose(f, p, v, alleValg, tol, grenser)
        break
      }
      perioder.push({ ideell: p.mg, kandidater })
    }
    // Retningen gjelder fra dosen forløpet starter med, også i første periode.
    let serie = velgSerie(perioder, start)
    while (!serie && avkortbar && perioder.length > 1) {
      stans = motKurven(f, f.perioder[perioder.length - 1]!)
      perioder.pop()
      serie = velgSerie(perioder, start)
    }
    if (!serie) {
      const forste = velgSerie(perioder.slice(0, 1), start) === null
      throw new Stopp(
        forste
          ? `${f.virkestoff} (${f.id}): første periode er ideelt ${tall(perioder[0]!.ideell)} mg, men ingen dose innenfor rammene er ${perioder[0]!.ideell < start ? 'lavere' : 'høyere'} enn dosen forløpet starter med (${tall(start)} mg). En annen plan krever en ny faglig beslutning.`
          : `${f.virkestoff} (${f.id}): hver periode kan gis innenfor rammene, men ikke i kurvens retning (en praktisk dose ville økt under nedtrapping eller sunket under opptrapping). En annen plan krever en ny faglig beslutning.`,
      )
    }
    ut.perioder = f.perioder.slice(0, serie.length).map((p, i) => ({
      ...p,
      ideell_mg: p.mg,
      mg: serie![i]!.mg,
      avvik_prosent: ((serie![i]!.mg - p.mg) / p.mg) * 100,
      elementer: serie![i]!.elementer,
      ...(p.fordeles && { doser: fordelt(p, serie![i]!)! }),
    }))
    if (serie.length < f.perioder.length) {
      // Siste trinn som kan gis, fortsetter til planen revurderes.
      const sist = ut.perioder.at(-1)!
      sist.til = null
      if (sist.til_dato !== undefined) sist.til_dato = null
      ut.avslutning = `${stans} Planen stopper derfor ved trinnet før: fra dag ${sist.fra} står pasienten på ${tall(sist.mg)} mg${hverSuffiks(sist)}${fordelingSuffiks(sist)} av ${f.virkestoff} til planen revurderes. ${AVSLUTNING_FELLES}`
      ut.avslutning_kort = `neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt`
    }
    if (ut.perioder.some((p) => p.doser)) {
      kontroller.push({
        krav: `${over !== null ? `Døgndoser av ${f.virkestoff} over ${tall(over)} mg` : `Døgndosene av ${f.virkestoff}`} er ${fordelingstekst(def.fordeling!.antall)}${over !== null ? `, hver høyst ${tall(over)} mg` : ''}; en ulik fordeling er merket`,
        oppfylt: true,
        detalj: ut.perioder.filter((p) => p.doser).map((p) => `${dager(p)}: ${p.doser!.map(tall).join(' + ')} mg`).join('; '),
      })
    }
    kontroller.push({
      krav: `Hver døgndose av ${f.virkestoff} kan gis med preparater i FEST, ${tol > 0 ? `høyst ±${tall(tol * 100)} % fra den ideelle` : 'nøyaktig'}${grenser}`,
      oppfylt: true,
      detalj: `${ut.perioder.length} perioder; største avvik ${tall(Math.max(...ut.perioder.map((p) => Math.abs(p.avvik_prosent))))} %.`,
    })
  }

  // Depot: nøyaktig én hel injeksjon med dosen, fra preparatene regelen nevner.
  for (const i of f.injeksjoner) {
    const v = tilgjengelig(alleValg, inndata.startdato && i.dag !== null ? (i.dato ?? null) : null).filter((s) => s.doseenhet === 'injeksjon' && Math.abs(s.mg - i.mg) < EPS)
    const valgt = v.sort((a, b) => Number(a.registrering === 'godkjenningsfritak') - Number(b.registrering === 'godkjenningsfritak'))[0]
    if (!valgt) {
      const finnes = [...new Set(alleValg.filter((s) => s.doseenhet === 'injeksjon').map((s) => s.mg))].sort((a, b) => a - b)
      const naar = i.dag === null ? 'vedlikeholdet' : `injeksjonen dag ${i.dag}`
      throw new Stopp(
        `${f.virkestoff} (${f.id}): ${naar} er ${tall(i.mg)} mg, men FEST har ingen brukbar injeksjon med den styrken (${finnes.length > 0 ? `brukbare styrker: ${finnes.map(tall).join(', ')} mg` : 'ingen brukbare styrker'}). Deler av eller flere injeksjoner settes ikke sammen.`,
      )
    }
    ut.injeksjoner.push({ ...i, element: { styrke: valgt.nokkel, mg: valgt.mg, doseenhet: 'injeksjon', antall: 1, preparater: valgt.preparater } })
  }
  if (f.injeksjoner.length > 0) {
    kontroller.push({ krav: `Hver injeksjon av ${f.virkestoff} er én hel injeksjon med nøyaktig dosen, av ${listeOg(def.preparater ?? [])}`, oppfylt: true, detalj: `${f.injeksjoner.length} injeksjoner.` })
  }
  return ut
}

/** Avvikene fra den ideelle kurven i klartekst. */
function avvikstekster(forlop: Praktiskforlop[]): string[] {
  const ut: string[] = []
  for (const f of forlop) {
    for (const [i, p] of f.perioder.entries()) {
      if (p.valgt) ut.push(`${f.virkestoff} ${dager(p)}: ${tall(p.mg)} mg, valgt av forskriveren fordi den beregnede dosen ${tall(p.valgt.beregnet_mg)} mg ikke kan gis; faktisk reduksjon ${tall(p.valgt.prosent)} % fra dosen før.`)
      if (Math.abs(p.mg - p.ideell_mg) > EPS * Math.max(1, p.ideell_mg)) {
        ut.push(`${f.virkestoff} ${dager(p)}: ${tall(p.mg)} mg i stedet for ${tall(p.ideell_mg)} mg (${p.avvik_prosent > 0 ? '+' : ''}${tall(p.avvik_prosent)} %).`)
      }
      const forrige = f.perioder[i - 1]
      if (forrige && Math.abs(forrige.mg - p.mg) < EPS && Math.abs(forrige.ideell_mg - p.ideell_mg) > EPS) {
        ut.push(`${f.virkestoff} ${dager(p)}: samme dose som perioden før, selv om den ideelle dosen endres; trinnet blir i praksis lengre.`)
      }
    }
  }
  return ut
}

/**
 * Beregner doseplanen for `regel` og `inndata` med preparatene i
 * `grunnlag`. Kaster aldri; en feil gir en kontrollert stopp.
 */
export function beregnDoseplan(regel: Regel, inndata: Doseplaninndata, grunnlag: Preparatgrunnlag, omgivelse: Omgivelse, regelsett?: Regelsett): Doseplanresultat {
  const { utvalg } = grunnlag
  const merknader: string[] = []
  let ideell: ReturnType<typeof beregn> | undefined
  const versjoner = (preparatgrunnlag: string | null = null): Planversjoner => ({
    regel: { id: regel.id, versjon: regel.versjon, fingeravtrykk: fingeravtrykk(regel), godkjenning: regel.godkjenning.status },
    regelsett: regelsett ? { id: regelsett.id, versjon: regelsett.versjon } : null,
    modell: ideell?.modell ?? 0,
    motor: ideell?.motor ?? 0,
    planmotor: PLANMOTORVERSJON,
    fest: { kilde: utvalg.kilde, kildedato: utvalg.kildedato, kontrollert_kl: utvalg.kontrollert_kl, statusdato: omgivelse.idag },
    preparatgrunnlag,
    merknader,
  })
  const stopp = (grunner: string[]): Doseplanresultat => ({
    ...versjoner(),
    status: 'stoppet',
    klinisk: false,
    stoppgrunner: grunner,
    fagtekst: (omgivelse.fagtekst ?? []).filter((t) => t.publisert === true),
  })

  // P5.1: preparatene må komme fra en vellykket henting av FEST (eller være merkede testdata).
  const naa = new Date(omgivelse.naa)
  const forhand: string[] = []
  if (!erIsoDato(omgivelse.idag)) forhand.push(`Datoen preparatstatusen gjelder («${String(omgivelse.idag)}») er ikke en gyldig dato.`)
  if (Number.isNaN(naa.getTime())) forhand.push(`Tidspunktet «${String(omgivelse.naa)}» er ikke gyldig.`)
  if (utvalg.kilde !== 'FEST' && utvalg.kilde !== SYNTETISK_KILDE) forhand.push(`Preparatdataene er fra «${utvalg.kilde}», ikke fra FEST.`)
  forhand.push(...festdatofeil(utvalg))
  if (forhand.length > 0) return stopp(forhand)

  ideell = beregn(regel, inndata, regelsett)
  merknader.push(...ideell.merknader)
  if (ideell.status === 'stoppet') return stopp(ideell.stoppgrunner)

  const kontroller = [...ideell.kontroller]
  const trinnvalg: Trinnvalg[] = []
  const medValg = <T extends object>(r: T): T & { trinnvalg?: Trinnvalg[] } => (trinnvalg.length > 0 ? { ...r, trinnvalg } : r)
  let forlop: Praktiskforlop[]
  try {
    forlop = ideell.forlop.map((f) => {
      const def = regel.plan.forlop.find((x) => x.id === f.id)!
      return praktiskForlop(def, f, grunnlag, inndata, omgivelse.idag, kontroller, trinnvalg)
    })
  } catch (e) {
    return medValg(stopp([e instanceof Stopp ? e.message : `Doseplanen kunne ikke beregnes: ${e instanceof Error ? e.message : String(e)}`]))
  }

  // P5.7: utvaskingen kontrolleres på nytt i den praktiske planen.
  for (const def of regel.plan.forlop) {
    if (def.start.type !== 'etter_utvasking') continue
    const start = def.start
    const forrige = forlop.find((x) => x.id === start.forlop)!
    const denne = forlop.find((x) => x.id === def.id)!
    const sisteDose = Math.max(0, ...forrige.perioder.map((p) => p.til ?? Infinity), ...forrige.injeksjoner.map((i) => i.dag ?? Infinity))
    const forsteDose = Math.min(denne.start, ...denne.perioder.map((p) => p.fra), ...denne.injeksjoner.map((i) => i.dag ?? Infinity))
    const fri = forsteDose - sisteDose - 1
    const krav = start.utvasking.verdi ?? 0
    kontroller.push({ krav: `Utvasking i doseplanen: minst ${krav} dager uten ${forrige.virkestoff} før ${denne.virkestoff}`, oppfylt: fri >= krav, detalj: `${fri} dager uten legemiddel.` })
    if (fri < krav) return stopp([`Doseplanen har bare ${fri} dager uten ${forrige.virkestoff} før ${denne.virkestoff}, mindre enn ${krav}.`])
  }
  // Stopper planen tidligere enn den ideelle kurven fordi et trinn ikke kan gis, gjelder den nye forklaringen.
  for (const f of forlop) {
    const ideal = ideell.forlop.find((x) => x.id === f.id)?.avslutning
    const i = ideal && ideal !== f.avslutning ? merknader.indexOf(ideal) : -1
    if (i >= 0) merknader[i] = f.avslutning!
  }

  const brukte = forlop.flatMap((f) => [...f.perioder.flatMap((p) => p.elementer), ...f.injeksjoner.map((i) => i.element)]).flatMap((e) => e.preparater)
  const unike = [...new Map(brukte.map((b) => [b.id, b])).values()].sort((a, b) => (a.id < b.id ? -1 : 1))
  const sperre = kliniskSperre(regel, utvalg, naa)
  const klinisk = sperre.length === 0 && ideell.klinisk_godkjent
  return medValg({
    ...versjoner(sha256(kanonisk({ kildedato: utvalg.kildedato, preparater: unike }))),
    status: 'doseplan' as const,
    klinisk,
    sperre,
    forbehold: [klinisk ? FORBEHOLD_KLINISK : FORBEHOLD_IKKE_KLINISK, FORBEHOLD_LAGER, FORBEHOLD_DOGNDOSE],
    forlop,
    kontroller,
    avvik: avvikstekster(forlop),
  })
}

/**
 * Det appen skal bruke: doseplanen bare når den er klinisk, ellers en stopp
 * med grunnene. En regel som ikke er gyldig klinisk godkjent, en syntetisk
 * testregel eller preparatdata som ikke er en fersk FEST-kopi gir aldri en plan.
 */
export function kliniskDoseplan(...args: Parameters<typeof beregnDoseplan>): Doseplanresultat {
  const r = beregnDoseplan(...args)
  if (r.status === 'stoppet') {
    // Valg av dose per trinn tilbys bare når planen kan bli klinisk.
    const [regel, , grunnlag, omgivelse] = args
    if (!r.trinnvalg || kliniskSperre(regel, grunnlag.utvalg, new Date(omgivelse.naa)).length === 0) return r
    const { trinnvalg: _t, ...uten } = r
    return uten
  }
  if (r.klinisk) return r
  const { status: _s, klinisk: _k, sperre, forbehold: _f, forlop: _fl, kontroller: _ko, avvik: _a, trinnvalg: _t, ...versjoner } = r
  return { ...versjoner, status: 'stoppet', klinisk: false, stoppgrunner: ['Ingen klinisk doseplan kan vises.', ...sperre], fagtekst: (args[3].fagtekst ?? []).filter((t) => t.publisert === true) }
}

/* --- Kort form, til testene og rapporten --------------------------------------- */

const BROK: Record<number, string> = { 0.25: '¼', 0.5: '½', 0.75: '¾' }

/** «1½», «¼» eller «3». */
export function antallTekst(x: number): string {
  const hel = Math.floor(x + EPS)
  const brok = BROK[Math.round((x - hel) * 4) / 4] ?? ''
  return hel === 0 && brok ? brok : `${hel}${brok}`
}

export function elementtekst(e: Doseelement): string {
  const enhet = DOSEENHETER[e.doseenhet]
  return `${antallTekst(e.antall)} ${e.antall > 1 + EPS ? enhet.flere : enhet.en} à ${tall(e.mg)} mg`
}

/** Hvert forløp som korte linjer (`dag 1–14: 15 mg = 1½ tablett à 10 mg`), eller `stopp` med grunnene. */
export function planform(r: Doseplanresultat): Record<string, string[]> {
  if (r.status === 'stoppet') return { stopp: r.stoppgrunner }
  return Object.fromEntries(
    r.forlop.map((f) => {
      const linjer = f.perioder.map((p) => {
        const avvik = Math.abs(p.avvik_prosent) > 1e-7 ? ` (ideelt ${tall(p.ideell_mg)} mg, ${p.avvik_prosent > 0 ? '+' : ''}${tall(p.avvik_prosent)} %)` : ''
        const dato = p.fra_dato ? ` [${norskDato(p.fra_dato)}${p.til_dato && p.til !== p.fra ? `–${norskDato(p.til_dato)}` : ''}]` : ''
        return `${dager(p)}${dato}: ${tall(p.mg)} mg${hverSuffiks(p)} = ${p.elementer.map(elementtekst).join(' + ')}${fordelingSuffiks(p)}${avvik}${valgtSuffiks(p)}`
      })
      for (const i of f.injeksjoner) {
        const dato = i.vedlikehold ? i.vedlikehold.forste_dato : i.dato
        linjer.push(`${injeksjonstidspunkt(i)}${dato ? ` [${norskDato(dato)}]` : ''}: ${tall(i.mg)} mg = ${elementtekst(i.element)}${i.sted ? `, ${i.sted}` : ''}`)
      }
      if (f.uten_beregning) linjer.push(utenBeregningLinje(f, (d) => (d ? ` [${norskDato(d)}]` : '')))
      if (f.siste_dosedag !== null) linjer.push(`fra dag ${f.siste_dosedag + 1}${f.seponert_dato ? ` [${norskDato(f.seponert_dato)}]` : ''}: seponert`)
      if (f.avslutning_kort) linjer.push(f.avslutning_kort)
      return [f.id, linjer]
    }),
  )
}

/** Preparatene en plan bruker, per styrke: FESTs navn med form og styrke, og hva delingen bygger på. */
export function preparatliste(r: Doseplanresultat): string[] {
  if (r.status === 'stoppet') return []
  const linjer = new Set<string>()
  for (const f of r.forlop) {
    for (const e of [...f.perioder.flatMap((p) => p.elementer), ...f.injeksjoner.map((i) => i.element)]) {
      for (const b of e.preparater) linjer.add(`${b.navn_form_styrke} (${b.registrering === 'godkjenningsfritak' ? 'godkjenningsfritak; ' : ''}${b.deling_grunnlag})`)
    }
  }
  return [...linjer].sort((a, b) => a.localeCompare(b, 'nb'))
}

