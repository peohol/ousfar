import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import type { Lengdeinnstilling } from '../auth/innstillinger'
import { useBevart } from '../oppdatering/Bevaring'

/** Lengden en flate kan ha langs kanten som dras (bredden eller høyden), i piksler. */
export interface Lengdegrenser {
  minst: number
  mest: number
}

/** Lengden flaten skal ha nå, og grensene den kan ha. */
export interface Lengdemaal extends Lengdegrenser {
  lengde: number
}

/**
 * Kanten håndtaket står på. Dras den utover, blir flaten større: bredere for
 * `venstre` og `hoyre`, høyere for `bunn`.
 */
export type Kant = 'venstre' | 'hoyre' | 'bunn'

/** Hvor mange piksler én piltast flytter kanten, og med Shift. */
const STEG = 16
const LANGT_STEG = 64

/**
 * Hvor mange piksler en CSS-lengde (gjerne et token, som `var(--x)`) er inne
 * i `i`, som bredde eller som høyde. Lengden måles på et usynlig element, så
 * CSS forblir eneste kilde til grensene, også når de avhenger av vinduet eller
 * av flaten (`cqh`).
 */
export function maalLengde(i: HTMLElement, lengde: string, akse: 'bredde' | 'hoyde' = 'bredde'): number {
  const prove = document.createElement('div')
  const [maalt, flat] = akse === 'bredde' ? ['width', 'height'] : ['height', 'width']
  prove.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;${flat}:0;${maalt}:${lengde}`
  i.appendChild(prove)
  const { width, height } = prove.getBoundingClientRect()
  prove.remove()
  return akse === 'bredde' ? width : height
}

const klem = (lengde: number, { minst, mest }: Lengdegrenser) => Math.round(Math.min(mest, Math.max(minst, lengde)))

interface Grep {
  peker: number
  start: number
  startlengde: number
  grenser: Lengdegrenser
}

/**
 * Kanten på en flate som kan dras for å gjøre flaten større eller mindre:
 * bredere eller smalere i en side, høyere eller lavere i bunnen.
 *
 * Pekeren drar kanten; et dobbeltklikk setter flaten tilbake til den minste
 * lengden, eller til det flaten har av seg selv (`onNullstill`). For
 * tastaturet og skjermleserne er håndtaket en skillelinje
 * (`role="separator"`) som tar imot fokus: piltastene flytter kanten (med
 * Shift i større steg), og Home og End gir minste og største lengde.
 *
 * Håndtaket eier ikke lengden. Den som bruker det, viser lengden underveis
 * (`onEndre`) og lagrer den når draget er sluppet eller tasten er sluppet
 * (`onFerdig`). Lengden og grensene måles når de trengs (`maal`), så de
 * følger vinduet; håndtaket står i flaten, så den kan finnes fra det. Mål lengden flaten skal ha, ikke den den har: glir flaten
 * mot en ny lengde, er den underveis en annen.
 */
export function Kanthandtak({
  etikett,
  kant = 'venstre',
  maal: maalFlate,
  onEndre,
  onFerdig,
  onNullstill,
}: {
  /** Navnet skjermlesere oppgir. */
  etikett: string
  kant?: Kant
  /** Måler flaten; får håndtaket, som står i den. */
  maal: (handtak: HTMLDivElement) => Lengdemaal
  /** Lengden mens den endres. */
  onEndre: (lengde: number) => void
  /** Lengden når den er ferdig endret, til lagring. */
  onFerdig: (lengde: number) => void
  /** Dobbeltklikket gir flaten lengden den har av seg selv, i stedet for den minste. */
  onNullstill?: () => void
}) {
  const grep = useRef<Grep | null>(null)
  const element = useRef<HTMLDivElement>(null)
  const [drar, setDrar] = useState(false)
  const [verdi, setVerdi] = useState<Lengdemaal>({ lengde: 0, minst: 0, mest: 0 })
  // Lengden tastene har endret til, og som lagres når tasten slippes.
  const tastet = useRef<number | null>(null)
  const loddrett = kant === 'bunn'
  const retning = kant === 'venstre' ? -1 : 1
  // Tastene som flytter kanten mot høyre eller ned, og mot venstre eller opp.
  const [fram, tilbake] = loddrett ? ['ArrowDown', 'ArrowUp'] : ['ArrowRight', 'ArrowLeft']
  const posisjon = (event: PointerEvent) => (loddrett ? event.clientY : event.clientX)
  const ord = loddrett ? 'høyde' : 'bredde'

  /** Lengden og grensene nå, også for skjermleserne. */
  const maal = () => {
    const m = maalFlate(element.current!)
    const naa = { ...m, lengde: klem(m.lengde, m) }
    setVerdi(naa)
    return naa
  }
  // Det holder å måle når håndtaket kommer fram; siden måles det når det tas i bruk.
  useLayoutEffect(() => void maal(), [])

  const sett = (lengde: number, g: Lengdegrenser) => {
    const ny = klem(lengde, g)
    setVerdi({ ...g, lengde: ny })
    onEndre(ny)
    return ny
  }

  const paaNed = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    // Ingen markering av tekst og ingen fokusring mens det dras.
    event.preventDefault()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    const { lengde, ...g } = maal()
    grep.current = { peker: event.pointerId, start: posisjon(event), startlengde: lengde, grenser: g }
    setDrar(true)
  }

  const paaFlytt = (event: PointerEvent<HTMLDivElement>) => {
    const g = grep.current
    if (!g || g.peker !== event.pointerId) return
    sett(g.startlengde + retning * (posisjon(event) - g.start), g.grenser)
  }

  const slipp = (event: PointerEvent<HTMLDivElement>) => {
    const g = grep.current
    if (!g || g.peker !== event.pointerId) return
    grep.current = null
    setDrar(false)
    const ny = klem(g.startlengde + retning * (posisjon(event) - g.start), g.grenser)
    if (ny !== g.startlengde) onFerdig(ny)
  }

  // Et drag som avbrytes (ikke slippes), setter lengden tilbake.
  const avbryt = () => {
    const g = grep.current
    if (!g) return
    grep.current = null
    setDrar(false)
    onEndre(g.startlengde)
  }

  const paaTast = (event: KeyboardEvent<HTMLDivElement>) => {
    const { lengde, ...g } = maal()
    const steg = event.shiftKey ? LANGT_STEG : STEG
    const ny =
      event.key === tilbake
        ? lengde - retning * steg
        : event.key === fram
          ? lengde + retning * steg
          : event.key === 'Home'
            ? g.minst
            : event.key === 'End'
              ? g.mest
              : null
    if (ny === null) return
    event.preventDefault()
    tastet.current = sett(ny, g)
  }

  const paaTastOpp = () => {
    if (tastet.current === null) return
    onFerdig(tastet.current)
    tastet.current = null
  }

  return (
    <div
      ref={element}
      className="kanthandtak"
      data-kant={kant}
      data-drar={drar || undefined}
      role="separator"
      aria-orientation={loddrett ? 'horizontal' : 'vertical'}
      aria-label={etikett}
      aria-valuenow={verdi.lengde}
      aria-valuemin={verdi.minst}
      aria-valuemax={verdi.mest}
      aria-valuetext={`${verdi.lengde} piksler`}
      tabIndex={0}
      title={`${etikett}. Dobbeltklikk for ${onNullstill ? `vanlig ${ord}` : `minste ${ord}`}.`}
      onPointerDown={paaNed}
      onPointerMove={paaFlytt}
      onPointerUp={slipp}
      onPointerCancel={avbryt}
      onLostPointerCapture={avbryt}
      onDoubleClick={() => {
        if (onNullstill) return onNullstill()
        const g = maal()
        onFerdig(sett(g.minst, g))
      }}
      onFocus={() => void maal()}
      onKeyDown={paaTast}
      onKeyUp={paaTastOpp}
    />
  )
}

/**
 * Lengden brukeren har dratt en flate til med {@link Kanthandtak}, eller
 * `null` for den flaten har av seg selv. Den bevares gjennom en oppdatering av
 * appen (`navn`) og lagres på brukeren (`innstilling`), så den følger
 * brukeren fra side til side og fra maskin til maskin. Har brukeren alt dratt
 * her før den lagrede er hentet, vinner det.
 *
 * Mens det dras, viser den som bruker håndtaket lengden selv; `endrer()` sier
 * fra om at det er i gang, og `sett()` lagrer den ferdige lengden.
 */
export function useDrattLengde(navn: string, innstilling: Lengdeinnstilling | null) {
  const [lengde, setLengde] = useBevart<number | null>(innstilling ? navn : null, () => innstilling?.sist?.() ?? null)
  const endret = useRef(false)

  useEffect(() => {
    if (!innstilling) return
    void innstilling.hent().then((lagret) => !endret.current && setLengde(lagret), () => undefined)
  }, [innstilling, setLengde])

  const endrer = useCallback(() => void (endret.current = true), [])
  const sett = useCallback(
    (ny: number | null) => {
      endret.current = true
      setLengde(ny)
      void innstilling?.lagre(ny).catch(() => undefined)
    },
    [innstilling, setLengde],
  )
  return { lengde, endrer, sett }
}
