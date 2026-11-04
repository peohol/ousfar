/**
 * Hjelpere for den felles arbeidsflyten på verktøysidene (§3 i
 * `docs/verktøy-brukervennlighet-2026-11.md`): planpanelet i steg 4,
 * tidslinjen, formvalgene i steg 2, spørsmålene i steg 3 og kopien av planen.
 * Planen beregnes av seg selv når alt er besvart; hjelperne venter på den.
 */
import { screen, waitFor, within } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { expect } from 'vitest'

export type Bruker = ReturnType<typeof userEvent.setup>

/** Panelet i steg 4, der planen eller det som gjenstår står. */
export const planpanel = () => screen.getByRole('region', { name: /^Steg 4: / })

/** Tidslinjen i planen som vises, eller `null`. */
export const tidslinje = () => screen.queryByRole('list', { name: 'Planen dag for dag' })

/** Punktene i tidslinjen som [når, innhold]: «Dag 1–14» og teksten ved siden av. */
export const punkter = (rot: HTMLElement = screen.getByRole('list', { name: 'Planen dag for dag' })) =>
  [...rot.children].map((li) => [li.querySelector('.tidslinje__dager')!.textContent!, li.querySelector('.tidslinje__innhold')!.textContent!] as const)

/** Venter på planen med tittelen `tittel`. */
export const planen = (tittel: string | RegExp) => screen.findByRole('region', { name: tittel }, { timeout: 3000 })

/** Velger alternativet med verdien `verdi` i formvalget `navn` («Legemiddelform av escitalopram»), når FEST har svart. */
export async function velgForm(user: Bruker, navn: string | RegExp, verdi: string) {
  const gruppe = await screen.findByRole('radiogroup', { name: navn }, { timeout: 3000 })
  const radio = within(gruppe)
    .getAllByRole('radio')
    .find((r) => (r as HTMLInputElement).value === verdi)
  if (!radio) throw new Error(`Fant ikke ${verdi} i ${String(navn)}`)
  await user.click(radio)
}

/** Teksten som kopieres med «Kopier planen», når planen er beregnet. */
export async function kopier(user: Bruker) {
  await user.click(await screen.findByRole('button', { name: 'Kopier planen' }, { timeout: 3000 }))
  return navigator.clipboard.readText()
}

/** Ingen plan, og panelet i steg 4 sier hvorfor. */
export async function stoppet(grunn: RegExp) {
  await waitFor(
    () => {
      expect(tidslinje()).toBeNull()
      expect(planpanel().textContent).toMatch(grunn)
    },
    { timeout: 3000 },
  )
}

/** Gruppene med spørsmål som besvares Ja/Nei/Ukjent, og gruppen med avkrysningene (`Sporsmalsliste`). */
export const VALGGRUPPER = ['Forhold som stopper en automatisk plan', 'Forhold som påvirker planen'] as const
export const BEKREFTELSER = 'Bekreft før planen vises'

/** Teksten som stiller spørsmålet til en radiogruppe. */
const sporsmalstekst = (gruppe: HTMLElement) => document.getElementById(gruppe.getAttribute('aria-labelledby') ?? '')?.textContent ?? ''

/** Spørsmålet med teksten `tekst` (Ja/Nei/Ukjent). */
export const sporsmal = (tekst: string | RegExp) => screen.getByRole('radiogroup', { name: tekst })

/**
 * Svarer nei på hvert spørsmål og forhold, og krysser av hver bekreftelse; `ja`
 * er forholdene og spørsmålene som gjelder. Et svar kan vise nye bekreftelser,
 * så det fortsetter til ingenting er endret. Venter først på spørsmålene, som
 * kommer når steg 2 er fylt ut og FEST har svart.
 */
export async function besvarAlt(user: Bruker, ja: RegExp[] = []) {
  await waitFor(
    () => {
      expect(screen.getByRole('heading', { name: /^Steg 3(, utfylt)?: / })).toBeTruthy()
      expect(screen.queryByText('Spørsmålene kommer når steg 2 er fylt ut.')).toBeNull()
    },
    { timeout: 3000 },
  )
  for (;;) {
    let endret = false
    for (const navn of VALGGRUPPER) {
      const gruppe = screen.queryByRole('group', { name: navn })
      for (const valg of gruppe ? within(gruppe).getAllByRole('radiogroup') : []) {
        const onsket = within(valg).getByRole('radio', { name: ja.some((j) => j.test(sporsmalstekst(valg))) ? 'Ja' : 'Nei' }) as HTMLInputElement
        if (onsket.checked) continue
        await user.click(onsket)
        endret = true
      }
    }
    const bekreft = screen.queryByRole('group', { name: BEKREFTELSER })
    for (const boks of bekreft ? within(bekreft).getAllByRole('checkbox') : [])
      if (!(boks as HTMLInputElement).checked) {
        await user.click(boks)
        endret = true
      }
    if (!endret) return
  }
}
