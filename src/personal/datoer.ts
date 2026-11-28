import type { IsoDate } from '@delt/personal/types'

const KORT = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** En kalenderdato som «3. des. 2026». Datoen er fagmiljøets, uten klokkeslett, så den leses i UTC. */
export const kortDato = (dato: IsoDate): string => KORT.format(new Date(`${dato}T00:00:00Z`))
