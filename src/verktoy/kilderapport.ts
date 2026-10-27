/**
 * Rapporten om kildegrunnlaget (`docs/verktøy-p3-kildegrunnlag.md`), laget av
 * kildearkivet og kartleggingen så tallene aldri kan avvike fra dataene.
 * `npm run verktoy:kildeimport -- rapport` skriver den; testene sier fra når
 * den ikke er oppdatert.
 */
import arkivfil from '../data/verktoy/psychiatrienet-kildearkiv.json'
import kartleggingsfil from '../data/verktoy/virkestoffkartlegging.json'
import { uttrekksendringer, type Kildearkiv } from './kildearkiv'
import {
  CELLESTATUSER,
  cellenokkel,
  kildedekning,
  kildegrunnlag,
  type Cellestatus,
  type Kildeanbefaling,
  type Kildegrunnlag,
  type Kildepart,
} from './kildeanbefalinger'
import { KILDETABELLER, type Tabell_id } from './kildetabeller'
import type { Virkestoffkartlegging } from './kartlegging'

export const KILDERAPPORTFIL = 'docs/verktøy-p3-kildegrunnlag.md'

const TABELLNAVN = Object.fromEntries(KILDETABELLER.map((t) => [t.id, t.tittel])) as Record<Tabell_id, string>

const SYMBOL: Record<Cellestatus, string> = {
  hentet: '✓',
  alternativ_adresse: '↪',
  utilgjengelig: '✗',
  undertabell: '▦',
  ingen_anbefaling: '—',
  diagonal: '·',
  ekskludert: '⊘',
  ikke_importert: '○',
  ukartlagt: '?',
}

const tid = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)} kl. ${iso.slice(11, 16)} UTC`
const dato = (iso: string | null) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : '–')
const celle = (t: string) => t.replace(/\|/g, '\\|').replace(/\n/g, ' ')
const tabell = (hode: string[], rader: string[][]) =>
  [`| ${hode.join(' | ')} |`, `| ${hode.map(() => '---').join(' | ')} |`, ...rader.map((r) => `| ${r.map(celle).join(' | ')} |`)].join('\n')
const liste = (xs: string[]) => xs.map((x) => `- ${x}`).join('\n')
const listeEller = (xs: string[], ingen: string) => (xs.length > 0 ? liste(xs) : ingen)

function partnavn(p: Kildepart | null): string {
  if (!p) return 'Stop'
  return p.variant?.navn ?? p.kildenavn ?? p.kode
}

const anbefalingsnavn = (a: Kildeanbefaling) => `${TABELLNAVN[a.tabell]}: ${partnavn(a.fra)} → ${a.type === 'seponering' ? 'Stop' : partnavn(a.til)}`

function matrise(g: Kildegrunnlag, tabellId: string, rader: string[], kolonner: string[], under?: { rad: string; kolonne: string; side: string }): string {
  const problem = new Set(g.anbefalinger.filter((a) => a.kildeproblemer.length > 0).map((a) => a.id))
  const rad = (r: string) =>
    kolonner.map((k) => {
      const id = under ? cellenokkel(tabellId, under.rad, under.kolonne, { rad: r, kolonne: k }) : cellenokkel(tabellId, r, k)
      const s = g.celler.get(id)
      return s ? `${SYMBOL[s]}${problem.has(id) ? '!' : ''}` : ' '
    })
  return tabell(['', ...kolonner], rader.map((r) => [`**${r}**`, ...rad(r)]))
}

export function lagKilderapport(arkiv = arkivfil as Kildearkiv, k = kartleggingsfil as Virkestoffkartlegging): string {
  const g = kildegrunnlag(arkiv, k)
  const dekning = kildedekning(g)
  const u = g.uttrekk
  const endringer = uttrekksendringer(arkiv)
  const a = g.anbefalinger
  const tell = (f: (x: Kildeanbefaling) => boolean) => a.filter(f).length
  const statuser = Object.keys(CELLESTATUSER) as Cellestatus[]

  // Kildeproblemene, samlet per problem.
  const problemer = new Map<string, string[]>()
  for (const x of a) for (const p of x.kildeproblemer) problemer.set(p, [...(problemer.get(p) ?? []), anbefalingsnavn(x)])

  const delte = new Map<string, Kildeanbefaling[]>()
  for (const x of a) if (x.kildeside && x.delt_med.length > 0) delte.set(x.kildeside, [...(delte.get(x.kildeside) ?? []), x])

  const undertabeller = [...g.celler].filter(([, s]) => s === 'undertabell').map(([id]) => id)
  const stopp = a.filter((x) => x.type === 'seponering')
  const stoppkolonne = g.tabeller.find((t) => t.tabell === 'SwitchAntidepressants')
  const stoppStatus = (stoppkolonne?.rader ?? []).map((r) => ({ r, s: g.celler.get(cellenokkel('SwitchAntidepressants', r.kode, 'Stop')) }))

  return `# OUSFAR Verktøy – P3: kildegrunnlag fra Psychiatrienet

<!-- Laget av \`npm run verktoy:kildeimport -- rapport\` fra kildearkivet. Ikke rediger for hånd; hent på nytt eller endre kartleggingen og lag rapporten på nytt. -->

Hva som er hentet fra Psychiatrienets tre switchtabeller, hva som mangler, og
hvorfor. Grunnlaget er kildearkivet \`src/data/verktoy/psychiatrienet-kildearkiv.json\`
og identitetskartleggingen fra P1. Oppføringene er **kildeoppføringer, ikke
faglig godkjente regler**; ingen regel er laget eller endret (P4).

Arkivet har **ingen anbefalingstekst**, bare adresse, revisjon, tidspunkt,
kontrollsum og fakta om hver side (\`docs/verktøy-p3-rettigheter.md\`). Teksten
leses på kilden; kontrollsummen viser om den er den samme som da den ble hentet.

## Uttrekk

${tabell(
  ['Uttrekk', 'Startet', 'Ferdig', 'Leserversjon'],
  arkiv.uttrekk.map((x) => [String(x.nr), tid(x.startet), tid(x.ferdig), String(x.leser)]),
)}

Rapporten gjelder uttrekk ${u.nr}.

${tabell(
  ['Tabell', 'Revisjon', 'Lagret hos kilden', 'Kontrollsum (SHA-256 av tabellen)'],
  g.tabeller.map((t) => [`[${TABELLNAVN[t.tabell]}](${t.url})`, String(t.revisjon ?? '–'), dato(t.lagret), `\`${t.sha256.slice(0, 16)}…\``]),
)}

**Endringer siden forrige uttrekk:** ${
    arkiv.uttrekk.length < 2
      ? 'første uttrekk.'
      : endringer.length === 0
        ? 'ingen.'
        : `\n\n${liste(endringer.map((e) => `${e.type}: ${e.hva} ${e.id}`))}`
  }

## Sammendrag

- **${a.length} anbefalinger** som kildeoppføringer: ${tell((x) => x.tilgjengelighet === 'hentet')} hentet, ${tell((x) => x.tilgjengelighet === 'alternativ_adresse')} hentet fra kildens egen side på en annen adresse, ${tell((x) => x.tilgjengelighet === 'utilgjengelig')} ikke tilgjengelig.
- Bytter: ${tell((x) => x.type === 'bytte')}, tillegg (Combining Moodstabilizers): ${tell((x) => x.type === 'tillegg')}, Stop: ${tell((x) => x.type === 'seponering')}.
- Gruppebaserte (Rest AP, Partial agonist): ${tell((x) => x.grunnlag === 'gruppe')}. Delt med andre celler: ${tell((x) => x.delt_med.length > 0)}, på ${delte.size} ${delte.size === 1 ? 'side' : 'sider'}.
- Med depot- eller MA-formulering på minst én side: ${tell((x) => [x.fra, x.til].some((p) => p && p.formulering && p.formulering !== 'standard'))}.
- ${undertabeller.length} celle${undertabeller.length === 1 ? '' : 'r'} lenker til en undertabell; anbefalingene står i cellene der og er talt med over.
- ${tell((x) => x.kildeproblemer.length > 0)} oppføringer har minst ett kjent kildeproblem (se under).
- Utelatt etter beslutning: ${dekning.reduce((s, d) => s + d.status.ekskludert, 0)} celler for johannesurt og ${dekning.reduce((s, d) => s + d.status.ikke_importert, 0)} i Start-kolonnen. Sidene deres er ikke hentet.

## Dekning per tabell

Alle celler i hver tabell, etter status. Lenket = hentet + annen adresse +
ikke tilgjengelig + undertabell.

${tabell(
  ['', ...dekning.map((d) => TABELLNAVN[d.tabell])],
  [
    ['Celler (alle kombinasjoner)', ...dekning.map((d) => String(d.celler))],
    ...statuser.map((s) => [`${SYMBOL[s]} ${CELLESTATUSER[s]}`, ...dekning.map((d) => String(d.status[s]))]),
    ['**Anbefalinger (oppføringer)**', ...dekning.map((d) => `**${d.anbefalinger}**`)],
    ['Gruppebaserte', ...dekning.map((d) => String(d.grupper))],
    ['Delt med andre celler', ...dekning.map((d) => String(d.delte))],
    ['Med kjent kildeproblem', ...dekning.map((d) => String(d.med_problemer))],
  ],
)}

## Alle kombinasjoner

Rad → kolonne (fra → til; i Combining Moodstabilizers eksisterende → legges
til). ${statuser.map((s) => `${SYMBOL[s]} ${CELLESTATUSER[s].toLowerCase()}`).join(', ')}. «!» betyr at oppføringen har et kjent kildeproblem.

${g.tabeller
  .map((t) => `### ${TABELLNAVN[t.tabell]}\n\n${matrise(g, t.tabell, t.rader.map((r) => r.kode), t.kolonner.map((c) => c.kode))}`)
  .join('\n\n')}
${undertabeller
  .map((id) => {
    const [tabellId, celle_] = id.split(':') as [Tabell_id, string]
    const [rad, kolonne] = celle_.split('>') as [string, string]
    const x = a.find((y) => y.under && y.tabell === tabellId && y.rad === rad && y.kolonne === kolonne)
    if (!x?.under) return `\n### Undertabell i ${id}\n\nIngen celler hentet.`
    const koder = [...new Set(a.filter((y) => y.under?.side === x.under!.side).flatMap((y) => [y.under!.rad, y.under!.kolonne]))].sort()
    const navn = koder.map((c) => `${c} = ${a.find((y) => y.under?.side === x.under!.side && y.under.rad === c)?.fra.variant?.navn ?? c}`)
    return `\n### Undertabell: ${TABELLNAVN[tabellId]} ${rad} → ${kolonne} (\`${x.under.side}\`)\n\n${navn.join(', ')}.\n\n${matrise(g, tabellId, koder, koder, { rad, kolonne, side: x.under.side })}`
  })
  .join('\n')}

## Stop-kolonnen (Switching Antidepressants)

${tabell(
  ['Kode', 'Kildens navn', 'Status', 'Kildeside'],
  stoppStatus.map(({ r, s }) => {
    const x = stopp.find((y) => y.rad === r.kode)
    return [r.kode, r.navn ?? '–', s ? CELLESTATUSER[s] : '–', x?.kildeside ? `\`${x.kildeside}\`` : x ? `\`${x.href}\` svarer ikke` : '–']
  }),
)}

## Kjente kildeproblemer

Gruppert per problem. Ingen av dem er rettet eller tolket bort; de må vurderes
faglig i P4.

${listeEller(
  [...problemer].map(([p, hvor]) => `${p} (${hvor.length}: ${hvor.length > 6 ? `${hvor.slice(0, 6).join('; ')} …` : hvor.join('; ')})`),
  'Ingen.',
)}

## Sider som deles av flere celler

${listeEller(
  [...delte].map(([side, xs]) => `\`${side}\`: ${xs.length} celler (${xs.slice(0, 4).map((x) => `${partnavn(x.fra)} → ${partnavn(x.til)}`).join(', ')}${xs.length > 4 ? ' …' : ''})`),
  'Ingen.',
)}

## Hva arkivet har for hver side

Adressen, svaret (status og eventuell videresending), tidspunktet den ble
hentet, MediaWiki-revisjonen og når kilden lagret den, kontrollsummen av hele
innholdet og av selve anbefalingen (SHA-256 av normalisert tekst), hva siden
selv sier at den gjelder («from … to …», «Adding …», «Stop …»),
overskriftene på avsnittene, navnene i faktaboksene (med gruppemedlemmer), og
undertabellen når siden har en. Ikke anbefalingsteksten, referansene eller
annen tekst fra siden.
`
}
