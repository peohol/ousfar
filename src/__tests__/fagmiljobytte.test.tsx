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
 * - Arbeidsflaten tegnes aldri med katalogen (og reglene) for et annet
 *   fagmiljø enn det rettighetene gjelder: mens katalogen for det nye hentes,
 *   står porten, også ved bytte til «uten fagmiljø» og når katalogen feiler.
 *
 * Innloggingen og databasen er erstattet; jsdom har ikke `requestIdleCallback`,
 * så «ledig» (fagsøket) er et sekund etter at appen er vist
 * (`useNaarLedig`).
 */
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const databasen = vi.hoisted(() => ({
  kall: [] as string[],
  /** Fagmiljøet den innloggede arbeider i; `null` er ingen (som når det er arkivert). */
  fagmiljo: 'kf' as 'kf' | 'rt' | null,
  /** Katalogen svarer først når denne er innfridd. */
  katalogVenter: null as Promise<void> | null,
  katalogFeiler: false,
  /** Hver gang forsidens overskrift tegnes: arbeidskonteksten, katalogens fagmiljø og om katalogen feilet. */
  visninger: [] as { kontekst: string | null; katalog: string | null; feil: boolean }[],
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
        const fagmiljo = databasen.fagmiljo ? fagmiljoer[databasen.fagmiljo] : null
        if (funksjon === 'mine_rettigheter') {
          const mine = Object.values(fagmiljoer)
          return { data: { arbeidsfagmiljo: fagmiljo, mine_fagmiljoer: mine }, error: null }
        }
        if (funksjon === 'les_analyttkatalog') {
          await databasen.katalogVenter
          if (databasen.katalogFeiler) return { data: null, error: { code: '57014', message: 'tidsavbrudd', details: null, hint: null } }
          return fagmiljo
            ? { data: { ...OUS_KATALOGSVAR, fagmiljo: { id: fagmiljo.id, navn: fagmiljo.navn } }, error: null }
            : { data: { ...OUS_KATALOGSVAR, oppforinger: [], fagmiljo: null }, error: null }
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
// Overskriften på forsiden noterer hva den tegnes med.
vi.mock('../components/forside/Fagmiljooverskrift', async () => {
  const { useArbeidskontekst } = await import('../auth/rettigheter')
  const { useKatalogkilde } = await import('../katalog/Analyttkatalogkilde')
  return {
    Fagmiljooverskrift: () => {
      const kontekst = useArbeidskontekst()
      const { katalog, feil } = useKatalogkilde()
      databasen.visninger.push({ kontekst, katalog: katalog.fagmiljo?.id ?? null, feil: feil !== null })
      return <h1 className="forside__tittel">{kontekst}</h1>
    },
  }
})

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
  databasen.katalogVenter = null
  databasen.katalogFeiler = false
  databasen.visninger = []
})

afterEach(cleanup)

const antall = (kall: string) => databasen.kall.filter((k) => k === kall).length
/** Kallene som henter fortolkningsreglene. */
const REGLENE = ['les_intervallregelsett', 'les_kommentarer', 'les_thc_regelsett', 'les_scenarioregler']
const reglene = () => REGLENE.map(antall)
/** Kallene til det som følger kontoen og ikke fagmiljøet. */
const KONTOENS = ['les_stoffregister', 'les_stoffavoritter', 'from:autoerstatt_regler', 'sokedata_versjoner']

/** Et løfte testen selv innfrir. */
function utsatt() {
  let innfri!: () => void
  const lofte = new Promise<void>((r) => (innfri = r))
  return { lofte, innfri }
}

/** Bytter fagmiljøet et annet sted; appen ser det når fanen får fokus. */
async function byttTil(fagmiljo: 'kf' | 'rt' | null) {
  const katalogkall = antall('les_analyttkatalog')
  databasen.fagmiljo = fagmiljo
  await act(async () => void window.dispatchEvent(new Event('focus')))
  await waitFor(() => expect(antall('les_analyttkatalog')).toBe(katalogkall + 1))
}

const UTEN = 'uten-arbeidsfagmiljo'
/** Om forsiden ble tegnet med katalogen for et annet fagmiljø enn rettighetene gjaldt. */
const blandet = () =>
  databasen.visninger.filter(
    ({ kontekst, katalog, feil }) => kontekst !== null && !feil && katalog !== (kontekst === UTEN ? null : kontekst),
  )

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

    await byttTil('rt')
    await waitFor(() => expect(document.querySelector('.port[aria-busy]')).toBeNull())
    // Den nye arbeidsflaten henter dem én gang; den gamle henter dem ikke for det nye fagmiljøet.
    await waitFor(() => expect(reglene()).toEqual(forstegang.map((n) => 2 * n)))
    await act(() => new Promise((ferdig) => setTimeout(ferdig, 1200)))
    expect(reglene()).toEqual(forstegang.map((n) => 2 * n))

    // Kontoens kilder står gjennom byttet.
    expect(KONTOENS.map(antall)).toEqual(konto)
  })

  it('viser aldri katalogen og reglene for ett fagmiljø under et annet, heller ikke uten fagmiljø eller når katalogen feiler', async () => {
    await visApp()
    await waitFor(() => expect(antall('sokedata_versjoner')).toBe(1), { timeout: 3000 })
    const konto = KONTOENS.map(antall)
    const regler = reglene()
    expect(databasen.visninger.at(-1)).toEqual({ kontekst: 'kf', katalog: 'kf', feil: false })

    // Katalogen for det nye fagmiljøet lar vente på seg: imens står porten.
    const katalog = utsatt()
    databasen.katalogVenter = katalog.lofte
    await byttTil('rt')
    expect(document.querySelector('.port[aria-busy]')).not.toBeNull()
    expect(document.querySelector('.forside')).toBeNull()
    expect(reglene()).toEqual(regler)
    await act(async () => katalog.innfri())
    await waitFor(() => expect(databasen.visninger.at(-1)).toEqual({ kontekst: 'rt', katalog: 'rt', feil: false }))
    await waitFor(() => expect(reglene()).toEqual(regler.map((n) => 2 * n)))

    // Uten fagmiljø: ingen katalog, og ikke det forrige fagmiljøets.
    databasen.katalogVenter = null
    await byttTil(null)
    await waitFor(() => expect(databasen.visninger.at(-1)).toEqual({ kontekst: UTEN, katalog: null, feil: false }))

    // Katalogen kan ikke hentes: fortolkningen sier fra, og ingenting fra før står.
    databasen.katalogFeiler = true
    await byttTil('rt')
    await waitFor(() => expect(databasen.visninger.at(-1)).toEqual({ kontekst: 'rt', katalog: null, feil: true }))

    expect(blandet()).toEqual([])
    expect(KONTOENS.map(antall)).toEqual(konto)
  })
})
