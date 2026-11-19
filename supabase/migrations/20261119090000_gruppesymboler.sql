-- Symbolet til en gruppe (Peder 19.11.2026): en emoji eller et eget bilde,
-- som sirkelen ved gruppenavnet i chatmenyen, på gruppesiden og i
-- gruppeoversikten. Gruppechattene arver det. Uten symbol står gruppeikonet.
--
-- Bildet beskjæres og komprimeres i nettleseren, som profilbildene
-- (20260922101921_profilbilder.sql), og lagres kvadratisk som WebP i en egen
-- privat bøtte. Hvert bilde får sin egen sti, `<gruppe-ID>/<UUID>.webp`, og
-- kan aldri overskrives: et nytt bilde blir gruppens symbol først når
-- `sett_gruppesymbol` har bekreftet det, og et bilde kan bare slettes når det
-- ikke er gruppens symbol og er over en time gammelt. Slik kan verken en
-- mislykket lagring eller to ansvarlige som bytter samtidig, ødelegge det
-- bekreftede symbolet (kontrollen av #476). Bare de som styrer gruppen (de
-- ansvarlige og systemarkitektene), kan laste opp og rydde; de som leser
-- gruppen, ser bare det gjeldende bildet.
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

-- Stien til et symbolbilde: `<gruppe-ID>/<UUID>.webp`, én ny for hvert bilde.
-- Ren hjelper uten data, til tabellregelen, radsikkerheten i bøtta og
-- `sett_gruppesymbol`.
create function public.er_gruppesymbolsti(gruppe text, sti text)
returns boolean
language sql
immutable
strict
parallel safe
set search_path = ''
as $$
  select split_part(sti, '/', 1) = gruppe
    and sti ~ '^[^/]+/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[.]webp$'
$$;

revoke all on function public.er_gruppesymbolsti(text, text) from public, anon, authenticated, service_role;
grant execute on function public.er_gruppesymbolsti(text, text) to authenticated;

comment on function public.er_gruppesymbolsti(text, text) is
  'Gruppesymbolene: om stien er et symbolbilde i gruppens mappe, <gruppe-ID>/<UUID>.webp. Ren hjelper.';

alter table public.grupper
  add constraint grupper_symbol_ett check (symbol_emoji is null or symbol_bilde is null),
  add constraint grupper_symbol_bilde check (symbol_bilde is null or public.er_gruppesymbolsti(id::text, symbol_bilde)),
  add constraint grupper_symbol_emoji check (
    symbol_emoji is null
    or intern.er_gruppesymbolemoji(symbol_emoji)
  );

comment on column public.grupper.symbol_emoji is
  'Symbolet som emoji (bare tegn fra emojiblokkene), eller null. Se docs/fagmiljoer.md, «Gruppesymbolet».';
comment on column public.grupper.symbol_bilde is
  'Symbolet som bilde: stien i bøtta gruppesymboler, <gruppe-ID>/<UUID>.webp, eller null.';
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

-- De gjeldende symbolbildene i gruppene den innloggede leser: det eneste
-- et vanlig medlem ser i bøtta, og det ingen kan slette.
create function public.mine_gruppesymbolbilder()
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.har_aktivt_medlemskap((select auth.uid())) then '{}'::text[]
    else coalesce((
      select array_agg(g.symbol_bilde order by g.symbol_bilde)
      from public.grupper g
      where g.id = any (public.mine_lesbare_grupper())
        and g.symbol_bilde is not null
    ), '{}'::text[])
  end
$$;

revoke all on function public.mine_gruppesymbolbilder() from public, anon, authenticated, service_role;
grant execute on function public.mine_gruppesymbolbilder() to authenticated;

comment on function public.mine_gruppesymbolbilder() is
  'Gruppesymbolene: de gjeldende symbolbildene i gruppene den innloggede leser. Brukes av radsikkerheten på bøtta gruppesymboler.';

-- Lesingen: den som leser gruppen, ser det gjeldende bildet; de som styrer
-- den, ser også de andre i mappen, så de kan rydde.
create policy "Innloggede ser symbolene til gruppene de leser"
on storage.objects for select to authenticated
using (
  bucket_id = 'gruppesymboler'
  and (
    objects.name = any ((select public.mine_gruppesymbolbilder())::text[])
    or (storage.foldername(objects.name))[1] = any ((select public.mine_styrte_grupper())::text[])
  )
);

-- Opplastingen: et nytt bilde på en ny sti i gruppens mappe. Det finnes ingen
-- regel for å endre en fil, så et bilde kan aldri overskrives.
create policy "De som styrer gruppen, kan laste opp et symbol"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'gruppesymboler'
  and public.er_gruppesymbolsti((storage.foldername(objects.name))[1], objects.name)
  and (storage.foldername(objects.name))[1] = any ((select public.mine_styrte_grupper())::text[])
);

-- Ryddingen: bare bilder som ikke er gruppens symbol, og som er over en time
-- gamle. Et bilde som nettopp er lastet opp, og som venter på
-- `sett_gruppesymbol` (som bare godtar bilder under en halvtime gamle), kan
-- derfor ikke slettes av en annen som rydder samtidig.
create policy "De som styrer gruppen, kan rydde bort gamle symboler"
on storage.objects for delete to authenticated
using (
  bucket_id = 'gruppesymboler'
  and (storage.foldername(objects.name))[1] = any ((select public.mine_styrte_grupper())::text[])
  and objects.name <> all ((select public.mine_gruppesymbolbilder())::text[])
  and objects.created_at < now() - interval '1 hour'
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

-- Setter symbolet: en emoji, et bilde som er lastet opp i gruppens mappe
-- (`bilde`, stien), eller ingen (begge tomme). Samme myndighet som navnet
-- (`intern.gruppeavslag`, «endre»), og gruppens rad er låst, så to som endrer
-- samtidig, kommer etter hverandre. Et nytt bilde må være lastet opp den
-- siste halvtimen; det gamle ryddes bort av appen etterpå, innenfor reglene
-- på bøtta. Gir symbolet slik det står etterpå.
create function public.sett_gruppesymbol(gruppe uuid, emoji text, bilde text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  g public.grupper := intern.las_gruppe(sett_gruppesymbol.gruppe, 'Gruppesymbolet endret');
  ren text := nullif(btrim(coalesce(sett_gruppesymbol.emoji, '')), '');
  sti text := nullif(btrim(coalesce(sett_gruppesymbol.bilde, '')), '');
begin
  perform intern.krev_gruppemyndighet((select auth.uid()), g, null, 'endre');
  if sti is not null then
    if ren is not null then
      raise exception 'Velg enten en emoji eller et bilde.' using errcode = '22023';
    end if;
    if not public.er_gruppesymbolsti(g.id::text, sti) then
      raise exception 'Bildet hører ikke til denne gruppen.' using errcode = '22023';
    end if;
    if sti is distinct from g.symbol_bilde and not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'gruppesymboler' and o.name = sti and o.created_at > now() - interval '30 minutes'
    ) then
      raise exception 'Bildet er ikke lastet opp. Prøv igjen.' using errcode = '22023';
    end if;
  elsif ren is not null and not intern.er_gruppesymbolemoji(ren) then
    raise exception 'Symbolet må være én emoji.' using errcode = '22023';
  end if;

  update public.grupper x
  set symbol_emoji = case when sti is null then ren end,
      symbol_bilde = sti,
      symbol_endret_kl = now(),
      endret_kl = now()
  where x.id = g.id
  returning * into g;
  return intern.gruppesymbol(g);
end;
$$;

revoke all on function public.sett_gruppesymbol(uuid, text, text) from public, anon;
grant execute on function public.sett_gruppesymbol(uuid, text, text) to authenticated;

comment on function public.sett_gruppesymbol(uuid, text, text) is
  'Gruppesymbolet: en emoji, et opplastet bilde (stien), eller ingen. De som styrer gruppen. Se docs/fagmiljoer.md, «Gruppesymbolet».';
