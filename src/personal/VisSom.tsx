import { isRole } from '@delt/personal/permissions'
import { useId, useState } from 'react'
import { Button } from '../components/Button'
import type { Personalgrunnlag } from './grunnlag'
import { visSom } from './kommandoer'
import { lesMedarbeidergrunnlag } from './medarbeidere/modell'
import { rollenavn, rollerTil, type Kalenderrolle } from './roller'

interface Simulering {
  reellRolle: Kalenderrolle
  rolle: Kalenderrolle | null
  medarbeider: string | null
}

/** Simuleringen databasen gir i et testmiljø (`personal.vis_som_json`), ellers `null`. */
export function lesSimulering(g: Personalgrunnlag): Simulering | null {
  const s = g.svar.simulering
  if (typeof s !== 'object' || s === null) return null
  const o = s as Record<string, unknown>
  const reell = o.reell_rolle
  if (!isRole(reell) || reell === 'outsideArchitect') return null
  const valg = (typeof o.vis_som === 'object' && o.vis_som !== null ? o.vis_som : {}) as Record<string, unknown>
  return {
    reellRolle: reell,
    rolle: isRole(valg.rolle) && valg.rolle !== 'outsideArchitect' ? valg.rolle : null,
    medarbeider: typeof valg.medarbeider === 'string' ? valg.medarbeider : null,
  }
}

/**
 * «Vis som» (K-SKJ-7): i et testmiljø kan den innloggede prøve kalenderen med
 * en lavere rolle og som én av de syntetiske medarbeiderne. Valget lagres og
 * håndheves på serveren, så hele kalenderen følger det, og det kan aldri gi
 * flere rettigheter enn den virkelige rollen. Utenfor et testmiljø finnes det
 * ikke, og databasen gir da ingen simulering, så ingenting vises.
 */
export function VisSom({ fagmiljo, grunnlag, onEndret }: { fagmiljo: string; grunnlag: Personalgrunnlag; onEndret: () => void }) {
  const id = useId()
  const [feil, setFeil] = useState<string | null>(null)
  const [arbeider, setArbeider] = useState(false)
  const s = lesSimulering(grunnlag)
  if (!s) return null
  const syntetiske = lesMedarbeidergrunnlag(grunnlag).medarbeidere.filter((m) => m.syntetisk)

  const velg = async (rolle: Kalenderrolle | null, medarbeider: string | null) => {
    setArbeider(true)
    setFeil(null)
    try {
      await visSom(fagmiljo, rolle === s.reellRolle ? null : rolle, medarbeider)
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.')
    } finally {
      setArbeider(false)
      onEndret()
    }
  }
  const rolle = s.rolle ?? s.reellRolle
  const simulerer = s.rolle !== null || s.medarbeider !== null

  return (
    <div className="personalvissom" role="group" aria-labelledby={`${id}-tittel`}>
      <span id={`${id}-tittel`} className="personalvissom__tittel">
        Vis som
      </span>
      <label className="personalvissom__valg">
        <span className="kun-skjermleser">Rolle</span>
        <select className="felt__inndata" value={rolle} disabled={arbeider} onChange={(e) => void velg(e.target.value as Kalenderrolle, s.medarbeider)}>
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
        <select className="felt__inndata" value={s.medarbeider ?? ''} disabled={arbeider} onChange={(e) => void velg(s.rolle, e.target.value || null)}>
          <option value="">Ikke som medarbeider</option>
          {syntetiske.map((m) => (
            <option key={m.id} value={m.id}>
              {m.navn}
            </option>
          ))}
        </select>
      </label>
      {simulerer && (
        <Button variant="kant" disabled={arbeider} onClick={() => void velg(null, null)}>
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
