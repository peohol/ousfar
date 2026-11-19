-- Profilkortet ved hovering (docs/fagmiljoer.md, «Profilkortet»).
--
-- Når pekeren hviler på profilbildet eller navnet til en annen bruker, viser
-- appen et kort med bildet, hele navnet, stillingen (navnet fra
-- `public.stillinger`, eller `null`; docs/stillinger.md), fagmiljøene
-- personen er aktivt medlem av, og en chatknapp når det kan sendes
-- direktemeldinger til hen.
-- Navnet og bildet har appen fra før (profilkortet i `profiles`, eller
-- profilkortet funksjonene gir sammen med innholdet); det denne funksjonen
-- gir, er resten.
--
-- Hvem som får svar: de samme som ser profilkortet gjennom fagmiljøene,
-- gruppene og direktesamtalene (`intern.synlige_profiler`), og
-- systemarkitektene. For alle andre, og for en konto som ikke finnes, er
-- svaret `null`, uten å si hvorfor. Kortet viser da bare navnet og bildet det
-- alt har.
--
-- `kan_chatte` er ett ja eller nei med den samme grunnen som sendingen bruker
-- (`intern.kan_motta_fra`: aktivt medlemskap, «Tillat direktemeldinger» på,
-- og ikke blokkert av personen), så den som er blokkert, får samme svar som
-- for en som har slått av. Den er også nei når den innloggede selv har
-- blokkert personen, og når direktemeldingene ikke er slått på i OUSFAR. Den
-- innloggedes egen bryter teller ikke: kortet tilbyr da å slå den på.

create function public.profilkortdetaljer(bruker uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  seer uuid := (select auth.uid());
begin
  perform intern.krev_aktivt_medlemskap();
  if profilkortdetaljer.bruker is null
    or not exists (select 1 from public.profiles p where p.id = profilkortdetaljer.bruker)
    or not (
      intern.er_systemarkitekt(seer)
      or profilkortdetaljer.bruker in (select s from intern.synlige_profiler(seer) s)
    )
  then
    return null;
  end if;
  return jsonb_build_object(
    'id', profilkortdetaljer.bruker,
    'stilling', (
      select s.navn
      from public.profiles p
      join public.stillinger s on s.id = p.stilling_id
      where p.id = profilkortdetaljer.bruker
    ),
    -- Primærfagmiljøet først, så de andre etter navnet.
    'fagmiljoer', coalesce((
      select jsonb_agg(f.navn order by m.primaer desc, f.navn)
      from public.medlemskap m
      join public.fagmiljoer f on f.id = m.fagmiljo_id
      where m.bruker_id = profilkortdetaljer.bruker
        and m.status = 'aktiv'
        and f.status = 'aktiv'
    ), '[]'::jsonb),
    'kan_chatte', profilkortdetaljer.bruker <> seer
      and intern.direktemeldinger_aktivert()
      and intern.kan_motta_fra(profilkortdetaljer.bruker, seer)
      and not intern.har_blokkert(seer, profilkortdetaljer.bruker)
  );
end;
$$;

revoke all on function public.profilkortdetaljer(uuid) from public, anon, authenticated, service_role;
grant execute on function public.profilkortdetaljer(uuid) to authenticated;

comment on function public.profilkortdetaljer(uuid) is
  'Profilkortet ved hovering: stillingen, fagmiljøene og om det kan sendes direktemeldinger, for en profil den innloggede ser gjennom fagmiljøene, gruppene eller direktesamtalene (alle for en systemarkitekt); ellers null. Se docs/fagmiljoer.md.';
