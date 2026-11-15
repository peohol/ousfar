-- Den som er medlem av flere fagmiljøer, velger selv hvilket hen arbeider i
-- (Peders valg 15.11.2026, docs/fagmiljoer.md «Fortolkningen per fagmiljø»).
--
-- Arbeidskonteksten er det aktive primærmedlemskapet (`intern.arbeidsfagmiljo`).
-- Et medlemskap som gis til en som alt har et primært, blir ikke primært
-- (`intern.gi_medlemskap`), så uten dette ble alle stående i fagmiljøet de
-- først fikk. Valget lagres på serveren, som primærmedlemskapet, og gjelder
-- bare den innloggede selv og bare blant egne aktive medlemskap i aktive
-- fagmiljøer. Det gir ingen tilgang utover medlemskapene: lesing og deltakelse
-- følger alle aktive medlemskap som før, bare fortolkningen følger valget.
--
-- `mine_rettigheter()` får i tillegg fagmiljøene den innloggede kan velge
-- mellom (`mine_fagmiljoer`), så appen kan vise valget.

create function public.velg_arbeidsfagmiljo(fagmiljo uuid)
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

  if not exists (
    select 1 from public.medlemskap m
    join public.fagmiljoer f on f.id = m.fagmiljo_id
    where m.bruker_id = aktor and m.fagmiljo_id = velg_arbeidsfagmiljo.fagmiljo
      and m.status = 'aktiv' and f.status = 'aktiv'
  ) then
    raise exception 'Du kan bare arbeide i et fagmiljø du er aktivt medlem av.'
      using errcode = '42501';
  end if;

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

  return public.mine_rettigheter();
end;
$$;

revoke all on function public.velg_arbeidsfagmiljo(uuid) from public, anon, authenticated, service_role;
grant execute on function public.velg_arbeidsfagmiljo(uuid) to authenticated;

-- Som i P3, med `mine_fagmiljoer`: de aktive fagmiljøene den innloggede har
-- aktivt medlemskap i, som arbeidsfagmiljøet kan velges blant.
create or replace function public.mine_rettigheter()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select jsonb_build_object(
    'systemarkitekt', public.er_systemarkitekt(),
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
    'stoffregister', intern.har_registerrett((select auth.uid())),
    'opprett_bruker', intern.opprettelsesavslag((select auth.uid())) is null
  )
$$;
