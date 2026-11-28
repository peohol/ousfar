import { can } from '@delt/personal/permissions'
import { useId, useState } from 'react'
import { Button } from '../../components/Button'
import { Modallag } from '../../components/Modallag'
import { useBevart } from '../../oppdatering/Bevaring'
import { settKvalifikasjoner } from '../kommandoer'
import { kvalifisertI, type Innstillinger, type Medarbeider, type Medarbeidergrunnlag } from './modell'
import { Vaktandel } from './Vaktandel'

/**
 * Det kalenderen eier for én medarbeider: hvilke vakter hen kan ta, og
 * vaktandelen (§7.4). Navnet og stillingen kommer fra profilen og endres der.
 * Vaktene lagres med «Lagre», vaktandelen med hver endring. Hver lagring
 * sender revisjonen som ble vist; har noen andre endret medarbeideren imens,
 * avviser serveren den, og grunnlaget hentes på nytt.
 */
export function Personredigering({
  fagmiljo,
  medarbeider,
  stilling,
  grunnlag,
  onEndret,
  onLukk,
}: {
  fagmiljo: string
  medarbeider: Medarbeider
  stilling: string | undefined
  grunnlag: Medarbeidergrunnlag
  onEndret: () => void
  onLukk: () => void
}) {
  // Det siste svaret fra serveren, til grunnlaget er hentet på nytt.
  const [lagret, setLagret] = useState<Innstillinger | null>(null)
  const m: Medarbeider = lagret && lagret.revisjon >= medarbeider.revisjon ? { ...medarbeider, ...lagret } : medarbeider
  const fraFor = kvalifisertI(m, grunnlag.iDag)
  const [kan, setKan] = useBevart<string[]>(`personal-kan-${m.id}`, fraFor)
  const [feil, setFeil] = useState<string | null>(null)
  const [arbeider, setArbeider] = useState(false)
  const id = useId()

  const lagre = async (endring: () => Promise<Innstillinger>): Promise<boolean> => {
    setArbeider(true)
    setFeil(null)
    try {
      setLagret(await endring())
      return true
    } catch (e) {
      setFeil(e instanceof Error ? e.message : 'Noe gikk galt. Prøv igjen.')
      return false
    } finally {
      setArbeider(false)
      onEndret()
    }
  }

  // Hver del vises bare for den som kan endre den; serveren kontrollerer det igjen.
  const vakter = can(grunnlag.rolle, 'editPeople')
  const andel = can(grunnlag.rolle, 'editDutyShare')
  const endret = vakter && [...kan].sort().join() !== fraFor.join()
  const lagreVakter = async () => {
    if (!endret) return onLukk()
    if (await lagre(() => settKvalifikasjoner(fagmiljo, m.id, kan, m.revisjon))) onLukk()
  }

  return (
    <Modallag
      apen
      tittel={m.navn}
      ikon="user"
      meta={stilling ?? 'Mangler stilling'}
      onLukk={onLukk}
      autofokus="input"
      fot={
        <>
          <Button variant="subtle" onClick={onLukk}>
            Avbryt
          </Button>
          {vakter && (
            <Button onClick={() => void lagreVakter()} disabled={arbeider}>
              Lagre
            </Button>
          )}
        </>
      }
    >
      {feil && (
        <p className="skjemafeil" role="alert">
          {feil}
        </p>
      )}
      {vakter && (
        <fieldset className="personalfelt">
          <legend className="felt__merkelapp">Kan ta</legend>
          {grunnlag.oppgaver.length === 0 ? (
            <p className="felt__hjelp">Fagmiljøet har ingen oppgaver som krever kvalifikasjon.</p>
          ) : (
            <div className="avkryssinger" aria-describedby={`${id}-kan`}>
              {grunnlag.oppgaver.map((s) => (
                <label key={s.id} className="avkryssing">
                  <input type="checkbox" checked={kan.includes(s.id)} disabled={arbeider} onChange={(e) => setKan((k) => (e.target.checked ? [...k, s.id] : k.filter((x) => x !== s.id)))} />
                  {s.name}
                </label>
              ))}
            </div>
          )}
          <p className="felt__hjelp" id={`${id}-kan`}>
            Gjelder fra i dag. Uten noen valgt får medarbeideren ingen vakter.
          </p>
        </fieldset>
      )}
      {andel && <Vaktandel fagmiljo={fagmiljo} medarbeider={m} grunnlag={grunnlag} arbeider={arbeider} onLagre={lagre} />}
    </Modallag>
  )
}
