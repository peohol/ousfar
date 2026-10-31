/**
 * Funnene fra kildeovervåkingen slik administratorene ser dem i appen
 * (P12.1, `docs/verktøy-p12-overvaking.md` §5): Adminmeny har en prikk når et
 * funn venter på en faglig beslutning, når siste kontroll stoppet, eller når
 * kontrollen ikke har kjørt på over en uke, og vinduet «Kildeovervåking»
 * viser funnene, fristene og vurderingene.
 *
 * Funnene og vurderingene står i databasen (`public.kildefunn`); tilgangen
 * avgjøres der. Ingenting her endrer, godkjenner eller sperrer en regel.
 */
import type { Databasekall } from '../../legemiddeldata/lager'
import type { Berort, Funnart, Funnkilde, Funnprioritet, Grunnlagsdel } from './modell'

/**
 * Fristene i timer fra funnet kom: for den tekniske vurderingen, og for den
 * faglige beslutningen når funnet har høy prioritet. Prosessfrister, ikke
 * kliniske verdier.
 */
export const FRISTER = { teknisk: 24, faglig: 72 } as const

/** Kontrollen går hver uke; har den ikke meldt seg på så lenge, er noe galt. */
export const UTEBLITT_ETTER_TIMER = 8 * 24

/** Et funn som krever ny faglig vurdering, med vurderingene. */
export interface Kildefunn {
  id: number
  /** Overvåkingens stabile nøkkel, som `dokument:keks-2016`. */
  funn: string
  kilde: Funnkilde
  art: Funnart
  prioritet: Funnprioritet
  prove: boolean
  etikett: string
  detaljer: string[]
  berorte: Berort[]
  opprettet_kl: string
  sist_sett_kl: string | null
  /** Kontrollen av delen fant ikke funnet igjen. */
  borte_kl: string | null
  /** Funnet med samme nøkkel denne raden avløste. */
  erstatter: number | null
  erstattet_kl: string | null
  teknisk_vurdering: string | null
  teknisk_av: string | null
  teknisk_kl: string | null
  beslutning: string | null
  beslutning_av: string | null
  beslutning_kl: string | null
}

export interface Kildekjoring {
  id: number
  kjort_kl: string
  utlost: 'cron' | 'manuell'
  prove: boolean
  grunnlag: Grunnlagsdel[]
  feil: string[]
  informative: { id: string; kilde: Funnkilde; art: Funnart; etikett: string }[]
  lenke: string | null
}

export interface Kildeovervaking {
  funn: Kildefunn[]
  kjoringer: Kildekjoring[]
  /** Den siste kjøringen som ikke var en prøve. */
  siste: Kildekjoring | null
}

export const erApen = (f: Pick<Kildefunn, 'beslutning_kl' | 'erstattet_kl'>) => !f.beslutning_kl && !f.erstattet_kl

const timerSiden = (iso: string, na: number) => (na - Date.parse(iso)) / 3_600_000

/** Hva som mangler for et åpent funn, og om fristen for det er passert. */
export function fristene(f: Kildefunn, na: number): { teknisk: 'gjort' | 'venter' | 'over_fristen'; faglig: 'venter' | 'over_fristen' } {
  const timer = timerSiden(f.opprettet_kl, na)
  return {
    teknisk: f.teknisk_kl ? 'gjort' : timer >= FRISTER.teknisk ? 'over_fristen' : 'venter',
    faglig: f.prioritet === 'hoy' && timer >= FRISTER.faglig ? 'over_fristen' : 'venter',
  }
}

/** Hvor mange åpne funn som venter, og hvor mange er over en frist; `null` når ingen venter. */
export function funnSomVenter(o: Pick<Kildeovervaking, 'funn'>, na: number): string | null {
  const apne = o.funn.filter(erApen)
  if (apne.length === 0) return null
  const over = apne.filter((f) => Object.values(fristene(f, na)).includes('over_fristen')).length
  return `${apne.length} funn venter på faglig beslutning${over > 0 ? `, ${over} over fristen` : ''}`
}

/** Når kontrollen ikke har meldt seg som den skal, eller siste kjøring stoppet; ellers `null`. */
export function kontrollstatus(o: Pick<Kildeovervaking, 'siste'>, na: number): string | null {
  if (!o.siste) return 'kildeovervåkingen har ikke kjørt ennå'
  if (timerSiden(o.siste.kjort_kl, na) > UTEBLITT_ETTER_TIMER) return 'kildeovervåkingen har ikke kjørt på over en uke'
  if (o.siste.feil.length > 0) return 'siste kildekontroll stoppet'
  return null
}

/**
 * Det en administrator bør ta stilling til, i korte setninger: tomt når
 * ingenting venter. Det samme gir prikken i Adminmeny og teksten ved den.
 */
export const oppmerksomhet = (o: Kildeovervaking, na: number): string[] => [funnSomVenter(o, na), kontrollstatus(o, na)].filter((t): t is string => t !== null)

export interface Kildeovervakingslager {
  les(historikk?: number): Promise<Kildeovervaking>
  vurder(funn: number, vurdering: string): Promise<void>
  beslutt(funn: number, beslutning: string): Promise<void>
}

const FORM = 'Kildeovervåkingen har en form appen ikke kjenner.'

/** Svaret fra databasen; en annen form avvises, så ingen funn forsvinner i stillhet. */
export function lesKildeovervaking(x: unknown): Kildeovervaking {
  const o = x as Partial<Kildeovervaking> | null
  if (!o || !Array.isArray(o.funn) || !Array.isArray(o.kjoringer)) throw new Error(FORM)
  for (const f of o.funn) {
    if (typeof f?.id !== 'number' || typeof f.funn !== 'string' || typeof f.etikett !== 'string' || !Array.isArray(f.detaljer) || !Array.isArray(f.berorte)) throw new Error(FORM)
  }
  return { funn: o.funn, kjoringer: o.kjoringer, siste: o.siste ?? null }
}

export function lagKildeovervakingslager(kall: Databasekall): Kildeovervakingslager {
  return {
    les: async (historikk = 20) => lesKildeovervaking(await kall('les_kildeovervaking', { historikk })),
    vurder: async (funn, vurdering) => {
      await kall('vurder_kildefunn', { funn, vurdering })
    },
    beslutt: async (funn, beslutning) => {
      await kall('beslutt_kildefunn', { funn, beslutning })
    },
  }
}
