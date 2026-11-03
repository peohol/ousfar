/**
 * Den tekniske vakten for den nattlige FEST-synkroniseringen (F4 i
 * `docs/verktøy-vdr4-tilgjengelighet.md`). Den leser de siste kjøringene
 * (`legemiddeldata_status`) og sier fra til teknisk ansvarlig etter første
 * natt som har feilet, lenge før verktøyene stopper etter 48 timer
 * (`FEST_FORELDET_ETTER_TIMER`). Den skriver ingenting og endrer ikke hva
 * verktøyene eller fagsidene viser; det er bare et varsel.
 *
 * Skriptet `npm run legemiddeldata:vakt` kjører den mot produksjonen, og en
 * planlagt oppgave kjører skriptet hver morgen (`docs/legemiddeldata.md`).
 */
import { FEST_FORELDET_ETTER_TIMER } from './referanser.js'
import type { Synktrinn } from './synk.js'

/** En kjøring slik `legemiddeldata_status` gir den. */
export interface Vaktkjoring {
  id: number
  kilde: string
  status: 'pagar' | 'fullfort' | 'uendret' | 'feilet'
  startet_kl: string
  avsluttet_kl: string | null
  feil: string | null
  trinn?: Synktrinn | null
  ny_fil?: boolean | null
}

export interface Vaktresultat {
  /** `true` når ingenting må følges opp. */
  iOrden: boolean
  /** Det som må følges opp, i klartekst. */
  funn: string[]
  /** Siste vellykkede kontroll mot FEST (`fullfort` eller `uendret`), eller `null`. */
  kontrollertKl: string | null
  /** Når verktøyene slutter å beregne fordi kopien er for gammel, eller `null` når den ikke er kontrollert. */
  verktoyeneStopperKl: string | null
}

/** Uten en vellykket kontroll på så mange timer har minst én natt feilet eller ikke gått. */
export const VAKT_MAKS_TIMER_UTEN_KONTROLL = 26
/** En kjøring som har stått uavsluttet så lenge, har hengt seg opp. */
export const VAKT_MAKS_MINUTTER_PAGAR = 60

const TIME = 3_600_000
const VELLYKKET = new Set(['fullfort', 'uendret'])
const STATUSER = new Set(['pagar', 'fullfort', 'uendret', 'feilet'])

const TRINNTEKST: Record<Synktrinn, string> = {
  kontakt: 'før FEST svarte',
  nedlasting: 'under nedlastingen',
  lesing: 'mens filen ble lest',
  innbytte: 'da dataene skulle byttes inn',
}

const klokkeslett = (iso: string) =>
  new Intl.DateTimeFormat('nb-NO', { timeZone: 'Europe/Oslo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

/** Kjøringene i svaret fra `legemiddeldata_status`; kaster når svaret ikke har formen vakten kjenner, så en endret form aldri leses som «i orden». */
export function lesVaktkjoringer(svar: unknown): Vaktkjoring[] {
  if (!Array.isArray(svar)) throw new Error('Statusen for FEST-kjøringene har en form vakten ikke kjenner.')
  return svar.map((x) => {
    const k = x as Partial<Vaktkjoring> | null
    if (!k || typeof k.id !== 'number' || typeof k.kilde !== 'string' || !STATUSER.has(k.status as string) || typeof k.startet_kl !== 'string' || Number.isNaN(Date.parse(k.startet_kl))) {
      throw new Error('En FEST-kjøring i statusen har en form vakten ikke kjenner.')
    }
    return { id: k.id, kilde: k.kilde, status: k.status!, startet_kl: k.startet_kl, avsluttet_kl: k.avsluttet_kl ?? null, feil: k.feil ?? null, trinn: k.trinn ?? null, ny_fil: k.ny_fil ?? null }
  })
}

/** Hva vakten sier om FEST-kjøringene ved `naa`. */
export function festvakt(alle: readonly Vaktkjoring[], naa: Date): Vaktresultat {
  const kjoringer = alle.filter((k) => k.kilde === 'FEST').sort((a, b) => b.id - a.id)
  const funn: string[] = []
  const siste = kjoringer[0]
  const vellykkede = kjoringer.filter((k) => VELLYKKET.has(k.status) && k.avsluttet_kl)
  const kontrollertKl = vellykkede.reduce<string | null>((x, k) => (x === null || Date.parse(k.avsluttet_kl!) > Date.parse(x) ? k.avsluttet_kl! : x), null)
  const verktoyeneStopperKl = kontrollertKl ? new Date(Date.parse(kontrollertKl) + FEST_FORELDET_ETTER_TIMER * TIME).toISOString() : null

  if (!siste) funn.push('Det finnes ingen FEST-kjøringer i statusen.')
  else if (siste.status === 'feilet') {
    const hvor = siste.trinn ? ` ${TRINNTEKST[siste.trinn]}` : ''
    const fil = siste.ny_fil === true ? ' En ny FEST-fil var oppdaget, men ble ikke lest inn.' : siste.ny_fil === false ? ' Filen var den samme som sist.' : ''
    funn.push(`Siste FEST-kjøring (${klokkeslett(siste.startet_kl)}) feilet${hvor}: ${siste.feil ?? 'ukjent feil'}.${fil}`)
  }
  for (const k of kjoringer.filter((x) => x.status === 'pagar')) {
    if (naa.getTime() - Date.parse(k.startet_kl) > VAKT_MAKS_MINUTTER_PAGAR * 60_000) funn.push(`En FEST-kjøring har stått uavsluttet siden ${klokkeslett(k.startet_kl)}.`)
  }
  if (!kontrollertKl) funn.push('Ingen FEST-kjøring i statusen har gått bra.')
  else if (naa.getTime() - Date.parse(kontrollertKl) > VAKT_MAKS_TIMER_UTEN_KONTROLL * TIME) {
    funn.push(`Ingen FEST-kjøring har gått bra siden ${klokkeslett(kontrollertKl)}.`)
  }
  if (funn.length > 0 && verktoyeneStopperKl) {
    funn.push(
      Date.parse(verktoyeneStopperKl) <= naa.getTime()
        ? `Verktøyene beregner ikke lenger: FEST-kopien ble sist kontrollert ${klokkeslett(kontrollertKl!)}, mer enn ${FEST_FORELDET_ETTER_TIMER} timer siden.`
        : `Verktøyene slutter å beregne ${klokkeslett(verktoyeneStopperKl)} hvis ingen kjøring går bra før da.`,
    )
  }
  return { iOrden: funn.length === 0, funn, kontrollertKl, verktoyeneStopperKl }
}

/**
 * En syntetisk statusliste der siste kjøring har feilet, til prøven av hele
 * varslingen (`--prove`). Den lages i minnet og skrives aldri til databasen.
 */
export function provestatus(naa: Date): Vaktkjoring[] {
  const iGar = new Date(naa.getTime() - 24 * TIME).toISOString()
  return [
    { id: 2, kilde: 'FEST', status: 'feilet', startet_kl: naa.toISOString(), avsluttet_kl: naa.toISOString(), feil: 'PRØVE AV VAKTEN, ingen ekte feil', trinn: 'nedlasting', ny_fil: null },
    { id: 1, kilde: 'FEST', status: 'uendret', startet_kl: iGar, avsluttet_kl: iGar, feil: null },
  ]
}
