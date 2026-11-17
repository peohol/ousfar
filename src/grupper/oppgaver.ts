/**
 * Oppgavene i en gruppe: formen dataene har, navnene på statusene og
 * prioritetene, og lesingen av det databasen svarer
 * (`gruppeoppgaveoversikt`, `gruppeoppgave`). Rene funksjoner; kallene står i
 * `api.ts`, og reglene databasen håndhever, i migrasjonen
 * `*_gruppeideer_og_gruppeoppgaver.sql` og i docs/fagmiljoer.md, «Idéer og
 * oppgaver i gruppene».
 *
 * Gruppeoppgavene har ingenting med de planlagte oppgavene å gjøre: de får
 * ikke OPG-nummer, går ikke til agentene og lager verken saker eller endringer
 * i GitHub (`src/ideer/oppgaver.ts`).
 */
import type { Riktekstdokument } from '../faginnhold/riktekst'
import { GRUPPEOPPGAVESTATUSER, type Gruppeoppgavestatus } from '../ideer/modell'
import { erObjekt, tall, tekst, tekstEllerNull } from '../ideer/lesing'
import { rensInnleggstekst } from '../traad/modell'
import { enAv, liste } from './modell'

export { GRUPPEOPPGAVESTATUSER, type Gruppeoppgavestatus }

export const GRUPPEOPPGAVESTATUSNAVN: Readonly<Record<Gruppeoppgavestatus, string>> = {
  ikke_paabegynt: 'Ikke påbegynt',
  paagaar: 'Pågår',
  fullfort: 'Fullført',
}

/** Prioritetene, den høyeste først. Samme verdier som `gruppeoppgaver_prioritet` i databasen. */
export const PRIORITETER = ['hoy', 'normal', 'lav'] as const
export type Prioritet = (typeof PRIORITETER)[number]

export const PRIORITETSNAVN: Readonly<Record<Prioritet, string>> = {
  hoy: 'Høy',
  normal: 'Normal',
  lav: 'Lav',
}

/** Lengste overskrift. Samme grense som i databasen. */
export const GRUPPEOPPGAVETITTEL_MEST = 140

/** En oppgave i gruppen, med det den innloggede kan gjøre med den. */
export interface Gruppeoppgave {
  id: string
  gruppe_id: string
  tittel: string
  beskrivelse: Riktekstdokument | null
  /** Den som har oppgaven, eller `null` når ingen har den. */
  ansvarlig_id: string | null
  /** Usant når den som har oppgaven, ikke lenger er med i gruppen. */
  ansvarlig_har_tilgang: boolean
  prioritet: Prioritet
  status: Gruppeoppgavestatus
  /** Den som skrev idéen oppgaven kom fra; `null` uten idé, eller når kontoen er slettet. */
  foreslatt_av: string | null
  /** Den som opprettet oppgaven, eller gjorde idéen om til den. */
  opprettet_av: string | null
  opprettet_kl: string
  endret_kl: string | null
  status_kl: string
  fullfort_kl: string | null
  /** Idéen oppgaven kom fra, med kommentarene som står der. */
  ide: { id: string; tittel: string; kommentarer: number } | null
  /** Endre, tildele og fjerne: de ansvarlige i gruppen. */
  kan_endre: boolean
  /** Sette status: de ansvarlige, og den som har oppgaven. */
  kan_sette_status: boolean
  /** Når oppgaven ble lest (bare fra `gruppeoppgave()`): varslene fram til da merkes lest. */
  lest_kl: string | null
}

/** Svaret fra `gruppeoppgaveoversikt`: oppgavene, de uferdige først og etter prioritet. */
export interface Gruppeoppgaveliste {
  kan_opprette: boolean
  oppgaver: Gruppeoppgave[]
}

export const INGEN_GRUPPEOPPGAVER: Gruppeoppgaveliste = { kan_opprette: false, oppgaver: [] }

export function lesGruppeoppgave(verdi: unknown): Gruppeoppgave | null {
  if (!erObjekt(verdi) || !tekst(verdi.id) || !tekst(verdi.gruppe_id)) return null
  const status = enAv(GRUPPEOPPGAVESTATUSER, verdi.status)
  if (!status) return null
  const ide = erObjekt(verdi.ide) && tekst(verdi.ide.id)
    ? { id: tekst(verdi.ide.id), tittel: tekst(verdi.ide.tittel), kommentarer: tall(verdi.ide.kommentarer) }
    : null
  return {
    id: tekst(verdi.id),
    gruppe_id: tekst(verdi.gruppe_id),
    tittel: tekst(verdi.tittel),
    beskrivelse: verdi.beskrivelse == null ? null : rensInnleggstekst(verdi.beskrivelse),
    ansvarlig_id: tekstEllerNull(verdi.ansvarlig_id),
    ansvarlig_har_tilgang: verdi.ansvarlig_har_tilgang === true,
    prioritet: enAv(PRIORITETER, verdi.prioritet) ?? 'normal',
    status,
    foreslatt_av: tekstEllerNull(verdi.foreslatt_av),
    opprettet_av: tekstEllerNull(verdi.opprettet_av),
    opprettet_kl: tekst(verdi.opprettet_kl),
    endret_kl: tekstEllerNull(verdi.endret_kl),
    status_kl: tekst(verdi.status_kl),
    fullfort_kl: tekstEllerNull(verdi.fullfort_kl),
    ide,
    kan_endre: verdi.kan_endre === true,
    kan_sette_status: verdi.kan_sette_status === true,
    lest_kl: tekstEllerNull(verdi.lest_kl),
  }
}

export function lesGruppeoppgaveliste(verdi: unknown): Gruppeoppgaveliste {
  if (!erObjekt(verdi)) return INGEN_GRUPPEOPPGAVER
  return { kan_opprette: verdi.kan_opprette === true, oppgaver: liste(verdi.oppgaver, lesGruppeoppgave) }
}

/** Oppgavene den innloggede har og ikke har fullført, i lista sin rekkefølge. */
export function mineGruppeoppgaver(oppgaver: readonly Gruppeoppgave[], meg: string): Gruppeoppgave[] {
  return oppgaver.filter((o) => o.ansvarlig_id === meg && o.status !== 'fullfort')
}
