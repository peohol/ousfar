import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { visningsnavn, type Profil } from '@delt/profil'
import { useAvatarlenker } from '../../auth/avatarer'
import { useProfil } from '../../auth/okt'
import { Avatar, type Avatarstorrelse } from '../konto/Avatar'

/**
 * Det trådene trenger — i idévinduet og i diskusjonene: hvem som er logget
 * inn, om det er en systemarkitekt (som administrerer idéene, D8), og
 * profilene og profilbildene til dem som har skrevet noe. Profilene og
 * svaret om systemarkitekten hentes av den som viser trådene.
 */
interface Forfatterkontekst {
  meg: Profil
  systemarkitekt: boolean
  profiler: ReadonlyMap<string, Profil>
  lenker: ReadonlyMap<string, string>
}

const Kontekst = createContext<Forfatterkontekst | null>(null)

export function Forfatterkilde({
  profiler,
  systemarkitekt = false,
  children,
}: {
  profiler: readonly Profil[]
  systemarkitekt?: boolean
  children: ReactNode
}) {
  const meg = useProfil()
  const lenker = useAvatarlenker(profiler as Profil[])
  const verdi = useMemo(
    () => ({ meg, systemarkitekt, profiler: new Map(profiler.map((p) => [p.id, p])), lenker }),
    [meg, systemarkitekt, profiler, lenker],
  )
  return <Kontekst.Provider value={verdi}>{children}</Kontekst.Provider>
}

export function useForfatterkontekst(): Forfatterkontekst {
  const verdi = useContext(Kontekst)
  if (!verdi) throw new Error('Tråden mangler forfatterkonteksten sin.')
  return verdi
}

/** Profilen til en forfatter. Den innloggede er alltid med, også før profilene er hentet. */
export function useForfatter(id: string | null): Profil | null {
  const { meg, profiler } = useForfatterkontekst()
  if (id === null) return null
  return profiler.get(id) ?? (id === meg.id ? meg : null)
}

/** Profilbildet til en forfatter, eller en tom sirkel for en slettet kommentar. */
export function Forfatterbilde({ id, storrelse }: { id: string | null; storrelse: Avatarstorrelse }) {
  const { lenker } = useForfatterkontekst()
  const profil = useForfatter(id)
  if (!profil) return <span className={`avatar avatar--${storrelse} avatar--tom`} aria-hidden="true" />
  const lenke = profil.avatar_path ? (lenker.get(profil.avatar_path) ?? null) : null
  return <Avatar profil={profil} lenke={lenke} storrelse={storrelse} />
}

export function useForfatternavn(id: string | null): string {
  const profil = useForfatter(id)
  return profil ? visningsnavn(profil) : 'Ukjent bruker'
}
