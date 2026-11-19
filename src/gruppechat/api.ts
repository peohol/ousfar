/**
 * Kallene gruppechatten gjør mot Supabase gjennom appens klient
 * (docs/gruppechat.md, «Funksjonene»). Kallene selv og `IngenTilgang` står i
 * `kall.ts`.
 */
import { klient } from '../auth/klient'
import { lagChatapi } from './kall'

export { IngenTilgang, Sperret, lagChatapi, type Chatapi } from './kall'

export const {
  lesGruppechat,
  hentChatendringer,
  sendGruppemelding,
  endreGruppemelding,
  slettGruppemelding,
  merkGruppechatLest,
} = lagChatapi(klient)
