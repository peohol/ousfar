/**
 * Signerte lenker til bildene i de private bøttene: profilbildene og
 * gruppesymbolene.
 *
 * Bøttene er private, så et bilde kan ikke vises med en fast adresse. Lenkene
 * hentes for alle bildene som trengs på én gang, og på nytt når noen har
 * byttet bilde — tidspunktet bildet sist ble endret, er det som sier fra om det.
 */
import { useEffect, useState } from 'react'
import { BILDELENKE_LEVETID, signerteBildelenker } from './api'

/**
 * Når lenkene hentes på nytt. Godt innenfor levetiden, slik at et bilde aldri
 * blir stående brutt i en fane som har stått åpen lenge. Regnes ut først når
 * det finnes bilder, så sider uten bilder ikke avhenger av lagringsoppsettet.
 */
const fornyesEtter = () => BILDELENKE_LEVETID * 0.75 * 1000

/** Et bilde i bøtta: stien, og når det sist ble endret. */
export interface Bilde {
  sti: string | null
  endret: string
}

/** Lenkene til bildene i `botte`, etter stien. */
export function useBildelenker(botte: string, bilder: readonly Bilde[]): Map<string, string> {
  const [lenker, setLenker] = useState<Map<string, string>>(new Map())
  /** Økes når lenkene skal fornyes. */
  const [runde, setRunde] = useState(0)

  // Nøkkelen er stiene og tidspunktene de sist ble endret. Den endrer seg
  // bare når det faktisk er noe nytt å hente.
  const noekkel = bilder
    .filter((bilde) => bilde.sti)
    .map((bilde) => `${bilde.sti}@${bilde.endret}`)
    .sort()
    .join('|')

  useEffect(() => {
    if (noekkel === '') {
      setLenker(new Map())
      return
    }
    let gjelder = true
    const stier = noekkel.split('|').map((oppf) => oppf.slice(0, oppf.lastIndexOf('@')))
    void signerteBildelenker(botte, stier)
      .catch(() => new Map<string, string>())
      .then((hentet) => {
        if (gjelder) setLenker(hentet)
      })
    return () => {
      gjelder = false
    }
  }, [botte, noekkel, runde])

  useEffect(() => {
    if (noekkel === '') return
    const klokke = window.setInterval(() => setRunde((forrige) => forrige + 1), fornyesEtter())
    return () => window.clearInterval(klokke)
  }, [noekkel])

  return lenker
}

