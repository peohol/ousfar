import { FORBINDELSER, type Forbindelsesregister } from '../kjemi/forbindelser'

/**
 * Plassene for datakortene i «Viktige data» på en fagside: sidens egne, og en
 * for hver forbindelse som har egne datakort for stoffet i
 * forbindelsesregisteret (`datakort` i `src/data/forbindelser.ts`:
 * O-desmetyltramadol på tramadolsiden).
 *
 * Datakortene hører bare til fagsiden. Fortolkningen leser dem ikke, og
 * laboratorienes analyttkoder avgjør ikke hvilke plasser siden har
 * (`docs/domener.md`): plassene kommer av forbindelsesregisteret og kortene
 * siden har.
 */

/** En plass for datakortene i «Viktige data»: sidens egne, eller dem for en forbindelse. */
export interface Datakorteier {
  /** Forbindelsen kortene gjelder (`data.gjelder`), eller `null` for sidens egne. */
  gjelder: string | null
  /** Navnet kortene merkes med når siden har kort for flere. */
  navn: string
}

/**
 * Plassene for datakortene på et stoffs fagside: sidens egne først, så en for
 * hver forbindelse med egne datakort for stoffet, i registerets
 * rekkefølge og merket med navnet der, og til sist en for hver annen
 * forbindelse siden har kort for.
 */
export function datakorteiere({
  stoff,
  stoffnavn,
  kortnokler,
  forbindelser = FORBINDELSER,
}: {
  stoff: string
  stoffnavn: string
  /** `gjelder` på kortene siden har. */
  kortnokler: readonly (string | null)[]
  forbindelser?: Forbindelsesregister
}): Datakorteier[] {
  const egne = forbindelser
    .forStoff(stoff)
    .filter((f) => f.stoffer.some((s) => s.stoff === stoff && s.datakort))
    .map((f) => f.nokkel)
  const ellers = [...new Set(kortnokler.flatMap((k) => k ?? []))]
    .filter((k) => !egne.includes(k))
    .sort((a, b) => a.localeCompare(b, 'nb'))
  const andre = [...egne, ...ellers]
  return [
    { gjelder: null, navn: stoffnavn },
    ...andre.map((gjelder) => ({ gjelder, navn: forbindelser.finn(gjelder)?.navn ?? gjelder })),
  ]
}
