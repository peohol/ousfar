-- Personalkalenderen P2c: «Ny» i Medarbeidere kan kvitteres (#620,
-- docs/personal.md §8.8, som i den godkjente prototypen).
--
-- En medarbeider står som «Ny» til en vaktplanansvarlig eller lokal
-- administrator har valgt vaktene i den gjeldende perioden, også når ingen
-- vakter ble valgt. Før var «Ny» det samme som at medarbeideren aldri hadde
-- hatt noen kvalifikasjon, så merket ble stående for den som bevisst ikke
-- skulle ha vakter, og forsvant for den som kom tilbake etter å ha sluttet.
--
-- - `personal.medarbeidere.vakter_valgt`: dagen i fagmiljøet vaktene sist ble
--   valgt. `personal_sett_kvalifikasjoner` setter den, øker revisjonen og
--   logger valget også når lista er uendret, for en ny medarbeider.
-- - `personal.er_ny(medarbeider)`: ingen valg og ingen kvalifikasjon fra
--   begynnelsen av den gjeldende perioden (en syntetisk: fra `aktiv_fra`).
-- - Lesemodellen gir `ny` sammen med kvalifikasjonene, bare til rollene som
--   ser dem, og innstillingene etter en endring gir den også.
--
-- Ingen personalopplysninger: kolonnen er en dato for et valg i kalenderen.
--
-- Tilbakeføring: en ny migrasjon som setter `public.personal_grunnlag`,
-- `public.personal_sett_kvalifikasjoner` og `personal.innstillinger_json`
-- tilbake til `20261128050000_personal_medarbeidere.sql`, og fjerner
-- `personal.er_ny` og kolonnen.

alter table personal.medarbeidere add column vakter_valgt date;

comment on column personal.medarbeidere.vakter_valgt is
  'Dagen i fagmiljøet vaktene sist ble valgt for medarbeideren, også når ingen ble valgt (docs/personal-database.md, «Innstillingene»).';

-- Ny i kalenderen: vaktene er ikke valgt i den gjeldende perioden. Perioden
-- begynner med den siste aktive perioden (en syntetisk medarbeider: `aktiv_fra`),
-- så den som kommer tilbake etter å ha sluttet, er ny igjen.
create function personal.er_ny(m personal.medarbeidere)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with periode as (
    select coalesce((select max(p.fra) from personal.medarbeiderperioder p where p.medarbeider_id = m.id), m.aktiv_fra) as fra
  )
  select (m.vakter_valgt is null or m.vakter_valgt < periode.fra)
    and not exists (select 1 from personal.kvalifikasjoner k where k.medarbeider_id = m.id and k.fra >= periode.fra)
  from periode
$$;

revoke all on function personal.er_ny(personal.medarbeidere) from public, anon, authenticated, service_role;

create or replace function personal.innstillinger_json(m personal.medarbeidere)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', m.id,
    'revisjon', m.revisjon,
    'ny', personal.er_ny(m),
    'kvalifikasjoner', coalesce((
      select jsonb_agg(jsonb_build_object('status', k.status_id, 'fra', k.fra, 'til', k.til) order by k.status_id, k.fra)
      from personal.kvalifikasjoner k where k.medarbeider_id = m.id
    ), '[]'::jsonb),
    'vaktandel', coalesce((select v.plan from personal.vaktandeler v where v.medarbeider_id = m.id), '{"ordinary": [], "temporary": []}'::jsonb)
  )
$$;

create or replace function public.personal_sett_kvalifikasjoner(fagmiljo uuid, medarbeider uuid, statuser jsonb, forventet_revisjon bigint)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  m personal.medarbeidere;
  dag date;
  regler jsonb;
  ny text[];
  naa text[];
  s text;
  def jsonb;
  var_ny boolean;
begin
  perform personal.krev_skrivetilgang(personal_sett_kvalifikasjoner.fagmiljo, 'editPeople');
  if jsonb_typeof(statuser) is distinct from 'array' or jsonb_array_length(statuser) > 60
     or exists (select 1 from jsonb_array_elements(statuser) x where jsonb_typeof(x) is distinct from 'string') then
    raise exception 'Kvalifikasjonene må være en liste med oppgaver.' using errcode = '22023';
  end if;
  ny := array(select distinct x from jsonb_array_elements_text(statuser) x order by 1);
  m := personal.las_medarbeider(personal_sett_kvalifikasjoner.fagmiljo, personal_sett_kvalifikasjoner.medarbeider, personal_sett_kvalifikasjoner.forventet_revisjon);
  dag := personal.i_dag(m.fagmiljo_id);
  var_ny := personal.er_ny(m);
  regler := personal.regler_for(m.fagmiljo_id, dag);
  naa := personal.kvalifikasjoner_paa(m.id, dag);

  foreach s in array ny loop
    continue when s = any (naa);
    def := personal.statusdef(regler, s);
    if def is null or (def -> 'requiresQualification') is distinct from 'true'::jsonb then
      raise exception 'Ukjent oppgave.' using errcode = '22023';
    end if;
    if (def -> 'active') is distinct from 'true'::jsonb then
      raise exception '% er utgått og kan ikke velges.', def ->> 'name' using errcode = '22023';
    end if;
  end loop;

  foreach s in array naa loop
    continue when s = any (ny);
    delete from personal.kvalifikasjoner k where k.medarbeider_id = m.id and k.status_id = s and k.fra >= dag;
    update personal.kvalifikasjoner k set til = dag - 1
    where k.medarbeider_id = m.id and k.status_id = s and k.fra < dag and (k.til is null or k.til >= dag);
  end loop;
  foreach s in array ny loop
    continue when s = any (naa);
    delete from personal.kvalifikasjoner k where k.medarbeider_id = m.id and k.status_id = s and k.fra > dag;
    insert into personal.kvalifikasjoner (medarbeider_id, status_id, fra) values (m.id, s, dag);
  end loop;

  -- Også et valg uten endring teller for en ny medarbeider: da er vaktene
  -- valgt, selv om ingen ble valgt («Ny» kvitteres), og det logges.
  if ny is distinct from naa or var_ny then
    update personal.medarbeidere x set revisjon = x.revisjon + 1, vakter_valgt = dag where x.id = m.id returning * into m;
    perform personal.logg_innstilling(m, 'kvalifikasjoner', case when ny is distinct from naa then to_jsonb(naa) end, to_jsonb(ny));
  end if;
  return personal.innstillinger_json(m);
end;
$$;

create or replace function public.personal_grunnlag(fagmiljo uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r text;
  aktor constant uuid := (select auth.uid());
begin
  r := personal.krev_tilgang(personal_grunnlag.fagmiljo, 'view');
  return jsonb_build_object(
    'rolle', r,
    'i_dag', personal.i_dag(personal_grunnlag.fagmiljo),
    'enhet', personal.enhet(personal_grunnlag.fagmiljo),
    'testmiljo', (select f.testmiljo from public.fagmiljoer f where f.id = personal_grunnlag.fagmiljo),
    'meg', personal.meg(personal_grunnlag.fagmiljo, aktor),
    'simulering', personal.vis_som_json(personal_grunnlag.fagmiljo, aktor),
    'regelsett', coalesce((
      select jsonb_agg(personal.regelsett(o) order by o.versjon)
      from personal.oppsett o where o.fagmiljo_id = personal_grunnlag.fagmiljo
    ), '[]'::jsonb),
    'kategorier', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'name', s.navn, 'short', s.navn) order by k.rekkefolge, s.rekkefolge, s.navn)
      from public.stillinger s join public.stillingskategorier k on k.id = s.kategori_id
    ), '[]'::jsonb),
    'medarbeidere', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', m.id,
        'navn', coalesce(m.syntetisk_navn, nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username),
        'stilling', case when m.syntetisk_navn is not null then m.syntetisk_stilling_id else p.stilling_id end,
        'syntetisk', m.syntetisk_navn is not null,
        'aktiv_fra', m.aktiv_fra,
        'aktiv_til', m.aktiv_til,
        'perioder', personal.perioder_json(m),
        'revisjon', m.revisjon,
        'vaktandel', coalesce((select v.plan from personal.vaktandeler v where v.medarbeider_id = m.id), '{"ordinary": [], "temporary": []}'::jsonb)
      ) || case when personal.kan(r, 'editCalendar') then jsonb_build_object('kvalifikasjoner', coalesce((
        select jsonb_agg(jsonb_build_object('status', k.status_id, 'fra', k.fra, 'til', k.til) order by k.status_id, k.fra)
        from personal.kvalifikasjoner k where k.medarbeider_id = m.id
      ), '[]'::jsonb), 'ny', personal.er_ny(m)) else '{}'::jsonb end
      order by coalesce(m.syntetisk_navn, p.first_name || ' ' || p.last_name), m.id)
      from personal.medarbeidere m
      left join public.profiles p on p.id = m.bruker_id
      where m.fagmiljo_id = personal_grunnlag.fagmiljo
    ), '[]'::jsonb),
    'vaktplanansvarlige', coalesce((
      select jsonb_agg(jsonb_build_object(
        'bruker', v.bruker_id,
        'navn', coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username),
        'fra', v.fra
      ) order by p.first_name, p.last_name, v.bruker_id)
      from personal.vaktplanansvarlige v
      join public.profiles p on p.id = v.bruker_id
      where v.fagmiljo_id = personal_grunnlag.fagmiljo and v.til is null
        and personal.er_vaktplanansvarlig(v.fagmiljo_id, v.bruker_id)
        and personal.reell_rolle(v.fagmiljo_id, v.bruker_id) is not null
    ), '[]'::jsonb)
  );
end;
$$;
