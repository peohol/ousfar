-- Tentativ fortolkning av benzoylekgonin i urin (#562,
-- docs/benzoylekgonin-urin.md): plassen for modellen per fagmiljø, og
-- oppføringstypen i analyttkatalogen.
--
-- Migrasjonen legger IKKE inn noen modell eller katalogoppføring. Kurvene er
-- bestilt, men enhetene, kvotientskalaen, den lokale urinkoden og CV-ene for
-- benzoylekgonin og kreatinin er ikke bekreftet. Til de er det, finnes
-- modulen ikke for noen: uten en oppføring i katalogen gir søket den ikke, og
-- uten en modell fortolker den ingenting. Aktiveringen er en egen migrasjon
-- med begge deler, etter Peders kliniske godkjenning.
--
-- Modellen er fagmiljøets egen, som resten av fortolkningen (P4b, P4c):
-- tabellen har radsikkerhet uten regler og ingen rettigheter for
-- nettleseren, og den eneste veien inn er `public.les_be_urin_modell()`, som
-- gir modellen til arbeidskonteksten til den innloggede og ingenting annet.
-- Et fagmiljø uten modell får `null`, aldri et annet fagmiljøs. Den endres
-- med migrasjoner; appen skriver ikke til den. Appen kontrollerer hele
-- modellen før den brukes (`validerBeUrinModell`); kontrollene her holder
-- bare formen.
--
-- Tilbakeføring: en ny migrasjon som fjerner funksjonen og tabellen og setter
-- typekontrollen tilbake. Ingen data går tapt så lenge ingen modell er lagt inn.

alter table public.analyttkatalog_oppforinger
  drop constraint analyttkatalog_oppforinger_type;
alter table public.analyttkatalog_oppforinger
  add constraint analyttkatalog_oppforinger_type
  check (type in ('konsentrasjon', 'scenario', 'thc', 'etg', 'be_urin'));

create table public.be_urin_modeller (
  fagmiljo_id uuid primary key references public.fagmiljoer (id),
  versjon text not null,
  modell jsonb not null,
  endret timestamptz not null default now(),
  constraint be_urin_modeller_versjon check (versjon = btrim(versjon) and char_length(versjon) between 1 and 80),
  -- Uten `coalesce` ville et felt som mangler, gitt null, og null slipper gjennom en kontroll.
  constraint be_urin_modeller_form check (coalesce(
    jsonb_typeof(modell) = 'object'
    and modell ->> 'versjon' = versjon
    and jsonb_typeof(modell -> 'enheter') = 'object'
    and jsonb_typeof(modell -> 'kvotientfaktor') = 'number'
    and jsonb_typeof(modell -> 'kurver') = 'array'
    and jsonb_array_length(modell -> 'kurver') = 2
    and jsonb_typeof(modell -> 'maleusikkerhet') = 'object'
    and jsonb_typeof(modell -> 'maleusikkerhet' -> 'cv_benzoylekgonin') = 'number'
    and jsonb_typeof(modell -> 'maleusikkerhet' -> 'cv_kreatinin') = 'number'
    and jsonb_typeof(modell -> 'sikkerhetsmarginer') = 'array'
    and jsonb_typeof(modell -> 'standard_sikkerhetsmargin') = 'number',
    false
  ))
);

comment on table public.be_urin_modeller is
  '#562: modellen for den tentative fortolkningen av benzoylekgonin i urin, høyst én per fagmiljø. Se docs/benzoylekgonin-urin.md.';

alter table public.be_urin_modeller enable row level security;
revoke all on table public.be_urin_modeller from public, anon, authenticated;

-- Modellen til arbeidskonteksten til den innloggede: fagmiljøet og modellen,
-- eller `null` som modell når fagmiljøet ikke har noen. Uten et aktivt
-- medlemskap stopper den med 42501, som de andre funksjonene. Formen leses av
-- `lesBeUrinModellsvar` i src/domain/beUrinModell.ts.
create function public.les_be_urin_modell()
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
      'modell', (select m.modell from public.be_urin_modeller m where m.fagmiljo_id = (select id from kontekst))
    )
  );
end;
$$;

revoke all on function public.les_be_urin_modell() from public, anon, authenticated, service_role;
grant execute on function public.les_be_urin_modell() to authenticated;

comment on function public.les_be_urin_modell() is
  '#562: modellen for benzoylekgonin i urin i den innloggedes arbeidskontekst; null uten den, aldri et annet fagmiljøs. Se docs/benzoylekgonin-urin.md.';
