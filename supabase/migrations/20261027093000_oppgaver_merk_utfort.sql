-- Planlagte oppgaver: en administrator kan merke en oppgave utført i appen.
--
-- Til nå ble en oppgave bare utført når Claude kjørte `fullfor_oppgave()` som
-- migrering etter `/utfor-oppgaver`. En oppgave som er gjort på en annen måte,
-- uten at en agent tok den fra køen, ble stående. Nå kan en administrator
-- merke den utført fra hvilken som helst status som ikke er utført, med eller
-- uten versjonen i endringsloggen der det står hva som ble gjort.
--
-- Statusen den hadde, tas vare på i `utfort_fra`. Den sier at oppgaven ble
-- merket i appen, og lar administratoren gjøre det om: oppgaven får da
-- statusen tilbake. En oppgave Claude har merket utført, står for alltid.

alter table public.oppgaver add column utfort_fra public.oppgavestatus;

comment on column public.oppgaver.utfort_fra is
  'Statusen oppgaven hadde da en administrator merket den utført i appen, ellers null.';

-- En oppgave Claude merker utført, har alltid versjonen. En administrator kan
-- merke den uten, når arbeidet ikke har noen føring i endringsloggen.
alter table public.oppgaver
  drop constraint oppgaver_utfort,
  add constraint oppgaver_utfort check (
    case when status = 'utfort' then utfort_kl is not null and (endringslogg is not null or utfort_fra is not null)
    else utfort_kl is null and endringslogg is null and utfort_fra is null end
  ),
  add constraint oppgaver_utfort_fra check (utfort_fra is distinct from 'utfort');

-- --- Det en administrator gjør i appen ---------------------------------------------

-- Oppgaven er gjort uten at en agent tok den fra køen: den blir utført med
-- versjonen, eller uten. Også en oppgave en agent håndterer kan merkes, for
-- når agenten stoppet etter at arbeidet var slått sammen.
create function public.merk_oppgave_utfort(oppgave uuid, endringslogg text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_idevalg_admin();
  update public.oppgaver o
  set status = 'utfort',
    utfort_fra = o.status,
    endringslogg = nullif(btrim(merk_oppgave_utfort.endringslogg), ''),
    utfort_kl = now(),
    klar_kl = coalesce(o.klar_kl, now())
  where o.id = merk_oppgave_utfort.oppgave and o.status <> 'utfort';
  if not found then
    raise exception 'Oppgaven finnes ikke, eller er utført.' using errcode = '55000';
  end if;
end;
$$;

-- En oppgave en administrator har merket utført, får statusen den hadde
-- tilbake. En oppgave Claude har merket utført, kan ikke gjøres om.
create function public.angre_oppgave_utfort(oppgave uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_idevalg_admin();
  update public.oppgaver o
  set status = o.utfort_fra,
    klar_kl = case when o.utfort_fra in ('ikke_paabegynt', 'under_arbeid') then null else o.klar_kl end,
    endringslogg = null,
    utfort_kl = null,
    utfort_fra = null
  where o.id = angre_oppgave_utfort.oppgave and o.status = 'utfort' and o.utfort_fra is not null;
  if not found then
    raise exception 'Bare en oppgave som er merket utført i appen, kan gjøres om.' using errcode = '55000';
  end if;
end;
$$;

comment on function public.merk_oppgave_utfort(uuid, text) is
  'Merker en oppgave som ikke er utført, utført, med versjonen i endringsloggen eller uten. Bare for administratorer.';
comment on function public.angre_oppgave_utfort(uuid) is
  'Gir en oppgave som er merket utført i appen, statusen den hadde tilbake. Bare for administratorer.';

-- --- Lesing ----------------------------------------------------------------------

create or replace function public.oppgaveoversikt()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', o.id,
      'ide_id', i.id,
      'tittel', o.tittel,
      'kategori', i.kategori,
      'forfatter_id', i.forfatter_id,
      'status', o.status,
      'nummer', o.nummer,
      'endringslogg', o.endringslogg,
      'har_prompt', btrim(o.prompt) <> '',
      'overfort_kl', o.overfort_kl,
      'endret_kl', o.endret_kl,
      'klar_kl', o.klar_kl,
      'tatt_kl', o.tatt_kl,
      'utfort_kl', o.utfort_kl,
      'merket_utfort', o.utfort_fra is not null
    ) order by o.overfort_kl desc, o.id), '[]'::jsonb)
  from public.oppgaver o
  join public.ideer i on i.id = o.ide_id
  where (select auth.uid()) is not null
$$;

create or replace function public.oppgave(oppgave uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
      'id', o.id,
      'ide_id', i.id,
      'tittel', o.tittel,
      'kategori', i.kategori,
      'forfatter_id', i.forfatter_id,
      'status', o.status,
      'nummer', o.nummer,
      'endringslogg', o.endringslogg,
      'har_prompt', btrim(o.prompt) <> '',
      'prompt', o.prompt,
      'overfort_kl', o.overfort_kl,
      'endret_kl', o.endret_kl,
      'klar_kl', o.klar_kl,
      'tatt_kl', o.tatt_kl,
      'utfort_kl', o.utfort_kl,
      'merket_utfort', o.utfort_fra is not null
    )
  from public.oppgaver o
  join public.ideer i on i.id = o.ide_id
  where o.id = oppgave.oppgave and (select auth.uid()) is not null
$$;

-- --- Rettigheter ---------------------------------------------------------------------

revoke all on function public.merk_oppgave_utfort(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.angre_oppgave_utfort(uuid) from public, anon, authenticated, service_role;
grant execute on function public.merk_oppgave_utfort(uuid, text) to authenticated;
grant execute on function public.angre_oppgave_utfort(uuid) to authenticated;
