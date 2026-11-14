-- Fjerner de fem gamle globale nøklene på fortolkningen, slik at to fagmiljøer
-- kan ha samme analyttkode og samme modul med hver sine regler og kommentarer
-- (docs/fagmiljoer.md, «Fortolkningen per fagmiljø»).
--
-- destruktiv-godkjent: Peder 2026-11-15, fjerner de fem globale unike nøklene på fortolkningen («Ja, vi må endre systemet slik at hvert fagmiljø har sine egne analyttkoder»)
--
-- Krevde Peders uttrykkelige godkjenning, gitt 2026-11-15. Migrasjonen sletter
-- ingen rader, men fjerner en garanti databasen har gitt siden starten: at det
-- finnes ett regelsett per kode i hele appen. Etter den står bare garantien per
-- fagmiljø, fra nøklene den forrige migrasjonen la til
-- (20261114202000_fortolkning_per_fagmiljo.sql).
--
-- Det som må være på plass, og som kontrolleres under, før nøklene fjernes:
--
-- * hver rad har et fagmiljø, og hvert fagmiljø har sin nøkkel per kode og modul;
-- * hvert oppslag i fortolkningen og hver skrivefunksjon velger etter fagmiljøet
--   (kontrollert av testene i src/__tests__/fortolkningPerFagmiljo.test.ts).
--
-- Risiko: lav for dataene (ingen rader endres, og alle i produksjonen hører i
-- dag til OUS Klinisk farmakologi). Låsene er korte; tabellene er små.
--
-- Tilbakeføring: en ny migrasjon som legger nøklene inn igjen, så lenge ingen
-- kode finnes i to fagmiljøer:
--
--   alter table public.laboratorieanalytter
--     add constraint laboratorieanalytter_kode_entydig unique (tilstand, kode);
--   alter table public.intervallregelsett
--     add constraint intervallregelsett_analyttkode_entydig unique (tilstand, analyttkode);
--   create unique index scenarioregelsett_modul_idx on public.scenarioregelsett (tilstand, modul);
--   create unique index scenarioanalytter_kode_idx on public.scenarioanalytter (tilstand, kode);
--   create unique index thc_regelsett_ett_idx on public.thc_regelsett (tilstand);
--
-- Har et annet fagmiljø fått en kode som også finnes i OUS Klinisk farmakologi,
-- feiler tilbakeføringen med en tydelig feil og endrer ingenting; da må den
-- ene raden arkiveres først.

do $$
declare
  mangler text;
begin
  select string_agg(t, ', ') into mangler
  from (
    select 'laboratorieanalytter' t where exists (select 1 from public.laboratorieanalytter where fagmiljo_id is null)
    union all select 'intervallregelsett' where exists (select 1 from public.intervallregelsett where fagmiljo_id is null)
    union all select 'scenarioregelsett' where exists (select 1 from public.scenarioregelsett where fagmiljo_id is null)
    union all select 'scenarioanalytter' where exists (select 1 from public.scenarioanalytter where fagmiljo_id is null)
    union all select 'thc_regelsett' where exists (select 1 from public.thc_regelsett where fagmiljo_id is null)
  ) x;
  if mangler is not null then
    raise exception 'Rader uten fagmiljø i %; de gamle nøklene står.', mangler;
  end if;

  select string_agg(n, ', ') into mangler
  from unnest(array[
    'laboratorieanalytter_fagmiljo_kode_entydig',
    'intervallregelsett_fagmiljo_analyttkode_entydig',
    'scenarioregelsett_fagmiljo_modul_entydig',
    'scenarioanalytter_fagmiljo_kode_entydig',
    'thc_regelsett_fagmiljo_entydig'
  ]) n
  where not exists (
    select 1 from pg_index i
    join pg_class c on c.oid = i.indexrelid
    join pg_namespace s on s.oid = c.relnamespace
    where s.nspname = 'public' and c.relname = n and i.indisunique and i.indisvalid
  );
  if mangler is not null then
    raise exception 'De nye nøklene per fagmiljø mangler: %; de gamle nøklene står.', mangler;
  end if;
end
$$;

alter table public.laboratorieanalytter drop constraint laboratorieanalytter_kode_entydig;
alter table public.intervallregelsett drop constraint intervallregelsett_analyttkode_entydig;
drop index public.scenarioregelsett_modul_idx;
drop index public.scenarioanalytter_kode_idx;
drop index public.thc_regelsett_ett_idx;
