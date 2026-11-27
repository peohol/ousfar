-- Personalkalenderen P2b, del 2: kalenderen (#616, docs/personal.md §8.7,
-- docs/personal-database.md).
--
-- Kalenderoppføringene med invariantene i databasen, kommandoene som
-- kontrollerer kalenderreglene på nytt, lesemodellen for fritak og
-- endringsloggen:
--
-- - **Én status per medarbeider og dato** (unik), **høyst én per dato** for en
--   status som er «én per dag», og **høyst bemanningsbehovet** for en annen
--   bemannet oppgave. En dato som alt var over grensen (fordi behovet er
--   senket etterpå), kan endres så lenge antallet ikke øker, som
--   `invariantErrors` i rules.ts. Grensene kontrolleres ved slutten av
--   transaksjonen, uansett vei inn.
-- - **Samtidighet:** hver endring låser datoen (`personal.dager`) før den leser
--   kalenderen, og hver celle har en revisjon. En kommando med en revisjon som
--   ikke lenger stemmer, avvises med `PT409`; ingen endring overskriver en
--   annen lydløst.
-- - **Fritaket** (personal.md §6.2) ses og endres bare med `manageExemption`.
--   Det har sin egen revisjon, så kalenderen, revisjonene og historikken er
--   like med og uten fritak for alle andre (K-TIL-4, K-DAT-1).
--
-- Nettleseren når ingenting her direkte, bare `public.personal_*`.

-- --- Datoene ------------------------------------------------------------------

-- Første påskedag (Meeus/Jones/Butcher), som `easterSunday` i dates.ts.
create function personal.paaskedag(aar integer)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  a constant integer := aar % 19;
  b constant integer := aar / 100;
  c constant integer := aar % 100;
  d constant integer := b / 4;
  e constant integer := b % 4;
  f constant integer := (b + 8) / 25;
  g constant integer := (b - f + 1) / 3;
  h constant integer := (19 * a + b - d - g + 15) % 30;
  i constant integer := c / 4;
  k constant integer := c % 4;
  l constant integer := (32 + 2 * e + 2 * i - h - k) % 7;
  m constant integer := (a + 11 * h + 22 * l) / 451;
begin
  return make_date(aar, (h + l - 7 * m + 114) / 31, (h + l - 7 * m + 114) % 31 + 1);
end;
$$;

-- Den norske helligdagen datoen er, eller null; som `holidayName` i dates.ts
-- (to helligdager samme dag gir den siste i lista, som der).
create function personal.helligdag(dato date, kalender text default 'no')
returns text
language sql
immutable
set search_path = ''
as $$
  select h.navn
  from (select extract(year from dato)::integer as aar, personal.paaskedag(extract(year from dato)::integer) as p) x
  cross join lateral (values
    (1, make_date(x.aar, 1, 1), 'Første nyttårsdag'),
    (2, x.p - 3, 'Skjærtorsdag'),
    (3, x.p - 2, 'Langfredag'),
    (4, x.p, 'Første påskedag'),
    (5, x.p + 1, 'Andre påskedag'),
    (6, make_date(x.aar, 5, 1), 'Arbeidernes dag'),
    (7, make_date(x.aar, 5, 17), 'Grunnlovsdagen'),
    (8, x.p + 39, 'Kristi himmelfartsdag'),
    (9, x.p + 49, 'Første pinsedag'),
    (10, x.p + 50, 'Andre pinsedag'),
    (11, make_date(x.aar, 12, 25), 'Første juledag'),
    (12, make_date(x.aar, 12, 26), 'Andre juledag')
  ) h (n, d, navn)
  where kalender = 'no' and h.d = dato
  order by h.n desc
  limit 1
$$;

-- --- Reglene for én dato (rules.ts og people.ts) --------------------------------

-- Arbeidskalenderen i reglene, med standarden når den mangler (`workCalendarOf`).
create function personal.arbeidskalender(regler jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(regler -> 'workCalendar', '{"weekdays": [true, true, true, true, true, false, false], "holidays": false}'::jsonb)
$$;

-- Hva datoen er etter arbeidskalenderen (`dayKind` for en aktiv medarbeider):
-- work, holiday, weekend eller nonWorkday.
create function personal.dagtype(regler jsonb, dato date)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when (k -> 'holidays') is distinct from 'true'::jsonb
      and personal.helligdag(dato, coalesce(k ->> 'holidayCalendar', 'no')) is not null then 'holiday'
    when (k -> 'weekdays' -> (extract(isodow from dato)::integer - 1)) = 'true'::jsonb then 'work'
    when extract(isodow from dato) >= 6 then 'weekend'
    else 'nonWorkday'
  end
  from (select personal.arbeidskalender(regler) as k) x
$$;

-- Statusen med ID-en i reglene, eller null.
create function personal.statusdef(regler jsonb, status text)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select s from jsonb_array_elements(regler -> 'statuses') with ordinality e (s, n)
  where s ->> 'id' = status order by n limit 1
$$;

-- Bemanningsbehovet for statusen på datoen (`requiredCount`).
create function personal.behov(regler jsonb, status text, dato date)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce((
    select case
      when (r -> 'onHolidays') is distinct from 'true'::jsonb
        and personal.helligdag(dato, coalesce(personal.arbeidskalender(regler) ->> 'holidayCalendar', 'no')) is not null then 0
      else coalesce((r -> 'perWeekday' ->> (extract(isodow from dato)::integer - 1))::integer, 0)
    end
    from jsonb_array_elements(regler -> 'staffing') with ordinality e (r, n)
    where r ->> 'statusId' = status order by n limit 1
  ), 0)
$$;

-- Høyeste antall med statusen på datoen (`staffingCap`): 1 for «én per dag»,
-- behovet for en annen bemannet oppgave, ellers ingen grense (null).
create function personal.tak(regler jsonb, status text, dato date)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case
    when (personal.statusdef(regler, status) -> 'uniquePerDay') = 'true'::jsonb then 1
    when exists (select 1 from jsonb_array_elements(regler -> 'staffing') r where r ->> 'statusId' = status)
      then personal.behov(regler, status, dato)
  end
$$;

-- Reglene som gjelder datoen i fagmiljøet (`rulesForDate`).
create function personal.regler_for(fagmiljo uuid, dato date)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select (personal.oppsett_for(regler_for.fagmiljo, regler_for.dato)).regler
$$;

-- --- Merknaden (privacy.ts) -----------------------------------------------------

-- Merknaden med mellomrommene slått sammen og uten mellomrom i endene, eller
-- null når den er tom (`checkNote(...).value`). Mellomrommene er JavaScripts `\s`.
create function personal.merknad(tekst text)
returns text
language sql
immutable
set search_path = ''
as $$
  select nullif(btrim(regexp_replace(coalesce(tekst, ''), '[\s   -     　﻿]+', ' ', 'g')), '')
$$;

-- Feilen i merknaden, eller null (`checkNote`): høyst 120 tegn (regnet som i
-- JavaScript), ingenting som ligner et fødselsnummer, og ingen ord som typisk
-- avslører fraværsgrunn eller helse.
create function personal.merknadsfeil(tekst text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v constant text := personal.merknad(tekst);
  bokstav constant text := '[[:alpha:]]';
begin
  if v is null then
    return null;
  end if;
  if char_length(v) + (select count(*) from regexp_matches(v, '[\U00010000-\U0010ffff]', 'g')) > 120 then
    return 'Merknaden kan være høyst 120 tegn.';
  end if;
  if personal.ligner_fodselsnummer(v) then
    return 'Merknaden ligner et fødselsnummer og kan ikke lagres.';
  end if;
  if v ~* replace(
    '(?<!B)(sykB*|B+syk(?:e|dom)B*|influensa|forkjølB*|feber|korona|covidB*|diagnosB*|lege(time|besøk)?|operasjonB*|gravidB*|svangerskapB*|begravelseB*|psykB*|innlagt|kreftB*|depresjB*|behandlingB*|terapiB*)(?!B)',
    'B', bokstav
  ) then
    return 'Merknaden ser ut til å beskrive fraværsgrunn eller helse. Skriv bare praktisk planleggingsinformasjon.';
  end if;
  return null;
end;
$$;

-- --- Tabellene --------------------------------------------------------------------

-- Revisjonene til cellene i kalenderen, og (for seg) til fritaket, så en
-- endring av fritaket ikke kan leses av revisjonene andre ser.
create sequence personal.revisjoner as bigint;
create sequence personal.fritaksrevisjoner as bigint;

-- Én rad per fagmiljø og dato som er endret: låsen alle endringer av datoen tar
-- før de leser kalenderen, så to endringer av samme dato prøves etter hverandre.
create table personal.dager (
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  dato date not null,
  endringer bigint not null default 1,
  primary key (fagmiljo_id, dato)
);

comment on table personal.dager is
  'Låsen per fagmiljø og dato i personalkalenderen (docs/personal-database.md). Uten innhold.';

-- Kalenderoppføringene (personal.md §8.7): én per medarbeider og dato, med
-- statusen, valgfritt tidsrom (minutter fra midnatt), merknaden, låsen, det
-- administrative fritaket, regelversjonen og revisjonene. Ingen årsak.
create table personal.oppforinger (
  id uuid primary key default gen_random_uuid(),
  fagmiljo_id uuid not null,
  medarbeider_id uuid not null,
  dato date not null,
  status_id text not null,
  fra_min smallint,
  til_min smallint,
  merknad text,
  laast boolean not null default false,
  fritak boolean not null default false,
  regelversjon integer not null,
  revisjon bigint not null default nextval('personal.revisjoner'),
  fritak_revisjon bigint not null default nextval('personal.fritaksrevisjoner'),
  endret_kl timestamptz not null default now(),
  endret_av uuid references public.profiles (id) on delete set null,
  constraint oppforinger_celle unique (medarbeider_id, dato),
  constraint oppforinger_medarbeider foreign key (medarbeider_id, fagmiljo_id) references personal.medarbeidere (id, fagmiljo_id),
  constraint oppforinger_regelversjon foreign key (fagmiljo_id, regelversjon) references personal.oppsett (fagmiljo_id, versjon),
  constraint oppforinger_status_form check (status_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(status_id) <= 40),
  constraint oppforinger_dato check (dato between '2000-01-01' and '2099-12-31'),
  constraint oppforinger_tid check (
    (fra_min is null) = (til_min is null) and (fra_min is null or (fra_min >= 0 and til_min <= 1440 and fra_min < til_min))
  ),
  constraint oppforinger_merknad check (merknad is null or (merknad = personal.merknad(merknad) and personal.merknadsfeil(merknad) is null))
);

create index oppforinger_dato_idx on personal.oppforinger (fagmiljo_id, dato);

comment on table personal.oppforinger is
  'Personalkalenderen: én status per medarbeider og dato (docs/personal-database.md). Fritaket ses bare med myndighet.';

-- Endringsloggen (personal.md §8.7): hvem, når, før og etter. Bare nye rader.
create table personal.endringer (
  id bigint generated always as identity primary key,
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  medarbeider_id uuid not null references personal.medarbeidere (id),
  dato date not null,
  kl timestamptz not null default now(),
  aktor uuid references public.profiles (id) on delete set null,
  foer jsonb,
  etter jsonb
);

create index endringer_dato_idx on personal.endringer (fagmiljo_id, dato);

comment on table personal.endringer is
  'Endringsloggen for personalkalenderen (docs/personal-database.md). Fritaket ses bare med myndighet; ingen rader endres eller fjernes.';

-- --- Invariantene -----------------------------------------------------------------

-- Låser datoen i fagmiljøet til transaksjonen er ferdig.
create function personal.las_dag(fagmiljo uuid, dato date)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into personal.dager as d (fagmiljo_id, dato) values (las_dag.fagmiljo, las_dag.dato)
  on conflict (fagmiljo_id, dato) do update set endringer = d.endringer + 1
$$;

-- Antallet med statusen på datoen før transaksjonen endret det, husket i
-- transaksjonen (`personal.foer`, et JSON-objekt per nøkkel), eller null.
create function personal.foer_nokkel(fagmiljo uuid, dato date, status text)
returns text
language sql
immutable
set search_path = ''
as $$
  select fagmiljo::text || '|' || dato::text || '|' || status
$$;

create function personal.foer_antall()
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(current_setting('personal.foer', true), ''), '{}')::jsonb
$$;

-- Før hver endring: låser datoen, husker antallet med statusen(e) før
-- transaksjonen rørte dem, og fører revisjonene og hvem som endret.
create function personal.for_oppforing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad personal.oppforinger := coalesce(new, old);
  status text;
  nokkel text;
  foer jsonb;
  def jsonb;
begin
  if tg_op = 'UPDATE' and (new.fagmiljo_id, new.medarbeider_id, new.dato) is distinct from (old.fagmiljo_id, old.medarbeider_id, old.dato) then
    raise exception 'En oppføring kan ikke flyttes. Fjern den og legg den inn på nytt.' using errcode = '42501';
  end if;
  perform personal.las_dag(rad.fagmiljo_id, rad.dato);
  foreach status in array array_remove(array[old.status_id, new.status_id], null) loop
    nokkel := personal.foer_nokkel(rad.fagmiljo_id, rad.dato, status);
    foer := personal.foer_antall();
    if not foer ? nokkel then
      perform set_config('personal.foer', (foer || jsonb_build_object(nokkel, (
        select count(*) from personal.oppforinger o
        where o.fagmiljo_id = rad.fagmiljo_id and o.dato = rad.dato and o.status_id = status
      )))::text, true);
    end if;
  end loop;
  if tg_op = 'DELETE' then
    return old;
  end if;

  -- Et administrativt fritak hører til én registrering av en status som kan ha
  -- det, og følger aldri en ny status.
  if new.fritak then
    def := personal.statusdef(personal.regler_for(new.fagmiljo_id, new.dato), new.status_id);
    if (def ->> 'dutyExemption') is distinct from 'administrative' or (tg_op = 'UPDATE' and new.status_id <> old.status_id) then
      raise exception 'Statusen kan ikke ha administrativt vaktfritak.' using errcode = '23514';
    end if;
  end if;

  if tg_op = 'INSERT' then
    new.revisjon := nextval('personal.revisjoner');
    new.fritak_revisjon := nextval('personal.fritaksrevisjoner');
    new.endret_kl := now();
    new.endret_av := auth.uid();
    return new;
  end if;
  if (new.id, new.status_id, new.fra_min, new.til_min, new.merknad, new.laast, new.regelversjon)
     is distinct from (old.id, old.status_id, old.fra_min, old.til_min, old.merknad, old.laast, old.regelversjon) then
    new.revisjon := nextval('personal.revisjoner');
    new.endret_kl := now();
    new.endret_av := auth.uid();
  else
    new.revisjon := old.revisjon;
    new.endret_kl := old.endret_kl;
    new.endret_av := old.endret_av;
  end if;
  new.fritak_revisjon := case when new.fritak <> old.fritak then nextval('personal.fritaksrevisjoner') else old.fritak_revisjon end;
  return new;
end;
$$;

create trigger oppforinger_for
before insert or update or delete on personal.oppforinger
for each row execute function personal.for_oppforing();

-- Ved slutten av transaksjonen: høyst `tak` med statusen på datoen, eller
-- høyst antallet før transaksjonen når det alt var over (`invariantErrors`).
create function personal.kontroller_bemanning()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  regler jsonb := personal.regler_for(new.fagmiljo_id, new.dato);
  tak integer := personal.tak(regler, new.status_id, new.dato);
  antall integer;
  foer integer;
  navn text;
begin
  if tak is null then
    return null;
  end if;
  select count(*) into antall from personal.oppforinger o
  where o.fagmiljo_id = new.fagmiljo_id and o.dato = new.dato and o.status_id = new.status_id;
  foer := coalesce((personal.foer_antall() ->> personal.foer_nokkel(new.fagmiljo_id, new.dato, new.status_id))::integer, 0);
  if antall > greatest(tak, foer) then
    navn := coalesce(personal.statusdef(regler, new.status_id) ->> 'name', 'Oppgaven');
    raise exception '%', case when tak = 1 then format('%s er tildelt flere %s.', navn, new.dato) else format('%s har flere enn %s %s.', navn, tak, new.dato) end
      using errcode = '23514';
  end if;
  return null;
end;
$$;

create constraint trigger oppforinger_bemanning
after insert or update on personal.oppforinger
deferrable initially deferred
for each row execute function personal.kontroller_bemanning();

-- Oppføringen som JSON i endringsloggen.
create function personal.loggrad(o personal.oppforinger)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select case when o.id is not null then jsonb_strip_nulls(jsonb_build_object(
    'status', o.status_id,
    'tid', case when o.fra_min is not null then jsonb_build_object('start', o.fra_min, 'end', o.til_min) end,
    'merknad', o.merknad,
    'laast', nullif(o.laast, false),
    'fritak', nullif(o.fritak, false)
  )) end
$$;

create function personal.logg_oppforing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad personal.oppforinger := coalesce(new, old);
  foer jsonb := case when tg_op <> 'INSERT' then personal.loggrad(old) end;
  etter jsonb := case when tg_op <> 'DELETE' then personal.loggrad(new) end;
begin
  if foer is distinct from etter then
    insert into personal.endringer (fagmiljo_id, medarbeider_id, dato, aktor, foer, etter)
    values (rad.fagmiljo_id, rad.medarbeider_id, rad.dato, auth.uid(), foer, etter);
  end if;
  return null;
end;
$$;

create trigger oppforinger_logg
after insert or update or delete on personal.oppforinger
for each row execute function personal.logg_oppforing();

create function personal.kontroller_endring()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Endringsloggen kan ikke endres.' using errcode = '42501';
end;
$$;

create trigger endringer_uendret
before update or delete on personal.endringer
for each row execute function personal.kontroller_endring();

-- En status er i bruk når en medarbeider er kvalifisert for den eller en
-- oppføring har den (`removedStatusErrors`).
create or replace function personal.statuser_i_bruk(fagmiljo uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select k.status_id
  from personal.kvalifikasjoner k
  join personal.medarbeidere m on m.id = k.medarbeider_id
  where m.fagmiljo_id = statuser_i_bruk.fagmiljo
  union
  select o.status_id from personal.oppforinger o where o.fagmiljo_id = statuser_i_bruk.fagmiljo
$$;

-- --- Lesemodellen -----------------------------------------------------------------

-- Oppføringen slik rollen får den: fritaket og revisjonen av det bare med
-- myndighet (K-DAT-1), ellers likt med og uten fritak (K-TIL-4).
create function personal.oppforing_json(o personal.oppforinger, med_fritak boolean)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
    'id', o.id,
    'medarbeider', o.medarbeider_id,
    'dato', o.dato,
    'status', o.status_id,
    'tid', case when o.fra_min is not null then jsonb_build_object('start', o.fra_min, 'end', o.til_min) end,
    'merknad', o.merknad,
    'laast', nullif(o.laast, false),
    'regelversjon', o.regelversjon,
    'revisjon', o.revisjon
  )) || case when med_fritak then jsonb_build_object('fritak', o.fritak, 'fritak_revisjon', o.fritak_revisjon) else '{}'::jsonb end
$$;

-- Høyst så mange dager kalenderen og historikken hentes for om gangen (et helt
-- arbeidsår med margin, personal.md §8.7 «Ytelse»).
create function personal.krev_tidsrom(fra date, til date)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if fra is null or til is null or til < fra or til - fra > 400 then
    raise exception 'Tidsrommet må være fra og med en dato til og med en senere, høyst 400 dager.' using errcode = '22023';
  end if;
end;
$$;

create function public.personal_kalender(fagmiljo uuid, fra date, til date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r constant text := personal.krev_tilgang(personal_kalender.fagmiljo, 'view');
begin
  perform personal.krev_tidsrom(personal_kalender.fra, personal_kalender.til);
  return jsonb_build_object(
    'fra', personal_kalender.fra,
    'til', personal_kalender.til,
    'oppforinger', coalesce((
      select jsonb_agg(personal.oppforing_json(o, personal.kan(r, 'manageExemption')) order by o.dato, o.medarbeider_id)
      from personal.oppforinger o
      where o.fagmiljo_id = personal_kalender.fagmiljo and o.dato between personal_kalender.fra and personal_kalender.til
    ), '[]'::jsonb)
  );
end;
$$;

comment on function public.personal_kalender(uuid, date, date) is
  'Personalkalenderen i et tidsrom for den innloggedes rolle; fritaket bare med myndighet (docs/personal-database.md).';

-- Endringsloggen i et tidsrom, for rollene som redigerer kalenderen. Uten
-- myndighet er fritaket tatt ut, og en endring av bare fritaket vises ikke.
create function public.personal_historikk(fagmiljo uuid, fra date, til date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r constant text := personal.krev_tilgang(personal_historikk.fagmiljo, 'editCalendar');
  med_fritak constant boolean := personal.kan(r, 'manageExemption');
begin
  perform personal.krev_tidsrom(personal_historikk.fra, personal_historikk.til);
  return coalesce((
    select jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'medarbeider', x.medarbeider_id,
      'dato', x.dato,
      'kl', x.kl,
      'aktor', x.aktor,
      'aktor_navn', (select coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username) from public.profiles p where p.id = x.aktor),
      'foer', x.foer,
      'etter', x.etter
    )) order by x.kl desc, x.id desc)
    from (
      select e.id, e.medarbeider_id, e.dato, e.kl, e.aktor,
        case when med_fritak then e.foer else e.foer - 'fritak' end as foer,
        case when med_fritak then e.etter else e.etter - 'fritak' end as etter
      from personal.endringer e
      where e.fagmiljo_id = personal_historikk.fagmiljo and e.dato between personal_historikk.fra and personal_historikk.til
    ) x
    where x.foer is distinct from x.etter
  ), '[]'::jsonb);
end;
$$;

comment on function public.personal_historikk(uuid, date, date) is
  'Endringsloggen for personalkalenderen i et tidsrom, for planleggerne; fritaket bare med myndighet (docs/personal-database.md).';

-- --- Kommandoene ------------------------------------------------------------------

-- Teksten som en dato, eller null når den ikke er en gyldig dato på formen
-- ÅÅÅÅ-MM-DD i kalenderens tidsrom.
create function personal.som_dato(tekst text)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  d date;
begin
  if tekst is null or tekst !~ '^\d{4}-\d{2}-\d{2}$' then
    return null;
  end if;
  d := tekst::date;
  return case when to_char(d, 'YYYY-MM-DD') = tekst and d between '2000-01-01' and '2099-12-31' then d end;
exception when others then
  return null;
end;
$$;

-- Et helt tall i JSON.
create function personal.er_heltall(v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(v) = 'number' and (v #>> '{}')::numeric = trunc((v #>> '{}')::numeric)
    and abs((v #>> '{}')::numeric) < 1e15
$$;

-- Om en endring til `personal_endre_kalender` har riktig form.
create function personal.endringsform(e jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
begin
  if jsonb_typeof(e) is distinct from 'object'
     or exists (select 1 from jsonb_object_keys(e) k where k not in ('medarbeider', 'dato', 'revisjon', 'status', 'tid', 'merknad')) then
    return false;
  end if;
  -- Revisjonen og statusen må stå der, også som null: en manglende status
  -- skal ikke kunne leses som å fjerne registreringen.
  if not (e ? 'revisjon' and e ? 'status') then
    return false;
  end if;
  if jsonb_typeof(e -> 'medarbeider') is distinct from 'string'
     or (e ->> 'medarbeider') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
     or personal.som_dato(case when jsonb_typeof(e -> 'dato') = 'string' then e ->> 'dato' end) is null then
    return false;
  end if;
  if coalesce(jsonb_typeof(e -> 'revisjon'), 'null') <> 'null' and not personal.er_heltall(e -> 'revisjon') then
    return false;
  end if;
  if coalesce(jsonb_typeof(e -> 'status'), 'null') not in ('null', 'string')
     or coalesce(jsonb_typeof(e -> 'merknad'), 'null') not in ('null', 'string')
     or coalesce(jsonb_typeof(e -> 'tid'), 'null') not in ('null', 'object') then
    return false;
  end if;
  -- Å fjerne en status har ingen merknad eller tid.
  if coalesce(jsonb_typeof(e -> 'status'), 'null') = 'null' and coalesce(jsonb_typeof(e -> 'tid'), jsonb_typeof(e -> 'merknad'), 'null') <> 'null' then
    return false;
  end if;
  if jsonb_typeof(e -> 'tid') = 'object' then
    if exists (select 1 from jsonb_object_keys(e -> 'tid') k where k not in ('start', 'end'))
       or jsonb_typeof(e -> 'tid' -> 'start') is distinct from 'number'
       or jsonb_typeof(e -> 'tid' -> 'end') is distinct from 'number' then
      return false;
    end if;
  end if;
  return true;
end;
$$;

-- Om tidsrommet i en endring er gyldig (`isValidRange`), eller utelatt.
create function personal.gyldig_tid(tid jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_typeof(tid), 'null') = 'null' or (
    personal.er_heltall(tid -> 'start') and personal.er_heltall(tid -> 'end')
    and (tid ->> 'start')::numeric >= 0 and (tid ->> 'end')::numeric <= 1440
    and (tid ->> 'start')::numeric < (tid ->> 'end')::numeric
  )
$$;

-- Navnet på medarbeideren.
create function personal.medarbeidernavn(m personal.medarbeidere)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(m.syntetisk_navn, (
    select coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username) from public.profiles p where p.id = m.bruker_id
  ))
$$;

-- Bruddene på kalenderreglene når medarbeideren får statusen på dagen, med de
-- samme meldingene som `planSet` i rules.ts: medarbeideren registrert,
-- statusen kjent og aktiv, kvalifikasjonen, arbeidsdagen, tidsrommet,
-- merknaden, og om vakten eller plassene alt er tatt av andre. Samme status i
-- cellen (`samme`) er bare ny merknad eller tid, og prøves bare for dem.
create function personal.statusbrudd(m personal.medarbeidere, dag date, status text, tid_ok boolean, merknad text, samme boolean)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  regler constant jsonb := personal.regler_for(m.fagmiljo_id, dag);
  def constant jsonb := personal.statusdef(regler, status);
  navn constant text := personal.medarbeidernavn(m);
  brudd text[] := '{}';
  detaljer text[] := '{}';
  slag text;
  andre integer;
  tak integer;
  feil text;
begin
  if dag < m.aktiv_fra or dag > m.aktiv_til then
    return array[format('%s var ikke registrert som medarbeider denne dagen.', navn)];
  end if;
  if def is null then
    return array['Ukjent status.'];
  end if;
  if (def -> 'active') is distinct from 'true'::jsonb then
    brudd := brudd || format('%s er utgått og kan ikke velges.', def ->> 'name');
  end if;
  if (def -> 'requiresQualification') = 'true'::jsonb and not personal.kvalifisert(m.id, status, dag) then
    brudd := brudd || format('%s er ikke kvalifisert for %s.', navn, lower(def ->> 'name'));
  end if;
  if (def -> 'present') = 'true'::jsonb then
    slag := personal.dagtype(regler, dag);
    if slag <> 'work' then
      brudd := brudd || format('%s gjelder arbeidsdager, og dagen er: %s.', def ->> 'name',
        case slag when 'holiday' then 'helligdag' when 'weekend' then 'helg' else 'ikke arbeidsdag' end);
    end if;
  end if;
  if not tid_ok then
    detaljer := detaljer || 'Klokkeslettene er ugyldige: «Til» må være etter «Fra».'::text;
  end if;
  feil := personal.merknadsfeil(merknad);
  if feil is not null then
    detaljer := detaljer || feil;
  end if;
  brudd := case when samme then detaljer else brudd || detaljer end;

  select count(*) into andre from personal.oppforinger o
  where o.fagmiljo_id = m.fagmiljo_id and o.dato = dag and o.status_id = status and o.medarbeider_id <> m.id;
  if (def -> 'uniquePerDay') = 'true'::jsonb then
    if andre > 0 then
      brudd := brudd || format('%s er alt tildelt samme dag.', def ->> 'name');
    end if;
  elsif not samme then
    tak := personal.tak(regler, status, dag);
    if tak is not null and andre >= tak then
      brudd := brudd || case when tak = 0 then format('%s har ikke bemanningsbehov denne dagen.', def ->> 'name')
        else format('Alle %s plassene for %s er fylt samme dag.', tak, lower(def ->> 'name')) end;
    end if;
  end if;
  return brudd;
end;
$$;

-- Endringer i kalenderen, lagret samlet eller ikke i det hele tatt (K-DAT-2).
-- Hver endring er `{medarbeider, dato, revisjon, status, tid, merknad}`:
-- revisjonen cellen hadde da den ble hentet (null for en tom celle), og den nye
-- statusen (null fjerner den), med tidsrommet `{start, end}` i minutter og
-- merknaden. Endringene gjøres i rekkefølge: en vakt tas over ved å fjerne den
-- hos den som har den, før den gis til en annen (A-OVT). Svarer med cellene
-- etter endringen, slik rollen ser dem.
create function public.personal_endre_kalender(fagmiljo uuid, endringer jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r constant text := personal.krev_skrivetilgang(personal_endre_kalender.fagmiljo, 'editCalendar');
  e jsonb;
  nr integer;
  m personal.medarbeidere;
  dag date;
  ny_status text;
  gammel personal.oppforinger;
  ny_merknad text;
  brudd text[];
begin
  -- Formen på alle endringene først.
  if jsonb_typeof(endringer) is distinct from 'array' or jsonb_array_length(endringer) not between 1 and 500 then
    raise exception 'Endringene må være en liste med 1–500 endringer.' using errcode = '22023';
  end if;
  for e, nr in select x, n from jsonb_array_elements(endringer) with ordinality y (x, n) loop
    if not personal.endringsform(e) then
      raise exception 'Endring % har feil form.', nr using errcode = '22023', detail = jsonb_build_object('endring', nr)::text;
    end if;
  end loop;
  if (select count(*) from jsonb_array_elements(endringer))
     <> (select count(distinct (x ->> 'medarbeider', x ->> 'dato')) from jsonb_array_elements(endringer) x) then
    raise exception 'Samme celle er med flere ganger.' using errcode = '22023';
  end if;

  -- Datoene låses i fast rekkefølge, så to kommandoer ikke venter på hverandre.
  perform personal.las_dag(personal_endre_kalender.fagmiljo, s.d)
  from (select distinct (x ->> 'dato')::date as d from jsonb_array_elements(endringer) x order by 1) s;

  -- Så revisjonene: alle cellene må være slik de var da de ble hentet.
  for e, nr in select x, n from jsonb_array_elements(endringer) with ordinality y (x, n) loop
    select * into m from personal.medarbeidere x
    where x.id = (e ->> 'medarbeider')::uuid and x.fagmiljo_id = personal_endre_kalender.fagmiljo;
    if not found then
      raise exception 'Ukjent medarbeider.' using errcode = '22023', detail = jsonb_build_object('endring', nr)::text;
    end if;
    select * into gammel from personal.oppforinger o where o.medarbeider_id = m.id and o.dato = (e ->> 'dato')::date for update;
    if (gammel.id is null) <> (coalesce(jsonb_typeof(e -> 'revisjon'), 'null') = 'null')
       or (gammel.id is not null and gammel.revisjon <> (e ->> 'revisjon')::bigint) then
      raise exception 'Kalenderen er endret av en annen siden den ble hentet. Hent den på nytt.'
        using errcode = 'PT409', detail = jsonb_build_object('endring', nr)::text;
    end if;
  end loop;

  -- Endringene, én etter én mot kalenderen etter de forrige.
  for e, nr in select x, n from jsonb_array_elements(endringer) with ordinality y (x, n) loop
    select * into m from personal.medarbeidere x where x.id = (e ->> 'medarbeider')::uuid;
    dag := (e ->> 'dato')::date;
    ny_status := e ->> 'status';
    select * into gammel from personal.oppforinger o where o.medarbeider_id = m.id and o.dato = dag;
    if ny_status is null then
      delete from personal.oppforinger o where o.id = gammel.id;
      continue;
    end if;
    brudd := personal.statusbrudd(m, dag, ny_status, personal.gyldig_tid(e -> 'tid'), e ->> 'merknad', gammel.status_id is not distinct from ny_status);
    if cardinality(brudd) > 0 then
      raise exception '%', array_to_string(brudd, ' ')
        using errcode = '22023', detail = jsonb_build_object('endring', nr, 'medarbeider', m.id, 'dato', dag)::text;
    end if;
    ny_merknad := personal.merknad(e ->> 'merknad');
    if gammel.id is null then
      insert into personal.oppforinger (fagmiljo_id, medarbeider_id, dato, status_id, fra_min, til_min, merknad, regelversjon)
      values (m.fagmiljo_id, m.id, dag, ny_status, (e -> 'tid' ->> 'start')::smallint, (e -> 'tid' ->> 'end')::smallint, ny_merknad,
        (personal.oppsett_for(m.fagmiljo_id, dag)).versjon);
    elsif gammel.status_id = ny_status then
      update personal.oppforinger o
      set fra_min = (e -> 'tid' ->> 'start')::smallint, til_min = (e -> 'tid' ->> 'end')::smallint, merknad = ny_merknad
      where o.id = gammel.id;
    else
      -- En ny status er en ny registrering, uten låsen og fritaket til den forrige (`entryFromPlan`).
      update personal.oppforinger o
      set id = gen_random_uuid(), status_id = ny_status,
        fra_min = (e -> 'tid' ->> 'start')::smallint, til_min = (e -> 'tid' ->> 'end')::smallint, merknad = ny_merknad,
        laast = false, fritak = false, regelversjon = (personal.oppsett_for(m.fagmiljo_id, dag)).versjon
      where o.id = gammel.id;
    end if;
  end loop;

  return jsonb_build_object('oppforinger', (
    select jsonb_agg(jsonb_build_object(
      'medarbeider', (x ->> 'medarbeider')::uuid,
      'dato', (x ->> 'dato')::date,
      'oppforing', (
        select personal.oppforing_json(o, personal.kan(r, 'manageExemption')) from personal.oppforinger o
        where o.medarbeider_id = (x ->> 'medarbeider')::uuid and o.dato = (x ->> 'dato')::date
      )
    ) order by n)
    from jsonb_array_elements(endringer) with ordinality y (x, n)
  ));
end;
$$;

comment on function public.personal_endre_kalender(uuid, jsonb) is
  'Endringer i personalkalenderen, kontrollert mot kalenderreglene og revisjonene og lagret samlet (docs/personal-database.md).';

-- Innvilger eller trekker tilbake administrativt vaktfritak på en
-- registrering (Borte), bare for lokal administrator (§6.2). Ingen årsak.
create function public.personal_sett_fritak(fagmiljo uuid, medarbeider uuid, dato date, fritak boolean, forventet_revisjon bigint, forventet_fritak_revisjon bigint)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  r constant text := personal.krev_skrivetilgang(personal_sett_fritak.fagmiljo, 'manageExemption');
  o personal.oppforinger;
begin
  if personal_sett_fritak.fritak is null then
    raise exception 'Fritaket må være ja eller nei.' using errcode = '22023';
  end if;
  select * into o from personal.oppforinger x
  where x.fagmiljo_id = personal_sett_fritak.fagmiljo and x.medarbeider_id = personal_sett_fritak.medarbeider
    and x.dato = personal_sett_fritak.dato
  for update;
  if not found then
    raise exception 'Fant ikke registreringen.' using errcode = '22023';
  end if;
  if o.revisjon is distinct from forventet_revisjon or o.fritak_revisjon is distinct from forventet_fritak_revisjon then
    raise exception 'Kalenderen er endret av en annen siden den ble hentet. Hent den på nytt.' using errcode = 'PT409';
  end if;
  if (personal.statusdef(personal.regler_for(o.fagmiljo_id, o.dato), o.status_id) ->> 'dutyExemption') is distinct from 'administrative' then
    raise exception 'Statusen kan ikke ha administrativt vaktfritak.' using errcode = '22023';
  end if;
  update personal.oppforinger x set fritak = personal_sett_fritak.fritak where x.id = o.id returning * into o;
  return personal.oppforing_json(o, true);
end;
$$;

comment on function public.personal_sett_fritak(uuid, uuid, date, boolean, bigint, bigint) is
  'Administrativt vaktfritak på en registrering i personalkalenderen, bare for lokal administrator (docs/personal-database.md).';

-- --- Rettighetene -----------------------------------------------------------------

revoke all on all tables in schema personal from public, anon, authenticated, service_role;
revoke all on all sequences in schema personal from public, anon, authenticated, service_role;
revoke all on all functions in schema personal from public, anon, authenticated, service_role;

revoke all on function public.personal_kalender(uuid, date, date) from public, anon, authenticated, service_role;
revoke all on function public.personal_historikk(uuid, date, date) from public, anon, authenticated, service_role;
revoke all on function public.personal_endre_kalender(uuid, jsonb) from public, anon, authenticated, service_role;
revoke all on function public.personal_sett_fritak(uuid, uuid, date, boolean, bigint, bigint) from public, anon, authenticated, service_role;
grant execute on function public.personal_kalender(uuid, date, date) to authenticated;
grant execute on function public.personal_historikk(uuid, date, date) to authenticated;
grant execute on function public.personal_endre_kalender(uuid, jsonb) to authenticated;
grant execute on function public.personal_sett_fritak(uuid, uuid, date, boolean, bigint, bigint) to authenticated;
