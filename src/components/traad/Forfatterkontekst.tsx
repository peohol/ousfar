import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { visningsnavn, type Profil, type Profilkort } from '@delt/profil'
import { useAvatarlenker } from '../../auth/avatarer'
import { useProfil } from '../../auth/okt'
import { Avatar, type Avatarstorrelse } from '../konto/Avatar'
import { Profilutlos } from '../profilkort/Profilkort'

/**
 * Det trådene trenger — i idévinduet og i diskusjonene: hvem som er logget
 * inn, om det er en systemarkitekt (som administrerer idéene, D8), og
 * profilene og profilbildene til dem som har skrevet noe. Profilene og
 * svaret om systemarkitekten hentes av den som viser trådene.
 */
interface Forfatterkontekst {
  meg: Profil
  systemarkitekt: boolean
  profiler: ReadonlyMap<string, Profilkort>
  lenker: ReadonlyMap<string, string>
}

const Kontekst = createContext<Forfatterkontekst | null>(null)

export function Forfatterkilde({
  profiler,
  systemarkitekt = false,
  children,
}: {
  profiler: readonly Profilkort[]
  systemarkitekt?: boolean
  children: ReactNode
}) {
  const meg = useProfil()
  const lenker = useAvatarlenker(profiler)
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
export function useForfatter(id: string | null): Profilkort | null {
  const { meg, profiler } = useForfatterkontekst()
  if (id === null) return null
  return profiler.get(id) ?? (id === meg.id ? meg : null)
}

/** Lenken til profilbildet til en forfatter, når hen har et. */
function useForfatterlenke(profil: Profilkort | null): string | null {
  const { lenker } = useForfatterkontekst()
  return profil?.avatar_path ? (lenker.get(profil.avatar_path) ?? null) : null
}

/**
 * Profilbildet til en forfatter, eller en tom sirkel for en slettet kommentar.
 * Med `kort` står profilkortet bak bildet (`Profilutlos`); det brukes der
 * bildet ikke står inni en annen knapp, og navnet står ved siden av med
 * {@link Forfatternavn}.
 */
export function Forfatterbilde({ id, storrelse, kort = false }: { id: string | null; storrelse: Avatarstorrelse; kort?: boolean }) {
  const profil = useForfatter(id)
  const lenke = useForfatterlenke(profil)
  if (!profil) return <span className={`avatar avatar--${storrelse} avatar--tom`} aria-hidden="true" />
  const bilde = <Avatar profil={profil} lenke={lenke} storrelse={storrelse} />
  return kort ? (
    <Profilutlos person={profil} lenke={lenke} variant="peker">
      {bilde}
    </Profilutlos>
  ) : (
    bilde
  )
}

/** Navnet til en forfatter, med profilkortet bak; uten profil «Ukjent bruker». */
export function Forfatternavn({ id, className }: { id: string | null; className?: string }) {
  const profil = useForfatter(id)
  const lenke = useForfatterlenke(profil)
  return (
    <Profilutlos person={profil} lenke={lenke} className={className}>
      {profil ? visningsnavn(profil) : 'Ukjent bruker'}
    </Profilutlos>
  )
}

export function useForfatternavn(id: string | null): string {
  const profil = useForfatter(id)
  return profil ? visningsnavn(profil) : 'Ukjent bruker'
}
