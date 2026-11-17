/**
 * Idéene: formen de har i appen og sorteringen av lista. Kommentartråden og
 * tidspunktene deler de med diskusjonene (`src/traad/modell.ts`). Alt her er
 * rene funksjoner; kallene mot databasen står i `api.ts`, og reglene for hvem
 * som får gjøre hva, i migrasjonen `*_ideer.sql`.
 */
import { visningsnavn, type Profil } from '@delt/profil'
import type { Riktekstdokument } from '../faginnhold/riktekst'
import { lesInnlegg, lesKommentarer, rensInnleggstekst, type Innlegg, type Kommentar } from '../traad/modell'
import { erObjekt, tall, tallEllerNull, tekst, tekstEllerNull } from './lesing'

/* --- Kategoriene ----------------------------------------------------------- */

/** Kategoriene, i den rekkefølgen de vises. Samme verdier som `public.idekategori`. */
export const KATEGORIER = ['fag', 'funksjonalitet', 'annet'] as const
export type Idekategori = (typeof KATEGORIER)[number]

export const KATEGORINAVN: Record<Idekategori, string> = {
  fag: 'Fag',
  funksjonalitet: 'Funksjonalitet',
  annet: 'Annet',
}

export function erKategori(verdi: unknown): verdi is Idekategori {
  return typeof verdi === 'string' && (KATEGORIER as readonly string[]).includes(verdi)
}

/* --- Arkivet og oppgavene ------------------------------------------------ */

/**
 * Hvor lenge en idé står i arkivet («Ikke aktuelt») før den slettes. Samme
 * frist som `intern.arkivfrist()` i databasen.
 */
export const ARKIVFRIST_DAGER = 60

/** Statusene en planlagt oppgave går gjennom, i rekkefølge. Samme verdier som `public.oppgavestatus`. */
export const OPPGAVESTATUSER = ['ikke_paabegynt', 'under_arbeid', 'klar', 'haandteres', 'utfort'] as const
export type Oppgavestatus = (typeof OPPGAVESTATUSER)[number]

export const OPPGAVESTATUSNAVN: Record<Oppgavestatus, string> = {
  ikke_paabegynt: 'Ikke påbegynt',
  under_arbeid: 'Påbegynt',
  klar: 'Klar til implementering',
  haandteres: 'Håndteres nå av en agent',
  utfort: 'Utført',
}

export function erOppgavestatus(verdi: unknown): verdi is Oppgavestatus {
  return typeof verdi === 'string' && (OPPGAVESTATUSER as readonly string[]).includes(verdi)
}

/** Oppgaven en overført idé ble til, slik idélista trenger den. */
export interface Ideoppgave {
  id: string
  status: Oppgavestatus
  /** Nummeret oppgaven fikk da den ble overført. */
  nummer: number | null
}

/** Statusene en gruppeoppgave har. Samme verdier som `gruppeoppgaver_status` i databasen. */
export const GRUPPEOPPGAVESTATUSER = ['ikke_paabegynt', 'paagaar', 'fullfort'] as const
export type Gruppeoppgavestatus = (typeof GRUPPEOPPGAVESTATUSER)[number]

export function erGruppeoppgavestatus(verdi: unknown): verdi is Gruppeoppgavestatus {
  return typeof verdi === 'string' && (GRUPPEOPPGAVESTATUSER as readonly string[]).includes(verdi)
}

/** Gruppeoppgaven en gruppeidé er gjort om til, slik idélista trenger den. */
export interface Idegruppeoppgave {
  id: string
  status: Gruppeoppgavestatus
  tittel: string
}

/**
 * Hvor idéen står: åpen i lista, i arkivet, overført til de planlagte
 * oppgavene (de felles idéene) eller gjort om til en gruppeoppgave
 * (gruppeidéene).
 */
export type Idetilstand = 'apen' | 'arkivert' | 'overfort' | 'gruppeoppgave'

export function idetilstand(ide: Pick<Ide, 'arkivert_kl' | 'oppgave' | 'gruppeoppgave'>): Idetilstand {
  return ide.oppgave ? 'overfort' : ide.gruppeoppgave ? 'gruppeoppgave' : ide.arkivert_kl ? 'arkivert' : 'apen'
}

const DOGN = 86_400_000

/** Når en arkivert idé slettes. Databasen regner i UTC, der alle døgn er like lange. */
export function slettesKl(arkivertKl: string): Date {
  return new Date(Date.parse(arkivertKl) + ARKIVFRIST_DAGER * DOGN)
}

/** Hele dager til en arkivert idé slettes, aldri under null. */
export function dagerTilSletting(arkivertKl: string, naa: Date = new Date()): number {
  return Math.max(0, Math.ceil((slettesKl(arkivertKl).getTime() - naa.getTime()) / DOGN))
}

/** Nummeret en oppgave omtales med, som «OPG-007». Samme som `intern.oppgavekode()` i databasen. */
export function oppgavekode(nummer: number): string {
  return `OPG-${String(nummer).padStart(3, '0')}`
}

/* --- Formen dataene har ------------------------------------------------------ */

/** En idé slik lista viser den, uten beskrivelsen. */
export interface Ide extends Innlegg {
  forfatter_id: string
  /** Kategorien til en felles idé; en gruppeidé har ingen. */
  kategori: Idekategori | null
  /** Gruppen idéen hører til, eller `null` for de felles idéene til OUSFAR. */
  gruppe_id: string | null
  tittel: string
  /** Når idéen ble lagt i arkivet («Ikke aktuelt»), eller `null`. */
  arkivert_kl: string | null
  /** Oppgaven idéen er overført til, eller `null`. */
  oppgave: Ideoppgave | null
  /** Gruppeoppgaven en gruppeidé er gjort om til, eller `null`. */
  gruppeoppgave: Idegruppeoppgave | null
  kommentarer: number
  /** Kommentarer fra andre siden den innloggede sist åpnet idéen. */
  nye_kommentarer: number
  /** Om den innloggede har åpnet idéen, eller skrev den selv. */
  sett: boolean
}

/** Én idé med beskrivelsen og hele kommentartråden. */
export interface Idetraad extends Omit<Ide, 'kommentarer' | 'nye_kommentarer' | 'sett'> {
  /** Renset for visning, eller `null` uten beskrivelse. */
  tekst: Riktekstdokument | null
  kommentarer: Kommentar[]
  /** Når den innloggede sist åpnet idéen, eller `null` om aldri. */
  sist_sett: string | null
  /** Når databasen leste tråden. Det er dette som merkes som sett. */
  lest_kl: string | null
  /**
   * Om den innloggede kan behandle idéen («Ikke aktuelt», gjenopprette,
   * overføre eller gjøre om): systemarkitektene for de felles idéene, de
   * ansvarlige i gruppen for en gruppeidé.
   */
  kan_behandle: boolean
  /** Om den innloggede kan slette andres idéer og kommentarer her. */
  kan_moderere: boolean
  /** Om tråden er åpen for kommentarer og hjerter. */
  kan_kommentere: boolean
}

/* --- Lesing av det databasen svarer ------------------------------------------ */

function lesIdeoppgave(verdi: unknown): Ideoppgave | null {
  if (!erObjekt(verdi) || !erOppgavestatus(verdi.status)) return null
  const id = tekst(verdi.id)
  return id ? { id, status: verdi.status, nummer: tallEllerNull(verdi.nummer) } : null
}

function lesIdegruppeoppgave(verdi: unknown): Idegruppeoppgave | null {
  if (!erObjekt(verdi) || !erGruppeoppgavestatus(verdi.status)) return null
  const id = tekst(verdi.id)
  return id ? { id, status: verdi.status, tittel: tekst(verdi.tittel) } : null
}

/** En felles idé har en kategori, en gruppeidé har en gruppe; ellers har raden ikke formen. */
function lesIde(rad: unknown): Ide | null {
  if (!erObjekt(rad)) return null
  const gruppe_id = tekstEllerNull(rad.gruppe_id)
  const kategori = erKategori(rad.kategori) ? rad.kategori : null
  if ((gruppe_id === null) !== (kategori !== null)) return null
  const felles = lesInnlegg(rad)
  if (!felles.id || !felles.forfatter_id) return null
  return {
    ...felles,
    forfatter_id: felles.forfatter_id,
    kategori,
    gruppe_id,
    tittel: tekst(rad.tittel),
    arkivert_kl: tekstEllerNull(rad.arkivert_kl),
    oppgave: lesIdeoppgave(rad.oppgave),
    gruppeoppgave: lesIdegruppeoppgave(rad.gruppeoppgave),
    kommentarer: tall(rad.kommentarer),
    nye_kommentarer: tall(rad.nye_kommentarer),
    sett: rad.sett !== false,
  }
}

/** Idélista fra `ideoversikt()`. Rader som ikke har formen, utelates. */
export function lesIdeoversikt(data: unknown): Ide[] {
  return Array.isArray(data) ? data.flatMap((rad) => lesIde(rad) ?? []) : []
}

/** Svaret fra `gruppeideer()`: idéene i gruppen, og hva den innloggede kan gjøre der. */
export interface Gruppeideer {
  /** Skrive idéer og kommentarer: aktive medlemmer og systemarkitektene, så lenge gruppen er aktiv. */
  kan_skrive: boolean
  /** Behandle idéene: de ansvarlige i gruppen og systemarkitektene. */
  kan_behandle: boolean
  ideer: Ide[]
}

export const INGEN_GRUPPEIDEER: Gruppeideer = { kan_skrive: false, kan_behandle: false, ideer: [] }

export function lesGruppeideer(data: unknown): Gruppeideer {
  if (!erObjekt(data)) return INGEN_GRUPPEIDEER
  return { kan_skrive: data.kan_skrive === true, kan_behandle: data.kan_behandle === true, ideer: lesIdeoversikt(data.ideer) }
}

/** Idéen og tråden fra `idetraad()`, eller `null` når idéen ikke finnes. */
export function lesIdetraad(data: unknown): Idetraad | null {
  const ide = lesIde({ ...(erObjekt(data) ? data : {}), kommentarer: 0 })
  if (!ide || !erObjekt(data)) return null
  const kommentarer = lesKommentarer(data.kommentarer)
  const { kommentarer: _antall, nye_kommentarer: _nye, sett: _sett, ...resten } = ide
  return {
    ...resten,
    tekst: data.tekst == null ? null : rensInnleggstekst(data.tekst),
    kommentarer,
    sist_sett: tekstEllerNull(data.sist_sett),
    lest_kl: tekstEllerNull(data.lest_kl),
    kan_behandle: data.kan_behandle === true,
    kan_moderere: data.kan_moderere === true,
    kan_kommentere: data.kan_kommentere === true,
  }
}

/* --- Sorteringen ------------------------------------------------------------- */

export const KRITERIER = ['kategori', 'tid', 'bruker'] as const
export type Kriterium = (typeof KRITERIER)[number]

/** Kriteriene lista kan grupperes etter. Tiden gir ingen overskrifter. */
export const GRUPPEKRITERIER = ['kategori', 'bruker'] as const satisfies readonly Kriterium[]
export type Gruppekriterium = (typeof GRUPPEKRITERIER)[number]

export const KRITERIENAVN: Record<Kriterium, string> = {
  kategori: 'Kategori',
  tid: 'Tid',
  bruker: 'Bruker',
}

/**
 * Hvordan lista sorteres: `forst` gir overskriftene, `deretter` rekkefølgen
 * under dem. Det tredje kriteriet er det som er igjen, og avgjør resten.
 */
export interface Sortering {
  forst: Gruppekriterium
  deretter: Kriterium
}

export const STANDARDSORTERING: Sortering = { forst: 'kategori', deretter: 'tid' }

/** Nøkkelen sorteringen lagres under i brukerinnstillingene. */
export const SORTERINGSNOKKEL = 'ideer.sortering'

/** Alle tre kriteriene i rekkefølge. */
export function kriterierFor(sortering: Sortering): [Kriterium, Kriterium, Kriterium] {
  const tredje = KRITERIER.find((k) => k !== sortering.forst && k !== sortering.deretter)!
  return [sortering.forst, sortering.deretter, tredje]
}

/**
 * Et nytt førstekriterium. Står andrekriteriet på det samme, flyttes det til
 * det som var førstekriteriet, så de to bare bytter plass.
 */
export function velgForst(sortering: Sortering, forst: Gruppekriterium): Sortering {
  return { forst, deretter: sortering.deretter === forst ? sortering.forst : sortering.deretter }
}

/** Kriteriene som kan stå som nummer to når `forst` er valgt. */
export function andrevalg(forst: Gruppekriterium): Kriterium[] {
  return KRITERIER.filter((k) => k !== forst)
}

/** En lagret sortering, eller standarden når den mangler eller er ugyldig. */
export function lesSortering(verdi: unknown): Sortering {
  if (!erObjekt(verdi)) return STANDARDSORTERING
  const { forst, deretter } = verdi
  const gyldigForst = (GRUPPEKRITERIER as readonly unknown[]).includes(forst)
  const gyldigDeretter = (KRITERIER as readonly unknown[]).includes(deretter) && deretter !== forst
  return gyldigForst && gyldigDeretter ? { forst: forst as Gruppekriterium, deretter: deretter as Kriterium } : STANDARDSORTERING
}

/** En overskrift i lista, med idéene under den. */
export interface Idegruppe {
  kriterium: Gruppekriterium
  /** Kategorien eller bruker-ID-en. */
  nokkel: string
  navn: string
  ideer: Ide[]
}

type Profiloppslag = ReadonlyMap<string, Pick<Profil, 'first_name' | 'last_name' | 'username'>>

const SAMMENLIGN = new Intl.Collator('nb', { sensitivity: 'base', numeric: true })

function brukernavn(id: string, profiler: Profiloppslag): string {
  const profil = profiler.get(id)
  return profil ? visningsnavn(profil) : ''
}

/** Sammenligningen for hvert kriterium. Tiden står med de nyeste først. */
function sammenligning(kriterium: Kriterium, profiler: Profiloppslag): (a: Ide, b: Ide) => number {
  switch (kriterium) {
    case 'kategori': {
      // En idé uten kategori (en gruppeidé) står sist.
      const plass = (i: Ide) => (i.kategori ? KATEGORIER.indexOf(i.kategori) : KATEGORIER.length)
      return (a, b) => plass(a) - plass(b)
    }
    case 'tid':
      return (a, b) => Date.parse(b.opprettet_kl) - Date.parse(a.opprettet_kl)
    case 'bruker':
      return (a, b) =>
        SAMMENLIGN.compare(brukernavn(a.forfatter_id, profiler), brukernavn(b.forfatter_id, profiler)) ||
        a.forfatter_id.localeCompare(b.forfatter_id)
  }
}

/**
 * Idéene under overskriftene. Med kategori først står alle kategoriene, også
 * de uten idéer; med bruker først står hver bruker som har skrevet noe.
 */
export function grupperIdeer(ideer: readonly Ide[], sortering: Sortering, profiler: Profiloppslag): Idegruppe[] {
  const sammenligninger = kriterierFor(sortering).map((k) => sammenligning(k, profiler))
  const sortert = [...ideer].sort((a, b) => {
    for (const s of sammenligninger) {
      const r = s(a, b)
      if (r !== 0) return r
    }
    return a.id.localeCompare(b.id)
  })

  if (sortering.forst === 'kategori') {
    return KATEGORIER.map((kategori) => ({
      kriterium: 'kategori',
      nokkel: kategori,
      navn: KATEGORINAVN[kategori],
      ideer: sortert.filter((i) => i.kategori === kategori),
    }))
  }

  const grupper = new Map<string, Idegruppe>()
  for (const ide of sortert) {
    const gruppe = grupper.get(ide.forfatter_id)
    if (gruppe) gruppe.ideer.push(ide)
    else grupper.set(ide.forfatter_id, { kriterium: 'bruker', nokkel: ide.forfatter_id, navn: brukernavn(ide.forfatter_id, profiler) || 'Ukjent bruker', ideer: [ide] })
  }
  return [...grupper.values()]
}
