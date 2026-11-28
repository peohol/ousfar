-- Datert stillingshistorikk (#602, docs/stillinger.md «Stilling per dag»,
-- docs/personal.md §7.4, §8.5 og B14).
--
--   1. Stillingen per dag: `intern.stillingshistorikk` har én rad per
--      endring, med datoen den gjelder fra. En rad gjelder til dagen før den
--      neste, så historikken kan verken få hull eller overlapp. Den gjeldende
--      raden er alltid `profiles.stilling_id`: en utløser på `profiles`
--      fører hver endring, uansett hvor den gjøres fra (`sett_stilling` i
--      «Kontoen din» eller «Brukere», eller `fjern_stilling` med erstatning).
--      De som har en stilling i dag, får den som første rad med åpen
--      startdato; uten rad er man uten stilling.
--   2. En endring gjelder fra i dag (Europe/Oslo) og skriver aldri om
--      tidligere dager. Flere endringer samme dag gir dagens siste.
--   3. Katalogendringer skriver ikke om historikken: historikken viser til
--      stillingen med ID-en, så et nytt navn eller en ny kategori ikke endrer
--      hvilken stilling det var. En stilling som fjernes fra lista mens
--      historikken viser til den, huskes med navnet i
--      `intern.fjernede_stillinger`, så tidligere vekter per stilling står.
--   4. Lesingen er på serveren: `intern.stillingsperioder` (mange brukere og
--      en periode) og `intern.stilling_pa_dag` (én bruker, én dag), for
--      funksjonene til personalkalenderen. Nettleseren når ingen av dem.
--   5. Myndigheten (B14): styrer stillingen vaktene i et fagmiljø
--      (`personal.stilling_styrer_vakter`), kan den bare endres av en lokal
--      administrator i hvert slikt fagmiljø (aktivt medlem og administrator,
--      uten systemarkitektunntak), ikke av personen selv. Ellers som før.
--
-- Ingen eksisterende data endres; historikken fylles med stillingene slik de
-- står. Tilbakeføring: en ny migrasjon som fjerner utløserne på
-- `public.profiles` og `public.stillinger`, tabellene og funksjonene her, og
-- legger `intern.stillingsavslag` og `public.fjern_stilling` tilbake slik de
-- var (20261119125000).

-- --- Dagen ----------------------------------------------------------------------

-- Dagen en endring av stillingen gjelder fra. Stillingen er felles for hele
-- profilen, så dagen regnes i norsk tid, som standarden i personalkalenderen
-- (`personal.i_dag`).
create function intern.stillingsdag()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'Europe/Oslo')::date
$$;

revoke all on function intern.stillingsdag() from public, anon, authenticated, service_role;

-- --- Historikken -------------------------------------------------------------------

-- Stillingen til en bruker fra og med `fra` til dagen før neste rad. `fra`
-- tom: fra begynnelsen (bare den første raden, fylt fra stillingen brukeren
-- hadde da historikken ble innført). `stilling_id` tom: uten stilling. Ingen
-- rad er lik den før, og uten rad før er man uten stilling.
--
-- Raden følger profilen: slettes kontoen, går historikken med. For en
-- medarbeider i personalkalenderen stopper kalenderen selv slettingen til B9
-- er avgjort (`personal.medarbeidere`).
create table intern.stillingshistorikk (
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  fra date,
  -- Uten fremmednøkkel: en stilling som fjernes fra lista, står i
  -- historikken (`intern.fjernede_stillinger`). At den fantes da raden ble
  -- skrevet, kontrolleres av vakten under.
  stilling_id uuid,
  endret_kl timestamptz not null default now(),
  endret_av uuid references public.profiles (id) on delete set null,
  constraint stillingshistorikk_en_per_dag unique nulls not distinct (bruker_id, fra)
);

create index stillingshistorikk_stilling_idx on intern.stillingshistorikk (stilling_id) where stilling_id is not null;

comment on table intern.stillingshistorikk is
  'Stillingen til hver bruker per dag (#602): én rad per endring, gyldig fra `fra` til neste rad. Skrives bare av utløseren på profiles. Se docs/stillinger.md.';

revoke all on intern.stillingshistorikk from public, anon, authenticated, service_role;

-- Stillingene som er fjernet fra lista mens historikken viste til dem, med
-- navnet de hadde, så tidligere dager kan vises og vektes som før.
create table intern.fjernede_stillinger (
  id uuid primary key,
  navn text not null,
  kategori text,
  fjernet_kl timestamptz not null default now(),
  fjernet_av uuid references public.profiles (id) on delete set null
);

comment on table intern.fjernede_stillinger is
  'Stillinger som er fjernet fra lista, men står i stillingshistorikken (#602). Se docs/stillinger.md.';

revoke all on intern.fjernede_stillinger from public, anon, authenticated, service_role;

-- Stillingene slik de står i dag blir den første raden, fra begynnelsen.
insert into intern.stillingshistorikk (bruker_id, fra, stilling_id)
select p.id, null, p.stilling_id
from public.profiles p
where p.stilling_id is not null;

-- Historikken endres bare fremover: en ny rad gjelder fra i dag, og bare
-- dagens rad kan endres eller fjernes. Tidligere dager står, også mot en
-- direkte endring i tabellen. Unntaket er at kontoen slettes (over).
create function intern.stillingshistorikk_vakt()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  dag date := intern.stillingsdag();
begin
  if tg_op = 'DELETE' then
    if old.fra is not distinct from dag or not exists (select 1 from public.profiles p where p.id = old.bruker_id) then
      return old;
    end if;
    raise exception 'Stillingshistorikken kan ikke endres bakover i tid.' using errcode = '42501';
  end if;
  -- Slettes kontoen som gjorde en endring, tømmer fremmednøkkelen `endret_av`
  -- (`on delete set null`); det endrer ikke hvilken stilling som gjaldt.
  if tg_op = 'UPDATE' and new.endret_av is null
    and (new.bruker_id, new.fra, new.stilling_id, new.endret_kl) is not distinct from (old.bruker_id, old.fra, old.stilling_id, old.endret_kl)
    and not exists (select 1 from public.profiles p where p.id = old.endret_av) then
    return new;
  end if;
  if tg_op = 'UPDATE' and (
    old.fra is distinct from dag or new.fra is distinct from old.fra or new.bruker_id <> old.bruker_id
  ) then
    raise exception 'Stillingshistorikken kan ikke endres bakover i tid.' using errcode = '42501';
  end if;
  if tg_op = 'INSERT' and new.fra is distinct from dag then
    raise exception 'En ny stilling gjelder fra i dag.' using errcode = '42501';
  end if;
  if new.stilling_id is not null and not exists (select 1 from public.stillinger s where s.id = new.stilling_id) then
    raise exception 'Stillingen finnes ikke lenger. Velg en annen.' using errcode = 'P0002';
  end if;
  return new;
end;
$$;

revoke all on function intern.stillingshistorikk_vakt() from public, anon, authenticated, service_role;

create trigger stillingshistorikk_vakt
before insert or update or delete on intern.stillingshistorikk
for each row execute function intern.stillingshistorikk_vakt();

-- Fører stillingen `stilling` for `bruker` fra i dag. Er den lik den som
-- gjaldt i går, fjernes dagens rad, så ingen rad er lik den før.
create function intern.for_stilling(bruker uuid, stilling uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  dag date := intern.stillingsdag();
  forrige uuid;
begin
  select h.stilling_id into forrige
  from intern.stillingshistorikk h
  where h.bruker_id = for_stilling.bruker and (h.fra is null or h.fra < dag)
  order by h.fra desc nulls last
  limit 1;
  if forrige is not distinct from for_stilling.stilling then
    delete from intern.stillingshistorikk h where h.bruker_id = for_stilling.bruker and h.fra = dag;
  else
    insert into intern.stillingshistorikk as h (bruker_id, fra, stilling_id, endret_kl, endret_av)
    values (for_stilling.bruker, dag, for_stilling.stilling, now(), (select auth.uid()))
    on conflict on constraint stillingshistorikk_en_per_dag do update
    set stilling_id = excluded.stilling_id, endret_kl = excluded.endret_kl, endret_av = excluded.endret_av;
  end if;
end;
$$;

revoke all on function intern.for_stilling(uuid, uuid) from public, anon, authenticated, service_role;

create function intern.profil_stilling_endret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.for_stilling(new.id, new.stilling_id);
  return null;
end;
$$;

revoke all on function intern.profil_stilling_endret() from public, anon, authenticated, service_role;

create trigger profiles_stillingshistorikk
after update of stilling_id on public.profiles
for each row when (old.stilling_id is distinct from new.stilling_id)
execute function intern.profil_stilling_endret();

create trigger profiles_stillingshistorikk_ny
after insert on public.profiles
for each row when (new.stilling_id is not null)
execute function intern.profil_stilling_endret();

-- En stilling som fjernes fra lista mens historikken viser til den, huskes.
create function intern.stilling_fjernet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from intern.stillingshistorikk h where h.stilling_id = old.id) then
    insert into intern.fjernede_stillinger (id, navn, kategori, fjernet_av)
    values (
      old.id,
      old.navn,
      (select k.navn from public.stillingskategorier k where k.id = old.kategori_id),
      (select auth.uid())
    )
    on conflict (id) do update set navn = excluded.navn, kategori = excluded.kategori,
      fjernet_kl = excluded.fjernet_kl, fjernet_av = excluded.fjernet_av;
  end if;
  return null;
end;
$$;

revoke all on function intern.stilling_fjernet() from public, anon, authenticated, service_role;

create trigger stillinger_historikk
after delete on public.stillinger
for each row execute function intern.stilling_fjernet();

-- --- Lesingen på serveren -------------------------------------------------------

-- Stillingen til hver av `brukere` hver dag fra og med `periode_fra` til og
-- med `periode_til`, som sammenhengende perioder uten hull: hver dag i
-- perioden står i nøyaktig én rad per bruker som finnes. `stilling_id` tom:
-- uten stilling. `stilling` er navnet, også for en stilling som er fjernet
-- fra lista (`fjernet`). Bare for funksjonene på serveren.
create function intern.stillingsperioder(brukere uuid[], periode_fra date, periode_til date)
returns table (bruker_id uuid, fra date, til date, stilling_id uuid, stilling text, fjernet boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if periode_fra is null or periode_til is null or periode_til < periode_fra then
    raise exception 'Perioden må ha en start og en slutt, i den rekkefølgen.' using errcode = '22023';
  end if;
  return query
  with b as (
    select p.id from public.profiles p where p.id = any (stillingsperioder.brukere)
  ),
  rader as (
    select b.id as bruker, x.fra, x.stilling_id,
      lead(x.fra) over (partition by b.id order by x.fra nulls first) - 1 as til
    from b
    cross join lateral (
      select h.fra, h.stilling_id from intern.stillingshistorikk h where h.bruker_id = b.id
      union all
      -- Før den første endringen var man uten stilling.
      select null::date, null::uuid
      where not exists (select 1 from intern.stillingshistorikk h where h.bruker_id = b.id and h.fra is null)
    ) x
  )
  select r.bruker,
    greatest(coalesce(r.fra, stillingsperioder.periode_fra), stillingsperioder.periode_fra),
    least(coalesce(r.til, stillingsperioder.periode_til), stillingsperioder.periode_til),
    r.stilling_id,
    coalesce(s.navn, f.navn),
    s.id is null and f.id is not null
  from rader r
  left join public.stillinger s on s.id = r.stilling_id
  left join intern.fjernede_stillinger f on f.id = r.stilling_id
  where (r.fra is null or r.fra <= stillingsperioder.periode_til)
    and (r.til is null or r.til >= stillingsperioder.periode_fra)
  order by r.bruker, 2;
end;
$$;

revoke all on function intern.stillingsperioder(uuid[], date, date) from public, anon, authenticated, service_role;

comment on function intern.stillingsperioder(uuid[], date, date) is
  'Stillingen til brukerne per dag i perioden, som sammenhengende perioder (#602). Bare for serverens funksjoner. Se docs/stillinger.md.';

-- Stillingen `bruker` hadde dagen `dag`, eller ingenting.
create function intern.stilling_pa_dag(bruker uuid, dag date)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select x.stilling_id from intern.stillingsperioder(array[stilling_pa_dag.bruker], stilling_pa_dag.dag, stilling_pa_dag.dag) x
$$;

revoke all on function intern.stilling_pa_dag(uuid, date) from public, anon, authenticated, service_role;

comment on function intern.stilling_pa_dag(uuid, date) is
  'Stillingen brukeren hadde den dagen, eller null (#602). Bare for serverens funksjoner. Se docs/stillinger.md.';

-- --- Myndigheten (B14) -----------------------------------------------------------

-- Som før (20261119125000), med B14 først: styrer stillingen til `mal`
-- vaktene i ett eller flere fagmiljøer, kan den bare endres av en annen som
-- er lokal administrator i hvert av dem (`intern.administrerte_fagmiljoer`:
-- aktivt medlem og administrator, uten systemarkitektunntak, B2). Fagmiljøet
-- endringen gjøres fra, spiller ingen rolle.
create or replace function intern.stillingsavslag(aktor uuid, mal uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  styrer uuid[];
begin
  if aktor is null or not exists (select 1 from public.profiles p where p.id = aktor) then
    return array['42501', 'Kontoen din finnes ikke lenger.'];
  end if;
  if mal is null or not exists (select 1 from public.profiles p where p.id = mal) then
    return array['P0002', 'Ukjent bruker.'];
  end if;

  select array_agg(f) into styrer from personal.stilling_styrer_vakter(mal) f;
  if styrer is not null then
    if aktor = mal then
      return array['42501', 'Stillingen din brukes i planleggingen i fagmiljøet og kan bare endres av en lokal administrator der.'];
    end if;
    if exists (
      select 1 from unnest(styrer) f
      where f not in (select intern.administrerte_fagmiljoer(aktor))
    ) then
      return array['42501', 'Stillingen til denne brukeren brukes i planleggingen og kan bare endres av en lokal administrator i hvert fagmiljø der den brukes.'];
    end if;
    if intern.er_systemarkitekt(mal) and not intern.er_systemarkitekt(aktor) then
      return array['42501', 'Stillingen til en systemarkitekt kan bare endres av en systemarkitekt.'];
    end if;
    return null;
  end if;

  if aktor = mal or intern.er_systemarkitekt(aktor) then
    return null;
  end if;
  if intern.er_systemarkitekt(mal) then
    return array['42501', 'Stillingen til en systemarkitekt kan bare endres av en systemarkitekt.'];
  end if;
  if exists (
    select 1 from public.medlemskap m
    where m.bruker_id = mal and m.status <> 'deaktivert'
      and m.fagmiljo_id in (select intern.administrerte_fagmiljoer(aktor))
  ) then
    return null;
  end if;
  return array['42501', 'Du kan bare endre stillingen til medlemmer i fagmiljøer du administrerer.'];
end;
$$;

revoke all on function intern.stillingsavslag(uuid, uuid) from public, anon, authenticated, service_role;

-- Som før (20261119125000), men en erstatning gis bare når den innloggede
-- kan endre stillingen til hver av dem (B14); ellers må de få en ny stilling
-- én og én av den som kan.
create or replace function public.fjern_stilling(stilling uuid, erstatning uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  antall integer;
  nektet integer;
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
    select count(*) into nektet from public.profiles p
    where p.stilling_id = fjern_stilling.stilling
      and intern.stillingsavslag((select auth.uid()), p.id) is not null;
    if nektet > 0 then
      raise exception '% med denne stillingen kan bare få en annen stilling av en lokal administrator i fagmiljøet. Den må endres der først.',
        case nektet when 1 then 'Én bruker' else nektet || ' brukere' end
        using errcode = '42501';
    end if;
    update public.profiles p set stilling_id = fjern_stilling.erstatning
    where p.stilling_id = fjern_stilling.stilling;
  end if;
  delete from public.stillinger s where s.id = fjern_stilling.stilling;
  return antall;
end;
$$;

revoke all on function public.fjern_stilling(uuid, uuid) from public, anon, authenticated, service_role;
grant execute on function public.fjern_stilling(uuid, uuid) to authenticated;
