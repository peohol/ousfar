/**
 * Et falskt S3-lager med versjoner og Object Lock (Governance), for testene
 * av kopilageret (`src/drift/sikkerhetskopi/s3.ts`, `lager.ts`). Det oppfører
 * seg som Backblaze B2 på punktene kopijobben er avhengig av:
 *
 * - signaturen (SigV4) kontrolleres på hver forespørsel med den samme
 *   nøkkelen, og innholdet mot `x-amz-content-sha256` og `Content-MD5`;
 * - hver opplasting får en ny versjon, og en versjon endres aldri;
 * - en låst versjon kan ikke slettes, og låsen kan forlenges, aldri forkortes;
 * - lista over versjoner deles i sider.
 *
 * Klokka kan stilles, så låser kan gå ut i testene.
 */
import { createHash, randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { signerForesporsel } from '../../drift/sikkerhetskopi/s3'

export interface Lagret {
  navn: string
  versjon: string
  data: Buffer
  md5: string
  endret: Date
  las?: { modus: string; til: string }
  slettemerke?: boolean
}

export class FalskS3 {
  readonly versjoner: Lagret[] = []
  naa = new Date()
  /** Hvor mange versjoner én side av lista har. */
  sidestorrelse = 1000
  /** Teller forespørslene per slag. */
  readonly kall: Record<string, number> = {}
  private server?: Server
  endepunkt = ''

  constructor(
    readonly bucket = 'ousfar-backup',
    readonly nokkelId = 'testnokkel',
    readonly nokkel = 'testhemmelighet',
    readonly region = 'eu-central-003',
  ) {}

  async start(): Promise<this> {
    this.server = createServer((req, res) => {
      const biter: Buffer[] = []
      req.on('data', (d: Buffer) => biter.push(d))
      req.on('end', () => {
        const svar = this.handter(req, Buffer.concat(biter))
        res.writeHead(svar.status, svar.hoder ?? {})
        res.end(svar.kropp ?? '')
      })
    })
    await new Promise<void>((ok) => this.server!.listen(0, '127.0.0.1', ok))
    this.endepunkt = `http://127.0.0.1:${(this.server!.address() as AddressInfo).port}`
    return this
  }

  async stopp(): Promise<void> {
    await new Promise((ok) => this.server?.close(ok))
  }

  oppsett() {
    return { endepunkt: this.endepunkt, region: this.region, bucket: this.bucket, nokkelId: this.nokkelId, nokkel: this.nokkel }
  }

  private feil(status: number, kode: string) {
    return { status, kropp: `<?xml version="1.0"?><Error><Code>${kode}</Code><Message>${kode}</Message></Error>` }
  }

  private handter(req: IncomingMessage, kropp: Buffer): { status: number; hoder?: Record<string, string>; kropp?: string | Buffer } {
    const url = new URL(req.url!, this.endepunkt)
    const sti = decodeURIComponent(url.pathname)
    const q = Object.fromEntries(url.searchParams.entries())
    // Signaturen: regnes ut på nytt med de signerte hodene og samme tid.
    const auth = String(req.headers.authorization ?? '')
    const signert = /SignedHeaders=([^,]+)/.exec(auth)?.[1]?.split(';') ?? []
    const hoder = Object.fromEntries(signert.filter((h) => !['host', 'x-amz-date', 'x-amz-content-sha256'].includes(h)).map((h) => [h, String(req.headers[h] ?? '')]))
    const dato = String(req.headers['x-amz-date'] ?? '')
    const tid = new Date(`${dato.slice(0, 4)}-${dato.slice(4, 6)}-${dato.slice(6, 8)}T${dato.slice(9, 11)}:${dato.slice(11, 13)}:${dato.slice(13, 15)}Z`)
    const innhold = String(req.headers['x-amz-content-sha256'] ?? '')
    const ventet = signerForesporsel(this.oppsett(), req.method!, sti, q, hoder, innhold, tid).hoder.authorization
    if (ventet !== auth) return this.feil(403, 'SignatureDoesNotMatch')
    if (createHash('sha256').update(kropp).digest('hex') !== innhold) return this.feil(400, 'XAmzContentSHA256Mismatch')
    const md5 = createHash('md5').update(kropp)
    if (req.headers['content-md5'] && md5.copy().digest('base64') !== req.headers['content-md5']) return this.feil(400, 'BadDigest')
    const art = `${req.method} ${Object.keys(q).filter((k) => ['retention', 'versions', 'object-lock'].includes(k)).join(',') || 'objekt'}`
    this.kall[art] = (this.kall[art] ?? 0) + 1

    const [, bucket, ...rest] = sti.split('/')
    if (bucket !== this.bucket) return this.feil(404, 'NoSuchBucket')
    const navn = rest.join('/')
    if (!navn) {
      if ('object-lock' in q) {
        return { status: 200, kropp: '<ObjectLockConfiguration><ObjectLockEnabled>Enabled</ObjectLockEnabled></ObjectLockConfiguration>' }
      }
      if ('versions' in q) return this.liste(q)
      return this.feil(400, 'InvalidRequest')
    }
    const versjon = this.versjoner.find((v) => v.navn === navn && v.versjon === q.versionId)
    if (req.method === 'PUT' && 'retention' in q) {
      if (!versjon) return this.feil(404, 'NoSuchVersion')
      const til = /<RetainUntilDate>([^<]+)</.exec(kropp.toString())?.[1]
      const modus = /<Mode>([^<]+)</.exec(kropp.toString())?.[1]
      if (!til || !modus) return this.feil(400, 'MalformedXML')
      if (versjon.las && new Date(versjon.las.til) > this.naa && new Date(til) < new Date(versjon.las.til)) return this.feil(403, 'AccessDenied')
      versjon.las = { modus, til: new Date(til).toISOString() }
      return { status: 200 }
    }
    if (req.method === 'GET' && 'retention' in q) {
      if (!versjon) return this.feil(404, 'NoSuchVersion')
      if (!versjon.las) return this.feil(404, 'NoSuchObjectLockConfiguration')
      return { status: 200, kropp: `<Retention><Mode>${versjon.las.modus}</Mode><RetainUntilDate>${versjon.las.til}</RetainUntilDate></Retention>` }
    }
    if (req.method === 'PUT') {
      if (!req.headers['content-md5']) return this.feil(400, 'InvalidRequest')
      const ny: Lagret = { navn, versjon: randomBytes(12).toString('hex'), data: kropp, md5: md5.digest('hex'), endret: new Date(this.naa) }
      const modus = req.headers['x-amz-object-lock-mode']
      const til = req.headers['x-amz-object-lock-retain-until-date']
      if (modus && til) ny.las = { modus: String(modus), til: new Date(String(til)).toISOString() }
      this.versjoner.push(ny)
      return { status: 200, hoder: { etag: `"${ny.md5}"`, 'x-amz-version-id': ny.versjon } }
    }
    if (req.method === 'GET') {
      if (!versjon || versjon.slettemerke) return this.feil(404, 'NoSuchKey')
      return { status: 200, kropp: versjon.data, hoder: { etag: `"${versjon.md5}"` } }
    }
    if (req.method === 'DELETE') {
      if (!versjon) return { status: 204 }
      if (versjon.las && new Date(versjon.las.til) > this.naa) return this.feil(403, 'AccessDenied')
      this.versjoner.splice(this.versjoner.indexOf(versjon), 1)
      return { status: 204 }
    }
    return this.feil(405, 'MethodNotAllowed')
  }

  private liste(q: Record<string, string>) {
    const alle = this.versjoner
      .filter((v) => !q.prefix || v.navn.startsWith(q.prefix))
      .sort((a, b) => a.navn.localeCompare(b.navn) || b.endret.getTime() - a.endret.getTime() || a.versjon.localeCompare(b.versjon))
    let start = 0
    if (q['key-marker']) {
      start = alle.findIndex((v) => v.navn === q['key-marker'] && v.versjon === q['version-id-marker']) + 1
    }
    const side = alle.slice(start, start + Math.min(this.sidestorrelse, Number(q['max-keys'] ?? 1000)))
    const siste = new Map<string, Lagret>()
    for (const v of alle) if (!siste.has(v.navn) || siste.get(v.navn)!.endret < v.endret) siste.set(v.navn, v)
    const xml = side
      .map((v) =>
        v.slettemerke
          ? `<DeleteMarker><Key>${v.navn}</Key><VersionId>${v.versjon}</VersionId><IsLatest>${siste.get(v.navn) === v}</IsLatest><LastModified>${v.endret.toISOString()}</LastModified></DeleteMarker>`
          : `<Version><Key>${v.navn}</Key><VersionId>${v.versjon}</VersionId><IsLatest>${siste.get(v.navn) === v}</IsLatest><LastModified>${v.endret.toISOString()}</LastModified><ETag>"${v.md5}"</ETag><Size>${v.data.length}</Size></Version>`,
      )
      .join('')
    const avkortet = start + side.length < alle.length
    const neste = side[side.length - 1]
    return {
      status: 200,
      kropp: `<ListVersionsResult><IsTruncated>${avkortet}</IsTruncated>${avkortet && neste ? `<NextKeyMarker>${neste.navn}</NextKeyMarker><NextVersionIdMarker>${neste.versjon}</NextVersionIdMarker>` : ''}${xml}</ListVersionsResult>`,
    }
  }
}
