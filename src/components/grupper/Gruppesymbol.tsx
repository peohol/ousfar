import { useBildelenker } from '../../auth/bildelenker'
import type { Gruppe } from '../../grupper/modell'
import { GRUPPESYMBOL_BOTTE, symbolbilde } from '../../grupper/symbol'
import { Ikon } from '../ikon/Ikon'
import type { Avatarstorrelse } from '../konto/Avatar'

type Symbolbærer = Pick<Gruppe, 'symbol'>

/**
 * Lenkene til symbolbildene for gruppene, etter stien: hentet samlet for en
 * hel liste, og på nytt når et symbol byttes (`useBildelenker`).
 */
export function useGruppesymbollenker(grupper: readonly Symbolbærer[]): Map<string, string> {
  return useBildelenker(
    GRUPPESYMBOL_BOTTE,
    grupper.map((g) => {
      const bilde = symbolbilde(g.symbol)
      return { sti: bilde?.sti ?? null, endret: bilde?.endret ?? '' }
    }),
  )
}

/** Lenken til symbolbildet til `gruppe`, av lenkene fra `useGruppesymbollenker`. */
export function symbollenke(gruppe: Symbolbærer, lenker: ReadonlyMap<string, string>): string | null {
  const bilde = symbolbilde(gruppe.symbol)
  return bilde ? (lenker.get(bilde.sti) ?? null) : null
}

/**
 * Symbolet til en gruppe, alltid i en sirkel, i de samme størrelsene som
 * profilbildene (`Avatar`): bildet, emojien, eller gruppeikonet når gruppen
 * ikke har valgt noe (og mens lenken til bildet hentes). Står alltid ved
 * navnet, så det er pynt for skjermlesere.
 */
export function Gruppesymbol({
  gruppe,
  lenke,
  storrelse = 'middels',
}: {
  gruppe: Symbolbærer
  /** Signert lenke til bildet, fra `useGruppesymbollenker`. */
  lenke?: string | null
  storrelse?: Avatarstorrelse
}) {
  const symbol = gruppe.symbol
  return (
    <span className={`avatar avatar--${storrelse} gruppesymbol`} aria-hidden="true">
      {symbol && 'bilde' in symbol && lenke ? (
        <img className="avatar__bilde" src={lenke} alt="" />
      ) : symbol && 'emoji' in symbol ? (
        <span className="gruppesymbol__emoji">{symbol.emoji}</span>
      ) : (
        <Ikon navn="grupper" className="gruppesymbol__ikon" />
      )}
    </span>
  )
}
