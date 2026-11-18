-- Fagmiljøet Sandkasse: et eget fagmiljø der systemarkitektene kan prøve ut
-- funksjoner uten at noe av det synes i de virkelige fagmiljøene
-- (docs/fagmiljoer.md, «Fagmiljøene» og «Sandkassen»). Opprettet etter Peders
-- ønske 18.11.2026: «Opprett et nytt fagmiljø som heter Sandkasse … der Max
-- (maxhag) og jeg (peohol) er administratorer.»
--
-- - Sandkasse er ikke standard og ikke åpent for medlemmer: bare
--   systemarkitektene kan være med der (regel 6, startporten S2). Migrasjonen
--   åpner det ikke.
-- - `peohol` og `maxhag` blir aktive medlemmer og lokale administratorer der.
--   Primærmedlemskapet og arbeidsfagmiljøet deres endres ikke.
-- - Ikonet er sandkassen med spaden (`sandkasse` i ikonregisteret).
--
-- Bare for produksjonen: den stopper uten kontoene `peohol` og `maxhag`, som
-- en ny database ikke har (`BARE_I_PRODUKSJON` i
-- src/__tests__/hjelp/migrasjonskjoring.ts). `src/__tests__/sandkasse.test.ts`
-- kjører den mot syntetiske kontoer.
--
-- Den tåler at fagmiljøet alt er opprettet i appen («Nytt fagmiljø» gir
-- samme nøkkel): da får det ikonet, og det som mangler av medlemskap og
-- administratorer, legges til. Til slutt kontrollerer den selv sluttilstanden.
-- Alt føres i tilgangsloggen med grunnen under.
--
-- Tilbakeføring: en ny migrasjon som arkiverer fagmiljøet (`status =
-- 'arkivert'`). Det slettes aldri.

do $$
declare
  grunn constant text := 'Sandkasse: fagmiljø for utprøving, opprettet etter Peders ønske 18.11.2026';
  peohol uuid;
  maxhag uuid;
  sandkasse public.fagmiljoer;
begin
  perform set_config('ousfar.tilgangsgrunn', grunn, true);

  -- Kontoene slås opp på brukernavnet, som er låst etter opprettelsen.
  select id into peohol from public.profiles where username = 'peohol';
  select id into maxhag from public.profiles where username = 'maxhag';
  if peohol is null or maxhag is null then
    raise exception 'Sandkasse: kontoene peohol og maxhag må finnes.';
  end if;

  -- Et fagmiljø som ikke er åpent, tar bare imot systemarkitekter.
  if exists (
    select 1 from unnest(array[peohol, maxhag]) as b
    where not exists (
      select 1 from public.systemroller s
      where s.bruker_id = b and s.rolle = 'systemarkitekt' and s.tilbakekalt_kl is null
    )
  ) then
    raise exception 'Sandkasse: peohol og maxhag må begge være systemarkitekter.';
  end if;

  select * into sandkasse from public.fagmiljoer where nokkel = 'sandkasse';
  if not found then
    if exists (select 1 from public.fagmiljoer where lower(navn) = 'sandkasse') then
      raise exception 'Sandkasse: et annet fagmiljø har alt navnet Sandkasse.';
    end if;
    insert into public.fagmiljoer (nokkel, navn, ikon, standard, apent_for_medlemmer, opprettet_av)
    values ('sandkasse', 'Sandkasse', 'sandkasse', false, false, peohol)
    returning * into sandkasse;
  elsif sandkasse.status <> 'aktiv' or sandkasse.standard or sandkasse.apent_for_medlemmer then
    raise exception 'Sandkasse: fagmiljøet finnes alt, men er arkivert, standard eller åpent for medlemmer.';
  else
    update public.fagmiljoer set ikon = 'sandkasse' where id = sandkasse.id and ikon <> 'sandkasse';
  end if;

  -- Medlemskapene: et aktivt, ikke-primært medlemskap for den som ikke har et
  -- gjeldende (aktivt eller invitert) fra før. En invitasjon gjøres aktiv.
  update public.medlemskap m
  set status = 'aktiv'
  where m.fagmiljo_id = sandkasse.id and m.bruker_id in (peohol, maxhag) and m.status = 'invitert';
  insert into public.medlemskap (bruker_id, fagmiljo_id, primaer, tildelt_av)
  select b, sandkasse.id, false, peohol
  from unnest(array[peohol, maxhag]) as b
  where not exists (
    select 1 from public.medlemskap m
    where m.bruker_id = b and m.fagmiljo_id = sandkasse.id and m.status = 'aktiv'
  );

  insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id, tildelt_av)
  select b, sandkasse.id, peohol
  from unnest(array[peohol, maxhag]) as b
  where not exists (
    select 1 from public.fagmiljoadministratorer a
    where a.bruker_id = b and a.fagmiljo_id = sandkasse.id and a.til is null
  );

  -- Sluttilstanden, kontrollert med en gang i stedet for ved commit.
  set constraints all immediate;
  if (
    select count(*) from public.medlemskap m
    where m.fagmiljo_id = sandkasse.id and m.status = 'aktiv' and m.bruker_id in (peohol, maxhag)
  ) <> 2 or (
    select count(*) from public.fagmiljoadministratorer a
    where a.fagmiljo_id = sandkasse.id and a.til is null and a.bruker_id in (peohol, maxhag)
  ) <> 2 then
    raise exception 'Sandkasse: peohol og maxhag er ikke begge aktive medlemmer og administratorer.';
  end if;

  raise notice 'Sandkasse: % aktive medlemmer, % lokale administratorer, åpent for medlemmer: %.',
    (select count(*) from public.medlemskap where fagmiljo_id = sandkasse.id and status = 'aktiv'),
    (select count(*) from public.fagmiljoadministratorer where fagmiljo_id = sandkasse.id and til is null),
    (select apent_for_medlemmer from public.fagmiljoer where id = sandkasse.id);
end;
$$;
