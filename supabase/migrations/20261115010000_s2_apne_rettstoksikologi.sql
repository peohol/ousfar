-- Startporten S2: OUS Rettstoksikologi åpnes for medlemmer
-- (docs/s2-kontrollrapport.md, docs/fagmiljoer.md «Fagmiljøene»).
--
-- VENTER PÅ PEDERS GODKJENNING. Kontrollen i CI og utrullingen stopper fila
-- (åpning av et fagmiljø for medlemmer, docs/migrasjoner.md) til den har en
-- egen linje som begynner med «-- destruktiv-godkjent:» og sier hvem som
-- godkjente, når og hva. Den linja skrives bare etter at Peder uttrykkelig har
-- godkjent åpningen.
--
-- Etter åpningen kan systemarkitektene og fagmiljøets lokale administratorer
-- gi vanlige brukere medlemskap der. Migrasjonen gir ingen medlemskap selv og
-- endrer ingenting annet: fagmiljøet har ingen fortolkningsregler og ingen
-- analyttkatalog, så den som har det som primært fagmiljø, får den tydelige
-- stoppen i fortolkningen. Den som også er med i OUS Klinisk farmakologi,
-- velger selv hvilket av dem hen arbeider i (velg_arbeidsfagmiljo,
-- docs/s2-kontrollrapport.md §4.3 og §9).
--
-- Tilbakeføring: en ny migrasjon som setter apent_for_medlemmer = false. Det
-- stopper nye medlemskap; de som er gitt, avsluttes i medlemslista.

select set_config(
  'ousfar.tilgangsgrunn',
  'Startport S2: OUS Rettstoksikologi åpnes for medlemmer etter Peders godkjenning (docs/s2-kontrollrapport.md)',
  true
);

do $$
declare
  f public.fagmiljoer;
begin
  select * into f from public.fagmiljoer where nokkel = 'ous-rettstoksikologi';
  if not found then
    raise exception 'S2: fagmiljøet ous-rettstoksikologi finnes ikke.';
  end if;
  if f.status <> 'aktiv' then
    raise exception 'S2: % er ikke aktivt og åpnes ikke.', f.navn;
  end if;
end;
$$;

-- Slippet databasen krever for å åpne nettopp dette fagmiljøet
-- (20261115003000_startportvern.sql); det gjelder bare denne transaksjonen.
select set_config('ousfar.startport', 'ous-rettstoksikologi', true);

update public.fagmiljoer
set apent_for_medlemmer = true
where nokkel = 'ous-rettstoksikologi' and not apent_for_medlemmer;
