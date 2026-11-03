/**
 * Den tekniske loggen for kildeovervåkingen (VDR-1, `docs/verktøy-p12-overvaking.md`
 * §5): sakene med tilstand, konklusjon, tiltak og hendelser, og kjøringene. Den
 * er for teknisk ansvarlig og kontrollører; den faglige redaktøren ser bare
 * `fagsak.ts`. Det finnes ingen tidsfrister.
 *
 * Sakene står i databasen (`public.kildefunn`); tilgangen avgjøres der.
 * Ingenting her endrer, godkjenner eller sperrer en regel.
 */
import type { Databasekall } from '../../legemiddeldata/lager'
import type { Berort, Funnart, Funnkilde, Funnprioritet, Grunnlagsdel } from './modell'

/** Kontrollen går hver uke; har den ikke meldt seg på så lenge, er noe galt. */
export const UTEBLITT_ETTER_TIMER = 8 * 24

/** Hvor saken står: agentens spor, redaktørens spor, eller avsluttet. */
export type Sakstilstand = 'teknisk_utredning' | 'uavklart' | 'faglig_gjennomgang' | 'beslutning' | 'oppfolging' | 'avsluttet'

export const TILSTANDSTEKST: Record<Sakstilstand, string> = {
  teknisk_utredning: 'Teknisk utredning',
  uavklart: 'Teknisk uavklart',
  faglig_gjennomgang: 'Faglig gjennomgang',
  beslutning: 'Venter på faglig beslutning',
  oppfolging: 'Oppfølging pågår',
  avsluttet: 'Avsluttet',
}

export type Saksutfall = 'teknisk_avklart' | 'ikke_funnet_igjen' | 'tiltak_kontrollert' | 'prove' | 'avlost' | 'tidligere_beslutning'

export const UTFALLSTEKST: Record<Saksutfall, string> = {
  teknisk_avklart: 'teknisk avklart uten faglig betydning',
  ikke_funnet_igjen: 'kilden stemte igjen med grunnlaget',
  tiltak_kontrollert: 'tiltakene er utført og kontrollert',
  prove: 'prøven er fullført',
  avlost: 'avløst av et nyere funn',
  tidligere_beslutning: 'avsluttet med en faglig beslutning (før kildesakene)',
}

/** Et funn som sak, med det tekniske sporet. */
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
  /** Saken med samme nøkkel denne kom etter. */
  erstatter: number | null
  tilstand: Sakstilstand
  versjon: number
  alvor: 'faglig' | 'sikkerhet'
  konklusjon: 'uten_faglig_betydning' | 'uavklart' | 'faglig_relevant' | 'mulig_alvorlig_risiko' | 'dekket_av_beslutning' | null
  konklusjon_tekst: string | null
  konklusjon_kl: string | null
  /** Kilden har fått nytt innhold etter at saken ble vurdert faglig. */
  nytt_innhold_kl: string | null
  utfall: Saksutfall | null
  avsluttet_kl: string | null
  /** Fritekstene fra P12.1-modellen, som står urørt. */
  teknisk_vurdering: string | null
  teknisk_av: string | null
  beslutning: string | null
  beslutning_av: string | null
  tiltak: { id: number; art: string; regel: string | null; status: string; lenke: string | null; bevis: string | null; endret_kl: string }[]
  hendelser: { kl: string; art: string; fra: string | null; til: string | null; av: string | null }[]
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

export const erApen = (f: Pick<Kildefunn, 'tilstand'>) => f.tilstand !== 'avsluttet'

const timerSiden = (iso: string, na: number) => (na - Date.parse(iso)) / 3_600_000

/** Når kontrollen ikke har meldt seg som den skal, eller siste kjøring stoppet; ellers `null`. Et driftsforhold, ikke en faglig sak. */
export function kontrollstatus(o: Pick<Kildeovervaking, 'siste'>, na: number): string | null {
  if (!o.siste) return 'kildeovervåkingen har ikke kjørt ennå'
  if (timerSiden(o.siste.kjort_kl, na) > UTEBLITT_ETTER_TIMER) return 'kildeovervåkingen har ikke kjørt på over en uke'
  if (o.siste.feil.length > 0) return 'siste kildekontroll stoppet'
  return null
}

export interface Kildeovervakingslager {
  les(historikk?: number): Promise<Kildeovervaking>
}

const FORM = 'Kildeovervåkingen har en form appen ikke kjenner.'

/** Svaret fra databasen; en annen form avvises, så ingen funn forsvinner i stillhet. */
export function lesKildeovervaking(x: unknown): Kildeovervaking {
  const o = x as Partial<Kildeovervaking> | null
  if (!o || !Array.isArray(o.funn) || !Array.isArray(o.kjoringer)) throw new Error(FORM)
  for (const f of o.funn) {
    if (typeof f?.id !== 'number' || typeof f.funn !== 'string' || typeof f.etikett !== 'string' || typeof f.tilstand !== 'string' || !Array.isArray(f.detaljer) || !Array.isArray(f.berorte) || !Array.isArray(f.tiltak) || !Array.isArray(f.hendelser)) throw new Error(FORM)
  }
  return { funn: o.funn, kjoringer: o.kjoringer, siste: o.siste ?? null }
}

export function lagKildeovervakingslager(kall: Databasekall): Kildeovervakingslager {
  return { les: async (historikk = 20) => lesKildeovervaking(await kall('les_kildeovervaking', { historikk })) }
}
