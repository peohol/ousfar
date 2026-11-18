-- Endringsloggen for en fagside tok for lang tid (57014, statement timeout).
--
-- `intern.sidens_utgaver` fant objektene utenfor siden som har pekt på sidens
-- referanser og kommentarer, ved å gjøre hele innholdet i hver revisjon om til
-- tekst og lete etter hver ID der: én gjennomlesing av alle revisjonene per
-- referanse. For THC (25 referanser, 12 300 revisjoner) tok det over fire
-- sekunder alene, og tiden vokser med både antall referanser og revisjoner.
--
-- Nå hentes ID-ene en revisjon nevner, av én funksjon (`intern.nevnte_ider`),
-- og en GIN-indeks på den finner revisjonene som nevner noen av sidens
-- referanser med ett oppslag. Hva som regnes som nevnt, er det samme som før:
-- ID-er i innholdet, i små bokstaver. Resultatet er uendret.

-- ID-ene (UUID-er) en utgave av et objekt nevner i innholdet sitt, uten
-- duplikater. Uforanderlig, så den kan indekseres.
create function intern.nevnte_ider(p_innhold jsonb)
returns uuid[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(array_agg(distinct m[1]::uuid), '{}')
  from regexp_matches(p_innhold::text, '([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', 'g') m
$$;

revoke all on function intern.nevnte_ider(jsonb) from public, anon, authenticated, service_role;

-- Revisjonene er skrevet én gang og endres ikke, så indeksen bygges bare for
-- nye revisjoner. Bygges i samme transaksjon som resten (supabase/AGENTS.md);
-- tabellen er liten, så skrivelåsen varer kort.
create index objektrevisjoner_nevnte_idx on public.objektrevisjoner using gin (intern.nevnte_ider(innhold));

-- Revisjonene (bare med utkastene) og publiseringene som angikk siden da de ble
-- gjort, med om de gjelder en delt referanse eller kommentar. En revisjon har
-- `publisering` null; en publisering har ID-en sin der.
--
-- Uten utkastene (alltid for andre enn administratorer) regnes bare det som var
-- publisert: hva siden pekte på, avgjøres av de publiserte utgavene, så en
-- kobling som bare finnes i et utkast, ikke røpes.
create or replace function intern.sidens_utgaver(p_rotter uuid[], p_utkast boolean, p_register boolean)
returns table (objekt_id uuid, revisjon integer, publisering bigint, delt boolean)
language sql
stable
set search_path = ''
as $$
  with egne as (
    select unnest(p_rotter) as id
    union
    select r.objekt_id from public.objektrevisjoner r
    where not p_register
      and r.innhold ? 'infoside' -- så indeksen objektrevisjoner_infoside_idx kan brukes
      and (r.innhold ->> 'infoside') = any (p_rotter::text[])
      and (p_utkast or exists (
        select 1 from public.objektpubliseringer p where p.objekt_id = r.objekt_id and p.revisjon = r.revisjon))
  ),
  -- Alt som skjedde med sidens egne objekter, med om utgaven etter og før sto på siden.
  egne_hendelser as (
    select r.objekt_id, r.revisjon, null::bigint as publisering, r.utfort_kl as kl,
      intern.paa_siden(r.objekt_id, r.innhold, p_rotter) as paa,
      coalesce(intern.paa_siden(f.objekt_id, f.innhold, p_rotter), false) as var_paa
    from public.objektrevisjoner r
    left join public.objektrevisjoner f on f.objekt_id = r.objekt_id and f.revisjon = r.revisjon - 1
    where p_utkast and r.objekt_id in (select id from egne)
    union all
    select p.objekt_id, p.revisjon, p.id, p.utfort_kl,
      intern.paa_siden(p.objekt_id, t.innhold, p_rotter),
      coalesce(intern.paa_siden(f.objekt_id, f.innhold, p_rotter), false)
    from public.objektpubliseringer p
    join public.objektrevisjoner t on t.objekt_id = p.objekt_id and t.revisjon = p.revisjon
    left join public.objektrevisjoner f on f.objekt_id = p.objekt_id and f.revisjon = p.forrige_revisjon
    where p.objekt_id in (select id from egne)
  ),
  -- Hvilken utgave av hvert eget objekt som gjaldt når: utkastet, eller det publiserte.
  tilstander as (
    select h.objekt_id, h.revisjon, h.kl,
      lead(h.kl) over (partition by h.objekt_id order by h.kl, h.revisjon) as neste_kl
    from egne_hendelser h
    where (h.publisering is null) = p_utkast
  ),
  -- Det siden pekte på, og i hvilket tidsrom.
  sitater as (
    select distinct m.id, t.kl, t.neste_kl
    from tilstander t
    join public.objektrevisjoner r on r.objekt_id = t.objekt_id and r.revisjon = t.revisjon
    cross join lateral unnest(intern.nevnte_ider(r.innhold)) m(id)
    where not p_register and intern.paa_siden(r.objekt_id, r.innhold, p_rotter)
  ),
  nevnte as (
    select o.id from public.redigerbare_objekter o
    where o.id in (select s.id from sitater s)
      and o.type in ('referanse', 'kommentar')
      and o.id not in (select id from egne)
  ),
  nevnte_hendelser as (
    select r.objekt_id, r.revisjon, null::bigint as publisering, r.utfort_kl as kl
    from public.objektrevisjoner r
    where p_utkast and r.objekt_id in (select id from nevnte)
    union all
    select p.objekt_id, p.revisjon, p.id, p.utfort_kl
    from public.objektpubliseringer p
    where p.objekt_id in (select id from nevnte)
  ),
  -- Objektene utenfor siden som noen gang har pekt på en av dem. Revisjonene
  -- som nevner noen av dem, finnes i indeksen `objektrevisjoner_nevnte_idx`
  -- med ett oppslag, ikke ved å lese alle revisjonene for hver av dem.
  andre as (
    select distinct m.id as nevnt, r.objekt_id
    from public.objektrevisjoner r
    cross join lateral unnest(intern.nevnte_ider(r.innhold)) m(id)
    where intern.nevnte_ider(r.innhold) && (select coalesce(array_agg(n.id), '{}') from nevnte n)
      and m.id in (select n.id from nevnte n)
      and r.objekt_id <> m.id
  ),
  -- Hvilken utgave av dem som gjaldt når, på samme måte som for sidens egne.
  andres_tilstander as (
    select a.nevnt, t.objekt_id, t.revisjon, t.kl,
      lead(t.kl) over (partition by a.nevnt, t.objekt_id order by t.kl, t.revisjon) as neste_kl
    from andre a
    cross join lateral (
      select r.objekt_id, r.revisjon, r.utfort_kl as kl
      from public.objektrevisjoner r
      where p_utkast and r.objekt_id = a.objekt_id
      union all
      select p.objekt_id, p.revisjon, p.utfort_kl
      from public.objektpubliseringer p
      where not p_utkast and p.objekt_id = a.objekt_id
    ) t
  ),
  -- Når en referanse eller kommentar også ble brukt av noe som ikke sto på siden.
  -- Regnes ut én gang, ikke på nytt for hver hendelse som slår den opp.
  delt_bruk as materialized (
    select a.nevnt, a.kl, a.neste_kl
    from andres_tilstander a
    join public.objektrevisjoner r on r.objekt_id = a.objekt_id and r.revisjon = a.revisjon
    where a.nevnt = any (intern.nevnte_ider(r.innhold))
      and not intern.paa_siden(r.objekt_id, r.innhold, p_rotter)
  )
  select h.objekt_id, h.revisjon, h.publisering, false
  from egne_hendelser h
  where p_register or h.paa or h.var_paa
  union all
  select h.objekt_id, h.revisjon, h.publisering, exists (
      select 1 from delt_bruk d
      where d.nevnt = h.objekt_id and d.kl <= h.kl and (d.neste_kl is null or h.kl < d.neste_kl))
  from nevnte_hendelser h
  where exists (
    select 1 from sitater s
    where s.id = h.objekt_id and s.kl <= h.kl and (s.neste_kl is null or h.kl < s.neste_kl))
$$;
