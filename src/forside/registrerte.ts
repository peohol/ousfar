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
 * En oppføring har `tittel`, `ikon`, `standard`, eventuelt `funksjon`,
 * `plass: 'topp'` eller `fast`, og `innhold` (se `Moduldefinisjon`), for
 * eksempel «Dagen i dag» med funksjonen `personal` i feltet øverst. Feltene
 * står i docs/forside.md, «Paneler fra et eierprosjekt».
 */
import type { Moduldefinisjon } from './moduler'

/** Et registrert panel har alltid innholdet sitt med. */
export type Registrertmodul = Moduldefinisjon & Required<Pick<Moduldefinisjon, 'innhold'>>

export const REGISTRERTE_MODULER = {} as const satisfies Record<string, Registrertmodul>
