import { useLayoutEffect, useState } from 'react'

/**
 * Uavhengige kolonner i et CSS-rutenett, uten at elementene flyttes i siden
 * («murverk»): hvert barn får `--spenn`, antallet rader det trenger, målt
 * fra sin egen høyde pluss luften mellom elementene. Stilarket bestemmer
 * resten, og kan dermed bytte mellom murverk og vanlig rutenett i en
 * media query uten at noe monteres på nytt (fokus og tilstand står):
 *
 *   grid-auto-rows: <liten rad>;  row-gap: 0;  grid-auto-flow: row dense;
 *   > *  { grid-column: <fast kolonne>; grid-row-end: span var(--spenn, 1); }
 *
 * Luften leses fra `column-gap`, så den er den samme begge veier. Er
 * `grid-auto-rows` ikke en lengde (vanlig rutenett), måles ingenting.
 * Barna følges når de endrer høyde (et panel som er hentet) og når de
 * kommer og går.
 */
export function useMurverk(): (flate: HTMLElement | null) => void {
  const [flate, setFlate] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    if (!flate) return
    const mal = () => {
      const stil = getComputedStyle(flate)
      const rad = parseFloat(stil.gridAutoRows)
      if (!(rad > 0)) return
      const luft = parseFloat(stil.columnGap) || 0
      for (const barn of flate.children) {
        if (!(barn instanceof HTMLElement)) continue
        const spenn = String(Math.max(1, Math.ceil((barn.getBoundingClientRect().height + luft) / rad)))
        if (barn.style.getPropertyValue('--spenn') !== spenn) barn.style.setProperty('--spenn', spenn)
      }
    }
    // Uten ResizeObserver (eldre nettlesere) måles det når barna kommer og går.
    const storrelse = typeof ResizeObserver === 'function' ? new ResizeObserver(mal) : null
    const folg = () => {
      storrelse?.disconnect()
      storrelse?.observe(flate)
      for (const barn of flate.children) storrelse?.observe(barn)
      mal()
    }
    const barn = typeof MutationObserver === 'function' ? new MutationObserver(folg) : null
    barn?.observe(flate, { childList: true })
    folg()
    return () => {
      storrelse?.disconnect()
      barn?.disconnect()
    }
  }, [flate])

  return setFlate
}
