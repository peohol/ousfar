-- P5 tråd C (#416, docs/redaktorer-og-forslag.md, «Varsler»): de to
-- varselkategoriene for endringsforslagene.
--
--   mine_forslag            Til forslagsstilleren: ny status, en kommentar
--                           eller et spørsmål. Kan ikke slås av.
--   forslag_til_behandling  Til dem som behandler forslag til ressursen
--                           (`intern.forslagsbehandlere`): nye forslag og
--                           svar fra forslagsstilleren. På som standard.
--
-- Bare verdiene: de kan ikke brukes i samme transaksjon som de legges til, så
-- utløseren som lager varslene, kommer i en egen migrasjon med
-- forslagsbehandlingen. Verdiene står sist i `DATABASEKATEGORIER`
-- (`src/varsler/modell.ts`), i samme rekkefølge.

alter type public.varselkategori add value 'mine_forslag';
alter type public.varselkategori add value 'forslag_til_behandling';
