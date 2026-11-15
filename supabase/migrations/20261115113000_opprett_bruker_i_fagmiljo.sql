-- Nye brukere opprettes direkte i fagmiljøet den som oppretter, administrerer
-- (issue #395, punkt 2; docs/fagmiljoer.md «Opprettelse av brukere»).
--
-- Før dette ble hver ny konto medlem av standardfagmiljøet
-- (`profiles_standardmedlemskap`), og bare systemarkitektene og de lokale
-- administratorene der kunne opprette kontoer. En lokal administrator i et
-- annet fagmiljø kunne derfor ikke opprette egne brukere.
--
-- Nå oppgir den som oppretter fagmiljøet kontoen skal høre til. Klareringen
-- (`kontooperasjon_klarer_konto`) kontrollerer myndigheten der under den
-- felles låsen og husker fagmiljøet i reservasjonen. Utløseren på
-- `auth.users` kontrollerer myndigheten på nytt under låsen, og kontoen får
-- profilen og primærmedlemskapet i det fagmiljøet i samme transaksjon som
-- Auth-brukeren. Feiler noe, blir det ingen konto, ingen profil og intet
-- medlemskap.
--
-- Myndigheten er den samme som for å gi medlemskap: lokal administrator i
-- fagmiljøet nå (`intern.er_lokal_admin_i`), eller systemarkitekt. Kontoen blir
-- en vanlig bruker med ett medlemskap; ingen roller eller andre medlemskap
-- følger med. Et lukket fagmiljø tar fortsatt ikke imot nye kontoer
-- (startporten S2, regel 6). En reservasjon uten aktør (oppstartsskriptet,
-- testene) gir standardfagmiljøet som før.

-- --- Reservasjonen husker fagmiljøet -----------------------------------------

alter table public.kontoreservasjoner
  add column fagmiljo_id uuid references public.fagmiljoer (id),
  add column nokkel uuid not null default gen_random_uuid();

comment on column public.kontoreservasjoner.fagmiljo_id is
  'Fagmiljøet kontoen blir medlem av (opprett-bruker). Tom gir standardfagmiljøet, for server-side jobber.';
comment on column public.kontoreservasjoner.nokkel is
  'Ny for hver klarering. Edge-funksjonen trekker bare tilbake reservasjonen med sin egen nøkkel, så opprydding etter et gammelt forsøk ikke fjerner et nyere.';

-- --- Avgjørelsen --------------------------------------------------------------

drop function intern.opprettelsesavslag(uuid);

-- Avgjør om `aktor` kan opprette en ny konto i `fagmiljo`. Gir `null` når det
-- er lov, ellers `{sqlstate, melding}` som `intern.kontoavslag`. Et ukjent
-- fagmiljø og et fagmiljø aktøren ikke administrerer gir det samme svaret, så
-- svaret ikke røper noe om fagmiljøer aktøren ikke hører til. Den gamle
-- adminrollen teller ikke.
create function intern.opprettelsesavslag(aktor uuid, fagmiljo uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  f public.fagmiljoer;
begin
  if aktor is null or not exists (select 1 from public.profiles p where p.id = aktor) then
    return array['42501', 'Kontoen din finnes ikke lenger.'];
  end if;
  if not intern.har_aktivt_medlemskap(aktor) then
    return array['42501', 'Du har ikke lenger et aktivt medlemskap i OUSFAR.'];
  end if;
  select * into f from public.fagmiljoer x where x.id = fagmiljo;
  if not found or not intern.er_lokal_admin_i(f.id, aktor) then
    return array['42501', 'Du kan bare opprette brukere i fagmiljøer du administrerer.'];
  end if;
  if f.status <> 'aktiv' then
    return array['55000', format('%s er arkivert og tar ikke imot nye brukere.', f.navn)];
  end if;
  -- En ny konto er aldri systemarkitekt, så et lukket fagmiljø kan ikke ta
  -- imot den (startporten S2, regel 6).
  if not f.apent_for_medlemmer then
    return array['42501', format('%s tar ikke imot medlemmer ennå (startport S2).', f.navn)];
  end if;
  return null;
end;
$$;

revoke all on function intern.opprettelsesavslag(uuid, uuid) from public, anon, authenticated, service_role;

-- Fagmiljøet en ny konto skal høre til: det oppgitte, ellers standarden.
create function intern.opprettelsesfagmiljo(fagmiljo uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(fagmiljo, (select f.id from public.fagmiljoer f where f.standard))
$$;

revoke all on function intern.opprettelsesfagmiljo(uuid) from public, anon, authenticated, service_role;

-- --- Klareringen ----------------------------------------------------------------

drop function public.kontooperasjon_klarer_konto(uuid, text);

-- Kontrollerer myndigheten i fagmiljøet og klarerer brukernavnet for
-- `opprett-bruker`, med den felles låsen holdt, før Edge-funksjonen slår opp
-- noe. Uten fagmiljø gjelder standarden, som for en eldre versjon av appen.
-- Gir fagmiljøet tilbake (`intern.fagmiljoreferanse`), så kvitteringen kan si
-- hvor brukeren ble medlem, med nøkkelen til denne klareringen
-- (`reservasjon`), som kreves for å trekke den tilbake.
--
-- En fersk klarering av det samme brukernavnet for en annen aktør eller et
-- annet fagmiljø står (`55P03`). Ellers kunne den ene administratoren fått ut
-- passordet til en konto den andre bestilte i sitt fagmiljø. Den samme
-- aktøren kan klarere på nytt for det samme fagmiljøet, så et brutt kall kan
-- gjentas.
create function public.kontooperasjon_klarer_konto(aktor uuid, brukernavn text, fagmiljo uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  mal uuid := intern.opprettelsesfagmiljo(kontooperasjon_klarer_konto.fagmiljo);
  avslag text[];
  annen public.kontoreservasjoner;
  ny_nokkel uuid;
begin
  perform intern.las_tilgang(aktor, 'opprett-bruker: kontroll');
  avslag := intern.opprettelsesavslag(aktor, mal);
  if avslag is not null then
    raise exception '%', avslag[2] using errcode = avslag[1];
  end if;

  select * into annen from public.kontoreservasjoner r
  where r.username = kontooperasjon_klarer_konto.brukernavn
    and r.reservert_kl >= now() - interval '15 minutes'
    and (r.aktor is distinct from kontooperasjon_klarer_konto.aktor or r.fagmiljo_id is distinct from mal);
  if found then
    raise exception 'Brukernavnet er i ferd med å bli opprettet av en annen. Prøv igjen om litt.'
      using errcode = '55P03';
  end if;

  insert into public.kontoreservasjoner as r (username, reservert_kl, aktor, fagmiljo_id)
  values (kontooperasjon_klarer_konto.brukernavn, now(), kontooperasjon_klarer_konto.aktor, mal)
  on conflict (username) do update
    set reservert_kl = excluded.reservert_kl, aktor = excluded.aktor, fagmiljo_id = excluded.fagmiljo_id,
        nokkel = gen_random_uuid()
  returning r.nokkel into ny_nokkel;

  return (select intern.fagmiljoreferanse(f) || jsonb_build_object('reservasjon', ny_nokkel) from public.fagmiljoer f where f.id = mal);
end;
$$;

revoke all on function public.kontooperasjon_klarer_konto(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.kontooperasjon_klarer_konto(uuid, text, uuid) to service_role;

-- --- Opprettelsen ---------------------------------------------------------------

-- Utløseren på `auth.users`, som før, men med fagmiljøet fra reservasjonen.
-- Låsen tas før reservasjonen låses, i samme rekkefølge som klareringen, så
-- de to aldri venter på hverandre i kryss. Reservasjonen leses på nytt under
-- låsen, myndigheten i fagmiljøet kontrolleres igjen, og profilen legges inn
-- mens reservasjonen fortsatt står, slik at medlemskapet (under) får
-- fagmiljøet derfra. Reservasjonen brukes opp til slutt.
create or replace function public.handter_ny_auth_bruker()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nytt_brukernavn text;
  bestiller uuid;
  fagmiljo uuid;
  avslag text[];
begin
  if lower(split_part(coalesce(new.email, ''), '@', 2)) <> public.intern_auth_domene() then
    raise exception 'OUSFAR er lukket. Kontoer opprettes bare av en administrator.'
      using errcode = '42501';
  end if;

  nytt_brukernavn := public.brukernavn_normalisert(split_part(new.email, '@', 1));
  if not public.brukernavn_er_gyldig(nytt_brukernavn) then
    raise exception 'Ugyldig brukernavn: %', nytt_brukernavn using errcode = '22023';
  end if;

  delete from public.kontoreservasjoner
  where reservert_kl < now() - interval '15 minutes';

  select r.aktor into bestiller from public.kontoreservasjoner r where r.username = nytt_brukernavn;
  if not found then
    raise exception 'OUSFAR er lukket. Kontoer opprettes bare av en administrator.'
      using errcode = '42501';
  end if;

  if bestiller is not null then
    perform intern.las_tilgang(bestiller, 'Ny konto opprettet i fagmiljøet');
  end if;

  select r.aktor, r.fagmiljo_id into bestiller, fagmiljo
  from public.kontoreservasjoner r where r.username = nytt_brukernavn
  for update;
  if not found then
    raise exception 'OUSFAR er lukket. Kontoer opprettes bare av en administrator.'
      using errcode = '42501';
  end if;

  if bestiller is not null then
    avslag := intern.opprettelsesavslag(bestiller, intern.opprettelsesfagmiljo(fagmiljo));
    if avslag is not null then
      raise exception '%', avslag[2] using errcode = avslag[1];
    end if;
  end if;

  insert into public.profiles (id, username) values (new.id, nytt_brukernavn);
  delete from public.kontoreservasjoner where username = nytt_brukernavn;
  return new;
end;
$$;

revoke all on function public.handter_ny_auth_bruker() from public, anon, authenticated;

-- En ny konto får aktivt primærmedlemskap i fagmiljøet reservasjonen
-- navngir, ellers i standardfagmiljøet, i samme transaksjon som profilen. Den
-- som bestilte kontoen, står som den som tildelte medlemskapet.
create or replace function intern.gi_standardmedlemskap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fagmiljo uuid;
  bestiller uuid;
begin
  select r.fagmiljo_id, r.aktor into fagmiljo, bestiller
  from public.kontoreservasjoner r where r.username = new.username;

  insert into public.medlemskap (bruker_id, fagmiljo_id, primaer, tildelt_av)
  select new.id, f.id, true, bestiller
  from public.fagmiljoer f where f.id = intern.opprettelsesfagmiljo(fagmiljo);
  if not found then
    raise exception 'Det finnes ikke noe fagmiljø for den nye kontoen.'
      using errcode = '55000';
  end if;
  return null;
end;
$$;

revoke all on function intern.gi_standardmedlemskap() from public, anon, authenticated, service_role;

-- --- Det appen spør om ----------------------------------------------------------

-- Som i 20261115020000_velg_arbeidsfagmiljo.sql, med `opprett_bruker_i`: de
-- fagmiljøene den innloggede kan opprette brukere i, etter samme avgjørelse
-- som klareringen. `opprett_bruker` står for eldre versjoner av appen.
create or replace function public.mine_rettigheter()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  with opprett as (
    select coalesce(jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn), '[]'::jsonb) as i
    from public.fagmiljoer f
    where intern.opprettelsesavslag((select auth.uid()), f.id) is null
  )
  select jsonb_build_object(
    'systemarkitekt', public.er_systemarkitekt(),
    'administrerer', coalesce((
      select jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn)
      from public.fagmiljoer f
      where f.id = any (public.mine_administrerte_fagmiljoer())
    ), '[]'::jsonb),
    'arbeidsfagmiljo', (
      select intern.fagmiljoreferanse(f)
      from public.fagmiljoer f
      where f.id = intern.arbeidsfagmiljo((select auth.uid()))
    ),
    'mine_fagmiljoer', coalesce((
      select jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn)
      from public.fagmiljoer f
      where f.status = 'aktiv'
        and exists (
          select 1 from public.medlemskap m
          where m.bruker_id = (select auth.uid()) and m.fagmiljo_id = f.id and m.status = 'aktiv'
        )
    ), '[]'::jsonb),
    'stoffregister', intern.har_registerrett((select auth.uid())),
    'opprett_bruker', jsonb_array_length(opprett.i) > 0,
    'opprett_bruker_i', opprett.i
  )
  from opprett
$$;
