-- Varsler på enheten om nye chatmeldinger (push), for gruppechatten og
-- direktemeldingene. Se docs/chatvarsler.md.
--
-- Peder ba om dem 19.11.2026 («Innfør muligheten for å få skrivebordsvarsler
-- eller varsler på mobil hvis man får nye meldinger i chatten»). Hver bruker
-- slår dem på selv, per enhet, under Konto → Innstillinger → Chat.
--
-- Slik henger det sammen:
--   1. Nettleseren abonnerer hos sin egen push-tjeneste og lagrer abonnementet
--      her (`lagre_pushabonnement`). Det slettes når brukeren slår av, logger
--      ut, eller push-tjenesten sier at det ikke finnes lenger.
--   2. En ny melding legger meldingens ID i køen `intern.chatvarselko`, men
--      bare når noen som kan få et varsel om den, har et abonnement.
--   3. Den samme utløseren ber Edge-funksjonen `chatvarsel-utsending` sende
--      (`intern.chatvarsel_vekk`, med pg_net etter at meldingen er lagret),
--      uavhengig av avsenderens fane. Funksjonen venter litt, så en mottaker
--      som har samtalen åpen, rekker å lese, og gjør meldingene om til ett
--      varsel per mottakers enhet og samtale (`intern.chatvarselutsendinger`,
--      `chatvarsel_hent`). Et varsel slettes når push-tjenesten har tatt imot
--      det (`chatvarsel_kvitter`); en midlertidig feil gir nye forsøk.
--
-- Varselet har aldri meldingsteksten eller avsenderens navn: bare gruppens
-- navn eller «Direktemelding», antallet uleste og adressen til samtalen
-- (docs/gruppechat-personvern.md og docs/direktemeldinger-personvern.md).
-- Køen og utsendingene har bare ID-er og endepunkter. En rad brukes aldri
-- etter ti minutter, og det som er eldre, slettes ved neste henting eller
-- melding i køen og senest av nattjobben (`intern.rydd_chatvarselko()`).
--
-- Tilbakeføring: en ny migrasjon som fjerner utløserne og funksjonene herfra
-- og tabellene `public.pushabonnementer`, `intern.chatvarselko` og
-- `intern.chatvarselutsendinger`. pg_net kan stå.

-- pg_net sender kallet til Edge-funksjonen etter at meldingen er lagret. Den
-- finnes i Supabase; i testdatabasen, der den ikke finnes, hoppes kallet over
-- (`intern.chatvarsel_vekk`).
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end
$$;

-- --- Tabellene --------------------------------------------------------------------

-- Ett abonnement per nettleser og enhet. Endepunktet er push-tjenestens
-- adresse for nettopp denne nettleseren; nøklene krypterer varselet så bare
-- den kan lese det.
create table public.pushabonnementer (
  endepunkt text primary key,
  bruker_id uuid not null references public.profiles (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  opprettet_kl timestamptz not null default now(),
  endret_kl timestamptz not null default now(),
  constraint pushabonnementer_endepunkt check (endepunkt ~ '^https://[^/?#@\s]+/' and char_length(endepunkt) <= 1000),
  -- Base64url: en offentlig P-256-nøkkel (65 byte) og en hemmelighet på 16 byte.
  constraint pushabonnementer_p256dh check (p256dh ~ '^[A-Za-z0-9_-]{86,88}={0,2}$'),
  constraint pushabonnementer_auth check (auth ~ '^[A-Za-z0-9_-]{21,24}={0,2}$')
);

create index pushabonnementer_bruker_idx on public.pushabonnementer (bruker_id, endret_kl);

comment on table public.pushabonnementer is
  'Varsler om nye chatmeldinger: én rad per enhet som har slått dem på. Bare gjennom funksjonene. Se docs/chatvarsler.md.';

alter table public.pushabonnementer enable row level security;
revoke all on public.pushabonnementer from anon, authenticated;

create policy aktivt_medlemskap on public.pushabonnementer as restrictive for all to authenticated
using ((select public.har_aktivt_medlemskap()))
with check ((select public.har_aktivt_medlemskap()));

-- Meldingene det ikke er sendt varsler om ennå. Bare ID-er.
create table intern.chatvarselko (
  melding uuid primary key,
  slag text not null,
  samtale uuid not null,
  avsender uuid not null,
  kl timestamptz not null default now(),
  constraint chatvarselko_slag check (slag in ('gruppe', 'direkte'))
);

create index chatvarselko_avsender_idx on intern.chatvarselko (avsender);
create index chatvarselko_kl_idx on intern.chatvarselko (kl);

comment on table intern.chatvarselko is
  'Meldinger det skal sendes varsler om: bare ID-ene. Tømmes av chatvarsel_hent, og brukes aldri etter chatvarsel_frist(). Se docs/chatvarsler.md.';

revoke all on intern.chatvarselko from public, anon, authenticated, service_role;

-- Varslene som skal sendes: ett per enhet og samtale, med tidspunktet for den
-- nyeste meldingen det gjelder. Flere meldinger i samme samtale blir ett
-- varsel. `neste_kl` er når det kan prøves (igjen); mens et forsøk pågår,
-- står den litt fram i tid, så to utsendinger aldri sender det samme.
create table intern.chatvarselutsendinger (
  endepunkt text not null references public.pushabonnementer (endepunkt) on delete cascade,
  slag text not null,
  samtale uuid not null,
  kl timestamptz not null default now(),
  forsok integer not null default 0,
  neste_kl timestamptz not null default now(),
  primary key (endepunkt, slag, samtale),
  constraint chatvarselutsendinger_slag check (slag in ('gruppe', 'direkte'))
);

create index chatvarselutsendinger_neste_idx on intern.chatvarselutsendinger (neste_kl);
create index chatvarselutsendinger_kl_idx on intern.chatvarselutsendinger (kl);

comment on table intern.chatvarselutsendinger is
  'Varsler som venter på push-tjenesten: endepunkt, samtale og forsøk, ingen tekst. Slettes når de er sendt, og er aldri eldre enn chatvarsel_frist(). Se docs/chatvarsler.md.';

revoke all on intern.chatvarselutsendinger from public, anon, authenticated, service_role;

-- --- Grensene ----------------------------------------------------------------------

-- Hvor gammel en melding kan være før det er for sent å varsle om den, og hvor
-- mange enheter én bruker kan ha.
create function intern.chatvarsel_frist()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '10 minutes' $$;

revoke all on function intern.chatvarsel_frist() from public, anon, authenticated, service_role;

create function intern.maks_pushabonnementer()
returns integer
language sql
immutable
set search_path = ''
as $$ select 10 $$;

revoke all on function intern.maks_pushabonnementer() from public, anon, authenticated, service_role;

-- Hvor lenge en ny melding venter før varselet lages: en mottaker som har
-- samtalen åpen, rekker å lese den først og får da ikke noe varsel.
create function intern.chatvarsel_ventetid()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '1.5 seconds' $$;

revoke all on function intern.chatvarsel_ventetid() from public, anon, authenticated, service_role;

-- Hvor mange ganger et varsel prøves før det gis opp, og hvor lenge et forsøk
-- holder det for seg selv.
create function intern.chatvarsel_maks_forsok()
returns integer
language sql
immutable
set search_path = ''
as $$ select 5 $$;

revoke all on function intern.chatvarsel_maks_forsok() from public, anon, authenticated, service_role;

create function intern.chatvarsel_laas()
returns interval
language sql
immutable
set search_path = ''
as $$ select interval '1 minute' $$;

revoke all on function intern.chatvarsel_laas() from public, anon, authenticated, service_role;

-- --- Abonnementene, fra nettleseren ---------------------------------------------------

-- Lagrer abonnementet til denne enheten for den innloggede. Den eldste
-- enheten faller ut når det blir for mange. Uendret abonnement skriver
-- ingenting. Et endepunkt som står på en annen konto, røres ikke: appen
-- avslutter abonnementet på enheten når en annen logger inn der, og
-- nettleseren gir da et nytt endepunkt.
create function public.lagre_pushabonnement(endepunkt text, p256dh text, auth text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
begin
  perform intern.krev_aktivt_medlemskap();
  insert into public.pushabonnementer as p (endepunkt, bruker_id, p256dh, auth)
  values (lagre_pushabonnement.endepunkt, aktor, lagre_pushabonnement.p256dh, lagre_pushabonnement.auth)
  on conflict on constraint pushabonnementer_pkey do update
    set p256dh = excluded.p256dh, auth = excluded.auth, endret_kl = now()
    where p.bruker_id = aktor and (p.p256dh, p.auth) is distinct from (excluded.p256dh, excluded.auth);
  delete from public.pushabonnementer x
  where x.bruker_id = aktor
    and x.endepunkt in (
      select y.endepunkt from public.pushabonnementer y
      where y.bruker_id = aktor
      order by y.endret_kl desc, y.endepunkt
      offset intern.maks_pushabonnementer()
    );
end;
$$;

revoke all on function public.lagre_pushabonnement(text, text, text) from public, anon, authenticated, service_role;
grant execute on function public.lagre_pushabonnement(text, text, text) to authenticated;

comment on function public.lagre_pushabonnement(text, text, text) is
  'Lagrer varselabonnementet til denne enheten for den innloggede. Se docs/chatvarsler.md.';

-- Sletter abonnementet til denne enheten for den innloggede.
create function public.slett_pushabonnement(endepunkt text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  delete from public.pushabonnementer p
  where p.endepunkt = slett_pushabonnement.endepunkt and p.bruker_id = (select auth.uid());
end;
$$;

revoke all on function public.slett_pushabonnement(text) from public, anon, authenticated, service_role;
grant execute on function public.slett_pushabonnement(text) to authenticated;

comment on function public.slett_pushabonnement(text) is
  'Sletter varselabonnementet til denne enheten. Se docs/chatvarsler.md.';

-- --- Køen, fra meldingene -------------------------------------------------------------

-- Hvem som kan få et varsel om en ny melding: i gruppechatten de andre aktive
-- medlemmene som leser gruppen (som de gamle varslene i bjella), i en
-- direktesamtale den andre, når den kan motta fra avsenderen og ikke har
-- dempet samtalen. Brukes både av utløserne og når varslene hentes, så de to
-- aldri er uenige.
create function intern.chatvarselmottakere(slag text, samtale uuid, avsender uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.bruker_id
  from public.gruppemedlemskap m
  where chatvarselmottakere.slag = 'gruppe'
    and intern.gruppechat_aktivert()
    and m.gruppe_id = chatvarselmottakere.samtale
    and m.status = 'aktiv'
    and m.bruker_id is distinct from chatvarselmottakere.avsender
    and intern.kan_lese_gruppe(chatvarselmottakere.samtale, m.bruker_id)
  union
  select motpart
  from public.direktesamtaler s
  cross join lateral (select intern.direkte_motpart(s, chatvarselmottakere.avsender) as motpart) x
  where chatvarselmottakere.slag = 'direkte'
    and intern.direktemeldinger_aktivert()
    and s.id = chatvarselmottakere.samtale
    and chatvarselmottakere.avsender in (s.bruker_lav, s.bruker_hoy)
    and intern.kan_motta_fra(x.motpart, chatvarselmottakere.avsender)
    and not coalesce((
      select st.dempet from public.direktesamtale_status st
      where st.samtale_id = s.id and st.bruker_id = x.motpart
    ), false)
$$;

revoke all on function intern.chatvarselmottakere(text, uuid, uuid) from public, anon, authenticated, service_role;

-- Sletter det i køen og i utsendingene som er eldre enn fristen, og gir hvor
-- mange. Kalles ved
-- hver henting og hver ny rad i køen, og av nattjobben
-- (`.github/workflows/gruppechat-lagringstid.yml`), så ingenting blir liggende
-- når ingen sender mer.
create function intern.rydd_chatvarselko()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  antall integer;
  slettet integer;
begin
  delete from intern.chatvarselko k where k.kl < now() - intern.chatvarsel_frist();
  get diagnostics antall = row_count;
  delete from intern.chatvarselutsendinger u where u.kl < now() - intern.chatvarsel_frist();
  get diagnostics slettet = row_count;
  return antall + slettet;
end;
$$;

revoke all on function intern.rydd_chatvarselko() from public, anon, authenticated, service_role;

-- Ber Edge-funksjonen `chatvarsel-utsending` sende varslene som venter. pg_net
-- sender kallet etter at transaksjonen er lagret (og ikke om den rulles
-- tilbake). Adressen og den hemmelige nøkkelen funksjonen krever, ligger i
-- Vault (`chatvarsel_adresse`, `chatvarsel_utloser`); mangler pg_net, Vault
-- eller de to, gjøres ingenting. En feil her stopper aldri meldingen.
create function intern.chatvarsel_vekk()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  adresse text;
  hemmelighet text;
begin
  if to_regclass('vault.decrypted_secrets') is null or to_regnamespace('net') is null then
    return;
  end if;
  execute $sql$
    select max(s.decrypted_secret) filter (where s.name = 'chatvarsel_adresse'),
           max(s.decrypted_secret) filter (where s.name = 'chatvarsel_utloser')
    from vault.decrypted_secrets s
    where s.name in ('chatvarsel_adresse', 'chatvarsel_utloser')
  $sql$ into adresse, hemmelighet;
  if adresse is null or hemmelighet is null then
    return;
  end if;
  execute 'select net.http_post(url => $1, body => $2, headers => $3, timeout_milliseconds => 5000)'
    using adresse, '{}'::jsonb, jsonb_build_object('Content-Type', 'application/json', 'x-chatvarsel-utloser', hemmelighet);
exception when others then
  raise warning 'chatvarsel_vekk: %', sqlstate;
end;
$$;

revoke all on function intern.chatvarsel_vekk() from public, anon, authenticated, service_role;

-- Legger en ny melding i køen når minst én mottaker har en enhet med varsler
-- på, og ber om utsendingen.
create function intern.ko_chatvarsel()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  slag text;
  samtale uuid;
begin
  if new.forfatter_id is null or new.slettet_kl is not null then
    return null;
  end if;
  -- Feltene leses bare i grenen for tabellen de finnes i.
  if tg_table_name = 'gruppemeldinger' then
    slag := 'gruppe';
    samtale := new.gruppe_id;
  else
    slag := 'direkte';
    samtale := new.samtale_id;
  end if;
  if exists (
    select 1 from intern.chatvarselmottakere(slag, samtale, new.forfatter_id) m(bruker_id)
    join public.pushabonnementer p on p.bruker_id = m.bruker_id
  ) then
    perform intern.rydd_chatvarselko();
    insert into intern.chatvarselko (melding, slag, samtale, avsender)
    values (new.id, slag, samtale, new.forfatter_id)
    on conflict (melding) do nothing;
    perform intern.chatvarsel_vekk();
  end if;
  return null;
end;
$$;

revoke all on function intern.ko_chatvarsel() from public, anon, authenticated, service_role;

create trigger gruppemeldinger_chatvarsel
after insert on public.gruppemeldinger
for each row execute function intern.ko_chatvarsel();

create trigger direktemeldinger_chatvarsel
after insert on public.direktemeldinger
for each row execute function intern.ko_chatvarsel();

-- --- Utsendingen, fra Edge-funksjonen --------------------------------------------------

-- Om `bruker` fortsatt kan få varsel om samtalen: om den ville vært mottaker
-- av en ny melding der nå, etter de samme reglene som da varselet ble til
-- (`chatvarselmottakere`). I en direktesamtale er avsenderen den andre i
-- samtalen, så medlemskapet, `Tillat direktemeldinger`, blokkeringen og
-- dempingen prøves på nytt. Prøves ved hvert forsøk, så et varsel som venter,
-- ikke går til en som har mistet tilgangen.
create function intern.chatvarsel_har_tilgang(slag text, samtale uuid, bruker uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(chatvarsel_har_tilgang.bruker in (
    select m.bruker_id
    from intern.chatvarselmottakere(
      chatvarsel_har_tilgang.slag,
      chatvarsel_har_tilgang.samtale,
      case when chatvarsel_har_tilgang.slag = 'direkte' then (
        select intern.direkte_motpart(s, chatvarsel_har_tilgang.bruker)
        from public.direktesamtaler s
        where s.id = chatvarsel_har_tilgang.samtale
          and chatvarsel_har_tilgang.bruker in (s.bruker_lav, s.bruker_hoy)
      ) end
    ) m(bruker_id)
  ), false)
$$;

revoke all on function intern.chatvarsel_har_tilgang(text, uuid, uuid) from public, anon, authenticated, service_role;

-- Gir varslene som skal sendes nå. Først blir meldingene som har ventet
-- `chatvarsel_ventetid()`, ett varsel per mottakers enhet og samtale; så tas
-- de varslene som kan prøves, med endepunktet og nøklene, gruppens navn og
-- hvor mange uleste mottakeren har der nå. Hvert forsøk holder varselet for
-- seg selv i `chatvarsel_laas()`, så en annen utsending ikke sender det
-- samme. Et varsel til en som alt har lest, eller som ikke lenger har
-- tilgang, slettes uten å sendes. Det som er for gammelt, kastes. Bare med
-- den hemmelige nøkkelen (`chatvarsel-utsending`).
create function public.chatvarsel_hent()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  kandidater jsonb;
begin
  perform intern.rydd_chatvarselko();

  with tatt as (
    delete from intern.chatvarselko k
    where k.kl <= now() - intern.chatvarsel_ventetid()
    returning k.slag, k.samtale, k.avsender, k.kl
  )
  insert into intern.chatvarselutsendinger as u (endepunkt, slag, samtale, kl)
  select p.endepunkt, t.slag, t.samtale, max(t.kl)
  from tatt t
  cross join lateral intern.chatvarselmottakere(t.slag, t.samtale, t.avsender) m(bruker_id)
  join public.pushabonnementer p on p.bruker_id = m.bruker_id
  group by p.endepunkt, t.slag, t.samtale
  on conflict (endepunkt, slag, samtale) do update
    set kl = greatest(u.kl, excluded.kl), forsok = 0;

  with klare as (
    select u.endepunkt, u.slag, u.samtale
    from intern.chatvarselutsendinger u
    where u.neste_kl <= now() and u.forsok < intern.chatvarsel_maks_forsok()
    order by u.neste_kl
    limit 500
    for update skip locked
  ),
  tatt as (
    update intern.chatvarselutsendinger u
    set forsok = u.forsok + 1, neste_kl = now() + intern.chatvarsel_laas()
    from klare k
    where (u.endepunkt, u.slag, u.samtale) = (k.endepunkt, k.slag, k.samtale)
    returning u.endepunkt, u.slag, u.samtale, u.kl
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'endepunkt', t.endepunkt,
      'p256dh', p.p256dh,
      'auth', p.auth,
      'slag', t.slag,
      'samtale', t.samtale,
      'gruppenavn', g.navn,
      'kl', t.kl,
      'tilgang', intern.chatvarsel_har_tilgang(t.slag, t.samtale, p.bruker_id),
      'uleste', case t.slag
        when 'gruppe' then intern.gruppechat_uleste(t.samtale, p.bruker_id)
        else intern.direktesamtale_uleste(t.samtale, p.bruker_id)
      end
    )
    order by t.endepunkt, t.samtale
  ), '[]'::jsonb)
  into kandidater
  from tatt t
  join public.pushabonnementer p on p.endepunkt = t.endepunkt
  left join public.grupper g on t.slag = 'gruppe' and g.id = t.samtale;

  delete from intern.chatvarselutsendinger u
  using jsonb_to_recordset(kandidater) as x(endepunkt text, slag text, samtale uuid, kl timestamptz, tilgang boolean, uleste integer)
  where (u.endepunkt, u.slag, u.samtale) = (x.endepunkt, x.slag, x.samtale)
    and u.kl <= x.kl
    and (not x.tilgang or x.uleste <= 0);

  return coalesce((
    select jsonb_agg(v - 'tilgang')
    from jsonb_array_elements(kandidater) v
    where (v ->> 'tilgang')::boolean and (v ->> 'uleste')::integer > 0
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.chatvarsel_hent() from public, anon, authenticated, service_role;
grant execute on function public.chatvarsel_hent() to service_role;

comment on function public.chatvarsel_hent() is
  'Gir varslene som skal sendes nå, uten tekst og avsendernavn, og holder dem mens de sendes. Bare for Edge-funksjonen chatvarsel-utsending. Se docs/chatvarsler.md.';

-- Svarene fra Edge-funksjonen som rader; ukjente svar tas ikke med.
create function intern.chatvarselsvar(utfall jsonb)
returns table (endepunkt text, slag text, samtale uuid, kl timestamptz, svar text)
language sql
immutable
set search_path = ''
as $$
  select x.endepunkt, x.slag, x.samtale, x.kl, x.svar
  from jsonb_to_recordset(chatvarselsvar.utfall) as x(endepunkt text, slag text, samtale uuid, kl timestamptz, svar text)
  where x.svar in ('sendt', 'hoppet', 'feil', 'borte')
$$;

revoke all on function intern.chatvarselsvar(jsonb) from public, anon, authenticated, service_role;

-- Hva push-tjenesten svarte på hvert varsel fra `chatvarsel_hent`:
--   sendt  – slettes, med mindre en nyere melding har kommet til; da kan det
--            sendes igjen med en gang, med det nye antallet;
--   hoppet – slettes uten å sendes (endepunktet er ikke en kjent push-tjeneste);
--   feil   – prøves igjen etter 1, 4, 9 … sekunder, høyst `chatvarsel_maks_forsok()` ganger;
--   borte  – abonnementet finnes ikke lenger og slettes, med varslene sine.
create function public.chatvarsel_kvitter(utfall jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.pushabonnementer p
  using intern.chatvarselsvar(chatvarsel_kvitter.utfall) r
  where r.svar = 'borte' and p.endepunkt = r.endepunkt;

  delete from intern.chatvarselutsendinger u
  using intern.chatvarselsvar(chatvarsel_kvitter.utfall) r
  where r.svar in ('sendt', 'hoppet')
    and (u.endepunkt, u.slag, u.samtale) = (r.endepunkt, r.slag, r.samtale)
    and u.kl <= r.kl;

  update intern.chatvarselutsendinger u
  set neste_kl = case when r.svar = 'feil' then now() + u.forsok * u.forsok * interval '1 second' else now() end,
      forsok = case when r.svar = 'feil' then u.forsok else 0 end
  from intern.chatvarselsvar(chatvarsel_kvitter.utfall) r
  where r.svar in ('sendt', 'hoppet', 'feil')
    and (u.endepunkt, u.slag, u.samtale) = (r.endepunkt, r.slag, r.samtale);
$$;

revoke all on function public.chatvarsel_kvitter(jsonb) from public, anon, authenticated, service_role;
grant execute on function public.chatvarsel_kvitter(jsonb) to service_role;

comment on function public.chatvarsel_kvitter(jsonb) is
  'Fører hva push-tjenesten svarte: sendte varsler slettes, feil prøves igjen, borte abonnementer slettes. Bare for Edge-funksjonen chatvarsel-utsending. Se docs/chatvarsler.md.';
