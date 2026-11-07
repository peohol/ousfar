/**
 * Etterprøving av katalogen mot regelens egne svar (P2a, ChatGPTs krav til
 * #345): for hver betingelse i en regel prøves hver kombinasjon av svar på
 * spørsmålene som avgjør den, med det tillatende svaret på resten. Katalogens
 * resultat sammenlignes med reservevisningen, der hver betingelse besvares
 * direkte med regelens egen tekst («Stemmer»/«Stemmer ikke», «Ja»/«Nei» eller
 * avkrysning) slik katalogen avgjorde den. «Før» er regelens egne svar, «etter»
 * er katalogen.
 *
 * Kravene for hver kombinasjon:
 * - samme motorinndata (`svar`, `pasientforhold`, `bekreftet`) som regelens
 *   egne svar gir;
 * - katalogen stopper planen når regelens egne svar stopper den, og stopper
 *   den bare når regelens egne svar heller ikke gir plan (et nei på en
 *   forutsetning stopper med forklaring, der regelens egne svar lar den stå
 *   ubekreftet);
 * - katalogen gir plan nøyaktig når regelens egne svar gir plan, unntatt at
 *   den aldri gir plan når et synlig spørsmål er ubesvart eller «Vet ikke»;
 * - hvert stopp i katalogen har katalogens egen forklaring, ikke en generisk.
 *
 * Brukes av testene og av `docs/verktøy-sporsmalskatalog.md`, så tallene i
 * dokumentet er de samme som testen kontrollerer.
 */
import type { Regel } from '../regler/modell'
import { SAMLET, standardId, vurderFlyt, type Flytgrunnlag, type Flytoppsett, type Flytresultat, type Motorfelt } from './flyt'
import { KATALOGBETINGELSER, jaVed, neiVed } from './sporsmal'

type Avbildning = Flytoppsett['avbildninger'][number]

/** Reservevisningen: regelens egne tekster for hver betingelse. */
const RESERVE: Flytgrunnlag = { kontrollerte: [] }

/**
 * Svaret som tillater en plan: det vanlige forløpet uten særlige forhold. Et
 * spørsmål en bekreftelse bruker, får svaret som bekrefter (også «Nei» der et
 * nei bekrefter, og «Poliklinisk» eller «Bivirkninger»), et spørsmål om et
 * forhold ved pasienten svaret som gjør forholdet usant, og alderen 18–64 år.
 */
export function tillatende(avbildninger: readonly Avbildning[], id: string): string {
  if (id === 'alder') return '18_64'
  if (id === SAMLET) return 'ja'
  const kilder = avbildninger.flatMap((a) => a.fra.filter((k) => k.sporsmal === id).map((k) => [a.type, k] as const))
  const bekreftelse = kilder.find(([type]) => type === 'bekreftelse')?.[1]
  if (bekreftelse) return jaVed(bekreftelse)[0] ?? 'ja'
  const forhold = kilder[0]?.[1]
  return (forhold && neiVed(forhold)[0]) ?? 'nei'
}

/** Det tillatende svaret på hvert synlig spørsmål, til flyten er ferdig; `fast` står og endres ikke. */
export function tillatendeSvar(r: Regel, g: Flytgrunnlag, fast: Readonly<Record<string, string | undefined>> = {}): Record<string, string> {
  const satt = new Set(Object.keys(fast))
  let svar: Record<string, string> = Object.fromEntries(Object.entries(fast).filter((x): x is [string, string] => x[1] !== undefined))
  for (let i = 0; i < 80; i++) {
    const f = vurderFlyt(r, svar, g)
    const neste = f.sporsmal.find((s) => s.valgt === undefined && !satt.has(s.id))
    if (!neste) return svar
    svar = { ...svar, [neste.id]: tillatende(f.oppsett.avbildninger, neste.id) }
  }
  throw new Error(`${r.id}: flyten ble ikke ferdig`)
}

/**
 * Svarene som får spørsmålet `id` til å vises: for et spørsmål som bare
 * vises etter et bestemt svar (`vises`), eller bare brukes av bekreftelser som
 * gjelder ved et bestemt svar i regelen (som vilkårene i det
 * svangerskapsforebyggende programmet, som gjelder når pasienten kan bli
 * gravid), det første svaret som viser det, også gjennom flere ledd.
 */
export function apningssvar(r: Regel, oppsett: Flytoppsett, id: string): Record<string, string> {
  const ut: Record<string, string> = {}
  const ko = [id]
  for (let q = ko.shift(); q !== undefined; q = ko.shift()) {
    const sett = (sporsmal: string, svar: string | undefined) => {
      if (svar === undefined || sporsmal in ut || sporsmal === id) return
      ut[sporsmal] = svar
      ko.push(sporsmal)
    }
    const d = oppsett.sporsmal.find((x) => x.id === q)
    if (d?.vises) sett(d.vises.sporsmal, d.vises.svar[0])
    const bruk = oppsett.avbildninger.filter((a) => a.fra.some((k) => k.sporsmal === q))
    const ved = bruk.map((a) => (a.type === 'bekreftelse' ? r.bekreftelser.find((x) => x.id === a.id)?.ved : undefined))
    // Bare når hver bruk krever et bestemt svar i regelen; ellers vises spørsmålet uansett.
    if (bruk.length === 0 || ved.some((v) => v === undefined)) continue
    for (const v of ved) {
      const kilde = oppsett.avbildninger.find((a) => a.type === 'sporsmal' && a.id === v!.sporsmal)?.fra[0]
      if (kilde) sett(kilde.sporsmal, (v!.svar ? jaVed(kilde) : neiVed(kilde))[0])
    }
  }
  return ut
}

/** Regelens egne svar (reservevisningen) for feltene motoren fikk fra katalogen. */
export function regelensSvar(r: Regel, felt: Motorfelt): Record<string, string> {
  const ut: Record<string, string> = {}
  const sett = (type: Avbildning['type'], id: string, v: boolean | undefined) => {
    if (v !== undefined) ut[standardId(type, id)] = v ? 'ja' : 'nei'
  }
  for (const u of r.unntak) sett('unntak', u.id, felt.pasientforhold[u.id])
  for (const s of r.sporsmal ?? []) sett('sporsmal', s.id, felt.svar[s.id])
  for (const b of r.bekreftelser) if (felt.bekreftet.includes(b.id)) ut[standardId('bekreftelse', b.id)] = 'ja'
  return ut
}

/** Om flyten gir en plan nå: ingenting stopper og ingenting står igjen. */
export const girPlan = (f: Flytresultat) => f.stopp.length === 0 && f.gjenstar.length === 0

/** Alle stoppforklaringene katalogen har, for regelen. */
const katalogforklaringer = (r: Regel) =>
  new Set(KATALOGBETINGELSER.filter((b) => b.regel === r.id).flatMap((b) => [b.forklaring, ...(b.fra ?? []).map((k) => k.forklaring)]).filter((x): x is string => !!x))

export interface Avvik {
  betingelse: string
  svar: Record<string, string | undefined>
  feil: string
}

export interface Semantikk {
  regel: string
  versjon: number
  betingelser: number
  kombinasjoner: number
  /** Kombinasjoner der katalogen stopper planen. */
  stopper: number
  /**
   * Av dem: kombinasjoner der katalogen stopper med forklaring fordi en
   * forutsetning (en bekreftelse) er besvart med et svar som utelukker den,
   * mens regelens egne svar bare lar forutsetningen stå ubekreftet. Ingen av
   * dem gir plan.
   */
  forutsetning: number
  /** Kombinasjoner med et synlig «Vet ikke» eller ubesvart spørsmål, som aldri gir plan. */
  uavklart: number
  avvik: Avvik[]
}

/** Alle kombinasjoner av svarene (og ubesvart) på spørsmålene. */
function kombinasjoner(sporsmal: readonly { id: string; verdier: readonly string[] }[]): Record<string, string | undefined>[] {
  let ut: Record<string, string | undefined>[] = [{}]
  for (const s of sporsmal) ut = ut.flatMap((k) => [...s.verdier, undefined].map((v) => ({ ...k, [s.id]: v })))
  return ut
}

/** Etterprøvingen for regelen med katalogen i `katalog` (ført som kontrollert). */
export function etterprov(r: Regel, katalog: Flytgrunnlag): Semantikk {
  const oppsett = vurderFlyt(r, {}, katalog).oppsett
  if (!oppsett.katalog) throw new Error(`${r.id}: katalogen er ikke ført som kontrollert i grunnlaget`)
  const forklaringer = katalogforklaringer(r)
  const alternativer = new Map(oppsett.sporsmal.map((s) => [s.id, s.alternativer.map((a) => a.verdi)]))
  const avvik: Avvik[] = []
  let antall = 0
  let stopper = 0
  let uavklart = 0
  let forutsetning = 0
  const grunn = tillatendeSvar(r, katalog)
  for (const a of oppsett.avbildninger) {
    const ider = [...new Set(a.fra.map((k) => k.sporsmal))]
    const kilder = ider.map((id) => ({ id, verdier: alternativer.get(id) ?? [] }))
    // Spørsmål som bare vises etter et annet svar, prøves med det svaret, så kombinasjonen faktisk teller.
    const apning = Object.assign({}, ...ider.map((id) => apningssvar(r, oppsett, id))) as Record<string, string>
    for (const k of kombinasjoner(kilder)) {
      antall++
      const svar = tillatendeSvar(r, katalog, { ...grunn, ...apning, ...k })
      const etter = vurderFlyt(r, svar, katalog)
      const for_ = vurderFlyt(r, regelensSvar(r, etter.felt), RESERVE)
      const feil = (tekst: string) => avvik.push({ betingelse: `${a.type}:${a.id}`, svar: k, feil: tekst })
      if (JSON.stringify(normalisert(etter.felt)) !== JSON.stringify(normalisert(for_.felt))) feil(`motorinndata: katalogen ${JSON.stringify(normalisert(etter.felt))}, regelens svar ${JSON.stringify(normalisert(for_.felt))}`)
      const vetIkke = etter.sporsmal.some((s) => s.valgt === undefined || s.valgt === 'ukjent')
      // Et stopp etter regelens egne svar er også et stopp i katalogen, og et stopp i katalogen gir heller ingen plan etter regelens egne svar.
      if (for_.stopp.length > 0 && etter.stopp.length === 0) feil('regelens svar stopper planen, katalogen stopper den ikke')
      if (etter.stopp.length > 0 && girPlan(for_)) feil('katalogen stopper planen, regelens svar gir plan')
      // Samme utfall når alt er besvart; ellers aldri en plan i katalogen.
      if (girPlan(etter) !== girPlan(for_) && !(vetIkke && !girPlan(etter))) feil(`plan: katalogen ${girPlan(etter)}, regelens svar ${girPlan(for_)}`)
      if (vetIkke && girPlan(etter)) feil('plan med et ubesvart spørsmål eller «Vet ikke»')
      if (vetIkke) uavklart++
      if (etter.stopp.length > 0) stopper++
      // En forutsetning som er besvart med et svar som utelukker den, stopper med forklaring; etter regelens egne svar står den bare ubekreftet.
      if (etter.stopp.length > 0 && for_.stopp.length === 0) forutsetning++
      for (const x of etter.stopp) if (!forklaringer.has(x.tekst)) feil(`stoppet ved ${x.sporsmal} har ikke katalogens forklaring: «${x.tekst}»`)
    }
  }
  return { regel: r.id, versjon: r.versjon, betingelser: oppsett.avbildninger.length, kombinasjoner: antall, stopper, forutsetning, uavklart, avvik }
}

/** Feltene i fast rekkefølge, så to like sett sammenlignes likt. */
const normalisert = (f: Motorfelt) => ({
  svar: Object.fromEntries(Object.entries(f.svar).sort()),
  pasientforhold: Object.fromEntries(Object.entries(f.pasientforhold).sort()),
  bekreftet: [...f.bekreftet].sort(),
})
