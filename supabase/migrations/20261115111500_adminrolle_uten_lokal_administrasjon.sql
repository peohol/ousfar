-- Den gamle adminrollen og den lokale administrasjonen blir to uavhengige
-- ting (docs/fagmiljoer.md, «Myndighet over kontoer»).
--
-- Før gjorde `kontooperasjon_sett_rolle` mer enn å sette rollen: den som fikk
-- rollen, ble også lokal administrator i sitt primære fagmiljø, og den som
-- mistet den, sluttet som lokal administrator overalt. I brukerlista ga det
-- to knapper som delvis gjorde det samme («Gjør til administrator» og «Gi
-- adminrollen»), og en rolleendring kunne i det stille ta fra noen
-- administrasjonen av et fagmiljø.
--
-- Nå setter operasjonen bare rollen. Lokale administratorer utpekes og
-- fjernes bare med `public.sett_fagmiljoadministrator` (P3), som har egne
-- kontroller og bekreftelse i appen. Rollen gir i dag ingen myndighet over
-- andre (P1.2a–P2d): den viser verktøyene som ennå er under utprøving
-- (`src/verktoy/synlighet.ts`), regnes som nivå 2 i `intern.myndighetsniva`
-- og merker kontoene kurateringene føres på.
--
-- Kontrollene ellers står: bare en systemarkitekt kan gi eller ta rollen,
-- ingen kan endre sin egen eller en annen systemarkitekts, en konto med
-- midlertidig passord får den ikke, og den siste med rollen kan ikke miste
-- den. Kontrollen «den eneste administratoren i et aktivt fagmiljø» gjaldt
-- bare fordi rollen tok med seg den lokale administrasjonen, og faller bort.
--
-- Ingen data endres. Tilbakeføring: definisjonen i
-- 20261113203000_kontomyndighet.sql.

create or replace function public.kontooperasjon_sett_rolle(aktor uuid, mal uuid, rolle public.brukerrolle)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  profil public.profiles;
begin
  perform intern.las_tilgang(aktor, 'sett-rolle: ' || rolle::text);
  perform intern.krev_myndighet_over(aktor, mal, 'rolle');

  select * into profil from public.profiles p where p.id = mal for update;

  if rolle = 'admin' then
    -- Et midlertidig passord kan være kjent av den som laget det. Kontoen
    -- skal ikke få mer enn den har, før eieren har valgt sitt eget.
    if profil.role <> 'admin' and (profil.must_change_password or not profil.onboarding_completed) then
      raise exception 'Brukeren må ha logget inn og valgt sitt eget passord først.'
        using errcode = '55000';
    end if;
  elsif profil.role = 'admin' and not exists (
    select 1 from public.profiles p where p.role = 'admin' and p.id <> mal
  ) then
    raise exception 'Den siste med adminrollen kan ikke miste den.' using errcode = '23514';
  end if;

  update public.profiles p set role = rolle where p.id = mal returning * into profil;
  return profil;
end;
$$;

-- `create or replace` beholder rettighetene, men de settes på nytt så fila
-- står for seg selv: bare serveren, med den hemmelige nøkkelen, kan kalle den.
revoke all on function public.kontooperasjon_sett_rolle(uuid, uuid, public.brukerrolle) from public, anon, authenticated;
grant execute on function public.kontooperasjon_sett_rolle(uuid, uuid, public.brukerrolle) to service_role;
