-- Kildeovervåkingen for OUSFAR Verktøy i appen (P12.1 og P12.5 i
-- `docs/verktøy-utviklingsplan.md`, `docs/verktøy-p12-overvaking.md`).
--
-- Den ukentlige kontrollen i GitHub Actions melder hver kjøring hit gjennom
-- serverendepunktet `/api/kildeovervaking`, med et OIDC-token for
-- arbeidsflyten på main (`src/verktoy/overvaking/endepunkt.ts`). Et funn som
-- krever ny faglig vurdering, står åpent til en administrator har skrevet den
-- faglige beslutningen; til da har Adminmeny en prikk, og vinduet
-- «Kildeovervåking» viser funnet, fristene og vurderingene.
--
-- Ingenting her endrer, godkjenner eller sperrer en regel, og ingen tekst fra
-- kildene lagres: funnene har bare titler, id-er, statuser og kontrollsummer.
-- Ingen rad slettes. Et funn med nytt innhold får en ny rad som peker på den
-- forrige, og et funn som ikke lenger finnes, merkes, men står åpent til noen
-- har tatt stilling til det. Tabellene leses og skrives bare gjennom
-- funksjonene under.

create table public.kildeovervaking_kjoringer (
  id bigint generated always as identity primary key,
  kjort_kl timestamptz not null,
  mottatt_kl timestamptz not null default now(),
  utlost text not null,
  prove boolean not null default false,
  -- Hva hver del sammenlignet med, og om den ble kjørt (`Grunnlagsdel[]`).
  grunnlag jsonb not null,
  -- Det som stoppet en del av kontrollen.
  feil jsonb not null default '[]'::jsonb,
  -- De informative funnene, med id, kilde, art og etikett.
  informative jsonb not null default '[]'::jsonb,
  -- Kjøringen i GitHub Actions, med den fulle rapporten.
  lenke text,
  constraint kildeovervaking_kjoringer_utlost check (utlost in ('cron', 'manuell')),
  constraint kildeovervaking_kjoringer_former check (
    jsonb_typeof(grunnlag) = 'array' and jsonb_typeof(feil) = 'array' and jsonb_typeof(informative) = 'array'
  ),
  constraint kildeovervaking_kjoringer_lenke check (lenke is null or lenke ~ '^https://github\.com/[A-Za-z0-9_./-]+$')
);

comment on table public.kildeovervaking_kjoringer is
  'Hver kjøring av kildeovervåkingen for Verktøy: hva som ble kontrollert, det som stoppet og de informative funnene. Ingen rad slettes.';

create table public.kildefunn (
  id bigint generated always as identity primary key,
  -- Den stabile nøkkelen fra overvåkingen, som `dokument:keks-2016`.
  funn text not null,
  -- Avtrykket av innholdet uten tidspunkter; et nytt avtrykk er et nytt funn.
  avtrykk text not null,
  kilde text not null,
  art text not null,
  prioritet text not null,
  prove boolean not null default false,
  etikett text not null,
  -- Funnet slik overvåkingen ga det (`Overvakingsfunn`), fra siste kjøring det ble sett i.
  innhold jsonb not null,
  forste_kjoring bigint not null references public.kildeovervaking_kjoringer (id),
  sist_sett_kjoring bigint not null references public.kildeovervaking_kjoringer (id),
  -- Kjøringen som kontrollerte delen uten å finne funnet igjen.
  borte_kjoring bigint references public.kildeovervaking_kjoringer (id),
  -- Funnet med samme nøkkel som denne raden avløste, fordi innholdet var endret.
  erstatter bigint unique references public.kildefunn (id),
  -- Når en nyere rad med samme nøkkel avløste denne.
  erstattet_kl timestamptz,
  opprettet_kl timestamptz not null default now(),
  teknisk_vurdering text,
  teknisk_av uuid references public.profiles (id),
  -- En agent som skrev den tekniske vurderingen, som Claude gjennom arbeidsflyten.
  teknisk_agent text,
  teknisk_kl timestamptz,
  beslutning text,
  beslutning_av uuid references public.profiles (id),
  beslutning_kl timestamptz,
  constraint kildefunn_funn check (char_length(funn) between 3 and 300 and funn !~ '\s'),
  constraint kildefunn_avtrykk check (avtrykk ~ '^[0-9a-f]{64}$'),
  constraint kildefunn_kilde check (kilde in ('dokument', 'psychiatrienet', 'fest')),
  constraint kildefunn_art check (art in ('ny', 'endret', 'fjernet', 'utilgjengelig')),
  constraint kildefunn_prioritet check (prioritet in ('hoy', 'vanlig')),
  constraint kildefunn_etikett check (char_length(btrim(etikett)) between 1 and 500),
  constraint kildefunn_innhold check (jsonb_typeof(innhold) = 'object'),
  -- En CHECK som gir NULL, godtas; derfor står `is not null` eksplisitt.
  constraint kildefunn_teknisk check (
    (teknisk_vurdering is null and teknisk_av is null and teknisk_agent is null and teknisk_kl is null)
    or (
      teknisk_vurdering is not null and char_length(btrim(teknisk_vurdering)) between 5 and 5000 and teknisk_kl is not null
      and ((teknisk_av is not null and teknisk_agent is null) or (teknisk_av is null and teknisk_agent is not null and char_length(btrim(teknisk_agent)) between 2 and 200))
    )
  ),
  constraint kildefunn_beslutning check (
    (beslutning is null and beslutning_av is null and beslutning_kl is null)
    or (beslutning is not null and char_length(btrim(beslutning)) between 5 and 5000 and beslutning_av is not null and beslutning_kl is not null)
  )
);

comment on table public.kildefunn is
  'Funn fra kildeovervåkingen som krever ny faglig vurdering, med teknisk vurdering og faglig beslutning. Ingen rad slettes.';

-- Ett åpent funn per nøkkel.
create unique index kildefunn_apen on public.kildefunn (funn) where beslutning_kl is null and erstattet_kl is null;
create index kildefunn_siste on public.kildefunn (funn, prove, id desc);

alter table public.kildeovervaking_kjoringer enable row level security;
alter table public.kildefunn enable row level security;

revoke all on table public.kildeovervaking_kjoringer from public, anon, authenticated;
revoke all on table public.kildefunn from public, anon, authenticated;

-- --- Kjøringen melder seg -----------------------------------------------------------

-- Fra serverendepunktet, med den hemmelige nøkkelen. `melding` er
-- `{kjort_kl, utlost, prove, lenke, grunnlag, feil, informative,
-- funn: [{avtrykk, innhold}]}`, der `funn` er funnene som krever vurdering.
--
-- Et funn med samme nøkkel og avtrykk som sist står som før: en beslutning om
-- det gjelder fortsatt. Et nytt avtrykk gir en ny, åpen rad, som avløser en
-- åpen rad med samme nøkkel. Et åpent funn i en del som ble kontrollert uten
-- å finne det igjen, merkes som borte, men står åpent. En del som ikke ble
-- kjørt, rører ingen funn. En prøvekjøring gir alltid en ny prøverad og rører
-- ingen reelle funn.
create function public.registrer_kildeovervaking(melding jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  er_prove boolean := coalesce((melding ->> 'prove')::boolean, false);
  kjoring bigint;
  f jsonb;
  inn jsonb;
  forrige public.kildefunn;
  fantes boolean;
  nye integer := 0;
  borte integer := 0;
  kjorte text[];
begin
  if jsonb_typeof(melding -> 'funn') is distinct from 'array' then
    raise exception 'Meldingen mangler funnene.' using errcode = '22023';
  end if;

  insert into public.kildeovervaking_kjoringer (kjort_kl, utlost, prove, grunnlag, feil, informative, lenke)
  values (
    (melding ->> 'kjort_kl')::timestamptz,
    melding ->> 'utlost',
    er_prove,
    melding -> 'grunnlag',
    coalesce(melding -> 'feil', '[]'::jsonb),
    coalesce(melding -> 'informative', '[]'::jsonb),
    nullif(melding ->> 'lenke', '')
  )
  returning id into kjoring;

  for f in select x from jsonb_array_elements(melding -> 'funn') x loop
    inn := f -> 'innhold';
    if jsonb_typeof(inn) is distinct from 'object' then
      raise exception 'Et funn mangler innholdet.' using errcode = '22023';
    end if;
    select * into forrige from public.kildefunn k
    where k.funn = inn ->> 'id' and k.prove = er_prove
    order by k.id desc limit 1;
    fantes := found;
    if fantes and not er_prove and forrige.avtrykk = f ->> 'avtrykk' then
      update public.kildefunn k
      set sist_sett_kjoring = kjoring, borte_kjoring = null, innhold = inn, etikett = inn ->> 'etikett'
      where k.id = forrige.id;
    else
      if fantes and forrige.beslutning_kl is null and forrige.erstattet_kl is null then
        update public.kildefunn k set erstattet_kl = now() where k.id = forrige.id;
      end if;
      insert into public.kildefunn (funn, avtrykk, kilde, art, prioritet, prove, etikett, innhold, forste_kjoring, sist_sett_kjoring, erstatter)
      values (
        inn ->> 'id',
        f ->> 'avtrykk',
        inn ->> 'kilde',
        inn ->> 'art',
        inn ->> 'prioritet',
        er_prove,
        inn ->> 'etikett',
        inn,
        kjoring,
        kjoring,
        case when fantes and forrige.beslutning_kl is null and forrige.erstattet_kl is null then forrige.id end
      );
      nye := nye + 1;
    end if;
  end loop;

  if not er_prove then
    select coalesce(array_agg(g ->> 'kilde'), '{}') into kjorte
    from jsonb_array_elements(melding -> 'grunnlag') g
    where (g ->> 'kjort')::boolean;
    update public.kildefunn k
    set borte_kjoring = kjoring
    where not k.prove and k.beslutning_kl is null and k.erstattet_kl is null and k.borte_kjoring is null
      and k.kilde = any (kjorte) and k.sist_sett_kjoring <> kjoring;
    get diagnostics borte = row_count;
  end if;

  return jsonb_build_object(
    'kjoring', kjoring,
    'nye', nye,
    'borte', borte,
    'apne', (select count(*) from public.kildefunn k where k.beslutning_kl is null and k.erstattet_kl is null)
  );
end;
$$;

-- Den tekniske vurderingen fra en agent (Claude), gjennom arbeidsflyten og
-- serverendepunktet: for nøyaktig den raden (funnets nummer) som ble vurdert.
-- Er funnet avløst av et nyere funn med endret innhold mens det ble vurdert,
-- avvises vurderingen, så en vurdering av det gamle innholdet aldri festes
-- til det nye.
create function public.kildefunn_teknisk_fra_agent(funn bigint, vurdering text, agent text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  rad public.kildefunn;
begin
  select * into rad from public.kildefunn k where k.id = kildefunn_teknisk_fra_agent.funn for update;
  if not found then
    raise exception 'Funn nr. % finnes ikke.', kildefunn_teknisk_fra_agent.funn using errcode = '55000';
  elsif rad.erstattet_kl is not null then
    raise exception 'Funn nr. % er avløst av et nyere funn med endret innhold; vurder det nye. Vurderingen er ikke lagret.', rad.id using errcode = '55000';
  elsif rad.beslutning_kl is not null then
    raise exception 'Funn nr. % er avsluttet. Vurderingen er ikke lagret.', rad.id using errcode = '55000';
  elsif rad.teknisk_kl is not null then
    raise exception 'Funn nr. % har allerede en teknisk vurdering. Vurderingen er ikke lagret.', rad.id using errcode = '55000';
  end if;
  update public.kildefunn k
  set teknisk_vurdering = btrim(kildefunn_teknisk_fra_agent.vurdering), teknisk_agent = btrim(kildefunn_teknisk_fra_agent.agent), teknisk_kl = now()
  where k.id = rad.id;
  return rad.id;
end;
$$;

-- --- Det en administrator ser og gjør i appen ----------------------------------------

-- En kjøring slik appen leser den.
create function intern.kildeovervaking_kjoring(j public.kildeovervaking_kjoringer)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', j.id,
    'kjort_kl', j.kjort_kl,
    'mottatt_kl', j.mottatt_kl,
    'utlost', j.utlost,
    'prove', j.prove,
    'grunnlag', j.grunnlag,
    'feil', j.feil,
    'informative', j.informative,
    'lenke', j.lenke
  )
$$;

-- De åpne funnene, de `historikk` sist avsluttede eller avløste, de
-- `historikk` siste kjøringene og den siste kjøringen som ikke var en prøve.
create function public.les_kildeovervaking(historikk integer default 20)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  antall integer := least(greatest(coalesce(historikk, 0), 0), 200);
begin
  if not public.er_admin() then
    raise exception 'Bare administratorer kan se kildeovervåkingen.' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'funn', (
      select coalesce(jsonb_agg(jsonb_build_object(
          'id', k.id,
          'funn', k.funn,
          'kilde', k.kilde,
          'art', k.art,
          'prioritet', k.prioritet,
          'prove', k.prove,
          'etikett', k.etikett,
          'detaljer', coalesce(k.innhold -> 'detaljer', '[]'::jsonb),
          'berorte', coalesce(k.innhold -> 'berorte', '[]'::jsonb),
          'opprettet_kl', k.opprettet_kl,
          'sist_sett_kl', (select j.kjort_kl from public.kildeovervaking_kjoringer j where j.id = k.sist_sett_kjoring),
          'borte_kl', (select j.kjort_kl from public.kildeovervaking_kjoringer j where j.id = k.borte_kjoring),
          'erstatter', k.erstatter,
          'erstattet_kl', k.erstattet_kl,
          'teknisk_vurdering', k.teknisk_vurdering,
          'teknisk_av', coalesce(intern.profilnavn(k.teknisk_av), k.teknisk_agent),
          'teknisk_kl', k.teknisk_kl,
          'beslutning', k.beslutning,
          'beslutning_av', intern.profilnavn(k.beslutning_av),
          'beslutning_kl', k.beslutning_kl
        ) order by k.id desc), '[]'::jsonb)
      from (
        select * from public.kildefunn a where a.beslutning_kl is null and a.erstattet_kl is null
        union all
        (select * from public.kildefunn b where b.beslutning_kl is not null or b.erstattet_kl is not null order by b.id desc limit antall)
      ) k
    ),
    'kjoringer', (
      select coalesce(jsonb_agg(intern.kildeovervaking_kjoring(j) order by j.id desc), '[]'::jsonb)
      from public.kildeovervaking_kjoringer j
      where j.id in (select x.id from public.kildeovervaking_kjoringer x order by x.id desc limit antall)
    ),
    'siste', (
      select intern.kildeovervaking_kjoring(j)
      from public.kildeovervaking_kjoringer j
      where not j.prove
      order by j.id desc
      limit 1
    )
  );
end;
$$;

create function public.vurder_kildefunn(funn bigint, vurdering text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.er_admin() then
    raise exception 'Bare administratorer kan vurdere funn fra kildeovervåkingen.' using errcode = '42501';
  end if;
  update public.kildefunn k
  set teknisk_vurdering = btrim(vurder_kildefunn.vurdering), teknisk_av = (select auth.uid()), teknisk_kl = now()
  where k.id = vurder_kildefunn.funn and k.beslutning_kl is null and k.erstattet_kl is null and k.teknisk_kl is null;
  if not found then
    raise exception 'Funnet finnes ikke, er avløst av et nyere funn med endret innhold, er allerede vurdert eller er avsluttet. Hent funnene på nytt.' using errcode = '55000';
  end if;
end;
$$;

create function public.beslutt_kildefunn(funn bigint, beslutning text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.er_admin() then
    raise exception 'Bare administratorer kan avslutte funn fra kildeovervåkingen.' using errcode = '42501';
  end if;
  update public.kildefunn k
  set beslutning = btrim(beslutt_kildefunn.beslutning), beslutning_av = (select auth.uid()), beslutning_kl = greatest(now(), k.opprettet_kl)
  where k.id = beslutt_kildefunn.funn and k.beslutning_kl is null and k.erstattet_kl is null;
  if not found then
    raise exception 'Funnet finnes ikke, er avløst av et nyere funn med endret innhold eller er allerede avsluttet. Hent funnene på nytt.' using errcode = '55000';
  end if;
end;
$$;

comment on function public.registrer_kildeovervaking(jsonb) is
  'Registrerer en kjøring av kildeovervåkingen og funnene som krever vurdering. Bare for serverendepunktet.';
comment on function public.kildefunn_teknisk_fra_agent(bigint, text, text) is
  'Den tekniske vurderingen av nøyaktig ett åpent funn fra en agent, gjennom arbeidsflyten; avvises når funnet er avløst. Bare for serverendepunktet.';
comment on function public.les_kildeovervaking(integer) is
  'De åpne funnene fra kildeovervåkingen, de sist avsluttede og de siste kjøringene. Bare for administratorer.';
comment on function public.vurder_kildefunn(bigint, text) is
  'Skriver den tekniske vurderingen av et åpent funn. Bare for administratorer.';
comment on function public.beslutt_kildefunn(bigint, text) is
  'Skriver den faglige beslutningen og avslutter funnet. Bare for administratorer.';

-- --- Rettigheter ---------------------------------------------------------------------

revoke all on function public.registrer_kildeovervaking(jsonb) from public, anon, authenticated;
revoke all on function public.kildefunn_teknisk_fra_agent(bigint, text, text) from public, anon, authenticated;
revoke all on function intern.kildeovervaking_kjoring(public.kildeovervaking_kjoringer) from public, anon, authenticated, service_role;
revoke all on function public.les_kildeovervaking(integer) from public, anon, authenticated, service_role;
revoke all on function public.vurder_kildefunn(bigint, text) from public, anon, authenticated, service_role;
revoke all on function public.beslutt_kildefunn(bigint, text) from public, anon, authenticated, service_role;
grant execute on function public.registrer_kildeovervaking(jsonb) to service_role;
grant execute on function public.kildefunn_teknisk_fra_agent(bigint, text, text) to service_role;
grant execute on function public.les_kildeovervaking(integer) to authenticated;
grant execute on function public.vurder_kildefunn(bigint, text) to authenticated;
grant execute on function public.beslutt_kildefunn(bigint, text) to authenticated;
