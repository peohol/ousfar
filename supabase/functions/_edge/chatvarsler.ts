/**
 * Utsendingen av varslene om nye chatmeldinger (docs/chatvarsler.md), uten
 * noe som bare finnes i Deno, så testene kan kjøre den mot testdatabasen.
 *
 * Databasen avgjør hvem som får varsel og hva det står (`chatvarsel_hent`);
 * her krypteres og sendes det, og abonnementer push-tjenesten ikke kjenner
 * lenger, slettes.
 */
import { chatvarselemne, chatvarselinnhold, erPushtjeneste, SAMTALETYPER, type Chatvarselgrunnlag } from '../_delt/chatvarsel.ts'
import { sendPush, vapidnokkel, type Pushabonnement, type Pushutfall, type Vapidnokler } from './webpush.ts'

/** Hvor lenge push-tjenesten holder på et varsel for en enhet som er av: et døgn. */
export const LEVETID_SEKUNDER = 24 * 60 * 60

/** Navnene på hemmelighetene i miljøet til Edge-funksjonen. */
export const VAPID_MILJO = { offentlig: 'CHATVARSEL_VAPID_OFFENTLIG', privat: 'CHATVARSEL_VAPID_PRIVAT' } as const

/** Det som trengs av databaseklienten: to funksjonskall. */
export interface Varseldatabase {
  rpc(navn: string, argumenter: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>
}

/** VAPID-nøklene fra miljøet, eller `null` når de ikke er satt. */
export function vapidFraMiljo(les: (navn: string) => string | undefined): Vapidnokler | null {
  const offentlig = les(VAPID_MILJO.offentlig)?.trim()
  const privat = les(VAPID_MILJO.privat)?.trim()
  return offentlig && privat ? { offentlig, privat } : null
}

/** Ett varsel fra databasen: abonnementet og grunnlaget. */
type Varsel = Pushabonnement & Chatvarselgrunnlag

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Svaret fra `chatvarsel_hent`, kontrollert felt for felt. Det som ikke stemmer, sendes ikke. */
export function lesVarsler(data: unknown): Varsel[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((r): Varsel[] => {
    if (r === null || typeof r !== 'object') return []
    const { endepunkt, p256dh, auth, slag, samtale, gruppenavn, uleste } = r as Record<string, unknown>
    if (
      typeof endepunkt !== 'string' ||
      typeof p256dh !== 'string' ||
      typeof auth !== 'string' ||
      !SAMTALETYPER.includes(slag as never) ||
      typeof samtale !== 'string' ||
      !UUID.test(samtale) ||
      typeof uleste !== 'number'
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
      },
    ]
  })
}

export interface Utsending {
  sendt: number
  borte: number
  feil: number
}

/**
 * Sender varslene om avsenderens nye meldinger. Hver enhet får ett varsel per
 * samtale; et endepunkt som ikke hører til en kjent push-tjeneste, hoppes over.
 */
export async function sendChatvarsler({
  db,
  avsender,
  nokler,
  kontakt,
  hent = fetch,
}: {
  db: Varseldatabase
  avsender: string
  nokler: Vapidnokler
  kontakt: string
  hent?: typeof fetch
}): Promise<Utsending> {
  const { data, error } = await db.rpc('chatvarsel_hent', { avsender })
  if (error) throw error
  const varsler = lesVarsler(data).filter((v) => erPushtjeneste(v.endepunkt))
  const utfall: Record<Pushutfall, number> = { sendt: 0, borte: 0, feil: 0 }
  if (varsler.length === 0) return utfall

  const signering = await vapidnokkel(nokler)
  const resultater = await Promise.all(
    varsler.map(async (v) => {
      const innhold = chatvarselinnhold(v)
      const svar = await sendPush(
        v,
        innhold,
        nokler,
        signering,
        { levetid: LEVETID_SEKUNDER, emne: chatvarselemne(v.samtale), kontakt, haster: true },
        hent,
      )
      return { endepunkt: v.endepunkt, svar }
    }),
  )
  for (const r of resultater) utfall[r.svar] += 1

  const borte = [...new Set(resultater.filter((r) => r.svar === 'borte').map((r) => r.endepunkt))]
  if (borte.length > 0) {
    const { error: slettefeil } = await db.rpc('chatvarsel_fjern_abonnementer', { endepunkter: borte })
    if (slettefeil) throw slettefeil
  }
  return utfall
}
