-- P5 tråd C (#416, docs/redaktorer-og-forslag.md, «Behandling» og «Varsler»):
-- redaktørens arbeidsflyt for endringsforslagene. Arbeidskøen, behandlingen
-- (ta, kommentere, be om presisering, godkjenne, avvise, markere som
-- innarbeidet) og varslene.
--
-- Bygger på grunnmuren (20261116130000_p5_ressurser.sql) og på tabellene og
-- hjelperne fra tråd B (20261116131500_p5_endringsforslag.sql:
-- `public.endringsforslag`, `public.endringsforslag_hendelser`,
-- `intern.forslagsovergang`, `intern.kan_se_forslag`,
-- `intern.forslagskonflikt`). Hvem som behandler, avgjøres bare av
-- `intern.kan_behandle_forslag`; redaktørene fra tråd A kommer inn gjennom den.
--
-- Ingenting her endrer faginnhold: et godkjent forslag er ikke publisert, og
-- innarbeidingen skjer i de vanlige redigeringene. Funksjonene skriver bare i
-- forslaget, tidslinjen og varslene.

-- --- Felles for behandlingen --------------------------------------------------------

-- Forslaget den innloggede skal behandle, låst for resten av transaksjonen.
-- Et forslag hen ikke kan se, gir samme svar som et som ikke finnes (PT404);
-- et hen kan se, men ikke behandle (sitt eget, som vanlig bruker), 42501.
create function intern.krev_forslag_til_behandling(forslag uuid)
returns public.endringsforslag
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.endringsforslag;
begin
  perform intern.krev_aktivt_medlemskap();
  select * into f from public.endringsforslag e where e.id = krev_forslag_til_behandling.forslag for update;
  if f.id is null or not intern.kan_se_forslag(f.id) then
    raise exception 'Fant ikke forslaget.' using errcode = 'PT404';
  end if;
  if not intern.kan_behandle_forslag(f.ressurs_id) then
    raise exception 'Bare de som behandler forslag til dette innholdet, kan gjøre dette.' using errcode = '42501';
  end if;
  return f;
end;
$$;

revoke all on function intern.krev_forslag_til_behandling(uuid) from public, anon, authenticated, service_role;

comment on function intern.krev_forslag_til_behandling(uuid) is
  'P5: forslaget den innloggede skal behandle, låst (PT404 når hen ikke kan se det, 42501 når hen ikke kan behandle det). Se docs/redaktorer-og-forslag.md, «Behandling».';

-- En tekst fra behandleren: trimmet, 1–4000 tegn, og påkrevd når `pakrevd`.
create function intern.behandlertekst(tekst text, pakrevd boolean, hva text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  t text := nullif(btrim(behandlertekst.tekst), '');
begin
  if t is null and behandlertekst.pakrevd then
    raise exception '% mangler.', behandlertekst.hva using errcode = '22023';
  end if;
  if char_length(t) > 4000 then
    raise exception '% kan være høyst 4000 tegn.', behandlertekst.hva using errcode = '22023';
  end if;
  return t;
end;
$$;

revoke all on function intern.behandlertekst(text, boolean, text) from public, anon, authenticated, service_role;

-- Et nytt forslag tas av den første behandleren som gjør noe med det: statusen
-- går til `under_behandling` med hendelsen `tatt` (kontrakten: «behandler tar
-- det eller skriver»). Et forslag som alt er tatt, beholder behandleren sin.
create function intern.ta_hvis_nytt(f public.endringsforslag)
returns public.endringsforslag
language plpgsql
security definer
set search_path = ''
as $$
begin
  if f.status <> 'ny' then
    return f;
  end if;
  perform intern.forslagsovergang(f.id, array['ny'], 'under_behandling', 'tatt');
  update public.endringsforslag e set behandler_id = auth.uid() where e.id = f.id returning * into f;
  return f;
end;
$$;

revoke all on function intern.ta_hvis_nytt(public.endringsforslag) from public, anon, authenticated, service_role;

-- --- Arbeidskøen --------------------------------------------------------------------

-- Ett forslag slik køen viser det. Selve forslaget er kortet ned; hele står i
-- `les_forslag`. Forslagsstilleren vises med navn bare når profilen er synlig
-- for den innloggede (`synlige`, P2c), som i `les_forslag`.
create function intern.forslag_i_ko(f public.endringsforslag, synlige uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', f.id,
    'status', f.status,
    'ressurs', intern.ressursbeskrivelse(f.ressurs_id),
    'element_id', f.element_id,
    'sted', f.sted,
    'sammendrag', left(f.forslag, 280),
    'stilt_av', intern.forslagsperson(f.stilt_av, (select auth.uid()), forslag_i_ko.synlige),
    'opprettet_kl', f.opprettet_kl,
    'oppdatert_kl', f.oppdatert_kl,
    'behandler_er_meg', f.behandler_id is not distinct from (select auth.uid()),
    'har_behandler', f.behandler_id is not null,
    'uten_redaktor', not exists (select 1 from intern.ressursens_redaktorer(f.ressurs_id)),
    'endret_siden', (
      select coalesce((k ->> 'endret_siden')::boolean, false) or coalesce((k ->> 'side_endret_siden')::boolean, false)
      from intern.forslagskonflikt(f.id) k
    )
  )
$$;

revoke all on function intern.forslag_i_ko(public.endringsforslag, uuid[]) from public, anon, authenticated, service_role;

-- Køen for den innloggede: forslagene til ressursene hen kan behandle.
--   'aktive'  (standard) de nye og de pågående
--   'ferdige' de ferdigbehandlede (innarbeidet, avvist, trukket), de 100 siste
--   'alle'    begge
--   'antall'  bare tallene, til kontomenyen
-- Svaret har alltid `antall` (nye, pågående, uten redaktør, og `mine`: de
-- den innloggede behandler og ikke er ferdig med); lister som ikke
-- er bedt om, er tomme. «Uten redaktør» er de aktive forslagene til ressurser
-- ingen redaktør har ansvaret for (ansvarskøen); de står i `nye` og
-- `pagaende` med merket `uten_redaktor`.
create function public.les_forslagsko(filter text default 'aktive')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  ider uuid[];
  synlige uuid[] := array(select intern.synlige_profiler((select auth.uid())));
  aktive boolean := les_forslagsko.filter in ('aktive', 'alle');
  ferdige boolean := les_forslagsko.filter in ('ferdige', 'alle');
  liste jsonb := '[]'::jsonb;
begin
  perform intern.krev_aktivt_medlemskap();
  if les_forslagsko.filter is null or les_forslagsko.filter not in ('aktive', 'ferdige', 'alle', 'antall') then
    raise exception 'Ukjent utvalg av forslagskøen.' using errcode = '22023';
  end if;

  select coalesce(array_agg(f.id), '{}') into ider
  from public.endringsforslag f
  where intern.kan_behandle_forslag(f.ressurs_id);

  return jsonb_build_object(
    'antall', (
      select jsonb_build_object(
        'nye', count(*) filter (where f.status = 'ny'),
        'pagaende', count(*) filter (where f.status <> 'ny'),
        'uten_redaktor', count(*) filter (where not exists (select 1 from intern.ressursens_redaktorer(f.ressurs_id))),
        'mine', count(*) filter (where f.behandler_id = (select auth.uid()) and f.status in ('under_behandling', 'godkjent'))
      )
      from public.endringsforslag f
      where f.id = any (ider) and f.status in ('ny', 'under_behandling', 'venter_pa_forslagsstiller', 'godkjent')
    ),
    'nye', case when aktive then coalesce((
      select jsonb_agg(intern.forslag_i_ko(f, synlige) order by f.opprettet_kl, f.id)
      from public.endringsforslag f
      where f.id = any (ider) and f.status = 'ny'
    ), liste) else liste end,
    'pagaende', case when aktive then coalesce((
      select jsonb_agg(intern.forslag_i_ko(f, synlige) order by f.oppdatert_kl desc, f.id)
      from public.endringsforslag f
      where f.id = any (ider) and f.status in ('under_behandling', 'venter_pa_forslagsstiller', 'godkjent')
    ), liste) else liste end,
    'ferdige', case when ferdige then coalesce((
      select jsonb_agg(intern.forslag_i_ko(x.f, synlige) order by (x.f).oppdatert_kl desc, (x.f).id)
      from (
        select f from public.endringsforslag f
        where f.id = any (ider) and f.status in ('innarbeidet', 'avvist', 'trukket')
        order by f.oppdatert_kl desc, f.id
        limit 100
      ) x
    ), liste) else liste end
  );
end;
$$;

revoke all on function public.les_forslagsko(text) from public, anon, authenticated, service_role;
grant execute on function public.les_forslagsko(text) to authenticated;

comment on function public.les_forslagsko(text) is
  'P5: arbeidskøen for forslagene den innloggede kan behandle: nye, pågående, ferdige og tallene, med ansvarskøen (uten redaktør). Se docs/redaktorer-og-forslag.md, «Behandling».';

-- --- Behandlingen -------------------------------------------------------------------

-- Ta forslaget: den innloggede blir behandleren. Et nytt forslag går til
-- `under_behandling`; et som alt er tatt (også av en annen), får ny
-- behandler uten at statusen endres. Et ferdig eller godkjent forslag kan
-- ikke tas.
create function public.ta_forslag(forslag uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.endringsforslag := intern.krev_forslag_til_behandling(ta_forslag.forslag);
begin
  if f.status = 'ny' then
    perform intern.ta_hvis_nytt(f);
    return;
  end if;
  if f.behandler_id is not distinct from auth.uid() and f.status in ('under_behandling', 'venter_pa_forslagsstiller') then
    return;
  end if;
  perform intern.forslagsovergang(f.id, array['under_behandling', 'venter_pa_forslagsstiller'], null, 'tatt');
  update public.endringsforslag e set behandler_id = auth.uid() where e.id = f.id;
end;
$$;

-- En kommentar fra behandleren til forslagsstilleren, i tidslinjen. Tar et nytt
-- forslag. Et trukket forslag kan ikke kommenteres.
create function public.kommenter_forslag(forslag uuid, tekst text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := intern.behandlertekst(kommenter_forslag.tekst, true, 'Kommentaren');
  f public.endringsforslag := intern.krev_forslag_til_behandling(kommenter_forslag.forslag);
begin
  if f.status = 'trukket' then
    raise exception 'Forslaget er trukket.' using errcode = 'PT409';
  end if;
  f := intern.ta_hvis_nytt(f);
  perform intern.forslagsovergang(
    f.id, array['under_behandling', 'venter_pa_forslagsstiller', 'godkjent', 'innarbeidet', 'avvist'], null, 'kommentar', t
  );
end;
$$;

-- Be forslagsstilleren om en presisering: forslaget venter på svar
-- (`svar_pa_forslag`, tråd B).
create function public.be_om_presisering(forslag uuid, tekst text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := intern.behandlertekst(be_om_presisering.tekst, true, 'Spørsmålet');
  f public.endringsforslag := intern.krev_forslag_til_behandling(be_om_presisering.forslag);
begin
  f := intern.ta_hvis_nytt(f);
  perform intern.forslagsovergang(f.id, array['under_behandling'], 'venter_pa_forslagsstiller', 'presisering_bedt', t);
end;
$$;

-- Godkjenne: forslaget skal arbeides inn i utkastet. Det publiserer ingenting.
-- Er innholdet endret siden forslaget ble skrevet, står det i tidslinjen
-- (`konflikt_sett`) at behandleren godkjente med det for øye.
create function public.godkjenn_forslag(forslag uuid, begrunnelse text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := intern.behandlertekst(godkjenn_forslag.begrunnelse, false, 'Begrunnelsen');
  f public.endringsforslag := intern.krev_forslag_til_behandling(godkjenn_forslag.forslag);
  konflikt jsonb;
begin
  f := intern.ta_hvis_nytt(f);
  konflikt := intern.forslagskonflikt(f.id, true);
  if f.status = 'under_behandling' and (
    coalesce((konflikt ->> 'endret_siden')::boolean, false) or coalesce((konflikt ->> 'side_endret_siden')::boolean, false)
  ) then
    perform intern.forslagsovergang(f.id, array['under_behandling'], null, 'konflikt_sett', null, konflikt);
  end if;
  perform intern.forslagsovergang(f.id, array['under_behandling'], 'godkjent', 'godkjent', t);
  update public.endringsforslag e
    set vedtak_av = auth.uid(), vedtak_kl = now(), vedtak_begrunnelse = t, behandler_id = coalesce(e.behandler_id, auth.uid())
    where e.id = f.id;
end;
$$;

-- Avvise, med begrunnelse til forslagsstilleren.
create function public.avvis_forslag(forslag uuid, begrunnelse text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t text := intern.behandlertekst(avvis_forslag.begrunnelse, true, 'Begrunnelsen');
  f public.endringsforslag := intern.krev_forslag_til_behandling(avvis_forslag.forslag);
begin
  f := intern.ta_hvis_nytt(f);
  perform intern.forslagsovergang(f.id, array['under_behandling', 'venter_pa_forslagsstiller'], 'avvist', 'avvist', t);
  update public.endringsforslag e
    set vedtak_av = auth.uid(), vedtak_kl = now(), vedtak_begrunnelse = t, behandler_id = coalesce(e.behandler_id, auth.uid())
    where e.id = f.id;
end;
$$;

-- Koble et godkjent forslag til utkastet det er arbeidet inn i. Uten objekt
-- gjelder det elementet forslaget gjelder, ellers ressursen; uten revisjon
-- den revisjonen utkastet står på nå. Objektet må høre til ressursen, og
-- revisjonen må finnes (ellers 22023).
create function public.marker_forslag_innarbeidet(forslag uuid, objekt uuid default null, revisjon integer default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.endringsforslag := intern.krev_forslag_til_behandling(marker_forslag_innarbeidet.forslag);
  mal uuid := coalesce(marker_forslag_innarbeidet.objekt, f.element_id, f.ressurs_id);
  rev integer := marker_forslag_innarbeidet.revisjon;
begin
  if not intern.tilhorer_ressurs(mal, f.ressurs_id) then
    raise exception 'Revisjonen hører ikke til innholdet forslaget gjelder.' using errcode = '22023';
  end if;
  if rev is null then
    select t.revisjon into rev from public.objekttilstander t where t.objekt_id = mal and t.tilstand = 'utkast';
  end if;
  if rev is null or not exists (
    select 1 from public.objektrevisjoner r where r.objekt_id = mal and r.revisjon = rev
  ) then
    raise exception 'Fant ikke revisjonen.' using errcode = '22023';
  end if;
  perform intern.forslagsovergang(
    f.id, array['godkjent'], 'innarbeidet', 'innarbeidet', null,
    jsonb_build_object('objekt', mal, 'revisjon', rev)
  );
  update public.endringsforslag e
    set innarbeidet_objekt = mal, innarbeidet_revisjon = rev
    where e.id = f.id;
end;
$$;

do $$
declare
  signatur text;
begin
  foreach signatur in array array[
    'public.ta_forslag(uuid)',
    'public.kommenter_forslag(uuid, text)',
    'public.be_om_presisering(uuid, text)',
    'public.godkjenn_forslag(uuid, text)',
    'public.avvis_forslag(uuid, text)',
    'public.marker_forslag_innarbeidet(uuid, uuid, integer)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', signatur);
    execute format('grant execute on function %s to authenticated', signatur);
    execute format(
      'comment on function %s is %L', signatur,
      'P5: behandlingen av et endringsforslag (kan_behandle_forslag; PT404, 42501, 22023, PT409). Se docs/redaktorer-og-forslag.md, «Behandling».'
    );
  end loop;
end;
$$;

-- --- Varslene -----------------------------------------------------------------------

-- Rekkevidden til et varsel, som før, og for et forslag rekkevidden til
-- ressursen det gjelder.
create or replace function intern.varselomfang(diskusjon uuid, hendelse jsonb)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r record;
  objekt uuid;
begin
  if varselomfang.diskusjon is not null then
    return (select d.fagmiljo_id from public.diskusjoner d where d.id = varselomfang.diskusjon);
  end if;
  if varselomfang.hendelse ? 'forslag' then
    objekt := (select f.ressurs_id from public.endringsforslag f where f.id = (varselomfang.hendelse ->> 'forslag')::uuid);
  elsif varselomfang.hendelse ? 'objekt' or varselomfang.hendelse ? 'side' then
    objekt := coalesce(varselomfang.hendelse ->> 'objekt', varselomfang.hendelse ->> 'side')::uuid;
  else
    return null;
  end if;
  select o.omfang, o.fagmiljo_id into r from public.ressursomfang o where o.objekt_id = objekt;
  if r.omfang = 'felles' then
    return null;
  elsif r.omfang = 'fagmiljo' then
    return r.fagmiljo_id;
  end if;
  raise exception 'Varselet gjelder et objekt uten rekkevidde for varsler.' using errcode = '55000';
end;
$$;

-- Et forslag slik varselet viser det: ID-en og ressursen. Null når den
-- innloggede ikke (lenger) kan se forslaget; da vises ikke hendelsen.
create function intern.varselforslag(forslag uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', f.id, 'ressurs', intern.ressursbeskrivelse(f.ressurs_id))
  from public.endringsforslag f
  where f.id = varselforslag.forslag and intern.kan_se_forslag(f.id)
$$;

revoke all on function intern.varselforslag(uuid) from public, anon, authenticated, service_role;

-- Hendelsene slik de vises: som før, og et forslag med ressursen, bare så
-- lenge den innloggede kan se det. Et varsel uten hendelser vises ikke, og
-- telles ikke (`uleste_varsler` teller det `mine_varsler` gir).
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
$$;

-- Varslene om et forslag, fra hendelsene i tidslinjen. Det forslagsstilleren
-- gjør (nytt forslag, svar, kommentar, trukket), går til behandlerne
-- (`forslag_til_behandling`): et nytt forslag til `intern.forslagsbehandlere`,
-- resten til behandleren som har tatt det, eller ellers til dem. Det en
-- behandler gjør, går til forslagsstilleren (`mine_forslag`). Den som gjorde
-- det, varsles ikke, og bare den som kan se forslaget, får varsel.
-- `konflikt_sett` er en merknad i tidslinjen og varsler ingen.
create function intern.endringsforslag_hendelser_varsle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  f public.endringsforslag;
  mottakere uuid[];
  kategori public.varselkategori;
begin
  if new.art = 'konflikt_sett' then
    return null;
  end if;
  select * into f from public.endringsforslag e where e.id = new.forslag_id;

  if new.utfort_av = f.stilt_av and new.art in ('opprettet', 'presisering', 'kommentar', 'trukket') then
    kategori := 'forslag_til_behandling';
    select coalesce(array_agg(b), '{}') into mottakere
    from (
      select b from intern.forslagsbehandlere(f.ressurs_id) b
      where new.art = 'opprettet' or f.behandler_id is null
      union
      select f.behandler_id where new.art <> 'opprettet' and f.behandler_id is not null
    ) m(b)
    where b is distinct from new.utfort_av and intern.kan_behandle_forslag(f.ressurs_id, b);
  elsif new.art in ('tatt', 'kommentar', 'presisering_bedt', 'godkjent', 'avvist', 'innarbeidet') then
    kategori := 'mine_forslag';
    mottakere := array[f.stilt_av];
    if f.stilt_av is not distinct from new.utfort_av or not intern.kan_se_forslag(f.id, f.stilt_av) then
      return null;
    end if;
  else
    return null;
  end if;

  perform intern.varsle(
    mottakere,
    kategori,
    kategori::text || ':' || f.id::text,
    null,
    jsonb_build_object('kl', new.utfort_kl, 'av', new.utfort_av, 'forslag', f.id, 'art', new.art)
  );
  return null;
end;
$$;

revoke all on function intern.endringsforslag_hendelser_varsle() from public, anon, authenticated, service_role;

create trigger endringsforslag_hendelser_varsle
after insert on public.endringsforslag_hendelser
for each row execute function intern.endringsforslag_hendelser_varsle();
