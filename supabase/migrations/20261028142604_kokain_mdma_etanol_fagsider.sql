-- Nye fagsider uten faginnhold
select intern.endring_start('claude-code', '20261028142604_kokain_mdma_etanol_fagsider.sql', 'Nye fagsider uten faginnhold (3)');
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
  perform set_config('far.revisjonskilde', 'Ny fagside uten faginnhold, til kuratering', true);

  for s in
    select * from (values
      ('Kokain', 'kokain', 'Stimulanter', null),
      ('MDMA', 'mdma', 'Stimulanter', null),
      ('Etanol', 'etanol', 'Alkohol og GHB', null)
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

    if exists (
      select 1 from public.stoffplasseringer p
      join public.stoffkategorier k on k.id = p.kategori_id
      where p.stoff = s.slug and k.arkivert_kl is null
    ) then
      raise notice '% står alt i stoffregisteret, så plasseringen står som den er.', s.navn;
      continue;
    end if;
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