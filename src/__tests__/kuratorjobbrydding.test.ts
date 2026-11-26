/**
 * Oppryddingen av kuratorjobbgrenene (`docs/kuratorjobber.md`, «Automatisk
 * opprydding av jobbgrener»): når en gren slettes, når den må beholdes, og at
 * en kjøring aldri sletter noe når grunnlaget er usikkert.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { KO_ARBEIDSFLYT, RYDDE_ARBEIDSFLYT } from '../kuratering/endepunkt'
import type { Greninfo } from '../kurateringsko/modell'
import { lagGrenleser } from '../kurateringsko/grener'
import { jobbgrenerIKoen, kjorRydding, KOFIL, KOGREN, kontrollerGrener, lagRyddegithub, type Ryddegithub } from '../kuratorjobb/ryddekjoring'
import { FORESPORSELSFIL, STATUSFIL } from '../kuratorjobb/modell'
import { jobbgrenI, MISTENKELIG_ALDER, RYDDEFRISTER, ryddeMarkdown, vurderAlle, vurderJobbgren, type Jobbgren, type Ryddegrunnlag } from '../kuratorjobb/rydding'

const ROT = fileURLToPath(new URL('../../', import.meta.url))
const NA = '2026-11-16T04:00:00.000Z'
const dogn = (n: number) => new Date(Date.parse(NA) - n * 86_400_000).toISOString()

function status(gren: string, endring: { status?: string; ferdig?: number; oppgaver?: string[]; stoffer?: string[] | 'alle'; funnet?: string[]; utenSha?: boolean } = {}) {
  const stoffer = endring.stoffer ?? ['alfa']
  const funnet = endring.funnet ?? (stoffer === 'alle' ? ['alfa', 'beta'] : stoffer)
  const ferdig = dogn(endring.ferdig ?? 10)
  return {
    versjon: 1,
    status: endring.status ?? 'advarsel',
    jobb: { gren, startet_kl: ferdig, ferdig_kl: endring.status === 'kjorer' ? null : ferdig, foresporsel_sha256: endring.utenSha ? null : 'f1' },
    foresporsel: { versjon: 1, stoffer, oppgaver: endring.oppgaver ?? ['funksjonstest', 'spc'] },
    stoffer: Object.fromEntries(funnet.map((s) => [s, { status: 'ok', oppgaver: {} }])),
  }
}

function jobb(navn: string, endring: Parameters<typeof status>[1] & { commit?: number; beskyttet?: boolean; uten?: boolean; foresporsel?: string | null } = {}): Jobbgren {
  const gren = `kuratorjobb/${navn}`
  return {
    navn: gren,
    beskyttet: endring.beskyttet ?? false,
    commit_kl: dogn(endring.commit ?? endring.ferdig ?? 10),
    status: endring.uten ? null : status(gren, endring),
    foresporsel_sha256: endring.foresporsel === undefined ? 'f1' : endring.foresporsel,
  }
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
    expect(RYDDEFRISTER.etterPublisering).toBe(24)
    const v = vurderJobbgren(jobb('x', { stoffer: ['alfa', 'beta'] }), grunnlag({ grener: [gren('alfa', 'publisert', 5), gren('beta', 'publisert', 0.5)] }))
    expect(v).toMatchObject({ slett: false, kategori: 'venter', tidligst_kl: new Date(Date.parse(dogn(0.5)) + 86_400_000).toISOString() })
  })

  it('regner ikke en publisering fra før jobben som bruk av den', () => {
    const v = vurderJobbgren(jobb('x', { ferdig: 10 }), grunnlag({ grener: [gren('alfa', 'publisert', 12)] }))
    expect(v).toMatchObject({ slett: false, kategori: 'venter' })
    expect(v.grunn).toContain('venter på at kurateringen av alfa starter')
  })

  it('sletter ubrukte preparatomtaler først etter 30 døgn, når ingen kuratering pågår', () => {
    expect(RYDDEFRISTER.ubrukt).toBe(30 * 24)
    expect(vurderJobbgren(jobb('x', { ferdig: 29 }), grunnlag())).toMatchObject({ slett: false })
    const v = vurderJobbgren(jobb('x', { ferdig: 31 }), grunnlag())
    expect(v).toMatchObject({ slett: true, kategori: 'ubrukelig' })
    expect(v.grunn).toContain('på 30 døgn')
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

  it('sletter en funksjonstest alene tre timer etter at den er bestått, og tre døgn etter en med avvik, også for alle sidene', () => {
    const kun = { oppgaver: ['funksjonstest'] }
    const time = 1 / 24
    expect(vurderJobbgren(jobb('x', { ...kun, status: 'ok', ferdig: 3.1 * time }), grunnlag())).toMatchObject({ slett: true, kategori: 'ferdig' })
    const venter = vurderJobbgren(jobb('x', { ...kun, status: 'ok', ferdig: 2 * time }), grunnlag())
    expect(venter).toMatchObject({ slett: false, kategori: 'venter', tidligst_kl: new Date(Date.parse(NA) + time * 86_400_000).toISOString() })
    expect(venter.grunn).toContain('slettes tidligst 2026-11-16 kl. 05:00 UTC')
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

  it('beholder en gren med en ny forespørsel resultatet ikke gjelder i sju døgn, uansett hvor fort den kom', () => {
    const g = grunnlag({ grener: [gren('alfa', 'publisert', 5)] })
    // Ny forespørsel ett minutt etter jobben: resultatet gjelder den forrige.
    expect(vurderJobbgren(jobb('x', { ferdig: 2, commit: 2 - 1 / 1440, foresporsel: 'f2' }), g)).toMatchObject({ slett: false, grunn: expect.stringContaining('ny forespørsel') })
    expect(vurderJobbgren(jobb('x', { ferdig: 10, commit: 2, foresporsel: 'f2' }), g)).toMatchObject({ slett: false })
    expect(vurderJobbgren(jobb('x', { ferdig: 10, commit: 8, foresporsel: 'f2' }), g)).toMatchObject({ slett: true, kategori: 'ubrukelig' })
    expect(vurderJobbgren(jobb('x', { ferdig: 10, commit: 8, foresporsel: null }), g)).toMatchObject({ slett: true, kategori: 'ubrukelig' })
    // Samme forespørsel: en senere commit endrer ingenting.
    expect(vurderJobbgren(jobb('x', { ferdig: 10, commit: 2 }), g)).toMatchObject({ slett: true, kategori: 'ferdig' })
    // Uten SHA i resultatet avgjør tiden: en commit mer enn ti minutter etter jobben er noe nytt.
    expect(vurderJobbgren(jobb('x', { ferdig: 10, commit: 2, utenSha: true }), g)).toMatchObject({ slett: false, grunn: expect.stringContaining('ny forespørsel') })
    expect(vurderJobbgren(jobb('x', { ferdig: 10, commit: 10 - 1 / 1440, utenSha: true }), g)).toMatchObject({ slett: true })
  })

  it('leser grennavnet først i en oppføring i evidensjournalen', () => {
    expect(jobbgrenI('kuratorjobb/manuell-1 (preparatomtaler 0000-1, funksjonstest)')).toBe('kuratorjobb/manuell-1')
    expect(jobbgrenI(' kuratorjobb/a/b')).toBe('kuratorjobb/a/b')
    for (const v of ['main', 'kurateringsko/tilstand', 'se kuratorjobb/x', 'kuratorjobb/..', 7, null]) expect(jobbgrenI(v)).toBeNull()
  })
})

describe('oversikten', () => {
  it('advarer om grener som er holdt lenge', () => {
    const o = vurderAlle([jobb('gammel', { ferdig: MISTENKELIG_ALDER + 5 })], grunnlag({ apnePr: new Set(['kuratorjobb/gammel']), grener: [gren('alfa', 'arbeid')] }))
    expect(o.advarsler).toHaveLength(1)
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
    fil: async (sti, ref) => {
      if (sti === KOFIL) return ref === KOGREN && ko !== null ? Buffer.from(JSON.stringify(ko)) : null
      const j = jobber.find((x) => `sha-${x.navn}` === ref)
      if (!j) return null
      if (sti === STATUSFIL) return j.status === null ? null : Buffer.from(JSON.stringify(j.status))
      return sti === FORESPORSELSFIL ? Buffer.from(FORESPORSEL) : null
    },
    apnePr: async () => [],
    // Som `--force-with-lease`: bare når grenen fortsatt står på commiten.
    slett: async (navn, sha) => {
      if (shaer.get(navn) !== sha) return false
      slettet.push(navn)
      shaer.delete(navn)
      return true
    },
    ...endring,
  }
  return { github, slettet, shaer }
}

const FORESPORSEL = '{"versjon":1,"stoffer":["alfa"]}'
const KO = { versjon: 1, oppdatert_kl: dogn(0.1), stoffer: { alfa: { status: 'klar', reservasjon: null } } }

describe('kjøringen', () => {
  const sha = createHash('sha256').update(FORESPORSEL).digest('hex')
  const medSha = (j: Jobbgren): Jobbgren => ({ ...j, status: { ...(j.status as object), jobb: { ...(j.status as { jobb: object }).jobb, foresporsel_sha256: sha } } })
  const jobber = [medSha(jobb('ferdig')), medSha(jobb('pagar', { stoffer: ['beta'] })), jobb('ny-foresporsel', { commit: 1 })]
  const grener = async () => [gren('alfa', 'publisert', 5), gren('beta', 'arbeid')]

  it('sletter bare de ferdige jobbgrenene, og aldri køens gren eller andre grener', async () => {
    const f = falskGithub(jobber, KO)
    const u = await kjorRydding({ github: f.github, grener, kunVis: false, na: NA, logg: () => {} })
    expect(f.slettet).toEqual(['kuratorjobb/ferdig'])
    expect([...u.slettet]).toEqual(['kuratorjobb/ferdig'])
    // Den siste har et resultat for en annen forespørsel enn den som står på grenen.
    expect(u.oversikt.beholdes.map((v) => v.gren)).toEqual(['kuratorjobb/ny-foresporsel', 'kuratorjobb/pagar'])
    expect(f.shaer.has(KOGREN)).toBe(true)
  })

  it('sletter ingenting i forhåndsvisningen', async () => {
    const f = falskGithub(jobber, KO)
    const u = await kjorRydding({ github: f.github, grener, kunVis: true, na: NA, logg: () => {} })
    expect(f.slettet).toEqual([])
    expect(u.oversikt.slettes.map((v) => v.gren)).toEqual(['kuratorjobb/ferdig'])
  })

  it('sletter ikke en gren noen har pushet til, eller en PR er åpnet fra, etter vurderingen', async () => {
    // Rett før slettingen leses de åpne PR-ene på nytt; her pushes det til grenen, eller en PR åpnes.
    for (const [underveis, grunn] of [
      [(f: ReturnType<typeof falskGithub>) => f.shaer.set('kuratorjobb/ferdig', 'ny'), 'endret underveis'],
      [() => {}, 'en PR ble åpnet underveis'],
    ] as const) {
      const f = falskGithub(jobber, KO)
      let lesinger = 0
      f.github.apnePr = async () => {
        if (++lesinger === 1) return []
        underveis(f)
        return grunn === 'en PR ble åpnet underveis' ? ['kuratorjobb/ferdig'] : []
      }
      const u = await kjorRydding({ github: f.github, grener, kunVis: false, na: NA, logg: () => {} })
      expect(f.slettet).toEqual([])
      expect(u.underveis.get('kuratorjobb/ferdig')).toBe(grunn)
      expect(ryddeMarkdown(u.oversikt, { kunVis: false, slettet: u.slettet, underveis: u.underveis, alleGrener: u.alleGrener })).toContain(`beholdt: ${grunn}`)
    }
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

  describe('uten hele datasettet om kurateringsgrenene', () => {
    // En gammel, ubrukt jobb som ellers ville passert 30-døgnsregelen.
    const ubrukt = [medSha(jobb('ubrukt', { ferdig: RYDDEFRISTER.ubrukt + 10, stoffer: ['gamma'] }))]
    const fullt = [gren('alfa', 'publisert', 5), gren('beta', 'arbeid')]
    const utenKoblinger = (g: Greninfo): Greninfo => {
      const { kuratorjobber: _, ...resten } = g
      return resten
    }
    const kjor = (grener: () => Promise<readonly Greninfo[]>) => {
      const f = falskGithub(ubrukt, KO)
      return { f, kjoring: kjorRydding({ github: f.github, grener, kunVis: false, na: NA, logg: () => {} }) }
    }
    const MILJO = { OUSFAR_KO_ADRESSE: 'https://ousfar.example/api/kuratering-ko', ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.example/?x=1', ACTIONS_ID_TOKEN_REQUEST_TOKEN: 't' }
    const svarMed = (grener: unknown[]) => async (adresse: string) => (adresse.startsWith('https://token') ? Response.json({ value: 'oidc' }) : Response.json({ grener }))

    it('sletter den gamle, ubrukte jobben når datasettet er helt', async () => {
      const { f, kjoring } = kjor(async () => fullt)
      await kjoring
      expect(f.slettet).toEqual(['kuratorjobb/ubrukt'])
    })

    it('stopper uten å slette ved et tomt svar, eller når en gren mangler koblingene til jobbgrenene', async () => {
      for (const grener of [[], [fullt[0]!, utenKoblinger(fullt[1]!)]]) {
        const { f, kjoring } = kjor(async () => grener)
        await expect(kjoring).rejects.toThrow('Ingen grener slettes')
        expect(f.slettet).toEqual([])
      }
      expect(() => kontrollerGrener(fullt)).not.toThrow()
    })

    it('leser bare et komplett svar fra OUSFAR: ingen tom liste, ingen ukjent oppføring og koblingene på hver gren', async () => {
      const ugyldigAktiv = { ...gren('gamma', 'arbeid'), art: 'ukjent' }
      const tilfeller: [unknown[], string][] = [
        [[], 'ga ingen kurateringsgrener'],
        [[...fullt, ugyldigAktiv], '1 av 3 kurateringsgrener fra https://ousfar.example/api/kuratering-ko har ukjent form'],
        [[fullt[0], utenKoblinger(fullt[1]!)], '1 av 2 kurateringsgrener fra https://ousfar.example/api/kuratering-ko mangler gyldige koblinger'],
        [[fullt[0], { ...fullt[1], kuratorjobber: ['kuratorjobb/x (preparatomtaler)'] }], 'mangler gyldige koblinger'],
      ]
      for (const [grener, feil] of tilfeller) {
        const les = lagGrenleser(MILJO, svarMed(grener), { komplett: true })!
        const { f, kjoring } = kjor(les)
        await expect(kjoring).rejects.toThrow(feil)
        expect(f.slettet).toEqual([])
        // Køen leser som før: den ukjente oppføringen hoppes over.
        await expect(lagGrenleser(MILJO, svarMed(grener))!()).resolves.toBeInstanceOf(Array)
      }
      await expect(lagGrenleser(MILJO, svarMed(fullt), { komplett: true })!()).resolves.toEqual(fullt)
    })
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

  it('slår opp en gren med hele navnet som én parameter, og sletter bare grener under kuratorjobb/, med commiten', async () => {
    const kall: string[] = []
    const slettet: string[] = []
    const gh = lagRyddegithub(
      'eier/repo',
      't',
      (gren, sha) => slettet.push(`${gren}@${sha}`) > 0,
      async (adresse, valg) => {
        kall.push(`${valg?.method} ${adresse}`)
        return new Response(null, { status: 204 })
      },
    )
    await expect(gh.slett('kurateringsko/tilstand', 's')).rejects.toThrow('Sletter bare jobbgrener')
    await expect(gh.slett('main', 's')).rejects.toThrow('Sletter bare jobbgrener')
    await expect(gh.slett('kuratorjobb/a', 's')).resolves.toBe(true)
    await gh.gren('kuratorjobb/a')
    expect(slettet).toEqual(['kuratorjobb/a@s'])
    expect(kall).toEqual(['GET https://api.github.com/repos/eier/repo/branches/kuratorjobb%2Fa'])
  })
})

describe('arbeidsflyten', () => {
  const flyt = readFileSync(`${ROT}.github/workflows/rydd-kuratorjobbgrener.yml`, 'utf8')

  it('kjører bare fra main, med de tilgangene den trenger, og kan bare forhåndsvise', () => {
    expect(flyt).toContain("if: github.ref == 'refs/heads/main'")
    expect(flyt).toMatch(/^permissions: \{\}$/m)
    for (const t of ['contents: write', 'pull-requests: read', 'id-token: write']) expect(flyt).toContain(t)
    expect(flyt).toContain('npm run -s rydd-kuratorjobbgrener -- ../git $KUN_VIS')
    expect(flyt).toContain("inputs.kun_vis && '--kun-vis'")
    expect(flyt).not.toContain('secrets.')
  })

  it('får lese kurateringsgrenene i OUSFAR, som køen', () => {
    expect(RYDDE_ARBEIDSFLYT).toBe('.github/workflows/rydd-kuratorjobbgrener.yml')
    expect(KO_ARBEIDSFLYT).toBe('.github/workflows/kurateringsko.yml')
    expect(flyt).toContain('OUSFAR_KO_ADRESSE: https://ousfar.vercel.app/api/kuratering-ko')
  })
})
