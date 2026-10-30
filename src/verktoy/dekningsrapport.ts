/**
 * Kilde- og dekningsmatrisen for «Trappe ned antidepressiv»
 * (`docs/verktøy-p7-dekning.md`, P7.1), laget av dekningen, regelsettet,
 * P3-kildeoppføringene og FEST-uttrekket så den aldri kan avvike fra dem.
 * `npm run verktoy:regler -- rapport` skriver den; testene sier fra når den
 * ikke er oppdatert. Psychiatrienet vises bare som kildeoppføringens id.
 */
import { DEKNINGSSTATUS, dekningstekst, NEDTRAPPINGSDEKNING, type Dekning } from './dekning'
import type { Festpreparat } from './festformuleringer'
import { lesKartdata } from './kartdata'
import { MARKEDSGRUNNLAG, markedsgrunnlag, preparaterFor, type Kartdata } from './kartlegging'
import { lesKontrollgrunnlag, type Kontrollgrunnlag } from './regler/kontroll'
import { henvisninger, type Regel, type Regelsett } from './regler/modell'
import { PLANHORISONT_TRINN } from './regler/bygg'
import { BEREGNBARHET, dato, liste, statustekst, tabell, tall } from './regler/rapport'
import { REGELSETT } from './tilgjengelighet'

export const DEKNINGSRAPPORTFIL = 'docs/verktøy-p7-dekning.md'

const TABELL = 'SwitchAntidepressants'

/** Stop-oppføringen i P3 for raden. */
export const stopOppforing = (kode: string) => `${TABELL}:${kode}>Stop`

/** Seponeringsreglene i settet for virkestoffet. */
export const seponeringsregler = (nokkel: string, sett: Regelsett = REGELSETT): Regel[] =>
  sett.regler.filter((r) => r.til === null && r.plan.form === 'seponering' && r.fra.type === 'virkestoff' && r.fra.nokkel === nokkel)

/**
 * Laveste styrke (mg) blant enkeltpreparatene med markedsføringstillatelse som
 * er markedsført i Norge og har styrken i mg per enhet (tabletter og kapsler,
 * ikke flytende former); `null` når det ikke finnes noen.
 */
export function lavesteStyrke(preparater: readonly Festpreparat[]): number | null {
  const styrker = preparater
    .filter((p) => p.kombinert_med.length === 0 && p.marked === 'markedsfort' && p.preparattype === 'Legemiddel' && (p.klasse === 'peroral' || p.klasse === 'peroral_modifisert'))
    .flatMap((p) => {
      const m = /(\d+(?:,\d+)?) mg$/.exec(p.navn_form_styrke)
      return m ? [Number(m[1]!.replace(',', '.'))] : []
    })
  return styrker.length > 0 ? Math.min(...styrker) : null
}

/** Den praktiske grensen i regelen (mg): laveste dose formuleringen kan gi, ikke en klinisk grense eller et sluttpunkt. */
const praktiskGrenseI = (r: Regel): number | null => r.plan.forlop.find((f) => f.dosevalg?.min_mg)?.dosevalg?.min_mg?.verdi ?? null

const TILGJENGELIGHET = { hentet: 'hentet', alternativ_adresse: 'hentet fra annen adresse', utilgjengelig: '**utilgjengelig**' } as const

function rad(d: Dekning, kart: Kartdata, g: Kontrollgrunnlag): string[] {
  const navn = kart.kartlegging.virkestoffer.find((v) => v.nokkel === d.nokkel)?.navn ?? d.nokkel
  const stop = g.kildeoppforinger.get(stopOppforing(d.kode))
  const preparater = preparaterFor(kart, d.nokkel)
  const laveste = lavesteStyrke(preparater)
  const regler = seponeringsregler(d.nokkel)
  const grenser = [...new Set(regler.flatMap((r) => praktiskGrenseI(r) ?? []))]
  const kilder = [...new Set(regler.flatMap((r) => henvisninger(r).map((h) => h.kilde)))].filter((k) => k !== 'psychiatrienet')
  return [
    navn,
    stop ? `\`${d.kode}>Stop\` (${TILGJENGELIGHET[stop.tilgjengelighet]})` : '**mangler**',
    MARKEDSGRUNNLAG[markedsgrunnlag(preparater)],
    laveste === null ? '–' : `${tall(laveste)} mg`,
    grenser.map((x) => `${tall(x)} mg`).join(', ') || '–',
    `**${DEKNINGSSTATUS[d.status]}**`,
    regler.map((r) => `\`${r.id}\` (${BEREGNBARHET[r.beregnbarhet]}, ${statustekst(r)})`).join('; ') || '–',
    kilder.join(', ') || '–',
    dekningstekst(d) || '–',
  ]
}

export function lagDekningsrapport(kart: Kartdata = lesKartdata(), g: Kontrollgrunnlag = lesKontrollgrunnlag()): string {
  const antall = (s: Dekning['status']) => NEDTRAPPINGSDEKNING.filter((d) => d.status === s).length
  const telling = (Object.keys(DEKNINGSSTATUS) as Dekning['status'][]).map((s) => `${DEKNINGSSTATUS[s]}: ${antall(s)}`)
  const fest = kart.fest.fest_hentet ? dato(kart.fest.fest_hentet.slice(0, 10)) : 'ukjent'
  return `# OUSFAR Verktøy – P7: kilde- og dekningsmatrise for «Trappe ned antidepressiv»

<!-- Laget av \`npm run verktoy:regler -- rapport\` fra src/verktoy/dekning.ts, regelsettet, P3-kildearkivet og FEST-uttrekket. Ikke rediger for hånd. -->

Én rad per antidepressivum i kildetabellen (${NEDTRAPPINGSDEKNING.length} virkestoffer; johannesurt er utelatt). Statusen skiller kildens Stop-oppføring fra OUSFARs egen regel: at kilden har en Stop-oppføring, gir aldri i seg selv en regel, og ingen regel bygger på teksten der. **Ingen regel er klinisk godkjent**, så verktøyet viser ingen doseplan før uavhengig faglig kontroll (P7.5). Valgene og de åpne faglige spørsmålene står i \`docs/verktøy-p7-nedtrapping.md\`, reglene i \`docs/verktøy-p7-regelutkast.md\`, og den hyperbolske citalopramregelen, som bare er til sammenligning og ikke i verktøyet, i \`docs/verktøy-p7-sammenligning.md\`.

${liste(telling)}

Norske preparater og laveste styrke er lest fra FEST-uttrekket ${fest} (\`src/data/verktoy/fest-formuleringer.json\`): laveste styrke blant tabletter og kapsler med markedsføringstillatelse som er markedsført. Ingen regel har en fast klinisk nedre grense (fagkontrollen 30.10.2026): planen viser høyst ${PLANHORISONT_TRINN} reduksjoner, en teknisk planhorisont, går aldri til null, og avslutningen vurderes individuelt. Den praktiske grensen er laveste dose formuleringen kan gi når den begrenser trinnene (depotkapsler som skal svelges hele), ikke en klinisk grense. Hvilke trinn som ellers kan gis med preparatene, avgjøres når doseplanen beregnes, og planen stopper ved første trinn som ikke kan gis.

${tabell(
  ['Virkestoff', 'Stop-oppføring (P3)', 'Norske preparater', 'Laveste styrke (FEST)', 'Praktisk grense i regelen', 'Status', 'Regel', 'Kildegrunnlag for regelen', 'Forklaring'],
  NEDTRAPPINGSDEKNING.map((d) => rad(d, kart, g)),
)}
`
}
