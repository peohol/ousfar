/**
 * Nøkkelbyttet for kopilageret (`src/drift/sikkerhetskopi/nokkelbytte.ts` og
 * `forsegling.ts`, `docs/drift-gjenoppretting.md`, «Nøkkelen til lageret»):
 * mot et falskt Backblaze og et falskt GitHub, ryddesteget i
 * `.github/workflows/lagernokkel.yml` mot det samme falske GitHub, og den
 * forseglede boksen mot en boks libsodium har laget.
 */
import { execFile } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { createServer, type IncomingMessage } from 'node:http'
import type { AddressInfo } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { x25519 } from '@noble/curves/ed25519'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { apne, forsegl } from '../drift/sikkerhetskopi/forsegling'
import { byttNokkel, bytterapport, type Bytteoppsett } from '../drift/sikkerhetskopi/nokkelbytte'
import { LAGER, NOKKELBYTTE, RETTIGHETER } from '../drift/sikkerhetskopi/drift'
import { lagernokkelFraMiljo, nokkelpar } from '../drift/sikkerhetskopi/lager'

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

describe('nøkkelparet i miljøet', () => {
  const h = NOKKELBYTTE.hemmeligheter
  it('leser paret, ellers de to gamle hemmelighetene, og stopper på et halvt par', () => {
    expect(lagernokkelFraMiljo({ [h.par]: nokkelpar('id1', 'n/ø+kkel') })).toEqual({ id: 'id1', nokkel: 'n/ø+kkel' })
    expect(lagernokkelFraMiljo({ [h.par]: nokkelpar('id1', 'a'), [h.gamle.id]: 'id2', [h.gamle.nokkel]: 'b' })).toEqual({ id: 'id1', nokkel: 'a' })
    expect(lagernokkelFraMiljo({ [h.gamle.id]: 'id2', [h.gamle.nokkel]: 'b' })).toEqual({ id: 'id2', nokkel: 'b' })
    expect(lagernokkelFraMiljo({})).toBeNull()
    for (const feil of ['utenkolon', ':nokkel', 'id:']) expect(() => lagernokkelFraMiljo({ [h.par]: feil })).toThrow(/keyID:nøkkel/)
    expect(() => lagernokkelFraMiljo({ [h.gamle.id]: 'id2' })).toThrow(/Bare den ene/)
  })
})

describe('nøkkelbyttet', () => {
  const BOTTE = 'botte-kopi'
  const KONTO = 'konto1'
  const TOKEN = `github_pat_${randomBytes(12).toString('hex')}`
  const miljoPrivat = x25519.utils.randomPrivateKey()
  const h = NOKKELBYTTE.hemmeligheter
  let nokler: Nokkel[] = []
  let hemmeligheter: Map<string, string> = new Map()
  let tilbaketrukket: { autorisert: boolean; tokens: string[] }[] = []
  let opprettede: string[][] = []
  let ekstraForNye: string[] = []
  let avvisFørsteInnlogging = 0
  let githubGodtar = true
  /** Svaret på lagringen: `null` lagrer, et tall svarer med den statusen uten å lagre, `lagre-og-500` lagrer og svarer 500, `brudd` bryter forbindelsen. */
  let lagring: null | number | 'lagre-og-500' | 'brudd' = null

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
        const ny = { id: `ny-${opprettede.length}`, hemmelig: randomBytes(16).toString('base64'), navn: String(b.keyName), rettigheter: [...rett, ...ekstraForNye], bucketId: String(b.bucketId) }
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
        if (lagring === 'brudd') return req.socket.destroy()
        if (typeof lagring === 'number') return svar(lagring)
        if (b.key_id !== 'k1') return svar(422)
        hemmeligheter.set(navn, new TextDecoder().decode(apne(Buffer.from(String(b.encrypted_value), 'base64'), miljoPrivat)))
        return svar(lagring === 'lagre-og-500' ? 500 : 201)
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
  const forHand = () => [nettside, forrige, annenBotte, alleBotter, hoved].map((n) => n.id).sort()

  beforeEach(() => {
    nokler = [hoved, nettside, forrige, annenBotte, alleBotter]
    hemmeligheter = new Map([
      [NOKKELBYTTE.midlertidige.id, KONTO],
      [NOKKELBYTTE.midlertidige.nokkel, hoved.hemmelig],
      [NOKKELBYTTE.midlertidige.github, TOKEN],
      [h.gamle.id, nettside.id],
      [h.gamle.nokkel, nettside.hemmelig],
    ])
    tilbaketrukket = []
    opprettede = []
    ekstraForNye = []
    avvisFørsteInnlogging = 0
    githubGodtar = true
    lagring = null
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
  const nye = () => nokler.filter((n) => n.id.startsWith('ny-'))

  it('lager en nøkkel med nøyaktig rettighetene jobben trenger, legger paret forseglet i én hemmelighet og sletter de gamle', async () => {
    avvisFørsteInnlogging = 1
    const r = await byttNokkel(valg())
    expect(r).toMatchObject({ utfall: 'byttet', stopp: null, slettedeNokler: 2, oppsettsnokkel: 'hovednøkkel', funn: [] })
    expect(opprettede).toEqual([[...RETTIGHETER.ny]])
    const [ny] = nye()
    expect(ny).toMatchObject({ bucketId: BOTTE, navn: `${NOKKELBYTTE.navnPrefiks}202611281000` })
    expect(RETTIGHETER.forbudt.some((f) => ny!.rettigheter.includes(f))).toBe(false)
    // Paret, og de to gamle hemmelighetene er borte; de midlertidige rydder ryddesteget.
    expect(hemmeligheter.get(h.par)).toBe(nokkelpar(ny!.id, ny!.hemmelig))
    expect(lagernokkelFraMiljo(Object.fromEntries(hemmeligheter))).toEqual({ id: ny!.id, nokkel: ny!.hemmelig })
    expect([...hemmeligheter.keys()].sort()).toEqual([...Object.values(NOKKELBYTTE.midlertidige), h.par].sort())
    // Den gamle og den fra et tidligere bytte er slettet; nøkler for andre bøtter og hovednøkkelen er urørt.
    expect(ider()).toEqual([alleBotter.id, annenBotte.id, KONTO, ny!.id].sort())
    const rapport = bytterapport(r)
    expect(rapport).toMatch(/Byttet: /)
    expect(rapport).toMatch(/Lag en ny hovednøkkel i Backblaze nå/)
    for (const hemmelig of [ny!.hemmelig, hoved.hemmelig, TOKEN]) expect(rapport).not.toContain(hemmelig)
  })

  it('sletter en midlertidig nøkkel som ikke er hovednøkkelen', async () => {
    const midlertidig: Nokkel = { id: 'midlertidig', hemmelig: 'm', navn: 'bytte', rettigheter: alle, bucketId: null }
    nokler.push(midlertidig)
    const r = await byttNokkel(valg({ oppsett: { id: midlertidig.id, nokkel: midlertidig.hemmelig } }))
    expect(r).toMatchObject({ utfall: 'byttet', oppsettsnokkel: 'slettet' })
    expect(ider()).not.toContain(midlertidig.id)
  })

  it('sletter den nye nøkkelen igjen når den ikke består kontrollen', async () => {
    ekstraForNye = ['bypassGovernance']
    const r = await byttNokkel(valg())
    expect(r).toMatchObject({ utfall: 'uendret' })
    expect(r.stopp).toMatch(/aldri skal ha: bypassGovernance/)
    expect(ider()).toEqual(forHand())
    expect(hemmeligheter.has(h.par)).toBe(false)
    expect(bytterapport(r)).toMatch(/Uendret: kopijobben har fortsatt den gamle nøkkelen/)
  })

  it('sletter den nye nøkkelen og lar alt annet stå når GitHub avviser lagringen', async () => {
    lagring = 422
    const r = await byttNokkel(valg())
    expect(r).toMatchObject({ utfall: 'uendret', slettedeNokler: 0 })
    expect(r.stopp).toMatch(/avviste lagringen/)
    expect(ider()).toEqual(forHand())
    expect(hemmeligheter.get(h.gamle.id)).toBe(nettside.id)
    expect(hemmeligheter.has(h.par)).toBe(false)
  })

  it('sletter ingen nøkkel når det er uavklart om GitHub lagret paret', async () => {
    for (const svar of ['lagre-og-500', 'brudd', 503] as const) {
      nokler = [hoved, nettside, forrige, annenBotte, alleBotter]
      opprettede = []
      lagring = svar
      const r = await byttNokkel(valg())
      expect(r, String(svar)).toMatchObject({ utfall: 'uavklart', slettedeNokler: 0 })
      expect(r.stopp).toMatch(/svarte ikke sikkert/)
      // Både den nye og den gamle står, så den som er lagret, virker.
      expect(ider()).toEqual([...forHand(), 'ny-1'].sort())
      expect(hemmeligheter.get(h.gamle.id)).toBe(nettside.id)
      expect(bytterapport(r)).toMatch(/Uavklart: /)
    }
  })

  it('lager ingen nøkkel når GitHub-tokenet ikke virker, den midlertidige nøkkelen ikke kan lage nøkler, eller en hemmelighet mangler', async () => {
    githubGodtar = false
    let r = await byttNokkel(valg())
    expect(r.stopp).toMatch(/godtok ikke tokenet/)
    githubGodtar = true
    const svak: Nokkel = { id: 'svak', hemmelig: 's', navn: 'svak', rettigheter: ['listBuckets'], bucketId: null }
    nokler.push(svak)
    r = await byttNokkel(valg({ oppsett: { id: svak.id, nokkel: svak.hemmelig } }))
    expect(r.stopp).toMatch(/mangler writeKeys, listKeys, deleteKeys/)
    r = await byttNokkel(valg({ oppsett: { id: KONTO } }))
    expect(r.stopp).toMatch(new RegExp(`Mangler ${NOKKELBYTTE.midlertidige.nokkel}`))
    expect(opprettede).toEqual([])
    // Uten tokenet slettes en midlertidig nøkkel som ikke er hovednøkkelen, likevel.
    const midlertidig: Nokkel = { id: 'midlertidig', hemmelig: 'm', navn: 'bytte', rettigheter: alle, bucketId: null }
    nokler.push(midlertidig)
    r = await byttNokkel(valg({ oppsett: { id: midlertidig.id, nokkel: midlertidig.hemmelig }, github: { repo: 'peohol/ousfar' } }))
    expect(r).toMatchObject({ utfall: 'uendret', oppsettsnokkel: 'slettet' })
    expect(ider()).not.toContain(midlertidig.id)
    expect(opprettede).toEqual([])
  })

  it('stopper på en midlertidig nøkkel Backblaze ikke godtar', async () => {
    const r = await byttNokkel(valg({ oppsett: { id: KONTO, nokkel: 'feil' } }))
    expect(r).toMatchObject({ utfall: 'uendret', oppsettsnokkel: 'ikke slettet' })
    expect(r.stopp).toMatch(/godtok ikke den midlertidige nøkkelen \(401\)/)
    expect(bytterapport(r)).toMatch(/Slett den der nå/)
  })

  describe('ryddesteget i arbeidsflyten', () => {
    const fil = readFileSync(fileURLToPath(new URL('../../.github/workflows/lagernokkel.yml', import.meta.url)), 'utf8')
    const steg = fil.slice(fil.indexOf('      - name: Ryddingen'))
    const verdi = (navn: string) => steg.match(new RegExp(`^ {10}${navn}: (.+)$`, 'm'))?.[1]
    const skript = steg
      .slice(steg.indexOf('        run: |\n') + '        run: |\n'.length)
      .split('\n')
      .filter((l) => l.startsWith('          ') || l === '')
      .map((l) => l.slice(10))
      .join('\n')

    it('kjører alltid, og rydder nøyaktig de midlertidige hemmelighetene i miljøet', () => {
      expect(steg).toMatch(/^ {8}if: always\(\)$/m)
      expect(verdi('MILJO')).toBe(NOKKELBYTTE.miljo)
      expect(verdi('MIDLERTIDIGE')?.split(' ')).toEqual(Object.values(NOKKELBYTTE.midlertidige))
      expect(steg).not.toMatch(/uses:|npm /)
    })

    const kjor = async (token?: string) => {
      const mappe = mkdtempSync(join(tmpdir(), 'ousfar-rydd-'))
      const sammendrag = join(mappe, 'sammendrag')
      try {
        const env = { PATH: process.env.PATH, GITHUB_API_URL: adresse, GITHUB_REPOSITORY: 'peohol/ousfar', GITHUB_STEP_SUMMARY: sammendrag, MILJO: verdi('MILJO'), MIDLERTIDIGE: verdi('MIDLERTIDIGE'), ...(token ? { KOPI_GITHUB_TOKEN: token } : {}) }
        const ut = await promisify(execFile)('bash', ['-e', '-c', skript], { env }).then(
          (r) => ({ kode: 0, logg: r.stdout }),
          (e: { code: number; stdout: string }) => ({ kode: e.code, logg: e.stdout }),
        )
        return { ...ut, sammendrag: readFileSync(sammendrag, 'utf8') }
      } finally {
        rmSync(mappe, { recursive: true, force: true })
      }
    }

    it('sletter de midlertidige hemmelighetene og trekker tokenet tilbake, uten å skrive det ut', async () => {
      const r = await kjor(TOKEN)
      expect(r.kode).toBe(0)
      expect([...hemmeligheter.keys()].sort()).toEqual(Object.values(h.gamle).sort())
      expect(tilbaketrukket).toEqual([{ autorisert: false, tokens: [TOKEN] }])
      expect(r.sammendrag).toMatch(/tokenet er trukket tilbake/)
      expect(r.sammendrag).toMatch(/lager en ny hovednøkkel/)
      expect(r.logg + r.sammendrag).not.toContain(TOKEN)
    })

    it('blir rødt og sier hva som må slettes når tokenet mangler eller ikke virker', async () => {
      let r = await kjor()
      expect(r.kode).toBe(1)
      expect(r.sammendrag).toMatch(/KOPI_GITHUB_TOKEN manglet/)
      githubGodtar = false
      r = await kjor(TOKEN)
      expect(r.kode).toBe(1)
      expect(r.sammendrag).toMatch(/B2_OPPSETT_NOKKEL kunne ikke slettes \(GitHub svarte 401\)/)
      expect(hemmeligheter.has(NOKKELBYTTE.midlertidige.nokkel)).toBe(true)
    })
  })
})
