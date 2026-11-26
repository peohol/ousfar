import type { ReactNode } from 'react'
import { Trinnbryter } from './Trinnbryter'
import { useTips } from './Tips'
import { INGEN_SIKKERHETSMARGIN } from '../domain/thcRegelsett'
import { hvorOfteForStor, marginvalg } from '../domain/thcVisning'

/**
 * Sikkerhetsmarginen i fortolkningene av THC-syre og benzoylekgonin i urin
 * (#576, #586): navnet, et lite informasjonstegn med forklaringen og det
 * kompakte valget av margin. Forklaringen vises ved pekeren, ved
 * tastaturfokus og ved et trykk på berøringsskjerm, og leses av skjermlesere
 * fra tegnet.
 */

export interface SikkerhetsmarginProps {
  /** Marginene i regelsettet eller modellen, stigende. */
  marginer: readonly number[]
  standard: number
  verdi: number
  onVelg: (margin: number) => void
  /** Det som måles, i forklaringen: «benzoylekgonin og kreatinin». */
  maalinger: string
  /** Hva en høyere margin betyr for fortolkningen, som slutten på en setning: «… og det skal mer til før …». */
  merSkalTil: string
}

export function Sikkerhetsmargin({ marginer, standard, verdi, onVelg, maalinger, merSkalTil }: SikkerhetsmarginProps) {
  return (
    <div className="be-margin">
      <span className="be-margin__navn" aria-hidden="true">
        Sikkerhetsmargin
      </span>
      <Informasjonstegn>
        <Marginforklaring marginer={marginer} standard={standard} maalinger={maalinger} merSkalTil={merSkalTil} />
      </Informasjonstegn>
      <Trinnbryter
        etikett="Sikkerhetsmargin"
        valg={marginer.map((margin) => ({ verdi: margin, merke: marginvalg(margin) }))}
        verdi={verdi}
        onVelg={onVelg}
      />
    </div>
  )
}

/** Informasjonstegnet: en liten ring med «i», med forklaringen som tips. */
function Informasjonstegn({ children }: { children: ReactNode }) {
  const tips = useTips(children)
  return (
    <>
      <button type="button" className="be-info" aria-label="Om sikkerhetsmarginen" {...tips.props}>
        <span aria-hidden="true">i</span>
      </button>
      {tips.forklaring}
    </>
  )
}

/**
 * Hva sikkerhetsmarginen er, kort og uten formler: målingene er usikre, en
 * høyere margin legger en mer forsiktig endring til grunn, og marginen gjelder
 * måleusikkerheten, ikke om fortolkningen er riktig.
 */
function Marginforklaring({
  marginer,
  standard,
  maalinger,
  merSkalTil,
}: Pick<SikkerhetsmarginProps, 'marginer' | 'standard' | 'maalinger' | 'merSkalTil'>) {
  return (
    <div className="be-marginforklaring">
      <p>
        Målingene av {maalinger} er usikre, og derfor også endringen mellom to prøver. Med en høyere
        sikkerhetsmargin legges en mer forsiktig endring til grunn, og det skal mer til før {merSkalTil}.
      </p>
      <p>Marginen gjelder bare måleusikkerheten, ikke sannsynligheten for at selve fortolkningen er riktig.</p>
      <dl className="be-marginforklaring__valg">
        {marginer.map((margin) => (
          <div key={margin}>
            <dt>
              {marginvalg(margin)}
              {margin === standard && ' (standard)'}
            </dt>
            <dd>
              {margin === INGEN_SIKKERHETSMARGIN
                ? 'Den målte endringen fortolkes direkte.'
                : `Endringen som fortolkes, er for stor ${hvorOfteForStor(margin)}.`}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
