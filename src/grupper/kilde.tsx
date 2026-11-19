/**
 * Gruppene den innloggede er med i, og invitasjonene hen har, for hele appen:
 * navnene på gruppesidene i diskusjonene og varslene, invitasjonene i hovedmenyen
 * og oversikten. Hentes som rettighetene (`useKontoensSvar`), og på nytt med
 * en gang etter en endring i appen (`oppdater`).
 */
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { useKontoensSvarMedSjekk } from '../hooks/useKontoensSvar'
import { hentMineGrupper } from './api'
import { INGEN_GRUPPER, type MineGrupper } from './modell'

export interface Gruppekilde extends MineGrupper {
  oppdater: () => void
}

const INGEN: Gruppekilde = { ...INGEN_GRUPPER, oppdater: () => undefined }

const Kontekst = createContext<Gruppekilde>(INGEN)

export function GruppekildeProvider({ verdi, children }: { verdi: Gruppekilde; children: ReactNode }) {
  return <Kontekst.Provider value={verdi}>{children}</Kontekst.Provider>
}

/** Gruppene appen er gitt (`GruppekildeProvider`); ingen utenfor den. */
export function useGrupper(): Gruppekilde {
  return useContext(Kontekst)
}

/** Henter gruppene til kontoen og holder dem oppdatert. */
export function useMineGrupper(bruker: string, hent: () => Promise<MineGrupper> = hentMineGrupper): Gruppekilde {
  const { verdi, sjekk } = useKontoensSvarMedSjekk(bruker, hent, INGEN_GRUPPER)
  return useMemo(() => ({ ...verdi, oppdater: sjekk }), [verdi, sjekk])
}
