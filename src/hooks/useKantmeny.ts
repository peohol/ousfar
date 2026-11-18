import { useEffect, useRef } from 'react'
import { lagSignal } from '../domain/signal'

/**
 * Menyene langs kantene på brede flater: chatmenyen til venstre og
 * diskusjonsmenyen til høyre (docs/design/d0-dashboard-chat/flyt.md §3).
 *
 * Begge kan stå åpne samtidig når siden mellom dem fortsatt får minst
 * `--lesebredde-minst`. Ellers vinner den som ble åpnet sist: den andre
 * lukkes til boblen sin, med det den viste bevart. Det samme gjelder når
 * vinduet gjøres smalere med begge åpne.
 */
export type Kantmeny = 'chat' | 'diskusjoner'

/** Det hver meny tar langs kanten når den står åpen, og det siden skal ha igjen (`chat.css`, `diskusjoner.css`, `tokens.css`). */
const BEHOV = 'calc(var(--chatpanel) + var(--chatkant) + var(--diskusjonspanel) + var(--diskusjonskant) + var(--lesebredde-minst))'

const apne = new Set<Kantmeny>()
let sist: Kantmeny | null = null
const apnet = lagSignal<Kantmeny>()

/** Sant når begge menyene og siden mellom dem får plass i vinduet. */
export function plassTilBegge(): boolean {
  const rot = document.body
  if (!rot) return true
  const prove = document.createElement('div')
  prove.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;height:0;width:${BEHOV}`
  rot.appendChild(prove)
  const behov = prove.getBoundingClientRect().width
  prove.remove()
  return behov <= document.documentElement.clientWidth + 0.5
}

/**
 * Melder menyen `navn` på mens den står åpen ved siden av siden (`apen`), og
 * lukker den med `lukk` når den andre åpnes, eller vinduet blir smalere, og
 * det ikke er plass til begge.
 */
export function useKantmeny(navn: Kantmeny, apen: boolean, lukk: () => void): void {
  const lukkRef = useRef(lukk)
  lukkRef.current = lukk

  useEffect(() => {
    if (!apen) return
    apne.add(navn)
    sist = navn
    apnet.send(navn)
    const vurder = () => {
      const andre = [...apne].some((m) => m !== navn)
      if (andre && sist !== navn && !plassTilBegge()) lukkRef.current()
    }
    const slutt = apnet.lytt((hvem) => {
      if (hvem !== navn) vurder()
    })
    window.addEventListener('resize', vurder)
    return () => {
      apne.delete(navn)
      if (sist === navn) sist = [...apne][0] ?? null
      slutt()
      window.removeEventListener('resize', vurder)
    }
  }, [navn, apen])
}
