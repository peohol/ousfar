/**
 * `useDirektesamtale(samtale)`: det chatvisningen trenger for én
 * direktesamtale, med det samme laget som gruppechatten (`lagChatkrok` i
 * `src/gruppechat/useGruppechat.ts`), bare med direktemeldingenes kall og
 * dørklokke. Visningene av samme samtale deler én kontroller.
 */
import { oppfriskSamtaler } from '../gruppechat/samtaler'
import { lagChatkrok } from '../gruppechat/useGruppechat'
import { abonnerPaDirektesamtale, direkteapi } from './api'

export const useDirektesamtale = lagChatkrok({
  lesGruppechat: (samtale, forNr, antall) => direkteapi.lesDirektesamtale(samtale, forNr, antall),
  hentChatendringer: (samtale, etter) => direkteapi.hentDirekteendringer(samtale, etter),
  sendGruppemelding: (samtale, klientId, tekst) => direkteapi.sendDirektemelding(samtale, klientId, tekst),
  endreGruppemelding: (melding, tekst) => direkteapi.endreDirektemelding(melding, tekst),
  slettGruppemelding: (melding) => direkteapi.slettDirektemelding(melding),
  merkGruppechatLest: (samtale, tilNr) => direkteapi.merkDirektesamtaleLest(samtale, tilNr),
  abonner: abonnerPaDirektesamtale,
  nyKlientId: () => crypto.randomUUID(),
  // Direktemeldingene gir ingen varsler i bjella; bare samtalelistene hentes på nytt.
  ulesteEndret: () => oppfriskSamtaler(),
})
