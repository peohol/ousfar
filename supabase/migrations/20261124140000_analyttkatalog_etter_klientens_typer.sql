-- Analyttkatalogen gir hver app bare de fortolkningstypene den kjenner
-- (#562, funn fra kontrollen av #565; docs/fagmiljoer.md, «Analyttkatalogen
-- per fagmiljø»).
--
-- Appen avviser hele katalogen når den har en type den ikke kjenner. En fane
-- som ble åpnet før en ny type kom, ville derfor mistet alle fortolkningene
-- sine så snart en oppføring av den nye typen ble lagt inn, også ved et bytte
-- av fagmiljø. Appen sender nå typene den kjenner i overskriften
-- `x-far-fortolkningstyper` (kommaskilt), og katalogen gir bare oppføringene
-- av dem. En app som ikke sender overskriften, er fra før denne endringen og
-- kjenner typene som fantes da: konsentrasjon, scenario, thc og etg. Den
-- listen er fast; nye typer kommer i overskriften fra appene som kjenner dem.
--
-- En analysemetode som bare har oppføringer appen ikke får, gis heller ikke,
-- så den står ikke som et tomt filter. En metode uten noen oppføringer er som
-- før.
--
-- Rekkefølgen ved utrullingen spiller ingen rolle: en database uten denne
-- endringen ser bort fra overskriften.

create or replace function public.les_analyttkatalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  oppgitt text := intern.foresporselsfelt('x-far-fortolkningstyper');
  typer text[] := case
    when oppgitt is null then array['konsentrasjon', 'scenario', 'thc', 'etg']
    else array(select btrim(t) from unnest(string_to_array(oppgitt, ',')) t where btrim(t) <> '')
  end;
begin
  perform intern.krev_aktivt_medlemskap();
  return (
  with kontekst as (
    select f.id, f.navn
    from public.fagmiljoer f
    where intern.har_aktivt_medlemskap((select auth.uid()))
      and f.id = intern.arbeidsfagmiljo((select auth.uid()))
  ), synlige as (
    select o.*
    from public.analyttkatalog_oppforinger o
    where o.fagmiljo_id = (select id from kontekst)
      and o.type = any (typer)
  )
  select jsonb_build_object(
    'fagmiljo', (select jsonb_build_object('id', k.id, 'navn', k.navn) from kontekst k),
    'metoder', coalesce((
      select jsonb_agg(jsonb_build_object('kode', m.kode, 'beskrivelse', m.beskrivelse) order by m.posisjon)
      from public.analyttkatalog_metoder m
      where m.fagmiljo_id = (select id from kontekst)
        and (
          exists (select 1 from synlige s where s.analysemetode = m.kode)
          or not exists (
            select 1 from public.analyttkatalog_oppforinger o
            where o.fagmiljo_id = m.fagmiljo_id and o.analysemetode = m.kode
          )
        )
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
            'kode', k.kode, 'navn', k.navn, 'referanseomrade', k.referanseomrade
          ) order by k.posisjon)
          from public.analyttkatalog_koder k
          where k.fagmiljo_id = o.fagmiljo_id and k.nokkel = o.nokkel
        ), '[]'::jsonb)
      ) order by o.posisjon)
      from synlige o
    ), '[]'::jsonb)
  )
  );
end;
$$;
