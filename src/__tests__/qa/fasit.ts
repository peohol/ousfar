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

export interface Fasit {
  /** Det klinisk riktige utfallet. To verdier: begge er riktige (for eksempel en låst tilpasning som gir standardplanen). */
  utfall: 'komplett' | 'stopp' | ('komplett' | 'stopp')[]
  /** Hvor fasiten kommer fra. */
  kilde: string
  /**
   * Strategien i ord, til rapporten. Den kontrolleres gjennom `doser`: kopien
   * skal ha nøyaktig disse dosene og ingen andre, så overlapp, et bytte på
   * feil dag eller et ekstra trinn gir avvik ({@link ekstraDoser}).
   */
  strategi?: string
  /** Hele doseforløpet en komplett plan skal ha: hvert punkt skal stå på skjermen, i kopien og i utskriften, og kopien skal ikke ha andre doser. */
  doser?: Dosepunkt[]
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
    kilde: 'docs/verktøy-k3-antipsykotika.md (depot-aripiprazol-maintena v3); Abilify Maintena preparatomtale pkt. 4.2 (én injeksjon og 14 dager peroral aripiprazol)',
    strategi: 'oppstart med én injeksjon og peroral overlapp i 14 dager',
    doser: [
      { fra: 1, til: 1, legemiddel: 'Aripiprazol depotinjeksjon', dose: '400 mg' },
      { fra: 1, til: 14, legemiddel: 'Aripiprazol peroralt', dose: '15 mg' },
    ],
    slutt: /hver måned[^\n]*400 mg|400 mg[^\n]*hver måned/i,
  },
  'P0-C05': {
    utfall: 'komplett',
    kilde: 'docs/verktøy-k3-antipsykotika.md (depot-risperidon-xeplion v8: 3 mg risperidon → 150/100 mg, så 75 mg månedlig); Xeplion preparatomtale pkt. 4.2',
    strategi: 'oppstartsinjeksjoner dag 1 og 8, så månedlig vedlikehold',
    doser: [
      { fra: 1, til: 1, legemiddel: 'Paliperidon depotinjeksjon', dose: '150 mg' },
      { fra: 8, til: 8, legemiddel: 'Paliperidon depotinjeksjon', dose: '100 mg' },
    ],
    slutt: /hver måned[^\n]*75 mg|75 mg[^\n]*hver måned/i,
  },
  'P0-C06': {
    utfall: 'komplett',
    kilde: 'docs/verktøy-k3-antipsykotika.md (depot-paliperidon-xeplion v3); Xeplion preparatomtale pkt. 4.2 (peroral paliperidon 6 mg ↔ 75 mg månedlig)',
    strategi: 'oppstartsinjeksjoner dag 1 og 8, så månedlig vedlikehold',
    doser: [
      { fra: 1, til: 1, legemiddel: 'Paliperidon depotinjeksjon', dose: '150 mg' },
      { fra: 8, til: 8, legemiddel: 'Paliperidon depotinjeksjon', dose: '100 mg' },
    ],
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

/** Det som ble observert i ett forløp: tekst og tellinger. */
export interface Observasjon {
  utfall: 'komplett plan' | 'stopp' | 'annet'
  /** Planpanelet til slutt. */
  skjerm: string
  /** Den vanlige (korte) kopien, tom når det ikke finnes noen. */
  kopi: string
  /** Planpanelet slik det skrives ut, når utskriften ble kontrollert. */
  utskrift?: string
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

/** Ett legemiddel i en rad i kopien: «Navn form: dose = …» eller, for en injeksjon, «Navn depotinjeksjon dose = …». */
const LEDD = /^\s*(\p{Lu}\p{Ll}+ (?:peroralt|depotinjeksjon))(?::\s*|\s+)(.*?)(?:\s=\s.*)?$/u
const SEPONERT = /^seponert$/i
const likDose = (a: string, b: string) => a.replace(/\s+/g, ' ').trim().toLowerCase() === b.replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * Dosene i en tekst med én rad per linje (kopien, motorens tekst) som fasiten
 * ikke har: en dose på en dag der fasiten har en annen eller ingen dose for
 * legemidlet, et legemiddel fasiten ikke kjenner, eller «Seponert» mens
 * fasiten fortsatt gir legemidlet. Sammen med kravet om at hvert dosepunkt
 * finnes, betyr en tom liste at doseforløpet er nøyaktig fasitens. Vurderinger
 * og de gjentatte vedlikeholdsinjeksjonene («Hver måned …», kontrollert av
 * `slutt`) er ikke doserader og telles ikke.
 */
export function ekstraDoser(tekst: string, f: Pick<Fasit, 'doser'>): string[] {
  const ut: string[] = []
  for (const l of tekst.split('\n')) {
    const m = RAD.exec(l)
    if (!m) continue
    const fra = Number(m[2])
    const til = m[3] ? Number(m[3]) : /^fra/i.test(m[1]!) ? Infinity : fra
    const dager = til === Infinity ? `fra dag ${fra}` : til === fra ? `dag ${fra}` : `dag ${fra}–${til}`
    const innhold = m[4]!.replace(/^[^:]*:/, '')
    if (/^\s*Vurdering\b/.test(innhold)) continue
    for (const ledd of innhold.split(';')) {
      const d = LEDD.exec(ledd)
      if (!d) continue
      const [, navn, raa] = d
      const dose = raa!.replace(/\s*\(.*\)$/, '')
      const punkter = (f.doser ?? []).filter((p) => navn!.toLowerCase().startsWith(p.legemiddel.toLowerCase()))
      const overlapper = punkter.filter((p) => p.fra <= til && fra <= (p.til ?? Infinity))
      const riktig = SEPONERT.test(dose) ? overlapper.length === 0 : overlapper.some((p) => p.fra <= fra && til <= (p.til ?? Infinity) && likDose(dose, p.dose))
      if (!riktig) ut.push(`${navn} ${dose} ${dager}`)
    }
  }
  return ut
}

/** Avvikene mellom det som ble observert og fasiten for forløpet (tom liste: i samsvar). */
export function kontrollerMotFasit(id: string, o: Observasjon): Avvik[] {
  const f = FASIT[id]
  const avvik: Avvik[] = []
  const stopp = o.utfall === 'stopp'
  for (const [m, navn] of GENERISKE) if (m.test(o.skjerm) || (o.sporsmal ?? []).some((s) => m.test(s))) avvik.push({ type: 'bruk', hva: `Viser ${navn}.` })
  if (stopp && f?.stoppkategori !== 'teknisk' && PROV_IGJEN.test(o.skjerm)) avvik.push({ type: 'bruk', hva: 'Ber om «Prøv igjen senere» uten at stoppet er teknisk.' })
  if ((o.enkeltvalg ?? 0) > 0) avvik.push({ type: 'bruk', hva: `${o.enkeltvalg} dosevalg med bare ett alternativ måtte trykkes.` })
  if (!f) return avvik

  const riktige = [f.utfall].flat()
  const faktisk = o.utfall === 'komplett plan' ? 'komplett' : o.utfall
  if (!riktige.includes(faktisk as 'komplett' | 'stopp')) avvik.push({ type: 'klinisk', hva: `Utfallet er «${o.utfall}», fasiten sier ${riktige.join(' eller ')} (${f.kilde}).` })

  if (faktisk === 'komplett') {
    for (const [navn, tekst] of [['Skjermen', o.skjerm], ['Kopien', o.kopi], ...(o.utskrift !== undefined ? [['Utskriften', o.utskrift]] : [])] as const) {
      if (!tekst) {
        avvik.push({ type: 'klinisk', hva: `${navn} er tom.` })
        continue
      }
      const mangler = (f.doser ?? []).filter((p) => !harDosepunkt(tekst, p))
      for (const p of mangler) avvik.push({ type: 'klinisk', hva: `${navn} mangler ${p.legemiddel} ${p.dose} ${p.til === undefined ? `fra dag ${p.fra}` : `dag ${p.fra}–${p.til}`}.` })
      if (f.slutt && !f.slutt.test(tekst)) avvik.push({ type: 'klinisk', hva: `${navn} mangler sluttmålet (${f.slutt.source}).` })
    }
    // Kopien har én rad per linje og de samme radene som skjermen (`planTekst`), så den kan sammenlignes rad for rad.
    if (f.doser && o.kopi) for (const x of ekstraDoser(o.kopi, f)) avvik.push({ type: 'klinisk', hva: `Kopien har ${x}, som fasiten ikke har.` })
  }
  if (stopp) {
    for (const g of f.grunn ?? []) if (!g.test(o.skjerm)) avvik.push({ type: 'bruk', hva: `Stoppet sier ikke hvilket forhold som stopper (venter ${g.source}).` })
    if (f.stoppkategori === 'ikke_godkjent' && SOM_KONTRAINDIKASJON.test(o.skjerm)) avvik.push({ type: 'bruk', hva: 'Manglende regelstøtte fremstilles som medisinsk forbud.' })
    if (f.stoppAvDose && (o.sporsmal?.length ?? 0) > 0) avvik.push({ type: 'bruk', hva: `${o.sporsmal!.length} spørsmål om pasienten står fortsatt åpne etter at dosen har utelukket planen.` })
  }
  for (const s of f.ikkeSpurt ?? []) if ((o.sporsmal ?? []).some((q) => s.test(q))) avvik.push({ type: 'bruk', hva: `Spør om noe som allerede er besvart (${s.source}).` })
  return avvik
}
