/**
 * Importen av analyttkatalogen til OUS Klinisk farmakologi til databasen
 * (P4c, docs/fagmiljoer.md, «Analyttkatalogen per fagmiljø»).
 *
 * Grunnlaget er katalogen slik den sto i klientpakken
 * (`src/domain/ouskatalog.ts`): analysemetodene, oppføringene i søket med
 * kodene sine, og koblingene fra kodene til stoffene. Importen ligger som en
 * datamigrering (`*_analyttkatalog_ous_import.sql`), laget med
 * `analyttkatalogImportSql()`; testene kontrollerer at fila er lik det den
 * gir, og at katalogen databasen gir tilbake, er den samme som grunnlaget.
 *
 * Katalogen legges i det opprinnelige fagmiljøet
 * (`intern.opprinnelig_fagmiljo()`, beslutning D1), og bare der. Har
 * fagmiljøet alt en katalog, gjør importen ingenting.
 */
import { createHash } from 'node:crypto'
import type { Katalogdata } from '../src/domain/analyttkatalog'
import { OUS_KATALOGDATA } from '../src/domain/ouskatalog'

/** Grunnlaget slik det legges inn: alt utenom fagmiljøet, som databasen setter. */
export function analyttkatalogGrunnlag(data: Katalogdata = OUS_KATALOGDATA): Omit<Katalogdata, 'fagmiljo'> {
  const { metoder, oppforinger, koblinger } = data
  return { metoder, oppforinger, koblinger }
}

/** SQL-en som legger katalogen inn i det opprinnelige fagmiljøet. */
export function analyttkatalogImportSql(data: Katalogdata = OUS_KATALOGDATA): string {
  const grunnlag = JSON.stringify(analyttkatalogGrunnlag(data))
  if (grunnlag.includes('$data$')) throw new Error('Importdataene kan ikke inneholde $data$.')
  const kontrollsum = createHash('md5').update(grunnlag).digest('hex')
  return `-- Analyttkatalogen til OUS Klinisk farmakologi, slik den sto i klientpakken.
-- Laget med analyttkatalogImportSql() i scripts/analyttkatalog-import.ts;
-- testene kontrollerer at fila er lik det den gir.
do $import$
declare
  importdata constant text := $data$${grunnlag}$data$;
  data jsonb := importdata::jsonb;
  fagmiljo uuid := intern.opprinnelig_fagmiljo();
begin
  if md5(importdata) <> '${kontrollsum}' then
    raise exception 'Importdataene er ikke de som ble laget: kontrollsummen stemmer ikke.';
  end if;
  if exists (select 1 from public.analyttkatalog_oppforinger o where o.fagmiljo_id = fagmiljo) then
    raise notice 'Analyttkatalogen til OUS Klinisk farmakologi er alt importert.';
    return;
  end if;

  insert into public.analyttkatalog_metoder (fagmiljo_id, kode, beskrivelse, posisjon)
  select fagmiljo, m ->> 'kode', m ->> 'beskrivelse', nr
  from jsonb_array_elements(data -> 'metoder') with ordinality as x(m, nr);

  insert into public.analyttkatalog_oppforinger (
    fagmiljo_id, nokkel, posisjon, type, navn, visningsnavn, undertittel, komponenter, gruppe,
    analysemetode, kategori, enhet, maleomrade, antihypertensiv, aliaser
  )
  select
    fagmiljo, o ->> 'nokkel', nr, o ->> 'type', o ->> 'navn', o ->> 'visningsnavn', o ->> 'undertittel',
    array(select jsonb_array_elements_text(o -> 'komponenter')), o ->> 'gruppe',
    o ->> 'analysemetode', o ->> 'kategori', o ->> 'enhet', o -> 'maleomrade',
    nullif(o -> 'antihypertensiv', 'null'::jsonb),
    array(select jsonb_array_elements_text(o -> 'aliaser'))
  from jsonb_array_elements(data -> 'oppforinger') with ordinality as x(o, nr);

  insert into public.analyttkatalog_koder (fagmiljo_id, nokkel, posisjon, kode, navn)
  select fagmiljo, o ->> 'nokkel', kn, k ->> 'kode', k ->> 'navn'
  from jsonb_array_elements(data -> 'oppforinger') as x(o),
       jsonb_array_elements(o -> 'koder') with ordinality as y(k, kn);

  insert into public.analyttkatalog_koblinger (fagmiljo_id, posisjon, kode, stoff, relasjon, primar, merknad)
  select fagmiljo, nr, k ->> 'kode', k ->> 'stoff', k ->> 'relasjon', (k ->> 'primar')::boolean, k ->> 'merknad'
  from jsonb_array_elements(data -> 'koblinger') with ordinality as x(k, nr);
end
$import$;
`
}
