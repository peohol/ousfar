-- P7 (docs/gruppechat.md, «Peders rammer»): slår på gruppechatten.
--
-- Peders ja: «Ja, skru på chatten.» i P7-tråden 17.11.2026 kl. 14:24 UTC
-- (sikkerhetsport S5, docs/gruppechat-personvern.md). Resten av D6 er avgjort
-- før: pasientopplysninger er forbudt i hele OUSFAR, og meldingene lagres i
-- 12 måneder.
--
-- Bare bryteren endres. Tilgangen, radsikkerheten, vaktene og sanntiden er de
-- samme som før; de prøves med bryteren på i testene til A1–C2.
--
-- Tilbakeføring: en ny migrasjon som setter funksjonen tilbake til
-- `select false`. Da stenger alle chatfunksjonene med en gang (42501), fanen
-- og varselinnstillingen forsvinner, og ingen meldinger slettes.
create or replace function intern.gruppechat_aktivert()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true
$$;

revoke all on function intern.gruppechat_aktivert() from public, anon, authenticated, service_role;

comment on function intern.gruppechat_aktivert() is
  'P7: om gruppechatten er slått på. Slått på etter Peders ja 17.11.2026 (S5). Se docs/gruppechat.md.';
