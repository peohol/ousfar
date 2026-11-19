-- D5: direktemeldinger mellom to brukere (docs/direktemeldinger-personvern.md,
-- som er fasit; Peders fem beslutninger 18.11.2026). Bygger på gruppechatten
-- (20261117125500, 20261117130000) og chatmenyen (20261118213000).
--
--  * Bryteren `intern.direktemeldinger_aktivert()` svarer nei. Mens den er av,
--    svarer alle funksjonene 42501 «Direktemeldingene er ikke slått på.», og
--    radsikkerheten på `direktesamtaler` gir ingen rader. Aktiveringen er en
--    egen, liten migrasjon (beslutning 4).
--  * Bare de to deltakerne leser en samtale. Ingen administrator, moderator
--    eller systemarkitekt får noe ekstra (beslutning 1): `er_systemarkitekt`
--    og `er_admin` brukes ikke her. En samtale man ikke er med i, svarer
--    nøyaktig som en som ikke finnes.
--  * Ingen kan sende eller motta før de selv har slått på
--    `tillat_direktemeldinger` (`chatvalg`, av som standard). Sending krever at
--    begge har det på, at ingen av dem har blokkert den andre og at begge har
--    aktivt medlemskap, kontrollert under låser i selve sendingen.
--  * Begge deltakerne kan slette enhver melding (beslutning 5). Teksten settes
--    til tom med en gang; ingen kopi av endret eller slettet tekst.
--  * Lagringstiden er 12 måneder (beslutning 2): en eldre melding leses aldri
--    ut og slettes ved sending og lesing i samtalen, og for alle samtaler av
--    `intern.rydd_direktemeldinger()` (nattjobben).
--  * Ingen varsler i bjella, ingen tekst i sanntiden, i feilmeldinger eller i
--    tilgangsloggen. Tabellene har ingen loggutløser.
--  * Aktivitetsstatusen er en egen bryter (`vis_aktiv`, av), gir bare ja/nei
--    og har ingen historikk.
--
-- Ingen eksisterende data endres; den eneste utvidelsen av noe som finnes, er
-- at profilen til den andre i en egen direktesamtale er synlig
-- (`intern.synlige_profiler`), og den gjelder bare mens bryteren er på.
--
-- Tilbakeføring: `intern.synlige_profiler` tilbake til definisjonen i
-- 20261114232000, `public.direktesamtaler` ut av publikasjonen
-- `supabase_realtime`, og funksjonene herfra fjernet. Tabellene kan stå; uten
-- funksjonene leses ingenting i dem.

-- --- Bryteren, grensene og lagringstiden ----------------------------------------

create function intern.direktemeldinger_aktivert()
returns boolean
language sql
stable
set search_path = ''
as $$
  select false
$$;

revoke all on function intern.direktemeldinger_aktivert() from public, anon, authenticated, service_role;

comment on function intern.direktemeldinger_aktivert() is
  'D5: om direktemeldingene er slått på. Nei til aktiveringsmigrasjonen (beslutning 4). Se docs/direktemeldinger-personvern.md.';

-- Grensene databasen håndhever, og som `les_direktesamtale` gir appen.
-- `maks_tegn` er den samme som i gruppechatten (`intern.gyldig_meldingstekst`).
create function intern.direktemelding_grenser()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'maks_tegn', (intern.gruppechat_grenser() ->> 'maks_tegn')::int,
    'maks_per_minutt', 20,
    'maks_per_minutt_totalt', 60,
    'maks_nye_samtaler_per_time', 10
  )
$$;

revoke all on function intern.direktemelding_grenser() from public, anon, authenticated, service_role;

-- 12 måneder (Peder, beslutning 2, 18.11.2026).
create function intern.direktemelding_lagringstid()
returns interval
language sql
immutable
set search_path = ''
as $$
  select interval '12 months'
$$;

revoke all on function intern.direktemelding_lagringstid() from public, anon, authenticated, service_role;

comment on function intern.direktemelding_lagringstid() is
  'D5: direktemeldinger eldre enn dette slettes helt (Peder, beslutning 2, 18.11.2026). Se docs/direktemeldinger-personvern.md.';

-- --- Tabellene --------------------------------------------------------------------

-- Egne valg. Ingen rad betyr at begge er av. Leses av databasen for andre
-- under en lås ved sending, og skrives bare gjennom funksjonene.
create table public.chatvalg (
  bruker_id uuid primary key references public.profiles (id) on delete cascade,
  tillat_direktemeldinger boolean not null default false,
  vis_aktiv boolean not null default false,
  endret_kl timestamptz not null default now()
);

comment on table public.chatvalg is
  'D5: «Tillat direktemeldinger» og «Vis når jeg er aktiv», begge av som standard. Bare gjennom funksjonene.';

-- Én samtale per brukerpar, med de to ID-ene sortert. Raden er låsen
-- skrivingene tar og dørklokken sanntiden lytter på; den har ingen tekst.
create table public.direktesamtaler (
  id uuid primary key default gen_random_uuid(),
  bruker_lav uuid references public.profiles (id) on delete set null,
  bruker_hoy uuid references public.profiles (id) on delete set null,
  -- Hvem som startet samtalen, til grensen på nye samtaler i timen. Leses ikke ut.
  opprettet_av uuid references public.profiles (id) on delete set null,
  siste_nr bigint not null default 0,
  siste_endring bigint not null default 0,
  siste_melding_kl timestamptz,
  opprettet_kl timestamptz not null default now(),
  endret_kl timestamptz not null default now(),
  constraint direktesamtaler_par check (bruker_lav < bruker_hoy),
  constraint direktesamtaler_tellere check (siste_nr >= 0 and siste_endring >= siste_nr),
  constraint direktesamtaler_par_unik unique (bruker_lav, bruker_hoy)
);

comment on table public.direktesamtaler is
  'D5: én samtale per brukerpar; låsen og dørklokken, uten tekst. Leses bare av de to deltakerne. Se docs/direktemeldinger-personvern.md.';

create index direktesamtaler_hoy_idx on public.direktesamtaler (bruker_hoy) where bruker_hoy is not null;
create index direktesamtaler_opprettet_av_idx on public.direktesamtaler (opprettet_av, opprettet_kl) where opprettet_av is not null;

create table public.direktemeldinger (
  id uuid primary key default gen_random_uuid(),
  samtale_id uuid not null references public.direktesamtaler (id) on delete cascade,
  nr bigint not null,
  forfatter_id uuid references public.profiles (id) on delete set null,
  klient_id uuid not null,
  -- Null når meldingen er slettet.
  tekst text,
  skrevet_kl timestamptz not null default now(),
  redigert_kl timestamptz,
  slettet_kl timestamptz,
  -- Forfatteren selv eller den andre i samtalen (beslutning 5).
  slettet_som text,
  endring bigint not null,
  constraint direktemeldinger_nr check (nr >= 1 and endring >= nr),
  constraint direktemeldinger_tekst check (
    (slettet_kl is null) = (tekst is not null)
    and (tekst is null or char_length(tekst) between 1 and 4000)
  ),
  constraint direktemeldinger_slettet check (
    (slettet_kl is null) = (slettet_som is null) and (slettet_som is null or slettet_som in ('forfatter', 'motpart'))
  ),
  constraint direktemeldinger_nr_unik unique (samtale_id, nr)
);

comment on table public.direktemeldinger is
  'D5: meldingene i direktesamtalene. Bare gjennom funksjonene, og bare for de to. Slettes etter 12 måneder (beslutning 2).';

create index direktemeldinger_endring_idx on public.direktemeldinger (samtale_id, endring);
create unique index direktemeldinger_klient_idx on public.direktemeldinger (samtale_id, forfatter_id, klient_id);
-- Takten: de nye meldingene til én bruker, i én samtale og til sammen.
create index direktemeldinger_takt_idx on public.direktemeldinger (forfatter_id, skrevet_kl) where forfatter_id is not null;
create index direktemeldinger_skrevet_idx on public.direktemeldinger (skrevet_kl);

-- Hvor langt hver har lest, og om samtalen er dempet eller skjult. Vises
-- aldri for den andre.
create table public.direktesamtale_status (
  samtale_id uuid not null references public.direktesamtaler (id) on delete cascade,
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  lest_til_nr bigint not null default 0,
  dempet boolean not null default false,
  -- Skjult fra egen liste til det kommer en melding etter dette nummeret.
  skjult_til_nr bigint,
  primary key (samtale_id, bruker_id),
  constraint direktesamtale_status_nr check (lest_til_nr >= 0 and (skjult_til_nr is null or skjult_til_nr >= 0))
);

create index direktesamtale_status_bruker_idx on public.direktesamtale_status (bruker_id);

comment on table public.direktesamtale_status is
  'D5: egen lesestatus, demping og skjuling per samtale. Bare gjennom funksjonene.';

create table public.direktemelding_blokkeringer (
  blokkerer uuid not null references public.profiles (id) on delete cascade,
  blokkert uuid not null references public.profiles (id) on delete cascade,
  opprettet_kl timestamptz not null default now(),
  primary key (blokkerer, blokkert),
  constraint direktemelding_blokkeringer_ikke_seg_selv check (blokkerer <> blokkert)
);

create index direktemelding_blokkeringer_blokkert_idx on public.direktemelding_blokkeringer (blokkert);

comment on table public.direktemelding_blokkeringer is
  'D5: hvem brukeren har blokkert fra direktemeldinger. Håndheves ved sending og søk; vises bare for den som blokkerte.';

-- Den grønne prikken: én rad med en frist høyst to minutter fram. Ingen
-- historikk; utgåtte rader slettes ved hver oppdatering og lesing.
create table public.chataktivitet (
  bruker_id uuid primary key references public.profiles (id) on delete cascade,
  aktiv_til timestamptz not null
);

comment on table public.chataktivitet is
  'D5: om brukeren har vært aktiv de siste to minuttene, når «Vis når jeg er aktiv» er på. Ingen historikk.';

alter table public.chatvalg enable row level security;
alter table public.direktesamtaler enable row level security;
alter table public.direktemeldinger enable row level security;
alter table public.direktesamtale_status enable row level security;
alter table public.direktemelding_blokkeringer enable row level security;
alter table public.chataktivitet enable row level security;

revoke all on public.chatvalg, public.direktesamtaler, public.direktemeldinger, public.direktesamtale_status,
  public.direktemelding_blokkeringer, public.chataktivitet from anon, authenticated;

-- --- Tilgangen --------------------------------------------------------------------

-- Om den innloggede kan bruke direktemeldinger nå: innlogget, aktivt
-- medlemskap og bryteren på. Brukes av radsikkerheten på `direktesamtaler`,
-- og dermed av sanntiden, for hver hendelse.
create function public.kan_bruke_direktemeldinger()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and intern.har_aktivt_medlemskap((select auth.uid()))
    and intern.direktemeldinger_aktivert()
$$;

revoke all on function public.kan_bruke_direktemeldinger() from public, anon, authenticated, service_role;
grant execute on function public.kan_bruke_direktemeldinger() to authenticated;

comment on function public.kan_bruke_direktemeldinger() is
  'D5: om den innloggede kan bruke direktemeldinger nå (aktivt medlemskap og bryteren på). Brukes av radsikkerheten.';

-- Bare de to deltakerne, og bare de kolonnene dørklokken trenger.
grant select (id, bruker_lav, bruker_hoy, siste_nr, siste_endring, endret_kl) on public.direktesamtaler to authenticated;

create policy "De to deltakerne ser samtaleraden" on public.direktesamtaler
for select
to authenticated
using (
  (select auth.uid()) in (bruker_lav, bruker_hoy)
  and (select public.kan_bruke_direktemeldinger())
);

create policy aktivt_medlemskap on public.direktesamtaler as restrictive for all to authenticated
using ((select public.har_aktivt_medlemskap()))
with check ((select public.har_aktivt_medlemskap()));

-- Krever en innlogget med aktivt medlemskap og bryteren på; gir ID-en.
create function intern.krev_direktemeldinger()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
begin
  perform intern.krev_aktivt_medlemskap();
  if not intern.direktemeldinger_aktivert() then
    raise exception 'Direktemeldingene er ikke slått på.' using errcode = '42501';
  end if;
  if aktor is null then
    raise exception 'Du må være logget inn.' using errcode = '42501';
  end if;
  return aktor;
end;
$$;

revoke all on function intern.krev_direktemeldinger() from public, anon, authenticated, service_role;

-- Den andre i samtalen sett fra `bruker` (null for en slettet konto).
create function intern.direkte_motpart(s public.direktesamtaler, bruker uuid)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case when s.bruker_lav = bruker then s.bruker_hoy else s.bruker_lav end
$$;

revoke all on function intern.direkte_motpart(public.direktesamtaler, uuid) from public, anon, authenticated, service_role;

-- Samtalen, når `bruker` er en av de to. Ellers det samme svaret som for en
-- samtale som ikke finnes.
create function intern.krev_direktesamtale(samtale uuid, bruker uuid)
returns public.direktesamtaler
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  s public.direktesamtaler;
begin
  select * into s from public.direktesamtaler x where x.id = krev_direktesamtale.samtale;
  if s.id is null or krev_direktesamtale.bruker is null or krev_direktesamtale.bruker not in (s.bruker_lav, s.bruker_hoy) then
    raise exception 'Samtalen finnes ikke, eller du har ikke tilgang til den.' using errcode = '42501';
  end if;
  return s;
end;
$$;

revoke all on function intern.krev_direktesamtale(uuid, uuid) from public, anon, authenticated, service_role;

-- Meldingen, når `bruker` er med i samtalen og den ikke er eldre enn
-- lagringstiden. Ellers det samme svaret som for en melding som ikke finnes.
create function intern.krev_direktemelding(melding uuid, bruker uuid)
returns public.direktemeldinger
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  m public.direktemeldinger;
begin
  select x.* into m
  from public.direktemeldinger x
  join public.direktesamtaler s on s.id = x.samtale_id
  where x.id = krev_direktemelding.melding
    and krev_direktemelding.bruker in (s.bruker_lav, s.bruker_hoy)
    and x.skrevet_kl >= now() - intern.direktemelding_lagringstid();
  if m.id is null then
    raise exception 'Meldingen finnes ikke, eller du har ikke tilgang til den.' using errcode = '42501';
  end if;
  return m;
end;
$$;

revoke all on function intern.krev_direktemelding(uuid, uuid) from public, anon, authenticated, service_role;

create function intern.tillater_direktemeldinger(bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select v.tillat_direktemeldinger from public.chatvalg v where v.bruker_id = tillater_direktemeldinger.bruker), false)
$$;

revoke all on function intern.tillater_direktemeldinger(uuid) from public, anon, authenticated, service_role;

create function intern.har_blokkert(blokkerer uuid, blokkert uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.direktemelding_blokkeringer b
    where b.blokkerer = har_blokkert.blokkerer and b.blokkert = har_blokkert.blokkert
  )
$$;

revoke all on function intern.har_blokkert(uuid, uuid) from public, anon, authenticated, service_role;

-- Om `mottaker` kan nås av `avsender` nå, sett fra mottakeren: aktivt
-- medlemskap, bryteren på og ikke blokkert av mottakeren. Én grunn for alt,
-- så avsenderen ikke får vite hvorfor.
create function intern.kan_motta_fra(mottaker uuid, avsender uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select mottaker is not null
    and intern.har_aktivt_medlemskap(mottaker)
    and intern.tillater_direktemeldinger(mottaker)
    and not intern.har_blokkert(mottaker, avsender)
$$;

revoke all on function intern.kan_motta_fra(uuid, uuid) from public, anon, authenticated, service_role;

-- Hvorfor `bruker` ikke kan skrive til `motpart` nå, eller null når det går:
-- `selv_av` (har selv slått av), `selv_blokkert` (har selv blokkert den
-- andre) eller `mottaker` (den andre kan ikke motta, uten grunn). Avsenderens
-- eget medlemskap kontrolleres av kalleren.
create function intern.direktesperre(bruker uuid, motpart uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.tillater_direktemeldinger(bruker) then 'selv_av'
    when motpart is not null and intern.har_blokkert(bruker, motpart) then 'selv_blokkert'
    when not intern.kan_motta_fra(motpart, bruker) then 'mottaker'
  end
$$;

revoke all on function intern.direktesperre(uuid, uuid) from public, anon, authenticated, service_role;

-- Avslaget ved sending og endring, med den egne grunnen eller den felles teksten.
create function intern.krev_uten_direktesperre(bruker uuid, motpart uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  case intern.direktesperre(bruker, motpart)
    when 'selv_av' then
      raise exception 'Du har slått av direktemeldinger. Slå dem på for å skrive.' using errcode = 'PT409';
    when 'selv_blokkert' then
      raise exception 'Du har blokkert denne personen. Opphev blokkeringen for å skrive.' using errcode = 'PT409';
    when 'mottaker' then
      raise exception 'Kan ikke motta nye direktemeldinger.' using errcode = 'PT409';
    else
      return;
  end case;
end;
$$;

revoke all on function intern.krev_uten_direktesperre(uuid, uuid) from public, anon, authenticated, service_role;

-- Låsene før sendevilkårene leses (docs/direktemeldinger-personvern.md,
-- «Låsing og samtidighet»), i fast rekkefølge:
--  1. delt på tilgangslåsen (`intern.las_tilgang` tar den eksklusivt), så
--     sendingen venter på en samtidig endring av medlemskapene og omvendt;
--  2. begge deltakernes `chatvalg` med `for share`, den laveste ID-en først;
--     `sett_chatvalg` og `blokker_bruker` tar sin egen med `for update`.
-- Låsen per avsender (0) tas av kalleren før takten telles, og samtalens rad
-- (3) etterpå.
create function intern.las_direktevilkar(en uuid, to_ uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform pg_advisory_xact_lock_shared(hashtextextended('ousfar.tilgang', 0));
  perform 1 from public.chatvalg v
  where v.bruker_id in (las_direktevilkar.en, las_direktevilkar.to_)
  order by v.bruker_id
  for share;
end;
$$;

revoke all on function intern.las_direktevilkar(uuid, uuid) from public, anon, authenticated, service_role;

-- Låsen per avsender (0): samtidige kall fra samme bruker telles etter
-- hverandre, også i ulike samtaler. Tas alltid først.
create function intern.las_direkteavsender(bruker uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select pg_advisory_xact_lock(hashtextextended('ousfar.direktemeldinger:' || las_direkteavsender.bruker::text, 0))
$$;

revoke all on function intern.las_direkteavsender(uuid) from public, anon, authenticated, service_role;

-- Egen rad i `chatvalg`, laget når den mangler, og låst for endring.
create function intern.las_egne_chatvalg(bruker uuid)
returns public.chatvalg
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.chatvalg;
begin
  insert into public.chatvalg (bruker_id) values (las_egne_chatvalg.bruker) on conflict (bruker_id) do nothing;
  select * into v from public.chatvalg x where x.bruker_id = las_egne_chatvalg.bruker for update;
  return v;
end;
$$;

revoke all on function intern.las_egne_chatvalg(uuid) from public, anon, authenticated, service_role;

-- Om `seer` kan finne `bruker` i søket: begge har bryteren på, `bruker` har
-- aktivt medlemskap, og ingen av dem har blokkert den andre.
create function intern.sokbar_for(bruker uuid, seer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select bruker is distinct from seer
    and intern.tillater_direktemeldinger(seer)
    and intern.kan_motta_fra(bruker, seer)
    and not intern.har_blokkert(seer, bruker)
$$;

revoke all on function intern.sokbar_for(uuid, uuid) from public, anon, authenticated, service_role;

-- --- Formen på svarene ------------------------------------------------------------

-- Profilkortet (samme felt som `PROFILKORT` i @delt/profil), eller null.
create function intern.direkte_profilkort(bruker uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', p.id, 'username', p.username, 'first_name', p.first_name, 'last_name', p.last_name,
    'avatar_path', p.avatar_path, 'updated_at', p.updated_at
  )
  from public.profiles p where p.id = direkte_profilkort.bruker
$$;

revoke all on function intern.direkte_profilkort(uuid) from public, anon, authenticated, service_role;

-- Én melding slik appen får den: samme form som en gruppemelding
-- (`Gruppemelding` i src/gruppechat/modell.ts). `kan_skrive` er om den
-- innloggede kan skrive i samtalen nå, regnet ut av kalleren.
create function intern.direktemelding_json(m public.direktemeldinger, kan_skrive boolean)
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
    'forfatter', intern.direkte_profilkort(m.forfatter_id),
    'tekst', m.tekst,
    'skrevet_kl', m.skrevet_kl,
    'redigert_kl', m.redigert_kl,
    'slettet', case when m.slettet_kl is not null then jsonb_build_object('av', m.slettet_som, 'kl', m.slettet_kl) end,
    'egen', e.egen,
    'klient_id', case when e.egen then m.klient_id end,
    'kan_endre', e.egen and m.slettet_kl is null and coalesce(kan_skrive, false),
    -- Begge deltakerne kan slette, også når det ikke kan skrives (beslutning 5).
    'kan_slette', m.slettet_kl is null
  )
  from e
$$;

revoke all on function intern.direktemelding_json(public.direktemeldinger, boolean) from public, anon, authenticated, service_role;

create function intern.direktemelding_svar(melding uuid, bruker uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.direktemelding_json(m, intern.direktesperre(bruker, intern.direkte_motpart(s, bruker)) is null)
  from public.direktemeldinger m
  join public.direktesamtaler s on s.id = m.samtale_id
  where m.id = direktemelding_svar.melding
$$;

revoke all on function intern.direktemelding_svar(uuid, uuid) from public, anon, authenticated, service_role;

-- Det visningen trenger om samtalen, for den innloggede: den andre, om det kan
-- skrives og hvorfor ikke, og om samtalen er dempet.
create function intern.direktesamtale_meta(s public.direktesamtaler, bruker uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with x as (select intern.direkte_motpart(s, bruker) as motpart)
  select jsonb_build_object(
    'motpart', intern.direkte_profilkort(x.motpart),
    'sperre', intern.direktesperre(bruker, x.motpart),
    'dempet', coalesce((
      select st.dempet from public.direktesamtale_status st where st.samtale_id = s.id and st.bruker_id = bruker
    ), false)
  )
  from x
$$;

revoke all on function intern.direktesamtale_meta(public.direktesamtaler, uuid) from public, anon, authenticated, service_role;

-- Uleste meldinger fra den andre etter det `bruker` har lest.
create function intern.direktesamtale_uleste(samtale uuid, bruker uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.direktemeldinger m
  where m.samtale_id = direktesamtale_uleste.samtale
    and m.nr > coalesce((
      select st.lest_til_nr from public.direktesamtale_status st
      where st.samtale_id = direktesamtale_uleste.samtale and st.bruker_id = direktesamtale_uleste.bruker
    ), 0)
    and m.forfatter_id is distinct from direktesamtale_uleste.bruker
    and m.slettet_kl is null
    and m.skrevet_kl >= now() - intern.direktemelding_lagringstid()
$$;

revoke all on function intern.direktesamtale_uleste(uuid, uuid) from public, anon, authenticated, service_role;

-- Øker endringstelleren (og løpenummeret for en ny melding). Kalles med raden låst.
create function intern.neste_direkteendring(samtale uuid, ny_melding boolean)
returns public.direktesamtaler
language sql
security definer
set search_path = ''
as $$
  update public.direktesamtaler s
  set siste_nr = s.siste_nr + case when neste_direkteendring.ny_melding then 1 else 0 end,
      siste_endring = s.siste_endring + 1,
      siste_melding_kl = case when neste_direkteendring.ny_melding then now() else s.siste_melding_kl end,
      endret_kl = now()
  where s.id = neste_direkteendring.samtale
  returning s.*
$$;

revoke all on function intern.neste_direkteendring(uuid, boolean) from public, anon, authenticated, service_role;

-- Sletter meldingene i samtalen som er eldre enn lagringstiden. Kalles med
-- samtalens rad låst.
create function intern.slett_utgatte_direktemeldinger(samtale uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.direktemeldinger m
  where m.samtale_id = slett_utgatte_direktemeldinger.samtale
    and m.skrevet_kl < now() - intern.direktemelding_lagringstid()
$$;

revoke all on function intern.slett_utgatte_direktemeldinger(uuid) from public, anon, authenticated, service_role;

-- --- Valgene ------------------------------------------------------------------------

create function public.mine_chatvalg()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
begin
  return coalesce(
    (select jsonb_build_object('tillat_direktemeldinger', v.tillat_direktemeldinger, 'vis_aktiv', v.vis_aktiv)
     from public.chatvalg v where v.bruker_id = aktor),
    jsonb_build_object('tillat_direktemeldinger', false, 'vis_aktiv', false)
  );
end;
$$;

-- Endrer egne valg; null er uendret. Raden låses for endring, så en sending
-- som pågår, er ferdig først. Slås aktivitetsstatusen av, er prikken borte
-- med en gang.
create function public.sett_chatvalg(tillat boolean default null, vis_aktiv boolean default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  v public.chatvalg;
begin
  v := intern.las_egne_chatvalg(aktor);
  update public.chatvalg x
  set tillat_direktemeldinger = coalesce(sett_chatvalg.tillat, v.tillat_direktemeldinger),
      vis_aktiv = coalesce(sett_chatvalg.vis_aktiv, v.vis_aktiv),
      endret_kl = now()
  where x.bruker_id = aktor
  returning * into v;
  if not v.vis_aktiv then
    delete from public.chataktivitet a where a.bruker_id = aktor;
  end if;
  return public.mine_chatvalg();
end;
$$;

-- --- Søket og samtalene ---------------------------------------------------------------

-- Profilkortene (ID, brukernavn, fornavn, etternavn) til andre som selv har
-- slått på, med aktivt medlemskap, uten blokkering noen vei. Krever at den
-- som søker, har slått på, og minst to tegn. Høyst 20 treff. Søket lagres ikke.
create function public.sok_direktemottakere(sok text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  ord text := lower(btrim(coalesce(sok, '')));
  monster text;
begin
  if not intern.tillater_direktemeldinger(aktor) then
    raise exception 'Slå på «Tillat direktemeldinger» for å finne andre.' using errcode = 'PT409';
  end if;
  if char_length(ord) < 2 then
    raise exception 'Skriv minst to tegn.' using errcode = '22023';
  end if;
  monster := '%' || replace(replace(replace(ord, '\', '\\'), '%', '\%'), '_', '\_') || '%';
  return coalesce((
    select jsonb_agg(
      jsonb_build_object('id', t.id, 'username', t.username, 'first_name', t.first_name, 'last_name', t.last_name)
      order by lower(t.first_name), lower(t.last_name), t.username
    )
    from (
      select p.id, p.username, p.first_name, p.last_name
      from public.chatvalg v
      join public.profiles p on p.id = v.bruker_id
      where v.tillat_direktemeldinger
        and p.id <> aktor
        and (
          lower(p.username) like monster
          or lower(concat_ws(' ', p.first_name, p.last_name)) like monster
          or lower(coalesce(p.last_name, '')) like monster
        )
        and intern.sokbar_for(p.id, aktor)
      order by lower(p.first_name), lower(p.last_name), p.username
      limit 20
    ) t
  ), '[]'::jsonb);
end;
$$;

-- Samtalen med `mottaker`. Finnes den, gis den uansett brytere og
-- blokkeringer (historikken kan leses). Ellers opprettes den bare når en ny
-- melding kunne vært sendt, under de samme låsene som sendingen, og høyst 10
-- nye i timen. To som starter samtidig, får samme samtale.
create function public.aapne_direktesamtale(mottaker uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  lav uuid := least(aktor, aapne_direktesamtale.mottaker);
  hoy uuid := greatest(aktor, aapne_direktesamtale.mottaker);
  ny uuid;
begin
  if aapne_direktesamtale.mottaker = aktor then
    raise exception 'Du kan ikke sende direktemeldinger til deg selv.' using errcode = '22023';
  end if;
  if aapne_direktesamtale.mottaker is null then
    raise exception 'Personen finnes ikke, eller kan ikke motta direktemeldinger.' using errcode = '42501';
  end if;
  select s.id into ny from public.direktesamtaler s where s.bruker_lav = lav and s.bruker_hoy = hoy;
  if ny is not null then
    return ny;
  end if;
  perform intern.las_direkteavsender(aktor);
  if not intern.tillater_direktemeldinger(aktor) then
    raise exception 'Slå på «Tillat direktemeldinger» for å starte en samtale.' using errcode = 'PT409';
  end if;
  if (
    select count(*) from public.direktesamtaler s
    where s.opprettet_av = aktor and s.opprettet_kl > now() - interval '1 hour'
  ) >= (intern.direktemelding_grenser() ->> 'maks_nye_samtaler_per_time')::int then
    raise exception 'Du har startet mange nye samtaler. Vent litt og prøv igjen.' using errcode = 'PT429';
  end if;
  perform intern.las_direktevilkar(lav, hoy);
  if intern.direktesperre(aktor, aapne_direktesamtale.mottaker) is not null then
    raise exception 'Personen finnes ikke, eller kan ikke motta direktemeldinger.' using errcode = '42501';
  end if;
  insert into public.direktesamtaler (bruker_lav, bruker_hoy, opprettet_av)
  values (lav, hoy, aktor)
  on conflict (bruker_lav, bruker_hoy) do nothing
  returning id into ny;
  if ny is null then
    select s.id into ny from public.direktesamtaler s where s.bruker_lav = lav and s.bruker_hoy = hoy;
  end if;
  return ny;
end;
$$;

-- Samtalene: ID, den andre (null for en slettet konto), siste aktivitet,
-- uleste, om den er dempet og om det kan skrives. Ingen tekst. Ikke de
-- skjulte, og ikke en samtale uten meldinger som den andre startet.
create function public.mine_direktesamtaler()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  frist timestamptz := now() - intern.direktemelding_lagringstid();
begin
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', x.id,
        'motpart', intern.direkte_profilkort(x.motpart),
        'siste_kl', x.siste_kl,
        'uleste', intern.direktesamtale_uleste(x.id, aktor),
        'dempet', coalesce(x.dempet, false),
        'kan_skrive', intern.direktesperre(aktor, x.motpart) is null
      )
      order by x.siste_kl desc nulls last, x.opprettet_kl desc, x.id
    )
    from (
      select s.id, s.opprettet_kl, intern.direkte_motpart(s, aktor) as motpart, st.dempet,
        (select m.skrevet_kl from public.direktemeldinger m
         where m.samtale_id = s.id and m.slettet_kl is null and m.skrevet_kl >= frist
         order by m.nr desc limit 1) as siste_kl
      from public.direktesamtaler s
      left join public.direktesamtale_status st on st.samtale_id = s.id and st.bruker_id = aktor
      where aktor in (s.bruker_lav, s.bruker_hoy)
        and s.bruker_lav is distinct from s.bruker_hoy
        and (st.skjult_til_nr is null or s.siste_nr > st.skjult_til_nr)
        and (s.siste_nr > 0 or s.opprettet_av = aktor)
    ) x
  ), '[]'::jsonb);
end;
$$;

-- --- Lesingen ---------------------------------------------------------------------------

-- Meldingene før `for_nr` (uten: de nyeste), høyst `antall` (1–100), stigende
-- etter `nr`, og det visningen trenger. Som `les_gruppechat`, med `kan_skrive`
-- og `direkte` (den andre, sperren og dempingen) og `lesere` for de to.
create function public.les_direktesamtale(samtale uuid, for_nr bigint default null, antall integer default 50)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  n int := least(greatest(coalesce(les_direktesamtale.antall, 50), 1), 100);
  frist timestamptz := now() - intern.direktemelding_lagringstid();
  s public.direktesamtaler := intern.krev_direktesamtale(les_direktesamtale.samtale, aktor);
  kan_skrive boolean;
begin
  -- Bare når den eldste meldingen er utgått, låses samtalen for ryddingen.
  if (select m.skrevet_kl from public.direktemeldinger m where m.samtale_id = s.id order by m.nr limit 1) < frist then
    perform 1 from public.direktesamtaler x where x.id = s.id for update;
    perform intern.slett_utgatte_direktemeldinger(s.id);
  end if;
  kan_skrive := intern.direktesperre(aktor, intern.direkte_motpart(s, aktor)) is null;
  return (
    with side as (
      select m.*
      from public.direktemeldinger m
      where m.samtale_id = s.id
        and (les_direktesamtale.for_nr is null or m.nr < les_direktesamtale.for_nr)
        and m.skrevet_kl >= frist
      order by m.nr desc
      limit n + 1
    )
    select jsonb_build_object(
      'meldinger', coalesce((
        select jsonb_agg(intern.direktemelding_json(x, kan_skrive) order by x.nr)
        from (select * from side order by side.nr desc limit n) x
      ), '[]'::jsonb),
      'flere_eldre', (select count(*) from side) > n,
      'siste_endring', coalesce((select x.siste_endring from public.direktesamtaler x where x.id = s.id), 0),
      'lest_til_nr', coalesce((
        select st.lest_til_nr from public.direktesamtale_status st where st.samtale_id = s.id and st.bruker_id = aktor
      ), 0),
      'kan_skrive', kan_skrive,
      'kan_moderere', false,
      'lesere', jsonb_build_object('medlemmer', 2, 'systemarkitekter', false),
      'grenser', jsonb_build_object(
        'maks_tegn', intern.direktemelding_grenser() -> 'maks_tegn',
        'maks_per_minutt', intern.direktemelding_grenser() -> 'maks_per_minutt'
      ),
      'direkte', intern.direktesamtale_meta(s, aktor)
    )
  );
end;
$$;

-- Det som er skrevet, endret eller slettet etter endringstelleren `etter`,
-- som `gruppechat_endringer`. Har også `kan_skrive` og `direkte`, så en åpen
-- samtale ser at den andre har slått av eller blokkert innen neste livstegn.
create function public.direktesamtale_endringer(samtale uuid, etter bigint, antall integer default 200)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  n int := least(greatest(coalesce(direktesamtale_endringer.antall, 200), 1), 500);
  s public.direktesamtaler := intern.krev_direktesamtale(direktesamtale_endringer.samtale, aktor);
  kan_skrive boolean := intern.direktesperre(aktor, intern.direkte_motpart(s, aktor)) is null;
begin
  return (
    with endret as (
      select m.*
      from public.direktemeldinger m
      where m.samtale_id = s.id
        and m.endring > coalesce(direktesamtale_endringer.etter, 0)
        and m.skrevet_kl >= now() - intern.direktemelding_lagringstid()
      order by m.endring
      limit n + 1
    ),
    svar as (
      select * from endret order by endret.endring limit n
    )
    select jsonb_build_object(
      'meldinger', coalesce((
        select jsonb_agg(intern.direktemelding_json(x, kan_skrive) order by x.endring) from svar x
      ), '[]'::jsonb),
      'siste_endring', case
        when (select count(*) from endret) > n then (select max(x.endring) from svar x)
        else greatest(s.siste_endring, coalesce(direktesamtale_endringer.etter, 0))
      end,
      'flere', (select count(*) from endret) > n,
      -- Meldinger skrevet før dette er utgått; en åpen samtale fjerner dem.
      'frist', now() - intern.direktemelding_lagringstid(),
      'kan_skrive', kan_skrive,
      'direkte', intern.direktesamtale_meta(s, aktor)
    )
  );
end;
$$;

-- --- Skrivingen --------------------------------------------------------------------------

-- Sender en melding (docs/direktemeldinger-personvern.md, «Låsing og
-- samtidighet»). Samme `klient_id` fra samme avsender i samme samtale gir den
-- samme meldingen tilbake, uten vaktene og uten å telle i takten.
create function public.send_direktemelding(samtale uuid, klient_id uuid, tekst text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  s public.direktesamtaler := intern.krev_direktesamtale(send_direktemelding.samtale, aktor);
  grenser jsonb := intern.direktemelding_grenser();
  t text;
  ny uuid;
begin
  if send_direktemelding.klient_id is null then
    raise exception 'Meldingen mangler klient-ID.' using errcode = '22023';
  end if;
  -- 0: én om gangen per avsender, før takten telles.
  perform intern.las_direkteavsender(aktor);
  -- En utgått melding gis aldri tilbake: den slettes under før den nye settes inn.
  select m.id into ny from public.direktemeldinger m
  where m.samtale_id = s.id and m.forfatter_id = aktor and m.klient_id = send_direktemelding.klient_id
    and m.skrevet_kl >= now() - intern.direktemelding_lagringstid();
  if ny is not null then
    return intern.direktemelding_svar(ny, aktor);
  end if;
  t := intern.gyldig_meldingstekst(send_direktemelding.tekst);
  if (
    select count(*) from public.direktemeldinger m
    where m.samtale_id = s.id and m.forfatter_id = aktor and m.skrevet_kl > now() - interval '60 seconds'
  ) >= (grenser ->> 'maks_per_minutt')::int
  or (
    select count(*) from public.direktemeldinger m
    where m.forfatter_id = aktor and m.skrevet_kl > now() - interval '60 seconds'
  ) >= (grenser ->> 'maks_per_minutt_totalt')::int then
    raise exception 'Du sender meldinger for fort. Vent litt og prøv igjen.' using errcode = 'PT429';
  end if;
  -- 1 og 2: medlemskapene og begge deltakernes valg; 3: samtalen.
  perform intern.las_direktevilkar(s.bruker_lav, s.bruker_hoy);
  select * into s from public.direktesamtaler x where x.id = s.id for update;
  perform intern.slett_utgatte_direktemeldinger(s.id);
  -- 4: først nå leses medlemskapene, bryterne og blokkeringene.
  perform intern.krev_aktivt_medlemskap();
  perform intern.krev_uten_direktesperre(aktor, intern.direkte_motpart(s, aktor));
  s := intern.neste_direkteendring(s.id, true);
  insert into public.direktemeldinger (samtale_id, nr, forfatter_id, klient_id, tekst, endring)
  values (s.id, s.siste_nr, aktor, send_direktemelding.klient_id, t, s.siste_endring)
  returning id into ny;
  return intern.direktemelding_svar(ny, aktor);
end;
$$;

-- Erstatter teksten i en egen melding, bare så lenge det kan sendes i
-- samtalen. Den gamle teksten lagres ikke. Uendret tekst gir meldingen som den er.
create function public.endre_direktemelding(melding uuid, tekst text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  m public.direktemeldinger := intern.krev_direktemelding(endre_direktemelding.melding, aktor);
  s public.direktesamtaler;
  t text;
begin
  if m.forfatter_id is distinct from aktor then
    raise exception 'Bare den som skrev meldingen, kan endre den.' using errcode = '42501';
  end if;
  t := intern.gyldig_meldingstekst(endre_direktemelding.tekst);
  s := intern.krev_direktesamtale(m.samtale_id, aktor);
  perform intern.las_direktevilkar(s.bruker_lav, s.bruker_hoy);
  select * into s from public.direktesamtaler x where x.id = s.id for update;
  m := intern.krev_direktemelding(endre_direktemelding.melding, aktor);
  if m.slettet_kl is not null then
    raise exception 'Meldingen er slettet og kan ikke endres.' using errcode = 'PT409';
  end if;
  perform intern.krev_aktivt_medlemskap();
  perform intern.krev_uten_direktesperre(aktor, intern.direkte_motpart(s, aktor));
  if t is distinct from m.tekst then
    s := intern.neste_direkteendring(s.id, false);
    update public.direktemeldinger x
    set tekst = t, redigert_kl = now(), endring = s.siste_endring
    where x.id = m.id;
  end if;
  return intern.direktemelding_svar(m.id, aktor);
end;
$$;

-- Sletter en melding: hvem som helst av de to, også når det ikke kan sendes
-- lenger (beslutning 5). Teksten fjernes med en gang; hvem og når står igjen.
-- En melding som alt er slettet, gis som den er.
create function public.slett_direktemelding(melding uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  m public.direktemeldinger := intern.krev_direktemelding(slett_direktemelding.melding, aktor);
  s public.direktesamtaler;
begin
  select * into s from public.direktesamtaler x where x.id = m.samtale_id for update;
  m := intern.krev_direktemelding(slett_direktemelding.melding, aktor);
  if m.slettet_kl is null then
    s := intern.neste_direkteendring(s.id, false);
    update public.direktemeldinger x
    set tekst = null,
        slettet_kl = now(),
        slettet_som = case when m.forfatter_id is not distinct from aktor then 'forfatter' else 'motpart' end,
        endring = s.siste_endring
    where x.id = m.id;
  end if;
  return intern.direktemelding_svar(m.id, aktor);
end;
$$;

-- --- Egen status ---------------------------------------------------------------------------

-- Egen rad i statusen, laget når den mangler.
create function intern.egen_direktestatus(samtale uuid, bruker uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.direktesamtale_status (samtale_id, bruker_id)
  values (egen_direktestatus.samtale, egen_direktestatus.bruker)
  on conflict (samtale_id, bruker_id) do nothing
$$;

revoke all on function intern.egen_direktestatus(uuid, uuid) from public, anon, authenticated, service_role;

-- Merker meldingene til og med `til_nr` lest. Flytter bare framover, og aldri
-- forbi den siste meldingen.
create function public.merk_direktesamtale_lest(samtale uuid, til_nr bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  s public.direktesamtaler := intern.krev_direktesamtale(merk_direktesamtale_lest.samtale, aktor);
  til bigint := least(coalesce(merk_direktesamtale_lest.til_nr, 0), s.siste_nr);
begin
  if til <= 0 then
    return;
  end if;
  insert into public.direktesamtale_status as st (samtale_id, bruker_id, lest_til_nr)
  values (s.id, aktor, til)
  on conflict (samtale_id, bruker_id) do update
    set lest_til_nr = greatest(st.lest_til_nr, excluded.lest_til_nr);
end;
$$;

-- Demper samtalen for den innloggede: den teller ikke på chatknappen. Den
-- andre får ikke vite det.
create function public.demp_direktesamtale(samtale uuid, dempet boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  s public.direktesamtaler := intern.krev_direktesamtale(demp_direktesamtale.samtale, aktor);
begin
  perform intern.egen_direktestatus(s.id, aktor);
  update public.direktesamtale_status st
  set dempet = coalesce(demp_direktesamtale.dempet, false)
  where st.samtale_id = s.id and st.bruker_id = aktor;
end;
$$;

-- Skjuler samtalen fra egen liste til det kommer en ny melding. Sletter ingenting.
create function public.skjul_direktesamtale(samtale uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  s public.direktesamtaler := intern.krev_direktesamtale(skjul_direktesamtale.samtale, aktor);
begin
  perform intern.egen_direktestatus(s.id, aktor);
  update public.direktesamtale_status st
  set skjult_til_nr = s.siste_nr
  where st.samtale_id = s.id and st.bruker_id = aktor;
end;
$$;

-- --- Blokkeringen -------------------------------------------------------------------------

-- Blokkerer `bruker` fra direktemeldinger: virker begge veier for ny sending,
-- i søket og for aktivitetsprikken, til den oppheves. Sletter ingenting. Bare
-- en man har en samtale med eller kan finne i søket; ellers som for en person
-- som ikke finnes. Egen rad i `chatvalg` låses, så en sending som pågår, er
-- ferdig først.
create function public.blokker_bruker(bruker uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
begin
  if blokker_bruker.bruker = aktor then
    raise exception 'Du kan ikke blokkere deg selv.' using errcode = '22023';
  end if;
  perform intern.las_egne_chatvalg(aktor);
  if blokker_bruker.bruker is null or not (
    intern.har_blokkert(aktor, blokker_bruker.bruker)
    or exists (
      select 1 from public.direktesamtaler s
      where s.bruker_lav = least(aktor, blokker_bruker.bruker) and s.bruker_hoy = greatest(aktor, blokker_bruker.bruker)
    )
    or intern.sokbar_for(blokker_bruker.bruker, aktor)
  ) then
    raise exception 'Personen finnes ikke, eller kan ikke motta direktemeldinger.' using errcode = '42501';
  end if;
  insert into public.direktemelding_blokkeringer (blokkerer, blokkert)
  values (aktor, blokker_bruker.bruker)
  on conflict (blokkerer, blokkert) do nothing;
end;
$$;

create function public.opphev_blokkering(bruker uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
begin
  perform intern.las_egne_chatvalg(aktor);
  delete from public.direktemelding_blokkeringer b where b.blokkerer = aktor and b.blokkert = opphev_blokkering.bruker;
end;
$$;

-- Dem den innloggede har blokkert, med profilkortet.
create function public.mine_blokkeringer()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
begin
  return coalesce((
    select jsonb_agg(intern.direkte_profilkort(b.blokkert) order by b.opprettet_kl desc)
    from public.direktemelding_blokkeringer b
    where b.blokkerer = aktor and exists (select 1 from public.profiles p where p.id = b.blokkert)
  ), '[]'::jsonb);
end;
$$;

-- --- Aktivitetsstatusen ---------------------------------------------------------------------

-- Setter fristen to minutter fram når «Vis når jeg er aktiv» er på; ellers
-- ingenting. Appen kaller den bare ved faktisk bruk, høyst én gang i minuttet.
create function public.marker_chataktivitet()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
begin
  delete from public.chataktivitet a where a.aktiv_til < now();
  if coalesce((select v.vis_aktiv from public.chatvalg v where v.bruker_id = aktor), false) then
    insert into public.chataktivitet as a (bruker_id, aktiv_til)
    values (aktor, now() + interval '2 minutes')
    on conflict (bruker_id) do update set aktiv_til = excluded.aktiv_til;
  end if;
end;
$$;

-- ID-ene til samtalepartnerne som er aktive nå: de har «Vis når jeg er aktiv»
-- på, aktivt medlemskap, ingen blokkering noen vei, og har brukt OUSFAR de
-- siste to minuttene. Aldri et tidspunkt.
create function public.aktive_motparter()
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
begin
  delete from public.chataktivitet a where a.aktiv_til < now();
  return coalesce((
    select array_agg(distinct x.motpart order by x.motpart)
    from (
      select intern.direkte_motpart(s, aktor) as motpart
      from public.direktesamtaler s
      where aktor in (s.bruker_lav, s.bruker_hoy)
    ) x
    join public.chataktivitet a on a.bruker_id = x.motpart and a.aktiv_til >= now()
    join public.chatvalg v on v.bruker_id = x.motpart and v.vis_aktiv
    where intern.har_aktivt_medlemskap(x.motpart)
      and not intern.har_blokkert(aktor, x.motpart)
      and not intern.har_blokkert(x.motpart, aktor)
  ), '{}'::uuid[]);
end;
$$;

-- --- Rettighetene -------------------------------------------------------------------------

revoke all on function public.mine_chatvalg() from public, anon;
revoke all on function public.sett_chatvalg(boolean, boolean) from public, anon;
revoke all on function public.sok_direktemottakere(text) from public, anon;
revoke all on function public.aapne_direktesamtale(uuid) from public, anon;
revoke all on function public.mine_direktesamtaler() from public, anon;
revoke all on function public.les_direktesamtale(uuid, bigint, integer) from public, anon;
revoke all on function public.direktesamtale_endringer(uuid, bigint, integer) from public, anon;
revoke all on function public.send_direktemelding(uuid, uuid, text) from public, anon;
revoke all on function public.endre_direktemelding(uuid, text) from public, anon;
revoke all on function public.slett_direktemelding(uuid) from public, anon;
revoke all on function public.merk_direktesamtale_lest(uuid, bigint) from public, anon;
revoke all on function public.demp_direktesamtale(uuid, boolean) from public, anon;
revoke all on function public.skjul_direktesamtale(uuid) from public, anon;
revoke all on function public.blokker_bruker(uuid) from public, anon;
revoke all on function public.opphev_blokkering(uuid) from public, anon;
revoke all on function public.mine_blokkeringer() from public, anon;
revoke all on function public.marker_chataktivitet() from public, anon;
revoke all on function public.aktive_motparter() from public, anon;

grant execute on function public.mine_chatvalg() to authenticated;
grant execute on function public.sett_chatvalg(boolean, boolean) to authenticated;
grant execute on function public.sok_direktemottakere(text) to authenticated;
grant execute on function public.aapne_direktesamtale(uuid) to authenticated;
grant execute on function public.mine_direktesamtaler() to authenticated;
grant execute on function public.les_direktesamtale(uuid, bigint, integer) to authenticated;
grant execute on function public.direktesamtale_endringer(uuid, bigint, integer) to authenticated;
grant execute on function public.send_direktemelding(uuid, uuid, text) to authenticated;
grant execute on function public.endre_direktemelding(uuid, text) to authenticated;
grant execute on function public.slett_direktemelding(uuid) to authenticated;
grant execute on function public.merk_direktesamtale_lest(uuid, bigint) to authenticated;
grant execute on function public.demp_direktesamtale(uuid, boolean) to authenticated;
grant execute on function public.skjul_direktesamtale(uuid) to authenticated;
grant execute on function public.blokker_bruker(uuid) to authenticated;
grant execute on function public.opphev_blokkering(uuid) to authenticated;
grant execute on function public.mine_blokkeringer() to authenticated;
grant execute on function public.marker_chataktivitet() to authenticated;
grant execute on function public.aktive_motparter() to authenticated;

-- --- Lagringstiden for alle samtaler ----------------------------------------------------------

-- Sletter de utgåtte meldingene i alle samtaler, én samtale om gangen under
-- samtalens lås, og samtalene uten meldinger igjen og uten aktivitet de
-- siste 12 månedene, eller der begge kontoene er slettet, med statusen sin.
-- Gir hvor mange meldinger. Kalles av nattjobben, ikke fra nettleseren.
create function intern.rydd_direktemeldinger()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  s uuid;
  antall integer := 0;
  slettet integer;
begin
  for s in
    select distinct m.samtale_id from public.direktemeldinger m
    where m.skrevet_kl < now() - intern.direktemelding_lagringstid()
  loop
    perform 1 from public.direktesamtaler x where x.id = s for update;
    delete from public.direktemeldinger m
    where m.samtale_id = s and m.skrevet_kl < now() - intern.direktemelding_lagringstid();
    get diagnostics slettet = row_count;
    antall := antall + slettet;
  end loop;
  delete from public.direktesamtaler x
  where (
      x.endret_kl < now() - intern.direktemelding_lagringstid()
      and not exists (select 1 from public.direktemeldinger m where m.samtale_id = x.id)
    )
    or (x.bruker_lav is null and x.bruker_hoy is null);
  return antall;
end;
$$;

revoke all on function intern.rydd_direktemeldinger() from public, anon, authenticated, service_role;

comment on function intern.rydd_direktemeldinger() is
  'D5: sletter direktemeldinger eldre enn lagringstiden (12 måneder, beslutning 2) og tomme, gamle samtaler. Se docs/direktemeldinger-personvern.md.';

-- --- Profilene --------------------------------------------------------------------------------

-- Som før (20261114232000), og den andre i en direktesamtale seeren er med i,
-- mens direktemeldingene er slått på: navn og bilde står ved meldingene også
-- etter at den andre har slått av eller blokkert. Søketreffene gis av
-- funksjonen og gjør ingen profil synlig her.
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
  union
  -- D5: den andre i direktesamtalene seeren er med i.
  select case when s.bruker_lav = synlige_profiler.seer then s.bruker_hoy else s.bruker_lav end
  from public.direktesamtaler s
  where intern.direktemeldinger_aktivert()
    and synlige_profiler.seer in (s.bruker_lav, s.bruker_hoy)
    and s.bruker_lav is not null
    and s.bruker_hoy is not null
$$;

-- --- Sanntiden ---------------------------------------------------------------------------------

-- Dørklokken: raden har ingen tekst og ingen avsender, og radsikkerheten over
-- avgjør hvem som får hendelsene. Ingen andre tabeller herfra legges til.
alter publication supabase_realtime add table public.direktesamtaler;
