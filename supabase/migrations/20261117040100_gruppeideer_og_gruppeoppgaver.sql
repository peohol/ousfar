-- P6b (#430): idéer og oppgaver i gruppene. Reglene står i docs/fagmiljoer.md,
-- «Idéer og oppgaver i gruppene», og i docs/ideer.md.
--
--  * En gruppeidé er en vanlig rad i `ideer` med `gruppe_id`. Kommentarene,
--    hjertene, det nye (`idebesok`), varslene om kommentarene og
--    direktelenkene er de samme som for de felles idéene. En gruppeidé har
--    ingen kategori; en felles idé har alltid en.
--  * Bare den som leser gruppen nå (`intern.kan_lese_gruppe`: aktivt medlem
--    med tilgang, eller systemarkitekt), ser gruppens idéer, kommentarer,
--    hjerter, varsler og lenker. Det håndheves av radsikkerheten `rekkevidde`
--    på tabellene og av funksjonene. Bare i en aktiv gruppe kan noe skrives.
--  * De ansvarlige i gruppen (og systemarkitektene) behandler idéene: «Ikke
--    aktuelt», åpne igjen og gjøre om til en gruppeoppgave. Moderatorene (og
--    de ansvarlige) kan slette andres idéer og kommentarer i gruppen. En
--    gruppeidé som ikke er aktuell, slettes ikke automatisk.
--  * Gruppeoppgavene står i en egen tabell, `gruppeoppgaver`, helt atskilt
--    fra de planlagte oppgavene (`oppgaver`): ingen OPG-nummer, ingen
--    agentkø, ingen kobling til GitHub. En idé som gjøres om, beholder
--    kommentarene og opphavet, og tråden kan fortsette under oppgaven.
--  * De felles idéene og de planlagte oppgavene virker som før (D8):
--    lesefunksjonene for dem tar bare med idéer uten gruppe, og en gruppeidé
--    kan ikke overføres til de planlagte oppgavene.
--
-- Alt som endrer en gruppeoppgave, går gjennom funksjonene her. De låser
-- gruppens rad (delt lås, så de venter på medlemsendringer og arkivering) og
-- så oppgavens eller idéens rad, slik at samtidige endringer skjer én om
-- gangen, og gir samme svar når handlingen alt er utført. Ingen eksisterende
-- data endres, og ingen setninger er destruktive.
--
-- Tilbakeføring: en ny migrasjon som setter funksjonene og reglene tilbake
-- til forrige versjon og tar bort `rekkevidde`-reglene på idétabellene.
-- Tabellen `gruppeoppgaver` og kolonnen `ideer.gruppe_id` kan stå; uten
-- funksjonene leses ingenting i dem.

-- --- Idéene får en gruppe ----------------------------------------------------

alter table public.ideer add column gruppe_id uuid references public.grupper (id);
alter table public.ideer alter column kategori drop not null;
alter table public.ideer add constraint ideer_kategori_eller_gruppe check ((gruppe_id is null) = (kategori is not null));

comment on column public.ideer.gruppe_id is
  'P6b: gruppen idéen hører til, eller null for de felles idéene til OUSFAR. Settes når idéen skrives og endres aldri.';

create index ideer_gruppe_idx on public.ideer (gruppe_id) where gruppe_id is not null;

-- Nettleseren velger gruppen når idéen skrives, men kan aldri flytte den.
grant insert (gruppe_id) on public.ideer to authenticated;
grant select (gruppe_id) on public.ideer to authenticated;

-- --- Gruppeoppgavene ---------------------------------------------------------

create table public.gruppeoppgaver (
  id uuid primary key default gen_random_uuid(),
  gruppe_id uuid not null references public.grupper (id),
  -- Idéen oppgaven ble gjort om fra. Slettes idéen (bare med kontoen til den
  -- som skrev den), står oppgaven igjen med sin egen overskrift og beskrivelse.
  ide_id uuid unique references public.ideer (id) on delete set null,
  tittel text not null,
  -- Beskrivelsen som riktekst (ProseMirror-JSON), eller null uten beskrivelse.
  beskrivelse jsonb,
  ansvarlig_id uuid references public.profiles (id) on delete set null,
  prioritet text not null default 'normal',
  status text not null default 'ikke_paabegynt',
  -- Den som skrev idéen oppgaven ble gjort om fra.
  foreslatt_av uuid references public.profiles (id) on delete set null,
  opprettet_av uuid references public.profiles (id) on delete set null,
  opprettet_kl timestamptz not null default now(),
  -- Når overskriften, beskrivelsen eller prioriteten sist ble endret; null til da.
  endret_kl timestamptz,
  status_kl timestamptz not null default now(),
  fullfort_kl timestamptz,
  constraint gruppeoppgaver_tittel check (char_length(tittel) between 1 and 140 and tittel = btrim(tittel)),
  constraint gruppeoppgaver_beskrivelse check (
    beskrivelse is null or (jsonb_typeof(beskrivelse) = 'object' and octet_length(beskrivelse::text) <= 100000)
  ),
  constraint gruppeoppgaver_prioritet check (prioritet in ('hoy', 'normal', 'lav')),
  constraint gruppeoppgaver_status check (status in ('ikke_paabegynt', 'paagaar', 'fullfort')),
  constraint gruppeoppgaver_fullfort check ((status = 'fullfort') = (fullfort_kl is not null))
);

comment on table public.gruppeoppgaver is
  'P6b: gruppenes egne oppgaver, atskilt fra de planlagte oppgavene til OUSFAR (oppgaver). Skrives og leses gjennom funksjonene. Se docs/fagmiljoer.md, «Idéer og oppgaver i gruppene».';

create index gruppeoppgaver_gruppe_idx on public.gruppeoppgaver (gruppe_id);
create index gruppeoppgaver_ansvarlig_idx on public.gruppeoppgaver (ansvarlig_id) where ansvarlig_id is not null;
create index gruppeoppgaver_foreslatt_idx on public.gruppeoppgaver (foreslatt_av) where foreslatt_av is not null;
create index gruppeoppgaver_opprettet_av_idx on public.gruppeoppgaver (opprettet_av) where opprettet_av is not null;

alter table public.gruppeoppgaver enable row level security;
-- Nettleseren leser og skriver bare gjennom funksjonene.
revoke all on public.gruppeoppgaver from anon, authenticated;

-- --- Hvem som får gjøre hva med en idé --------------------------------------

-- Om gruppen er aktiv og den innloggede leser den: det som kreves for å skrive
-- noe i gruppen. For en arkivert gruppe er alt frosset, også for
-- systemarkitektene som leser den.
create function intern.kan_bidra_i_gruppe(gruppe uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (select 1 from public.grupper g where g.id = kan_bidra_i_gruppe.gruppe and g.status = 'aktiv')
    and intern.kan_lese_gruppe(kan_bidra_i_gruppe.gruppe, kan_bidra_i_gruppe.bruker),
    false
  )
$$;
revoke all on function intern.kan_bidra_i_gruppe(uuid, uuid) from public, anon, authenticated, service_role;

-- Om den innloggede leser idéen: alle med aktivt medlemskap for en felles
-- idé, de som leser gruppen for en gruppeidé.
create function intern.kan_lese_ide(i public.ideer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when i.id is null then false
    when i.gruppe_id is null then intern.har_aktivt_medlemskap((select auth.uid()))
    else intern.kan_lese_gruppe(i.gruppe_id)
  end
$$;
revoke all on function intern.kan_lese_ide(public.ideer) from public, anon, authenticated, service_role;

-- Om den innloggede kan behandle idéen: «Ikke aktuelt», åpne igjen, gjøre om
-- og slette en som ikke er aktuell. Systemarkitektene for de felles idéene
-- (D8), de ansvarlige i gruppen og systemarkitektene for en gruppeidé i en
-- aktiv gruppe.
create function public.kan_behandle_ide(ide uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select coalesce((
    select case
      when i.gruppe_id is null then public.er_systemarkitekt()
      else intern.kan_styre_gruppe(i.gruppe_id) and intern.kan_bidra_i_gruppe(i.gruppe_id)
    end
    from public.ideer i where i.id = kan_behandle_ide.ide
  ), false)
$$;

-- Om den innloggede kan slette andres idéer og kommentarer: systemarkitektene
-- for de felles idéene (D8), moderatorene og de ansvarlige i gruppen og
-- systemarkitektene for en gruppeidé.
create function public.kan_moderere_ide(ide uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select coalesce((
    select case
      when i.gruppe_id is null then public.er_systemarkitekt()
      else intern.kan_moderere_gruppe(i.gruppe_id)
    end
    from public.ideer i where i.id = kan_moderere_ide.ide
  ), false)
$$;

revoke all on function public.kan_behandle_ide(uuid) from public, anon;
revoke all on function public.kan_moderere_ide(uuid) from public, anon;
grant execute on function public.kan_behandle_ide(uuid) to authenticated;
grant execute on function public.kan_moderere_ide(uuid) to authenticated;

-- En åpen idé står i lista og kan endres, kommenteres og slettes. Som før, og
-- en gruppeidé er bare åpen så lenge gruppen er aktiv, den innloggede leser
-- den, og den ikke er gjort om til en gruppeoppgave.
create or replace function public.ide_er_apen(ide uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select exists (
    select 1 from public.ideer i
    where i.id = ide_er_apen.ide
      and i.arkivert_kl is null
      and not exists (select 1 from public.oppgaver o where o.ide_id = i.id)
      and not exists (select 1 from public.gruppeoppgaver o where o.ide_id = i.id)
      and (i.gruppe_id is null or intern.kan_bidra_i_gruppe(i.gruppe_id))
  )
$$;

-- Om tråden under idéen er åpen for kommentarer og hjerter: når idéen er
-- åpen, og når en gruppeidé er gjort om til en oppgave, så gruppen kan
-- fortsette å diskutere den der. En overført felles idé er frosset som før.
create function intern.ide_kan_kommenteres(ide uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.ide_er_apen(ide_kan_kommenteres.ide) or exists (
    select 1 from public.ideer i
    join public.gruppeoppgaver o on o.ide_id = i.id
    where i.id = ide_kan_kommenteres.ide
      and i.gruppe_id is not null
      and intern.kan_bidra_i_gruppe(i.gruppe_id)
  )
$$;
revoke all on function intern.ide_kan_kommenteres(uuid) from public, anon, authenticated, service_role;

create or replace function intern.ide_krev_apen()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad record := case when tg_op = 'DELETE' then old else new end;
begin
  if pg_trigger_depth() > 1 then
    return rad;
  end if;
  if exists (select 1 from public.ideer i where i.id = rad.ide_id) and not intern.ide_kan_kommenteres(rad.ide_id) then
    raise exception 'Idéen er arkivert eller overført, og tråden er frosset.' using errcode = '42501';
  end if;
  return rad;
end;
$$;

-- En ny gruppeidé skrives bare av en som leser en aktiv gruppe. Uten
-- innlogget bruker er det databasen selv (en migrasjon eller service-rollen);
-- nettleseren har alltid en, og uten den slipper ingen forbi radsikkerheten.
create function intern.ide_krev_gruppe()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.gruppe_id is not null and (select auth.uid()) is not null and not intern.kan_bidra_i_gruppe(new.gruppe_id) then
    raise exception 'Gruppen finnes ikke, eller du har ikke tilgang til den.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function intern.ide_krev_gruppe() from public, anon, authenticated, service_role;

create trigger ideer_krev_gruppe
before insert on public.ideer
for each row execute function intern.ide_krev_gruppe();

-- --- Radsikkerheten ------------------------------------------------------------

-- Rekkevidden, som for diskusjonene (P2b, P6): en gruppeidé finnes bare for
-- dem som leser gruppen. Barnetabellene følger idéen, gjennom radsikkerheten
-- på `ideer`.
create policy rekkevidde on public.ideer
as restrictive
for all
to authenticated
using (gruppe_id is null or gruppe_id = any ((select public.mine_lesbare_grupper())::uuid[]))
with check (gruppe_id is null or gruppe_id = any ((select public.mine_lesbare_grupper())::uuid[]));

create policy rekkevidde on public.idekommentarer
as restrictive
for all
to authenticated
using (exists (select 1 from public.ideer i where i.id = ide_id))
with check (exists (select 1 from public.ideer i where i.id = ide_id));

create policy rekkevidde on public.idehjerter
as restrictive
for all
to authenticated
using (exists (select 1 from public.ideer i where i.id = ide_id))
with check (exists (select 1 from public.ideer i where i.id = ide_id));

create policy rekkevidde on public.idebesok
as restrictive
for all
to authenticated
using (exists (select 1 from public.ideer i where i.id = ide_id))
with check (exists (select 1 from public.ideer i where i.id = ide_id));

-- Slettingen: for en felles idé det samme som før (forfatteren eller en
-- systemarkitekt; en arkivert bare en systemarkitekt). For en gruppeidé
-- forfatteren eller en moderator i gruppen, og en som ikke er aktuell, de som
-- behandler idéene i gruppen.
alter policy "Forfatteren eller en systemarkitekt sletter idéen" on public.ideer
  using (
    (public.ide_er_apen(id) and (forfatter_id = (select auth.uid()) or public.kan_moderere_ide(id)))
    or (arkivert_kl is not null and public.kan_behandle_ide(id))
  );

alter policy "Forfatteren eller en systemarkitekt sletter kommentaren" on public.idekommentarer
  using ((forfatter_id = (select auth.uid()) and not slettet) or public.kan_moderere_ide(ide_id));

-- --- Behandlingen av idéene --------------------------------------------------

-- Krever at den innloggede kan behandle idéen. Avslaget for de felles idéene
-- er det samme som før.
create function intern.krev_idebehandling(ide uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  if public.kan_behandle_ide(krev_idebehandling.ide) then
    return;
  end if;
  if exists (select 1 from public.ideer i where i.id = krev_idebehandling.ide and i.gruppe_id is not null) then
    raise exception 'Bare de ansvarlige i gruppen kan behandle idéen.' using errcode = '42501';
  end if;
  raise exception 'Bare en systemarkitekt kan gjøre dette.' using errcode = '42501';
end;
$$;
revoke all on function intern.krev_idebehandling(uuid) from public, anon, authenticated, service_role;

-- Varsler den som skrev en gruppeidé om det som skjer med den. Den som gjorde
-- det, varsles ikke.
create function intern.varsle_gruppeidebehandling(ide uuid, art text, oppgave uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.ideer;
begin
  select * into i from public.ideer x where x.id = varsle_gruppeidebehandling.ide;
  if i.gruppe_id is null or i.forfatter_id is not distinct from (select auth.uid()) then
    return;
  end if;
  perform intern.varsle(
    array[i.forfatter_id],
    'gruppeoppgaver', 'gruppeoppgaver:ide:' || i.id, i.id,
    jsonb_strip_nulls(jsonb_build_object(
      'kl', now(), 'av', (select auth.uid()), 'art', varsle_gruppeidebehandling.art,
      'gruppeoppgave', varsle_gruppeidebehandling.oppgave
    ))
  );
end;
$$;
revoke all on function intern.varsle_gruppeidebehandling(uuid, text, uuid) from public, anon, authenticated, service_role;

create or replace function public.arkiver_ide(ide uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_idebehandling(arkiver_ide.ide);
  perform intern.las_apen_ide(arkiver_ide.ide);
  update public.ideer set arkivert_kl = now() where id = arkiver_ide.ide;
  perform intern.varsle_gruppeidebehandling(arkiver_ide.ide, 'ikke_aktuell');
end;
$$;

-- En felles idé kan gjenopprettes innen fristen; en gruppeidé når som helst.
create or replace function public.gjenopprett_ide(ide uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_idebehandling(gjenopprett_ide.ide);
  update public.ideer set arkivert_kl = null
  where id = gjenopprett_ide.ide
    and arkivert_kl is not null
    and (gruppe_id is not null or arkivert_kl > now() - intern.arkivfrist());
  if not found then
    raise exception 'Idéen står ikke i arkivet.' using errcode = '55000';
  end if;
  perform intern.varsle_gruppeidebehandling(gjenopprett_ide.ide, 'gjenapnet');
end;
$$;

-- Bare de felles idéene slettes etter fristen.
create or replace function public.rydd_idearkiv()
returns integer
language sql
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select intern.krev_idevalg_admin();
  with slettet as (
    delete from public.ideer i
    where i.gruppe_id is null
      and i.arkivert_kl <= now() - intern.arkivfrist()
    returning 1
  )
  select count(*)::integer from slettet
$$;

-- De planlagte oppgavene er bare for de felles idéene.
create or replace function public.overfor_ide(ide uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  ny uuid;
begin
  perform intern.krev_idevalg_admin();
  if exists (select 1 from public.ideer i where i.id = overfor_ide.ide and i.gruppe_id is not null) then
    raise exception 'En idé i en gruppe gjøres om til en gruppeoppgave, ikke en planlagt oppgave.' using errcode = '42501';
  end if;
  perform intern.las_apen_ide(overfor_ide.ide);
  insert into public.oppgaver (ide_id, tittel, nummer, prompt)
  select i.id, i.tittel, nextval('intern.oppgavenummer'),
    -- Samme grense som oppgaver_prompt.
    left(coalesce(nullif(btrim(intern.riktekst_som_tekst(i.tekst), E' \t\r\n'), ''), i.tittel), 50000)
  from public.ideer i where i.id = overfor_ide.ide
  returning id into ny;
  return ny;
end;
$$;

-- --- Lesingen av idéene ------------------------------------------------------

-- Gruppeoppgaven en idé er gjort om til, slik lista og tråden viser den.
create function intern.gruppeoppgave_kort(ide uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object('id', o.id, 'status', o.status, 'tittel', o.tittel)
  from public.gruppeoppgaver o
  where o.ide_id = gruppeoppgave_kort.ide
$$;
revoke all on function intern.gruppeoppgave_kort(uuid) from public, anon, authenticated, service_role;

-- Idélista: de felles idéene (gruppe null) eller idéene i én gruppe. Samme
-- form som før, med gruppen, gruppeoppgaven og om den innloggede har åpnet
-- idéen (`sett`). En felles idé som ikke er aktuell, står bare til fristen.
-- Kalles av funksjonene som har kontrollert tilgangen.
create function intern.ideliste(gruppe uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with hjerter as (
    select h.ide_id, count(*) as antall, bool_or(h.bruker_id = (select auth.uid())) as mitt
    from public.idehjerter h
    join public.ideer i on i.id = h.ide_id and i.gruppe_id is not distinct from ideliste.gruppe
    where h.kommentar_id is null
    group by h.ide_id
  ),
  -- Nye er kommentarer fra andre etter at idéen sist ble åpnet, eller alle
  -- fra andre når den aldri er åpnet.
  kommentarer as (
    select
      k.ide_id,
      count(*) as antall,
      count(*) filter (
        where k.forfatter_id is distinct from (select auth.uid())
          and (b.sett_kl is null or k.opprettet_kl > b.sett_kl)
      ) as nye
    from public.idekommentarer k
    join public.ideer i on i.id = k.ide_id and i.gruppe_id is not distinct from ideliste.gruppe
    left join public.idebesok b on b.ide_id = k.ide_id and b.bruker_id = (select auth.uid())
    where not k.slettet
    group by k.ide_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id,
      'forfatter_id', i.forfatter_id,
      'kategori', i.kategori,
      'gruppe_id', i.gruppe_id,
      'tittel', i.tittel,
      'arkivert_kl', i.arkivert_kl,
      'oppgave', intern.oppgave_kort(i.id),
      'gruppeoppgave', intern.gruppeoppgave_kort(i.id),
      'opprettet_kl', i.opprettet_kl,
      'endret_kl', i.endret_kl,
      'hjerter', coalesce(h.antall, 0),
      'mitt_hjerte', coalesce(h.mitt, false),
      'kommentarer', coalesce(k.antall, 0),
      'nye_kommentarer', coalesce(k.nye, 0),
      'sett', i.forfatter_id = (select auth.uid()) or exists (
        select 1 from public.idebesok b where b.ide_id = i.id and b.bruker_id = (select auth.uid())
      )
    ) order by i.opprettet_kl desc, i.id), '[]'::jsonb)
  from public.ideer i
  left join hjerter h on h.ide_id = i.id
  left join kommentarer k on k.ide_id = i.id
  where (select auth.uid()) is not null
    and i.gruppe_id is not distinct from ideliste.gruppe
    and (i.gruppe_id is not null or i.arkivert_kl is null or i.arkivert_kl > now() - intern.arkivfrist())
$$;
revoke all on function intern.ideliste(uuid) from public, anon, authenticated, service_role;

-- De felles idéene, som før. Gruppeidéene står aldri her.
create or replace function public.ideoversikt()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select intern.ideliste(null)
$$;

-- Idéene i én gruppe, og hva den innloggede kan gjøre med dem.
create function public.gruppeideer(gruppe uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  if not intern.kan_lese_gruppe(gruppeideer.gruppe) then
    raise exception 'Gruppen finnes ikke, eller du har ikke tilgang til den.' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'kan_skrive', intern.kan_bidra_i_gruppe(gruppeideer.gruppe),
    'kan_behandle', intern.kan_styre_gruppe(gruppeideer.gruppe) and intern.kan_bidra_i_gruppe(gruppeideer.gruppe),
    'ideer', intern.ideliste(gruppeideer.gruppe)
  );
end;
$$;

-- Én idé med tråden. Som før, og bare når den innloggede leser idéen; med
-- gruppen, gruppeoppgaven og det den innloggede kan gjøre med idéen.
create or replace function public.idetraad(ide uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  with hjerter as (
    select h.kommentar_id, count(*) as antall, bool_or(h.bruker_id = (select auth.uid())) as mitt
    from public.idehjerter h
    where h.ide_id = ide
    group by h.kommentar_id
  )
  select jsonb_build_object(
    'id', i.id,
    'forfatter_id', i.forfatter_id,
    'kategori', i.kategori,
    'gruppe_id', i.gruppe_id,
    'tittel', i.tittel,
    'tekst', i.tekst,
    'arkivert_kl', i.arkivert_kl,
    'oppgave', intern.oppgave_kort(i.id),
    'gruppeoppgave', intern.gruppeoppgave_kort(i.id),
    'opprettet_kl', i.opprettet_kl,
    'endret_kl', i.endret_kl,
    'lest_kl', now(),
    'sist_sett', (
      select b.sett_kl from public.idebesok b
      where b.ide_id = i.id and b.bruker_id = (select auth.uid())
    ),
    'kan_behandle', public.kan_behandle_ide(i.id),
    'kan_moderere', public.kan_moderere_ide(i.id),
    'kan_kommentere', intern.ide_kan_kommenteres(i.id),
    'hjerter', coalesce((select h.antall from hjerter h where h.kommentar_id is null), 0),
    'mitt_hjerte', coalesce((select h.mitt from hjerter h where h.kommentar_id is null), false),
    'kommentarer', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', k.id,
          'forelder_id', k.forelder_id,
          'forfatter_id', k.forfatter_id,
          'tekst', k.tekst,
          'slettet', k.slettet,
          'opprettet_kl', k.opprettet_kl,
          'endret_kl', k.endret_kl,
          'hjerter', case when k.slettet then 0 else coalesce(h.antall, 0) end,
          'mitt_hjerte', case when k.slettet then false else coalesce(h.mitt, false) end
        ) order by k.opprettet_kl, k.id)
      from public.idekommentarer k
      left join hjerter h on h.kommentar_id = k.id
      where k.ide_id = i.id
    ), '[]'::jsonb)
  )
  from public.ideer i
  where i.id = ide
    and (select auth.uid()) is not null
    and intern.kan_lese_ide(i)
    and (i.gruppe_id is not null or i.arkivert_kl is null or i.arkivert_kl > now() - intern.arkivfrist())
$$;

-- Som før, bare for en idé den innloggede leser.
create or replace function public.merk_ide_sett(ide uuid, lest_kl timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  insert into public.idebesok (bruker_id, ide_id, sett_kl)
  select (select auth.uid()), i.id, least(merk_ide_sett.lest_kl, now())
  from public.ideer i
  where i.id = merk_ide_sett.ide and (select auth.uid()) is not null and intern.kan_lese_ide(i)
  on conflict (bruker_id, ide_id) do update
    set sett_kl = greatest(public.idebesok.sett_kl, excluded.sett_kl)
$$;

-- --- Gruppeoppgavene: myndigheten og formen ------------------------------------

-- Låser gruppen (delt, så endringer av medlemmene og arkiveringen venter) og
-- gir den. Avslaget er det samme for en gruppe som ikke finnes og en den
-- innloggede ikke leser.
create function intern.las_gruppe_for_samhandling(gruppe uuid)
returns public.grupper
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grupper;
begin
  perform intern.krev_aktivt_medlemskap();
  select * into g from public.grupper x where x.id = las_gruppe_for_samhandling.gruppe for share;
  if g.id is null or not intern.kan_lese_gruppe(g.id) then
    raise exception 'Gruppen finnes ikke, eller du har ikke tilgang til den.' using errcode = 'P0002';
  end if;
  if g.status <> 'aktiv' then
    raise exception 'Gruppen er arkivert. Ingenting i den kan endres.' using errcode = '55000';
  end if;
  return g;
end;
$$;
revoke all on function intern.las_gruppe_for_samhandling(uuid) from public, anon, authenticated, service_role;

-- Låser gruppen og så oppgaven, og gir oppgaven.
create function intern.las_gruppeoppgave(oppgave uuid)
returns public.gruppeoppgaver
language plpgsql
security definer
set search_path = ''
as $$
declare
  gruppe uuid := (select o.gruppe_id from public.gruppeoppgaver o where o.id = las_gruppeoppgave.oppgave);
  o public.gruppeoppgaver;
begin
  perform intern.krev_aktivt_medlemskap();
  if gruppe is null or not intern.kan_lese_gruppe(gruppe) then
    raise exception 'Oppgaven finnes ikke, eller du har ikke tilgang til den.' using errcode = 'P0002';
  end if;
  perform intern.las_gruppe_for_samhandling(gruppe);
  select * into o from public.gruppeoppgaver x where x.id = las_gruppeoppgave.oppgave for update;
  if o.id is null then
    raise exception 'Oppgaven finnes ikke, eller du har ikke tilgang til den.' using errcode = 'P0002';
  end if;
  return o;
end;
$$;
revoke all on function intern.las_gruppeoppgave(uuid) from public, anon, authenticated, service_role;

-- De ansvarlige i gruppen (og systemarkitektene) styrer oppgavene.
create function intern.krev_styre_gruppeoppgaver(gruppe uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not intern.kan_styre_gruppe(krev_styre_gruppeoppgaver.gruppe) then
    raise exception 'Bare de ansvarlige i gruppen kan gjøre dette.' using errcode = '42501';
  end if;
end;
$$;
revoke all on function intern.krev_styre_gruppeoppgaver(uuid) from public, anon, authenticated, service_role;

-- Om brukeren kan få en oppgave i gruppen: et aktivt medlem med tilgang nå.
create function intern.kan_ha_gruppeoppgave(gruppe uuid, bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select bruker is not null and intern.grupperolle(kan_ha_gruppeoppgave.gruppe, kan_ha_gruppeoppgave.bruker) is not null
$$;
revoke all on function intern.kan_ha_gruppeoppgave(uuid, uuid) from public, anon, authenticated, service_role;

create function intern.krev_gyldig_gruppeoppgave(tittel text, beskrivelse jsonb, prioritet text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if tittel is null or char_length(btrim(tittel)) not between 1 and 140 then
    raise exception 'Overskriften må ha mellom 1 og 140 tegn.' using errcode = '22023';
  end if;
  if beskrivelse is not null and (jsonb_typeof(beskrivelse) <> 'object' or octet_length(beskrivelse::text) > 100000) then
    raise exception 'Beskrivelsen er for lang.' using errcode = '22023';
  end if;
  if prioritet is null or prioritet not in ('hoy', 'normal', 'lav') then
    raise exception 'Ukjent prioritet.' using errcode = '22023';
  end if;
end;
$$;
revoke all on function intern.krev_gyldig_gruppeoppgave(text, jsonb, text) from public, anon, authenticated, service_role;

-- Varsler den som har fått oppgaven. Den som ga den, varsles ikke.
create function intern.varsle_tildelt_gruppeoppgave(o public.gruppeoppgaver)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if o.ansvarlig_id is null or o.ansvarlig_id = (select auth.uid()) then
    return;
  end if;
  perform intern.varsle(
    array[o.ansvarlig_id],
    'gruppeoppgaver', 'gruppeoppgaver:' || o.id, null,
    jsonb_build_object('kl', now(), 'av', (select auth.uid()), 'art', 'tildelt', 'gruppeoppgave', o.id)
  );
end;
$$;
revoke all on function intern.varsle_tildelt_gruppeoppgave(public.gruppeoppgaver) from public, anon, authenticated, service_role;

-- Oppgaven slik appen viser den, med det den innloggede kan gjøre med den.
create function intern.gruppeoppgave_json(o public.gruppeoppgaver)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'gruppe_id', o.gruppe_id,
    'tittel', o.tittel,
    'beskrivelse', o.beskrivelse,
    'ansvarlig_id', o.ansvarlig_id,
    'ansvarlig_har_tilgang', o.ansvarlig_id is not null and intern.kan_ha_gruppeoppgave(o.gruppe_id, o.ansvarlig_id),
    'prioritet', o.prioritet,
    'status', o.status,
    'foreslatt_av', o.foreslatt_av,
    'opprettet_av', o.opprettet_av,
    'opprettet_kl', o.opprettet_kl,
    'endret_kl', o.endret_kl,
    'status_kl', o.status_kl,
    'fullfort_kl', o.fullfort_kl,
    'ide', (
      select jsonb_build_object(
        'id', i.id,
        'tittel', i.tittel,
        'kommentarer', (select count(*) from public.idekommentarer k where k.ide_id = i.id and not k.slettet)
      )
      from public.ideer i where i.id = o.ide_id
    ),
    'kan_endre', intern.kan_styre_gruppe(o.gruppe_id) and intern.kan_bidra_i_gruppe(o.gruppe_id),
    'kan_sette_status', intern.kan_bidra_i_gruppe(o.gruppe_id) and (
      intern.kan_styre_gruppe(o.gruppe_id)
      or (o.ansvarlig_id = (select auth.uid()) and intern.kan_ha_gruppeoppgave(o.gruppe_id, o.ansvarlig_id))
    )
  )
$$;
revoke all on function intern.gruppeoppgave_json(public.gruppeoppgaver) from public, anon, authenticated, service_role;

-- --- Gruppeoppgavene: operasjonene ---------------------------------------------

-- En ny oppgave uten idé bak. Den som oppretter, er opphavet.
create function public.opprett_gruppeoppgave(
  gruppe uuid,
  tittel text,
  beskrivelse jsonb default null,
  ansvarlig uuid default null,
  prioritet text default 'normal'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grupper := intern.las_gruppe_for_samhandling(opprett_gruppeoppgave.gruppe);
  o public.gruppeoppgaver;
begin
  perform intern.krev_styre_gruppeoppgaver(g.id);
  perform intern.krev_gyldig_gruppeoppgave(opprett_gruppeoppgave.tittel, opprett_gruppeoppgave.beskrivelse, opprett_gruppeoppgave.prioritet);
  if opprett_gruppeoppgave.ansvarlig is not null and not intern.kan_ha_gruppeoppgave(g.id, opprett_gruppeoppgave.ansvarlig) then
    raise exception 'Oppgaven kan bare gis til et aktivt medlem av gruppen.' using errcode = '22023';
  end if;
  insert into public.gruppeoppgaver (gruppe_id, tittel, beskrivelse, ansvarlig_id, prioritet, opprettet_av)
  values (g.id, btrim(opprett_gruppeoppgave.tittel), opprett_gruppeoppgave.beskrivelse,
    opprett_gruppeoppgave.ansvarlig, opprett_gruppeoppgave.prioritet, (select auth.uid()))
  returning * into o;
  perform intern.varsle_tildelt_gruppeoppgave(o);
  return o.id;
end;
$$;

-- Gjør en åpen gruppeidé om til en oppgave i gruppen, med overskriften og
-- beskrivelsen fra idéen. Er den alt gjort om, gis den samme oppgaven.
create function public.gjor_om_til_gruppeoppgave(ide uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.ideer;
  g public.grupper;
  ny uuid;
begin
  perform intern.krev_aktivt_medlemskap();
  select * into i from public.ideer x where x.id = gjor_om_til_gruppeoppgave.ide;
  if i.id is null or i.gruppe_id is null or not intern.kan_lese_ide(i) then
    raise exception 'Idéen finnes ikke i en gruppe du har tilgang til.' using errcode = 'P0002';
  end if;
  g := intern.las_gruppe_for_samhandling(i.gruppe_id);
  perform intern.krev_styre_gruppeoppgaver(g.id);
  -- Idéen låses, så to som gjør den om samtidig, får samme oppgave.
  perform 1 from public.ideer x where x.id = i.id for update;
  select o.id into ny from public.gruppeoppgaver o where o.ide_id = i.id;
  if ny is not null then
    return ny;
  end if;
  if not public.ide_er_apen(i.id) then
    raise exception 'Idéen er alt behandlet.' using errcode = '55000';
  end if;
  insert into public.gruppeoppgaver (gruppe_id, ide_id, tittel, beskrivelse, foreslatt_av, opprettet_av)
  select x.gruppe_id, x.id, x.tittel, x.tekst, x.forfatter_id, (select auth.uid())
  from public.ideer x where x.id = i.id
  returning id into ny;
  perform intern.varsle_gruppeidebehandling(i.id, 'gjort_om', ny);
  return ny;
end;
$$;

create function public.endre_gruppeoppgave(oppgave uuid, tittel text, beskrivelse jsonb, prioritet text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.gruppeoppgaver := intern.las_gruppeoppgave(endre_gruppeoppgave.oppgave);
begin
  perform intern.krev_styre_gruppeoppgaver(o.gruppe_id);
  perform intern.krev_gyldig_gruppeoppgave(endre_gruppeoppgave.tittel, endre_gruppeoppgave.beskrivelse, endre_gruppeoppgave.prioritet);
  update public.gruppeoppgaver x
  set tittel = btrim(endre_gruppeoppgave.tittel),
      beskrivelse = endre_gruppeoppgave.beskrivelse,
      prioritet = endre_gruppeoppgave.prioritet,
      endret_kl = now()
  where x.id = o.id
    and (x.tittel, x.beskrivelse, x.prioritet)
      is distinct from (btrim(endre_gruppeoppgave.tittel), endre_gruppeoppgave.beskrivelse, endre_gruppeoppgave.prioritet);
end;
$$;

-- Gir oppgaven til et aktivt medlem av gruppen, eller til ingen (null).
create function public.tildel_gruppeoppgave(oppgave uuid, ansvarlig uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.gruppeoppgaver := intern.las_gruppeoppgave(tildel_gruppeoppgave.oppgave);
begin
  perform intern.krev_styre_gruppeoppgaver(o.gruppe_id);
  if o.ansvarlig_id is not distinct from tildel_gruppeoppgave.ansvarlig then
    return;
  end if;
  if tildel_gruppeoppgave.ansvarlig is not null and not intern.kan_ha_gruppeoppgave(o.gruppe_id, tildel_gruppeoppgave.ansvarlig) then
    raise exception 'Oppgaven kan bare gis til et aktivt medlem av gruppen.' using errcode = '22023';
  end if;
  update public.gruppeoppgaver x set ansvarlig_id = tildel_gruppeoppgave.ansvarlig
  where x.id = o.id
  returning * into o;
  perform intern.varsle_tildelt_gruppeoppgave(o);
end;
$$;

-- Fremdriften: de ansvarlige i gruppen, og den som har oppgaven.
create function public.sett_gruppeoppgavestatus(oppgave uuid, status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.gruppeoppgaver;
begin
  perform intern.krev_aktivt_medlemskap();
  o := intern.las_gruppeoppgave(sett_gruppeoppgavestatus.oppgave);
  if not (
    intern.kan_styre_gruppe(o.gruppe_id)
    or (o.ansvarlig_id = (select auth.uid()) and intern.kan_ha_gruppeoppgave(o.gruppe_id, o.ansvarlig_id))
  ) then
    raise exception 'Bare den som har oppgaven, og de ansvarlige i gruppen, kan endre statusen.' using errcode = '42501';
  end if;
  if sett_gruppeoppgavestatus.status is null or sett_gruppeoppgavestatus.status not in ('ikke_paabegynt', 'paagaar', 'fullfort') then
    raise exception 'Ukjent status.' using errcode = '22023';
  end if;
  if o.status = sett_gruppeoppgavestatus.status then
    return;
  end if;
  update public.gruppeoppgaver x
  set status = sett_gruppeoppgavestatus.status,
      status_kl = now(),
      fullfort_kl = case when sett_gruppeoppgavestatus.status = 'fullfort' then now() end
  where x.id = o.id;
  if sett_gruppeoppgavestatus.status = 'fullfort' and o.ide_id is not null then
    perform intern.varsle_gruppeidebehandling(o.ide_id, 'fullfort', o.id);
  end if;
end;
$$;

-- Fjerner oppgaven. Var den gjort om fra en idé, er idéen åpen i lista igjen,
-- med kommentarene. Det samme som å angre omgjøringen.
create function public.fjern_gruppeoppgave(oppgave uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.gruppeoppgaver;
begin
  perform intern.krev_aktivt_medlemskap();
  if not exists (select 1 from public.gruppeoppgaver x where x.id = fjern_gruppeoppgave.oppgave) then
    return;
  end if;
  o := intern.las_gruppeoppgave(fjern_gruppeoppgave.oppgave);
  perform intern.krev_styre_gruppeoppgaver(o.gruppe_id);
  -- Varslene om oppgaven forsvinner av seg selv: en hendelse om en oppgave
  -- som ikke finnes, vises ikke (`intern.varselhendelser`).
  delete from public.gruppeoppgaver x where x.id = o.id;
end;
$$;

-- Merker varslene om oppgaven lest, når den innloggede åpner den: bare dem
-- som var der da oppgaven ble lest (`lest_kl` fra `gruppeoppgave()`), så et
-- varsel som kommer i mellomtiden, står ulest. Bare så lenge den innloggede
-- leser gruppen.
create function public.merk_gruppeoppgave_sett(oppgave uuid, til timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  update public.varsler v set lest_kl = now()
  where v.mottaker_id = (select auth.uid())
    and v.gruppe = 'gruppeoppgaver:' || merk_gruppeoppgave_sett.oppgave
    and v.lest_kl is null
    and v.oppdatert_kl <= least(merk_gruppeoppgave_sett.til, now())
    and exists (
      select 1 from public.gruppeoppgaver o
      where o.id = merk_gruppeoppgave_sett.oppgave and intern.kan_lese_gruppe(o.gruppe_id)
    )
$$;

-- --- Gruppeoppgavene: lesingen ---------------------------------------------------

-- Oppgavene i gruppen, de som ikke er fullført først: etter prioritet og så
-- de nyeste først. De fullførte etter når de ble fullført.
create function public.gruppeoppgaveoversikt(gruppe uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  if not intern.kan_lese_gruppe(gruppeoppgaveoversikt.gruppe) then
    raise exception 'Gruppen finnes ikke, eller du har ikke tilgang til den.' using errcode = 'P0002';
  end if;
  return jsonb_build_object(
    'kan_opprette', intern.kan_styre_gruppe(gruppeoppgaveoversikt.gruppe) and intern.kan_bidra_i_gruppe(gruppeoppgaveoversikt.gruppe),
    'oppgaver', coalesce((
      select jsonb_agg(intern.gruppeoppgave_json(o) order by
          o.status = 'fullfort',
          case when o.status = 'fullfort' then null else case o.prioritet when 'hoy' then 0 when 'normal' then 1 else 2 end end,
          o.fullfort_kl desc nulls last,
          o.opprettet_kl desc,
          o.id)
      from public.gruppeoppgaver o
      where o.gruppe_id = gruppeoppgaveoversikt.gruppe
    ), '[]'::jsonb)
  );
end;
$$;

-- Én oppgave, eller null når den ikke finnes eller ikke kan leses.
create function public.gruppeoppgave(oppgave uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  -- `lest_kl`: når oppgaven ble lest, for `merk_gruppeoppgave_sett`.
  select intern.gruppeoppgave_json(o) || jsonb_build_object('lest_kl', now())
  from public.gruppeoppgaver o
  where o.id = gruppeoppgave.oppgave and intern.kan_lese_gruppe(o.gruppe_id)
$$;

-- Det gruppesiden viser på fanene: idéene den innloggede ikke har sett, eller
-- som har nye kommentarer, de åpne idéene som venter på behandling, og
-- oppgavene den innloggede har og ikke har fullført.
create function intern.gruppesamhandling(gruppe uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nye_ideer', (
      select count(*) from jsonb_array_elements(intern.ideliste(gruppesamhandling.gruppe)) i
      where i ->> 'arkivert_kl' is null
        and (not (i ->> 'sett')::boolean or (i ->> 'nye_kommentarer')::integer > 0)
    ),
    'venter', (
      select count(*) from public.ideer i
      where i.gruppe_id = gruppesamhandling.gruppe
        and i.arkivert_kl is null
        and not exists (select 1 from public.gruppeoppgaver o where o.ide_id = i.id)
    ),
    'mine_oppgaver', (
      select count(*) from public.gruppeoppgaver o
      where o.gruppe_id = gruppesamhandling.gruppe
        and o.ansvarlig_id = (select auth.uid())
        and o.status <> 'fullfort'
    )
  )
$$;
revoke all on function intern.gruppesamhandling(uuid) from public, anon, authenticated, service_role;

-- Som før, med tallene til fanene (`samhandling`).
create or replace function public.gruppeoversikt(gruppe uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  g public.grupper;
begin
  perform intern.krev_aktivt_medlemskap();
  select * into g from public.grupper x where x.id = gruppeoversikt.gruppe;
  if g.id is null or not intern.kan_lese_gruppe(g.id, aktor) then
    raise exception 'Gruppen finnes ikke, eller du har ikke tilgang til den.' using errcode = 'P0002';
  end if;
  return intern.gruppereferanse(g) || jsonb_build_object(
    'opprettet_kl', g.opprettet_kl,
    'rolle', intern.grupperolle(g.id, aktor),
    'kan_styre', intern.gruppeavslag(aktor, g, null, 'endre') is null,
    'kan_moderere', intern.kan_moderere_gruppe(g.id, aktor),
    'kan_forlate', intern.gruppeavslag(aktor, g, aktor, 'forlat') is null,
    'kan_gjenapne', g.status = 'arkivert' and intern.er_systemarkitekt(aktor),
    'samhandling', intern.gruppesamhandling(g.id),
    'medlemmer', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', p.id,
          'username', p.username,
          'first_name', p.first_name,
          'last_name', p.last_name,
          'avatar_path', p.avatar_path,
          'updated_at', p.updated_at,
          'rolle', m.rolle,
          'status', m.status,
          'fra', m.fra,
          'aktiv_fra', m.aktiv_fra,
          'har_tilgang', m.status = 'aktiv' and intern.grupperolle(g.id, p.id) is not null,
          'kan_fjerne', p.id <> aktor and intern.gruppeavslag(aktor, g, p.id, 'fjern') is null,
          'kan_endre_rolle', intern.gruppeavslag(aktor, g, p.id, 'rolle') is null,
          'siste_ansvarlige', m.status = 'aktiv' and m.rolle = 'ansvarlig' and not exists (
            select 1 from public.gruppemedlemskap o
            where o.gruppe_id = g.id and o.status = 'aktiv' and o.rolle = 'ansvarlig' and o.bruker_id <> p.id
          )
        ) order by m.status, case m.rolle when 'ansvarlig' then 0 when 'moderator' then 1 else 2 end,
          p.first_name, p.last_name, p.username)
      from public.gruppemedlemskap m
      join public.profiles p on p.id = m.bruker_id
      where m.gruppe_id = g.id and m.status <> 'avsluttet'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.gruppeideer(uuid) from public, anon;
revoke all on function public.opprett_gruppeoppgave(uuid, text, jsonb, uuid, text) from public, anon;
revoke all on function public.gjor_om_til_gruppeoppgave(uuid) from public, anon;
revoke all on function public.endre_gruppeoppgave(uuid, text, jsonb, text) from public, anon;
revoke all on function public.tildel_gruppeoppgave(uuid, uuid) from public, anon;
revoke all on function public.sett_gruppeoppgavestatus(uuid, text) from public, anon;
revoke all on function public.fjern_gruppeoppgave(uuid) from public, anon;
revoke all on function public.merk_gruppeoppgave_sett(uuid, timestamptz) from public, anon;
revoke all on function public.gruppeoppgaveoversikt(uuid) from public, anon;
revoke all on function public.gruppeoppgave(uuid) from public, anon;

grant execute on function public.gruppeideer(uuid) to authenticated;
grant execute on function public.opprett_gruppeoppgave(uuid, text, jsonb, uuid, text) to authenticated;
grant execute on function public.gjor_om_til_gruppeoppgave(uuid) to authenticated;
grant execute on function public.endre_gruppeoppgave(uuid, text, jsonb, text) to authenticated;
grant execute on function public.tildel_gruppeoppgave(uuid, uuid) to authenticated;
grant execute on function public.sett_gruppeoppgavestatus(uuid, text) to authenticated;
grant execute on function public.fjern_gruppeoppgave(uuid) to authenticated;
grant execute on function public.merk_gruppeoppgave_sett(uuid, timestamptz) to authenticated;
grant execute on function public.gruppeoppgaveoversikt(uuid) to authenticated;
grant execute on function public.gruppeoppgave(uuid) to authenticated;

-- --- Varslene ------------------------------------------------------------------

-- Gruppen et varsel hører til: trådens, idéens eller gruppeoppgavens. Ellers
-- som før.
create or replace function intern.varsle(
  mottakere uuid[],
  kategori public.varselkategori,
  gruppe text,
  ide uuid,
  hendelse jsonb,
  erstatt text default null,
  diskusjon uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  with omfang as (
    select
      intern.varselomfang(varsle.diskusjon, varsle.hendelse) as f,
      coalesce(
        (select d.gruppe_id from public.diskusjoner d where d.id = varsle.diskusjon),
        (select i.gruppe_id from public.ideer i where i.id = varsle.ide),
        (select o.gruppe_id from public.gruppeoppgaver o
          where varsle.hendelse ? 'gruppeoppgave' and o.id = (varsle.hendelse ->> 'gruppeoppgave')::uuid)
      ) as g
  )
  insert into public.varsler as v (mottaker_id, kategori, gruppe, ide_id, diskusjon_id, fagmiljo_id, gruppe_id, hendelser)
  select distinct m, varsle.kategori, varsle.gruppe, varsle.ide, varsle.diskusjon, o.f, o.g, jsonb_build_array(varsle.hendelse)
  from unnest(varsle.mottakere) m, omfang o
  where m is not null
    and intern.kan_lese_samhandling(o.f, o.g, m)
  on conflict (mottaker_id, gruppe) where lest_kl is null do update
    set hendelser = (
        select coalesce(jsonb_agg(h.verdi order by h.nr), '[]'::jsonb)
        from (
          select t.verdi, t.nr
          from jsonb_array_elements(v.hendelser || excluded.hendelser) with ordinality t(verdi, nr)
          where varsle.erstatt is null
            or t.nr = jsonb_array_length(v.hendelser) + 1
            or t.verdi -> varsle.erstatt is distinct from varsle.hendelse -> varsle.erstatt
          order by t.nr desc
          limit 100
        ) h
      ),
      oppdatert_kl = now()
$$;

-- En ny felles idé varsler alle andre, som før (`nye_ideer`). En ny gruppeidé
-- varsler de andre aktive medlemmene i gruppen (`gruppeideer`); `varsle`
-- tar bort dem som ikke leser gruppen nå.
create or replace function intern.varsle_ny_ide()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.gruppe_id is null then
    perform intern.varsle(
      array(select p.id from public.profiles p where p.id <> new.forfatter_id),
      'nye_ideer', 'nye_ideer:' || new.id, new.id,
      jsonb_build_object('kl', new.opprettet_kl, 'av', new.forfatter_id)
    );
  else
    perform intern.varsle(
      array(
        select m.bruker_id from public.gruppemedlemskap m
        where m.gruppe_id = new.gruppe_id and m.status = 'aktiv' and m.bruker_id <> new.forfatter_id
      ),
      'gruppeideer', 'gruppeideer:' || new.id, new.id,
      jsonb_build_object('kl', new.opprettet_kl, 'av', new.forfatter_id)
    );
  end if;
  return null;
end;
$$;

-- Gruppeoppgaven et varsel viser til, slik varselet viser den, eller null når
-- den ikke finnes eller den innloggede ikke leser gruppen.
create function intern.varselgruppeoppgave(oppgave uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', o.id,
    'tittel', o.tittel,
    'gruppe', jsonb_build_object('id', g.id, 'navn', g.navn)
  )
  from public.gruppeoppgaver o
  join public.grupper g on g.id = o.gruppe_id
  where o.id = varselgruppeoppgave.oppgave and intern.kan_lese_gruppe(g.id)
$$;
revoke all on function intern.varselgruppeoppgave(uuid) from public, anon, authenticated, service_role;

-- Som før, og en hendelse om en gruppeoppgave viser oppgaven; den står bare
-- så lenge oppgaven finnes.
create or replace function intern.varselhendelser(hendelser jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(jsonb_agg(
      case
        when h ? 'objekt' then h || jsonb_build_object('objekt', intern.fortolkningsobjekt((h ->> 'objekt')::uuid))
        when h ? 'side' then h || jsonb_build_object('side', intern.varselside((h ->> 'side')::uuid))
        when h ? 'forslag' then h || jsonb_build_object('forslag', intern.varselforslag((h ->> 'forslag')::uuid))
        when h ? 'gruppeoppgave' then h || jsonb_build_object('gruppeoppgave', intern.varselgruppeoppgave((h ->> 'gruppeoppgave')::uuid))
        else h
      end
      order by nr
    ), '[]'::jsonb)
  from jsonb_array_elements(hendelser) with ordinality t(h, nr)
  where (not h ? 'kommentar' or exists (
      select 1 from public.idekommentarer k where k.id = (h ->> 'kommentar')::uuid and not k.slettet
    ))
    and (not h ? 'innlegg' or exists (
      select 1 from public.diskusjonskommentarer k where k.id = (h ->> 'innlegg')::uuid and not k.slettet
    ))
    and (not h ? 'forslag' or intern.varselforslag((h ->> 'forslag')::uuid) is not null)
    and (not h ? 'gruppeoppgave' or intern.varselgruppeoppgave((h ->> 'gruppeoppgave')::uuid) is not null)
$$;

-- Som før, med gruppen idéen hører til, så appen åpner den i gruppen.
create or replace function public.mine_varsler()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select jsonb_build_object(
    'lest_kl', now(),
    'varsler', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', v.id,
          'kategori', v.kategori,
          'ide', (select jsonb_build_object('id', i.id, 'tittel', i.tittel, 'forfatter_id', i.forfatter_id,
                    'gruppe', (select jsonb_build_object('id', g.id, 'navn', g.navn) from public.grupper g where g.id = i.gruppe_id))
                  from public.ideer i where i.id = v.ide_id),
          'diskusjon', (select jsonb_build_object('id', d.id, 'tittel', d.tittel, 'side', d.side, 'forfatter_id', d.forfatter_id)
                        from public.diskusjoner d where d.id = v.diskusjon_id),
          'hendelser', v.hendelser,
          'opprettet_kl', v.opprettet_kl,
          'oppdatert_kl', v.oppdatert_kl,
          'lest_kl', v.lest_kl,
          'arkivert_kl', v.arkivert_kl
        ) order by v.oppdatert_kl desc, v.id)
      from (
        select v.id, v.kategori, v.ide_id, v.diskusjon_id, v.opprettet_kl, v.oppdatert_kl, v.lest_kl, v.arkivert_kl,
               intern.varselhendelser(v.hendelser) as hendelser
        from public.varsler v
        where v.mottaker_id = (select auth.uid())
          and (v.lest_kl is null or v.lest_kl > now() - intern.varselfrist())
          and intern.kan_lese_samhandling(v.fagmiljo_id, v.gruppe_id)
        order by v.lest_kl is not null, v.oppdatert_kl desc, v.id
        limit 200
      ) v
      where jsonb_array_length(v.hendelser) > 0
    ), '[]'::jsonb)
  )
$$;

-- --- Direktelenkene -----------------------------------------------------------

-- Som før, og en lenke til en gruppeidé finnes bare for dem som leser
-- gruppen; den sier hvilken gruppe idéen står i, og om den er gjort om til en
-- gruppeoppgave. Arkivfristen gjelder bare de felles idéene.
create or replace function public.direktelenke(slag text, id uuid, kommentar uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select case direktelenke.slag
    when 'diskusjon' then (
      select jsonb_build_object(
        'slag', 'diskusjon',
        'id', d.id,
        'side', d.side,
        'tittel', d.tittel,
        'kategori', (
          select jsonb_build_object('navn', k.navn, 'emoji', k.emoji)
          from public.diskusjonskategorier k where k.id = d.kategori_id
        ),
        'forfatter', intern.direktelenke_forfatter(d.forfatter_id),
        'opprettet_kl', d.opprettet_kl,
        'tekst', d.tekst,
        'skjult', d.skjult_kl is not null,
        'arkivert_kl', d.arkivert_kl,
        'kommentarer', (
          select count(*) from public.diskusjonskommentarer k
          where k.diskusjon_id = d.id and not k.slettet
        ),
        'kommentar', (
          select jsonb_build_object(
            'id', k.id,
            'forfatter', intern.direktelenke_forfatter(k.forfatter_id),
            'opprettet_kl', k.opprettet_kl,
            'tekst', k.tekst,
            'slettet', k.slettet,
            'skjult', k.skjult_kl is not null
          )
          from public.diskusjonskommentarer k
          where k.id = direktelenke.kommentar and k.diskusjon_id = d.id
        )
      )
      from public.diskusjoner d
      where d.id = direktelenke.id
        and intern.kan_lese_samhandling(d.fagmiljo_id, d.gruppe_id)
        and (direktelenke.kommentar is null or exists (
          select 1 from public.diskusjonskommentarer k
          where k.id = direktelenke.kommentar and k.diskusjon_id = d.id
        ))
    )
    when 'ide' then (
      select jsonb_build_object(
        'slag', 'ide',
        'id', i.id,
        'tittel', i.tittel,
        'idekategori', i.kategori,
        'gruppe', (select jsonb_build_object('id', g.id, 'navn', g.navn) from public.grupper g where g.id = i.gruppe_id),
        'forfatter', intern.direktelenke_forfatter(i.forfatter_id),
        'opprettet_kl', i.opprettet_kl,
        'tekst', i.tekst,
        'arkivert_kl', i.arkivert_kl,
        'overfort', exists (select 1 from public.oppgaver o where o.ide_id = i.id),
        'gruppeoppgave', exists (select 1 from public.gruppeoppgaver o where o.ide_id = i.id),
        'kommentarer', (
          select count(*) from public.idekommentarer k
          where k.ide_id = i.id and not k.slettet
        ),
        'kommentar', (
          select jsonb_build_object(
            'id', k.id,
            'forfatter', intern.direktelenke_forfatter(k.forfatter_id),
            'opprettet_kl', k.opprettet_kl,
            'tekst', k.tekst,
            'slettet', k.slettet,
            'skjult', false
          )
          from public.idekommentarer k
          where k.id = direktelenke.kommentar and k.ide_id = i.id
        )
      )
      from public.ideer i
      where i.id = direktelenke.id
        and intern.kan_lese_ide(i)
        and (i.gruppe_id is not null or i.arkivert_kl is null or i.arkivert_kl > now() - intern.arkivfrist())
        and (direktelenke.kommentar is null or exists (
          select 1 from public.idekommentarer k
          where k.id = direktelenke.kommentar and k.ide_id = i.id
        ))
    )
  end
  where (select auth.uid()) is not null
$$;
