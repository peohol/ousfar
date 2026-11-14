/**
 * Prøveargumenter for funksjonene nettleseren kan kalle, slik at hver av dem
 * kan prøves uten håndskrevne kall (`aktivtmedlemskap.test.ts`,
 * `systemrettigheter.test.ts`).
 */
import type { PGlite } from '@electric-sql/pglite'

/**
 * Et gyldig argument av riktig type for hver parameter i hver funksjon i
 * `public`, som SQL. Verdiene er bevisst uten mening: kontrollen skal stoppe
 * før argumentene brukes. Oppregningstyper får `publisert` når den finnes,
 * ellers den første verdien; sammensatte typer får `null`.
 */
export async function provargumenter(d: PGlite): Promise<Map<string, string[]>> {
  const { rows } = await d.query<{ signatur: string; verdier: string[] }>(`
    select p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')' as signatur,
      array(
        select case
          when t.typtype = 'e' then quote_literal(coalesce(
            (select e.enumlabel from pg_enum e where e.enumtypid = t.oid and e.enumlabel = 'publisert'),
            (select e.enumlabel from pg_enum e where e.enumtypid = t.oid order by e.enumsortorder limit 1)
          )) || '::' || format_type(t.oid, null)
          when t.typtype = 'c' then 'null::' || format_type(t.oid, null)
          when t.typcategory = 'A' then '''{}''::' || format_type(t.oid, null)
          else case format_type(t.oid, null)
            when 'uuid' then '''00000000-0000-4000-8000-000000000000''::uuid'
            when 'text' then '''x''::text'
            when 'integer' then '1'
            when 'bigint' then '1::bigint'
            when 'boolean' then 'false'
            when 'jsonb' then '''{}''::jsonb'
            when 'timestamp with time zone' then 'now()'
          end
        end
        from unnest(p.proargtypes::oid[]) with ordinality a(typ, nr)
        join pg_type t on t.oid = a.typ
        order by a.nr
      ) as verdier
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace`)
  return new Map(rows.map((r) => [r.signatur, r.verdier]))
}
