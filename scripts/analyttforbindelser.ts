/**
 * Forbindelsene analyttkodene til OUS Klinisk farmakologi måler og datakortene
 * de bruker (#395 punkt 3, docs/fagmiljoer.md, «De felles datakortene»).
 *
 * Grunnlaget er `src/data/analyttforbindelser.json` (gjennom
 * `OUS_ANALYTTFORBINDELSER` i `src/domain/ouskatalog.ts`). Migrasjonen
 * (`*_analyttforbindelser_ous.sql`) er laget med
 * `analyttforbindelserSql(<filnavnet>)`, og testene kontrollerer at fila er lik
 * det den gir. Den setter forbindelsen og datakortene på kodene i katalogen til
 * det opprinnelige fagmiljøet (`intern.opprinnelig_fagmiljo()`), og bare der,
 * og lar `les_analyttkatalog()` gi dem, i samme transaksjon. Kjøres den igjen,
 * gjør den ingenting.
 *
 * Faginnholdet endres ikke: kortet med en analyttkode i `gjelder` står som før,
 * så appen fra før denne endringen finner det fortsatt, og den nye appen leser
 * det som kortet for forbindelsen koden måler (`kortetsForbindelse` i
 * `src/faginnhold/datakortplasser.ts`). Omskrivingen av kortet kommer i et
 * eget, senere trinn (#405).
 *
 * Migrasjonen er kjørt. Appen bruker ikke lenger forbindelsene og datakortene
 * i katalogen: fortolkningen og fagsidene er adskilte domener
 * (`docs/domener.md`).
 */
import { createHash } from 'node:crypto'
import { OUS_ANALYTTFORBINDELSER, type Analyttforbindelse } from '../src/domain/ouskatalog'

type Grunnlag = ReadonlyMap<string, Analyttforbindelse>

/** Kodene med forbindelsen og datakortene, i kodenes rekkefølge, slik migrasjonen legger dem inn. */
export function analyttforbindelserGrunnlag(forbindelser: Grunnlag = OUS_ANALYTTFORBINDELSER) {
  return [...forbindelser].map(([kode, { forbindelse, datakort }]) => ({ kode, forbindelse, datakort }))
}

/**
 * Katalogen med forbindelsen og datakortene, i samme transaksjon som verdiene:
 * før den gir katalogen ikke feltene, og appen bruker den gamle koblingen
 * (`lesKatalogdata` i `src/domain/analyttkatalog.ts`).
 */
const KATALOGEN = `-- Katalogen som i P4c, med forbindelsen og datakortene til hver kode. Her og
-- ikke i forrige migrasjon: appen bruker feltene først når verdiene er satt.
create or replace function public.les_analyttkatalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  return (
  with kontekst as (
    select f.id, f.navn
    from public.fagmiljoer f
    where intern.har_aktivt_medlemskap((select auth.uid()))
      and f.id = intern.arbeidsfagmiljo((select auth.uid()))
  )
  select jsonb_build_object(
    'fagmiljo', (select jsonb_build_object('id', k.id, 'navn', k.navn) from kontekst k),
    'metoder', coalesce((
      select jsonb_agg(jsonb_build_object('kode', m.kode, 'beskrivelse', m.beskrivelse) order by m.posisjon)
      from public.analyttkatalog_metoder m
      where m.fagmiljo_id = (select id from kontekst)
    ), '[]'::jsonb),
    'oppforinger', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nokkel', o.nokkel,
        'type', o.type,
        'navn', o.navn,
        'visningsnavn', o.visningsnavn,
        'undertittel', o.undertittel,
        'komponenter', to_jsonb(o.komponenter),
        'gruppe', o.gruppe,
        'analysemetode', o.analysemetode,
        'kategori', o.kategori,
        'enhet', o.enhet,
        'maleomrade', o.maleomrade,
        'antihypertensiv', o.antihypertensiv,
        'aliaser', to_jsonb(o.aliaser),
        'koder', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kode', k.kode, 'navn', k.navn, 'forbindelse', k.forbindelse, 'datakort', k.datakort
          ) order by k.posisjon)
          from public.analyttkatalog_koder k
          where k.fagmiljo_id = o.fagmiljo_id and k.nokkel = o.nokkel
        ), '[]'::jsonb)
      ) order by o.posisjon)
      from public.analyttkatalog_oppforinger o
      where o.fagmiljo_id = (select id from kontekst)
    ), '[]'::jsonb),
    'koblinger', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kode', k.kode, 'stoff', k.stoff, 'relasjon', k.relasjon, 'primar', k.primar, 'merknad', k.merknad
      ) order by k.posisjon)
      from public.analyttkatalog_koblinger k
      where k.fagmiljo_id = (select id from kontekst)
    ), '[]'::jsonb)
  )
  );
end;
$$;
`

export function analyttforbindelserSql(migrasjon: string, forbindelser: Grunnlag = OUS_ANALYTTFORBINDELSER): string {
  if (!/^[0-9]{14}_[a-z0-9_]+\.sql$/.test(migrasjon)) throw new Error('Ugyldig filnavn for migrasjonen.')
  const data = JSON.stringify(analyttforbindelserGrunnlag(forbindelser))
  if (data.includes('$data$')) throw new Error('Importdataene kan ikke inneholde $data$.')
  const kontrollsum = createHash('md5').update(data).digest('hex')
  return `-- Forbindelsene analyttkodene til OUS Klinisk farmakologi måler og datakortene
-- de bruker. Laget med analyttforbindelserSql('${migrasjon}') i scripts/analyttforbindelser.ts;
-- testene kontrollerer at fila er lik det den gir. Faginnholdet endres ikke.
do $import$
declare
  importdata constant text := $data$${data}$data$;
  data jsonb := importdata::jsonb;
begin
  if md5(importdata) <> '${kontrollsum}' then
    raise exception 'Importdataene er ikke de som ble laget: kontrollsummen stemmer ikke.';
  end if;

  update public.analyttkatalog_koder k
  set forbindelse = d ->> 'forbindelse', datakort = d ->> 'datakort'
  from jsonb_array_elements(data) as x(d)
  where k.fagmiljo_id = intern.opprinnelig_fagmiljo() and k.kode = d ->> 'kode'
    and (k.forbindelse, k.datakort) is distinct from (d ->> 'forbindelse', d ->> 'datakort');
end
$import$;

${KATALOGEN}`
}
