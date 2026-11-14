/**
 * Om den innloggede er systemarkitekt: databasen svarer (`er_systemarkitekt()`,
 * nei uten et aktivt medlemskap), og appen bruker svaret bare til å vise
 * knappene. Rettigheten håndheves i databasen. Svaret hentes én gang per
 * bruker og deles av alle som spør; går oppslaget galt, er svaret nei til
 * neste gang noen spør.
 */
import { useEffect, useState } from 'react'
import { useProfil } from './okt'
import { klient } from './klient'

const kjent = new Map<string, boolean>()
const hentinger = new Map<string, Promise<boolean>>()

export function erSystemarkitekt(brukerId: string): Promise<boolean> {
  let henting = hentinger.get(brukerId)
  if (!henting) {
    henting = (async () => {
      const { data, error } = await klient().rpc('er_systemarkitekt')
      if (error) throw error
      return data === true
    })().then(
      (svar) => {
        kjent.set(brukerId, svar)
        return svar
      },
      () => {
        hentinger.delete(brukerId)
        return false
      },
    )
    hentinger.set(brukerId, henting)
  }
  return henting
}

/** Glemmer svarene, så de hentes på nytt (for testene). */
export function glemSystemroller(): void {
  kjent.clear()
  hentinger.clear()
}

/** Om den innloggede er systemarkitekt. Nei til databasen har svart. */
export function useSystemarkitekt(): boolean {
  const { id } = useProfil()
  const [svar, setSvar] = useState(() => kjent.get(id) ?? false)
  useEffect(() => {
    let gjelder = true
    setSvar(kjent.get(id) ?? false)
    void erSystemarkitekt(id).then((v) => {
      if (gjelder) setSvar(v)
    })
    return () => {
      gjelder = false
    }
  }, [id])
  return svar
}
