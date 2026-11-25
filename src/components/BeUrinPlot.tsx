import { useMemo } from 'react'
import { Etikett, Klamme } from './Figurdeler'
import { marginpunkter, visningsmarginer, type BeUrinKonklusjon, type BeUrinMarginpunkt, type BeUrinSammenligning } from '../domain/beUrinMotor'
import type { BeUrinModell } from '../domain/beUrinModell'
import { byggBeUrinGraf, prosentFor, type BeUrinGraf, type BeUrinTerskelrolle } from '../domain/beUrinPlot'
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

/** Merknaden i stedet for figuren når endringen er for stor til å tegnes, for begge modellformene. */
export const FOR_STOR_TIL_FIGUR = 'Endringen mellom prøvene er for stor til å tegnes i figuren. Vurderingen gjelder som den står.'

/** Merknaden som står i stedet for figuren når aksene ikke kan tegnes. */
export function Figurmerknad() {
  return (
    <p className="notis" role="note">
      {FOR_STOR_TIL_FIGUR}
    </p>
  )
}

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
  if (!graf) return <Figurmerknad />

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

      <BeUrinFigur
        graf={graf}
        kurveklasse={(kurve) => `thc-plot__kurve--${STREK[kurve.rolle]}`}
        punkter={denne.map((punkt) => ({
          margin: punkt.margin,
          prosent: prosentFor(punkt.korrigertRatio),
          tone: PUNKTTONE[punkt.konklusjon],
          tekst: punkttekst(punkt),
        }))}
        alleMarginer={alleMarginer}
        beskrivelse="Prosentvis endring i Q etter de to utskillelsesprofilene, sammenlignet med denne prøven"
      />
    </>
  )
}

/** Et punkt for denne prøven i figuren: én margin. */
export interface Figurpunkt {
  margin: number
  prosent: number
  /** Fargen punktet har, eller den nøytrale. */
  tone?: 'gronn' | 'gul' | 'rod'
  /** Punktet med ord, i tipset og i listen under figuren. */
  tekst: string
}

/**
 * Selve figuren, delt mellom modellformene: aksene, profilene, forrige prøve
 * ved 0 % og denne prøven ved d med én eller alle marginene, og punktene som
 * tekst under. Fargen og streken på hver profil kommer fra `kurveklasse`.
 */
export function BeUrinFigur<R>({
  graf,
  kurveklasse,
  punkter,
  alleMarginer,
  punktliste = true,
  beskrivelse,
}: {
  graf: BeUrinGraf<R>
  kurveklasse: (kurve: BeUrinGraf<R>['kurver'][number]) => string
  punkter: Figurpunkt[]
  alleMarginer: boolean
  /** Punktene som tekst under figuren. */
  punktliste?: boolean
  beskrivelse: string
}) {
  const venstre = MARG.venstre
  const hoyre = BREDDE - MARG.hoyre
  const topp = MARG.topp
  const bunn = HOYDE - MARG.bunn
  const x = (dag: number) => venstre + (dag / graf.xMaks) * (hoyre - venstre)
  const y = (prosent: number) => topp + ((graf.yTopp - prosent) / (graf.yTopp - graf.yBunn)) * (bunn - topp)

  const { xMerker, yMerker } = graf
  const punktklasse = (p: Figurpunkt) => `thc-plot__punkt${p.tone ? ` thc-plot__punkt--${p.tone}` : ''}`

  return (
    <>
      <svg className="thc-plot__figur" viewBox={`0 0 ${BREDDE} ${HOYDE}`} role="img" aria-label={beskrivelse}>
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
            className={`thc-plot__kurve ${kurveklasse(kurve)}`}
            points={kurve.punkter.map((p) => `${x(p.dag).toFixed(1)},${y(p.prosent).toFixed(1)}`).join(' ')}
          />
        ))}

        <circle className="thc-plot__punkt" cx={x(0)} cy={y(0)} r={7} />
        <Etikett x={x(0) + 13} y={y(0) + (y(0) < topp + 24 ? 27 : -13)} anker="start">
          {['Forrige prøve']}
        </Etikett>

        {punkter.map((punkt) => (
          <circle key={punkt.margin} className={punktklasse(punkt)} cx={x(graf.xMaks)} cy={y(punkt.prosent)} r={7}>
            <title>{punkt.tekst}</title>
          </circle>
        ))}
        {alleMarginer ? (
          <Klamme x={x(graf.xMaks) - 12} ys={punkter.map((p) => y(p.prosent))} ovreGrense={topp} nedreGrense={bunn} />
        ) : (
          punkter.map((punkt) => {
            const py = y(punkt.prosent)
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

      {punktliste && (
        <ul className="thc-marginpunkter" aria-label="Denne prøven med sikkerhetsmarginen">
          {punkter.map((punkt) => (
            <li key={punkt.margin} className="thc-marginpunkter__punkt">
              <span
                className={`thc-marginpunkter__prikk${punkt.tone ? ` thc-marginpunkter__prikk--${punkt.tone}` : ' thc-marginpunkter__prikk--noytral'}`}
                aria-hidden="true"
              />
              {punkt.tekst}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
