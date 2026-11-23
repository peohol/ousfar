-- Versjonen for CYPinfo i søket (#539, docs/cypinfo-integrasjon.md): søket i
-- hele kunnskapsbasen tar med CYPinfos anbefalinger for dem som ser CYPinfo
-- på fagsidene, og leser dem bare på nytt når en henting fra CYPinfo har
-- endret noe (status 'fullfort'; 'uendret' endrer ingenting).
--
-- `cpic` tas ut av svaret: søket leser ikke CPIC lenger (#537), og skjemaet
-- skal kunne slettes uten at denne funksjonen må endres (#540).
--
-- Ingen data endres. Tilbakeføring: den forrige definisjonen står i
-- 20261114103000_aktivt_medlemskap.sql.

create or replace function public.sokedata_versjoner()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select intern.krev_aktivt_medlemskap();
  select jsonb_build_object(
    'sider', (select v.last_value::text from intern.publisert_innhold_versjon v) || ':' || current_date::text,
    'fest', coalesce((
      select max(s.id)::text from legemiddeldata.synkroniseringer s
      where s.kilde = 'FEST' and s.status = 'fullfort'), '0'),
    'cypinfo', coalesce((
      select max(s.id)::text from cypinfo.synkroniseringer s where s.status = 'fullfort'), '0'),
    'clinpgx', coalesce((
      select max(s.id)::text from clinpgx.synkroniseringer s where s.status in ('fullfort', 'delvis')), '0')
      || ':' || coalesce((select max(k.sist_hentet_kl)::text from clinpgx.kjemikalier k), ''),
    'laboratorier', coalesce((
      select max(s.id)::text from farmakologiportalen.synkroniseringer s where s.status = 'fullfort'), '0')
  )
$$;

notify pgrst, 'reload schema';
