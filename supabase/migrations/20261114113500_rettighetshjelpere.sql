-- P2a–d: felles hjelpere for tilgang per fagmiljø.
--
-- Rettighetene per fagmiljø (P2a faginnhold, P2b samhandling, P2c profiler,
-- P2d administrasjon) bygger på de samme få spørsmålene: er brukeren medlem
-- av fagmiljøet, kan brukeren lese noe med en gitt rekkevidde, og er brukeren
-- lokal administrator der. Svarene står her, én gang, slik at delene ikke
-- lager hver sin variant. Utformingen står i docs/fagmiljoer.md,
-- «Hjelperne for tilgang per fagmiljø».
--
-- Alt bygger på definisjonene fra P1.1, P1.2a og P2.0:
-- `intern.er_systemarkitekt`, `intern.administrerte_fagmiljoer` og
-- `intern.har_aktivt_medlemskap`. Ingen regel eller funksjon som finnes, tar
-- dem i bruk her; ingen rettigheter endres av denne migrasjonen.
--
-- Tilbakeføring: en ny migrasjon som fjerner de seks funksjonene, når ingen
-- regel eller funksjon bruker dem lenger. Ingen data endres.

-- --- Medlem av et fagmiljø --------------------------------------------------

-- Sann når brukeren har et aktivt medlemskap i det aktive fagmiljøet, eller
-- er systemarkitekt (som kan lese alt, P0 §5.2). Usann for et tomt fagmiljø
-- eller en tom bruker, og for et invitert, deaktivert eller arkivert
-- medlemskap.
create function intern.er_medlem_i(fagmiljo uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select er_medlem_i.fagmiljo is not null and er_medlem_i.bruker is not null and (
    exists (
      select 1
      from public.medlemskap m
      join public.fagmiljoer f on f.id = m.fagmiljo_id
      where m.bruker_id = er_medlem_i.bruker
        and m.fagmiljo_id = er_medlem_i.fagmiljo
        and m.status = 'aktiv'
        and f.status = 'aktiv'
    )
    or intern.er_systemarkitekt(er_medlem_i.bruker)
  )
$$;

revoke all on function intern.er_medlem_i(uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.er_medlem_i(uuid, uuid) is
  'Aktivt medlemskap i det aktive fagmiljøet, eller systemarkitekt. Se docs/fagmiljoer.md.';

-- --- Lese noe med en rekkevidde ----------------------------------------------

-- Om brukeren kan lese en ressurs med rekkevidden (`ressursomfang.omfang` og
-- `fagmiljo_id`). Felles: alle med et aktivt medlemskap. Et fagmiljø: dets
-- medlemmer. En gruppe: bare systemarkitektene, til gruppene finnes (P6).
-- Alt annet, også en tom rekkevidde, gir nei.
create function intern.kan_lese_omfang(omfang text, fagmiljo uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    case kan_lese_omfang.omfang
      when 'felles' then intern.har_aktivt_medlemskap(kan_lese_omfang.bruker)
      when 'fagmiljo' then intern.er_medlem_i(kan_lese_omfang.fagmiljo, kan_lese_omfang.bruker)
      when 'gruppe' then kan_lese_omfang.bruker is not null and intern.er_systemarkitekt(kan_lese_omfang.bruker)
      else false
    end,
    false
  )
$$;

revoke all on function intern.kan_lese_omfang(text, uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.kan_lese_omfang(text, uuid, uuid) is
  'Om brukeren kan lese en ressurs med rekkevidden (felles, fagmiljø, gruppe). Nei uten treff. Se docs/fagmiljoer.md.';

-- --- Lokal administrator ------------------------------------------------------

-- Sann når brukeren administrerer fagmiljøet nå (aktiv tildeling, aktivt
-- medlemskap og aktivt fagmiljø, som `intern.administrerte_fagmiljoer`), eller
-- er systemarkitekt. Den gamle adminrollen (`profiles.role`) teller ikke.
create function intern.er_lokal_admin_i(fagmiljo uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select er_lokal_admin_i.fagmiljo is not null and er_lokal_admin_i.bruker is not null and (
    er_lokal_admin_i.fagmiljo in (select intern.administrerte_fagmiljoer(er_lokal_admin_i.bruker))
    or intern.er_systemarkitekt(er_lokal_admin_i.bruker)
  )
$$;

revoke all on function intern.er_lokal_admin_i(uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.er_lokal_admin_i(uuid, uuid) is
  'Lokal administrator i fagmiljøet nå, eller systemarkitekt. Den gamle adminrollen teller ikke. Se docs/fagmiljoer.md.';

-- --- Til radsikkerhetsreglene -------------------------------------------------

-- Fagmiljøene den innloggede kan lese lokalt innhold i: de med et aktivt
-- medlemskap i et aktivt fagmiljø, og alle for en systemarkitekt. Tom uten
-- aktivt medlemskap. Svarer bare om den innloggede selv.
--
-- Reglene kjøres som den innloggede og kan ikke kalle `intern`. De bruker
-- denne som `(select public.mine_lesbare_fagmiljoer())`, som regnes ut én
-- gang per spørring, ikke per rad.
create function public.mine_lesbare_fagmiljoer()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.har_aktivt_medlemskap((select auth.uid())) then '{}'::uuid[]
    else coalesce(
      (
        select array_agg(f.id order by f.id)
        from public.fagmiljoer f
        where intern.er_medlem_i(f.id, (select auth.uid()))
      ),
      '{}'::uuid[]
    )
  end
$$;

revoke all on function public.mine_lesbare_fagmiljoer() from public, anon, authenticated, service_role;
grant execute on function public.mine_lesbare_fagmiljoer() to authenticated;

comment on function public.mine_lesbare_fagmiljoer() is
  'Fagmiljøene den innloggede kan lese lokalt innhold i (P2a–d). Brukes av radsikkerhetsreglene. Se docs/fagmiljoer.md.';

-- Om den innloggede er systemarkitekt. Svarer bare om den innloggede selv.
create function public.er_systemarkitekt()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select intern.har_aktivt_medlemskap((select auth.uid())) and intern.er_systemarkitekt((select auth.uid()))
$$;

revoke all on function public.er_systemarkitekt() from public, anon, authenticated, service_role;
grant execute on function public.er_systemarkitekt() to authenticated;

comment on function public.er_systemarkitekt() is
  'Om den innloggede er systemarkitekt (P2a–d). Brukes av radsikkerhetsreglene og appen. Se docs/fagmiljoer.md.';

-- Fagmiljøene den innloggede administrerer nå (`intern.er_lokal_admin_i`):
-- de med en aktiv tildeling, og alle for en systemarkitekt. Tom uten aktivt
-- medlemskap. Svarer bare om den innloggede selv.
create function public.mine_administrerte_fagmiljoer()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when not intern.har_aktivt_medlemskap((select auth.uid())) then '{}'::uuid[]
    else coalesce(
      (
        select array_agg(f.id order by f.id)
        from public.fagmiljoer f
        where intern.er_lokal_admin_i(f.id, (select auth.uid()))
      ),
      '{}'::uuid[]
    )
  end
$$;

revoke all on function public.mine_administrerte_fagmiljoer() from public, anon, authenticated, service_role;
grant execute on function public.mine_administrerte_fagmiljoer() to authenticated;

comment on function public.mine_administrerte_fagmiljoer() is
  'Fagmiljøene den innloggede administrerer nå (P2a–d). Brukes av radsikkerhetsreglene og appen. Se docs/fagmiljoer.md.';
