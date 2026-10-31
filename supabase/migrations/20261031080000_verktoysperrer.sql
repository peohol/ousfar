-- Nødstopp for de kliniske verktøyene (P11.6 i `docs/verktøy-utviklingsplan.md`).
--
-- En administrator kan deaktivere alle verktøyene, ett verktøy eller én regel
-- med en gang, uten en ny versjon av appen, og oppheve sperren igjen. Appen
-- leser de aktive sperrene før den viser en beregning eller fagtekst, og igjen
-- i det den beregner. Får den ikke lest dem, viser den ingenting klinisk
-- (`src/verktoy/sperrer.ts`, `docs/verktøy-p11-publisering.md`).
--
-- En sperre slettes aldri. Når den oppheves, står det hvem som gjorde det,
-- når og hvorfor, så historikken viser hvert stopp. Tabellen leses og skrives
-- bare gjennom funksjonene under.

create table public.verktoysperrer (
  id uuid primary key default gen_random_uuid(),
  omfang text not null,
  mal text,
  grunn text not null,
  satt_av uuid not null references public.profiles (id),
  satt_kl timestamptz not null default now(),
  opphevet_av uuid references public.profiles (id),
  opphevet_kl timestamptz,
  opphevet_grunn text,
  constraint verktoysperrer_omfang check (omfang in ('alle', 'verktoy', 'regel')),
  constraint verktoysperrer_mal check (
    case when omfang = 'alle' then mal is null else mal is not null and mal ~ '^[a-z0-9][a-z0-9-]{0,99}$' end
  ),
  constraint verktoysperrer_grunn check (char_length(btrim(grunn)) between 5 and 500),
  constraint verktoysperrer_opphevet check (
    (opphevet_kl is null and opphevet_av is null and opphevet_grunn is null)
    or (opphevet_kl is not null and opphevet_av is not null and char_length(btrim(opphevet_grunn)) between 5 and 500 and opphevet_kl >= satt_kl)
  )
);

comment on table public.verktoysperrer is
  'Nødstopp for de kliniske verktøyene: alle, ett verktøy eller én regel. En sperre er aktiv til den er opphevet; ingen rad slettes.';

-- Én aktiv sperre per mål.
create unique index verktoysperrer_aktiv on public.verktoysperrer (omfang, coalesce(mal, '')) where opphevet_kl is null;

alter table public.verktoysperrer enable row level security;

revoke all on table public.verktoysperrer from public, anon, authenticated;

-- --- Lesing ----------------------------------------------------------------------

-- Navnet slik det står i profilen nå.
create function intern.profilnavn(bruker uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(btrim(p.first_name || ' ' || p.last_name), ''), p.username)
  from public.profiles p
  where p.id = profilnavn.bruker
$$;

-- De aktive sperrene, for alle som er logget inn: appen må lese dem før den
-- viser noe klinisk.
create function public.les_verktoysperrer()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
$$;

-- Alle sperrene, også de opphevede, nyeste først: bare for administratorer.
create function public.verktoysperrehistorikk()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.er_admin() then
    raise exception 'Bare administratorer kan se historikken for sperrene.' using errcode = '42501';
  end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'omfang', s.omfang,
        'mal', s.mal,
        'grunn', s.grunn,
        'satt_kl', s.satt_kl,
        'satt_av', intern.profilnavn(s.satt_av),
        'opphevet_kl', s.opphevet_kl,
        'opphevet_av', intern.profilnavn(s.opphevet_av),
        'opphevet_grunn', s.opphevet_grunn
      ) order by s.satt_kl desc, s.id), '[]'::jsonb)
    from public.verktoysperrer s
  );
end;
$$;

-- --- Det en administrator gjør i appen ---------------------------------------------

create function public.sett_verktoysperre(omfang text, mal text, grunn text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ny uuid;
begin
  if not public.er_admin() then
    raise exception 'Bare administratorer kan deaktivere kliniske verktøy.' using errcode = '42501';
  end if;
  insert into public.verktoysperrer (omfang, mal, grunn, satt_av)
  values (sett_verktoysperre.omfang, nullif(btrim(sett_verktoysperre.mal), ''), btrim(sett_verktoysperre.grunn), (select auth.uid()))
  returning id into ny;
  return ny;
exception
  when unique_violation then
    raise exception 'Det er allerede en aktiv sperre for dette.' using errcode = '23505';
end;
$$;

create function public.opphev_verktoysperre(sperre uuid, grunn text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.er_admin() then
    raise exception 'Bare administratorer kan oppheve en sperre.' using errcode = '42501';
  end if;
  update public.verktoysperrer s
  set opphevet_kl = greatest(now(), s.satt_kl), opphevet_av = (select auth.uid()), opphevet_grunn = btrim(opphev_verktoysperre.grunn)
  where s.id = opphev_verktoysperre.sperre and s.opphevet_kl is null;
  if not found then
    raise exception 'Sperren finnes ikke, eller er allerede opphevet.' using errcode = '55000';
  end if;
end;
$$;

comment on function public.les_verktoysperrer() is
  'De aktive sperrene for de kliniske verktøyene, for innloggede brukere.';
comment on function public.verktoysperrehistorikk() is
  'Alle sperrene for de kliniske verktøyene, også de opphevede. Bare for administratorer.';
comment on function public.sett_verktoysperre(text, text, text) is
  'Deaktiverer alle verktøyene, ett verktøy eller én regel med en grunn. Bare for administratorer.';
comment on function public.opphev_verktoysperre(uuid, text) is
  'Opphever en aktiv sperre med en grunn. Bare for administratorer.';

-- --- Rettigheter ---------------------------------------------------------------------

revoke all on function intern.profilnavn(uuid) from public, anon, authenticated, service_role;
revoke all on function public.les_verktoysperrer() from public, anon, authenticated, service_role;
revoke all on function public.verktoysperrehistorikk() from public, anon, authenticated, service_role;
revoke all on function public.sett_verktoysperre(text, text, text) from public, anon, authenticated, service_role;
revoke all on function public.opphev_verktoysperre(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.les_verktoysperrer() to authenticated;
grant execute on function public.verktoysperrehistorikk() to authenticated;
grant execute on function public.sett_verktoysperre(text, text, text) to authenticated;
grant execute on function public.opphev_verktoysperre(uuid, text) to authenticated;
