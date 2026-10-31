/**
 * Hva de klinisk godkjente regelversjonene bygger på, så et funn i
 * overvåkingen kan knyttes til reglene det berører (P12.1 og P12.5): kildene
 * de henviser til, Psychiatrienet-oppføringene de sammenlignes med, og
 * preparatene i FEST planene kan bygges av.
 */
import type { Byggestein } from '../motor/byggesteiner'
import { utenforForlop } from '../motor/plan'
import { KARTLEGGING } from '../register'
import { erKliniskGodkjent, fingeravtrykk, harBeregning } from '../regler/godkjenning'
import { henvisninger, type Forlop, type Regel, type Regelsett } from '../regler/modell'
import { REGELSETTENE } from '../tilgjengelighet'
import type { Virkestoffkartlegging } from '../kartlegging'
import type { Berort } from './modell'

export interface Godkjentregel {
  regelsett: string
  regel: Regel
  fingeravtrykk: string
  /** Kildene regelen henviser til (`Kilde.id`), utenom Psychiatrienet. */
  kilder: ReadonlySet<string>
  /** Psychiatrienet-oppføringene regelen sammenlignes med (P3-id). */
  kildeoppforinger: ReadonlySet<string>
  /** Om regelen beregner en plan; en tekstregel bruker ikke preparatene i FEST. */
  beregning: boolean
}

/** De klinisk godkjente regelversjonene i regelsettene. */
export function godkjenteRegler(sett: readonly Regelsett[] = REGELSETTENE): Godkjentregel[] {
  return sett.flatMap((s) =>
    s.regler.filter(erKliniskGodkjent).map((regel) => {
      const h = henvisninger(regel)
      return {
        regelsett: s.id,
        regel,
        fingeravtrykk: fingeravtrykk(regel),
        kilder: new Set(h.flatMap((x) => (x.kilde === 'psychiatrienet' ? [] : [x.kilde]))),
        kildeoppforinger: new Set(h.flatMap((x) => ('kildeoppforing' in x ? [x.kildeoppforing] : []))),
        beregning: harBeregning(regel),
      }
    }),
  )
}

export const berort = (g: Godkjentregel, hvorfor: string): Berort => ({
  regelsett: g.regelsett,
  regel: g.regel.id,
  versjon: g.regel.versjon,
  fingeravtrykk: g.fingeravtrykk,
  hvorfor,
})

/** De godkjente reglene som henviser til kilden. */
export const berortAvKilde = (regler: readonly Godkjentregel[], kilde: string): Berort[] =>
  regler.filter((g) => g.kilder.has(kilde)).map((g) => berort(g, 'henviser til kilden'))

/** De godkjente reglene som sammenlignes med Psychiatrienet-oppføringen. */
export const berortAvOppforing = (regler: readonly Godkjentregel[], oppforing: string): Berort[] =>
  regler.filter((g) => g.kildeoppforinger.has(oppforing)).map((g) => berort(g, 'sammenlignes med kildeoppføringen'))

/** Virkestoffene (P1-nøkler) i et forløp; for en gruppe hvert medlem. */
export function virkestofferI(f: Forlop, k: Virkestoffkartlegging = KARTLEGGING): string[] {
  const v = f.virkestoff
  return v.type === 'virkestoff' ? [v.nokkel] : (k.grupper.find((g) => g.id === v.gruppe)?.medlemmer.map((m) => m.virkestoff) ?? [])
}

/** Virkestoffene planene til de godkjente, beregnbare reglene kan bygges av. */
export const virkestofferForFest = (regler: readonly Godkjentregel[], k: Virkestoffkartlegging = KARTLEGGING): string[] =>
  [...new Set(regler.filter((g) => g.beregning).flatMap((g) => g.regel.plan.forlop.flatMap((f) => virkestofferI(f, k))))].sort()

/**
 * Om preparatet kan inngå i en plan etter regelen i det omfanget den er
 * godkjent for: i et forløp for virkestoffet, med forløpets
 * administrasjonsvei og avgrensninger, og, når regelen har et klinisk omfang,
 * med en legemiddelform og en styrke som er kontrollert i et av tilfellene.
 */
export function iGodkjentOmfang(r: Regel, f: Forlop, b: Byggestein): boolean {
  if (utenforForlop(f, b)) return false
  const tilfeller = r.klinisk_omfang?.tilfeller
  if (!tilfeller) return true
  return tilfeller.some((t) => (!t.legemiddelform || t.legemiddelform === b.legemiddelform?.kode) && (!t.styrker?.[f.id] || (b.mg !== null && t.styrker[f.id]!.includes(b.mg))))
}

/** De godkjente, beregnbare reglene preparatet for virkestoffet kan inngå i, og forløpene det gjelder. */
export function berortAvPreparat(regler: readonly Godkjentregel[], nokkel: string, b: Byggestein, k: Virkestoffkartlegging = KARTLEGGING): Berort[] {
  return regler.flatMap((g) => {
    if (!g.beregning) return []
    const forlop = g.regel.plan.forlop.filter((f) => virkestofferI(f, k).includes(nokkel) && iGodkjentOmfang(g.regel, f, b))
    return forlop.length > 0 ? [berort(g, `preparatet kan inngå i ${forlop.map((f) => `forløpet «${f.id}»`).join(' og ')} i det godkjente omfanget`)] : []
  })
}
