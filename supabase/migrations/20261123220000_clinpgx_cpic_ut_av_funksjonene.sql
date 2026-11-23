-- ClinPGx og CPIC ut av funksjonene som leser dem (#437, fase C3 og D2 i
-- docs/cypinfo-integrasjon.md): appen leser ikke lenger noe fra skjemaene
-- `clinpgx` og `cpic`, og de tre funksjonene som fortsatt nevnte dem, skrives
-- om uten dem, så skjemaene kan slettes uten at noe annet må endres (#540).
--
-- - `datakilder.etikett`: uten grenene for CPIC og ClinPGx. Føringene fra før
--   har etiketten lagret i kolonnen `etikett`, så ingenting de viser, endres.
-- - `datakilder_status`: uten kjøringene fra `clinpgx.synkroniseringer` og
--   `cpic.synkroniseringer`. Endringsloggen (`datakilder.endringer`) for begge
--   kildene står og vises som før; begge står som «Stanset» i appen.
-- - `sokedata_versjoner`: uten `clinpgx`, som søket ikke leser lenger.
--
-- Ingen data endres. Tilbakeføring: definisjonene i
-- 20261117084500_cypinfo.sql og 20261123150000_sokedata_versjon_cypinfo.sql.

create or replace function datakilder.etikett(kilde text, type text, data jsonb, objekt_id text)
returns text
language sql
stable
set search_path = ''
as $$
  select left(coalesce(nullif(
    case
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
      -- fikk oppgitt versjonen. `release` står i svaret for formens skyld; ingen
      -- av kildene som er igjen, har noen.
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
      -- Grensen gjelder hver kilde for seg, så mange endringer i den ene ikke
      -- skyver den andre ut. Endringene fra ClinPGx og CPIC står her fortsatt.
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

create or replace function public.sokedata_versjoner()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select jsonb_build_object(
    'sider', (select v.last_value::text from intern.publisert_innhold_versjon v) || ':' || current_date::text,
    'fest', coalesce((
      select max(s.id)::text from legemiddeldata.synkroniseringer s
      where s.kilde = 'FEST' and s.status = 'fullfort'), '0'),
    'cypinfo', coalesce((
      select max(s.id)::text from cypinfo.synkroniseringer s where s.status = 'fullfort'), '0'),
    'laboratorier', coalesce((
      select max(s.id)::text from farmakologiportalen.synkroniseringer s where s.status = 'fullfort'), '0')
  )
$$;

comment on schema datakilder is
  'Endringsloggen for datakildene PubChem, Farmakologiportalen og CYPinfo, og fra før ClinPGx og CPIC. Ingen av API-rollene har tilgang; systemarkitektene leser den og kjøringene fra kildene med datakilder_status().';

notify pgrst, 'reload schema';
