/**
 * Oppryddingen av gamle grener (`docs/grenrydding.md`): hvilke grener som
 * slettes, at grenene andre oppryddinger eier, aldri røres, og at kjøringen
 * ikke sletter noe den ikke har lest.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { kjorGrenrydding, lagGrengithub, likPaHovedgrenen, type Filendring, type Grengithub, type Sammenligning } from '../grenrydding/kjoring'
import { GAMMEL_GREN_DOGN, GRENFRISTER, grenMarkdown, ryddesAvAndre, vurderGren, vurderGrener, type Grenvurderingsgrunnlag, type Prinfo } from '../grenrydding/regler'
import { INNSTILLINGER } from '../kurateringsko/innstillinger'

const ROT = fileURLToPath(new URL('../../', import.meta.url))
const NA = '2026-11-25T19:00:00.000Z'
const timer = (n: number) => new Date(Date.parse(NA) - n * 3_600_000).toISOString()
const VALG = { na: NA, hovedgren: 'main' }

function gren(navn: string, endring: Partial<Grenvurderingsgrunnlag> = {}): Grenvurderingsgrunnlag {
  return { navn, beskyttet: false, commit_kl: timer(24 * 10), foran: 2, likPaHovedgrenen: false, prer: [], ...endring }
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
  const tre = new Map([
    ['a.ts', 'sha-a'],
    ['ny.ts', 'sha-ny'],
  ])
  const fil = (sti: string, status: string, sha: string | null = null, forrige: string | null = null): Filendring => ({ sti, status, sha, forrige })

  it('krever samme innhold for hver fil, og at det som er fjernet, er borte', () => {
    expect(likPaHovedgrenen([fil('a.ts', 'modified', 'sha-a'), fil('gammel.ts', 'removed', 'x')], tre)).toBe(true)
    expect(likPaHovedgrenen([fil('ny.ts', 'renamed', 'sha-ny', 'gammel.ts')], tre)).toBe(true)
    expect(likPaHovedgrenen([fil('a.ts', 'modified', 'sha-annen')], tre)).toBe(false)
    expect(likPaHovedgrenen([fil('b.ts', 'added', 'sha-b')], tre)).toBe(false)
    expect(likPaHovedgrenen([fil('a.ts', 'removed', 'sha-a')], tre)).toBe(false)
    expect(likPaHovedgrenen([fil('ny.ts', 'renamed', 'sha-ny', 'a.ts')], tre)).toBe(false)
    expect(likPaHovedgrenen([fil('a.ts', 'modified', null)], tre)).toBe(false)
  })

  it('avgjør ingenting uten hele listen', () => {
    expect(likPaHovedgrenen(null, tre)).toBeNull()
    expect(likPaHovedgrenen([fil('a.ts', 'modified', 'sha-a')], null)).toBeNull()
  })
})

interface Falsk {
  navn: string
  sha?: string
  commit?: number
  beskyttet?: boolean
  sammenligning?: Sammenligning | null
}

function falskGithub(grener: Falsk[], prer: (Prinfo & { gren: string })[] = [], endring: { endretUnderveis?: string[]; tre?: Map<string, string> | null } = {}) {
  const slettet: string[] = []
  const lest = new Set<string>()
  const sha = (g: Falsk) => g.sha ?? `sha-${g.navn}`
  const github: Grengithub = {
    hovedgren: async () => 'main',
    grener: async () => [{ navn: 'main', sha: 'sha-main', beskyttet: true }, ...grener.map((g) => ({ navn: g.navn, sha: sha(g), beskyttet: g.beskyttet ?? false }))],
    async gren(navn) {
      const g = grener.find((x) => x.navn === navn)
      if (!g || slettet.includes(navn)) return null
      // Andre gang grenen leses, rett før slettingen, har noen pushet til den.
      const endret = (endring.endretUnderveis ?? []).includes(navn) && lest.has(navn)
      lest.add(navn)
      return { sha: endret ? 'ny-sha' : sha(g), commit_kl: timer(g.commit ?? 24 * 10) }
    },
    prer: async () => prer,
    async sammenlign(base, s) {
      expect(base).toBe('sha-main')
      const g = grener.find((x) => sha(x) === s)!
      return g.sammenligning === undefined ? { foran: 1, filer: [] } : g.sammenligning
    },
    tre: async () => (endring.tre === undefined ? new Map() : endring.tre),
    async slett(navn) {
      slettet.push(navn)
    },
  }
  return { github, slettet }
}

const GRENENE_FRA_ISSUET: Falsk[] = [
  { navn: 'kurateringsko-okt-20261124-214700', commit: 30, sammenligning: { foran: 1, filer: [{ sti: 'kurateringsko/foresporsel.json', status: 'added', sha: 'f', forrige: null }] } },
  { navn: 'kuratorjobb-reservasjon-placeholder', sammenligning: { foran: 0, filer: [] } },
  { navn: 'kuratering/ghb-0001', commit: 24 * 40, sammenligning: { foran: 3, filer: [{ sti: 'x.sql', status: 'added', sha: 'x', forrige: null }] } },
  { navn: 'claude/project-thread-xfb12p', commit: 24 * 4, sammenligning: { foran: 1, filer: [{ sti: 'y.ts', status: 'modified', sha: 'y2', forrige: null }] } },
  { navn: 'claude/project-thread-utmpek', sammenligning: { foran: 0, filer: [] } },
  { navn: 'plan/ytelse-synlig-innlasting-20261120', sammenligning: { foran: 1, filer: [{ sti: 'docs/plan.md', status: 'added', sha: 'p', forrige: null }] } },
  { navn: 'claude/project-thread-qns8qy', commit: 1, sammenligning: { foran: 1, filer: [] } },
  { navn: 'claude/pagar', commit: 1, sammenligning: { foran: 1, filer: [{ sti: 'z.ts', status: 'added', sha: 'z', forrige: null }] } },
  { navn: 'kuratorjobb/funksjonstest-1', sammenligning: { foran: 0, filer: [] } },
  { navn: 'kurateringsko/okt/20261124-214700', sammenligning: { foran: 0, filer: [] } },
  { navn: 'kurateringsko/tilstand', sammenligning: { foran: 0, filer: [] } },
]
const PRENE: (Prinfo & { gren: string })[] = [
  { ...pr(228, 'lukket', 24 * 40), gren: 'kuratering/ghb-0001' },
  { ...pr(513, 'sammenslatt', 24 * 5), gren: 'claude/project-thread-xfb12p' },
  { ...pr(582, 'apen', null), gren: 'claude/project-thread-qns8qy' },
]

describe('kjøringen', () => {
  it('sletter grenene fra issuet og beholder dem som er i bruk eller eies av andre', async () => {
    const f = falskGithub(GRENENE_FRA_ISSUET, PRENE, { tre: new Map([['docs/plan.md', 'p']]) })
    const utfall = await kjorGrenrydding({ github: f.github, kunVis: false, na: NA, logg: () => {} })
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
    expect(utfall.oversikt.beholdes.map((v) => v.gren).sort()).toEqual(['claude/pagar', 'claude/project-thread-qns8qy'])
  })

  it('sletter ingenting i en forhåndsvisning', async () => {
    const f = falskGithub(GRENENE_FRA_ISSUET, PRENE)
    const utfall = await kjorGrenrydding({ github: f.github, kunVis: true, na: NA, logg: () => {} })
    expect(f.slettet).toEqual([])
    expect(utfall.oversikt.slettes.length).toBeGreaterThan(0)
  })

  it('sletter ikke en gren som er endret siden den ble vurdert', async () => {
    const f = falskGithub([{ navn: 'claude/a', sammenligning: { foran: 0, filer: [] } }], [], { endretUnderveis: ['claude/a'] })
    const utfall = await kjorGrenrydding({ github: f.github, kunVis: false, na: NA, logg: () => {} })
    expect(f.slettet).toEqual([])
    expect(utfall.oversikt.slettes.map((v) => v.gren)).toEqual(['claude/a'])
  })

  it('regner ikke en gren som lik main når treet ikke kunne leses helt', async () => {
    const f = falskGithub([{ navn: 'plan/x', sammenligning: { foran: 1, filer: [{ sti: 'a', status: 'added', sha: 'a', forrige: null }] } }], [], { tre: null })
    await kjorGrenrydding({ github: f.github, kunVis: false, na: NA, logg: () => {} })
    expect(f.slettet).toEqual([])
  })

  it('stopper uten å slette når en lesing feiler', async () => {
    const f = falskGithub([{ navn: 'claude/a', sammenligning: { foran: 0, filer: [] } }])
    f.github.prer = async () => {
      throw new Error('GitHub svarte 502')
    }
    await expect(kjorGrenrydding({ github: f.github, kunVis: false, na: NA, logg: () => {} })).rejects.toThrow('502')
    expect(f.slettet).toEqual([])
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
      return svar[nokkel] === null ? new Response(null, { status: 204 }) : Response.json(svar[nokkel])
    }) as typeof fetch
    return { hent, kall }
  }
  const R = 'https://api.github.com/repos/eier/repo'

  it('leser hovedgrenen, PR-ene fra repoet og sammenligningen', async () => {
    const { hent, kall } = falskFetch({
      [`GET ${R}/pulls`]: [
        { number: 1, state: 'closed', merged_at: '2026-11-20T00:00:00Z', closed_at: '2026-11-20T00:00:00Z', head: { ref: 'claude/a', repo: { full_name: 'eier/repo' } } },
        { number: 2, state: 'open', merged_at: null, closed_at: null, head: { ref: 'fork', repo: { full_name: 'andre/repo' } } },
      ],
      [`GET ${R}/compare/m...s`]: { ahead_by: 2, files: [{ filename: 'b', status: 'renamed', sha: 'x', previous_filename: 'a' }] },
      [`GET ${R}/git/trees/m`]: { truncated: false, tree: [{ path: 'b', type: 'blob', sha: 'x' }, { path: 'mappe', type: 'tree', sha: 't' }] },
      [`GET ${R}`]: { default_branch: 'main' },
    })
    const gh = lagGrengithub('eier/repo', 't', hent)
    await expect(gh.hovedgren()).resolves.toBe('main')
    expect(kall[0]).toBe(`GET ${R}`)
    await expect(gh.prer()).resolves.toEqual([{ nummer: 1, gren: 'claude/a', tilstand: 'sammenslatt', lukket_kl: '2026-11-20T00:00:00Z' }])
    await expect(gh.sammenlign('m', 's')).resolves.toEqual({ foran: 2, filer: [{ sti: 'b', status: 'renamed', sha: 'x', forrige: 'a' }] })
    await expect(gh.tre('m')).resolves.toEqual(new Map([['b', 'x']]))
  })

  it('godtar ikke en ufullstendig fil- eller treliste', async () => {
    const mange = Array.from({ length: 300 }, (_, i) => ({ filename: `f${i}`, status: 'added', sha: 's' }))
    const { hent } = falskFetch({ [`GET ${R}/compare/`]: { ahead_by: 400, files: mange }, [`GET ${R}/git/trees/`]: { truncated: true, tree: [] } })
    const gh = lagGrengithub('eier/repo', 't', hent)
    await expect(gh.sammenlign('m', 's')).resolves.toEqual({ foran: 400, filer: null })
    await expect(gh.tre('m')).resolves.toBeNull()
  })

  it('sletter aldri grener andre oppryddinger eier, og ingenting før hovedgrenen er lest', async () => {
    const { hent, kall } = falskFetch({ [`DELETE ${R}/git/refs/heads/`]: null, [`GET ${R}`]: { default_branch: 'main' } })
    const gh = lagGrengithub('eier/repo', 't', hent)
    await expect(gh.slett('claude/a')).rejects.toThrow('Hovedgrenen er ikke lest')
    await gh.hovedgren()
    for (const navn of ['main', 'kurateringsko/tilstand', 'kuratorjobb/a', 'kurateringsko/okt/20261125-000951']) await expect(gh.slett(navn), navn).rejects.toThrow('Sletter ikke')
    await gh.slett('claude/a b')
    expect(kall.at(-1)).toBe(`DELETE ${R}/git/refs/heads/claude/a%20b`)
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
    expect(flyt).toContain('npm run -s rydd-grener -- $KUN_VIS')
  })

  it('rydder kuratorjobbgrenene hver time, og øktgrenene etter to døgn', () => {
    expect(les('rydd-kuratorjobbgrener.yml')).toMatch(/cron: '\d+ \* \* \* \*'/)
    expect(INNSTILLINGER.okt_slettes_etter_dager).toBe(2)
  })
})
