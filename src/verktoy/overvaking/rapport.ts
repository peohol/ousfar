/**
 * Forskjellsrapporten fra kildeovervåkingen (P12.1 og P12.5), i vanlig språk:
 * først det som krever ny faglig vurdering, med de godkjente regelversjonene
 * det berører, så det informative, og til slutt hva som ble sammenlignet.
 * Rapporten har ingen kildetekst, bare titler, id-er, statuser og
 * kontrollsummer.
 */
import { createHash } from 'node:crypto'
import { ARTTEKST, KILDETEKST, PRIORITETSTEKST, sorterFunn, type Overvakingsfunn, type Overvakingsrapport } from './modell'

const celle = (t: string) => t.replace(/\|/g, '\\|').replace(/\n/g, ' ')
const tabell = (hode: string[], rader: string[][]) =>
  [`| ${hode.join(' | ')} |`, `| ${hode.map(() => '---').join(' | ')} |`, ...rader.map((r) => `| ${r.map(celle).join(' | ')} |`)].join('\n')

const berorte = (f: Overvakingsfunn) =>
  f.berorte.length === 0 ? '–' : f.berorte.map((b) => `${b.regel} v${b.versjon} (${b.fingeravtrykk.slice(0, 12)}): ${b.hvorfor}`).join('<br>')

const rader = (funn: Overvakingsfunn[], medRegler: boolean, medPrioritet = false) =>
  funn.map((f) => [
    ...(medPrioritet ? [f.prioritet ? PRIORITETSTEKST[f.prioritet] : '–'] : []),
    KILDETEKST[f.kilde],
    f.etikett,
    ARTTEKST[f.art],
    [...f.detaljer, ...(f.viderefort_fra ? [`Funnet i kjøringen ${f.viderefort_fra}; delen er ikke kontrollert på nytt siden, så funnet står videre.`] : [])].join('<br>'),
    ...(medRegler ? [berorte(f)] : []),
  ])

/** Funnene som krever vurdering. */
export const kreverVurdering = (r: Pick<Overvakingsrapport, 'funn'>) => r.funn.filter((f) => f.niva === 'krever_vurdering')

/** Funnene som krever vurdering med høy prioritet. */
export const hoyPrioritet = (r: Pick<Overvakingsrapport, 'funn'>) => kreverVurdering(r).filter((f) => f.prioritet === 'hoy')

/**
 * Avtrykket av det som krever vurdering: det samme så lenge de samme funnene
 * står med det samme innholdet, så en sak bare oppdateres når noe er nytt.
 */
export function avtrykk(r: Pick<Overvakingsrapport, 'funn'>): string {
  const x = sorterFunn(kreverVurdering(r)).map((f) => ({ id: f.id, art: f.art, detaljer: f.detaljer.map((d) => d.replace(/hentet \d{4}-\d{2}-\d{2}T[\d:.]+Z/g, 'hentet')), berorte: f.berorte }))
  return createHash('sha256').update(JSON.stringify(x)).digest('hex')
}

export function lagOvervakingsrapport(r: Overvakingsrapport): string {
  const funn = sorterFunn(r.funn)
  const krever = funn.filter((f) => f.niva === 'krever_vurdering')
  const info = funn.filter((f) => f.niva === 'informativ')
  const deler = [
    `# Kildeovervåking for OUSFAR Verktøy, ${r.kjort_kl.slice(0, 10)}`,
    '',
    `Kjørt ${r.kjort_kl}. ${krever.length === 0 ? 'Ingen endringer krever ny faglig vurdering.' : `**${krever.length} ${krever.length === 1 ? 'endring krever' : 'endringer krever'} ny faglig vurdering.**`} ${info.length === 0 ? 'Ingen informative endringer.' : `${info.length} ${info.length === 1 ? 'endring er informativ' : 'endringer er informative'}.`}${r.feil.length > 0 ? ` ${r.feil.length} ${r.feil.length === 1 ? 'del' : 'deler'} av kontrollen stoppet.` : ''}`,
    '',
    'Overvåkingen endrer, godkjenner eller sperrer ingen regel, og den oppdaterer ikke grunnlaget. Godkjenningene står til en faglig vurdering avgjør noe annet. Kan en endring gjøre en plan uforsvarlig, settes en sperre i Adminmeny → Kliniske verktøy (`docs/verktøy-p11-publisering.md` §5.2). Fremgangsmåten står i `docs/verktøy-p12-overvaking.md`.',
  ]
  if (krever.length > 0) deler.push('', '## Krever ny faglig vurdering', '', tabell(['Prioritet', 'Kilde', 'Hva', 'Endring', 'Detaljer', 'Godkjente regler som berøres'], rader(krever, true, true)))
  if (info.length > 0) deler.push('', '## Informative endringer', '', tabell(['Kilde', 'Hva', 'Endring', 'Detaljer', 'Godkjente regler'], rader(info, true)))
  if (r.feil.length > 0) deler.push('', '## Ikke kontrollert', '', ...r.feil.map((f) => `- ${f}`))
  deler.push('', '## Hva som ble sammenlignet', '', tabell(['Kilde', 'Kjørt', 'Kontrollert', 'Grunnlag'], r.grunnlag.map((g) => [KILDETEKST[g.kilde], g.kjort ? 'ja' : 'nei', String(g.kontrollert), g.beskrivelse])))
  deler.push('', `Avtrykk av det som krever vurdering: \`${avtrykk(r)}\``, '')
  return deler.join('\n')
}
