-- D3: «Siste aktivitet» på gruppesiden (docs/fagmiljoer.md, «Gruppene»;
-- planen §7.2). Én funksjon som gir inntil tre hendelser fra gruppen, de
-- nyeste først:
--
--  * en ny idé, eller en ny kommentar til en idé;
--  * en gruppeoppgave som er opprettet, endret eller fullført;
--  * en ny tråd, eller en ny kommentar i en tråd, på gruppens diskusjonsside;
--  * nye meldinger i gruppechatten, som én rad, uten tekst og uten avsender.
--
-- Tilgangen er den samme som for gruppeoversikten: den som ikke leser
-- gruppen (ikke medlem, fjernet, et annet fagmiljø, en ukjent gruppe), får
-- det samme avslaget, uten navn og uten hendelser. Det den innloggede selv
-- har gjort, står ikke der. Tekstene i idéer, kommentarer og meldinger
-- leses aldri ut; bare overskriftene, som de står i lista i gruppen.
--
-- Hver kilde gir bare sine tre nyeste før de slås sammen, så funksjonen
-- leser lite også i en stor gruppe. Ingen tabeller endres.

-- Navnet til den som gjorde noe, som i medlemslista; null når kontoen er slettet.
create function intern.aktivitetsperson(bruker uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('username', p.username, 'first_name', p.first_name, 'last_name', p.last_name)
  from public.profiles p
  where p.id = aktivitetsperson.bruker
$$;

revoke all on function intern.aktivitetsperson(uuid) from public, anon, authenticated, service_role;

create function public.gruppeaktivitet(gruppe uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  aktor uuid := (select auth.uid());
  g public.grupper;
  chat boolean;
begin
  perform intern.krev_aktivt_medlemskap();
  select * into g from public.grupper x where x.id = gruppeaktivitet.gruppe;
  if g.id is null or not intern.kan_lese_gruppe(g.id, aktor) then
    raise exception 'Gruppen finnes ikke, eller du har ikke tilgang til den.' using errcode = 'P0002';
  end if;
  chat := intern.gruppechat_aktivert();

  return coalesce((
    select jsonb_agg(h.rad order by h.tid desc, h.nokkel)
    from (
      select a.rad, a.tid, a.nokkel
      from (
        -- Nye idéer fra andre.
        (select
            jsonb_build_object(
              'slag', 'ide',
              'ide', i.id,
              'tittel', i.tittel,
              'aktor', intern.aktivitetsperson(i.forfatter_id),
              'tid', i.opprettet_kl,
              'ulest', not exists (select 1 from public.idebesok b where b.ide_id = i.id and b.bruker_id = aktor)
            ) as rad,
            i.opprettet_kl as tid,
            'ide:' || i.id as nokkel
          from public.ideer i
          where i.gruppe_id = g.id and i.arkivert_kl is null and i.forfatter_id <> aktor
          order by i.opprettet_kl desc
          limit 3)
        union all
        -- Nye kommentarer fra andre til idéene.
        (select
            jsonb_build_object(
              'slag', 'idekommentar',
              'ide', i.id,
              'kommentar', k.id,
              'tittel', i.tittel,
              'aktor', intern.aktivitetsperson(k.forfatter_id),
              'tid', k.opprettet_kl,
              'ulest', not exists (
                select 1 from public.idebesok b
                where b.ide_id = i.id and b.bruker_id = aktor and b.sett_kl >= k.opprettet_kl
              )
            ),
            k.opprettet_kl,
            'idekommentar:' || k.id
          from public.idekommentarer k
          join public.ideer i on i.id = k.ide_id
          where i.gruppe_id = g.id and i.arkivert_kl is null
            and not k.slettet and k.forfatter_id <> aktor
          order by k.opprettet_kl desc
          limit 3)
        union all
        -- Gruppeoppgavene, etter det siste som skjedde med dem. Den som
        -- endret en oppgave, lagres ikke; bare en oppgave den innloggede selv
        -- opprettet og ingen har rørt siden, står ikke der.
        (select
            jsonb_build_object(
              'slag', 'oppgave',
              'oppgave', o.id,
              'tittel', o.tittel,
              'hva', case
                when o.status = 'fullfort' and o.status_kl = s.tid then 'fullfort'
                when s.tid = o.opprettet_kl then 'opprettet'
                else 'endret'
              end,
              'tildelt_meg', o.ansvarlig_id = aktor,
              'tid', s.tid,
              'ulest', exists (
                select 1 from public.varsler v
                where v.mottaker_id = aktor and v.gruppe = 'gruppeoppgaver:' || o.id and v.lest_kl is null
              )
            ),
            s.tid,
            'oppgave:' || o.id
          from public.gruppeoppgaver o
          cross join lateral (select greatest(o.opprettet_kl, o.endret_kl, o.status_kl) as tid) s
          where o.gruppe_id = g.id
            and not (o.opprettet_av = aktor and s.tid = o.opprettet_kl)
          order by s.tid desc
          limit 3)
        union all
        -- Nye tråder fra andre på gruppens diskusjonsside. Mens gruppen er
        -- arkivert, er diskusjonene lukket, og de står ikke her.
        (select
            jsonb_build_object(
              'slag', 'diskusjon',
              'diskusjon', d.id,
              'tittel', d.tittel,
              'aktor', intern.aktivitetsperson(d.forfatter_id),
              'tid', d.opprettet_kl,
              'ulest', not exists (select 1 from public.diskusjonsbesok b where b.diskusjon_id = d.id and b.bruker_id = aktor)
            ),
            d.opprettet_kl,
            'diskusjon:' || d.id
          from public.diskusjoner d
          where d.gruppe_id = g.id and g.status = 'aktiv' and d.arkivert_kl is null
            and d.forfatter_id is distinct from aktor
          order by d.opprettet_kl desc
          limit 3)
        union all
        -- Nye kommentarer fra andre i trådene.
        (select
            jsonb_build_object(
              'slag', 'diskusjonskommentar',
              'diskusjon', d.id,
              'kommentar', k.id,
              'tittel', d.tittel,
              'aktor', intern.aktivitetsperson(k.forfatter_id),
              'tid', k.opprettet_kl,
              'ulest', not exists (
                select 1 from public.diskusjonsbesok b
                where b.diskusjon_id = d.id and b.bruker_id = aktor and b.sett_kl >= k.opprettet_kl
              )
            ),
            k.opprettet_kl,
            'diskusjonskommentar:' || k.id
          from public.diskusjonskommentarer k
          join public.diskusjoner d on d.id = k.diskusjon_id
          where d.gruppe_id = g.id and g.status = 'aktiv' and d.arkivert_kl is null
            and not k.slettet and k.skjult_kl is null and k.forfatter_id is distinct from aktor
          order by k.opprettet_kl desc
          limit 3)
        union all
        -- Gruppechatten: én rad med tallet på uleste fra andre og tiden for
        -- den siste av dem, eller for den siste meldingen fra andre når alt
        -- er lest. Aldri tekst eller avsender.
        (select
            jsonb_build_object('slag', 'chat', 'uleste', c.uleste, 'tid', c.tid, 'ulest', c.uleste > 0),
            c.tid,
            'chat'
          from (
            select
              max(m.skrevet_kl) as tid,
              count(*) filter (where m.nr > coalesce(l.lest_til_nr, 0)) as uleste
            from public.gruppemeldinger m
            left join public.gruppechat_lest l on l.gruppe_id = g.id and l.bruker_id = aktor
            where chat and m.gruppe_id = g.id
              and m.forfatter_id is distinct from aktor
              and m.slettet_kl is null
              and m.skrevet_kl >= now() - intern.gruppechat_lagringstid()
          ) c
          where c.tid is not null)
      ) a
      order by a.tid desc, a.nokkel
      limit 3
    ) h
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.gruppeaktivitet(uuid) from public, anon;
grant execute on function public.gruppeaktivitet(uuid) to authenticated;

comment on function public.gruppeaktivitet(uuid) is
  'D3: inntil tre av de nyeste hendelsene i gruppen fra andre, for «Siste aktivitet» på gruppesiden. Samme avslag som gruppeoversikt().';
