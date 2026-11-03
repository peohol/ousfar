-- Kildesaker: teknisk oppfølging skilt fra faglige beslutninger (VDR-1 i
-- `docs/verktøy-omlegging-2026-11.md`, `docs/verktøy-p12-overvaking.md` §5).
--
-- Hvert funn i `public.kildefunn` blir en sak med en tilstand:
--
--   teknisk_utredning → (uavklart) → faglig_gjennomgang → beslutning → oppfolging → avsluttet
--
-- Et nytt funn starter alltid i det tekniske sporet. En endret kontrollsum
-- alene gir aldri en sak for den faglige redaktøren: saken når redaktøren
-- først når en agent har lagt frem et konkret faglig spørsmål med valg og
-- konsekvenser, eller straks som sikkerhetsproblem når en agent har vurdert
-- at en eksisterende plan kan være uforsvarlig. Det finnes ingen tidsfrister.
--
-- En registrert beslutning er ikke et utført tiltak. Beslutningen bestiller
-- tiltak (`public.kildefunn_tiltak`), og saken avsluttes først når hvert
-- tiltak er utført og kontrollert. En nødstopp settes i samme transaksjon som
-- beslutningen om å deaktivere en regel, med den eksisterende nødstoppen.
--
-- Teknisk avslutning krever en dokumentert konklusjon med sammenlignbart
-- grunnlag, aldri en kontrollsum alene, eller at en senere kontroll av delen
-- fant kilden i samsvar med grunnlaget igjen.
--
-- Alt som skjer med en sak, står i `public.kildefunn_hendelser`. Ingen rad
-- slettes, og et nytt avtrykk for en åpen sak oppdaterer saken (med det gamle
-- innholdet i hendelsen) i stedet for å avløse den, så en åpen beslutning
-- aldri viskes ut. Ingenting her endrer eller godkjenner en regel.

-- --- Saken -------------------------------------------------------------------------

alter table public.kildefunn
  add column tilstand text not null default 'teknisk_utredning',
  -- Øker ved hver endring av saken; en handling på en eldre versjon avvises.
  add column versjon integer not null default 1,
  add column endret_kl timestamptz not null default now(),
  -- Den tekniske konklusjonen (agent), og når den ble gitt.
  add column konklusjon text,
  add column konklusjon_kl timestamptz,
  -- Den tekniske begrunnelsen; for et mulig sikkerhetsproblem også det redaktøren ser.
  add column konklusjon_tekst text,
  add column alvor text not null default 'faglig',
  -- Det konkrete faglige spørsmålet til redaktøren, når det er lagt frem.
  add column sporsmal jsonb,
  -- Redaktørens siste beslutning (et `utsett` kan følges av en ny).
  add column valg text,
  add column valg_merknad text,
  add column valg_av uuid references public.profiles (id),
  add column valg_kl timestamptz,
  -- Et kort, faglig varsel på akkurat de berørte reglene i verktøyene: `{tekst, regler: [{regel, versjon}], kl}`.
  add column brukervarsel jsonb,
  -- Kilden har fått nytt innhold etter at saken ble vurdert; agenten må se på det igjen.
  add column nytt_innhold_kl timestamptz,
  add column avsluttet_kl timestamptz,
  add column utfall text,
  add constraint kildefunn_tilstand check (tilstand in ('teknisk_utredning', 'uavklart', 'faglig_gjennomgang', 'beslutning', 'oppfolging', 'avsluttet')),
  add constraint kildefunn_konklusjon check (
    (konklusjon is null and konklusjon_kl is null and konklusjon_tekst is null)
    or (konklusjon in ('uten_faglig_betydning', 'uavklart', 'faglig_relevant', 'mulig_alvorlig_risiko', 'dekket_av_beslutning') and konklusjon_kl is not null and konklusjon_tekst is not null)
  ),
  add constraint kildefunn_alvor check (alvor in ('faglig', 'sikkerhet')),
  add constraint kildefunn_sporsmal check (
    (sporsmal is null or jsonb_typeof(sporsmal) = 'object')
    and (tilstand not in ('beslutning', 'oppfolging') or sporsmal is not null)
  ),
  add constraint kildefunn_valg check (
    (valg is null and valg_merknad is null and valg_av is null and valg_kl is null)
    or (valg in ('behold', 'revider', 'deaktiver', 'utsett') and valg_av is not null and valg_kl is not null)
  ),
  add constraint kildefunn_brukervarsel check (brukervarsel is null or jsonb_typeof(brukervarsel) = 'object'),
  add constraint kildefunn_utfall check (
    (tilstand <> 'avsluttet' and utfall is null and avsluttet_kl is null)
    or (
      tilstand = 'avsluttet' and avsluttet_kl is not null
      and utfall in ('teknisk_avklart', 'ikke_funnet_igjen', 'tiltak_kontrollert', 'prove', 'avlost', 'tidligere_beslutning')
    )
  );

comment on column public.kildefunn.tilstand is
  'teknisk_utredning, uavklart og faglig_gjennomgang er agentens spor; beslutning og oppfolging er redaktørens; avsluttet har et utfall.';

create table public.kildefunn_hendelser (
  id bigint generated always as identity primary key,
  funn bigint not null references public.kildefunn (id),
  kl timestamptz not null default now(),
  art text not null,
  fra text,
  til text,
  av uuid references public.profiles (id),
  agent text,
  -- Det som ble gjort: konklusjonen med bevis, spørsmålet, det gamle innholdet, kjøringen.
  data jsonb not null default '{}'::jsonb,
  constraint kildefunn_hendelser_art check (
    art in ('opprettet', 'nytt_innhold', 'borte', 'teknisk_konklusjon', 'faglig_sporsmal', 'brukervarsel', 'beslutning', 'tiltak', 'avsluttet', 'migrert')
  ),
  constraint kildefunn_hendelser_data check (jsonb_typeof(data) = 'object')
);

comment on table public.kildefunn_hendelser is
  'Alt som har skjedd med en kildesak, med hvem og når. Ingen rad endres eller slettes.';

create index kildefunn_hendelser_funn on public.kildefunn_hendelser (funn, id);

create table public.kildefunn_tiltak (
  id bigint generated always as identity primary key,
  funn bigint not null references public.kildefunn (id),
  art text not null,
  -- Regelen tiltaket gjelder, for en nødstopp.
  regel text,
  sperre uuid references public.verktoysperrer (id),
  status text not null default 'bestilt',
  lenke text,
  bevis text,
  bestilt_kl timestamptz not null default now(),
  endret_kl timestamptz not null default now(),
  endret_av uuid references public.profiles (id),
  endret_agent text,
  constraint kildefunn_tiltak_art check (art in ('nytt_grunnlag', 'ny_regelversjon', 'sperre')),
  constraint kildefunn_tiltak_status check (status in ('bestilt', 'pagar', 'utfort', 'kontrollert', 'feilet')),
  constraint kildefunn_tiltak_sperre check ((art = 'sperre') = (sperre is not null and regel is not null)),
  constraint kildefunn_tiltak_lenke check (lenke is null or (lenke ~ '^https://[^[:space:]]+$' and char_length(lenke) <= 500)),
  -- Utført, kontrollert eller stoppet står aldri uten bevis.
  constraint kildefunn_tiltak_bevis check (status in ('bestilt', 'pagar') or (bevis is not null and char_length(btrim(bevis)) between 5 and 2000))
);

comment on table public.kildefunn_tiltak is
  'Tiltakene en faglig beslutning bestilte, til de er utført og kontrollert. Ingen rad slettes.';

create index kildefunn_tiltak_funn on public.kildefunn_tiltak (funn, id);

alter table public.kildefunn_hendelser enable row level security;
alter table public.kildefunn_tiltak enable row level security;
revoke all on table public.kildefunn_hendelser from public, anon, authenticated;
revoke all on table public.kildefunn_tiltak from public, anon, authenticated;

-- --- De eksisterende funnene, uten tap -----------------------------------------------

-- Et avløst funn er avsluttet som avløst; et funn med faglig beslutning er
-- avsluttet med den; et åpent funn med en teknisk vurdering i fritekst er
-- teknisk undersøkt uten konklusjon (uavklart); resten venter på teknisk
-- utredning. Fritekstene står urørt i kolonnene sine.
update public.kildefunn k
set tilstand = case when k.erstattet_kl is not null or k.beslutning_kl is not null then 'avsluttet' when k.teknisk_kl is not null then 'uavklart' else 'teknisk_utredning' end,
    utfall = case when k.erstattet_kl is not null then 'avlost' when k.beslutning_kl is not null then 'tidligere_beslutning' end,
    avsluttet_kl = coalesce(k.erstattet_kl, k.beslutning_kl),
    konklusjon = case when k.erstattet_kl is null and k.beslutning_kl is null and k.teknisk_kl is not null then 'uavklart' end,
    konklusjon_kl = case when k.erstattet_kl is null and k.beslutning_kl is null and k.teknisk_kl is not null then k.teknisk_kl end,
    konklusjon_tekst = case when k.erstattet_kl is null and k.beslutning_kl is null and k.teknisk_kl is not null then k.teknisk_vurdering end,
    endret_kl = coalesce(k.erstattet_kl, k.beslutning_kl, k.teknisk_kl, k.opprettet_kl);

insert into public.kildefunn_hendelser (funn, kl, art, til, data)
select k.id, now(), 'migrert', k.tilstand,
  jsonb_build_object('grunn', 'Overført fra P12.1-modellen med frister til kildesaker (VDR-1). Fritekstene står urørt.', 'utfall', k.utfall)
from public.kildefunn k;

-- Én åpen sak per nøkkel, etter overføringen: et nytt avtrykk oppdaterer den åpne saken.
drop index public.kildefunn_apen;
create unique index kildefunn_apen on public.kildefunn (funn) where tilstand <> 'avsluttet';

-- --- Hjelpefunksjoner ----------------------------------------------------------------

-- En tekst for redaktøren eller klinikeren: lengden stemmer, og den har ingen
-- kontrollsum eller annen lang heksadesimal streng.
create function intern.kildesak_tekst(t text, minst integer, maks integer)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select t is not null and char_length(btrim(t)) between minst and maks and t !~ '[0-9A-Fa-f]{32,}'
$$;

create function intern.kildesak_hendelse(funn bigint, art text, fra text, til text, av uuid, agent text, data jsonb)
returns void
language sql
set search_path = ''
as $$
  insert into public.kildefunn_hendelser (funn, art, fra, til, av, agent, data)
  values (funn, art, fra, til, av, agent, coalesce(data, '{}'::jsonb))
$$;

-- Avslutter saken med utfallet; et klinikervarsel forsvinner med den.
create function intern.kildesak_avslutt(sak bigint, utfall text, av uuid, agent text, data jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  forrige text;
begin
  select k.tilstand into forrige from public.kildefunn k where k.id = sak;
  update public.kildefunn k
  set tilstand = 'avsluttet', utfall = kildesak_avslutt.utfall, avsluttet_kl = greatest(now(), k.opprettet_kl), brukervarsel = null,
      versjon = k.versjon + 1, endret_kl = now()
  where k.id = sak;
  perform intern.kildesak_hendelse(sak, 'avsluttet', forrige, 'avsluttet', av, agent, coalesce(data, '{}'::jsonb) || jsonb_build_object('utfall', utfall));
end;
$$;

-- Avslutter en sak i oppfølging når hvert tiltak er kontrollert, men aldri
-- mens kilden har nytt innhold som ikke er vurdert: da er saken ikke ferdig
-- selv om tiltakene for det gamle innholdet er det.
create function intern.kildesak_ferdig(sak bigint, av uuid, agent text)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.kildefunn k where k.id = sak and k.tilstand = 'oppfolging' and k.nytt_innhold_kl is null)
     and exists (select 1 from public.kildefunn_tiltak t where t.funn = sak)
     and not exists (select 1 from public.kildefunn_tiltak t where t.funn = sak and t.status <> 'kontrollert') then
    perform intern.kildesak_avslutt(sak, 'tiltak_kontrollert', av, agent, '{}'::jsonb);
    return true;
  end if;
  return false;
end;
$$;

-- Hva hvert valg gjør, slik databasen faktisk utfører det.
create function intern.kildesak_valgvirkning(valg text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case valg
    when 'behold' then jsonb_build_object(
      'na', '[]'::jsonb,
      'deretter', jsonb_build_array(
        'Et nytt sammenligningsgrunnlag for kilden legges inn i en kontrollert endring.',
        'Når en senere kildekontroll bekrefter at kilden stemmer med grunnlaget, avsluttes saken.'))
    when 'revider' then jsonb_build_object(
      'na', '[]'::jsonb,
      'deretter', jsonb_build_array(
        'En ny versjon av regelen utarbeides i en kontrollert endring.',
        'Den nye versjonen tas i bruk først etter uavhengig klinisk kontroll og godkjenning; da avsluttes saken.'))
    when 'deaktiver' then jsonb_build_object(
      'na', jsonb_build_array('De berørte reglene sperres straks med nødstoppen, så de ikke gir noen plan.'),
      'deretter', jsonb_build_array('Sperren kan oppheves i Adminmeny → Kliniske verktøy når regelen er vurdert på nytt.'))
    when 'utsett' then jsonb_build_object(
      'na', '[]'::jsonb,
      'deretter', jsonb_build_array('Saken står åpen og venter fortsatt på en beslutning.'))
  end
$$;

create function intern.kildesak_tiltakstekst(art text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case art
    when 'nytt_grunnlag' then 'Nytt kontrollert sammenligningsgrunnlag for kilden'
    when 'ny_regelversjon' then 'Ny regelversjon med uavhengig klinisk godkjenning'
    when 'sperre' then 'Nødstopp for den berørte regelen'
  end
$$;

-- Kontrollerer og rydder spørsmålet en agent legger frem for redaktøren, eller avviser det.
create function intern.kildesak_sporsmal(k public.kildefunn, s jsonb)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  ugyldig constant text := 'Spørsmålet til redaktøren mangler noe eller har en form databasen ikke kjenner: ';
  valgene text[];
  b jsonb;
  v jsonb;
  berorte jsonb := '[]'::jsonb;
  valg jsonb := '[]'::jsonb;
  sammenlignet timestamptz;
begin
  if jsonb_typeof(s) is distinct from 'object' then
    raise exception '%spørsmålet er ikke et objekt.', ugyldig using errcode = '22023';
  end if;
  if not intern.kildesak_tekst(s ->> 'tittel', 5, 200) then raise exception '%tittel (5–200 tegn, ingen kontrollsum).', ugyldig using errcode = '22023'; end if;
  if not intern.kildesak_tekst(s ->> 'endring', 10, 2000) then raise exception '%endring (10–2000 tegn, ingen kontrollsum).', ugyldig using errcode = '22023'; end if;
  if not intern.kildesak_tekst(s ->> 'relevans', 10, 2000) then raise exception '%relevans (10–2000 tegn, ingen kontrollsum).', ugyldig using errcode = '22023'; end if;
  if not intern.kildesak_tekst(s ->> 'status_na', 5, 500) then raise exception '%status_na (5–500 tegn, ingen kontrollsum).', ugyldig using errcode = '22023'; end if;
  if jsonb_typeof(s -> 'kilde') is distinct from 'object' or not intern.kildesak_tekst(s -> 'kilde' ->> 'navn', 2, 300)
     or (s -> 'kilde' ->> 'lenke' is not null and ((s -> 'kilde' ->> 'lenke') !~ '^https://[^[:space:]]+$' or char_length(s -> 'kilde' ->> 'lenke') > 500)) then
    raise exception '%kilde med navn og eventuelt en https-lenke.', ugyldig using errcode = '22023';
  end if;
  sammenlignet := (s -> 'kilde' ->> 'sammenlignet_kl')::timestamptz;

  if jsonb_typeof(s -> 'berorte') is distinct from 'array' then raise exception '%berorte.', ugyldig using errcode = '22023'; end if;
  for b in select x from jsonb_array_elements(s -> 'berorte') x loop
    if not intern.kildesak_tekst(b ->> 'hva', 3, 300) or jsonb_typeof(b -> 'versjon') is distinct from 'number'
       or not exists (
         select 1 from jsonb_array_elements(coalesce(k.innhold -> 'berorte', '[]'::jsonb)) g
         where g ->> 'regel' = b ->> 'regel' and (g ->> 'versjon')::integer = (b ->> 'versjon')::integer
       ) then
      raise exception '%en berørt regel som funnet faktisk gjelder (regel og versjon), med hva som treffes.', ugyldig using errcode = '22023';
    end if;
    berorte := berorte || jsonb_build_array(jsonb_build_object('regel', b ->> 'regel', 'versjon', (b ->> 'versjon')::integer, 'hva', btrim(b ->> 'hva')));
  end loop;
  if (select count(distinct x ->> 'regel') from jsonb_array_elements(berorte) x) <> jsonb_array_length(berorte) then
    raise exception '%hver berørt regel bare én gang.', ugyldig using errcode = '22023';
  end if;
  if jsonb_array_length(berorte) = 0 and not k.prove then
    raise exception '%minst én berørt regel.', ugyldig using errcode = '22023';
  end if;

  if jsonb_typeof(s -> 'valg') is distinct from 'array' or jsonb_array_length(s -> 'valg') not between 2 and 4 then
    raise exception '%to til fire valg.', ugyldig using errcode = '22023';
  end if;
  for v in select x from jsonb_array_elements(s -> 'valg') x loop
    if (v ->> 'valg') is null or (v ->> 'valg') not in ('behold', 'revider', 'deaktiver', 'utsett') or not intern.kildesak_tekst(v ->> 'verktoyet', 5, 500) then
      raise exception '%hvert valg er behold, revider, deaktiver eller utsett, med hvordan verktøyet virker imens.', ugyldig using errcode = '22023';
    end if;
    if v ->> 'valg' = 'deaktiver' and (k.prove or jsonb_array_length(berorte) = 0) then
      raise exception '%deaktiver kan bare tilbys for en reell sak med berørte regler.', ugyldig using errcode = '22023';
    end if;
    valg := valg || jsonb_build_array(jsonb_build_object('valg', v ->> 'valg', 'verktoyet', btrim(v ->> 'verktoyet')));
  end loop;
  select array_agg(x ->> 'valg') into valgene from jsonb_array_elements(valg) x;
  if (select count(distinct x) from unnest(valgene) x) <> cardinality(valgene) then
    raise exception '%hvert valg bare én gang.', ugyldig using errcode = '22023';
  end if;

  if jsonb_typeof(s -> 'anbefaling') is distinct from 'object' or not ((s -> 'anbefaling' ->> 'valg') = any (valgene))
     or not intern.kildesak_tekst(s -> 'anbefaling' ->> 'begrunnelse', 10, 2000) or not intern.kildesak_tekst(s -> 'anbefaling' ->> 'av', 2, 200) then
    raise exception '%en anbefaling blant valgene, med begrunnelse og hvem som anbefaler.', ugyldig using errcode = '22023';
  end if;

  return jsonb_build_object(
    'tittel', btrim(s ->> 'tittel'),
    'endring', btrim(s ->> 'endring'),
    'kilde', jsonb_build_object('navn', btrim(s -> 'kilde' ->> 'navn'), 'lenke', s -> 'kilde' ->> 'lenke', 'sammenlignet_kl', sammenlignet),
    'berorte', berorte,
    'relevans', btrim(s ->> 'relevans'),
    'anbefaling', jsonb_build_object('valg', s -> 'anbefaling' ->> 'valg', 'begrunnelse', btrim(s -> 'anbefaling' ->> 'begrunnelse'), 'av', btrim(s -> 'anbefaling' ->> 'av')),
    'valg', valg,
    'status_na', btrim(s ->> 'status_na')
  );
end;
$$;

-- Saken slik den faglige redaktøren ser den: uten kontrollsummer, nøkler eller
-- interne prosessdetaljer (`Fagsak` i `src/verktoy/overvaking/fagsak.ts`).
create function intern.kildesak_fagsak(k public.kildefunn)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with
    -- De berørte regelversjonene slik redaktøren ser dem, hver med om nødstoppen er satt for akkurat den regelen.
    berorte as (
      select o, jsonb_build_object('regel', b ->> 'regel', 'versjon', (b ->> 'versjon')::integer, 'hva', b ->> 'hva') as b,
        exists (
          select 1 from public.verktoysperrer s
          where s.opphevet_kl is null and (
            s.omfang = 'alle'
            or (s.omfang = 'regel' and s.mal = b ->> 'regel')
            -- Verktøyene regelen hører til, slik funnet oppga dem.
            or (s.omfang = 'verktoy' and exists (
              select 1 from jsonb_array_elements(coalesce(k.innhold -> 'berorte', '[]'::jsonb)) g, jsonb_array_elements_text(coalesce(g -> 'verktoy', '[]'::jsonb)) v
              where g ->> 'regel' = b ->> 'regel' and v = s.mal)))
        ) as sperret
      from jsonb_array_elements(coalesce(k.sporsmal -> 'berorte', (
        select coalesce(jsonb_agg(jsonb_build_object('regel', g ->> 'regel', 'versjon', (g ->> 'versjon')::integer, 'hva', g ->> 'hvorfor')), '[]'::jsonb)
        from jsonb_array_elements(coalesce(k.innhold -> 'berorte', '[]'::jsonb)) g))) with ordinality as x(b, o)
    ),
    sperring as (
      select count(*) as alle, count(*) filter (where sperret) as sperrede,
        string_agg(b ->> 'regel', ', ' order by o) filter (where sperret) as hvilke
      from berorte
    )
  select jsonb_build_object(
    'id', k.id::text,
    'versjon', k.versjon,
    'fase', case k.tilstand when 'oppfolging' then 'oppfolging' when 'avsluttet' then 'avsluttet' else 'beslutning' end,
    'alvor', k.alvor,
    'prove', k.prove,
    'tittel', coalesce(k.sporsmal ->> 'tittel', 'Mulig sikkerhetsproblem: ' || k.etikett),
    'endring', coalesce(k.sporsmal ->> 'endring', k.konklusjon_tekst),
    'kilde', coalesce(k.sporsmal -> 'kilde', jsonb_build_object(
      'navn', k.etikett, 'lenke', null,
      'sammenlignet_kl', (select j.kjort_kl from public.kildeovervaking_kjoringer j where j.id = k.sist_sett_kjoring))),
    'berorte', (select coalesce(jsonb_agg(b || jsonb_build_object('sperret', sperret) order by o), '[]'::jsonb) from berorte),
    'relevans', coalesce(k.sporsmal ->> 'relevans', 'En agent har vurdert at en eksisterende plan kan være uforsvarlig. Det faglige spørsmålet og valgene legges frem så snart vurderingen er ferdig. Ved konkret fare kan regelen sperres med nødstoppen straks.'),
    'anbefaling', k.sporsmal -> 'anbefaling',
    'valg', coalesce((
      select jsonb_agg(v || intern.kildesak_valgvirkning(v ->> 'valg') order by o)
      from jsonb_array_elements(k.sporsmal -> 'valg') with ordinality as x(v, o)), '[]'::jsonb),
    -- Nødstoppen omtales bare for reglene den faktisk gjelder; de andre gir fortsatt planer.
    'status_na', (
      select case
        when k.tilstand = 'avsluttet' or p.sperrede = 0 then coalesce(k.sporsmal ->> 'status_na', 'Verktøyet virker som før til en eventuell nødstopp settes.')
        when p.sperrede = p.alle and p.alle = 1 then 'Den berørte regelen er sperret med nødstoppen og gir ingen plan.'
        when p.sperrede = p.alle then format('Alle de %s berørte reglene er sperret med nødstoppen og gir ingen plan.', p.alle)
        else format('Nødstoppen er satt for %s av %s berørte regler (%s), som ikke gir noen plan. De andre berørte reglene gir fortsatt planer som før.',
          p.sperrede, p.alle, p.hvilke)
      end
      from sperring p),
    'opprettet_kl', k.opprettet_kl,
    'beslutning', case when k.valg is null then null else jsonb_build_object('valg', k.valg, 'merknad', k.valg_merknad, 'av', intern.profilnavn(k.valg_av), 'kl', k.valg_kl) end,
    -- Tidligere beslutninger i saken, eldste først, uten den som gjelder nå (et nytt spørsmål eller nytt kildeinnhold nullstiller den gjeldende).
    'tidligere', (
      select coalesce(jsonb_agg(jsonb_build_object('valg', h.data ->> 'valg', 'merknad', h.data ->> 'merknad', 'av', coalesce(intern.profilnavn(h.av), h.agent, 'Ukjent'), 'kl', h.kl) order by h.id), '[]'::jsonb)
      from public.kildefunn_hendelser h
      where h.funn = k.id and h.art = 'beslutning'
        and (k.valg is null or h.id <> (select max(x.id) from public.kildefunn_hendelser x where x.funn = k.id and x.art = 'beslutning'))),
    'tiltak', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'tekst', intern.kildesak_tiltakstekst(t.art), 'art', t.art, 'regel', t.regel, 'status', t.status, 'endret_kl', t.endret_kl, 'lenke', t.lenke
        ) order by t.id), '[]'::jsonb)
      from public.kildefunn_tiltak t where t.funn = k.id),
    'avsluttet', case when k.tilstand = 'avsluttet' then jsonb_build_object('kl', k.avsluttet_kl, 'utfall', k.utfall) end
  )
$$;

-- --- Kjøringen melder seg (erstatter P12.1-versjonen) ---------------------------------

-- Som før, med disse forskjellene: et nytt avtrykk for en åpen sak oppdaterer
-- saken (det gamle innholdet står i hendelsen); en teknisk konklusjon gjelder
-- da ikke lenger, og en sak i det faglige sporet merkes med nytt innhold. Et
-- spørsmål som venter på beslutning, trekkes tilbake til faglig gjennomgang
-- (spørsmålet og en eventuell utsettelse står i hendelsen), så redaktøren
-- aldri velger ut fra et spørsmål om eldre kildeinnhold. En sak i oppfølging
-- beholder beslutningen og tiltakene, men avsluttes ikke før det nye
-- innholdet er vurdert (`intern.kildesak_ferdig`). Et
-- avsluttet funn med samme avtrykk står bare avsluttet når utfallet dekker
-- innholdet. En sak i det tekniske sporet som ikke finnes igjen i en del som
-- faktisk ble kontrollert (og ikke står som informativ, for eksempel en kilde
-- som ikke svarte), avsluttes som `ikke_funnet_igjen`; i det faglige sporet
-- merkes den bare, et utført nytt grunnlag regnes da som kontrollert, og et
-- nyere kildeinnhold finnes ikke lenger i kilden.
create or replace function public.registrer_kildeovervaking(melding jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  er_prove boolean := coalesce((melding ->> 'prove')::boolean, false);
  kjoring bigint;
  f jsonb;
  inn jsonb;
  forrige public.kildefunn;
  fantes boolean;
  ny bigint;
  nye integer := 0;
  endrede integer := 0;
  borte integer := 0;
  avsluttede integer := 0;
  kjorte text[];
  sett text[];
  rad public.kildefunn;
  t public.kildefunn_tiltak;
begin
  if jsonb_typeof(melding -> 'funn') is distinct from 'array' then
    raise exception 'Meldingen mangler funnene.' using errcode = '22023';
  end if;

  insert into public.kildeovervaking_kjoringer (kjort_kl, utlost, prove, grunnlag, feil, informative, lenke)
  values (
    (melding ->> 'kjort_kl')::timestamptz,
    melding ->> 'utlost',
    er_prove,
    melding -> 'grunnlag',
    coalesce(melding -> 'feil', '[]'::jsonb),
    coalesce(melding -> 'informative', '[]'::jsonb),
    nullif(melding ->> 'lenke', '')
  )
  returning id into kjoring;

  for f in select x from jsonb_array_elements(melding -> 'funn') x loop
    inn := f -> 'innhold';
    if jsonb_typeof(inn) is distinct from 'object' then
      raise exception 'Et funn mangler innholdet.' using errcode = '22023';
    end if;
    select * into forrige from public.kildefunn k
    where k.funn = inn ->> 'id' and k.prove = er_prove
    order by k.id desc limit 1
    for update;
    fantes := found;

    if fantes and not er_prove and forrige.tilstand <> 'avsluttet' then
      if forrige.avtrykk = f ->> 'avtrykk' then
        update public.kildefunn k
        set sist_sett_kjoring = kjoring, borte_kjoring = null, innhold = inn, etikett = inn ->> 'etikett'
        where k.id = forrige.id;
      else
        update public.kildefunn k
        set avtrykk = f ->> 'avtrykk', innhold = inn, etikett = inn ->> 'etikett', art = inn ->> 'art', prioritet = inn ->> 'prioritet',
            sist_sett_kjoring = kjoring, borte_kjoring = null, versjon = k.versjon + 1, endret_kl = now(),
            tilstand = case k.tilstand when 'uavklart' then 'teknisk_utredning' when 'beslutning' then 'faglig_gjennomgang' else k.tilstand end,
            sporsmal = case when k.tilstand = 'beslutning' then null else k.sporsmal end,
            valg = case when k.tilstand = 'beslutning' then null else k.valg end,
            valg_merknad = case when k.tilstand = 'beslutning' then null else k.valg_merknad end,
            valg_av = case when k.tilstand = 'beslutning' then null else k.valg_av end,
            valg_kl = case when k.tilstand = 'beslutning' then null else k.valg_kl end,
            konklusjon = case when k.tilstand in ('teknisk_utredning', 'uavklart') then null else k.konklusjon end,
            konklusjon_kl = case when k.tilstand in ('teknisk_utredning', 'uavklart') then null else k.konklusjon_kl end,
            konklusjon_tekst = case when k.tilstand in ('teknisk_utredning', 'uavklart') then null else k.konklusjon_tekst end,
            nytt_innhold_kl = case when k.tilstand in ('teknisk_utredning', 'uavklart') then null else now() end
        where k.id = forrige.id;
        perform intern.kildesak_hendelse(forrige.id, 'nytt_innhold', forrige.tilstand,
          (select k.tilstand from public.kildefunn k where k.id = forrige.id), null, null,
          jsonb_build_object('kjoring', kjoring, 'avtrykk_for', forrige.avtrykk, 'avtrykk', f ->> 'avtrykk', 'innhold_for', forrige.innhold, 'konklusjon_for', forrige.konklusjon)
          || case when forrige.tilstand = 'beslutning' then jsonb_build_object(
               'sporsmal_tilbaketrukket', forrige.sporsmal,
               'valg_for', case when forrige.valg is null then null else jsonb_build_object('valg', forrige.valg, 'merknad', forrige.valg_merknad, 'av', forrige.valg_av, 'kl', forrige.valg_kl) end)
             else '{}'::jsonb end);
        endrede := endrede + 1;
      end if;
    elsif fantes and not er_prove and forrige.avtrykk = f ->> 'avtrykk'
          and forrige.utfall in ('teknisk_avklart', 'tiltak_kontrollert', 'tidligere_beslutning') then
      -- Det samme innholdet som en avsluttet sak dekker: konklusjonen eller beslutningen gjelder fortsatt.
      update public.kildefunn k set sist_sett_kjoring = kjoring where k.id = forrige.id;
    else
      if fantes and er_prove and forrige.tilstand <> 'avsluttet' then
        perform intern.kildesak_avslutt(forrige.id, 'avlost', null, null, jsonb_build_object('kjoring', kjoring, 'grunn', 'En ny prøvekjøring avløste prøven.'));
      end if;
      insert into public.kildefunn (funn, avtrykk, kilde, art, prioritet, prove, etikett, innhold, forste_kjoring, sist_sett_kjoring, erstatter)
      values (
        inn ->> 'id', f ->> 'avtrykk', inn ->> 'kilde', inn ->> 'art', inn ->> 'prioritet', er_prove, inn ->> 'etikett', inn, kjoring, kjoring,
        case when fantes and not exists (select 1 from public.kildefunn e where e.erstatter = forrige.id) then forrige.id end
      )
      returning id into ny;
      perform intern.kildesak_hendelse(ny, 'opprettet', null, 'teknisk_utredning', null, null, jsonb_build_object('kjoring', kjoring, 'avtrykk', f ->> 'avtrykk'));
      nye := nye + 1;
    end if;
  end loop;

  if not er_prove then
    -- Bare deler som faktisk kontrollerte noe, og bare nøkler som ikke står som funn eller informative.
    select coalesce(array_agg(g ->> 'kilde'), '{}') into kjorte
    from jsonb_array_elements(melding -> 'grunnlag') g
    where (g ->> 'kjort')::boolean and coalesce((g ->> 'kontrollert')::integer, 0) > 0;
    select coalesce(array_agg(x), '{}') into sett from (
      select x -> 'innhold' ->> 'id' as x from jsonb_array_elements(melding -> 'funn') x
      union select i ->> 'id' from jsonb_array_elements(coalesce(melding -> 'informative', '[]'::jsonb)) i
    ) s;

    for rad in
      select * from public.kildefunn k
      where not k.prove and k.tilstand <> 'avsluttet' and k.kilde = any (kjorte) and not (k.funn = any (sett))
      order by k.id
      for update
    loop
      borte := borte + 1;
      update public.kildefunn k set borte_kjoring = coalesce(k.borte_kjoring, kjoring) where k.id = rad.id;
      if rad.tilstand in ('teknisk_utredning', 'uavklart') and rad.alvor = 'faglig' then
        perform intern.kildesak_avslutt(rad.id, 'ikke_funnet_igjen', null, null, jsonb_build_object(
          'kjoring', kjoring,
          'grunn', 'Delen ble kontrollert uten avvik for denne nøkkelen: kilden stemmer igjen med grunnlaget reglene ble kontrollert mot.'));
        avsluttede := avsluttede + 1;
      else
        -- Kilden stemmer igjen med det kontrollerte grunnlaget, så et nyere innhold finnes ikke lenger i kilden.
        if rad.borte_kjoring is null or rad.nytt_innhold_kl is not null then
          perform intern.kildesak_hendelse(rad.id, 'borte', rad.tilstand, rad.tilstand, null, null,
            jsonb_build_object('kjoring', kjoring, 'nytt_innhold_kl_for', rad.nytt_innhold_kl));
        end if;
        update public.kildefunn k set nytt_innhold_kl = null where k.id = rad.id;
        for t in select * from public.kildefunn_tiltak x where x.funn = rad.id and x.art = 'nytt_grunnlag' and x.status = 'utfort' for update loop
          update public.kildefunn_tiltak x
          set status = 'kontrollert', endret_kl = now(), endret_av = null, endret_agent = 'Kildeovervåkingen',
              bevis = format('Kildekontrollen (kjøring %s) fant kilden i samsvar med det nye grunnlaget.', kjoring)
          where x.id = t.id;
          perform intern.kildesak_hendelse(rad.id, 'tiltak', 'utfort', 'kontrollert', null, 'Kildeovervåkingen', jsonb_build_object('tiltak', t.id, 'kjoring', kjoring));
        end loop;
        if intern.kildesak_ferdig(rad.id, null, 'Kildeovervåkingen') then
          avsluttede := avsluttede + 1;
        end if;
      end if;
    end loop;
  end if;

  return jsonb_build_object(
    'kjoring', kjoring,
    'nye', nye,
    'endrede', endrede,
    'borte', borte,
    'avsluttede', avsluttede,
    'apne', (select count(*) from public.kildefunn k where k.tilstand <> 'avsluttet')
  );
end;
$$;

-- --- Agentens arbeid (gjennom arbeidsflyten og serverendepunktet) --------------------

-- Saken for agenten, låst, i versjonen agenten leste; ellers avvist.
create function intern.kildesak_for_agent(sak bigint, versjon integer, agent text)
returns public.kildefunn
language plpgsql
set search_path = ''
as $$
declare
  rad public.kildefunn;
begin
  if not intern.kildesak_tekst(agent, 2, 200) then
    raise exception 'Oppgi hvem som har gjort arbeidet (2–200 tegn).' using errcode = '22023';
  end if;
  select * into rad from public.kildefunn k where k.id = sak for update;
  if not found then
    raise exception 'Sak nr. % finnes ikke.', sak using errcode = '55000';
  elsif rad.tilstand = 'avsluttet' then
    raise exception 'Sak nr. % er avsluttet. Ingenting er endret.', sak using errcode = '55000';
  elsif rad.versjon <> versjon then
    raise exception 'Sak nr. % er endret siden versjon % (nå %); les den på nytt. Ingenting er endret.', sak, versjon, rad.versjon using errcode = '55000';
  end if;
  return rad;
end;
$$;

-- Den tekniske konklusjonen, med begrunnelse og bevis.
--
-- - `uten_faglig_betydning` avslutter saken teknisk. Det gjelder bare et
--   endret kildedokument, aldri en prøve, en fjernet eller utilgjengelig kilde,
--   FEST eller Psychiatrienet, og krever bevis med et sammenlignbart grunnlag:
--   metoden (aldri en kontrollsum alene), hva som ble sammenlignet, grunnlaget
--   og hvor kontrollen kan etterprøves.
-- - `uavklart`: teknisk undersøkt, men det kan ikke fastslås hva som er endret.
--   Saken står i det tekniske sporet.
-- - `faglig_relevant`: klinisk relevant innhold kan være endret; agenten
--   utarbeider kilde- og konsekvensvurdering (`faglig_gjennomgang`).
-- - `mulig_alvorlig_risiko`: som `faglig_relevant`, men redaktøren ser saken
--   straks som sikkerhetsproblem. Kan også gis for en sak som allerede er i det
--   faglige sporet, og begrunnelsen er da det redaktøren leser.
create function public.kildesak_teknisk_konklusjon(funn bigint, versjon integer, konklusjon text, begrunnelse text, bevis jsonb, agent text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad public.kildefunn := intern.kildesak_for_agent(kildesak_teknisk_konklusjon.funn, kildesak_teknisk_konklusjon.versjon, kildesak_teknisk_konklusjon.agent);
  k text := kildesak_teknisk_konklusjon.konklusjon;
  b jsonb := kildesak_teknisk_konklusjon.bevis;
  til text;
begin
  if k is null or k not in ('uten_faglig_betydning', 'uavklart', 'faglig_relevant', 'mulig_alvorlig_risiko', 'dekket_av_beslutning') then
    raise exception 'Ukjent konklusjon; bruk uten_faglig_betydning, uavklart, faglig_relevant, mulig_alvorlig_risiko eller dekket_av_beslutning.' using errcode = '22023';
  end if;
  if begrunnelse is null or char_length(btrim(begrunnelse)) not between 10 and 5000 then
    raise exception 'Begrunnelsen må ha 10–5000 tegn.' using errcode = '22023';
  end if;
  if b is not null and jsonb_typeof(b) <> 'object' then
    raise exception 'Beviset må være et objekt.' using errcode = '22023';
  end if;
  if rad.tilstand not in ('teknisk_utredning', 'uavklart') and k not in ('faglig_relevant', 'mulig_alvorlig_risiko', 'dekket_av_beslutning') then
    raise exception 'Sak nr. % er allerede i det faglige sporet; den kan bare bekreftes som faglig relevant, løftes som mulig alvorlig risiko eller, under oppfølging, avgjøres som dekket av beslutningen.', rad.id using errcode = '55000';
  end if;
  if k = 'dekket_av_beslutning' then
    if rad.tilstand <> 'oppfolging' or rad.nytt_innhold_kl is null then
      raise exception 'Dekket av beslutningen gjelder bare nytt kildeinnhold i en sak under oppfølging.' using errcode = '55000';
    end if;
    if b is null or b ->> 'kontroll' is null or char_length(btrim(b ->> 'kontroll')) not between 5 and 500 then
      raise exception 'Dekket av beslutningen krever bevis med hvor vurderingen kan etterprøves (kontroll).' using errcode = '22023';
    end if;
  end if;

  if k = 'uten_faglig_betydning' then
    if rad.prove or rad.kilde <> 'dokument' or rad.art <> 'endret' then
      raise exception 'Bare et endret kildedokument kan avsluttes teknisk; en prøve, en kilde som er borte eller ikke svarer, FEST og Psychiatrienet krever faglig vurdering.' using errcode = '55000';
    end if;
    if b is null
       or (b ->> 'metode') is null or (b ->> 'metode') not in ('avsnittsavtrykk', 'kildeversjon', 'manuell_sammenligning')
       or b ->> 'sammenlignet' is null or char_length(btrim(b ->> 'sammenlignet')) not between 20 and 2000
       or b ->> 'grunnlag' is null or char_length(btrim(b ->> 'grunnlag')) not between 5 and 1000
       or b ->> 'kontroll' is null or char_length(btrim(b ->> 'kontroll')) not between 5 and 500 then
      raise exception 'Uten faglig betydning krever bevis: metode (avsnittsavtrykk, kildeversjon eller manuell_sammenligning, aldri en kontrollsum alene), sammenlignet, grunnlag og kontroll.' using errcode = '22023';
    end if;
  end if;
  if k = 'mulig_alvorlig_risiko' and not intern.kildesak_tekst(begrunnelse, 10, 2000) then
    raise exception 'Begrunnelsen for en mulig alvorlig risiko vises for redaktøren: 10–2000 tegn uten kontrollsummer.' using errcode = '22023';
  end if;

  -- Et mulig sikkerhetsproblem under oppfølging gjør saken til et sikkerhetsproblem
  -- under faglig vurdering igjen: beslutningen som følges opp, gjaldt ikke det,
  -- og saken skal verken avsluttes eller bli liggende uten prikk.
  til := case
    when k = 'uten_faglig_betydning' then 'avsluttet'
    when k = 'uavklart' then 'uavklart'
    when rad.tilstand in ('teknisk_utredning', 'uavklart') then 'faglig_gjennomgang'
    when k = 'mulig_alvorlig_risiko' and rad.tilstand = 'oppfolging' then 'faglig_gjennomgang'
    else rad.tilstand
  end;

  update public.kildefunn x
  set konklusjon = k, konklusjon_kl = now(), konklusjon_tekst = btrim(begrunnelse),
      alvor = case when k = 'mulig_alvorlig_risiko' then 'sikkerhet' else x.alvor end,
      tilstand = case when til = 'avsluttet' then x.tilstand else til end,
      -- Tilbake fra oppfølging: spørsmålet og beslutningen står i hendelsene, tiltakene står.
      sporsmal = case when x.tilstand = 'oppfolging' and til = 'faglig_gjennomgang' then null else x.sporsmal end,
      valg = case when x.tilstand = 'oppfolging' and til = 'faglig_gjennomgang' then null else x.valg end,
      valg_merknad = case when x.tilstand = 'oppfolging' and til = 'faglig_gjennomgang' then null else x.valg_merknad end,
      valg_av = case when x.tilstand = 'oppfolging' and til = 'faglig_gjennomgang' then null else x.valg_av end,
      valg_kl = case when x.tilstand = 'oppfolging' and til = 'faglig_gjennomgang' then null else x.valg_kl end,
      -- Under oppfølging er nytt innhold bare vurdert med en eksplisitt avgjørelse om dekning (eller et nytt spørsmål).
      nytt_innhold_kl = case when x.tilstand = 'oppfolging' and k <> 'dekket_av_beslutning' then x.nytt_innhold_kl end,
      versjon = x.versjon + 1, endret_kl = now()
  where x.id = rad.id;
  perform intern.kildesak_hendelse(rad.id, 'teknisk_konklusjon', rad.tilstand, til, null, btrim(agent),
    jsonb_build_object('konklusjon', k, 'begrunnelse', btrim(begrunnelse), 'bevis', b, 'avtrykk', rad.avtrykk)
    || case when rad.tilstand = 'oppfolging' and til = 'faglig_gjennomgang' then jsonb_build_object(
         'sporsmal_tilbaketrukket', rad.sporsmal,
         'valg_for', jsonb_build_object('valg', rad.valg, 'merknad', rad.valg_merknad, 'av', rad.valg_av, 'kl', rad.valg_kl))
       else '{}'::jsonb end);
  if til = 'avsluttet' then
    perform intern.kildesak_avslutt(rad.id, 'teknisk_avklart', null, btrim(agent), jsonb_build_object('bevis', b));
  elsif k = 'dekket_av_beslutning' then
    -- Det nye innholdet er vurdert og dekket av beslutningen; er tiltakene allerede kontrollert, er saken ferdig.
    perform intern.kildesak_ferdig(rad.id, null, btrim(agent));
  end if;
  return (select x.versjon from public.kildefunn x where x.id = rad.id);
end;
$$;

-- Det konkrete faglige spørsmålet til redaktøren, etter faglig gjennomgang
-- (og uavhengig kontroll der det trengs). Kan erstattes mens saken venter på
-- beslutning; da gjelder ikke en tidligere `utsett`. Har kilden fått nytt
-- innhold mens beslutningen følges opp, kan et nytt spørsmål legges frem; de
-- bestilte og utførte tiltakene står, og den nye beslutningen kommer i tillegg.
create function public.kildesak_faglig_sporsmal(funn bigint, versjon integer, sporsmal jsonb, agent text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad public.kildefunn := intern.kildesak_for_agent(kildesak_faglig_sporsmal.funn, kildesak_faglig_sporsmal.versjon, kildesak_faglig_sporsmal.agent);
  s jsonb;
begin
  if not (rad.tilstand in ('faglig_gjennomgang', 'beslutning') or (rad.tilstand = 'oppfolging' and rad.nytt_innhold_kl is not null)) then
    raise exception 'Sak nr. % må ha en teknisk konklusjon om faglig relevans (eller nytt kildeinnhold under oppfølging) før et spørsmål legges frem for redaktøren.', rad.id using errcode = '55000';
  end if;
  s := intern.kildesak_sporsmal(rad, sporsmal);
  update public.kildefunn x
  set sporsmal = s, tilstand = 'beslutning', valg = null, valg_merknad = null, valg_av = null, valg_kl = null,
      nytt_innhold_kl = null, versjon = x.versjon + 1, endret_kl = now()
  where x.id = rad.id;
  perform intern.kildesak_hendelse(rad.id, 'faglig_sporsmal', rad.tilstand, 'beslutning', null, btrim(agent),
    jsonb_build_object('sporsmal', s, 'erstattet', rad.sporsmal));
  return rad.versjon + 1;
end;
$$;

-- Et kort varsel på akkurat de berørte reglene i verktøyene, eller `null` for
-- å fjerne det. Bare i det faglige sporet, aldri for en prøve eller en ren
-- kontrollsumendring.
create function public.kildesak_brukervarsel(funn bigint, versjon integer, tekst text, regler jsonb, agent text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad public.kildefunn := intern.kildesak_for_agent(kildesak_brukervarsel.funn, kildesak_brukervarsel.versjon, kildesak_brukervarsel.agent);
  varsel jsonb;
begin
  if rad.prove or rad.tilstand not in ('faglig_gjennomgang', 'beslutning', 'oppfolging') then
    raise exception 'Et varsel i verktøyene kan bare settes for en reell sak i det faglige sporet.' using errcode = '55000';
  end if;
  if tekst is not null then
    if not intern.kildesak_tekst(tekst, 10, 300) then
      raise exception 'Varselet må ha 10–300 tegn og ingen kontrollsum.' using errcode = '22023';
    end if;
    if jsonb_typeof(regler) is distinct from 'array' or jsonb_array_length(regler) = 0
       or exists (
         select 1 from jsonb_array_elements(regler) r
         where jsonb_typeof(r -> 'versjon') is distinct from 'number' or not exists (
           select 1 from jsonb_array_elements(coalesce(rad.innhold -> 'berorte', '[]'::jsonb)) g
           where g ->> 'regel' = r ->> 'regel' and (g ->> 'versjon')::integer = (r ->> 'versjon')::integer)
       ) then
      raise exception 'Varselet må gjelde én eller flere regelversjoner saken faktisk berører.' using errcode = '22023';
    end if;
    varsel := jsonb_build_object(
      'tekst', btrim(tekst),
      'regler', (select jsonb_agg(distinct jsonb_build_object('regel', r ->> 'regel', 'versjon', (r ->> 'versjon')::integer)) from jsonb_array_elements(regler) r),
      'kl', now());
  end if;
  update public.kildefunn x set brukervarsel = varsel, versjon = x.versjon + 1, endret_kl = now() where x.id = rad.id;
  perform intern.kildesak_hendelse(rad.id, 'brukervarsel', rad.tilstand, rad.tilstand, null, btrim(agent), jsonb_build_object('varsel', varsel, 'forrige', rad.brukervarsel));
  return rad.versjon + 1;
end;
$$;

-- Et tiltak er påbegynt, utført, kontrollert eller stoppet. Kontrollert kan
-- bare følge utført; utført, kontrollert og stoppet krever bevis. Når hvert
-- tiltak er kontrollert, avsluttes saken. Som de andre agentoppgavene tar det
-- sakens versjon, så en forsinket oppgave aldri overskriver en nyere status.
create function public.kildesak_tiltak(tiltak bigint, versjon integer, status text, bevis text, lenke text, agent text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  t public.kildefunn_tiltak;
  sak bigint;
  rad public.kildefunn;
  ny text := kildesak_tiltak.status;
begin
  select x.funn into sak from public.kildefunn_tiltak x where x.id = kildesak_tiltak.tiltak;
  if not found then
    raise exception 'Tiltak nr. % finnes ikke.', kildesak_tiltak.tiltak using errcode = '55000';
  end if;
  -- Saken låses først, som i beslutningen, og versjonen må være den agenten leste.
  rad := intern.kildesak_for_agent(sak, kildesak_tiltak.versjon, kildesak_tiltak.agent);
  if rad.tilstand <> 'oppfolging' then
    raise exception 'Saken til tiltak nr. % følges ikke opp lenger.', kildesak_tiltak.tiltak using errcode = '55000';
  end if;
  select * into t from public.kildefunn_tiltak x where x.id = kildesak_tiltak.tiltak for update;
  if ny is null or ny not in ('pagar', 'utfort', 'kontrollert', 'feilet')
     or t.status = 'kontrollert'
     or (ny = 'kontrollert' and t.status <> 'utfort')
     or ny = t.status then
    raise exception 'Tiltak nr. % kan ikke gå fra % til %.', t.id, t.status, coalesce(ny, '–') using errcode = '55000';
  end if;
  update public.kildefunn_tiltak x
  set status = ny, bevis = coalesce(nullif(btrim(kildesak_tiltak.bevis), ''), x.bevis), lenke = coalesce(nullif(btrim(kildesak_tiltak.lenke), ''), x.lenke),
      endret_kl = now(), endret_av = null, endret_agent = btrim(agent)
  where x.id = t.id;
  update public.kildefunn k set versjon = k.versjon + 1, endret_kl = now() where k.id = t.funn;
  perform intern.kildesak_hendelse(t.funn, 'tiltak', t.status, ny, null, btrim(agent),
    jsonb_build_object('tiltak', t.id, 'art', t.art, 'bevis', kildesak_tiltak.bevis, 'lenke', kildesak_tiltak.lenke));
  perform intern.kildesak_ferdig(t.funn, null, btrim(agent));
  return ny;
end;
$$;

-- Avslutter en syntetisk prøve med testbeviset, aldri med en fiktiv klinisk beslutning.
create function public.kildesak_avslutt_prove(funn bigint, versjon integer, bevis text, agent text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad public.kildefunn := intern.kildesak_for_agent(kildesak_avslutt_prove.funn, kildesak_avslutt_prove.versjon, kildesak_avslutt_prove.agent);
begin
  if not rad.prove then
    raise exception 'Sak nr. % er ikke en prøve.', rad.id using errcode = '55000';
  end if;
  if bevis is null or char_length(btrim(bevis)) not between 10 and 5000 then
    raise exception 'Testbeviset må ha 10–5000 tegn.' using errcode = '22023';
  end if;
  update public.kildefunn_tiltak t
  set status = 'kontrollert', bevis = 'Prøven er avsluttet; tiltaket var en del av prøven.', endret_kl = now(), endret_agent = btrim(agent)
  where t.funn = rad.id and t.status <> 'kontrollert';
  perform intern.kildesak_avslutt(rad.id, 'prove', null, btrim(agent), jsonb_build_object('bevis', btrim(bevis)));
  return rad.versjon + 1;
end;
$$;

-- --- Det en administrator ser og gjør i appen ----------------------------------------

-- Redaktørvisningen (`les_fagsaker` i `fagsak.ts`): bare faglige saker, og det
-- tekniske sporet i én tilstand.
create function public.les_fagsaker()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  siste public.kildeovervaking_kjoringer;
begin
  if not public.er_admin() then
    raise exception 'Bare administratorer kan se kildesakene.' using errcode = '42501';
  end if;
  select * into siste from public.kildeovervaking_kjoringer j where not j.prove order by j.id desc limit 1;
  return jsonb_build_object(
    'saker', (
      select coalesce(jsonb_agg(intern.kildesak_fagsak(k) order by k.id desc), '[]'::jsonb)
      from (
        select * from public.kildefunn a
        where a.tilstand in ('beslutning', 'oppfolging') or (a.tilstand = 'faglig_gjennomgang' and a.alvor = 'sikkerhet')
        union all
        (select * from public.kildefunn b
         where b.tilstand = 'avsluttet' and b.sporsmal is not null and b.utfall in ('tiltak_kontrollert', 'prove')
         order by b.avsluttet_kl desc, b.id desc limit 20)
      ) k
    ),
    'teknisk', case
      when siste.id is null or jsonb_array_length(siste.feil) > 0 or siste.kjort_kl < now() - interval '8 days' then 'ukjent'
      when exists (
        select 1 from public.kildefunn k
        where not k.prove and k.tilstand <> 'avsluttet' and (k.tilstand in ('teknisk_utredning', 'uavklart', 'faglig_gjennomgang') or k.nytt_innhold_kl is not null)
      ) then 'oppfolging'
      else 'normal'
    end,
    'sist_kontrollert_kl', siste.kjort_kl
  );
end;
$$;

-- Redaktørens beslutning på saken i versjonen redaktøren så. En eldre versjon
-- gir `endret` uten at noe skjer. Beslutningen bestiller tiltakene valget
-- innebærer; `deaktiver` setter nødstoppen for hver berørt regel straks, med
-- den eksisterende nødstoppen, og tiltaket står da som kontrollert.
create function public.beslutt_fagsak(sak bigint, versjon integer, valg text, merknad text default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad public.kildefunn;
  v text := beslutt_fagsak.valg;
  m text := nullif(btrim(coalesce(beslutt_fagsak.merknad, '')), '');
  b jsonb;
  sperren uuid;
  til text;
begin
  if not public.er_admin() then
    raise exception 'Bare administratorer kan ta stilling til kildesakene.' using errcode = '42501';
  end if;
  select * into rad from public.kildefunn k where k.id = beslutt_fagsak.sak for update;
  if not found then
    raise exception 'Saken finnes ikke.' using errcode = '55000';
  end if;
  if rad.versjon <> beslutt_fagsak.versjon then
    return 'endret';
  end if;
  if rad.tilstand <> 'beslutning' or rad.sporsmal is null or rad.nytt_innhold_kl is not null then
    raise exception 'Saken venter ikke på en beslutning. Hent sakene på nytt.' using errcode = '55000';
  end if;
  if v is null or not exists (select 1 from jsonb_array_elements(rad.sporsmal -> 'valg') x where x ->> 'valg' = v) then
    raise exception 'Valget tilbys ikke i denne saken.' using errcode = '22023';
  end if;
  if m is not null and char_length(m) > 2000 then
    raise exception 'Merknaden kan ha høyst 2000 tegn.' using errcode = '22023';
  end if;

  til := case when v = 'utsett' then 'beslutning' else 'oppfolging' end;
  update public.kildefunn k
  set valg = v, valg_merknad = m, valg_av = (select auth.uid()), valg_kl = now(), tilstand = til, versjon = k.versjon + 1, endret_kl = now()
  where k.id = rad.id;
  perform intern.kildesak_hendelse(rad.id, 'beslutning', rad.tilstand, til, (select auth.uid()), null,
    jsonb_build_object('valg', v, 'merknad', m, 'sporsmal', rad.sporsmal));

  if v = 'behold' then
    insert into public.kildefunn_tiltak (funn, art) values (rad.id, 'nytt_grunnlag');
  elsif v = 'revider' then
    insert into public.kildefunn_tiltak (funn, art) values (rad.id, 'ny_regelversjon');
  elsif v = 'deaktiver' then
    for b in select x from jsonb_array_elements(rad.sporsmal -> 'berorte') x loop
      select s.id into sperren from public.verktoysperrer s where s.omfang = 'regel' and s.mal = b ->> 'regel' and s.opphevet_kl is null;
      if not found then
        insert into public.verktoysperrer (omfang, mal, grunn, satt_av)
        values ('regel', b ->> 'regel', left(format('Kildesak nr. %s: %s', rad.id, rad.sporsmal ->> 'tittel'), 500), (select auth.uid()))
        returning id into sperren;
      end if;
      insert into public.kildefunn_tiltak (funn, art, regel, sperre, status, bevis, endret_av)
      values (rad.id, 'sperre', b ->> 'regel', sperren, 'kontrollert', 'Nødstoppen for regelen er aktiv.', (select auth.uid()));
    end loop;
    perform intern.kildesak_ferdig(rad.id, (select auth.uid()), null);
  end if;
  return 'registrert';
end;
$$;

-- De tekniske detaljene, for kontrollører og teknisk ansvarlig (som før, med
-- tilstand, konklusjon, tiltak og hendelser). Bare administratorer.
create or replace function public.les_kildeovervaking(historikk integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  antall integer := least(greatest(coalesce(historikk, 0), 0), 200);
begin
  if not public.er_admin() then
    raise exception 'Bare administratorer kan se kildeovervåkingen.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'funn', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', k.id,
          'funn', k.funn,
          'kilde', k.kilde,
          'art', k.art,
          'prioritet', k.prioritet,
          'prove', k.prove,
          'etikett', k.etikett,
          'detaljer', coalesce(k.innhold -> 'detaljer', '[]'::jsonb),
          'berorte', coalesce(k.innhold -> 'berorte', '[]'::jsonb),
          'opprettet_kl', k.opprettet_kl,
          'sist_sett_kl', (select j.kjort_kl from public.kildeovervaking_kjoringer j where j.id = k.sist_sett_kjoring),
          'borte_kl', (select j.kjort_kl from public.kildeovervaking_kjoringer j where j.id = k.borte_kjoring),
          'erstatter', k.erstatter,
          'tilstand', k.tilstand,
          'versjon', k.versjon,
          'alvor', k.alvor,
          'konklusjon', k.konklusjon,
          'konklusjon_tekst', k.konklusjon_tekst,
          'konklusjon_kl', k.konklusjon_kl,
          'nytt_innhold_kl', k.nytt_innhold_kl,
          'utfall', k.utfall,
          'avsluttet_kl', k.avsluttet_kl,
          'teknisk_vurdering', k.teknisk_vurdering,
          'teknisk_av', coalesce(intern.profilnavn(k.teknisk_av), k.teknisk_agent),
          'beslutning', k.beslutning,
          'beslutning_av', intern.profilnavn(k.beslutning_av),
          'tiltak', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'art', t.art, 'regel', t.regel, 'status', t.status, 'lenke', t.lenke, 'bevis', t.bevis, 'endret_kl', t.endret_kl) order by t.id), '[]'::jsonb)
                     from public.kildefunn_tiltak t where t.funn = k.id),
          'hendelser', (select coalesce(jsonb_agg(jsonb_build_object('kl', h.kl, 'art', h.art, 'fra', h.fra, 'til', h.til, 'av', coalesce(intern.profilnavn(h.av), h.agent)) order by h.id), '[]'::jsonb)
                        from public.kildefunn_hendelser h where h.funn = k.id)
        ) order by k.id desc), '[]'::jsonb)
      from (
        select * from public.kildefunn a where a.tilstand <> 'avsluttet'
        union all
        (select * from public.kildefunn b where b.tilstand = 'avsluttet' order by b.id desc limit antall)
      ) k
    ),
    'kjoringer', (
      select coalesce(jsonb_agg(intern.kildeovervaking_kjoring(j) order by j.id desc), '[]'::jsonb)
      from public.kildeovervaking_kjoringer j
      where j.id in (select x.id from public.kildeovervaking_kjoringer x order by x.id desc limit antall)
    ),
    'siste', (
      select intern.kildeovervaking_kjoring(j)
      from public.kildeovervaking_kjoringer j
      where not j.prove
      order by j.id desc
      limit 1
    )
  );
end;
$$;

-- --- Det klinikerne ser i verktøyene --------------------------------------------------

-- Varslene på akkurat de berørte regelversjonene, for alle innloggede. Bare
-- reelle saker i det faglige sporet; et varsel sperrer ingenting.
create function public.les_regelvarsler()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('regel', r ->> 'regel', 'versjon', (r ->> 'versjon')::integer, 'tekst', k.brukervarsel ->> 'tekst', 'siden', k.brukervarsel ->> 'kl') order by k.id, r ->> 'regel'), '[]'::jsonb)
  from public.kildefunn k, jsonb_array_elements(k.brukervarsel -> 'regler') r
  where (select auth.uid()) is not null
    and not k.prove and k.brukervarsel is not null and k.tilstand in ('faglig_gjennomgang', 'beslutning', 'oppfolging')
$$;

-- --- Det som erstattes ----------------------------------------------------------------

-- Fritekstvurderingene og fritekstavslutningen fra P12.1 erstattes av
-- konklusjonen med bevis og beslutningen med tiltak. Kolonnene og tekstene står.
drop function public.vurder_kildefunn(bigint, text);
drop function public.beslutt_kildefunn(bigint, text);
drop function public.kildefunn_teknisk_fra_agent(bigint, text, text);

comment on function public.kildesak_teknisk_konklusjon(bigint, integer, text, text, jsonb, text) is
  'Den tekniske konklusjonen med begrunnelse og bevis fra en agent, gjennom arbeidsflyten. Bare for serverendepunktet.';
comment on function public.kildesak_faglig_sporsmal(bigint, integer, jsonb, text) is
  'Det konkrete faglige spørsmålet til redaktøren, med valg og konsekvenser. Bare for serverendepunktet.';
comment on function public.kildesak_brukervarsel(bigint, integer, text, jsonb, text) is
  'Et kort varsel på de berørte regelversjonene i verktøyene, eller null for å fjerne det. Bare for serverendepunktet.';
comment on function public.kildesak_tiltak(bigint, integer, text, text, text, text) is
  'Et tiltak er påbegynt, utført, kontrollert eller stoppet, med bevis. Bare for serverendepunktet.';
comment on function public.kildesak_avslutt_prove(bigint, integer, text, text) is
  'Avslutter en syntetisk prøve med testbeviset. Bare for serverendepunktet.';
comment on function public.les_fagsaker() is
  'De faglige kildesakene og det tekniske sporet i én tilstand. Bare for administratorer.';
comment on function public.beslutt_fagsak(bigint, integer, text, text) is
  'Redaktørens beslutning i en kildesak; bestiller tiltakene, og setter nødstoppen ved deaktivering. Bare for administratorer.';
comment on function public.les_regelvarsler() is
  'Korte faglige varsler på berørte regelversjoner i verktøyene, for innloggede brukere.';

-- --- Rettigheter ---------------------------------------------------------------------

revoke all on function intern.kildesak_tekst(text, integer, integer) from public, anon, authenticated, service_role;
revoke all on function intern.kildesak_hendelse(bigint, text, text, text, uuid, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function intern.kildesak_avslutt(bigint, text, uuid, text, jsonb) from public, anon, authenticated, service_role;
revoke all on function intern.kildesak_ferdig(bigint, uuid, text) from public, anon, authenticated, service_role;
revoke all on function intern.kildesak_valgvirkning(text) from public, anon, authenticated, service_role;
revoke all on function intern.kildesak_tiltakstekst(text) from public, anon, authenticated, service_role;
revoke all on function intern.kildesak_sporsmal(public.kildefunn, jsonb) from public, anon, authenticated, service_role;
revoke all on function intern.kildesak_fagsak(public.kildefunn) from public, anon, authenticated, service_role;
revoke all on function intern.kildesak_for_agent(bigint, integer, text) from public, anon, authenticated, service_role;
revoke all on function public.kildesak_teknisk_konklusjon(bigint, integer, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.kildesak_faglig_sporsmal(bigint, integer, jsonb, text) from public, anon, authenticated;
revoke all on function public.kildesak_brukervarsel(bigint, integer, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.kildesak_tiltak(bigint, integer, text, text, text, text) from public, anon, authenticated;
revoke all on function public.kildesak_avslutt_prove(bigint, integer, text, text) from public, anon, authenticated;
revoke all on function public.les_fagsaker() from public, anon, authenticated, service_role;
revoke all on function public.beslutt_fagsak(bigint, integer, text, text) from public, anon, authenticated, service_role;
revoke all on function public.les_regelvarsler() from public, anon, authenticated, service_role;
grant execute on function public.kildesak_teknisk_konklusjon(bigint, integer, text, text, jsonb, text) to service_role;
grant execute on function public.kildesak_faglig_sporsmal(bigint, integer, jsonb, text) to service_role;
grant execute on function public.kildesak_brukervarsel(bigint, integer, text, jsonb, text) to service_role;
grant execute on function public.kildesak_tiltak(bigint, integer, text, text, text, text) to service_role;
grant execute on function public.kildesak_avslutt_prove(bigint, integer, text, text) to service_role;
grant execute on function public.les_fagsaker() to authenticated;
grant execute on function public.beslutt_fagsak(bigint, integer, text, text) to authenticated;
grant execute on function public.les_regelvarsler() to authenticated;
