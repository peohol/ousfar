import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { useBevart } from '../oppdatering/Bevaring'
import { lesRute, type Rute } from '../domain/rute'
import type { Stoffregister } from '../domain/stoffregister'
import { fokusIFagsok, lagLiggerOver } from '../hooks/useKeyboard'
import { useEscapelag } from '../hooks/lagstakk'
import { useTrykkUtenfor } from '../hooks/useTrykkUtenfor'
import { Ikonknapp } from './Ikonknapp'
import { HOVEDMENYEN, useHovedmenyen } from './Menynavigasjon'
import { MENYVALG, Menyniva } from './meny/Menyniva'
import { folgSti, type Menypunkt } from './meny/menytre'
import { Shortcut } from './Shortcut'
import { Ikon } from './ikon/Ikon'
import { useTips } from './Tips'

/**
 * Hovedmenyen (sidemenyen): et panel som glir inn fra venstre over appen, med
 * menytreet fra `useHovedmenyen` (Issue #604; `docs/navigasjon.md`,
 * «Hovedmenyen»). Et valg med undermeny erstatter innholdet i panelet med
 * nivået under; toppfeltet har nivåets navn, Tilbake og Lukk, og under det
 * står ett rulleområde i hele høyden.
 *
 * Hvor brukeren står i treet (stien), og søket i nivået, tas vare på med
 * `useBevart`, så menyen åpnes igjen der den sto, også etter en oppdatering.
 * Nivåene legger ingenting i nettleserens historikk. Rulleplassen på nivået
 * brukeren gikk fra, står der igjen når hen går tilbake.
 *
 * Menyen er et lag over appen, på linje med endringsloggen: `data-lag` sier
 * fra til `lagLiggerOver()`, slik at appens egne taster holder seg i ro mens
 * den står åpen, og Escape går gjennom lagstakken.
 */

/** Tasten som åpner og lukker menyen. */
const MENY_SNARVEI = 'Ctrl + M'

/** Merket menyen bærer som `data-lag` mens den står åpen. */
const MENY_LAG = 'meny'

/** Sant mens sidemenyen står åpen over appen. */
export function sidemenyenErApen(): boolean {
  return document.querySelector(`[data-lag="${MENY_LAG}"]`) !== null
}

/** Alt som kan få fokus i panelet. */
const FOKUSERBART = 'button, input, [href], [tabindex]:not([tabindex="-1"])'

/** Feltene i et element som faktisk kan nås nå (ikke i et lukket panel). */
function naabare(omrade: HTMLElement | null): HTMLElement[] {
  if (!omrade) return []
  return [...omrade.querySelectorAll<HTMLElement>(FOKUSERBART)].filter(
    (el) => !el.closest('[hidden]') && getComputedStyle(el).visibility !== 'hidden',
  )
}

/** Hvor fokus skal etter et bytte av nivå: nivåets navn, det første feltet, eller valget brukeren kom fra. */
type Fokusmal = 'tittel' | 'forste' | { valg: string }

/** Hvilken vei nivået kom fra, for den korte glidningen. */
type Retning = 'fram' | 'tilbake'

export interface SidemenyProps {
  /** Stoffregisteret med fagsidene og inndelingen i databasen (`byggStoffregister`). */
  register: Stoffregister
  /** Siden brukeren står på (`useRute`). Uten den leses adressen. */
  rute?: Rute
}

export function Sidemeny({ register, rute }: SidemenyProps) {
  const [apen, setApen] = useBevart('sidemeny', false)
  const [sti, setSti] = useBevart<string[]>('sidemeny/sti', [])
  const [sporring, setSporring] = useBevart('sidemeny/sok', '')
  const [retning, setRetning] = useState<Retning | null>(null)
  const panelId = useId()
  const tittelId = useId()
  const panel = useRef<HTMLElement>(null)
  const innhold = useRef<HTMLDivElement>(null)
  const tittel = useRef<HTMLHeadingElement>(null)
  const knapp = useRef<HTMLButtonElement | null>(null)
  /** Rulleplassen på hvert nivå brukeren har gått videre fra, etter stien. */
  const rulling = useRef(new Map<string, number>())
  const fokus = useRef<Fokusmal | null>(null)

  const apne = useCallback(() => setApen(true), [])

  /** Lukking gir fokus tilbake til knappen, som er synlig igjen. */
  const lukk = useCallback(() => {
    setApen(false)
    knapp.current?.focus()
  }, [])
  const trykkUtenfor = useTrykkUtenfor<HTMLDivElement>(lukk)

  const meny = useHovedmenyen({ apen, lukk, rute: rute ?? lesRute(window.location.hash), register })

  // Stien slik den finnes nå: et nivå brukeren ikke (lenger) har, er borte fra den.
  const nivaene = folgSti(meny.rot, sti)
  const gyldig = nivaene.slice(1).map((n) => n.punkt!.id)
  const { niva } = nivaene[nivaene.length - 1]!
  const forelder = nivaene[nivaene.length - 2]?.niva
  const nokkel = gyldig.join('/')

  /** Bytter nivå: rulleplassen der brukeren står, tas vare på, og søket tømmes. */
  const bytt = (ny: string[], vei: Retning, mal: Fokusmal) => {
    rulling.current.set(nokkel, innhold.current?.scrollTop ?? 0)
    fokus.current = mal
    setRetning(vei)
    setSporring('')
    setSti(ny)
  }
  const gaaInn = (punkt: Menypunkt, tastatur: boolean) => bytt([...gyldig, punkt.id], 'fram', tastatur ? 'forste' : 'tittel')
  const tilbake = () => bytt(gyldig.slice(0, -1), 'tilbake', { valg: gyldig[gyldig.length - 1]! })
  const tilRoten = () => bytt([], 'tilbake', { valg: gyldig[0]! })

  // Etter et bytte: et nytt nivå begynner øverst, et nivå brukeren går tilbake
  // til, står der det sto, og fokus flyttes dit det hører hjemme.
  useLayoutEffect(() => {
    const mal = fokus.current
    const el = innhold.current
    if (!mal || !el) return
    fokus.current = null
    el.scrollTop = retning === 'tilbake' ? (rulling.current.get(nokkel) ?? 0) : 0
    if (mal === 'tittel') tittel.current?.focus()
    else if (mal === 'forste') naabare(el)[0]?.focus()
    else [...el.querySelectorAll<HTMLElement>('[data-menyvalg]')].find((v) => v.dataset.menyvalg === mal.valg)?.focus({ preventScroll: true })
  }, [nokkel, retning])

  const knappenavn = 'Vis menyen'
  const knappetips = useTips(knappenavn, { skjermleser: false })
  // Tipset og fokuset skal på det samme elementet, så de to ref-ene slås sammen.
  const { ref: tipsRef, ...knappeprops } = knappetips.props
  const settKnapp = useCallback(
    (element: HTMLButtonElement | null) => {
      knapp.current = element
      tipsRef(element)
    },
    [tipsRef],
  )

  /**
   * Ctrl + M åpner og lukker menyen. Den ligger utenom `useKeyboard`, som med
   * vilje slipper alle modifikatorkombinasjoner gjennom til nettleseren; dette
   * er den ene snarveien i appen som trenger en.
   */
  useEffect(() => {
    function paaTast(event: KeyboardEvent) {
      if (!event.ctrlKey || event.metaKey || event.altKey) return
      if (event.key.toLowerCase() !== 'm') return
      // Et annet lag over appen — endringsloggen — har forrangen. Fagsøket
      // er et lag bare for tastene i siden bak; menyen åpnes også derfra.
      if (!apen && lagLiggerOver() && !fokusIFagsok()) return
      event.preventDefault()
      if (apen) lukk()
      else apne()
    }
    window.addEventListener('keydown', paaTast)
    return () => window.removeEventListener('keydown', paaTast)
  }, [apen, apne, lukk])

  // Escape lukker menyen, gjennom lagstakken: et dialogvindu åpnet fra menyen
  // lukkes først, og siden bak får aldri det samme trykket.
  useEscapelag(apen, lukk, panel)

  /**
   * Tabulator går rundt i panelet så lenge menyen står åpen. Menyknappen
   * ligger skjult bak panelet, og appen bak er mørklagt: fokus skal ikke kunne
   * havne på noe man ikke ser.
   */
  useEffect(() => {
    if (!apen) return
    function paaTast(event: KeyboardEvent) {
      if (event.key !== 'Tab') return

      const felter = naabare(panel.current)
      const forste = felter[0]
      const siste = felter[felter.length - 1]
      if (!forste || !siste) return

      // Panelet selv har fokus rett etter åpning, og ligger foran det første
      // feltet: derfra går veien bakover til det siste, ikke ut av menyen.
      const foran = document.activeElement === forste || document.activeElement === panel.current
      if (event.shiftKey && foran) {
        event.preventDefault()
        siste.focus()
      } else if (!event.shiftKey && document.activeElement === siste) {
        event.preventDefault()
        forste.focus()
      }
    }
    window.addEventListener('keydown', paaTast)
    return () => window.removeEventListener('keydown', paaTast)
  }, [apen])

  // Fokus følger med inn i panelet, ellers ville det blitt stående på
  // menyknappen som nå ligger skjult bak det. Panelet selv tar imot fokuset,
  // så tabulator begynner på toppen og ingen knapp trykkes ved et uhell.
  useEffect(() => {
    if (apen) panel.current?.focus()
  }, [apen])

  /**
   * Piltastene i panelet: opp og ned flytter mellom valgene (og søkefeltet),
   * også fra panelet selv rett etter åpning; høyre går inn i en undermeny og
   * venstre tilbake ett nivå. I søkefeltet flytter venstre og høyre markøren
   * som ellers.
   */
  const paaPil = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
    const mal = event.target as HTMLElement
    const iFelt = mal instanceof HTMLInputElement
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const valg = naabare(innhold.current).filter((el) => el.classList.contains(MENYVALG) || el.matches('input[type="search"]'))
      const her = valg.indexOf(mal)
      const neste = valg[event.key === 'ArrowDown' ? her + 1 : her < 0 ? valg.length - 1 : her - 1]
      if (!neste) return
      event.preventDefault()
      neste.focus()
    } else if (event.key === 'ArrowRight' && !iFelt && mal.hasAttribute('data-undermeny')) {
      event.preventDefault()
      mal.click()
    } else if (event.key === 'ArrowLeft' && !iFelt && gyldig.length > 0) {
      event.preventDefault()
      tilbake()
    }
  }

  // Ikke `lukk()`: siden som åpnes, tar fokus selv, og skal ikke få det revet
  // tilbake til menyknappen. Lenken gjør resten.
  const velg = useCallback(() => setApen(false), [])

  return (
    <>
      <button
        ref={settKnapp}
        type="button"
        className="menyknapp"
        aria-label={meny.varsel ? `${knappenavn} (${meny.varsel})` : knappenavn}
        aria-expanded={apen}
        aria-controls={panelId}
        aria-keyshortcuts="Control+M"
        onClick={apne}
        {...knappeprops}
      >
        <Ikon navn="menu" storrelse="ui" />
        <Shortcut>{MENY_SNARVEI}</Shortcut>
        {meny.varsel && <span className="nyprikk toppmeny__prikk" aria-hidden="true" />}
      </button>

      {/* Mørklegger og slører hovedinnholdet, og lukker menyen ved trykk. Den
          ligger som et eget lag i stedet for som et filter på innholdet, så
          verktøylinja og de andre faste elementene beholder plassen sin. */}
      <div
        className="menylag"
        {...trykkUtenfor}
        aria-hidden="true"
        {...(apen && { 'data-lag': MENY_LAG })}
      />

      <nav
        ref={panel}
        id={panelId}
        className="sidemeny"
        aria-label={HOVEDMENYEN}
        data-apen={apen ? 'ja' : 'nei'}
        tabIndex={-1}
        onKeyDown={paaPil}
      >
        <div className="sidemeny__topp" data-dybde={Math.min(gyldig.length, 2)}>
          {forelder && (
            <Ikonknapp
              ikon="back"
              etikett={`Tilbake til ${forelder.navn === HOVEDMENYEN ? 'hovedmenyen' : forelder.navn}`}
              variant="stille"
              className="sidemeny__tilbake"
              onClick={tilbake}
            />
          )}
          {gyldig.length > 1 && (
            <Ikonknapp ikon="menu" etikett="Til hovedmenyen" variant="stille" className="sidemeny__rot" onClick={tilRoten} />
          )}
          <h2 ref={tittel} id={tittelId} className="sidemeny__tittel" tabIndex={-1}>
            {niva.navn}
          </h2>
          <Ikonknapp ikon="close" etikett="Lukk menyen" className="sidemeny__lukk" onClick={lukk} />
        </div>

        {/* Det ene rulleområdet i panelet. */}
        <div ref={innhold} className="sidemeny__innhold">
          <div key={nokkel} className="menyniva" data-retning={retning ?? undefined} role="group" aria-labelledby={tittelId}>
            <Menyniva niva={niva} sporring={sporring} onSok={setSporring} onInn={gaaInn} onLenke={velg} />
          </div>
        </div>
      </nav>
    </>
  )
}
