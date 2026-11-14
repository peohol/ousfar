-- P2.0: aktivt medlemskap i alle datainnganger.
--
-- En innlogget bruker med fortsatt gyldig tilgangstoken, men uten et aktivt
-- medlemskap i et aktivt fagmiljø, skal verken lese eller skrive noe. En
-- systemarkitekt har tilgangen uansett medlemskap. Serverprosesser som ikke
-- representerer en innlogget bruker (den hemmelige nøkkelen, migrasjoner og
-- jobber i databasen), berøres ikke.
--
-- Utformingen er prøvd i P2.0-forberedelsen (docs/p2-0-forberedelse.md) og
-- står i docs/fagmiljoer.md, «Aktivt medlemskap»:
--
--   1. én felles regel, `intern.har_aktivt_medlemskap(bruker)`, som alt annet
--      bygger på;
--   2. én begrensende radsikkerhetsregel per tabell nettleseren når, som
--      gjelder i tillegg til de tillatende (ingen av dem skrives om);
--   3. kontrollen i portfunksjonene (`intern.krev_innlogget`,
--      `intern.krev_registerbruker`, `intern.krev_admin`, `public.er_admin`),
--      som dekker funksjonene som går gjennom dem;
--   4. kontrollen først i hver av de andre `security definer`-funksjonene
--      nettleseren kan kalle, som ellers ville lest forbi radsikkerheten.
--
-- Ingen tilgangsskille mellom fagmiljøene innføres her (det kommer i
-- P2a–d), ingen medlemskap avsluttes, og den gamle adminrollen gir ikke
-- mer enn før: `er_admin()` krever nå i tillegg et aktivt medlemskap.
--
-- Tilbakeføring: en ny migrasjon som setter funksjonene tilbake til
-- definisjonene før denne (de står i migrasjonene før) og fjerner reglene
-- `aktivt_medlemskap`. Ingen data endres her.

-- --- Regelen ---------------------------------------------------------------

-- Sann når brukeren har et aktivt medlemskap i et aktivt fagmiljø, eller er
-- systemarkitekt. Den eneste definisjonen av «aktivt medlemskap»; alt annet
-- kaller denne.
create function intern.har_aktivt_medlemskap(bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select har_aktivt_medlemskap.bruker is not null and (
    exists (
      select 1
      from public.medlemskap m
      join public.fagmiljoer f on f.id = m.fagmiljo_id
      where m.bruker_id = har_aktivt_medlemskap.bruker
        and m.status = 'aktiv'
        and f.status = 'aktiv'
    )
    or intern.er_systemarkitekt(har_aktivt_medlemskap.bruker)
  )
$$;

revoke all on function intern.har_aktivt_medlemskap(uuid) from public, anon, authenticated, service_role;

comment on function intern.har_aktivt_medlemskap(uuid) is
  'P2.0: aktivt medlemskap i et aktivt fagmiljø, eller systemarkitekt. Se docs/fagmiljoer.md.';

-- Den innloggedes eget svar. Radsikkerhetsreglene bruker den, og appen spør
-- den for å vise en forståelig beskjed i stedet for tomme sider. Den sier
-- ingenting om noen andre.
create function public.har_aktivt_medlemskap()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.har_aktivt_medlemskap((select auth.uid()))
$$;

revoke all on function public.har_aktivt_medlemskap() from public, anon, authenticated, service_role;
grant execute on function public.har_aktivt_medlemskap() to authenticated;

comment on function public.har_aktivt_medlemskap() is
  'Om den innloggede har et aktivt medlemskap (P2.0). Eneste opplysning en bruker uten aktivt medlemskap får.';

-- For Edge-funksjonene, som kjører med den hemmelige nøkkelen og kjenner den
-- innloggede fra JWT-en (`supabase/functions/_edge/kontekst.ts`).
create function public.kontooperasjon_aktivt_medlemskap(bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.har_aktivt_medlemskap(kontooperasjon_aktivt_medlemskap.bruker)
$$;

revoke all on function public.kontooperasjon_aktivt_medlemskap(uuid) from public, anon, authenticated;
grant execute on function public.kontooperasjon_aktivt_medlemskap(uuid) to service_role;

-- Stopper kallet med 42501 når den som kaller, er en sluttbruker uten aktivt
-- medlemskap. En sluttbruker er en med bruker-ID i JWT-en, eller med rollen
-- `anon` eller `authenticated`. Den hemmelige nøkkelen (`service_role`) og
-- kjøringer uten forespørsel (migrasjoner, jobber i databasen) har ingen
-- bruker-ID og er ingen sluttbruker; de slipper gjennom som før.
create function intern.krev_aktivt_medlemskap()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  bruker uuid := (select auth.uid());
  rolle text := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
begin
  if bruker is null and coalesce(rolle, 'service_role') = 'service_role' then
    return;
  end if;
  if not intern.har_aktivt_medlemskap(bruker) then
    raise exception 'Du har ikke lenger et aktivt medlemskap i OUSFAR.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function intern.krev_aktivt_medlemskap() from public, anon, authenticated, service_role;

-- --- Portfunksjonene -------------------------------------------------------

create or replace function public.er_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.har_aktivt_medlemskap((select auth.uid())) and exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  )
$$;

create or replace function intern.krev_admin()
returns public.profiles
language plpgsql
stable
set search_path = ''
as $$
declare
  innlogget public.profiles;
begin
  perform intern.krev_aktivt_medlemskap();
  select p.* into innlogget
  from public.profiles p
  where p.id = (select auth.uid()) and p.role = 'admin';
  if not found then
    raise exception 'Bare administratorer kan endre faginnholdet.' using errcode = '42501';
  end if;
  return innlogget;
end;
$$;

create or replace function intern.krev_innlogget()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  bruker uuid := (select auth.uid());
begin
  if bruker is null then
    raise exception 'Bare innloggede kan delta i diskusjonene.' using errcode = '42501';
  end if;
  perform intern.krev_aktivt_medlemskap();
  return bruker;
end;
$$;

create or replace function intern.krev_registerbruker()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  bruker uuid := (select auth.uid());
begin
  if bruker is null then
    raise exception 'Bare innloggede kan endre stoffregisteret.' using errcode = '42501';
  end if;
  perform intern.krev_aktivt_medlemskap();
  return bruker;
end;
$$;

-- --- Radsikkerheten --------------------------------------------------------

-- Én begrensende regel på hver tabell nettleserrollene har rettigheter på i
-- `public`, og på profilbildene i `storage.objects`. Den gjelder i tillegg
-- til de tillatende reglene, for alle kommandoer, og regnes ut én gang per
-- spørring (`(select …)`). Bøttene (`storage.buckets`) har ingen tillatende
-- regel og gir derfor ingenting fra før.
do $$
declare
  tabell regclass;
  antall int := 0;
begin
  for tabell in
    select c.oid::regclass
    from pg_class c
    where (c.relnamespace = 'public'::regnamespace and c.relkind in ('r', 'p')
           and (has_table_privilege('authenticated', c.oid, 'select, insert, update, delete')
                or has_any_column_privilege('authenticated', c.oid, 'select, insert, update')))
       or c.oid = 'storage.objects'::regclass
    order by 1::text
  loop
    execute format(
      'create policy aktivt_medlemskap on %s as restrictive for all to authenticated '
      'using ((select public.har_aktivt_medlemskap())) '
      'with check ((select public.har_aktivt_medlemskap()))',
      tabell
    );
    antall := antall + 1;
  end loop;
  raise notice 'P2.0: begrensende regel på % tabeller.', antall;
end;
$$;

-- --- Funksjonene som leser forbi radsikkerheten uten en port --------------

-- De 40 `security definer`-funksjonene nettleseren kan kalle som verken går
-- gjennom en port eller kontrollerer aktivt medlemskap selv (restlisten i
-- docs/p2-0-forberedelse.md). Hver får kontrollen som første setning, ellers
-- uendret: definisjonene er de gjeldende, hentet fra databasen bygd av
-- migrasjonene. `create or replace` beholder rettighetene og kommentarene.
-- Unntakene, `er_admin()` og `har_aktivt_medlemskap()`, svarer bare ja eller
-- nei om den innloggede selv.

-- arkiver_varsler(varsler uuid[], til timestamp with time zone)
CREATE OR REPLACE FUNCTION public.arkiver_varsler(varsler uuid[], til timestamp with time zone)
 RETURNS uuid[]
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  bruker uuid := (select auth.uid());
  arkiverte uuid[];
begin
  perform intern.krev_aktivt_medlemskap();
  if bruker is null then
    raise exception 'Bare innloggede har varsler.' using errcode = '42501';
  end if;
  with arkivert as (
    update public.varsler v
    set arkivert_kl = now(),
        lest_kl = coalesce(v.lest_kl, now())
    where v.mottaker_id = bruker
      and v.arkivert_kl is null
      and v.id = any (arkiver_varsler.varsler)
      and (v.lest_kl is not null or v.oppdatert_kl <= least(arkiver_varsler.til, now()))
    returning v.id
  )
  select coalesce(array_agg(a.id), '{}') into arkiverte from arkivert a;
  return arkiverte;
end;
$function$
;

-- clinpgx_status()
CREATE OR REPLACE FUNCTION public.clinpgx_status()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select coalesce(jsonb_agg(to_jsonb(s) order by s.id desc), '[]')
  from (
    select id, status, utlost_av, startet_kl, avsluttet_kl, antall, feil
    from clinpgx.synkroniseringer
    order by id desc
    limit 20
  ) s
$function$
;

-- cpic_status()
CREATE OR REPLACE FUNCTION public.cpic_status()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select coalesce(jsonb_agg(to_jsonb(s) order by s.id desc), '[]')
  from (
    select id, status, utlost_av, startet_kl, avsluttet_kl, release, release_dato, skjemaversjon, antall, feil
    from cpic.synkroniseringer
    order by id desc
    limit 20
  ) s
$function$
;

-- direktelenke(slag text, id uuid, kommentar uuid)
CREATE OR REPLACE FUNCTION public.direktelenke(slag text, id uuid, kommentar uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select case direktelenke.slag
    when 'diskusjon' then (
      select jsonb_build_object(
        'slag', 'diskusjon',
        'id', d.id,
        'side', d.side,
        'tittel', d.tittel,
        'kategori', (
          select jsonb_build_object('navn', k.navn, 'emoji', k.emoji)
          from public.diskusjonskategorier k where k.id = d.kategori_id
        ),
        'forfatter', intern.direktelenke_forfatter(d.forfatter_id),
        'opprettet_kl', d.opprettet_kl,
        'tekst', d.tekst,
        'skjult', d.skjult_kl is not null,
        'arkivert_kl', d.arkivert_kl,
        'kommentarer', (
          select count(*) from public.diskusjonskommentarer k
          where k.diskusjon_id = d.id and not k.slettet
        ),
        'kommentar', (
          select jsonb_build_object(
            'id', k.id,
            'forfatter', intern.direktelenke_forfatter(k.forfatter_id),
            'opprettet_kl', k.opprettet_kl,
            'tekst', k.tekst,
            'slettet', k.slettet,
            'skjult', k.skjult_kl is not null
          )
          from public.diskusjonskommentarer k
          where k.id = direktelenke.kommentar and k.diskusjon_id = d.id
        )
      )
      from public.diskusjoner d
      where d.id = direktelenke.id
        and (direktelenke.kommentar is null or exists (
          select 1 from public.diskusjonskommentarer k
          where k.id = direktelenke.kommentar and k.diskusjon_id = d.id
        ))
    )
    when 'ide' then (
      select jsonb_build_object(
        'slag', 'ide',
        'id', i.id,
        'tittel', i.tittel,
        'idekategori', i.kategori,
        'forfatter', intern.direktelenke_forfatter(i.forfatter_id),
        'opprettet_kl', i.opprettet_kl,
        'tekst', i.tekst,
        'arkivert_kl', i.arkivert_kl,
        'overfort', exists (select 1 from public.oppgaver o where o.ide_id = i.id),
        'kommentarer', (
          select count(*) from public.idekommentarer k
          where k.ide_id = i.id and not k.slettet
        ),
        'kommentar', (
          select jsonb_build_object(
            'id', k.id,
            'forfatter', intern.direktelenke_forfatter(k.forfatter_id),
            'opprettet_kl', k.opprettet_kl,
            'tekst', k.tekst,
            'slettet', k.slettet,
            'skjult', false
          )
          from public.idekommentarer k
          where k.id = direktelenke.kommentar and k.ide_id = i.id
        )
      )
      from public.ideer i
      where i.id = direktelenke.id
        and (i.arkivert_kl is null or i.arkivert_kl > now() - intern.arkivfrist())
        and (direktelenke.kommentar is null or exists (
          select 1 from public.idekommentarer k
          where k.id = direktelenke.kommentar and k.ide_id = i.id
        ))
    )
  end
  where (select auth.uid()) is not null
$function$
;

-- diskusjon_er_apen(diskusjon uuid)
CREATE OR REPLACE FUNCTION public.diskusjon_er_apen(diskusjon uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select exists (select 1 from public.diskusjoner d where d.id = diskusjon and d.arkivert_kl is null)
$function$
;

-- gjenopprett_varsler(varsler uuid[])
CREATE OR REPLACE FUNCTION public.gjenopprett_varsler(varsler uuid[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  bruker uuid := (select auth.uid());
begin
  perform intern.krev_aktivt_medlemskap();
  if bruker is null then
    raise exception 'Bare innloggede har varsler.' using errcode = '42501';
  end if;
  update public.varsler v
  set arkivert_kl = null
  where v.mottaker_id = bruker
    and v.arkivert_kl is not null
    and v.id = any (gjenopprett_varsler.varsler);
end;
$function$
;

-- ide_er_apen(ide uuid)
CREATE OR REPLACE FUNCTION public.ide_er_apen(ide uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select exists (
    select 1 from public.ideer i
    where i.id = ide_er_apen.ide
      and i.arkivert_kl is null
      and not exists (select 1 from public.oppgaver o where o.ide_id = i.id)
  )
$function$
;

-- ideoversikt()
CREATE OR REPLACE FUNCTION public.ideoversikt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  with hjerter as (
    select h.ide_id, count(*) as antall, bool_or(h.bruker_id = (select auth.uid())) as mitt
    from public.idehjerter h
    where h.kommentar_id is null
    group by h.ide_id
  ),
  -- Nye er kommentarer fra andre etter at idéen sist ble åpnet, eller alle
  -- fra andre når den aldri er åpnet.
  kommentarer as (
    select
      k.ide_id,
      count(*) as antall,
      count(*) filter (
        where k.forfatter_id is distinct from (select auth.uid())
          and (b.sett_kl is null or k.opprettet_kl > b.sett_kl)
      ) as nye
    from public.idekommentarer k
    left join public.idebesok b on b.ide_id = k.ide_id and b.bruker_id = (select auth.uid())
    where not k.slettet
    group by k.ide_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id,
      'forfatter_id', i.forfatter_id,
      'kategori', i.kategori,
      'tittel', i.tittel,
      'arkivert_kl', i.arkivert_kl,
      'oppgave', intern.oppgave_kort(i.id),
      'opprettet_kl', i.opprettet_kl,
      'endret_kl', i.endret_kl,
      'hjerter', coalesce(h.antall, 0),
      'mitt_hjerte', coalesce(h.mitt, false),
      'kommentarer', coalesce(k.antall, 0),
      'nye_kommentarer', coalesce(k.nye, 0)
    ) order by i.opprettet_kl desc, i.id), '[]'::jsonb)
  from public.ideer i
  left join hjerter h on h.ide_id = i.id
  left join kommentarer k on k.ide_id = i.id
  where (select auth.uid()) is not null
    and (i.arkivert_kl is null or i.arkivert_kl > now() - intern.arkivfrist())
$function$
;

-- idetraad(ide uuid)
CREATE OR REPLACE FUNCTION public.idetraad(ide uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  with hjerter as (
    select h.kommentar_id, count(*) as antall, bool_or(h.bruker_id = (select auth.uid())) as mitt
    from public.idehjerter h
    where h.ide_id = ide
    group by h.kommentar_id
  )
  select jsonb_build_object(
    'id', i.id,
    'forfatter_id', i.forfatter_id,
    'kategori', i.kategori,
    'tittel', i.tittel,
    'tekst', i.tekst,
    'arkivert_kl', i.arkivert_kl,
    'oppgave', intern.oppgave_kort(i.id),
    'opprettet_kl', i.opprettet_kl,
    'endret_kl', i.endret_kl,
    'lest_kl', now(),
    'sist_sett', (
      select b.sett_kl from public.idebesok b
      where b.ide_id = i.id and b.bruker_id = (select auth.uid())
    ),
    'hjerter', coalesce((select h.antall from hjerter h where h.kommentar_id is null), 0),
    'mitt_hjerte', coalesce((select h.mitt from hjerter h where h.kommentar_id is null), false),
    'kommentarer', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', k.id,
          'forelder_id', k.forelder_id,
          'forfatter_id', k.forfatter_id,
          'tekst', k.tekst,
          'slettet', k.slettet,
          'opprettet_kl', k.opprettet_kl,
          'endret_kl', k.endret_kl,
          'hjerter', case when k.slettet then 0 else coalesce(h.antall, 0) end,
          'mitt_hjerte', case when k.slettet then false else coalesce(h.mitt, false) end
        ) order by k.opprettet_kl, k.id)
      from public.idekommentarer k
      left join hjerter h on h.kommentar_id = k.id
      where k.ide_id = i.id
    ), '[]'::jsonb)
  )
  from public.ideer i
  where i.id = ide
    and (select auth.uid()) is not null
    and (i.arkivert_kl is null or i.arkivert_kl > now() - intern.arkivfrist())
$function$
;

-- legemiddeldata_status()
CREATE OR REPLACE FUNCTION public.legemiddeldata_status()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select coalesce(jsonb_agg(to_jsonb(s) - 'etag' - 'sist_endret' order by s.id desc), '[]')
  from (
    select id, kilde, status, startet_kl, avsluttet_kl, etag, sist_endret, kildedato, antall, feil, trinn, ny_fil
    from legemiddeldata.synkroniseringer
    order by id desc
    limit 20
  ) s
$function$
;

-- les_bivirkninger(stoff text)
CREATE OR REPLACE FUNCTION public.les_bivirkninger(stoff text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select bivirkninger.les_kilder(array(
    select k.id
    from bivirkninger.kilder k
    where k.erstattet_av is null
      and k.trukket_kl is null
      and k.infoside in (select s.objekt_id from public.infosider s where s.slug = les_bivirkninger.stoff)
  ))
$function$
;

-- les_cpic(clinpgx_ider text[])
CREATE OR REPLACE FUNCTION public.les_cpic(clinpgx_ider text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  perform intern.krev_aktivt_medlemskap();
  if coalesce(cardinality(clinpgx_ider), 0) > 200 then
    raise exception 'For mange legemidler.' using errcode = '22023';
  end if;

  return (
    with legemidler as (
      select l.cpic_id, l.data
      from cpic.legemiddel l
      where l.utgatt_kl is null and l.clinpgx_id = any (clinpgx_ider)
    ),
    par as (
      select p.cpic_id, p.data, p.gen, p.retningslinje_id
      from cpic.par p
      where p.utgatt_kl is null and p.legemiddel_id in (select cpic_id from legemidler)
    ),
    anbefalinger as (
      select a.cpic_id, a.data, a.retningslinje_id
      from cpic.anbefaling a
      where a.utgatt_kl is null and a.legemiddel_id in (select cpic_id from legemidler)
    ),
    retningslinjer as (
      select r.cpic_id, r.data
      from cpic.retningslinje r
      where r.utgatt_kl is null
        and r.cpic_id in (
          select data ->> 'retningslinje_id' from legemidler
          union select retningslinje_id from par
          union select retningslinje_id from anbefalinger)
    ),
    gener as (
      select g.cpic_id, g.data
      from cpic.gen g
      where g.utgatt_kl is null
        and g.cpic_id in (
          select gen from par
          union select b ->> 'gen' from anbefalinger a, jsonb_array_elements(a.data -> 'betingelser') b)
    )
    select jsonb_build_object(
      'kilde', cpic.kilde(),
      'legemidler', coalesce((select jsonb_agg(l.data order by l.cpic_id) from legemidler l), '[]'),
      'par', coalesce((select jsonb_agg(p.data order by p.gen, p.cpic_id) from par p), '[]'),
      'retningslinjer', coalesce((
        select jsonb_agg(r.data || jsonb_build_object('publikasjoner', coalesce((
          select jsonb_agg(pu.data order by pu.cpic_id)
          from cpic.publikasjon pu
          where pu.utgatt_kl is null and pu.retningslinje_id = r.cpic_id), '[]')) order by r.cpic_id)
        from retningslinjer r), '[]'),
      'anbefalinger', coalesce((select jsonb_agg(a.data order by a.cpic_id) from anbefalinger a), '[]'),
      'gener', coalesce((select jsonb_agg(g.data order by g.cpic_id) from gener g), '[]'),
      'genresultater', coalesce((
        select jsonb_agg(gr.data order by gr.gen, gr.cpic_id)
        from cpic.genresultat gr
        where gr.utgatt_kl is null and gr.gen in (select cpic_id from gener)), '[]')
    )
  );
end;
$function$
;

-- les_cpic_diplotyper(gensymbol text)
CREATE OR REPLACE FUNCTION public.les_cpic_diplotyper(gensymbol text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  with resultater as (
    select r.cpic_id, r.data
    from cpic.genresultat r
    where r.utgatt_kl is null and r.gen = gensymbol
  ),
  oppslag as (
    select o.cpic_id, o.data
    from cpic.genresultat_oppslag o
    where o.utgatt_kl is null and o.genresultat_id in (select cpic_id from resultater)
  )
  select jsonb_build_object(
    'kilde', cpic.kilde(),
    'gen', (select g.data from cpic.gen g where g.utgatt_kl is null and g.cpic_id = gensymbol),
    'genresultater', coalesce((select jsonb_agg(r.data order by r.cpic_id) from resultater r), '[]'),
    -- Diplotypene står under kombinasjonen de hører til, så ID-en ikke
    -- gjentas for hver av dem (over 60 000 for RYR1).
    'oppslag', coalesce((
      select jsonb_agg(o.data || jsonb_build_object('diplotyper', coalesce((
        select jsonb_agg(d.diplotype order by d.diplotype collate "C")
        from cpic.diplotype d
        where d.utgatt_kl is null and d.oppslag_id = o.cpic_id), '[]')) order by o.cpic_id)
      from oppslag o), '[]'),
    'alleler', coalesce((
      select jsonb_agg(jsonb_build_object(
        'navn', a.data ->> 'navn',
        'funksjon', a.data -> 'funksjon',
        'klinisk_funksjon', a.data -> 'klinisk_funksjon',
        'aktivitetsverdi', a.data -> 'aktivitetsverdi') order by a.cpic_id)
      from cpic.allel a
      where a.utgatt_kl is null and a.gen = gensymbol), '[]')
  )
$function$
;

-- les_endringslogg(side jsonb, med_utkast boolean, med_rutiner boolean, etter jsonb, antall integer)
CREATE OR REPLACE FUNCTION public.les_endringslogg(side jsonb, med_utkast boolean DEFAULT false, med_rutiner boolean DEFAULT false, etter jsonb DEFAULT NULL::jsonb, antall integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  admin boolean := public.er_admin();
  utkast boolean := admin and coalesce(les_endringslogg.med_utkast, false);
  register boolean := (les_endringslogg.side ->> 'stoffregister')::boolean is true;
  rotter uuid[];
  grense integer := least(greatest(coalesce(les_endringslogg.antall, 30), 1), 100);
  etter_kl timestamptz := (les_endringslogg.etter ->> 'kl')::timestamptz;
  etter_id text := coalesce(les_endringslogg.etter ->> 'id', '');
  resultat jsonb;
begin
  perform intern.krev_aktivt_medlemskap();
  if (select auth.uid()) is null then
    raise exception 'Logg inn for å lese endringsloggen.' using errcode = '42501';
  end if;
  if les_endringslogg.side is null or jsonb_typeof(les_endringslogg.side) <> 'object' then
    raise exception 'Siden mangler.' using errcode = '22023';
  end if;

  rotter := array(select intern.endringsrotter(les_endringslogg.side, admin));

  -- Revisjonene og publiseringene som angikk siden da de ble gjort
  -- (`intern.sidens_utgaver`).
  with utgaver as materialized (
    select * from intern.sidens_utgaver(rotter, utkast, register)
  ), medlemmer as (
    select coalesce(r.endring_id::text, 'eldre:' || r.utfort_kl::text || ':' || r.utfort_av::text) as nokkel,
      r.objekt_id, r.revisjon, null::integer as forrige, false as publisering,
      r.utfort_kl, r.utfort_av, r.utfort_av_fornavn, r.utfort_av_etternavn, r.kilde, u.delt
    from utgaver u
    join public.objektrevisjoner r on r.objekt_id = u.objekt_id and r.revisjon = u.revisjon
    where u.publisering is null
    union all
    select coalesce(p.endring_id::text, 'eldre:' || p.utfort_kl::text || ':' || p.utfort_av::text),
      p.objekt_id, p.revisjon, p.forrige_revisjon, true,
      p.utfort_kl, p.utfort_av, p.utfort_av_fornavn, p.utfort_av_etternavn,
      (select r.kilde from public.objektrevisjoner r where r.objekt_id = p.objekt_id and r.revisjon = p.revisjon), u.delt
    from utgaver u
    join public.objektpubliseringer p on p.id = u.publisering
  ), samlet as (
    select m.nokkel, m.objekt_id,
      bool_or(m.publisering) as publisert,
      bool_and(m.delt) as delt,
      case when bool_or(not m.publisering) then nullif(min(m.revisjon) filter (where not m.publisering) - 1, 0)
        else (array_agg(m.forrige order by m.revisjon) filter (where m.publisering))[1] end as fra,
      coalesce(max(m.revisjon) filter (where not m.publisering), max(m.revisjon)) as til,
      min(m.utfort_kl) as kl
    from medlemmer m
    group by m.nokkel, m.objekt_id
  ), deler as (
    select s.nokkel, s.kl, o.type, s.publisert, s.delt,
      intern.endringsdel(s.objekt_id, o.type, s.fra, s.til, s.publisert, f.innhold, t.innhold)
        || case when s.delt then '{"delt": true}'::jsonb else '{}'::jsonb end as del
    from samlet s
    join public.redigerbare_objekter o on o.id = s.objekt_id
    join public.objektrevisjoner t on t.objekt_id = s.objekt_id and t.revisjon = s.til
    left join public.objektrevisjoner f on f.objekt_id = s.objekt_id and f.revisjon = s.fra
    -- Stoffregisteret viser bare at fagsider er opprettet eller har fått nytt navn.
    where not register or (o.type = 'infoside' and (f.innhold is null
      or f.innhold ->> 'navn' is distinct from t.innhold ->> 'navn'))
  ), hendelser as (
    select h.endring_id::text as nokkel, h.utfort_kl as kl, h.id,
      jsonb_build_object('hendelse', h.hendelse, 'kl', h.utfort_kl, 'data', h.data - 'publisert') as hendelse
    from public.innholdshendelser h
    where ((register and h.stoffregister) or (not register and h.side = any (rotter)))
      and (utkast or (h.data ->> 'publisert')::boolean is not false)
  ), eldre as (
    select m.nokkel,
      (array_agg(m.utfort_av))[1] as utfort_av,
      (array_agg(m.utfort_av_fornavn))[1] as fornavn,
      (array_agg(m.utfort_av_etternavn))[1] as etternavn,
      max(m.kilde) as kilde
    from medlemmer m
    where m.nokkel like 'eldre:%'
    group by m.nokkel
  ), nokler as (
    select x.nokkel, min(x.kl) as kl
    from (select d.nokkel, d.kl from deler d union all select h.nokkel, h.kl from hendelser h) x
    group by x.nokkel
  ), endringer as (
    select n.nokkel,
      coalesce(e.opprettet_kl, n.kl) as kl,
      e.id, e.aktor, e.agent, e.art, coalesce(e.utfort_av, l.utfort_av) as utfort_av, e.utfort_av_fornavn, e.utfort_av_etternavn, e.oppsummering, e.rapport,
      e.migrasjon, e.lenker,
      case when e.id is null and l.kilde is not null then 'system' when e.id is null then 'bruker' else e.aktor end as hvem,
      l.fornavn as eldre_fornavn, l.etternavn as eldre_etternavn, l.kilde as eldre_kilde,
      -- Bare endringer i delte referanser og kommentarer: hva endringen ellers
      -- gjaldt (som en kuratering av en annen fagside), hører ikke til siden.
      not exists (select 1 from deler d where d.nokkel = n.nokkel and not d.delt)
        and not exists (select 1 from hendelser h where h.nokkel = n.nokkel) as bare_delt
    from nokler n
    left join public.innholdsendringer e on e.id::text = n.nokkel
    left join eldre l on l.nokkel = n.nokkel
  ), valgte as (
    select * from endringer x
    where (les_endringslogg.med_rutiner or not coalesce(
        (select a.rutine from public.endringsagenter a where a.nokkel = x.agent), false))
      and (etter_kl is null or (x.kl, x.nokkel) < (etter_kl, etter_id))
    order by x.kl desc, x.nokkel desc
    limit grense + 1
  )
  select jsonb_build_object(
    'endringer', coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', v.nokkel,
      'kl', v.kl,
      'aktor', v.hvem,
      'eldre', v.id is null,
      'art', case when v.bare_delt then 'redigering' else coalesce(v.art, 'redigering') end,
      'delt', case when v.bare_delt then true end,
      'agent', case
        when v.agent is not null then (select jsonb_build_object('nokkel', a.nokkel, 'navn', a.navn, 'art', a.art, 'beskrivelse', a.beskrivelse, 'rutine', a.rutine)
          from public.endringsagenter a where a.nokkel = v.agent)
        when v.id is null and v.eldre_kilde is not null then (select jsonb_build_object('nokkel', a.nokkel, 'navn', a.navn, 'art', a.art, 'beskrivelse', a.beskrivelse, 'rutine', a.rutine)
          from public.endringsagenter a where a.nokkel = 'databasemigrasjon') end,
      -- Profilen og profilbildet: personens, eller agentens egen profil.
      'profil', (select jsonb_build_object('id', p.id, 'username', p.username, 'first_name', p.first_name,
          'last_name', p.last_name, 'avatar_path', p.avatar_path, 'updated_at', p.updated_at)
        from public.profiles p
        where case
          when v.agent is not null then p.username = (select ap.brukernavn from public.agentprofiler ap where ap.agent = v.agent)
          when v.hvem = 'bruker' then p.id = v.utfort_av end),
      'person', case when coalesce(v.utfort_av_fornavn, v.eldre_fornavn) is not null then jsonb_build_object(
        'fornavn', coalesce(v.utfort_av_fornavn, v.eldre_fornavn), 'etternavn', coalesce(v.utfort_av_etternavn, v.eldre_etternavn)) end,
      'oppsummering', case when not v.bare_delt then coalesce(v.oppsummering, v.eldre_kilde) end,
      'rapport', case when not v.bare_delt then v.rapport end,
      'migrasjon', v.migrasjon,
      -- Migrasjonen er kjørt og registrert i databasens migrasjonshistorikk.
      'verifisert', case when v.migrasjon is not null then exists (
        select 1 from supabase_migrations.schema_migrations s where s.version || '_' || s.name || '.sql' = v.migrasjon) end,
      'lenker', case when cardinality(v.lenker) > 0 then to_jsonb(v.lenker) end,
      'deler', (select jsonb_agg(d.del order by d.type, d.del ->> 'objekt') from deler d where d.nokkel = v.nokkel),
      'hendelser', (select jsonb_agg(h.hendelse order by h.id) from hendelser h where h.nokkel = v.nokkel),
      'utkast', not exists (select 1 from deler d where d.nokkel = v.nokkel and d.publisert)
        and not exists (select 1 from hendelser h where h.nokkel = v.nokkel)
    )) order by v.kl desc, v.nokkel desc) filter (where v.rad <= grense), '[]'::jsonb),
    'flere', count(*) > grense
  ) into resultat
  from (select x.*, row_number() over (order by x.kl desc, x.nokkel desc) as rad from valgte x) v;

  return resultat;
end;
$function$
;

-- les_farmakogenetikk(kjemikalie_ider text[])
CREATE OR REPLACE FUNCTION public.les_farmakogenetikk(kjemikalie_ider text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  perform intern.krev_aktivt_medlemskap();
  if coalesce(cardinality(kjemikalie_ider), 0) > 200 then
    raise exception 'For mange kjemikalier.' using errcode = '22023';
  end if;
  return clinpgx.utvalg(kjemikalie_ider, '{}');
end;
$function$
;

-- les_farmakogenetikk_sok(kjemikalie_ider text[])
CREATE OR REPLACE FUNCTION public.les_farmakogenetikk_sok(kjemikalie_ider text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  perform intern.krev_aktivt_medlemskap();
  if coalesce(cardinality(kjemikalie_ider), 0) > 200 then
    raise exception 'For mange kjemikalier.' using errcode = '22023';
  end if;
  return clinpgx.utvalg(kjemikalie_ider, array['fenotyper', 'legemidler', 'litteratur']);
end;
$function$
;

-- les_interaksjoner(atc_koder text[], virkestoff_ider text[])
CREATE OR REPLACE FUNCTION public.les_interaksjoner(atc_koder text[], virkestoff_ider text[] DEFAULT '{}'::text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  perform intern.krev_aktivt_medlemskap();
  if coalesce(cardinality(atc_koder), 0) > 100 or coalesce(cardinality(virkestoff_ider), 0) > 100 then
    raise exception 'For mange ATC-koder eller virkestoff.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(coalesce(atc_koder, '{}'::text[])) a(kode)
    where a.kode is null
       or a.kode !~ '^[A-Z0-9]{1,7}$'
  ) then
    raise exception 'Ugyldig ATC-kode.' using errcode = '22023';
  end if;

  return (
    with
    sok_atc as (
      select distinct left(a.kode, n.n) as kode
      from unnest(coalesce(atc_koder, '{}'::text[])) as a(kode)
      cross join lateral generate_series(1, length(a.kode)) as n(n)
      where a.kode is not null and a.kode <> ''
    ),
    interaksjons_ider as (
      select s.interaksjon_id as fest_id
      from legemiddeldata.interaksjonssubstanser s
      where s.virkestoff_id = any (coalesce(virkestoff_ider, '{}'::text[]))
      union
      select s.interaksjon_id
      from sok_atc a
      join legemiddeldata.interaksjonssubstanser s on s.atc = a.kode
    ),
    ikke_vurdert_ider as (
      select distinct v.fest_id
      from sok_atc a
      cross join lateral (
        select x.fest_id
        from legemiddeldata.interaksjon_ikke_vurdert x
        where x.utgatt_kl is null
          and x.data @> jsonb_build_object(
            'atc',
            jsonb_build_array(jsonb_build_object('kode', a.kode))
          )
      ) v
    )
    select jsonb_build_object(
      'interaksjoner', coalesce((
        select jsonb_agg(jsonb_build_object('id', i.fest_id) || i.data order by i.fest_id)
        from legemiddeldata.interaksjon i
        join interaksjons_ider f on f.fest_id = i.fest_id
        where i.utgatt_kl is null
      ), '[]'::jsonb),
      'ikke_vurdert', coalesce((
        select jsonb_agg(jsonb_build_object('id', v.fest_id) || v.data order by v.fest_id)
        from legemiddeldata.interaksjon_ikke_vurdert v
        join ikke_vurdert_ider f on f.fest_id = v.fest_id
      ), '[]'::jsonb)
    )
  );
end;
$function$
;

-- les_interaksjonssok(sider jsonb)
CREATE OR REPLACE FUNCTION public.les_interaksjonssok(sider jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  perform intern.krev_aktivt_medlemskap();
  perform legemiddeldata.kontroller_sider(sider);

  return (
    with
    egne as (select * from legemiddeldata.sidenes_virkestoff(sider)),
    preparater as (select * from legemiddeldata.sidenes_preparater(sider)),
    stoff as (
      select p.side, p.merkevare_id, s.virkestoff_id
      from preparater p
      join legemiddeldata.merkevare m on m.fest_id = p.merkevare_id
      cross join lateral jsonb_array_elements_text(m.data -> 'virkestoff_med_styrke') as ms(id)
      join legemiddeldata.virkestoff_styrke s on s.fest_id = ms.id
      union all
      select p.side, p.merkevare_id, u.id
      from preparater p
      join legemiddeldata.merkevare m on m.fest_id = p.merkevare_id
      cross join lateral jsonb_array_elements_text(m.data -> 'virkestoff_uten_styrke') as u(id)
    ),
    rene as (
      select st.side, st.merkevare_id
      from stoff st
      left join egne e on e.side = st.side and e.virkestoff_id = st.virkestoff_id
      group by st.side, st.merkevare_id
      having bool_and(e.virkestoff_id is not null)
    ),
    atc as (
      select distinct r.side, m.data -> 'atc' ->> 'kode' as kode
      from rene r
      join legemiddeldata.merkevare m on m.fest_id = r.merkevare_id
      where coalesce(m.data -> 'atc' ->> 'kode', '') <> ''
    ),
    prefikser as (
      select distinct a.side, left(a.kode, n.n) as kode
      from atc a
      cross join lateral generate_series(1, length(a.kode)) as n(n)
    ),
    treff as (
      select p.side, s.interaksjon_id, s.gruppe
      from prefikser p
      join legemiddeldata.interaksjonssubstanser s on s.atc = p.kode
      union
      select e.side, s.interaksjon_id, s.gruppe
      from egne e
      join legemiddeldata.interaksjonssubstanser s on s.virkestoff_id = e.virkestoff_id
    ),
    egen as (
      select t.side, t.interaksjon_id, min(t.gruppe) as gruppe
      from treff t
      group by t.side, t.interaksjon_id
    ),
    per_side as (
      select e.side, jsonb_agg(jsonb_build_array(
        o.interaksjon_id,
        o.relevans,
        coalesce((
          select g.navn
          from unnest(o.gruppenavn) with ordinality as g(navn, n)
          where g.n <> e.gruppe
          order by g.n
          limit 1
        ), '')
      ) order by o.interaksjon_id) as liste
      from egen e
      join legemiddeldata.interaksjonsoppslag o on o.interaksjon_id = e.interaksjon_id
      where o.relevans in ('1', '2')
      group by e.side
    )
    select coalesce(jsonb_agg(coalesce(ps.liste, '[]'::jsonb) order by s.n), '[]'::jsonb)
    from generate_series(0, jsonb_array_length(sider) - 1) as s(n)
    left join per_side ps on ps.side = s.n
  );
end;
$function$
;

-- les_kjemi(cider integer[])
CREATE OR REPLACE FUNCTION public.les_kjemi(cider integer[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  perform intern.krev_aktivt_medlemskap();
  if coalesce(cardinality(cider), 0) > 200 then
    raise exception 'For mange forbindelser.' using errcode = '22023';
  end if;

  return jsonb_build_object(
    'kilde', 'PubChem',
    'forbindelser', coalesce((
      select jsonb_agg(jsonb_build_object(
        'cid', p.cid,
        'data', p.data,
        'sist_hentet_kl', p.sist_hentet_kl,
        'sist_endret_kl', p.sist_endret_kl) order by p.cid)
      from pubchem.forbindelser p
      where p.cid = any (cider) and p.data is not null), '[]')
  );
end;
$function$
;

-- les_kurateringer()
CREATE OR REPLACE FUNCTION public.les_kurateringer()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select coalesce(jsonb_agg(k.rad order by k.opprettet_kl, k.stoff), '[]'::jsonb)
  from (
    select g.opprettet_kl, g.stoff, jsonb_strip_nulls(jsonb_build_object(
      'stoff', g.stoff,
      'art', g.art,
      'status', g.status,
      'opprettet_kl', g.opprettet_kl,
      'status_kl', (select max(h.kl) from kuratering.hendelser h where h.gren = g.id and h.til = g.status),
      'publisert_kl', g.publisert_kl
    )) as rad
    from kuratering.grener g
    where g.status <> 'arkivert'
    union all
    select m.kl, m.stoff, jsonb_build_object(
      'stoff', m.stoff,
      'art', 'kuratering',
      'status', 'publisert',
      'opprettet_kl', m.kl,
      'publisert_kl', m.kl
    )
    from (
      select x.stoff, make_timestamptz(
        substr(x.migrasjon, 1, 4)::int, substr(x.migrasjon, 5, 2)::int, substr(x.migrasjon, 7, 2)::int,
        substr(x.migrasjon, 9, 2)::int, substr(x.migrasjon, 11, 2)::int, substr(x.migrasjon, 13, 2)::int, 'UTC'
      ) as kl
      from kuratering.migrasjonskurateringer x
    ) m
  ) k
$function$
;

-- les_laboratorieanalyser(komponenter text[])
CREATE OR REPLACE FUNCTION public.les_laboratorieanalyser(komponenter text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  perform intern.krev_aktivt_medlemskap();
  if coalesce(cardinality(komponenter), 0) > 200 then
    raise exception 'For mange komponenter.' using errcode = '22023';
  end if;

  return (
    with valgte as (
      select k.fp_id, k.data
      from farmakologiportalen.komponent k
      where k.utgatt_kl is null
        and (k.fp_id = any (komponenter) or (k.data -> 'gruppe') ?| coalesce(komponenter, '{}'))
    ),
    analyser as (
      select a.fp_id, a.data, a.laboratorium_id
      from farmakologiportalen.analyse a
      where a.utgatt_kl is null and a.komponent_id in (select fp_id from valgte)
    ),
    laboratorier as (
      select l.fp_id, l.data, l.institusjon_id
      from farmakologiportalen.laboratorium l
      where l.utgatt_kl is null and l.fp_id in (select laboratorium_id from analyser)
    )
    select jsonb_build_object(
      'kilde', jsonb_build_object(
        'navn', 'Farmakologiportalen',
        'endret_kl', (select max(s.avsluttet_kl) from farmakologiportalen.synkroniseringer s where s.status = 'fullfort'),
        'kontrollert_kl', (select max(s.avsluttet_kl) from farmakologiportalen.synkroniseringer s where s.status in ('fullfort', 'uendret'))),
      'komponenter', coalesce((select jsonb_agg(jsonb_build_object('id', v.fp_id, 'data', v.data) order by v.fp_id) from valgte v), '[]'),
      'analyser', coalesce((select jsonb_agg(jsonb_build_object('id', a.fp_id, 'data', a.data) order by a.fp_id) from analyser a), '[]'),
      'laboratorier', coalesce((select jsonb_agg(jsonb_build_object('id', l.fp_id, 'data', l.data) order by l.fp_id) from laboratorier l), '[]'),
      'institusjoner', coalesce((
        select jsonb_agg(jsonb_build_object('id', i.fp_id, 'data', i.data) order by i.fp_id)
        from farmakologiportalen.institusjon i
        where i.utgatt_kl is null and i.fp_id in (select institusjon_id from laboratorier)), '[]')
    )
  );
end;
$function$
;

-- les_laboratoriesok(komponenter text[])
CREATE OR REPLACE FUNCTION public.les_laboratoriesok(komponenter text[])
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  perform intern.krev_aktivt_medlemskap();
  if coalesce(cardinality(komponenter), 0) > 1000 then
    raise exception 'For mange komponenter.' using errcode = '22023';
  end if;

  return (
    with valgte as (
      select k.fp_id, k.data
      from farmakologiportalen.komponent k
      where k.utgatt_kl is null
        and (k.fp_id = any (komponenter) or (k.data -> 'gruppe') ?| coalesce(komponenter, '{}'))
    ),
    analyser as (
      select a.fp_id, a.data, a.laboratorium_id
      from farmakologiportalen.analyse a
      where a.utgatt_kl is null and a.komponent_id in (select fp_id from valgte)
    ),
    laboratorier as (
      select l.fp_id, l.data
      from farmakologiportalen.laboratorium l
      where l.utgatt_kl is null and l.fp_id in (select laboratorium_id from analyser)
    )
    select jsonb_build_object(
      'komponenter', coalesce((
        select jsonb_agg(jsonb_build_object('id', v.fp_id, 'data', jsonb_build_object(
          'navn', v.data -> 'navn', 'gruppe', coalesce(v.data -> 'gruppe', '[]'))) order by v.fp_id)
        from valgte v), '[]'),
      'analyser', coalesce((
        select jsonb_agg(jsonb_build_object('id', a.fp_id, 'data', jsonb_strip_nulls(jsonb_build_object(
          'komponent_id', a.data -> 'komponent_id',
          'laboratorium_id', a.data -> 'laboratorium_id',
          'metode', a.data -> 'metode',
          'status', a.data -> 'status',
          'synlighet', a.data -> 'synlighet',
          'laboratorium', case when l.fp_id is null then a.data -> 'laboratorium' end))) order by a.fp_id)
        from analyser a
        left join laboratorier l on l.fp_id = a.laboratorium_id), '[]'),
      'laboratorier', coalesce((
        select jsonb_agg(jsonb_build_object('id', l.fp_id, 'data', jsonb_strip_nulls(jsonb_build_object(
          'navn', l.data -> 'navn',
          'aktiv', l.data -> 'aktiv'))) order by l.fp_id)
        from laboratorier l), '[]')
    )
  );
end;
$function$
;

-- les_legemidler(virkestoff_ider text[])
CREATE OR REPLACE FUNCTION public.les_legemidler(virkestoff_ider text[])
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  with koblet as (
    select v.fest_id, v.data, v.utgatt_kl
    from legemiddeldata.virkestoff v
    where v.fest_id = any (virkestoff_ider)
  ),
  stoff as (
    select k.fest_id from koblet k
    union
    select jsonb_array_elements_text(k.data -> 'salter') from koblet k
  ),
  styrker as (
    select s.fest_id
    from legemiddeldata.virkestoff_styrke s
    where s.virkestoff_id in (select fest_id from stoff) and s.utgatt_kl is null
  ),
  merkevarer as (
    select m.fest_id, m.data
    from legemiddeldata.merkevare m
    where m.utgatt_kl is null
      and (m.data -> 'virkestoff_med_styrke' ?| array(select fest_id from styrker)
           or m.data -> 'virkestoff_uten_styrke' ?| array(select fest_id from stoff))
  ),
  alle_styrker as (
    select s.fest_id, s.data
    from legemiddeldata.virkestoff_styrke s
    where s.fest_id in (select jsonb_array_elements_text(m.data -> 'virkestoff_med_styrke') from merkevarer m)
  ),
  alle_stoff as (
    select v.fest_id, v.data, v.utgatt_kl
    from legemiddeldata.virkestoff v
    where v.fest_id in (
      select fest_id from koblet
      union select data ->> 'virkestoff_id' from alle_styrker
      union select jsonb_array_elements_text(m.data -> 'virkestoff_uten_styrke') from merkevarer m
    )
  ),
  pakninger as (
    select p.fest_id, p.data
    from legemiddeldata.pakning p
    where p.utgatt_kl is null
      and p.data -> 'merkevarer' ?| array(select fest_id from merkevarer)
  ),
  byttegrupper as (
    select b.fest_id, b.data
    from legemiddeldata.byttegruppe b
    where b.utgatt_kl is null
      and b.fest_id in (select jsonb_array_elements_text(p.data -> 'byttegrupper') from pakninger p)
  )
  select jsonb_build_object(
    'kilde', 'FEST',
    'kontrollert_kl', (
      select max(s.avsluttet_kl) from legemiddeldata.synkroniseringer s
      where s.kilde = 'FEST' and s.status in ('fullfort', 'uendret')),
    'kildedato', (
      select s.kildedato from legemiddeldata.synkroniseringer s
      where s.kilde = 'FEST' and s.status = 'fullfort'
      order by s.id desc limit 1),
    'virkestoff', coalesce((
      select jsonb_agg(jsonb_build_object('id', a.fest_id, 'utgatt', a.utgatt_kl is not null) || a.data order by a.fest_id)
      from alle_stoff a), '[]'),
    'styrker', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.fest_id) || s.data order by s.fest_id) from alle_styrker s), '[]'),
    'merkevarer', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.fest_id) || m.data order by m.fest_id) from merkevarer m), '[]'),
    'pakninger', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.fest_id) || p.data order by p.fest_id) from pakninger p), '[]'),
    'byttegrupper', coalesce((
      select jsonb_agg(jsonb_build_object('id', b.fest_id) || b.data order by b.fest_id) from byttegrupper b), '[]')
  )
$function$
;

-- les_preparatsok(sider jsonb)
CREATE OR REPLACE FUNCTION public.les_preparatsok(sider jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin

  perform intern.krev_aktivt_medlemskap();
  perform legemiddeldata.kontroller_sider(sider);

  return (
    with
    rader as (
      select p.side,
             m.data -> 'legemiddelform' ->> 'kode' as kode,
             m.data -> 'legemiddelform' ->> 'tekst' as tekst,
             m.data ->> 'varenavn' as navn,
             min(m.fest_id) as forst
      from legemiddeldata.sidenes_preparater(sider) p
      join legemiddeldata.merkevare m on m.fest_id = p.merkevare_id
      group by p.side, 2, 3, 4
    ),
    per_side as (
      select r.side, jsonb_agg(jsonb_build_array(r.kode, r.tekst, r.navn) order by r.forst, r.kode, r.tekst, r.navn) as liste
      from rader r
      group by r.side
    )
    select coalesce(jsonb_agg(coalesce(ps.liste, '[]'::jsonb) order by s.n), '[]'::jsonb)
    from generate_series(0, jsonb_array_length(sider) - 1) as s(n)
    left join per_side ps on ps.side = s.n
  );
end;
$function$
;

-- les_regelvarsler()
CREATE OR REPLACE FUNCTION public.les_regelvarsler()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select coalesce(jsonb_agg(jsonb_build_object('regel', r ->> 'regel', 'versjon', (r ->> 'versjon')::integer, 'tekst', k.brukervarsel ->> 'tekst', 'siden', k.brukervarsel ->> 'kl') order by k.id, r ->> 'regel'), '[]'::jsonb)
  from public.kildefunn k, jsonb_array_elements(k.brukervarsel -> 'regler') r
  where (select auth.uid()) is not null
    and not k.prove and k.brukervarsel is not null and k.tilstand in ('faglig_gjennomgang', 'beslutning', 'oppfolging')
$function$
;

-- les_sideversjon(stoff text, nr integer)
CREATE OR REPLACE FUNCTION public.les_sideversjon(stoff text, nr integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  versjonen public.sideversjoner;
  side_id uuid;
begin
  perform intern.krev_aktivt_medlemskap();
  select s.objekt_id into side_id
  from public.infosider s
  where s.tilstand = 'publisert' and s.slug = btrim(les_sideversjon.stoff);
  if side_id is null then
    return null;
  end if;

  select v.* into versjonen
  from public.sideversjoner v
  where v.infoside = side_id and v.nr = les_sideversjon.nr;
  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'versjon', jsonb_strip_nulls(jsonb_build_object(
      'nr', versjonen.nr,
      'opphav', versjonen.opphav,
      'opprettet_kl', versjonen.opprettet_kl,
      'fingeravtrykk', versjonen.fingeravtrykk,
      'endring', intern.sideversjon_endring(versjonen.endring_id)
    )),
    'stoff', (
      -- Nøkkelen siden hadde da, ikke den den har nå: revisjonen har den bare
      -- når den er en annen enn den navnet gir (intern.les_infoside).
      select jsonb_build_object('id', side_id, 'slug', coalesce(r.innhold ->> 'slug', intern.stoffslug(r.innhold ->> 'navn')), 'navn', r.innhold ->> 'navn')
      from public.objektrevisjoner r
      where r.objekt_id = side_id
        and r.revisjon = (versjonen.manifest -> 'infoside' ->> 'revisjon')::integer
    ),
    'infoside', intern.revisjon_som_utgave(side_id, (versjonen.manifest -> 'infoside' ->> 'revisjon')::integer),
    'elementer', coalesce(
      (
        select jsonb_agg(intern.revisjon_som_utgave((e ->> 'id')::uuid, (e ->> 'revisjon')::integer) order by e ->> 'id')
        from jsonb_array_elements(versjonen.manifest -> 'elementer') e
      ),
      '[]'::jsonb
    ),
    'referanser', coalesce(
      (
        select jsonb_agg(intern.revisjon_som_utgave((r ->> 'id')::uuid, (r ->> 'revisjon')::integer) order by r ->> 'id')
        from jsonb_array_elements(versjonen.manifest -> 'referanser') r
      ),
      '[]'::jsonb
    ),
    'bivirkninger', versjonen.manifest -> 'bivirkninger'
  );
end;
$function$
;

-- les_sideversjon_bivirkninger(stoff text, nr integer)
CREATE OR REPLACE FUNCTION public.les_sideversjon_bivirkninger(stoff text, nr integer)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select bivirkninger.les_kilder(array(
    select (x ->> 'id')::uuid from jsonb_array_elements(v.manifest -> 'bivirkninger') x
  ))
  from public.sideversjoner v
  join public.infosider s on s.objekt_id = v.infoside and s.tilstand = 'publisert'
  where s.slug = btrim(les_sideversjon_bivirkninger.stoff) and v.nr = les_sideversjon_bivirkninger.nr
$function$
;

-- les_sideversjoner(stoff text)
CREATE OR REPLACE FUNCTION public.les_sideversjoner(stoff text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select coalesce(jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'nr', v.nr,
      'opphav', v.opphav,
      'opprettet_kl', v.opprettet_kl,
      'fingeravtrykk', v.fingeravtrykk,
      'endring', intern.sideversjon_endring(v.endring_id),
      'antall', jsonb_build_object(
        'elementer', jsonb_array_length(v.manifest -> 'elementer'),
        'referanser', jsonb_array_length(v.manifest -> 'referanser'),
        'bivirkninger', jsonb_array_length(v.manifest -> 'bivirkninger')
      )
    ))
    order by v.nr desc
  ), '[]'::jsonb)
  from public.sideversjoner v
  join public.infosider s on s.objekt_id = v.infoside and s.tilstand = 'publisert'
  where s.slug = btrim(les_sideversjoner.stoff)
$function$
;

-- les_stoffregister(sidetilstand objekttilstand)
CREATE OR REPLACE FUNCTION public.les_stoffregister(sidetilstand objekttilstand)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  with tilstand as (
    select case when public.er_admin() then les_stoffregister.sidetilstand else 'publisert'::public.objekttilstand end as t
  )
  select jsonb_build_object(
    'kategorier', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', k.id, 'forelder', k.forelder_id, 'navn', k.navn, 'posisjon', k.posisjon,
          'ikon', k.ikon, 'arkivert_kl', k.arkivert_kl
        )
        order by k.posisjon, k.opprettet_kl, k.id
      )
      from public.stoffkategorier k
    ), '[]'::jsonb),
    'plasseringer', coalesce((
      select jsonb_agg(jsonb_build_object('stoff', p.stoff, 'kategori', p.kategori_id) order by p.stoff collate "C", p.kategori_id)
      from public.stoffplasseringer p
    ), '[]'::jsonb),
    'status', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stoff', s.stoff, 'status', s.status, 'endret_kl', s.endret_kl,
          'endret_av', nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), '')
        )
        order by s.stoff collate "C"
      )
      from public.stoffstatus s
      left join public.profiles p on p.id = s.endret_av
    ), '[]'::jsonb),
    'sider', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.objekt_id, 'slug', s.slug, 'navn', s.navn,
          'innhold', intern.stoffside_har_innhold(s.objekt_id),
          'oppsummering', (
            select e.data -> 'dokument'
            from public.innholdselementer e
            where e.infoside_id = s.objekt_id and e.tilstand = s.tilstand
              and e.panel = 'identitet' and e.elementtype = 'riktekst'
            limit 1
          )
        )
        order by lower(s.navn)
      )
      from public.infosider s, tilstand
      where s.tilstand = tilstand.t
    ), '[]'::jsonb)
  )
$function$
;

-- les_verktoysperrer()
CREATE OR REPLACE FUNCTION public.les_verktoysperrer()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.id,
      'omfang', s.omfang,
      'mal', s.mal,
      'grunn', s.grunn,
      'satt_kl', s.satt_kl,
      'satt_av', intern.profilnavn(s.satt_av)
    ) order by s.satt_kl, s.id), '[]'::jsonb)
  from public.verktoysperrer s
  where s.opphevet_kl is null and (select auth.uid()) is not null
$function$
;

-- merk_diskusjon_sett(diskusjon uuid, lest_kl timestamp with time zone)
CREATE OR REPLACE FUNCTION public.merk_diskusjon_sett(diskusjon uuid, lest_kl timestamp with time zone)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  insert into public.diskusjonsbesok (bruker_id, diskusjon_id, sett_kl)
  select (select auth.uid()), d.id, least(merk_diskusjon_sett.lest_kl, now())
  from public.diskusjoner d
  where d.id = merk_diskusjon_sett.diskusjon and (select auth.uid()) is not null
  on conflict (bruker_id, diskusjon_id) do update
    set sett_kl = greatest(public.diskusjonsbesok.sett_kl, excluded.sett_kl)
$function$
;

-- merk_ide_sett(ide uuid, lest_kl timestamp with time zone)
CREATE OR REPLACE FUNCTION public.merk_ide_sett(ide uuid, lest_kl timestamp with time zone)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  insert into public.idebesok (bruker_id, ide_id, sett_kl)
  select (select auth.uid()), i.id, least(merk_ide_sett.lest_kl, now())
  from public.ideer i
  where i.id = merk_ide_sett.ide and (select auth.uid()) is not null
  on conflict (bruker_id, ide_id) do update
    set sett_kl = greatest(public.idebesok.sett_kl, excluded.sett_kl)
$function$
;

-- merk_varsler_lest(varsler uuid[], til timestamp with time zone)
CREATE OR REPLACE FUNCTION public.merk_varsler_lest(varsler uuid[], til timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  bruker uuid := (select auth.uid());
begin
  perform intern.krev_aktivt_medlemskap();
  if bruker is null then
    raise exception 'Bare innloggede har varsler.' using errcode = '42501';
  end if;
  update public.varsler v
  set lest_kl = now()
  where v.mottaker_id = bruker
    and v.lest_kl is null
    and v.oppdatert_kl <= least(merk_varsler_lest.til, now())
    and (merk_varsler_lest.varsler is null or v.id = any (merk_varsler_lest.varsler));
  delete from public.varsler v
  where v.mottaker_id = bruker and v.lest_kl <= now() - intern.varselfrist();
end;
$function$
;

-- mine_kontohandlinger()
CREATE OR REPLACE FUNCTION public.mine_kontohandlinger()
 RETURNS TABLE(bruker_id uuid, nytt_passord boolean, endre_rolle boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  with meg as (select (select auth.uid()) as id)
  select x.bruker_id, x.nytt_passord, x.endre_rolle
  from meg
  cross join lateral (
    select p.id as bruker_id,
           intern.kontoavslag(meg.id, p.id, 'passord') is null as nytt_passord,
           intern.kontoavslag(meg.id, p.id, 'rolle') is null as endre_rolle
    from public.profiles p
  ) x
  where meg.id is not null
    and (intern.er_systemarkitekt(meg.id) or exists (select 1 from intern.administrerte_fagmiljoer(meg.id)))
    and (x.nytt_passord or x.endre_rolle)
$function$
;

-- mine_varsler()
CREATE OR REPLACE FUNCTION public.mine_varsler()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select jsonb_build_object(
    'lest_kl', now(),
    'varsler', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', v.id,
          'kategori', v.kategori,
          'ide', (select jsonb_build_object('id', i.id, 'tittel', i.tittel, 'forfatter_id', i.forfatter_id)
                  from public.ideer i where i.id = v.ide_id),
          'diskusjon', (select jsonb_build_object('id', d.id, 'tittel', d.tittel, 'side', d.side, 'forfatter_id', d.forfatter_id)
                        from public.diskusjoner d where d.id = v.diskusjon_id),
          'hendelser', v.hendelser,
          'opprettet_kl', v.opprettet_kl,
          'oppdatert_kl', v.oppdatert_kl,
          'lest_kl', v.lest_kl,
          'arkivert_kl', v.arkivert_kl
        ) order by v.oppdatert_kl desc, v.id)
      from (
        select v.id, v.kategori, v.ide_id, v.diskusjon_id, v.opprettet_kl, v.oppdatert_kl, v.lest_kl, v.arkivert_kl,
               intern.varselhendelser(v.hendelser) as hendelser
        from public.varsler v
        where v.mottaker_id = (select auth.uid())
          and (v.lest_kl is null or v.lest_kl > now() - intern.varselfrist())
        order by v.lest_kl is not null, v.oppdatert_kl desc, v.id
        limit 200
      ) v
      where jsonb_array_length(v.hendelser) > 0
    ), '[]'::jsonb)
  )
$function$
;

-- oppgave(oppgave uuid)
CREATE OR REPLACE FUNCTION public.oppgave(oppgave uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select jsonb_build_object(
      'id', o.id,
      'ide_id', i.id,
      'tittel', o.tittel,
      'kategori', i.kategori,
      'forfatter_id', i.forfatter_id,
      'status', o.status,
      'nummer', o.nummer,
      'endringslogg', o.endringslogg,
      'har_prompt', btrim(o.prompt) <> '',
      'prompt', o.prompt,
      'overfort_kl', o.overfort_kl,
      'endret_kl', o.endret_kl,
      'klar_kl', o.klar_kl,
      'tatt_kl', o.tatt_kl,
      'utfort_kl', o.utfort_kl,
      'merket_utfort', o.utfort_fra is not null
    )
  from public.oppgaver o
  join public.ideer i on i.id = o.ide_id
  where o.id = oppgave.oppgave and (select auth.uid()) is not null
$function$
;

-- oppgaveoversikt()
CREATE OR REPLACE FUNCTION public.oppgaveoversikt()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id,
      'ide_id', i.id,
      'tittel', o.tittel,
      'kategori', i.kategori,
      'forfatter_id', i.forfatter_id,
      'status', o.status,
      'nummer', o.nummer,
      'endringslogg', o.endringslogg,
      'har_prompt', btrim(o.prompt) <> '',
      'overfort_kl', o.overfort_kl,
      'endret_kl', o.endret_kl,
      'klar_kl', o.klar_kl,
      'tatt_kl', o.tatt_kl,
      'utfort_kl', o.utfort_kl,
      'merket_utfort', o.utfort_fra is not null
    ) order by o.overfort_kl desc, o.id), '[]'::jsonb)
  from public.oppgaver o
  join public.ideer i on i.id = o.ide_id
  where (select auth.uid()) is not null
$function$
;

-- rydd_idearkiv()
CREATE OR REPLACE FUNCTION public.rydd_idearkiv()
 RETURNS integer
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  with slettet as (
    delete from public.ideer i
    where i.arkivert_kl <= now() - intern.arkivfrist()
    returning 1
  )
  select count(*)::integer from slettet
$function$
;

-- sok_virkestoff(sok text, antall integer)
CREATE OR REPLACE FUNCTION public.sok_virkestoff(sok text, antall integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  with sporring as (
    select lower(btrim(sok)) as s
  ),
  treff as (
    select v.fest_id, v.data, v.navn,
      case
        when lower(v.navn) = q.s then 0
        when lower(v.navn) like q.s || '%' then 1
        else 2
      end as rang
    from legemiddeldata.virkestoff v, sporring q
    where v.utgatt_kl is null
      and char_length(q.s) >= 2
      and (strpos(lower(v.navn), q.s) > 0 or strpos(lower(coalesce(v.data ->> 'navn_engelsk', '')), q.s) > 0)
    order by rang, lower(v.navn)
    limit least(greatest(coalesce(antall, 20), 1), 50)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', t.fest_id,
    'navn', t.navn,
    'navn_engelsk', t.data -> 'navn_engelsk',
    'salt_av', coalesce((
      select jsonb_agg(m.navn order by m.navn)
      from legemiddeldata.virkestoff m
      where m.data -> 'salter' ? t.fest_id and m.utgatt_kl is null), '[]'),
    'preparater', (
      with stoff as (
        select t.fest_id as id
        union
        select jsonb_array_elements_text(t.data -> 'salter')
      )
      select count(*)
      from legemiddeldata.merkevare mv
      where mv.utgatt_kl is null
        and (mv.data -> 'virkestoff_med_styrke' ?| array(
               select s.fest_id from legemiddeldata.virkestoff_styrke s
               where s.virkestoff_id in (select id from stoff) and s.utgatt_kl is null)
             or mv.data -> 'virkestoff_uten_styrke' ?| array(select id from stoff)))
  ) order by t.rang, lower(t.navn)), '[]')
  from treff t
$function$
;

-- sokedata_versjoner()
CREATE OR REPLACE FUNCTION public.sokedata_versjoner()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select jsonb_build_object(
    'sider', (select v.last_value::text from intern.publisert_innhold_versjon v) || ':' || current_date::text,
    'fest', coalesce((
      select max(s.id)::text from legemiddeldata.synkroniseringer s
      where s.kilde = 'FEST' and s.status = 'fullfort'), '0'),
    'clinpgx', coalesce((
      select max(s.id)::text from clinpgx.synkroniseringer s where s.status in ('fullfort', 'delvis')), '0')
      || ':' || coalesce((select max(k.sist_hentet_kl)::text from clinpgx.kjemikalier k), ''),
    'cpic', coalesce(cpic.kilde() ->> 'endret_kl', ''),
    'laboratorier', coalesce((
      select max(s.id)::text from farmakologiportalen.synkroniseringer s where s.status = 'fullfort'), '0')
  )
$function$
;
