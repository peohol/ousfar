/**
 * Oppryddingen av gamle grener (`docs/grenrydding.md`): hvilke grener som
 * slettes, at grenene andre oppryddinger eier, aldri røres, og at kjøringen
 * ikke sletter noe den ikke har lest.
 */
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { lagGrensletter } from '../github/gitslett'
import { kjorGrenrydding, lagGrengithub, likPaHovedgrenen, type Grengithub, type Pr } from '../grenrydding/kjoring'
import { GAMMEL_GREN_DOGN, GRENFRISTER, grenMarkdown, ryddesAvAndre, vurderGren, vurderGrener, type Grenvurderingsgrunnlag, type Prinfo } from '../grenrydding/regler'
import { INNSTILLINGER } from '../kurateringsko/innstillinger'

const ROT = fileURLToPath(new URL('../../', import.meta.url))
const NA = '2026-11-25T19:00:00.000Z'
const timer = (n: number) => new Date(Date.parse(NA) - n * 3_600_000).toISOString()
const VALG = { na: NA, hovedgren: 'main' }

function gren(navn: string, endring: Partial<Grenvurderingsgrunnlag> = {}): Grenvurderingsgrunnlag {
  return { navn, beskyttet: false, commit_kl: timer(24 * 10), foran: 2, likPaHovedgrenen: false, prer: [], baseFor: [], ...endring }
}
const pr = (nummer: number, tilstand: Prinfo['tilstand'], lukketFor: number | null = 24 * 10): Prinfo => ({ nummer, tilstand, lukket_kl: lukketFor === null ? null : timer(lukketFor) })

describe('reglene', () => {
  it('rører aldri hovedgrenen, køens gren eller gyldige jobb- og øktgrener', () => {
    for (const navn of ['main', 'kurateringsko/tilstand', 'kuratorjobb/funksjonstest-1', 'kurateringsko/okt/20261124-214700']) {
      expect(ryddesAvAndre(navn, 'main'), navn).not.toBeNull()
      expect(vurderGren(gren(navn, { foran: 0 }), VALG), navn).toMatchObject({ slett: false })
    }
    for (const navn of ['kurateringsko-okt-20261124-214700', 'kuratorjobb-reservasjon-placeholder', 'claude/x', 'kurateringsko/okt/ugyldig navn']) {
      expect(ryddesAvAndre(navn, 'main'), navn).toBeNull()
    }
  })

  it('beholder en beskyttet gren og en gren med åpen PR, uansett hva den inneholder', () => {
    expect(vurderGren(gren('claude/a', { beskyttet: true, foran: 0 }), VALG)).toMatchObject({ slett: false, grunn: 'grenen er beskyttet i GitHub' })
    const v = vurderGren(gren('claude/a', { foran: 0, prer: [pr(3, 'lukket'), pr(9, 'apen', null)] }), VALG)
    expect(v).toMatchObject({ slett: false })
    expect(v.grunn).toContain('#9')
  })

  it('sletter med en gang en gren uten commits utover main, og en der alt står likt på main', () => {
    expect(vurderGren(gren('claude/utmpek', { foran: 0, commit_kl: timer(0.1) }), VALG)).toMatchObject({ slett: true, grunn: 'ingen commits utover main' })
    expect(vurderGren(gren('plan/ytelse', { likPaHovedgrenen: true, commit_kl: timer(0.1) }), VALG)).toMatchObject({ slett: true, grunn: 'alt grenen endrer, står likt på main' })
  })

  it('beholder en gren der det ikke kunne avgjøres hva den har', () => {
    expect(vurderGren(gren('claude/a', { foran: null, likPaHovedgrenen: null }), VALG)).toMatchObject({ slett: false })
  })

  it('sletter en gren med et navn som ligner køens eller jobbenes ett døgn etter den siste commiten', () => {
    expect(GRENFRISTER.feilNavn).toBe(24)
    expect(vurderGren(gren('kurateringsko-okt-20261124-214700', { commit_kl: timer(25) }), VALG)).toMatchObject({ slett: true })
    const v = vurderGren(gren('kuratorjobb-x', { commit_kl: timer(20) }), VALG)
    expect(v).toMatchObject({ slett: false, tidligst_kl: timer(-4) })
    expect(v.grunn).toContain('slettes tidligst 2026-11-25 kl. 23:00 UTC')
  })

  it('sletter en gren tre døgn etter at den siste PR-en ble lukket eller slått sammen, regnet fra det som kom sist', () => {
    expect(GRENFRISTER.etterPr).toBe(72)
    for (const tilstand of ['lukket', 'sammenslatt'] as const) {
      expect(vurderGren(gren('claude/a', { prer: [pr(1, tilstand, 73)], commit_kl: timer(80) }), VALG), tilstand).toMatchObject({ slett: true })
      expect(vurderGren(gren('claude/a', { prer: [pr(1, tilstand, 71)], commit_kl: timer(80) }), VALG), tilstand).toMatchObject({ slett: false })
    }
    // Pushet igjen etter sammenslåingen: fristen regnes fra den nye commiten.
    const igjen = vurderGren(gren('claude/xfb12p', { prer: [pr(513, 'sammenslatt', 24 * 5)], commit_kl: timer(10) }), VALG)
    expect(igjen).toMatchObject({ slett: false, tidligst_kl: timer(10 - 72) })
    expect(igjen.grunn).toContain('#513')
    // Den siste PR-en er den som teller.
    expect(vurderGren(gren('claude/a', { prer: [pr(2, 'lukket', 1), pr(1, 'sammenslatt', 24 * 9)] }), VALG)).toMatchObject({ slett: false })
  })

  it('beholder en gren uten PR, og advarer når den er eldre enn grensen', () => {
    const v = vurderGren(gren('claude/arbeid'), VALG)
    expect(v).toMatchObject({ slett: false, grunn: 'ingen PR fra grenen ennå; kan være arbeid som pågår' })
    const o = vurderGrener([gren('claude/ny'), gren('claude/gammel', { commit_kl: timer(24 * (GAMMEL_GREN_DOGN + 1)) })], { ...VALG, andres: 0 })
    expect(o.advarsler).toHaveLength(1)
    expect(o.advarsler[0]).toContain('claude/gammel')
    expect(o.advarsler[0]).not.toContain('claude/ny')
  })

  it('skriver en oversikt med grunnen for hver gren', () => {
    const o = vurderGrener([gren('a', { foran: 0 }), gren('b|c')], { ...VALG, andres: 40 })
    const md = grenMarkdown(o, { kunVis: false, slettet: new Set(['a']), alleGrener: 42 })
    expect(md).toContain('Fant 42 grener. 40 ryddes av egne regler')
    expect(md).toContain('| `a` | slettet | ingen commits utover main |')
    expect(md).toContain('| `b|c` | beholdt | ingen PR fra grenen ennå; kan være arbeid som pågår |')
    expect(grenMarkdown(o, { kunVis: true, slettet: new Set(), alleGrener: 42 })).toContain('| `a` | ville slettet |')
  })
})

describe('likt på hovedgrenen', () => {
  const tre = (filer: Record<string, string>) => new Map(Object.entries(filer))
  const SKILLE = tre({ 'a.ts': '100644 blob a1', 'gammel.ts': '100644 blob g' })

  it('krever samme innhold, type og modus for hver sti grenen endrer, og at det den fjerner, er borte', () => {
    const hoved = tre({ 'a.ts': '100644 blob a2', 'ny.ts': '100644 blob n' })
    expect(likPaHovedgrenen(SKILLE, tre({ 'a.ts': '100644 blob a2', 'ny.ts': '100644 blob n' }), hoved)).toBe(true)
    // Endret og fjernet, men main har gått videre i en fil grenen ikke rørte: fortsatt likt.
    expect(likPaHovedgrenen(SKILLE, tre({ 'a.ts': '100644 blob a2' }), tre({ 'a.ts': '100644 blob a2', 'annen.ts': '100644 blob x' }))).toBe(true)
    expect(likPaHovedgrenen(SKILLE, tre({ 'a.ts': '100644 blob a3', 'gammel.ts': '100644 blob g' }), hoved)).toBe(false)
    expect(likPaHovedgrenen(SKILLE, tre({ 'a.ts': '100644 blob a1', 'gammel.ts': '100644 blob g', 'b.ts': '100644 blob b' }), hoved)).toBe(false)
    expect(likPaHovedgrenen(SKILLE, tre({ 'gammel.ts': '100644 blob g' }), tre({ 'a.ts': '100644 blob a1', 'gammel.ts': '100644 blob g' }))).toBe(false)
  })

  it('regner samme blob med annen modus eller type som en endring som ikke står på main', () => {
    // Grenen gjør bare et skript kjørbart: samme blob, men endringen står ikke på main.
    expect(likPaHovedgrenen(SKILLE, tre({ 'a.ts': '100755 blob a1', 'gammel.ts': '100644 blob g' }), SKILLE)).toBe(false)
    expect(likPaHovedgrenen(SKILLE, tre({ 'a.ts': '120000 blob a1', 'gammel.ts': '100644 blob g' }), SKILLE)).toBe(false)
    expect(likPaHovedgrenen(SKILLE, tre({ 'a.ts': '100755 blob a1', 'gammel.ts': '100644 blob g' }), tre({ 'a.ts': '100755 blob a1', 'gammel.ts': '100644 blob g' }))).toBe(true)
  })

  it('avgjør ingenting uten alle tre trærne', () => {
    expect(likPaHovedgrenen(null, SKILLE, SKILLE)).toBeNull()
    expect(likPaHovedgrenen(SKILLE, null, SKILLE)).toBeNull()
    expect(likPaHovedgrenen(SKILLE, SKILLE, null)).toBeNull()
  })
})

interface Falsk {
  navn: string
  commit?: number
  beskyttet?: boolean
  /** Commits utover main; `null` for ingen felles historikk. */
  foran?: number | null
  /** Det grenen endrer fra skillepunktet: sti → «modus type sha», eller `null` for fjernet. */
  endrer?: Record<string, string | null>
}

const SKILLEPUNKT = new Map([['a.ts', '100644 blob a1']])
const HOVEDTRE = new Map([
  ['a.ts', '100644 blob a1'],
  ['docs/plan.md', '100644 blob p'],
])
const hex = (navn: string, versjon = 0) => createHash('sha1').update(`${navn}:${versjon}`).digest('hex')

function falskGithub(
  grener: Falsk[],
  prer: Pr[] = [],
  endring: { underveis?: (f: { pushet: Set<string>; apne: Pr[] }) => void; treFeiler?: boolean; slettFeiler?: string[] } = {},
) {
  const slettet: string[] = []
  const pushet = new Set<string>()
  const apne = prer.filter((p) => p.tilstand === 'apen')
  const sha = (navn: string) => hex(navn, pushet.has(navn) ? 1 : 0)
  const finn = (navn: string) => grener.find((g) => g.navn === navn && !slettet.includes(navn))
  const github: Grengithub = {
    hovedgren: async () => 'main',
    grener: async () => [{ navn: 'main', sha: 'sha-main', beskyttet: true }, ...grener.map((g) => ({ navn: g.navn, sha: sha(g.navn), beskyttet: g.beskyttet ?? false }))],
    gren: async (navn) => (finn(navn) ? { sha: sha(navn), commit_kl: timer(finn(navn)!.commit ?? 24 * 10) } : null),
    prer: async () => prer,
    async apnePr() {
      // Rett før slettingen: her kan noen pushe eller åpne en PR.
      endring.underveis?.({ pushet, apne })
      return apne
    },
    async sammenlign(base, s) {
      expect(base).toBe('sha-main')
      const g = grener.find((x) => sha(x.navn) === s)!
      return g.foran === null ? null : { foran: g.foran ?? 1, skillepunkt: 'skille' }
    },
    async tre(s) {
      if (endring.treFeiler) return null
      if (s === 'sha-main') return HOVEDTRE
      if (s === 'skille') return SKILLEPUNKT
      const g = grener.find((x) => sha(x.navn) === s)!
      const t = new Map(SKILLEPUNKT)
      for (const [sti, verdi] of Object.entries(g.endrer ?? { [`${g.navn}.txt`]: '100644 blob x' })) {
        if (verdi === null) t.delete(sti)
        else t.set(sti, verdi)
      }
      return t
    },
    async slett(navn, forventet) {
      // Som `lagGrensletter`: bare når grenen fortsatt står på commiten, og en driftsfeil kastes.
      if ((endring.slettFeiler ?? []).includes(navn)) throw new Error('Git kunne ikke slette')
      if (!finn(navn)) return 'borte'
      if (sha(navn) !== forventet) return 'endret'
      slettet.push(navn)
      return 'slettet'
    },
  }
  return { github, slettet }
}

const p = (nummer: number, tilstand: Prinfo['tilstand'], gren: string | null, lukketFor: number | null = 24 * 10, base: string | null = 'main'): Pr => ({ ...pr(nummer, tilstand, lukketFor), gren, base })

const GRENENE_FRA_ISSUET: Falsk[] = [
  { navn: 'kurateringsko-okt-20261124-214700', commit: 30 },
  { navn: 'kuratorjobb-reservasjon-placeholder', foran: 0 },
  { navn: 'kuratering/ghb-0001', commit: 24 * 40 },
  { navn: 'claude/project-thread-xfb12p', commit: 24 * 4 },
  { navn: 'claude/project-thread-utmpek', foran: 0 },
  { navn: 'plan/ytelse-synlig-innlasting-20261120', endrer: { 'docs/plan.md': '100644 blob p' } },
  { navn: 'claude/project-thread-qns8qy', commit: 1, foran: 0 },
  { navn: 'claude/pagar', commit: 1 },
  { navn: 'claude/kjorbar', commit: 1, endrer: { 'a.ts': '100755 blob a1' } },
  { navn: 'kuratorjobb/funksjonstest-1', foran: 0 },
  { navn: 'kurateringsko/okt/20261124-214700', foran: 0 },
  { navn: 'kurateringsko/tilstand', foran: 0 },
]
const PRENE: Pr[] = [
  p(228, 'lukket', 'kuratering/ghb-0001', 24 * 40),
  p(513, 'sammenslatt', 'claude/project-thread-xfb12p', 24 * 5),
  p(582, 'apen', 'claude/project-thread-qns8qy', null),
]
const kjor = (f: ReturnType<typeof falskGithub>, kunVis = false) => kjorGrenrydding({ github: f.github, kunVis, na: NA, logg: () => {} })

describe('kjøringen', () => {
  it('sletter grenene fra issuet og beholder dem som er i bruk eller eies av andre', async () => {
    const f = falskGithub(GRENENE_FRA_ISSUET, PRENE)
    const utfall = await kjor(f)
    expect(f.slettet.sort()).toEqual(
      [
        'claude/project-thread-utmpek',
        'claude/project-thread-xfb12p',
        'kuratering/ghb-0001',
        'kurateringsko-okt-20261124-214700',
        'kuratorjobb-reservasjon-placeholder',
        'plan/ytelse-synlig-innlasting-20261120',
      ].sort(),
    )
    expect(utfall.oversikt.andres).toBe(4) // main, køens gren, én jobbgren og én øktgren
    // Den som bare gjør en fil kjørbar, har noe main ikke har.
    expect(utfall.oversikt.beholdes.map((v) => v.gren).sort()).toEqual(['claude/kjorbar', 'claude/pagar', 'claude/project-thread-qns8qy'])
  })

  it('sletter ingenting i en forhåndsvisning', async () => {
    const f = falskGithub(GRENENE_FRA_ISSUET, PRENE)
    const utfall = await kjor(f, true)
    expect(f.slettet).toEqual([])
    expect(utfall.oversikt.slettes.length).toBeGreaterThan(0)
  })

  it('sletter ikke en gren noen har pushet til etter vurderingen', async () => {
    const f = falskGithub([{ navn: 'claude/a', foran: 0 }], [], { underveis: ({ pushet }) => pushet.add('claude/a') })
    const utfall = await kjor(f)
    expect(f.slettet).toEqual([])
    expect(utfall.underveis.get('claude/a')).toBe('endret underveis')
    expect(grenMarkdown(utfall.oversikt, { kunVis: false, slettet: utfall.slettet, underveis: utfall.underveis, alleGrener: 2 })).toContain('| `claude/a` | beholdt: endret underveis |')
  })

  it('sletter ikke en gren en PR er åpnet eller gjenåpnet fra, eller inn i, etter den første lesingen', async () => {
    for (const ny of [p(9, 'apen', 'claude/a', null), p(9, 'apen', null, null, 'claude/a')]) {
      const f = falskGithub([{ navn: 'claude/a', foran: 0 }], [], { underveis: ({ apne }) => apne.push(ny) })
      const utfall = await kjor(f)
      expect(f.slettet).toEqual([])
      expect(utfall.underveis.get('claude/a')).toBe('en PR ble åpnet underveis')
    }
  })

  it('beholder en gren en åpen PR skal inn i, også fra et annet repo', async () => {
    const f = falskGithub([{ navn: 'claude/base', foran: 0 }], [p(7, 'apen', null, null, 'claude/base')])
    const utfall = await kjor(f)
    expect(f.slettet).toEqual([])
    expect(utfall.oversikt.beholdes[0]!.grunn).toBe('en åpen PR skal slås sammen inn i grenen (#7)')
  })

  it('regner ikke en gren som lik main når et tre ikke kunne leses helt, eller grenen ikke har noe felles med main', async () => {
    const f = falskGithub([{ navn: 'plan/x', endrer: { 'docs/plan.md': '100644 blob p' } }], [], { treFeiler: true })
    await kjor(f)
    const g = falskGithub([{ navn: 'plan/y', foran: null }])
    await kjor(g)
    expect([...f.slettet, ...g.slettet]).toEqual([])
  })

  it('stopper uten å slette når en lesing feiler', async () => {
    const f = falskGithub([{ navn: 'claude/a', foran: 0 }])
    f.github.prer = async () => {
      throw new Error('GitHub svarte 502')
    }
    await expect(kjor(f)).rejects.toThrow('502')
    expect(f.slettet).toEqual([])
  })
  it('stopper slettingen ved en driftsfeil, uten å forsøke flere grener', async () => {
    const f = falskGithub([{ navn: 'claude/a', foran: 0 }, { navn: 'claude/b', foran: 0 }], [], { slettFeiler: ['claude/a'] })
    const utfall = await kjor(f)
    expect(f.slettet).toEqual([])
    expect(utfall.feil).toBe('Git kunne ikke slette')
    expect(Object.fromEntries(utfall.underveis)).toEqual({ 'claude/a': 'slettingen feilet', 'claude/b': 'ikke forsøkt etter feilen' })
  })

  it('stopper slettingen når de åpne PR-ene ikke kan leses på nytt', async () => {
    const f = falskGithub([{ navn: 'claude/a', foran: 0 }])
    f.github.apnePr = async () => {
      throw new Error('Fikk ingen gyldig liste over PR-ene.')
    }
    const utfall = await kjor(f)
    expect(f.slettet).toEqual([])
    expect(utfall.feil).toContain('PR-ene')
  })

  it('melder en gren noen andre har slettet underveis, uten å regne den som slettet', async () => {
    const f = falskGithub([{ navn: 'claude/a', foran: 0 }], [], { underveis: () => f.slettet.push('claude/a') })
    const utfall = await kjor(f)
    expect(utfall.slettet.size).toBe(0)
    expect(utfall.underveis.get('claude/a')).toBe('slettet av noen andre underveis')
  })
})

describe('sletting gjennom git', () => {
  const git = (mappe: string, ...args: string[]) =>
    execFileSync('git', ['-C', mappe, ...args], {
      env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
      .toString()
      .trim()

  function oppsett() {
    const rot = mkdtempSync(join(tmpdir(), 'gitslett-'))
    const origin = join(rot, 'origin.git')
    const klone = join(rot, 'klone')
    execFileSync('git', ['init', '-q', '--bare', origin])
    execFileSync('git', ['clone', '-q', origin, klone], { stdio: 'ignore' })
    const commit = (melding: string) => {
      git(klone, 'commit', '-q', '--allow-empty', '-m', melding)
      git(klone, 'push', '-q', 'origin', 'HEAD:refs/heads/claude/x')
      return git(klone, 'rev-parse', 'HEAD')
    }
    return { rot, origin, klone, commit }
  }

  it('sletter grenen bare når den fortsatt står på commiten som ble vurdert, og skiller en avvist lease fra en gren som er borte', () => {
    const o = oppsett()
    try {
      const vurdert = o.commit('en')
      const ny = o.commit('to')
      const slett = lagGrensletter(o.klone)
      expect(slett('claude/x', vurdert)).toBe('endret')
      expect(git(o.origin, 'rev-parse', 'refs/heads/claude/x')).toBe(ny)
      expect(slett('claude/x', ny)).toBe('slettet')
      expect(git(o.origin, 'for-each-ref', 'refs/heads/claude/')).toBe('')
      expect(slett('claude/x', ny)).toBe('borte')
      expect(() => slett('claude/x', 'ikke-en-sha')).toThrow('Ugyldig commit')
    } finally {
      rmSync(o.rot, { recursive: true, force: true })
    }
  })

  it('kaster en driftsfeil når git avviser slettingen av en uendret gren, eller grenen ikke kan leses', () => {
    const o = oppsett()
    try {
      const sha = o.commit('en')
      // GitHub-regler eller manglende skrivetilgang: fjernrepoet avviser alt.
      writeFileSync(join(o.origin, 'hooks', 'pre-receive'), '#!/bin/sh\necho "hemmelig-token" >&2\nexit 1\n', { mode: 0o755 })
      const slett = lagGrensletter(o.klone)
      expect(() => slett('claude/x', sha)).toThrow('selv om grenen står uendret')
      expect(() => slett('claude/x', sha)).not.toThrow('hemmelig-token')
      expect(git(o.origin, 'rev-parse', 'refs/heads/claude/x')).toBe(sha)
      git(o.klone, 'remote', 'set-url', 'origin', join(o.rot, 'finnes-ikke.git'))
      expect(() => slett('claude/x', sha)).toThrow('kunne ikke leses etterpå')
    } finally {
      rmSync(o.rot, { recursive: true, force: true })
    }
  })
})

describe('GitHub', () => {
  function falskFetch(svar: Record<string, unknown>) {
    const kall: string[] = []
    const hent = (async (url: string, init?: RequestInit) => {
      const metode = init?.method ?? 'GET'
      kall.push(`${metode} ${url}`)
      const nokkel = Object.keys(svar).find((k) => `${metode} ${url}`.startsWith(k))
      if (!nokkel) return new Response(null, { status: 404 })
      return Response.json(svar[nokkel])
    }) as typeof fetch
    return { hent, kall }
  }
  const R = 'https://api.github.com/repos/eier/repo'
  const ingenSletting = () => {
    throw new Error('skal ikke slette')
  }

  it('leser hovedgrenen, PR-ene med grenen de kommer fra og skal inn i, skillepunktet og trærne med modus', async () => {
    const { hent, kall } = falskFetch({
      [`GET ${R}/pulls?state=all`]: [
        { number: 1, state: 'closed', merged_at: '2026-11-20T00:00:00Z', closed_at: '2026-11-20T00:00:00Z', head: { ref: 'claude/a', repo: { full_name: 'eier/repo' } }, base: { ref: 'main' } },
        { number: 2, state: 'open', merged_at: null, closed_at: null, head: { ref: 'fork', repo: { full_name: 'andre/repo' } }, base: { ref: 'claude/b' } },
      ],
      [`GET ${R}/pulls?state=open`]: [],
      [`GET ${R}/compare/m...s`]: { ahead_by: 2, merge_base_commit: { sha: 'mb' }, files: [] },
      [`GET ${R}/git/trees/m`]: { truncated: false, tree: [{ path: 'b', type: 'blob', mode: '100755', sha: 'x' }, { path: 'mappe', type: 'tree', mode: '040000', sha: 't' }] },
      [`GET ${R}`]: { default_branch: 'main' },
    })
    const gh = lagGrengithub('eier/repo', 't', ingenSletting, hent)
    await expect(gh.hovedgren()).resolves.toBe('main')
    expect(kall[0]).toBe(`GET ${R}`)
    await expect(gh.prer()).resolves.toEqual([
      { nummer: 1, gren: 'claude/a', base: 'main', tilstand: 'sammenslatt', lukket_kl: '2026-11-20T00:00:00Z' },
      { nummer: 2, gren: null, base: 'claude/b', tilstand: 'apen', lukket_kl: null },
    ])
    await expect(gh.apnePr()).resolves.toEqual([])
    await expect(gh.sammenlign('m', 's')).resolves.toEqual({ foran: 2, skillepunkt: 'mb' })
    await expect(gh.tre('m')).resolves.toEqual(new Map([['b', '100755 blob x']]))
  })

  it('feiler i stedet for å gi en ufullstendig PR-liste', async () => {
    const gh404 = lagGrengithub('eier/repo', 't', ingenSletting, falskFetch({}).hent)
    await expect(gh404.apnePr()).rejects.toThrow('Fikk ingen gyldig liste over PR-ene.')
    const full = Array.from({ length: 100 }, (_, i) => ({ number: i, state: 'open', head: { ref: `g${i}`, repo: { full_name: 'eier/repo' } }, base: { ref: 'main' } }))
    const ghMange = lagGrengithub('eier/repo', 't', ingenSletting, falskFetch({ [`GET ${R}/pulls`]: full }).hent)
    await expect(ghMange.prer()).rejects.toThrow('avbryter for sikkerhets skyld')
    const ghUtenNummer = lagGrengithub('eier/repo', 't', ingenSletting, falskFetch({ [`GET ${R}/pulls`]: [{ state: 'open' }] }).hent)
    await expect(ghUtenNummer.apnePr()).rejects.toThrow('uten nummer')
  })

  it('godtar ikke et ufullstendig tre', async () => {
    const { hent } = falskFetch({ [`GET ${R}/git/trees/a`]: { truncated: true, tree: [] }, [`GET ${R}/git/trees/b`]: { truncated: false, tree: [{ path: 'x', type: 'blob', sha: 's' }] } })
    const gh = lagGrengithub('eier/repo', 't', ingenSletting, hent)
    await expect(gh.tre('a')).resolves.toBeNull()
    await expect(gh.tre('b')).resolves.toBeNull()
  })

  it('sletter aldri grener andre oppryddinger eier, og ingenting før hovedgrenen er lest', async () => {
    const { hent } = falskFetch({ [`GET ${R}`]: { default_branch: 'main' } })
    const slettet: string[] = []
    const gh = lagGrengithub('eier/repo', 't', (gren, sha) => (slettet.push(`${gren}@${sha}`), 'slettet'), hent)
    await expect(gh.slett('claude/a', 's')).rejects.toThrow('Hovedgrenen er ikke lest')
    await gh.hovedgren()
    for (const navn of ['main', 'kurateringsko/tilstand', 'kuratorjobb/a', 'kurateringsko/okt/20261125-000951']) await expect(gh.slett(navn, 's'), navn).rejects.toThrow('Sletter ikke')
    await expect(gh.slett('claude/a', 's')).resolves.toBe('slettet')
    expect(slettet).toEqual(['claude/a@s'])
  })
})

describe('arbeidsflytene og fristene', () => {
  const les = (f: string) => readFileSync(`${ROT}.github/workflows/${f}`, 'utf8')

  it('rydder gamle grener hver time fra main, uten hemmeligheter og bare med tilgangene den trenger', () => {
    const flyt = les('rydd-grener.yml')
    expect(flyt).toMatch(/cron: '\d+ \* \* \* \*'/)
    expect(flyt).toContain("if: github.ref == 'refs/heads/main'")
    expect(flyt).toMatch(/^permissions: \{\}$/m)
    for (const t of ['contents: write', 'pull-requests: read']) expect(flyt).toContain(t)
    expect(flyt).not.toContain('id-token')
    expect(flyt).not.toContain('secrets.')
    expect(flyt).toContain('npm run -s rydd-grener -- ../git $KUN_VIS')
    // Koden kjører fra en klone uten legitimasjon; den med, brukes bare til slettingen.
    expect(flyt).toMatch(/path: kode\n\s+persist-credentials: false/)
    expect(flyt).toContain('path: git')
  })

  it('rydder kuratorjobbgrenene hver time, og øktgrenene etter to døgn', () => {
    const jobb = les('rydd-kuratorjobbgrener.yml')
    expect(jobb).toMatch(/cron: '\d+ \* \* \* \*'/)
    expect(jobb).toContain('npm run -s rydd-kuratorjobbgrener -- ../git $KUN_VIS')
    expect(jobb).toMatch(/path: kode\n\s+persist-credentials: false/)
    expect(INNSTILLINGER.okt_slettes_etter_dager).toBe(2)
  })
})
