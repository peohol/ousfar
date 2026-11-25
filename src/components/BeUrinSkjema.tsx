import { useEffect, useId, useRef, useState, type Ref } from 'react'
import { Button } from './Button'
import { Tallfelt } from './Tallfelt'
import { useTips } from './Tips'
import { Trinnbryter } from './Trinnbryter'
import { BeUrinMarginforklaring } from './BeUrinForklaring'
import {
  feltfeil,
  kvotient,
  tidligereNavn,
  tomBeUrinProve,
  type BeUrinFelt,
  type BeUrinInndata,
  type BeUrinProve,
} from '../domain/beUrinMotor'
import type { BeUrinFellesmodell } from '../domain/beUrinModell'
import { formaterIrcak } from '../domain/thcTall'
import { marginvalg } from '../domain/thcVisning'
import { tallMedEnhet } from '../domain/beUrinVisning'

export interface BeUrinSkjemaProps {
  inndata: BeUrinInndata
  onEndre: <K extends keyof BeUrinInndata>(felt: K, verdi: BeUrinInndata[K]) => void
  modell: BeUrinFellesmodell
  /** Feltet som står først, og som får fokus når skjemaet åpnes eller nullstilles. */
  forsteFelt?: Ref<HTMLInputElement>
}

/**
 * Feltene i fortolkningen av benzoylekgonin i urin (#576): forrige og denne
 * prøven side om side, de tidligere prøvene i den samlede vurderingen under
 * dem, lagt til og fjernet med hver sin knapp, og sikkerhetsmarginen med
 * forklaringen bak et lite informasjonstegn. Et ugyldig felt sies ved feltet;
 * et tomt felt sies ikke.
 */
export function BeUrinSkjema({ inndata, onEndre, modell, forsteFelt }: BeUrinSkjemaProps) {
  const marginer = modell.sikkerhetsmarginer.map(({ margin }) => ({
    verdi: margin,
    merke: marginvalg(margin),
  }))
  const { tidligere } = inndata
  const settTidligere = (prover: BeUrinProve[]) => onEndre('tidligere', prover)

  // En ny tidligere prøve får fokus i det første feltet; når en fjernes,
  // går fokuset til knappen som legger til en ny, så det ikke forsvinner.
  const [fokus, setFokus] = useState<{
    til: 'ny' | 'legg'
    teller: number
  } | null>(null)
  const nyttFelt = useRef<HTMLInputElement>(null)
  const leggTil = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (fokus?.til === 'ny') nyttFelt.current?.focus()
    else if (fokus?.til === 'legg') leggTil.current?.focus()
  }, [fokus])
  const flyttFokus = (til: 'ny' | 'legg') => setFokus((f) => ({ til, teller: (f?.teller ?? 0) + 1 }))

  return (
    <div className="be-skjema">
      <div className="be-prover">
        <Provefelter
          tittel="Forrige prøve"
          prove={inndata.forrige}
          modell={modell}
          onEndre={(prove) => onEndre('forrige', prove)}
          forsteFelt={forsteFelt}
        />
        <Provefelter tittel="Denne prøven" prove={inndata.denne} modell={modell} onEndre={(prove) => onEndre('denne', prove)} />
        {tidligere.map((prove, i) => (
          <Provefelter
            key={i}
            tittel={tidligereNavn(tidligere.length, i)}
            prove={prove}
            modell={modell}
            forsteFelt={i === tidligere.length - 1 ? nyttFelt : undefined}
            onEndre={(ny) => settTidligere(tidligere.map((p, j) => (j === i ? ny : p)))}
            onFjern={() => {
              settTidligere(tidligere.filter((_, j) => j !== i))
              flyttFokus('legg')
            }}
          />
        ))}
      </div>

      <div className="be-skjema__rad">
        <Button
          ref={leggTil}
          variant="kant"
          className="be-legg-til"
          onClick={() => {
            settTidligere([...tidligere, tomBeUrinProve()])
            flyttFokus('ny')
          }}
        >
          + Legg til tidligere prøve
        </Button>

        <div className="be-margin">
          <span className="be-margin__navn" aria-hidden="true">
            Sikkerhetsmargin
          </span>
          <Marginforklaring modell={modell} />
          <Trinnbryter
            etikett="Sikkerhetsmargin"
            valg={marginer}
            verdi={inndata.sikkerhetsmargin}
            onVelg={(margin) => onEndre('sikkerhetsmargin', margin)}
          />
        </div>
      </div>
    </div>
  )
}

/**
 * Informasjonstegnet ved «Sikkerhetsmargin»: forklaringen vises ved pekeren,
 * ved tastaturfokus og ved et trykk på berøringsskjerm, og leses av
 * skjermlesere fra tegnet.
 */
function Marginforklaring({ modell }: { modell: BeUrinFellesmodell }) {
  const tips = useTips(<BeUrinMarginforklaring modell={modell} />)
  return (
    <>
      <button type="button" className="be-info" aria-label="Om sikkerhetsmarginen" {...tips.props}>
        <span aria-hidden="true">i</span>
      </button>
      {tips.forklaring}
    </>
  )
}

const FELTNAVN: Record<BeUrinFelt, string> = {
  benzoylekgonin: 'Benzoylekgonin',
  kreatinin: 'Kreatinin',
  dato: 'Prøvedato',
}

/** Feltene for én prøve: benzoylekgonin, kreatinin og prøvedato, med kvotienten under. */
function Provefelter({
  tittel,
  prove,
  modell,
  onEndre,
  onFjern,
  forsteFelt,
}: {
  tittel: string
  prove: BeUrinProve
  modell: BeUrinFellesmodell
  onEndre: (prove: BeUrinProve) => void
  onFjern?: () => void
  forsteFelt?: Ref<HTMLInputElement>
}) {
  const { enheter } = modell
  const id = useId()
  const q = kvotient(prove, modell)
  const sett = (felt: BeUrinFelt, verdi: string) => onEndre({ ...prove, [felt]: verdi })

  /**
   * Ledeteksten, feltet og feilen ved det, knyttet sammen for skjermlesere.
   * Enheten står inne i feltet, så ledeteksten holder seg på én linje; for
   * skjermlesere er den en del av navnet: «Benzoylekgonin (nmol/L)».
   */
  const felt = (navn: BeUrinFelt, enhet: string) => {
    const feil = feltfeil(prove, navn)
    // Navnet er ledeteksten alene, ikke enheten ved siden av feltet eller feilen under det.
    const egenskaper = {
      'aria-labelledby': `${id}-${navn}-navn`,
      'aria-invalid': feil ? true : undefined,
      'aria-describedby': feil ? `${id}-${navn}` : undefined,
    }
    return (
      <label className="skjemafelt">
        <span id={`${id}-${navn}-navn`}>
          {FELTNAVN[navn]}
          {enhet && <span className="kun-skjermleser"> ({enhet})</span>}
        </span>
        {navn === 'dato' ? (
          <input
            className="inndatafelt"
            type="date"
            value={prove.dato}
            onChange={(e) => sett('dato', e.target.value)}
            {...egenskaper}
          />
        ) : (
          <span className="be-felt">
            <Tallfelt
              ref={navn === 'benzoylekgonin' ? forsteFelt : undefined}
              value={prove[navn]}
              onChange={(v) => sett(navn, v)}
              {...egenskaper}
            />
            {enhet && (
              <span className="be-felt__enhet" aria-hidden="true">
                {enhet}
              </span>
            )}
          </span>
        )}
        {feil && (
          <span className="be-feltfeil" id={`${id}-${navn}`}>
            {feil}
          </span>
        )}
      </label>
    )
  }

  return (
    <fieldset className="be-prove">
      <legend className="be-prove__tittel">{tittel}</legend>
      {onFjern && (
        <Button variant="subtle" className="be-prove__fjern" aria-label={`Fjern ${tittel.toLowerCase()}`} onClick={onFjern}>
          Fjern
        </Button>
      )}
      <div className="be-prove__felt">
        {felt('benzoylekgonin', enheter.benzoylekgonin)}
        {felt('kreatinin', enheter.kreatinin)}
        {felt('dato', '')}
      </div>
      <p className="be-kvotient" role="status">
        Kvotient <strong>{q === null ? '–' : tallMedEnhet(formaterIrcak(q), enheter.kvotient)}</strong>
      </p>
    </fieldset>
  )
}
