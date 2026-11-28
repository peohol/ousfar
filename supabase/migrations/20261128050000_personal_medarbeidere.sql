-- Personalkalenderen P2c, databasedelen (#620, docs/personal.md §7.4, §8.3 og
-- §8.5, docs/personal-database.md «Medarbeiderne» og «Vis som»).
--
-- - Medarbeiderne 1:1 med medlemmene (B13, K-MED-1, K-MED-3). Utenfor et
--   testmiljø, fra den første dagen funksjonen `personal` ikke står av der
--   (og videre, også om den slås av igjen), er medarbeiderne i
--   kalenderen nøyaktig fagmiljøets aktive medlemmer, uten noen handling: et
--   nytt aktivt medlemskap gir en aktiv periode fra i dag, og et avsluttet
--   medlemskap avslutter perioden i dag. Etter den dagen er personen ute av
--   planleggingen: registreringene etter dagen fjernes (og logges), og
--   kvalifikasjonene avsluttes. Tidligere dager står. Et nytt medlemskap
--   senere gir en ny periode for den samme medarbeideren, uten kvalifikasjoner.
--   Navnet og stillingen leses fra profilen hver gang (K-MED-5).
-- - Medarbeiderinnstillingene (K-MED-2): kvalifikasjoner og vaktandel, for
--   vaktplanansvarlig og lokal administrator, bare fra i dag, med revisjon
--   mot samtidige endringer og et revisjonsspor. Vaktandelen holdes i
--   databasen med de samme reglene og meldingene som `validateDutySchedule` og
--   `changesPast` i `supabase/functions/_delt/personal/dutyShare.ts`.
-- - «Vis som» (K-SKJ-7): i et testmiljø kan den innloggede redusere sin egen
--   rolle i kalenderen og handle som én syntetisk medarbeider. Rollen regnes
--   på serveren, kan bare bli lavere, og simuleringen virker aldri i et
--   fagmiljø som ikke er testmiljø.
-- - Til B14 (#602): `personal.stilling_styrer_vakter(bruker)` sier i hvilke
--   fagmiljøer stillingen til brukeren styrer vaktene, så Dev kan kreve lokal
--   administrativ myndighet der.
--
-- Ingen personalopplysninger: ingen virkelige fagmiljøer har funksjonen på,
-- så ingen virkelige medarbeidere opprettes. Sandkasse er testmiljø og har
-- bare syntetiske medarbeidere.
--
-- Tilbakeføring: en ny migrasjon som fjerner utløserne på `public.medlemskap`,
-- `public.funksjonsbrytere` og `public.fagmiljoer`, de nye funksjonene i
-- `public` og tabellene `personal.medarbeiderperioder`, `personal.vaktandeler`,
-- `personal.tilknyttede_fagmiljoer`,
-- `personal.innstillingslogg` og `personal.vis_som`, og setter
-- `personal.rolle`, `personal.statusbrudd` og `public.personal_grunnlag`
-- tilbake.

-- --- Revisjonssporet for medarbeiderne -------------------------------------------

-- Hvem som endret hva for en medarbeider, og når: medlemskapet (en periode
-- begynner eller slutter), kvalifikasjonene og vaktandelen. Bare nye rader;
-- slettingen av en konto nuller `aktor` som i kalenderens logg.
create table personal.innstillingslogg (
  id bigint generated always as identity primary key,
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  medarbeider_id uuid not null references personal.medarbeidere (id),
  kl timestamptz not null default now(),
  aktor uuid references public.profiles (id) on delete set null,
  hva text not null,
  foer jsonb,
  etter jsonb,
  constraint innstillingslogg_hva check (hva in ('medlemskap', 'kvalifikasjoner', 'vaktandel'))
);

create index innstillingslogg_medarbeider_idx on personal.innstillingslogg (medarbeider_id, kl);

comment on table personal.innstillingslogg is
  'Revisjonssporet for medarbeiderne i personalkalenderen: medlemskap, kvalifikasjoner og vaktandel (docs/personal-database.md). Ingen rader endres eller fjernes.';

create trigger innstillingslogg_uendret
before update or delete on personal.innstillingslogg
for each row execute function personal.kontroller_endring();

create function personal.logg_innstilling(m personal.medarbeidere, hva text, foer jsonb, etter jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into personal.innstillingslogg (fagmiljo_id, medarbeider_id, aktor, hva, foer, etter)
  select m.fagmiljo_id, m.id, auth.uid(), logg_innstilling.hva, logg_innstilling.foer, logg_innstilling.etter
  where logg_innstilling.foer is distinct from logg_innstilling.etter
$$;

-- Revisjonen av innstillingene til en medarbeider, som klienten sender med
-- tilbake (`PT409` når noen andre har endret dem imens).
alter table personal.medarbeidere add column revisjon bigint not null default 1;

-- --- Periodene ----------------------------------------------------------------------

-- De aktive periodene til en virkelig medarbeider: fra dagen medlemskapet ble
-- aktivt, til og med dagen det ble avsluttet (tom: fortsatt aktiv). Høyst én
-- åpen og ingen overlapp. En syntetisk medarbeider har én periode, i
-- `aktiv_fra` og `aktiv_til`; for de virkelige er de to feltene den første og
-- den siste dagen (personal.md §8.5).
create table personal.medarbeiderperioder (
  id uuid primary key default gen_random_uuid(),
  medarbeider_id uuid not null references personal.medarbeidere (id),
  fra date not null,
  til date,
  constraint medarbeiderperioder_periode check (til is null or til >= fra)
);

create unique index medarbeiderperioder_en_apen_idx on personal.medarbeiderperioder (medarbeider_id) where til is null;
create index medarbeiderperioder_medarbeider_idx on personal.medarbeiderperioder (medarbeider_id, fra);

comment on table personal.medarbeiderperioder is
  'Periodene en virkelig medarbeider er aktiv i personalkalenderen, etter medlemskapet i fagmiljøet (docs/personal.md §8.5).';

-- Bare for virkelige medarbeidere, uten overlapp, og uten å endre tidligere
-- dager: `fra` står fast, og `til` flyttes bare for i dag og senere (en
-- periode avsluttet i dag kan åpnes igjen samme dag).
create function personal.kontroller_medarbeiderperiode()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m personal.medarbeidere;
  dag date;
begin
  select * into m from personal.medarbeidere x where x.id = coalesce(new.medarbeider_id, old.medarbeider_id) for update;
  dag := personal.i_dag(m.fagmiljo_id);
  if tg_op = 'DELETE' then
    raise exception 'En aktiv periode kan ikke fjernes.' using errcode = '42501';
  end if;
  if m.bruker_id is null then
    raise exception 'En syntetisk medarbeider har ingen medlemskapsperioder.' using errcode = '23514';
  end if;
  if tg_op = 'INSERT' and new.fra < dag then
    raise exception 'En aktiv periode kan ikke begynne før i dag.' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' and (new.medarbeider_id <> old.medarbeider_id or new.fra <> old.fra
     or (old.til is not null and old.til < dag) or (new.til is not null and new.til < dag)) then
    raise exception 'Tidligere dager i en aktiv periode kan ikke endres.' using errcode = '42501';
  end if;
  if exists (
    select 1 from personal.medarbeiderperioder p
    where p.medarbeider_id = new.medarbeider_id and p.id <> new.id
      and p.fra <= coalesce(new.til, 'infinity'::date) and new.fra <= coalesce(p.til, 'infinity'::date)
  ) then
    raise exception 'De aktive periodene til en medarbeider kan ikke overlappe.' using errcode = '23P01';
  end if;
  return new;
end;
$$;

create trigger medarbeiderperioder_kontroll
before insert or update or delete on personal.medarbeiderperioder
for each row execute function personal.kontroller_medarbeiderperiode();

-- Er medarbeideren aktiv på dagen?
create function personal.aktiv_paa(m personal.medarbeidere, dag date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when m.bruker_id is null then dag >= m.aktiv_fra and (m.aktiv_til is null or dag <= m.aktiv_til)
    else exists (
      select 1 from personal.medarbeiderperioder p
      where p.medarbeider_id = m.id and p.fra <= dag and (p.til is null or dag <= p.til)
    )
  end
$$;

-- Er medarbeideren med i planleggingen etter dagen? Den som har sin siste
-- dag i dag, er ute av den fremtidige planleggingen, og innstillingene kan
-- ikke lenger endres.
create function personal.aktiv_fremover(m personal.medarbeidere, dag date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when m.bruker_id is null then m.aktiv_til is null or m.aktiv_til > dag
    else exists (select 1 from personal.medarbeiderperioder p where p.medarbeider_id = m.id and (p.til is null or p.til > dag))
  end
$$;

-- Periodene som JSON: `[{fra, til}]`, eldst først.
create function personal.perioder_json(m personal.medarbeidere)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when m.bruker_id is null then jsonb_build_array(jsonb_build_object('fra', m.aktiv_fra, 'til', m.aktiv_til))
    else coalesce((
      select jsonb_agg(jsonb_build_object('fra', p.fra, 'til', p.til) order by p.fra)
      from personal.medarbeiderperioder p where p.medarbeider_id = m.id
    ), '[]'::jsonb)
  end
$$;

-- --- 1:1 med medlemmene (B13) -------------------------------------------------------

-- Knytter kalenderen medlemmene til seg i fagmiljøet? Utenfor et testmiljø,
-- når funksjonen ikke står av. Et testmiljø har bare syntetiske medarbeidere
-- (K-SKJ-9).
create function personal.knytter_medlemmer(fagmiljo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select not f.testmiljo from public.fagmiljoer f where f.id = knytter_medlemmer.fagmiljo), false)
    and intern.funksjonstilstand('personal', knytter_medlemmer.fagmiljo) <> 'av'
$$;

-- Fagmiljøene der kalenderen har knyttet medlemmene til seg, fra den første
-- dagen funksjonen ikke sto av. Derfra følges medlemskapene uten opphold, også
-- om funksjonen slås av igjen, så periodene alltid er de faktiske og ingen
-- avslutning eller ny innmelding går tapt mens den står av. Et fagmiljø der
-- funksjonen aldri har vært i bruk, får ingen rad og ingen medarbeidere. Bare
-- nye rader; hva som skjer med historikken senere, avgjøres med B9.
create table personal.tilknyttede_fagmiljoer (
  fagmiljo_id uuid primary key references public.fagmiljoer (id),
  fra date not null,
  kl timestamptz not null default now()
);

comment on table personal.tilknyttede_fagmiljoer is
  'Fagmiljøene der personalkalenderen følger medlemskapene, fra den første dagen funksjonen ikke sto av (docs/personal-database.md, «1:1 med medlemmene»).';

create function personal.kontroller_tilknytning()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Tilknytningen kan ikke endres eller fjernes.' using errcode = '42501';
end;
$$;

create trigger tilknyttede_fagmiljoer_uendret
before update or delete on personal.tilknyttede_fagmiljoer
for each row execute function personal.kontroller_tilknytning();

-- Fører fagmiljøet inn som tilknyttet, første gang funksjonen ikke står av der.
create function personal.tilknytt(fagmiljo uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into personal.tilknyttede_fagmiljoer (fagmiljo_id, fra)
  select tilknytt.fagmiljo, personal.i_dag(tilknytt.fagmiljo)
  where personal.knytter_medlemmer(tilknytt.fagmiljo)
  on conflict (fagmiljo_id) do nothing
$$;

-- Følger kalenderen medlemskapene i fagmiljøet? Utenfor et testmiljø, når
-- funksjonen ikke står av eller har vært i bruk der før.
create function personal.folger_medlemmer(fagmiljo uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select personal.knytter_medlemmer(folger_medlemmer.fagmiljo)
    or (
      coalesce((select not f.testmiljo from public.fagmiljoer f where f.id = folger_medlemmer.fagmiljo), false)
      and exists (select 1 from personal.tilknyttede_fagmiljoer t where t.fagmiljo_id = folger_medlemmer.fagmiljo)
    )
$$;

-- Bringer medarbeideren for brukeren i fagmiljøet i takt med medlemskapet:
-- aktivt medlemskap gir en åpen periode fra i dag; uten aktivt medlemskap
-- avsluttes en åpen periode i dag, registreringene etter dagen fjernes og
-- kvalifikasjonene avsluttes. Gjør ingenting der kalenderen ikke følger
-- medlemskapene (`personal.folger_medlemmer`). Kjøres fra utløserne under, i
-- transaksjonen som endrer medlemskapet, bryteren eller testmerkingen. Oppsettet låses eksklusivt, så
-- endringene i kalenderen og innstillingene, som tar det delt, venter på
-- medlemskapsendringen og kontrolleres mot den, eller er ferdige før den og
-- ryddes av den. Det holder også når medlemskapet endres uten den felles
-- tilgangslåsen (som tas først, og alltid før oppsettet).
create function personal.synk_medarbeider(fagmiljo uuid, bruker uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  dag date;
  aktiv boolean;
  m personal.medarbeidere;
  siste personal.medarbeiderperioder;
begin
  if not personal.folger_medlemmer(synk_medarbeider.fagmiljo) then
    return;
  end if;
  perform personal.las_oppsett(synk_medarbeider.fagmiljo, true);
  dag := personal.i_dag(synk_medarbeider.fagmiljo);
  perform personal.tilknytt(synk_medarbeider.fagmiljo);
  aktiv := intern.er_eget_medlem_i(synk_medarbeider.fagmiljo, synk_medarbeider.bruker);
  select * into m from personal.medarbeidere x
  where x.fagmiljo_id = synk_medarbeider.fagmiljo and x.bruker_id = synk_medarbeider.bruker
  for update;
  if not found then
    if not aktiv then
      return;
    end if;
    insert into personal.medarbeidere (fagmiljo_id, bruker_id, aktiv_fra)
    values (synk_medarbeider.fagmiljo, synk_medarbeider.bruker, dag)
    returning * into m;
  end if;
  select * into siste from personal.medarbeiderperioder p where p.medarbeider_id = m.id order by p.fra desc limit 1;

  if aktiv then
    if siste.id is not null and siste.til is null then
      return;
    end if;
    if siste.id is not null and siste.til >= dag then
      -- Avsluttet i dag og aktiv igjen samme dag: samme periode.
      update personal.medarbeiderperioder p set til = null where p.id = siste.id;
    else
      insert into personal.medarbeiderperioder (medarbeider_id, fra) values (m.id, dag);
    end if;
    update personal.medarbeidere x set aktiv_til = null where x.id = m.id;
    perform personal.logg_innstilling(m, 'medlemskap', jsonb_build_object('aktiv', false), jsonb_build_object('aktiv', true, 'fra', dag));
    return;
  end if;

  if siste.id is null or siste.til is not null then
    return;
  end if;
  update personal.medarbeiderperioder p set til = dag where p.id = siste.id;
  update personal.medarbeidere x set aktiv_til = dag where x.id = m.id;
  -- Ute av den fremtidige planleggingen: vakter og statuser etter dagen
  -- fjernes (og står i kalenderens logg), og kvalifikasjonene avsluttes, så et
  -- nytt medlemskap senere begynner uten.
  delete from personal.oppforinger o where o.medarbeider_id = m.id and o.dato > dag;
  delete from personal.kvalifikasjoner k where k.medarbeider_id = m.id and k.fra > dag;
  update personal.kvalifikasjoner k set til = dag where k.medarbeider_id = m.id and (k.til is null or k.til > dag);
  update personal.medarbeidere x set revisjon = x.revisjon + 1 where x.id = m.id;
  perform personal.logg_innstilling(m, 'medlemskap', jsonb_build_object('aktiv', true), jsonb_build_object('aktiv', false, 'til', dag));
end;
$$;

-- Alle i fagmiljøet: de aktive medlemmene og de med en åpen periode.
create function personal.synk_fagmiljo(fagmiljo uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  select personal.tilknytt(synk_fagmiljo.fagmiljo);
  select personal.synk_medarbeider(synk_fagmiljo.fagmiljo, b.bruker_id)
  from (
    select m.bruker_id from public.medlemskap m where m.fagmiljo_id = synk_fagmiljo.fagmiljo and m.status = 'aktiv'
    union
    select x.bruker_id from personal.medarbeidere x
    join personal.medarbeiderperioder p on p.medarbeider_id = x.id and p.til is null
    where x.fagmiljo_id = synk_fagmiljo.fagmiljo
  ) b
  order by b.bruker_id
$$;

create function personal.medlemskap_endret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform personal.synk_medarbeider(coalesce(new.fagmiljo_id, old.fagmiljo_id), coalesce(new.bruker_id, old.bruker_id));
  return null;
end;
$$;

create trigger medlemskap_personal
after insert or update of status or delete on public.medlemskap
for each row execute function personal.medlemskap_endret();

create function personal.funksjonsbryter_endret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform personal.synk_fagmiljo(new.fagmiljo_id);
  return null;
end;
$$;

create trigger funksjonsbrytere_personal
after insert or update of tilstand on public.funksjonsbrytere
for each row when (new.funksjon = 'personal')
execute function personal.funksjonsbryter_endret();

-- Et fagmiljø som slutter å være testmiljø eller blir aktivt igjen, kan få
-- funksjonen på; et som slutter å være testmiljø, mister «Vis som».
create function personal.fagmiljo_endret()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.testmiljo then
    delete from personal.vis_som v where v.fagmiljo_id = new.id;
  end if;
  perform personal.synk_fagmiljo(new.id);
  return null;
end;
$$;

create trigger fagmiljoer_personal_medlemmer
after update of testmiljo, status on public.fagmiljoer
for each row when (old.testmiljo is distinct from new.testmiljo or old.status is distinct from new.status)
execute function personal.fagmiljo_endret();

-- Til B14 (#602, Dev): fagmiljøene der stillingen til brukeren styrer
-- vaktene, altså der brukeren er aktiv medarbeider og kalenderen knytter
-- medlemmene til seg. Er det noen, krever en endring av stillingen lokal
-- administrativ myndighet i hvert av dem.
create function personal.stilling_styrer_vakter(bruker uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct x.fagmiljo_id
  from personal.medarbeidere x
  join personal.medarbeiderperioder p on p.medarbeider_id = x.id and p.til is null
  where x.bruker_id = stilling_styrer_vakter.bruker and personal.knytter_medlemmer(x.fagmiljo_id)
$$;

comment on function personal.stilling_styrer_vakter(uuid) is
  'Fagmiljøene der brukerens stilling styrer vaktene i personalkalenderen (B14, #602): krever lokal administrativ myndighet i hvert av dem for å endre stillingen.';

-- Kalenderreglenes brudd (P2b) med de aktive periodene: som før, men en
-- virkelig medarbeider er bare registrert i periodene sine.
create or replace function personal.statusbrudd(m personal.medarbeidere, dag date, status text, tid_ok boolean, merknad text, samme boolean)
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
  if not personal.aktiv_paa(m, dag) then
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

-- Og rett i tabellen: en ny registrering eller en ny status bare på en dag
-- medarbeideren er med. Utløseren kjøres etter `oppforinger_for`, som har låst
-- oppsettet og datoen, så den ser en avsluttet periode som ble lagret mens den
-- ventet (medlemskapsendringen låser oppsettet eksklusivt).
create function personal.kontroller_aktiv_oppforing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  m personal.medarbeidere;
begin
  if tg_op = 'UPDATE' and new.status_id = old.status_id then
    return new;
  end if;
  select * into m from personal.medarbeidere x where x.id = new.medarbeider_id;
  if not personal.aktiv_paa(m, new.dato) then
    raise exception '% var ikke registrert som medarbeider denne dagen.', personal.medarbeidernavn(m) using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger oppforinger_medarbeider_aktiv
before insert or update of status_id on personal.oppforinger
for each row execute function personal.kontroller_aktiv_oppforing();

-- --- Vaktandelen (§6.2) ------------------------------------------------------------

-- Feilene i en vaktandel `{ordinary: [{from, percent}], temporary: [{id, from,
-- to, percent}]}` (`DutyShareSchedule`), med de samme meldingene i den samme
-- rekkefølgen som `validateDutySchedule`. Strengere enn typene på formen: bare
-- de feltene, datoer på formen ÅÅÅÅ-MM-DD, ID-er på høyst 60 tegn og høyst
-- 100 elementer i hver liste.
create function personal.vaktandelfeil(plan jsonb)
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  feil text[] := '{}';
  x jsonb;
  forrige_til text;
  sist text := '';
  ider text[] := '{}';
  dato_form constant text := '^\d{4}-\d{2}-\d{2}$';
begin
  if jsonb_typeof(plan) is distinct from 'object'
     or (select array_agg(k order by k) from jsonb_object_keys(plan) k) is distinct from array['ordinary', 'temporary']
     or jsonb_typeof(plan -> 'ordinary') is distinct from 'array' or jsonb_typeof(plan -> 'temporary') is distinct from 'array'
     or jsonb_array_length(plan -> 'ordinary') > 100 or jsonb_array_length(plan -> 'temporary') > 100
     or exists (
       select 1 from jsonb_array_elements(plan -> 'ordinary') o
       where jsonb_typeof(o) is distinct from 'object'
         or (select array_agg(k order by k) from jsonb_object_keys(o) k) is distinct from array['from', 'percent']
         or jsonb_typeof(o -> 'from') is distinct from 'string' or (o ->> 'from') !~ dato_form
     )
     or exists (
       select 1 from jsonb_array_elements(plan -> 'temporary') t
       where jsonb_typeof(t) is distinct from 'object'
         or (select array_agg(k order by k) from jsonb_object_keys(t) k) is distinct from array['from', 'id', 'percent', 'to']
         or jsonb_typeof(t -> 'id') is distinct from 'string' or char_length(t ->> 'id') > 60
         or jsonb_typeof(t -> 'from') is distinct from 'string' or (t ->> 'from') !~ dato_form
         or jsonb_typeof(t -> 'to') is distinct from 'string' or (t ->> 'to') !~ dato_form
     ) then
    return array['Vaktandelen har feil form.'];
  end if;

  for x in select o from jsonb_array_elements(plan -> 'ordinary') with ordinality y (o, n) order by n loop
    if personal.som_dato(x ->> 'from') is null then
      feil := feil || 'En ordinær vaktandel mangler gyldig dato.'::text;
    elsif (x ->> 'from') collate "C" <= sist collate "C" then
      feil := feil || 'To ordinære vaktandeler kan ikke gjelde fra samme dato.'::text;
    end if;
    sist := x ->> 'from';
    if not personal.er_prosent(x -> 'percent') then
      feil := feil || 'Vaktandelen må være et helt tall mellom 0 og 100 %.'::text;
    end if;
  end loop;

  for x in select t from jsonb_array_elements(plan -> 'temporary') with ordinality y (t, n) order by t ->> 'from' collate "C", n loop
    if (x ->> 'id') = '' or (x ->> 'id') = any (ider) then
      feil := feil || 'En midlertidig periode mangler en entydig ID.'::text;
    end if;
    ider := ider || (x ->> 'id');
    if personal.som_dato(x ->> 'from') is null or personal.som_dato(x ->> 'to') is null then
      feil := feil || 'En midlertidig periode mangler gyldige datoer.'::text;
    elsif (x ->> 'to') collate "C" < (x ->> 'from') collate "C" then
      feil := feil || 'Tildatoen må være på eller etter fradatoen.'::text;
    end if;
    if not personal.er_prosent(x -> 'percent') then
      feil := feil || 'Vaktandelen må være et helt tall mellom 0 og 100 %.'::text;
    end if;
    if forrige_til is not null and (x ->> 'from') collate "C" <= forrige_til collate "C" then
      feil := feil || 'Midlertidige perioder kan ikke overlappe hverandre.'::text;
    end if;
    forrige_til := x ->> 'to';
  end loop;

  return array(select f from unnest(feil) with ordinality u (f, n) group by f order by min(n));
end;
$$;

-- Et helt antall prosent fra 0 til 100 (`isPercent`).
create function personal.er_prosent(v jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select personal.er_heltall(v) and (v #>> '{}')::numeric between 0 and 100
$$;

-- Vaktandelen i prosent på datoen (`dutySharePercentAt`): den midlertidige
-- perioden som gjelder, ellers den siste ordinære fra før datoen, ellers 100.
create function personal.vaktandel_paa(plan jsonb, dato date)
returns integer
language sql
immutable
set search_path = ''
as $$
  select coalesce(
    (select (t ->> 'percent')::integer from jsonb_array_elements(plan -> 'temporary') t
     where (t ->> 'from')::date <= dato and dato <= (t ->> 'to')::date limit 1),
    (select (o ->> 'percent')::integer from jsonb_array_elements(plan -> 'ordinary') with ordinality y (o, n)
     where (o ->> 'from')::date <= dato order by n desc limit 1),
    100
  )
$$;

-- Endrer den nye vaktandelen verdien for en dag før i dag (`changesPast`)?
-- Begge er stykkevis konstante, så det holder å sammenligne i startpunktet og
-- i hvert punkt der en av dem kan endre seg.
create function personal.vaktandel_endrer_fortid(foer jsonb, etter jsonb, i_dag date)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1
    from (
      select '0001-01-01'::date as d
      union select (o ->> 'from')::date from jsonb_array_elements(foer -> 'ordinary') o
      union select (o ->> 'from')::date from jsonb_array_elements(etter -> 'ordinary') o
      union select (t ->> 'from')::date from jsonb_array_elements(foer -> 'temporary') t
      union select (t ->> 'from')::date from jsonb_array_elements(etter -> 'temporary') t
      union select (t ->> 'to')::date + 1 from jsonb_array_elements(foer -> 'temporary') t
      union select (t ->> 'to')::date + 1 from jsonb_array_elements(etter -> 'temporary') t
    ) punkt
    where punkt.d < vaktandel_endrer_fortid.i_dag
      and personal.vaktandel_paa(foer, punkt.d) <> personal.vaktandel_paa(etter, punkt.d)
  )
$$;

-- Vaktandelen per medarbeider. Uten rad gjelder 100 %. Databasen holder
-- reglene i §6.2: 0–100 %, ingen overlapp (`vaktandelfeil`), og ingen endring
-- av en dag før i dag, heller ikke utenom kommandoen.
create table personal.vaktandeler (
  medarbeider_id uuid primary key references personal.medarbeidere (id),
  plan jsonb not null,
  constraint vaktandeler_gyldig check (personal.vaktandelfeil(plan) = '{}')
);

comment on table personal.vaktandeler is
  'Vaktandelen til en medarbeider over tid (DutyShareSchedule, docs/personal.md §6.2). Tidligere dager kan ikke endres.';

-- Meldingen når en endring ville gjort det (`PAST_CHANGE_MESSAGE`).
create function personal.vaktandel_fortidsmelding()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'Vaktandelen for tidligere dager kan ikke endres, så tidligere forventet vaktbelastning ikke skrives om. Velg en dato i dag eller senere.'::text
$$;

create function personal.kontroller_vaktandel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  tom constant jsonb := '{"ordinary": [], "temporary": []}';
  m personal.medarbeidere;
begin
  select * into m from personal.medarbeidere x where x.id = coalesce(new.medarbeider_id, old.medarbeider_id);
  if tg_op = 'UPDATE' and new.medarbeider_id <> old.medarbeider_id then
    raise exception 'Vaktandelen kan ikke flyttes til en annen medarbeider.' using errcode = '42501';
  end if;
  if personal.vaktandel_endrer_fortid(
    case when tg_op = 'INSERT' then tom else old.plan end,
    case when tg_op = 'DELETE' then tom else new.plan end,
    personal.i_dag(m.fagmiljo_id)
  ) then
    raise exception '%', personal.vaktandel_fortidsmelding() using errcode = '22023';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger vaktandeler_kontroll
before insert or update or delete on personal.vaktandeler
for each row execute function personal.kontroller_vaktandel();

-- --- Innstillingene ---------------------------------------------------------------

-- Kvalifikasjonene medarbeideren har på dagen, sortert.
create function personal.kvalifikasjoner_paa(medarbeider uuid, dag date)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct k.status_id order by k.status_id), '{}')
  from personal.kvalifikasjoner k
  where k.medarbeider_id = kvalifikasjoner_paa.medarbeider and k.fra <= kvalifikasjoner_paa.dag and (k.til is null or k.til >= kvalifikasjoner_paa.dag)
$$;

-- Innstillingene til en medarbeider slik planleggerne får dem.
create function personal.innstillinger_json(m personal.medarbeidere)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', m.id,
    'revisjon', m.revisjon,
    'kvalifikasjoner', coalesce((
      select jsonb_agg(jsonb_build_object('status', k.status_id, 'fra', k.fra, 'til', k.til) order by k.status_id, k.fra)
      from personal.kvalifikasjoner k where k.medarbeider_id = m.id
    ), '[]'::jsonb),
    'vaktandel', coalesce((select v.plan from personal.vaktandeler v where v.medarbeider_id = m.id), '{"ordinary": [], "temporary": []}'::jsonb)
  )
$$;

-- Låser medarbeideren for en endring av innstillingene: den må finnes i
-- fagmiljøet, være med i planleggingen fra i dag, og ha revisjonen klienten
-- så. Oppsettet låses delt først, som i kalenderen.
create function personal.las_medarbeider(fagmiljo uuid, medarbeider uuid, forventet_revisjon bigint)
returns personal.medarbeidere
language plpgsql
security definer
set search_path = ''
as $$
declare
  m personal.medarbeidere;
begin
  perform personal.las_oppsett(las_medarbeider.fagmiljo);
  select * into m from personal.medarbeidere x
  where x.id = las_medarbeider.medarbeider and x.fagmiljo_id = las_medarbeider.fagmiljo
  for update;
  if not found then
    raise exception 'Ukjent medarbeider.' using errcode = '22023';
  end if;
  -- Avsluttet først: det sier mer enn en konflikt, og står også etter en ny henting.
  if not personal.aktiv_fremover(m, personal.i_dag(m.fagmiljo_id)) then
    raise exception '% er ikke lenger medarbeider.', personal.medarbeidernavn(m) using errcode = '22023';
  end if;
  if m.revisjon is distinct from las_medarbeider.forventet_revisjon then
    raise exception 'Medarbeideren er endret av en annen siden den ble hentet. Hent den på nytt.' using errcode = 'PT409';
  end if;
  return m;
end;
$$;

-- Setter hvilke bemanningsoppgaver medarbeideren kan ta, fra i dag (§7.4,
-- K-MED-2): en ny kvalifikasjon gjelder fra i dag, en som fjernes, gjelder til
-- og med i går. Tidligere dager står. Bare oppgaver som krever kvalifikasjon og
-- er aktive i dagens regler, kan legges til; alle kan fjernes. `statuser` er
-- hele lista som skal gjelde, `forventet_revisjon` revisjonen klienten så.
-- Gir innstillingene etter endringen.
create function public.personal_sett_kvalifikasjoner(fagmiljo uuid, medarbeider uuid, statuser jsonb, forventet_revisjon bigint)
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
begin
  perform personal.krev_skrivetilgang(personal_sett_kvalifikasjoner.fagmiljo, 'editPeople');
  if jsonb_typeof(statuser) is distinct from 'array' or jsonb_array_length(statuser) > 60
     or exists (select 1 from jsonb_array_elements(statuser) x where jsonb_typeof(x) is distinct from 'string') then
    raise exception 'Kvalifikasjonene må være en liste med oppgaver.' using errcode = '22023';
  end if;
  ny := array(select distinct x from jsonb_array_elements_text(statuser) x order by 1);
  m := personal.las_medarbeider(personal_sett_kvalifikasjoner.fagmiljo, personal_sett_kvalifikasjoner.medarbeider, personal_sett_kvalifikasjoner.forventet_revisjon);
  dag := personal.i_dag(m.fagmiljo_id);
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

  if ny is distinct from naa then
    update personal.medarbeidere x set revisjon = x.revisjon + 1 where x.id = m.id returning * into m;
    perform personal.logg_innstilling(m, 'kvalifikasjoner', to_jsonb(naa), to_jsonb(ny));
  end if;
  return personal.innstillinger_json(m);
end;
$$;

comment on function public.personal_sett_kvalifikasjoner(uuid, uuid, jsonb, bigint) is
  'Hvilke bemanningsoppgaver en medarbeider kan ta, fra i dag, for vaktplanansvarlig og lokal administrator (docs/personal-database.md).';

-- Lagrer vaktandelen til medarbeideren (§6.2): hele tidsplanen, som
-- `DutyShareSchedule`. Den må være gyldig (`validateDutySchedule`) og kan ikke
-- endre vaktandelen for en dag før i dag (`changesPast`). Gir innstillingene
-- etter endringen.
create function public.personal_lagre_vaktandel(fagmiljo uuid, medarbeider uuid, vaktandel jsonb, forventet_revisjon bigint)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  m personal.medarbeidere;
  feil text[];
  foer jsonb;
begin
  perform personal.krev_skrivetilgang(personal_lagre_vaktandel.fagmiljo, 'editDutyShare');
  feil := personal.vaktandelfeil(personal_lagre_vaktandel.vaktandel);
  if cardinality(feil) > 0 then
    raise exception '%', array_to_string(feil, ' ') using errcode = '22023';
  end if;
  m := personal.las_medarbeider(personal_lagre_vaktandel.fagmiljo, personal_lagre_vaktandel.medarbeider, personal_lagre_vaktandel.forventet_revisjon);
  foer := coalesce((select v.plan from personal.vaktandeler v where v.medarbeider_id = m.id), '{"ordinary": [], "temporary": []}'::jsonb);
  if personal.vaktandel_endrer_fortid(foer, personal_lagre_vaktandel.vaktandel, personal.i_dag(m.fagmiljo_id)) then
    raise exception '%', personal.vaktandel_fortidsmelding() using errcode = '22023';
  end if;
  if foer is distinct from personal_lagre_vaktandel.vaktandel then
    -- Ikke `on conflict`: utløseren for en innsetting ville da prøvd planen
    -- mot en tom plan før konflikten. Medarbeideren er låst, så ingen andre
    -- setter inn imens.
    update personal.vaktandeler v set plan = personal_lagre_vaktandel.vaktandel where v.medarbeider_id = m.id;
    if not found then
      insert into personal.vaktandeler (medarbeider_id, plan) values (m.id, personal_lagre_vaktandel.vaktandel);
    end if;
    update personal.medarbeidere x set revisjon = x.revisjon + 1 where x.id = m.id returning * into m;
    perform personal.logg_innstilling(m, 'vaktandel', foer, personal_lagre_vaktandel.vaktandel);
  end if;
  return personal.innstillinger_json(m);
end;
$$;

comment on function public.personal_lagre_vaktandel(uuid, uuid, jsonb, bigint) is
  'Vaktandelen til en medarbeider, bare fra i dag og fremover, for vaktplanansvarlig og lokal administrator (docs/personal-database.md).';

-- De aktive medlemmene av fagmiljøet, for den lokale administratoren som
-- utpeker vaktplanansvarlige (B3): `[{bruker, navn, vaktplanansvarlig}]`. I
-- ordinær drift er det de samme som medarbeiderne; i et testmiljø er det
-- kontoene som prøver kalenderen.
create function public.personal_medlemmer(fagmiljo uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform personal.krev_tilgang(personal_medlemmer.fagmiljo, 'managePlanners');
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'bruker', x.bruker_id,
      'navn', x.navn,
      'vaktplanansvarlig', personal.er_vaktplanansvarlig(personal_medlemmer.fagmiljo, x.bruker_id)
    ) order by x.navn, x.bruker_id)
    from (
      select m.bruker_id, coalesce(nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), ''), p.username) as navn
      from public.medlemskap m join public.profiles p on p.id = m.bruker_id
      where m.fagmiljo_id = personal_medlemmer.fagmiljo and m.status = 'aktiv'
    ) x
  ), '[]'::jsonb);
end;
$$;

comment on function public.personal_medlemmer(uuid) is
  'De aktive medlemmene av fagmiljøet og om de er vaktplanansvarlige, for lokal administrator (docs/personal-database.md).';

-- --- «Vis som» (K-SKJ-7) -----------------------------------------------------------

-- Hvordan den innloggede prøver kalenderen i et testmiljø: en lavere rolle
-- (`rolle`) og/eller én bestemt syntetisk medarbeider (`medarbeider`), for
-- eksempel for å prøve egne statuser. Én rad per bruker og fagmiljø. Gjelder
-- bare i et testmiljø; raden fjernes når fagmiljøet slutter å være det.
create table personal.vis_som (
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  rolle text,
  medarbeider_id uuid,
  endret_kl timestamptz not null default now(),
  primary key (bruker_id, fagmiljo_id),
  constraint vis_som_medarbeider foreign key (medarbeider_id, fagmiljo_id) references personal.medarbeidere (id, fagmiljo_id),
  constraint vis_som_rolle check (rolle in ('reader', 'planner', 'localAdmin')),
  constraint vis_som_noe check (rolle is not null or medarbeider_id is not null)
);

comment on table personal.vis_som is
  '«Vis som» i personalkalenderen: lavere rolle og/eller én syntetisk medarbeider, bare i et testmiljø (docs/personal.md K-SKJ-7).';

create function personal.kontroller_vis_som()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not coalesce((select f.testmiljo from public.fagmiljoer f where f.id = new.fagmiljo_id), false) then
    raise exception '«Vis som» finnes bare i et testmiljø.' using errcode = '23514';
  end if;
  if new.medarbeider_id is not null
     and not exists (select 1 from personal.medarbeidere m where m.id = new.medarbeider_id and m.syntetisk_navn is not null) then
    raise exception '«Vis som» gjelder bare syntetiske medarbeidere.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger vis_som_kontroll
before insert or update on personal.vis_som
for each row execute function personal.kontroller_vis_som();

-- Rekkefølgen på rollene: en simulering kan bare gå nedover.
create function personal.rolle_rang(rolle text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case rolle when 'reader' then 1 when 'planner' then 2 when 'localAdmin' then 3 end
$$;

-- Den virkelige rollen (P2b): funksjonsbryteren, så lokal administrator,
-- vaktplanansvarlig, ellers kollega.
create function personal.reell_rolle(fagmiljo uuid, bruker uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.funksjon_tilgjengelig('personal', reell_rolle.fagmiljo, reell_rolle.bruker) then null
    when reell_rolle.fagmiljo in (select intern.administrerte_fagmiljoer(reell_rolle.bruker)) then 'localAdmin'
    when personal.er_vaktplanansvarlig(reell_rolle.fagmiljo, reell_rolle.bruker) then 'planner'
    else 'reader'
  end
$$;

comment on function personal.reell_rolle(uuid, uuid) is
  'Den virkelige rollen i personalkalenderen, uten «Vis som»: localAdmin, planner, reader, eller null uten funksjonen (docs/personal.md §8.4).';

-- Rollen alle kontrollene bruker: den virkelige, eller den lavere rollen fra
-- «Vis som» i et testmiljø. Aldri høyere enn den virkelige, og aldri noe uten
-- funksjonen.
create or replace function personal.rolle(fagmiljo uuid, bruker uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when r.reell is null then null
    when v.rolle is not null and personal.rolle_rang(v.rolle) < personal.rolle_rang(r.reell) then v.rolle
    else r.reell
  end
  from (select personal.reell_rolle(rolle.fagmiljo, rolle.bruker) as reell) r
  left join personal.vis_som v
    on v.bruker_id = rolle.bruker and v.fagmiljo_id = rolle.fagmiljo
    and exists (select 1 from public.fagmiljoer f where f.id = rolle.fagmiljo and f.testmiljo)
$$;

comment on function personal.rolle(uuid, uuid) is
  'Rollen i personalkalenderen etter «Vis som» (bare lavere, bare i testmiljø): localAdmin, planner, reader, eller null uten funksjonen (docs/personal.md §8.4, K-SKJ-7).';

-- Medarbeideren den innloggede er i kalenderen: i ordinær drift sin egen
-- (1:1), i et testmiljø den syntetiske medarbeideren fra «Vis som», ellers
-- ingen.
create function personal.meg(fagmiljo uuid, bruker uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when (select f.testmiljo from public.fagmiljoer f where f.id = meg.fagmiljo) then (
      select v.medarbeider_id from personal.vis_som v where v.bruker_id = meg.bruker and v.fagmiljo_id = meg.fagmiljo
    )
    else (select m.id from personal.medarbeidere m where m.fagmiljo_id = meg.fagmiljo and m.bruker_id = meg.bruker)
  end
$$;

-- «Vis som» for den innloggede: `rolle` (kollega, vaktplanansvarlig eller
-- lokal administrator, høyst den virkelige rollen) og/eller én syntetisk
-- medarbeider; begge tomme slår simuleringen av. Bare i et testmiljø: ellers
-- svarer den som om den ikke fantes. Gir `{rolle, reell_rolle, vis_som, meg}`.
create function public.personal_vis_som(fagmiljo uuid, rolle text, medarbeider uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  aktor constant uuid := (select auth.uid());
  reell text;
begin
  -- Valget endrer rollen alle kommandoene kontrollerer, så det tas som de
  -- andre tilgangsendringene: med den felles tilgangslåsen eksklusivt og bare
  -- i read committed (`25001` ellers). Kommandoene tar låsen delt før porten,
  -- så en som er i gang, er ferdig først, og en som venter, kontrolleres mot
  -- den nye rollen. Tilgangen, testmiljøet og rollen kontrolleres etter låsen.
  perform intern.las_tilgang(aktor, 'Personal: «Vis som» endret');
  perform personal.krev_tilgang(personal_vis_som.fagmiljo, 'view');
  if not coalesce((select f.testmiljo from public.fagmiljoer f where f.id = personal_vis_som.fagmiljo), false) then
    raise exception 'Finnes ikke.' using errcode = 'P0002';
  end if;
  reell := personal.reell_rolle(personal_vis_som.fagmiljo, aktor);
  if personal_vis_som.rolle is not null and personal.rolle_rang(personal_vis_som.rolle) is null then
    raise exception 'Ukjent rolle.' using errcode = '22023';
  end if;
  if personal.rolle_rang(personal_vis_som.rolle) > personal.rolle_rang(reell) then
    raise exception 'Med «Vis som» kan du bare få færre rettigheter enn du har.' using errcode = '42501';
  end if;
  if personal_vis_som.medarbeider is not null and not exists (
    select 1 from personal.medarbeidere m
    where m.id = personal_vis_som.medarbeider and m.fagmiljo_id = personal_vis_som.fagmiljo and m.syntetisk_navn is not null
  ) then
    raise exception 'Ukjent medarbeider.' using errcode = '22023';
  end if;
  if personal_vis_som.rolle is null and personal_vis_som.medarbeider is null then
    delete from personal.vis_som v where v.bruker_id = aktor and v.fagmiljo_id = personal_vis_som.fagmiljo;
  else
    insert into personal.vis_som as v (bruker_id, fagmiljo_id, rolle, medarbeider_id)
    values (aktor, personal_vis_som.fagmiljo, personal_vis_som.rolle, personal_vis_som.medarbeider)
    on conflict (bruker_id, fagmiljo_id) do update set rolle = excluded.rolle, medarbeider_id = excluded.medarbeider_id, endret_kl = now();
  end if;
  return personal.vis_som_json(personal_vis_som.fagmiljo, aktor);
end;
$$;

comment on function public.personal_vis_som(uuid, text, uuid) is
  '«Vis som» i personalkalenderen: lavere rolle og/eller én syntetisk medarbeider, bare i et testmiljø (docs/personal.md K-SKJ-7).';

-- Simuleringen slik den innloggede ser den, eller null utenfor et testmiljø.
create function personal.vis_som_json(fagmiljo uuid, bruker uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when f.testmiljo then jsonb_build_object(
    'rolle', personal.rolle(f.id, vis_som_json.bruker),
    'reell_rolle', personal.reell_rolle(f.id, vis_som_json.bruker),
    'vis_som', (
      select jsonb_build_object('rolle', v.rolle, 'medarbeider', v.medarbeider_id)
      from personal.vis_som v where v.bruker_id = vis_som_json.bruker and v.fagmiljo_id = f.id
    ),
    'meg', personal.meg(f.id, vis_som_json.bruker)
  ) end
  from public.fagmiljoer f where f.id = vis_som_json.fagmiljo
$$;

-- --- Grunnlaget -------------------------------------------------------------------

-- Som i P2b, med det P2c legger til: periodene, vaktandelen og revisjonen per
-- medarbeider, hvem den innloggede er i kalenderen (`meg`), og «Vis som» i et
-- testmiljø (`simulering`). Kvalifikasjonene gis fortsatt bare til rollene som
-- redigerer kalenderen; vaktandelen ser alle (§6.2).
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
        and personal.reell_rolle(v.fagmiljo_id, v.bruker_id) is not null
    ), '[]'::jsonb)
  );
end;
$$;

-- --- Rettighetene -----------------------------------------------------------------

revoke all on all tables in schema personal from public, anon, authenticated, service_role;
revoke all on all sequences in schema personal from public, anon, authenticated, service_role;
revoke all on all functions in schema personal from public, anon, authenticated, service_role;

revoke all on function public.personal_sett_kvalifikasjoner(uuid, uuid, jsonb, bigint) from public, anon, authenticated, service_role;
revoke all on function public.personal_lagre_vaktandel(uuid, uuid, jsonb, bigint) from public, anon, authenticated, service_role;
revoke all on function public.personal_medlemmer(uuid) from public, anon, authenticated, service_role;
revoke all on function public.personal_vis_som(uuid, text, uuid) from public, anon, authenticated, service_role;
grant execute on function public.personal_sett_kvalifikasjoner(uuid, uuid, jsonb, bigint) to authenticated;
grant execute on function public.personal_lagre_vaktandel(uuid, uuid, jsonb, bigint) to authenticated;
grant execute on function public.personal_medlemmer(uuid) to authenticated;
grant execute on function public.personal_vis_som(uuid, text, uuid) to authenticated;
