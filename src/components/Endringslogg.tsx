import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { OFFENTLIG_LOGG, type Endringslogg as Logg } from '../data/endringslogg'
import { visningFor } from '../domain/endringssider'
import { ENDRINGER_PER_SIDE, formaterDato, type Endring, type Endringstype } from '../domain/versjon'
import { useBevart } from '../oppdatering/Bevaring'
import { Button } from './Button'
import { FORSTE_FORING, Loggskuff } from './Loggskuff'
import { Modallag } from './Modallag'

/**
 * Endringsloggen, som et modalt lag over appen (se `Modallag`).
 *
 * Føringene hentes først når loggen åpnes, {@link ENDRINGER_PER_SIDE} om
 * gangen: de nyeste, og flere bakover i tid med «Vis flere»
 * (`src/data/endringslogg.ts`). Åpnes loggen på en bestemt føring, hentes
 * alle fram til den.
 *
 * `logg` er loggen den innloggede ser (`useEndringslogg`): for
 * systemarkitektene med føringene under utprøving, merket som det.
 *
 * Merk at appens egne taster fortsatt hører etter på vinduet mens laget står
 * åpent. Vakten mot det ligger i `lagLiggerOver()` i `hooks/useKeyboard.ts`.
 */

/** Tone på typemerket. Holdes utenfor de kliniske nivåfargene. */
const TONE: Record<Endringstype, string> = {
  'Design / layout': 'design',
  Funksjonalitet: 'funksjon',
  Fag: 'fag',
}

/*
 * Uten autofokus ville fokus landet på lukkeknappen, som er det første
 * nettleseren finner — og da ville `Enter` lukket loggen i samme øyeblikk
 * som den ble åpnet. Den nyeste føringen er det man kom for, så fokus legges
 * der (`FORSTE_FORING`): `Enter` folder den ut i stedet. Er føringene ikke
 * hentet ennå, venter fokuset på lista og flyttes dit når de kommer.
 */
const LISTE = '.logg__liste'

export function Endringslogg({
  apen,
  versjon = null,
  logg = OFFENTLIG_LOGG,
  onLukk,
}: {
  apen: boolean
  /** Loggen som vises; uten den, loggen alle ser. */
  logg?: Logg
  /**
   * Føringen som foldes ut og hentes fram når loggen åpnes, som fra en utført
   * oppgave: versjonen eller ID-en til endringen.
   */
  versjon?: string | null
  onLukk: () => void
}) {
  /** Versjonen til skuffen som står åpen — bare én av gangen. */
  const [apenSkuff, setApenSkuff] = useState<string | null>(null)
  /** Hvor mange av de nyeste føringene brukeren har bedt om å se. */
  const [vist, setVist] = useBevart('endringslogg/vist', ENDRINGER_PER_SIDE)
  /** Hentingen feilet; et nytt forsøk øker telleren. */
  const [feil, setFeil] = useState(false)
  const [forsok, setForsok] = useState(0)
  /** Sier fra når en henting er ferdig, så føringene den ga, vises. */
  const [, setHentet] = useState(0)
  const liste = useRef<HTMLUListElement>(null)
  /** Plassen fokuset skal til når føringene «Vis flere» ba om, er der. */
  const nesteFokus = useRef<number | null>(null)

  // Åpnet på en føring: den står utfoldet og fram i bildet, og alle fram til
  // den er med.
  const { register } = logg
  const plass = logg.plassI(versjon)
  const valgt = plass === null ? null : register[plass]!.versjon
  const onsket = Math.min(Math.max(vist, plass === null ? 0 : visningFor(plass)), register.length)
  const endringer = apen ? logg.hentede(onsket) : []
  const mangler = apen && endringer.length < onsket

  // Lukket lag: neste åpning skal begynne på toppen, med de nyeste og alle
  // skuffer igjen.
  useEffect(() => {
    setApenSkuff(apen ? valgt : null)
    if (!apen) {
      setVist(ENDRINGER_PER_SIDE)
      nesteFokus.current = null
    }
  }, [apen, valgt])

  useEffect(() => {
    if (!mangler) return
    let gjelder = true
    setFeil(false)
    logg.hent(onsket).then(
      () => gjelder && setHentet((n) => n + 1),
      () => gjelder && setFeil(true),
    )
    return () => {
      gjelder = false
    }
  }, [logg, mangler, onsket, forsok])

  // Fokuset som venter på føringene, går dit når de er hentet: til den
  // loggen ble åpnet på, eller den første av dem «Vis flere» ga. Det flyttes
  // i samme øyeblikk som føringene kommer på skjermen (`useLayoutEffect`), så
  // det aldri står igjen på lista etter at de er der.
  const mal = valgt ? `[data-versjon="${valgt}"] ${FORSTE_FORING}` : FORSTE_FORING
  const harMal = valgt ? endringer.some((e) => e.versjon === valgt) : endringer.length > 0
  useLayoutEffect(() => {
    const el = liste.current
    if (!apen || !el) return
    const neste = nesteFokus.current
    if (neste !== null) {
      if (neste >= endringer.length) return
      nesteFokus.current = null
      el.querySelectorAll<HTMLElement>(FORSTE_FORING)[neste]?.focus()
    } else if (document.activeElement === el) {
      el.querySelector<HTMLElement>(mal)?.focus()
    }
  }, [apen, mal, endringer.length])

  const veksle = useCallback((versjon: string) => {
    setApenSkuff((forrige) => (forrige === versjon ? null : versjon))
  }, [])

  const visFlere = () => {
    if (mangler) return
    nesteFokus.current = endringer.length
    setVist(endringer.length + ENDRINGER_PER_SIDE)
  }

  return (
    <Modallag
      apen={apen}
      tittel="Endringslogg"
      ikon="history"
      onLukk={onLukk}
      autofokus={harMal ? mal : LISTE}
      tettKropp
    >
      <ul ref={liste} className="logg__liste" tabIndex={-1} aria-busy={mangler}>
        {endringer.map((endring) => (
          <Skuff
            key={endring.versjon}
            endring={endring}
            apen={apenSkuff === endring.versjon}
            onVeksle={() => veksle(endring.versjon)}
          />
        ))}
      </ul>
      {feil ? (
        <div className="logg__flere">
          <p className="logg__melding logg__melding--feil" role="alert">
            Fikk ikke hentet endringsloggen.
          </p>
          <Button variant="subtle" onClick={() => setForsok((n) => n + 1)}>
            Prøv igjen
          </Button>
        </div>
      ) : (
        mangler &&
        endringer.length === 0 && (
          <p className="logg__melding" role="status">
            Henter endringsloggen …
          </p>
        )
      )}
      {!feil && endringer.length > 0 && (mangler || onsket < register.length) && (
        <div className="logg__flere">
          <Button variant="subtle" aria-disabled={mangler} onClick={visFlere}>
            {mangler ? 'Henter …' : 'Vis flere'}
          </Button>
        </div>
      )}
    </Modallag>
  )
}

/**
 * Én føring: datoen og versjonen, sammendraget, typene og punktene. En føring
 * under utprøving, som bare systemarkitektene ser, er merket med det.
 */
function Skuff({
  endring,
  apen,
  onVeksle,
}: {
  endring: Endring
  apen: boolean
  onVeksle: () => void
}) {
  return (
    <Loggskuff
      apen={apen}
      onVeksle={onVeksle}
      data-versjon={endring.versjon}
      merking={
        <>
          {formaterDato(endring.dato)} · {endring.versjon}
        </>
      }
      sammendrag={endring.sammendrag}
      merker={
        <>
          {endring.bareSystemarkitekter && <span className="loggmerke loggmerke--utproving">Under utprøving</span>}
          {endring.typer.map((type) => (
            <span key={type} className={`loggmerke loggmerke--${TONE[type]}`}>
              {type}
            </span>
          ))}
          <span className="loggmerke loggmerke--omfang">{endring.omfang}</span>
        </>
      }
    >
      <ul className="loggskuff__punkter">
        {endring.punkter.map((punkt, i) => (
          <li key={i}>{punkt}</li>
        ))}
      </ul>
    </Loggskuff>
  )
}
