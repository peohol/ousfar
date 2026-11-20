import { useEffect } from 'react'

/** Hvor ofte appen ser etter noe nytt mens den står åpen. */
export const SJEKK_HVER = 5 * 60_000

/**
 * Når fanen blir synlig igjen, sender nettleseren både `visibilitychange` og
 * `focus`, rett etter hverandre. Kommer den andre innen så lang tid etter den
 * første, er det det samme fanebyttet.
 */
export const SAMME_FANEBYTTE_MS = 1000

type Hendelse = 'synlig' | 'fokus'

/**
 * Kjører `sjekk` med én gang, når fanen får fokus eller blir synlig igjen, og
 * jevnlig mens den er synlig — som idélaget og bjella gjør for å se etter
 * nye kommentarer og varsler. `sjekk` bør ha fast identitet. Et fanebytte gir
 * én sjekk, selv om nettleseren sier fra både at fanen er synlig og at den
 * har fått fokus.
 */
export function useJevnligSjekk(sjekk: () => void, hver = SJEKK_HVER): void {
  useEffect(() => {
    /** Den andre hendelsen i fanebyttet som nettopp ble sjekket, og fristen for den. */
    let ventet: { hendelse: Hendelse; til: number } | null = null
    const vedHendelse = (hendelse: Hendelse) => {
      if (document.visibilityState !== 'visible') return
      const na = Date.now()
      if (ventet && ventet.hendelse === hendelse && na < ventet.til) {
        ventet = null
        return
      }
      ventet = { hendelse: hendelse === 'synlig' ? 'fokus' : 'synlig', til: na + SAMME_FANEBYTTE_MS }
      sjekk()
    }
    const naarSynlig = () => vedHendelse('synlig')
    const naarFokus = () => vedHendelse('fokus')
    sjekk()
    const jevnlig = window.setInterval(() => {
      if (document.visibilityState === 'visible') sjekk()
    }, hver)
    window.addEventListener('focus', naarFokus)
    document.addEventListener('visibilitychange', naarSynlig)
    return () => {
      window.clearInterval(jevnlig)
      window.removeEventListener('focus', naarFokus)
      document.removeEventListener('visibilitychange', naarSynlig)
    }
  }, [sjekk, hver])
}
