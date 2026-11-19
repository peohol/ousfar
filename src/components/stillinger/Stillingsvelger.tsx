import { useId, type ReactNode } from 'react'
import type { Stillingskatalog } from '../../stillinger/katalog'

/**
 * Nedtrekkslista for å velge en stilling, med kategoriene som grupper. Brukes
 * i kontoen, i brukerlista og når en stilling fjernes.
 *
 * Med `ingen` står et valg for å være uten stilling øverst. `unntatt` tar en
 * stilling ut av lista, som den som skal fjernes. Uten `ingen` og uten verdi
 * står det en plassholder som ikke kan velges, så ingen stilling blir valgt
 * uten at det er gjort med vilje.
 */
export function Stillingsvelger({
  merkelapp,
  katalog,
  verdi,
  onEndre,
  ingen,
  unntatt,
  disabled,
  hjelp,
  skjultMerkelapp,
}: {
  merkelapp: string
  katalog: Stillingskatalog
  verdi: string | null
  onEndre: (stilling: string | null) => void
  /** Teksten på valget for å være uten stilling, f.eks. «Ingen stilling». */
  ingen?: string
  unntatt?: string
  disabled?: boolean
  hjelp?: ReactNode
  /** Merkelappen er bare for skjermlesere, der raden alt sier hva det gjelder. */
  skjultMerkelapp?: boolean
}) {
  const id = useId()
  const hjelpId = `${id}-hjelp`
  return (
    <div className="felt">
      <label className={skjultMerkelapp ? 'kun-skjermleser' : 'felt__merkelapp'} htmlFor={id}>
        {merkelapp}
      </label>
      <select
        id={id}
        className="felt__inndata"
        value={verdi ?? ''}
        disabled={disabled}
        aria-describedby={hjelp ? hjelpId : undefined}
        onChange={(hendelse) => onEndre(hendelse.target.value || null)}
      >
        {ingen !== undefined ? (
          <option value="">{ingen}</option>
        ) : (
          <option value="" disabled>
            Velg stilling
          </option>
        )}
        {katalog.map((kategori) => {
          const stillinger = kategori.stillinger.filter((s) => s.id !== unntatt)
          return stillinger.length === 0 ? null : (
            <optgroup key={kategori.id} label={kategori.navn}>
              {stillinger.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.navn}
                </option>
              ))}
            </optgroup>
          )
        })}
      </select>
      {hjelp && (
        <span className="felt__hjelp" id={hjelpId}>
          {hjelp}
        </span>
      )}
    </div>
  )
}
