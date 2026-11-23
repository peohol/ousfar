/**
 * Kontrollen som avgjør om en forbindelse kan kobles til en CID i PubChem
 * (`docs/kjemi.md`). Brukes av `scripts/kurer-forbindelser.ts` når
 * koblingene i `src/data/forbindelser.ts` lages eller kontrolleres på nytt;
 * synkroniseringen kobler aldri noe selv.
 *
 * Et navnetreff alene er aldri nok. En kobling godtas bare når
 *
 * 1. PubChem har nøyaktig én forbindelse med navnet, og den er én kovalent
 *    enhet (ikke et salt eller en blanding), med mindre forbindelsen er et salt;
 * 2. minst én uavhengig kilde — FDAs stoffregister GSRS (UNII) eller ChEBI,
 *    med samme navn — har samme skjelett (første blokk i InChIKey); og
 *    navnene som slås opp der, er det engelske navnet, synonymene i datafilen
 *    og PubChems tittel på treffet; og
 * 3. har den uavhengige kilden en annen stereokjemi eller protonering (resten
 *    av InChIKey), er PubChem-forbindelsen PubChems egen post for navnet
 *    (tittelen er navnet). Valget og forskjellen står i grunnlaget.
 *
 * Alt annet er uavklart, med grunnen og kandidatene, til noen har vurdert det.
 */
import { INCHIKEY, type Forbindelse, type Pubchemkobling, type Uavklart } from './forbindelser.js'
import { lesPubchemrad, skjelett, type Pubchemdata, type PubchemApi } from './pubchem.js'

/** En uavhengig kilde sitt bud på forbindelsen. */
export interface Uavhengig {
  kilde: 'GSRS' | 'ChEBI'
  /** Kildens egen ID: UNII-koden i GSRS, eller CHEBI:… */
  id: string
  inchikey: string
}

export interface Kurering {
  pubchem: PubchemApi
  /** De uavhengige kildenes treff for navnene. */
  uavhengige(navn: readonly string[]): Promise<Uavhengig[]>
  /** Dagens dato (ÅÅÅÅ-MM-DD). */
  idag: string
}

export type Kureringsresultat = { pubchem: Pubchemkobling; data: Pubchemdata } | { uavklart: Uavklart }

const GRESKE: Record<string, string> = { δ: 'delta', α: 'alpha', β: 'beta', γ: 'gamma', ω: 'omega' }

/**
 * Navnet uten det som skiller skrivemåter av samme navn: HTML-merking (ChEBI
 * skriver «<i>N</i>-desmethyl…» og «Δ<sup>9</sup>»), greske bokstaver,
 * store bokstaver, mellomrom, bindestreker og parenteser.
 */
export function navnenokkel(navn: string): string {
  return navn
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z]+;/gi, '')
    .toLowerCase()
    .replace(/[δαβγω]/g, (t) => GRESKE[t] ?? t)
    .replace(/[\s\-–,()[\]'′]/g, '')
}

const likeNavn = (a: string, b: string) => navnenokkel(a) === navnenokkel(b)

/**
 * Treffene i et søk i GSRS (FDAs Global Substance Registration System) på
 * nøyaktig ett navn ({@link gsrssok}): kjemiske substanser med struktur, med
 * UNII-koden som ID. GSRS er kuratert av FDA og henter ikke strukturene fra
 * PubChem, så det er en uavhengig kontroll. En post uten UNII (ikke tildelt
 * av FDA) regnes ikke som bekreftelse.
 */
export function gsrstreff(svar: unknown): Uavhengig[] {
  const innhold = (svar as { content?: unknown } | null)?.content
  if (!Array.isArray(innhold)) return []
  return innhold.flatMap((s: { approvalID?: unknown; structure?: { _inchiKey?: unknown } }) => {
    const { approvalID: id } = s
    const inchikey = s.structure?._inchiKey
    return typeof inchikey === 'string' && INCHIKEY.test(inchikey) && typeof id === 'string' && id.trim()
      ? [{ kilde: 'GSRS' as const, id, inchikey }]
      : []
  })
}

/** Søket i GSRS etter substansene som har nøyaktig dette navnet (alle navnene en substans har, uansett store og små bokstaver). */
export function gsrssok(navn: string): string {
  const sporring = `root_names_name:"^${navn.toUpperCase().replace(/["\\]/g, '')}$"`
  return `https://gsrs.ncats.nih.gov/api/v1/substances/search?q=${encodeURIComponent(sporring)}&top=10`
}

export async function kurerForbindelse(
  f: Pick<Forbindelse, 'engelsk' | 'form' | 'synonymer'>,
  k: Kurering,
): Promise<Kureringsresultat> {
  const cider = await k.pubchem.cidsForNavn(f.engelsk)
  if (cider.length === 0) return { uavklart: { grunn: `PubChem kjenner ikke navnet «${f.engelsk}».`, kandidater: [] } }
  if (cider.length > 1) {
    return { uavklart: { grunn: `PubChem har ${cider.length} forbindelser med navnet «${f.engelsk}».`, kandidater: cider.slice(0, 10) } }
  }
  const [rad] = await k.pubchem.egenskaper(cider)
  const lest = lesPubchemrad(rad)
  if ('avvik' in lest) return { uavklart: { grunn: `PubChem-svaret kan ikke leses: ${lest.avvik}.`, kandidater: cider } }
  const p = lest.data
  if (p.enheter > 1 && f.form !== 'salt') {
    return { uavklart: { grunn: `Treffet i PubChem (${p.tittel}) er et salt eller en blanding.`, kandidater: [p.cid] } }
  }

  const navn = [f.engelsk, ...(f.synonymer ?? []), p.tittel].filter((n, i, alle) => alle.findIndex((m) => likeNavn(m, n)) === i)
  const uavhengige = await k.uavhengige(navn)
  const samme = uavhengige.filter((u) => u.inchikey === p.inchikey)
  const sammeSkjelett = uavhengige.filter((u) => skjelett(u.inchikey) === skjelett(p.inchikey))
  const egenPost = likeNavn(p.tittel, f.engelsk)
  const kobling = (grunnlag: string): Kureringsresultat => ({
    pubchem: { cid: p.cid, inchikey: p.inchikey, formel: p.formel, kontrollert: k.idag, grunnlag },
    data: p,
  })
  const beskriv = (u: Uavhengig) => `${u.kilde} (${u.id})`

  if (samme.length > 0) {
    return kobling(`Eneste treff i PubChem for «${f.engelsk}»; samme InChIKey hos ${samme.map(beskriv).join(' og ')}.`)
  }
  if (sammeSkjelett.length > 0 && egenPost) {
    return kobling(
      `PubChems post for «${f.engelsk}» (tittel «${p.tittel}»); ${sammeSkjelett.map(beskriv).join(' og ')} har samme skjelett, ` +
        `men en annen stereokjemi eller protonering i InChIKey. Formelen og molekylvekten er de samme.`,
    )
  }
  if (sammeSkjelett.length > 0) {
    return {
      uavklart: {
        grunn: `${sammeSkjelett.map(beskriv).join(' og ')} har samme skjelett med en annen stereokjemi, og PubChem-treffet (${p.tittel}) er ikke PubChems post for navnet.`,
        kandidater: [p.cid],
      },
    }
  }
  if (uavhengige.length > 0) {
    return {
      uavklart: {
        grunn: `${uavhengige.map(beskriv).join(' og ')} har en annen forbindelse enn PubChem for «${f.engelsk}».`,
        kandidater: [p.cid],
      },
    }
  }
  return {
    uavklart: { grunn: `Ingen uavhengig kilde (GSRS, ChEBI) bekrefter treffet i PubChem (${p.tittel}).`, kandidater: [p.cid] },
  }
}
