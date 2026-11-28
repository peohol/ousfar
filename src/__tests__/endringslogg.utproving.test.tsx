// @vitest-environment jsdom
/**
 * Føringer under utprøving (`bareSystemarkitekter`, docs/endringslogg.md):
 * bare systemarkitektene ser dem, og for alle andre finnes de ikke, verken i
 * loggen, i versjonen, i varslene eller i meldingen om å oppdatere.
 *
 * Bygget har ingen slike føringer ennå, så pakken med dem byttes her ut med
 * to oppdiktede: én over den nyeste føringen og én lenger ned.
 */
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const tilstand = vi.hoisted(() => ({ systemarkitekt: false, hentet: 0 }))

vi.mock('../auth/systemrolle', () => ({ useSystemarkitekt: () => tilstand.systemarkitekt }))
vi.mock('virtual:ousfar-endringer/utproving', async () => {
  tilstand.hentet++
  const { REGISTER } = await import('virtual:ousfar-endringer')
  const utproving = (id: string, etter: string, nr: number) => ({
    id,
    versjon: `${etter}+utproving.${nr}`,
    dato: '2026-11-28',
    semver: 'minor',
    opprettet: '2026-11-28T10:00:00Z',
    sammendrag: `Utprøving ${id}`,
    typer: ['Funksjonalitet'],
    omfang: 'Mindre omfang',
    punkter: ['Bare for systemarkitektene.'],
    bareSystemarkitekter: true,
  })
  return {
    UTPROVING: [utproving('20261128-100000-aaaaaa', REGISTER[0]!.versjon, 1), utproving('20261128-090000-bbbbbb', REGISTER[12]!.versjon, 1)],
  }
})

const { ENDRINGSREGISTER, VARSLEDE_ENDRINGER, VERSJON, OFFENTLIG_LOGG, hentUtproving, loggMed } = await import('../data/endringslogg')
const { Endringslogg } = await import('../components/Endringslogg')
const { Versjonspille } = await import('../components/Versjonspille')
const { TipsLag } = await import('../components/Tips')
const { visEndringslogg } = await import('../components/endringsloggvisning')
const { registermodul, sidemodul, utprovingsmodul } = await import('../drift/endringsmoduler')
const { ENDRINGER_PER_SIDE, endringsomrader, oppdateringsversjon } = await import('../domain/versjon')

const S1 = '20261128-100000-aaaaaa'
const S2 = '20261128-090000-bbbbbb'

beforeAll(() => {
  Element.prototype.scrollIntoView ??= function () {}
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  cleanup()
  tilstand.systemarkitekt = false
})

const foringer = (lag: HTMLElement) => [...lag.querySelectorAll<HTMLElement>('.loggskuff__tittel')]

describe('loggen alle ser', () => {
  it('har ingen føring under utprøving, og versjonen og varslene er som uten dem', () => {
    expect(ENDRINGSREGISTER.some((m) => m.bareSystemarkitekter)).toBe(false)
    expect(ENDRINGSREGISTER.some((m) => m.versjon.includes('+'))).toBe(false)
    expect(VARSLEDE_ENDRINGER.some((e) => e.bareSystemarkitekter)).toBe(false)
    expect(VERSJON).toBe(ENDRINGSREGISTER[0]!.versjon)
    expect(OFFENTLIG_LOGG.register).toBe(ENDRINGSREGISTER)
  })

  it('henter aldri føringene under utprøving for en som ikke er systemarkitekt', async () => {
    render(
      <TipsLag>
        <Versjonspille />
      </TipsLag>,
    )
    act(() => visEndringslogg())
    const lag = screen.getByRole('dialog', { name: 'Endringslogg' })
    await waitFor(() => expect(foringer(lag)).toHaveLength(ENDRINGER_PER_SIDE))
    expect(tilstand.hentet).toBe(0)
    expect(within(lag).queryByText('Under utprøving')).toBeNull()
    expect(foringer(lag)[0]!.textContent).toContain(ENDRINGSREGISTER[0]!.versjon)
    // En lenke til en føring under utprøving åpner bare loggen på toppen.
    expect(OFFENTLIG_LOGG.plassI(S1)).toBeNull()
  })
})

describe('byggingen', () => {
  const offentlig = [{ id: '1.0.1', versjon: '1.0.1', dato: '2026-11-27', sammendrag: 'Vanlig', typer: ['Funksjonalitet' as const], omfang: 'Mindre omfang' as const, punkter: ['Vanlig'] }]
  const utproving = [{ ...offentlig[0]!, id: S1, versjon: '1.0.1+utproving.1', sammendrag: 'Hemmelig', bareSystemarkitekter: true as const }]

  it('legger føringene under utprøving bare i sin egen pakke', () => {
    expect(registermodul(offentlig)).not.toContain('Hemmelig')
    expect(sidemodul(offentlig, 0)).not.toContain('Hemmelig')
    expect(utprovingsmodul(utproving)).toContain('Hemmelig')
    expect(() => utprovingsmodul(offentlig)).toThrow(/bare systemarkitektene/)
  })

  it('lar versjonen, meldingen om å oppdatere og sidene i versjon.json være som uten dem', () => {
    const begge = [...utproving, ...offentlig]
    expect(oppdateringsversjon(begge)).toBe('1.0.1')
    expect(endringsomrader(begge)).toEqual(endringsomrader(offentlig))
  })
})

describe('loggen systemarkitektene ser', () => {
  it('har føringene under utprøving der de hører hjemme, hele og uten hull', async () => {
    const logg = loggMed(await hentUtproving())
    expect(logg.register).toHaveLength(ENDRINGSREGISTER.length + 2)
    expect(logg.register[0]!.id).toBe(S1)
    expect(logg.register[1]).toBe(ENDRINGSREGISTER[0])
    expect(logg.plassI(S2)).toBe(12 + 1)
    expect(logg.register[14]).toBe(ENDRINGSREGISTER[12])
    const hentet = await logg.hent(20)
    expect(hentet).toHaveLength(20)
    expect(hentet.map((e) => e.id)).toEqual(logg.register.slice(0, 20).map((m) => m.id))
    expect(logg.hentede(20)).toEqual(hentet)
    expect(logg.finn(S1)!.bareSystemarkitekter).toBe(true)
    // Samme føringer gir samme logg, så visningen ikke hentes på nytt.
    expect(loggMed(await hentUtproving())).toBe(logg)
  })

  it('merker dem «Under utprøving» i vinduet', async () => {
    const logg = loggMed(await hentUtproving())
    render(<Endringslogg apen logg={logg} onLukk={() => {}} />)
    const lag = screen.getByRole('dialog', { name: 'Endringslogg' })
    await waitFor(() => expect(foringer(lag)).toHaveLength(ENDRINGER_PER_SIDE))
    expect(within(lag).getAllByText('Under utprøving')).toHaveLength(1)
    expect(foringer(lag)[0]!.textContent).toContain(`${ENDRINGSREGISTER[0]!.versjon}+utproving.1`)
    expect(foringer(lag)[1]!.textContent).toContain(ENDRINGSREGISTER[0]!.versjon)
  })

  it('hentes for en systemarkitekt fra versjonspillen, og loggen kan åpnes på en av dem', async () => {
    tilstand.systemarkitekt = true
    render(
      <TipsLag>
        <Versjonspille />
      </TipsLag>,
    )
    // Versjonen er den alle ser, også for systemarkitektene.
    expect(screen.getByRole('button', { name: `Versjon ${VERSJON} – vis endringslogg` })).toBeTruthy()
    await waitFor(() => expect(tilstand.hentet).toBe(1))
    act(() => visEndringslogg(S2))
    const lag = screen.getByRole('dialog', { name: 'Endringslogg' })
    await waitFor(() => expect(lag.querySelector(`[data-versjon="${ENDRINGSREGISTER[12]!.versjon}+utproving.1"] .loggskuff__tittel`)?.getAttribute('aria-expanded')).toBe('true'))
    expect(within(lag).getAllByText('Under utprøving')).toHaveLength(2)
  })
})
