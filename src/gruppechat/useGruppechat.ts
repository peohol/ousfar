/**
 * `useGruppechat(gruppe)`: det chatvisningen trenger (`Gruppechat` i
 * `modell.ts`), med sanntid, gjenoppkobling og livstegn
 * (docs/gruppechat.md, «Sanntiden»). Logikken står i `kontroller.ts`; her
 * kobles den til React.
 *
 * Alle visninger av samme gruppe deler én kontroller: chatmenyen og `#/chat`
 * viser den samme samtalen, med de samme
 * meldingene, ventende meldingene og lest-merkingen, ikke hver sin kopi.
 * Kontrolleren startes av den første visningen og stoppes (abonnement og
 * livstegn) når den siste forsvinner.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { meldGruppeendring } from '../components/grupper/gruppevisning'
import {
  endreGruppemelding,
  hentChatendringer,
  lesGruppechat,
  merkGruppechatLest,
  sendGruppemelding,
  slettGruppemelding,
} from './api'
import { lagChatkontroller, type Chatavhengigheter, type Chatkontroller } from './kontroller'
import type { Gruppechat } from './modell'
import { abonnerPaGruppechat } from './sanntid'
import { oppfriskSamtaler } from './samtaler'

const AVHENGIGHETER: Chatavhengigheter = {
  lesGruppechat,
  hentChatendringer: (gruppe, etter) => hentChatendringer(gruppe, etter),
  sendGruppemelding,
  endreGruppemelding,
  slettGruppemelding,
  merkGruppechatLest,
  abonner: abonnerPaGruppechat,
  nyKlientId: () => crypto.randomUUID(),
  // Chatten har ingen varsler i bjella; tallet står i chatmenyen og på gruppesiden.
  ulesteEndret: (gruppe) => {
    oppfriskSamtaler()
    meldGruppeendring(gruppe)
  },
}

interface Delt {
  kontroller: Chatkontroller
  brukere: number
}

/** Kontrollerne som er i bruk, etter gruppen. */
const delte = new Map<string, Delt>()

/** Kontrolleren for gruppen, den samme for alle visningene som står samtidig. */
function kontrollerFor(gruppe: string): Delt {
  let delt = delte.get(gruppe)
  if (!delt) {
    delt = { kontroller: lagChatkontroller(gruppe, AVHENGIGHETER), brukere: 0 }
    delte.set(gruppe, delt)
  }
  return delt
}

export function useGruppechat(gruppe: string): Gruppechat {
  const { kontroller } = kontrollerFor(gruppe)
  useEffect(() => {
    const delt = kontrollerFor(gruppe)
    delt.brukere += 1
    if (delt.brukere === 1) delt.kontroller.start()
    return () => {
      delt.brukere -= 1
      if (delt.brukere > 0) return
      delt.kontroller.stopp()
      // Glemmes når ingen har tatt den i bruk igjen innen samme runde (React tar
      // effektene ned og opp igjen i utviklingsmodus), så meldingene ikke blir
      // liggende i minnet.
      queueMicrotask(() => {
        if (delt.brukere === 0 && delte.get(gruppe) === delt) delte.delete(gruppe)
      })
    }
  }, [gruppe])
  return useSyncExternalStore(kontroller.lytt, kontroller.hent)
}
