import { Suspense, useCallback, useEffect, useId, useState } from 'react'
import { useProfil } from '../../auth/okt'
import { chatvarsler as standard } from '../../chatvarsler/api'
import type { Chatvarsler, Varseltilstand } from '../../chatvarsler/enhet'
import { hentFormalvalg, settFormalvalg } from '../../enhetsvarsler/api'
import { VARSELFORMAL, type Formalvalg } from '../../enhetsvarsler/formal'
import { Bryter } from '../Bryter'
import { Ikon } from '../ikon/Ikon'

const UVENTET = 'Noe gikk galt. Prøv igjen.'

/** Hva bryteren for enheten betyr, og hvorfor den er låst når den er det. */
export const VARSELTEKST: Record<Varseltilstand, string> = {
  pa: 'Du får varsler her om det du har valgt under. Varslene viser aldri innholdet i meldinger.',
  av: 'Ingen varsler på denne enheten.',
  blokkert: 'Varsler er blokkert for OUSFAR i nettleseren. Tillat varsler for siden i nettleserens innstillinger, og prøv igjen.',
  hjemskjerm:
    'På iPhone og iPad: legg OUSFAR til på Hjem-skjermen (Del → Legg til på Hjem-skjerm), åpne appen derfra og slå på varsler her.',
  ustottet: 'Denne nettleseren kan ikke vise varsler fra OUSFAR.',
}

/** Kallene for valgene per formål; byttes ut i testene. */
export interface Formaltjeneste {
  hent: () => Promise<Formalvalg[]>
  sett: (formal: string, pa: boolean) => Promise<void>
}

const FORMALTJENESTE: Formaltjeneste = { hent: hentFormalvalg, sett: settFormalvalg }

const feiltekst = (aarsak: unknown) => (aarsak instanceof Error && aarsak.message ? aarsak.message : UVENTET)

/**
 * «Varsler på denne enheten» øverst i varselinnstillingene
 * (docs/enhetsvarsler.md): bryteren for enheten, og under den hva man vil ha
 * varsel om, ett valg per formål man har (som «Chatmeldinger»). Bryteren
 * gjelder bare nettleseren den slås på i; valgene under gjelder alle enhetene
 * man har slått på. Vises ikke når man ikke har noe formål.
 */
export function Enhetsvarsler({ varsler = standard, tjeneste = FORMALTJENESTE }: { varsler?: Chatvarsler | null; tjeneste?: Formaltjeneste }) {
  const [valg, setValg] = useState<Formalvalg[] | null>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const id = useId()

  useEffect(() => {
    let aktiv = true
    tjeneste.hent().then(
      (v) => aktiv && setValg(v),
      () => aktiv && setValg([]),
    )
    return () => {
      aktiv = false
    }
  }, [tjeneste])

  const endre = useCallback(
    async (formal: string, pa: boolean) => {
      setFeil(null)
      setValg((v) => v?.map((x) => (x.formal === formal ? { ...x, pa } : x)) ?? v)
      try {
        await tjeneste.sett(formal, pa)
      } catch (aarsak) {
        setFeil(feiltekst(aarsak))
        setValg((v) => v?.map((x) => (x.formal === formal ? { ...x, pa: !pa } : x)) ?? v)
      }
    },
    [tjeneste],
  )

  if (!valg?.length) return null

  return (
    <section className="varselinnstillinger__gruppe enhetsvarsler" aria-labelledby={`${id}-tittel`}>
      <h3 id={`${id}-tittel`} className="varselinnstillinger__overskrift">
        <span className="varselinnstillinger__ikon" aria-hidden="true">
          <Ikon navn="skjerm" storrelse="ui" />
        </span>
        På denne enheten
      </h3>
      <ul className="varselinnstillinger__liste">
        <li className="varselinnstilling">
          <Enhetsbryter varsler={varsler} />
        </li>
        {valg.map(({ formal, pa }) => {
          const { tittel, forklaring, Innstillinger } = VARSELFORMAL[formal]!
          return (
            <li key={formal} className="varselinnstilling">
              <Bryter pa={pa} onEndre={(ny) => void endre(formal, ny)}>
                <span className="varselinnstilling__tittel">{tittel}</span>
                <span className="varselinnstilling__forklaring">{forklaring}</span>
              </Bryter>
              {pa && Innstillinger && (
                <Suspense fallback={null}>
                  <Innstillinger />
                </Suspense>
              )}
            </li>
          )
        })}
      </ul>
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
    </section>
  )
}

/**
 * Bryteren for selve enheten (docs/chatvarsler.md, «Abonnementet»): av til den
 * enkelte slår den på, og bare for nettleseren den slås på i.
 */
export function Enhetsbryter({ varsler = standard }: { varsler?: Chatvarsler | null }) {
  const profil = useProfil()
  const [tilstand, setTilstand] = useState<Varseltilstand | null>(null)
  const [lagrer, setLagrer] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)

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
      setFeil(feiltekst(aarsak))
      setTilstand(await varsler.tilstand().catch(() => 'ustottet' as const))
    } finally {
      setLagrer(false)
    }
  }

  return (
    <>
      <Bryter pa={pa} laast={lagrer || !kanEndres} onEndre={(ny) => void endre(ny)}>
        <span className="varselinnstilling__tittel">Varsler på denne enheten</span>
        <span className="varselinnstilling__forklaring">{VARSELTEKST[tilstand]}</span>
      </Bryter>
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
    </>
  )
}
