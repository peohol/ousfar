-- P6b (#430, docs/fagmiljoer.md, «Idéer og oppgaver i gruppene»): de to
-- varselkategoriene for gruppenes idéer og oppgaver.
--
--   gruppeideer     Til de aktive medlemmene i gruppen: noen skriver en ny idé
--                   der. På som standard.
--   gruppeoppgaver  Til den som blir ansvarlig for en oppgave i en gruppe, og
--                   til den som skrev en idé i en gruppe når den gjøres om til
--                   en oppgave, merkes «Ikke aktuelt», åpnes igjen eller
--                   oppgaven blir fullført. På som standard.
--
-- Bare verdiene: de kan ikke brukes i samme transaksjon som de legges til, så
-- funksjonene som lager varslene, kommer i neste migrasjon. Verdiene står sist
-- i `DATABASEKATEGORIER` (`src/varsler/modell.ts`), i samme rekkefølge.

alter type public.varselkategori add value 'gruppeideer';
alter type public.varselkategori add value 'gruppeoppgaver';
