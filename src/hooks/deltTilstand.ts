import { useSyncExternalStore } from 'react'

/**
 * En liten tilstand delt på tvers av appen, der én del eier den og andre
 * leser den: som tallet på idéer med nye kommentarer, som idélaget henter og
 * hovedmenyen viser. Eieren melder med `sett`; resten leser med `bruk`.
 * En verdi som er lik den forrige (`lik`), varsler ingen.
 */
export interface DeltTilstand<T> {
  sett: (ny: T) => void
  les: () => T
  bruk: () => T
}

export function lagDeltTilstand<T>(start: T, lik: (a: T, b: T) => boolean = Object.is): DeltTilstand<T> {
  let verdi = start
  const lyttere = new Set<() => void>()
  const lytt = (lytter: () => void) => {
    lyttere.add(lytter)
    return () => {
      lyttere.delete(lytter)
    }
  }
  const les = () => verdi
  return {
    sett: (ny) => {
      if (lik(ny, verdi)) return
      verdi = ny
      for (const lytter of [...lyttere]) lytter()
    },
    les,
    bruk: () => useSyncExternalStore(lytt, les),
  }
}
