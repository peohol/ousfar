-- Raskere personsøk og medlemsliste (Issue #502, docs/ytelse-synlig-innlasting.md §5).
--
-- Målingen (docs/ytelse-maling.md) viste at nesten hele ventetiden i
-- personsøket og under «Brukere» er arbeid i databasen, og at den vokser rett
-- med antall personer: ved 5 000 personer 2–6 s per søk og 4,7 s for
-- medlemslista. Fire årsaker, rettet her uten at noe svar endres:
--
-- 1. Sammenligningen (`intern.personsokpoeng`) regnet ut bokstavtriplene i
--    hver del av hvert navn for hvert ord i søket. Triplene i en del er
--    nettopp tekstbitene på tre tegn i delen med to mellomrom foran og ett
--    bak, så det holder å slå opp ordets tripler der (`strpos`). Samme poeng,
--    omtrent ni ganger raskere for ord på fire tegn eller mer.
-- 2. Søkene avgjorde først for hver synlig person om hen kunne velges (for
--    eksempel hele `intern.medlemskapsavslag`), og sammenlignet etterpå. Nå
--    sammenlignes først, og avgjørelsen tas for treffene i rangert rekkefølge
--    til 20 er godtatt. Det er de samme 20, i samme rekkefølge: de beste av
--    hele den lovlige mengden. De billige utvalgene (ikke alt med, ikke alt
--    medlem, bryteren på) gjøres fortsatt for alle først.
-- 3. `intern.administrerte_fagmiljoer`, som de fleste tilgangsavgjørelsene
--    bruker (`intern.er_lokal_admin_i`, `intern.kontoavslag`,
--    `intern.stillingsavslag`), var en SQL-funksjon som gir en mengde. Kalt
--    fra en annen funksjon planlegges den på nytt hver gang (~0,2 ms i
--    Postgres 17), og medlemslista gjør flere slike avgjørelser per person.
--    Samme spørring i PL/pgSQL, som beholder planen.
-- 4. Medlemslista spurte for hver person om den innloggede kunne utpeke eller
--    fjerne administratorer og endre rollen. Det kan bare en systemarkitekt,
--    så for andre spørres det ikke.
--
-- Tilbakeføring: `intern.administrerte_fagmiljoer`, `intern.personsokpoeng`,
-- `public.medlemsoversikt` og de tre søkene tilbake til definisjonene i
-- 20261113203000_kontomyndighet.sql, 20261119125000_stillinger.sql og
-- 20261119190000_personsok.sql; `drop function` på `intern.personsokgodtar`
-- og den nye `intern.personsoktreff`, og den gamle `intern.personsoktreff`
-- tilbake fra 20261119190000_personsok.sql.

-- --- Tilgangen ----------------------------------------------------------------------

-- Som før (20261113203000), med den samme spørringen, men i PL/pgSQL: en
-- SQL-funksjon som gir en mengde, planlegges på nytt hver gang den kalles fra
-- en annen funksjon (~0,2 ms i Postgres 17), og den kalles for hver rad i
-- medlemslista (`intern.er_lokal_admin_i`, `intern.kontoavslag`,
-- `intern.stillingsavslag`). PL/pgSQL beholder planen i økten.
create or replace function intern.administrerte_fagmiljoer(bruker uuid)
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  select a.fagmiljo_id
  from public.fagmiljoadministratorer a
  join public.medlemskap m
    on m.bruker_id = a.bruker_id and m.fagmiljo_id = a.fagmiljo_id and m.status = 'aktiv'
  join public.fagmiljoer f on f.id = a.fagmiljo_id and f.status = 'aktiv'
  where a.bruker_id = administrerte_fagmiljoer.bruker and a.til is null;
end;
$$;

-- --- Sammenligningen ---------------------------------------------------------------

-- Som før (20261119190000): 4 for hele delen, 3 først i den, 2 inne i den, og
-- 1 når ordet har minst fire tegn og minst halvparten av triplene i ordet står
-- i delen; summen, eller null når et ord ikke står der. Triplene i delen
-- (`intern.personsoktripler`) er tekstbitene på tre tegn i
-- `'  ' || del || ' '`, så de slås opp der i stead for å regnes ut. Det
-- trengs bare når ordet ennå ikke passer med noen del.
create or replace function intern.personsokpoeng(ord text[], deler text[])
returns integer
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  o text;
  d text;
  t text;
  tripler text[];
  felles integer;
  beste integer;
  poeng integer;
  sum integer := 0;
begin
  if coalesce(cardinality(ord), 0) = 0 or coalesce(cardinality(deler), 0) = 0 then
    return null;
  end if;
  foreach o in array ord loop
    beste := 0;
    tripler := null;
    foreach d in array deler loop
      poeng := case
        when d = o then 4
        when starts_with(d, o) then 3
        when strpos(d, o) > 0 then 2
        else 0
      end;
      if poeng = 0 and beste = 0 and char_length(o) >= 4 then
        tripler := coalesce(tripler, intern.personsoktripler(o));
        felles := 0;
        foreach t in array tripler loop
          if strpos('  ' || d || ' ', t) > 0 then
            felles := felles + 1;
          end if;
        end loop;
        if 2 * felles >= cardinality(tripler) then
          poeng := 1;
        end if;
      end if;
      beste := greatest(beste, poeng);
      exit when beste = 4;
    end loop;
    if beste = 0 then
      return null;
    end if;
    sum := sum + beste;
  end loop;
  return sum;
end;
$$;

-- --- Treffene ----------------------------------------------------------------------

-- Om `kandidat` kan velges til formålet, med de samme reglene som handlingen:
-- `gruppe` (kontekst er gruppen) `intern.kan_vaere_med_i_gruppe`, `medlem`
-- (kontekst er fagmiljøet) hele `gi`-avgjørelsen i `intern.medlemskapsavslag`,
-- `direkte` `intern.sokbar_for`. Alt annet gir nei.
create function intern.personsokgodtar(formaal text, aktor uuid, kontekst uuid, kandidat uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(case personsokgodtar.formaal
    when 'gruppe' then (
      select intern.kan_vaere_med_i_gruppe(g, personsokgodtar.kandidat)
      from public.grupper g where g.id = personsokgodtar.kontekst
    )
    when 'medlem' then
      intern.medlemskapsavslag(personsokgodtar.aktor, personsokgodtar.kandidat, personsokgodtar.kontekst, 'gi') is null
    when 'direkte' then intern.sokbar_for(personsokgodtar.kandidat, personsokgodtar.aktor)
  end, false)
$$;

revoke all on function intern.personsokgodtar(text, uuid, uuid, uuid) from public, anon, authenticated, service_role;

-- Erstattes av den under, som også avgjør hvem som kan velges.
drop function intern.personsoktreff(text[], uuid[], boolean);

-- De høyst 20 kandidatene som passer best med ordene og kan velges til
-- formålet (`intern.personsokgodtar`), best først, så etter navnet. Alle
-- kandidatene sammenlignes og rangeres; avgjørelsen tas for treffene i den
-- rekkefølgen til 20 er godtatt. Hvert treff har ID-en, brukernavnet og
-- navnet; med `detaljer` også bildet, stillingen og det primære fagmiljøet
-- (det profilkortet alt viser den som ser profilen).
create function intern.personsoktreff(
  ord text[], kandidater uuid[], detaljer boolean, formaal text, aktor uuid, kontekst uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  k uuid;
  valgt uuid[] := '{}';
begin
  for k in
    select r.id
    from (
      select p.id, p.first_name, p.last_name, p.username,
        intern.personsokpoeng(personsoktreff.ord, intern.personsokdeler(p.first_name, p.last_name, p.username)) as poeng
      from public.profiles p
      where p.id = any(personsoktreff.kandidater)
    ) r
    where r.poeng is not null
    order by r.poeng desc, intern.personsokfold(r.first_name), intern.personsokfold(r.last_name), r.username
  loop
    if intern.personsokgodtar(personsoktreff.formaal, personsoktreff.aktor, personsoktreff.kontekst, k) then
      valgt := valgt || k;
      exit when cardinality(valgt) = 20;
    end if;
  end loop;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object('id', p.id, 'username', p.username, 'first_name', p.first_name, 'last_name', p.last_name)
      || case when personsoktreff.detaljer then jsonb_build_object(
        'avatar_path', p.avatar_path,
        'updated_at', p.updated_at,
        'stilling', (select s.navn from public.stillinger s where s.id = p.stilling_id),
        'fagmiljo', (
          select f.navn
          from public.medlemskap m
          join public.fagmiljoer f on f.id = m.fagmiljo_id
          where m.bruker_id = p.id and m.status = 'aktiv' and f.status = 'aktiv'
          order by m.primaer desc, f.navn
          limit 1
        )
      ) else '{}'::jsonb end
      order by v.nr
    )
    from unnest(valgt) with ordinality v (id, nr)
    join public.profiles p on p.id = v.id
  ), '[]'::jsonb);
end;
$$;

revoke all on function intern.personsoktreff(text[], uuid[], boolean, text, uuid, uuid) from public, anon, authenticated, service_role;

-- --- Søkene -----------------------------------------------------------------------

-- Som før (20261119190000). De billige utvalgene (ikke alt med eller invitert)
-- for alle, `intern.kan_vaere_med_i_gruppe` bare for treffene.
create or replace function public.sok_gruppekandidater(gruppe uuid, sok text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  g public.grupper;
  ord text[];
begin
  perform intern.krev_aktivt_medlemskap();
  select * into g from public.grupper x where x.id = sok_gruppekandidater.gruppe;
  perform intern.krev_gruppemyndighet(aktor, g, null, 'endre');
  ord := intern.personsokord(sok_gruppekandidater.sok);
  return intern.personsoktreff(ord, array(
    select k
    from unnest(intern.personsokbare(aktor)) k
    where not exists (
      select 1 from public.gruppemedlemskap m
      where m.gruppe_id = g.id and m.bruker_id = k and m.status <> 'avsluttet'
    )
  ), true, 'gruppe', aktor, g.id);
end;
$$;

-- Som før (20261119190000). Ikke aktive medlemmer der for alle, hele
-- `gi`-avgjørelsen bare for treffene.
create or replace function public.sok_medlemskandidater(fagmiljo uuid, sok text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  f public.fagmiljoer;
  avslag text[];
  ord text[];
begin
  perform intern.krev_aktivt_medlemskap();
  -- Kontrollene for fagmiljøet og den innloggede, som `legg_til_medlem` gjør
  -- for et brukernavn som ikke finnes: alt før personen, som her ikke er valgt.
  avslag := intern.medlemskapsavslag(aktor, null, sok_medlemskandidater.fagmiljo, 'gi');
  if avslag is not null and avslag[2] is distinct from 'Ukjent bruker.' then
    raise exception '%', avslag[2] using errcode = avslag[1];
  end if;
  select * into f from public.fagmiljoer x where x.id = sok_medlemskandidater.fagmiljo;
  ord := intern.personsokord(sok_medlemskandidater.sok);
  return intern.personsoktreff(ord, array(
    select k
    from unnest(intern.personsokbare(aktor)) k
    where not exists (
      select 1 from public.medlemskap m
      where m.bruker_id = k and m.fagmiljo_id = f.id and m.status = 'aktiv'
    )
  ), true, 'medlem', aktor, f.id);
end;
$$;

-- Som før (20261119190000). Bryteren på for alle, `intern.sokbar_for` bare
-- for treffene.
create or replace function public.sok_direktemottakere(sok text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  ord text[];
begin
  if not intern.tillater_direktemeldinger(aktor) then
    raise exception 'Slå på «Tillat direktemeldinger» for å finne andre.' using errcode = 'PT409';
  end if;
  ord := intern.personsokord(sok_direktemottakere.sok);
  return intern.personsoktreff(ord, array(
    select v.bruker_id
    from public.chatvalg v
    where v.tillat_direktemeldinger
      and v.bruker_id <> aktor
  ), false, 'direkte', aktor, null);
end;
$$;

-- --- Medlemslista -------------------------------------------------------------------

-- Som før (20261119125000). Avgjørelsene som bare en systemarkitekt kan få ja
-- til, spørres bare når den innloggede er det.
create or replace function public.medlemsoversikt(fagmiljo uuid)
returns table (
  bruker_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_path text,
  updated_at timestamptz,
  stilling_id uuid,
  status text,
  fra timestamptz,
  til timestamptz,
  administrator boolean,
  systemarkitekt boolean,
  rolle public.brukerrolle,
  maa_bytte_passord boolean,
  sperret boolean,
  eneste_medlemskap boolean,
  kan_avslutte boolean,
  kan_gi_tilgang boolean,
  kan_gjore_til_administrator boolean,
  kan_fjerne_som_administrator boolean,
  nytt_passord boolean,
  endre_rolle boolean,
  endre_stilling boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  aktor uuid := (select auth.uid());
  f public.fagmiljoer;
  -- Bare en systemarkitekt kan utpeke eller fjerne administratorer og endre
  -- roller: for andre sier `intern.medlemskapsavslag` og `intern.kontoavslag`
  -- alltid nei til det, så de spørres ikke for hver rad.
  sa boolean := intern.er_systemarkitekt(aktor);
begin
  perform intern.krev_aktivt_medlemskap();
  select * into f from public.fagmiljoer x where x.id = medlemsoversikt.fagmiljo;
  if not found or not intern.er_lokal_admin_i(f.id, aktor) then
    raise exception 'Du administrerer ikke dette fagmiljøet.' using errcode = '42501';
  end if;

  return query
  with siste as (
    select distinct on (m.bruker_id) m.*
    from public.medlemskap m
    where m.fagmiljo_id = f.id
    order by m.bruker_id, (m.status <> 'deaktivert') desc, m.fra desc, m.id desc
  )
  select
    p.id, p.username, p.first_name, p.last_name, p.avatar_path, p.updated_at, p.stilling_id,
    case s.status when 'deaktivert' then 'avsluttet' else s.status end,
    s.fra, s.til,
    exists (
      select 1 from public.fagmiljoadministratorer a
      where a.bruker_id = p.id and a.fagmiljo_id = f.id and a.til is null
    ),
    intern.er_systemarkitekt(p.id),
    p.role,
    p.must_change_password or not p.onboarding_completed,
    not intern.har_aktivt_medlemskap(p.id),
    s.status = 'aktiv' and not exists (
      select 1 from public.medlemskap o
      where o.bruker_id = p.id and o.status = 'aktiv' and o.fagmiljo_id <> f.id
    ),
    s.status <> 'deaktivert' and p.id <> aktor and intern.medlemskapsavslag(aktor, p.id, f.id, 'avslutt') is null,
    s.status <> 'aktiv' and p.id <> aktor and intern.medlemskapsavslag(aktor, p.id, f.id, 'gi') is null,
    sa and s.status = 'aktiv' and p.id <> aktor
      and not exists (
        select 1 from public.fagmiljoadministratorer a
        where a.bruker_id = p.id and a.fagmiljo_id = f.id and a.til is null
      )
      and intern.medlemskapsavslag(aktor, p.id, f.id, 'gi_admin') is null,
    sa and exists (
        select 1 from public.fagmiljoadministratorer a
        where a.bruker_id = p.id and a.fagmiljo_id = f.id and a.til is null
      )
      and p.id <> aktor and intern.medlemskapsavslag(aktor, p.id, f.id, 'fjern_admin') is null,
    intern.kontoavslag(aktor, p.id, 'passord') is null,
    sa and intern.kontoavslag(aktor, p.id, 'rolle') is null,
    s.status <> 'deaktivert' and intern.stillingsavslag(aktor, p.id) is null
  from siste s
  join public.profiles p on p.id = s.bruker_id
  order by s.status = 'deaktivert', p.first_name, p.last_name, p.username;
end;
$$;

