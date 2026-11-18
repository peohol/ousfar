import { gruppeadresse } from '../../domain/rute'
import { lagSignal } from '../../domain/signal'
import { erstattAdressen } from '../../hooks/useRute'
import { forlatIdelagene } from '../ideer/idevisning'
import type { Forlat } from '../ideer/useForlatvakt'

/**
 * Veien inn til en idé eller en oppgave i en gruppe fra andre steder i appen,
 * som et varsel eller en direktelenke. De står i gruppens arbeidsflater
 * (`Gruppeflate`), ikke i idévinduet: idélagene lukkes først, og så går
 * adressen dit. Flaten legger seg over siden brukeren var på, og lukkes dit.
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
const endring = lagSignal<string>()

/** Noe i gruppen er endret (i en arbeidsflate), så gruppesiden henter tallene sine på nytt. */
export const meldGruppeendring = (gruppe: string): void => endring.send(gruppe)
/** Hører etter {@link meldGruppeendring}. Gir tilbake funksjonen som slutter å høre etter. */
export const lyttEtterGruppeendring = endring.lytt

/** Vakten arbeidsflaten melder for skjemaet som står åpent i den. */
let forlatSiden: Forlat | null = null

/**
 * Gjør `deretter` når skjemaene kan forlates: idélagene og et skjema i en
 * arbeidsflate spør først når de har endringer som ikke er lagret, og
 * forkastes de ikke, skjer ingenting.
 */
export function forlatSkjemaene(deretter: () => void): void {
  forlatIdelagene(() => (forlatSiden ? forlatSiden(deretter) : deretter()))
}

/** For `Gruppeflate`. Gir tilbake funksjonen som melder vakten av. */
export function meldGruppesiden(forlat: Forlat): () => void {
  forlatSiden = forlat
  return () => {
    if (forlatSiden === forlat) forlatSiden = null
  }
}

/** Går til adressen, gjennom skjemavaktene når den er en annen enn den som står. */
function gaTil(adresse: string, erstatt: boolean, deretter?: () => void) {
  const ga = () => {
    if (window.location.hash !== adresse) {
      if (erstatt) erstattAdressen(adresse)
      else window.location.hash = adresse
    }
    deretter?.()
  }
  if (window.location.hash === adresse) forlatIdelagene(ga)
  else forlatSkjemaene(ga)
}

/**
 * Går til idéen i gruppen, og eventuelt til kommentaren under den. Med
 * `erstatt` legges ingenting nytt i historikken (en lenke limt inn i
 * adressefeltet). `deretter` skjer når den faktisk er gått dit, ikke om
 * brukeren blir i et skjema.
 */
export function visGruppeide(
  gruppe: string,
  ide: string,
  kommentar: string | null = null,
  { erstatt = false, deretter }: { erstatt?: boolean; deretter?: () => void } = {},
): void {
  gaTil(gruppeadresse(gruppe, 'ideer', ide), erstatt, () => {
    venter = kommentar ? { ide, kommentar } : null
    signal.send()
    deretter?.()
  })
}

/** Går til oppgaven i gruppen, og gjør så `deretter`. */
export function visGruppeoppgave(gruppe: string, oppgave: string, deretter?: () => void): void {
  gaTil(gruppeadresse(gruppe, 'oppgaver', oppgave), false, deretter)
}

/** Går til chatten i gruppen, og gjør så `deretter` (docs/gruppechat.md, «Varslene»). Chatten er en egen side til chatmenyen tar over den. */
export function visGruppechat(gruppe: string, deretter?: () => void): void {
  gaTil(gruppeadresse(gruppe, 'chat'), false, deretter)
}

/** Går til oversikten over gruppen, og gjør så `deretter`. */
export function visGruppen(gruppe: string, deretter?: () => void): void {
  gaTil(gruppeadresse(gruppe), false, deretter)
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
