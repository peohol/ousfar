/**
 * Korte faglige varsler på akkurat de regelversjonene en kildesak berører
 * (VDR-1/VDR-3, `docs/verktøy-omlegging-2026-11.md` §4): «Under faglig
 * gjennomgang» og lignende, satt av agenten når en sak er i det faglige sporet.
 * Aldri for en endret kontrollsum alene, aldri for en prøve.
 *
 * Et varsel sperrer ingenting. Sperrene leses for seg (`sperrer.ts`), og en
 * lesing av varslene som feiler, stopper ikke beregningen.
 */
import type { Databasekall } from '../../legemiddeldata/lager'

export interface Regelvarsel {
  regel: string
  versjon: number
  tekst: string
  /** Når varselet ble satt (ISO). */
  siden: string
}

const erVarsel = (x: unknown): x is Regelvarsel => {
  const v = x as Partial<Regelvarsel> | null
  return !!v && typeof v.regel === 'string' && Number.isInteger(v.versjon) && typeof v.tekst === 'string' && v.tekst.trim().length > 0 && typeof v.siden === 'string'
}

/** Feilen når svaret ikke har formen varslene skal ha. */
export const UGYLDIGE_REGELVARSLER = 'Svaret med faglige varsler har en ukjent form.'

/**
 * Svaret fra databasen. Har svaret eller ett av varslene en annen form, kastes
 * det: da er det ukjent om det finnes varsler, og det skal sies fra, ikke
 * vises som om det ikke fantes noen.
 */
export function lesRegelvarsler(x: unknown): Regelvarsel[] {
  if (!Array.isArray(x) || !x.every(erVarsel)) throw new Error(UGYLDIGE_REGELVARSLER)
  return x
}

/** Varslene for nøyaktig den regelversjonen verktøyet bruker; et varsel for en annen versjon gjelder ikke. */
export const varslerFor = (varsler: readonly Regelvarsel[], regel: string, versjon: number): Regelvarsel[] =>
  varsler.filter((v) => v.regel === regel && v.versjon === versjon)

export interface Regelvarsellager {
  les(): Promise<Regelvarsel[]>
}

export function lagRegelvarsellager(kall: Databasekall): Regelvarsellager {
  return { les: async () => lesRegelvarsler(await kall('les_regelvarsler', {})) }
}
