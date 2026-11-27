-- Funksjonsbrytere per fagmiljø og testmiljøer (#598).
--
-- En generell mekanisme i den felles tilgangsstyringen, ikke regler for én
-- funksjon: en funksjon som eies av et prosjekt (først personalkalenderen fra
-- OUSFAR Personal), kan bygges inn trinnvis, prøves ut av systemarkitektene
-- og senere slås på per fagmiljø uten kodeendring. Utformingen står i
-- docs/fagmiljoer.md, «Funksjonsbrytere per fagmiljø».
--
-- - `public.funksjoner` er katalogen. Eierprosjektet fører inn sin funksjon
--   med en migrasjon.
-- - `public.funksjonsgodkjenninger` er godkjenningen for ordinær bruk, per
--   funksjon og fagmiljø. Eierprosjektet fører inn en rad med en migrasjon
--   først når det har fått de beslutningene det krever for akkurat det
--   fagmiljøet (for personalfunksjonene Peders ja og avklaringen i
--   docs/personal.md §3.4). Godkjenningen er adskilt fra bryteren: ingen
--   funksjon i nettleseren, heller ikke for systemarkitektene, kan gi eller
--   trekke den, og en godkjenning i ett fagmiljø gjelder ikke i et annet.
-- - `public.funksjonsbrytere` er tilstanden per funksjon og fagmiljø: `av`
--   (også uten rad, for en ukjent funksjon og for et arkivert fagmiljø),
--   `utprøving` (systemarkitekter som selv er aktive medlemmer) og `på`
--   (alle aktive medlemmer). Systemarkitektrollen alene gir aldri noe
--   (`intern.er_eget_medlem_i`, #572).
-- - `fagmiljoer.testmiljo` merker fagmiljøer for syntetisk utprøving.
--   Sandkasse er det eneste. En funksjon kan bare stå på `utprøving` eller
--   `på` i et testmiljø eller i et fagmiljø den er godkjent for der, og
--   verken testmerkingen eller godkjenningen kan fjernes mens den gjør det.
-- - En systemarkitekt endrer bryterne og testmerkingen i appen
--   (Administrasjon → Funksjoner), med en begrunnelse. Alt føres i
--   `tilgangslogg`, som de andre tilgangsendringene, og tar den felles låsen.
-- - Den innloggede får bare vite om de funksjonene hen har
--   (`public.mine_funksjoner()`, også i `public.mine_rettigheter()`), og
--   ingenting om de andre. Hver funksjon kontrollerer på nytt på serveren med
--   `intern.funksjon_tilgjengelig` eller `intern.krev_funksjon`, og
--   radsikkerheten med `public.mine_fagmiljoer_med_funksjon`.
--
-- Ingen funksjon føres inn og ingen bryter slås på her.
--
-- Tilbakeføring: en ny migrasjon som setter `public.mine_rettigheter()`
-- tilbake og fjerner funksjonene, de tre tabellene og kolonnen `testmiljo`, når
-- ingen funksjon bruker dem. Bryterne og loggføringene er ingen
-- personalopplysninger.

-- --- Testmiljøene ------------------------------------------------------------

alter table public.fagmiljoer
  add column testmiljo boolean not null default false,
  -- Standardfagmiljøet, der nye kontoer havner, er alltid et virkelig fagmiljø.
  add constraint fagmiljoer_standard_ikke_testmiljo check (not (standard and testmiljo));

comment on column public.fagmiljoer.testmiljo is
  'Testmiljø for syntetisk utprøving (#598). Endres av en systemarkitekt med begrunnelse (public.sett_testmiljo). Se docs/fagmiljoer.md.';

-- --- Katalogen ----------------------------------------------------------------

create table public.funksjoner (
  nokkel text primary key,
  navn text not null,
  beskrivelse text not null,
  opprettet_kl timestamptz not null default now(),
  constraint funksjoner_nokkel_form check (char_length(nokkel) <= 60 and nokkel ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint funksjoner_navn_form check (navn = btrim(navn) and char_length(navn) between 2 and 80),
  constraint funksjoner_beskrivelse_form check (beskrivelse = btrim(beskrivelse) and char_length(beskrivelse) between 2 and 500)
);

comment on table public.funksjoner is
  'Funksjonene som kan slås av og på per fagmiljø (#598). Føres inn av eierprosjektet med en migrasjon. Se docs/fagmiljoer.md.';

alter table public.funksjoner enable row level security;
revoke all on table public.funksjoner from public, anon, authenticated;

-- --- Bryterne -------------------------------------------------------------------

create table public.funksjonsbrytere (
  funksjon text not null references public.funksjoner (nokkel),
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  tilstand text not null,
  endret_kl timestamptz not null default now(),
  endret_av uuid references public.profiles (id) on delete set null,
  primary key (funksjon, fagmiljo_id),
  constraint funksjonsbrytere_tilstand check (tilstand in ('av', 'utprøving', 'på'))
);

comment on table public.funksjonsbrytere is
  'Tilstanden til en funksjon i et fagmiljø: av (også uten rad), utprøving eller på (#598). Se docs/fagmiljoer.md.';

create index funksjonsbrytere_fagmiljo_idx on public.funksjonsbrytere (fagmiljo_id);

alter table public.funksjonsbrytere enable row level security;
revoke all on table public.funksjonsbrytere from public, anon, authenticated;

-- --- Godkjenningene for ordinær bruk ------------------------------------------

create table public.funksjonsgodkjenninger (
  funksjon text not null references public.funksjoner (nokkel),
  fagmiljo_id uuid not null references public.fagmiljoer (id),
  -- Beslutningen godkjenningen bygger på, som en henvisning (f.eks. oppgaven
  -- med Peders ja). Ingen personalopplysninger.
  grunnlag text not null,
  godkjent_kl timestamptz not null default now(),
  primary key (funksjon, fagmiljo_id),
  constraint funksjonsgodkjenninger_grunnlag_form check (grunnlag = btrim(grunnlag) and char_length(grunnlag) between 5 and 500)
);

comment on table public.funksjonsgodkjenninger is
  'Fagmiljøene der en funksjon er godkjent for ordinær bruk (#598). Føres inn og fjernes bare med en migrasjon fra eierprosjektet. Se docs/fagmiljoer.md.';

create index funksjonsgodkjenninger_fagmiljo_idx on public.funksjonsgodkjenninger (fagmiljo_id);

alter table public.funksjonsgodkjenninger enable row level security;
revoke all on table public.funksjonsgodkjenninger from public, anon, authenticated;

-- Som de andre tilgangstabellene: én endring om gangen, og alt i loggen.
create trigger funksjoner_serialiser
before insert or update or delete on public.funksjoner
for each statement execute function intern.serialiser_tilgang();

create trigger funksjonsbrytere_serialiser
before insert or update or delete on public.funksjonsbrytere
for each statement execute function intern.serialiser_tilgang();

create trigger funksjonsgodkjenninger_serialiser
before insert or update or delete on public.funksjonsgodkjenninger
for each statement execute function intern.serialiser_tilgang();

create trigger funksjoner_logg
after insert or update or delete on public.funksjoner
for each row execute function intern.loggfor_tilgang();

create trigger funksjonsbrytere_logg
after insert or update or delete on public.funksjonsbrytere
for each row execute function intern.loggfor_tilgang();

create trigger funksjonsgodkjenninger_logg
after insert or update or delete on public.funksjonsgodkjenninger
for each row execute function intern.loggfor_tilgang();

create trigger funksjoner_faste_felter
before update on public.funksjoner
for each row execute function intern.tilgang_faste_felter('nokkel', 'opprettet_kl');

create trigger funksjonsbrytere_faste_felter
before update on public.funksjonsbrytere
for each row execute function intern.tilgang_faste_felter('funksjon', 'fagmiljo_id');

create trigger funksjonsgodkjenninger_faste_felter
before update on public.funksjonsgodkjenninger
for each row execute function intern.tilgang_faste_felter('funksjon', 'fagmiljo_id', 'godkjent_kl');

-- --- Vernet for fagmiljøene som ikke er godkjent ------------------------------

-- Gir avslaget når funksjonen ikke kan stå på `tilstand` i fagmiljøet, ellers
-- null: `utprøving` og `på` bare i et aktivt fagmiljø som er testmiljø, eller
-- som funksjonen er godkjent for (`public.funksjonsgodkjenninger`). `av` er
-- alltid lov.
create function intern.funksjonsbryteravslag(funksjon text, fagmiljo uuid, tilstand text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when funksjonsbryteravslag.tilstand = 'av' then null
    when not exists (
      select 1 from public.fagmiljoer f where f.id = funksjonsbryteravslag.fagmiljo and f.status = 'aktiv'
    ) then 'Et arkivert fagmiljø kan bare ha funksjonene av.'
    when exists (select 1 from public.fagmiljoer f where f.id = funksjonsbryteravslag.fagmiljo and f.testmiljo) then null
    when exists (
      select 1 from public.funksjonsgodkjenninger g
      where g.funksjon = funksjonsbryteravslag.funksjon and g.fagmiljo_id = funksjonsbryteravslag.fagmiljo
    ) then null
    else 'Funksjonen er ikke godkjent for dette fagmiljøet, og kan bare prøves ut eller slås på i et testmiljø eller et fagmiljø den er godkjent for.'
  end
$$;

revoke all on function intern.funksjonsbryteravslag(text, uuid, text) from public, anon, authenticated, service_role;

-- Holder vernet uansett hvem som endrer: en bryter, testmerkingen eller
-- statusen til et fagmiljø, eller en godkjenning. Det som ikke lenger kan
-- stå, stopper endringen; ingenting slås av i det stille.
create function intern.kontroller_funksjonsbrytere()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad constant jsonb := case tg_op when 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  -- Bryterne endringen kan gjelde: én bryter eller godkjenning, eller et fagmiljø.
  bare_funksjon constant text := case when tg_table_name <> 'fagmiljoer' then rad ->> 'funksjon' end;
  bare_fagmiljo constant uuid := (case when tg_table_name = 'fagmiljoer' then rad ->> 'id' else rad ->> 'fagmiljo_id' end)::uuid;
  avslag text;
begin
  -- Bryterne i et arkivert fagmiljø gjelder ikke (`intern.funksjonstilstand`)
  -- og hindrer ingenting; de kontrolleres om fagmiljøet gjenåpnes.
  select intern.funksjonsbryteravslag(b.funksjon, b.fagmiljo_id, b.tilstand) into avslag
  from public.funksjonsbrytere b
  join public.fagmiljoer f on f.id = b.fagmiljo_id and f.status = 'aktiv'
  where (bare_funksjon is null or b.funksjon = bare_funksjon)
    and (bare_fagmiljo is null or b.fagmiljo_id = bare_fagmiljo)
    and intern.funksjonsbryteravslag(b.funksjon, b.fagmiljo_id, b.tilstand) is not null
  limit 1;
  if avslag is not null then
    raise exception '%', case tg_table_name
      when 'funksjonsbrytere' then avslag
      when 'fagmiljoer' then 'Slå av funksjonene som prøves ut eller er på i fagmiljøet først. ' || avslag
      else 'Slå av funksjonen i fagmiljøet først, så den ikke står på uten godkjenning.'
    end using errcode = '23514';
  end if;
  return null;
end;
$$;

revoke all on function intern.kontroller_funksjonsbrytere() from public, anon, authenticated, service_role;

create trigger funksjonsbrytere_vern
after insert or update on public.funksjonsbrytere
for each row execute function intern.kontroller_funksjonsbrytere();

-- Et fagmiljø kan arkiveres som før: bryterne der gjelder ikke lenger, og
-- ingen er medlem av det. Gjenåpnes det, må vernet holde igjen.
create trigger fagmiljoer_funksjonsvern
after update of testmiljo, status on public.fagmiljoer
for each row execute function intern.kontroller_funksjonsbrytere();

create trigger funksjonsgodkjenninger_vern
after update or delete on public.funksjonsgodkjenninger
for each row execute function intern.kontroller_funksjonsbrytere();

-- --- Hvem som har en funksjon -------------------------------------------------

-- Tilstanden som gjelder: `av` uten rad, for en ukjent funksjon og når vernet
-- over ikke holder (som for et arkivert fagmiljø), ellers tilstanden i raden.
create function intern.funksjonstilstand(funksjon text, fagmiljo uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select b.tilstand
    from public.funksjonsbrytere b
    where b.funksjon = funksjonstilstand.funksjon
      and b.fagmiljo_id = funksjonstilstand.fagmiljo
      and intern.funksjonsbryteravslag(b.funksjon, b.fagmiljo_id, b.tilstand) is null
  ), 'av')
$$;

revoke all on function intern.funksjonstilstand(text, uuid) from public, anon, authenticated, service_role;

comment on function intern.funksjonstilstand(text, uuid) is
  'Tilstanden til funksjonen i fagmiljøet: av, utprøving eller på; av uten rad (#598). Se docs/fagmiljoer.md.';

-- Den ene avgjørelsen: om brukeren har funksjonen i fagmiljøet. `på`: eget
-- aktivt medlemskap. `utprøving`: systemarkitekt og eget aktivt medlemskap.
-- `av`: ingen. Systemarkitektrollen alene gir aldri noe.
create function intern.funksjon_tilgjengelig(funksjon text, fagmiljo uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    case intern.funksjonstilstand(funksjon_tilgjengelig.funksjon, funksjon_tilgjengelig.fagmiljo)
      when 'på' then intern.er_eget_medlem_i(funksjon_tilgjengelig.fagmiljo, funksjon_tilgjengelig.bruker)
      when 'utprøving' then
        intern.er_eget_medlem_i(funksjon_tilgjengelig.fagmiljo, funksjon_tilgjengelig.bruker)
        and intern.er_systemarkitekt(funksjon_tilgjengelig.bruker)
      else false
    end,
    false
  )
$$;

revoke all on function intern.funksjon_tilgjengelig(text, uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.funksjon_tilgjengelig(text, uuid, uuid) is
  'Om brukeren har funksjonen i fagmiljøet: på gir egne medlemmer, utprøving systemarkitekter med eget medlemskap, av ingen (#598). Se docs/fagmiljoer.md.';

-- Porten for funksjonene som bygges på en bryter: stopper kallet med det
-- samme svaret som for noe som ikke finnes (`P0002`, som data-API-et gir som
-- 404), så den som ikke har funksjonen, ikke får vite at den finnes. Gir den
-- innloggede tilbake.
create function intern.krev_funksjon(funksjon text, fagmiljo uuid)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  if not intern.funksjon_tilgjengelig(krev_funksjon.funksjon, krev_funksjon.fagmiljo, (select auth.uid())) then
    raise exception 'Finnes ikke.' using errcode = 'P0002';
  end if;
  return (select auth.uid());
end;
$$;

revoke all on function intern.krev_funksjon(text, uuid) from public, anon, authenticated, service_role;

comment on function intern.krev_funksjon(text, uuid) is
  'Stopper med P0002 («Finnes ikke.») når den innloggede ikke har funksjonen i fagmiljøet (#598). Se docs/fagmiljoer.md.';

-- Funksjonene den innloggede har, som `[{funksjon, fagmiljo}]`, etter
-- funksjon og fagmiljø. Ingenting om funksjonene hen ikke har. Svarer bare om
-- den innloggede selv; tomt uten aktivt medlemskap.
create function public.mine_funksjoner()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.har_aktivt_medlemskap((select auth.uid())) then '[]'::jsonb
    else coalesce((
      select jsonb_agg(jsonb_build_object('funksjon', b.funksjon, 'fagmiljo', b.fagmiljo_id) order by b.funksjon, b.fagmiljo_id)
      from public.funksjonsbrytere b
      where b.tilstand <> 'av'
        and b.fagmiljo_id = any (public.mine_egne_fagmiljoer())
        and intern.funksjon_tilgjengelig(b.funksjon, b.fagmiljo_id, (select auth.uid()))
    ), '[]'::jsonb)
  end
$$;

revoke all on function public.mine_funksjoner() from public, anon, authenticated, service_role;
grant execute on function public.mine_funksjoner() to authenticated;

comment on function public.mine_funksjoner() is
  'Funksjonene den innloggede har, som [{funksjon, fagmiljo}] (#598). Brukes av appen. Se docs/fagmiljoer.md.';

-- Fagmiljøene der den innloggede har funksjonen, til radsikkerhetsreglene:
-- `fagmiljo_id = any ((select public.mine_fagmiljoer_med_funksjon('<nøkkel>')))`
-- regnes ut én gang per spørring. Tom for en ukjent funksjon, som for en hen
-- ikke har.
create function public.mine_fagmiljoer_med_funksjon(funksjon text)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.har_aktivt_medlemskap((select auth.uid())) then '{}'::uuid[]
    else coalesce((
      select array_agg(f order by f)
      from unnest(public.mine_egne_fagmiljoer()) f
      where intern.funksjon_tilgjengelig(mine_fagmiljoer_med_funksjon.funksjon, f, (select auth.uid()))
    ), '{}'::uuid[])
  end
$$;

revoke all on function public.mine_fagmiljoer_med_funksjon(text) from public, anon, authenticated, service_role;
grant execute on function public.mine_fagmiljoer_med_funksjon(text) to authenticated;

comment on function public.mine_fagmiljoer_med_funksjon(text) is
  'Fagmiljøene der den innloggede har funksjonen (#598). Brukes av radsikkerhetsreglene. Se docs/fagmiljoer.md.';

-- --- Administrasjonen -----------------------------------------------------------

-- Begrunnelsen en endring krever: 5–500 tegn, med mellomrommene samlet.
create function intern.funksjonsbegrunnelse(begrunnelse text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  ren text := btrim(regexp_replace(coalesce(funksjonsbegrunnelse.begrunnelse, ''), '\s+', ' ', 'g'));
begin
  if char_length(ren) < 5 or char_length(ren) > 500 then
    raise exception 'Skriv en begrunnelse på mellom 5 og 500 tegn.' using errcode = '22023';
  end if;
  return ren;
end;
$$;

revoke all on function intern.funksjonsbegrunnelse(text) from public, anon, authenticated, service_role;

-- Det systemarkitektene ser i Administrasjon → Funksjoner: katalogen med
-- tilstanden i hvert fagmiljø (`av` uten rad) og de aktive fagmiljøene den
-- er godkjent for, og fagmiljøene med testmerkingen.
create function public.funksjonsoversikt()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_systemarkitekt('Bare systemarkitektene kan se funksjonsbryterne.');
  select jsonb_build_object(
    'funksjoner', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nokkel', k.nokkel,
        'navn', k.navn,
        'beskrivelse', k.beskrivelse,
        'godkjente_fagmiljoer', coalesce((
          select jsonb_agg(g.fagmiljo_id order by g.fagmiljo_id)
          from public.funksjonsgodkjenninger g
          join public.fagmiljoer f on f.id = g.fagmiljo_id and f.status = 'aktiv'
          where g.funksjon = k.nokkel
        ), '[]'::jsonb),
        'brytere', coalesce((
          select jsonb_agg(jsonb_build_object(
            'fagmiljo', b.fagmiljo_id,
            'tilstand', b.tilstand,
            'endret_kl', b.endret_kl,
            'endret_av', nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), '')
          ) order by b.fagmiljo_id)
          from public.funksjonsbrytere b
          left join public.profiles p on p.id = b.endret_av
          where b.funksjon = k.nokkel and b.tilstand <> 'av'
        ), '[]'::jsonb)
      ) order by k.navn)
      from public.funksjoner k
    ), '[]'::jsonb),
    'fagmiljoer', coalesce((
      select jsonb_agg(intern.fagmiljoreferanse(f) || jsonb_build_object('testmiljo', f.testmiljo) order by f.navn)
      from public.fagmiljoer f
      where f.status = 'aktiv'
    ), '[]'::jsonb)
  )
$$;

revoke all on function public.funksjonsoversikt() from public, anon, authenticated, service_role;
grant execute on function public.funksjonsoversikt() to authenticated;

-- Setter funksjonen til `tilstand` i fagmiljøet, med begrunnelsen i loggen.
-- Bare systemarkitektene. En tilstand som alt står, gir det samme svaret uten
-- å endre noe, så et brutt kall kan sendes igjen. Gir `{funksjon, fagmiljo,
-- tilstand}`.
create function public.sett_funksjonsbryter(funksjon text, fagmiljo uuid, tilstand text, begrunnelse text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid;
  grunn text;
  avslag text;
begin
  aktor := (intern.krev_systemarkitekt('Bare systemarkitektene kan slå funksjoner av og på.')).id;
  if sett_funksjonsbryter.tilstand is null or sett_funksjonsbryter.tilstand not in ('av', 'utprøving', 'på') then
    raise exception 'Ukjent tilstand.' using errcode = '22023';
  end if;
  grunn := intern.funksjonsbegrunnelse(sett_funksjonsbryter.begrunnelse);
  perform intern.las_tilgang(aktor, grunn);
  if not exists (select 1 from public.funksjoner k where k.nokkel = sett_funksjonsbryter.funksjon) then
    raise exception 'Ukjent funksjon.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.fagmiljoer f where f.id = sett_funksjonsbryter.fagmiljo) then
    raise exception 'Ukjent fagmiljø.' using errcode = 'P0002';
  end if;
  avslag := intern.funksjonsbryteravslag(sett_funksjonsbryter.funksjon, sett_funksjonsbryter.fagmiljo, sett_funksjonsbryter.tilstand);
  if avslag is not null then
    raise exception '%', avslag using errcode = '23514';
  end if;

  -- Uten rad er funksjonen alt av: da er det ingenting å endre eller logge.
  if sett_funksjonsbryter.tilstand <> 'av'
     or exists (select 1 from public.funksjonsbrytere b where b.funksjon = sett_funksjonsbryter.funksjon and b.fagmiljo_id = sett_funksjonsbryter.fagmiljo) then
    insert into public.funksjonsbrytere as b (funksjon, fagmiljo_id, tilstand, endret_av)
    values (sett_funksjonsbryter.funksjon, sett_funksjonsbryter.fagmiljo, sett_funksjonsbryter.tilstand, aktor)
    on conflict on constraint funksjonsbrytere_pkey do update
      set tilstand = excluded.tilstand, endret_kl = now(), endret_av = excluded.endret_av
      where b.tilstand is distinct from excluded.tilstand;
  end if;

  return jsonb_build_object('funksjon', sett_funksjonsbryter.funksjon, 'fagmiljo', sett_funksjonsbryter.fagmiljo, 'tilstand', sett_funksjonsbryter.tilstand);
end;
$$;

revoke all on function public.sett_funksjonsbryter(text, uuid, text, text) from public, anon, authenticated, service_role;
grant execute on function public.sett_funksjonsbryter(text, uuid, text, text) to authenticated;

-- Merker fagmiljøet som testmiljø, eller fjerner merket, med begrunnelsen i
-- loggen. Bare systemarkitektene, og bare for et aktivt fagmiljø som ikke er
-- standard. Vernet over stopper det som ikke kan stå uten merket. Gir
-- `{fagmiljo, testmiljo}`.
create function public.sett_testmiljo(fagmiljo uuid, testmiljo boolean, begrunnelse text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid;
  grunn text;
  miljo public.fagmiljoer;
begin
  aktor := (intern.krev_systemarkitekt('Bare systemarkitektene kan merke testmiljøer.')).id;
  if sett_testmiljo.testmiljo is null then
    raise exception 'Oppgi om fagmiljøet er et testmiljø.' using errcode = '22023';
  end if;
  grunn := intern.funksjonsbegrunnelse(sett_testmiljo.begrunnelse);
  perform intern.las_tilgang(aktor, grunn);
  select f.* into miljo from public.fagmiljoer f where f.id = sett_testmiljo.fagmiljo;
  if not found then
    raise exception 'Ukjent fagmiljø.' using errcode = 'P0002';
  end if;
  if miljo.testmiljo is distinct from sett_testmiljo.testmiljo then
    if miljo.status <> 'aktiv' then
      raise exception 'Et arkivert fagmiljø kan ikke endres.' using errcode = '22023';
    end if;
    if miljo.standard and sett_testmiljo.testmiljo then
      raise exception 'Standardfagmiljøet kan ikke være et testmiljø.' using errcode = '22023';
    end if;
    update public.fagmiljoer f set testmiljo = sett_testmiljo.testmiljo where f.id = miljo.id;
  end if;
  return jsonb_build_object('fagmiljo', miljo.id, 'testmiljo', sett_testmiljo.testmiljo);
end;
$$;

revoke all on function public.sett_testmiljo(uuid, boolean, text) from public, anon, authenticated, service_role;
grant execute on function public.sett_testmiljo(uuid, boolean, text) to authenticated;

-- --- Rettighetene appen viser --------------------------------------------------

-- Som i 20261116130500_redaktoransvar.sql, med funksjonene den innloggede har
-- (`funksjoner`, som `public.mine_funksjoner()`), og med de egne
-- fagmiljøene fra `public.mine_egne_fagmiljoer()` (#572) i stedet for samme
-- vilkår skrevet ut.
create or replace function public.mine_rettigheter()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  with opprett as (
    select coalesce(jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn), '[]'::jsonb) as i
    from public.fagmiljoer f
    where intern.opprettelsesavslag((select auth.uid()), f.id) is null
  ),
  arkitekt as (
    select public.er_systemarkitekt() as er
  ),
  egne as (
    select public.mine_egne_fagmiljoer() as ider
  )
  select jsonb_build_object(
    'systemarkitekt', arkitekt.er,
    'administrerer', coalesce((
      select jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn)
      from public.fagmiljoer f
      where f.id = any (public.mine_administrerte_fagmiljoer())
    ), '[]'::jsonb),
    'arbeidsfagmiljo', (
      select intern.fagmiljoreferanse(f)
      from public.fagmiljoer f
      where f.id = intern.arbeidsfagmiljo((select auth.uid()))
    ),
    'mine_fagmiljoer', coalesce((
      select jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn)
      from public.fagmiljoer f
      where f.id = any (egne.ider)
    ), '[]'::jsonb),
    'velgbare_fagmiljoer', coalesce((
      select jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn)
      from public.fagmiljoer f
      where f.status = 'aktiv' and (arkitekt.er or f.id = any (egne.ider))
    ), '[]'::jsonb),
    'stoffregister', intern.har_registerrett((select auth.uid())),
    'opprett_bruker', jsonb_array_length(opprett.i) > 0,
    'opprett_bruker_i', opprett.i,
    'redaktor', exists (select 1 from intern.aktive_redaktoransvar((select auth.uid()))),
    'behandler_forslag', intern.har_endringsrett_noe((select auth.uid())),
    'funksjoner', public.mine_funksjoner()
  )
  from opprett, arkitekt, egne
$$;

-- --- Sandkasse er testmiljø ------------------------------------------------------

-- Sandkasse (20261118073100_sandkasse.sql) er fagmiljøet for utprøving. Det
-- finnes bare i produksjonen; i en ny database gjør dette ingenting.
do $$
begin
  perform set_config('ousfar.tilgangsgrunn', '#598: Sandkasse er testmiljøet for syntetisk utprøving', true);
  update public.fagmiljoer set testmiljo = true where nokkel = 'sandkasse' and status = 'aktiv' and not standard;
end;
$$;
