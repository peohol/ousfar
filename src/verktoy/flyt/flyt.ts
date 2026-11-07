/**
 * Spørsmålsflyten for én regel (§4 i `docs/verktøy-brukervennlighet-2026-11.md`):
 * hvilke spørsmål som vises, i hvilken rekkefølge, og hvordan svarene
 * avbildes til nøyaktig de feltene motoren leser (`svar`, `pasientforhold`,
 * `bekreftet`).
 *
 * Reglene for avbildningen, som testene håndhever:
 * - «Ukjent», et ubesvart spørsmål og «Ikke ennå» gir aldri et trygt svar: betingelsen står ubesvart, og motoren stopper (S4).
 * - Et spørsmål som er skjult, bidrar ikke: svaret det hadde, sendes ikke til motoren.
 * - Hver betingelse i regelen er enten spurt om, avledet av et svar eller (med beslutning B1) et forbehold i planen (S5).
 * - Katalogen brukes bare når avtrykket er kontrollert for regelversjonen; ellers spørres hver betingelse med regelens tekst (S5b).
 */
import type { Planskjema } from '../doseplan'
import { gjeldendeBekreftelser, type Bekreftelse, type Regel } from '../regler/modell'
import { BESLUTNINGER, type Beslutninger } from './beslutninger'
import { betingelserFor, katalogGjelder, KONTROLLERTE_KATALOGER, sporsmalFor, type Katalogkontroll } from './katalogkontroll'
import { jaVed, KATALOGBETINGELSER, KATALOGSPORSMAL, neiVed, SVARSETT, type Betingelsestype, type Katalogbetingelse, type Katalogsporsmal, type Svarkilde } from './sporsmal'
import type { Flytsporsmal, Kategori, Sporsmalsgruppe, Stoppforklaring, Svaralternativ } from './typer'

export const GRUPPEREKKEFOLGE: readonly Sporsmalsgruppe[] = ['stopp', 'endrer', 'vurdering']

/** Id-en til den samlede bekreftelsen av forbehold og avledede forutsetninger, til beslutning B1 og B2 er akseptert. */
export const SAMLET = 'forutsetninger'

export const INDIVIDUELT = 'Verktøyet lager ingen plan, og behandlingen må planlegges individuelt.'
export const UNNTAK_STANDARD = `Da gjelder ikke regelen. ${INDIVIDUELT}`
export const UKJENT_FORKLARING = 'Må avklares før verktøyet kan lage en plan.'

/**
 * Stoppet når et svar ligger utenfor det den godkjente planen dekker: hvilket
 * forhold, og at det er manglende godkjent plan, ikke nødvendigvis en
 * medisinsk grunn mot behandlingen (P0-rapporten §8, F3/F4).
 */
export const ingenGodkjentPlan = (forhold: string) => `Verktøyet har ingen godkjent plan ved ${forhold}. Det betyr ikke nødvendigvis at behandlingen er uforsvarlig, bare at den må planlegges individuelt.`

/** Det som avgjør hvordan flyten bygges; standardverdiene er de som gjelder i appen. */
export interface Flytgrunnlag {
  kontrollerte?: readonly Katalogkontroll[]
  beslutninger?: Readonly<Beslutninger>
  katalog?: readonly Katalogbetingelse[]
  sporsmal?: readonly Katalogsporsmal[]
  /**
   * Spørsmålene i regelen der et ja alene gjør at ingen komplett plan kan lages
   * med preparatene i FEST, selv om omfanget har et tilfelle med ja
   * (`utelukkendeSvar` i forhåndskontrollen). Svaret stopper da ved spørsmålet.
   */
  utelukket?: readonly string[]
}

/** Ett spørsmål slik flyten bygger det, før svarene er kjent. */
interface Definisjon {
  id: string
  tekst: string
  hjelp?: string
  gruppe: Sporsmalsgruppe
  kategori: Kategori
  art: 'valg' | 'avkrysning'
  alternativer: readonly Svaralternativ[]
  vises?: { sporsmal: string; svar: readonly string[] }
}

/** Hvordan én betingelse i regelen avgjøres av spørsmålene. */
interface Avbildning {
  type: Betingelsestype
  id: string
  fra: readonly Svarkilde[]
  kombinasjon: 'en' | 'alle'
  forklaring?: string
}

export interface Flytoppsett {
  regel: Regel
  /** Om katalogen er brukt (avtrykket er kontrollert); ellers den trygge standarden. */
  katalog: boolean
  sporsmal: Definisjon[]
  avbildninger: Avbildning[]
  /** Forbehold som står i planen i stedet for å krysses av (beslutning B1). */
  forbehold: Bekreftelse[]
  /** Bekreftelsene i den samlede avkrysningen til slutt. */
  samlet: Bekreftelse[]
  /** Bekreftelsene som er avledet av et uttrykkelig valg (beslutning B2); står i planen som forutsatt. */
  avledet: string[]
}

const nokkel = (type: Betingelsestype, id: string) => `${type}:${id}`
/** Id-en til et spørsmål med regelens egen tekst (trygg standard). */
export const standardId = (type: Betingelsestype, id: string) => `regel:${nokkel(type, id)}`

const maldoseTekst = (r: Regel) => {
  const verdier = r.inndata.find((k) => k.navn === 'maldose')?.verdier ?? []
  return verdier.map((x) => String(x).replace('.', ',')).join(' eller ')
}
const fyllInn = (r: Regel, t: string | undefined) => t?.replaceAll('{maldose}', maldoseTekst(r))

/**
 * Reservevisningen for en betingelse uten kontrollert katalogoppføring (S5):
 * regelens egen, fullstendige tekst med sin opprinnelige type og svarlogikk,
 * slik dagens skjema viser den. Spørsmål har «Ja»/«Nei», unntak regelens to
 * svar («Gjelder»/«Gjelder ikke») og bekreftelser en avkrysning. Den gjøres
 * aldri om til et generisk spørsmål, og gir de samme motorinndataene som
 * dagens skjema.
 */
function standard(type: Betingelsestype, x: { id: string; tekst: string }): [Definisjon, Avbildning] {
  const id = standardId(type, x.id)
  const def: Definisjon =
    type === 'bekreftelse'
      ? { id, tekst: x.tekst, gruppe: 'vurdering', kategori: 'uklassifisert', art: 'avkrysning', alternativer: SVARSETT.bekreftet }
      : type === 'unntak'
        ? { id, tekst: x.tekst, gruppe: 'stopp', kategori: 'uklassifisert', art: 'valg', alternativer: SVARSETT.gjelder }
        : { id, tekst: x.tekst, gruppe: 'endrer', kategori: 'uklassifisert', art: 'valg', alternativer: SVARSETT.ja_nei }
  return [def, { type, id: x.id, fra: [{ sporsmal: id }], kombinasjon: type === 'bekreftelse' ? 'alle' : 'en', ...(type === 'unntak' && { forklaring: UNNTAK_STANDARD }) }]
}

const lagret = new WeakMap<Regel, Map<string, Flytoppsett>>()

/** Spørsmålene og avbildningene for regelen. */
export function flytoppsett(r: Regel, g: Flytgrunnlag = {}): Flytoppsett {
  const nok = g.kontrollerte === undefined && g.beslutninger === undefined && g.katalog === undefined && g.sporsmal === undefined ? 'app' : undefined
  const funnet = nok ? lagret.get(r)?.get(nok) : undefined
  if (funnet) return funnet
  const beslutninger = g.beslutninger ?? BESLUTNINGER
  const katalog = katalogGjelder(r, g.kontrollerte ?? KONTROLLERTE_KATALOGER, g.katalog, g.sporsmal)
  const oppforinger = katalog ? betingelserFor(r, g.katalog ?? KATALOGBETINGELSER) : []
  const finn = (type: Betingelsestype, id: string) => oppforinger.find((b) => b.type === type && b.id === id)

  const egne: Definisjon[] = []
  const avbildninger: Avbildning[] = []
  const forbehold: Bekreftelse[] = []
  const samlet: Bekreftelse[] = []
  const avledet: string[] = []
  const brukte: Katalogbetingelse[] = []
  const alle: [Betingelsestype, { id: string; tekst: string }][] = [
    ...r.unntak.map((x): [Betingelsestype, typeof x] => ['unntak', x]),
    ...(r.sporsmal ?? []).map((x): [Betingelsestype, typeof x] => ['sporsmal', x]),
    ...r.bekreftelser.map((x): [Betingelsestype, typeof x] => ['bekreftelse', x]),
  ]
  for (const [type, x] of alle) {
    const o = finn(type, x.id)
    if (o?.kategori === 'forbehold') {
      ;(beslutninger.B1 ? forbehold : samlet).push(x as Bekreftelse)
      continue
    }
    if (o?.kategori === 'avledet' && !beslutninger.B2) {
      samlet.push(x as Bekreftelse)
      continue
    }
    if (o?.fra && o.fra.length > 0) {
      brukte.push(o)
      if (o.kategori === 'avledet') avledet.push(x.id)
      avbildninger.push({ type, id: x.id, fra: o.fra, kombinasjon: o.kombinasjon ?? (type === 'bekreftelse' ? 'alle' : 'en'), ...(o.forklaring && { forklaring: o.forklaring }) })
      continue
    }
    // Uten (kontrollert) katalogoppføring: regelens egen tekst, som i dagens skjema.
    const [def, avb] = standard(type, x)
    egne.push(def)
    avbildninger.push(avb)
  }
  const fraKatalog: Definisjon[] = sporsmalFor(brukte, g.sporsmal ?? KATALOGSPORSMAL).map((s) => ({
    id: s.id,
    tekst: fyllInn(r, s.tekst)!,
    ...(s.hjelp && { hjelp: fyllInn(r, s.hjelp) }),
    gruppe: s.gruppe,
    kategori: s.kategori,
    art: 'valg',
    alternativer: SVARSETT[s.svar],
    ...(s.vises && { vises: s.vises }),
  }))
  const sporsmal = [...fraKatalog, ...egne]
  if (samlet.length > 0) {
    sporsmal.push({ id: SAMLET, tekst: 'Bekreft forutsetningene for planen', gruppe: 'vurdering', kategori: 'forbehold', art: 'avkrysning', alternativer: SVARSETT.bekreftet })
    for (const b of samlet) avbildninger.push({ type: 'bekreftelse', id: b.id, fra: [{ sporsmal: SAMLET }], kombinasjon: 'alle' })
  }
  // Gruppene i fast rekkefølge; innen gruppen katalogens rekkefølge, så regelens.
  const ordnet = GRUPPEREKKEFOLGE.flatMap((gr) => sporsmal.filter((s) => s.gruppe === gr))
  const ut: Flytoppsett = { regel: r, katalog, sporsmal: ordnet, avbildninger, forbehold, samlet, avledet }
  if (nok) lagret.set(r, (lagret.get(r) ?? new Map()).set(nok, ut))
  return ut
}

type Bidrag = 'ja' | 'nei' | 'noytral' | 'ukjent' | 'ikke_aktuell'

/** Det ett spørsmål sier om en betingelse. */
function bidrag(k: Svarkilde, svar: string | undefined): Bidrag {
  if (svar === 'ikke_aktuell') return 'ikke_aktuell'
  if (svar === undefined || svar === 'ukjent') return 'ukjent'
  if (jaVed(k).includes(svar)) return 'ja'
  if (neiVed(k).includes(svar)) return 'nei'
  return 'noytral'
}

/** Betingelsens verdi: sann, usann eller `undefined` (ukjent, aldri et trygt svar). */
function verdi(a: Avbildning, svarPa: (id: string) => string | undefined): boolean | undefined {
  const b = a.fra.map((k) => bidrag(k, svarPa(k.sporsmal)))
  if (a.kombinasjon === 'en') {
    if (b.includes('ja')) return true
    if (b.includes('ukjent')) return undefined
    return b.includes('nei') ? false : undefined
  }
  if (b.includes('nei')) return false
  if (b.includes('ukjent')) return undefined
  return b.includes('ja') ? true : undefined
}

/** Om regelens kliniske omfang har et tilfelle med dette svaret på spørsmålet; uten omfang gjelder hvert svar. */
const iOmfang = (r: Regel, sporsmal: string, v: boolean) => !r.klinisk_omfang || r.klinisk_omfang.tilfeller.some((t) => (t.svar[sporsmal] ?? false) === v)

/** Om svaret `v` på regelens spørsmål kan gi en godkjent plan: i omfanget, og for ja ikke utelukket av preparatene. */
const kanGiPlan = (r: Regel, sporsmal: string, v: boolean, utelukket: readonly string[] = []) => iOmfang(r, sporsmal, v) && !(v && utelukket.includes(sporsmal))

/**
 * Forholdene den godkjente planen ikke gjelder for, etter regelens spørsmål
 * (det korte «ja»/«nei» i regelen): til steg 2, så klinikeren ser de viktigste
 * begrensningene før spørsmålene besvares (P0 U1).
 */
export const begrensninger = (r: Regel, utelukket: readonly string[] = []): string[] =>
  (r.sporsmal ?? []).flatMap((s) => [...(kanGiPlan(r, s.id, true, utelukket) ? [] : [s.ja]), ...(!kanGiPlan(r, s.id, false) && s.nei ? [s.nei] : [])])

export interface Motorfelt {
  svar: Record<string, boolean>
  pasientforhold: Record<string, boolean>
  bekreftet: string[]
}

export interface Flytresultat {
  oppsett: Flytoppsett
  /** De synlige spørsmålene, i rekkefølge. */
  sporsmal: Flytsporsmal[]
  /** Feltene motoren leser, fra svarene på de synlige spørsmålene. */
  felt: Motorfelt
  /** Forbehold og avledede forutsetninger som står i planen og kopien. */
  forutsatt: string[]
  /** Synlige spørsmål som er ubesvart, «Ukjent» eller «Ikke ennå». */
  gjenstar: Flytsporsmal[]
  /**
   * Svarene som stopper planen, med forklaringen: den ene kilden for «dette
   * svaret stopper». Forhåndskontrollen og visningen leser den herfra, så de
   * aldri kan si noe annet enn flyten om samme svar.
   */
  stopp: Stoppforklaring[]
  /** Et svar som krever skriftlig begrunnelse, med hva det gjelder. */
  begrunnelse?: { hjelp: string }
  /** Stoppgruppens spørsmål «Ingen av disse» kan besvare (beslutning B5); tom uten den. */
  ingenAvDisse: string[]
}

/** Om svaret som er valgt på spørsmålet, stopper planen. */
export const svarStopper = (s: Pick<Flytsporsmal, 'valgt' | 'stopperVed'>): boolean => s.valgt !== undefined && (s.stopperVed?.includes(s.valgt) ?? false)

/** Svarene som gjør at regelen ikke kan gi en plan, og forklaringen. */
function stopp(r: Regel, def: Definisjon, avbildninger: readonly Avbildning[], utelukket: readonly string[] = []): { ved: string[]; forklaring?: string } {
  const ved = new Set<string>()
  let forklaring: string | undefined
  for (const a of avbildninger) {
    const k = a.fra.find((x) => x.sporsmal === def.id)
    if (!k) continue
    for (const alt of def.alternativer) {
      const b = bidrag(k, alt.verdi)
      const stopper =
        a.type === 'unntak'
          ? b === 'ja'
          : a.type === 'bekreftelse'
            ? b === 'nei' && def.alternativer !== SVARSETT.ja_ikke_enna
            : (b === 'ja' && !kanGiPlan(r, a.id, true, utelukket)) || (b === 'nei' && !kanGiPlan(r, a.id, false))
      if (!stopper) continue
      ved.add(alt.verdi)
      const s = a.type === 'sporsmal' ? r.sporsmal?.find((x) => x.id === a.id) : undefined
      forklaring ??= a.forklaring ?? (s ? ingenGodkjentPlan(b === 'ja' ? s.ja : (s.nei ?? 'dette svaret')) : undefined)
    }
  }
  return { ved: [...ved], ...(forklaring && { forklaring }) }
}

/** Flyten for regelen med svarene som er gitt (spørsmålets id → verdien). */
export function vurderFlyt(r: Regel, svar: Readonly<Record<string, string>>, g: Flytgrunnlag = {}): Flytresultat {
  const oppsett = flytoppsett(r, g)
  const { sporsmal: defs, avbildninger } = oppsett
  const beslutninger = g.beslutninger ?? BESLUTNINGER
  const stopper = new Map(defs.map((d) => [d.id, stopp(r, d, avbildninger, g.utelukket)]))
  const bruker = new Map(defs.map((d) => [d.id, avbildninger.filter((a) => a.fra.some((k) => k.sporsmal === d.id))]))

  // Synlighet: en fast punkt-iterasjon fra ingen synlige, så et skjult spørsmål aldri bidrar.
  let synlige = new Set<string>()
  const svarPa = (sett: Set<string>) => (id: string) => {
    if (sett.has(id)) return svar[id]
    const d = defs.find((x) => x.id === id)
    // Et spørsmål som er skjult fordi svaret det avhenger av ikke utløser det, er ikke aktuelt.
    return d?.vises && sett.has(d.vises.sporsmal) && svar[d.vises.sporsmal] !== undefined && !d.vises.svar.includes(svar[d.vises.sporsmal]!) ? 'ikke_aktuell' : undefined
  }
  const regelsvar = (sett: Set<string>) =>
    Object.fromEntries(
      avbildninger
        .filter((a) => a.type === 'sporsmal')
        .flatMap((a) => {
          const v = verdi(a, svarPa(sett))
          return v === undefined ? [] : [[a.id, v]]
        }),
    ) as Record<string, boolean>
  for (let i = 0; i <= defs.length; i++) {
    const rs = regelsvar(synlige)
    const gjeldende = new Set(gjeldendeBekreftelser(r, rs).map((b) => b.id))
    const trengs = (d: Definisjon) => (bruker.get(d.id) ?? []).some((a) => a.type !== 'bekreftelse' || gjeldende.has(a.id))
    const vises = (d: Definisjon) => !d.vises || (synlige.has(d.vises.sporsmal) && d.vises.svar.includes(svar[d.vises.sporsmal] ?? ''))
    const neste = new Set(defs.filter((d) => trengs(d) && vises(d)).map((d) => d.id))
    if (neste.size === synlige.size && [...neste].every((x) => synlige.has(x))) break
    synlige = neste
  }
  // Et svar som stopper planen, skjuler gruppene etter: de kan ikke endre utfallet. Reservevisningen viser alt, som dagens skjema (S5).
  const forste = oppsett.katalog && defs.find((d) => synlige.has(d.id) && svarStopper({ valgt: svar[d.id], stopperVed: stopper.get(d.id)!.ved }))
  if (forste) {
    const grense = GRUPPEREKKEFOLGE.indexOf(forste.gruppe)
    synlige = new Set([...synlige].filter((id) => GRUPPEREKKEFOLGE.indexOf(defs.find((d) => d.id === id)!.gruppe) <= grense))
  }

  const synligSvar = svarPa(synlige)
  const felt: Motorfelt = { svar: {}, pasientforhold: {}, bekreftet: [] }
  for (const a of avbildninger) {
    const v = verdi(a, synligSvar)
    if (a.type === 'sporsmal' && v !== undefined) felt.svar[a.id] = v
    if (a.type === 'unntak' && v !== undefined) felt.pasientforhold[a.id] = v
    if (a.type === 'bekreftelse' && v === true) felt.bekreftet.push(a.id)
  }
  const gjeldende = new Set(gjeldendeBekreftelser(r, felt.svar).map((b) => b.id))
  for (const b of oppsett.forbehold) if (gjeldende.has(b.id)) felt.bekreftet.push(b.id)
  felt.bekreftet = r.bekreftelser.map((b) => b.id).filter((id) => felt.bekreftet.includes(id) && gjeldende.has(id))

  const forutsatt = r.bekreftelser.filter((b) => (oppsett.forbehold.includes(b) && gjeldende.has(b.id)) || (oppsett.avledet.includes(b.id) && felt.bekreftet.includes(b.id))).map((b) => b.tekst)

  const vist: Flytsporsmal[] = defs
    .filter((d) => synlige.has(d.id))
    .map((d) => {
      const st = stopper.get(d.id)!
      const punkter = d.id === SAMLET ? oppsett.samlet.filter((b) => gjeldende.has(b.id)).map((b) => b.tekst) : undefined
      const valgt = svar[d.id]
      const ukjent = valgt === 'ukjent'
      return {
        id: d.id,
        tekst: d.tekst,
        ...(d.hjelp && { hjelp: d.hjelp }),
        gruppe: d.gruppe,
        kategori: d.kategori,
        art: d.art,
        svar: d.alternativer.map((a) => a.verdi),
        alternativer: d.alternativer,
        ...(st.ved.length > 0 && { stopperVed: st.ved }),
        ...((st.forklaring || ukjent) && { forklaring: ukjent ? UKJENT_FORKLARING : st.forklaring }),
        ...(punkter && { punkter }),
        ...(valgt !== undefined && d.alternativer.some((a) => a.verdi === valgt) && { valgt }),
      }
    })
    // Den samlede avkrysningen vises bare når det er noe å bekrefte.
    .filter((s) => s.id !== SAMLET || (s.punkter ?? []).length > 0)
  const gjenstar = vist.filter((s) => s.valgt === undefined || s.valgt === 'ukjent' || (s.valgt === 'nei' && s.alternativer === SVARSETT.ja_ikke_enna))
  const stoppgrunner: Stoppforklaring[] = vist
    .filter((s) => svarStopper(s))
    .map((s) => ({
      kode: 'svar_stopper',
      tekst: s.forklaring ?? ((bruker.get(s.id) ?? []).some((a) => a.type === 'unntak') ? UNNTAK_STANDARD : INDIVIDUELT),
      losning: 'individuelt',
      sporsmal: s.id,
    }))

  const begrunnes = (r.sporsmal ?? []).filter((s) => s.krever_begrunnelse && felt.svar[s.id] === true)
  const ingenAvDisse = beslutninger.B5
    ? vist.filter((s) => s.gruppe === 'stopp' && s.valgt === undefined && s.alternativer === SVARSETT.ja_nei_ukjent && (bruker.get(s.id) ?? []).every((a) => a.type === 'unntak')).map((s) => s.id)
    : []
  return {
    oppsett,
    sporsmal: vist,
    felt,
    forutsatt,
    gjenstar,
    stopp: stoppgrunner,
    ...(begrunnes.length > 0 && { begrunnelse: { hjelp: `Svaret ${begrunnes.map((s) => `«${s.ja}»`).join(' og ')} krever en skriftlig begrunnelse.` } }),
    ingenAvDisse,
  }
}

/** Svarene med «Nei» på stoppforholdene `ider` som ikke er besvart (beslutning B5); de som er besvart, står. */
export const medIngenAvDisse = (svar: Readonly<Record<string, string>>, ider: readonly string[]): Record<string, string> => ({
  ...Object.fromEntries(ider.filter((id) => svar[id] === undefined).map((id) => [id, 'nei'])),
  ...svar,
})

/** Skjemaet med motorfeltene fra flyten; alt annet i skjemaet står. */
export const medFlytfelt = (s: Planskjema, felt: Motorfelt): Planskjema => ({ ...s, svar: felt.svar, pasientforhold: felt.pasientforhold, bekreftet: felt.bekreftet })
