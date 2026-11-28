// @vitest-environment jsdom
/**
 * Koden som hentes når den trengs (`src/oppdatering/senere.ts`): sidene og
 * vinduene i appen, og appen selv bak porten, som hentes mens profilen slås
 * opp (`docs/ytelse-synlig-innlasting.md`, P1).
 */
import { Component, Suspense, type ReactNode } from 'react'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { NarApnet } from '../components/Senere'
import { Lastefeil } from '../oppdatering/nylasting'
import { senere } from '../oppdatering/senere'

// Økten porten leser, og appen bak den, som teller hvor mange ganger den hentes.
const okt = vi.hoisted(() => ({ tilgang: 'venter', harOkt: false, hentet: 0 }))
vi.mock('../auth/okt', () => ({
  useOkt: () => ({ tilgang: okt.tilgang, harOkt: okt.harOkt, profil: null, mangler: false }),
}))
vi.mock('../App', () => {
  okt.hentet += 1
  return { default: () => <p>Appen</p> }
})

afterEach(cleanup)

/** Fanger feilen, som feilgrensen foran appen. */
class Grense extends Component<{ children: ReactNode }, { feil: unknown }> {
  override state = { feil: null as unknown }
  static getDerivedStateFromError(feil: unknown) {
    return { feil }
  }
  override render() {
    return this.state.feil ? <p>{this.state.feil instanceof Lastefeil ? 'lastefeil' : 'annen feil'}</p> : this.props.children
  }
}

const modul = () => ({ Side: ({ tekst }: { tekst: string }) => <p>{tekst}</p> })

describe('senere', () => {
  it('henter koden første gang komponenten vises, og bare én gang når den er forhåndslastet', async () => {
    const hent = vi.fn(async () => modul())
    const Side = senere(hent, 'Side')
    expect(hent).not.toHaveBeenCalled()
    Side.forhandslast()
    Side.forhandslast()
    render(
      <Suspense fallback={<p>laster</p>}>
        <Side tekst="Siden" />
      </Suspense>,
    )
    expect(await screen.findByText('Siden')).toBeTruthy()
    expect(hent).toHaveBeenCalledTimes(1)
  })

  it('vises med en gang, uten ventefeltet, når koden alt er hentet', async () => {
    const Side = senere(async () => modul(), 'Side')
    await Side.forhandslast()
    render(
      <Suspense fallback={<p>laster</p>}>
        <Side tekst="Med en gang" />
      </Suspense>,
    )
    expect(screen.getByText('Med en gang')).toBeTruthy()
    expect(screen.queryByText('laster')).toBeNull()
  })

  it('gir en lastefeil når koden ikke kan hentes, så appen lastes på nytt i stedet for å stå tom', async () => {
    const hent = vi.fn(async () => Promise.reject<ReturnType<typeof modul>>(new Error('404')))
    const Side = senere(hent, 'Side')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const vis = () =>
      render(
        <Grense>
          <Suspense fallback={<p>laster</p>}>
            <Side tekst="Siden" />
          </Suspense>
        </Grense>,
      )
    // Flere ganger etter hverandre: løkken viste seg først etter en tidligere visning.
    for (let gang = 0; gang < 3; gang++) {
      hent.mockClear()
      vis()
      expect(await screen.findByText('lastefeil')).toBeTruthy()
      // React prøver en feilet visning på nytt med en gang; den får samme feil i stedet for å hente igjen.
      expect(hent.mock.calls.length).toBeLessThanOrEqual(2)
      await act(async () => {})
      expect(hent.mock.calls.length).toBeLessThanOrEqual(2)
      cleanup()
    }
    vi.restoreAllMocks()
  })

  it('henter koden på nytt ved neste visning etter en lastefeil', async () => {
    const hent = vi.fn().mockRejectedValueOnce(new Error('404')).mockResolvedValue(modul())
    const Side = senere(hent as () => Promise<ReturnType<typeof modul>>, 'Side')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const vis = () =>
      render(
        <Grense>
          <Suspense fallback={<p>laster</p>}>
            <Side tekst="Andre forsøk" />
          </Suspense>
        </Grense>,
      )
    vis()
    expect(await screen.findByText('lastefeil')).toBeTruthy()
    // Feilen glemmes når React har gitt den videre: neste visning henter koden på nytt.
    await act(() => new Promise((ferdig) => setTimeout(ferdig, 0)))
    cleanup()
    vis()
    expect(await screen.findByText('Andre forsøk')).toBeTruthy()
    expect(hent).toHaveBeenCalledTimes(2)
    vi.restoreAllMocks()
  })

  it('husker ikke en forhåndslasting som feilet: neste forsøk henter på nytt', async () => {
    const hent = vi.fn().mockRejectedValueOnce(new Error('nett nede')).mockResolvedValue(modul())
    const Side = senere(hent as () => Promise<ReturnType<typeof modul>>, 'Side')
    // Forhåndslastingen holdes også når hentingen feiler, så den kan ventes på uten å feile.
    await expect(Side.forhandslast()).resolves.toBeUndefined()
    expect(hent).toHaveBeenCalledTimes(1)
    render(
      <Suspense fallback={<p>laster</p>}>
        <Side tekst="Andre gang" />
      </Suspense>,
    )
    expect(await screen.findByText('Andre gang')).toBeTruthy()
    expect(hent).toHaveBeenCalledTimes(2)
  })
})

describe('NarApnet', () => {
  it('viser ingenting før vinduet åpnes, og lar det stå etter at det er lukket', () => {
    const { rerender } = render(<NarApnet apen={false}>vinduet</NarApnet>)
    expect(screen.queryByText('vinduet')).toBeNull()
    rerender(<NarApnet apen>vinduet</NarApnet>)
    expect(screen.getByText('vinduet')).toBeTruthy()
    rerender(<NarApnet apen={false}>vinduet</NarApnet>)
    expect(screen.getByText('vinduet')).toBeTruthy()
  })
})

describe('porten', () => {
  it('henter appen mens profilen slås opp når det finnes en økt, men viser den ikke før tilgangen er avklart', async () => {
    const { Port } = await import('../components/konto/Port')
    // Uten økt: innloggingssiden, og ingenting av appen hentes.
    okt.tilgang = 'innlogging'
    const { rerender } = render(<Port />)
    await act(async () => {})
    expect(okt.hentet).toBe(0)
    // Økten står, profilen hentes: koden hentes, men ingenting vises.
    okt.tilgang = 'venter'
    okt.harOkt = true
    rerender(<Port />)
    await waitFor(() => expect(okt.hentet).toBe(1))
    expect(screen.queryByText('Appen')).toBeNull()
    // Tilgangen er avklart: appen vises med koden som alt er hentet.
    okt.tilgang = 'app'
    rerender(<Port />)
    expect(await screen.findByText('Appen')).toBeTruthy()
    expect(okt.hentet).toBe(1)
  })
})
