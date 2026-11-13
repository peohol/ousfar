-- Herdingen av adminoperasjonene: P1.2a i docs/ousfar-nasjonal-p0-kartlegging.md
-- (§6.1 og §8). Reglene står i docs/fagmiljoer.md, «Myndighet over kontoer».
--
-- Før dette kunne enhver med `profiles.role = 'admin'` gi enhver annen et nytt
-- passord (og dermed overta kontoen) og gi eller ta adminrollen fra hvem som
-- helst utenom seg selv. Nå avgjøres begge deler her, i databasen, mot
-- systemrollene, de lokale administratorene og medlemskapene fra P1.1:
--
--  * Ingen kan gi nytt passord til eller endre rollen til noen med samme
--    eller høyere myndighet, og ingen kan gjøre det med sin egen konto.
--  * En lokal administrator kan gi nytt passord bare til vanlige brukere som
--    ikke er medlem av noe annet fagmiljø enn dem vedkommende administrerer.
--  * Bare en systemarkitekt kan gi eller ta den gamle globale adminrollen.
--    Den følges av lokal administratortildeling i brukerens primære fagmiljø.
--  * Den siste administratoren, og den siste i et aktivt fagmiljø, kan ikke
--    fjernes.
--
-- Edge-funksjonene `nytt-passord` og `sett-rolle` kaller funksjonene under med
-- den hemmelige nøkkelen og ID-en fra JWT-en. Nettleseren kan ikke kalle dem.
-- Ingen andre rettigheter i appen endres: `er_admin()` betyr det samme som før.

-- --- Hvem som gjorde endringen ----------------------------------------------

-- Den innloggede, eller aktøren et serverkall oppgir med
-- `set_config('ousfar.tilgangsaktor', <id>, true)`. Den innloggede går alltid
-- foran, så ingen i nettleseren kan føre en endring på en annen.
create function intern.tilgangsaktor()
returns uuid
language sql
stable
set search_path = ''
as $$
  select coalesce(
    (select auth.uid()),
    nullif(btrim(current_setting('ousfar.tilgangsaktor', true)), '')::uuid
  )
$$;

revoke all on function intern.tilgangsaktor() from public, anon, authenticated, service_role;

-- Som i P1.1, men med aktøren fra serverkallene.
create or replace function intern.loggfor_tilgang()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad jsonb := case tg_op when 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.tilgangslogg (aktor, handling, bruker_id, fagmiljo_id, grunn, foer, etter)
  values (
    intern.tilgangsaktor(),
    tg_table_name || '.' || lower(tg_op),
    (rad ->> 'bruker_id')::uuid,
    (case tg_table_name when 'fagmiljoer' then rad ->> 'id' else rad ->> 'fagmiljo_id' end)::uuid,
    intern.tilgangsgrunn(),
    case tg_op when 'INSERT' then null else to_jsonb(old) end,
    case tg_op when 'DELETE' then null else to_jsonb(new) end
  );
  return null;
end;
$$;

-- --- Den gamle rollen føres i loggen og serialiseres -------------------------

-- `profiles.role` gir fortsatt alle adminrettighetene i appen (til P2), så en
-- endring av den er en tilgangsendring som de andre: den føres i loggen, og
-- den venter på den felles låsen fra P1.1, slik at den ikke kan skje midt i
-- en kontroll av den samme kontoen.
create function intern.loggfor_rolleendring()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.tilgangslogg (aktor, handling, bruker_id, grunn, foer, etter)
  values (
    intern.tilgangsaktor(),
    'profiles.update',
    new.id,
    intern.tilgangsgrunn(),
    jsonb_build_object('role', old.role),
    jsonb_build_object('role', new.role)
  );
  return null;
end;
$$;

revoke all on function intern.loggfor_rolleendring() from public, anon, authenticated, service_role;

create trigger profiles_rolle_serialiser
before update of role on public.profiles
for each statement execute function intern.serialiser_tilgang();

create trigger profiles_rolle_logg
after update of role on public.profiles
for each row when (old.role is distinct from new.role)
execute function intern.loggfor_rolleendring();

-- --- Myndigheten ------------------------------------------------------------

-- Den høyeste myndigheten en konto har over andre kontoer, uansett fagmiljø:
-- 3 systemarkitekt, 2 administrator (lokal administrator hvor som helst, eller
-- den gamle globale adminrollen), 1 alle andre. Brukes om den som rammes, og
-- tar med alt som kan gi myndighet, så en konto aldri regnes lavere enn den er.
create function intern.myndighetsniva(bruker uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
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

revoke all on function intern.myndighetsniva(uuid) from public, anon, authenticated, service_role;

-- Fagmiljøene brukeren faktisk administrerer nå: aktiv tildeling, aktivt
-- medlemskap og aktivt fagmiljø. Brukes om den som handler, og krever alt,
-- så en halvveis avsluttet tildeling aldri gir myndighet.
create function intern.administrerte_fagmiljoer(bruker uuid)
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
$$;

revoke all on function intern.administrerte_fagmiljoer(uuid) from public, anon, authenticated, service_role;

-- Stopper handlingen med en lesbar melding når `aktor` ikke har myndighet til
-- å gjøre den med `mal`. `handling` er 'passord' eller 'rolle'.
--
-- Kontrollen skal kjøres med den felles låsen holdt (`intern.las_tilgang()`),
-- slik at ingen tilgang kan endres mellom kontrollen og handlingen.
--
-- Meldingene vises for administratoren som prøvde. Kodene oversettes til
-- HTTP-svar i Edge-funksjonene: 42501 nektet, P0002 ukjent, 22023 ugyldig.
create function intern.krev_myndighet_over(aktor uuid, mal uuid, handling text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  fremmed_fagmiljo text;
begin
  if handling not in ('passord', 'rolle') then
    raise exception 'Ukjent kontooperasjon.' using errcode = '22023';
  end if;
  if aktor is null or not exists (select 1 from public.profiles p where p.id = aktor) then
    raise exception 'Kontoen din finnes ikke lenger.' using errcode = '42501';
  end if;
  if mal is null or not exists (select 1 from public.profiles p where p.id = mal) then
    raise exception 'Ukjent bruker.' using errcode = 'P0002';
  end if;

  if aktor = mal then
    raise exception '%', case handling
      when 'rolle' then 'Du kan ikke endre din egen rolle.'
      else 'Du kan ikke gi deg selv nytt passord her. Bytt det fra kontoen din.'
    end using errcode = '42501';
  end if;

  if intern.er_systemarkitekt(aktor) then
    if intern.myndighetsniva(mal) >= 3 then
      raise exception '%', case handling
        when 'rolle' then 'Rollen til en systemarkitekt kan ikke endres her.'
        else 'En systemarkitekt kan ikke få nytt passord av en annen.'
      end using errcode = '42501';
    end if;
    return;
  end if;

  -- Den gamle globale rollen gir adminrettigheter i alle fagmiljøer, så bare
  -- en systemarkitekt kan gi eller ta den.
  if handling = 'rolle' then
    raise exception 'Bare en systemarkitekt kan gjøre noen til administrator eller fjerne adminstatus.'
      using errcode = '42501';
  end if;

  if not exists (select 1 from intern.administrerte_fagmiljoer(aktor)) then
    raise exception 'Handlingen krever at du er administrator i et fagmiljø.' using errcode = '42501';
  end if;

  if intern.myndighetsniva(mal) >= 2 then
    raise exception 'En administrator eller systemarkitekt kan ikke få nytt passord av deg.'
      using errcode = '42501';
  end if;

  -- Passordet gjelder hele kontoen, så alle fagmiljøene brukeren hører til
  -- (også inviterte), må være administrert av den som gir det.
  if not exists (
    select 1 from public.medlemskap m where m.bruker_id = mal and m.status <> 'deaktivert'
  ) then
    raise exception 'Brukeren er ikke medlem av noe fagmiljø du administrerer.' using errcode = '42501';
  end if;

  select f.navn into fremmed_fagmiljo
  from public.medlemskap m
  join public.fagmiljoer f on f.id = m.fagmiljo_id
  where m.bruker_id = mal and m.status <> 'deaktivert'
    and m.fagmiljo_id not in (select intern.administrerte_fagmiljoer(aktor))
  order by f.navn
  limit 1;

  if fremmed_fagmiljo is not null then
    raise exception 'Brukeren hører også til «%», som du ikke administrerer. Be en systemarkitekt om hjelp.',
      fremmed_fagmiljo using errcode = '42501';
  end if;
end;
$$;

revoke all on function intern.krev_myndighet_over(uuid, uuid, text) from public, anon, authenticated, service_role;

-- Tar den felles låsen fra P1.1 og oppgir hvem som handler og hvorfor, for
-- resten av transaksjonen.
--
-- Kontrollene etter låsen skal se det siste som er lagret, også det en annen
-- transaksjon lagret mens denne ventet på låsen. Det gjør de i `read
-- committed`, som data-API-et bruker: hver setning i operasjonene får et nytt
-- øyeblikksbilde. I `repeatable read` og strengere ville de sett tilstanden fra
-- før ventingen, så der stoppes operasjonen heller enn å avgjøres på gamle
-- data.
create function intern.las_tilgang(aktor uuid, grunn text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('transaction_isolation') <> 'read committed' then
    raise exception 'Kontooperasjonene må kjøres i read committed.' using errcode = '25001';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('ousfar.tilgang', 0));
  perform set_config('ousfar.tilgangsaktor', coalesce(aktor::text, ''), true);
  perform set_config('ousfar.tilgangsgrunn', grunn, true);
end;
$$;

revoke all on function intern.las_tilgang(uuid, text) from public, anon, authenticated, service_role;

-- Et merke for tilgangene til kontoen: den siste raden i tilgangsloggen om den.
-- Endres noe som kan gi kontoen myndighet (rolle, systemrolle, lokal
-- administrator, medlemskap), endres merket, også om endringen er reversert.
create function intern.tilgangsmerke(bruker uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(max(l.id), 0) from public.tilgangslogg l where l.bruker_id = tilgangsmerke.bruker
$$;

revoke all on function intern.tilgangsmerke(uuid) from public, anon, authenticated, service_role;

-- --- Nytt passord ------------------------------------------------------------

-- Passordet byttes i Auth, utenfor databasen, så operasjonen går i tre steg:
--
--  1. `kontooperasjon_klarer_passord` kontrollerer myndigheten og reserverer
--     kontoen for denne tilbakestillingen. Reservasjonen husker merket for
--     tilgangene til kontoen og får en nøkkel som bare den som reserverte, får.
--  2. Edge-funksjonen gir kontoen et nytt, tilfeldig passord i Auth.
--  3. `kontooperasjon_fullfor_passord` kontrollerer myndigheten på nytt, at
--     reservasjonen fortsatt er den samme og at merket er uendret, setter
--     kontoen tilbake i førstegangsoppsett og fører det i loggen. Først da gis
--     passordet ut.
--
-- Endres tilgangene til kontoen mellom steg 1 og 3, stopper steg 3, og
-- passordet gis aldri ut. Kontoen står da med et passord ingen kjenner, til
-- noen med myndighet gir et nytt. Steg 1 gjør at ingen uten myndighet kan
-- komme så langt.
--
-- Bare én tilbakestilling av en konto kan være i gang om gangen, ellers kunne
-- to administratorer skrevet hvert sitt passord til Auth og den ene fått
-- utlevert et som alt var overskrevet. En reservasjon står til den fullføres
-- eller frigis (`kontooperasjon_frigi_passord`, når steg 2 eller 3 feiler), og
-- er uansett ute etter ti minutter, lenger enn en Edge-funksjon kan kjøre.
create table intern.passordreservasjoner (
  bruker_id uuid primary key references public.profiles (id) on delete cascade,
  aktor uuid not null,
  merke bigint not null,
  nokkel uuid not null default gen_random_uuid(),
  reservert_kl timestamptz not null default now()
);

comment on table intern.passordreservasjoner is
  'Tilbakestillinger av passord som er i gang: én per konto. Se kontooperasjon_klarer_passord.';

revoke all on intern.passordreservasjoner from public, anon, authenticated, service_role;

create function public.kontooperasjon_klarer_passord(aktor uuid, mal uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  nokkel uuid;
begin
  perform intern.las_tilgang(aktor, 'nytt-passord: kontroll');
  perform intern.krev_myndighet_over(aktor, mal, 'passord');

  if exists (
    select 1 from intern.passordreservasjoner r
    where r.bruker_id = mal and r.reservert_kl > now() - interval '10 minutes'
  ) then
    raise exception 'Brukeren får allerede nytt passord av en annen administrator. Prøv igjen om litt.'
      using errcode = '55P03';
  end if;

  insert into intern.passordreservasjoner as r (bruker_id, aktor, merke)
  values (mal, aktor, intern.tilgangsmerke(mal))
  on conflict (bruker_id) do update
    set aktor = excluded.aktor, merke = excluded.merke,
        nokkel = gen_random_uuid(), reservert_kl = now()
  returning r.nokkel into nokkel;

  return nokkel;
end;
$$;

create function public.kontooperasjon_fullfor_passord(aktor uuid, mal uuid, reservasjon uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  merke bigint;
  brukernavn text;
begin
  perform intern.las_tilgang(aktor, 'nytt-passord');
  perform intern.krev_myndighet_over(aktor, mal, 'passord');

  -- Er reservasjonen ute og tatt over av en annen, har den andre kanskje
  -- skrevet sitt passord etter dette; da gis ikke dette ut.
  delete from intern.passordreservasjoner r
  where r.bruker_id = mal and r.aktor = kontooperasjon_fullfor_passord.aktor and r.nokkel = reservasjon
  returning r.merke into merke;

  if merke is null then
    raise exception 'Tilbakestillingen ble avbrutt eller tatt over av en annen, så passordet ble ikke gitt ut. Prøv igjen.'
      using errcode = '40001';
  end if;

  if merke <> intern.tilgangsmerke(mal) then
    raise exception 'Tilgangene til brukeren ble endret mens passordet ble laget, så det ble ikke gitt ut. Prøv igjen.'
      using errcode = '40001';
  end if;

  update public.profiles p set must_change_password = true
  where p.id = mal
  returning p.username into brukernavn;

  insert into public.tilgangslogg (aktor, handling, bruker_id, grunn)
  values (aktor, 'passord.update', mal, intern.tilgangsgrunn());

  return brukernavn;
end;
$$;

-- Frigir en reservasjon når passordet ikke ble byttet eller ikke gitt ut, så
-- en ny tilbakestilling kan starte med en gang. Bare den som har nøkkelen.
create function public.kontooperasjon_frigi_passord(aktor uuid, mal uuid, reservasjon uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from intern.passordreservasjoner r
  where r.bruker_id = kontooperasjon_frigi_passord.mal
    and r.aktor = kontooperasjon_frigi_passord.aktor
    and r.nokkel = kontooperasjon_frigi_passord.reservasjon
$$;

-- --- Rolle -------------------------------------------------------------------

-- Gir eller tar den gamle globale adminrollen, og holder de lokale
-- administratortildelingene i takt med den: en ny administrator blir lokal
-- administrator i sitt primære fagmiljø (slik tilbakefyllingen i P1.1 gjorde
-- med dem som var administratorer), og den som mister rollen, slutter som
-- lokal administrator overalt.
create function public.kontooperasjon_sett_rolle(aktor uuid, mal uuid, rolle public.brukerrolle)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  profil public.profiles;
  eneste_i text;
begin
  perform intern.las_tilgang(aktor, 'sett-rolle: ' || rolle::text);
  perform intern.krev_myndighet_over(aktor, mal, 'rolle');

  select * into profil from public.profiles p where p.id = mal for update;

  if rolle = 'admin' then
    -- Et midlertidig passord kan være kjent av den som laget det. Kontoen
    -- skal ikke få mer myndighet før eieren har valgt sitt eget.
    if profil.role <> 'admin' and (profil.must_change_password or not profil.onboarding_completed) then
      raise exception 'Brukeren må ha logget inn og valgt sitt eget passord før den kan bli administrator.'
        using errcode = '42501';
    end if;

    update public.profiles p set role = 'admin' where p.id = mal returning * into profil;

    insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id, tildelt_av)
    select m.bruker_id, m.fagmiljo_id, aktor
    from public.medlemskap m
    where m.bruker_id = mal and m.primaer and m.status = 'aktiv'
      and not exists (
        select 1 from public.fagmiljoadministratorer a
        where a.bruker_id = m.bruker_id and a.fagmiljo_id = m.fagmiljo_id and a.til is null
      );
  else
    if profil.role = 'admin' and not exists (
      select 1 from public.profiles p where p.role = 'admin' and p.id <> mal
    ) then
      raise exception 'Den siste administratoren kan ikke fjernes.' using errcode = '23514';
    end if;

    select f.navn into eneste_i
    from public.fagmiljoadministratorer a
    join public.fagmiljoer f on f.id = a.fagmiljo_id and f.status = 'aktiv'
    where a.bruker_id = mal and a.til is null
      and not exists (
        select 1 from public.fagmiljoadministratorer b
        where b.fagmiljo_id = a.fagmiljo_id and b.til is null and b.bruker_id <> mal
      )
    order by f.navn
    limit 1;

    if eneste_i is not null then
      raise exception 'Brukeren er den eneste administratoren i «%». Utpek en annen først.', eneste_i
        using errcode = '23514';
    end if;

    update public.profiles p set role = 'user' where p.id = mal returning * into profil;

    update public.fagmiljoadministratorer a set til = now()
    where a.bruker_id = mal and a.til is null;
  end if;

  return profil;
end;
$$;

-- --- Den første administratoren ----------------------------------------------

-- Brukes av `npm run bootstrap:admin` og det lokale testmiljøet, med den
-- hemmelige nøkkelen: gir kontoen adminrollen og lokal administratortildeling
-- i sitt primære fagmiljø, slik `kontooperasjon_sett_rolle` gjør. Finnes det
-- ingen systemarkitekt (en ny, tom database), blir kontoen den første, så noen
-- kan administrere de andre. I produksjonen finnes de, og ingen blir det her.
create function public.kontooperasjon_forste_administrator(bruker uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.las_tilgang(null, 'første administrator (bootstrap)');
  if not exists (select 1 from public.profiles p where p.id = bruker) then
    raise exception 'Ukjent bruker.' using errcode = 'P0002';
  end if;

  update public.profiles p set role = 'admin' where p.id = bruker and p.role <> 'admin';

  insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id)
  select m.bruker_id, m.fagmiljo_id
  from public.medlemskap m
  where m.bruker_id = bruker and m.primaer and m.status = 'aktiv'
    and not exists (
      select 1 from public.fagmiljoadministratorer a
      where a.bruker_id = m.bruker_id and a.fagmiljo_id = m.fagmiljo_id and a.til is null
    );

  if not exists (
    select 1 from public.systemroller s where s.rolle = 'systemarkitekt' and s.tilbakekalt_kl is null
  ) then
    insert into public.systemroller (bruker_id, rolle) values (bruker, 'systemarkitekt');
  end if;
end;
$$;

-- Bare serveren, med den hemmelige nøkkelen, kan kalle operasjonene.
revoke all on function public.kontooperasjon_klarer_passord(uuid, uuid) from public, anon, authenticated;
revoke all on function public.kontooperasjon_fullfor_passord(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.kontooperasjon_frigi_passord(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.kontooperasjon_sett_rolle(uuid, uuid, public.brukerrolle) from public, anon, authenticated;
grant execute on function public.kontooperasjon_klarer_passord(uuid, uuid) to service_role;
grant execute on function public.kontooperasjon_fullfor_passord(uuid, uuid, uuid) to service_role;
grant execute on function public.kontooperasjon_frigi_passord(uuid, uuid, uuid) to service_role;
grant execute on function public.kontooperasjon_sett_rolle(uuid, uuid, public.brukerrolle) to service_role;
revoke all on function public.kontooperasjon_forste_administrator(uuid) from public, anon, authenticated;
grant execute on function public.kontooperasjon_forste_administrator(uuid) to service_role;
