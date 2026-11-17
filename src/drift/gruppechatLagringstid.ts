/**
 * Lagringstiden for gruppechatten: 12 måneder (Peder 17.11.2026,
 * docs/gruppechat.md, «Lagringstiden»). Den daglige jobben
 * (`.github/workflows/gruppechat-lagringstid.yml`,
 * `scripts/gruppechat-lagringstid.ts`) sletter de utgåtte meldingene i alle
 * grupper, også i grupper ingen åpner, og kontrollerer etterpå at ingen står
 * igjen. Spørringene står her, så testene kjører de samme mot testdatabasen.
 *
 * Ingen meldingstekst, avsender eller gruppe leses ut: bare antall og alder.
 */

/** Sletter de utgåtte meldingene i alle grupper og gir hvor mange. */
export const RYDD_SQL = 'select intern.rydd_gruppechat() as slettet'

/** Hvor mange utgåtte meldinger som står igjen, og alderen til den eldste meldingen i dager. */
export const KONTROLL_SQL = `
  select
    (select count(*) from public.gruppemeldinger m
      where m.skrevet_kl < now() - intern.gruppechat_lagringstid())::int as gjenstar,
    (select floor(extract(epoch from now() - min(m.skrevet_kl)) / 86400)::int from public.gruppemeldinger m) as eldste_dager,
    (select floor(extract(epoch from intern.gruppechat_lagringstid()) / 86400)::int) as frist_dager
`

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
export function vurderLagringstid(rydd: Ryddesvar, kontroll: Kontrollsvar): Vurdering {
  const ok = kontroll.gjenstar === 0
  const linjer = [
    '## Gruppechat: lagringstid',
    '',
    `- Slettet nå: ${rydd.slettet} meldinger eldre enn ${kontroll.frist_dager} dager.`,
    `- Utgåtte meldinger igjen: ${kontroll.gjenstar}.`,
    `- Eldste melding: ${kontroll.eldste_dager === null ? 'ingen meldinger' : `${kontroll.eldste_dager} dager`}.`,
  ]
  if (!ok) linjer.push('', `**Feil:** ${kontroll.gjenstar} meldinger eldre enn lagringstiden står fortsatt i databasen.`)
  return { ok, rapport: linjer.join('\n') }
}
