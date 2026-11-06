// @vitest-environment jsdom
/**
 * Spørsmålslisten i steg 3 med spørsmål fra en kontrollert katalog: «Ukjent»
 * sier ved spørsmålet at det må avklares, et stoppende svar sier hva det
 * betyr, og «Ingen av disse» (B5) er et aktivt valg som bare gjelder de
 * ubesvarte stoppforholdene. Reglene i appen har ennå ingen kontrollert
 * katalog, så dette prøves her med spørsmål fra flyten (`vurderFlyt`).
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Sporsmalsliste } from '../components/verktoy/Sporsmalsliste'
import { SVARSETT } from '../verktoy/flyt/sporsmal'
import { UKJENT_FORKLARING } from '../verktoy/flyt/flyt'
import type { Flytsporsmal } from '../verktoy/flyt/typer'

afterEach(cleanup)

const sporsmal = (id: string, tekst: string, x: Partial<Flytsporsmal> = {}): Flytsporsmal => ({
  id,
  tekst,
  gruppe: 'stopp',
  kategori: 'sikkerhetsopplysning',
  art: 'valg',
  svar: SVARSETT.ja_nei_ukjent.map((a) => a.verdi),
  alternativer: SVARSETT.ja_nei_ukjent,
  stopperVed: ['ja'],
  forklaring: 'Syntetisk: da lager verktøyet ingen plan.',
  ...x,
})

describe('Spørsmålslisten med katalogens spørsmål', () => {
  it('sier ved spørsmålet hva «Ukjent» og et stoppende svar betyr, og ingenting ved et nei', () => {
    render(
      <Sporsmalsliste
        sporsmal={[
          sporsmal('a', 'Syntetisk forhold A?', { valgt: 'ukjent', forklaring: UKJENT_FORKLARING }),
          sporsmal('b', 'Syntetisk forhold B?', { valgt: 'ja' }),
          sporsmal('c', 'Syntetisk forhold C?', { valgt: 'nei' }),
        ]}
        grunner={[]}
        mangler={new Set()}
        onSvar={vi.fn()}
      />,
    )
    const ved = (navn: string) => screen.getByRole('radiogroup', { name: navn }).closest('li')!
    expect(ved('Syntetisk forhold A?').textContent).toContain(UKJENT_FORKLARING)
    expect(ved('Syntetisk forhold A?').querySelector('[data-tone="ukjent"]')).toBeTruthy()
    expect(ved('Syntetisk forhold B?').textContent).toContain('Syntetisk: da lager verktøyet ingen plan.')
    expect(ved('Syntetisk forhold C?').querySelector('.sporsmal__merknad')).toBeNull()
    // Merknaden er knyttet til svarvalget, så skjermleseren leser den med spørsmålet.
    const beskrevet = screen.getByRole('radiogroup', { name: 'Syntetisk forhold A?' }).getAttribute('aria-describedby')!
    expect(document.getElementById(beskrevet)!.textContent).toBe(UKJENT_FORKLARING)
  })

  it('tilbyr «Ingen av disse» bare når flyten sier det, og sender bare de ubesvarte forholdene', async () => {
    const user = userEvent.setup()
    const onIngenAvDisse = vi.fn()
    const liste = [sporsmal('a', 'Syntetisk forhold A?'), sporsmal('b', 'Syntetisk forhold B?', { valgt: 'ukjent', forklaring: UKJENT_FORKLARING })]
    const { rerender } = render(<Sporsmalsliste sporsmal={liste} grunner={[]} mangler={new Set()} onSvar={vi.fn()} ingenAvDisse={[]} onIngenAvDisse={onIngenAvDisse} />)
    expect(screen.queryByRole('button', { name: 'Ingen av disse' })).toBeNull()
    rerender(<Sporsmalsliste sporsmal={liste} grunner={[]} mangler={new Set()} onSvar={vi.fn()} ingenAvDisse={['a']} onIngenAvDisse={onIngenAvDisse} />)
    const knapp = within(screen.getByRole('group', { name: 'Forhold som stopper en automatisk plan' })).getByRole('button', { name: 'Ingen av disse' })
    // Ingenting er forhåndsutfylt.
    expect(screen.getAllByRole('radio').filter((r) => (r as HTMLInputElement).checked)).toHaveLength(1)
    await user.click(knapp)
    expect(onIngenAvDisse).toHaveBeenCalledWith(['a'])
  })
})
