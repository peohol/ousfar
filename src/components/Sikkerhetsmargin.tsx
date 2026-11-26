import { useId, type CSSProperties, type ReactNode } from 'react'
import { Trinnbryter } from './Trinnbryter'
import { useTips } from './Tips'
import { INGEN_SIKKERHETSMARGIN } from '../domain/thcRegelsett'
import { hvorOfteForStor, marginvalg, type Marginboble, type MildereMarginer } from '../domain/thcVisning'

/**
 * Sikkerhetsmarginen i fortolkningene av THC-syre og benzoylekgonin i urin
 * (#576, #586): navnet, et lite informasjonstegn med forklaringen og det
 * kompakte valget av margin. Forklaringen vises ved pekeren, ved
 * tastaturfokus og ved et trykk på berøringsskjerm, og leses av skjermlesere
 * fra tegnet.
 *
 * Gir en høyere margin enn den valgte en mildere fortolkning, peker en
 * snakkeboble på marginen og sier kort hva fortolkningen blir der (#588). Den
 * første boblen står over bryteren, den neste under, og så videre, så de ikke
 * dekker hverandre. Boblene gløder svakt. Skjermlesere får hele setningene
 * som beskrivelse av bryteren.
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
  mildere?: MildereMarginer | undefined
}

export function Sikkerhetsmargin({
  marginer,
  standard,
  verdi,
  onVelg,
  maalinger,
  merSkalTil,
  mildere,
}: SikkerhetsmarginProps) {
  const beskrivelse = useId()
  const bobler = mildere?.bobler ?? []
  const tekster = mildere?.tekster ?? []
  const rad = (side: 'over' | 'under', rest: 0 | 1) => (
    <Boblerad side={side} marginer={marginer} bobler={bobler.filter((_, i) => i % 2 === rest)} />
  )
  return (
    <div className="be-margin">
      <span className="be-margin__navn" aria-hidden="true">
        Sikkerhetsmargin
      </span>
      <Informasjonstegn>
        <Marginforklaring marginer={marginer} standard={standard} maalinger={maalinger} merSkalTil={merSkalTil} />
      </Informasjonstegn>
      <div className="be-margin__bryter" style={{ '--antall': marginer.length } as CSSProperties}>
        {rad('over', 0)}
        <Trinnbryter
          etikett="Sikkerhetsmargin"
          valg={marginer.map((margin) => ({ verdi: margin, merke: marginvalg(margin) }))}
          verdi={verdi}
          onVelg={onVelg}
          beskrivelse={tekster.length > 0 ? beskrivelse : undefined}
        />
        {rad('under', 1)}
      </div>
      {tekster.length > 0 && (
        <div id={beskrivelse} className="kun-skjermleser">
          {tekster.map((tekst) => (
            <p key={tekst}>{tekst}</p>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Boblene på den ene siden av bryteren, i det samme rutenettet som valgene,
 * så hver boble står ved sin margin. Står marginen ytterst, legger boblen seg
 * innover fra kanten, med pilen fortsatt på marginen.
 */
function Boblerad({
  side,
  marginer,
  bobler,
}: {
  side: 'over' | 'under'
  marginer: readonly number[]
  bobler: readonly Marginboble[]
}) {
  if (bobler.length === 0) return null
  return (
    <div className={`be-margin__bobler be-margin__bobler--${side}`} aria-hidden="true">
      {bobler.map(({ margin, linjer }) => {
        const indeks = marginer.indexOf(margin)
        if (indeks < 0) return null
        const kant = indeks === 0 ? ' be-marginboble--start' : indeks === marginer.length - 1 ? ' be-marginboble--slutt' : ''
        return (
          <span key={margin} className={`be-marginboble${kant}`} style={{ gridColumn: indeks + 1 }} data-valg={indeks}>
            {linjer.map((linje) => (
              <span key={linje} className="be-marginboble__linje">
                {linje}
              </span>
            ))}
          </span>
        )
      })}
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
