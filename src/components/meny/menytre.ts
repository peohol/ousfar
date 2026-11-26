import type { Ikonnavn } from '../ikon/register'

/**
 * Den felles modellen for hierarkiske menyer (Issue #604, `docs/navigasjon.md`,
 * «Hovedmenyen»). En meny er et tre av nivåer: hvert nivå har ett eller flere
 * avsnitt med valg, og et valg er en lenke, en handling eller en undermeny.
 * Visningen (`Menyniva`, `Sidemeny`) leser bare denne modellen, så et nytt
 * valg eller en ny undermeny er én oppføring i treet, uten egen kode for
 * visning, tastatur, varsler eller hvor brukeren står.
 *
 * Treet er rent data og bygges på nytt av den som eier menyen (for
 * hovedmenyen `useHovedmenyen`). Tilgang uttrykkes med `vis`; et skjult valg
 * er ingen tilgangskontroll, den ligger alltid i databasen og funksjonene bak.
 */

/** Ett valg i et menynivå. Har nøyaktig én av `adresse`, `handling` og `undermeny`. */
export interface Menypunkt {
  /** Entydig blant valgene på nivået; stien til et nivå er ID-ene ned til det. */
  id: string
  navn: string
  ikon?: Ikonnavn
  /** En kort linje under navnet, som hva et verktøy gjør. */
  beskrivelse?: string
  /** En side i appen. Står som lenke, så den også kan åpnes i en ny fane. */
  adresse?: string
  /** Noe som åpnes over siden, som et vindu eller chatmenyen. Menyen lukkes først. */
  handling?: () => void
  /** Nivået valget fører til. Erstatter innholdet i panelet. */
  undermeny?: Menyniva
  /** Siden brukeren står på. Nivåene over valget får et svakere merke. */
  gjeldende?: boolean
  /** Kort tekst til høyre, som «2 invitasjoner» eller antallet stoffer. */
  merke?: string
  /** Det skjermlesere får i stedet for merket, som «12 stoffer». */
  merkeetikett?: string
  /**
   * Noe nytt venter bak valget, med denne teksten: en prikk ved valget, ved
   * valgene som fører ned til det, og på knappen som åpner menyen.
   */
  nytt?: string
  /** Kort merknad til høyre om hvem valget er for, som «Systemarkitekt». */
  hint?: string
  /** En knapp ved siden av valget, som den som fjerner en favoritt. */
  tillegg?: { etikett: string; ikon: Ikonnavn; handling: () => void }
  /** `false` skjuler valget. Standard er synlig. */
  vis?: boolean
}

/** Et avsnitt i et nivå, med en mellomoverskrift eller uten. */
export interface Menyavsnitt {
  id: string
  overskrift?: string
  punkter: readonly Menypunkt[]
}

/** Et søkefelt øverst i nivået. Med et søk står treffene i stedet for avsnittene. */
export interface Menysok {
  etikett: string
  finn: (sporring: string) => Menyavsnitt[]
  /** Teksten når ingenting passer. */
  ingenTreff: string
}

/** En bryter øverst i nivået, som «Vis underkategorier». */
export interface Menybryter {
  navn: string
  pa: boolean
  onEndre: (pa: boolean) => void
}

export interface Menyniva {
  /** Navnet i toppfeltet. */
  navn: string
  avsnitt: readonly Menyavsnitt[]
  /** Teksten nivået viser uten valg, som hvordan en favoritt legges til. Uten den vises ikke et tomt nivå. */
  tomt?: string
  sok?: Menysok
  bryter?: Menybryter
}

const synlig = (p: Menypunkt) => p.vis !== false

/**
 * Nivået slik det vises: uten skjulte valg, uten undermenyer uten innhold
 * (heller ikke når innholdet ble borte lenger ned) og uten tomme avsnitt.
 * Et nivå med `tomt` eller et søk har innhold selv uten valg.
 */
export function rensNiva(niva: Menyniva): Menyniva {
  const avsnitt = niva.avsnitt
    .map((a) => ({
      ...a,
      punkter: a.punkter.filter(synlig).flatMap((p): Menypunkt[] => {
        if (!p.undermeny) return [p]
        const under = rensNiva(p.undermeny)
        return harInnhold(under) ? [{ ...p, undermeny: under }] : []
      }),
    }))
    .filter((a) => a.punkter.length > 0)
  return { ...niva, avsnitt }
}

/** Om nivået har noe å vise. */
export const harInnhold = (niva: Menyniva) => niva.avsnitt.length > 0 || niva.tomt !== undefined || niva.sok !== undefined

/** Valgene på nivået, i rekkefølgen de står. */
export const punktene = (niva: Menyniva): Menypunkt[] => niva.avsnitt.flatMap((a) => a.punkter)

/**
 * Nivåene langs stien, fra roten og ned. Stien stopper ved første ID som ikke
 * (lenger) finnes, som når en tilgang er borte, så menyen aldri står på et
 * nivå brukeren ikke har.
 */
export function folgSti(rot: Menyniva, sti: readonly string[]): { niva: Menyniva; punkt?: Menypunkt }[] {
  const nivaene: { niva: Menyniva; punkt?: Menypunkt }[] = [{ niva: rot }]
  for (const id of sti) {
    const punkt = punktene(nivaene[nivaene.length - 1]!.niva).find((p) => p.id === id)
    if (!punkt?.undermeny) break
    nivaene.push({ niva: punkt.undermeny, punkt })
  }
  return nivaene
}

/** Det nye som venter bak valget: dets eget og alt i undermenyene. */
export function nyttUnder(punkt: Menypunkt): string[] {
  return [...(punkt.nytt ? [punkt.nytt] : []), ...(punkt.undermeny ? nyttINiva(punkt.undermeny) : [])]
}

/** Alt nytt på nivået og under det, i rekkefølgen det står. */
export const nyttINiva = (niva: Menyniva): string[] => punktene(niva).flatMap(nyttUnder)

/** Om siden brukeren står på, ligger et sted under valget. */
export function gjeldendeUnder(punkt: Menypunkt): boolean {
  return !!punkt.undermeny && punktene(punkt.undermeny).some((p) => p.gjeldende || gjeldendeUnder(p))
}
