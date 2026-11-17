/**
 * `useGruppechat(gruppe)`: det chatvisningen trenger (`Gruppechat` i
 * `modell.ts`), med sanntid, gjenoppkobling og livstegn
 * (docs/gruppechat.md, «Sanntiden»). Logikken står i `kontroller.ts`; her
 * kobles den til React. Byttes gruppen eller forsvinner visningen, stoppes
 * abonnementet og livstegnet.
 */
import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { oppfriskVarsler } from '../varsler/api'
import {
  endreGruppemelding,
  hentChatendringer,
  lesGruppechat,
  merkGruppechatLest,
  sendGruppemelding,
  slettGruppemelding,
} from './api'
import { lagChatkontroller, type Chatavhengigheter } from './kontroller'
import type { Gruppechat } from './modell'
import { abonnerPaGruppechat } from './sanntid'

const AVHENGIGHETER: Chatavhengigheter = {
  lesGruppechat,
  hentChatendringer: (gruppe, etter) => hentChatendringer(gruppe, etter),
  sendGruppemelding,
  endreGruppemelding,
  slettGruppemelding,
  merkGruppechatLest,
  abonner: abonnerPaGruppechat,
  nyKlientId: () => crypto.randomUUID(),
  varslerEndret: oppfriskVarsler,
}

export function useGruppechat(gruppe: string): Gruppechat {
  const kontroller = useMemo(() => lagChatkontroller(gruppe, AVHENGIGHETER), [gruppe])
  useEffect(() => {
    kontroller.start()
    return kontroller.stopp
  }, [kontroller])
  return useSyncExternalStore(kontroller.lytt, kontroller.hent)
}
