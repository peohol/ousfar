/**
 * Det OUSFAR leser av én kildeside hos Psychiatrienet i P3
 * (`docs/verktøy-utviklingsplan.md`): ikke anbefalingsteksten, men fakta om
 * den, så den kan gjenfinnes og en endring oppdages.
 *
 * Psychiatrienet gir ingen lisens til å kopiere tekstene
 * (`docs/verktøy-p3-rettigheter.md`), og repoet er offentlig. Derfor lagres
 * bare sidens identitet (tittel, revisjon), kontrollsummer av teksten,
 * retningen siden selv oppgir, hvilke slags avsnitt den har (ikke
 * overskriftene), legemidlene og gruppemedlemmene siden nevner, og en
 * eventuell undertabell med koordinater og lenker. Ingen setning fra
 * anbefalingen tas vare på, heller ikke korte sitater.
 *
 * Sidene er MediaWiki-sider. Innholdet står i `mw-parser-output`: først en
 * ramme med ett faktaboks per legemiddel (eller gruppe), så anbefalingen
 * («Switch medication from A to B», «Adding B to A» eller «Stop A») med
 * avsnitt som har et skilt foran overskriften, og til slutt referansene.
 */
import { createHash } from 'node:crypto'
import { arkivtabell, lesRevisjon, lesSwitchtabell, tekst, type Arkivtabell } from './kildetabeller'

/** Hvilken versjon av lesingen som laget en avlesning. Økes når lesingen eller normaliseringen endres. */
export const LESERVERSJON = 1

export type Sidetype = 'bytte' | 'tillegg' | 'seponering' | 'undertabell' | 'annen'

export type Avsnittstype = 'stopp' | 'start' | 'informasjon' | 'annet'

/** Skiltet foran en avsnittsoverskrift sier hva avsnittet er. */
const SKILT: Record<string, Avsnittstype> = {
  'Nietinrijdenbord.png': 'stopp',
  'Eenrichtingbord.png': 'start',
  'Infobord.png': 'informasjon',
}

export interface Sidelegemiddel {
  /** Navnet i faktaboksen, f.eks. «Amisulpride» eller «Rest anti-psychotics». */
  navn: string
  href: string | null
  /** Medlemmene når faktaboksen gjelder en gruppe. */
  medlemmer: { navn: string; href: string | null }[]
}

export interface Kildeinnhold {
  /** Sidens overskrift (h1). */
  overskrift: string | null
  revisjon: number | null
  lagret: string | null
  /** SHA-256 av hele innholdet som normalisert tekst. */
  sha256_side: string
  /** SHA-256 av selve anbefalingen (uten faktaboksene og referansene), som normalisert tekst. */
  sha256_anbefaling: string
  sidetype: Sidetype
  /** Retningen siden selv oppgir, med kildens navn: fra/til, eller eksisterende/legges til. */
  retning: { fra: string; til: string | null } | null
  /** Hva slags avsnitt anbefalingen har, i rekkefølge (stopp, start, informasjon …), uten overskriftene. */
  avsnitt: Avsnittstype[]
  legemidler: Sidelegemiddel[]
  /** En switchtabell på selve siden, f.eks. mellom paliperidondepotene. */
  undertabell: Arkivtabell | null
}

const sha256 = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex')

/** Teksten som kontrollsummen regnes av: uten kommentarer (MediaWiki skriver tidsbruk der), skript og tagger. */
export function normalisertTekst(html: string): string {
  return tekst(html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<(script|style)\b[\s\S]*?<\/\1>/g, ' ').replace(/<\/?(p|li|tr|div|br|h\d)\b[^>]*>/g, ' '))
}

/** Innholdet i `mw-parser-output`, til disclaimeren eller lagringskommentaren. */
function innhold(html: string): string {
  const start = html.indexOf('<div class="mw-parser-output">')
  if (start < 0) throw new Error('Kildesiden har ikke MediaWiki-innhold')
  const slutt = [html.indexOf('<div class="disclaimer"', start), html.indexOf('<!-- Saved in parser cache', start)]
    .filter((i) => i >= 0)
    .reduce((a, b) => Math.min(a, b), html.length)
  return html.slice(start, slutt)
}

/** Slutten på tabellen som starter ved `start`, med nøstede tabeller. */
function tabellslutt(html: string, start: number): number {
  const tagger = /<(\/?)table\b[^>]*>/g
  tagger.lastIndex = start
  let dybde = 0
  for (let m = tagger.exec(html); m; m = tagger.exec(html)) {
    dybde += m[1] ? -1 : 1
    if (dybde === 0) return m.index + m[0].length
  }
  throw new Error('En tabell på kildesiden slutter ikke')
}

function lenkene(html: string): { navn: string; href: string | null }[] {
  return [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => ({
    navn: tekst(m[2]!),
    href: tekst(/\shref="([^"]*)"/.exec(m[1]!)?.[1] ?? '') || null,
  }))
}

/** Faktaboksene: første rad er legemiddelet (en lenke) eller gruppens navn med medlemmene i et avsnitt under. */
function lesLegemidler(ramme: string): Sidelegemiddel[] {
  const ut: Sidelegemiddel[] = []
  for (const m of ramme.matchAll(/<table class="geneesmiddel"[^>]*>/g)) {
    const boks = ramme.slice(m.index, tabellslutt(ramme, m.index))
    const forste = /<td colspan="2"[^>]*>([\s\S]*?)<\/td>/.exec(boks)?.[1] ?? ''
    const lenke = lenkene(forste)[0]
    const avsnitt = /<p>([\s\S]*?)<\/p>/.exec(boks.slice(boks.indexOf(forste) + forste.length))?.[1]
    ut.push({
      navn: lenke?.navn || tekst(forste),
      href: lenke?.href ?? null,
      medlemmer: !lenke && avsnitt ? lenkene(avsnitt) : [],
    })
  }
  return ut
}

function lesAvsnitt(anbefaling: string): Kildeinnhold['avsnitt'] {
  return [...anbefaling.matchAll(/<div\b[^>]*>\s*<img\b[^>]*alt="([^"]*)"[^>]*>([\s\S]*?)<\/div>/g)]
    .filter((m) => tekst(m[2]!) !== '')
    .map((m) => SKILT[m[1]!] ?? 'annet')
}

function lesRetning(anbefaling: string, overskrift: string | null): Pick<Kildeinnhold, 'sidetype' | 'retning'> {
  // Uten referansemerkene («Sulpiride[1]»).
  const fet = (s: string) => tekst(s.replace(/<sup\b[\s\S]*?<\/sup>/g, ''))
  const bytte = /Switch medication from\s*<b>([\s\S]*?)<\/b>\s*to\s*<b>([\s\S]*?)<\/b>/.exec(anbefaling)
  if (bytte) return { sidetype: 'bytte', retning: { fra: fet(bytte[1]!), til: fet(bytte[2]!) } }
  // «Adding B to A»: A er det eksisterende legemiddelet, B det som legges til.
  const tillegg = /Adding\s*<b>([\s\S]*?)<\/b>\s*to\s*<b>([\s\S]*?)<\/b>/.exec(anbefaling)
  if (tillegg) return { sidetype: 'tillegg', retning: { fra: fet(tillegg[2]!), til: fet(tillegg[1]!) } }
  const stopp = /^Stop[- ](.+)$/i.exec(overskrift ?? '')
  if (stopp) return { sidetype: 'seponering', retning: { fra: stopp[1]!.trim(), til: null } }
  return { sidetype: 'annen', retning: null }
}

/**
 * Leser én kildeside. Kaster når siden ikke har MediaWiki-innhold, så en
 * feilside aldri blir lest som en anbefaling.
 */
export function lesKildeinnhold(html: string): Kildeinnhold {
  const h1 = /<h1>([\s\S]*?)<\/h1>/.exec(html)
  const overskrift = h1 ? tekst(h1[1]!) : null
  const alt = innhold(html)
  const rammestart = alt.indexOf('<table class="mywrapper"')
  const rammeslutt = rammestart < 0 ? -1 : tabellslutt(alt, rammestart)
  const ramme = rammestart < 0 ? '' : alt.slice(rammestart, rammeslutt)
  const etterRamme = rammestart < 0 ? alt : alt.slice(rammeslutt)
  const referanser = etterRamme.indexOf('<div class="myrefs"')
  const anbefaling = referanser < 0 ? etterRamme : etterRamme.slice(0, referanser)

  const undertabell = alt.includes('<table class="switchtable"') ? arkivtabell(lesSwitchtabell(overskrift ?? 'undertabell', alt)) : null
  const retning = lesRetning(anbefaling, overskrift)
  return {
    overskrift,
    ...lesRevisjon(html),
    sha256_side: sha256(normalisertTekst(alt)),
    sha256_anbefaling: sha256(normalisertTekst(anbefaling)),
    ...(undertabell && !retning.retning ? { sidetype: 'undertabell' as const, retning: null } : retning),
    avsnitt: lesAvsnitt(anbefaling),
    legemidler: lesLegemidler(ramme),
    undertabell,
  }
}
