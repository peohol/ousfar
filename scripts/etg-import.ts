/**
 * Importen av fortolkningen av EtG og EtS til Supabase (P4c,
 * docs/fagmiljoer.md, «Analyttkatalogen per fagmiljø»).
 *
 * Tilfellene og kommentartekstene sto i klientpakken (`src/domain/etg.ts`).
 * Her blir de et scenarioregelsett for modulen `etg` med kommentarene som
 * egne objekter, som rusmiddelreglene (`scripts/rus-import.ts`), i det
 * opprinnelige fagmiljøet OUS Klinisk farmakologi. Grunnlaget er frosset i
 * `src/domain/__tests__/fasit/etg-import.json`, med tekstene ordrett slik de
 * sto; testene kontrollerer at fortolkningen gir de samme kommentarene som
 * før.
 *
 * Importen ligger som en datamigrering (`*_etg_regler_import.sql`), laget med
 * `etgImportSql('peohol', <filnavnet>)`. Den kjøres uten innlogget bruker,
 * slik at objektene får det opprinnelige fagmiljøet, med administratoren som
 * forfatter. Finnes ikke administratoren — som i testdatabasen — gjør den
 * ingenting; testene kjører den samme SQL-en med sin egen. Finnes
 * regelsettet alt, gjør den heller ingenting.
 */
import { createHash } from 'node:crypto'
import importert from '../src/domain/__tests__/fasit/etg-import.json'

export const ETG_IMPORTKILDE = 'Importert fra EtG/EtS-modulen i OUSFAR (src/domain/etg.ts)'

/** SQL-en som lager og publiserer kommentarene og regelsettet, med `brukernavn` som forfatter. */
export function etgImportSql(brukernavn: string, migrasjon: string): string {
  if (!/^[a-z0-9._-]+$/.test(brukernavn)) throw new Error('Ugyldig brukernavn.')
  if (!/^[0-9]{14}_[a-z0-9_]+\.sql$/.test(migrasjon)) throw new Error('Ugyldig filnavn for migrasjonen.')
  const data = JSON.stringify(importert)
  if (data.includes('$data$')) throw new Error('Importdataene kan ikke inneholde $data$.')
  const kontrollsum = createHash('md5').update(data).digest('hex')
  return `-- Fortolkningen av EtG og EtS som scenarioregelsett, med kommentarene som egne objekter.
-- Laget med etgImportSql('${brukernavn}', '${migrasjon}') i scripts/etg-import.ts;
-- testene kontrollerer at fila er lik det den gir.
select intern.endring_start('claude-code', '${migrasjon}', 'EtG og EtS fortolkes med et scenarioregelsett i databasen i stedet for tekstene i appen');
do $import$
declare
  importdata constant text := $data$${data}$data$;
  data jsonb := importdata::jsonb;
  forfatter public.profiles;
  kommentar jsonb;
  regelsett jsonb;
  ider jsonb := '{}';
  status public.objektstatus;
begin
  if md5(importdata) <> '${kontrollsum}' then
    raise exception 'Importdataene er ikke de som ble laget: kontrollsummen stemmer ikke.';
  end if;
  if (select auth.uid()) is not null then
    raise exception 'Importen kjøres uten innlogget bruker, slik at objektene hører til det opprinnelige fagmiljøet.';
  end if;
  select p.* into forfatter from public.profiles p where p.username = '${brukernavn}';
  if not found then
    raise notice 'Reglene for EtG og EtS er ikke importert: ${brukernavn} finnes ikke her.';
    return;
  end if;
  if exists (
    select 1 from public.scenarioregelsett s
    where s.modul in (select r ->> 'modul' from jsonb_array_elements(data -> 'regelsett') r)
  ) then
    raise notice 'Reglene for EtG og EtS er alt importert.';
    return;
  end if;
  perform set_config('far.revisjonskilde', '${ETG_IMPORTKILDE}', true);

  for kommentar in
    select k from jsonb_array_elements(data -> 'kommentarer') with ordinality as x(k, nr) order by nr
  loop
    status := intern.opprett_objekt_som('kommentar', gen_random_uuid(), kommentar -> 'innhold', forfatter);
    perform intern.publiser_objekt(status.id, status.revisjon, forfatter);
    ider := ider || jsonb_build_object(kommentar ->> 'id', status.id);
  end loop;

  for regelsett in
    select r from jsonb_array_elements(data -> 'regelsett') with ordinality as x(r, nr) order by nr
  loop
    -- Nøklene i grunnlaget byttes med ID-ene kommentarene fikk.
    regelsett := jsonb_set(regelsett, '{scenarier}', (
      select jsonb_agg(
        jsonb_set(s, '{utfall,plasseringer}', (
          select coalesce(jsonb_agg(
            jsonb_set(p, '{kommentar}', coalesce(ider -> (p ->> 'kommentar'), 'null'::jsonb)) order by pn
          ), '[]')
          from jsonb_array_elements(s #> '{utfall,plasseringer}') with ordinality as y(p, pn)
        ))
        order by sn
      )
      from jsonb_array_elements(regelsett -> 'scenarier') with ordinality as x(s, sn)
    ));
    status := intern.opprett_objekt_som('scenarioregelsett', gen_random_uuid(), regelsett, forfatter);
    perform intern.publiser_objekt(status.id, status.revisjon, forfatter);
  end loop;
end
$import$;
`
}
