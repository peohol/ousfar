/**
 * Kontrollene av et regelsett (P4 i `docs/verktøy-utviklingsplan.md`): at
 * reglene henger sammen med P1-kartleggingen og P3-kildegrunnlaget, at hver
 * verdi har et grunnlag, at Psychiatrienet bare er en referanse uten
 * innhold, at beregnbarheten og godkjenningen stemmer med innholdet, og at
 * regneeksemplene gir det som er regnet ut for hånd. Testene krever at
 * listen er tom; et nytt regelsett må bestå de samme kontrollene.
 */
import arkivfil from '../../data/verktoy/psychiatrienet-kildearkiv.json'
import kartleggingsfil from '../../data/verktoy/virkestoffkartlegging.json'
import type { Kildearkiv } from '../kildearkiv'
import { kildegrunnlag } from '../kildeanbefalinger'
import { erSperret, type Virkestoffkartlegging } from '../kartlegging'
import { beregn, kortform } from './beregning'
import { kildeFor } from './kilder'
import { henvisninger, parametre, REGELMODELLVERSJON, type Grunnlag, type Regel, type Regelsett, type Virkestoffvalg } from './modell'

/** Det reglene kontrolleres mot: P1-kartleggingen og id-ene til P3-kildeoppføringene. */
export interface Kontrollgrunnlag {
  kartlegging: Virkestoffkartlegging
  kildeoppforinger: Set<string>
}

export function lesKontrollgrunnlag(): Kontrollgrunnlag {
  const kartlegging = kartleggingsfil as Virkestoffkartlegging
  const g = kildegrunnlag(arkivfil as Kildearkiv, kartlegging)
  return { kartlegging, kildeoppforinger: new Set(g.anbefalinger.map((a) => a.id)) }
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
      if (!('kildeoppforing' in hv) || !g.kildeoppforinger.has(hv.kildeoppforing)) f(`Psychiatrienet-henvisningen ${'kildeoppforing' in hv ? hv.kildeoppforing : '?'} er ikke en kildeoppføring i P3`)
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

  // Hver verdi har et grunnlag, og beregnbarheten stemmer med det.
  const grunnlag: [string, Grunnlag][] = [
    ...parametre(r).map(([sti, p]) => [sti, p.grunnlag] as [string, Grunnlag]),
    ...r.inndata.map((x) => [`inndata.${x.navn}`, x.grunnlag] as [string, Grunnlag]),
    ...[...r.bekreftelser, ...r.unntak].map((x) => [x.id, x.grunnlag] as [string, Grunnlag]),
  ]
  for (const [sti, gr] of grunnlag) {
    if (gr.type === 'kilde' && gr.henvisninger.length === 0) f(`${sti} har kilde som grunnlag, men ingen henvisning`)
    if (gr.type === 'ousfar_forslag' && !gr.begrunnelse.trim()) f(`${sti} er et forslag uten begrunnelse`)
  }
  for (const [sti, p] of parametre(r)) {
    if (p.verdi !== null && p.omrade && (p.verdi < p.omrade[0] || p.verdi > p.omrade[1])) f(`${sti} er utenfor sitt eget område`)
  }
  const forslag = grunnlag.filter(([, gr]) => gr.type === 'ousfar_forslag').map(([sti]) => sti)
  const mangler = parametre(r).filter(([, p]) => p.verdi === null).map(([sti]) => sti)
  if (r.beregnbarhet === 'entydig_beregnbar' && (forslag.length > 0 || mangler.length > 0)) {
    f(`er merket entydig beregnbar, men har forslag eller manglende verdier som må avklares: ${[...forslag, ...mangler].join(', ')}`)
  }

  // Godkjenningen: status følger historikken, og klinisk godkjenning krever uavhengig kontroll.
  const sist = r.godkjenning.historikk.at(-1)
  if (!sist || sist.status !== r.godkjenning.status) f('godkjenningsstatusen er ikke siste steg i historikken')
  if (r.godkjenning.status === 'klinisk_godkjent') {
    const utviklere = new Set(r.godkjenning.historikk.filter((s) => s.rolle === 'utvikler').map((s) => s.av))
    const kontroll = r.godkjenning.historikk.some((s) => s.rolle === 'uavhengig_kontrollor' && s.status === 'klinisk_godkjent' && !utviklere.has(s.av))
    if (!kontroll) f('er klinisk godkjent uten et godkjenningssteg fra en uavhengig kontrollør')
    if (r.beregnbarhet === 'beregnbar_etter_avklaring') f('er klinisk godkjent, men har fortsatt valg som må avklares')
  }

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
