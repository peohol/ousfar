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
--   3. Avsenderens nettleser ber Edge-funksjonen `chatvarsel` sende varslene.
--      Den henter køen for avsenderen (`chatvarsel_hent`, bare med den
--      hemmelige nøkkelen), og sender ett kryptert varsel per mottaker og
--      enhet.
--
-- Varselet har aldri meldingsteksten eller avsenderens navn: bare gruppens
-- navn eller «Direktemelding», antallet uleste og adressen til samtalen
-- (docs/gruppechat-personvern.md og docs/direktemeldinger-personvern.md).
-- Køen har bare ID-er. En rad brukes aldri etter ti minutter, og det som er
-- eldre, slettes ved neste henting eller melding i køen og senest av
-- nattjobben (`intern.rydd_chatvarselko()`).
--
-- Tilbakeføring: en ny migrasjon som fjerner utløserne og funksjonene herfra
-- og tabellene `public.pushabonnementer` og `intern.chatvarselko`.

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
  'Meldinger det skal sendes varsler om: bare ID-ene. Tømmes av chatvarsel_hent, og er aldri eldre enn chatvarsel_frist(). Se docs/chatvarsler.md.';

revoke all on intern.chatvarselko from public, anon, authenticated, service_role;

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

-- Sletter det i køen som er eldre enn fristen, og gir hvor mange. Kalles ved
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
begin
  delete from intern.chatvarselko k where k.kl < now() - intern.chatvarsel_frist();
  get diagnostics antall = row_count;
  return antall;
end;
$$;

revoke all on function intern.rydd_chatvarselko() from public, anon, authenticated, service_role;

-- Legger en ny melding i køen når minst én mottaker har en enhet med varsler på.
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

-- Tar avsenderens meldinger ut av køen og gir ett varsel per mottaker,
-- samtale og enhet: endepunktet og nøklene, samtalen, gruppens navn og hvor
-- mange uleste mottakeren har der nå. En mottaker som alt har lest (har
-- samtalen åpen), får ikke noe varsel. Det som er for gammelt, kastes, også
-- for andre avsendere. Bare med den hemmelige nøkkelen (`chatvarsel`).
create function public.chatvarsel_hent(avsender uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  samtaler jsonb;
  varsler jsonb;
begin
  perform intern.rydd_chatvarselko();
  with tatt as (
    delete from intern.chatvarselko k where k.avsender = chatvarsel_hent.avsender
    returning k.slag, k.samtale
  )
  select coalesce(jsonb_agg(distinct jsonb_build_object('slag', t.slag, 'samtale', t.samtale)), '[]'::jsonb)
  into samtaler
  from tatt t;

  with mottakere as (
    select s.slag, s.samtale, m.bruker_id,
      case s.slag
        when 'gruppe' then intern.gruppechat_uleste(s.samtale, m.bruker_id)
        else intern.direktesamtale_uleste(s.samtale, m.bruker_id)
      end as uleste
    from jsonb_to_recordset(samtaler) as s(slag text, samtale uuid)
    cross join lateral intern.chatvarselmottakere(s.slag, s.samtale, chatvarsel_hent.avsender) m(bruker_id)
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'endepunkt', p.endepunkt,
      'p256dh', p.p256dh,
      'auth', p.auth,
      'slag', m.slag,
      'samtale', m.samtale,
      'gruppenavn', g.navn,
      'uleste', m.uleste
    )
    order by p.endepunkt, m.samtale
  ), '[]'::jsonb)
  into varsler
  from mottakere m
  join public.pushabonnementer p on p.bruker_id = m.bruker_id
  left join public.grupper g on m.slag = 'gruppe' and g.id = m.samtale
  where m.uleste > 0;

  return varsler;
end;
$$;

revoke all on function public.chatvarsel_hent(uuid) from public, anon, authenticated, service_role;
grant execute on function public.chatvarsel_hent(uuid) to service_role;

comment on function public.chatvarsel_hent(uuid) is
  'Tar avsenderens meldinger ut av varselkøen og gir varslene som skal sendes, uten tekst og avsendernavn. Bare for Edge-funksjonen chatvarsel. Se docs/chatvarsler.md.';

-- Sletter abonnementene push-tjenesten sier ikke finnes lenger.
create function public.chatvarsel_fjern_abonnementer(endepunkter text[])
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.pushabonnementer p where p.endepunkt = any (chatvarsel_fjern_abonnementer.endepunkter)
$$;

revoke all on function public.chatvarsel_fjern_abonnementer(text[]) from public, anon, authenticated, service_role;
grant execute on function public.chatvarsel_fjern_abonnementer(text[]) to service_role;

comment on function public.chatvarsel_fjern_abonnementer(text[]) is
  'Sletter abonnementer push-tjenesten ikke kjenner lenger. Bare for Edge-funksjonen chatvarsel. Se docs/chatvarsler.md.';
