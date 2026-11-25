import { useMemo } from 'react'
import { BeUrinFigur } from './BeUrinPlot'
import { visningsmarginer } from '../domain/beUrinMotor'
import type { BeUrinFellesmodell } from '../domain/beUrinModell'
import { byggProfilgraf, prosentFor } from '../domain/beUrinPlot'
import { profilMarginpunkter, type BeUrinProfilsammenligning, type BeUrinRolle } from '../domain/beUrinProfiler'
import { BE_URIN_ROLLENAVN } from '../domain/beUrinProfilvisning'
import { antallDogn } from '../domain/beUrinVisning'
import { formaterProsent } from '../domain/thcPlot'
import { marginvalg } from '../domain/thcVisning'

/**
 * Figuren med de fem utskillelsesprofilene (modellform 2): alle samtidig, som
 * prosentvis endring fra forrige prøve, og denne prøven ved d døgn med den
 * valgte eller alle sikkerhetsmarginene.
 *
 * Hver profil har sin egen farge og strek (`be-kurve--<navn>`), den samme i
 * legenden og i figuren. Navnene «treg» og «ekstrem» er sammenligningens, så
 * fargen følger navnet gjennom hele figuren og endres bare med en ny
 * referanseprøve eller et nytt tidsrom. Ingen rangering av de fem forutsettes.
 */

/** Merknaden i stedet for figuren når endringen er for stor til å tegnes. */
export const FOR_STOR_TIL_FIGUR =
  'Endringen mellom prøvene er for stor til å tegnes i figuren. Vurderingene og beregningen gjelder som de står.'

/** Streken i legenden: et lite utsnitt av kurven, med samme farge og stiplingsmønster. */
export function Profilstrek({ rolle }: { rolle: BeUrinRolle }) {
  return (
    <svg className="be-legende__strek" viewBox="0 0 40 8" aria-hidden="true">
      <line className={`thc-plot__kurve be-kurve--${rolle}`} x1={3} y1={4} x2={37} y2={4} />
    </svg>
  )
}

export function BeUrinProfilPlot({
  sammenligning: s,
  modell,
  alleMarginer = false,
}: {
  sammenligning: BeUrinProfilsammenligning
  modell: BeUrinFellesmodell
  alleMarginer?: boolean
}) {
  const denne = useMemo(
    () => profilMarginpunkter(modell, s, visningsmarginer(modell, s.margin, alleMarginer)),
    [modell, s, alleMarginer],
  )
  // En endring utenfor flyttallene (Q2/Q1 overflyter) kan vurderes med
  // logaritmene, men ikke tegnes: aksene ville fått uendelige grenser.
  const tegnbar = denne.every((p) => Number.isFinite(prosentFor(p.korrigertRatio)))
  const graf = useMemo(
    () => (tegnbar ? byggProfilgraf(s, BE_URIN_ROLLENAVN, denne.map((p) => prosentFor(p.korrigertRatio))) : null),
    [s, denne, tegnbar],
  )
  if (!graf) {
    return (
      <p className="notis" role="note">
        {FOR_STOR_TIL_FIGUR}
      </p>
    )
  }

  return (
    <>
      <ul className="thc-legende" aria-label="Utskillelsesprofilene">
        {s.profiler.map((p) => (
          <li key={p.rolle} className="thc-legende__rad">
            <span className="thc-legende__oppforing">
              <span className="thc-legende__punkt">
                <Profilstrek rolle={p.rolle} />
                <span>{BE_URIN_ROLLENAVN[p.rolle]}</span>
              </span>
            </span>
            <span className="thc-legende__terskel">
              Etter {antallDogn(s.dager)}: {formaterProsent(prosentFor(p.terskel))}
            </span>
          </li>
        ))}
      </ul>

      <BeUrinFigur
        graf={graf}
        kurveklasse={(kurve) => `be-kurve--${kurve.rolle}`}
        punkter={denne.map((punkt) => ({
          margin: punkt.margin,
          prosent: prosentFor(punkt.korrigertRatio),
          tekst: `${marginvalg(punkt.margin)} sikkerhetsmargin: ${formaterProsent(prosentFor(punkt.korrigertRatio))}`,
        }))}
        alleMarginer={alleMarginer}
        beskrivelse="Prosentvis endring i Q etter de fem utskillelsesprofilene, sammenlignet med denne prøven"
      />
    </>
  )
}
