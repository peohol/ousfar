-- P4c: analyttkatalogen per fagmiljø (docs/ousfar-nasjonal-p0-kartlegging.md
-- §2.5 og §3, docs/fagmiljoer.md, «Analyttkatalogen per fagmiljø»).
--
-- Analyttkodene, navnene, analysemetodene, måleområdene, grensene for
-- antihypertensivene, søkeordene, fortolkningsmodulene og koblingene fra
-- kodene til stoffene er laboratoriets egne. Til nå sto de i klientpakken, og
-- alle som åpnet appen fikk OUS Klinisk farmakologi sine. Her får de en plass
-- i databasen per fagmiljø:
--
--   analyttkatalog_metoder     analysemetodene, i filterets rekkefølge
--   analyttkatalog_oppforinger oppføringene i søket i fortolkningen
--   analyttkatalog_koder       analyttkodene hver oppføring dekker
--   analyttkatalog_koblinger   koblingene fra kodene til stoffene
--
-- Tabellene har radsikkerhet uten regler og ingen rettigheter for
-- nettleseren: den eneste veien inn er `public.les_analyttkatalog()`, som gir
-- katalogen til arbeidskonteksten (P4b) til den innloggede, og ingenting
-- annet. Et fagmiljø uten egen katalog får en tom, aldri OUS sin. Katalogen
-- endres med migrasjoner; appen skriver ikke til den.
--
-- Dataene til OUS Klinisk farmakologi legges inn i neste migrasjon
-- (`*_analyttkatalog_ous_import.sql`).
--
-- Tilbakeføring: en ny migrasjon som fjerner funksjonen og tabellene. Appen
-- før P4c bruker dem ikke.

create table public.analyttkatalog_metoder (
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  kode text not null,
  beskrivelse text not null,
  posisjon integer not null,
  constraint analyttkatalog_metoder_pkey primary key (fagmiljo_id, kode),
  constraint analyttkatalog_metoder_posisjon unique (fagmiljo_id, posisjon),
  constraint analyttkatalog_metoder_kode check (char_length(kode) between 1 and 32 and kode ~ '^[A-Z0-9]+$'),
  constraint analyttkatalog_metoder_beskrivelse check (beskrivelse = btrim(beskrivelse) and char_length(beskrivelse) between 1 and 200)
);

comment on table public.analyttkatalog_metoder is
  'P4c: analysemetodene i fagmiljøets analyttkatalog, i den rekkefølgen filteret viser dem. Se docs/fagmiljoer.md.';

create table public.analyttkatalog_oppforinger (
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  -- Koden for en konsentrasjonsanalytt, ellers modulen (regelsettets `modul`).
  nokkel text not null,
  posisjon integer not null,
  type text not null,
  navn text not null,
  visningsnavn text not null,
  undertittel text,
  komponenter text[] not null default '{}',
  gruppe text not null,
  analysemetode text not null,
  kategori text not null default '',
  enhet text not null default '',
  maleomrade jsonb not null,
  antihypertensiv jsonb,
  aliaser text[] not null default '{}',
  constraint analyttkatalog_oppforinger_pkey primary key (fagmiljo_id, nokkel),
  constraint analyttkatalog_oppforinger_posisjon unique (fagmiljo_id, posisjon),
  constraint analyttkatalog_oppforinger_metode foreign key (fagmiljo_id, analysemetode)
    references public.analyttkatalog_metoder (fagmiljo_id, kode),
  constraint analyttkatalog_oppforinger_type check (type in ('konsentrasjon', 'scenario', 'thc', 'etg')),
  constraint analyttkatalog_oppforinger_nokkel check (char_length(nokkel) between 1 and 64),
  constraint analyttkatalog_oppforinger_navn check (char_length(navn) between 1 and 200 and char_length(visningsnavn) between 1 and 200),
  constraint analyttkatalog_oppforinger_maleomrade check (
    jsonb_typeof(maleomrade) = 'object' and jsonb_typeof(maleomrade -> 'deler') = 'array'
  ),
  constraint analyttkatalog_oppforinger_antihypertensiv check (antihypertensiv is null or jsonb_typeof(antihypertensiv) = 'object')
);

comment on table public.analyttkatalog_oppforinger is
  'P4c: oppføringene i søket i fortolkningen, i fagmiljøets analyttkatalog. Se docs/fagmiljoer.md.';

create table public.analyttkatalog_koder (
  fagmiljo_id uuid not null,
  nokkel text not null,
  posisjon integer not null,
  kode text not null,
  navn text not null,
  constraint analyttkatalog_koder_pkey primary key (fagmiljo_id, kode),
  constraint analyttkatalog_koder_posisjon unique (fagmiljo_id, nokkel, posisjon),
  constraint analyttkatalog_koder_oppforing foreign key (fagmiljo_id, nokkel)
    references public.analyttkatalog_oppforinger (fagmiljo_id, nokkel) on delete cascade,
  constraint analyttkatalog_koder_kode check (char_length(kode) <= 32 and kode ~ '^[A-Z0-9]+([._-][A-Z0-9]+)*$'),
  constraint analyttkatalog_koder_navn check (char_length(navn) between 1 and 200)
);

comment on table public.analyttkatalog_koder is
  'P4c: analyttkodene hver oppføring i fagmiljøets analyttkatalog dekker; hver kode høyst én gang per fagmiljø. Se docs/fagmiljoer.md.';

create table public.analyttkatalog_koblinger (
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  posisjon integer not null,
  kode text not null,
  stoff text not null,
  relasjon text not null,
  primar boolean not null,
  merknad text,
  constraint analyttkatalog_koblinger_pkey primary key (fagmiljo_id, kode, stoff),
  constraint analyttkatalog_koblinger_posisjon unique (fagmiljo_id, posisjon),
  constraint analyttkatalog_koblinger_kode check (char_length(kode) <= 32 and kode ~ '^[A-Z0-9]+([._-][A-Z0-9]+)*$'),
  constraint analyttkatalog_koblinger_stoff check (char_length(stoff) <= 120 and stoff ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint analyttkatalog_koblinger_relasjon check (char_length(relasjon) between 1 and 40)
);

-- Hver kode har høyst ett primært stoff i hvert fagmiljø: dit koden lenker.
create unique index analyttkatalog_koblinger_primar_idx
  on public.analyttkatalog_koblinger (fagmiljo_id, kode) where primar;

comment on table public.analyttkatalog_koblinger is
  'P4c: koblingene fra analyttkodene i fagmiljøets analyttkatalog til stoffene i stoffregisteret. Se docs/fagmiljoer.md.';

-- Ingen tilgang for nettleseren, verken direkte eller gjennom en regel.
alter table public.analyttkatalog_metoder enable row level security;
alter table public.analyttkatalog_oppforinger enable row level security;
alter table public.analyttkatalog_koder enable row level security;
alter table public.analyttkatalog_koblinger enable row level security;

revoke all on table
  public.analyttkatalog_metoder,
  public.analyttkatalog_oppforinger,
  public.analyttkatalog_koder,
  public.analyttkatalog_koblinger
from public, anon, authenticated;

-- Katalogen til arbeidskonteksten til den innloggede (P4b): fagmiljøet, og
-- metodene, oppføringene med kodene og koblingene, i katalogens rekkefølge.
-- Uten et aktivt medlemskap stopper den med 42501, som de andre
-- funksjonene; uten en arbeidskontekst er fagmiljøet null og katalogen tom. Formen leses av `lesKatalogdata` i
-- src/domain/analyttkatalog.ts, som avviser et svar uten den.
create function public.les_analyttkatalog()
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
          select jsonb_agg(jsonb_build_object('kode', k.kode, 'navn', k.navn) order by k.posisjon)
          from public.analyttkatalog_koder k
          where k.fagmiljo_id = o.fagmiljo_id and k.nokkel = o.nokkel
        ), '[]'::jsonb)
      ) order by o.posisjon)
      from public.analyttkatalog_oppforinger o
      where o.fagmiljo_id = (select id from kontekst)
    ), '[]'::jsonb),
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

revoke all on function public.les_analyttkatalog() from public, anon, authenticated, service_role;
grant execute on function public.les_analyttkatalog() to authenticated;

comment on function public.les_analyttkatalog() is
  'P4c: analyttkatalogen til den innloggedes arbeidskontekst; tom uten den, aldri et annet fagmiljøs. Se docs/fagmiljoer.md.';
