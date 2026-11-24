import { useMemo } from 'react'
import { Etikett, Klamme } from './Figurdeler'
import { marginpunkter, visningsmarginer, type BeUrinKonklusjon, type BeUrinMarginpunkt, type BeUrinSammenligning } from '../domain/beUrinMotor'
import type { BeUrinModell } from '../domain/beUrinModell'
import { byggBeUrinGraf, prosentFor, type BeUrinTerskelrolle } from '../domain/beUrinPlot'
import { konklusjonISetning } from '../domain/beUrinVisning'
import { formaterProsent } from '../domain/thcPlot'
import { marginvalg } from '../domain/thcVisning'

/**
 * Figuren i fortolkningen av benzoylekgonin i urin: de to
 * utskillelsesprofilene som prosentvis endring fra forrige prøve, og denne
 * prøven ved d døgn, med den valgte eller alle sikkerhetsmarginene. Samme
 * tegning som THC-syremodulens.
 *
 * Fargen følger terskelen profilen er for disse prøvene, ikke hvilken profil
 * det er, siden rekkefølgen varierer: den nedre grønn, den øvre rød. Legenden
 * sier det samme med ord, og punktene står som tekst under figuren.
 */

const BREDDE = 900
const HOYDE = 430
const MARG = { topp: 26, hoyre: 100, bunn: 72, venstre: 24 }

const PUNKTTONE: Record<BeUrinKonklusjon, 'gronn' | 'gul' | 'rod'> = {
  ikke_nodvendigvis: 'gronn',
  kan_ikke_fastslaas: 'gul',
  nytt_inntak: 'rod',
}

/** Klassen kurven og legenden tegnes med: THC-modulens nedre og øvre terskel. */
const STREK: Record<BeUrinTerskelrolle, 'nedre' | 'ovre'> = { nedre: 'nedre', ovre: 'ovre', lik: 'ovre' }

function terskeltekst(rolle: BeUrinTerskelrolle): string {
  const navn = (k: BeUrinKonklusjon) => `«${konklusjonISetning(k, null)}»`
  if (rolle === 'nedre') return `Skiller ${navn('ikke_nodvendigvis')} fra ${navn('kan_ikke_fastslaas')}`
  if (rolle === 'ovre') return `Skiller ${navn('kan_ikke_fastslaas')} fra ${navn('nytt_inntak')}`
  return `Samme terskel som den andre profilen: skiller ${navn('ikke_nodvendigvis')} fra ${navn('nytt_inntak')}`
}

function punkttekst({ margin, korrigertRatio, konklusjon }: BeUrinMarginpunkt): string {
  return `${marginvalg(margin)} sikkerhetsmargin: ${formaterProsent(prosentFor(korrigertRatio))}, ${konklusjonISetning(konklusjon, null)}`
}

export function BeUrinPlot({
  sammenligning,
  modell,
  alleMarginer = false,
}: {
  sammenligning: BeUrinSammenligning
  modell: BeUrinModell
  alleMarginer?: boolean
}) {
  const denne = useMemo(
    () => marginpunkter(modell, sammenligning, visningsmarginer(modell, sammenligning.margin, alleMarginer)),
    [modell, sammenligning, alleMarginer],
  )
  const graf = useMemo(
    () => byggBeUrinGraf(sammenligning, modell.kurver, denne.map((p) => prosentFor(p.korrigertRatio))),
    [sammenligning, modell, denne],
  )

  const venstre = MARG.venstre
  const hoyre = BREDDE - MARG.hoyre
  const topp = MARG.topp
  const bunn = HOYDE - MARG.bunn
  const x = (dag: number) => venstre + (dag / graf.xMaks) * (hoyre - venstre)
  const y = (prosent: number) => topp + ((graf.yTopp - prosent) / (graf.yTopp - graf.yBunn)) * (bunn - topp)

  const yMerker: number[] = []
  for (let v = graf.yBunn; v <= graf.yTopp + 1e-6; v += graf.ySteg) yMerker.push(v)
  const xMerker: number[] = []
  for (let dag = 0; dag <= graf.xMaks + 1e-6; dag += graf.xSteg) xMerker.push(dag)

  return (
    <>
      <ul className="thc-legende">
        {graf.kurver.map((kurve) => (
          <li key={kurve.navn} className="thc-legende__rad">
            <span className="thc-legende__oppforing">
              <span className="thc-legende__punkt">
                <span className={`thc-legende__strek thc-legende__strek--${STREK[kurve.rolle]}`} aria-hidden="true" />
                <span>{kurve.navn}</span>
              </span>
            </span>
            <span className="thc-legende__terskel">{terskeltekst(kurve.rolle)}</span>
          </li>
        ))}
      </ul>

      <svg
        className="thc-plot__figur"
        viewBox={`0 0 ${BREDDE} ${HOYDE}`}
        role="img"
        aria-label="Prosentvis endring i Q etter de to utskillelsesprofilene, sammenlignet med denne prøven"
      >
        {yMerker.map((verdi) => (
          <g key={`y${verdi}`}>
            <line className="thc-plot__rute" x1={venstre} y1={y(verdi)} x2={hoyre} y2={y(verdi)} />
            <text className="thc-plot__verdi" x={hoyre + 12} y={y(verdi)} dominantBaseline="middle">
              {formaterProsent(verdi)}
            </text>
          </g>
        ))}
        {xMerker.map((dag) => (
          <g key={`x${dag}`}>
            <line className="thc-plot__rute" x1={x(dag)} y1={topp} x2={x(dag)} y2={bunn} />
            <text className="thc-plot__verdi" x={x(dag)} y={bunn + 26} textAnchor="middle">
              {Math.round(dag)}
            </text>
          </g>
        ))}
        {graf.kurver.map((kurve) => (
          <polyline
            key={kurve.navn}
            className={`thc-plot__kurve thc-plot__kurve--${STREK[kurve.rolle]}`}
            points={kurve.punkter.map((p) => `${x(p.dag).toFixed(1)},${y(p.prosent).toFixed(1)}`).join(' ')}
          />
        ))}

        <circle className="thc-plot__punkt" cx={x(0)} cy={y(0)} r={7} />
        <Etikett x={x(0) + 13} y={y(0) + (y(0) < topp + 24 ? 27 : -13)} anker="start">
          {['Forrige prøve']}
        </Etikett>

        {denne.map((punkt) => (
          <circle
            key={punkt.margin}
            className={`thc-plot__punkt thc-plot__punkt--${PUNKTTONE[punkt.konklusjon]}`}
            cx={x(graf.xMaks)}
            cy={y(prosentFor(punkt.korrigertRatio))}
            r={7}
          >
            <title>{punkttekst(punkt)}</title>
          </circle>
        ))}
        {alleMarginer ? (
          <Klamme
            x={x(graf.xMaks) - 12}
            ys={denne.map((p) => y(prosentFor(p.korrigertRatio)))}
            ovreGrense={topp}
            nedreGrense={bunn}
          />
        ) : (
          denne.map((punkt) => {
            const py = y(prosentFor(punkt.korrigertRatio))
            return (
              <Etikett key={punkt.margin} x={x(graf.xMaks) - 13} y={py + (py < topp + 24 ? 27 : -13)} anker="end">
                {['Denne prøven']}
              </Etikett>
            )
          })
        )}

        <text className="thc-plot__akselnavn" x={(venstre + hoyre) / 2} y={HOYDE - 16} textAnchor="middle">
          Døgn siden forrige prøve
        </text>
      </svg>

      <ul className="thc-marginpunkter" aria-label="Denne prøven med sikkerhetsmarginen">
        {denne.map((punkt) => (
          <li key={punkt.margin} className="thc-marginpunkter__punkt">
            <span
              className={`thc-marginpunkter__prikk thc-marginpunkter__prikk--${PUNKTTONE[punkt.konklusjon]}`}
              aria-hidden="true"
            />
            {punkttekst(punkt)}
          </li>
        ))}
      </ul>
    </>
  )
}
