-- Personalkalenderen P2b, del 1: grunnmuren i skjemaet `personal` (#616,
-- docs/personal.md §8.7 og docs/personal-database.md).
--
-- - Funksjonen `personal` føres inn i katalogen over funksjonsbrytere (#598),
--   uten noen godkjenning for ordinær bruk. Databasen nekter derfor
--   `utprøving` og `på` i alle fagmiljøer som ikke er testmiljøer (K-SKJ-10).
-- - Skjemaet `personal` har ingen rettigheter for nettleseren. Den når det bare
--   gjennom funksjonene `public.personal_*`, som alle går gjennom porten
--   `personal.krev_tilgang`: aktivt medlemskap, funksjonsbryteren (P0002
--   «Finnes ikke.» for den som ikke har funksjonen, K-SKJ-3) og rollen.
-- - Rollen avledes på serveren (§8.4): lokal administrator (også
--   systemarkitekt med lokal myndighet, B2), vaktplanansvarlig (egen rolle,
--   flere samtidig, utpekt av lokal administrator) og kollega. Alt bygger på
--   eget aktivt medlemskap; systemarkitektrollen alene gir ingenting.
-- - Oppsettet per fagmiljø er versjonert med gyldighetsdato og valideres i
--   databasen med de samme reglene og meldingene som `validateRules` i
--   `supabase/functions/_delt/personal/commands.ts` (K-KON-3, K-KON-4).
-- - Medarbeiderne: virkelige (fagmiljø, bruker) eller syntetiske uten konto.
--   Syntetiske finnes bare i et testmiljø, og et testmiljø har bare syntetiske
--   (K-MED-4, K-SKJ-9). Testmerkingen kan ikke fjernes mens det finnes
--   syntetiske medarbeidere, og ingen medarbeider flyttes til et annet
--   fagmiljø (K-SKJ-10).
--
-- Ingen personalopplysninger: tabellene er tomme. Sandkasse får pilotoppsettet
-- og syntetiske medarbeidere i neste migrasjon.
--
-- Tilbakeføring: en ny migrasjon som slår av funksjonen der den er på, fjerner
-- funksjonene `public.personal_*` og skjemaet, og fjerner `personal` fra
-- katalogen.

create schema personal;
revoke all on schema personal from public;

comment on schema personal is
  'Personalkalenderen (OUSFAR Personal, docs/personal-database.md). Ingen av API-rollene har tilgang; se funksjonene personal_* i public.';

-- --- Funksjonen i katalogen ---------------------------------------------------

do $$
begin
  perform set_config('ousfar.tilgangsgrunn', '#616: personalkalenderen føres inn i katalogen, uten godkjenning for noe fagmiljø', true);
  insert into public.funksjoner (nokkel, navn, beskrivelse) values (
    'personal',
    'Personalkalenderen',
    'Personalkalender og vaktplan (OUSFAR Personal). Under utvikling: kan bare prøves ut i testmiljøer med syntetiske medarbeidere til den er godkjent for et fagmiljø (docs/personal.md §3.4 og §8.3).'
  );
end;
$$;

-- --- Rollene og handlingene -----------------------------------------------------

-- Policytabellen fra `permissions.ts` (MATRIX), med rollenavnene domenet
-- bruker: `reader` (kollega), `planner` (vaktplanansvarlig) og `localAdmin`
-- (lokal administrator, også systemarkitekt med lokal myndighet). En test
-- holder dem like.
create function personal.kan(rolle text, handling text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(kan.handling = any (case kan.rolle
    when 'reader' then array['view']
    when 'planner' then array['view', 'editCalendar', 'editPeople', 'editDutyShare']
    when 'localAdmin' then array['view', 'editCalendar', 'editPeople', 'editDutyShare', 'editRules', 'manageExemption', 'managePlanners']
  end), false)
$$;

revoke all on function personal.kan(text, text) from public, anon, authenticated, service_role;

-- Vaktplanansvarlige: en egen rolle for vanlige brukere (§3.3, K-TIL-5),
-- uavhengig av redaktørrollene. Flere kan ha den samtidig. Utpekes og fjernes
-- av lokal administrator (B3), som de andre tilgangene: én endring om gangen
-- under den felles låsen, og alt i `tilgangslogg`. Avsluttes, slettes ikke.
create table personal.vaktplanansvarlige (
  id uuid primary key default gen_random_uuid(),
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  fra timestamptz not null default now(),
  til timestamptz,
  tildelt_av uuid references public.profiles (id) on delete set null,
  avsluttet_av uuid references public.profiles (id) on delete set null,
  constraint vaktplanansvarlige_periode check (til is null or til >= fra)
);

comment on table personal.vaktplanansvarlige is
  'Vaktplanansvarlige per fagmiljø (docs/personal.md §8.4). Aktiv så lenge til står tom og medlemskapet den ble gitt i, varer.';

create unique index vaktplanansvarlige_en_aktiv_idx
  on personal.vaktplanansvarlige (fagmiljo_id, bruker_id) where til is null;

create trigger vaktplanansvarlige_serialiser
before insert or update or delete on personal.vaktplanansvarlige
for each statement execute function intern.serialiser_tilgang();

create trigger vaktplanansvarlige_logg
after insert or update or delete on personal.vaktplanansvarlige
for each row execute function intern.loggfor_tilgang();

create trigger vaktplanansvarlige_faste_felter
before update on personal.vaktplanansvarlige
for each row execute function intern.tilgang_faste_felter('id', 'fagmiljo_id', 'bruker_id', 'fra', 'tildelt_av');

-- Er brukeren utpekt som vaktplanansvarlig i fagmiljøet nå? En utpeking
-- gjelder bare i medlemskapet den ble gitt i: et medlemskap som avsluttes og
-- senere gis på nytt, gir ikke rollen tilbake.
create function personal.er_vaktplanansvarlig(fagmiljo uuid, bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from personal.vaktplanansvarlige v
    join public.medlemskap m
      on m.bruker_id = v.bruker_id and m.fagmiljo_id = v.fagmiljo_id and m.status = 'aktiv' and m.fra <= v.fra
    where v.fagmiljo_id = er_vaktplanansvarlig.fagmiljo and v.bruker_id = er_vaktplanansvarlig.bruker and v.til is null
  )
$$;

-- Rollen brukeren har i kalenderen i fagmiljøet, eller null uten funksjonen.
-- Funksjonsbryteren avgjør først (`intern.funksjon_tilgjengelig`, som krever
-- eget aktivt medlemskap); deretter lokal administrator uten
-- systemarkitektunntak (`intern.administrerte_fagmiljoer`, B2), så
-- vaktplanansvarlig, ellers kollega.
create function personal.rolle(fagmiljo uuid, bruker uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.funksjon_tilgjengelig('personal', rolle.fagmiljo, rolle.bruker) then null
    when rolle.fagmiljo in (select intern.administrerte_fagmiljoer(rolle.bruker)) then 'localAdmin'
    when personal.er_vaktplanansvarlig(rolle.fagmiljo, rolle.bruker) then 'planner'
    else 'reader'
  end
$$;

revoke all on function personal.rolle(uuid, uuid) from public, anon, authenticated, service_role;

comment on function personal.rolle(uuid, uuid) is
  'Rollen i personalkalenderen: localAdmin, planner, reader, eller null uten funksjonen (docs/personal.md §8.4).';

-- Porten for alle funksjonene nettleseren når: stopper uten aktivt medlemskap
-- (42501) og uten funksjonen (P0002 «Finnes ikke.», som for noe som ikke
-- finnes, K-SKJ-3), og med 42501 når rollen ikke har handlingen. Gir rollen.
create function personal.krev_tilgang(fagmiljo uuid, handling text default 'view')
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r text;
begin
  perform intern.krev_funksjon('personal', krev_tilgang.fagmiljo);
  r := personal.rolle(krev_tilgang.fagmiljo, (select auth.uid()));
  if not personal.kan(r, krev_tilgang.handling) then
    raise exception 'Rollen din i kalenderen gir ikke tilgang til dette.' using errcode = '42501';
  end if;
  return r;
end;
$$;

revoke all on function personal.krev_tilgang(uuid, text) from public, anon, authenticated, service_role;

-- --- Oppsettet ------------------------------------------------------------------

-- Tekst som ligner et fødselsnummer: OUSFARs felles gjenkjenning og i tillegg
-- alle elleve sammenhengende sifre, som `checkNote` i privacy.ts.
create function personal.ligner_fodselsnummer(tekst text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select intern.ligner_personnummer(tekst) or tekst ~ '(?<![0-9])[0-9]{6}[\s.-]?[0-9]{5}(?![0-9])'
$$;

-- Feil i formen på et oppsett: det TypeScript-typene sikrer i appen. Strengere
-- enn typene på det som ellers kunne gitt rare data (ukjente felt, ID-er,
-- lengder, antall), og uten fødselsnummerlignende tekst.
create function personal.oppsettformfeil(regler jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  feil text[] := '{}';
  x jsonb;
  k text;
  id_form constant text := '^([a-z0-9]+(-[a-z0-9]+)*)?$';
  -- Typene til feltene: obligatoriske og valgfrie.
  gruppefelt constant jsonb := '{"id": "string", "name": "string"}';
  statusfelt constant jsonb := '{"id": "string", "name": "string", "group": "string", "icon": "string", "tone": "string", "uniquePerDay": "boolean", "requiresQualification": "boolean", "active": "boolean"}';
  statusvalg constant jsonb := '{"present": "*", "highlighted": "boolean", "wish": "boolean", "description": "string", "dutyExemption": "string"}';
  behovfelt constant jsonb := '{"statusId": "string", "perWeekday": "array", "onHolidays": "boolean"}';
  behovvalg constant jsonb := '{"categoryWeights": "object", "load": "*"}';
  kalenderfelt constant jsonb := '{"weekdays": "*", "holidays": "*"}';
  kalendervalg constant jsonb := '{"holidayCalendar": "*"}';
begin
  if jsonb_typeof(regler) is distinct from 'object' then
    return array['Oppsettet har feil form: reglene må være et objekt.'];
  end if;
  feil := feil || personal.feltfeil(regler, '{"groups": "array", "statuses": "array", "staffing": "array"}', '{"workCalendar": "object", "allocation": "object"}', 'reglene');
  if cardinality(feil) > 0 then
    return feil;
  end if;
  if jsonb_array_length(regler -> 'groups') > 12 or jsonb_array_length(regler -> 'statuses') > 60 or jsonb_array_length(regler -> 'staffing') > 60 then
    feil := feil || 'Oppsettet har feil form: for mange visningsgrupper, statuser eller bemanningsbehov.'::text;
  end if;
  for x in select value from jsonb_array_elements(regler -> 'groups') loop
    feil := feil || personal.feltfeil(x, gruppefelt, '{}', 'en visningsgruppe');
    if jsonb_typeof(x -> 'id') = 'string' and not (x ->> 'id' ~ id_form and char_length(x ->> 'id') <= 40) then
      feil := feil || 'Oppsettet har feil form: en ID kan bare ha små bokstaver, sifre og bindestrek.'::text;
    end if;
    if jsonb_typeof(x -> 'name') = 'string' and char_length(x ->> 'name') > 60 then
      feil := feil || 'Oppsettet har feil form: et navn kan være høyst 60 tegn.'::text;
    end if;
  end loop;
  for x in select value from jsonb_array_elements(regler -> 'statuses') loop
    feil := feil || personal.feltfeil(x, statusfelt, statusvalg, 'en status');
    if jsonb_typeof(x -> 'id') = 'string' and not (x ->> 'id' ~ id_form and char_length(x ->> 'id') <= 40) then
      feil := feil || 'Oppsettet har feil form: en ID kan bare ha små bokstaver, sifre og bindestrek.'::text;
    end if;
    if jsonb_typeof(x -> 'name') = 'string' and char_length(x ->> 'name') > 60 then
      feil := feil || 'Oppsettet har feil form: et navn kan være høyst 60 tegn.'::text;
    end if;
    if jsonb_typeof(x -> 'description') = 'string' and char_length(x ->> 'description') > 300 then
      feil := feil || 'Oppsettet har feil form: en beskrivelse kan være høyst 300 tegn.'::text;
    end if;
  end loop;
  for x in select value from jsonb_array_elements(regler -> 'staffing') loop
    feil := feil || personal.feltfeil(x, behovfelt, behovvalg, 'et bemanningsbehov');
    if jsonb_typeof(x -> 'perWeekday') = 'array' and jsonb_array_length(x -> 'perWeekday') > 7 then
      feil := feil || 'Oppsettet har feil form: et bemanningsbehov har for mange ukedager.'::text;
    end if;
    if jsonb_typeof(x -> 'categoryWeights') = 'object' then
      if (select count(*) from jsonb_object_keys(x -> 'categoryWeights')) > 60
         or exists (select 1 from jsonb_object_keys(x -> 'categoryWeights') n where char_length(n) not between 1 and 60) then
        feil := feil || 'Oppsettet har feil form: rollevektene har for mange eller for lange nøkler.'::text;
      end if;
    end if;
  end loop;
  if regler ? 'workCalendar' then
    feil := feil || personal.feltfeil(regler -> 'workCalendar', kalenderfelt, kalendervalg, 'arbeidskalenderen');
  end if;
  if regler ? 'allocation' and (select count(*) from jsonb_object_keys(regler -> 'allocation')) > 30 then
    feil := feil || 'Oppsettet har feil form: for mange innstillinger i vaktfordelingen.'::text;
  end if;
  -- Ingen tekst i oppsettet kan ligne et fødselsnummer (docs/pasientopplysninger.md).
  for k in select v #>> '{}' from jsonb_path_query(regler, 'strict $.**') v where jsonb_typeof(v) = 'string' loop
    if personal.ligner_fodselsnummer(k) then
      feil := feil || 'Oppsettet kan ikke inneholde tekst som ligner et fødselsnummer.'::text;
      exit;
    end if;
  end loop;
  return array(select distinct f from unnest(feil) f order by f);
end;
$$;

-- Feltene i et objekt: de obligatoriske (`felt`) må finnes med typen, de
-- valgfrie (`valg`) kan, og ingen andre. Typen `*` godtar alt; innholdet
-- kontrolleres da av reglene under, som i TypeScript.
create function personal.feltfeil(x jsonb, felt jsonb, valg jsonb, hva text)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  feil text[] := '{}';
  k text;
  t text;
begin
  if jsonb_typeof(x) is distinct from 'object' then
    return array[format('Oppsettet har feil form: %s må være et objekt.', hva)];
  end if;
  for k, t in select key, value #>> '{}' from jsonb_each(felt) loop
    if not x ? k then
      feil := feil || format('Oppsettet har feil form: %s mangler «%s».', hva, k);
    elsif t <> '*' and jsonb_typeof(x -> k) is distinct from t then
      feil := feil || format('Oppsettet har feil form: «%s» i %s har feil type.', k, hva);
    end if;
  end loop;
  for k, t in select key, value #>> '{}' from jsonb_each(valg) loop
    if x ? k and t <> '*' and jsonb_typeof(x -> k) is distinct from t then
      feil := feil || format('Oppsettet har feil form: «%s» i %s har feil type.', k, hva);
    end if;
  end loop;
  for k in select key from jsonb_object_keys(x) key where not (felt ? key or valg ? key) loop
    feil := feil || format('Oppsettet har feil form: ukjent felt «%s» i %s.', k, hva);
  end loop;
  return feil;
end;
$$;

-- Fordelingsinnstillingene: nøklene og grensene i `DEFAULT_ALLOCATION` og
-- `ALLOCATION_FIELD_LIMITS` (catalog.ts). En test holder dem like.
create function personal.fordelingsgrenser()
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select '{
    "historyFairness": null, "periodFairness": null, "shortTerm": null, "spacing": null, "weekday": null,
    "mixedCategories": null, "stability": null,
    "historyDays": {"min": 28, "max": 730, "label": "Tidshorisonten for historisk utjevning", "unit": "dager"},
    "shortWindowDays": {"min": 7, "max": 120, "label": "Det korte vinduet", "unit": "dager"},
    "catchUpLimit": {"min": 0, "max": 200, "label": "Største ekstra utjevning i én plan", "unit": "prosent"}
  }'::jsonb
$$;

-- Feilene i et oppsett, med de samme meldingene som `validateRules` (og
-- `layoutErrors`) i commands.ts, eller formfeilene over. Tom liste: gyldig.
create function personal.oppsettfeil(regler jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  feil text[] := personal.oppsettformfeil(regler);
  g jsonb;
  s jsonb;
  b jsonb;
  kal jsonb;
  def jsonb;
  navn text;
  maks integer;
  gruppeider text[] := '{}';
  ider text[] := '{}';
  navnene text[] := '{}';
  bemannede text[];
  k text;
  v jsonb;
  grense jsonb;
  fri boolean[];
  helligdager_arbeid boolean;
  ingen_helligdager boolean;
  trim_re constant text := '^\s+|\s+$';
  noekkel_re constant text := '^[a-zA-Z][a-zA-Z0-9-]{0,39}$';
begin
  if cardinality(feil) > 0 then
    return feil;
  end if;

  -- Visningsgruppene og arbeidskalenderen (layoutErrors).
  if jsonb_array_length(regler -> 'groups') = 0 then
    feil := feil || 'Oppsettet mangler visningsgrupper.'::text;
  end if;
  for g in select value from jsonb_array_elements(regler -> 'groups') loop
    if regexp_replace(g ->> 'id', trim_re, '', 'g') = '' or regexp_replace(g ->> 'name', trim_re, '', 'g') = '' then
      feil := feil || 'En visningsgruppe mangler ID eller navn.'::text;
    end if;
    if (g ->> 'id') = any (gruppeider) then
      feil := feil || format('Visningsgruppen «%s» finnes flere ganger.', g ->> 'id');
    end if;
    gruppeider := gruppeider || (g ->> 'id');
  end loop;
  for s in select value from jsonb_array_elements(regler -> 'statuses') loop
    if not (s ->> 'group') = any (gruppeider) then
      feil := feil || format('«%s» har ukjent visningsgruppe.', s ->> 'name');
    end if;
  end loop;
  kal := regler -> 'workCalendar';
  if kal is not null then
    if jsonb_typeof(kal -> 'weekdays') is distinct from 'array' or jsonb_array_length(kal -> 'weekdays') <> 7
       or exists (select 1 from jsonb_array_elements(kal -> 'weekdays') w where jsonb_typeof(w) <> 'boolean') then
      feil := feil || 'Arbeidskalenderen må si for hver ukedag om den er arbeidsdag.'::text;
    end if;
    if jsonb_typeof(kal -> 'holidays') is distinct from 'boolean' then
      feil := feil || 'Arbeidskalenderen må si om helligdager er arbeidsdager.'::text;
    end if;
    if kal ? 'holidayCalendar' and coalesce(kal ->> 'holidayCalendar', '') not in ('no', 'none') then
      feil := feil || 'Ukjent helligdagskalender.'::text;
    end if;
  end if;

  -- Statusene (validateRules).
  bemannede := array(select e.value ->> 'statusId' from jsonb_array_elements(regler -> 'staffing') e);
  for s in select value from jsonb_array_elements(regler -> 'statuses') loop
    navn := s ->> 'name';
    if regexp_replace(s ->> 'id', trim_re, '', 'g') = '' then
      feil := feil || 'En status mangler ID.'::text;
    end if;
    if (s ->> 'id') = any (ider) then
      feil := feil || format('Status-ID-en «%s» finnes flere ganger.', s ->> 'id');
    end if;
    ider := ider || (s ->> 'id');
    if regexp_replace(navn, trim_re, '', 'g') = '' then
      feil := feil || 'En status mangler navn.'::text;
    end if;
    if lower(regexp_replace(navn, trim_re, '', 'g')) = any (navnene) then
      feil := feil || format('Navnet «%s» er brukt flere ganger.', navn);
    end if;
    navnene := navnene || lower(regexp_replace(navn, trim_re, '', 'g'));
    if jsonb_typeof(s -> 'present') is distinct from 'boolean' then
      feil := feil || format('«%s» må si om statusen regnes som fysisk til stede.', navn);
    end if;
    if not (s ->> 'icon') ~ noekkel_re then
      feil := feil || format('«%s» har ukjent ikon.', navn);
    end if;
    if not (s ->> 'tone') ~ noekkel_re then
      feil := feil || format('«%s» har ukjent farge.', navn);
    end if;
    -- Hard garanti: en vakttype krever fysisk tilstedeværelse (A-STA-09).
    if (s -> 'uniquePerDay') = 'true' and (s -> 'present') is distinct from 'true' then
      feil := feil || format('«%s» er én per dag og må regnes som fysisk til stede.', navn);
    end if;
    if s ? 'dutyExemption' and (s ->> 'dutyExemption') not in ('always', 'administrative') then
      feil := feil || format('«%s» har ukjent vaktfritak.', navn);
    end if;
    -- En vakt kan aldri samtidig være vaktfritak.
    if coalesce(s ->> 'dutyExemption', '') <> '' and ((s -> 'uniquePerDay') = 'true' or (s ->> 'id') = any (bemannede)) then
      feil := feil || format('«%s» bemannes og kan ikke gi vaktfritak.', navn);
    end if;
  end loop;

  -- Bemanningsbehovene, med arbeidskalenderen som gjelder (workCalendarOf):
  -- uten arbeidskalender mandag–fredag og ikke helligdager.
  fri := case when kal is null then array[false, false, false, false, false, true, true]
    else array(select coalesce((kal -> 'weekdays' -> i) = 'false'::jsonb, false) from generate_series(0, 6) i) end;
  helligdager_arbeid := coalesce((kal -> 'holidays') = 'true'::jsonb, false);
  ingen_helligdager := coalesce(kal ->> 'holidayCalendar', '') = 'none';
  for b in select value from jsonb_array_elements(regler -> 'staffing') loop
    select x into def from jsonb_array_elements(regler -> 'statuses') with ordinality e(x, n)
    where x ->> 'id' = b ->> 'statusId' order by n limit 1;
    if def is null then
      feil := feil || 'Et bemanningsbehov viser til en status som ikke finnes.'::text;
      continue;
    end if;
    navn := def ->> 'name';
    -- Fravær skal aldri kunne gi gyldig bemanning (A-STA-09).
    if (def -> 'present') is distinct from 'true' then
      feil := feil || format('«%s» brukes i bemanningsbehov og må regnes som fysisk til stede.', navn);
    end if;
    maks := case when (def -> 'uniquePerDay') = 'true' then 1 else 20 end;
    if jsonb_array_length(b -> 'perWeekday') <> 7 or exists (
      select 1 from jsonb_array_elements(b -> 'perWeekday') n
      where jsonb_typeof(n) <> 'number' or (n #>> '{}')::numeric <> trunc((n #>> '{}')::numeric)
         or (n #>> '{}')::numeric < 0 or (n #>> '{}')::numeric > maks
    ) then
      feil := feil || format('Bemanningsbehovet for «%s» må være hele tall mellom 0 og %s.', navn, maks);
    end if;
    -- Et behov på en dag som ikke er arbeidsdag, kunne aldri dekkes.
    if exists (
      select 1 from jsonb_array_elements(b -> 'perWeekday') with ordinality e(n, i)
      where jsonb_typeof(n) = 'number' and (n #>> '{}')::numeric > 0 and i <= 7
        and fri[i]
    ) then
      feil := feil || format('Bemanningsbehovet for «%s» gjelder en ukedag som ikke er arbeidsdag i arbeidskalenderen.', navn);
    end if;
    if (b -> 'onHolidays') = 'true' and not helligdager_arbeid and not ingen_helligdager then
      feil := feil || format('Bemanningsbehovet for «%s» gjelder helligdager, men helligdager er ikke arbeidsdager i arbeidskalenderen.', navn);
    end if;
    if b ? 'categoryWeights' and exists (
      select 1 from jsonb_each(b -> 'categoryWeights') w
      where jsonb_typeof(w.value) <> 'number' or (w.value #>> '{}')::numeric not between 0 and 10
    ) then
      feil := feil || 'Rollevekter må være tall mellom 0 og 10.'::text;
    end if;
    if b ? 'load' and (jsonb_typeof(b -> 'load') <> 'number' or ((b ->> 'load')::numeric not between 0.1 and 10)) then
      feil := feil || 'Belastning må være et tall mellom 0,1 og 10.'::text;
    end if;
  end loop;
  if (select count(distinct x) from unnest(bemannede) x) <> cardinality(bemannede) then
    feil := feil || 'Samme status har flere bemanningsbehov.'::text;
  end if;

  -- Vektene i vaktfordelingen.
  if regler ? 'allocation' then
    for k, v in select key, value from jsonb_each(regler -> 'allocation') loop
      if not personal.fordelingsgrenser() ? k then
        feil := feil || format('Ukjent innstilling i vaktfordelingen: %s.', k);
        continue;
      end if;
      grense := personal.fordelingsgrenser() -> k;
      if jsonb_typeof(grense) = 'object' then
        if jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric <> trunc((v #>> '{}')::numeric)
           or (v #>> '{}')::numeric < (grense ->> 'min')::numeric or (v #>> '{}')::numeric > (grense ->> 'max')::numeric then
          feil := feil || format('%s må være mellom %s og %s %s.', grense ->> 'label', grense ->> 'min', grense ->> 'max',
            case grense ->> 'unit' when 'prosent' then '%' else 'dager' end);
        end if;
      elsif jsonb_typeof(v) <> 'number' or (v #>> '{}')::numeric not between 0 and 100 then
        feil := feil || 'Vektene i vaktfordelingen må være tall mellom 0 og 100.'::text;
      end if;
    end loop;
  end if;

  return array(select distinct f from unnest(feil) f order by f);
end;
$$;

-- Oppsettet per fagmiljø, versjonert (§8.6, K-KON-3): hver lagring er en ny
-- versjon som gjelder fra dagen den lagres (i fagmiljøets tidssone), også
-- flere samme dag. Ingen versjon endres eller fjernes, og et versjonsnummer
-- brukes aldri om igjen. `regler` er `RuleSet` fra types.ts uten `version` og
-- `effectiveFrom`, som er kolonnene her; enheten (tidssone, arbeidsåret og
-- helgefilteret) er `Unit`.
create table personal.oppsett (
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  versjon integer not null,
  gjelder_fra date not null,
  tidssone text not null,
  arbeidsaar_start smallint not null,
  skjul_helg boolean not null,
  regler jsonb not null,
  lagret_kl timestamptz not null default now(),
  lagret_av uuid references public.profiles (id) on delete set null,
  primary key (fagmiljo_id, versjon),
  constraint oppsett_versjon check (versjon >= 1),
  constraint oppsett_arbeidsaar check (arbeidsaar_start between 1 and 12),
  constraint oppsett_tidssone_form check (char_length(tidssone) between 1 and 64),
  constraint oppsett_regler_gyldige check (cardinality(personal.oppsettfeil(regler)) = 0)
);

comment on table personal.oppsett is
  'Fagmiljøets versjonerte oppsett for personalkalenderen (docs/personal.md §8.6). Bare nye versjoner; ingen endres eller fjernes.';

-- En ny versjon følger rett etter den forrige, gjelder ikke før den, og har en
-- tidssone Postgres kjenner. Ingen versjon endres eller fjernes.
create function personal.kontroller_oppsett()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  forrige personal.oppsett;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Et lagret oppsett kan ikke endres. Lagre en ny versjon.' using errcode = '42501';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names z where z.name = new.tidssone) then
    raise exception 'Ukjent tidssone.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('personal.oppsett:' || new.fagmiljo_id::text, 0));
  select o.* into forrige from personal.oppsett o where o.fagmiljo_id = new.fagmiljo_id order by o.versjon desc limit 1;
  if new.versjon <> coalesce(forrige.versjon, 0) + 1 then
    raise exception 'Oppsettet er endret av en annen. Hent det på nytt.' using errcode = 'PT409';
  end if;
  if new.gjelder_fra < forrige.gjelder_fra then
    raise exception 'En ny versjon av oppsettet kan ikke gjelde før den forrige.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger oppsett_kontroll
before insert or update or delete on personal.oppsett
for each row execute function personal.kontroller_oppsett();

-- Den siste versjonen (det gjeldende oppsettet), eller ingen.
create function personal.gjeldende_oppsett(fagmiljo uuid)
returns personal.oppsett
language sql
stable
security definer
set search_path = ''
as $$
  select o.* from personal.oppsett o where o.fagmiljo_id = gjeldende_oppsett.fagmiljo order by o.versjon desc limit 1
$$;

-- «I dag» i fagmiljøets tidssone (§8.6), også ved midnatt og sommertid. Uten
-- oppsett: Europe/Oslo.
create function personal.i_dag(fagmiljo uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce((personal.gjeldende_oppsett(i_dag.fagmiljo)).tidssone, 'Europe/Oslo'))::date
$$;

-- Versjonen som gjelder datoen, som `rulesForDate` i rules.ts: den siste
-- versjonen med gyldighetsdato på eller før datoen, ellers den første. I dag
-- og fremover er det den gjeldende.
create function personal.oppsett_for(fagmiljo uuid, dato date)
returns personal.oppsett
language sql
stable
security definer
set search_path = ''
as $$
  select o.* from personal.oppsett o
  where o.fagmiljo_id = oppsett_for.fagmiljo
  order by (o.gjelder_fra <= oppsett_for.dato) desc, case when o.gjelder_fra <= oppsett_for.dato then -o.versjon else o.versjon end
  limit 1
$$;

-- Versjonen som `RuleSet` (types.ts).
create function personal.regelsett(o personal.oppsett)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select o.regler || jsonb_build_object('version', o.versjon, 'effectiveFrom', o.gjelder_fra)
$$;

-- Enheten som `Unit` (types.ts), etter den gjeldende versjonen.
create function personal.enhet(fagmiljo uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', f.id,
    'name', f.navn,
    'workYearStartMonth', o.arbeidsaar_start,
    'timeZone', o.tidssone,
    'hideWeekendsByDefault', o.skjul_helg
  )
  from public.fagmiljoer f, personal.gjeldende_oppsett(enhet.fagmiljo) o
  where f.id = enhet.fagmiljo and o.versjon is not null
$$;

-- --- Medarbeiderne ----------------------------------------------------------------

-- Medarbeiderne i kalenderen (§8.5). I ordinær drift er en medarbeider paret
-- (fagmiljø, bruker); navnet og stillingen kommer fra profilen (P2c). I et
-- testmiljø er alle syntetiske, uten konto, med oppdiktet navn og en stilling
-- fra stillingslista. Aktiv fra og til avgrenser hvilke dager medarbeideren
-- planlegges (A-KAL-08). Hva som skjer med en virkelig medarbeider når kontoen
-- slettes, avgjøres før ordinær bruk (B9); til da stopper fremmednøkkelen
-- slettingen.
create table personal.medarbeidere (
  id uuid primary key default gen_random_uuid(),
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  bruker_id uuid references public.profiles (id) on delete restrict,
  syntetisk_navn text,
  syntetisk_stilling_id uuid references public.stillinger (id) on delete set null,
  aktiv_fra date not null,
  aktiv_til date,
  opprettet_kl timestamptz not null default now(),
  constraint medarbeidere_id_fagmiljo unique (id, fagmiljo_id),
  constraint medarbeidere_en_per_bruker unique (fagmiljo_id, bruker_id),
  constraint medarbeidere_slag check ((bruker_id is null) <> (syntetisk_navn is null)),
  constraint medarbeidere_syntetisk_stilling check (syntetisk_stilling_id is null or syntetisk_navn is not null),
  -- Som `validatePerson` (commands.ts): et navn uten tallrekker.
  constraint medarbeidere_syntetisk_navn check (
    syntetisk_navn is null or (
      syntetisk_navn = btrim(regexp_replace(syntetisk_navn, '\s+', ' ', 'g'))
      and char_length(syntetisk_navn) between 2 and 80
      and syntetisk_navn !~ '\d{4,}'
    )
  ),
  constraint medarbeidere_periode check (aktiv_til is null or aktiv_til >= aktiv_fra)
);

comment on table personal.medarbeidere is
  'Medarbeiderne i personalkalenderen: virkelige (fagmiljø, bruker) eller syntetiske, bare i et testmiljø (docs/personal.md §8.3, §8.5).';

create unique index medarbeidere_syntetisk_navn_idx on personal.medarbeidere (fagmiljo_id, lower(syntetisk_navn)) where syntetisk_navn is not null;

-- Kvalifikasjonene per bemanningsoppgave, datert: gjelder fra og med `fra`
-- til og med `til` (tom: på ubestemt tid). Endringer gjelder fra i dag (§7.4).
create table personal.kvalifikasjoner (
  id uuid primary key default gen_random_uuid(),
  medarbeider_id uuid not null references personal.medarbeidere (id) on delete cascade,
  status_id text not null,
  fra date not null,
  til date,
  constraint kvalifikasjoner_status_form check (status_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(status_id) <= 40),
  constraint kvalifikasjoner_periode check (til is null or til >= fra)
);

create index kvalifikasjoner_medarbeider_idx on personal.kvalifikasjoner (medarbeider_id, status_id);

comment on table personal.kvalifikasjoner is
  'Kvalifikasjonene til en medarbeider per bemanningsoppgave, med gyldighet (docs/personal.md §7.4).';

-- Kvalifikasjonsperiodene for samme medarbeider og oppgave overlapper ikke.
-- Låsen på medarbeideren gjør at to samtidige endringer prøves etter hverandre.
create function personal.kontroller_kvalifikasjon()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform 1 from personal.medarbeidere m where m.id = new.medarbeider_id for update;
  if exists (
    select 1 from personal.kvalifikasjoner k
    where k.medarbeider_id = new.medarbeider_id and k.status_id = new.status_id and k.id <> new.id
      and k.fra <= coalesce(new.til, 'infinity'::date) and new.fra <= coalesce(k.til, 'infinity'::date)
  ) then
    raise exception 'Kvalifikasjonsperiodene for samme oppgave kan ikke overlappe.' using errcode = '23P01';
  end if;
  return new;
end;
$$;

create trigger kvalifikasjoner_kontroll
before insert or update on personal.kvalifikasjoner
for each row execute function personal.kontroller_kvalifikasjon();

-- Er medarbeideren kvalifisert for statusen på datoen?
create function personal.kvalifisert(medarbeider uuid, status text, dato date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from personal.kvalifikasjoner k
    where k.medarbeider_id = kvalifisert.medarbeider and k.status_id = kvalifisert.status
      and k.fra <= kvalifisert.dato and (k.til is null or k.til >= kvalifisert.dato)
  )
$$;

-- K-MED-4 og K-SKJ-9/10: syntetiske medarbeidere bare i et testmiljø, et
-- testmiljø bare med syntetiske, og ingen medarbeider flyttes til et annet
-- fagmiljø eller bytter slag.
create function personal.kontroller_medarbeider()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  testmiljo boolean;
begin
  if tg_op = 'UPDATE' and (
    new.fagmiljo_id is distinct from old.fagmiljo_id
    or new.bruker_id is distinct from old.bruker_id
    or (new.syntetisk_navn is null) <> (old.syntetisk_navn is null)
  ) then
    raise exception 'En medarbeider kan ikke flyttes til et annet fagmiljø eller byttes ut.' using errcode = '42501';
  end if;
  select f.testmiljo into testmiljo from public.fagmiljoer f where f.id = new.fagmiljo_id for share;
  if testmiljo and new.syntetisk_navn is null then
    raise exception 'Et testmiljø har bare syntetiske medarbeidere.' using errcode = '23514';
  end if;
  if not testmiljo and new.syntetisk_navn is not null then
    raise exception 'Syntetiske medarbeidere kan bare finnes i et testmiljø.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger medarbeidere_kontroll
before insert or update on personal.medarbeidere
for each row execute function personal.kontroller_medarbeider();

-- Testmerkingen på et fagmiljø: kan ikke fjernes mens det finnes syntetiske
-- medarbeidere der, og kan ikke settes der det finnes virkelige (K-SKJ-10,
-- K-MED-4). Syntetiske data overføres aldri til et virkelig fagmiljø.
create function personal.kontroller_testmiljo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.testmiljo and exists (select 1 from personal.medarbeidere m where m.fagmiljo_id = new.id and m.syntetisk_navn is not null) then
    raise exception 'Testmerkingen kan ikke fjernes mens det finnes syntetiske medarbeidere i personalkalenderen.' using errcode = '23514';
  end if;
  if new.testmiljo and exists (select 1 from personal.medarbeidere m where m.fagmiljo_id = new.id and m.bruker_id is not null) then
    raise exception 'Et fagmiljø med virkelige medarbeidere i personalkalenderen kan ikke bli testmiljø.' using errcode = '23514';
  end if;
  return null;
end;
$$;

create trigger fagmiljoer_personal_testmiljo
after update of testmiljo on public.fagmiljoer
for each row when (old.testmiljo is distinct from new.testmiljo)
execute function personal.kontroller_testmiljo();

-- Statusene oppsettet ikke kan fjerne fordi de er i bruk (`removedStatusErrors`
-- i commands.ts): i kvalifikasjonene. Kalenderoppføringene kommer til i neste
-- del.
create function personal.statuser_i_bruk(fagmiljo uuid)
returns setof text
language sql
stable
security definer
set search_path = ''
as $$
  select distinct k.status_id
  from personal.kvalifikasjoner k
  join personal.medarbeidere m on m.id = k.medarbeider_id
  where m.fagmiljo_id = statuser_i_bruk.fagmiljo
$$;

-- --- Funksjonene nettleseren når ------------------------------------------------

-- Grunnlaget for kalenderen i fagmiljøet: rollen, «i dag», enheten, alle
-- versjonene av oppsettet, stillingene (kalenderens kategorier, 1:1 med
-- stillingslista), medarbeiderne og de vaktplanansvarlige. Kvalifikasjonene
-- gis bare til rollene som redigerer kalenderen; kolleger ser det kalenderen
-- viser.
create function public.personal_grunnlag(fagmiljo uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r text;
begin
  r := personal.krev_tilgang(personal_grunnlag.fagmiljo, 'view');
  return jsonb_build_object(
    'rolle', r,
    'i_dag', personal.i_dag(personal_grunnlag.fagmiljo),
    'enhet', personal.enhet(personal_grunnlag.fagmiljo),
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
        'aktiv_til', m.aktiv_til
      ) || case when personal.kan(r, 'editCalendar') then jsonb_build_object('kvalifikasjoner', coalesce((
        select jsonb_agg(jsonb_build_object('status', k.status_id, 'fra', k.fra, 'til', k.til) order by k.status_id, k.fra)
        from personal.kvalifikasjoner k where k.medarbeider_id = m.id
      ), '[]'::jsonb)) else '{}'::jsonb end
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
        and personal.rolle(v.fagmiljo_id, v.bruker_id) is not null
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.personal_grunnlag(uuid) from public, anon, authenticated, service_role;
grant execute on function public.personal_grunnlag(uuid) to authenticated;

comment on function public.personal_grunnlag(uuid) is
  'Grunnlaget for personalkalenderen i fagmiljøet: rollen, i dag, enheten, oppsettet, stillingene, medarbeiderne og de vaktplanansvarlige (docs/personal-database.md).';

-- Lagrer et nytt oppsett, som gjelder fra i dag (K-KON-3), for den lokale
-- administratoren (B3b). `oppsett` er `{enhet: {timeZone, workYearStartMonth,
-- hideWeekendsByDefault}, regler: RuleSet uten version og effectiveFrom}`.
-- `forventet_versjon` er versjonen klienten bygde på (null for det første
-- oppsettet); har en annen lagret imens, avvises det med PT409. Et ugyldig
-- oppsett avvises med feilene (22023, K-KON-4), og en status i bruk kan ikke
-- fjernes. Gir den nye versjonen som `RuleSet`.
create function public.personal_lagre_oppsett(fagmiljo uuid, oppsett jsonb, forventet_versjon integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid;
  enhet jsonb := personal_lagre_oppsett.oppsett -> 'enhet';
  regler jsonb := personal_lagre_oppsett.oppsett -> 'regler';
  feil text[];
  forrige personal.oppsett;
  ny personal.oppsett;
  fjernet text;
begin
  perform personal.krev_tilgang(personal_lagre_oppsett.fagmiljo, 'editRules');
  aktor := (select auth.uid());
  if jsonb_typeof(personal_lagre_oppsett.oppsett) is distinct from 'object'
     or (select array_agg(k order by k) from jsonb_object_keys(personal_lagre_oppsett.oppsett) k) is distinct from array['enhet', 'regler'] then
    raise exception 'Oppsettet har feil form: det må ha enheten og reglene.' using errcode = '22023';
  end if;
  feil := personal.feltfeil(enhet, '{"timeZone": "string", "workYearStartMonth": "number", "hideWeekendsByDefault": "boolean"}', '{}', 'enheten');
  if cardinality(feil) = 0 and (enhet ->> 'workYearStartMonth') not in ('1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12') then
    feil := array['Arbeidsåret må starte i en måned fra 1 til 12.'];
  end if;
  if cardinality(feil) > 0 then
    raise exception '%', array_to_string(feil, ' ') using errcode = '22023';
  end if;
  feil := personal.oppsettfeil(regler);
  if cardinality(feil) > 0 then
    raise exception '%', array_to_string(feil, ' ') using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('personal.oppsett:' || personal_lagre_oppsett.fagmiljo::text, 0));
  forrige := personal.gjeldende_oppsett(personal_lagre_oppsett.fagmiljo);
  if forrige.versjon is distinct from personal_lagre_oppsett.forventet_versjon then
    raise exception 'Oppsettet er endret av en annen. Hent det på nytt.' using errcode = 'PT409';
  end if;
  select s into fjernet from personal.statuser_i_bruk(personal_lagre_oppsett.fagmiljo) s
  where not exists (select 1 from jsonb_array_elements(regler -> 'statuses') x where x ->> 'id' = s)
  order by s limit 1;
  if fjernet is not null then
    raise exception '«%» er i bruk og kan ikke fjernes.',
      coalesce((select x ->> 'name' from jsonb_array_elements(forrige.regler -> 'statuses') x where x ->> 'id' = fjernet limit 1), fjernet)
      using errcode = '22023';
  end if;

  -- I `repeatable read` ser kommandoen ikke en versjon som er lagret imens, og
  -- møter den først som en ny versjon med samme nummer: også det er en konflikt.
  begin
    insert into personal.oppsett (fagmiljo_id, versjon, gjelder_fra, tidssone, arbeidsaar_start, skjul_helg, regler, lagret_av)
    values (
      personal_lagre_oppsett.fagmiljo,
      coalesce(forrige.versjon, 0) + 1,
      (now() at time zone coalesce(forrige.tidssone, enhet ->> 'timeZone'))::date,
      enhet ->> 'timeZone',
      (enhet ->> 'workYearStartMonth')::smallint,
      (enhet -> 'hideWeekendsByDefault')::boolean,
      regler,
      aktor
    )
    returning * into ny;
  exception when unique_violation then
    raise exception 'Oppsettet er endret av en annen. Hent det på nytt.' using errcode = 'PT409';
  end;
  return personal.regelsett(ny);
end;
$$;

revoke all on function public.personal_lagre_oppsett(uuid, jsonb, integer) from public, anon, authenticated, service_role;
grant execute on function public.personal_lagre_oppsett(uuid, jsonb, integer) to authenticated;

-- Utpeker eller fjerner en vaktplanansvarlig (B3, K-TIL-5): bare lokal
-- administrator, og bare et eget aktivt medlem av fagmiljøet. Føres i
-- tilgangsloggen med en fast begrunnelse. Det som alt står, gir det samme
-- svaret uten å endre noe. Gir `{bruker, ansvarlig}`.
create function public.personal_sett_vaktplanansvarlig(fagmiljo uuid, bruker uuid, ansvarlig boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid;
begin
  perform personal.krev_tilgang(personal_sett_vaktplanansvarlig.fagmiljo, 'managePlanners');
  aktor := (select auth.uid());
  if personal_sett_vaktplanansvarlig.ansvarlig is null then
    raise exception 'Oppgi om brukeren skal være vaktplanansvarlig.' using errcode = '22023';
  end if;
  perform intern.las_tilgang(aktor, case when personal_sett_vaktplanansvarlig.ansvarlig
    then 'Personal: utpekt som vaktplanansvarlig' else 'Personal: ikke lenger vaktplanansvarlig' end);
  if personal_sett_vaktplanansvarlig.ansvarlig then
    if not intern.er_eget_medlem_i(personal_sett_vaktplanansvarlig.fagmiljo, personal_sett_vaktplanansvarlig.bruker) then
      raise exception 'Bare et aktivt medlem av fagmiljøet kan være vaktplanansvarlig.' using errcode = '22023';
    end if;
    -- En utpeking fra et tidligere medlemskap gjelder ikke lenger, og avsluttes først.
    update personal.vaktplanansvarlige v set til = now(), avsluttet_av = aktor
    where v.fagmiljo_id = personal_sett_vaktplanansvarlig.fagmiljo and v.bruker_id = personal_sett_vaktplanansvarlig.bruker and v.til is null
      and not personal.er_vaktplanansvarlig(v.fagmiljo_id, v.bruker_id);
    if not exists (
      select 1 from personal.vaktplanansvarlige v
      where v.fagmiljo_id = personal_sett_vaktplanansvarlig.fagmiljo and v.bruker_id = personal_sett_vaktplanansvarlig.bruker and v.til is null
    ) then
      insert into personal.vaktplanansvarlige (fagmiljo_id, bruker_id, tildelt_av)
      values (personal_sett_vaktplanansvarlig.fagmiljo, personal_sett_vaktplanansvarlig.bruker, aktor);
    end if;
  else
    update personal.vaktplanansvarlige v set til = now(), avsluttet_av = aktor
    where v.fagmiljo_id = personal_sett_vaktplanansvarlig.fagmiljo and v.bruker_id = personal_sett_vaktplanansvarlig.bruker and v.til is null;
  end if;
  return jsonb_build_object('bruker', personal_sett_vaktplanansvarlig.bruker, 'ansvarlig', personal_sett_vaktplanansvarlig.ansvarlig);
end;
$$;

revoke all on function public.personal_sett_vaktplanansvarlig(uuid, uuid, boolean) from public, anon, authenticated, service_role;
grant execute on function public.personal_sett_vaktplanansvarlig(uuid, uuid, boolean) to authenticated;

-- --- Rettighetene i skjemaet ----------------------------------------------------

-- Ingenting i `personal` kan kalles eller leses av API-rollene, heller ikke det
-- som lages senere.
revoke all on all functions in schema personal from public, anon, authenticated, service_role;
revoke all on all tables in schema personal from public, anon, authenticated, service_role;
alter default privileges in schema personal revoke execute on functions from public;
