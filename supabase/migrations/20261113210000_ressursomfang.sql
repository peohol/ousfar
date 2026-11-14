-- Rekkevidde for faginnholdet: P4a i docs/ousfar-nasjonal-p0-kartlegging.md
-- (§3, §5.1 og §6.1).
--
-- Hvert redigerbart objekt får nøyaktig én rad i `ressursomfang`: felles for
-- alle, eller lokalt for ett fagmiljø. Hvilken, avgjøres av én regel
-- (`intern.ressursomfang_for`), som både tilbakefyllingen og nye objekter
-- bruker. Ingenting leser tabellen ennå: radsikkerheten, rettighetene,
-- funksjonene og fortolkningen er som før, så ingen merker noe. P2 bygger
-- rettighetene per fagmiljø på den. Modellen står i docs/fagmiljoer.md.
--
-- Tilbakefyllingen av objektene som finnes, kjøres for seg, i
-- 20261113210100_ressursomfang_tilbakefylling.sql.

-- --- Tabellen ----------------------------------------------------------------

create table public.ressursomfang (
  objekt_id uuid primary key references public.redigerbare_objekter (id) on delete cascade,
  omfang text not null,
  fagmiljo_id uuid references public.fagmiljoer (id),
  -- Gruppene kommer i P6; da får kolonnen sin fremmednøkkel.
  gruppe_id uuid,
  -- Regelen som satte rekkevidden (`intern.ressursomfang_for`). Tom når en
  -- systemarkitekt har satt den for hånd (fra P2); da rører regelen den ikke.
  regel text,
  satt_kl timestamptz not null default now(),
  constraint ressursomfang_omfang check (omfang in ('felles', 'fagmiljo', 'gruppe')),
  constraint ressursomfang_felter check (
    (omfang = 'felles' and fagmiljo_id is null and gruppe_id is null)
    or (omfang = 'fagmiljo' and fagmiljo_id is not null and gruppe_id is null)
    or (omfang = 'gruppe' and gruppe_id is not null and fagmiljo_id is null)
  ),
  -- Det finnes ingen grupper før P6, som tar bort denne.
  constraint ressursomfang_ingen_grupper_ennaa check (omfang <> 'gruppe'),
  constraint ressursomfang_regel_form check (regel is null or regel ~ '^[a-z][a-z0-9_]*$')
);

comment on table public.ressursomfang is
  'Rekkevidden til hvert redigerbare objekt: felles eller ett fagmiljøs (P4a). Nøyaktig én rad per objekt. Se docs/fagmiljoer.md.';

create index ressursomfang_fagmiljo_idx on public.ressursomfang (fagmiljo_id) where fagmiljo_id is not null;

-- Bare server og migrasjoner. P2 leser den gjennom egne funksjoner.
alter table public.ressursomfang enable row level security;
revoke all on table public.ressursomfang from anon, authenticated;

-- --- Regelen ---------------------------------------------------------------

-- Fagmiljøet dagens fortolkningssystemer hører til (beslutning D1).
create function intern.opprinnelig_fagmiljo()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  f uuid;
begin
  select id into f from public.fagmiljoer where nokkel = 'ous-klinisk-farmakologi';
  if f is null then
    raise exception 'Fagmiljøet ous-klinisk-farmakologi finnes ikke.' using errcode = '55000';
  end if;
  return f;
end;
$$;

revoke all on function intern.opprinnelig_fagmiljo() from public, anon, authenticated, service_role;

-- Klassifiseringen i P0-rapporten §3, med beslutningen D4 fra OUSFAR Fag
-- (issue #374), etter objekttypen. Felles: fagsidene, alt innholdet på dem
-- (også referanseområdene, TDM-kortene og tabellene over
-- serumkonsentrasjoner) og referansebasen. Lokalt for det opprinnelige
-- fagmiljøet: laboratorieanalyttene, regelsettene og kommentarene
-- fortolkningen bruker, også THC-syreregelsettet med kurvene og marginene,
-- til en eventuell deling er særskilt godkjent.
-- En ny objekttype uten regel stopper her, så ingen får rekkevidde av seg selv.
create function intern.ressursomfang_for(objekt uuid)
returns table (omfang text, fagmiljo_id uuid, regel text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  t public.objekttype;
begin
  select o.type into t from public.redigerbare_objekter o where o.id = objekt;
  case
    when t is null then
      raise exception 'Objektet % finnes ikke.', objekt using errcode = 'P0002';
    when t in ('infoside', 'innholdselement', 'referanse') then
      return query select 'felles'::text, null::uuid, t::text;
    when t in ('laboratorieanalytt', 'intervallregelsett', 'scenarioregelsett', 'kommentar', 'thc_regelsett') then
      return query select 'fagmiljo'::text, intern.opprinnelig_fagmiljo(), t::text;
    else
      raise exception 'Objekttypen % har ingen regel for rekkevidde (docs/fagmiljoer.md).', t
        using errcode = '55000';
  end case;
end;
$$;

revoke all on function intern.ressursomfang_for(uuid) from public, anon, authenticated, service_role;

-- --- Nye objekter -------------------------------------------------------------

-- Et nytt objekt får rekkevidden etter regelen i samme transaksjon.
create function intern.gi_ressursomfang()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.ressursomfang (objekt_id, omfang, fagmiljo_id, regel)
  select new.id, r.omfang, r.fagmiljo_id, r.regel from intern.ressursomfang_for(new.id) r;
  return null;
end;
$$;

revoke all on function intern.gi_ressursomfang() from public, anon, authenticated, service_role;

create trigger redigerbare_objekter_ressursomfang
after insert on public.redigerbare_objekter
for each row execute function intern.gi_ressursomfang();

-- --- Det som ikke kan endres eller mangle -----------------------------------

create trigger ressursomfang_faste_felter
before update on public.ressursomfang
for each row execute function intern.tilgang_faste_felter('objekt_id');

-- Raden forsvinner bare sammen med objektet. Kontrollert ved slutten av
-- transaksjonen, slik at kaskaden fra et objekt som slettes for godt, går.
create function intern.krev_ressursomfang()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_level = 'STATEMENT' then
    raise exception 'Rekkevidden til objektene kan endres, ikke fjernes.' using errcode = '42501';
  end if;
  if exists (select 1 from public.redigerbare_objekter o where o.id = old.objekt_id)
    and not exists (select 1 from public.ressursomfang r where r.objekt_id = old.objekt_id)
  then
    raise exception 'Objektet % må ha en rekkevidde; den kan endres, ikke fjernes.', old.objekt_id
      using errcode = '23514';
  end if;
  return null;
end;
$$;

revoke all on function intern.krev_ressursomfang() from public, anon, authenticated, service_role;

create constraint trigger ressursomfang_ikke_mangle
after delete on public.ressursomfang
deferrable initially deferred
for each row execute function intern.krev_ressursomfang();

create trigger ressursomfang_ikke_tom
before truncate on public.ressursomfang
for each statement execute function intern.krev_ressursomfang();

-- Hver endring av en rekkevidde føres i tilgangsloggen, med den innloggede
-- og begrunnelsen (`ousfar.tilgangsgrunn`). Nye rader og kaskaden fra objekter
-- som slettes, føres ikke: de følger av regelen og av objektets egen historikk.
create trigger ressursomfang_logg
after update on public.ressursomfang
for each row execute function intern.loggfor_tilgang();

comment on table public.tilgangslogg is
  'Alle endringer i fagmiljøer, medlemskap, systemroller, lokale administratorer og rekkevidden til objektene. Kan ikke endres eller slettes.';
