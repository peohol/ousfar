-- En egen dekningsstatus for kontrollpunkter Claudes sikkerhetsfilter stoppet
-- (docs/kuratorprotokoll.md, «Når sikkerhetsfilteret stopper arbeidet»), og
-- de utsatte punktene i det kurateringskøen leser (docs/kurateringsko.md).
--
-- - `utsatt_sikkerhetsfilter` i dekningsmatrisen: punktet er ikke kontrollert,
--   fordi arbeidet ble stoppet. Kortet står urørt fra grunnversjonen, eller
--   er ikke lagt til. Det krever en begrunnelse og hva som ble forsøkt
--   (`sok`), men ikke kilder og bevis som et kontrollert punkt.
--   `tomt_begrunnet` betyr fortsatt bare at ingen relevant dokumentasjon finnes.
-- - Selvtesten kan ikke fremstille siden som ferdig kontrollert: har den
--   siste dekningsmatrisen i grenen utsatte punkter, må beviset for porten
--   `dekning` nevne hvert av dem. Det kontrolleres sammen med de andre
--   dokumentene (`til_kontroll`, `manglende_dokumenter`). En selvtest i en
--   gren uten utsatte punkter kontrolleres som før.
-- - `public.kuratering_kostatus()` gir også `utsatte`: nøklene til de utsatte
--   punktene i grenens siste dekningsmatrise, bare kontrollpunkter i modellen
--   og aldri fagtekst. Køen tar dem i en oppfølgingskuratering.
--
-- Ingen data endres; funksjonene erstattes med samme signatur, så tilgangene
-- står som før.

-- Hva som mangler i et arbeidsdokument, etter formen i
-- `docs/kuratorprotokoll.md` («Dokumentene»); tom når det holder. Som før,
-- men dekningsmatrisen godtar også `utsatt_sikkerhetsfilter`, med begrunnelse
-- og det som ble forsøkt (`sok`), uten krav om kilder og bevis.
create or replace function kuratering.dokumentfeil(p_art text, p_innhold jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  feil text[] := '{}';
  o jsonb;
  n integer;
  punkt text;
  status text;
begin
  if jsonb_typeof(p_innhold) is distinct from 'object' then
    return array[p_art || ': må være et JSON-objekt.'];
  end if;
  case p_art
  when 'evidensjournal' then
    if not (kuratering.er_tekst(p_innhold -> 'kunnskapsgrense') and p_innhold ->> 'kunnskapsgrense' ~ '^\d{4}-\d{2}-\d{2}$') then
      feil := feil || 'evidensjournal: kunnskapsgrense må være en dato (ÅÅÅÅ-MM-DD).'::text;
    end if;
    if not kuratering.er_liste(p_innhold -> 'hovedkilder', array['omrade', 'kilde']) then
      feil := feil || 'evidensjournal: hovedkilder må ha minst én kilde, hver med omrade og kilde.'::text;
    end if;
    if not kuratering.er_liste(p_innhold -> 'sok', array['domene', 'hva']) then
      feil := feil || 'evidensjournal: sok må beskrive minst ett søk, hvert med domene og hva.'::text;
    end if;
    if not kuratering.er_liste(p_innhold -> 'pastander', array['pastand', 'grunnlag', 'evidensstyrke']) then
      feil := feil || 'evidensjournal: pastander må ha minst én påstand, hver med pastand, grunnlag og evidensstyrke.'::text;
    end if;
  when 'blindprotokoll' then
    if not kuratering.er_liste(p_innhold -> 'kontrollpunkter') then
      feil := feil || 'blindprotokoll: kontrollpunkter må liste kontrollpunktene som er søkt for.'::text;
    end if;
    if not kuratering.er_liste(p_innhold -> 'kilder', array['domene', 'kilde']) then
      feil := feil || 'blindprotokoll: kilder må ha minst én kilde fra det egne søket, hver med domene og kilde.'::text;
    end if;
    if not kuratering.er_liste(p_innhold -> 'konklusjoner') then
      feil := feil || 'blindprotokoll: konklusjoner må ha hovedkonklusjonene før avstemmingen.'::text;
    end if;
    if not kuratering.er_tekst(p_innhold -> 'adversarial') then
      feil := feil || 'blindprotokoll: adversarial må beskrive den adversariale kontrollen.'::text;
    end if;
  when 'dekningsmatrise' then
    if p_innhold ->> 'modus' is null or p_innhold ->> 'modus' not in ('de_novo', 'kuratering', 'evidensovervaking') then
      feil := feil || 'dekningsmatrise: modus må være de_novo, kuratering eller evidensovervaking.'::text;
    end if;
    if jsonb_typeof(p_innhold -> 'omrader') is distinct from 'array' then
      return feil || 'dekningsmatrise: omrader må være en liste.'::text;
    end if;
    foreach punkt in array kuratering.kontrollpunkter() loop
      select count(*) into n from jsonb_array_elements(p_innhold -> 'omrader') x where x ->> 'nokkel' = punkt;
      if n <> 1 then
        feil := feil || format('dekningsmatrise: %s står %s ganger (skal stå én gang).', punkt, n);
      end if;
    end loop;
    for o in select x from jsonb_array_elements(p_innhold -> 'omrader') x loop
      punkt := coalesce(o ->> 'nokkel', '(uten nøkkel)');
      status := o ->> 'status';
      if not (punkt = any (kuratering.kontrollpunkter())) then
        feil := feil || format('dekningsmatrise: %s er ikke et kontrollpunkt.', punkt);
      elsif status is null or status not in ('nytt_eller_oppdatert', 'beholdt_etter_kontroll', 'automatisk_verifisert', 'tomt_begrunnet', 'utsatt_sikkerhetsfilter') then
        feil := feil || format('dekningsmatrise: %s har ukjent status.', punkt);
      elsif not kuratering.er_tekst(o -> 'begrunnelse') then
        feil := feil || format('dekningsmatrise: %s mangler begrunnelse.', punkt);
      elsif jsonb_typeof(o -> 'kilder') is distinct from 'array' or jsonb_typeof(o -> 'sok') is distinct from 'array'
        or (jsonb_array_length(o -> 'kilder') > 0 and not kuratering.er_liste(o -> 'kilder'))
        or (jsonb_array_length(o -> 'sok') > 0 and not kuratering.er_liste(o -> 'sok'))
      then
        feil := feil || format('dekningsmatrise: %s: kilder og sok må være lister med tekst, uten tomme oppføringer.', punkt);
      elsif status = 'tomt_begrunnet' and jsonb_array_length(o -> 'sok') = 0 then
        feil := feil || format('dekningsmatrise: %s: et tomt område må si hva det ble søkt etter.', punkt);
      elsif status = 'utsatt_sikkerhetsfilter' and jsonb_array_length(o -> 'sok') = 0 then
        feil := feil || format('dekningsmatrise: %s: et område sikkerhetsfilteret stoppet, må si hva som ble forsøkt (sok).', punkt);
      elsif status in ('nytt_eller_oppdatert', 'beholdt_etter_kontroll')
        and (jsonb_array_length(o -> 'kilder') = 0 or not kuratering.er_tekst(o -> 'bevis'))
      then
        feil := feil || format('dekningsmatrise: %s: det som er skrevet eller beholdt, må ha kilder og bevis.', punkt);
      end if;
    end loop;
  when 'selvtest' then
    feil := kuratering.selvtestfeil(p_innhold -> 'krav', 'krav', kuratering.selvtestkrav(), kuratering.selvtestkrav_kan_vaere_ikke_relevant())
      || kuratering.selvtestfeil(p_innhold -> 'porter', 'port', kuratering.selvtestporter());
  else
    null;
  end case;
  return feil;
end;
$$;

-- Hva som er galt i selvtesten ut fra dekningsmatrisen i samme gren: hvert
-- punkt sikkerhetsfilteret stoppet, må nevnes i beviset for porten `dekning`
-- (hele nøkkelen, ikke som en del av en lengre nøkkel). Tom når matrisen ikke
-- har utsatte punkter.
create function kuratering.selvtest_utsatte_feil(p_selvtest jsonb, p_matrise jsonb)
returns text[]
language sql
immutable
set search_path = ''
as $$
  with utsatte as (
    select distinct o ->> 'nokkel' as nokkel
    from jsonb_array_elements(case when jsonb_typeof(p_matrise -> 'omrader') = 'array' then p_matrise -> 'omrader' else '[]'::jsonb end) o
    where o ->> 'status' = 'utsatt_sikkerhetsfilter' and kuratering.er_tekst(o -> 'nokkel')
  ),
  bevis as (
    select coalesce((
      select string_agg(p ->> 'bevis', ' ')
      from jsonb_array_elements(case when jsonb_typeof(p_selvtest -> 'porter') = 'array' then p_selvtest -> 'porter' else '[]'::jsonb end) p
      where p ->> 'port' = 'dekning'
    ), '') as tekst
  )
  select coalesce(array_agg(
    format('selvtest: beviset for porten dekning må nevne %s, som sikkerhetsfilteret stoppet og ikke er kontrollert.', u.nokkel)
    order by u.nokkel
  ), '{}')
  from utsatte u, bevis b
  where b.tekst !~ ('(^|[^[:alnum:]_/])' || regexp_replace(u.nokkel, '([.^$*+?()\[\]{}|\\])', '\\\1', 'g') || '($|[^[:alnum:]_/])')
$$;

revoke all on function kuratering.selvtest_utsatte_feil(jsonb, jsonb) from public, anon, authenticated, service_role;

-- Hva som mangler i de siste versjonene av dokumentene i grenen. Som før, og
-- selvtesten kontrolleres også mot den siste dekningsmatrisen i grenen.
create or replace function kuratering.dokumentfeil_i_grenen(p_gren kuratering.grener, p_arter text[])
returns text[]
language sql
stable
set search_path = ''
as $$
  select coalesce(array_agg(f order by a.art, f.n), '{}')
  from unnest(p_arter) a(art)
  left join lateral (
    select d.innhold from kuratering.dokumenter d
    where d.gren = p_gren.id and d.art = a.art
    order by d.versjon desc limit 1
  ) d on true
  left join lateral (
    select m.innhold from kuratering.dokumenter m
    where a.art = 'selvtest' and m.gren = p_gren.id and m.art = 'dekningsmatrise'
    order by m.versjon desc limit 1
  ) m on true
  cross join lateral unnest(
    case when d.innhold is null then array[a.art || ' mangler.']
      else kuratering.dokumentfeil(a.art, d.innhold)
        || case when m.innhold is null then '{}'::text[] else kuratering.selvtest_utsatte_feil(d.innhold, m.innhold) end
    end
  ) with ordinality f(f, n)
$$;

-- Kurateringsgrenene slik kurateringskøen følger dem: som før, og med
-- `utsatte`, nøklene til kontrollpunktene sikkerhetsfilteret stoppet i grenens
-- siste dekningsmatrise, i modellens rekkefølge.
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
    ), '[]'::jsonb)
  ) order by g.opprettet_kl), '[]'::jsonb)
  from kuratering.grener g
  left join lateral (
    select d.innhold from kuratering.dokumenter d
    where d.gren = g.id and d.art = 'dekningsmatrise'
    order by d.versjon desc limit 1
  ) m on true
$$;

comment on function public.kuratering_kostatus() is
  'Kurateringsgrenene slik kurateringskøen følger dem, med nøklene til de utsatte kontrollpunktene: ingen fagtekst. Bare for serveren (docs/kurateringsko.md).';
