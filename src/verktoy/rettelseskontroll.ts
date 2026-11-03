/**
 * Kontrollgrunnlaget for faktumrettelsene i `FAKTUMRETTELSER` (`regler/bygg.ts`,
 * `regler/rettelse.ts`): hvilke regler som får en ny versjon, nøyaktig hva som
 * er endret i hver, og hva de klinisk godkjente reglene ville gitt i
 * testmatrisen fra P11 om den nye versjonen ble godkjent.
 *
 * Appen bruker fortsatt versjonene som er godkjent eller vurdert; de nye
 * versjonene tas i bruk først når kontrollørens vurdering av dem er
 * registrert. For å vise hva den nye versjonen av en godkjent regel ville
 * gitt, regnes kasusene på en kopi med en simulert godkjenning av nøyaktig den
 * versjonen (`simulerGodkjenning`), som i VDK-3. Kopien lagres aldri og går
 * aldri til verktøysiden. Modulen brukes bare av skriptet og testene;
 * `npm run verktoy:regler -- rettelse` skriver rapporten, og testene sier fra
 * når den ikke er oppdatert.
 */
import { norskDato } from './motor/byggesteiner'
import { FAKTUMRETTELSER } from './regler/bygg'
import { erKliniskGodkjent, fingeravtrykk, kanonisk, KONTROLLUTFALL, kontrollutfall } from './regler/godkjenning'
import type { Kildehenvisning, Regel, Regelsett } from './regler/modell'
import { kjorKasus, PILOTKASUS, type Pilotkasus, type Pilotutfall, SIMULERT_KONTROLLOR, simulerGodkjenning, type Uttrekkene } from './regler/pilotmatrise'
import { liste, tabell } from './regler/rapport'
import { rett } from './regler/rettelse'
import { REGELSETT, REGELSETTENE } from './tilgjengelighet'

export const RETTELSESKONTROLLFIL = 'docs/verktøy-rettelse-langvarig.md'

/** Én regel som viser til et rettet faktum: versjonen appen bruker, og den nye. */
export interface Rettelsesrad {
  sett: string
  for: Regel
  etter: Regel
  /** Stedene i regelen der innholdet er ulikt; med bare faktumet rettet er hvert av dem en liste over henvisninger. */
  steder: string[]
}

/** Stiene der `a` og `b` er ulike, så nært verdiene som mulig. */
export function forskjeller(a: unknown, b: unknown, sti = ''): string[] {
  if (kanonisk(a) === kanonisk(b)) return []
  if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) return a.flatMap((x, i) => forskjeller(x, b[i], `${sti}[${i}]`))
  const objekt = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x) && !(x instanceof RegExp)
  if (objekt(a) && objekt(b)) return [...new Set([...Object.keys(a), ...Object.keys(b)])].flatMap((k) => forskjeller(a[k], b[k], sti ? `${sti}.${k}` : k))
  return [sti]
}

/** Regelen uten det som ikke er faglig innhold: godkjenningen og versjonsnummeret. */
const innhold = ({ godkjenning: _, versjon: __, ...r }: Regel) => r

/** Hver regel i appens regelsett som rettelsene gir en ny versjon. */
export function rettelsesrader(regelsett: readonly Regelsett[] = REGELSETTENE): Rettelsesrad[] {
  return regelsett.flatMap((s) => {
    const etter = rett(s.regler, FAKTUMRETTELSER)
    return s.regler.flatMap((r, i) => (etter[i] === r ? [] : [{ sett: s.id, for: r, etter: etter[i]!, steder: forskjeller(innhold(r), innhold(etter[i]!)) }]))
  })
}

/** Den nye versjonen av hver godkjent regel, slik kontrolløren bes godkjenne den. */
export const tilGodkjenning = (rader: readonly Rettelsesrad[]) => rader.filter((x) => erKliniskGodkjent(x.for))

/** Appens regelsett med den nye versjonen av hver godkjent regel, simulert godkjent på en kopi. */
export function settMedNyeVersjoner(rader: readonly Rettelsesrad[], dato = FAKTUMRETTELSER.at(-1)!.dato): Regelsett {
  const nye = new Map(
    tilGodkjenning(rader).map(({ etter }) => {
      const kopi = structuredClone(etter)
      simulerGodkjenning(kopi, { id: etter.id, versjon: etter.versjon, fingeravtrykk: fingeravtrykk(etter) }, dato)
      return [etter.id, kopi] as const
    }),
  )
  return { ...REGELSETT, regler: REGELSETT.regler.map((r) => nye.get(r.id) ?? r) }
}

/** Det brukeren ser av et utfall, uten beregningen bak. */
const synlig = ({ resultat: _, tekst: __, ...u }: Pilotutfall & { resultat?: unknown; tekst?: unknown }) => JSON.stringify(u)

export interface Matrisesammenligning {
  kasus: Pilotkasus
  i_dag: Pilotutfall
  ny_versjon: Pilotutfall
  lik: boolean
}

/** Hvert kasus i testmatrisen med appens regler og med de nye versjonene av de godkjente reglene. */
export function matrisesammenligning(rader: readonly Rettelsesrad[], uttrekkene: Uttrekkene): Matrisesammenligning[] {
  const nye = settMedNyeVersjoner(rader)
  return PILOTKASUS.map((kasus) => {
    const i_dag = kjorKasus(kasus, uttrekkene)
    const ny_versjon = kjorKasus(kasus, uttrekkene, nye)
    return { kasus, i_dag, ny_versjon, lik: synlig(i_dag) === synlig(ny_versjon) }
  })
}

/* --- Spørsmålene til kontrolløren ------------------------------------------------- */

export const RETTELSESSPORSMAL: { nr: string; sporsmal: string; anbefalt: string }[] = [
  {
    nr: 'R1',
    sporsmal: 'Godkjenner du den nye versjonen av hver av de to godkjente reglene i avsnitt 3, for nøyaktig versjonen og fingeravtrykket i tabellen og med samme avgrensning som den godkjente versjonen?',
    anbefalt: 'Ja. Bare faktumet er endret (avsnitt 4), og testmatrisen gir det samme utfallet for alle kasusene unntatt de to som prøver neste versjonsnummer (avsnitt 5).',
  },
  {
    nr: 'R2',
    sporsmal: 'Skal de andre nye versjonene få samme utfall som versjonen du vurderte 31.10.2026, «kontrollert, ikke godkjent», registrert for nøyaktig den nye versjonen og fingeravtrykket?',
    anbefalt: 'Ja. Ellers står de som «ikke ferdig kontrollert» selv om ingenting annet enn faktumet er endret. Ingen av dem blir tilgjengelige i verktøyet.',
  },
  {
    nr: 'R3',
    sporsmal: 'Er det akseptabelt at formuleringen din er delt i to fakta, med hvert sitt sted i kilden («If you have been taking antidepressants for longer» og «Examples of tapering plans»)?',
    anbefalt: 'Ja. Et faktum kan være høyst 250 tegn, og den siste setningen gjelder et annet sted i veiledningen. Ordlyden er din, uendret.',
  },
  {
    nr: 'R4',
    sporsmal: 'Kan godkjenningene og disposisjonen registreres i denne PR-en før den slås sammen, slik at appen bytter til de nye versjonene samtidig og ingen godkjent plan forsvinner underveis?',
    anbefalt: 'Ja. Til da bruker appen versjonene som er godkjent i dag, i tråd med vurderingen din om at det ikke er grunnlag for å deaktivere dem.',
  },
]

/* --- Rapporten -------------------------------------------------------------------- */

const kode = (x: string) => `\`${x}\``
const versjonstekst = (r: Regel) => `${r.versjon} (${kode(fingeravtrykk(r))})`
const henvisningstekst = (h: Kildehenvisning) => ('sted' in h ? `«${h.faktum}» (${kode(h.kilde)}, ${h.sted})` : kode(h.kilde))

/** Avgrensningen i den siste kliniske godkjenningen av regelen. */
const avgrensning = (r: Regel) => [...r.godkjenning.historikk].reverse().find((s) => s.status === 'klinisk_godkjent')?.merknad ?? '–'

function utfallstekst(u: Pilotutfall): string {
  if (u.utfall === 'plan') return `plan: ${u.linjer.join(' / ')}`
  if (u.utfall === 'stopp' || u.utfall === 'mangler') return `${u.utfall}: ${u.grunner.join(' ')}`
  if (u.utfall === 'ingen') return `ingen (${u.status})`
  return u.utfall
}

export function lagRettelseskontroll(uttrekkene: Uttrekkene): string {
  const rader = rettelsesrader()
  const godkjente = tilGodkjenning(rader)
  const sammenligning = matrisesammenligning(rader, uttrekkene)
  const ulike = sammenligning.filter((x) => !x.lik)
  const rettelser = FAKTUMRETTELSER.map((r) => `**${norskDato(r.dato)}.** Før: ${henvisningstekst(r.fra)}\n\nEtter: ${r.til.map(henvisningstekst).join('\n\n')}\n\n${r.grunn}`).join('\n\n')
  const versjoner = tabell(
    ['Regel', 'Regelsett', 'Utfall i dag', 'Versjon i dag', 'Ny versjon', 'Steder som er endret'],
    rader.map((x) => [kode(x.for.id), kode(x.sett), KONTROLLUTFALL[kontrollutfall(x.for)], versjonstekst(x.for), versjonstekst(x.etter), String(x.steder.length)]),
  )
  const endringer = rader.map((x) => `- ${kode(x.for.id)}: ${x.steder.map(kode).join(', ')}`).join('\n')
  const godkjenningstabell = tabell(
    ['Regel', 'Godkjent i dag', 'Ny versjon til godkjenning', 'Avgrensningen i dagens godkjenning'],
    godkjente.map((x) => [kode(x.for.id), versjonstekst(x.for), versjonstekst(x.etter), avgrensning(x.for)]),
  )
  const avvikstabell = tabell(
    ['Kasus', 'Hva', 'I dag', 'Med den nye versjonen'],
    ulike.map((x) => [x.kasus.id, x.kasus.hva, utfallstekst(x.i_dag), utfallstekst(x.ny_versjon)]),
  )
  return `<!-- Laget av \`npm run verktoy:regler -- rettelse\`; rediger ikke for hånd. -->
# Rettelsen av faktumet om små reduksjoner fra starten (RCPsych): kontrollgrunnlag

Grunnlag for kontrollørens vurdering av de nye regelversjonene etter rettelsen av \`RCPSYCH.langvarig\`, som kontrolløren ba om i vurderingen 03.11.2026 (\`docs/verktøy-kildefunn-1-2.md\` §8).

**Appen er uendret.** Den bruker fortsatt versjonene som er godkjent eller vurdert i dag. De nye versjonene tas i bruk først når kontrollørens vurdering av dem er registrert. Ingen godkjenning er registrert.

## 1. Rettelsen

${rettelser}

## 2. Slik er rettelsen gjort

${liste([
  'Reglene bygges fortsatt med faktumet slik det stod (`RCPSYCH_TIDLIGERE` i `src/verktoy/regler/bygg.ts`), så godkjenningene og disposisjonen 31.10.2026 kan etterprøves mot nøyaktig innholdet de gjaldt.',
  'Rettelsen (`FAKTUMRETTELSER`, `src/verktoy/regler/rettelse.ts`) bytter faktumet i hver regel som viser til det, øker versjonen med én og gir historikken stegene utkast og til faglig kontroll for den nye versjonen. Ingenting annet i regelen endres, og de tidligere stegene står urørt.',
  'En ny regel bruker det rettede faktumet direkte (`RCPSYCH.langvarig` og `RCPSYCH.proporsjonal`).',
])}

## 3. Regelversjonene

${rader.length} regler viser til faktumet og får en ny versjon. Ingen andre regler endres.

${versjoner}

De ${godkjente.length} som er klinisk godkjent i dag, bes godkjent på nytt med samme avgrensning:

${godkjenningstabell}

## 4. Hva som er endret i hver regel

Stedene der den nye versjonen skiller seg fra versjonen i dag, utenom versjonsnummeret og godkjenningshistorikken. Hvert sted er en liste over henvisninger der det gamle faktumet er byttet med de nye; ingen verdi, betingelse, beregning eller annen tekst er endret (testene kontrollerer det).

${endringer}

## 5. De godkjente reglene i testmatrisen

Alle ${sammenligning.length} kasusene i testmatrisen fra P11 (\`docs/verktøy-p11-testmatrise.md\`) er kjørt to ganger: med appens regler i dag, og med den nye versjonen av hver godkjent regel på en kopi med en simulert godkjenning («${SIMULERT_KONTROLLOR}»). ${sammenligning.length - ulike.length} kasus gir nøyaktig det samme for brukeren. ${ulike.length === 0 ? 'Ingen gir noe annet.' : `${ulike.length} gir noe annet, og bare fordi kasuset prøver neste versjonsnummer, som nå er ett høyere:`}

${ulike.length > 0 ? avvikstabell : ''}

## 6. Spørsmål til kontrolløren

${tabell(['#', 'Spørsmål', 'Anbefalt svar'], RETTELSESSPORSMAL.map((x) => [x.nr, x.sporsmal, x.anbefalt]))}

## 7. Når kontrollen er gitt

${liste([
  'Godkjenningen av hver ny versjon registreres med kontrollørens navn, dato og avgrensning, for nøyaktig versjonen og fingeravtrykket over, og disposisjonen av de andre nye versjonene registreres på samme måte. Claude registrerer aldri en godkjenning kontrolløren ikke har gitt.',
  'Deretter tas rettelsen i bruk i regelsettene, og testmatrisen, kontrollgrunnlaget for VDK-3 (forslag 1 gjelder fire av reglene), låsetestene og rapportene oppdateres til de nye versjonene i samme PR.',
  'Blir en ny versjon ikke godkjent, tas rettelsen ikke i bruk før saken er avklart med bidragsyteren og kontrolløren.',
])}
`
}
