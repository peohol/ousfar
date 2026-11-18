/**
 * Endringsforslagene (P5, docs/redaktorer-og-forslag.md): formen dataene har,
 * lesingen av det databasen svarer (`les_mine_forslag`, `les_forslag`) og
 * tekstene statusene vises med. Alt her er rene funksjoner; kallene står i
 * `api.ts`, og reglene databasen håndhever, i migrasjonen
 * `*_p5_endringsforslag.sql`.
 *
 * Verdier som ikke har formen, blir tomme i stedet for å velte visningen, som
 * ellers i appen (`src/ideer/lesing.ts`).
 */
import { erObjekt, tall, tallEllerNull, tekst, tekstEllerNull } from '../ideer/lesing'

export const FORSLAGSSTATUSER = [
  'ny',
  'under_behandling',
  'venter_pa_forslagsstiller',
  'godkjent',
  'innarbeidet',
  'avvist',
  'trukket',
] as const
export type Forslagsstatus = (typeof FORSLAGSSTATUSER)[number]

/** Statusene der forslaget ikke er avgjort ennå. */
export const APNE_STATUSER: ReadonlySet<Forslagsstatus> = new Set(['ny', 'under_behandling', 'venter_pa_forslagsstiller'])

/** Statusen slik forslagsstilleren leser den, med fargen merket har. */
export const STATUSVISNING: Readonly<Record<Forslagsstatus, { tekst: string; tone: 'noytral' | 'info' | 'advarsel' | 'ok' | 'feil' }>> = {
  ny: { tekst: 'Sendt', tone: 'noytral' },
  under_behandling: { tekst: 'Under behandling', tone: 'info' },
  venter_pa_forslagsstiller: { tekst: 'Venter på svar fra deg', tone: 'advarsel' },
  godkjent: { tekst: 'Godkjent, ikke publisert ennå', tone: 'ok' },
  innarbeidet: { tekst: 'Arbeidet inn i utkastet', tone: 'ok' },
  avvist: { tekst: 'Avvist', tone: 'feil' },
  trukket: { tekst: 'Trukket tilbake', tone: 'noytral' },
}

/** Statusen slik den som behandler forslaget leser den, der den skiller seg fra forslagsstillerens. */
export const BEHANDLERS_STATUSTEKST: Readonly<Partial<Record<Forslagsstatus, string>>> = {
  ny: 'Ny',
  venter_pa_forslagsstiller: 'Venter på forslagsstilleren',
}

export const HENDELSESARTER = [
  'opprettet',
  'kommentar',
  'presisering_bedt',
  'presisering',
  'tatt',
  'godkjent',
  'avvist',
  'trukket',
  'innarbeidet',
  'konflikt_sett',
] as const
export type Hendelsesart = (typeof HENDELSESARTER)[number]

/** Hva hver hendelse heter i tidslinjen. */
export const HENDELSESTEKST: Readonly<Record<Hendelsesart, string>> = {
  opprettet: 'Sendte forslaget',
  kommentar: 'Kommenterte',
  presisering_bedt: 'Ba om en presisering',
  presisering: 'Svarte',
  tatt: 'Tok forslaget til behandling',
  godkjent: 'Godkjente forslaget',
  avvist: 'Avviste forslaget',
  trukket: 'Trakk forslaget tilbake',
  innarbeidet: 'Arbeidet forslaget inn i utkastet',
  konflikt_sett: 'Så at innholdet var endret siden forslaget ble skrevet',
}

/** Ressurstypene et forslag kan gjelde, slik de heter for leseren. */
export const RESSURSTYPENAVN: Readonly<Record<string, string>> = {
  infoside: 'Fagside',
  intervallregelsett: 'Fortolkning',
  scenarioregelsett: 'Fortolkning',
  thc_regelsett: 'Fortolkning',
}

/** Ressursen (fagsiden eller regelsettet) slik databasen beskriver den (`intern.ressursbeskrivelse`). */
export interface Forslagsressurs {
  id: string
  type: string
  navn: string
  /** Stoffets nøkkel, for en fagside. */
  stoff: string | null
  /** Analyttkoden, for et regelsett. */
  analyttkode: string | null
  omfang: string
}

/** En person i forslaget: navnet bare når profilen er synlig for den som leser. */
export interface Forslagsperson {
  er_meg: boolean
  navn: string | null
}

export interface Forslagskilde {
  tekst?: string
  lenke?: string
  referanse?: string
  /** Tittelen på referansen, når den kan leses. */
  referansetittel?: string | null
}

export interface Forslagshendelse {
  id: number
  art: Hendelsesart
  tekst: string | null
  utfort_av: Forslagsperson | null
  utfort_kl: string
  data: Record<string, unknown>
}

export interface Forslagskonflikt {
  grunnrevisjon: number
  publisert_revisjon: number | null
  endret_siden: boolean
  sideversjon: number | null
  publisert_sideversjon: number | null
  side_endret_siden: boolean
  /** Bare for den som kan behandle forslaget; ellers `null`. */
  utkast_endret: boolean | null
}

/** Ett forslag i «Mine forslag». */
export interface Forslagsrad {
  id: string
  status: Forslagsstatus
  ressurs: Forslagsressurs
  element_id: string | null
  sted: string | null
  sammendrag: string
  opprettet_kl: string
  oppdatert_kl: string
  venter_pa_meg: boolean
}

/** Ett forslag med tidslinjen (`les_forslag`). */
export interface Forslag {
  id: string
  status: Forslagsstatus
  ressurs: Forslagsressurs
  element: { id: string; type: string } | null
  grunnrevisjon: number
  sideversjon: number | null
  sted: string | null
  utdrag: string | null
  forslag: string
  begrunnelse: string
  kilder: Forslagskilde[]
  opprettet_kl: string
  oppdatert_kl: string
  stilt_av: Forslagsperson | null
  behandler: Forslagsperson | null
  vedtak: { av: Forslagsperson | null; kl: string; begrunnelse: string | null } | null
  innarbeidet: { objekt: string; revisjon: number } | null
  hendelser: Forslagshendelse[]
  er_mitt: boolean
  kan_behandle: boolean
  kan_trekke: boolean
  kan_svare: boolean
  konflikt: Forslagskonflikt
}

const status = (verdi: unknown): Forslagsstatus =>
  (FORSLAGSSTATUSER as readonly unknown[]).includes(verdi) ? (verdi as Forslagsstatus) : 'ny'

const art = (verdi: unknown): Hendelsesart =>
  (HENDELSESARTER as readonly unknown[]).includes(verdi) ? (verdi as Hendelsesart) : 'kommentar'

export function lesRessurs(verdi: unknown): Forslagsressurs {
  const r = erObjekt(verdi) ? verdi : {}
  return {
    id: tekst(r.id),
    type: tekst(r.type),
    navn: tekst(r.navn) || tekst(r.analyttkode) || tekst(r.stoff),
    stoff: tekstEllerNull(r.stoff),
    analyttkode: tekstEllerNull(r.analyttkode),
    omfang: tekst(r.omfang),
  }
}

export function lesPerson(verdi: unknown): Forslagsperson | null {
  if (!erObjekt(verdi)) return null
  return { er_meg: verdi.er_meg === true, navn: tekstEllerNull(verdi.navn) }
}

function lesKilde(verdi: unknown): Forslagskilde | null {
  if (!erObjekt(verdi)) return null
  const kilde: Forslagskilde = {}
  if (typeof verdi.tekst === 'string') kilde.tekst = verdi.tekst
  if (typeof verdi.lenke === 'string') kilde.lenke = verdi.lenke
  if (typeof verdi.referanse === 'string') kilde.referanse = verdi.referanse
  if ('referansetittel' in verdi) kilde.referansetittel = tekstEllerNull(verdi.referansetittel)
  return kilde
}

const liste = <T>(verdi: unknown, les: (v: unknown) => T | null): T[] =>
  Array.isArray(verdi) ? verdi.map(les).filter((v): v is T => v !== null) : []

export function lesForslagsrader(verdi: unknown): Forslagsrad[] {
  return liste(verdi, (v) => {
    if (!erObjekt(v) || typeof v.id !== 'string') return null
    return {
      id: v.id,
      status: status(v.status),
      ressurs: lesRessurs(v.ressurs),
      element_id: tekstEllerNull(v.element_id),
      sted: tekstEllerNull(v.sted),
      sammendrag: tekst(v.sammendrag),
      opprettet_kl: tekst(v.opprettet_kl),
      oppdatert_kl: tekst(v.oppdatert_kl),
      venter_pa_meg: v.venter_pa_meg === true,
    }
  })
}

function lesKonflikt(verdi: unknown): Forslagskonflikt {
  const k = erObjekt(verdi) ? verdi : {}
  return {
    grunnrevisjon: tall(k.grunnrevisjon),
    publisert_revisjon: tallEllerNull(k.publisert_revisjon),
    endret_siden: k.endret_siden === true,
    sideversjon: tallEllerNull(k.sideversjon),
    publisert_sideversjon: tallEllerNull(k.publisert_sideversjon),
    side_endret_siden: k.side_endret_siden === true,
    utkast_endret: typeof k.utkast_endret === 'boolean' ? k.utkast_endret : null,
  }
}

export function lesForslag(verdi: unknown): Forslag | null {
  if (!erObjekt(verdi) || typeof verdi.id !== 'string') return null
  const v = verdi as Record<string, unknown> & { id: string }
  const element = erObjekt(v.element) ? { id: tekst(v.element.id), type: tekst(v.element.type) } : null
  const vedtak = erObjekt(v.vedtak)
    ? { av: lesPerson(v.vedtak.av), kl: tekst(v.vedtak.kl), begrunnelse: tekstEllerNull(v.vedtak.begrunnelse) }
    : null
  const innarbeidet = erObjekt(v.innarbeidet) ? { objekt: tekst(v.innarbeidet.objekt), revisjon: tall(v.innarbeidet.revisjon) } : null
  return {
    id: v.id,
    status: status(v.status),
    ressurs: lesRessurs(v.ressurs),
    element,
    grunnrevisjon: tall(v.grunnrevisjon),
    sideversjon: tallEllerNull(v.sideversjon),
    sted: tekstEllerNull(v.sted),
    utdrag: tekstEllerNull(v.utdrag),
    forslag: tekst(v.forslag),
    begrunnelse: tekst(v.begrunnelse),
    kilder: liste(v.kilder, lesKilde),
    opprettet_kl: tekst(v.opprettet_kl),
    oppdatert_kl: tekst(v.oppdatert_kl),
    stilt_av: lesPerson(v.stilt_av),
    behandler: lesPerson(v.behandler),
    vedtak,
    innarbeidet,
    hendelser: liste(v.hendelser, (h) =>
      erObjekt(h)
        ? {
            id: tall(h.id),
            art: art(h.art),
            tekst: tekstEllerNull(h.tekst),
            utfort_av: lesPerson(h.utfort_av),
            utfort_kl: tekst(h.utfort_kl),
            data: erObjekt(h.data) ? h.data : {},
          }
        : null,
    ),
    er_mitt: v.er_mitt === true,
    kan_behandle: v.kan_behandle === true,
    kan_trekke: v.kan_trekke === true,
    kan_svare: v.kan_svare === true,
    konflikt: lesKonflikt(v.konflikt),
  }
}

/** Hvem som gjorde noe, slik det står i tidslinjen. */
export function personnavn(person: Forslagsperson | null, ellers: string): string {
  if (!person) return ellers
  if (person.er_meg) return 'Du'
  return person.navn ?? ellers
}

/* --- Det som foreslås ------------------------------------------------------ */

/** Grensene databasen har, så skjemaet kan si fra før det sendes. */
export const GRENSER = { forslag: 8000, begrunnelse: 4000, sted: 200, utdrag: 2000, kilder: 10, kildetekst: 500, svar: 4000 } as const

/**
 * Det et forslag gjelder, slik stedet det åpnes fra vet det: ressursen og
 * eventuelt elementet, revisjonen forslagsstilleren ser, og hvor det står.
 */
export interface Forslagsmal {
  ressurs: string
  /** Kortet eller kommentaren, eller `null` for ressursen som helhet. */
  element: string | null
  /** Den publiserte revisjonen av elementet (eller ressursen) som vises. */
  grunnrevisjon: number
  /** Hvor, i ord: «Bupropion · Farmakokinetikk · Halveringstid». */
  sted: string
  /** Teksten slik den står, når den kan siteres. */
  utdrag?: string | null
}

/** Et valg for hva forslaget gjelder, når stedet har flere (en fagside med kortene, et regelsett med kommentarene). */
export interface Forslagsvalg extends Forslagsmal {
  /** Teksten i valglista. */
  etikett: string
}

/** En kilde slik den skrives i skjemaet. */
export interface Kildeutkast {
  tekst: string
  lenke: string
  referanse: string
}

export const TOM_KILDE: Kildeutkast = { tekst: '', lenke: '', referanse: '' }

/** Kildene slik databasen tar imot dem: uten tomme felt, og uten kilder som er helt tomme. */
export function kilderTilLagring(kilder: readonly Kildeutkast[]): Forslagskilde[] {
  return kilder
    .map((k) => ({ tekst: k.tekst.trim(), lenke: k.lenke.trim(), referanse: k.referanse }))
    .filter((k) => k.tekst || k.lenke || k.referanse)
    .map((k) => ({ ...(k.tekst && { tekst: k.tekst }), ...(k.lenke && { lenke: k.lenke }), ...(k.referanse && { referanse: k.referanse }) }))
}

/** Feilen i kildene skjemaet kan se selv, med kilden den gjelder, eller `null`. Databasen kontrollerer dem på nytt. */
export function finnKildefeil(kilder: readonly Kildeutkast[]): { melding: string; indeks: number | null } | null {
  if (kilderTilLagring(kilder).length > GRENSER.kilder) return { melding: `Et forslag kan ha høyst ${GRENSER.kilder} kilder.`, indeks: null }
  const lenke = kilder.findIndex((k) => k.lenke.trim() && !/^https:\/\/\S+$/i.test(k.lenke.trim()))
  if (lenke >= 0) return { melding: 'En lenke må begynne med https:// og kan ikke ha mellomrom.', indeks: lenke }
  const tekst = kilder.findIndex((k) => k.tekst.trim().length > GRENSER.kildetekst)
  if (tekst >= 0) return { melding: `Teksten til en kilde kan være høyst ${GRENSER.kildetekst} tegn.`, indeks: tekst }
  return null
}

/** Bare meldingen fra {@link finnKildefeil}. */
export function kildefeil(kilder: readonly Kildeutkast[]): string | null {
  return finnKildefeil(kilder)?.melding ?? null
}

/** Sitatet slik det sendes: forkortet til grensen, med «…» når det er kuttet. */
export function utdragTilLagring(utdrag: string | null | undefined): string | null {
  const ren = (utdrag ?? '').replace(/\s+\n/g, '\n').trim()
  if (!ren) return null
  return ren.length > GRENSER.utdrag ? `${ren.slice(0, GRENSER.utdrag - 1).trimEnd()}…` : ren
}

/**
 * Det som oppfyller `forst`, øverst, ellers i samme rekkefølge som før: som
 * forslagene som venter på den innloggede, foran resten (D6).
 */
export function forst<T>(rader: readonly T[], viktig: (rad: T) => boolean): T[] {
  return [...rader.filter(viktig), ...rader.filter((rad) => !viktig(rad))]
}
