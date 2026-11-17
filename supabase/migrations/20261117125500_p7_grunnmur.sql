-- P7.0 (docs/gruppechat.md, «Grunnmuren»): den felles grunnmuren for
-- gruppechatten, og sikkerhetsnettet for den varige regelen om at
-- pasientopplysninger ikke er tillatt i OUSFAR (docs/pasientopplysninger.md).
--
-- Ingen atferdsendring: ingen tabeller, ingen nye rettigheter, og ingen av
-- funksjonene kan kalles fra nettleseren. Tråd A bruker bryteren og
-- personnummerkontrollen i chatfunksjonene; tråd C fyller
-- `intern.merk_gruppechat_varsler_lest` med samme signatur.
--
-- Tilbakeføring: funksjonene kan stå; de brukes bare av det som bygger på dem.

-- Gruppechatten er slått av til Peder har godkjent at den slås på (D6/S5).
-- Aktiveringen er en egen, liten migrasjon som viser til godkjenningen.
create function intern.gruppechat_aktivert()
returns boolean
language sql
stable
set search_path = ''
as $$
  select false
$$;

revoke all on function intern.gruppechat_aktivert() from public, anon, authenticated, service_role;

comment on function intern.gruppechat_aktivert() is
  'P7: om gruppechatten er slått på. Nei til Peder har godkjent aktiveringen (D6/S5). Se docs/gruppechat.md.';

-- Sant når teksten har et norsk fødselsnummer, D-nummer eller H-nummer med
-- gyldige kontrollsifre: 11 sifre som ikke står inntil andre sifre, eventuelt
-- med mellomrom, punktum eller bindestrek etter de seks første. Dagen er
-- 01–31 (D-nummer: 41–71), måneden 01–12 (H-nummer: 41–52). Det første
-- kontrollsifferet godtas også etter regelen som gjelder fra 2032 (resten
-- 0–3), så nye numre ikke slipper gjennom.
--
-- De samme reglene står i `supabase/functions/_delt/pasientopplysninger.ts`
-- (`lignerPersonnummer`); en test holder dem like. Kontrollen er et
-- sikkerhetsnett for åpenbare feil, ikke en garanti.
create function intern.ligner_personnummer(tekst text)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  treff text[];
  s text;
  d int[];
  dag int;
  maaned int;
  sum1 int;
  sum2 int;
  v1 constant int[] := array[3, 7, 6, 1, 8, 9, 4, 5, 2, 1];
  v2 constant int[] := array[5, 4, 3, 2, 7, 6, 5, 4, 3, 2, 1];
begin
  if tekst is null or tekst !~ '[0-9]{5}' then
    return false;
  end if;
  for treff in
    select regexp_matches(tekst, '(?:^|[^0-9])([0-9]{6})[ .-]?([0-9]{5})(?=[^0-9]|$)', 'g')
  loop
    s := treff[1] || treff[2];
    d := array(select substr(s, i, 1)::int from generate_series(1, 11) i);
    dag := d[1] * 10 + d[2];
    maaned := d[3] * 10 + d[4];
    continue when not (dag between 1 and 31 or dag between 41 and 71);
    continue when not (maaned between 1 and 12 or maaned between 41 and 52);
    sum1 := 0;
    for i in 1 .. 10 loop
      sum1 := sum1 + v1[i] * d[i];
    end loop;
    sum2 := 0;
    for i in 1 .. 11 loop
      sum2 := sum2 + v2[i] * d[i];
    end loop;
    if sum1 % 11 between 0 and 3 and sum2 % 11 = 0 then
      return true;
    end if;
  end loop;
  return false;
end;
$$;

revoke all on function intern.ligner_personnummer(text) from public, anon, authenticated, service_role;

comment on function intern.ligner_personnummer(text) is
  'Sant når teksten har et gyldig fødsels-, D- eller H-nummer. Samme regler som lignerPersonnummer i @delt/pasientopplysninger. Se docs/pasientopplysninger.md.';

-- Avviser tekst som ser ut til å ha et fødselsnummer. Teksten står likt i
-- `PASIENTREGEL.avvist` (`@delt/pasientopplysninger`), og selve teksten
-- brukeren skrev, tas aldri med i feilmeldingen.
create function intern.krev_uten_personnummer(tekst text)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if intern.ligner_personnummer(tekst) then
    raise exception 'Teksten ser ut til å inneholde et fødselsnummer. Pasientopplysninger er ikke tillatt i OUSFAR.'
      using errcode = '22023';
  end if;
end;
$$;

revoke all on function intern.krev_uten_personnummer(text) from public, anon, authenticated, service_role;

comment on function intern.krev_uten_personnummer(text) is
  'Kaster 22023 når teksten ligner et fødselsnummer. Se docs/pasientopplysninger.md.';

-- Merker varslene om chatten i gruppen lest for brukeren, til og med
-- meldingen `til_nr`. Tom i grunnmuren; tråd C (varslene) definerer den på
-- nytt med samme signatur når kategorien `gruppechat` finnes.
create function intern.merk_gruppechat_varsler_lest(gruppe uuid, bruker uuid, til_nr bigint)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  select null::void
$$;

revoke all on function intern.merk_gruppechat_varsler_lest(uuid, uuid, bigint) from public, anon, authenticated, service_role;

comment on function intern.merk_gruppechat_varsler_lest(uuid, uuid, bigint) is
  'P7: merker varslene om chatten i gruppen lest. Tom til tråd C fyller den. Se docs/gruppechat.md.';
