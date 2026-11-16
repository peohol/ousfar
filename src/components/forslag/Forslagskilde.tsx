import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react'
import type { Forslagsvalg } from '../../forslag/modell'
import { Bevaringsomrade, useBevart } from '../../oppdatering/Bevaring'
import { Forslagsskjema } from './Forslagsskjema'

/**
 * Det som åpner skjemaet «Foreslå endring»: hva forslaget kan gjelde der det
 * åpnes fra (en fagside med kortene, et regelsett med kommentarene), og
 * hvilket av dem som er valgt.
 */
export interface Forslagsapning {
  /** Det som står øverst i skjemaet, f.eks. fagsidens navn. */
  tittel: string
  /** Det forslaget kan gjelde; det første er helheten. */
  valg: readonly Forslagsvalg[]
  /** Indeksen i `valg` som er valgt når skjemaet åpnes. */
  valgt?: number
  /** Referansene som kan velges som kilde, f.eks. dem fagsiden viser. */
  referanser?: readonly { id: string; tittel: string }[]
  /** Fagsidens nøkkel (`#/stoff/<nøkkel>`), så skjemaet kan lagre versjonen av siden. */
  fagside?: string
}

type Apne = (apning: Forslagsapning) => void

const Kontekst = createContext<Apne | null>(null)

/** Stedet som står åpent (en fagside, et regelsett), med det forslag kan gjelde der. */
const Stedkontekst = createContext<{ apning: Forslagsapning; apne: Apne } | null>(null)

/**
 * Funksjonen som åpner skjemaet, eller `null` der forslag ikke kan sendes
 * (utenfor appen bak innloggingen, og i testene av andre deler). Knappene
 * «Foreslå endring» vises bare når den finnes.
 */
export function useForeslaEndring(): Apne | null {
  return useContext(Kontekst)
}

/**
 * Skjemaet for et nytt forslag, felles for hele appen: knappene på
 * fagsidene og i fortolkningen åpner det med {@link useForeslaEndring}. Det
 * som er valgt og skrevet, overlever en oppdatering av appen (`useBevart`).
 */
export function ForslagskildeProvider({ children }: { children: ReactNode }) {
  const [apning, setApning] = useBevart<Forslagsapning | null>('forslagsskjema', null)
  const apne = useCallback<Apne>((a) => setApning(a), [setApning])
  const lukk = useCallback(() => setApning(null), [setApning])
  // Hvert sted (fagsiden, reglene i en fortolkning) får sitt eget bevaringsområde,
  // så et skjema ikke arver det som ble skrevet om et annet sted.
  const nokkel = useMemo(
    () => (apning ? apning.valg.filter((v) => v.element === null).map((v) => `${v.ressurs}@${v.grunnrevisjon}`).join(',') : ''),
    [apning],
  )
  return (
    <Kontekst.Provider value={apne}>
      {children}
      {apning && apning.valg.length > 0 && (
        <Bevaringsomrade navn={`forslag:${nokkel}`}>
          <Forslagsskjema apning={apning} onLukk={lukk} />
        </Bevaringsomrade>
      )}
    </Kontekst.Provider>
  )
}

/**
 * Det forslag kan gjelde på stedet som står åpent, så knappene i det (menyen
 * på fagsiden, ved hvert kort) kan åpne skjemaet med riktig valg. `apning`
 * er `null` der ingenting kan foreslås, f.eks. en side som aldri er publisert.
 */
export function ForslagsstedKilde({ apning, children }: { apning: Forslagsapning | null; children: ReactNode }) {
  const apne = useForeslaEndring()
  const verdi = useMemo(() => (apne && apning && apning.valg.length > 0 ? { apning, apne } : null), [apne, apning])
  return <Stedkontekst.Provider value={verdi}>{children}</Stedkontekst.Provider>
}

/**
 * Åpner skjemaet for stedet med `element` valgt, eller helheten uten. `null`
 * når forslag ikke kan sendes her, eller elementet ikke er publisert.
 */
export function useForslagFor(element?: string | null): (() => void) | null {
  const sted = useContext(Stedkontekst)
  if (!sted) return null
  const valgt = element ? sted.apning.valg.findIndex((v) => v.element === element) : 0
  if (valgt < 0) return null
  return () => sted.apne({ ...sted.apning, valgt })
}
