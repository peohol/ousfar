-- Varsler på enheten for flere formål enn chatten, med utsending på et
-- bestemt tidspunkt (#600). Se docs/enhetsvarsler.md.
--
-- Bygger videre på varslene om nye chatmeldinger (20261119124500_chatvarsler,
-- docs/chatvarsler.md): de samme abonnementene per enhet
-- (`public.pushabonnementer`), den samme tjenestearbeideren, krypteringen og
-- Edge-funksjonen `chatvarsel-utsending`. Ingen parallell infrastruktur.
--
-- Dette kommer til:
--   1. Formålene (`intern.enhetsvarselformal`). Et formål er en grunn til å
--      sende varsler (`chat`, senere for eksempel `kalender` fra OUSFAR
--      Personal). Eierprosjektet fører det inn med en migrasjon, med
--      funksjonsbryteren det hører til (#598), en kontroll som kjøres rett
--      før hver utsending, og mønsteret for adressene varslene kan åpne.
--   2. Valget per bruker og formål (`public.enhetsvarselvalg`), under bryteren
--      «Varsler på denne enheten». Et formål vises og kan velges bare av den
--      som har det.
--   3. De planlagte varslene (`intern.enhetsvarsler`): ett per mottaker og
--      nøkkel, sendt på et tidspunkt i UTC, byttet ut eller avlyst med
--      nøkkelen, og aldri sendt etter fristen. Eierprosjektet planlegger dem
--      fra sine egne funksjoner i databasen; nettleseren kan verken planlegge,
--      lese eller avlyse dem.
--   4. Klokken: pg_cron ser etter varsler som skal sendes, hvert minutt, og
--      ber da Edge-funksjonen om utsendingen.
--
-- Chatvarslene sendes som før, med sin egen kø; det eneste nye for dem er at
-- valget «Chatmeldinger» (på som standard) kan slås av.
--
-- Tilbakeføring: en ny migrasjon som fjerner jobben `enhetsvarsler` i
-- pg_cron, setter `intern.chatvarselmottakere` tilbake og fjerner
-- funksjonene og de tre tabellene herfra. pg_cron kan stå.

-- pg_cron finnes i Supabase; i testdatabasen, der den ikke finnes, hoppes
-- klokken over (nederst).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron with schema pg_catalog;
  end if;
end
$$;

-- --- Formålene -----------------------------------------------------------------------

create table intern.enhetsvarselformal (
  formal text primary key,
  -- Funksjonsbryteren formålet hører til (#598). Står den, har bare den som har
  -- funksjonen i et eget fagmiljø, formålet, og hvert varsel gjelder ett
  -- fagmiljø der det må gjelde.
  funksjon text references public.funksjoner (nokkel),
  -- `(bruker uuid) returns boolean`: om brukeren har formålet ellers (for
  -- chatten: om chatten er slått på).
  tilgang regprocedure,
  -- `(bruker uuid, nokkel text, data jsonb, fagmiljo uuid) returns boolean`:
  -- kjøres rett før hver utsending; usant eller en feil stopper varselet.
  kontroll regprocedure,
  -- Valget brukeren har før hen har valgt selv.
  standard boolean not null,
  -- Hvor lenge etter tidspunktet et varsel fortsatt kan sendes.
  frist interval not null default interval '15 minutes',
  -- Adressene varslene til formålet kan åpne, som regulært uttrykk. Gjelder i
  -- tillegg til den felles formen (`intern.enhetsvarsler_sti`).
  sti_monster text not null,
  rekkefolge integer not null,
  constraint enhetsvarselformal_form check (formal ~ '^[a-z][a-z0-9_]{1,30}$'),
  constraint enhetsvarselformal_frist check (frist between interval '1 minute' and interval '1 day'),
  constraint enhetsvarselformal_rekkefolge unique (rekkefolge)
);

comment on table intern.enhetsvarselformal is
  'Formålene varsler på enheten kan ha (#600). Føres inn av eierprosjektet med en migrasjon. Se docs/enhetsvarsler.md.';

revoke all on intern.enhetsvarselformal from public, anon, authenticated, service_role;

-- Kontrollerer at funksjonene et formål viser til, har formen de kalles med,
-- og at adressemønsteret er et gyldig regulært uttrykk.
create function intern.kontroller_enhetsvarselformal()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tilgang is not null and not exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid = new.tilgang and pg_catalog.oidvectortypes(p.proargtypes) = 'uuid' and p.prorettype = 'boolean'::regtype
  ) then
    raise exception 'Tilgangen til et formål må være (uuid) returns boolean.' using errcode = '23514';
  end if;
  if new.kontroll is not null and not exists (
    select 1 from pg_catalog.pg_proc p
    where p.oid = new.kontroll
      and pg_catalog.oidvectortypes(p.proargtypes) = 'uuid, text, jsonb, uuid'
      and p.prorettype = 'boolean'::regtype
  ) then
    raise exception 'Kontrollen til et formål må være (uuid, text, jsonb, uuid) returns boolean.' using errcode = '23514';
  end if;
  perform '' ~ new.sti_monster;
  return new;
end;
$$;

revoke all on function intern.kontroller_enhetsvarselformal() from public, anon, authenticated, service_role;

create trigger enhetsvarselformal_kontroll
before insert or update on intern.enhetsvarselformal
for each row execute function intern.kontroller_enhetsvarselformal();

-- --- Valgene per bruker --------------------------------------------------------------

create table public.enhetsvarselvalg (
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  formal text not null references intern.enhetsvarselformal (formal) on delete cascade,
  pa boolean not null,
  endret_kl timestamptz not null default now(),
  primary key (bruker_id, formal)
);

comment on table public.enhetsvarselvalg is
  'Hvilke formål brukeren vil ha varsler på enheten om (#600). Bare gjennom funksjonene. Se docs/enhetsvarsler.md.';

alter table public.enhetsvarselvalg enable row level security;
revoke all on public.enhetsvarselvalg from anon, authenticated;

create policy aktivt_medlemskap on public.enhetsvarselvalg as restrictive for all to authenticated
using ((select public.har_aktivt_medlemskap()))
with check ((select public.har_aktivt_medlemskap()));

-- --- De planlagte varslene -------------------------------------------------------------

-- Den felles formen på adressene et varsel kan åpne: en adresse i appen,
-- høyst 300 tegn.
-- Den samme står i `VARSELSTI` (`@delt/enhetsvarsel`) og i
-- tjenestearbeideren (`public/chatvarsler.js`).
create function intern.enhetsvarsler_sti()
returns text
language sql
immutable
set search_path = ''
as $$ select '^#/[A-Za-z0-9_./-]*$' $$;

revoke all on function intern.enhetsvarsler_sti() from public, anon, authenticated, service_role;

-- Ett varsel per formål, mottaker og nøkkel. Nøkkelen velger eierprosjektet
-- (for eksempel `vakt:<tildeling>:dagen-for`); med den byttes varselet ut
-- eller avlyses. `versjon` øker hver gang det byttes ut, så det som sendes,
-- alltid er den gjeldende versjonen (`enhetsvarsel_bekreft`). `tidsversjon`
-- er den første versjonen med det gjeldende tidspunktet: et svar på en
-- versjon fra og med den gjelder, så en enhet aldri får to varsler til samme
-- tidspunkt. `sendt_til` er enhetene (endepunktene) som har fått varselet til
-- det gjeldende tidspunktet; `ferdig_kl` står når
-- varselet er sendt eller stoppet, og raden blir stående til
-- `enhetsvarsel_oppbevaring()` etter fristen, så det samme varselet aldri
-- sendes to ganger om det planlegges på nytt.
create table intern.enhetsvarsler (
  id uuid primary key default gen_random_uuid(),
  formal text not null references intern.enhetsvarselformal (formal) on delete cascade,
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  nokkel text not null,
  fagmiljo_id uuid references public.fagmiljoer (id),
  tittel text not null,
  tekst text not null,
  sti text not null,
  merke text not null,
  data jsonb not null default '{}',
  kl timestamptz not null,
  senest_kl timestamptz not null,
  versjon integer not null default 1,
  tidsversjon integer not null default 1,
  forsok integer not null default 0,
  neste_kl timestamptz not null,
  sendt_til text[] not null default '{}',
  ferdig_kl timestamptz,
  endret_kl timestamptz not null default now(),
  constraint enhetsvarsler_nokkel unique (formal, bruker_id, nokkel),
  constraint enhetsvarsler_nokkel_form check (char_length(nokkel) between 1 and 200 and nokkel ~ '^[A-Za-z0-9:_.-]+$'),
  constraint enhetsvarsler_tittel check (tittel = btrim(tittel) and char_length(tittel) between 1 and 80),
  constraint enhetsvarsler_tekst check (tekst = btrim(tekst) and char_length(tekst) between 1 and 240),
  constraint enhetsvarsler_sti check (sti ~ intern.enhetsvarsler_sti() and char_length(sti) <= 300),
  constraint enhetsvarsler_merke check (merke ~ '^[A-Za-z0-9:_.-]{1,120}$'),
  constraint enhetsvarsler_data check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 2000),
  constraint enhetsvarsler_frist check (senest_kl >= kl and senest_kl <= kl + interval '1 day')
);

create index enhetsvarsler_neste_idx on intern.enhetsvarsler (neste_kl) where ferdig_kl is null;
create index enhetsvarsler_prefiks_idx on intern.enhetsvarsler (formal, nokkel text_pattern_ops);
create index enhetsvarsler_bruker_idx on intern.enhetsvarsler (bruker_id);
create index enhetsvarsler_senest_idx on intern.enhetsvarsler (senest_kl);

comment on table intern.enhetsvarsler is
  'Planlagte varsler på enheten (#600): ett per formål, mottaker og nøkkel, med tekst fra eierprosjektets funksjoner i databasen. Se docs/enhetsvarsler.md.';

revoke all on intern.enhetsvarsler from public, anon, authenticated, service_role;

-- Hvor lenge et varsel blir stående etter fristen, så det ikke sendes på nytt
-- om det planlegges igjen.
create function intern.enhetsvarsel_oppbevaring()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '1 day' $$;

revoke all on function intern.enhetsvarsel_oppbevaring() from public, anon, authenticated, service_role;

-- --- Hvem som har et formål, og valgene -------------------------------------------------

-- Om brukeren har formålet: aktivt medlemskap, funksjonen i minst ett eget
-- fagmiljø (når formålet har en) og formålets egen tilgang (når det har en).
create function intern.har_enhetsvarselformal(formal text, bruker uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  f intern.enhetsvarselformal;
  svar boolean;
begin
  select * into f from intern.enhetsvarselformal x where x.formal = har_enhetsvarselformal.formal;
  if not found or not intern.har_aktivt_medlemskap(bruker) then
    return false;
  end if;
  if f.funksjon is not null and not exists (
    select 1 from public.medlemskap m
    where m.bruker_id = har_enhetsvarselformal.bruker and m.status = 'aktiv'
      and intern.funksjon_tilgjengelig(f.funksjon, m.fagmiljo_id, har_enhetsvarselformal.bruker)
  ) then
    return false;
  end if;
  if f.tilgang is not null then
    execute format('select %s($1)', f.tilgang::regproc) into svar using bruker;
    return coalesce(svar, false);
  end if;
  return true;
end;
$$;

revoke all on function intern.har_enhetsvarselformal(text, uuid) from public, anon, authenticated, service_role;

-- Om brukeren vil ha varsler om formålet: eget valg, ellers formålets standard.
create function intern.enhetsvarselvalg_pa(formal text, bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select v.pa from public.enhetsvarselvalg v where v.bruker_id = enhetsvarselvalg_pa.bruker and v.formal = enhetsvarselvalg_pa.formal),
    (select f.standard from intern.enhetsvarselformal f where f.formal = enhetsvarselvalg_pa.formal),
    false
  )
$$;

revoke all on function intern.enhetsvarselvalg_pa(text, uuid) from public, anon, authenticated, service_role;

-- Formålene den innloggede har, med valget, i rekkefølgen de står i
-- innstillingene: `[{formal, pa}]`. Et formål man ikke har, står ikke her.
create function public.mine_enhetsvarselformal()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  return coalesce((
    select jsonb_agg(
      jsonb_build_object('formal', f.formal, 'pa', intern.enhetsvarselvalg_pa(f.formal, (select auth.uid())))
      order by f.rekkefolge
    )
    from intern.enhetsvarselformal f
    where intern.har_enhetsvarselformal(f.formal, (select auth.uid()))
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.mine_enhetsvarselformal() from public, anon, authenticated, service_role;
grant execute on function public.mine_enhetsvarselformal() to authenticated;

comment on function public.mine_enhetsvarselformal() is
  'Formålene for varsler på enheten den innloggede har, med valget (#600). Se docs/enhetsvarsler.md.';

-- Lagrer valget for et formål. Et formål man ikke har, gir det samme svaret
-- som noe som ikke finnes.
create function public.sett_enhetsvarselvalg(formal text, pa boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
begin
  perform intern.krev_aktivt_medlemskap();
  if aktor is null or pa is null or not intern.har_enhetsvarselformal(sett_enhetsvarselvalg.formal, aktor) then
    raise exception 'Finnes ikke.' using errcode = 'P0002';
  end if;
  insert into public.enhetsvarselvalg as v (bruker_id, formal, pa)
  values (aktor, sett_enhetsvarselvalg.formal, sett_enhetsvarselvalg.pa)
  on conflict on constraint enhetsvarselvalg_pkey do update
    set pa = excluded.pa, endret_kl = now()
    where v.pa is distinct from excluded.pa;
end;
$$;

revoke all on function public.sett_enhetsvarselvalg(text, boolean) from public, anon, authenticated, service_role;
grant execute on function public.sett_enhetsvarselvalg(text, boolean) to authenticated;

comment on function public.sett_enhetsvarselvalg(text, boolean) is
  'Lagrer om den innloggede vil ha varsler på enheten om et formål (#600). Se docs/enhetsvarsler.md.';

-- --- Planleggingen, for eierprosjektenes funksjoner i databasen ---------------------------

-- Hvor mange av de planlagte varslene som skal sendes nå. Brukes av klokken
-- og når et varsel planlegges til et tidspunkt som alt er passert.
create function intern.enhetsvarsler_klare()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from intern.enhetsvarsler v
    where v.ferdig_kl is null and v.neste_kl <= now() and v.kl <= now() and v.senest_kl >= now()
      and v.forsok < intern.chatvarsel_maks_forsok()
  )
$$;

revoke all on function intern.enhetsvarsler_klare() from public, anon, authenticated, service_role;

-- Planlegger varsler for formålet, eller bytter ut dem som har samme mottaker
-- og nøkkel. `varsler` er en liste med `{bruker, nokkel, tittel, tekst, sti,
-- kl}` og valgfritt `fagmiljo` (påkrevd når formålet har en funksjon),
-- `merke` (standard `<formål>:<nøkkel>`), `data` (til kontrollen, ingen tekst
-- fra brukerne) og `senest` (standard `kl` pluss formålets frist).
--
-- - Et varsel som alt er sendt, røres ikke når tidspunktet er det samme; et
--   nytt tidspunkt gjør det til et nytt varsel.
-- - Et uendret varsel skriver ingenting.
-- - Et varsel med fristen passert hoppes over.
--
-- Gir hvor mange varsler som ble planlagt eller byttet ut. Bare for andre
-- funksjoner i databasen; nettleseren og tjenesten har ingen tilgang.
create function intern.planlegg_enhetsvarsler(formal text, varsler jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  f intern.enhetsvarselformal;
  r record;
  antall integer;
begin
  select * into f from intern.enhetsvarselformal x where x.formal = planlegg_enhetsvarsler.formal;
  if not found then
    raise exception 'Ukjent formål for varsler på enheten.' using errcode = '22023';
  end if;
  if jsonb_typeof(varsler) is distinct from 'array' then
    raise exception 'Varslene må være en liste.' using errcode = '22023';
  end if;

  for r in
    select x.*, count(*) over (partition by x.bruker, x.nokkel) as like_mange
    from jsonb_to_recordset(varsler) as x(bruker uuid, nokkel text, fagmiljo uuid, tittel text, tekst text, sti text, merke text, data jsonb, kl timestamptz, senest timestamptz)
  loop
    if r.bruker is null or r.nokkel is null or r.kl is null or r.tittel is null or r.tekst is null or r.sti is null then
      raise exception 'Et varsel mangler mottaker, nøkkel, tidspunkt, tittel, tekst eller adresse.' using errcode = '22023';
    end if;
    if r.like_mange > 1 then
      raise exception 'To varsler har samme mottaker og nøkkel.' using errcode = '22023';
    end if;
    if (f.funksjon is null) <> (r.fagmiljo is null) then
      raise exception 'Fagmiljøet må stå når formålet har en funksjon, og bare da.' using errcode = '22023';
    end if;
    if r.sti !~ f.sti_monster then
      raise exception 'Adressen hører ikke til formålet.' using errcode = '22023';
    end if;
    perform intern.krev_uten_personnummer(r.tittel);
    perform intern.krev_uten_personnummer(r.tekst);
  end loop;

  insert into intern.enhetsvarsler as v (formal, bruker_id, nokkel, fagmiljo_id, tittel, tekst, sti, merke, data, kl, senest_kl, neste_kl)
  select f.formal, x.bruker, x.nokkel, x.fagmiljo, x.tittel, x.tekst, x.sti,
         coalesce(x.merke, f.formal || ':' || x.nokkel), coalesce(x.data, '{}'::jsonb),
         x.kl, coalesce(x.senest, x.kl + f.frist), x.kl
  from jsonb_to_recordset(varsler) as x(bruker uuid, nokkel text, fagmiljo uuid, tittel text, tekst text, sti text, merke text, data jsonb, kl timestamptz, senest timestamptz)
  where coalesce(x.senest, x.kl + f.frist) >= now()
  on conflict on constraint enhetsvarsler_nokkel do update
    set fagmiljo_id = excluded.fagmiljo_id,
        tittel = excluded.tittel,
        tekst = excluded.tekst,
        sti = excluded.sti,
        merke = excluded.merke,
        data = excluded.data,
        kl = excluded.kl,
        senest_kl = excluded.senest_kl,
        neste_kl = excluded.kl,
        versjon = v.versjon + 1,
        tidsversjon = case when v.kl = excluded.kl then v.tidsversjon else v.versjon + 1 end,
        forsok = 0,
        -- Samme tidspunkt: enhetene som alt har fått det, får det ikke igjen.
        sendt_til = case when v.kl = excluded.kl then v.sendt_til else '{}' end,
        ferdig_kl = null,
        endret_kl = now()
    where (v.ferdig_kl is null or v.kl is distinct from excluded.kl)
      and (v.fagmiljo_id, v.tittel, v.tekst, v.sti, v.merke, v.data, v.kl, v.senest_kl)
        is distinct from (excluded.fagmiljo_id, excluded.tittel, excluded.tekst, excluded.sti, excluded.merke, excluded.data, excluded.kl, excluded.senest_kl);
  get diagnostics antall = row_count;

  if antall > 0 and intern.enhetsvarsler_klare() then
    perform intern.chatvarsel_vekk();
  end if;
  return antall;
end;
$$;

revoke all on function intern.planlegg_enhetsvarsler(text, jsonb) from public, anon, authenticated, service_role;

comment on function intern.planlegg_enhetsvarsler(text, jsonb) is
  'Planlegger eller bytter ut varsler på enheten for et formål, med nøkkelen (#600). Bare for eierprosjektets funksjoner i databasen. Se docs/enhetsvarsler.md.';

-- Mønsteret for nøkler som begynner med `prefiks`, til `like`.
create function intern.enhetsvarsel_prefiks(prefiks text)
returns text
language sql
immutable
set search_path = ''
as $$ select replace(replace(replace(prefiks, '\', '\\'), '%', '\%'), '_', '\_') || '%' $$;

revoke all on function intern.enhetsvarsel_prefiks(text) from public, anon, authenticated, service_role;

-- Avlyser varslene til formålet med disse nøklene, for alle mottakere eller
-- bare `bruker`. Et varsel som alt er sendt, kan ikke avlyses og blir stående.
-- Gir hvor mange som ble avlyst.
create function intern.avlys_enhetsvarsler(formal text, nokler text[], bruker uuid default null)
returns integer
language sql
security definer
set search_path = ''
as $$
  with avlyst as (
    delete from intern.enhetsvarsler v
    where v.formal = avlys_enhetsvarsler.formal
      and v.nokkel = any (avlys_enhetsvarsler.nokler)
      and v.ferdig_kl is null
      and (avlys_enhetsvarsler.bruker is null or v.bruker_id = avlys_enhetsvarsler.bruker)
    returning 1
  )
  select count(*)::integer from avlyst
$$;

revoke all on function intern.avlys_enhetsvarsler(text, text[], uuid) from public, anon, authenticated, service_role;

-- Som `avlys_enhetsvarsler`, for alle nøkler som begynner med `prefiks` (for
-- eksempel alle varslene fra én publisering), i én operasjon.
create function intern.avlys_enhetsvarsler_med_prefiks(formal text, prefiks text, bruker uuid default null)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  antall integer;
begin
  if coalesce(char_length(prefiks), 0) = 0 then
    raise exception 'Prefikset kan ikke være tomt.' using errcode = '22023';
  end if;
  delete from intern.enhetsvarsler v
  where v.formal = avlys_enhetsvarsler_med_prefiks.formal
    and v.nokkel like intern.enhetsvarsel_prefiks(avlys_enhetsvarsler_med_prefiks.prefiks)
    and v.ferdig_kl is null
    and (avlys_enhetsvarsler_med_prefiks.bruker is null or v.bruker_id = avlys_enhetsvarsler_med_prefiks.bruker);
  get diagnostics antall = row_count;
  return antall;
end;
$$;

revoke all on function intern.avlys_enhetsvarsler_med_prefiks(text, text, uuid) from public, anon, authenticated, service_role;

-- Erstatter alle varslene til formålet med nøkler som begynner med
-- `prefiks`, med `varsler` (samme form som i `planlegg_enhetsvarsler`), i én
-- operasjon: de som ikke er med lenger, avlyses, resten planlegges eller
-- byttes ut. Slik kan en ny eller trukket publisering bytte ut mange varsler
-- uten at noen blir sendt to ganger eller blir stående. Alle nøklene i
-- `varsler` må begynne med prefikset. Gir `{planlagt, avlyst}`.
create function intern.erstatt_enhetsvarsler(formal text, prefiks text, varsler jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  avlyst integer;
  planlagt integer;
begin
  if coalesce(char_length(prefiks), 0) = 0 then
    raise exception 'Prefikset kan ikke være tomt.' using errcode = '22023';
  end if;
  if jsonb_typeof(varsler) is distinct from 'array' then
    raise exception 'Varslene må være en liste.' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(varsler) e
    where not coalesce(e ->> 'nokkel' like intern.enhetsvarsel_prefiks(prefiks), false)
  ) then
    raise exception 'Alle nøklene må begynne med prefikset.' using errcode = '22023';
  end if;

  delete from intern.enhetsvarsler v
  where v.formal = erstatt_enhetsvarsler.formal
    and v.nokkel like intern.enhetsvarsel_prefiks(erstatt_enhetsvarsler.prefiks)
    and v.ferdig_kl is null
    and not exists (
      select 1 from jsonb_array_elements(varsler) e
      where e ->> 'nokkel' = v.nokkel and (e ->> 'bruker')::uuid = v.bruker_id
    );
  get diagnostics avlyst = row_count;
  planlagt := intern.planlegg_enhetsvarsler(erstatt_enhetsvarsler.formal, erstatt_enhetsvarsler.varsler);
  return jsonb_build_object('planlagt', planlagt, 'avlyst', avlyst);
end;
$$;

revoke all on function intern.erstatt_enhetsvarsler(text, text, jsonb) from public, anon, authenticated, service_role;

comment on function intern.erstatt_enhetsvarsler(text, text, jsonb) is
  'Erstatter alle varsler på enheten for et formål med nøkler som begynner med prefikset, i én operasjon (#600). Se docs/enhetsvarsler.md.';

-- --- Utsendingen, fra Edge-funksjonen -------------------------------------------------

-- Om varselet fortsatt kan sendes til mottakeren: aktivt medlemskap, formålet
-- valgt, funksjonen i varselets fagmiljø, formålets tilgang og kontrollen.
-- Prøves rett før hver utsending. En feil i formålets kontroll stopper
-- varselet.
create function intern.enhetsvarsel_tillatt(v intern.enhetsvarsler)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  f intern.enhetsvarselformal;
  svar boolean;
begin
  select * into f from intern.enhetsvarselformal x where x.formal = v.formal;
  if not found
    or not intern.har_aktivt_medlemskap(v.bruker_id)
    or not intern.enhetsvarselvalg_pa(v.formal, v.bruker_id)
    or (f.funksjon is not null and not intern.funksjon_tilgjengelig(f.funksjon, v.fagmiljo_id, v.bruker_id)) then
    return false;
  end if;
  if f.tilgang is not null then
    execute format('select %s($1)', f.tilgang::regproc) into svar using v.bruker_id;
    if not coalesce(svar, false) then
      return false;
    end if;
  end if;
  if f.kontroll is not null then
    execute format('select %s($1, $2, $3, $4)', f.kontroll::regproc) into svar using v.bruker_id, v.nokkel, v.data, v.fagmiljo_id;
    return coalesce(svar, false);
  end if;
  return true;
exception when others then
  raise warning 'enhetsvarsel_tillatt: %', sqlstate;
  return false;
end;
$$;

revoke all on function intern.enhetsvarsel_tillatt(intern.enhetsvarsler) from public, anon, authenticated, service_role;

-- Gjør ferdig det som har passert fristen eller brukt opp forsøkene, og
-- sletter det som har stått lenge nok etter fristen. Gir hvor mange som ble
-- slettet. Kalles ved hver henting og av nattjobben.
create function intern.rydd_enhetsvarsler()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  antall integer;
begin
  update intern.enhetsvarsler v
  set ferdig_kl = now()
  where v.ferdig_kl is null
    and (v.senest_kl < now() or (v.forsok >= intern.chatvarsel_maks_forsok() and v.neste_kl <= now()));
  delete from intern.enhetsvarsler v where v.senest_kl < now() - intern.enhetsvarsel_oppbevaring();
  get diagnostics antall = row_count;
  return antall;
end;
$$;

revoke all on function intern.rydd_enhetsvarsler() from public, anon, authenticated, service_role;

-- Gir varslene som skal sendes nå: ett per enhet hos mottakeren som ikke alt
-- har fått det, med endepunktet, nøklene og innholdet. Hvert forsøk holder
-- varselet i `chatvarsel_laas()`, så en annen utsending ikke sender det
-- samme. Et varsel som ikke lenger er tillatt, eller til en mottaker uten
-- enheter, blir ferdig uten å sendes. Bare med den hemmelige nøkkelen
-- (`chatvarsel-utsending`).
create function public.enhetsvarsel_hent()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v intern.enhetsvarsler;
  enheter jsonb;
  ut jsonb := '[]'::jsonb;
begin
  perform intern.rydd_enhetsvarsler();
  for v in
    select * from intern.enhetsvarsler x
    where x.ferdig_kl is null and x.neste_kl <= now() and x.kl <= now() and x.senest_kl >= now()
      and x.forsok < intern.chatvarsel_maks_forsok()
    order by x.neste_kl, x.id
    limit 200
    for update skip locked
  loop
    select jsonb_agg(jsonb_build_object(
      'id', v.id, 'versjon', v.versjon, 'endepunkt', p.endepunkt, 'p256dh', p.p256dh, 'auth', p.auth,
      'tittel', v.tittel, 'tekst', v.tekst, 'sti', v.sti, 'merke', v.merke
    ) order by p.endepunkt)
    into enheter
    from public.pushabonnementer p
    where p.bruker_id = v.bruker_id and p.endepunkt <> all (v.sendt_til);

    if enheter is null or not intern.enhetsvarsel_tillatt(v) then
      update intern.enhetsvarsler x set ferdig_kl = now() where x.id = v.id;
    else
      update intern.enhetsvarsler x
      set forsok = x.forsok + 1, neste_kl = now() + intern.chatvarsel_laas()
      where x.id = v.id;
      ut := ut || enheter;
    end if;
  end loop;
  return ut;
end;
$$;

revoke all on function public.enhetsvarsel_hent() from public, anon, authenticated, service_role;
grant execute on function public.enhetsvarsel_hent() to service_role;

comment on function public.enhetsvarsel_hent() is
  'Gir de planlagte varslene på enheten som skal sendes nå, etter kontrollen, og holder dem mens de sendes (#600). Bare for Edge-funksjonen chatvarsel-utsending. Se docs/enhetsvarsler.md.';

-- Den siste kontrollen, rett før push-kallene (`sendFraKilde`): gir de av
-- varslene fra `enhetsvarsel_hent` (`[{nr, id, versjon, endepunkt}]`) som
-- fortsatt skal sendes, med hvor mange sekunder det er igjen til fristen
-- (`[{nr, levetid}]`), så push-tjenesten aldri leverer et varsel etter
-- fristen. Et varsel skal fortsatt sendes når det ikke er avlyst, ferdig
-- eller byttet ut (samme versjon), fristen ikke er passert, enheten ikke har
-- fått det og fortsatt er abonnementet til mottakeren, og
-- `intern.enhetsvarsel_tillatt` sier ja. Det som ikke skal sendes, røres
-- ikke: `enhetsvarsel_hent` avgjør det neste gang.
create function public.enhetsvarsel_bekreft(varsler jsonb)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with onsket as (
    select x.nr, x.id, x.versjon, x.endepunkt
    from jsonb_to_recordset(case when jsonb_typeof(enhetsvarsel_bekreft.varsler) = 'array' then enhetsvarsel_bekreft.varsler else '[]' end)
      as x(nr integer, id uuid, versjon integer, endepunkt text)
    where x.nr is not null and x.id is not null and x.endepunkt is not null
  ), gjeldende as materialized (
    select v.id, v.versjon, v.bruker_id, v.sendt_til,
           floor(extract(epoch from v.senest_kl - now()))::integer as levetid
    from intern.enhetsvarsler v
    where v.id in (select o.id from onsket o)
      and v.ferdig_kl is null and v.kl <= now() and v.senest_kl >= now() + interval '1 second'
      and intern.enhetsvarsel_tillatt(v)
  )
  select coalesce(jsonb_agg(jsonb_build_object('nr', o.nr, 'levetid', g.levetid) order by o.nr), '[]'::jsonb)
  from onsket o
  join gjeldende g on g.id = o.id and g.versjon = o.versjon and o.endepunkt <> all (g.sendt_til)
  where exists (select 1 from public.pushabonnementer p where p.bruker_id = g.bruker_id and p.endepunkt = o.endepunkt)
$$;

revoke all on function public.enhetsvarsel_bekreft(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.enhetsvarsel_bekreft(jsonb) to service_role;

comment on function public.enhetsvarsel_bekreft(jsonb) is
  'Den siste kontrollen rett før push-kallene: gir de planlagte varslene som fortsatt skal sendes, med sekundene til fristen (#600). Bare for Edge-funksjonen chatvarsel-utsending. Se docs/enhetsvarsler.md.';

-- Hva push-tjenesten svarte på hvert varsel fra `enhetsvarsel_hent`
-- (`[{id, versjon, endepunkt, svar}]`, `svar` som for chatvarslene):
--   sendt, hoppet – enheten har fått det (eller skal ikke ha det);
--   feil          – prøves igjen etter 1, 4, 9 … sekunder, høyst
--                   `chatvarsel_maks_forsok()` ganger;
--   borte         – abonnementet finnes ikke lenger og slettes.
-- Et varsel er ferdig når alle mottakerens enheter har fått det. Et svar på en
-- eldre versjon med det samme tidspunktet gjelder (enheten har fått varselet
-- til det tidspunktet); et svar fra før tidspunktet ble endret, gjelder ikke.
-- Svarene fra Edge-funksjonen som rader; ukjente svar tas ikke med.
create function intern.enhetsvarselsvar(utfall jsonb)
returns table (id uuid, versjon integer, endepunkt text, svar text)
language sql
immutable
set search_path = ''
as $$
  select x.id, x.versjon, x.endepunkt, x.svar
  from jsonb_to_recordset(enhetsvarselsvar.utfall) as x(id uuid, versjon integer, endepunkt text, svar text)
  where x.svar in ('sendt', 'hoppet', 'feil', 'borte') and x.id is not null and x.endepunkt is not null
$$;

revoke all on function intern.enhetsvarselsvar(jsonb) from public, anon, authenticated, service_role;

create function public.enhetsvarsel_kvitter(utfall jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.pushabonnementer p
  using intern.enhetsvarselsvar(enhetsvarsel_kvitter.utfall) r
  where r.svar = 'borte' and p.endepunkt = r.endepunkt;

  update intern.enhetsvarsler v
  set sendt_til = (
    select coalesce(array_agg(distinct e order by e), '{}')
    from unnest(v.sendt_til || array(
      select r.endepunkt from intern.enhetsvarselsvar(enhetsvarsel_kvitter.utfall) r
      where r.id = v.id and r.versjon between v.tidsversjon and v.versjon and r.svar in ('sendt', 'hoppet')
    )) e
  )
  where v.ferdig_kl is null
    and exists (select 1 from intern.enhetsvarselsvar(enhetsvarsel_kvitter.utfall) r where r.id = v.id and r.versjon between v.tidsversjon and v.versjon);

  update intern.enhetsvarsler v
  set ferdig_kl = case when not exists (
        select 1 from public.pushabonnementer p
        where p.bruker_id = v.bruker_id and p.endepunkt <> all (v.sendt_til)
      ) then now() end,
      neste_kl = case
        when exists (
          select 1 from intern.enhetsvarselsvar(enhetsvarsel_kvitter.utfall) r
          where r.id = v.id and r.versjon between v.tidsversjon and v.versjon and r.svar = 'feil'
        ) then now() + v.forsok * v.forsok * interval '1 second'
        else now()
      end
  where v.ferdig_kl is null
    and exists (select 1 from intern.enhetsvarselsvar(enhetsvarsel_kvitter.utfall) r where r.id = v.id and r.versjon between v.tidsversjon and v.versjon);
$$;

revoke all on function public.enhetsvarsel_kvitter(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.enhetsvarsel_kvitter(jsonb) to service_role;

comment on function public.enhetsvarsel_kvitter(jsonb) is
  'Fører hva push-tjenesten svarte på de planlagte varslene på enheten: sendte føres, feil prøves igjen, borte abonnementer slettes (#600). Bare for Edge-funksjonen chatvarsel-utsending. Se docs/enhetsvarsler.md.';

-- --- Klokken --------------------------------------------------------------------------

-- Kjøres av pg_cron hvert minutt: ber om utsendingen når et planlagt varsel
-- skal sendes, og sletter én gang i timen loggen over sine egne kjøringer
-- som er eldre enn et døgn (pg_cron rydder den ikke selv).
create function intern.enhetsvarsel_klokke()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if intern.enhetsvarsler_klare() then
    perform intern.chatvarsel_vekk();
  end if;
  if extract(minute from now()) = 0 and to_regclass('cron.job_run_details') is not null then
    execute $sql$
      delete from cron.job_run_details d
      using cron.job j
      where j.jobid = d.jobid and j.jobname = 'enhetsvarsler' and d.end_time < now() - interval '1 day'
    $sql$;
  end if;
end;
$$;

revoke all on function intern.enhetsvarsel_klokke() from public, anon, authenticated, service_role;

do $$
begin
  if to_regnamespace('cron') is not null then
    execute $sql$ select cron.schedule('enhetsvarsler', '* * * * *', 'select intern.enhetsvarsel_klokke()') $sql$;
  end if;
end
$$;

-- --- Chatten som formål --------------------------------------------------------------

-- Chatten har formålet når gruppechatten eller direktemeldingene er slått på,
-- som chatinnstillingene i appen.
create function intern.chat_har_enhetsvarsler(bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select bruker is not null and (intern.gruppechat_aktivert() or intern.direktemeldinger_aktivert()) $$;

revoke all on function intern.chat_har_enhetsvarsler(uuid) from public, anon, authenticated, service_role;

-- Chatvarslene har sin egen kø og sitt eget innhold (docs/chatvarsler.md);
-- formålet gir valget i innstillingene. På som standard, så alt virker som før.
insert into intern.enhetsvarselformal (formal, funksjon, tilgang, kontroll, standard, frist, sti_monster, rekkefolge)
values (
  'chat', null, 'intern.chat_har_enhetsvarsler(uuid)'::regprocedure, null, true,
  interval '10 minutes', '^#/chat(/(gruppe|direkte)/[0-9a-f-]{36})?$', 10
);

-- Som før (20261119124500_chatvarsler), og bare til mottakere som har valget
-- «Chatmeldinger» på. Brukes både når køen fylles og når varslene hentes, så
-- et varsel som venter, stopper når valget slås av.
create or replace function intern.chatvarselmottakere(slag text, samtale uuid, avsender uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.bruker_id
  from public.gruppemedlemskap m
  where chatvarselmottakere.slag = 'gruppe'
    and intern.gruppechat_aktivert()
    and m.gruppe_id = chatvarselmottakere.samtale
    and m.status = 'aktiv'
    and m.bruker_id is distinct from chatvarselmottakere.avsender
    and intern.kan_lese_gruppe(chatvarselmottakere.samtale, m.bruker_id)
    and intern.enhetsvarselvalg_pa('chat', m.bruker_id)
  union
  select motpart
  from public.direktesamtaler s
  cross join lateral (select intern.direkte_motpart(s, chatvarselmottakere.avsender) as motpart) x
  where chatvarselmottakere.slag = 'direkte'
    and intern.direktemeldinger_aktivert()
    and s.id = chatvarselmottakere.samtale
    and chatvarselmottakere.avsender in (s.bruker_lav, s.bruker_hoy)
    and intern.kan_motta_fra(x.motpart, chatvarselmottakere.avsender)
    and not coalesce((
      select st.dempet from public.direktesamtale_status st
      where st.samtale_id = s.id and st.bruker_id = x.motpart
    ), false)
    and intern.enhetsvarselvalg_pa('chat', x.motpart)
$$;
