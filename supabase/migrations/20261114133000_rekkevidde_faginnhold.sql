-- P2a: faginnholdet og fortolkningsressursene etter rekkevidden.
--
-- Hvert objekt har en rekkevidde i `ressursomfang` (P4a): felles, eller
-- lokal for ett fagmiljø. Her tas den i bruk, etter rettighetsmatrisen i
-- P0-rapporten §5.2:
--
--   * Felles publisert innhold (fagsidene, kortene og referansene) leses av
--     alle med et aktivt medlemskap, som før.
--   * Lokalt innhold (laboratorieanalyttene, regelsettene og kommentarene
--     fortolkningen bruker) leses bare av medlemmene i fagmiljøet det hører
--     til, og av systemarkitektene.
--   * Utkast leses, og alt endres, bare av den som har endringsrett til
--     objektet: en lokal administrator i fagmiljøet det hører til, eller en
--     systemarkitekt. Felles innhold endres bare av systemarkitektene, til
--     felles redaktører finnes (P5). Den gamle adminrollen kreves ikke for
--     faginnholdet og gir ingenting alene (`krev_admin()` og `er_admin()`
--     står urørt for resten av appen).
--
-- Utformingen står i docs/fagmiljoer.md, «Faginnholdet etter rekkevidden».
-- Hjelperne er de felles fra 20261114113500_rettighetshjelpere.sql.
-- Kliniske regler, verdier og tekster endres ikke; ingen data endres.
--
-- Tilbakeføring: en ny migrasjon som fjerner reglene `rekkevidde`, setter
-- de tillatende reglene i faginnholdet tilbake til `er_admin()`, fjerner
-- regelen på `ressursomfang` og rettigheten nettleseren fikk der, og setter `intern.laas_utkast`,
-- `intern.opprett_objekt_som` og `public.les_endringslogg` tilbake til
-- definisjonene før denne (de står i migrasjonene før).

-- --- Rettighetene per objekt ------------------------------------------------

-- Om brukeren kan lese objektet etter rekkevidden. Nei når objektet ikke har
-- noen rekkevidde, eller ikke finnes.
create function intern.kan_lese_objekt(objekt uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ressursomfang r
    where r.objekt_id = kan_lese_objekt.objekt
      and intern.kan_lese_omfang(r.omfang, r.fagmiljo_id, kan_lese_objekt.bruker)
  )
$$;

revoke all on function intern.kan_lese_objekt(uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.kan_lese_objekt(uuid, uuid) is
  'P2a: om brukeren kan lese objektet etter rekkevidden. Se docs/fagmiljoer.md.';

-- Om brukeren har endringsrett til noe med rekkevidden: lokal administrator i
-- fagmiljøet (eller systemarkitekt) for lokalt innhold, systemarkitekt for
-- felles innhold og grupper. Alt annet gir nei.
create function intern.kan_endre_omfang(omfang text, fagmiljo uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select kan_endre_omfang.bruker is not null and coalesce(
    case kan_endre_omfang.omfang
      when 'fagmiljo' then intern.er_lokal_admin_i(kan_endre_omfang.fagmiljo, kan_endre_omfang.bruker)
      when 'felles' then intern.er_systemarkitekt(kan_endre_omfang.bruker)
      when 'gruppe' then intern.er_systemarkitekt(kan_endre_omfang.bruker)
      else false
    end,
    false
  )
$$;

revoke all on function intern.kan_endre_omfang(text, uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.kan_endre_omfang(text, uuid, uuid) is
  'P2a: endringsrett etter rekkevidden: lokal administrator for lokalt innhold, systemarkitekt for felles. Se docs/fagmiljoer.md.';

create function intern.kan_endre_objekt(objekt uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.ressursomfang r
    where r.objekt_id = kan_endre_objekt.objekt
      and intern.kan_endre_omfang(r.omfang, r.fagmiljo_id, kan_endre_objekt.bruker)
  )
$$;

revoke all on function intern.kan_endre_objekt(uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.kan_endre_objekt(uuid, uuid) is
  'P2a: om brukeren har endringsrett til objektet etter rekkevidden. Se docs/fagmiljoer.md.';

-- Stopper en innlogget uten endringsrett. Et objekt den innloggede ikke kan
-- lese, gir samme svar som et som ikke finnes (PT404, som `laas_utkast`), så
-- et annet fagmiljøs objekter ikke kan prøves frem. Et objekt som kan leses,
-- men ikke endres, gir 42501. Et nytt objekt (`ny`) gir alltid 42501.
-- Serverprosessene (migrasjonene, kurateringsagentene og jobbene, uten en
-- innlogget bruker) berøres ikke; de kommer hit bare gjennom serveren.
create function intern.krev_endringsrett(objekt uuid, ny boolean default false)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  bruker uuid := (select auth.uid());
begin
  if bruker is null or intern.kan_endre_objekt(krev_endringsrett.objekt, bruker) then
    return;
  end if;
  if not krev_endringsrett.ny and not intern.kan_lese_objekt(krev_endringsrett.objekt, bruker) then
    raise exception 'Fant ikke objektet.' using errcode = 'PT404';
  end if;
  raise exception 'Du har ikke rettighet til å endre dette. Felles innhold endres av systemarkitektene, lokalt innhold av administratorene i fagmiljøet det hører til.'
    using errcode = '42501';
end;
$$;

revoke all on function intern.krev_endringsrett(uuid, boolean) from public, anon, authenticated, service_role;

comment on function intern.krev_endringsrett(uuid, boolean) is
  'P2a: stopper en innlogget uten endringsrett til objektet (PT404 når det ikke kan leses, ellers 42501). Se docs/fagmiljoer.md.';

-- Om brukeren har endringsrett til noe i faginnholdet: systemarkitekt, eller
-- lokal administrator i et aktivt fagmiljø. Den gamle adminrollen teller ikke.
create function intern.har_endringsrett_noe(bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select har_endringsrett_noe.bruker is not null and (
    intern.er_systemarkitekt(har_endringsrett_noe.bruker)
    or exists (select 1 from intern.administrerte_fagmiljoer(har_endringsrett_noe.bruker))
  )
$$;

revoke all on function intern.har_endringsrett_noe(uuid) from public, anon, authenticated, service_role;

comment on function intern.har_endringsrett_noe(uuid) is
  'P2a: systemarkitekt eller lokal administrator i et fagmiljø; den gamle adminrollen teller ikke. Se docs/fagmiljoer.md.';

-- Porten til endringene i faginnholdet, i stedet for `intern.krev_admin()`
-- (som står urørt for resten av appen): et aktivt medlemskap og endringsrett
-- til noe. Endringsretten til objektet kontrolleres i tillegg, i
-- `intern.laas_utkast` og `intern.opprett_objekt_som`. Gir profilen, som
-- skrives som forfatter, slik `krev_admin()` gjorde.
create function intern.krev_redaktor()
returns public.profiles
language plpgsql
stable
set search_path = ''
as $$
declare
  innlogget public.profiles;
begin
  perform intern.krev_aktivt_medlemskap();
  select p.* into innlogget
  from public.profiles p
  where p.id = (select auth.uid()) and intern.har_endringsrett_noe(p.id);
  if not found then
    raise exception 'Bare systemarkitektene og administratorene i fagmiljøene kan endre faginnholdet.' using errcode = '42501';
  end if;
  return innlogget;
end;
$$;

revoke all on function intern.krev_redaktor() from public, anon, authenticated, service_role;

comment on function intern.krev_redaktor() is
  'P2a: krever aktivt medlemskap og endringsrett til noe i faginnholdet; gir profilen. Se docs/fagmiljoer.md.';

-- --- Skriveveien ------------------------------------------------------------

-- All lagring, publisering, gjenoppretting og sletting av et objekt låser
-- utkastet gjennom `intern.laas_utkast` (også publiseringen fra en
-- kurateringsgren). Endringsretten kontrolleres der, først, slik at et
-- fremmed objekt heller ikke gir en konflikt (PT409) som røper at det finnes.
-- Ellers uendret.
create or replace function intern.laas_utkast(p_objekt uuid, p_forventet_revisjon integer)
returns public.objektrevisjoner
language plpgsql
set search_path = ''
as $$
declare
  gjeldende integer;
  revisjonen public.objektrevisjoner;
begin
  perform intern.krev_endringsrett(p_objekt);

  if p_forventet_revisjon is null then
    raise exception 'Revisjonen som ble åpnet, mangler.' using errcode = '22023';
  end if;

  select t.revisjon into gjeldende
  from public.objekttilstander t
  where t.objekt_id = p_objekt and t.tilstand = 'utkast'
  for update;
  if not found then
    raise exception 'Fant ikke objektet.' using errcode = 'PT404';
  end if;

  if gjeldende <> p_forventet_revisjon then
    raise exception 'Innholdet er endret av noen andre siden det ble åpnet.'
      using
        errcode = 'PT409',
        detail = jsonb_build_object(
          'gjeldende_revisjon', gjeldende,
          'forventet_revisjon', p_forventet_revisjon
        )::text;
  end if;

  select r.* into strict revisjonen
  from public.objektrevisjoner r
  where r.objekt_id = p_objekt and r.revisjon = gjeldende;
  return revisjonen;
end;
$$;

-- Et nytt objekt får rekkevidden etter regelen i det øyeblikket det
-- registreres (utløseren fra P4a). Den innloggede må ha endringsrett til
-- det, ellers rulles opprettelsen tilbake: en lokal administrator i B kan
-- ikke lage et objekt som etter regelen hører til A. Ellers uendret.
create or replace function intern.opprett_objekt_som(p_type public.objekttype, p_objekt uuid, p_innhold jsonb, p_forfatter public.profiles)
returns public.objektstatus
language plpgsql
set search_path = ''
as $$
begin
  if p_type is null then
    raise exception 'Objekttypen mangler.' using errcode = '22023';
  end if;
  if p_objekt is null then
    raise exception 'ID-en til det nye objektet mangler.' using errcode = '22023';
  end if;
  if exists (select 1 from public.redigerbare_objekter o where o.id = p_objekt) then
    raise exception 'Det finnes alt et objekt med ID-en %.', p_objekt using errcode = '22023';
  end if;

  insert into public.redigerbare_objekter (id, type)
  values (p_objekt, p_type);

  perform intern.krev_endringsrett(p_objekt, true);

  -- Utkastet må finnes før innholdet kan legges inn i det. Koblingen til
  -- revisjonen kontrolleres først når transaksjonen er ferdig.
  insert into public.objekttilstander (objekt_id, tilstand, revisjon)
  values (p_objekt, 'utkast', 1);

  perform intern.ny_revisjon(
    p_objekt,
    'opprettet',
    intern.skriv(p_type, p_objekt, 'utkast', p_innhold),
    p_forfatter
  );
  return intern.status(p_objekt);
end;
$$;

-- Endringene i faginnholdet krever endringsrett, ikke den gamle adminrollen:
-- `intern.krev_redaktor()` i stedet for `intern.krev_admin()`, og
-- endringsretten til objektet i `intern.laas_utkast` og
-- `intern.opprett_objekt_som` som over. En systemarkitekt eller lokal
-- administrator uten den gamle rollen kan dermed endre det de har rett til,
-- og en med bare den gamle rollen ingenting. Ellers uendret.

create or replace function intern.opprett_objekt(p_type public.objekttype, p_objekt uuid, p_innhold jsonb)
returns public.objektstatus
language plpgsql
set search_path = ''
as $$
declare
  forfatter public.profiles := intern.krev_redaktor();
begin
  return intern.opprett_objekt_som(p_type, p_objekt, p_innhold, forfatter);
end;
$$;

create or replace function public.lagre_utkast(objekt uuid, forventet_revisjon integer, innhold jsonb)
returns public.objektstatus
language plpgsql
security definer
set search_path = ''
as $$
declare
  forfatter public.profiles := intern.krev_redaktor();
begin
  return intern.lagre_objekt(lagre_utkast.objekt, lagre_utkast.forventet_revisjon, lagre_utkast.innhold, forfatter);
end;
$$;

comment on function public.lagre_utkast(uuid, integer, jsonb) is
  'Lagrer utkastet som en ny revisjon. Avvises med PT409 hvis forventet_revisjon ikke lenger er den gjeldende. Krever endringsrett.';

create or replace function public.publiser_utkast(objekt uuid, forventet_revisjon integer)
returns public.objektstatus
language plpgsql
security definer
set search_path = ''
as $$
declare
  forfatter public.profiles := intern.krev_redaktor();
begin
  return intern.publiser_objekt(publiser_utkast.objekt, publiser_utkast.forventet_revisjon, forfatter);
end;
$$;

comment on function public.publiser_utkast(uuid, integer) is
  'Publiserer den gjeldende revisjonen av utkastet. Avvises med PT409 hvis forventet_revisjon ikke lenger er den gjeldende. Krever endringsrett.';

create or replace function public.gjenopprett_revisjon(objekt uuid, forventet_revisjon integer, fra_revisjon integer)
returns public.objektstatus
language plpgsql
security definer
set search_path = ''
as $$
declare
  forfatter public.profiles := intern.krev_redaktor();
  gjeldende public.objektrevisjoner := intern.laas_utkast(objekt, forventet_revisjon);
  kilde jsonb;
begin
  if fra_revisjon is null or fra_revisjon >= gjeldende.revisjon then
    raise exception 'Bare en tidligere revisjon kan gjenopprettes.' using errcode = '22023';
  end if;

  select r.innhold into kilde
  from public.objektrevisjoner r
  where r.objekt_id = objekt and r.revisjon = fra_revisjon;
  if not found then
    raise exception 'Fant ikke revisjon %.', fra_revisjon using errcode = '22023';
  end if;

  perform intern.ny_revisjon(
    objekt,
    'gjenopprettet',
    intern.skriv(
      (select o.type from public.redigerbare_objekter o where o.id = objekt),
      objekt,
      'utkast',
      kilde
    ),
    forfatter,
    fra_revisjon
  );
  return intern.status(objekt);
end;
$$;

comment on function public.gjenopprett_revisjon(uuid, integer, integer) is
  'Lager en ny revisjon med innholdet fra en tidligere. Senere revisjoner blir stående. Krever endringsrett.';

create or replace function public.slett_referanse(objekt uuid, forventet_revisjon integer)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  forfatter public.profiles := intern.krev_redaktor();
  gjeldende public.objektrevisjoner := intern.laas_utkast(objekt, forventet_revisjon);
begin
  -- Låsen holder unna en samtidig lagring som ville sitert referansen:
  -- koblingen dit venter på den, og avvises når referansen er borte. Objektet
  -- låses før referanseraden, i samme rekkefølge som krev_gyldig_kobling.
  perform 1 from public.redigerbare_objekter o where o.id = objekt for update;

  if (select o.type from public.redigerbare_objekter o where o.id = objekt) <> 'referanse' then
    raise exception 'Bare referanser kan slettes.' using errcode = '22023';
  end if;

  if exists (select 1 from public.objektpubliseringer p where p.objekt_id = objekt) then
    raise exception 'Referansen har vært publisert og kan ikke slettes. Arkiver den i stedet.'
      using errcode = '22023';
  end if;

  -- I bruk er også det som bare står i en eldre revisjon av noe: den skal
  -- fortsatt kunne gjenopprettes.
  if exists (select 1 from public.referansekoblinger k where k.referanse_id = objekt)
    or exists (
      select 1 from public.objektrevisjoner r
      where r.objekt_id <> objekt and strpos(lower(r.innhold::text), objekt::text) > 0
    )
  then
    raise exception 'Referansen er i bruk, nå eller i historikken, og kan ikke slettes. Arkiver den i stedet.'
      using errcode = '22023';
  end if;

  insert into public.slettede_referanser (
    objekt_id, innhold, revisjon, slettet_av, slettet_av_fornavn, slettet_av_etternavn
  )
  values (
    objekt, gjeldende.innhold, gjeldende.revisjon,
    forfatter.id, forfatter.first_name, forfatter.last_name
  );

  perform set_config('intern.sletter_referanse', objekt::text, true);
  delete from public.objekttilstander t where t.objekt_id = objekt;
  delete from public.objektrevisjoner r where r.objekt_id = objekt;
  delete from public.redigerbare_objekter o where o.id = objekt;
  perform set_config('intern.sletter_referanse', '', true);

  return objekt;
end;
$$;

comment on function public.slett_referanse(uuid, integer) is
  'Sletter en referanse som aldri har vært publisert eller sitert. Alt annet må arkiveres. Krever endringsrett.';

create or replace function public.valider_scenarioregelsett(innhold jsonb)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_redaktor();
  perform intern.krev_scenarioform(innhold);
  return array(select intern.scenariofeil(innhold));
end;
$$;

comment on function public.valider_scenarioregelsett(jsonb) is
  'Gir feilene i et scenarioregelsett uten å lagre det. Krever endringsrett.';

-- Regelsettene lagres sammen med kommentarene sine. Endringsretten til
-- regelsettet kontrolleres før kommentarene, så et fremmed regelsett gir det
-- samme svaret som et som ikke finnes (PT404), også når kommentarlista ikke
-- er tom. Ellers uendret; de tre funksjonene er like bortsett fra typen.
create or replace function public.lagre_intervallregelsett(objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)
returns public.objektstatus
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_redaktor();
  if (select o.type from public.redigerbare_objekter o where o.id = objekt) is distinct from 'intervallregelsett' then
    raise exception 'Fant ikke regelsettet.' using errcode = 'PT404';
  end if;
  perform intern.krev_endringsrett(objekt);
  perform intern.lagre_kommentarendringer(kommentarer);
  return public.lagre_utkast(objekt, forventet_revisjon, innhold);
end;
$$;

create or replace function public.lagre_scenarioregelsett(objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)
returns public.objektstatus
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_redaktor();
  if (select o.type from public.redigerbare_objekter o where o.id = objekt) is distinct from 'scenarioregelsett' then
    raise exception 'Fant ikke regelsettet.' using errcode = 'PT404';
  end if;
  perform intern.krev_endringsrett(objekt);
  perform intern.lagre_kommentarendringer(kommentarer);
  return public.lagre_utkast(objekt, forventet_revisjon, innhold);
end;
$$;

create or replace function public.lagre_thc_regelsett(objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)
returns public.objektstatus
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_redaktor();
  if (select o.type from public.redigerbare_objekter o where o.id = objekt) is distinct from 'thc_regelsett' then
    raise exception 'Fant ikke regelsettet.' using errcode = 'PT404';
  end if;
  perform intern.krev_endringsrett(objekt);
  perform intern.lagre_kommentarendringer(kommentarer);
  return public.lagre_utkast(objekt, forventet_revisjon, innhold);
end;
$$;

-- --- Rekkevidden for nettleseren --------------------------------------------

-- Nettleseren leser rekkevidden til det den innloggede kan lese, slik at
-- radsikkerhetsreglene under kan slå den opp per rad (én oppslag på
-- primærnøkkelen). Ingen kan skrive her fra nettleseren. Grupper finnes ikke
-- ennå (`ressursomfang_ingen_grupper_ennaa`); P6 utvider regelen.
grant select on table public.ressursomfang to authenticated;

create policy "Innloggede ser rekkevidden til det de kan lese"
on public.ressursomfang for select to authenticated
using (omfang = 'felles' or fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[]));

create policy aktivt_medlemskap on public.ressursomfang as restrictive for all to authenticated
using ((select public.har_aktivt_medlemskap()))
with check ((select public.har_aktivt_medlemskap()));

-- --- Radsikkerheten i faginnholdet ----------------------------------------

-- Om den innloggede kan lese alt lokalt innhold som finnes: hvert fagmiljø
-- som har lokalt innhold, er blant dem den innloggede kan lese. Da trenger
-- reglene under ikke slå opp rekkevidden rad for rad (én gang per spørring,
-- og ett oppslag per fagmiljø). Svarer bare om den innloggede, og bare ja
-- eller nei.
create function public.leser_alt_lokale_innhold()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.har_aktivt_medlemskap(auth.uid()) and not exists (
    select 1 from public.fagmiljoer f
    where exists (select 1 from public.ressursomfang r where r.fagmiljo_id = f.id)
      and not intern.er_medlem_i(f.id, auth.uid())
  )
$$;

revoke all on function public.leser_alt_lokale_innhold() from public, anon, authenticated, service_role;
grant execute on function public.leser_alt_lokale_innhold() to authenticated;

comment on function public.leser_alt_lokale_innhold() is
  'P2a: om den innloggede kan lese alt lokalt innhold som finnes (hvert fagmiljø med lokalt innhold er lesbart). Snarvei for radsikkerhetsreglene. Se docs/fagmiljoer.md.';

-- Om den innloggede har endringsrett til noe av det lokale innholdet som
-- finnes, i fagmiljøet det hører til. Appen viser redigeringen av
-- fortolkningen etter den: å administrere et fagmiljø uten lokalt innhold gir
-- den ikke. Ett oppslag per rekkevidde, ikke per objekt. Svarer bare om den
-- innloggede, og bare ja eller nei; databasen kontrollerer hver endring.
create function public.kan_endre_lokalt_innhold()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.har_aktivt_medlemskap(auth.uid()) and exists (
    select 1
    from (select distinct r.omfang, r.fagmiljo_id from public.ressursomfang r where r.omfang <> 'felles') e
    where intern.kan_endre_omfang(e.omfang, e.fagmiljo_id, auth.uid())
  )
$$;

revoke all on function public.kan_endre_lokalt_innhold() from public, anon, authenticated, service_role;
grant execute on function public.kan_endre_lokalt_innhold() to authenticated;

comment on function public.kan_endre_lokalt_innhold() is
  'P2a: om den innloggede har endringsrett til noe lokalt innhold, i fagmiljøet det hører til. Styrer bare hva appen viser. Se docs/fagmiljoer.md.';

-- Om den innloggede kan se noen utkast: aktivt medlemskap og endringsrett
-- til noe (systemarkitekt eller lokal administrator), med eller uten den
-- gamle adminrollen. Til de tillatende reglene, som én verdi per spørring.
create function public.kan_se_utkast()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.har_aktivt_medlemskap(auth.uid()) and intern.har_endringsrett_noe(auth.uid())
$$;

revoke all on function public.kan_se_utkast() from public, anon, authenticated, service_role;
grant execute on function public.kan_se_utkast() to authenticated;

comment on function public.kan_se_utkast() is
  'P2a: om den innloggede har endringsrett til noe i faginnholdet, og dermed kan se utkast den har endringsrett til. Se docs/fagmiljoer.md.';

-- To regler per tabell:
--
--   `rekkevidde` (begrensende): raden hører til et objekt den innloggede kan
--   lese. Et objekt uten rekkevidde gir ingenting (alle objekter har en, P4a).
--
--   De tillatende reglene slapp utkastene (og revisjoner som aldri er
--   publisert) gjennom for den gamle adminrollen (`er_admin()`). Nå slipper de
--   et utkast gjennom bare for den som har endringsrett til objektet: den
--   delen av regelen blir `(kan_se_utkast() and <endringsrett til objektet>)`.
--   Kravet står i den tillatende regelen og ikke i en egen begrensende, så
--   planleggeren ser det samme som før for dem uten endringsrett (se
--   «Ytelse» i docs/fagmiljoer.md).
--
-- Tabellene og kolonnen som peker på objektet. Lista er alle tabellene
-- ressurskatalogen (src/__tests__/data/ressurskatalog.ts) har som del av et
-- objekt; testene krever at de stemmer overens.
do $$
declare
  t record;
  p record;
  ny text;
  -- Raden hører til et objekt den innloggede kan lese.
  -- Kan den innloggede lese alt lokalt innhold, slås ingenting opp per rad.
  lesbar constant text :=
    '(select public.leser_alt_lokale_innhold()) or exists (select 1 from public.ressursomfang r where r.objekt_id = %1$s '
    'and (r.omfang = ''felles'' or r.fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[])))';
  -- Utkastet slipper gjennom for den som har endringsrett til noe og til
  -- objektet raden hører til: alt for en systemarkitekt, ellers lokalt
  -- innhold i et fagmiljø den administrerer. Uten endringsrett til noe er
  -- `kan_se_utkast()` usann, og ingenting slås opp per rad.
  utkast constant text :=
    '((select public.kan_se_utkast()) and ((select public.er_systemarkitekt()) or exists (select 1 from public.ressursomfang r '
    'where r.objekt_id = %1$s and r.fagmiljo_id = any ((select public.mine_administrerte_fagmiljoer())::uuid[]))))';
  antall int := 0;
  omskrevet int;
begin
  for t in
    select * from (values
      -- tabell, kolonnen som peker på objektet, om tabellen har utkast
      ('redigerbare_objekter', 'redigerbare_objekter.id', true),
      ('objekttilstander', 'objekttilstander.objekt_id', true),
      ('objektrevisjoner', 'objektrevisjoner.objekt_id', true),
      ('objektpubliseringer', 'objektpubliseringer.objekt_id', false),
      ('infosider', 'infosider.objekt_id', true),
      ('innholdselementer', 'innholdselementer.objekt_id', true),
      ('referanser', 'referanser.objekt_id', true),
      ('referansekoblinger', 'referansekoblinger.objekt_id', true),
      ('laboratorieanalytter', 'laboratorieanalytter.objekt_id', true),
      ('analyttkomponenter', 'analyttkomponenter.analytt_id', true),
      ('intervallregelsett', 'intervallregelsett.objekt_id', true),
      ('intervallregler', 'intervallregler.regelsett_id', true),
      ('kommentarer', 'kommentarer.objekt_id', true),
      ('scenarioregelsett', 'scenarioregelsett.objekt_id', true),
      ('scenarier', 'scenarier.objekt_id', true),
      ('scenarioanalytter', 'scenarioanalytter.objekt_id', true),
      ('scenarioforhold', 'scenarioforhold.objekt_id', true),
      ('scenarioforholdsledd', 'scenarioforholdsledd.objekt_id', true),
      ('scenarioparametere', 'scenarioparametere.objekt_id', true),
      ('scenariopavist', 'scenariopavist.objekt_id', true),
      ('scenarioplasseringer', 'scenarioplasseringer.objekt_id', true),
      ('scenarioplasseringskoder', 'scenarioplasseringskoder.objekt_id', true),
      ('scenariotekster', 'scenariotekster.objekt_id', true),
      ('scenariovilkar', 'scenariovilkar.objekt_id', true),
      ('thc_regelsett', 'thc_regelsett.objekt_id', true),
      ('thc_bruksmonstre', 'thc_bruksmonstre.objekt_id', true),
      ('thc_konsentrasjonsnivaer', 'thc_konsentrasjonsnivaer.objekt_id', true),
      ('thc_kurver', 'thc_kurver.objekt_id', true),
      ('thc_sikkerhetsmarginer', 'thc_sikkerhetsmarginer.objekt_id', true),
      ('thc_tekstbolker', 'thc_tekstbolker.objekt_id', true)
    ) as v(tabell, kolonne, utkast)
  loop
    execute format(
      'create policy rekkevidde on public.%I as restrictive for select to authenticated using (%s)',
      t.tabell, format(lesbar, t.kolonne)
    );
    omskrevet := 0;
    for p in
      select policyname, qual from pg_policies
      where schemaname = 'public' and tablename = t.tabell and permissive = 'PERMISSIVE' and cmd = 'SELECT' and qual ~ 'er_admin'
    loop
      ny := regexp_replace(p.qual, '\(\s*SELECT\s+(public\.)?er_admin\(\)\s+AS\s+er_admin\)', format(utkast, t.kolonne), 'g');
      if ny ~ 'er_admin' then
        raise exception 'Regelen % på % ble ikke skrevet om: %', p.policyname, t.tabell, ny;
      end if;
      execute format('alter policy %I on public.%I using (%s)', p.policyname, t.tabell, ny);
      omskrevet := omskrevet + 1;
    end loop;
    if (omskrevet > 0) <> t.utkast then
      raise exception 'Fant % tillatende regler med den gamle adminrollen på %.', omskrevet, t.tabell;
    end if;
    antall := antall + 1;
  end loop;
  raise notice 'P2a: rekkevidde på % tabeller i faginnholdet.', antall;
end;
$$;

-- Endringene i faginnholdet (`innholdsendringer`) kan gjelde lokale objekter
-- og sier hva som ble gjort. Nettleseren leser dem bare gjennom
-- endringsloggen (`les_endringslogg`, under), som viser det den innloggede
-- kan lese; selve tabellen bare for systemarkitektene.
create policy rekkevidde on public.innholdsendringer as restrictive for select to authenticated
using ((select public.er_systemarkitekt()));

-- Det som før var for den gamle adminrollen i fagsidenes logg, ser også en
-- systemarkitekt uten den: endringene, hendelsene og de slettede
-- referansene (referansene er felles).
create policy "Systemarkitektene ser endringene" on public.innholdsendringer for select to authenticated
using ((select public.er_systemarkitekt()));
create policy "Systemarkitektene ser hendelsene" on public.innholdshendelser for select to authenticated
using ((select public.er_systemarkitekt()));
create policy "Systemarkitektene ser slettede referanser" on public.slettede_referanser for select to authenticated
using ((select public.er_systemarkitekt()));

-- Hendelsene (stoffregisteret og bivirkningsimportene) gjelder fagsidene, som
-- er felles; en hendelse på et objekt den innloggede ikke kan lese, vises ikke.
create policy rekkevidde on public.innholdshendelser as restrictive for select to authenticated
using (side is null or (select public.leser_alt_lokale_innhold()) or exists (
  select 1 from public.ressursomfang r
  where r.objekt_id = innholdshendelser.side
    and (r.omfang = 'felles' or r.fagmiljo_id = any ((select public.mine_lesbare_fagmiljoer())::uuid[]))
));

-- Stoffene fortolkningen lenker til (lokalt, P0 §3). Tabellen har bare
-- stoffet, og koblingene er laboratorieanalyttene i fagmiljøet dagens
-- fortolkning hører til (D1, `intern.opprinnelig_fagmiljo()`). Til P4b gir
-- koblingene fagmiljøet sitt, leses de bare av medlemmene der og
-- systemarkitektene, ikke av den som bare kan lese et annet fagmiljøs
-- analytter.
create function public.leser_analyttkoblingene()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.har_aktivt_medlemskap(auth.uid()) and intern.er_medlem_i(intern.opprinnelig_fagmiljo(), auth.uid())
$$;

revoke all on function public.leser_analyttkoblingene() from public, anon, authenticated, service_role;
grant execute on function public.leser_analyttkoblingene() to authenticated;

comment on function public.leser_analyttkoblingene() is
  'P2a: om den innloggede kan lese stoffkoblingene til fortolkningens analytter (medlem i fagmiljøet fortolkningen hører til, eller systemarkitekt). Til P4b. Se docs/fagmiljoer.md.';

create policy rekkevidde on public.analyttkoblede_stoffer as restrictive for select to authenticated
using ((select public.leser_analyttkoblingene()));

-- --- Endringsloggen ---------------------------------------------------------

-- Som før, men bare med objektene den innloggede kan lese, og utkastene bare
-- når den innloggede har endringsrett til alle sidens objekter. Ellers uendret.
CREATE OR REPLACE FUNCTION public.les_endringslogg(side jsonb, med_utkast boolean DEFAULT false, med_rutiner boolean DEFAULT false, etter jsonb DEFAULT NULL::jsonb, antall integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  -- P2a: utkastene for den som har endringsrett, ikke den gamle adminrollen.
  admin boolean := intern.har_endringsrett_noe((select auth.uid()));
  utkast boolean := admin and coalesce(les_endringslogg.med_utkast, false);
  register boolean := (les_endringslogg.side ->> 'stoffregister')::boolean is true;
  rotter uuid[];
  grense integer := least(greatest(coalesce(les_endringslogg.antall, 30), 1), 100);
  etter_kl timestamptz := (les_endringslogg.etter ->> 'kl')::timestamptz;
  etter_id text := coalesce(les_endringslogg.etter ->> 'id', '');
  resultat jsonb;
begin
  perform intern.krev_aktivt_medlemskap();
  if (select auth.uid()) is null then
    raise exception 'Logg inn for å lese endringsloggen.' using errcode = '42501';
  end if;
  if les_endringslogg.side is null or jsonb_typeof(les_endringslogg.side) <> 'object' then
    raise exception 'Siden mangler.' using errcode = '22023';
  end if;

  rotter := array(select intern.endringsrotter(les_endringslogg.side, admin));

  -- P2a: bare det den innloggede kan lese, og utkastene bare med endringsrett.
  rotter := array(
    select r from unnest(rotter) r
    where intern.kan_lese_objekt(r)
      and (intern.kan_endre_objekt(r) or exists (
        select 1 from public.objekttilstander t where t.objekt_id = r and t.tilstand = 'publisert'
      ))
  );
  utkast := utkast and not exists (select 1 from unnest(rotter) r where not intern.kan_endre_objekt(r));

  -- Revisjonene og publiseringene som angikk siden da de ble gjort
  -- (`intern.sidens_utgaver`).
  with utgaver as materialized (
    select * from intern.sidens_utgaver(rotter, utkast, register) u
    where intern.kan_lese_objekt(u.objekt_id)
  ), medlemmer as (
    select coalesce(r.endring_id::text, 'eldre:' || r.utfort_kl::text || ':' || r.utfort_av::text) as nokkel,
      r.objekt_id, r.revisjon, null::integer as forrige, false as publisering,
      r.utfort_kl, r.utfort_av, r.utfort_av_fornavn, r.utfort_av_etternavn, r.kilde, u.delt
    from utgaver u
    join public.objektrevisjoner r on r.objekt_id = u.objekt_id and r.revisjon = u.revisjon
    where u.publisering is null
    union all
    select coalesce(p.endring_id::text, 'eldre:' || p.utfort_kl::text || ':' || p.utfort_av::text),
      p.objekt_id, p.revisjon, p.forrige_revisjon, true,
      p.utfort_kl, p.utfort_av, p.utfort_av_fornavn, p.utfort_av_etternavn,
      (select r.kilde from public.objektrevisjoner r where r.objekt_id = p.objekt_id and r.revisjon = p.revisjon), u.delt
    from utgaver u
    join public.objektpubliseringer p on p.id = u.publisering
  ), samlet as (
    select m.nokkel, m.objekt_id,
      bool_or(m.publisering) as publisert,
      bool_and(m.delt) as delt,
      case when bool_or(not m.publisering) then nullif(min(m.revisjon) filter (where not m.publisering) - 1, 0)
        else (array_agg(m.forrige order by m.revisjon) filter (where m.publisering))[1] end as fra,
      coalesce(max(m.revisjon) filter (where not m.publisering), max(m.revisjon)) as til,
      min(m.utfort_kl) as kl
    from medlemmer m
    group by m.nokkel, m.objekt_id
  ), deler as (
    select s.nokkel, s.kl, o.type, s.publisert, s.delt,
      intern.endringsdel(s.objekt_id, o.type, s.fra, s.til, s.publisert, f.innhold, t.innhold)
        || case when s.delt then '{"delt": true}'::jsonb else '{}'::jsonb end as del
    from samlet s
    join public.redigerbare_objekter o on o.id = s.objekt_id
    join public.objektrevisjoner t on t.objekt_id = s.objekt_id and t.revisjon = s.til
    left join public.objektrevisjoner f on f.objekt_id = s.objekt_id and f.revisjon = s.fra
    -- Stoffregisteret viser bare at fagsider er opprettet eller har fått nytt navn.
    where not register or (o.type = 'infoside' and (f.innhold is null
      or f.innhold ->> 'navn' is distinct from t.innhold ->> 'navn'))
  ), hendelser as (
    select h.endring_id::text as nokkel, h.utfort_kl as kl, h.id,
      jsonb_build_object('hendelse', h.hendelse, 'kl', h.utfort_kl, 'data', h.data - 'publisert') as hendelse
    from public.innholdshendelser h
    where ((register and h.stoffregister) or (not register and h.side = any (rotter)))
      and (utkast or (h.data ->> 'publisert')::boolean is not false)
  ), eldre as (
    select m.nokkel,
      (array_agg(m.utfort_av))[1] as utfort_av,
      (array_agg(m.utfort_av_fornavn))[1] as fornavn,
      (array_agg(m.utfort_av_etternavn))[1] as etternavn,
      max(m.kilde) as kilde
    from medlemmer m
    where m.nokkel like 'eldre:%'
    group by m.nokkel
  ), nokler as (
    select x.nokkel, min(x.kl) as kl
    from (select d.nokkel, d.kl from deler d union all select h.nokkel, h.kl from hendelser h) x
    group by x.nokkel
  ), endringer as (
    select n.nokkel,
      coalesce(e.opprettet_kl, n.kl) as kl,
      e.id, e.aktor, e.agent, e.art, coalesce(e.utfort_av, l.utfort_av) as utfort_av, e.utfort_av_fornavn, e.utfort_av_etternavn, e.oppsummering, e.rapport,
      e.migrasjon, e.lenker,
      case when e.id is null and l.kilde is not null then 'system' when e.id is null then 'bruker' else e.aktor end as hvem,
      l.fornavn as eldre_fornavn, l.etternavn as eldre_etternavn, l.kilde as eldre_kilde,
      -- Bare endringer i delte referanser og kommentarer: hva endringen ellers
      -- gjaldt (som en kuratering av en annen fagside), hører ikke til siden.
      not exists (select 1 from deler d where d.nokkel = n.nokkel and not d.delt)
        and not exists (select 1 from hendelser h where h.nokkel = n.nokkel) as bare_delt
    from nokler n
    left join public.innholdsendringer e on e.id::text = n.nokkel
    left join eldre l on l.nokkel = n.nokkel
  ), valgte as (
    select * from endringer x
    where (les_endringslogg.med_rutiner or not coalesce(
        (select a.rutine from public.endringsagenter a where a.nokkel = x.agent), false))
      and (etter_kl is null or (x.kl, x.nokkel) < (etter_kl, etter_id))
    order by x.kl desc, x.nokkel desc
    limit grense + 1
  )
  select jsonb_build_object(
    'endringer', coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
      'id', v.nokkel,
      'kl', v.kl,
      'aktor', v.hvem,
      'eldre', v.id is null,
      'art', case when v.bare_delt then 'redigering' else coalesce(v.art, 'redigering') end,
      'delt', case when v.bare_delt then true end,
      'agent', case
        when v.agent is not null then (select jsonb_build_object('nokkel', a.nokkel, 'navn', a.navn, 'art', a.art, 'beskrivelse', a.beskrivelse, 'rutine', a.rutine)
          from public.endringsagenter a where a.nokkel = v.agent)
        when v.id is null and v.eldre_kilde is not null then (select jsonb_build_object('nokkel', a.nokkel, 'navn', a.navn, 'art', a.art, 'beskrivelse', a.beskrivelse, 'rutine', a.rutine)
          from public.endringsagenter a where a.nokkel = 'databasemigrasjon') end,
      -- Profilen og profilbildet: personens, eller agentens egen profil.
      'profil', (select jsonb_build_object('id', p.id, 'username', p.username, 'first_name', p.first_name,
          'last_name', p.last_name, 'avatar_path', p.avatar_path, 'updated_at', p.updated_at)
        from public.profiles p
        where case
          when v.agent is not null then p.username = (select ap.brukernavn from public.agentprofiler ap where ap.agent = v.agent)
          when v.hvem = 'bruker' then p.id = v.utfort_av end),
      'person', case when coalesce(v.utfort_av_fornavn, v.eldre_fornavn) is not null then jsonb_build_object(
        'fornavn', coalesce(v.utfort_av_fornavn, v.eldre_fornavn), 'etternavn', coalesce(v.utfort_av_etternavn, v.eldre_etternavn)) end,
      'oppsummering', case when not v.bare_delt then coalesce(v.oppsummering, v.eldre_kilde) end,
      'rapport', case when not v.bare_delt then v.rapport end,
      'migrasjon', v.migrasjon,
      -- Migrasjonen er kjørt og registrert i databasens migrasjonshistorikk.
      'verifisert', case when v.migrasjon is not null then exists (
        select 1 from supabase_migrations.schema_migrations s where s.version || '_' || s.name || '.sql' = v.migrasjon) end,
      'lenker', case when cardinality(v.lenker) > 0 then to_jsonb(v.lenker) end,
      'deler', (select jsonb_agg(d.del order by d.type, d.del ->> 'objekt') from deler d where d.nokkel = v.nokkel),
      'hendelser', (select jsonb_agg(h.hendelse order by h.id) from hendelser h where h.nokkel = v.nokkel),
      'utkast', not exists (select 1 from deler d where d.nokkel = v.nokkel and d.publisert)
        and not exists (select 1 from hendelser h where h.nokkel = v.nokkel)
    )) order by v.kl desc, v.nokkel desc) filter (where v.rad <= grense), '[]'::jsonb),
    'flere', count(*) > grense
  ) into resultat
  from (select x.*, row_number() over (order by x.kl desc, x.nokkel desc) as rad from valgte x) v;

  return resultat;
end;
$function$
;
