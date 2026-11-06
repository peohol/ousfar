/**
 * Vernet rundt nettleserkontrollene (`appkontroll.ts`, P0-driveren og andre
 * som starter appen i en automatisert nettleser): hvilken database de treffer,
 * og hvor mye de får belaste den.
 *
 * Bakgrunnen er 6.11.2026, da to slike kjøringer mot den publiserte appen ga
 * om lag 17 500 kall mot produksjonsdatabasen på under tre timer og presset den
 * over minnegrensen (`docs/qa-testmiljo.md`). Derfor:
 *
 * - **Lokalt er standard.** Kontrollen starter appen på maskinen mot en egen,
 *   lokal Supabase-database (`lokalmiljo.ts`).
 * - **Produksjon må velges uttrykkelig** (`QA_PRODUKSJON=ja` og `APP_URL`).
 *   Enhver adresse utenfor maskinen regnes som produksjon, også
 *   forhåndsvisninger på Vercel, fordi de bruker den samme databasen. Den har faste
 *   tak: forløp, kall, nye forsøk, pause mellom forløpene og varighet. Taket
 *   kan senkes med miljøvariabler, aldri heves.
 * - **Overbelastning stopper kjøringen**: et svar med 5xx, et kall som venter
 *   lenger enn grensen, eller for mange kall. Resten av kjøringen avbrytes da,
 *   i stedet for å prøve igjen.
 *
 * Modulen er ren logikk uten nettleser, så den prøves i `trafikkvakt.test.ts`.
 * Koblingen til Playwright står i `testmiljo.ts`.
 */

export type Modus = 'lokal' | 'produksjon'

/** Vertene som regnes som lokale. Alt annet er produksjon. */
const LOKALE_VERTER = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

export const erLokal = (url: string): boolean => LOKALE_VERTER.has(new URL(url).hostname)

/** Om en adresse går til Supabase i skyen, altså til produksjonsdatabasen. */
export const erSupabaseISkyen = (url: string): boolean => /(^|\.)supabase\.co$/.test(new URL(url).hostname)

export interface Grenser {
  /** Forløp per kjøring. */
  forlop: number
  /** Kall mot databasen (Supabase) per kjøring. */
  kall: number
  /** Nye forsøk på et forløp som feilet fordi siden ikke lastet. */
  nyeForsok: number
  /** Minste pause mellom to forløp, i millisekunder. */
  pauseMs: number
  /** Et kall mot databasen som venter lenger enn dette, stopper kjøringen. */
  tregtKallMs: number
  /** Hele kjøringen, i millisekunder. */
  varighetMs: number
}

/**
 * Taket i produksjon. Et vanlig forløp i verktøyene er én innlasting av
 * appen, om lag 30 kall; med de tunge bakgrunnslesingene blokkert
 * (`BLOKKERT_I_PRODUKSJON`) gir taket god plass til seks forløp, men ikke til
 * en full gjennomkjøring. Den hører hjemme lokalt.
 */
export const PRODUKSJONSGRENSER: Readonly<Grenser> = {
  forlop: 6,
  kall: 400,
  nyeForsok: 0,
  pauseMs: 15_000,
  tregtKallMs: 5_000,
  varighetMs: 15 * 60_000,
}

/** Lokalt er det ingen tak utover nye forsøk når siden ikke lastet. */
export const LOKALE_GRENSER: Readonly<Grenser> = {
  forlop: Infinity,
  kall: Infinity,
  nyeForsok: 2,
  pauseMs: 0,
  tregtKallMs: Infinity,
  varighetMs: Infinity,
}

/** Miljøvariabelen som senker hver grense. */
const GRENSEVARIABLER: Readonly<Record<keyof Grenser, string>> = {
  forlop: 'QA_MAKS_FORLOP',
  kall: 'QA_MAKS_KALL',
  nyeForsok: 'QA_MAKS_NYE_FORSOK',
  pauseMs: 'QA_PAUSE_MS',
  tregtKallMs: 'QA_TREGT_KALL_MS',
  varighetMs: 'QA_MAKS_VARIGHET_MS',
}

/** Svaret som slår på produksjonsmodus. */
export const PRODUKSJONSSVAR = 'ja'

type Miljo = Readonly<Record<string, string | undefined>>

/** Hvor en kjøring går: det lokale testmiljøet, eller den publiserte appen på `url`. */
export type Mal = { modus: 'lokal' } | { modus: 'produksjon'; url: string }

/**
 * Lokalt med mindre `QA_PRODUKSJON=ja`. `APP_URL` alene velger ikke
 * produksjonen, fordi skymiljøet har den satt til den publiserte appen for
 * andre formål; med `QA_PRODUKSJON=ja` er det den som kontrolleres.
 */
export function malFor(miljo: Miljo): Mal {
  const svar = miljo.QA_PRODUKSJON?.trim().toLowerCase()
  if (!svar) return { modus: 'lokal' }
  if (svar !== PRODUKSJONSSVAR) throw new Error(`QA_PRODUKSJON må være «${PRODUKSJONSSVAR}» eller stå tom (fikk «${miljo.QA_PRODUKSJON}»).`)
  const url = miljo.APP_URL?.trim().replace(/\/$/, '')
  if (!url) throw new Error('QA_PRODUKSJON=ja krever APP_URL, adressen til den publiserte appen.')
  if (erLokal(url)) throw new Error(`QA_PRODUKSJON=ja gjelder den publiserte appen, ikke ${url}. Uten QA_PRODUKSJON startes det lokale testmiljøet.`)
  return { modus: 'produksjon', url }
}

/**
 * Grensene for modusen. I produksjon kan en miljøvariabel bare senke en
 * grense, unntatt pausen, som bare kan bli lengre; et ugyldig tall gir feil.
 */
export function grenserFor(modus: Modus, miljo: Miljo): Grenser {
  if (modus === 'lokal') return { ...LOKALE_GRENSER }
  const grenser = { ...PRODUKSJONSGRENSER }
  for (const [nokkel, variabel] of Object.entries(GRENSEVARIABLER) as [keyof Grenser, string][]) {
    const tekst = miljo[variabel]
    if (tekst === undefined || tekst === '') continue
    const verdi = Number(tekst)
    if (!Number.isFinite(verdi) || verdi < 0) throw new Error(`${variabel} må være et tall, 0 eller større (fikk «${tekst}»).`)
    grenser[nokkel] = nokkel === 'pauseMs' ? Math.max(grenser[nokkel], verdi) : Math.min(grenser[nokkel], verdi)
  }
  return grenser
}

/**
 * Lesingene appen gjør i bakgrunnen for fagsøket, og som verktøyene ikke
 * bruker. `les_stoffer` alene skrev om lag 80 MB midlertidige filer per kall i
 * databasen 6.11.2026. I produksjon blokkeres de i nettleseren, så de aldri
 * når databasen.
 */
export const BLOKKERT_I_PRODUKSJON: readonly string[] = [
  'les_stoffer',
  'les_preparatsok',
  'les_interaksjonssok',
  'les_farmakogenetikk_sok',
  'les_cpic',
  'les_laboratoriesok',
]

/** Om kallet skal blokkeres i produksjon: et RPC-kall til en av {@link BLOKKERT_I_PRODUKSJON}. */
export function blokkeresIProduksjon(url: string): boolean {
  const funksjon = /\/rest\/v1\/rpc\/([a-z0-9_]+)$/.exec(new URL(url).pathname)?.[1]
  return funksjon !== undefined && BLOKKERT_I_PRODUKSJON.includes(funksjon)
}

/** Kjøringen ble stoppet av vernet. Fanges ikke som en feil i ett forløp. */
export class Teststopp extends Error {
  override name = 'Teststopp'
}

export interface Trafikkrapport {
  modus: Modus
  forlop: number
  kall: number
  blokkert: number
  feil5xx: number
  tregeste: number
  stoppet: string | null
}

/**
 * Teller og vurderer kallene mot databasen i én kjøring. Nettleserhendelsene
 * kommer utenfor skriptets egen flyt, så et brudd settes som {@link stoppet};
 * neste {@link nyttForlop} kaster da {@link Teststopp}, og `testmiljo.ts`
 * avbryter alle nye kall i mellomtiden.
 */
export class Trafikkvakt {
  readonly modus: Modus
  readonly grenser: Grenser
  private readonly na: () => number
  private readonly start: number
  private forlopene = 0
  private sisteForlop = -Infinity
  private kallene = 0
  private blokkerte = 0
  private feil5xx = 0
  private tregeste = 0
  private readonly ventende = new Map<unknown, number>()
  stoppet: string | null = null

  constructor(modus: Modus, grenser: Grenser, na: () => number = Date.now) {
    this.modus = modus
    this.grenser = grenser
    this.na = na
    this.start = na()
  }

  /** Setter stoppet med den første grunnen; senere grunner endrer den ikke. */
  stopp(grunn: string): void {
    this.stoppet ??= grunn
  }

  /** Et kall mot databasen er sendt. `nokkel` er det samme som gis til {@link svar}. */
  kall(nokkel: unknown): void {
    this.kallene += 1
    this.ventende.set(nokkel, this.na())
    if (this.kallene > this.grenser.kall) this.stopp(`mer enn ${this.grenser.kall} kall mot databasen`)
  }

  /** Et kall som ble blokkert før det nådde databasen. */
  blokkert(): void {
    this.blokkerte += 1
  }

  /** Svaret på et kall, med statuskoden. */
  svar(nokkel: unknown, status: number): void {
    const ms = this.ferdig(nokkel)
    if (status >= 500) {
      this.feil5xx += 1
      this.stopp(`databasen svarte ${status}${ms === undefined ? '' : ` etter ${Math.round(ms)} ms`}`)
    }
  }

  /** Et kall som ble avbrutt uten svar (for eksempel av at siden lastes på nytt). */
  avbrutt(nokkel: unknown): void {
    this.ferdig(nokkel)
  }

  private ferdig(nokkel: unknown): number | undefined {
    const sendt = this.ventende.get(nokkel)
    if (sendt === undefined) return undefined
    this.ventende.delete(nokkel)
    const ms = this.na() - sendt
    this.tregeste = Math.max(this.tregeste, ms)
    if (ms > this.grenser.tregtKallMs) this.stopp(`et kall mot databasen tok ${Math.round(ms)} ms (grense ${this.grenser.tregtKallMs} ms)`)
    return ms
  }

  /** Ser etter kall som fortsatt venter for lenge, og om kjøringen har vart for lenge. Kalles jevnlig. */
  kontroller(): void {
    const na = this.na()
    for (const sendt of this.ventende.values())
      if (na - sendt > this.grenser.tregtKallMs) this.stopp(`et kall mot databasen har ventet i mer enn ${this.grenser.tregtKallMs} ms`)
    if (na - this.start > this.grenser.varighetMs) this.stopp(`kjøringen har vart i mer enn ${Math.round(this.grenser.varighetMs / 60_000)} min`)
  }

  /**
   * Et nytt forløp skal begynne. Kaster {@link Teststopp} når kjøringen er
   * stoppet eller forløpene er brukt opp; ellers hvor lenge det må ventes
   * først, i millisekunder.
   */
  nyttForlop(): number {
    this.kontroller()
    if (this.stoppet) throw new Teststopp(`Kjøringen er stoppet: ${this.stoppet}.`)
    if (this.forlopene >= this.grenser.forlop)
      throw new Teststopp(`Kjøringen er stoppet: høyst ${this.grenser.forlop} forløp i ${this.modus === 'produksjon' ? 'produksjon' : 'denne kjøringen'}.`)
    this.forlopene += 1
    const vent = Math.max(0, this.sisteForlop + this.grenser.pauseMs - this.na())
    this.sisteForlop = this.na() + vent
    return vent
  }

  rapport(): Trafikkrapport {
    return {
      modus: this.modus,
      forlop: this.forlopene,
      kall: this.kallene,
      blokkert: this.blokkerte,
      feil5xx: this.feil5xx,
      tregeste: Math.round(this.tregeste),
      stoppet: this.stoppet,
    }
  }
}

/** Rapporten i én linje, til slutten av kjøringen. */
export function trafikklinje(r: Trafikkrapport): string {
  return (
    `Trafikk (${r.modus}): ${r.forlop} forløp, ${r.kall} kall mot databasen, ${r.blokkert} blokkert, ` +
    `${r.feil5xx} svar med 5xx, tregeste kall ${r.tregeste} ms.` +
    (r.stoppet ? ` Stoppet: ${r.stoppet}.` : '')
  )
}
