/**
 * Verktøysiden med de klinisk godkjente reglene og preparatene i et lagret
 * FEST-uttrekk (P11.2/P11.4): uttrekket, klokken det gjelder for, lesingen
 * siden får preparatene fra, og svarene forskriveren gir før beregning.
 * Brukes av pilotgjennomgangen og av produksjonsflyten (VDR-5).
 */
import { readFileSync } from 'node:fs'
import { screen, within } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { Legemiddelutvalg } from '../../legemiddeldata/lesing'
import type { Festuttrekk } from '../../verktoy/regler/aksepttest'
import { tidFor } from '../../verktoy/regler/pilotmatrise'

/** Uttrekket i `fil`. Stien er relativ til repoet; i jsdom skriver Vite om `new URL(…, import.meta.url)` med en mal. */
export const pilotuttrekk = (fil: string) => JSON.parse(readFileSync(fil, 'utf8')) as Festuttrekk

/** Klokken uttrekket gjelder for, så FEST-kopien er fersk. */
export const pilotklokke = (u: Festuttrekk) => () => tidFor({ uttrekk: 'pilot' }, { pilot: u, aksept: u })

/** FEST-lesingen med preparatene i uttrekket, eventuelt endret med `endre`. */
export const pilotlesing = (u: Festuttrekk, endre?: (x: Legemiddelutvalg) => void) => ({
  les: vi.fn(async (_ider: string[]) => {
    const x = structuredClone(u.utvalg)
    endre?.(x)
    return x
  }),
})

/** Krysser av hver bekreftelse og svarer nei på hvert spørsmål og unntak; `ja` er unntakene og spørsmålene som gjelder. */
export async function besvarAlt(user: ReturnType<typeof userEvent.setup>, ja: RegExp[] = []) {
  const bekreft = screen.queryByRole('group', { name: 'Bekreft før beregning' })
  for (const boks of bekreft ? within(bekreft).getAllByRole('checkbox') : []) if (!(boks as HTMLInputElement).checked) await user.click(boks)
  const pasient = screen.queryByRole('group', { name: 'Om pasienten' })
  for (const gruppe of pasient ? within(pasient).getAllByRole('group') : []) {
    const tekst = gruppe.querySelector('legend')!.textContent!
    const radioer = within(gruppe).getAllByRole('radio')
    await user.click(radioer[ja.some((j) => j.test(tekst)) ? 0 : 1]!)
  }
}
