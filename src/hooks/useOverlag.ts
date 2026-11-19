import { useLayoutEffect, type RefObject } from 'react'

/** Sant når nettleseren kan løfte elementer til det øverste laget (Popover API). */
function kanLofte(element: HTMLElement): boolean {
  return typeof element.showPopover === 'function' && typeof element.hidePopover === 'function'
}

/**
 * Løfter et element som flyter over innholdet — en nedtrekksmeny eller en
 * boble — til nettleserens øverste lag mens `apen` er sann.
 *
 * Det er appens portal: i det øverste laget klippes elementet aldri av
 * beholderen det står i (`overflow`, en rullende chat, et smalt panel), og
 * det legger seg over alt, også over et dialogvindu (`Modallag`) og
 * toppmenyen, uten `z-index`. Samtidig blir det stående der det står i
 * dokumentet, så tastaturrekkefølgen, fokusfellen i et dialogvindu,
 * hendelsene og stilarkenes regler (`.brukermeny .nedtrekk__panel`) virker
 * som før. Plasseringen settes av den som bruker det, festet til vinduet
 * (`useMenyplassering`, `useBobleplassering`).
 *
 * `popover="manual"`: nettleseren lukker ingenting selv. Escape går gjennom
 * lagstakken, og trykk utenfor håndteres av menyen eller boblen.
 *
 * Kan nettleseren det ikke (eldre nettlesere, testene), står elementet der
 * det står, festet til vinduet som før.
 */
export function useOverlag(element: RefObject<HTMLElement | null>, apen: boolean): void {
  // Før målingene i samme komponent, som er layout-effekter erklært etter
  // denne: et løftet element skal måles der det står i det øverste laget.
  useLayoutEffect(() => {
    const el = element.current
    if (!apen || !el || !kanLofte(el)) return
    el.setAttribute('popover', 'manual')
    try {
      el.showPopover()
    } catch {
      // Ikke i dokumentet ennå, eller alt åpent: står som før.
      el.removeAttribute('popover')
      return
    }
    return () => {
      // Å ta bort attributtet skjuler det også, men da uten unntak om det
      // alt er lukket.
      if (el.matches(':popover-open')) el.hidePopover()
      el.removeAttribute('popover')
    }
  }, [element, apen])
}
