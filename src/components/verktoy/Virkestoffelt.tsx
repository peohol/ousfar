import { useId } from 'react'
import type { Kildeformulering } from '../../verktoy/kartlegging'
import { finnVirkestoff, FORMULERINGSNAVN, type Verktoyvirkestoff } from '../../verktoy/register'

export interface VirkestoffeltProps {
  /** Ledeteksten, f.eks. «Virkestoff» eller «Bytte til». */
  etikett: string
  valg: readonly Verktoyvirkestoff[]
  tekst: string
  formulering: Kildeformulering | ''
  onTekst: (tekst: string) => void
  onFormulering: (formulering: Kildeformulering | '') => void
}

/**
 * Feltet for et virkestoff, med forslagene fra verktøyets virkestoffer
 * (`<datalist>`: nettleserens egen autoforslag, med tastatur og skjermleser).
 * Bare et navn eller alias fra listen gir et valg; en gruppe eller noe som er
 * utelatt, står ikke der. Har kilden virkestoffet i flere formuleringer, må
 * formuleringen velges — den velges aldri for brukeren.
 */
export function Virkestoffelt({ etikett, valg, tekst, formulering, onTekst, onFormulering }: VirkestoffeltProps) {
  const id = useId()
  const valgt = finnVirkestoff(valg, tekst)
  const flere = valgt && valgt.formuleringer.length > 1
  const ukjent = tekst.trim() !== '' && !valgt

  return (
    <div className="verktoyfelt">
      <label className="skjemafelt">
        <span>{etikett}</span>
        <input
          className="inndatafelt verktoyfelt__virkestoff"
          type="text"
          list={`${id}-forslag`}
          autoComplete="off"
          spellCheck={false}
          value={tekst}
          aria-invalid={ukjent}
          aria-describedby={ukjent ? `${id}-ukjent` : undefined}
          onChange={(e) => onTekst(e.target.value)}
        />
      </label>
      <datalist id={`${id}-forslag`}>
        {valg.map((v) => (
          <option key={v.nokkel} value={v.navn} />
        ))}
      </datalist>
      {ukjent && (
        <p id={`${id}-ukjent`} className="verktoyfelt__hjelp">
          Velg et virkestoff fra forslagene. Verktøyet har ikke dette virkestoffet.
        </p>
      )}
      {flere && (
        <fieldset className="verktoyfelt__formuleringer">
          {/* Med det samme virkestoffet på begge sider skiller ledeteksten feltene for skjermlesere. */}
          <legend>
            Formulering av {valgt.navn.toLowerCase()}
            <span className="kun-skjermleser"> ({etikett.toLowerCase()})</span>
          </legend>
          <div className="avkryssinger">
            {valgt.formuleringer.map((f) => (
              <label key={f} className="avkryssing">
                <input type="radio" name={`${id}-formulering`} checked={formulering === f} onChange={() => onFormulering(f)} />
                {FORMULERINGSNAVN[f]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  )
}

/** Valget feltet gir: virkestoffet og formuleringen, når begge er entydige. */
export function lesVirkestoffvalg(valg: readonly Verktoyvirkestoff[], tekst: string, formulering: Kildeformulering | '') {
  const v = finnVirkestoff(valg, tekst)
  if (!v) return undefined
  if (v.formuleringer.length === 1) return { nokkel: v.nokkel, formulering: v.formuleringer[0]! }
  return formulering && v.formuleringer.includes(formulering) ? { nokkel: v.nokkel, formulering } : undefined
}
