/**
 * Rapportene om regelsettene (`docs/verktøy-p4-pilotsett.md` for pilotsettet,
 * `docs/verktøy-p7-regelutkast.md` for nedtrappingsreglene), laget av
 * reglene og beregningen så de aldri kan avvike fra dem.
 * `npm run verktoy:regler -- rapport` skriver dem; testene sier fra når de
 * ikke er oppdatert. Psychiatrienet vises bare som kildeoppføringens id.
 */
import { beregn, inndatagrenser, kortform, MOTORVERSJON } from './beregning'
import { erKliniskGodkjent, fingeravtrykk, godkjenningsfeil } from './godkjenning'
import { KILDER, kildeFor } from './kilder'
import {
  apneValg,
  henvisninger,
  parametre,
  REGELMODELLVERSJON,
  type Beregningsinndata,
  type Grunnlag,
  type Kildehenvisning,
  type Parameter,
  type Regel,
  type Regelsett,
  type Utsagn,
  type Virkestoffvalg,
} from './modell'
import { NEDTRAPPINGSSETT, SAMMENLIGNINGSSETT } from './nedtrapping'
import { PILOTSETT } from './pilotsett'

/** En rapport om ett regelsett: filen, overskriften og notatene som beskriver valgene. */
export interface Regelrapport {
  fil: string
  tittel: string
  sett: Regelsett
  notater: readonly string[]
}

export const P4RAPPORT: Regelrapport = { fil: 'docs/verktøy-p4-pilotsett.md', tittel: 'P4: pilotsettet', sett: PILOTSETT, notater: ['docs/verktøy-p4-regelmodell.md'] }
export const P7RAPPORT: Regelrapport = {
  fil: 'docs/verktøy-p7-regelutkast.md',
  tittel: 'P7: regelutkast for nedtrapping av antidepressiva',
  sett: NEDTRAPPINGSSETT,
  notater: ['docs/verktøy-p4-regelmodell.md', 'docs/verktøy-p7-nedtrapping.md'],
}
export const P7SAMMENLIGNING: Regelrapport = {
  fil: 'docs/verktøy-p7-sammenligning.md',
  tittel: 'P7: varianter til sammenligning (ikke i verktøyet)',
  sett: SAMMENLIGNINGSSETT,
  notater: ['docs/verktøy-p7-nedtrapping.md'],
}
export const REGELRAPPORTER: readonly Regelrapport[] = [P4RAPPORT, P7RAPPORT, P7SAMMENLIGNING]

const celle = (t: string) => t.replace(/\|/g, '\\|').replace(/\n/g, ' ')
export const tabell = (hode: string[], rader: string[][]) =>
  [`| ${hode.join(' | ')} |`, `| ${hode.map(() => '---').join(' | ')} |`, ...rader.map((r) => `| ${r.map(celle).join(' | ')} |`)].join('\n')
export const liste = (xs: string[], ingen = '- Ingen.') => (xs.length > 0 ? xs.map((x) => `- ${x}`).join('\n') : ingen)
export const tall = (x: number) => String(x).replace('.', ',')
export const dato = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`

export const BEREGNBARHET: Record<Regel['beregnbarhet'], string> = {
  entydig_beregnbar: 'entydig beregnbar',
  beregnbar_etter_avklaring: 'beregnbar etter faglig avklaring',
  bare_tekstlig: 'bare tekstlig veiledning',
  mangler_anbefaling: 'mangler anbefaling',
}
const STATUS: Record<Regel['godkjenning']['status'], string> = {
  utkast: 'utkast',
  til_faglig_kontroll: 'til faglig kontroll',
  klinisk_godkjent: 'klinisk godkjent',
  avvist: 'avvist',
  trukket: 'trukket',
}
const FORM: Record<Regel['plan']['form'], string> = {
  seponering: 'seponering',
  kryssnedtrapping: 'kryssnedtrapping',
  sekvensielt: 'sekvensielt bytte',
  direkte: 'direkte bytte',
  oppstart_depot: 'oppstart av depot',
}
const ENHET: Record<Parameter['enhet'], string> = { mg: 'mg', dager: 'dager', dag: '(dag)', maaneder: 'måned(er)', prosent: '%', trinn: 'trinn' }

/** Statusen slik den faktisk gjelder: en klinisk godkjenning som ikke gjelder denne versjonen, sies rett ut. */
export const statustekst = (r: Regel) =>
  r.godkjenning.status === 'klinisk_godkjent' && !erKliniskGodkjent(r)
    ? `merket klinisk godkjent, men ugyldig (${godkjenningsfeil(r).join(' ')})`
    : STATUS[r.godkjenning.status]

const valg = (v: Virkestoffvalg | null) => (!v ? '–' : v.type === 'virkestoff' ? v.nokkel : `gruppen ${v.gruppe}`)

function henvisning(h: Kildehenvisning): string {
  if (h.kilde === 'psychiatrienet') return `Psychiatrienet, kildeoppføring \`${'kildeoppforing' in h ? h.kildeoppforing : '?'}\``
  const k = kildeFor(h.kilde)
  return `${h.faktum} *([${h.kilde}](${k?.url ?? ''}), ${'sted' in h ? h.sted : ''})*`
}

const utsagn = (u: Utsagn) =>
  u.henvisninger.length === 0 ? `${u.tekst} *(OUSFARs vurdering)*` : `${u.tekst}\n${u.henvisninger.map((h) => `  - ${henvisning(h)}`).join('\n')}`

function grunnlag(g: Grunnlag): string {
  if (g.type === 'kilde') return g.henvisninger.map((h) => (h.kilde === 'psychiatrienet' ? 'psychiatrienet' : `${h.kilde} ${'sted' in h ? h.sted : ''}`)).join('; ')
  const bygger = g.henvisninger?.length ? ` (bygger på ${g.henvisninger.map((h) => `${h.kilde} ${'sted' in h ? h.sted : ''}`).join('; ')})` : ''
  const a = g.avklaring
  const status = a ? `avklart ${dato(a.dato)} av ${a.av} (versjon ${a.regelversjon}): ${a.merknad}` : 'åpent forslag'
  return `**OUSFAR-vurdering, ${status}:** ${g.begrunnelse}${bygger}`
}

function parametertabell(r: Regel): string {
  const rader: string[][] = []
  const legg = (hvor: string, x: unknown) => {
    for (const [sti, p] of parametre(x)) {
      const verdi = p.verdi === null ? '**mangler**' : `${tall(p.verdi)} ${ENHET[p.enhet]}${p.omrade ? ` (${p.justerbar ? `forskriveren kan velge ${tall(p.omrade[0])}–${tall(p.omrade[1])}` : `område ${tall(p.omrade[0])}–${tall(p.omrade[1])}`})` : ''}`
      rader.push([hvor, sti, verdi, p.art === 'bindende_krav' ? 'bindende krav' : 'veiledende', grunnlag(p.grunnlag)])
    }
  }
  for (const f of r.plan.forlop) {
    if (f.start.type === 'etter_utvasking') legg(`${f.id}: start`, f.start)
    f.faser.forEach((fase, i) => legg(`${f.id}: fase ${i + 1} (${fase.type})`, fase))
  }
  for (const m of r.medlemmer ?? []) (m.faser ?? []).forEach((fase, i) => legg(`${m.nokkel}: fase ${i + 1} (${fase.type})`, fase))
  for (const f of r.plan.forlop) {
    for (const fase of f.faser) {
      if (fase.type !== 'injeksjoner' || fase.vedlikehold.dose.type !== 'tabell') continue
      const t = fase.vedlikehold.dose
      rader.push([
        `${f.id}: vedlikeholdsdose`,
        'omregningstabell',
        t.rader.map((x) => `${tall(x.fra_mg)} → ${Array.isArray(x.til_mg) ? `${tall(x.til_mg[0])}–${tall(x.til_mg[1])}` : tall(x.til_mg)} mg`).join(', '),
        'bindende krav',
        grunnlag(t.grunnlag),
      ])
    }
  }
  return tabell(['Hvor', 'Parameter', 'Verdi', 'Art', 'Grunnlag'], rader)
}

function inndatatekst(i: Beregningsinndata): string {
  const deler = [`startdose ${tall(i.startdose_mg)} mg`]
  if (i.maldose_mg !== undefined) deler.push(`måldose ${tall(i.maldose_mg)} mg`)
  if (i.medlem) deler.push(`virkestoff ${i.medlem}`)
  if (i.startdato) deler.push(`startdato ${dato(i.startdato)}`)
  if (i.bekreftet?.length) deler.push(`bekreftet: ${i.bekreftet.join(', ')}`)
  const forhold = Object.entries(i.pasientforhold ?? {})
  if (forhold.length) deler.push(`pasientforhold: ${forhold.map(([id, ja]) => `${id} ${ja ? 'ja' : 'nei'}`).join(', ')}`)
  return deler.join('; ')
}

function regelavsnitt(r: Regel, sett: Regelsett): string {
  const betingelser = [
    ...r.inndata.map((x) => {
      const gyldig = inndatagrenser(x)
      return `${x.navn === 'startdose' ? 'Startdose' : 'Måldose (må oppgis)'} ${gyldig}${x.gjelder_medlem ? ` for ${x.gjelder_medlem}` : ''} (${x.art === 'bindende_krav' ? 'bindende' : 'veiledende'}; ${grunnlag(x.grunnlag)})`
    }),
    ...r.bekreftelser.map((b) => `Må bekreftes (\`${b.id}\`): ${b.tekst} (${grunnlag(b.grunnlag)})`),
    ...r.unntak.map((u) => `Unntak (\`${u.id}\`): ${u.tekst} (${grunnlag(u.grunnlag)})`),
  ]
  const medlemmer = r.medlemmer
    ? `\n\n**Gruppemedlemmer (B4).** Bare medlemmer som er foreslått eller validert, kan beregnes.\n\n${tabell(
        ['Virkestoff', 'Vurdering', 'Begrunnelse'],
        r.medlemmer.map((m) => [m.nokkel, m.validering.replace('_', ' '), m.begrunnelse]),
      )}`
    : ''
  const eksempler = r.eksempler
    .map((e) => {
      const res = beregn(r, e.inndata, sett)
      const linjer = Object.entries(kortform(res)).map(([id, l]) => `  - **${id === 'stopp' ? 'Stoppet' : id}:** ${l.join('; ')}`)
      const kontroller = res.status === 'modellberegning' ? res.kontroller.map((k) => `  - Kontroll: ${k.krav} – ${k.oppfylt ? 'oppfylt' : '**ikke oppfylt**'}. ${k.detalj}`) : []
      const merknader = res.merknader.map((m) => `  - Merknad: ${m}`)
      return `- *${e.beskrivelse}* Inndata: ${inndatatekst(e.inndata)}.\n${[...linjer, ...kontroller, ...merknader].join('\n')}`
    })
    .join('\n')

  return `## ${r.tittel}

\`${r.id}\`, versjon ${r.versjon}, fingeravtrykk \`${fingeravtrykk(r)}\`. ${FORM[r.plan.form][0]!.toUpperCase()}${FORM[r.plan.form].slice(1)}: ${valg(r.fra)} → ${valg(r.til)}. **${BEREGNBARHET[r.beregnbarhet][0]!.toUpperCase()}${BEREGNBARHET[r.beregnbarhet].slice(1)}**; status **${statustekst(r)}**.

**Godkjenningshistorikk:** ${r.godkjenning.historikk.map((s) => `${STATUS[s.status]} (versjon ${s.regelversjon}, ${dato(s.dato)}, ${s.av})`).join(' → ')}.

**Kildetro – det som følger direkte av kildene:**

${liste(r.fortolkning.kildetro.map(utsagn))}

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

${liste(r.fortolkning.tilpasninger.map(utsagn))}

**Den matematiske regelen – parametre:**

${parametertabell(r)}

**Betingelser:**

${liste(betingelser)}${medlemmer}

**Kliniske forutsetninger:**

${liste(r.fortolkning.forutsetninger)}

**Usikkerhet:**

${liste(r.fortolkning.usikkerhet)}

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

${eksempler}

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): ${r.referanser.map(henvisning).join('; ') || 'ingen'}.`
}

/** Kildene reglene i settet faktisk viser til, i kilderegisterets rekkefølge. */
const kilderI = (sett: Regelsett) => {
  const brukt = new Set(sett.regler.flatMap((r) => henvisninger(r).map((h) => h.kilde)))
  return KILDER.filter((k) => brukt.has(k.id))
}

export function lagRegelrapport(sett: Regelsett = PILOTSETT, rapport: Omit<Regelrapport, 'sett' | 'fil'> = P4RAPPORT): string {
  const kilder = kilderI(sett)
  // Psychiatrienet er bare referanse (P3-arkivet), ikke et dokument som er lest.
  const hentet = [...new Set(kilder.filter((k) => k.type !== 'kildeoppføring').map((k) => k.hentet.slice(0, 10)))].sort().map(dato).join(' og ')
  const godkjent = sett.regler.filter(erKliniskGodkjent).length
  const n = sett.regler.length
  const godkjenningstekst =
    godkjent === 0
      ? 'De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent.'
      : godkjent === n
        ? 'Alle reglene er klinisk godkjent etter uavhengig faglig kontroll i nøyaktig denne versjonen; beregningene er likevel ikke empirisk validerte og erstatter ikke klinisk vurdering av den enkelte pasient.'
        : `${godkjent} av reglene er klinisk godkjent etter uavhengig faglig kontroll i nøyaktig denne versjonen; de andre er ikke, og beregningene etter dem er ikke kliniske anbefalinger. Ingen av beregningene er empirisk validerte.`
  return `# OUSFAR Verktøy – ${rapport.tittel}

<!-- Laget av \`npm run verktoy:regler -- rapport\` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett \`${sett.id}\` versjon ${sett.versjon}, regelmodell ${REGELMODELLVERSJON}, beregningsmotor ${MOTORVERSJON}. ${sett.beskrivelse}

**${n} regler, ${godkjent} klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. ${godkjenningstekst} En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i ${rapport.notater.map((n) => `\`${n}\``).join(' og ')}.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (\`docs/verktøy-p3-rettigheter.md\`).

## Oversikt

${tabell(
  ['Regel', 'Form', 'Fra → til', 'Beregnbarhet', 'Åpne valg', 'Status', 'Eksempler'],
  sett.regler.map((r) => [
    `\`${r.id}\``,
    FORM[r.plan.form],
    `${valg(r.fra)} → ${valg(r.til)}`,
    BEREGNBARHET[r.beregnbarhet],
    String(apneValg(r).length),
    statustekst(r),
    String(r.eksempler.length),
  ]),
)}

## Kilder

Hentet og lest ${hentet}. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

${tabell(
  ['Id', 'Type', 'Kilde', 'Versjon', 'SHA-256'],
  kilder.map((k) => [`[${k.id}](${k.url})`, k.type, k.tittel, k.versjon, k.sha256 ? `\`${k.sha256.slice(0, 16)}…\`` : '–']),
)}

${sett.regler.map((r) => regelavsnitt(r, sett)).join('\n\n')}
`
}
