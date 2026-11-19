-- D5 (docs/direktemeldinger-personvern.md, «Rekkefølgen for D5», punkt 6):
-- slår på direktemeldingene.
--
-- Peders ja: alle fem beslutningene i direktemeldinger-personvern.md
-- 18.11.2026, blant dem beslutning 4 om at de slås på på samme vilkår som
-- gruppechatten når testene, nettleserkontrollen og ChatGPTs kontroll er
-- grønne. Det ble de med #469.
--
-- Bare bryteren endres. Tilgangen, radsikkerheten, vaktene, sanntiden og
-- lagringstiden er de samme; de prøves med bryteren på i T1–T24 og S1–S7.
-- Hver bruker må fortsatt selv slå på «Tillat direktemeldinger».
--
-- Tilbakeføring: en ny migrasjon som setter funksjonen tilbake til
-- `select false`. Da stenger alle funksjonene med en gang (42501), samtalene
-- og bryterne forsvinner fra chatmenyen og Innstillinger, og ingen meldinger,
-- valg eller blokkeringer slettes.
create or replace function intern.direktemeldinger_aktivert()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true
$$;

revoke all on function intern.direktemeldinger_aktivert() from public, anon, authenticated, service_role;

comment on function intern.direktemeldinger_aktivert() is
  'D5: om direktemeldingene er slått på. Slått på etter Peders beslutning 4 (18.11.2026) og godkjent kontroll i #469. Se docs/direktemeldinger-personvern.md.';
