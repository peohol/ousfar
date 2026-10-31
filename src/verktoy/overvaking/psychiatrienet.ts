/**
 * Overvåkingen av Psychiatrienets kildeoppføringer (P12.1): en ny innhenting
 * (`kildeinnhenting.ts`) legges til en kopi av P3-arkivet, og hver
 * kildeoppføring i det nye uttrekket sammenlignes med det siste i arkivet.
 * Arkivet skrives ikke; det oppdateres bare med `npm run verktoy:kildeimport --
 * hent` i en PR.
 *
 * Bare id-er, svarkoder, revisjoner og kontrollsummer sammenlignes og vises,
 * aldri innholdet (`docs/verktøy-p3-rettigheter.md`). En endret anbefaling,
 * en oppføring som er borte eller ikke lenger kan hentes, krever vurdering
 * når en godkjent regel sammenlignes med den. En endring bare i siden rundt
 * anbefalingen (en annen celle på samme side, revisjonen) er informativ.
 */
import { registrerInnhenting, type Innhenting, type Kildearkiv } from '../kildearkiv'
import { kildegrunnlag, type Kildeanbefaling } from '../kildeanbefalinger'
import type { Virkestoffkartlegging } from '../kartlegging'
import { berortAvOppforing, type Godkjentregel } from './berorte'
import { nivaFor, type Grunnlagsdel, type Overvakingsfunn } from './modell'

const part = (p: Kildeanbefaling['fra'] | null) => (p ? (p.variant?.navn ?? p.kildenavn ?? p.kode) : 'Stop')
const etikett = (a: Kildeanbefaling) => `${a.tabell}: ${part(a.fra)} → ${a.type === 'seponering' ? 'Stop' : part(a.til)}`

/** Det i en oppføring som sier om anbefalingen er den samme, og det som bare er om siden rundt. */
const VESENTLIGE = ['tilgjengelighet', 'http_status', 'sha256_anbefaling', 'kildeside'] as const
const INFORMATIVE = ['sha256_side', 'revisjon'] as const

const verdi = (x: unknown) => (x === null || x === undefined ? '–' : typeof x === 'string' && /^[0-9a-f]{64}$/.test(x) ? x.slice(0, 12) : String(x))

export function psychiatrienetfunn(arkiv: Kildearkiv, inn: Innhenting, k: Virkestoffkartlegging, regler: readonly Godkjentregel[]): { funn: Overvakingsfunn[]; grunnlag: Grunnlagsdel } {
  const forrige = arkiv.uttrekk.at(-1)
  if (!forrige) throw new Error('Kildearkivet har ingen uttrekk å sammenligne med')
  const { arkiv: ny, endringer } = registrerInnhenting(arkiv, inn)
  const foer = new Map(kildegrunnlag(arkiv, k, forrige.nr).anbefalinger.map((a) => [a.id, a]))
  const etter = new Map(kildegrunnlag(ny, k).anbefalinger.map((a) => [a.id, a]))
  const funn: Overvakingsfunn[] = []
  for (const id of [...new Set([...foer.keys(), ...etter.keys()])].sort()) {
    const a = foer.get(id)
    const b = etter.get(id)
    const berorte = berortAvOppforing(regler, id)
    const lag = (art: Overvakingsfunn['art'], detaljer: string[], vesentlig: boolean): Overvakingsfunn => ({
      id: `psychiatrienet:${id}`,
      kilde: 'psychiatrienet',
      art,
      niva: nivaFor(art, berorte, vesentlig),
      objekt: id,
      etikett: etikett((b ?? a)!),
      detaljer,
      berorte,
    })
    if (!a) funn.push(lag('ny', ['Ny kildeoppføring i Psychiatrienet.'], true))
    else if (!b) funn.push(lag('fjernet', [`Kildeoppføringen finnes ikke lenger i tabellen (uttrekk ${forrige.nr}).`], true))
    else {
      const ulik = (felt: readonly (keyof Kildeanbefaling)[]) => felt.flatMap((f) => (JSON.stringify(a[f]) === JSON.stringify(b[f]) ? [] : [`${f}: ${verdi(a[f])} → ${verdi(b[f])}`]))
      const vesentlige = ulik(VESENTLIGE)
      const informative = ulik(INFORMATIVE)
      if (vesentlige.length > 0) funn.push(lag(b.tilgjengelighet === 'utilgjengelig' ? 'fjernet' : 'endret', [...vesentlige, ...informative], true))
      else if (informative.length > 0) funn.push(lag('endret', [...informative, 'Anbefalingen selv har samme kontrollsum.'], false))
    }
  }
  // Tabellene selv: en ny eller forsvunnet tabell er informativ; oppføringene i den er med over.
  for (const e of endringer.filter((x) => x.hva === 'tabell' && (x.type === 'ny' || x.type === 'forsvunnet'))) {
    funn.push({ id: `psychiatrienet:tabell:${e.id}`, kilde: 'psychiatrienet', art: e.type === 'ny' ? 'ny' : 'fjernet', niva: 'informativ', objekt: e.id, etikett: `Tabellen ${e.id}`, detaljer: [`Tabellen er ${e.type === 'ny' ? 'ny' : 'borte'}.`], berorte: [] })
  }
  return {
    funn,
    grunnlag: { kilde: 'psychiatrienet', kjort: true, kontrollert: etter.size, beskrivelse: `${inn.sider.length} kildesider og ${inn.tabeller.length} tabeller hentet ${inn.startet}–${inn.ferdig}, mot uttrekk ${forrige.nr} i kildearkivet` },
  }
}
