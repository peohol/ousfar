/**
 * Kontrollgrunnlaget for faktumrettelsene i `FAKTUMRETTELSER` (`regler/bygg.ts`,
 * `regler/rettelse.ts`), og registreringen av kontrollørens vurdering: hvilke
 * regler som har fått en ny versjon, nøyaktig hva som er endret i hver, hva
 * kontrolløren har godkjent og disponert, og om brukeren ser det samme i
 * testmatrisen fra P11 som før rettelsen.
 *
 * Sammenligningen er mellom regelsettene slik de var før rettelsene
 * (`*_FOR_RETTELSENE`, appversjon 1.122.1) og regelsettene appen bruker nå.
 * Modulen brukes bare av skriptet og testene; `npm run verktoy:regler --
 * rettelse` skriver rapporten, og testene sier fra når den ikke er oppdatert.
 */
import { norskDato } from './motor/byggesteiner'
import { FAKTUMRETTELSER } from './regler/bygg'
import { erKliniskGodkjent, fingeravtrykk, kanonisk, KONTROLLUTFALL, kontrollutfall } from './regler/godkjenning'
import type { Kildehenvisning, Regel, Regelsett } from './regler/modell'
import { ETTER_RETTELSENE } from './kontrollsett'
import { NEDTRAPPINGSSETT_FOR_RETTELSENE } from './regler/nedtrapping'
import { kildelinje, kildeliste, regellinje, settlinje } from './planvisning'
import { kjorKasus, PILOTKASUS, type Pilotkasus, type Pilotutfall, type Uttrekkene } from './regler/pilotmatrise'
import { PILOTSETT_FOR_RETTELSENE } from './regler/pilotsett'
import { liste, tabell } from './regler/rapport'

export const RETTELSESKONTROLLFIL = 'docs/verktøy-rettelse-langvarig.md'

/** Regelsettene slik de var før rettelsene, i samme rekkefølge som `REGELSETTENE`. */
export const FOR_RETTELSENE: readonly Regelsett[] = [PILOTSETT_FOR_RETTELSENE, NEDTRAPPINGSSETT_FOR_RETTELSENE]

/** Én regel som viser til et rettet faktum: versjonen før rettelsen, og versjonen appen bruker nå. */
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

/** Settet regelen hører til blant `settene`. */
const settMed = (r: Regel, settene: readonly Regelsett[]) => settene.find((s) => s.regler.includes(r))!

/** Hver regel som har fått en ny versjon fra settene før rettelsene til settene appen bruker. */
export function rettelsesrader(for_: readonly Regelsett[] = FOR_RETTELSENE, na: readonly Regelsett[] = ETTER_RETTELSENE): Rettelsesrad[] {
  return for_.flatMap((s) => {
    const etter = na.find((x) => x.id === s.id)!.regler
    return s.regler.flatMap((r, i) => (etter[i] === r ? [] : [{ sett: s.id, for: r, etter: etter[i]!, steder: forskjeller(innhold(r), innhold(etter[i]!)) }]))
  })
}

/** Reglene som var klinisk godkjent før rettelsen; kontrolløren ble bedt om å godkjenne den nye versjonen av hver. */
export const tilGodkjenning = (rader: readonly Rettelsesrad[]) => rader.filter((x) => erKliniskGodkjent(x.for))

/** Én linje i teksten brukeren ser og kopierer som er ulik etter rettelsen, og hvorfor. */
export interface Linjeendring {
  ny: string
  for: string
  hvorfor: string
}

/**
 * Linjene i teksten brukeren ser og kopierer (`planTekst`) som er ulike med den
 * nye versjonen av hver godkjent regel, uten at planen er det: regelversjonen
 * og regelsettets versjon under «Versjoner», og kildene der stedene er endret.
 * Alt annet i planen skal være likt.
 */
export function forventedeLinjeendringer(rader: readonly Rettelsesrad[]): Map<string, Linjeendring[]> {
  const linje = (r: Regel) => regellinje({ ...r, fingeravtrykk: fingeravtrykk(r) })
  return new Map(
    tilGodkjenning(rader).map(({ for: f, etter }) => {
      const for_ = new Map(kildeliste(f).map((k) => [k.url, kildelinje(k)]))
      const kilder = kildeliste(etter).flatMap((k): Linjeendring[] => {
        const forut = for_.get(k.url)
        return forut !== undefined && forut !== kildelinje(k) ? [{ ny: kildelinje(k), for: forut, hvorfor: 'Stedene i kilden der de nye faktaene står.' }] : []
      })
      return [
        etter.id,
        [
          { ny: linje(etter), for: linje(f), hvorfor: 'Den nye regelversjonen.' },
          { ny: settlinje(settMed(etter, ETTER_RETTELSENE)), for: settlinje(settMed(f, FOR_RETTELSENE)), hvorfor: 'Ny versjon av regelsettet med de nye regelversjonene.' },
          ...kilder,
        ],
      ] as const
    }),
  )
}

type Kjoring = ReturnType<typeof kjorKasus>

/**
 * Det brukeren ser av et utfall: hele teksten for en plan, med de forventede
 * linjeendringene for regelen planen er beregnet etter ført tilbake, og
 * grunnene ellers. Godkjenningslinjen står bare på skjermen og sier hvem som
 * har godkjent hvilken versjon; den sammenlignes for seg (avsnitt 3 i rapporten).
 */
export function synlig({ resultat, tekst, ...u }: Kjoring, endringer: ReadonlyMap<string, readonly Linjeendring[]> = new Map()): string {
  const tilbake = (endringer.get(resultat?.regel.id ?? '') ?? []).reduce((t, x) => t.split(`\n- ${x.ny}\n`).join(`\n- ${x.for}\n`), `${tekst ?? ''}\n`)
  return JSON.stringify({ ...u, tekst: tilbake })
}

export interface Matrisesammenligning {
  kasus: Pilotkasus
  for: Kjoring
  etter: Kjoring
  lik: boolean
}

/** Hvert kasus i testmatrisen med regelsettene før rettelsene og med regelsettene appen bruker nå. */
export function matrisesammenligning(rader: readonly Rettelsesrad[], uttrekkene: Uttrekkene): Matrisesammenligning[] {
  const endringer = forventedeLinjeendringer(rader)
  return PILOTKASUS.map((kasus) => {
    // Settversjonen planen oppgir slås opp blant settene appen brukte etter rettelsene, slik kontrollen ble gjort.
    const for_ = kjorKasus(kasus, uttrekkene, FOR_RETTELSENE, ETTER_RETTELSENE)
    const etter = kjorKasus(kasus, uttrekkene, ETTER_RETTELSENE)
    return { kasus, for: for_, etter, lik: synlig(for_) === synlig(etter, endringer) }
  })
}

/* --- Kontrollørens vurdering ------------------------------------------------------ */

/** Spørsmålene i kontrollgrunnlaget og kontrollørens svar 03.11.2026 (PR #309, gjennomgangen av a38fac14), kort gjengitt. */
export const RETTELSESSPORSMAL: { nr: string; sporsmal: string; svar: string }[] = [
  {
    nr: 'R1',
    sporsmal: 'Godkjenner du den nye versjonen av hver av de to godkjente reglene, for nøyaktig versjonen og fingeravtrykket og med samme avgrensning som den godkjente versjonen?',
    svar: 'Ja, begrenset klinisk godkjenning av nøyaktig de to nye versjonene og fingeravtrykkene, med samme kliniske omfang som før. Avgrensningen står i avsnitt 3. Godkjenningen er en korrigering av kildebeskrivelsen, ikke en ny generell godkjenning av algoritmer for nedtrapping.',
  },
  {
    nr: 'R2',
    sporsmal: 'Skal de andre nye versjonene få samme utfall som versjonen du vurderte 31.10.2026, «kontrollert, ikke godkjent», for nøyaktig den nye versjonen og fingeravtrykket?',
    svar: 'Ja. Ingen av dem kan gi kliniske doseplaner som følge av dette, og den separate substanskontrollen som kreves før en senere aktivering, bortfaller ikke.',
  },
  {
    nr: 'R3',
    sporsmal: 'Er det akseptabelt at formuleringen din er delt i to fakta, med hvert sitt sted i kilden («If you have been taking antidepressants for longer» og «Examples of tapering plans»)?',
    svar: 'Ja. Oppdelingen er presis og kildeforankret.',
  },
  {
    nr: 'R4',
    sporsmal: 'Kan godkjenningene og disposisjonen registreres i samme PR før den slås sammen, slik at appen bytter til de nye versjonene samtidig og ingen godkjent plan forsvinner underveis?',
    svar: 'Ja, under sluttkontroll. Godkjenningene og disposisjonen registreres sammen med regelsettene, og den endelige endringen legges fram for en ny uavhengig kontroll før sammenslåing.',
  },
]

/* --- Rapporten -------------------------------------------------------------------- */

const kode = (x: string) => `\`${x}\``
const versjonstekst = (r: Regel) => `${r.versjon} (${kode(fingeravtrykk(r))})`
const henvisningstekst = (h: Kildehenvisning) => ('sted' in h ? `«${h.faktum}» (${kode(h.kilde)}, ${h.sted})` : kode(h.kilde))

/** Avgrensningen i den siste kliniske godkjenningen av regelen. */
const avgrensning = (r: Regel) => [...r.godkjenning.historikk].reverse().find((s) => s.status === 'klinisk_godkjent')?.merknad ?? '–'

/** Status og godkjenningslinje for en regel, slik avsnitt 3 viser dem. */
const godkjenningsrad = (r: Regel) => `${KONTROLLUTFALL[kontrollutfall(r)]}, versjon ${r.versjon}`

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
    ['Regel', 'Regelsett', 'Før rettelsen', 'Nå', 'Steder som er endret'],
    rader.map((x) => [kode(x.for.id), kode(x.sett), `${KONTROLLUTFALL[kontrollutfall(x.for)]}, ${versjonstekst(x.for)}`, `${KONTROLLUTFALL[kontrollutfall(x.etter)]}, ${versjonstekst(x.etter)}`, String(x.steder.length)]),
  )
  const endringer = rader.map((x) => `- ${kode(x.for.id)}: ${x.steder.map(kode).join(', ')}`).join('\n')
  const godkjenningstabell = tabell(
    ['Regel', 'Før rettelsen', 'Nå', 'Godkjenningen nå'],
    godkjente.map((x) => [kode(x.for.id), godkjenningsrad(x.for), godkjenningsrad(x.etter), avgrensning(x.etter)]),
  )
  const settene = tabell(
    ['Regelsett', 'Før rettelsen', 'Nå'],
    FOR_RETTELSENE.map((s) => [kode(s.id), String(s.versjon), String(ETTER_RETTELSENE.find((x) => x.id === s.id)!.versjon)]),
  )
  const linjetabell = tabell(
    ['Regel', 'Nå', 'Før rettelsen', 'Hvorfor'],
    [...forventedeLinjeendringer(rader)].flatMap(([id, linjer]) => linjer.map((x) => [kode(id), x.ny, x.for, x.hvorfor])),
  )
  const avvikstabell = tabell(
    ['Kasus', 'Hva', 'Før rettelsen', 'Nå'],
    ulike.map((x) => [x.kasus.id, x.kasus.hva, utfallstekst(x.for), utfallstekst(x.etter)]),
  )
  return `<!-- Laget av \`npm run verktoy:regler -- rettelse\`; rediger ikke for hånd. -->
# Rettelsen av faktumet om små reduksjoner fra starten (RCPsych): kontrollgrunnlag og registrering

Grunnlaget for kontrollørens vurdering av de nye regelversjonene etter rettelsen av \`RCPSYCH.langvarig\`, som kontrolløren ba om i vurderingen 03.11.2026 (\`docs/verktøy-kildefunn-1-2.md\` §8), og registreringen av vurderingen.

**Kontrollørens vurdering 03.11.2026 er registrert** (avsnitt 6). Appen bruker de nye versjonene. ${godkjente.map((x) => `${kode(x.etter.id)} versjon ${x.etter.versjon}`).join(' og ')} er klinisk godkjent med samme kliniske omfang som før. De ${rader.length - godkjente.length} andre er kontrollert og ikke godkjent, som før rettelsen.

## 1. Rettelsen

${rettelser}

## 2. Slik er rettelsen gjort

${liste([
  'Reglene bygges fortsatt med faktumet slik det stod (`RCPSYCH_TIDLIGERE` i `src/verktoy/regler/bygg.ts`), så godkjenningene og disposisjonen 31.10.2026 kan etterprøves mot nøyaktig innholdet de gjaldt. Regelsettene slik de var før rettelsene, står som `PILOTSETT_FOR_RETTELSENE` og `NEDTRAPPINGSSETT_FOR_RETTELSENE`; appen bruker dem ikke.',
  'Rettelsen (`FAKTUMRETTELSER`, `src/verktoy/regler/rettelse.ts`) bytter faktumet i hver regel som viser til det, øker versjonen med én og gir historikken stegene utkast og til faglig kontroll for den nye versjonen. Ingenting annet i regelen endres, og de tidligere stegene står urørt.',
  'Kontrollørens vurdering står på rettelsen (`kontroll`). Godkjenningen (`godkjenn`) og disposisjonen (`disponer`) registreres bare for nøyaktig versjonen og fingeravtrykket kontrolløren så; er en regel endret, får den ikke steget og er ikke godkjent.',
  'En ny regel bruker det rettede faktumet direkte (`RCPSYCH.langvarig` og `RCPSYCH.proporsjonal`).',
])}

## 3. Regelversjonene

${rader.length} regler viser til faktumet og har fått en ny versjon. Ingen andre regler er endret.

${versjoner}

De ${godkjente.length} som var klinisk godkjent før rettelsen, er godkjent på nytt:

${godkjenningstabell}

Regelsettene har fått en ny versjon:

${settene}

## 4. Hva som er endret i hver regel

Stedene der den nye versjonen skiller seg fra versjonen før rettelsen, utenom versjonsnummeret og godkjenningshistorikken. Hvert sted er en liste over henvisninger der det gamle faktumet er byttet med de nye; ingen verdi, betingelse, beregning eller annen tekst er endret (testene kontrollerer det).

${endringer}

## 5. Testmatrisen før og etter

Alle ${sammenligning.length} kasusene i testmatrisen fra P11 (\`docs/verktøy-p11-testmatrise.md\`) er kjørt to ganger: med regelsettene slik de var før rettelsene (appversjon 1.122.1), og med regelsettene appen bruker nå. Sammenligningen gjelder hele det brukeren ser: radene i planen og hele teksten som kopieres, med advarsler, avvik, antakelser, usikkerhet, preparater, kontroller, kilder og versjoner, og grunnene når planen stopper. Før sammenligningen er bare linjene i tabellen under ført tilbake: regelversjonen og regelsettets versjon under «Versjoner» og stedene i RCPsych under «Kilder». Hver av dem må stå nøyaktig som i tabellen for å bli ført tilbake. Godkjenningslinjen på skjermen står i avsnitt 3. ${sammenligning.length - ulike.length} kasus gir nøyaktig det samme for brukeren. ${ulike.length === 0 ? 'Ingen gir noe annet.' : `${ulike.length} gir noe annet, og bare fordi kasuset prøver neste versjonsnummer, som nå er ett høyere:`}

${ulike.length > 0 ? avvikstabell : ''}

Linjene som er ført tilbake:

${linjetabell}

## 6. Kontrollørens vurdering 03.11.2026

Spørsmålene i kontrollgrunnlaget og svarene fra ChatGPT (uavhengig kontrollør) i PR #309, gjennomgangen av \`a38fac14\`, kort gjengitt:

${tabell(['#', 'Spørsmål', 'Svar'], RETTELSESSPORSMAL.map((x) => [x.nr, x.sporsmal, x.svar]))}

## 7. Det som er registrert

${liste([
  'Godkjenningen av de to nye versjonene, med kontrollørens navn, dato og avgrensning, for nøyaktig versjonen og fingeravtrykket i avsnitt 3. Claude registrerer aldri en godkjenning kontrolløren ikke har gitt.',
  'Disposisjonen av de andre nye versjonene som kontrollert, ikke godkjent, for nøyaktig hver versjon og hvert fingeravtrykk.',
  'Regelsettene med de nye versjonene og nye settversjoner, i samme endring, så ingen godkjent plan forsvinner underveis. Testmatrisen, kontrollgrunnlaget for VDK-3, låsetestene og rapportene gjelder de nye versjonene.',
  'Den endelige endringen legges fram for en ny uavhengig kontroll før sammenslåing.',
])}
`
}
