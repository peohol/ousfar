-- D2: den personlige forsiden (docs/forside.md, docs/ux-dashboard-chat-navigasjon-plan.md §4 og §10).
--
-- Ett smalt kall, `public.forsideoppsummering(modul)`, gir inntil tre rader til
-- ett panel på forsiden. Hvert panel kaller det for seg, så et panel som feiler
-- ikke tar de andre med seg. Tilgangen avgjøres her, før noe returneres:
-- varslene gjennom de samme kontrollene som `mine_varsler()`, gruppene bare der
-- den innloggede er aktivt medlem, og fagsidene bare publiserte sider.
--
-- Det som hører til et fagmiljø (fortolkningen, trådene der), tas bare med fra
-- fagmiljøet brukeren arbeider i nå (`intern.arbeidsfagmiljo`), så et bytte
-- aldri viser det forrige fagmiljøets lokale saker. Gruppene og det felles
-- følger medlemskapene, som ellers i appen.
--
-- Ingen ny hendelseslogg: varslene, gruppene (`mine_grupper()`,
-- `intern.gruppesamhandling`) og publiseringene av faginnholdet er grunnlaget.
-- Hvilke paneler brukeren vil se, lagres i `brukerinnstillinger`
-- (`forside.moduler`), der hver bruker bare leser og skriver sine egne.
--
-- Tilbakeføring: en ny migrasjon som dropper `public.forsideoppsummering`,
-- `intern.forsidevarsler`, `intern.varselsvar` og indeksen, og setter
-- `public.mine_varsler()` tilbake til 20261117040100. Ingen data endres.

-- --- Ett varsel slik appen leser det -------------------------------------------

-- Det `mine_varsler()` gir for hvert varsel, med hendelsene slik de vises
-- (`intern.varselhendelser`). Felles for varselvinduet og forsiden, så de
-- aldri viser det samme varselet ulikt.
create function intern.varselsvar(v public.varsler, hendelser jsonb)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', v.id,
    'kategori', v.kategori,
    'ide', (select jsonb_build_object('id', i.id, 'tittel', i.tittel, 'forfatter_id', i.forfatter_id,
              'gruppe', (select jsonb_build_object('id', g.id, 'navn', g.navn) from public.grupper g where g.id = i.gruppe_id))
            from public.ideer i where i.id = v.ide_id),
    'diskusjon', (select jsonb_build_object('id', d.id, 'tittel', d.tittel, 'side', d.side, 'forfatter_id', d.forfatter_id)
                  from public.diskusjoner d where d.id = v.diskusjon_id),
    'hendelser', varselsvar.hendelser,
    'opprettet_kl', v.opprettet_kl,
    'oppdatert_kl', v.oppdatert_kl,
    'lest_kl', v.lest_kl,
    'arkivert_kl', v.arkivert_kl
  )
$$;

revoke all on function intern.varselsvar(public.varsler, jsonb) from public, anon, authenticated, service_role;

-- Som i 20261117040100, med svaret for hvert varsel fra `intern.varselsvar`.
-- Utvalget, rekkefølgen og taket er de samme.
create or replace function public.mine_varsler()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select jsonb_build_object(
    'lest_kl', now(),
    'varsler', coalesce((
      select jsonb_agg(intern.varselsvar(v.rad, v.hendelser) order by (v.rad).oppdatert_kl desc, (v.rad).id)
      from (
        select x as rad, intern.varselhendelser(x.hendelser) as hendelser
        from public.varsler x
        where x.mottaker_id = (select auth.uid())
          and (x.lest_kl is null or x.lest_kl > now() - intern.varselfrist())
          and intern.kan_lese_samhandling(x.fagmiljo_id, x.gruppe_id)
        order by x.lest_kl is not null, x.oppdatert_kl desc, x.id
        limit 200
      ) v
      where jsonb_array_length(v.hendelser) > 0
    ), '[]'::jsonb)
  )
$$;

-- --- Varslene på forsiden ---------------------------------------------------------

-- Inntil tre av den innloggedes varsler i `kategorier`: med `bare_uleste` bare
-- de uleste, ellers de uleste først og så de leste innenfor fristen. Med
-- `etter_kategori` kommer kategoriene i den rekkefølgen de er gitt (hva som
-- krever handling først), før tiden. Det lokale tas bare med fra fagmiljøet
-- brukeren arbeider i nå.
create function intern.forsidevarsler(kategorier public.varselkategori[], bare_uleste boolean, etter_kategori boolean default false)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(intern.varselsvar(v.rad, v.hendelser) order by v.nr), '[]'::jsonb)
  from (
    select k.rad, k.hendelser, row_number() over (order by k.nr) as nr
    from (
      select x as rad, intern.varselhendelser(x.hendelser) as hendelser,
        row_number() over (
          order by x.lest_kl is not null,
            case when etter_kategori then array_position(forsidevarsler.kategorier, x.kategori) end,
            x.oppdatert_kl desc, x.id
        ) as nr
      from public.varsler x
      where x.mottaker_id = (select auth.uid())
        and x.kategori = any (forsidevarsler.kategorier)
        and x.arkivert_kl is null
        and (x.lest_kl is null or (not bare_uleste and x.lest_kl > now() - intern.varselfrist()))
        and (x.fagmiljo_id is null or x.fagmiljo_id = intern.arbeidsfagmiljo((select auth.uid())))
        and intern.kan_lese_samhandling(x.fagmiljo_id, x.gruppe_id)
      order by nr
      -- Noen få ekstra, fordi et varsel uten hendelser som kan vises, faller bort.
      limit 12
    ) k
    where jsonb_array_length(k.hendelser) > 0
    order by k.nr
    limit 3
  ) v
$$;

revoke all on function intern.forsidevarsler(public.varselkategori[], boolean, boolean) from public, anon, authenticated, service_role;

-- --- Fagsidene som er endret --------------------------------------------------------

-- Publiseringene leses etter tid; uten indeksen måtte hele tabellen leses
-- hver gang forsiden åpnes. Tabellen er smal, så skrivelåsen varer kort.
create index objektpubliseringer_utfort_idx on public.objektpubliseringer (utfort_kl);

-- --- Kallet ---------------------------------------------------------------------------

-- `modul`:
--   viktig_nytt  endringer i fortolkningen i fagmiljøet (appens egne nyheter
--                kommer fra endringsloggen i appen)
--   aktuelt      det som venter på den innloggede: invitasjoner til grupper og
--                uleste varsler om forslag, oppgaver og svar, i den rekkefølgen
--   grupper      gruppene den innloggede er aktivt medlem av, med ny aktivitet først
--   fagsider     fagsidene med publiserte endringer de siste 30 dagene
--   ideer        nye idéer, felles og i gruppene
--   oppgaver     de åpne gruppeoppgavene den innloggede er ansvarlig for
--   diskusjoner  ny aktivitet i trådene den innloggede følger
-- Svaret har også `lest_kl`, så appen kan merke et varsel lest slik det var da
-- (`merk_varsler_lest`). En ukjent modul er en feil (22023).
create function public.forsideoppsummering(modul text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  meg uuid := (select auth.uid());
  valg jsonb;
  svar jsonb;
begin
  perform intern.krev_aktivt_medlemskap();

  case modul
  when 'viktig_nytt' then
    svar := jsonb_build_object('varsler', intern.forsidevarsler(array['fortolkning']::public.varselkategori[], false));

  when 'aktuelt' then
    -- Kategoriene brukeren har slått av i varselinnstillingene, står ikke her
    -- heller. Alle disse er på som standard.
    select b.verdi into valg from public.brukerinnstillinger b where b.bruker_id = meg and b.nokkel = 'varsler.valg';
    svar := jsonb_build_object(
      'invitasjoner', coalesce((
        select jsonb_agg(i.verdi order by i.nr)
        from jsonb_array_elements(public.mine_grupper() -> 'invitasjoner') with ordinality i(verdi, nr)
        where i.nr <= 3
      ), '[]'::jsonb),
      'varsler', intern.forsidevarsler(
        array(
          select k from unnest(array['forslag_til_behandling', 'gruppeoppgaver', 'mine_forslag', 'mine_ideer', 'mine_diskusjoner']::public.varselkategori[]) with ordinality u(k, nr)
          where coalesce(valg ->> k::text, '') <> 'false'
          order by u.nr
        ),
        true,
        true
      )
    );

  when 'grupper' then
    svar := jsonb_build_object('grupper', coalesce((
      select jsonb_agg(x.svar order by x.nye desc, x.navn, x.id)
      from (
        select g.id, lower(g.navn) as navn,
          intern.gruppereferanse(g) || jsonb_build_object(
            'medlemmer', (select count(*) from public.gruppemedlemskap a where a.gruppe_id = g.id and a.status = 'aktiv'),
            'samhandling', s.verdi
          ) as svar,
          coalesce((s.verdi ->> 'nye_ideer')::integer, 0) + coalesce((s.verdi ->> 'chat_uleste')::integer, 0) as nye
        from public.grupper g
        join public.gruppemedlemskap m on m.gruppe_id = g.id
        cross join lateral (select intern.gruppesamhandling(g.id) as verdi) s
        where g.status = 'aktiv'
          and m.bruker_id = meg
          and m.status = 'aktiv'
          and intern.kan_vaere_med_i_gruppe(g, meg)
        order by nye desc, lower(g.navn), g.id
        limit 3
      ) x
    ), '[]'::jsonb));

  when 'fagsider' then
    -- Sidene og delene publiseringene gjaldt, slik de står publisert nå. Det
    -- rutinene gjorde (ryddingen, tjenestene), regnes ikke; et kort som er
    -- fjernet, er ingen del å lenke til.
    svar := jsonb_build_object('fagsider', coalesce((
      with pub as (
        select p.objekt_id, p.utfort_kl as kl
        from public.objektpubliseringer p
        where p.utfort_kl > now() - intern.varselfrist()
          and not exists (
            select 1 from public.innholdsendringer e
            join public.endringsagenter a on a.nokkel = e.agent
            where e.id = p.endring_id and a.rutine
          )
      ),
      deler as (
        select e.infoside_id as side, e.panel as del, p.kl
        from pub p join public.innholdselementer e on e.objekt_id = p.objekt_id and e.tilstand = 'publisert'
        union all
        select s.objekt_id, null, p.kl
        from pub p join public.infosider s on s.objekt_id = p.objekt_id and s.tilstand = 'publisert'
        union all
        select coalesce(e.infoside_id, k.objekt_id), coalesce(k.panel, e.panel), p.kl
        from pub p
        join public.referansekoblinger k on k.referanse_id = p.objekt_id and k.tilstand = 'publisert'
        left join public.innholdselementer e on e.objekt_id = k.objekt_id and e.tilstand = k.tilstand
      ),
      sider as (
        select d.side, max(d.kl) as kl
        from deler d
        join public.infosider s on s.objekt_id = d.side and s.tilstand = 'publisert'
        group by d.side
        order by max(d.kl) desc, d.side
        limit 3
      )
      select jsonb_agg(jsonb_build_object(
          'side', intern.varselside(s.side),
          'kl', s.kl,
          -- Delene som ble endret samme dag som den siste endringen.
          'deler', (
            select coalesce(jsonb_agg(distinct d.del), '[]'::jsonb)
            from deler d
            where d.side = s.side and d.del is not null and d.del <> 'fjernet' and d.kl > s.kl - interval '1 day'
          )
        ) order by s.kl desc, s.side)
      from sider s
    ), '[]'::jsonb));

  when 'ideer' then
    svar := jsonb_build_object('varsler', intern.forsidevarsler(array['nye_ideer', 'gruppeideer']::public.varselkategori[], false));

  when 'oppgaver' then
    svar := jsonb_build_object('oppgaver', coalesce((
      select jsonb_agg(jsonb_build_object(
          'id', o.id,
          'tittel', o.tittel,
          'prioritet', o.prioritet,
          'status', o.status,
          'kl', o.kl,
          'gruppe', jsonb_build_object('id', o.gruppe_id, 'navn', o.gruppe_navn)
        ) order by o.rang, o.kl desc, o.id)
      from (
        select o.id, o.tittel, o.prioritet, o.status, g.id as gruppe_id, g.navn as gruppe_navn,
          case o.prioritet when 'hoy' then 0 when 'normal' then 1 else 2 end as rang,
          greatest(o.status_kl, coalesce(o.endret_kl, o.opprettet_kl)) as kl
        from public.gruppeoppgaver o
        join public.grupper g on g.id = o.gruppe_id
        where o.ansvarlig_id = meg
          and o.status <> 'fullfort'
          and g.status = 'aktiv'
          and intern.kan_lese_gruppe(g.id, meg)
        order by rang, kl desc, o.id
        limit 3
      ) o
    ), '[]'::jsonb));

  when 'diskusjoner' then
    svar := jsonb_build_object('varsler', intern.forsidevarsler(array['aktive_diskusjoner', 'favorittdiskusjoner']::public.varselkategori[], false));

  else
    raise exception 'Ukjent modul på forsiden: %', modul using errcode = '22023';
  end case;
  return svar || jsonb_build_object('lest_kl', now());
end;
$$;

revoke all on function public.forsideoppsummering(text) from public, anon, authenticated, service_role;
grant execute on function public.forsideoppsummering(text) to authenticated;

comment on function public.forsideoppsummering(text) is
  'D2: inntil tre rader til ett panel på forsiden, filtrert på tilgang og arbeidsfagmiljø. Se docs/forside.md.';
