/**
 * Faglige saker fra kildeovervåkingen slik en faglig redaktør ser dem (VDR-2 i
 * `docs/verktøy-omlegging-2026-11.md` §4 og §6): bare når et konkret faglig
 * spørsmål eller en reell sikkerhetsrisiko gjenstår, aldri for en endret
 * kontrollsum alene. Tekniske avvik undersøkes og avsluttes i det tekniske
 * sporet (VDR-1) og når ikke redaktøren.
 *
 * Hver sak svarer på seks spørsmål før noe kan bekreftes: hva som er endret,
 * hvilke anbefalinger det berører, hvorfor det er faglig relevant, hvilken
 * beslutning som anbefales, hvilke valg som finnes, og hva som faktisk skjer
 * etter hvert valg. En registrert beslutning er ikke et utført tiltak: saken
 * står som «Oppfølging pågår» til hvert tiltak er utført og kontrollert, og
 * først da som avsluttet.
 *
 * Ingen kontrollsummer, fingeravtrykk eller interne nøkler hører hjemme her;
 * de ligger i det tekniske sporet. `id` og `versjon` brukes bare av appen og
 * vises aldri.
 */
import type { Databasekall } from '../../legemiddeldata/lager'

/** Hvor saken står: venter på en faglig beslutning, følges opp, eller er avsluttet. */
export type Saksfase = 'beslutning' | 'oppfolging' | 'avsluttet'

/**
 * `sikkerhet`: en konkret, troverdig risiko for en eksisterende plan.
 * `faglig`: et faglig spørsmål uten påvist uforsvarlig beregning.
 */
export type Saksalvor = 'faglig' | 'sikkerhet'

/** Beslutningene en redaktør kan ta; bare de som er faglig og teknisk mulige i saken, tilbys. */
export type Beslutningsvalg = 'behold' | 'revider' | 'deaktiver' | 'utsett'

export const VALGTITTEL: Record<Beslutningsvalg, string> = {
  behold: 'Behold godkjent regel',
  revider: 'Be om revidert anbefaling',
  deaktiver: 'Deaktiver berørt regel',
  utsett: 'Utsett beslutningen',
}

/** Et tiltak etter beslutningen: bestilt, under arbeid, utført, kontrollert, eller stoppet. */
export type Tiltaksstatus = 'bestilt' | 'pagar' | 'utfort' | 'kontrollert' | 'feilet'

export const TILTAKSTEKST: Record<Tiltaksstatus, string> = {
  bestilt: 'Bestilt',
  pagar: 'Under arbeid',
  utfort: 'Utført, venter på kontroll',
  kontrollert: 'Utført og kontrollert',
  feilet: 'Stoppet, følges opp',
}

/** En anbefaling i verktøyene saken berører: regelen og versjonen som er godkjent, og hva i den som treffes. */
export interface Berortanbefaling {
  regel: string
  versjon: number
  /** Hva i anbefalingen endringen gjelder, med vanlige ord. */
  hva: string
}

/** Hva ett valg vil gjøre, sagt før det bekreftes. */
export interface Valgmulighet {
  valg: Beslutningsvalg
  /** Det OUSFAR gjør med en gang beslutningen er registrert. Tomt når ingenting skjer straks. */
  na: string[]
  /** Det som deretter må gjøres og kontrolleres før saken kan avsluttes. */
  deretter: string[]
  /** Hvordan verktøyet virker for klinikerne mens saken følges opp. */
  verktoyet: string
}

export interface Tiltak {
  tekst: string
  status: Tiltaksstatus
  endret_kl: string
  /** Lenke til endringen, når det finnes en. */
  lenke: string | null
}

export interface Fagsak {
  id: string
  /** Øker ved hver endring; en beslutning på en eldre versjon avvises. */
  versjon: number
  fase: Saksfase
  alvor: Saksalvor
  /** En syntetisk prøve, uten klinisk betydning. */
  prove: boolean
  /** Saken i én setning, som overskrift. */
  tittel: string
  /** 1. Hva som konkret er endret, faglig, med egne ord (aldri kildetekst). */
  endring: string
  kilde: { navn: string; lenke: string | null; sammenlignet_kl: string | null }
  /** 2. Anbefalingene det kan påvirke. */
  berorte: Berortanbefaling[]
  /** 3. Hvorfor det er faglig relevant. */
  relevans: string
  /**
   * 4. Beslutningen som anbefales, og hvorfor. `null`, med tomme `valg`, bare
   * for en sikkerhetssak der spørsmålet ennå er under faglig vurdering.
   */
  anbefaling: { valg: Beslutningsvalg; begrunnelse: string; av: string } | null
  /** 5 og 6. Valgene som finnes, og hva hvert av dem vil gjøre (`na` og `deretter` lages av databasen ut fra valget). */
  valg: Valgmulighet[]
  /** Hvordan verktøyet virker for klinikerne akkurat nå. */
  status_na: string
  opprettet_kl: string
  beslutning: { valg: Beslutningsvalg; merknad: string | null; av: string; kl: string } | null
  tiltak: Tiltak[]
  avsluttet: { kl: string; utfall: Utfall } | null
}

/** Hvorfor en sak er avsluttet: tiltakene er utført og kontrollert, eller den var en prøve. */
export type Utfall = 'tiltak_kontrollert' | 'prove'

export const UTFALLTEKST: Record<Utfall, string> = {
  tiltak_kontrollert: 'tiltakene er utført og kontrollert',
  prove: 'prøven er gjennomført og dokumentert',
}

/** En sikkerhetssak der spørsmålet ennå er under faglig vurdering: ingenting å velge, men nødstoppen er tilgjengelig. */
export const underVurdering = (s: Pick<Fagsak, 'anbefaling' | 'valg'>) => s.anbefaling === null && s.valg.length === 0

/** Det tekniske sporet i én tilstand, uten detaljer: redaktøren skal ikke gjøre noe med det. */
export type Tekniskspor = 'normal' | 'oppfolging' | 'ukjent'

export interface Redaktoroversikt {
  saker: Fagsak[]
  teknisk: Tekniskspor
  sist_kontrollert_kl: string | null
}

/** Svaret på en beslutning: registrert, eller avvist fordi saken er endret siden den ble lest. */
export type Beslutningssvar = 'registrert' | 'endret'

export interface Fagsaklager {
  les(): Promise<Redaktoroversikt>
  beslutt(sak: string, versjon: number, valg: Beslutningsvalg, merknad: string | null): Promise<Beslutningssvar>
}

/** Saken venter på at redaktøren bestemmer seg (en utsatt beslutning venter fortsatt). */
export const venter = (s: Pick<Fagsak, 'fase'>) => s.fase === 'beslutning'

/** Tiltakene som ennå ikke er utført og kontrollert. */
export const gjenstaende = (s: Pick<Fagsak, 'tiltak'>) => s.tiltak.filter((t) => t.status !== 'kontrollert')

/**
 * Det en redaktør bør ta stilling til, i korte setninger: tomt når ingenting
 * venter. Prøver og saker som følges opp, gir ingen prikk; tekniske avvik
 * heller ikke.
 */
export function redaktorvarsel(o: Pick<Redaktoroversikt, 'saker'>): string[] {
  const reelle = o.saker.filter((s) => venter(s) && !s.prove)
  const vurderes = reelle.filter(underVurdering).length
  const besluttes = reelle.length - vurderes
  return [
    besluttes > 0 && `${besluttes === 1 ? 'Én faglig sak venter' : `${besluttes} faglige saker venter`} på beslutning`,
    vurderes > 0 && `${vurderes === 1 ? 'Et sikkerhetsproblem' : `${vurderes} sikkerhetsproblemer`} under faglig vurdering`,
  ].filter((t): t is string => typeof t === 'string')
}

/** Først sikkerhet, så det som venter, så det som følges opp, så avsluttede; nyeste først innen hver. */
export function sorterSaker(saker: readonly Fagsak[]): Fagsak[] {
  const fase: Record<Saksfase, number> = { beslutning: 0, oppfolging: 1, avsluttet: 2 }
  return [...saker].sort(
    (a, b) => fase[a.fase] - fase[b.fase] || Number(b.alvor === 'sikkerhet') - Number(a.alvor === 'sikkerhet') || b.opprettet_kl.localeCompare(a.opprettet_kl),
  )
}

const FORM = 'De faglige sakene har en form appen ikke kjenner.'
const FASER: readonly string[] = ['beslutning', 'oppfolging', 'avsluttet']
const VALG: readonly string[] = Object.keys(VALGTITTEL)
const TILTAK: readonly string[] = Object.keys(TILTAKSTEKST)
const SPOR: readonly string[] = ['normal', 'oppfolging', 'ukjent']

const tekst = (x: unknown) => typeof x === 'string' && x.trim().length > 0
const tekster = (x: unknown) => Array.isArray(x) && x.every(tekst)

/** Om saken har alt redaktøren skal se før noe kan bekreftes; ellers vises den ikke som en sak som kan besluttes. */
function erFagsak(s: Partial<Fagsak> | null | undefined): s is Fagsak {
  if (!s || !tekst(s.id) || typeof s.versjon !== 'number' || !FASER.includes(s.fase as string)) return false
  if (s.alvor !== 'faglig' && s.alvor !== 'sikkerhet') return false
  if (![s.tittel, s.endring, s.relevans, s.status_na, s.opprettet_kl].every(tekst) || !tekst(s.kilde?.navn)) return false
  if (!Array.isArray(s.berorte) || !s.berorte.every((b) => tekst(b?.regel) && typeof b.versjon === 'number' && tekst(b.hva))) return false
  if (!Array.isArray(s.valg) || !s.valg.every((v) => VALG.includes(v?.valg) && tekster(v.na) && tekster(v.deretter) && tekst(v.verktoyet))) return false
  if (new Set(s.valg.map((v) => v.valg)).size !== s.valg.length) return false
  if (s.anbefaling === null || s.anbefaling === undefined) {
    // Uten anbefaling og valg bare for en sikkerhetssak som ennå vurderes; ellers mangler grunnlaget for beslutningen.
    if (s.alvor !== 'sikkerhet' || s.valg.length > 0) return false
  } else if (!s.valg.some((v) => v.valg === s.anbefaling!.valg) || !tekst(s.anbefaling.begrunnelse) || !tekst(s.anbefaling.av)) return false
  if (s.fase === 'beslutning' && s.valg.length === 0 && s.alvor !== 'sikkerhet') return false
  if (!Array.isArray(s.tiltak) || !s.tiltak.every((t) => tekst(t?.tekst) && TILTAK.includes(t.status) && tekst(t.endret_kl))) return false
  if (s.beslutning && !VALG.includes(s.beslutning.valg)) return false
  // En sak med tiltak som ikke er kontrollert, kan ikke stå som avsluttet.
  if (s.fase === 'avsluttet' && (!s.avsluttet || !(s.avsluttet.utfall in UTFALLTEKST) || gjenstaende(s as Fagsak).length > 0)) return false
  return true
}

/**
 * Svaret fra databasen. En annen form avvises, så ingen sak forsvinner i
 * stillhet eller vises uten grunnlaget og konsekvensene.
 */
export function lesRedaktoroversikt(x: unknown): Redaktoroversikt {
  const o = x as Partial<Redaktoroversikt> | null
  if (!o || !Array.isArray(o.saker) || !SPOR.includes(o.teknisk as string)) throw new Error(FORM)
  if (!o.saker.every((s) => erFagsak(s as Partial<Fagsak>))) throw new Error(FORM)
  return { saker: o.saker, teknisk: o.teknisk!, sist_kontrollert_kl: o.sist_kontrollert_kl ?? null }
}

/**
 * Lageret mot databasen. Navnene på funksjonene avtales med VDR-1, som eier
 * datamodellen; vinduet tar bare imot et `Fagsaklager`.
 */
export function lagFagsaklager(kall: Databasekall): Fagsaklager {
  return {
    les: async () => lesRedaktoroversikt(await kall('les_fagsaker', {})),
    beslutt: async (sak, versjon, valg, merknad) => ((await kall('beslutt_fagsak', { sak, versjon, valg, merknad })) === 'endret' ? 'endret' : 'registrert'),
  }
}
