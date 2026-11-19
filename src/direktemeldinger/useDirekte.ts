/**
 * Direktemeldingene i chatmenyen (docs/direktemeldinger-personvern.md):
 * samtalelista, egne valg, aktivitetsprikken og merkingen av egen aktivitet.
 *
 * - Lista og valgene hentes som gruppesamtalene: jevnlig, når fanen blir
 *   synlig, når dørklokken ringer i en av samtalene, og når noe i appen har
 *   merket meldinger lest. Svarer databasen at direktemeldingene ikke er slått
 *   på (eller kontoen mangler aktivt medlemskap), er de borte fra menyen.
 * - Aktivitetsprikken hentes hvert minutt mens menyen vises og det finnes
 *   samtaler. Den sier bare «aktiv nå», aldri et tidspunkt.
 * - Egen aktivitet merkes bare når «Vis når jeg er aktiv» er på, ved faktisk
 *   bruk (tastetrykk, trykk, rulling) i en synlig fane, høyst én gang i
 *   minuttet.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { IngenTilgang } from '../gruppechat/kall'
import { lagDeltTilstand } from '../hooks/deltTilstand'
import { useOppfriskVedRinging } from '../gruppechat/samtaler'
import { useKontoensSvarMedSjekk } from '../hooks/useKontoensSvar'
import { glemProfilkortene } from '../profilkort/api'
import { abonnerPaDirektesamtale, direkteapi } from './api'
import type { Direkteapi } from './kall'
import { useDirektesamtale } from './useDirektesamtale'
import { AVSLAATTE_CHATVALG, type Chatvalg, type Direktesamtale } from './modell'

/** Det menyen vet om direktemeldingene. */
export interface Direkteoversikt {
  /** Direktemeldingene er slått på i OUSFAR, og kontoen kan bruke dem. */
  pa: boolean
  samtaler: Direktesamtale[]
  valg: Chatvalg
}

export const UTEN_DIREKTE: Direkteoversikt = { pa: false, samtaler: [], valg: AVSLAATTE_CHATVALG }

/** Så ofte aktivitetsprikken hentes, og så sjelden egen aktivitet merkes. */
export const AKTIVITET_HVER_MS = 60_000

/** Lista og valgene; avslått eller uten tilgang gir {@link UTEN_DIREKTE}. */
export async function hentDirekteoversikt(api: Pick<Direkteapi, 'mineDirektesamtaler' | 'mineChatvalg'> = direkteapi): Promise<Direkteoversikt> {
  try {
    const [samtaler, valg] = await Promise.all([api.mineDirektesamtaler(), api.mineChatvalg()])
    return { pa: true, samtaler, valg }
  } catch (feil) {
    if (feil instanceof IngenTilgang) return UTEN_DIREKTE
    throw feil
  }
}

export interface Direktemeldinger extends Direkteoversikt {
  kjent: boolean
  /** Samtalepartnerne som er aktive nå. */
  aktive: ReadonlySet<string>
  /** Endrer egne valg; det databasen lagret, står etterpå. Kaster med feilen på norsk. */
  settValg: (valg: Partial<Chatvalg>) => Promise<void>
  oppdater: () => void
}

/**
 * Direktemeldingene til `bruker`, mens chatten står i appen (`aktivert`).
 * `vist`: menyen eller helsiden vises, så aktivitetsprikken trengs.
 */
export function useDirekte(bruker: string, aktivert: boolean, vist: boolean): Direktemeldinger {
  const hent = useMemo(() => (aktivert ? () => hentDirekteoversikt() : () => Promise.resolve(UTEN_DIREKTE)), [aktivert])
  const { verdi, kjent, sjekk, sett } = useKontoensSvarMedSjekk(bruker, hent, UTEN_DIREKTE)
  useOppfriskVedRinging(aktivert && verdi.pa, abonnerPaDirektesamtale, sjekk)

  const aktive = useAktiveMotparter(verdi.pa && vist && verdi.samtaler.length > 0)
  useAktivitetsmerking(verdi.pa && verdi.valg.vis_aktiv)

  const settValg = useCallback(
    async (endring: Partial<Chatvalg>) => {
      const valg = await direkteapi.settChatvalg(endring)
      sett({ ...verdi, valg })
      // Om det kan skrives i samtalene, følger bryteren: lista og de åpne samtalene med en gang.
      glemProfilkortene()
      sjekk()
      useDirektesamtale.oppfriskAlle()
    },
    [verdi, sett, sjekk],
  )

  /** Noe den innloggede har endret (som en blokkering): lista og de åpne samtalene hentes på nytt. */
  const oppdater = useCallback(() => {
    glemProfilkortene()
    sjekk()
    useDirektesamtale.oppfriskAlle()
  }, [sjekk])

  return useMemo(() => ({ ...verdi, kjent, aktive, settValg, oppdater }), [verdi, kjent, aktive, settValg, oppdater])
}

/**
 * Direktemeldingene slik chatmenyen har dem, for resten av appen (som fanen
 * Chat i Innstillinger): `null` når de ikke er slått på eller menyen ikke står.
 * Chatmenyen eier dem, så valgene og lista er de samme overalt, uten egne kall.
 */
export const direktemeldingene = lagDeltTilstand<Direktemeldinger | null>(null)

const INGEN_AKTIVE: ReadonlySet<string> = new Set()

/** Samtalepartnerne som er aktive nå, hentet hvert minutt mens `trengs` og fanen er synlig. */
function useAktiveMotparter(trengs: boolean): ReadonlySet<string> {
  const [aktive, setAktive] = useState(INGEN_AKTIVE)
  useEffect(() => {
    if (!trengs) {
      setAktive(INGEN_AKTIVE)
      return
    }
    let gjeldende = true
    const hent = () => {
      if (document.visibilityState === 'hidden') return
      direkteapi.aktiveMotparter().then(
        (ider) => {
          if (!gjeldende) return
          setAktive((forrige) => (samme(forrige, ider) ? forrige : new Set(ider)))
        },
        () => undefined,
      )
    }
    hent()
    const tidtaker = window.setInterval(hent, AKTIVITET_HVER_MS)
    document.addEventListener('visibilitychange', hent)
    return () => {
      gjeldende = false
      window.clearInterval(tidtaker)
      document.removeEventListener('visibilitychange', hent)
    }
  }, [trengs])
  return aktive
}

const samme = (forrige: ReadonlySet<string>, ider: readonly string[]) => forrige.size === ider.length && ider.every((id) => forrige.has(id))

/** Det som regnes som faktisk bruk. */
const BRUK = ['keydown', 'pointerdown', 'scroll', 'wheel'] as const

/** Merker egen aktivitet ved faktisk bruk i en synlig fane, høyst én gang i minuttet, mens `pa`. */
function useAktivitetsmerking(pa: boolean): void {
  useEffect(() => {
    if (!pa) return
    let sist = 0
    const merk = () => {
      const naa = Date.now()
      if (document.visibilityState === 'hidden' || naa - sist < AKTIVITET_HVER_MS) return
      sist = naa
      void direkteapi.markerChataktivitet().catch(() => undefined)
    }
    merk()
    for (const hendelse of BRUK) window.addEventListener(hendelse, merk, { capture: true, passive: true })
    return () => {
      for (const hendelse of BRUK) window.removeEventListener(hendelse, merk, { capture: true })
    }
  }, [pa])
}
