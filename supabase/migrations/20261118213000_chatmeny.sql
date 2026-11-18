-- D4a: samtalelista i chatmenyen (docs/gruppechat.md, «Chatmenyen»;
-- docs/ux-dashboard-chat-navigasjon-plan.md §6.1).
--
-- Chatmenyen viser én liste over den innloggedes samtaler, sortert etter
-- siste aktivitet, med tallet på uleste. I dag er alle samtalene
-- gruppechatter. Én funksjon gir hele lista i ett kall, så menyen ikke
-- trenger ett kall per gruppe:
--
--  * Bare grupper den innloggede selv er aktivt medlem av nå
--    (`intern.grupperolle`), og bare mens chatten er slått på og hen kan lese
--    den (`mine_lesbare_gruppechatter`). En systemarkitekt som ikke er med i
--    en gruppe, får den ikke i lista; chatten der nås fortsatt fra
--    gruppesiden, som før. En arkivert gruppe står ikke i lista (ingen har en
--    rolle i den).
--  * `siste_kl` er tidspunktet for den nyeste meldingen som ikke er slettet
--    og ikke er eldre enn lagringstiden; `null` uten meldinger.
--  * `uleste` er det samme tallet som `chat_uleste` i
--    `intern.gruppesamhandling`: meldinger fra andre etter det den innloggede
--    har lest, uten de slettede og utgåtte.
--  * Ingen meldingstekst og ingen avsendere.
--
-- Ingen tabeller eller data endres. Tilbakeføring: `drop function` på de to
-- funksjonene.

create function intern.gruppechat_uleste(gruppe uuid, bruker uuid default auth.uid())
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer from public.gruppemeldinger m
  where m.gruppe_id = gruppechat_uleste.gruppe
    and m.nr > coalesce((
      select l.lest_til_nr from public.gruppechat_lest l
      where l.gruppe_id = gruppechat_uleste.gruppe and l.bruker_id = gruppechat_uleste.bruker
    ), 0)
    and m.forfatter_id is distinct from gruppechat_uleste.bruker
    and m.slettet_kl is null
    and m.skrevet_kl >= now() - intern.gruppechat_lagringstid()
$$;

revoke all on function intern.gruppechat_uleste(uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.gruppechat_uleste(uuid, uuid) is
  'D4a: uleste meldinger fra andre i gruppens chat for brukeren; som chat_uleste i intern.gruppesamhandling. Se docs/gruppechat.md.';

create function public.mine_gruppesamtaler()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'gruppe', intern.gruppereferanse(s.g),
        'siste_kl', s.siste_kl,
        'uleste', intern.gruppechat_uleste((s.g).id)
      )
      order by s.siste_kl desc nulls last, lower((s.g).navn), (s.g).id
    ),
    '[]'::jsonb
  )
  from (
    select g, (
      select m.skrevet_kl from public.gruppemeldinger m
      where m.gruppe_id = g.id
        and m.slettet_kl is null
        and m.skrevet_kl >= now() - intern.gruppechat_lagringstid()
      order by m.nr desc
      limit 1
    ) as siste_kl
    from public.grupper g
    -- Chatten er på og gruppen lesbar (og ikke arkivert), og den innloggede er
    -- selv med: en systemarkitekt utenfor gruppen får den ikke i lista.
    where g.id = any (public.mine_lesbare_gruppechatter())
      and intern.kan_lese_gruppe(g.id)
      and intern.grupperolle(g.id) is not null
  ) s
$$;

revoke all on function public.mine_gruppesamtaler() from public, anon;
grant execute on function public.mine_gruppesamtaler() to authenticated;

comment on function public.mine_gruppesamtaler() is
  'D4a: den innloggedes gruppechatter (aktivt medlem) med siste aktivitet og uleste, nyeste først. Ingen tekst. Se docs/gruppechat.md, «Chatmenyen».';
