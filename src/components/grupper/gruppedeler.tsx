import { useCallback, useEffect, useId, useState } from 'react'
import { inngangsvei } from '../../hooks/useRute'
import { hentGruppeoversikt } from '../../grupper/api'
import { useGrupper } from '../../grupper/kilde'
import type { Gruppeoversikt } from '../../grupper/modell'
import { lesRute } from '../../domain/rute'
import { Ikon } from '../ikon/Ikon'
import { Felt } from '../konto/Felt'
import { lyttEtterGruppeendring } from './gruppevisning'

/**
 * Det gruppesidene, modalene og arbeidsflatene deler: handlingene med
 * kvitteringen, feltene for navn og beskrivelse, gruppen slik databasen gir
 * den, og lenken tilbake.
 */

export const UVENTET = 'Noe gikk galt. Prøv igjen.'
export const melding = (aarsak: unknown) => (aarsak instanceof Error ? aarsak.message : UVENTET)

/** Sidens tittel i fanen mens siden står åpen. */
export function useFanetittel(tittel: string) {
  useEffect(() => {
    const forrige = document.title
    document.title = `${tittel} – OUSFAR`
    return () => {
      document.title = forrige
    }
  }, [tittel])
}

/**
 * Én handling om gangen, med kvitteringen eller feilen etter. `utfor` gir
 * kvitteringen fra handlingen, eller ingen.
 */
export function useHandling() {
  const [opptatt, setOpptatt] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const [kvittering, setKvittering] = useState<string | null>(null)
  const utfor = useCallback(async (handling: () => Promise<string | null | void>): Promise<boolean> => {
    setOpptatt(true)
    setFeil(null)
    setKvittering(null)
    try {
      setKvittering((await handling()) || null)
      return true
    } catch (aarsak) {
      setFeil(melding(aarsak))
      return false
    } finally {
      setOpptatt(false)
    }
  }, [])
  const nullstill = useCallback(() => {
    setFeil(null)
    setKvittering(null)
  }, [])
  return { opptatt, feil, kvittering, utfor, nullstill }
}

export type Handling = ReturnType<typeof useHandling>

export function Tilbakemelding({ feil, kvittering }: { feil: string | null; kvittering: string | null }) {
  return (
    <>
      {kvittering && (
        <p className="gruppeside__kvittering" role="status">
          {kvittering}
        </p>
      )}
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
    </>
  )
}

/** Navnet og beskrivelsen, felles for en ny gruppe og endringen av en. */
export function Gruppefelter({
  navn,
  beskrivelse,
  onNavn,
  onBeskrivelse,
  disabled,
  beskrivelsesnavn = 'Beskrivelse',
}: {
  navn: string
  beskrivelse: string
  onNavn: (navn: string) => void
  onBeskrivelse: (beskrivelse: string) => void
  disabled: boolean
  beskrivelsesnavn?: string
}) {
  const beskrivelseId = useId()
  return (
    <>
      <Felt merkelapp="Navn" value={navn} maxLength={80} required disabled={disabled} onChange={(e) => onNavn(e.target.value)} />
      <div className="felt">
        <label className="felt__merkelapp" htmlFor={beskrivelseId}>
          {beskrivelsesnavn}
        </label>
        <textarea
          id={beskrivelseId}
          className="felt__inndata"
          rows={3}
          maxLength={1000}
          value={beskrivelse}
          disabled={disabled}
          onChange={(e) => onBeskrivelse(e.target.value)}
        />
      </div>
    </>
  )
}

/**
 * Gruppen slik databasen gir den til den innloggede (`gruppeoversikt`), og
 * henter den på nytt når noe i den er endret et annet sted i appen, som i en
 * arbeidsflate. Avslaget er det samme for en gruppe som ikke finnes og en
 * hen ikke leser, så ingenting røper at den finnes.
 */
export function useGruppeoversikt(id: string) {
  const [oversikt, setOversikt] = useState<Gruppeoversikt | null>(null)
  const [lesefeil, setLesefeil] = useState<string | null>(null)
  const hent = useCallback(async () => {
    try {
      const svar = await hentGruppeoversikt(id)
      setOversikt(svar)
      setLesefeil(null)
    } catch (aarsak) {
      setOversikt(null)
      setLesefeil(melding(aarsak))
    }
  }, [id])
  useEffect(() => {
    void hent()
  }, [hent])
  useEffect(() => lyttEtterGruppeendring((gruppe) => gruppe === id && void hent()), [id, hent])
  return { oversikt, lesefeil, hent }
}

/**
 * Navnet på siden brukeren kom fra, til «Tilbake til …». Gruppene heter det
 * de heter, så lenge den innloggede leser dem.
 */
export function useInngangsnavn(reserve: string): string {
  const { grupper } = useGrupper()
  const fra = inngangsvei()
  if (!fra) return reserve
  const rute = lesRute(fra)
  switch (rute.side) {
    case 'forside':
      return 'forsiden'
    case 'fortolkning':
      return 'fortolkningen'
    case 'grupper':
      if (!rute.gruppe) return 'Grupper'
      return grupper.find((g) => g.id === rute.gruppe)?.navn ?? 'gruppen'
    case 'stoff':
      return 'fagsiden'
    case 'stoffregister':
      return 'stoffregisteret'
    case 'sok':
      return 'søket'
    case 'forslag':
      return 'endringsforslagene'
    case 'verktoy':
      return 'verktøyene'
    default:
      return 'forrige side'
  }
}

/**
 * Lenken over overskriften: tilbake dit brukeren kom fra i appen, eller til
 * reserven (docs/navigasjon.md), med navnet på siden den går til.
 */
export function Tilbakelenke({ reserve, onTilbake }: { reserve: string; onTilbake: () => void }) {
  const navn = useInngangsnavn(reserve)
  return (
    <button type="button" className="tilbakelenke" onClick={onTilbake}>
      <Ikon navn="back" storrelse="ui" />
      Tilbake til {navn}
    </button>
  )
}
