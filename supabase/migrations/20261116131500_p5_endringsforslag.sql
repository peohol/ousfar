-- P5 tråd B1 (#416, docs/redaktorer-og-forslag.md, «Datamodellen» og
-- «Grensesnittene»): endringsforslagene. Et aktivt medlem kan foreslå en
-- endring i en fagside eller et regelsett det kan lese, følge forslaget og
-- trekke det tilbake. Forslaget gir aldri skrive- eller publiseringsrett, og
-- det endrer ikke noe innhold: det står for seg, med sin egen tidslinje.
--
--  * `endringsforslag` og `endringsforslag_hendelser` skrives bare gjennom
--    funksjonene her og behandlingen (tråd C). Nettleseren leser dem bare
--    gjennom funksjonene, som returnerer JSON.
--  * Et forslag ses av forslagsstilleren så lenge vedkommende kan lese
--    ressursen, og av dem som kan behandle forslag til den
--    (`intern.kan_behandle_forslag`). Ingen andre; en fremmed ID gir samme
--    svar som en som ikke finnes (PT404).
--  * Hver statusendring går gjennom `intern.forslagsovergang`, som låser
--    raden, avviser en overgang som ikke passer statusen den finner (PT409)
--    og skriver hendelsen i samme operasjon. Tråd C bruker den samme.
--  * Varslene lager tråd C fra hendelsene; her lages ingen.
--
-- Additiv: to nye tabeller og nye funksjoner. Ingen eksisterende data eller
-- funksjoner endres. Radene fjernes bare med ressursen, når en fagside slettes
-- for godt fra papirkurven (som resten av historikken dens).
--
-- Tilbakeføring: en ny migrasjon som fjerner funksjonene herfra. Tabellene kan
-- stå; uten funksjonene leses og skrives ingenting i dem.

-- --- Tabellene ------------------------------------------------------------------

create table public.endringsforslag (
  id uuid primary key default gen_random_uuid(),
  ressurs_id uuid not null references public.redigerbare_objekter (id) on delete cascade,
  element_id uuid references public.redigerbare_objekter (id) on delete cascade,
  grunnrevisjon integer not null,
  sideversjon integer,
  sted text,
  utdrag text,
  forslag text not null,
  begrunnelse text not null,
  kilder jsonb not null default '[]'::jsonb,
  status text not null default 'ny',
  stilt_av uuid references public.profiles (id) on delete set null,
  opprettet_kl timestamptz not null default now(),
  oppdatert_kl timestamptz not null default now(),
  behandler_id uuid references public.profiles (id) on delete set null,
  vedtak_av uuid references public.profiles (id) on delete set null,
  vedtak_kl timestamptz,
  vedtak_begrunnelse text,
  innarbeidet_objekt uuid references public.redigerbare_objekter (id) on delete cascade,
  innarbeidet_revisjon integer,
  constraint endringsforslag_status check (
    status in ('ny', 'under_behandling', 'venter_pa_forslagsstiller', 'godkjent', 'innarbeidet', 'avvist', 'trukket')
  ),
  constraint endringsforslag_element check (element_id is null or element_id <> ressurs_id),
  constraint endringsforslag_grunnrevisjon check (grunnrevisjon >= 1),
  constraint endringsforslag_sideversjon check (sideversjon is null or sideversjon >= 1),
  constraint endringsforslag_sted check (sted is null or char_length(sted) between 1 and 200),
  constraint endringsforslag_utdrag check (utdrag is null or char_length(utdrag) between 1 and 2000),
  constraint endringsforslag_forslag check (char_length(forslag) between 1 and 8000 and btrim(forslag) <> ''),
  constraint endringsforslag_begrunnelse check (char_length(begrunnelse) between 1 and 4000 and btrim(begrunnelse) <> ''),
  constraint endringsforslag_kilder check (jsonb_typeof(kilder) = 'array' and jsonb_array_length(kilder) <= 10),
  constraint endringsforslag_vedtak_begrunnelse check (vedtak_begrunnelse is null or char_length(vedtak_begrunnelse) <= 4000),
  constraint endringsforslag_innarbeidet check ((innarbeidet_objekt is null) = (innarbeidet_revisjon is null))
);

comment on table public.endringsforslag is
  'P5: forslagene til endringer i en fagside eller et regelsett. Skrives og leses bare gjennom funksjonene. Se docs/redaktorer-og-forslag.md.';

-- «Mine forslag», køen per ressurs og status, behandlerens egne, og de åpne
-- på tvers (tråd C).
create index endringsforslag_stilt_av_idx on public.endringsforslag (stilt_av, opprettet_kl desc);
create index endringsforslag_ressurs_idx on public.endringsforslag (ressurs_id, status);
create index endringsforslag_behandler_idx on public.endringsforslag (behandler_id) where behandler_id is not null;
create index endringsforslag_status_idx on public.endringsforslag (status, oppdatert_kl desc);
create index endringsforslag_element_idx on public.endringsforslag (element_id) where element_id is not null;
create index endringsforslag_innarbeidet_idx on public.endringsforslag (innarbeidet_objekt) where innarbeidet_objekt is not null;

create table public.endringsforslag_hendelser (
  id bigint generated always as identity primary key,
  forslag_id uuid not null references public.endringsforslag (id) on delete cascade,
  art text not null,
  tekst text,
  utfort_av uuid references public.profiles (id) on delete set null,
  utfort_kl timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  constraint endringsforslag_hendelser_art check (
    art in ('opprettet', 'kommentar', 'presisering_bedt', 'presisering', 'tatt', 'godkjent', 'avvist',
            'trukket', 'innarbeidet', 'konflikt_sett')
  ),
  constraint endringsforslag_hendelser_tekst check (tekst is null or char_length(tekst) between 1 and 4000),
  constraint endringsforslag_hendelser_data check (jsonb_typeof(data) = 'object')
);

comment on table public.endringsforslag_hendelser is
  'P5: tidslinjen for hvert endringsforslag. Endres ikke. Skrives bare gjennom funksjonene. Se docs/redaktorer-og-forslag.md.';

create index endringsforslag_hendelser_forslag_idx on public.endringsforslag_hendelser (forslag_id, id);
create index endringsforslag_hendelser_utfort_av_idx on public.endringsforslag_hendelser (utfort_av) where utfort_av is not null;

alter table public.endringsforslag enable row level security;
alter table public.endringsforslag_hendelser enable row level security;

-- Nettleseren leser og skriver bare gjennom funksjonene.
revoke all on public.endringsforslag, public.endringsforslag_hendelser from anon, authenticated;

-- Det forslagsstilleren skrev, og tidslinjen, står som det ble skrevet. Bare
-- personfeltene kan bli tomme, når en konto slettes.
create trigger endringsforslag_faste_felter
before update on public.endringsforslag
for each row execute function intern.tilgang_faste_felter(
  'id', 'ressurs_id', 'element_id', 'grunnrevisjon', 'sideversjon', 'sted', 'utdrag', 'forslag', 'begrunnelse',
  'kilder', 'opprettet_kl'
);

create trigger endringsforslag_hendelser_faste_felter
before update on public.endringsforslag_hendelser
for each row execute function intern.tilgang_faste_felter('id', 'forslag_id', 'art', 'tekst', 'utfort_kl', 'data');

-- --- Hjelperne ---------------------------------------------------------------------

-- Statusene der forslaget ennå ikke er avgjort: forslagsstilleren kan trekke
-- det og skrive i det, og det teller mot grensen for åpne forslag.
create function intern.apne_forslagsstatuser()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['ny', 'under_behandling', 'venter_pa_forslagsstiller']
$$;

revoke all on function intern.apne_forslagsstatuser() from public, anon, authenticated, service_role;

-- Flest åpne forslag én person kan ha samtidig.
create function intern.maks_apne_forslag()
returns integer
language sql
immutable
set search_path = ''
as $$
  select 25
$$;

revoke all on function intern.maks_apne_forslag() from public, anon, authenticated, service_role;

-- Om brukeren kan se forslaget: forslagsstilleren, så lenge vedkommende kan
-- lese ressursen, og de som kan behandle forslag til ressursen. Alle andre
-- svar er nei, også for et forslag som ikke finnes.
create function intern.kan_se_forslag(forslag uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select kan_se_forslag.bruker is not null
      and intern.har_aktivt_medlemskap(kan_se_forslag.bruker)
      and (
        (f.stilt_av = kan_se_forslag.bruker and intern.kan_lese_objekt(f.ressurs_id, kan_se_forslag.bruker))
        or intern.kan_behandle_forslag(f.ressurs_id, kan_se_forslag.bruker)
      )
    from public.endringsforslag f
    where f.id = kan_se_forslag.forslag
  ), false)
$$;

revoke all on function intern.kan_se_forslag(uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.kan_se_forslag(uuid, uuid) is
  'P5: om brukeren kan se forslaget (forslagsstilleren som kan lese ressursen, eller en som kan behandle det). Se docs/redaktorer-og-forslag.md.';

-- Den ene statusovergangen for et forslag, for forslagsstilleren (her) og
-- behandlingen (tråd C). Låser raden, avviser en overgang fra en status som
-- ikke står i `fra` (PT409: noen andre har endret den i mellomtiden),
-- oppdaterer statusen (`til` tom: bare en hendelse) og skriver hendelsen med
-- den innloggede. Rettighetene kontrollerer den som kaller, før kallet.
create function intern.forslagsovergang(
  forslag uuid,
  fra text[],
  til text,
  art text,
  tekst text default null,
  data jsonb default '{}'::jsonb
)
returns public.endringsforslag
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad public.endringsforslag;
  ren text := nullif(btrim(forslagsovergang.tekst), '');
begin
  select * into rad from public.endringsforslag f where f.id = forslagsovergang.forslag for update;
  if not found then
    raise exception 'Fant ikke forslaget.' using errcode = 'PT404';
  end if;
  if not (rad.status = any (forslagsovergang.fra)) then
    raise exception 'Forslaget er endret i mellomtiden. Oppdater siden og prøv igjen.'
      using errcode = 'PT409', detail = rad.status;
  end if;
  if char_length(ren) > 4000 then
    raise exception 'Teksten kan være høyst 4000 tegn.' using errcode = '22023';
  end if;
  update public.endringsforslag f
  set status = coalesce(forslagsovergang.til, f.status), oppdatert_kl = now()
  where f.id = rad.id
  returning * into rad;
  insert into public.endringsforslag_hendelser (forslag_id, art, tekst, utfort_av, data)
  values (rad.id, forslagsovergang.art, ren, (select auth.uid()), coalesce(forslagsovergang.data, '{}'::jsonb));
  return rad;
end;
$$;

revoke all on function intern.forslagsovergang(uuid, text[], text, text, text, jsonb) from public, anon, authenticated, service_role;

comment on function intern.forslagsovergang(uuid, text[], text, text, text, jsonb) is
  'P5: låser forslaget, flytter statusen fra en av `fra` til `til` (tom: uendret) og skriver hendelsen. PT404/PT409. Se docs/redaktorer-og-forslag.md.';

-- Kildene slik de lagres: høyst ti, hver med en tekst, en lenke (bare
-- https://) eller en referanse fra referansebasen den innloggede kan lese.
-- Ukjente felt tas bort. Gir 22023 med en melding som kan vises.
create function intern.forslagskilder(kilder jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  kilde jsonb;
  tekst text;
  lenke text;
  referanse uuid;
  svar jsonb := '[]'::jsonb;
begin
  if kilder is null or kilder = 'null'::jsonb then
    return svar;
  end if;
  if jsonb_typeof(kilder) <> 'array' then
    raise exception 'Kildene må være en liste.' using errcode = '22023';
  end if;
  if jsonb_array_length(kilder) > 10 then
    raise exception 'Et forslag kan ha høyst ti kilder.' using errcode = '22023';
  end if;
  for kilde in select k from jsonb_array_elements(kilder) k loop
    if jsonb_typeof(kilde) <> 'object' then
      raise exception 'En kilde har feil form.' using errcode = '22023';
    end if;
    tekst := nullif(btrim(case when jsonb_typeof(kilde -> 'tekst') = 'string' then kilde ->> 'tekst' end), '');
    lenke := nullif(btrim(case when jsonb_typeof(kilde -> 'lenke') = 'string' then kilde ->> 'lenke' end), '');
    referanse := null;
    if char_length(tekst) > 500 then
      raise exception 'Teksten til en kilde kan være høyst 500 tegn.' using errcode = '22023';
    end if;
    if lenke is not null and (char_length(lenke) > 2000 or lenke !~* '^https://[^[:space:]]+$') then
      raise exception 'En lenke må begynne med https:// og kan ikke ha mellomrom.' using errcode = '22023';
    end if;
    if jsonb_typeof(kilde -> 'referanse') = 'string' then
      begin
        referanse := (kilde ->> 'referanse')::uuid;
      exception when invalid_text_representation then
        raise exception 'Fant ikke referansen.' using errcode = '22023';
      end;
      if not exists (
        select 1
        from public.redigerbare_objekter o
        join public.objekttilstander t on t.objekt_id = o.id and t.tilstand = 'publisert'
        where o.id = referanse and o.type = 'referanse' and intern.kan_lese_objekt(o.id)
      ) then
        raise exception 'Fant ikke referansen.' using errcode = '22023';
      end if;
    elsif kilde ? 'referanse' and kilde -> 'referanse' <> 'null'::jsonb then
      raise exception 'Fant ikke referansen.' using errcode = '22023';
    end if;
    if tekst is null and lenke is null and referanse is null then
      raise exception 'En kilde må ha en tekst, en lenke eller en referanse.' using errcode = '22023';
    end if;
    svar := svar || jsonb_build_array(jsonb_strip_nulls(jsonb_build_object('tekst', tekst, 'lenke', lenke, 'referanse', referanse)));
  end loop;
  return svar;
end;
$$;

revoke all on function intern.forslagskilder(jsonb) from public, anon, authenticated, service_role;

-- Navnet på en person slik den som ser forslaget, får se det: bare når
-- profilen er synlig for seeren (P2c), ellers bare om det er seeren selv.
create function intern.forslagsperson(person uuid, seer uuid, synlige uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when forslagsperson.person is null then null
    else jsonb_build_object(
      'er_meg', forslagsperson.person = forslagsperson.seer,
      'navn', (
        select nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), '')
        from public.profiles p
        where p.id = forslagsperson.person and p.id = any (forslagsperson.synlige)
      )
    )
  end
$$;

revoke all on function intern.forslagsperson(uuid, uuid, uuid[]) from public, anon, authenticated, service_role;

-- --- Forslagsstillerens funksjoner ---------------------------------------------------

-- Lager et forslag til en ressurs (fagside eller regelsett) den innloggede kan
-- lese, og som er publisert, eventuelt til et element i den (et kort eller en
-- kommentar). `grunnrevisjon` er den publiserte revisjonen av elementet (eller
-- ressursen) forslagsstilleren så, og `sideversjon` fagsidens versjon.
create function public.foresla_endring(
  ressurs uuid,
  element uuid,
  grunnrevisjon integer,
  sideversjon integer,
  sted text,
  utdrag text,
  forslag text,
  begrunnelse text,
  kilder jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  bruker uuid := (select auth.uid());
  typ public.objekttype;
  el uuid := nullif(foresla_endring.element, foresla_endring.ressurs);
  mal uuid;
  side integer;
  ny_id uuid;
  ren_forslag text := btrim(coalesce(foresla_endring.forslag, ''));
  ren_begrunnelse text := btrim(coalesce(foresla_endring.begrunnelse, ''));
  rent_sted text := nullif(btrim(foresla_endring.sted), '');
  rent_utdrag text := nullif(btrim(foresla_endring.utdrag), '');
  rene_kilder jsonb;
begin
  perform intern.krev_aktivt_medlemskap();

  -- Ressursen: en fagside eller et regelsett som finnes, er publisert og
  -- kan leses. Alt annet gir samme svar.
  select o.type into typ from public.redigerbare_objekter o where o.id = foresla_endring.ressurs;
  if not coalesce(intern.er_ressurstype(typ), false)
    or not intern.kan_lese_objekt(foresla_endring.ressurs, bruker)
    or not exists (
      select 1 from public.objekttilstander t
      where t.objekt_id = foresla_endring.ressurs and t.tilstand = 'publisert'
    )
  then
    raise exception 'Fant ikke innholdet forslaget gjelder.' using errcode = 'PT404';
  end if;

  -- Elementet: et kort eller en kommentar i ressursen, publisert og lesbart.
  -- Ressursen selv som element er det samme som ingen (`el`).
  if el is not null and not (
    intern.tilhorer_ressurs(el, foresla_endring.ressurs)
    and intern.kan_lese_objekt(el, bruker)
    and exists (
      select 1 from public.objekttilstander t
      where t.objekt_id = el and t.tilstand = 'publisert'
    )
  ) then
    raise exception 'Fant ikke delen av innholdet forslaget gjelder.' using errcode = 'PT404';
  end if;

  -- Versjonen forslaget bygger på, må være en som er publisert.
  mal := coalesce(el, foresla_endring.ressurs);
  if foresla_endring.grunnrevisjon is null or not (
    exists (
      select 1 from public.objektpubliseringer p
      where p.objekt_id = mal and p.revisjon = foresla_endring.grunnrevisjon
    )
    or exists (
      select 1 from public.objekttilstander t
      where t.objekt_id = mal and t.tilstand = 'publisert' and t.revisjon = foresla_endring.grunnrevisjon
    )
  ) then
    raise exception 'Versjonen forslaget bygger på, er ikke publisert. Oppdater siden og prøv igjen.' using errcode = '22023';
  end if;

  -- Uten sideversjon for en fagside gjelder forslaget den nyeste, den
  -- forslagsstilleren ser når siden nettopp er lastet.
  side := foresla_endring.sideversjon;
  if side is null and typ = 'infoside' then
    select max(v.nr) into side from public.sideversjoner v where v.infoside = foresla_endring.ressurs;
  end if;
  if foresla_endring.sideversjon is not null and (
    typ <> 'infoside'
    or not exists (
      select 1 from public.sideversjoner v
      where v.infoside = foresla_endring.ressurs and v.nr = foresla_endring.sideversjon
    )
  ) then
    raise exception 'Fant ikke versjonen av fagsiden forslaget bygger på.' using errcode = '22023';
  end if;

  if ren_forslag = '' then
    raise exception 'Skriv hva du foreslår.' using errcode = '22023';
  end if;
  if char_length(ren_forslag) > 8000 then
    raise exception 'Forslaget kan være høyst 8000 tegn.' using errcode = '22023';
  end if;
  if ren_begrunnelse = '' then
    raise exception 'Skriv hvorfor du foreslår endringen.' using errcode = '22023';
  end if;
  if char_length(ren_begrunnelse) > 4000 then
    raise exception 'Begrunnelsen kan være høyst 4000 tegn.' using errcode = '22023';
  end if;
  if char_length(rent_sted) > 200 then
    raise exception 'Stedet kan være høyst 200 tegn.' using errcode = '22023';
  end if;
  if char_length(rent_utdrag) > 2000 then
    raise exception 'Sitatet kan være høyst 2000 tegn.' using errcode = '22023';
  end if;
  rene_kilder := intern.forslagskilder(foresla_endring.kilder);

  -- Grensen for åpne forslag, én om gangen per person, så to samtidige
  -- innsendinger ikke begge kommer forbi den.
  perform pg_advisory_xact_lock(hashtextextended('endringsforslag:' || bruker::text, 0));
  if (
    select count(*) from public.endringsforslag f
    where f.stilt_av = bruker and f.status = any (intern.apne_forslagsstatuser())
  ) >= intern.maks_apne_forslag() then
    raise exception 'Du har % forslag som ikke er avgjort ennå. Vent til noen av dem er behandlet, eller trekk et av dem.',
      intern.maks_apne_forslag() using errcode = '22023';
  end if;

  insert into public.endringsforslag (
    ressurs_id, element_id, grunnrevisjon, sideversjon, sted, utdrag, forslag, begrunnelse, kilder, stilt_av
  )
  values (
    foresla_endring.ressurs, el, foresla_endring.grunnrevisjon, side,
    rent_sted, rent_utdrag, ren_forslag, ren_begrunnelse, rene_kilder, bruker
  )
  returning id into ny_id;

  insert into public.endringsforslag_hendelser (forslag_id, art, utfort_av)
  values (ny_id, 'opprettet', bruker);

  return ny_id;
end;
$$;

revoke all on function public.foresla_endring(uuid, uuid, integer, integer, text, text, text, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.foresla_endring(uuid, uuid, integer, integer, text, text, text, text, jsonb) to authenticated;

comment on function public.foresla_endring(uuid, uuid, integer, integer, text, text, text, text, jsonb) is
  'P5: et aktivt medlem foreslår en endring i en fagside eller et regelsett det kan lese. Gir ingen endringsrett. Se docs/redaktorer-og-forslag.md.';

-- Forslaget slik forslagsstilleren kan handle på det: finnes, kan ses, og er
-- den innloggedes eget. Ellers PT404 (kan ikke ses) eller 42501 (en annens).
create function intern.eget_forslag(forslag uuid)
returns public.endringsforslag
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  rad public.endringsforslag;
begin
  select * into rad from public.endringsforslag f where f.id = eget_forslag.forslag;
  if not found or not intern.kan_se_forslag(rad.id) then
    raise exception 'Fant ikke forslaget.' using errcode = 'PT404';
  end if;
  if rad.stilt_av is distinct from (select auth.uid()) then
    raise exception 'Bare den som sendte forslaget, kan gjøre dette.' using errcode = '42501';
  end if;
  return rad;
end;
$$;

revoke all on function intern.eget_forslag(uuid) from public, anon, authenticated, service_role;

-- Forslagsstilleren trekker forslaget, så lenge det ikke er avgjort.
create function public.trekk_forslag(forslag uuid, begrunnelse text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  perform intern.eget_forslag(trekk_forslag.forslag);
  perform intern.forslagsovergang(
    trekk_forslag.forslag, intern.apne_forslagsstatuser(), 'trukket', 'trukket', trekk_forslag.begrunnelse
  );
end;
$$;

revoke all on function public.trekk_forslag(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.trekk_forslag(uuid, text) to authenticated;

comment on function public.trekk_forslag(uuid, text) is
  'P5: forslagsstilleren trekker sitt eget forslag til det er godkjent eller avvist. Se docs/redaktorer-og-forslag.md.';

-- Forslagsstilleren svarer på en presisering behandleren har bedt om (og
-- forslaget går tilbake til behandling), eller skriver en kommentar mens
-- forslaget er åpent.
create function public.svar_pa_forslag(forslag uuid, tekst text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad public.endringsforslag;
  ren text := btrim(coalesce(svar_pa_forslag.tekst, ''));
begin
  perform intern.krev_aktivt_medlemskap();
  rad := intern.eget_forslag(svar_pa_forslag.forslag);
  if ren = '' then
    raise exception 'Skriv et svar.' using errcode = '22023';
  end if;
  if char_length(ren) > 4000 then
    raise exception 'Svaret kan være høyst 4000 tegn.' using errcode = '22023';
  end if;
  if rad.status = 'venter_pa_forslagsstiller' then
    perform intern.forslagsovergang(rad.id, array['venter_pa_forslagsstiller'], 'under_behandling', 'presisering', ren);
  else
    perform intern.forslagsovergang(rad.id, array['ny', 'under_behandling'], null, 'kommentar', ren);
  end if;
end;
$$;

revoke all on function public.svar_pa_forslag(uuid, text) from public, anon, authenticated, service_role;
grant execute on function public.svar_pa_forslag(uuid, text) to authenticated;

comment on function public.svar_pa_forslag(uuid, text) is
  'P5: forslagsstilleren svarer på en presisering eller kommenterer sitt åpne forslag. Se docs/redaktorer-og-forslag.md.';

-- --- Lesingen ----------------------------------------------------------------------

-- Den innloggedes egne forslag, nyeste først, for ressursene vedkommende
-- fortsatt kan lese.
create function public.les_mine_forslag()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  bruker uuid := (select auth.uid());
begin
  perform intern.krev_aktivt_medlemskap();
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', f.id,
        'status', f.status,
        'ressurs', intern.ressursbeskrivelse(f.ressurs_id),
        'element_id', f.element_id,
        'sted', f.sted,
        'sammendrag', left(f.forslag, 280),
        'opprettet_kl', f.opprettet_kl,
        'oppdatert_kl', f.oppdatert_kl,
        'venter_pa_meg', f.status = 'venter_pa_forslagsstiller'
      )
      order by f.opprettet_kl desc, f.id
    )
    from (
      select f.* from public.endringsforslag f
      where f.stilt_av = bruker and intern.kan_lese_objekt(f.ressurs_id, bruker)
      order by f.opprettet_kl desc, f.id
      limit 500
    ) f
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.les_mine_forslag() from public, anon, authenticated, service_role;
grant execute on function public.les_mine_forslag() to authenticated;

comment on function public.les_mine_forslag() is
  'P5: den innloggedes egne forslag med status og ressurs, nyeste først. Se docs/redaktorer-og-forslag.md.';

-- Om innholdet er endret siden forslaget ble skrevet: revisjonen forslaget
-- bygger på mot den publiserte nå (elementets, eller ressursens), fagsidens
-- versjon mot den nyeste, og, med `med_utkast`, om utkastet har upubliserte
-- endringer (i elementet, eller i fagsiden med kortene når forslaget gjelder
-- hele siden). `med_utkast` bare for den som kan behandle forslaget; ellers er
-- `utkast_endret` tom. Kontrollerer ingen rettigheter: den som kaller, har
-- alt sett at forslaget kan ses. Tråd C bruker den i køen og godkjenningen.
create function intern.forslagskonflikt(forslag uuid, med_utkast boolean default false)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  f public.endringsforslag;
  mal uuid;
  typ public.objekttype;
  publisert integer;
  siste_side integer;
  utkast_endret boolean;
begin
  select * into f from public.endringsforslag x where x.id = forslagskonflikt.forslag;
  if not found then
    return null;
  end if;
  mal := coalesce(f.element_id, f.ressurs_id);
  select o.type into typ from public.redigerbare_objekter o where o.id = f.ressurs_id;
  select t.revisjon into publisert from public.objekttilstander t where t.objekt_id = mal and t.tilstand = 'publisert';
  if typ = 'infoside' then
    select max(v.nr) into siste_side from public.sideversjoner v where v.infoside = f.ressurs_id;
  end if;
  if forslagskonflikt.med_utkast then
    select exists (
      select 1
      from public.objekttilstander u
      left join public.objekttilstander p on p.objekt_id = u.objekt_id and p.tilstand = 'publisert'
      where u.tilstand = 'utkast'
        and u.revisjon is distinct from p.revisjon
        and (
          u.objekt_id = mal
          or (f.element_id is null and typ = 'infoside'
              and u.objekt_id in (select e.objekt_id from public.innholdselementer e
                                  where e.infoside_id = f.ressurs_id and e.tilstand = 'utkast'))
        )
    ) into utkast_endret;
  end if;
  return jsonb_build_object(
    'grunnrevisjon', f.grunnrevisjon,
    'publisert_revisjon', publisert,
    'endret_siden', publisert is distinct from f.grunnrevisjon,
    'sideversjon', f.sideversjon,
    'publisert_sideversjon', siste_side,
    'side_endret_siden', f.sideversjon is not null and siste_side is distinct from f.sideversjon,
    'utkast_endret', utkast_endret
  );
end;
$$;

revoke all on function intern.forslagskonflikt(uuid, boolean) from public, anon, authenticated, service_role;

comment on function intern.forslagskonflikt(uuid, boolean) is
  'P5: om innholdet forslaget gjelder, er publisert på nytt eller har upubliserte endringer siden forslaget ble skrevet. Se docs/redaktorer-og-forslag.md.';

-- Ett forslag med tidslinjen, for den som kan se det. `kan_behandle` sier om
-- den innloggede kan behandle det; `konflikt` om innholdet er endret siden
-- forslaget ble skrevet (utkastet bare for den som kan behandle).
create function public.les_forslag(forslag uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  bruker uuid := (select auth.uid());
  f public.endringsforslag;
  behandler boolean;
  synlige uuid[];
begin
  perform intern.krev_aktivt_medlemskap();
  select * into f from public.endringsforslag x where x.id = les_forslag.forslag;
  if not found or not intern.kan_se_forslag(f.id, bruker) then
    raise exception 'Fant ikke forslaget.' using errcode = 'PT404';
  end if;
  behandler := intern.kan_behandle_forslag(f.ressurs_id, bruker);
  synlige := array(select intern.synlige_profiler(bruker));

  return jsonb_build_object(
    'id', f.id,
    'status', f.status,
    'ressurs', intern.ressursbeskrivelse(f.ressurs_id),
    'element', case when f.element_id is null then null else jsonb_build_object(
      'id', f.element_id,
      'type', (select o.type from public.redigerbare_objekter o where o.id = f.element_id)
    ) end,
    'grunnrevisjon', f.grunnrevisjon,
    'sideversjon', f.sideversjon,
    'sted', f.sted,
    'utdrag', f.utdrag,
    'forslag', f.forslag,
    'begrunnelse', f.begrunnelse,
    'kilder', coalesce((
      select jsonb_agg(
        k.kilde || case when k.kilde ? 'referanse' then jsonb_build_object('referansetittel', (
          select r.tittel from public.referanser r
          where r.objekt_id = (k.kilde ->> 'referanse')::uuid and r.tilstand = 'publisert'
            and intern.kan_lese_objekt(r.objekt_id, bruker)
        )) else '{}'::jsonb end
        order by k.nr
      )
      from jsonb_array_elements(f.kilder) with ordinality k(kilde, nr)
    ), '[]'::jsonb),
    'opprettet_kl', f.opprettet_kl,
    'oppdatert_kl', f.oppdatert_kl,
    'stilt_av', intern.forslagsperson(f.stilt_av, bruker, synlige),
    'behandler', intern.forslagsperson(f.behandler_id, bruker, synlige),
    'vedtak', case when f.vedtak_kl is null then null else jsonb_build_object(
      'av', intern.forslagsperson(f.vedtak_av, bruker, synlige),
      'kl', f.vedtak_kl,
      'begrunnelse', f.vedtak_begrunnelse
    ) end,
    'innarbeidet', case when f.innarbeidet_objekt is null then null else jsonb_build_object(
      'objekt', f.innarbeidet_objekt,
      'revisjon', f.innarbeidet_revisjon
    ) end,
    'hendelser', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', h.id,
          'art', h.art,
          'tekst', h.tekst,
          'utfort_av', intern.forslagsperson(h.utfort_av, bruker, synlige),
          'utfort_kl', h.utfort_kl,
          'data', h.data
        )
        order by h.id
      )
      from public.endringsforslag_hendelser h
      where h.forslag_id = f.id
    ), '[]'::jsonb),
    'er_mitt', f.stilt_av = bruker,
    'kan_behandle', behandler,
    'kan_trekke', f.stilt_av = bruker and f.status = any (intern.apne_forslagsstatuser()),
    'kan_svare', f.stilt_av = bruker and f.status = any (intern.apne_forslagsstatuser()),
    'konflikt', intern.forslagskonflikt(f.id, behandler)
  );
end;
$$;

revoke all on function public.les_forslag(uuid) from public, anon, authenticated, service_role;
grant execute on function public.les_forslag(uuid) to authenticated;

comment on function public.les_forslag(uuid) is
  'P5: ett forslag med tidslinjen, for forslagsstilleren og behandlerne; med kan_behandle og konflikt. Se docs/redaktorer-og-forslag.md.';
