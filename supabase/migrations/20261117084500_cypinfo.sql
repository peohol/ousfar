-- Katalogen fra CYPinfo: legemidlene, gentabellen (fra genotype til fenotype)
-- og hvilke kombinasjoner av gen og fenotype som har en anbefaling for hvert
-- legemiddel. Etappe B i docs/cypinfo-integrasjon.md. Ingenting vises på
-- fagsidene ennå.
--
-- Kort fortalt:
--
--   * Den ukentlige synkroniseringen (src/cypinfo/synk.ts) henter katalogen og
--     gentabellen, utleder genene per legemiddel med rapportkall, og bytter alt
--     inn i én transaksjon med cypinfo_fullfor_synk: nye rader legges til,
--     endrede oppdateres, og rader som er borte, merkes som utgått — de slettes
--     aldri. Har en type færre rader enn 80 % av dem som er aktive i dag,
--     avvises hele byttet, og siste gyldige katalog står.
--   * Anbefalingstekstene lagres ikke (Peders føring: ingen parallell database
--     med anbefalinger). For hver anbefaling lagres bare CYPinfos ID, genene og
--     fenotypene den gjelder, nivået og en sha256 av teksten, så en endring hos
--     CYPinfo kan oppdages og logges. Unntaket er teksten for legemidlene uten
--     relevante gener, som ikke avhenger av noe resultat.
--   * Hver rad lagres som OUSFAR leste den (`data`) og som CYPinfo ga den
--     (`raa`, for anbefalingene uten teksten), så en endring hos CYPinfo
--     skilles fra en endring i lesingen.
--   * Dataene ligger i skjemaet `cypinfo`, som ingen av API-rollene har
--     tilgang til. Appen leser dem med les_cypinfo().

create schema cypinfo;
revoke all on schema cypinfo from public;

comment on schema cypinfo is
  'Katalogen synkronisert fra CYPinfo (cypinfo.no), uten anbefalingstekstene. Ingen av API-rollene har tilgang; se funksjonene cypinfo_* og les_cypinfo i public.';

-- --- Typene som synkroniseres ---------------------------------------------

-- Samme navn som ENTITETNAVN i src/cypinfo/modell.ts, og som tabellene under.
create table cypinfo.entiteter (
  navn text primary key,
  -- Et nytt uttrekk må ha minst så stor andel av radene som er aktive i dag.
  minste_andel numeric not null default 0.8 check (minste_andel between 0 and 1)
);

insert into cypinfo.entiteter (navn, minste_andel) values
  ('legemiddel', 0.8),
  ('genresultat', 0.8),
  ('anbefaling', 0.8);

comment on table cypinfo.entiteter is
  'Typene som synkroniseres fra CYPinfo, og hvor mye mindre et nytt uttrekk kan være før det avvises.';

-- --- Kjøringene ------------------------------------------------------------

create table cypinfo.synkroniseringer (
  id bigint generated always as identity primary key,
  status text not null default 'pagar' check (status in ('pagar', 'fullfort', 'uendret', 'feilet')),
  -- 'cron' for den ukentlige kjøringen, 'manuell' når en systemarkitekt ba om den.
  utlost_av text not null default 'cron' check (utlost_av in ('cron', 'manuell')),
  startet_kl timestamptz not null default now(),
  avsluttet_kl timestamptz,
  parserversjon integer,
  -- Per type: rader inn, nye, endrede, utgåtte, forkastet; antall rapportkall;
  -- og det som bør vurderes (uavklarte, merknader).
  antall jsonb,
  feil text
);

create unique index cypinfo_synkroniseringer_en_om_gangen_idx
  on cypinfo.synkroniseringer ((true))
  where status = 'pagar';

comment on table cypinfo.synkroniseringer is
  'Hver synkronisering fra CYPinfo: når, hvem som ba om den, hva som ble nytt, endret eller utgått, hva som bør vurderes, og feilene.';

-- --- Dataene ---------------------------------------------------------------

-- Kolonnene alle typene har:
--   cypinfo_id      CYPinfos ID (legemidler og anbefalinger), eller genet,
--                   allelene og duplikasjonen (gentabellen, som ikke har ID)
--   data            raden slik src/cypinfo/modell.ts leste den
--   raa             raden slik CYPinfo ga den (anbefalingene uten teksten)
--   hash            md5 av data og raa, for å se om raden er endret
--   parserversjon   lesingen som ga `data`
--   forst_sett_kl, sist_endret_kl, sist_sett_synk, utgatt_kl
do $$
declare
  e text;
begin
  for e in select navn from cypinfo.entiteter loop
    execute format(
      $sql$
        create table cypinfo.%I (
          cypinfo_id text primary key check (char_length(cypinfo_id) between 1 and 200),
          data jsonb not null check (jsonb_typeof(data) = 'object'),
          raa jsonb,
          hash text not null,
          parserversjon integer,
          forst_sett_kl timestamptz not null default now(),
          sist_endret_kl timestamptz not null default now(),
          sist_sett_synk bigint references cypinfo.synkroniseringer (id),
          utgatt_kl timestamptz
        )
      $sql$, e);
  end loop;
end;
$$;

alter table cypinfo.anbefaling
  add column legemiddel_id text generated always as (data ->> 'legemiddel_id') stored;
alter table cypinfo.genresultat
  add column gen_slug text generated always as (data ->> 'gen_slug') stored;

create index cypinfo_anbefaling_legemiddel_idx on cypinfo.anbefaling (legemiddel_id);
create index cypinfo_genresultat_gen_idx on cypinfo.genresultat (gen_slug);
create index cypinfo_legemiddel_fest_idx on cypinfo.legemiddel using gin ((data -> 'fest'));

comment on table cypinfo.legemiddel is
  'Legemidlene i CYPinfo: navn, ATC, FEST-ID-er, varenavn, genene og gensettene de slås opp på, og teksten for dem uten relevante gener.';
comment on table cypinfo.genresultat is
  'Gentabellen i CYPinfo: genet, allelene og duplikasjonen, og fenotypen de gir.';
comment on table cypinfo.anbefaling is
  'Anbefalingene CYPinfo kan gi: legemiddelet, genene og fenotypene, nivået og sha256 av teksten. Teksten lagres ikke.';

-- --- Synkroniseringen ------------------------------------------------------
--
-- Kalles av synkroniseringsjobben på serveren, med den hemmelige nøkkelen.
-- Ingen andre kan kalle dem.

-- Kjøringen som skal endres, låst, og bare om den fortsatt pågår.
create function cypinfo.pagaende(synk bigint)
returns cypinfo.synkroniseringer
language plpgsql
set search_path = ''
as $$
declare
  s cypinfo.synkroniseringer;
begin
  select * into s from cypinfo.synkroniseringer where id = synk for update;
  if not found then
    raise exception 'Synkroniseringen % finnes ikke.', synk using errcode = 'PT404';
  end if;
  if s.status <> 'pagar' then
    raise exception 'Synkroniseringen % er allerede avsluttet.', synk using errcode = '22023';
  end if;
  return s;
end;
$$;

-- Genene hvert aktive legemiddel har i dag, så synkroniseringen kan stanse når
-- et legemiddel har fått færre: {gener: {cypinfo_id: [gen, ...]}}.
create function public.cypinfo_forrige_synk()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('gener', coalesce(jsonb_object_agg(l.cypinfo_id, coalesce(l.data -> 'gener', '[]')), '{}'))
  from cypinfo.legemiddel l
  where l.utgatt_kl is null
$$;

-- Starter en kjøring. En kjøring som har stått uavsluttet i mer enn en
-- halvtime, har mistet forbindelsen og regnes som feilet.
create function public.cypinfo_start_synk(utlost_av text default 'cron')
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  ny bigint;
begin
  update cypinfo.synkroniseringer
  set status = 'feilet', avsluttet_kl = now(), feil = 'Avbrutt uten å bli fullført.'
  where status = 'pagar' and startet_kl < now() - interval '30 minutes';

  begin
    insert into cypinfo.synkroniseringer (utlost_av) values (coalesce(cypinfo_start_synk.utlost_av, 'cron'))
    returning id into ny;
  exception when unique_violation then
    raise exception 'En synkronisering fra CYPinfo pågår allerede.' using errcode = 'PT409';
  end;
  return ny;
end;
$$;

-- Bytter inn uttrekket. Alt eller ingenting: avvises én type, endres ingenting.
--
-- innhold = {
--   parserversjon,
--   entiteter: {type: {rader: [{id, data, raa}, ...], forkastet}},
--   kall,
--   rapport: {uavklarte: [...], merknader: [...]}
-- }
-- Katalogen er liten (noen hundre rader), så alt kommer i ett kall, uten
-- mellomlager. FEST-ID-er som ikke finnes blant de aktive virkestoffene i
-- FEST-kopien, legges til i merknadene.
create function public.cypinfo_fullfor_synk(synk bigint, innhold jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  e record;
  rader jsonb;
  pv integer := (innhold ->> 'parserversjon')::integer;
  inn integer;
  unike integer;
  aktive integer;
  nye integer;
  endrede integer;
  utgatte integer;
  noe_endret boolean := false;
  ny_status text;
  opptelling jsonb := '{}';
  rapport jsonb := case when jsonb_typeof(innhold -> 'rapport') = 'object' then innhold -> 'rapport' else '{}' end;
  merknader jsonb := case when jsonb_typeof(rapport -> 'merknader') = 'array' then rapport -> 'merknader' else '[]' end;
begin
  perform cypinfo.pagaende(synk);
  if pv is null then
    raise exception 'Parserversjonen mangler.' using errcode = '22023';
  end if;

  for e in select navn, minste_andel from cypinfo.entiteter order by navn loop
    rader := innhold -> 'entiteter' -> e.navn -> 'rader';
    if jsonb_typeof(rader) is distinct from 'array' then
      raise exception 'Uttrekket mangler typen %.', e.navn using errcode = '22023';
    end if;
    if exists (
      select 1 from jsonb_array_elements(rader) r
      where jsonb_typeof(r -> 'id') is distinct from 'string'
         or char_length(r ->> 'id') not between 1 and 200
         or jsonb_typeof(r -> 'data') is distinct from 'object'
    ) then
      raise exception 'Radene av typen % har feil form.', e.navn using errcode = '22023';
    end if;

    select count(*), count(distinct r ->> 'id') into inn, unike from jsonb_array_elements(rader) r;
    if inn <> unike then
      raise exception 'Typen % har samme ID flere ganger.', e.navn using errcode = '22023';
    end if;

    execute format('select count(*) from cypinfo.%I where utgatt_kl is null', e.navn) into aktive;
    if inn = 0 or inn < ceil(aktive * e.minste_andel) then
      raise exception 'Uttrekket ser ufullstendig ut: % rader av typen %, mot % i dag.', inn, e.navn, aktive
        using errcode = '22023';
    end if;

    execute format(
      $sql$
        select
          count(*) filter (where t.cypinfo_id is null),
          count(*) filter (where t.cypinfo_id is not null
                             and (t.hash <> md5((r -> 'data')::text || coalesce(nullif(r -> 'raa', 'null')::text, ''))
                                  or t.utgatt_kl is not null))
        from jsonb_array_elements($1) r
        left join cypinfo.%I t on t.cypinfo_id = r ->> 'id'
      $sql$, e.navn)
    into nye, endrede
    using rader;

    execute format(
      $sql$
        insert into cypinfo.%1$I as t
          (cypinfo_id, data, raa, hash, parserversjon, forst_sett_kl, sist_endret_kl, sist_sett_synk)
        select r ->> 'id', r -> 'data', nullif(r -> 'raa', 'null'),
               md5((r -> 'data')::text || coalesce(nullif(r -> 'raa', 'null')::text, '')), $3, now(), now(), $1
        from jsonb_array_elements($2) r
        on conflict (cypinfo_id) do update set
          data = excluded.data,
          raa = excluded.raa,
          hash = excluded.hash,
          parserversjon = excluded.parserversjon,
          sist_endret_kl = case
            when t.hash is distinct from excluded.hash or t.utgatt_kl is not null then now()
            else t.sist_endret_kl
          end,
          sist_sett_synk = $1,
          utgatt_kl = null
      $sql$, e.navn)
    using synk, rader, pv;

    execute format(
      'update cypinfo.%I set utgatt_kl = now(), sist_endret_kl = now()
       where utgatt_kl is null and sist_sett_synk is distinct from $1', e.navn)
    using synk;
    get diagnostics utgatte = row_count;

    noe_endret := noe_endret or nye > 0 or endrede > 0 or utgatte > 0;
    opptelling := opptelling || jsonb_build_object(e.navn, jsonb_build_object(
      'inn', inn, 'nye', nye, 'endrede', endrede, 'utgatte', utgatte,
      'forkastet', coalesce((innhold -> 'entiteter' -> e.navn ->> 'forkastet')::integer, 0)));
  end loop;

  -- FEST-ID-er CYPinfo oppgir som ikke er et aktivt virkestoff i FEST-kopien.
  -- Bare når kopien har noe; ellers er det ingenting å sammenligne med.
  if exists (select 1 from legemiddeldata.virkestoff) then
    merknader := merknader || coalesce((
      select jsonb_agg(format('FEST-ID-en %s for «%s» er ikke et aktivt virkestoff i FEST.', f.id, l.data ->> 'navn')
                       order by l.data ->> 'navn', f.id)
      from cypinfo.legemiddel l
      cross join lateral jsonb_array_elements_text(coalesce(l.data -> 'fest', '[]')) f (id)
      where l.utgatt_kl is null
        and not exists (select 1 from legemiddeldata.virkestoff v where v.fest_id = f.id and v.utgatt_kl is null)), '[]');
  end if;

  ny_status := case when noe_endret then 'fullfort' else 'uendret' end;
  opptelling := opptelling || jsonb_build_object(
    'kall', coalesce((innhold ->> 'kall')::integer, 0),
    'uavklarte', case when jsonb_typeof(rapport -> 'uavklarte') = 'array' then rapport -> 'uavklarte' else '[]' end,
    'merknader', merknader);
  update cypinfo.synkroniseringer set
    status = ny_status,
    avsluttet_kl = now(),
    parserversjon = pv,
    antall = opptelling
  where id = synk;

  return jsonb_build_object('status', ny_status, 'antall', opptelling);
end;
$$;

-- Noe gikk galt: kjøringen merkes som feilet.
create function public.cypinfo_avbryt_synk(synk bigint, feil text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform cypinfo.pagaende(synk);
  update cypinfo.synkroniseringer set
    status = 'feilet',
    avsluttet_kl = now(),
    feil = left(cypinfo_avbryt_synk.feil, 2000)
  where id = synk;
end;
$$;

-- --- Lesingen --------------------------------------------------------------

-- Det fagsidene trenger fra CYPinfo for disse legemidlene: dem med en av
-- FEST-ID-ene, og dem med en av CYPinfo-ID-ene (koblingene i
-- src/faginnhold/cypinfokoblinger.ts); hvilke kombinasjoner av gen og fenotype
-- som har en anbefaling (uten nivået og teksten, som hentes fra CYPinfo ved
-- oppslaget); gentabellen for genene de bruker; og når katalogen sist ble
-- kontrollert og endret.
create function public.les_cypinfo(fest_ider text[], cypinfo_ider text[] default '{}')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  if coalesce(cardinality(fest_ider), 0) + coalesce(cardinality(cypinfo_ider), 0) > 200 then
    raise exception 'For mange legemidler.' using errcode = '22023';
  end if;

  return (
    with valgte as (
      select l.cypinfo_id, l.data
      from cypinfo.legemiddel l
      where l.utgatt_kl is null
        and (l.cypinfo_id = any (coalesce(cypinfo_ider, '{}')) or (l.data -> 'fest') ?| coalesce(fest_ider, '{}'))
    ),
    gener as (
      select distinct g.slug
      from valgte v
      cross join lateral jsonb_array_elements_text(coalesce(v.data -> 'gener', '[]')) g (slug)
    )
    select jsonb_build_object(
      'kilde', jsonb_build_object(
        'navn', 'CYPinfo',
        'endret_kl', (select max(s.avsluttet_kl) from cypinfo.synkroniseringer s where s.status = 'fullfort'),
        'kontrollert_kl', (select max(s.avsluttet_kl) from cypinfo.synkroniseringer s where s.status in ('fullfort', 'uendret'))),
      'legemidler', coalesce((select jsonb_agg(jsonb_build_object('id', v.cypinfo_id, 'data', v.data) order by v.cypinfo_id) from valgte v), '[]'),
      'oppslag', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', a.cypinfo_id,
                 'legemiddel_id', a.legemiddel_id,
                 'kombinasjoner', (
                   select jsonb_agg(jsonb_build_object('gen_slug', k ->> 'gen_slug', 'fenotype_id', k ->> 'fenotype_id'))
                   from jsonb_array_elements(a.data -> 'kombinasjoner') k))
               order by a.legemiddel_id, a.cypinfo_id)
        from cypinfo.anbefaling a
        where a.utgatt_kl is null and a.legemiddel_id in (select v.cypinfo_id from valgte v)), '[]'),
      'genresultater', coalesce((
        select jsonb_agg(jsonb_build_object('id', g.cypinfo_id, 'data', g.data) order by g.cypinfo_id)
        from cypinfo.genresultat g
        where g.utgatt_kl is null and g.gen_slug in (select slug from gener)), '[]')
    )
  );
end;
$$;

-- --- Endringsloggen ----------------------------------------------------------

alter table datakilder.feltregler drop constraint feltregler_kilde_check;
alter table datakilder.feltregler add constraint feltregler_kilde_check
  check (kilde in ('clinpgx', 'cpic', 'pubchem', 'farmakologiportalen', 'cypinfo'));
alter table datakilder.endringer drop constraint endringer_kilde_check;
alter table datakilder.endringer add constraint endringer_kilde_check
  check (kilde in ('clinpgx', 'cpic', 'pubchem', 'farmakologiportalen', 'cypinfo'));

-- Feltnavnene er OUSFARs (src/cypinfo/modell.ts). Uten regel er et felt
-- klinisk: navnene, ATC, FEST, genene, gensettene, fenotypene, nivået og
-- teksthashen. Varenavn, kategori og terapiområde er metadata, og navnet på
-- legemiddelet i en anbefaling (det står også på legemiddelet).
insert into datakilder.feltregler (kilde, type, felt, niva) values
  ('cypinfo', 'legemiddel', 'varenavn', 'metadata'),
  ('cypinfo', 'legemiddel', 'kategori', 'metadata'),
  ('cypinfo', 'legemiddel', 'terapiomrade', 'metadata'),
  ('cypinfo', 'anbefaling', 'legemiddel', 'metadata');

-- Hva et objekt er, i klartekst: som før, og for CYPinfo genresultatet og
-- legemiddelet med genene og fenotypene en anbefaling gjelder.
create or replace function datakilder.etikett(kilde text, type text, data jsonb, objekt_id text)
returns text
language sql
stable
set search_path = ''
as $$
  select left(coalesce(nullif(
    case
      when $1 = 'cpic' and $2 in ('anbefaling', 'par') then concat_ws(' · ',
        (select l.data ->> 'navn' from cpic.legemiddel l where l.cpic_id = $3 ->> 'legemiddel_id'),
        case when $2 = 'par' then $3 ->> 'gen' end,
        (select string_agg(e.key || ' ' || e.value, ', ' order by e.key)
         from jsonb_each_text(case when jsonb_typeof($3 -> 'oppslagsnokkel') = 'object' then $3 -> 'oppslagsnokkel' else '{}' end) e),
        $3 ->> 'populasjon')
      when $1 = 'cpic' and $2 = 'genresultat' then concat_ws(' ', $3 ->> 'gen', $3 ->> 'resultat')
      when $1 = 'cpic' and $2 = 'genresultat_oppslag' then $3 ->> 'beskrivelse'
      when $1 = 'cpic' and $2 = 'diplotype' then concat_ws(' ',
        (select string_agg(g, '/' order by g)
         from jsonb_object_keys(case when jsonb_typeof($3 -> 'nokkel') = 'object' then $3 -> 'nokkel' else '{}' end) g),
        $3 ->> 'diplotype')
      when $1 = 'cpic' and $2 in ('allel', 'alleldefinisjon') then concat_ws(' ', $3 ->> 'gen', $3 ->> 'navn')
      when $1 = 'clinpgx' and $2 = 'klinisk' then concat_ws(' · ',
        (select string_agg(g ->> 'symbol', ', ')
         from jsonb_array_elements(case when jsonb_typeof($3 -> 'gener') = 'array' then $3 -> 'gener' else '[]' end) g),
        $3 ->> 'variant',
        'nivå ' || ($3 ->> 'niva'),
        (select string_agg(k ->> 'navn', ', ')
         from jsonb_array_elements(case when jsonb_typeof($3 -> 'legemidler') = 'array' then $3 -> 'legemidler' else '[]' end) k))
      when $1 = 'farmakologiportalen' and $2 = 'analyse' then concat_ws(' · ',
        $3 ->> 'navn', $3 ->> 'laboratorium', $3 -> 'provemateriale' ->> 'original')
      when $1 = 'cypinfo' and $2 = 'genresultat' then concat_ws(' ',
        $3 ->> 'gen', ($3 ->> 'allel1') || '/' || ($3 ->> 'allel2'),
        case when ($3 ->> 'duplikasjon')::boolean then 'med duplikasjon' end,
        '→ ' || ($3 ->> 'fenotype'))
      when $1 = 'cypinfo' and $2 = 'anbefaling' then concat_ws(' · ',
        $3 ->> 'legemiddel',
        (select string_agg(concat_ws(' ', k ->> 'gen', k ->> 'fenotype'), ' + ')
         from jsonb_array_elements(case when jsonb_typeof($3 -> 'kombinasjoner') = 'array' then $3 -> 'kombinasjoner' else '[]' end) k))
      else coalesce($3 ->> 'navn', $3 ->> 'symbol', $3 ->> 'tittel', $3 ->> 'term', $3 ->> 'merknad')
    end, ''), $4), 300)
$$;

-- cypinfo_fullfor_synk bytter inn en type med én insert … on conflict og én
-- update for det som er borte. Er tabellen tom før byttet, er det et
-- grunnlag. Er rådataene de samme og bare lesingen ny, er endringen metadata,
-- med parserversjonene i sporet; ellers logges den etter feltreglene.
create function datakilder.cypinfo_etter_bytte()
returns trigger
language plpgsql
set search_path = ''
-- Transisjonstabellene har ingen statistikk; se datakilder.cpic_etter_bytte.
set enable_nestloop = off
as $$
declare
  synk bigint := (select s.id from cypinfo.synkroniseringer s where s.status = 'pagar');
  antall integer;
  i_alt integer;
begin
  if tg_op = 'INSERT' then
    select count(*) into antall from nye;
    if antall = 0 then
      return null;
    end if;
    execute format('select count(*) from cypinfo.%I', tg_table_name) into i_alt;
    if i_alt = antall then
      perform datakilder.grunnlag('cypinfo', tg_table_name, synk, tg_table_name, 'Første innlasting fra CYPinfo', antall);
      return null;
    end if;
    perform datakilder.logg('cypinfo', tg_table_name, synk, coalesce((
      select jsonb_agg(jsonb_build_object('id', n.cypinfo_id, 'etter', n.data)) from nye n), '[]'));
    return null;
  end if;

  -- Borte, tilbake, eller nytt svar fra CYPinfo.
  perform datakilder.logg('cypinfo', tg_table_name, synk, coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', n.cypinfo_id,
      'foer', case when g.utgatt_kl is null then g.data end,
      'etter', case when n.utgatt_kl is null then n.data end,
      'foer_raa', g.raa,
      'etter_raa', n.raa,
      'spor', jsonb_strip_nulls(jsonb_build_object(
        'tilbake', case when g.utgatt_kl is not null and n.utgatt_kl is null then true end,
        'parserversjon', case when g.parserversjon is distinct from n.parserversjon
                              then jsonb_build_object('foer', g.parserversjon, 'etter', n.parserversjon) end))))
    from gamle g
    join nye n on n.cypinfo_id = g.cypinfo_id
    where (g.utgatt_kl is null) is distinct from (n.utgatt_kl is null)
       or (n.utgatt_kl is null and g.raa is distinct from n.raa)
       -- Teksten for legemidlene uten relevante gener og teksthashen står
       -- bare i dataene; en endring der er en endring hos CYPinfo.
       or (n.utgatt_kl is null and g.raa is not distinct from n.raa and g.hash is distinct from n.hash
           and g.parserversjon is not distinct from n.parserversjon)), '[]'));

  -- Samme svar, ny lesing.
  insert into datakilder.endringer (kilde, synk_id, type, objekt_id, art, niva, etikett, felt, foer, etter, spor)
  select 'cypinfo', synk, tg_table_name, n.cypinfo_id, 'endret', 'metadata',
         datakilder.etikett('cypinfo', tg_table_name, n.data, n.cypinfo_id),
         array_agg(u.felt order by u.felt), jsonb_object_agg(u.felt, u.foer), jsonb_object_agg(u.felt, u.etter),
         jsonb_build_object('parserversjon', jsonb_build_object('foer', g.parserversjon, 'etter', n.parserversjon))
  from gamle g
  join nye n on n.cypinfo_id = g.cypinfo_id
  cross join lateral datakilder.ulike_felt(g.data, n.data) u
  where g.utgatt_kl is null and n.utgatt_kl is null
    and g.raa is not distinct from n.raa and g.hash is distinct from n.hash
    and g.parserversjon is distinct from n.parserversjon
  group by n.cypinfo_id, n.data, g.parserversjon, n.parserversjon;
  return null;
end;
$$;

do $$
declare
  e text;
begin
  for e in select navn from cypinfo.entiteter loop
    execute format(
      'create trigger datakilder_ny after insert on cypinfo.%I referencing new table as nye
         for each statement execute function datakilder.cypinfo_etter_bytte()', e);
    execute format(
      'create trigger datakilder_endret after update on cypinfo.%I referencing old table as gamle new table as nye
         for each statement execute function datakilder.cypinfo_etter_bytte()', e);
  end loop;
end;
$$;

-- --- Statusen ----------------------------------------------------------------
--
-- Som i *_systemrettigheter.sql, med CYPinfo. Versjonen er parserversjonen.

create or replace function public.datakilder_status(antall integer default 200)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_systemarkitekt('Bare for systemarkitektene.');

  return (
    with kjoringer as (
      -- FEST: versjonen er når DMP laget uttrekket (`HentetDato`).
      select 'fest' as kilde, s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             null::text as release, to_char(s.kildedato, 'YYYY-MM-DD"T"HH24:MI:SS') as versjon, s.antall, s.feil
      from legemiddeldata.synkroniseringer s
      where s.kilde = 'FEST'
      union all
      select 'clinpgx', s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             null::text, s.parserversjon::text, s.antall, s.feil
      from clinpgx.synkroniseringer s
      union all
      select 'cpic', s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             s.release, s.skjemaversjon, s.antall, s.feil
      from cpic.synkroniseringer s
      union all
      select 'pubchem', s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             null::text, s.parserversjon::text, s.antall, s.feil
      from pubchem.synkroniseringer s
      union all
      select 'farmakologiportalen', s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             null::text, s.parserversjon::text, s.antall, s.feil
      from farmakologiportalen.synkroniseringer s
      union all
      select 'cypinfo', s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             null::text, s.parserversjon::text, s.antall, s.feil
      from cypinfo.synkroniseringer s
    ),
    siste as (
      select k.*, row_number() over (partition by k.kilde order by k.id desc) as nr
      from kjoringer k
    ),
    opptalt as (
      select e.kilde, e.synk_id,
             jsonb_build_object(
               'klinisk', count(*) filter (where e.niva = 'klinisk' and e.art <> 'grunnlag'),
               'metadata', count(*) filter (where e.niva = 'metadata' and e.art <> 'grunnlag'),
               'grunnlag', count(*) filter (where e.art = 'grunnlag')) as endringer
      from datakilder.endringer e
      where e.synk_id is not null
      group by e.kilde, e.synk_id
    )
    select jsonb_build_object(
      'kjoringer', coalesce((
        select jsonb_agg(jsonb_build_object(
          'kilde', s.kilde, 'id', s.id, 'status', s.status, 'utlost_av', s.utlost_av,
          'startet_kl', s.startet_kl, 'avsluttet_kl', s.avsluttet_kl, 'release', s.release,
          'versjon', s.versjon, 'antall', s.antall, 'feil', s.feil,
          'endringer', coalesce(o.endringer, '{"klinisk": 0, "metadata": 0, "grunnlag": 0}'))
          order by s.kilde, s.id desc)
        from siste s
        left join opptalt o on o.kilde = s.kilde and o.synk_id = s.id
        where s.nr <= 10), '[]'),
      -- Det siste som er kjent om hver kilde, også når siste kjøring ikke
      -- fikk oppgitt release eller versjon (CPIC-releasen er valgfri).
      'kilder', coalesce((
        select jsonb_object_agg(k.kilde, jsonb_build_object(
          'release', (select v.release from kjoringer v
                      where v.kilde = k.kilde and v.status not in ('pagar', 'feilet') and v.release is not null
                      order by v.id desc limit 1),
          'versjon', (select v.versjon from kjoringer v
                      where v.kilde = k.kilde and v.status not in ('pagar', 'feilet') and v.versjon is not null
                      order by v.id desc limit 1),
          -- Også når den er eldre enn de ti kjøringene over.
          'sist_vellykket_kl', (select coalesce(v.avsluttet_kl, v.startet_kl) from kjoringer v
                                where v.kilde = k.kilde and v.status in ('fullfort', 'delvis', 'uendret')
                                order by v.id desc limit 1)))
        from (select distinct kilde from kjoringer) k), '{}'),
      -- Grensen gjelder hver kilde for seg, så en stor release i den ene ikke
      -- skyver den andre ut.
      'endringer', coalesce((
        select jsonb_agg(to_jsonb(e) - 'txid' - 'nr' order by e.registrert_kl desc, e.id desc)
        from (
          select e.*, row_number() over (partition by e.kilde order by e.registrert_kl desc, e.id desc) as nr
          from datakilder.endringer e
        ) e
        where e.nr <= least(greatest(coalesce(datakilder_status.antall, 200), 1), 1000)), '[]')
    )
  );
end;
$$;

comment on schema datakilder is
  'Endringsloggen for datakildene ClinPGx, CPIC, PubChem, Farmakologiportalen og CYPinfo. Ingen av API-rollene har tilgang; systemarkitektene leser den og kjøringene fra alle kildene med datakilder_status().';

-- --- Rettigheter -----------------------------------------------------------

revoke all on all tables in schema cypinfo from public, anon, authenticated, service_role;
revoke all on all functions in schema cypinfo from public, anon, authenticated, service_role;
revoke all on function datakilder.cypinfo_etter_bytte() from public, anon, authenticated, service_role;

revoke all on function
  public.cypinfo_forrige_synk(),
  public.cypinfo_start_synk(text),
  public.cypinfo_fullfor_synk(bigint, jsonb),
  public.cypinfo_avbryt_synk(bigint, text),
  public.les_cypinfo(text[], text[])
from public, anon, authenticated, service_role;

grant execute on function
  public.cypinfo_forrige_synk(),
  public.cypinfo_start_synk(text),
  public.cypinfo_fullfor_synk(bigint, jsonb),
  public.cypinfo_avbryt_synk(bigint, text)
to service_role;

grant execute on function public.les_cypinfo(text[], text[]) to authenticated, service_role;

notify pgrst, 'reload schema';
