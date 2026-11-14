-- P2b: samhandlingen og varslene etter fagmiljø.
--
-- Diskusjonene, varslene og direktelenkene skilles etter rekkevidden til
-- innholdet de handler om (docs/ousfar-nasjonal-p0-kartlegging.md §4–5,
-- docs/fagmiljoer.md, «Samhandlingen»):
--
--   1. Hver tråd og kategori får rekkevidden til siden den står på,
--      `intern.diskusjonsomfang(side)`: en fagside og stoffregisteret er
--      felles, fortolkningen av en analytt hører til fagmiljøet som eier
--      fortolkningen (i dag OUS Klinisk farmakologi, som alle
--      fortolkningsobjektene i P4a). Den settes av databasen og kan ikke
--      velges eller endres fra nettleseren, og en tråd kan ikke flyttes til
--      en side med en annen rekkevidde.
--   2. Radsikkerheten gir bare tråder, kategorier, kommentarer, hjerter,
--      besøk og skjulte tekster med en rekkevidde brukeren kan lese
--      (`public.mine_lesbare_fagmiljoer()`, fra P2a). Funksjonene som
--      skriver, kontrollerer det samme, og svarer likt for «finnes ikke» og
--      «ingen tilgang».
--   3. Andres tråder styres (overskrift, flytting, arkiv) av den som startet
--      dem og av en moderator. Moderator er en lokal administrator for
--      sidene til eget fagmiljø og en systemarkitekt overalt (P0 §5.2). Den
--      gamle adminrollen gir ingen moderering lenger (D3).
--   4. Varslene får mottakerlistene filtrert på hvem som kan lese det
--      varselet gjelder, og hvert varsel rekkevidden sin
--      (`varsler.fagmiljo_id`); et varsel om et annet fagmiljøs innhold
--      vises ikke, heller ikke etter at medlemskapet er avsluttet.
--   5. Direktelenken svarer bare om en tråd brukeren kan lese.
--
-- Idéene og de planlagte oppgavene er uendret, bortsett fra at varslene om
-- dem bare går til brukere med aktivt medlemskap: hvem som skal lese og
-- styre dem, venter på beslutningen D8.
--
-- Tilbakeføring: en ny migrasjon som setter funksjonene tilbake til
-- definisjonene i migrasjonene før, fjerner reglene `rekkevidde`, og tar
-- kolonnene `omfang` og `fagmiljo_id` bort fra diskusjonene og varslene.
-- Ingen innhold endres; varslene om fortolkningen får ny gruppenøkkel.

-- --- Rekkevidden til en diskusjonsside -------------------------------------

-- Fagmiljøet siden hører til, eller null når den er felles. Den eneste
-- definisjonen; alt annet kaller denne. En side databasen ikke kjenner
-- formen på, stoppes (deny by default).
create function intern.diskusjonsomfang(side text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  case split_part(diskusjonsomfang.side, ':', 1)
    when 'stoff', 'register' then
      return null;
    when 'fortolkning' then
      -- Alle fortolkningssystemene hører til fagmiljøet P4a ga dem (D1).
      -- Når fortolkningen får nøkler per fagmiljø (P4b), slås fagmiljøet
      -- opp her.
      return intern.opprinnelig_fagmiljo();
    else
      raise exception 'Diskusjonssiden % har ingen regel for rekkevidde (docs/diskusjoner.md).', diskusjonsomfang.side
        using errcode = '55000';
  end case;
end;
$$;

revoke all on function intern.diskusjonsomfang(text) from public, anon, authenticated, service_role;

comment on function intern.diskusjonsomfang(text) is
  'P2b: fagmiljøet en diskusjonsside hører til, eller null for felles. Se docs/diskusjoner.md.';

-- Kan brukeren lese diskusjonene på siden?
create function intern.kan_lese_diskusjonsside(side text, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.kan_lese_omfang(
    case when f is null then 'felles' else 'fagmiljo' end, f, kan_lese_diskusjonsside.bruker
  )
  from (select intern.diskusjonsomfang(kan_lese_diskusjonsside.side) as f) s
$$;

revoke all on function intern.kan_lese_diskusjonsside(text, uuid) from public, anon, authenticated, service_role;

-- Kan brukeren moderere diskusjonene på siden? En lokal administrator på
-- sidene til eget fagmiljø, en systemarkitekt overalt.
create function intern.kan_moderere_diskusjonsside(side text, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    intern.har_aktivt_medlemskap(kan_moderere_diskusjonsside.bruker)
    and case
      when f is null then intern.er_systemarkitekt(kan_moderere_diskusjonsside.bruker)
      else intern.er_lokal_admin_i(f, kan_moderere_diskusjonsside.bruker)
    end,
    false
  )
  from (select intern.diskusjonsomfang(kan_moderere_diskusjonsside.side) as f) s
$$;

revoke all on function intern.kan_moderere_diskusjonsside(text, uuid) from public, anon, authenticated, service_role;

-- Den innloggedes eget svar, til appens knapper og radsikkerheten for de
-- skjulte tekstene. Svarer nei uten aktivt medlemskap.
create function public.kan_moderere_diskusjoner(side text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    intern.har_aktivt_medlemskap((select auth.uid()))
    and intern.er_diskusjonsside(kan_moderere_diskusjoner.side)
    and intern.kan_moderere_diskusjonsside(kan_moderere_diskusjoner.side, (select auth.uid())),
    false
  )
$$;

revoke all on function public.kan_moderere_diskusjoner(text) from public, anon;
grant execute on function public.kan_moderere_diskusjoner(text) to authenticated;

comment on function public.kan_moderere_diskusjoner(text) is
  'P2b: om den innloggede kan moderere diskusjonene på siden (lokal administrator for eget fagmiljø, systemarkitekt overalt).';

-- --- Rekkevidden på trådene og kategoriene ---------------------------------

alter table public.diskusjoner
  add column omfang text,
  add column fagmiljo_id uuid references public.fagmiljoer (id);

alter table public.diskusjonskategorier
  add column omfang text,
  add column fagmiljo_id uuid references public.fagmiljoer (id);

-- Setter rekkevidden fra siden ved hver innsetting og endring, så den aldri
-- kan avvike fra siden. Endres siden til en med en annen rekkevidde, stoppes
-- det: en tråd eller kategori kan ikke flyttes ut av sin rekkevidde.
create function intern.gi_diskusjonsomfang()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  f uuid;
begin
  -- En side databasen ikke kjenner, stoppes av regelen på kolonnen
  -- (`diskusjoner_side`); den får ingen rekkevidde å lese.
  if not intern.er_diskusjonsside(new.side) then
    new.omfang := 'fagmiljo';
    new.fagmiljo_id := null;
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

revoke all on function intern.gi_diskusjonsomfang() from public, anon, authenticated, service_role;

create trigger diskusjoner_omfang
before insert or update on public.diskusjoner
for each row execute function intern.gi_diskusjonsomfang();

create trigger diskusjonskategorier_omfang
before insert or update on public.diskusjonskategorier
for each row execute function intern.gi_diskusjonsomfang();

-- Tilbakefyllingen: utløseren setter rekkevidden.
update public.diskusjoner set side = side;
update public.diskusjonskategorier set side = side;

alter table public.diskusjoner
  alter column omfang set not null,
  add constraint diskusjoner_omfang check (
    (omfang = 'felles' and fagmiljo_id is null) or (omfang = 'fagmiljo' and fagmiljo_id is not null)
  );

alter table public.diskusjonskategorier
  alter column omfang set not null,
  add constraint diskusjonskategorier_omfang check (
    (omfang = 'felles' and fagmiljo_id is null) or (omfang = 'fagmiljo' and fagmiljo_id is not null)
  );

create index diskusjoner_fagmiljo_idx on public.diskusjoner (fagmiljo_id) where fagmiljo_id is not null;
create index diskusjonskategorier_fagmiljo_idx on public.diskusjonskategorier (fagmiljo_id) where fagmiljo_id is not null;

comment on column public.diskusjoner.omfang is
  'P2b: rekkevidden, avledet av siden (intern.diskusjonsomfang). Settes av databasen.';
comment on column public.diskusjonskategorier.omfang is
  'P2b: rekkevidden, avledet av siden (intern.diskusjonsomfang). Settes av databasen.';

-- Tråden når den innloggede kan lese den, ellers ingen rad: «finnes ikke» og
-- «ingen tilgang» er det samme svaret. Låses for endring.
create function intern.lesbar_diskusjon(diskusjon uuid)
returns public.diskusjoner
language sql
volatile
security definer
set search_path = ''
as $$
  select d.* from public.diskusjoner d
  where d.id = lesbar_diskusjon.diskusjon
    and intern.kan_lese_omfang(d.omfang, d.fagmiljo_id)
  for update
$$;

revoke all on function intern.lesbar_diskusjon(uuid) from public, anon, authenticated, service_role;

-- Kan den innloggede styre tråden (overskrift, flytting, arkiv)? Den som
-- startet den, og en moderator.
create function intern.kan_styre_diskusjon(traad public.diskusjoner)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    traad.forfatter_id = (select auth.uid()) or intern.kan_moderere_diskusjonsside(traad.side),
    false
  )
$$;

revoke all on function intern.kan_styre_diskusjon(public.diskusjoner) from public, anon, authenticated, service_role;

-- --- Radsikkerheten ----------------------------------------------------------

-- Begrensende regler, i tillegg til de tillatende som står. Lista over
-- fagmiljøer regnes ut én gang per spørring.
create policy rekkevidde on public.diskusjoner
as restrictive for all to authenticated
using (omfang = 'felles' or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[]))
with check (omfang = 'felles' or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[]));

create policy rekkevidde on public.diskusjonskategorier
as restrictive for all to authenticated
using (omfang = 'felles' or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[]))
with check (omfang = 'felles' or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[]));

-- Det som hører til en tråd, følger trådens regel: underspørringen mot
-- `diskusjoner` kjøres med radsikkerheten over.
create policy rekkevidde on public.diskusjonskommentarer
as restrictive for all to authenticated
using (exists (select 1 from public.diskusjoner d where d.id = diskusjon_id))
with check (exists (select 1 from public.diskusjoner d where d.id = diskusjon_id));

create policy rekkevidde on public.diskusjonshjerter
as restrictive for all to authenticated
using (exists (select 1 from public.diskusjoner d where d.id = diskusjon_id))
with check (exists (select 1 from public.diskusjoner d where d.id = diskusjon_id));

create policy rekkevidde on public.diskusjonsbesok
as restrictive for all to authenticated
using (exists (select 1 from public.diskusjoner d where d.id = diskusjon_id))
with check (exists (select 1 from public.diskusjoner d where d.id = diskusjon_id));

create policy rekkevidde on public.diskusjon_skjulte_tekster
as restrictive for all to authenticated
using (exists (select 1 from public.diskusjoner d where d.id = diskusjon_id))
with check (exists (select 1 from public.diskusjoner d where d.id = diskusjon_id));

-- De skjulte tekstene leses av dem som kan moderere tråden, ikke av alle med
-- den gamle adminrollen.
drop policy "Administratorene ser skjulte tekster" on public.diskusjon_skjulte_tekster;

create policy "Moderatorene ser skjulte tekster" on public.diskusjon_skjulte_tekster
for select to authenticated
using (public.kan_moderere_diskusjoner((select d.side from public.diskusjoner d where d.id = diskusjon_id)));

-- --- Funksjonene som leser forbi radsikkerheten --------------------------------

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
    where d.id = diskusjon and d.arkivert_kl is null and intern.kan_lese_omfang(d.omfang, d.fagmiljo_id)
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
    and intern.kan_lese_omfang(d.omfang, d.fagmiljo_id)
  on conflict (bruker_id, diskusjon_id) do update
    set sett_kl = greatest(public.diskusjonsbesok.sett_kl, excluded.sett_kl)
$$;

-- --- Kategoriene: alle som kan lese siden ------------------------------------

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
    coalesce((select max(k.posisjon) + 1 from public.diskusjonskategorier k where k.side = opprett_diskusjonskategori.side), 0),
    (select auth.uid())
  )
  returning id into ny;
  return ny;
end;
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
  where k.id = endre_diskusjonskategori.kategori and intern.kan_lese_omfang(k.omfang, k.fagmiljo_id);
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
  where k.id = flytt_diskusjonskategori.kategori and intern.kan_lese_omfang(k.omfang, k.fagmiljo_id)
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
  where k.id = los_opp_diskusjonskategori.kategori and intern.kan_lese_omfang(k.omfang, k.fagmiljo_id)
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

-- --- Trådene ---------------------------------------------------------------

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
  elsif not exists (
    select 1 from public.diskusjonskategorier k where k.id = valgt and k.side = opprett_diskusjon.side
  ) then
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

create or replace function public.sett_diskusjonstittel(diskusjon uuid, tittel text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  traad public.diskusjoner;
begin
  perform intern.krev_innlogget();
  traad := intern.lesbar_diskusjon(sett_diskusjonstittel.diskusjon);
  if traad.id is null or traad.arkivert_kl is not null then
    raise exception 'Tråden er arkivert eller finnes ikke.' using errcode = '42501';
  end if;
  if not intern.kan_styre_diskusjon(traad) then
    raise exception 'Bare den som startet tråden, eller en moderator, kan endre overskriften.' using errcode = '42501';
  end if;
  update public.diskusjoner d
  set tittel = btrim(sett_diskusjonstittel.tittel)
  where d.id = traad.id and d.tittel is distinct from btrim(sett_diskusjonstittel.tittel);
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
    and intern.kan_lese_omfang(d.omfang, d.fagmiljo_id);
  if not found then
    raise exception 'Bare den som skrev tråden, kan endre innlegget, og ikke i en arkivert tråd.' using errcode = '42501';
  end if;
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
  if not exists (
    select 1 from public.diskusjonskategorier k where k.id = flytt_diskusjon.kategori and k.side = traad.side
  ) then
    raise exception 'Tråden kan bare flyttes til en kategori på samme side.' using errcode = '23503';
  end if;
  update public.diskusjoner d set kategori_id = flytt_diskusjon.kategori where d.id = traad.id;
  perform intern.ordne_diskusjoner(traad.side, flytt_diskusjon.kategori, traad.id, flytt_diskusjon.indeks);
  if traad.kategori_id is distinct from flytt_diskusjon.kategori then
    perform intern.ordne_diskusjoner(traad.side, traad.kategori_id);
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
    perform intern.ordne_diskusjoner(traad.side, traad.kategori_id);
  else
    update public.diskusjoner d set arkivert_kl = null where d.id = traad.id;
    perform intern.ordne_diskusjoner(traad.side, traad.kategori_id, traad.id, null);
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
  if not intern.kan_moderere_diskusjonsside(traad.side) and not coalesce(
    traad.forfatter_id = bruker
    and traad.arkivert_kl is null
    and intern.diskusjon_bare_egne(traad.id, bruker),
    false
  ) then
    raise exception 'Du kan bare slette en tråd du har startet selv, før andre har skrevet i den.' using errcode = '42501';
  end if;
  delete from public.diskusjoner d where d.id = traad.id;
  if traad.arkivert_kl is null then
    perform intern.ordne_diskusjoner(traad.side, traad.kategori_id);
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
    or intern.diskusjonsomfang(flytt_diskusjon_til_side.side) is distinct from traad.fagmiljo_id
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

-- --- Modereringen ------------------------------------------------------------

-- Felles for de tre: moderator på trådens side, og tråden åpen.
create function intern.krev_moderering(diskusjon uuid)
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
  where d.id = krev_moderering.diskusjon and intern.kan_lese_omfang(d.omfang, d.fagmiljo_id);
  if traadside is null or not intern.kan_moderere_diskusjonsside(traadside) then
    raise exception 'Bare en moderator for siden kan skjule, vise eller fjerne innhold.' using errcode = '42501';
  end if;
  -- En arkivert tråd er frosset til den er hentet tilbake.
  if not apen then
    raise exception 'Tråden er arkivert eller finnes ikke.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function intern.krev_moderering(uuid) from public, anon, authenticated, service_role;

create or replace function public.skjul_i_diskusjon(diskusjon uuid, kommentar uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  lagret jsonb;
begin
  perform intern.krev_moderering(skjul_i_diskusjon.diskusjon);
  if skjul_i_diskusjon.kommentar is null then
    select d.tekst into lagret
    from public.diskusjoner d
    where d.id = skjul_i_diskusjon.diskusjon and d.tekst is not null
    for update;
  else
    select k.tekst into lagret
    from public.diskusjonskommentarer k
    where k.id = skjul_i_diskusjon.kommentar
      and k.diskusjon_id = skjul_i_diskusjon.diskusjon
      and not k.slettet
      and k.skjult_kl is null
    for update;
  end if;
  if lagret is null then
    return;
  end if;

  delete from public.diskusjon_skjulte_tekster s
  where s.diskusjon_id = skjul_i_diskusjon.diskusjon
    and s.kommentar_id is not distinct from skjul_i_diskusjon.kommentar;
  insert into public.diskusjon_skjulte_tekster (diskusjon_id, kommentar_id, tekst)
  values (skjul_i_diskusjon.diskusjon, skjul_i_diskusjon.kommentar, lagret);

  if skjul_i_diskusjon.kommentar is null then
    update public.diskusjoner d
    set tekst = null, skjult_kl = now()
    where d.id = skjul_i_diskusjon.diskusjon;
  else
    update public.diskusjonskommentarer k
    set tekst = null, skjult_kl = now()
    where k.id = skjul_i_diskusjon.kommentar;
  end if;
end;
$$;

create or replace function public.vis_i_diskusjon(diskusjon uuid, kommentar uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  lagret jsonb;
begin
  perform intern.krev_moderering(vis_i_diskusjon.diskusjon);
  select s.tekst into lagret
  from public.diskusjon_skjulte_tekster s
  where s.diskusjon_id = vis_i_diskusjon.diskusjon
    and s.kommentar_id is not distinct from vis_i_diskusjon.kommentar;
  if lagret is null then
    raise exception 'Teksten er fjernet for godt og kan ikke vises igjen.' using errcode = 'P0002';
  end if;

  if vis_i_diskusjon.kommentar is null then
    update public.diskusjoner d
    set tekst = lagret, skjult_kl = null
    where d.id = vis_i_diskusjon.diskusjon and d.skjult_kl is not null;
  else
    update public.diskusjonskommentarer k
    set tekst = lagret, skjult_kl = null
    where k.id = vis_i_diskusjon.kommentar
      and k.diskusjon_id = vis_i_diskusjon.diskusjon
      and k.skjult_kl is not null
      and not k.slettet;
  end if;
end;
$$;

create or replace function public.fjern_skjult_i_diskusjon(diskusjon uuid, kommentar uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_moderering(fjern_skjult_i_diskusjon.diskusjon);
  delete from public.diskusjon_skjulte_tekster s
  where s.diskusjon_id = fjern_skjult_i_diskusjon.diskusjon
    and s.kommentar_id is not distinct from fjern_skjult_i_diskusjon.kommentar;
end;
$$;

-- --- Det appen trenger for knappene ---------------------------------------------

-- Oversikten og tråden sier om den innloggede kan moderere siden; appen
-- regner ut resten (den som startet tråden, styrer den). Ellers som før.
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
    'kan_moderere', public.kan_moderere_diskusjoner(d.side),
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

-- --- Direktelenken -------------------------------------------------------------

-- Som før, men en tråd brukeren ikke kan lese, gir samme svar som en som ikke
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
        and intern.kan_lese_omfang(d.omfang, d.fagmiljo_id)
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

-- --- Varslene ------------------------------------------------------------------

-- Rekkevidden til det et varsel gjelder: tråden, fortolkningsobjektet eller
-- fagsiden i hendelsen. Null er felles (idéene, favorittene, nye tråder på en
-- fagside). Et objekt uten rekkevidde stoppes, så et varsel aldri blir felles
-- ved en feil.
create function intern.varselomfang(diskusjon uuid, hendelse jsonb)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if varselomfang.diskusjon is not null then
    return (select d.fagmiljo_id from public.diskusjoner d where d.id = varselomfang.diskusjon);
  end if;
  if varselomfang.hendelse ? 'objekt' or varselomfang.hendelse ? 'side' then
    select o.omfang, o.fagmiljo_id into r
    from public.ressursomfang o
    where o.objekt_id = coalesce(varselomfang.hendelse ->> 'objekt', varselomfang.hendelse ->> 'side')::uuid;
    if r.omfang = 'felles' then
      return null;
    elsif r.omfang = 'fagmiljo' then
      return r.fagmiljo_id;
    end if;
    raise exception 'Varselet gjelder et objekt uten rekkevidde for varsler.' using errcode = '55000';
  end if;
  return null;
end;
$$;

revoke all on function intern.varselomfang(uuid, jsonb) from public, anon, authenticated, service_role;

alter table public.varsler add column fagmiljo_id uuid references public.fagmiljoer (id);

comment on column public.varsler.fagmiljo_id is
  'P2b: fagmiljøet det varselet gjelder, hører til, eller null for felles (intern.varselomfang). Settes av databasen.';

-- Tilbakefyllingen, uten å stoppe på varsler om objekter som er slettet
-- siden: et varsel om en tråd får trådens rekkevidde, et om fortolkningen
-- rekkevidden til objektene som finnes (alle må ha samme, ellers stopper
-- underspørringen med flere rader), eller, når ingen av dem finnes lenger,
-- fagmiljøet alle fortolkningsobjektene fikk i P4a. Resten er felles
-- (idéene, og favorittene, som gjelder fagsider). Varslene om fortolkningen
-- får gruppen per fagmiljø, så hendelser fra to fagmiljøer aldri samles i
-- samme varsel.
update public.varsler v
set fagmiljo_id = d.fagmiljo_id
from public.diskusjoner d
where d.id = v.diskusjon_id;

update public.varsler v
set fagmiljo_id = coalesce((
    select distinct r.fagmiljo_id
    from jsonb_array_elements(v.hendelser) h
    join public.ressursomfang r on r.objekt_id = (h ->> 'objekt')::uuid
  ), intern.opprinnelig_fagmiljo())
where v.kategori = 'fortolkning';

update public.varsler v
set gruppe = 'fortolkning:' || coalesce(v.fagmiljo_id::text, 'felles')
where v.kategori = 'fortolkning' and v.gruppe = 'fortolkning';

do $$
begin
  if exists (select 1 from public.varsler v where v.kategori = 'fortolkning' and v.gruppe not like 'fortolkning:%') then
    raise exception 'Tilbakefyllingen av varslene: et varsel om fortolkningen mangler gruppen per fagmiljø.'
      using errcode = '23514';
  end if;
  raise log 'P2b: varsler med fagmiljø %, felles %',
    (select count(*) from public.varsler where fagmiljo_id is not null),
    (select count(*) from public.varsler where fagmiljo_id is null);
end;
$$;

create index varsler_fagmiljo_idx on public.varsler (fagmiljo_id) where fagmiljo_id is not null;

create policy rekkevidde on public.varsler
as restrictive for all to authenticated
using (fagmiljo_id is null or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[]))
with check (fagmiljo_id is null or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[]));

-- Lager varslene. Mottakerne er bare de som kan lese det varselet gjelder:
-- et aktivt medlemskap for felles innhold, medlemskap i fagmiljøet for
-- lokalt. Uendret ellers.
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
    select intern.varselomfang(varsle.diskusjon, varsle.hendelse) as f
  )
  insert into public.varsler as v (mottaker_id, kategori, gruppe, ide_id, diskusjon_id, fagmiljo_id, hendelser)
  select distinct m, varsle.kategori, varsle.gruppe, varsle.ide, varsle.diskusjon, o.f, jsonb_build_array(varsle.hendelse)
  from unnest(varsle.mottakere) m, omfang o
  where m is not null
    and intern.kan_lese_omfang(case when o.f is null then 'felles' else 'fagmiljo' end, o.f, m)
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

-- Fortolkningen: ett varsel per fagmiljø, til dem som kan lese objektet.
create or replace function intern.varsle_publisering()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hendelse jsonb;
begin
  if intern.er_fortolkning((select o.type from public.redigerbare_objekter o where o.id = new.objekt_id)) then
    hendelse := jsonb_build_object('kl', new.utfort_kl, 'av', new.utfort_av, 'objekt', new.objekt_id);
    perform intern.varsle(
      array(select p.id from public.profiles p where p.id <> new.utfort_av),
      'fortolkning',
      'fortolkning:' || coalesce(intern.varselomfang(null, hendelse)::text, 'felles'),
      null,
      hendelse,
      'objekt'
    );
  end if;
  return null;
end;
$$;

-- Det appen leser: bare varslene med en rekkevidde den innloggede kan lese
-- nå. Ellers som før.
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
          and intern.kan_lese_omfang(case when v.fagmiljo_id is null then 'felles' else 'fagmiljo' end, v.fagmiljo_id)
        order by v.lest_kl is not null, v.oppdatert_kl desc, v.id
        limit 200
      ) v
      where jsonb_array_length(v.hendelser) > 0
    ), '[]'::jsonb)
  )
$$;
