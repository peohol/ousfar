import { useCallback, useEffect, useId } from 'react'
import type { Fagmiljoreferanse } from '../auth/rettigheter'
import { Button } from '../components/Button'
import { useFanetittel } from '../components/grupper/gruppedeler'
import { Lukkeknapp } from '../components/Lukkeknapp'
import { ToppmenyInnhold } from '../components/toppmeny/Toppmenykilde'
import { kalenderadresse, type Kalenderfane, type Rute } from '../domain/rute'
import { useHenting } from '../hooks/useHenting'
import { useLukkMedEscape } from '../hooks/useLukkMedEscape'
import { fanerFor } from './faner'
import { FinnesIkke, hentGrunnlag, type Personalgrunnlag } from './grunnlag'
import '../styles/grupper.css'

/** Grunnlaget, eller at kalenderen ikke finnes for den innloggede. */
type Svar = { finnes: true; grunnlag: Personalgrunnlag } | { finnes: false }

/**
 * Personalkalenderen (`#/kalender`, docs/personal.md §8.8): fagmiljøet,
 * fanene rollen ser (`faner.tsx`) og den valgte fanen. Vises bare for den som
 * har personalfunksjonen i fagmiljøet hen arbeider i (`src/personaltilgang.ts`);
 * rollen kommer fra databasen. Svarer databasen at kalenderen ikke finnes —
 * funksjonen er slått av siden rettighetene ble hentet, eller medlemskapet er
 * avsluttet — sier siden fra med `onFinnesIkke`. Appen gjør da ruten om til
 * en ukjent adresse og henter rettighetene på nytt, så siden, tittelen,
 * sidestien og menyen blir som for en adresse den ikke kjenner (K-SKJ-2).
 */
export function Personalside({
  fagmiljo,
  fane,
  onGaaTil,
  onLukk,
  onFinnesIkke,
}: {
  fagmiljo: Fagmiljoreferanse
  fane?: Kalenderfane
  onGaaTil: (rute: Rute, valg?: { erstatt?: boolean }) => void
  onLukk: () => void
  /** Databasen svarer at kalenderen ikke finnes for den innloggede. */
  onFinnesIkke: () => void
}) {
  const hent = useCallback(
    (): Promise<Svar> =>
      hentGrunnlag(fagmiljo.id).then(
        (grunnlag) => ({ finnes: true, grunnlag }),
        (feil: unknown) => (feil instanceof FinnesIkke ? { finnes: false } : Promise.reject(feil)),
      ),
    [fagmiljo.id],
  )
  const { tilstand, hentPaNytt } = useHenting(hent, fagmiljo.id)

  const finnesIkke = tilstand.status === 'klar' && !tilstand.data.finnes
  useEffect(() => {
    if (finnesIkke) onFinnesIkke()
  }, [finnesIkke, onFinnesIkke])
  if (finnesIkke) return null
  return (
    <Kalenderflate
      fagmiljo={fagmiljo}
      fane={fane}
      grunnlag={tilstand.status === 'klar' && tilstand.data.finnes ? tilstand.data.grunnlag : null}
      feil={tilstand.status === 'feil' ? tilstand.melding : null}
      hentPaNytt={hentPaNytt}
      onGaaTil={onGaaTil}
      onLukk={onLukk}
    />
  )
}

function Kalenderflate({
  fagmiljo,
  fane,
  grunnlag,
  feil,
  hentPaNytt,
  onGaaTil,
  onLukk,
}: {
  fagmiljo: Fagmiljoreferanse
  fane?: Kalenderfane
  /** `null` til grunnlaget er hentet, eller når det ikke kunne hentes (`feil`). */
  grunnlag: Personalgrunnlag | null
  feil: string | null
  hentPaNytt: () => void
  onGaaTil: (rute: Rute, valg?: { erstatt?: boolean }) => void
  onLukk: () => void
}) {
  const overskrift = useId()
  useLukkMedEscape(onLukk)
  useFanetittel('Kalender')
  useEffect(() => {
    document.getElementById(overskrift)?.focus({ preventScroll: true })
  }, [overskrift])

  const faner = grunnlag ? fanerFor(grunnlag.rolle) : []
  const valgt = faner.find((f) => f.id === fane)
  // En fane rollen ikke ser, er selve kalenderen, og adressen skrives om til den.
  const ikkeForRollen = grunnlag !== null && fane !== undefined && !valgt
  useEffect(() => {
    if (ikkeForRollen) onGaaTil({ side: 'kalender' }, { erstatt: true })
  }, [ikkeForRollen, onGaaTil])
  const vist = valgt ?? faner[0]

  return (
    <section className="gruppeside personalside" aria-labelledby={overskrift} aria-busy={!grunnlag && !feil}>
      <ToppmenyInnhold spor="lukk">
        <Lukkeknapp onLukk={onLukk} />
      </ToppmenyInnhold>
      <header className="gruppeside__hode">
        <p className="gruppeside__overtittel">{fagmiljo.navn}</p>
        <h1 id={overskrift} className="gruppeside__tittel" tabIndex={-1}>
          Kalender
        </h1>
        {faner.length > 1 && (
          <nav aria-label="Kalender">
            <ul className="gruppeside__faner">
              {faner.map((f) => (
                <li key={f.id ?? ''}>
                  <a className="gruppeside__fane" href={kalenderadresse(f.id)} aria-current={f === vist ? 'page' : undefined}>
                    {f.navn}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>
      {feil && (
        <div className="gruppeside__del">
          <p className="skjemafeil" role="alert">
            {feil}
          </p>
          <div>
            <Button variant="kant" onClick={hentPaNytt}>
              Prøv igjen
            </Button>
          </div>
        </div>
      )}
      {grunnlag && vist && <vist.Innhold fagmiljo={fagmiljo} grunnlag={grunnlag} hentPaNytt={hentPaNytt} />}
    </section>
  )
}
