/**
 * Nøkkelbyttet for kopilageret (`src/drift/sikkerhetskopi/nokkelbytte.ts` og
 * `forsegling.ts`, `docs/drift-gjenoppretting.md`, «Nøkkelen til lageret»):
 * mot et falskt Backblaze og et falskt GitHub, og den forseglede boksen mot en
 * boks libsodium har laget.
 */
import { randomBytes } from 'node:crypto'
import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { x25519 } from '@noble/curves/ed25519'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { apne, forsegl } from '../drift/sikkerhetskopi/forsegling'
import { byttNokkel, bytterapport, type Bytteoppsett } from '../drift/sikkerhetskopi/nokkelbytte'
import { LAGER, NOKKELBYTTE, RETTIGHETER } from '../drift/sikkerhetskopi/drift'

describe('den forseglede boksen (crypto_box_seal)', () => {
  // Laget med libsodium-wrappers 0.7.15: crypto_box_seal('ousfar-prøve', pk) med denne private nøkkelen.
  const privat = Buffer.from('77076d0a7318a57d3c16c17251b26645df4c2f87ebc0992ab177fba51db92c2a', 'hex')
  const fraLibsodium = 'PbShATb8/IrHRw9ZuthjPHiURB4qa7vtLuQvdTMpBhAbK9JPvtENcpfGH7D7EbLVmtpZzY4rc2VGZH7cvQ=='

  it('åpner en boks libsodium har forseglet, og en den selv har forseglet', () => {
    expect(new TextDecoder().decode(apne(Buffer.from(fraLibsodium, 'base64'), privat))).toBe('ousfar-prøve')
    const melding = randomBytes(40)
    const boks = forsegl(melding, x25519.getPublicKey(privat))
    expect(boks.length).toBe(32 + 16 + melding.length)
    expect(Buffer.from(apne(boks, privat))).toEqual(melding)
  })

  it('kan ikke åpnes med en annen nøkkel eller etter en endring', () => {
    const boks = forsegl(new TextEncoder().encode('hemmelig'), x25519.getPublicKey(privat))
    expect(() => apne(boks, x25519.utils.randomPrivateKey())).toThrow()
    boks[40] = boks[40]! ^ 1
    expect(() => apne(boks, privat)).toThrow()
  })
})

interface Nokkel {
  id: string
  hemmelig: string
  navn: string
  rettigheter: string[]
  bucketId: string | null
}

describe('nøkkelbyttet', () => {
  const BOTTE = 'botte-kopi'
  const KONTO = 'konto1'
  const TOKEN = `github_pat_${randomBytes(12).toString('hex')}`
  const miljoPrivat = x25519.utils.randomPrivateKey()
  let nokler: Nokkel[] = []
  let hemmeligheter: Map<string, string> = new Map()
  let tilbaketrukket: { autorisert: boolean; tokens: string[] }[] = []
  let opprettede: string[][] = []
  let ekstraForNye: string[] = []
  let avvisFørsteInnlogging = 0
  let githubGodtar = true

  const alle = ['listKeys', 'writeKeys', 'deleteKeys', 'listBuckets', 'readBuckets', 'writeBuckets', 'bypassGovernance', 'listFiles', 'readFiles', 'writeFiles', 'deleteFiles']
  const hoved: Nokkel = { id: KONTO, hemmelig: 'hoved-hemmelig', navn: 'master', rettigheter: alle, bucketId: null }

  const kropp = (req: IncomingMessage) =>
    new Promise<Record<string, unknown>>((ok) => {
      let tekst = ''
      req.on('data', (d) => (tekst += d))
      req.on('end', () => ok(tekst ? JSON.parse(tekst) : {}))
    })

  const server = createServer(async (req, res) => {
    const svar = (status: number, data?: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' })
      res.end(data === undefined ? '' : JSON.stringify(data))
    }
    const url = req.url ?? ''
    const basic = (): Nokkel | undefined => {
      const [id, hemmelig] = Buffer.from((req.headers.authorization ?? '').replace(/^Basic /, ''), 'base64').toString().split(':')
      return nokler.find((n) => n.id === id && n.hemmelig === hemmelig)
    }
    const innlogget = () => nokler.find((n) => req.headers.authorization === `T-${n.id}`)
    if (url === '/b2api/v3/b2_authorize_account') {
      const n = basic()
      if (!n) return svar(401)
      return svar(200, { accountId: KONTO, authorizationToken: `T-${n.id}`, apiInfo: { storageApi: { apiUrl: adresse, allowed: { capabilities: n.rettigheter } } } })
    }
    if (url === '/b2api/v4/b2_authorize_account') {
      const n = basic()
      if (!n || avvisFørsteInnlogging-- > 0) return svar(401)
      return svar(200, { apiInfo: { storageApi: { s3ApiUrl: LAGER.endepunkt, allowed: { buckets: n.bucketId ? [{ id: n.bucketId, name: LAGER.bucket }] : null, capabilities: n.rettigheter, namePrefix: null } } } })
    }
    if (url.startsWith('/b2api/v3/')) {
      const k = innlogget()
      if (!k) return svar(401)
      const b = await kropp(req)
      const kall = url.slice('/b2api/v3/'.length)
      if (kall === 'b2_list_buckets') return svar(200, { buckets: [{ bucketId: BOTTE, bucketName: b.bucketName, fileLockConfiguration: { value: { isFileLockEnabled: true } } }] })
      if (kall === 'b2_create_key') {
        if (!k.rettigheter.includes('writeKeys')) return svar(401)
        const rett = b.capabilities as string[]
        opprettede.push(rett)
        const ny = { id: `ny-${opprettede.length}`, hemmelig: randomBytes(16).toString('hex'), navn: String(b.keyName), rettigheter: [...rett, ...ekstraForNye], bucketId: String(b.bucketId) }
        nokler.push(ny)
        return svar(200, { applicationKeyId: ny.id, applicationKey: ny.hemmelig })
      }
      if (kall === 'b2_delete_key') {
        if (b.applicationKeyId === KONTO) return svar(400)
        nokler = nokler.filter((n) => n.id !== b.applicationKeyId)
        return svar(200, {})
      }
      if (kall === 'b2_list_keys') return svar(200, { keys: nokler.map((n) => ({ applicationKeyId: n.id, keyName: n.navn, bucketId: n.bucketId, capabilities: n.rettigheter })) })
    }
    if (url === '/credentials/revoke') {
      const b = await kropp(req)
      tilbaketrukket.push({ autorisert: Boolean(req.headers.authorization), tokens: b.credentials as string[] })
      return svar(202)
    }
    const sti = `/repos/peohol/ousfar/environments/${NOKKELBYTTE.miljo}/secrets/`
    if (url.startsWith(sti)) {
      if (!githubGodtar || req.headers.authorization !== `Bearer ${TOKEN}`) return svar(401)
      const navn = url.slice(sti.length)
      if (navn === 'public-key') return svar(200, { key_id: 'k1', key: Buffer.from(x25519.getPublicKey(miljoPrivat)).toString('base64') })
      if (req.method === 'PUT') {
        const b = await kropp(req)
        if (b.key_id !== 'k1') return svar(422)
        hemmeligheter.set(navn, new TextDecoder().decode(apne(Buffer.from(String(b.encrypted_value), 'base64'), miljoPrivat)))
        return svar(201)
      }
      if (req.method === 'DELETE') return svar(hemmeligheter.delete(navn) ? 204 : 404)
    }
    svar(404)
  })
  let adresse = ''
  beforeAll(async () => {
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok))
    adresse = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  })
  afterAll(() => new Promise((ok) => server.close(ok)))

  const nettside: Nokkel = { id: 'nettside', hemmelig: 'x', navn: 'kopijobben', rettigheter: [...RETTIGHETER.kreves, 'bypassGovernance', 'writeBuckets'], bucketId: BOTTE }
  const forrige: Nokkel = { id: 'forrige', hemmelig: 'y', navn: `${NOKKELBYTTE.navnPrefiks}202611010000`, rettigheter: [...RETTIGHETER.ny], bucketId: BOTTE }
  const annenBotte: Nokkel = { id: 'annen', hemmelig: 'z', navn: `${NOKKELBYTTE.navnPrefiks}gammel`, rettigheter: ['readFiles'], bucketId: 'annen-botte' }
  const alleBotter: Nokkel = { id: 'alle', hemmelig: 'w', navn: 'noe annet', rettigheter: ['readFiles'], bucketId: null }

  beforeEach(() => {
    nokler = [hoved, nettside, forrige, annenBotte, alleBotter]
    hemmeligheter = new Map([
      [NOKKELBYTTE.midlertidige.id, KONTO],
      [NOKKELBYTTE.midlertidige.nokkel, hoved.hemmelig],
      [NOKKELBYTTE.midlertidige.github, TOKEN],
    ])
    tilbaketrukket = []
    opprettede = []
    ekstraForNye = []
    avvisFørsteInnlogging = 0
    githubGodtar = true
  })

  const valg = (o: Partial<Bytteoppsett> = {}): Bytteoppsett => ({
    oppsett: { id: KONTO, nokkel: hoved.hemmelig },
    gammelId: nettside.id,
    github: { token: TOKEN, repo: 'peohol/ousfar' },
    b2Adresse: adresse,
    githubAdresse: adresse,
    naa: new Date('2026-11-28T10:00:00Z'),
    vent: async () => undefined,
    ...o,
  })
  const ider = () => nokler.map((n) => n.id).sort()

  it('lager en nøkkel med nøyaktig rettighetene jobben trenger, legger den forseglet i miljøet og rydder', async () => {
    avvisFørsteInnlogging = 1
    const r = await byttNokkel(valg())
    expect(r.stopp).toBeNull()
    expect(opprettede).toEqual([[...RETTIGHETER.ny]])
    const ny = nokler.find((n) => n.id === r.nyId)!
    expect(ny).toMatchObject({ bucketId: BOTTE, navn: `${NOKKELBYTTE.navnPrefiks}202611281000` })
    expect(RETTIGHETER.forbudt.some((f) => ny.rettigheter.includes(f))).toBe(false)
    expect(Object.fromEntries(hemmeligheter)).toEqual({ [NOKKELBYTTE.hemmeligheter.id]: ny.id, [NOKKELBYTTE.hemmeligheter.nokkel]: ny.hemmelig })
    // Den gamle og den fra et tidligere bytte er slettet; nøkler for andre bøtter og hovednøkkelen er urørt.
    expect(ider()).toEqual([alleBotter.id, annenBotte.id, KONTO, ny.id].sort())
    expect(r).toMatchObject({ slettedeNokler: 2, oppsettsnokkel: 'hovednøkkel', tokenTrukketTilbake: true, funn: [] })
    expect(r.midlertidigeSlettet.sort()).toEqual(Object.values(NOKKELBYTTE.midlertidige).sort())
    expect(tilbaketrukket).toEqual([{ autorisert: false, tokens: [TOKEN] }])
    const rapport = bytterapport(r)
    expect(rapport).toMatch(/Lag en ny hovednøkkel/)
    for (const hemmelig of [ny.hemmelig, hoved.hemmelig, TOKEN]) expect(rapport).not.toContain(hemmelig)
  })

  it('sletter en midlertidig nøkkel som ikke er hovednøkkelen', async () => {
    const midlertidig: Nokkel = { id: 'midlertidig', hemmelig: 'm', navn: 'bytte', rettigheter: alle, bucketId: null }
    nokler.push(midlertidig)
    const r = await byttNokkel(valg({ oppsett: { id: midlertidig.id, nokkel: midlertidig.hemmelig } }))
    expect(r).toMatchObject({ stopp: null, oppsettsnokkel: 'slettet' })
    expect(ider()).not.toContain(midlertidig.id)
  })

  it('sletter den nye nøkkelen igjen når den ikke består kontrollen, og rydder likevel', async () => {
    ekstraForNye = ['bypassGovernance']
    const r = await byttNokkel(valg())
    expect(r.stopp).toMatch(/aldri skal ha: bypassGovernance/)
    expect(r.nyId).toBe('')
    expect(ider()).toEqual([alleBotter.id, annenBotte.id, forrige.id, KONTO, nettside.id].sort())
    expect(hemmeligheter.size).toBe(0)
    expect(tilbaketrukket).toHaveLength(1)
    expect(bytterapport(r)).toMatch(/ikke fått en ny nøkkel/)
  })

  it('lager ingen nøkkel når GitHub-tokenet ikke virker eller den midlertidige nøkkelen ikke kan lage nøkler', async () => {
    githubGodtar = false
    let r = await byttNokkel(valg())
    expect(r.stopp).toMatch(/godtok ikke tokenet/)
    expect(r.funn.join(' ')).toMatch(/kunne ikke slettes/)
    githubGodtar = true
    const svak: Nokkel = { id: 'svak', hemmelig: 's', navn: 'svak', rettigheter: ['listBuckets'], bucketId: null }
    nokler.push(svak)
    r = await byttNokkel(valg({ oppsett: { id: svak.id, nokkel: svak.hemmelig } }))
    expect(r.stopp).toMatch(/mangler writeKeys, listKeys, deleteKeys/)
    expect(opprettede).toEqual([])
    expect(r.midlertidigeSlettet).toHaveLength(3)
  })

  it('stopper på en midlertidig nøkkel Backblaze ikke godtar', async () => {
    const r = await byttNokkel(valg({ oppsett: { id: KONTO, nokkel: 'feil' } }))
    expect(r).toMatchObject({ oppsettsnokkel: 'ikke slettet', tokenTrukketTilbake: true })
    expect(r.stopp).toMatch(/godtok ikke den midlertidige nøkkelen \(401\)/)
  })

  it('rydder det som finnes, også når en av de midlertidige hemmelighetene mangler', async () => {
    hemmeligheter.delete(NOKKELBYTTE.midlertidige.nokkel)
    let r = await byttNokkel(valg({ oppsett: { id: KONTO } }))
    expect(r.stopp).toMatch(new RegExp(`Mangler ${NOKKELBYTTE.midlertidige.nokkel}`))
    expect(opprettede).toEqual([])
    expect(hemmeligheter.size).toBe(0)
    expect(tilbaketrukket).toEqual([{ autorisert: false, tokens: [TOKEN] }])

    // Uten tokenet: hemmelighetene kan ikke slettes, men en midlertidig nøkkel som ikke er hovednøkkelen, slettes likevel.
    const midlertidig: Nokkel = { id: 'midlertidig', hemmelig: 'm', navn: 'bytte', rettigheter: alle, bucketId: null }
    nokler.push(midlertidig)
    r = await byttNokkel(valg({ oppsett: { id: midlertidig.id, nokkel: midlertidig.hemmelig }, github: { repo: 'peohol/ousfar' } }))
    expect(r.stopp).toMatch(new RegExp(`Mangler ${NOKKELBYTTE.midlertidige.github}`))
    expect(r).toMatchObject({ oppsettsnokkel: 'slettet', tokenTrukketTilbake: false, midlertidigeSlettet: [] })
    expect(r.funn.join(' ')).toMatch(/uten tokenet/)
    expect(ider()).not.toContain(midlertidig.id)
    expect(opprettede).toEqual([])
  })
})
