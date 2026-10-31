/**
 * Overvåkingen av preparatene i FEST (P12.5): byggesteinene de godkjente
 * reglene kan bygge planer av, i et nytt FEST-uttrekk sammenlignet med
 * uttrekket reglene ble kontrollert mot (`fest-pilotsett.json`,
 * `fest-aksepttest.json`).
 *
 * Et preparat som kan inngå i en plan i det godkjente omfanget og er borte,
 * avregistrert, midlertidig utgått eller har fått endret styrke, form,
 * delbarhet eller registrering, krever ny faglig vurdering: en plan beregnet
 * før kan bli uaktuell ved ny beregning. Det samme gjelder et nytt preparat
 * med en kontrollert form og styrke, fordi beregningen da kan bruke det. Et
 * nytt preparat med en styrke som ikke er kontrollert, brukes ikke av
 * beregningen og er informativt. Endringer i navn og varenummer er
 * informative.
 */
import { byggesteiner, MARKEDSSTATUS, type Byggestein } from '../motor/byggesteiner'
import { festkoblinger, KARTLEGGING } from '../register'
import { omgivelseFor, type Festuttrekk } from '../regler/aksepttest'
import type { Virkestoffkartlegging } from '../kartlegging'
import { berortAvPreparat, type Godkjentregel } from './berorte'
import { nivaFor, type Berort, type Grunnlagsdel, type Overvakingsfunn } from './modell'

/** Feltene i en byggestein som avgjør hva en plan kan bygges av, med navnet i rapporten. */
const VESENTLIGE: Record<string, (b: Byggestein) => unknown> = {
  styrke: (b) => (b.mg === null ? 'ingen' : `${b.mg} mg`),
  doseenhet: (b) => b.doseenhet ?? 'ingen',
  legemiddelform: (b) => (b.legemiddelform ? `${b.legemiddelform.tekst} (${b.legemiddelform.kode})` : 'ingen'),
  formulering: (b) => b.klasse,
  administrasjonsvei: (b) => b.administrasjonsveier.join(', ') || 'ingen',
  deling: (b) => (b.deling === 1 ? 'ikke delbar' : `delbar i ${b.deling}`),
  registrering: (b) => b.registrering,
  markedsstatus: (b) => MARKEDSSTATUS[b.marked],
  begrensninger: (b) => b.begrensninger.join('; ') || 'ingen',
}

/** Feltene som bare er registrert, uten betydning for planen. */
const INFORMATIVE: Record<string, (b: Byggestein) => unknown> = {
  varenavn: (b) => b.varenavn,
  'navn, form og styrke': (b) => b.navn_form_styrke,
  varenummer: (b) => b.varenr.join(', ') || 'ingen',
  'markedsført til': (b) => b.marked_til ?? '–',
}

const ulike = (felt: Record<string, (b: Byggestein) => unknown>, a: Byggestein, b: Byggestein) =>
  Object.entries(felt).flatMap(([navn, f]) => (JSON.stringify(f(a)) === JSON.stringify(f(b)) ? [] : [`${navn}: ${String(f(a))} → ${String(f(b))}`]))

const beskriv = (b: Byggestein) => `${b.mg === null ? 'uten styrke' : `${b.mg} mg`}, ${b.legemiddelform?.tekst ?? 'uten form'}, ${MARKEDSSTATUS[b.marked]}, ${b.deling === 1 ? 'ikke delbar' : `delbar i ${b.deling}`}`

/** Berørte regler, slått sammen per regel. */
function samlet(...lister: Berort[][]): Berort[] {
  const ut = new Map<string, Berort>()
  for (const b of lister.flat()) {
    const x = ut.get(b.regel)
    ut.set(b.regel, x ? { ...x, hvorfor: x.hvorfor === b.hvorfor ? x.hvorfor : `${x.hvorfor}; ${b.hvorfor}` } : b)
  }
  return [...ut.values()].sort((a, b) => a.regel.localeCompare(b.regel))
}

/**
 * Hva som er nytt, endret og fjernet blant byggesteinene for `virkestoffer` i
 * uttrekket `etter` sammenlignet med `foer`, og hvilke godkjente regler det
 * berører. Markedsstatusen gjelder hvert uttrekks egen dato.
 */
export function festfunn(foer: Festuttrekk, etter: Festuttrekk, virkestoffer: readonly string[], regler: readonly Godkjentregel[], k: Virkestoffkartlegging = KARTLEGGING): Overvakingsfunn[] {
  const koblinger = festkoblinger(virkestoffer, k)
  const steiner = (u: Festuttrekk, n: string) =>
    new Map(byggesteiner({ utvalg: u.utvalg, koblinger, overstyringer: k.festoverstyringer }, n, omgivelseFor(u).idag).map((b) => [b.id, b]))
  const funn: Overvakingsfunn[] = []
  for (const n of virkestoffer) {
    const navn = k.virkestoffer.find((v) => v.nokkel === n)?.navn ?? n
    const a = steiner(foer, n)
    const b = steiner(etter, n)
    for (const id of [...new Set([...a.keys(), ...b.keys()])].sort()) {
      const gammel = a.get(id)
      const ny = b.get(id)
      const berorte = samlet(gammel ? berortAvPreparat(regler, n, gammel, k) : [], ny ? berortAvPreparat(regler, n, ny, k) : [])
      const lag = (art: Overvakingsfunn['art'], detaljer: string[], vesentlig: boolean): Overvakingsfunn => ({
        id: `fest:${n}:${id}`,
        kilde: 'fest',
        art,
        niva: nivaFor(art, berorte, vesentlig),
        objekt: id,
        etikett: `${navn}: ${(ny ?? gammel)!.navn_form_styrke}`,
        detaljer,
        berorte,
      })
      if (!gammel) funn.push(lag('ny', [`Nytt i FEST: ${beskriv(ny!)}.`, berorte.length > 0 ? 'Har en form og styrke som er kontrollert, så beregningen kan bruke det.' : 'Har ingen kontrollert form og styrke; beregningen bruker det ikke.'], true))
      else if (!ny) funn.push(lag('fjernet', [`Ikke lenger i FEST-uttrekket (var ${beskriv(gammel)}).`], true))
      else {
        const vesentlige = ulike(VESENTLIGE, gammel, ny)
        const informative = ulike(INFORMATIVE, gammel, ny)
        if (vesentlige.length + informative.length > 0) funn.push(lag('endret', [...vesentlige, ...informative], vesentlige.length > 0))
      }
    }
  }
  return funn
}

export interface Festsammenligning {
  /** Navnet på grunnlaget i rapporten. */
  navn: string
  foer: Festuttrekk
  etter: Festuttrekk
  virkestoffer: readonly string[]
}

/** Funnene for flere grunnlag, slått sammen per preparat, og hva som ble sammenlignet. */
export function kontrollerFest(sammenligninger: readonly Festsammenligning[], regler: readonly Godkjentregel[], k: Virkestoffkartlegging = KARTLEGGING): { funn: Overvakingsfunn[]; grunnlag: Grunnlagsdel } {
  const per = new Map<string, Overvakingsfunn>()
  for (const s of sammenligninger) {
    for (const f of festfunn(s.foer, s.etter, s.virkestoffer, regler, k)) {
      const x = per.get(f.id)
      if (!x) per.set(f.id, f)
      else {
        const berorte = samlet(x.berorte, f.berorte)
        per.set(f.id, { ...x, berorte, niva: x.niva === 'krever_vurdering' || f.niva === 'krever_vurdering' ? 'krever_vurdering' : 'informativ', detaljer: [...new Set([...x.detaljer, ...f.detaljer])] })
      }
    }
  }
  const tid = (u: Festuttrekk) => u.utvalg.kontrollert_kl ?? u.hentet
  return {
    funn: [...per.values()],
    grunnlag: {
      kilde: 'fest',
      kjort: true,
      kontrollert: new Set(sammenligninger.flatMap((s) => s.virkestoffer)).size,
      beskrivelse: sammenligninger.map((s) => `${s.navn}: FEST kontrollert ${tid(s.foer)} mot ${tid(s.etter)}`).join('; '),
    },
  }
}
