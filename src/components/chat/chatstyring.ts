/**
 * Forbindelsen mellom chatmenyen og det som åpner den andre steder i appen:
 * chatknappen i toppmenyen på smale flater, og lenker som skal vise en
 * bestemt samtale (som «Åpne chat» på gruppesiden). Menyen eier tilstanden;
 * resten sender et signal og leser det knappen trenger å vise.
 */
import { useSyncExternalStore } from 'react'
import { lagSignal } from '../../domain/signal'

/** Det chatknappen viser. */
export interface Chatstatus {
  /** Chatten er slått på, og menyen står i appen. */
  finnes: boolean
  /** Menyen står åpen over siden på en smal flate. */
  mobilApen: boolean
  uleste: number
}

const INGEN: Chatstatus = { finnes: false, mobilApen: false, uleste: 0 }
let status = INGEN
const lyttere = new Set<() => void>()

/** Menyen melder hvordan den står. */
export function meldChatstatus(ny: Chatstatus): void {
  if (ny.finnes === status.finnes && ny.mobilApen === status.mobilApen && ny.uleste === status.uleste) return
  status = ny
  for (const lytter of [...lyttere]) lytter()
}

export function useChatstatus(): Chatstatus {
  return useSyncExternalStore(
    (lytter) => {
      lyttere.add(lytter)
      return () => lyttere.delete(lytter)
    },
    () => status,
  )
}

/** Hva som skal skje med menyen: vekslet av knappen, eller åpnet på en samtale. */
export type Chatbeskjed = { veksle: true } | { gruppe: string | null } | { direkte: string }

const beskjed = lagSignal<Chatbeskjed>()

/**
 * En samtale som er bedt om før menyen hører etter, som når appen åpnes på
 * den gamle adressen til chatten i en gruppe og chatten ennå ikke er hentet.
 * Menyen tar den når den begynner å høre etter.
 */
let venter: Chatbeskjed | null = null

/** Åpner eller lukker chatmenyen, som chatknappen. */
export const veksleChatten = () => beskjed.send({ veksle: true })

/** Åpner chatmenyen på gruppechatten, eller på oversikten med `null`. */
export function visGruppesamtale(gruppe: string | null): void {
  venter = { gruppe }
  beskjed.send({ gruppe })
}

/** Åpner chatmenyen på direktesamtalen, som profilkortet gjør. */
export function visDirektesamtale(samtale: string): void {
  venter = { direkte: samtale }
  beskjed.send({ direkte: samtale })
}

/**
 * Hører etter beskjedene til menyen, og får den som venter, om noen, i neste
 * bilde: da står også chatknappen, så menyen vet om flaten er smal. Gir
 * tilbake funksjonen som slutter å høre etter; en beskjed som ikke er tatt
 * ennå, venter da videre.
 */
export function lyttEtterChatbeskjed(lytter: (beskjed: Chatbeskjed) => void): () => void {
  const slutt = beskjed.lytt((b) => {
    venter = null
    lytter(b)
  })
  const ventende = venter
  if (!ventende) return slutt
  const ramme = requestAnimationFrame(() => {
    if (venter !== ventende) return
    venter = null
    lytter(ventende)
  })
  return () => {
    cancelAnimationFrame(ramme)
    slutt()
  }
}
