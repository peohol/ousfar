import type { ReactNode } from 'react'
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

/** Valget mellom valgt og alle sikkerhetsmarginer i figuren. */
export interface BeUrinVisningsvalg {
  alleMarginer: boolean
  onAlleMarginer: (alle: boolean) => void
}

/**
 * Det resultatdelen av modulen får: inndataene, modellen, veien til å velge en
 * margin og visningsvalget. Visningsvalget eies av skallet, som lever gjennom
 * et midlertidig ugyldig skjema, så det står når figuren kommer tilbake.
 */
export interface BeUrinResultatProps<M> {
  inndata: BeUrinInndata
  modell: M
  onVelgMargin: (margin: number) => void
  visning: BeUrinVisningsvalg
}

/**
 * Kortet med figuren og beregningen (d ≥ 1), eller bare beregningen samme
 * dag når modellformen vurderer det, delt mellom modellformene.
 */
export function BeUrinVisualisering({
  margin,
  sammeDag = false,
  visning: { alleMarginer, onAlleMarginer },
  figur,
  beregning,
}: {
  margin: number
  sammeDag?: boolean
  visning: BeUrinVisningsvalg
  figur: (alleMarginer: boolean) => ReactNode
  beregning: ReactNode
}) {
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
          onVelg={onAlleMarginer}
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
