-- Fagsidelesingen bygger bare JSON for utgavene den faktisk gir tilbake, og
-- skriver ikke lenger midlertidige filer.
--
-- `stoffsider_som_json` (fra 20260929111940_stoffidentitet) la alle
-- objektutgavene i tilstanden — sider, elementer, referanser, kommentarer,
-- regelsett — i et felles mellomresultat `utgaver` med ferdig JSON, og plukket
-- så ut det sidene trengte. Mellomresultatet ble brukt tre steder og måtte
-- derfor lages helt hver gang: i produksjonen ~8 800 utgaver også for én
-- fagside (`les_stoff`). Med lite arbeidsminne (`work_mem` 2 MB) havnet det i
-- midlertidige filer på disk: ~12 MB per `les_stoff` og ~80 MB per
-- `les_stoffer` (målt i produksjonen 06.11.2026).
--
-- Nå:
-- * Utgaven og JSON-en hentes bare for de valgte sidene, elementene deres og
--   referansene de siterer, der de brukes. Hvert objekt hører til nøyaktig én
--   av de tre delene (typen avgjør det), så ingen utgave bygges to ganger.
-- * Elementene på hver side bygges etter at sidene er sortert, så
--   sorteringene ikke bærer med seg alt innholdet.
-- * `stoffsider_som_json` og `les_stoffer` er PL/pgSQL i stedet for SQL. En
--   SQL-funksjon legger svaret sitt i et mellomlager som går til disk når det
--   er større enn arbeidsminnet — for `les_stoffer` flere MB, to ganger.
--
-- Resultatet er det samme som før, med samme form, rekkefølge og innhold, og
-- radsikkerheten gjelder som før: funksjonene kjører som den som kaller dem
-- (ikke `security definer`), og leser de samme tabellene og den samme
-- visningen `objektutgaver` (`security_invoker`). Signaturene, rettighetene og
-- kommentarene står; `create or replace` beholder dem. `les_stoff` er uendret.
--
-- Kontrollert i `src/__tests__/stoffsider-som-json.test.ts`, som sammenligner
-- svarene før og etter denne migrasjonen tegn for tegn. Målingene står i
-- `docs/stoffsidelesing-ytelse.md`.

create or replace function public.stoffsider_som_json(sider uuid[], sidetilstand public.objekttilstand)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  return (
    with valgte as (
      select s.objekt_id, s.navn, s.slug
      from public.infosider s
      where s.tilstand = sidetilstand and s.objekt_id = any (stoffsider_som_json.sider)
    ),
    elementer as (
      select e.infoside_id, e.objekt_id
      from valgte v
      join public.innholdselementer e on e.infoside_id = v.objekt_id and e.tilstand = sidetilstand
    ),
    -- Referansene siden siterer: fra panelene (på siden), kortene og teksten.
    siteringer as (
      select v.objekt_id as infoside_id, k.referanse_id
      from valgte v
      join public.referansekoblinger k on k.objekt_id = v.objekt_id and k.tilstand = sidetilstand
      union
      select e.infoside_id, k.referanse_id
      from elementer e
      join public.referansekoblinger k on k.objekt_id = e.objekt_id and k.tilstand = sidetilstand
    ),
    referanser_per_side as (
      select s.infoside_id, jsonb_agg(s.referanse_id order by s.referanse_id) as referanser
      from siteringer s
      group by s.infoside_id
    )
    select jsonb_build_object(
      'sider', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'stoff', jsonb_build_object('id', v.objekt_id, 'slug', v.slug, 'navn', v.navn),
              'infoside', ui.json,
              -- Elementene bygges her, etter sorteringen av sidene, så sorteringen
              -- ikke bærer med seg alt innholdet.
              'elementer', coalesce(
                (
                  select jsonb_agg(public.utgave_som_json(u) order by u.objekt_id)
                  from public.innholdselementer e
                  join public.objektutgaver u on u.objekt_id = e.objekt_id and u.tilstand = sidetilstand
                  where e.infoside_id = v.objekt_id and e.tilstand = sidetilstand
                ),
                '[]'::jsonb
              ),
              'referanser', coalesce(r.referanser, '[]'::jsonb)
            )
            order by lower(v.navn)
          )
          from valgte v
          join lateral (
            select public.utgave_som_json(u) as json
            from public.objektutgaver u
            where u.objekt_id = v.objekt_id and u.tilstand = sidetilstand
          ) ui on true
          left join referanser_per_side r on r.infoside_id = v.objekt_id
        ),
        '[]'::jsonb
      ),
      'referanser', coalesce(
        (
          select jsonb_agg(public.utgave_som_json(u) order by u.objekt_id)
          from public.objektutgaver u
          where u.tilstand = sidetilstand and u.objekt_id in (select referanse_id from siteringer)
        ),
        '[]'::jsonb
      )
    )
  );
end
$$;

-- Alle fagsidene i én tilstand, til søket i hele kunnskapsbasen.
create or replace function public.les_stoffer(sidetilstand public.objekttilstand)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
begin
  return public.stoffsider_som_json(
    (select coalesce(array_agg(s.objekt_id), '{}') from public.infosider s where s.tilstand = les_stoffer.sidetilstand),
    les_stoffer.sidetilstand
  );
end
$$;
