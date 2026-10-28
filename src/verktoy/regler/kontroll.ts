/**
 * Kontrollene av et regelsett (P4 i `docs/verktøy-utviklingsplan.md`): at
 * reglene henger sammen med P1-kartleggingen og P3-kildegrunnlaget, at hver
 * verdi har et grunnlag, at Psychiatrienet bare er en referanse uten
 * innhold og viser til en kildeoppføring med samme retning, virkestoffer og
 * formulering som regelen, at verdiene er gyldige, at beregnbarheten og
 * godkjenningen stemmer med innholdet og regelversjonen, og at regneeksemplene
 * gir det som er regnet ut for hånd. Testene krever at
 * listen er tom; et nytt regelsett må bestå de samme kontrollene.
 */
import arkivfil from '../../data/verktoy/psychiatrienet-kildearkiv.json'
import kartleggingsfil from '../../data/verktoy/virkestoffkartlegging.json'
import type { Formuleringsklasse } from '../festformuleringer'
import type { Kildearkiv } from '../kildearkiv'
import { kildegrunnlag, type Kildeanbefaling, type Kildepart } from '../kildeanbefalinger'
import { erSperret, KILDEFORMULERINGER, type Virkestoffkartlegging } from '../kartlegging'
import { beregn, kortform } from './beregning'
import { godkjenningsfeil } from './godkjenning'
import { kildeFor } from './kilder'
import {
  alleGrunnlag,
  henvisninger,
  parameterfeil,
  parametre,
  REGELMODELLVERSJON,
  tallfeil,
  type Administrasjon,
  type Regel,
  type Regelsett,
  type Virkestoffvalg,
} from './modell'

/** Det reglene kontrolleres mot: P1-kartleggingen og P3-kildeoppføringene etter id. */
export interface Kontrollgrunnlag {
  kartlegging: Virkestoffkartlegging
  kildeoppforinger: Map<string, Kildeanbefaling>
}

export function lesKontrollgrunnlag(): Kontrollgrunnlag {
  const kartlegging = kartleggingsfil as Virkestoffkartlegging
  const g = kildegrunnlag(arkivfil as Kildearkiv, kartlegging)
  return { kartlegging, kildeoppforinger: new Map(g.anbefalinger.map((a) => [a.id, a])) }
}

/** Formuleringsklassene i P1 som hver administrasjonsform i regelmodellen svarer til. */
const KLASSER: Record<Administrasjon, readonly Formuleringsklasse[]> = {
  peroral: ['peroral', 'peroral_modifisert'],
  depotinjeksjon: ['depotinjeksjon'],
}

/** Hvorfor kildeoppføringens side (`fra` eller `til`) ikke gjelder det regelen gjelder; `null` når den gjør det. */
function avvikendePart(part: Kildepart, v: Virkestoffvalg, administrasjon: Administrasjon | undefined): string | null {
  const stoff = v.type === 'virkestoff' ? part.virkestoffer.includes(v.nokkel) : part.gruppe === v.gruppe
  if (!stoff) return `gjelder ${part.gruppe ? `gruppen ${part.gruppe}` : part.virkestoffer.join(', ')}, ikke ${v.type === 'virkestoff' ? v.nokkel : `gruppen ${v.gruppe}`}`
  const klasser: readonly Formuleringsklasse[] = part.formulering ? KILDEFORMULERINGER[part.formulering].klasser : []
  if (administrasjon && part.formulering && !klasser.some((k) => KLASSER[administrasjon].includes(k))) {
    return `gjelder formuleringen ${part.formulering} (${klasser.join('/')}), ikke ${administrasjon}`
  }
  return null
}

/** At P3-oppføringen er samme slags anbefaling, i samme retning, for samme virkestoffer og formuleringer som regelen. */
function referansefeil(r: Regel, a: Kildeanbefaling): string[] {
  const feil: string[] = []
  if (a.type === 'tillegg') feil.push('er en anbefaling om tillegg, ikke om bytte eller seponering')
  else if ((a.type === 'seponering') !== (r.til === null)) feil.push(`er en anbefaling om ${a.type}, men regelen ${r.til ? 'bytter' : 'seponerer'}`)
  const fraForlop = r.plan.forlop[0]
  const tilForlop = r.til ? r.plan.forlop.slice(1).find((x) => like(x.virkestoff, r.til)) : undefined
  const fra = avvikendePart(a.fra, r.fra, fraForlop?.administrasjon)
  if (fra) feil.push(`fra-siden ${fra}`)
  if (r.til && a.til) {
    const til = avvikendePart(a.til, r.til, tilForlop?.administrasjon)
    if (til) feil.push(`til-siden ${til}`)
  }
  return feil
}

/** Lengste tillatte gjengivelse av et faktum: en kort setning med egne ord, aldri et avsnitt. */
export const MAKS_FAKTUM = 250

const like = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

function kontrollerRegel(r: Regel, g: Kontrollgrunnlag): string[] {
  const feil: string[] = []
  const f = (t: string) => feil.push(`${r.id}: ${t}`)
  const k = g.kartlegging

  // Virkestoffer og grupper finnes i P1, og ingen del av regelen gjelder johannesurt.
  const nokler = new Set(k.virkestoffer.map((v) => v.nokkel))
  const valg = (v: Virkestoffvalg | null, hvor: string) => {
    if (!v) return
    if (v.type === 'virkestoff' && !nokler.has(v.nokkel)) f(`${hvor}: ${v.nokkel} er ikke et virkestoff i P1-kartleggingen`)
    if (v.type === 'gruppe' && !k.grupper.some((x) => x.id === v.gruppe)) f(`${hvor}: ${v.gruppe} er ikke en gruppe i P1-kartleggingen`)
  }
  valg(r.fra, 'fra')
  valg(r.til, 'til')
  for (const x of r.plan.forlop) valg(x.virkestoff, `forløp ${x.id}`)
  if (erSperret(k, JSON.stringify(r))) f('omtaler et ekskludert virkestoff (johannesurt)')

  // Planen: fra og til stemmer med forløpene, forløp viser bare til tidligere forløp.
  if (r.beregnbarhet === 'entydig_beregnbar' || r.beregnbarhet === 'beregnbar_etter_avklaring') {
    if (r.plan.forlop.length === 0) f('regelen er beregnbar, men har ingen plan')
    if (!like(r.plan.forlop[0]?.virkestoff, r.fra)) f('første forløp er ikke regelens fra-virkestoff')
    if (r.til && !r.plan.forlop.slice(1).some((x) => like(x.virkestoff, r.til))) f('ingen forløp har regelens til-virkestoff')
  }
  const ids = r.plan.forlop.map((x) => x.id)
  if (new Set(ids).size !== ids.length) f('to forløp har samme id')
  r.plan.forlop.forEach((x, i) => {
    const tidligere = ids.slice(0, i)
    const viser = [x.start.type === 'etter_utvasking' ? x.start.forlop : null, ...x.faser.map((y) => (y.type === 'hold' && y.varighet.type === 'til_forlop_er_avsluttet' ? y.varighet.forlop : null))]
    for (const v of viser) if (v && !tidligere.includes(v)) f(`forløp ${x.id} viser til ${v}, som ikke kommer før`)
    const forste = x.faser[0]
    const trengerDose = forste && (forste.type === 'nedtrapping' || (forste.type === 'hold' && forste.dose.type === 'aktuell'))
    if (trengerDose && x.utgangsdose !== 'startdose') f(`forløp ${x.id} trapper ned eller holder en dose uten utgangsdose`)
    // Avgrensningene P5 regner med: formuleringene passer administrasjonen, og varenavnene er oppgitt.
    for (const k of x.klasser ?? []) if (!KLASSER[x.administrasjon].includes(k)) f(`forløp ${x.id} gjelder formuleringen ${k}, som ikke er ${x.administrasjon}`)
    if (x.klasser?.length === 0) f(`forløp ${x.id} har en tom liste med formuleringer`)
    if (x.preparater && (x.preparater.length === 0 || x.preparater.some((v) => !v.trim()))) f(`forløp ${x.id} har en tom liste eller et tomt varenavn`)
  })

  // Inndata: en måldose i planen krever et eksplisitt krav, og ingen skjult standard.
  const bruker = (navn: string) => JSON.stringify(r.plan).includes(`"navn":"${navn}"`)
  if (bruker('maldose') && !r.inndata.some((x) => x.navn === 'maldose')) f('planen bruker måldosen uten et inndatakrav for den')
  for (const x of r.inndata) {
    if (!x.omrade && !x.verdier) f(`inndatakravet for ${x.navn} har verken område eller verdier`)
    if (x.gjelder_medlem && !r.medlemmer?.some((m) => m.nokkel === x.gjelder_medlem)) f(`inndatakravet gjelder ${x.gjelder_medlem}, som ikke er medlem`)
  }

  // Grupper: medlemmene er nøyaktig P1-gruppens, og hvert har en begrunnelse.
  const gruppe = r.plan.forlop.find((x) => x.virkestoff.type === 'gruppe')?.virkestoff
  if (gruppe?.type === 'gruppe') {
    const p1 = k.grupper.find((x) => x.id === gruppe.gruppe)?.medlemmer.map((m) => m.virkestoff).sort() ?? []
    const her = (r.medlemmer ?? []).map((m) => m.nokkel).sort()
    if (!like(p1, her)) f(`medlemmene (${her.join(', ')}) er ikke de samme som i P1-gruppen ${gruppe.gruppe} (${p1.join(', ')})`)
    for (const m of r.medlemmer ?? []) if (!m.begrunnelse.trim()) f(`medlemmet ${m.nokkel} mangler begrunnelse`)
  } else if (r.medlemmer) f('regelen har medlemmer, men ingen gruppe')

  // Kilder: hver henvisning finnes; Psychiatrienet bare som referanse, uten innhold.
  for (const hv of henvisninger(r)) {
    const kilde = kildeFor(hv.kilde)
    if (!kilde) f(`ukjent kilde ${hv.kilde}`)
    if (hv.kilde === 'psychiatrienet') {
      const oppforing = 'kildeoppforing' in hv ? g.kildeoppforinger.get(hv.kildeoppforing) : undefined
      if (!oppforing) f(`Psychiatrienet-henvisningen ${'kildeoppforing' in hv ? hv.kildeoppforing : '?'} er ikke en kildeoppføring i P3`)
      else for (const x of referansefeil(r, oppforing)) f(`Psychiatrienet-oppføringen ${oppforing.id} passer ikke regelen: den ${x}`)
      if ('faktum' in hv || 'sted' in hv) f('en Psychiatrienet-henvisning har innhold; den skal bare ha kildeoppføringen')
    } else if (!('sted' in hv) || !hv.faktum.trim() || !hv.sted.trim()) f(`henvisningen til ${hv.kilde} mangler sted eller faktum`)
    else if (hv.faktum.length > MAKS_FAKTUM) f(`faktumet fra ${hv.kilde} er lengre enn ${MAKS_FAKTUM} tegn`)
    if (kilde?.type === 'kildeoppføring' && hv.kilde !== 'psychiatrienet') f(`${hv.kilde} er en kildeoppføring og kan ikke gi fakta`)
  }
  const utenReferanser = { ...r, referanser: [] }
  if (henvisninger(utenReferanser).some((hv) => hv.kilde === 'psychiatrienet')) f('regelen bygger på Psychiatrienet; den kan bare stå som referanse')

  // Fortolkningen: kildetro utsagn har kilder, og forutsetninger og usikkerhet er skrevet ut.
  for (const u of r.fortolkning.kildetro) if (u.henvisninger.length === 0) f(`det kildetro utsagnet «${u.tekst.slice(0, 40)}…» har ingen kilde`)
  if (r.fortolkning.forutsetninger.length === 0) f('fortolkningen har ingen forutsetninger')
  if (r.fortolkning.usikkerhet.length === 0) f('fortolkningen har ingen usikkerhet')

  // Hver verdi har et grunnlag og riktig enhet, og beregnbarheten stemmer med opprinnelsen.
  // Beregnbarheten beskriver kildene: en regel med OUSFAR-vurderinger er aldri entydig, heller ikke når vurderingene er avklart.
  const grunnlag = alleGrunnlag(r)
  const utviklere = new Set(r.godkjenning.historikk.filter((s) => s.rolle === 'utvikler').map((s) => s.av))
  for (const [sti, gr] of grunnlag) {
    if (gr.type === 'kilde' && gr.henvisninger.length === 0) f(`${sti} har kilde som grunnlag, men ingen henvisning`)
    if (gr.type !== 'ousfar_vurdering') continue
    if (!gr.begrunnelse.trim()) f(`${sti} er en OUSFAR-vurdering uten begrunnelse`)
    const a = gr.avklaring
    if (a && (!a.av.trim() || !a.merknad.trim() || !/^\d{4}-\d\d-\d\d$/.test(a.dato))) f(`avklaringen av ${sti} mangler dato, navn eller merknad`)
    if (a && ((a.rolle as string) === 'utvikler' || utviklere.has(a.av))) f(`${sti} er avklart av en utvikler av regelen; avklaringen må være uavhengig`)
    if (a && (!Number.isInteger(a.regelversjon) || a.regelversjon < 1 || a.regelversjon > r.versjon)) f(`avklaringen av ${sti} gjelder en ukjent regelversjon (${a.regelversjon})`)
  }
  for (const [sti, p] of parametre(r)) {
    const ugyldig = parameterfeil(p, sti)
    if (ugyldig) f(`${sti} er ugyldig: ${ugyldig}`)
    else if (p.verdi !== null && p.omrade && (p.verdi < p.omrade[0] || p.verdi > p.omrade[1])) f(`${sti} er utenfor sitt eget område`)
    if (p.justerbar !== undefined && (!p.justerbar.trim() || !p.omrade || p.omrade[0] === p.omrade[1])) f(`${sti} er justerbar uten tekst eller uten et område å velge i`)
  }
  for (const x of tallfeil(r)) f(x)
  const vurderinger = grunnlag.filter(([, gr]) => gr.type === 'ousfar_vurdering').map(([sti]) => sti)
  const mangler = parametre(r).filter(([, p]) => p.verdi === null).map(([sti]) => sti)
  const foreslatt = (r.medlemmer ?? []).filter((m) => m.validering === 'foreslatt').map((m) => m.nokkel)
  if (r.beregnbarhet === 'entydig_beregnbar' && (vurderinger.length > 0 || mangler.length > 0 || foreslatt.length > 0)) {
    f(`er merket entydig beregnbar, men har OUSFAR-vurderinger, manglende verdier eller foreslåtte medlemmer: ${[...vurderinger, ...mangler, ...foreslatt].join(', ')}`)
  }
  if (r.beregnbarhet === 'beregnbar_etter_avklaring' && vurderinger.length + mangler.length + foreslatt.length === 0) {
    f('er merket beregnbar etter avklaring, men har ingen OUSFAR-vurderinger, manglende verdier eller foreslåtte medlemmer; den er entydig beregnbar')
  }

  // Godkjenningen: status følger historikken, siste steg gjelder denne regelversjonen, og en klinisk
  // godkjenning gjelder nøyaktig dette innholdet og kommer fra en uavhengig kontrollør.
  const sist = r.godkjenning.historikk.at(-1)
  if (!sist || sist.status !== r.godkjenning.status) f('godkjenningsstatusen er ikke siste steg i historikken')
  if (sist && sist.regelversjon !== r.versjon) f(`siste godkjenningssteg gjelder regelversjon ${sist.regelversjon}, ikke versjon ${r.versjon}; en endret regel må sendes til kontroll på nytt`)
  for (const s of r.godkjenning.historikk) if (!Number.isInteger(s.regelversjon) || s.regelversjon < 1 || s.regelversjon > r.versjon) f(`et godkjenningssteg gjelder en ukjent regelversjon (${s.regelversjon})`)
  if (r.godkjenning.status === 'klinisk_godkjent') for (const x of godkjenningsfeil(r)) f(`er merket klinisk godkjent, men godkjenningen er ikke gyldig: ${x}`)

  // Regneeksemplene: et beregnbart eksempel gir nøyaktig det forventede, et stopp-eksempel stopper av riktig grunn.
  if (r.beregnbarhet !== 'bare_tekstlig' && r.beregnbarhet !== 'mangler_anbefaling' && !r.eksempler.some((e) => !e.stopp)) f('har ingen regneeksempler med beregnet plan')
  const eks = r.eksempler.map((e) => e.id)
  if (new Set(eks).size !== eks.length) f('to regneeksempler har samme id')
  for (const e of r.eksempler) {
    const res = beregn(r, e.inndata)
    if (e.stopp) {
      if (Object.keys(e.forventet).length > 0) f(`eksempel ${e.id} skal stoppe, men har forventet plan`)
      if (res.status !== 'stoppet' || !res.stoppgrunner.some((x) => e.stopp!.test(x))) f(`eksempel ${e.id} stopper ikke som forventet: ${JSON.stringify(kortform(res))}`)
    } else if (!like(kortform(res), e.forventet)) {
      f(`eksempel ${e.id} gir ${JSON.stringify(kortform(res))}, forventet ${JSON.stringify(e.forventet)}`)
    }
  }
  return feil
}

/** Alt som er galt med regelsettet; tom når det er i orden. */
export function kontrollerRegelsett(s: Regelsett, g: Kontrollgrunnlag = lesKontrollgrunnlag()): string[] {
  const feil: string[] = []
  if (s.modell !== REGELMODELLVERSJON) feil.push(`${s.id}: laget for regelmodell ${s.modell}, gjeldende er ${REGELMODELLVERSJON}`)
  const ids = s.regler.map((r) => r.id)
  for (const id of new Set(ids)) if (ids.filter((x) => x === id).length > 1) feil.push(`${s.id}: regelen ${id} finnes flere ganger`)
  for (const r of s.regler) feil.push(...kontrollerRegel(r, g))
  return feil
}
