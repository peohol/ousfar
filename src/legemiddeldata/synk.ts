/**
 * Synkroniseringen av legemiddeldata fra FEST til OUSFARs egen kopi.
 *
 * Kjøres på serveren, aldri i nettleseren. Én kjøring:
 *
 * 1. registrerer at en synkronisering er startet;
 * 2. henter FEST-filen, med `If-None-Match` mot forrige vellykkede, så en
 *    uendret fil ikke lastes ned på nytt;
 * 3. pakker ut og leser filen, og laster postene inn i en mellomtabell i
 *    porsjoner;
 * 4. kontrollerer at de sentrale feltene og koblingene fortsatt blir lest
 *    (`strukturvakt.ts`), så en fil DMP har endret formen på, ikke byttes inn
 *    selv om antallet poster er som før;
 * 5. ber databasen fullføre: den sammenligner med det som ligger der, legger
 *    inn nye, oppdaterer endrede og merker de som er borte som utgått — alt i
 *    én transaksjon, og bare om uttrekket ser fullstendig ut.
 *
 * Går noe galt underveis, avbrytes kjøringen og merkes som feilet, med
 * trinnet den stoppet i og om en ny fil var oppdaget ({@link Feilinfo}). Det
 * som lå i databasen fra før, står urørt, så sidene viser siste gyldige data.
 *
 * Hvor dataene lagres, bestemmer {@link Legemiddellager}; testene bruker et i
 * minnet, serveren det i `lager.ts`.
 */
import { createHash } from 'node:crypto'
import { ENTITETER, lesFest, PARSERVERSJON, type Entitetnavn, type Festpost } from './fest.js'
import { avvikstekst, Strukturvakt } from './strukturvakt.js'
import { pakkUt } from './zip.js'

export const FEST_URL =
  'https://www.dmp.no/globalassets/documents/om-oss/distribusjon-av-legemiddeldata/fest/festfiler/fest251.zip'

export const KILDE = 'FEST'

/** Trinnet en kjøring stoppet i: kontakten med FEST, nedlastingen, lesingen av filen eller innbyttet i databasen. */
export type Synktrinn = 'kontakt' | 'nedlasting' | 'lesing' | 'innbytte'

/**
 * Det som er kjent om en kjøring som feilet. `ny_fil` er `true` når FEST ga en
 * annen fil enn forrige vellykkede (annen kontrollsum, eller en annen ETag før
 * filen var lastet ned), `false` når det var den samme filen, og `null` når
 * det ikke er kjent. Det er driftsdata: at ingen ny fil er kjent, betyr ikke
 * at ingen finnes, og det endrer aldri hvor gammel kopien regnes som.
 */
export interface Feilinfo {
  trinn: Synktrinn
  ny_fil: boolean | null
  etag: string | null
  sist_endret: string | null
  sha256: string | null
  parserversjon: number
}

/** Det som er kjent om filen en kjøring leste. */
export interface Filinfo {
  etag: string | null
  sist_endret: string | null
  sha256: string | null
  kildedato: string | null
  parserversjon: number
}

/** Forrige vellykkede synkronisering, for å avgjøre om filen er ny. */
export interface ForrigeSynk {
  etag: string | null
  sha256: string | null
  parserversjon: number | null
}

export interface Innlastingsrad {
  fest_id: string
  tidspunkt: string | null
  data: object
}

/** Tellingen per type etter en fullført synkronisering. */
export type Opptelling = Record<string, { inn: number; nye: number; endrede: number; utgatte: number }>

/** Vercels nattlige jobb, eller en administrator som ba om det. */
export type Utlosning = 'cron' | 'manuell'

export interface Legemiddellager {
  forrige(kilde: string): Promise<ForrigeSynk | null>
  start(kilde: string, utlostAv?: Utlosning): Promise<number>
  lastInn(synk: number, entitet: Entitetnavn, rader: Innlastingsrad[]): Promise<void>
  fullfor(synk: number, fil: Filinfo): Promise<Opptelling>
  uendret(synk: number, fil: Filinfo): Promise<void>
  avbryt(synk: number, feil: string, info: Feilinfo): Promise<void>
}

export type Synkresultat =
  | { status: 'fullfort'; synk: number; antall: Opptelling; kildedato: string | null }
  | { status: 'uendret'; synk: number }
  | { status: 'feilet'; synk: number; feil: string; trinn: Synktrinn; ny_fil: boolean | null }

export interface Synkvalg {
  lager: Legemiddellager
  utlostAv?: Utlosning
  hent?: typeof fetch
  url?: string
  /** Antall rader per innlasting. */
  porsjon?: number
  /** Hvor lenge nedlastingen kan ta. */
  tidsgrense?: number
}

export async function synkroniserFest({
  lager,
  utlostAv = 'cron',
  hent = fetch,
  url = FEST_URL,
  porsjon = 1000,
  tidsgrense = 120_000,
}: Synkvalg): Promise<Synkresultat> {
  const forrige = await lager.forrige(KILDE)
  const synk = await lager.start(KILDE, utlostAv)
  // Forrige kjøring leste filen med en eldre parser: les alt på nytt.
  const sammeParser = forrige?.parserversjon === PARSERVERSJON
  const info: Feilinfo = { trinn: 'kontakt', ny_fil: null, etag: null, sist_endret: null, sha256: null, parserversjon: PARSERVERSJON }

  try {
    const svar = await hent(url, {
      headers: sammeParser && forrige?.etag ? { 'If-None-Match': forrige.etag } : {},
      signal: AbortSignal.timeout(tidsgrense),
    })
    const grunninfo = {
      etag: svar.headers.get('etag'),
      sist_endret: svar.headers.get('last-modified'),
      parserversjon: PARSERVERSJON,
    }
    if (svar.status === 304) {
      await lager.uendret(synk, { ...grunninfo, etag: forrige?.etag ?? grunninfo.etag, sha256: forrige?.sha256 ?? null, kildedato: null })
      return { status: 'uendret', synk }
    }
    if (!svar.ok) throw new Error(`FEST svarte ${svar.status} ${svar.statusText}`.trim())

    info.trinn = 'nedlasting'
    info.etag = grunninfo.etag
    info.sist_endret = grunninfo.sist_endret
    // En annen ETag enn forrige vellykkede tyder på en ny fil, til kontrollsummen avgjør det.
    if (grunninfo.etag && forrige?.etag && grunninfo.etag !== forrige.etag) info.ny_fil = true
    const zip = Buffer.from(await svar.arrayBuffer())
    const sha256 = createHash('sha256').update(zip).digest('hex')
    info.sha256 = sha256
    info.ny_fil = forrige?.sha256 ? forrige.sha256 !== sha256 : info.ny_fil
    info.trinn = 'lesing'
    if (sammeParser && forrige?.sha256 === sha256) {
      await lager.uendret(synk, { ...grunninfo, sha256, kildedato: null })
      return { status: 'uendret', synk }
    }

    const fil = { hentetDato: null as string | null }
    const vakt = new Strukturvakt()
    const ventende = new Map<Entitetnavn, Innlastingsrad[]>(ENTITETER.map((e) => [e, []]))
    const tom = async (entitet: Entitetnavn) => {
      const rader = ventende.get(entitet)!
      if (rader.length === 0) return
      ventende.set(entitet, [])
      await lager.lastInn(synk, entitet, rader)
    }

    for await (const post of lesFest(pakkUt(zip).tekst, fil)) {
      vakt.se(post)
      const rader = ventende.get(post.entitet)!
      rader.push(tilRad(post))
      if (rader.length >= porsjon) await tom(post.entitet)
    }
    // Det som alt er lastet inn, ryddes bort når kjøringen avbrytes.
    const avvik = vakt.avvik()
    if (avvik.length > 0) throw new Error(avvikstekst(avvik))
    for (const entitet of ENTITETER) await tom(entitet)

    info.trinn = 'innbytte'
    const antall = await lager.fullfor(synk, { ...grunninfo, sha256, kildedato: fil.hentetDato })
    return { status: 'fullfort', synk, antall, kildedato: fil.hentetDato }
  } catch (e) {
    const feil = e instanceof Error ? e.message : String(e)
    await lager.avbryt(synk, feil, info)
    return { status: 'feilet', synk, feil, trinn: info.trinn, ny_fil: info.ny_fil }
  }
}

function tilRad(post: Festpost): Innlastingsrad {
  return { fest_id: post.fest_id, tidspunkt: post.tidspunkt, data: post.data }
}
