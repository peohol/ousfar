/**
 * Om den innloggede er systemarkitekt: databasen svarer (`er_systemarkitekt()`,
 * nei uten et aktivt medlemskap), og appen bruker svaret bare til å vise
 * knappene. Rettigheten håndheves i databasen.
 *
 * Det siste svaret huskes per bruker, så knappene står riktig med én gang,
 * men hver gang noe som bruker svaret, vises, spørres databasen på nytt
 * (samtidige spørsmål deles), så en rolle som er gitt eller tatt bort, slår
 * igjennom uten at appen lastes på nytt. Alt glemmes når kontoen i fanen
 * skifter. Går oppslaget galt, er svaret nei.
 */
import { useEffect, useState } from 'react'
import { klient } from './klient'
import { useProfil } from './okt'
import { vedOktskifte } from './oktskifte'

const kjent = new Map<string, boolean>()
const underveis = new Map<string, Promise<boolean>>()

export function erSystemarkitekt(brukerId: string, { fersk = false }: { fersk?: boolean } = {}): Promise<boolean> {
  const husket = kjent.get(brukerId)
  if (!fersk && husket !== undefined) return Promise.resolve(husket)
  let henting = underveis.get(brukerId)
  if (!henting) {
    henting = (async () => {
      const { data, error } = await klient().rpc('er_systemarkitekt')
      if (error) throw error
      return data === true
    })()
      .then(
        (svar) => {
          kjent.set(brukerId, svar)
          return svar
        },
        () => {
          kjent.delete(brukerId)
          return false
        },
      )
      .finally(() => underveis.delete(brukerId))
    underveis.set(brukerId, henting)
  }
  return henting
}

/** Glemmer svarene, så de hentes på nytt. */
export function glemSystemroller(): void {
  kjent.clear()
  underveis.clear()
}

vedOktskifte(glemSystemroller)

/** Om den innloggede er systemarkitekt. Nei til databasen har svart. */
export function useSystemarkitekt(): boolean {
  const { id } = useProfil()
  const [svar, setSvar] = useState(() => kjent.get(id) ?? false)
  useEffect(() => {
    let gjelder = true
    setSvar(kjent.get(id) ?? false)
    void erSystemarkitekt(id, { fersk: true }).then((v) => {
      if (gjelder) setSvar(v)
    })
    return () => {
      gjelder = false
    }
  }, [id])
  return svar
}
