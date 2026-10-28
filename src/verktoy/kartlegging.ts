/**
 * Identitetskartleggingen for OUSFAR Verktøy (P1 i
 * `docs/verktøy-utviklingsplan.md`): hver rad og kolonne i Psychiatrienets
 * switchtabeller → OUSFAR-nøkkel → virkestoff i FEST → formuleringer.
 *
 * Kartleggingen (`src/data/verktoy/virkestoffkartlegging.json`) er valgt for
 * hånd. Øyeblikksbildene ved siden av den er laget av
 * `scripts/verktoy-kartlegging.ts`: tabellene, de lenkede kildesidene, FEST og
 * fagsidene i produksjon. Denne modulen kontrollerer at kartleggingen og
 * øyeblikksbildene stemmer overens (`kontrollerKartlegging`), og regner ut
 * dekningen og statusene rapporten viser. Ingenting her brukes av appen ennå.
 */
import { navnenokkel } from '../domain/sokenavn'
import { stoffslug } from '../domain/stoffregister'
import type { Celle, Kildegruppe, Kildeside, Switchtabell, Tabell_id } from './kildetabeller'
import type { Festformuleringer, Festpreparat, Festvirkestoff, Formuleringsklasse, Festoverstyring } from './festformuleringer'

/** Hva radene uten tillegg og radene med «_LA», «_ER» og «_MA» står for. */
export const KILDEFORMULERINGER = {
  standard: {
    klasser: ['peroral', 'peroral_modifisert'],
    forklaring: 'Rad uten tillegg. Kilden sier ikke om vanlig eller modifisert frisetting gjelder.',
  },
  LA: { klasser: ['depotinjeksjon'], forklaring: 'Long acting: depotinjeksjon.' },
  ER: {
    klasser: ['depotinjeksjon'],
    forklaring: 'Extended release. I Switching Antipsychotics er dette paliperidonpalmitat som depotinjeksjon, ikke peroral depottablett.',
  },
  MA: { klasser: ['middels_langtidsvirkende'], forklaring: 'Medium acting: injeksjon som virker i noen dager.' },
} as const satisfies Record<string, { klasser: readonly Formuleringsklasse[]; forklaring: string }>

export type Kildeformulering = keyof typeof KILDEFORMULERINGER

export interface Kildepreparat {
  varenavn: string
  /** Salt eller ester etter preparatomtalen, når den er kontrollert. */
  virkestoffform: string | null
  /** Intervallet som kilden eller preparatomtalen oppgir, når det er kontrollert. */
  intervall: string | null
  grunnlag: string | null
}

export type Kildeidentitet =
  | {
      kode: string
      kildenavn: string
      type: 'virkestoff'
      virkestoff: string
      kildeformulering: Kildeformulering
      preparater?: Kildepreparat[]
      merknad?: string
    }
  | { kode: string; kildenavn: string; type: 'gruppe'; gruppe: string }
  | { kode: string; kildenavn: string; type: 'ekskludert'; ekskludert: string }
  | { kode: string; kildenavn: null; type: 'start' | 'stopp' }

export interface Kartgruppe {
  id: string
  tabell: Tabell_id
  kode: string
  kildenavn: string
  medlemmer: { kildenavn: string; virkestoff: string }[]
  merknad: string
}

export interface Kartvirkestoff {
  /** OUSFAR-nøkkelen: fagsidens slug når siden finnes, ellers den foreslåtte. */
  nokkel: string
  /** Norsk navn: FESTs navn på moderstoffet, eller fagsidens navn når den har et annet. */
  navn: string
  /** Moderstoffene i FEST; saltene og esterne følger med. */
  fest: string[]
  /** Engelske navn og kildens stavemåter, til søket. */
  aliaser: string[]
  merknad?: string
}

export interface Virkestoffkartlegging {
  versjon: number
  oppdatert: string
  om: string
  ekskludert: {
    id: string
    navn: string
    kildekoder: { tabell: Tabell_id; kode: string; kildenavn: string }[]
    sperrenavn: string[]
    grunn: string
  }[]
  ikke_importert: { tabell: Tabell_id; kode: string; grunn: string }[]
  kildeidentiteter: Record<Tabell_id, Kildeidentitet[]>
  grupper: Kartgruppe[]
  virkestoffer: Kartvirkestoff[]
  festoverstyringer: Festoverstyring[]
  uten_kildevariant: { virkestoff: string; varenavn: string; grunn: string }[]
  /**
   * Lenker i kilden som ikke svarer 200, med det som ble funnet om dem, og
   * kildens egen side for samme anbefaling når den finnes på en annen adresse
   * (`null` når det er lett etter en uten å finne den). P3 henter den.
   */
  kjente_lenkeavvik: { href: string; funn: string; alternativ?: string | null }[]
}

export interface Tabellbilde {
  hentet: string
  tabeller: (Switchtabell & { url: string; sha256: string })[]
}

export interface Lenkebilde {
  hentet: string
  sider: Kildeside[]
}

export interface Fagsidebilde {
  hentet: string
  kilde: string
  sider: { slug: string; navn: string; fest: string[] }[]
}

export interface Stoffregisterfil {
  stoffer: { slug: string; navn: string; aliaser?: string[] }[]
}

export interface Kartdata {
  kartlegging: Virkestoffkartlegging
  tabeller: Tabellbilde
  lenker: Lenkebilde
  fest: Festformuleringer
  fagsider: Fagsidebilde
  stoffregister: Stoffregisterfil
}

/* --- Oppslag ---------------------------------------------------------------- */

export function identitet(k: Virkestoffkartlegging, tabell: Tabell_id, kode: string): Kildeidentitet | undefined {
  return k.kildeidentiteter[tabell].find((i) => i.kode === kode)
}

/** Om en rad eller kolonne er utelatt fra all import (johannesurt, Start). */
export function utelatt(k: Virkestoffkartlegging, tabell: Tabell_id, kode: string): string | null {
  const i = identitet(k, tabell, kode)
  if (i?.type === 'ekskludert') return i.ekskludert
  return k.ikke_importert.some((x) => x.tabell === tabell && x.kode === kode) ? 'ikke_importert' : null
}

export function erSperret(k: Virkestoffkartlegging, tekst: string): boolean {
  const n = navnenokkel(tekst)
  return n !== '' && k.ekskludert.some((e) => e.sperrenavn.some((s) => n.includes(navnenokkel(s))))
}

export function festFor(d: Kartdata, nokkel: string): Festvirkestoff[] {
  const v = d.kartlegging.virkestoffer.find((x) => x.nokkel === nokkel)
  return (v?.fest ?? []).map((id) => d.fest.virkestoffer.find((f) => f.id === id)).filter((f): f is Festvirkestoff => !!f)
}

export function preparaterFor(d: Kartdata, nokkel: string): Festpreparat[] {
  return festFor(d, nokkel).flatMap((f) => f.preparater)
}

/* --- Status per virkestoff -------------------------------------------------- */

export type Markedsgrunnlag = 'markedsfort' | 'kun_godkjenningsfritak' | 'ingen_markedsforte' | 'ingen_preparater'

export const MARKEDSGRUNNLAG: Record<Markedsgrunnlag, string> = {
  markedsfort: 'Markedsført legemiddel i Norge',
  kun_godkjenningsfritak: 'Bare preparater med godkjenningsfritak',
  ingen_markedsforte: 'Preparater i FEST, men ingen markedsført',
  ingen_preparater: 'Ingen preparater i FEST',
}

export interface Virkestoffstatus {
  fagside: { slug: string; navn: string } | null
  i_stoffregisterfilen: boolean
  marked: Markedsgrunnlag
  tabeller: Tabell_id[]
}

/** Markedsgrunnlaget av enkeltpreparatene (ikke kombinasjoner) i FEST. */
export function markedsgrunnlag(preparater: readonly Festpreparat[]): Markedsgrunnlag {
  const enkle = preparater.filter((p) => p.kombinert_med.length === 0)
  if (enkle.length === 0) return 'ingen_preparater'
  const markedsfort = enkle.filter((p) => p.marked === 'markedsfort')
  if (markedsfort.some((p) => p.preparattype === 'Legemiddel')) return 'markedsfort'
  return markedsfort.length > 0 ? 'kun_godkjenningsfritak' : 'ingen_markedsforte'
}

export function virkestoffstatus(d: Kartdata, v: Kartvirkestoff): Virkestoffstatus {
  const side = d.fagsider.sider.find((s) => s.slug === v.nokkel)
  const tabeller = (Object.keys(d.kartlegging.kildeidentiteter) as Tabell_id[]).filter(
    (t) =>
      d.kartlegging.kildeidentiteter[t].some((i) => i.type === 'virkestoff' && i.virkestoff === v.nokkel) ||
      d.kartlegging.grupper.some((g) => g.tabell === t && g.medlemmer.some((m) => m.virkestoff === v.nokkel)),
  )
  return {
    fagside: side ? { slug: side.slug, navn: side.navn } : null,
    i_stoffregisterfilen: d.stoffregister.stoffer.some((s) => s.slug === v.nokkel),
    marked: markedsgrunnlag(preparaterFor(d, v.nokkel)),
    tabeller,
  }
}

/* --- Dekning ---------------------------------------------------------------- */

export interface Tabelldekning {
  tabell: Tabell_id
  rader: number
  kolonner: number
  /** Alle celler i rutenettet, rader × kolonner. */
  celler: number
  /** Cellene der rad og kolonne er samme kildeidentitet. */
  diagonal: number
  lenkede: number
  tomme: number
  /** Tomme celler utenom diagonalen: kombinasjoner kilden ikke har en anbefaling for. */
  tomme_utenom_diagonal: number
  /** Lenker på diagonalen, f.eks. bytte innen Rest AP. */
  lenkede_paa_diagonal: number
  unike_lenkemal: number
  /** Lenkemål flere celler deler, med antallet celler. */
  delte_lenkemal: { href: string; celler: number }[]
  /** Lenkede celler der siden ikke svarte 200. */
  utilgjengelige: number
  /** Celler i rad eller kolonne for johannesurt. */
  ekskludert: { celler: number; lenkede: number }
  /** Celler i Start-kolonnen. */
  ikke_importert: { celler: number; lenkede: number }
  /** Lenkede celler som skal importeres i P3, og hvor mange av dem som svarte. */
  importmal: number
  importmal_tilgjengelige: number
}

export function tabelldekning(d: Kartdata, tabell: Switchtabell): Tabelldekning {
  const k = d.kartlegging
  const status = new Map(d.lenker.sider.map((s) => [s.href, s.status]))
  const lenket = (c: Celle): c is Extract<Celle, { type: 'lenke' }> => c.type === 'lenke'
  const ekskl = (c: Celle) => {
    const r = utelatt(k, tabell.id, c.rad)
    const kol = utelatt(k, tabell.id, c.kolonne)
    return r !== null && r !== 'ikke_importert' ? 'ekskludert' : kol !== null && kol !== 'ikke_importert' ? 'ekskludert' : r ?? kol
  }
  const diagonal = tabell.celler.filter((c) => c.rad === c.kolonne)
  const lenker = tabell.celler.filter(lenket)
  const teller = new Map<string, number>()
  for (const c of lenker) teller.set(c.href, (teller.get(c.href) ?? 0) + 1)
  const ekskluderte = tabell.celler.filter((c) => ekskl(c) === 'ekskludert')
  const ikkeImportert = tabell.celler.filter((c) => ekskl(c) === 'ikke_importert')
  const importmal = lenker.filter((c) => ekskl(c) === null)
  return {
    tabell: tabell.id,
    rader: tabell.rader.length,
    kolonner: tabell.kolonner.length,
    celler: tabell.celler.length,
    diagonal: diagonal.length,
    lenkede: lenker.length,
    tomme: tabell.celler.length - lenker.length,
    tomme_utenom_diagonal: tabell.celler.filter((c) => c.type === 'tom' && c.rad !== c.kolonne).length,
    lenkede_paa_diagonal: diagonal.filter(lenket).length,
    unike_lenkemal: teller.size,
    delte_lenkemal: [...teller].filter(([, n]) => n > 1).map(([href, celler]) => ({ href, celler })),
    utilgjengelige: lenker.filter((c) => status.get(c.href) !== 200).length,
    ekskludert: { celler: ekskluderte.length, lenkede: ekskluderte.filter(lenket).length },
    ikke_importert: { celler: ikkeImportert.length, lenkede: ikkeImportert.filter(lenket).length },
    importmal: importmal.length,
    importmal_tilgjengelige: importmal.filter((c) => status.get(c.href) === 200).length,
  }
}

/** Cellene som skal importeres i P3: lenkede, uten johannesurt og uten Start. */
export function importmal(d: Kartdata): (Extract<Celle, { type: 'lenke' }> & { tabell: Tabell_id })[] {
  return d.tabeller.tabeller.flatMap((t) =>
    t.celler
      .filter((c): c is Extract<Celle, { type: 'lenke' }> => c.type === 'lenke')
      .filter((c) => utelatt(d.kartlegging, t.id, c.rad) === null && utelatt(d.kartlegging, t.id, c.kolonne) === null)
      .map((c) => ({ ...c, tabell: t.id })),
  )
}

/* --- Kontroll --------------------------------------------------------------- */

function akser(t: Switchtabell): { kode: string; navn: string | null }[] {
  const ut = new Map<string, string | null>()
  for (const a of [...t.rader, ...t.kolonner]) if (!ut.has(a.kode) || a.navn) ut.set(a.kode, a.navn)
  return [...ut].map(([kode, navn]) => ({ kode, navn }))
}

function sammeGruppe(kilde: Kildegruppe | undefined, g: Kartgruppe): boolean {
  if (!kilde) return false
  const a = kilde.medlemmer.map((m) => m.navn).sort()
  const b = g.medlemmer.map((m) => m.kildenavn).sort()
  return a.length === b.length && a.every((x, i) => x === b[i])
}

/**
 * Alt som ikke stemmer mellom kartleggingen og øyeblikksbildene. En tom liste
 * betyr at hver rad og kolonne er kartlagt én gang, at hvert virkestoff har
 * riktig FEST-ID og fagside, at ingen navn kolliderer, at johannesurt ikke
 * finnes noe sted, og at hver depotinjeksjon i FEST er tilordnet en
 * kildevariant eller uttrykkelig står uten.
 */
export function kontrollerKartlegging(d: Kartdata): string[] {
  const k = d.kartlegging
  const feil: string[] = []
  const nokler = new Set(k.virkestoffer.map((v) => v.nokkel))
  const brukt = new Set<string>()

  // Hver rad og kolonne har nøyaktig én identitet, med kildens navn.
  for (const t of d.tabeller.tabeller) {
    const ids = k.kildeidentiteter[t.id] ?? []
    for (const a of akser(t)) {
      const funnet = ids.filter((i) => i.kode === a.kode)
      if (funnet.length !== 1) feil.push(`${t.id}: koden ${a.kode} er kartlagt ${funnet.length} ganger`)
      else if (funnet[0]!.kildenavn !== a.navn) feil.push(`${t.id}: ${a.kode} heter «${a.navn}» i kilden, ikke «${funnet[0]!.kildenavn}»`)
    }
    for (const i of ids) if (!akser(t).some((a) => a.kode === i.kode)) feil.push(`${t.id}: ${i.kode} finnes ikke i tabellen`)
    for (const i of ids) {
      if (i.type === 'virkestoff') {
        brukt.add(i.virkestoff)
        if (!nokler.has(i.virkestoff)) feil.push(`${t.id}: ${i.kode} peker på ukjent virkestoff ${i.virkestoff}`)
        feil.push(...kontrollerKildeformulering(d, t.id, i))
      }
      if (i.type === 'gruppe') {
        const g = k.grupper.find((x) => x.id === i.gruppe)
        if (!g || g.tabell !== t.id || g.kode !== i.kode) feil.push(`${t.id}: gruppen ${i.gruppe} mangler eller har feil kode`)
        else if (!sammeGruppe(t.grupper.find((x) => x.navn === g.kildenavn), g)) feil.push(`${t.id}: medlemmene i ${g.kildenavn} stemmer ikke med kilden`)
      }
      if (i.type === 'ekskludert' && !k.ekskludert.some((e) => e.id === i.ekskludert && e.kildekoder.some((c) => c.tabell === t.id && c.kode === i.kode))) {
        feil.push(`${t.id}: ${i.kode} er ekskludert uten å stå i ekskluderingslisten`)
      }
      if (i.type === 'start' && !k.ikke_importert.some((x) => x.tabell === t.id && x.kode === i.kode)) feil.push(`${t.id}: Start-kolonnen ${i.kode} er ikke utelatt`)
      if (i.type === 'stopp' && k.ikke_importert.some((x) => x.tabell === t.id && x.kode === i.kode)) feil.push(`${t.id}: Stop-kolonnen ${i.kode} er utelatt`)
    }
  }
  for (const g of k.grupper) {
    for (const m of g.medlemmer) {
      brukt.add(m.virkestoff)
      if (!nokler.has(m.virkestoff)) feil.push(`Gruppen ${g.kildenavn}: ukjent virkestoff ${m.virkestoff}`)
    }
  }

  // Virkestoffene: unike nøkler, ingen navnekollisjoner, FEST og fagsider stemmer.
  const navnTil = new Map<string, string>()
  for (const v of k.virkestoffer) {
    if (!brukt.has(v.nokkel)) feil.push(`${v.nokkel} brukes ikke av noen kildeidentitet`)
    for (const n of [v.navn, v.nokkel, ...v.aliaser]) {
      const nk = navnenokkel(n)
      const annen = navnTil.get(nk)
      if (annen && annen !== v.nokkel) feil.push(`Navnet «${n}» kolliderer mellom ${annen} og ${v.nokkel}`)
      navnTil.set(nk, v.nokkel)
      if (erSperret(k, n)) feil.push(`${v.nokkel}: navnet «${n}» er sperret`)
    }
    if (v.fest.length === 0) feil.push(`${v.nokkel} har ingen FEST-ID`)
    for (const id of v.fest) {
      const f = d.fest.virkestoffer.find((x) => x.id === id)
      if (!f || f.nokkel !== v.nokkel) feil.push(`${v.nokkel}: ${id} mangler i FEST-bildet`)
      else if (!f.navn) feil.push(`${v.nokkel}: ${id} finnes ikke i FEST-filen`)
      else if (erSperret(k, f.navn) || f.salter.some((s) => erSperret(k, s.navn))) feil.push(`${v.nokkel}: FEST-navnet er sperret`)
    }
    const side = d.fagsider.sider.find((s) => s.slug === v.nokkel)
    const sammeNavn = d.fagsider.sider.find((s) => navnenokkel(s.navn) === navnenokkel(v.navn))
    if (!side && v.nokkel !== stoffslug(v.navn)) feil.push(`${v.nokkel}: en ny fagside får nøkkelen ${stoffslug(v.navn)}`)
    if (sammeNavn && sammeNavn.slug !== v.nokkel) feil.push(`${v.nokkel}: fagsiden «${sammeNavn.navn}» har nøkkelen ${sammeNavn.slug}`)
    if (side && side.fest.length > 0 && [...side.fest].sort().join() !== [...v.fest].sort().join()) {
      feil.push(`${v.nokkel}: fagsiden er koblet til ${side.fest.join(', ')} i FEST, kartleggingen til ${v.fest.join(', ')}`)
    }
    const register = d.stoffregister.stoffer.find((s) => navnenokkel(s.navn) === navnenokkel(v.navn))
    if (register && register.slug !== v.nokkel) feil.push(`${v.nokkel}: stoffregisterfilen har nøkkelen ${register.slug}`)
  }
  for (const f of d.fest.virkestoffer) if (!nokler.has(f.nokkel)) feil.push(`FEST-bildet har ukjent nøkkel ${f.nokkel}`)

  // Johannesurt finnes ikke i noe OUSFAR skal bruke.
  for (const s of d.fagsider.sider) if (erSperret(k, s.navn) || erSperret(k, s.slug)) feil.push(`Fagsiden ${s.slug} er sperret`)
  for (const s of d.stoffregister.stoffer) {
    for (const n of [s.navn, s.slug, ...(s.aliaser ?? [])]) if (erSperret(k, n)) feil.push(`Stoffregisterfilen: «${n}» er sperret`)
  }
  for (const g of k.grupper) for (const m of g.medlemmer) if (erSperret(k, m.kildenavn)) feil.push(`Gruppen ${g.kildenavn}: ${m.kildenavn} er sperret`)
  for (const c of importmal(d)) if (erSperret(k, c.href)) feil.push(`Importmålet ${c.href} gjelder johannesurt`)

  // Hver lenke som ikke svarer, er kjent og forklart, og omvendt.
  for (const s of d.lenker.sider) {
    if (s.status !== 200 && !k.kjente_lenkeavvik.some((a) => a.href === s.href)) feil.push(`Lenken ${s.href} svarer ${s.status} og er ikke forklart`)
  }
  for (const a of k.kjente_lenkeavvik) {
    if (d.lenker.sider.find((s) => s.href === a.href)?.status === 200) feil.push(`Lenkeavviket ${a.href} svarer nå 200`)
  }

  // Overstyringene peker på preparater som finnes.
  for (const o of k.festoverstyringer) {
    if (!preparaterFor(d, o.virkestoff).some((p) => p.varenavn === o.varenavn)) feil.push(`Overstyringen av ${o.varenavn} (${o.virkestoff}) finner ikke preparatet`)
  }

  // Hver depot- og MA-injeksjon i FEST er tilordnet én kildevariant eller står uten.
  const tilordnet = new Map<string, string[]>()
  for (const [t, ids] of Object.entries(k.kildeidentiteter)) {
    for (const i of ids) {
      if (i.type !== 'virkestoff') continue
      for (const p of i.preparater ?? []) {
        const n = `${i.virkestoff}|${p.varenavn}`
        tilordnet.set(n, [...(tilordnet.get(n) ?? []), `${t}:${i.kode}`])
      }
    }
  }
  for (const u of k.uten_kildevariant) {
    const n = `${u.virkestoff}|${u.varenavn}`
    if (!preparaterFor(d, u.virkestoff).some((p) => p.varenavn === u.varenavn)) feil.push(`Uten kildevariant: ${u.varenavn} (${u.virkestoff}) finnes ikke i FEST`)
    tilordnet.set(n, [...(tilordnet.get(n) ?? []), 'uten kildevariant'])
  }
  for (const v of k.virkestoffer) {
    for (const p of preparaterFor(d, v.nokkel)) {
      if (p.klasse !== 'depotinjeksjon' && p.klasse !== 'middels_langtidsvirkende') continue
      const steder = tilordnet.get(`${v.nokkel}|${p.varenavn}`) ?? []
      if (steder.length !== 1) feil.push(`${p.navn_form_styrke} (${v.nokkel}) er tilordnet ${steder.length} steder: ${steder.join(', ') || 'ingen'}`)
    }
  }
  return feil
}

function kontrollerKildeformulering(d: Kartdata, tabell: Tabell_id, i: Extract<Kildeidentitet, { type: 'virkestoff' }>): string[] {
  const feil: string[] = []
  const f = KILDEFORMULERINGER[i.kildeformulering]
  if (!f) return [`${tabell}: ${i.kode} har ukjent kildeformulering ${i.kildeformulering}`]
  if (i.kildeformulering === 'standard') {
    if (i.preparater) feil.push(`${tabell}: ${i.kode} er en vanlig rad og skal ikke ha egne preparater`)
    return feil
  }
  if (!i.preparater?.length) return [`${tabell}: ${i.kode} (${i.kildenavn}) mangler preparatene i FEST`]
  const alle = preparaterFor(d, i.virkestoff)
  for (const p of i.preparater) {
    const treff = alle.filter((x) => x.varenavn === p.varenavn)
    if (treff.length === 0) feil.push(`${tabell}: ${i.kode} nevner ${p.varenavn}, som ikke finnes i FEST for ${i.virkestoff}`)
    for (const x of treff) {
      if (!(f.klasser as readonly string[]).includes(x.klasse)) feil.push(`${tabell}: ${x.navn_form_styrke} er ${x.klasse}, ikke ${f.klasser.join('/')}`)
    }
  }
  return feil
}
