import type { Ref } from 'react'
import { Button } from './Button'
import { Details } from './Details'
import { Tallfelt } from './Tallfelt'
import { Trinnbryter } from './Trinnbryter'
import { Ikon } from './ikon/Ikon'
import { BeUrinMarginforklaring } from './BeUrinForklaring'
import { kvotient, tomBeUrinProve, type BeUrinInndata, type BeUrinProve } from '../domain/beUrinMotor'
import type { BeUrinFellesmodell } from '../domain/beUrinModell'
import { formaterIrcak } from '../domain/thcTall'
import { marginvalg } from '../domain/thcVisning'
import { medEnhet, tallMedEnhet } from '../domain/beUrinVisning'

export interface BeUrinSkjemaProps {
  inndata: BeUrinInndata
  onEndre: <K extends keyof BeUrinInndata>(felt: K, verdi: BeUrinInndata[K]) => void
  modell: BeUrinFellesmodell
  /** Når denne prøven sammenlignes med de tidligere prøvene, etter modellformen. */
  samletIngress: string
  /** Feltet som står først, og som får fokus når skjemaet åpnes eller nullstilles. */
  forsteFelt?: Ref<HTMLInputElement>
}

/**
 * Feltene i fortolkningen av benzoylekgonin i urin: forrige og denne prøven
 * (begge påkrevd), de enda tidligere prøvene i den samlede vurderingen og
 * sikkerhetsmarginen. Samme oppsett som THC-syremodulen, uten bruksmønster,
 * «ingen tidligere prøve» og kort tid.
 */
export function BeUrinSkjema({ inndata, onEndre, modell, samletIngress, forsteFelt }: BeUrinSkjemaProps) {
  const marginer = modell.sikkerhetsmarginer.map(({ margin }) => ({ verdi: margin, merke: marginvalg(margin) }))
  const settTidligere = (prover: BeUrinProve[]) => onEndre('tidligere', prover)

  return (
    <div className="thc-skjema">
      <div className="avkryssinger">
        <label className="avkryssing">
          <input
            type="checkbox"
            checked={inndata.samletVurdering}
            onChange={(e) => {
              onEndre('samletVurdering', e.target.checked)
              // Den første tidligere prøven står klar når vurderingen slås på.
              if (e.target.checked && inndata.tidligere.length === 0) settTidligere([tomBeUrinProve()])
            }}
          />
          Samlet vurdering med enda tidligere prøver
        </label>
      </div>

      <div className="thc-prover">
        <Provefelter
          tittel="Forrige prøve"
          prove={inndata.forrige}
          modell={modell}
          onEndre={(prove) => onEndre('forrige', prove)}
          forsteFelt={forsteFelt}
        />
        <Provefelter tittel="Denne prøven" prove={inndata.denne} modell={modell} onEndre={(prove) => onEndre('denne', prove)} />
      </div>

      {inndata.samletVurdering && (
        <div className="thc-tidligere">
          <p className="thc-tidligere__ingress">{samletIngress} Prøvene må være tatt før forrige prøve.</p>
          <div className="thc-prover">
            {inndata.tidligere.map((prove, i) => {
              const tittel = inndata.tidligere.length === 1 ? 'Tidligere prøve' : `Tidligere prøve ${i + 1}`
              return (
                <Provefelter
                  key={i}
                  tittel={tittel}
                  prove={prove}
                  modell={modell}
                  onEndre={(ny) => settTidligere(inndata.tidligere.map((p, j) => (j === i ? ny : p)))}
                  onFjern={() => settTidligere(inndata.tidligere.filter((_, j) => j !== i))}
                />
              )
            })}
          </div>
          <div className="handlingsrad handlingsrad--start">
            <Button
              variant="kant"
              icon={<Ikon navn="plus" />}
              onClick={() => settTidligere([...inndata.tidligere, tomBeUrinProve()])}
            >
              Legg til tidligere prøve
            </Button>
          </div>
        </div>
      )}

      <div className="thc-margin">
        <p className="thc-margin__hode" aria-hidden="true">
          Sikkerhetsmargin
        </p>
        <Trinnbryter
          etikett="Sikkerhetsmargin"
          valg={marginer}
          verdi={inndata.sikkerhetsmargin}
          onVelg={(margin) => onEndre('sikkerhetsmargin', margin)}
        />
        <Details summary="Hva er sikkerhetsmarginen?" ikon="fallback">
          <BeUrinMarginforklaring modell={modell} />
        </Details>
      </div>
    </div>
  )
}

/** Tallet som skrives for en kvotient: inntil tre desimaler, aldri 0 for en verdi over 0. */
export const formaterKvotient = formaterIrcak

/** Feltene for én prøve: benzoylekgonin, kreatinin og prøvedato, med Q regnet ut under. */
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
  const q = kvotient(prove, modell)
  const sett = (felt: keyof BeUrinProve, verdi: string) => onEndre({ ...prove, [felt]: verdi })
  return (
    <fieldset className="feltgruppe">
      <legend>{tittel}</legend>
      <div className="feltrad feltrad--par">
        <label className="skjemafelt">
          <span>{medEnhet('Benzoylekgonin', enheter.benzoylekgonin)}</span>
          <Tallfelt ref={forsteFelt} value={prove.benzoylekgonin} onChange={(v) => sett('benzoylekgonin', v)} />
        </label>
        <label className="skjemafelt">
          <span>{medEnhet('Kreatinin', enheter.kreatinin)}</span>
          <Tallfelt value={prove.kreatinin} onChange={(v) => sett('kreatinin', v)} />
        </label>
      </div>
      <p className="thc-beregnet" role="status">
        Q (benzoylekgonin/kreatinin): <strong>{q === null ? '–' : tallMedEnhet(formaterKvotient(q), enheter.kvotient)}</strong>
      </p>
      <label className="skjemafelt">
        <span>Prøvedato</span>
        <input className="inndatafelt" type="date" value={prove.dato} onChange={(e) => sett('dato', e.target.value)} />
      </label>
      {onFjern && (
        <div className="handlingsrad handlingsrad--start">
          <Button variant="subtle" icon={<Ikon navn="close" />} onClick={onFjern}>
            Fjern {tittel.toLowerCase()}
          </Button>
        </div>
      )}
    </fieldset>
  )
}
