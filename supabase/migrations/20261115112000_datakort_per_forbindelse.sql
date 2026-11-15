-- De felles datakortene kobles til forbindelsen analysen måler, ikke til et
-- laboratoriums analyttkode (#395 punkt 3, docs/fagmiljoer.md,
-- «Analyttkatalogen per fagmiljø», og docs/faginnhold.md, «Datakortene per
-- forbindelse»).
--
-- Et datakort for en metabolitt på moderstoffets fagside sa til nå hvilken
-- analyttkode det gjaldt, med OUS Klinisk farmakologi sin kode:
-- referanseområdet for O-desmetyltramadol på tramadolsiden hadde
-- `data.gjelder = 'OTRAM'`. Et annet fagmiljø med en annen kode fikk ikke
-- kortet koblet til sin analyse, og så ikke kortet på fagsiden.
--
-- Nå sier kortet hvilken forbindelse det gjelder, med nøkkelen i
-- forbindelsesregisteret (src/data/forbindelser.ts):
-- `data.gjelder = 'o-desmetyltramadol'`. Kortene uten `gjelder` er sidens
-- egne, som før. Fagmiljøets analyttkatalog sier for hver av sine koder hvilken
-- forbindelse analysen måler (`analyttkatalog_koder.forbindelse`) og
-- uttrykkelig hvilke kort på siden til kodens primære stoff den bruker
-- (`analyttkatalog_koder.datakort`): sidens egne (`egne`), dem for
-- forbindelsen (`forbindelse`), eller ingen. Appen kobler koden til kortet
-- gjennom det (`datakortnokkel` i src/domain/koblinger.ts). Til nå fulgte det av
-- rekkefølgen: den første primære koden for et stoff fikk sidens egne kort.
--
-- Her: kolonnene, og katalogen gir dem med. Verdiene for kodene til OUS
-- Klinisk farmakologi og omskrivingen av kortet kommer i neste migrasjon
-- (`*_analyttforbindelser_ous.sql`), som også stenger for analyttkoder i
-- `gjelder`.
--
-- Tilbakeføring: en ny migrasjon som fjerner kolonnene og gir katalogen uten
-- dem. Appen før denne endringen leser ikke feltene.

alter table public.analyttkatalog_koder
  add column forbindelse text,
  add column datakort text,
  add constraint analyttkatalog_koder_forbindelse check (
    forbindelse is null or (char_length(forbindelse) <= 120 and forbindelse ~ '^[a-z0-9][a-z0-9-]*$')
  ),
  add constraint analyttkatalog_koder_datakort check (
    datakort is null or datakort = 'egne' or (datakort = 'forbindelse' and forbindelse is not null)
  );

comment on column public.analyttkatalog_koder.forbindelse is
  'Forbindelsen analysen måler: nøkkelen i forbindelsesregisteret (src/data/forbindelser.ts), eller null når den ikke er én forbindelse (sumanalysene). Se docs/fagmiljoer.md.';
comment on column public.analyttkatalog_koder.datakort is
  'De felles datakortene på siden til kodens primære stoff analysen bruker: egne (sidens egne, uten gjelder), forbindelse (dem med forbindelsen i gjelder) eller null (ingen; kortene gjelder serum). Se docs/fagmiljoer.md.';

-- Som i P4c, med forbindelsen og datakortene til hver kode.
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

comment on index public.innholdselementer_enkeltelement_idx is
  'Kortene som bare kan stå én gang per side og panel — datakortene én gang per forbindelse (data.gjelder). Samme typer som ENKELTELEMENTER i src/faginnhold/paneler.ts.';
