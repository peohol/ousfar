/**
 * OUSFARs egne tilpasninger i Supabases skjemaer `auth` og `storage`
 * (`docs/s4-pilotplan.md` §3.2, `docs/drift-gjenoppretting.md`).
 *
 * Strukturen i de to skjemaene eies av Supabase og er ikke med i
 * `supabase db dump`. Det OUSFAR selv har lagt til der, som utløseren
 * `paa_ny_auth_bruker` på `auth.users` og reglene for profilbildene på
 * `storage.objects`, må derfor tas med og gjenopprettes for seg.
 *
 * Tilpasningene er **forskjellen** mellom kilden og en ren referanse: en
 * Supabase med de samme versjonene av Auth og Storage, uten OUSFARs
 * migrasjoner. Begge beskrives med det samme fingeravtrykket: utløsere,
 * regler, radsikkerhet og tilganger på objektene i skjemaene. Det som bare
 * finnes i kilden, er tilpasninger; det som finnes i begge med ulik
 * definisjon, eller bare i referansen, er avvik som stopper kopien, fordi
 * det betyr at et plattformobjekt er endret eller at versjonene ikke stemmer.
 *
 * Modulen er ren: spørringene kjøres av den som kaller, mot en ekte Postgres
 * eller testdatabasen i minnet.
 */
import { utenKommentarer } from '../../faginnhold/sqlsetninger'

/** Skjemaene Supabase eier, der OUSFARs tilpasninger må tas med for seg. */
export const PLATTFORMSKJEMAER = ['auth', 'storage'] as const

export type Art = 'rolle' | 'rollemedlemskap' | 'rolleinnstilling' | 'utloser' | 'regel' | 'radsikkerhet' | 'tilgang'

/**
 * Ett objekt i fingeravtrykket. `nokkel` identifiserer det på tvers av
 * databaser (uten OID-er), `definisjon` er det som sammenlignes, og `ddl`
 * gjenskaper det.
 */
export interface Objekt {
  art: Art
  nokkel: string
  definisjon: string
  ddl: string
}

/** De midlertidige innloggingsrollene fra Management API-et (`POST /cli/login-role`), som regulært uttrykk. */
export const MIDLERTIDIG_ROLLE = '^cli_login_'

const skjemaliste = PLATTFORMSKJEMAER.map((s) => `'${s}'`).join(', ')

/**
 * Fingeravtrykket av skjemaene: én rad per objekt. Eierens egne rettigheter
 * og interne utløsere (fremmednøkler) er ikke med, siden de følger tabellen.
 *
 * Rollene, medlemskapene i dem og innstillingene på dem er med på samme måte.
 * De gjelder hele serveren og er ikke i `db dump`; rollefila fra
 * `db dump --role-only` har bare Supabases egne innstillinger og kjøres ikke
 * ved gjenoppretting. OUSFAR har én slik tilpasning: tidsgrensen for
 * `service_role` (`20260923092108_legemiddeldata.sql`).
 *
 * De midlertidige innloggingsrollene Supabase lager for CLI-en og kopijobben
 * (`cli_login_…`, `prosjekt.ts`), er ikke OUSFARs og er ikke med, heller ikke
 * medlemskapene og innstillingene deres, som CLI-en selv utelater dem.
 */
export const FINGERAVTRYKK_SQL = /* sql */ `
  with skjema as (
    select oid, nspname, nspowner, nspacl from pg_namespace where nspname in (${skjemaliste})
  ),
  tabell as (
    select c.oid, c.relname, c.relkind, c.relowner, c.relacl, c.relrowsecurity, c.relforcerowsecurity, s.nspname
    from pg_class c join skjema s on s.oid = c.relnamespace
    where c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
  ),
  roller as (
    select 'rolle'::text as art, r.rolname::text as nokkel,
      concat_ws(',', case when r.rolsuper then 'superuser' end, case when r.rolcanlogin then 'login' end,
        case when r.rolinherit then 'inherit' end, case when r.rolcreaterole then 'createrole' end,
        case when r.rolcreatedb then 'createdb' end, case when r.rolbypassrls then 'bypassrls' end,
        case when r.rolreplication then 'replication' end) as definisjon,
      format('create role %I with %s %s %s %s %s;', r.rolname,
        case when r.rolcanlogin then 'login' else 'nologin' end, case when r.rolinherit then 'inherit' else 'noinherit' end,
        case when r.rolcreaterole then 'createrole' else 'nocreaterole' end, case when r.rolcreatedb then 'createdb' else 'nocreatedb' end,
        case when r.rolbypassrls then 'bypassrls' else 'nobypassrls' end) as ddl
    from pg_roles r where r.rolname not like 'pg\_%' and r.rolname !~ '${MIDLERTIDIG_ROLLE}'
  ),
  rollemedlemskap as (
    select 'rollemedlemskap', concat_ws('|', g.rolname, m.rolname),
      case when a.admin_option then 'med administrasjon' else 'uten administrasjon' end,
      format('grant %I to %I%s;', g.rolname, m.rolname, case when a.admin_option then ' with admin option' else '' end)
    from pg_auth_members a join pg_roles g on g.oid = a.roleid join pg_roles m on m.oid = a.member
    where g.rolname not like 'pg\_%' and m.rolname not like 'pg\_%'
      and g.rolname !~ '${MIDLERTIDIG_ROLLE}' and m.rolname !~ '${MIDLERTIDIG_ROLLE}'
  ),
  rolleinnstillinger as (
    select 'rolleinnstilling', concat_ws('|', r.rolname, split_part(c, '=', 1)), substr(c, strpos(c, '=') + 1),
      format('alter role %I set %s = %L;', r.rolname, split_part(c, '=', 1), substr(c, strpos(c, '=') + 1))
    from pg_db_role_setting s join pg_roles r on r.oid = s.setrole, unnest(s.setconfig) c
    where s.setdatabase = 0 and r.rolname !~ '${MIDLERTIDIG_ROLLE}'
  ),
  utlosere as (
    select 'utloser' as art,
      concat_ws('.', t.nspname, t.relname, g.tgname) as nokkel,
      pg_get_triggerdef(g.oid) as definisjon,
      pg_get_triggerdef(g.oid) || ';' as ddl
    from pg_trigger g join tabell t on t.oid = g.tgrelid
    where not g.tgisinternal
  ),
  regler as (
    select 'regel',
      concat_ws('.', p.schemaname, p.tablename, p.policyname),
      concat_ws(' | ', p.permissive, p.cmd, array_to_string(p.roles, ','), coalesce(p.qual, '-'), coalesce(p.with_check, '-')),
      format('create policy %I on %I.%I as %s for %s to %s', p.policyname, p.schemaname, p.tablename, p.permissive, p.cmd,
        (select string_agg(quote_ident(r::text), ', ') from unnest(p.roles) r))
        || coalesce(' using (' || p.qual || ')', '')
        || coalesce(' with check (' || p.with_check || ')', '') || ';'
    from pg_policies p where p.schemaname in (${skjemaliste})
  ),
  radsikkerhet as (
    select 'radsikkerhet',
      concat_ws('.', t.nspname, t.relname),
      case when t.relforcerowsecurity then 'påtvunget' else 'på' end,
      format('alter table %I.%I enable row level security;', t.nspname, t.relname)
        || case when t.relforcerowsecurity then format(' alter table %I.%I force row level security;', t.nspname, t.relname) else '' end
    from tabell t where t.relrowsecurity
  ),
  rettigheter as (
    -- Tabeller, visninger og sekvenser. Uten egen liste gjelder standarden.
    select t.nspname as skjema, t.relname as navn,
      case t.relkind when 'S' then 'sequence' else 'table' end as slag,
      format('%I.%I', t.nspname, t.relname) as objekt,
      t.relowner as eier, a.grantee, a.privilege_type, a.is_grantable
    from tabell t, aclexplode(coalesce(t.relacl, acldefault((case t.relkind when 'S' then 's' else 'r' end)::"char", t.relowner))) a
    union all
    select s.nspname, p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', 'function',
      format('%I.%I(%s)', s.nspname, p.proname, pg_get_function_identity_arguments(p.oid)),
      p.proowner, a.grantee, a.privilege_type, a.is_grantable
    from pg_proc p join skjema s on s.oid = p.pronamespace, aclexplode(coalesce(p.proacl, acldefault('f'::"char", p.proowner))) a
    union all
    select s.nspname, s.nspname, 'schema', format('%I', s.nspname),
      s.nspowner, a.grantee, a.privilege_type, a.is_grantable
    from skjema s, aclexplode(coalesce(s.nspacl, acldefault('n'::"char", s.nspowner))) a
  ),
  tilganger as (
    select 'tilgang',
      concat_ws('|', r.slag, r.skjema || '.' || r.navn, case r.grantee when 0 then 'public' else r.grantee::regrole::text end, r.privilege_type),
      case when r.is_grantable then 'med videretildeling' else 'uten videretildeling' end,
      format('grant %s on %s %s to %s%s;', r.privilege_type, r.slag, r.objekt,
        case r.grantee when 0 then 'public' else quote_ident(r.grantee::regrole::text) end,
        case when r.is_grantable then ' with grant option' else '' end)
    from rettigheter r where r.grantee <> r.eier
  )
  select * from roller
  union all select * from rollemedlemskap
  union all select * from rolleinnstillinger
  union all select * from utlosere
  union all select * from regler
  union all select * from radsikkerhet
  union all select * from tilganger
  order by 1, 2
`

/** Versjonene av Auth og Storage, fra deres egne migrasjonstabeller; `null` der tabellen ikke finnes. */
export const VERSJONSTABELLER = { auth: 'auth.schema_migrations', storage: 'storage.migrations' } as const

export const versjonSql = (skjema: keyof typeof VERSJONSTABELLER): string =>
  skjema === 'auth'
    ? `select max(version)::text as versjon from ${VERSJONSTABELLER.auth}`
    : `select (select name from ${VERSJONSTABELLER.storage} order by id desc limit 1) as versjon`

export const finnesSql = (tabell: string): string => `select to_regclass('${tabell}') is not null as finnes`

export interface Fingeravtrykk {
  versjoner: Partial<Record<keyof typeof VERSJONSTABELLER, string | null>>
  objekter: Objekt[]
}

export interface Forskjell {
  /** Bare i kilden: OUSFARs tilpasninger. */
  tilpasninger: Objekt[]
  /** I begge, med ulik definisjon. */
  endret: { kilde: Objekt; referanse: Objekt }[]
  /** Bare i referansen: et plattformobjekt kilden ikke har. */
  fjernet: Objekt[]
  /** Versjoner av Auth eller Storage som ikke er like. */
  versjonsavvik: string[]
}

const etterNokkel = (objekter: readonly Objekt[]) => new Map(objekter.map((o) => [`${o.art}:${o.nokkel}`, o]))

export function forskjell(kilde: Fingeravtrykk, referanse: Fingeravtrykk): Forskjell {
  const k = etterNokkel(kilde.objekter)
  const r = etterNokkel(referanse.objekter)
  const tilpasninger: Objekt[] = []
  const endret: Forskjell['endret'] = []
  for (const [nokkel, o] of k) {
    const ref = r.get(nokkel)
    if (!ref) tilpasninger.push(o)
    else if (ref.definisjon !== o.definisjon) endret.push({ kilde: o, referanse: ref })
  }
  const fjernet = [...r].filter(([nokkel]) => !k.has(nokkel)).map(([, o]) => o)
  const versjonsavvik = (Object.keys(VERSJONSTABELLER) as (keyof typeof VERSJONSTABELLER)[])
    .filter((s) => (kilde.versjoner[s] ?? null) !== (referanse.versjoner[s] ?? null))
    .map((s) => `${s}: kilden ${kilde.versjoner[s] ?? 'ukjent'}, referansen ${referanse.versjoner[s] ?? 'ukjent'}`)
  return { tilpasninger, endret, fjernet, versjonsavvik }
}

/** Avvikene i en forskjell som tekst, tomt når den kan brukes. */
export function avvik(f: Forskjell): string[] {
  return [
    ...f.versjonsavvik.map((v) => `ulik versjon av ${v}`),
    ...f.endret.map((e) => `endret plattformobjekt ${e.kilde.art} ${e.kilde.nokkel}: «${e.referanse.definisjon}» → «${e.kilde.definisjon}»`),
    ...f.fjernet.map((o) => `plattformobjekt mangler i kilden: ${o.art} ${o.nokkel}`),
  ]
}

/** Rekkefølgen tilpasningene legges inn i: rollene først, radsikkerhet før reglene, tilgangene til slutt. */
const REKKEFOLGE: readonly Art[] = ['rolle', 'rollemedlemskap', 'rolleinnstilling', 'radsikkerhet', 'utloser', 'regel', 'tilgang']

/**
 * Skriptet som legger tilpasningene inn i en gjenopprettet database. Det kjøres
 * i én transaksjon og har verken `or replace` eller `drop`: det kan ikke
 * overskrive et plattformobjekt, og et objekt som finnes fra før, gir feil i
 * stedet for et duplikat.
 */
export function tilpasningsskript(tilpasninger: readonly Objekt[]): string {
  const sortert = [...tilpasninger].sort(
    (a, b) => REKKEFOLGE.indexOf(a.art) - REKKEFOLGE.indexOf(b.art) || a.nokkel.localeCompare(b.nokkel),
  )
  return [
    '-- OUSFARs tilpasninger i auth og storage og på rollene, laget av sikkerhetskopien (docs/drift-gjenoppretting.md).',
    'begin;',
    ...sortert.map((o) => `-- ${o.art} ${o.nokkel}\n${o.ddl}`),
    'commit;',
    '',
  ].join('\n')
}

/** Rader fra {@link FINGERAVTRYKK_SQL} som objekter. */
export const somObjekter = (rader: readonly Record<string, unknown>[]): Objekt[] =>
  rader.map((r) => ({ art: r.art as Art, nokkel: String(r.nokkel), definisjon: String(r.definisjon), ddl: String(r.ddl) }))

/**
 * Utløserne og reglene OUSFARs migrasjoner har laget på tabeller i `auth` og
 * `storage` og ikke fjernet igjen, som nøkler i fingeravtrykket. Kopien stopper
 * hvis et av dem mangler blant tilpasningene, så verken referansen eller en
 * plattformoppdatering kan få dem til å forsvinne i stillhet.
 */
export function objekterFraMigrasjoner(migrasjoner: readonly string[]): string[] {
  const navn = String.raw`("(?:[^"]|"")+"|[a-z_][a-z0-9_$]*)`
  const tabell = String.raw`(${PLATTFORMSKJEMAER.join('|')})\.("(?:[^"]|"")+"|[a-z_][a-z0-9_$]*)`
  const lag = new RegExp(String.raw`\bcreate\s+(?:or\s+replace\s+)?(?:constraint\s+)?(trigger|policy)\s+${navn}[^;]*?\bon\s+${tabell}`, 'gi')
  const fjern = new RegExp(String.raw`\bdrop\s+(trigger|policy)\s+(?:if\s+exists\s+)?${navn}\s+on\s+${tabell}`, 'gi')
  const rent = (n: string) => (n.startsWith('"') ? n.slice(1, -1).replaceAll('""', '"') : n.toLowerCase())
  const art = (ord: string): Art => (ord.toLowerCase() === 'trigger' ? 'utloser' : 'regel')
  const finnes = new Set<string>()
  for (const sql of migrasjoner) {
    const tekst = utenKommentarer(sql)
    const hendelser = [
      ...[...tekst.matchAll(lag)].map((m) => ({ pos: m.index, lag: true, m })),
      ...[...tekst.matchAll(fjern)].map((m) => ({ pos: m.index, lag: false, m })),
    ].sort((a, b) => a.pos - b.pos)
    for (const { lag: ny, m } of hendelser) {
      const nokkel = `${art(m[1]!)}:${[m[3]!.toLowerCase(), rent(m[4]!), rent(m[2]!)].join('.')}`
      if (ny) finnes.add(nokkel)
      else finnes.delete(nokkel)
    }
  }
  return [...finnes].sort()
}

/** Nøklene fra migrasjonene som ikke er blant tilpasningene. */
export function manglendeDekning(tilpasninger: readonly Objekt[], fraMigrasjoner: readonly string[]): string[] {
  const har = new Set(tilpasninger.map((o) => `${o.art}:${o.nokkel}`))
  return fraMigrasjoner.filter((n) => !har.has(n))
}
