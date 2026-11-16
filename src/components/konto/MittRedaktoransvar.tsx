import { useEffect, useState } from 'react'
import { tidspunkt } from '../../faginnhold/historikk'
import { ansvarstekst, personnavn, redaktorlager, type Redaktoransvar, type Redaktorlager } from '../../redaktorer/ansvar'
import { Modallag } from '../Modallag'

/**
 * «Mitt redaktøransvar» i kontomenyen (P5 tråd A): hva den innloggede er
 * redaktør for, hvem som ga ansvaret og når, og hva det betyr. Bare
 * visningen; ansvaret gis og tas tilbake i administrasjonen.
 */
export function MittRedaktoransvar({ apen, onLukk, lager = redaktorlager }: { apen: boolean; onLukk: () => void; lager?: Redaktorlager }) {
  const [ansvar, setAnsvar] = useState<Redaktoransvar[] | null>(null)
  const [feil, setFeil] = useState<string | null>(null)

  useEffect(() => {
    if (!apen) return
    let gjeldende = true
    setFeil(null)
    lager.mine().then(
      (a) => gjeldende && setAnsvar(a),
      (e: unknown) => gjeldende && setFeil(e instanceof Error ? e.message : 'Fikk ikke hentet ansvaret ditt.'),
    )
    return () => {
      gjeldende = false
    }
  }, [apen, lager])

  return (
    <Modallag apen={apen} tittel="Mitt redaktøransvar" ikon="edit" onLukk={onLukk}>
      <p className="autoerstatt__ingress">
        Du kan endre utkastet i det du er redaktør for, og forslag til det kommer til deg. Endringene blir synlige for andre når en
        administrator publiserer dem.
      </p>
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
      {ansvar === null ? (
        !feil && <p className="autoerstatt__tomt">Henter ansvaret ditt …</p>
      ) : ansvar.length === 0 ? (
        <p className="autoerstatt__tomt">Du har ikke redaktøransvar for noe nå.</p>
      ) : (
        <ul className="autoerstatt__liste">
          {ansvar.map((a) => (
            <li key={a.id} className="autoerstatt__rad autoerstatt__rad--skjema">
              <p className="verktoysperrer__mal">{ansvarstekst(a)}</p>
              {!a.gjelder && <p className="verktoysperrer__grunn">Gjelder ikke nå.</p>}
              {a.merknad && <p className="verktoysperrer__grunn">{a.merknad}</p>}
              <p className="felt__hjelp">
                Gitt {tidspunkt(a.tildeltKl)}
                {a.tildeltAv && ` av ${personnavn(a.tildeltAv)}`}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Modallag>
  )
}
