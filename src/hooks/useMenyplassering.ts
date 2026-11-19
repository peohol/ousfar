import { useLayoutEffect, type RefObject } from 'react'
import { plasserMeny, type Menyjustering } from '../domain/menyplassering'

/**
 * Plasserer en åpen meny ved knappen sin, i vinduet (`plasserMeny`), og
 * følger knappen når siden eller en beholder rulles, når vinduet endres og
 * når menyen selv skifter størrelse (en skuff i den folder seg ut). Målet
 * settes rett på menyen (`left`, `top`, `max-height`) før den tegnes, så den
 * aldri blinker til i feil hjørne.
 *
 * Kalles etter `useOverlag` for samme element, så menyen måles der den står
 * i det øverste laget.
 */
export function useMenyplassering(
  knapp: RefObject<HTMLElement | null>,
  meny: RefObject<HTMLElement | null>,
  apen: boolean,
  justering: Menyjustering = 'slutt',
): void {
  useLayoutEffect(() => {
    const anker = knapp.current
    const el = meny.current
    if (!apen || !anker || !el) return

    let bilde = 0
    const mal = () => {
      bilde = 0
      const a = anker.getBoundingClientRect()
      // Den naturlige høyden, ikke den makshøyden en tidligere måling ga.
      el.style.maxHeight = ''
      const p = plasserMeny(
        { venstre: a.left, topp: a.top, bredde: a.width, hoyde: a.height },
        { bredde: el.offsetWidth, hoyde: el.scrollHeight },
        // Den synlige flaten, uten rullefeltet.
        { bredde: document.documentElement.clientWidth, hoyde: document.documentElement.clientHeight },
        justering,
      )
      el.style.left = `${p.venstre}px`
      el.style.top = `${p.topp}px`
      el.style.maxHeight = `${p.maksHoyde}px`
      el.dataset.side = p.side
    }
    const planlegg = () => {
      if (!bilde) bilde = requestAnimationFrame(mal)
    }

    mal()
    // `true`: også rulling inne i beholdere, som chatten.
    window.addEventListener('scroll', planlegg, true)
    window.addEventListener('resize', planlegg)
    const storrelse = typeof ResizeObserver === 'function' ? new ResizeObserver(planlegg) : null
    if (storrelse) {
      storrelse.observe(el)
      // Innholdet, for det som vokser inni en meny som alt har nådd makshøyden.
      for (const barn of el.children) storrelse.observe(barn)
    }
    return () => {
      window.removeEventListener('scroll', planlegg, true)
      window.removeEventListener('resize', planlegg)
      storrelse?.disconnect()
      if (bilde) cancelAnimationFrame(bilde)
      for (const egenskap of ['left', 'top', 'max-height'] as const) el.style.removeProperty(egenskap)
      delete el.dataset.side
    }
  }, [knapp, meny, apen, justering])
}
