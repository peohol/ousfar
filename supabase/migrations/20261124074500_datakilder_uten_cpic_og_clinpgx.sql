-- «Datakilder» uten CPIC og ClinPGx (#554): de er tatt helt ut av appen
-- (#437, #540) og står ikke lenger som «Stanset».
--
-- `datakilder_status` sender bare endringene fra kildene som har kjøringer
-- her, altså FEST, PubChem, Farmakologiportalen og CYPinfo. Endringsloggen fra
-- ClinPGx og CPIC står urørt i `datakilder.endringer` (og i arkivet), men
-- sendes ikke til panelet, som ikke viser den. `release` er tatt ut av svaret;
-- bare CPIC hadde det.
--
-- Ingen data endres. Tilbakeføring: definisjonen i
-- 20261123220000_clinpgx_cpic_ut_av_funksjonene.sql.

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
             to_char(s.kildedato, 'YYYY-MM-DD"T"HH24:MI:SS') as versjon, s.antall, s.feil
      from legemiddeldata.synkroniseringer s
      where s.kilde = 'FEST'
      union all
      select 'pubchem', s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             s.parserversjon::text, s.antall, s.feil
      from pubchem.synkroniseringer s
      union all
      select 'farmakologiportalen', s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             s.parserversjon::text, s.antall, s.feil
      from farmakologiportalen.synkroniseringer s
      union all
      select 'cypinfo', s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             s.parserversjon::text, s.antall, s.feil
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
          'startet_kl', s.startet_kl, 'avsluttet_kl', s.avsluttet_kl,
          'versjon', s.versjon, 'antall', s.antall, 'feil', s.feil,
          'endringer', coalesce(o.endringer, '{"klinisk": 0, "metadata": 0, "grunnlag": 0}'))
          order by s.kilde, s.id desc)
        from siste s
        left join opptalt o on o.kilde = s.kilde and o.synk_id = s.id
        where s.nr <= 10), '[]'),
      -- Det siste som er kjent om hver kilde, også når siste kjøring ikke
      -- fikk oppgitt versjonen.
      'kilder', coalesce((
        select jsonb_object_agg(k.kilde, jsonb_build_object(
          'versjon', (select v.versjon from kjoringer v
                      where v.kilde = k.kilde and v.status not in ('pagar', 'feilet') and v.versjon is not null
                      order by v.id desc limit 1),
          -- Også når den er eldre enn de ti kjøringene over.
          'sist_vellykket_kl', (select coalesce(v.avsluttet_kl, v.startet_kl) from kjoringer v
                                where v.kilde = k.kilde and v.status in ('fullfort', 'delvis', 'uendret')
                                order by v.id desc limit 1)))
        from (select distinct kilde from kjoringer) k), '{}'),
      -- Grensen gjelder hver kilde for seg, så mange endringer i den ene ikke
      -- skyver den andre ut. Bare kildene over er med: endringene fra kilder
      -- som er tatt ut (ClinPGx og CPIC), står i tabellen, men sendes ikke.
      'endringer', coalesce((
        select jsonb_agg(to_jsonb(e) - 'txid' - 'nr' order by e.registrert_kl desc, e.id desc)
        from (
          select e.*, row_number() over (partition by e.kilde order by e.registrert_kl desc, e.id desc) as nr
          from datakilder.endringer e
          where e.kilde in (select k.kilde from kjoringer k)
        ) e
        where e.nr <= least(greatest(coalesce(datakilder_status.antall, 200), 1), 1000)), '[]')
    )
  );
end;
$$;

comment on schema datakilder is
  'Endringsloggen for datakildene PubChem, Farmakologiportalen og CYPinfo, og fra før ClinPGx og CPIC, som er tatt ut av appen. Ingen av API-rollene har tilgang; systemarkitektene leser endringene og kjøringene for kildene i bruk med datakilder_status().';

notify pgrst, 'reload schema';
