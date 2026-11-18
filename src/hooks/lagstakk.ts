import { useEffect, useRef, type RefObject } from 'react'

/**
 * Lagstakken: hvem som får `Escape`.
 *
 * Lagene over siden — hovedmenyen, et nedtrekk — melder seg på mens de står
 * åpne, i den rekkefølgen de åpnes. Ett tastetrykk går bare til det øverste,
 * og det tas fra resten av appen, så det samme trykket aldri både lukker et
 * lag og gjør noe på siden bak (`docs/design/d0-dashboard-chat/flyt.md` §3–4).
 *
 * Et dialogvindu (`Modallag`) ligger alltid øverst og lukkes av nettleseren
 * selv. Står det et dialogvindu åpent, lar stakken derfor tasten være, med
 * mindre det øverste laget står inni vinduet, som et nedtrekk i et skjema.
 *
 * Et felt eller et element som alt har brukt tasten (`preventDefault`), går
 * foran alle lagene: søkefeltet i diskusjonsmenyen tømmes før noe lukkes.
 *
 * Sidene og fortolkningen under lagene hører etter `Escape` selv, og ligger i
 * ro så lenge et lag står åpent ({@link lagErApne}, `lagLiggerOver`).
 */

interface Lag {
  escape: () => void
  rot?: RefObject<HTMLElement | null>
}

const stakk: Lag[] = []
let lytter = false

/** Sant når et lag i stakken står åpent. */
export function lagErApne(): boolean {
  return stakk.length > 0
}

/** Det øverste dialogvinduet som står åpent. */
function overstDialog(): HTMLDialogElement | undefined {
  const apne = document.querySelectorAll<HTMLDialogElement>('dialog[open]')
  return apne[apne.length - 1]
}

function paaTast(event: KeyboardEvent): void {
  if (event.key !== 'Escape' || event.defaultPrevented) return
  if (event.ctrlKey || event.metaKey || event.altKey) return
  const overst = stakk[stakk.length - 1]
  if (!overst) return
  const dialog = overstDialog()
  const rot = overst.rot?.current
  if (dialog && !(rot && dialog.contains(rot))) return
  event.preventDefault()
  overst.escape()
}

/**
 * Melder et lag på i stakken mens `apen` er sann. `onEscape` kalles når laget
 * er øverst og brukeren trykker `Escape`. `rot` er elementet laget står i; det
 * avgjør om laget står inni et åpent dialogvindu.
 */
export function useEscapelag(apen: boolean, onEscape: () => void, rot?: RefObject<HTMLElement | null>): void {
  const handling = useRef(onEscape)
  handling.current = onEscape
  useEffect(() => {
    if (!apen) return
    const lag: Lag = { escape: () => handling.current(), rot }
    stakk.push(lag)
    if (!lytter) {
      window.addEventListener('keydown', paaTast)
      lytter = true
    }
    return () => {
      const plass = stakk.indexOf(lag)
      if (plass >= 0) stakk.splice(plass, 1)
    }
  }, [apen, rot])
}
