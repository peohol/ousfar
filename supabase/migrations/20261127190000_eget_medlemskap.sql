-- Eget aktivt medlemskap i et fagmiljø, uten systemarkitektunntak (#572).
--
-- `intern.er_medlem_i` og `intern.er_lokal_admin_i` svarer ja for alle
-- systemarkitekter, fordi rettighetsmatrisen (P0 §5.2) lar systemarkitekten
-- lese alt. Funksjoner som ikke skal det, som personalfunksjonene
-- (docs/personal.md §3.3 og §8.4) og funksjonsbryterne per fagmiljø (#598),
-- spør i stedet om brukerens eget medlemskap. Utformingen står i
-- docs/fagmiljoer.md, «Hjelperne for tilgang per fagmiljø».
--
-- Ingen regel eller funksjon som finnes, tar dem i bruk her; ingen
-- rettigheter endres av denne migrasjonen.
--
-- Tilbakeføring: en ny migrasjon som fjerner de to funksjonene, når ingen
-- regel eller funksjon bruker dem lenger. Ingen data endres.

-- Sann bare når brukeren selv har et aktivt medlemskap i det aktive
-- fagmiljøet. Systemarkitektrollen teller ikke, og heller ikke et invitert
-- eller avsluttet medlemskap eller et arkivert fagmiljø. Usann for et tomt
-- fagmiljø eller en tom bruker.
--
-- Vilkåret er det samme som første halvdel av `intern.er_medlem_i`. Den
-- kaller ikke denne, fordi et ekstra funksjonskall per rad koster i lange
-- lister (se 20261120090000_personsok_ytelse.sql); testene krever at de to
-- svarer likt for alle som ikke er systemarkitekter.
create function intern.er_eget_medlem_i(fagmiljo uuid, bruker uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select er_eget_medlem_i.fagmiljo is not null and er_eget_medlem_i.bruker is not null and exists (
    select 1
    from public.medlemskap m
    join public.fagmiljoer f on f.id = m.fagmiljo_id
    where m.bruker_id = er_eget_medlem_i.bruker
      and m.fagmiljo_id = er_eget_medlem_i.fagmiljo
      and m.status = 'aktiv'
      and f.status = 'aktiv'
  )
$$;

revoke all on function intern.er_eget_medlem_i(uuid, uuid) from public, anon, authenticated, service_role;

comment on function intern.er_eget_medlem_i(uuid, uuid) is
  'Eget aktivt medlemskap i det aktive fagmiljøet, uten systemarkitektunntak (#572). Se docs/fagmiljoer.md.';

-- Fagmiljøene den innloggede selv er aktivt medlem av, uten
-- systemarkitektunntak. Tom uten aktivt medlemskap, også for en
-- systemarkitekt uten egne medlemskap. Svarer bare om den innloggede selv.
--
-- Til radsikkerhetsreglene, som kjøres som den innloggede og ikke kan kalle
-- `intern`: `fagmiljo_id = any ((select public.mine_egne_fagmiljoer()))`
-- regnes ut én gang per spørring, ikke per rad.
create function public.mine_egne_fagmiljoer()
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  -- Kontrollen for aktivt medlemskap (P2.0) står først, som i de andre
  -- funksjonene radsikkerheten bruker; uten det er svaret uansett tomt.
  select case
    when not intern.har_aktivt_medlemskap((select auth.uid())) then '{}'::uuid[]
    else coalesce(
      (
        select array_agg(m.fagmiljo_id order by m.fagmiljo_id)
        from public.medlemskap m
        join public.fagmiljoer f on f.id = m.fagmiljo_id
        where m.bruker_id = (select auth.uid())
          and m.status = 'aktiv'
          and f.status = 'aktiv'
      ),
      '{}'::uuid[]
    )
  end
$$;

revoke all on function public.mine_egne_fagmiljoer() from public, anon, authenticated, service_role;
grant execute on function public.mine_egne_fagmiljoer() to authenticated;

comment on function public.mine_egne_fagmiljoer() is
  'Fagmiljøene den innloggede selv er aktivt medlem av, uten systemarkitektunntak (#572). Brukes av radsikkerhetsreglene. Se docs/fagmiljoer.md.';
