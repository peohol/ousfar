// @vitest-environment jsdom
/**
 * Hva appen henter når den åpnes og når fagmiljøet fortolkningen gjelder,
 * byttes (#504):
 *
 * - Det som følger kontoen (stoffregisteret, favorittene, autoerstatt), hentes
 *   én gang og ikke på nytt ved et bytte. Arbeidsflaten for fagmiljøet settes
 *   opp på nytt med den nye katalogen.
 * - Fortolkningsreglene hentes én gang per fagmiljø: ikke også for det nye
 *   fagmiljøet i arbeidsflaten som ennå viser det gamle.
 *
 * Innloggingen og databasen er erstattet; jsdom har ikke `requestIdleCallback`,
 * så «ledig» (fagsøket, autoerstatt) er et sekund etter at appen er vist
 * (`useNaarLedig`).
 */
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const databasen = vi.hoisted(() => ({
  kall: [] as string[],
  fagmiljo: 'kf' as 'kf' | 'rt',
}))

vi.mock('../auth/okt', () => ({
  useProfil: () => ({ id: 'leser', role: 'user', first_name: 'Lars', last_name: 'Leser', username: 'leser' }),
}))
vi.mock('../auth/klient', async () => {
  const { DAGENS_REGELSETT, publiserteRader } = await import('./hjelp/dagensregler')
  const { scenarioregeldata } = await import('./hjelp/etggrunnlag')
  const { OUS_KATALOGSVAR } = await import('./hjelp/ouskatalogkilde')
  const { thcRegelsettutgave } = await import('./hjelp/thcgrunnlag')
  const vanlige = publiserteRader(DAGENS_REGELSETT)
  const thc = thcRegelsettutgave()
  const fagmiljoer = {
    kf: { id: 'kf', nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi' },
    rt: { id: 'rt', nokkel: 'ous-rettstoksikologi', navn: 'OUS Rettstoksikologi' },
  }
  const rader: Record<string, unknown> = {
    ...vanlige,
    les_kommentarer: [...vanlige.les_kommentarer, ...thc.kommentarer],
    les_thc_regelsett: thc.regelsett,
    les_scenarioregler: scenarioregeldata(),
    les_stoffregister: { kategorier: [], plasseringer: [], status: [], sider: [] },
    les_stoffavoritter: [],
  }
  /** En spørring mot en tabell: hvert ledd gir seg selv, og svaret er tomt. */
  const sporring = (): unknown =>
    new Proxy(
      {},
      {
        get: (_, ledd) =>
          ledd === 'then'
            ? (videre: (svar: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(videre)
            : () => sporring(),
      },
    )
  return {
    klient: () => ({
      rpc: async (funksjon: string) => {
        databasen.kall.push(funksjon)
        const fagmiljo = fagmiljoer[databasen.fagmiljo]
        if (funksjon === 'mine_rettigheter') {
          const mine = Object.values(fagmiljoer)
          return { data: { arbeidsfagmiljo: fagmiljo, mine_fagmiljoer: mine }, error: null }
        }
        if (funksjon === 'les_analyttkatalog') {
          return { data: { ...OUS_KATALOGSVAR, fagmiljo: { id: fagmiljo.id, navn: fagmiljo.navn } }, error: null }
        }
        return { data: rader[funksjon] ?? null, error: null }
      },
      from: (tabell: string) => {
        databasen.kall.push(`from:${tabell}`)
        return sporring()
      },
    }),
  }
})
vi.mock('../components/konto/Kontomeny', () => ({ Kontomeny: () => null }))

const { default: App } = await import('../App')
await (await import('./hjelp/sidekode')).hentSidene()
const { TipsLag } = await import('../components/Tips')
const { ShortcutVisibilityProvider } = await import('../hooks/useShortcutVisibility')

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= function () {}
  window.scrollTo = () => {}
})

beforeEach(() => {
  window.location.hash = ''
  databasen.kall = []
  databasen.fagmiljo = 'kf'
})

afterEach(cleanup)

const antall = (kall: string) => databasen.kall.filter((k) => k === kall).length
/** Kallene som henter fortolkningsreglene. */
const REGLENE = ['les_intervallregelsett', 'les_kommentarer', 'les_thc_regelsett', 'les_scenarioregler']
const reglene = () => REGLENE.map(antall)
/** Kallene til det som følger kontoen og ikke fagmiljøet. */
const KONTOENS = ['les_stoffregister', 'les_stoffavoritter', 'from:autoerstatt_regler', 'sokedata_versjoner']

async function visApp() {
  render(
    <TipsLag>
      <ShortcutVisibilityProvider>
        <App />
      </ShortcutVisibilityProvider>
    </TipsLag>,
  )
  await waitFor(() => expect(document.querySelector('.port[aria-busy]')).toBeNull())
}

describe('hentingen ved oppstart og fagmiljøbytte', { timeout: 20_000 }, () => {
  it('henter reglene én gang per fagmiljø, og kontoens kilder bare én gang', async () => {
    await visApp()
    expect(document.querySelector('.forside')).not.toBeNull()
    await waitFor(() => expect(Math.min(...reglene())).toBeGreaterThan(0))
    await waitFor(() => expect(antall('from:autoerstatt_regler')).toBe(1), { timeout: 3000 })
    // Fagsøket henter også når appen er ledig; det står gjennom byttet som resten av kontoens kilder.
    await waitFor(() => expect(antall('sokedata_versjoner')).toBe(1), { timeout: 3000 })
    const forstegang = reglene()
    const konto = KONTOENS.map(antall)

    // Fagmiljøet byttes et annet sted; appen ser det når fanen får fokus.
    databasen.fagmiljo = 'rt'
    await act(async () => void window.dispatchEvent(new Event('focus')))
    await waitFor(() => expect(antall('les_analyttkatalog')).toBe(2))
    await waitFor(() => expect(document.querySelector('.port[aria-busy]')).toBeNull())
    // Den nye arbeidsflaten henter dem én gang; den gamle henter dem ikke for det nye fagmiljøet.
    await waitFor(() => expect(reglene()).toEqual(forstegang.map((n) => 2 * n)))
    await act(() => new Promise((ferdig) => setTimeout(ferdig, 1200)))
    expect(reglene()).toEqual(forstegang.map((n) => 2 * n))

    // Kontoens kilder står gjennom byttet.
    expect(KONTOENS.map(antall)).toEqual(konto)
  })
})
