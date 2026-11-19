/**
 * Utsendingen av varslene om nye chatmeldinger (docs/chatvarsler.md), uten
 * noe som bare finnes i Deno, så testene kan kjøre den mot testdatabasen.
 *
 * Databasen avgjør hvem som får varsel og hva det står (`chatvarsel_hent`);
 * her krypteres og sendes det, og svaret fra push-tjenesten føres tilbake
 * (`chatvarsel_kvitter`).
 */
import { chatvarselemne, chatvarselinnhold, erPushtjeneste, SAMTALETYPER, type Chatvarselgrunnlag } from '../_delt/chatvarsel.ts'
import { sendPush, vapidnokkel, type Pushabonnement, type Pushutfall, type Vapidnokler } from './webpush.ts'

/** Hvor lenge push-tjenesten holder på et varsel for en enhet som er av: et døgn. */
export const LEVETID_SEKUNDER = 24 * 60 * 60

/** Navnene på hemmelighetene i miljøet til Edge-funksjonen. */
export const VAPID_MILJO = { offentlig: 'CHATVARSEL_VAPID_OFFENTLIG', privat: 'CHATVARSEL_VAPID_PRIVAT' } as const

/** Det som trengs av databaseklienten: funksjonskall. */
export interface Varseldatabase {
  rpc(navn: string, argumenter: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>
}

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

/** Hva som skjedde med varslene: `hoppet` er endepunkter utenfor de kjente push-tjenestene. */
export type Utsending = Record<Pushutfall | 'hoppet', number>

/** Hvor mange runder én utsending går: nye meldinger underveis og nye forsøk etter feil. */
export const MAKS_RUNDER = 4

const sov = (ms: number) => new Promise<void>((ferdig) => setTimeout(ferdig, ms))

/**
 * Sender varslene som venter (`chatvarsel_hent`), og fører svaret fra
 * push-tjenesten (`chatvarsel_kvitter`): sendte slettes, borte abonnementer
 * slettes, og en midlertidig feil prøves igjen i neste runde, etter 1, 4, 9
 * sekunder (som `neste_kl` i databasen). Hver enhet får ett varsel per
 * samtale; to utsendinger samtidig sender aldri det samme, fordi databasen
 * holder et varsel mens det sendes.
 */
export async function sendChatvarsler({
  db,
  nokler,
  kontakt,
  hent = fetch,
  vent = sov,
}: {
  db: Varseldatabase
  nokler: Vapidnokler
  kontakt: string
  hent?: typeof fetch
  vent?: (ms: number) => Promise<void>
}): Promise<Utsending> {
  const totalt: Utsending = { sendt: 0, borte: 0, feil: 0, hoppet: 0 }
  let signering: CryptoKey | null = null

  for (let runde = 1; runde <= MAKS_RUNDER; runde++) {
    const { data, error } = await db.rpc('chatvarsel_hent', {})
    if (error) throw error
    const varsler = lesVarsler(data)
    if (varsler.length === 0) break

    signering ??= await vapidnokkel(nokler)
    const nokkel = signering
    const svar = await Promise.all(
      varsler.map(async (v) => {
        const utfall: Pushutfall | 'hoppet' = !erPushtjeneste(v.endepunkt)
          ? 'hoppet'
          : await sendPush(
              v,
              chatvarselinnhold(v),
              nokler,
              nokkel,
              { levetid: LEVETID_SEKUNDER, emne: chatvarselemne(v.samtale), kontakt, haster: true },
              hent,
            )
        return { endepunkt: v.endepunkt, slag: v.slag, samtale: v.samtale, kl: v.kl, svar: utfall }
      }),
    )
    for (const r of svar) totalt[r.svar] += 1

    const { error: kvitteringsfeil } = await db.rpc('chatvarsel_kvitter', { utfall: svar })
    if (kvitteringsfeil) throw kvitteringsfeil
    if (svar.some((r) => r.svar === 'feil') && runde < MAKS_RUNDER) await vent(runde * runde * 1000)
  }
  return totalt
}
