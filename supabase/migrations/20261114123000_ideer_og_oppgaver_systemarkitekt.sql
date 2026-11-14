-- P2b, idéene og de planlagte oppgavene etter Peders beslutning D8
-- (2026-11-14): idéene deles av alle med et aktivt medlemskap, uansett
-- fagmiljø. De planlagte oppgavene, og det å arkivere, overføre, gjenopprette
-- og rydde idéer, er forbeholdt systemarkitektene. Den gamle adminrollen
-- (`profiles.role = 'admin'`) gir ingenting her lenger.
--
-- Bygger på `public.er_systemarkitekt()` fra hjelperne (P2a), som svarer nei
-- uten et aktivt medlemskap.
--
-- Tilbakeføring: sett `intern.krev_idevalg_admin()`, de tre funksjonene og de
-- tre reglene tilbake til forrige versjon i en ny migrasjon. Ingen data endres.

-- Porten alle handlingene på idéene og oppgavene går gjennom. Navnet er
-- beholdt, så funksjonene som kaller den, ikke må skrives på nytt.
create or replace function intern.krev_idevalg_admin()
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  if not public.er_systemarkitekt() then
    raise exception 'Bare en systemarkitekt kan gjøre dette.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function intern.krev_idevalg_admin() from public, anon, authenticated, service_role;

comment on function intern.krev_idevalg_admin() is
  'D8: krever en systemarkitekt med aktivt medlemskap. Porten for å arkivere, overføre, gjenopprette og rydde idéer, og for de planlagte oppgavene.';

-- Å rydde arkivet sletter idéer for godt: systemarkitektene.
create or replace function public.rydd_idearkiv()
returns integer
language sql
volatile
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select intern.krev_idevalg_admin();
  with slettet as (
    delete from public.ideer i
    where i.arkivert_kl <= now() - intern.arkivfrist()
    returning 1
  )
  select count(*)::integer from slettet
$$;

-- De planlagte oppgavene leses bare av systemarkitektene.
create or replace function public.oppgaveoversikt()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select intern.krev_idevalg_admin();
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
  select intern.krev_aktivt_medlemskap();
  select intern.krev_idevalg_admin();
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

-- Radsikkerheten: oppgavene leses bare av systemarkitektene, og bare
-- forfatteren eller en systemarkitekt sletter en idé eller en kommentar.
alter policy "Innloggede leser oppgavene" on public.oppgaver
using ((select public.er_systemarkitekt()));
alter policy "Innloggede leser oppgavene" on public.oppgaver
rename to "Systemarkitektene leser oppgavene";

alter policy "Forfatteren eller en administrator sletter idéen" on public.ideer
using (
  (public.ide_er_apen(id) and (forfatter_id = (select auth.uid()) or (select public.er_systemarkitekt())))
  or (arkivert_kl is not null and (select public.er_systemarkitekt()))
);
alter policy "Forfatteren eller en administrator sletter idéen" on public.ideer
rename to "Forfatteren eller en systemarkitekt sletter idéen";

alter policy "Forfatteren eller en administrator sletter kommentaren" on public.idekommentarer
using (((forfatter_id = (select auth.uid())) and not slettet) or (select public.er_systemarkitekt()));
alter policy "Forfatteren eller en administrator sletter kommentaren" on public.idekommentarer
rename to "Forfatteren eller en systemarkitekt sletter kommentaren";
