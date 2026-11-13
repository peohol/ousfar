-- Fagmiljøer, medlemskap, systemroller, lokale administratorer og en
-- uforanderlig tilgangslogg: P1.1 i docs/ousfar-nasjonal-p0-kartlegging.md §8.
--
-- Bare grunnmuren og vaktene. Ingen eksisterende regel, funksjon eller
-- Edge-funksjon bruker tabellene ennå: `er_admin()` og `profiles.role`
-- bestemmer fortsatt alt, så ingen merker noe. Modellen og reglene står i
-- docs/fagmiljoer.md.
--
-- Tilbakefyllingen av dagens kontoer kjøres for seg, i
-- 20261113140100_fagmiljoer_tilbakefylling.sql, fordi den bare gir mening i
-- produksjonen. Her opprettes bare de to fagmiljøene, som ikke er
-- personopplysninger og som nye kontoer trenger med en gang.

-- --- Hjelpere --------------------------------------------------------------

-- Begrunnelsen en migrasjon eller et serverkall oppgir for endringene sine
-- (`set_config('ousfar.tilgangsgrunn', …, true)`), slik den føres i loggen.
create function intern.tilgangsgrunn()
returns text
language sql
stable
set search_path = ''
as $$ select nullif(btrim(current_setting('ousfar.tilgangsgrunn', true)), '') $$;

revoke all on function intern.tilgangsgrunn() from public, anon, authenticated, service_role;

-- --- Fagmiljøene -----------------------------------------------------------

create table public.fagmiljoer (
  id uuid primary key default gen_random_uuid(),
  nokkel text not null,
  navn text not null,
  status text not null default 'aktiv',
  -- Fagmiljøet nye kontoer får som primærmedlemskap. Nøyaktig ett.
  standard boolean not null default false,
  -- Om andre enn systemarkitektene kan bli medlemmer. Står av for alle
  -- fagmiljøer utenom standarden til startporten S2 er passert
  -- (docs/ousfar-nasjonal-p0-kartlegging.md §6.3), og slås på i en egen,
  -- godkjent migrasjon.
  apent_for_medlemmer boolean not null default false,
  opprettet_kl timestamptz not null default now(),
  opprettet_av uuid references public.profiles (id) on delete set null,
  constraint fagmiljoer_nokkel_form check (char_length(nokkel) <= 60 and nokkel ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint fagmiljoer_navn_form check (navn = btrim(navn) and char_length(navn) between 2 and 120),
  constraint fagmiljoer_status check (status in ('aktiv', 'arkivert')),
  constraint fagmiljoer_standard_er_apent check (not standard or (apent_for_medlemmer and status = 'aktiv'))
);

comment on table public.fagmiljoer is
  'Fagmiljøene (laboratorier/avdelinger) brukerne tilhører. Arkiveres, slettes aldri. Se docs/fagmiljoer.md.';

create unique index fagmiljoer_nokkel_idx on public.fagmiljoer (nokkel);
create unique index fagmiljoer_navn_idx on public.fagmiljoer (lower(navn));
create unique index fagmiljoer_ett_standard_idx on public.fagmiljoer (standard) where standard;

-- --- Medlemskap ------------------------------------------------------------

create table public.medlemskap (
  id uuid primary key default gen_random_uuid(),
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  status text not null default 'aktiv',
  primaer boolean not null default false,
  fra timestamptz not null default now(),
  til timestamptz,
  tildelt_av uuid references public.profiles (id) on delete set null,
  constraint medlemskap_status check (status in ('aktiv', 'invitert', 'deaktivert')),
  constraint medlemskap_til_ved_deaktivering check ((status = 'deaktivert') = (til is not null)),
  constraint medlemskap_periode check (til is null or til >= fra),
  constraint medlemskap_primaer_ikke_invitert check (not (primaer and status = 'invitert'))
);

comment on table public.medlemskap is
  'Hvem som tilhører hvilket fagmiljø. Avsluttes med status, slettes bare sammen med kontoen. Én aktiv primærtilknytning per bruker.';

create unique index medlemskap_ett_aktivt_primaer_idx
  on public.medlemskap (bruker_id) where primaer and status = 'aktiv';
create unique index medlemskap_ett_gjeldende_per_fagmiljo_idx
  on public.medlemskap (bruker_id, fagmiljo_id) where status <> 'deaktivert';
create index medlemskap_bruker_idx on public.medlemskap (bruker_id);
create index medlemskap_aktive_i_fagmiljo_idx on public.medlemskap (fagmiljo_id) where status = 'aktiv';

-- --- Systemroller ----------------------------------------------------------

create table public.systemroller (
  id uuid primary key default gen_random_uuid(),
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  rolle text not null,
  tildelt_kl timestamptz not null default now(),
  tildelt_av uuid references public.profiles (id) on delete set null,
  tilbakekalt_kl timestamptz,
  tilbakekalt_av uuid references public.profiles (id) on delete set null,
  constraint systemroller_rolle check (rolle in ('systemarkitekt')),
  constraint systemroller_periode check (tilbakekalt_kl is null or tilbakekalt_kl >= tildelt_kl)
);

comment on table public.systemroller is
  'Systemroller knyttet til konto-ID-en, aldri til brukernavnet. Tilbakekalles med tidspunkt, slettes bare sammen med kontoen.';

create unique index systemroller_en_aktiv_idx
  on public.systemroller (bruker_id, rolle) where tilbakekalt_kl is null;
create index systemroller_bruker_idx on public.systemroller (bruker_id);

-- Om brukeren har en aktiv systemrolle som systemarkitekt.
create function intern.er_systemarkitekt(bruker uuid)
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
  )
$$;

-- --- Lokale administratorer ------------------------------------------------

create table public.fagmiljoadministratorer (
  id uuid primary key default gen_random_uuid(),
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  fra timestamptz not null default now(),
  -- Satt når tildelingen er avsluttet. Aktiv så lenge den står tom.
  til timestamptz,
  tildelt_av uuid references public.profiles (id) on delete set null,
  constraint fagmiljoadministratorer_periode check (til is null or til >= fra)
);

comment on table public.fagmiljoadministratorer is
  'Lokale administratorer. Krever aktivt medlemskap i samme fagmiljø; et aktivt fagmiljø har alltid minst én.';

create unique index fagmiljoadministratorer_en_aktiv_idx
  on public.fagmiljoadministratorer (bruker_id, fagmiljo_id) where til is null;
create index fagmiljoadministratorer_bruker_idx on public.fagmiljoadministratorer (bruker_id);
create index fagmiljoadministratorer_aktive_i_fagmiljo_idx
  on public.fagmiljoadministratorer (fagmiljo_id) where til is null;

-- --- Tilgangsloggen --------------------------------------------------------

-- Ingen fremmednøkler: loggen skal overleve både kontoen og raden den
-- beskriver.
create table public.tilgangslogg (
  id bigint generated always as identity primary key,
  kl timestamptz not null default now(),
  -- Den innloggede som gjorde endringen; tom for migrasjoner og server.
  aktor uuid,
  handling text not null,
  bruker_id uuid,
  fagmiljo_id uuid,
  grunn text,
  foer jsonb,
  etter jsonb,
  constraint tilgangslogg_handling check (handling ~ '^[a-z_]+\.(insert|update|delete)$')
);

comment on table public.tilgangslogg is
  'Alle endringer i fagmiljøer, medlemskap, systemroller og lokale administratorer. Kan ikke endres eller slettes.';

create index tilgangslogg_bruker_idx on public.tilgangslogg (bruker_id, kl);
create index tilgangslogg_fagmiljo_idx on public.tilgangslogg (fagmiljo_id, kl);

create function intern.avvis_tilgangsloggendring()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Tilgangsloggen kan ikke endres eller slettes.'
    using errcode = '42501';
end;
$$;

revoke all on function intern.avvis_tilgangsloggendring() from public, anon, authenticated, service_role;

create trigger tilgangslogg_uforanderlig
before update or delete on public.tilgangslogg
for each row execute function intern.avvis_tilgangsloggendring();

create trigger tilgangslogg_ikke_tom
before truncate on public.tilgangslogg
for each statement execute function intern.avvis_tilgangsloggendring();

-- Hver endring i de fire tabellene føres i loggen, uansett hvem som gjør den.
create function intern.loggfor_tilgang()
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
    (select auth.uid()),
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

revoke all on function intern.loggfor_tilgang() from public, anon, authenticated, service_role;

create trigger fagmiljoer_logg
after insert or update or delete on public.fagmiljoer
for each row execute function intern.loggfor_tilgang();

create trigger medlemskap_logg
after insert or update or delete on public.medlemskap
for each row execute function intern.loggfor_tilgang();

create trigger systemroller_logg
after insert or update or delete on public.systemroller
for each row execute function intern.loggfor_tilgang();

create trigger fagmiljoadministratorer_logg
after insert or update or delete on public.fagmiljoadministratorer
for each row execute function intern.loggfor_tilgang();

-- --- Det som ikke kan endres ------------------------------------------------

-- Feltene som identifiserer en rad, står fast; argumentene er kolonnene.
create function intern.tilgang_faste_felter()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  felt text;
begin
  foreach felt in array tg_argv loop
    if to_jsonb(new) -> felt is distinct from to_jsonb(old) -> felt then
      raise exception 'Feltet % kan ikke endres. Avslutt raden og lag en ny.', felt
        using errcode = '42501';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function intern.tilgang_faste_felter() from public, anon, authenticated, service_role;

create trigger fagmiljoer_faste_felter
before update on public.fagmiljoer
for each row execute function intern.tilgang_faste_felter('id', 'nokkel', 'opprettet_kl');

create trigger medlemskap_faste_felter
before update on public.medlemskap
for each row execute function intern.tilgang_faste_felter('id', 'bruker_id', 'fagmiljo_id', 'fra');

create trigger systemroller_faste_felter
before update on public.systemroller
for each row execute function intern.tilgang_faste_felter('id', 'bruker_id', 'rolle', 'tildelt_kl');

create trigger fagmiljoadministratorer_faste_felter
before update on public.fagmiljoadministratorer
for each row execute function intern.tilgang_faste_felter('id', 'bruker_id', 'fagmiljo_id', 'fra');

-- Rader avsluttes med status eller tidspunkt. De forsvinner bare når kontoen
-- selv slettes (kaskaden fra `profiles`), slik at sletting av en bruker virker
-- som før. Et fagmiljø slettes aldri, bare arkiveres.
create function intern.avvis_tilgangssletting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_level = 'STATEMENT' or tg_table_name = 'fagmiljoer'
    or exists (select 1 from public.profiles p where p.id = (to_jsonb(old) ->> 'bruker_id')::uuid)
  then
    raise exception 'Fagmiljøer, medlemskap og roller slettes ikke; de avsluttes, og står i tilgangsloggen.'
      using errcode = '42501';
  end if;
  return old;
end;
$$;

revoke all on function intern.avvis_tilgangssletting() from public, anon, authenticated, service_role;

create trigger fagmiljoer_ikke_slett
before delete on public.fagmiljoer
for each row execute function intern.avvis_tilgangssletting();

create trigger medlemskap_ikke_slett
before delete on public.medlemskap
for each row execute function intern.avvis_tilgangssletting();

create trigger systemroller_ikke_slett
before delete on public.systemroller
for each row execute function intern.avvis_tilgangssletting();

create trigger fagmiljoadministratorer_ikke_slett
before delete on public.fagmiljoadministratorer
for each row execute function intern.avvis_tilgangssletting();

create trigger fagmiljoer_ikke_tom
before truncate on public.fagmiljoer
for each statement execute function intern.avvis_tilgangssletting();

create trigger medlemskap_ikke_tom
before truncate on public.medlemskap
for each statement execute function intern.avvis_tilgangssletting();

create trigger systemroller_ikke_tom
before truncate on public.systemroller
for each statement execute function intern.avvis_tilgangssletting();

create trigger fagmiljoadministratorer_ikke_tom
before truncate on public.fagmiljoadministratorer
for each statement execute function intern.avvis_tilgangssletting();

-- --- Opptak: startporten S2 -------------------------------------------------

-- Et gjeldende medlemskap krever et aktivt fagmiljø som er åpent for
-- medlemmer. Før S2 er bare standarden åpen; systemarkitektene slipper
-- gjennom overalt.
create function intern.kontroller_opptak()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.fagmiljoer;
begin
  if new.status = 'deaktivert' or (tg_op = 'UPDATE' and old.status <> 'deaktivert') then
    return new;
  end if;
  select * into f from public.fagmiljoer x where x.id = new.fagmiljo_id;
  if f.status <> 'aktiv' then
    raise exception 'Fagmiljøet er arkivert og tar ikke imot medlemmer.'
      using errcode = '42501';
  end if;
  if not f.apent_for_medlemmer and not intern.er_systemarkitekt(new.bruker_id) then
    raise exception 'Fagmiljøet «%» tar ikke imot medlemmer ennå (startport S2).', f.navn
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function intern.kontroller_opptak() from public, anon, authenticated, service_role;

create trigger medlemskap_opptak
before insert or update on public.medlemskap
for each row execute function intern.kontroller_opptak();

-- --- Nye kontoer -------------------------------------------------------------

-- En ny konto får aktivt primærmedlemskap i standardfagmiljøet med en gang,
-- i samme transaksjon som profilen. Kontoopprettelsen ellers er uendret.
create function intern.gi_standardmedlemskap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.medlemskap (bruker_id, fagmiljo_id, primaer)
  select new.id, f.id, true from public.fagmiljoer f where f.standard;
  if not found then
    raise exception 'Det finnes ikke noe standardfagmiljø for nye kontoer.'
      using errcode = '55000';
  end if;
  return null;
end;
$$;

revoke all on function intern.gi_standardmedlemskap() from public, anon, authenticated, service_role;

create trigger profiles_standardmedlemskap
after insert on public.profiles
for each row execute function intern.gi_standardmedlemskap();

-- --- De to første fagmiljøene (D1 i P0-rapporten) ---------------------------

select set_config('ousfar.tilgangsgrunn', 'P1.1: de to første fagmiljøene (D1)', true);

insert into public.fagmiljoer (nokkel, navn, standard, apent_for_medlemmer) values
  ('ous-klinisk-farmakologi', 'OUS Klinisk farmakologi', true, true),
  ('ous-rettstoksikologi', 'OUS Rettstoksikologi', false, false);

select set_config('ousfar.tilgangsgrunn', '', true);

-- --- Samtidige endringer ---------------------------------------------------

-- Invariantene under kontrolleres ved slutten av transaksjonen. Uten mer ville
-- to samtidige transaksjoner som hver avslutter én av de to siste
-- administratorene i et fagmiljø (eller én av de to siste systemarkitektene),
-- begge se den andres rad som aktiv og begge slippe gjennom.
--
-- Derfor tar hver setning som endrer de fire tabellene, én felles
-- transaksjonslås før den rører noen rad. Den holdes til transaksjonen er
-- ferdig, så endringene skjer én transaksjon om gangen, og den neste ser
-- resultatet av den forrige: i `read committed` får kontrollen et nytt
-- øyeblikksbilde, og i `repeatable read` stopper `for share` i kontrollen den
-- med en serialiseringsfeil i stedet for å slippe den gjennom på et gammelt
-- bilde. Låsen tas før radene, så to transaksjoner aldri venter på hverandre i
-- kryss. Endringene er sjeldne (kontoer, roller), så én lås for alt koster
-- ingenting merkbart.
create function intern.serialiser_tilgang()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock(hashtextextended('ousfar.tilgang', 0));
  return null;
end;
$$;

revoke all on function intern.serialiser_tilgang() from public, anon, authenticated, service_role;

create trigger fagmiljoer_serialiser
before insert or update or delete on public.fagmiljoer
for each statement execute function intern.serialiser_tilgang();

create trigger medlemskap_serialiser
before insert or update or delete on public.medlemskap
for each statement execute function intern.serialiser_tilgang();

create trigger systemroller_serialiser
before insert or update or delete on public.systemroller
for each statement execute function intern.serialiser_tilgang();

create trigger fagmiljoadministratorer_serialiser
before insert or update or delete on public.fagmiljoadministratorer
for each statement execute function intern.serialiser_tilgang();

-- --- Invariantene, kontrollert når transaksjonen avsluttes ------------------

-- 1. Hver konto har nøyaktig ett aktivt primærmedlemskap.
-- 2. En aktiv lokal administrator har aktivt medlemskap i samme fagmiljø.
-- 3. Et aktivt fagmiljø mister aldri sin siste aktive administrator, og et
--    fagmiljø som opprettes eller gjenåpnes, må ha en.
-- 4. Den siste aktive systemarkitekten kan ikke tilbakekalles.
-- 5. Nøyaktig ett fagmiljø er standard for nye kontoer (og dermed aktivt og
--    åpent, etter `fagmiljoer_standard_er_apent`), så standarden kan byttes,
--    men aldri mangle.
-- Samtidige endringer serialiseres av `intern.serialiser_tilgang()` (under),
-- og radene kontrollen regner med, låses `for share`, slik at to transaksjoner
-- aldri kan fjerne hver sin av de to siste.
-- Utsatt, så en endring kan gjøres i flere steg i én transaksjon. Kontrollen
-- ser på tilstanden ved slutten, ikke på raden slik den var.
create function intern.kontroller_tilgangsinvarianter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad jsonb := case tg_op when 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  bruker uuid := (rad ->> 'bruker_id')::uuid;
  fagmiljo uuid := (case tg_table_name when 'fagmiljoer' then rad ->> 'id' else rad ->> 'fagmiljo_id' end)::uuid;
  konto_finnes boolean := bruker is not null and exists (select 1 from public.profiles p where p.id = bruker);
begin
  if tg_table_name in ('medlemskap', 'fagmiljoadministratorer') and konto_finnes then
    if (select count(*) from (
          select 1 from public.medlemskap m
          where m.bruker_id = bruker and m.primaer and m.status = 'aktiv'
          for share
        ) x) <> 1 then
      raise exception 'En konto må ha nøyaktig ett aktivt primærmedlemskap.'
        using errcode = '23514';
    end if;
    if exists (
      select 1 from public.fagmiljoadministratorer a
      where a.bruker_id = bruker and a.til is null
        and not exists (
          select 1 from public.medlemskap m
          where m.bruker_id = a.bruker_id and m.fagmiljo_id = a.fagmiljo_id and m.status = 'aktiv'
        )
    ) then
      raise exception 'En lokal administrator må ha aktivt medlemskap i fagmiljøet.'
        using errcode = '23514';
    end if;
  end if;

  if (tg_table_name = 'fagmiljoadministratorer'
      or (tg_table_name = 'fagmiljoer'
          and (tg_op = 'INSERT' or (to_jsonb(old) ->> 'status') is distinct from (rad ->> 'status'))))
    and exists (select 1 from public.fagmiljoer f where f.id = fagmiljo and f.status = 'aktiv')
    and (select count(*) from (
          select 1 from public.fagmiljoadministratorer a
          where a.fagmiljo_id = fagmiljo and a.til is null
          for share
        ) x) = 0
  then
    raise exception 'Et aktivt fagmiljø må ha minst én aktiv administrator.'
      using errcode = '23514';
  end if;

  if tg_table_name = 'fagmiljoer' and (select count(*) from public.fagmiljoer f where f.standard) <> 1 then
    raise exception 'Nøyaktig ett fagmiljø må være standard for nye kontoer.'
      using errcode = '23514';
  end if;

  if tg_table_name = 'systemroller'
    and (select count(*) from (
          select 1 from public.systemroller s
          where s.rolle = 'systemarkitekt' and s.tilbakekalt_kl is null
          for share
        ) x) = 0
  then
    raise exception 'Den siste systemarkitekten kan ikke fjernes.'
      using errcode = '23514';
  end if;

  return null;
end;
$$;

revoke all on function intern.kontroller_tilgangsinvarianter() from public, anon, authenticated, service_role;

create constraint trigger medlemskap_invarianter
after insert or update or delete on public.medlemskap
deferrable initially deferred
for each row execute function intern.kontroller_tilgangsinvarianter();

create constraint trigger fagmiljoadministratorer_invarianter
after insert or update or delete on public.fagmiljoadministratorer
deferrable initially deferred
for each row execute function intern.kontroller_tilgangsinvarianter();

-- Bare når en rolle avsluttes eller forsvinner; en ny tildeling kan ikke
-- bryte regelen.
create constraint trigger systemroller_invarianter
after update or delete on public.systemroller
deferrable initially deferred
for each row execute function intern.kontroller_tilgangsinvarianter();

-- Etter at de to første fagmiljøene er lagt inn: de får administratorene sine
-- i tilbakefyllingen. Et nytt fagmiljø må opprettes sammen med sin første
-- administrator, og standarden må stå.
create constraint trigger fagmiljoer_invarianter
after insert or update of status, standard on public.fagmiljoer
deferrable initially deferred
for each row execute function intern.kontroller_tilgangsinvarianter();

-- --- Radsikkerhet og rettigheter ---------------------------------------------

-- Nettleseren kan bare lese egne medlemskap og navnet på fagmiljøene den er
-- aktivt medlem av. Alt annet skjer server-side, og ingen regel ellers i
-- appen ser på tabellene ennå (P2).
alter table public.fagmiljoer enable row level security;
alter table public.medlemskap enable row level security;
alter table public.systemroller enable row level security;
alter table public.fagmiljoadministratorer enable row level security;
alter table public.tilgangslogg enable row level security;

revoke all on public.fagmiljoer from anon, authenticated;
revoke all on public.medlemskap from anon, authenticated;
revoke all on public.systemroller from anon, authenticated;
revoke all on public.fagmiljoadministratorer from anon, authenticated;
revoke all on public.tilgangslogg from anon, authenticated;
revoke all on sequence public.tilgangslogg_id_seq from anon, authenticated;

grant select on public.fagmiljoer to authenticated;
grant select on public.medlemskap to authenticated;

create policy "Brukeren leser sine egne medlemskap"
on public.medlemskap for select to authenticated
using (bruker_id = (select auth.uid()));

create policy "Brukeren leser fagmiljøene den er aktivt medlem av"
on public.fagmiljoer for select to authenticated
using (
  exists (
    select 1 from public.medlemskap m
    where m.fagmiljo_id = fagmiljoer.id and m.bruker_id = (select auth.uid()) and m.status = 'aktiv'
  )
);

revoke all on function intern.er_systemarkitekt(uuid) from public, anon, authenticated, service_role;
