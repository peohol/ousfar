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
 */
import { createHash } from 'node:crypto'
import grunnlagsfil from '../../data/verktoy/kildekontroll-grunnlag.json'
import { ForbigaendeFeil, hentDokument, type Dokumentsvar } from '../kildehenting'
import type { Kilde } from '../regler/modell'
import { KILDER } from '../regler/kilder'
import { berortAvKilde, type Godkjentregel } from './berorte'
import { nivaFor, type Grunnlagsdel, type Overvakingsfunn } from './modell'

export type Kontrollmetode = 'dokument' | 'synlig_tekst'

/** Et grunnlag fastsatt på nytt etter en faglig vurdering av at dokumentet kan brukes som før. */
export interface Fastsattgrunnlag {
  kilde: string
  metode: Kontrollmetode
  sha256: string
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
}

const FASTSATT = (grunnlagsfil as { dokumenter: Fastsattgrunnlag[] }).dokumenter

/** Grunnlaget for hvert dokument med kontrollsum: det fastsatte, ellers kontrollsummen fra da regelen ble skrevet. */
export function dokumentgrunnlag(kilder: readonly Kilde[] = KILDER, fastsatt: readonly Fastsattgrunnlag[] = FASTSATT): Dokumentgrunnlag[] {
  return kilder.flatMap((kilde): Dokumentgrunnlag[] => {
    const f = fastsatt.filter((x) => x.kilde === kilde.id).sort((a, b) => a.fastsatt.localeCompare(b.fastsatt)).at(-1)
    if (f) return [{ kilde, sha256: f.sha256, metode: f.metode, fastsatt: f.fastsatt }]
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

/** Kontrollsummene av svaret etter hver metode; den synlige teksten bare for en nettside. */
export function kontrollsummer(svar: Pick<Dokumentsvar, 'type' | 'bytes'>): Record<Kontrollmetode, string | null> {
  return {
    dokument: sha256(svar.bytes),
    synlig_tekst: erSide(svar.type) ? sha256(synligTekst(new TextDecoder().decode(svar.bytes))) : null,
  }
}

/** Om svaret har samme innhold som grunnlaget, etter grunnlagets metode, eller for kontrollsummen i `KILDER` etter en av dem. */
export function somGrunnlaget(g: Dokumentgrunnlag, summer: Record<Kontrollmetode, string | null>): boolean {
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
    const summer = kontrollsummer(svar)
    if (somGrunnlaget(g, summer)) continue
    funn.push(
      lag('endret', [
        `Kontrollsummen stemmer ikke med grunnlaget fra ${g.fastsatt.slice(0, 10)} (${g.metode ? `${g.metode === 'dokument' ? 'dokumentet' : 'den synlige teksten'}, ` : ''}${kort(g.sha256)}). Dokumentet kan være revidert; versjonen regelen bygger på er «${kilde.versjon}».`,
        `Nå (til et nytt grunnlag etter vurdering): dokumentet ${summer.dokument}${summer.synlig_tekst ? `, den synlige teksten ${summer.synlig_tekst}` : ''} (${svar.type || 'ukjent type'}, hentet ${svar.hentet}).`,
        ...adresse,
      ]),
    )
  }
  return {
    funn,
    grunnlag: { kilde: 'dokument', kjort: true, kontrollert: grunnlag.length, beskrivelse: `${grunnlag.length} kildedokumenter med kontrollsum i regelkildene` },
  }
}
