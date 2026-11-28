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

/** Sletter det i køen og utsendingene for chatvarslene som er eldre enn fristen (docs/chatvarsler.md). */
export const CHATVARSELKO_RYDD_SQL = 'select intern.rydd_chatvarselko() as slettet'

/** Rader i køen og utsendingene eldre enn fristen, og fristen i minutter. Bare antall og alder. */
export const CHATVARSELKO_KONTROLL_SQL = `
  with k as (
    select kl from intern.chatvarselko
    union all
    select kl from intern.chatvarselutsendinger
  )
  select
    (select count(*) from k where k.kl < now() - intern.chatvarsel_frist())::int as gjenstar,
    (select floor(extract(epoch from now() - min(k.kl)) / 86400)::int from k) as eldste_dager,
    0 as frist_dager,
    (select floor(extract(epoch from intern.chatvarsel_frist()) / 60)::int) || ' minutter' as frist
`

/** Sletter de planlagte varslene på enheten som har stått et døgn etter fristen (docs/enhetsvarsler.md). */
export const ENHETSVARSEL_RYDD_SQL = 'select intern.rydd_enhetsvarsler() as slettet'

/** Planlagte varsler som skulle vært slettet, og hvor lenge de står etter fristen. Bare antall og alder. */
export const ENHETSVARSEL_KONTROLL_SQL = `
  select
    (select count(*) from intern.enhetsvarsler v where v.senest_kl < now() - intern.enhetsvarsel_oppbevaring())::int as gjenstar,
    (select floor(extract(epoch from now() - min(v.kl)) / 86400)::int from intern.enhetsvarsler v) as eldste_dager,
    (select floor(extract(epoch from intern.enhetsvarsel_oppbevaring()) / 86400)::int) as frist_dager,
    'et døgn etter fristen' as frist
`

/** Det jobben rydder, i rekkefølge: navnet i rapporten, de to spørringene og hva radene er. */
export const LAGRINGSJOBBER = [
  { navn: 'Gruppechat', rydd: RYDD_SQL, kontroll: KONTROLL_SQL, hva: 'meldinger' },
  { navn: 'Direktemeldinger', rydd: DIREKTE_RYDD_SQL, kontroll: DIREKTE_KONTROLL_SQL, hva: 'meldinger' },
  { navn: 'Køen for chatvarsler', rydd: CHATVARSELKO_RYDD_SQL, kontroll: CHATVARSELKO_KONTROLL_SQL, hva: 'meldinger i køen' },
  { navn: 'Planlagte varsler på enheten', rydd: ENHETSVARSEL_RYDD_SQL, kontroll: ENHETSVARSEL_KONTROLL_SQL, hva: 'varsler' },
] as const

export interface Ryddesvar {
  slettet: number
}

export interface Kontrollsvar {
  gjenstar: number
  /** `null` når det ikke finnes noen meldinger. */
  eldste_dager: number | null
  frist_dager: number
  /** Fristen i ord, når den ikke er hele dager (køen for chatvarsler). */
  frist?: string
}

export interface Vurdering {
  ok: boolean
  /** Rapporten i Markdown, til sammendraget i GitHub Actions. */
  rapport: string
}

/** Vurderer kjøringen: feilet er den når utgåtte meldinger står igjen etter ryddingen. */
export function vurderLagringstid(rydd: Ryddesvar, kontroll: Kontrollsvar, navn = 'Gruppechat', hva = 'meldinger'): Vurdering {
  const ok = kontroll.gjenstar === 0
  const frist = kontroll.frist ?? `${kontroll.frist_dager} dager`
  const linjer = [
    `## ${navn}: lagringstid`,
    '',
    `- Slettet nå: ${rydd.slettet} ${hva} eldre enn ${frist}.`,
    `- Utgåtte ${hva} igjen: ${kontroll.gjenstar}.`,
    `- Eldste melding: ${kontroll.eldste_dager === null ? `ingen ${hva}` : `${kontroll.eldste_dager} dager`}.`,
  ]
  if (!ok) linjer.push('', `**Feil:** ${kontroll.gjenstar} ${hva} eldre enn lagringstiden står fortsatt i databasen.`)
  return { ok, rapport: linjer.join('\n') }
}
