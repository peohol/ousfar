import { useEffect, useId, useState } from 'react'
import { useProfil } from '../../auth/okt'
import { chatvarsler as standard } from '../../chatvarsler/api'
import type { Chatvarsler, Varseltilstand } from '../../chatvarsler/enhet'
import { Bryter } from '../Bryter'

const UVENTET = 'Noe gikk galt. Prøv igjen.'

/** Hva bryteren betyr, og hvorfor den er låst når den er det. */
export const VARSELTEKST: Record<Varseltilstand, string> = {
  pa: 'Du får et varsel her når noen skriver i gruppene dine eller sender deg en direktemelding. Varselet viser ikke selve meldingen.',
  av: 'Ingen varsler om nye meldinger på denne enheten.',
  blokkert: 'Varsler er blokkert for OUSFAR i nettleseren. Tillat varsler for siden i nettleserens innstillinger, og prøv igjen.',
  hjemskjerm:
    'På iPhone og iPad: legg OUSFAR til på Hjem-skjermen (Del → Legg til på Hjem-skjerm), åpne appen derfra og slå på varsler her.',
  ustottet: 'Denne nettleseren kan ikke vise varsler fra OUSFAR.',
}

/**
 * «Varsler på denne enheten» (docs/chatvarsler.md): skrivebords- eller
 * mobilvarsel om nye meldinger i gruppechattene og direktemeldingene. Av til
 * den enkelte slår det på, og bare for nettleseren det slås på i. Står sammen
 * med de andre chatvalgene.
 */
export function Chatvarslervalg({ varsler = standard }: { varsler?: Chatvarsler | null }) {
  const profil = useProfil()
  const [tilstand, setTilstand] = useState<Varseltilstand | null>(null)
  const [lagrer, setLagrer] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  const id = useId()

  useEffect(() => {
    let aktiv = true
    if (!varsler) {
      setTilstand('ustottet')
      return
    }
    varsler.tilstand().then(
      (t) => aktiv && setTilstand(t),
      () => aktiv && setTilstand('ustottet'),
    )
    return () => {
      aktiv = false
    }
  }, [varsler])

  if (tilstand === null) return null
  const pa = tilstand === 'pa'
  const kanEndres = varsler !== null && (tilstand === 'pa' || tilstand === 'av')

  const endre = async (ny: boolean) => {
    if (!varsler) return
    setLagrer(true)
    setFeil(null)
    try {
      setTilstand(ny ? await varsler.slaPa(profil.id) : await varsler.slaAv())
    } catch (aarsak) {
      setFeil(aarsak instanceof Error && aarsak.message ? aarsak.message : UVENTET)
      setTilstand(await varsler.tilstand().catch(() => 'ustottet' as const))
    } finally {
      setLagrer(false)
    }
  }

  return (
    <section className="chatvalg chatvarslervalg" aria-labelledby={`${id}-tittel`}>
      <h3 id={`${id}-tittel`} className="kun-skjermleser">
        Varsler
      </h3>
      <ul className="chatvalg__liste">
        <li className="chatvalg__rad">
          <Bryter pa={pa} laast={lagrer || !kanEndres} onEndre={(ny) => void endre(ny)} className="chatvalg__bryter">
            <span className="chatvalg__navn">Varsler på denne enheten</span>
            <span className="chatvalg__forklaring">{VARSELTEKST[tilstand]}</span>
          </Bryter>
          <span className="chatvalg__status" aria-hidden="true">
            {pa ? 'På' : 'Av'}
          </span>
        </li>
      </ul>
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
    </section>
  )
}
