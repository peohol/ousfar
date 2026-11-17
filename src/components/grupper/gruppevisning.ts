import { gruppeadresse } from '../../domain/rute'
import { lagSignal } from '../../domain/signal'
import { forlatIdelagene } from '../ideer/idevisning'

/**
 * Veien inn til en idé eller en oppgave i en gruppe fra andre steder i appen,
 * som et varsel eller en direktelenke. De står på gruppesiden, i fanene der,
 * ikke i idévinduet: idélagene lukkes først, og så går adressen dit.
 *
 * Kommentaren en lenke peker på, venter her til idéen står (`Gruppeideer`),
 * på samme måte som en tråd venter på diskusjonsmenyen.
 */
interface Ventende {
  ide: string
  kommentar: string
}

let venter: Ventende | null = null
const signal = lagSignal()

function gaTil(adresse: string, erstatt: boolean) {
  if (window.location.hash === adresse) return
  if (erstatt) window.location.replace(adresse)
  else window.location.hash = adresse
}

/**
 * Går til idéen i gruppen, og eventuelt til kommentaren under den. Med
 * `erstatt` legges ingenting nytt i historikken (en lenke limt inn i
 * adressefeltet).
 */
export function visGruppeide(gruppe: string, ide: string, kommentar: string | null = null, { erstatt = false } = {}): void {
  forlatIdelagene(() => {
    venter = kommentar ? { ide, kommentar } : null
    gaTil(gruppeadresse(gruppe, 'ideer', ide), erstatt)
    signal.send()
  })
}

/** Går til oppgaven i gruppen. */
export function visGruppeoppgave(gruppe: string, oppgave: string): void {
  forlatIdelagene(() => gaTil(gruppeadresse(gruppe, 'oppgaver', oppgave), false))
}

/** Kommentaren som venter på å vises under idéen, om noen. Den venter ikke lenger etterpå. */
export function taGruppekommentar(ide: string): string | null {
  if (venter?.ide !== ide) return null
  const { kommentar } = venter
  venter = null
  return kommentar
}

/** Hører etter `visGruppeide`. Gir tilbake funksjonen som slutter å høre etter. */
export const lyttEtterGruppeide = signal.lytt
