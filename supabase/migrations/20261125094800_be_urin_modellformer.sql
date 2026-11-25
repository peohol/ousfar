-- Fortolkningen av benzoylekgonin i urin får en ny modellform med fem
-- utskillelsesprofiler (#570, docs/benzoylekgonin-urin.md, «Modellformene»).
-- Denne migrasjonen gjør det mulig å legge inn en slik modell senere, uten å
-- legge inn noen: modellen i OUS Klinisk farmakologi er uendret
-- (`ous-kf-2026-11-24`, form 1), og aktiveringen er en egen migrasjon.
--
-- 1. Formkontrollen godtar både form 1 (to bieksponentielle profiler i
--    `kurver`, uten feltet `form`) og form 2 (`form` 2 og de fem profilene i
--    `profiler`, hver ID nøyaktig én gang, med riktig type og positive
--    parametre). Appen kontrollerer resten før modellen brukes.
-- 2. `public.les_be_urin_modell()` gir bare en modell av en form appen
--    oppgir at den kjenner, i overskriften `x-far-be-urin-modellformer`
--    (kommaskilt). En app uten overskriften er fra før form 2 og kjenner bare
--    form 1. Får en app en modell av en form den ikke kjenner, stopper kallet
--    med 22023 og en melding om å oppdatere appen, som appen viser; den
--    tolker aldri fem profiler som to. Fagmiljøet er arbeidskontekstens, som
--    før.
--
-- Rekkefølgen ved utrullingen spiller ingen rolle: en database uten denne
-- endringen ser bort fra overskriften, og en app uten den får form 1 som før.
--
-- Tilbakeføring: en ny migrasjon som setter formkontrollen og funksjonen
-- tilbake slik de er i 20261124095000_be_urin_modell.sql (bare mulig så lenge
-- ingen modell av form 2 er lagt inn).

-- Formen modellen har: 1, 2 eller null når den ikke har noen av dem. Brukes i
-- formkontrollen og i lesingen.
create function intern.be_urin_modellform(m jsonb)
returns integer
language sql
immutable
parallel safe
set search_path = ''
as $$
  select case
    when not coalesce(
      jsonb_typeof(m) = 'object'
      and jsonb_typeof(m -> 'versjon') = 'string'
      and jsonb_typeof(m -> 'enheter') = 'object'
      and jsonb_typeof(m -> 'kvotientfaktor') = 'number'
      and jsonb_typeof(m -> 'maleusikkerhet') = 'object'
      and jsonb_typeof(m -> 'maleusikkerhet' -> 'cv_benzoylekgonin') = 'number'
      and jsonb_typeof(m -> 'maleusikkerhet' -> 'cv_kreatinin') = 'number'
      and jsonb_typeof(m -> 'sikkerhetsmarginer') = 'array'
      and jsonb_typeof(m -> 'standard_sikkerhetsmargin') = 'number',
      false
    ) then null
    when coalesce(m -> 'form', '1'::jsonb) = '1'::jsonb then
      case when jsonb_typeof(m -> 'kurver') = 'array' and jsonb_array_length(m -> 'kurver') = 2 then 1 end
    when m -> 'form' = '2'::jsonb then
      case when jsonb_typeof(m -> 'profiler') = 'array' and jsonb_array_length(m -> 'profiler') = 5 and (
        select count(distinct p ->> 'id') = 5 and bool_and(coalesce(
          case
            when jsonb_typeof(p) <> 'object' then false
            when p ->> 'id' in ('enkeltinntak', 'gjentatte_doser', 'moderat') then p ->> 'type' = 'mono' and (
              select bool_and(case when jsonb_typeof(p -> f) = 'number' then (p -> f)::numeric > 0 else false end)
              from unnest(array['a', 'k']) f
            )
            when p ->> 'id' in ('bi_a', 'bi_b') then p ->> 'type' = 'bi' and (
              select bool_and(case when jsonb_typeof(p -> f) = 'number' then (p -> f)::numeric > 0 else false end)
              from unnest(array['a1', 'k1', 'a2', 'k2']) f
            )
            else false
          end,
          false
        ))
        from jsonb_array_elements(m -> 'profiler') p
      ) then 2 end
  end
$$;

revoke all on function intern.be_urin_modellform(jsonb) from public, anon, authenticated;

comment on function intern.be_urin_modellform(jsonb) is
  '#570: formen modellen for benzoylekgonin i urin har (1 eller 2), eller null. Se docs/benzoylekgonin-urin.md.';

alter table public.be_urin_modeller drop constraint be_urin_modeller_form;
alter table public.be_urin_modeller add constraint be_urin_modeller_form check (coalesce(
  intern.be_urin_modellform(modell) is not null and modell ->> 'versjon' = versjon,
  false
));

create or replace function public.les_be_urin_modell()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  oppgitt text := intern.foresporselsfelt('x-far-be-urin-modellformer');
  former integer[] := case
    when oppgitt is null then array[1]
    else array(select btrim(f)::integer from unnest(string_to_array(oppgitt, ',')) f where btrim(f) ~ '^[0-9]{1,3}$')
  end;
  svar jsonb;
begin
  perform intern.krev_aktivt_medlemskap();
  svar := (
    with kontekst as (
      select f.id, f.navn
      from public.fagmiljoer f
      where intern.har_aktivt_medlemskap((select auth.uid()))
        and f.id = intern.arbeidsfagmiljo((select auth.uid()))
    )
    select jsonb_build_object(
      'fagmiljo', (select jsonb_build_object('id', k.id, 'navn', k.navn) from kontekst k),
      'modell', (select m.modell from public.be_urin_modeller m where m.fagmiljo_id = (select id from kontekst))
    )
  );
  if jsonb_typeof(svar -> 'modell') = 'object'
    and not coalesce(intern.be_urin_modellform(svar -> 'modell') = any (former), false) then
    raise exception 'Fortolkningen av benzoylekgonin i urin er oppdatert og krever en nyere utgave av appen. Last inn siden på nytt for å oppdatere.'
      using errcode = '22023';
  end if;
  return svar;
end;
$$;

comment on function public.les_be_urin_modell() is
  '#562/#570: modellen for benzoylekgonin i urin i den innloggedes arbeidskontekst, bare av en form appen oppgir (x-far-be-urin-modellformer); null uten den, aldri et annet fagmiljøs. Se docs/benzoylekgonin-urin.md.';
