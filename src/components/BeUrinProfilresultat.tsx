import { useId, useMemo, type ReactNode } from 'react'
import { Card } from './Card'
import { Details } from './Details'
import { BeUrinMangler, type BeUrinResultatProps, type BeUrinVisningsvalg } from './BeUrinDeler'
import { BeUrinProfilforklaring } from './BeUrinForklaring'
import { BeUrinProfilPlot, BeUrinProfiltabell } from './BeUrinProfilPlot'
import type { GodkjentBeUrinProfilmodell } from '../domain/beUrinModell'
import {
  fortolkBeUrinProfiler,
  mildereProfilutfall,
  type BeUrinProfilMildere,
  type BeUrinProfilresultat as Resultat,
} from '../domain/beUrinProfiler'
import {
  BE_URIN_FORUTSETNING,
  BE_URIN_KORTTITTEL,
  BE_URIN_KRONISK_TEKST,
  BE_URIN_SPORADISK_TEKST,
  mildereTekst,
  samlettekst,
  type BeUrinVurderingstekst,
  type BeUrinVurderingstype,
} from '../domain/beUrinProfilvisning'

/**
 * Resultatet med modellform 2 (#570, forenklet i #576): de to vurderingene
 * først, side om side, med det en høyere margin ville endret rett under, så
 * et kort forbehold, og profilene med figuren og forklaringen lukket under
 * hver sin overskrift. Ingen bannere, ingen kopiering: dette er intern
 * beslutningsstøtte.
 */
export function BeUrinProfilresultat({ inndata, modell, visning }: BeUrinResultatProps<GodkjentBeUrinProfilmodell>) {
  const resultat = useMemo(() => fortolkBeUrinProfiler(inndata, modell), [inndata, modell])
  const mildere = useMemo(() => mildereProfilutfall(inndata, modell, resultat), [inndata, modell, resultat])
  return (
    <Card align="start" className="be-resultat">
      {resultat.type === 'mangler' ? (
        <BeUrinMangler feil={resultat.feil} />
      ) : (
        <Profilutfall
          resultat={resultat}
          mildere={mildere}
          modell={modell}
          tidligereProver={inndata.tidligere.length}
          visning={visning}
        />
      )}
    </Card>
  )
}

function Profilutfall({
  resultat,
  mildere,
  modell,
  tidligereProver,
  visning,
}: {
  resultat: Extract<Resultat, { type: 'vurdering' }>
  mildere: BeUrinProfilMildere[]
  modell: GodkjentBeUrinProfilmodell
  tidligereProver: number
  visning: BeUrinVisningsvalg
}) {
  const { sammenligning: s, samlet } = resultat
  const mildereFor = (type: BeUrinVurderingstype) => mildere.filter((u) => u.vurdering === type)
  return (
    <>
      <div className="be-vurderinger">
        <Vurdering type="sporadisk" tekst={BE_URIN_SPORADISK_TEKST[s.sporadisk]} mildere={mildereFor('sporadisk')} />
        <Vurdering
          type="kronisk"
          tekst={BE_URIN_KRONISK_TEKST[s.kronisk]}
          mildere={mildereFor('kronisk')}
          samletTreff={Boolean(samlet?.treff)}
        >
          {samlet && (
            <p className={samlet.treff ? 'be-vurdering__samlet be-vurdering__samlet--treff' : 'be-vurdering__samlet'}>
              {samlettekst(samlet)}
            </p>
          )}
        </Vurdering>
      </div>
      <p className="be-forbehold">{BE_URIN_FORUTSETNING}</p>
      <div className="be-seksjoner">
        <Details summary="Utskillelsesprofiler og figur">
          <div className="be-profiler">
            <BeUrinProfiltabell sammenligning={s} />
            <label className="avkryssing be-alle-marginer">
              <input type="checkbox" checked={visning.alleMarginer} onChange={(e) => visning.onAlleMarginer(e.target.checked)} />
              Vis alle sikkerhetsmarginer
            </label>
            <BeUrinProfilPlot sammenligning={s} modell={modell} alleMarginer={visning.alleMarginer} />
          </div>
        </Details>
        <Details summary="Forklaring">
          <BeUrinProfilforklaring resultat={resultat} modell={modell} tidligereProver={tidligereProver} />
        </Details>
      </div>
    </>
  )
}

/** Én vurdering: overskriften, den korte konklusjonen, utdypingen og det en høyere margin ville gitt. */
function Vurdering({
  type,
  tekst,
  mildere,
  samletTreff = false,
  children,
}: {
  type: BeUrinVurderingstype
  tekst: BeUrinVurderingstekst
  mildere: BeUrinProfilMildere[]
  /** Den samlede vurderingen står under, med indikasjon etter en eldre prøve. */
  samletTreff?: boolean
  children?: ReactNode
}) {
  const id = useId()
  return (
    <section className="be-vurdering" aria-labelledby={id}>
      <h3 className="be-vurdering__tittel" id={id}>
        {BE_URIN_KORTTITTEL[type]}
      </h3>
      <p className="be-vurdering__konklusjon">{tekst.konklusjon}</p>
      {tekst.utdyping && <p className="be-vurdering__utdyping">{tekst.utdyping}</p>}
      {children}
      {mildere.map((u) => (
        <p key={`${u.utfall}|${u.samletDato ?? ''}`} className="be-vurdering__mildere">
          {mildereTekst(u, { tekst, samletTreff })}
        </p>
      ))}
    </section>
  )
}
