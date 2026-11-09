import { useLayoutEffect, useRef } from 'react'

/**
 * Hvor en boks står i vinduet, som CSS-variablene `--kant-topp` og
 * `--kant-bunn` (piksler fra toppen av vinduet) på boksen. Følges når siden
 * ruller, når vinduet endrer størrelse og når boksen selv blir høyere eller
 * lavere, høyst én gang per bilde.
 *
 * Brukes av noe som står fast (`position: sticky`) inni boksen og skal holde
 * seg helt innenfor vinduet: før det står fast, begynner det lenger ned enn
 * der det står fast, og mot slutten av boksen slutter det tidligere — begge
 * deler må trekkes fra høyden det kan få. Uten mål (i tester) settes ingenting,
 * og CSS-en bruker standardverdiene sine.
 */
export function useKantIVinduet<T extends HTMLElement = HTMLDivElement>() {
  const boks = useRef<T>(null)

  useLayoutEffect(() => {
    const element = boks.current
    if (!element) return
    let bilde = 0
    const maal = () => {
      bilde = 0
      const { top, bottom } = element.getBoundingClientRect()
      element.style.setProperty('--kant-topp', `${Math.round(top)}px`)
      element.style.setProperty('--kant-bunn', `${Math.round(bottom)}px`)
    }
    const planlegg = () => {
      if (!bilde) bilde = window.requestAnimationFrame(maal)
    }
    maal()
    window.addEventListener('scroll', planlegg, { passive: true })
    window.addEventListener('resize', planlegg)
    const storrelse = typeof ResizeObserver === 'function' ? new ResizeObserver(planlegg) : null
    storrelse?.observe(element)
    return () => {
      window.removeEventListener('scroll', planlegg)
      window.removeEventListener('resize', planlegg)
      storrelse?.disconnect()
      if (bilde) window.cancelAnimationFrame(bilde)
    }
  }, [])

  return boks
}
