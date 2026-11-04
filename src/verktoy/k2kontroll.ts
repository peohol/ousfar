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
import { ANTIDEPRESSIVBYTTER, BYTTESETT, KORT_BEHANDLINGSTID_UKER, NYTT_LEGEMIDDEL_I_FEST } from './regler/antidepressivbytter'
import { fingeravtrykk } from './regler/godkjenning'
import { alleGrunnlag, type Regel } from './regler/modell'
import { avregistrert, avvikFra, kjorKasus, type Pilotkasus, SIMULERT_KONTROLLOR, simulerGodkjenning, type Uttrekkene } from './regler/pilotmatrise'
import type { Regelrapport } from './regler/rapport'
import { liste, tabell, tall } from './regler/rapport'
import type { Verktoyvalg } from './tilgjengelighet'

export const FEST_K2 = 'src/data/verktoy/fest-antidepressivbytter.json'
export const K2_KONTROLLFIL = 'docs/verktøy-k2-kontrollgrunnlag.md'
/** Regelrapporten om K2-settet, slik `npm run verktoy:regler -- rapport` skriver den. */
export const K2_REGELRAPPORT: Regelrapport = { ...ANTIDEPRESSIVBYTTER.rapport, sett: BYTTESETT }

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
export function somAvklartOgGodkjent(x: Regel, sluttrinn: Sluttrinn): void {
  if (sluttrinn === 'laveste_tablett') medSluttrinnVedLavesteTablett(x)
  for (const [, g] of alleGrunnlag(x)) {
    if (g.type === 'ousfar_vurdering' && !g.avklaring) {
      g.avklaring = { dato: DATO, av: SIMULERT_KONTROLLOR, rolle: 'uavhengig_kontrollor', regelversjon: x.versjon, merknad: 'Simulert avklaring, bare i kontrollgrunnlaget.' }
    }
  }
  simulerGodkjenning(x, { id: x.id, versjon: x.versjon, fingeravtrykk: fingeravtrykk(x) }, DATO)
}

/**
 * Sluttrinnet ved bytte (K2-2) i simuleringen: `ikke_avgjort` er regelen slik
 * den er, der hver plan stopper før seponering; `laveste_tablett` er
 * alternativet Peder vurderer, at det gamle SSRI-et seponeres fra laveste
 * tablettdose. Det er ikke avgjort, og vises bare for at kontrolløren og Peder
 * skal se planene det ville gitt.
 */
export type Sluttrinn = 'ikke_avgjort' | 'laveste_tablett'

/** Setter sluttrinnet til laveste tablettdose (halveringens sluttdose), bare på en kopi i kontrollgrunnlaget. */
export function medSluttrinnVedLavesteTablett(x: Regel): void {
  for (const f of x.plan.forlop) {
    for (const fase of f.faser) {
      if (fase.type !== 'nedtrapping' || typeof fase.avslutning !== 'object' || fase.strategi.type !== 'prosent_av_aktuell' || !fase.strategi.sluttdose_mg) continue
      fase.avslutning.fra_hoyst_mg.verdi = fase.strategi.sluttdose_mg.verdi
    }
  }
}

/** Om regelens sluttrinn ved bytte (K2-2) venter på en verdi; da stopper hver plan før seponeringen. */
export function sluttrinnApent(r: Regel): boolean {
  return r.plan.forlop.some((f) => f.faser.some((x) => x.type === 'nedtrapping' && typeof x.avslutning === 'object' && x.avslutning.fra_hoyst_mg.verdi === null))
}

const SLUTTRINNTEKST: Record<Sluttrinn, string> = { ikke_avgjort: 'sluttrinnet ikke avgjort, slik regelen er', laveste_tablett: 'sluttrinnet simulert som laveste tablettdose (K2-2, ikke avgjort)' }

const simulert = (r: Regel, sluttrinn: Sluttrinn): NonNullable<Pilotkasus['regel']> => ({
  id: r.id,
  endre: { hva: `simulert avklaring og klinisk godkjenning av versjon ${r.versjon}, ${SLUTTRINNTEKST[sluttrinn]}, bare på en kopi`, endre: (x: Regel) => somAvklartOgGodkjent(x, sluttrinn) },
})

/** Bytter der et godkjent startforløp allerede finnes; det skal fortsatt være det verktøyet bruker til den komplette regelen er godkjent. */
/** Det godkjente startforløpet regelen erstatter, som verktøyet bruker til regelen er godkjent. */
const erstattet = (r: Regel) => (r.erstatter?.length ? `det godkjente startforløpet (${r.erstatter.join(', ')})` : undefined)

/** Ett kasus i kontrollgrunnlaget, med regelen det gjelder. */
export interface K2kasus extends Pilotkasus {
  regelId: string
}

const startdoser = (r: Regel) => r.inndata.find((x) => x.navn === 'startdose')?.verdier ?? []
const maldoser = (r: Regel) => r.inndata.find((x) => x.navn === 'maldose')?.verdier ?? []
/** Styrkene av det nye legemidlet i FEST som det kliniske omfanget ikke er kontrollert med, og som planene derfor ikke bruker. */
const ubrukteStyrker = (r: Regel, til: string) => {
  const kontrollert = r.klinisk_omfang?.tilfeller.flatMap((t) => t.styrker?.til ?? []) ?? []
  return (NYTT_LEGEMIDDEL_I_FEST[til] ?? []).filter((mg) => !kontrollert.includes(mg))
}

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
  const g = simulert(r, 'laveste_tablett')
  const apent = sluttrinnApent(r)
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
          hva: `${fra} ${tall(d)} mg til ${til} ${tall(m)} mg, ${apent ? 'sluttrinnet simulert som laveste tablettdose' : 'med direkte overgang (OUSFARs forslag)'}`,
          dose: String(d),
          skjema: { maldose: String(m), startdato: '2026-11-09' },
          forventet: { utfall: 'plan', linjer: [] },
        }),
      ),
    ),
    // Slik regelen er: uten avgjort sluttrinn seponeres ikke det gamle SSRI-et, og ingen plan vises.
    ...(apent ? startdoser(r) : []).map(
      (d): K2kasus => ({
        ...felles,
        id: `${r.id}:${d}-sluttrinn-ikke-avgjort`,
        kategori: 'vanlig_dose',
        hva: `${fra} ${tall(d)} mg til ${til} ${mal} mg, ${SLUTTRINNTEKST.ikke_avgjort}`,
        dose: String(d),
        skjema: { maldose: mal, startdato: '2026-11-09' },
        regel: simulert(r, 'ikke_avgjort'),
        forventet: { utfall: 'stopp', grunner: ['avslutning.fra_hoyst_mg mangler og må avklares faglig'] },
      }),
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
    // En styrke planene ikke bruker, kan forsvinne uten at planen stopper.
    ...ubrukteStyrker(r, til).map(
      (mg): K2kasus => ({
        ...felles,
        id: `${r.id}:ubrukt-${til}-${tall(mg)}-avregistrert`,
        kategori: 'preparat',
        hva: `${til} ${tall(mg)} mg, som planene ikke bruker, avregistrert i FEST`,
        dose: hoy,
        skjema: { maldose: mal, startdato: '2026-11-09' },
        fest: avregistrert(til, mg),
        forventet: { utfall: 'plan', linjer: [] },
      }),
    ),
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
      hva: erstattet(r) ? `uten godkjenning: verktøyet bruker fortsatt ${erstattet(r)} og ber om formvalg for mirtazapin` : 'uten godkjenning (slik appen er nå): faglig kontroll gjenstår',
      dose: erstattet(r) ? String(startdoser(r)[1]) : hoy,
      regel: undefined,
      forventet: erstattet(r) ? { utfall: 'formvalg', forlop: ['til'] } : { utfall: 'ingen', status: 'til_kontroll' },
    },
  ]
}

export const K2KASUS: readonly K2kasus[] = BYTTESETT.regler.flatMap(kasusFor)

export type K2utfall = ReturnType<typeof kjorKasus>

export const uttrekkeneFor = (u: Festuttrekk): Uttrekkene => ({ pilot: u, aksept: u })

export const kjorK2 = (k: K2kasus, u: Festuttrekk): K2utfall => kjorKasus(k, uttrekkeneFor(u))

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
    sporsmal:
      'Sluttrinnet ved bytte. (a) Escitalopram eller citalopram → sertralin: kan escitalopram 5 mg eller citalopram 10 mg seponeres etter 14 dager når sertralin 50 mg startes dagen etter? Siste trinn er 100 % av den ordinerte dosen. Sertralin 50 mg (minste vanlige dose, SERT-binding nær platået) ventes å holde SERT-hemmingen oppe, og det gamle elimineres over flere døgn, men det er ikke garantert at seponeringssymptomer eller forverring uteblir. (b) Til mirtazapin, som ikke hemmer SERT: kan SSRI-et seponeres fra laveste tablettdose, eller trengs mindre trinn eller flytende formuleringer? Laveste dose i preparatomtalen er ingen seponeringsgrense i seg selv.',
    anbefalt:
      '(a) Ja, i det avgrensede omfanget, med vurdering før seponeringen, tett oppfølging av seponeringssymptomer og forverring den første uken og individuell justering ved plager; dette er OUSFARs forslag i reglene. (b) Ikke avgjort: til mirtazapin seponerer ingen regel, og hver plan stopper uten delplan; planene «sluttrinnet simulert som laveste tablettdose» viser bare hva det alternativet ville gitt.',
  },
  {
    nr: 'K2-3',
    sporsmal: 'Mirtazapin: er 15 mg fra dag 1 og økning til valgt vedlikeholdsdose 30 mg dagen etter siste SSRI-dose forsvarlig, og skal 45 mg holdes utenfor planen?',
    anbefalt: 'Ja; økningen følger Keks mfl. (økes når det første er seponert), og 45 mg er en responsstyrt økning etter preparatomtalen.',
  },
  {
    nr: 'K2-4',
    sporsmal:
      `(Es)citalopram → sertralin: er nedtrapping til laveste tablettdose og så direkte overgang (sertralin 50 mg dagen etter siste dose, ingen dager uten SSRI) riktig for dette omfanget (voksne 18–65 år, depresjon, høyst ${KORT_BEHANDLINGSTID_UKER} ukers sammenhengende behandling, ingen tidligere seponeringsplager, normal leverfunksjon)? Keks mfl.: utvasking er ikke nødvendig mellom disse SSRI-ene når byttet gjøres forsiktig og under nær oppfølging, og direkte bytte passer fra ett SSRI med kort halveringstid til et annet, men interaksjonsrisikoen er betydelig. Alternativene var moderat bytte (2–4 dager uten SSRI: lavest interaksjonsrisiko, men seponeringssymptomer i dagene uten SSRI) og kryssnedtrapping (to SSRI-er i terapeutisk dose samtidig).`,
    anbefalt: 'Direkte overgang etter nedtrapping til laveste tablettdose, med vurdering av seponeringssymptomer, serotonerg belastning og forverring en uke etter overgangen; moderat bytte og kryssnedtrapping er ikke valgt.',
  },
  {
    nr: 'K2-5',
    sporsmal:
      'Sertralin: er 50 mg i minst 14 dager før en valgt økning til 100 mg riktig, med en vurdering før økningen av effekt og behov, toleranse og seponeringssymptomer etter det gamle SSRI-et, og skal høyere doser holdes utenfor planen?',
    anbefalt:
      'Ja; Zoloft-preparatomtalen krever minst én uke mellom doseendringer og sier at effekten vanligvis trenger lengre observasjonstid enn én uke. Vedlikeholdsdosen er forskriverens valg: er effekten tilstrekkelig, beholdes 50 mg, og ved dårlig toleranse eller seponeringssymptomer venter økningen.',
  },
  {
    nr: 'K2-6',
    sporsmal:
      `Er avgrensningen dekkende: depresjon hos voksne 18–65 år, kort behandlingstid, ingen tidligere seponeringsplager, normal lever- og (for mirtazapin) nyrefunksjon, tabletter, bekreftet kontroll av serotonerg sammedisinering? Er ${KORT_BEHANDLINGSTID_UKER} ukers sammenhengende bruk riktig som kontrollerbar grense for kort behandlingstid? RCPsych skiller bare mellom «noen uker» (nedtrapping over omtrent en måned) og «mange måneder eller år» (langsommere), uten eksakt grense.`,
    anbefalt:
      `Ja for første leveranse, med ${KORT_BEHANDLINGSTID_UKER} uker som OUSFARs forslag til grense (øvre del av «noen uker»); lengre bruk, eldre og andre former stopper og krever egne regler.`,
  },
  {
    nr: 'K2-7',
    sporsmal:
      'Er vurderingspunktene i planen riktige og nok: seponeringssymptomer og forverring før hver reduksjon og før seponeringen, effekt, toleranse og seponeringssymptomer før økningen av det nye legemidlet, og respons og bivirkninger fire uker etter oppstarten og etter hver doseendring av det?',
    anbefalt:
      'Ja; for mirtazapin er fire uker slutten av de 2–4 ukene preparatomtalen oppgir før respons kan ventes, og for sertralin er det OUSFARs valg innenfor preparatomtalens «lengre observasjonstid» enn én uke. En tidligere kontroll kan legges til av forskriveren.',
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

**Ingen av reglene er klinisk godkjent.** ${BYTTESETT.regler.filter((r) => !sluttrinnApent(r)).map((r) => r.tittel).join(' og ')}: sluttrinnet er OUSFARs konkrete forslag til kontroll, der SSRI-et seponeres fra laveste tablettdose og sertralin 50 mg startes dagen etter (direkte overgang, K2-2 og K2-4). Sertralin ventes å holde SERT-hemmingen oppe, men seponeringssymptomer kan komme likevel; de følges tett den første uken, og planen justeres individuelt ved plager. ${BYTTESETT.regler.filter(sluttrinnApent).map((r) => r.tittel).join(', ')}: sluttrinnet er ikke avgjort, så hver plan stopper før en delplan (kasusene «sluttrinnet ikke avgjort»), og planene for dem er regnet med sluttrinnet simulert som laveste tablettdose – et alternativ som ikke er avgjort. Planene under er regnet på en kopi der hvert åpent OUSFAR-valg er simulert avklart uendret og regelen er simulert godkjent, gjennom samme vei som verktøysiden, med preparatene i FEST-uttrekket ${u.hentet.slice(0, 10)} (\`${FEST_K2}\`). Kopien lagres aldri og går aldri til verktøysiden. Fingeravtrykket ved hver regel er versjonen under kontroll; en virkelig godkjenning krever en ny versjon med kontrollørens avklaringer, og den får et nytt fingeravtrykk. Uten godkjenning sier verktøyet at faglig kontroll gjenstår. Det godkjente startforløpet fra sertralin til mirtazapin (versjon 10) er en delplan, som verktøyet ikke viser; det gir «Komplett plan ikke tilgjengelig». Bakgrunn og kilder: \`docs/verktøy-k2-antidepressivbytter.md\`; reglene i sin helhet: \`${K2_REGELRAPPORT.fil}\`.

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
