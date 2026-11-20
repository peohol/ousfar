import { Gruppesymbol, symbollenke, useGruppesymbollenker } from '../grupper/Gruppesymbol'
import { Ikon } from '../ikon/Ikon'
import { type Hendelse, MAKS_HENDELSER, hendelsestid } from './hendelse'
import { Maallenke } from './Maallenke'

export interface HendelseslisteProps {
  hendelser: readonly Hendelse[]
  /** Linjen når lista er tom. */
  tomtekst?: string
  /** Flest rader som vises. */
  maks?: number
}

/**
 * Inntil tre hendelser, én rad hver: ikon (gruppens symbol for en gruppe), hva, hvor og når. Hele raden er
 * lenken til selve hendelsen (eller én knapp, når den ikke har egen adresse), så det er ingen egne knapper på radene (D0,
 * valg 2). En tom liste er én kursiv linje, ikke en stor tom flate.
 */
export function Hendelsesliste({
  hendelser,
  tomtekst = 'Ingen nye hendelser.',
  maks = MAKS_HENDELSER,
}: HendelseslisteProps) {
  const viste = hendelser.slice(0, maks)
  const grupper = viste.flatMap((h) => (h.gruppe ? [h.gruppe] : []))
  const lenker = useGruppesymbollenker(grupper)
  if (!viste.length) return <p className="oppsummering__tom">{tomtekst}</p>
  return (
    // Med et gruppesymbol i lista er første kolonne like bred på alle radene, så titlene står på linje.
    <ul className={grupper.length ? 'hendelser hendelser--symboler' : 'hendelser'}>
      {viste.map((h) => {
        const naar = h.merknad ?? (h.tid ? hendelsestid(h.tid) : '')
        return (
          <li key={h.id}>
            <Maallenke maal={h} className="hendelse">
              {h.gruppe ? (
                <Gruppesymbol gruppe={h.gruppe} lenke={symbollenke(h.gruppe, lenker)} storrelse="liten" />
              ) : (
                <Ikon navn={h.ikon} className="hendelse__ikon" />
              )}
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
            </Maallenke>
          </li>
        )
      })}
    </ul>
  )
}
