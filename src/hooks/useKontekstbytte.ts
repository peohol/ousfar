import { useEffect, useRef } from 'react'

/**
 * Kaller `vedBytte` når `kontekst` går fra én kjent verdi til en annen, som
 * når fagmiljøet fortolkningen gjelder (arbeidskonteksten), byttes. Første
 * kjente verdi, og en ukjent (`null`) underveis, er ikke et bytte: da er det
 * som alt er hentet, hentet i den samme konteksten.
 */
export function useKontekstbytte(kontekst: string | null | undefined, vedBytte: () => void): void {
  const forrige = useRef<string | null>(null)
  useEffect(() => {
    if (!kontekst) return
    const var_ = forrige.current
    forrige.current = kontekst
    if (var_ !== null && var_ !== kontekst) vedBytte()
  }, [kontekst, vedBytte])
}
