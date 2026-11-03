/**
 * Kontrollen av kildedokumentene reglene bygger på (`KILDER` i
 * `regler/kilder.ts`, P12.1): hvert dokument med kontrollsum hentes og
 * sammenlignes med kontrollsummen fra da det ble lest. Bare kontrollsummen
 * beregnes; dokumentet lagres, skrives ut eller gjengis aldri.
 *
 * En nettside har ofte innhold som skifter fra gang til gang (skript,
 * engangsverdier). Kontrollsummen av en side sammenlignes derfor både med
 * siden slik den kom og med den synlige teksten (uten skript, stil og tagger,
 * med mellomrom samlet). Er grunnlaget fastsatt på nytt etter en faglig
 * vurdering, står det i `src/data/verktoy/kildekontroll-grunnlag.json`, med
 * metoden, og gjelder i stedet for kontrollsummen i `KILDER`.
 *
 * Med metoden `avsnitt` sammenlignes bare de avsnittene reglene bygger på,
 * hvert under sin overskrift, med kontrollsummen fra grunnlaget. Da gir en
 * endring i resten av siden (meny, oppsett, dynamiske elementer) ingen sak, og
 * en endring i et relevant avsnitt sier hvilket. Bare kontrollsummer lagres.
 */
import { createHash } from 'node:crypto'
import grunnlagsfil from '../../data/verktoy/kildekontroll-grunnlag.json'
import { ForbigaendeFeil, hentDokument, type Dokumentsvar } from '../kildehenting'
import type { Kilde } from '../regler/modell'
import { KILDER } from '../regler/kilder'
import { berortAvKilde, type Godkjentregel } from './berorte'
import { nivaFor, type Grunnlagsdel, type Overvakingsfunn } from './modell'

export type Kontrollmetode = 'dokument' | 'synlig_tekst' | 'avsnitt'

/** Et avsnitt reglene bygger på: overskriften det står under, og kontrollsummen av den synlige teksten i det. */
export interface Avsnittsgrunnlag {
  overskrift: string
  sha256: string
}

/** Et grunnlag fastsatt på nytt etter en faglig vurdering av at dokumentet kan brukes som før. */
export interface Fastsattgrunnlag {
  kilde: string
  metode: Kontrollmetode
  /** For `avsnitt`: kontrollsummen av avsnittenes kontrollsummer (`avsnittsavtrykk`). */
  sha256: string
  /** Bare for `avsnitt`: avsnittene som sammenlignes. */
  avsnitt?: Avsnittsgrunnlag[]
  /** Når dokumentet med denne kontrollsummen ble hentet (UTC). */
  fastsatt: string
  /** Hvem som vurderte endringen, og hva vurderingen var (PR, kontrollørens kommentar). */
  vurdering: string
}

export interface Dokumentgrunnlag {
  kilde: Kilde
  sha256: string
  /** Metoden kontrollsummen er laget med; `null` for kontrollsummen i `KILDER`, som gjelder dokumentet slik det ble hentet. */
  metode: Kontrollmetode | null
  fastsatt: string
  avsnitt?: Avsnittsgrunnlag[]
}

const FASTSATT = (grunnlagsfil as { dokumenter: Fastsattgrunnlag[] }).dokumenter

/** Grunnlaget for hvert dokument med kontrollsum: det fastsatte, ellers kontrollsummen fra da regelen ble skrevet. */
export function dokumentgrunnlag(kilder: readonly Kilde[] = KILDER, fastsatt: readonly Fastsattgrunnlag[] = FASTSATT): Dokumentgrunnlag[] {
  return kilder.flatMap((kilde): Dokumentgrunnlag[] => {
    const f = fastsatt.filter((x) => x.kilde === kilde.id).sort((a, b) => a.fastsatt.localeCompare(b.fastsatt)).at(-1)
    if (f) return [{ kilde, sha256: f.sha256, metode: f.metode, fastsatt: f.fastsatt, ...(f.avsnitt ? { avsnitt: f.avsnitt } : {}) }]
    return kilde.sha256 ? [{ kilde, sha256: kilde.sha256, metode: null, fastsatt: kilde.hentet }] : []
  })
}

/** Kildene uten kontrollsum (bare sammendraget er lest, eller Psychiatrienet, som har sitt eget arkiv): de overvåkes ikke her. */
export const uovervaketeKilder = (kilder: readonly Kilde[] = KILDER): Kilde[] => kilder.filter((k) => !k.sha256)

const sha256 = (x: Uint8Array | string) => createHash('sha256').update(x).digest('hex')

/** Den synlige teksten i en nettside: uten skript, stil og tagger, med mellomrom samlet. */
export function synligTekst(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const erSide = (type: string) => type === 'text/html' || type === 'application/xhtml+xml'

const normaliser = (t: string) => t.replace(/\s+/g, ' ').trim().toLowerCase()

const TEGN: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' }
/** De vanligste tegnreferansene i en overskrift, så den kan skrives som den står på siden. Teksten i avsnittene røres ikke. */
const tegn = (t: string) =>
  t.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (hele, r: string) =>
    r[0] === '#' ? String.fromCodePoint(r[1]?.toLowerCase() === 'x' ? parseInt(r.slice(2), 16) : Number(r.slice(1))) : (TEGN[r.toLowerCase()] ?? hele),
  )

/** Et avsnitt i en nettside: overskriften, nivået og den synlige teksten til neste overskrift på samme eller høyere nivå. */
export interface Sideavsnitt {
  overskrift: string
  niva: number
  tekst: string
}

/** Avsnittene i en nettside, i rekkefølge, uten skript, stil og kommentarer. */
export function avsnittI(html: string): Sideavsnitt[] {
  const ren = html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ')
  const overskrifter = [...ren.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi)].map((m) => ({ niva: Number(m[1]), overskrift: tegn(synligTekst(m[2]!)), fra: m.index!, til: m.index! + m[0].length }))
  return overskrifter.map((o, i) => {
    const neste = overskrifter.slice(i + 1).find((x) => x.niva <= o.niva)
    return { overskrift: o.overskrift, niva: o.niva, tekst: synligTekst(ren.slice(o.til, neste ? neste.fra : ren.length)) }
  })
}

/** Kontrollsummen av avsnittet under hver overskrift (det første med den overskriften), eller `null` når det ikke finnes. */
export const avsnittssummer = (html: string, overskrifter: readonly string[]): (string | null)[] => {
  const alle = avsnittI(html)
  return overskrifter.map((o) => {
    const a = alle.find((x) => normaliser(x.overskrift) === normaliser(o))
    return a ? sha256(a.tekst) : null
  })
}

/** Kontrollsummen av avsnittenes kontrollsummer, i rekkefølge; det samme så lenge avsnittene er de samme. */
export const avsnittsavtrykk = (summer: readonly (string | null)[]) => sha256(summer.map((s) => s ?? '-').join('\n'))

/** Kontrollsummene av svaret etter hver metode; den synlige teksten og avsnittene bare for en nettside, avsnittene bare med et grunnlag for dem. */
export function kontrollsummer(svar: Pick<Dokumentsvar, 'type' | 'bytes'>, avsnitt?: readonly Avsnittsgrunnlag[]): Record<Kontrollmetode, string | null> & { avsnitt_hver: (string | null)[] | null } {
  const html = erSide(svar.type) ? new TextDecoder().decode(svar.bytes) : null
  const hver = html !== null && avsnitt ? avsnittssummer(html, avsnitt.map((a) => a.overskrift)) : null
  return {
    dokument: sha256(svar.bytes),
    synlig_tekst: html !== null ? sha256(synligTekst(html)) : null,
    avsnitt: hver ? avsnittsavtrykk(hver) : null,
    avsnitt_hver: hver,
  }
}

/** Om svaret har samme innhold som grunnlaget, etter grunnlagets metode, eller for kontrollsummen i `KILDER` etter dokumentet eller den synlige teksten. */
export function somGrunnlaget(g: Dokumentgrunnlag, summer: Record<Kontrollmetode, string | null>): boolean {
  if (g.metode === 'avsnitt') return !!g.avsnitt && summer.avsnitt === avsnittsavtrykk(g.avsnitt.map((a) => a.sha256))
  return g.metode ? summer[g.metode] === g.sha256 : summer.dokument === g.sha256 || summer.synlig_tekst === g.sha256
}

export type Dokumenthenter = (url: string) => Promise<Dokumentsvar>

const kort = (sha: string | null) => (sha ? sha.slice(0, 12) : '–')

/** Kontrollerer dokumentene mot grunnlaget, ett om gangen, og gir funnene og hva som ble kontrollert. */
export async function kontrollerDokumenter(
  regler: readonly Godkjentregel[],
  hent: Dokumenthenter = (url) => hentDokument(url),
  grunnlag: readonly Dokumentgrunnlag[] = dokumentgrunnlag(),
): Promise<{ funn: Overvakingsfunn[]; grunnlag: Grunnlagsdel }> {
  const funn: Overvakingsfunn[] = []
  for (const g of grunnlag) {
    const { kilde } = g
    const berorte = berortAvKilde(regler, kilde.id)
    const lag = (art: Overvakingsfunn['art'], detaljer: string[]): Overvakingsfunn => ({
      id: `dokument:${kilde.id}`,
      kilde: 'dokument',
      art,
      niva: nivaFor(art, berorte),
      objekt: kilde.id,
      etikett: `${kilde.tittel} (${kilde.utgiver})`,
      detaljer,
      berorte,
    })
    let svar: Dokumentsvar
    try {
      svar = await hent(kilde.url)
    } catch (e) {
      funn.push(lag('utilgjengelig', [e instanceof ForbigaendeFeil ? 'Kilden svarte ikke etter flere forsøk; den kontrolleres igjen ved neste kjøring.' : `Kunne ikke hentes: ${e instanceof Error ? e.message : String(e)}`]))
      continue
    }
    const adresse = svar.endelig && svar.endelig !== kilde.url ? [`Adressen sender videre til ${svar.endelig}.`] : []
    if (svar.status === 404 || svar.status === 410) {
      funn.push(lag('fjernet', [`Adressen svarer ${svar.status}: dokumentet finnes ikke lenger der regelen henviser.`, ...adresse]))
      continue
    }
    if (svar.status !== 200) {
      funn.push(lag('utilgjengelig', [`Adressen svarer ${svar.status}; innholdet er ikke kontrollert.`, ...adresse]))
      continue
    }
    const summer = kontrollsummer(svar, g.avsnitt)
    if (somGrunnlaget(g, summer)) continue
    const naa = `Nå (til et nytt grunnlag etter vurdering): dokumentet ${summer.dokument}${summer.synlig_tekst ? `, den synlige teksten ${summer.synlig_tekst}` : ''} (${svar.type || 'ukjent type'}, hentet ${svar.hentet}).`
    if (g.metode === 'avsnitt') {
      const hver = summer.avsnitt_hver
      const avvik = (g.avsnitt ?? []).flatMap((a, i) => (!hver ? [] : hver[i] === null ? [`Avsnittet «${a.overskrift}» finnes ikke lenger under den overskriften.`] : hver[i] !== a.sha256 ? [`Avsnittet «${a.overskrift}» er endret.`] : []))
      funn.push({
        ...lag('endret', [
          ...(hver ? avvik : ['Svaret er ikke en nettside, så de relevante avsnittene kunne ikke sammenlignes.']),
          `Grunnlaget er avsnittene fastsatt ${g.fastsatt.slice(0, 10)}; versjonen regelen bygger på er «${kilde.versjon}».`,
          naa,
          ...adresse,
        ]),
        tilstandsavtrykk: summer.avsnitt ?? summer.dokument!,
      })
      continue
    }
    funn.push({
      ...lag('endret', [
        `Kontrollsummen stemmer ikke med grunnlaget fra ${g.fastsatt.slice(0, 10)} (${g.metode ? `${g.metode === 'dokument' ? 'dokumentet' : 'den synlige teksten'}, ` : ''}${kort(g.sha256)}). Dokumentet kan være revidert; versjonen regelen bygger på er «${kilde.versjon}».`,
        naa,
        ...adresse,
      ]),
      // Den synlige teksten for en nettside: innhold som skifter ved hver henting, gir ikke en ny sak hver uke.
      tilstandsavtrykk: g.metode === 'dokument' ? summer.dokument! : (summer.synlig_tekst ?? summer.dokument!),
    })
  }
  return {
    funn,
    grunnlag: { kilde: 'dokument', kjort: true, kontrollert: grunnlag.length, beskrivelse: `${grunnlag.length} kildedokumenter med kontrollsum i regelkildene` },
  }
}
