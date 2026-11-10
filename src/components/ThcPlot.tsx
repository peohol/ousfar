import { useMemo } from 'react'
import { Tips } from './Tips'
import {
  byggGraf,
  figurkurver,
  formaterProsent,
  marginpunkter,
  terskler,
  visningsmarginer,
  type ThcPunktutfall,
  type ThcTerskel,
} from '../domain/thcPlot'
import type { ThcGrunnlag } from '../domain/thcMotor'
import type { ThcRegelsett } from '../domain/thcRegelsett'
import { konklusjonsnavnISetning, marginvalg } from '../domain/thcVisning'

/**
 * Visualiseringen av en fortolkning mot forrige prøve: de tre
 * utskillelseskurvene som prosentvis endring fra forrige prøve, med forrige
 * og denne prøven som punkter. Ligger den korrigerte endringen over en
 * kurve, har konsentrasjonen falt mindre enn kurven tilsier.
 *
 * Ren SVG i appens egne farger, så figuren følger temaet. Bare rutenett —
 * ingen ramme eller akselinjer — og tallene på y-aksen står til høyre.
 * Legenden ligger utenfor figuren, i vanlig HTML, slik at hvert kurvenavn
 * kan bære et tips om hva profilen står for.
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

/** Hva hver utskillelsesprofil står for — vises som tips på legenden. */
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

/** Det som står ved siden av legenden for hver terskel. */
function terskeltekst(terskel: ThcTerskel, kronisk: boolean): string {
  const navn = (k: ThcPunktutfall) => `«${konklusjonsnavnISetning(k, null)}»`
  if (terskel === 'nedre') return `Skiller ${navn('ikke_nodvendigvis')} fra ${navn('vanskelig')}`
  if (terskel === 'ovre') return `Skiller ${navn('vanskelig')} fra ${navn('nytt_inntak')}`
  return kronisk
    ? 'Brukes ikke i fortolkningen ved kronisk bruk'
    : 'Brukes ikke i fortolkningen når kronisk bruk ikke legges til grunn'
}

/** Klammen er aldri lavere enn dette, så den synes også når punktene nesten faller sammen. */
const MINSTE_KLAMME = 22
/** Hvor bred klammen er, fra spissen til armene. */
const KLAMMEBREDDE = 14

/**
 * En «{» fra `y1` til `y2` med armene mot høyre i `x` og spissen mot venstre,
 * midt mellom.
 */
function klammesti(x: number, y1: number, y2: number): string {
  const spiss = x - KLAMMEBREDDE
  const midtX = x - KLAMMEBREDDE / 2
  const midtY = (y1 + y2) / 2
  const bue = Math.min(KLAMMEBREDDE / 2, (y2 - y1) / 4)
  return [
    `M ${x} ${y1}`,
    `Q ${midtX} ${y1} ${midtX} ${y1 + bue}`,
    `L ${midtX} ${midtY - bue}`,
    `Q ${midtX} ${midtY} ${spiss} ${midtY}`,
    `Q ${midtX} ${midtY} ${midtX} ${midtY + bue}`,
    `L ${midtX} ${y2 - bue}`,
    `Q ${midtX} ${y2} ${x} ${y2}`,
  ].join(' ')
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

  const xMerker: number[] = []
  for (let dag = 0; dag <= graf.xMaks + 1e-6; dag += graf.xSteg) xMerker.push(dag)

  return (
    <>
      <ul className="thc-legende">
        {graf.kurver.map((kurve) => (
          <li key={kurve.tone} className="thc-legende__rad">
            {/* Boblen spenner over hele legenden, ikke bare over navnet den
                hører til, så den lange forklaringen får plass å stå på. */}
            <span className="thc-legende__oppforing">
              <Tips forklaring={PROFILTIPS[kurve.tone]} className="thc-legende__punkt">
                <span
                  className={`thc-legende__strek thc-legende__strek--${terskel[kurve.tone]}`}
                  aria-hidden="true"
                />
                <span className="tipsanker__navn">{kurve.navn}</span>
              </Tips>
            </span>
            <span
              className={
                terskel[kurve.tone] === 'ubrukt' ? 'thc-legende__terskel thc-legende__terskel--ubrukt' : 'thc-legende__terskel'
              }
            >
              {terskeltekst(terskel[kurve.tone], grunnlag.kronisk)}
            </span>
          </li>
        ))}
      </ul>

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
            <title>
              {`${marginvalg(punkt.margin)} sikkerhetsmargin: ${formaterProsent(punkt.prosent)}, ${konklusjonsnavnISetning(punkt.utfall, null)}`}
            </title>
          </circle>
        ))}
        {alleMarginer ? (
          <Klamme
            x={x(graf.xMaks) - 12}
            ys={denne.map((p) => y(p.prosent))}
            ovreGrense={topp}
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
    </>
  )
}

/** En etikett i figuren, én linje per tekst. */
function Etikett({ x, y, anker, children }: { x: number; y: number; anker: 'start' | 'end'; children: string[] }) {
  return (
    <text className="thc-plot__etikett" x={x} y={y} textAnchor={anker}>
      {children.map((linje, i) => (
        <tspan key={linje} x={x} dy={i === 0 ? 0 : 21}>
          {linje}
        </tspan>
      ))}
    </text>
  )
}

/**
 * Klammen fra etiketten «Denne prøven» rundt alle punktene for denne prøven,
 * så det synes at de er mulige verdier for den samme prøven.
 */
function Klamme({ x, ys, ovreGrense }: { x: number; ys: number[]; ovreGrense: number }) {
  const midt = (Math.min(...ys) + Math.max(...ys)) / 2
  const halv = Math.max(Math.max(...ys) - Math.min(...ys), MINSTE_KLAMME) / 2
  const y1 = midt - halv
  const y2 = midt + halv
  // To linjer, midtstilt på spissen, men aldri over toppen av figuren.
  const forsteLinje = Math.max(midt - 4, ovreGrense + 6)
  return (
    <>
      <path className="thc-plot__klamme" d={klammesti(x, y1, y2)} />
      <Etikett x={x - KLAMMEBREDDE - 8} y={forsteLinje} anker="end">
        {['Denne prøven', '(ulike sikkerhetsmarginer)']}
      </Etikett>
    </>
  )
}
