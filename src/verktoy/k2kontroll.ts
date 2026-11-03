/**
 * Kontrollgrunnlaget for K2 (`docs/verktøy-k2-kontrollgrunnlag.md`): de
 * komplette antidepressivbyttene i `regler/antidepressivbytter.ts` kjørt
 * gjennom den samme veien som verktøysiden (`kjorKasus`), med preparatene i
 * det lagrede FEST-uttrekket for K2.
 *
 * Reglene er ikke godkjent. Planene vises på en kopi med en simulert
 * godkjenning bundet til versjonen og fingeravtrykket under kontroll
 * (`somGodkjent`), så kontrolløren ser nøyaktig det appen ville vist om den
 * versjonen ble godkjent. Uten den simulerte godkjenningen sier verktøyet at
 * faglig kontroll gjenstår, og det godkjente startforløpet fra sertralin til
 * mirtazapin (versjon 10) er fortsatt det appen bruker.
 *
 * Kasusene er syntetiske: bare doser og svar valgt for å prøve reglene, også
 * ved grensene. `npx vite-node scripts/verktoy-antidepressivbytter.ts -- rapport`
 * skriver rapporten, og testene sier fra når den ikke er oppdatert.
 */
import type { Festuttrekk } from './regler/aksepttest'
import { BYTTESETT } from './regler/antidepressivbytter'
import { fingeravtrykk } from './regler/godkjenning'
import { alleGrunnlag, type Regel } from './regler/modell'
import { avregistrert, avvikFra, kjorKasus, type Pilotkasus, SIMULERT_KONTROLLOR, simulerGodkjenning, type Uttrekkene } from './regler/pilotmatrise'
import type { Regelrapport } from './regler/rapport'
import { liste, tabell, tall } from './regler/rapport'
import { REGELSETTENE, type Verktoyvalg } from './tilgjengelighet'

export const FEST_K2 = 'src/data/verktoy/fest-antidepressivbytter.json'
export const K2_KONTROLLFIL = 'docs/verktøy-k2-kontrollgrunnlag.md'
export const K2_REGELRAPPORT: Regelrapport = {
  fil: 'docs/verktøy-k2-antidepressivbytter-regler.md',
  tittel: 'K2: komplette bytter mellom antidepressiva (til faglig kontroll)',
  sett: BYTTESETT,
  notater: ['docs/verktøy-k2-antidepressivbytter.md', 'docs/verktøy-p4-regelmodell.md'],
}

/** Settene appen bruker, med K2-settet i tillegg, så kasusene også viser at det godkjente startforløpet ikke faller bort. */
export const K2_SETTENE = [...REGELSETTENE.filter((s) => s.id !== BYTTESETT.id), BYTTESETT]

/** Dagen kontrollgrunnlaget ble laget; den simulerte godkjenningen dateres hit. */
const DATO = '2026-11-03'
const VERKTOY = 'bytte-antidepressiv'

const valgFor = (r: Regel): Verktoyvalg => {
  if (r.fra.type !== 'virkestoff' || r.til?.type !== 'virkestoff') throw new Error(`${r.id} er ikke et bytte mellom to virkestoffer`)
  return { fra: { nokkel: r.fra.nokkel, formulering: 'standard' }, til: { nokkel: r.til.nokkel, formulering: 'standard' } }
}

/**
 * Regelen på en kopi med simulert avklaring av hvert åpne OUSFAR-valg og en
 * simulert klinisk godkjenning av nøyaktig det innholdet. En regel med åpne
 * valg kan aldri godkjennes, så en virkelig godkjenning krever en ny versjon
 * med kontrollørens avklaringer; kopien viser hva den ville gitt om valgene
 * godtas uendret. Endres noe annet, stemmer ikke fingeravtrykket.
 */
export function somAvklartOgGodkjent(x: Regel): void {
  for (const [, g] of alleGrunnlag(x)) {
    if (g.type === 'ousfar_vurdering' && !g.avklaring) {
      g.avklaring = { dato: DATO, av: SIMULERT_KONTROLLOR, rolle: 'uavhengig_kontrollor', regelversjon: x.versjon, merknad: 'Simulert avklaring, bare i kontrollgrunnlaget.' }
    }
  }
  simulerGodkjenning(x, { id: x.id, versjon: x.versjon, fingeravtrykk: fingeravtrykk(x) }, DATO)
}

const simulert = (r: Regel): NonNullable<Pilotkasus['regel']> => ({ id: r.id, endre: { hva: `simulert avklaring og klinisk godkjenning av versjon ${r.versjon}, bare på en kopi`, endre: somAvklartOgGodkjent } })

/** Bytter der et godkjent startforløp allerede finnes; det skal fortsatt være det verktøyet bruker til den komplette regelen er godkjent. */
const GODKJENT_START: Record<string, string> = { 'bytte-sertralin-mirtazapin': 'det godkjente startforløpet (kryssnedtrapping-sertralin-mirtazapin v10)' }

/** Ett kasus i kontrollgrunnlaget, med regelen det gjelder. */
export interface K2kasus extends Pilotkasus {
  regelId: string
}

const startdoser = (r: Regel) => r.inndata.find((x) => x.navn === 'startdose')?.verdier ?? []
const maldoser = (r: Regel) => r.inndata.find((x) => x.navn === 'maldose')?.verdier ?? []

/**
 * Kasusene for én regel: hver kombinasjon av startdose og vedlikeholdsdose i
 * regelen (de komplette planene), og stoppene ved grensene: en dose utenfor,
 * en vedlikeholdsdose utenfor eller ikke valgt, hvert unntak besvart ja og
 * ubesvart, hver bekreftelse som mangler, en styrke som er avregistrert,
 * foreldet FEST og et endret fingeravtrykk. Til slutt hva appen gir uten
 * godkjenning.
 */
export function kasusFor(r: Regel): K2kasus[] {
  const valg = valgFor(r)
  const fra = valg.fra.nokkel
  const til = valg.til!.nokkel
  const g = simulert(r)
  const hoy = String(startdoser(r).at(-1))
  const mal = String(maldoser(r).at(-1))
  const felles = { regelId: r.id, verktoy: VERKTOY, valg, uttrekk: 'aksept' as const, regel: g }
  const stopp = (id: string, hva: string, x: Partial<Pilotkasus>, grunner: string[], kategori: Pilotkasus['kategori'] = 'pasientforhold'): K2kasus => ({
    ...felles,
    id: `${r.id}:${id}`,
    kategori,
    hva,
    dose: hoy,
    skjema: { maldose: mal },
    ...x,
    forventet: { utfall: 'stopp', grunner },
  })
  return [
    ...startdoser(r).flatMap((d) =>
      maldoser(r).map(
        (m): K2kasus => ({
          ...felles,
          id: `${r.id}:${d}-${m}`,
          kategori: 'vanlig_dose',
          hva: `${fra} ${tall(d)} mg til ${til} ${tall(m)} mg`,
          dose: String(d),
          skjema: { maldose: String(m), startdato: '2026-11-09' },
          forventet: { utfall: 'plan', linjer: [] },
        }),
      ),
    ),
    stopp('dose-utenfor', `${fra} ${tall(startdoser(r)[0]! * 1.5)} mg, en dose regelen ikke gjelder for`, { dose: String(startdoser(r)[0]! * 1.5) }, ['er utenfor det regelen gjelder for'], 'uvanlig_dose'),
    stopp('maldose-utenfor', `vedlikeholdsdose ${til} ${tall(maldoser(r).at(-1)! * 1.5)} mg`, { skjema: { maldose: String(maldoser(r).at(-1)! * 1.5) } }, ['er utenfor det regelen gjelder for'], 'uvanlig_dose'),
    { ...stopp('uten-maldose', 'ingen vedlikeholdsdose valgt', { skjema: {} }, []), forventet: { utfall: 'mangler', grunner: ['Måldose'] } },
    ...r.unntak.flatMap((u) => [
      stopp(`${u.id}-ja`, `${u.tekst.split('.')[0]}: ja`, { skjema: { maldose: mal, pasientforhold: { [u.id]: true } } }, ['Regelen gjelder ikke']),
      stopp(`${u.id}-ubesvart`, `${u.tekst.split('.')[0]}: ubesvart`, { ubesvart: [u.id] }, [`Må avklares før beregning (ukjent): ${u.tekst}`]),
    ]),
    ...r.bekreftelser.map((b) =>
      stopp(`uten-${b.id}`, `ikke bekreftet: ${b.tekst.split(':')[0]!.split('.')[0]}`, { skjema: { maldose: mal, bekreftet: r.bekreftelser.filter((x) => x !== b).map((x) => x.id) } }, [`Må bekreftes før beregning: ${b.tekst}`]),
    ),
    stopp('styrke-avregistrert', `${til} ${mal} mg avregistrert i FEST`, { dose: hoy, fest: avregistrert(til, Number(mal)) }, ['finnes ikke lenger i FEST'], 'preparat'),
    stopp('foreldet-fest', 'FEST eldre enn 48 timer', { timer: 49 }, ['Den nattlige oppdateringen har ikke gått siden'], 'foreldet_fest'),
    stopp('endret-regel', 'regelen endret etter kontrollen (annet fingeravtrykk)', { regel: { id: r.id, endre: { hva: 'endret trinnlengde etter den simulerte godkjenningen', endre: (x: Regel) => {
      g.endre!.endre(x)
      const fase = x.plan.forlop[0]!.faser[0]
      if (fase?.type === 'nedtrapping') fase.trinnlengde.verdi = 7
    } } } }, ['fingeravtrykket stemmer ikke'], 'regelendring'),
    {
      ...felles,
      id: `${r.id}:uten-godkjenning`,
      kategori: 'ikke_godkjent',
      hva: GODKJENT_START[r.id] ? `uten godkjenning: verktøyet bruker fortsatt ${GODKJENT_START[r.id]} og ber om formvalg for mirtazapin` : 'uten godkjenning (slik appen er nå): faglig kontroll gjenstår',
      dose: GODKJENT_START[r.id] ? String(startdoser(r)[1]) : hoy,
      regel: undefined,
      forventet: GODKJENT_START[r.id] ? { utfall: 'formvalg', forlop: ['til'] } : { utfall: 'ingen', status: 'til_kontroll' },
    },
  ]
}

export const K2KASUS: readonly K2kasus[] = BYTTESETT.regler.flatMap(kasusFor)

export type K2utfall = ReturnType<typeof kjorKasus>

export const uttrekkeneFor = (u: Festuttrekk): Uttrekkene => ({ pilot: u, aksept: u })

export const kjorK2 = (k: K2kasus, u: Festuttrekk): K2utfall => kjorKasus(k, uttrekkeneFor(u), K2_SETTENE)

/**
 * Hvorfor kasuset ikke gir det det forventer; tom når det gjør det. En plan
 * må være klinisk (ikke stoppet); radene selv står i rapporten og
 * kontrolleres av testene for de viktigste kasusene.
 */
export function k2avvik(k: K2kasus, u: K2utfall): string[] {
  if (k.forventet.utfall === 'plan') return u.utfall === 'plan' ? [] : [`ventet en plan, fikk ${u.utfall}: ${JSON.stringify('grunner' in u ? u.grunner : u)}`]
  return avvikFra(k, u)
}

/* --- Rapporten ------------------------------------------------------------------- */

const utfallstekst = (u: K2utfall): string => {
  switch (u.utfall) {
    case 'plan':
      return 'plan'
    case 'stopp':
    case 'mangler':
      return `${u.utfall === 'stopp' ? 'stopper' : 'mangler'}: ${u.grunner.join(' ')}`
    case 'ingen':
      return `ingen plan (${u.status}): ${u.grunner.join(' ')}`
    default:
      return u.utfall
  }
}

export const SPORSMAL: readonly { nr: string; sporsmal: string; anbefalt: string }[] = [
  {
    nr: 'K2-1',
    sporsmal: 'Er 14 dager per halveringstrinn, med 14 dager på laveste dose før seponering, forsvarlig ved bytte? Fra laveste startdose varer nedtrappingen da 2 uker; RCPsych og Keks mfl. beskriver omtrent 4 uker.',
    anbefalt: 'Godta 14 dager som minstetid ved bytte (NICE åpner for raskere nedtrapping ved bytte), med toleransevurdering før hvert trinn; lang behandlingstid og tidligere plager er allerede utenfor.',
  },
  {
    nr: 'K2-2',
    sporsmal: 'Kan seponeringen fra laveste dose (sertralin 25 mg, escitalopram 5 mg, citalopram 10 mg) etter 14 dager være en del av planen ved bytte, når toleransen er vurdert?',
    anbefalt: 'Ja ved bytte: det nye antidepressivet er startet eller startes straks, og planen sier at seponeringen bare gjøres når toleransen er vurdert.',
  },
  {
    nr: 'K2-3',
    sporsmal: 'Mirtazapin: er 15 mg fra dag 1 og økning til valgt vedlikeholdsdose 30 mg dagen etter siste SSRI-dose forsvarlig, og skal 45 mg holdes utenfor planen?',
    anbefalt: 'Ja; økningen følger Keks mfl. (økes når det første er seponert), og 45 mg er en responsstyrt økning etter preparatomtalen.',
  },
  {
    nr: 'K2-4',
    sporsmal: '(Es)citalopram → sertralin: er et moderat bytte med tre hele dager uten SSRI riktig standard, eller bør det være direkte bytte eller kryssnedtrapping?',
    anbefalt: 'Moderat bytte som standard (lav interaksjonsrisiko); direkte bytte og kryssnedtrapping kan bli egne regler senere.',
  },
  {
    nr: 'K2-5',
    sporsmal: 'Sertralin: er 50 mg i minst 14 dager før valgt økning til 100 mg riktig, og skal høyere doser holdes utenfor planen?',
    anbefalt: 'Ja; preparatomtalen krever minst én uke, og 14 dager gir tid til å vurdere responsen.',
  },
  {
    nr: 'K2-6',
    sporsmal: 'Er avgrensningen dekkende: depresjon hos voksne 18–65 år, kort behandlingstid, ingen tidligere seponeringsplager, normal lever- og (for mirtazapin) nyrefunksjon, tabletter, bekreftet kontroll av serotonerg sammedisinering?',
    anbefalt: 'Ja for første leveranse; eldre, lang behandlingstid og andre former krever egne regler.',
  },
]

export function lagK2Kontrollgrunnlag(u: Festuttrekk): string {
  const kjort = K2KASUS.map((k) => ({ k, u: kjorK2(k, u) }))
  const regler = BYTTESETT.regler.map((r) => {
    const egne = kjort.filter((x) => x.k.regelId === r.id)
    const planer = egne.filter((x) => x.k.forventet.utfall === 'plan')
    const andre = egne.filter((x) => x.k.forventet.utfall !== 'plan')
    return [
      `### ${r.tittel}`,
      '',
      `\`${r.id}\`, versjon ${r.versjon}, fingeravtrykk \`${fingeravtrykk(r)}\`. Status: til faglig kontroll.`,
      '',
      ...planer.flatMap(({ k, u: x }) => [
        `**${k.hva}** (startdato 09.11.2026)${x.utfall === 'plan' && x.undertittel ? ` – ${x.undertittel}` : ''}:`,
        '',
        ...(x.utfall === 'plan' ? x.linjer.map((l) => `    ${l}`) : [`    ${utfallstekst(x)}`]),
        '',
      ]),
      tabell(
        ['Kasus', 'Utfall'],
        andre.map(({ k, u: x }) => [k.hva, utfallstekst(x)]),
      ),
      '',
    ].join('\n')
  })
  const avvik = kjort.flatMap(({ k, u: x }) => k2avvik(k, x).map((f) => `${k.id}: ${f}`))
  return `# OUSFAR Verktøy – K2: kontrollgrunnlag for komplette antidepressivbytter

<!-- Laget av \`npx vite-node scripts/verktoy-antidepressivbytter.ts -- rapport\` fra reglene og FEST-uttrekket. Ikke rediger for hånd. -->

**Ingen av reglene er klinisk godkjent.** Planene under er regnet på en kopi der hvert åpne OUSFAR-valg er simulert avklart uendret og regelen simulert godkjent, gjennom samme vei som verktøysiden, med preparatene i FEST-uttrekket ${u.hentet.slice(0, 10)} (\`${FEST_K2}\`). Kopien lagres aldri og går aldri til verktøysiden. Fingeravtrykket ved hver regel er versjonen under kontroll; en virkelig godkjenning krever en ny versjon med kontrollørens avklaringer, og den får et nytt fingeravtrykk. Uten godkjenning sier verktøyet at faglig kontroll gjenstår; det godkjente startforløpet fra sertralin til mirtazapin (versjon 10) brukes fortsatt i appen. Bakgrunn og kilder: \`docs/verktøy-k2-antidepressivbytter.md\`; reglene i sin helhet: \`${K2_REGELRAPPORT.fil}\`.

Kasusene er syntetiske. ${kjort.length} kasus, ${avvik.length === 0 ? 'alle med forventet utfall' : `${avvik.length} avvik`}.

## Spørsmål til den faglige kontrollen

${tabell(
  ['Nr.', 'Spørsmål', 'OUSFARs anbefaling'],
  SPORSMAL.map((s) => [s.nr, s.sporsmal, s.anbefalt]),
)}

## Reglene og planene

${regler.join('\n')}
${avvik.length > 0 ? `\n## Avvik\n\n${liste(avvik)}\n` : ''}`
}
