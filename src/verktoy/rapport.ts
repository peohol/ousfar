/**
 * Rapporten om kartleggingen (`docs/verktøy-p1-kartlegging.md`), laget av
 * kartleggingen og øyeblikksbildene så tallene aldri kan avvike fra dataene.
 * `npm run verktoy:kartlegging -- rapport` skriver den; testene sier fra når
 * den ikke er oppdatert.
 */
import { navnenokkel } from '../domain/sokenavn'
import { FORMULERINGSKLASSER, type Festpreparat, type Formuleringsklasse } from './festformuleringer'
import { KILDETABELLER, PSYCHIATRIENET, type Tabell_id } from './kildetabeller'
import {
  KILDEFORMULERINGER,
  MARKEDSGRUNNLAG,
  importmal,
  preparaterFor,
  tabelldekning,
  virkestoffstatus,
  type Kartdata,
  type Kildeidentitet,
  type Markedsgrunnlag,
} from './kartlegging'
import { VERKTOY_KATEGORIER } from './fagsider'

export const RAPPORTFIL = 'docs/verktøy-p1-kartlegging.md'

const TABELLNAVN = Object.fromEntries(KILDETABELLER.map((t) => [t.id, t.tittel])) as Record<Tabell_id, string>
const KORT: Record<Tabell_id, string> = {
  CombiningMoodstabilizers: 'MS',
  SwitchAntidepressants: 'AD',
  SwitchAntipsychotics: 'AP',
}

const MARKEDSAVVIK: Record<Exclude<Markedsgrunnlag, 'markedsfort'>, string> = {
  kun_godkjenningsfritak: 'bare preparater med godkjenningsfritak i FEST, ingen med norsk markedsføringstillatelse.',
  ingen_markedsforte: 'preparater i FEST, men ingen er markedsført.',
  ingen_preparater: 'ingen preparater i FEST. Kan likevel ha anbefalinger i kilden (P2.5).',
}

const dato = (iso: string | null) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '–')
const celle = (t: string) => t.replace(/\|/g, '\\|').replace(/\n/g, ' ')
const tabell = (hode: string[], rader: string[][]) =>
  [`| ${hode.join(' | ')} |`, `| ${hode.map(() => '---').join(' | ')} |`, ...rader.map((r) => `| ${r.map(celle).join(' | ')} |`)].join('\n')
const liste = (xs: string[]) => xs.map((x) => `- ${x}`).join('\n')
const listeEller = (xs: string[], ingen: string) => (xs.length > 0 ? liste(xs) : ingen)

/** Legemiddelformene i en klasse, med antall preparatnavn (merkevarer) i FEST. */
function formoversikt(preparater: Festpreparat[]): string {
  const per = new Map<Formuleringsklasse, Map<string, number>>()
  for (const p of preparater) {
    if (p.kombinert_med.length > 0) continue
    const f = per.get(p.klasse) ?? new Map<string, number>()
    const navn = p.legemiddelform?.tekst ?? 'ukjent form'
    f.set(navn, (f.get(navn) ?? 0) + 1)
    per.set(p.klasse, f)
  }
  return (Object.keys(FORMULERINGSKLASSER) as Formuleringsklasse[])
    .filter((k) => per.has(k))
    .map((k) => `**${FORMULERINGSKLASSER[k]}:** ${[...per.get(k)!].map(([f, n]) => `${f} (${n})`).join(', ')}`)
    .join('<br>')
}

function identitetstekst(d: Kartdata, i: Kildeidentitet): [string, string] {
  const navn = (n: string) => d.kartlegging.virkestoffer.find((v) => v.nokkel === n)?.navn ?? n
  switch (i.type) {
    case 'virkestoff':
      return [`Virkestoff: ${navn(i.virkestoff)} (\`${i.virkestoff}\`)`, i.kildeformulering === 'standard' ? 'uten tillegg' : i.kildeformulering]
    case 'gruppe': {
      const g = d.kartlegging.grupper.find((x) => x.id === i.gruppe)
      return [`Gruppe (kilderegel): ${g?.medlemmer.map((m) => navn(m.virkestoff)).join(', ')}`, '–']
    }
    case 'ekskludert':
      return ['**Ekskludert** (johannesurt)', '–']
    case 'start':
      return ['Generell start – **importeres ikke**', '–']
    case 'stopp':
      return ['Seponering (Stop) – importeres', '–']
  }
}

export function lagRapport(d: Kartdata): string {
  const k = d.kartlegging
  const t = d.tabeller.tabeller
  const dekning = t.map((x) => tabelldekning(d, x))
  const status = new Map(k.virkestoffer.map((v) => [v.nokkel, virkestoffstatus(d, v)]))
  const mangler = k.virkestoffer.filter((v) => !status.get(v.nokkel)!.fagside)
  const navn = (n: string) => k.virkestoffer.find((v) => v.nokkel === n)?.navn ?? n
  const varianter = Object.entries(k.kildeidentiteter).flatMap(([tab, ids]) =>
    ids.flatMap((i) => (i.type === 'virkestoff' && i.kildeformulering !== 'standard' ? [{ tabell: tab as Tabell_id, ...i }] : [])),
  )
  const identiteter = Object.values(k.kildeidentiteter).flat()
  const alleFest = k.virkestoffer.flatMap((v) => preparaterFor(d, v.nokkel)).filter((p) => p.kombinert_med.length === 0)
  const mal = importmal(d)

  const avvik: string[] = []
  for (const v of k.virkestoffer) if (v.merknad) avvik.push(`**${v.navn}:** ${v.merknad}`)
  for (const v of k.virkestoffer) {
    const s = status.get(v.nokkel)!
    if (s.marked !== 'markedsfort') avvik.push(`**${v.navn}:** ${MARKEDSAVVIK[s.marked]}`)
  }
  for (const v of k.virkestoffer) {
    const klasser = new Set(preparaterFor(d, v.nokkel).filter((p) => p.marked === 'markedsfort').map((p) => p.klasse))
    const standard = identiteter.some((i) => i.type === 'virkestoff' && i.virkestoff === v.nokkel && i.kildeformulering === 'standard')
    if (standard && klasser.has('peroral') && klasser.has('peroral_modifisert')) {
      avvik.push(`**${v.navn}:** FEST har både vanlig og modifisert frisetting peroralt; kildens rad skiller dem ikke. Hvilken som omfattes, avklares før beregning (P7–P9).`)
    }
  }
  for (const v of k.virkestoffer) {
    const kort = preparaterFor(d, v.nokkel).filter((p) => p.klasse === 'injeksjon' && p.marked === 'markedsfort' && p.kombinert_med.length === 0)
    if (kort.length > 0) {
      avvik.push(`**${v.navn}:** korttidsvirkende injeksjon i FEST (${[...new Set(kort.map((p) => p.varenavn))].join(', ')}) har ingen egen rad i kilden og dekkes ikke av kartleggingen.`)
    }
  }
  for (const x of dekning) for (const l of x.delte_lenkemal) avvik.push(`**${TABELLNAVN[x.tabell]}:** ${l.celler} celler deler lenken \`${l.href}\`, altså én felles anbefaling.`)
  for (const x of t) {
    const diag = x.celler.filter((c) => c.rad === c.kolonne && c.type === 'lenke')
    if (diag.length > 0) avvik.push(`**${TABELLNAVN[x.id]}:** lenke på diagonalen for ${diag.map((c) => c.rad).join(', ')} (bytte innen samme gruppe eller formulering).`)
  }
  for (const g of k.grupper) avvik.push(`**${g.kildenavn}:** ${g.merknad}`)
  for (const v of varianter) if (v.merknad) avvik.push(`**${v.kildenavn}:** ${v.merknad}`)

  const iP2 = (vs: readonly { nokkel: string }[]) => vs.filter((v) => VERKTOY_KATEGORIER[v.nokkel]).length
  const nyeAliaser = k.virkestoffer
    .map((v) => {
      const register = d.stoffregister.stoffer.find((s) => s.slug === v.nokkel)
      const kjente = new Set([v.navn, ...(register?.aliaser ?? [])].map(navnenokkel))
      return { v, nye: v.aliaser.filter((a) => !kjente.has(navnenokkel(a))) }
    })
    .filter((x) => x.nye.length > 0)

  const sum = (f: (x: (typeof dekning)[number]) => number) => dekning.reduce((a, x) => a + f(x), 0)

  return `# OUSFAR Verktøy – P1: virkestoff- og formuleringskartlegging

<!-- Laget av \`npm run verktoy:kartlegging -- rapport\` fra src/data/verktoy/. Ikke rediger for hånd; endre kartleggingen og lag rapporten på nytt. -->

Grunnlaget for de neste fasene i \`docs/verktøy-utviklingsplan.md\`. Den
maskinlesbare kartleggingen er \`src/data/verktoy/virkestoffkartlegging.json\`
(valgt for hånd), og den kontrolleres av
\`src/__tests__/verktoykartlegging.test.ts\` mot øyeblikksbildene i samme mappe.
Ingen fagsider er opprettet, ingen anbefalingstekster er hentet inn, og ingen
regler er laget.

## Kilder

${tabell(
  ['Kilde', 'Versjon', 'Hentet'],
  [
    ...t.map((x) => [`[${TABELLNAVN[x.id]}](${x.url})`, `revisjon ${x.revisjon ?? '–'}, lagret ${dato(x.lagret)}`, dato(d.tabeller.hentet)]),
    [`De ${d.lenker.sider.length} lenkede sidene på ${PSYCHIATRIENET}`, 'status, overskrift og revisjon per side', dato(d.lenker.hentet)],
    [`FEST (${d.fest.fil})`, `uttrekk ${dato(d.fest.fest_hentet)}${d.fest.fil_endret ? `, fil endret ${dato(d.fest.fil_endret)}` : ''}`, '–'],
    ['Fagsidene i OUSFAR', `${d.fagsider.sider.length} publiserte`, dato(d.fagsider.hentet)],
    ['Stoffregisterfilen', `src/data/stoffregister.json, ${d.stoffregister.stoffer.length} stoffer`, '–'],
  ],
)}

Markedsstatusen gjelder dagen FEST-uttrekket ble laget. FEST er ikke
sanntidsbeholdning i apotek.

## Sammendrag

- **${k.virkestoffer.length} ulike virkestoffer** (${KILDETABELLER.map((x) => `${KORT[x.id]}: ${k.virkestoffer.filter((v) => status.get(v.nokkel)!.tabeller.includes(x.id)).length}`).join(', ')}), alle med norsk navn og moderstoff i FEST. Johannesurt er ikke med.
- **${k.grupper.length} kildegrupper** (${k.grupper.map((g) => `${g.kildenavn}: ${g.medlemmer.length}`).join(', ')}). Gruppene er kilderegler, ikke valgbare virkestoffer.
- **${varianter.length} egne formuleringsvarianter** i ${TABELLNAVN.SwitchAntipsychotics} (${Object.keys(KILDEFORMULERINGER).filter((f) => f !== 'standard').map((f) => `${f}: ${varianter.filter((v) => v.kildeformulering === f).length}`).join(', ')}), knyttet til ${new Set(varianter.flatMap((v) => v.preparater?.map((p) => p.varenavn) ?? [])).size} preparatnavn i FEST.
- **${identiteter.length} rad- og kolonneidentiteter** i de tre tabellene (${KILDETABELLER.map((x) => `${KORT[x.id]}: ${k.kildeidentiteter[x.id].length}`).join(', ')}).
- **${new Set(alleFest.map((p) => p.id)).size} preparater (merkevarer) i FEST** for virkestoffene, uten kombinasjonspreparater:
${liste((Object.keys(FORMULERINGSKLASSER) as Formuleringsklasse[]).map((c) => `${FORMULERINGSKLASSER[c]}: ${new Set(alleFest.filter((p) => p.klasse === c).map((p) => p.id)).size}`)).replace(/^/gm, '  ')}
- **Fagsider:** ${k.virkestoffer.length - mangler.length} finnes, **${mangler.length} mangler**${mangler.length > 0 ? `: ${mangler.map((v) => v.navn).join(', ')}. ${iP2(mangler)} av dem lages i P2 (\`src/verktoy/fagsider.ts\`)` : ''}.
- **Celler:** ${sum((x) => x.celler)} i alt, ${sum((x) => x.lenkede)} lenkede, ${sum((x) => x.tomme)} tomme. Etter johannesurt og Start-kolonnen er **${mal.length} celler importmål** i P3, og ${sum((x) => x.importmal_tilgjengelige)} av dem svarte.

## Dekning per tabell

Tellingen er gjort i tabellene slik de faktisk er, ikke ut fra antatte
totalsummer. «Tom» er en celle med «—»: kilden har ingen anbefaling.

${tabell(
  ['', ...t.map((x) => TABELLNAVN[x.id])],
  [
    ['Rader × kolonner', ...dekning.map((x) => `${x.rader} × ${x.kolonner}`)],
    ['Celler', ...dekning.map((x) => String(x.celler))],
    ['Diagonal (samme identitet)', ...dekning.map((x) => `${x.diagonal} (${x.lenkede_paa_diagonal} med lenke)`)],
    ['Lenkede celler', ...dekning.map((x) => String(x.lenkede))],
    ['Tomme celler', ...dekning.map((x) => String(x.tomme))],
    ['Tomme utenom diagonalen (ingen anbefaling)', ...dekning.map((x) => String(x.tomme_utenom_diagonal))],
    ['Unike lenkemål', ...dekning.map((x) => String(x.unike_lenkemal))],
    ['Lenkede celler som ikke svarer (404)', ...dekning.map((x) => String(x.utilgjengelige))],
    ['Ekskludert: johannesurt (celler / lenkede)', ...dekning.map((x) => `${x.ekskludert.celler} / ${x.ekskludert.lenkede}`)],
    ['Ikke importert: Start (celler / lenkede)', ...dekning.map((x) => `${x.ikke_importert.celler} / ${x.ikke_importert.lenkede}`)],
    ['**Importmål** (lenkede, etter utelatelser)', ...dekning.map((x) => `**${x.importmal}**`)],
    ['Importmål som svarte', ...dekning.map((x) => String(x.importmal_tilgjengelige))],
  ],
)}

Retning: rad → kolonne. I ${TABELLNAVN.CombiningMoodstabilizers} er raden det
eksisterende legemiddelet og kolonnen det som legges til; i de to andre er
raden det man bytter fra og kolonnen det man bytter til. A → B og B → A er
ulike celler med hver sin lenke.

### Lenker som ikke svarer

${tabell(
  ['Lenke', 'Funn'],
  k.kjente_lenkeavvik.map((a) => [`\`${a.href}\``, a.funn]),
)}

## Kildeidentiteter

${KILDETABELLER.map(
  (x) => `### ${x.tittel}

${tabell(
  ['Kode', 'Kildens navn', 'OUSFAR', 'Formulering'],
  k.kildeidentiteter[x.id].map((i) => [i.kode, i.kildenavn ?? '–', ...identitetstekst(d, i)]),
)}`,
).join('\n\n')}

Kildeformuleringene:

${liste(Object.entries(KILDEFORMULERINGER).map(([f, x]) => `**${f === 'standard' ? 'Uten tillegg' : f}** → ${x.klasser.map((c) => FORMULERINGSKLASSER[c]).join(' eller ')}. ${x.forklaring}`))}

## Virkestoffer

Norsk navn er FESTs navn på moderstoffet, eller fagsidens navn når den har et
annet. Aliasene er FESTs engelske navn og kildens stavemåter.

${tabell(
  ['Norsk navn', 'Nøkkel', 'Aliaser', 'FEST (moderstoff)', 'Salter/estere i FEST', 'Fagside', 'I stoffregisterfilen', 'Marked', 'Tabeller'],
  k.virkestoffer.map((v) => {
    const s = status.get(v.nokkel)!
    const f = d.fest.virkestoffer.filter((x) => v.fest.includes(x.id))
    return [
      v.navn,
      `\`${v.nokkel}\``,
      v.aliaser.join(', ') || '–',
      f.map((x) => `${x.navn} \`${x.id}\``).join('; '),
      f.flatMap((x) => x.salter.map((s) => s.navn)).join(', ') || '–',
      s.fagside ? 'finnes' : VERKTOY_KATEGORIER[v.nokkel] ? 'lages i P2' : '**mangler**',
      s.i_stoffregisterfilen ? 'ja' : 'nei',
      MARKEDSGRUNNLAG[s.marked],
      s.tabeller.map((x) => KORT[x]).join(', '),
    ]
  }),
)}

MS = ${TABELLNAVN.CombiningMoodstabilizers}, AD = ${TABELLNAVN.SwitchAntidepressants}, AP = ${TABELLNAVN.SwitchAntipsychotics}.

### Virkestoffer som mangler fagside

Etter fagsidene i produksjon da øyeblikksbildet ble tatt. Sidene P2 lager, er
uten faginnhold og kobles til moderstoffet i FEST; de står her til bildet er
tatt på nytt etter utrullingen.

${
  mangler.length > 0
    ? tabell(
        ['Virkestoff', 'Nøkkel', 'Marked', 'Tabeller', 'Kategori i stoffregisteret (P2)'],
        mangler.map((v) => {
          const s = status.get(v.nokkel)!
          return [v.navn, `\`${v.nokkel}\``, MARKEDSGRUNNLAG[s.marked], s.tabeller.map((x) => KORT[x]).join(', '), VERKTOY_KATEGORIER[v.nokkel]?.join(' › ') ?? '**ingen side planlagt**']
        }),
      )
    : 'Ingen.'
}

### Søkealiaser som ikke finnes i dag

Navn fagsøket ikke allerede finner gjennom stavemåteregelen (\`navnenokkel\`)
eller stoffregisterfilen.

${listeEller(nyeAliaser.map((x) => `${x.v.navn}: ${x.nye.join(', ')}`), 'Ingen: de er lagt inn i stoffregisterfilen (P2).')}

## Formuleringer i FEST

Antall preparatnavn (merkevarer) per legemiddelform, uten
kombinasjonspreparater. Formuleringen er lest av FESTs legemiddelform og
administrasjonsvei, med overstyringene under.

${tabell(
  ['Virkestoff', 'Formuleringer'],
  k.virkestoffer.map((v) => [v.navn, formoversikt(preparaterFor(d, v.nokkel)) || '*ingen preparater i FEST*']),
)}

### Overstyrt formulering

FEST skiller ikke en esterdepot fra en vanlig injeksjon i formen eller
styrken. Disse preparatene har derfor fått formuleringen uttrykkelig:

${tabell(
  ['Preparat', 'Virkestoff', 'Formulering', 'Grunnlag'],
  k.festoverstyringer.map((o) => [o.varenavn, navn(o.virkestoff), FORMULERINGSKLASSER[o.klasse], o.grunn]),
)}

## Depot- og MA-varianter i ${TABELLNAVN.SwitchAntipsychotics}

${tabell(
  ['Kode', 'Kildens navn', 'Preparat', 'Salt/ester', 'Intervall', 'Grunnlag', 'I FEST'],
  varianter.flatMap((v) =>
    (v.preparater ?? []).map((p) => {
      const fest = preparaterFor(d, v.virkestoff).filter((x) => x.varenavn === p.varenavn)
      return [
        v.kode,
        v.kildenavn,
        p.varenavn,
        p.virkestoffform ?? 'ikke kontrollert',
        p.intervall ?? 'ikke kontrollert',
        p.grunnlag ?? '–',
        [...new Set(fest.map((x) => `${x.navn_form_styrke}${x.preparattype !== 'Legemiddel' ? ` (${x.preparattype})` : ''}`))].join('<br>'),
      ]
    }),
  ),
)}

### Depotinjeksjoner i FEST uten kildevariant

${tabell(
  ['Preparat', 'Virkestoff', 'Grunn'],
  k.uten_kildevariant.map((u) => [u.varenavn, navn(u.virkestoff), u.grunn]),
)}

## Avvik og uavklarte punkter

${liste(avvik)}

## Johannesurt og Start-kolonnen

- ${k.ekskludert.map((e) => `${e.navn}: ${e.grunn} Utelatt fra ${e.kildekoder.map((c) => `${TABELLNAVN[c.tabell]} (${c.kode}, «${c.kildenavn}»)`).join(', ')}. Sperrede navn: ${e.sperrenavn.join(', ')}.`).join('\n- ')}
- ${k.ikke_importert.map((x) => `${TABELLNAVN[x.tabell]}, ${x.kode}: ${x.grunn}`).join('\n- ')}
- Ingen fagside, ingen stoffregisteroppføring og ingen gruppe i kartleggingen har et sperret navn, og ingen av de ${mal.length} importmålene gjelder johannesurt. Testen slår ut om det endrer seg.

## Hvor fullstendig kartleggingen er

- Alle rader og kolonner i de tre tabellene er kartlagt nøyaktig én gang, og alle ${d.lenker.sider.length} lenkede sider (cellene og gruppemedlemmene) er kontrollert én for én.
- Alle ${k.virkestoffer.length} virkestoffer har moderstoff i FEST, og ingen navn eller aliaser kolliderer etter stavemåteregelen.
- Hver depot- og MA-injeksjon i FEST for virkestoffene er tilordnet én kildevariant eller står uttrykkelig uten.
- Ikke kontrollert i P1: anbefalingstekstene (P3), intervallene for sentralt godkjente depotpreparater mot EMA-preparatomtalen (P10.1), og om kildens rader uten tillegg omfatter modifisert frisetting (P9).
`
}
