-- P2d: rettighetene i stoffregisteret, administrasjonen og datakildene
-- (docs/fagmiljoer.md, «Systemrettigheter»; P0-rapporten §5.2 og beslutningen
-- D3).
--
-- Den gamle adminrollen (`profiles.role = 'admin'`) gir ingen rettigheter i
-- dette området lenger. Det som gjelder hele OUSFAR — synkene og
-- datakildene, kildesakene, nødstoppen for de kliniske verktøyene,
-- kurateringene, autoerstatt-reglene og papirkurven for fagsidene — krever
-- systemarkitekt. Stoffregisterets inndeling krever rett til å endre
-- registeret, som i dag bare systemarkitektene har (P5 gir den også til
-- tildelte felles redaktører). En ny konto kan opprettes av en
-- systemarkitekt, eller av en lokal administrator i fagmiljøet kontoen blir
-- medlem av (standarden).
--
-- `public.er_admin()` og `intern.krev_admin()` beholder betydningen sin: de
-- brukes fortsatt i faginnholdet (P2a) og samhandlingen (P2b), som bytter dem
-- ut selv. Ingen funksjon eller regel i dette området bruker dem etter denne
-- migrasjonen (`systemrettigheter.test.ts`).
--
-- Serverprosessene berøres ikke: synkene kjører med den hemmelige nøkkelen
-- eller som `postgres`, kurateringsagentene med egne nøkler
-- (`kuratering.utfor_handling` med agenten som aktør), og ingen av dem går
-- gjennom funksjonene her. Ingen data endres.

-- --- Kontrollene ---------------------------------------------------------

-- Stopper kallet med `42501` når den innloggede ikke er systemarkitekt (eller
-- mangler aktivt medlemskap), og gir ellers profilen. `melding` er det den
-- som prøvde, får se. Kalles bare fra `security definer`-funksjonene.
create function intern.krev_systemarkitekt(melding text default 'Bare systemarkitektene kan gjøre dette.')
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
  where p.id = (select auth.uid()) and intern.er_systemarkitekt(p.id);
  if not found then
    raise exception '%', coalesce(krev_systemarkitekt.melding, 'Bare systemarkitektene kan gjøre dette.')
      using errcode = '42501';
  end if;
  return innlogget;
end;
$$;

revoke all on function intern.krev_systemarkitekt(text) from public, anon, authenticated, service_role;

-- Om brukeren kan endre stoffregisterets inndeling, arkiv og papirkurv. Den
-- eneste definisjonen; i dag systemarkitektene (P0 §5.2: «Endre
-- stoffregisterets struktur»), senere også felles redaktører med registeret
-- tildelt (P5).
create function intern.har_registerrett(bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.har_aktivt_medlemskap(har_registerrett.bruker) and intern.er_systemarkitekt(har_registerrett.bruker)
$$;

revoke all on function intern.har_registerrett(uuid) from public, anon, authenticated, service_role;

-- Porten alle funksjonene som endrer stoffregisteret, går gjennom. Før P2d
-- slapp den inn alle innloggede.
create or replace function intern.krev_registerbruker()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  bruker uuid := (select auth.uid());
begin
  if bruker is null then
    raise exception 'Bare innloggede kan endre stoffregisteret.' using errcode = '42501';
  end if;
  perform intern.krev_aktivt_medlemskap();
  if not intern.har_registerrett(bruker) then
    raise exception 'Du har ikke rett til å endre stoffregisteret.' using errcode = '42501';
  end if;
  return bruker;
end;
$$;

-- Avgjør om `aktor` kan opprette en ny konto. Gir `null` når det er lov,
-- ellers `{sqlstate, melding}` som `intern.kontoavslag`. En ny konto blir
-- medlem av standardfagmiljøet (utløseren `profiles_standardmedlemskap`), så
-- det er der en lokal administrator må ha myndighet (P0 §5.2: «Legge til
-- medlemskap»). Den gamle adminrollen teller ikke.
create function intern.opprettelsesavslag(aktor uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  standard public.fagmiljoer;
begin
  if aktor is null or not exists (select 1 from public.profiles p where p.id = aktor) then
    return array['42501', 'Kontoen din finnes ikke lenger.'];
  end if;
  if not intern.har_aktivt_medlemskap(aktor) then
    return array['42501', 'Du har ikke lenger et aktivt medlemskap i OUSFAR.'];
  end if;
  select f.* into standard from public.fagmiljoer f where f.standard and f.status = 'aktiv';
  -- Systemarkitektene, og den lokale administratoren der (P2a–d-hjelperen).
  if intern.er_lokal_admin_i(standard.id, aktor) then
    return null;
  end if;
  return array['42501', format(
    'Bare systemarkitektene og de lokale administratorene i %s kan opprette brukere, fordi nye brukere blir medlemmer der.',
    coalesce(standard.navn, 'standardfagmiljøet'))];
end;
$$;

revoke all on function intern.opprettelsesavslag(uuid) from public, anon, authenticated, service_role;

-- Klareringen husker hvem som ba om kontoen, slik at myndigheten kan
-- kontrolleres på nytt når kontoen faktisk opprettes. En klarering uten
-- aktør kommer fra en server-side jobb med hemmelig nøkkel (oppstartsskriptet,
-- testene), som før.
alter table public.kontoreservasjoner add column aktor uuid;

comment on column public.kontoreservasjoner.aktor is
  'Hvem som ba om kontoen (opprett-bruker). Myndigheten kontrolleres på nytt når kontoen opprettes. Tom for server-side jobber.';

-- Kontrollerer myndigheten og klarerer brukernavnet for `opprett-bruker`, med
-- den felles låsen holdt, før Edge-funksjonen slår opp noe. Klareringen er
-- den samme som Edge-funksjonen la inn selv før (`kontoreservasjoner`), og
-- brukes opp av utløseren på `auth.users`, som kontrollerer myndigheten på
-- nytt under låsen (`handter_ny_auth_bruker`).
create function public.kontooperasjon_klarer_konto(aktor uuid, brukernavn text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  avslag text[];
begin
  perform intern.las_tilgang(aktor, 'opprett-bruker: kontroll');
  avslag := intern.opprettelsesavslag(aktor);
  if avslag is not null then
    raise exception '%', avslag[2] using errcode = avslag[1];
  end if;
  insert into public.kontoreservasjoner as r (username, reservert_kl, aktor)
  values (kontooperasjon_klarer_konto.brukernavn, now(), kontooperasjon_klarer_konto.aktor)
  on conflict (username) do update set reservert_kl = excluded.reservert_kl, aktor = excluded.aktor;
end;
$$;

revoke all on function public.kontooperasjon_klarer_konto(uuid, text) from public, anon, authenticated;
grant execute on function public.kontooperasjon_klarer_konto(uuid, text) to service_role;

-- Utløseren på `auth.users`, som før, men med myndigheten kontrollert på nytt
-- under den felles låsen i samme transaksjon som kontoen opprettes. Mister
-- aktøren myndigheten mellom klareringen og opprettelsen, blir det ingen
-- konto (P0 §5.2, som passordflyten i P1.2a).
create or replace function public.handter_ny_auth_bruker()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  nytt_brukernavn text;
  bestiller uuid;
  avslag text[];
begin
  if lower(split_part(coalesce(new.email, ''), '@', 2)) <> public.intern_auth_domene() then
    raise exception 'OUSFAR er lukket. Kontoer opprettes bare av en administrator.'
      using errcode = '42501';
  end if;

  nytt_brukernavn := public.brukernavn_normalisert(split_part(new.email, '@', 1));
  if not public.brukernavn_er_gyldig(nytt_brukernavn) then
    raise exception 'Ugyldig brukernavn: %', nytt_brukernavn using errcode = '22023';
  end if;

  delete from public.kontoreservasjoner
  where reservert_kl < now() - interval '15 minutes';

  delete from public.kontoreservasjoner where username = nytt_brukernavn
  returning aktor into bestiller;
  if not found then
    raise exception 'OUSFAR er lukket. Kontoer opprettes bare av en administrator.'
      using errcode = '42501';
  end if;

  if bestiller is not null then
    perform intern.las_tilgang(bestiller, 'opprett-bruker');
    avslag := intern.opprettelsesavslag(bestiller);
    if avslag is not null then
      raise exception '%', avslag[2] using errcode = avslag[1];
    end if;
  end if;

  insert into public.profiles (id, username) values (new.id, nytt_brukernavn);
  return new;
end;
$$;

revoke all on function public.handter_ny_auth_bruker() from public, anon, authenticated;

-- --- Det appen spør om ----------------------------------------------------

-- Rettighetene appen viser knapper og menyer etter. Et grensesnitt, ikke en
-- kontroll: hver funksjon kontrollerer på nytt. Bygger på de samme
-- avgjørelsene som funksjonene, så det som vises, stemmer med det som går
-- gjennom.
create function public.mine_rettigheter()
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
      select jsonb_agg(jsonb_build_object('id', f.id, 'nokkel', f.nokkel, 'navn', f.navn) order by f.navn)
      from public.fagmiljoer f
      where f.id = any (public.mine_administrerte_fagmiljoer())
    ), '[]'::jsonb),
    'stoffregister', intern.har_registerrett((select auth.uid())),
    'opprett_bruker', intern.opprettelsesavslag((select auth.uid())) is null
  )
$$;

revoke all on function public.mine_rettigheter() from public, anon, authenticated, service_role;
grant execute on function public.mine_rettigheter() to authenticated;

-- --- Autoerstatt-reglene i teksteditorene -----------------------------------

alter policy "Administratorer oppretter regler" on public.autoerstatt_regler
  with check ((select public.er_systemarkitekt()));
alter policy "Administratorer oppretter regler" on public.autoerstatt_regler
  rename to "Systemarkitekter oppretter regler";
alter policy "Administratorer endrer regler" on public.autoerstatt_regler
  using ((select public.er_systemarkitekt())) with check ((select public.er_systemarkitekt()));
alter policy "Administratorer endrer regler" on public.autoerstatt_regler
  rename to "Systemarkitekter endrer regler";
alter policy "Administratorer sletter regler" on public.autoerstatt_regler
  using ((select public.er_systemarkitekt()));
alter policy "Administratorer sletter regler" on public.autoerstatt_regler
  rename to "Systemarkitekter sletter regler";

comment on table public.autoerstatt_regler is
  'Autoerstatt-reglene i teksteditorene: finn byttes med erstatt mens det skrives. Bare systemarkitektene endrer dem.';

-- --- Funksjonene i området -------------------------------------------------
--
-- Definisjonene er de gjeldende, med kontrollen byttet: `er_admin()` og
-- `krev_admin()` er erstattet med `krev_systemarkitekt()` eller
-- `er_systemarkitekt()`. Ellers er de uendret.

-- datakilder_status
CREATE OR REPLACE FUNCTION public.datakilder_status(antall integer DEFAULT 200)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform intern.krev_systemarkitekt('Bare for systemarkitektene.');

  return (
    with kjoringer as (
      -- FEST: versjonen er når DMP laget uttrekket (`HentetDato`).
      select 'fest' as kilde, s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             null::text as release, to_char(s.kildedato, 'YYYY-MM-DD"T"HH24:MI:SS') as versjon, s.antall, s.feil
      from legemiddeldata.synkroniseringer s
      where s.kilde = 'FEST'
      union all
      select 'clinpgx', s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             null::text, s.parserversjon::text, s.antall, s.feil
      from clinpgx.synkroniseringer s
      union all
      select 'cpic', s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             s.release, s.skjemaversjon, s.antall, s.feil
      from cpic.synkroniseringer s
      union all
      select 'pubchem', s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             null::text, s.parserversjon::text, s.antall, s.feil
      from pubchem.synkroniseringer s
      union all
      select 'farmakologiportalen', s.id, s.status, s.utlost_av, s.startet_kl, s.avsluttet_kl,
             null::text, s.parserversjon::text, s.antall, s.feil
      from farmakologiportalen.synkroniseringer s
    ),
    siste as (
      select k.*, row_number() over (partition by k.kilde order by k.id desc) as nr
      from kjoringer k
    ),
    opptalt as (
      select e.kilde, e.synk_id,
             jsonb_build_object(
               'klinisk', count(*) filter (where e.niva = 'klinisk' and e.art <> 'grunnlag'),
               'metadata', count(*) filter (where e.niva = 'metadata' and e.art <> 'grunnlag'),
               'grunnlag', count(*) filter (where e.art = 'grunnlag')) as endringer
      from datakilder.endringer e
      where e.synk_id is not null
      group by e.kilde, e.synk_id
    )
    select jsonb_build_object(
      'kjoringer', coalesce((
        select jsonb_agg(jsonb_build_object(
          'kilde', s.kilde, 'id', s.id, 'status', s.status, 'utlost_av', s.utlost_av,
          'startet_kl', s.startet_kl, 'avsluttet_kl', s.avsluttet_kl, 'release', s.release,
          'versjon', s.versjon, 'antall', s.antall, 'feil', s.feil,
          'endringer', coalesce(o.endringer, '{"klinisk": 0, "metadata": 0, "grunnlag": 0}'))
          order by s.kilde, s.id desc)
        from siste s
        left join opptalt o on o.kilde = s.kilde and o.synk_id = s.id
        where s.nr <= 10), '[]'),
      -- Det siste som er kjent om hver kilde, også når siste kjøring ikke
      -- fikk oppgitt release eller versjon (CPIC-releasen er valgfri).
      'kilder', coalesce((
        select jsonb_object_agg(k.kilde, jsonb_build_object(
          'release', (select v.release from kjoringer v
                      where v.kilde = k.kilde and v.status not in ('pagar', 'feilet') and v.release is not null
                      order by v.id desc limit 1),
          'versjon', (select v.versjon from kjoringer v
                      where v.kilde = k.kilde and v.status not in ('pagar', 'feilet') and v.versjon is not null
                      order by v.id desc limit 1),
          -- Også når den er eldre enn de ti kjøringene over.
          'sist_vellykket_kl', (select coalesce(v.avsluttet_kl, v.startet_kl) from kjoringer v
                                where v.kilde = k.kilde and v.status in ('fullfort', 'delvis', 'uendret')
                                order by v.id desc limit 1)))
        from (select distinct kilde from kjoringer) k), '{}'),
      -- Grensen gjelder hver kilde for seg, så en stor release i den ene ikke
      -- skyver den andre ut.
      'endringer', coalesce((
        select jsonb_agg(to_jsonb(e) - 'txid' - 'nr' order by e.registrert_kl desc, e.id desc)
        from (
          select e.*, row_number() over (partition by e.kilde order by e.registrert_kl desc, e.id desc) as nr
          from datakilder.endringer e
        ) e
        where e.nr <= least(greatest(coalesce(datakilder_status.antall, 200), 1), 1000)), '[]')
    )
  );
end;
$function$;

-- les_fagsaker
CREATE OR REPLACE FUNCTION public.les_fagsaker()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  siste public.kildeovervaking_kjoringer;
begin
  perform intern.krev_systemarkitekt('Bare systemarkitektene kan se kildesakene.');
  select * into siste from public.kildeovervaking_kjoringer j where not j.prove order by j.id desc limit 1;
  return jsonb_build_object(
    'saker', (
      select coalesce(jsonb_agg(intern.kildesak_fagsak(k) order by k.id desc), '[]'::jsonb)
      from (
        select * from public.kildefunn a
        where a.tilstand in ('beslutning', 'oppfolging') or (a.tilstand = 'faglig_gjennomgang' and a.alvor = 'sikkerhet')
        union all
        (select * from public.kildefunn b
         where b.tilstand = 'avsluttet' and b.sporsmal is not null and b.utfall in ('tiltak_kontrollert', 'prove')
         order by b.avsluttet_kl desc, b.id desc limit 20)
      ) k
    ),
    'teknisk', case
      when siste.id is null or jsonb_array_length(siste.feil) > 0 or siste.kjort_kl < now() - interval '8 days' then 'ukjent'
      when exists (
        select 1 from public.kildefunn k
        where not k.prove and k.tilstand <> 'avsluttet' and (k.tilstand in ('teknisk_utredning', 'uavklart', 'faglig_gjennomgang') or k.nytt_innhold_kl is not null)
      ) then 'oppfolging'
      else 'normal'
    end,
    'sist_kontrollert_kl', siste.kjort_kl
  );
end;
$function$;

-- beslutt_fagsak
CREATE OR REPLACE FUNCTION public.beslutt_fagsak(sak bigint, versjon integer, valg text, merknad text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  rad public.kildefunn;
  v text := beslutt_fagsak.valg;
  m text := nullif(btrim(coalesce(beslutt_fagsak.merknad, '')), '');
  b jsonb;
  sperren uuid;
  til text;
begin
  perform intern.krev_systemarkitekt('Bare systemarkitektene kan ta stilling til kildesakene.');
  select * into rad from public.kildefunn k where k.id = beslutt_fagsak.sak for update;
  if not found then
    raise exception 'Saken finnes ikke.' using errcode = '55000';
  end if;
  if rad.versjon <> beslutt_fagsak.versjon then
    return 'endret';
  end if;
  if rad.tilstand <> 'beslutning' or rad.sporsmal is null or rad.nytt_innhold_kl is not null then
    raise exception 'Saken venter ikke på en beslutning. Hent sakene på nytt.' using errcode = '55000';
  end if;
  if v is null or not exists (select 1 from jsonb_array_elements(rad.sporsmal -> 'valg') x where x ->> 'valg' = v) then
    raise exception 'Valget tilbys ikke i denne saken.' using errcode = '22023';
  end if;
  if m is not null and char_length(m) > 2000 then
    raise exception 'Merknaden kan ha høyst 2000 tegn.' using errcode = '22023';
  end if;

  til := case when v = 'utsett' then 'beslutning' else 'oppfolging' end;
  update public.kildefunn k
  set valg = v, valg_merknad = m, valg_av = (select auth.uid()), valg_kl = now(), tilstand = til, versjon = k.versjon + 1, endret_kl = now()
  where k.id = rad.id;
  perform intern.kildesak_hendelse(rad.id, 'beslutning', rad.tilstand, til, (select auth.uid()), null,
    jsonb_build_object('valg', v, 'merknad', m, 'sporsmal', rad.sporsmal));

  if v = 'behold' then
    insert into public.kildefunn_tiltak (funn, art) values (rad.id, 'nytt_grunnlag');
  elsif v = 'revider' then
    insert into public.kildefunn_tiltak (funn, art) values (rad.id, 'ny_regelversjon');
  elsif v = 'deaktiver' then
    for b in select x from jsonb_array_elements(rad.sporsmal -> 'berorte') x loop
      select s.id into sperren from public.verktoysperrer s where s.omfang = 'regel' and s.mal = b ->> 'regel' and s.opphevet_kl is null;
      if not found then
        insert into public.verktoysperrer (omfang, mal, grunn, satt_av)
        values ('regel', b ->> 'regel', left(format('Kildesak nr. %s: %s', rad.id, rad.sporsmal ->> 'tittel'), 500), (select auth.uid()))
        returning id into sperren;
      end if;
      insert into public.kildefunn_tiltak (funn, art, regel, sperre, status, bevis, endret_av)
      values (rad.id, 'sperre', b ->> 'regel', sperren, 'kontrollert', 'Nødstoppen for regelen er aktiv.', (select auth.uid()));
    end loop;
    perform intern.kildesak_ferdig(rad.id, (select auth.uid()), null);
  end if;
  return 'registrert';
end;
$function$;

-- les_kildeovervaking
CREATE OR REPLACE FUNCTION public.les_kildeovervaking(historikk integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  antall integer := least(greatest(coalesce(historikk, 0), 0), 200);
begin
  perform intern.krev_systemarkitekt('Bare systemarkitektene kan se kildeovervåkingen.');
  return jsonb_build_object(
    'funn', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', k.id,
          'funn', k.funn,
          'kilde', k.kilde,
          'art', k.art,
          'prioritet', k.prioritet,
          'prove', k.prove,
          'etikett', k.etikett,
          'detaljer', coalesce(k.innhold -> 'detaljer', '[]'::jsonb),
          'berorte', coalesce(k.innhold -> 'berorte', '[]'::jsonb),
          'opprettet_kl', k.opprettet_kl,
          'sist_sett_kl', (select j.kjort_kl from public.kildeovervaking_kjoringer j where j.id = k.sist_sett_kjoring),
          'borte_kl', (select j.kjort_kl from public.kildeovervaking_kjoringer j where j.id = k.borte_kjoring),
          'erstatter', k.erstatter,
          'tilstand', k.tilstand,
          'versjon', k.versjon,
          'alvor', k.alvor,
          'konklusjon', k.konklusjon,
          'konklusjon_tekst', k.konklusjon_tekst,
          'konklusjon_kl', k.konklusjon_kl,
          'nytt_innhold_kl', k.nytt_innhold_kl,
          'utfall', k.utfall,
          'avsluttet_kl', k.avsluttet_kl,
          'teknisk_vurdering', k.teknisk_vurdering,
          'teknisk_av', coalesce(intern.profilnavn(k.teknisk_av), k.teknisk_agent),
          'beslutning', k.beslutning,
          'beslutning_av', intern.profilnavn(k.beslutning_av),
          'tiltak', (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'art', t.art, 'regel', t.regel, 'status', t.status, 'lenke', t.lenke, 'bevis', t.bevis, 'endret_kl', t.endret_kl) order by t.id), '[]'::jsonb)
                     from public.kildefunn_tiltak t where t.funn = k.id),
          'hendelser', (select coalesce(jsonb_agg(jsonb_build_object('kl', h.kl, 'art', h.art, 'fra', h.fra, 'til', h.til, 'av', coalesce(intern.profilnavn(h.av), h.agent)) order by h.id), '[]'::jsonb)
                        from public.kildefunn_hendelser h where h.funn = k.id)
        ) order by k.id desc), '[]'::jsonb)
      from (
        select * from public.kildefunn a where a.tilstand <> 'avsluttet'
        union all
        (select * from public.kildefunn b where b.tilstand = 'avsluttet' order by b.id desc limit antall)
      ) k
    ),
    'kjoringer', (
      select coalesce(jsonb_agg(intern.kildeovervaking_kjoring(j) order by j.id desc), '[]'::jsonb)
      from public.kildeovervaking_kjoringer j
      where j.id in (select x.id from public.kildeovervaking_kjoringer x order by x.id desc limit antall)
    ),
    'siste', (
      select intern.kildeovervaking_kjoring(j)
      from public.kildeovervaking_kjoringer j
      where not j.prove
      order by j.id desc
      limit 1
    )
  );
end;
$function$;

-- sett_verktoysperre
CREATE OR REPLACE FUNCTION public.sett_verktoysperre(omfang text, mal text, grunn text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  ny uuid;
begin
  perform intern.krev_systemarkitekt('Bare systemarkitektene kan deaktivere kliniske verktøy.');
  insert into public.verktoysperrer (omfang, mal, grunn, satt_av)
  values (sett_verktoysperre.omfang, nullif(btrim(sett_verktoysperre.mal), ''), btrim(sett_verktoysperre.grunn), (select auth.uid()))
  returning id into ny;
  return ny;
exception
  when unique_violation then
    raise exception 'Det er allerede en aktiv sperre for dette.' using errcode = '23505';
end;
$function$;

-- opphev_verktoysperre
CREATE OR REPLACE FUNCTION public.opphev_verktoysperre(sperre uuid, grunn text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform intern.krev_systemarkitekt('Bare systemarkitektene kan oppheve en sperre.');
  update public.verktoysperrer s
  set opphevet_kl = greatest(now(), s.satt_kl), opphevet_av = (select auth.uid()), opphevet_grunn = btrim(opphev_verktoysperre.grunn)
  where s.id = opphev_verktoysperre.sperre and s.opphevet_kl is null;
  if not found then
    raise exception 'Sperren finnes ikke, eller er allerede opphevet.' using errcode = '55000';
  end if;
end;
$function$;

-- verktoysperrehistorikk
CREATE OR REPLACE FUNCTION public.verktoysperrehistorikk()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  perform intern.krev_systemarkitekt('Bare systemarkitektene kan se historikken for sperrene.');
  return (
    select coalesce(jsonb_agg(jsonb_build_object(
        'id', s.id,
        'omfang', s.omfang,
        'mal', s.mal,
        'grunn', s.grunn,
        'satt_kl', s.satt_kl,
        'satt_av', intern.profilnavn(s.satt_av),
        'opphevet_kl', s.opphevet_kl,
        'opphevet_av', intern.profilnavn(s.opphevet_av),
        'opphevet_grunn', s.opphevet_grunn
      ) order by s.satt_kl desc, s.id), '[]'::jsonb)
    from public.verktoysperrer s
  );
end;
$function$;

-- gjenopprett_stoff
CREATE OR REPLACE FUNCTION public.gjenopprett_stoff(stoff text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  bruker uuid := intern.krev_registerbruker();
  rad public.stoffstatus;
begin
  select * into rad from public.stoffstatus s
  where s.stoff = gjenopprett_stoff.stoff and s.status = 'papirkurv'
  for update;
  if rad.stoff is null then
    raise exception 'Fagsiden ligger ikke i papirkurven.' using errcode = 'P0002';
  end if;
  if not intern.er_systemarkitekt(bruker) and rad.endret_av is distinct from bruker then
    raise exception 'Bare systemarkitektene kan hente fagsider tilbake fra papirkurven.' using errcode = '42501';
  end if;
  delete from public.stoffstatus s where s.stoff = rad.stoff;
end;
$function$;

-- slett_stoff
CREATE OR REPLACE FUNCTION public.slett_stoff(stoff text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  bruker uuid := intern.krev_registerbruker();
  side uuid;
begin
  select s.objekt_id into side from public.infosider s where s.slug = slett_stoff.stoff limit 1;
  if side is null then
    raise exception 'Stoffet har ingen fagside å slette. Arkiver det i stedet.' using errcode = '22023';
  end if;
  if exists (select 1 from public.analyttkoblede_stoffer a where a.stoff = slett_stoff.stoff) then
    raise exception 'Fagsiden er koblet til laboratorieanalyser i fortolkningen og kan ikke slettes. Arkiver den i stedet.'
      using errcode = '22023';
  end if;
  if not intern.er_systemarkitekt(bruker) and intern.stoffside_har_innhold(side) then
    raise exception 'Bare systemarkitektene kan slette en fagside med innhold. Arkiver den i stedet.' using errcode = '42501';
  end if;
  insert into public.stoffstatus (stoff, status, endret_av)
  values (slett_stoff.stoff, 'papirkurv', bruker)
  on conflict on constraint stoffstatus_pkey do update set status = 'papirkurv', endret_av = excluded.endret_av, endret_kl = now();
end;
$function$;

-- slett_stoffkategori
CREATE OR REPLACE FUNCTION public.slett_stoffkategori(kategori uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  rad public.stoffkategorier;
begin
  perform intern.krev_registerbruker();
  rad := intern.laas_stoffkategori(slett_stoffkategori.kategori);
  if not intern.er_systemarkitekt((select auth.uid())) and exists (
    select 1 from public.stoffplasseringer p
    join public.stoffkategorier k on k.id = p.kategori_id
    where k.id = rad.id or k.forelder_id = rad.id
  ) then
    raise exception 'Kategorien har stoffer. Flytt dem først, eller be en systemarkitekt slette den.' using errcode = '42501';
  end if;
  delete from public.stoffkategorier k where k.id = rad.id;
  perform intern.ordne_stoffkategorier(rad.forelder_id);
end;
$function$;

-- les_stoffregister
CREATE OR REPLACE FUNCTION public.les_stoffregister(sidetilstand objekttilstand)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select intern.krev_aktivt_medlemskap();
  with tilstand as (
    select case when intern.er_systemarkitekt((select auth.uid())) then les_stoffregister.sidetilstand else 'publisert'::public.objekttilstand end as t
  )
  select jsonb_build_object(
    'kategorier', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', k.id, 'forelder', k.forelder_id, 'navn', k.navn, 'posisjon', k.posisjon,
          'ikon', k.ikon, 'arkivert_kl', k.arkivert_kl
        )
        order by k.posisjon, k.opprettet_kl, k.id
      )
      from public.stoffkategorier k
    ), '[]'::jsonb),
    'plasseringer', coalesce((
      select jsonb_agg(jsonb_build_object('stoff', p.stoff, 'kategori', p.kategori_id) order by p.stoff collate "C", p.kategori_id)
      from public.stoffplasseringer p
    ), '[]'::jsonb),
    'status', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'stoff', s.stoff, 'status', s.status, 'endret_kl', s.endret_kl,
          'endret_av', nullif(btrim(concat_ws(' ', p.first_name, p.last_name)), '')
        )
        order by s.stoff collate "C"
      )
      from public.stoffstatus s
      left join public.profiles p on p.id = s.endret_av
    ), '[]'::jsonb),
    'sider', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', s.objekt_id, 'slug', s.slug, 'navn', s.navn,
          'innhold', intern.stoffside_har_innhold(s.objekt_id),
          'oppsummering', (
            select e.data -> 'dokument'
            from public.innholdselementer e
            where e.infoside_id = s.objekt_id and e.tilstand = s.tilstand
              and e.panel = 'identitet' and e.elementtype = 'riktekst'
            limit 1
          )
        )
        order by lower(s.navn)
      )
      from public.infosider s, tilstand
      where s.tilstand = tilstand.t
    ), '[]'::jsonb)
  )
$function$;

-- slett_stoff_for_godt
CREATE OR REPLACE FUNCTION public.slett_stoff_for_godt(stoff text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  admin public.profiles := intern.krev_systemarkitekt('Bare systemarkitektene kan slette fagsider for godt.');
begin
  if not exists (
    select 1 from public.stoffstatus s
    where s.stoff = slett_stoff_for_godt.stoff and s.status = 'papirkurv'
    for update
  ) then
    raise exception 'Fagsiden ligger ikke i papirkurven.' using errcode = 'P0002';
  end if;
  perform intern.fjern_stoff(slett_stoff_for_godt.stoff, admin.id);
end;
$function$;

-- tom_stoffpapirkurven
CREATE OR REPLACE FUNCTION public.tom_stoffpapirkurven()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  admin public.profiles := intern.krev_systemarkitekt('Bare systemarkitektene kan tømme papirkurven.');
begin
  return intern.tom_papirkurv(null, admin.id);
end;
$function$;

-- admin_aktor
CREATE OR REPLACE FUNCTION kuratering.admin_aktor()
 RETURNS kuratering.aktor
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  ut kuratering.aktor;
begin
  ut.profil := intern.krev_systemarkitekt('Bare systemarkitektene kan styre kurateringene.');
  ut.admin := true;
  ut.roller := '{}';
  return ut;
end;
$function$;

