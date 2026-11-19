/**
 * Hvor i databasen en tekst står: hver kolonne med tekst eller JSON i hver
 * tabell utenom systemkatalogene, forbi radsikkerheten. Svaret er
 * `skjema.tabell.kolonne` for hver kolonne der teksten finnes. Brukes av
 * testene som viser at meldingstekst ikke står igjen noe sted (gruppechatten
 * og direktemeldingene).
 */
import type { PGlite } from '@electric-sql/pglite'

export async function hvorStaar(db: PGlite, tekst: string): Promise<string[]> {
  const kolonner = (
    await db.query<{ skjema: string; tabell: string; kolonne: string }>(
      `select n.nspname as skjema, c.relname as tabell, a.attname as kolonne
       from pg_attribute a
       join pg_class c on c.oid = a.attrelid
       join pg_namespace n on n.oid = c.relnamespace
       where c.relkind in ('r', 'p', 'm')
         and n.nspname not in ('pg_catalog', 'information_schema', 'pg_toast')
         and a.attnum > 0 and not a.attisdropped
         and (a.atttypid in ('text'::regtype, 'varchar'::regtype, 'bpchar'::regtype, 'json'::regtype, 'jsonb'::regtype, 'text[]'::regtype)
              or (select t.typtype from pg_type t where t.oid = a.atttypid) = 'd')`,
    )
  ).rows
  const tabeller = new Map<string, string[]>()
  for (const k of kolonner) tabeller.set(`"${k.skjema}"."${k.tabell}"`, [...(tabeller.get(`"${k.skjema}"."${k.tabell}"`) ?? []), k.kolonne])
  const funn: string[] = []
  for (const [tabell, navn] of tabeller) {
    const treff = (
      await db.query<Record<string, boolean>>(
        `select ${navn.map((k, i) => `coalesce(bool_or(position($1 in "${k}"::text) > 0), false) as k${i}`).join(', ')} from ${tabell}`,
        [tekst],
      )
    ).rows[0]!
    navn.forEach((k, i) => treff[`k${i}`] && funn.push(`${tabell.replaceAll('"', '')}.${k}`))
  }
  return funn.sort()
}
