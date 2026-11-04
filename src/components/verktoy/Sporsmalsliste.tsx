import { useId } from 'react'
import type { Flytsporsmal, Sporsmalsgruppe, Stoppforklaring } from '../../verktoy/flyt/typer'
import { Ikon } from '../ikon/Ikon'
import { Svarvalg } from './Svarvalg'

/** Overskriften for hver gruppe, i rekkefølgen gruppene stilles i (§4.3). */
export const GRUPPETITLER: Record<Sporsmalsgruppe, string> = {
  stopp: 'Forhold som stopper en automatisk plan',
  endrer: 'Forhold som påvirker planen',
  vurdering: 'Bekreft før planen vises',
}

const REKKEFOLGE: readonly Sporsmalsgruppe[] = ['stopp', 'endrer', 'vurdering']

export interface SporsmalslisteProps {
  /** De synlige spørsmålene, i rekkefølge. */
  sporsmal: readonly Flytsporsmal[]
  /** Forklaringene fra forhåndskontrollen; en som hører til et spørsmål, står ved det. */
  grunner: readonly Stoppforklaring[]
  /** Spørsmålene som er merket fordi de mangler svar. */
  mangler: ReadonlySet<string>
  /** Et svar, eller `undefined` når en avkrysning tas bort. */
  onSvar: (id: string, verdi: string | undefined) => void
}

/**
 * Spørsmålene om pasienten (steg 3): gruppert, med stoppforholdene først og
 * kliniske vurderinger sist. Et svar som stopper planen eller er ukjent, sier
 * det straks ved spørsmålet, med hva klinikeren kan gjøre i stedet.
 */
export function Sporsmalsliste({ sporsmal, grunner, mangler, onSvar }: SporsmalslisteProps) {
  const merke = useId()
  return (
    <>
      {REKKEFOLGE.map((g) => {
        const egne = sporsmal.filter((s) => s.gruppe === g)
        if (egne.length === 0) return null
        const tittel = `${merke}-${g}`
        return (
          <div key={g} className="sporsmalsgruppe" role="group" aria-labelledby={tittel}>
            <h3 id={tittel}>{GRUPPETITLER[g]}</h3>
            <ul className="sporsmalsliste">
              {egne.map((s) => (
                <Sporsmal key={s.id} sporsmal={s} grunn={grunner.find((x) => x.sporsmal === s.id)} mangler={mangler.has(s.id)} onSvar={onSvar} />
              ))}
            </ul>
          </div>
        )
      })}
    </>
  )
}

function Sporsmal({ sporsmal: s, grunn, mangler, onSvar }: { sporsmal: Flytsporsmal; grunn: Stoppforklaring | undefined; mangler: boolean; onSvar: SporsmalslisteProps['onSvar'] }) {
  const id = useId()
  const stopper = s.valgt !== undefined && (s.stopperVed?.includes(s.valgt) ?? false)
  const merknad = stopper ? (grunn ?? (s.forklaring ? { tekst: s.forklaring } : undefined)) : undefined
  const beskrivelse = [s.hjelp && `${id}-hjelp`, merknad && `${id}-merknad`].filter(Boolean).join(' ') || undefined

  if (s.art === 'avkrysning') {
    const ja = s.svar[0] ?? 'ja'
    return (
      <li className="sporsmal sporsmal--avkrysning" data-flytsporsmal={s.id} data-mangler={mangler || undefined}>
        <label className="avkryssing avkryssing--felt">
          <input type="checkbox" checked={s.valgt === ja} aria-invalid={mangler || undefined} aria-describedby={beskrivelse} onChange={(e) => onSvar(s.id, e.target.checked ? ja : undefined)} />
          <span>
            {s.tekst}
            {s.punkter && s.punkter.length > 0 && (
              <ul className="sporsmal__punkter">
                {s.punkter.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </span>
        </label>
        {s.hjelp && (
          <p id={`${id}-hjelp`} className="sporsmal__hjelp">
            {s.hjelp}
          </p>
        )}
      </li>
    )
  }

  return (
    <li className="sporsmal" data-flytsporsmal={s.id}>
      <p className="sporsmal__tekst">
        <span id={`${id}-tekst`}>{s.tekst}</span>
        {s.hjelp && (
          <span id={`${id}-hjelp`} className="sporsmal__hjelp">
            {s.hjelp}
          </span>
        )}
      </p>
      <Svarvalg navn={id} etikett={`${id}-tekst`} beskrivelse={beskrivelse} alternativer={s.alternativer} valgt={s.valgt} mangler={mangler} onVelg={(v) => onSvar(s.id, v)} />
      {merknad && (
        <p id={`${id}-merknad`} className="sporsmal__merknad" data-tone={s.valgt === 'ukjent' ? 'ukjent' : undefined}>
          <Ikon navn={s.valgt === 'ukjent' ? 'na' : 'sev'} />
          <span>
            {merknad.tekst}
            {'handling' in merknad && merknad.handling && ` ${merknad.handling}`}
          </span>
        </p>
      )}
    </li>
  )
}
