-- Gruppesymbolet ved invitasjonene (Issue #498, docs/fagmiljoer.md,
-- «Gruppesymbolet»): den som er invitert til en gruppe, ser alt gruppens navn
-- og symbol i invitasjonen (`mine_grupper()`, `gruppereferanse`). Er symbolet
-- et bilde, kunne hen likevel ikke hente det fra bøtta, fordi lesingen bare
-- gjaldt gruppene hen leser. Nå gjelder den også det gjeldende symbolbildet
-- til gruppene hen har en synlig invitasjon til, med nøyaktig de samme
-- vilkårene som `mine_grupper()` bruker for å vise invitasjonen. Ingen andre
-- bilder i gruppens mappe og ingenting annet i gruppen blir synlig, og
-- tilgangen går bort når invitasjonen besvares eller trekkes tilbake.

create or replace function public.mine_gruppesymbolbilder()
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
      where g.symbol_bilde is not null
        and (
          g.id = any (public.mine_lesbare_grupper())
          or exists (
            select 1
            from public.gruppemedlemskap m
            where m.gruppe_id = g.id
              and m.bruker_id = (select auth.uid())
              and m.status = 'invitert'
              and g.status = 'aktiv'
              and intern.kan_vaere_med_i_gruppe(g, (select auth.uid()))
          )
        )
    ), '{}'::text[])
  end
$$;

revoke all on function public.mine_gruppesymbolbilder() from public, anon, authenticated, service_role;
grant execute on function public.mine_gruppesymbolbilder() to authenticated;

comment on function public.mine_gruppesymbolbilder() is
  'Gruppesymbolene: de gjeldende symbolbildene i gruppene den innloggede leser, og i gruppene hen har en synlig invitasjon til. Brukes av radsikkerheten på bøtta gruppesymboler.';
