-- De felles datakortene kobles til forbindelsen analysen måler, ikke til et
-- laboratoriums analyttkode (#395 punkt 3, docs/fagmiljoer.md,
-- «Analyttkatalogen per fagmiljø», og docs/faginnhold.md, «Datakortene per
-- forbindelse»).
--
-- Et datakort for en metabolitt på moderstoffets fagside sa til nå hvilken
-- analyttkode det gjaldt, med OUS Klinisk farmakologi sin kode:
-- referanseområdet for O-desmetyltramadol på tramadolsiden hadde
-- `data.gjelder = 'OTRAM'`. Et annet fagmiljø med en annen kode fikk ikke
-- kortet koblet til sin analyse, og så ikke kortet på fagsiden.
--
-- Nå sier et nytt kort hvilken forbindelse det gjelder, med nøkkelen i
-- forbindelsesregisteret (src/data/forbindelser.ts):
-- `data.gjelder = 'o-desmetyltramadol'`. Kortene uten `gjelder` er sidens
-- egne, som før. Fagmiljøets analyttkatalog sier for hver av sine koder hvilken
-- forbindelse analysen måler (`analyttkatalog_koder.forbindelse`) og
-- uttrykkelig hvilke kort på siden til kodens primære stoff den bruker
-- (`analyttkatalog_koder.datakort`): sidens egne (`egne`), dem for
-- forbindelsen (`forbindelse`), eller ingen. Appen kobler koden til kortet
-- gjennom det (`datakortnokkel` i src/domain/koblinger.ts). Til nå fulgte det av
-- rekkefølgen: den første primære koden for et stoff fikk sidens egne kort.
--
-- Her: kolonnene. Verdiene for kodene til OUS Klinisk farmakologi og katalogen
-- med de nye feltene kommer i neste migrasjon (`*_analyttforbindelser_ous.sql`),
-- i én transaksjon. Til den er kjørt, gir katalogen feltene ikke, og appen
-- bruker den gamle koblingen (`lesKatalogdata` i src/domain/analyttkatalog.ts).
-- Kortet med `OTRAM` står som før, så appen fra før denne endringen finner det
-- fortsatt; den nye leser det som kortet for forbindelsen koden måler
-- (`kortetsForbindelse`). Omskrivingen av kortet og stengingen for
-- analyttkoder i `gjelder` kommer i et senere trinn, når den gamle appen ikke
-- er i bruk lenger (docs/fagmiljoer.md, «De felles datakortene»).
--
-- Tilbakeføring: en ny migrasjon som fjerner kolonnene og gir katalogen uten
-- dem. Appen før denne endringen leser ikke feltene.

alter table public.analyttkatalog_koder
  add column forbindelse text,
  add column datakort text,
  add constraint analyttkatalog_koder_forbindelse check (
    forbindelse is null or (char_length(forbindelse) <= 120 and forbindelse ~ '^[a-z0-9][a-z0-9-]*$')
  ),
  add constraint analyttkatalog_koder_datakort check (
    datakort is null or datakort = 'egne' or (datakort = 'forbindelse' and forbindelse is not null)
  );

comment on column public.analyttkatalog_koder.forbindelse is
  'Forbindelsen analysen måler: nøkkelen i forbindelsesregisteret (src/data/forbindelser.ts), eller null når den ikke er én forbindelse (sumanalysene). Se docs/fagmiljoer.md.';
comment on column public.analyttkatalog_koder.datakort is
  'De felles datakortene på siden til kodens primære stoff analysen bruker: egne (sidens egne, uten gjelder), forbindelse (dem med forbindelsen i gjelder) eller null (ingen; kortene gjelder serum). Se docs/fagmiljoer.md.';

comment on index public.innholdselementer_enkeltelement_idx is
  'Kortene som bare kan stå én gang per side og panel — datakortene én gang per forbindelse (data.gjelder). Samme typer som ENKELTELEMENTER i src/faginnhold/paneler.ts.';
