-- Startporten S2 håndheves i databasen, ikke bare i migrasjonskontrollen.
--
-- Et fagmiljø kan bare bli åpent for medlemmer (ved innsetting eller endring,
-- uansett SQL-form) når innstillingen for startporten i samme transaksjon
-- navngir nøyaktig dette fagmiljøet. Innstillingen settes bare i en egen,
-- godkjent åpningsmigrasjon, og migrasjonskontrollen stopper enhver migrasjon
-- som setter den, eller som fjerner eller endrer dette vernet, til den har
-- godkjenningsmerket (docs/fagmiljoer.md, docs/migrasjoner.md).
--
-- Å lukke et fagmiljø, og alle andre endringer, er uendret. Ingen data endres.

create function intern.fagmiljo_startport()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.apent_for_medlemmer
     and (tg_op = 'INSERT' or not old.apent_for_medlemmer)
     and current_setting('ousfar.startport', true) is distinct from new.nokkel then
    raise exception 'Fagmiljøet «%» kan bare åpnes for medlemmer gjennom startporten S2, i en egen godkjent migrasjon.', new.navn
      using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function intern.fagmiljo_startport() from public, anon, authenticated, service_role;

create trigger fagmiljoer_startport
before insert or update on public.fagmiljoer
for each row execute function intern.fagmiljo_startport();
