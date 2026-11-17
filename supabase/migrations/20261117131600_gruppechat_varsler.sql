-- P7 tråd C (docs/gruppechat.md, «Sanntiden» og «Varslene»; docs/varsler.md):
-- varslene om nye meldinger i gruppechatten, og dørklokken i sanntiden.
--
-- 1. En ny melding gir de andre aktive medlemmene som leser gruppen nå, ett
--    ulest varsel per gruppe (`gruppechat:<gruppe-ID>`, `gruppe_id` satt).
--    Varselet har én hendelse som sier når, hvor mange meldinger og til
--    hvilket løpenummer; aldri tekst eller avsender. Endringer og slettinger
--    varsler ingen.
-- 2. `intern.merk_gruppechat_varsler_lest` (tom i grunnmuren) merker varselet
--    lest når brukeren har lest til og med meldingen det gjelder; et varsel som
--    har fått en nyere melding imens, står ulest.
-- 3. Varslene viser gruppen ved navn, og bare så lenge chatten er slått på og
--    brukeren leser gruppen. `public.mine_grupper()` sier også om chatten er
--    slått på (`chat_aktivert`), så innstillingen for chatvarslene vises først
--    da; aktiveringen blir fortsatt bare én liten migrasjon.
-- 4. `public.gruppechatter` legges i publikasjonen `supabase_realtime`, så
--    klienten får dørklokken. Raden har ingen tekst og ingen avsender, og
--    radsikkerheten på den (A1) avgjør hvem som får hendelsene. Ingen andre
--    tabeller legges til.
--
-- Tilbakeføring: fjern utløseren `gruppemeldinger_varsle`, sett
-- `intern.merk_gruppechat_varsler_lest` tilbake til den tomme fra grunnmuren
-- og `intern.varselhendelser` til definisjonen i 20261117040100,
-- `public.mine_grupper` til definisjonen i 20261114232000, og ta
-- `public.gruppechatter` ut av publikasjonen `supabase_realtime` igjen.

-- --- 1. Varslene ----------------------------------------------------------------

-- Hendelsen: `kl` (den siste meldingen), `gruppechat` (gruppen), `antall`
-- (meldinger siden varselet ble ulest) og `til_nr` (løpenummeret til den
-- siste). Den som skrev, varsles ikke; heller ikke systemarkitekter som ikke
-- er med i gruppen (som for idéene i gruppene, P6b).
create function intern.varsle_gruppechat()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.varsler as v (mottaker_id, kategori, gruppe, gruppe_id, hendelser)
  select
    m.bruker_id,
    'gruppechat',
    'gruppechat:' || new.gruppe_id,
    new.gruppe_id,
    jsonb_build_array(jsonb_build_object('kl', new.skrevet_kl, 'gruppechat', new.gruppe_id, 'antall', 1, 'til_nr', new.nr))
  from public.gruppemedlemskap m
  where m.gruppe_id = new.gruppe_id
    and m.status = 'aktiv'
    and m.bruker_id is distinct from new.forfatter_id
    and intern.kan_lese_gruppe(new.gruppe_id, m.bruker_id)
  on conflict (mottaker_id, gruppe) where lest_kl is null do update
    set hendelser = jsonb_build_array(jsonb_build_object(
          'kl', excluded.hendelser -> 0 -> 'kl',
          'gruppechat', excluded.gruppe_id,
          'antall', coalesce((v.hendelser -> 0 ->> 'antall')::bigint, 0) + 1,
          'til_nr', excluded.hendelser -> 0 -> 'til_nr'
        )),
        oppdatert_kl = now();
  return null;
end;
$$;

revoke all on function intern.varsle_gruppechat() from public, anon, authenticated, service_role;

comment on function intern.varsle_gruppechat() is
  'P7: en ny melding i gruppechatten gir de andre aktive medlemmene ett ulest varsel per gruppe, uten tekst og avsender. Se docs/varsler.md.';

create trigger gruppemeldinger_varsle
after insert on public.gruppemeldinger
for each row execute function intern.varsle_gruppechat();

-- --- 2. Lest ----------------------------------------------------------------------

-- Samme signatur som i grunnmuren; `merk_gruppechat_lest` (A1) kaller den med
-- løpenummeret brukeren har lest til.
create or replace function intern.merk_gruppechat_varsler_lest(gruppe uuid, bruker uuid, til_nr bigint)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.varsler v
  set lest_kl = now()
  where v.mottaker_id = merk_gruppechat_varsler_lest.bruker
    and v.gruppe = 'gruppechat:' || merk_gruppechat_varsler_lest.gruppe
    and v.lest_kl is null
    and coalesce((v.hendelser -> 0 ->> 'til_nr')::bigint, 0) <= coalesce(merk_gruppechat_varsler_lest.til_nr, 0)
$$;

revoke all on function intern.merk_gruppechat_varsler_lest(uuid, uuid, bigint) from public, anon, authenticated, service_role;

comment on function intern.merk_gruppechat_varsler_lest(uuid, uuid, bigint) is
  'P7: merker varselet om chatten i gruppen lest når brukeren har lest til og med meldingen det gjelder. Se docs/gruppechat.md.';

-- --- 3. Visningen -----------------------------------------------------------------

-- Gruppen et chatvarsel gjelder, eller null når chatten er avslått eller den
-- innloggede ikke leser gruppen.
create function intern.varselgruppechat(gruppe uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('id', g.id, 'navn', g.navn)
  from public.grupper g
  where g.id = varselgruppechat.gruppe
    and intern.gruppechat_aktivert()
    and intern.kan_lese_gruppe(g.id)
$$;

revoke all on function intern.varselgruppechat(uuid) from public, anon, authenticated, service_role;

-- Som i 20261117040100, og en hendelse i gruppechatten viser gruppen; den står
-- bare så lenge chatten er slått på og den innloggede leser gruppen.
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
        when h ? 'gruppechat' then h || jsonb_build_object('gruppechat', intern.varselgruppechat((h ->> 'gruppechat')::uuid))
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
    and (not h ? 'gruppechat' or intern.varselgruppechat((h ->> 'gruppechat')::uuid) is not null)
$$;

-- Som i 20261114232000, og `chat_aktivert` fra funksjonsbryteren. Tilgangene
-- på funksjonen er uendret.
create or replace function public.mine_grupper()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select jsonb_build_object(
    'grupper', coalesce((
      select jsonb_agg(
          intern.gruppereferanse(g) || jsonb_build_object(
            'rolle', intern.grupperolle(g.id),
            'medlemmer', (
              select count(*) from public.gruppemedlemskap m
              where m.gruppe_id = g.id and m.status = 'aktiv'
            )
          )
          order by g.status, lower(g.navn), g.id
        )
      from public.grupper g
      where g.id = any (public.mine_lesbare_grupper())
    ), '[]'::jsonb),
    'invitasjoner', coalesce((
      select jsonb_agg(jsonb_build_object(
          'gruppe', intern.gruppereferanse(g),
          'invitert_kl', m.fra,
          'invitert_av', (
            select jsonb_build_object('username', p.username, 'first_name', p.first_name, 'last_name', p.last_name)
            from public.profiles p where p.id = m.invitert_av
          )
        ) order by m.fra desc, g.id)
      from public.gruppemedlemskap m
      join public.grupper g on g.id = m.gruppe_id
      where m.bruker_id = (select auth.uid()) and m.status = 'invitert' and g.status = 'aktiv'
        -- Bare så lenge den inviterte kan være med: en invitasjon til en
        -- gruppe i et fagmiljø hen ikke lenger er medlem av, viser ingenting.
        and intern.kan_vaere_med_i_gruppe(g, (select auth.uid()))
    ), '[]'::jsonb),
    'kan_opprette', jsonb_build_object(
      'tverrfaglig', intern.gruppeopprettelsesavslag((select auth.uid()), null) is null,
      'fagmiljoer', coalesce((
        select jsonb_agg(jsonb_build_object('id', f.id, 'navn', f.navn) order by f.navn)
        from public.fagmiljoer f
        where intern.gruppeopprettelsesavslag((select auth.uid()), f.id) is null
      ), '[]'::jsonb)
    ),
    'chat_aktivert', intern.gruppechat_aktivert()
  )
$$;

comment on function public.mine_grupper() is
  'P6: den innloggedes grupper, invitasjoner og hvor nye grupper kan opprettes. P7: og om gruppechatten er slått på.';

-- --- 4. Sanntiden -----------------------------------------------------------------

alter publication supabase_realtime add table public.gruppechatter;
