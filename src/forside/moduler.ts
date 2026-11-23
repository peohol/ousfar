/**
 * Panelene på den personlige forsiden og brukerens oppsett av dem
 * (docs/forside.md). Rene funksjoner: hvilke paneler som finnes, hva som er
 * standard, og hvordan et lagret oppsett leses og endres.
 *
 * Oppsettet er én ordnet liste `{ modul, synlig }` per bruker, lagret i
 * brukerinnstillingene (`forside.moduler`). Det er det samme på alle maskiner
 * og i alle fagmiljøer; innholdet i panelene følger fagmiljøet.
 */
import type { Ikonnavn } from '../components/ikon/register'

export interface Moduldefinisjon {
  tittel: string
  ikon: Ikonnavn
  /** Vises når brukeren ikke har valgt noe. */
  standard: boolean
}

/**
 * Panelene, i standardrekkefølgen. De fire første er på som standard; de
 * valgfrie er av (planen §4.2). «Nylig besøkt» er utsatt: den krever ny
 * lagring av hva brukeren ser på.
 */
export const FORSIDEMODULER = {
  viktig_nytt: { tittel: 'Viktig nytt', ikon: 'bell', standard: true },
  aktuelt: { tittel: 'Aktuelt for deg', ikon: 'done', standard: true },
  grupper: { tittel: 'Mine grupper', ikon: 'grupper', standard: true },
  fagsider: { tittel: 'Oppdaterte fagsider', ikon: 'stoffregister', standard: true },
  ideer: { tittel: 'Nytt i idébanken', ikon: 'idea', standard: false },
  oppgaver: { tittel: 'Mine oppgaver', ikon: 'oppgaver', standard: false },
  diskusjoner: { tittel: 'Diskusjoner jeg følger', ikon: 'diskusjon', standard: false },
  favoritter: { tittel: 'Favorittfagsider', ikon: 'star', standard: false },
} as const satisfies Record<string, Moduldefinisjon>

export type Forsidemodul = keyof typeof FORSIDEMODULER

export const MODULREKKEFOLGE = Object.keys(FORSIDEMODULER) as Forsidemodul[]

export const erForsidemodul = (verdi: unknown): verdi is Forsidemodul =>
  typeof verdi === 'string' && Object.hasOwn(FORSIDEMODULER, verdi)

export interface Modulvalg {
  modul: Forsidemodul
  synlig: boolean
}

export type Forsideoppsett = readonly Modulvalg[]

/** Nøkkelen oppsettet lagres under i brukerinnstillingene. */
export const OPPSETTNOKKEL = 'forside.moduler'

/** Alle panelene i standardrekkefølgen, med standardvalget. */
export const STANDARDOPPSETT: Forsideoppsett = MODULREKKEFOLGE.map((modul) => ({ modul, synlig: FORSIDEMODULER[modul].standard }))

/**
 * Et lagret oppsett slik appen bruker det. Moduler appen ikke kjenner (fra en
 * nyere eller eldre versjon), og dobbeltføringer, hoppes over. Moduler som
 * mangler, som et panel som er kommet til siden brukeren lagret, legges
 * nederst og skjult, så brukerens egne valg står. Uten noe lagret, eller med
 * feil form, gjelder standarden.
 */
export function lesOppsett(lagret: unknown): Forsideoppsett {
  if (!Array.isArray(lagret)) return STANDARDOPPSETT
  const sett = new Set<Forsidemodul>()
  const kjente: Modulvalg[] = []
  for (const valg of lagret) {
    if (typeof valg !== 'object' || valg === null) continue
    const { modul, synlig } = valg as Record<string, unknown>
    if (!erForsidemodul(modul) || sett.has(modul) || typeof synlig !== 'boolean') continue
    sett.add(modul)
    kjente.push({ modul, synlig })
  }
  return [...kjente, ...MODULREKKEFOLGE.filter((m) => !sett.has(m)).map((modul) => ({ modul, synlig: false }))]
}

/** Oppsettet med `modul` vist eller skjult. */
export function settSynlig(oppsett: Forsideoppsett, modul: Forsidemodul, synlig: boolean): Forsideoppsett {
  return oppsett.map((v) => (v.modul === modul ? { modul, synlig } : v))
}

/** Oppsettet med `modul` ett steg opp (`-1`) eller ned (`1`). Står den alt ytterst, er det uendret. */
export function flytt(oppsett: Forsideoppsett, modul: Forsidemodul, retning: -1 | 1): Forsideoppsett {
  const fra = oppsett.findIndex((v) => v.modul === modul)
  const til = fra + retning
  if (fra < 0 || til < 0 || til >= oppsett.length) return oppsett
  const nytt = [...oppsett]
  ;[nytt[fra], nytt[til]] = [nytt[til]!, nytt[fra]!]
  return nytt
}

/** Om oppsettet er det samme som standarden, så «Gjenopprett standard» ikke har noe å gjøre. */
export const erStandard = (oppsett: Forsideoppsett): boolean =>
  oppsett.length === STANDARDOPPSETT.length &&
  oppsett.every((v, i) => v.modul === STANDARDOPPSETT[i]!.modul && v.synlig === STANDARDOPPSETT[i]!.synlig)

/** Panelene som vises, i brukerens rekkefølge. */
export const synligeModuler = (oppsett: Forsideoppsett): Forsidemodul[] => oppsett.filter((v) => v.synlig).map((v) => v.modul)
