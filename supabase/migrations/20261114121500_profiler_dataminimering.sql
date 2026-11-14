-- P2c: profiler og profilbilder etter dataminimering.
--
-- Før: alle innloggede leste alle kolonnene i alle profiler, også den gamle
-- adminrollen (`role`) og kontostatusen (`must_change_password`,
-- `onboarding_completed`), og så alle profilbildene. Med flere fagmiljøer
-- ville det vært en nasjonal katalog med roller (P0 §2.8, §4).
--
-- Etter (docs/fagmiljoer.md, «Profiler og profilbilder»):
--
--   1. Andres profil er bare et profilkort: ID, brukernavn, navn og bilde,
--      med tidspunktet bildet sist ble endret. Rollen og kontostatusen leses
--      ikke av andre enn kontoen selv (kolonnerettighetene).
--   2. En innlogget ser profilkortet til seg selv, til dem hen har et aktivt
--      fagmiljø felles med, til medlemmene i fagmiljøene hen administrerer, til
--      dem som står bak hendelsene i egne varsler, og til forfatterne av
--      trådene, kommentarene og idéene hen selv kan lese. En systemarkitekt
--      ser alle. Forfatterdelen kjøres som den innloggede og følger dermed
--      radsikkerheten på samhandlingstabellene (P2b) av seg selv.
--   3. Et profilbilde kan sees av den som kan se profilen som peker på det,
--      og eieren ser alltid sin egen fil.
--   4. Den egne, hele profilen gis av `public.min_profil()`.
--   5. Brukerlista for administrasjonen får rolle og kontostatus fra
--      `public.brukeroversikt()`, bare for kontoene den innloggede
--      administrerer (systemarkitekt: alle; lokal administrator: medlemmene i
--      egne fagmiljøer).
--
-- Den begrensende regelen `aktivt_medlemskap` fra P2.0 står uendret.
-- Ingen data endres. Tilbakeføring: en ny migrasjon som gir tilbake
-- `grant select on public.profiles to authenticated`, setter de to tillatende
-- lesereglene tilbake til `true`/`bucket_id = 'avatarer'` og fjerner
-- funksjonene og indeksene her.

-- --- Hvem som ser hvem ----------------------------------------------------

-- Delen av regelen som ikke avhenger av hva den innloggede kan lese i andre
-- tabeller: kontoene `seer` ser profilkortet til. Den eneste definisjonen;
-- regelen på `profiles` og dermed bildene bygger på den. Regnet ut som en
-- mengde, én gang per spørring, ikke per profil (se «Ytelse» i dokumentet).
-- Fagmiljøene avgjøres av de felles hjelperne (docs/fagmiljoer.md).
create function intern.synlige_profiler(seer uuid)
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
  -- De som står bak en hendelse i et av seerens egne varsler.
  select (h ->> 'av')::uuid
  from public.varsler v
  cross join lateral jsonb_array_elements(v.hendelser) h
  where v.mottaker_id = synlige_profiler.seer
    and (h ->> 'av') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
$$;

revoke all on function intern.synlige_profiler(uuid) from public, anon, authenticated, service_role;

comment on function intern.synlige_profiler(uuid) is
  'P2c: kontoene seer ser profilkortet til, uten forfatterne i samhandlingen (de prøves i regelen på profiles). Se docs/fagmiljoer.md.';

-- Den innloggedes mengde, til regelen på `profiles`, som bruker den som
-- `(select public.mine_synlige_profiler())`. Tom for en bruker uten aktivt
-- medlemskap, i stedet for å stoppe: regelen evalueres også der den
-- begrensende regelen alt har sagt nei.
create function public.mine_synlige_profiler()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.har_aktivt_medlemskap((select auth.uid())) then '{}'::uuid[]
    else coalesce((select array_agg(s order by s) from intern.synlige_profiler((select auth.uid())) s), '{}'::uuid[])
  end
$$;

revoke all on function public.mine_synlige_profiler() from public, anon, authenticated, service_role;
grant execute on function public.mine_synlige_profiler() to authenticated;

comment on function public.mine_synlige_profiler() is
  'P2c: kontoene den innloggede ser profilkortet til (uten forfatterdelen). Brukes av radsikkerheten på profiles.';

-- Forfatterdelen slås opp per profil; indeksene gjør hvert oppslag til ett
-- indekstreff. Tabellene er små, så indeksene lages uten å låse lenge.
create index if not exists diskusjoner_forfatter_idx on public.diskusjoner (forfatter_id);
create index if not exists diskusjonskommentarer_forfatter_idx on public.diskusjonskommentarer (forfatter_id);
create index if not exists ideer_forfatter_idx on public.ideer (forfatter_id);
create index if not exists idekommentarer_forfatter_idx on public.idekommentarer (forfatter_id);

-- Bildet slås opp fra stien. Stien er unik, fordi den er bygd av ID-en
-- (`profiles_avatar_path_egen`).
create unique index if not exists profiles_avatar_path_idx on public.profiles (avatar_path) where avatar_path is not null;

-- --- Profilene --------------------------------------------------------------

drop policy "Innloggede kan lese alle profiler" on public.profiles;

-- Systemarkitekten og mengden over regnes ut én gang per spørring. Forfatterne
-- prøves med `exists` som den innloggede, bare for profilene som ikke alt er
-- synlige: bare rader hen selv kan lese, teller. Reglene på de fire tabellene må derfor aldri lese
-- `public.profiles` direkte (det ville gått i ring).
create policy "Innloggede ser profilene de samhandler med"
on public.profiles for select to authenticated
using (
  (select public.er_systemarkitekt())
  or id in (select unnest((select public.mine_synlige_profiler())))
  or exists (select 1 from public.diskusjoner d where d.forfatter_id = profiles.id)
  or exists (select 1 from public.diskusjonskommentarer k where k.forfatter_id = profiles.id)
  or exists (select 1 from public.ideer i where i.forfatter_id = profiles.id)
  or exists (select 1 from public.idekommentarer k where k.forfatter_id = profiles.id)
);

-- Profilkortet: feltene andre får lese. Samme liste som `PROFILKORT` i
-- supabase/functions/_delt/profil.ts; en test holder dem like. Skriveretten
-- (navn og bildesti på egen rad) står uendret.
revoke select on public.profiles from authenticated;
grant select (id, username, first_name, last_name, avatar_path, updated_at) on public.profiles to authenticated;

-- Den egne profilen, hel. Tom for en bruker uten aktivt medlemskap, slik
-- tabellen var det: appen spør da `min_medlemskapsstatus()` om hvorfor.
create function public.min_profil()
returns setof public.profiles
language sql
stable
security definer
set search_path = ''
as $$
  select p.*
  from public.profiles p
  where p.id = (select auth.uid())
    and intern.har_aktivt_medlemskap(p.id)
$$;

revoke all on function public.min_profil() from public, anon, authenticated, service_role;
grant execute on function public.min_profil() to authenticated;

comment on function public.min_profil() is
  'P2c: den innloggedes egen profil med alle feltene. Andre profiler leses som profilkort fra tabellen.';

-- Brukerlista i administrasjonen: kontoene den innloggede administrerer,
-- med rollen og om kontoen står i førstegangsoppsett. En systemarkitekt får
-- alle, en lokal administrator medlemmene (også de inviterte) i fagmiljøene
-- hen administrerer, alle andre ingenting. Om knappene på hver rad gjelder,
-- avgjør `mine_kontohandlinger()`; operasjonene kontrollerer på nytt selv.
create function public.brukeroversikt()
returns table (
  id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_path text,
  updated_at timestamptz,
  role public.brukerrolle,
  must_change_password boolean,
  onboarding_completed boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select p.id, p.username, p.first_name, p.last_name, p.avatar_path, p.updated_at,
    p.role, p.must_change_password, p.onboarding_completed
  from public.profiles p
  where intern.er_systemarkitekt((select auth.uid()))
    or exists (
      select 1
      from public.medlemskap m
      where m.bruker_id = p.id
        and m.status <> 'deaktivert'
        and intern.er_lokal_admin_i(m.fagmiljo_id, (select auth.uid()))
    )
  order by p.first_name, p.username
$$;

revoke all on function public.brukeroversikt() from public, anon, authenticated, service_role;
grant execute on function public.brukeroversikt() to authenticated;

comment on function public.brukeroversikt() is
  'P2c: brukerlista for administrasjonen, bare kontoene den innloggede administrerer. Se docs/fagmiljoer.md.';

-- --- Profilbildene ----------------------------------------------------------

drop policy "Innloggede kan se profilbilder" on storage.objects;

-- Profilen som peker på bildet, leses som den innloggede: bildet er synlig
-- nøyaktig når profilen er det. Eieren ser alltid sin egen fil, også før
-- profilen peker på den (opplasting i førstegangsoppsettet, `upsert`).
create policy "Innloggede ser profilbildene til profilene de ser"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatarer'
  and (
    objects.name = (select auth.uid())::text || '/avatar.webp'
    or exists (select 1 from public.profiles p where p.avatar_path = objects.name)
  )
);
