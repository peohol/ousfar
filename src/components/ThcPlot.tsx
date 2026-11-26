import { useMemo } from 'react'
import { Etikett, Klamme, Kurvestrek } from './Figurdeler'
import { Tips } from './Tips'
import {
  byggGraf,
  figurkurver,
  formaterProsent,
  marginpunkter,
  terskler,
  visningsmarginer,
  type Marginpunkt,
  type ThcPunktutfall,
  type ThcTerskel,
} from '../domain/thcPlot'
import type { ThcGrunnlag } from '../domain/thcMotor'
import type { ThcRegelsett } from '../domain/thcRegelsett'
import { antallDager, konklusjonsnavnISetning, marginvalg } from '../domain/thcVisning'
import { THC_KURVEROLLER } from '../domain/thcRegelsett'

/**
 * Visualiseringen av en fortolkning mot forrige prøve: de tre
 * utskillelseskurvene som prosentvis endring fra forrige prøve, med forrige
 * og denne prøven som punkter. Ligger den korrigerte endringen over en
 * kurve, har konsentrasjonen falt mindre enn kurven tilsier.
 *
 * Ren SVG i appens egne farger, så figuren følger temaet. Bare rutenett —
 * ingen ramme eller akselinjer — og tallene på y-aksen står til høyre.
 * Tegnforklaringen er tabellen over figuren ({@link ThcProfiltabell}, #586),
 * der hvert kurvenavn bærer et tips om hva profilen står for.
 *
 * Punktet for denne prøven flytter seg med sikkerhetsmarginen, siden det er
 * den korrigerte endringen som sammenlignes med kurvene. Med `alleMarginer`
 * står det ett punkt per margin, samlet med en klamme fra etiketten.
 *
 * Fargene viser terskelfunksjonen, ikke kurven: for bruksmønsteret er den
 * nedre terskelen grønn, den øvre rød, og kurven fortolkningen ikke leser av,
 * grå og stiplet. Punktene for denne prøven er grønne under den nedre
 * terskelen, gule mellom tersklene og røde over den øvre.
 */

const BREDDE = 900
const HOYDE = 430

/** Luft rundt tegneflaten: dagene under, prosentene til høyre. */
const MARG = { topp: 26, hoyre: 100, bunn: 72, venstre: 24 }

/** Hva hver utskillelsesprofil står for — vises som tips på navnet i tabellen. */
const PROFILTIPS: Record<'gronn' | 'gul' | 'rod', string> = {
  gronn:
    'Denne utskillelsesprofilen anses å være relativt representativ for brukere flest ved moderat bruk av cannabis, dog tregere enn det som vanligvis sees etter et enkeltinntak.',
  gul: 'Denne utskillelsesprofilen anses å være tregere enn det som kan sees etter et enkeltinntak. Den er trolig også noe tregere enn forventet – men fortsatt innenfor det som er mulig – hos de kroniske brukere.',
  rod: 'Dette er den mest ekstreme utskillelsesprofilen som noensinne har blitt dokumentert. Vi har per dags dato ikke sett eksempler på at THC-syre kan skilles ut saktere enn dette.',
}

/** Fargen et punkt for denne prøven får etter hvor det ligger mot tersklene. */
const PUNKTTONE: Record<ThcPunktutfall, 'gronn' | 'gul' | 'rod'> = {
  ikke_nodvendigvis: 'gronn',
  vanskelig: 'gul',
  nytt_inntak: 'rod',
}

/** Betydningen hver kurve har for fortolkningen, i tabellen. */
function terskeltekst(terskel: ThcTerskel, kronisk: boolean): string {
  const navn = (k: ThcPunktutfall) => `«${konklusjonsnavnISetning(k, null)}»`
  if (terskel === 'nedre') return `Skiller ${navn('ikke_nodvendigvis')} fra ${navn('vanskelig')}`
  if (terskel === 'ovre') return `Skiller ${navn('vanskelig')} fra ${navn('nytt_inntak')}`
  return kronisk
    ? 'Brukes ikke i fortolkningen ved kronisk bruk'
    : 'Brukes ikke i fortolkningen når kronisk bruk ikke legges til grunn'
}

/** «Ingen (50 %) sikkerhetsmargin: −34 %, nytt inntak» — tipset på punktet og linjen under figuren. */
function punkttekst({ margin, prosent, utfall }: Marginpunkt): string {
  return `${marginvalg(margin)} sikkerhetsmargin: ${formaterProsent(prosent)}, ${konklusjonsnavnISetning(utfall, null)}`
}

/**
 * Tabellen over figuren (#586), etter mønster fra benzoylekgonin i urin: både
 * tegnforklaringen og oversikten. For hver utskillelsesprofil streken slik den
 * står i figuren (farge og stiplingsmønster etter terskelen den er for
 * bruksmønsteret), navnet, forventet endring etter like mange dager som
 * mellom prøvene, og hva kurven betyr for fortolkningen. Kurven som ikke
 * brukes ved det valgte bruksmønsteret, står dempet.
 */
export function ThcProfiltabell({ grunnlag, regler }: { grunnlag: ThcGrunnlag; regler: ThcRegelsett }) {
  const terskel = terskler(regler, grunnlag.kronisk)
  return (
    <table className="be-profiltabell thc-profiltabell">
      <thead>
        <tr>
          <th scope="col">Utskillelsesprofil</th>
          <th scope="col">Forventet endring etter {antallDager(grunnlag.dager)}</th>
          <th scope="col">Betydning for fortolkningen</th>
        </tr>
      </thead>
      <tbody>
        {THC_KURVEROLLER.map((rolle) => (
          <tr key={rolle} className={terskel[rolle] === 'ubrukt' ? 'thc-profiltabell__ubrukt' : undefined}>
            <th scope="row">
              <span className="be-profiltabell__navn">
                <Kurvestrek klasse={`thc-plot__kurve thc-plot__kurve--${terskel[rolle]}`} />
                <Tips forklaring={PROFILTIPS[rolle]}>{regler.kurver[rolle].navn}</Tips>
              </span>
            </th>
            <td>{formaterProsent(grunnlag.forventet[rolle] * 100)}</td>
            <td>{terskeltekst(terskel[rolle], grunnlag.kronisk)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function ThcPlot({
  grunnlag,
  regler,
  alleMarginer = false,
}: {
  grunnlag: ThcGrunnlag
  regler: ThcRegelsett
  /** Ett punkt for denne prøven per sikkerhetsmargin, i stedet for bare den valgte. */
  alleMarginer?: boolean
}) {
  const denne = useMemo(
    () =>
      marginpunkter(regler, grunnlag, visningsmarginer(regler, grunnlag.sikkerhetsmargin, alleMarginer)),
    [grunnlag, regler, alleMarginer],
  )
  const graf = useMemo(
    () =>
      byggGraf(
        grunnlag,
        figurkurver(regler),
        denne.map((p) => p.prosent),
      ),
    [grunnlag, regler, denne],
  )
  const terskel = terskler(regler, grunnlag.kronisk)
  const forrige = graf.punkter[0]!

  const venstre = MARG.venstre
  const hoyre = BREDDE - MARG.hoyre
  const topp = MARG.topp
  const bunn = HOYDE - MARG.bunn

  const x = (dag: number) => venstre + (dag / graf.xMaks) * (hoyre - venstre)
  const y = (prosent: number) =>
    topp + ((graf.yTopp - prosent) / (graf.yTopp - graf.yBunn)) * (bunn - topp)

  const yMerker: number[] = []
  for (let v = graf.yBunn; v <= graf.yTopp + 1e-6; v += graf.ySteg) yMerker.push(v)

  // Tidsrommet er hele døgn, så merkene står aldri tettere enn ett døgn
  // (`velgDognsteg`, som i benzoylekgonin i urin): et brøkdelstrinn ga samme
  // døgn to ganger under aksen. `graf.xSteg` står urørt, siden tallgrunnlaget
  // i fasiten er låst.
  const xSteg = Math.max(1, graf.xSteg)
  const xMerker: number[] = []
  for (let dag = 0; dag <= graf.xMaks + 1e-6; dag += xSteg) xMerker.push(dag)

  return (
    <>
      <svg
        className="thc-plot__figur"
        viewBox={`0 0 ${BREDDE} ${HOYDE}`}
        role="img"
        aria-label="Forventet prosentvis endring i IRCAK etter utskillelseskurvene, sammenlignet med denne prøven"
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
            key={kurve.tone}
            className={`thc-plot__kurve thc-plot__kurve--${terskel[kurve.tone]}`}
            points={kurve.punkter.map((p) => `${x(p.dag).toFixed(1)},${y(p.prosent).toFixed(1)}`).join(' ')}
          />
        ))}

        <circle className="thc-plot__punkt" cx={x(forrige.dag)} cy={y(forrige.prosent)} r={7} />
        <Etikett x={x(forrige.dag) + 13} y={y(forrige.prosent) + (y(forrige.prosent) < topp + 24 ? 27 : -13)} anker="start">
          {[forrige.navn]}
        </Etikett>

        {denne.map((punkt) => (
          <circle
            key={punkt.margin}
            className={`thc-plot__punkt thc-plot__punkt--${PUNKTTONE[punkt.utfall]}`}
            cx={x(graf.xMaks)}
            cy={y(punkt.prosent)}
            r={7}
          >
            <title>{punkttekst(punkt)}</title>
          </circle>
        ))}
        {alleMarginer ? (
          <Klamme
            x={x(graf.xMaks) - 12}
            ys={denne.map((p) => y(p.prosent))}
            ovreGrense={topp}
            nedreGrense={bunn}
          />
        ) : (
          denne.map((punkt) => (
            <Etikett
              key={punkt.margin}
              x={x(graf.xMaks) - 13}
              y={y(punkt.prosent) + (y(punkt.prosent) < topp + 24 ? 27 : -13)}
              anker="end"
            >
              {['Denne prøven']}
            </Etikett>
          ))
        )}

        <text
          className="thc-plot__akselnavn"
          x={(venstre + hoyre) / 2}
          y={HOYDE - 16}
          textAnchor="middle"
        >
          Dager siden forrige prøve
        </text>
      </svg>

      {/* Med alle marginene står punktene også som tekst: de kan ligge oppå
          hverandre, og tipset i figuren nås verken med tastatur, berøring
          eller skjermleser. */}
      {alleMarginer && (
        <ul className="thc-marginpunkter" aria-label="Denne prøven med hver sikkerhetsmargin">
          {denne.map((punkt) => (
            <li key={punkt.margin} className="thc-marginpunkter__punkt">
              <span
                className={`thc-marginpunkter__prikk thc-marginpunkter__prikk--${PUNKTTONE[punkt.utfall]}`}
                aria-hidden="true"
              />
              {punkttekst(punkt)}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
