import { useId, useMemo, type ReactNode } from 'react'
import { Card } from './Card'
import { Details } from './Details'
import { BeUrinMangler, type BeUrinVisningsvalg } from './BeUrinDeler'
import { BeUrinProfilforklaring } from './BeUrinForklaring'
import { BeUrinProfilPlot, BeUrinProfiltabell } from './BeUrinProfilPlot'
import { erProfilmodell, type GodkjentBeUrinModellutgave, type GodkjentBeUrinProfilmodell } from '../domain/beUrinModell'
import type { BeUrinInndata } from '../domain/beUrinMotor'
import {
  fortolkBeUrinProfiler,
  mildereProfilutfall,
  type BeUrinProfilresultat as Resultat,
} from '../domain/beUrinProfiler'
import {
  BE_URIN_FORUTSETNING,
  BE_URIN_KORTTITTEL,
  BE_URIN_KRONISK_TEKST,
  BE_URIN_SPORADISK_TEKST,
  beMildereMarginer,
  samlettekst,
  type BeUrinVurderingstekst,
  type BeUrinVurderingstype,
} from '../domain/beUrinProfilvisning'
import type { MildereMarginer } from '../domain/thcVisning'

/**
 * Fortolkningen med modellform 2, og det høyere marginer ville gitt (#588),
 * som skjemaet viser i snakkebobler ved sikkerhetsmarginen. `null` med
 * modellform 1, som har sitt eget resultat.
 */
export function useBeUrinProfilfortolkning(
  inndata: BeUrinInndata,
  modell: GodkjentBeUrinModellutgave,
): { resultat: Resultat; mildere: MildereMarginer | undefined } | null {
  return useMemo(() => {
    if (!erProfilmodell(modell)) return null
    const resultat = fortolkBeUrinProfiler(inndata, modell)
    const mildere =
      resultat.type === 'vurdering' ? beMildereMarginer(resultat, mildereProfilutfall(inndata, modell, resultat)) : undefined
    return { resultat, mildere }
  }, [inndata, modell])
}

/**
 * Resultatet med modellform 2 (#570, forenklet i #576): de to vurderingene
 * først, side om side, så et kort forbehold, og profilene med figuren og
 * forklaringen lukket under hver sin overskrift. Det en høyere margin ville
 * endret, står ved sikkerhetsmarginen (#588). Ingen bannere, ingen kopiering:
 * dette er intern beslutningsstøtte.
 */
export function BeUrinProfilresultat({
  resultat,
  modell,
  tidligereProver,
  visning,
}: {
  resultat: Resultat
  modell: GodkjentBeUrinProfilmodell
  tidligereProver: number
  visning: BeUrinVisningsvalg
}) {
  return (
    <Card align="start" className="be-resultat">
      {resultat.type === 'mangler' ? (
        <BeUrinMangler feil={resultat.feil} />
      ) : (
        <Profilutfall resultat={resultat} modell={modell} tidligereProver={tidligereProver} visning={visning} />
      )}
    </Card>
  )
}

function Profilutfall({
  resultat,
  modell,
  tidligereProver,
  visning,
}: {
  resultat: Extract<Resultat, { type: 'vurdering' }>
  modell: GodkjentBeUrinProfilmodell
  tidligereProver: number
  visning: BeUrinVisningsvalg
}) {
  const { sammenligning: s, samlet } = resultat
  return (
    <>
      <div className="be-vurderinger">
        <Vurdering type="sporadisk" tekst={BE_URIN_SPORADISK_TEKST[s.sporadisk]} />
        <Vurdering type="kronisk" tekst={BE_URIN_KRONISK_TEKST[s.kronisk]}>
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

/** Én vurdering: overskriften, den korte konklusjonen og utdypingen. */
function Vurdering({
  type,
  tekst,
  children,
}: {
  type: BeUrinVurderingstype
  tekst: BeUrinVurderingstekst
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
    </section>
  )
}
