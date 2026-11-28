/**
 * Panelene på den personlige forsiden og brukerens oppsett av dem
 * (docs/forside.md). Rene funksjoner: hvilke paneler som finnes, hva som er
 * standard, hvem som har dem, og hvordan et lagret oppsett leses og endres.
 *
 * Oppsettet er én ordnet liste `{ modul, synlig }` per bruker, lagret i
 * brukerinnstillingene (`forside.moduler`). Det er det samme på alle maskiner
 * og i alle fagmiljøer; innholdet i panelene følger fagmiljøet.
 *
 * Et panel kan høre til en funksjon (funksjonsbryterne, docs/fagmiljoer.md).
 * Det finnes da bare for den som har funksjonen i fagmiljøet hen arbeider i:
 * for andre er det verken på forsiden eller i «Tilpass forsiden», og valget
 * brukeren har lagret for det, står urørt til det kommer tilbake. Funksjonene
 * her tar derfor hvilke paneler brukeren har ({@link Tilgang}); uten den har
 * brukeren alle.
 */
import type { ComponentType } from 'react'
import type { Fagmiljoreferanse } from '../auth/rettigheter'
import type { Ikonnavn } from '../components/ikon/register'
import { REGISTRERTE_MODULER } from './registrerte'

/** Hvor panelet står: blant panelene, eller i feltet øverst, under fortolkningen. */
export type Modulplass = 'paneler' | 'topp'

/** Det et panel fra et eierprosjekt får å vise innholdet med. */
export interface Modulinnholdprops {
  /**
   * Fagmiljøet brukeren arbeider i, som innholdet gjelder. Byttes det, settes
   * innholdet opp på nytt, så det aldri viser det forrige fagmiljøets.
   */
  fagmiljo: Fagmiljoreferanse
  tittel: string
  ikon: Ikonnavn
}

export interface Moduldefinisjon {
  tittel: string
  ikon: Ikonnavn
  /** Vises når brukeren ikke har valgt noe. */
  standard: boolean
  /**
   * Funksjonen panelet hører til (`public.funksjoner`). Panelet finnes da bare
   * for den som har funksjonen i fagmiljøet hen arbeider i. Uten den finnes
   * det for alle.
   */
  funksjon?: string
  /** Standard er blant panelene. */
  plass?: Modulplass
  /** Kan ikke skjules: står alltid der når brukeren har det. */
  fast?: boolean
  /**
   * Innholdet til et panel et eierprosjekt har registrert
   * (`src/forside/registrerte.ts`), som regel `senere(() => import(…))`, så koden
   * hentes først når panelet vises. Uten det er panelet et av forsidens egne.
   */
  innhold?: ComponentType<Modulinnholdprops>
}

/**
 * Forsidens egne paneler, i standardrekkefølgen. De fire første er på som
 * standard; de valgfrie er av (planen §4.2). «Nylig besøkt» er utsatt: den
 * krever ny lagring av hva brukeren ser på.
 */
export const INNEBYGDE_MODULER = {
  viktig_nytt: { tittel: 'Viktig nytt', ikon: 'bell', standard: true },
  aktuelt: { tittel: 'Aktuelt for deg', ikon: 'done', standard: true },
  grupper: { tittel: 'Mine grupper', ikon: 'grupper', standard: true },
  fagsider: { tittel: 'Oppdaterte fagsider', ikon: 'stoffregister', standard: true },
  ideer: { tittel: 'Nytt i idébanken', ikon: 'idea', standard: false },
  oppgaver: { tittel: 'Mine oppgaver', ikon: 'oppgaver', standard: false },
  diskusjoner: { tittel: 'Diskusjoner jeg følger', ikon: 'diskusjon', standard: false },
  favoritter: { tittel: 'Favorittfagsider', ikon: 'star', standard: false },
} as const satisfies Record<string, Moduldefinisjon>

export type Innebygdmodul = keyof typeof INNEBYGDE_MODULER

const MODULENE = { ...INNEBYGDE_MODULER, ...REGISTRERTE_MODULER }

export type Forsidemodul = keyof typeof MODULENE

/** Alle panelene: forsidens egne, så de eierprosjektene har registrert. */
export const FORSIDEMODULER: Readonly<Record<Forsidemodul, Moduldefinisjon>> = MODULENE

export const MODULREKKEFOLGE = Object.keys(FORSIDEMODULER) as Forsidemodul[]

export const erForsidemodul = (verdi: unknown): verdi is Forsidemodul =>
  typeof verdi === 'string' && Object.hasOwn(FORSIDEMODULER, verdi)

/** Om panelet er et av forsidens egne, som forsiden selv viser innholdet til. */
export const erInnebygd = (modul: Forsidemodul): modul is Innebygdmodul => Object.hasOwn(INNEBYGDE_MODULER, modul)

export const plassFor = (modul: Forsidemodul): Modulplass => FORSIDEMODULER[modul].plass ?? 'paneler'

export interface Modulvalg {
  modul: Forsidemodul
  synlig: boolean
}

export type Forsideoppsett = readonly Modulvalg[]

/** Hvilke paneler brukeren har nå. */
export type Tilgang = (modul: Forsidemodul) => boolean

/** Alle panelene, som for et oppsett uten tilgangsstyrte paneler. */
export const ALLE: Tilgang = () => true

/**
 * Panelene brukeren har: de uten funksjon, og de med en funksjon hen har i
 * fagmiljøet hen arbeider i. Innholdet fra et eierprosjekt gjelder et
 * fagmiljø, så uten noe å arbeide i finnes det ikke. Et grensesnitt, ikke en
 * kontroll: det eierprosjektet henter, kontrollerer tilgangen på nytt på
 * serveren.
 */
export function tilgangFor(fagmiljo: Fagmiljoreferanse | null, harFunksjon: (funksjon: string, fagmiljo: string) => boolean): Tilgang {
  return (modul) => {
    const { funksjon, innhold } = FORSIDEMODULER[modul]
    if (funksjon === undefined && innhold === undefined) return true
    return fagmiljo !== null && (funksjon === undefined || harFunksjon(funksjon, fagmiljo.id))
  }
}

/** Nøkkelen oppsettet lagres under i brukerinnstillingene. */
export const OPPSETTNOKKEL = 'forside.moduler'

/** Alle panelene i standardrekkefølgen, med standardvalget. */
export const STANDARDOPPSETT: Forsideoppsett = MODULREKKEFOLGE.map((modul) => ({ modul, synlig: FORSIDEMODULER[modul].standard }))

/**
 * Valget for et panel som ikke står i det lagrede. Et panel som er kommet til
 * siden brukeren lagret, er skjult, så brukerens egne valg står. Et panel som
 * hører til en funksjon, er nytt for brukeren fordi funksjonen er det, og får
 * standardvalget sitt.
 */
const nyttValg = (modul: Forsidemodul): boolean => FORSIDEMODULER[modul].funksjon !== undefined && FORSIDEMODULER[modul].standard

/**
 * Et lagret oppsett slik appen bruker det. Moduler appen ikke kjenner (fra en
 * nyere eller eldre versjon), og dobbeltføringer, hoppes over. Moduler som
 * mangler, legges nederst ({@link nyttValg}). Uten noe lagret, eller med feil
 * form, gjelder standarden. Panelene brukeren ikke har nå, står med i
 * oppsettet, så valget for dem tåler at tilgangen forsvinner og kommer tilbake.
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
  return [...kjente, ...MODULREKKEFOLGE.filter((m) => !sett.has(m)).map((modul) => ({ modul, synlig: nyttValg(modul) }))]
}

/** Valgene brukeren ser i «Tilpass forsiden»: bare for panelene hen har, i rekkefølgen. */
export const tilgjengeligeValg = (oppsett: Forsideoppsett, tilgang: Tilgang = ALLE): Modulvalg[] => oppsett.filter((v) => tilgang(v.modul))

/** Oppsettet med `modul` vist eller skjult. */
export function settSynlig(oppsett: Forsideoppsett, modul: Forsidemodul, synlig: boolean): Forsideoppsett {
  return oppsett.map((v) => (v.modul === modul ? { modul, synlig } : v))
}

/**
 * Oppsettet med `modul` ett steg opp (`-1`) eller ned (`1`) blant panelene
 * brukeren har på samme plass. Panelene hen ikke har, står der de sto. Står
 * den alt ytterst, er det uendret.
 */
export function flytt(oppsett: Forsideoppsett, modul: Forsidemodul, retning: -1 | 1, tilgang: Tilgang = ALLE): Forsideoppsett {
  const fra = oppsett.findIndex((v) => v.modul === modul)
  if (fra < 0) return oppsett
  const plass = plassFor(modul)
  let til = fra + retning
  while (til >= 0 && til < oppsett.length && !(tilgang(oppsett[til]!.modul) && plassFor(oppsett[til]!.modul) === plass)) til += retning
  if (til < 0 || til >= oppsett.length) return oppsett
  const nytt = [...oppsett]
  ;[nytt[fra], nytt[til]] = [nytt[til]!, nytt[fra]!]
  return nytt
}

/**
 * Om oppsettet er standarden for panelene brukeren har, så «Gjenopprett
 * standard» ikke har noe å gjøre. Panelene hen ikke har, teller ikke: det
 * skal ikke merkes at de finnes.
 */
export function erStandard(oppsett: Forsideoppsett, tilgang: Tilgang = ALLE): boolean {
  const mine = tilgjengeligeValg(oppsett, tilgang)
  const standard = tilgjengeligeValg(STANDARDOPPSETT, tilgang)
  return mine.length === standard.length && mine.every((v, i) => v.modul === standard[i]!.modul && v.synlig === standard[i]!.synlig)
}

/** Standarden for panelene brukeren har; valget for dem hen ikke har, står. */
export function gjenopprettStandard(oppsett: Forsideoppsett, tilgang: Tilgang = ALLE): Forsideoppsett {
  const nytt = STANDARDOPPSETT.map((v) => (tilgang(v.modul) ? v : (oppsett.find((o) => o.modul === v.modul) ?? v)))
  return nytt.every((v, i) => v === STANDARDOPPSETT[i]) ? STANDARDOPPSETT : nytt
}

/** Om panelet vises: brukeren har det, og har valgt det, eller det kan ikke skjules. */
const vises = (v: Modulvalg, tilgang: Tilgang) => tilgang(v.modul) && (v.synlig || FORSIDEMODULER[v.modul].fast === true)

/** Panelene som vises, i brukerens rekkefølge, eventuelt bare på én plass. */
export const synligeModuler = (oppsett: Forsideoppsett, tilgang: Tilgang = ALLE, plass?: Modulplass): Forsidemodul[] =>
  oppsett.filter((v) => vises(v, tilgang) && (plass === undefined || plassFor(v.modul) === plass)).map((v) => v.modul)
