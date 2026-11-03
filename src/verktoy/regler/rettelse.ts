/**
 * Rettelse av et kildefaktum som allerede vurderte regler viser til.
 *
 * Et faktum i en felles byggestein (`bygg.ts`) inngår i fingeravtrykket til
 * hver regel som viser til det. Rettes faktumet direkte i byggesteinen, kan de
 * tidligere vurderingene av reglene ikke lenger etterprøves mot innholdet de
 * gjaldt. Derfor bygges reglene fortsatt med faktumet slik det stod, slik at
 * godkjenninger og disposisjoner registreres og kontrolleres mot nøyaktig den
 * versjonen kontrolløren så. Etterpå gir `rett` hver regel som viser til det
 * gamle faktumet, en ny versjon med det rettede: faktumet byttes, versjonen
 * økes med én, og historikken får stegene utkast og til faglig kontroll for
 * den nye versjonen. Ingenting annet i regelen endres, og de tidligere stegene
 * står urørt. Den nye versjonen er ikke godkjent før den er kontrollert på
 * nytt (`docs/verktøy-p12-regelforvaltning.md` §2–3).
 */
import { steg } from './bygg'
import { fingeravtrykk, kanonisk } from './godkjenning'
import { henvisninger, type Kildehenvisning, type Regel } from './modell'

export interface Faktumrettelse {
  /** Faktumet slik reglene ble vurdert med det. */
  fra: Kildehenvisning
  /** Faktumet eller faktaene som erstatter det, i rekkefølge. */
  til: readonly Kildehenvisning[]
  dato: string
  /** Hvorfor faktumet er rettet, og hvem som har vurdert rettelsen; står i utkaststeget for den nye versjonen. */
  grunn: string
}

const TIL_KONTROLL = 'Sendt til uavhengig faglig kontroll av den nye versjonen. Ikke klinisk godkjent.'

const lik = (a: Kildehenvisning, b: Kildehenvisning) => kanonisk(a) === kanonisk(b)
const erHenvisning = (x: unknown): x is Kildehenvisning => henvisninger(x)[0] === x

/** `x` med hver forekomst av `fra` byttet med `til`; en henvisning står alltid i en liste. */
function bytt<T>(x: T, r: Faktumrettelse, sti: string): T {
  if (Array.isArray(x)) return x.flatMap((y, i) => (erHenvisning(y) && lik(y, r.fra) ? r.til.map((t) => ({ ...t })) : [bytt(y, r, `${sti}[${i}]`)])) as T
  if (!x || typeof x !== 'object' || x instanceof RegExp) return x
  if (erHenvisning(x) && lik(x, r.fra)) throw new Error(`Faktumet på ${sti} står ikke i en liste over henvisninger og kan ikke rettes automatisk.`)
  return Object.fromEntries(Object.entries(x).map(([k, y]) => [k, bytt(y, r, `${sti}.${k}`)])) as T
}

/** Ny versjon av regelen med det rettede faktumet; regelen er uendret når den ikke viser til det. */
export function rettRegel(regel: Regel, r: Faktumrettelse): Regel {
  if (!henvisninger(regel).some((h) => lik(h, r.fra))) return regel
  const { godkjenning, ...innhold } = regel
  const versjon = regel.versjon + 1
  const merknad = `${r.grunn} Ellers uendret fra versjon ${regel.versjon} (fingeravtrykk ${fingeravtrykk(regel)}).`
  return {
    ...bytt(innhold, r, regel.id),
    versjon,
    godkjenning: {
      status: 'til_faglig_kontroll',
      historikk: [...godkjenning.historikk, steg('utkast', versjon, merknad, r.dato), steg('til_faglig_kontroll', versjon, TIL_KONTROLL, r.dato)],
    },
  }
}

/** Reglene med alle rettelsene, i rekkefølge. Brukes etter at godkjenninger og disposisjoner er registrert for versjonene som ble vurdert. */
export const rett = (regler: Regel[], rettelser: readonly Faktumrettelse[]): Regel[] => regler.map((x) => rettelser.reduce(rettRegel, x))
