-- Diskusjonskategoriene per fagmiljø (#395 punkt 1, S2-kontrollrapporten §9).
--
-- Siden P4b har hvert fagmiljø sin egen fortolkning av en kode, og trådene og
-- kategoriene på `fortolkning:<kode>` hører til fagmiljøet som laget dem
-- (arbeidskonteksten). Navnet og emojien til en kategori var likevel unike
-- per side, på tvers av fagmiljøene: B kunne ikke lage en kategori med samme
-- navn eller emoji som A, og feilen røpet at A hadde den. Plassene
-- (`posisjon`) ble også regnet ut over alle fagmiljøene på siden, så B kunne
-- lese av plassen til sin første kategori hvor mange A hadde.
--
-- Et **rom** er det trådene og kategoriene på en side deles i: siden og
-- fagmiljøet (`side`, `fagmiljo_id`, med null for felles og for grupper, der
-- siden alt bestemmer gruppen). Migrasjonen gjør rommet til enheten overalt:
--
--   1. Navn og emoji er unike i rommet, ikke på siden (`nulls not distinct`,
--      så de felles sidene og gruppene er som før). Indeksene beholder
--      navnene, så appens meldinger er de samme.
--   2. Plassene til kategoriene og trådene regnes ut i rommet
--      (`intern.ordne_diskusjonskategorier`, `intern.ordne_diskusjoner` får
--      fagmiljøet, og en ny kategori legges sist i rommet).
--   3. En tråd kan bare stå i en kategori i sitt eget rom: funksjonene
--      kontrollerer det (`intern.kategori_i_rom`), og utløseren
--      `diskusjoner_rom` stopper alt annet. Svaret er det samme om kategorien
--      ikke finnes eller hører til et annet fagmiljø.
--   4. Oversikten og tekstene til en side viser rommet den innloggede
--      arbeider i (`public.diskusjonsrom`): på en fortolkningsside
--      arbeidskontekstens tråder og kategorier, som fortolkningen selv. Tråder
--      fra et annet fagmiljø den innloggede er medlem i, nås fortsatt gjennom
--      varsler og lenker.
--   5. Modereringen av en tråd følger trådens rom, ikke siden i
--      arbeidskonteksten (`intern.kan_moderere_rom`): en lokal administrator i
--      B som også er vanlig medlem i A, kan ikke moderere As tråder.
--
-- Ingen innhold endres. Tilbakeføring: en ny migrasjon som setter indeksene
-- tilbake til `(side, lower(navn))` og `(side, emoji)` (krever at ingen side
-- har like navn i to fagmiljøer), og funksjonene tilbake til definisjonene i
-- 20261114121000, 20261114202000 og 20261114232000.

-- --- Rommet ----------------------------------------------------------------------

-- Fagmiljøet i rommet den innloggede arbeider i på siden, eller null for en
-- felles side og en gruppes side. Den eneste definisjonen; alt annet kaller
-- denne eller `intern.diskusjonsomfang`.
create function intern.diskusjonsrom(side text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when split_part(diskusjonsrom.side, ':', 1) = 'gruppe' then null
    else intern.diskusjonsomfang(diskusjonsrom.side)
  end
$$;

revoke all on function intern.diskusjonsrom(text) from public, anon, authenticated, service_role;

comment on function intern.diskusjonsrom(text) is
  'Fagmiljøet i rommet på diskusjonssiden for den innloggede (null: felles eller gruppe). Se docs/diskusjoner.md.';

-- Den innloggedes rom på siden, til oppslagene som kjøres som den innloggede:
-- `(select public.diskusjonsrom(side))`. Null uten aktivt medlemskap og for en
-- side databasen ikke kjenner; radsikkerheten skjuler da det lokale uansett.
create function public.diskusjonsrom(side text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when intern.er_diskusjonsside(diskusjonsrom.side) and intern.har_aktivt_medlemskap((select auth.uid()))
      then intern.diskusjonsrom(diskusjonsrom.side)
  end
$$;

revoke all on function public.diskusjonsrom(text) from public, anon, authenticated, service_role;
grant execute on function public.diskusjonsrom(text) to authenticated;

comment on function public.diskusjonsrom(text) is
  'Fagmiljøet i rommet den innloggede ser på diskusjonssiden (null: felles eller gruppe). Se docs/diskusjoner.md.';

-- Står kategorien på siden, i rommet med fagmiljøet?
create function intern.kategori_i_rom(kategori uuid, side text, fagmiljo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.diskusjonskategorier k
    where k.id = kategori_i_rom.kategori
      and k.side = kategori_i_rom.side
      and k.fagmiljo_id is not distinct from kategori_i_rom.fagmiljo
  )
$$;

revoke all on function intern.kategori_i_rom(uuid, text, uuid) from public, anon, authenticated, service_role;

-- --- Kontrollen av dataene før endringen ---------------------------------------------

do $$
begin
  if exists (
    select 1 from public.diskusjoner d
    join public.diskusjonskategorier k on k.id = d.kategori_id
    where k.side <> d.side or k.fagmiljo_id is distinct from d.fagmiljo_id or k.gruppe_id is distinct from d.gruppe_id
  ) then
    raise exception 'En tråd står i en kategori fra et annet rom; rett dataene før migrasjonen.' using errcode = '23514';
  end if;
end;
$$;

-- --- 1. Unike i rommet -------------------------------------------------------------

drop index public.diskusjonskategorier_navn_idx;
drop index public.diskusjonskategorier_emoji_idx;

create unique index diskusjonskategorier_navn_idx
  on public.diskusjonskategorier (side, fagmiljo_id, lower(navn)) nulls not distinct;
create unique index diskusjonskategorier_emoji_idx
  on public.diskusjonskategorier (side, fagmiljo_id, emoji) nulls not distinct;

comment on table public.diskusjonskategorier is
  'Kategoriene trådene på hver side ordnes i. Navn og emoji er unike i rommet (siden og fagmiljøet). Skrives gjennom funksjonene.';

-- --- 3. Tråden i kategoriens rom -----------------------------------------------------

-- Etter `diskusjoner_omfang` (utløserne kjøres i navneorden), som har satt
-- rommet på tråden.
create function intern.diskusjon_i_kategoriens_rom()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kategori_id is not null and not intern.kategori_i_rom(new.kategori_id, new.side, new.fagmiljo_id) then
    raise exception 'Velg en kategori på siden for tråden.' using errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function intern.diskusjon_i_kategoriens_rom() from public, anon, authenticated, service_role;

create trigger diskusjoner_rom
before insert or update of kategori_id, side on public.diskusjoner
for each row execute function intern.diskusjon_i_kategoriens_rom();

-- --- 2. Plassene i rommet ------------------------------------------------------------

drop function intern.ordne_diskusjoner(text, uuid, uuid, integer);
drop function intern.ordne_diskusjonskategorier(text, uuid, integer);

-- Trådene i en kategori i rommet (eller under «Ukategoriserte» i rommet, med
-- kategori null) får plassene 0, 1, 2 …, med `forst` på plassen `indeks`.
create function intern.ordne_diskusjoner(
  side text, fagmiljo uuid, kategori uuid, forst uuid default null, indeks integer default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  with rekke as (
    select d.id, row_number() over (order by d.posisjon, d.opprettet_kl, d.id) - 1 as nr
    from public.diskusjoner d
    where d.side = ordne_diskusjoner.side
      and d.fagmiljo_id is not distinct from ordne_diskusjoner.fagmiljo
      and d.kategori_id is not distinct from ordne_diskusjoner.kategori
      and d.arkivert_kl is null
      and d.id is distinct from ordne_diskusjoner.forst
  ),
  ny as (
    select r.id, case when ordne_diskusjoner.indeks is not null and r.nr >= greatest(ordne_diskusjoner.indeks, 0) then r.nr + 1 else r.nr end as plass
    from rekke r
    union all
    select ordne_diskusjoner.forst, least(greatest(coalesce(ordne_diskusjoner.indeks, 2147483646), 0), (select count(*) from rekke))
    where ordne_diskusjoner.forst is not null
  )
  update public.diskusjoner d
  set posisjon = ny.plass
  from ny
  where d.id = ny.id and d.posisjon is distinct from ny.plass
$$;

revoke all on function intern.ordne_diskusjoner(text, uuid, uuid, uuid, integer) from public, anon, authenticated, service_role;

-- Kategoriene i rommet får plassene 0, 1, 2 …, med `forst` på plassen `indeks`.
create function intern.ordne_diskusjonskategorier(
  side text, fagmiljo uuid, forst uuid default null, indeks integer default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  with rekke as (
    select k.id, row_number() over (order by k.posisjon, k.opprettet_kl, k.id) - 1 as nr
    from public.diskusjonskategorier k
    where k.side = ordne_diskusjonskategorier.side
      and k.fagmiljo_id is not distinct from ordne_diskusjonskategorier.fagmiljo
      and k.id is distinct from ordne_diskusjonskategorier.forst
  ),
  ny as (
    select r.id, case when ordne_diskusjonskategorier.indeks is not null and r.nr >= greatest(ordne_diskusjonskategorier.indeks, 0) then r.nr + 1 else r.nr end as plass
    from rekke r
    union all
    select ordne_diskusjonskategorier.forst, least(greatest(coalesce(ordne_diskusjonskategorier.indeks, 2147483646), 0), (select count(*) from rekke))
    where ordne_diskusjonskategorier.forst is not null
  )
  update public.diskusjonskategorier k
  set posisjon = ny.plass
  from ny
  where k.id = ny.id and k.posisjon is distinct from ny.plass
$$;

revoke all on function intern.ordne_diskusjonskategorier(text, uuid, uuid, integer) from public, anon, authenticated, service_role;

-- Plassene i rommene ble før regnet ut over hele siden. Rommene pakkes tett
-- på nytt; rekkefølgen i hvert rom er uendret.
select intern.ordne_diskusjonskategorier(r.side, r.fagmiljo_id)
from (select distinct k.side, k.fagmiljo_id from public.diskusjonskategorier k) r;
select intern.ordne_diskusjoner(r.side, r.fagmiljo_id, null)
from (select distinct d.side, d.fagmiljo_id from public.diskusjoner d where d.kategori_id is null) r;

-- --- Kategoriene ---------------------------------------------------------------------

create or replace function public.opprett_diskusjonskategori(side text, navn text, emoji text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ny uuid;
begin
  perform intern.krev_innlogget();
  if intern.er_diskusjonsside(opprett_diskusjonskategori.side) and not intern.kan_lese_diskusjonsside(opprett_diskusjonskategori.side) then
    raise exception 'Du har ikke tilgang til diskusjonene på denne siden.' using errcode = '42501';
  end if;
  insert into public.diskusjonskategorier (side, navn, emoji, posisjon, opprettet_av)
  values (
    opprett_diskusjonskategori.side,
    btrim(opprett_diskusjonskategori.navn),
    btrim(opprett_diskusjonskategori.emoji),
    0,
    (select auth.uid())
  )
  returning id into ny;
  -- Sist i rommet; rommet er satt av utløseren.
  update public.diskusjonskategorier k
  set posisjon = coalesce((
    select max(a.posisjon) + 1 from public.diskusjonskategorier a
    where a.side = k.side and a.fagmiljo_id is not distinct from k.fagmiljo_id and a.id <> k.id
  ), 0)
  where k.id = ny;
  return ny;
end;
$$;

create or replace function public.flytt_diskusjonskategori(kategori uuid, indeks integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad public.diskusjonskategorier;
begin
  perform intern.krev_innlogget();
  select k.* into rad
  from public.diskusjonskategorier k
  where k.id = flytt_diskusjonskategori.kategori and intern.kan_lese_samhandling(k.fagmiljo_id, k.gruppe_id)
  for update;
  if rad.id is null then
    raise exception 'Kategorien finnes ikke lenger.' using errcode = 'P0002';
  end if;
  perform intern.ordne_diskusjonskategorier(rad.side, rad.fagmiljo_id, rad.id, flytt_diskusjonskategori.indeks);
end;
$$;

create or replace function public.los_opp_diskusjonskategori(kategori uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad public.diskusjonskategorier;
  forste integer;
begin
  perform intern.krev_innlogget();
  select k.* into rad
  from public.diskusjonskategorier k
  where k.id = los_opp_diskusjonskategori.kategori and intern.kan_lese_samhandling(k.fagmiljo_id, k.gruppe_id)
  for update;
  if rad.id is null then
    raise exception 'Kategorien finnes ikke lenger.' using errcode = 'P0002';
  end if;
  select coalesce(max(d.posisjon) + 1, 0) into forste
  from public.diskusjoner d
  where d.side = rad.side and d.fagmiljo_id is not distinct from rad.fagmiljo_id
    and d.kategori_id is null and d.arkivert_kl is null;
  update public.diskusjoner d
  set posisjon = forste + d.posisjon
  where d.kategori_id = rad.id;
  delete from public.diskusjonskategorier k where k.id = rad.id;
  perform intern.ordne_diskusjoner(rad.side, rad.fagmiljo_id, null);
  perform intern.ordne_diskusjonskategorier(rad.side, rad.fagmiljo_id);
end;
$$;

-- --- Trådene -------------------------------------------------------------------------

create or replace function public.opprett_diskusjon(
  side text, kategori uuid, tittel text, tekst jsonb, ny_kategori text default null, ny_emoji text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  valgt uuid := opprett_diskusjon.kategori;
  ny uuid;
begin
  perform intern.krev_innlogget();
  if intern.er_diskusjonsside(opprett_diskusjon.side) and not intern.kan_lese_diskusjonsside(opprett_diskusjon.side) then
    raise exception 'Du har ikke tilgang til diskusjonene på denne siden.' using errcode = '42501';
  end if;
  if opprett_diskusjon.ny_kategori is not null then
    valgt := public.opprett_diskusjonskategori(opprett_diskusjon.side, opprett_diskusjon.ny_kategori, coalesce(opprett_diskusjon.ny_emoji, ''));
  elsif valgt is null
    or not intern.er_diskusjonsside(opprett_diskusjon.side)
    or not intern.kategori_i_rom(valgt, opprett_diskusjon.side, intern.diskusjonsrom(opprett_diskusjon.side))
  then
    raise exception 'Velg en kategori på siden for tråden.' using errcode = '23503';
  end if;

  insert into public.diskusjoner (side, kategori_id, forfatter_id, tittel, tekst, posisjon)
  values (
    opprett_diskusjon.side,
    valgt,
    (select auth.uid()),
    btrim(opprett_diskusjon.tittel),
    opprett_diskusjon.tekst,
    coalesce((select max(d.posisjon) + 1 from public.diskusjoner d where d.kategori_id = valgt and d.arkivert_kl is null), 0)
  )
  returning id into ny;
  return ny;
end;
$$;

create or replace function public.flytt_diskusjon(diskusjon uuid, kategori uuid, indeks integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  traad public.diskusjoner;
begin
  perform intern.krev_innlogget();
  traad := intern.lesbar_diskusjon(flytt_diskusjon.diskusjon);
  if traad.id is null or traad.arkivert_kl is not null then
    raise exception 'Tråden er arkivert eller finnes ikke.' using errcode = '42501';
  end if;
  if not intern.kan_styre_diskusjon(traad) then
    raise exception 'Bare den som startet tråden, eller en moderator, kan flytte den.' using errcode = '42501';
  end if;
  if flytt_diskusjon.kategori is null or not intern.kategori_i_rom(flytt_diskusjon.kategori, traad.side, traad.fagmiljo_id) then
    raise exception 'Tråden kan bare flyttes til en kategori på samme side.' using errcode = '23503';
  end if;
  update public.diskusjoner d set kategori_id = flytt_diskusjon.kategori where d.id = traad.id;
  perform intern.ordne_diskusjoner(traad.side, traad.fagmiljo_id, flytt_diskusjon.kategori, traad.id, flytt_diskusjon.indeks);
  if traad.kategori_id is distinct from flytt_diskusjon.kategori then
    perform intern.ordne_diskusjoner(traad.side, traad.fagmiljo_id, traad.kategori_id);
  end if;
end;
$$;

create or replace function public.arkiver_diskusjon(diskusjon uuid, arkivert boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  traad public.diskusjoner;
begin
  perform intern.krev_innlogget();
  traad := intern.lesbar_diskusjon(arkiver_diskusjon.diskusjon);
  if traad.id is null then
    raise exception 'Tråden finnes ikke.' using errcode = 'P0002';
  end if;
  if (traad.arkivert_kl is not null) = arkiver_diskusjon.arkivert then
    return;
  end if;
  if not intern.kan_styre_diskusjon(traad) then
    raise exception 'Bare den som startet tråden, eller en moderator, kan arkivere den eller hente den tilbake.' using errcode = '42501';
  end if;
  if arkiver_diskusjon.arkivert then
    update public.diskusjoner d set arkivert_kl = now() where d.id = traad.id;
    perform intern.ordne_diskusjoner(traad.side, traad.fagmiljo_id, traad.kategori_id);
  else
    update public.diskusjoner d set arkivert_kl = null where d.id = traad.id;
    perform intern.ordne_diskusjoner(traad.side, traad.fagmiljo_id, traad.kategori_id, traad.id, null);
  end if;
end;
$$;

create or replace function public.slett_diskusjon(diskusjon uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  bruker uuid := intern.krev_innlogget();
  traad public.diskusjoner;
begin
  traad := intern.lesbar_diskusjon(slett_diskusjon.diskusjon);
  if traad.id is null then
    raise exception 'Tråden finnes ikke lenger.' using errcode = 'P0002';
  end if;
  -- En tråd uten forfatter (brukeren er slettet) er ingens egen: bare en moderator sletter den.
  if not intern.kan_moderere_diskusjon(traad) and not coalesce(
    traad.forfatter_id = bruker
    and traad.arkivert_kl is null
    and intern.diskusjon_bare_egne(traad.id, bruker),
    false
  ) then
    raise exception 'Du kan bare slette en tråd du har startet selv, før andre har skrevet i den.' using errcode = '42501';
  end if;
  delete from public.diskusjoner d where d.id = traad.id;
  if traad.arkivert_kl is null then
    perform intern.ordne_diskusjoner(traad.side, traad.fagmiljo_id, traad.kategori_id);
  end if;
end;
$$;

-- Til en annen side med samme rekkevidde: tråden blir i sitt rom, så
-- kategorien må stå i rommet på den nye siden.
create or replace function public.flytt_diskusjon_til_side(
  diskusjon uuid, side text, kategori uuid, ny_kategori text default null, ny_emoji text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  traad public.diskusjoner;
  valgt uuid := flytt_diskusjon_til_side.kategori;
begin
  perform intern.krev_innlogget();
  traad := intern.lesbar_diskusjon(flytt_diskusjon_til_side.diskusjon);
  if traad.id is null or traad.arkivert_kl is not null then
    raise exception 'Tråden er arkivert eller finnes ikke.' using errcode = '42501';
  end if;
  if not intern.kan_styre_diskusjon(traad) then
    raise exception 'Bare den som startet tråden, eller en moderator, kan flytte den.' using errcode = '42501';
  end if;
  if traad.side = flytt_diskusjon_til_side.side then
    raise exception 'Tråden står alt på den siden.' using errcode = '22023';
  end if;
  if not intern.er_diskusjonsside(flytt_diskusjon_til_side.side)
    or not intern.samme_diskusjonsrekkevidde(traad, flytt_diskusjon_til_side.side)
  then
    raise exception 'En tråd kan bare flyttes til en side med samme rekkevidde.' using errcode = '42501';
  end if;
  if flytt_diskusjon_til_side.ny_kategori is not null then
    valgt := public.opprett_diskusjonskategori(
      flytt_diskusjon_til_side.side,
      flytt_diskusjon_til_side.ny_kategori,
      coalesce(flytt_diskusjon_til_side.ny_emoji, '')
    );
  elsif valgt is null or not intern.kategori_i_rom(valgt, flytt_diskusjon_til_side.side, traad.fagmiljo_id) then
    raise exception 'Velg en kategori på siden tråden skal flyttes til.' using errcode = '23503';
  end if;

  update public.diskusjoner d
  set side = flytt_diskusjon_til_side.side, kategori_id = valgt
  where d.id = traad.id;
  perform intern.ordne_diskusjoner(flytt_diskusjon_til_side.side, traad.fagmiljo_id, valgt, traad.id, null);
  perform intern.ordne_diskusjoner(traad.side, traad.fagmiljo_id, traad.kategori_id);
end;
$$;

-- Fagsidene er felles: rommet er siden alene (fagmiljø null).
create or replace function intern.diskusjoner_folg_nokkel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fra text := 'stoff:' || old.slug;
  til text := 'stoff:' || new.slug;
  gammel record;
  malet uuid;
begin
  if new.slug is null or old.slug is null or not intern.er_diskusjonsside(til) then
    return null;
  end if;
  for gammel in select k.* from public.diskusjonskategorier k where k.side = fra order by k.posisjon loop
    select k.id into malet
    from public.diskusjonskategorier k
    where k.side = til and (lower(k.navn) = lower(gammel.navn) or k.emoji = gammel.emoji)
    order by (lower(k.navn) = lower(gammel.navn)) desc
    limit 1;
    if malet is not null then
      update public.diskusjoner d
      set kategori_id = malet, side = til, posisjon = 1000000 + d.posisjon
      where d.kategori_id = gammel.id;
      delete from public.diskusjonskategorier k where k.id = gammel.id;
      perform intern.ordne_diskusjoner(til, null, malet);
    else
      update public.diskusjonskategorier k
      set side = til, posisjon = 1000000 + k.posisjon
      where k.id = gammel.id;
    end if;
  end loop;
  update public.diskusjoner d
  set side = til, posisjon = case when d.kategori_id is null then 1000000 + d.posisjon else d.posisjon end
  where d.side = fra;
  perform intern.ordne_diskusjonskategorier(til, null);
  perform intern.ordne_diskusjoner(til, null, null);
  return null;
end;
$$;

-- --- 4. Oversikten og tekstene: rommet den innloggede arbeider i ---------------------------

create or replace function public.diskusjonsoversikt(side text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with traader as (
    select d.*, b.sett_kl
    from public.diskusjoner d
    left join public.diskusjonsbesok b on b.diskusjon_id = d.id and b.bruker_id = (select auth.uid())
    where d.side = diskusjonsoversikt.side
      and d.fagmiljo_id is not distinct from (select public.diskusjonsrom(diskusjonsoversikt.side))
  ),
  kommentarer as (
    select
      k.diskusjon_id,
      count(*) as antall,
      count(*) filter (
        where k.forfatter_id is distinct from (select auth.uid())
          and (t.sett_kl is null or k.opprettet_kl > t.sett_kl)
      ) as nye,
      max(k.opprettet_kl) as siste
    from public.diskusjonskommentarer k
    join traader t on t.id = k.diskusjon_id
    where not k.slettet
    group by k.diskusjon_id
  ),
  hjerter as (
    select h.diskusjon_id, count(*) as antall, bool_or(h.bruker_id = (select auth.uid())) as mitt
    from public.diskusjonshjerter h
    join traader t on t.id = h.diskusjon_id
    where h.kommentar_id is null
    group by h.diskusjon_id
  )
  select jsonb_build_object(
    'kan_moderere', public.kan_moderere_diskusjoner(diskusjonsoversikt.side),
    'kategorier', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', k.id,
          'navn', k.navn,
          'emoji', k.emoji,
          'posisjon', k.posisjon
        ) order by k.posisjon, k.opprettet_kl, k.id)
      from public.diskusjonskategorier k
      where k.side = diskusjonsoversikt.side
        and k.fagmiljo_id is not distinct from (select public.diskusjonsrom(diskusjonsoversikt.side))
    ), '[]'::jsonb),
    'diskusjoner', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', t.id,
          'kategori_id', t.kategori_id,
          'forfatter_id', t.forfatter_id,
          'tittel', t.tittel,
          'posisjon', t.posisjon,
          'opprettet_kl', t.opprettet_kl,
          'arkivert_kl', t.arkivert_kl,
          'siste_kl', greatest(t.opprettet_kl, k.siste),
          'kommentarer', coalesce(k.antall, 0),
          'nye_kommentarer', coalesce(k.nye, 0),
          'usett', (t.sett_kl is null and t.forfatter_id is distinct from (select auth.uid())) or coalesce(k.nye, 0) > 0,
          'hjerter', coalesce(h.antall, 0),
          'mitt_hjerte', coalesce(h.mitt, false)
        ) order by t.posisjon, t.opprettet_kl, t.id)
      from traader t
      left join kommentarer k on k.diskusjon_id = t.id
      left join hjerter h on h.diskusjon_id = t.id
    ), '[]'::jsonb)
  )
$$;

create or replace function public.diskusjonstekster(side text)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id,
      'tittel', d.tittel,
      'tekster', to_jsonb(array_remove(array[d.tekst], null)) || coalesce((
        select jsonb_agg(k.tekst order by k.opprettet_kl, k.id)
        from public.diskusjonskommentarer k
        where k.diskusjon_id = d.id and k.tekst is not null
      ), '[]'::jsonb)
    ) order by d.posisjon, d.opprettet_kl, d.id), '[]'::jsonb)
  from public.diskusjoner d
  where d.side = diskusjonstekster.side
    and d.fagmiljo_id is not distinct from (select public.diskusjonsrom(diskusjonstekster.side))
$$;

-- --- 5. Modereringen følger trådens rom ------------------------------------------------

-- Modererer innholdet med denne plasseringen (som `intern.kan_lese_samhandling`):
-- en gruppe: gruppens moderatorer og ansvarlige og systemarkitektene; et
-- fagmiljø: de lokale administratorene der; felles: systemarkitektene. Alltid
-- med aktivt medlemskap.
create function intern.kan_moderere_rom(fagmiljo uuid, gruppe uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    intern.har_aktivt_medlemskap(kan_moderere_rom.bruker)
    and case
      when kan_moderere_rom.gruppe is not null then intern.kan_moderere_gruppe(kan_moderere_rom.gruppe, kan_moderere_rom.bruker)
      when kan_moderere_rom.fagmiljo is not null then intern.er_lokal_admin_i(kan_moderere_rom.fagmiljo, kan_moderere_rom.bruker)
      else intern.er_systemarkitekt(kan_moderere_rom.bruker)
    end,
    false
  )
$$;

revoke all on function intern.kan_moderere_rom(uuid, uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.kan_moderere_rom(uuid, uuid, uuid) is
  'Om brukeren kan moderere samhandlingen med fagmiljøet og gruppen (begge tomme: felles). Se docs/diskusjoner.md.';

-- Siden i arbeidskonteksten, til knappene i oversikten.
create or replace function intern.kan_moderere_diskusjonsside(side text, bruker uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not coalesce(intern.har_aktivt_medlemskap(kan_moderere_diskusjonsside.bruker), false) then
    return false;
  end if;
  if split_part(kan_moderere_diskusjonsside.side, ':', 1) = 'gruppe' then
    return intern.kan_moderere_gruppe(intern.diskusjonsgruppe(kan_moderere_diskusjonsside.side), kan_moderere_diskusjonsside.bruker);
  end if;
  return intern.kan_moderere_rom(intern.diskusjonsrom(kan_moderere_diskusjonsside.side), null, kan_moderere_diskusjonsside.bruker);
end;
$$;

-- Tråden, i rommet den står i.
create function intern.kan_moderere_diskusjon(traad public.diskusjoner)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select traad.id is not null and intern.kan_moderere_rom(traad.fagmiljo_id, traad.gruppe_id)
$$;

revoke all on function intern.kan_moderere_diskusjon(public.diskusjoner) from public, anon, authenticated, service_role;

-- Den innloggedes eget svar for en tråd, til appens knapper i tråden og
-- radsikkerheten for de skjulte tekstene. Nei for en tråd den innloggede
-- ikke kan lese.
create function public.kan_moderere_diskusjon(diskusjon uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select intern.kan_moderere_diskusjon(d)
    from public.diskusjoner d
    where d.id = kan_moderere_diskusjon.diskusjon
      and intern.har_aktivt_medlemskap((select auth.uid()))
      and intern.kan_lese_samhandling(d.fagmiljo_id, d.gruppe_id)
  ), false)
$$;

revoke all on function public.kan_moderere_diskusjon(uuid) from public, anon, authenticated, service_role;
grant execute on function public.kan_moderere_diskusjon(uuid) to authenticated;

comment on function public.kan_moderere_diskusjon(uuid) is
  'Om den innloggede kan moderere tråden, i rommet den står i. Se docs/diskusjoner.md.';

create or replace function intern.kan_styre_diskusjon(traad public.diskusjoner)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    traad.forfatter_id = (select auth.uid()) or intern.kan_moderere_diskusjon(traad),
    false
  )
$$;

create or replace function intern.krev_moderering(diskusjon uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  traad public.diskusjoner;
begin
  perform intern.krev_innlogget();
  select d.* into traad
  from public.diskusjoner d
  where d.id = krev_moderering.diskusjon and intern.kan_lese_samhandling(d.fagmiljo_id, d.gruppe_id);
  if traad.id is null or not intern.kan_moderere_diskusjon(traad) then
    raise exception 'Bare en moderator for siden kan skjule, vise eller fjerne innhold.' using errcode = '42501';
  end if;
  -- En arkivert tråd er frosset til den er hentet tilbake.
  if traad.arkivert_kl is not null then
    raise exception 'Tråden er arkivert eller finnes ikke.' using errcode = '42501';
  end if;
end;
$$;

drop policy "Moderatorene ser skjulte tekster" on public.diskusjon_skjulte_tekster;
create policy "Moderatorene ser skjulte tekster" on public.diskusjon_skjulte_tekster
for select to authenticated
using (public.kan_moderere_diskusjon(diskusjon_id));

-- Tråden sier om den innloggede kan moderere den, i rommet den står i. Ellers som før.
create or replace function public.diskusjonstraad(diskusjon uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with hjerter as (
    select h.kommentar_id, count(*) as antall, bool_or(h.bruker_id = (select auth.uid())) as mitt
    from public.diskusjonshjerter h
    where h.diskusjon_id = diskusjonstraad.diskusjon
    group by h.kommentar_id
  ),
  skjulte as (
    select s.kommentar_id
    from public.diskusjon_skjulte_tekster s
    where s.diskusjon_id = diskusjonstraad.diskusjon
  )
  select jsonb_build_object(
    'id', d.id,
    'side', d.side,
    'kan_moderere', public.kan_moderere_diskusjon(d.id),
    'kategori_id', d.kategori_id,
    'forfatter_id', d.forfatter_id,
    'tittel', d.tittel,
    'tekst', d.tekst,
    'skjult', d.skjult_kl is not null,
    'kan_vises', d.skjult_kl is not null and exists (select 1 from skjulte s where s.kommentar_id is null),
    'opprettet_kl', d.opprettet_kl,
    'endret_kl', d.endret_kl,
    'arkivert_kl', d.arkivert_kl,
    'lest_kl', now(),
    'sist_sett', (
      select b.sett_kl from public.diskusjonsbesok b
      where b.diskusjon_id = d.id and b.bruker_id = (select auth.uid())
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
          'skjult', k.skjult_kl is not null,
          'kan_vises', k.skjult_kl is not null and exists (select 1 from skjulte s where s.kommentar_id = k.id),
          'opprettet_kl', k.opprettet_kl,
          'endret_kl', k.endret_kl,
          'hjerter', case when k.slettet then 0 else coalesce(h.antall, 0) end,
          'mitt_hjerte', case when k.slettet then false else coalesce(h.mitt, false) end
        ) order by k.opprettet_kl, k.id)
      from public.diskusjonskommentarer k
      left join hjerter h on h.kommentar_id = k.id
      where k.diskusjon_id = d.id
    ), '[]'::jsonb)
  )
  from public.diskusjoner d
  where d.id = diskusjonstraad.diskusjon
$$;
