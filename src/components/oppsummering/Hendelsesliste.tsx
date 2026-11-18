import { Ikon } from '../ikon/Ikon'
import { type Hendelse, MAKS_HENDELSER, hendelsestid } from './hendelse'

export interface HendelseslisteProps {
  hendelser: readonly Hendelse[]
  /** Linjen når lista er tom. */
  tomtekst?: string
  /** Flest rader som vises. */
  maks?: number
}

/**
 * Inntil tre hendelser, én rad hver: ikon, hva, hvor og når. Hele raden er
 * lenken til selve hendelsen, så det er ingen egne knapper på radene (D0,
 * valg 2). En tom liste er én kursiv linje, ikke en stor tom flate.
 */
export function Hendelsesliste({
  hendelser,
  tomtekst = 'Ingen nye hendelser.',
  maks = MAKS_HENDELSER,
}: HendelseslisteProps) {
  if (!hendelser.length) return <p className="oppsummering__tom">{tomtekst}</p>
  return (
    <ul className="hendelser">
      {hendelser.slice(0, maks).map((h) => {
        const naar = h.merknad ?? (h.tid ? hendelsestid(h.tid) : '')
        return (
          <li key={h.id}>
            <a className="hendelse" href={h.til} onClick={h.ved}>
              <Ikon navn={h.ikon} className="hendelse__ikon" />
              <span className="hendelse__tittel">
                {h.ulest && (
                  <>
                    <span className="hendelse__ulest" aria-hidden="true" />
                    <span className="kun-skjermleser">Ulest: </span>
                  </>
                )}
                {h.tittel}
              </span>
              <span className="hendelse__hvor">{h.hvor}</span>
              {naar && (
                <span className="hendelse__tid">
                  {h.tid && !h.merknad ? <time dateTime={h.tid}>{naar}</time> : naar}
                </span>
              )}
            </a>
          </li>
        )
      })}
    </ul>
  )
}
