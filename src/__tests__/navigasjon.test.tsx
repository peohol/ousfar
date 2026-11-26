// @vitest-environment jsdom
/**
 * Navigasjonen i hele appen, med fortolkningen og fagsidene som adskilte
 * domener (`docs/domener.md`).
 *
 * - En fagside er alltid en stoffside, med stoffets nøkkel i adressen
 *   (`#/stoff/bupropion`). En analyttkode som HBUP er aldri en side, en
 *   sidetittel eller en adresse på fagsidene.
 * - Stoffregisteret i hovedmenyen (Fag › Stoffregister) fører til stoffsidene,
 *   ikke til fortolkningen, viser ingen analysekoder og filtrerer ikke søket.
 * - Ingen lenker, knapper eller koder fører mellom fortolkningen og
 *   fagsidene: kodene i fortolkningen er tekst, og fagsidene har ingen
 *   «Åpne fortolkning».
 * - Gamle adresser etter analyttkoden (`#/analytt/HBUP`) åpner fortolkningen
 *   av koden, aldri en fagside.
 * - Fortolkningen står uendret bak en åpen stoffside, og tastene dens ligger
 *   i ro så lenge den er skjult.
 * - Fagsøket i toppmenyen når tastene i fortolkningen aldri, og søkesiden
 *   legger seg over fortolkningen som en stoffside.
 *
 * - Fortolkningsreglene redigeres fra fortolkningen, på en egen side bare
 *   administratorer får åpne (`#/fortolkning/<nøkkel>/rediger`).
 *
 * Innloggingen og databasen er erstattet: økten er en vanlig bruker (eller en
 * administrator, når testen sier det), og
 * databasen har bare regelsettene fra før byttet, referanseområdekortene på
 * stoffsidene og siden for ett stoff som ikke står i registeret. Hvert kall
 * til databasen noteres, så testene kan se hva som ble lest etter hva.
 */
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/** Kallene appen har gjort til databasen, i rekkefølge. */
const databasen = vi.hoisted(() => ({ kall: [] as { funksjon: string; argumenter: Record<string, unknown> }[] }))
/** Rollen til den innloggede; en vanlig bruker, med mindre testen sier noe annet. */
// `lokalAdmin`: lokal administrator i KF uten den gamle adminrollen (P2a).
const okt = vi.hoisted(() => ({ rolle: 'user', lokalAdmin: false }))

vi.mock('../auth/okt', () => ({
  useProfil: () => ({ role: okt.rolle, first_name: 'Lars', last_name: 'Leser', username: 'leser' }),
}))
vi.mock('../auth/klient', async () => {
  const { DAGENS_REGELSETT } = await import('./hjelp/dagensregler')
  const { publiserteRader } = await import('./hjelp/dagensregler')
  const { scenarioregeldata } = await import('./hjelp/etggrunnlag')
  const { OUS_KATALOGSVAR } = await import('./hjelp/ouskatalogkilde')
  const { thcRegelsettutgave } = await import('./hjelp/thcgrunnlag')
  const { GRUNNSTRUKTUR } = await import('./hjelp/registerstruktur')
  // Ett stoff registeret ikke kjenner, har en publisert side i databasen.
  const teststoff = { id: 'stoff', slug: 'teststoff', navn: 'Teststoff' }
  const stoffside = {
    stoff: teststoff,
    infoside: {
      id: 'stoff',
      revisjon: 1,
      publisert_revisjon: 1,
      innhold: { navn: 'Teststoff' },
      endret_av_fornavn: '',
      endret_av_etternavn: '',
      endret_kl: '',
    },
    elementer: [],
    referanser: [],
  }
  // Reglene fortolkningen henter, er de publiserte regelsettene.
  const vanlige = publiserteRader(DAGENS_REGELSETT)
  const thc = thcRegelsettutgave()
  const rader: Record<string, unknown> = {
    ...vanlige,
    les_kommentarer: [...vanlige.les_kommentarer, ...thc.kommentarer],
    les_thc_regelsett: thc.regelsett,
    les_scenarioregler: scenarioregeldata(),
    les_analyttkatalog: OUS_KATALOGSVAR,
    les_stoffregister: { ...GRUNNSTRUKTUR, sider: [teststoff] },
  }
  return {
    klient: () => ({
      rpc: async (funksjon: string, argumenter: Record<string, unknown> = {}) => {
        databasen.kall.push({ funksjon, argumenter })
        // En administrator her er lokal administrator og systemarkitekt (P2a, P2d).
        if (funksjon === 'mine_rettigheter') {
          const fagmiljo = { id: 'kf', nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi' }
          const admin = okt.rolle === 'admin'
          return {
            data: {
              systemarkitekt: admin,
              administrerer: admin || okt.lokalAdmin ? [fagmiljo] : [],
              stoffregister: admin,
              opprett_bruker: admin,
            },
            error: null,
          }
        }
        if (funksjon === 'kan_endre_lokalt_innhold') return { data: okt.rolle === 'admin' || okt.lokalAdmin, error: null }
        // Stoffsiden leses etter nøkkelen; bare teststoffet har en side.
        if (funksjon === 'les_stoff') return { data: argumenter.stoff === teststoff.slug ? stoffside : null, error: null }
        // Regelsettet for én analyttkode, slik stoffsiden leser det.
        if (funksjon === 'finn_intervallregelsett') {
          const regelsett = vanlige.les_intervallregelsett.find((r) => r.innhold.analyttkode === argumenter.analyttkode)
          return { data: regelsett ?? null, error: null }
        }
        return { data: rader[funksjon] ?? null, error: null }
      },
    }),
  }
})
vi.mock('../components/konto/Kontomeny', () => ({ Kontomeny: () => null }))

const { default: App } = await import('../App')
// Sidene appen henter når de vises, hentes her, så testene ikke venter på dem.
await (await import('./hjelp/sidekode')).hentSidene()
const { dagensKommentar } = await import('./hjelp/dagensregler')
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
  // Testene begynner i fortolkningssøket; appen åpner på forsiden.
  window.location.hash = '#/fortolkning'
  databasen.kall = []
  okt.rolle = 'user'
  okt.lokalAdmin = false
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

async function visApp() {
  render(
    <TipsLag>
      <ShortcutVisibilityProvider>
        <App />
      </ShortcutVisibilityProvider>
    </TipsLag>,
  )
  // Appen tegnes opp når analyttkatalogen er hentet.
  await waitFor(() => expect(document.querySelector('.port[aria-busy]')).toBeNull())
}

/** Hvor lenge en test venter på at en verktøyside står (CI-serveren kan være travel). */
const VERKTOYSIDE_TID = 5000

/** Går til adressen, slik nettleseren gjør når brukeren skriver den eller går tilbake og fram. */
function gaTil(adresse: string) {
  act(() => {
    window.location.hash = adresse
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })
}

/** Fortolkningen, synlig eller skjult. */
function fortolkningen(): HTMLElement {
  return document.querySelector('main.scene[data-fortolkning]')!
}

/** Stoffsiden, når den står åpen. */
function stoffsiden(): HTMLElement | null {
  return document.querySelector('main.scene--infoside')
}

/** Søker opp NOR og velger det beste treffet — koden selv — med tasten 1. */
async function velgNortriptylin(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard('nor')
  await user.keyboard('1')
  await screen.findByRole('region', { name: 'Velg konsentrasjon' })
}

/** Kodene i metalinjen til modulen som fortolkes. */
function kodene(): string[] {
  return [...fortolkningen().querySelectorAll('.metalinje__kode')].map((k) => k.textContent ?? '')
}

/**
 * Søker opp koden i fortolkningen og åpner modulen den fortolkes i — av seg
 * selv når søket bare gir den, ellers med det beste treffet.
 */
async function velgKode(user: ReturnType<typeof userEvent.setup>, kode: string) {
  await user.keyboard(kode.toLowerCase())
  if (!kodene().includes(kode)) await user.keyboard('1')
  await waitFor(() => expect(kodene()).toContain(kode))
}

/** Lenkene fra fortolkningen til en fagside; det skal ikke være noen. */
function lenkerTilFagsider(): string[] {
  return [...document.querySelectorAll('a[href^="#/stoff"]')]
    .filter((a) => fortolkningen().contains(a))
    .map((a) => a.getAttribute('href')!)
}

async function stoffsideFor(navn: string) {
  return screen.findByRole('heading', { level: 1, name: navn })
}

/** Hovedmenyen, og veien ned gjennom undermenyene med disse navnene fra nivået den står på. */
async function iMenyen(user: ReturnType<typeof userEvent.setup>, ...navn: string[]) {
  const meny = screen.getByRole('navigation', { name: 'Meny' })
  for (const n of navn) await user.click(within(meny).getByRole('button', { name: new RegExp(`^${n}`) }))
  return meny
}

/** Navnet på nivået menyen står på. */
const nivaet = (meny: HTMLElement) => within(meny).getByRole('heading', { level: 2 }).textContent

// Hele appen tegnes opp og klikkes gjennom; alene tar det rundt fem sekunder,
// så standardgrensen på fem gir ingen margin på en travel CI-maskin.
describe('stoffregisteret i hovedmenyen', { timeout: 20_000 }, () => {
  it('står under Fag, og lenker hvert stoff til stoffsiden etter nøkkelen, uten analysekodene', async () => {
    const user = userEvent.setup()
    await visApp()
    const historikk = window.history.length
    await user.click(screen.getByRole('button', { name: 'Vis menyen' }))
    const meny = await iMenyen(user, 'Fag', 'Stoffregister')
    expect(nivaet(meny)).toBe('Stoffregister')
    // Søket i fortolkningen filtreres fra hovedsiden, ikke herfra.
    expect(within(meny).queryByRole('radio')).toBeNull()
    // Helsiden først, så kategoriene, med antallet stoffer.
    expect(within(meny).getByRole('link', { name: 'Hele stoffregisteret' }).getAttribute('href')).toBe('#/stoffregister')
    expect(within(meny).getByRole('heading', { name: 'Stoffkategorier' })).toBeTruthy()
    expect(within(meny).getByRole('button', { name: /^Antidepressiver\s*\d+ stoffer$/ })).toBeTruthy()

    // En kategori erstatter kategorilista med stoffene, med underkategoriene som mellomoverskrifter.
    await iMenyen(user, 'Antidepressiver')
    expect(nivaet(meny)).toBe('Antidepressiver')
    expect(within(meny).queryByRole('link', { name: 'Hele stoffregisteret' })).toBeNull()
    expect(within(meny).getByRole('heading', { name: 'TCA' })).toBeTruthy()
    // Hver lenke går til en stoffside, aldri til en analyttkode.
    const adresser = [...meny.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')!)
    expect(adresser.length).toBeGreaterThan(5)
    expect(adresser.filter((a) => !/^#\/stoff\/[a-z0-9]+(-[a-z0-9]+)*$/.test(a))).toEqual([])
    // Fortolkningens koder står ikke i registeret (docs/domener.md).
    expect(meny.textContent).not.toMatch(/HBUP|AMTNORSUM/)
    // Uten underkategoriene står de samme stoffene i én bolk.
    await user.click(within(meny).getByRole('switch', { name: 'Vis underkategorier' }))
    expect(within(meny).queryByRole('heading', { name: 'TCA' })).toBeNull()
    expect([...meny.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).sort()).toEqual([...adresser].sort())
    await user.click(within(meny).getByRole('switch', { name: 'Vis underkategorier' }))

    const bupropion = within(meny).getByRole('link', { name: /^Bupropion/ })
    expect(bupropion.getAttribute('href')).toBe('#/stoff/bupropion')
    expect(bupropion.textContent).toBe('Bupropion')
    await user.click(bupropion)
    await stoffsideFor('Bupropion')
    expect(window.location.hash).toBe('#/stoff/bupropion')
    expect(fortolkningen().hidden).toBe(true)
    expect(meny.getAttribute('data-apen')).toBe('nei')
    // Siden starter med fokus på navnet, ikke igjen i menyen.
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
    // Nivåene i menyen la ingenting i historikken; bare stoffsiden gjorde det.
    expect(window.history.length).toBe(historikk + 1)

    // Ctrl + M åpner menyen igjen på nivået den sto, med stoffet merket.
    await user.keyboard('{Control>}m{/Control}')
    expect(meny.getAttribute('data-apen')).toBe('ja')
    expect(nivaet(meny)).toBe('Antidepressiver')
    expect(within(meny).getByRole('link', { name: /^Bupropion/ }).getAttribute('aria-current')).toBe('page')
    // Og valgene som fører hit, har et svakere merke.
    await user.click(within(meny).getByRole('button', { name: 'Tilbake til Stoffregister' }))
    expect(within(meny).getByRole('button', { name: /^Antidepressiver/ }).getAttribute('data-gjeldende')).toBe('under')
    expect(document.activeElement).toBe(within(meny).getByRole('button', { name: /^Antidepressiver/ }))
    // Rett til hovedmenyen fra et dypere nivå.
    await user.click(within(meny).getByRole('button', { name: 'Til hovedmenyen' }))
    expect(nivaet(meny)).toBe('Meny')
    expect(within(meny).getByRole('button', { name: /^Fag/ }).getAttribute('data-gjeldende')).toBe('under')
    await user.keyboard('{Escape}')
    expect(meny.getAttribute('data-apen')).toBe('nei')
  })

  it('har et søk øverst som finner stoffene på navnet og de andre navnene, og lukkes ikke av Escape mens det står noe i det', async () => {
    const user = userEvent.setup()
    await visApp()
    await user.click(screen.getByRole('button', { name: 'Vis menyen' }))
    const meny = await iMenyen(user, 'Fag', 'Stoffregister')
    const sok = within(meny).getByRole('searchbox', { name: 'Søk i stoffregisteret' })
    await user.type(sok, 'bupro')
    expect(within(meny).getAllByRole('link').map((a) => a.getAttribute('href'))).toEqual(['#/stoff/bupropion'])
    expect(within(meny).queryByRole('heading', { name: 'Stoffkategorier' })).toBeNull()
    // Et annet navn for stoffet står ved siden av, uansett store bokstaver.
    await user.clear(sok)
    await user.type(sok, 'benzoyl')
    expect(within(meny).getByRole('link', { name: /^Kokain/ }).textContent).toBe('KokainBenzoylekgonin')
    // Piltasten går fra feltet til det første treffet.
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(within(meny).getByRole('link', { name: /^Kokain/ }))
    await user.click(sok)
    await user.clear(sok)
    await user.type(sok, 'qqqq')
    expect(within(meny).getByRole('status').textContent).toBe('Ingen stoffer passer med søket.')
    // Første Escape tømmer feltet, neste lukker menyen.
    await user.keyboard('{Escape}')
    expect((sok as HTMLInputElement).value).toBe('')
    expect(meny.getAttribute('data-apen')).toBe('ja')
    await user.keyboard('{Escape}')
    expect(meny.getAttribute('data-apen')).toBe('nei')
  })

  it('går mellom nivåene med piltastene, med fokus der det hører hjemme', async () => {
    const user = userEvent.setup()
    await visApp()
    await user.keyboard('{Control>}m{/Control}')
    const meny = screen.getByRole('navigation', { name: 'Meny' })
    // Fra panelet, som har fokus når menyen åpnes, går pil ned til det første valget.
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(within(meny).getByRole('link', { name: 'Forsiden' }))
    await user.keyboard('{ArrowDown}{ArrowDown}')
    expect(document.activeElement).toBe(within(meny).getByRole('button', { name: /^Fag/ }))
    // Høyre går inn, med fokus på det første feltet på nivået.
    await user.keyboard('{ArrowRight}')
    expect(nivaet(meny)).toBe('Fag')
    expect(document.activeElement).toBe(within(meny).getByRole('button', { name: /^Stoffregister/ }))
    // Enter gjør det samme som høyre.
    await user.keyboard('{Enter}')
    expect(nivaet(meny)).toBe('Stoffregister')
    expect(document.activeElement).toBe(within(meny).getByRole('searchbox', { name: 'Søk i stoffregisteret' }))
    // Venstre i søkefeltet flytter markøren; fra et valg går den tilbake.
    await user.keyboard('{ArrowLeft}')
    expect(nivaet(meny)).toBe('Stoffregister')
    await user.keyboard('{ArrowDown}')
    expect(document.activeElement).toBe(within(meny).getByRole('link', { name: 'Hele stoffregisteret' }))
    await user.keyboard('{ArrowLeft}')
    expect(nivaet(meny)).toBe('Fag')
    expect(document.activeElement).toBe(within(meny).getByRole('button', { name: /^Stoffregister/ }))
    await user.keyboard('{ArrowLeft}')
    expect(nivaet(meny)).toBe('Meny')
    expect(document.activeElement).toBe(within(meny).getByRole('button', { name: /^Fag/ }))
    // På hovedmenyen er det ingen vei tilbake.
    await user.keyboard('{ArrowLeft}')
    expect(nivaet(meny)).toBe('Meny')
    expect(within(meny).queryByRole('button', { name: /^Tilbake/ })).toBeNull()
  })

  it('har verktøyene under Fag for den som skal se dem, og åpner et verktøy på sin egen adresse', async () => {
    okt.rolle = 'admin'
    const user = userEvent.setup()
    await visApp()
    await user.keyboard('{Control>}m{/Control}')
    const meny = await iMenyen(user, 'Fag')
    expect([...meny.querySelectorAll('.menyvalg__navn')].map((n) => n.textContent)).toEqual(['Stoffregister', 'Verktøy', 'Favoritter'])
    await iMenyen(user, 'Verktøy')
    expect([...meny.querySelectorAll('a[href]')].map((a) => a.getAttribute('href'))).toEqual([
      '#/verktoy',
      '#/verktoy/trappe-ned-antidepressiv',
      '#/verktoy/bytte-antidepressiv',
      '#/verktoy/bytte-antipsykotikum',
      '#/verktoy/kombinere-stemningsstabiliserende',
    ])
    expect(within(meny).getByRole('link', { name: 'Verktøyoversikten' })).toBeTruthy()

    await user.click(within(meny).getByRole('link', { name: /^Bytte antidepressiv/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Bytte antidepressiv' })).toBeTruthy()
    expect(window.location.hash).toBe('#/verktoy/bytte-antidepressiv')
    expect(meny.getAttribute('data-apen')).toBe('nei')
    expect(fortolkningen().hidden).toBe(true)
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 })))

    // Ctrl M åpner menyen igjen på verktøyene.
    await user.keyboard('{Control>}m{/Control}')
    expect(meny.getAttribute('data-apen')).toBe('ja')
    expect(nivaet(meny)).toBe('Verktøy')
    expect(within(meny).getByRole('link', { name: /^Bytte antidepressiv/ }).getAttribute('aria-current')).toBe('page')
    await user.keyboard('{Escape}')
    expect(meny.getAttribute('data-apen')).toBe('nei')

    // Esc lukker verktøyet, og fortolkningen står der den sto.
    await user.keyboard('{Escape}')
    await waitFor(() => expect(fortolkningen().hidden).toBe(false))
  })

  it('lukkes ikke av en lenke som åpnes i en ny fane', async () => {
    const user = userEvent.setup()
    await visApp()
    await user.click(screen.getByRole('button', { name: 'Vis menyen' }))
    const meny = screen.getByRole('navigation', { name: 'Meny' })
    const forsiden = within(meny).getByRole('link', { name: 'Forsiden' })
    // Klikket med Ctrl åpner lenken et annet sted; jsdom følger den ikke.
    forsiden.addEventListener('click', (e) => e.preventDefault(), { once: true })
    await user.keyboard('{Control>}')
    await user.click(forsiden)
    await user.keyboard('{/Control}')
    expect(meny.getAttribute('data-apen')).toBe('ja')
  })

  it('lar filteret for søket stå som det er', async () => {
    const user = userEvent.setup()
    await visApp()
    await user.click(screen.getByRole('button', { name: 'Vis menyen' }))
    // Alt + tall setter filteret på hovedsiden, men ikke mens menyen står åpen.
    await user.keyboard('{Alt>}1{/Alt}')
    await user.keyboard('{Escape}')
    expect(screen.queryByText('Søket er begrenset til')).toBeNull()
  })
})

// Som stoffregisteret i menyen: hele appen tegnes opp og klikkes gjennom.
describe('stoffene uten analyttkode', { timeout: 20_000 }, () => {
  it('står i registeret, og fører til siden etter nøkkelen', async () => {
    const user = userEvent.setup()
    await visApp()
    await user.click(screen.getByRole('button', { name: 'Vis menyen' }))
    await iMenyen(user, 'Fag', 'Stoffregister')
    // Teststoffet står ikke i registeret, og havner derfor i «Andre stoffer».
    await user.click(await screen.findByRole('button', { name: /^Andre stoffer/ }))
    // En vanlig bruker kan ikke lage nye sider.
    expect(screen.queryByLabelText('Ny fagside')).toBeNull()
    const lenke = screen.getByRole('link', { name: 'Teststoff' })
    expect(lenke.getAttribute('href')).toBe('#/stoff/teststoff')

    await user.click(lenke)
    await stoffsideFor('Teststoff')
    expect(window.location.hash).toBe('#/stoff/teststoff')
    expect(fortolkningen().hidden).toBe(true)
    expect(screen.queryByRole('button', { name: 'Åpne fortolkning' })).toBeNull()
    await waitFor(() => expect(databasen.kall).toContainEqual({
      funksjon: 'les_stoff', argumenter: { stoff: 'teststoff', sidetilstand: 'publisert' },
    }))
  })
})

describe('forsiden og veien tilbake', { timeout: 20_000 }, () => {
  /** Forsiden står når knappen inn til fortolkningen er der. */
  const forsiden = () => screen.findByRole('button', { name: 'Åpne fortolkning' })
  const soket = () => within(fortolkningen()).getByRole('textbox', { name: 'Søk etter analytt eller kode' })

  it.each(['#/', ''])('åpner forsiden på «%s», med fortolkningen skjult bak', async (hash) => {
    window.location.hash = hash
    await visApp()
    expect(await forsiden()).toBeTruthy()
    expect(fortolkningen().hidden).toBe(true)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Åpne fortolkning' }))
  })

  it('går fra forsiden til søket og tilbake med knappene', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/'
    await visApp()
    await user.click(await forsiden())
    await waitFor(() => expect(window.location.hash).toBe('#/fortolkning'))
    expect(fortolkningen().hidden).toBe(false)
    expect(soket()).toBeTruthy()

    await user.click(within(fortolkningen()).getByRole('button', { name: 'Til forsiden' }))
    await waitFor(() => expect(window.location.hash).toBe('#/'))
    expect(await forsiden()).toBeTruthy()
    expect(fortolkningen().hidden).toBe(true)
  })

  it('åpner alltid søket fra forsiden, også når en analytt står åpen bak', async () => {
    const user = userEvent.setup()
    await visApp()
    await velgNortriptylin(user)
    window.location.hash = '#/'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await user.click(await forsiden())
    await waitFor(() => expect(window.location.hash).toBe('#/fortolkning'))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Velg konsentrasjon' })).toBeNull())
    expect(soket()).toBeTruthy()
  })

  it('stopper Escape i søket: feltet tømmes, men søket står', async () => {
    const user = userEvent.setup()
    await visApp()
    await user.keyboard('zz')
    expect(soket()).toHaveProperty('value', 'zz')
    await user.keyboard('{Escape}')
    expect(soket()).toHaveProperty('value', '')
    await user.keyboard('{Escape}{Escape}')
    expect(window.location.hash).toBe('#/fortolkning')
    expect(fortolkningen().hidden).toBe(false)
    expect(screen.queryByRole('button', { name: 'Åpne fortolkning' })).toBeNull()
  })

  it('lukker en stoffside tilbake til forsiden når den ble åpnet derfra', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/'
    await visApp()
    await forsiden()
    window.location.hash = '#/stoff/nortriptylin'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await stoffsideFor('Nortriptylin')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(window.location.hash).toBe('#/'))
    expect(await forsiden()).toBeTruthy()
    expect(stoffsiden()).toBeNull()
  })

  it('lukker en stoffside åpnet fra en lenke utenfra til forsiden, uten å gå ut av appen', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/stoff/nortriptylin'
    await visApp()
    await stoffsideFor('Nortriptylin')
    const oppforinger = window.history.length
    const tilbake = vi.spyOn(window.history, 'back')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(window.location.hash).toBe('#/'))
    expect(tilbake).not.toHaveBeenCalled()
    // Forsiden tar plassen til lenken, så nettleserens tilbake går ut i ett steg.
    expect(window.history.length).toBe(oppforinger)
    expect(await forsiden()).toBeTruthy()
  })

  it('følger nettleserens tilbake fra en stoffside til søket den ble åpnet fra', async () => {
    window.location.hash = '#/fortolkning'
    await visApp()
    window.location.hash = '#/stoff/nortriptylin'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await stoffsideFor('Nortriptylin')
    window.history.back()
    await waitFor(() => expect(window.location.hash).toBe('#/fortolkning'))
    await waitFor(() => expect(fortolkningen().hidden).toBe(false))
    expect(stoffsiden()).toBeNull()
  })

  it('viser «Siden finnes ikke» for en ukjent adresse, lar adressen stå, og har vei til forsiden', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/finnes-ikke'
    await visApp()
    expect(await screen.findByRole('heading', { level: 1, name: 'Siden finnes ikke' })).toBeTruthy()
    expect(window.location.hash).toBe('#/finnes-ikke')
    expect(document.title).toBe('Siden finnes ikke – OUSFAR')
    expect(fortolkningen().hidden).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Til forsiden' }))
    await waitFor(() => expect(window.location.hash).toBe('#/'))
    expect(await forsiden()).toBeTruthy()
  })

  it('har snarveier til forsiden og fortolkningen øverst i menyen', async () => {
    const user = userEvent.setup()
    await visApp()
    await user.click(screen.getByRole('button', { name: 'Vis menyen' }))
    const meny = screen.getByRole('navigation', { name: 'Meny' })
    expect(within(meny).getByRole('link', { name: 'Forsiden' }).getAttribute('href')).toBe('#/')
    expect(within(meny).getByRole('link', { name: 'Fortolkning' }).getAttribute('href')).toBe('#/fortolkning')
    // Fortolkningen er siden brukeren står på.
    expect(within(meny).getByRole('link', { name: 'Fortolkning' }).getAttribute('aria-current')).toBe('page')
    expect(within(meny).getByRole('link', { name: 'Forsiden' }).getAttribute('aria-current')).toBeNull()
  })
})

describe('fortolkningssidene', () => {
  it('gir analytten som fortolkes, sin egen adresse, og tilbakeknappen går til søket med søket i behold', async () => {
    const user = userEvent.setup()
    await visApp()
    await velgNortriptylin(user)
    expect(window.location.hash).toBe('#/fortolkning/nor')

    window.location.hash = '#/fortolkning'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await waitFor(() => expect(screen.queryByRole('region', { name: 'Velg konsentrasjon' })).toBeNull())
    expect(within(fortolkningen()).getByRole('textbox', { name: 'Søk etter analytt eller kode' })).toHaveProperty('value', 'nor')
  })

  it('åpner analytten direkte fra adressen, også en modul med flere koder', async () => {
    window.location.hash = '#/fortolkning/nor'
    await visApp()
    await screen.findByRole('region', { name: 'Velg konsentrasjon' })
    cleanup()

    window.location.hash = '#/fortolkning/diaz-dmi-oxa'
    await visApp()
    await waitFor(() => expect(window.location.hash).toBe('#/fortolkning/diaz-dmi-oxa'))
    await waitFor(() => expect(kodene()).toEqual(['DIAZ', 'DMI', 'OXA']))
    expect(lenkerTilFagsider()).toEqual([])
  })

  it('går til søket for en analytt som ikke finnes, uten å legge noe i historikken', async () => {
    window.location.hash = '#/fortolkning/finnesikke'
    await visApp()
    await waitFor(() => expect(window.location.hash).toBe('#/fortolkning'))
    expect(within(fortolkningen()).getByRole('textbox', { name: 'Søk etter analytt eller kode' })).toBeTruthy()
  })
})

describe('adressene', () => {
  it('åpner en stoffside direkte fra adressen, med stoffnavnet som tittel', async () => {
    window.location.hash = '#/stoff/nortriptylin'
    await visApp()
    await stoffsideFor('Nortriptylin')
    expect(document.title).toBe('Nortriptylin – OUSFAR')
  })

  it('følger tilbakeknappen', async () => {
    window.location.hash = '#/stoff/nortriptylin'
    await visApp()
    await stoffsideFor('Nortriptylin')
    window.location.hash = '#/fortolkning'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await waitFor(() => expect(fortolkningen().hidden).toBe(false))
    expect(screen.queryByRole('heading', { level: 1, name: 'Nortriptylin' })).toBeNull()
  })

  it.each([
    ['venlafaksin', 'Venlafaksin'],
    ['amitriptylin', 'Amitriptylin'],
    ['nortriptylin', 'Nortriptylin'],
    ['paliperidon', 'Paliperidon'],
    ['etanol', 'Etanol'],
    ['thc', 'THC'],
    ['bupropion', 'Bupropion'],
  ])('har stoffnavnet som tittel på #/stoff/%s', async (slug, navn) => {
    window.location.hash = `#/stoff/${slug}`
    await visApp()
    const overskrift = await stoffsideFor(navn)
    expect(overskrift.textContent).toBe(navn)
    expect(document.title).toBe(`${navn} – OUSFAR`)
    expect(window.location.hash).toBe(`#/stoff/${slug}`)
    // Ingen kode, og ingen sammenslått tittel fra før («THC og THC-syre»).
    expect(within(stoffsiden()!).queryByText(/THC og THC-syre/)).toBeNull()
    expect(document.title).not.toMatch(/\(/)
  })
})

describe('gamle adresser etter analyttkoden', () => {
  it('åpner fortolkningen for #/analytt/HBUP, og skriver adressen om uten en ny oppføring i historikken', async () => {
    window.location.hash = '#/analytt/HBUP'
    const oppforinger = window.history.length
    const erstatt = vi.spyOn(window.history, 'replaceState')
    const legg = vi.spyOn(window.history, 'pushState')
    await visApp()
    await waitFor(() => expect(window.location.hash).toBe('#/fortolkning/hbup'))
    // Kall uten adresse merker bare oppføringen med inngangsveien.
    expect(erstatt.mock.calls.map(([, , adresse]) => adresse).filter(Boolean)).toEqual(['#/fortolkning/hbup'])
    expect(legg).not.toHaveBeenCalled()
    expect(window.history.length).toBe(oppforinger)
    expect(fortolkningen().hidden).toBe(false)
    expect(stoffsiden()).toBeNull()
  })

  it.each(['DMI', 'OTRAM', 'UETS', 'IRCAK', 'AMTNORSUM', 'nor', 'IRCAK/fortolkning', 'HBUP/farmakokinetikk'])(
    'åpner fortolkningen for #/analytt/%s, aldri en fagside',
    async (kode) => {
      window.location.hash = `#/analytt/${kode}`
      await visApp()
      await waitFor(() => expect(window.location.hash).toMatch(/^#\/fortolkning\/[a-z0-9-]+$/))
      expect(fortolkningen().hidden).toBe(false)
      expect(stoffsiden()).toBeNull()
      expect(databasen.kall.filter((k) => k.funksjon === 'les_stoff')).toEqual([])
    },
  )

  it('åpner fortolkningen, og ingen fagside, for en kode katalogen ikke kjenner', async () => {
    window.location.hash = '#/analytt/FINNESIKKE'
    await visApp()
    await waitFor(() => expect(fortolkningen().hidden).toBe(false))
    expect(stoffsiden()).toBeNull()
    expect(screen.queryByText(/Fant ingen fagside/)).toBeNull()
    expect(databasen.kall.filter((k) => k.funksjon === 'les_stoff')).toEqual([])
  })
})

// Som stoffregisteret i menyen: hele appen, med god margin på tiden.
describe('redigeringen av fortolkningen', { timeout: 20_000 }, () => {
  it('åpnes med «Rediger fortolkningen» for administratorer, og går tilbake til samme modul', async () => {
    okt.rolle = 'admin'
    const user = userEvent.setup()
    await visApp()
    await velgNortriptylin(user)

    await user.click(screen.getByRole('button', { name: 'Rediger fortolkningen' }))
    await waitFor(() => expect(window.location.hash).toBe('#/fortolkning/nor/rediger'))
    expect(fortolkningen().hidden).toBe(true)
    const side = stoffsiden()!
    expect(within(side).getByText('Rediger fortolkningen')).toBeTruthy()
    // Reglene for koden står åpne, med utkastet.
    expect(await within(side).findByRole('heading', { level: 2, name: 'Fortolkning' })).toBeTruthy()
    expect(
      databasen.kall.filter((k) => k.funksjon === 'finn_intervallregelsett').map((k) => k.argumenter.analyttkode),
    ).toContain('NOR')

    await user.click(screen.getByRole('button', { name: 'Avslutt redigering' }))
    await waitFor(() => expect(fortolkningen().hidden).toBe(false))
    expect(window.location.hash).toBe('#/fortolkning/nor')
    expect(screen.getByRole('region', { name: 'Velg konsentrasjon' })).toBeTruthy()
  })

  it('åpnes for en lokal administrator uten den gamle adminrollen', async () => {
    okt.lokalAdmin = true
    const user = userEvent.setup()
    await visApp()
    await velgNortriptylin(user)
    await user.click(await screen.findByRole('button', { name: 'Rediger fortolkningen' }))
    await waitFor(() => expect(window.location.hash).toBe('#/fortolkning/nor/rediger'))
    expect(fortolkningen().hidden).toBe(true)
  })

  it('er ikke der for andre, og adressen til den er bare fortolkningen', async () => {
    window.location.hash = '#/fortolkning/nor/rediger'
    await visApp()
    await waitFor(() => expect(window.location.hash).toBe('#/fortolkning/nor'))
    await screen.findByRole('region', { name: 'Velg konsentrasjon' })
    expect(fortolkningen().hidden).toBe(false)
    expect(screen.queryByRole('button', { name: 'Rediger fortolkningen' })).toBeNull()
    expect(stoffsiden()).toBeNull()
  })
})

describe('kodene i fortolkningen', () => {
  it.each(['HBUP', 'DMI', 'OTRAM', 'IRCAK', 'UETGS', 'AMTNORSUM', 'NOR'])('står %s som tekst, uten lenke til en fagside', async (kode) => {
    const user = userEvent.setup()
    await visApp()
    await velgKode(user, kode)
    expect(lenkerTilFagsider()).toEqual([])
    expect(screen.queryByRole('button', { name: /^Åpne fagside/ })).toBeNull()
  })
})

// Som stoffregisteret i menyen: hele appen, med god margin på tiden.
describe('fortolkningen og fagsidene er adskilt', { timeout: 20_000 }, () => {
  it('har ingen «Åpne fagside» mens en modul fortolkes', async () => {
    const user = userEvent.setup()
    await visApp()
    await velgNortriptylin(user)
    expect(screen.queryByRole('button', { name: /Åpne fagside/ })).toBeNull()
    expect(lenkerTilFagsider()).toEqual([])
  })

  it('viser verken HBUP, regler eller «Åpne fortolkning» på Bupropion-siden, og leser ingen regler', async () => {
    window.location.hash = '#/stoff/bupropion'
    await visApp()
    await stoffsideFor('Bupropion')
    await waitFor(() => expect(databasen.kall.some((k) => k.funksjon === 'les_stoff')).toBe(true))
    const side = stoffsiden()!
    expect(screen.queryByRole('heading', { level: 2, name: 'Fortolkning' })).toBeNull()
    expect(within(side).queryByRole('button', { name: /fortolkning/i })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Åpne fortolkning' })).toBeNull()
    expect(side.querySelector('.identitet')!.textContent).not.toMatch(/HBUP|Inngår i|måler/)

    // Fagsiden leser ingen regler; stoffets nøkkel er bare brukt til å lese
    // monografien, bivirkningene fra preparatomtalene og diskusjonene.
    expect(databasen.kall.filter((k) => k.funksjon === 'finn_intervallregelsett')).toEqual([])
    const etterStoffet = databasen.kall.filter((k) =>
      Object.values(k.argumenter).some((v) => typeof v === 'string' && /bupropion/i.test(v)),
    )
    expect(etterStoffet.map((k) => k.funksjon).filter((f) => f !== 'diskusjonsoversikt').sort()).toEqual(['les_bivirkninger', 'les_stoff'])
  })

  it.each([
    ['thc', 'THC', ['IRCAK', 'SRUS', 'UCAK']],
    ['oksazepam', 'Oksazepam', ['OXA', 'DIAZ']],
  ])('har ingen koder eller vei til fortolkningen på #/stoff/%s', async (slug, navn, koder) => {
    window.location.hash = `#/stoff/${slug}`
    await visApp()
    await stoffsideFor(navn)
    expect(screen.queryByRole('button', { name: /fortolkning/i })).toBeNull()
    const identitet = stoffsiden()!.querySelector('.identitet')!.textContent!
    for (const kode of koder) expect(identitet, kode).not.toContain(kode)
  })

  it('lar fortolkningen ligge i ro mens stoffsiden vises', async () => {
    // Utklippstavlen er user-events egen, og er tom når testen starter.
    const user = userEvent.setup()
    await visApp()
    await velgNortriptylin(user)
    window.location.hash = '#/stoff/nortriptylin'
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    await stoffsideFor('Nortriptylin')

    // Talltastene velger bånd i fortolkningen, men ikke herfra.
    await user.keyboard('1')
    await user.keyboard('{Enter}')
    expect(await navigator.clipboard.readText()).toBe('')

    // Esc lukker siden, og fortolkningen står der den sto.
    await user.keyboard('{Escape}')
    await waitFor(() => expect(fortolkningen().hidden).toBe(false))
    expect(kodene()).toContain('NOR')
    // Nå virker tastene igjen: 1 kopierer kommentaren for det første båndet.
    await user.keyboard('1')
    await waitFor(async () => expect(await navigator.clipboard.readText()).toBe(dagensKommentar('NOR', 'under')))
  })
})

describe('fagsøket i hele appen', () => {
  it('hentes med Ctrl K fra fortolkningen, uten at det som skrives når tastene der', async () => {
    const user = userEvent.setup()
    // Utklippstavlen kan ha noe fra testen før; merket viser om noe kopieres.
    const urort = 'ingenting kopiert'
    await navigator.clipboard.writeText(urort)
    await visApp()
    await velgNortriptylin(user)

    await user.keyboard('{Control>}k{/Control}')
    const fagsok = screen.getByRole('combobox', { name: 'Søk i fagstoffet' })
    expect(document.activeElement).toBe(fagsok)
    // 1 ville kopiert kommentaren for det første båndet, og Esc gått tilbake til søket.
    await user.keyboard('1')
    await user.keyboard('{Escape}{Escape}')
    expect(await navigator.clipboard.readText()).toBe(urort)
    expect(screen.getByRole('region', { name: 'Velg konsentrasjon' })).toBeTruthy()

    // Enter uten valgt treff går til søkesiden, over fortolkningen. Pil opp
    // fra det første treffet velger ingen.
    await user.keyboard('amitriptylin{ArrowUp}{Enter}')
    expect(window.location.hash).toBe('#/sok?q=amitriptylin')
    expect(await screen.findByRole('heading', { level: 1, name: '«amitriptylin»' })).toBeTruthy()
    expect(fortolkningen().hidden).toBe(true)
    expect(await navigator.clipboard.readText()).toBe(urort)

    // Esc lukker søkesiden, og fortolkningen står der den sto.
    await user.keyboard('{Escape}')
    await waitFor(() => expect(fortolkningen().hidden).toBe(false))
    expect(within(fortolkningen()).getByRole('region', { name: 'Velg konsentrasjon' })).toBeTruthy()
    await user.keyboard('1')
    await waitFor(async () => expect(await navigator.clipboard.readText()).toBe(dagensKommentar('NOR', 'under')))
  })

  it('viser verktøyene som egne treff, og åpner et verktøy med Enter', async () => {
    okt.rolle = 'admin'
    const user = userEvent.setup()
    await visApp()
    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('bytte')
    const liste = await screen.findByRole('listbox', { name: 'Treff i søket' })
    const gruppe = within(liste).getByRole('group', { name: 'Verktøy' })
    expect(within(gruppe).getAllByRole('option').map((o) => o.textContent)).toEqual([
      expect.stringContaining('Bytte antidepressiv'),
      expect.stringContaining('Bytte antipsykotikum'),
    ])
    // Verktøyene står først, og piltastene går fra dem videre til fagstoffet.
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    expect(await screen.findByRole('heading', { level: 1, name: 'Bytte antipsykotikum' })).toBeTruthy()
    expect(window.location.hash).toBe('#/verktoy/bytte-antipsykotikum')
  }, 20_000)

  it('åpner et verktøy og verktøyoversikten direkte fra adressen, og følger tilbake og fram', async () => {
    okt.rolle = 'admin'
    window.location.hash = '#/verktoy/trappe-ned-antidepressiv'
    await visApp()
    // Verktøysidene er store; på en travel CI-server tar et sideskifte mer enn
    // standardgrensen på ett sekund (`VERKTOYSIDE_TID`).
    const overskrift = (navn: string) =>
      screen.findByRole('heading', { level: 1, name: navn }, { timeout: VERKTOYSIDE_TID })
    expect(await overskrift('Trappe ned antidepressiv')).toBeTruthy()
    expect(fortolkningen().hidden).toBe(true)
    expect(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' })).toBeTruthy()

    gaTil('#/verktoy')
    expect(await overskrift('Verktøy')).toBeTruthy()
    expect(screen.getAllByRole('link', { name: /^(Trappe ned antidepressiv|Bytte antidepressiv|Bytte antipsykotikum)/ })).toHaveLength(3)

    gaTil('#/verktoy/trappe-ned-antidepressiv')
    expect(await overskrift('Trappe ned antidepressiv')).toBeTruthy()
  }, 20_000)

  it('skjuler verktøyene for den som ikke er administrator: ingen menyvalg, ingen treff, og adressen gir forsiden', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/verktoy/bytte-antidepressiv'
    await visApp()
    await waitFor(() => expect(window.location.hash).toBe('#/'))
    expect(await screen.findByRole('button', { name: 'Åpne fortolkning' })).toBeTruthy()
    expect(fortolkningen().hidden).toBe(true)
    expect(screen.queryByRole('heading', { level: 1, name: 'Bytte antidepressiv' })).toBeNull()

    await user.keyboard('{Control>}m{/Control}')
    const meny = await iMenyen(user, 'Fag')
    expect(within(meny).queryByRole('button', { name: /^Verktøy/ })).toBeNull()
    expect(meny.querySelector('a[href^="#/verktoy"]')).toBeNull()
    await user.keyboard('{Escape}')

    await user.keyboard('{Control>}k{/Control}')
    await user.keyboard('bytte')
    // Verktøyene søkes i appen og ville stått der med én gang.
    expect(await screen.findByRole('button', { name: /^Vis alle treff/ })).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Verktøy' })).toBeNull()
    expect(screen.queryByRole('option', { name: /Bytte antidepressiv|Bytte antipsykotikum/ })).toBeNull()
    expect(document.querySelector('a[href^="#/verktoy"]')).toBeNull()
  }, 20_000)

  it('åpner søkesiden direkte fra adressen, med søket i feltet', async () => {
    window.location.hash = '#/sok?q=kvetiapin'
    await visApp()
    expect(await screen.findByRole('heading', { level: 1, name: '«kvetiapin»' })).toBeTruthy()
    expect((screen.getByRole('combobox', { name: 'Søk i fagstoffet' }) as HTMLInputElement).value).toBe('kvetiapin')
    // Databasen her har ingen side for kvetiapin, men stoffet står i
    // registeret og er indeksert likevel, med adressen etter nøkkelen.
    const sokesiden = screen.getByRole('region', { name: '«kvetiapin»' })
    const treff = await within(sokesiden).findByRole('link', { name: /Kvetiapin/ })
    expect(treff.getAttribute('href')).toBe('#/stoff/kvetiapin')
  })
})
