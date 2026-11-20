import { useCallback, useEffect, useRef } from 'react'
import { useSystemarkitekt } from '../../auth/systemrolle'
import { useBevart } from '../../oppdatering/Bevaring'
import { useJevnligSjekk } from '../../hooks/useJevnligSjekk'
import { hentIdeerMedNytt } from '../../ideer/api'
import { oppfriskVarsler } from '../../varsler/api'
import { senere } from '../../oppdatering/senere'
import { NarApnet } from '../Senere'
import { idestatus, lyttEtterIde, lyttEtterIdelag, meldIdelagene, type Idelagnavn } from './idevisning'
import type { Forlat } from './useForlatvakt'

// Vinduene hentes første gang de åpnes; tallet på nye kommentarer sjekkes her uansett.
const Ideer = senere(() => import('./Ideer'), 'Ideer')
const Oppgaver = senere(() => import('./Oppgaver'), 'Oppgaver')

/**
 * Laget som står åpent: Idéer, kanskje på én idé (og en kommentar under den,
 * fra en direktelenke; `nr` er ny for hver lenke), eller Planlagte oppgaver,
 * kanskje på én oppgave.
 */
type Vindu = { lag: 'ideer'; ide?: string; kommentar?: string; nr?: number } | { lag: 'oppgaver'; oppgave?: string } | null

/**
 * Idéer for hele appen og Planlagte oppgaver: vinduene, og tallet på idéer
 * med kommentarer brukeren ikke har sett (`idestatus`). Veien inn er
 * hovedmenyen, under «For hele appen» (`apneIdelag`); Planlagte oppgaver er
 * bare for systemarkitektene (D8). Tallet sjekkes når appen og fanen åpnes,
 * etter vinduet og jevnlig.
 *
 * Bare ett av de to lagene står åpent om gangen; man går også mellom dem fra
 * lagene selv. Et varsel eller en direktelenke kan åpne Idéer rett på en idé
 * (`visIde`), og en direktelenke til en diskusjon lukker lagene
 * (`forlatIdelagene`). Begge spør først, som tilbakeknappen, når et skjema i
 * laget som står åpent, har endringer som ikke er lagret.
 */
export function Idelag() {
  // Nøkkelen er den gamle fra idéknappen i toppmenyen, så et åpent vindu overlever oppdateringen.
  const [vindu, setVindu] = useBevart<Vindu>('ideknapp', null)
  const systemarkitekt = useSystemarkitekt()
  const sjekkNytt = useCallback(() => {
    hentIdeerMedNytt().then(idestatus.sett, () => undefined)
  }, [])
  useJevnligSjekk(sjekkNytt)
  // Tallet gjelder den som er logget inn: det forsvinner med laget (ved utlogging), så neste bruker ikke ser det.
  useEffect(() => () => idestatus.sett(0), [])
  /** Vakten for skjemaet i laget som står åpent (`useMeldVakt`). */
  const vakt = useRef<Forlat | null>(null)
  const forlat = useCallback<Forlat>((handling) => (vakt.current ? vakt.current(handling) : handling()), [])
  useEffect(
    () =>
      lyttEtterIde(({ id, kommentar }) =>
        forlat(() => setVindu({ lag: 'ideer', ide: id, ...(kommentar && { kommentar }), nr: Date.now() })),
      ),
    [forlat, setVindu],
  )
  // Planlagte oppgaver vises bare for systemarkitektene, uansett hvem som ber om dem (`apen` under).
  useEffect(() => lyttEtterIdelag((lag) => forlat(() => setVindu({ lag }))), [forlat, setVindu])
  useEffect(
    () =>
      meldIdelagene((deretter) =>
        forlat(() => {
          setVindu(null)
          deretter()
        }),
      ),
    [forlat, setVindu],
  )

  // Fast identitet: `Modallag` kobler den til lukkehendelsen på dialogen.
  // Lukkingen gjelder bare laget som står åpent: når man går fra det ene til
  // det andre, lukkes det første etter at det andre er valgt.
  const lukk = useCallback(
    (lag: Idelagnavn) => {
      setVindu((naa) => (naa?.lag === lag ? null : naa))
      sjekkNytt()
      // Å lese en idé merker varslene om den lest.
      oppfriskVarsler()
    },
    [sjekkNytt, setVindu],
  )
  const lukkIdeer = useCallback(() => lukk('ideer'), [lukk])
  const lukkOppgaver = useCallback(() => lukk('oppgaver'), [lukk])

  const ideerApen = vindu?.lag === 'ideer'
  const oppgaverApen = systemarkitekt && vindu?.lag === 'oppgaver'
  return (
    <>
      <NarApnet apen={ideerApen}>
        <Ideer
          apen={ideerApen}
          ide={vindu?.lag === 'ideer' ? vindu.ide : undefined}
          kommentar={vindu?.lag === 'ideer' ? vindu.kommentar : undefined}
          nr={vindu?.lag === 'ideer' ? vindu.nr : undefined}
          vakt={vakt}
          onLukk={lukkIdeer}
          onOppgaver={(oppgave) => setVindu({ lag: 'oppgaver', oppgave })}
        />
      </NarApnet>
      <NarApnet apen={oppgaverApen}>
        <Oppgaver
          apen={oppgaverApen}
          oppgave={vindu?.lag === 'oppgaver' ? vindu.oppgave : undefined}
          vakt={vakt}
          onLukk={lukkOppgaver}
          onIdeer={() => setVindu({ lag: 'ideer' })}
        />
      </NarApnet>
    </>
  )
}

/** Teksten om idéer med nye kommentarer, til prikkene, eller ingenting når det ikke er noen. */
export function nyeIdekommentarer(antall: number): string | undefined {
  if (antall <= 0) return undefined
  return `nye kommentarer på ${antall === 1 ? 'én idé' : `${antall} idéer`}`
}
