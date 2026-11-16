-- Systemarkitektene velger hvilket fagmiljø appen viser fortolkningen for,
-- også et de ikke er medlem av (Peders ønske 16.11.2026, docs/fagmiljoer.md
-- «Fortolkningen per fagmiljø»).
--
-- Arbeidskonteksten (`intern.arbeidsfagmiljo`) var det aktive
-- primærmedlemskapet, også for en systemarkitekt. Systemarkitektene kan alt
-- lese og endre lokalt innhold i alle fagmiljøer (`intern.er_medlem_i`,
-- `intern.er_lokal_admin_i`, P2a), men fortolkningen, analyttkatalogen og
-- rommene i diskusjonene på fortolkningssidene fulgte bare medlemskapet.
--
-- Nå kan en systemarkitekt velge et hvilket som helst aktivt fagmiljø under
-- «Fagmiljø» i kontomenyen. Valget er et visningsvalg, ikke et medlemskap:
--
--   * Det lagres for den innloggede selv i `public.visningsfagmiljoer`, som
--     ingen i nettleseren kan lese eller skrive direkte. Bare
--     `public.velg_arbeidsfagmiljo` skriver der.
--   * Medlemskapene, primærmedlemskapet og tilgangsloggen røres ikke, og
--     valget gir ingen tilgang utover det systemarkitekten alt har.
--   * Det gjelder bare så lenge personen er systemarkitekt og fagmiljøet er
--     aktivt. Ellers er arbeidskonteksten igjen primærmedlemskapet.
--   * Velges et fagmiljø hen er medlem av, gjelder valget av primærmedlemskap
--     som før, og visningsvalget fjernes.
--
-- Alle andre fortsetter å velge blant egne medlemskap, uendret.
--
-- Tilbakeføring: en ny migrasjon som setter `intern.arbeidsfagmiljo`,
-- `public.velg_arbeidsfagmiljo` og `public.mine_rettigheter` tilbake til
-- definisjonene i 20261114202000, 20261115020000 og 20261115113000, og
-- fjerner tabellen. Den har bare visningsvalg; ingen andre data endres her.

-- --- Visningsvalget ------------------------------------------------------------

create table public.visningsfagmiljoer (
  bruker_id uuid primary key references public.profiles (id) on delete cascade,
  fagmiljo_id uuid not null references public.fagmiljoer (id) on delete cascade,
  endret timestamptz not null default now()
);

comment on table public.visningsfagmiljoer is
  'Fagmiljøet en systemarkitekt har valgt å se fortolkningen for, uten å være medlem. Skrives bare av velg_arbeidsfagmiljo. Se docs/fagmiljoer.md.';

alter table public.visningsfagmiljoer enable row level security;
revoke all on table public.visningsfagmiljoer from public, anon, authenticated;

-- --- Arbeidskonteksten ---------------------------------------------------------

-- Visningsvalget til en systemarkitekt, når fagmiljøet er aktivt; ellers det
-- aktive primærmedlemskapet i et aktivt fagmiljø, som før. Null uten noen av
-- dem.
create or replace function intern.arbeidsfagmiljo(bruker uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select v.fagmiljo_id
      from public.visningsfagmiljoer v
      join public.fagmiljoer f on f.id = v.fagmiljo_id
      where v.bruker_id = arbeidsfagmiljo.bruker
        and f.status = 'aktiv'
        and intern.er_systemarkitekt(arbeidsfagmiljo.bruker)
    ),
    (
      select m.fagmiljo_id
      from public.medlemskap m
      join public.fagmiljoer f on f.id = m.fagmiljo_id
      where arbeidsfagmiljo.bruker is not null
        and m.bruker_id = arbeidsfagmiljo.bruker
        and m.primaer
        and m.status = 'aktiv'
        and f.status = 'aktiv'
    )
  )
$$;

comment on function intern.arbeidsfagmiljo(uuid) is
  'Fagmiljøet fortolkningen gjelder for brukeren: visningsvalget til en systemarkitekt, ellers det aktive primærmedlemskapet, ellers null. Se docs/fagmiljoer.md.';

-- --- Valget --------------------------------------------------------------------

-- Som i 20261115020000_velg_arbeidsfagmiljo.sql for et fagmiljø den innloggede
-- er aktivt medlem av. En systemarkitekt kan i tillegg velge et hvilket som
-- helst annet aktivt fagmiljø; da lagres bare visningsvalget.
create or replace function public.velg_arbeidsfagmiljo(fagmiljo uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
begin
  perform intern.krev_aktivt_medlemskap();
  perform intern.las_tilgang(aktor, 'Arbeidsfagmiljø valgt av brukeren selv');

  if exists (
    select 1 from public.medlemskap m
    join public.fagmiljoer f on f.id = m.fagmiljo_id
    where m.bruker_id = aktor and m.fagmiljo_id = velg_arbeidsfagmiljo.fagmiljo
      and m.status = 'aktiv' and f.status = 'aktiv'
  ) then
    delete from public.visningsfagmiljoer v where v.bruker_id = aktor;

    -- I to steg, så det unike primærmedlemskapet aldri står dobbelt underveis;
    -- invariantene kontrolleres når transaksjonen er ferdig. Er valget alt
    -- gjort, endres ingenting.
    if not exists (
      select 1 from public.medlemskap m
      where m.bruker_id = aktor and m.fagmiljo_id = velg_arbeidsfagmiljo.fagmiljo
        and m.status = 'aktiv' and m.primaer
    ) then
      update public.medlemskap m set primaer = false
      where m.bruker_id = aktor and m.status = 'aktiv' and m.primaer;
      update public.medlemskap m set primaer = true
      where m.bruker_id = aktor and m.fagmiljo_id = velg_arbeidsfagmiljo.fagmiljo and m.status = 'aktiv';
    end if;
  elsif intern.er_systemarkitekt(aktor) and exists (
    select 1 from public.fagmiljoer f
    where f.id = velg_arbeidsfagmiljo.fagmiljo and f.status = 'aktiv'
  ) then
    insert into public.visningsfagmiljoer as v (bruker_id, fagmiljo_id)
    values (aktor, velg_arbeidsfagmiljo.fagmiljo)
    on conflict (bruker_id) do update
      set fagmiljo_id = excluded.fagmiljo_id, endret = now()
      where v.fagmiljo_id is distinct from excluded.fagmiljo_id;
  else
    raise exception 'Du kan bare arbeide i et fagmiljø du er aktivt medlem av.'
      using errcode = '42501';
  end if;

  return public.mine_rettigheter();
end;
$$;

revoke all on function public.velg_arbeidsfagmiljo(uuid) from public, anon, authenticated, service_role;
grant execute on function public.velg_arbeidsfagmiljo(uuid) to authenticated;

-- --- Det appen spør om ---------------------------------------------------------

-- Som i 20261115113000_opprett_bruker_i_fagmiljo.sql, med
-- `velgbare_fagmiljoer`: fagmiljøene den innloggede kan velge arbeidskontekst
-- blant, alle aktive for en systemarkitekt og ellers `mine_fagmiljoer`.
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
      where f.status = 'aktiv'
        and exists (
          select 1 from public.medlemskap m
          where m.bruker_id = (select auth.uid()) and m.fagmiljo_id = f.id and m.status = 'aktiv'
        )
    ), '[]'::jsonb),
    'velgbare_fagmiljoer', coalesce((
      select jsonb_agg(intern.fagmiljoreferanse(f) order by f.navn)
      from public.fagmiljoer f
      where f.status = 'aktiv'
        and (
          arkitekt.er
          or exists (
            select 1 from public.medlemskap m
            where m.bruker_id = (select auth.uid()) and m.fagmiljo_id = f.id and m.status = 'aktiv'
          )
        )
    ), '[]'::jsonb),
    'stoffregister', intern.har_registerrett((select auth.uid())),
    'opprett_bruker', jsonb_array_length(opprett.i) > 0,
    'opprett_bruker_i', opprett.i
  )
  from opprett, arkitekt
$$;
