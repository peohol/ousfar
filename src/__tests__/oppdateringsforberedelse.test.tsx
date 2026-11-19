// @vitest-environment jsdom
/**
 * «Oppdater nå» skal føre brukeren tilbake til siden hen var på, ikke til
 * «Fikk ikke hentet appen» (Issue #496):
 *
 * - Før siden lastes på nytt, hentes den nye kliniske delen, og økten fornyes
 *   når veggen avviser den (`forberedelse.ts`). Lar den seg ikke hente, blir
 *   den gamle versjonen stående.
 * - Lot appen seg likevel ikke hente ved oppstarten, lastes siden på nytt av
 *   seg selv én gang, med det brukeren holdt på med i behold (`nylasting.ts`).
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Oppdateringsmelding } from '../components/Oppdateringsmelding'
import { Hentefeil } from '../components/konto/Port'
import { LAGRINGSNOKKEL, glemBildet, gjenopprettRulling, oppdaterOgTaVare } from '../oppdatering/bevaring'
import { forbered, KLAR_I, lagKlargjoring, PAUSER, type Klargjoring } from '../oppdatering/forberedelse'
import { IKKE_OFTERE_ENN, kanLastePaNytt, Lastefeil, lastPaNytt, NYLASTINGSNOKKEL } from '../oppdatering/nylasting'
import { hentUtlagtBygg, type Byggopplysninger } from '../oppdatering/versjon'

const BYGG: Byggopplysninger = { bygg: 'nytt', versjon: '9.9.9', klinisk: 'assets/klinisk-abc.js' }

/** Kanten, med ett svar per forespørsel: en statuskode, eller `'nett'` for et nett som faller ut. */
function kant(svar: Array<number | 'nett'>) {
  const hent = vi.fn(async (_adresse: URL | RequestInfo, _valg?: RequestInit) => {
    const neste = svar[Math.min(hent.mock.calls.length - 1, svar.length - 1)]
    if (neste === 'nett') throw new TypeError('Failed to fetch')
    return new Response(neste === 200 ? 'export {}' : null, { status: neste })
  })
  return hent
}

const utenVenting = { vent: async () => undefined }

beforeEach(() => {
  sessionStorage.clear()
  glemBildet()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('å gjøre den nye versjonen klar', () => {
  it('henter den nye kliniske delen, med informasjonskapselen og forbi mellomlageret', async () => {
    const hent = kant([200])
    expect(await forbered(BYGG, { hent, harOkt: async () => true, ...utenVenting })).toBe(true)
    expect(hent).toHaveBeenCalledOnce()
    const [adresse, valg] = hent.mock.calls[0] ?? []
    expect(String(adresse)).toMatch(/\/assets\/klinisk-abc\.js$/)
    expect(valg).toMatchObject({ credentials: 'same-origin', cache: 'no-cache' })
  })

  it('fornyer økten og prøver igjen når veggen avviser den', async () => {
    const hent = kant([401, 200])
    const fornyOkt = vi.fn(async () => undefined)
    expect(await forbered(BYGG, { hent, harOkt: async () => true, fornyOkt, ...utenVenting })).toBe(true)
    expect(fornyOkt).toHaveBeenCalledOnce()
    expect(hent).toHaveBeenCalledTimes(2)
  })

  it('prøver igjen når nettet faller ut, og gir opp etter noen forsøk', async () => {
    expect(await forbered(BYGG, { hent: kant(['nett', 'nett', 200]), harOkt: async () => true, ...utenVenting })).toBe(true)
    const hent = kant(['nett'])
    expect(await forbered(BYGG, { hent, harOkt: async () => true, ...utenVenting })).toBe(false)
    expect(hent).toHaveBeenCalledTimes(PAUSER.length)
  })

  it('tar i bruk et enda nyere bygg når fila alt er byttet ut', async () => {
    expect(await forbered(BYGG, { hent: kant([404]), harOkt: async () => true, ...utenVenting })).toBe(true)
  })

  it('sjekker ingenting for et bygg uten stien, eller for den som ikke er logget inn', async () => {
    const hent = kant([500])
    expect(await forbered({ bygg: 'gammelt', versjon: '1.0.0' }, { hent, harOkt: async () => true })).toBe(true)
    expect(await forbered(BYGG, { hent, harOkt: async () => false })).toBe(true)
    expect(hent).not.toHaveBeenCalled()
  })

  it('deles mellom meldingen og oppdateringen i stillhet, og prøves på nytt etter en feil', async () => {
    let tid = 0
    const hent = kant(['nett', 'nett', 'nett', 'nett', 200])
    const klargjoring = lagKlargjoring({ hent, harOkt: async () => true, ...utenVenting }, () => tid)
    expect(klargjoring.klar(BYGG)).toBe(false)
    const forste = klargjoring.start(BYGG)
    expect(klargjoring.start(BYGG)).toBe(forste)
    expect(await forste).toBe(false)
    expect(klargjoring.klar(BYGG)).toBe(false)

    expect(await klargjoring.start(BYGG)).toBe(true)
    expect(klargjoring.klar(BYGG)).toBe(true)
    // Etter en stund sjekkes det på nytt.
    tid = KLAR_I + 1
    expect(klargjoring.klar(BYGG)).toBe(false)
    // Et bygg uten stien kan alltid tas i bruk med én gang.
    expect(klargjoring.klar({ bygg: 'gammelt', versjon: '1.0.0' })).toBe(true)
  })

  it('leses fra versjonsfila bare når det er en bygd fil ved siden av index.html', async () => {
    const svar = (klinisk: unknown) => async () => Response.json({ bygg: 'b', versjon: '1.0.0', klinisk })
    expect((await hentUtlagtBygg(svar('assets/klinisk-AbC_1.js')))?.klinisk).toBe('assets/klinisk-AbC_1.js')
    for (const ugyldig of ['https://annen.no/x.js', '../x.js', 'assets/../x.js', '/assets/x.js', 3]) {
      const bygg = await hentUtlagtBygg(svar(ugyldig))
      expect(bygg).toEqual({ bygg: 'b', versjon: '1.0.0' })
    }
  })
})

describe('«Oppdater nå»', () => {
  /** En klargjøring som svarer det testen bestemmer. */
  function styrt(svar: boolean[]): Klargjoring & { start: ReturnType<typeof vi.fn> } {
    let klar = false
    const start = vi.fn(async () => (klar = svar.shift() ?? klar))
    return { start, klar: () => klar }
  }

  it('laster siden på nytt først når den nye versjonen er hentet', async () => {
    const oppdater = vi.fn()
    const klargjoring = styrt([true])
    render(<Oppdateringsmelding aktiv hent={async () => BYGG} oppdater={oppdater} klargjoring={klargjoring} />)
    const melding = await screen.findByRole('alert')
    await userEvent.click(within(melding).getByRole('button', { name: 'Oppdater nå' }))
    await waitFor(() => expect(oppdater).toHaveBeenCalledOnce())
  })

  it('blir stående med den gamle versjonen når den nye ikke lar seg hente, og lar brukeren prøve igjen', async () => {
    const oppdater = vi.fn()
    // Sjekken som begynner når versjonen er funnet, og det første trykket, feiler.
    const klargjoring = styrt([false, false, true])
    render(<Oppdateringsmelding aktiv hent={async () => BYGG} oppdater={oppdater} klargjoring={klargjoring} />)
    const melding = await screen.findByRole('alert')
    await waitFor(() => expect(klargjoring.start).toHaveBeenCalledOnce())

    await userEvent.click(within(melding).getByRole('button', { name: 'Oppdater nå' }))
    expect(await within(melding).findByRole('button', { name: 'Prøv igjen' })).toBeTruthy()
    expect(melding.textContent).toContain('Fikk ikke hentet den')
    expect(oppdater).not.toHaveBeenCalled()

    await userEvent.click(within(melding).getByRole('button', { name: 'Prøv igjen' }))
    await waitFor(() => expect(oppdater).toHaveBeenCalledOnce())
  })
})

describe('når appen ikke lot seg hente ved oppstarten', () => {
  function Feiler({ feil }: { feil: unknown }): never {
    throw feil
  }

  // React melder feilen som fanges, også til vinduet; den er ventet her.
  const stille = (hendelse: ErrorEvent) => hendelse.preventDefault()
  beforeEach(() => {
    window.addEventListener('error', stille)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })
  afterEach(() => {
    window.removeEventListener('error', stille)
    vi.restoreAllMocks()
  })

  it('lastes på nytt av seg selv, uten kortet, første gang', async () => {
    const provPaNytt = vi.fn(async () => undefined)
    const feil = new Lastefeil(new TypeError('Failed to fetch dynamically imported module'))
    const { container } = render(
      <Hentefeil kanProve={() => true} provPaNytt={provPaNytt}>
        <Feiler feil={feil} />
      </Hentefeil>,
    )
    await waitFor(() => expect(provPaNytt).toHaveBeenCalledWith(feil))
    expect(screen.queryByText('Fikk ikke hentet appen')).toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })

  it('viser kortet når den alt er lastet på nytt like før', async () => {
    const provPaNytt = vi.fn(async () => undefined)
    render(
      <Hentefeil kanProve={() => false} provPaNytt={provPaNytt}>
        <Feiler feil={new Lastefeil(new Error())} />
      </Hentefeil>,
    )
    expect(await screen.findByText('Fikk ikke hentet appen')).toBeTruthy()
    expect(provPaNytt).not.toHaveBeenCalled()
  })

  it('fornyer økten, legger tilbake det brukeren holdt på med, og går aldri i ring', async () => {
    oppdaterOgTaVare(vi.fn())
    const bilde = sessionStorage.getItem(LAGRINGSNOKKEL)
    expect(bilde).not.toBeNull()
    // Den nye versjonen begynner å lese bildet før appen har latt seg hente.
    gjenopprettRulling(null)()
    expect(sessionStorage.getItem(LAGRINGSNOKKEL)).toBeNull()

    const fornyOkt = vi.fn(async () => undefined)
    const lastInn = vi.fn()
    expect(kanLastePaNytt()).toBe(true)
    await lastPaNytt(new Lastefeil(new Error()), { fornyOkt, lastInn, naa: () => 1_000, ...utenVenting })
    expect(fornyOkt).toHaveBeenCalledOnce()
    expect(lastInn).toHaveBeenCalledOnce()
    expect(sessionStorage.getItem(LAGRINGSNOKKEL)).toBe(bilde)
    expect(sessionStorage.getItem(NYLASTINGSNOKKEL)).toBe('1000')

    expect(kanLastePaNytt(1_000 + IKKE_OFTERE_ENN - 1)).toBe(false)
    expect(kanLastePaNytt(1_000 + IKKE_OFTERE_ENN + 1)).toBe(true)
  })

  it('kaster det som ble tatt vare på, når appen feilet mens den ble tegnet opp', async () => {
    oppdaterOgTaVare(vi.fn())
    await lastPaNytt(new Error('feil i tegningen'), { fornyOkt: async () => undefined, lastInn: vi.fn(), ...utenVenting })
    expect(sessionStorage.getItem(LAGRINGSNOKKEL)).toBeNull()
  })

  it('laster ikke på nytt av seg selv når fanen ikke kan huske at den gjorde det', () => {
    const setItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('ingen lagring')
    })
    expect(kanLastePaNytt()).toBe(false)
    setItem.mockRestore()
  })
})
