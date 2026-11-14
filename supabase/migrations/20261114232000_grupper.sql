-- P6: grupper, innenfor ett fagmiljø og på tvers av fagmiljøer
-- (docs/ousfar-nasjonal-p0-kartlegging.md §5.1–5.2 og §6.4). Reglene står i
-- docs/fagmiljoer.md, «Gruppene».
--
--  * En gruppe hører enten til ett fagmiljø (`art = 'fagmiljo'`), og har da
--    bare medlemmer der, eller går på tvers av fagmiljøene
--    (`art = 'tverrfaglig'`). En lokal administrator oppretter grupper i sitt
--    eget fagmiljø; bare systemarkitektene oppretter grupper på tvers.
--  * Medlemskapet begynner som en invitasjon brukeren selv godtar. Rollene er
--    `medlem`, `moderator` (modererer diskusjonene) og `ansvarlig` (modererer
--    og styrer medlemmene). En aktiv gruppe har alltid minst én ansvarlig.
--  * Gruppen har sine egne diskusjoner, på siden `gruppe:<id>`, med de samme
--    tabellene, funksjonene og varslene som trådene på fagsidene og i
--    fortolkningen. En tråd i en gruppe har rekkevidden `gruppe` og kan aldri
--    flyttes ut av gruppen, og ingen tråd kan flyttes inn.
--  * Tilgangen regnes ut på nytt ved hvert oppslag: et aktivt
--    gruppemedlemskap i en aktiv gruppe, et aktivt medlemskap i et fagmiljø
--    og, for en gruppe i et fagmiljø, aktivt medlemskap der. Den som fjernes,
--    eller mister medlemskapet i fagmiljøet, mister alt med en gang: trådene,
--    kommentarene, varslene, søket og direktelenkene.
--  * Gruppemedlemskap gir aldri noe utenfor gruppens egne diskusjoner, og
--    aldri tilgang til et annet fagmiljøs lokale innhold.
--  * Idéene og de planlagte oppgavene er uendret (D8): idéene er felles for
--    alle med aktivt medlemskap, og grupper har ingen egne.
--
-- Alt skrives gjennom funksjonene her, som låser gruppens rad først, slik at
-- samtidige endringer i samme gruppe skjer én om gangen. Hver endring føres i
-- tilgangsloggen av databasen selv. Ingen eksisterende data endres, og ingen
-- setninger er destruktive.
--
-- Tilbakeføring: en ny migrasjon som setter funksjonene og reglene
-- `rekkevidde` tilbake til definisjonene i 20261114121000, 20261114130000 og
-- 20261114202000 og fjerner funksjonene herfra. Tabellene og kolonnene
-- `gruppe_id` kan stå; uten funksjonene leses ingenting i dem.

-- --- Tabellene ------------------------------------------------------------------

create table public.grupper (
  id uuid primary key default gen_random_uuid(),
  navn text not null,
  beskrivelse text not null default '',
  art text not null,
  fagmiljo_id uuid references public.fagmiljoer (id),
  status text not null default 'aktiv',
  opprettet_av uuid references public.profiles (id) on delete set null,
  opprettet_kl timestamptz not null default now(),
  endret_kl timestamptz not null default now(),
  constraint grupper_art check (
    (art = 'fagmiljo' and fagmiljo_id is not null) or (art = 'tverrfaglig' and fagmiljo_id is null)
  ),
  constraint grupper_status check (status in ('aktiv', 'arkivert')),
  constraint grupper_navn check (char_length(navn) between 1 and 80 and navn = btrim(navn)),
  constraint grupper_beskrivelse check (char_length(beskrivelse) <= 1000)
);

comment on table public.grupper is
  'P6: gruppene, i ett fagmiljø eller på tvers. Arkiveres, slettes aldri. Skrives gjennom funksjonene. Se docs/fagmiljoer.md, «Gruppene».';

create index grupper_fagmiljo_idx on public.grupper (fagmiljo_id) where fagmiljo_id is not null;

create table public.gruppemedlemskap (
  id uuid primary key default gen_random_uuid(),
  gruppe_id uuid not null references public.grupper (id),
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  rolle text not null default 'medlem',
  status text not null default 'invitert',
  invitert_av uuid references public.profiles (id) on delete set null,
  -- Da invitasjonen (eller, for den som opprettet gruppen, medlemskapet) ble gitt.
  fra timestamptz not null default now(),
  aktiv_fra timestamptz,
  til timestamptz,
  constraint gruppemedlemskap_rolle check (rolle in ('medlem', 'moderator', 'ansvarlig')),
  constraint gruppemedlemskap_status check (status in ('invitert', 'aktiv', 'avsluttet')),
  constraint gruppemedlemskap_tider check (
    (status = 'avsluttet') = (til is not null) and (status = 'invitert' or status = 'avsluttet' or aktiv_fra is not null)
  )
);

comment on table public.gruppemedlemskap is
  'P6: medlemmene og invitasjonene i gruppene. Avsluttes, slettes ikke (bare med kontoen). Skrives gjennom funksjonene.';

-- Ett gjeldende medlemskap (invitert eller aktivt) per bruker og gruppe.
create unique index gruppemedlemskap_gjeldende_idx
  on public.gruppemedlemskap (gruppe_id, bruker_id) where status <> 'avsluttet';
create index gruppemedlemskap_bruker_idx
  on public.gruppemedlemskap (bruker_id) where status <> 'avsluttet';

alter table public.grupper enable row level security;
alter table public.gruppemedlemskap enable row level security;

-- Nettleseren leser og skriver bare gjennom funksjonene.
revoke all on public.grupper, public.gruppemedlemskap from anon, authenticated;

-- Loggen, de faste feltene og slettevernet, som for fagmiljøene og
-- medlemskapene (20261113140000).
create trigger grupper_logg
after insert or update or delete on public.grupper
for each row execute function intern.loggfor_tilgang();

create trigger gruppemedlemskap_logg
after insert or update or delete on public.gruppemedlemskap
for each row execute function intern.loggfor_tilgang();

create trigger grupper_faste_felter
before update on public.grupper
for each row execute function intern.tilgang_faste_felter('id', 'art', 'fagmiljo_id', 'opprettet_kl');

create trigger gruppemedlemskap_faste_felter
before update on public.gruppemedlemskap
for each row execute function intern.tilgang_faste_felter('id', 'gruppe_id', 'bruker_id', 'fra');

-- Som før, og en gruppe slettes heller aldri.
create or replace function intern.avvis_tilgangssletting()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_level = 'STATEMENT' or tg_table_name in ('fagmiljoer', 'grupper')
    or exists (select 1 from public.profiles p where p.id = (to_jsonb(old) ->> 'bruker_id')::uuid)
  then
    raise exception 'Fagmiljøer, grupper, medlemskap og roller slettes ikke; de avsluttes, og står i tilgangsloggen.'
      using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger grupper_ikke_slett
before delete on public.grupper
for each row execute function intern.avvis_tilgangssletting();

create trigger grupper_ikke_tom
before truncate on public.grupper
for each statement execute function intern.avvis_tilgangssletting();

create trigger gruppemedlemskap_ikke_slett
before delete on public.gruppemedlemskap
for each row execute function intern.avvis_tilgangssletting();

create trigger gruppemedlemskap_ikke_tom
before truncate on public.gruppemedlemskap
for each statement execute function intern.avvis_tilgangssletting();

-- En aktiv gruppe har minst én aktiv ansvarlig, kontrollert når transaksjonen
-- avsluttes, så en gruppe kan opprettes og ansvaret byttes i flere steg.
-- Prøves bare når status eller rolle endres, så sletting av en konto (som
-- tømmer `invitert_av` hos andre) aldri stoppes her.
create function intern.kontroller_gruppeansvar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  gruppe uuid := (case tg_table_name when 'grupper' then to_jsonb(new) ->> 'id' else to_jsonb(new) ->> 'gruppe_id' end)::uuid;
begin
  if exists (select 1 from public.grupper g where g.id = gruppe and g.status = 'aktiv')
    and (select count(*) from (
          select 1 from public.gruppemedlemskap m
          where m.gruppe_id = gruppe and m.status = 'aktiv' and m.rolle = 'ansvarlig'
          for share
        ) x) = 0
  then
    raise exception 'En aktiv gruppe må ha minst én ansvarlig.' using errcode = '23514';
  end if;
  return null;
end;
$$;

revoke all on function intern.kontroller_gruppeansvar() from public, anon, authenticated, service_role;

create constraint trigger grupper_ansvar
after insert or update of status on public.grupper
deferrable initially deferred
for each row execute function intern.kontroller_gruppeansvar();

create constraint trigger gruppemedlemskap_ansvar
after insert or update of status, rolle on public.gruppemedlemskap
deferrable initially deferred
for each row execute function intern.kontroller_gruppeansvar();

-- --- Hvem som er med -------------------------------------------------------------

-- Kan brukeren være med i gruppen nå? Et aktivt medlemskap i et fagmiljø, og
-- for en gruppe i et fagmiljø et aktivt medlemskap der (`intern.er_medlem_i`,
-- som også gjelder systemarkitektene).
create function intern.kan_vaere_med_i_gruppe(g public.grupper, bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    kan_vaere_med_i_gruppe.bruker is not null
    and intern.har_aktivt_medlemskap(kan_vaere_med_i_gruppe.bruker)
    and (g.art = 'tverrfaglig' or intern.er_medlem_i(g.fagmiljo_id, kan_vaere_med_i_gruppe.bruker)),
    false
  )
$$;

revoke all on function intern.kan_vaere_med_i_gruppe(public.grupper, uuid) from public, anon, authenticated, service_role;

-- Brukerens rolle i gruppen når medlemskapet gjelder nå, ellers null: aktivt
-- gruppemedlemskap i en aktiv gruppe, og brukeren kan være med
-- (`intern.kan_vaere_med_i_gruppe`). Den eneste definisjonen; alt annet
-- bygger på den.
create function intern.grupperolle(gruppe uuid, bruker uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.rolle
  from public.grupper g
  join public.gruppemedlemskap m on m.gruppe_id = g.id
  where g.id = grupperolle.gruppe
    and g.status = 'aktiv'
    and m.bruker_id = grupperolle.bruker
    and m.status = 'aktiv'
    and intern.kan_vaere_med_i_gruppe(g, grupperolle.bruker)
$$;

revoke all on function intern.grupperolle(uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.grupperolle(uuid, uuid) is
  'P6: rollen brukeren har i gruppen nå (medlem, moderator, ansvarlig), eller null. Se docs/fagmiljoer.md, «Gruppene».';

-- Leser gruppens innhold: et medlem nå, eller en systemarkitekt (P0 §5.2).
create function intern.kan_lese_gruppe(gruppe uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    kan_lese_gruppe.gruppe is not null
    and intern.har_aktivt_medlemskap(kan_lese_gruppe.bruker)
    and (
      intern.grupperolle(kan_lese_gruppe.gruppe, kan_lese_gruppe.bruker) is not null
      or (intern.er_systemarkitekt(kan_lese_gruppe.bruker)
          and exists (select 1 from public.grupper g where g.id = kan_lese_gruppe.gruppe))
    ),
    false
  )
$$;

revoke all on function intern.kan_lese_gruppe(uuid, uuid) from public, anon, authenticated, service_role;

-- Modererer gruppens diskusjoner: moderator eller ansvarlig nå, eller
-- systemarkitekt.
create function intern.kan_moderere_gruppe(gruppe uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    intern.har_aktivt_medlemskap(kan_moderere_gruppe.bruker)
    and (
      intern.grupperolle(kan_moderere_gruppe.gruppe, kan_moderere_gruppe.bruker) in ('moderator', 'ansvarlig')
      or (intern.er_systemarkitekt(kan_moderere_gruppe.bruker)
          and exists (select 1 from public.grupper g where g.id = kan_moderere_gruppe.gruppe))
    ),
    false
  )
$$;

revoke all on function intern.kan_moderere_gruppe(uuid, uuid) from public, anon, authenticated, service_role;

-- Styrer gruppen (medlemmer, roller, navn, arkiv): ansvarlig nå, eller
-- systemarkitekt.
create function intern.kan_styre_gruppe(gruppe uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    intern.har_aktivt_medlemskap(kan_styre_gruppe.bruker)
    and (
      intern.grupperolle(kan_styre_gruppe.gruppe, kan_styre_gruppe.bruker) = 'ansvarlig'
      or (intern.er_systemarkitekt(kan_styre_gruppe.bruker)
          and exists (select 1 from public.grupper g where g.id = kan_styre_gruppe.gruppe))
    ),
    false
  )
$$;

revoke all on function intern.kan_styre_gruppe(uuid, uuid) from public, anon, authenticated, service_role;

-- Gruppene den innloggede kan lese, til radsikkerheten, som bruker den som
-- `(select public.mine_lesbare_grupper())`: regnet ut én gang per spørring.
-- Tom uten aktivt medlemskap, alle for en systemarkitekt.
create function public.mine_lesbare_grupper()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.har_aktivt_medlemskap((select auth.uid())) then '{}'::uuid[]
    when intern.er_systemarkitekt((select auth.uid())) then
      coalesce((select array_agg(g.id order by g.id) from public.grupper g), '{}'::uuid[])
    else coalesce((
      select array_agg(g.id order by g.id)
      from public.grupper g
      join public.gruppemedlemskap m on m.gruppe_id = g.id
      where g.status = 'aktiv'
        and m.bruker_id = (select auth.uid())
        and m.status = 'aktiv'
        and intern.kan_vaere_med_i_gruppe(g, (select auth.uid()))
    ), '{}'::uuid[])
  end
$$;

revoke all on function public.mine_lesbare_grupper() from public, anon, authenticated, service_role;
grant execute on function public.mine_lesbare_grupper() to authenticated;

comment on function public.mine_lesbare_grupper() is
  'P6: gruppene den innloggede kan lese innholdet i. Brukes av radsikkerheten. Se docs/fagmiljoer.md, «Gruppene».';

-- Kan brukeren lese noe med denne plasseringen? En gruppe: medlem nå (eller
-- systemarkitekt). Et fagmiljø: medlem der. Ingen av delene: felles.
create function intern.kan_lese_samhandling(fagmiljo uuid, gruppe uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when kan_lese_samhandling.gruppe is not null then
      intern.kan_lese_gruppe(kan_lese_samhandling.gruppe, kan_lese_samhandling.bruker)
    when kan_lese_samhandling.fagmiljo is not null then
      intern.kan_lese_omfang('fagmiljo', kan_lese_samhandling.fagmiljo, kan_lese_samhandling.bruker)
    else intern.kan_lese_omfang('felles', null, kan_lese_samhandling.bruker)
  end
$$;

revoke all on function intern.kan_lese_samhandling(uuid, uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.kan_lese_samhandling(uuid, uuid, uuid) is
  'P6: om brukeren kan lese en tråd eller et varsel med fagmiljøet og gruppen (begge tomme: felles). Se docs/fagmiljoer.md.';

-- --- Gruppenes diskusjonsside -------------------------------------------------------

-- Siden til en gruppe er `gruppe:<gruppens ID>`.
create or replace function intern.er_diskusjonsside(side text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select char_length(side) <= 220 and (
    side ~ '^(stoff|fortolkning|register):[a-z0-9]+(-[a-z0-9]+)*$'
    or side ~ '^gruppe:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  )
$$;

-- Gruppen en side hører til, når den er en gruppes side og gruppen finnes,
-- ellers null.
create function intern.diskusjonsgruppe(side text)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select g.id from public.grupper g
  where diskusjonsgruppe.side ~ '^gruppe:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and g.id = substr(diskusjonsgruppe.side, 8)::uuid
$$;

revoke all on function intern.diskusjonsgruppe(text) from public, anon, authenticated, service_role;

-- Som i P2b, med gruppene: en gruppes side leses av dem som kan lese
-- gruppen. `intern.diskusjonsomfang` kjenner ikke gruppesidene og stopper for
-- dem, så alt som ikke er skrevet om her, er stengt for grupper.
create or replace function intern.kan_lese_diskusjonsside(side text, bruker uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  f uuid;
begin
  if split_part(kan_lese_diskusjonsside.side, ':', 1) = 'gruppe' then
    return intern.kan_lese_gruppe(intern.diskusjonsgruppe(kan_lese_diskusjonsside.side), kan_lese_diskusjonsside.bruker);
  end if;
  f := intern.diskusjonsomfang(kan_lese_diskusjonsside.side);
  return intern.kan_lese_omfang(case when f is null then 'felles' else 'fagmiljo' end, f, kan_lese_diskusjonsside.bruker);
end;
$$;

-- Moderatorene på en gruppes side er gruppens moderatorer og ansvarlige, og
-- systemarkitektene. Ellers som i P2b.
create or replace function intern.kan_moderere_diskusjonsside(side text, bruker uuid default auth.uid())
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  f uuid;
begin
  if not coalesce(intern.har_aktivt_medlemskap(kan_moderere_diskusjonsside.bruker), false) then
    return false;
  end if;
  if split_part(kan_moderere_diskusjonsside.side, ':', 1) = 'gruppe' then
    return intern.kan_moderere_gruppe(intern.diskusjonsgruppe(kan_moderere_diskusjonsside.side), kan_moderere_diskusjonsside.bruker);
  end if;
  f := intern.diskusjonsomfang(kan_moderere_diskusjonsside.side);
  return coalesce(
    case
      when f is null then intern.er_systemarkitekt(kan_moderere_diskusjonsside.bruker)
      else intern.er_lokal_admin_i(f, kan_moderere_diskusjonsside.bruker)
    end,
    false
  );
end;
$$;

-- Om tråden kan stå på siden: samme gruppe, eller begge utenfor grupper med
-- samme fagmiljø (P2b).
create function intern.samme_diskusjonsrekkevidde(traad public.diskusjoner, side text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if split_part(samme_diskusjonsrekkevidde.side, ':', 1) = 'gruppe' then
    return traad.omfang = 'gruppe' and traad.gruppe_id = intern.diskusjonsgruppe(samme_diskusjonsrekkevidde.side);
  end if;
  return traad.omfang <> 'gruppe'
    and intern.diskusjonsomfang(samme_diskusjonsrekkevidde.side) is not distinct from traad.fagmiljo_id;
end;
$$;

revoke all on function intern.samme_diskusjonsrekkevidde(public.diskusjoner, text) from public, anon, authenticated, service_role;

-- --- Rekkevidden på trådene og kategoriene --------------------------------------

alter table public.diskusjoner add column gruppe_id uuid references public.grupper (id);
alter table public.diskusjonskategorier add column gruppe_id uuid references public.grupper (id);

create index diskusjoner_gruppe_idx on public.diskusjoner (gruppe_id) where gruppe_id is not null;
create index diskusjonskategorier_gruppe_idx on public.diskusjonskategorier (gruppe_id) where gruppe_id is not null;

comment on column public.diskusjoner.gruppe_id is
  'P6: gruppen tråden hører til (rekkevidden gruppe), avledet av siden. Settes av databasen.';
comment on column public.diskusjonskategorier.gruppe_id is
  'P6: gruppen kategorien hører til (rekkevidden gruppe), avledet av siden. Settes av databasen.';

-- Som i P4b, med gruppene først: en gruppes side gir rekkevidden `gruppe`,
-- og en tråd eller kategori kan verken flyttes inn i eller ut av en gruppe.
create or replace function intern.gi_diskusjonsomfang()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  f uuid;
  g uuid;
begin
  -- En side databasen ikke kjenner, stoppes av regelen på kolonnen
  -- (`diskusjoner_side`); den får ingen rekkevidde å lese.
  if not intern.er_diskusjonsside(new.side) then
    new.omfang := 'fagmiljo';
    new.fagmiljo_id := null;
    new.gruppe_id := null;
    return new;
  end if;
  if split_part(new.side, ':', 1) = 'gruppe' then
    g := intern.diskusjonsgruppe(new.side);
    if g is null then
      raise exception 'Gruppen finnes ikke.' using errcode = '23503';
    end if;
    if tg_op = 'UPDATE' and old.omfang is not null and old.gruppe_id is distinct from g then
      raise exception 'En tråd kan bare flyttes til en side med samme rekkevidde.' using errcode = '42501';
    end if;
    new.omfang := 'gruppe';
    new.fagmiljo_id := null;
    new.gruppe_id := g;
    return new;
  end if;
  if tg_op = 'UPDATE' and old.omfang = 'gruppe' then
    raise exception 'En tråd kan bare flyttes til en side med samme rekkevidde.' using errcode = '42501';
  end if;
  new.gruppe_id := null;
  -- P4b: en tråd som blir stående på samme side, beholder rekkevidden den
  -- fikk; rekkevidden til en fortolkningsside følger den innloggedes
  -- arbeidskontekst, som kan være en annen enn den som startet tråden.
  if tg_op = 'UPDATE' and old.omfang is not null and new.side = old.side then
    new.omfang := old.omfang;
    new.fagmiljo_id := old.fagmiljo_id;
    return new;
  end if;
  f := intern.diskusjonsomfang(new.side);
  if tg_op = 'UPDATE' and old.omfang is not null and old.fagmiljo_id is distinct from f then
    raise exception 'En tråd kan bare flyttes til en side med samme rekkevidde.' using errcode = '42501';
  end if;
  new.omfang := case when f is null then 'felles' else 'fagmiljo' end;
  new.fagmiljo_id := f;
  return new;
end;
$$;

alter table public.diskusjoner
  drop constraint diskusjoner_omfang,
  add constraint diskusjoner_omfang check (
    (omfang = 'felles' and fagmiljo_id is null and gruppe_id is null)
    or (omfang = 'fagmiljo' and fagmiljo_id is not null and gruppe_id is null)
    or (omfang = 'gruppe' and fagmiljo_id is null and gruppe_id is not null)
  );

alter table public.diskusjonskategorier
  drop constraint diskusjonskategorier_omfang,
  add constraint diskusjonskategorier_omfang check (
    (omfang = 'felles' and fagmiljo_id is null and gruppe_id is null)
    or (omfang = 'fagmiljo' and fagmiljo_id is not null and gruppe_id is null)
    or (omfang = 'gruppe' and fagmiljo_id is null and gruppe_id is not null)
  );

comment on column public.diskusjoner.omfang is
  'P2b/P6: rekkevidden (felles, fagmiljo, gruppe), avledet av siden. Settes av databasen.';
comment on column public.diskusjonskategorier.omfang is
  'P2b/P6: rekkevidden (felles, fagmiljo, gruppe), avledet av siden. Settes av databasen.';

-- Radsikkerheten: som i P2b, og en gruppes tråder og kategorier for dem som
-- kan lese gruppen. Barnetabellene følger tråden og er uendret.
drop policy rekkevidde on public.diskusjoner;
create policy rekkevidde on public.diskusjoner
as restrictive for all to authenticated
using (
  omfang = 'felles'
  or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[])
  or gruppe_id = any ((select public.mine_lesbare_grupper())::uuid[])
)
with check (
  omfang = 'felles'
  or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[])
  or gruppe_id = any ((select public.mine_lesbare_grupper())::uuid[])
);

drop policy rekkevidde on public.diskusjonskategorier;
create policy rekkevidde on public.diskusjonskategorier
as restrictive for all to authenticated
using (
  omfang = 'felles'
  or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[])
  or gruppe_id = any ((select public.mine_lesbare_grupper())::uuid[])
)
with check (
  omfang = 'felles'
  or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[])
  or gruppe_id = any ((select public.mine_lesbare_grupper())::uuid[])
);

-- --- Funksjonene som leser forbi radsikkerheten: også gruppen ------------------------
--
-- Som i P2b (20261114121000), med `intern.kan_lese_samhandling(fagmiljø,
-- gruppe)` i stedet for `intern.kan_lese_omfang(omfang, fagmiljø)`.

create or replace function intern.lesbar_diskusjon(diskusjon uuid)
returns public.diskusjoner
language sql
volatile
security definer
set search_path = ''
as $$
  select d.* from public.diskusjoner d
  where d.id = lesbar_diskusjon.diskusjon
    and intern.kan_lese_samhandling(d.fagmiljo_id, d.gruppe_id)
  for update
$$;

create or replace function public.diskusjon_er_apen(diskusjon uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select exists (
    select 1 from public.diskusjoner d
    where d.id = diskusjon and d.arkivert_kl is null and intern.kan_lese_samhandling(d.fagmiljo_id, d.gruppe_id)
  )
$$;

create or replace function public.merk_diskusjon_sett(diskusjon uuid, lest_kl timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  insert into public.diskusjonsbesok (bruker_id, diskusjon_id, sett_kl)
  select (select auth.uid()), d.id, least(merk_diskusjon_sett.lest_kl, now())
  from public.diskusjoner d
  where d.id = merk_diskusjon_sett.diskusjon
    and (select auth.uid()) is not null
    and intern.kan_lese_samhandling(d.fagmiljo_id, d.gruppe_id)
  on conflict (bruker_id, diskusjon_id) do update
    set sett_kl = greatest(public.diskusjonsbesok.sett_kl, excluded.sett_kl)
$$;

create or replace function public.endre_diskusjonskategori(kategori uuid, navn text, emoji text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_innlogget();
  update public.diskusjonskategorier k
  set navn = btrim(endre_diskusjonskategori.navn), emoji = btrim(endre_diskusjonskategori.emoji)
  where k.id = endre_diskusjonskategori.kategori and intern.kan_lese_samhandling(k.fagmiljo_id, k.gruppe_id);
  if not found then
    raise exception 'Kategorien finnes ikke lenger.' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.flytt_diskusjonskategori(kategori uuid, indeks integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kategoriside text;
begin
  perform intern.krev_innlogget();
  select k.side into kategoriside
  from public.diskusjonskategorier k
  where k.id = flytt_diskusjonskategori.kategori and intern.kan_lese_samhandling(k.fagmiljo_id, k.gruppe_id)
  for update;
  if kategoriside is null then
    raise exception 'Kategorien finnes ikke lenger.' using errcode = 'P0002';
  end if;
  perform intern.ordne_diskusjonskategorier(kategoriside, flytt_diskusjonskategori.kategori, flytt_diskusjonskategori.indeks);
end;
$$;

create or replace function public.los_opp_diskusjonskategori(kategori uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  kategoriside text;
  forste integer;
begin
  perform intern.krev_innlogget();
  select k.side into kategoriside
  from public.diskusjonskategorier k
  where k.id = los_opp_diskusjonskategori.kategori and intern.kan_lese_samhandling(k.fagmiljo_id, k.gruppe_id)
  for update;
  if kategoriside is null then
    raise exception 'Kategorien finnes ikke lenger.' using errcode = 'P0002';
  end if;
  select coalesce(max(d.posisjon) + 1, 0) into forste
  from public.diskusjoner d
  where d.side = kategoriside and d.kategori_id is null and d.arkivert_kl is null;
  update public.diskusjoner d
  set posisjon = forste + d.posisjon
  where d.kategori_id = los_opp_diskusjonskategori.kategori;
  delete from public.diskusjonskategorier k where k.id = los_opp_diskusjonskategori.kategori;
  perform intern.ordne_diskusjoner(kategoriside, null);
  perform intern.ordne_diskusjonskategorier(kategoriside);
end;
$$;

create or replace function public.sett_diskusjonstekst(diskusjon uuid, tekst jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_innlogget();
  update public.diskusjoner d
  set tekst = sett_diskusjonstekst.tekst, skjult_kl = null, endret_kl = now()
  where d.id = sett_diskusjonstekst.diskusjon
    and d.arkivert_kl is null
    and d.forfatter_id = (select auth.uid())
    and intern.kan_lese_samhandling(d.fagmiljo_id, d.gruppe_id);
  if not found then
    raise exception 'Bare den som skrev tråden, kan endre innlegget, og ikke i en arkivert tråd.' using errcode = '42501';
  end if;
end;
$$;

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
  elsif not exists (
    select 1 from public.diskusjonskategorier k where k.id = valgt and k.side = flytt_diskusjon_til_side.side
  ) then
    raise exception 'Velg en kategori på siden tråden skal flyttes til.' using errcode = '23503';
  end if;

  update public.diskusjoner d
  set side = flytt_diskusjon_til_side.side, kategori_id = valgt
  where d.id = traad.id;
  perform intern.ordne_diskusjoner(flytt_diskusjon_til_side.side, valgt, traad.id, null);
  perform intern.ordne_diskusjoner(traad.side, traad.kategori_id);
end;
$$;

create or replace function intern.krev_moderering(diskusjon uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  traadside text;
  apen boolean;
begin
  perform intern.krev_innlogget();
  select d.side, d.arkivert_kl is null into traadside, apen
  from public.diskusjoner d
  where d.id = krev_moderering.diskusjon and intern.kan_lese_samhandling(d.fagmiljo_id, d.gruppe_id);
  if traadside is null or not intern.kan_moderere_diskusjonsside(traadside) then
    raise exception 'Bare en moderator for siden kan skjule, vise eller fjerne innhold.' using errcode = '42501';
  end if;
  -- En arkivert tråd er frosset til den er hentet tilbake.
  if not apen then
    raise exception 'Tråden er arkivert eller finnes ikke.' using errcode = '42501';
  end if;
end;
$$;

-- Som i P2b: en tråd brukeren ikke kan lese, gir samme svar som en som ikke
-- finnes (null).
create or replace function public.direktelenke(slag text, id uuid, kommentar uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
        and intern.kan_lese_samhandling(d.fagmiljo_id, d.gruppe_id)
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
$$;

-- --- Varslene ----------------------------------------------------------------------

alter table public.varsler
  add column gruppe_id uuid references public.grupper (id),
  add constraint varsler_rekkevidde check (fagmiljo_id is null or gruppe_id is null);

create index varsler_gruppe_idx on public.varsler (gruppe_id) where gruppe_id is not null;

comment on column public.varsler.gruppe_id is
  'P6: gruppen det varselet gjelder, hører til (en tråd i gruppen), eller null. Settes av databasen. Ikke det samme som `gruppe`, som samler uleste varsler.';

drop policy rekkevidde on public.varsler;
create policy rekkevidde on public.varsler
as restrictive for all to authenticated
using (
  (fagmiljo_id is null and gruppe_id is null)
  or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[])
  or gruppe_id = any ((select public.mine_lesbare_grupper())::uuid[])
)
with check (
  (fagmiljo_id is null and gruppe_id is null)
  or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[])
  or gruppe_id = any ((select public.mine_lesbare_grupper())::uuid[])
);

-- Som i P2b, og et varsel om en tråd i en gruppe får gruppen og går bare til
-- dem som kan lese den.
create or replace function intern.varsle(
  mottakere uuid[], kategori public.varselkategori, gruppe text, ide uuid, hendelse jsonb,
  erstatt text default null, diskusjon uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  with omfang as (
    select
      intern.varselomfang(varsle.diskusjon, varsle.hendelse) as f,
      (select d.gruppe_id from public.diskusjoner d where d.id = varsle.diskusjon) as g
  )
  insert into public.varsler as v (mottaker_id, kategori, gruppe, ide_id, diskusjon_id, fagmiljo_id, gruppe_id, hendelser)
  select distinct m, varsle.kategori, varsle.gruppe, varsle.ide, varsle.diskusjon, o.f, o.g, jsonb_build_array(varsle.hendelse)
  from unnest(varsle.mottakere) m, omfang o
  where m is not null
    and intern.kan_lese_samhandling(o.f, o.g, m)
  on conflict (mottaker_id, gruppe) where lest_kl is null do update
    set hendelser = (
        select coalesce(jsonb_agg(h.verdi order by h.nr), '[]'::jsonb)
        from (
          select t.verdi, t.nr
          from jsonb_array_elements(v.hendelser || excluded.hendelser) with ordinality t(verdi, nr)
          where varsle.erstatt is null
            or t.nr = jsonb_array_length(v.hendelser) + 1
            or t.verdi -> varsle.erstatt is distinct from varsle.hendelse -> varsle.erstatt
          order by t.nr desc
          limit 100
        ) h
      ),
      oppdatert_kl = now()
$$;

create or replace function public.mine_varsler()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
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
          and intern.kan_lese_samhandling(v.fagmiljo_id, v.gruppe_id)
        order by v.lest_kl is not null, v.oppdatert_kl desc, v.id
        limit 200
      ) v
      where jsonb_array_length(v.hendelser) > 0
    ), '[]'::jsonb)
  )
$$;

-- --- Profilene ---------------------------------------------------------------------

-- Som i P2c, og medlemmene i gruppene seeren er med i nå: de aktive og de
-- inviterte, så medlemslista i gruppen har navn og bilde.
create or replace function intern.synlige_profiler(seer uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  -- Seg selv.
  select synlige_profiler.seer where synlige_profiler.seer is not null
  union
  -- De aktive medlemmene i fagmiljøene seeren selv er aktivt medlem av.
  select m.bruker_id
  from public.medlemskap m
  where m.status = 'aktiv'
    and m.fagmiljo_id in (select f.id from public.fagmiljoer f where intern.er_medlem_i(f.id, synlige_profiler.seer))
  union
  -- Medlemmene, også de inviterte, i fagmiljøene seeren administrerer: de
  -- samme kontoene administrasjonen kan handle på (`intern.kontoavslag`).
  select m.bruker_id
  from public.medlemskap m
  where m.status <> 'deaktivert'
    and m.fagmiljo_id in (select f.id from public.fagmiljoer f where intern.er_lokal_admin_i(f.id, synlige_profiler.seer))
  union
  -- P6: medlemmene og de inviterte i gruppene seeren er med i nå.
  select gm.bruker_id
  from public.gruppemedlemskap gm
  where gm.status <> 'avsluttet'
    and gm.gruppe_id in (
      select x.gruppe_id from public.gruppemedlemskap x
      where x.bruker_id = synlige_profiler.seer and x.status = 'aktiv'
        and intern.grupperolle(x.gruppe_id, synlige_profiler.seer) is not null
    )
$$;

-- --- Myndigheten i gruppene ---------------------------------------------------------

-- Den ene avgjørelsen om hvem som kan gjøre hva i en gruppe: null når `aktor`
-- kan gjøre `handling` med `mal`, ellers grunnen. Operasjonene stopper med
-- den, og medlemslista viser knappene etter den.
--
--   inviter   invitere `mal` (en konto som kan være med i gruppen)
--   fjern     avslutte medlemskapet eller invitasjonen til en annen
--   rolle     endre rollen til et annet aktivt medlem
--   forlat    forlate gruppen selv, eller avslå invitasjonen
--   endre     endre navnet og beskrivelsen, eller arkivere gruppen
--
-- Den siste ansvarlige i en aktiv gruppe kan verken fjernes, få en annen
-- rolle eller gå. Det stoppes også av regelen på tabellen.
create function intern.gruppeavslag(aktor uuid, g public.grupper, mal uuid, handling text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  rad public.gruppemedlemskap;
  siste_ansvarlige boolean;
begin
  if aktor is null or not intern.har_aktivt_medlemskap(aktor) then
    return 'Bare innloggede med et aktivt medlemskap har tilgang.';
  end if;
  if g.id is null then
    return 'Gruppen finnes ikke, eller du har ikke tilgang til den.';
  end if;

  if mal is not null then
    select * into rad from public.gruppemedlemskap m
    where m.gruppe_id = g.id and m.bruker_id = mal and m.status <> 'avsluttet';
    siste_ansvarlige := rad.status = 'aktiv' and rad.rolle = 'ansvarlig' and g.status = 'aktiv'
      and not exists (
        select 1 from public.gruppemedlemskap m
        where m.gruppe_id = g.id and m.status = 'aktiv' and m.rolle = 'ansvarlig' and m.bruker_id <> mal
      );
  end if;

  if handling = 'forlat' then
    if mal is distinct from aktor or rad.id is null then
      return 'Du er ikke med i gruppen.';
    end if;
    if siste_ansvarlige then
      return 'Du er den siste ansvarlige i gruppen. Gjør en annen til ansvarlig først.';
    end if;
    return null;
  end if;

  if not intern.kan_styre_gruppe(g.id, aktor) then
    if intern.kan_lese_gruppe(g.id, aktor) then
      return 'Bare de ansvarlige i gruppen kan gjøre dette.';
    end if;
    return 'Gruppen finnes ikke, eller du har ikke tilgang til den.';
  end if;
  if g.status <> 'aktiv' then
    return 'Gruppen er arkivert.';
  end if;

  case handling
    when 'endre' then
      return null;
    when 'inviter' then
      if mal is null or mal = aktor or rad.id is not null
        or not intern.kan_vaere_med_i_gruppe(g, mal)
      then
        -- Samme svar for en ukjent konto, en som ikke kan være med, og en som
        -- alt er med eller invitert, så svaret ikke røper noe om kontoen.
        return 'Fant ingen som kan inviteres med det brukernavnet.';
      end if;
      return null;
    when 'fjern' then
      if mal is null or mal = aktor or rad.id is null then
        return 'Brukeren er ikke med i gruppen.';
      end if;
      if siste_ansvarlige then
        return 'Den siste ansvarlige i gruppen kan ikke fjernes. Gjør en annen til ansvarlig først.';
      end if;
      return null;
    when 'rolle' then
      if mal is null or rad.id is null or rad.status <> 'aktiv' then
        return 'Bare aktive medlemmer kan få en annen rolle.';
      end if;
      return null;
    else
      return 'Ukjent handling.';
  end case;
end;
$$;

revoke all on function intern.gruppeavslag(uuid, public.grupper, uuid, text) from public, anon, authenticated, service_role;

-- Gruppen, låst for endring, når den innloggede kan se den (lese den, eller
-- har en invitasjon dit). Ellers samme svar som for en gruppe som ikke finnes.
create function intern.las_gruppe(gruppe uuid, grunn text)
returns public.grupper
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grupper;
begin
  perform intern.krev_aktivt_medlemskap();
  perform set_config('ousfar.tilgangsgrunn', grunn, true);
  select * into g from public.grupper x where x.id = las_gruppe.gruppe for update;
  if g.id is null or not (
    intern.kan_lese_gruppe(g.id)
    or exists (
      select 1 from public.gruppemedlemskap m
      where m.gruppe_id = g.id and m.bruker_id = (select auth.uid()) and m.status = 'invitert'
    )
  ) then
    raise exception 'Gruppen finnes ikke, eller du har ikke tilgang til den.' using errcode = 'P0002';
  end if;
  return g;
end;
$$;

revoke all on function intern.las_gruppe(uuid, text) from public, anon, authenticated, service_role;

create function intern.krev_gruppemyndighet(aktor uuid, g public.grupper, mal uuid, handling text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  avslag text := intern.gruppeavslag(aktor, g, mal, handling);
begin
  if avslag is not null then
    raise exception '%', avslag using errcode = '42501';
  end if;
end;
$$;

revoke all on function intern.krev_gruppemyndighet(uuid, public.grupper, uuid, text) from public, anon, authenticated, service_role;

-- Svaret operasjonene gir på et medlemskap.
create function intern.gruppesvar(gruppe uuid, bruker uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'gruppe', gruppesvar.gruppe,
    'bruker', gruppesvar.bruker,
    'status', coalesce((
      select m.status from public.gruppemedlemskap m
      where m.gruppe_id = gruppesvar.gruppe and m.bruker_id = gruppesvar.bruker and m.status <> 'avsluttet'
    ), 'avsluttet'),
    'rolle', (
      select m.rolle from public.gruppemedlemskap m
      where m.gruppe_id = gruppesvar.gruppe and m.bruker_id = gruppesvar.bruker and m.status <> 'avsluttet'
    )
  )
$$;

revoke all on function intern.gruppesvar(uuid, uuid) from public, anon, authenticated, service_role;

-- --- Operasjonene ---------------------------------------------------------------------
--
-- Hver operasjon krever aktivt medlemskap, låser gruppens rad før kontrollen
-- og gir det samme svaret når den alt er utført, så et kall som ble brutt av
-- nettet, kan sendes igjen.

-- Navnet og beskrivelsen, med feilmeldinger brukeren forstår.
create function intern.krev_gyldig_gruppe(navn text, beskrivelse text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if char_length(btrim(coalesce(krev_gyldig_gruppe.navn, ''))) not between 1 and 80 then
    raise exception 'Gruppen må ha et navn på høyst 80 tegn.' using errcode = '22023';
  end if;
  if char_length(btrim(coalesce(krev_gyldig_gruppe.beskrivelse, ''))) > 1000 then
    raise exception 'Beskrivelsen kan ha høyst 1000 tegn.' using errcode = '22023';
  end if;
end;
$$;

revoke all on function intern.krev_gyldig_gruppe(text, text) from public, anon, authenticated, service_role;

-- Hvem som kan opprette en gruppe i fagmiljøet: en lokal administrator der,
-- eller en systemarkitekt. På tvers av fagmiljøene (`fagmiljo` tom): bare en
-- systemarkitekt. Null når `aktor` kan, ellers grunnen. Operasjonen og
-- valgene i appen bygger på den.
create function intern.gruppeopprettelsesavslag(aktor uuid, fagmiljo uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when aktor is null or not intern.har_aktivt_medlemskap(aktor) then
      'Bare innloggede med et aktivt medlemskap har tilgang.'
    when fagmiljo is null then
      case when intern.er_systemarkitekt(aktor) then null
        else 'Bare systemarkitektene kan opprette grupper på tvers av fagmiljøene.' end
    when exists (select 1 from public.fagmiljoer f where f.id = fagmiljo and f.status = 'aktiv')
      and intern.er_lokal_admin_i(fagmiljo, aktor) then null
    else 'Du kan bare opprette grupper i fagmiljøer du administrerer.'
  end
$$;

revoke all on function intern.gruppeopprettelsesavslag(uuid, uuid) from public, anon, authenticated, service_role;

-- Oppretter en gruppe i fagmiljøet, eller på tvers av fagmiljøene uten
-- fagmiljø (`intern.gruppeopprettelsesavslag`). Den som oppretter, blir
-- ansvarlig.
create function public.opprett_gruppe(navn text, beskrivelse text, fagmiljo uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  avslag text := intern.gruppeopprettelsesavslag(aktor, opprett_gruppe.fagmiljo);
  ny uuid;
begin
  perform intern.krev_aktivt_medlemskap();
  perform set_config('ousfar.tilgangsgrunn', 'Gruppe opprettet', true);
  if avslag is not null then
    raise exception '%', avslag using errcode = '42501';
  end if;
  perform intern.krev_gyldig_gruppe(opprett_gruppe.navn, opprett_gruppe.beskrivelse);

  insert into public.grupper (navn, beskrivelse, art, fagmiljo_id, opprettet_av)
  values (
    btrim(coalesce(opprett_gruppe.navn, '')),
    btrim(coalesce(opprett_gruppe.beskrivelse, '')),
    case when opprett_gruppe.fagmiljo is null then 'tverrfaglig' else 'fagmiljo' end,
    opprett_gruppe.fagmiljo,
    aktor
  )
  returning id into ny;
  insert into public.gruppemedlemskap (gruppe_id, bruker_id, rolle, status, invitert_av, aktiv_fra)
  values (ny, aktor, 'ansvarlig', 'aktiv', aktor, now());
  return ny;
end;
$$;

create function public.endre_gruppe(gruppe uuid, navn text, beskrivelse text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grupper := intern.las_gruppe(endre_gruppe.gruppe, 'Gruppen endret');
begin
  perform intern.krev_gruppemyndighet((select auth.uid()), g, null, 'endre');
  perform intern.krev_gyldig_gruppe(endre_gruppe.navn, endre_gruppe.beskrivelse);
  update public.grupper x
  set navn = btrim(coalesce(endre_gruppe.navn, '')),
      beskrivelse = btrim(coalesce(endre_gruppe.beskrivelse, '')),
      endret_kl = now()
  where x.id = g.id
    and (x.navn, x.beskrivelse) is distinct from (btrim(coalesce(endre_gruppe.navn, '')), btrim(coalesce(endre_gruppe.beskrivelse, '')));
end;
$$;

-- Arkiverer gruppen (de ansvarlige og systemarkitektene) eller åpner den
-- igjen (bare systemarkitektene). Ingen andre enn systemarkitektene leser en
-- arkivert gruppe.
create function public.arkiver_gruppe(gruppe uuid, arkivert boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grupper := intern.las_gruppe(arkiver_gruppe.gruppe, case when arkiver_gruppe.arkivert then 'Gruppen arkivert' else 'Gruppen åpnet igjen' end);
begin
  if (g.status = 'arkivert') = arkiver_gruppe.arkivert then
    return;
  end if;
  if arkiver_gruppe.arkivert then
    perform intern.krev_gruppemyndighet((select auth.uid()), g, null, 'endre');
  elsif not intern.er_systemarkitekt((select auth.uid())) then
    raise exception 'Bare systemarkitektene kan åpne en arkivert gruppe igjen.' using errcode = '42501';
  end if;
  update public.grupper x
  set status = case when arkiver_gruppe.arkivert then 'arkivert' else 'aktiv' end, endret_kl = now()
  where x.id = g.id;
end;
$$;

-- Inviterer en konto, etter brukernavnet. Brukeren må selv godta.
create function public.inviter_til_gruppe(gruppe uuid, brukernavn text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grupper := intern.las_gruppe(inviter_til_gruppe.gruppe, 'Invitert til gruppen');
  bruker uuid;
begin
  select p.id into bruker from public.profiles p
  where p.username = public.brukernavn_normalisert(coalesce(inviter_til_gruppe.brukernavn, ''));
  -- Alt invitert eller med: samme svar som før, uten å endre noe. Bare den
  -- som styrer gruppen, får vite det.
  if bruker is not null and intern.kan_styre_gruppe(g.id) and exists (
    select 1 from public.gruppemedlemskap m
    where m.gruppe_id = g.id and m.bruker_id = bruker and m.status <> 'avsluttet'
  ) then
    return intern.gruppesvar(g.id, bruker);
  end if;
  perform intern.krev_gruppemyndighet((select auth.uid()), g, bruker, 'inviter');
  insert into public.gruppemedlemskap (gruppe_id, bruker_id, rolle, status, invitert_av)
  values (g.id, bruker, 'medlem', 'invitert', (select auth.uid()));
  return intern.gruppesvar(g.id, bruker);
end;
$$;

-- Godtar eller avslår en invitasjon den innloggede har fått. Den som ikke
-- har noen invitasjon, får samme svar om gruppen finnes eller ikke.
create function public.svar_paa_gruppeinvitasjon(gruppe uuid, godta boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  g public.grupper;
  rad public.gruppemedlemskap;
begin
  perform intern.krev_aktivt_medlemskap();
  perform set_config(
    'ousfar.tilgangsgrunn',
    case when svar_paa_gruppeinvitasjon.godta then 'Invitasjonen godtatt' else 'Invitasjonen avslått' end,
    true
  );
  select * into g from public.grupper x where x.id = svar_paa_gruppeinvitasjon.gruppe for update;
  select * into rad from public.gruppemedlemskap m
  where m.gruppe_id = g.id and m.bruker_id = aktor and m.status <> 'avsluttet'
  for update;
  if rad.id is null then
    -- En invitasjon som alt er avslått eller trukket tilbake: avslått igjen.
    if not svar_paa_gruppeinvitasjon.godta
      and exists (select 1 from public.gruppemedlemskap m where m.gruppe_id = g.id and m.bruker_id = aktor)
    then
      return intern.gruppesvar(g.id, aktor);
    end if;
    raise exception 'Du har ingen invitasjon til denne gruppen.' using errcode = '42501';
  end if;
  if rad.status = 'aktiv' then
    if svar_paa_gruppeinvitasjon.godta then
      return intern.gruppesvar(g.id, aktor);
    end if;
    raise exception 'Du er alt med i gruppen. Forlat den i stedet.' using errcode = '42501';
  end if;
  if svar_paa_gruppeinvitasjon.godta then
    if g.status <> 'aktiv' or not intern.kan_vaere_med_i_gruppe(g, aktor) then
      raise exception 'Du kan ikke bli med i denne gruppen nå.' using errcode = '42501';
    end if;
    update public.gruppemedlemskap m set status = 'aktiv', aktiv_fra = now() where m.id = rad.id;
  else
    update public.gruppemedlemskap m set status = 'avsluttet', til = now() where m.id = rad.id;
  end if;
  return intern.gruppesvar(g.id, aktor);
end;
$$;

-- Gir et aktivt medlem en annen rolle.
create function public.sett_grupperolle(gruppe uuid, bruker uuid, rolle text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grupper := intern.las_gruppe(sett_grupperolle.gruppe, 'Rolle i gruppen endret');
begin
  if sett_grupperolle.rolle is null or sett_grupperolle.rolle not in ('medlem', 'moderator', 'ansvarlig') then
    raise exception 'Ukjent rolle.' using errcode = '22023';
  end if;
  perform intern.krev_gruppemyndighet((select auth.uid()), g, sett_grupperolle.bruker, 'rolle');
  if sett_grupperolle.rolle <> 'ansvarlig' and not exists (
    select 1 from public.gruppemedlemskap m
    where m.gruppe_id = g.id and m.status = 'aktiv' and m.rolle = 'ansvarlig' and m.bruker_id <> sett_grupperolle.bruker
  ) then
    raise exception 'Gruppen må ha minst én ansvarlig. Gjør en annen til ansvarlig først.' using errcode = '23514';
  end if;
  update public.gruppemedlemskap m set rolle = sett_grupperolle.rolle
  where m.gruppe_id = g.id and m.bruker_id = sett_grupperolle.bruker and m.status = 'aktiv'
    and m.rolle <> sett_grupperolle.rolle;
  return intern.gruppesvar(g.id, sett_grupperolle.bruker);
end;
$$;

-- Avslutter et medlemskap eller en invitasjon: sitt eget (forlate gruppen),
-- eller en annens (de ansvarlige og systemarkitektene).
create function public.avslutt_gruppemedlemskap(gruppe uuid, bruker uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grupper := intern.las_gruppe(avslutt_gruppemedlemskap.gruppe, 'Medlemskap i gruppen avsluttet');
begin
  if not exists (
    select 1 from public.gruppemedlemskap m
    where m.gruppe_id = g.id and m.bruker_id = avslutt_gruppemedlemskap.bruker and m.status <> 'avsluttet'
  ) and (avslutt_gruppemedlemskap.bruker = (select auth.uid()) or intern.kan_styre_gruppe(g.id)) then
    return intern.gruppesvar(g.id, avslutt_gruppemedlemskap.bruker);
  end if;
  perform intern.krev_gruppemyndighet(
    (select auth.uid()), g, avslutt_gruppemedlemskap.bruker,
    case when avslutt_gruppemedlemskap.bruker = (select auth.uid()) then 'forlat' else 'fjern' end
  );
  update public.gruppemedlemskap m set status = 'avsluttet', til = now()
  where m.gruppe_id = g.id and m.bruker_id = avslutt_gruppemedlemskap.bruker and m.status <> 'avsluttet';
  return intern.gruppesvar(g.id, avslutt_gruppemedlemskap.bruker);
end;
$$;

-- --- Det appen viser -------------------------------------------------------------------

-- En gruppe i svarene til appen.
create function intern.gruppereferanse(g public.grupper)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', g.id,
    'navn', g.navn,
    'beskrivelse', g.beskrivelse,
    'art', g.art,
    'status', g.status,
    'fagmiljo', (select jsonb_build_object('id', f.id, 'navn', f.navn) from public.fagmiljoer f where f.id = g.fagmiljo_id)
  )
$$;

revoke all on function intern.gruppereferanse(public.grupper) from public, anon, authenticated, service_role;

-- Gruppene den innloggede er med i (en systemarkitekt: alle), invitasjonene
-- hen har fått, og hvor hen kan opprette nye.
create function public.mine_grupper()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select jsonb_build_object(
    'grupper', coalesce((
      select jsonb_agg(
          intern.gruppereferanse(g) || jsonb_build_object(
            'rolle', intern.grupperolle(g.id),
            'medlemmer', (
              select count(*) from public.gruppemedlemskap m
              where m.gruppe_id = g.id and m.status = 'aktiv'
            )
          )
          order by g.status, lower(g.navn), g.id
        )
      from public.grupper g
      where g.id = any (public.mine_lesbare_grupper())
    ), '[]'::jsonb),
    'invitasjoner', coalesce((
      select jsonb_agg(jsonb_build_object(
          'gruppe', intern.gruppereferanse(g),
          'invitert_kl', m.fra,
          'invitert_av', (
            select jsonb_build_object('username', p.username, 'first_name', p.first_name, 'last_name', p.last_name)
            from public.profiles p where p.id = m.invitert_av
          )
        ) order by m.fra desc, g.id)
      from public.gruppemedlemskap m
      join public.grupper g on g.id = m.gruppe_id
      where m.bruker_id = (select auth.uid()) and m.status = 'invitert' and g.status = 'aktiv'
    ), '[]'::jsonb),
    'kan_opprette', jsonb_build_object(
      'tverrfaglig', intern.gruppeopprettelsesavslag((select auth.uid()), null) is null,
      'fagmiljoer', coalesce((
        select jsonb_agg(jsonb_build_object('id', f.id, 'navn', f.navn) order by f.navn)
        from public.fagmiljoer f
        where intern.gruppeopprettelsesavslag((select auth.uid()), f.id) is null
      ), '[]'::jsonb)
    )
  )
$$;

-- Én gruppe med medlemmene og invitasjonene, og handlingene den innloggede
-- kan gjøre, avgjort av `intern.gruppeavslag` som operasjonene. Bare for dem
-- som kan lese gruppen. Et grensesnitt, ikke en kontroll: operasjonene
-- kontrollerer på nytt.
create function public.gruppeoversikt(gruppe uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  g public.grupper;
begin
  perform intern.krev_aktivt_medlemskap();
  select * into g from public.grupper x where x.id = gruppeoversikt.gruppe;
  if g.id is null or not intern.kan_lese_gruppe(g.id, aktor) then
    raise exception 'Gruppen finnes ikke, eller du har ikke tilgang til den.' using errcode = 'P0002';
  end if;
  return intern.gruppereferanse(g) || jsonb_build_object(
    'opprettet_kl', g.opprettet_kl,
    'rolle', intern.grupperolle(g.id, aktor),
    'kan_styre', intern.gruppeavslag(aktor, g, null, 'endre') is null,
    'kan_moderere', intern.kan_moderere_gruppe(g.id, aktor),
    'kan_forlate', intern.gruppeavslag(aktor, g, aktor, 'forlat') is null,
    'kan_gjenapne', g.status = 'arkivert' and intern.er_systemarkitekt(aktor),
    'medlemmer', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', p.id,
          'username', p.username,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'avatar_path', p.avatar_path,
          'updated_at', p.updated_at,
          'rolle', m.rolle,
          'status', m.status,
          'fra', m.fra,
          'aktiv_fra', m.aktiv_fra,
          'har_tilgang', m.status = 'aktiv' and intern.grupperolle(g.id, p.id) is not null,
          'kan_fjerne', p.id <> aktor and intern.gruppeavslag(aktor, g, p.id, 'fjern') is null,
          'kan_endre_rolle', intern.gruppeavslag(aktor, g, p.id, 'rolle') is null,
          'siste_ansvarlige', m.status = 'aktiv' and m.rolle = 'ansvarlig' and not exists (
            select 1 from public.gruppemedlemskap o
            where o.gruppe_id = g.id and o.status = 'aktiv' and o.rolle = 'ansvarlig' and o.bruker_id <> p.id
          )
        ) order by m.status, case m.rolle when 'ansvarlig' then 0 when 'moderator' then 1 else 2 end,
          p.first_name, p.last_name, p.username)
      from public.gruppemedlemskap m
      join public.profiles p on p.id = m.bruker_id
      where m.gruppe_id = g.id and m.status <> 'avsluttet'
    ), '[]'::jsonb)
  );
end;
$$;

-- --- Rettighetene ------------------------------------------------------------------------

revoke all on function public.opprett_gruppe(text, text, uuid) from public, anon;
revoke all on function public.endre_gruppe(uuid, text, text) from public, anon;
revoke all on function public.arkiver_gruppe(uuid, boolean) from public, anon;
revoke all on function public.inviter_til_gruppe(uuid, text) from public, anon;
revoke all on function public.svar_paa_gruppeinvitasjon(uuid, boolean) from public, anon;
revoke all on function public.sett_grupperolle(uuid, uuid, text) from public, anon;
revoke all on function public.avslutt_gruppemedlemskap(uuid, uuid) from public, anon;
revoke all on function public.mine_grupper() from public, anon;
revoke all on function public.gruppeoversikt(uuid) from public, anon;

grant execute on function public.opprett_gruppe(text, text, uuid) to authenticated;
grant execute on function public.endre_gruppe(uuid, text, text) to authenticated;
grant execute on function public.arkiver_gruppe(uuid, boolean) to authenticated;
grant execute on function public.inviter_til_gruppe(uuid, text) to authenticated;
grant execute on function public.svar_paa_gruppeinvitasjon(uuid, boolean) to authenticated;
grant execute on function public.sett_grupperolle(uuid, uuid, text) to authenticated;
grant execute on function public.avslutt_gruppemedlemskap(uuid, uuid) to authenticated;
grant execute on function public.mine_grupper() to authenticated;
grant execute on function public.gruppeoversikt(uuid) to authenticated;

comment on function public.opprett_gruppe(text, text, uuid) is
  'P6: oppretter en gruppe i et fagmiljø (lokal administrator der) eller på tvers (systemarkitekt). Se docs/fagmiljoer.md, «Gruppene».';
comment on function public.mine_grupper() is
  'P6: den innloggedes grupper, invitasjoner og hvor nye grupper kan opprettes.';
comment on function public.gruppeoversikt(uuid) is
  'P6: én gruppe med medlemmene og handlingene den innloggede kan gjøre.';
