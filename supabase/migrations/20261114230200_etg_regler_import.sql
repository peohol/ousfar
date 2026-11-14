-- Fortolkningen av EtG og EtS som scenarioregelsett, med kommentarene som egne objekter.
-- Laget med etgImportSql('peohol', '20261114230200_etg_regler_import.sql') i scripts/etg-import.ts;
-- testene kontrollerer at fila er lik det den gir.
select intern.endring_start('claude-code', '20261114230200_etg_regler_import.sql', 'EtG og EtS fortolkes med et scenarioregelsett i databasen i stedet for tekstene i appen');
do $import$
declare
  importdata constant text := $data${"kommentarer":[{"id":"etg/begge","innhold":{"navn":"EtG og EtS – begge påvist – hovedkommentar","tekst":"Omdannelsesprodukter av etanol, etylglukuronid (EtG) og etylsulfat (EtS), er påvist i urin. Dette viser at etanol (alkohol) er inntatt.","plassholdere":[]}},{"id":"etg/se-ets","innhold":{"navn":"EtG og EtS – begge påvist – tilleggskommentar","tekst":"Se kommentar for EtS i urin.","plassholdere":[]}},{"id":"etg/en-av-dem","innhold":{"navn":"EtG og EtS – én av dem påvist – hovedkommentar","tekst":"Omdannelsesprodukt av etanol, etylglukuronid (EtG) eller etylsulfat (EtS), er påvist i urin. Dette kan være forenlig med inntak av etanol (alkohol). I enkelte tilfeller kan dette ses etter inntak av alkoholfri vin/øl eller andre mat-/drikkevarer.","plassholdere":[]}}],"regelsett":[{"modul":"etg","analytter":["UETGS","UETS"],"verdihjelp":"","forhold":[],"parametere":[],"scenarier":[{"nokkel":"begge","pavist":["UETGS","UETS"],"vilkar":[],"utfall":{"type":"kommentarer","plasseringer":[{"rolle":"hoved","merke":"Hovedkommentar","kommentar":"etg/begge","koder":["UETS"]},{"rolle":"tillegg","merke":"Tilleggskommentar","kommentar":"etg/se-ets","koder":["UETGS"]}],"notiser":[]}},{"nokkel":"etg","pavist":["UETGS"],"vilkar":[],"utfall":{"type":"kommentarer","plasseringer":[{"rolle":"hoved","merke":"Hovedkommentar","kommentar":"etg/en-av-dem","koder":["UETGS"]}],"notiser":[]}},{"nokkel":"ets","pavist":["UETS"],"vilkar":[],"utfall":{"type":"kommentarer","plasseringer":[{"rolle":"hoved","merke":"Hovedkommentar","kommentar":"etg/en-av-dem","koder":["UETS"]}],"notiser":[]}}]}]}$data$;
  data jsonb := importdata::jsonb;
  forfatter public.profiles;
  kommentar jsonb;
  regelsett jsonb;
  ider jsonb := '{}';
  status public.objektstatus;
begin
  if md5(importdata) <> '12504aec4acf8dc55399fb966819fe5f' then
    raise exception 'Importdataene er ikke de som ble laget: kontrollsummen stemmer ikke.';
  end if;
  if (select auth.uid()) is not null then
    raise exception 'Importen kjøres uten innlogget bruker, slik at objektene hører til det opprinnelige fagmiljøet.';
  end if;
  select p.* into forfatter from public.profiles p where p.username = 'peohol';
  if not found then
    raise notice 'Reglene for EtG og EtS er ikke importert: peohol finnes ikke her.';
    return;
  end if;
  if exists (
    select 1 from public.scenarioregelsett s
    where s.modul in (select r ->> 'modul' from jsonb_array_elements(data -> 'regelsett') r)
  ) then
    raise notice 'Reglene for EtG og EtS er alt importert.';
    return;
  end if;
  perform set_config('far.revisjonskilde', 'Importert fra EtG/EtS-modulen i OUSFAR (src/domain/etg.ts)', true);

  for kommentar in
    select k from jsonb_array_elements(data -> 'kommentarer') with ordinality as x(k, nr) order by nr
  loop
    status := intern.opprett_objekt_som('kommentar', gen_random_uuid(), kommentar -> 'innhold', forfatter);
    perform intern.publiser_objekt(status.id, status.revisjon, forfatter);
    ider := ider || jsonb_build_object(kommentar ->> 'id', status.id);
  end loop;

  for regelsett in
    select r from jsonb_array_elements(data -> 'regelsett') with ordinality as x(r, nr) order by nr
  loop
    -- Nøklene i grunnlaget byttes med ID-ene kommentarene fikk.
    regelsett := jsonb_set(regelsett, '{scenarier}', (
      select jsonb_agg(
        jsonb_set(s, '{utfall,plasseringer}', (
          select coalesce(jsonb_agg(
            jsonb_set(p, '{kommentar}', coalesce(ider -> (p ->> 'kommentar'), 'null'::jsonb)) order by pn
          ), '[]')
          from jsonb_array_elements(s #> '{utfall,plasseringer}') with ordinality as y(p, pn)
        ))
        order by sn
      )
      from jsonb_array_elements(regelsett -> 'scenarier') with ordinality as x(s, sn)
    ));
    status := intern.opprett_objekt_som('scenarioregelsett', gen_random_uuid(), regelsett, forfatter);
    perform intern.publiser_objekt(status.id, status.revisjon, forfatter);
  end loop;
end
$import$;
