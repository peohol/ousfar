/**
 * Tidlig kontroll av om en komplett plan kan lages (§5 i
 * `docs/verktøy-brukervennlighet-2026-11.md`), kjørt etter valget av
 * legemiddel, etter dosen og på nytt ved hvert svar:
 *
 * 1. Finnes en klinisk godkjent, usperret regel som kan gi en komplett plan for valget?
 * 2. Er startdosen innenfor regelens krav og kliniske omfang? Ellers: hvilke doser er godkjent.
 * 3. Prøveberegning med FEST: motoren (`kliniskDoseplan`, via `beregnPlan`) kjøres med svarene som er gitt og
 *    de svarene som tillater en plan for resten, for hver legemiddelform og, når planen krever et dosevalg
 *    for et trinn, for hvert tillatte valg (avgrenset). Et valg som trengs, er gjenstående, ikke en stopp.
 *
 * Kontrollen lover aldri en plan (S9): prøveberegningen vises aldri, og
 * «kan lages hvis» betyr bare at motoren kan gi en komplett plan når de
 * faktiske svarene tillater det. Planen vises bare når den er beregnet med
 * de faktiske svarene.
 */
import type { Legemiddelutvalg } from '../../legemiddeldata/lesing'
import { beregnPlan, formvalgFor, kanKreveBegrunnelse, lesDose, medTrinnvalg, trengerMaldose, type Planskjema } from '../doseplan'
import type { Doseplanresultat } from '../motor/plan'
import { inndatagrenser } from '../regler/beregning'
import { kanonisk } from '../regler/godkjenning'
import { gjeldendeBekreftelser, komplettfeil, type Regel, type Regelsett } from '../regler/modell'
import type { Verktoy } from '../register'
import { SPERRET, usperrede, type Verktoysperre } from '../sperrer'
import { medlemFor, REGELSETT, tilgjengelighet, type Verktoyvalg } from '../tilgjengelighet'
import { BESLUTNINGER, type Beslutninger } from './beslutninger'
import { INDIVIDUELT, medFlytfelt, type Flytresultat } from './flyt'
import { stoppforklaringer } from './stopp'
import { VALG_TRENGS, type Forhandskontroll, type Stoppforklaring, type Stoppkodenavn } from './typer'

/** Det klinikeren ser når prøveberegningen gir en komplett plan. Det er aldri et løfte om en plan (S9). */
export const KAN_LAGES_HVIS = 'En komplett plan kan lages hvis svarene under tillater det.'

/** Den største dybden av dosevalg prøveberegningen går gjennom. */
export const MAKS_DOSEVALG = 30
/** Det største antallet beregninger én kontroll gjør. */
export const MAKS_BEREGNINGER = 200

/** Begrunnelsen prøveberegningen bruker når klinikeren ikke har skrevet sin ennå; den når aldri en plan som vises. */
const PROVEBEGRUNNELSE = 'Prøveberegning: begrunnelsen er ikke skrevet ennå.'

export interface Forhandsgrunnlag {
  verktoy: Verktoy
  valg?: Verktoyvalg
  regelsett?: Regelsett
  /** Nødstoppene; `undefined` når de ikke er lest ennå, og da loves ingenting. */
  sperrer?: readonly Verktoysperre[]
  /** Regelen flyten gjelder, når den er valgt; ellers alle som kan gi en komplett plan. */
  regel?: Regel
  skjema?: Planskjema
  /** Preparatene fra FEST; `undefined` når de ikke er lest ennå. */
  utvalg?: Legemiddelutvalg
  naa: Date
  /** Flyten for regelen med svarene som er gitt. */
  flyt?: Flytresultat
  beslutninger?: Readonly<Beslutninger>
}

export interface Forhandsresultat extends Forhandskontroll {
  /** Reglene som fortsatt kan gi en komplett plan. */
  regler: Regel[]
  /** Formene (forløp → FEST-kode) prøveberegningen fikk en komplett plan med. */
  former?: Record<string, string[]>
  /** Formvalget verktøyet gjør selv når bare én form kan gi en komplett plan (beslutning B4). */
  formvalg?: Record<string, { legemiddelform: string }>
}

const forklaring = (kode: string, tekst: string, x: Partial<Stoppforklaring> = {}): Stoppforklaring => ({ kode, tekst, losning: 'individuelt', ...x })

const kanIkke = (grunner: Stoppforklaring[], regler: Regel[] = []): Forhandsresultat => ({ utfall: 'kan_ikke', grunner, gjenstar: 0, regler })
const ukjent = (regler: Regel[], gjenstar = 0): Forhandsresultat => ({ utfall: 'ukjent', grunner: [], gjenstar, regler })

const STATUSTEKST: Record<string, string> = {
  fagtekst: 'Verktøyet har bare fagtekst for dette valget, ingen beregnet plan.',
  ikke_godkjent: 'Det finnes ingen godkjent plan for dette valget.',
  til_kontroll: 'Det finnes ingen godkjent plan for dette valget ennå; faglig kontroll gjenstår.',
}

const tall = (x: number) => String(x).replace('.', ',')
const liste = (ord: string) => (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} ${ord} ${xs.at(-1)}`)
const listeOg = liste('og')
const listeEller = liste('eller')
const lik = (a: number, b: number) => Math.abs(a - b) < 1e-9

/** De bindende kravene til startdosen som alltid gjelder (uten `ved` eller medlem). */
const startkrav = (r: Regel) => r.inndata.filter((k) => k.navn === 'startdose' && k.art === 'bindende_krav' && !k.ved && !k.gjelder_medlem)
/** Om dosen oppfyller kravet: en av verdiene, eller i området (nedre grense 0 betyr enhver positiv dose). */
const innenfor = (k: Regel['inndata'][number], x: number) => {
  if (k.verdier) return k.verdier.some((v) => lik(v, x))
  if (!k.omrade) return true
  const [fra, til] = k.omrade
  return x <= til + 1e-9 && (fra === 0 ? x > 0 : x >= fra - 1e-9)
}

/** Om startdosen kan gi en plan etter regelens krav og omfang, og ellers hvorfor, i klartekst. */
function dosefeil(r: Regel, start: number, navn: (kode: string) => string): string | undefined {
  const krav = startkrav(r).find((k) => !innenfor(k, start))
  if (krav) return `Regelen gjelder bare startdoser på ${krav.verdier ? `${listeOg(krav.verdier.map(tall))} ${krav.enhet ?? 'mg'}` : inndatagrenser(krav)}.`
  const tilfeller = r.klinisk_omfang?.tilfeller
  if (!tilfeller || tilfeller.some((t) => t.startdoser.some((x) => lik(x, start)))) return undefined
  const perForm = new Map<string, Set<number>>()
  for (const t of tilfeller) for (const x of t.startdoser) perForm.set(t.legemiddelform ?? '', (perForm.get(t.legemiddelform ?? '') ?? new Set()).add(x))
  const doser = [...new Set(tilfeller.flatMap((t) => t.startdoser))].sort((a, b) => a - b)
  const former = [...perForm.entries()].filter(([k]) => k !== '')
  const perFormTekst = former.length > 1 ? ` (${former.map(([k, xs]) => `${navn(k)}: ${listeOg([...xs].sort((a, b) => a - b).map(tall))} mg`).join('; ')})` : ''
  return `Den godkjente planen gjelder bare startdosene ${listeOg(doser.map(tall))} mg${perFormTekst}.`
}

/** Svarsettene prøveberegningen prøver for spørsmålene som ikke er besvart: nei på alle, og hvert kontrollert tilfelle i omfanget. */
function svarkandidater(r: Regel, gitt: Readonly<Record<string, boolean>>): Record<string, boolean>[] {
  const ider = (r.sporsmal ?? []).map((s) => s.id)
  const nei = Object.fromEntries(ider.map((id) => [id, false]))
  const sett = [nei, ...(r.klinisk_omfang?.tilfeller ?? []).map((t) => ({ ...nei, ...t.svar }))].map((s) => ({ ...s, ...gitt })).filter((s) => Object.entries(gitt).every(([id, v]) => s[id] === v))
  return [...new Map(sett.map((s) => [kanonisk(s), s])).values()]
}

/** Om regelen trenger en måldose som ikke er valgt ennå. */
export const maldoseMangler = (r: Regel, s: Planskjema) => trengerMaldose(r, s) && lesDose(s.maldose) === undefined

/**
 * Måldosene prøveberegningen prøver: den som er valgt, ellers hver verdi
 * regelen tillater. `undefined` når måldosen mangler og regelen ikke har
 * faste verdier å prøve; da kan ikke prøveberegningen si noe ennå.
 */
function maldosekandidater(r: Regel, s: Planskjema): (string | undefined)[] | undefined {
  if (!maldoseMangler(r, s)) return [undefined]
  const verdier = r.inndata.find((k) => k.navn === 'maldose')?.verdier ?? []
  return verdier.length > 0 ? verdier.map(String) : undefined
}

/** Skjemaet til prøveberegningen: svarene som er gitt, og ellers de svarene som tillater en plan. */
function proveskjema(r: Regel, s: Planskjema, svar: Record<string, boolean>, maldose?: string): Planskjema {
  const pasientforhold = { ...Object.fromEntries(r.unntak.map((u) => [u.id, false])), ...s.pasientforhold }
  const bekreftet = gjeldendeBekreftelser(r, svar).map((b) => b.id)
  return {
    ...s,
    svar,
    pasientforhold,
    bekreftet,
    ...(maldose !== undefined && { maldose }),
    ...(kanKreveBegrunnelse(r) && !s.begrunnelse.trim() && { begrunnelse: PROVEBEGRUNNELSE }),
  }
}

interface Forsok {
  resultat: Doseplanresultat
  dosevalg: number
}

/** Beregner, og går gjennom dosevalgene for trinn depth-first til en komplett plan, med et samlet tak på antall beregninger. */
function proveMedDosevalg(beregn: (s: Planskjema) => Doseplanresultat, s: Planskjema, budsjett: { igjen: number }, dybde = 0): Forsok {
  budsjett.igjen--
  const resultat = beregn(s)
  if (resultat.status === 'doseplan' || !resultat.trinnvalg?.length || dybde >= MAKS_DOSEVALG) return { resultat, dosevalg: dybde }
  const t = resultat.trinnvalg.find((x) => !x.mellomtrinn) ?? resultat.trinnvalg[0]!
  let forste: Forsok | undefined
  for (const d of t.doser) {
    if (budsjett.igjen <= 0) break
    const f = proveMedDosevalg(beregn, medTrinnvalg(s, t, d.mg), budsjett, dybde + 1)
    if (f.resultat.status === 'doseplan') return f
    forste ??= f
  }
  return forste ?? { resultat, dosevalg: dybde }
}

const lagret = new Map<string, Forhandsresultat>()
const utvalgsid = new WeakMap<object, number>()
let nesteId = 0
const idFor = (x: object) => utvalgsid.get(x) ?? (utvalgsid.set(x, ++nesteId), nesteId)

/** Kodene som ikke er reelle stopp i en prøveberegning: valg som trengs, og det prøveberegningen selv fyller inn. */
const GJENSTAENDE: readonly string[] = [...VALG_TRENGS, 'unntak_ukjent', 'sporsmal_ubesvart', 'bekreftelse_mangler']

/** Prøveberegningen for én regel: om en komplett plan kan lages, med hvilke former, og ellers grunnene. */
function prove(r: Regel, g: Forhandsgrunnlag & { skjema: Planskjema; utvalg: Legemiddelutvalg; valg: Verktoyvalg }, grunnskjema: Planskjema = g.flyt ? medFlytfelt(g.skjema, g.flyt.felt) : g.skjema) {
  const beregn = (s: Planskjema) => beregnPlan(r, g.valg, s, g.utvalg, g.naa, g.regelsett ?? REGELSETT)
  const budsjett = { igjen: MAKS_BEREGNINGER }
  const alternativer = formvalgFor(r, g.valg, { ...grunnskjema, formvalg: {} }, g.utvalg, g.naa)
  // Formene som prøves per forløp: valget som er gjort først, så de andre.
  const formsett: Record<string, { klasse?: string; legemiddelform?: string }>[] = [{}]
  for (const [forlop, alt] of Object.entries(alternativer)) {
    const valgt = grunnskjema.formvalg[forlop]?.legemiddelform
    const koder = alt.legemiddelformer.map((x) => x.kode).sort((a, b) => Number(b === valgt) - Number(a === valgt))
    const neste = formsett.flatMap((f) => (koder.length > 0 ? koder.map((k) => ({ ...f, [forlop]: { ...grunnskjema.formvalg[forlop], legemiddelform: k } })) : [f]))
    formsett.splice(0, formsett.length, ...neste)
  }
  const fritak = grunnskjema.godkjenningsfritak ? [true] : [false, true]
  const lykkes: { formvalg: (typeof formsett)[number]; fritak: boolean; dosevalg: number }[] = []
  let forste: Doseplanresultat | undefined
  for (const maldose of maldosekandidater(r, grunnskjema) ?? []) {
    for (const svar of svarkandidater(r, grunnskjema.svar)) {
      for (const formvalg of formsett) {
        for (const f of fritak) {
          if (budsjett.igjen <= 0) break
          if (lykkes.some((x) => kanonisk(x.formvalg) === kanonisk(formvalg) && (x.fritak || !f))) continue
          const s = proveskjema(r, { ...grunnskjema, formvalg: { ...grunnskjema.formvalg, ...formvalg }, godkjenningsfritak: f }, svar, maldose)
          const forsok = proveMedDosevalg(beregn, s, budsjett)
          forste ??= forsok.resultat
          if (forsok.resultat.status === 'doseplan') lykkes.push({ formvalg, fritak: f, dosevalg: forsok.dosevalg })
        }
      }
    }
  }
  return { lykkes, forste, alternativer, grunnskjema }
}

/**
 * Svarene på spørsmålene i regelen som alene gjør at prøveberegningen ikke
 * gir en komplett plan: uten svaret (med de tillatende svarene i stedet) ville
 * den gitt en. Forklaringen står da ved spørsmålet i flyten.
 */
function arsaker(r: Regel, g: Parameters<typeof prove>[1], grunnskjema: Planskjema): Stoppforklaring[] {
  if (!g.flyt) return []
  // Et nei er det tillatende svaret i omfangene; bare et ja kan alene stenge for planen.
  return Object.keys(grunnskjema.svar)
    .filter((id) => grunnskjema.svar[id] === true)
    .flatMap((id) => {
      const { [id]: _bort, ...andre } = grunnskjema.svar
      if (prove(r, g, { ...grunnskjema, svar: andre }).lykkes.length === 0) return []
      const sporsmal = g.flyt!.oppsett.avbildninger.find((a) => a.type === 'sporsmal' && a.id === id)?.fra.at(-1)?.sporsmal
      return [forklaring('svar_stopper', `Med dette svaret kan verktøyet ikke lage en komplett plan helt til sluttmålet. ${INDIVIDUELT}`, { ...(sporsmal && { sporsmal }) })]
    })
}

/** Forhåndskontrollen for valgene og svarene som er gjort. */
export function forhandskontroll(g: Forhandsgrunnlag): Forhandsresultat {
  if (!g.valg) return ukjent([])
  const regelsett = g.regelsett ?? REGELSETT
  const t = tilgjengelighet(g.verktoy, g.valg, regelsett)
  if (t.status !== 'tilgjengelig') {
    const tekst = STATUSTEKST[t.status] ?? t.grunner[0] ?? 'OUSFAR har ingen regel for denne kombinasjonen.'
    return kanIkke([forklaring(t.status === 'ikke_stottet' ? 'ingen_regel' : t.status, tekst, { detalj: t.grunner.join(' ') })])
  }
  let regler = t.regler.filter((r) => komplettfeil(r, medlemFor(r, g.valg!)).length === 0)
  if (regler.length === 0) return kanIkke([forklaring('ikke_komplett', `Ingen godkjent regel gir en komplett plan for dette valget ennå. ${INDIVIDUELT}`)])
  if (g.sperrer === undefined) return ukjent(regler)
  regler = usperrede(g.sperrer, g.verktoy, regler)
  if (regler.length === 0) return kanIkke([forklaring('sperret', SPERRET)])
  if (g.regel) regler = regler.filter((r) => r.id === g.regel!.id)
  if (regler.length === 0) return kanIkke([forklaring('ingen_regel', 'Den valgte planen kan ikke brukes for dette valget.')])

  // Et svar i flyten som stopper planen, avgjør før noe beregnes.
  const stoppsvar = (g.flyt?.sporsmal ?? []).filter((s) => s.valgt !== undefined && s.stopperVed?.includes(s.valgt))
  if (stoppsvar.length > 0)
    return kanIkke(
      stoppsvar.map((s) => forklaring('svar_stopper', s.forklaring ?? INDIVIDUELT, { sporsmal: s.id })),
      regler,
    )

  const start = g.skjema ? lesDose(g.skjema.startdose) : undefined
  const gjenstarFlyt = g.flyt?.gjenstar.length ?? 0
  if (start === undefined) return ukjent(regler, gjenstarFlyt)
  const formnavn = (kode: string) => g.utvalg?.merkevarer.find((m) => m.legemiddelform?.kode === kode)?.legemiddelform?.tekst?.toLowerCase() ?? `legemiddelform ${kode}`
  const feil = regler.map((r) => dosefeil(r, start, formnavn))
  if (feil.every((f) => f !== undefined)) return kanIkke([forklaring('utenfor_omfang', `${feil[0]} ${INDIVIDUELT}`)], [])
  regler = regler.filter((_, i) => feil[i] === undefined)
  // En måldose regelen ikke har faste verdier for, må velges før prøveberegningen kan si noe.
  if (regler.some((r) => maldosekandidater(r, g.skjema!) === undefined)) return ukjent(regler, gjenstarFlyt + 1)
  if (!g.utvalg) return ukjent(regler, gjenstarFlyt)

  const nokkel = kanonisk({
    regler: regler.map((r) => [r.id, r.versjon]),
    skjema: g.skjema,
    felt: g.flyt?.felt ?? null,
    utvalg: idFor(g.utvalg),
    naa: g.naa.toISOString().slice(0, 16),
    sperrer: g.sperrer.map((s) => s.id),
    b: g.beslutninger ?? BESLUTNINGER,
    gjenstarFlyt,
  })
  const funnet = lagret.get(nokkel)
  if (funnet) return funnet

  const beslutninger = g.beslutninger ?? BESLUTNINGER
  const grunner: Stoppforklaring[] = []
  const gode: Regel[] = []
  let former: Record<string, string[]> | undefined
  let formvalg: Forhandsresultat['formvalg']
  let dosevalg: number | undefined
  let ekstra = 0
  let feilet: Stoppforklaring[] = []
  for (const r of regler) {
    const grunnlag = { ...g, skjema: g.skjema!, utvalg: g.utvalg, valg: g.valg }
    const p = prove(r, grunnlag)
    if (p.lykkes.length === 0) {
      if (feilet.length === 0 && p.forste)
        feilet = [...arsaker(r, grunnlag, p.grunnskjema), ...stoppforklaringer(p.forste, r, g.flyt?.oppsett).filter((f) => !GJENSTAENDE.includes(f.kode as Stoppkodenavn))]
      continue
    }
    gode.push(r)
    if (gode.length > 1) continue
    const beste = p.lykkes[0]!
    dosevalg = beste.dosevalg || undefined
    // Formene som gir en komplett plan, per forløp med flere former i FEST.
    former = Object.fromEntries(Object.keys(p.alternativer).map((f) => [f, [...new Set(p.lykkes.flatMap((x) => (x.formvalg[f]?.legemiddelform ? [x.formvalg[f]!.legemiddelform!] : [])))].sort()]))
    for (const [forlop, koder] of Object.entries(former)) {
      const valgt = p.grunnskjema.formvalg[forlop]?.legemiddelform
      const navn = listeOg(koder.map(formnavn))
      if (valgt && koder.includes(valgt)) continue
      if (koder.length === 1 && beslutninger.B4) {
        formvalg = { ...formvalg, [forlop]: { legemiddelform: koder[0]! } }
        grunner.push(forklaring('form_valgt', `Verktøyet bruker ${navn}, fordi bare den gir en komplett plan.`, { losning: 'i_verktoyet' }))
        continue
      }
      ekstra++
      grunner.push(
        forklaring(
          'formvalg_trengs',
          valgt ? `Med ${formnavn(valgt)} kan verktøyet ikke lage en komplett plan, men med ${listeEller(koder.map(formnavn))} kan det.` : `Planen kan lages med ${listeEller(koder.map(formnavn))}.`,
          {
            handling: `Velg ${listeEller(koder.map(formnavn))}.`,
            losning: 'i_verktoyet',
          },
        ),
      )
    }
    if (!p.grunnskjema.godkjenningsfritak && p.lykkes.every((x) => x.fritak)) {
      ekstra++
      grunner.push(
        forklaring('godkjenningsfritak_trengs', 'Planen trenger preparater som krever godkjenningsfritak.', {
          handling: 'Velg at preparater med godkjenningsfritak kan brukes, hvis det er aktuelt.',
          losning: 'i_verktoyet',
        }),
      )
    }
    // Måldosen velges av forskriveren; prøveberegningen har bare vist at minst én av verdiene gir en plan.
    if (maldoseMangler(r, p.grunnskjema)) ekstra++
    if (kanKreveBegrunnelse(r) && g.flyt?.begrunnelse && !p.grunnskjema.begrunnelse.trim()) {
      ekstra++
      grunner.push(forklaring('begrunnelse_trengs', g.flyt.begrunnelse.hjelp, { handling: 'Skriv begrunnelsen.', losning: 'i_verktoyet' }))
    }
  }
  const ut: Forhandsresultat =
    gode.length > 0
      ? { utfall: 'kan_lages_hvis', grunner, gjenstar: gjenstarFlyt + ekstra, regler: gode, ...(dosevalg && { dosevalg }), ...(former && { former }), ...(formvalg && { formvalg }) }
      : kanIkke(feilet.length > 0 ? feilet : [forklaring('ikke_komplett', `Verktøyet kan ikke lage en komplett plan for dette tilfellet. ${INDIVIDUELT}`)])
  if (lagret.size > 200) lagret.delete(lagret.keys().next().value!)
  lagret.set(nokkel, ut)
  return ut
}
