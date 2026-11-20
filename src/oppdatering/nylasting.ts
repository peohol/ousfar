/**
 * Når appen ikke lot seg hente ved oppstarten: et nytt forsøk av seg selv, før
 * brukeren får «Fikk ikke hentet appen».
 *
 * Den kliniske delen hentes bak innloggingsveggen (`middleware.ts`). Rett
 * etter en oppdatering kan den første forespørselen dit feile av grunner som
 * går over av seg selv: et nett som ikke er helt oppe igjen, eller en økt som
 * må fornyes. Da fornyes økten, og siden lastes på nytt én gang, med det
 * brukeren holdt på med i behold (`leggBildetTilbake`). Feiler den igjen
 * innen `IKKE_OFTERE_ENN`, får brukeren kortet, så siden aldri går i ring.
 * Kan fanen ikke huske at den lastet på nytt — lagringen kan ikke leses
 * eller skrives — lastes den ikke på nytt av seg selv i det hele tatt.
 *
 * Feilet appen mens den ble tegnet opp, og ikke mens den ble hentet, kan det
 * skyldes noe som ble tatt vare på fra forrige versjon. Da lastes den på nytt
 * uten det.
 */
import { erKonfigurert, klient } from '../auth/klient'
import { LAGRINGSNOKKEL, leggBildetTilbake } from './bevaring'
import { innen, OKTFRIST } from './forberedelse'

/** Nøkkelen i `sessionStorage` for når appen sist ble lastet på nytt av seg selv. */
export const NYLASTINGSNOKKEL = 'ousfar.nylasting'

/** Appen lastes ikke på nytt av seg selv oftere enn dette. */
export const IKKE_OFTERE_ENN = 60_000

/** En pause før siden lastes på nytt, så det som feilet, får et øyeblikk. */
const PAUSE = 1_000

/** Den kliniske delen av appen lot seg ikke hente (til forskjell fra en feil mens den tegnes opp). */
export class Lastefeil extends Error {
  constructor(arsak: unknown) {
    super('Fikk ikke hentet appen', { cause: arsak })
    this.name = 'Lastefeil'
  }
}

/**
 * Sant når appen kan lastes på nytt av seg selv nå: det er ikke gjort nylig,
 * og fanen har skrevet ned at det gjøres nå, og lest det tilbake. Uten det
 * kunne en feil som kommer igjen ved hver oppstart, laste siden på nytt i det
 * uendelige; da får brukeren heller kortet.
 */
export function reserverNylasting(naa: number = Date.now()): boolean {
  try {
    const sist = Number(sessionStorage.getItem(NYLASTINGSNOKKEL))
    if (sist > 0 && naa - sist < IKKE_OFTERE_ENN) return false
    const merke = String(naa)
    sessionStorage.setItem(NYLASTINGSNOKKEL, merke)
    return sessionStorage.getItem(NYLASTINGSNOKKEL) === merke
  } catch {
    return false
  }
}

interface Nylastingsavhengigheter {
  fornyOkt?: () => Promise<unknown>
  lastInn?: () => void
  vent?: (ms: number) => Promise<void>
}

const vente = (ms: number) => new Promise<void>((ferdig) => setTimeout(ferdig, ms))

/**
 * Fornyer økten, legger tilbake det som ble tatt vare på (bare etter en
 * `Lastefeil`), og laster siden på nytt. Kalles bare når
 * `reserverNylasting` har sagt ja.
 */
export async function lastPaNytt(
  feil: unknown,
  {
    fornyOkt = async () => (erKonfigurert() ? klient().auth.refreshSession() : undefined),
    lastInn = () => window.location.reload(),
    vent = vente,
  }: Nylastingsavhengigheter = {},
): Promise<void> {
  try {
    if (feil instanceof Lastefeil) leggBildetTilbake()
    else sessionStorage.removeItem(LAGRINGSNOKKEL)
  } catch {
    // Siden lastes på nytt likevel, bare uten å ta vare på noe.
  }
  await innen(fornyOkt(), OKTFRIST, undefined)
  await vent(PAUSE)
  lastInn()
}
