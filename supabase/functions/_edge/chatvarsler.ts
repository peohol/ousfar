/**
 * Utsendingen av varslene om nye chatmeldinger (docs/chatvarsler.md), uten
 * noe som bare finnes i Deno, så testene kan kjøre den mot testdatabasen.
 *
 * Databasen avgjør hvem som får varsel og hva det står (`chatvarsel_hent`);
 * her krypteres og sendes det, og svaret fra push-tjenesten føres tilbake
 * (`chatvarsel_kvitter`).
 */
import { chatvarselemne, chatvarselinnhold, SAMTALETYPER, type Chatvarselgrunnlag } from '../_delt/chatvarsel.ts'
import { sendFraKilde, type Utsendingsvalg, type Varselkilde } from './enhetsvarsler.ts'
import type { Pushabonnement, Vapidnokler } from './webpush.ts'

export { LEVETID_SEKUNDER, MAKS_RUNDER, type Utsending, type Varseldatabase } from './enhetsvarsler.ts'

/** Navnene på hemmelighetene i miljøet til Edge-funksjonen. */
export const VAPID_MILJO = { offentlig: 'CHATVARSEL_VAPID_OFFENTLIG', privat: 'CHATVARSEL_VAPID_PRIVAT' } as const

/** VAPID-nøklene fra miljøet, eller `null` når de ikke er satt. */
export function vapidFraMiljo(les: (navn: string) => string | undefined): Vapidnokler | null {
  const offentlig = les(VAPID_MILJO.offentlig)?.trim()
  const privat = les(VAPID_MILJO.privat)?.trim()
  return offentlig && privat ? { offentlig, privat } : null
}

/**
 * Navnet på hemmeligheten databasen sender med når den ber om utsendingen
 * (`intern.chatvarsel_vekk`, Vault-navnet `chatvarsel_utloser`), og hodet den
 * står i.
 */
export const UTLOSER_MILJO = 'CHATVARSEL_UTLOSER'
export const UTLOSER_HODE = 'x-chatvarsel-utloser'

/** Om hodet har den hemmelige nøkkelen, sammenlignet på konstant tid. */
export function erUtloser(gitt: string | null, forventet: string | undefined): boolean {
  if (!gitt || !forventet) return false
  const a = new TextEncoder().encode(gitt)
  const b = new TextEncoder().encode(forventet)
  let ulik = a.length ^ b.length
  for (let i = 0; i < b.length; i++) ulik |= (a[i] ?? 0) ^ b[i]!
  return ulik === 0
}

/** Ett varsel fra databasen: abonnementet, grunnlaget og meldingstidspunktet det gjelder. */
type Varsel = Pushabonnement & Chatvarselgrunnlag & { kl: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Svaret fra `chatvarsel_hent`, kontrollert felt for felt. Det som ikke stemmer, sendes ikke. */
export function lesVarsler(data: unknown): Varsel[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((r): Varsel[] => {
    if (r === null || typeof r !== 'object') return []
    const { endepunkt, p256dh, auth, slag, samtale, gruppenavn, uleste, kl } = r as Record<string, unknown>
    if (
      typeof endepunkt !== 'string' ||
      typeof p256dh !== 'string' ||
      typeof auth !== 'string' ||
      !SAMTALETYPER.includes(slag as never) ||
      typeof samtale !== 'string' ||
      !UUID.test(samtale) ||
      typeof uleste !== 'number' ||
      typeof kl !== 'string'
    ) {
      return []
    }
    return [
      {
        endepunkt,
        p256dh,
        auth,
        slag: slag as Varsel['slag'],
        samtale,
        gruppenavn: typeof gruppenavn === 'string' ? gruppenavn : null,
        uleste,
        kl,
      },
    ]
  })
}

/** Chatvarslene: ett varsel per enhet og samtale, med antallet uleste. */
export const CHATVARSELKILDE: Varselkilde<Varsel> = {
  hent: 'chatvarsel_hent',
  kvitter: 'chatvarsel_kvitter',
  les: lesVarsler,
  innhold: chatvarselinnhold,
  emne: (v) => chatvarselemne(v.samtale),
  kvittering: (v) => ({ slag: v.slag, samtale: v.samtale, kl: v.kl }),
}

/**
 * Sender chatvarslene som venter (`chatvarsel_hent`), og fører svaret fra
 * push-tjenesten (`chatvarsel_kvitter`), med den felles utsendingen
 * (`sendFraKilde`). Hver enhet får ett varsel per samtale.
 */
export const sendChatvarsler = (valg: Utsendingsvalg) => sendFraKilde(CHATVARSELKILDE, valg)
