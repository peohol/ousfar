-- Planlagte oppgaver kan vise til ID-en til en endring i endringsloggen, ikke
-- bare versjonen.
--
-- Hver endring har nå sin egen fil med en permanent ID (som
-- «20261116-094849-3170df»), og versjonsnummeret gis først når PR-en er slått
-- sammen og appen bygges (docs/endringslogg.md). En agent som utfører en
-- oppgave, kjenner derfor ID-en, men ikke versjonen, mens den arbeider. Kolonnen
-- godtar begge: versjonene oppgavene alt har, står urørt og virker som før, og
-- appen slår opp føringen med det som står der.
--
-- Bare regelen for hva kolonnen kan inneholde, utvides. Ingen rader endres, og
-- alle som er lovlige i dag, er lovlige etterpå.

alter table public.oppgaver drop constraint oppgaver_endringslogg;

alter table public.oppgaver add constraint oppgaver_endringslogg check (
  endringslogg is null
  or endringslogg ~ '^[0-9]+\.[0-9]+\.[0-9]+$'
  or endringslogg ~ '^[0-9]{8}-[0-9]{6}-[0-9a-f]{6}$'
);

comment on column public.oppgaver.endringslogg is
  'Føringen i endringsloggen der det står hva som ble gjort: ID-en til endringen (ååååmmdd-ttmmss-xxxxxx), eller versjonen (MAJOR.MINOR.PATCH) for eldre oppgaver.';