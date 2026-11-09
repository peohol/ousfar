/**
 * P4 i `docs/verktøy-produktrevisjon-2026-11.md`: uavhengig fasit for
 * P0-forløpene (`scripts/verktoy-p0-forlop.json`), og kontrollen av det appen
 * eller motoren faktisk gir mot den.
 *
 * Fasiten er skrevet for hånd fra de kliniske kontrollgrunnlagene og
 * preparatomtalene som er oppgitt i `kilde`, ikke fra motorens utdata. Den
 * fanger dermed også feil der skjerm, kopi og motor er enige med hverandre,
 * men ikke med det godkjente forløpet. Den beskriver det som er klinisk
 * godkjent i dag; den er ikke en klinisk anbefaling og utvider ikke noe
 * omfang. Ved ny godkjent regelversjon oppdateres fasiten bevisst, med kilde.
 *
 * Kontrollen ser bare på tekst (skjerm, kopi, utskrift) og telte handlinger,
 * så den virker likt for nettleserkjøringen og for kjøringen uten nettleser.
 * Ingen pasientopplysninger: alle forløpene er syntetiske.
 */

/** `avklaring`: ingen plan ennå, fordi et svar («Vet ikke») må avklares først; panelet sier hvilket. */
export type Utfall = 'komplett' | 'stopp' | 'avklaring'

/** Hvorfor det ikke blir plan, slik produktkontrakten skiller det (produktrevisjonen §2). */
export type Stoppkategori = 'risiko' | 'ikke_godkjent' | 'data' | 'teknisk'

/** Ett dosepunkt i tidslinjen: dag `fra` (til og med `til`, eller «fra dag» uten `til`), legemiddel og dose. */
export interface Dosepunkt {
  fra: number
  til?: number
  legemiddel: string
  /** Dosen slik den skrives, for eksempel «8 mg» eller «25 mg annenhver dag». */
  dose: string
}

/**
 * Den gjentatte vedlikeholdsinjeksjonen i et depotforløp: `dose` av
 * `legemiddel` hver måned, første gang én måned etter dag `etterDag`, med
 * administrasjonsvinduet (`vindu`) i samme rad.
 */
export interface Vedlikehold {
  legemiddel: string
  dose: string
  etterDag: number
  vindu: RegExp
}

export interface Fasit {
  /** Det klinisk riktige utfallet. To verdier: begge er riktige (for eksempel en låst tilpasning som gir standardplanen). */
  utfall: Utfall | Utfall[]
  /** Hvor fasiten kommer fra. */
  kilde: string
  /**
   * Strategien i ord, til rapporten. Den kontrolleres gjennom `doser`: kopien
   * skal ha nøyaktig disse dosene hver dag og ingen andre, så overlapp, et
   * bytte på feil dag, et ekstra trinn eller et hull gir avvik ({@link forlopsavvik}).
   */
  strategi?: string
  /** Hele doseforløpet en komplett plan skal ha, dag for dag, på skjermen, i kopien og i utskriften. Et punkt uten `til` gjelder videre fremover. */
  doser?: Dosepunkt[]
  /** Vedlikeholdsinjeksjonene etter oppstarten: nøyaktig disse, på skjermen, i kopien og i utskriften ({@link vedlikeholdsavvik}). */
  vedlikehold?: Vedlikehold[]
  /** Sluttmålet, som tekst i planen. */
  slutt?: RegExp
  /** Et stopp skal nevne alle disse (forholdet som stopper). */
  grunn?: RegExp[]
  stoppkategori?: Stoppkategori
  /** Spørsmål som ikke skal vises, fordi de allerede er besvart av tidligere valg. */
  ikkeSpurt?: RegExp[]
  /** Dosen alene utelukker planen (steg 2): da skal ingen spørsmål om pasienten stå igjen. */
  stoppAvDose?: boolean
}

/** Formuleringer et stopp aldri skal bestå av: språklig selvmotsigende eller uten grunn. */
const GENERISKE: [RegExp, string][] = [
  [/Da gjelder ikke regelen/, '«Da gjelder ikke regelen»'],
  [/Gjelder ikke\b.*\bGjelder\b|\bGjelder\s*\/\s*Gjelder ikke/, 'svaralternativene «Gjelder/Gjelder ikke»'],
]
/** Et stopp som ikke er teknisk, skal ikke be klinikeren prøve igjen. */
const PROV_IGJEN = /Prøv igjen senere/
/** Manglende regelstøtte skal ikke fremstilles som medisinsk forbud. */
const SOM_KONTRAINDIKASJON = /kontraindi|er farlig|må ikke (brukes|gis)/i

const ESCITALOPRAM_KILDE = 'docs/verktøy-b2-escitalopram-kontrollgrunnlag.md (v14, fp 01b2fb56, kasus B2-01–B2-04 og tabellen «Hva som er nytt»); Cipralex preparatomtale pkt. 4.2'
const K2_KILDE = 'docs/verktøy-k2-kontrollgrunnlag.md (K2-2a og K2-4, godkjent v2); Cipramil og Zoloft preparatomtale pkt. 4.2'
const K3_KILDE = 'docs/verktøy-k3-antipsykotikabytter.md (regneeksemplene for v8); Zyprexa, Risperdal og Abilify preparatomtale pkt. 4.2'
const K4_KILDE = 'docs/verktøy-k4-kontrollgrunnlag.md (godkjent v2); Lamictal preparatomtale pkt. 4.2, tabellen for bipolar lidelse'

/** Xeplion 75 mg hver måned fra én måned etter den andre oppstartsinjeksjonen dag 8, med vinduet ±7 dager (preparatomtalen pkt. 4.2). */
const XEPLION_75: Vedlikehold = { legemiddel: 'Paliperidon depotinjeksjon', dose: '75 mg', etterDag: 8, vindu: /±\s?7 dager/ }

/** Hvert trinn i escitalopramnedtrappingen varer 28 dager (v14). */
const trinn28 = (legemiddel: string, doser: string[]): Dosepunkt[] => doser.map((dose, i) => ({ fra: 1 + 28 * i, til: 28 * (i + 1), legemiddel, dose }))
const ESC10 = trinn28('Escitalopram', ['8 mg', '6 mg', '5 mg', '4 mg', '3 mg', '2 mg', '1 mg'])
const ESC20 = trinn28('Escitalopram', ['15 mg', '12 mg', '9 mg', '7 mg', '6 mg', '5 mg', '4 mg', '3 mg', '2 mg', '1 mg'])
const escitalopram = (doser: Dosepunkt[], dag: number): Fasit => ({
  utfall: 'komplett',
  kilde: ESCITALOPRAM_KILDE,
  strategi: 'nedtrapping til seponering, 28 dager per trinn',
  doser,
  slutt: new RegExp(`seponert fra dag ${dag}|fra dag ${dag}[^\\n]*seponert`, 'i'),
})
/** Et stopp fordi den godkjente planen ikke dekker tilfellet. */
const utenfor = (kilde: string, ...grunn: RegExp[]): Fasit => ({ utfall: 'stopp', kilde, grunn, stoppkategori: 'ikke_godkjent' })
/** En tilpasning bare standardverdien er godkjent for: standardplanen (feltet er låst) eller et stopp som nevner den godkjente verdien. */
const laast = (standard: Fasit, ...grunn: RegExp[]): Fasit => ({
  ...standard,
  utfall: ['komplett', 'stopp'],
  kilde: `${standard.kilde}: bare standardverdiene er godkjent`,
  grunn,
  stoppkategori: 'ikke_godkjent',
})

/**
 * Fasiten per P0-forløp. Mangler et forløp her, kontrolleres bare de generelle
 * kravene (ingen generisk stopp, ingen «Prøv igjen senere» uten teknisk grunn).
 */
export const FASIT: Record<string, Fasit> = {
  'P0-A01': escitalopram(ESC10, 197),
  'P0-A02': escitalopram(ESC20, 281),
  'P0-A03': escitalopram(ESC10, 197),
  'P0-A04': escitalopram(ESC20, 281),
  'P0-A05': escitalopram(ESC10, 197),
  'P0-N01': utenfor(`${ESCITALOPRAM_KILDE}: godkjenningen gjelder bare kort behandlingstid`, /(kort|lang) behandlingstid/i),
  'P0-N08': { utfall: 'avklaring', kilde: `${ESCITALOPRAM_KILDE}: godkjenningen gjelder bare kort behandlingstid, som må være avklart`, grunn: [/«Vet ikke»/], stoppkategori: 'data' },
  'P0-N09': utenfor(`${ESCITALOPRAM_KILDE}: godkjenningen gjelder bare kort behandlingstid`, /(kort|lang) behandlingstid/i),
  'P0-N02': utenfor(`${ESCITALOPRAM_KILDE}: unntaket for tidligere seponeringsvansker`, /seponering(ssymptomer|svansker|splager)|tidligere (forsøk|nedtrapping)/i),
  'P0-N03': utenfor(`${ESCITALOPRAM_KILDE}: godkjent for voksne under 65 år`, /65 år/),
  'P0-N04': { ...utenfor(`${ESCITALOPRAM_KILDE}: startdosene 10 og 20 mg`, /10 og 20 mg/), stoppAvDose: true },
  'P0-N05': utenfor(`${ESCITALOPRAM_KILDE}: unntaket for nedsatt leverfunksjon`, /leverfunksjon/i),
  // «Tilpass planen» med 10 mg: enten er feltet låst og standardplanen for 10 mg gis (som A01), eller stoppet sier hvilke verdier som er godkjent.
  'P0-N06': laast(escitalopram(ESC10, 197), /25 %/),
  'P0-N07': laast(escitalopram(ESC10, 197), /28 dager/),
  'P0-B01': {
    utfall: 'komplett',
    kilde: K2_KILDE,
    strategi: 'nedtrapping, så direkte overgang uten overlapp (godkjent v2; avviker fra bestilt overlapp, P1-1–P1-4 er åpne)',
    doser: [
      { fra: 1, til: 14, legemiddel: 'Citalopram', dose: '10 mg' },
      { fra: 15, til: 28, legemiddel: 'Sertralin', dose: '50 mg' },
      { fra: 29, legemiddel: 'Sertralin', dose: '100 mg' },
    ],
  },
  'P0-B02': utenfor(`${K2_KILDE}: høyst 8 ukers behandling`, /8 uke/),
  'P0-B05': utenfor(`${K2_KILDE} og K2-6: voksne 18–65 år`, /over 65 år/),
  'P0-B03': {
    utfall: 'komplett',
    kilde: K2_KILDE,
    strategi: 'nedtrapping, så direkte overgang uten overlapp (som B01)',
    doser: [
      { fra: 1, til: 14, legemiddel: 'Escitalopram', dose: '5 mg' },
      { fra: 15, til: 28, legemiddel: 'Sertralin', dose: '50 mg' },
      { fra: 29, legemiddel: 'Sertralin', dose: '100 mg' },
    ],
  },
  'P0-C01': {
    utfall: 'komplett',
    kilde: K3_KILDE,
    strategi: 'kryss-titrering: aripiprazol trappes opp mens olanzapin trappes ned',
    doser: [
      { fra: 1, til: 28, legemiddel: 'Olanzapin', dose: '20 mg' },
      { fra: 29, til: 42, legemiddel: 'Olanzapin', dose: '15 mg' },
      { fra: 43, til: 56, legemiddel: 'Olanzapin', dose: '10 mg' },
      { fra: 57, til: 70, legemiddel: 'Olanzapin', dose: '5 mg' },
      { fra: 1, til: 7, legemiddel: 'Aripiprazol', dose: '5 mg' },
      { fra: 8, til: 14, legemiddel: 'Aripiprazol', dose: '10 mg' },
      { fra: 15, legemiddel: 'Aripiprazol', dose: '15 mg' },
    ],
    slutt: /seponert fra dag 71|fra dag 71[^\n]*seponert/i,
    ikkeSpurt: [/ikke depotinjeksjon/i],
  },
  'P0-C02': { ...utenfor(`${K3_KILDE}: bare startdosen 20 mg`, /20 mg/), stoppAvDose: true },
  'P0-C03': {
    utfall: 'komplett',
    kilde: K3_KILDE,
    strategi: 'kryss-titrering',
    doser: [
      { fra: 1, til: 28, legemiddel: 'Risperidon', dose: '4 mg' },
      { fra: 29, til: 42, legemiddel: 'Risperidon', dose: '3 mg' },
      { fra: 43, til: 56, legemiddel: 'Risperidon', dose: '2 mg' },
      { fra: 57, til: 70, legemiddel: 'Risperidon', dose: '1 mg' },
      { fra: 1, til: 7, legemiddel: 'Aripiprazol', dose: '5 mg' },
      { fra: 8, legemiddel: 'Aripiprazol', dose: '10 mg' },
    ],
    slutt: /seponert fra dag 71|fra dag 71[^\n]*seponert/i,
    ikkeSpurt: [/ikke depotinjeksjon/i],
  },
  'P0-C04': {
    utfall: 'komplett',
    kilde:
      'docs/verktøy-k3-antipsykotika.md (depot-aripiprazol-maintena v3; kontrolltilfellet i src/verktoy/regler/pilotsett.ts: «hver måned fra 1 måned etter dag 1, tidligst 26 dager etter forrige: 400 mg injeksjon»); Abilify Maintena preparatomtale pkt. 4.2 (én injeksjon og 14 dager peroral aripiprazol; vedlikehold 400 mg én gang i måneden, tidligst 26 dager etter forrige injeksjon)',
    strategi: 'oppstart med én injeksjon og peroral overlapp i 14 dager',
    doser: [
      { fra: 1, til: 1, legemiddel: 'Aripiprazol depotinjeksjon', dose: '400 mg' },
      { fra: 1, til: 14, legemiddel: 'Aripiprazol peroralt', dose: '15 mg' },
    ],
    vedlikehold: [{ legemiddel: 'Aripiprazol depotinjeksjon', dose: '400 mg', etterDag: 1, vindu: /tidligst 26 dager etter forrige/ }],
    slutt: /hver måned[^\n]*400 mg|400 mg[^\n]*hver måned/i,
  },
  'P0-C05': {
    utfall: 'komplett',
    kilde:
      'docs/verktøy-k3-antipsykotika.md (depot-risperidon-xeplion v8: 3 mg risperidon → 150 mg dag 1 og 100 mg dag 8 (±4 dager), så 75 mg hver måned fra én måned etter dag 8 (±7 dager); kasus K3-01 i src/verktoy/regler/antipsykotikakasus.ts); Xeplion preparatomtale pkt. 4.2 (månedlig, første gang én måned etter andre dose)',
    strategi: 'oppstartsinjeksjoner dag 1 og 8, så månedlig vedlikehold',
    doser: [
      { fra: 1, til: 1, legemiddel: 'Paliperidon depotinjeksjon', dose: '150 mg' },
      { fra: 8, til: 8, legemiddel: 'Paliperidon depotinjeksjon', dose: '100 mg' },
    ],
    vedlikehold: [XEPLION_75],
    slutt: /hver måned[^\n]*75 mg|75 mg[^\n]*hver måned/i,
  },
  'P0-C06': {
    utfall: 'komplett',
    kilde:
      'docs/verktøy-k3-antipsykotika.md (depot-paliperidon-xeplion v3); Xeplion preparatomtale pkt. 4.2 (peroral paliperidon 6 mg ↔ 75 mg månedlig; 150 mg dag 1 og 100 mg dag 8 (±4 dager), så månedlig (±7 dager), første gang én måned etter andre dose)',
    strategi: 'oppstartsinjeksjoner dag 1 og 8, så månedlig vedlikehold',
    doser: [
      { fra: 1, til: 1, legemiddel: 'Paliperidon depotinjeksjon', dose: '150 mg' },
      { fra: 8, til: 8, legemiddel: 'Paliperidon depotinjeksjon', dose: '100 mg' },
    ],
    vedlikehold: [XEPLION_75],
    slutt: /hver måned[^\n]*75 mg|75 mg[^\n]*hver måned/i,
  },
  'P0-C07': utenfor('docs/verktøy-k3-antipsykotika.md (v8: dokumentert toleranse for peroral risperidon er et vilkår)', /tålt|toleranse/i),
  'P0-D01': {
    utfall: 'komplett',
    kilde: K4_KILDE,
    strategi: 'langsom opptrapping av lamotrigin ved samtidig valproat',
    doser: [
      // Valproat fortsetter på dosen fra inndataene, gjennom hele planen.
      { fra: 1, legemiddel: 'Valproat', dose: '1000 mg natriumvalproat' },
      { fra: 1, til: 14, legemiddel: 'Lamotrigin', dose: '25 mg annenhver dag' },
      { fra: 15, til: 28, legemiddel: 'Lamotrigin', dose: '25 mg' },
      { fra: 29, til: 35, legemiddel: 'Lamotrigin', dose: '50 mg' },
      { fra: 36, legemiddel: 'Lamotrigin', dose: '100 mg' },
    ],
  },
  'P0-D02': {
    utfall: 'komplett',
    kilde: K4_KILDE,
    strategi: 'opptrapping av lamotrigin uten interagerende legemidler',
    doser: [
      // Litium fortsetter på dosen fra inndataene, gjennom hele planen.
      { fra: 1, legemiddel: 'Litium', dose: '168 mg Li⁺' },
      { fra: 1, til: 14, legemiddel: 'Lamotrigin', dose: '25 mg' },
      { fra: 15, til: 28, legemiddel: 'Lamotrigin', dose: '50 mg' },
      { fra: 29, til: 35, legemiddel: 'Lamotrigin', dose: '100 mg' },
      { fra: 36, legemiddel: 'Lamotrigin', dose: '200 mg' },
    ],
  },
}

// Samme plan som forløpet de bygger på: alderen 65 år er innenfor K2 (18–65 år), og et bekreftet graviditetsforebyggende program gir K4-planen (K4-14).
FASIT['P0-B04'] = { ...FASIT['P0-B01']!, kilde: `${K2_KILDE} og K2-6: voksne 18–65 år, 65 år er innenfor` }
FASIT['P0-D03'] = { ...FASIT['P0-D01']!, kilde: `${K4_KILDE}, K4.6 og K4-14: alle vilkårene i det graviditetsforebyggende programmet bekreftet` }
FASIT['P0-D04'] = { utfall: 'stopp', kilde: `${K4_KILDE}, K4.6 og K4-26: sikker prevensjon er ikke bekreftet`, grunn: [/sikker prevensjon/i], stoppkategori: 'risiko' }

/** Det som ble observert i ett forløp: tekst og tellinger. */
export interface Observasjon {
  utfall: 'komplett plan' | 'stopp' | 'avklaring' | 'annet'
  /** Planpanelet til slutt. */
  skjerm: string
  /** Den vanlige (korte) kopien, tom når det ikke finnes noen. */
  kopi: string
  /** Planpanelet slik det skrives ut, når utskriften ble kontrollert. */
  utskrift?: string
  /** Tidslinjen på skjermen og i utskriften, én rad per linje som i kopien («Dag 1–28: Navn form: dose; …»), når nettleserkjøringen har lest den. */
  skjermrader?: string
  utskriftsrader?: string
  /** Synlige spørsmål til slutt. */
  sporsmal?: string[]
  /** Antall dosevalg som bare hadde ett alternativ (ikke et reelt valg). */
  enkeltvalg?: number
}

export interface Avvik {
  hva: string
  /** `klinisk`: dose, strategi, sluttmål eller utfall stemmer ikke med fasiten. `bruk`: forklaring, valg eller spørsmål. */
  type: 'klinisk' | 'bruk'
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** En rad i tidslinjen: «Dag a–b: …», «Dag a: …» eller «Fra dag a: …» (dagene til og med `til`, `Infinity` for «fra»). */
interface Rad {
  fra: number
  til: number
  tekst: string
}
const RAD = /^\W*(fra dag|dag) (\d+)(?:\s*[–-]\s*(\d+))?\b(.*)$/i
/** En linje som begynner et nytt legemiddel i en rad som er brutt over flere linjer (skjermens tidslinje). */
const LEGEMIDDEL = /^\s*\p{Lu}\p{Ll}+ (peroralt|depotinjeksjon)\b/u
/**
 * Radene i tidslinjen. Kopien har én linje per rad; skjermen bryter raden over
 * flere linjer, så linjene etter en daglinje hører til den raden til neste
 * daglinje, og hvert legemiddel blir et eget ledd («;»).
 */
const rader = (tekst: string): Rad[] => {
  const ut: Rad[] = []
  for (const l of tekst.split('\n')) {
    const m = RAD.exec(l)
    if (m) {
      const fra = Number(m[2])
      ut.push({ fra, til: m[3] ? Number(m[3]) : /^fra/i.test(m[1]!) ? Infinity : fra, tekst: m[4]! })
    } else if (ut.length > 0 && l.trim()) ut[ut.length - 1]!.tekst += `${LEGEMIDDEL.test(l) ? ';' : ''} ${l.trim()}`
  }
  return ut
}

/**
 * Om tidslinjen gir legemidlet dosen på dag `fra` og (når den er gitt) dag
 * `til`: raden som dekker dagen, har et ledd med legemidlet og dosen. Rader
 * med flere legemidler er delt med «;». Nevner raden ikke legemidlet (en plan
 * med ett legemiddel kan utelate det), holder det at dosen står i raden og
 * legemidlet i teksten.
 */
export function harDosepunkt(tekst: string, p: Dosepunkt): boolean {
  const dose = new RegExp(`(?<![\\d,.])${esc(p.dose).replace(/ /g, '\\s')}(?![\\d,])`, 'i')
  const navn = new RegExp(esc(p.legemiddel), 'i')
  const alle = rader(tekst)
  const gir = (dag: number) =>
    alle
      .filter((r) => r.fra <= dag && dag <= r.til)
      .some((r) => {
        const ledd = r.tekst.split(';')
        return ledd.some((x) => navn.test(x) && dose.test(x)) || (!ledd.some((x) => navn.test(x)) && dose.test(r.tekst) && navn.test(tekst))
      })
  return gir(p.fra) && (p.til === undefined || gir(p.til))
}

/** Ett legemiddel i en rad: «Navn form: dose = …», og for en injeksjon «Navn depotinjeksjon dose = …» (kopien) eller «Navn depotinjeksjon: Injeksjon dose» (skjermen). */
const LEDD = /^\s*(\p{Lu}\p{Ll}+ (?:peroralt|depotinjeksjon))(?::\s*|\s+)(?:Injeksjon\s+)?(.*?)(?:\s=\s.*)?$/u
const SEPONERT = /^seponert$/i
const normal = (dose: string) => dose.replace(/\s+/g, ' ').trim().toLowerCase()
const dagtekst = (fra: number, til: number) => (til === Infinity ? `fra dag ${fra}` : til === fra ? `dag ${fra}` : `dag ${fra}–${til}`)

/** Én dose i tidslinjen: legemidlet får `dose` dag `fra` til og med `til` (`Infinity`: videre fremover). */
interface Dosering {
  fra: number
  til: number
  legemiddel: string
  dose: string
}

/**
 * Dosene i en tekst med én rad per linje: kopien, motorens tekst og radene
 * nettleserkjøringen leser fra tidslinjen på skjermen og i utskriften.
 * «Seponert» er ingen dose. Vurderinger og de gjentatte
 * vedlikeholdsinjeksjonene («Hver måned …», kontrollert av `slutt`) er ikke
 * doserader og tas ikke med.
 */
export function doseringer(tekst: string): Dosering[] {
  const ut: Dosering[] = []
  for (const l of tekst.split('\n')) {
    const m = RAD.exec(l)
    if (!m) continue
    const fra = Number(m[2])
    const til = m[3] ? Number(m[3]) : /^fra/i.test(m[1]!) ? Infinity : fra
    const innhold = m[4]!.replace(/^[^:]*:/, '')
    if (/^\s*Vurdering\b/.test(innhold)) continue
    for (const ledd of innhold.split(';')) {
      const d = LEDD.exec(ledd)
      const dose = d?.[2]!.replace(/\s*\(.*\)$/, '')
      if (d && dose && !SEPONERT.test(dose)) ut.push({ fra, til, legemiddel: d[1]!, dose })
    }
  }
  return ut
}

/**
 * Hvor doseforløpet i teksten avviker fra fasiten, dag for dag og per
 * legemiddel: en dose fasiten ikke har (overlapp, et bytte på feil dag, et
 * ekstra trinn, et legemiddel fasiten ikke kjenner), og en dose fasiten har,
 * men teksten mangler (et hull inne i et intervall, en avkortet
 * vedlikeholdsperiode, seponert for tidlig). Et intervall kan være delt opp
 * annerledes enn i fasiten så lenge hver dag får samme dose. Et legemiddel i
 * teksten hører til det lengste fasitnavnet det begynner med («Aripiprazol
 * peroralt» til «Aripiprazol peroralt» foran «Aripiprazol»). Tom liste: hver
 * dag, også alle dagene etter siste endring, har nøyaktig fasitens doser.
 */
export function forlopsavvik(tekst: string, doser: readonly Dosepunkt[]): string[] {
  const fasitnavn = (navn: string) =>
    doser
      .map((p) => p.legemiddel)
      .filter((n) => navn.toLowerCase().startsWith(n.toLowerCase()))
      .sort((x, y) => y.length - x.length)[0] ?? navn
  const venter: Dosering[] = doser.map((p) => ({ ...p, til: p.til ?? Infinity }))
  const viser = doseringer(tekst).map((d) => ({ ...d, legemiddel: fasitnavn(d.legemiddel) }))
  // Dosene er like fra en grense til neste, så det holder å se på hver grense; den siste gjelder videre fremover.
  const grenser = [...new Set([1, ...[...venter, ...viser].flatMap((d) => [d.fra, d.til + 1])])].filter(Number.isFinite).sort((x, y) => x - y)
  const navn = [...new Set([...venter, ...viser].map((d) => d.legemiddel))]
  const pa = (liste: Dosering[], legemiddel: string, dag: number) =>
    [...new Set(liste.filter((d) => d.legemiddel === legemiddel && d.fra <= dag && dag <= d.til).map((d) => normal(d.dose)))].sort().join(' + ') || 'ingen dose'
  const ut: { legemiddel: string; fra: number; til: number; venter: string; viser: string }[] = []
  for (const [i, dag] of grenser.entries()) {
    const til = (grenser[i + 1] ?? Infinity) - 1
    for (const l of navn) {
      const [v, s] = [pa(venter, l, dag), pa(viser, l, dag)]
      if (v === s) continue
      const forrige = ut.at(-1)
      if (forrige && forrige.legemiddel === l && forrige.venter === v && forrige.viser === s && forrige.til === dag - 1) forrige.til = til
      else ut.push({ legemiddel: l, fra: dag, til, venter: v, viser: s })
    }
  }
  return ut.map((a) => `${a.legemiddel} ${dagtekst(a.fra, a.til)}: ${a.viser}, fasiten sier ${a.venter}`)
}

/** En vedlikeholdsrad: «Hver måned fra 1 måned etter dag 8 (første …): Navn depotinjeksjon dose …». */
const VEDLIKEHOLD = /^\W*hver måned fra 1 måned etter dag (\d+)\b[^:]*:\s*(.*)$/i

/**
 * Hvor vedlikeholdsinjeksjonene i teksten avviker fra fasiten: hver forventet
 * injeksjon skal stå i nøyaktig én rad med riktig legemiddel, dose, første
 * tidspunkt (én måned etter riktig dag) og administrasjonsvindu, og teksten
 * skal ikke ha andre vedlikeholdsrader. En første vedlikeholdsinjeksjon som er
 * flyttet (for eksempel til én måned etter dag 1 i stedet for dag 8), et annet
 * intervall enn hver måned eller et vindu som mangler, gir avvik.
 */
export function vedlikeholdsavvik(tekst: string, forventet: readonly Vedlikehold[]): string[] {
  const rader = tekst.split('\n').flatMap((l) => {
    const m = VEDLIKEHOLD.exec(l)
    const d = m && LEDD.exec(m[2]!)
    return d ? [{ etterDag: Number(m[1]), legemiddel: d[1]!, dose: d[2]!.replace(/\s*\(.*\)$/, ''), tekst: m[2]! }] : []
  })
  const navn = (v: { legemiddel: string; dose: string; etterDag: number }) => `${v.legemiddel} ${v.dose} hver måned fra 1 måned etter dag ${v.etterDag}`
  const ut: string[] = []
  const igjen = [...rader]
  for (const v of forventet) {
    const i = igjen.findIndex((r) => r.legemiddel.toLowerCase().startsWith(v.legemiddel.toLowerCase()) && r.etterDag === v.etterDag && normal(r.dose) === normal(v.dose))
    if (i < 0) ut.push(`mangler ${navn(v)}`)
    else if (!v.vindu.test(igjen[i]!.tekst)) ut.push(`${navn(v)} mangler vinduet (${v.vindu.source})`)
    if (i >= 0) igjen.splice(i, 1)
  }
  for (const r of igjen) ut.push(`har ${navn(r)}, som fasiten ikke har`)
  return ut
}

/** Avvikene mellom det som ble observert og fasiten for forløpet (tom liste: i samsvar). */
export function kontrollerMotFasit(id: string, o: Observasjon): Avvik[] {
  const f = FASIT[id]
  const avvik: Avvik[] = []
  // Et stopp og en avklaring gir begge ingen plan, og begge skal si hva som er årsaken.
  const stopp = o.utfall === 'stopp' || o.utfall === 'avklaring'
  for (const [m, navn] of GENERISKE) if (m.test(o.skjerm) || (o.sporsmal ?? []).some((s) => m.test(s))) avvik.push({ type: 'bruk', hva: `Viser ${navn}.` })
  if (stopp && f?.stoppkategori !== 'teknisk' && PROV_IGJEN.test(o.skjerm)) avvik.push({ type: 'bruk', hva: 'Ber om «Prøv igjen senere» uten at stoppet er teknisk.' })
  if ((o.enkeltvalg ?? 0) > 0) avvik.push({ type: 'bruk', hva: `${o.enkeltvalg} dosevalg med bare ett alternativ måtte trykkes.` })
  if (!f) return avvik

  const riktige = [f.utfall].flat()
  const faktisk = o.utfall === 'komplett plan' ? 'komplett' : o.utfall
  if (!riktige.includes(faktisk as Utfall)) avvik.push({ type: 'klinisk', hva: `Utfallet er «${o.utfall}», fasiten sier ${riktige.join(' eller ')} (${f.kilde}).` })

  if (faktisk === 'komplett') {
    // Kopien har én rad per linje; for skjermen og utskriften leser nettleserkjøringen radene fra tidslinjen. Uten rader kontrolleres bare dosepunktene.
    const flater: [string, string, string | undefined][] = [
      ['Skjermen', o.skjerm, o.skjermrader],
      ['Kopien', o.kopi, o.kopi],
      ...(o.utskrift !== undefined ? [['Utskriften', o.utskrift, o.utskriftsrader] as [string, string, string | undefined]] : []),
    ]
    for (const [navn, tekst, rader] of flater) {
      if (!tekst) {
        avvik.push({ type: 'klinisk', hva: `${navn} er tom.` })
        continue
      }
      if (rader !== undefined) for (const x of [...forlopsavvik(rader, f.doser ?? []), ...vedlikeholdsavvik(rader, f.vedlikehold ?? [])]) avvik.push({ type: 'klinisk', hva: `${navn}: ${x}.` })
      else
        for (const p of (f.doser ?? []).filter((p) => !harDosepunkt(tekst, p))) avvik.push({ type: 'klinisk', hva: `${navn} mangler ${p.legemiddel} ${p.dose} ${dagtekst(p.fra, p.til ?? Infinity)}.` })
      if (f.slutt && !f.slutt.test(tekst)) avvik.push({ type: 'klinisk', hva: `${navn} mangler sluttmålet (${f.slutt.source}).` })
    }
  }
  if (stopp) {
    for (const g of f.grunn ?? []) if (!g.test(o.skjerm)) avvik.push({ type: 'bruk', hva: `Stoppet sier ikke hvilket forhold som stopper (venter ${g.source}).` })
    if (f.stoppkategori === 'ikke_godkjent' && SOM_KONTRAINDIKASJON.test(o.skjerm)) avvik.push({ type: 'bruk', hva: 'Manglende regelstøtte fremstilles som medisinsk forbud.' })
    if (f.stoppAvDose && (o.sporsmal?.length ?? 0) > 0) avvik.push({ type: 'bruk', hva: `${o.sporsmal!.length} spørsmål om pasienten står fortsatt åpne etter at dosen har utelukket planen.` })
  }
  for (const s of f.ikkeSpurt ?? []) if ((o.sporsmal ?? []).some((q) => s.test(q))) avvik.push({ type: 'bruk', hva: `Spør om noe som allerede er besvart (${s.source}).` })
  return avvik
}
