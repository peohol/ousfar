import { can } from '@delt/personal/permissions'
import { useEffect, useId, useState } from 'react'
import { Button } from '../../components/Button'
import { Modallag } from '../../components/Modallag'
import { useBevart } from '../../oppdatering/Bevaring'
import { settKvalifikasjoner } from '../kommandoer'
import { kvalifisertI, periodestart, type Innstillinger, type Medarbeider, type Medarbeidergrunnlag } from './modell'
import { Vaktandel } from './Vaktandel'

/** Vaktene som er valgt, og det de ble valgt ut fra: vaktene og perioden. */
interface Vaktutkast {
  fra: string[]
  periode: string
  kan: string[]
}

const sammeVakter = (a: string[], b: string[]) => [...a].sort().join() === [...b].sort().join()

/**
 * Det kalenderen eier for én medarbeider: hvilke vakter hen kan ta, og
 * vaktandelen (§7.4). Navnet og stillingen kommer fra profilen og endres der.
 * Vaktene lagres med «Lagre», vaktandelen med hver endring. Hver lagring
 * sender revisjonen som ble vist; har noen andre endret medarbeideren imens,
 * avviser serveren den, og grunnlaget hentes på nytt.
 *
 * Utkastet til vaktene er bundet til vaktene og perioden det ble laget fra
 * (K-MED-2). Har noen andre endret vaktene siden, eller har medarbeideren fått
 * en ny periode, forkastes utkastet for godt: de nye vises, med en melding, og
 * må velges på nytt, også om vaktene senere blir som før. Det gjelder også et
 * utkast som er bevart over en oppdatering av appen. En endring som ikke rører
 * vaktene, som en vaktandel lagret her, lar utkastet stå.
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
  const periode = periodestart(m)
  const [utkast, setUtkast] = useBevart<Vaktutkast | null>(`personal-kan-${m.id}`, null)
  const gjelder = utkast !== null && utkast.periode === periode && sammeVakter(utkast.fra, fraFor)
  const kan = gjelder ? utkast.kan : fraFor
  // Et utkast som ikke lenger gjelder, forkastes med en gang, så det ikke kan bli gjeldende igjen.
  const [endretImens, setEndretImens] = useState(false)
  const foreldet = utkast !== null && !gjelder
  useEffect(() => {
    if (!foreldet) return
    setUtkast(null)
    setEndretImens(true)
  }, [foreldet, setUtkast])
  const velg = (status: string, valgt: boolean) => {
    setEndretImens(false)
    setUtkast({ fra: fraFor, periode, kan: valgt ? [...kan, status] : kan.filter((x) => x !== status) })
  }
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
  const endret = vakter && !sammeVakter(kan, fraFor)
  const lagreVakter = async () => {
    // For en ny medarbeider kvitterer «Lagre» valget, også uten vakter.
    if (!endret && !m.ny) return onLukk()
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
      {vakter && endretImens && (
        <p className="notis" role="status">
          Vaktene er endret av noen andre siden du begynte. Her er de som gjelder nå; velg på nytt om du vil endre dem.
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
                  <input type="checkbox" checked={kan.includes(s.id)} disabled={arbeider} onChange={(e) => velg(s.id, e.target.checked)} />
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
