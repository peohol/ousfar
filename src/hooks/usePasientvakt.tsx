import { useId, type ReactNode } from 'react'
import { Pasientregel, Pasientvarsel } from '../components/Pasientregel'

export interface Pasientvakt {
  /** Til `aria-describedby` på feltet: regelen, og advarselen når den vises. */
  beskrevetAv: string
  /** Regelen om pasientopplysninger, kort, under feltet. */
  regel: ReactNode
  /**
   * Advarselen mens teksten ligner et fødselsnummer. Plassen står alltid, tom
   * uten treff, så `beskrevetAv` kan stå fast også i en tekstredigerer som
   * setter attributtene én gang.
   */
  varsel: ReactNode
}

/**
 * Regelen om pasientopplysninger ved et skrivefelt som fantes før P7
 * (`docs/pasientopplysninger.md`): `Pasientregel` under feltet og
 * `Pasientvarsel` mens teksten ligner et fødselsnummer, begge knyttet til
 * feltet så skjermlesere leser dem med det. `tekst` er teksten slik den står
 * i feltet nå (klarteksten for riktekst).
 */
export function usePasientvakt(tekst: string): Pasientvakt {
  const id = useId()
  const regelId = `${id}-regel`
  const varselId = `${id}-varsel`
  return {
    beskrevetAv: `${regelId} ${varselId}`,
    regel: <Pasientregel id={regelId} />,
    varsel: (
      <div id={varselId} className="pasientvakt__varsel">
        <Pasientvarsel tekst={tekst} />
      </div>
    ),
  }
}
