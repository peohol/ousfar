/**
 * Utsendingen av varsler på enheten (docs/enhetsvarsler.md), uten noe som
 * bare finnes i Deno, så testene kan kjøre den mot testdatabasen.
 *
 * To kilder bruker den samme utsendingen: chatvarslene (`chatvarsel_hent`,
 * `chatvarsler.ts`) og de planlagte varslene for de andre formålene
 * (`enhetsvarsel_hent`, #600). Databasen avgjør hvem som får varsel og hva
 * det står; her krypteres og sendes det, og svaret fra push-tjenesten føres
 * tilbake.
 */
import { erPushtjeneste, erVarselsti, pushemne, VARSELMERKE, type Enhetsvarselinnhold } from '../_delt/enhetsvarsel.ts'
import { sendPush, vapidnokkel, type Pushabonnement, type Pushutfall, type Vapidnokler } from './webpush.ts'

/** Hvor lenge push-tjenesten holder på et varsel for en enhet som er av: et døgn. */
export const LEVETID_SEKUNDER = 24 * 60 * 60

/** Det som trengs av databaseklienten: funksjonskall. */
export interface Varseldatabase {
  rpc(navn: string, argumenter: Record<string, unknown>): PromiseLike<{ data: unknown; error: unknown }>
}

/** Hva som skjedde med varslene: `hoppet` er endepunkter utenfor de kjente push-tjenestene. */
export type Utsending = Record<Pushutfall | 'hoppet', number>

/** Hvor mange runder én utsending går: nye varsler underveis og nye forsøk etter feil. */
export const MAKS_RUNDER = 4

const sov = (ms: number) => new Promise<void>((ferdig) => setTimeout(ferdig, ms))

export interface Utsendingsvalg {
  db: Varseldatabase
  nokler: Vapidnokler
  kontakt: string
  hent?: typeof fetch
  vent?: (ms: number) => Promise<void>
}

/** Én kilde til varsler: funksjonene i databasen og hvordan hvert varsel leses og kvitteres. */
export interface Varselkilde<V extends Pushabonnement> {
  /** Funksjonen som gir varslene som skal sendes nå, og holder dem mens de sendes. */
  hent: string
  /** Funksjonen som får svaret fra push-tjenesten (`{ utfall }`). */
  kvitter: string
  /** Svaret fra `hent`, kontrollert felt for felt. Det som ikke stemmer, sendes ikke. */
  les: (data: unknown) => V[]
  innhold: (varsel: V) => Enhetsvarselinnhold
  emne: (varsel: V) => string
  /** Det `kvitter` trenger for å kjenne igjen varselet, uten svaret. */
  kvittering: (varsel: V) => Record<string, unknown>
}

/**
 * Sender varslene fra kilden og fører svaret: sendte føres, borte
 * abonnementer slettes, og en midlertidig feil prøves igjen i neste runde,
 * etter 1, 4, 9 sekunder (som `neste_kl` i databasen). To utsendinger
 * samtidig sender aldri det samme, fordi databasen holder et varsel mens det
 * sendes.
 */
export async function sendFraKilde<V extends Pushabonnement>(
  kilde: Varselkilde<V>,
  { db, nokler, kontakt, hent = fetch, vent = sov }: Utsendingsvalg,
): Promise<Utsending> {
  const totalt: Utsending = { sendt: 0, borte: 0, feil: 0, hoppet: 0 }
  let signering: CryptoKey | null = null

  for (let runde = 1; runde <= MAKS_RUNDER; runde++) {
    const { data, error } = await db.rpc(kilde.hent, {})
    if (error) throw error
    const varsler = kilde.les(data)
    if (varsler.length === 0) break

    signering ??= await vapidnokkel(nokler)
    const nokkel = signering
    const svar = await Promise.all(
      varsler.map(async (v) => {
        const utfall: Pushutfall | 'hoppet' = !erPushtjeneste(v.endepunkt)
          ? 'hoppet'
          : await sendPush(
              v,
              kilde.innhold(v),
              nokler,
              nokkel,
              {
                levetid: LEVETID_SEKUNDER,
                emne: kilde.emne(v),
                kontakt,
                haster: true,
              },
              hent,
            )
        return { ...kilde.kvittering(v), endepunkt: v.endepunkt, svar: utfall }
      }),
    )
    for (const r of svar) totalt[r.svar] += 1

    const { error: kvitteringsfeil } = await db.rpc(kilde.kvitter, {
      utfall: svar,
    })
    if (kvitteringsfeil) throw kvitteringsfeil
    if (svar.some((r) => r.svar === 'feil') && runde < MAKS_RUNDER) await vent(runde * runde * 1000)
  }
  return totalt
}

// --- De planlagte varslene (#600) ----------------------------------------------------

/** Ett planlagt varsel fra databasen, til én enhet. */
export type Enhetsvarsel = Pushabonnement & Enhetsvarselinnhold & { id: string; versjon: number }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Svaret fra `enhetsvarsel_hent`, kontrollert felt for felt. */
export function lesEnhetsvarsler(data: unknown): Enhetsvarsel[] {
  if (!Array.isArray(data)) return []
  return data.flatMap((r): Enhetsvarsel[] => {
    if (r === null || typeof r !== 'object') return []
    const { id, versjon, endepunkt, p256dh, auth, tittel, tekst, sti, merke } = r as Record<string, unknown>
    if (
      typeof id !== 'string' ||
      !UUID.test(id) ||
      typeof versjon !== 'number' ||
      !Number.isInteger(versjon) ||
      typeof endepunkt !== 'string' ||
      typeof p256dh !== 'string' ||
      typeof auth !== 'string' ||
      typeof tittel !== 'string' ||
      typeof tekst !== 'string' ||
      typeof sti !== 'string' ||
      !erVarselsti(sti) ||
      typeof merke !== 'string' ||
      !VARSELMERKE.test(merke)
    ) {
      return []
    }
    return [{ id, versjon, endepunkt, p256dh, auth, tittel, tekst, sti, merke }]
  })
}

/** De planlagte varslene for formålene utenom chatten. */
export const ENHETSVARSELKILDE: Varselkilde<Enhetsvarsel> = {
  hent: 'enhetsvarsel_hent',
  kvitter: 'enhetsvarsel_kvitter',
  les: lesEnhetsvarsler,
  innhold: ({ tittel, tekst, sti, merke }) => ({ tittel, tekst, sti, merke }),
  emne: (v) => pushemne(v.id),
  kvittering: (v) => ({ id: v.id, versjon: v.versjon }),
}

/** Sender de planlagte varslene som skal sendes nå (`enhetsvarsel_hent`). */
export const sendEnhetsvarsler = (valg: Utsendingsvalg): Promise<Utsending> => sendFraKilde(ENHETSVARSELKILDE, valg)
