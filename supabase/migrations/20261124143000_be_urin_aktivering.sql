-- Aktiveringen av den tentative fortolkningen av benzoylekgonin i urin
-- (#562, docs/benzoylekgonin-urin.md) i OUS Klinisk farmakologi, etter Peders
-- kliniske avklaringer og godkjenning 24.11.2026:
--
-- 1. Kurvene viser benzoylekgonin/kreatinin i de samme enhetene som tastes
--    inn: kvotientfaktor 1, og enhetene står uten navn (tom tekst), som i
--    THC-syremodulen.
-- 2. Analysen hører til metoden URUS, som opprettes her, og får koden UBEZ
--    inntil videre. BEZ1 (serum, SRUS) er urørt.
-- 3. Måleusikkerheten er THC-syreregelsettets (IRCAK): CV for benzoylekgonin
--    er THC-syrens (0,2), CV for kreatinin er kreatininens (0,05), slik
--    regelsettet ble importert (20260923070149_thc_regelsett_import.sql). De
--    står fast i denne modellversjonen. Har det publiserte regelsettet i
--    fagmiljøet andre verdier når migrasjonen kjører, stopper den, og ingenting
--    aktiveres.
-- 4. Det ekstrapolerte området behandles som i THC-syre: ekstrapolert
--    bakover, med merknaden i beregningen, uten stoppgrense.
-- 5. Modellen er godkjent.
--
-- Kurvene er bestillingens, med alle oppgitte sifre. Marginene og z er de
-- samme som THC-syreregelsettets.
--
-- En app uten typen `be_urin` får ikke oppføringen eller metoden URUS
-- (20261124140000_analyttkatalog_etter_klientens_typer.sql).
--
-- Tilbakeføring: en ny migrasjon som sletter oppføringen `be-urin` (kodene
-- følger med), metoden URUS og modellen i OUS Klinisk farmakologi. Ingen
-- brukerdata er knyttet til dem.

select intern.endring_start('claude-code', '20261124143000_be_urin_aktivering.sql',
  'Tentativ fortolkning av benzoylekgonin i urin (UBEZ, metoden URUS) aktivert i OUS Klinisk farmakologi',
  array['https://github.com/peohol/ousfar/pull/565']::text[]);

do $$
declare
  ous uuid;
  godkjent_cv_be constant double precision := 0.2;
  godkjent_cv_kreatinin constant double precision := 0.05;
  avvik boolean;
  versjon constant text := 'ous-kf-2026-11-24';
begin
  select f.id into ous from public.fagmiljoer f where f.navn = 'OUS Klinisk farmakologi';
  if ous is null then
    raise exception 'Fant ikke fagmiljøet OUS Klinisk farmakologi.' using errcode = 'P0002';
  end if;

  -- Samme måleusikkerhet som THC-syreregelsettet: ellers stopper aktiveringen.
  -- (En database uten regelsettet, som testdatabasen, har ingenting å avvike fra.)
  select exists (
    select 1 from public.thc_regelsett r
    where r.fagmiljo_id = ous and r.tilstand = 'publisert'
      and (r.cv_thc <> godkjent_cv_be or r.cv_kreatinin <> godkjent_cv_kreatinin)
  ) into avvik;
  if avvik then
    raise exception 'THC-syreregelsettet i OUS Klinisk farmakologi har en annen måleusikkerhet enn den godkjente modellen.'
      using errcode = '23514';
  end if;

  insert into public.be_urin_modeller (fagmiljo_id, versjon, modell)
  values (ous, versjon, jsonb_build_object(
    'versjon', versjon,
    'enheter', jsonb_build_object('benzoylekgonin', '', 'kreatinin', '', 'kvotient', ''),
    'kvotientfaktor', 1,
    'kurver', jsonb_build_array(
      jsonb_build_object('navn', 'Utskillelsesprofil 1', 'a1', 107.189780, 'k1', 0.07822197, 'a2', 3.879389, 'k2', 0.00796211),
      jsonb_build_object('navn', 'Utskillelsesprofil 2', 'a1', 115.772143, 'k1', 0.408875962, 'a2', 4.569599, 'k2', 0.015911821)
    ),
    'maleusikkerhet', jsonb_build_object('cv_benzoylekgonin', godkjent_cv_be, 'cv_kreatinin', godkjent_cv_kreatinin),
    'sikkerhetsmarginer', jsonb_build_array(
      jsonb_build_object('margin', 0.5, 'z', 0),
      jsonb_build_object('margin', 0.9, 'z', -1.2815515655446008),
      jsonb_build_object('margin', 0.99, 'z', -2.3263478740408408)
    ),
    'standard_sikkerhetsmargin', 0.9
  ));

  insert into public.analyttkatalog_metoder (fagmiljo_id, kode, beskrivelse, posisjon)
  select ous, 'URUS', 'Stoffer med ruspotensial i urin', coalesce(max(m.posisjon), -1) + 1
  from public.analyttkatalog_metoder m where m.fagmiljo_id = ous;

  insert into public.analyttkatalog_oppforinger (
    fagmiljo_id, nokkel, posisjon, type, navn, visningsnavn, gruppe, analysemetode, maleomrade, aliaser
  )
  select ous, 'be-urin', coalesce(max(o.posisjon), -1) + 1, 'be_urin', 'Benzoylekgonin i urin',
    'Benzoylekgonin i urin', 'Rusmiddelanalyse', 'URUS', '{"tekst":"","deler":[]}'::jsonb, array['UBEZ', 'kokain']
  from public.analyttkatalog_oppforinger o where o.fagmiljo_id = ous;

  insert into public.analyttkatalog_koder (fagmiljo_id, nokkel, posisjon, kode, navn)
  values (ous, 'be-urin', 0, 'UBEZ', 'Benzoylekgonin');

  raise log '#562: modellen % lagt inn med CV benzoylekgonin % og kreatinin %', versjon, godkjent_cv_be, godkjent_cv_kreatinin;
end;
$$;
