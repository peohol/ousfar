-- Skjulingen i diskusjonene kan oppheves.
--
-- Før fjernet «Skjul» teksten for godt. Nå tas teksten vare på i en egen
-- tabell som bare administratorene kan lese, så en administrator kan vise den
-- igjen («Vis igjen») — eller fjerne den for godt («Fjern for godt»), for
-- eksempel når det var pasientopplysninger som havnet der ved en feil.
-- Innhold som ble skjult før denne endringen, er alt borte og kan ikke vises
-- igjen.

-- --- Tekstene som er skjult ---------------------------------------------------------

create table public.diskusjon_skjulte_tekster (
  diskusjon_id uuid not null references public.diskusjoner (id) on delete cascade,
  -- Null for det første innlegget i tråden.
  kommentar_id uuid references public.diskusjonskommentarer (id) on delete cascade,
  tekst jsonb not null,
  skjult_av uuid default auth.uid() references public.profiles (id) on delete set null,
  skjult_kl timestamptz not null default now(),
  constraint diskusjon_skjulte_tekster_unik unique nulls not distinct (diskusjon_id, kommentar_id)
);

comment on table public.diskusjon_skjulte_tekster is
  'Teksten i et innlegg eller en kommentar en administrator har skjult, så den kan vises igjen. Bare administratorene leser den; den skrives gjennom funksjonene.';

create index diskusjon_skjulte_tekster_kommentar_idx on public.diskusjon_skjulte_tekster (kommentar_id);

alter table public.diskusjon_skjulte_tekster enable row level security;

create policy "Administratorene ser skjulte tekster" on public.diskusjon_skjulte_tekster
for select to authenticated using ((select public.er_admin()));

revoke all on public.diskusjon_skjulte_tekster from anon, authenticated;
grant select on public.diskusjon_skjulte_tekster to authenticated;

-- Når innholdet ikke lenger er skjult — det er vist igjen, skrevet på nytt av
-- forfatteren eller kommentaren er slettet — er den lagrede teksten
-- overflødig.
create function intern.diskusjon_glem_skjult_tekst()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.skjult_kl is not null and new.skjult_kl is null then
    if tg_table_name = 'diskusjoner' then
      delete from public.diskusjon_skjulte_tekster s
      where s.diskusjon_id = new.id and s.kommentar_id is null;
    else
      delete from public.diskusjon_skjulte_tekster s
      where s.diskusjon_id = new.diskusjon_id and s.kommentar_id = new.id;
    end if;
  end if;
  return null;
end;
$$;

create trigger diskusjoner_glem_skjult_tekst
after update of skjult_kl on public.diskusjoner
for each row execute function intern.diskusjon_glem_skjult_tekst();

create trigger diskusjonskommentarer_glem_skjult_tekst
after update of skjult_kl on public.diskusjonskommentarer
for each row execute function intern.diskusjon_glem_skjult_tekst();

-- Å vise en kommentar igjen er ingen endring av den, like lite som å skjule
-- den.
create or replace function intern.diskusjonskommentar_merk_endret()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.tekst is distinct from old.tekst and not new.slettet and new.skjult_kl is null and old.skjult_kl is null then
    new.endret_kl := now();
  else
    new.endret_kl := old.endret_kl;
  end if;
  return new;
end;
$$;

-- --- Skjule, vise igjen og fjerne for godt ---------------------------------------------

-- En administrator skjuler innholdet i det første innlegget (uten kommentar)
-- eller i en kommentar. Teksten tas vare på, så den kan vises igjen. Som
-- resten av tråden kan ingenting av dette endres mens den er arkivert.
create or replace function public.skjul_i_diskusjon(diskusjon uuid, kommentar uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  lagret jsonb;
begin
  if not public.er_admin() then
    raise exception 'Bare en administrator kan skjule innhold.' using errcode = '42501';
  end if;
  -- En arkivert tråd er frosset til den er hentet tilbake.
  if not public.diskusjon_er_apen(skjul_i_diskusjon.diskusjon) then
    raise exception 'Tråden er arkivert eller finnes ikke.' using errcode = '42501';
  end if;
  if skjul_i_diskusjon.kommentar is null then
    select d.tekst into lagret
    from public.diskusjoner d
    where d.id = skjul_i_diskusjon.diskusjon and d.tekst is not null
    for update;
  else
    select k.tekst into lagret
    from public.diskusjonskommentarer k
    where k.id = skjul_i_diskusjon.kommentar
      and k.diskusjon_id = skjul_i_diskusjon.diskusjon
      and not k.slettet
      and k.skjult_kl is null
    for update;
  end if;
  if lagret is null then
    return;
  end if;

  delete from public.diskusjon_skjulte_tekster s
  where s.diskusjon_id = skjul_i_diskusjon.diskusjon
    and s.kommentar_id is not distinct from skjul_i_diskusjon.kommentar;
  insert into public.diskusjon_skjulte_tekster (diskusjon_id, kommentar_id, tekst)
  values (skjul_i_diskusjon.diskusjon, skjul_i_diskusjon.kommentar, lagret);

  if skjul_i_diskusjon.kommentar is null then
    update public.diskusjoner d
    set tekst = null, skjult_kl = now()
    where d.id = skjul_i_diskusjon.diskusjon;
  else
    update public.diskusjonskommentarer k
    set tekst = null, skjult_kl = now()
    where k.id = skjul_i_diskusjon.kommentar;
  end if;
end;
$$;

comment on function public.skjul_i_diskusjon(uuid, uuid) is
  'Skjuler teksten i det første innlegget (kommentar null) eller i en kommentar, med en merknad om at den er skjult. Teksten tas vare på, så den kan vises igjen. Bare for administratorer.';

-- En administrator viser skjult innhold igjen, slik det var.
create function public.vis_i_diskusjon(diskusjon uuid, kommentar uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  lagret jsonb;
begin
  if not public.er_admin() then
    raise exception 'Bare en administrator kan vise skjult innhold igjen.' using errcode = '42501';
  end if;
  -- En arkivert tråd er frosset til den er hentet tilbake.
  if not public.diskusjon_er_apen(vis_i_diskusjon.diskusjon) then
    raise exception 'Tråden er arkivert eller finnes ikke.' using errcode = '42501';
  end if;
  select s.tekst into lagret
  from public.diskusjon_skjulte_tekster s
  where s.diskusjon_id = vis_i_diskusjon.diskusjon
    and s.kommentar_id is not distinct from vis_i_diskusjon.kommentar;
  if lagret is null then
    raise exception 'Teksten er fjernet for godt og kan ikke vises igjen.' using errcode = 'P0002';
  end if;

  if vis_i_diskusjon.kommentar is null then
    update public.diskusjoner d
    set tekst = lagret, skjult_kl = null
    where d.id = vis_i_diskusjon.diskusjon and d.skjult_kl is not null;
  else
    update public.diskusjonskommentarer k
    set tekst = lagret, skjult_kl = null
    where k.id = vis_i_diskusjon.kommentar
      and k.diskusjon_id = vis_i_diskusjon.diskusjon
      and k.skjult_kl is not null
      and not k.slettet;
  end if;
end;
$$;

comment on function public.vis_i_diskusjon(uuid, uuid) is
  'Viser teksten en administrator har skjult i det første innlegget (kommentar null) eller i en kommentar, igjen. Bare for administratorer.';

-- En administrator fjerner skjult innhold for godt. Merknaden står igjen.
create function public.fjern_skjult_i_diskusjon(diskusjon uuid, kommentar uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.er_admin() then
    raise exception 'Bare en administrator kan fjerne skjult innhold.' using errcode = '42501';
  end if;
  -- En arkivert tråd er frosset til den er hentet tilbake.
  if not public.diskusjon_er_apen(fjern_skjult_i_diskusjon.diskusjon) then
    raise exception 'Tråden er arkivert eller finnes ikke.' using errcode = '42501';
  end if;
  delete from public.diskusjon_skjulte_tekster s
  where s.diskusjon_id = fjern_skjult_i_diskusjon.diskusjon
    and s.kommentar_id is not distinct from fjern_skjult_i_diskusjon.kommentar;
end;
$$;

comment on function public.fjern_skjult_i_diskusjon(uuid, uuid) is
  'Fjerner teksten en administrator har skjult, for godt, så den ikke kan vises igjen. Bare for administratorer.';

-- --- Tråden sier om det skjulte kan vises igjen ----------------------------------------

-- Som før, med `kan_vises` på innlegget og kommentarene: innholdet er skjult,
-- og teksten er tatt vare på. Bare administratorene ser tekstene, så det er
-- alltid usant for andre.
create or replace function public.diskusjonstraad(diskusjon uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  with hjerter as (
    select h.kommentar_id, count(*) as antall, bool_or(h.bruker_id = (select auth.uid())) as mitt
    from public.diskusjonshjerter h
    where h.diskusjon_id = diskusjonstraad.diskusjon
    group by h.kommentar_id
  ),
  skjulte as (
    select s.kommentar_id
    from public.diskusjon_skjulte_tekster s
    where s.diskusjon_id = diskusjonstraad.diskusjon
  )
  select jsonb_build_object(
    'id', d.id,
    'side', d.side,
    'kategori_id', d.kategori_id,
    'forfatter_id', d.forfatter_id,
    'tittel', d.tittel,
    'tekst', d.tekst,
    'skjult', d.skjult_kl is not null,
    'kan_vises', d.skjult_kl is not null and exists (select 1 from skjulte s where s.kommentar_id is null),
    'opprettet_kl', d.opprettet_kl,
    'endret_kl', d.endret_kl,
    'arkivert_kl', d.arkivert_kl,
    'lest_kl', now(),
    'sist_sett', (
      select b.sett_kl from public.diskusjonsbesok b
      where b.diskusjon_id = d.id and b.bruker_id = (select auth.uid())
    ),
    'hjerter', coalesce((select h.antall from hjerter h where h.kommentar_id is null), 0),
    'mitt_hjerte', coalesce((select h.mitt from hjerter h where h.kommentar_id is null), false),
    'kommentarer', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', k.id,
          'forelder_id', k.forelder_id,
          'forfatter_id', k.forfatter_id,
          'tekst', k.tekst,
          'slettet', k.slettet,
          'skjult', k.skjult_kl is not null,
          'kan_vises', k.skjult_kl is not null and exists (select 1 from skjulte s where s.kommentar_id = k.id),
          'opprettet_kl', k.opprettet_kl,
          'endret_kl', k.endret_kl,
          'hjerter', case when k.slettet then 0 else coalesce(h.antall, 0) end,
          'mitt_hjerte', case when k.slettet then false else coalesce(h.mitt, false) end
        ) order by k.opprettet_kl, k.id)
      from public.diskusjonskommentarer k
      left join hjerter h on h.kommentar_id = k.id
      where k.diskusjon_id = d.id
    ), '[]'::jsonb)
  )
  from public.diskusjoner d
  where d.id = diskusjonstraad.diskusjon
$$;

comment on function public.diskusjonstraad(uuid) is
  'Én tråd med det første innlegget, hjertene og alle kommentarene, når den innloggede sist åpnet den og når tråden ble lest, og om skjult innhold kan vises igjen (bare for administratorer). Null når den ikke finnes.';

-- --- Rettighetene -------------------------------------------------------------------

revoke all on function
  public.vis_i_diskusjon(uuid, uuid),
  public.fjern_skjult_i_diskusjon(uuid, uuid)
from public, anon, authenticated, service_role;

grant execute on function
  public.vis_i_diskusjon(uuid, uuid),
  public.fjern_skjult_i_diskusjon(uuid, uuid)
to authenticated;

revoke all on function intern.diskusjon_glem_skjult_tekst() from public, anon, authenticated, service_role;
