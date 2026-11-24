/**
 * Delene kurvefigurene i fortolkningen (THC-syre, benzoylekgonin i urin)
 * tegner prøvene med: etikettene og klammen rundt punktene for den samme
 * prøven med ulike sikkerhetsmarginer. Ren SVG uten klinisk innhold.
 */

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

/** En etikett i figuren, én linje per tekst. */
export function Etikett({ x, y, anker, children }: { x: number; y: number; anker: 'start' | 'end'; children: string[] }) {
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
export function Klamme({ x, ys, ovreGrense, nedreGrense }: { x: number; ys: number[]; ovreGrense: number; nedreGrense: number }) {
  const midt = (Math.min(...ys) + Math.max(...ys)) / 2
  const halv = Math.max(Math.max(...ys) - Math.min(...ys), MINSTE_KLAMME) / 2
  const y1 = midt - halv
  const y2 = midt + halv
  // To linjer, midtstilt på spissen, men aldri over toppen eller under bunnen
  // av tegneflaten, der dagene står.
  const forsteLinje = Math.min(Math.max(midt - 4, ovreGrense + 6), nedreGrense - 26)
  return (
    <>
      <path className="thc-plot__klamme" d={klammesti(x, y1, y2)} />
      <Etikett x={x - KLAMMEBREDDE - 8} y={forsteLinje} anker="end">
        {['Denne prøven', '(ulike sikkerhetsmarginer)']}
      </Etikett>
    </>
  )
}
