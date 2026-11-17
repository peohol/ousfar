-- CYPinfo på fagsidene (docs/cypinfo-integrasjon.md, «Visningen»).
--
-- Peder 17.11.2026: OUSFAR viser hvordan de ulike fenotypene påvirker
-- legemidlene, slik CYPinfo beskriver det, og tar aldri imot en pasients
-- resultat. Synkroniseringen (parserversjon 2) lagrer derfor CYPinfos tekst for
-- hver anbefaling, uendret og delt i avsnitt (`data.avsnitt`), i stedet for en
-- hash av den. Tekstene byttes ut hver uke og redigeres aldri i OUSFAR.
--
-- Lesingen gir nå anbefalingene med nivået og teksten. Den krever fortsatt et
-- aktivt medlemskap; at bare systemarkitektene ser visningen til å begynne
-- med, avgjør appen (src/cypinfo/stoffside.ts), siden innholdet er åpent hos
-- CYPinfo.

create or replace function public.les_cypinfo(fest_ider text[], cypinfo_ider text[] default '{}')
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform intern.krev_aktivt_medlemskap();
  if coalesce(cardinality(fest_ider), 0) + coalesce(cardinality(cypinfo_ider), 0) > 200 then
    raise exception 'For mange legemidler.' using errcode = '22023';
  end if;

  return (
    with valgte as (
      select l.cypinfo_id, l.data
      from cypinfo.legemiddel l
      where l.utgatt_kl is null
        and (l.cypinfo_id = any (coalesce(cypinfo_ider, '{}')) or (l.data -> 'fest') ?| coalesce(fest_ider, '{}'))
    ),
    gener as (
      select distinct g.slug
      from valgte v
      cross join lateral jsonb_array_elements_text(coalesce(v.data -> 'gener', '[]')) g (slug)
    )
    select jsonb_build_object(
      'kilde', jsonb_build_object(
        'navn', 'CYPinfo',
        'endret_kl', (select max(s.avsluttet_kl) from cypinfo.synkroniseringer s where s.status = 'fullfort'),
        'kontrollert_kl', (select max(s.avsluttet_kl) from cypinfo.synkroniseringer s where s.status in ('fullfort', 'uendret'))),
      'legemidler', coalesce((select jsonb_agg(jsonb_build_object('id', v.cypinfo_id, 'data', v.data) order by v.cypinfo_id) from valgte v), '[]'),
      'anbefalinger', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'id', a.cypinfo_id,
                 'legemiddel_id', a.legemiddel_id,
                 'kombinasjoner', a.data -> 'kombinasjoner',
                 'niva', a.data ->> 'niva',
                 -- Rader fra før parserversjon 2 har ingen tekst; de byttes ut ved neste henting.
                 'avsnitt', coalesce(a.data -> 'avsnitt', '[]'))
               order by a.legemiddel_id, a.cypinfo_id)
        from cypinfo.anbefaling a
        where a.utgatt_kl is null and a.legemiddel_id in (select v.cypinfo_id from valgte v)), '[]'),
      'genresultater', coalesce((
        select jsonb_agg(jsonb_build_object('id', g.cypinfo_id, 'data', g.data) order by g.cypinfo_id)
        from cypinfo.genresultat g
        where g.utgatt_kl is null and g.gen_slug in (select slug from gener)), '[]')
    )
  );
end;
$$;

comment on function public.les_cypinfo(text[], text[]) is
  'CYPinfo-katalogen for legemidlene med disse FEST- eller CYPinfo-ID-ene: legemidlene, anbefalingene med nivå og tekst, og gentabellen for genene deres. Krever aktivt medlemskap.';

notify pgrst, 'reload schema';
