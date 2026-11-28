import { useCallback, useId, useState } from 'react'
import { useHenting } from '../../hooks/useHenting'
import { hentMedlemmer, settVaktplanansvarlig } from '../kommandoer'

/**
 * De vaktplanansvarlige (B3, K-TIL-5): den lokale administratoren velger
 * blant fagmiljøets aktive medlemmer, og flere kan ha rollen samtidig. Hver
 * utpeking og fjerning føres i tilgangsloggen på serveren.
 */
export function Vaktplanansvarlige({ fagmiljo, onEndret }: { fagmiljo: string; onEndret: () => void }) {
  const id = useId()
  const hent = useCallback(() => hentMedlemmer(fagmiljo), [fagmiljo])
  const { tilstand, hentPaNytt } = useHenting(hent, fagmiljo)
  const [arbeider, setArbeider] = useState<string | null>(null)
  const [feil, setFeil] = useState<string | null>(null)

  const sett = async (bruker: string, ansvarlig: boolean) => {
    setArbeider(bruker)
    setFeil(null)
    try {
      await settVaktplanansvarlig(fagmiljo, bruker, ansvarlig)
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setArbeider(null)
      hentPaNytt()
      onEndret()
    }
  }

  return (
    <section className="personalansvarlige" aria-labelledby={`${id}-tittel`}>
      <h2 id={`${id}-tittel`} className="gruppeside__deltittel">
        Vaktplanansvarlige
      </h2>
      <p className="felt__hjelp">De vaktplanansvarlige endrer kalenderen, vaktene og vaktandelene. Flere kan ha rollen samtidig.</p>
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
      {tilstand.status === 'laster' && <p className="personaltomt">Henter medlemmene …</p>}
      {tilstand.status === 'feil' && (
        <p className="skjemafeil" role="alert">
          {tilstand.melding}
        </p>
      )}
      {tilstand.status === 'klar' && (
        <div className="avkryssinger">
          {tilstand.data.map((m) => (
            <label key={m.bruker} className="avkryssing">
              <input type="checkbox" checked={m.vaktplanansvarlig} disabled={arbeider !== null} onChange={(e) => void sett(m.bruker, e.target.checked)} />
              {m.navn}
            </label>
          ))}
        </div>
      )}
    </section>
  )
}
