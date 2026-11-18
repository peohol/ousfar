import { Fragment } from 'react'

export interface MetalinjeProps {
  /** Analyttkodene, i den rekkefølgen de står. Moduler med flere koder har alle. */
  koder: string[]
  /** Analysemetoden, f.eks. «SPFA». */
  metode: string
  /** Kategorien innenfor metoden. Utelates når metoden ikke er delt opp. */
  kategori?: string
}

/**
 * Linjen over et stoffnavn i fortolkningsmodulene: «KVE · SPFA ›
 * Antipsykotika». Kodene står i aksentfargen; metoden og kategorien hører
 * sammen (Atlas `MetaLine`). Kodene er tekst: fortolkningen lenker ikke til
 * fagsidene (`docs/domener.md`).
 */
export function Metalinje({ koder, metode, kategori }: MetalinjeProps) {
  return (
    <p className="metalinje">
      {koder.map((kode, i) => (
        <Fragment key={kode}>
          {i > 0 && <span aria-hidden="true">·</span>}
          <span className="metalinje__kode">{kode}</span>
        </Fragment>
      ))}
      <span aria-hidden="true">·</span>
      <span>
        {metode}
        {kategori && (
          <>
            {' '}
            <span aria-hidden="true">›</span> {kategori}
          </>
        )}
      </span>
    </p>
  )
}
