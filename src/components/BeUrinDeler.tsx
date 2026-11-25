import type { ReactNode } from 'react'
import { useBevart } from '../oppdatering/Bevaring'
import { Button } from './Button'
import { Card } from './Card'
import { Details } from './Details'
import { Panelhode } from './Panelhode'
import { Trinnbryter } from './Trinnbryter'
import { Ikon } from './ikon/Ikon'
import type { BeUrinInndata } from '../domain/beUrinMotor'
import { marginliste, marginmerke, somProsent } from '../domain/thcVisning'

/**
 * Delene modulen for benzoylekgonin i urin har felles for begge modellformene:
 * det som mangler, banneret om høyere margin og kortet med figuren og
 * beregningen.
 */

/** Det resultatdelen av modulen får: inndataene, modellen og veien til å velge en margin. */
export interface BeUrinResultatProps<M> {
  inndata: BeUrinInndata
  modell: M
  onVelgMargin: (margin: number) => void
}

/**
 * Kortet med figuren og beregningen (d ≥ 1), eller bare beregningen samme
 * dag når modellformen vurderer det, delt mellom modellformene. Bryteren for alle marginene huskes.
 */
export function BeUrinVisualisering({
  margin,
  sammeDag = false,
  figur,
  beregning,
}: {
  margin: number
  sammeDag?: boolean
  figur: (alleMarginer: boolean) => ReactNode
  beregning: ReactNode
}) {
  const [alleMarginer, setAlleMarginer] = useBevart('fortolkning/be-urin/visning', false)
  if (sammeDag) {
    return (
      <Card align="start" className="thc-plot">
        <Panelhode ikon="hl">Beregningen</Panelhode>
        {beregning}
      </Card>
    )
  }
  return (
    <Card align="start" className="thc-plot">
      <Panelhode ikon="hl">Visualisering</Panelhode>
      <div className="thc-visningsvalg">
        <Trinnbryter<boolean>
          etikett="Visualisering"
          valg={[
            { verdi: false, merke: `Visualiser med valgt sikkerhetsmargin (${somProsent(margin)} %)` },
            { verdi: true, merke: 'Visualiser med alle sikkerhetsmarginer' },
          ]}
          verdi={alleMarginer}
          onVelg={setAlleMarginer}
        />
      </div>
      {figur(alleMarginer)}
      <Details summary="Beregningen" ikon="fallback">
        {beregning}
      </Details>
    </Card>
  )
}

/** Det som mangler før noe kan vurderes, delt mellom modellformene. */
export function BeUrinMangler({ mangler }: { mangler: string[] }) {
  return (
    <>
      <Panelhode ikon="fallback" tone="toksisk">
        Mangler
      </Panelhode>
      <ul className="mangelliste">
        {mangler.map((melding) => (
          <li key={melding}>{melding}</li>
        ))}
      </ul>
    </>
  )
}

/** Et mildere utfall i banneret: marginene som gir det, og hva resultatet da blir. */
export interface Mildereutfall {
  marginer: number[]
  /** «Med 99 % sikkerhetsmargin endres resultatet til …», uten marginene. */
  tekst: string
}

/**
 * Banneret når en høyere sikkerhetsmargin enn den valgte gir et mildere
 * resultat, som i THC-syremodulen. Marginen endres bare når brukeren selv
 * trykker.
 */
export function MildereMargin({ utfall, onVelg }: { utfall: Mildereutfall[]; onVelg: (margin: number) => void }) {
  return (
    <div className="notis thc-mildere" role="note" aria-label="Vurder høyere sikkerhetsmargin">
      <p className="thc-mildere__hode">
        <Ikon navn="advarsel" storrelse="1.25em" />
        Vurder høyere sikkerhetsmargin
      </p>
      <ul className="thc-mildere__liste">
        {utfall.map(({ marginer, tekst }) => {
          const laveste = marginer[0]!
          return (
            <li key={`${marginer.join('|')}|${tekst}`} className="thc-mildere__utfall">
              <p>
                Med {marginliste(marginer)} sikkerhetsmargin {tekst}
              </p>
              <Button variant="kant" aria-label={`Bruk ${marginmerke(laveste)} sikkerhetsmargin`} onClick={() => onVelg(laveste)}>
                Bruk {marginmerke(laveste)}
              </Button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
