/**
 * Samtalelista i chatmenyen (docs/gruppechat.md, «Chatmenyen»): den
 * innloggedes gruppechatter med siste aktivitet og tallet på uleste, nyeste
 * først, fra `mine_gruppesamtaler()`. Ingen meldingstekst.
 *
 * Lista hentes på nytt når noe kan ha endret den: jevnlig og når fanen blir
 * synlig (`useKontoensSvarMedSjekk`), når dørklokken ringer i en av gruppene,
 * og når noe i appen har merket meldinger lest ({@link oppfriskSamtaler}).
 */
import { useEffect, useMemo } from 'react'
import { klient } from '../auth/klient'
import { lesbarFeil } from '../auth/databasefeil'
import { lagSignal } from '../domain/signal'
import { useKontoensSvarMedSjekk } from '../hooks/useKontoensSvar'
import { erObjekt, tall, tekstEllerNull } from '../ideer/lesing'
import { lesGruppe, type Gruppe } from '../grupper/modell'
import type { Abonner } from './dorklokke'
import { abonnerPaGruppechat } from './sanntid'

/** Én samtale i lista. */
export interface Gruppesamtale {
  gruppe: Gruppe
  /** Den nyeste meldingen; `null` uten meldinger. */
  siste_kl: string | null
  /** Meldinger fra andre den innloggede ikke har lest. */
  uleste: number
}

export function lesGruppesamtale(verdi: unknown): Gruppesamtale | null {
  if (!erObjekt(verdi)) return null
  const gruppe = lesGruppe(verdi.gruppe)
  if (!gruppe) return null
  return { gruppe, siste_kl: tekstEllerNull(verdi.siste_kl), uleste: Math.max(0, tall(verdi.uleste)) }
}

export function lesGruppesamtaler(verdi: unknown): Gruppesamtale[] {
  return Array.isArray(verdi) ? verdi.map(lesGruppesamtale).filter((s): s is Gruppesamtale => s !== null) : []
}

export async function hentGruppesamtaler(): Promise<Gruppesamtale[]> {
  const { data, error } = await klient().rpc('mine_gruppesamtaler')
  if (error) throw lesbarFeil(error)
  return lesGruppesamtaler(data)
}

/** Alle uleste i lista, til chatboblen. */
export function alleUleste(samtaler: readonly Gruppesamtale[]): number {
  return samtaler.reduce((sum, s) => sum + s.uleste, 0)
}

/** Samtalene der navnet på gruppen inneholder søket (uten forskjell på store og små bokstaver). */
export function sokISamtaler(samtaler: readonly Gruppesamtale[], sok: string): Gruppesamtale[] {
  const ord = sok.trim().toLocaleLowerCase('nb')
  return ord ? samtaler.filter((s) => s.gruppe.navn.toLocaleLowerCase('nb').includes(ord)) : (samtaler as Gruppesamtale[])
}

const oppfrisk = lagSignal()

/** Ber samtalelista hente på nytt, når noe kan ha merket meldinger lest eller endret en samtale. */
export const oppfriskSamtaler = () => oppfrisk.send()

/** Ringer dørklokken i flere grupper på rad, hentes lista én gang etter så lang tid. */
export const SAMTALEPAUSE_MS = 800

const INGEN: Gruppesamtale[] = []

/**
 * Samtalene til kontoen, mens chatten er slått på (`aktivert`). Avslått gir
 * en tom liste og ingen henting utover den jevnlige.
 */
export function useGruppesamtaler(
  bruker: string,
  aktivert: boolean,
  hent: () => Promise<Gruppesamtale[]> = hentGruppesamtaler,
  abonner: Abonner = abonnerPaGruppechat,
): { samtaler: Gruppesamtale[]; kjent: boolean; oppdater: () => void } {
  const hentHvisPa = useMemo(() => (aktivert ? hent : () => Promise.resolve(INGEN)), [aktivert, hent])
  const { verdi, kjent, sjekk } = useKontoensSvarMedSjekk(bruker, hentHvisPa, INGEN)

  useEffect(() => {
    let tidtaker: ReturnType<typeof setTimeout> | null = null
    const snart = () => {
      if (tidtaker) clearTimeout(tidtaker)
      tidtaker = setTimeout(() => {
        tidtaker = null
        sjekk()
      }, SAMTALEPAUSE_MS)
    }
    const slutt = oppfrisk.lytt(snart)
    // Én kanal for alle gruppene den innloggede leser chatten i; radsikkerheten avgjør hvilke.
    const stopp = aktivert ? abonner(null, { vedRinging: snart, vedStatus: () => undefined }) : () => undefined
    return () => {
      if (tidtaker) clearTimeout(tidtaker)
      slutt()
      stopp()
    }
  }, [aktivert, abonner, sjekk])

  return { samtaler: aktivert ? verdi : INGEN, kjent, oppdater: sjekk }
}
