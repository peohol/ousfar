import { GRUPPEOPPGAVESTATUSNAVN } from '../../grupper/oppgaver'
import {
  KATEGORINAVN,
  OPPGAVESTATUSNAVN,
  oppgavekode,
  type Gruppeoppgavestatus,
  type Idekategori,
  type Oppgavestatus,
} from '../../ideer/modell'

/**
 * Kategorien som merke, i samme toner som typemerkene i endringsloggen: fag
 * og funksjonalitet har hver sin farge, «annet» er nøytralt med kantlinje.
 */
const TONE: Record<Idekategori, string> = {
  fag: 'fag',
  funksjonalitet: 'funksjon',
  annet: 'omfang',
}

/** Ingenting for en idé uten kategori (en gruppeidé). */
export function Kategorimerke({ kategori }: { kategori: Idekategori | null }) {
  if (!kategori) return null
  return <span className={`loggmerke loggmerke--${TONE[kategori]}`}>{KATEGORINAVN[kategori]}</span>
}

/**
 * Statusen til en planlagt oppgave: et nøytralt merke med en farget prikk —
 * rød før arbeidet er begynt, gul når det er påbegynt, grønn når den er klar
 * til implementering og blå mens en agent håndterer den. Teksten sier alltid
 * det samme som fargen.
 */
export function Oppgavestatusmerke({ status }: { status: Oppgavestatus }) {
  return (
    <span className="statusmerke" data-status={status}>
      {OPPGAVESTATUSNAVN[status]}
    </span>
  )
}

/** Statusen til en oppgave i en gruppe, i samme form: rød, gul og grønn prikk. */
export function Gruppeoppgavestatusmerke({ status }: { status: Gruppeoppgavestatus }) {
  return (
    <span className="statusmerke" data-status={status}>
      {GRUPPEOPPGAVESTATUSNAVN[status]}
    </span>
  )
}

/** Nummeret oppgaven omtales med, som «OPG-007». */
export function Oppgavekode({ nummer }: { nummer: number }) {
  return <span className="oppgavekode">{oppgavekode(nummer)}</span>
}
