import { REGISTER, SIDER, VARSLEDE } from 'virtual:ousfar-endringer'
import { siderFor } from '../domain/endringssider'
import { nyesteVersjon, type Endring, type Endringsmerke } from '../domain/versjon'
import { finnEndring } from '../domain/versjonering'

/**
 * Endringsloggen appen viser, nyest først: endringene med egen fil i
 * `src/data/endringer/`, med versjonene byggingen ga dem, over det frosne
 * arkivet med de eldre føringene (`endringshistorikk.ts`). Den øverste
 * føringen er versjonen appen kjører.
 *
 * Selve føringene er ikke med i appen fra start: byggingen deler loggen i
 * sider som hentes først når de vises (`src/drift/endringsmoduler.ts`,
 * `src/domain/endringssider.ts`). Appen har bare et merke per føring, som er
 * nok til versjonen, varslene og oppslagene, og de hele føringene som varsles
 * i bjella.
 *
 * Fila redigeres ikke når noe er endret: en ny endring får sin egen fil, og
 * versjonsnummeret beregnes når appen bygges (`src/domain/versjonering.ts`).
 * Rutinen står i `docs/endringslogg.md`.
 */

/** Et merke per føring i loggen, nyest først. */
export const ENDRINGSREGISTER: readonly Endringsmerke[] = REGISTER

/** Hele føringene som varsles i bjella, nyest først. */
export const VARSLEDE_ENDRINGER: readonly Endring[] = VARSLEDE

/** Versjonen appen kjører: den øverste føringen i loggen. */
export const VERSJON = nyesteVersjon(REGISTER)

/** Sidene som er hentet, etter nummeret. */
const hentede = new Map<number, readonly Endring[]>()
/** Hentingene som er på vei. En som feiler, glemmes, så neste forsøk henter på nytt. */
const underveis = new Map<number, Promise<void>>()

function hentSide(side: number): Promise<void> {
  if (hentede.has(side)) return Promise.resolve()
  let henting = underveis.get(side)
  if (!henting) {
    const last = SIDER[side]
    if (!last) return Promise.reject(new Error(`Endringsloggen har ingen side ${side}`))
    henting = last().then(
      (modul) => {
        hentede.set(side, modul.ENDRINGER)
        underveis.delete(side)
      },
      (feil: unknown) => {
        underveis.delete(side)
        throw feil
      },
    )
    underveis.set(side, henting)
  }
  return henting
}

/**
 * Så mange av de `vist` nyeste føringene som alt er hentet, hele og uten
 * hull, nyest først. Er alle hentet, kan loggen vises med en gang den åpnes;
 * mens flere hentes, står de som er der.
 */
export function hentedeEndringer(vist: number): Endring[] {
  const ut: Endring[] = []
  for (const side of siderFor(vist, REGISTER.length)) {
    const endringer = hentede.get(side)
    if (!endringer) break
    ut.push(...endringer)
  }
  return ut.slice(0, vist)
}

/** De `vist` nyeste føringene, hele: henter sidene som mangler. */
export async function hentEndringer(vist: number): Promise<Endring[]> {
  await Promise.all(siderFor(vist, REGISTER.length).map(hentSide))
  return hentedeEndringer(vist)
}

/** Hele loggen, alle føringene. Bare der alle trengs, som i valget av føring for en oppgave. */
export function hentHeleLoggen(): Promise<Endring[]> {
  return hentEndringer(REGISTER.length)
}

/**
 * Plassen i loggen (0 er den nyeste) til føringen `referanse` viser til, med
 * ID-en eller versjonen; `null` når den ikke er der.
 */
export function plassI(referanse: string | null | undefined): number | null {
  const merke = finnEndring(REGISTER, referanse)
  return merke ? REGISTER.indexOf(merke) : null
}
