-- P5.0 (#416, docs/redaktorer-og-forslag.md): den felles grunnmuren for
-- redaktøransvaret og endringsforslagene. Hva en «ressurs» er, hvilke
-- ressurser et objekt hører til, hvordan en ressurs beskrives, og hvem som
-- behandler forslag til den.
--
-- Ingen atferdsendring: ingen nye tabeller, ingen nye rettigheter, og ingen av
-- funksjonene kan kalles fra nettleseren. Redaktøransvaret (tråd A) definerer
-- `intern.ressursens_redaktorer` på nytt når tildelingene finnes; resten
-- bygger på den og endres ikke da.

-- Objekttypene som er en ressurs: det brukeren ser som én enhet, og som
-- redaktøransvar og forslag gjelder. En fagside (med kortene sine) og hvert
-- regelsett i fortolkningen. Kortene og kommentarene er elementer i en
-- ressurs, ikke ressurser selv.
create function intern.er_ressurstype(type public.objekttype)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(er_ressurstype.type::text in ('infoside', 'intervallregelsett', 'scenarioregelsett', 'thc_regelsett'), false)
$$;

revoke all on function intern.er_ressurstype(public.objekttype) from public, anon, authenticated, service_role;

comment on function intern.er_ressurstype(public.objekttype) is
  'P5: om objekttypen er en ressurs (fagside eller regelsett). Se docs/redaktorer-og-forslag.md.';

-- Ressursene et objekt hører til: seg selv når det er en ressurs, fagsiden
-- for et kort, og regelsettene som bruker en kommentar (i utkastet eller det
-- publiserte; samme liste som `intern.kommentarer_paa_tvers`). Et objekt som
-- ikke hører til noen (en referanse, en analytt), gir ingen.
create function intern.ressurser_for(objekt uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select o.id
  from public.redigerbare_objekter o
  where o.id = ressurser_for.objekt and intern.er_ressurstype(o.type)
  union
  select e.infoside_id
  from public.innholdselementer e
  where e.objekt_id = ressurser_for.objekt
  union
  select k.eier
  from (
    select r.regelsett_id as eier, r.kommentar_id as kommentar from public.intervallregler r
    union all select s.objekt_id, s.cutoff_innledning_id from public.intervallregelsett s
    union all select s.objekt_id, s.cutoff_kommentar_id from public.intervallregelsett s
    union all select p.objekt_id, p.kommentar_id from public.scenarioplasseringer p
    union all select b.objekt_id, b.kommentar_id from public.thc_tekstbolker b
  ) k
  where k.kommentar = ressurser_for.objekt
$$;

revoke all on function intern.ressurser_for(uuid) from public, anon, authenticated, service_role;

comment on function intern.ressurser_for(uuid) is
  'P5: ressursene (fagside, regelsett) et objekt hører til. Se docs/redaktorer-og-forslag.md.';

-- Om objektet hører til ressursen (eller er den).
create function intern.tilhorer_ressurs(objekt uuid, ressurs uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from intern.ressurser_for(tilhorer_ressurs.objekt) r where r = tilhorer_ressurs.ressurs)
$$;

revoke all on function intern.tilhorer_ressurs(uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.tilhorer_ressurs(uuid, uuid) is
  'P5: om objektet er ressursen eller et element i den. Se docs/redaktorer-og-forslag.md.';

-- Ressursen slik den vises i en liste: typen, navnet, stoffets nøkkel (en
-- fagside) eller analyttkoden (et regelsett), rekkevidden og den publiserte
-- revisjonen (aldri utkastets, som en vanlig bruker ikke skal se). Leser forbi
-- radsikkerheten; den som kaller, har alt kontrollert at ressursen kan leses.
-- Navnet er det publiserte, ellers utkastets.
create function intern.ressursbeskrivelse(ressurs uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  typ public.objekttype;
  svar jsonb;
begin
  select o.type into typ from public.redigerbare_objekter o where o.id = ressursbeskrivelse.ressurs;
  if not intern.er_ressurstype(typ) then
    return null;
  end if;
  if typ = 'infoside' then
    select jsonb_build_object('navn', i.navn, 'stoff', i.slug, 'analyttkode', null)
      into svar
    from public.infosider i
    where i.objekt_id = ressursbeskrivelse.ressurs
    order by i.tilstand = 'publisert' desc
    limit 1;
  elsif typ = 'intervallregelsett' then
    select jsonb_build_object('navn', s.analyttkode, 'stoff', null, 'analyttkode', s.analyttkode)
      into svar
    from public.intervallregelsett s
    where s.objekt_id = ressursbeskrivelse.ressurs
    order by s.tilstand = 'publisert' desc
    limit 1;
  elsif typ = 'scenarioregelsett' then
    select jsonb_build_object(
             'navn', string_agg(a.kode, ' · ' order by a.posisjon),
             'stoff', null,
             'analyttkode', (array_agg(a.kode order by a.posisjon))[1]
           )
      into svar
    from public.scenarioanalytter a
    where a.objekt_id = ressursbeskrivelse.ressurs
      and a.tilstand = (
        select t.tilstand from public.objekttilstander t
        where t.objekt_id = ressursbeskrivelse.ressurs
        order by t.tilstand = 'publisert' desc
        limit 1
      )
    having count(*) > 0;
  else
    -- THC-syreregelsettet; det finnes bare ett (docs/thc-syre.md).
    svar := jsonb_build_object('navn', 'IRCAK', 'stoff', null, 'analyttkode', 'IRCAK');
  end if;
  return coalesce(svar, '{}'::jsonb) || jsonb_build_object(
    'id', ressursbeskrivelse.ressurs,
    'type', typ,
    'omfang', (select r.omfang from public.ressursomfang r where r.objekt_id = ressursbeskrivelse.ressurs),
    'fagmiljo_id', (select r.fagmiljo_id from public.ressursomfang r where r.objekt_id = ressursbeskrivelse.ressurs),
    'publisert_revisjon', (select t.revisjon from public.objekttilstander t where t.objekt_id = ressursbeskrivelse.ressurs and t.tilstand = 'publisert')
  );
end;
$$;

revoke all on function intern.ressursbeskrivelse(uuid) from public, anon, authenticated, service_role;

comment on function intern.ressursbeskrivelse(uuid) is
  'P5: ressursen slik den vises i lister (navn, stoff eller analyttkode, rekkevidde, publisert revisjon). Leser forbi radsikkerheten. Se docs/redaktorer-og-forslag.md.';

-- Myndigheten over en ressurs etter rekkevidden alene, uten redaktøransvar:
-- systemarkitekt for felles innhold, lokal administrator i fagmiljøet (eller
-- systemarkitekt) for lokalt. Det er den som i dag gir endringsretten
-- (`intern.kan_endre_objekt`), og den som publiserer og er reserve når ingen
-- redaktør har ansvaret. Krever aktivt medlemskap.
create function intern.har_ressursmyndighet(ressurs uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select har_ressursmyndighet.bruker is not null
    and intern.har_aktivt_medlemskap(har_ressursmyndighet.bruker)
    and exists (
      select 1 from public.ressursomfang r
      where r.objekt_id = har_ressursmyndighet.ressurs
        and intern.kan_endre_omfang(r.omfang, r.fagmiljo_id, har_ressursmyndighet.bruker)
    )
$$;

revoke all on function intern.har_ressursmyndighet(uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.har_ressursmyndighet(uuid, uuid) is
  'P5: systemarkitekt (felles) eller lokal administrator (lokalt) over ressursen, uten redaktøransvar. Se docs/redaktorer-og-forslag.md.';

-- De aktive redaktørene med ansvar for ressursen. Ingen før redaktøransvaret
-- finnes; tråd A definerer funksjonen på nytt med samme signatur.
create function intern.ressursens_redaktorer(ressurs uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select null::uuid where false
$$;

revoke all on function intern.ressursens_redaktorer(uuid) from public, anon, authenticated, service_role;

comment on function intern.ressursens_redaktorer(uuid) is
  'P5: de aktive redaktørene med ansvar for ressursen (tom til redaktøransvaret finnes). Se docs/redaktorer-og-forslag.md.';

-- Om brukeren kan behandle forslag til ressursen: aktivt medlemskap, og enten
-- myndighet over ressursen eller redaktøransvar for den. Også lesingen av
-- forslagene og arbeidskøen bygger på den.
create function intern.kan_behandle_forslag(ressurs uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select kan_behandle_forslag.bruker is not null
    and intern.er_ressurstype((select o.type from public.redigerbare_objekter o where o.id = kan_behandle_forslag.ressurs))
    and intern.har_aktivt_medlemskap(kan_behandle_forslag.bruker)
    and (
      intern.har_ressursmyndighet(kan_behandle_forslag.ressurs, kan_behandle_forslag.bruker)
      or kan_behandle_forslag.bruker in (select intern.ressursens_redaktorer(kan_behandle_forslag.ressurs))
    )
$$;

revoke all on function intern.kan_behandle_forslag(uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.kan_behandle_forslag(uuid, uuid) is
  'P5: om brukeren kan lese og behandle forslag til ressursen (myndighet eller redaktøransvar). Se docs/redaktorer-og-forslag.md.';

-- Hvem som får beskjed om et nytt forslag til ressursen: redaktørene med
-- ansvar for den, og når ingen har det, de med myndighet over den (lokale
-- administratorer for lokalt innhold, systemarkitektene for felles). Slik
-- forsvinner aldri et forslag uten ansvarlig.
create function intern.forslagsbehandlere(ressurs uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  with redaktorer as (
    select r as bruker from intern.ressursens_redaktorer(forslagsbehandlere.ressurs) r
    where intern.har_aktivt_medlemskap(r)
  )
  select bruker from redaktorer
  union
  select distinct m.bruker_id
  from public.medlemskap m
  where not exists (select 1 from redaktorer)
    and m.status = 'aktiv'
    and intern.har_ressursmyndighet(forslagsbehandlere.ressurs, m.bruker_id)
$$;

revoke all on function intern.forslagsbehandlere(uuid) from public, anon, authenticated, service_role;

comment on function intern.forslagsbehandlere(uuid) is
  'P5: mottakerne av et nytt forslag: redaktørene med ansvar, ellers de med myndighet over ressursen. Se docs/redaktorer-og-forslag.md.';
