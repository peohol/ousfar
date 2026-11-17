-- P7 tråd A: gruppechatten i databasen (docs/gruppechat.md, «Modellen»,
-- «Funksjonene», «Lagringstiden»). Bygger på grunnmuren (20261117125500).
--
--  * Hver gruppe har ett chatrom. Meldingene står i `gruppemeldinger` med et
--    løpenummer (`nr`) per gruppe og gruppens endringsteller (`endring`), og
--    `gruppechatter` har én rad per gruppe: låsen alle skrivingene tar, og
--    dørklokken sanntiden lytter på (tråd C legger den i publikasjonen). Den
--    har ingen tekst og ingen avsender.
--  * Tilgangen er den samme som for resten av gruppen: lese er
--    `intern.kan_lese_gruppe`, skrive `intern.kan_bidra_i_gruppe`, slette
--    andres `intern.kan_moderere_gruppe`. Den regnes ut på nytt ved hvert kall,
--    så den som fjernes fra gruppen eller fagmiljøet, mister alt med en gang.
--    En arkivert gruppe tar ikke imot nye meldinger eller endringer, heller
--    ikke fra systemarkitektene; de kan bare slette (for å fjerne noe som
--    ikke hører hjemme der, som pasientopplysninger).
--  * Nettleseren når ingenting i `gruppemeldinger` og `gruppechat_lest`;
--    alt går gjennom funksjonene. `gruppechatter` kan leses av den som leser
--    gruppen, og bare når chatten er slått på (`mine_lesbare_gruppechatter`).
--  * Chatten er avslått til Peder har godkjent aktiveringen
--    (`intern.gruppechat_aktivert()`); da svarer alle funksjonene 42501.
--  * Meldingsteksten skrives aldri i tilgangsloggen, i feilmeldinger eller
--    i varsler. Tabellene har ingen loggutløser.
--  * Lagringstiden er 12 måneder (Peder 17.11.2026, beslutningskort i
--    P7-tråden): en melding eldre enn det leses aldri ut, og raden slettes
--    i gruppen ved sending og lesing, under gruppens lås, eller for alle
--    grupper med `intern.rydd_gruppechat()`. Det er den eneste slettingen
--    her, og den gjelder bare meldinger i den nye tabellen.
--
-- Ingen eksisterende data endres.
--
-- Tilbakeføring: en ny migrasjon som setter `intern.gruppesamhandling`
-- tilbake til definisjonen i 20261117040100 og fjerner funksjonene herfra.
-- Tabellene kan stå; uten funksjonene leses ingenting i dem.

-- --- Tabellene ------------------------------------------------------------------

create table public.gruppechatter (
  gruppe_id uuid primary key references public.grupper (id),
  -- Det høyeste løpenummeret som er gitt i gruppen.
  siste_nr bigint not null default 0,
  -- Gruppens endringsteller: økes med én ved hver ny melding, endring og sletting.
  siste_endring bigint not null default 0,
  endret_kl timestamptz not null default now(),
  constraint gruppechatter_tellere check (siste_nr >= 0 and siste_endring >= siste_nr)
);

comment on table public.gruppechatter is
  'P7: én rad per gruppe med chat: låsen skrivingene tar, og dørklokken sanntiden lytter på. Ingen tekst. Se docs/gruppechat.md.';

create table public.gruppemeldinger (
  id uuid primary key default gen_random_uuid(),
  gruppe_id uuid not null references public.gruppechatter (gruppe_id),
  nr bigint not null,
  forfatter_id uuid references public.profiles (id) on delete set null,
  -- Fra nettleseren: samme ID på nytt gir den samme meldingen.
  klient_id uuid not null,
  -- Null når meldingen er slettet.
  tekst text,
  skrevet_kl timestamptz not null default now(),
  redigert_kl timestamptz,
  slettet_kl timestamptz,
  slettet_av uuid references public.profiles (id) on delete set null,
  -- Om det var forfatteren selv eller en moderator, også når kontoen senere slettes.
  slettet_som text,
  endring bigint not null,
  constraint gruppemeldinger_nr check (nr >= 1 and endring >= nr),
  constraint gruppemeldinger_tekst check (
    (slettet_kl is null) = (tekst is not null)
    and (tekst is null or char_length(tekst) between 1 and 4000)
  ),
  constraint gruppemeldinger_slettet check (
    (slettet_kl is null) = (slettet_som is null) and (slettet_som is null or slettet_som in ('forfatter', 'moderator'))
  ),
  constraint gruppemeldinger_nr_unik unique (gruppe_id, nr)
);

comment on table public.gruppemeldinger is
  'P7: meldingene i gruppechatten. Leses og skrives bare gjennom funksjonene. Slettes automatisk etter 12 måneder (Peder 17.11.2026). Se docs/gruppechat.md.';

-- Endringene siden et tidspunkt (`gruppechat_endringer`).
create index gruppemeldinger_endring_idx on public.gruppemeldinger (gruppe_id, endring);
-- Dobbeltinnsending gir den samme meldingen.
create unique index gruppemeldinger_klient_idx on public.gruppemeldinger (gruppe_id, forfatter_id, klient_id);
-- Takten: de nye meldingene til én bruker i én gruppe.
create index gruppemeldinger_takt_idx on public.gruppemeldinger (gruppe_id, forfatter_id, skrevet_kl);
-- Lagringstiden.
create index gruppemeldinger_skrevet_idx on public.gruppemeldinger (skrevet_kl);
-- Fremmednøklene til profilene, så sletting av en konto ikke leser hele tabellen.
create index gruppemeldinger_forfatter_idx on public.gruppemeldinger (forfatter_id) where forfatter_id is not null;
create index gruppemeldinger_slettet_av_idx on public.gruppemeldinger (slettet_av) where slettet_av is not null;

create table public.gruppechat_lest (
  gruppe_id uuid not null references public.gruppechatter (gruppe_id),
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  lest_til_nr bigint not null default 0,
  primary key (gruppe_id, bruker_id),
  constraint gruppechat_lest_nr check (lest_til_nr >= 0)
);

comment on table public.gruppechat_lest is
  'P7: hvor langt hver bruker har lest i chatten, til tallet på uleste og varslene. Bare gjennom funksjonene.';

create index gruppechat_lest_bruker_idx on public.gruppechat_lest (bruker_id);

alter table public.gruppechatter enable row level security;
alter table public.gruppemeldinger enable row level security;
alter table public.gruppechat_lest enable row level security;

-- Nettleseren leser og skriver meldingene og lesingen bare gjennom
-- funksjonene; chatradene kan den lese (under).
revoke all on public.gruppechatter, public.gruppemeldinger, public.gruppechat_lest from anon, authenticated;

-- --- Grensene og bryteren -------------------------------------------------------

-- Grensene databasen håndhever, og som `les_gruppechat` gir appen
-- (`GRUPPECHAT_GRENSER` i src/gruppechat/modell.ts står likt).
create function intern.gruppechat_grenser()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object('maks_tegn', 4000, 'maks_per_minutt', 20)
$$;

revoke all on function intern.gruppechat_grenser() from public, anon, authenticated, service_role;

-- Hvor lenge en melding står: 12 måneder (Peder 17.11.2026).
create function intern.gruppechat_lagringstid()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '12 months'
$$;

revoke all on function intern.gruppechat_lagringstid() from public, anon, authenticated, service_role;

comment on function intern.gruppechat_lagringstid() is
  'P7: meldinger eldre enn dette slettes helt (Peder 17.11.2026, beslutningskort). Se docs/gruppechat.md, «Lagringstiden».';

-- Gruppene den innloggede kan lese chatten i: de samme som gruppene
-- (`mine_lesbare_grupper`), og ingen mens chatten er avslått. Brukes av
-- radsikkerheten på `gruppechatter`, og dermed av sanntiden, for hver hendelse.
create function public.mine_lesbare_gruppechatter()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select auth.uid()) is null
      or not intern.har_aktivt_medlemskap((select auth.uid()))
      or not intern.gruppechat_aktivert()
    then '{}'::uuid[]
    else public.mine_lesbare_grupper()
  end
$$;

revoke all on function public.mine_lesbare_gruppechatter() from public, anon, authenticated, service_role;
grant execute on function public.mine_lesbare_gruppechatter() to authenticated;

comment on function public.mine_lesbare_gruppechatter() is
  'P7: gruppene den innloggede kan lese chatten i; tom mens chatten er avslått. Brukes av radsikkerheten. Se docs/gruppechat.md.';

grant select on public.gruppechatter to authenticated;

create policy "Den som leser gruppen, ser chatraden" on public.gruppechatter
for select
to authenticated
using (gruppe_id = any ((select public.mine_lesbare_gruppechatter())::uuid[]));

-- Som på de andre tabellene nettleseren når (P2.0, 20261114103000).
create policy aktivt_medlemskap on public.gruppechatter as restrictive for all to authenticated
using ((select public.har_aktivt_medlemskap()))
with check ((select public.har_aktivt_medlemskap()));

-- --- Tilgangen --------------------------------------------------------------------

-- Krever at chatten er slått på og at den innloggede leser gruppen nå. Det
-- samme svaret for en gruppe som ikke finnes og en den innloggede ikke leser.
create function intern.krev_gruppechat(gruppe uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  if not intern.gruppechat_aktivert() then
    raise exception 'Gruppechatten er ikke slått på.' using errcode = '42501';
  end if;
  if krev_gruppechat.gruppe is null or not intern.kan_lese_gruppe(krev_gruppechat.gruppe) then
    raise exception 'Gruppen finnes ikke, eller du har ikke tilgang til den.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function intern.krev_gruppechat(uuid) from public, anon, authenticated, service_role;

-- Sletter meldingene i gruppen som er eldre enn lagringstiden. Kalles med
-- gruppens chatrad låst. `siste_nr` og `siste_endring` står.
create function intern.slett_utgatte_gruppemeldinger(gruppe uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.gruppemeldinger m
  where m.gruppe_id = slett_utgatte_gruppemeldinger.gruppe
    and m.skrevet_kl < now() - intern.gruppechat_lagringstid()
$$;

revoke all on function intern.slett_utgatte_gruppemeldinger(uuid) from public, anon, authenticated, service_role;

-- Om den innloggede kan slette andres meldinger i gruppen nå: en moderator
-- eller ansvarlig i en aktiv gruppe, eller en systemarkitekt, også i en
-- arkivert gruppe, så noe som ikke hører hjemme der (som pasientopplysninger),
-- kan fjernes uten å åpne gruppen igjen.
create function intern.kan_moderere_gruppechat(gruppe uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.kan_moderere_gruppe(kan_moderere_gruppechat.gruppe)
    and (intern.kan_bidra_i_gruppe(kan_moderere_gruppechat.gruppe) or intern.er_systemarkitekt((select auth.uid())))
$$;

revoke all on function intern.kan_moderere_gruppechat(uuid) from public, anon, authenticated, service_role;

-- Gruppens chatrad, låst for endring, og laget når den ikke finnes. Gruppens
-- rad tas først med en delt lås, som for idéene og oppgavene (P6b), så
-- skrivingen venter på en samtidig endring av medlemmene eller arkiveringen,
-- og tilgangen leses etter at den er ferdig. I en arkivert gruppe kan ingen
-- skrive, men en systemarkitekt kan slette (`sletting`). Rydder de utgåtte
-- meldingene i gruppen.
create function intern.las_gruppechat(gruppe uuid, sletting boolean default false)
returns public.gruppechatter
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.gruppechatter;
begin
  perform intern.krev_aktivt_medlemskap();
  perform 1 from public.grupper g where g.id = las_gruppechat.gruppe for share;
  perform intern.krev_gruppechat(las_gruppechat.gruppe);
  if not intern.kan_bidra_i_gruppe(las_gruppechat.gruppe)
    and not (las_gruppechat.sletting and intern.kan_moderere_gruppechat(las_gruppechat.gruppe))
  then
    raise exception 'Gruppen er arkivert. Det kan ikke skrives noe i chatten.' using errcode = '55000';
  end if;
  insert into public.gruppechatter (gruppe_id) values (las_gruppechat.gruppe) on conflict (gruppe_id) do nothing;
  select * into c from public.gruppechatter x where x.gruppe_id = las_gruppechat.gruppe for update;
  perform intern.slett_utgatte_gruppemeldinger(c.gruppe_id);
  return c;
end;
$$;

revoke all on function intern.las_gruppechat(uuid, boolean) from public, anon, authenticated, service_role;

-- Meldingen, når den innloggede leser gruppen den står i og den ikke er
-- eldre enn lagringstiden. Ellers det samme svaret som for en melding som
-- ikke finnes.
create function intern.krev_gruppemelding(melding uuid)
returns public.gruppemeldinger
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m public.gruppemeldinger;
begin
  perform intern.krev_aktivt_medlemskap();
  if not intern.gruppechat_aktivert() then
    raise exception 'Gruppechatten er ikke slått på.' using errcode = '42501';
  end if;
  select * into m from public.gruppemeldinger x
  where x.id = krev_gruppemelding.melding
    and x.skrevet_kl >= now() - intern.gruppechat_lagringstid();
  if m.id is null or not intern.kan_lese_gruppe(m.gruppe_id) then
    raise exception 'Meldingen finnes ikke, eller du har ikke tilgang til den.' using errcode = '42501';
  end if;
  return m;
end;
$$;

revoke all on function intern.krev_gruppemelding(uuid) from public, anon, authenticated, service_role;

-- --- Vaktene ------------------------------------------------------------------------

-- Teksten som lagres: uten tomrom først og sist, og innenfor grensen. Så
-- fødselsnumrene (grunnmuren). Teksten tas aldri med i feilmeldingen.
create function intern.gyldig_meldingstekst(tekst text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  t text := btrim(coalesce(tekst, ''), E' \t\r\n');
  maks int := (intern.gruppechat_grenser() ->> 'maks_tegn')::int;
begin
  if t = '' then
    raise exception 'Meldingen er tom.' using errcode = '22023';
  end if;
  if char_length(t) > maks then
    raise exception 'Meldingen er for lang. Den kan ha høyst % tegn.', maks using errcode = '22023';
  end if;
  perform intern.krev_uten_personnummer(t);
  return t;
end;
$$;

revoke all on function intern.gyldig_meldingstekst(text) from public, anon, authenticated, service_role;

-- --- Formen på svarene ----------------------------------------------------------------

-- Én melding slik appen får den (`Gruppemelding` i src/gruppechat/modell.ts).
-- `kan_bidra` (`intern.kan_bidra_i_gruppe`) og `kan_moderere`
-- (`intern.kan_moderere_gruppechat`) er den innloggedes rett i gruppen,
-- regnet ut én gang av kalleren. `klient_id` bare på egne meldinger.
create function intern.gruppemelding_json(m public.gruppemeldinger, kan_bidra boolean, kan_moderere boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with e as (
    select coalesce(m.forfatter_id = (select auth.uid()), false) as egen
  )
  select jsonb_build_object(
    'id', m.id,
    'nr', m.nr,
    'endring', m.endring,
    'forfatter', (
      select jsonb_build_object(
        'id', p.id, 'username', p.username, 'first_name', p.first_name, 'last_name', p.last_name,
        'avatar_path', p.avatar_path, 'updated_at', p.updated_at
      )
      from public.profiles p where p.id = m.forfatter_id
    ),
    'tekst', m.tekst,
    'skrevet_kl', m.skrevet_kl,
    'redigert_kl', m.redigert_kl,
    'slettet', case when m.slettet_kl is not null then jsonb_build_object('av', m.slettet_som, 'kl', m.slettet_kl) end,
    'egen', e.egen,
    'klient_id', case when e.egen then m.klient_id end,
    'kan_endre', e.egen and m.slettet_kl is null and coalesce(kan_bidra, false),
    'kan_slette', m.slettet_kl is null and ((e.egen and coalesce(kan_bidra, false)) or coalesce(kan_moderere, false))
  )
  from e
$$;

revoke all on function intern.gruppemelding_json(public.gruppemeldinger, boolean, boolean) from public, anon, authenticated, service_role;

-- Meldingen etter en skriving, med den innloggedes rett i gruppen nå.
create function intern.gruppemelding_svar(melding uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.gruppemelding_json(m, intern.kan_bidra_i_gruppe(m.gruppe_id), intern.kan_moderere_gruppechat(m.gruppe_id))
  from public.gruppemeldinger m where m.id = gruppemelding_svar.melding
$$;

revoke all on function intern.gruppemelding_svar(uuid) from public, anon, authenticated, service_role;

-- Øker gruppens endringsteller (og løpenummeret for en ny melding) og gir
-- den nye chatraden. Kalles med raden låst.
create function intern.neste_gruppechatendring(gruppe uuid, ny_melding boolean)
returns public.gruppechatter
language sql
security definer
set search_path = ''
as $$
  update public.gruppechatter c
  set siste_nr = c.siste_nr + case when neste_gruppechatendring.ny_melding then 1 else 0 end,
      siste_endring = c.siste_endring + 1,
      endret_kl = now()
  where c.gruppe_id = neste_gruppechatendring.gruppe
  returning c.*
$$;

revoke all on function intern.neste_gruppechatendring(uuid, boolean) from public, anon, authenticated, service_role;

-- --- Lesingen ----------------------------------------------------------------------------

-- Meldingene før `for_nr` (uten: de nyeste), høyst `antall` (1–100), stigende
-- etter `nr`, med det visningen trenger. Lager chatraden når den mangler, så
-- sanntiden har noe å lytte på, og rydder de utgåtte meldingene i gruppen.
-- Alt leses i én spørring, så `siste_endring` og meldingene stemmer med
-- hverandre.
create function public.les_gruppechat(gruppe uuid, for_nr bigint default null, antall integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int := least(greatest(coalesce(les_gruppechat.antall, 50), 1), 100);
  frist timestamptz := now() - intern.gruppechat_lagringstid();
  kan_bidra boolean;
  kan_moderere boolean;
begin
  perform intern.krev_aktivt_medlemskap();
  perform intern.krev_gruppechat(les_gruppechat.gruppe);
  if not exists (select 1 from public.gruppechatter c where c.gruppe_id = les_gruppechat.gruppe) then
    insert into public.gruppechatter (gruppe_id) values (les_gruppechat.gruppe) on conflict (gruppe_id) do nothing;
  end if;
  -- Den eldste meldingen står først etter løpenummeret; bare når den er
  -- utgått, låses gruppen for ryddingen.
  if (select m.skrevet_kl from public.gruppemeldinger m where m.gruppe_id = les_gruppechat.gruppe order by m.nr limit 1) < frist then
    perform 1 from public.grupper g where g.id = les_gruppechat.gruppe for share;
    perform 1 from public.gruppechatter c where c.gruppe_id = les_gruppechat.gruppe for update;
    perform intern.slett_utgatte_gruppemeldinger(les_gruppechat.gruppe);
  end if;
  kan_bidra := intern.kan_bidra_i_gruppe(les_gruppechat.gruppe);
  kan_moderere := intern.kan_moderere_gruppechat(les_gruppechat.gruppe);
  return (
    with side as (
      select m.*
      from public.gruppemeldinger m
      where m.gruppe_id = les_gruppechat.gruppe
        and (les_gruppechat.for_nr is null or m.nr < les_gruppechat.for_nr)
        and m.skrevet_kl >= frist
      order by m.nr desc
      limit n + 1
    )
    select jsonb_build_object(
      'meldinger', coalesce((
        select jsonb_agg(intern.gruppemelding_json(s, kan_bidra, kan_moderere) order by s.nr)
        from (select * from side order by side.nr desc limit n) s
      ), '[]'::jsonb),
      'flere_eldre', (select count(*) from side) > n,
      'siste_endring', coalesce((select c.siste_endring from public.gruppechatter c where c.gruppe_id = les_gruppechat.gruppe), 0),
      'lest_til_nr', coalesce((
        select l.lest_til_nr from public.gruppechat_lest l
        where l.gruppe_id = les_gruppechat.gruppe and l.bruker_id = (select auth.uid())
      ), 0),
      'kan_skrive', kan_bidra,
      'kan_moderere', kan_moderere,
      'lesere', jsonb_build_object(
        'medlemmer', (
          select count(*) from public.gruppemedlemskap gm
          where gm.gruppe_id = les_gruppechat.gruppe and gm.status = 'aktiv'
            and intern.grupperolle(gm.gruppe_id, gm.bruker_id) is not null
        ),
        'systemarkitekter', true
      ),
      'grenser', intern.gruppechat_grenser()
    )
  );
end;
$$;

-- Det som er skrevet, endret eller slettet etter endringstelleren `etter`,
-- stigende etter `endring`, høyst `antall` (1–500). Er det mer, er `flere`
-- sann og `siste_endring` endringen til den siste meldingen i svaret, så
-- klienten henter videre derfra. Én spørring, som over.
create function public.gruppechat_endringer(gruppe uuid, etter bigint, antall integer default 200)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  n int := least(greatest(coalesce(gruppechat_endringer.antall, 200), 1), 500);
  kan_bidra boolean;
  kan_moderere boolean;
begin
  perform intern.krev_aktivt_medlemskap();
  perform intern.krev_gruppechat(gruppechat_endringer.gruppe);
  kan_bidra := intern.kan_bidra_i_gruppe(gruppechat_endringer.gruppe);
  kan_moderere := intern.kan_moderere_gruppechat(gruppechat_endringer.gruppe);
  return (
    with endret as (
      select m.*
      from public.gruppemeldinger m
      where m.gruppe_id = gruppechat_endringer.gruppe
        and m.endring > coalesce(gruppechat_endringer.etter, 0)
        and m.skrevet_kl >= now() - intern.gruppechat_lagringstid()
      order by m.endring
      limit n + 1
    ),
    svar as (
      select * from endret order by endret.endring limit n
    )
    select jsonb_build_object(
      'meldinger', coalesce((
        select jsonb_agg(intern.gruppemelding_json(s, kan_bidra, kan_moderere) order by s.endring) from svar s
      ), '[]'::jsonb),
      'siste_endring', case
        when (select count(*) from endret) > n then (select max(s.endring) from svar s)
        else greatest(
          coalesce((select c.siste_endring from public.gruppechatter c where c.gruppe_id = gruppechat_endringer.gruppe), 0),
          coalesce(gruppechat_endringer.etter, 0)
        )
      end,
      'flere', (select count(*) from endret) > n
    )
  );
end;
$$;

-- --- Skrivingen --------------------------------------------------------------------------

-- Sender en melding. Samme `klient_id` fra samme bruker i samme gruppe gir
-- den samme meldingen tilbake, uten vaktene og uten å telle i takten.
create function public.send_gruppemelding(gruppe uuid, klient_id uuid, tekst text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  c public.gruppechatter;
  t text;
  ny uuid;
begin
  perform intern.krev_aktivt_medlemskap();
  c := intern.las_gruppechat(send_gruppemelding.gruppe);
  if send_gruppemelding.klient_id is null then
    raise exception 'Meldingen mangler klient-ID.' using errcode = '22023';
  end if;
  select m.id into ny from public.gruppemeldinger m
  where m.gruppe_id = c.gruppe_id and m.forfatter_id = aktor and m.klient_id = send_gruppemelding.klient_id;
  if ny is not null then
    return intern.gruppemelding_svar(ny);
  end if;
  t := intern.gyldig_meldingstekst(send_gruppemelding.tekst);
  if (
    select count(*) from public.gruppemeldinger m
    where m.gruppe_id = c.gruppe_id and m.forfatter_id = aktor and m.skrevet_kl > now() - interval '60 seconds'
  ) >= (intern.gruppechat_grenser() ->> 'maks_per_minutt')::int then
    raise exception 'Du sender meldinger for fort. Vent litt og prøv igjen.' using errcode = '54000';
  end if;
  c := intern.neste_gruppechatendring(c.gruppe_id, true);
  insert into public.gruppemeldinger (gruppe_id, nr, forfatter_id, klient_id, tekst, endring)
  values (c.gruppe_id, c.siste_nr, aktor, send_gruppemelding.klient_id, t, c.siste_endring)
  returning id into ny;
  return intern.gruppemelding_svar(ny);
end;
$$;

-- Erstatter teksten i en egen melding, så lenge gruppen er aktiv. Den gamle
-- teksten lagres ikke. Uendret tekst gir meldingen som den er.
create function public.endre_gruppemelding(melding uuid, tekst text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  m public.gruppemeldinger;
  c public.gruppechatter;
  t text;
begin
  perform intern.krev_aktivt_medlemskap();
  m := intern.krev_gruppemelding(endre_gruppemelding.melding);
  c := intern.las_gruppechat(m.gruppe_id);
  m := intern.krev_gruppemelding(endre_gruppemelding.melding);
  if m.forfatter_id is distinct from (select auth.uid()) then
    raise exception 'Bare den som skrev meldingen, kan endre den.' using errcode = '42501';
  end if;
  if m.slettet_kl is not null then
    raise exception 'Meldingen er slettet og kan ikke endres.' using errcode = '55000';
  end if;
  t := intern.gyldig_meldingstekst(endre_gruppemelding.tekst);
  if t is distinct from m.tekst then
    c := intern.neste_gruppechatendring(c.gruppe_id, false);
    update public.gruppemeldinger x
    set tekst = t, redigert_kl = now(), endring = c.siste_endring
    where x.id = m.id;
  end if;
  return intern.gruppemelding_svar(m.id);
end;
$$;

-- Sletter en melding: forfatteren selv eller en moderator i en aktiv gruppe,
-- eller en systemarkitekt, også i en arkivert gruppe. Teksten fjernes med en
-- gang; hvem og når står igjen. En melding som alt er slettet, gis som den er.
create function public.slett_gruppemelding(melding uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  m public.gruppemeldinger;
  c public.gruppechatter;
begin
  perform intern.krev_aktivt_medlemskap();
  m := intern.krev_gruppemelding(slett_gruppemelding.melding);
  c := intern.las_gruppechat(m.gruppe_id, true);
  m := intern.krev_gruppemelding(slett_gruppemelding.melding);
  if m.slettet_kl is not null then
    return intern.gruppemelding_svar(m.id);
  end if;
  if not ((m.forfatter_id = aktor and intern.kan_bidra_i_gruppe(m.gruppe_id)) or intern.kan_moderere_gruppechat(m.gruppe_id)) then
    raise exception 'Bare den som skrev meldingen, og moderatorene i gruppen, kan slette den.' using errcode = '42501';
  end if;
  c := intern.neste_gruppechatendring(c.gruppe_id, false);
  update public.gruppemeldinger x
  set tekst = null,
      slettet_kl = now(),
      slettet_av = aktor,
      slettet_som = case when m.forfatter_id is not distinct from aktor then 'forfatter' else 'moderator' end,
      endring = c.siste_endring
  where x.id = m.id;
  return intern.gruppemelding_svar(m.id);
end;
$$;

-- Merker meldingene til og med `til_nr` lest for den innloggede, og varslene
-- om dem. Flytter bare framover, og aldri forbi den siste meldingen.
create function public.merk_gruppechat_lest(gruppe uuid, til_nr bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  til bigint;
begin
  perform intern.krev_aktivt_medlemskap();
  perform intern.krev_gruppechat(merk_gruppechat_lest.gruppe);
  select least(coalesce(merk_gruppechat_lest.til_nr, 0), c.siste_nr) into til
  from public.gruppechatter c where c.gruppe_id = merk_gruppechat_lest.gruppe;
  if coalesce(til, 0) <= 0 then
    return;
  end if;
  insert into public.gruppechat_lest as l (gruppe_id, bruker_id, lest_til_nr)
  values (merk_gruppechat_lest.gruppe, aktor, til)
  on conflict (gruppe_id, bruker_id) do update
    set lest_til_nr = greatest(l.lest_til_nr, excluded.lest_til_nr);
  perform intern.merk_gruppechat_varsler_lest(merk_gruppechat_lest.gruppe, aktor, til);
end;
$$;

revoke all on function public.les_gruppechat(uuid, bigint, integer) from public, anon;
revoke all on function public.gruppechat_endringer(uuid, bigint, integer) from public, anon;
revoke all on function public.send_gruppemelding(uuid, uuid, text) from public, anon;
revoke all on function public.endre_gruppemelding(uuid, text) from public, anon;
revoke all on function public.slett_gruppemelding(uuid) from public, anon;
revoke all on function public.merk_gruppechat_lest(uuid, bigint) from public, anon;

grant execute on function public.les_gruppechat(uuid, bigint, integer) to authenticated;
grant execute on function public.gruppechat_endringer(uuid, bigint, integer) to authenticated;
grant execute on function public.send_gruppemelding(uuid, uuid, text) to authenticated;
grant execute on function public.endre_gruppemelding(uuid, text) to authenticated;
grant execute on function public.slett_gruppemelding(uuid) to authenticated;
grant execute on function public.merk_gruppechat_lest(uuid, bigint) to authenticated;

-- --- Lagringstiden for alle grupper -----------------------------------------------------

-- Sletter de utgåtte meldingene i alle grupper, én gruppe om gangen under
-- gruppens lås, og gir hvor mange. Kalles av databasen selv (utrullingen
-- eller en planlagt jobb), ikke fra nettleseren.
create function intern.rydd_gruppechat()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  g uuid;
  antall integer := 0;
  slettet integer;
begin
  for g in
    select distinct m.gruppe_id from public.gruppemeldinger m
    where m.skrevet_kl < now() - intern.gruppechat_lagringstid()
  loop
    perform 1 from public.gruppechatter c where c.gruppe_id = g for update;
    delete from public.gruppemeldinger m
    where m.gruppe_id = g and m.skrevet_kl < now() - intern.gruppechat_lagringstid();
    get diagnostics slettet = row_count;
    antall := antall + slettet;
  end loop;
  return antall;
end;
$$;

revoke all on function intern.rydd_gruppechat() from public, anon, authenticated, service_role;

comment on function intern.rydd_gruppechat() is
  'P7: sletter gruppemeldinger eldre enn lagringstiden (12 måneder, Peder 17.11.2026) i alle grupper. Se docs/gruppechat.md.';

-- --- Tallet på uleste i gruppen -------------------------------------------------------

-- Som før (20261117040100), og `chat_uleste`: meldingene fra andre etter det
-- den innloggede har lest, uten de slettede og utgåtte, eller null mens
-- chatten er avslått.
create or replace function intern.gruppesamhandling(gruppe uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nye_ideer', (
      select count(*) from jsonb_array_elements(intern.ideliste(gruppesamhandling.gruppe)) i
      where i ->> 'arkivert_kl' is null
        and (not (i ->> 'sett')::boolean or (i ->> 'nye_kommentarer')::integer > 0)
    ),
    'venter', (
      select count(*) from public.ideer i
      where i.gruppe_id = gruppesamhandling.gruppe
        and i.arkivert_kl is null
        and not exists (select 1 from public.gruppeoppgaver o where o.ide_id = i.id)
    ),
    'mine_oppgaver', (
      select count(*) from public.gruppeoppgaver o
      where o.gruppe_id = gruppesamhandling.gruppe
        and o.ansvarlig_id = (select auth.uid())
        and o.status <> 'fullfort'
    ),
    'chat_uleste', case when intern.gruppechat_aktivert() then (
      select count(*) from public.gruppemeldinger m
      where m.gruppe_id = gruppesamhandling.gruppe
        and m.nr > coalesce((
          select l.lest_til_nr from public.gruppechat_lest l
          where l.gruppe_id = gruppesamhandling.gruppe and l.bruker_id = (select auth.uid())
        ), 0)
        and m.forfatter_id is distinct from (select auth.uid())
        and m.slettet_kl is null
        and m.skrevet_kl >= now() - intern.gruppechat_lagringstid()
    ) end
  )
$$;
