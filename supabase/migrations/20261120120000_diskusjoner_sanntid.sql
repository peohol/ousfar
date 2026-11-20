-- Diskusjonene i sanntid (#517; docs/diskusjoner.md, «Sanntiden»): en åpen
-- tråd og lista i diskusjonsmenyen oppdaterer seg selv, som chatten.
--
-- 1. `public.diskusjonsklokker` er dørklokken: én rad per rom (side og
--    fagmiljø, som `public.diskusjonsrom`), med en endringsteller og tråden
--    som sist ble endret. Ingen tekst, ingen overskrift og ingen avsender.
-- 2. Utløsere på trådene, kategoriene, kommentarene og hjertene ringer den,
--    én gang per setning og rom. En setning som berører flere tråder i et
--    rom (en kategori som løses opp, en ny rekkefølge) ringer med tråden null:
--    alle i rommet henter på nytt.
-- 3. Radsikkerheten er den samme som på trådene (`rekkevidde` og aktivt
--    medlemskap): den som ikke ser diskusjonene i rommet, får ingen hendelser.
-- 4. Tabellen legges i publikasjonen `supabase_realtime`. Ingen andre
--    tabeller.
--
-- Tilbakeføring: fjern utløserne `*_diskusjonsklokke_*`, ta tabellen ut av
-- publikasjonen, og fjern tabellen og de tre funksjonene i `intern`.

-- --- 1. Dørklokken ---------------------------------------------------------------

create table public.diskusjonsklokker (
  id bigint generated always as identity primary key,
  side text not null,
  -- Rommet på siden: null for en felles side og for en gruppe (som `diskusjonsrom`).
  fagmiljo_id uuid,
  -- Rekkevidden og gruppen, fra trådene og kategoriene i rommet; radsikkerheten bruker dem.
  omfang text not null,
  gruppe_id uuid,
  -- Økes med én ved hver setning som endrer noe i rommet.
  siste_endring bigint not null default 1,
  -- Tråden den siste endringen gjaldt; null for en kategori eller flere tråder.
  diskusjon_id uuid,
  endret_kl timestamptz not null default now(),
  constraint diskusjonsklokker_rom unique nulls not distinct (side, fagmiljo_id)
);

comment on table public.diskusjonsklokker is
  'Dørklokken sanntiden lytter på for diskusjonene: én rad per rom, uten tekst og avsender. Skrives av utløserne. Se docs/diskusjoner.md.';

alter table public.diskusjonsklokker enable row level security;
revoke all on public.diskusjonsklokker from anon, authenticated;
grant select on public.diskusjonsklokker to authenticated;

create policy "Den som ser rommet, ser dørklokken" on public.diskusjonsklokker
for select
to authenticated
using (
  omfang = 'felles'
  or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[])
  or gruppe_id = any ((select public.mine_lesbare_grupper())::uuid[])
);

-- Som på de andre tabellene nettleseren når (P2.0, 20261114103000).
create policy aktivt_medlemskap on public.diskusjonsklokker as restrictive for all to authenticated
using ((select public.har_aktivt_medlemskap()))
with check ((select public.har_aktivt_medlemskap()));

-- --- 2. Ringingen -----------------------------------------------------------------

-- Ringer én gang per rom i `rader` (side, fagmiljo_id, omfang, gruppe_id,
-- diskusjon_id). Rommene tas i fast rekkefølge, så to setninger som ringer
-- de samme, ikke venter på hverandre i hver sin ende.
create function intern.ring_diskusjonsklokker(rader jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.diskusjonsklokker as k (side, fagmiljo_id, omfang, gruppe_id, diskusjon_id)
  select
    r.side,
    r.fagmiljo_id,
    min(r.omfang),
    (array_agg(r.gruppe_id))[1],
    case when count(distinct r.diskusjon_id) = 1 and bool_and(r.diskusjon_id is not null) then (array_agg(r.diskusjon_id))[1] end
  from jsonb_to_recordset(coalesce(rader, '[]'::jsonb)) as r(side text, fagmiljo_id uuid, omfang text, gruppe_id uuid, diskusjon_id uuid)
  where r.side is not null and r.omfang is not null
  group by r.side, r.fagmiljo_id
  order by r.side, r.fagmiljo_id nulls first
  on conflict on constraint diskusjonsklokker_rom do update
  set siste_endring = k.siste_endring + 1, diskusjon_id = excluded.diskusjon_id, endret_kl = now()
$$;

revoke all on function intern.ring_diskusjonsklokker(jsonb) from public, anon, authenticated, service_role;

comment on function intern.ring_diskusjonsklokker(jsonb) is
  'Ringer dørklokken i hvert rom radene gjelder, én gang. Brukes av utløserne. Se docs/diskusjoner.md, «Sanntiden».';

-- Trådene og kategoriene står selv i rommet sitt. En tråd som flyttes til en
-- annen side, ringer i begge rommene.
create function intern.diskusjonsklokke_egne()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  traad boolean := tg_table_name = 'diskusjoner';
  rader jsonb := '[]'::jsonb;
begin
  if tg_op <> 'DELETE' then
    rader := rader || coalesce((
      select jsonb_agg(jsonb_build_object(
        'side', n.side, 'fagmiljo_id', n.fagmiljo_id, 'omfang', n.omfang, 'gruppe_id', n.gruppe_id,
        'diskusjon_id', case when traad then n.id end))
      from nye n
    ), '[]'::jsonb);
  end if;
  if tg_op <> 'INSERT' then
    rader := rader || coalesce((
      select jsonb_agg(jsonb_build_object(
        'side', g.side, 'fagmiljo_id', g.fagmiljo_id, 'omfang', g.omfang, 'gruppe_id', g.gruppe_id,
        'diskusjon_id', case when traad then g.id end))
      from gamle g
    ), '[]'::jsonb);
  end if;
  perform intern.ring_diskusjonsklokker(rader);
  return null;
end;
$$;

revoke all on function intern.diskusjonsklokke_egne() from public, anon, authenticated, service_role;

-- Kommentarene og hjertene ringer i rommet til tråden sin. Slettes tråden,
-- er det den som ringer; det som går med den, finner ingen tråd.
create function intern.diskusjonsklokke_barn()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rader jsonb := '[]'::jsonb;
begin
  if tg_op <> 'DELETE' then
    rader := rader || coalesce((
      select jsonb_agg(jsonb_build_object(
        'side', d.side, 'fagmiljo_id', d.fagmiljo_id, 'omfang', d.omfang, 'gruppe_id', d.gruppe_id, 'diskusjon_id', d.id))
      from nye n
      join public.diskusjoner d on d.id = n.diskusjon_id
    ), '[]'::jsonb);
  end if;
  if tg_op <> 'INSERT' then
    rader := rader || coalesce((
      select jsonb_agg(jsonb_build_object(
        'side', d.side, 'fagmiljo_id', d.fagmiljo_id, 'omfang', d.omfang, 'gruppe_id', d.gruppe_id, 'diskusjon_id', d.id))
      from gamle g
      join public.diskusjoner d on d.id = g.diskusjon_id
    ), '[]'::jsonb);
  end if;
  perform intern.ring_diskusjonsklokker(rader);
  return null;
end;
$$;

revoke all on function intern.diskusjonsklokke_barn() from public, anon, authenticated, service_role;

-- Én utløser per hendelse (Postgres tillater ikke overgangstabeller på en
-- utløser for flere hendelser), etter hver setning.
do $$
declare
  tabell text;
  funksjon text;
begin
  foreach tabell in array array['diskusjoner', 'diskusjonskategorier', 'diskusjonskommentarer', 'diskusjonshjerter'] loop
    funksjon := case when tabell in ('diskusjoner', 'diskusjonskategorier') then 'intern.diskusjonsklokke_egne()' else 'intern.diskusjonsklokke_barn()' end;
    execute format(
      'create trigger %1$s_diskusjonsklokke_ny after insert on public.%1$s referencing new table as nye for each statement execute function %2$s',
      tabell, funksjon);
    execute format(
      'create trigger %1$s_diskusjonsklokke_endret after update on public.%1$s referencing old table as gamle new table as nye for each statement execute function %2$s',
      tabell, funksjon);
    execute format(
      'create trigger %1$s_diskusjonsklokke_slettet after delete on public.%1$s referencing old table as gamle for each statement execute function %2$s',
      tabell, funksjon);
  end loop;
end;
$$;

-- --- 4. Sanntiden -------------------------------------------------------------------

alter publication supabase_realtime add table public.diskusjonsklokker;
