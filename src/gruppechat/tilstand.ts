/**
 * Sammenflettingen av det klienten vet om chatten (docs/gruppechat.md,
 * «Sanntiden»). Meldingene kan komme flere ganger og i hvilken som helst
 * rekkefølge: fra den første siden, fra eldre sider, fra endringene
 * dørklokken utløser, og fra svaret på det brukeren selv sender. Reglene her
 * gjør at resultatet blir det samme uansett:
 *
 * - én melding per `id`; en versjon med høyere `endring` erstatter en med
 *   lavere, og en eldre versjon som kommer for sent, overses;
 * - lista er sortert etter `nr`;
 * - en ventende melding forsvinner når meldingen med samme `klient_id` står
 *   i lista;
 * - endringstelleren flytter bare framover, og bare med svarene som faktisk
 *   dekker alt fram til den (den første siden og endringene, ikke eldre
 *   sider eller enkeltsvar);
 * - meldinger som har passert lagringstiden, fjernes når endringene sier
 *   hvor fristen går (`frist`, i direktesamtalene).
 *
 * Alt her er rene funksjoner; `kontroller.ts` bruker dem.
 */
import type { Chatendringer, Chatside, Gruppemelding, Ventende } from './modell'

export interface Meldingstilstand {
  /** Stigende etter `nr`, uten duplikater. */
  meldinger: Gruppemelding[]
  ventende: Ventende[]
  /** Alt med `endring` til og med denne er sett. */
  sisteEndring: number
  flereEldre: boolean
}

export const TOM_MELDINGSTILSTAND: Meldingstilstand = { meldinger: [], ventende: [], sisteEndring: 0, flereEldre: false }

const etterNr = (a: Gruppemelding, b: Gruppemelding) => a.nr - b.nr || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

/**
 * Fletter `nye` inn i `liste`. Med `fraNr` tas bare meldinger fra og med det
 * nummeret med, når de ikke står der fra før: en endret melding eldre enn det
 * som er hentet, ville ellers stått alene over et hull i samtalen. Den hentes
 * i riktig versjon når eldre meldinger hentes.
 */
export function flettMeldinger(
  liste: readonly Gruppemelding[],
  nye: readonly Gruppemelding[],
  fraNr: number | null = null,
): Gruppemelding[] {
  if (nye.length === 0) return liste as Gruppemelding[]
  const kart = new Map(liste.map((m) => [m.id, m]))
  let endret = false
  for (const ny of nye) {
    const har = kart.get(ny.id)
    if (har ? ny.endring <= har.endring : fraNr !== null && ny.nr < fraNr) continue
    kart.set(ny.id, ny)
    endret = true
  }
  return endret ? [...kart.values()].sort(etterNr) : (liste as Gruppemelding[])
}

/** De ventende som ikke er bekreftet av en melding i lista. */
export function ubekreftede(ventende: readonly Ventende[], meldinger: readonly Gruppemelding[]): Ventende[] {
  if (ventende.length === 0) return ventende as Ventende[]
  const bekreftet = new Set(meldinger.map((m) => m.klient_id).filter((id): id is string => id !== null))
  const igjen = ventende.filter((v) => !bekreftet.has(v.klient_id))
  return igjen.length === ventende.length ? (ventende as Ventende[]) : igjen
}

/** Nummeret på den eldste meldingen som er hentet, eller `null` uten meldinger. */
export function eldsteNr(t: Meldingstilstand): number | null {
  return t.meldinger[0]?.nr ?? null
}

function medMeldinger(t: Meldingstilstand, meldinger: Gruppemelding[], sisteEndring = t.sisteEndring): Meldingstilstand {
  if (meldinger === t.meldinger && sisteEndring === t.sisteEndring) return t
  return { ...t, meldinger, sisteEndring, ventende: ubekreftede(t.ventende, meldinger) }
}

/** Den første siden (de nyeste meldingene). Det som alt er hentet, står, i den nyeste versjonen. */
export function medForsteSide(t: Meldingstilstand, side: Chatside): Meldingstilstand {
  const fraNr = t.meldinger.length > 0 && t.flereEldre ? eldsteNr(t) : null
  const meldinger = flettMeldinger(t.meldinger, side.meldinger, fraNr)
  const forste = t.meldinger.length === 0
  return {
    ...medMeldinger(t, meldinger, Math.max(t.sisteEndring, side.siste_endring)),
    flereEldre: forste ? side.flere_eldre : t.flereEldre,
  }
}

/**
 * En side med eldre meldinger, lagt foran. Endringstelleren flyttes ikke: siden
 * sier ingenting om hva som har skjedd med de nyere meldingene.
 */
export function medEldre(t: Meldingstilstand, side: Chatside): Meldingstilstand {
  return { ...medMeldinger(t, flettMeldinger(t.meldinger, side.meldinger)), flereEldre: side.flere_eldre }
}

/** Meldingene skrevet fra og med `frist`; uten frist alle. */
function innenFristen(meldinger: Gruppemelding[], frist?: string): Gruppemelding[] {
  if (frist === undefined) return meldinger
  const grense = Date.parse(frist)
  const igjen = meldinger.filter((m) => !(Date.parse(m.skrevet_kl) < grense))
  return igjen.length === meldinger.length ? meldinger : igjen
}

/** Endringene siden `sisteEndring`, uten meldingene som har passert lagringstiden (`frist`). */
export function medEndringer(t: Meldingstilstand, e: Chatendringer): Meldingstilstand {
  const fraNr = t.flereEldre ? eldsteNr(t) : null
  return medMeldinger(t, innenFristen(flettMeldinger(t.meldinger, e.meldinger, fraNr), e.frist), Math.max(t.sisteEndring, e.siste_endring))
}

/** Én melding fra et svar (sendt, endret, slettet). Endringstelleren flyttes ikke. */
export function medMelding(t: Meldingstilstand, melding: Gruppemelding): Meldingstilstand {
  return medMeldinger(t, flettMeldinger(t.meldinger, [melding]))
}
