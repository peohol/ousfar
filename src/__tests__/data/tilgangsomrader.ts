/**
 * Hvilken del av P2 hver datainngang hører til (docs/p2-0-forberedelse.md,
 * docs/ousfar-nasjonal-p0-kartlegging.md §6.1):
 *
 * - `a` faginnhold og kliniske regler, med de felles kildedataene fagsidene viser;
 * - `b` samhandling og varsler: diskusjoner, idéer, oppgaver, varsler, direktelenker;
 * - `c` profiler og bilder (alt i Supabase sitt `storage`), og det andre som bare er brukerens eget
 *   (innstillinger, favoritter);
 * - `d` stoffregisteret og administrasjon: synker, kildesaker, verktøysperrer,
 *   kuratering, fagmiljøer og tilgang.
 *
 * Inngangene er tabellene og visningene nettleseren når, og funksjonene den
 * kan kalle. Reglene gjelder navnet (`skjema.tabell` eller funksjonens
 * signatur) og prøves i rekkefølge; første treff vinner.
 * `tilgangsinnganger.test.ts` stopper en inngang ingen regel treffer, så en ny
 * tabell eller funksjon må plasseres før den kommer inn.
 */
export const OMRADER = {
  a: 'Faginnhold og kliniske regler',
  b: 'Samhandling og varsler',
  c: 'Profiler og bilder',
  d: 'Stoffregister og administrasjon',
} as const

export type Omrade = keyof typeof OMRADER

export const OMRADEREGLER: readonly (readonly [Omrade, RegExp])[] = [
  ['c', /^(public\.profiles|public\.brukerinnstillinger)\b|^storage\.|^profiles_|stoffavoritt/],
  ['b', /diskusjon|(^|[_.])ide(er|kommentarer|hjerter|besok|oversikt|traad|arkiv|_|\()|oppgave|varsl|direktelenke/],
  ['d', /stoffkategori|stoffplassering|stoffstatus|stoffregister|stoffpapirkurv|plasser_stoff|(arkiver|slett|gjenopprett)_stoff/],
  ['d', /fagmiljo|medlemskap|systemrolle|tilgang|administrator|passord|konto|(sett|endre)_rolle/],
  ['d', /datakilder|_status\(|fagsak|kildeovervak|verktoysperre|kuratering|autoerstatt|endringsagent|brukernavn|intern_auth_domene|er_admin/],
  [
    'a',
    /utkast|revisjon|objekt|regelsett|regler|kommentar|referans|infosider|innhold|scenari|thc_|laborator|analytt|stoff|sideversjon|bivirkning|kjemi|cpic|farmakogenetikk|legemid|interaksjon|preparat|virkestoff|sokedata|endringslogg|maleenhet|historikk/,
  ],
]

/** Området inngangen hører til, eller `null` når ingen regel treffer. */
export function omradeFor(inngang: string): Omrade | null {
  return OMRADEREGLER.find(([, regel]) => regel.test(inngang))?.[0] ?? null
}
