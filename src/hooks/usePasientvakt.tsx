import { useId, type ReactNode } from 'react'
import { Pasientregel, Pasientvarsel } from '../components/Pasientregel'

/**
 * Hva et skrivefelt viser om pasientopplysninger:
 * - `regel`: regelen under feltet og advarselen ved et fødselsnummer. For
 *   feltet der hovedteksten skrives, én gang per skjema.
 * - `varsel`: bare advarselen. For de andre feltene i et skjema som alt viser
 *   regelen, som overskrifter, navn, begrunnelser og kilder, så regelen ikke
 *   gjentas ved hvert felt.
 * - `false`: ingenting, for felt som ikke deles, som passord.
 */
export type Pasientvaktmodus = 'regel' | 'varsel' | false

export interface Pasientvakt {
  /** Til `aria-describedby` på feltet: regelen og advarselen. Tom når vakten er av. */
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
export function usePasientvakt(tekst: string, modus: Pasientvaktmodus = 'regel'): Pasientvakt {
  const id = useId()
  if (!modus) return { beskrevetAv: '', regel: null, varsel: null }
  const regelId = `${id}-regel`
  const varselId = `${id}-varsel`
  const medRegel = modus === 'regel'
  return {
    beskrevetAv: medRegel ? `${regelId} ${varselId}` : varselId,
    regel: medRegel ? <Pasientregel id={regelId} /> : null,
    varsel: (
      <div id={varselId} className="pasientvakt__varsel">
        <Pasientvarsel tekst={tekst} />
      </div>
    ),
  }
}

/** Modusen for et felt med de to valgfrie flaggene komponentene tar imot. */
export function pasientvaktmodus(pasientregel?: boolean, pasientvarsel?: boolean): Pasientvaktmodus {
  return pasientregel ? 'regel' : pasientvarsel ? 'varsel' : false
}
