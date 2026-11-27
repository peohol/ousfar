/**
 * Veien inn til administrasjonens vinduer fra hovedmenyen (D6). `Administrasjon`
 * eier vinduene og det som bør ses over; hovedmenyen viser valgene etter
 * rettighetene og sender `apneAdminpanel`. Valgene er et grensesnitt, ikke en
 * tilgangskontroll: databasen og Edge-funksjonene kontrollerer selv.
 */
import { harAdministrasjon, kanGiRedaktoransvar, type Rettigheter } from '../../auth/rettigheter'
import { lagSignal } from '../../domain/signal'
import { lagDeltTilstand } from '../../hooks/deltTilstand'
import type { Ikonnavn } from '../ikon/register'

/** Hvem et valg er for. */
const SYSTEMARKITEKT = (r: Rettigheter) => r.systemarkitekt
const LOKAL_ADMINISTRATOR = harAdministrasjon

/**
 * Valgene i administrasjonen, i rekkefølgen de står. En lokal administrator
 * får «Brukere» og, med fagmiljøer å administrere, «Redaktører»; resten er
 * bare for systemarkitektene.
 */
export const ADMINVALG = [
  { panel: 'brukere', ikon: 'user', tekst: 'Brukere', for: LOKAL_ADMINISTRATOR },
  { panel: 'redaktorer', ikon: 'edit', tekst: 'Redaktører', for: kanGiRedaktoransvar },
  { panel: 'stillinger', ikon: 'stilling', tekst: 'Stillinger', for: SYSTEMARKITEKT },
  { panel: 'funksjoner', ikon: 'gears', tekst: 'Funksjoner', for: SYSTEMARKITEKT },
  { panel: 'datakilder', ikon: 'reset', tekst: 'Datakilder', for: SYSTEMARKITEKT },
  { panel: 'kurateringer', ikon: 'oppgaver', tekst: 'Kurateringer', for: SYSTEMARKITEKT },
  { panel: 'kildeovervaking', ikon: 'refs', tekst: 'Kildeovervåking', for: SYSTEMARKITEKT },
  { panel: 'verktoysperrer', ikon: 'lock', tekst: 'Kliniske verktøy', for: SYSTEMARKITEKT },
  { panel: 'autoerstatt', ikon: 'edit', tekst: 'Autoerstatt', for: SYSTEMARKITEKT },
] as const satisfies readonly { panel: string; ikon: Ikonnavn; tekst: string; for: (r: Rettigheter) => boolean }[]

export type Adminpanel = (typeof ADMINVALG)[number]['panel']

/** Valgene den innloggede har. Tom for dem uten noe i administrasjonen. */
export function adminvalg(r: Rettigheter) {
  return harAdministrasjon(r) ? ADMINVALG.filter((v) => v.for(r)) : []
}

/** Det som bør ses over, som tekst per valg (`Administrasjon` henter det). */
export type Adminstatus = Partial<Record<Adminpanel, string>>

const likStatus = (a: Adminstatus, b: Adminstatus) => {
  const ka = Object.keys(a) as Adminpanel[]
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k])
}

export const adminstatus = lagDeltTilstand<Adminstatus>({}, likStatus)

/** Alt som bør ses over, i én tekst, eller ingenting. */
export const adminvarsel = (status: Adminstatus): string | undefined =>
  ADMINVALG.map((v) => status[v.panel])
    .filter(Boolean)
    .join('; ') || undefined

const panel = lagSignal<Adminpanel>()

/** Åpner et av administrasjonens vinduer. */
export const apneAdminpanel = panel.send

/** Hører etter `apneAdminpanel`. */
export const lyttEtterAdminpanel = panel.lytt
