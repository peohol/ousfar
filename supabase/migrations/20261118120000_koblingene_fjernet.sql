-- destruktiv-godkjent: Peder 2026-11-18, sletter analyttkatalog_koblinger, analyttkoblede_stoffer og kolonnene forbindelse og datakort i analyttkatalog_koder (overgangen etter #454, #405)
--
-- Fortolkningen og fagsidene er adskilte domener (docs/domener.md). Dette er
-- slutten på overgangen fra da analyttkodene var koblet til fagsidene:
--
-- 1. Et datakort med en analyttkode i `gjelder` (i produksjonen bare OTRAM på
--    tramadolsiden) skrives om til forbindelsen koden måler i OUS Klinisk
--    farmakologi, som kodene ble koblet for, med tallene uendret. Den
--    publiserte versjonen og utkastet skrives om hver for seg, og et
--    upublisert utkast forblir upublisert. Det føres som én endring av Claude
--    Code.
-- 2. `gjelder` på et datakort i «Viktige data» kan bare være en
--    forbindelsesnøkkel (små bokstaver, tall og bindestrek), aldri en
--    analyttkode.
-- 3. Katalogen gir ikke lenger koblingene, forbindelsene og datakortbruken, og
--    tabellene, kolonnene og funksjonene bare appen fra før brukte, slettes.
--
-- Alt skjer i én transaksjon. En fane med appen fra før skillet (#454)
-- beholder katalogen og referanseområdene den har hentet, når en ny henting
-- feiler, og viser en feil for det den henter på nytt. Den får aldri lest
-- kortet uten koden mens `les_stoffreferanseomrader` finnes
-- (docs/domener.md, «Overgangen»).

select intern.endring_start(
  'claude-code',
  '20261118120000_koblingene_fjernet.sql',
  'Datakortet for en metabolitt gjelder forbindelsen, ikke analysekoden til et laboratorium',
  array['https://github.com/peohol/ousfar/pull/457']::text[]
);

do $omskriving$
declare
  -- Kodene i fagmiljøet kodene ble koblet for (analyttkodene er bare unike
  -- innenfor et fagmiljø), og OTRAM, som katalogen ikke ga en forbindelse.
  forbindelser jsonb;
  forfatter public.profiles;
  kortet uuid;
  utkast integer;
  publisert integer;
  gammelt_publisert jsonb;
  omskrevet jsonb;
begin
  perform set_config('far.revisjonskilde', 'Datakortet gjelder forbindelsen, ikke analysekoden', true);
  select jsonb_build_object('OTRAM', 'o-desmetyltramadol') || coalesce(jsonb_object_agg(k.kode, k.forbindelse), '{}'::jsonb)
  into forbindelser
  from public.analyttkatalog_koder k
  where k.fagmiljo_id = intern.opprinnelig_fagmiljo()
    and k.datakort = 'forbindelse'
    and k.forbindelse is not null;

  for kortet in
    select distinct e.objekt_id
    from public.innholdselementer e
    where e.panel = 'viktige_data'
      and e.data ->> 'gjelder' is not null
      and e.data ->> 'gjelder' !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  loop
    if forfatter.id is null then
      select p.* into forfatter from public.profiles p where p.username = 'peohol';
      if forfatter.id is null then
        raise exception 'Fant ikke profilen revisjonene skal føres på.';
      end if;
    end if;

    select max(t.revisjon) filter (where t.tilstand = 'utkast'), max(t.revisjon) filter (where t.tilstand = 'publisert')
    into utkast, publisert
    from public.objekttilstander t
    where t.objekt_id = kortet;

    -- Hver versjon får forbindelsen til sin egen kode; resten er uendret.
    gammelt_publisert := case when publisert is not null then intern.les('innholdselement', kortet, 'publisert') end;
    select jsonb_object_agg(v.tilstand, case
        when v.innhold #>> '{data,gjelder}' is null
          or v.innhold #>> '{data,gjelder}' ~ '^[a-z0-9]+(-[a-z0-9]+)*$' then v.innhold
        when forbindelser ? (v.innhold #>> '{data,gjelder}')
          then jsonb_set(v.innhold, '{data,gjelder}', forbindelser -> (v.innhold #>> '{data,gjelder}'))
      end)
    into omskrevet
    from (values ('publisert', gammelt_publisert), ('utkast', intern.les('innholdselement', kortet, 'utkast'))) v (tilstand, innhold)
    where v.innhold is not null;
    if exists (select from jsonb_each(omskrevet) o where o.value = 'null'::jsonb) then
      raise exception 'Datakortet % har en kode i gjelder som ingen forbindelse svarer til. Ingenting er endret.', kortet;
    end if;

    -- Den publiserte versjonen publiseres på nytt med forbindelsen. Er det et
    -- upublisert utkast, lagres det etterpå som før, med forbindelsen, og
    -- forblir upublisert.
    if publisert is not null and omskrevet -> 'publisert' is distinct from gammelt_publisert then
      perform intern.lagre_objekt(kortet, utkast, omskrevet -> 'publisert', forfatter);
      perform intern.publiser_objekt(kortet, (intern.status(kortet)).revisjon, forfatter);
    end if;
    perform intern.lagre_objekt(kortet, (intern.status(kortet)).revisjon, omskrevet -> 'utkast', forfatter);
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
