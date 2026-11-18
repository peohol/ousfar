/**
 * Lagringstiden for chatten: 12 måneder for gruppechatten (Peder 17.11.2026,
 * docs/gruppechat.md, «Lagringstiden») og for direktemeldingene (beslutning 2,
 * 18.11.2026, docs/direktemeldinger-personvern.md). Den daglige jobben
 * (`.github/workflows/gruppechat-lagringstid.yml`,
 * `scripts/gruppechat-lagringstid.ts`) sletter de utgåtte meldingene i alle
 * grupper og samtaler, også dem ingen åpner, og kontrollerer etterpå at ingen
 * står igjen. Spørringene står her, så testene kjører de samme mot
 * testdatabasen.
 *
 * Ingen meldingstekst, avsender, gruppe eller samtale leses ut: bare antall og alder.
 */

/** Kontrollen for én tabell: utgåtte meldinger igjen, alderen til den eldste i dager, og fristen. */
const kontrollSql = (tabell: string, lagringstid: string) => `
  select
    (select count(*) from ${tabell} m
      where m.skrevet_kl < now() - ${lagringstid}())::int as gjenstar,
    (select floor(extract(epoch from now() - min(m.skrevet_kl)) / 86400)::int from ${tabell} m) as eldste_dager,
    (select floor(extract(epoch from ${lagringstid}()) / 86400)::int) as frist_dager
`

/** Sletter de utgåtte meldingene i alle grupper og gir hvor mange. */
export const RYDD_SQL = 'select intern.rydd_gruppechat() as slettet'

/** Hvor mange utgåtte gruppemeldinger som står igjen, og alderen til den eldste meldingen i dager. */
export const KONTROLL_SQL = kontrollSql('public.gruppemeldinger', 'intern.gruppechat_lagringstid')

/** Sletter de utgåtte direktemeldingene og tomme, gamle samtaler, og gir hvor mange meldinger. */
export const DIREKTE_RYDD_SQL = 'select intern.rydd_direktemeldinger() as slettet'

/** Som {@link KONTROLL_SQL}, for direktemeldingene. */
export const DIREKTE_KONTROLL_SQL = kontrollSql('public.direktemeldinger', 'intern.direktemelding_lagringstid')

/** Det jobben rydder, i rekkefølge: navnet i rapporten og de to spørringene. */
export const LAGRINGSJOBBER = [
  { navn: 'Gruppechat', rydd: RYDD_SQL, kontroll: KONTROLL_SQL },
  { navn: 'Direktemeldinger', rydd: DIREKTE_RYDD_SQL, kontroll: DIREKTE_KONTROLL_SQL },
] as const

export interface Ryddesvar {
  slettet: number
}

export interface Kontrollsvar {
  gjenstar: number
  /** `null` når det ikke finnes noen meldinger. */
  eldste_dager: number | null
  frist_dager: number
}

export interface Vurdering {
  ok: boolean
  /** Rapporten i Markdown, til sammendraget i GitHub Actions. */
  rapport: string
}

/** Vurderer kjøringen: feilet er den når utgåtte meldinger står igjen etter ryddingen. */
export function vurderLagringstid(rydd: Ryddesvar, kontroll: Kontrollsvar, navn = 'Gruppechat'): Vurdering {
  const ok = kontroll.gjenstar === 0
  const linjer = [
    `## ${navn}: lagringstid`,
    '',
    `- Slettet nå: ${rydd.slettet} meldinger eldre enn ${kontroll.frist_dager} dager.`,
    `- Utgåtte meldinger igjen: ${kontroll.gjenstar}.`,
    `- Eldste melding: ${kontroll.eldste_dager === null ? 'ingen meldinger' : `${kontroll.eldste_dager} dager`}.`,
  ]
  if (!ok) linjer.push('', `**Feil:** ${kontroll.gjenstar} meldinger eldre enn lagringstiden står fortsatt i databasen.`)
  return { ok, rapport: linjer.join('\n') }
}
