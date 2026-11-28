/**
 * Panelene andre prosjekter har registrert på forsiden (docs/forside.md,
 * «Paneler fra et eierprosjekt»). Ett felt per panel; forsiden, «Tilpass
 * forsiden», tilgangen og hentingen virker for dem uten endringer i
 * rammeverket.
 *
 * Innholdet registreres med `senere(() => import(…), 'Navn')`
 * (`src/oppdatering/senere.ts`), så koden hentes først når panelet vises for
 * noen som har det, og aldri på forhånd. Et panel med `funksjon` finnes bare
 * for dem som har funksjonen i fagmiljøet de arbeider i.
 *
 * Eksempel:
 *
 * ```ts
 * dagen: {
 *   tittel: 'Dagen i dag',
 *   ikon: 'kalender',
 *   standard: true,
 *   funksjon: 'personal',
 *   plass: 'topp',
 *   innhold: senere(() => import('../personal/forside/Dagen'), 'Dagen'),
 * },
 * ```
 */
import type { Moduldefinisjon } from './moduler'

/** Et registrert panel har alltid innholdet sitt med. */
export type Registrertmodul = Moduldefinisjon & Required<Pick<Moduldefinisjon, 'innhold'>>

export const REGISTRERTE_MODULER = {} as const satisfies Record<string, Registrertmodul>
