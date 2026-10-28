/**
 * Rapportene om regelsettene, laget av reglene og beregningen så de aldri kan
 * avvike fra dem: pilotsettet (`docs/verktøy-p4-pilotsett.md`) og
 * nedtrappingsreglene med kilde- og dekningsmatrisen
 * (`docs/verktøy-p7-regelsett.md`). `npm run verktoy:regler -- rapport`
 * skriver begge; testene sier fra når de ikke er oppdatert. Psychiatrienet
 * vises bare som kildeoppføringens id.
 */
import festfil from '../../data/verktoy/fest-formuleringer.json'
import type { Festformuleringer } from '../festformuleringer'
import { beregn, kortform, MOTORVERSJON } from './beregning'
import { DEKNINGSSTATUS, NEDTRAPPINGSDEKNING, type Nedtrappingsdekning } from './dekning'
import { erKliniskGodkjent, fingeravtrykk, godkjenningsfeil } from './godkjenning'
import { KILDER, kildeFor } from './kilder'
import { lesKontrollgrunnlag, seponeringsreglerFor, stoppoppforing } from './kontroll'
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
import { NEDTRAPPINGSSETT } from './nedtrapping'
import { PILOTSETT } from './pilotsett'

export const REGELRAPPORTFIL = 'docs/verktøy-p4-pilotsett.md'
export const NEDTRAPPINGSRAPPORTFIL = 'docs/verktøy-p7-regelsett.md'

const celle = (t: string) => t.replace(/\|/g, '\\|').replace(/\n/g, ' ')
const tabell = (hode: string[], rader: string[][]) =>
  [`| ${hode.join(' | ')} |`, `| ${hode.map(() => '---').join(' | ')} |`, ...rader.map((r) => `| ${r.map(celle).join(' | ')} |`)].join('\n')
const liste = (xs: string[], ingen = '- Ingen.') => (xs.length > 0 ? xs.map((x) => `- ${x}`).join('\n') : ingen)
const tall = (x: number) => String(x).replace('.', ',')
const dato = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`

const BEREGNBARHET: Record<Regel['beregnbarhet'], string> = {
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
const statustekst = (r: Regel) =>
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
      const verdi = p.verdi === null ? '**mangler**' : `${tall(p.verdi)} ${ENHET[p.enhet]}${p.omrade ? ` (område ${tall(p.omrade[0])}–${tall(p.omrade[1])})` : ''}`
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
  return rader.length > 0 ? tabell(['Hvor', 'Parameter', 'Verdi', 'Art', 'Grunnlag'], rader) : 'Ingen; regelen har ingen beregning.'
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
      const gyldig = x.omrade ? `${tall(x.omrade[0])}–${tall(x.omrade[1])} mg` : `${x.verdier!.map(tall).join(', ')} mg`
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
    .join('\n') || 'Ingen; regelen har ingen beregning.'

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

/** Hva godkjenningen betyr for beregningene i settet, etter hvor mange regler som faktisk er klinisk godkjent. */
function godkjenningstekst(sett: Regelsett): string {
  const godkjent = sett.regler.filter(erKliniskGodkjent).length
  return godkjent === 0
    ? 'De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent.'
    : godkjent === sett.regler.length
      ? 'Alle reglene er klinisk godkjent etter uavhengig faglig kontroll i nøyaktig denne versjonen; beregningene er likevel ikke empirisk validerte og erstatter ikke klinisk vurdering av den enkelte pasient.'
      : `${godkjent} av reglene er klinisk godkjent etter uavhengig faglig kontroll i nøyaktig denne versjonen; de andre er ikke, og beregningene etter dem er ikke kliniske anbefalinger. Ingen av beregningene er empirisk validerte.`
}

const oversikt = (sett: Regelsett) =>
  tabell(
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
  )

/** Kildene `x` viser til (unntatt Psychiatrienet, som bare er referanse), i registerets rekkefølge. */
const kildetabell = (x: unknown) => {
  const brukt = new Set(henvisninger(x).map((h) => h.kilde))
  return tabell(
    ['Id', 'Type', 'Kilde', 'Versjon', 'SHA-256'],
    KILDER.filter((k) => brukt.has(k.id)).map((k) => [`[${k.id}](${k.url})`, k.type, k.tittel, k.versjon, k.sha256 ? `\`${k.sha256.slice(0, 16)}…\`` : '–']),
  )
}

export function lagRegelrapport(sett: Regelsett = PILOTSETT): string {
  const godkjent = sett.regler.filter(erKliniskGodkjent).length
  const n = sett.regler.length
  return `# OUSFAR Verktøy – P4: pilotsettet

<!-- Laget av \`npm run verktoy:regler -- rapport\` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett \`${sett.id}\` versjon ${sett.versjon}, regelmodell ${REGELMODELLVERSJON}, beregningsmotor ${MOTORVERSJON}. ${sett.beskrivelse}

**${n} regler, ${godkjent} klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. ${godkjenningstekst(sett)} En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i \`docs/verktøy-p4-regelmodell.md\`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (\`docs/verktøy-p3-rettigheter.md\`).

## Oversikt

${oversikt(sett)}

## Kilder

Hentet og lest ${dato(KILDER[0]!.hentet)}. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

${kildetabell(sett)}

${sett.regler.map((r) => regelavsnitt(r, sett)).join('\n\n')}
`
}

/* --- P7: nedtrapping av antidepressiva --------------------------------------------- */

const FEST = festfil as unknown as Festformuleringer
const FRITAK = 'Krever godkj. Fritak'

/** Preparatene FEST har for virkestoffet, som form og styrke: registrerte og markedsførte, og dem som bare finnes med godkjenningsfritak. */
function festpreparater(nokkel: string): string {
  const preparater = (FEST.virkestoffer.find((v) => v.nokkel === nokkel)?.preparater ?? []).filter((p) => p.marked === 'markedsfort' && p.kombinert_med.length === 0)
  const former = (fritak: boolean) =>
    [...new Set(preparater.filter((p) => (p.preparattype === FRITAK) === fritak).map((p) => p.navn_form_styrke.slice(p.varenavn.length).trim()))].sort((a, b) =>
      a.localeCompare(b, 'nb', { numeric: true }),
    )
  const registrert = former(false)
  const fritak = former(true).filter((f) => !registrert.includes(f))
  if (registrert.length === 0 && fritak.length === 0) return 'ingen'
  return [registrert.join(', '), fritak.length > 0 ? `${registrert.length > 0 ? 'også ' : 'bare '}godkjenningsfritak: ${fritak.join(', ')}` : ''].filter(Boolean).join('; ')
}

const STOPPTILGANG: Record<string, string> = { hentet: 'hentet', alternativ_adresse: 'hentet fra kildens egen side', utilgjengelig: 'ikke tilgjengelig' }

export function lagNedtrappingsrapport(sett: Regelsett = NEDTRAPPINGSSETT, alle: Regelsett = { ...sett, regler: [...PILOTSETT.regler, ...sett.regler] }, dekning: readonly Nedtrappingsdekning[] = NEDTRAPPINGSDEKNING): string {
  const g = lesKontrollgrunnlag()
  const godkjent = sett.regler.filter(erKliniskGodkjent).length
  const antall = (s: Nedtrappingsdekning['status']) => dekning.filter((d) => d.status === s).length
  const matrise = tabell(
    ['Virkestoff', 'OUSFAR-status', 'Regler', 'Kildens Stop-oppføring (P3)', `Norske preparater i FEST (${FEST.fest_hentet ? dato(FEST.fest_hentet) : 'ukjent dato'})`, 'Grunn', 'Åpne faglige spørsmål'],
    dekning.map((d) => {
      const { beregnbare, fagtekst } = seponeringsreglerFor(d.nokkel, alle)
      const stopp = g.kildeoppforinger.get(stoppoppforing(d.nokkel, g))
      return [
        d.nokkel,
        DEKNINGSSTATUS[d.status],
        [...beregnbare, ...fagtekst].map((r) => `\`${r.id}\``).join(', ') || '–',
        stopp ? `\`${stopp.id}\` (${STOPPTILGANG[stopp.tilgjengelighet] ?? stopp.tilgjengelighet})` : '–',
        festpreparater(d.nokkel),
        d.grunn,
        d.apne.join(' ') || '–',
      ]
    }),
  )
  const fakta = dekning.filter((d) => d.henvisninger.length > 0)
  const tidligere = dekning.filter((d) => Object.values(seponeringsreglerFor(d.nokkel, alle)).flat().some((r) => !sett.regler.includes(r))).map((d) => d.nokkel)
  return `# OUSFAR Verktøy – P7: nedtrapping av antidepressiva

<!-- Laget av \`npm run verktoy:regler -- rapport\` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene eller dekningen og lag rapporten på nytt. -->

Regelsett \`${sett.id}\` versjon ${sett.versjon}, regelmodell ${REGELMODELLVERSJON}, beregningsmotor ${MOTORVERSJON}. ${sett.beskrivelse} Bakgrunnen, valgene og de åpne faglige beslutningene står i \`docs/verktøy-p7-nedtrapping.md\`.

**${sett.regler.length} nye regler, ${godkjent} klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. ${godkjenningstekst(sett)} Hvilke doser som kan gis med norske preparater, avgjøres av doseplanmotoren (P5) med FEST; en dose som ikke kan gis nøyaktig, stopper beregningen.

## Kilde- og dekningsmatrise

Alle ${dekning.length} antidepressiva i kildetabellen (johannesurt er utelatt): ${antall('beregnbar_regel')} med beregnbar regel til faglig kontroll, ${antall('bare_fagtekst')} med bare fagtekst, ${antall('mangler_anbefaling')} der anbefaling mangler og ${antall('begrenset')} med en annen begrunnet begrensning. Ingen regel er klinisk godkjent, så verktøyet viser ingen doseplan for noen av dem ennå.

Statusen er OUSFARs og skilt fra kildens Stop-anbefaling: kolonnen for Stop-oppføringen sier bare om kilden finnes i P3-arkivet. Ingen regel bygger på teksten der, og den vises ikke. ${tidligere.length > 0 ? `Regler fra pilotsettet (P4) er tatt med for ${tidligere.join(' og ')}. ` : ''}Preparatkolonnen viser registrerte, markedsførte preparater og, for seg, dem som bare finnes med godkjenningsfritak; kombinasjonspreparater er utelatt.

${matrise}

${
  fakta.length > 0
    ? `**Kildegrunnlaget for virkestoffene uten beregnbar regel:**\n\n${liste(fakta.map((d) => `**${d.nokkel}:** ${d.henvisninger.map(henvisning).join(' ')}`))}`
    : ''
}

## Oversikt over de nye reglene

${oversikt(sett)}

## Kilder

Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet 28.10.2026.

${kildetabell([sett, dekning])}

${sett.regler.map((r) => regelavsnitt(r, sett)).join('\n\n')}
`
}
