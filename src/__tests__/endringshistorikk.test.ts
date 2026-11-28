/**
 * Versjonsnumrene beregnet fra ekte Git-historikk (`src/drift/endringshistorikk.ts`):
 * parallelle PR-er som slås sammen i ulik rekkefølge, gamle revisjoner som
 * bygges på nytt, grunne kloner som på Vercel og i GitHub Actions, og
 * historikk som ikke kan brukes trygt.
 *
 * Hvert repo lages i en midlertidig mappe; ingenting her rører repoet selv.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import type { Semverniva } from '../domain/versjon'
import { nummerer } from '../domain/versjonering'
import { ENDRINGSMAPPE, lesEndringshistorikk, Versjoneringsfeil } from '../drift/endringshistorikk'

const mapper: string[] = []
afterAll(() => mapper.forEach((m) => rmSync(m, { recursive: true, force: true })))

function midlertidig(): string {
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-versjon-'))
  mapper.push(mappe)
  return mappe
}

/** Klokka i repoet: hver commit får et nytt minutt, så rekkefølgen aldri kommer av tiden. */
let minutt = 0
function git(rot: string, ...args: string[]): string {
  const tid = new Date(Date.UTC(2026, 10, 16, 8, minutt++)).toISOString()
  return execFileSync('git', args, {
    cwd: rot,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, GIT_AUTHOR_DATE: tid, GIT_COMMITTER_DATE: tid, GIT_CONFIG_NOSYSTEM: '1', HOME: rot },
  })
}

function lagRepo(): string {
  const rot = midlertidig()
  git(rot, 'init', '-q', '-b', 'main')
  git(rot, 'config', 'user.name', 'Test')
  git(rot, 'config', 'user.email', 'test@example.invalid')
  git(rot, 'config', 'commit.gpgsign', 'false')
  writeFileSync(join(rot, 'README.md'), 'Test\n')
  commit(rot, 'Start')
  return rot
}

function skrivEndring(rot: string, id: string, semver: Semverniva, opprettet: string, sammendrag = `Endring ${id}`, ekstra: Record<string, unknown> = {}): void {
  const fil = join(rot, ENDRINGSMAPPE, `${id}.json`)
  mkdirSync(dirname(fil), { recursive: true })
  const foring = { id, semver, opprettet, sammendrag, typer: ['Funksjonalitet'], omfang: 'Mindre omfang', punkter: ['Endret'], ...ekstra }
  writeFileSync(fil, `${JSON.stringify(foring, null, 2)}\n`)
}

function commit(rot: string, melding: string): string {
  git(rot, 'add', '-A')
  git(rot, 'commit', '-q', '--allow-empty', '-m', melding)
  return git(rot, 'rev-parse', 'HEAD').trim()
}

/** En PR: en gren fra `fra` med én endring og en egen kodeendring. */
function pr(rot: string, navn: string, id: string, semver: Semverniva, opprettet: string, fra = 'main'): void {
  git(rot, 'checkout', '-q', '-b', navn, fra)
  writeFileSync(join(rot, `${navn}.txt`), `${navn}\n`)
  skrivEndring(rot, id, semver, opprettet)
  commit(rot, `PR ${navn}`)
  git(rot, 'checkout', '-q', 'main')
}

/** Slår sammen som ChatGPT gjør: «squash», én commit på main. Kaster ved konflikt. */
function squash(rot: string, gren: string): string {
  git(rot, 'merge', '-q', '--squash', gren)
  return commit(rot, `Squash ${gren}`)
}

const stille = () => () => undefined

/** Versjonene en bygging av arbeidstreet gir, etter ID. */
function versjoner(rot: string, miljo: Record<string, string | undefined> = {}): Record<string, string> {
  const { publiserte, upubliserte } = lesEndringshistorikk(rot, miljo, stille())
  return Object.fromEntries(nummerer('1.134.4', publiserte, upubliserte).map((e) => [e.id, e.versjon]))
}

const A = '20261116-100000-aaaaaa'
const B = '20261116-090000-bbbbbb'
const C = '20261116-110000-cccccc'

/** Tre uavhengige PR-er fra samme main: B er skrevet først, C sist. */
function trePr(): string {
  const rot = lagRepo()
  pr(rot, 'a', A, 'patch', '2026-11-16T10:00:00Z')
  pr(rot, 'b', B, 'minor', '2026-11-16T09:00:00Z')
  pr(rot, 'c', C, 'major', '2026-11-16T11:00:00Z')
  return rot
}

describe('parallelle PR-er', () => {
  it('slås sammen i én rekkefølge uten konflikt, og får numrene i den rekkefølgen', () => {
    const rot = trePr()
    squash(rot, 'a')
    squash(rot, 'b')
    squash(rot, 'c')
    expect(versjoner(rot)).toEqual({ [A]: '1.134.5', [B]: '1.135.0', [C]: '2.0.0' })
  })

  it('slås sammen i en annen rekkefølge uten konflikt, uavhengig av når føringene ble skrevet', () => {
    const rot = trePr()
    squash(rot, 'c')
    squash(rot, 'a')
    squash(rot, 'b')
    // C (major) først, så A (patch) og B (minor), selv om B ble skrevet først.
    expect(versjoner(rot)).toEqual({ [C]: '2.0.0', [A]: '2.0.1', [B]: '2.1.0' })
  })

  it('gir en vanlig sammenslåingscommit (ikke squash) plassen den fikk i main', () => {
    const rot = lagRepo()
    pr(rot, 'gammel', A, 'minor', '2026-11-16T10:00:00Z')
    skrivEndring(rot, B, 'patch', '2026-11-16T12:00:00Z')
    commit(rot, 'Rett på main')
    git(rot, 'merge', '-q', '--no-ff', '-m', 'Merge gammel', 'gammel')
    expect(versjoner(rot)).toEqual({ [B]: '1.134.5', [A]: '1.135.0' })
  })
})

describe('publiserte versjoner står fast', () => {
  it('endres ikke når flere endringer kommer til, og en ny bygging av en gammel revisjon gir de samme numrene', () => {
    const rot = trePr()
    const forste = squash(rot, 'b')
    const da = versjoner(rot)
    expect(da).toEqual({ [B]: '1.135.0' })

    squash(rot, 'a')
    squash(rot, 'c')
    expect(versjoner(rot)).toMatchObject(da)

    // Bygg revisjonen fra den gang på nytt, i et eget arbeidstre.
    const gammel = join(midlertidig(), 'gammel')
    git(rot, 'worktree', 'add', '-q', '--detach', gammel, forste)
    expect(versjoner(gammel)).toEqual(da)
  })

  it('endres ikke av en commit uten endring, som en stille designjustering', () => {
    const rot = trePr()
    squash(rot, 'a')
    const for_ = versjoner(rot)
    writeFileSync(join(rot, 'stil.css'), 'a { margin: 0 }\n')
    commit(rot, 'Stille designjustering')
    expect(versjoner(rot)).toEqual(for_)
  })

  it('lar teksten i en publisert endring rettes uten at versjonen endres', () => {
    const rot = trePr()
    squash(rot, 'a')
    skrivEndring(rot, A, 'patch', '2026-11-16T10:00:00Z', 'Rettet tekst')
    commit(rot, 'Rett skrivefeil')
    const { publiserte } = lesEndringshistorikk(rot, {}, stille())
    expect(publiserte.map((p) => p.foring.sammendrag)).toEqual(['Rettet tekst'])
    expect(versjoner(rot)).toEqual({ [A]: '1.134.5' })
  })

  it('stopper når en publisert endring er slettet: en tilbakerulling føres som en ny endring', () => {
    const rot = trePr()
    squash(rot, 'a')
    squash(rot, 'b')
    unlinkSync(join(rot, ENDRINGSMAPPE, `${A}.json`))
    expect(() => versjoner(rot)).toThrow(/finnes ikke lenger.*tilbakerulling føres som en ny endring/)
    commit(rot, 'Revert a')
    expect(() => versjoner(rot)).toThrow(Versjoneringsfeil)
    expect(() => versjoner(rot)).toThrow(/slettet/)
  })

  it('stopper når leddet en publisert endring økte, er endret', () => {
    const rot = trePr()
    squash(rot, 'a')
    skrivEndring(rot, A, 'major', '2026-11-16T10:00:00Z')
    commit(rot, 'Endre leddet')
    expect(() => versjoner(rot)).toThrow(/publisert som patch, men fila sier nå major/)
  })

  it('stopper når en publisert endring skjules eller vises for alle etterpå: det ville endret numrene', () => {
    const rot = trePr()
    squash(rot, 'a')
    squash(rot, 'b')
    skrivEndring(rot, A, 'patch', '2026-11-16T10:00:00Z', `Endring ${A}`, { bareSystemarkitekter: true })
    commit(rot, 'Skjul a')
    expect(() => versjoner(rot)).toThrow(/publisert for alle, men fila sier nå bare for systemarkitektene/)
  })

  it('stopper når en føring under utprøving gjøres synlig for alle etterpå: en ny føring forteller det', () => {
    const rot = lagRepo()
    skrivEndring(rot, A, 'minor', '2026-11-16T10:00:00Z', 'Under utprøving', { bareSystemarkitekter: true })
    commit(rot, 'Utprøving')
    expect(versjoner(rot)).toEqual({ [A]: '1.134.4+utproving.1' })
    skrivEndring(rot, A, 'minor', '2026-11-16T10:00:00Z', 'Under utprøving')
    commit(rot, 'Vis a')
    expect(() => versjoner(rot)).toThrow(/publisert bare for systemarkitektene, men fila sier nå for alle.*ny føring/)
  })

  it('gir føringer under utprøving plass uten å flytte numrene til dem alle ser', () => {
    const rot = trePr()
    squash(rot, 'a')
    git(rot, 'checkout', '-q', '-b', 's', 'main')
    skrivEndring(rot, C, 'major', '2026-11-16T11:00:00Z', 'Under utprøving', { bareSystemarkitekter: true })
    commit(rot, 'PR s')
    git(rot, 'checkout', '-q', 'main')
    squash(rot, 's')
    squash(rot, 'b')
    expect(versjoner(rot)).toEqual({ [A]: '1.134.5', [C]: '1.134.5+utproving.1', [B]: '1.135.0' })
  })
})

describe('endringer som ikke er slått sammen', () => {
  it('får foreløpige numre etter de publiserte', () => {
    const rot = trePr()
    squash(rot, 'a')
    skrivEndring(rot, C, 'minor', '2026-11-16T11:00:00Z')
    const { upubliserte } = lesEndringshistorikk(rot, {}, stille())
    expect(upubliserte.map((f) => f.id)).toEqual([C])
    expect(versjoner(rot)).toEqual({ [A]: '1.134.5', [C]: '1.135.0' })
  })

  it('stopper på en ugyldig fil i stedet for å gjette', () => {
    const rot = lagRepo()
    mkdirSync(join(rot, ENDRINGSMAPPE), { recursive: true })
    writeFileSync(join(rot, ENDRINGSMAPPE, `${A}.json`), '{ "id": ')
    expect(() => versjoner(rot)).toThrow(/ikke gyldig JSON/)
    writeFileSync(join(rot, ENDRINGSMAPPE, `${A}.json`), JSON.stringify({ id: A, semver: 'patch' }))
    expect(() => versjoner(rot)).toThrow(/opprettet/)
  })
})

describe('grunne kloner og manglende historikk', () => {
  /** Et repo med tre sammenslåtte PR-er, og en bar kopi av det å hente fra. */
  function publisertRepo() {
    const rot = trePr()
    squash(rot, 'a')
    squash(rot, 'b')
    squash(rot, 'c')
    const kilde = join(midlertidig(), 'ousfar.git')
    git(rot, 'clone', '-q', '--bare', rot, kilde)
    return { rot, kilde, fasit: versjoner(rot) }
  }

  function grunnKlone(kilde: string): string {
    const klone = join(midlertidig(), 'klone')
    git(dirname(kilde), 'clone', '-q', '--depth', '1', `file://${kilde}`, klone)
    expect(git(klone, 'rev-parse', '--is-shallow-repository').trim()).toBe('true')
    return klone
  }

  it('henter hele historikken fra origin, som i GitHub Actions, og gir samme numre', () => {
    const { kilde, fasit } = publisertRepo()
    const klone = grunnKlone(kilde)
    expect(versjoner(klone)).toEqual(fasit)
    expect(git(klone, 'rev-parse', '--is-shallow-repository').trim()).toBe('false')
  })

  it('henter fra repoet byggetjenesten oppgir når klonen ikke har origin, som på Vercel', () => {
    const { kilde, fasit } = publisertRepo()
    const klone = grunnKlone(kilde)
    git(klone, 'remote', 'remove', 'origin')
    const miljo = { GITHUB_SERVER_URL: `file://${dirname(dirname(kilde))}`, GITHUB_REPOSITORY: `${dirname(kilde).split('/').pop()}/ousfar` }
    expect(versjoner(klone, miljo)).toEqual(fasit)
  })

  it('stopper med en tydelig feil når historikken ikke kan hentes', () => {
    const { kilde } = publisertRepo()
    const klone = grunnKlone(kilde)
    git(klone, 'remote', 'remove', 'origin')
    expect(() => versjoner(klone)).toThrow(/Versjonen kan ikke beregnes: Git-historikken er avkortet/)
  })

  it('stopper med en tydelig feil utenfor et Git-arbeidstre', () => {
    const mappe = midlertidig()
    expect(() => versjoner(mappe)).toThrow(/ikke et Git-arbeidstre/)
  })
})
