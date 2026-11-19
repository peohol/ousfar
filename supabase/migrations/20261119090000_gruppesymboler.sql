-- Symbolet til en gruppe (Peder 19.11.2026): en emoji eller et eget bilde,
-- som sirkelen ved gruppenavnet i chatmenyen, på gruppesiden og i
-- gruppeoversikten. Gruppechattene arver det. Uten symbol står gruppeikonet.
--
-- Bildet beskjæres og komprimeres i nettleseren, som profilbildene
-- (20260922101921_profilbilder.sql), og lagres kvadratisk som WebP på en fast
-- sti per gruppe — `<gruppe-ID>/symbol.webp` — i en egen privat bøtte, så et
-- nytt bilde erstatter det gamle. Bare de som styrer gruppen (de ansvarlige
-- og systemarkitektene), kan legge inn, bytte eller fjerne det, og bare de
-- som leser gruppen, kan se det. Grensene i bøtta er en siste skanse dersom
-- noen laster opp utenom appen.
--
-- En emoji kan ikke bære tekst: nøyaktig én emoji, av tegn fra emojiblokkene
-- uten tall, bokstaver, punktskrift og bokstavlignende tegn
-- (`intern.er_gruppesymbolemoji`, samme mønster som `EMOJIMONSTER` i
-- src/grupper/symbol.ts; docs/pasientopplysninger.md).

-- --- Kolonnene --------------------------------------------------------------

alter table public.grupper
  add column symbol_emoji text,
  add column symbol_bilde text,
  add column symbol_endret_kl timestamptz;

-- Én emoji: et emojitegn med variantvelger og hudfarge, høyst fire slike
-- satt sammen med ZWJ (en familie), eventuelt med merkelapper (et
-- regionflagg), eller to regionsindikatorer (et flagg). Ett mønster for
-- tabellen og funksjonen, det samme som `EMOJIMONSTER` i appen.
create function intern.er_gruppesymbolemoji(verdi text)
returns boolean
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select verdi ~ '^(?:[\u00A9\u00AE\u203C\u2049\u2122\u2139\u2190-\u21FF\u2300-\u23FF\u24C2\u25A0-\u2775\u2794-\u27BF\u2934\u2935\u2B00-\u2BFF\u3030\u303D\u3297\u3299\U0001F000-\U0001F0FF\U0001F200-\U0001FAFF][\uFE0E\uFE0F\U0001F3FB-\U0001F3FF]{0,2}(?:\u200D[\u00A9\u00AE\u203C\u2049\u2122\u2139\u2190-\u21FF\u2300-\u23FF\u24C2\u25A0-\u2775\u2794-\u27BF\u2934\u2935\u2B00-\u2BFF\u3030\u303D\u3297\u3299\U0001F000-\U0001F0FF\U0001F200-\U0001FAFF][\uFE0E\uFE0F\U0001F3FB-\U0001F3FF]{0,2}){0,3}(?:[\U000E0020-\U000E007E]{1,8}\U000E007F)?|[\U0001F1E6-\U0001F1FF]{2})$'
$$;

-- Som de andre i `intern` kan den ikke kalles av API-rollene; de skriver
-- aldri rett i `grupper`, bare gjennom funksjonene, som kjører som eieren.
revoke all on function intern.er_gruppesymbolemoji(text) from public, anon, authenticated, service_role;

alter table public.grupper
  add constraint grupper_symbol_ett check (symbol_emoji is null or symbol_bilde is null),
  add constraint grupper_symbol_bilde check (symbol_bilde is null or symbol_bilde = id::text || '/symbol.webp'),
  add constraint grupper_symbol_emoji check (
    symbol_emoji is null
    or intern.er_gruppesymbolemoji(symbol_emoji)
  );

comment on column public.grupper.symbol_emoji is
  'Symbolet som emoji (bare tegn fra emojiblokkene), eller null. Se docs/fagmiljoer.md, «Gruppesymbolet».';
comment on column public.grupper.symbol_bilde is
  'Symbolet som bilde: stien i bøtta gruppesymboler, alltid <gruppe-ID>/symbol.webp, eller null.';
comment on column public.grupper.symbol_endret_kl is
  'Da symbolet sist ble endret: appen henter en ny lenke til bildet når den endres.';

-- --- Bøtta ------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gruppesymboler', 'gruppesymboler', false, 1048576, array['image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Gruppene den innloggede styrer nå og kan endre (aktive grupper), til
-- radsikkerheten i bøtta, som `(select public.mine_styrte_grupper())`: regnet
-- ut én gang per spørring, som `mine_lesbare_grupper()`.
create function public.mine_styrte_grupper()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.har_aktivt_medlemskap((select auth.uid())) then '{}'::uuid[]
    else coalesce((
      select array_agg(g.id order by g.id)
      from public.grupper g
      where g.status = 'aktiv'
        and g.id = any (public.mine_lesbare_grupper())
        and intern.gruppeavslag((select auth.uid()), g, null, 'endre') is null
    ), '{}'::uuid[])
  end
$$;

revoke all on function public.mine_styrte_grupper() from public, anon, authenticated, service_role;
grant execute on function public.mine_styrte_grupper() to authenticated;

comment on function public.mine_styrte_grupper() is
  'Gruppesymbolene: de aktive gruppene den innloggede styrer (ansvarlig eller systemarkitekt). Brukes av radsikkerheten på bøtta gruppesymboler.';

-- Lesingen følger gruppen: den som leser gruppen, ser symbolet.
create policy "Innloggede ser symbolene til gruppene de leser"
on storage.objects for select to authenticated
using (
  bucket_id = 'gruppesymboler'
  and objects.name = (storage.foldername(objects.name))[1] || '/symbol.webp'
  and (storage.foldername(objects.name))[1] = any ((select public.mine_lesbare_grupper())::text[])
);

-- Skrivingen: én fast fil per gruppe, bare for dem som styrer den.
create policy "De som styrer gruppen, kan legge inn symbolet"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'gruppesymboler'
  and objects.name = (storage.foldername(objects.name))[1] || '/symbol.webp'
  and (storage.foldername(objects.name))[1] = any ((select public.mine_styrte_grupper())::text[])
);

create policy "De som styrer gruppen, kan bytte symbolet"
on storage.objects for update to authenticated
using (
  bucket_id = 'gruppesymboler'
  and objects.name = (storage.foldername(objects.name))[1] || '/symbol.webp'
  and (storage.foldername(objects.name))[1] = any ((select public.mine_styrte_grupper())::text[])
)
with check (
  bucket_id = 'gruppesymboler'
  and objects.name = (storage.foldername(objects.name))[1] || '/symbol.webp'
  and (storage.foldername(objects.name))[1] = any ((select public.mine_styrte_grupper())::text[])
);

create policy "De som styrer gruppen, kan fjerne symbolet"
on storage.objects for delete to authenticated
using (
  bucket_id = 'gruppesymboler'
  and objects.name = (storage.foldername(objects.name))[1] || '/symbol.webp'
  and (storage.foldername(objects.name))[1] = any ((select public.mine_styrte_grupper())::text[])
);

-- --- Symbolet overalt der gruppen står ----------------------------------------

-- `{"emoji": "🧪"}`, `{"bilde": "<sti>", "endret": "<tid>"}` eller null.
create function intern.gruppesymbol(g public.grupper)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when g.symbol_bilde is not null then jsonb_build_object('bilde', g.symbol_bilde, 'endret', g.symbol_endret_kl)
    when g.symbol_emoji is not null then jsonb_build_object('emoji', g.symbol_emoji)
  end
$$;

revoke all on function intern.gruppesymbol(public.grupper) from public, anon, authenticated, service_role;

create or replace function intern.gruppereferanse(g public.grupper)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', g.id,
    'navn', g.navn,
    'beskrivelse', g.beskrivelse,
    'art', g.art,
    'status', g.status,
    'fagmiljo', (select jsonb_build_object('id', f.id, 'navn', f.navn) from public.fagmiljoer f where f.id = g.fagmiljo_id),
    'symbol', intern.gruppesymbol(g)
  )
$$;

revoke all on function intern.gruppereferanse(public.grupper) from public, anon, authenticated, service_role;

-- --- Å sette symbolet -----------------------------------------------------------

-- Setter symbolet: en emoji, bildet som er lastet opp på gruppens faste sti
-- (`bilde`), eller ingen (begge tomme). Samme myndighet som navnet
-- (`intern.gruppeavslag`, «endre»). Gir symbolet slik det står etterpå.
-- Et bilde som byttes ut med en emoji eller fjernes, slettes av appen fra
-- bøtta etterpå; databasen kan ikke slette filer i lagringen.
create function public.sett_gruppesymbol(gruppe uuid, emoji text, bilde boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grupper := intern.las_gruppe(sett_gruppesymbol.gruppe, 'Gruppesymbolet endret');
  ren text := nullif(btrim(coalesce(sett_gruppesymbol.emoji, '')), '');
  sti text := g.id::text || '/symbol.webp';
begin
  perform intern.krev_gruppemyndighet((select auth.uid()), g, null, 'endre');
  if coalesce(sett_gruppesymbol.bilde, false) then
    if ren is not null then
      raise exception 'Velg enten en emoji eller et bilde.' using errcode = '22023';
    end if;
    if not exists (select 1 from storage.objects o where o.bucket_id = 'gruppesymboler' and o.name = sti) then
      raise exception 'Bildet er ikke lastet opp. Prøv igjen.' using errcode = '22023';
    end if;
  elsif ren is not null and not intern.er_gruppesymbolemoji(ren) then
    raise exception 'Symbolet må være én emoji.' using errcode = '22023';
  end if;

  update public.grupper x
  set symbol_emoji = case when coalesce(sett_gruppesymbol.bilde, false) then null else ren end,
      symbol_bilde = case when coalesce(sett_gruppesymbol.bilde, false) then sti end,
      symbol_endret_kl = now(),
      endret_kl = now()
  where x.id = g.id
  returning * into g;
  return intern.gruppesymbol(g);
end;
$$;

revoke all on function public.sett_gruppesymbol(uuid, text, boolean) from public, anon;
grant execute on function public.sett_gruppesymbol(uuid, text, boolean) to authenticated;

comment on function public.sett_gruppesymbol(uuid, text, boolean) is
  'Gruppesymbolet: en emoji, det opplastede bildet, eller ingen. De som styrer gruppen. Se docs/fagmiljoer.md, «Gruppesymbolet».';
