/**
 * Et lite, avhengighetsfritt S3-grensesnitt for kopilageret (Backblaze B2 med
 * S3-API-et, `docs/drift-gjenoppretting.md`, «Kopiene i drift»). Bare det
 * kopijobben trenger: legge inn en fil med Object Lock, lese og forlenge
 * låsen, liste versjonene, hente og slette en bestemt versjon. Forespørslene
 * signeres med AWS Signature Version 4, og innholdet sendes med sin
 * sha256 i `x-amz-content-sha256` og md5 i `Content-MD5`, så lageret selv
 * avviser en fil som ikke kom fram uskadet.
 *
 * Ingen omgåelse av låsen finnes her: `x-amz-bypass-governance-retention`
 * sendes aldri, så en låst versjon kan verken slettes eller få kortere lås.
 */
import { createHash, createHmac } from 'node:crypto'
import { createReadStream, createWriteStream } from 'node:fs'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { Stopp } from './feil'

export interface S3Oppsett {
  /** For eksempel `https://s3.eu-central-003.backblazeb2.com`. */
  endepunkt: string
  region: string
  bucket: string
  nokkelId: string
  nokkel: string
  /** Klokka, bare for testene. */
  naa?: () => Date
}

export interface Versjon {
  navn: string
  versjon: string
  siste: boolean
  endret: string
  /** md5 av innholdet for en vanlig opplasting, uten anførselstegn. */
  etag: string
  bytes: number
  /** Et slettemerke, ikke en fil. */
  slettemerke: boolean
}

export interface Las {
  modus: 'GOVERNANCE' | 'COMPLIANCE'
  til: string
}

const hex = (b: Buffer | string) => createHash('sha256').update(b).digest('hex')
const hmac = (k: Buffer | string, d: string) => createHmac('sha256', k).update(d).digest()
export const TOM_SHA256 = hex('')

/** URI-koding etter SigV4: alt unntatt `A-Za-z0-9-_.~` (og `/` i stien). */
export function koding(tekst: string, sti = false): string {
  return [...Buffer.from(tekst, 'utf8')]
    .map((b) => {
      const c = String.fromCharCode(b)
      return /[A-Za-z0-9\-_.~]/.test(c) || (sti && c === '/') ? c : `%${b.toString(16).toUpperCase().padStart(2, '0')}`
    })
    .join('')
}

export interface Signert {
  url: string
  hoder: Record<string, string>
}

/**
 * Signerer en forespørsel med SigV4 (S3, «path style»). `hoder` er de
 * ekstra hodene som skal sendes og signeres; `innhold` er sha256 av kroppen.
 */
export function signerForesporsel(
  o: Pick<S3Oppsett, 'endepunkt' | 'region' | 'nokkelId' | 'nokkel'>,
  metode: string,
  sti: string,
  sporring: Record<string, string>,
  hoder: Record<string, string>,
  innhold: string,
  naa: Date,
): Signert {
  const base = new URL(o.endepunkt)
  const dato = naa.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const dag = dato.slice(0, 8)
  const alle: Record<string, string> = { ...Object.fromEntries(Object.entries(hoder).map(([k, v]) => [k.toLowerCase(), v.trim()])) }
  alle.host = base.host
  alle['x-amz-content-sha256'] = innhold
  alle['x-amz-date'] = dato
  const navn = Object.keys(alle).sort()
  const kanoniskSti = koding(sti, true)
  const kanoniskSporring = Object.keys(sporring)
    .sort()
    .map((k) => `${koding(k)}=${koding(sporring[k]!)}`)
    .join('&')
  const forespørsel = [metode, kanoniskSti, kanoniskSporring, navn.map((n) => `${n}:${alle[n]}\n`).join(''), navn.join(';'), innhold].join('\n')
  const omfang = `${dag}/${o.region}/s3/aws4_request`
  const tilSignering = ['AWS4-HMAC-SHA256', dato, omfang, hex(forespørsel)].join('\n')
  const k = hmac(hmac(hmac(hmac(`AWS4${o.nokkel}`, dag), o.region), 's3'), 'aws4_request')
  const signatur = createHmac('sha256', k).update(tilSignering).digest('hex')
  alle.authorization = `AWS4-HMAC-SHA256 Credential=${o.nokkelId}/${omfang}, SignedHeaders=${navn.join(';')}, Signature=${signatur}`
  delete alle.host
  return { url: `${base.origin}${kanoniskSti}${kanoniskSporring ? `?${kanoniskSporring}` : ''}`, hoder: alle }
}

/** Teksten i et XML-element, med de vanlige tegnreferansene løst opp. */
function felt(xml: string, navn: string): string | undefined {
  const m = new RegExp(`<${navn}>([\\s\\S]*?)</${navn}>`).exec(xml)
  return m?.[1]?.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
}
const blokker = (xml: string, navn: string) => [...xml.matchAll(new RegExp(`<${navn}>([\\s\\S]*?)</${navn}>`, 'g'))].map((m) => m[1]!)
const utenAnforsel = (e: string | null | undefined) => (e ?? '').replace(/^"|"$/g, '')

export class S3 {
  constructor(private readonly o: S3Oppsett) {}

  private sti(navn = ''): string {
    return `/${this.o.bucket}${navn ? `/${navn}` : ''}`
  }

  private async kall(
    metode: string,
    navn: string,
    sporring: Record<string, string> = {},
    hoder: Record<string, string> = {},
    kropp?: { data: Buffer } | { fil: string; bytes: number; sha256: string },
  ): Promise<Response> {
    const innhold = !kropp ? TOM_SHA256 : 'data' in kropp ? hex(kropp.data) : kropp.sha256
    const s = signerForesporsel(this.o, metode, this.sti(navn), sporring, hoder, innhold, (this.o.naa ?? (() => new Date()))())
    const init: RequestInit & { duplex?: 'half' } = { method: metode, headers: s.hoder }
    if (kropp && 'data' in kropp) init.body = new Uint8Array(kropp.data)
    else if (kropp) {
      init.body = Readable.toWeb(createReadStream(kropp.fil)) as unknown as ReadableStream
      init.duplex = 'half'
      ;(init.headers as Record<string, string>)['content-length'] = String(kropp.bytes)
    }
    let svar: Response
    try {
      svar = await fetch(s.url, init)
    } catch (e) {
      throw new Stopp(`Kopilageret svarer ikke (${metode} ${navn || this.o.bucket}): ${(e as Error).message}`)
    }
    return svar
  }

  private static async feil(svar: Response, hva: string): Promise<never> {
    const tekst = await svar.text().catch(() => '')
    const kode = felt(tekst, 'Code') ?? ''
    const melding = felt(tekst, 'Message') ?? ''
    throw new S3Feil(svar.status, kode, `${hva}: ${svar.status} ${kode} ${melding}`.trim())
  }

  /** Legger inn en fil og låser versjonen (Governance) til `lasTil`. Gir versjons-ID-en. */
  async leggInn(navn: string, fil: { fil: string; bytes: number; sha256: string; md5: string }, lasTil: string, type = 'application/octet-stream'): Promise<string> {
    const svar = await this.kall('PUT', navn, {}, {
      'content-md5': Buffer.from(fil.md5, 'hex').toString('base64'),
      'content-type': type,
      'x-amz-object-lock-mode': 'GOVERNANCE',
      'x-amz-object-lock-retain-until-date': lasTil,
    }, fil)
    if (!svar.ok) await S3.feil(svar, `Opplastingen av ${navn}`)
    await svar.arrayBuffer()
    const versjon = svar.headers.get('x-amz-version-id')
    if (!versjon) throw new Stopp(`Kopilageret ga ingen versjon for ${navn}; er versjonering og Object Lock på i bøtta?`)
    if (utenAnforsel(svar.headers.get('etag')) !== fil.md5) throw new Stopp(`Kopilageret bekreftet ikke innholdet i ${navn}.`)
    return versjon
  }

  /** Henter én versjon til fila. */
  async hent(navn: string, versjon: string, til: string): Promise<void> {
    const svar = await this.kall('GET', navn, { versionId: versjon })
    if (!svar.ok || !svar.body) await S3.feil(svar, `Hentingen av ${navn}`)
    await pipeline(Readable.fromWeb(svar.body as never), createWriteStream(til, { mode: 0o600 }))
  }

  /** Låsen på én versjon, eller `null` uten lås. */
  async las(navn: string, versjon: string): Promise<Las | null> {
    const svar = await this.kall('GET', navn, { retention: '', versionId: versjon })
    if (svar.status === 404) {
      const tekst = await svar.text()
      if (/NoSuchObjectLockConfiguration|ObjectLockConfigurationNotFound/i.test(tekst)) return null
      throw new S3Feil(404, felt(tekst, 'Code') ?? '', `Låsen på ${navn}: 404 ${felt(tekst, 'Code') ?? ''}`)
    }
    if (!svar.ok) await S3.feil(svar, `Låsen på ${navn}`)
    const xml = await svar.text()
    const modus = felt(xml, 'Mode')
    const til = felt(xml, 'RetainUntilDate')
    return modus && til ? { modus: modus as Las['modus'], til: new Date(til).toISOString() } : null
  }

  /** Forlenger låsen på én versjon (Governance). Lageret nekter å forkorte den. */
  async forleng(navn: string, versjon: string, til: string): Promise<void> {
    const kropp = Buffer.from(
      `<Retention xmlns="http://s3.amazonaws.com/doc/2006-03-01/"><Mode>GOVERNANCE</Mode><RetainUntilDate>${til}</RetainUntilDate></Retention>`,
    )
    const svar = await this.kall('PUT', navn, { retention: '', versionId: versjon }, {
      'content-md5': createHash('md5').update(kropp).digest('base64'),
      'content-type': 'application/xml',
    }, { data: kropp })
    if (!svar.ok) await S3.feil(svar, `Forlengelsen av låsen på ${navn}`)
    await svar.arrayBuffer()
  }

  /** Alle versjonene under prefikset, også slettemerkene. Stopper heller enn å gi en ufullstendig liste. */
  async versjoner(prefiks = ''): Promise<Versjon[]> {
    const ut: Versjon[] = []
    let neste: { navn?: string; versjon?: string } = {}
    for (let side = 0; side < 10_000; side++) {
      const q: Record<string, string> = { versions: '', 'max-keys': '1000' }
      if (prefiks) q.prefix = prefiks
      if (neste.navn) q['key-marker'] = neste.navn
      if (neste.versjon) q['version-id-marker'] = neste.versjon
      const svar = await this.kall('GET', '', q)
      if (!svar.ok) await S3.feil(svar, 'Listen over versjonene')
      const xml = await svar.text()
      for (const [blokk, slettemerke] of [...blokker(xml, 'Version').map((b) => [b, false] as const), ...blokker(xml, 'DeleteMarker').map((b) => [b, true] as const)]) {
        ut.push({
          navn: felt(blokk, 'Key') ?? '',
          versjon: felt(blokk, 'VersionId') ?? '',
          siste: felt(blokk, 'IsLatest') === 'true',
          endret: new Date(felt(blokk, 'LastModified') ?? 0).toISOString(),
          etag: utenAnforsel(felt(blokk, 'ETag')),
          bytes: Number(felt(blokk, 'Size') ?? 0),
          slettemerke,
        })
      }
      if (felt(xml, 'IsTruncated') !== 'true') return ut.sort((a, b) => a.navn.localeCompare(b.navn) || a.endret.localeCompare(b.endret))
      neste = { navn: felt(xml, 'NextKeyMarker'), versjon: felt(xml, 'NextVersionIdMarker') }
      if (!neste.navn) throw new Stopp('Listen over versjonene ble avbrutt uten fortsettelse; ingenting ryddes.')
    }
    throw new Stopp('Listen over versjonene tok ikke slutt; ingenting ryddes.')
  }

  /** Sletter én versjon. En låst versjon blir stående: lageret nekter, og det er ingen feil. */
  async slett(navn: string, versjon: string): Promise<'slettet' | 'last'> {
    const svar = await this.kall('DELETE', navn, { versionId: versjon })
    if (svar.ok) {
      await svar.arrayBuffer()
      return 'slettet'
    }
    if (svar.status === 403) {
      await svar.arrayBuffer()
      return 'last'
    }
    return S3.feil(svar, `Slettingen av ${navn}`)
  }

  /** Om bøtta har Object Lock, og standardlåsen hvis den har en. */
  async laseoppsett(): Promise<{ pa: boolean; standard?: { modus: string; dager?: number; ar?: number } }> {
    const svar = await this.kall('GET', '', { 'object-lock': '' })
    if (svar.status === 404) {
      await svar.arrayBuffer()
      return { pa: false }
    }
    if (!svar.ok) await S3.feil(svar, 'Låseoppsettet til bøtta')
    const xml = await svar.text()
    const regel = felt(xml, 'DefaultRetention')
    return {
      pa: felt(xml, 'ObjectLockEnabled') === 'Enabled',
      standard: regel
        ? { modus: felt(regel, 'Mode') ?? '', dager: felt(regel, 'Days') ? Number(felt(regel, 'Days')) : undefined, ar: felt(regel, 'Years') ? Number(felt(regel, 'Years')) : undefined }
        : undefined,
    }
  }
}

export class S3Feil extends Stopp {
  constructor(readonly status: number, readonly kode: string, melding: string) {
    super(melding)
  }
}
