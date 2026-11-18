-- Hvert fagmiljø får sitt eget ikon (docs/fagmiljoer.md, «Fagmiljøene»).
--
-- `ikon` er navnet på et ikon i appens ikonregister
-- (src/components/ikon/register.ts). Fagmiljøene som finnes, beholder
-- prøverørene de har vist hittil (`laboratorium`), som også er standarden for
-- nye. Appen viser prøverørene for et navn den ikke kjenner, så et ikon kan
-- tas i bruk i databasen før appen har det.
--
-- `intern.fagmiljoreferanse` gir ikonet videre, så alt som viser et fagmiljø
-- (mine_rettigheter, medlemsoversikten, kvitteringene), får det med.
--
-- Tilbakeføring: kolonnen kan stå; uten den i referansen viser appen
-- prøverørene for alle.

alter table public.fagmiljoer
  add column ikon text not null default 'laboratorium',
  add constraint fagmiljoer_ikon_form check (ikon ~ '^[a-z][a-zA-Z0-9]{0,39}$');

comment on column public.fagmiljoer.ikon is
  'Ikonet fagmiljøet vises med: et navn i appens ikonregister (src/components/ikon/register.ts).';

create or replace function intern.fagmiljoreferanse(f public.fagmiljoer)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select jsonb_build_object(
    'id', f.id, 'nokkel', f.nokkel, 'navn', f.navn,
    'standard', f.standard, 'apent', f.apent_for_medlemmer, 'ikon', f.ikon
  )
$$;

revoke all on function intern.fagmiljoreferanse(public.fagmiljoer) from public, anon, authenticated, service_role;
