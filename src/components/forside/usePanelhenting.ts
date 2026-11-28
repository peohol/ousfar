import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProfil } from '../../auth/okt'
import { useArbeidskontekst } from '../../auth/rettigheter'

/**
 * Hentingen til ett panel på forsiden, den samme for forsidens egne paneler
 * og for paneler et eierprosjekt har registrert (docs/forside.md):
 *
 * - Ingenting hentes før rettighetene, og dermed fagmiljøet, er kjent
 *   (`useArbeidskontekst`), så panelet ikke hentes først uten og så med det.
 * - Det som er hentet, holdes per bruker, fagmiljø og panel mens appen står
 *   åpen, så panelet ikke blinker når brukeren kommer tilbake. Etter et
 *   fagmiljøbytte vises aldri det forrige fagmiljøets innhold, heller ikke
 *   mens det nye hentes.
 * - En henting som alt er ute, deles i stedet for å be om det samme igjen,
 *   og etter et fagmiljøbytte er panelene alt på vei ({@link forhentPaneler}).
 * - Panelet feiler for seg, og «Prøv igjen» henter bare det på nytt. Feiler
 *   en ny henting (også når serveren avviser tilgangen), vises feilen, ikke
 *   det som var hentet før, og det glemmes.
 * - Mister brukeren et panel, glemmes det som er hentet til det
 *   ({@link glemPanelerUtenTilgang}), og et panel brukeren ikke har, hentes
 *   ikke på forhånd.
 */
export type Panelhenting<T> = { status: 'laster' } | { status: 'feil'; provIgjen: () => void } | { status: 'klar'; svar: T }

/** Hvilke paneler (nøkkelen i `FORSIDEMODULER`) brukeren har nå. */
export type Paneltilgang = (modul: string) => boolean

/** Det som hentes: for arbeidskonteksten `fagmiljo` (fagmiljøets id, eller at brukeren ikke arbeider i noe). */
export type Panelhenter<T> = (fagmiljo: string) => Promise<T>

/** Hentingene som er på vei, per nøkkel. Et panel som monteres mens den samme hentingen er ute, venter på den. */
const underveis = new Map<string, Promise<unknown>>()

/**
 * Hentingene {@link forhentPaneler} startet før forsiden ble satt opp på nytt.
 * De står til panelet tar dem, også om de er ferdige før det, så panelet ikke
 * henter det samme igjen.
 */
const forhentet = new Map<string, Promise<unknown>>()

/** Det som er hentet, per nøkkel, mens appen står åpen. */
const hentet = new Map<string, unknown>()

/** Panelet (`modul`) hver nøkkel over hører til, så det som er hentet til et panel brukeren mister, kan glemmes. */
const nokkelpanel = new Map<string, string>()

/** Panelene som står på forsiden nå, med brukeren og hentingen deres. */
const viste = new Map<string, { bruker: string; modul: string; panel: string; hent: Panelhenter<unknown> }>()

/**
 * Nøkkelen et panel hentes og holdes under: bruker, fagmiljø og panel, og for
 * et panel som kan vise ulike utsnitt (som en annen dato), hvilket.
 */
const panelnokkel = (bruker: string, fagmiljo: string | null, panel: string) => `${bruker}:${fagmiljo}:${panel}`

function hentDelt<T>(nokkel: string, modul: string, hent: () => Promise<T>): Promise<T> {
  nokkelpanel.set(nokkel, modul)
  const tidlig = forhentet.get(nokkel)
  if (tidlig) {
    forhentet.delete(nokkel)
    return tidlig as Promise<T>
  }
  const pagaende = underveis.get(nokkel)
  if (pagaende) return pagaende as Promise<T>
  const henting = hent()
  underveis.set(nokkel, henting)
  const ferdig = () => {
    if (underveis.get(nokkel) === henting) underveis.delete(nokkel)
  }
  henting.then(ferdig, ferdig)
  return henting
}

/**
 * Glemmer alt som er hentet eller hentes til panelene brukeren ikke har nå,
 * så et panel som kommer tilbake, aldri viser det som ble hentet før
 * tilgangen forsvant. Kalles når rettighetene endres
 * (`useGlemPanelerUtenTilgang`).
 */
export function glemPanelerUtenTilgang(tilgang: Paneltilgang): void {
  for (const [nokkel, modul] of nokkelpanel) {
    if (tilgang(modul)) continue
    hentet.delete(nokkel)
    underveis.delete(nokkel)
    forhentet.delete(nokkel)
    nokkelpanel.delete(nokkel)
  }
}

/**
 * Begynner å hente panelene som står på forsiden, for arbeidskonteksten
 * `fagmiljo` etter et bytte, men bare dem brukeren har med de nye
 * rettighetene (`tilgang`). Forsiden settes opp på nytt først når katalogen
 * for det nye fagmiljøet er hentet; da er panelene alt på vei (eller hentet),
 * og panelene tar de samme hentingene i stedet for å be om dem igjen.
 */
export function forhentPaneler(fagmiljo: string | null, tilgang: Paneltilgang): void {
  forhentet.clear()
  if (fagmiljo === null) return
  for (const { bruker, modul, panel, hent } of viste.values()) {
    if (!tilgang(modul)) continue
    const nokkel = panelnokkel(bruker, fagmiljo, panel)
    const henting = hentDelt(nokkel, modul, () => hent(fagmiljo))
    henting.catch(() => undefined)
    forhentet.set(nokkel, henting)
  }
}

/**
 * Henter det panelet `modul` viser, med reglene over. `utsnitt` skiller det
 * panelet viser når det kan bla (for eksempel en dato), så hvert utsnitt
 * holdes for seg; uten det er det ett. `hent` kan være en ny funksjon ved hver
 * tegning: den siste brukes, og hentingen følger bare nøkkelen.
 */
export function usePanelhenting<T>(modul: string, hent: Panelhenter<T>, utsnitt?: string): Panelhenting<T> {
  const bruker = useProfil().id
  const fagmiljo = useArbeidskontekst()
  const panel = utsnitt === undefined ? modul : `${modul}:${utsnitt}`
  const nokkel = panelnokkel(bruker, fagmiljo, panel)
  const henter = useRef(hent)
  const [tilstand, setTilstand] = useState(() => ({ nokkel, svar: hentet.get(nokkel) as T | undefined, har: hentet.has(nokkel), feil: false }))
  const siste = useRef(0)

  // Den siste hentefunksjonen, før hentingen under bruker den.
  useEffect(() => {
    henter.current = hent
  })

  const last = useCallback(() => {
    if (fagmiljo === null) return
    const denne = (siste.current += 1)
    setTilstand((t) =>
      t.nokkel === nokkel ? { ...t, feil: false } : { nokkel, svar: hentet.get(nokkel) as T | undefined, har: hentet.has(nokkel), feil: false },
    )
    hentDelt(nokkel, modul, () => henter.current(fagmiljo)).then(
      (svar) => {
        if (denne !== siste.current) return
        hentet.set(nokkel, svar)
        setTilstand({ nokkel, svar, har: true, feil: false })
      },
      () => {
        if (denne !== siste.current) return
        // Det som var hentet før, vises ikke lenger: svaret kan være at tilgangen er borte.
        hentet.delete(nokkel)
        setTilstand({ nokkel, svar: undefined, har: false, feil: true })
      },
    )
  }, [nokkel, modul, fagmiljo])

  // Hentes når panelet kommer fram, og på nytt når fagmiljøet eller utsnittet
  // byttes. Et svar som kommer etter at panelet er tatt bort, tas ikke i bruk.
  useEffect(() => {
    last()
    return () => {
      siste.current += 1
    }
  }, [last])
  useEffect(() => {
    const post = { bruker, modul, panel, hent: (f: string) => henter.current(f) }
    viste.set(panel, post)
    return () => {
      if (viste.get(panel) === post) viste.delete(panel)
    }
  }, [bruker, modul, panel])

  // Det som er hentet for et annet fagmiljø, vises aldri, heller ikke mens det nye hentes.
  const gjelder = tilstand.nokkel === nokkel
  const { har, svar, feil } = tilstand
  return useMemo<Panelhenting<T>>(() => {
    if (gjelder && har) return { status: 'klar', svar: svar as T }
    return gjelder && feil ? { status: 'feil', provIgjen: last } : { status: 'laster' }
  }, [gjelder, har, svar, feil, last])
}
