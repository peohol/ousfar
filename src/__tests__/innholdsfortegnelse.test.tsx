// @vitest-environment jsdom
/**
 * Innholdsfortegnelsen for en side med seksjoner
 * (`src/components/seksjoner/Innholdsfortegnelse.tsx`): hvilke seksjoner som
 * står i den og i hvilken rekkefølge, at et trykk åpner seksjonen og ruller
 * dit, og knappen med nedtrekksmenyen der fortegnelsen ikke får plass.
 */
import { readFileSync } from 'node:fs'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Detaljkort, Seksjon } from '../components/seksjoner/Seksjon'
import { SeksjonsstyringKilde } from '../components/seksjoner/Seksjonsstyring'
import { Innholdsfortegnelse } from '../components/seksjoner/Innholdsfortegnelse'
import { TOPPMENYSPOR } from '../components/toppmeny/Toppmenykilde'

const rullet = vi.fn()

beforeAll(() => {
  window.matchMedia = ((sporring: string) => ({ matches: sporring.includes('reduce') })) as unknown as typeof window.matchMedia
  Element.prototype.scrollIntoView = function (this: Element, valg?: boolean | ScrollIntoViewOptions) {
    rullet(this, valg)
  }
  // Rullingen når brukeren selv åpner en seksjon i testen.
  window.scrollTo = (() => {}) as typeof window.scrollTo
})

beforeEach(() => rullet.mockClear())
afterEach(cleanup)

/** Venter til bildet etter neste tegning er klart, som styringen gjør før den ruller. */
const nesteBilde = () => act(() => new Promise<void>((ferdig) => requestAnimationFrame(() => ferdig())))

function Side({ seksjoner }: { seksjoner: readonly string[] }) {
  return (
    <SeksjonsstyringKilde>
      <Innholdsfortegnelse />
      {seksjoner.map((navn) => (
        <Seksjon key={navn} id={navn.toLowerCase()} tittel={navn} navn={navn} ikon="dose">
          <Detaljkort id="kort" tittel={`Kort i ${navn}`}>
            <p>Innhold i {navn}</p>
          </Detaljkort>
        </Seksjon>
      ))}
    </SeksjonsstyringKilde>
  )
}

const fortegnelsen = () => screen.getByRole('navigation', { name: 'Innhold på siden' })
const punktene = () => within(fortegnelsen()).getAllByRole('button')
/** Knappen i hodet til seksjonen, som åpner og lukker den. */
const seksjonsknapp = (navn: string) =>
  document.getElementById(`panel-${navn.toLowerCase()}`)!.querySelector<HTMLElement>(':scope > .skuff__hode .skuff__knapp')!

describe('innholdsfortegnelsen', () => {
  it('viser overskriftene til seksjonene i den rekkefølgen de står, uten detaljkortene', () => {
    const { rerender } = render(<Side seksjoner={['Dosering', 'Interaksjoner']} />)
    expect(punktene().map((p) => p.textContent)).toEqual(['Dosering', 'Interaksjoner'])
    // En seksjon som kommer til senere (dataene er hentet), står der den står på siden.
    rerender(<Side seksjoner={['Dosering', 'Preparater', 'Interaksjoner']} />)
    expect(punktene().map((p) => p.textContent)).toEqual(['Dosering', 'Preparater', 'Interaksjoner'])
    expect(within(fortegnelsen()).queryByText(/Kort i/)).toBeNull()
  })

  it('tar bare med seksjoner som har et navn, og vises ikke før siden har minst to', () => {
    const { rerender } = render(
      <SeksjonsstyringKilde>
        <Innholdsfortegnelse />
        <Seksjon id="dosering" tittel="Dosering" navn="Dosering">
          <p>Innhold</p>
        </Seksjon>
        <Seksjon id="uten" tittel="Uten navn">
          <p>Innhold</p>
        </Seksjon>
      </SeksjonsstyringKilde>,
    )
    expect(screen.queryByRole('navigation')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Innhold på siden' })).toBeNull()
    rerender(<Side seksjoner={['Dosering', 'Interaksjoner']} />)
    expect(fortegnelsen()).toBeTruthy()
  })

  it('åpner seksjonen, lukker den som sto åpen, ruller rett dit og flytter fokus til overskriften', async () => {
    const user = userEvent.setup()
    render(<Side seksjoner={['Dosering', 'Preparater', 'Interaksjoner']} />)
    await user.click(seksjonsknapp('Dosering'))
    expect(within(fortegnelsen()).getByRole('button', { name: 'Dosering' }).getAttribute('aria-current')).toBe('true')
    rullet.mockClear()

    await user.click(within(fortegnelsen()).getByRole('button', { name: 'Interaksjoner' }))
    await nesteBilde()
    expect(seksjonsknapp('Interaksjoner').getAttribute('aria-expanded')).toBe('true')
    expect(seksjonsknapp('Dosering').getAttribute('aria-expanded')).toBe('false')
    // Detaljkortene i seksjonen står som de sto.
    expect(screen.getByRole('button', { name: 'Kort i Interaksjoner' }).getAttribute('aria-expanded')).toBe('false')
    expect(rullet).toHaveBeenCalledWith(document.getElementById('panel-interaksjoner'), expect.objectContaining({ block: 'start' }))
    expect(document.activeElement).toBe(seksjonsknapp('Interaksjoner'))

    const merket = punktene().filter((p) => p.getAttribute('aria-current') === 'true')
    expect(merket.map((p) => p.textContent)).toEqual(['Interaksjoner'])
  })

  it('åpner seksjonene fra en nedtrekksmeny der den ikke får plass ved siden av innholdet', async () => {
    const user = userEvent.setup()
    render(<Side seksjoner={['Dosering', 'Preparater']} />)
    const knapp = screen.getByRole('button', { name: 'Innhold på siden' })
    await user.click(knapp)
    const meny = screen.getByRole('group', { name: 'Innhold på siden' })
    expect(within(meny).getAllByRole('button').map((b) => b.textContent)).toEqual(['Dosering', 'Preparater'])

    await user.click(within(meny).getByRole('button', { name: 'Preparater' }))
    await nesteBilde()
    expect(knapp.getAttribute('aria-expanded')).toBe('false')
    expect(seksjonsknapp('Preparater').getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(seksjonsknapp('Preparater'))

    await user.click(knapp)
    expect(within(screen.getByRole('group', { name: 'Innhold på siden' })).getByRole('button', { name: 'Preparater' }).getAttribute('aria-current')).toBe('true')
  })

  it('har sin plass i toppmenyen mellom søket i siden og hovedhandlingen', () => {
    expect(TOPPMENYSPOR.hoved).toEqual(['sidesok', 'innhold', 'hovedhandling'])
  })

  it('står enten ved siden av innholdet eller i toppmenyen, aldri begge, og ikke på utskrift', () => {
    const css = readFileSync('src/styles/innholdsfortegnelse.css', 'utf8')
    const bred = css.slice(css.indexOf('@media (min-width: 84em)'), css.indexOf('.innholdsfortegnelse__tittel'))
    expect(css.indexOf('.innholdsfortegnelse {\n  display: none;')).toBeGreaterThanOrEqual(0)
    expect(bred).toContain('position: fixed')
    expect(bred).toMatch(/\.innholdsmeny \{\s*display: none;/)
    expect(css.slice(css.indexOf('@media print'))).toMatch(/\.innholdsfortegnelse,\s*\.innholdsmeny/)
  })
})
