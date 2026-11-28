import { useId, useState } from 'react'
import { Button } from '../components/Button'
import { rollenavn, rollerTil, type Kalenderrolle } from './roller'
import type { Simulering } from './simulering'

/**
 * «Vis som» (K-SKJ-7): i et testmiljø kan den innloggede prøve kalenderen med
 * en lavere rolle og som én av de syntetiske medarbeiderne. Valget lagres og
 * håndheves på serveren, så hele kalenderen følger det, og det kan aldri gi
 * flere rettigheter enn den virkelige rollen. Utenfor et testmiljø finnes det
 * ikke, og databasen gir da ingen simulering, så ingenting vises.
 *
 * Valgene viser simuleringen serveren sist har bekreftet, og er låst mens et
 * valg lagres og kalenderen hentes på nytt (`last`), så et nytt valg aldri
 * bygger på en rolle som ikke lenger gjelder.
 */
export function VisSom({
  simulering: s,
  medarbeidere,
  last,
  onVelg,
}: {
  simulering: Simulering | null
  /** De syntetiske medarbeiderne man kan se kalenderen som. */
  medarbeidere: readonly { id: string; navn: string }[]
  last: boolean
  /** Lagrer valget; avvises det, kastes meldingen. */
  onVelg: (rolle: Kalenderrolle | null, medarbeider: string | null) => Promise<void>
}) {
  const id = useId()
  const [feil, setFeil] = useState<string | null>(null)
  if (!s) return null

  const velg = async (rolle: Kalenderrolle | null, medarbeider: string | null) => {
    setFeil(null)
    try {
      await onVelg(rolle === s.reellRolle ? null : rolle, medarbeider)
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.')
    }
  }
  const rolle = s.rolle ?? s.reellRolle
  const simulerer = s.rolle !== null || s.medarbeider !== null

  return (
    <div className="personalvissom" role="group" aria-labelledby={`${id}-tittel`} aria-busy={last}>
      <span id={`${id}-tittel`} className="personalvissom__tittel">
        Vis som
      </span>
      <label className="personalvissom__valg">
        <span className="kun-skjermleser">Rolle</span>
        <select className="felt__inndata" value={rolle} disabled={last} onChange={(e) => void velg(e.target.value as Kalenderrolle, s.medarbeider)}>
          {rollerTil(s.reellRolle).map((r) => (
            <option key={r} value={r}>
              {rollenavn(r)}
              {r === s.reellRolle ? ' (din rolle)' : ''}
            </option>
          ))}
        </select>
      </label>
      <label className="personalvissom__valg">
        <span className="kun-skjermleser">Som medarbeider</span>
        <select className="felt__inndata" value={s.medarbeider ?? ''} disabled={last} onChange={(e) => void velg(s.rolle, e.target.value || null)}>
          <option value="">Ikke som medarbeider</option>
          {medarbeidere.map((m) => (
            <option key={m.id} value={m.id}>
              {m.navn}
            </option>
          ))}
        </select>
      </label>
      {simulerer && (
        <Button variant="kant" disabled={last} onClick={() => void velg(null, null)}>
          Avslutt
        </Button>
      )}
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
    </div>
  )
}
