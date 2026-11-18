import { useCallback, useEffect, useId, useState } from 'react'
import type { Profilkort } from '@delt/profil'
import { useAvatarlenker } from '../../auth/avatarer'
import { direkteapi } from '../../direktemeldinger/api'
import { personnavn, type Chatvalg as Valgene } from '../../direktemeldinger/modell'
import { Bryter } from '../Bryter'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Avatar } from '../konto/Avatar'

const UVENTET = 'Noe gikk galt. Prøv igjen.'
const feiltekst = (aarsak: unknown) => (aarsak instanceof Error && aarsak.message ? aarsak.message : UVENTET)

/** Bryterne, med navnet og det de betyr av og på. */
const BRYTERE: readonly { nokkel: keyof Valgene; navn: string; pa: string; av: string }[] = [
  {
    nokkel: 'tillat_direktemeldinger',
    navn: 'Tillat direktemeldinger',
    pa: 'Andre i OUSFAR kan finne deg og sende deg meldinger.',
    av: 'Ingen kan finne deg eller sende nye meldinger.',
  },
  {
    nokkel: 'vis_aktiv',
    navn: 'Vis når jeg er aktiv',
    pa: 'De du har samtaler med, ser en prikk når du er aktiv nå.',
    av: 'Ingen ser når du er aktiv.',
  },
]

/**
 * Egne valg for direktemeldingene (docs/direktemeldinger-personvern.md):
 * «Tillat direktemeldinger» og «Vis når jeg er aktiv», begge av til den
 * enkelte slår dem på, og personene den innloggede har blokkert, med
 * «Opphev». Står nederst i chatmenyen, og kan settes inn under Konto →
 * Innstillinger → Chat (samme innstillinger).
 *
 * En bryter er låst mens endringen lagres; det databasen lagret, står
 * etterpå, også når en annen fane endret den samtidig.
 */
export function Chatvalg({
  valg,
  onEndre,
  onBlokkeringEndret,
}: {
  valg: Valgene
  onEndre: (valg: Partial<Valgene>) => Promise<void>
  /** En blokkering er opphevet: samtalelista og en åpen samtale kan ha endret seg. */
  onBlokkeringEndret?: () => void
}) {
  const [lagrer, setLagrer] = useState<keyof Valgene | null>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const id = useId()

  const endre = async (nokkel: keyof Valgene, pa: boolean) => {
    setLagrer(nokkel)
    setFeil(null)
    try {
      await onEndre({ [nokkel]: pa })
    } catch (aarsak) {
      setFeil(feiltekst(aarsak))
    } finally {
      setLagrer(null)
    }
  }

  return (
    <section className="chatvalg" aria-labelledby={`${id}-tittel`}>
      <h3 id={`${id}-tittel`} className="kun-skjermleser">
        Direktemeldinger
      </h3>
      <ul className="chatvalg__liste">
        {BRYTERE.map((b) => {
          const pa = valg[b.nokkel]
          return (
            <li key={b.nokkel} className="chatvalg__rad">
              <Bryter pa={pa} laast={lagrer !== null} onEndre={(ny) => void endre(b.nokkel, ny)} className="chatvalg__bryter">
                <span className="chatvalg__navn">{b.navn}</span>
                <span className="chatvalg__forklaring">{pa ? b.pa : b.av}</span>
              </Bryter>
              <span className="chatvalg__status" aria-hidden="true">
                {pa ? 'På' : 'Av'}
              </span>
            </li>
          )
        })}
      </ul>
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
      <Blokkerte onEndret={onBlokkeringEndret} />
    </section>
  )
}

/** «Blokkerte»: trekkspillet med personene den innloggede har blokkert, hentet når det åpnes. */
function Blokkerte({ onEndret }: { onEndret?: () => void }) {
  const [apen, setApen] = useState(false)
  const [blokkerte, setBlokkerte] = useState<Profilkort[] | null>(null)
  const [opphever, setOpphever] = useState<string | null>(null)
  const [feil, setFeil] = useState<string | null>(null)
  const id = useId()
  const lenker = useAvatarlenker(blokkerte ?? [])

  const hent = useCallback(() => {
    setFeil(null)
    direkteapi.mineBlokkeringer().then(setBlokkerte, (aarsak) => setFeil(feiltekst(aarsak)))
  }, [])

  useEffect(() => {
    if (apen) hent()
  }, [apen, hent])

  const opphev = async (person: Profilkort) => {
    setOpphever(person.id)
    setFeil(null)
    try {
      await direkteapi.opphevBlokkering(person.id)
      setBlokkerte((liste) => liste?.filter((p) => p.id !== person.id) ?? null)
      onEndret?.()
    } catch (aarsak) {
      setFeil(feiltekst(aarsak))
    } finally {
      setOpphever(null)
    }
  }

  return (
    <div className="chatvalg__blokkerte">
      <button type="button" className="chatgrupper__veksle" aria-expanded={apen} aria-controls={`${id}-liste`} onClick={() => setApen(!apen)}>
        <Ikon navn="chev" storrelse="ui" className="chatgrupper__pil" />
        <span className="chatgrupper__tittel">Blokkerte</span>
      </button>
      <div id={`${id}-liste`} hidden={!apen}>
        {blokkerte === null ? (
          !feil && (
            <p className="chatsamtaler__tom" role="status">
              Henter …
            </p>
          )
        ) : blokkerte.length === 0 ? (
          <p className="chatsamtaler__tom">Du har ikke blokkert noen.</p>
        ) : (
          <ul className="chatvalg__personer">
            {blokkerte.map((p) => (
              <li key={p.id} className="chatvalg__person">
                <Avatar profil={p} lenke={p.avatar_path ? (lenker.get(p.avatar_path) ?? null) : null} storrelse="liten" />
                <span className="chatrad__tekst">
                  <span className="chatrad__navn">{personnavn(p)}</span>
                  <span className="chatrad__art">@{p.username}</span>
                </span>
                <Button variant="kant" disabled={opphever !== null} onClick={() => void opphev(p)}>
                  Opphev
                </Button>
              </li>
            ))}
          </ul>
        )}
        {feil && (
          <p className="skjemafeil" role="alert">
            {feil}
          </p>
        )}
      </div>
    </div>
  )
}
