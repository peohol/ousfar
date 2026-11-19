/**
 * `useGruppechat(gruppe)`: det chatvisningen trenger (`Gruppechat` i
 * `modell.ts`), med sanntid, gjenoppkobling og livstegn
 * (docs/gruppechat.md, «Sanntiden»). Logikken står i `kontroller.ts`; her
 * kobles den til React. Direktesamtalene bruker det samme laget med sine
 * egne kall (`useDirektesamtale`).
 *
 * Alle visninger av samme samtale deler én kontroller: chatmenyen og `#/chat`
 * viser den samme samtalen, med de samme meldingene, ventende meldingene og
 * lest-merkingen, ikke hver sin kopi. Kontrolleren startes av den første
 * visningen og stoppes (abonnement og livstegn) når den siste forsvinner.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { medVarsler } from '../chatvarsler/api'
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

interface Delt {
  kontroller: Chatkontroller
  brukere: number
}

export interface Chatkrok {
  (id: string): Gruppechat
  /** Henter det nye og rettighetene på nytt i alle samtalene som står åpne, etter noe brukeren selv har endret. */
  oppfriskAlle: () => void
}

/**
 * Kroken for én slags samtale: kontrollerne som er i bruk står etter
 * samtalens ID, den samme for alle visningene som står samtidig.
 */
export function lagChatkrok(avhengigheter: Chatavhengigheter): Chatkrok {
  const delte = new Map<string, Delt>()

  const kontrollerFor = (id: string): Delt => {
    let delt = delte.get(id)
    if (!delt) {
      delt = { kontroller: lagChatkontroller(id, avhengigheter), brukere: 0 }
      delte.set(id, delt)
    }
    return delt
  }

  function useChat(id: string): Gruppechat {
    const { kontroller } = kontrollerFor(id)
    useEffect(() => {
      const delt = kontrollerFor(id)
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
          if (delt.brukere === 0 && delte.get(id) === delt) delte.delete(id)
        })
      }
    }, [id])
    return useSyncExternalStore(kontroller.lytt, kontroller.hent)
  }

  return Object.assign(useChat, {
    oppfriskAlle: () => {
      for (const { kontroller, brukere } of delte.values()) if (brukere > 0) kontroller.hent().oppfrisk()
    },
  })
}

export const useGruppechat = lagChatkrok({
  lesGruppechat,
  hentChatendringer: (gruppe, etter) => hentChatendringer(gruppe, etter),
  // Varslene på enhetene til de andre (docs/chatvarsler.md).
  sendGruppemelding: medVarsler(sendGruppemelding),
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
})
