/** Signerte lenker til profilbildene (`useBildelenker` med bøtta for profilbildene). */
import { AVATAR_BOTTE, type Profil } from '@delt/profil'
import { useBildelenker } from './bildelenker'

type Bildebærer = Pick<Profil, 'avatar_path' | 'updated_at'>

/** Lenkene til profilbildene, etter `avatar_path`. */
export function useAvatarlenker(profiler: readonly Bildebærer[]): Map<string, string> {
  return useBildelenker(
    AVATAR_BOTTE,
    profiler.map((p) => ({ sti: p.avatar_path, endret: p.updated_at })),
  )
}
