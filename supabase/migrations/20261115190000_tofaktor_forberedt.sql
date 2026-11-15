-- Tofaktor for de privilegerte rollene, forberedt men ikke slått på
-- (docs/s4-pilotplan.md §3.1 punkt 3 og 5, tiltak 7).
--
-- En konto i en rolle som krever tofaktor (systemarkitekt, adminrollen eller
-- lokal administrator) skal, når kravet er slått på, ha nøyaktig rettighetene
-- til et vanlig medlem så lenge økten bare er logget inn med passordet
-- (`aal1`). Først med koden fra autentiseringsappen (`aal2`) gjelder
-- privilegiene. Medlemskapet krever ikke koden.
--
-- Kravet legges i de grunnleggende fakta om privilegier, som alle de andre
-- kontrollene bygger på, og bare når det spørres om den innloggede selv:
--
--   * `intern.er_systemarkitekt(bruker)`;
--   * `intern.administrerte_fagmiljoer(bruker)`, som gir lokal administrator
--     (`intern.er_lokal_admin_i` og resten);
--   * adminrollen i `public.er_admin()` og `intern.krev_admin()`;
--   * `intern.myndighetsniva(bruker)`, som leser tabellene direkte.
--
-- Spørres det om en annen konto enn den innloggede, gjelder fakta som før:
-- myndigheten til den som spør, er alt avgjort med kravet. Edge-funksjonene
-- bruker tjenestenøkkelen og kontrollerer kravet med tokenets `aal` før noe
-- annet (`kontooperasjon_privilegier_tilgjengelige`, `_edge/kontekst.ts`).
--
-- Kravet er av: `intern.tofaktorkrav_paa()` svarer `false` til Peder har
-- bestemt det (D5a) og alle som omfattes har meldt inn en app. Da slås det på
-- i en egen migrasjon som gjør den om til `true`. Testene slår det på i sin
-- egen database (`tofaktorkrav.test.ts`).

-- --- Kravet og hvem det gjelder ----------------------------------------------

create function intern.tofaktorkrav_paa()
returns boolean
language sql
stable
set search_path = ''
as $$
  select false
$$;
revoke all on function intern.tofaktorkrav_paa() from public, anon, authenticated, service_role;
comment on function intern.tofaktorkrav_paa() is
  'Om privilegiene krever tofaktor (aal2). Av inntil D5a; slås på i en egen migrasjon (docs/s4-pilotplan.md §3.1).';

-- Rollene som krever tofaktor, lest rett fra tabellene: ingen av de andre
-- kontrollene, som selv bygger på kravet.
create function intern.krever_tofaktor(bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select krever_tofaktor.bruker is not null and (
    exists (
      select 1 from public.systemroller s
      where s.bruker_id = krever_tofaktor.bruker and s.rolle = 'systemarkitekt' and s.tilbakekalt_kl is null
    )
    or exists (select 1 from public.profiles p where p.id = krever_tofaktor.bruker and p.role = 'admin')
    or exists (
      select 1 from public.fagmiljoadministratorer a
      where a.bruker_id = krever_tofaktor.bruker and a.til is null
    )
  )
$$;
revoke all on function intern.krever_tofaktor(uuid) from public, anon, authenticated, service_role;

-- Om `bruker`, logget inn på `aal`, har privilegiene sine: når kravet er av,
-- uten innlogget bruker (serverprosessene), på `aal2`, eller når kontoen
-- ikke er i en rolle som krever tofaktor.
create function intern.privilegier_med(bruker uuid, aal text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.tofaktorkrav_paa() then true
    when privilegier_med.bruker is null then true
    when privilegier_med.aal = 'aal2' then true
    else not intern.krever_tofaktor(privilegier_med.bruker)
  end
$$;
revoke all on function intern.privilegier_med(uuid, text) from public, anon, authenticated, service_role;

-- Om den innloggede har privilegiene sine i denne økten.
create function intern.privilegier_tilgjengelige()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.privilegier_med(
    (select auth.uid()),
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'aal'
  )
$$;
revoke all on function intern.privilegier_tilgjengelige() from public, anon, authenticated, service_role;

-- Om fakta om privilegiene til `bruker` gjelder nå: alltid for en annen enn
-- den innloggede, og for den innloggede bare med privilegiene tilgjengelige.
create function intern.privilegier_for(bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select privilegier_for.bruker is distinct from (select auth.uid()) or intern.privilegier_tilgjengelige()
$$;
revoke all on function intern.privilegier_for(uuid) from public, anon, authenticated, service_role;

-- For Edge-funksjonene, som bruker tjenestenøkkelen: om den innloggede, med
-- `aal` fra tokenet sitt, har privilegiene sine.
create function public.kontooperasjon_privilegier_tilgjengelige(bruker uuid, aal text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select kontooperasjon_privilegier_tilgjengelige.bruker is not null
    and intern.privilegier_med(kontooperasjon_privilegier_tilgjengelige.bruker, kontooperasjon_privilegier_tilgjengelige.aal)
$$;
revoke all on function public.kontooperasjon_privilegier_tilgjengelige(uuid, text) from public, anon, authenticated;
grant execute on function public.kontooperasjon_privilegier_tilgjengelige(uuid, text) to service_role;

-- --- Fakta om privilegiene ----------------------------------------------------

create or replace function intern.er_systemarkitekt(bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.systemroller s
    where s.bruker_id = er_systemarkitekt.bruker
      and s.rolle = 'systemarkitekt'
      and s.tilbakekalt_kl is null
  ) and intern.privilegier_for(er_systemarkitekt.bruker)
$$;

create or replace function intern.administrerte_fagmiljoer(bruker uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select a.fagmiljo_id
  from public.fagmiljoadministratorer a
  join public.medlemskap m
    on m.bruker_id = a.bruker_id and m.fagmiljo_id = a.fagmiljo_id and m.status = 'aktiv'
  join public.fagmiljoer f on f.id = a.fagmiljo_id and f.status = 'aktiv'
  where a.bruker_id = administrerte_fagmiljoer.bruker and a.til is null
    and intern.privilegier_for(administrerte_fagmiljoer.bruker)
$$;

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
  ) and intern.privilegier_tilgjengelige()
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
  if not found or not intern.privilegier_tilgjengelige() then
    raise exception 'Bare administratorer kan endre faginnholdet.' using errcode = '42501';
  end if;
  return innlogget;
end;
$$;

create or replace function intern.myndighetsniva(bruker uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.privilegier_for(myndighetsniva.bruker) then 1
    when intern.er_systemarkitekt(myndighetsniva.bruker) then 3
    when exists (
      select 1 from public.profiles p where p.id = myndighetsniva.bruker and p.role = 'admin'
    ) or exists (
      select 1 from public.fagmiljoadministratorer a
      where a.bruker_id = myndighetsniva.bruker and a.til is null
    ) then 2
    else 1
  end
$$;

-- --- Kurateringen i migrasjonene ----------------------------------------------

create or replace function intern.kuratering_start(p_slug text, p_kurator text DEFAULT 'peohol'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  kurator uuid;
  side uuid;
begin
  select p.id into kurator from public.profiles p where p.username = p_kurator and p.role = 'admin';
  select s.objekt_id into side from public.infosider s where s.tilstand = 'publisert' and s.slug = p_slug;

  if kurator is null then
    if side is not null and exists (select 1 from public.profiles) then
      raise exception 'Stoffsiden «%» finnes, men ikke administratoren %, som kurateringen føres på.', p_slug, p_kurator;
    end if;
    raise notice 'Fant ingen administrator %, så kurateringen av «%» hoppes over.', p_kurator, p_slug;
    return null;
  end if;
  if side is null then
    raise exception 'Fant ingen publisert stoffside med nøkkelen «%».', p_slug;
  end if;

  -- Ingen andre kan legge til, endre eller fjerne elementer eller referanser
  -- før kurateringen er ferdig, så det preflighten fant, står til den er
  -- skrevet. Lesing går som før.
  lock table public.innholdselementer, public.referanser in share row exclusive mode;
  -- `aal2`: kurateringen kjøres av serveren i en migrasjon, ikke med et token,
  -- og skal ikke stoppes av tofaktorkravet (`intern.privilegier_tilgjengelige`).
  perform set_config('request.jwt.claims', jsonb_build_object('sub', kurator, 'role', 'authenticated', 'aal', 'aal2')::text, true);
  -- Det kurateringen endrer, føres som én kuratering, som må avsluttes med
  -- intern.kuratering_rapport (docs/innholdsendringer.md).
  perform set_config('far.kuratering', p_slug, true);
  return side;
end;
$function$;
