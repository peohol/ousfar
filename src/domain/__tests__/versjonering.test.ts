/**
 * Versjonsnumrene som beregnes fra endringene med egen fil
 * (`src/domain/versjonering.ts`). Rekkefølgen fra Git prøves med ekte
 * repoer i `src/__tests__/endringshistorikk.test.ts`; her er den gitt.
 */
import { describe, expect, it } from 'vitest'
import {
  ENDRINGS_ID,
  finnEndring,
  lagEndringsId,
  lesEndringsforing,
  nesteVersjon,
  nummerer,
  oslodato,
  settSammen,
  startversjon,
  type Endringsforing,
  type Publisering,
} from '../versjonering'
import type { HistoriskEndring, Semverniva } from '../versjon'

const foring = (id: string, semver: Semverniva, opprettet = '2026-11-16T10:00:00Z', ekstra: Partial<Endringsforing> = {}): Endringsforing => ({
  id,
  semver,
  opprettet,
  sammendrag: `Endring ${id}`,
  typer: ['Funksjonalitet'],
  omfang: 'Mindre omfang',
  punkter: ['Endret'],
  ...ekstra,
})

let commitnr = 0
/** Endringen slått sammen som commit nummer `rekkefolge` i `main`. */
const publisert = (f: Endringsforing, rekkefolge: number, tidspunkt = '2026-11-16T12:00:00+01:00'): Publisering => ({
  foring: f,
  semver: f.semver,
  commit: `c${rekkefolge}-${commitnr++}`,
  tidspunkt,
  rekkefolge,
})

const versjoner = (logg: readonly { id: string; versjon: string }[]) => Object.fromEntries(logg.map((e) => [e.id, e.versjon]))

describe('nesteVersjon', () => {
  it('øker riktig ledd og nullstiller leddene til høyre', () => {
    expect(nesteVersjon('1.134.4', 'patch')).toBe('1.134.5')
    expect(nesteVersjon('1.134.4', 'minor')).toBe('1.135.0')
    expect(nesteVersjon('1.134.4', 'major')).toBe('2.0.0')
  })

  it('leser leddene som tall', () => {
    expect(nesteVersjon('0.9.9', 'patch')).toBe('0.9.10')
    expect(nesteVersjon('0.9.9', 'minor')).toBe('0.10.0')
  })

  it('nekter et versjonsnummer som ikke er MAJOR.MINOR.PATCH', () => {
    expect(() => nesteVersjon('1.2', 'patch')).toThrow()
  })
})

describe('nummerer', () => {
  it('gir en PATCH, så en MINOR og så en MAJOR riktige numre, med leddene nullstilt', () => {
    const logg = nummerer('1.134.4', [
      publisert(foring('20261116-100000-aaaaaa', 'patch'), 0),
      publisert(foring('20261116-100000-bbbbbb', 'minor'), 1),
      publisert(foring('20261116-100000-cccccc', 'major'), 2),
      publisert(foring('20261116-100000-dddddd', 'patch'), 3),
    ])
    expect(logg.map((e) => e.versjon)).toEqual(['2.0.1', '2.0.0', '1.135.0', '1.134.5'])
    expect(logg.map((e) => e.semver)).toEqual(['patch', 'major', 'minor', 'patch'])
  })

  it('følger rekkefølgen i main, ikke når føringene ble skrevet eller hva de heter', () => {
    // Den sist skrevne og alfabetisk første ble slått sammen først.
    const a = foring('20261116-120000-000000', 'minor', '2026-11-16T12:00:00Z')
    const b = foring('20261110-080000-ffffff', 'patch', '2026-11-10T08:00:00Z')
    const logg = nummerer('1.0.0', [publisert(b, 1), publisert(a, 0)])
    expect(versjoner(logg)).toEqual({ [a.id]: '1.1.0', [b.id]: '1.1.1' })
    expect(logg[0]!.id).toBe(b.id)
  })

  it('ordner endringer i samme commit etter når de ble skrevet, og så etter ID, også med samme tidspunkt', () => {
    const tid = '2026-11-16T10:00:00Z'
    const tidlig = foring('20261116-090000-ffffff', 'patch', '2026-11-16T09:00:00Z')
    const x = foring('20261116-100000-bbbbbb', 'patch', tid)
    const y = foring('20261116-100000-aaaaaa', 'minor', tid)
    const p = (f: Endringsforing) => ({ ...publisert(f, 4), commit: 'samme' })
    const logg = nummerer('1.0.0', [p(x), p(y), p(tidlig)])
    expect(versjoner(logg)).toEqual({ [tidlig.id]: '1.0.1', [y.id]: '1.1.0', [x.id]: '1.1.1' })
    // Samme svar uansett rekkefølgen de ble lest i.
    expect(nummerer('1.0.0', [p(tidlig), p(y), p(x)])).toEqual(logg)
  })

  it('endrer aldri numrene til de tidligere når flere endringer kommer til', () => {
    const forst = [publisert(foring('20261116-100000-aaaaaa', 'patch'), 0), publisert(foring('20261116-100000-bbbbbb', 'minor'), 1)]
    const for_ = versjoner(nummerer('1.134.4', forst))
    const senere = nummerer('1.134.4', [...forst, publisert(foring('20261116-100000-cccccc', 'major'), 2), publisert(foring('20261101-100000-dddddd', 'patch'), 3)])
    expect(versjoner(senere)).toMatchObject(for_)
  })

  it('bruker leddet endringen hadde da den ble publisert', () => {
    const f = foring('20261116-100000-aaaaaa', 'patch')
    const logg = nummerer('1.0.0', [{ ...publisert(f, 0), semver: 'minor' }])
    expect(logg[0]).toMatchObject({ versjon: '1.1.0', semver: 'minor' })
  })

  it('gir datoen i Norge for commiten som tok den inn i main', () => {
    const logg = nummerer('1.0.0', [publisert(foring('20261116-100000-aaaaaa', 'patch', '2026-11-10T10:00:00Z'), 0, '2026-11-16T23:30:00Z')])
    expect(logg[0]).toMatchObject({ dato: '2026-11-17', opprettet: '2026-11-10T10:00:00Z' })
  })

  it('setter endringer som ikke er slått sammen ennå, sist og merker dem foreløpige', () => {
    const logg = nummerer(
      '1.0.0',
      [publisert(foring('20261116-100000-aaaaaa', 'patch'), 0)],
      [foring('20261117-100000-cccccc', 'patch', '2026-11-17T10:00:00Z'), foring('20261116-090000-bbbbbb', 'minor', '2026-11-16T09:00:00Z')],
    )
    expect(logg.map((e) => [e.id, e.versjon, e.forelopig ?? false])).toEqual([
      ['20261117-100000-cccccc', '1.1.1', true],
      ['20261116-090000-bbbbbb', '1.1.0', true],
      ['20261116-100000-aaaaaa', '1.0.1', false],
    ])
  })

  it('gir ingen nye versjoner uten nye endringer, som etter en stille designjustering', () => {
    expect(nummerer('1.134.4', [])).toEqual([])
  })
})

describe('arkivet og de nye endringene sammen', () => {
  const historiske: HistoriskEndring[] = [
    { versjon: '1.134.4', dato: '2026-11-16', sammendrag: 'Gammel', typer: ['Fag'], omfang: 'Mindre omfang', punkter: ['x'], utenVarsel: true },
    { versjon: '1.134.3', dato: '2026-11-15', sammendrag: 'Eldre', typer: ['Fag'], omfang: 'Mindre omfang', punkter: ['x'] },
  ]

  it('fortsetter fra den øverste versjonen i arkivet, og står nyest først med arkivet urørt under', () => {
    const start = startversjon(historiske)
    expect(start).toBe('1.134.4')
    const logg = settSammen(nummerer(start, [publisert(foring('20261116-100000-aaaaaa', 'minor'), 0)]), historiske)
    expect(logg.map((e) => [e.id, e.versjon])).toEqual([
      ['20261116-100000-aaaaaa', '1.135.0'],
      ['1.134.4', '1.134.4'],
      ['1.134.3', '1.134.3'],
    ])
    expect(logg.slice(1)).toEqual(historiske.map((h) => ({ id: h.versjon, ...h })))
    expect(() => startversjon([])).toThrow()
  })

  it('finner en føring med ID-en eller versjonen, som oppgaver og lenker viser til', () => {
    const logg = settSammen(nummerer('1.134.4', [publisert(foring('20261116-100000-aaaaaa', 'patch'), 0)]), historiske)
    expect(finnEndring(logg, '20261116-100000-aaaaaa')?.versjon).toBe('1.134.5')
    expect(finnEndring(logg, '1.134.5')?.id).toBe('20261116-100000-aaaaaa')
    expect(finnEndring(logg, '1.134.3')?.sammendrag).toBe('Eldre')
    expect(finnEndring(logg, '99.0.0')).toBeUndefined()
    expect(finnEndring(logg, null)).toBeUndefined()
  })
})

describe('ID-en', () => {
  it('er tidspunktet i UTC og seks tilfeldige tegn', () => {
    const id = lagEndringsId(new Date('2026-11-16T09:48:49.123Z'), '3170df')
    expect(id).toBe('20261116-094849-3170df')
    expect(ENDRINGS_ID.test(id)).toBe(true)
    expect(() => lagEndringsId(new Date(), 'xyz')).toThrow()
  })

  it('kan ikke forveksles med en versjon', () => {
    expect(ENDRINGS_ID.test('1.134.4')).toBe(false)
  })
})

describe('oslodato', () => {
  it('følger norsk tid, også over sommertid', () => {
    expect(oslodato('2026-11-16T22:59:59Z')).toBe('2026-11-16')
    expect(oslodato('2026-11-16T23:00:00Z')).toBe('2026-11-17')
    expect(oslodato('2026-07-01T22:00:00Z')).toBe('2026-07-02')
    expect(oslodato('2026-11-17T00:30:00+01:00')).toBe('2026-11-17')
  })
})

describe('lesEndringsforing', () => {
  const gyldig = { ...foring('20261116-100000-aaaaaa', 'patch'), gjelder: ['stoff'], utenVarsel: true }
  const les = (endring: Record<string, unknown>) => () => lesEndringsforing(endring, '20261116-100000-aaaaaa')

  it('godtar en fullstendig føring', () => {
    expect(les(gyldig)()).toEqual(gyldig)
  })

  it.each([
    ['et versjonsnummer', { versjon: '1.2.3' }, /ukjente felt: versjon/],
    ['et feilstavet merke', { utenvarsel: true }, /ukjente felt: utenvarsel/],
    ['en ID ulik filnavnet', { id: '20261116-100000-bbbbbb' }, /lik filnavnet/],
    ['en ID på feil form', { id: '1.2.3' }, /formen/],
    ['et ukjent ledd', { semver: 'stor' }, /semver/],
    ['et tidspunkt uten tidssone', { opprettet: '2026-11-16T10:00:00' }, /opprettet/],
    ['et tomt sammendrag', { sammendrag: ' ' }, /sammendrag/],
    ['ingen typer', { typer: [] }, /typer/],
    ['en ukjent type', { typer: ['Annet'] }, /typer/],
    ['et ukjent omfang', { omfang: 'Stort' }, /omfang/],
    ['et tomt punkt', { punkter: [''] }, /punkter/],
    ['en tom liste med sider', { gjelder: [] }, /gjelder/],
    ['et merke som er false', { utenVarsel: false }, /utenVarsel/],
  ])('nekter %s', (_hva, endring, feil) => {
    expect(les({ ...gyldig, ...endring })).toThrow(feil)
  })

  it('nekter malen fra `npm run endring` til tekstene er fylt ut', () => {
    const mal = { id: '20261116-100000-aaaaaa', semver: 'patch', opprettet: '2026-11-16T10:00:00Z', sammendrag: '', typer: [], omfang: 'Mindre omfang', gjelder: [], punkter: [''] }
    expect(les(mal)).toThrow(/sammendrag/)
  })
})
