import { useMemo } from 'react'
import { Card } from './Card'
import { BeUrinMangler, BeUrinVisualisering, MildereMargin, type BeUrinResultatProps } from './BeUrinDeler'
import { BeUrinProfilberegning } from './BeUrinForklaring'
import { BeUrinProfilPlot, Profilstrek } from './BeUrinProfilPlot'
import { Panelhode } from './Panelhode'
import type { GodkjentBeUrinProfilmodell } from '../domain/beUrinModell'
import {
  BE_URIN_KRONISKE_ROLLER,
  BE_URIN_SPORADISKE_ROLLER,
  fortolkBeUrinProfiler,
  mildereProfilutfall,
  profilFor,
  type BeUrinProfilresultat as Resultat,
  type BeUrinProfilsammenligning,
  type BeUrinRolle,
} from '../domain/beUrinProfiler'
import {
  BE_URIN_GRADTEKST,
  BE_URIN_INNLEDNING,
  BE_URIN_KORTTITTEL,
  BE_URIN_KRONISK_TEKST,
  BE_URIN_LIKE_BI,
  BE_URIN_SAMME_DAG,
  BE_URIN_SAMMENLIGNINGSGRUNNLAG,
  BE_URIN_SPORADISK_TEKST,
  marginsetning,
  mildereTekst,
  samlettekst,
} from '../domain/beUrinProfilvisning'
import { ekstrapolasjonsmerknad, erEkstrapolert } from '../domain/beUrinVisning'
import { formaterDatoNorsk } from '../domain/thcTall'

/**
 * Resultatet med modellform 2 (#570): hvordan endringen er justert, gradene
 * mot de fem profilene for sporadisk og kronisk bruk, og de to vurderingene
 * side om side. Ingen fast merking om at modellen er tentativ, og ingen
 * kopiering: dette er intern beslutningsstøtte.
 */
export function BeUrinProfilresultat({ inndata, modell, onVelgMargin }: BeUrinResultatProps<GodkjentBeUrinProfilmodell>) {
  const resultat = useMemo(() => fortolkBeUrinProfiler(inndata, modell), [inndata, modell])
  const mildere = useMemo(() => mildereProfilutfall(inndata, modell, resultat), [inndata, modell, resultat])
  return (
    <>
      <Card align="start" className="thc-resultat">
        {resultat.type === 'mangler' ? (
          <BeUrinMangler mangler={resultat.mangler} />
        ) : (
          <Profilutfall
            resultat={resultat}
            mildere={mildere.map((u) => ({ marginer: u.marginer, tekst: mildereTekst(u) }))}
            onVelgMargin={onVelgMargin}
          />
        )}
      </Card>
      {resultat.type === 'vurdering' && (
        <BeUrinVisualisering
          margin={resultat.sammenligning.margin}
          sammeDag={resultat.sammeDag}
          figur={(alle) => <BeUrinProfilPlot sammenligning={resultat.sammenligning} modell={modell} alleMarginer={alle} />}
          beregning={
            <BeUrinProfilberegning
              sammenligning={resultat.sammenligning}
              modell={modell}
              forrigeDato={resultat.forrige.dato}
              denneDato={resultat.denne.dato}
            />
          }
        />
      )}
    </>
  )
}

/** Gradene mot profilene i én vurdering, som punkter etter innledningen. */
function Grader({
  s,
  innledning,
  roller,
}: {
  s: BeUrinProfilsammenligning
  innledning: string
  roller: readonly BeUrinRolle[]
}) {
  return (
    <div className="be-grader">
      <p>{innledning}</p>
      <ul className="be-grader__liste">
        {roller.map((rolle) => (
          <li key={rolle} className="be-grader__punkt">
            <Profilstrek rolle={rolle} />
            <span>
              <strong>{BE_URIN_GRADTEKST[profilFor(s, rolle).grad]}</strong> {BE_URIN_SAMMENLIGNINGSGRUNNLAG[rolle]}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Profilutfall({
  resultat,
  mildere,
  onVelgMargin,
}: {
  resultat: Extract<Resultat, { type: 'vurdering' }>
  mildere: { marginer: number[]; tekst: string }[]
  onVelgMargin: (margin: number) => void
}) {
  const { sammenligning: s, samlet, sammeDag } = resultat
  return (
    <>
      <Panelhode ikon="interp">Resultat</Panelhode>
      {mildere.length > 0 && <MildereMargin utfall={mildere} onVelg={onVelgMargin} />}
      <p>{marginsetning(s.margin)}</p>
      <hr className="be-skille" />
      <Grader s={s} innledning={BE_URIN_INNLEDNING.sporadisk} roller={BE_URIN_SPORADISKE_ROLLER} />
      <hr className="be-skille" />
      <Grader s={s} innledning={BE_URIN_INNLEDNING.kronisk} roller={BE_URIN_KRONISKE_ROLLER} />
      <hr className="be-skille" />
      <div className="be-vurderinger">
        <section className="be-vurdering" aria-label={BE_URIN_KORTTITTEL.sporadisk}>
          <h3 className="be-vurdering__tittel">{BE_URIN_KORTTITTEL.sporadisk}</h3>
          <p className="be-vurdering__tekst">{BE_URIN_SPORADISK_TEKST[s.sporadisk]}</p>
        </section>
        <section className="be-vurdering" aria-label={BE_URIN_KORTTITTEL.kronisk}>
          <h3 className="be-vurdering__tittel">{BE_URIN_KORTTITTEL.kronisk}</h3>
          <p className="be-vurdering__tekst">{BE_URIN_KRONISK_TEKST[s.kronisk]}</p>
          {samlet && <p className="be-vurdering__samlet">{samlettekst(samlet)}</p>}
        </section>
      </div>
      {sammeDag && (
        <p className="notis" role="note">
          {BE_URIN_SAMME_DAG}
        </p>
      )}
      {s.likeBi && !sammeDag && (
        <p className="notis" role="note">
          {BE_URIN_LIKE_BI}
        </p>
      )}
      {erEkstrapolert(s) && (
        <p className="notis" role="note">
          {ekstrapolasjonsmerknad('Forrige prøve')}
        </p>
      )}
      {samlet?.treff && erEkstrapolert(samlet.treff.sammenligning) && (
        <p className="notis" role="note">
          Samlet vurdering: {ekstrapolasjonsmerknad(`Den tidligere prøven fra ${formaterDatoNorsk(samlet.treff.dato)}`)}
        </p>
      )}
    </>
  )
}
