/**
 * Én kjøring av kildeovervåkingen (P12.1 og P12.5): delene kjøres hver for
 * seg, og en del som stopper (en kilde som ikke svarer, FEST som ikke kan
 * leses), står som ikke kontrollert i rapporten uten å stoppe de andre.
 * Hentingen gis inn, så testene kan kjøre hele flyten med syntetiske data.
 *
 * Funnene som krevde vurdering i forrige kjøring, står videre for en del som
 * ikke er kontrollert på nytt, så en kjøring uten Psychiatrienet, eller der
 * FEST ikke kunne leses, aldri gjør et funn i den delen avklart.
 */
import type { Innhenting, Kildearkiv } from '../kildearkiv'
import type { Virkestoffkartlegging } from '../kartlegging'
import { KARTLEGGING } from '../register'
import type { Festuttrekk } from '../regler/aksepttest'
import { godkjenteRegler, type Godkjentregel } from './berorte'
import { kontrollerDokumenter, type Dokumenthenter } from './dokumenter'
import { kontrollerFest, type Festsammenligning } from './fest'
import { sorterFunn, type Funnkilde, type Grunnlagsdel, type Overvakingsfunn, type Overvakingsrapport } from './modell'
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
  /** Funnene som krevde vurdering i forrige kjøring (fra saken), og når den ble gjort. */
  forrige?: Pick<Overvakingsrapport, 'kjort_kl' | 'funn'>
}

/** Forrige kjørings funn som krevde vurdering i delen, merket med kjøringen de først ble gjort i. */
const videreforte = (forrige: Overvakingsvalg['forrige'], kilde: Funnkilde): Overvakingsfunn[] =>
  (forrige?.funn ?? []).filter((f) => f.kilde === kilde && f.niva === 'krever_vurdering').map((f) => ({ ...f, viderefort_fra: f.viderefort_fra ?? forrige!.kjort_kl }))

const videreforteTekst = (n: number) => (n === 0 ? '' : ` ${n} funn fra en tidligere kjøring står videre til delen er kontrollert igjen.`)

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
    const tidligere = videreforte(v.forrige, kilde)
    if (!kjor) {
      funn.push(...tidligere)
      return grunnlag.push({ kilde, kjort: false, kontrollert: 0, beskrivelse: IKKE_KJORT[kilde] + videreforteTekst(tidligere.length) })
    }
    try {
      const r = await kjor()
      funn.push(...r.funn)
      grunnlag.push(r.grunnlag)
    } catch (e) {
      feil.push(`${kilde === 'dokument' ? 'Kildedokumentene' : kilde === 'fest' ? 'FEST' : 'Psychiatrienet'}: ${e instanceof Error ? e.message : String(e)}`)
      funn.push(...tidligere)
      grunnlag.push({ kilde, kjort: false, kontrollert: 0, beskrivelse: `Stoppet; se «Ikke kontrollert».${videreforteTekst(tidligere.length)}` })
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
  return { versjon: 1, kjort_kl: (v.na ?? (() => new Date().toISOString().replace(/\.\d+Z$/, 'Z')))(), grunnlag, funn: sorterFunn(funn), feil }
}
