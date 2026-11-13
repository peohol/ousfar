-- Tilbakefylling av fagmiljøene for dagens kontoer: P1.1 i
-- docs/ousfar-nasjonal-p0-kartlegging.md §8, med Peders beslutninger D1 og D2
-- (§7.2, 13.11.2026).
--
-- - `maxhag` får aktivt primærmedlemskap i OUS Rettstoksikologi, alle andre
--   kontoer i OUS Klinisk farmakologi.
-- - `peohol` og `maxhag` blir systemarkitekter, knyttet til konto-ID-en.
-- - Hver av dagens administratorer blir lokal administrator i sitt eget
--   fagmiljø, altså der primærmedlemskapet er. `maxhag` blir lokal
--   administrator i OUS Rettstoksikologi uansett tidligere rolle.
--
-- Bare for produksjonen: den stopper uten kontoene `peohol` og `maxhag`, som
-- en ny database ikke har (`BARE_I_PRODUKSJON` i
-- src/__tests__/hjelp/migrasjonskjoring.ts). Testene i
-- src/__tests__/fagmiljoer.test.ts kjører den mot syntetiske kontoer, med
-- `maxhag` både som administrator og som vanlig bruker.
--
-- Rapporten skriver bare antall, ingen navn eller ID-er. Alt føres i
-- tilgangsloggen med begrunnelsen under.

do $$
declare
  grunn constant text := 'P1.1: tilbakefylling av dagens kontoer (D1, D2)';
  kf uuid;
  rt uuid;
  peohol uuid;
  maxhag uuid;
  profiler integer;
  avvik integer;
  rad record;
begin
  perform set_config('ousfar.tilgangsgrunn', grunn, true);

  select id into kf from public.fagmiljoer where nokkel = 'ous-klinisk-farmakologi' and status = 'aktiv';
  select id into rt from public.fagmiljoer where nokkel = 'ous-rettstoksikologi' and status = 'aktiv';
  if kf is null or rt is null then
    raise exception 'Fagmiljøene OUS Klinisk farmakologi og OUS Rettstoksikologi må finnes og være aktive.';
  end if;

  -- Kontoene slås opp på brukernavnet, som er låst etter opprettelsen, og
  -- knyttes til ID-en. Begge må finnes.
  select id into peohol from public.profiles where username = 'peohol';
  select id into maxhag from public.profiles where username = 'maxhag';
  if peohol is null or maxhag is null then
    raise exception 'Kontoene peohol og maxhag må finnes før fagmiljøene kan fylles.';
  end if;

  -- Rollene kontrolleres før noe tildeles: OUS Klinisk farmakologi skal ikke
  -- stå uten administrator.
  if not exists (select 1 from public.profiles where role = 'admin' and id <> maxhag) then
    raise exception 'Ingen administrator utenom maxhag: OUS Klinisk farmakologi ville stått uten administrator.';
  end if;

  -- Ingen skal ha et gjeldende medlemskap i feil fagmiljø fra før.
  if exists (
    select 1 from public.medlemskap m
    where m.status <> 'deaktivert'
      and m.fagmiljo_id <> case when m.bruker_id = maxhag then rt else kf end
  ) then
    raise exception 'Noen har alt et medlemskap i et annet fagmiljø enn D1 sier.';
  end if;

  select count(*) into profiler from public.profiles;
  raise notice 'Før: % kontoer, hvorav % administratorer; % aktive medlemskap, % lokale administratorer, % systemroller.',
    profiler,
    (select count(*) from public.profiles where role = 'admin'),
    (select count(*) from public.medlemskap where status = 'aktiv'),
    (select count(*) from public.fagmiljoadministratorer where til is null),
    (select count(*) from public.systemroller where tilbakekalt_kl is null);

  -- 1. Systemarkitektene. Først, fordi OUS Rettstoksikologi bare tar imot
  --    systemarkitekter før startporten S2.
  insert into public.systemroller (bruker_id, rolle)
  select b, 'systemarkitekt' from unnest(array[peohol, maxhag]) as b
  where not exists (
    select 1 from public.systemroller s
    where s.bruker_id = b and s.rolle = 'systemarkitekt' and s.tilbakekalt_kl is null
  );

  -- 2. Primærmedlemskapene, for alle som ikke har et ennå.
  insert into public.medlemskap (bruker_id, fagmiljo_id, primaer)
  select p.id, case when p.id = maxhag then rt else kf end, true
  from public.profiles p
  where not exists (
    select 1 from public.medlemskap m where m.bruker_id = p.id and m.primaer and m.status = 'aktiv'
  );

  -- 3. Lokale administratorer: (bruker, fagmiljøet for primærmedlemskapet)
  --    for dagens administratorer, og (maxhag, OUS Rettstoksikologi).
  --    Mengden har ingen duplikater, og eksisterende tildelinger står.
  insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id)
  select ny.bruker_id, ny.fagmiljo_id
  from (
    select p.id as bruker_id, m.fagmiljo_id
    from public.profiles p
    join public.medlemskap m on m.bruker_id = p.id and m.primaer and m.status = 'aktiv'
    where p.role = 'admin'
    union
    select maxhag, rt
  ) ny
  where not exists (
    select 1 from public.fagmiljoadministratorer a
    where a.bruker_id = ny.bruker_id and a.fagmiljo_id = ny.fagmiljo_id and a.til is null
  );

  -- --- Kontroll av sluttilstanden ---------------------------------------------

  if (select count(*) from public.medlemskap where primaer and status = 'aktiv') <> profiler then
    raise exception 'Antall aktive primærmedlemskap er ikke lik antall kontoer.';
  end if;

  if exists (
    select 1 from public.profiles p
    join public.medlemskap m on m.bruker_id = p.id and m.primaer and m.status = 'aktiv'
    where m.fagmiljo_id <> case when p.id = maxhag then rt else kf end
  ) then
    raise exception 'Noen har primærmedlemskap i feil fagmiljø.';
  end if;

  -- Tildelingene skal være nøyaktig den forventede mengden: ingen mangler,
  -- ingen er til overs.
  with forventet as (
    select p.id as bruker_id, case when p.id = maxhag then rt else kf end as fagmiljo_id
    from public.profiles p where p.role = 'admin'
    union
    select maxhag, rt
  ),
  faktisk as (
    select distinct bruker_id, fagmiljo_id from public.fagmiljoadministratorer where til is null
  )
  select count(*) into avvik from (
    (select * from forventet except select * from faktisk)
    union all
    (select * from faktisk except select * from forventet)
  ) x;
  if avvik <> 0 then
    raise exception 'De lokale administratorene avviker fra det forventede i % tilfeller.', avvik;
  end if;

  if exists (
    select 1 from public.fagmiljoadministratorer a
    where a.til is null and not exists (
      select 1 from public.medlemskap m
      where m.bruker_id = a.bruker_id and m.fagmiljo_id = a.fagmiljo_id and m.status = 'aktiv'
    )
  ) then
    raise exception 'En lokal administrator mangler aktivt medlemskap i fagmiljøet.';
  end if;

  if exists (
    select 1 from public.fagmiljoer f
    where f.status = 'aktiv'
      and not exists (select 1 from public.fagmiljoadministratorer a where a.fagmiljo_id = f.id and a.til is null)
  ) then
    raise exception 'Et aktivt fagmiljø står uten administrator.';
  end if;

  if (select array_agg(bruker_id order by bruker_id) from public.systemroller where tilbakekalt_kl is null)
     is distinct from (select array_agg(b order by b) from unnest(array[peohol, maxhag]) b)
  then
    raise exception 'Systemrollene er ikke nøyaktig peohol og maxhag.';
  end if;

  for rad in
    select f.navn,
      (select count(*) from public.medlemskap m where m.fagmiljo_id = f.id and m.status = 'aktiv') as medlemmer,
      (select count(distinct a.bruker_id) from public.fagmiljoadministratorer a where a.fagmiljo_id = f.id and a.til is null) as administratorer
    from public.fagmiljoer f order by f.navn
  loop
    raise notice 'Etter: % har % aktive medlemmer og % lokale administratorer.', rad.navn, rad.medlemmer, rad.administratorer;
  end loop;
  raise notice 'Etter: % systemarkitekter.', (select count(*) from public.systemroller where tilbakekalt_kl is null);

  perform set_config('ousfar.tilgangsgrunn', '', true);
end;
$$;
