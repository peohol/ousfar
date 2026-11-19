/**
 * Henting av det profilkortet viser, med et kort minne: kortet åpnes og
 * lukkes ofte over de samme personene i en chat eller en tråd, og skal ikke
 * spørre databasen hver gang. Minnet glemmes når kontoen skifter, og når den
 * innloggede har endret noe som påvirker chatknappen (`glemProfilkortene`).
 */
import { useEffect, useState } from 'react'
import { klient } from '../auth/klient'
import { lesbarFeil } from '../auth/databasefeil'
import { vedOktskifte } from '../auth/oktskifte'
import { lesProfilkortdetaljer, type Profilkortdetaljer } from './modell'

/** Hvor lenge et svar huskes. Chatknappen følger personens egen bryter, så ikke for lenge. */
export const HUSKES_MS = 60_000

interface Husket {
  tid: number
  svar: Promise<Profilkortdetaljer | null>
}

const husket = new Map<string, Husket>()

/** Glemmer alle svarene, som etter en blokkering eller når egen bryter endres. */
export function glemProfilkortene(): void {
  husket.clear()
}

vedOktskifte(glemProfilkortene)

async function hent(bruker: string): Promise<Profilkortdetaljer | null> {
  const { data, error } = await klient().rpc('profilkortdetaljer', { bruker })
  if (error) throw lesbarFeil(error)
  return lesProfilkortdetaljer(data)
}

/** Svaret for personen, fra minnet når det er ferskt. En feil huskes ikke. */
export function hentProfilkortdetaljer(bruker: string, naa = Date.now()): Promise<Profilkortdetaljer | null> {
  const forrige = husket.get(bruker)
  if (forrige && naa - forrige.tid < HUSKES_MS) return forrige.svar
  const svar = hent(bruker)
  husket.set(bruker, { tid: naa, svar })
  svar.catch(() => {
    if (husket.get(bruker)?.svar === svar) husket.delete(bruker)
  })
  return svar
}

export type Profilkorttilstand =
  | { status: 'laster' }
  | { status: 'klar'; detaljer: Profilkortdetaljer | null }
  | { status: 'feil' }

/** Detaljene til personen mens kortet står åpent (`trengs`). */
export function useProfilkortdetaljer(bruker: string, trengs: boolean): Profilkorttilstand {
  const [tilstand, setTilstand] = useState<{ bruker: string; tilstand: Profilkorttilstand } | null>(null)
  useEffect(() => {
    if (!trengs) return
    let gjelder = true
    hentProfilkortdetaljer(bruker).then(
      (detaljer) => gjelder && setTilstand({ bruker, tilstand: { status: 'klar', detaljer } }),
      () => gjelder && setTilstand({ bruker, tilstand: { status: 'feil' } }),
    )
    return () => {
      gjelder = false
    }
  }, [bruker, trengs])
  return tilstand?.bruker === bruker ? tilstand.tilstand : { status: 'laster' }
}
