/**
 * Én kjøring av kildeovervåkingen (P12.1 og P12.5): delene kjøres hver for
 * seg, og en del som stopper (en kilde som ikke svarer, FEST som ikke kan
 * leses), står som ikke kontrollert i rapporten uten å stoppe de andre.
 * Hentingen gis inn, så testene kan kjøre hele flyten med syntetiske data.
 *
 * Hvilke funn som er åpne, avgjør databasen når kjøringen meldes inn
 * (`registrering.ts`): en del som ikke ble kontrollert, rører ingen funn der.
 */
import type { Innhenting, Kildearkiv } from '../kildearkiv'
import type { Virkestoffkartlegging } from '../kartlegging'
import { KARTLEGGING } from '../register'
import type { Festuttrekk } from '../regler/aksepttest'
import { godkjenteRegler, type Godkjentregel } from './berorte'
import { kontrollerDokumenter, type Dokumenthenter } from './dokumenter'
import { kontrollerFest, type Festsammenligning } from './fest'
import { prioritetFor, sorterFunn, type Funnkilde, type Grunnlagsdel, type Overvakingsfunn, type Overvakingsrapport } from './modell'
import { psychiatrienetfunn } from './psychiatrienet'

export interface Overvakingsvalg {
  /** Henter et kildedokument; uten den kontrolleres ikke dokumentene. */
  dokumenter?: Dokumenthenter
  /** Grunnlagene i repoet og en lesing av FEST nå; uten den kontrolleres ikke FEST. */
  fest?: { grunnlag: readonly { navn: string; uttrekk: Festuttrekk; virkestoffer: readonly string[] }[]; les: (virkestoffer: readonly string[]) => Promise<Festuttrekk> }
  /** Kildearkivet og en ny innhenting; uten den kontrolleres ikke Psychiatrienet. */
  psychiatrienet?: { arkiv: Kildearkiv; innhent: () => Promise<Innhenting> }
  regler?: readonly Godkjentregel[]
  kartlegging?: Virkestoffkartlegging
  na?: () => string
  /** Legg til et syntetisk funn som prøver varslingen i appen (en prøvesak); ingen kilde eller regel er endret. */
  provesak?: boolean
}

/** Det syntetiske funnet i en prøvesak: krever vurdering med høy prioritet, men berører ingen regel. */
export const PROVEFUNN: Overvakingsfunn = {
  id: 'provesak:syntetisk',
  kilde: 'dokument',
  art: 'endret',
  niva: 'krever_vurdering',
  objekt: 'syntetisk-provesak',
  etikett: 'Syntetisk prøvesak (ingen reell kilde)',
  detaljer: [
    'Syntetisk funn som prøver varslingen: det skal vises i Adminmeny → Kildeovervåking, få en teknisk vurdering og stå som over fristen for den faglige beslutningen etter tre døgn, før det avsluttes. Ingen kilde, preparat eller regel er endret.',
  ],
  berorte: [],
  prioritet: 'hoy',
}

const IKKE_KJORT: Record<Funnkilde, string> = {
  dokument: 'Kildedokumentene ble ikke kontrollert i denne kjøringen.',
  psychiatrienet: 'Psychiatrienet ble ikke kontrollert i denne kjøringen (kontrolleres månedlig).',
  fest: 'FEST ble ikke kontrollert i denne kjøringen.',
}

export async function kjorOvervaking(v: Overvakingsvalg): Promise<Overvakingsrapport> {
  const regler = v.regler ?? godkjenteRegler()
  const k = v.kartlegging ?? KARTLEGGING
  const funn: Overvakingsfunn[] = []
  const grunnlag: Grunnlagsdel[] = []
  const feil: string[] = []
  const del = async (kilde: Funnkilde, kjor: (() => Promise<{ funn: Overvakingsfunn[]; grunnlag: Grunnlagsdel }>) | null) => {
    if (!kjor) return grunnlag.push({ kilde, kjort: false, kontrollert: 0, beskrivelse: IKKE_KJORT[kilde] })
    try {
      const r = await kjor()
      funn.push(...r.funn)
      grunnlag.push(r.grunnlag)
    } catch (e) {
      feil.push(`${kilde === 'dokument' ? 'Kildedokumentene' : kilde === 'fest' ? 'FEST' : 'Psychiatrienet'}: ${e instanceof Error ? e.message : String(e)}`)
      grunnlag.push({ kilde, kjort: false, kontrollert: 0, beskrivelse: 'Stoppet; se «Ikke kontrollert».' })
    }
  }
  await del('dokument', v.dokumenter ? () => kontrollerDokumenter(regler, v.dokumenter) : null)
  await del(
    'psychiatrienet',
    v.psychiatrienet ? async () => psychiatrienetfunn(v.psychiatrienet!.arkiv, await v.psychiatrienet!.innhent(), k, regler) : null,
  )
  await del(
    'fest',
    v.fest
      ? async () => {
          const sammenligninger: Festsammenligning[] = []
          for (const g of v.fest!.grunnlag) sammenligninger.push({ navn: g.navn, foer: g.uttrekk, etter: await v.fest!.les(g.virkestoffer), virkestoffer: g.virkestoffer })
          return kontrollerFest(sammenligninger, regler, k)
        }
      : null,
  )
  if (v.provesak) funn.push(PROVEFUNN)
  const medPrioritet = funn.map((f) => (f.prioritet || !prioritetFor(f) ? f : { ...f, prioritet: prioritetFor(f) }))
  return {
    versjon: 1,
    kjort_kl: (v.na ?? (() => new Date().toISOString().replace(/\.\d+Z$/, 'Z')))(),
    grunnlag,
    funn: sorterFunn(medPrioritet),
    feil,
    ...(v.provesak ? { provesak: true } : {}),
  }
}
