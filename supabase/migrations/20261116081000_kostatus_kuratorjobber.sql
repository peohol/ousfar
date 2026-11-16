-- Kurateringsgrenene slik kurateringskøen og oppryddingen av kuratorjobbgrenene
-- følger dem (docs/kuratorjobber.md, «Automatisk opprydding av jobbgrener»).
--
-- `public.kuratering_kostatus()` gir også `kuratorjobber`: navnene på
-- kuratorjobbgrenene grenens siste evidensjournal viser til
-- (`docs/kuratorprotokoll.md`, «Dokumentene»). Bare det som står først i hver
-- oppføring og har formen til et grennavn under `kuratorjobb/`, aldri resten
-- av teksten. Grennavnene er offentlige i GitHub. Oppryddingen bruker dem til å
-- beholde en jobbgren en pågående kuratering viser til.
--
-- Ingen data endres; funksjonen erstattes med samme signatur, så tilgangene
-- står som før (bare tjenesterollen).

create or replace function public.kuratering_kostatus()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', g.id,
    'stoff', g.stoff,
    'art', g.art,
    'status', g.status,
    'revisjon', g.revisjon,
    'runde', g.runde,
    'oppdatert_kl', g.oppdatert_kl,
    'publisert_kl', g.publisert_kl,
    'utsatte', coalesce((
      select jsonb_agg(p.nokkel order by p.i)
      from unnest(kuratering.kontrollpunkter()) with ordinality p(nokkel, i)
      where exists (
        select 1 from jsonb_array_elements(case when jsonb_typeof(m.innhold -> 'omrader') = 'array' then m.innhold -> 'omrader' else '[]'::jsonb end) o
        where o ->> 'nokkel' = p.nokkel and o ->> 'status' = 'utsatt_sikkerhetsfilter'
      )
    ), '[]'::jsonb),
    'kuratorjobber', coalesce((
      select jsonb_agg(distinct x.navn)
      from (
        select substring(btrim(j.v) from '^kuratorjobb/[A-Za-z0-9._/-]{1,100}') navn
        from jsonb_array_elements_text(case when jsonb_typeof(e.innhold -> 'kuratorjobber') = 'array' then e.innhold -> 'kuratorjobber' else '[]'::jsonb end) j(v)
      ) x
      where x.navn is not null
    ), '[]'::jsonb)
  ) order by g.opprettet_kl), '[]'::jsonb)
  from kuratering.grener g
  left join lateral (
    select d.innhold from kuratering.dokumenter d
    where d.gren = g.id and d.art = 'dekningsmatrise'
    order by d.versjon desc limit 1
  ) m on true
  left join lateral (
    select d.innhold from kuratering.dokumenter d
    where d.gren = g.id and d.art = 'evidensjournal'
    order by d.versjon desc limit 1
  ) e on true
$$;

comment on function public.kuratering_kostatus() is
  'Kurateringsgrenene slik kurateringskøen og oppryddingen av kuratorjobbgrenene følger dem, med nøklene til de utsatte kontrollpunktene og navnene på kuratorjobbgrenene evidensjournalen viser til: ingen fagtekst. Bare for serveren (docs/kurateringsko.md).';
