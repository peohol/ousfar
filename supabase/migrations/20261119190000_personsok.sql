-- Personsøket (docs/fagmiljoer.md, «Personsøket»).
--
-- Der noen skal velge en annen person – invitere til en gruppe, legge til et
-- medlem i et fagmiljø, starte en direktemelding – søkes det etter navnet
-- eller brukernavnet i stedet for at brukernavnet må skrives nøyaktig.
--
-- Én felles sammenligning (`intern.personsoktreff`) med én kandidatmengde per
-- formål, avgjort av de samme reglene som handlingen selv:
--
-- - `sok_gruppekandidater`: den som styrer en aktiv gruppe, finner dem hen
--   alt ser profilkortet til (`intern.synlige_profiler`, alle for en
--   systemarkitekt) som kan være med i gruppen og ikke alt er med eller
--   invitert.
-- - `sok_medlemskandidater`: en lokal administrator finner dem hen alt ser
--   profilkortet til som ikke er aktive medlemmer i fagmiljøet. Et lukket
--   fagmiljø tar bare imot systemarkitekter (startporten S2).
-- - `sok_direktemottakere`: som før (D5): bare dem som selv har slått på
--   direktemeldinger, uten bilde, stilling eller fagmiljø.
--
-- Søket gjør ingen ny profil synlig: de to første gir bare kontoer den
-- innloggede alt ser kortet til, og den tredje er uendret. Den som skal
-- inviteres eller legges til uten å være synlig, kan fortsatt oppgis med det
-- nøyaktige brukernavnet, med det samme avslaget som før.
--
-- Sammenligningen ser bort fra store og små bokstaver og aksenter, leser æ, ø
-- og å som a, o og a (som fagsøket, `src/faginnhold/sok.ts`), og tåler en
-- skrivefeil: hvert ord i søket må stå i navnet eller brukernavnet, først i et
-- ord, inne i et, eller nesten likt (minst halvparten av bokstavtriplene).
-- Søket krever minst to tegn, leses høyst 100 tegn og fem ord inn og gir høyst
-- 20 treff, best først. Det lagres ikke. Tabellene er små, og søket kjøres
-- først etter en pause i skrivingen, så det trenger ingen egen indeks.
--
-- Tilbakeføring: `drop function` på de fire nye `intern`-funksjonene og de to
-- nye offentlige, og `sok_direktemottakere` tilbake til definisjonen i
-- 20261118234500_direktemeldinger.sql.

-- --- Sammenligningen ---------------------------------------------------------------------

-- Teksten slik søket sammenligner den: små bokstaver, uten aksenter, æ, ø og å
-- som a, o og a. Hvert tegn blir ett tegn.
create function intern.personsokfold(tekst text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select translate(
    lower(coalesce(personsokfold.tekst, '')),
    -- Store bokstaver også: `lower` gjør dem ikke små i alle lokaler.
    'æøåäöüéèêëáàâãíìîïóòôõúùûçñýšÆØÅÄÖÜÉÈÊËÁÀÂÃÍÌÎÏÓÒÔÕÚÙÛÇÑÝŠ',
    'aoaaoueeeeaaaaiiiioooouuucnysaoaaoueeeeaaaaiiiioooouuucnys'
  )
$$;

revoke all on function intern.personsokfold(text) from public, anon, authenticated, service_role;

-- Ordene i et søk slik de sammenlignes: høyst 100 tegn og fem ulike ord.
-- Stopper med 22023 når søket har færre enn to tegn.
create function intern.personsokord(sok text)
returns text[]
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  ord text[];
begin
  select array(
    select o from (
      select o, min(nr) as nr
      from regexp_split_to_table(btrim(intern.personsokfold(left(coalesce(personsokord.sok, ''), 100))), '\s+')
        with ordinality as x (o, nr)
      where o <> ''
      group by o
    ) d
    order by nr
    limit 5
  ) into ord;
  if char_length(array_to_string(ord, '')) < 2 then
    raise exception 'Skriv minst to tegn.' using errcode = '22023';
  end if;
  return ord;
end;
$$;

revoke all on function intern.personsokord(text) from public, anon, authenticated, service_role;

-- Bokstavtriplene i et ord, med to mellomrom foran og ett bak (som pg_trgm).
create function intern.personsoktripler(ord text)
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select coalesce(array_agg(distinct substr(x.p, i, 3)), '{}'::text[])
  from (select '  ' || personsoktripler.ord || ' ' as p) x,
    generate_series(1, char_length(personsoktripler.ord) + 1) i
$$;

revoke all on function intern.personsoktripler(text) from public, anon, authenticated, service_role;

-- Delene av et navn søket sammenligner med: hvert ord i fornavnet og
-- etternavnet, brukernavnet og hver bolk i det.
create function intern.personsokdeler(fornavn text, etternavn text, brukernavn text)
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select array(
    select distinct d
    from regexp_split_to_table(
      intern.personsokfold(concat_ws(' ', personsokdeler.fornavn, personsokdeler.etternavn, personsokdeler.brukernavn)),
      '[\s._-]+'
    ) d
    where d <> ''
    union
    select intern.personsokfold(personsokdeler.brukernavn)
    where coalesce(personsokdeler.brukernavn, '') <> ''
  )
$$;

revoke all on function intern.personsokdeler(text, text, text) from public, anon, authenticated, service_role;

-- Hvor godt navnet passer med søket, eller null når et ord i søket ikke står
-- der. Hvert ord i søket får poengene for den delen av navnet det passer best
-- med: 4 for hele delen, 3 først i den, 2 inne i den, og 1 når det er nesten
-- likt (minst fire tegn, og minst halvparten av triplene i ordet står i
-- delen). Poengene legges sammen.
create function intern.personsokpoeng(ord text[], deler text[])
returns integer
language plpgsql
immutable
parallel safe
set search_path = ''
as $$
declare
  o text;
  d text;
  tripler text[];
  beste integer;
  poeng integer;
  sum integer := 0;
begin
  if coalesce(cardinality(ord), 0) = 0 or coalesce(cardinality(deler), 0) = 0 then
    return null;
  end if;
  foreach o in array ord loop
    beste := 0;
    tripler := null;
    foreach d in array deler loop
      poeng := case
        when d = o then 4
        when starts_with(d, o) then 3
        when strpos(d, o) > 0 then 2
        else 0
      end;
      if poeng = 0 and char_length(o) >= 4 then
        tripler := coalesce(tripler, intern.personsoktripler(o));
        if 2 * (select count(*) from unnest(tripler) t where t = any(intern.personsoktripler(d))) >= cardinality(tripler) then
          poeng := 1;
        end if;
      end if;
      beste := greatest(beste, poeng);
      exit when beste = 4;
    end loop;
    if beste = 0 then
      return null;
    end if;
    sum := sum + beste;
  end loop;
  return sum;
end;
$$;

revoke all on function intern.personsokpoeng(text[], text[]) from public, anon, authenticated, service_role;

-- De høyst 20 kandidatene som passer best med ordene, best først, så etter
-- navnet. Hvert treff har ID-en, brukernavnet og navnet; med `detaljer` også
-- bildet, stillingen og det primære fagmiljøet (det profilkortet alt viser
-- den som ser profilen, `public.profilkortdetaljer`).
create function intern.personsoktreff(ord text[], kandidater uuid[], detaljer boolean)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with treff as (
    select p.id, p.username, p.first_name, p.last_name, p.avatar_path, p.updated_at, p.stilling_id,
      intern.personsokpoeng(personsoktreff.ord, intern.personsokdeler(p.first_name, p.last_name, p.username)) as poeng
    from public.profiles p
    where p.id = any(personsoktreff.kandidater)
  ),
  beste as (
    select * from treff
    where poeng is not null
    order by poeng desc, intern.personsokfold(first_name), intern.personsokfold(last_name), username
    limit 20
  )
  select coalesce(jsonb_agg(
    jsonb_build_object('id', b.id, 'username', b.username, 'first_name', b.first_name, 'last_name', b.last_name)
    || case when personsoktreff.detaljer then jsonb_build_object(
      'avatar_path', b.avatar_path,
      'updated_at', b.updated_at,
      'stilling', (select s.navn from public.stillinger s where s.id = b.stilling_id),
      'fagmiljo', (
        select f.navn
        from public.medlemskap m
        join public.fagmiljoer f on f.id = m.fagmiljo_id
        where m.bruker_id = b.id and m.status = 'aktiv' and f.status = 'aktiv'
        order by m.primaer desc, f.navn
        limit 1
      )
    ) else '{}'::jsonb end
    order by b.poeng desc, intern.personsokfold(b.first_name), intern.personsokfold(b.last_name), b.username
  ), '[]'::jsonb)
  from beste b
$$;

revoke all on function intern.personsoktreff(text[], uuid[], boolean) from public, anon, authenticated, service_role;

-- Kontoene `seer` ser profilkortet til: alle for en systemarkitekt, ellers
-- `intern.synlige_profiler`. Uten `seer` selv.
create function intern.personsokbare(seer uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when intern.er_systemarkitekt(personsokbare.seer) then array(
      select p.id from public.profiles p where p.id <> personsokbare.seer
    )
    else array(
      select s from intern.synlige_profiler(personsokbare.seer) s where s <> personsokbare.seer
    )
  end
$$;

revoke all on function intern.personsokbare(uuid) from public, anon, authenticated, service_role;

-- --- Søkene -----------------------------------------------------------------------------

-- Hvem som kan inviteres til gruppen: dem den innloggede ser profilkortet
-- til, som kan være med (`intern.kan_vaere_med_i_gruppe`) og ikke alt er med
-- eller invitert. Bare for den som styrer gruppen, mens den er aktiv; ellers
-- samme avslag som invitasjonen.
create function public.sok_gruppekandidater(gruppe uuid, sok text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  g public.grupper;
  ord text[];
begin
  perform intern.krev_aktivt_medlemskap();
  select * into g from public.grupper x where x.id = sok_gruppekandidater.gruppe;
  perform intern.krev_gruppemyndighet(aktor, g, null, 'endre');
  ord := intern.personsokord(sok_gruppekandidater.sok);
  return intern.personsoktreff(ord, array(
    select k
    from unnest(intern.personsokbare(aktor)) k
    where intern.kan_vaere_med_i_gruppe(g, k)
      and not exists (
        select 1 from public.gruppemedlemskap m
        where m.gruppe_id = g.id and m.bruker_id = k and m.status <> 'avsluttet'
      )
  ), true);
end;
$$;

-- Hvem som kan legges til i fagmiljøet: dem den innloggede ser profilkortet
-- til, som ikke er aktive medlemmer der. Et fagmiljø som ikke er åpnet for
-- medlemmer, tar bare imot systemarkitekter. Bare for den som administrerer
-- fagmiljøet, med de samme avslagene som `legg_til_medlem`.
create function public.sok_medlemskandidater(fagmiljo uuid, sok text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  f public.fagmiljoer;
  avslag text[];
  ord text[];
begin
  perform intern.krev_aktivt_medlemskap();
  -- Kontrollene for fagmiljøet og den innloggede, som `legg_til_medlem` gjør
  -- for et brukernavn som ikke finnes: alt før personen, som her ikke er valgt.
  avslag := intern.medlemskapsavslag(aktor, null, sok_medlemskandidater.fagmiljo, 'gi');
  if avslag is not null and avslag[2] is distinct from 'Ukjent bruker.' then
    raise exception '%', avslag[2] using errcode = avslag[1];
  end if;
  select * into f from public.fagmiljoer x where x.id = sok_medlemskandidater.fagmiljo;
  ord := intern.personsokord(sok_medlemskandidater.sok);
  return intern.personsoktreff(ord, array(
    select k
    from unnest(intern.personsokbare(aktor)) k
    where not exists (
        select 1 from public.medlemskap m
        where m.bruker_id = k and m.fagmiljo_id = f.id and m.status = 'aktiv'
      )
      and (f.apent_for_medlemmer or intern.er_systemarkitekt(k))
  ), true);
end;
$$;

-- Som før (20261118234500): andre som selv har slått på, med aktivt
-- medlemskap, uten blokkering noen vei; bare navnet og brukernavnet. Krever at
-- den som søker, har slått på, og minst to tegn. Nå med den felles
-- sammenligningen, som også tåler en skrivefeil.
create or replace function public.sok_direktemottakere(sok text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := intern.krev_direktemeldinger();
  ord text[];
begin
  if not intern.tillater_direktemeldinger(aktor) then
    raise exception 'Slå på «Tillat direktemeldinger» for å finne andre.' using errcode = 'PT409';
  end if;
  ord := intern.personsokord(sok_direktemottakere.sok);
  return intern.personsoktreff(ord, array(
    select v.bruker_id
    from public.chatvalg v
    where v.tillat_direktemeldinger
      and v.bruker_id <> aktor
      and intern.sokbar_for(v.bruker_id, aktor)
  ), false);
end;
$$;

revoke all on function public.sok_gruppekandidater(uuid, text) from public, anon;
revoke all on function public.sok_medlemskandidater(uuid, text) from public, anon;
grant execute on function public.sok_gruppekandidater(uuid, text) to authenticated;
grant execute on function public.sok_medlemskandidater(uuid, text) to authenticated;

comment on function public.sok_gruppekandidater(uuid, text) is
  'Personsøket: hvem den som styrer gruppen kan invitere, blant dem hen ser profilkortet til. Se docs/fagmiljoer.md, «Personsøket».';
comment on function public.sok_medlemskandidater(uuid, text) is
  'Personsøket: hvem en lokal administrator kan legge til i fagmiljøet, blant dem hen ser profilkortet til. Se docs/fagmiljoer.md, «Personsøket».';
