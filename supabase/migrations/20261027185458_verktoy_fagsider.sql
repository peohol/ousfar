-- Nye fagsider uten faginnhold
select intern.endring_start('claude-code', '20261027185458_verktoy_fagsider.sql', 'Nye fagsider uten faginnhold (16)', array['https://github.com/peohol/ousfar/pull/280']::text[]);
do $fagsider$
declare
  administrator uuid;
  s record;
  status public.objektstatus;
  forelder uuid;
  kategori uuid;
begin
  select p.id into administrator from public.profiles p where p.username = 'peohol' and p.role = 'admin';
  if administrator is null then
    raise notice 'Fant ingen administrator med brukernavnet %, så importen hoppes over.', 'peohol';
    return;
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', administrator, 'role', 'authenticated')::text, true);
  perform set_config('far.revisjonskilde', 'Ny fagside uten faginnhold for OUSFAR Verktøy (P2)', true);

  for s in
    select * from (values
      ('Agomelatin', 'agomelatin', 'Antidepressiver', null),
      ('Dosulepin', 'dosulepin', 'Antidepressiver', 'TCA'),
      ('Fenelzin', 'fenelzin', 'Antidepressiver', 'MAO-hemmere'),
      ('Flufenazin', 'flufenazin', 'Antipsykotika', 'Førstegenerasjonsmidler'),
      ('Imipramin', 'imipramin', 'Antidepressiver', 'TCA'),
      ('Loksapin', 'loksapin', 'Antipsykotika', 'Førstegenerasjonsmidler'),
      ('Maprotilin', 'maprotilin', 'Antidepressiver', null),
      ('Moklobemid', 'moklobemid', 'Antidepressiver', 'MAO-hemmere'),
      ('Penfluridol', 'penfluridol', 'Antipsykotika', 'Førstegenerasjonsmidler'),
      ('Perisiazin', 'perisiazin', 'Antipsykotika', 'Førstegenerasjonsmidler'),
      ('Pimozid', 'pimozid', 'Antipsykotika', 'Førstegenerasjonsmidler'),
      ('Promazin', 'promazin', 'Antipsykotika', 'Førstegenerasjonsmidler'),
      ('Sulpirid', 'sulpirid', 'Antipsykotika', 'Førstegenerasjonsmidler'),
      ('Tranylcypromin', 'tranylcypromin', 'Antidepressiver', 'MAO-hemmere'),
      ('Trazodon', 'trazodon', 'Antidepressiver', null),
      ('Trifluoperazin', 'trifluoperazin', 'Antipsykotika', 'Førstegenerasjonsmidler')
    ) as t(navn, slug, kategori, underkategori)
  loop
    if exists (select 1 from public.infosider i where lower(i.navn) = lower(s.navn) or i.slug = s.slug) then
      raise notice '% finnes alt som fagside, så den lages ikke på nytt.', s.navn;
      continue;
    end if;
    if exists (select 1 from public.stoffstatus x where x.stoff = s.slug) then
      raise notice '% er slettet for godt, så den lages ikke på nytt.', s.navn;
      continue;
    end if;

    status := public.opprett_utkast('infoside', jsonb_build_object('navn', s.navn, 'slug', s.slug));
    perform public.publiser_utkast(status.id, status.revisjon);

    forelder := (
      select k.id from public.stoffkategorier k
      where k.forelder_id is null and k.navn = s.kategori and k.arkivert_kl is null
    );
    if forelder is null then
      raise notice 'Fant ingen kategori %, så % står under «Andre stoffer».', s.kategori, s.navn;
      continue;
    end if;
    kategori := forelder;
    if s.underkategori is not null then
      kategori := (
        select k.id from public.stoffkategorier k
        where k.forelder_id = forelder and k.navn = s.underkategori and k.arkivert_kl is null
      );
      if kategori is null then
        kategori := public.opprett_stoffkategori(s.underkategori, forelder);
      end if;
    end if;
    perform public.plasser_stoff(s.slug, null, kategori);
  end loop;
end
$fagsider$;