import { useEffect } from 'react'
import { erVarselsti } from '@delt/enhetsvarsel'
import { chatvarsler } from '../../chatvarsler/api'
import { APNE_MELDING } from '../../chatvarsler/enhet'
import { lesRute } from '../../domain/rute'

/**
 * Varslene på enheten mens appen er åpen (docs/chatvarsler.md,
 * docs/enhetsvarsler.md), uten noe å vise:
 *
 * - ved innlogging lagres abonnementet på enheten på nytt, eller avsluttes
 *   når det hører til en annen konto;
 * - et trykk på et varsel mens appen er åpen, åpner adressen i det vinduet.
 */
export function Chatvarselvakt({ brukerId }: { brukerId: string }) {
  useEffect(() => {
    chatvarsler?.synk(brukerId).catch(() => undefined)
  }, [brukerId])

  useEffect(() => {
    const arbeidere = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker
    if (!arbeidere) return
    const lytt = (hendelse: MessageEvent) => {
      const data: unknown = hendelse.data
      if (data === null || typeof data !== 'object') return
      const { type, sti } = data as { type?: unknown; sti?: unknown }
      // Bare adresser i appen som finnes, uansett hva meldingen sier.
      if (type === APNE_MELDING && typeof sti === 'string' && erVarselsti(sti) && lesRute(sti).side !== 'ukjent') window.location.hash = sti
    }
    arbeidere.addEventListener('message', lytt)
    return () => arbeidere.removeEventListener('message', lytt)
  }, [])

  return null
}
