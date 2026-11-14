// @vitest-environment jsdom
/**
 * EtG og EtS etter en oppdatering av appen: tilfellet som var valgt, står i
 * scenarioregelsettet fra databasen. Mens reglene hentes, når de ikke kunne
 * hentes, og når de ikke lenger har tilfellet, viser modulen valget av
 * tilfelle med statusen til reglene, aldri en tom side. Har reglene tilfellet,
 * kommer innlimingen tilbake som før.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/** Svaret på `les_scenarioregler`: reglene, en feil, eller ingen ennå. */
const regler = vi.hoisted(() => ({ svar: 'klar' as 'klar' | 'feil' | 'laster' }))

vi.mock('../auth/okt', () => ({
  useProfil: () => ({ role: 'user', first_name: 'Lars', last_name: 'Leser', username: 'leser' }),
}))
vi.mock('../auth/klient', async () => {
  const { scenarioregeldata } = await import('./hjelp/etggrunnlag')
  const { OUS_KATALOGSVAR } = await import('./hjelp/ouskatalogkilde')
  return {
    klient: () => ({
      rpc: async (funksjon: string) => {
        if (funksjon === 'les_analyttkatalog') return { data: OUS_KATALOGSVAR, error: null }
        if (funksjon === 'les_scenarioregler') {
          if (regler.svar === 'laster') return new Promise(() => {})
          if (regler.svar === 'feil') return { data: null, error: { message: 'Nede.' } }
          return { data: scenarioregeldata(), error: null }
        }
        return { data: null, error: null }
      },
    }),
  }
})
vi.mock('../components/konto/Kontomeny', () => ({ Kontomeny: () => null }))

const { default: App } = await import('../App')
const { TipsLag } = await import('../components/Tips')
const { ShortcutVisibilityProvider } = await import('../hooks/useShortcutVisibility')
const { LAGRINGSNOKKEL, glemBildet } = await import('../oppdatering/bevaring')
const { initialState } = await import('../state')
const { ETG_ANALYTT } = await import('../domain/ouskatalog')
const { ETG_ALTERNATIVER } = await import('./hjelp/etggrunnlag')

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= function () {}
  window.scrollTo = () => {}
  window.scrollBy = () => {}
})

beforeEach(() => {
  regler.svar = 'klar'
  window.location.hash = ''
})

afterEach(() => {
  cleanup()
  glemBildet()
  sessionStorage.clear()
})

/** Appen slik den starter etter en oppdatering, med EtG-modulen og tilfellet `etgValg` valgt før. */
async function etterOppdatering(etgValg: string) {
  const fortolkning = { ...initialState, analyte: ETG_ANALYTT.kode, etgValg }
  sessionStorage.setItem(LAGRINGSNOKKEL, JSON.stringify({ tatt: Date.now(), eier: null, verdier: { fortolkning }, rulling: [] }))
  render(
    <TipsLag>
      <ShortcutVisibilityProvider>
        <App />
      </ShortcutVisibilityProvider>
    </TipsLag>,
  )
  await waitFor(() => expect(document.querySelector('.port[aria-busy]')).toBeNull())
}

const innliming = () => screen.queryByRole('region', { name: 'Lim inn kommentarene' })

describe('et valgt EtG-tilfelle etter en oppdatering', { timeout: 20_000 }, () => {
  const valgt = ETG_ALTERNATIVER[0]!.id

  it('kommer tilbake til innlimingen når reglene har tilfellet', async () => {
    await etterOppdatering(valgt)
    expect(await screen.findByRole('region', { name: 'Lim inn kommentarene' })).toBeTruthy()
  })

  it('sier at reglene hentes, mens de hentes', async () => {
    regler.svar = 'laster'
    await etterOppdatering(valgt)
    expect(await screen.findByText('Fortolkningsreglene hentes …')).toBeTruthy()
    expect(innliming()).toBeNull()
  })

  it('sier fra når reglene ikke kunne hentes, med veien til å prøve igjen', async () => {
    regler.svar = 'feil'
    await etterOppdatering(valgt)
    expect((await screen.findByRole('alert')).textContent).toContain('Nede.')
    expect(screen.getByRole('button', { name: 'Prøv igjen' })).toBeTruthy()
    expect(innliming()).toBeNull()
  })

  it('viser valget på nytt når reglene ikke lenger har tilfellet', async () => {
    await etterOppdatering('finnes-ikke-lenger')
    expect(await screen.findByText('Påvist i denne prøven')).toBeTruthy()
    expect(innliming()).toBeNull()
  })
})
