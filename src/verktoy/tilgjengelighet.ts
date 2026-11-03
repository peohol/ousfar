/**
 * Hva et verktøy kan gi for valgene som er gjort (P6.8 i
 * `docs/verktøy-utviklingsplan.md`): en beregnet doseplan, bare publisert
 * OUSFAR-fagtekst, eller ingenting fordi regelen er kontrollert og ikke
 * godkjent, faglig kontroll gjenstår eller kombinasjonen ikke er støttet.
 * Statusen følger reglene slik de faktisk står i regelsettet, med
 * godkjenningen kontrollert mot regelversjon og fingeravtrykk
 * (`godkjenningsfeil`), aldri etter et flagg i appen.
 */
import { dekningFor, dekningstekst } from './dekning'
import { KILDEFORMULERINGER, type Kildeformulering, type Virkestoffkartlegging } from './kartlegging'
import { KARTLEGGING, VERKTOY, virkestoffvalg, type Verktoy } from './register'
import { godkjenningsfeil, harBeregning, kontrollutfall } from './regler/godkjenning'
import { REGELMODELLVERSJON, type Administrasjon, type Forlop, type Regel, type Regelsett, type Virkestoffvalg } from './regler/modell'
import { DOMENESETT } from './regler/domenesett'
import { NEDTRAPPINGSSETT } from './regler/nedtrapping'
import { PILOTSETT } from './regler/pilotsett'

/** Regelsettene appen bruker: pilotsettet (P4), nedtrappingsreglene (P7, K1) og leveransenes sett (K2–K4, `domenesett.ts`). Hver regel hører til ett av dem. */
export const REGELSETTENE: readonly Regelsett[] = [PILOTSETT, NEDTRAPPINGSSETT, ...DOMENESETT.map((d) => d.sett)]

/** Reglene i settene, samlet så verktøyene kan slå opp i dem. */
export const samlet = (settene: readonly Regelsett[]): Regelsett => ({
  id: 'ousfar-verktoy',
  versjon: 1,
  modell: REGELMODELLVERSJON,
  beskrivelse: `Reglene i ${settene.map((s) => s.id).join(' og ')}.`,
  regler: settene.flatMap((s) => s.regler),
})

/** Alle reglene appen bruker, samlet så verktøyene kan slå opp i dem. */
export const REGELSETT: Regelsett = samlet(REGELSETTENE)

/** Settet regelen hører til, så planen oppgir det settets id og versjon; ellers `regelsett`. */
export const settFor = (r: Regel, regelsett: Regelsett = REGELSETT): Regelsett => REGELSETTENE.find((s) => s.regler.includes(r)) ?? regelsett

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

export type Regelstatus = 'tilgjengelig' | 'fagtekst' | 'ikke_godkjent' | 'til_kontroll' | 'ikke_stottet'

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

/**
 * Om regelen er av verktøyets slag: en ren seponering, et bytte eller et
 * tillegg (regelmodell 12). Et bytteverktøy får aldri et tillegg, og omvendt.
 */
export function avSlaget(verktoy: Pick<Verktoy, 'type'>, r: Pick<Regel, 'til'> & { plan: Pick<Regel['plan'], 'form'> }): boolean {
  if (verktoy.type === 'seponering') return r.til === null && r.plan.form === 'seponering'
  return r.til !== null && (r.plan.form === 'tillegg') === (verktoy.type === 'tillegg')
}

/** Reglene i settet som gjelder valgene i verktøyet: samme slag, retning, virkestoffer og administrasjonsform. */
export function reglerFor(verktoy: Verktoy, valg: Verktoyvalg, regelsett: Regelsett = REGELSETT, k: Virkestoffkartlegging = KARTLEGGING): Regel[] {
  return regelsett.regler.filter((r) => {
    if (!avSlaget(verktoy, r) || (verktoy.type !== 'seponering' && !valg.til)) return false
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

/** Om regelen er uten gyldig godkjenning, med en anbefaling som er eller kan bli kontrollert. */
const utenGodkjenning = (r: Regel) => godkjenningsfeil(r).length > 0 && r.beregnbarhet !== 'mangler_anbefaling'

/** Hvorfor reglene uten godkjenning ikke kan beregnes, etter utfallet av kontrollen. */
const UTEN_GODKJENNING: Record<'ikke_godkjent' | 'bare_fagtekst' | 'til_kontroll', string> = {
  ikke_godkjent: 'Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning.',
  bare_fagtekst: 'Beregning er ikke tilgjengelig: regelen er bare fagtekst, fordi det ikke finnes en dokumentert måte å gi trinnene med dagens norske preparater. Fagteksten er ikke klinisk godkjent.',
  til_kontroll: 'Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår.',
}

/** Hvorfor en godkjent regel likevel ikke kan beregnes for valgene; tom når den kan. */
function beregningsfeil(r: Regel, valg: Verktoyvalg): string[] {
  if (!harBeregning(r)) return [`Regelen «${r.tittel}» har ingen beregning.`]
  const medlem = medlemFor(r, valg)
  if (medlem === undefined) return []
  const m = r.medlemmer?.find((x) => x.nokkel === medlem)
  return m && m.validering !== 'ikke_vurdert' ? [] : [`Regelen «${r.tittel}» er ikke vurdert for dette virkestoffet.`]
}

/**
 * Hva verktøyet kan gi for valgene: en beregning når en gjeldende klinisk
 * godkjent regel kan beregnes, ellers fagtekst fra en godkjent regel uten
 * beregning, ellers at reglene er kontrollert og ikke godkjent, eller at
 * faglig kontroll gjenstår når én av dem ikke er kontrollert ennå, og ellers
 * at kombinasjonen ikke er støttet.
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
  const uten = regler.filter(utenGodkjenning)
  if (uten.length > 0) {
    const utfall = [...new Set(uten.map(kontrollutfall))].filter((u) => u !== 'godkjent')
    return { status: utfall.includes('til_kontroll') ? 'til_kontroll' : 'ikke_godkjent', regler: uten, grunner: utfall.map((u) => UTEN_GODKJENNING[u]) }
  }
  const grunner = godkjente.flatMap((r) => beregningsfeil(r, valg))
  if (grunner.length > 0) return { status: 'ikke_stottet', regler: [], grunner }
  const dekning = valg.til ? undefined : dekningFor(verktoy, valg.fra.nokkel)
  return { status: 'ikke_stottet', regler: [], grunner: [dekning ? dekningstekst(dekning) : 'OUSFAR har ingen regel for denne kombinasjonen.'] }
}

/** Om regelen hører til verktøyet: samme slag (seponering, bytte eller tillegg) og bare virkestoffer verktøyet tilbyr. */
export function iVerktoyet(verktoy: Verktoy, k: Virkestoffkartlegging = KARTLEGGING): (r: Pick<Regel, 'fra' | 'til' | 'plan'>) => boolean {
  const nokler = new Set(virkestoffvalg(verktoy, k).map((v) => v.nokkel))
  const tilbys = (v: Virkestoffvalg) =>
    v.type === 'virkestoff' ? nokler.has(v.nokkel) : (k.grupper.find((g) => g.id === v.gruppe)?.medlemmer.some((m) => nokler.has(m.virkestoff)) ?? false)
  return (r) => avSlaget(verktoy, r) && tilbys(r.fra) && (!r.til || tilbys(r.til))
}

/** Verktøyene regelen hører til (en sperre for et av dem sperrer også regelen). */
export const verktoyeneFor = (r: Pick<Regel, 'fra' | 'til' | 'plan'>, verktoyene: readonly Verktoy[] = VERKTOY, k: Virkestoffkartlegging = KARTLEGGING): string[] =>
  verktoyene.filter((v) => iVerktoyet(v, k)(r)).map((v) => v.id)

/**
 * Hvor mange regler for verktøyets virkestoffer som kan beregnes nå, hvor
 * mange som er kontrollert og ikke godkjent (også bare fagtekst), og hvor
 * mange som venter på faglig kontroll, med de samme kravene som
 * {@link tilgjengelighet}: en godkjent regel uten beregning telles ikke som
 * tilgjengelig.
 */
export function regeloversikt(
  verktoy: Verktoy,
  regelsett: Regelsett = REGELSETT,
  k: Virkestoffkartlegging = KARTLEGGING,
): { tilgjengelige: number; ikkeGodkjent: number; tilKontroll: number } {
  const egne = regelsett.regler.filter(iVerktoyet(verktoy, k))
  return {
    tilgjengelige: egne.filter((r) => godkjenningsfeil(r).length === 0 && harBeregning(r)).length,
    ikkeGodkjent: egne.filter((r) => utenGodkjenning(r) && kontrollutfall(r) !== 'til_kontroll').length,
    tilKontroll: egne.filter((r) => utenGodkjenning(r) && kontrollutfall(r) === 'til_kontroll').length,
  }
}
