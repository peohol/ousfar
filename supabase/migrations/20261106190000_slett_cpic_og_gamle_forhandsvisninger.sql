-- destruktiv-godkjent: Peder 2026-11-06, sletter alle CPIC-dataene (CPIC stanses på ubestemt tid) og forhåndsvisningene i eldre kurateringsrevisjoner, for å få databasen under kvoten
--
-- Databasen er over kvoten på gratisplanen (534 av 500 MB, 6.11.2026). To
-- ting slettes, etter Peders beslutning samme dag (docs/db-maling.md,
-- docs/datakilder.md):
--
-- 1. Alle CPIC-dataene (om lag 97 MB). CPIC er stanset på ubestemt tid og skal
--    erstattes av norske farmakogenetiske data: den ukentlige jobben er tatt ut,
--    endepunktet svarer 410, og appen leser og viser ingenting fra CPIC
--    (`src/datakilder/stans.ts`). Skjemaet, funksjonene, tilgangene og
--    oppsettet (`entiteter`, `henvisninger`) står; kontrollsummene i
--    `entiteter` nullstilles, så en senere henting laster alt på nytt fra en
--    tom kopi i stedet for å tro at ingenting er endret. Endringsloggen
--    for CPIC i `datakilder.endringer` gjelder data som ikke lenger finnes, og
--    slettes også.
--
-- 2. Forhåndsvisningene i kurateringsrevisjoner som ikke er den siste i grenen
--    sin (om lag 27 MB). Forhåndsvisningen er en kopi av siden slik den ville
--    blitt, laget ved prøvepubliseringen; selve endringen (`innhold`),
--    fingeravtrykket, prøvepubliseringens resultat og vurderingene står urørt.
--    Den siste revisjonen i hver gren beholder forhåndsvisningen, så det
--    kuratoren og kontrolløren arbeider med, er som før. `teknisk` får
--    `forhandsvisning_fjernet`, så appen kan si hvorfor en eldre revisjon ikke
--    har noen.
--
-- Plassen fra CPIC frigjøres med en gang (truncate). Plassen fra
-- forhåndsvisningene kan brukes på nytt av databasen, men filene krymper først
-- når tabellen komprimeres (vacuum full), som gjøres utenom migrasjonen.

truncate
  cpic.allel,
  cpic.alleldefinisjon,
  cpic.anbefaling,
  cpic.diplotype,
  cpic.endring,
  cpic.gen,
  cpic.genresultat,
  cpic.genresultat_oppslag,
  cpic.innlasting,
  cpic.legemiddel,
  cpic.par,
  cpic.publikasjon,
  cpic.retningslinje,
  cpic.synkroniseringer,
  cpic.term
restart identity;

update cpic.entiteter set sha256 = null, parserversjon = null;

delete from datakilder.endringer where kilde = 'cpic';

-- Revisjonene er ellers uforanderlige. Utløseren slås av bare for denne ene
-- oppdateringen, i samme transaksjon, og bare forhåndsvisningen fjernes.
alter table kuratering.grenrevisjoner disable trigger grenrevisjoner_uforanderlig;

update kuratering.grenrevisjoner r
set
  forhandsvisning = null,
  teknisk = r.teknisk || jsonb_build_object('forhandsvisning_fjernet', '2026-11-06')
from kuratering.grener g
where g.id = r.gren
  and r.revisjon < g.revisjon
  and r.forhandsvisning is not null;

alter table kuratering.grenrevisjoner enable trigger grenrevisjoner_uforanderlig;
