/**
 * Oppryddingen av kuratorjobbgrenene (`docs/kuratorjobber.md`, «Automatisk
 * opprydding av jobbgrener»): når en gren slettes, når den må beholdes, og at
 * en kjøring aldri sletter noe når grunnlaget er usikkert.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { KO_ARBEIDSFLYT, RYDDE_ARBEIDSFLYT } from '../kuratering/endepunkt'
import type { Greninfo } from '../kurateringsko/modell'
import { jobbgrenerIKoen, kjorRydding, KOFIL, KOGREN, lagRyddegithub, type Ryddegithub } from '../kuratorjobb/ryddekjoring'
import { jobbgrenI, MISTENKELIG_ALDER, RYDDEFRISTER, ryddeMarkdown, vurderAlle, vurderJobbgren, type Jobbgren, type Ryddegrunnlag } from '../kuratorjobb/rydding'

const ROT = fileURLToPath(new URL('../../', import.meta.url))
const NA = '2026-11-16T04:00:00.000Z'
const dogn = (n: number) => new Date(Date.parse(NA) - n * 86_400_000).toISOString()

function status(gren: string, endring: { status?: string; ferdig?: number; oppgaver?: string[]; stoffer?: string[] | 'alle'; funnet?: string[] } = {}) {
  const stoffer = endring.stoffer ?? ['alfa']
  const funnet = endring.funnet ?? (stoffer === 'alle' ? ['alfa', 'beta'] : stoffer)
  const ferdig = dogn(endring.ferdig ?? 10)
  return {
    versjon: 1,
    status: endring.status ?? 'advarsel',
    jobb: { gren, startet_kl: ferdig, ferdig_kl: endring.status === 'kjorer' ? null : ferdig },
    foresporsel: { versjon: 1, stoffer, oppgaver: endring.oppgaver ?? ['funksjonstest', 'spc'] },
    stoffer: Object.fromEntries(funnet.map((s) => [s, { status: 'ok', oppgaver: {} }])),
  }
}

function jobb(navn: string, endring: Parameters<typeof status>[1] & { commit?: number; beskyttet?: boolean; uten?: boolean } = {}): Jobbgren {
  const gren = `kuratorjobb/${navn}`
  return { navn: gren, beskyttet: endring.beskyttet ?? false, commit_kl: dogn(endring.commit ?? endring.ferdig ?? 10), status: endring.uten ? null : status(gren, endring) }
}

function gren(stoff: string, status: Greninfo['status'], publisert?: number, kuratorjobber: string[] = []): Greninfo {
  return {
    id: crypto.randomUUID(),
    stoff,
    art: 'de_novo',
    status,
    revisjon: 1,
    runde: 1,
    oppdatert_kl: dogn(publisert ?? 0),
    publisert_kl: publisert === undefined ? null : dogn(publisert),
    utsatte: [],
    kuratorjobber,
  }
}

const grunnlag = (endring: Partial<Ryddegrunnlag> = {}): Ryddegrunnlag => ({ na: NA, apnePr: new Set(), iKoen: new Set(), grener: [], ...endring })

describe('reglene', () => {
  it('sletter preparatomtalene når hvert stoff er publisert etter jobben, uansett hva køen sier og utfallet av jobben', () => {
    const g = grunnlag({ grener: [gren('alfa', 'publisert', 5), gren('beta', 'publisert', 3)] })
    for (const s of ['ok', 'advarsel', 'feil']) {
      const v = vurderJobbgren(jobb('x', { status: s, stoffer: ['alfa', 'beta'] }), g)
      expect(v).toMatchObject({ slett: true, kategori: 'ferdig' })
      expect(v.grunn).toContain('alfa, beta publisert etter jobben')
    }
  })

  it('venter et døgn etter den siste publiseringen', () => {
    const v = vurderJobbgren(jobb('x', { stoffer: ['alfa', 'beta'] }), grunnlag({ grener: [gren('alfa', 'publisert', 5), gren('beta', 'publisert', 0.5)] }))
    expect(v).toMatchObject({ slett: false, kategori: 'venter', tidligst_kl: new Date(Date.parse(dogn(0.5)) + 86_400_000).toISOString() })
  })

  it('regner ikke en publisering fra før jobben som bruk av den', () => {
    const v = vurderJobbgren(jobb('x', { ferdig: 10 }), grunnlag({ grener: [gren('alfa', 'publisert', 12)] }))
    expect(v).toMatchObject({ slett: false, kategori: 'venter' })
    expect(v.grunn).toContain('venter på at kurateringen av alfa starter')
  })

  it('sletter ubrukte preparatomtaler først etter 30 døgn, når ingen kuratering pågår', () => {
    expect(vurderJobbgren(jobb('x', { ferdig: RYDDEFRISTER.ubrukt - 1 }), grunnlag())).toMatchObject({ slett: false })
    expect(vurderJobbgren(jobb('x', { ferdig: RYDDEFRISTER.ubrukt + 1 }), grunnlag())).toMatchObject({ slett: true, kategori: 'ubrukelig' })
  })

  it('beholder grenen så lenge en kuratering av et av stoffene pågår, hvor gammel jobben enn er', () => {
    for (const s of ['arbeid', 'klar', 'tilbakemelding', 'retting', 'godkjent', 'stanset', 'blokkert'] as const) {
      const v = vurderJobbgren(jobb('x', { ferdig: 90, stoffer: ['alfa', 'beta'] }), grunnlag({ grener: [gren('alfa', 'publisert', 5), gren('beta', s)] }))
      expect(v, s).toMatchObject({ slett: false, kategori: 'i_bruk', grunn: 'kurateringen av beta pågår' })
    }
  })

  it('beholder grenen en pågående kuratering viser til i evidensjournalen, også for et annet stoff', () => {
    const g = grunnlag({ grener: [gren('alfa', 'publisert', 5), gren('gamma', 'retting', undefined, ['kuratorjobb/x'])] })
    expect(vurderJobbgren(jobb('x', { ferdig: 90 }), g)).toMatchObject({ slett: false, kategori: 'i_bruk', grunn: 'brukes i den pågående kurateringen av gamma' })
    // En publisert kuratering som viser til grenen, holder den ikke.
    const publisert = grunnlag({ grener: [gren('alfa', 'publisert', 5, ['kuratorjobb/x'])] })
    expect(vurderJobbgren(jobb('x'), publisert)).toMatchObject({ slett: true, grunn: expect.stringContaining('står i evidensjournalen') })
  })

  it('beholder alltid en gren med en åpen PR, en kobling i køen, GitHub-beskyttelse eller et ugyldig navn', () => {
    const g = grunnlag({ grener: [gren('alfa', 'publisert', 5)] })
    expect(vurderJobbgren(jobb('x'), { ...g, apnePr: new Set(['kuratorjobb/x']) })).toMatchObject({ slett: false, grunn: 'en åpen PR kommer fra grenen' })
    expect(vurderJobbgren(jobb('x'), { ...g, iKoen: new Set(['kuratorjobb/x']) })).toMatchObject({ slett: false, kategori: 'i_bruk' })
    expect(vurderJobbgren(jobb('x', { beskyttet: true }), g)).toMatchObject({ slett: false, grunn: 'grenen er beskyttet i GitHub' })
    expect(vurderJobbgren({ ...jobb('x'), navn: 'kurateringsko/tilstand' }, g)).toMatchObject({ slett: false })
    expect(vurderJobbgren({ ...jobb('x'), navn: 'main' }, g)).toMatchObject({ slett: false })
  })

  it('sletter en funksjonstest alene etter ett døgn når den er bestått, og etter tre med avvik, også for alle sidene', () => {
    const kun = { oppgaver: ['funksjonstest'] }
    expect(vurderJobbgren(jobb('x', { ...kun, status: 'ok', ferdig: 1.1 }), grunnlag())).toMatchObject({ slett: true, kategori: 'ferdig' })
    expect(vurderJobbgren(jobb('x', { ...kun, status: 'ok', ferdig: 0.5 }), grunnlag())).toMatchObject({ slett: false })
    for (const s of ['advarsel', 'feil']) {
      expect(vurderJobbgren(jobb('x', { ...kun, status: s, ferdig: 2 }), grunnlag()), s).toMatchObject({ slett: false })
      expect(vurderJobbgren(jobb('x', { ...kun, status: s, ferdig: 3.1 }), grunnlag()), s).toMatchObject({ slett: true })
    }
    expect(vurderJobbgren(jobb('x', { ...kun, stoffer: 'alle', ferdig: 20 }), grunnlag())).toMatchObject({ slett: true, kategori: 'ferdig' })
  })

  it('sletter en avvist forespørsel etter tre døgn, og en gren uten resultat etter sju', () => {
    const avvist = (ferdig: number) => jobb('x', { status: 'feil', ferdig, stoffer: ['Ukjent'], funnet: [] })
    expect(vurderJobbgren(avvist(2), grunnlag())).toMatchObject({ slett: false })
    expect(vurderJobbgren(avvist(4), grunnlag())).toMatchObject({ slett: true, kategori: 'ubrukelig', grunn: expect.stringContaining('avviste forespørselen') })
    expect(vurderJobbgren(jobb('x', { uten: true, commit: 6 }), grunnlag())).toMatchObject({ slett: false })
    expect(vurderJobbgren(jobb('x', { uten: true, commit: 8 }), grunnlag())).toMatchObject({ slett: true, kategori: 'ubrukelig' })
    // Et resultat for en annen gren er ikke et gyldig resultat.
    expect(vurderJobbgren({ ...jobb('x', { commit: 8 }), status: status('kuratorjobb/annen') }, grunnlag())).toMatchObject({ slett: true, grunn: 'jobben ga aldri et gyldig resultat' })
  })

  it('beholder en jobb som kjører, og sletter en avbrutt etter sju døgn', () => {
    expect(vurderJobbgren(jobb('x', { status: 'kjorer', ferdig: 0.01 }), grunnlag())).toMatchObject({ slett: false, grunn: 'jobben kjører' })
    expect(vurderJobbgren(jobb('x', { status: 'kjorer', ferdig: 3 }), grunnlag())).toMatchObject({ slett: false, grunn: expect.stringContaining('avbrutt') })
    expect(vurderJobbgren(jobb('x', { status: 'kjorer', ferdig: 8 }), grunnlag())).toMatchObject({ slett: true, kategori: 'ubrukelig' })
  })

  it('beholder en gren med nye commits etter resultatet i sju døgn', () => {
    const g = grunnlag({ grener: [gren('alfa', 'publisert', 5)] })
    expect(vurderJobbgren(jobb('x', { ferdig: 10, commit: 2 }), g)).toMatchObject({ slett: false, grunn: expect.stringContaining('nye commits') })
    expect(vurderJobbgren(jobb('x', { ferdig: 10, commit: 8 }), g)).toMatchObject({ slett: true, kategori: 'ubrukelig' })
  })

  it('leser grennavnet først i en oppføring i evidensjournalen', () => {
    expect(jobbgrenI('kuratorjobb/manuell-1 (preparatomtaler 0000-1, funksjonstest)')).toBe('kuratorjobb/manuell-1')
    expect(jobbgrenI(' kuratorjobb/a/b')).toBe('kuratorjobb/a/b')
    for (const v of ['main', 'kurateringsko/tilstand', 'se kuratorjobb/x', 'kuratorjobb/..', 7, null]) expect(jobbgrenI(v)).toBeNull()
  })
})

describe('oversikten', () => {
  it('advarer om grener som er holdt lenge, og når OUSFAR ikke ga noen kurateringsgrener', () => {
    const o = vurderAlle([jobb('gammel', { ferdig: MISTENKELIG_ALDER + 5 })], grunnlag({ apnePr: new Set(['kuratorjobb/gammel']) }))
    expect(o.advarsler).toHaveLength(2)
    expect(o.advarsler[0]).toContain('kuratorjobb/gammel')
    expect(vurderAlle([jobb('ny', { ferdig: 2 })], grunnlag({ grener: [gren('alfa', 'arbeid')] })).advarsler).toEqual([])
  })

  it('viser hver gren, hva som skjedde og hvorfor', () => {
    const o = vurderAlle([jobb('a'), jobb('b', { ferdig: 2, stoffer: ['beta'] })], grunnlag({ grener: [gren('alfa', 'publisert', 1.5)] }))
    const md = ryddeMarkdown(o, { kunVis: false, slettet: new Set(['kuratorjobb/a']), alleGrener: 5 })
    expect(md).toContain('Fant 5 grener, 2 jobbgrener. Slettet 1, beholdt 1.')
    expect(md).toMatch(/\| `kuratorjobb\/a` \| slettet \| ferdig \| ferdig brukt/)
    expect(md).toMatch(/\| `kuratorjobb\/b` \| beholdt \| venter \|/)
    expect(ryddeMarkdown(o, { kunVis: true, slettet: new Set(), alleGrener: 5 })).toContain('Forhåndsvisning: ingenting er slettet.')
  })
})

/** Et falskt GitHub med grenene og filene i minnet. */
function falskGithub(jobber: Jobbgren[], ko: unknown, endring: Partial<Ryddegithub> = {}) {
  const shaer = new Map<string, string>([...jobber.map((j) => [j.navn, `sha-${j.navn}`] as const), ['main', 'm'], [KOGREN, 'k']])
  const slettet: string[] = []
  const github: Ryddegithub = {
    grener: async () => [...shaer].map(([navn, sha]) => ({ navn, sha, beskyttet: jobber.find((j) => j.navn === navn)?.beskyttet ?? false })),
    gren: async (navn) => (shaer.has(navn) ? { sha: shaer.get(navn)!, commit_kl: jobber.find((j) => j.navn === navn)?.commit_kl ?? null } : null),
    jsonfil: async (sti, navn) => (sti === KOFIL && navn === KOGREN ? ko : (jobber.find((j) => j.navn === navn)?.status ?? null)),
    apnePr: async () => [],
    slett: async (navn) => {
      slettet.push(navn)
      shaer.delete(navn)
    },
    ...endring,
  }
  return { github, slettet, shaer }
}

const KO = { versjon: 1, oppdatert_kl: dogn(0.1), stoffer: { alfa: { status: 'klar', reservasjon: null } } }

describe('kjøringen', () => {
  const jobber = [jobb('ferdig'), jobb('pagar', { stoffer: ['beta'] })]
  const grener = async () => [gren('alfa', 'publisert', 5), gren('beta', 'arbeid')]

  it('sletter bare de ferdige jobbgrenene, og aldri køens gren eller andre grener', async () => {
    const f = falskGithub(jobber, KO)
    const u = await kjorRydding({ github: f.github, grener, kunVis: false, na: NA, logg: () => {} })
    expect(f.slettet).toEqual(['kuratorjobb/ferdig'])
    expect([...u.slettet]).toEqual(['kuratorjobb/ferdig'])
    expect(u.oversikt.beholdes.map((v) => v.gren)).toEqual(['kuratorjobb/pagar'])
    expect(f.shaer.has(KOGREN)).toBe(true)
  })

  it('sletter ingenting i forhåndsvisningen', async () => {
    const f = falskGithub(jobber, KO)
    const u = await kjorRydding({ github: f.github, grener, kunVis: true, na: NA, logg: () => {} })
    expect(f.slettet).toEqual([])
    expect(u.oversikt.slettes.map((v) => v.gren)).toEqual(['kuratorjobb/ferdig'])
  })

  it('sletter ikke en gren som er endret siden den ble vurdert', async () => {
    const f = falskGithub(jobber, KO)
    let kall = 0
    const gren0 = f.github.gren
    f.github.gren = async (navn) => {
      const g = await gren0(navn)
      // Det andre oppslaget, rett før slettingen, ser en ny commit.
      if (navn === 'kuratorjobb/ferdig' && ++kall === 2) return { ...g!, sha: 'ny' }
      return g
    }
    const u = await kjorRydding({ github: f.github, grener, kunVis: false, na: NA, logg: () => {} })
    expect(f.slettet).toEqual([])
    expect(ryddeMarkdown(u.oversikt, { kunVis: false, slettet: u.slettet, alleGrener: u.alleGrener })).toContain('beholdt: endret underveis')
  })

  it('stopper uten å slette når køen mangler eller er gammel, eller kurateringsgrenene ikke kan leses', async () => {
    for (const ko of [null, { ...KO, versjon: 2 }, { ...KO, oppdatert_kl: dogn(2) }, { ...KO, oppdatert_kl: dogn(-1) }]) {
      const f = falskGithub(jobber, ko)
      await expect(kjorRydding({ github: f.github, grener, kunVis: false, na: NA, logg: () => {} })).rejects.toThrow('Ingen grener slettes')
      expect(f.slettet).toEqual([])
    }
    const f = falskGithub(jobber, KO)
    await expect(
      kjorRydding({
        github: f.github,
        grener: async () => {
          throw new Error('401')
        },
        kunVis: false,
        na: NA,
        logg: () => {},
      }),
    ).rejects.toThrow('401')
    expect(f.slettet).toEqual([])
  })

  it('kjenner jobbgrenene køen har koblet til noe', () => {
    const ko = {
      stoffer: {
        a: { reservasjon: { jobbgren: 'kuratorjobb/a' }, gjenoppta: { jobbgren: 'kuratorjobb/b' }, appgren: { jobbgren: 'main' }, pr: null },
        b: { pr: { jobbgren: 'kuratorjobb/c' } },
        c: null,
      },
    }
    expect([...jobbgrenerIKoen(ko)].sort()).toEqual(['kuratorjobb/a', 'kuratorjobb/b', 'kuratorjobb/c'])
    expect(jobbgrenerIKoen(null).size).toBe(0)
  })

  it('sletter bare grener under kuratorjobb/ gjennom GitHubs API', async () => {
    const kall: string[] = []
    const gh = lagRyddegithub('eier/repo', 't', async (adresse, valg) => {
      kall.push(`${valg?.method} ${adresse}`)
      return new Response(null, { status: 204 })
    })
    await expect(gh.slett('kurateringsko/tilstand')).rejects.toThrow('Sletter bare jobbgrener')
    await expect(gh.slett('main')).rejects.toThrow('Sletter bare jobbgrener')
    await gh.slett('kuratorjobb/a b')
    expect(kall).toEqual(['DELETE https://api.github.com/repos/eier/repo/git/refs/heads/kuratorjobb/a%20b'])
  })
})

describe('arbeidsflyten', () => {
  const flyt = readFileSync(`${ROT}.github/workflows/rydd-kuratorjobbgrener.yml`, 'utf8')

  it('kjører bare fra main, med de tilgangene den trenger, og kan bare forhåndsvise', () => {
    expect(flyt).toContain("if: github.ref == 'refs/heads/main'")
    expect(flyt).toMatch(/^permissions: \{\}$/m)
    for (const t of ['contents: write', 'pull-requests: read', 'id-token: write']) expect(flyt).toContain(t)
    expect(flyt).toContain('npm run -s rydd-kuratorjobbgrener -- $KUN_VIS')
    expect(flyt).toContain("inputs.kun_vis && '--kun-vis'")
    expect(flyt).not.toContain('secrets.')
  })

  it('får lese kurateringsgrenene i OUSFAR, som køen', () => {
    expect(RYDDE_ARBEIDSFLYT).toBe('.github/workflows/rydd-kuratorjobbgrener.yml')
    expect(KO_ARBEIDSFLYT).toBe('.github/workflows/kurateringsko.yml')
    expect(flyt).toContain('OUSFAR_KO_ADRESSE: https://ousfar.vercel.app/api/kuratering-ko')
  })
})
