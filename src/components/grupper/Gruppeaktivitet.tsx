import { useCallback, useEffect, useMemo, useState } from 'react'
import { hentGruppeaktivitet } from '../../grupper/api'
import { tilHendelse, type Gruppehendelse } from '../../grupper/aktivitet'
import type { Gruppeoversikt } from '../../grupper/modell'
import { Oppsummeringskort, type Panelinnhold } from '../oppsummering/Oppsummeringskort'

/**
 * «Siste aktivitet» øverst på gruppesiden: inntil tre hendelser fra andre,
 * hver rad en lenke til selve hendelsen. Hentes for seg, etter gruppen, så
 * en gruppe som ikke kan leses, aldri spør etter aktiviteten; og på nytt
 * hver gang gruppen er hentet på nytt (etter en endring i den).
 */
export function Gruppeaktivitet({ gruppe }: { gruppe: Gruppeoversikt }) {
  const [rader, setRader] = useState<Gruppehendelse[] | null>(null)
  const [feil, setFeil] = useState(false)
  const [forsok, setForsok] = useState(0)
  const provIgjen = useCallback(() => setForsok((n) => n + 1), [])

  useEffect(() => {
    let gjeldende = true
    setFeil(false)
    hentGruppeaktivitet(gruppe.id).then(
      (svar) => gjeldende && setRader(svar),
      () => {
        if (!gjeldende) return
        setRader(null)
        setFeil(true)
      },
    )
    return () => {
      gjeldende = false
    }
  }, [gruppe, forsok])

  const innhold = useMemo<Panelinnhold>(() => {
    if (feil) return { status: 'feil', provIgjen }
    if (!rader) return { status: 'laster' }
    return { status: 'klar', hendelser: rader.map((r) => tilHendelse(gruppe.id, r)) }
  }, [feil, rader, provIgjen, gruppe.id])

  return <Oppsummeringskort tittel="Siste aktivitet" ikon="history" innhold={innhold} tomtekst="Ingen ny aktivitet fra de andre i gruppen." />
}
