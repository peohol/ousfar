/**
 * Små valg som følger brukeren fra maskin til maskin, som sorteringen i
 * idélista og lyst eller mørkt tema. Radsikkerheten i `brukerinnstillinger`
 * gjør at hver bruker bare ser og skriver sine egne.
 */
import { klient } from './klient'

const FEIL = 'Kunne ikke nå brukerinnstillingene.'

/** Nøklene som er bedt om, men ikke sendt ennå, og svaret de venter på. */
let samling: { nokler: Set<string>; svar: Promise<Map<string, unknown>> } | null = null

/**
 * Verdien brukeren har lagret under `nokkel`, eller `null` når vedkommende ikke
 * har valgt noe ennå. Kaster når tjenesten ikke svarer, så den som kaller kan
 * skille «ingenting lagret» fra «vet ikke».
 *
 * Mange deler av appen spør hver for sin nøkkel når den åpnes. Det som
 * spørres om i samme omgang (før nettleseren gjør noe annet), sendes derfor
 * som ett kall, og den samme nøkkelen bare én gang. Ingenting huskes etter
 * svaret: neste spørsmål henter på nytt.
 */
export function hentInnstilling(nokkel: string): Promise<unknown> {
  if (!samling) {
    const nokler = new Set<string>()
    // Etter det som kjører nå (en hel runde med effekter når en side
    // monteres), men før nettleseren gjør noe annet: et travelt bilde skal
    // ikke holde kallet tilbake.
    const svar = Promise.resolve().then(() => {
      samling = null
      return hentInnstillinger([...nokler])
    })
    samling = { nokler, svar }
  }
  samling.nokler.add(nokkel)
  return samling.svar.then((verdier) => verdier.get(nokkel) ?? null)
}

/** Verdiene under `nokler` i ett kall; nøkler uten lagret valg er ikke med. */
async function hentInnstillinger(nokler: string[]): Promise<Map<string, unknown>> {
  const { data, error } = await klient().from('brukerinnstillinger').select('nokkel, verdi').in('nokkel', nokler)
  if (error) throw new Error(FEIL)
  return new Map(((data ?? []) as { nokkel: string; verdi: unknown }[]).map((rad) => [rad.nokkel, rad.verdi]))
}

export async function lagreInnstilling(nokkel: string, verdi: unknown): Promise<void> {
  const { error } = await klient()
    .from('brukerinnstillinger')
    .upsert({ nokkel, verdi }, { onConflict: 'bruker_id,nokkel' })
  if (error) throw new Error(FEIL)
}

/**
 * Lagrer `nokkel` én gang av gangen, så et eldre valg aldri når fram etter et
 * nyere. Venter flere, sendes bare det siste. Brukes der et valg kan endres
 * flere ganger raskt etter hverandre, som bredden på en meny som dras.
 */
export function lagreSisteValg<T>(nokkel: string): (verdi: T) => Promise<void> {
  let ko: Promise<void> = Promise.resolve()
  let siste: { verdi: T } | null = null
  return (verdi) => {
    const valg = { verdi }
    siste = valg
    const lagring = ko.then(() => (siste === valg ? lagreInnstilling(nokkel, verdi) : undefined))
    ko = lagring.catch(() => undefined)
    return lagring
  }
}

/**
 * En lengde i piksler som brukeren har dratt en flate til, som bredden på
 * diskusjonsmenyen. `null` er lengden flaten har av seg selv.
 */
export interface Lengdeinnstilling {
  hent: () => Promise<number | null>
  /** Kan kalles mange ganger raskt (et drag, piltastene); den siste vinner. */
  lagre: (lengde: number | null) => Promise<void>
  /** Den siste lengden som er hentet eller lagret her, så en flate kan åpne med den. */
  sist?: () => number | null | undefined
}

/**
 * En lengdeinnstilling under `nokkel`. Verdien kan ikke være tom i tabellen,
 * så «av seg selv» lagres som 0.
 */
export function lengdeinnstilling(nokkel: string): Lengdeinnstilling {
  const lagreValg = lagreSisteValg<number>(nokkel)
  let sist: number | null | undefined
  return {
    async hent() {
      const verdi = await hentInnstilling(nokkel)
      sist = typeof verdi === 'number' && Number.isFinite(verdi) && verdi > 0 ? verdi : null
      return sist
    },
    lagre(lengde) {
      sist = lengde === null ? null : Math.round(lengde)
      return lagreValg(sist ?? 0)
    },
    sist: () => sist,
  }
}
