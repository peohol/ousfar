/**
 * Prosjektansvaret på oppgavene og PR-ene (`docs/prosjektansvar.md`): kontrollen
 * i `scripts/prosjektansvar.mjs` (prosjekt, ansvarlig systemarkitekt og
 * arbeidsoppgave), arbeidsflytene som kjører den, og at styringsdokumentet,
 * malene og prosjektinstruksene sier det samme.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  KONTROLLNAVN,
  PROSJEKTETIKETTER,
  REGLER_STI,
  SYSTEMARKITEKTER,
  arbeidsoppgaver,
  finnEtterligning,
  hentAktivering,
  kontrollerPr,
  lagGithub,
  lesRegler,
  prerForSak,
  prerForSha,
  somSak,
  vurderAnsvarlige,
  vurderEtiketter,
  vurderOgMeld,
  vurderPr,
  // @ts-expect-error - skriptet er vanlig JavaScript uten typer.
} from '../../scripts/prosjektansvar.mjs'

type Vurdering = { ok: boolean; overgang: boolean; feil: string[]; advarsler: string[]; melding: string }
type Sak = { erPr: boolean; etiketter: string[]; ansvarlige: string[]; opprettetAv?: string; viaApp?: boolean }

const PROSJEKTER = PROSJEKTETIKETTER as Map<string, string>
const ARKITEKTER = SYSTEMARKITEKTER as Map<string, string>
const ETIKETTER = [...PROSJEKTER.keys()]
const REPO = 'peohol/ousfar'
const les = (sti: string) => readFileSync(new URL(`../../${sti}`, import.meta.url), 'utf8')
const vurder = (etiketter: string[]) => vurderEtiketter(etiketter) as { ok: boolean; melding: string; etikett?: string; prosjekt?: string }

/** Kravet om ansvarlig og arbeidsoppgave gjelder fra da; PR-ene under er opprettet senere med mindre annet er sagt. */
const AKTIVERT = '2026-11-20T10:00:00Z'
const ETTER = '2026-11-21T08:00:00Z'
const FOR = '2026-11-19T08:00:00Z'

const pr = (felt: Partial<{ nummer: number; opprettet: string; tekst: string; etiketter: string[]; ansvarlige: string[] }> = {}) => ({
  nummer: 500,
  opprettet: ETTER,
  tekst: '## Sammendrag\n\nNoe.\n\n## Arbeidsoppgave\n\n- Refs #477\n',
  etiketter: ['ansvar:dev', 'Til ChatGPT-kontroll – ikke merge'],
  ansvarlige: ['peohol'],
  ...felt,
})
const sak = (felt: Partial<Sak> = {}): Sak => ({ erPr: false, etiketter: ['ansvar:dev'], ansvarlige: ['peohol'], opprettetAv: 'peohol', viaApp: true, ...felt })
const saker = (liste: Record<number, Sak | null> = { 477: sak() }) => new Map(Object.entries(liste).map(([n, s]) => [Number(n), s]))
const vurderHele = (p = pr(), s = saker(), aktivertKl: string | null = AKTIVERT) => vurderPr({ pr: p, saker: s, aktivertKl, repo: REPO }) as Vurdering

describe('reglene i .github/prosjektansvar.json', () => {
  it('kjenner nøyaktig de tre prosjektene', () => {
    expect(Object.fromEntries(PROSJEKTER)).toEqual({
      'ansvar:dev': 'OUSFAR Dev',
      'ansvar:fag': 'OUSFAR Fag',
      'ansvar:verktoy': 'OUSFAR Verktøy',
    })
  })

  it('kjenner systemarkitektene ved GitHub-brukeren, i dag Peder og Max', () => {
    expect(Object.fromEntries(ARKITEKTER)).toEqual({ peohol: 'Peder', maxhag: 'Max' })
  })

  it('avviser en ufullstendig eller feil regelfil', () => {
    expect(() => lesRegler('{"prosjekter":{"ansvar:dev":"OUSFAR Dev"}}')).toThrow(/systemarkitekter/)
    expect(() => lesRegler('{"prosjekter":{},"systemarkitekter":{"peohol":"Peder"}}')).toThrow(/prosjekter/)
    expect(() => lesRegler('{"prosjekter":{"dev":"OUSFAR Dev"},"systemarkitekter":{"peohol":"Peder"}}')).toThrow(/ansvar:/)
    expect(() => lesRegler('{"prosjekter":{"ansvar:dev":"OUSFAR Dev"},"systemarkitekter":["peohol"]}')).toThrow(/systemarkitekter/)
  })
})

describe('prosjektetiketten', () => {
  it.each(ETIKETTER)('godtar %s alene, også ved siden av andre etiketter', (etikett) => {
    for (const etiketter of [[etikett], ['Til ChatGPT-kontroll – ikke merge', etikett, 'bug']]) {
      expect(vurder(etiketter)).toMatchObject({ ok: true, etikett, prosjekt: PROSJEKTER.get(etikett) })
    }
  })

  it('avviser en PR uten prosjektetikett og sier hva som må gjøres', () => {
    for (const etiketter of [[], ['documentation', 'Til ChatGPT-kontroll – ikke merge']]) {
      const v = vurder(etiketter)
      expect(v.ok).toBe(false)
      expect(v.melding).toMatch(/^PR-en mangler prosjektetikett\./)
      expect(v.melding).toContain('ansvar:dev, ansvar:fag eller ansvar:verktoy')
      expect(v.melding).toContain('docs/prosjektansvar.md')
    }
  })

  it('avviser to eller tre prosjektetiketter og navngir dem', () => {
    const to = vurder(['ansvar:dev', 'ansvar:verktoy'])
    expect(to.ok).toBe(false)
    expect(to.melding).toContain('2 prosjektetiketter (ansvar:dev, ansvar:verktoy), men skal ha nøyaktig én')
    expect(vurder(ETIKETTER)).toMatchObject({ ok: false, melding: expect.stringContaining('3 prosjektetiketter') })
  })

  it('regner en ukjent eller feilstavet ansvar-etikett som prosjektetikett, men ikke som gyldig', () => {
    expect(vurder(['ansvar:design'])).toMatchObject({ ok: false, melding: expect.stringContaining('«ansvar:design» er ikke en gyldig prosjektetikett') })
    expect(vurder(['Ansvar:Dev'])).toMatchObject({ ok: false, melding: expect.stringContaining('«Ansvar:Dev» er ikke en gyldig') })
    expect(vurder(['ansvar:dev', 'ansvar:design']).ok).toBe(false)
  })

  it('teller den samme etiketten bare én gang', () => {
    expect(vurder(['ansvar:fag', 'ansvar:fag']).ok).toBe(true)
  })
})

describe('ansvarlig systemarkitekt', () => {
  it.each([...ARKITEKTER.keys()])('godtar %s alene', (login) => {
    expect(vurderAnsvarlige([login])).toMatchObject({ ok: true, login })
  })

  it('avviser ingen, flere eller ukjente assignees med en konkret retting', () => {
    expect(vurderAnsvarlige([])).toMatchObject({ ok: false, melding: expect.stringMatching(/^PR-en har ingen ansvarlig\. Sett nøyaktig én assignee.*peohol eller maxhag.*Et navn i teksten teller ikke/) })
    expect(vurderAnsvarlige(['peohol', 'maxhag'])).toMatchObject({ ok: false, melding: expect.stringContaining('2 ansvarlige (peohol, maxhag), men skal ha nøyaktig én') })
    expect(vurderAnsvarlige(['github-actions[bot]'])).toMatchObject({ ok: false, melding: expect.stringContaining(`ikke en av systemarkitektene i ${REGLER_STI}`) })
  })
})

describe('arbeidsoppgaven i PR-beskrivelsen', () => {
  it('finner Issue-ene under «## Arbeidsoppgave» i alle vanlige skrivemåter', () => {
    const tekst = [
      '## Arbeidsoppgave',
      '- Refs #477',
      '- Closes #12, fixes peohol/ousfar#13',
      '- https://github.com/peohol/ousfar/issues/14 og #477 igjen',
    ].join('\n')
    expect(arbeidsoppgaver(tekst, REPO)).toEqual([477, 12, 13, 14])
  })

  it('ser bort fra kommentarer, andre avsnitt og andre repoer', () => {
    const tekst = [
      '## Sammendrag',
      'Bygger på #400.',
      '## Arbeidsoppgave',
      '<!-- for eksempel «Refs #123» -->',
      '- Refs #',
      '- Se annen/repo#5, https://github.com/annen/repo/issues/6 og peohol/ousfar/pull/7',
      '## Ansvarlig prosjekt',
      '- Closes #401',
    ].join('\n')
    expect(arbeidsoppgaver(tekst, REPO)).toEqual([])
    expect(arbeidsoppgaver('', REPO)).toEqual([])
    expect(arbeidsoppgaver(null, REPO)).toEqual([])
  })
})

describe('vurderingen av en PR (etter overgangen)', () => {
  it('Peder i Dev: grønn, og sier hvilket ChatGPT-prosjekt og hvilken systemarkitekt som kontrollerer', () => {
    const v = vurderHele()
    expect(v).toMatchObject({ ok: true, overgang: false, feil: [], advarsler: [] })
    expect(v.melding).toContain('OUSFAR Dev eier PR-en (ansvar:dev), og Peder (peohol) er ansvarlig etter Issue #477')
    expect(v.melding).toContain('«GitHub-ansvarlig: peohol»')
  })

  it('Max i Dev: grønn for Max, ikke for Peder', () => {
    const v = vurderHele(pr({ ansvarlige: ['maxhag'] }), saker({ 477: sak({ ansvarlige: ['maxhag'] }) }))
    expect(v.ok).toBe(true)
    expect(v.melding).toContain('Max (maxhag) er ansvarlig')
    expect(v.melding).toContain('«GitHub-ansvarlig: maxhag»')
    expect(v.melding).not.toContain('peohol')
  })

  it.each(ETIKETTER)('fungerer likt i %s', (etikett) => {
    const v = vurderHele(pr({ etiketter: [etikett], ansvarlige: ['maxhag'] }), saker({ 477: sak({ etiketter: [etikett], ansvarlige: ['maxhag'] }) }))
    expect(v.ok).toBe(true)
    expect(v.melding).toContain(`ChatGPT-prosjektet ${PROSJEKTER.get(etikett)}`)
  })

  it('avviser kryssende prosjektetiketter på PR og Issue', () => {
    const v = vurderHele(pr(), saker({ 477: sak({ etiketter: ['ansvar:verktoy'] }) }))
    expect(v.ok).toBe(false)
    expect(v.feil).toEqual([expect.stringContaining('Issue #477 har prosjektetiketten ansvar:verktoy, men PR-en ansvar:dev')])
  })

  it('avviser et Issue uten eller med flere prosjektetiketter', () => {
    expect(vurderHele(pr(), saker({ 477: sak({ etiketter: [] }) })).feil).toEqual([expect.stringMatching(/^Issue #477 mangler prosjektetikett/)])
    expect(vurderHele(pr(), saker({ 477: sak({ etiketter: ['ansvar:dev', 'ansvar:fag'] }) })).feil).toEqual([expect.stringContaining('Issue #477 har 2 prosjektetiketter')])
  })

  it('avviser ingen eller flere assignees på PR-en, også når navnet står i teksten', () => {
    const uten = vurderHele(pr({ ansvarlige: [], tekst: '## Sammendrag\nAnsvarlig: @peohol (Peder)\n## Arbeidsoppgave\nRefs #477' }))
    expect(uten.ok).toBe(false)
    expect(uten.feil[0]).toMatch(/^PR-en har ingen ansvarlig/)
    const flere = vurderHele(pr({ ansvarlige: ['peohol', 'maxhag'] }))
    expect(flere.ok).toBe(false)
    expect(flere.feil[0]).toContain('2 ansvarlige')
  })

  it('avviser ulik ansvarlig på PR og Issue', () => {
    const v = vurderHele(pr({ ansvarlige: ['maxhag'] }))
    expect(v.ok).toBe(false)
    expect(v.feil).toEqual([expect.stringContaining('Issue #477 er tildelt peohol, men PR-en maxhag')])
  })

  it('avviser en PR uten arbeidsoppgave, og en som viser til noe som ikke er et Issue', () => {
    expect(vurderHele(pr({ tekst: '## Sammendrag\nRefs #477' }), saker({})).feil).toEqual([expect.stringMatching(/^PR-en viser ikke til en arbeidsoppgave\. Skriv «Refs #N»/)])
    expect(vurderHele(pr(), saker({ 477: null })).feil).toEqual([expect.stringContaining('#477 under «Arbeidsoppgave» er ikke et Issue i peohol/ousfar')])
    expect(vurderHele(pr(), saker({ 477: sak({ erPr: true }) })).feil).toEqual([expect.stringContaining('er en PR, ikke et Issue')])
  })

  it('krever at alle Issue-ene PR-en viser til, stemmer', () => {
    const tekst = '## Arbeidsoppgave\nRefs #477, Closes #478'
    expect(vurderHele(pr({ tekst }), saker({ 477: sak(), 478: sak() })).ok).toBe(true)
    const v = vurderHele(pr({ tekst }), saker({ 477: sak(), 478: sak({ ansvarlige: ['maxhag'] }) }))
    expect(v.ok).toBe(false)
    expect(v.feil).toHaveLength(1)
    expect(v.feil[0]).toContain('Issue #478 er tildelt maxhag, men PR-en peohol')
  })

  it('godtar flere PR-er til samme Issue', () => {
    const del1 = vurderHele(pr({ nummer: 501 }))
    const del2 = vurderHele(pr({ nummer: 502, tekst: '## Arbeidsoppgave\nCloses #477' }))
    expect([del1.ok, del2.ok]).toEqual([true, true])
  })

  it('et ufordelt Issue stopper PR-en; et Issue opprettet direkte av en systemarkitekt gir et forslag, ikke et fra en app', () => {
    const fraApp = vurderHele(pr(), saker({ 477: sak({ ansvarlige: [], viaApp: true }) }))
    expect(fraApp.ok).toBe(false)
    expect(fraApp.feil[0]).toMatch(/^Issue #477 har ingen ansvarlig/)
    expect(fraApp.feil[0]).not.toContain('opprettet direkte')
    const direkte = vurderHele(pr(), saker({ 477: sak({ ansvarlige: [], viaApp: false, opprettetAv: 'maxhag' }) }))
    expect(direkte.ok).toBe(false)
    expect(direkte.feil[0]).toContain('Det ble opprettet direkte i GitHub av Max (maxhag)')
    const ukjent = vurderHele(pr(), saker({ 477: sak({ ansvarlige: [], viaApp: false, opprettetAv: 'noen-andre' }) }))
    expect(ukjent.feil[0]).not.toContain('opprettet direkte')
  })

  it('en grønn PR blir rød når bare assignee endres, og grønn igjen etter en uttrykkelig overføring av begge', () => {
    expect(vurderHele().ok).toBe(true)
    const baarePr = vurderHele(pr({ ansvarlige: ['maxhag'] }))
    expect(baarePr.ok).toBe(false)
    const baareSak = vurderHele(pr(), saker({ 477: sak({ ansvarlige: ['maxhag'] }) }))
    expect(baareSak.ok).toBe(false)
    const overfort = vurderHele(pr({ ansvarlige: ['maxhag'] }), saker({ 477: sak({ ansvarlige: ['maxhag'] }) }))
    expect(overfort.ok).toBe(true)
    expect(overfort.melding).toContain('«GitHub-ansvarlig: maxhag»')
  })

  it('samler alle feilene, også feil prosjektetikett', () => {
    const v = vurderHele(pr({ etiketter: [], ansvarlige: [], tekst: '' }), saker({}))
    expect(v.ok).toBe(false)
    expect(v.feil).toHaveLength(3)
    expect(v.melding.split('\n')).toHaveLength(3)
  })
})

describe('overgangen for PR-er som fantes før kravet', () => {
  const gammel = pr({ opprettet: FOR, tekst: '## Sammendrag\nUten arbeidsoppgave.', ansvarlige: [] })

  it('lar en eksisterende PR uten arbeidsoppgave og ansvarlig bestå, med advarsler', () => {
    const v = vurderHele(gammel, saker({}))
    expect(v).toMatchObject({ ok: true, overgang: true, feil: [] })
    expect(v.advarsler).toHaveLength(2)
    for (const a of v.advarsler) expect(a).toMatch(/^PR-en ble opprettet før kravet om ansvarlig og arbeidsoppgave gjaldt, og kan fullføres uten\./)
    expect(v.melding).toContain('OUSFAR Dev eier PR-en (ansvar:dev)')
  })

  it('krever fortsatt prosjektetiketten', () => {
    const v = vurderHele({ ...gammel, etiketter: [] }, saker({}))
    expect(v.ok).toBe(false)
    expect(v.feil).toEqual([expect.stringMatching(/^PR-en mangler prosjektetikett/)])
  })

  it('gjelder alle PR-er før kravet er på main, og ingen som opprettes etter', () => {
    expect(vurderHele(pr({ ...gammel, opprettet: ETTER }), saker({}), null)).toMatchObject({ ok: true, overgang: true })
    expect(vurderHele(pr({ ...gammel, opprettet: ETTER }), saker({}))).toMatchObject({ ok: false, overgang: false })
    expect(vurderHele(pr({ ...gammel, opprettet: AKTIVERT }), saker({}))).toMatchObject({ ok: false, overgang: false })
  })
})

/** En falsk GitHub: svarer på stier, og logger alle kall. */
function falskGithub(svar: Record<string, unknown | ((kall: number) => unknown)>) {
  const kall: string[] = []
  const teller: Record<string, number> = {}
  const fetch = async (url: string, { method }: { method: string }) => {
    const sti = url.replace('https://api.github.com/', '')
    kall.push(`${method} ${sti}`)
    const nokkel = Object.keys(svar).find((k) => `${method} ${sti}`.startsWith(k))
    if (!nokkel) return { ok: false, status: 404, text: async () => '{"message":"Not Found"}' }
    teller[nokkel] = (teller[nokkel] ?? 0) + 1
    const verdi = svar[nokkel]
    const data = typeof verdi === 'function' ? (verdi as (n: number) => unknown)(teller[nokkel]!) : verdi
    return { ok: true, status: 200, text: async () => (data === undefined ? '' : JSON.stringify(data)) }
  }
  return { github: lagGithub({ token: 'x', fetch }), kall }
}

const ghPr = (felt: Record<string, unknown> = {}) => ({
  number: 500,
  created_at: ETTER,
  body: '## Arbeidsoppgave\nRefs #477',
  labels: [{ name: 'ansvar:dev' }],
  assignees: [{ login: 'peohol' }],
  head: { sha: 'abc1234def' },
  ...felt,
})
const ghSak = (felt: Record<string, unknown> = {}) => ({
  number: 477,
  repository_url: 'https://api.github.com/repos/peohol/ousfar',
  labels: [{ name: 'ansvar:dev' }],
  assignees: [{ login: 'peohol' }],
  user: { login: 'peohol' },
  performed_via_github_app: { slug: 'claude' },
  ...felt,
})
const commit = (dato: string) => ({ commit: { committer: { date: dato } } })

/** GitHub-svarene for en vanlig PR #500 som bare endrer docs/. */
const vanlig = (felt: Record<string, unknown> = {}) => ({
  'GET repos/peohol/ousfar/pulls/500/files': [{ filename: 'docs/x.md', status: 'modified' }],
  'GET repos/peohol/ousfar/issues/477': ghSak(),
  'GET repos/peohol/ousfar/commits': [commit(AKTIVERT)],
  ...felt,
})
const base64 = (s: string) => ({ content: Buffer.from(s, 'utf8').toString('base64') })

describe('kontrollen mot GitHub', () => {
  it('henter Issue-et og aktiveringen på nytt hver gang, så en ny kjøring ser endringer', async () => {
    let ansvarlig = 'peohol'
    const { github, kall } = falskGithub(vanlig({ 'GET repos/peohol/ousfar/issues/477': () => ghSak({ assignees: [{ login: ansvarlig }] }) }))
    expect(((await kontrollerPr(github, REPO, ghPr(), 'main')) as Vurdering).ok).toBe(true)
    ansvarlig = 'maxhag'
    const v = (await kontrollerPr(github, REPO, ghPr(), 'main')) as Vurdering
    expect(v.ok).toBe(false)
    expect(v.feil[0]).toContain('Issue #477 er tildelt maxhag, men PR-en peohol')
    expect(kall.filter((k) => k.startsWith('GET repos/peohol/ousfar/issues/477'))).toHaveLength(2)
  })

  it('regner aktiveringen fra den eldste commiten som endret regelfila, over flere sider', async () => {
    const side1 = Array.from({ length: 100 }, (_, i) => commit(`2026-12-${String(30 - (i % 28)).padStart(2, '0')}T00:00:00Z`))
    const { github, kall } = falskGithub({
      'GET repos/peohol/ousfar/commits?sha=main&path=.github%2Fprosjektansvar.json&per_page=100&page=1': side1,
      'GET repos/peohol/ousfar/commits?sha=main&path=.github%2Fprosjektansvar.json&per_page=100&page=2': [commit('2026-11-21T00:00:00Z'), commit(AKTIVERT)],
    })
    expect(await hentAktivering(github, REPO, 'main')).toBe(AKTIVERT)
    expect(kall).toHaveLength(2)
    const { github: tom } = falskGithub({ 'GET repos/peohol/ousfar/commits': [] })
    expect(await hentAktivering(tom, REPO, 'main')).toBeNull()
  })

  it('regner et slettet eller flyttet Issue som manglende', async () => {
    const { github } = falskGithub(vanlig({ 'GET repos/peohol/ousfar/issues/477': ghSak({ repository_url: 'https://api.github.com/repos/peohol/annet' }) }))
    const v = (await kontrollerPr(github, REPO, ghPr({ body: '## Arbeidsoppgave\nRefs #477, Refs #479' }), 'main')) as Vurdering
    expect(v.feil).toEqual([expect.stringContaining('#477 under «Arbeidsoppgave» er ikke et Issue'), expect.stringContaining('#479 under «Arbeidsoppgave» er ikke et Issue')])
    expect(somSak(null, REPO)).toBeNull()
    expect(somSak(ghSak({ pull_request: {} }), REPO)).toMatchObject({ erPr: true })
  })

  it('sier fra når PR-en endrer kontrollen selv, men vurderer den som vanlig', async () => {
    const { github } = falskGithub(vanlig({ 'GET repos/peohol/ousfar/pulls/500/files': [{ filename: 'scripts/prosjektansvar.mjs', status: 'modified' }, { filename: REGLER_STI, status: 'modified' }] }))
    const v = (await kontrollerPr(github, REPO, ghPr(), 'main')) as Vurdering
    expect(v.ok).toBe(true)
    expect(v.advarsler).toEqual([expect.stringContaining('PR-en endrer kontrollen selv (scripts/prosjektansvar.mjs, .github/prosjektansvar.json). Den er vurdert med versjonen på main')])
  })

  it('leser endrede arbeidsflyter på PR-ens commit som data og stopper en som kunne etterligne kontrollen', async () => {
    const falsk = 'name: X\non:\n  pull_request:\npermissions:\n  contents: read\njobs:\n  a:\n    name: Prosjektansvar\n    runs-on: ubuntu-latest\n    steps:\n      - run: exit 0\n'
    const { github, kall } = falskGithub(vanlig({
      'GET repos/peohol/ousfar/pulls/500/files': [{ filename: '.github/workflows/falsk.yml', status: 'added' }, { filename: '.github/workflows/gammel.yml', status: 'removed' }],
      'GET repos/peohol/ousfar/contents/.github/workflows/falsk.yml?ref=abc1234def': base64(falsk),
    }))
    const v = (await kontrollerPr(github, REPO, ghPr(), 'main')) as Vurdering
    expect(v.ok).toBe(false)
    expect(v.feil).toEqual([expect.stringContaining('.github/workflows/falsk.yml kjører på PR-er og har en jobb som heter «Prosjektansvar»')])
    expect(kall.filter((k) => k.includes('/contents/'))).toEqual(['GET repos/peohol/ousfar/contents/.github/workflows/falsk.yml?ref=abc1234def'])
  })

  it('stopper etterligning også for PR-er fra før overgangen', async () => {
    const falsk = 'on: [push, pull_request]\njobs:\n  a:\n    runs-on: ubuntu-latest\n'
    const { github } = falskGithub(vanlig({
      'GET repos/peohol/ousfar/pulls/500/files': [{ filename: '.github/workflows/falsk.yml', status: 'modified' }],
      'GET repos/peohol/ousfar/contents/': base64(falsk),
    }))
    const v = (await kontrollerPr(github, REPO, ghPr({ created_at: FOR, body: '' }), 'main')) as Vurdering
    expect(v).toMatchObject({ ok: false, overgang: true })
    expect(v.feil).toEqual([expect.stringContaining('ingen permissions-blokk')])
  })
})

describe('etterligning av kontrollen', () => {
  const fil = (innhold: string, sti = '.github/workflows/x.yml') => finnEtterligning([{ sti, innhold }]) as string[]

  it('stopper en PR-arbeidsflyt med en jobb eller jobb-ID som heter Prosjektansvar', () => {
    expect(fil('on:\n  pull_request:\npermissions: {}\njobs:\n  a:\n    name: "Prosjektansvar"\n')).toHaveLength(1)
    expect(fil('on: pull_request_target\npermissions: {}\njobs:\n  Prosjektansvar:\n    runs-on: x\n')).toHaveLength(1)
    expect(fil('on:\n  - pull_request\npermissions: {}\njobs:\n  a:\n    name: prosjektansvar\n')).toHaveLength(1)
  })

  it('stopper en PR-arbeidsflyt som kan skrive check runs eller statuser, eller mangler permissions', () => {
    expect(fil('on: pull_request\npermissions:\n  checks: write\n')[0]).toContain('checks/statuses: write')
    expect(fil('on: pull_request\npermissions:\n  statuses: write\n')[0]).toContain('checks/statuses: write')
    expect(fil('on: pull_request\npermissions: write-all\n')[0]).toContain('checks/statuses: write')
    expect(fil('on: pull_request\njobs: {}\n')[0]).toContain('ingen permissions-blokk')
  })

  it('godtar arbeidsflyter som ikke kjører på PR-er, og PR-arbeidsflyter med lesetilgang', () => {
    expect(fil('on:\n  push:\npermissions:\n  checks: write\njobs:\n  a:\n    name: Prosjektansvar\n')).toEqual([])
    expect(fil('on:\n  workflow_run:\n    workflows: [x]\npermissions:\n  checks: write\n')).toEqual([])
    expect(fil('on:\n  pull_request:\npermissions:\n  contents: read\njobs:\n  a:\n    name: Bygg\n# name: Prosjektansvar\n')).toEqual([])
  })

  it('godtar repoets egne arbeidsflyter, unntatt den midlertidige overgangsflyten', () => {
    const flyter = readdirSync(new URL('../../.github/workflows/', import.meta.url)).filter((f) => /\.ya?ml$/.test(f)).map((f) => ({ sti: `.github/workflows/${f}`, innhold: les(`.github/workflows/${f}`) }))
    const funn = finnEtterligning(flyter) as string[]
    expect(funn).toEqual([expect.stringMatching(/^\.github\/workflows\/prosjektansvar-overgang\.yml kjører på PR-er og har en jobb som heter «Prosjektansvar»/)])
  })
})

describe('den betrodde kjøringen', () => {
  it('starter check run-en som «pågår» på PR-ens commit og fullfører den med resultatet', async () => {
    const { github, kall } = falskGithub(vanlig({ 'POST repos/peohol/ousfar/check-runs': { id: 77 }, 'PATCH repos/peohol/ousfar/check-runs/77': {} }))
    const v = await vurderOgMeld(github, REPO, ghPr(), 'main', 'https://github.com/peohol/ousfar/actions/runs/1')
    expect(v).toMatchObject({ nummer: 500, ok: true })
    expect(kall.filter((k) => !k.startsWith('GET'))).toEqual(['POST repos/peohol/ousfar/check-runs', 'PATCH repos/peohol/ousfar/check-runs/77'])
  })

  it('skriver navnet regelsettet krever, med riktig commit, og rød når vurderingen ikke kan fullføres', async () => {
    const sendt: { sti: string; data: unknown }[] = []
    const fetch = async (url: string, init: { method: string; body?: string }) => {
      const sti = url.replace('https://api.github.com/', '')
      if (init.method !== 'GET') sendt.push({ sti, data: JSON.parse(init.body!) })
      if (sti === 'repos/peohol/ousfar/check-runs') return { ok: true, status: 201, text: async () => '{"id":5}' }
      if (sti.startsWith('repos/peohol/ousfar/check-runs/5')) return { ok: true, status: 200, text: async () => '{}' }
      return { ok: false, status: 502, text: async () => 'Bad Gateway' }
    }
    const v = await vurderOgMeld(lagGithub({ token: 'x', fetch }), REPO, ghPr(), 'main')
    expect(v.ok).toBe(false)
    expect(sendt[0]).toEqual({ sti: 'repos/peohol/ousfar/check-runs', data: { name: KONTROLLNAVN, head_sha: 'abc1234def', status: 'in_progress' } })
    expect(KONTROLLNAVN).toBe('Prosjektansvar')
    expect(sendt[1]).toMatchObject({ sti: 'repos/peohol/ousfar/check-runs/5', data: { status: 'completed', conclusion: 'failure', output: { title: '1 feil må rettes', summary: expect.stringContaining('Kontrollen kunne ikke fullføres: GitHub svarte 502') } } })
  })

  it('finner PR-ene for en commit og for et Issue, og ingen for et ufordelt backlog-Issue', async () => {
    const { github } = falskGithub({
      'GET repos/peohol/ousfar/pulls?state=open': [
        ghPr({ number: 500, head: { sha: 'aaa' } }),
        ghPr({ number: 501, head: { sha: 'bbb' }, body: '## Arbeidsoppgave\nCloses #477' }),
        ghPr({ number: 502, head: { sha: 'aaa' }, body: '## Sammendrag\nBygger på #477.\n\n## Arbeidsoppgave\nRefs #478' }),
      ],
    })
    expect((await prerForSak(github, REPO, 477)).map((p: { number: number }) => p.number)).toEqual([500, 501])
    expect((await prerForSak(github, REPO, 999)).map((p: { number: number }) => p.number)).toEqual([])
    expect((await prerForSha(github, REPO, 'aaa')).map((p: { number: number }) => p.number)).toEqual([500, 502])
  })
})

describe('arbeidsflytene', () => {
  const flyt = les('.github/workflows/prosjektansvar.yml')
  const utloser = les('.github/workflows/prosjektansvar-utloser.yml')
  const overgang = les('.github/workflows/prosjektansvar-overgang.yml')
  const typer = (tekst: string, hendelse: string) => tekst.match(new RegExp(`${hendelse}:\\n(?:\\s+\\S.*\\n)*?\\s+types: \\[([^\\]]+)\\]`))?.[1]?.split(',').map((t) => t.trim())
  const PR_TYPER = ['opened', 'reopened', 'synchronize', 'edited', 'labeled', 'unlabeled', 'assigned', 'unassigned']

  it('den påkrevde kontrollen kjøres bare fra main: workflow_run og issues, aldri pull_request', () => {
    expect(flyt).toMatch(/^on:\n {2}workflow_run:\n {4}workflows: \['Prosjektansvar – utløser'\]\n {4}types: \[completed\]\n {2}issues:\n/m)
    expect(flyt).not.toMatch(/^\s*pull_request(_target)?\s*:/m)
    expect(typer(flyt, 'issues')).toEqual(expect.arrayContaining(['assigned', 'unassigned', 'labeled', 'unlabeled', 'deleted', 'transferred']))
  })

  it('sjekker bare ut main (ingen ref til PR-en), med minst mulig tilgang og ingen hemmeligheter', () => {
    expect(flyt).not.toMatch(/^\s*ref:/m)
    expect(flyt).toContain(`sparse-checkout: |\n            scripts/prosjektansvar.mjs\n            ${REGLER_STI}\n`)
    expect(flyt).toContain('persist-credentials: false')
    expect(flyt).toMatch(/^permissions:\n {2}checks: write\n {2}contents: read\n {2}issues: read\n {2}pull-requests: read\n\n/m)
    expect(flyt).not.toMatch(/secrets\.|pull_request_target|actions: write/)
    expect(flyt).toContain('run: node scripts/prosjektansvar.mjs\n')
    // Jobben selv heter ikke Prosjektansvar: navnet er check run-en skriptet skriver på PR-en.
    expect(flyt).not.toMatch(/^ {4}name: Prosjektansvar$/m)
  })

  it('utløseren kjører ved alt på PR-en, men har ingen tilganger, sjekker ikke ut og heter noe annet', () => {
    expect(utloser).toMatch(/^name: Prosjektansvar – utløser$/m)
    expect(typer(utloser, 'pull_request')).toEqual(expect.arrayContaining(PR_TYPER))
    expect(utloser).toMatch(/^permissions: \{\}$/m)
    expect(utloser).not.toMatch(/checkout|\$\{\{|secrets\.|^ {4}name: Prosjektansvar$/m)
  })

  it('overgangsflyten er merket midlertidig og gir samme navn som regelsettet krever', () => {
    expect(overgang).toMatch(/^# MIDLERTIDIG\./)
    expect(overgang).toMatch(/^ {4}name: Prosjektansvar$/m)
    expect(typer(overgang, 'pull_request')).toEqual(expect.arrayContaining(PR_TYPER))
    expect(overgang).not.toMatch(/: write|secrets\./)
  })
})

describe('dokumentene sier det samme', () => {
  const ansvar = les('docs/prosjektansvar.md')
  const mal = les('.github/pull_request_template.md')
  const sakmal = les('.github/ISSUE_TEMPLATE/oppgave.md')
  const instrukser = les('docs/prosjektinstrukser.md')
  const standard = les('docs/chatgpt-pr-kontrollstandard.md')
  const agents = les('AGENTS.md')
  const blokker = [...instrukser.matchAll(/^## (Claude|ChatGPT) – (OUSFAR \S+)\n[\s\S]*?```text\n([\s\S]*?)```/gm)]

  it('styringsdokumentet og malene nevner alle tre etikettene', () => {
    for (const e of ETIKETTER) {
      expect(ansvar).toContain(`\`${e}\``)
      expect(mal).toContain(`\`${e}\``)
      expect(sakmal).toContain(e)
    }
    expect(mal).toMatch(/## Ansvarlig prosjekt/)
    expect(mal).toMatch(/Avhengigheter/)
    expect(mal).toMatch(/utenfor/)
  })

  it('PR-malen begynner med sammendraget for mennesker, og AGENTS.md krever det', () => {
    expect(mal.trimStart()).toMatch(/^## Sammendrag\n/)
    const sammendrag = mal.split(/^## /m)[1]!
    for (const del of ['Hva er gjort', 'Hvorfor', 'menneskelig systemarkitekt']) expect(sammendrag).toContain(del)
    expect(agents).toMatch(/Øverst står et kort sammendrag for mennesker/)
    expect(ansvar).toMatch(/øverst\s+et kort sammendrag/)
  })

  it('PR-malen har avsnittet kontrollen leser arbeidsoppgaven fra, og ber om assignee, ikke navn', () => {
    expect(mal).toMatch(/^## Arbeidsoppgave\n/m)
    expect(mal).toMatch(/Refs #N/)
    expect(mal).toMatch(/Closes #N/)
    expect(mal).toMatch(/assignee/)
    expect(arbeidsoppgaver(mal, REPO)).toEqual([]) // den tomme malen viser ikke til noe
    expect(arbeidsoppgaver(mal.replace('- Refs #', '- Refs #477'), REPO)).toEqual([477])
  })

  it('styringsdokumentet beskriver begge aksene, overgangen, overføringen og Peders særskilte myndighet', () => {
    expect(ansvar).toContain(REGLER_STI)
    for (const del of ['Ansvarlig systemarkitekt', 'assignee', 'Overgang', 'Overføring', 'Ufordelt backlog er lov', 'Betrodd kjøring', 'prosjektansvar-utloser.yml', 'prosjektansvar-overgang.yml', 'GitHub-ansvarlig']) expect(ansvar).toContain(del)
    expect(ansvar).toMatch(/tar bare han, uansett hvem som har oppgaven/)
    expect(ansvar).toMatch(/uavhengige fagkontrollen i OUSFAR Fag/)
    for (const login of ARKITEKTER.keys()) expect(ansvar).toContain(`\`${login}\``)
  })

  it('AGENTS.md og kontrollstandarden ruter kontrollen etter både etikett og assignee', () => {
    expect(agents).toMatch(/nøyaktig én assignee: systemarkitekten som har den/)
    expect(agents).toMatch(/Utled aldri personen fra en bots konto, PR-forfatteren eller fritekst/)
    expect(agents).toMatch(/eget prosjekts etikett og egen «GitHub-ansvarlig» som assignee/)
    expect(standard).toMatch(/\*\*både\*\* etiketten .* \*\*og\*\* prosjektets egen systemarkitekt som eneste assignee/)
    expect(standard).toMatch(/Mangler linjen, gjør prosjektet ingen ordinær kontroll/)
  })

  it('har én felles prosjektinstruks per prosjekt og agent, uten personlige varianter', () => {
    const navn = blokker.map((b) => `${b[1]} – ${b[2]}`)
    const prosjekter = [...PROSJEKTER.values()]
    expect(navn.sort()).toEqual(prosjekter.flatMap((p) => [`ChatGPT – ${p}`, `Claude – ${p}`]).sort())
    for (const [, agent, prosjekt, tekst] of blokker) {
      const egen = ETIKETTER.find((e) => PROSJEKTER.get(e) === prosjekt)!
      expect(tekst, `${agent} ${prosjekt}`).toContain('docs/prosjektansvar.md')
      expect(tekst, `${agent} ${prosjekt}`).toContain(`Etiketten dette prosjektet eier: ${egen}`)
      for (const annen of ETIKETTER.filter((e) => e !== egen)) expect(tekst, `${agent} ${prosjekt}`).not.toContain(`eier: ${annen}`)
      for (const del of ['ANSVAR', 'IKKE DITT ANSVAR', 'ARBEIDSDELING', 'LES', 'OPPGAVER OG PR-ER FRA ANDRE PROSJEKTER']) {
        expect(tekst, `${agent} ${prosjekt}: ${del}`).toMatch(new RegExp(`^${del}$`, 'm'))
      }
      // Ingen GitHub-bruker som identitet i selve instruksen (repoet peohol/ousfar er greit).
      for (const login of ARKITEKTER.keys()) expect(tekst, `${agent} ${prosjekt}`).not.toMatch(new RegExp(`${login}(?!/)`))
    }
  })

  it('lar Claude kreve et tildelt Issue og aldri gjette personen', () => {
    const claude = blokker.filter((b) => b[1] === 'Claude').map((b) => b[3]!)
    expect(claude).toHaveLength(3)
    for (const tekst of claude) {
      expect(tekst).toMatch(/^OPPGAVE OG ANSVARLIG$/m)
      expect(tekst).toMatch(/Ingen implementering uten et GitHub Issue med prosjektetiketten og nøyaktig én assignee/)
      expect(tekst).toMatch(/Utled den aldri fra en bots konto, PR-forfatteren eller navn i teksten/)
      expect(tekst).toMatch(/«Arbeidsoppgave»/)
    }
  })

  it('lar ChatGPT bare kontrollere egen kombinasjon av etikett og systemarkitekt, og aldri en PR uten gyldig merking', () => {
    const chatgpt = blokker.filter((b) => b[1] === 'ChatGPT').map((b) => b[3]!)
    expect(chatgpt).toHaveLength(3)
    for (const tekst of chatgpt) {
      expect(tekst).toMatch(/bare PR-er med etiketten ansvar:\S+ og din GitHub-ansvarlig som eneste assignee/)
      expect(tekst).toMatch(/uten gyldig prosjektetikett eller ansvarlig/)
      expect(tekst).toMatch(/Mangler linjen «GitHub-ansvarlig», kontroller og slå ikke sammen noe/)
      expect(tekst).toMatch(/ikke en parallell kontroll/)
    }
  })

  it('gir hver systemarkitekt en ferdig personlinje til ChatGPT-prosjektene', () => {
    for (const login of ARKITEKTER.keys()) expect(instrukser).toContain(`\`\`\`\nGitHub-ansvarlig: ${login}\n\`\`\``)
  })

  it('bevarer den uavhengige kontrollen av fagsidene i OUSFAR Fag og Peders myndighet', () => {
    const fag = instrukser.match(/^## Claude – OUSFAR Fag\n[\s\S]*?```text\n([\s\S]*?)```/m)?.[1] ?? ''
    expect(fag).toMatch(/Kurator og Kontrollør har aldri direkte kontakt/)
    expect(fag).toMatch(/Kontrolløren sjekker de sentrale påstandene mot kildene selv/)
    expect(fag).toMatch(/Hver tråd bruker bare sin egen nøkkel/)
    expect(fag).toMatch(/Peder er fagansvarlig, uansett hvem som har oppgaven/)
    const chatgptFag = instrukser.match(/^## ChatGPT – OUSFAR Fag\n[\s\S]*?```text\n([\s\S]*?)```/m)?.[1] ?? ''
    expect(chatgptFag).toMatch(/erstatter ikke/)
    const verktoy = instrukser.match(/^## Claude – OUSFAR Verktøy\n[\s\S]*?```text\n([\s\S]*?)```/m)?.[1] ?? ''
    expect(verktoy).toMatch(/Nye kliniske regler krever eksakt godkjenning/)
  })
})
