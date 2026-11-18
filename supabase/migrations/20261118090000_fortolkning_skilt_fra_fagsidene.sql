-- Fortolkningen og fagsidene er helt adskilte domener (docs/domener.md).
--
-- Til nå leste fortolkningen referanseområdet den viser over knappene i
-- steg 2 fra datakortene på fagsidene, gjennom koblingene fra
-- analyttkodene til stoffene. Her får hver kode i fagmiljøets analyttkatalog
-- sitt eget referanseområde, og fortolkningen leser det derfra:
--
-- 1. `analyttkatalog_koder.referanseomrade`: nedre og øvre grense og enheten,
--    eller null når koden ikke har noe.
-- 2. Tallene kopieres én gang fra kortene fortolkningen viser i dag: det
--    publiserte kortet «Referanseområde» på siden til kodens primære stoff,
--    sidens eget eller kortet for forbindelsen koden måler, slik
--    `referanseomraderPerAnalytt` i appen fant det. Ingen verdier endres, og
--    ingen står i repoet. Etter dette følger de ikke fagsidene: endres et
--    referanseområde i fortolkningen, gjøres det med en migrasjon her, som
--    resten av katalogen.
-- 3. `les_analyttkatalog()` gir referanseområdet per kode. Koblingene,
--    forbindelsene og datakortene gir den fortsatt, så faner med appen fra før
--    virker til de lastes på nytt; de fjernes når overgangen er over (#405).
-- 4. `slett_stoff` stopper ikke lenger en fagside fordi en analysekode var
--    koblet til den: fortolkningen lenker ikke dit.
--
-- Faginnholdet endres ikke. Tilbakeføring: appen fra før leser fortsatt
-- `les_stoffreferanseomrader` og koblingene, som står urørt.

alter table public.analyttkatalog_koder add column referanseomrade jsonb;

-- `coalesce`: en nøkkel som mangler, gir null, og null slipper gjennom en check.
alter table public.analyttkatalog_koder add constraint analyttkatalog_koder_referanseomrade check (
  referanseomrade is null or coalesce(
    jsonb_typeof(referanseomrade) = 'object'
    and jsonb_typeof(referanseomrade -> 'nedre') in ('number', 'null')
    and jsonb_typeof(referanseomrade -> 'ovre') in ('number', 'null')
    and jsonb_typeof(referanseomrade -> 'enhet') = 'string'
    and (jsonb_typeof(referanseomrade -> 'nedre') = 'number' or jsonb_typeof(referanseomrade -> 'ovre') = 'number'),
    false
  )
);

comment on column public.analyttkatalog_koder.referanseomrade is
  'Referanseområdet fortolkningen viser for koden ({nedre, ovre, enhet}), fagmiljøets eget. Kopiert fra fagsidene 18.11.2026; følger dem ikke. Se docs/domener.md.';

-- Kortene fortolkningen viste: hvert publisert «Referanseområde» med en grense,
-- med forbindelsen kortet gjelder. Et kort med en analyttkode i `gjelder` fra
-- før (#405) gjelder forbindelsen koden måler, etter katalogen eller, for
-- OTRAM, den samme lista som appen hadde (`ELDRE_DATAKORTKODER`).
with kort as (
  select
    s.slug as stoff,
    nullif(e.data ->> 'gjelder', '') as gjelder,
    jsonb_build_object(
      'nedre', case when jsonb_typeof(e.data -> 'nedre') = 'number' then e.data -> 'nedre' else 'null'::jsonb end,
      'ovre', case when jsonb_typeof(e.data -> 'ovre') = 'number' then e.data -> 'ovre' else 'null'::jsonb end,
      'enhet', coalesce(btrim(e.data ->> 'enhet'), '')
    ) as omrade
  from public.infosider s
  join public.innholdselementer e on e.infoside_id = s.objekt_id and e.tilstand = s.tilstand
  where s.tilstand = 'publisert'
    and e.panel = 'viktige_data'
    and e.elementtype = 'referanseomrade'
    and (jsonb_typeof(e.data -> 'nedre') = 'number' or jsonb_typeof(e.data -> 'ovre') = 'number')
),
treff as (
  select distinct on (k.fagmiljo_id, k.kode) k.fagmiljo_id, k.kode, kort.omrade
  from public.analyttkatalog_koder k
  join public.analyttkatalog_koblinger b on b.fagmiljo_id = k.fagmiljo_id and b.kode = k.kode and b.primar
  join kort on kort.stoff = b.stoff
  where (k.datakort = 'egne' and kort.gjelder is null)
     or (
       k.datakort = 'forbindelse' and k.forbindelse is not null and kort.gjelder is not null
       and coalesce(
         (select annen.forbindelse from public.analyttkatalog_koder annen
          where annen.fagmiljo_id = k.fagmiljo_id and annen.kode = kort.gjelder and annen.datakort = 'forbindelse'),
         case kort.gjelder when 'OTRAM' then 'o-desmetyltramadol' end,
         kort.gjelder
       ) = k.forbindelse
     )
  order by k.fagmiljo_id, k.kode, kort.gjelder nulls first
)
update public.analyttkatalog_koder k
set referanseomrade = t.omrade
from treff t
where k.fagmiljo_id = t.fagmiljo_id and k.kode = t.kode;

-- Katalogen som før, med referanseområdet til hver kode.
create or replace function public.les_analyttkatalog()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  return (
  with kontekst as (
    select f.id, f.navn
    from public.fagmiljoer f
    where intern.har_aktivt_medlemskap((select auth.uid()))
      and f.id = intern.arbeidsfagmiljo((select auth.uid()))
  )
  select jsonb_build_object(
    'fagmiljo', (select jsonb_build_object('id', k.id, 'navn', k.navn) from kontekst k),
    'metoder', coalesce((
      select jsonb_agg(jsonb_build_object('kode', m.kode, 'beskrivelse', m.beskrivelse) order by m.posisjon)
      from public.analyttkatalog_metoder m
      where m.fagmiljo_id = (select id from kontekst)
    ), '[]'::jsonb),
    'oppforinger', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nokkel', o.nokkel,
        'type', o.type,
        'navn', o.navn,
        'visningsnavn', o.visningsnavn,
        'undertittel', o.undertittel,
        'komponenter', to_jsonb(o.komponenter),
        'gruppe', o.gruppe,
        'analysemetode', o.analysemetode,
        'kategori', o.kategori,
        'enhet', o.enhet,
        'maleomrade', o.maleomrade,
        'antihypertensiv', o.antihypertensiv,
        'aliaser', to_jsonb(o.aliaser),
        'koder', coalesce((
          select jsonb_agg(jsonb_build_object(
            'kode', k.kode, 'navn', k.navn, 'referanseomrade', k.referanseomrade,
            'forbindelse', k.forbindelse, 'datakort', k.datakort
          ) order by k.posisjon)
          from public.analyttkatalog_koder k
          where k.fagmiljo_id = o.fagmiljo_id and k.nokkel = o.nokkel
        ), '[]'::jsonb)
      ) order by o.posisjon)
      from public.analyttkatalog_oppforinger o
      where o.fagmiljo_id = (select id from kontekst)
    ), '[]'::jsonb),
    -- Bare for appen fra før (se over); den nye leser dem ikke.
    'koblinger', coalesce((
      select jsonb_agg(jsonb_build_object(
        'kode', k.kode, 'stoff', k.stoff, 'relasjon', k.relasjon, 'primar', k.primar, 'merknad', k.merknad
      ) order by k.posisjon)
      from public.analyttkatalog_koblinger k
      where k.fagmiljo_id = (select id from kontekst)
    ), '[]'::jsonb)
  )
  );
end;
$$;

-- Fagsiden kan slettes som andre fagsider, også når en analysekode var koblet til den.
create or replace function public.slett_stoff(stoff text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  bruker uuid := intern.krev_registerbruker();
  side uuid;
begin
  select s.objekt_id into side from public.infosider s where s.slug = slett_stoff.stoff limit 1;
  if side is null then
    raise exception 'Stoffet har ingen fagside å slette. Arkiver det i stedet.' using errcode = '22023';
  end if;
  if not intern.er_systemarkitekt(bruker) and intern.stoffside_har_innhold(side) then
    raise exception 'Bare systemarkitektene kan slette en fagside med innhold. Arkiver den i stedet.' using errcode = '42501';
  end if;
  insert into public.stoffstatus (stoff, status, endret_av)
  values (slett_stoff.stoff, 'papirkurv', bruker)
  on conflict on constraint stoffstatus_pkey do update set status = 'papirkurv', endret_av = excluded.endret_av, endret_kl = now();
end;
$function$;

comment on table public.analyttkoblede_stoffer is
  'Ikke i bruk siden 18.11.2026: fortolkningen lenker ikke til fagsidene (docs/domener.md). Fjernes etter overgangen (#405).';
