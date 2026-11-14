-- P4b: fortolkningsreglene per fagmiljø (docs/ousfar-nasjonal-p0-kartlegging.md
-- §2.6 og §6.2, docs/fagmiljoer.md, «Fortolkningen per fagmiljø»).
--
-- Flere fagmiljøer skal kunne ha samme analyttkode med hver sine regler og
-- kommentarer, uten at de blandes. Denne migrasjonen gjør det additivt:
--
--   1. Arbeidskonteksten: fortolkningen bruker alltid nøyaktig ett
--      fagmiljø, den innloggedes aktive primærmedlemskap
--      (`intern.arbeidsfagmiljo`). Uten det finnes ingen regler å bruke.
--   2. Laboratorieanalyttene, konsentrasjonsregelsettene, scenarioregel-
--      settene med analyttkodene sine og THC-syreregelsettet får kolonnen
--      `fagmiljo_id`, avledet av rekkevidden objektet har (P4a) og satt av
--      databasen, aldri av nettleseren. Nye unike nøkler har fagmiljøet med.
--   3. Alle oppslag etter kode eller modul gir bare det som hører til
--      arbeidskonteksten. Et fagmiljø uten egne regler får ingen, aldri
--      reglene til OUS Klinisk farmakologi.
--   4. Et regelsett kan bare peke på kommentarer i sitt eget fagmiljø, og et
--      nytt lokalt objekt hører til fagmiljøet det lages i.
--   5. Lokale fortolkningsregler kan ikke bli felles (D4, #374): deling
--      krever en egen, særskilt godkjent endring.
--
-- De gamle globale unike nøklene (én per kode i hele databasen) står til
-- erstatningen er kontrollert; de fjernes i en egen migrasjon som krever
-- Peders godkjenning (P0 §6.2, supabase/AGENTS.md). Så lenge de står, kan to
-- fagmiljøer ennå ikke ha samme kode, og ingenting endres for OUS Klinisk
-- farmakologi: alle fortolkningsobjektene hører til det i dag, og alle
-- medlemmene har det som primærmedlemskap.
--
-- Tilbakeføring: en ny migrasjon som setter funksjonene tilbake til
-- definisjonene før (20261114133000 og eldre), fjerner utløserne og de nye
-- indeksene og tar bort kolonnene. Ingen data endres eller slettes her.

-- --- 1. Arbeidskonteksten ----------------------------------------------------

-- Fagmiljøet fortolkningen gjelder for brukeren: det aktive
-- primærmedlemskapet i et aktivt fagmiljø (høyst ett,
-- `medlemskap_ett_aktivt_primaer_idx`). Null uten det, også for en
-- systemarkitekt: ingen får et fagmiljø de ikke er medlem av som reserve.
create function intern.arbeidsfagmiljo(bruker uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.fagmiljo_id
  from public.medlemskap m
  join public.fagmiljoer f on f.id = m.fagmiljo_id
  where arbeidsfagmiljo.bruker is not null
    and m.bruker_id = arbeidsfagmiljo.bruker
    and m.primaer
    and m.status = 'aktiv'
    and f.status = 'aktiv'
$$;

revoke all on function intern.arbeidsfagmiljo(uuid) from public, anon, authenticated, service_role;

comment on function intern.arbeidsfagmiljo(uuid) is
  'P4b: fagmiljøet fortolkningen gjelder for brukeren (aktivt primærmedlemskap), ellers null. Se docs/fagmiljoer.md.';

-- Den innloggedes arbeidskontekst, til oppslagene som kjøres som den
-- innloggede: `(select public.mitt_arbeidsfagmiljo())`. Svarer bare om den
-- innloggede selv, og bare med et aktivt medlemskap.
create function public.mitt_arbeidsfagmiljo()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when intern.har_aktivt_medlemskap((select auth.uid())) then intern.arbeidsfagmiljo((select auth.uid()))
  end
$$;

revoke all on function public.mitt_arbeidsfagmiljo() from public, anon, authenticated, service_role;
grant execute on function public.mitt_arbeidsfagmiljo() to authenticated;

comment on function public.mitt_arbeidsfagmiljo() is
  'P4b: den innloggedes arbeidskontekst (fagmiljøet fortolkningen gjelder), eller null. Se docs/fagmiljoer.md.';

-- Fagmiljøet et nytt lokalt objekt hører til: arbeidskonteksten til den som
-- lager det. Uten innlogget (migrasjonene, importene) det opprinnelige
-- fagmiljøet, som før. En innlogget uten arbeidskontekst får ikke lage noe
-- lokalt: det ville ellers havnet i et fagmiljø vedkommende ikke valgte.
create function intern.nytt_lokalt_fagmiljo()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  bruker uuid := (select auth.uid());
  f uuid;
begin
  if bruker is null then
    return intern.opprinnelig_fagmiljo();
  end if;
  f := intern.arbeidsfagmiljo(bruker);
  if f is null then
    raise exception 'Du har ikke noe aktivt fagmiljø å lage fortolkningsinnhold i.' using errcode = '42501';
  end if;
  return f;
end;
$$;

revoke all on function intern.nytt_lokalt_fagmiljo() from public, anon, authenticated, service_role;

-- Regelen fra P4a, med fagmiljøet fra arbeidskonteksten til den som lager
-- objektet i stedet for alltid det opprinnelige. Klassifiseringen etter
-- objekttypen er uendret.
create or replace function intern.ressursomfang_for(objekt uuid)
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
      return query select 'fagmiljo'::text, intern.nytt_lokalt_fagmiljo(), t::text;
    else
      raise exception 'Objekttypen % har ingen regel for rekkevidde (docs/fagmiljoer.md).', t
        using errcode = '55000';
  end case;
end;
$$;

-- Fagmiljøet et fortolkningsobjekt hører til, etter rekkevidden. Lokale
-- fortolkningsregler, analytter og kommentarer er alltid ett fagmiljøs (D4);
-- noe annet stoppes her, så det aldri blir brukt av alle i stillhet.
create function intern.fortolkningsfagmiljo(objekt uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r record;
begin
  select o.omfang, o.fagmiljo_id into r from public.ressursomfang o where o.objekt_id = fortolkningsfagmiljo.objekt;
  if not found then
    raise exception 'Fortolkningsobjektet % har ingen rekkevidde.', fortolkningsfagmiljo.objekt using errcode = '55000';
  end if;
  if r.omfang is distinct from 'fagmiljo' or r.fagmiljo_id is null then
    raise exception 'Fortolkningsregler, laboratorieanalytter og kommentarer hører til ett fagmiljø. Å dele dem krever en særskilt godkjent endring (D4).'
      using errcode = '42501';
  end if;
  return r.fagmiljo_id;
end;
$$;

revoke all on function intern.fortolkningsfagmiljo(uuid) from public, anon, authenticated, service_role;

-- --- 2. Fagmiljøet på reglene og analyttene -----------------------------------

-- Setter `fagmiljo_id` fra rekkevidden ved hver innsetting og endring, så den
-- aldri kan avvike fra den eller settes fra nettleseren.
create function intern.gi_fortolkningsfagmiljo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.fagmiljo_id := intern.fortolkningsfagmiljo(new.objekt_id);
  return new;
end;
$$;

revoke all on function intern.gi_fortolkningsfagmiljo() from public, anon, authenticated, service_role;

alter table public.laboratorieanalytter add column fagmiljo_id uuid references public.fagmiljoer (id);
alter table public.intervallregelsett add column fagmiljo_id uuid references public.fagmiljoer (id);
alter table public.scenarioregelsett add column fagmiljo_id uuid references public.fagmiljoer (id);
alter table public.scenarioanalytter add column fagmiljo_id uuid references public.fagmiljoer (id);
alter table public.thc_regelsett add column fagmiljo_id uuid references public.fagmiljoer (id);

create trigger laboratorieanalytter_fagmiljo
before insert or update on public.laboratorieanalytter
for each row execute function intern.gi_fortolkningsfagmiljo();

create trigger intervallregelsett_fagmiljo
before insert or update on public.intervallregelsett
for each row execute function intern.gi_fortolkningsfagmiljo();

create trigger scenarioregelsett_fagmiljo
before insert or update on public.scenarioregelsett
for each row execute function intern.gi_fortolkningsfagmiljo();

create trigger scenarioanalytter_fagmiljo
before insert or update on public.scenarioanalytter
for each row execute function intern.gi_fortolkningsfagmiljo();

create trigger thc_regelsett_fagmiljo
before insert or update on public.thc_regelsett
for each row execute function intern.gi_fortolkningsfagmiljo();

-- Tilbakefyllingen: utløserne setter fagmiljøet fra rekkevidden.
update public.laboratorieanalytter set fagmiljo_id = null;
update public.intervallregelsett set fagmiljo_id = null;
update public.scenarioregelsett set fagmiljo_id = null;
update public.scenarioanalytter set fagmiljo_id = null;
update public.thc_regelsett set fagmiljo_id = null;

alter table public.laboratorieanalytter alter column fagmiljo_id set not null;
alter table public.intervallregelsett alter column fagmiljo_id set not null;
alter table public.scenarioregelsett alter column fagmiljo_id set not null;
alter table public.scenarioanalytter alter column fagmiljo_id set not null;
alter table public.thc_regelsett alter column fagmiljo_id set not null;

-- De nye nøklene: én analytt, ett regelsett og ett THC-syreregelsett per kode
-- eller modul i hvert fagmiljø. De gamle, globale står ved siden av til de
-- fjernes i en egen, godkjent migrasjon.
create unique index laboratorieanalytter_fagmiljo_kode_entydig
  on public.laboratorieanalytter (tilstand, fagmiljo_id, kode);
create unique index intervallregelsett_fagmiljo_analyttkode_entydig
  on public.intervallregelsett (tilstand, fagmiljo_id, analyttkode);
create unique index scenarioregelsett_fagmiljo_modul_entydig
  on public.scenarioregelsett (tilstand, fagmiljo_id, modul);
create unique index scenarioanalytter_fagmiljo_kode_entydig
  on public.scenarioanalytter (tilstand, fagmiljo_id, kode);
create unique index thc_regelsett_fagmiljo_entydig
  on public.thc_regelsett (tilstand, fagmiljo_id);

comment on column public.laboratorieanalytter.fagmiljo_id is
  'P4b: fagmiljøet analytten hører til, avledet av rekkevidden (intern.fortolkningsfagmiljo). Settes av databasen.';
comment on column public.intervallregelsett.fagmiljo_id is
  'P4b: fagmiljøet regelsettet hører til, avledet av rekkevidden (intern.fortolkningsfagmiljo). Settes av databasen.';
comment on column public.scenarioregelsett.fagmiljo_id is
  'P4b: fagmiljøet regelsettet hører til, avledet av rekkevidden (intern.fortolkningsfagmiljo). Settes av databasen.';
comment on column public.scenarioanalytter.fagmiljo_id is
  'P4b: fagmiljøet regelsettet koden hører til, avledet av rekkevidden (intern.fortolkningsfagmiljo). Settes av databasen.';
comment on column public.thc_regelsett.fagmiljo_id is
  'P4b: fagmiljøet regelsettet hører til, avledet av rekkevidden (intern.fortolkningsfagmiljo). Settes av databasen.';

-- Flytter en systemarkitekt et fortolkningsobjekt til et annet fagmiljø
-- (`ressursomfang`, loggført), følger kolonnen med. Å gjøre det felles
-- stoppes av `intern.fortolkningsfagmiljo` (D4).
create function intern.flytt_fortolkningsfagmiljo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  case (select o.type from public.redigerbare_objekter o where o.id = new.objekt_id)
    when 'laboratorieanalytt' then
      update public.laboratorieanalytter t set fagmiljo_id = null where t.objekt_id = new.objekt_id;
    when 'intervallregelsett' then
      update public.intervallregelsett t set fagmiljo_id = null where t.objekt_id = new.objekt_id;
    when 'scenarioregelsett' then
      update public.scenarioregelsett t set fagmiljo_id = null where t.objekt_id = new.objekt_id;
      update public.scenarioanalytter t set fagmiljo_id = null where t.objekt_id = new.objekt_id;
    when 'thc_regelsett' then
      update public.thc_regelsett t set fagmiljo_id = null where t.objekt_id = new.objekt_id;
    else
      null;
  end case;
  return null;
end;
$$;

revoke all on function intern.flytt_fortolkningsfagmiljo() from public, anon, authenticated, service_role;

create trigger ressursomfang_fortolkningsfagmiljo
after update of omfang, fagmiljo_id on public.ressursomfang
for each row
when ((old.omfang, old.fagmiljo_id) is distinct from (new.omfang, new.fagmiljo_id))
execute function intern.flytt_fortolkningsfagmiljo();

-- --- 4. Kommentarene i samme fagmiljø som regelsettet -------------------------

-- Et regelsett kan bare peke på kommentarer i sitt eget fagmiljø, så en
-- fortolkning aldri gir et annet fagmiljøs tekst, heller ikke med en
-- manipulert ID. Argumentene: kolonnen med regelsettet, så kolonnene med
-- kommentarene. En tom kobling kontrolleres ikke (den kontrolleres av
-- `intern.krev_objekttype`).
create function intern.krev_kommentarer_i_fagmiljoet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad jsonb := to_jsonb(new);
  eier uuid := intern.fortolkningsfagmiljo((rad ->> tg_argv[0])::uuid);
  nr integer := 1;
  kobling uuid;
begin
  while nr < tg_nargs loop
    kobling := (rad ->> tg_argv[nr])::uuid;
    if kobling is not null and intern.fortolkningsfagmiljo(kobling) is distinct from eier then
      raise exception 'Regelsettet kan bare bruke kommentarer fra sitt eget fagmiljø.' using errcode = '42501';
    end if;
    nr := nr + 1;
  end loop;
  return new;
end;
$$;

revoke all on function intern.krev_kommentarer_i_fagmiljoet() from public, anon, authenticated, service_role;

create trigger intervallregler_kommentar_fagmiljo
before insert or update of regelsett_id, kommentar_id on public.intervallregler
for each row execute function intern.krev_kommentarer_i_fagmiljoet('regelsett_id', 'kommentar_id');

create trigger intervallregelsett_cutoff_fagmiljo
before insert or update of cutoff_innledning_id, cutoff_kommentar_id on public.intervallregelsett
for each row execute function intern.krev_kommentarer_i_fagmiljoet('objekt_id', 'cutoff_innledning_id', 'cutoff_kommentar_id');

create trigger scenarioplasseringer_kommentar_fagmiljo
before insert or update of objekt_id, kommentar_id on public.scenarioplasseringer
for each row execute function intern.krev_kommentarer_i_fagmiljoet('objekt_id', 'kommentar_id');

create trigger thc_tekstbolker_kommentar_fagmiljo
before insert or update of objekt_id, kommentar_id on public.thc_tekstbolker
for each row execute function intern.krev_kommentarer_i_fagmiljoet('objekt_id', 'kommentar_id');

-- --- Kontroll av tilbakefyllingen ---------------------------------------------

-- Hver rad har fagmiljøet rekkevidden gir, og ingen regel peker på en
-- kommentar i et annet fagmiljø. Stopper (og rulles tilbake) ellers. Skriver
-- bare antall i loggen.
do $$
declare
  avvik int;
  antall text;
begin
  select count(*) into avvik
  from (
    select objekt_id, fagmiljo_id from public.laboratorieanalytter
    union all select objekt_id, fagmiljo_id from public.intervallregelsett
    union all select objekt_id, fagmiljo_id from public.scenarioregelsett
    union all select objekt_id, fagmiljo_id from public.scenarioanalytter
    union all select objekt_id, fagmiljo_id from public.thc_regelsett
  ) t
  left join public.ressursomfang r on r.objekt_id = t.objekt_id
  where r.omfang is distinct from 'fagmiljo' or r.fagmiljo_id is distinct from t.fagmiljo_id;
  if avvik > 0 then
    raise exception 'P4b: % rader har et annet fagmiljø enn rekkevidden gir.', avvik;
  end if;

  select count(*) into avvik
  from (
    select r.regelsett_id as eier, r.kommentar_id as kommentar from public.intervallregler r
    union all select s.objekt_id, s.cutoff_innledning_id from public.intervallregelsett s where s.cutoff_innledning_id is not null
    union all select s.objekt_id, s.cutoff_kommentar_id from public.intervallregelsett s where s.cutoff_kommentar_id is not null
    union all select p.objekt_id, p.kommentar_id from public.scenarioplasseringer p
    union all select b.objekt_id, b.kommentar_id from public.thc_tekstbolker b
  ) k
  join public.ressursomfang re on re.objekt_id = k.eier
  left join public.ressursomfang rk on rk.objekt_id = k.kommentar
  where rk.omfang is distinct from 'fagmiljo' or rk.fagmiljo_id is distinct from re.fagmiljo_id;
  if avvik > 0 then
    raise exception 'P4b: % regler peker på en kommentar i et annet fagmiljø.', avvik;
  end if;

  select string_agg(format('%s %s', t.tabell, t.n), ', ' order by t.tabell) into antall
  from (
    select 'laboratorieanalytter' as tabell, count(*) as n from public.laboratorieanalytter
    union all select 'intervallregelsett', count(*) from public.intervallregelsett
    union all select 'scenarioregelsett', count(*) from public.scenarioregelsett
    union all select 'scenarioanalytter', count(*) from public.scenarioanalytter
    union all select 'thc_regelsett', count(*) from public.thc_regelsett
  ) t;
  raise notice 'P4b: fagmiljø satt på %.', coalesce(antall, 'ingen rader');
end;
$$;

-- --- 3. Oppslagene etter kode og modul ------------------------------------------

-- Regelsettet for én kode, til redigeringen: bare i arbeidskonteksten.
create or replace function public.finn_intervallregelsett(analyttkode text, sidetilstand public.objekttilstand)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.utgave_som_json(u)
  from public.intervallregelsett s
  join public.objektutgaver u on u.objekt_id = s.objekt_id and u.tilstand = s.tilstand
  where s.analyttkode = finn_intervallregelsett.analyttkode and s.tilstand = sidetilstand
    and s.fagmiljo_id = (select public.mitt_arbeidsfagmiljo())
$$;

-- Regelsettene fortolkningen bruker: bare arbeidskontekstens.
create or replace function public.les_intervallregelsett(sidetilstand public.objekttilstand)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(public.utgave_som_json(u) order by s.analyttkode), '[]'::jsonb)
  from public.intervallregelsett s
  join public.objektutgaver u on u.objekt_id = s.objekt_id and u.tilstand = s.tilstand
  where s.tilstand = sidetilstand
    and s.fagmiljo_id = (select public.mitt_arbeidsfagmiljo())
$$;

-- Scenarioregelsettene og kommentarene de peker på: bare arbeidskontekstens.
create or replace function public.les_scenarioregler(regeltilstand public.objekttilstand)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with regelsett as (
    select r.objekt_id
    from public.scenarioregelsett r
    where r.tilstand = regeltilstand
      and r.fagmiljo_id = (select public.mitt_arbeidsfagmiljo())
  )
  select jsonb_build_object(
    'regelsett', coalesce((
      select jsonb_agg(public.utgave_som_json(u) order by u.innhold ->> 'modul')
      from public.objektutgaver u
      where u.tilstand = regeltilstand and u.objekt_id in (select objekt_id from regelsett)
    ), '[]'::jsonb),
    'kommentarer', coalesce((
      select jsonb_agg(public.utgave_som_json(u) order by u.objekt_id)
      from public.objektutgaver u
      where u.tilstand = regeltilstand
        and u.objekt_id in (
          select pl.kommentar_id from public.scenarioplasseringer pl
          where pl.tilstand = regeltilstand and pl.objekt_id in (select objekt_id from regelsett)
        )
    ), '[]'::jsonb)
  )
$$;

-- THC-syreregelsettet: arbeidskontekstens, høyst ett.
create or replace function public.les_thc_regelsett(regelsettilstand public.objekttilstand)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select public.utgave_som_json(u)
  from public.thc_regelsett r
  join public.objektutgaver u on u.objekt_id = r.objekt_id and u.tilstand = r.tilstand
  where r.tilstand = regelsettilstand
    and r.fagmiljo_id = (select public.mitt_arbeidsfagmiljo())
$$;

-- Fagsidene uten kode: uten en laboratorieanalytt i arbeidskonteksten.
create or replace view public.stoffsider_uten_kode
with (security_invoker = true)
as
select s.objekt_id, s.tilstand, s.navn
from public.infosider s
where not exists (
    select 1 from public.laboratorieanalytter a
    where a.hovedside_id = s.objekt_id and a.tilstand = s.tilstand
      and a.fagmiljo_id = (select public.mitt_arbeidsfagmiljo())
  )
  and not exists (
    select 1 from public.analyttkomponenter k
    join public.laboratorieanalytter a on a.objekt_id = k.analytt_id and a.tilstand = k.tilstand
    where k.infoside_id = s.objekt_id and k.tilstand = s.tilstand
      and a.fagmiljo_id = (select public.mitt_arbeidsfagmiljo())
  );

-- Resten av oppslagene etter kode eller modul, og kontrollene ved lagring,
-- slik de var, med fagmiljøet lagt til (markert «fagmiljo_id»).
-- intern.skriv_intervallregelsett
CREATE OR REPLACE FUNCTION intern.skriv_intervallregelsett(p_objekt uuid, p_tilstand public.objekttilstand, p_innhold jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  eldre_kommentarer jsonb;
  eldre jsonb;
  eldre_ider uuid[] := array[]::uuid[];
  kode text;
  ny_enhet text;
  nye_desimaler integer;
  steg numeric;
  grenser numeric[];
  intervaller jsonb;
  intervall jsonb;
  antall integer;
  nr integer;
  niva public.konsentrasjonsniva;
  forrige_niva public.konsentrasjonsniva;
  handling public.regelhandling;
  ring_fra integer;
  ring_grense numeric;
  cutoff jsonb;
  innledning uuid;
  hovedkommentar uuid;
  brukte uuid[] := array[]::uuid[];
  kommentar uuid;
begin
  if jsonb_typeof(p_innhold) = 'object' and p_innhold ? 'kommentarer' then
    eldre_kommentarer := p_innhold -> 'kommentarer';
    p_innhold := p_innhold - 'kommentarer';
  end if;

  perform intern.krev_felt(
    p_innhold,
    array['analyttkode', 'enhet', 'desimaler', 'skillepunkter', 'intervaller', 'ringegrense', 'cutoff']
  );

  kode := intern.tekst(p_innhold, 'analyttkode');
  if char_length(kode) > 32 or kode !~ '^[A-Z0-9]+([._-][A-Z0-9]+)*$' then
    raise exception 'Analyttkoden «%» er ikke gyldig.', kode using errcode = '22023';
  end if;
  if exists (
    select 1 from public.intervallregelsett s
    where s.tilstand = p_tilstand and s.analyttkode = kode and s.objekt_id <> p_objekt
      and s.fagmiljo_id = intern.fortolkningsfagmiljo(p_objekt)
  ) then
    raise exception 'Analyttkoden % har alt et regelsett.', kode using errcode = '22023';
  end if;

  ny_enhet := intern.tekst(p_innhold, 'enhet');
  if ny_enhet = '' then
    raise exception 'Enheten mangler.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.maleenheter m where m.enhet = ny_enhet) then
    raise exception 'Enheten «%» er ikke gyldig.', ny_enhet using errcode = '22023';
  end if;

  nye_desimaler := intern.heltall(p_innhold, 'desimaler');
  if nye_desimaler not between 0 and 6 then
    raise exception 'Antall desimaler må være mellom 0 og 6.' using errcode = '22023';
  end if;
  steg := power(10::numeric, -nye_desimaler);

  -- Grensene: positive, i hele steg, og strengt stigende.
  grenser := intern.tall_liste(p_innhold, 'skillepunkter');
  for nr in 1 .. coalesce(cardinality(grenser), 0) loop
    if grenser[nr] <= 0 then
      raise exception 'Grensene må være større enn null.' using errcode = '22023';
    end if;
    if grenser[nr] % steg <> 0 then
      raise exception 'Grensen % har flere desimaler enn regelsettet (%).',
        intern.vis_tall(grenser[nr]), nye_desimaler using errcode = '22023';
    end if;
    if nr > 1 and grenser[nr] <= grenser[nr - 1] then
      raise exception 'Grensene må stige: % kommer etter %.',
        intern.vis_tall(grenser[nr]), intern.vis_tall(grenser[nr - 1]) using errcode = '22023';
    end if;
  end loop;

  -- Intervallene: ett mer enn grensene, hvert med nivå, kommentar og
  -- eventuell handling.
  if jsonb_typeof(p_innhold -> 'intervaller') is distinct from 'array' then
    raise exception 'Feltet intervaller må være en liste.' using errcode = '22023';
  end if;
  intervaller := p_innhold -> 'intervaller';
  antall := jsonb_array_length(intervaller);
  if antall = 0 then
    raise exception 'Regelsettet må ha minst ett intervall.' using errcode = '22023';
  end if;
  if antall > 20 then
    raise exception 'Et regelsett kan ha høyst 20 intervaller.' using errcode = '22023';
  end if;
  if antall <> coalesce(cardinality(grenser), 0) + 1 then
    raise exception 'Det må være nøyaktig ett intervall mer enn det er grenser.' using errcode = '22023';
  end if;

  delete from public.intervallregler r where r.regelsett_id = p_objekt and r.tilstand = p_tilstand;

  -- Selve regelsettet først, så reglene. Cut-off og ringegrensen settes etter
  -- at intervallene er kontrollert.
  insert into public.intervallregelsett (objekt_id, tilstand, analyttkode, enhet, desimaler)
  values (p_objekt, p_tilstand, kode, ny_enhet, nye_desimaler)
  on conflict on constraint intervallregelsett_pkey do update set
    analyttkode = excluded.analyttkode,
    enhet = excluded.enhet,
    desimaler = excluded.desimaler,
    ringegrense = null,
    cutoff_innledning_id = null,
    cutoff_kommentar_id = null;

  for nr in 1 .. antall loop
    intervall := intervaller -> (nr - 1);
    if jsonb_typeof(intervall) is distinct from 'object' then
      raise exception 'Intervall % må være et objekt.', nr using errcode = '22023';
    end if;
    perform intern.krev_felt(intervall, array['niva', 'handling', 'kommentar']);

    if jsonb_typeof(intervall -> 'niva') is distinct from 'string'
      or (intervall ->> 'niva') <> all (enum_range(null::public.konsentrasjonsniva)::text[])
    then
      raise exception 'Intervall % har et ukjent nivå.', nr using errcode = '22023';
    end if;
    niva := (intervall ->> 'niva')::public.konsentrasjonsniva;
    if forrige_niva is not null and niva < forrige_niva then
      raise exception 'Nivåene må følge konsentrasjonen: «%» kan ikke komme etter «%».', niva, forrige_niva
        using errcode = '22023';
    end if;
    forrige_niva := niva;

    handling := null;
    if jsonb_typeof(intervall -> 'handling') <> 'null' then
      if jsonb_typeof(intervall -> 'handling') <> 'string'
        or (intervall ->> 'handling') <> all (enum_range(null::public.regelhandling)::text[])
      then
        raise exception 'Intervall % har en ukjent handling.', nr using errcode = '22023';
      end if;
      handling := (intervall ->> 'handling')::public.regelhandling;
    end if;

    if jsonb_typeof(intervall -> 'kommentar') is distinct from 'string' then
      raise exception 'Intervall % mangler kommentar.', nr using errcode = '22023';
    end if;
    kommentar := intern.id(intervall, 'kommentar');
    if kommentar <> all (brukte) then
      brukte := brukte || kommentar;
    end if;

    -- Ringegrensen gjelder alt over seg: fra det første intervallet med
    -- handlingen skal også alle over ha den.
    if handling = 'ring_rekvirent' then
      if nr = 1 then
        raise exception 'Det nederste intervallet kan ikke ha «ring rekvirent».' using errcode = '22023';
      end if;
      ring_fra := coalesce(ring_fra, nr);
    elsif ring_fra is not null then
      raise exception 'Alle intervallene over ringegrensen må ha «ring rekvirent».' using errcode = '22023';
    end if;

    -- Koblingen kontrolleres av intervallregler_kommentar: den må peke på en
    -- kommentar, og det publiserte på en publisert kommentar.
    insert into public.intervallregler (
      regelsett_id, tilstand, posisjon, fra, til, niva, handling, kommentar_id
    )
    values (
      p_objekt,
      p_tilstand,
      nr,
      case when nr = 1 then null else grenser[nr - 1] end,
      case when nr = antall then null else grenser[nr] end,
      niva,
      handling,
      kommentar
    );
  end loop;

  -- Ringegrensen som vises, må stemme med intervallene: den er grensen der
  -- ringingen begynner, eller tallet rett under når regelen er «over
  -- ringegrensen».
  if jsonb_typeof(p_innhold -> 'ringegrense') = 'null' then
    ring_grense := null;
  else
    ring_grense := intern.tall(p_innhold, 'ringegrense');
  end if;
  if ring_fra is null and ring_grense is not null then
    raise exception 'Ringegrensen er oppgitt, men ingen intervaller har «ring rekvirent».' using errcode = '22023';
  end if;
  if ring_fra is not null then
    if ring_grense is null then
      raise exception 'Ringegrensen mangler.' using errcode = '22023';
    end if;
    if ring_grense % steg <> 0 then
      raise exception 'Ringegrensen har flere desimaler enn regelsettet (%).', nye_desimaler using errcode = '22023';
    end if;
    if grenser[ring_fra - 1] not in (ring_grense, ring_grense + steg) then
      raise exception 'Ringegrensen % stemmer ikke med intervallet der ringingen begynner (%).',
        intern.vis_tall(ring_grense), intern.vis_tall(grenser[ring_fra - 1]) using errcode = '22023';
    end if;
  end if;

  -- Cut-off: en innledning satt foran en av kommentarene intervallene gir.
  cutoff := p_innhold -> 'cutoff';
  if jsonb_typeof(cutoff) = 'object' then
    perform intern.krev_felt(cutoff, array['innledning', 'kommentar']);
    innledning := intern.id(cutoff, 'innledning');
    hovedkommentar := intern.id(cutoff, 'kommentar');
    if innledning = hovedkommentar then
      raise exception 'Innledningen til cut-off må være en egen kommentar.' using errcode = '22023';
    end if;
    if hovedkommentar <> all (brukte) then
      raise exception 'Cut-off må bygge på en av kommentarene intervallene bruker.' using errcode = '22023';
    end if;
    if innledning <> all (brukte) then
      brukte := brukte || innledning;
    end if;
  elsif jsonb_typeof(cutoff) is distinct from 'null' then
    raise exception 'Feltet cutoff må være et objekt eller null.' using errcode = '22023';
  end if;

  update public.intervallregelsett s set
    ringegrense = ring_grense,
    cutoff_innledning_id = innledning,
    cutoff_kommentar_id = hovedkommentar
  where s.objekt_id = p_objekt and s.tilstand = p_tilstand;

  perform intern.krev_kommentarer_uten_plassholdere(brukte);
  perform intern.krev_sammenhengende_intervaller(p_objekt, p_tilstand);

  -- En eldre revisjon: listen må være nøyaktig kommentarene reglene bruker.
  if eldre_kommentarer is not null then
    if jsonb_typeof(eldre_kommentarer) is distinct from 'array' then
      raise exception 'Kommentarene må være en liste.' using errcode = '22023';
    end if;
    for eldre in select e.v from jsonb_array_elements(eldre_kommentarer) e(v) loop
      if jsonb_typeof(eldre) is distinct from 'object' then
        raise exception 'En kommentar må være et objekt.' using errcode = '22023';
      end if;
      perform intern.krev_felt(eldre, array['id', 'tekst']);
      perform intern.tekst(eldre, 'tekst');
      eldre_ider := eldre_ider || intern.id(eldre, 'id');
    end loop;
    if cardinality(eldre_ider) <> (select count(distinct e) from unnest(eldre_ider) e)
      or not (eldre_ider @> brukte and brukte @> eldre_ider)
    then
      raise exception 'Kommentarene i revisjonen stemmer ikke med dem reglene bruker.' using errcode = '22023';
    end if;
  end if;
end;
$function$;

-- intern.skriv_scenarioregelsett
CREATE OR REPLACE FUNCTION intern.skriv_scenarioregelsett(p_objekt uuid, p_tilstand public.objekttilstand, p_innhold jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  feil text;
  ny_modul text;
  opptatt text;
begin
  perform intern.krev_scenarioform(p_innhold);

  select string_agg(m, E'\n') into feil from intern.scenariofeil(p_innhold) m;
  if feil is not null then
    raise exception '%', feil using errcode = '22023';
  end if;

  ny_modul := p_innhold ->> 'modul';
  if exists (
    select 1 from public.scenarioregelsett r
    where r.tilstand = p_tilstand and r.modul = ny_modul and r.objekt_id <> p_objekt
      and r.fagmiljo_id = intern.fortolkningsfagmiljo(p_objekt)
  ) then
    raise exception 'Det finnes alt et regelsett for modulen %.', ny_modul using errcode = '22023';
  end if;
  select string_agg(a.kode, ', ' order by a.kode) into opptatt
  from public.scenarioanalytter a
  where a.tilstand = p_tilstand and a.objekt_id <> p_objekt
    and a.fagmiljo_id = intern.fortolkningsfagmiljo(p_objekt)
    and a.kode in (select jsonb_array_elements_text(p_innhold -> 'analytter'));
  if opptatt is not null then
    raise exception 'Analyttkodene % fortolkes alt av et annet regelsett.', opptatt using errcode = '22023';
  end if;

  insert into public.scenarioregelsett (objekt_id, tilstand, modul, verdihjelp)
  values (p_objekt, p_tilstand, ny_modul, p_innhold ->> 'verdihjelp')
  on conflict on constraint scenarioregelsett_pkey
  do update set modul = excluded.modul, verdihjelp = excluded.verdihjelp;

  -- Delene skrives på nytt. Det som hører til analyttene, forholdene og
  -- scenariene, forsvinner med dem.
  delete from public.scenarier s where s.objekt_id = p_objekt and s.tilstand = p_tilstand;
  delete from public.scenarioforhold f where f.objekt_id = p_objekt and f.tilstand = p_tilstand;
  delete from public.scenarioparametere p where p.objekt_id = p_objekt and p.tilstand = p_tilstand;
  delete from public.scenarioanalytter a where a.objekt_id = p_objekt and a.tilstand = p_tilstand;

  insert into public.scenarioanalytter (objekt_id, tilstand, kode, posisjon)
  select p_objekt, p_tilstand, a, nr
  from jsonb_array_elements_text(p_innhold -> 'analytter') with ordinality as x(a, nr);

  insert into public.scenarioforhold (objekt_id, tilstand, nokkel, posisjon, nullmelding)
  select p_objekt, p_tilstand, f ->> 'nokkel', nr, f ->> 'nullmelding'
  from jsonb_array_elements(p_innhold -> 'forhold') with ordinality as x(f, nr);

  insert into public.scenarioforholdsledd (objekt_id, tilstand, forhold, kode, del, posisjon)
  select p_objekt, p_tilstand, f ->> 'nokkel', k, d.del, knr
  from jsonb_array_elements(p_innhold -> 'forhold') f,
    (values ('teller'), ('nevner')) as d(del),
    jsonb_array_elements_text(f -> d.del) with ordinality as y(k, knr);

  insert into public.scenarioparametere (objekt_id, tilstand, nokkel, posisjon, navn, verdi)
  select p_objekt, p_tilstand, p ->> 'nokkel', nr, p ->> 'navn', (p ->> 'verdi')::numeric
  from jsonb_array_elements(p_innhold -> 'parametere') with ordinality as x(p, nr);

  insert into public.scenarier (objekt_id, tilstand, nokkel, posisjon, utfall, melding)
  select p_objekt, p_tilstand, s ->> 'nokkel', nr, s -> 'utfall' ->> 'type', s -> 'utfall' ->> 'melding'
  from jsonb_array_elements(p_innhold -> 'scenarier') with ordinality as x(s, nr);

  insert into public.scenariopavist (objekt_id, tilstand, scenario, kode)
  select p_objekt, p_tilstand, s ->> 'nokkel', k
  from jsonb_array_elements(p_innhold -> 'scenarier') s, jsonb_array_elements_text(s -> 'pavist') k;

  insert into public.scenariovilkar (objekt_id, tilstand, scenario, posisjon, forhold, operator, parameter)
  select p_objekt, p_tilstand, s ->> 'nokkel', nr, v ->> 'forhold', v ->> 'operator', v ->> 'parameter'
  from jsonb_array_elements(p_innhold -> 'scenarier') s,
    jsonb_array_elements(s -> 'vilkar') with ordinality as x(v, nr);

  insert into public.scenarioplasseringer (objekt_id, tilstand, scenario, posisjon, rolle, merke, kommentar_id)
  select p_objekt, p_tilstand, s ->> 'nokkel', nr, pl ->> 'rolle', pl ->> 'merke', (pl ->> 'kommentar')::uuid
  from jsonb_array_elements(p_innhold -> 'scenarier') s,
    jsonb_array_elements(coalesce(s -> 'utfall' -> 'plasseringer', '[]')) with ordinality as x(pl, nr);

  insert into public.scenarioplasseringskoder (objekt_id, tilstand, scenario, plassering, posisjon, kode)
  select p_objekt, p_tilstand, s ->> 'nokkel', pnr, knr, k
  from jsonb_array_elements(p_innhold -> 'scenarier') s,
    jsonb_array_elements(coalesce(s -> 'utfall' -> 'plasseringer', '[]')) with ordinality as x(pl, pnr),
    jsonb_array_elements_text(pl -> 'koder') with ordinality as y(k, knr);

  insert into public.scenariotekster (objekt_id, tilstand, scenario, art, posisjon, tekst)
  select p_objekt, p_tilstand, s ->> 'nokkel', d.art, nr, t
  from jsonb_array_elements(p_innhold -> 'scenarier') s,
    (values ('notis', 'notiser'), ('veiledning', 'veiledning')) as d(art, felt),
    jsonb_array_elements_text(coalesce(s -> 'utfall' -> d.felt, '[]')) with ordinality as x(t, nr);
end;
$function$;

-- intern.skriv_laboratorieanalytt
CREATE OR REPLACE FUNCTION intern.skriv_laboratorieanalytt(p_objekt uuid, p_tilstand public.objekttilstand, p_innhold jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  ny_kode text;
  komponenter uuid[];
begin
  perform intern.krev_felt(p_innhold, array['kode', 'hovedside', 'komponenter']);
  ny_kode := intern.tekst(p_innhold, 'kode');
  komponenter := intern.id_liste(p_innhold, 'komponenter');

  if cardinality(komponenter) = 0 then
    raise exception 'En laboratorieanalytt må omfatte minst én komponent.' using errcode = '22023';
  end if;

  if exists (
    select 1 from public.laboratorieanalytter a
    where a.tilstand = p_tilstand and a.kode = ny_kode and a.objekt_id <> p_objekt
      and a.fagmiljo_id = intern.fortolkningsfagmiljo(p_objekt)
  ) then
    raise exception 'Analyttkoden % er alt i bruk.', ny_kode using errcode = '22023';
  end if;

  insert into public.laboratorieanalytter (objekt_id, tilstand, kode, hovedside_id)
  values (p_objekt, p_tilstand, ny_kode, intern.id(p_innhold, 'hovedside'))
  on conflict on constraint laboratorieanalytter_pkey
  do update set kode = excluded.kode, hovedside_id = excluded.hovedside_id;

  delete from public.analyttkomponenter k
  where k.analytt_id = p_objekt and k.tilstand = p_tilstand;

  insert into public.analyttkomponenter (analytt_id, tilstand, posisjon, infoside_id)
  select p_objekt, p_tilstand, k.nr, k.infoside
  from unnest(komponenter) with ordinality as k(infoside, nr);
end;
$function$;

-- intern.skriv_thc_regelsett_innhold
CREATE OR REPLACE FUNCTION intern.skriv_thc_regelsett_innhold(p_objekt uuid, p_tilstand public.objekttilstand, p_innhold jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  maleusikkerhet jsonb;
  kurver jsonb;
  kurve jsonb;
  rolle public.thc_kurverolle;
  element jsonb;
  nr integer;
  forrige_verdi double precision;
  verdi double precision;
  z double precision;
  standard double precision;
  varsel integer;
  monster text;
  monstre jsonb;
  vanskelig public.thc_kurverolle;
  nytt public.thc_kurverolle;
  bolker jsonb;
  nokkel text;
  kommentar uuid;
  plassholdere text[];
  avvik text;
  faktor double precision;
  kort_tid integer;
  sporsmal jsonb;
  sporsmalsliste text[];
  roller constant public.thc_kurverolle[] := enum_range(null::public.thc_kurverolle);
  hvor text;
begin
  -- Utgaver fra før de nåværende tekstene gjenopprettes med kommentarene
  -- regelsettet bruker nå (intern.thc_innhold_fra_eldre_utgave).
  p_innhold := intern.thc_innhold_fra_eldre_utgave(p_objekt, p_innhold);

  perform intern.krev_felt(p_innhold, array[
    'konverteringsfaktor', 'kurver', 'maleusikkerhet', 'sikkerhetsmarginer', 'standard_sikkerhetsmargin',
    'konsentrasjonsnivaer', 'bruksmonstre', 'varsel_dager_mellom', 'kort_tid_dager', 'med_sporsmalsetning',
    'tekstbolker'
  ]);

  faktor := intern.flyttall(p_innhold, 'konverteringsfaktor');
  if not faktor > 0 then
    raise exception 'Konverteringsfaktoren må være et tall større enn 0.' using errcode = '22023';
  end if;

  maleusikkerhet := intern.objekt(p_innhold, 'maleusikkerhet');
  perform intern.krev_felt(maleusikkerhet, array['cv_thc', 'cv_kreatinin', 'faktor_under_cutoff']);
  if not (intern.flyttall(maleusikkerhet, 'cv_thc') > 0 and intern.flyttall(maleusikkerhet, 'cv_thc') < 1) then
    raise exception 'CV for THC-syre må ligge mellom 0 og 1.' using errcode = '22023';
  end if;
  if not (intern.flyttall(maleusikkerhet, 'cv_kreatinin') > 0 and intern.flyttall(maleusikkerhet, 'cv_kreatinin') < 1) then
    raise exception 'CV for kreatinin må ligge mellom 0 og 1.' using errcode = '22023';
  end if;
  if not intern.flyttall(maleusikkerhet, 'faktor_under_cutoff') >= 1 then
    raise exception 'Faktoren for måleusikkerhet under cut-off må være minst 1.' using errcode = '22023';
  end if;

  -- Det finnes bare ett THC-syreregelsett i hvert fagmiljø (P4b).
  if exists (
    select 1 from public.thc_regelsett r
    where r.tilstand = p_tilstand and r.objekt_id <> p_objekt
      and r.fagmiljo_id = intern.fortolkningsfagmiljo(p_objekt)
  ) then
    raise exception 'Det finnes alt et THC-syreregelsett. Endre det i stedet for å lage et nytt.'
      using errcode = '22023';
  end if;

  standard := intern.flyttall(p_innhold, 'standard_sikkerhetsmargin');
  varsel := intern.heltall(p_innhold, 'varsel_dager_mellom');
  if varsel < 1 then
    raise exception 'Varselet om tid mellom prøvene må være et helt antall døgn, minst 1.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_innhold -> 'kort_tid_dager') is distinct from 'number'
    or (p_innhold ->> 'kort_tid_dager')::numeric <> trunc((p_innhold ->> 'kort_tid_dager')::numeric)
    or (p_innhold ->> 'kort_tid_dager')::numeric < 1
  then
    raise exception 'Grensen for kort tid mellom prøvene må være et helt antall døgn, minst 1.' using errcode = '22023';
  end if;
  kort_tid := intern.heltall(p_innhold, 'kort_tid_dager');

  -- Kommentarene som avsluttes med spørsmålsetningen: kommentarer, hver én
  -- gang, i fast rekkefølge, som validerThcRegelsett i thcRegelsett.ts.
  sporsmal := intern.liste(p_innhold, 'med_sporsmalsetning');
  if exists (select 1 from jsonb_array_elements(sporsmal) e where jsonb_typeof(e) is distinct from 'string') then
    raise exception 'Det må oppgis hvilke kommentarer som avsluttes med spørsmålsetningen.' using errcode = '22023';
  end if;
  sporsmalsliste := array(select e from jsonb_array_elements_text(sporsmal) with ordinality as x(e, n) order by n);
  select string_agg(k, ', ' order by n) into avvik
  from unnest(sporsmalsliste) with ordinality as x(k, n)
  where k <> all (intern.thc_kommentarnokler());
  if avvik is not null then
    raise exception 'Spørsmålsetningen er satt for en ukjent kommentar: %.', avvik using errcode = '22023';
  end if;
  if sporsmalsliste is distinct from array(
    select k from unnest(intern.thc_kommentarnokler()) with ordinality as x(k, n)
    where k = any (sporsmalsliste) order by n
  ) then
    raise exception 'Spørsmålsetningen må være satt én gang per kommentar, i fast rekkefølge.' using errcode = '22023';
  end if;

  insert into public.thc_regelsett (
    objekt_id, tilstand, konverteringsfaktor, cv_thc, cv_kreatinin, faktor_under_cutoff,
    standard_sikkerhetsmargin, varsel_dager_mellom, kort_tid_dager, med_sporsmalsetning
  )
  values (
    p_objekt, p_tilstand, faktor,
    intern.flyttall(maleusikkerhet, 'cv_thc'),
    intern.flyttall(maleusikkerhet, 'cv_kreatinin'),
    intern.flyttall(maleusikkerhet, 'faktor_under_cutoff'),
    standard, varsel, kort_tid, sporsmalsliste
  )
  on conflict on constraint thc_regelsett_pkey do update set
    konverteringsfaktor = excluded.konverteringsfaktor,
    cv_thc = excluded.cv_thc,
    cv_kreatinin = excluded.cv_kreatinin,
    faktor_under_cutoff = excluded.faktor_under_cutoff,
    standard_sikkerhetsmargin = excluded.standard_sikkerhetsmargin,
    varsel_dager_mellom = excluded.varsel_dager_mellom,
    kort_tid_dager = excluded.kort_tid_dager,
    med_sporsmalsetning = excluded.med_sporsmalsetning;

  delete from public.thc_kurver k where k.objekt_id = p_objekt and k.tilstand = p_tilstand;
  delete from public.thc_sikkerhetsmarginer m where m.objekt_id = p_objekt and m.tilstand = p_tilstand;
  delete from public.thc_konsentrasjonsnivaer n where n.objekt_id = p_objekt and n.tilstand = p_tilstand;
  delete from public.thc_bruksmonstre b where b.objekt_id = p_objekt and b.tilstand = p_tilstand;
  delete from public.thc_tekstbolker t where t.objekt_id = p_objekt and t.tilstand = p_tilstand;

  -- Kurvene.
  kurver := intern.objekt(p_innhold, 'kurver');
  perform intern.krev_felt(kurver, array['gronn', 'gul', 'rod']);
  foreach rolle in array enum_range(null::public.thc_kurverolle) loop
    kurve := intern.objekt(kurver, rolle::text);
    perform intern.krev_felt(kurve, array['navn', 'a1', 'k1', 'a2', 'k2']);
    if intern.tekst(kurve, 'navn') = '' then
      raise exception 'Den % kurven mangler navn.', intern.thc_kurvefarge(rolle) using errcode = '22023';
    end if;
    if not (intern.flyttall(kurve, 'a1') > 0 and intern.flyttall(kurve, 'k1') > 0
      and intern.flyttall(kurve, 'a2') > 0 and intern.flyttall(kurve, 'k2') > 0)
    then
      raise exception '%: a1, k1, a2 og k2 må være tall større enn 0.', intern.tekst(kurve, 'navn')
        using errcode = '22023';
    end if;
    insert into public.thc_kurver (objekt_id, tilstand, rolle, navn, a1, k1, a2, k2)
    values (
      p_objekt, p_tilstand, rolle, intern.tekst(kurve, 'navn'),
      intern.flyttall(kurve, 'a1'), intern.flyttall(kurve, 'k1'),
      intern.flyttall(kurve, 'a2'), intern.flyttall(kurve, 'k2')
    );
  end loop;

  -- Grønn skal gi minst like rask utskillelse som gul, og gul som rød, ved
  -- alle konsentrasjoner: da forventer den minst like stor nedgang fra enhver
  -- forrige prøve over ethvert tidsrom. Avgjort for hele domenet, som
  -- sammenlign i src/domain/thcKurver.ts, der beviset står.
  for nr in 1 .. cardinality(roller) - 1 loop
    select intern.thc_rekkefolgebrudd(
      r.a1 * faktor, r.k1, r.a2 * faktor, r.k2,
      t.a1 * faktor, t.k1, t.a2 * faktor, t.k2
    ) into hvor
    from public.thc_kurver r, public.thc_kurver t
    where r.objekt_id = p_objekt and r.tilstand = p_tilstand and r.rolle = roller[nr]
      and t.objekt_id = p_objekt and t.tilstand = p_tilstand and t.rolle = roller[nr + 1];
    if hvor is not null then
      raise exception 'Den % kurven må gi minst like rask utskillelse som den % ved alle konsentrasjoner, men gjør det ikke %.',
        intern.thc_kurvefarge(roller[nr]), intern.thc_kurvefarge(roller[nr + 1]), hvor
        using errcode = '22023';
    end if;
  end loop;

  -- Sikkerhetsmarginene.
  if jsonb_array_length(intern.liste(p_innhold, 'sikkerhetsmarginer')) = 0 then
    raise exception 'Det må finnes minst én sikkerhetsmargin.' using errcode = '22023';
  end if;
  forrige_verdi := null;
  for element in select e from jsonb_array_elements(p_innhold -> 'sikkerhetsmarginer') e loop
    perform intern.krev_felt(element, array['margin', 'z']);
    verdi := intern.flyttall(element, 'margin');
    z := intern.flyttall(element, 'z');
    if not (verdi >= 0.5 and verdi < 1) then
      raise exception 'En sikkerhetsmargin må være minst 50 %% og under 100 %%.' using errcode = '22023';
    end if;
    if forrige_verdi is not null and not verdi > forrige_verdi then
      raise exception 'Sikkerhetsmarginene må stå stigende, uten like.' using errcode = '22023';
    end if;
    if not abs(z - intern.normalkvantil(1 - verdi)) <= 1e-9 then
      raise exception 'z-verdien for % %% stemmer ikke med marginen.', verdi * 100 using errcode = '22023';
    end if;
    insert into public.thc_sikkerhetsmarginer (objekt_id, tilstand, margin, z)
    values (p_objekt, p_tilstand, verdi, z);
    forrige_verdi := verdi;
  end loop;
  if not exists (
    select 1 from public.thc_sikkerhetsmarginer m
    where m.objekt_id = p_objekt and m.tilstand = p_tilstand and m.margin = standard
  ) then
    raise exception 'Standardmarginen må være en av sikkerhetsmarginene.' using errcode = '22023';
  end if;

  -- Konsentrasjonsnivåene.
  if jsonb_array_length(intern.liste(p_innhold, 'konsentrasjonsnivaer')) = 0 then
    raise exception 'Det må finnes minst ett konsentrasjonsnivå.' using errcode = '22023';
  end if;
  forrige_verdi := null;
  for element, nr in
    select e, n from jsonb_array_elements(p_innhold -> 'konsentrasjonsnivaer') with ordinality as x(e, n)
  loop
    perform intern.krev_felt(element, array['navn', 'nedre', 'nylig_inntak']);
    if intern.tekst(element, 'navn') = '' then
      raise exception 'Et konsentrasjonsnivå mangler navn.' using errcode = '22023';
    end if;
    if nr = 1 then
      if jsonb_typeof(element -> 'nedre') <> 'null' then
        raise exception 'Det laveste konsentrasjonsnivået skal ikke ha nedre grense.' using errcode = '22023';
      end if;
      verdi := null;
    else
      if jsonb_typeof(element -> 'nedre') is distinct from 'number' or not (element ->> 'nedre')::double precision > 0 then
        raise exception 'Skillepunktet under «%» må være et tall større enn 0.', intern.tekst(element, 'navn')
          using errcode = '22023';
      end if;
      verdi := (element ->> 'nedre')::double precision;
      if forrige_verdi is not null and not verdi > forrige_verdi then
        raise exception 'Skillepunktene mellom konsentrasjonsnivåene må være stigende.' using errcode = '22023';
      end if;
      forrige_verdi := verdi;
    end if;
    if exists (
      select 1 from public.thc_konsentrasjonsnivaer n
      where n.objekt_id = p_objekt and n.tilstand = p_tilstand and n.navn = intern.tekst(element, 'navn')
    ) then
      raise exception 'To konsentrasjonsnivåer har samme navn.' using errcode = '22023';
    end if;
    insert into public.thc_konsentrasjonsnivaer (objekt_id, tilstand, posisjon, navn, nedre, nylig_inntak)
    values (
      p_objekt, p_tilstand, nr, intern.tekst(element, 'navn'), verdi,
      intern.sannhetsverdi(element, 'nylig_inntak')
    );
  end loop;

  -- Bruksmønstrene.
  monstre := intern.objekt(p_innhold, 'bruksmonstre');
  perform intern.krev_felt(monstre, array['kronisk', 'ikke_kronisk']);
  foreach monster in array array['kronisk', 'ikke_kronisk'] loop
    element := intern.objekt(monstre, monster);
    perform intern.krev_felt(element, array['vanskelig_over', 'nytt_inntak_over']);
    if intern.tekst(element, 'vanskelig_over') <> all (enum_range(null::public.thc_kurverolle)::text[])
      or intern.tekst(element, 'nytt_inntak_over') <> all (enum_range(null::public.thc_kurverolle)::text[])
    then
      raise exception 'Grensene % peker på en ukjent kurve.', replace(replace(monster, 'ikke_kronisk', 'uten kronisk bruk'), 'kronisk', 'ved kronisk bruk')
        using errcode = '22023';
    end if;
    vanskelig := intern.tekst(element, 'vanskelig_over')::public.thc_kurverolle;
    nytt := intern.tekst(element, 'nytt_inntak_over')::public.thc_kurverolle;
    if not vanskelig < nytt then
      raise exception 'Grensene %: nytt inntak må ligge på en tregere kurve enn «kan ikke fastslås».', case monster when 'kronisk' then 'ved kronisk bruk' else 'uten kronisk bruk' end
        using errcode = '22023';
    end if;
    insert into public.thc_bruksmonstre (objekt_id, tilstand, kronisk, vanskelig_over, nytt_inntak_over)
    values (p_objekt, p_tilstand, monster = 'kronisk', vanskelig, nytt);
  end loop;

  -- Kommentaren hver tekst bruker. Plassholderne i en kommentar endres
  -- aldri, så det som godtas her, holder også etter senere tekstendringer.
  bolker := intern.objekt(p_innhold, 'tekstbolker');
  perform intern.krev_felt(bolker, intern.thc_tekstnokler());
  foreach nokkel in array intern.thc_tekstnokler() loop
    kommentar := intern.id(bolker, nokkel);
    select k.plassholdere into plassholdere
    from public.kommentarer k
    where k.objekt_id = kommentar
    limit 1;
    if not found then
      raise exception 'Teksten «%» må peke på en kommentar.', intern.thc_tekstbolktittel(nokkel)
        using errcode = '22023';
    end if;
    select string_agg(p, ', ' order by p collate "C") into avvik
    from unnest(plassholdere) p where p <> all (intern.thc_tekstbolk_kan(nokkel));
    if avvik is not null then
      raise exception 'Teksten «%» har plassholdere den ikke kan bruke: %.', intern.thc_tekstbolktittel(nokkel), avvik
        using errcode = '22023';
    end if;
    select p into avvik
    from unnest(intern.thc_tekstbolk_krever(nokkel)) with ordinality as x(p, n)
    where p <> all (plassholdere)
    order by n
    limit 1;
    if avvik is not null then
      raise exception 'Teksten «%» må inneholde %.', intern.thc_tekstbolktittel(nokkel), avvik
        using errcode = '22023';
    end if;
    insert into public.thc_tekstbolker (objekt_id, tilstand, nokkel, kommentar_id)
    values (p_objekt, p_tilstand, nokkel, kommentar);
  end loop;
end;
$function$;

-- public.les_analyttside
CREATE OR REPLACE FUNCTION public.les_analyttside(analyttkode text, sidetilstand public.objekttilstand)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with utgaver as (
    select u.objekt_id, public.utgave_som_json(u) as json
    from public.objektutgaver u
    where u.tilstand = sidetilstand
  ),
  analytt as (
    select a.objekt_id, a.hovedside_id
    from public.laboratorieanalytter a
    where a.kode = analyttkode and a.tilstand = sidetilstand
      and a.fagmiljo_id = (select public.mitt_arbeidsfagmiljo())
  ),
  elementer as (
    select e.objekt_id
    from public.innholdselementer e
    join analytt on e.infoside_id = analytt.hovedside_id
    where e.tilstand = sidetilstand
  ),
  komponenter as (
    select k.infoside_id, k.posisjon
    from public.analyttkomponenter k
    join analytt on k.analytt_id = analytt.objekt_id
    where k.tilstand = sidetilstand
  ),
  referanser as (
    select distinct k.referanse_id
    from public.referansekoblinger k
    where k.tilstand = sidetilstand
      and k.objekt_id in (
        select hovedside_id from analytt
        union all
        select objekt_id from elementer
      )
  )
  select jsonb_build_object(
    'analytt', (select u.json from utgaver u where u.objekt_id = analytt.objekt_id),
    'infoside', (select u.json from utgaver u where u.objekt_id = analytt.hovedside_id),
    'elementer', coalesce(
      (
        select jsonb_agg(u.json order by u.objekt_id)
        from elementer e
        join utgaver u on u.objekt_id = e.objekt_id
      ),
      '[]'::jsonb
    ),
    'komponenter', coalesce(
      (
        select jsonb_agg(
          u.json || jsonb_build_object(
            'koder', coalesce(
              (
                select jsonb_agg(a.kode order by a.kode)
                from public.laboratorieanalytter a
                where a.hovedside_id = k.infoside_id and a.tilstand = sidetilstand
                  and a.fagmiljo_id = (select public.mitt_arbeidsfagmiljo())
              ),
              '[]'::jsonb
            )
          )
          order by k.posisjon
        )
        from komponenter k
        join utgaver u on u.objekt_id = k.infoside_id
      ),
      '[]'::jsonb
    ),
    'referanser', coalesce(
      (
        select jsonb_agg(u.json order by u.objekt_id)
        from referanser r
        join utgaver u on u.objekt_id = r.referanse_id
      ),
      '[]'::jsonb
    )
  )
  from analytt
$function$;

-- public.les_analyttsider
CREATE OR REPLACE FUNCTION public.les_analyttsider(sidetilstand public.objekttilstand)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  with utgaver as (
    select u.objekt_id, public.utgave_som_json(u) as json
    from public.objektutgaver u
    where u.tilstand = sidetilstand
  ),
  analytter as (
    select a.objekt_id, a.kode, a.hovedside_id
    from public.laboratorieanalytter a
    where a.tilstand = sidetilstand
      and a.fagmiljo_id = (select public.mitt_arbeidsfagmiljo())
  ),
  elementer as (
    select a.objekt_id as analytt_id, e.objekt_id
    from analytter a
    join public.innholdselementer e on e.infoside_id = a.hovedside_id and e.tilstand = sidetilstand
  ),
  -- Referansene siden siterer: fra panelene (på hovedsiden), kortene og teksten.
  siteringer as (
    select a.objekt_id as analytt_id, k.referanse_id
    from analytter a
    join public.referansekoblinger k on k.objekt_id = a.hovedside_id and k.tilstand = sidetilstand
    union
    select e.analytt_id, k.referanse_id
    from elementer e
    join public.referansekoblinger k on k.objekt_id = e.objekt_id and k.tilstand = sidetilstand
  ),
  elementer_per_side as (
    select e.analytt_id, jsonb_agg(u.json order by u.objekt_id) as elementer
    from elementer e
    join utgaver u on u.objekt_id = e.objekt_id
    group by e.analytt_id
  ),
  komponenter_per_side as (
    select
      k.analytt_id,
      jsonb_agg(
        u.json || jsonb_build_object(
          'koder', coalesce(
            (select jsonb_agg(b.kode order by b.kode) from analytter b where b.hovedside_id = k.infoside_id),
            '[]'::jsonb
          )
        )
        order by k.posisjon
      ) as komponenter
    from public.analyttkomponenter k
    join utgaver u on u.objekt_id = k.infoside_id
    where k.tilstand = sidetilstand
    group by k.analytt_id
  ),
  referanser_per_side as (
    select s.analytt_id, jsonb_agg(s.referanse_id order by s.referanse_id) as referanser
    from siteringer s
    group by s.analytt_id
  )
  select jsonb_build_object(
    'sider', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'analytt', ua.json,
            'infoside', ui.json,
            'elementer', coalesce(e.elementer, '[]'::jsonb),
            'komponenter', coalesce(k.komponenter, '[]'::jsonb),
            'referanser', coalesce(r.referanser, '[]'::jsonb)
          )
          order by a.kode
        )
        from analytter a
        left join utgaver ua on ua.objekt_id = a.objekt_id
        left join utgaver ui on ui.objekt_id = a.hovedside_id
        left join elementer_per_side e on e.analytt_id = a.objekt_id
        left join komponenter_per_side k on k.analytt_id = a.objekt_id
        left join referanser_per_side r on r.analytt_id = a.objekt_id
      ),
      '[]'::jsonb
    ),
    'referanser', coalesce(
      (
        select jsonb_agg(u.json order by u.objekt_id)
        from utgaver u
        where u.objekt_id in (select referanse_id from siteringer)
      ),
      '[]'::jsonb
    )
  )
$function$;

-- public.les_referanseomrader
CREATE OR REPLACE FUNCTION public.les_referanseomrader(sidetilstand public.objekttilstand)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(
    jsonb_agg(jsonb_build_object('analyttkode', a.kode, 'verdi', e.data) order by a.kode),
    '[]'::jsonb
  )
  from public.laboratorieanalytter a
  join public.innholdselementer e
    on e.infoside_id = a.hovedside_id and e.tilstand = a.tilstand
  where a.tilstand = sidetilstand
    and a.fagmiljo_id = (select public.mitt_arbeidsfagmiljo())
    and e.panel = 'viktige_data'
    and e.elementtype = 'referanseomrade'
    and case
      when nullif(e.data ->> 'gjelder', '') is not null then e.data ->> 'gjelder' = a.kode
      else exists (
        select 1 from public.analyttkomponenter k
        where k.analytt_id = a.objekt_id and k.tilstand = a.tilstand and k.infoside_id = a.hovedside_id
      )
    end
$function$;

-- public.les_stoffside
CREATE OR REPLACE FUNCTION public.les_stoffside(sidenavn text, sidetilstand public.objekttilstand)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  side_id uuid;
  sidekode text;
  sider jsonb;
begin
  select s.objekt_id into side_id
  from public.infosider s
  where s.tilstand = sidetilstand and lower(s.navn) = lower(btrim(sidenavn));
  if side_id is null then
    return null;
  end if;

  select a.kode into sidekode
  from public.laboratorieanalytter a
  where a.hovedside_id = side_id and a.tilstand = sidetilstand
    and a.fagmiljo_id = (select public.mitt_arbeidsfagmiljo())
  order by a.kode
  limit 1;
  if sidekode is not null then
    return public.les_analyttside(sidekode, sidetilstand);
  end if;

  sider := public.stoffsider_som_json(array[side_id], sidetilstand);
  return (sider -> 'sider' -> 0) || jsonb_build_object('referanser', sider -> 'referanser');
end
$function$;

-- intern.endringsrotter
CREATE OR REPLACE FUNCTION intern.endringsrotter(p_side jsonb, p_admin boolean)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select s.objekt_id from public.infosider s
  where p_side ? 'stoff' and s.slug = p_side ->> 'stoff' and (p_admin or s.tilstand = 'publisert')
  union
  select s.objekt_id from public.infosider s
  where (p_side ->> 'stoffregister')::boolean is true and (p_admin or s.tilstand = 'publisert')
  union
  select r.objekt_id from public.intervallregelsett r
  where r.analyttkode in (select jsonb_array_elements_text(coalesce(p_side -> 'analyttkoder', '[]'::jsonb)))
    and (p_admin or r.tilstand = 'publisert')
    and r.fagmiljo_id = intern.arbeidsfagmiljo((select auth.uid()))
  union
  select a.objekt_id from public.laboratorieanalytter a
  where a.kode in (select jsonb_array_elements_text(coalesce(p_side -> 'analyttkoder', '[]'::jsonb)))
    and (p_admin or a.tilstand = 'publisert')
    and a.fagmiljo_id = intern.arbeidsfagmiljo((select auth.uid()))
  union
  select r.objekt_id from public.scenarioregelsett r
  where r.modul in (select jsonb_array_elements_text(coalesce(p_side -> 'moduler', '[]'::jsonb)))
    and (p_admin or r.tilstand = 'publisert')
    and r.fagmiljo_id = intern.arbeidsfagmiljo((select auth.uid()))
  union
  select r.objekt_id from public.thc_regelsett r
  where (p_side ->> 'thc')::boolean is true and (p_admin or r.tilstand = 'publisert')
    and r.fagmiljo_id = intern.arbeidsfagmiljo((select auth.uid()))
$function$;

-- public.mine_rettigheter
CREATE OR REPLACE FUNCTION public.mine_rettigheter()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  select jsonb_build_object(
    'systemarkitekt', public.er_systemarkitekt(),
    'administrerer', coalesce((
      select jsonb_agg(jsonb_build_object('id', f.id, 'nokkel', f.nokkel, 'navn', f.navn) order by f.navn)
      from public.fagmiljoer f
      where f.id = any (public.mine_administrerte_fagmiljoer())
    ), '[]'::jsonb),
    'arbeidsfagmiljo', (
      select jsonb_build_object('id', f.id, 'nokkel', f.nokkel, 'navn', f.navn)
      from public.fagmiljoer f
      where f.id = intern.arbeidsfagmiljo((select auth.uid()))
    ),
    'stoffregister', intern.har_registerrett((select auth.uid())),
    'opprett_bruker', intern.opprettelsesavslag((select auth.uid())) is null
  )
$function$;

-- intern.gi_diskusjonsomfang
CREATE OR REPLACE FUNCTION intern.gi_diskusjonsomfang()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

-- intern.diskusjonsomfang
CREATE OR REPLACE FUNCTION intern.diskusjonsomfang(side text)
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  case split_part(diskusjonsomfang.side, ':', 1)
    when 'stoff', 'register' then
      return null;
    when 'fortolkning' then
      -- P4b: fortolkningen av en kode hører til hvert fagmiljø for seg.
      -- Siden er fortolkningen i den innloggedes arbeidskontekst; uten
      -- innlogget (migrasjoner) den opprinnelige.
      return intern.nytt_lokalt_fagmiljo();
    else
      raise exception 'Diskusjonssiden % har ingen regel for rekkevidde (docs/diskusjoner.md).', diskusjonsomfang.side
        using errcode = '55000';
  end case;
end;
$function$;

-- Om appen skal vise redigeringen av fortolkningen: endringsrett i
-- arbeidskonteksten (lokal administrator der, eller systemarkitekt). Før P4b
-- gjaldt det et hvilket som helst fagmiljø med lokalt innhold; nå er
-- fortolkningen den innloggede ser, arbeidskontekstens, også før den har
-- egne regler.
create or replace function public.kan_endre_lokalt_innhold()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.har_aktivt_medlemskap(auth.uid())
    and intern.kan_endre_omfang('fagmiljo', intern.arbeidsfagmiljo(auth.uid()), auth.uid())
$$;
