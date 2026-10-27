/**
 * Psychiatrienets tre switchtabeller, lest som struktur: radene, kolonnene,
 * cellene og gruppene, ikke anbefalingstekstene.
 *
 * Tabellene er MediaWiki-sider med én `<table class="switchtable">`. Første
 * rad har kolonnekodene, og hver rad etter den har koden og navnet til
 * virkestoffet og én celle per kolonne: en lenke til en egen side med
 * anbefalingen, eller «—» når kilden ikke har noen. Retningen er rad → kolonne
 * («from» → «to», eller «existing» → «add» for stemningsstabilisatorene).
 *
 * Lesingen brukes av skriptet som henter tabellene
 * (`scripts/verktoy-kartlegging.ts`) og av testene. Den kaster når en side
 * ikke har den formen den skal ha, så en endret kilde aldri blir lest stille
 * feil. Planen står i `docs/verktøy-utviklingsplan.md` (P1).
 */

export const PSYCHIATRIENET = 'https://psychiatrienet.nl'

export const KILDETABELLER = [
  {
    id: 'CombiningMoodstabilizers',
    tittel: 'Combining Moodstabilizers',
    radrolle: 'eksisterende',
    kolonnerolle: 'legges_til',
  },
  {
    id: 'SwitchAntidepressants',
    tittel: 'Switching Antidepressants',
    radrolle: 'fra',
    kolonnerolle: 'til',
  },
  {
    id: 'SwitchAntipsychotics',
    tittel: 'Switching Antipsychotics',
    radrolle: 'fra',
    kolonnerolle: 'til',
  },
] as const

export type Tabell_id = (typeof KILDETABELLER)[number]['id']

export function tabelladresse(id: Tabell_id): string {
  return `${PSYCHIATRIENET}/switchtabel/show?id=${id}`
}

/** En rad eller kolonne: koden i tabellen («Ag») og navnet når tabellen gir det («agomelatine»). */
export interface Tabellakse {
  kode: string
  navn: string | null
}

export type Celle =
  | { rad: string; kolonne: string; type: 'lenke'; href: string; tittel: string | null; tekst: string }
  | { rad: string; kolonne: string; type: 'tom'; tekst: string }

/**
 * En celle slik kildearkivet tar vare på den (P3): koordinatene og lenken,
 * uten lenketeksten eller -tittelen fra kilden.
 */
export type Arkivcelle = { rad: string; kolonne: string; type: 'lenke'; href: string } | { rad: string; kolonne: string; type: 'tom' }

/** En gruppe kilden behandler som én rad og kolonne, f.eks. «Rest AP». */
export interface Kildegruppe {
  navn: string
  href: string | null
  medlemmer: { navn: string; href: string | null }[]
}

/** En switchtabell; `I` er en annen identitet for en undertabell på en kildeside (P3). */
export interface Switchtabell<I extends string = Tabell_id> {
  id: I
  /** Overskriften på siden. */
  tittel: string
  /** Hva radene og kolonnene står for, slik tabellen sier det («from», «to»). */
  radetikett: string
  kolonneetikett: string
  rader: Tabellakse[]
  kolonner: Tabellakse[]
  celler: Celle[]
  grupper: Kildegruppe[]
  /** Sidens revisjon og når den ble lagret, fra MediaWikis kommentar i siden. */
  revisjon: number | null
  lagret: string | null
}

const ENTITETER: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' }

/** Teksten i et HTML-utsnitt: uten tagger, med tegnene oversatt og mellomrommene slått sammen. */
export function tekst(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (hel, e: string) => {
      if (e.startsWith('#x') || e.startsWith('#X')) return String.fromCodePoint(parseInt(e.slice(2), 16))
      if (e.startsWith('#') && e !== '#39') return String.fromCodePoint(Number(e.slice(1)))
      return ENTITETER[e] ?? hel
    })
    .replace(/[\s ]+/g, ' ')
    .trim()
}

function attributt(tag: string, navn: string): string | null {
  const m = new RegExp(`\\s${navn}="([^"]*)"`).exec(tag)
  return m ? tekst(m[1]!) : null
}

function lenker(html: string): { href: string | null; tittel: string | null; tekst: string }[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    href: attributt(m[1]!, 'href'),
    tittel: attributt(m[1]!, 'title'),
    tekst: tekst(m[2]!),
  }))
}

function celler(rad: string): { tag: 'th' | 'td'; html: string }[] {
  return [...rad.matchAll(/<(th|td)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => ({ tag: m[1] as 'th' | 'td', html: m[2]! }))
}

function feil(id: string, hva: string): never {
  throw new Error(`Switchtabellen ${id} har ikke den formen OUSFAR leser: ${hva}`)
}

/** Revisjonen og lagringstidspunktet MediaWiki skriver i en kommentar nederst i innholdet. */
export function lesRevisjon(html: string): { revisjon: number | null; lagret: string | null } {
  const m = /timestamp (\d{14}) and revision id (\d+)/.exec(html)
  if (!m) return { revisjon: null, lagret: null }
  const t = m[1]!
  return {
    revisjon: Number(m[2]),
    lagret: `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T${t.slice(8, 10)}:${t.slice(10, 12)}:${t.slice(12, 14)}Z`,
  }
}

/** Avsnittene «<b>Gruppe</b> = medlem, medlem …» over tabellen. */
function lesGrupper(innledning: string): Kildegruppe[] {
  const grupper: Kildegruppe[] = []
  for (const avsnitt of innledning.matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    const m = /<b>([\s\S]*?)<\/b>([\s\S]*?)=([\s\S]*)$/.exec(avsnitt[1]!)
    if (!m) continue
    const navnelenke = lenker(m[1]!)[0]
    const navn = tekst(m[1]!)
    if (!navn) continue
    grupper.push({
      navn,
      href: navnelenke?.href ?? null,
      medlemmer: lenker(m[3]!).map((l) => ({ navn: l.tekst, href: l.href })),
    })
  }
  return grupper
}

/**
 * Leser én switchtabell. Kaster når siden ikke har én switchtabell, når en
 * rad har feil antall celler, eller når en celle verken er en lenke eller tom.
 */
export function lesSwitchtabell<I extends string = Tabell_id>(id: I, html: string): Switchtabell<I> {
  const start = html.indexOf('<table class="switchtable"')
  if (start < 0 || html.indexOf('<table class="switchtable"', start + 1) >= 0) feil(id, 'ikke nøyaktig én switchtabell')
  const slutt = html.indexOf('</table>', start)
  if (slutt < 0) feil(id, 'tabellen slutter ikke')
  const innhold = html.indexOf('mw-parser-output')
  const innledning = html.slice(innhold < 0 ? 0 : innhold, start)

  const rader = [...html.slice(start, slutt).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)].map((m) => celler(m[1]!))
  const [hode, ...kropp] = rader
  if (!hode || hode.length < 3 || hode.some((c) => c.tag !== 'th')) feil(id, 'første rad er ikke kolonnekodene')

  const kolonner: Tabellakse[] = hode.slice(2).map((c) => ({ kode: tekst(c.html), navn: null }))
  if (kolonner.some((k) => !k.kode)) feil(id, 'en kolonne mangler kode')
  if (new Set(kolonner.map((k) => k.kode)).size !== kolonner.length) feil(id, 'to kolonner har samme kode')

  const tabellrader: Tabellakse[] = []
  const alle: Celle[] = []
  for (const rad of kropp) {
    if (rad.length !== kolonner.length + 2 || rad[0]!.tag !== 'th' || rad[1]!.tag !== 'th') {
      feil(id, `en rad har ${rad.length} celler, ikke ${kolonner.length + 2}`)
    }
    const kode = tekst(rad[0]!.html)
    tabellrader.push({ kode, navn: tekst(rad[1]!.html) || null })
    rad.slice(2).forEach((c, i) => {
      const kolonne = kolonner[i]!.kode
      const l = lenker(c.html)
      const t = tekst(c.html)
      if (c.tag !== 'td') feil(id, `cellen ${kode}→${kolonne} er en overskrift`)
      if (l.length === 1 && l[0]!.href) {
        alle.push({ rad: kode, kolonne, type: 'lenke', href: l[0]!.href, tittel: l[0]!.tittel, tekst: l[0]!.tekst })
      } else if (l.length === 0 && (t === '—' || t === '')) {
        alle.push({ rad: kode, kolonne, type: 'tom', tekst: t })
      } else {
        feil(id, `cellen ${kode}→${kolonne} er verken én lenke eller tom («${t}»)`)
      }
    })
  }
  if (new Set(tabellrader.map((r) => r.kode)).size !== tabellrader.length) feil(id, 'to rader har samme kode')

  // Kolonnene har bare koden; navnet står på raden med samme kode.
  const radnavn = new Map(tabellrader.map((r) => [r.kode, r.navn]))
  const merkede = kolonner.map((k) => ({ kode: k.kode, navn: radnavn.get(k.kode) ?? null }))

  const tittel = tekst(/<b>([\s\S]*?)<\/b>/.exec(innledning)?.[1] ?? '')
  const etiketter = hode.slice(0, 2).map((c) => tekst(c.html).replace(/[↓→]/g, '').trim())
  return {
    id,
    tittel,
    radetikett: etiketter[0] ?? '',
    kolonneetikett: etiketter[1] ?? '',
    rader: tabellrader,
    kolonner: merkede,
    celler: alle,
    grupper: lesGrupper(innledning),
    ...lesRevisjon(html),
  }
}

/** Det OUSFAR trenger å vite om en lenket side i P1: om den finnes, og hva den heter. */
export interface Kildeside {
  href: string
  status: number
  /** Adressen etter videresending, når den er en annen. */
  endelig: string | null
  overskrift: string | null
  revisjon: number | null
  lagret: string | null
}

export function lesKildeside(href: string, status: number, endelig: string | null, html: string): Kildeside {
  const h1 = /<h1>([\s\S]*?)<\/h1>/.exec(html)
  const egen = `${PSYCHIATRIENET}${href}`
  return {
    href,
    status,
    endelig: endelig && endelig !== egen ? endelig : null,
    overskrift: status === 200 && h1 ? tekst(h1[1]!) : null,
    ...(status === 200 ? lesRevisjon(html) : { revisjon: null, lagret: null }),
  }
}

/**
 * En switchtabell slik kildearkivet tar vare på den (P3): bare det som trengs
 * for å finne igjen hver anbefaling (aksene, gruppene og cellenes koordinater
 * og lenker), ingen tekst fra kilden utover koder og navn
 * (`docs/verktøy-p3-rettigheter.md`).
 */
export type Arkivtabell = Pick<Switchtabell<string>, 'radetikett' | 'kolonneetikett' | 'rader' | 'kolonner' | 'grupper'> & { celler: Arkivcelle[] }

export function arkivtabell(t: Switchtabell<string>): Arkivtabell {
  return {
    radetikett: t.radetikett,
    kolonneetikett: t.kolonneetikett,
    rader: t.rader,
    kolonner: t.kolonner,
    grupper: t.grupper,
    celler: t.celler.map((c) => (c.type === 'lenke' ? { rad: c.rad, kolonne: c.kolonne, type: 'lenke', href: c.href } : { rad: c.rad, kolonne: c.kolonne, type: 'tom' })),
  }
}
