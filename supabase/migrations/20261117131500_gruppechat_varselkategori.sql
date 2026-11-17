-- P7 tråd C (docs/gruppechat.md, «Varslene»; docs/varsler.md): varselkategorien
-- for gruppechatten.
--
--   gruppechat  Til de andre aktive medlemmene i gruppen: noen har skrevet i
--               chatten. Ett ulest varsel per gruppe, uten tekst og uten
--               avsender. På som standard.
--
-- Bare verdien: den kan ikke brukes i samme transaksjon som den legges til, så
-- utløseren som lager varslene, kommer i neste migrasjon. Verdien står sist i
-- `DATABASEKATEGORIER` (`src/varsler/modell.ts`).

alter type public.varselkategori add value 'gruppechat';
