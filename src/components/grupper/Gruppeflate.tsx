import { useCallback, useEffect, useRef, type MutableRefObject } from 'react'
import { gruppeadresse, lesRute } from '../../domain/rute'
import { tilbakeTil } from '../../hooks/useRute'
import { Bevaringsomrade } from '../../oppdatering/Bevaring'
import type { Forlat } from '../ideer/useForlatvakt'
import { Modallag } from '../Modallag'
import { arbeidsflate, type Arbeidsflate, type Flatefane } from './arbeidsflate'
import { useFanetittel, useGruppeoversikt } from './gruppedeler'
import { Gruppeideer } from './Gruppeideer'
import { Gruppeoppgaver } from './Gruppeoppgaver'
import { meldGruppeendring, meldGruppesiden } from './gruppevisning'

const FLATENAVN: Readonly<Record<Flatefane, string>> = { ideer: 'Idéer', oppgaver: 'Oppgaver' }

/**
 * En arbeidsflate i gruppen: idéene eller oppgavene, i et stort lag over
 * siden flaten ble åpnet fra (`arbeidsflate.ts`). Tilbake, ×, Escape og
 * nettleserens tilbake lukker den dit, eller til gruppen når den ble åpnet
 * utenfra, og går alle gjennom vakten til skjemaet som står åpent i den.
 *
 * Tittelen har gruppens navn først når databasen har gitt gruppen; en gruppe
 * som ikke finnes eller ikke kan leses, får det samme avslaget og ingen navn.
 */
export function Gruppeflate({ gruppe, fane, element }: Arbeidsflate) {
  const { oversikt, lesefeil } = useGruppeoversikt(gruppe)
  /** Vakten til skjemaet som står åpent i flaten. */
  const skjemavakt = useRef<Forlat | null>(null)

  // Bare den gangen flaten selv står i adressefeltet: lukker laget seg fordi
  // adressen alt er byttet (nettleserens tilbake, et varsel), skal det ikke gå
  // et steg til.
  const lukk = useCallback(() => {
    const naa = arbeidsflate(lesRute(window.location.hash))
    if (naa?.gruppe === gruppe && naa.fane === fane) tilbakeTil(gruppeadresse(gruppe))
  }, [gruppe, fane])

  // Det som kommer utenfra, som et varsel eller en direktelenke, går gjennom den samme vakten.
  useEffect(() => meldGruppesiden((handling) => (skjemavakt.current ? skjemavakt.current(handling) : handling())), [])

  const navn = FLATENAVN[fane]
  useFanetittel(oversikt ? `${navn} – ${oversikt.navn}` : navn)
  const endret = useCallback(() => meldGruppeendring(gruppe), [gruppe])

  return (
    <Modallag
      apen
      arbeidsflate
      tittel={oversikt ? `${navn} for ${oversikt.navn}` : navn}
      meta={oversikt?.navn ?? ' '}
      ikon={fane === 'ideer' ? 'idea' : 'oppgaver'}
      lukketekst={`Lukk ${navn.toLowerCase()}`}
      onLukk={lukk}
      vedLukking={() => vaktSlipper(skjemavakt, lukk)}
    >
      <Bevaringsomrade navn={`gruppe:${gruppe}`}>
        {oversikt ? (
          fane === 'ideer' ? (
            <Gruppeideer
              gruppe={oversikt}
              ide={element}
              onEndret={endret}
              skjemavakt={skjemavakt}
              onGruppeoppgave={(oppgave) => {
                window.location.hash = gruppeadresse(gruppe, 'oppgaver', oppgave)
              }}
            />
          ) : (
            <Gruppeoppgaver gruppe={oversikt} oppgave={element} onEndret={endret} skjemavakt={skjemavakt} />
          )
        ) : (
          <p className={lesefeil ? 'skjemafeil arbeidsflate__melding' : 'arbeidsflate__melding'} role={lesefeil ? 'alert' : undefined}>
            {lesefeil ?? `Henter ${navn.toLowerCase()} …`}
          </p>
        )}
      </Bevaringsomrade>
    </Modallag>
  )
}

/**
 * Til `vedLukking`: uten skjema lukkes laget som vanlig. Med et skjema spør
 * vakten først når det har endringer, og lukker så selv.
 */
function vaktSlipper(skjemavakt: MutableRefObject<Forlat | null>, lukk: () => void): boolean {
  const vakt = skjemavakt.current
  if (!vakt) return true
  vakt(lukk)
  return false
}
