import { periodTense } from '@delt/personal/dutyShare'
import { useId, useState } from 'react'
import { Button } from '../../components/Button'
import { Ikon } from '../../components/ikon/Ikon'
import { useBevart } from '../../oppdatering/Bevaring'
import { lagreVaktandel } from '../kommandoer'
import { kortDato } from '../datoer'
import { endreVaktandel, ordinaerePerioder, vaktandelI, type Innstillinger, type Medarbeider, type Medarbeidergrunnlag, type Vaktandelendring } from './modell'

/**
 * Vaktandelen (§6.2): ordinær fra en dato, og midlertidige perioder, bare fra
 * i dag og fremover. Tidligere, gjeldende og fremtidige vises; bare det som
 * ikke har begynt, kan fjernes. Endringen regnes med domenefunksjonene først, så feilen
 * vises før noe sendes, og så lagres hele vaktandelen; serveren kontrollerer
 * den på nytt (`personal_lagre_vaktandel`).
 */
export function Vaktandel({
  fagmiljo,
  medarbeider: m,
  grunnlag: { iDag, rolle },
  arbeider,
  onLagre,
}: {
  fagmiljo: string
  medarbeider: Medarbeider
  grunnlag: Medarbeidergrunnlag
  arbeider: boolean
  onLagre: (endring: () => Promise<Innstillinger>) => Promise<boolean>
}) {
  const id = useId()
  const naa = vaktandelI(m, iDag)
  const [ordinaer, setOrdinaer] = useBevart(`personal-vaktandel-${m.id}`, { fra: iDag, prosent: String(naa) })
  const [periode, setPeriode] = useBevart(`personal-periode-${m.id}`, { fra: iDag, til: iDag, prosent: '50' })
  const [feil, setFeil] = useState<string | null>(null)

  const bruk = async (endring: Vaktandelendring): Promise<boolean> => {
    setFeil(null)
    let plan
    try {
      plan = endreVaktandel(m, rolle, endring, iDag)
    } catch (e) {
      setFeil(e instanceof Error ? e.message : String(e))
      return false
    }
    return onLagre(() => lagreVaktandel(fagmiljo, m.id, plan, m.revisjon))
  }
  const prosent = (tekst: string) => (tekst.trim() === '' ? Number.NaN : Number(tekst))
  const ordinaere = ordinaerePerioder(m, iDag)

  return (
    <section className="personalvaktandel" aria-labelledby={`${id}-tittel`}>
      <h3 id={`${id}-tittel`} className="personalvaktandel__hode">
        <span>Vaktandel nå</span>
        <strong>{naa} %</strong>
      </h3>
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}

      {ordinaere.length > 0 && (
        <ul className="personalvaktandel__liste" aria-label="Ordinær vaktandel">
          {ordinaere.map((o) => (
            <li key={o.fra}>
              <span>
                {o.til ? `${kortDato(o.fra)}–${kortDato(o.til)}` : `Fra ${kortDato(o.fra)}`}
              </span>
              <strong>{o.prosent} %</strong>
              {o.tid === 'future' ? (
                <Button variant="kant" icon={<Ikon navn="trash" />} disabled={arbeider} onClick={() => void bruk({ slag: 'fjern-ordinaer', fra: o.fra })} aria-label={`Fjern vaktandelen fra ${kortDato(o.fra)}`}>
                  Fjern
                </Button>
              ) : (
                <span className="personaltabell__dempet">{o.tid === 'current' ? 'Gjelder nå' : 'Tidligere'}</span>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="personalvaktandel__rad"
        aria-label="Ordinær vaktandel"
        onSubmit={(e) => {
          e.preventDefault()
          void bruk({ slag: 'ordinaer', fra: ordinaer.fra, prosent: prosent(ordinaer.prosent) })
        }}
      >
        <label className="felt">
          <span className="felt__merkelapp">Ordinær fra</span>
          <input className="felt__inndata" type="date" min={iDag} required value={ordinaer.fra} onChange={(e) => setOrdinaer((o) => ({ ...o, fra: e.target.value }))} />
        </label>
        <label className="felt personalfelt--smal">
          <span className="felt__merkelapp">Prosent</span>
          <input className="felt__inndata" type="number" inputMode="numeric" min={0} max={100} step={1} required value={ordinaer.prosent} onChange={(e) => setOrdinaer((o) => ({ ...o, prosent: e.target.value }))} />
        </label>
        <Button type="submit" variant="kant" disabled={arbeider}>
          Sett
        </Button>
      </form>

      <h4 className="felt__merkelapp">Midlertidig</h4>
      {m.vaktandel.temporary.length > 0 && (
        <ul className="personalvaktandel__liste" aria-label="Midlertidige perioder">
          {m.vaktandel.temporary.map((t) => {
            const tid = periodTense(t, iDag)
            return (
              <li key={t.id}>
                <span>
                  {kortDato(t.from)}–{kortDato(t.to)}
                </span>
                <strong>{t.percent} %</strong>
                {tid === 'past' ? (
                  <span className="personaltabell__dempet">Avsluttet</span>
                ) : (
                  <Button variant="kant" icon={<Ikon navn="trash" />} disabled={arbeider} onClick={() => void bruk({ slag: 'fjern-midlertidig', id: t.id })}>
                    {tid === 'current' ? 'Avslutt' : 'Fjern'}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      <form
        className="personalvaktandel__rad"
        aria-label="Ny midlertidig periode"
        onSubmit={(e) => {
          e.preventDefault()
          void bruk({ slag: 'midlertidig', fra: periode.fra, til: periode.til, prosent: prosent(periode.prosent) }).then(
            (ok) => ok && setPeriode({ fra: iDag, til: iDag, prosent: '50' }),
          )
        }}
      >
        <label className="felt">
          <span className="felt__merkelapp">Fra</span>
          <input className="felt__inndata" type="date" min={iDag} required value={periode.fra} onChange={(e) => setPeriode((o) => ({ ...o, fra: e.target.value }))} />
        </label>
        <label className="felt">
          <span className="felt__merkelapp">Til</span>
          <input className="felt__inndata" type="date" min={periode.fra} required value={periode.til} onChange={(e) => setPeriode((o) => ({ ...o, til: e.target.value }))} />
        </label>
        <label className="felt personalfelt--smal">
          <span className="felt__merkelapp">Prosent</span>
          <input className="felt__inndata" type="number" inputMode="numeric" min={0} max={100} step={1} required value={periode.prosent} onChange={(e) => setPeriode((o) => ({ ...o, prosent: e.target.value }))} />
        </label>
        <Button type="submit" variant="kant" icon={<Ikon navn="plus" />} disabled={arbeider}>
          Legg til
        </Button>
      </form>
    </section>
  )
}
