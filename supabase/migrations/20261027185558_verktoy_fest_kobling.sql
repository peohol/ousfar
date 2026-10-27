-- Stoffsidene kobles til virkestoffene i FEST
select intern.endring_start('claude-code', '20261027185558_verktoy_fest_kobling.sql', 'Fagsider koblet til legemiddeldataene (16)', array['https://github.com/peohol/ousfar/pull/280']::text[]);
do $kobling$
declare
  administrator uuid;
  k record;
  side uuid;
  virkestoff jsonb;
  status public.objektstatus;
begin
  select p.id into administrator from public.profiles p where p.username = 'peohol' and p.role = 'admin';
  if administrator is null then
    raise notice 'Fant ingen administrator med brukernavnet %, så importen hoppes over.', 'peohol';
    return;
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', administrator, 'role', 'authenticated')::text, true);
  perform set_config('far.revisjonskilde', 'Koblet til virkestoffet i FEST', true);

  for k in
    select t.side, array_agg(t.fest_id order by t.nr) as fest_ider
    from (values
      ('Agomelatin', 'ID_B01358F8-EB08-4C5C-8399-4F70197493F1', 0),
      ('Dosulepin', 'ID_DD009B35-8BF4-4080-80C5-3F400A89F713', 1),
      ('Fenelzin', 'ID_B3CA8826-0F7A-4190-B1C3-E3B897AE69FF', 2),
      ('Flufenazin', 'ID_0263C5B9-693B-4BE3-84D4-7EB46AB0A71C', 3),
      ('Imipramin', 'ID_D136F468-4949-4C91-81E4-04628D7C07DE', 4),
      ('Loksapin', 'ID_CBF9DD3B-0EFC-4CB2-B78C-9D61AFD78AFA', 5),
      ('Maprotilin', 'ID_EC5AFDB1-7FAD-44E8-BD51-89E84AC709E3', 6),
      ('Moklobemid', 'ID_D1F74888-C7D1-474F-A9E8-2E58CB136B06', 7),
      ('Penfluridol', 'ID_DF5D1607-B995-49E6-A7F1-CF4440AC101A', 8),
      ('Perisiazin', 'ID_429EE77E-79B6-4431-98E8-D5281A9E1D39', 9),
      ('Pimozid', 'ID_D700661D-AD77-4F91-880E-5B101EFAC189', 10),
      ('Promazin', 'ID_891C7906-F62A-4D2B-80B2-2CE5478CAF18', 11),
      ('Sulpirid', 'ID_E5BEB70C-39AD-4EA1-87B5-63983C1D534A', 12),
      ('Tranylcypromin', 'ID_6E876C08-FF0F-48BC-AAEE-15C0A3B83DCA', 13),
      ('Trazodon', 'ID_90E0E28B-FDED-44F8-88DA-EEB0232AEAFD', 14),
      ('Trifluoperazin', 'ID_E52C65FD-26A0-4B1F-8E26-EB3012B77F81', 15)
    ) as t(side, fest_id, nr)
    group by t.side
    order by min(t.nr)
  loop
    side := (select i.objekt_id from public.infosider i where i.tilstand = 'publisert' and i.navn = k.side);
    if side is null then
      raise notice 'Fant ingen publisert side %, så den hoppes over.', k.side;
      continue;
    end if;
    if exists (
      select 1 from public.innholdselementer e
      where e.infoside_id = side and e.elementtype = 'legemiddelkobling' and e.panel <> 'fjernet'
    ) then
      raise notice '% er alt koblet til legemiddeldataene, så den hoppes over.', k.side;
      continue;
    end if;
    virkestoff := (
      select jsonb_agg(jsonb_build_object('fest_id', v.fest_id, 'navn', v.navn) order by array_position(k.fest_ider, v.fest_id))
      from legemiddeldata.virkestoff v where v.fest_id = any(k.fest_ider) and v.utgatt_kl is null
    );
    if coalesce(jsonb_array_length(virkestoff), 0) < cardinality(k.fest_ider) then
      raise notice 'Noen av virkestoffene % for % finnes ikke i FEST.', k.fest_ider, k.side;
    end if;
    if virkestoff is null then
      raise notice 'Ingen av virkestoffene for % finnes i FEST, så siden hoppes over.', k.side;
      continue;
    end if;

    status := public.opprett_utkast('innholdselement', jsonb_build_object(
      'infoside', side,
      'panel', 'preparater',
      'posisjon', 0,
      'elementtype', 'legemiddelkobling',
      'data', jsonb_build_object('virkestoff', virkestoff)
    ));
    perform public.publiser_utkast(status.id, status.revisjon);
  end loop;
end
$kobling$;