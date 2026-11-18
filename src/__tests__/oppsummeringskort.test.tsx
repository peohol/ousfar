// @vitest-environment jsdom
/**
 * Oppsummeringspanelet (`src/components/oppsummering/`) som forsiden og
 * gruppesiden bygger på: inntil tre rader der hele raden er lenken, egen
 * laste-, tom- og feiltilstand, og «Vis alle» bare når det er noe å vise.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { IKONER } from '../components/ikon/register'
import { Oppsummeringskort } from '../components/oppsummering/Oppsummeringskort'
import { type Hendelse, hendelsestid } from '../components/oppsummering/hendelse'

afterEach(cleanup)

const hendelse = (n: number, ekstra: Partial<Hendelse> = {}): Hendelse => ({
  id: `h${n}`,
  ikon: 'idea',
  tittel: `Hendelse ${n}`,
  hvor: 'Sandkassegruppen · Idé',
  til: `#/grupper/g1/ideer/i${n}`,
  ...ekstra,
})

describe('Oppsummeringskort', () => {
  it('viser høyst tre rader, og hele raden er lenken til selve hendelsen', () => {
    render(
      <Oppsummeringskort
        tittel="Aktuelt for deg"
        ikon="done"
        innhold={{ status: 'klar', hendelser: [1, 2, 3, 4, 5].map((n) => hendelse(n)) }}
        visAlle={{ tekst: 'Vis alle', til: '#/grupper' }}
      />,
    )
    const panel = screen.getByRole('region', { name: 'Aktuelt for deg' })
    const rader = within(panel).getAllByRole('listitem')
    expect(rader).toHaveLength(3)
    const lenke = within(rader[0]!).getByRole('link')
    expect(lenke.getAttribute('href')).toBe('#/grupper/g1/ideer/i1')
    expect(lenke.textContent).toContain('Hendelse 1')
    expect(lenke.textContent).toContain('Sandkassegruppen · Idé')
    // Ingen egne knapper på radene (D0, valg 2).
    expect(within(panel).queryAllByRole('button')).toHaveLength(0)
    expect(within(panel).getByRole('link', { name: /Vis alle/ }).getAttribute('href')).toBe('#/grupper')
  })

  it('sier ulest i tekst, ikke bare med prikken', () => {
    render(
      <Oppsummeringskort
        tittel="Aktuelt"
        ikon="done"
        innhold={{ status: 'klar', hendelser: [hendelse(1, { ulest: true }), hendelse(2)] }}
      />,
    )
    const [ulest, lest] = screen.getAllByRole('link')
    expect(ulest?.textContent).toContain('Ulest: Hendelse 1')
    expect(lest?.textContent).not.toContain('Ulest')
  })

  it('er én kursiv linje når det er tomt, uten «Vis alle»', () => {
    render(
      <Oppsummeringskort
        tittel="Mine grupper"
        ikon="sandkasse"
        innhold={{ status: 'klar', hendelser: [] }}
        tomtekst="Du er ikke med i noen grupper ennå."
        visAlle={{ tekst: 'Alle grupper', til: '#/grupper' }}
      />,
    )
    expect(screen.getByText('Du er ikke med i noen grupper ennå.')).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('sier fra mens det hentes, og viser ingen gamle rader', () => {
    render(<Oppsummeringskort tittel="Viktig nytt" ikon="bell" innhold={{ status: 'laster' }} />)
    const panel = screen.getByRole('region', { name: 'Viktig nytt' })
    expect(panel.getAttribute('aria-busy')).toBe('true')
    expect(within(panel).getByText(/Henter/)).toBeTruthy()
    expect(within(panel).queryByRole('link')).toBeNull()
  })

  it('henter bare dette panelet på nytt etter en feil', async () => {
    const provIgjen = vi.fn()
    render(
      <>
        <Oppsummeringskort tittel="Viktig nytt" ikon="bell" innhold={{ status: 'feil', provIgjen }} />
        <Oppsummeringskort tittel="Mine grupper" ikon="sandkasse" innhold={{ status: 'klar', hendelser: [hendelse(1)] }} />
      </>,
    )
    const feil = screen.getByRole('region', { name: 'Viktig nytt' })
    expect(within(feil).getByText('Kunne ikke hente dette nå.')).toBeTruthy()
    await userEvent.click(within(feil).getByRole('button', { name: 'Prøv igjen' }))
    expect(provIgjen).toHaveBeenCalledTimes(1)
    // Det andre panelet virker som før.
    expect(within(screen.getByRole('region', { name: 'Mine grupper' })).getAllByRole('link')).toHaveLength(1)
  })

  it('viser merknaden i stedet for tiden når den er gitt', () => {
    render(
      <Oppsummeringskort
        tittel="Oppgaver"
        ikon="oppgaver"
        innhold={{ status: 'klar', hendelser: [hendelse(1, { merknad: 'Pågår', tid: '2026-11-18T10:00:00Z' })] }}
      />,
    )
    expect(screen.getByRole('link').textContent).toContain('Pågår')
    expect(screen.getByRole('link').querySelector('time')).toBeNull()
  })
})

describe('ved', () => {
  it('kalles når raden eller «Vis alle» åpnes, og lenken følges likevel', async () => {
    const lest = vi.fn()
    const alle = vi.fn()
    render(
      <Oppsummeringskort
        tittel="Viktig nytt"
        ikon="bell"
        innhold={{ status: 'klar', hendelser: [hendelse(1, { til: '#/', ved: lest })] }}
        visAlle={{ tekst: 'Alle varsler', til: '#/', ved: alle }}
      />,
    )
    const rad = screen.getByRole('link', { name: /Hendelse 1/ })
    const klikk = new MouseEvent('click', { bubbles: true, cancelable: true })
    rad.dispatchEvent(klikk)
    expect(lest).toHaveBeenCalledTimes(1)
    expect(klikk.defaultPrevented).toBe(false)
    await userEvent.click(screen.getByRole('link', { name: /Alle varsler/ }))
    expect(alle).toHaveBeenCalledTimes(1)
  })
})

describe('mål uten egen adresse', () => {
  it('er en knapp som kaller ved, ikke en lenke til siden brukeren står på', async () => {
    const apne = vi.fn()
    const alle = vi.fn()
    render(
      <Oppsummeringskort
        tittel="Viktig nytt"
        ikon="bell"
        innhold={{
          status: 'klar',
          hendelser: [{ id: 'e1', ikon: 'publish', tittel: 'Ny forside', hvor: 'Appen · Endringslogg', ved: apne }],
        }}
        visAlle={{ tekst: 'Hele endringsloggen', ved: alle }}
      />,
    )
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    await userEvent.click(screen.getByRole('button', { name: /Ny forside/ }))
    expect(apne).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: /Hele endringsloggen/ }))
    expect(alle).toHaveBeenCalledTimes(1)
  })
})

describe('hendelsestid', () => {
  const naa = new Date(2026, 10, 18, 15, 0)
  it('gir klokkeslett i dag, «I går», dato i år og dato med år ellers', () => {
    expect(hendelsestid(new Date(2026, 10, 18, 14, 2).toISOString(), naa)).toMatch(/^14[.:]02$/)
    expect(hendelsestid(new Date(2026, 10, 17, 9, 0).toISOString(), naa)).toBe('I går')
    expect(hendelsestid(new Date(2026, 10, 12, 9, 0).toISOString(), naa)).toMatch(/^12\.\s?11\.?$/)
    expect(hendelsestid(new Date(2025, 0, 3, 9, 0).toISOString(), naa)).toMatch(/2025/)
    expect(hendelsestid('ikke en tid', naa)).toBe('')
  })
})

describe('ikonet samtale', () => {
  it('finnes i registeret, adskilt fra diskusjon', () => {
    expect(IKONER.samtale).toBeTruthy()
    expect(IKONER.samtale).not.toBe(IKONER.diskusjon)
  })
})
