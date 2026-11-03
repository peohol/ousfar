import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Velger den bredeste utformingen av innholdet i en boks som får plass i
 * bredden, så en tabell kan bytte til en smalere utforming i stedet for å
 * rulle sidelengs.
 *
 * Utformingene er nummerert fra den bredeste (0) til den smaleste
 * (`utforminger - 1`), som alltid brukes når ingen andre får plass. Er et
 * element i boksen bredere enn boksen, huskes bredden utformingen
 * trengte, og den neste prøves. En bredere utforming tas i bruk igjen når
 * boksen blir minst så bred som den trengte. Alt skjer før skjermen tegnes,
 * så leseren ser aldri en utforming som ikke får plass. Uten mål (i tester)
 * brukes den bredeste.
 */
export function useFaarPlass<T extends HTMLElement = HTMLDivElement>(utforminger: number) {
  const boks = useRef<T>(null)
  const [valgt, setValgt] = useState(0)
  /** Bredden hver utforming trengte sist den ikke fikk plass. */
  const behov = useRef<number[]>([])

  useLayoutEffect(() => {
    const element = boks.current
    if (!element) return
    const maal = () => {
      const tilgjengelig = element.clientWidth
      const bredere = valgt - 1
      if (bredere >= 0 && tilgjengelig >= (behov.current[bredere] ?? 0)) {
        setValgt(bredere)
        return
      }
      if (valgt >= utforminger - 1) return
      const bredde = Math.max(0, ...[...element.children].map((barn) => barn.getBoundingClientRect().width))
      // En halv piksel slingringsmonn for avrunding av brøkdelsbredder.
      if (bredde > tilgjengelig + 0.5) {
        behov.current[valgt] = Math.ceil(bredde)
        setValgt(valgt + 1)
      }
    }
    maal()
    if (typeof ResizeObserver !== 'function') return
    const vakt = new ResizeObserver(maal)
    vakt.observe(element)
    // Skriftene kan lastes etter første oppsett og gjøre innholdet bredere.
    let aktiv = true
    document.fonts?.ready.then(() => aktiv && maal())
    return () => {
      aktiv = false
      vakt.disconnect()
    }
  }, [valgt, utforminger])

  return [boks, valgt] as const
}
