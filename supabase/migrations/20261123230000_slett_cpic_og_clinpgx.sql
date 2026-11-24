-- destruktiv-godkjent: Peder 2026-11-23 («Slett de gamle dataene og slå på CYPinfo for alle»), sletter skjemaene cpic og clinpgx med tabellene, funksjonene og triggerne, de ClinPGx- og CPIC-funksjonene i public og datakilder, og feltreglene for begge (#540; arkivet står i prosjektfilene, arkiv/2026-11-23-cpic-clinpgx)
--
-- Fase D i docs/cypinfo-integrasjon.md: CYPinfo er OUSFARs eneste automatiske
-- kilde for farmakogenetikk (#437). Appen leser ikke lenger noe fra `cpic` og
-- `clinpgx`, og funksjonene som fortsatt nevnte dem, er skrevet om
-- (20261123220000_clinpgx_cpic_ut_av_funksjonene.sql). Ingenting utenfor de to
-- skjemaene avhenger av dem (sjekket i produksjonen 23.11.2026: ingen visninger,
-- fremmednøkler, kolonnetyper eller regler).
--
-- Det som står:
-- - Endringsloggen for begge kildene (`datakilder.endringer`), som ikke har
--   noen fremmednøkkel til skjemaene. Den vises i appen som før.
-- - Kildene i `DATAKILDER`, som «Stanset».
-- - Elementtypen `clinpgxkobling` i fagsideversjoner fra før.
--
-- Vernet først: har noe hentet fra ClinPGx eller CPIC etter at arkivet ble
-- tatt (23.11.2026 kl. 20.27 UTC), stopper migrasjonen, så det ikke slettes
-- data som ikke er i arkivet. Da tas et nytt arkiv før migrasjonen kjøres
-- igjen.
--
-- Tilbakeføring: skjemaene og funksjonene er definert i de eldre migrasjonene
-- (blant annet 20260926095844_cpic og 20260926103040_clinpgx), og
-- dataene står i arkivet som JSON, én fil per tabell.

do $$
declare
  arkivert constant timestamptz := '2026-11-23 20:27:00+00';
  nyere text;
begin
  select string_agg(funn, '; ') into nyere from (
    select format('%s hentinger fra ClinPGx', count(*)) funn
      from clinpgx.synkroniseringer where startet_kl > arkivert having count(*) > 0
    union all
    select format('%s ClinPGx-kjemikalier hentet', count(*))
      from clinpgx.kjemikalier where greatest(sist_hentet_kl, sist_endret_kl, feil_kl) > arkivert having count(*) > 0
    union all
    select format('%s hentinger fra CPIC', count(*))
      from cpic.synkroniseringer where startet_kl > arkivert having count(*) > 0
  ) f;
  if nyere is not null then
    raise exception 'ClinPGx eller CPIC er hentet etter at arkivet ble tatt (%): ta et nytt arkiv før skjemaene slettes.', nyere;
  end if;
end
$$;

-- Funksjonene i public: synkroniseringen, statusen og lesingen.
drop function public.clinpgx_start_synk(text);
drop function public.clinpgx_fortsett_synk(bigint);
drop function public.clinpgx_koblede_kjemikalier();
drop function public.clinpgx_lagre_kjemikalie(bigint, jsonb, jsonb);
drop function public.clinpgx_kjemikalie_feilet(bigint, text, text, boolean);
drop function public.clinpgx_fullfor_synk(bigint, jsonb, integer);
drop function public.clinpgx_avbryt_synk(bigint, text);
drop function public.clinpgx_status();
drop function public.les_farmakogenetikk(text[]);
drop function public.les_farmakogenetikk_sok(text[]);
drop function public.cpic_forrige_synk();
drop function public.cpic_start_synk(text);
drop function public.cpic_last_inn(bigint, text, jsonb);
drop function public.cpic_fullfor_synk(bigint, jsonb);
drop function public.cpic_avbryt_synk(bigint, text);
drop function public.cpic_status();
drop function public.les_cpic(text[]);
drop function public.les_cpic_diplotyper(text);

-- Vern nummer to, rett før `cascade`: ingenting utenfor de to skjemaene kan
-- avhenge av noe i dem (en visning, en fremmednøkkel, en kolonnetype, en
-- funksjon, en standardverdi, en regel eller en tilgangsregel), ellers ville
-- `cascade` slettet det i det stille. Sjekket i produksjonen 23.11.2026, men
-- sjekkes på nytt her, i samme transaksjon som slettingen. Triggerne på
-- tabellene i skjemaene hører til skjemaene og regnes ikke som utenfor.
do $$
declare
  utenfor text;
begin
  with skjemaer as (
    select oid from pg_namespace where nspname in ('cpic', 'clinpgx')
  ), innenfor as (
    select 'pg_namespace'::regclass klasse, oid from skjemaer
    union all select 'pg_class'::regclass, oid from pg_class where relnamespace in (select oid from skjemaer)
    union all select 'pg_type'::regclass, oid from pg_type where typnamespace in (select oid from skjemaer)
    union all select 'pg_proc'::regclass, oid from pg_proc where pronamespace in (select oid from skjemaer)
  ), avhengige as (
    select distinct d.classid, d.objid, d.objsubid,
      case d.classid
        when 'pg_class'::regclass then (select relnamespace from pg_class where oid = d.objid)
        when 'pg_type'::regclass then (select typnamespace from pg_type where oid = d.objid)
        when 'pg_proc'::regclass then (select pronamespace from pg_proc where oid = d.objid)
        when 'pg_constraint'::regclass then (select connamespace from pg_constraint where oid = d.objid)
        when 'pg_trigger'::regclass then (select c.relnamespace from pg_trigger t join pg_class c on c.oid = t.tgrelid where t.oid = d.objid)
        when 'pg_rewrite'::regclass then (select c.relnamespace from pg_rewrite r join pg_class c on c.oid = r.ev_class where r.oid = d.objid)
        when 'pg_attrdef'::regclass then (select c.relnamespace from pg_attrdef a join pg_class c on c.oid = a.adrelid where a.oid = d.objid)
        when 'pg_policy'::regclass then (select c.relnamespace from pg_policy p join pg_class c on c.oid = p.polrelid where p.oid = d.objid)
      end skjema
    from pg_depend d
    join innenfor i on i.klasse = d.refclassid and i.oid = d.refobjid
    where d.deptype in ('n', 'a', 'e')
  )
  select string_agg(pg_describe_object(classid, objid, objsubid), '; ' order by pg_describe_object(classid, objid, objsubid)) into utenfor
  from avhengige
  where skjema is null or skjema not in (select oid from skjemaer);
  if utenfor is not null then
    raise exception 'Noe utenfor skjemaene cpic og clinpgx avhenger av dem (%): ingenting er slettet.', utenfor;
  end if;
end
$$;

-- Skjemaene med tabellene, triggerne og hjelpefunksjonene sine.
drop schema clinpgx cascade;
drop schema cpic cascade;

-- Hjelperne i datakilder, som bare triggerne på tabellene brukte.
drop function datakilder.clinpgx_kjemikalie_endret();
drop function datakilder.clinpgx_annotasjon_endret();
drop function datakilder.clinpgx_koblinger_endret();
drop function datakilder.clinpgx_grunnlag();
drop function datakilder.clinpgx_kildenotat(jsonb);
drop function datakilder.cpic_etter_bytte();

-- Feltreglene avgjør nivået på nye føringer i endringsloggen; ingen kommer
-- lenger fra de to kildene. Føringene fra før har nivået lagret.
delete from datakilder.feltregler where kilde in ('clinpgx', 'cpic');
alter table datakilder.feltregler
  drop constraint feltregler_kilde_check,
  add constraint feltregler_kilde_check check (kilde in ('pubchem', 'farmakologiportalen', 'cypinfo'));

notify pgrst, 'reload schema';
