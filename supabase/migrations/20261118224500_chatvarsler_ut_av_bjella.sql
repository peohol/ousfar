-- D4b (docs/ux-dashboard-chat-navigasjon-plan.md §8; docs/gruppechat.md,
-- «Uleste»): uleste chatmeldinger har ett sted, chatknappen og samtalelista i
-- chatmenyen, og bjella viser og teller dem ikke lenger.
--
-- Tallet på uleste kommer fra `public.gruppechat_lest` (`mine_gruppesamtaler`,
-- `gruppeoversikt(...).samhandling.chat_uleste`), ikke fra varslene. Derfor:
--
-- 1. En ny melding lager ikke lenger varsler i kategorien `gruppechat`
--    (utløseren og funksjonen fjernes). Det sparer én skriving per mottaker
--    for hver melding.
-- 2. Varslene om chatten som står uleste nå, merkes lest, så de aldri telles
--    noe sted. Ingen rader slettes: de ryddes som andre leste varsler etter
--    fristen. Meldingene, `gruppechat_lest` og lagringstiden er uendret.
--
-- Kategorien `gruppechat` står i `public.varselkategori` som før (en verdi kan
-- ikke tas ut av en enum), og `intern.merk_gruppechat_varsler_lest` står, så
-- `merk_gruppechat_lest` er uendret.
--
-- Tilbakeføring: lag `intern.varsle_gruppechat()` og utløseren
-- `gruppemeldinger_varsle` igjen som i 20261117131600. Varslene som ble merket
-- lest her, får ikke tilbake «ulest», men tallet i chatten er det samme.

drop trigger gruppemeldinger_varsle on public.gruppemeldinger;
drop function intern.varsle_gruppechat();

update public.varsler
set lest_kl = now()
where kategori = 'gruppechat'
  and lest_kl is null;
