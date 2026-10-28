/**
 * Psychiatrienets anbefalinger som kildeoppføringer (P3 i
 * `docs/verktøy-utviklingsplan.md`): én oppføring per tabellcelle (og per
 * celle i en undertabell på en kildeside), laget av kildearkivet og
 * identitetskartleggingen fra P1.
 *
 * En oppføring sier hvor anbefalingen kommer fra (tabell, rad, kolonne),
 * hvilke virkestoffer, formuleringer og hvilken retning den gjelder, hvilken
 * side og revisjon den ble hentet fra og når, kontrollsummen, om den gjelder
 * ett virkestoff eller en gruppe og om siden deles med andre celler, om den er
 * tilgjengelig, og kjente problemer med kilden. Den er en kildeoppføring, ikke
 * en faglig godkjent regel: regelmodellen og godkjenningen kommer i P4, og
 * ingenting her brukes av appen.
 *
 * Her står også hvilke sider en innhenting skal hente
 * (`importmalForTabeller`), så johannesurt og Start-kolonnen aldri blir hentet.
 */
import { navnenokkel } from '../domain/sokenavn'
import { erSperret, identitet, utelatt, type Kildeformulering, type Virkestoffkartlegging } from './kartlegging'
import type { Kildearkiv, Sideversjon, Tabellversjon, Uttrekk } from './kildearkiv'
import { utsnitt } from './kildearkiv'
import { KILDETABELLER, PSYCHIATRIENET, type Celle, type Tabell_id } from './kildetabeller'

/** Hvor dypt innhentingen følger undertabeller på kildesidene (paliperidondepotene er ett nivå). */
export const UNDERTABELLDYBDE = 2

type Lenkecelle = Extract<Celle, { type: 'lenke' }>
type Celletabell = { id: Tabell_id; celler: readonly Celle[] }

/* --- Hva som skal hentes ---------------------------------------------------- */

/** Lenkede celler som skal importeres: uten johannesurt, uten Start og uten lenker med et sperret navn. */
export function importceller(k: Virkestoffkartlegging, t: Celletabell): Lenkecelle[] {
  return t.celler
    .filter((c): c is Lenkecelle => c.type === 'lenke')
    .filter((c) => utelatt(k, t.id, c.rad) === null && utelatt(k, t.id, c.kolonne) === null)
    .filter((c) => !erSperret(k, c.href))
}

/** Lenkene i tabellene som skal hentes, og kildens egen side der tabellen lenker feil (`kjente_lenkeavvik`). */
export function importmalForTabeller(k: Virkestoffkartlegging, tabeller: readonly Celletabell[]): string[] {
  const hrefs = new Set(tabeller.flatMap((t) => importceller(k, t).map((c) => c.href)))
  for (const a of k.kjente_lenkeavvik) if (hrefs.has(a.href) && a.alternativ) hrefs.add(a.alternativ)
  return [...hrefs].sort()
}

/** Lenkene i en undertabell på en kildeside som skal hentes. */
export function undertabellmal(k: Virkestoffkartlegging, side: Sideversjon | Pick<Sideversjon, 'innhold'>): string[] {
  const t = side.innhold?.undertabell
  if (!t) return []
  return t.celler.filter((c): c is Lenkecelle => c.type === 'lenke' && !erSperret(k, c.href)).map((c) => c.href)
}

/* --- Oppføringene ----------------------------------------------------------- */

export interface Kildepart {
  kode: string
  /** Kildens navn på raden eller kolonnen; `null` for Stop. */
  kildenavn: string | null
  type: 'virkestoff' | 'gruppe' | 'stopp'
  /** OUSFAR-nøklene: virkestoffet, eller gruppens medlemmer. */
  virkestoffer: string[]
  gruppe: string | null
  formulering: Kildeformulering | null
  /** Raden eller kolonnen i en undertabell, f.eks. «Paliperidone LP». */
  variant: { kode: string; navn: string | null } | null
}

export type Anbefalingstype = 'bytte' | 'tillegg' | 'seponering'
export type Tilgjengelighet = 'hentet' | 'alternativ_adresse' | 'utilgjengelig'

export interface Kildeanbefaling {
  /** `tabell:rad>kolonne`, med `/rad>kolonne` for en celle i en undertabell. */
  id: string
  tabell: Tabell_id
  rad: string
  kolonne: string
  /** Cellen i undertabellen på kildesiden `side`, når anbefalingen står der. */
  under: { side: string; rad: string; kolonne: string } | null
  /** Bytte (fra → til), tillegg (eksisterende → legges til) eller seponering (Stop, uten til). */
  type: Anbefalingstype
  fra: Kildepart
  til: Kildepart | null
  /** Lenken i tabellen. */
  href: string
  /** Siden anbefalingen er hentet fra: lenken, eller kildens egen side når lenken ikke svarer. */
  kildeside: string | null
  url: string | null
  /** Svaret fra siden (200, 404 …). */
  http_status: number | null
  revisjon: number | null
  lagret: string | null
  hentet: string | null
  uttrekk: number
  sha256_side: string | null
  sha256_anbefaling: string | null
  /** `gruppe` når fra eller til er en kildegruppe (Rest AP, Partial agonist). */
  grunnlag: 'individuell' | 'gruppe'
  /** Andre celler med samme kildeside. */
  delt_med: string[]
  /** Andre celler på andre adresser med nøyaktig samme anbefalingstekst. */
  samme_tekst_som: string[]
  tilgjengelighet: Tilgjengelighet
  kildeproblemer: string[]
  /** Alltid en kildeoppføring; faglig godkjenning er en egen ting (P4). */
  status: 'kildeoppføring'
}

export type Cellestatus =
  | Tilgjengelighet
  | 'undertabell'
  | 'ingen_anbefaling'
  | 'diagonal'
  | 'ekskludert'
  | 'ikke_importert'
  | 'ukartlagt'

export interface Kildegrunnlag {
  uttrekk: Uttrekk
  tabeller: Tabellversjon[]
  anbefalinger: Kildeanbefaling[]
  /** Status for hver celle i hver tabell (og undertabell), nøklet som `id`. */
  celler: Map<string, Cellestatus>
}

const KORT_TYPE: Record<Tabell_id, 'tillegg' | 'bytte'> = {
  CombiningMoodstabilizers: 'tillegg',
  SwitchAntidepressants: 'bytte',
  SwitchAntipsychotics: 'bytte',
}

export const cellenokkel = (tabell: string, rad: string, kolonne: string, under?: { rad: string; kolonne: string } | null) =>
  `${tabell}:${rad}>${kolonne}${under ? `/${under.rad}>${under.kolonne}` : ''}`

function part(k: Virkestoffkartlegging, tabell: Tabell_id, kode: string, variant: Kildepart['variant'] = null): Kildepart | null {
  const i = identitet(k, tabell, kode)
  if (!i) return null
  if (i.type === 'virkestoff') {
    return { kode, kildenavn: i.kildenavn, type: 'virkestoff', virkestoffer: [i.virkestoff], gruppe: null, formulering: i.kildeformulering, variant }
  }
  if (i.type === 'gruppe') {
    const g = k.grupper.find((x) => x.id === i.gruppe)
    return { kode, kildenavn: i.kildenavn, type: 'gruppe', virkestoffer: g?.medlemmer.map((m) => m.virkestoff) ?? [], gruppe: i.gruppe, formulering: 'standard', variant }
  }
  if (i.type === 'stopp') return { kode, kildenavn: null, type: 'stopp', virkestoffer: [], gruppe: null, formulering: null, variant }
  return null
}

/** Navnene en rad eller kolonne kan ha på en kildeside. */
function navnFor(k: Virkestoffkartlegging, p: Kildepart): Set<string> {
  const navn = [p.variant?.navn, p.variant ? null : p.kildenavn?.replace(/_/g, ' ')]
  if (!p.variant && p.type === 'virkestoff' && p.formulering === 'standard') {
    const v = k.virkestoffer.find((x) => x.nokkel === p.virkestoffer[0])
    navn.push(v?.navn, ...(v?.aliaser ?? []))
  }
  return new Set(navn.filter((n): n is string => !!n).map(navnenokkel))
}

function retningsproblemer(k: Virkestoffkartlegging, a: Kildeanbefaling, side: Sideversjon): string[] {
  const inn = side.innhold
  if (!inn) return []
  if (!inn.retning) return a.delt_med.length > 0 ? [] : ['Siden oppgir ikke selv hva den gjelder (ingen «from … to …», «Adding …» eller «Stop»).']
  const feil: string[] = []
  if (inn.sidetype !== a.type) feil.push(`Siden er en ${inn.sidetype}, cellen et ${a.type}.`)
  const stemmer = (navn: string | null, p: Kildepart | null) => !p || p.type === 'stopp' || (!!navn && navnFor(k, p).has(navnenokkel(navn)))
  if (!stemmer(inn.retning.fra, a.fra) || (a.type !== 'seponering' && !stemmer(inn.retning.til, a.til))) {
    const pil = (fra: string | null, til: string | null) => (a.type === 'seponering' ? `Stop ${fra ?? '–'}` : `${fra ?? '–'} → ${til ?? '–'}`)
    feil.push(`Siden oppgir ${pil(inn.retning.fra, inn.retning.til)}, tabellen ${pil(partnavn(a.fra), partnavn(a.til))}.`)
  }
  return feil
}

const partnavn = (p: Kildepart | null) => (p ? (p.variant?.navn ?? p.kildenavn ?? p.kode) : null)

function gruppeproblemer(k: Virkestoffkartlegging, a: Kildeanbefaling, side: Sideversjon): string[] {
  const grupper = [a.fra, a.til].filter((p) => p?.type === 'gruppe').map((p) => k.grupper.find((g) => g.id === p!.gruppe)!)
  const feil: string[] = []
  for (const boks of side.innhold?.legemidler ?? []) {
    if (boks.medlemmer.length === 0 || grupper.length === 0) continue
    const siden = new Set(boks.medlemmer.map((m) => navnenokkel(m.navn)))
    // Faktaboksen sammenlignes med gruppen den har flest medlemmer felles med.
    const g = grupper
      .map((x) => ({ x, felles: x.medlemmer.filter((m) => siden.has(navnenokkel(m.kildenavn))).length }))
      .sort((p, q) => q.felles - p.felles)[0]!.x
    const tabellen = new Set(g.medlemmer.map((m) => navnenokkel(m.kildenavn)))
    const mangler = g.medlemmer.filter((m) => !siden.has(navnenokkel(m.kildenavn))).map((m) => m.kildenavn)
    const ekstra = boks.medlemmer.filter((m) => !tabellen.has(navnenokkel(m.navn))).map((m) => m.navn)
    if (mangler.length || ekstra.length) {
      feil.push(
        `Faktaboksen «${boks.navn}» på siden har andre medlemmer enn ${g.kildenavn} i tabellen` +
          `${mangler.length ? `: mangler ${mangler.join(', ')}` : ''}${ekstra.length ? `${mangler.length ? ';' : ':'} har i tillegg ${ekstra.join(', ')}` : ''}.`,
      )
    }
  }
  return feil
}

/**
 * Kildeoppføringene i uttrekk `nr` (det siste når det ikke er gitt), og
 * statusen for hver celle. Kaster ikke på en ukjent kode i tabellen; cellen
 * får status `ukartlagt`, så kartleggingen må utvides før den kan importeres.
 */
export function kildegrunnlag(arkiv: Kildearkiv, k: Virkestoffkartlegging, nr?: number): Kildegrunnlag {
  const { uttrekk, tabeller, sider } = utsnitt(arkiv, nr)
  const anbefalinger: Kildeanbefaling[] = []
  const celler = new Map<string, Cellestatus>()

  const lagOppforing = (
    tabell: Tabell_id,
    rad: string,
    kolonne: string,
    href: string,
    fra: Kildepart,
    til: Kildepart | null,
    under: Kildeanbefaling['under'],
  ): Kildeanbefaling => {
    const avvik = k.kjente_lenkeavvik.find((x) => x.href === href)
    const direkte = sider.get(href)
    const alternativ = avvik?.alternativ ? sider.get(avvik.alternativ) : undefined
    const kilde = direkte?.status === 200 ? direkte : alternativ?.status === 200 ? alternativ : direkte ?? null
    const tilgjengelighet: Tilgjengelighet = direkte?.status === 200 ? 'hentet' : alternativ?.status === 200 ? 'alternativ_adresse' : 'utilgjengelig'
    const kildeproblemer: string[] = []
    if (!direkte) kildeproblemer.push('Siden er ikke hentet i dette uttrekket.')
    else if (direkte.status !== 200) {
      kildeproblemer.push(
        tilgjengelighet === 'alternativ_adresse'
          ? `Tabellen lenker til ${href}, som svarer ${direkte.status}; hentet fra kildens egen side ${avvik!.alternativ}.`
          : `Tabellen lenker til ${href}, som svarer ${direkte.status}.${avvik && avvik.alternativ === null ? ' Ingen annen adresse finnes; anbefalingen er ikke tilgjengelig.' : ''}`,
      )
    }
    const ok = kilde?.status === 200 ? kilde : null
    return {
      id: cellenokkel(tabell, rad, kolonne, under),
      tabell,
      rad,
      kolonne,
      under,
      type: til === null || til.type === 'stopp' ? 'seponering' : KORT_TYPE[tabell],
      fra,
      til: til?.type === 'stopp' ? null : til,
      href,
      kildeside: ok?.href ?? null,
      url: ok?.url ?? `${PSYCHIATRIENET}${href}`,
      http_status: kilde?.status ?? null,
      revisjon: ok?.innhold?.revisjon ?? null,
      lagret: ok?.innhold?.lagret ?? null,
      hentet: kilde?.hentet ?? null,
      uttrekk: uttrekk.nr,
      sha256_side: ok?.innhold?.sha256_side ?? null,
      sha256_anbefaling: ok?.innhold?.sha256_anbefaling ?? null,
      grunnlag: fra.type === 'gruppe' || til?.type === 'gruppe' ? 'gruppe' : 'individuell',
      delt_med: [],
      samme_tekst_som: [],
      tilgjengelighet,
      kildeproblemer,
      status: 'kildeoppføring',
    }
  }

  for (const t of tabeller) {
    for (const c of t.celler) {
      const id = cellenokkel(t.tabell, c.rad, c.kolonne)
      const ute = [utelatt(k, t.tabell, c.rad), utelatt(k, t.tabell, c.kolonne)]
      if (ute.some((u) => u !== null && u !== 'ikke_importert')) {
        celler.set(id, 'ekskludert')
        continue
      }
      if (ute.includes('ikke_importert')) {
        celler.set(id, 'ikke_importert')
        continue
      }
      const fra = part(k, t.tabell, c.rad)
      const til = part(k, t.tabell, c.kolonne)
      if (!fra || !til) {
        celler.set(id, 'ukartlagt')
        continue
      }
      if (c.type === 'tom') {
        celler.set(id, c.rad === c.kolonne ? 'diagonal' : 'ingen_anbefaling')
        continue
      }
      if (erSperret(k, c.href)) {
        celler.set(id, 'ekskludert')
        continue
      }
      const a = lagOppforing(t.tabell, c.rad, c.kolonne, c.href, fra, til, null)
      const side = a.kildeside ? sider.get(a.kildeside) : undefined
      const under = side?.innhold?.undertabell
      if (!under) {
        anbefalinger.push(a)
        celler.set(id, a.tilgjengelighet)
        continue
      }
      // Siden er selv en tabell, f.eks. mellom paliperidondepotene: anbefalingene står i cellene der.
      celler.set(id, 'undertabell')
      const navn = new Map(under.rader.map((r) => [r.kode, r.navn]))
      for (const u of under.celler) {
        const uid = cellenokkel(t.tabell, c.rad, c.kolonne, u)
        if (u.type === 'tom') {
          celler.set(uid, u.rad === u.kolonne ? 'diagonal' : 'ingen_anbefaling')
          continue
        }
        if (erSperret(k, u.href)) {
          celler.set(uid, 'ekskludert')
          continue
        }
        const ua = lagOppforing(
          t.tabell,
          c.rad,
          c.kolonne,
          u.href,
          { ...fra, variant: { kode: u.rad, navn: navn.get(u.rad) ?? null } },
          { ...til, variant: { kode: u.kolonne, navn: navn.get(u.kolonne) ?? null } },
          { side: a.kildeside!, rad: u.rad, kolonne: u.kolonne },
        )
        anbefalinger.push(ua)
        celler.set(uid, ua.tilgjengelighet)
      }
    }
  }

  // Delte sider og like tekster, og problemene som krever siden.
  const perSide = new Map<string, string[]>()
  const perTekst = new Map<string, Set<string>>()
  for (const a of anbefalinger) {
    if (!a.kildeside) continue
    perSide.set(a.kildeside, [...(perSide.get(a.kildeside) ?? []), a.id])
    if (a.sha256_anbefaling) perTekst.set(a.sha256_anbefaling, (perTekst.get(a.sha256_anbefaling) ?? new Set()).add(a.kildeside))
  }
  for (const a of anbefalinger) {
    if (!a.kildeside) continue
    a.delt_med = perSide.get(a.kildeside)!.filter((x) => x !== a.id)
    const andreSider = [...(perTekst.get(a.sha256_anbefaling!) ?? [])].filter((s) => s !== a.kildeside)
    a.samme_tekst_som = andreSider.flatMap((s) => perSide.get(s) ?? [])
    if (andreSider.length) a.kildeproblemer.push(`Samme anbefalingstekst som ${andreSider.join(', ')}.`)
    const side = sider.get(a.kildeside)!
    a.kildeproblemer.push(...retningsproblemer(k, a, side), ...gruppeproblemer(k, a, side))
  }
  return { uttrekk, tabeller, anbefalinger, celler }
}

/* --- Dekning ---------------------------------------------------------------- */

export interface Kildedekning {
  tabell: Tabell_id
  celler: number
  status: Record<Cellestatus, number>
  /** Oppføringer (celler med anbefaling, også i undertabeller). */
  anbefalinger: number
  grupper: number
  delte: number
  med_problemer: number
}

export const CELLESTATUSER: Record<Cellestatus, string> = {
  hentet: 'Hentet',
  alternativ_adresse: 'Hentet fra kildens egen side på en annen adresse',
  utilgjengelig: 'Lenket, men ikke tilgjengelig',
  undertabell: 'Lenker til en undertabell (anbefalingene står i den)',
  ingen_anbefaling: 'Ingen anbefaling i kilden («—»)',
  diagonal: 'Samme rad og kolonne, uten lenke',
  ekskludert: 'Ekskludert (johannesurt)',
  ikke_importert: 'Ikke importert (Start)',
  ukartlagt: 'Ukjent kode, ikke kartlagt',
}

export function kildedekning(g: Kildegrunnlag): Kildedekning[] {
  return KILDETABELLER.map(({ id }) => {
    const status = Object.fromEntries(Object.keys(CELLESTATUSER).map((s) => [s, 0])) as Record<Cellestatus, number>
    let celler = 0
    for (const [nokkel, s] of g.celler) {
      if (!nokkel.startsWith(`${id}:`) || nokkel.includes('/')) continue
      celler++
      status[s]++
    }
    const egne = g.anbefalinger.filter((a) => a.tabell === id)
    return {
      tabell: id,
      celler,
      status,
      anbefalinger: egne.length,
      grupper: egne.filter((a) => a.grunnlag === 'gruppe').length,
      delte: egne.filter((a) => a.delt_med.length > 0).length,
      med_problemer: egne.filter((a) => a.kildeproblemer.length > 0).length,
    }
  })
}
