/**
 * Kode som hentes først når den trengs: den kliniske appen bak
 * innloggingsporten, og sidene og vinduene i den som ikke vises når appen
 * åpnes (`docs/ytelse-synlig-innlasting.md`, P1).
 *
 * Alt slikt hentes bak innloggingsveggen: byggeoppsettet gir hver pakke med
 * egen kode som ikke er ført opp som åpen, navnet til den beskyttede delen
 * (`vite.config.ts`, `scripts/kontroller-vegg.mjs`).
 *
 * Lar koden seg ikke hente — som regel rett etter en oppdatering, når de gamle
 * filene er byttet ut — er feilen en {@link Lastefeil}. Feilgrensen foran
 * appen (`Hentefeil` i `Port.tsx`) laster da siden på nytt med det brukeren
 * holdt på med i behold, i stedet for å vise en tom side. Et nytt forsøk
 * henter koden på nytt; et mislykket svar huskes ikke.
 *
 * Er koden alt hentet (forhåndslastet, eller vist før), vises komponenten med
 * en gang. `React.lazy` venter alltid én runde og viser ventefeltet først,
 * og React holder da ventefeltet en stund før siden kommer.
 *
 * Modulen har ikke noe faglig innhold og ligger utenfor veggen, fordi porten
 * bruker den.
 */
import { createElement, type ComponentProps, type ComponentType } from 'react'
import { Lastefeil } from './nylasting'

// Komponentene har ulike egenskaper; typen til hver følger med fra modulen.
type Komponent = ComponentType<any>

/** En komponent som hentes første gang den vises, eller før med {@link Senerekomponent.forhandslast}. */
export type Senerekomponent<C extends Komponent> = ComponentType<ComponentProps<C>> & {
  /**
   * Henter koden nå, uten å vise noe, så den er der når den trengs. Løftet
   * holdes når hentingen er over; en feil her merkes ikke.
   */
  forhandslast: () => Promise<void>
}

/**
 * Komponenten `navn` fra modulen `hent` gir, hentet første gang den vises.
 * Vis den inne i en `Suspense`, ellers venter hele appen på den.
 */
export function senere<M extends Record<K, Komponent>, K extends keyof M & string>(
  hent: () => Promise<M>,
  navn: K,
): Senerekomponent<M[K]> {
  let lastet: M[K] | null = null
  let lasting: Promise<M[K]> | null = null
  // Feilen en visning ventet på, til den vises; en feilet forhåndslasting gir ingen.
  let feil: unknown = null
  const last = () =>
    (lasting ??= hent().then(
      (modul) => (lastet = modul[navn]),
      (feil: unknown) => {
        lasting = null
        throw new Lastefeil(feil)
      },
    ))
  function Senerekomponent(egenskaper: ComponentProps<M[K]>) {
    if (lastet) return createElement(lastet, egenskaper)
    if (feil) {
      const grunn = feil
      feil = null
      throw grunn
    }
    // Suspense viser ventefeltet til koden er hentet, og prøver så igjen.
    throw last().then(
      () => undefined,
      (grunn: unknown) => {
        feil = grunn
      },
    )
  }
  Senerekomponent.displayName = `senere(${navn})`
  return Object.assign(Senerekomponent, {
    forhandslast: () =>
      last().then(
        () => undefined,
        () => undefined,
      ),
  })
}
