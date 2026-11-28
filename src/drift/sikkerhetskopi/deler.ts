/**
 * Kopien i deler: dataene i OUSFARs egne tabeller deles i biter på databasens
 * side, og bare bitene som er nye siden forrige kopi, hentes ut av Supabase
 * (`docs/drift-gjenoppretting.md`, «Bare det som er endret»).
 *
 * En full kopi hver natt ville sendt hele databasen ut av Supabase hver gang
 * (over 600 MB 27.11.2026, flere ganger gratiskvoten for trafikk i måneden).
 * Det meste endres aldri: revisjonene og dokumentene i kurateringen og
 * historikken legges bare til. Derfor:
 *
 * - Radene i hver tabell med primærnøkkel sorteres etter nøkkelen og deles i
 *   biter der en rad slutter en bit med sannsynlighet `størrelse / DELMAL`,
 *   avgjort av en hash av nøkkelen alene. Grensene avhenger bare av radene
 *   selv, så en ny eller endret rad endrer bare biten den ligger i, og en bit
 *   er i snitt om lag `DELMAL` stor uansett hvor brede radene er.
 * - Hver bit får en **identitet**: sha256 av formatet, tabellen, kolonnene og
 *   sha256 av hver rad i rekkefølge, regnet ut i databasen, i det samme
 *   øyeblikksbildet som resten av kopien. Bare identiteten går over nettet.
 * - En bit med en identitet kopilageret alt har, hentes ikke på nytt; den nye
 *   kopien viser til den. Innholdet til en identitet er alltid det samme, så
 *   kopien er like fullstendig og konsistent som en full kopi.
 *
 * Bitene hentes med `COPY` i nøkkelrekkefølge og legges tilbake med `COPY`
 * etter `data.sql`, i den samme transaksjonen. Sekvensene som eies av de delte
 * tabellene (identitetskolonnene), settes for seg, fordi `pg_dump` hopper over
 * dem sammen med tabellen.
 */
import { Stopp } from './feil'

/** Ønsket størrelse på en bit, i byte tekst. */
export const DELMAL = 2 * 1024 * 1024

/** Versjonen av formatet; inngår i identiteten, så et nytt format aldri forveksles med et gammelt. */
export const DELFORMAT = 'ousfar-del:1'

/**
 * Øktinnstillingene teksten til en rad avhenger av. De settes likt når
 * identiteten regnes ut, når bitene hentes og når de legges tilbake, så
 * samme rader alltid gir samme tekst, uansett hva prosjektet har som standard.
 */
export const FASTE_INNSTILLINGER = [
  "set timezone to 'UTC'",
  "set datestyle to 'ISO, YMD'",
  "set intervalstyle to 'postgres'",
  'set extra_float_digits to 3',
  "set bytea_output to 'hex'",
  "set client_encoding to 'UTF8'",
] as const

export interface Nokkelkolonne {
  navn: string
  type: string
}

export interface DeltTabell {
  /** `skjema.tabell`. */
  tabell: string
  nokkel: Nokkelkolonne[]
  /** Kolonnene `COPY` tar med: alle unntatt de genererte. */
  kolonner: string[]
  /** Sekvensene tabellen eier (identitet og serial), som `skjema.navn`. */
  sekvenser: string[]
}

export interface Bit {
  tabell: string
  /** Nummeret i rekkefølgen i tabellen; bare for å legge tilbake i rekkefølge. */
  nr: number
  rader: number
  /** Teksten i byte, omtrent det `COPY` sender. */
  bytes: number
  identitet: string
  /** Nøkkelen til første og siste rad, som tekst. */
  fra: string[]
  til: string[]
}

export const sitert = (navn: string) => `"${navn.replaceAll('"', '""')}"`
export const sitertTabell = (tabell: string) => tabell.split('.').map(sitert).join('.')
const literal = (v: string) => `'${v.replaceAll("'", "''")}'`

/**
 * Tabellene som deles: alle vanlige tabeller med primærnøkkel i OUSFARs egne
 * skjemaer, unntatt de utelatte. `egneSkjemaerSql` er et SQL-uttrykk som er
 * sant for en tabell (`n`, `c`) som hører til dem.
 */
export function delteTabellerSql(egneSkjemaerSql: string, utelatt: readonly string[]): string {
  return /* sql */ `
    select n.nspname || '.' || c.relname as tabell,
      (select json_agg(json_build_object('navn', a.attname, 'type', format_type(a.atttypid, a.atttypmod)) order by k.ord)
         from unnest(i.indkey) with ordinality k(attnum, ord)
         join pg_attribute a on a.attrelid = c.oid and a.attnum = k.attnum) as nokkel,
      (select json_agg(a.attname order by a.attnum) from pg_attribute a
         where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped and a.attgenerated = '') as kolonner,
      coalesce((select json_agg(sn.nspname || '.' || s.relname order by s.relname)
         from pg_depend d join pg_class s on s.oid = d.objid and s.relkind = 'S'
         join pg_namespace sn on sn.oid = s.relnamespace
         where d.classid = 'pg_class'::regclass and d.refobjid = c.oid and d.deptype in ('a', 'i')), '[]'::json) as sekvenser
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_index i on i.indrelid = c.oid and i.indisprimary
    where c.relkind = 'r' and not c.relispartition and (${egneSkjemaerSql})
      and n.nspname || '.' || c.relname <> all (array[${utelatt.map(literal).join(', ') || "''"}]::text[])
    order by 1
  `
}

const nokkelliste = (t: DeltTabell) => t.nokkel.map((k) => `t.${sitert(k.navn)}`).join(', ')
const nokkeltekst = (t: DeltTabell) => t.nokkel.map((k) => `t.${sitert(k.navn)}::text`).join(', ')

/** Teksten identiteten begynner med: formatet, tabellen og kolonnene. */
export const identitetsgrunnlag = (t: DeltTabell) => `${DELFORMAT}|${t.tabell}|${t.kolonner.join(',')}|${DELMAL}\n`

/**
 * Bitene i én tabell, med radtall, størrelse, identitet og nøkkelen til
 * første og siste rad. Leser hver rad én gang; ingenting av innholdet går ut.
 */
export function delplanSql(t: DeltTabell): string {
  if (!t.nokkel.length) throw new Stopp(`${t.tabell} har ingen primærnøkkel og kan ikke deles.`)
  const pk = nokkelliste(t)
  const orden = t.nokkel.map((k) => sitert(k.navn)).join(', ')
  const baklengs = t.nokkel.map((k) => `${sitert(k.navn)} desc`).join(', ')
  return /* sql */ `
    with r as (
      select ${pk},
        sha256(convert_to(t::text, 'UTF8')) as kopi_h,
        octet_length(t::text)::bigint as kopi_n,
        json_build_array(${nokkeltekst(t)}) as kopi_k,
        (('x' || substr(md5(row(${pk})::text), 1, 8))::bit(32)::bigint::float8 / 4294967296.0)
          < least(1.0, octet_length(t::text)::float8 / ${DELMAL}) as kopi_slutt
      from ${sitertTabell(t.tabell)} t
    ), d as (
      select *, coalesce(sum(kopi_slutt::int) over (order by ${orden} rows between unbounded preceding and 1 preceding), 0) as kopi_nr from r
    )
    select ${literal(t.tabell)} as tabell, kopi_nr::int as nr, count(*)::bigint as rader, sum(kopi_n)::bigint as bytes,
      encode(sha256(convert_to(${literal(identitetsgrunnlag(t))}, 'UTF8') || string_agg(kopi_h, ''::bytea order by ${orden})), 'hex') as identitet,
      (array_agg(kopi_k order by ${orden}))[1] as fra,
      (array_agg(kopi_k order by ${baklengs}))[1] as til
    from d group by kopi_nr order by kopi_nr
  `
}

/** Radene i én bit, i nøkkelrekkefølge, med kolonnene `COPY` tar med. */
export function bitSql(t: DeltTabell, b: Pick<Bit, 'fra' | 'til'>): string {
  if (b.fra.length !== t.nokkel.length || b.til.length !== t.nokkel.length) throw new Stopp(`Nøkkelen til en bit i ${t.tabell} passer ikke tabellen.`)
  const verdier = (v: string[]) => `(${v.map((x, i) => `${literal(x)}::${t.nokkel[i]!.type}`).join(', ')})`
  const pk = `(${nokkelliste(t)})`
  return `select ${t.kolonner.map((k) => `t.${sitert(k)}`).join(', ')} from ${sitertTabell(t.tabell)} t where ${pk} >= ${verdier(b.fra)} and ${pk} <= ${verdier(b.til)} order by ${nokkelliste(t)}`
}

/** En sti psql kan bruke i `\copy` uten sitering: bare trygge tegn. */
function trygSti(sti: string): string {
  if (!/^[A-Za-z0-9_./-]+$/.test(sti)) throw new Stopp(`Stien ${sti} kan ikke brukes i \\copy.`)
  return sti
}

/**
 * psql-skriptet som henter bitene til filene, i øyeblikksbildet. Én økt, så
 * alle leses i det samme bildet.
 */
export function henteskript(bilde: string, biter: readonly { t: DeltTabell; b: Bit; fil: string }[]): string {
  if (!/^[0-9A-F]+-[0-9A-F]+-\d+$/i.test(bilde)) throw new Stopp(`Ugyldig øyeblikksbilde: ${bilde}`)
  return [
    'begin isolation level repeatable read read only;',
    `set transaction snapshot '${bilde}';`,
    ...FASTE_INNSTILLINGER.map((s) => `${s};`),
    ...biter.map(({ t, b, fil }) => `\\copy (${bitSql(t, b)}) to '${trygSti(fil)}'`),
    'commit;',
    '',
  ].join('\n')
}

/** psql-linjene som legger bitene tilbake og setter sekvensene, etter `data.sql` i samme transaksjon. */
export function tilbakeskript(biter: readonly { tabell: string; kolonner: readonly string[]; fil: string }[], sekvenser: readonly Sekvens[]): string {
  return [
    'set session_replication_role = replica;',
    ...FASTE_INNSTILLINGER.map((s) => `${s};`),
    ...biter.map((b) => `\\copy ${sitertTabell(b.tabell)} (${b.kolonner.map(sitert).join(', ')}) from '${trygSti(b.fil)}'`),
    ...sekvenser.map((s) => `select pg_catalog.setval(${literal(sitertTabell(s.navn))}, ${BigInt(s.verdi)}, ${s.kalt ? 'true' : 'false'});`),
    '',
  ].join('\n')
}

export interface Sekvens {
  navn: string
  verdi: string
  kalt: boolean
}

/** Verdien til en sekvens, som `pg_dump` leser den. */
export const sekvensSql = (navn: string) => `select ${literal(navn)} as navn, last_value::text as verdi, is_called as kalt from ${sitertTabell(navn)}`

/** Bitene som er nye: identitetene kopilageret ikke har fra før. */
export function nyeBiter<T extends Pick<Bit, 'identitet'>>(biter: readonly T[], kjente: ReadonlySet<string>): T[] {
  const sett = new Set<string>()
  return biter.filter((b) => !kjente.has(b.identitet) && !sett.has(b.identitet) && sett.add(b.identitet))
}
