-- Tilbakefylling av `ressursomfang` (P4a): hvert redigerbare objekt som
-- finnes, får rekkevidden etter regelen `intern.ressursomfang_for`, slik nye
-- objekter får den. Ingenting leser tabellen ennå, så ingen merker noe.
--
-- Kan kjøres flere ganger: objekter som alt har en rekkevidde, røres ikke.
-- Migrasjonen kontrollerer sluttilstanden selv og stopper (og rulles
-- tilbake) hvis et objekt mangler rekkevidde, har mer enn én, eller har en
-- annen enn regelen gir uten å være satt for hånd. Den skriver bare antall i loggen.

do $$
declare
  objekter int;
  for_ int;
  nye int;
  avvik int;
  felles int;
  lokale int;
  per_regel text;
begin
  select count(*) into objekter from public.redigerbare_objekter;
  select count(*) into for_ from public.ressursomfang;

  insert into public.ressursomfang (objekt_id, omfang, fagmiljo_id, regel)
  select o.id, r.omfang, r.fagmiljo_id, r.regel
  from public.redigerbare_objekter o
  cross join lateral intern.ressursomfang_for(o.id) r
  where not exists (select 1 from public.ressursomfang x where x.objekt_id = o.id);
  get diagnostics nye = row_count;

  -- Hvert objekt har nøyaktig én rekkevidde (primærnøkkelen gir høyst én).
  select count(*) into avvik
  from public.redigerbare_objekter o
  where not exists (select 1 from public.ressursomfang x where x.objekt_id = o.id);
  if avvik > 0 or (select count(*) from public.ressursomfang) <> objekter then
    raise exception 'P4a: % av % objekter mangler rekkevidde.', avvik, objekter;
  end if;

  -- Og den er den regelen gir, der den ikke er satt for hånd.
  select count(*) into avvik
  from public.ressursomfang x
  cross join lateral intern.ressursomfang_for(x.objekt_id) r
  where x.regel is not null and (x.omfang, x.fagmiljo_id, x.regel) is distinct from (r.omfang, r.fagmiljo_id, r.regel);
  if avvik > 0 then
    raise exception 'P4a: % objekter har en annen rekkevidde enn regelen gir.', avvik;
  end if;

  -- Ingen lokal type er felles, og ingen felles type er lokal (P0 §3, D4).
  select count(*) into avvik
  from public.ressursomfang x
  join public.redigerbare_objekter o on o.id = x.objekt_id
  where x.regel is not null and (o.type in ('infoside', 'innholdselement', 'referanse')) <> (x.omfang = 'felles');
  if avvik > 0 then
    raise exception 'P4a: % objekter har rekkevidde i strid med klassifiseringen.', avvik;
  end if;

  select count(*) filter (where omfang = 'felles'),
         count(*) filter (where omfang = 'fagmiljo')
  into felles, lokale
  from public.ressursomfang;

  select string_agg(format('%s %s', regel, n), ', ' order by regel) into per_regel
  from (select regel, count(*) n from public.ressursomfang group by regel) t;

  raise notice 'P4a: % objekter; % hadde rekkevidde fra før, % nye. Felles %, lokale %. Per regel: %.',
    objekter, for_, nye, felles, lokale, coalesce(per_regel, 'ingen');
end;
$$;
