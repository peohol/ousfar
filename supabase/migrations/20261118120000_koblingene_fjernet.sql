-- destruktiv-godkjent: Peder 2026-11-18, sletter analyttkatalog_koblinger, analyttkoblede_stoffer og kolonnene forbindelse og datakort i analyttkatalog_koder (overgangen etter #454, #405)
--
-- Fortolkningen og fagsidene er adskilte domener (docs/domener.md). Dette er
-- slutten på overgangen fra da analyttkodene var koblet til fagsidene:
--
-- 1. Et datakort med en analyttkode i `gjelder` (i produksjonen bare OTRAM på
--    tramadolsiden) skrives om til forbindelsen koden måler, med tallene
--    uendret. Det publiserte kortet og utkastet får en ny revisjon hver, ført
--    som en endring av Claude Code.
-- 2. `gjelder` på et datakort i «Viktige data» kan bare være en
--    forbindelsesnøkkel (små bokstaver, tall og bindestrek), aldri en
--    analyttkode.
-- 3. Katalogen gir ikke lenger koblingene, forbindelsene og datakortbruken, og
--    tabellene, kolonnene og funksjonene bare appen fra før brukte, slettes.

select intern.endring_start(
  'claude-code',
  '20261118120000_koblingene_fjernet.sql',
  'Datakortet for en metabolitt gjelder forbindelsen, ikke analysekoden til et laboratorium',
  array['https://github.com/peohol/ousfar/pull/454']::text[]
);

do $omskriving$
declare
  forfatter public.profiles;
  kortet record;
  innhold jsonb;
  utkast integer;
  publisert integer;
begin
  perform set_config('far.revisjonskilde', 'Datakortet gjelder forbindelsen, ikke analysekoden', true);
  for kortet in
    select distinct e.objekt_id, coalesce(
      (select min(k.forbindelse) from public.analyttkatalog_koder k
       where k.kode = e.data ->> 'gjelder' and k.datakort = 'forbindelse' and k.forbindelse is not null),
      case e.data ->> 'gjelder' when 'OTRAM' then 'o-desmetyltramadol' end
    ) as forbindelse
    from public.innholdselementer e
    where e.panel = 'viktige_data'
      and e.data ->> 'gjelder' is not null
      and e.data ->> 'gjelder' !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  loop
    if kortet.forbindelse is null then
      raise exception 'Datakortet % har en kode i gjelder som ingen forbindelse svarer til.', kortet.objekt_id;
    end if;
    if forfatter.id is null then
      select p.* into forfatter from public.profiles p where p.username = 'peohol';
      if forfatter.id is null then
        raise exception 'Fant ikke profilen revisjonene skal føres på.';
      end if;
    end if;

    select max(t.revisjon) filter (where t.tilstand = 'utkast'), max(t.revisjon) filter (where t.tilstand = 'publisert')
    into utkast, publisert
    from public.objekttilstander t
    where t.objekt_id = kortet.objekt_id;
    -- Et utkast med endringer som ikke er publisert, publiseres ikke herfra.
    if publisert is not null and publisert <> utkast then
      raise exception 'Datakortet % har et upublisert utkast. Ingenting er endret.', kortet.objekt_id;
    end if;

    innhold := intern.les('innholdselement', kortet.objekt_id, 'utkast');
    innhold := jsonb_set(innhold, '{data,gjelder}', to_jsonb(kortet.forbindelse));
    perform intern.lagre_objekt(kortet.objekt_id, utkast, innhold, forfatter);
    if publisert is not null then
      perform intern.publiser_objekt(kortet.objekt_id, (intern.status(kortet.objekt_id)).revisjon, forfatter);
    end if;
  end loop;
end;
$omskriving$;

alter table public.innholdselementer add constraint innholdselementer_gjelder_forbindelse check (
  panel <> 'viktige_data'
  or data ->> 'gjelder' is null
  or data ->> 'gjelder' ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
);

-- Katalogen som i 20261118090000, uten det bare appen fra før leste.
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
            'kode', k.kode, 'navn', k.navn, 'referanseomrade', k.referanseomrade
          ) order by k.posisjon)
          from public.analyttkatalog_koder k
          where k.fagmiljo_id = o.fagmiljo_id and k.nokkel = o.nokkel
        ), '[]'::jsonb)
      ) order by o.posisjon)
      from public.analyttkatalog_oppforinger o
      where o.fagmiljo_id = (select id from kontekst)
    ), '[]'::jsonb)
  )
  );
end;
$$;

drop function public.les_stoffreferanseomrader(public.objekttilstand);
drop table public.analyttkatalog_koblinger;
drop table public.analyttkoblede_stoffer;
drop function public.leser_analyttkoblingene();
alter table public.analyttkatalog_koder
  drop column forbindelse,
  drop column datakort;
