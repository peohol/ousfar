/**
 * Manifestet for en sikkerhetskopi: radtall og kontrollsum per tabell, slik at
 * en gjenoppretting kan bevises lik kilden (`docs/drift-gjenoppretting.md`).
 *
 * Med er alle tabeller i OUSFARs egne skjemaer, migrasjonshistorikken og
 * dataene i `auth` og `storage` en innlogging og profilbildene trenger.
 * Supabases interne skjemaer (køer, logger, utvidelser) er ikke med; de bygges
 * av plattformen selv i et nytt prosjekt.
 */

/** Skjemaene som eies av Postgres eller Supabase og ikke er OUSFARs data. */
export const IKKE_EGNE_SKJEMAER = [
  'pg_catalog', 'information_schema', 'pg_toast',
  'auth', 'storage', 'extensions', 'graphql', 'graphql_public', 'realtime', '_realtime',
  'supabase_functions', 'supabase_migrations', 'net', 'pgsodium', 'pgsodium_masks', 'vault',
  'cron', 'pgbouncer', '_analytics', 'pgmq', 'pgtle', 'tiger', 'topology',
] as const

/** Tabellene i plattformskjemaene som er OUSFARs data og skal være like etter en gjenoppretting. */
export const PLATTFORMTABELLER = [
  'auth.users', 'auth.identities', 'auth.mfa_factors',
  'storage.buckets', 'storage.objects',
  'supabase_migrations.schema_migrations',
] as const

/**
 * Kolonnene kontrollsummen tas over der ikke hele raden skal være lik. Filene i
 * Storage legges tilbake gjennom API-et, som gir raden nye tidsstempler og
 * eier; filinnholdet sammenlignes for seg med sjekksummen i manifestet.
 */
export const KONTROLLKOLONNER: Readonly<Record<string, readonly string[]>> = {
  'storage.objects': ['bucket_id', 'name'],
}

/**
 * Tabellene som aldri tas med i en kopi, med grunnen. Manifestet fører dem
 * med null rader, så en gjenoppretting er kontrollert lik kilden med dem
 * tomme. Innholdet leses aldri, heller ikke til kontrollsummen. Finnes en av
 * dem ikke i kilden (omdøpt eller fjernet), stopper kopien, så unntaket ikke
 * kan forsvinne i stillhet.
 */
export const UTELATTE_TABELLER: Readonly<Record<string, string>> = {
  'public.direktemeldinger':
    'Meldingene i direktemeldingene tas ikke med i kopiene (Peder, beslutning 3, 18.11.2026, docs/direktemeldinger-personvern.md). Samtalene, lest-statusen, valgene (chatvalg) og blokkeringene tas med, så de står etter et datatap, uten meldinger',
  'intern.chatvarselko': 'Flyktig kø for chatvarsler (bare ID-er, høyst ti minutter gammel). Et varsel om en gammel melding etter en gjenoppretting ville vært feil',
  'intern.chatvarselutsendinger': 'Flyktig kø for chatvarsler som venter på push-tjenesten. Samme grunn',
  'intern.enhetsvarsler':
    'Flyktige planlagte varsler på enheten (høyst to døgn gamle, docs/enhetsvarsler.md). Eierprosjektet planlegger dem på nytt; et gammelt varsel etter en gjenoppretting ville vært feil',
}

/** Sant for en tabell (`n`, `c`) i OUSFARs egne skjemaer. */
export const EGNE_SKJEMAER_SQL = `n.nspname <> all (array[${IKKE_EGNE_SKJEMAER.map((s) => `'${s}'`).join(', ')}])
    and n.nspname not like 'pg\\_temp%' and n.nspname not like 'pg\\_toast%'`

/** Tabellene manifestet dekker, som `skjema.tabell`, sortert. */
export const TABELLER_SQL = /* sql */ `
  select n.nspname || '.' || c.relname as tabell
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where c.relkind in ('r', 'p') and not c.relispartition
    and (n.nspname <> all (array[${IKKE_EGNE_SKJEMAER.map((s) => `'${s}'`).join(', ')}])
      or n.nspname || '.' || c.relname = any (array[${PLATTFORMTABELLER.map((t) => `'${t}'`).join(', ')}]))
    and n.nspname not like 'pg\\_temp%' and n.nspname not like 'pg\\_toast%'
  order by 1
`

/** Summen for en tom tabell; den en utelatt tabell har i manifestet og etter en gjenoppretting. */
export const TOM_SUM = 'd41d8cd98f00b204e9800998ecf8427e'

const sitert = (tabell: string) => tabell.split('.').map((d) => `"${d.replaceAll('"', '""')}"`).join('.')

/**
 * Radtall og kontrollsum for én tabell. Summen er uavhengig av rekkefølgen:
 * md5 av de sorterte md5-ene av radene.
 */
export function tabellsumSql(tabell: string): string {
  const kolonner = KONTROLLKOLONNER[tabell]
  const rad = kolonner ? `row(${kolonner.map((k) => `t."${k}"`).join(', ')})::text` : 't::text'
  return `select '${tabell.replaceAll("'", "''")}' as tabell, count(*)::bigint as rader,
    coalesce(md5(string_agg(h, '' order by h)), md5('')) as sum
    from (select md5(${rad}) as h from ${sitert(tabell)} t) x`
}

export interface Tabellsum {
  tabell: string
  rader: number
  sum: string
}

export interface Fil {
  bucket: string
  navn: string
  bytes: number
  sha256: string
}

export interface Manifest {
  laget: string
  kilde: string
  versjoner: Record<string, string | null>
  tabeller: Tabellsum[]
  filer: Fil[]
  /** Navnene på hemmelighetene som må settes på nytt, aldri verdiene. */
  hemmeligheter: string[]
  /** Tabellene som ikke er med ({@link UTELATTE_TABELLER}); de står med null rader. */
  utelatt?: string[]
  /** Bitene dataene i de delte tabellene ligger i (`deler.ts`), i rekkefølge. */
  deler?: { tabell: string; kolonner: string[]; nr: number; rader: number; identitet: string }[]
  /** Sekvensene de delte tabellene eier, med verdien i kopipunktet. */
  sekvenser?: { navn: string; verdi: string; kalt: boolean }[]
  /**
   * Tofaktornøkler Auth har kryptert med en nøkkel bare plattformen har. De
   * kan ikke leses i et nytt prosjekt (se `KRYPTERTE_FAKTORER_SQL`).
   */
  krypterteFaktorer?: number
}

/**
 * Tofaktornøklene (`auth.mfa_factors.secret`) Auth har kryptert. Er
 * kryptering av dem slått på, lagrer Auth dem som `{"key_id":…,"alg":…,…}`,
 * kryptert med en nøkkel i plattformen som ikke følger med en kopi. Et nytt
 * prosjekt har en annen nøkkel, så de kan ikke brukes etter en gjenoppretting.
 * Ukrypterte nøkler er base32 og virker som før. Bare id og bruker leses,
 * aldri selve nøkkelen.
 */
export const KRYPTERTE_FAKTORER_SQL = `
  select f.id::text as id, coalesce(u.email, u.id::text) as bruker
  from auth.mfa_factors f join auth.users u on u.id = f.user_id
  where f.secret ~ '^\\s*\\{.*"key_id"'
  order by 2, 1
`

/** Avvikene mellom to manifester, tomt når de er like. */
export function sammenlign(kilde: Pick<Manifest, 'tabeller' | 'filer'>, mal: Pick<Manifest, 'tabeller' | 'filer'>): string[] {
  const ut: string[] = []
  const m = new Map(mal.tabeller.map((t) => [t.tabell, t]))
  for (const t of kilde.tabeller) {
    const s = m.get(t.tabell)
    if (!s) ut.push(`tabellen ${t.tabell} mangler`)
    else if (Number(s.rader) !== Number(t.rader)) ut.push(`${t.tabell}: ${s.rader} rader, kilden har ${t.rader}`)
    else if (s.sum !== t.sum) ut.push(`${t.tabell}: kontrollsummen er ulik`)
    m.delete(t.tabell)
  }
  for (const t of m.keys()) ut.push(`tabellen ${t} finnes bare i målet`)
  const filer = new Map(mal.filer.map((f) => [`${f.bucket}/${f.navn}`, f]))
  for (const f of kilde.filer) {
    const g = filer.get(`${f.bucket}/${f.navn}`)
    if (!g) ut.push(`filen ${f.bucket}/${f.navn} mangler`)
    else if (g.sha256 !== f.sha256) ut.push(`filen ${f.bucket}/${f.navn} har annet innhold`)
    filer.delete(`${f.bucket}/${f.navn}`)
  }
  for (const n of filer.keys()) ut.push(`filen ${n} finnes bare i målet`)
  return ut
}
