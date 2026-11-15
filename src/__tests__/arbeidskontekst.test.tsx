// @vitest-environment jsdom
/**
 * Arbeidskonteksten i appens lag: rettighetene den innloggede har, og det som
 * hentes for fagmiljøet fortolkningen gjelder (analyttkatalogen, reglene).
 *
 * - Et eldre svar fra `mine_rettigheter()` overskriver aldri et nyere, som
 *   rettighetene et fagmiljøbytte ga (`useKontoensSvarMedSjekk`).
 * - Å miste arbeidsfagmiljøet (som når det arkiveres) er et bytte som det
 *   andre: katalogen fra det forrige hentes ikke videre, og fortolkningen
 *   stopper til et nytt er valgt (`arbeidskontekst`).
 *
 * Databasens side prøves i `arbeidsfagmiljo.test.ts`, menyvalget i
 * `arbeidsfagmiljovalg.test.tsx`.
 */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  arbeidskontekst,
  INGEN_RETTIGHETER,
  UTEN_ARBEIDSFAGMILJO,
  useMineRettigheter,
  type Fagmiljoreferanse,
  type Rettigheter,
} from '../auth/rettigheter'
import { TOM_KATALOG, type Analyttkatalog } from '../domain/analyttkatalog'
import { katalogstopp, useHentAnalyttkatalog } from '../katalog/Analyttkatalogkilde'

const KF: Fagmiljoreferanse = { id: 'kf', nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi', standard: true, apent: true }
const RT: Fagmiljoreferanse = { id: 'rt', nokkel: 'ous-rettstoksikologi', navn: 'OUS Rettstoksikologi', standard: false, apent: true }

const iFagmiljo = (f: Fagmiljoreferanse | null, mine = [KF, RT]): Rettigheter => ({
  ...INGEN_RETTIGHETER,
  arbeidsfagmiljo: f,
  mineFagmiljoer: mine,
})

/** Et løfte testen selv avgjør. */
function utsatt<T>() {
  let los!: (v: T) => void
  const lofte = new Promise<T>((r) => (los = r))
  return { lofte, los }
}

/** En henting som gir ett utsatt svar per kall, i rekkefølge. */
function utsatteHentinger<T>() {
  const svar: ReturnType<typeof utsatt<T>>[] = []
  const hent = vi.fn(() => {
    const s = utsatt<T>()
    svar.push(s)
    return s.lofte
  })
  return { hent, svar }
}

const sjekkPaNytt = () => act(() => void window.dispatchEvent(new Event('focus')))

afterEach(cleanup)

describe('arbeidskontekst', () => {
  it('er ukjent før rettighetene er kjent, og skiller «uten fagmiljø» fra det', () => {
    expect(arbeidskontekst(iFagmiljo(KF), false)).toBeNull()
    expect(arbeidskontekst(iFagmiljo(null), false)).toBeNull()
    expect(arbeidskontekst(iFagmiljo(KF), true)).toBe('kf')
    expect(arbeidskontekst(iFagmiljo(null), true)).toBe(UTEN_ARBEIDSFAGMILJO)
  })
})

describe('rettighetene etter et bytte', () => {
  it('lar ikke en henting som startet før byttet, overskrive rettighetene byttet ga', async () => {
    const { hent, svar } = utsatteHentinger<Rettigheter>()
    const { result } = renderHook(() => useMineRettigheter('u', hent))
    expect(result.current.arbeidskontekst).toBeNull()
    await act(async () => svar[0]!.los(iFagmiljo(KF)))
    expect(result.current.arbeidskontekst).toBe('kf')

    // En vanlig sjekk starter, og blir forsinket.
    sjekkPaNytt()
    expect(hent).toHaveBeenCalledTimes(2)
    // Byttet fullføres, og svaret tas i bruk.
    act(() => result.current.oppdater(iFagmiljo(RT)))
    expect(result.current.arbeidskontekst).toBe('rt')
    // Den eldre hentingen kommer etterpå, med det gamle fagmiljøet.
    await act(async () => svar[1]!.los(iFagmiljo(KF)))
    expect(result.current.rettigheter.arbeidsfagmiljo).toEqual(RT)
  })

  it('bruker den nyeste av to hentinger, også når den eldre kommer sist', async () => {
    const { hent, svar } = utsatteHentinger<Rettigheter>()
    const { result } = renderHook(() => useMineRettigheter('u', hent))
    await act(async () => svar[0]!.los(iFagmiljo(KF)))
    sjekkPaNytt()
    sjekkPaNytt()
    expect(hent).toHaveBeenCalledTimes(3)
    await act(async () => svar[2]!.los(iFagmiljo(RT)))
    await act(async () => svar[1]!.los(iFagmiljo(KF)))
    expect(result.current.arbeidskontekst).toBe('rt')
  })
})

describe('analyttkatalogen når arbeidsfagmiljøet går tapt og et nytt velges', () => {
  it('henter forfra ved gyldig → ingen → nytt, og viser aldri den forrige katalogen imens', async () => {
    let paServeren: Fagmiljoreferanse | null = KF
    const katalogFor = (f: Fagmiljoreferanse | null): Analyttkatalog =>
      ({ ...TOM_KATALOG, fagmiljo: f, fortolkninger: f ? [{ kode: `${f.id}-analytt` }] : [] }) as unknown as Analyttkatalog
    const hentKatalog = vi.fn(async () => katalogFor(paServeren))
    const hentRettigheter = vi.fn(async () => iFagmiljo(paServeren))

    const { result } = renderHook(() => {
      const r = useMineRettigheter('u', hentRettigheter)
      return { ...r, katalog: useHentAnalyttkatalog(hentKatalog, r.arbeidskontekst) }
    })
    await waitFor(() => expect(result.current.katalog).toMatchObject({ status: 'klar', katalog: { fagmiljo: KF } }))
    await waitFor(() => expect(result.current.arbeidskontekst).toBe('kf'))
    // Den første kjente konteksten er ikke et bytte.
    expect(hentKatalog).toHaveBeenCalledTimes(1)

    // KF arkiveres: rettighetene sier nå at hen ikke arbeider i noe fagmiljø.
    paServeren = null
    act(() => result.current.oppdater(iFagmiljo(null, [RT])))
    // Den forrige katalogen er borte med en gang, og en ny hentes.
    expect(result.current.katalog.status).toBe('laster')
    await waitFor(() => expect(result.current.katalog).toMatchObject({ status: 'klar', katalog: { fagmiljo: null } }))
    expect(hentKatalog).toHaveBeenCalledTimes(2)
    const tilstand = result.current.katalog
    if (tilstand.status !== 'klar') throw new Error('katalogen er ikke klar')
    expect(tilstand.katalog.fortolkninger).toEqual([])
    expect(katalogstopp({ katalog: tilstand.katalog, feil: null })?.melding).toMatch(/ikke noe aktivt fagmiljø/)

    // Hen velger RT.
    paServeren = RT
    act(() => result.current.oppdater(iFagmiljo(RT, [RT])))
    expect(result.current.katalog.status).toBe('laster')
    await waitFor(() => expect(result.current.katalog).toMatchObject({ status: 'klar', katalog: { fagmiljo: RT } }))
    expect(hentKatalog).toHaveBeenCalledTimes(3)
  })
})
