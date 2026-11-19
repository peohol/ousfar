-- Stillinger: hver bruker kan oppgi stillingen sin fra en fast liste
-- (Peder 19.11.2026). Se docs/stillinger.md.
--
--   1. Lista er data, ikke kode: kategorier (`stillingskategorier`) med
--      stillinger i (`stillinger`), i en rekkefølge systemarkitektene
--      bestemmer. Den fylles her med lista Peder ga.
--   2. `profiles.stilling_id` er stillingen, eller ingenting. Den hører til
--      profilkortet: den som ser profilen til en annen, ser også stillingen
--      (samme kolonnerettigheter og radsikkerhet som navnet og bildet).
--   3. Stillingen settes med `sett_stilling`: av brukeren selv, av en
--      systemarkitekt for alle, og av en lokal administrator for medlemmene i
--      fagmiljøene hen administrerer (ikke for systemarkitektene).
--   4. Bare systemarkitektene endrer lista. En stilling noen har, fjernes
--      først når de har fått en annen: alle på én gang (`fjern_stilling` med
--      erstatning) eller én og én (`sett_stilling`). Fremmednøkkelen gjør at
--      en stilling i bruk aldri kan forsvinne under noen.
--
-- Ingen eksisterende data endres; alle står uten stilling til de velger en.
-- Tilbakeføring: en ny migrasjon som legger `medlemsoversikt` tilbake slik
-- den var (20261114221500), tar `stilling_id` ut av kolonnerettighetene og
-- fjerner kolonnen, tabellene og funksjonene her.

-- --- Lista -------------------------------------------------------------------

-- Et navn i lista: trimmet, uten doble mellomrom, 1–60 tegn. Samme regel for
-- kategoriene og stillingene, og den samme som for fornavn og etternavn i
-- appen (`normaliserNavn` og `navnFeil` i `@delt/profil`; en test holder dem
-- like).
create function intern.er_stillingsnavn(navn text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select er_stillingsnavn.navn is not null
    and er_stillingsnavn.navn = btrim(regexp_replace(er_stillingsnavn.navn, '\s+', ' ', 'g'))
    and char_length(er_stillingsnavn.navn) between 1 and 60
$$;

revoke all on function intern.er_stillingsnavn(text) from public, anon, authenticated, service_role;

create table public.stillingskategorier (
  id uuid primary key default gen_random_uuid(),
  navn text not null check (intern.er_stillingsnavn(navn)),
  rekkefolge integer not null default 0
);

create unique index stillingskategorier_navn_idx on public.stillingskategorier (lower(navn));

comment on table public.stillingskategorier is
  'Gruppene stillingene står i, i rekkefølgen systemarkitektene har satt. Se docs/stillinger.md.';

create table public.stillinger (
  id uuid primary key default gen_random_uuid(),
  -- En kategori med stillinger i kan ikke slettes (`fjern_stillingskategori`).
  kategori_id uuid not null references public.stillingskategorier (id) on delete restrict,
  navn text not null check (intern.er_stillingsnavn(navn)),
  rekkefolge integer not null default 0
);

-- Navnet er unikt i hele lista, så en stilling aldri kan forveksles med en annen.
create unique index stillinger_navn_idx on public.stillinger (lower(navn));
create index stillinger_kategori_idx on public.stillinger (kategori_id, rekkefolge);

comment on table public.stillinger is
  'Stillingene brukerne kan velge, i kategorier. Se docs/stillinger.md.';

-- Lista er ikke personopplysninger og leses av alle innloggede. Den endres
-- bare gjennom funksjonene under.
alter table public.stillingskategorier enable row level security;
alter table public.stillinger enable row level security;

revoke all on public.stillingskategorier, public.stillinger from anon, authenticated;
grant select on public.stillingskategorier, public.stillinger to authenticated;

create policy "Innloggede leser stillingskategoriene" on public.stillingskategorier
for select to authenticated using (true);

create policy "Innloggede leser stillingene" on public.stillinger
for select to authenticated using (true);

-- Som på de andre tabellene nettleseren når (P2.0, 20261114103000).
create policy aktivt_medlemskap on public.stillingskategorier as restrictive for all to authenticated
using ((select public.har_aktivt_medlemskap()))
with check ((select public.har_aktivt_medlemskap()));

create policy aktivt_medlemskap on public.stillinger as restrictive for all to authenticated
using ((select public.har_aktivt_medlemskap()))
with check ((select public.har_aktivt_medlemskap()));

-- Lista Peder ga 19.11.2026. Herfra er det systemarkitektene som endrer den.
with kategorier (navn, rekkefolge, stillinger) as (
  values
    ('Leger', 0, array['LIS', 'Overlege']),
    ('Laboratorieansatte', 1, array['Bioingeniør', 'Kjemiker', 'Overingeniør']),
    ('Annet', 2, array['Fortolkningsrådgiver', 'Administrasjonskonsulent'])
),
nye as (
  insert into public.stillingskategorier (navn, rekkefolge)
  select k.navn, k.rekkefolge from kategorier k
  returning id, navn
)
insert into public.stillinger (kategori_id, navn, rekkefolge)
select n.id, s.navn, s.nr - 1
from nye n
join kategorier k on k.navn = n.navn
cross join lateral unnest(k.stillinger) with ordinality as s (navn, nr);

-- --- Brukerens stilling ---------------------------------------------------------

-- Fremmednøkkelen uten kaskade: en stilling noen har, kan ikke slettes før de
-- har fått en annen (`fjern_stilling`).
alter table public.profiles
  add column stilling_id uuid references public.stillinger (id) on delete restrict;

create index profiles_stilling_idx on public.profiles (stilling_id) where stilling_id is not null;

comment on column public.profiles.stilling_id is
  'Stillingen brukeren har oppgitt, eller ingenting. Del av profilkortet. Settes med sett_stilling.';

-- Profilkortet får stillingen med. Samme liste som `PROFILKORT` i
-- supabase/functions/_delt/profil.ts; en test holder dem like. Skriveretten
-- står uendret: stillingen settes bare med `sett_stilling`.
grant select (stilling_id) on public.profiles to authenticated;

-- --- Hvem som kan endre stillingen til hvem ---------------------------------

-- Avgjør om `aktor` kan sette stillingen til `mal`. Gir `null` når det er
-- lov, ellers avslaget som `{sqlstate, melding}`, som `intern.kontoavslag`.
-- Den ene avgjørelsen: `sett_stilling` stopper med den, og medlemslista viser
-- valget etter den.
create function intern.stillingsavslag(aktor uuid, mal uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when aktor is null or not exists (select 1 from public.profiles p where p.id = aktor) then
      array['42501', 'Kontoen din finnes ikke lenger.']
    when mal is null or not exists (select 1 from public.profiles p where p.id = mal) then
      array['P0002', 'Ukjent bruker.']
    when aktor = mal or intern.er_systemarkitekt(aktor) then null
    when intern.er_systemarkitekt(mal) then
      array['42501', 'Stillingen til en systemarkitekt kan bare endres av en systemarkitekt.']
    when exists (
      select 1 from public.medlemskap m
      where m.bruker_id = mal and m.status <> 'deaktivert'
        and m.fagmiljo_id in (select intern.administrerte_fagmiljoer(aktor))
    ) then null
    else array['42501', 'Du kan bare endre stillingen til medlemmer i fagmiljøer du administrerer.']
  end
$$;

revoke all on function intern.stillingsavslag(uuid, uuid) from public, anon, authenticated, service_role;

-- Setter stillingen til `bruker`, eller fjerner den (`stilling` er `null`).
-- Gir stillingen tilbake. Stillingen holdes fast til endringen er lagret, så
-- den ikke kan fjernes fra lista samtidig (`fjern_stilling`).
create function public.sett_stilling(bruker uuid, stilling uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  avslag text[];
begin
  perform intern.krev_aktivt_medlemskap();
  avslag := intern.stillingsavslag((select auth.uid()), sett_stilling.bruker);
  if avslag is not null then
    raise exception '%', avslag[2] using errcode = avslag[1];
  end if;
  if sett_stilling.stilling is not null then
    perform 1 from public.stillinger s where s.id = sett_stilling.stilling for key share;
    if not found then
      raise exception 'Stillingen finnes ikke lenger. Velg en annen.' using errcode = 'P0002';
    end if;
  end if;
  update public.profiles p set stilling_id = sett_stilling.stilling
  where p.id = sett_stilling.bruker and p.stilling_id is distinct from sett_stilling.stilling;
  return sett_stilling.stilling;
end;
$$;

revoke all on function public.sett_stilling(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.sett_stilling(uuid, uuid) to authenticated;

comment on function public.sett_stilling(uuid, uuid) is
  'Setter eller fjerner stillingen til en bruker: egen, eller andres for systemarkitekter og lokale administratorer (intern.stillingsavslag). Se docs/stillinger.md.';

-- --- Systemarkitektenes endringer av lista -----------------------------------

-- Alle endringene av lista går etter hverandre, så to systemarkitekter aldri
-- ordner eller fjerner på grunnlag av det den andre er i ferd med å endre.
create function intern.las_stillingslisten()
returns void
language sql
security definer
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('ousfar.stillinger', 0))
$$;

revoke all on function intern.las_stillingslisten() from public, anon, authenticated, service_role;

-- Navnet slik det lagres, eller et avslag med en melding som kan vises.
create function intern.stillingsnavn(navn text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  rent text := btrim(regexp_replace(coalesce(stillingsnavn.navn, ''), '\s+', ' ', 'g'));
begin
  if rent = '' then
    raise exception 'Navnet må fylles ut.' using errcode = '22023';
  end if;
  if char_length(rent) > 60 then
    raise exception 'Navnet kan ha høyst 60 tegn.' using errcode = '22023';
  end if;
  perform intern.krev_uten_personnummer(rent);
  return rent;
end;
$$;

revoke all on function intern.stillingsnavn(text) from public, anon, authenticated, service_role;

-- `ider` med `ny` satt inn på plass `indeks` (fra 0, holdt innenfor lista).
create function intern.sett_inn_i_rekke(ider uuid[], ny uuid, indeks integer)
returns uuid[]
language sql
immutable
set search_path = ''
as $$
  select r[1:plass] || array[ny] || r[plass + 1:]
  from (select coalesce(ider, '{}') as r) x
  cross join lateral (select least(greatest(coalesce(indeks, 0), 0), cardinality(x.r)) as plass) p
$$;

revoke all on function intern.sett_inn_i_rekke(uuid[], uuid, integer) from public, anon, authenticated, service_role;

-- Oppretter en kategori (`kategori` er `null`), eller gir en nytt navn. Gir ID-en.
create function public.lagre_stillingskategori(kategori uuid, navn text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  rent text;
  ny_id uuid;
begin
  perform intern.krev_systemarkitekt();
  perform intern.las_stillingslisten();
  rent := intern.stillingsnavn(lagre_stillingskategori.navn);
  if exists (
    select 1 from public.stillingskategorier k
    where lower(k.navn) = lower(rent) and k.id is distinct from lagre_stillingskategori.kategori
  ) then
    raise exception 'Det finnes alt en kategori som heter «%».', rent using errcode = '23505';
  end if;
  if lagre_stillingskategori.kategori is null then
    insert into public.stillingskategorier (navn, rekkefolge)
    select rent, coalesce(max(k.rekkefolge) + 1, 0) from public.stillingskategorier k
    returning stillingskategorier.id into ny_id;
  else
    update public.stillingskategorier k set navn = rent
    where k.id = lagre_stillingskategori.kategori
    returning k.id into ny_id;
    if ny_id is null then
      raise exception 'Kategorien finnes ikke lenger.' using errcode = 'P0002';
    end if;
  end if;
  return ny_id;
end;
$$;

-- Flytter kategorien til plass `indeks` (fra 0).
create function public.flytt_stillingskategori(kategori uuid, indeks integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ider uuid[];
begin
  perform intern.krev_systemarkitekt();
  perform intern.las_stillingslisten();
  if not exists (select 1 from public.stillingskategorier k where k.id = flytt_stillingskategori.kategori) then
    raise exception 'Kategorien finnes ikke lenger.' using errcode = 'P0002';
  end if;
  select array_agg(k.id order by k.rekkefolge, k.navn) into ider
  from public.stillingskategorier k where k.id <> flytt_stillingskategori.kategori;
  ider := intern.sett_inn_i_rekke(ider, flytt_stillingskategori.kategori, flytt_stillingskategori.indeks);
  update public.stillingskategorier k set rekkefolge = array_position(ider, k.id) - 1
  where k.rekkefolge is distinct from array_position(ider, k.id) - 1;
end;
$$;

-- Fjerner en tom kategori. Stillingene i den må flyttes eller fjernes først.
create function public.fjern_stillingskategori(kategori uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_systemarkitekt();
  perform intern.las_stillingslisten();
  if exists (select 1 from public.stillinger s where s.kategori_id = fjern_stillingskategori.kategori) then
    raise exception 'Kategorien har stillinger. Flytt eller fjern dem først.' using errcode = '55000';
  end if;
  delete from public.stillingskategorier k where k.id = fjern_stillingskategori.kategori;
  if not found then
    raise exception 'Kategorien finnes ikke lenger.' using errcode = 'P0002';
  end if;
end;
$$;

-- Oppretter en stilling (`stilling` er `null`), eller gir en nytt navn eller
-- en annen kategori. En stilling som får ny kategori, står sist i den. Gir ID-en.
create function public.lagre_stilling(stilling uuid, kategori uuid, navn text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  rent text;
  ny_id uuid;
begin
  perform intern.krev_systemarkitekt();
  perform intern.las_stillingslisten();
  rent := intern.stillingsnavn(lagre_stilling.navn);
  if not exists (select 1 from public.stillingskategorier k where k.id = lagre_stilling.kategori) then
    raise exception 'Kategorien finnes ikke lenger.' using errcode = 'P0002';
  end if;
  if exists (
    select 1 from public.stillinger s
    where lower(s.navn) = lower(rent) and s.id is distinct from lagre_stilling.stilling
  ) then
    raise exception 'Det finnes alt en stilling som heter «%».', rent using errcode = '23505';
  end if;
  if lagre_stilling.stilling is null then
    insert into public.stillinger (kategori_id, navn, rekkefolge)
    select lagre_stilling.kategori, rent, coalesce(max(s.rekkefolge) + 1, 0)
    from public.stillinger s where s.kategori_id = lagre_stilling.kategori
    returning stillinger.id into ny_id;
  else
    update public.stillinger s
    set navn = rent,
      kategori_id = lagre_stilling.kategori,
      rekkefolge = case
        when s.kategori_id = lagre_stilling.kategori then s.rekkefolge
        else (select coalesce(max(o.rekkefolge) + 1, 0) from public.stillinger o where o.kategori_id = lagre_stilling.kategori)
      end
    where s.id = lagre_stilling.stilling
    returning s.id into ny_id;
    if ny_id is null then
      raise exception 'Stillingen finnes ikke lenger.' using errcode = 'P0002';
    end if;
  end if;
  return ny_id;
end;
$$;

-- Flytter stillingen til plass `indeks` (fra 0) i kategorien den står i.
create function public.flytt_stilling(stilling uuid, indeks integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kategori uuid;
  ider uuid[];
begin
  perform intern.krev_systemarkitekt();
  perform intern.las_stillingslisten();
  select s.kategori_id into kategori from public.stillinger s where s.id = flytt_stilling.stilling;
  if kategori is null then
    raise exception 'Stillingen finnes ikke lenger.' using errcode = 'P0002';
  end if;
  select array_agg(s.id order by s.rekkefolge, s.navn) into ider
  from public.stillinger s where s.kategori_id = kategori and s.id <> flytt_stilling.stilling;
  ider := intern.sett_inn_i_rekke(ider, flytt_stilling.stilling, flytt_stilling.indeks);
  update public.stillinger s set rekkefolge = array_position(ider, s.id) - 1
  where s.kategori_id = kategori and s.rekkefolge is distinct from array_position(ider, s.id) - 1;
end;
$$;

-- Fjerner en stilling fra lista. Har noen den, må `erstatning` være en annen
-- stilling: de får den, alle på én gang, før stillingen fjernes. Gir hvor
-- mange som fikk erstatningen.
create function public.fjern_stilling(stilling uuid, erstatning uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  antall integer;
begin
  perform intern.krev_systemarkitekt();
  perform intern.las_stillingslisten();
  -- Låsen holder ute en samtidig `sett_stilling` til denne (se der).
  perform 1 from public.stillinger s where s.id = fjern_stilling.stilling for update;
  if not found then
    raise exception 'Stillingen finnes ikke lenger.' using errcode = 'P0002';
  end if;
  select count(*) into antall from public.profiles p where p.stilling_id = fjern_stilling.stilling;
  if antall > 0 then
    if fjern_stilling.erstatning is null then
      raise exception '% har denne stillingen. Velg hvilken stilling de skal ha i stedet.',
        case antall when 1 then 'Én bruker' else antall || ' brukere' end
        using errcode = '55000';
    end if;
    if fjern_stilling.erstatning = fjern_stilling.stilling then
      raise exception 'Velg en annen stilling som erstatning.' using errcode = '22023';
    end if;
    perform 1 from public.stillinger s where s.id = fjern_stilling.erstatning for key share;
    if not found then
      raise exception 'Stillingen du valgte som erstatning, finnes ikke lenger.' using errcode = 'P0002';
    end if;
    update public.profiles p set stilling_id = fjern_stilling.erstatning
    where p.stilling_id = fjern_stilling.stilling;
  end if;
  delete from public.stillinger s where s.id = fjern_stilling.stilling;
  return antall;
end;
$$;

-- Hvor mange som har hver stilling som noen har. Bare for systemarkitektene.
create function public.stillingsbruk()
returns table (stilling_id uuid, antall integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_systemarkitekt();
  return query
  select p.stilling_id, count(*)::integer
  from public.profiles p
  where p.stilling_id is not null
  group by p.stilling_id;
end;
$$;

-- Brukerne som har stillingen, som profilkort med fagmiljøene de er aktive
-- medlemmer av: lista over dem som berøres når stillingen fjernes. Bare for
-- systemarkitektene, som ser alle profilene fra før.
create function public.brukere_med_stilling(stilling uuid)
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_path text,
  updated_at timestamptz,
  stilling_id uuid,
  fagmiljoer text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_systemarkitekt();
  return query
  select p.id, p.username, p.first_name, p.last_name, p.avatar_path, p.updated_at, p.stilling_id,
    coalesce((
      select array_agg(f.navn order by f.navn)
      from public.medlemskap m
      join public.fagmiljoer f on f.id = m.fagmiljo_id
      where m.bruker_id = p.id and m.status = 'aktiv'
    ), '{}')
  from public.profiles p
  where p.stilling_id = brukere_med_stilling.stilling
  order by p.first_name, p.last_name, p.username;
end;
$$;

revoke all on function public.lagre_stillingskategori(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.flytt_stillingskategori(uuid, integer) from public, anon, authenticated, service_role;
revoke all on function public.fjern_stillingskategori(uuid) from public, anon, authenticated, service_role;
revoke all on function public.lagre_stilling(uuid, uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.flytt_stilling(uuid, integer) from public, anon, authenticated, service_role;
revoke all on function public.fjern_stilling(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.stillingsbruk() from public, anon, authenticated, service_role;
revoke all on function public.brukere_med_stilling(uuid) from public, anon, authenticated, service_role;
grant execute on function public.lagre_stillingskategori(uuid, text) to authenticated;
grant execute on function public.flytt_stillingskategori(uuid, integer) to authenticated;
grant execute on function public.fjern_stillingskategori(uuid) to authenticated;
grant execute on function public.lagre_stilling(uuid, uuid, text) to authenticated;
grant execute on function public.flytt_stilling(uuid, integer) to authenticated;
grant execute on function public.fjern_stilling(uuid, uuid) to authenticated;
grant execute on function public.stillingsbruk() to authenticated;
grant execute on function public.brukere_med_stilling(uuid) to authenticated;

-- --- Medlemslista i administrasjonen -------------------------------------------

-- Som før (20261114221500), med stillingen på profilkortet og om den
-- innloggede kan endre den (`intern.stillingsavslag`). Returtypen endres, så
-- funksjonen lages på nytt; rettighetene settes igjen under.
drop function public.medlemsoversikt(uuid);

create function public.medlemsoversikt(fagmiljo uuid)
returns table (
  bruker_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_path text,
  updated_at timestamptz,
  stilling_id uuid,
  status text,
  fra timestamptz,
  til timestamptz,
  administrator boolean,
  systemarkitekt boolean,
  rolle public.brukerrolle,
  maa_bytte_passord boolean,
  sperret boolean,
  eneste_medlemskap boolean,
  kan_avslutte boolean,
  kan_gi_tilgang boolean,
  kan_gjore_til_administrator boolean,
  kan_fjerne_som_administrator boolean,
  nytt_passord boolean,
  endre_rolle boolean,
  endre_stilling boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  aktor uuid := (select auth.uid());
  f public.fagmiljoer;
begin
  perform intern.krev_aktivt_medlemskap();
  select * into f from public.fagmiljoer x where x.id = medlemsoversikt.fagmiljo;
  if not found or not intern.er_lokal_admin_i(f.id, aktor) then
    raise exception 'Du administrerer ikke dette fagmiljøet.' using errcode = '42501';
  end if;

  return query
  with siste as (
    select distinct on (m.bruker_id) m.*
    from public.medlemskap m
    where m.fagmiljo_id = f.id
    order by m.bruker_id, (m.status <> 'deaktivert') desc, m.fra desc, m.id desc
  )
  select
    p.id, p.username, p.first_name, p.last_name, p.avatar_path, p.updated_at, p.stilling_id,
    case s.status when 'deaktivert' then 'avsluttet' else s.status end,
    s.fra, s.til,
    exists (
      select 1 from public.fagmiljoadministratorer a
      where a.bruker_id = p.id and a.fagmiljo_id = f.id and a.til is null
    ),
    intern.er_systemarkitekt(p.id),
    p.role,
    p.must_change_password or not p.onboarding_completed,
    not intern.har_aktivt_medlemskap(p.id),
    s.status = 'aktiv' and not exists (
      select 1 from public.medlemskap o
      where o.bruker_id = p.id and o.status = 'aktiv' and o.fagmiljo_id <> f.id
    ),
    s.status <> 'deaktivert' and p.id <> aktor and intern.medlemskapsavslag(aktor, p.id, f.id, 'avslutt') is null,
    s.status <> 'aktiv' and p.id <> aktor and intern.medlemskapsavslag(aktor, p.id, f.id, 'gi') is null,
    s.status = 'aktiv' and p.id <> aktor
      and not exists (
        select 1 from public.fagmiljoadministratorer a
        where a.bruker_id = p.id and a.fagmiljo_id = f.id and a.til is null
      )
      and intern.medlemskapsavslag(aktor, p.id, f.id, 'gi_admin') is null,
    exists (
        select 1 from public.fagmiljoadministratorer a
        where a.bruker_id = p.id and a.fagmiljo_id = f.id and a.til is null
      )
      and p.id <> aktor and intern.medlemskapsavslag(aktor, p.id, f.id, 'fjern_admin') is null,
    intern.kontoavslag(aktor, p.id, 'passord') is null,
    intern.kontoavslag(aktor, p.id, 'rolle') is null,
    s.status <> 'deaktivert' and intern.stillingsavslag(aktor, p.id) is null
  from siste s
  join public.profiles p on p.id = s.bruker_id
  order by s.status = 'deaktivert', p.first_name, p.last_name, p.username;
end;
$$;

revoke all on function public.medlemsoversikt(uuid) from public, anon, authenticated, service_role;
grant execute on function public.medlemsoversikt(uuid) to authenticated;
