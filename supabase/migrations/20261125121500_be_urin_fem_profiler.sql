-- Aktiveringen av fortolkningen av benzoylekgonin i urin med fem
-- utskillelsesprofiler (modellform 2, #570, docs/benzoylekgonin-urin.md) i OUS
-- Klinisk farmakologi. Peder har godkjent kortreglene og tekstene 25.11.2026,
-- og at prøver fra samme dag ikke sammenlignes. Appen med form 2 er i
-- produksjonen (#571, 20261125094800_be_urin_modellformer.sql), så en app uten
-- den får meldingen om å oppdatere og leser aldri fem profiler som to.
--
-- Bare modellen i OUS Klinisk farmakologi byttes, fra `ous-kf-2026-11-24`
-- (form 1) til `ous-kf-2026-11-25` (form 2):
--
-- 1. Enhetene er nmol/L (benzoylekgonin), mmol/L (kreatinin) og nmol/mmol
--    (kvotienten), med kvotientfaktor 1.
-- 2. De tre monoeksponentielle profilene er bestillingens, med alle sifrene:
--    enkeltinntak a = 1, k = 24·ln 2/7; gjentatte doser a = 1, k = 24·ln 2/35;
--    moderat a = 267,2691490332445, k = 0,2891162303589332 (avledet av lokale
--    data; rådataene står ingen steder i repoet).
-- 3. De to bieksponentielle profilene er form-1-modellens kurver, matematisk
--    uendret: `bi_a` er utskillelsesprofil 1 og `bi_b` utskillelsesprofil 2.
--    Hvilken som er treg og hvilken som er ekstrem, avgjøres i appen per
--    sammenligning.
-- 4. Måleusikkerheten er fortsatt THC-syreregelsettets (CV 0,2 og 0,05), og
--    marginene og z er de samme. Har det publiserte regelsettet andre verdier
--    når migrasjonen kjører, stopper den, og ingenting endres.
-- 5. URUS, UBEZ, oppføringen og tilgangen er urørt.
--
-- Migrasjonen stopper også hvis modellen i fagmiljøet ikke er den aktiverte
-- form-1-modellen, så den aldri skriver over en annen modell.
--
-- Tilbakeføring: en ny migrasjon som setter modellen i OUS Klinisk
-- farmakologi tilbake til `ous-kf-2026-11-24`, slik den står i
-- 20261124143000_be_urin_aktivering.sql. Ingen brukerdata er knyttet til
-- modellen.

select intern.endring_start('claude-code', '20261125121500_be_urin_fem_profiler.sql',
  'Fortolkningen av benzoylekgonin i urin bruker fem utskillelsesprofiler i OUS Klinisk farmakologi',
  array['https://github.com/peohol/ousfar/pull/575']::text[]);

do $$
declare
  ous uuid;
  godkjent_cv_be constant double precision := 0.2;
  godkjent_cv_kreatinin constant double precision := 0.05;
  forrige constant text := 'ous-kf-2026-11-24';
  ny_versjon constant text := 'ous-kf-2026-11-25';
  gjeldende jsonb;
  avvik boolean;
begin
  select f.id into ous from public.fagmiljoer f where f.navn = 'OUS Klinisk farmakologi';
  if ous is null then
    raise exception 'Fant ikke fagmiljøet OUS Klinisk farmakologi.' using errcode = 'P0002';
  end if;

  -- Samme måleusikkerhet som THC-syreregelsettet: ellers stopper aktiveringen.
  select exists (
    select 1 from public.thc_regelsett r
    where r.fagmiljo_id = ous and r.tilstand = 'publisert'
      and (r.cv_thc <> godkjent_cv_be or r.cv_kreatinin <> godkjent_cv_kreatinin)
  ) into avvik;
  if avvik then
    raise exception 'THC-syreregelsettet i OUS Klinisk farmakologi har en annen måleusikkerhet enn den godkjente modellen.'
      using errcode = '23514';
  end if;

  select m.modell into gjeldende
  from public.be_urin_modeller m
  where m.fagmiljo_id = ous and m.versjon = forrige and intern.be_urin_modellform(m.modell) = 1
  for update;
  if gjeldende is null then
    raise exception 'Modellen i OUS Klinisk farmakologi er ikke % (form 1); ingenting er endret.', forrige
      using errcode = '23514';
  end if;

  update public.be_urin_modeller m
  set versjon = ny_versjon,
      modell = jsonb_build_object(
        'form', 2,
        'versjon', ny_versjon,
        'enheter', jsonb_build_object('benzoylekgonin', 'nmol/L', 'kreatinin', 'mmol/L', 'kvotient', 'nmol/mmol'),
        'kvotientfaktor', 1,
        'profiler', jsonb_build_array(
          jsonb_build_object('id', 'enkeltinntak', 'type', 'mono', 'a', 1, 'k', 2.3765046190626693),
          jsonb_build_object('id', 'gjentatte_doser', 'type', 'mono', 'a', 1, 'k', 0.47530092381253386),
          jsonb_build_object('id', 'moderat', 'type', 'mono', 'a', 267.2691490332445, 'k', 0.2891162303589332),
          jsonb_build_object('id', 'bi_a', 'type', 'bi') || ((gjeldende -> 'kurver' -> 0) - 'navn'),
          jsonb_build_object('id', 'bi_b', 'type', 'bi') || ((gjeldende -> 'kurver' -> 1) - 'navn')
        ),
        'maleusikkerhet', jsonb_build_object('cv_benzoylekgonin', godkjent_cv_be, 'cv_kreatinin', godkjent_cv_kreatinin),
        'sikkerhetsmarginer', gjeldende -> 'sikkerhetsmarginer',
        'standard_sikkerhetsmargin', gjeldende -> 'standard_sikkerhetsmargin'
      )
  where m.fagmiljo_id = ous;

  raise log '#570: modellen % (form 2) erstatter %', ny_versjon, forrige;
end;
$$;
