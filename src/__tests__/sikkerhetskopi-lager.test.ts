/**
 * Kopilageret (`src/drift/sikkerhetskopi/s3.ts` og `lager.ts`,
 * `docs/drift-gjenoppretting.md`, «Kopiene i drift»): signeringen mot AWS'
 * egne eksempler, og låsen, versjonene, innholdslisten, ryddingen, forbruket
 * og kontrollen av nøkkelen mot et falskt lager med Object Lock.
 */
import { createHash, randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { S3, signerForesporsel, TOM_SHA256 } from '../drift/sikkerhetskopi/s3'
import {
  bekreftKopi,
  delnavn,
  finnFiler,
  forbruk,
  hentKopi,
  kontrollerNokkel,
  kopinavn,
  lasTil,
  leggInnKopi,
  lesLageret,
  oppryddingsplan,
  provLageret,
  rydd,
  sisteHele,
  signaturnavn,
  tilsyn,
  velgVersjon,
} from '../drift/sikkerhetskopi/lager'
import { lagSigneringsnokler, signer, type Delfil } from '../drift/sikkerhetskopi/signatur'
import { summerAv } from '../drift/sikkerhetskopi/kopi'
import { KVOTER, LAGER, OPPBEVARING_DOGN } from '../drift/sikkerhetskopi/drift'
import { FalskS3 } from './hjelp/falskS3'

const DOGN = 24 * 3600 * 1000

describe('signeringen av forespørslene (SigV4)', () => {
  // Eksemplene i AWS' dokumentasjon av SigV4 for S3, med nøklene der.
  const o = { endepunkt: 'https://examplebucket.s3.amazonaws.com', region: 'us-east-1', nokkelId: 'AKIAIOSFODNN7EXAMPLE', nokkel: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY' }
  const t = new Date('2013-05-24T00:00:00Z')
  const sig = (s: { hoder: Record<string, string> }) => /Signature=(\w+)/.exec(s.hoder.authorization!)![1]

  it('gir de samme signaturene som AWS sine eksempler', () => {
    expect(sig(signerForesporsel(o, 'GET', '/test.txt', {}, { range: 'bytes=0-9' }, TOM_SHA256, t))).toBe('f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41')
    const innhold = createHash('sha256').update('Welcome to Amazon S3.').digest('hex')
    expect(
      sig(signerForesporsel(o, 'PUT', '/test$file.text', {}, { date: 'Fri, 24 May 2013 00:00:00 GMT', 'x-amz-storage-class': 'REDUCED_REDUNDANCY' }, innhold, t)),
    ).toBe('98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd')
    expect(sig(signerForesporsel(o, 'GET', '/', { lifecycle: '' }, {}, TOM_SHA256, t))).toBe('fea454ca298b7da1c68078a5d1bdbfbbe0d65c699e0f91ac7a200a0136783543')
    expect(sig(signerForesporsel(o, 'GET', '/', { 'max-keys': '2', prefix: 'J' }, {}, TOM_SHA256, t))).toBe('34b48302e7b5fa45bde8084f4b7868a86f0a534bc59db6670ed5711ef69dc6f7')
  })
})

describe('lageret med lås og versjoner', () => {
  const lager = new FalskS3()
  let s3: S3
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-lagertest-'))
  const fil = async (navn: string, innhold: Buffer | string) => {
    const sti = join(mappe, navn)
    writeFileSync(sti, innhold)
    return { fil: sti, ...(await summerAv(sti)) }
  }

  beforeAll(async () => {
    await lager.start()
    s3 = new S3({ ...lager.oppsett(), naa: () => lager.naa })
  })
  afterAll(async () => {
    await lager.stopp()
    rmSync(mappe, { recursive: true, force: true })
  })
  beforeEach(() => {
    lager.versjoner.length = 0
    lager.naa = new Date('2026-12-01T02:15:00Z')
    lager.sidestorrelse = 1000
  })

  it('låser en ny fil, nekter å slette den og å forkorte låsen, og sletter den når låsen er ute', async () => {
    const til = lasTil(lager.naa)
    const v = await s3.leggInn('kopier/a', await fil('a', 'innhold'), til)
    expect(await s3.las('kopier/a', v)).toEqual({ modus: 'GOVERNANCE', til })
    expect(await s3.slett('kopier/a', v)).toBe('last')
    await expect(s3.forleng('kopier/a', v, lasTil(lager.naa, 1))).rejects.toThrow(/403/)
    await s3.forleng('kopier/a', v, lasTil(lager.naa, 9))
    expect((await s3.las('kopier/a', v))?.til).toBe(lasTil(lager.naa, 9))
    lager.naa = new Date(lager.naa.getTime() + 10 * DOGN)
    expect(await s3.slett('kopier/a', v)).toBe('slettet')
    expect(await s3.versjoner()).toEqual([])
  })

  it('avviser en opplasting der innholdet ikke er det som ble oppgitt', async () => {
    const f = await fil('b', 'riktig')
    await expect(s3.leggInn('kopier/b', { ...f, md5: createHash('md5').update('feil').digest('hex') }, lasTil(lager.naa))).rejects.toThrow(/BadDigest/)
    await expect(s3.leggInn('kopier/b', { ...f, sha256: 'a'.repeat(64) }, lasTil(lager.naa))).rejects.toThrow(/SHA256|Signature/)
  })

  it('leser hele lista over versjoner side for side', async () => {
    lager.sidestorrelse = 2
    for (let i = 0; i < 5; i++) await s3.leggInn(`deler/${i}`, await fil(`d${i}`, `x${i}`), lasTil(lager.naa))
    await s3.leggInn('deler/0', await fil('d0b', 'ny versjon'), lasTil(lager.naa))
    const v = await s3.versjoner()
    expect(v).toHaveLength(6)
    expect(v.filter((x) => x.navn === 'deler/0')).toHaveLength(2)
  })

  // En hel kopi i lageret, lagt inn på tiden den ble laget og signert av jobben.
  const jobben = lagSigneringsnokler()
  async function lagKopi(laget: string, biter: string[], { utenSig = false, nokkel = jobben.privat } = {}) {
    const klokka = lager.naa
    lager.naa = new Date(laget)
    const deler: Delfil[] = []
    for (const b of biter) {
      const f = await fil(`bit-${b}`, `bit ${b}`)
      const identitet = createHash('sha256').update(b).digest('hex')
      if (!lager.versjoner.some((v) => v.navn === delnavn(identitet))) await s3.leggInn(delnavn(identitet), f, lasTil(laget))
      deler.push({ identitet, sha256: f.sha256, md5: f.md5, bytes: f.bytes })
    }
    const navn = `ousfar-kopi-${laget.replace(/[:.]/g, '-')}.tar.age`
    const k = await fil(navn, `kopi ${laget}`)
    await s3.leggInn(kopinavn(navn), k, lasTil(laget))
    if (!utenSig) await s3.leggInn(signaturnavn(navn), await fil(`${navn}.sig`, JSON.stringify(signer(navn, k.sha256, laget, nokkel, { md5: k.md5, bytes: k.bytes, deler }))), lasTil(laget))
    lager.naa = klokka
    return { navn, deler }
  }

  it('regner bare en kopi med ekte signatur og alle filene som hel, og velger versjonen signaturen beskriver', async () => {
    const a = await lagKopi('2026-11-30T02:15:00.000Z', ['1', '2'])
    await lagKopi('2026-11-29T02:15:00.000Z', ['1', '3'], { nokkel: lagSigneringsnokler().privat })
    await lagKopi('2026-11-28T02:15:00.000Z', ['4'], { utenSig: true })
    // Noen med skrivetilgang legger en ny versjon over en bit: den brukes ikke.
    await s3.leggInn(delnavn(a.deler[0]!.identitet), await fil('falsk', 'falsk bit'), lasTil(lager.naa))
    const innhold = await lesLageret(s3, jobben.offentlig)
    expect(innhold.kopier.map((k) => [k.signatur.fil, k.hel])).toEqual([[a.navn, true]])
    expect(innhold.ugyldige).toHaveLength(1)
    const bit = innhold.kopier[0]!.filer.find((v) => v.navn === delnavn(a.deler[0]!.identitet))!
    expect(bit.etag).toBe(a.deler[0]!.md5)
    expect(sisteHele(innhold).kjente.size).toBe(2)
    expect(velgVersjon(innhold.versjoner, delnavn(a.deler[0]!.identitet), 'f'.repeat(32), 1)).toBeUndefined()
    // En bit som mangler, gjør kopien ufullstendig.
    const s = innhold.kopier[0]!.signatur
    expect(finnFiler(innhold.versjoner.filter((v) => v.navn !== delnavn(a.deler[1]!.identitet)), s).mangler).toEqual([delnavn(a.deler[1]!.identitet)])
  })

  it('legger inn en ny kopi med de nye bitene, forlenger låsen på de gjenbrukte og bekrefter at den er hel', async () => {
    const forrige = await lagKopi('2026-11-30T02:15:00.000Z', ['1', '2'])
    const forHand = await lesLageret(s3, jobben.offentlig)
    const ut = mkdtempSync(join(mappe, 'ut-'))
    const nyIdentitet = createHash('sha256').update('3').digest('hex')
    writeFileSync(join(mappe, 'ny.age'), 'bit 3')
    const { mkdirSync, copyFileSync } = await import('node:fs')
    mkdirSync(join(ut, 'deler'))
    copyFileSync(join(mappe, 'ny.age'), join(ut, 'deler', `${nyIdentitet}.age`))
    const ny = { identitet: nyIdentitet, ...(await summerAv(join(mappe, 'ny.age'))) }
    const laget = lager.naa.toISOString()
    const navn = `ousfar-kopi-${laget.replace(/[:.]/g, '-')}.tar.age`
    const k = await fil(navn, 'ny kopi')
    const deler = [forrige.deler[0]!, ny]
    writeFileSync(`${k.fil}.sig`, JSON.stringify(signer(navn, k.sha256, laget, jobben.privat, { md5: k.md5, bytes: k.bytes, deler })))
    await leggInnKopi(s3, { fil: k.fil, ut, laget, deler, nye: [nyIdentitet], sha256: k.sha256, md5: k.md5, bytes: k.bytes }, forHand, summerAv)
    const gjenbrukt = lager.versjoner.find((v) => v.navn === delnavn(forrige.deler[0]!.identitet))!
    expect(gjenbrukt.las?.til).toBe(lasTil(laget))
    // Den andre biten i forrige kopi gjenbrukes ikke og får ikke lengre lås.
    expect(lager.versjoner.find((v) => v.navn === delnavn(forrige.deler[1]!.identitet))!.las?.til).toBe(lasTil('2026-11-30T02:15:00.000Z'))
    const b = await bekreftKopi(s3, jobben.offentlig, k.fil, [nyIdentitet], lasTil(laget), summerAv)
    expect(b).toMatchObject({ hel: true, avvik: [], filer: 4, hentetTilbake: 2 })

    // Hentet til en mappe for gjenoppretting: alle filene, kontrollert mot signaturen.
    const hent = mkdtempSync(join(mappe, 'hent-'))
    const h = await hentKopi(s3, jobben.offentlig, hent, summerAv)
    expect(h.laget).toBe(laget)
    expect((await summerAv(h.kopi)).sha256).toBe(k.sha256)
    expect((await summerAv(join(hent, 'deler', `${nyIdentitet}.age`))).sha256).toBe(ny.sha256)
  })

  it('stopper før signaturen legges inn når en gjenbrukt bit er borte', async () => {
    const forrige = await lagKopi('2026-11-30T02:15:00.000Z', ['1'])
    const forHand = await lesLageret(s3, jobben.offentlig)
    const borte = delnavn(forrige.deler[0]!.identitet)
    lager.versjoner.splice(lager.versjoner.findIndex((v) => v.navn === borte), 1)
    const k = await fil('ny.tar.age', 'ny')
    writeFileSync(`${k.fil}.sig`, '{}')
    const opplasting = { ...k, ut: mappe, laget: lager.naa.toISOString(), deler: forrige.deler, nye: [] }
    // Borte etter at lageret ble lest: låsen kan ikke forlenges.
    await expect(leggInnKopi(s3, opplasting, forHand, summerAv)).rejects.toThrow(/NoSuchVersion/)
    // Borte alt da lageret ble lest.
    await expect(leggInnKopi(s3, opplasting, { ...forHand, versjoner: forHand.versjoner.filter((v) => v.navn !== borte) }, summerAv)).rejects.toThrow(/Ingen signatur/)
    expect(lager.versjoner.some((v) => v.navn === signaturnavn('ny.tar.age'))).toBe(false)
  })

  it('rydder bare det som er utløpt og ikke brukes, og aldri uten en ny, hel kopi', async () => {
    const gammel = await lagKopi('2026-11-20T02:15:00.000Z', ['1', '2'])
    lager.naa = new Date('2026-11-21T00:00:00Z')
    await s3.leggInn('annet/fil', await fil('annet', 'x'), lasTil(lager.naa, 0))
    await s3.leggInn('deler/foreldreløs', await fil('f', 'x'), lasTil(lager.naa, 0))
    lager.naa = new Date('2026-12-01T03:00:00Z')

    // Bare den gamle: ingen kopi fra det siste døgnet, så ingenting ryddes.
    let plan = oppryddingsplan(await lesLageret(s3, jobben.offentlig), lager.naa)
    expect(plan.slett).toEqual([])
    expect(plan.stopp).toMatch(/Ingen hel kopi/)

    const ny = await lagKopi('2026-12-01T02:15:00.000Z', ['1', '3'])
    plan = oppryddingsplan(await lesLageret(s3, jobben.offentlig), lager.naa)
    const navn = plan.slett.map((v) => v.navn).sort()
    // Den gamle kopien, signaturen, biten bare den brukte og den foreldreløse.
    expect(navn).toEqual([kopinavn(gammel.navn), signaturnavn(gammel.navn), delnavn(gammel.deler[1]!.identitet), 'deler/foreldreløs'].sort())
    // Biten den nye kopien gjenbruker, og alt utenfor kopienes mapper, står.
    expect(navn).not.toContain(delnavn(ny.deler[0]!.identitet))
    expect(plan.ukjente.map((v) => v.navn)).toEqual(['annet/fil'])
    const r = await rydd(s3, plan)
    expect(r).toMatchObject({ slettet: 4, last: 0 })
    expect((await lesLageret(s3, jobben.offentlig)).kopier.map((k) => k.signatur.fil)).toEqual([ny.navn])
  })

  it('beholder den nyeste hele kopien selv om den er eldre enn oppbevaringstiden, og alt som er nytt', async () => {
    await lagKopi('2026-11-20T02:15:00.000Z', ['1'])
    lager.naa = new Date('2026-11-30T12:00:00Z')
    await s3.leggInn('deler/under-arbeid', await fil('u', 'x'), lasTil(lager.naa, 0))
    lager.naa = new Date('2026-12-01T03:00:00Z')
    const ny = await lagKopi('2026-12-01T02:15:00.000Z', ['2'])
    const innhold = await lesLageret(s3, jobben.offentlig)
    const plan = oppryddingsplan(innhold, lager.naa)
    expect(plan.slett.map((v) => v.navn)).not.toContain('deler/under-arbeid')
    expect(plan.slett.map((v) => v.navn)).not.toContain(kopinavn(ny.navn))
    // Uten den nye ville den gamle vært den nyeste og blitt stående, men den er for gammel til å la noe ryddes.
    expect(oppryddingsplan({ ...innhold, kopier: innhold.kopier.slice(1) }, lager.naa).stopp).toBeDefined()
    // Er den eldre kopien den nyeste hele, står filene dens: her er den nye ufullstendig.
    const utenNy = { ...innhold, kopier: [{ ...innhold.kopier[0]!, hel: false }, ...innhold.kopier.slice(1)] }
    const nyesteHele = utenNy.kopier[1]!
    lager.naa = new Date('2026-11-20T12:00:00Z')
    const p = oppryddingsplan(utenNy, lager.naa)
    for (const v of nyesteHele.filer) expect(p.slett).not.toContainEqual(v)
  })

  it('sier fra når den nyeste hele kopien er for gammel, eller ingen finnes', async () => {
    expect(tilsyn(await lesLageret(s3, jobben.offentlig), lager.naa).ok).toBe(false)
    await lagKopi('2026-11-30T02:15:00.000Z', ['1'])
    expect(tilsyn(await lesLageret(s3, jobben.offentlig), new Date('2026-12-01T03:00:00Z')).ok).toBe(true)
    expect(tilsyn(await lesLageret(s3, jobben.offentlig), new Date('2026-12-01T05:00:00Z'))).toMatchObject({ ok: false, melding: expect.stringMatching(/27 timer/) })
  })

  it('prøver lageret med en syntetisk, låst fil som ikke kan slettes', async () => {
    expect(await provLageret(s3, lager.naa)).toEqual([])
    const prove = lager.versjoner.filter((v) => v.navn.startsWith('prove/'))
    expect(prove).toHaveLength(1)
    expect(prove[0]!.las?.modus).toBe('GOVERNANCE')
  })

  it('varsler før gratiskvotene nås', () => {
    expect(forbruk([], 10 * 1000 ** 2).varsler).toEqual([])
    const stor = forbruk([{ navn: 'x', versjon: '1', siste: true, endret: '', etag: '', bytes: KVOTER.lagerBytes * 0.8, slettemerke: false }], 0)
    expect(stor.varsler).toEqual([expect.stringMatching(/Kopilageret bruker 8\.00 GB/)])
    expect(forbruk([], 60 * 1000 ** 2).varsler).toEqual([expect.stringMatching(/1\.80 GB i måneden/)])
  })

  it('har oppbevaringstiden som i planen', () => {
    expect(OPPBEVARING_DOGN).toBe(7)
    expect(lasTil('2026-12-01T00:00:00.000Z')).toBe('2026-12-08T00:00:00.000Z')
  })
})

describe('kontrollen av Backblaze-nøkkelen', () => {
  let svar: unknown = {}
  const server = createServer((_req, res) => {
    res.writeHead(200, { 'content-type': 'application/json' })
    res.end(JSON.stringify(svar))
  })
  let adresse = ''
  beforeAll(async () => {
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
    adresse = `http://127.0.0.1:${(server.address() as AddressInfo).port}/`
  })
  afterAll(() => new Promise((ok) => server.close(ok)))

  const riktig = ['deleteFiles', 'listFiles', 'readBucketRetentions', 'readFileRetentions', 'readFiles', 'writeFileRetentions', 'writeFiles']
  const med = (allowed: Record<string, unknown>, s3ApiUrl: string = LAGER.endepunkt) => ({ apiInfo: { storageApi: { s3ApiUrl, allowed } } })

  it('godtar en nøkkel som bare gjelder kopibøtta, med rettighetene jobben trenger', async () => {
    svar = med({ buckets: [{ id: 'b', name: LAGER.bucket }], capabilities: [...riktig, 'shareFiles'], namePrefix: null })
    expect(await kontrollerNokkel('id', randomBytes(8).toString('hex'), adresse)).toMatchObject({ bucket: LAGER.bucket, ekstra: ['shareFiles'] })
  })

  it('stopper ved en hovednøkkel, en annen bøtte, en annen adresse, manglende eller farlige rettigheter', async () => {
    const proving = [
      [med({ buckets: null, capabilities: riktig }), /bare én bøtte/],
      [med({ buckets: [{ id: 'b', name: 'annen' }], capabilities: riktig }), /gjetter ikke/],
      [med({ buckets: [{ id: 'b', name: LAGER.bucket }], capabilities: riktig }, 'https://s3.us-west-004.backblazeb2.com'), /ligger på/],
      [med({ buckets: [{ id: 'b', name: LAGER.bucket }], capabilities: riktig.filter((r) => r !== 'writeFileRetentions') }), /mangler rettighetene writeFileRetentions/],
      [med({ buckets: [{ id: 'b', name: LAGER.bucket }], capabilities: [...riktig, 'bypassGovernance'] }), /aldri skal ha: bypassGovernance/],
      [med({ buckets: [{ id: 'b', name: LAGER.bucket }], capabilities: riktig, namePrefix: 'x/' }), /filprefiks/],
    ] as const
    for (const [s, feil] of proving) {
      svar = s
      await expect(kontrollerNokkel('id', 'n', adresse)).rejects.toThrow(feil)
    }
  })
})
