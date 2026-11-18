import { useCallback, useEffect, useRef, useState } from 'react'
import { malFraAdresse, type Lenkemal } from '../direktelenker/mal'
import type { Analyttkatalog } from '../domain/analyttkatalog'
import { adresse, FORSIDE, kanoniskAdresse, lesRute, sammeRute, type Rute } from '../domain/rute'
import { STOFFREGISTER, type Stoffregister } from '../domain/stoffregister'

/** Det adressene tolkes med: stoffregisteret med koblingene, og analyttkatalogen. */
export interface Adressegrunnlag {
  register: Stoffregister
  katalog?: Analyttkatalog
}

/**
 * Skriver en eldre adresse til en fagside — et navn, et alias eller en gammel
 * analyttadresse som `#/analytt/HBUP` — om til den kanoniske, uten å legge
 * noe nytt i historikken. Tilbakeknappen går da dit man kom fra, ikke til den
 * gamle adressen.
 */
function rettAdressen({ register, katalog }: Adressegrunnlag): void {
  const kanonisk = kanoniskAdresse(window.location.hash, register, katalog)
  if (kanonisk) window.history.replaceState(window.history.state, '', kanonisk)
}

/** Nøkkelen appen bruker i `history.state` for inngangsveien. */
const INNGANGSVEI = 'ousfarFra'

/**
 * Adressen brukeren kom fra til oppføringen som står i historikken nå, når
 * hen kom dit fra en side i appen. `null` når oppføringen er den appen ble
 * åpnet på (et bokmerke, en lenke utenfra, en ny fane); `undefined` når
 * appen ikke har sett oppføringen før.
 */
export function inngangsvei(): string | null | undefined {
  const tilstand: unknown = window.history.state
  if (!tilstand || typeof tilstand !== 'object' || !(INNGANGSVEI in tilstand)) return undefined
  const fra = (tilstand as Record<string, unknown>)[INNGANGSVEI]
  return typeof fra === 'string' ? fra : null
}

/** Tilstanden i historikken med inngangsveien `fra`, og det andre som sto der. */
function medInngangsvei(fra: string | null): Record<string, unknown> {
  const tilstand: unknown = window.history.state
  return { ...(tilstand && typeof tilstand === 'object' ? tilstand : {}), [INNGANGSVEI]: fra }
}

/** Merker oppføringen som står nå med inngangsveien, om den ikke alt har en. */
function merk(fra: string | null): void {
  if (inngangsvei() === undefined) window.history.replaceState(medInngangsvei(fra), '')
}

/**
 * Skriver adressefeltet om til `hash` uten en ny oppføring i historikken, og
 * sier fra til appen som når adressen endres. I motsetning til
 * `location.replace` beholder oppføringen inngangsveien sin, så `tilbake`
 * ikke tror at siden ble åpnet fra en side i appen som ikke står der.
 */
export function erstattAdressen(hash: string): void {
  if (window.location.hash === hash) return
  window.history.replaceState(window.history.state, '', hash)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** Veien til en annen side, og veien tilbake. */
export type Ruteveier = [
  rute: Rute,
  gaaTil: (rute: Rute, valg?: { erstatt?: boolean }) => void,
  /**
   * Tilbake dit brukeren kom fra i appen, som nettleserens tilbakeknapp. Ble
   * siden åpnet direkte, går den til `reserve` (forsiden) og skriver
   * adressen om, så brukeren aldri sendes ut av appen.
   */
  tilbake: (reserve?: Rute) => void,
]

/**
 * Ruten adressefeltet peker på, og veien til en annen. En gammel adresse til
 * en analytt tolkes med koblingene og katalogen i `grunnlag`.
 *
 * Adressefeltet er fasit: tilbake- og framknappene i nettleseren, et bokmerke
 * og en lenke åpnet i samme fane går alle gjennom `hashchange`, og appen
 * følger med. En ny rute legges i historikken, så tilbakeknappen går dit man
 * kom fra. Med `erstatt` skrives adressen om uten å legge noe i historikken,
 * for en adresse som bare skal følge med på noe som alt har skjedd.
 *
 * En direktelenke (`#/diskusjon/<id>`, `#/ide/<id>`, se `direktelenker/mal.ts`)
 * er ingen side: den gis til `onDirektelenke`, som finner ut hvor den fører,
 * og adressefeltet står på siden man var på (eller fortolkningen, når appen
 * ble åpnet med lenken) til den har funnet det.
 *
 * Hver oppføring i historikken husker adressen brukeren kom fra i appen
 * ({@link inngangsvei}). En oppføring appen lager selv, eller som kommer av en
 * lenke i appen, får siden brukeren sto på; den appen ble åpnet på, får
 * ingen. Tilstanden følger oppføringen, så tilbake- og framknappen og en
 * oppdatering av siden bevarer den. `tilbake` går derfor ett steg tilbake i
 * historikken bare når forrige oppføring er en side i appen, og ellers til
 * forsiden.
 */
export function useRute(
  onDirektelenke?: (mal: Lenkemal) => void,
  grunnlag: Adressegrunnlag = { register: STOFFREGISTER },
): Ruteveier {
  const tolkning = useRef(grunnlag)
  tolkning.current = grunnlag
  // En direktelenke er ingen side; appen står på forsiden til den er fulgt.
  const [rute, setRute] = useState<Rute>(() =>
    malFraAdresse(window.location.hash) ? FORSIDE : lesRute(window.location.hash, grunnlag.register, grunnlag.katalog),
  )
  const gjeldende = useRef(rute)
  gjeldende.current = rute
  const tilLenke = useRef(onDirektelenke)
  tilLenke.current = onDirektelenke

  useEffect(() => {
    /** Følger en direktelenke i adressefeltet. Sant når det var en. */
    const folgLenke = () => {
      const mal = malFraAdresse(window.location.hash)
      if (!mal) return false
      window.history.replaceState(window.history.state, '', adresse(gjeldende.current))
      tilLenke.current?.(mal)
      return true
    }
    if (!folgLenke()) rettAdressen(tolkning.current)
    // Oppføringen appen ble åpnet på, har ingen side i appen foran seg.
    merk(null)
    const oppdater = () => {
      // En ny oppføring fra en lenke i appen eller adressefeltet: brukeren kom
      // fra siden som sto. En oppføring tilbake- eller framknappen går til, er
      // alt merket og beholder sin.
      merk(adresse(gjeldende.current))
      if (folgLenke()) return
      rettAdressen(tolkning.current)
      setRute((forrige) => {
        const ny = lesRute(window.location.hash, tolkning.current.register, tolkning.current.katalog)
        return sammeRute(forrige, ny) ? forrige : ny
      })
    }
    window.addEventListener('hashchange', oppdater)
    return () => window.removeEventListener('hashchange', oppdater)
  }, [])

  const gaaTil = useCallback((ny: Rute, { erstatt = false }: { erstatt?: boolean } = {}) => {
    if (window.location.hash !== adresse(ny)) {
      if (erstatt) window.history.replaceState(window.history.state, '', adresse(ny))
      else window.history.pushState(medInngangsvei(adresse(gjeldende.current)), '', adresse(ny))
    }
    gjeldende.current = ny
    setRute((forrige) => (sammeRute(forrige, ny) ? forrige : ny))
  }, [])

  const tilbake = useCallback(
    (reserve: Rute = FORSIDE) => {
      if (inngangsvei()) window.history.back()
      else gaaTil(reserve, { erstatt: true })
    },
    [gaaTil],
  )

  return [rute, gaaTil, tilbake]
}
