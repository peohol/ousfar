/**
 * Kallene forsiden gjør mot Supabase: oppsummeringen til ett panel, og
 * brukerens oppsett av panelene i brukerinnstillingene.
 */
import { hentInnstilling, lagreSisteValg } from '../auth/innstillinger'
import { klient } from '../auth/klient'
import { lesOppsett, OPPSETTNOKKEL, type Forsidemodul, type Forsideoppsett } from './moduler'
import { lesOppsummering, type Oppsummering } from './oppsummering'

/** Modulene databasen oppsummerer; favorittene har appen selv. */
export type Databasemodul = Exclude<Forsidemodul, 'favoritter'>

export async function hentOppsummering(modul: Databasemodul): Promise<Oppsummering> {
  const { data, error } = await klient().rpc('forsideoppsummering', { modul })
  if (error) throw new Error('Fikk ikke hentet dette.')
  return lesOppsummering(data)
}

/** Brukerens oppsett, eller standarden når hen ikke har valgt noe. Kaster når tjenesten ikke svarer. */
export async function hentOppsett(): Promise<Forsideoppsett> {
  return lesOppsett(await hentInnstilling(OPPSETTNOKKEL))
}

/** Lagrer oppsettet; endres det flere ganger raskt, lagres det siste sist. */
export const lagreOppsett: (oppsett: Forsideoppsett) => Promise<void> = lagreSisteValg<Forsideoppsett>(OPPSETTNOKKEL)
