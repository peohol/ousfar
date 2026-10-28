/**
 * Hva et verktøy kan gi for valgene som er gjort (P6.8 i
 * `docs/verktøy-utviklingsplan.md`): en beregnet doseplan, bare publisert
 * OUSFAR-fagtekst, eller ingenting fordi faglig kontroll gjenstår eller
 * kombinasjonen ikke er støttet. Statusen følger reglene slik de faktisk står
 * i regelsettet, med godkjenningen kontrollert mot regelversjon og
 * fingeravtrykk (`godkjenningsfeil`), aldri etter et flagg i appen.
 */
import { KILDEFORMULERINGER, type Kildeformulering, type Virkestoffkartlegging } from './kartlegging'
import { KARTLEGGING, virkestoffvalg, type Verktoy } from './register'
import { godkjenningsfeil } from './regler/godkjenning'
import type { Administrasjon, Forlop, Regel, Regelsett, Virkestoffvalg } from './regler/modell'
import { PILOTSETT } from './regler/pilotsett'

/** Regelsettet appen bruker. */
export const REGELSETT: Regelsett = PILOTSETT

/** Ett valgt virkestoff med formuleringen fra kildetabellen. */
export interface Valgtvirkestoff {
  nokkel: string
  formulering: Kildeformulering
}

export interface Verktoyvalg {
  fra: Valgtvirkestoff
  /** Mangler i et verktøy for seponering. */
  til?: Valgtvirkestoff
}

export type Regelstatus = 'tilgjengelig' | 'fagtekst' | 'til_kontroll' | 'ikke_stottet'

export interface Tilgjengelighet {
  status: Regelstatus
  /** Reglene statusen gjelder; for `tilgjengelig` dem det kan beregnes med. */
  regler: Regel[]
  /** Hvorfor det ikke kan beregnes, i klartekst. */
  grunner: string[]
}

/** Administrasjonsformen regelen må ha for en formulering i kildetabellen; `null` når ingen regel kan ha den. */
export function administrasjonFor(f: Kildeformulering): Administrasjon | null {
  const klasser: readonly string[] = KILDEFORMULERINGER[f].klasser
  if (klasser.includes('peroral')) return 'peroral'
  return klasser.includes('depotinjeksjon') ? 'depotinjeksjon' : null
}

const passerVirkestoff = (v: Virkestoffvalg, nokkel: string, k: Virkestoffkartlegging) =>
  v.type === 'virkestoff' ? v.nokkel === nokkel : (k.grupper.find((g) => g.id === v.gruppe)?.medlemmer.some((m) => m.virkestoff === nokkel) ?? false)

/** Forløpet for legemidlet pasienten bruker: det som starter fra aktuell dose. */
export const fraForlop = (r: Regel): Forlop | undefined => r.plan.forlop.find((f) => f.utgangsdose === 'startdose') ?? r.plan.forlop[0]

/** Forløpet for det nye legemidlet. */
export function tilForlop(r: Regel): Forlop | undefined {
  const fra = fraForlop(r)
  return r.til ? r.plan.forlop.find((f) => f !== fra && f.virkestoff.type === r.til!.type && JSON.stringify(f.virkestoff) === JSON.stringify(r.til)) : undefined
}

/** Reglene i settet som gjelder valgene i verktøyet: samme retning, virkestoffer og administrasjonsform. */
export function reglerFor(verktoy: Verktoy, valg: Verktoyvalg, regelsett: Regelsett = REGELSETT, k: Virkestoffkartlegging = KARTLEGGING): Regel[] {
  return regelsett.regler.filter((r) => {
    if (verktoy.type === 'seponering' ? r.til !== null || r.plan.form !== 'seponering' : r.til === null || !valg.til) return false
    if (!passerVirkestoff(r.fra, valg.fra.nokkel, k) || fraForlop(r)?.administrasjon !== administrasjonFor(valg.fra.formulering)) return false
    if (!valg.til || !r.til) return true
    return passerVirkestoff(r.til, valg.til.nokkel, k) && tilForlop(r)?.administrasjon === administrasjonFor(valg.til.formulering)
  })
}

/** Gruppemedlemmet valgene gjelder når regelen er for en gruppe. */
export function medlemFor(r: Regel, valg: Verktoyvalg): string | undefined {
  if (r.fra.type === 'gruppe') return valg.fra.nokkel
  return r.til?.type === 'gruppe' ? valg.til?.nokkel : undefined
}

/** Hvorfor en godkjent regel likevel ikke kan beregnes for valgene; tom når den kan. */
function beregningsfeil(r: Regel, valg: Verktoyvalg): string[] {
  if (r.beregnbarhet === 'bare_tekstlig' || r.beregnbarhet === 'mangler_anbefaling') return [`Regelen «${r.tittel}» har ingen beregning.`]
  const medlem = medlemFor(r, valg)
  if (medlem === undefined) return []
  const m = r.medlemmer?.find((x) => x.nokkel === medlem)
  return m && m.validering !== 'ikke_vurdert' ? [] : [`Regelen «${r.tittel}» er ikke vurdert for dette virkestoffet.`]
}

/**
 * Hva verktøyet kan gi for valgene: en beregning når en gjeldende klinisk
 * godkjent regel kan beregnes, ellers fagtekst fra en godkjent regel uten
 * beregning, ellers at faglig kontroll gjenstår når det finnes regler som
 * ikke er godkjent, og ellers at kombinasjonen ikke er støttet.
 */
export function tilgjengelighet(verktoy: Verktoy, valg: Verktoyvalg, regelsett: Regelsett = REGELSETT, k: Virkestoffkartlegging = KARTLEGGING): Tilgjengelighet {
  if (valg.til && valg.til.nokkel === valg.fra.nokkel && valg.til.formulering === valg.fra.formulering) {
    return { status: 'ikke_stottet', regler: [], grunner: ['Fra og til er det samme legemidlet i samme formulering.'] }
  }
  if (!administrasjonFor(valg.fra.formulering) || (valg.til && !administrasjonFor(valg.til.formulering))) {
    return { status: 'ikke_stottet', regler: [], grunner: ['Verktøyene har ingen regler for middels langtidsvirkende injeksjoner.'] }
  }
  const regler = reglerFor(verktoy, valg, regelsett, k)
  const godkjente = regler.filter((r) => godkjenningsfeil(r).length === 0)
  const beregnbare = godkjente.filter((r) => beregningsfeil(r, valg).length === 0)
  if (beregnbare.length > 0) return { status: 'tilgjengelig', regler: beregnbare, grunner: [] }
  const fagtekst = godkjente.filter((r) => r.beregnbarhet === 'bare_tekstlig')
  if (fagtekst.length > 0) return { status: 'fagtekst', regler: fagtekst, grunner: fagtekst.flatMap((r) => beregningsfeil(r, valg)) }
  const tilKontroll = regler.filter((r) => !godkjente.includes(r) && r.beregnbarhet !== 'mangler_anbefaling')
  if (tilKontroll.length > 0) {
    return { status: 'til_kontroll', regler: tilKontroll, grunner: ['Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår.'] }
  }
  const grunner = godkjente.flatMap((r) => beregningsfeil(r, valg))
  return { status: 'ikke_stottet', regler: [], grunner: grunner.length > 0 ? grunner : ['OUSFAR har ingen regel for denne kombinasjonen.'] }
}

/** Hvor mange regler for verktøyets virkestoffer som kan beregnes nå, og hvor mange som venter på faglig kontroll. */
export function regeloversikt(verktoy: Verktoy, regelsett: Regelsett = REGELSETT, k: Virkestoffkartlegging = KARTLEGGING): { tilgjengelige: number; tilKontroll: number } {
  const nokler = new Set(virkestoffvalg(verktoy, k).map((v) => v.nokkel))
  const iVerktoyet = (v: Virkestoffvalg) =>
    v.type === 'virkestoff' ? nokler.has(v.nokkel) : (k.grupper.find((g) => g.id === v.gruppe)?.medlemmer.some((m) => nokler.has(m.virkestoff)) ?? false)
  const egne = regelsett.regler.filter((r) => (verktoy.type === 'seponering') === (r.til === null) && iVerktoyet(r.fra) && (!r.til || iVerktoyet(r.til)))
  const godkjente = egne.filter((r) => godkjenningsfeil(r).length === 0)
  return { tilgjengelige: godkjente.length, tilKontroll: egne.length - godkjente.length }
}
