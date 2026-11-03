-- VDR-4 F4 (docs/verktøy-vdr4-tilgjengelighet.md §4.2): en FEST-kjøring som
-- feiler, lagrer hvor langt den kom og om en ny fil var oppdaget, slik at en
-- feil kan etterprøves. Dette er driftsdata. Det endrer ikke hvilke kjøringer
-- som regnes som vellykkede, `kontrollert_kl` eller 48-timersgrensen:
-- `legemiddeldata_forrige_synk` og `les_legemidler` leser fortsatt bare
-- kjøringer med status `fullfort` eller `uendret`.

alter table legemiddeldata.synkroniseringer
  add column trinn text check (trinn in ('kontakt', 'nedlasting', 'lesing', 'innbytte')),
  add column ny_fil boolean;

comment on column legemiddeldata.synkroniseringer.trinn is
  'For en kjøring som feilet: trinnet den stoppet i (kontakt med FEST, nedlasting, lesing av filen eller innbytte i databasen).';
comment on column legemiddeldata.synkroniseringer.ny_fil is
  'For en kjøring som feilet: true når en annen fil enn forrige vellykkede var oppdaget, false når filen var den samme, null når det ikke er kjent.';

-- Avbryter en kjøring med det som er kjent om filen. Den gamle utgaven med bare
-- feilteksten står, så en server med eldre kode fortsatt kan avbryte.
create function public.legemiddeldata_avbryt_synk(synk bigint, feil text, fil jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform legemiddeldata.pagaende(synk);
  delete from legemiddeldata.innlasting where synk_id = synk;
  update legemiddeldata.synkroniseringer set
    status = 'feilet',
    avsluttet_kl = now(),
    feil = left(legemiddeldata_avbryt_synk.feil, 2000),
    trinn = case when fil ->> 'trinn' in ('kontakt', 'nedlasting', 'lesing', 'innbytte') then fil ->> 'trinn' end,
    ny_fil = case when jsonb_typeof(fil -> 'ny_fil') = 'boolean' then (fil ->> 'ny_fil')::boolean end,
    etag = left(fil ->> 'etag', 500),
    sist_endret = left(fil ->> 'sist_endret', 200),
    sha256 = case when fil ->> 'sha256' ~ '^[0-9a-f]{64}$' then fil ->> 'sha256' end,
    parserversjon = case when jsonb_typeof(fil -> 'parserversjon') = 'number' then (fil ->> 'parserversjon')::integer end
  where id = synk;
end;
$$;

comment on function public.legemiddeldata_avbryt_synk(bigint, text, jsonb) is
  'Merker en FEST-kjøring som feilet, med trinnet den stoppet i og om en ny fil var oppdaget. Bare for serveren.';

-- Statusen viser også trinnet og om en ny fil var oppdaget.
create or replace function public.legemiddeldata_status()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(s) - 'etag' - 'sist_endret' order by s.id desc), '[]')
  from (
    select id, kilde, status, startet_kl, avsluttet_kl, etag, sist_endret, kildedato, antall, feil, trinn, ny_fil
    from legemiddeldata.synkroniseringer
    order by id desc
    limit 20
  ) s
$$;

revoke all on function public.legemiddeldata_avbryt_synk(bigint, text, jsonb) from public, anon, authenticated, service_role;
grant execute on function public.legemiddeldata_avbryt_synk(bigint, text, jsonb) to service_role;
