-- P5 tråd A (#416, docs/redaktorer-og-forslag.md): redaktøransvaret.
--
-- Systemarkitektene og de lokale administratorene kan gi og tilbakekalle
-- redaktøransvar innenfor sin myndighet: for én ressurs (en fagside eller et
-- regelsett), for hele fortolkningen i et fagmiljø, eller for alle fagsidene.
-- En redaktør leser og endrer utkastene i området sitt og kan behandle forslag
-- der, men publiserer ikke: publiseringen krever fortsatt myndighet over
-- ressursen (`intern.har_ressursmyndighet`).
--
--   * Lokalt ansvar (fortolkningen, eller et regelsett) gis av en lokal
--     administrator i fagmiljøet eller en systemarkitekt, til et aktivt medlem
--     av fagmiljøet, og gjelder bare så lenge medlemskapet er aktivt.
--   * Nasjonalt ansvar (fagsidene, eller én fagside) gis bare av en
--     systemarkitekt, og er avslått (`intern.nasjonale_redaktorer_aktivert()`)
--     til OUSFAR Fag har avklart #417. Peder sa ja til det på det vilkåret
--     16.11.2026 (B2). Aktiveringen er en egen, liten migrasjon.
--   * Ingen gir seg selv ansvar eller tilbakekaller sitt eget.
--
-- Endringsretten utvides i de eksisterende funksjonene, ikke i nye veier:
-- `intern.kan_endre_objekt`, `intern.har_endringsrett_noe` (og dermed
-- `intern.krev_redaktor` og `public.kan_se_utkast`), opprettingen av nye
-- objekter og de tillatende reglene for utkast i faginnholdet.
--
-- Ingen data endres, og ingen kliniske regler, verdier eller tekster.
--
-- Tilbakeføring: en ny migrasjon som setter funksjonene og reglene som er
-- endret her, tilbake til definisjonene i migrasjonene før (de står i
-- 20261114133000_rekkevidde_faginnhold.sql, 20261016051000_kurateringsgrener.sql,
-- 20261114202000_fortolkning_per_fagmiljo.sql og
-- 20261116100000_arkitektens_visningsfagmiljo.sql), tar bort funksjonene og
-- utløseren herfra og lar tabellen stå (den er historikk).

-- --- Bryteren for nasjonale redaktører (B2) -----------------------------------

-- Svarer nei til OUSFAR Fag har avklart #417. Slås på i en egen migrasjon som
-- henviser til Peders ja (16.11.2026) og til svaret i #417.
create function intern.nasjonale_redaktorer_aktivert()
returns boolean
language sql
stable
set search_path = ''
as $$
  select false
$$;

revoke all on function intern.nasjonale_redaktorer_aktivert() from public, anon, authenticated, service_role;

comment on function intern.nasjonale_redaktorer_aktivert() is
  'P5 B2: om nasjonalt redaktøransvar (fagsidene) er slått på. Nei til OUSFAR Fag har avklart #417. Se docs/redaktorer-og-forslag.md.';

-- --- Tabellen ------------------------------------------------------------------

create table public.redaktoransvar (
  id uuid primary key default gen_random_uuid(),
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  -- `ressurs`: én fagside eller ett regelsett. `fortolkning`: alt lokalt
  -- innhold i fagmiljøet. `fagsider`: alle fagsidene (nasjonalt).
  omrade text not null,
  ressurs_id uuid references public.redigerbare_objekter (id) on delete cascade,
  fagmiljo_id uuid references public.fagmiljoer (id),
  tildelt_av uuid references public.profiles (id) on delete set null,
  tildelt_kl timestamptz not null default now(),
  -- Satt når ansvaret er tilbakekalt. Aktivt så lenge de står tomme.
  tilbakekalt_av uuid references public.profiles (id) on delete set null,
  tilbakekalt_kl timestamptz,
  merknad text,
  constraint redaktoransvar_omrade check (omrade in ('ressurs', 'fortolkning', 'fagsider')),
  constraint redaktoransvar_mal check (
    (omrade = 'ressurs' and ressurs_id is not null and fagmiljo_id is null)
    or (omrade = 'fortolkning' and ressurs_id is null and fagmiljo_id is not null)
    or (omrade = 'fagsider' and ressurs_id is null and fagmiljo_id is null)
  ),
  constraint redaktoransvar_merknad check (merknad is null or (merknad = btrim(merknad) and char_length(merknad) between 1 and 300)),
  constraint redaktoransvar_periode check (tilbakekalt_kl is null or tilbakekalt_kl >= tildelt_kl),
  constraint redaktoransvar_tilbakekalling check (tilbakekalt_av is null or tilbakekalt_kl is not null)
);

comment on table public.redaktoransvar is
  'P5: redaktøransvar for en ressurs, fortolkningen i et fagmiljø eller fagsidene. Tilbakekalt ansvar står. Endres bare gjennom funksjonene. Se docs/redaktorer-og-forslag.md.';

-- Høyst ett aktivt ansvar per person og mål.
create unique index redaktoransvar_ett_aktivt_idx
  on public.redaktoransvar (bruker_id, omrade, coalesce(ressurs_id, fagmiljo_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where tilbakekalt_kl is null;
create index redaktoransvar_ressurs_idx on public.redaktoransvar (ressurs_id) where tilbakekalt_kl is null;
create index redaktoransvar_fagmiljo_idx on public.redaktoransvar (fagmiljo_id) where tilbakekalt_kl is null;
create index redaktoransvar_bruker_idx on public.redaktoransvar (bruker_id);

alter table public.redaktoransvar enable row level security;
revoke all on public.redaktoransvar from anon, authenticated;

-- Fagmiljøet ansvaret gjelder: fagmiljøet for fortolkningen, fagmiljøet en
-- lokal ressurs hører til, og ingen (null) for nasjonalt ansvar.
create function intern.redaktoransvarets_fagmiljo(omrade text, ressurs uuid, fagmiljo uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case redaktoransvarets_fagmiljo.omrade
    when 'fortolkning' then redaktoransvarets_fagmiljo.fagmiljo
    when 'ressurs' then (
      select r.fagmiljo_id from public.ressursomfang r
      where r.objekt_id = redaktoransvarets_fagmiljo.ressurs and r.omfang = 'fagmiljo'
    )
  end
$$;

revoke all on function intern.redaktoransvarets_fagmiljo(text, uuid, uuid) from public, anon, authenticated, service_role;

-- Det databasen holder fast uansett hvem som skriver: målet er en ressurs, et
-- nasjonalt ansvar lages bare når bryteren er på, og et tilbakekalt ansvar
-- kan ikke gjenopprettes (et nytt gis i stedet).
create function intern.kontroller_redaktoransvar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  fagmiljo uuid;
begin
  if tg_op = 'INSERT' then
    if new.tilbakekalt_kl is not null or new.tilbakekalt_av is not null then
      raise exception 'Et nytt redaktøransvar kan ikke være tilbakekalt.' using errcode = '22023';
    end if;
    if new.omrade = 'ressurs' and not intern.er_ressurstype((select o.type from public.redigerbare_objekter o where o.id = new.ressurs_id)) then
      raise exception 'Bare en fagside eller et regelsett kan få en egen redaktør.' using errcode = '22023';
    end if;
    if intern.redaktoransvarets_fagmiljo(new.omrade, new.ressurs_id, new.fagmiljo_id) is null
      and not intern.nasjonale_redaktorer_aktivert()
    then
      raise exception 'Nasjonalt redaktøransvar for fagsidene er ikke slått på ennå. Det slås på når OUSFAR Fag har avklart hvordan godkjente forslag går inn i kurateringen.'
        using errcode = '42501';
    end if;
    -- Også rett i tabellen: mottakeren må være aktivt medlem av fagmiljøet
    -- (lokalt) eller av et fagmiljø (nasjonalt). Setningen har tatt den felles
    -- låsen (`redaktoransvar_serialiser`), så et medlemskap som avsluttes
    -- samtidig, er enten ferdig her eller venter; `for share` stopper en
    -- `repeatable read` som ser et gammelt bilde, med en serialiseringsfeil.
    fagmiljo := intern.redaktoransvarets_fagmiljo(new.omrade, new.ressurs_id, new.fagmiljo_id);
    perform 1 from public.medlemskap m
    where m.bruker_id = new.bruker_id and m.status = 'aktiv' and (fagmiljo is null or m.fagmiljo_id = fagmiljo)
    for share;
    if not found then
      raise exception 'Redaktøren må være aktivt medlem av fagmiljøet.' using errcode = '55000';
    end if;
    return new;
  end if;
  if old.tilbakekalt_kl is not null
    and (new.tilbakekalt_kl is distinct from old.tilbakekalt_kl or new.tilbakekalt_av is distinct from old.tilbakekalt_av)
  then
    raise exception 'Et tilbakekalt redaktøransvar kan ikke gjenopprettes. Gi et nytt.' using errcode = '42501';
  end if;
  if new.tilbakekalt_kl is not null and new.tilbakekalt_av is null and (select auth.uid()) is not null then
    new.tilbakekalt_av := (select auth.uid());
  end if;
  return new;
end;
$$;

revoke all on function intern.kontroller_redaktoransvar() from public, anon, authenticated, service_role;

-- Endringene tar den felles låsen for tilgangene, som medlemskapene
-- (`intern.serialiser_tilgang`, 20261113140000), så en tildeling og en
-- avslutning av medlemskapet skjer én om gangen, også rett i tabellene.
create trigger redaktoransvar_serialiser
before insert or update or delete on public.redaktoransvar
for each statement execute function intern.serialiser_tilgang();

create trigger redaktoransvar_kontroll
before insert or update on public.redaktoransvar
for each row execute function intern.kontroller_redaktoransvar();

create trigger redaktoransvar_faste_felter
before update on public.redaktoransvar
for each row execute function intern.tilgang_faste_felter('id', 'bruker_id', 'omrade', 'ressurs_id', 'fagmiljo_id', 'tildelt_av', 'tildelt_kl', 'merknad');

-- Hver endring føres i tilgangsloggen, som de andre tilgangsendringene.
create trigger redaktoransvar_logg
after insert or update or delete on public.redaktoransvar
for each row execute function intern.loggfor_tilgang();

-- --- Hvilke ansvar som gjelder ------------------------------------------------

-- Om ansvaret gjelder nå: ikke tilbakekalt, redaktøren har et aktivt
-- medlemskap, og nasjonalt ansvar bare når bryteren er på. Medlemskapet må
-- være det samme som da ansvaret ble gitt (`fra` før tildelingen), i
-- fagmiljøet ansvaret gjelder (lokalt, i et aktivt fagmiljø) eller i et
-- fagmiljø (nasjonalt). Et medlemskap som gis på nytt, er en ny rad
-- (`intern.gi_medlemskap`), så et gammelt ansvar kommer aldri tilbake med
-- det, heller ikke om tilbakekallingen ved avslutningen ikke så ansvaret
-- (en direkte endring i `repeatable read` samtidig med tildelingen).
create function intern.redaktoransvar_gjelder(a public.redaktoransvar)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select a.tilbakekalt_kl is null
    and intern.har_aktivt_medlemskap(a.bruker_id)
    and (x.fagmiljo is not null or intern.nasjonale_redaktorer_aktivert())
    and exists (
      select 1 from public.medlemskap m
      join public.fagmiljoer f on f.id = m.fagmiljo_id
      where m.bruker_id = a.bruker_id
        and m.status = 'aktiv'
        and f.status = 'aktiv'
        and m.fra <= a.tildelt_kl
        and (x.fagmiljo is null or m.fagmiljo_id = x.fagmiljo)
    )
  from (select intern.redaktoransvarets_fagmiljo(a.omrade, a.ressurs_id, a.fagmiljo_id) as fagmiljo) x
$$;

revoke all on function intern.redaktoransvar_gjelder(public.redaktoransvar) from public, anon, authenticated, service_role;

-- Brukerens ansvar som gjelder nå.
create function intern.aktive_redaktoransvar(bruker uuid)
returns setof public.redaktoransvar
language sql
stable
security definer
set search_path = ''
as $$
  select a.* from public.redaktoransvar a
  where a.bruker_id = aktive_redaktoransvar.bruker
    and a.tilbakekalt_kl is null
    and intern.redaktoransvar_gjelder(a)
$$;

revoke all on function intern.aktive_redaktoransvar(uuid) from public, anon, authenticated, service_role;

comment on function intern.aktive_redaktoransvar(uuid) is
  'P5: brukerens redaktøransvar som gjelder nå (aktivt medlemskap, i fagmiljøet for lokalt ansvar; nasjonalt bare med bryteren på). Se docs/redaktorer-og-forslag.md.';

-- Om ansvaret gjelder ressursen (en fagside eller et regelsett).
create function intern.ansvar_for_ressurs(a public.redaktoransvar, ressurs uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case a.omrade
    when 'ressurs' then a.ressurs_id = ansvar_for_ressurs.ressurs
    when 'fortolkning' then intern.er_ressurstype(o.type) and exists (
      select 1 from public.ressursomfang r
      where r.objekt_id = ansvar_for_ressurs.ressurs and r.omfang = 'fagmiljo' and r.fagmiljo_id = a.fagmiljo_id
    )
    when 'fagsider' then o.type = 'infoside'
    else false
  end
  from (select (select x.type from public.redigerbare_objekter x where x.id = ansvar_for_ressurs.ressurs) as type) o
$$;

revoke all on function intern.ansvar_for_ressurs(public.redaktoransvar, uuid) from public, anon, authenticated, service_role;

-- De aktive redaktørene med ansvar for ressursen (fra grunnmuren, definert på
-- nytt med samme signatur): ansvar for ressursen selv, for fortolkningen i
-- fagmiljøet den hører til, eller for fagsidene, når ansvaret gjelder.
create or replace function intern.ressursens_redaktorer(ressurs uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct a.bruker_id
  from public.redaktoransvar a
  where a.tilbakekalt_kl is null
    and intern.ansvar_for_ressurs(a, ressursens_redaktorer.ressurs)
    and intern.redaktoransvar_gjelder(a)
$$;

comment on function intern.ressursens_redaktorer(uuid) is
  'P5: de aktive redaktørene med ansvar for ressursen (ressursen selv, fortolkningen i fagmiljøet, eller fagsidene). Se docs/redaktorer-og-forslag.md.';

-- Elementene i en ressurs: kortene på en fagside og kommentarene et regelsett
-- bruker (i utkastet eller det publiserte). Det motsatte av
-- `intern.ressurser_for`, med de samme tabellene.
create function intern.ressursens_elementer(ressurs uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select e.objekt_id from public.innholdselementer e where e.infoside_id = ressursens_elementer.ressurs
  union
  select k.kommentar
  from (
    select r.regelsett_id as eier, r.kommentar_id as kommentar from public.intervallregler r
    union all select s.objekt_id, s.cutoff_innledning_id from public.intervallregelsett s
    union all select s.objekt_id, s.cutoff_kommentar_id from public.intervallregelsett s
    union all select p.objekt_id, p.kommentar_id from public.scenarioplasseringer p
    union all select b.objekt_id, b.kommentar_id from public.thc_tekstbolker b
  ) k
  where k.eier = ressursens_elementer.ressurs and k.kommentar is not null
$$;

revoke all on function intern.ressursens_elementer(uuid) from public, anon, authenticated, service_role;

-- Om brukeren har redaktøransvar som dekker objektet: objektet er eller hører
-- til en ressurs i ansvaret (`intern.tilhorer_ressurs`), har lokal rekkevidde
-- i fagmiljøet for et ansvar for fortolkningen, eller hører til en fagside for
-- et ansvar for fagsidene.
create function intern.redaktoransvar_dekker(bruker uuid, objekt uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with ansvar as materialized (select a from intern.aktive_redaktoransvar(redaktoransvar_dekker.bruker) a),
  ressurser as (select x.id from intern.ressurser_for(redaktoransvar_dekker.objekt) x(id))
  -- Fortolkningen i fagmiljøet dekker alle lokale objekter der.
  select exists (
    select 1 from ansvar join public.ressursomfang r on r.fagmiljo_id = (ansvar.a).fagmiljo_id
    where (ansvar.a).omrade = 'fortolkning' and r.objekt_id = redaktoransvar_dekker.objekt and r.omfang = 'fagmiljo'
  )
  -- Ellers må ansvarene dekke hver ressurs objektet hører til, så et element
  -- som deles med en ressurs uten ansvar (en kommentar flere regelsett
  -- bruker), ikke kan endres (docs/redaktorer-og-forslag.md, «Delte elementer»).
  or (
    exists (select 1 from ansvar)
    and exists (select 1 from ressurser)
    and not exists (
      select 1 from ressurser x
      where not exists (select 1 from ansvar where intern.ansvar_for_ressurs(ansvar.a, x.id))
    )
  )
$$;

revoke all on function intern.redaktoransvar_dekker(uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.redaktoransvar_dekker(uuid, uuid) is
  'P5: om brukerens redaktøransvar dekker objektet: fortolkningen i fagmiljøet, eller ansvar for alle ressursene objektet hører til (ressursen, fagsidene). Se docs/redaktorer-og-forslag.md.';

-- Myndigheten over et ansvar med fagmiljøet: lokal administrator der eller
-- systemarkitekt for lokalt ansvar, systemarkitekt for nasjonalt.
create function intern.kan_administrere_redaktoransvar(aktor uuid, fagmiljo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select kan_administrere_redaktoransvar.aktor is not null
    and intern.har_aktivt_medlemskap(kan_administrere_redaktoransvar.aktor)
    and case
      when kan_administrere_redaktoransvar.fagmiljo is null then intern.er_systemarkitekt(kan_administrere_redaktoransvar.aktor)
      else intern.er_lokal_admin_i(kan_administrere_redaktoransvar.fagmiljo, kan_administrere_redaktoransvar.aktor)
    end
$$;

revoke all on function intern.kan_administrere_redaktoransvar(uuid, uuid) from public, anon, authenticated, service_role;

-- --- Endringsretten -------------------------------------------------------------

-- Som i P2a, med redaktøransvaret i tillegg.
create or replace function intern.kan_endre_objekt(objekt uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ressursomfang r
    where r.objekt_id = kan_endre_objekt.objekt
      and intern.kan_endre_omfang(r.omfang, r.fagmiljo_id, kan_endre_objekt.bruker)
  )
  or intern.redaktoransvar_dekker(kan_endre_objekt.bruker, kan_endre_objekt.objekt)
$$;

comment on function intern.kan_endre_objekt(uuid, uuid) is
  'P2a/P5: om brukeren har endringsrett til objektet etter rekkevidden, eller redaktøransvar som dekker det. Se docs/fagmiljoer.md og docs/redaktorer-og-forslag.md.';

-- Som i P2a, med redaktørene i meldingen.
create or replace function intern.krev_endringsrett(objekt uuid, ny boolean default false)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  bruker uuid := (select auth.uid());
begin
  if bruker is null or intern.kan_endre_objekt(krev_endringsrett.objekt, bruker) then
    return;
  end if;
  if not krev_endringsrett.ny and not intern.kan_lese_objekt(krev_endringsrett.objekt, bruker) then
    raise exception 'Fant ikke objektet.' using errcode = 'PT404';
  end if;
  raise exception 'Du har ikke rettighet til å endre dette. Felles innhold endres av systemarkitektene, lokalt innhold av administratorene i fagmiljøet det hører til, og redaktørene endrer det de har ansvar for.'
    using errcode = '42501';
end;
$$;

-- Systemarkitekt, lokal administrator i et fagmiljø, eller redaktør med et
-- ansvar som gjelder. Den gamle adminrollen teller ikke.
create or replace function intern.har_endringsrett_noe(bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select har_endringsrett_noe.bruker is not null and (
    intern.er_systemarkitekt(har_endringsrett_noe.bruker)
    or exists (select 1 from intern.administrerte_fagmiljoer(har_endringsrett_noe.bruker))
    or exists (select 1 from intern.aktive_redaktoransvar(har_endringsrett_noe.bruker))
  )
$$;

comment on function intern.har_endringsrett_noe(uuid) is
  'P2a/P5: systemarkitekt, lokal administrator i et fagmiljø eller redaktør med et ansvar som gjelder; den gamle adminrollen teller ikke. Se docs/fagmiljoer.md.';

-- Som i P2a, med redaktørene i meldingen.
create or replace function intern.krev_redaktor()
returns public.profiles
language plpgsql
stable
set search_path = ''
as $$
declare
  innlogget public.profiles;
begin
  perform intern.krev_aktivt_medlemskap();
  select p.* into innlogget
  from public.profiles p
  where p.id = (select auth.uid()) and intern.har_endringsrett_noe(p.id);
  if not found then
    raise exception 'Bare systemarkitektene, administratorene i fagmiljøene og redaktørene kan endre faginnholdet.' using errcode = '42501';
  end if;
  return innlogget;
end;
$$;

-- Stopper den som kan endre objektet som redaktør, men ikke har myndighet
-- over det (`intern.har_ressursmyndighet`): publiseringen og slettingen er for
-- dem som publiserer i dag. Den som ikke kan endre objektet i det hele tatt,
-- får det samme svaret som før (`intern.krev_endringsrett`). Serverprosessene
-- uten innlogget bruker berøres ikke.
create function intern.krev_myndighet(objekt uuid, handling text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  bruker uuid := (select auth.uid());
begin
  if bruker is null or intern.har_ressursmyndighet(krev_myndighet.objekt, bruker) then
    return;
  end if;
  perform intern.krev_endringsrett(krev_myndighet.objekt);
  raise exception 'Redaktører kan ikke %. Det gjør administratorene i fagmiljøet for lokalt innhold og systemarkitektene for felles innhold.', krev_myndighet.handling
    using errcode = '42501';
end;
$$;

revoke all on function intern.krev_myndighet(uuid, text) from public, anon, authenticated, service_role;

-- Som før (20261016051000_kurateringsgrener.sql), med myndigheten kontrollert
-- først: all publisering går hit, også fra en kurateringsgren.
create or replace function intern.publiser_objekt(p_objekt uuid, p_forventet integer, p_forfatter public.profiles)
returns public.objektstatus
language plpgsql
set search_path = ''
as $$
declare
  gjeldende public.objektrevisjoner;
  objekttype public.objekttype;
  utkastet jsonb;
  publisert integer;
begin
  perform intern.krev_myndighet(p_objekt, 'publisere');
  gjeldende := intern.laas_utkast(p_objekt, p_forventet);

  select o.type into objekttype from public.redigerbare_objekter o where o.id = p_objekt;

  select t.revisjon into publisert
  from public.objekttilstander t
  where t.objekt_id = p_objekt and t.tilstand = 'publisert'
  for update;

  if publisert is distinct from gjeldende.revisjon then
    insert into public.objekttilstander (objekt_id, tilstand, revisjon)
    values (p_objekt, 'publisert', gjeldende.revisjon)
    on conflict on constraint objekttilstander_pkey
    do update set revisjon = excluded.revisjon, endret_kl = now();

    -- Det publiserte skrives av utkastet slik det står, gjennom den samme
    -- veien som all annen lagring, og skal bli nøyaktig likt det.
    utkastet := intern.les(objekttype, p_objekt, 'utkast');
    if intern.skriv(objekttype, p_objekt, 'publisert', utkastet) is distinct from utkastet then
      raise exception 'Det publiserte ble ikke likt utkastet. Ingenting er publisert.';
    end if;

    insert into public.objektpubliseringer (
      objekt_id, revisjon, forrige_revisjon,
      utfort_av, utfort_av_fornavn, utfort_av_etternavn
    )
    values (
      p_objekt, gjeldende.revisjon, publisert,
      p_forfatter.id, p_forfatter.first_name, p_forfatter.last_name
    );
  end if;
  return intern.status(p_objekt);
end;
$$;

-- Som i P2a, med myndigheten kontrollert først.
create or replace function public.slett_referanse(objekt uuid, forventet_revisjon integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  forfatter public.profiles := intern.krev_redaktor();
  gjeldende public.objektrevisjoner;
begin
  perform intern.krev_myndighet(objekt, 'slette referanser');
  gjeldende := intern.laas_utkast(objekt, forventet_revisjon);

  -- Låsen holder unna en samtidig lagring som ville sitert referansen:
  -- koblingen dit venter på den, og avvises når referansen er borte. Objektet
  -- låses før referanseraden, i samme rekkefølge som krev_gyldig_kobling.
  perform 1 from public.redigerbare_objekter o where o.id = objekt for update;

  if (select o.type from public.redigerbare_objekter o where o.id = objekt) <> 'referanse' then
    raise exception 'Bare referanser kan slettes.' using errcode = '22023';
  end if;

  if exists (select 1 from public.objektpubliseringer p where p.objekt_id = objekt) then
    raise exception 'Referansen har vært publisert og kan ikke slettes. Arkiver den i stedet.'
      using errcode = '22023';
  end if;

  -- I bruk er også det som bare står i en eldre revisjon av noe: den skal
  -- fortsatt kunne gjenopprettes.
  if exists (select 1 from public.referansekoblinger k where k.referanse_id = objekt)
    or exists (
      select 1 from public.objektrevisjoner r
      where r.objekt_id <> objekt and strpos(lower(r.innhold::text), objekt::text) > 0
    )
  then
    raise exception 'Referansen er i bruk, nå eller i historikken, og kan ikke slettes. Arkiver den i stedet.'
      using errcode = '22023';
  end if;

  insert into public.slettede_referanser (
    objekt_id, innhold, revisjon, slettet_av, slettet_av_fornavn, slettet_av_etternavn
  )
  values (
    objekt, gjeldende.innhold, gjeldende.revisjon,
    forfatter.id, forfatter.first_name, forfatter.last_name
  );

  perform set_config('intern.sletter_referanse', objekt::text, true);
  delete from public.objekttilstander t where t.objekt_id = objekt;
  delete from public.objektrevisjoner r where r.objekt_id = objekt;
  delete from public.redigerbare_objekter o where o.id = objekt;
  perform set_config('intern.sletter_referanse', '', true);

  return objekt;
end;
$$;

comment on function public.slett_referanse(uuid, integer) is
  'Sletter en referanse som aldri har vært publisert eller sitert. Alt annet må arkiveres. Krever myndighet (ikke redaktøransvar).';

-- --- Nye objekter ---------------------------------------------------------------

-- Om den innloggede kan lage objektet, som nettopp har fått rekkevidden etter
-- regelen. Med myndighet som før. En redaktør kan lage objekter i området
-- sitt, men aldri en fagside eller en referanse:
--
--   * med ansvar for fortolkningen: lokale objekter i fagmiljøet;
--   * et kort på en fagside redaktøren har ansvar for;
--   * en kommentar som lagres sammen med et regelsett redaktøren har ansvar
--     for (`intern.lagre_regelsett`), og som regelsettet tar i bruk i samme
--     kall: den kontrolleres der, etter lagringen.
--
-- Ellers det samme svaret som før (`intern.krev_endringsrett`).
create function intern.krev_opprettelsesrett(p_type public.objekttype, p_objekt uuid, p_innhold jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  bruker uuid := (select auth.uid());
  side text := p_innhold ->> 'infoside';
  regelsett text := nullif(current_setting('intern.regelsett_under_lagring', true), '');
begin
  if bruker is null or intern.har_ressursmyndighet(p_objekt, bruker) then
    return;
  end if;
  if p_type in ('infoside', 'referanse') then
    if intern.redaktoransvar_dekker(bruker, p_objekt) then
      raise exception 'Redaktører kan ikke lage fagsider eller referanser. Det gjør systemarkitektene.' using errcode = '42501';
    end if;
  else
    if intern.redaktoransvar_dekker(bruker, p_objekt) then
      return;
    end if;
    if p_type = 'innholdselement' and side ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      and intern.redaktoransvar_dekker(bruker, side::uuid)
    then
      return;
    end if;
    if p_type = 'kommentar' and regelsett is not null and intern.redaktoransvar_dekker(bruker, regelsett::uuid) then
      perform set_config(
        'intern.nye_kommentarer',
        concat_ws(',', nullif(current_setting('intern.nye_kommentarer', true), ''), p_objekt::text),
        true
      );
      return;
    end if;
  end if;
  perform intern.krev_endringsrett(p_objekt, true);
end;
$$;

revoke all on function intern.krev_opprettelsesrett(public.objekttype, uuid, jsonb) from public, anon, authenticated, service_role;

-- Som i P2a, med opprettelsesretten over i stedet for endringsretten alene.
create or replace function intern.opprett_objekt_som(p_type public.objekttype, p_objekt uuid, p_innhold jsonb, p_forfatter public.profiles)
returns public.objektstatus
language plpgsql
set search_path = ''
as $$
begin
  if p_type is null then
    raise exception 'Objekttypen mangler.' using errcode = '22023';
  end if;
  if p_objekt is null then
    raise exception 'ID-en til det nye objektet mangler.' using errcode = '22023';
  end if;
  if exists (select 1 from public.redigerbare_objekter o where o.id = p_objekt) then
    raise exception 'Det finnes alt et objekt med ID-en %.', p_objekt using errcode = '22023';
  end if;

  insert into public.redigerbare_objekter (id, type)
  values (p_objekt, p_type);

  perform intern.krev_opprettelsesrett(p_type, p_objekt, p_innhold);

  -- Utkastet må finnes før innholdet kan legges inn i det. Koblingen til
  -- revisjonen kontrolleres først når transaksjonen er ferdig.
  insert into public.objekttilstander (objekt_id, tilstand, revisjon)
  values (p_objekt, 'utkast', 1);

  perform intern.ny_revisjon(
    p_objekt,
    'opprettet',
    intern.skriv(p_type, p_objekt, 'utkast', p_innhold),
    p_forfatter
  );
  return intern.status(p_objekt);
end;
$$;

-- --- Regelsettene med kommentarene ------------------------------------------------

-- Felles for de tre `lagre_*regelsett`, som før like bortsett fra typen; de
-- kaller porten selv først, som før. Regelsettet kontrolleres før kommentarene. Nye kommentarer som en redaktør
-- med ansvar for regelsettet lager i samme kall, må regelsettet ta i bruk;
-- ellers rulles lagringen tilbake.
create function intern.lagre_regelsett(p_type public.objekttype, objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)
returns public.objektstatus
language plpgsql
security definer
set search_path = ''
as $$
declare
  status public.objektstatus;
  ubrukt uuid;
begin
  perform intern.krev_redaktor();
  if (select o.type from public.redigerbare_objekter o where o.id = objekt) is distinct from p_type then
    raise exception 'Fant ikke regelsettet.' using errcode = 'PT404';
  end if;
  perform intern.krev_endringsrett(objekt);

  perform set_config('intern.regelsett_under_lagring', objekt::text, true);
  perform set_config('intern.nye_kommentarer', '', true);
  perform intern.lagre_kommentarendringer(kommentarer);
  status := public.lagre_utkast(objekt, forventet_revisjon, innhold);

  select k into ubrukt
  from unnest(string_to_array(nullif(current_setting('intern.nye_kommentarer', true), ''), ',')::uuid[]) k
  where not intern.tilhorer_ressurs(k, objekt)
  limit 1;
  perform set_config('intern.regelsett_under_lagring', '', true);
  perform set_config('intern.nye_kommentarer', '', true);
  if ubrukt is not null then
    raise exception 'En ny kommentar må brukes av regelsettet den lagres sammen med.' using errcode = '22023';
  end if;
  return status;
end;
$$;

revoke all on function intern.lagre_regelsett(public.objekttype, uuid, integer, jsonb, jsonb) from public, anon, authenticated, service_role;

create or replace function public.lagre_intervallregelsett(objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)
returns public.objektstatus
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_redaktor();
  return intern.lagre_regelsett('intervallregelsett', objekt, forventet_revisjon, innhold, kommentarer);
end;
$$;

create or replace function public.lagre_scenarioregelsett(objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)
returns public.objektstatus
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_redaktor();
  return intern.lagre_regelsett('scenarioregelsett', objekt, forventet_revisjon, innhold, kommentarer);
end;
$$;

create or replace function public.lagre_thc_regelsett(objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)
returns public.objektstatus
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_redaktor();
  return intern.lagre_regelsett('thc_regelsett', objekt, forventet_revisjon, innhold, kommentarer);
end;
$$;

-- --- Radsikkerheten for utkastene --------------------------------------------------

-- Fagmiljøene der den innloggede kan se og endre alt lokalt innhold: de den
-- administrerer (`public.mine_administrerte_fagmiljoer()`, alle for en
-- systemarkitekt), og de den har ansvar for fortolkningen i. Tom uten aktivt
-- medlemskap. Svarer bare om den innloggede selv; regnes ut én gang per
-- spørring i reglene.
create function public.mine_redigerbare_fagmiljoer()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.har_aktivt_medlemskap((select auth.uid())) then '{}'::uuid[]
    else coalesce(
      (
        select array_agg(distinct x.f order by x.f)
        from (
          select unnest(public.mine_administrerte_fagmiljoer()) as f
          union
          select a.fagmiljo_id from intern.aktive_redaktoransvar((select auth.uid())) a where a.omrade = 'fortolkning'
        ) x
      ),
      '{}'::uuid[]
    )
  end
$$;

revoke all on function public.mine_redigerbare_fagmiljoer() from public, anon, authenticated, service_role;
grant execute on function public.mine_redigerbare_fagmiljoer() to authenticated;

comment on function public.mine_redigerbare_fagmiljoer() is
  'P5: fagmiljøene den innloggede administrerer eller har ansvar for fortolkningen i. Brukes av reglene for utkast. Se docs/redaktorer-og-forslag.md.';

-- Objektene den innloggede har redaktøransvar for gjennom en ressurs (med
-- elementene i den) eller fagsidene. Tom uten et slikt ansvar. Svarer bare om
-- den innloggede selv; regnes ut én gang per spørring i reglene.
create function public.mine_redigerbare_objekter()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  with ansvar as (
    select a.omrade, a.ressurs_id
    from intern.aktive_redaktoransvar((select auth.uid())) a
    where a.omrade in ('ressurs', 'fagsider') and intern.har_aktivt_medlemskap((select auth.uid()))
  )
  select coalesce(array_agg(distinct x.id), '{}'::uuid[])
  from (
    select a.ressurs_id as id from ansvar a where a.omrade = 'ressurs'
    union
    select e from ansvar a cross join lateral intern.ressursens_elementer(a.ressurs_id) e where a.omrade = 'ressurs'
    union
    select o.id from public.redigerbare_objekter o
    where o.type in ('infoside', 'innholdselement') and exists (select 1 from ansvar a where a.omrade = 'fagsider')
  ) x
$$;

revoke all on function public.mine_redigerbare_objekter() from public, anon, authenticated, service_role;
grant execute on function public.mine_redigerbare_objekter() to authenticated;

comment on function public.mine_redigerbare_objekter() is
  'P5: objektene den innloggede har redaktøransvar for gjennom en ressurs eller fagsidene. Brukes av reglene for utkast. Se docs/redaktorer-og-forslag.md.';

-- De tillatende reglene i faginnholdet slapp utkastet gjennom for den med
-- endringsrett etter rekkevidden (P2a):
--   (kan_se_utkast() and (er_systemarkitekt() or <lokalt i et fagmiljø den administrerer>))
-- Nå også for redaktørene: fagmiljøene fra `mine_redigerbare_fagmiljoer()`
-- i stedet for `mine_administrerte_fagmiljoer()`, og objektene fra
-- `mine_redigerbare_objekter()` ved siden av systemarkitekten. Samme teknikk
-- som i P2a: hver regel skrives om der den står, og migrasjonen stopper hvis
-- en regel ikke har nøyaktig formen den ventet. For dem uten endringsrett til
-- noe er `kan_se_utkast()` usann som før, og ingenting slås opp per rad.
do $$
declare
  t record;
  p record;
  ny text;
  arkitekt constant text := '\(\s*SELECT\s+(public\.)?er_systemarkitekt\(\)\s+AS\s+er_systemarkitekt\)';
  administrerte constant text := '\(\s*SELECT\s+(public\.)?mine_administrerte_fagmiljoer\(\)\s+AS\s+mine_administrerte_fagmiljoer\)';
  antall int := 0;
  omskrevet int;
begin
  for t in
    select * from (values
      -- tabell, kolonnen som peker på objektet (som i P2a)
      ('redigerbare_objekter', 'redigerbare_objekter.id'),
      ('objekttilstander', 'objekttilstander.objekt_id'),
      ('objektrevisjoner', 'objektrevisjoner.objekt_id'),
      ('infosider', 'infosider.objekt_id'),
      ('innholdselementer', 'innholdselementer.objekt_id'),
      ('referanser', 'referanser.objekt_id'),
      ('referansekoblinger', 'referansekoblinger.objekt_id'),
      ('laboratorieanalytter', 'laboratorieanalytter.objekt_id'),
      ('analyttkomponenter', 'analyttkomponenter.analytt_id'),
      ('intervallregelsett', 'intervallregelsett.objekt_id'),
      ('intervallregler', 'intervallregler.regelsett_id'),
      ('kommentarer', 'kommentarer.objekt_id'),
      ('scenarioregelsett', 'scenarioregelsett.objekt_id'),
      ('scenarier', 'scenarier.objekt_id'),
      ('scenarioanalytter', 'scenarioanalytter.objekt_id'),
      ('scenarioforhold', 'scenarioforhold.objekt_id'),
      ('scenarioforholdsledd', 'scenarioforholdsledd.objekt_id'),
      ('scenarioparametere', 'scenarioparametere.objekt_id'),
      ('scenariopavist', 'scenariopavist.objekt_id'),
      ('scenarioplasseringer', 'scenarioplasseringer.objekt_id'),
      ('scenarioplasseringskoder', 'scenarioplasseringskoder.objekt_id'),
      ('scenariotekster', 'scenariotekster.objekt_id'),
      ('scenariovilkar', 'scenariovilkar.objekt_id'),
      ('thc_regelsett', 'thc_regelsett.objekt_id'),
      ('thc_bruksmonstre', 'thc_bruksmonstre.objekt_id'),
      ('thc_konsentrasjonsnivaer', 'thc_konsentrasjonsnivaer.objekt_id'),
      ('thc_kurver', 'thc_kurver.objekt_id'),
      ('thc_sikkerhetsmarginer', 'thc_sikkerhetsmarginer.objekt_id'),
      ('thc_tekstbolker', 'thc_tekstbolker.objekt_id')
    ) as v(tabell, kolonne)
  loop
    omskrevet := 0;
    for p in
      select policyname, qual from pg_policies
      where schemaname = 'public' and tablename = t.tabell and permissive = 'PERMISSIVE' and cmd = 'SELECT' and qual ~ 'kan_se_utkast'
    loop
      if (select count(*) from regexp_matches(p.qual, arkitekt, 'g')) <> 1
        or (select count(*) from regexp_matches(p.qual, administrerte, 'g')) <> 1
      then
        raise exception 'Regelen % på % har ikke formen fra P2a: %', p.policyname, t.tabell, p.qual;
      end if;
      ny := regexp_replace(
        p.qual, arkitekt,
        format('((select public.er_systemarkitekt()) or %s = any ((select public.mine_redigerbare_objekter())::uuid[]))', t.kolonne)
      );
      ny := regexp_replace(ny, administrerte, '(select public.mine_redigerbare_fagmiljoer())');
      execute format('alter policy %I on public.%I using (%s)', p.policyname, t.tabell, ny);
      omskrevet := omskrevet + 1;
    end loop;
    if omskrevet = 0 then
      raise exception 'Fant ingen regel for utkastene på %.', t.tabell;
    end if;
    antall := antall + omskrevet;
  end loop;
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and qual ~ 'kan_se_utkast' and qual ~ 'mine_administrerte_fagmiljoer'
  ) then
    raise exception 'En regel for utkastene ble ikke skrevet om.';
  end if;
  raise notice 'P5: % regler for utkastene slipper redaktørene inn.', antall;
end;
$$;

-- --- Medlemskapet ---------------------------------------------------------------

-- Når et medlemskap avsluttes, tilbakekalles redaktøransvaret for lokalt
-- innhold i fagmiljøet, og alt ansvar når kontoen ikke har noe aktivt
-- medlemskap igjen. Ansvaret gjelder uansett ikke uten medlemskapet
-- (`intern.redaktoransvar_gjelder`); dette gjør at det heller ikke kommer
-- tilbake av seg selv med et nytt medlemskap, og at oversikten viser det
-- som gjelder. Føres i tilgangsloggen med samme aktør og begrunnelse.
create function intern.tilbakekall_redaktoransvar_med_medlemskapet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.redaktoransvar a
  set tilbakekalt_kl = now(), tilbakekalt_av = intern.tilgangsaktor()
  where a.bruker_id = new.bruker_id
    and a.tilbakekalt_kl is null
    and (
      intern.redaktoransvarets_fagmiljo(a.omrade, a.ressurs_id, a.fagmiljo_id) = new.fagmiljo_id
      or not intern.har_aktivt_medlemskap(new.bruker_id)
    );
  return null;
end;
$$;

revoke all on function intern.tilbakekall_redaktoransvar_med_medlemskapet() from public, anon, authenticated, service_role;

create trigger medlemskap_redaktoransvar
after update of status on public.medlemskap
for each row when (old.status = 'aktiv' and new.status <> 'aktiv')
execute function intern.tilbakekall_redaktoransvar_med_medlemskapet();

-- --- Det appen viser ---------------------------------------------------------------

-- En person slik oversiktene viser den.
create function intern.redaktorperson(bruker uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', p.id, 'fornavn', p.first_name, 'etternavn', p.last_name)
  from public.profiles p where p.id = redaktorperson.bruker
$$;

revoke all on function intern.redaktorperson(uuid) from public, anon, authenticated, service_role;

-- Ett ansvar slik oversiktene viser det, for `leser`: ressursen beskrives
-- bare når leseren kan lese den.
-- En ressurs slik oversiktene viser den: beskrivelsen fra grunnmuren og
-- analyttkodene regelsettet gjelder (tom for en fagside), så appen kan vise
-- redigeringen av fortolkningen for en redaktør med ansvar for ett regelsett.
create function intern.redaktorressurs(ressurs uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select b || jsonb_build_object('analyttkoder', case b ->> 'type'
      when 'scenarioregelsett' then coalesce((
        select jsonb_agg(distinct a.kode) from public.scenarioanalytter a where a.objekt_id = redaktorressurs.ressurs
      ), '[]'::jsonb)
      when 'infoside' then '[]'::jsonb
      else case when b ->> 'analyttkode' is null then '[]'::jsonb else jsonb_build_array(b -> 'analyttkode') end
    end)
  from (select intern.ressursbeskrivelse(redaktorressurs.ressurs) as b) x
  where x.b is not null
$$;

revoke all on function intern.redaktorressurs(uuid) from public, anon, authenticated, service_role;

create function intern.redaktoransvarsbeskrivelse(a public.redaktoransvar, leser uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', a.id,
    'omrade', a.omrade,
    'nasjonalt', x.fagmiljo is null,
    'gjelder', intern.redaktoransvar_gjelder(a),
    'bruker', intern.redaktorperson(a.bruker_id),
    'ressurs', case when a.ressurs_id is not null and intern.kan_lese_objekt(a.ressurs_id, redaktoransvarsbeskrivelse.leser)
      then intern.redaktorressurs(a.ressurs_id) end,
    'fagmiljo', (select intern.fagmiljoreferanse(f) from public.fagmiljoer f where f.id = x.fagmiljo),
    'tildelt_av', intern.redaktorperson(a.tildelt_av),
    'tildelt_kl', a.tildelt_kl,
    'merknad', a.merknad
  )
  from (select intern.redaktoransvarets_fagmiljo(a.omrade, a.ressurs_id, a.fagmiljo_id) as fagmiljo) x
$$;

revoke all on function intern.redaktoransvarsbeskrivelse(public.redaktoransvar, uuid) from public, anon, authenticated, service_role;

-- --- Funksjonene nettleseren kaller ------------------------------------------------

-- Gir `bruker` redaktøransvar for `omrade`: `ressurs` (med `ressurs`),
-- `fortolkning` (med `fagmiljo`) eller `fagsider`. Lokalt ansvar gis av en
-- lokal administrator i fagmiljøet eller en systemarkitekt, til et aktivt
-- medlem av fagmiljøet; nasjonalt bare av en systemarkitekt, og bare når
-- bryteren er på. Ingen gir seg selv ansvar. Et ansvar som alt er gitt, gir
-- den samme ID-en tilbake, så kallet kan gjentas trygt.
create function public.tildel_redaktoransvar(
  bruker uuid,
  omrade text,
  ressurs uuid default null,
  fagmiljo uuid default null,
  merknad text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  malfagmiljo uuid;
  f public.fagmiljoer;
  tekst text := nullif(btrim(coalesce(tildel_redaktoransvar.merknad, '')), '');
  svar uuid;
begin
  perform intern.krev_aktivt_medlemskap();
  if aktor is null then
    raise exception 'Logg inn for å gi redaktøransvar.' using errcode = '42501';
  end if;
  perform intern.las_tilgang(aktor, 'Redaktøransvar gitt i administrasjonen');

  if tildel_redaktoransvar.omrade is null or tildel_redaktoransvar.omrade not in ('ressurs', 'fortolkning', 'fagsider') then
    raise exception 'Ukjent område for redaktøransvaret.' using errcode = '22023';
  end if;
  if tildel_redaktoransvar.omrade = 'ressurs' then
    if tildel_redaktoransvar.ressurs is null or tildel_redaktoransvar.fagmiljo is not null then
      raise exception 'Velg én fagside eller ett regelsett.' using errcode = '22023';
    end if;
    if not intern.kan_lese_objekt(tildel_redaktoransvar.ressurs, aktor) then
      raise exception 'Fant ikke ressursen.' using errcode = 'PT404';
    end if;
    if not intern.er_ressurstype((select o.type from public.redigerbare_objekter o where o.id = tildel_redaktoransvar.ressurs)) then
      raise exception 'Bare en fagside eller et regelsett kan få en egen redaktør.' using errcode = '22023';
    end if;
  elsif tildel_redaktoransvar.omrade = 'fortolkning' then
    if tildel_redaktoransvar.fagmiljo is null or tildel_redaktoransvar.ressurs is not null then
      raise exception 'Velg fagmiljøet fortolkningen hører til.' using errcode = '22023';
    end if;
    if not exists (select 1 from public.fagmiljoer x where x.id = tildel_redaktoransvar.fagmiljo) then
      raise exception 'Ukjent fagmiljø.' using errcode = 'P0002';
    end if;
  elsif tildel_redaktoransvar.ressurs is not null or tildel_redaktoransvar.fagmiljo is not null then
    raise exception 'Ansvaret for fagsidene gjelder alle fagsidene.' using errcode = '22023';
  end if;

  -- Myndigheten før brukeren, så den som ikke har den, ikke får vite hvem som finnes.
  malfagmiljo := intern.redaktoransvarets_fagmiljo(tildel_redaktoransvar.omrade, tildel_redaktoransvar.ressurs, tildel_redaktoransvar.fagmiljo);
  if malfagmiljo is null then
    if not intern.er_systemarkitekt(aktor) then
      raise exception 'Bare systemarkitektene kan gi nasjonalt redaktøransvar.' using errcode = '42501';
    end if;
    if not intern.nasjonale_redaktorer_aktivert() then
      raise exception 'Nasjonalt redaktøransvar for fagsidene er ikke slått på ennå. Det slås på når OUSFAR Fag har avklart hvordan godkjente forslag går inn i kurateringen.'
        using errcode = '42501';
    end if;
  else
    select * into strict f from public.fagmiljoer x where x.id = malfagmiljo;
    if not intern.kan_administrere_redaktoransvar(aktor, f.id) then
      raise exception 'Du administrerer ikke %.', f.navn using errcode = '42501';
    end if;
    if f.status <> 'aktiv' then
      raise exception '% er arkivert.', f.navn using errcode = '55000';
    end if;
  end if;

  if tildel_redaktoransvar.bruker is null or not exists (select 1 from public.profiles p where p.id = tildel_redaktoransvar.bruker) then
    raise exception 'Ukjent bruker.' using errcode = 'P0002';
  end if;
  if tildel_redaktoransvar.bruker = aktor then
    raise exception 'Du kan ikke gi deg selv redaktøransvar. Be en annen administrator om det.' using errcode = '42501';
  end if;
  if malfagmiljo is null then
    if not intern.har_aktivt_medlemskap(tildel_redaktoransvar.bruker) then
      raise exception 'Brukeren har ikke et aktivt medlemskap i OUSFAR.' using errcode = '55000';
    end if;
  elsif not exists (
    select 1 from public.medlemskap m
    where m.bruker_id = tildel_redaktoransvar.bruker and m.fagmiljo_id = malfagmiljo and m.status = 'aktiv'
  ) then
    raise exception 'Brukeren må være aktivt medlem av %.', f.navn using errcode = '55000';
  end if;
  if tekst is not null and char_length(tekst) > 300 then
    raise exception 'Merknaden kan være høyst 300 tegn.' using errcode = '22023';
  end if;

  select a.id into svar
  from public.redaktoransvar a
  where a.bruker_id = tildel_redaktoransvar.bruker
    and a.omrade = tildel_redaktoransvar.omrade
    and a.ressurs_id is not distinct from tildel_redaktoransvar.ressurs
    and a.fagmiljo_id is not distinct from tildel_redaktoransvar.fagmiljo
    and a.tilbakekalt_kl is null;
  if svar is not null then
    return svar;
  end if;

  insert into public.redaktoransvar (bruker_id, omrade, ressurs_id, fagmiljo_id, tildelt_av, merknad)
  values (
    tildel_redaktoransvar.bruker, tildel_redaktoransvar.omrade, tildel_redaktoransvar.ressurs,
    tildel_redaktoransvar.fagmiljo, aktor, tekst
  )
  returning id into svar;
  return svar;
end;
$$;

revoke all on function public.tildel_redaktoransvar(uuid, text, uuid, uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.tildel_redaktoransvar(uuid, text, uuid, uuid, text) to authenticated;

comment on function public.tildel_redaktoransvar(uuid, text, uuid, uuid, text) is
  'P5: gir redaktøransvar etter myndigheten (lokalt: lokal administrator eller systemarkitekt; nasjonalt: systemarkitekt når B2 er slått på). Se docs/redaktorer-og-forslag.md.';

-- Avslutter ansvaret. Bare den som kan gi det, kan ta det tilbake, og ingen
-- sitt eget. Et ansvar den innloggede ikke har myndighet over, gir samme svar
-- som et som ikke finnes. Et ansvar som alt er tilbakekalt, gir ingen feil.
create function public.tilbakekall_redaktoransvar(ansvar uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  a public.redaktoransvar;
begin
  perform intern.krev_aktivt_medlemskap();
  if aktor is null then
    raise exception 'Logg inn for å tilbakekalle redaktøransvar.' using errcode = '42501';
  end if;
  perform intern.las_tilgang(aktor, 'Redaktøransvar tilbakekalt i administrasjonen');

  select * into a from public.redaktoransvar x where x.id = tilbakekall_redaktoransvar.ansvar for update;
  if found and a.bruker_id = aktor then
    raise exception 'Du kan ikke tilbakekalle ditt eget redaktøransvar. Be en administrator om det.' using errcode = '42501';
  end if;
  if not found or not intern.kan_administrere_redaktoransvar(aktor, intern.redaktoransvarets_fagmiljo(a.omrade, a.ressurs_id, a.fagmiljo_id)) then
    raise exception 'Fant ikke redaktøransvaret.' using errcode = 'PT404';
  end if;
  if a.tilbakekalt_kl is null then
    update public.redaktoransvar x set tilbakekalt_kl = now(), tilbakekalt_av = aktor where x.id = a.id;
  end if;
end;
$$;

revoke all on function public.tilbakekall_redaktoransvar(uuid) from public, anon, authenticated, service_role;
grant execute on function public.tilbakekall_redaktoransvar(uuid) to authenticated;

comment on function public.tilbakekall_redaktoransvar(uuid) is
  'P5: avslutter et redaktøransvar; bare den som kan gi det, og ikke ens eget. Se docs/redaktorer-og-forslag.md.';

-- Oversikten for den som tildeler, innenfor egen myndighet: fagmiljøene den
-- kan gi lokalt ansvar i, ansvarene som er gitt, og ressursene uten
-- ansvarlig redaktør (de lokale som liste; fagsidene som et tall for
-- systemarkitektene). Med `fagmiljo` bare det fagmiljøet.
create function public.les_redaktoransvar(fagmiljo uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  arkitekt boolean;
  omrader uuid[];
  nasjonalt boolean;
begin
  perform intern.krev_aktivt_medlemskap();
  arkitekt := aktor is not null and intern.er_systemarkitekt(aktor);
  if les_redaktoransvar.fagmiljo is not null then
    if not intern.kan_administrere_redaktoransvar(aktor, les_redaktoransvar.fagmiljo)
      or not exists (select 1 from public.fagmiljoer f where f.id = les_redaktoransvar.fagmiljo)
    then
      raise exception 'Du administrerer ikke dette fagmiljøet.' using errcode = '42501';
    end if;
    omrader := array[les_redaktoransvar.fagmiljo];
  else
    omrader := array(
      select f.id from public.fagmiljoer f
      where f.status = 'aktiv' and intern.kan_administrere_redaktoransvar(aktor, f.id)
    );
  end if;
  if not arkitekt and cardinality(omrader) = 0 then
    raise exception 'Bare administratorene i fagmiljøene og systemarkitektene kan gi redaktøransvar.' using errcode = '42501';
  end if;
  nasjonalt := arkitekt and les_redaktoransvar.fagmiljo is null;

  return jsonb_build_object(
    'nasjonalt', jsonb_build_object('vises', nasjonalt, 'aktivert', intern.nasjonale_redaktorer_aktivert()),
    'fagmiljoer', coalesce((
      select jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn)
      from public.fagmiljoer f where f.id = any (omrader)
    ), '[]'::jsonb),
    'ansvar', coalesce((
      select jsonb_agg(intern.redaktoransvarsbeskrivelse(a, aktor) order by f.navn nulls first, a.omrade, p.last_name, p.first_name, a.tildelt_kl)
      from public.redaktoransvar a
      cross join lateral (select intern.redaktoransvarets_fagmiljo(a.omrade, a.ressurs_id, a.fagmiljo_id) as id) m
      left join public.fagmiljoer f on f.id = m.id
      left join public.profiles p on p.id = a.bruker_id
      where a.tilbakekalt_kl is null
        and (m.id = any (omrader) or (m.id is null and nasjonalt))
    ), '[]'::jsonb),
    'ressurser', coalesce((
      select jsonb_agg(b.beskrivelse || jsonb_build_object('har_redaktor', b.har_redaktor)
        order by b.beskrivelse ->> 'fagmiljo_id', b.beskrivelse ->> 'type', b.beskrivelse ->> 'navn')
      from (
        select intern.redaktorressurs(o.id) as beskrivelse,
          exists (select 1 from intern.ressursens_redaktorer(o.id)) as har_redaktor
        from public.redigerbare_objekter o
        join public.ressursomfang r on r.objekt_id = o.id
        where intern.er_ressurstype(o.type)
          and r.omfang = 'fagmiljo'
          and r.fagmiljo_id = any (omrader)
      ) b
      where b.beskrivelse is not null
    ), '[]'::jsonb),
    'fagsider_uten_redaktor', case when nasjonalt then (
      select count(*) from public.redigerbare_objekter o
      where o.type = 'infoside' and not exists (select 1 from intern.ressursens_redaktorer(o.id))
    ) end
  );
end;
$$;

revoke all on function public.les_redaktoransvar(uuid) from public, anon, authenticated, service_role;
grant execute on function public.les_redaktoransvar(uuid) to authenticated;

comment on function public.les_redaktoransvar(uuid) is
  'P5: redaktøransvarene og ressursene uten ansvarlig redaktør, innenfor den innloggedes myndighet. Se docs/redaktorer-og-forslag.md.';

-- Den innloggedes egne ansvar, med ressursbeskrivelsene.
create function public.mine_redaktoransvar()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select coalesce(jsonb_agg(intern.redaktoransvarsbeskrivelse(a, (select auth.uid())) order by a.tildelt_kl, a.id), '[]'::jsonb)
  from public.redaktoransvar a
  where a.bruker_id = (select auth.uid()) and a.tilbakekalt_kl is null
$$;

revoke all on function public.mine_redaktoransvar() from public, anon, authenticated, service_role;
grant execute on function public.mine_redaktoransvar() to authenticated;

comment on function public.mine_redaktoransvar() is
  'P5: den innloggedes egne redaktøransvar. Se docs/redaktorer-og-forslag.md.';

-- Redaktørene for én ressurs, for dem som kan behandle forslag til den
-- (redaktørene) eller har myndighet over den. En ressurs den innloggede ikke
-- kan lese, gir samme svar som en som ikke finnes.
create function public.ressursens_redaktoransvar(ressurs uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
begin
  perform intern.krev_aktivt_medlemskap();
  if aktor is null
    or not intern.kan_lese_objekt(ressursens_redaktoransvar.ressurs, aktor)
    or not intern.er_ressurstype((select o.type from public.redigerbare_objekter o where o.id = ressursens_redaktoransvar.ressurs))
  then
    raise exception 'Fant ikke ressursen.' using errcode = 'PT404';
  end if;
  if not intern.kan_behandle_forslag(ressursens_redaktoransvar.ressurs, aktor) then
    raise exception 'Bare redaktørene og administratorene ser hvem som er redaktør.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(intern.redaktoransvarsbeskrivelse(a, aktor) order by p.last_name, p.first_name, a.tildelt_kl)
    from public.redaktoransvar a
    left join public.profiles p on p.id = a.bruker_id
    where a.tilbakekalt_kl is null
      and intern.ansvar_for_ressurs(a, ressursens_redaktoransvar.ressurs)
      and intern.redaktoransvar_gjelder(a)
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.ressursens_redaktoransvar(uuid) from public, anon, authenticated, service_role;
grant execute on function public.ressursens_redaktoransvar(uuid) to authenticated;

comment on function public.ressursens_redaktoransvar(uuid) is
  'P5: redaktørene med ansvar for ressursen, for redaktørene og dem med myndighet over den. Se docs/redaktorer-og-forslag.md.';

-- --- Rettighetene i appen -----------------------------------------------------------

-- Som i 20261114202000, og ja også for en redaktør for fortolkningen i
-- arbeidskonteksten.
create or replace function public.kan_endre_lokalt_innhold()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.har_aktivt_medlemskap(auth.uid()) and (
    intern.kan_endre_omfang('fagmiljo', intern.arbeidsfagmiljo(auth.uid()), auth.uid())
    or exists (
      select 1 from intern.aktive_redaktoransvar(auth.uid()) a
      where a.omrade = 'fortolkning' and a.fagmiljo_id = intern.arbeidsfagmiljo(auth.uid())
    )
  )
$$;

-- Som i 20261116100000, med `redaktor` (har et redaktøransvar som gjelder) og
-- `behandler_forslag` (kan behandle forslag til noe: myndighet eller
-- redaktøransvar).
create or replace function public.mine_rettigheter()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  with opprett as (
    select coalesce(jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn), '[]'::jsonb) as i
    from public.fagmiljoer f
    where intern.opprettelsesavslag((select auth.uid()), f.id) is null
  ),
  arkitekt as (
    select public.er_systemarkitekt() as er
  )
  select jsonb_build_object(
    'systemarkitekt', arkitekt.er,
    'administrerer', coalesce((
      select jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn)
      from public.fagmiljoer f
      where f.id = any (public.mine_administrerte_fagmiljoer())
    ), '[]'::jsonb),
    'arbeidsfagmiljo', (
      select intern.fagmiljoreferanse(f)
      from public.fagmiljoer f
      where f.id = intern.arbeidsfagmiljo((select auth.uid()))
    ),
    'mine_fagmiljoer', coalesce((
      select jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn)
      from public.fagmiljoer f
      where f.status = 'aktiv'
        and exists (
          select 1 from public.medlemskap m
          where m.bruker_id = (select auth.uid()) and m.fagmiljo_id = f.id and m.status = 'aktiv'
        )
    ), '[]'::jsonb),
    'velgbare_fagmiljoer', coalesce((
      select jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn)
      from public.fagmiljoer f
      where f.status = 'aktiv'
        and (
          arkitekt.er
          or exists (
            select 1 from public.medlemskap m
            where m.bruker_id = (select auth.uid()) and m.fagmiljo_id = f.id and m.status = 'aktiv'
          )
        )
    ), '[]'::jsonb),
    'stoffregister', intern.har_registerrett((select auth.uid())),
    'opprett_bruker', jsonb_array_length(opprett.i) > 0,
    'opprett_bruker_i', opprett.i,
    'redaktor', exists (select 1 from intern.aktive_redaktoransvar((select auth.uid()))),
    'behandler_forslag', intern.har_endringsrett_noe((select auth.uid()))
  )
  from opprett, arkitekt
$$;
