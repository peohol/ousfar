-- P3: administrasjon av medlemskap, avslutning og sperring i Auth
-- (docs/ousfar-nasjonal-p0-kartlegging.md §5.2 og §6.1, sikkerhetsporten S3
-- i §6.3). Reglene står i docs/fagmiljoer.md, «Medlemskap og kontosperring».
--
-- Her tas avslutning av medlemskap i bruk, nå som hver datainngang krever et
-- aktivt medlemskap (P2.0) og rettighetene følger fagmiljøet (P2a–d):
--
--  * En lokal administrator kan gi og avslutte medlemskap i fagmiljøene
--    vedkommende administrerer, for vanlige brukere. En systemarkitekt kan det
--    i alle fagmiljøer og for alle, og utpeke og fjerne lokale
--    administratorer og opprette nye (lukkede) fagmiljøer.
--  * En konto kan ha flere medlemskap. Avslutning i ett fagmiljø rører ikke de
--    andre; er det primærmedlemskapet, blir det eldste av de andre primært.
--  * Når kontoen ikke lenger har noe aktivt medlemskap, sperres den i Auth i
--    samme transaksjon: innlogging og fornying av økten stoppes, og øktene som
--    finnes, slettes. Et tilgangstoken som alt er utstedt, gjelder til det går
--    ut (inntil en time), men da gir databasen ingenting (P2.0). Får kontoen et
--    aktivt medlemskap igjen, oppheves sperren i samme transaksjon.
--  * Startporten S2 står: ingen andre enn systemarkitektene kan bli medlem av
--    et fagmiljø som ikke er åpent (`intern.kontroller_opptak`), og et nytt
--    fagmiljø opprettes alltid lukket.
--
-- Myndigheten avgjøres av én funksjon (`intern.medlemskapsavslag`), som både
-- operasjonene og visningen i appen bygger på, slik `intern.kontoavslag` gjør
-- for passord og rolle. Operasjonene tar den felles låsen før kontrollen
-- (`intern.las_tilgang`), så samtidige endringer skjer én om gangen, og hver
-- endring føres i tilgangsloggen av databasen selv.
--
-- Ingen data endres utenom at kontoer som alt står uten aktivt medlemskap,
-- sperres (i produksjonen 14.11.2026: ingen). Ingen setninger er destruktive.
--
-- Tilbakeføring: en ny migrasjon som fjerner utløserne `*_kontosperre`,
-- opphever sperrene i `intern.kontosperrer` (`banned_until = null` for dem),
-- fjerner funksjonene herfra og setter `intern.kontroller_tilgangsinvarianter`
-- og `public.mine_rettigheter` tilbake til definisjonene før denne. Regel 1
-- må da ha alle kontoer med et aktivt primærmedlemskap igjen.

-- --- Regel 1: en konto kan stå uten medlemskap ---------------------------------

-- Som i P1.1, med regel 1 endret: en konto med aktive medlemskap har nøyaktig
-- ett av dem som primært, og en konto uten (avsluttet overalt) har ingen.
-- Kontoen sperres da i Auth (under). Resten er uendret.
create or replace function intern.kontroller_tilgangsinvarianter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad jsonb := case tg_op when 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  bruker uuid := (rad ->> 'bruker_id')::uuid;
  fagmiljo uuid := (case tg_table_name when 'fagmiljoer' then rad ->> 'id' else rad ->> 'fagmiljo_id' end)::uuid;
  konto_finnes boolean := bruker is not null and exists (select 1 from public.profiles p where p.id = bruker);
  aktive integer;
  primaere integer;
begin
  if tg_table_name in ('medlemskap', 'fagmiljoadministratorer') and konto_finnes then
    select count(*), count(*) filter (where x.primaer) into aktive, primaere
    from (
      select m.primaer from public.medlemskap m
      where m.bruker_id = bruker and m.status = 'aktiv'
      for share
    ) x;
    if primaere <> least(aktive, 1) then
      raise exception 'En konto med aktive medlemskap må ha nøyaktig ett av dem som primærmedlemskap.'
        using errcode = '23514';
    end if;
    if exists (
      select 1 from public.fagmiljoadministratorer a
      where a.bruker_id = bruker and a.til is null
        and not exists (
          select 1 from public.medlemskap m
          where m.bruker_id = a.bruker_id and m.fagmiljo_id = a.fagmiljo_id and m.status = 'aktiv'
        )
    ) then
      raise exception 'En lokal administrator må ha aktivt medlemskap i fagmiljøet.'
        using errcode = '23514';
    end if;
  end if;

  if (tg_table_name = 'fagmiljoadministratorer'
      or (tg_table_name = 'fagmiljoer'
          and (tg_op = 'INSERT' or (to_jsonb(old) ->> 'status') is distinct from (rad ->> 'status'))))
    and exists (select 1 from public.fagmiljoer f where f.id = fagmiljo and f.status = 'aktiv')
    and (select count(*) from (
          select 1 from public.fagmiljoadministratorer a
          where a.fagmiljo_id = fagmiljo and a.til is null
          for share
        ) x) = 0
  then
    raise exception 'Et aktivt fagmiljø må ha minst én aktiv administrator.'
      using errcode = '23514';
  end if;

  if tg_table_name = 'fagmiljoer' and (select count(*) from public.fagmiljoer f where f.standard) <> 1 then
    raise exception 'Nøyaktig ett fagmiljø må være standard for nye kontoer.'
      using errcode = '23514';
  end if;

  if tg_table_name = 'systemroller'
    and (select count(*) from (
          select 1 from public.systemroller s
          where s.rolle = 'systemarkitekt' and s.tilbakekalt_kl is null
          for share
        ) x) = 0
  then
    raise exception 'Den siste systemarkitekten kan ikke fjernes.'
      using errcode = '23514';
  end if;

  return null;
end;
$$;

-- --- Sperringen i Auth --------------------------------------------------------

-- Kontoene databasen har sperret fordi de står uten aktivt medlemskap, med
-- tidspunktet sperren i Auth (`auth.users.banned_until`) fikk. Sperren
-- oppheves bare når den fortsatt er den databasen satte, så en sperre satt på
-- annen måte (i Supabase) står.
create table intern.kontosperrer (
  bruker_id uuid primary key references public.profiles (id) on delete cascade,
  sperret_kl timestamptz not null default now(),
  sperret_til timestamptz not null
);

comment on table intern.kontosperrer is
  'P3: kontoene som er sperret i Auth fordi de står uten aktivt medlemskap. Se docs/fagmiljoer.md.';

revoke all on intern.kontosperrer from public, anon, authenticated, service_role;

-- Sperringen og opphevingen føres i tilgangsloggen som de andre endringene
-- (`kontosperrer.insert` og `kontosperrer.delete`).
create trigger kontosperrer_logg
after insert or delete on intern.kontosperrer
for each row execute function intern.loggfor_tilgang();

-- Sperrer kontoen i Auth når den står uten aktivt medlemskap (P2.0-regelen,
-- `intern.har_aktivt_medlemskap`: en systemarkitekt sperres aldri), og
-- opphever sperren når den har et igjen. Sperret betyr at Auth avviser
-- innlogging og fornying av økten (`banned_until`), og at øktene og
-- fornyingsnøklene som finnes, slettes. Kan kjøres så ofte det skal; den gjør
-- bare det som mangler. Gir om kontoen er sperret etterpå.
--
-- Medlemskapene og systemrollene leses `for share`: i `read committed` er de
-- endringene en annen transaksjon har lagret, med (operasjonene holder den
-- felles låsen), og i strengere isolasjon stoppes en samtidig endring med en
-- serialiseringsfeil i stedet for å bli oversett.
create function intern.synkroniser_kontosperre(bruker uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  sperre intern.kontosperrer;
begin
  if bruker is null or not exists (select 1 from public.profiles p where p.id = bruker) then
    return false;
  end if;
  -- Loggen skal alltid si hvorfor. Uten en grunn fra den som endret
  -- medlemskapet, er det regelen selv.
  if intern.tilgangsgrunn() is null then
    perform set_config('ousfar.tilgangsgrunn', 'Sperren i Auth følger det aktive medlemskapet (P3)', true);
  end if;
  perform 1 from public.medlemskap m where m.bruker_id = bruker for share;
  perform 1 from public.systemroller s where s.bruker_id = bruker for share;
  select * into sperre from intern.kontosperrer k where k.bruker_id = bruker for update;

  if intern.har_aktivt_medlemskap(bruker) then
    if sperre.bruker_id is not null then
      delete from intern.kontosperrer k where k.bruker_id = bruker;
      update auth.users u set banned_until = null
      where u.id = bruker and u.banned_until = sperre.sperret_til;
    end if;
    return false;
  end if;

  if sperre.bruker_id is null then
    -- Som når Supabase sperrer for «alltid»: om lag hundre år.
    insert into intern.kontosperrer (bruker_id, sperret_til)
    values (bruker, date_trunc('second', now()) + interval '100 years')
    returning * into sperre;
  end if;
  update auth.users u set banned_until = sperre.sperret_til
  where u.id = bruker and (u.banned_until is null or u.banned_until < sperre.sperret_til);
  delete from auth.sessions s where s.user_id = bruker;
  delete from auth.refresh_tokens r where r.user_id = bruker::text;
  return true;
end;
$$;

revoke all on function intern.synkroniser_kontosperre(uuid) from public, anon, authenticated, service_role;

-- Kjøres når transaksjonen avsluttes, etter at invariantene er kontrollert,
-- for hver konto en endring i medlemskapene, systemrollene eller et fagmiljøs
-- status kan ha gitt eller tatt tilgangen fra. Slik følger sperren
-- tilgangen uansett hvem eller hva som endret den: operasjonene under, en
-- migrasjon eller en systemarkitekt i Supabase.
create function intern.kontosperre_etter_endring()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad jsonb := case tg_op when 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  if tg_table_name = 'fagmiljoer' then
    perform intern.synkroniser_kontosperre(x.bruker_id)
    from (select distinct m.bruker_id from public.medlemskap m where m.fagmiljo_id = (rad ->> 'id')::uuid) x;
  else
    perform intern.synkroniser_kontosperre((rad ->> 'bruker_id')::uuid);
  end if;
  return null;
end;
$$;

revoke all on function intern.kontosperre_etter_endring() from public, anon, authenticated, service_role;

create constraint trigger medlemskap_kontosperre
after insert or update or delete on public.medlemskap
deferrable initially deferred
for each row execute function intern.kontosperre_etter_endring();

create constraint trigger systemroller_kontosperre
after insert or update or delete on public.systemroller
deferrable initially deferred
for each row execute function intern.kontosperre_etter_endring();

create constraint trigger fagmiljoer_kontosperre
after update of status on public.fagmiljoer
deferrable initially deferred
for each row execute function intern.kontosperre_etter_endring();

-- --- Myndigheten over medlemskapene ------------------------------------------

-- Avgjør om `aktor` kan gjøre `handling` med medlemskapet til `mal` i
-- `fagmiljo`. Gir `null` når det er lov (også når det alt er gjort, så en
-- handling kan gjentas), ellers avslaget som `{sqlstate, melding}`. Den ene
-- avgjørelsen operasjonene stopper med og appen viser knappene etter
-- (`public.medlemsoversikt`).
--
--  * `gi`: aktivt medlemskap i fagmiljøet, også igjen etter en avslutning
--  * `avslutt`: avslutter medlemskapet der
--  * `gi_admin`, `fjern_admin`: lokal administrator der (bare systemarkitekt)
--
-- Den som handler, må administrere fagmiljøet nå (`intern.er_lokal_admin_i`:
-- aktiv tildeling, aktivt medlemskap og aktivt fagmiljø, eller
-- systemarkitekt), og ingen kan handle på sin egen konto. En lokal
-- administrator kan bare endre medlemskapet til vanlige brukere
-- (`intern.myndighetsniva` 1), og kan ikke gi en sperret konto tilgang til et
-- fagmiljø den aldri har vært medlem av. Fagmiljøet sjekkes før brukeren, så
-- den som ikke administrerer det, ikke får vite hvem som finnes.
create function intern.medlemskapsavslag(aktor uuid, mal uuid, fagmiljo uuid, handling text)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  f public.fagmiljoer;
  medlem_her boolean;
  gjeldende_her boolean;
  admin_her boolean;
  andre_admin boolean;
begin
  if handling is null or handling not in ('gi', 'avslutt', 'gi_admin', 'fjern_admin') then
    return array['22023', 'Ukjent handling.'];
  end if;
  if aktor is null or not exists (select 1 from public.profiles p where p.id = aktor) then
    return array['42501', 'Kontoen din finnes ikke lenger.'];
  end if;
  if not intern.har_aktivt_medlemskap(aktor) then
    return array['42501', 'Du har ikke lenger et aktivt medlemskap i OUSFAR.'];
  end if;

  select * into f from public.fagmiljoer x where x.id = fagmiljo;
  if not found then
    return array['P0002', 'Ukjent fagmiljø.'];
  end if;
  if not intern.er_lokal_admin_i(f.id, aktor) then
    return array['42501', format('Du administrerer ikke %s.', f.navn)];
  end if;
  if f.status <> 'aktiv' then
    return array['55000', format('%s er arkivert.', f.navn)];
  end if;
  if mal is null or not exists (select 1 from public.profiles p where p.id = mal) then
    return array['P0002', 'Ukjent bruker.'];
  end if;
  if aktor = mal then
    return array['42501', 'Du kan ikke endre ditt eget medlemskap her. Be en annen administrator om det.'];
  end if;

  medlem_her := exists (
    select 1 from public.medlemskap m where m.bruker_id = mal and m.fagmiljo_id = f.id and m.status = 'aktiv'
  );
  gjeldende_her := exists (
    select 1 from public.medlemskap m where m.bruker_id = mal and m.fagmiljo_id = f.id and m.status <> 'deaktivert'
  );
  admin_her := exists (
    select 1 from public.fagmiljoadministratorer a where a.bruker_id = mal and a.fagmiljo_id = f.id and a.til is null
  );
  andre_admin := exists (
    select 1 from public.fagmiljoadministratorer a where a.fagmiljo_id = f.id and a.til is null and a.bruker_id <> mal
  );

  if handling in ('gi_admin', 'fjern_admin') then
    if not intern.er_systemarkitekt(aktor) then
      return array['42501', 'Bare en systemarkitekt kan utpeke eller fjerne administratorer.'];
    end if;
    if handling = 'gi_admin' then
      if admin_her then
        return null;
      end if;
      if not medlem_her then
        return array['55000', format('Brukeren må være medlem av %s før den kan bli administrator der.', f.navn)];
      end if;
      -- Et midlertidig passord kan være kjent av den som laget det (P1.2a).
      if exists (
        select 1 from public.profiles p where p.id = mal and (p.must_change_password or not p.onboarding_completed)
      ) then
        return array['55000', 'Brukeren må ha logget inn og valgt sitt eget passord før den kan bli administrator.'];
      end if;
      return null;
    end if;
    if admin_her and not andre_admin then
      return array['23514', format('Brukeren er den eneste administratoren i %s. Utpek en annen først.', f.navn)];
    end if;
    return null;
  end if;

  if not intern.er_systemarkitekt(aktor) and intern.myndighetsniva(mal) >= 2 then
    return array['42501', 'Medlemskapet til en administrator eller systemarkitekt kan bare endres av en systemarkitekt.'];
  end if;

  if handling = 'avslutt' then
    if not gjeldende_her then
      return null;
    end if;
    if admin_her and not andre_admin then
      return array['23514', format('Brukeren er den eneste administratoren i %s. Utpek en annen først.', f.navn)];
    end if;
    -- En systemarkitekt sperres aldri (P2.0-regelen), men skal heller ikke
    -- stå uten et fagmiljø å høre til.
    if intern.er_systemarkitekt(mal) and not exists (
      select 1 from public.medlemskap m
      join public.fagmiljoer x on x.id = m.fagmiljo_id and x.status = 'aktiv'
      where m.bruker_id = mal and m.status = 'aktiv' and m.fagmiljo_id <> f.id
    ) then
      return array['42501', 'En systemarkitekt må beholde minst ett medlemskap.'];
    end if;
    return null;
  end if;

  -- gi
  if medlem_her then
    return null;
  end if;
  if not f.apent_for_medlemmer and not intern.er_systemarkitekt(mal) then
    return array['42501', format('%s tar ikke imot medlemmer ennå (startport S2).', f.navn)];
  end if;
  if not intern.er_systemarkitekt(aktor) and not intern.har_aktivt_medlemskap(mal)
    and not exists (select 1 from public.medlemskap m where m.bruker_id = mal and m.fagmiljo_id = f.id)
  then
    return array['42501', 'Kontoen er sperret fordi den ikke er medlem noe sted. Be en systemarkitekt om å gi den tilgang.'];
  end if;
  return null;
end;
$$;

revoke all on function intern.medlemskapsavslag(uuid, uuid, uuid, text) from public, anon, authenticated, service_role;

-- Stopper med avslaget fra `intern.medlemskapsavslag`. Kjøres med den felles
-- låsen holdt.
create function intern.krev_medlemskapsmyndighet(aktor uuid, mal uuid, fagmiljo uuid, handling text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  avslag text[] := intern.medlemskapsavslag(aktor, mal, fagmiljo, handling);
begin
  if avslag is not null then
    raise exception '%', avslag[2] using errcode = avslag[1];
  end if;
end;
$$;

revoke all on function intern.krev_medlemskapsmyndighet(uuid, uuid, uuid, text) from public, anon, authenticated, service_role;

-- Medlemskapet til `bruker` i `fagmiljo` slik operasjonene gir det tilbake:
-- `{bruker, fagmiljo, status, administrator, sperret}`. `sperret` er det
-- kontoen blir når transaksjonen er ferdig (sperringen skjer da, under).
create function intern.medlemskapssvar(bruker uuid, fagmiljo uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'bruker', medlemskapssvar.bruker,
    'fagmiljo', medlemskapssvar.fagmiljo,
    'status', coalesce((
      select case m.status when 'deaktivert' then 'avsluttet' else m.status end
      from public.medlemskap m
      where m.bruker_id = medlemskapssvar.bruker and m.fagmiljo_id = medlemskapssvar.fagmiljo
      order by (m.status <> 'deaktivert') desc, m.fra desc, m.id desc
      limit 1
    ), 'ingen'),
    'administrator', exists (
      select 1 from public.fagmiljoadministratorer a
      where a.bruker_id = medlemskapssvar.bruker and a.fagmiljo_id = medlemskapssvar.fagmiljo and a.til is null
    ),
    'sperret', not intern.har_aktivt_medlemskap(medlemskapssvar.bruker)
  )
$$;

revoke all on function intern.medlemskapssvar(uuid, uuid) from public, anon, authenticated, service_role;

-- --- Operasjonene ---------------------------------------------------------------
--
-- Kalles fra nettleseren med den innloggede som aktør (ingen Edge-funksjon:
-- sperren i Auth skrives i samme transaksjon). Hver av dem krever aktivt
-- medlemskap først, tar den felles låsen, kontrollerer myndigheten og gjør
-- endringen. En handling som alt er gjort, gir det samme svaret uten å endre
-- noe, så et kall som ble brutt av nettet, kan gjentas trygt.

-- Gir `bruker` aktivt medlemskap i `fagmiljo`. Står kontoen uten aktive
-- medlemskap, blir dette primært, og sperren oppheves. Et invitert medlemskap
-- blir aktivt; ellers legges et nytt til, så historikken står.
create function intern.gi_medlemskap(aktor uuid, bruker uuid, fagmiljo uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ny_primaer boolean;
begin
  perform intern.las_tilgang(aktor, 'Medlemskap gitt i administrasjonen');
  perform intern.krev_medlemskapsmyndighet(aktor, bruker, fagmiljo, 'gi');

  if not exists (
    select 1 from public.medlemskap m
    where m.bruker_id = gi_medlemskap.bruker and m.fagmiljo_id = gi_medlemskap.fagmiljo and m.status = 'aktiv'
  ) then
    ny_primaer := not exists (
      select 1 from public.medlemskap m
      where m.bruker_id = gi_medlemskap.bruker and m.status = 'aktiv' and m.primaer
    );
    update public.medlemskap m set status = 'aktiv', primaer = ny_primaer
    where m.bruker_id = gi_medlemskap.bruker and m.fagmiljo_id = gi_medlemskap.fagmiljo and m.status = 'invitert';
    if not found then
      insert into public.medlemskap (bruker_id, fagmiljo_id, primaer, tildelt_av)
      values (gi_medlemskap.bruker, gi_medlemskap.fagmiljo, ny_primaer, aktor);
    end if;
  end if;

  return intern.medlemskapssvar(bruker, fagmiljo);
end;
$$;

revoke all on function intern.gi_medlemskap(uuid, uuid, uuid) from public, anon, authenticated, service_role;

create function public.gi_medlemskap(bruker uuid, fagmiljo uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  return intern.gi_medlemskap((select auth.uid()), gi_medlemskap.bruker, gi_medlemskap.fagmiljo);
end;
$$;

-- Som `gi_medlemskap`, for en konto oppgitt med brukernavnet. Fagmiljøet
-- kontrolleres før brukernavnet slås opp.
create function public.legg_til_medlem(brukernavn text, fagmiljo uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  bruker uuid;
begin
  perform intern.krev_aktivt_medlemskap();
  perform intern.las_tilgang(aktor, 'Medlem lagt til i administrasjonen');
  select p.id into bruker from public.profiles p
  where p.username = public.brukernavn_normalisert(coalesce(legg_til_medlem.brukernavn, ''));
  if bruker is null then
    -- Den som ikke administrerer fagmiljøet, får det samme svaret som før.
    perform intern.krev_medlemskapsmyndighet(aktor, null, legg_til_medlem.fagmiljo, 'gi');
  end if;
  return intern.gi_medlemskap(aktor, bruker, legg_til_medlem.fagmiljo);
end;
$$;

-- Avslutter medlemskapet til `bruker` i `fagmiljo`. Er brukeren lokal
-- administrator der, avsluttes det også. Var det primært, blir det eldste av
-- de andre aktive medlemskapene primært. Var det det siste, sperres kontoen i
-- Auth når transaksjonen er ferdig. Historikken står: raden avsluttes med
-- tidspunkt og blir ikke slettet.
create function public.avslutt_medlemskap(bruker uuid, fagmiljo uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
begin
  perform intern.krev_aktivt_medlemskap();
  perform intern.las_tilgang(aktor, 'Medlemskap avsluttet i administrasjonen');
  perform intern.krev_medlemskapsmyndighet(aktor, avslutt_medlemskap.bruker, avslutt_medlemskap.fagmiljo, 'avslutt');

  update public.fagmiljoadministratorer a set til = now()
  where a.bruker_id = avslutt_medlemskap.bruker and a.fagmiljo_id = avslutt_medlemskap.fagmiljo and a.til is null;

  update public.medlemskap m set status = 'deaktivert', til = now()
  where m.bruker_id = avslutt_medlemskap.bruker and m.fagmiljo_id = avslutt_medlemskap.fagmiljo
    and m.status <> 'deaktivert';

  update public.medlemskap m set primaer = true
  where m.id = (
      select x.id from public.medlemskap x
      join public.fagmiljoer f on f.id = x.fagmiljo_id
      where x.bruker_id = avslutt_medlemskap.bruker and x.status = 'aktiv'
      order by (f.status = 'aktiv') desc, x.fra, x.id
      limit 1
    )
    and not exists (
      select 1 from public.medlemskap y
      where y.bruker_id = avslutt_medlemskap.bruker and y.status = 'aktiv' and y.primaer
    );

  return intern.medlemskapssvar(bruker, fagmiljo);
end;
$$;

-- Utpeker (`administrator = true`) eller fjerner en lokal administrator i
-- fagmiljøet. Bare systemarkitektene (P0 §5.2), aldri den siste. Den gamle
-- adminrollen (`profiles.role`) endres ikke; den står for seg (D3).
create function public.sett_fagmiljoadministrator(bruker uuid, fagmiljo uuid, administrator boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
begin
  perform intern.krev_aktivt_medlemskap();
  perform intern.las_tilgang(aktor, case when administrator then 'Lokal administrator utpekt' else 'Lokal administrator fjernet' end);
  perform intern.krev_medlemskapsmyndighet(
    aktor, sett_fagmiljoadministrator.bruker, sett_fagmiljoadministrator.fagmiljo,
    case when administrator then 'gi_admin' else 'fjern_admin' end
  );

  if administrator then
    insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id, tildelt_av)
    select sett_fagmiljoadministrator.bruker, sett_fagmiljoadministrator.fagmiljo, aktor
    where not exists (
      select 1 from public.fagmiljoadministratorer a
      where a.bruker_id = sett_fagmiljoadministrator.bruker and a.fagmiljo_id = sett_fagmiljoadministrator.fagmiljo
        and a.til is null
    );
  else
    update public.fagmiljoadministratorer a set til = now()
    where a.bruker_id = sett_fagmiljoadministrator.bruker and a.fagmiljo_id = sett_fagmiljoadministrator.fagmiljo
      and a.til is null;
  end if;

  return intern.medlemskapssvar(bruker, fagmiljo);
end;
$$;

-- Oppretter et nytt fagmiljø, med systemarkitekten som oppretter det som
-- medlem og første lokale administrator (regel 3). Det er alltid lukket for
-- andre enn systemarkitektene til startporten S2 er passert og det åpnes i en
-- egen, godkjent migrasjon (`apent_for_medlemmer`), og blir aldri standard
-- herfra. Nøkkelen lages av navnet og står fast.
create function public.opprett_fagmiljo(navn text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid;
  rent text := btrim(regexp_replace(coalesce(opprett_fagmiljo.navn, ''), '\s+', ' ', 'g'));
  ny_nokkel text;
  ny public.fagmiljoer;
begin
  aktor := (intern.krev_systemarkitekt('Bare systemarkitektene kan opprette fagmiljøer.')).id;
  perform intern.las_tilgang(aktor, 'Fagmiljø opprettet i administrasjonen');

  ny_nokkel := btrim(regexp_replace(
    replace(replace(replace(lower(rent), 'æ', 'ae'), 'ø', 'o'), 'å', 'a'),
    '[^a-z0-9]+', '-', 'g'
  ), '-');
  if char_length(rent) < 2 or char_length(rent) > 120 or ny_nokkel = '' or char_length(ny_nokkel) > 60 then
    raise exception 'Navnet må ha mellom 2 og 120 tegn, med minst én bokstav eller ett tall.' using errcode = '22023';
  end if;
  if exists (select 1 from public.fagmiljoer f where f.nokkel = ny_nokkel or lower(f.navn) = lower(rent)) then
    raise exception 'Det finnes alt et fagmiljø med det navnet.' using errcode = '23505';
  end if;

  insert into public.fagmiljoer (nokkel, navn, standard, apent_for_medlemmer, opprettet_av)
  values (ny_nokkel, rent, false, false, aktor)
  returning * into ny;
  insert into public.medlemskap (bruker_id, fagmiljo_id, primaer, tildelt_av)
  values (aktor, ny.id, not exists (
    select 1 from public.medlemskap m where m.bruker_id = aktor and m.status = 'aktiv' and m.primaer
  ), aktor);
  insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id, tildelt_av) values (aktor, ny.id, aktor);

  return jsonb_build_object('id', ny.id, 'nokkel', ny.nokkel, 'navn', ny.navn);
end;
$$;

-- --- Det appen viser -------------------------------------------------------------

-- Medlemmene i et fagmiljø den innloggede administrerer, slik
-- administrasjonen viser dem: de gjeldende (aktive og inviterte), og de
-- tidligere med det siste medlemskapet de hadde der. Med hver rad følger
-- handlingene databasen tillater, avgjort av de samme funksjonene som
-- operasjonene (`intern.medlemskapsavslag`, og `intern.kontoavslag` for nytt
-- passord og den gamle adminrollen). Et grensesnitt, ikke en kontroll:
-- operasjonene kontrollerer på nytt.
create function public.medlemsoversikt(fagmiljo uuid)
returns table (
  bruker_id uuid,
  username text,
  first_name text,
  last_name text,
  avatar_path text,
  updated_at timestamptz,
  status text,
  fra timestamptz,
  til timestamptz,
  administrator boolean,
  systemarkitekt boolean,
  rolle public.brukerrolle,
  maa_bytte_passord boolean,
  sperret boolean,
  eneste_medlemskap boolean,
  kan_avslutte boolean,
  kan_gi_tilgang boolean,
  kan_gjore_til_administrator boolean,
  kan_fjerne_som_administrator boolean,
  nytt_passord boolean,
  endre_rolle boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  aktor uuid := (select auth.uid());
  f public.fagmiljoer;
begin
  perform intern.krev_aktivt_medlemskap();
  select * into f from public.fagmiljoer x where x.id = medlemsoversikt.fagmiljo;
  if not found or not intern.er_lokal_admin_i(f.id, aktor) then
    raise exception 'Du administrerer ikke dette fagmiljøet.' using errcode = '42501';
  end if;

  return query
  with siste as (
    select distinct on (m.bruker_id) m.*
    from public.medlemskap m
    where m.fagmiljo_id = f.id
    order by m.bruker_id, (m.status <> 'deaktivert') desc, m.fra desc, m.id desc
  )
  select
    p.id, p.username, p.first_name, p.last_name, p.avatar_path, p.updated_at,
    case s.status when 'deaktivert' then 'avsluttet' else s.status end,
    s.fra, s.til,
    exists (
      select 1 from public.fagmiljoadministratorer a
      where a.bruker_id = p.id and a.fagmiljo_id = f.id and a.til is null
    ),
    intern.er_systemarkitekt(p.id),
    p.role,
    p.must_change_password or not p.onboarding_completed,
    not intern.har_aktivt_medlemskap(p.id),
    s.status = 'aktiv' and not exists (
      select 1 from public.medlemskap o
      where o.bruker_id = p.id and o.status = 'aktiv' and o.fagmiljo_id <> f.id
    ),
    s.status <> 'deaktivert' and p.id <> aktor and intern.medlemskapsavslag(aktor, p.id, f.id, 'avslutt') is null,
    s.status <> 'aktiv' and p.id <> aktor and intern.medlemskapsavslag(aktor, p.id, f.id, 'gi') is null,
    s.status = 'aktiv' and p.id <> aktor
      and not exists (
        select 1 from public.fagmiljoadministratorer a
        where a.bruker_id = p.id and a.fagmiljo_id = f.id and a.til is null
      )
      and intern.medlemskapsavslag(aktor, p.id, f.id, 'gi_admin') is null,
    exists (
        select 1 from public.fagmiljoadministratorer a
        where a.bruker_id = p.id and a.fagmiljo_id = f.id and a.til is null
      )
      and p.id <> aktor and intern.medlemskapsavslag(aktor, p.id, f.id, 'fjern_admin') is null,
    intern.kontoavslag(aktor, p.id, 'passord') is null,
    intern.kontoavslag(aktor, p.id, 'rolle') is null
  from siste s
  join public.profiles p on p.id = s.bruker_id
  order by s.status = 'deaktivert', p.first_name, p.last_name, p.username;
end;
$$;

-- Rettighetene appen viser menyene etter (P2d), med fagmiljøene den
-- innloggede administrerer utvidet med om de er standard (der nye brukere
-- opprettes) og åpne for medlemmer, og om den kan opprette fagmiljøer.
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
      select jsonb_agg(jsonb_build_object(
        'id', f.id, 'nokkel', f.nokkel, 'navn', f.navn,
        'standard', f.standard, 'apent', f.apent_for_medlemmer
      ) order by f.navn)
      from public.fagmiljoer f
      where f.id = any (public.mine_administrerte_fagmiljoer())
    ), '[]'::jsonb),
    'stoffregister', intern.har_registerrett((select auth.uid())),
    'opprett_bruker', intern.opprettelsesavslag((select auth.uid())) is null
  )
$$;

revoke all on function public.gi_medlemskap(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.legg_til_medlem(text, uuid) from public, anon, authenticated, service_role;
revoke all on function public.avslutt_medlemskap(uuid, uuid) from public, anon, authenticated, service_role;
revoke all on function public.sett_fagmiljoadministrator(uuid, uuid, boolean) from public, anon, authenticated, service_role;
revoke all on function public.opprett_fagmiljo(text) from public, anon, authenticated, service_role;
revoke all on function public.medlemsoversikt(uuid) from public, anon, authenticated, service_role;
grant execute on function public.gi_medlemskap(uuid, uuid) to authenticated;
grant execute on function public.legg_til_medlem(text, uuid) to authenticated;
grant execute on function public.avslutt_medlemskap(uuid, uuid) to authenticated;
grant execute on function public.sett_fagmiljoadministrator(uuid, uuid, boolean) to authenticated;
grant execute on function public.opprett_fagmiljo(text) to authenticated;
grant execute on function public.medlemsoversikt(uuid) to authenticated;

-- --- Kontoene som alt står uten medlemskap ------------------------------------

-- Sperrer kontoer som alt står uten aktivt medlemskap, slik regelen nå krever.
-- I produksjonen har alle et (14.11.2026); da gjøres ingenting.
do $$
declare
  antall integer;
begin
  perform set_config('ousfar.tilgangsgrunn', 'P3: kontoer uten aktivt medlemskap sperres', true);
  select count(*) filter (where intern.synkroniser_kontosperre(p.id)) into antall
  from public.profiles p
  where not intern.har_aktivt_medlemskap(p.id);
  raise notice 'P3: % kontoer uten aktivt medlemskap er sperret.', antall;
  perform set_config('ousfar.tilgangsgrunn', '', true);
end;
$$;
