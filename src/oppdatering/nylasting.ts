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
 *
 * Feilet appen mens den ble tegnet opp, og ikke mens den ble hentet, kan det
 * skyldes noe som ble tatt vare på fra forrige versjon. Da lastes den på nytt
 * uten det.
 */
import { erKonfigurert, klient } from '../auth/klient'
import { LAGRINGSNOKKEL, leggBildetTilbake } from './bevaring'

/** Nøkkelen i `sessionStorage` for når appen sist ble lastet på nytt av seg selv. */
export const NYLASTINGSNOKKEL = 'ousfar.nylasting'

/** Appen lastes ikke på nytt av seg selv oftere enn dette. */
export const IKKE_OFTERE_ENN = 60_000

/** Hvor lenge fornyelsen av økten kan ta før siden lastes på nytt likevel. */
const FORNY_HOYST = 5_000

/** En pause før siden lastes på nytt, så det som feilet, får et øyeblikk. */
const PAUSE = 1_000

/** Den kliniske delen av appen lot seg ikke hente (til forskjell fra en feil mens den tegnes opp). */
export class Lastefeil extends Error {
  constructor(arsak: unknown) {
    super('Fikk ikke hentet appen', { cause: arsak })
    this.name = 'Lastefeil'
  }
}

/** Sant når appen ikke er lastet på nytt av seg selv nylig. Uten lagring i fanen: aldri, så den ikke går i ring. */
export function kanLastePaNytt(naa: number = Date.now()): boolean {
  try {
    const sist = Number(sessionStorage.getItem(NYLASTINGSNOKKEL))
    return !(sist > 0 && naa - sist < IKKE_OFTERE_ENN)
  } catch {
    return false
  }
}

interface Nylastingsavhengigheter {
  fornyOkt?: () => Promise<unknown>
  lastInn?: () => void
  vent?: (ms: number) => Promise<void>
  naa?: () => number
}

const vente = (ms: number) => new Promise<void>((ferdig) => setTimeout(ferdig, ms))

/** Fornyer økten, legger tilbake det som ble tatt vare på (bare etter en `Lastefeil`), og laster siden på nytt. */
export async function lastPaNytt(
  feil: unknown,
  {
    fornyOkt = async () => (erKonfigurert() ? klient().auth.refreshSession() : undefined),
    lastInn = () => window.location.reload(),
    vent = vente,
    naa = Date.now,
  }: Nylastingsavhengigheter = {},
): Promise<void> {
  try {
    sessionStorage.setItem(NYLASTINGSNOKKEL, String(naa()))
    if (feil instanceof Lastefeil) leggBildetTilbake()
    else sessionStorage.removeItem(LAGRINGSNOKKEL)
  } catch {
    // `kanLastePaNytt` sier nei uten lagring, så hit kommer det ikke.
  }
  await Promise.race([fornyOkt().catch(() => undefined), vent(FORNY_HOYST)])
  await vent(PAUSE)
  lastInn()
}
