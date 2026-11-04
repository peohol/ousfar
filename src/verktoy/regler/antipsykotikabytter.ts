/**
 * Byttereglene for antipsykotika i K3 (`docs/verktøy-klinisk-leveranseplan-2026-11.md`):
 * komplette forløp fra dagens behandling til et definert sluttmål, to
 * depotrelaterte og fem perorale. Bakgrunnen, kildene og hva som fortsatt
 * ikke er dekket, står i `docs/verktøy-k3-antipsykotika.md` (rapporten over reglene: `docs/verktøy-k3-antipsykotikabytter.md`). Filen eies av K3; registreringen står i `domenesett.ts`.
 *
 * Hver regel bygger bare på preparatomtaler (DMP og EMA), Keks 2019, TARC 2018 og Russu 2018; ingen
 * bygger på Psychiatrienet, som bare står som referanse til kildeoppføringen
 * (`docs/verktøy-p3-rettigheter.md`). Reglene er valgt fordi kildene selv
 * beskriver hele forløpet, så ingen dose, frist eller nedtrapping er OUSFARs
 * eget påfunn:
 *
 * - Depot: Xeplion fra peroral risperidon og fra Risperdal Consta
 *   (Xeplion pkt. 4.2). Sluttmålet er fast månedlig vedlikehold; etter
 *   peroral risperidon gir regelen bare en plan med anbefalte 75 mg, og bare
 *   ved 3 mg risperidon daglig med god effekt og toleranse, der
 *   preparatomtalen og Russu 2018 er enige.
 * - Peroralt: direkte bytte fra aripiprazol til olanzapin eller risperidon
 *   (Keks 2019: direkte bytte er mulig fra aripiprazol, som har svært lang
 *   halveringstid og ingen antikolinerg effekt), og fra kariprazin til
 *   kvetiapin (Reagila pkt. 4.2: ingen kryss-titrering, det nye startes i
 *   laveste dose). Fra aripiprazol er startregimet og forskriverens valgte
 *   måldose atskilt, med en ny klinisk vurdering før dosen endres; fra
 *   kariprazin er sluttmålet kvetiapindosen preparatomtalen oppgir, bekreftet
 *   som forsvarlig for pasienten.
 * - Kryss-titrering fra olanzapin og fra risperidon til aripiprazol hos stabile
 *   polikliniske pasienter (TARC 2018, figur 1): det forrige stoffet trappes
 *   ned til seponering, og aripiprazol står på måldosen 10 eller 15 mg. Siste
 *   trinn til 0 krever en egen vurdering av pasienten.
 *
 * **Ingen av reglene er klinisk godkjent.** De står til uavhengig faglig
 * kontroll og gir ingen klinisk plan i appen før en kontrollør har godkjent
 * nøyaktig versjonen og fingeravtrykket.
 */
import { FORUTSETNINGER_FELLES, forslag, h, kilde, pn, steg, utsagn } from './bygg'
import type { Domenesett } from './domenesett'
import { godkjenn, type Godkjenningsvedtak } from './godkjenning'
import type { Avklaring, Bekreftelse, Fase, Forlop, Godkjenning, Kildehenvisning, Regel, Regelsett, Unntak } from './modell'
import { REGELMODELLVERSJON } from './modell'
import { TEKNISK_MAKS_DAGER } from './nedtrapping'
import { SPC } from './pilotsett'

/* --- Godkjenning ------------------------------------------------------------------ */

const K3 = '2026-11-03'
const TIL_KONTROLL = 'Sendt til uavhengig faglig kontroll av kilder, klinisk innhold, norske preparater og regneeksempler (K3). Ikke klinisk godkjent.'
/**
 * Til faglig kontroll i siste versjon. `endringer` er hva hver senere versjon
 * endret (versjon 2, 3, ...), f.eks. etter kontrollørens gjennomgang.
 */
const tilKontroll = (merknad: string, ...endringer: string[]): Godkjenning => ({
  status: 'til_faglig_kontroll',
  historikk: [merknad, ...endringer].flatMap((m, i) => [steg('utkast', i + 1, m, K3), steg('til_faglig_kontroll', i + 1, TIL_KONTROLL, K3)]),
})
/** Kontrollørens gjennomgang av #320 (03.11.2026), som versjon 2 svarer på. */
const GJENNOMGANG = 'Etter kontrollørens gjennomgang av #320 03.11.2026:'
/** Kontrollørens andre gjennomgang av #320 (03.11.2026, head 9563380). */
const GJENNOMGANG_2 = 'Etter kontrollørens andre gjennomgang av #320 03.11.2026:'
/** Kontrollørens tredje gjennomgang av #320 (03.11.2026, head ff2859d). */
const GJENNOMGANG_3 = 'Etter kontrollørens tredje gjennomgang av #320 03.11.2026:'
/** Kontrollørens fjerde gjennomgang av #320 (03.11.2026, head b0a996d). */
const GJENNOMGANG_4 = 'Etter kontrollørens fjerde gjennomgang av #320 03.11.2026:'
/** Kontrollørens femte gjennomgang av #320 (03.11.2026, head 9024c87). */
const GJENNOMGANG_5 = 'Etter kontrollørens femte gjennomgang av #320 03.11.2026:'
/** Kontrollørens sjette gjennomgang av #320 (03.11.2026, head c5a06b0). */
const GJENNOMGANG_6 = 'Etter kontrollørens sjette gjennomgang av #320 03.11.2026:'
/** Kontrollørens sjuende gjennomgang av #320 (03.11.2026, head 07d6736). */
const GJENNOMGANG_7 = 'Etter kontrollørens sjuende gjennomgang av #320 03.11.2026:'
/** Kontrollørens åttende gjennomgang av #320 (04.11.2026, head 65c3fb8, kommentar 6620232533). */
const GJENNOMGANG_8 = 'Etter kontrollørens åttende gjennomgang av #320 04.11.2026:'
/** Kontrollørens niende gjennomgang av #320 (04.11.2026, head aadcf57, kommentar 6623643706). */
const GJENNOMGANG_9 = 'Etter kontrollørens niende gjennomgang av #320 04.11.2026:'
/** Kontrollørens tiende gjennomgang av #320 (04.11.2026, head fd31b88, kommentar 6625183969). */
const GJENNOMGANG_10 = 'Etter kontrollørens tiende gjennomgang av #320 04.11.2026:'
/** Kontrollørens ellevte gjennomgang av #320 (04.11.2026, head 63464bd, kommentar 6626569802). */
const GJENNOMGANG_11 = 'Etter kontrollørens ellevte gjennomgang av #320 04.11.2026:'
/** Samme navn som kontrolløren har i pilotsettet. */
const KONTROLLOR = 'ChatGPT (uavhengig fagkontrollør)'
/** En gjennomgang der kontrolløren avklarte åpne valg: versjonen som ble vurdert, og kommentaren med vurderingen. */
interface Kontrollorgjennomgang {
  commit: string
  kommentar: string
  dato: string
}
const AVKLARING_8: Kontrollorgjennomgang = { commit: '65c3fb8', kommentar: '6620232533', dato: '2026-11-04' }
const AVKLARING_9: Kontrollorgjennomgang = { commit: 'aadcf57', kommentar: '6623643706', dato: '2026-11-04' }
const AVKLARING_11: Kontrollorgjennomgang = { commit: '63464bd', kommentar: '6626569802', dato: '2026-11-04' }
/**
 * Kontrollørens avklaring av ett åpent OUSFAR-valg. `regelversjon` er
 * versjonen kontrolløren vurderte; valget er uendret i versjonen etter.
 * Avklaringen er ingen godkjenning av regelen.
 */
const avklartAvKontrollor = (g: Kontrollorgjennomgang, regelversjon: number, hva: string): Avklaring => ({
  dato: g.dato,
  av: KONTROLLOR,
  rolle: 'uavhengig_kontrollor',
  regelversjon,
  merknad: `Kontrollørens gjennomgang av ${g.commit} ${g.dato.split('-').reverse().join('.')} (#320, kommentar ${g.kommentar}): ${hva} Avklaringen gjelder bare dette valget og er ingen klinisk godkjenning av regelen.`,
})

/* --- Fakta fra kildene, med egne ord ------------------------------------------------- */

const KEKS = {
  spesialist: h('keks-2019', 'tabell 4 og avsnittet om bytte', 'Bytte mellom antipsykotika bør vurderes av psykiater. Under byttet kan sykdommen forverres og nye bivirkninger komme, så pasienten må følges tett.'),
  direkte: h('keks-2019', 'tabell 4 (direkte bytte)', 'Direkte bytte: det første antipsykotikumet stoppes og det neste startes dagen etter. Det krever erfaring og gjøres helst der pasienten kan følges tett, gjerne innlagt.'),
  fraAripiprazol: h('keks-2019', 'avsnittet om direkte bytte', 'Når det første antipsykotikumet er aripiprazol eller brekspiprazol, kan byttet gjøres direkte, fordi begge har svært lang halveringstid og ingen antikolinerg effekt.'),
  aripiprazolHalveringstid: h('keks-2019', 'tabell 1', 'Halveringstiden til aripiprazol er om lag 75 timer, og 95 timer for den aktive metabolitten.'),
  depotTilDepot: h('keks-2019', 'tabell 4 (depot til depot)', 'Ved bytte fra et depot til et annet følges instruksjonen for det nye depotet; byttet gjøres oftest direkte og blir på grunn av de lange halveringstidene i praksis en kryss-titrering.'),
  kryss: h('keks-2019', 'avsnittet om kryss-titrering', 'De fleste psykiatere bruker kryss-titrering: det første antipsykotikumet trappes ned mens det neste innføres.'),
  kontinuering: h('keks-2019', 'tabell 4 (fortsettelse med langsommere opptrapping)', 'Den mest forsiktige strategien, egnet ved høy risiko for tilbakefall: det første holdes i vanlig dose mens det neste trappes opp nær terapeutisk dose, så trappes det første ned og stoppes.'),
  kolinerg: h('keks-2019', 'tabell 2', 'Kolinergt seponeringssyndrom (blant annet ved olanzapin): kvalme, oppkast, hodepine, uro, angst, søvnløshet, tretthet, muskelsmerter, svetting og løs avføring.'),
  dopaminerg: h('keks-2019', 'tabell 2', 'Dopaminergt seponeringssyndrom (alle antipsykotika): seponeringsdyskinesi, akatisi, dystoni og tardive dyskinesier.'),
  ingenOpphold: h('keks-2019', 'avsnittet om byttestrategier', 'I motsetning til ved bytte av antidepressiver anbefales ikke et opphold uten antipsykotikum mellom det første og det neste.'),
}

/** Nettverktøyet til samme forfattere: virkestoffspesifikke råd for perorale bytter. Klinisk veiledning, ikke prospektiv validering, og ikke oppdatert siden 2022. */
const BYTEVERKTOY = {
  status: h('keks-2019-verktoy', 'Using the tool', 'Verktøyet skal hjelpe forskrivere ved bytte av antipsykotika. Det oppdateres ikke lenger, ble sist oppdatert 1. februar 2022, og informasjonen er kanskje ikke oppdatert.'),
  olanzapin: h('keks-2019-verktoy', 'oral to oral, olanzapine to aripiprazole', 'Fra olanzapin til aripiprazol: lave doser olanzapin kan stoppes dag 1; doser over 10 mg halveres dag 1 og stoppes etter 7 dager, mens aripiprazol startes dag 1.'),
  olanzapinRisiko: h('keks-2019-verktoy', 'oral to oral, olanzapine to aripiprazole', 'Aripiprazol er mer aktiverende enn olanzapin, med risiko for akatisi, agitasjon og irritabilitet; uten antikolinerg effekt gir det noe risiko for kolinerg rebound når olanzapin stoppes.'),
  risperidon: h('keks-2019-verktoy', 'oral to oral, risperidone to aripiprazole', 'Fra risperidon til aripiprazol: doser over 3 mg daglig halveres dag 1 og stoppes dag 5, mens aripiprazol startes dag 1.'),
  risperidonRisiko: h('keks-2019-verktoy', 'oral to oral, risperidone to aripiprazole', 'Aripiprazol er mer aktiverende eller mindre sederende enn risperidon, med risiko for akatisi og en viss risiko for agitasjon og irritabilitet.'),
  tilRisperidon: h('keks-2019-verktoy', 'oral to oral, aripiprazole to risperidone', 'Fra aripiprazol til risperidon: risperidon kan startes med 50 % av måldosen dag 1 og økes ved behov dag 5. Noen trenger langsommere opptrapping og lavere start- og vedlikeholdsdose.'),
  tilRisperidonRisiko: h('keks-2019-verktoy', 'oral to oral, aripiprazole to risperidone', 'Ortostatisk blodtrykksfall kan komme etter første dose av risperidon, og risperidon gir oftere prolaktinøkning enn aripiprazol.'),
  aripiprazolStart: h('keks-2019-verktoy', 'oral to oral, til aripiprazol', 'Aripiprazol startes med 10 mg dag 1, eller med kjent måldose, men høyere doser gir risiko for akatisi, agitasjon og søvnløshet; doseøkning vurderes etter 14 dager.'),
}

const XEPLION = {
  fraRisperidon: h('ema-xeplion', 'section 4.2 (bytte fra peroral)', 'Ved bytte fra peroral paliperidon eller peroral risperidon startes Xeplion med den vanlige oppstarten: 150 mg dag 1 og 100 mg dag 8.'),
  vedlikehold: h('ema-xeplion', 'section 4.2', 'Anbefalt månedlig vedlikeholdsdose er 75 mg; noen kan ha nytte av lavere eller høyere dose innenfor 25–150 mg ut fra toleranse og effekt.'),
  overvekt: h('ema-xeplion', 'section 4.2', 'Pasienter med overvekt eller fedme kan trenge doser i den øvre delen av området.'),
  overfolsomhet: h('ema-xeplion', 'section 4.3 og 4.4', 'Overfølsomhet for paliperidon eller risperidon er en kontraindikasjon. Anafylaktiske reaksjoner er sett etter injeksjon også hos pasienter som tidligere har tålt peroral risperidon eller paliperidon.'),
  justering: h('ema-xeplion', 'section 4.2', 'Vedlikeholdsdosen kan justeres månedlig; full effekt av en endret dose kan først sees etter flere måneder.'),
  fraConsta: h('ema-xeplion', 'section 4.2 (bytte fra risperidon depotinjeksjon)', 'Fra risperidon depotinjeksjon gis Xeplion i stedet for neste planlagte injeksjon og deretter månedlig, uten oppstartsdosene dag 1 og dag 8.'),
  constaTabell: h('ema-xeplion', 'section 4.2 (bytte fra risperidon depotinjeksjon)', 'Risperidon depotinjeksjon 25, 37,5 og 50 mg hver 2. uke tilsvarer ved vedlikehold Xeplion 50, 75 og 100 mg månedlig.'),
  eldre: h('ema-xeplion', 'section 4.2 (eldre)', 'Effekt og sikkerhet hos eldre over 65 år er ikke fastslått; eldre kan ha nedsatt nyrefunksjon som krever andre doser.'),
}

/** Farmakokinetiske simuleringer fra produsenten (alle forfatterne fra Janssen); ikke kliniske forskrivningsdata. */
const RUSSU = {
  tabell: h('russu-2018', 'Results, tabell 1', 'Simuleringer: risperidon 1, 2, 3, 4 og 6 mg daglig gir omtrent samme eksponering ved steady state som Xeplion 25, 50, 75, 100 og 150 mg månedlig, også når døgndosen deles på to.'),
  interaksjoner: h('russu-2018', 'Discussion', 'Omregningen tar ikke hensyn til CYP2D6-hemmere (f.eks. paroksetin, sertralin, fluoksetin) eller CYP3A- og P-gp-induktorer (f.eks. karbamazepin).'),
  klinikk: h('russu-2018', 'Discussion', 'Etterlevelse, effekt og toleranse er avgjørende når vedlikeholdsdosen velges.'),
  sponsor: h('russu-2018', 'Disclosures', 'Studien er sponset av Janssen, og alle forfatterne er ansatt der og aksjonærer i morselskapet.'),
  oppfolging: h('russu-2018', 'Conclusion', 'Kliniske symptomer skal alltid vurderes ved bytte, og pasienten skal følges tett før og etter byttet.'),
}

const RISPERDAL = {
  dose: h('dmp-risperdal', 'pkt. 4.2', 'Schizofreni hos voksne: start med 2 mg daglig; dosen kan økes til 4 mg dag 2 og deretter holdes eller tilpasses. De fleste har effekt av 4–6 mg daglig.'),
  maks: h('dmp-risperdal', 'pkt. 4.2', 'Doser over 10 mg daglig har ikke vist bedre effekt; doser over 16 mg daglig er ikke vurdert for sikkerhet og anbefales ikke.'),
  enEllerTo: h('dmp-risperdal', 'pkt. 4.2', 'Risperidon kan gis én eller to ganger daglig.'),
  eldre: h('dmp-risperdal', 'pkt. 4.2', 'Eldre: anbefalt startdose er 0,5 mg to ganger daglig, med langsom økning til 1–2 mg to ganger daglig.'),
  nyreLever: h('dmp-risperdal', 'pkt. 4.2 og 4.4', 'Ved nedsatt nyre- eller leverfunksjon bør start- og vedlikeholdsdosen halveres og opptrappingen gå langsommere.'),
  seponering: h('dmp-risperdal', 'pkt. 4.2', 'Ved seponering anbefales gradvis nedtrapping. Akutt abstinens (kvalme, oppkast, svette, søvnløshet) er svært sjelden etter brå stans av høye doser; tilbakefall av psykose og akatisi, dystoni og dyskinesi er rapportert.'),
  interaksjoner: h('dmp-risperdal', 'pkt. 4.5', 'Når en sterk CYP2D6-hemmer (f.eks. paroksetin, fluoksetin) eller en sterk CYP3A4-induktor (f.eks. karbamazepin) startes eller seponeres, bør doseringen vurderes på nytt.'),
}

const CONSTA = {
  dose: h('dmp-risperdal-consta', 'pkt. 4.2', 'Risperdal Consta gis intramuskulært annenhver uke, vanligvis 25 mg; noen trenger 37,5 eller 50 mg. Høyere doser enn 50 mg anbefales ikke.'),
}

const REAGILA = {
  dose: h('ema-reagila', 'section 4.2', 'Anbefalt startdose er 1,5 mg én gang daglig, med langsom økning i trinn på 1,5 mg til høyst 6 mg daglig.'),
  fra: h('ema-reagila', 'section 4.2 (bytte fra kariprazin)', 'Ved bytte fra kariprazin trengs ingen gradvis kryss-titrering: det nye antipsykotikumet startes i laveste dose mens kariprazin seponeres.'),
  halvering: h('ema-reagila', 'section 4.2 og 5.2', 'Plasmakonsentrasjonen av kariprazin og de aktive metabolittene faller med om lag 50 % på én uke etter seponering; effekten avtar gradvis.'),
  indikasjon: h('ema-reagila', 'section 4.1', 'Kariprazin er godkjent til behandling av schizofreni hos voksne.'),
}

const ZYPREXA = {
  start: h('ema-zyprexa', 'section 4.2', 'Schizofreni: anbefalt startdose er 10 mg daglig. Dosen kan senere justeres innenfor 5–20 mg etter ny klinisk vurdering, med minst 24 timer mellom økningene.'),
  lavereStart: h('ema-zyprexa', 'section 4.2', 'Lavere startdose (5 mg) bør vurderes fra 65 år når kliniske forhold tilsier det, ved nedsatt nyre- eller leverfunksjon og ved flere faktorer for langsommere omsetning (kvinne, høy alder, ikke-røyker).'),
  cyp1a2: h('ema-zyprexa', 'section 4.5', 'Ved samtidig bruk av fluvoksamin eller andre CYP1A2-hemmere, som ciprofloksacin, bør lavere startdose av olanzapin vurderes.'),
}

const SEROQUEL = {
  eldre: h('dmp-seroquel', 'pkt. 4.2 (eldre)', 'Eldre kan trenge langsommere opptrapping og lavere vedlikeholdsdose; plasmaclearance er 30–50 % lavere enn hos yngre.'),
  lever: h('dmp-seroquel', 'pkt. 4.2 (nedsatt leverfunksjon)', 'Ved nedsatt leverfunksjon bør startdosen være 25 mg daglig, med økning på 25–50 mg daglig til effektiv dose.'),
  cyp3a4: h('dmp-seroquel', 'pkt. 4.3', 'Samtidig bruk av CYP3A4-hemmere, som HIV-proteasehemmere, azolantimykotika, erytromycin, klaritromycin og nefazodon, er kontraindisert.'),
}

/* --- Felles byggesteiner -------------------------------------------------------------- */

/** De felles forutsetningene og regelens egne. */
const forutsetninger = (...tillegg: string[]) => [...FORUTSETNINGER_FELLES, ...tillegg]

const NYRE: Unntak = {
  id: 'nedsatt_nyrefunksjon',
  tekst: 'Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min.',
  grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionNyre] },
}
const XEPLION_ELDRE: Unntak = {
  id: 'over_65',
  tekst: 'Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen.',
  grunnlag: { type: 'kilde', henvisninger: [XEPLION.eldre] },
}

/** Bekreftelsen i de perorale byttene: byttet er vurdert av spesialist, og pasienten følges tett. */
const spesialist = (): Bekreftelse => ({
  id: 'spesialist_risiko',
  tekst:
    'Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall.',
  grunnlag: { type: 'kilde', henvisninger: [KEKS.spesialist, KEKS.direkte] },
})

const peroral = (stoff: string): Bekreftelse => ({
  id: 'peroral_formulering',
  tekst: `Pasienten bruker peroral ${stoff} (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon.`,
  grunnlag: { type: 'kilde', henvisninger: [KEKS.depotTilDepot] },
})

/** Forløpet for legemidlet pasienten slutter med: siste dose er dagen før dag 1. */
const seponeres = (nokkel: string, administrasjon: Forlop['administrasjon'], ekstra: Partial<Forlop> = {}): Forlop => ({
  id: 'fra',
  virkestoff: { type: 'virkestoff', nokkel },
  administrasjon,
  utgangsdose: 'startdose',
  start: { type: 'dag', dag: 1 },
  faser: [{ type: 'seponer' }],
  ...ekstra,
})

/** Forløpet for det nye perorale legemidlet fra dag 1. */
const startes = (nokkel: string, faser: Fase[], ekstra: Partial<Forlop> = {}): Forlop => ({
  id: 'til',
  virkestoff: { type: 'virkestoff', nokkel },
  administrasjon: 'peroral',
  utgangsdose: null,
  start: { type: 'dag', dag: 1 },
  faser,
  ...ekstra,
})

const XEPLION_STED = 'deltoideus eller setemuskel'

/* --- Depot: peroral risperidon → Xeplion ----------------------------------------------- */

const NYRE_AVKREFTET = { nedsatt_nyrefunksjon: false, over_65: false }
const XEPLION_BEKREFTET = ['indikasjon', 'tidligere_toleranse', 'effekt_toleranse']
const XEPLION_AVKREFTET = { ...NYRE_AVKREFTET, overvekt: false, risperidon_interaksjon: false }
const XEPLION_OVERVEKT: Unntak = {
  id: 'overvekt',
  tekst: 'Pasienten har overvekt eller fedme; preparatomtalen sier at doser i den øvre delen av området kan trengs, så anbefalte 75 mg er ikke nødvendigvis riktig.',
  grunnlag: { type: 'kilde', henvisninger: [XEPLION.overvekt] },
}
/** Når planens vedlikeholdsdose ikke gjelder lenger, og en individuell vurdering overstyrer den (kontrollørens sjuende gjennomgang). */
const XEPLION_OVERSTYRING =
  'Planens 75 mg gjelder ikke lenger, og vedlikeholdsdosen vurderes individuelt, ved forverring eller tilbakefall av psykotiske symptomer, dosebegrensende eller ekstrapyramidale bivirkninger, overfølsomhet, nedsatt nyrefunksjon eller utviklet overvekt eller fedme. Dosen kan justeres månedlig, men full effekt av en endret dose kan først sees etter flere måneder.'
const XEPLION_INTERAKSJON: Unntak = {
  id: 'risperidon_interaksjon',
  tekst: 'Pasienten bruker en CYP2D6-hemmer (f.eks. paroksetin, sertralin, fluoksetin) eller en CYP3A4-induktor (f.eks. karbamazepin); da sier risperidondosen ikke hvilken eksponering Xeplion må gi.',
  grunnlag: { type: 'kilde', henvisninger: [RUSSU.interaksjoner, RISPERDAL.interaksjoner] },
}

const risperidonXeplion: Regel = {
  id: 'depot-risperidon-xeplion',
  versjon: 8,
  tittel: 'Fra peroral risperidon til Xeplion',
  fra: { type: 'virkestoff', nokkel: 'risperidon' },
  til: { type: 'virkestoff', nokkel: 'paliperidon' },
  plan: {
    form: 'oppstart_depot',
    forlop: [
      seponeres('risperidon', 'peroral'),
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'paliperidon' },
        administrasjon: 'depotinjeksjon',
        formulering: 'Xeplion (paliperidonpalmitat, månedlig)',
        // Generiske paliperidonpalmitat (Niapelf, Palmeux, Paliperidon Zentiva) og tremånedersdepotet er ikke kontrollert og ikke omfattet.
        preparater: ['Xeplion'],
        utgangsdose: null,
        start: { type: 'dag', dag: 1 },
        faser: [
          {
            type: 'injeksjoner',
            start: [
              { dag: kilde(1, 'dag', 'bindende_krav', XEPLION.fraRisperidon), dose: { type: 'fast', mg: kilde(150, 'mg', 'bindende_krav', SPC.xeplionStart, XEPLION.fraRisperidon) }, sted: 'deltoideus' },
              {
                dag: kilde(8, 'dag', 'bindende_krav', SPC.xeplionStart),
                dose: { type: 'fast', mg: kilde(100, 'mg', 'bindende_krav', SPC.xeplionStart, XEPLION.fraRisperidon) },
                sted: 'deltoideus',
                vindu_dager: kilde(4, 'dager', 'bindende_krav', SPC.xeplionVinduer),
              },
            ],
            vedlikehold: {
              dose: { type: 'inndata', navn: 'maldose' },
              maaneder: kilde(1, 'maaneder', 'bindende_krav', SPC.xeplionStart),
              vindu_dager: kilde(7, 'dager', 'bindende_krav', SPC.xeplionVinduer),
              sted: XEPLION_STED,
            },
          },
        ],
        // Kontrollørens sjette gjennomgang: oppfølgingen er en del av planen, ikke bare en bekreftelse.
        vurderinger: [
          {
            id: 'for_injeksjon',
            nar: { type: 'for_hvert_trinn' },
            tekst: 'Før injeksjonen dag 8 og før hver månedlige vedlikeholdsinjeksjon: psykotiske symptomer, ekstrapyramidale og andre bivirkninger og reaksjoner etter forrige injeksjon vurderes, og pasienten følges tett gjennom byttet.',
            ved_funn: XEPLION_OVERSTYRING,
            grunnlag: { type: 'kilde', henvisninger: [RUSSU.oppfolging, RUSSU.klinikk, KEKS.spesialist, XEPLION.justering, XEPLION.overfolsomhet, XEPLION.overvekt, SPC.xeplionNyre] },
          },
        ],
      },
    ],
  },
  inndata: [
    // Kontrollørens sjette gjennomgang: 4–6 mg → 75 mg kan gi for lav vedlikeholdseksponering (Russu 2018). Planen gjelder bare der preparatomtalens anbefalte 75 mg og simuleringen er enige.
    {
      navn: 'startdose',
      verdier: [3],
      art: 'bindende_krav',
      grunnlag: {
        type: 'ousfar_vurdering',
        begrunnelse:
          'Planen gjelder bare pasienter på 3 mg risperidon daglig, den eneste dosen der preparatomtalens anbefalte vedlikeholdsdose 75 mg og Russu 2018 er enige (3 mg risperidon gir omtrent samme eksponering som 75 mg Xeplion). Ved 4–6 mg tilsvarer 75 mg etter simuleringen en lavere eksponering enn dagens (4 mg ≈ 100 mg, 6 mg ≈ 150 mg), så 75 mg kan gi for lav vedlikeholdseksponering. OUSFAR tar ikke i bruk de høyere dosene fra simuleringen, fordi den er farmakokinetisk, sponset av produsenten og ikke prøvd ut på pasienter; de planlegges individuelt. Avgrensningen er OUSFARs bevisste kliniske beslutning om et snevert bruksområde: en begrenset startstrategi, ikke en individuell doseekvivalens, og simuleringen er ingen garanti for den enkelte.',
        henvisninger: [RUSSU.tabell, RUSSU.sponsor, XEPLION.vedlikehold, RISPERDAL.dose, SPC.xeplionOmregning],
        // Kontrollørens åttende gjennomgang: avgrensningen er vurdert og avklart, men regelen er ikke godkjent.
        avklaring: avklartAvKontrollor(
          AVKLARING_8,
          7,
          'Peroral risperidon 3 mg daglig til Xeplion 150 mg dag 1 og 100 mg dag 8, så 75 mg månedlig, er en faglig plausibel, begrenset startstrategi etter preparatomtalen og Russu 2018, ikke individuell doseekvivalens. Vilkårene om stabil effekt, dokumentert toleranse, normal nyrefunksjon, fravær av overvekt og relevante interaksjoner og vurderingen før injeksjonene er gode sikkerhetsavgrensninger; 75 mg skal være forskriverens faktiske vedlikeholdsmål og revurderes ved kliniske funn, og 4–6 mg til 75 mg skal fortsatt stoppe.',
        ),
      },
    },
    // Kontrollørens tredje gjennomgang: regelen erklærer bare en komplett plan for den anbefalte vedlikeholdsdosen. En annen dose planlegges individuelt.
    { navn: 'maldose', verdier: [75], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [XEPLION.vedlikehold] } },
  ],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen, har schizofreni og er stabilisert på peroral risperidon.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionIndikasjon, XEPLION.fraRisperidon] },
    },
    {
      id: 'tidligere_toleranse',
      tekst: 'Det er dokumentert i journalen at pasienten har tålt peroral risperidon over tid, uten tegn til overfølsomhet. Anafylaksi er likevel mulig etter injeksjon.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionIndikasjon, XEPLION.overfolsomhet] },
    },
    {
      id: 'effekt_toleranse',
      tekst:
        'Forskriveren har vurdert det konkrete forløpet: dagens risperidondose har gitt god og stabil effekt, uten bivirkninger som har begrenset dosen og uten planer om å endre den, og pasienten har tatt den regelmessig. Er effekten utilstrekkelig, eller har bivirkninger holdt dosen nede, planlegges vedlikeholdsdosen individuelt.',
      grunnlag: { type: 'kilde', henvisninger: [XEPLION.vedlikehold, XEPLION.justering, XEPLION.fraRisperidon, RUSSU.klinikk] },
    },
  ],
  unntak: [NYRE, XEPLION_ELDRE, XEPLION_OVERVEKT, XEPLION_INTERAKSJON],
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      utsagn('Xeplion er til vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på paliperidon eller risperidon.', SPC.xeplionIndikasjon),
      utsagn('Fra peroral risperidon startes Xeplion med 150 mg dag 1 og 100 mg dag 8 (±4 dager), begge i deltoideus; deretter månedlig (±7 dager), første gang én måned etter andre dose.', XEPLION.fraRisperidon, SPC.xeplionStart, SPC.xeplionVinduer),
      utsagn('Anbefalt vedlikeholdsdose er 75 mg månedlig, innenfor 25–150 mg etter toleranse og effekt, i deltoideus eller setemuskel.', XEPLION.vedlikehold, SPC.xeplionStart),
      utsagn('Peroral risperidon kan seponeres når Xeplion startes.', SPC.xeplionSeponering),
      utsagn('Preparatomtalen har ingen tabell fra peroral risperidondose til Xeplion-dose; tabellen gjelder paliperidon depottabletter.', SPC.xeplionOmregning),
      utsagn('Farmakokinetiske simuleringer fra produsenten gir omtrent samme eksponering ved 1, 2, 3, 4 og 6 mg risperidon daglig som ved 25, 50, 75, 100 og 150 mg Xeplion månedlig; de tar ikke hensyn til CYP2D6-hemmere eller CYP3A-induktorer.', RUSSU.tabell, RUSSU.interaksjoner),
      utsagn('Ved nedsatt nyrefunksjon er dosene andre, og effekt og sikkerhet er ikke fastslått over 65 år.', SPC.xeplionNyre, XEPLION.eldre),
    ],
    tilpasninger: [
      utsagn('OUSFAR seponerer peroral risperidon dagen før første injeksjon; gradvis seponering, som preparatomtalen nevner for noen, er ikke modellert.', SPC.xeplionSeponering),
      utsagn('Regelen gir bare en komplett plan med den anbefalte vedlikeholdsdosen 75 mg. Preparatomtalen har ingen omregning fra risperidondosen, og OUSFAR finner ikke på en, så regelen kan ikke stå for at en annen dose passer til pasientens risperidondose. En annen vedlikeholdsdose (25–150 mg etter toleranse og effekt, for eksempel høyere ved overvekt) stopper med beskjed om individuell planlegging, også med begrunnelse. Planen bruker bare styrker av Xeplion som finnes i FEST.', XEPLION.vedlikehold, XEPLION.overvekt),
      utsagn('Planen gjelder bare 3 mg risperidon daglig, der anbefalte 75 mg og simuleringene er enige (OUSFARs bevisste avgrensning, avklart av kontrolløren 04.11.2026 som en begrenset startstrategi, ikke en doseekvivalens). Ved 4–6 mg kan 75 mg gi for lav vedlikeholdseksponering, og de høyere dosene fra simuleringene (100 og 150 mg) tas ikke i bruk uten klinisk grunnlag; de stopper med beskjed om individuell planlegging. Lavere risperidondose, utilstrekkelig effekt, bivirkninger som har begrenset dosen, overvekt eller fedme og legemidler som endrer omsetningen av risperidon stopper også. Risperidondosen brukes ikke i beregningen.', RUSSU.tabell, RISPERDAL.dose, XEPLION.overvekt, RUSSU.interaksjoner, RUSSU.sponsor),
      utsagn('Før injeksjonen dag 8 og før hver vedlikeholdsinjeksjon står et vurderingspunkt for symptomer, bivirkninger og reaksjoner etter injeksjonen.', RUSSU.oppfolging, KEKS.spesialist, XEPLION.justering),
      utsagn('Positivt tilfelle, alle vilkår samtidig (avklart av kontrolløren 04.11.2026): voksen med schizofreni, stabil på 3 mg peroral risperidon daglig, tatt regelmessig, med god effekt og uten dosebegrensende bivirkninger, dokumentert tidligere toleranse, kreatininclearance minst 80 ml/min, ikke over 65 år, uten overvekt eller fedme og uten legemidler som endrer omsetningen av risperidon. Samme eksponering i gjennomsnitt er ikke en klinisk validering for den enkelte; derfor er vurderingen før hver injeksjon en del av planen.', RUSSU.tabell, RUSSU.klinikk, XEPLION.vedlikehold),
      utsagn(`Når en individuell vurdering overstyrer planen: ${XEPLION_OVERSTYRING}`, XEPLION.vedlikehold, XEPLION.justering, XEPLION.overvekt, SPC.xeplionNyre, RUSSU.klinikk),
    ],
    forutsetninger: forutsetninger(
      'Pasienten bruker peroral risperidon (tabletter eller mikstur) daglig.',
      'Forskriveren har vurdert nyrefunksjonen, alderen, vekten og de andre legemidlene og svart at kreatininclearance ikke er under 80 ml/min, at pasienten ikke er over 65 år, ikke har overvekt eller fedme og ikke bruker legemidler som endrer omsetningen av risperidon; ubesvart stopper beregningen.',
    ),
    usikkerhet: [
      'Hvilken vedlikeholdsdose som gir samme effekt som pasientens risperidondose, sier preparatomtalen ikke. Russu 2018 sammenligner bare eksponering i simuleringer, er sponset av produsenten og er ikke prøvd ut på pasienter. At 75 mg passer ved 3 mg risperidon med god effekt og toleranse, er en avgrensning der kildene er enige, ikke en validert omregning; full effekt av en dose kan først sees etter flere måneder. Avgrensningen er en klinisk beslutning om et snevert bruksområde, og simuleringen er ingen garanti for den enkelte pasienten.',
      'Generiske paliperidonpalmitat (Niapelf, Palmeux, Paliperidon Zentiva) og tremånedersdepotene er ikke kontrollert mot regelen og er ikke omfattet.',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:Rd>Dp')],
  eksempler: [
    {
      id: 'fra-3-mg-75',
      beskrivelse: 'Risperidon 3 mg, vedlikehold 75 mg, startdato 1. desember 2026.',
      inndata: { startdose_mg: 3, maldose_mg: 75, startdato: '2026-12-01', bekreftet: XEPLION_BEKREFTET, pasientforhold: XEPLION_AVKREFTET },
      forventet: {
        fra: ['fra dag 1 (01.12.2026): seponert'],
        til: [
          'dag 1 (01.12.2026): 150 mg injeksjon, deltoideus',
          'dag 8 (08.12.2026, ±4 dager): 100 mg injeksjon, deltoideus',
          'hver måned fra 1 måned etter dag 8 (08.01.2027, ±7 dager): 75 mg injeksjon, deltoideus eller setemuskel',
        ],
      },
    },
    {
      id: 'fra-4-mg-for-lav-eksponering',
      beskrivelse: 'Risperidon 4 mg og vedlikehold 75 mg: etter simuleringene gir 75 mg lavere eksponering enn dagens dose (4 mg ≈ 100 mg), så ingen komplett plan.',
      inndata: { startdose_mg: 4, maldose_mg: 75, bekreftet: XEPLION_BEKREFTET, pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 4 mg er utenfor det regelen gjelder for \(3 mg\)/,
    },
    {
      id: 'fra-6-mg-for-lav-eksponering',
      beskrivelse: 'Risperidon 6 mg og vedlikehold 75 mg: etter simuleringene tilsvarer 6 mg omtrent 150 mg, så 75 mg kan gi for lav eksponering og ingen komplett plan.',
      inndata: { startdose_mg: 6, maldose_mg: 75, bekreftet: XEPLION_BEKREFTET, pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 6 mg er utenfor det regelen gjelder for \(3 mg\)/,
    },
    {
      id: 'fra-6-mg-150',
      beskrivelse: 'Risperidon 6 mg og vedlikehold 150 mg med begrunnelse: simuleringens dose tas ikke i bruk, så ingen komplett plan.',
      inndata: { startdose_mg: 6, maldose_mg: 150, begrunnelse: 'Syntetisk eksempel.', bekreftet: XEPLION_BEKREFTET, pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 150 mg er utenfor det regelen gjelder for \(75 mg\)/,
    },
    {
      id: 'annen-dose-50',
      beskrivelse: 'Risperidon 3 mg og vedlikehold 50 mg med begrunnelse: en annen dose enn 75 mg planlegges individuelt.',
      inndata: { startdose_mg: 3, maldose_mg: 50, begrunnelse: 'Syntetisk eksempel.', bekreftet: XEPLION_BEKREFTET, pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 50 mg er utenfor det regelen gjelder for \(75 mg\)/,
    },
    {
      id: 'lav-risperidondose',
      beskrivelse: 'Risperidon 0,5 mg: 75 mg kan ikke antas å passe ved en så lav dose, så ingen komplett plan.',
      inndata: { startdose_mg: 0.5, maldose_mg: 75, bekreftet: XEPLION_BEKREFTET, pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 0,5 mg er utenfor det regelen gjelder for \(3 mg\)/,
    },
    {
      id: 'under-3-mg',
      beskrivelse: 'Risperidon 2,5 mg, rett under avgrensningen: 75 mg kan gi høyere eksponering enn dagens dose, så ingen komplett plan.',
      inndata: { startdose_mg: 2.5, maldose_mg: 75, bekreftet: XEPLION_BEKREFTET, pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 2,5 mg er utenfor det regelen gjelder for \(3 mg\)/,
    },
    {
      id: 'over-3-mg',
      beskrivelse: 'Risperidon 3,5 mg, rett over avgrensningen: ingen komplett plan.',
      inndata: { startdose_mg: 3.5, maldose_mg: 75, bekreftet: XEPLION_BEKREFTET, pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 3,5 mg er utenfor det regelen gjelder for \(3 mg\)/,
    },
    {
      id: 'hoy-risperidondose',
      beskrivelse: 'Risperidon 16 mg (høyeste dose preparatomtalen vurderer): 75 mg kan ikke antas å passe, så ingen komplett plan.',
      inndata: { startdose_mg: 16, maldose_mg: 75, bekreftet: XEPLION_BEKREFTET, pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 16 mg er utenfor det regelen gjelder for \(3 mg\)/,
    },
    {
      id: 'uten-effekt-toleranse',
      beskrivelse: 'Uten bekreftet god effekt og toleranse av dagens dose stopper beregningen.',
      inndata: { startdose_mg: 3, maldose_mg: 75, bekreftet: ['indikasjon', 'tidligere_toleranse'], pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Forskriveren har vurdert det konkrete forløpet/,
    },
    {
      id: 'overvekt',
      beskrivelse: 'Overvekt eller fedme: høyere dose kan trengs, så regelen gjelder ikke.',
      inndata: { startdose_mg: 3, maldose_mg: 75, bekreftet: XEPLION_BEKREFTET, pasientforhold: { ...XEPLION_AVKREFTET, overvekt: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten har overvekt eller fedme/,
    },
    {
      id: 'interaksjon',
      beskrivelse: 'CYP2D6-hemmer eller CYP3A4-induktor: risperidondosen sier ikke hvilken eksponering Xeplion må gi, så regelen gjelder ikke.',
      inndata: { startdose_mg: 3, maldose_mg: 75, bekreftet: XEPLION_BEKREFTET, pasientforhold: { ...XEPLION_AVKREFTET, risperidon_interaksjon: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten bruker en CYP2D6-hemmer/,
    },
    {
      id: 'uten-toleranse',
      beskrivelse: 'Uten dokumentert tidligere toleranse stopper beregningen.',
      inndata: { startdose_mg: 3, maldose_mg: 75, bekreftet: ['indikasjon', 'effekt_toleranse'], pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Det er dokumentert i journalen at pasienten har tålt peroral risperidon/,
    },
    {
      id: 'uten-maldose',
      beskrivelse: 'Uten valgt vedlikeholdsdose: beregningen velger ikke selv.',
      inndata: { startdose_mg: 3, bekreftet: XEPLION_BEKREFTET, pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Måldosen må oppgis/,
    },
    {
      id: 'maldose-over-150',
      beskrivelse: 'Vedlikehold 175 mg er over området i preparatomtalen.',
      inndata: { startdose_mg: 3, maldose_mg: 175, bekreftet: XEPLION_BEKREFTET, pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 175 mg er utenfor/,
    },
    {
      id: 'risperidon-over-16',
      beskrivelse: 'Risperidon 20 mg er over det preparatomtalen anbefaler.',
      inndata: { startdose_mg: 20, maldose_mg: 150, bekreftet: XEPLION_BEKREFTET, pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 20 mg er utenfor/,
    },
    {
      id: 'nedsatt-nyrefunksjon',
      beskrivelse: 'Kreatininclearance under 80 ml/min: regelen gjelder ikke.',
      inndata: { startdose_mg: 3, maldose_mg: 75, bekreftet: XEPLION_BEKREFTET, pasientforhold: { ...XEPLION_AVKREFTET, nedsatt_nyrefunksjon: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten har kreatininclearance under 80 ml\/min/,
    },
    {
      id: 'alder-ukjent',
      beskrivelse: 'Alderen er ikke vurdert: ukjent stopper like mye som over 65 år.',
      inndata: { startdose_mg: 3, maldose_mg: 75, bekreftet: XEPLION_BEKREFTET, pasientforhold: { nedsatt_nyrefunksjon: false, overvekt: false, risperidon_interaksjon: false } },
      forventet: {},
      stopp: /Må avklares før beregning \(ukjent\): Pasienten er over 65 år/,
    },
    {
      id: 'uten-indikasjon',
      beskrivelse: 'Uten bekreftet stabilisering og toleranse stopper beregningen.',
      inndata: { startdose_mg: 3, maldose_mg: 75, bekreftet: ['tidligere_toleranse', 'effekt_toleranse'], pasientforhold: XEPLION_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Pasienten er voksen, har schizofreni og er stabilisert på/,
    },
  ],
  godkjenning: tilKontroll(
    'Ny regel (K3, VDK-2 forslag 3): samme oppstart som den godkjente regelen fra paliperidon depottablett, med vedlikeholdsdosen valgt av forskriveren innenfor preparatomtalens område.',
    `${GJENNOMGANG} dokumentert tidligere toleranse er en egen bekreftelse, og en annen vedlikeholdsdose enn anbefalte 75 mg krever en skriftlig begrunnelse.`,
    `${GJENNOMGANG_2} en annen vedlikeholdsdose enn 75 mg er et ja i én retning (høyere: 100 eller 150 mg; lavere: 50 mg) med en bekreftet, dokumentert vurdering av behandling og eksponering for den retningen og en skriftlig begrunnelse; fritekst alene stopper.`,
    `${GJENNOMGANG_3} regelen gir bare en komplett plan med anbefalt vedlikehold 75 mg; en annen dose stopper med beskjed om individuell planlegging, fordi regelen ikke kan stå for at den passer til risperidondosen.`,
    `${GJENNOMGANG_4} planen gjelder bare 4–6 mg risperidon daglig (åpent OUSFAR-valg til kontrolløren), med en bekreftet vurdering av effekt og toleranse av dagens dose og overvekt eller fedme som unntak; 0,5 og 16 mg og andre doser utenfor området stopper.`,
    `${GJENNOMGANG_6} etter Russu 2018 kan 75 mg gi for lav vedlikeholdseksponering ved 4–6 mg risperidon, så planen gjelder bare 3 mg risperidon daglig, der preparatomtalens anbefalte 75 mg og simuleringene er enige (åpent OUSFAR-valg til kontrolløren). Legemidler som endrer omsetningen av risperidon er et nytt unntak, og planen har et vurderingspunkt før hver injeksjon.`,
    `${GJENNOMGANG_7} det positive tilfellet er skrevet ut som samlede vilkår, og planen sier konkret når en individuell vurdering overstyrer vedlikeholdsdosen (forverring eller tilbakefall, dosebegrensende eller ekstrapyramidale bivirkninger, overfølsomhet, nedsatt nyrefunksjon, utviklet overvekt). Avgrensningen er fortsatt et åpent valg, fordi simuleringene ikke er en klinisk validering.`,
    `${GJENNOMGANG_8} kontrolløren har vurdert avgrensningen til 3 mg risperidon som en faglig plausibel, begrenset startstrategi, ikke individuell doseekvivalens, og valget er registrert som avklart. Teksten sier nå at avgrensningen er OUSFARs kliniske beslutning om et snevert bruksområde, og at simuleringen ikke er en garanti. Regelen er ikke godkjent.`,
  ),
}

/* --- Depot: Risperdal Consta → Xeplion ----------------------------------------------- */

const CONSTA_TABELL = {
  type: 'tabell' as const,
  rader: [
    { fra_mg: 25, til_mg: 50 },
    { fra_mg: 37.5, til_mg: 75 },
    { fra_mg: 50, til_mg: 100 },
  ],
  grunnlag: { type: 'kilde' as const, henvisninger: [XEPLION.constaTabell] },
}

/** Når planens Xeplion-dose etter Consta ikke lenger gjelder (kontrollørens ellevte gjennomgang). */
const CONSTA_OVERSTYRING =
  'Planens dose gjelder ikke lenger, og vedlikeholdsdosen vurderes individuelt, ved utilstrekkelig effekt, forverring eller tilbakefall av psykotiske symptomer, dosebegrensende eller ekstrapyramidale bivirkninger, overfølsomhet eller nedsatt nyrefunksjon. Dosen kan justeres månedlig, men full effekt av en endret dose kan først sees etter flere måneder.'

const CONSTA_BEKREFTET = ['indikasjon', 'preparat_consta', 'neste_injeksjon', 'effekt_toleranse']

const constaXeplion: Regel = {
  id: 'depot-consta-xeplion',
  versjon: 3,
  tittel: 'Fra Risperdal Consta til Xeplion',
  fra: { type: 'virkestoff', nokkel: 'risperidon' },
  til: { type: 'virkestoff', nokkel: 'paliperidon' },
  plan: {
    form: 'direkte',
    forlop: [
      seponeres('risperidon', 'depotinjeksjon', { formulering: 'Risperdal Consta (hver 2. uke)', preparater: ['Risperdal Consta'] }),
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'paliperidon' },
        administrasjon: 'depotinjeksjon',
        formulering: 'Xeplion (paliperidonpalmitat, månedlig)',
        preparater: ['Xeplion'],
        utgangsdose: null,
        start: { type: 'dag', dag: 1 },
        faser: [
          {
            type: 'injeksjoner',
            start: [{ dag: kilde(1, 'dag', 'bindende_krav', XEPLION.fraConsta), dose: CONSTA_TABELL, sted: XEPLION_STED }],
            vedlikehold: {
              dose: CONSTA_TABELL,
              maaneder: kilde(1, 'maaneder', 'bindende_krav', XEPLION.fraConsta),
              vindu_dager: kilde(7, 'dager', 'bindende_krav', SPC.xeplionVinduer),
              sted: XEPLION_STED,
            },
          },
        ],
        // Kontrollørens ellevte gjennomgang: oppfølgingen rundt oppstarten og før de månedlige injeksjonene står i planen.
        vurderinger: [
          {
            id: 'for_injeksjon',
            // Dag 1 er dagen for første Xeplion-injeksjon; vurderingen før de månedlige injeksjonene står i teksten, fordi dosen ikke endres.
            nar: { type: 'dag', dag: kilde(1, 'dag', 'bindende_krav', XEPLION.fraConsta) },
            tekst: 'Ved byttet (dag 1) og før hver månedlige injeksjon: effekt og psykotiske symptomer, ekstrapyramidale og andre bivirkninger, toleranse og reaksjoner etter forrige injeksjon vurderes, og pasienten følges tett gjennom byttet.',
            ved_funn: CONSTA_OVERSTYRING,
            grunnlag: { type: 'kilde', henvisninger: [KEKS.spesialist, KEKS.depotTilDepot, XEPLION.justering, XEPLION.vedlikehold, XEPLION.overfolsomhet, SPC.xeplionNyre] },
          },
        ],
      },
    ],
  },
  inndata: [{ navn: 'startdose', verdier: [25, 37.5, 50], enhet: 'mg per injeksjon hver 2. uke', art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [XEPLION.constaTabell, CONSTA.dose] } }],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen, har schizofreni og er stabilisert på Risperdal Consta i den oppgitte dosen hver 2. uke.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionIndikasjon, XEPLION.constaTabell] },
    },
    {
      id: 'preparat_consta',
      tekst: 'Depotet er Risperdal Consta hver 2. uke, ikke Okedi eller et annet risperidondepot, som har andre intervaller og ikke er omfattet.',
      grunnlag: { type: 'kilde', henvisninger: [XEPLION.constaTabell, CONSTA.dose] },
    },
    {
      id: 'neste_injeksjon',
      tekst: 'Startdatoen (dag 1) er dagen neste Consta-injeksjon skulle vært gitt; Consta gis ikke mer.',
      grunnlag: { type: 'kilde', henvisninger: [XEPLION.fraConsta] },
    },
    {
      id: 'effekt_toleranse',
      tekst: 'Forskriveren har vurdert det konkrete forløpet: dagens Consta-dose har gitt god og stabil effekt, uten bivirkninger som har begrenset dosen og uten planer om å endre den. Er effekten utilstrekkelig, eller har bivirkninger holdt dosen nede, planlegges Xeplion-dosen individuelt.',
      grunnlag: { type: 'kilde', henvisninger: [XEPLION.constaTabell, XEPLION.vedlikehold, XEPLION.justering] },
    },
  ],
  unntak: [NYRE, XEPLION_ELDRE],
  beregnbarhet: 'entydig_beregnbar',
  fortolkning: {
    kildetro: [
      utsagn('Fra risperidon depotinjeksjon gis Xeplion i stedet for neste planlagte injeksjon og deretter månedlig, uten oppstartsdosene dag 1 og dag 8.', XEPLION.fraConsta),
      utsagn('Consta 25, 37,5 og 50 mg hver 2. uke tilsvarer Xeplion 50, 75 og 100 mg månedlig.', XEPLION.constaTabell),
      utsagn('Månedlige injeksjoner kan gis inntil 7 dager før eller etter månedsdatoen, i deltoideus eller setemuskel.', SPC.xeplionVinduer, SPC.xeplionStart),
      utsagn('Ved bytte fra et depot til et annet følges instruksjonen for det nye depotet; byttet blir i praksis en kryss-titrering.', KEKS.depotTilDepot),
      utsagn('Ved nedsatt nyrefunksjon er dosene andre, og effekt og sikkerhet er ikke fastslått over 65 år.', SPC.xeplionNyre, XEPLION.eldre),
    ],
    tilpasninger: [
      utsagn('Første Xeplion-dose regnes som injeksjonen dag 1, med samme dose som vedlikeholdet etter tabellen; den neste kommer én måned senere.', XEPLION.fraConsta, XEPLION.constaTabell),
      utsagn('I verktøyet er Consta og Okedi samme valg («risperidon, depotinjeksjon»); forskriveren må derfor bekrefte at depotet er Consta hver 2. uke.', CONSTA.dose),
      utsagn('Tabellen gjelder bare når dagens Consta-dose gir god og stabil effekt uten dosebegrensende bivirkninger; forskriveren bekrefter det, og effekt, bivirkninger og toleranse vurderes ved byttet og før hver månedlige injeksjon.', XEPLION.constaTabell, XEPLION.justering, KEKS.spesialist),
      utsagn(`Når en individuell vurdering overstyrer planen: ${CONSTA_OVERSTYRING}`, XEPLION.vedlikehold, XEPLION.justering, XEPLION.overfolsomhet, SPC.xeplionNyre),
    ],
    forutsetninger: forutsetninger(
      'Pasienten har fått Risperdal Consta hver 2. uke i den oppgitte dosen lenge nok til at dosen er stabil.',
      'Forskriveren har vurdert nyrefunksjonen og alderen og svart at kreatininclearance ikke er under 80 ml/min og at pasienten ikke er over 65 år; ubesvart stopper beregningen.',
    ),
    usikkerhet: [
      'Preparatomtalen oppgir intet vindu for første Xeplion-injeksjon; den gis på dagen neste Consta-injeksjon skulle vært gitt.',
      'Consta-doser som ikke står i tabellen (for eksempel høyere doser), og andre risperidondepoter, er ikke omfattet.',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:Dr>Dp')],
  eksempler: [
    {
      id: 'consta-37-5',
      beskrivelse: 'Consta 37,5 mg; neste injeksjon skulle vært gitt 15. desember 2026.',
      inndata: { startdose_mg: 37.5, startdato: '2026-12-15', bekreftet: CONSTA_BEKREFTET, pasientforhold: NYRE_AVKREFTET },
      forventet: {
        fra: ['fra dag 1 (15.12.2026): seponert'],
        til: ['dag 1 (15.12.2026): 75 mg injeksjon, deltoideus eller setemuskel', 'hver måned fra 1 måned etter dag 1 (15.01.2027, ±7 dager): 75 mg injeksjon, deltoideus eller setemuskel'],
      },
    },
    {
      id: 'consta-25',
      beskrivelse: 'Consta 25 mg gir Xeplion 50 mg.',
      inndata: { startdose_mg: 25, bekreftet: CONSTA_BEKREFTET, pasientforhold: NYRE_AVKREFTET },
      forventet: {
        fra: ['fra dag 1: seponert'],
        til: ['dag 1: 50 mg injeksjon, deltoideus eller setemuskel', 'hver måned fra 1 måned etter dag 1 (±7 dager): 50 mg injeksjon, deltoideus eller setemuskel'],
      },
    },
    {
      id: 'consta-50',
      beskrivelse: 'Consta 50 mg gir Xeplion 100 mg.',
      inndata: { startdose_mg: 50, bekreftet: CONSTA_BEKREFTET, pasientforhold: NYRE_AVKREFTET },
      forventet: {
        fra: ['fra dag 1: seponert'],
        til: ['dag 1: 100 mg injeksjon, deltoideus eller setemuskel', 'hver måned fra 1 måned etter dag 1 (±7 dager): 100 mg injeksjon, deltoideus eller setemuskel'],
      },
    },
    {
      id: 'consta-uten-tabellverdi',
      beskrivelse: 'Consta 62,5 mg står ikke i tabellen.',
      inndata: { startdose_mg: 62.5, bekreftet: CONSTA_BEKREFTET, pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 62,5 mg er utenfor/,
    },
    {
      id: 'annet-depot',
      beskrivelse: 'Uten bekreftelse av at depotet er Consta (for eksempel Okedi) stopper beregningen.',
      inndata: { startdose_mg: 50, bekreftet: ['indikasjon', 'neste_injeksjon', 'effekt_toleranse'], pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Depotet er Risperdal Consta/,
    },
    {
      id: 'nedsatt-nyrefunksjon',
      beskrivelse: 'Kreatininclearance under 80 ml/min: regelen gjelder ikke.',
      inndata: { startdose_mg: 37.5, bekreftet: CONSTA_BEKREFTET, pasientforhold: { ...NYRE_AVKREFTET, nedsatt_nyrefunksjon: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten har kreatininclearance under 80 ml\/min/,
    },
    {
      id: 'over-65',
      beskrivelse: 'Over 65 år: regelen gjelder ikke.',
      inndata: { startdose_mg: 37.5, bekreftet: CONSTA_BEKREFTET, pasientforhold: { ...NYRE_AVKREFTET, over_65: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten er over 65 år/,
    },
    {
      id: 'utilstrekkelig-effekt',
      beskrivelse: 'Uten bekreftet god og stabil effekt av dagens Consta-dose (for eksempel utilstrekkelig effekt) stopper beregningen.',
      inndata: { startdose_mg: 37.5, bekreftet: ['indikasjon', 'preparat_consta', 'neste_injeksjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Forskriveren har vurdert det konkrete forløpet: dagens Consta-dose/,
    },
  ],
  godkjenning: tilKontroll(
    'Ny regel (K3, VDK-2 forslag 6): Xeplion i stedet for neste Consta-injeksjon, med dosen fra tabellen i preparatomtalen og uten oppstartsdoser.',
    `${GJENNOMGANG} Consta-dosen oppgis uttrykkelig som mg per injeksjon hver 2. uke, ikke som døgndose.`,
    `${GJENNOMGANG_11} planen har vurderingen ved byttet og før hver månedlige injeksjon (effekt, psykotiske symptomer, ekstrapyramidale og andre bivirkninger, toleranse), sier når dosen må vurderes individuelt (også at en endret dose virker langsomt), og krever bekreftet god og stabil effekt av dagens Consta-dose. Utilstrekkelig effekt, nedsatt nyrefunksjon og et annet depot stopper.`,
  ),
}

/* --- Peroralt: aripiprazol → olanzapin og risperidon, kariprazin → kvetiapin ---------------- */

const ARIPIPRAZOL_INNDATA = { navn: 'startdose' as const, omrade: [10, 30] as [number, number], art: 'bindende_krav' as const, grunnlag: { type: 'kilde' as const, henvisninger: [SPC.abilifyDose] } }

const FRA_ARIPIPRAZOL_KILDETRO = [
  utsagn('Når det første antipsykotikumet er aripiprazol, kan byttet gjøres direkte: aripiprazol stoppes, og det nye startes dagen etter. Aripiprazol har svært lang halveringstid og ingen antikolinerg effekt.', KEKS.direkte, KEKS.fraAripiprazol, KEKS.aripiprazolHalveringstid),
  utsagn('Et opphold uten antipsykotikum anbefales ikke.', KEKS.ingenOpphold),
  utsagn('Et direkte bytte krever erfaring, gjøres helst der pasienten kan følges tett, og bør vurderes av psykiater.', KEKS.direkte, KEKS.spesialist),
]
const FRA_ARIPIPRAZOL_USIKKERHET = [
  'Kilden beskriver direkte bytte fra aripiprazol som mulig, ikke som den eneste eller beste strategien; kryss-titrering er like akseptabelt og planlegges da individuelt.',
  'Effekten av aripiprazol avtar over flere dager etter siste dose; forverring kan komme sent i den første uken og må følges.',
]
const ARIPIPRAZOL_BEKREFTET = ['indikasjon', 'peroral_formulering', 'spesialist_risiko']

const ALDER_65 = (tekst: string, ...henvisninger: Kildehenvisning[]): Unntak => ({ id: 'alder_65', tekst, grunnlag: { type: 'kilde', henvisninger } })

/**
 * Dagene på startregimet før forskriverens valgte måldose: et åpent
 * OUSFAR-valg. Preparatomtalen sier bare at dosen tilpasses etter en ny
 * klinisk vurdering (for olanzapin minst 24 timer mellom økningene).
 */
const dagerForMaldose = (stoff: string, ...henvisninger: Kildehenvisning[]) =>
  forslag(
    7,
    'dager',
    `OUSFARs valg: én uke på startregimet før ${stoff} endres til den valgte måldosen, slik at effekt og bivirkninger kan vurderes etter at aripiprazol er stoppet (aripiprazol virker i flere dager etter siste dose). Preparatomtalen gir ingen fast tid, bare en ny klinisk vurdering.`,
    { omrade: [1, TEKNISK_MAKS_DAGER], justerbar: 'Dager på startregimet før måldosen', teknisk_maks: true, henvisninger: [...henvisninger, KEKS.aripiprazolHalveringstid] },
  )

/** Vurderingen før hver doseendring på vei til den valgte måldosen. */
const forMaldose = (...henvisninger: Kildehenvisning[]) => ({
  id: 'for_maldose',
  nar: { type: 'for_hvert_trinn' as const },
  tekst: 'Ny klinisk vurdering av effekt og bivirkninger, og av at aripiprazol er stoppet, før dosen endres.',
  ved_funn: 'Ved bivirkninger holdes dosen; en annen dose enn den valgte måldosen er et nytt valg.',
  grunnlag: { type: 'kilde' as const, henvisninger },
})

const aripiprazolOlanzapin: Regel = {
  id: 'antipsykotikabytte-aripiprazol-olanzapin',
  versjon: 2,
  tittel: 'Fra aripiprazol til olanzapin, direkte bytte',
  fra: { type: 'virkestoff', nokkel: 'aripiprazol' },
  til: { type: 'virkestoff', nokkel: 'olanzapin' },
  plan: {
    form: 'direkte',
    forlop: [
      seponeres('aripiprazol', 'peroral'),
      startes(
        'olanzapin',
        [
          { type: 'opptrapping', trinn: [{ mg: kilde(10, 'mg', 'bindende_krav', ZYPREXA.start), dager: dagerForMaldose('olanzapin', ZYPREXA.start) }] },
          { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
        ],
        { vurderinger: [forMaldose(ZYPREXA.start)] },
      ),
    ],
  },
  inndata: [ARIPIPRAZOL_INNDATA, { navn: 'maldose', omrade: [5, 20], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [ZYPREXA.start] } }],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.abilifyDose, ZYPREXA.start] },
    },
    peroral('aripiprazol'),
    spesialist(),
  ],
  unntak: [
    ALDER_65('Pasienten er 65 år eller eldre; preparatomtalen sier at lavere startdose bør vurderes da.', ZYPREXA.lavereStart),
    { id: 'nedsatt_nyre_lever', tekst: 'Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen sier at lavere startdose bør vurderes da.', grunnlag: { type: 'kilde', henvisninger: [ZYPREXA.lavereStart] } },
    {
      id: 'langsom_omsetning',
      tekst: 'Pasienten har flere faktorer for langsommere omsetning av olanzapin (kvinne, høy alder, ikke-røyker); preparatomtalen sier at lavere startdose bør vurderes da.',
      grunnlag: { type: 'kilde', henvisninger: [ZYPREXA.lavereStart] },
    },
    { id: 'cyp1a2_hemmer', tekst: 'Pasienten bruker fluvoksamin eller en annen CYP1A2-hemmer, som ciprofloksacin; lavere startdose av olanzapin bør vurderes da.', grunnlag: { type: 'kilde', henvisninger: [ZYPREXA.cyp1a2] } },
  ],
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      ...FRA_ARIPIPRAZOL_KILDETRO,
      utsagn('Ved schizofreni er anbefalt startdose av olanzapin 10 mg daglig; dosen kan senere justeres innenfor 5–20 mg etter ny klinisk vurdering, med minst 24 timer mellom økningene.', ZYPREXA.start),
      utsagn('Lavere startdose bør vurderes fra 65 år, ved nedsatt nyre- eller leverfunksjon, ved flere faktorer for langsom omsetning og sammen med CYP1A2-hemmere.', ZYPREXA.lavereStart, ZYPREXA.cyp1a2),
    ],
    tilpasninger: [
      utsagn('Aripiprazol seponeres uten nedtrapping dagen før olanzapin startes (siste dose dagen før dag 1).', KEKS.direkte, KEKS.fraAripiprazol),
      utsagn('Startdosen (10 mg fra dag 1) og den terapeutiske måldosen er atskilt. Forskriveren velger måldosen innenfor 5–20 mg ut fra klinisk vurdering; planen holder 10 mg til en ny vurdering og slutter på måldosen. Hvor lenge startdosen holdes, er et åpent OUSFAR-valg (forslag: én uke).', ZYPREXA.start),
    ],
    forutsetninger: forutsetninger(
      'Pasienten bruker peroral aripiprazol 10–30 mg daglig (tabletter, smeltetabletter eller mikstur), det doseområdet preparatomtalen oppgir ved schizofreni. Aripiprazol bare stoppes, så dosen tolkes ikke som et antall tabletter.',
      'Indikasjonen er schizofreni; ved andre indikasjoner (for eksempel mani) gjelder andre startdoser, og regelen passer ikke.',
      'Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.',
    ),
    usikkerhet: [...FRA_ARIPIPRAZOL_USIKKERHET, 'Sedasjon, vektøkning og metabolske bivirkninger av olanzapin må følges; de er ikke en del av beregningen.'],
  },
  referanser: [pn('SwitchAntipsychotics:Pa>Ol')],
  eksempler: [
    {
      id: 'fra-15-mg',
      beskrivelse: 'Aripiprazol 15 mg til olanzapin, startdato 7. desember 2026.',
      inndata: { startdose_mg: 15, maldose_mg: 15, startdato: '2026-12-07', bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: { fra: ['fra dag 1 (07.12.2026): seponert'], til: ['dag 1–7 (07.12.2026–13.12.2026): 10 mg', 'fra dag 8 (14.12.2026): 15 mg'] },
    },
    {
      id: 'fra-30-mg',
      beskrivelse: 'Aripiprazol 30 mg (høyeste dose) til olanzapin, måldose 20 mg.',
      inndata: { startdose_mg: 30, maldose_mg: 20, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: { fra: ['fra dag 1: seponert'], til: ['dag 1–7: 10 mg', 'fra dag 8: 20 mg'] },
    },
    {
      id: 'maldose-10',
      beskrivelse: 'Måldosen er startdosen, 10 mg.',
      inndata: { startdose_mg: 10, maldose_mg: 10, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: { fra: ['fra dag 1: seponert'], til: ['fra dag 1: 10 mg'] },
    },
    {
      id: 'uten-maldose',
      beskrivelse: 'Uten valgt måldose: beregningen velger ikke selv.',
      inndata: { startdose_mg: 15, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Måldosen må oppgis/,
    },
    {
      id: 'maldose-over-20',
      beskrivelse: 'Måldose 25 mg er over preparatomtalens område.',
      inndata: { startdose_mg: 15, maldose_mg: 25, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Måldosen 25 mg er utenfor/,
    },
    {
      id: 'aripiprazol-5-mg',
      beskrivelse: 'Aripiprazol 5 mg er under doseområdet ved schizofreni; regelen gjelder ikke.',
      inndata: { startdose_mg: 5, maldose_mg: 10, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Startdosen 5 mg er utenfor/,
    },
    {
      id: 'fluvoksamin',
      beskrivelse: 'Fluvoksamin samtidig: regelen gjelder ikke.',
      inndata: { startdose_mg: 15, maldose_mg: 10, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten bruker fluvoksamin/,
    },
    {
      id: 'uten-spesialist',
      beskrivelse: 'Uten bekreftet spesialistvurdering og tett oppfølging stopper beregningen.',
      inndata: { startdose_mg: 15, maldose_mg: 10, bekreftet: ['indikasjon', 'peroral_formulering'], pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Må bekreftes før beregning: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten/,
    },
    {
      id: 'omsetning-ukjent',
      beskrivelse: 'Faktorene for langsom omsetning er ikke vurdert: ukjent stopper.',
      inndata: { startdose_mg: 15, maldose_mg: 10, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Må avklares før beregning \(ukjent\): Pasienten har flere faktorer for langsommere omsetning/,
    },
  ],
  godkjenning: tilKontroll(
    'Ny regel (K3): direkte bytte fra aripiprazol (Keks 2019) til olanzapin i anbefalt startdose ved schizofreni (Zyprexa pkt. 4.2).',
    `${GJENNOMGANG} startdosen 10 mg og forskriverens valgte måldose 5–20 mg er atskilt, med en ny klinisk vurdering før endringen; tiden på startdosen er et åpent OUSFAR-valg.`,
  ),
}

/**
 * Dagene på 4 mg før måldosen 5 eller 6 mg: et åpent OUSFAR-valg. Ved
 * måldose 4 mg er 4 mg selve måldosen, og tiden har ingen betydning.
 */
const dagerPaa4mg = forslag(
  7,
  'dager',
  'OUSFARs selvstendige kliniske vurdering, ikke fra kildene: én uke på 4 mg før risperidon økes til måldosen 5 eller 6 mg, så toleransen kan vurderes. Verken preparatomtalen eller byteverktøyet gir noen fast tid for økningen over 4 mg, bare en ny klinisk vurdering.',
  {
    omrade: [1, TEKNISK_MAKS_DAGER],
    justerbar: 'Dager på 4 mg før måldosen',
    teknisk_maks: true,
    henvisninger: [RISPERDAL.dose, BYTEVERKTOY.tilRisperidon, KEKS.aripiprazolHalveringstid],
    // Kontrollørens ellevte gjennomgang: én uke er en akseptabel, forsiktig og symptomstyrt tilpasning i det snevre omfanget.
    avklaring: avklartAvKontrollor(
      AVKLARING_11,
      4,
      'Én uke på 4 mg før en eventuell økning til 5–6 mg er faglig akseptabelt som en forsiktig, symptomstyrt tilpasning i det beskrevne snevre omfanget; verken Keks-verktøyet eller preparatomtalen foreskriver nøyaktig sju dager, så det er OUSFARs selvstendige kliniske vurdering.',
    ),
  },
)

const RISPERIDON_AVKREFTET = { alder_65: false, nedsatt_nyre_lever: false, risperidon_interaksjon: false }

const aripiprazolRisperidon: Regel = {
  id: 'antipsykotikabytte-aripiprazol-risperidon',
  versjon: 5,
  tittel: 'Fra aripiprazol til risperidon, direkte bytte',
  fra: { type: 'virkestoff', nokkel: 'aripiprazol' },
  til: { type: 'virkestoff', nokkel: 'risperidon' },
  plan: {
    form: 'direkte',
    forlop: [
      seponeres('aripiprazol', 'peroral'),
      startes(
        'risperidon',
        [
          {
            type: 'opptrapping',
            trinn: [
              // Kontrollørens tiende gjennomgang: byteverktøyets forsiktigere opptrapping ved bytte fra aripiprazol (høyst 50 % av måldosen, første økning dag 5) i stedet for preparatomtalens 4 mg dag 2.
              { mg: kilde(2, 'mg', 'bindende_krav', RISPERDAL.dose, BYTEVERKTOY.tilRisperidon), dager: kilde(4, 'dager', 'veiledende_preferanse', BYTEVERKTOY.tilRisperidon) },
              { mg: kilde(4, 'mg', 'veiledende_preferanse', RISPERDAL.dose, BYTEVERKTOY.tilRisperidon), dager: dagerPaa4mg },
            ],
          },
          { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
        ],
        // Tabletter og smeltetabletter; miksturen har ingen dokumentert oppmåling i verktøyet.
        {
          formulering: 'tabletter eller smeltetabletter',
          legemiddelformer: ['53', '48'],
          vurderinger: [
            {
              ...forMaldose(RISPERDAL.dose, RISPERDAL.maks, BYTEVERKTOY.tilRisperidon, BYTEVERKTOY.tilRisperidonRisiko),
              tekst: 'Før hver økning av risperidon: ny klinisk vurdering av effekt, blodtrykk (ortostatisk blodtrykksfall), andre bivirkninger og tegn på forverring etter at aripiprazol er stoppet.',
              ved_funn: 'Ved dårlig toleranse holdes dosen, og resten av opptrappingen planlegges individuelt; en annen dose enn den valgte måldosen er et nytt valg.',
            },
          ],
        },
      ),
    ],
  },
  inndata: [
    ARIPIPRAZOL_INNDATA,
    // Kontrollørens niende gjennomgang: planen går fra 4 mg rett til måldosen, så bare det vanlige området 4–6 mg gir plan. Et høyere mål (for eksempel 4 → 16 mg) er et stort sprang uten kildebegrunnet opptrapping og stopper uten delplan, også med begrunnelse.
    { navn: 'maldose', omrade: [4, 6], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [RISPERDAL.dose, RISPERDAL.maks] } },
  ],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.abilifyDose, RISPERDAL.dose] },
    },
    peroral('aripiprazol'),
    spesialist(),
  ],
  unntak: [
    ALDER_65('Pasienten er 65 år eller eldre; preparatomtalen har en lavere startdose og langsommere opptrapping for eldre.', RISPERDAL.eldre),
    { id: 'nedsatt_nyre_lever', tekst: 'Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen halverer da start- og vedlikeholdsdosen.', grunnlag: { type: 'kilde', henvisninger: [RISPERDAL.nyreLever] } },
    {
      id: 'risperidon_interaksjon',
      tekst: 'Pasienten bruker en sterk CYP2D6-hemmer (f.eks. paroksetin, fluoksetin) eller en sterk CYP3A4-induktor (f.eks. karbamazepin); doseringen av risperidon må da vurderes særskilt.',
      grunnlag: { type: 'kilde', henvisninger: [RISPERDAL.interaksjoner] },
    },
  ],
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      ...FRA_ARIPIPRAZOL_KILDETRO,
      utsagn('Ved schizofreni startes risperidon med 2 mg daglig og kan økes til 4 mg dag 2; deretter holdes dosen eller tilpasses. De fleste har effekt av 4–6 mg daglig.', RISPERDAL.dose),
      utsagn('Ved bytte fra aripiprazol kan risperidon startes med 50 % av måldosen dag 1 og økes ved behov dag 5. Noen trenger langsommere opptrapping. Ortostatisk blodtrykksfall kan komme etter første dose.', BYTEVERKTOY.tilRisperidon, BYTEVERKTOY.tilRisperidonRisiko, BYTEVERKTOY.status),
      utsagn('Risperidon kan gis én eller to ganger daglig.', RISPERDAL.enEllerTo),
      utsagn('Eldre, nedsatt nyre- eller leverfunksjon og sterke CYP2D6-hemmere eller CYP3A4-induktorer krever andre doser eller en ny vurdering av doseringen.', RISPERDAL.eldre, RISPERDAL.nyreLever, RISPERDAL.interaksjoner),
    ],
    tilpasninger: [
      utsagn('Aripiprazol seponeres uten nedtrapping dagen før risperidon startes (siste dose dagen før dag 1).', KEKS.direkte, KEKS.fraAripiprazol),
      utsagn('Planen følger det forsiktigste av byteverktøyet og preparatomtalen: 2 mg dag 1–4 og første økning tidligst dag 5. 2 mg er preparatomtalens startdose og høyst 50 % av måldosen 4–6 mg, slik byteverktøyet anbefaler ved bytte fra aripiprazol. Preparatomtalens raskere økning til 4 mg dag 2 er ikke brukt, fordi aripiprazol fortsatt virker de første dagene etter siste dose og ortostatisk blodtrykksfall kan komme tidlig.', BYTEVERKTOY.tilRisperidon, BYTEVERKTOY.tilRisperidonRisiko, RISPERDAL.dose, KEKS.aripiprazolHalveringstid),
      utsagn('Forskriveren velger måldosen innenfor 4–6 mg, dosen de fleste har effekt av. Ved 4 mg er dosen fra dag 5 måldosen. Ved 5 eller 6 mg økes det dag 5 til 4 mg og ikke rett til måldosen, fordi ingen av kildene beskriver et sprang fra 2 mg til 5–6 mg; hvor lenge 4 mg holdes før måldosen, er et åpent OUSFAR-valg (forslag: én uke). Et høyere mål, også 8–16 mg med begrunnelse, og et lavere mål stopper uten delplan og planlegges individuelt. Doser over 10 mg har ikke vist bedre effekt. En enda langsommere opptrapping er en klinisk vurdering og beregnes ikke.', RISPERDAL.dose, RISPERDAL.maks, BYTEVERKTOY.tilRisperidon),
      utsagn('Planen bruker risperidontabletter eller smeltetabletter; miksturen har ingen dokumentert oppmåling i verktøyet.'),
    ],
    forutsetninger: forutsetninger(
      'Pasienten bruker peroral aripiprazol 10–30 mg daglig (tabletter, smeltetabletter eller mikstur), det doseområdet preparatomtalen oppgir ved schizofreni. Aripiprazol bare stoppes, så dosen tolkes ikke som et antall tabletter.',
      'Indikasjonen er schizofreni; ved mani gjelder en annen dosering, og regelen passer ikke.',
      'Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.',
    ),
    usikkerhet: [
      ...FRA_ARIPIPRAZOL_USIKKERHET,
      'Preparatomtalen sier at en langsommere opptrapping og lavere startdose kan være riktig for noen; det avgjøres klinisk.',
      'Ortostatisk blodtrykksfall tidlig i behandlingen, ekstrapyramidale bivirkninger og prolaktinøkning må følges.',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:Pa>Rd')],
  eksempler: [
    {
      id: 'fra-15-mg',
      beskrivelse: 'Aripiprazol 15 mg til risperidon, startdato 7. desember 2026.',
      inndata: { startdose_mg: 15, maldose_mg: 6, startdato: '2026-12-07', bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: { fra: ['fra dag 1 (07.12.2026): seponert'], til: ['dag 1–4 (07.12.2026–10.12.2026): 2 mg', 'dag 5–11 (11.12.2026–17.12.2026): 4 mg', 'fra dag 12 (18.12.2026): 6 mg'] },
    },
    {
      id: 'fra-10-mg',
      beskrivelse: 'Aripiprazol 10 mg (laveste dose i området) til risperidon.',
      inndata: { startdose_mg: 10, maldose_mg: 4, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: { fra: ['fra dag 1: seponert'], til: ['dag 1–4: 2 mg', 'fra dag 5: 4 mg'] },
    },
    {
      id: 'maldose-5',
      beskrivelse: 'Måldose 5 mg, innenfor det vanlige området.',
      inndata: { startdose_mg: 20, maldose_mg: 5, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: { fra: ['fra dag 1: seponert'], til: ['dag 1–4: 2 mg', 'dag 5–11: 4 mg', 'fra dag 12: 5 mg'] },
    },
    {
      id: 'maldose-16-begrunnet',
      beskrivelse: 'Måldose 16 mg med skriftlig begrunnelse: et sprang fra 4 mg uten kildebegrunnet opptrapping, så ingen komplett plan.',
      inndata: { startdose_mg: 30, maldose_mg: 16, begrunnelse: 'Syntetisk eksempel: tidligere effekt først ved høy dose.', bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 16 mg er utenfor/,
    },
    {
      id: 'maldose-8-begrunnet',
      beskrivelse: 'Måldose 8 mg, også med skriftlig begrunnelse, er over det vanlige området og stopper.',
      inndata: { startdose_mg: 30, maldose_mg: 8, begrunnelse: 'Syntetisk eksempel: tidligere god effekt av 8 mg uten bivirkninger.', bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 8 mg er utenfor/,
    },
    {
      id: 'maldose-6-5',
      beskrivelse: 'Måldose 6,5 mg, rett over det vanlige området, stopper.',
      inndata: { startdose_mg: 15, maldose_mg: 6.5, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 6,5 mg er utenfor/,
    },
    {
      id: 'maldose-3',
      beskrivelse: 'Måldose 3 mg, under det vanlige området, stopper.',
      inndata: { startdose_mg: 15, maldose_mg: 3, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 3 mg er utenfor/,
    },
    {
      id: 'maldose-over-16',
      beskrivelse: 'Måldose 20 mg er over det preparatomtalen anbefaler, også med begrunnelse.',
      inndata: { startdose_mg: 15, maldose_mg: 20, begrunnelse: 'Syntetisk eksempel.', bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 20 mg er utenfor/,
    },
    {
      id: 'aripiprazol-over-30',
      beskrivelse: 'Aripiprazol 40 mg er over høyeste dose; regelen gjelder ikke.',
      inndata: { startdose_mg: 40, maldose_mg: 4, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 40 mg er utenfor/,
    },
    {
      id: 'eldre',
      beskrivelse: '65 år eller eldre: regelen gjelder ikke.',
      inndata: { startdose_mg: 15, maldose_mg: 4, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { ...RISPERIDON_AVKREFTET, alder_65: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten er 65 år eller eldre/,
    },
    {
      id: 'depot',
      beskrivelse: 'Uten bekreftelse av at aripiprazol er peroral (ikke Abilify Maintena) stopper beregningen.',
      inndata: { startdose_mg: 15, maldose_mg: 4, bekreftet: ['indikasjon', 'spesialist_risiko'], pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Pasienten bruker peroral aripiprazol/,
    },
  ],
  godkjenning: tilKontroll(
    'Ny regel (K3): direkte bytte fra aripiprazol (Keks 2019) til risperidon med opptrappingen i preparatomtalen ved schizofreni (Risperdal pkt. 4.2).',
    `${GJENNOMGANG} startregimet og forskriverens valgte måldose (høyst 16 mg, utenfor 4–6 mg med begrunnelse) er atskilt, med en ny klinisk vurdering før endringen; tiden på 4 mg er et åpent OUSFAR-valg; også smeltetabletter.`,
    `${GJENNOMGANG_9} planen går fra 4 mg rett til måldosen, så bare 4–6 mg gir en komplett plan. Et høyere mål (8–16 mg) er et stort sprang uten kildebegrunnet opptrapping og stopper uten delplan, også med begrunnelse; et lavere mål stopper også.`,
    `${GJENNOMGANG_10} risperidon startes ikke lenger etter preparatomtalens raskere opptrapping (4 mg dag 2), men etter byteverktøyets råd ved bytte fra aripiprazol: 2 mg dag 1–4 (høyst 50 % av måldosen) og første økning dag 5, til 4 mg. Ved måldose 5 eller 6 mg holdes 4 mg en tid før måldosen (åpent OUSFAR-valg, forslag én uke). Toleransen og blodtrykket vurderes før hver økning.`,
    `${GJENNOMGANG_11} kontrolløren har godtatt én uke på 4 mg før en eventuell økning til 5 eller 6 mg som en forsiktig, symptomstyrt tilpasning; valget er registrert som avklart og merket som OUSFARs selvstendige kliniske vurdering. Regelen er ikke godkjent.`,
  ),
}

const KVETIAPIN_AVKREFTET = { alder_65: false, nedsatt_leverfunksjon: false, cyp3a4_hemmer: false }
const KVETIAPIN_BEKREFTET = ['indikasjon', 'spesialist_risiko', 'sluttmal_300']

const kariprazinKvetiapin: Regel = {
  id: 'antipsykotikabytte-kariprazin-kvetiapin',
  versjon: 2,
  tittel: 'Fra kariprazin til kvetiapin, direkte bytte',
  fra: { type: 'virkestoff', nokkel: 'kariprazin' },
  til: { type: 'virkestoff', nokkel: 'kvetiapin' },
  plan: {
    form: 'direkte',
    forlop: [
      seponeres('kariprazin', 'peroral'),
      startes(
        'kvetiapin',
        [
          { type: 'opptrapping', trinn: [50, 100, 200].map((mg) => ({ mg: kilde(mg, 'mg', 'bindende_krav', SPC.seroquel, REAGILA.fra), dager: kilde(1, 'dager', 'bindende_krav', SPC.seroquel) })) },
          { type: 'vedlikehold', dose: { type: 'fast', mg: kilde(300, 'mg', 'veiledende_preferanse', SPC.seroquel) } },
        ],
        {
          formulering: 'vanlig frisetting',
          // Bare tabletter med vanlig frisetting (FEST-form 53), aldri depottabletter, som har en annen opptrapping.
          legemiddelformer: ['53'],
          fordeling: { antall: [2], grunnlag: { type: 'kilde', henvisninger: [SPC.seroquelToGanger] } },
        },
      ),
    ],
  },
  inndata: [{ navn: 'startdose', verdier: [1.5, 3, 4.5, 6], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [REAGILA.dose] } }],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen og har schizofreni, og kariprazin er det eneste antipsykotikumet.',
      grunnlag: { type: 'kilde', henvisninger: [REAGILA.indikasjon, SPC.seroquel] },
    },
    spesialist(),
    {
      // Kontrollørens andre gjennomgang: et oppstartsregime er ikke automatisk en stabil, pasienttilpasset behandling.
      id: 'sluttmal_300',
      tekst:
        'Sluttmålet er 300 mg kvetiapin daglig fra dag 4, den laveste dosen i det vanlige effektive området ved schizofreni (300–450 mg), og det er vurdert som forsvarlig for denne pasienten. En annen vedlikeholdsdose (150–750 mg) etter effekt og toleranse er en ny klinisk vurdering som planen ikke beregner, og pasienten følges tett mens virkningen av kariprazin avtar over uker.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.seroquel, REAGILA.halvering] },
    },
  ],
  unntak: [
    ALDER_65('Pasienten er 65 år eller eldre; preparatomtalen sier at eldre kan trenge langsommere opptrapping og lavere dose av kvetiapin.', SEROQUEL.eldre),
    { id: 'nedsatt_leverfunksjon', tekst: 'Pasienten har nedsatt leverfunksjon; preparatomtalen har da en lavere startdose (25 mg) og langsommere opptrapping.', grunnlag: { type: 'kilde', henvisninger: [SEROQUEL.lever] } },
    { id: 'cyp3a4_hemmer', tekst: 'Pasienten bruker en CYP3A4-hemmer (f.eks. azolantimykotika, klaritromycin, erytromycin, HIV-proteasehemmere); kvetiapin er da kontraindisert.', grunnlag: { type: 'kilde', henvisninger: [SEROQUEL.cyp3a4] } },
  ],
  beregnbarhet: 'entydig_beregnbar',
  fortolkning: {
    kildetro: [
      utsagn('Ved bytte fra kariprazin trengs ingen gradvis kryss-titrering: det nye antipsykotikumet startes i laveste dose mens kariprazin seponeres.', REAGILA.fra),
      utsagn('Kariprazin og de aktive metabolittene faller med om lag 50 % på én uke, så virkningen avtar gradvis etter seponering.', REAGILA.halvering),
      utsagn('Kvetiapin med vanlig frisetting trappes opp med 50, 100, 200 og 300 mg de fire første dagene ved schizofreni; fra dag 4 anbefales 300–450 mg daglig, individuelt innenfor 150–750 mg.', SPC.seroquel),
      utsagn('Tablettene med vanlig frisetting tas to ganger daglig.', SPC.seroquelToGanger),
      utsagn('Et opphold uten antipsykotikum anbefales ikke.', KEKS.ingenOpphold),
    ],
    tilpasninger: [
      utsagn('Kariprazin seponeres uten nedtrapping dagen før kvetiapin startes (siste dose dagen før dag 1).', REAGILA.fra, REAGILA.halvering),
      utsagn('Dagens dose må være en dose kapslene gir og opptrappingen i trinn på 1,5 mg når: 1,5, 3, 4,5 eller 6 mg. Andre doser stopper.', REAGILA.dose),
      utsagn('Planen følger opptrappingen ved schizofreni og slutter med 300 mg daglig fra dag 4, den laveste dosen i det vanlige effektive området. Sluttmålet er et definert mål som forskriveren bekrefter er forsvarlig for pasienten; økning mot 450 mg eller en annen dose innenfor 150–750 mg er en ny klinisk vurdering og beregnes ikke, fordi preparatomtalen ikke gir trinn eller tid for den.', SPC.seroquel),
      utsagn('Planen bruker bare tabletter med vanlig frisetting i FEST, aldri depottabletter. Hver døgndose gis fordelt på to doser; kan den ikke fordeles med tablettene, stopper planen.', SPC.seroquelToGanger),
    ],
    forutsetninger: forutsetninger('Pasienten bruker kariprazin 1,5, 3, 4,5 eller 6 mg daglig.', 'Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.'),
    usikkerhet: [
      'Virkningen av kariprazin avtar over uker, så bivirkninger og effekt av kvetiapin kan først vurderes etter noen uker.',
      'Sedasjon og ortostatisk blodtrykksfall kan komme i opptrappingen av kvetiapin og må følges.',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:Pa>Qu')],
  eksempler: [
    {
      id: 'fra-4-5-mg',
      beskrivelse: 'Kariprazin 4,5 mg til kvetiapin, startdato 7. desember 2026.',
      inndata: { startdose_mg: 4.5, startdato: '2026-12-07', bekreftet: KVETIAPIN_BEKREFTET, pasientforhold: KVETIAPIN_AVKREFTET },
      forventet: {
        fra: ['fra dag 1 (07.12.2026): seponert'],
        til: [
          'dag 1 (07.12.2026): 50 mg, fordelt på 2 doser',
          'dag 2 (08.12.2026): 100 mg, fordelt på 2 doser',
          'dag 3 (09.12.2026): 200 mg, fordelt på 2 doser',
          'fra dag 4 (10.12.2026): 300 mg, fordelt på 2 doser',
        ],
      },
    },
    {
      id: 'fra-1-5-mg',
      beskrivelse: 'Kariprazin 1,5 mg (laveste dose) til kvetiapin.',
      inndata: { startdose_mg: 1.5, bekreftet: KVETIAPIN_BEKREFTET, pasientforhold: KVETIAPIN_AVKREFTET },
      forventet: {
        fra: ['fra dag 1: seponert'],
        til: ['dag 1: 50 mg, fordelt på 2 doser', 'dag 2: 100 mg, fordelt på 2 doser', 'dag 3: 200 mg, fordelt på 2 doser', 'fra dag 4: 300 mg, fordelt på 2 doser'],
      },
    },
    {
      id: 'kariprazin-2-mg',
      beskrivelse: 'Kariprazin 2 mg er ingen dose kapslene gir (1,5, 3, 4,5 eller 6 mg).',
      inndata: { startdose_mg: 2, bekreftet: KVETIAPIN_BEKREFTET, pasientforhold: KVETIAPIN_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 2 mg er utenfor/,
    },
    {
      id: 'kariprazin-over-6',
      beskrivelse: 'Kariprazin 9 mg er over høyeste dose; regelen gjelder ikke.',
      inndata: { startdose_mg: 9, bekreftet: KVETIAPIN_BEKREFTET, pasientforhold: KVETIAPIN_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 9 mg er utenfor/,
    },
    {
      id: 'uten-sluttmal',
      beskrivelse: 'Uten bekreftelse av at 300 mg er et forsvarlig sluttmål for pasienten stopper beregningen.',
      inndata: { startdose_mg: 3, bekreftet: ['indikasjon', 'spesialist_risiko'], pasientforhold: KVETIAPIN_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Sluttmålet er 300 mg kvetiapin daglig fra dag 4/,
    },
    {
      id: 'cyp3a4-hemmer',
      beskrivelse: 'Klaritromycin samtidig: kvetiapin er kontraindisert, og regelen gjelder ikke.',
      inndata: { startdose_mg: 3, bekreftet: KVETIAPIN_BEKREFTET, pasientforhold: { ...KVETIAPIN_AVKREFTET, cyp3a4_hemmer: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten bruker en CYP3A4-hemmer/,
    },
    {
      id: 'lever-ukjent',
      beskrivelse: 'Leverfunksjonen er ikke vurdert: ukjent stopper.',
      inndata: { startdose_mg: 3, bekreftet: KVETIAPIN_BEKREFTET, pasientforhold: { alder_65: false, cyp3a4_hemmer: false } },
      forventet: {},
      stopp: /Må avklares før beregning \(ukjent\): Pasienten har nedsatt leverfunksjon/,
    },
  ],
  godkjenning: tilKontroll(
    'Ny regel (K3): bytte fra kariprazin uten kryss-titrering (Reagila pkt. 4.2) til kvetiapin med opptrappingen ved schizofreni (Seroquel pkt. 4.2).',
    `${GJENNOMGANG_2} 300 mg fra dag 4 er et definert sluttmål som forskriveren bekrefter er forsvarlig for pasienten; en annen vedlikeholdsdose er en ny klinisk vurdering som ikke beregnes.`,
  ),
}

/* --- Peroralt: olanzapin og risperidon → aripiprazol, kryss-titrering (TARC 2018) ---------- */

const TARC_STED = 'avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1)'
const TARC = {
  opptrapping: h('tarc-2018', TARC_STED, 'Aripiprazol legges til den eksisterende behandlingen: 2,5–5 mg daglig den første uken, 5–10 mg daglig fra slutten av første uke og 10–15 mg daglig fra slutten av andre uke.'),
  overlapp: h('tarc-2018', TARC_STED, 'Når måldosen 10–15 mg er nådd, brukes aripiprazol og det forrige antipsykotikumet sammen i minst 2 uker.'),
  nedtrapping: h('tarc-2018', TARC_STED, 'Deretter trappes det forrige antipsykotikumet ned med 25 % av dosen, minst 2 uker mellom hver reduksjon, til det er stoppet; for eksempel 20 → 15 → 10 → 5 mg eller 4 → 3 → 2 → 1 mg og så stopp.'),
  hoyereDose: h('tarc-2018', TARC_STED, 'Trengs høyere dose, økes aripiprazol først til 15–20 mg i minst 2 uker og deretter eventuelt til 30 mg; vedlikehold er 10–30 mg daglig.'),
  pasienter: h('tarc-2018', TARC_STED, 'Opptrappingen gjelder stabile polikliniske pasienter som byttes på grunn av bivirkninger eller utilstrekkelig effekt av dagens behandling.'),
  andreGrupper: h('tarc-2018', 'avsnittene om gjentatte tilbakefall og om innlagte pasienter (figur 2 og 3)', 'Ved tidligere gjentatte psykotiske tilbakefall og hos innlagte anbefales en annen opptrapping, med høyere startdose og måldose.'),
  oppfolging: h('tarc-2018', 'avsnittet om vurdering før bytte', 'Før byttet vurderes pasienten grundig; under byttet følges pasienten tett med hyppige kontroller, og pasienten informeres om seponeringssymptomer, interaksjoner og mulig tilbakefall.'),
  bivirkninger: h('tarc-2018', 'avsnittet og tabellen om plager under byttet', 'Uønskede symptomer under byttet kan komme fra seponeringen av det forrige antipsykotikumet eller fra aripiprazol; ved noen av dem anbefales det å trappe ned det forrige langsommere.'),
  sponsor: h('tarc-2018', 'erklæringen om interessekonflikter', 'Konsensusmøtet ble organisert og finansiert av et legemiddelfirma; forfatterne oppgir at anbefalingene er deres egne.'),
}

const ABILIFY = {
  interaksjoner: h('ema-abilify', 'section 4.2 og 4.5', 'Ved samtidig bruk av sterke CYP3A4- eller CYP2D6-hemmere skal aripiprazoldosen reduseres, og ved sterke CYP3A4-induktorer økes; dosen justeres igjen når legemidlet tas bort.'),
  eldre: h('ema-abilify', 'section 4.2 (eldre)', 'Effekt og sikkerhet ved schizofreni er ikke fastslått fra 65 år; lavere startdose bør vurderes når kliniske forhold tilsier det.'),
}

const TIL_ARIPIPRAZOL_BEKREFTET = ['indikasjon', 'peroral_formulering', 'spesialist_risiko', 'siste_trinn']
const TIL_ARIPIPRAZOL_NEI = { tilbakefall_innlagt: false, alder_65: false, cyp_aripiprazol: false, seponeringsplager: false }

/** Det felles for bytte til aripiprazol: fra-stoffet holdes i 4 uker og trappes så ned med 25 % av startdosen minst hver 2. uke. */
function tilAripiprazol(a: {
  id: string
  fra: string
  fraNavn: string
  /** Startdosen i kildens eget eksempel (20 → 15 → 10 → 5 mg eller 4 → 3 → 2 → 1 mg og så stopp), og doseområdet i preparatomtalen. */
  kildeeksempel: number
  doseomrade: Kildehenvisning[]
  fraKilder: Kildehenvisning[]
  /** Det preparatomtalen og Keks 2019 sier om seponering av fra-stoffet, i tillegg til TARC. */
  seponering: Kildehenvisning[]
  /** Seponeringsplagene kildene nevner for fra-stoffet, med egne ord. */
  seponeringsplager: string
  /** Keks-verktøyets virkestoffspesifikke råd for dette bytte: forløpet og risikoen ved byttet. */
  byteverktoy: { forlop: Kildehenvisning; risiko: Kildehenvisning }
  referanse: string
  eksempler: Regel['eksempler']
  merknad: string
}): Regel {
  // Kontrollørens niende gjennomgang: 5 og 10 mg er innenfor TARCs områder og kan godtas i det snevre stabile forløpet når toleransen vurderes før økningen.
  const ukedose = (verdi: number, omrade: [number, number], uke: string) =>
    forslag(verdi, 'mg', `Valgt innenfor TARC-området ${omrade.join('–').replace('.', ',')} mg ${uke}; forskriveren kan velge en annen dose i området. Toleransen vurderes før hver økning.`, {
      omrade,
      justerbar: `Aripiprazol ${uke} (mg)`,
      henvisninger: [TARC.opptrapping],
      avklaring: avklartAvKontrollor(AVKLARING_9, 7, `Aripiprazol ${verdi} mg ${uke} er innenfor TARCs opptrappingsområde og kan godtas i det snevre stabile forløpet når toleransen vurderes før økningen.`),
    })
  // Kildens eget eksempel: ned 25 % av startdosen per trinn, 20 → 15 → 10 → 5 mg eller 4 → 3 → 2 → 1 mg og så stopp.
  const kildeforlop = `${[4, 3, 2, 1].map((n) => (a.kildeeksempel * n) / 4).join(' → ')} mg`
  // Kontrollørens åttende gjennomgang: virkestoffspesifikk støtte for at siste dose kan avsluttes mens aripiprazol etableres.
  const stoffspesifikt = [a.byteverktoy.forlop, a.byteverktoy.risiko, BYTEVERKTOY.status]
  const FraNavn = `${a.fraNavn[0]!.toUpperCase()}${a.fraNavn.slice(1)}`
  return {
    id: a.id,
    versjon: 8,
    tittel: `Fra ${a.fraNavn} til aripiprazol, kryss-titrering`,
    fra: { type: 'virkestoff', nokkel: a.fra },
    til: { type: 'virkestoff', nokkel: 'aripiprazol' },
    plan: {
      form: 'kryssnedtrapping',
      forlop: [
        {
          id: 'fra',
          virkestoff: { type: 'virkestoff', nokkel: a.fra },
          administrasjon: 'peroral',
          utgangsdose: 'startdose',
          start: { type: 'dag', dag: 1 },
          faser: [
            { type: 'hold', dose: { type: 'aktuell' }, varighet: { type: 'dager', dager: kilde(28, 'dager', 'bindende_krav', TARC.opptrapping, TARC.overlapp) } },
            {
              type: 'nedtrapping',
              strategi: {
                type: 'prosent_av_startdose',
                prosent: kilde(25, 'prosent', 'bindende_krav', TARC.nedtrapping),
              },
              trinnlengde: { ...kilde(14, 'dager', 'bindende_krav', TARC.nedtrapping), omrade: [14, TEKNISK_MAKS_DAGER], justerbar: 'Minste antall dager per reduksjon', teknisk_maks: true },
            },
          ],
          vurderinger: [
            {
              id: 'for_reduksjon',
              nar: { type: 'for_hvert_trinn' },
              tekst: `Før hver reduksjon av ${a.fraNavn}, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: ${a.seponeringsplager}), og pasienten følges tett gjennom hele byttet.`,
              ved_funn: 'Ved forverring, uro eller seponeringsplager holdes dosen, og resten av nedtrappingen planlegges individuelt.',
              grunnlag: { type: 'kilde', henvisninger: [TARC.oppfolging, TARC.bivirkninger, KEKS.spesialist, KEKS.dopaminerg, ...a.seponering, a.byteverktoy.risiko] },
            },
            // Kontrollørens femte gjennomgang: oppfølging etter siste trinn til 0.
            {
              id: 'etter_seponering',
              nar: {
                type: 'etter_seponering',
                dager: forslag(14, 'dager', 'Samme minstetid som mellom reduksjonene i kilden (minst 2 uker); kilden oppgir ikke når pasienten skal vurderes etter seponeringen. Et foreslått kontrollpunkt, ikke et fast intervall: pasienten følges tettere ved behov.', {
                  henvisninger: [TARC.nedtrapping, TARC.oppfolging],
                  avklaring: avklartAvKontrollor(AVKLARING_9, 7, '14 dager etter seponeringen er et rimelig foreslått kontrollpunkt, ikke et universelt obligatorisk intervall, med fleksibel tettere oppfølging etter behov.'),
                }),
              },
              tekst: `${FraNavn} er seponert: tilstanden vurderes på nytt (forverring av psykosen og seponeringsplager: ${a.seponeringsplager}).`,
              ved_funn: 'Ved forverring eller seponeringsplager vurderes behandlingen individuelt; planen gir ingen ny dose. Pasienten følges tettere ved behov, også før dette kontrollpunktet.',
              grunnlag: { type: 'kilde', henvisninger: [TARC.oppfolging, KEKS.spesialist, ...a.seponering] },
            },
          ],
        },
        startes(
          'aripiprazol',
          [
            { type: 'opptrapping', trinn: [
              { mg: ukedose(5, [2.5, 5], 'første uke'), dager: kilde(7, 'dager', 'bindende_krav', TARC.opptrapping) },
              { mg: ukedose(10, [5, 10], 'andre uke'), dager: kilde(7, 'dager', 'bindende_krav', TARC.opptrapping) },
            ] },
            { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
          ],
          {
            // Kontrollørens niende gjennomgang: ukedosene godtas når toleransen vurderes før hver økning.
            vurderinger: [
              {
                id: 'for_okning',
                nar: { type: 'for_hvert_trinn' },
                tekst: 'Før hver økning av aripiprazol: toleransen vurderes (akatisi, uro, aktivering og søvnvansker).',
                ved_funn: 'Ved dårlig toleranse holdes dosen, og resten av byttet planlegges individuelt.',
                grunnlag: { type: 'kilde', henvisninger: [TARC.opptrapping, TARC.bivirkninger, a.byteverktoy.risiko, BYTEVERKTOY.aripiprazolStart] },
              },
            ],
          },
        ),
      ],
    },
    inndata: [
      // Kontrollørens sjette gjennomgang: bare kildens eget forløp, der hvert trinn og siste dose før seponering står i kilden. Avklart i den åttende.
      {
        navn: 'startdose',
        verdier: [a.kildeeksempel],
        art: 'bindende_krav',
        grunnlag: {
          type: 'ousfar_vurdering',
          begrunnelse: `Planen gjelder bare ${a.kildeeksempel} mg ${a.fraNavn} daglig, startdosen i kildens eget eksempel (${kildeforlop} og så stopp), slik at hvert trinn og siste dose før seponering står i kilden. TARC knytter ikke eksemplene til et bestemt stoff; at dosen gjelder ${a.fraNavn}, er OUSFARs bevisste stoffspesifikke avgrensning innenfor preparatomtalens doseområde. Keks-verktøyet gir virkestoffspesifikk støtte for at siste dose av ${a.fraNavn} kan avsluttes mens aripiprazol etableres; OUSFAR beholder likevel TARCs langsommere forløp. Andre startdoser og egne lavdosetrinn er ikke validert og stopper.`,
          henvisninger: [TARC.nedtrapping, ...a.doseomrade, a.byteverktoy.forlop],
          avklaring: avklartAvKontrollor(
            AVKLARING_8,
            6,
            `${FraNavn} ${kildeforlop} og så stopp er et faglig forsvarlig, konservativt bytteforslag for en stabil voksen med schizofreni uten tidligere seponeringsplager eller andre unntak, med valgt og tolerert aripiprazoldose, lang overlapp, tett oppfølging og dosehold ved symptomer. Keks, Schwartz og Hope 2019 (Antipsychotic switching tool) gir stoffspesifikk støtte for at siste dose kan avsluttes mens aripiprazol etableres, og at siste trinn er hele dosen som gjenstår, diskvalifiserer ikke byttet. Gjelder ikke ren seponering, tidligere seponeringsplager, ustabil psykose eller andre startdoser.`,
          ),
        },
      },
      { navn: 'maldose', verdier: [10, 15], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [TARC.opptrapping, SPC.abilifyDose] } }],
    bekreftelser: [
      {
        id: 'indikasjon',
        tekst: `Pasienten er voksen, har schizofreni, er stabil og følges poliklinisk, og byttes fra ${a.fraNavn} på grunn av bivirkninger eller utilstrekkelig effekt.`,
        grunnlag: { type: 'kilde', henvisninger: [TARC.pasienter, SPC.abilifyDose] },
      },
      peroral(a.fraNavn),
      spesialist(),
      // Kontrollørens femte gjennomgang: siste trinn til 0 er 100 % av dosen som gjenstår, og må vurderes for pasienten.
      {
        id: 'siste_trinn',
        tekst: `Siste trinn er vurdert for denne pasienten: ${a.fraNavn} seponeres helt fra den siste lave dosen (hele dosen som gjenstår) mens aripiprazol har stått på måldosen i flere uker. Pasienten vet at seponeringsplager kan være ${a.seponeringsplager}. Pasienten vet hvilke seponeringsplager og tegn på tilbakefall som skal meldes, og vurderes før siste trinn og etter seponeringen. Ved forverring, uro eller seponeringsplager holdes siste dose, og resten planlegges individuelt.`,
        grunnlag: { type: 'kilde', henvisninger: [TARC.nedtrapping, TARC.overlapp, TARC.oppfolging, KEKS.spesialist, KEKS.dopaminerg, ...a.seponering, ...stoffspesifikt] },
      },
    ],
    unntak: [
      {
        id: 'tilbakefall_innlagt',
        tekst: 'Pasienten har hatt gjentatte psykotiske tilbakefall, er innlagt eller er ikke stabil; kilden anbefaler da en annen opptrapping, som ikke er omfattet.',
        grunnlag: { type: 'kilde', henvisninger: [TARC.andreGrupper] },
      },
      ALDER_65('Pasienten er 65 år eller eldre; effekt og sikkerhet av aripiprazol er ikke fastslått i denne gruppen.', ABILIFY.eldre),
      {
        id: 'cyp_aripiprazol',
        tekst: 'Pasienten bruker en sterk CYP3A4- eller CYP2D6-hemmer eller en sterk CYP3A4-induktor; aripiprazoldosen skal da justeres.',
        grunnlag: { type: 'kilde', henvisninger: [ABILIFY.interaksjoner] },
      },
      {
        id: 'seponeringsplager',
        tekst: `Pasienten har tidligere fått seponeringsplager, uro, søvnvansker eller forverring av psykosen ved dosereduksjon eller seponering av ${a.fraNavn}; regelen kan da ikke stå for siste trinn til 0, og nedtrappingen planlegges individuelt.`,
        grunnlag: { type: 'kilde', henvisninger: [TARC.oppfolging, ...a.seponering] },
      },
    ],
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [
        utsagn('Aripiprazol legges til dagens behandling med 2,5–5 mg daglig første uke, 5–10 mg andre uke og 10–15 mg fra slutten av andre uke.', TARC.opptrapping),
        utsagn(`Når måldosen er nådd, brukes begge i minst 2 uker; deretter trappes ${a.fraNavn} ned med 25 % av dosen minst hver 2. uke til det er stoppet.`, TARC.overlapp, TARC.nedtrapping),
        utsagn('Opptrappingen gjelder stabile polikliniske pasienter som byttes på grunn av bivirkninger eller utilstrekkelig effekt; ved gjentatte tilbakefall og hos innlagte anbefales en annen.', TARC.pasienter, TARC.andreGrupper),
        utsagn('Under kryss-titrering trappes det første antipsykotikumet ned mens det neste innføres; de fleste psykiatere bruker denne strategien.', KEKS.kryss),
        utsagn('Overlappet (det forrige holdes uendret til aripiprazol er på måldosen, og trappes så ned) tilsvarer den mest forsiktige strategien i Keks 2019, egnet ved høy risiko for tilbakefall.', KEKS.kontinuering, TARC.overlapp),
        utsagn(`Seponering av ${a.fraNavn}: ${a.seponering.map((k) => k.faktum ?? '').join(' ')}`, ...a.seponering),
        utsagn('Får pasienten plager under byttet, kan nedtrappingen av det forrige antipsykotikumet gå langsommere.', TARC.bivirkninger),
        utsagn('Pasienten følges tett under byttet, som bør vurderes av psykiater.', TARC.oppfolging, KEKS.spesialist),
        ...a.fraKilder.map((k) => utsagn(k.faktum ?? '', k)),
        utsagn(`Keks-verktøyet (2019, sist oppdatert 2022): ${a.byteverktoy.forlop.faktum ?? ''} ${a.byteverktoy.risiko.faktum ?? ''}`, a.byteverktoy.forlop, a.byteverktoy.risiko),
      ],
      tilpasninger: [
        utsagn('Aripiprazol foreslås som 5 mg den første uken og 10 mg den andre, øverst i kildens områder, fordi den laveste tablettstyrken i FEST er 5 mg og ikke er delbar; forskriveren kan velge 2,5 mg (mikstur) og 5–10 mg. Toleransen vurderes før hver økning (avklart av kontrolløren 04.11.2026). Måldosen 10 eller 15 mg velges av forskriveren.', TARC.opptrapping),
        utsagn(`${FraNavn} holdes uendret i 28 dager: 14 dagers opptrapping og 14 dager sammen med aripiprazol på måldosen. Første reduksjon er dag 29, og hver reduksjon står i minst 14 dager.`, TARC.opptrapping, TARC.overlapp, TARC.nedtrapping),
        utsagn(`Planen gjelder bare startdosen i kildens eget eksempel, ${a.kildeeksempel} mg (OUSFARs bevisste stoffspesifikke avgrensning, avklart av kontrolløren 04.11.2026), så hvert trinn, også siste dose før seponering, er kildens: ${kildeforlop} og så stopp, hvert trinn i minst 14 dager. Andre startdoser stopper, fordi kilden ikke viser hvordan de skal trappes ned når trinnene ikke kan gis med tablettene, og OUSFAR legger ikke inn egne lavdosetrinn som ikke er validert.`, TARC.nedtrapping, ...a.doseomrade),
        utsagn('Siste trinn til 0 er hele dosen som gjenstår. Det krever en egen vurdering av pasienten, stopper ved tidligere seponeringsplager, og pasienten vurderes før hver reduksjon, før siste trinn og etter seponeringen (forslag: 14 dager etter, tettere ved behov).', TARC.nedtrapping, TARC.oppfolging),
        utsagn(`Keks-verktøyet gir virkestoffspesifikk støtte for at siste dose av ${a.fraNavn} kan avsluttes mens aripiprazol etableres, men foreslår et raskere bytte. OUSFAR beholder med vilje TARCs langsommere forløp med lang overlapp; verktøyets raskere nedtrapping og start med 10 mg aripiprazol er ikke tatt inn.`, ...stoffspesifikt, BYTEVERKTOY.aripiprazolStart, TARC.overlapp),
        utsagn('Avgrensningen gjelder bare bytte til aripiprazol hos stabile pasienter fra startdosen over, og kan ikke overføres til ren seponering av antipsykotika, tidligere seponeringsplager, ustabil psykose eller andre startdoser.', TARC.pasienter, TARC.andreGrupper),
      ],
      forutsetninger: forutsetninger(
        `Pasienten bruker peroral ${a.fraNavn} som eneste antipsykotikum, i en stabil dose.`,
        'Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.',
      ),
      usikkerhet: [
        'Opptrappingen bygger på en konsensusrapport fra et ekspertpanel (lavt evidensnivå), og konsensusmøtet var finansiert av et legemiddelfirma. Rapporten nevner selv at raske bytter også er brukt i studier.',
        'Hvor lenge hvert trinn skal vare ut over minstetiden, og om nedtrappingen skal stoppes eller reverseres ved forverring, er en klinisk vurdering som ikke beregnes.',
        'Aripiprazol kan gi uro og akatisi tidlig; når dopaminblokkeringen fra det forrige stoffet avtar, kan symptomer komme tilbake, og det må følges.',
        'Keks-verktøyet er klinisk veiledning fra forfatterne, ikke en prospektiv validering, og det oppdateres ikke lenger (sist oppdatert 2022).',
      ],
    },
    referanser: [pn(a.referanse)],
    eksempler: a.eksempler,
    godkjenning: tilKontroll(
      a.merknad,
      `${GJENNOMGANG} kontrollørens valg c: når et trinn på 25 % av startdosen ikke kan gis, velger forskriveren blant de nærmeste dosene som kan gis, et større trinn varer tilsvarende lenger (aldri raskere enn 25 % av startdosen per 14 dager), og resten av forløpet regnes fra den valgte dosen.`,
      `${GJENNOMGANG_4} forskriveren kan velge ett mindre siste trinn før seponeringen (åpent OUSFAR-valg), med samme fartsregel; uten valg gjelder kildens siste trinn, der siste dose er høyst 25 % av startdosen.`,
      `${GJENNOMGANG_5} siste trinn til 0 krever en bekreftet vurdering av pasienten (åpent OUSFAR-valg), tidligere seponeringsplager er et unntak, og pasienten vurderes før siste trinn og etter seponeringen (forslag 14 dager).`,
      `${GJENNOMGANG_6} regelen gjelder bare startdosen i kildens eget eksempel (åpent OUSFAR-valg), så hvert trinn og siste dose før seponering står i kilden; valget av nærmeste dose (valg c) og det valgfrie mindre siste trinnet er fjernet, fordi de ga trinn kilden ikke har validert. Vurderingen av siste trinn bygger nå på kildens forløp.`,
      `${GJENNOMGANG_7} stoffspesifikt grunnlag for siste trinn og overlapp: preparatomtalens råd om seponering og seponeringsplagene Keks 2019 nevner for stoffet står i vurderingspunktene og i vurderingen av siste trinn, og overlappet er knyttet til den mest forsiktige strategien i Keks 2019. Koblingen av kildens eksempel til stoffet er fortsatt et åpent valg.`,
      `${GJENNOMGANG_8} kontrolløren har vurdert kildens forløp fra denne startdosen som et faglig forsvarlig, konservativt bytteforslag, og valget er registrert som avklart. Keks, Schwartz og Hope 2019 (Antipsychotic switching tool) er tatt inn som virkestoffspesifikk støtte for siste trinn, og at OUSFAR med vilje beholder det langsommere forløpet, er dokumentert. Regelen er ikke godkjent.`,
      `${GJENNOMGANG_9} kontrolløren har godtatt aripiprazol 5 mg første uke og 10 mg andre uke når toleransen vurderes før økningen, og 14 dager etter seponeringen som et foreslått kontrollpunkt med tettere oppfølging ved behov; begge er registrert som avklart. Planen har et nytt vurderingspunkt for toleransen før hver økning av aripiprazol. Regelen er ikke godkjent.`,
    ),
  }
}

const olanzapinAripiprazol = tilAripiprazol({
  id: 'antipsykotikabytte-olanzapin-aripiprazol',
  fra: 'olanzapin',
  fraNavn: 'olanzapin',
  kildeeksempel: 20,
  doseomrade: [SPC.zyprexaDose],
  fraKilder: [SPC.zyprexaDose, SPC.zyprexaSeponering],
  seponering: [SPC.zyprexaSeponering, KEKS.kolinerg],
  seponeringsplager: 'kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting, og akatisi, dystoni og dyskinesi',
  byteverktoy: { forlop: BYTEVERKTOY.olanzapin, risiko: BYTEVERKTOY.olanzapinRisiko },
  referanse: 'SwitchAntipsychotics:Ol>Pa',
  eksempler: [
    {
      id: 'fra-20-mg-15',
      beskrivelse: 'Olanzapin 20 mg, aripiprazol til 15 mg, startdato 1. desember 2026.',
      inndata: { startdose_mg: 20, maldose_mg: 15, startdato: '2026-12-01', bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {
        fra: [
          'dag 1–28 (01.12.2026–28.12.2026): 20 mg',
          'dag 29–42 (29.12.2026–11.01.2027): 15 mg',
          'dag 43–56 (12.01.2027–25.01.2027): 10 mg',
          'dag 57–70 (26.01.2027–08.02.2027): 5 mg',
          'fra dag 71 (09.02.2027): seponert',
        ],
        til: ['dag 1–7 (01.12.2026–07.12.2026): 5 mg', 'dag 8–14 (08.12.2026–14.12.2026): 10 mg', 'fra dag 15 (15.12.2026): 15 mg'],
      },
    },
    {
      id: 'fra-20-mg-10',
      beskrivelse: 'Olanzapin 20 mg, aripiprazol til 10 mg.',
      inndata: { startdose_mg: 20, maldose_mg: 10, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: { fra: ['dag 1–28: 20 mg', 'dag 29–42: 15 mg', 'dag 43–56: 10 mg', 'dag 57–70: 5 mg', 'fra dag 71: seponert'], til: ['dag 1–7: 5 mg', 'fra dag 8: 10 mg'] },
    },
    {
      id: 'fra-10-mg',
      beskrivelse: 'Olanzapin 10 mg: kilden viser ikke forløpet fra denne dosen, og siste trinn (2,5 mg til 0) er ikke validert, så ingen komplett plan.',
      inndata: { startdose_mg: 10, maldose_mg: 10, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Startdosen 10 mg er utenfor det regelen gjelder for \(20 mg\)/,
    },
    {
      id: 'tidligere-seponeringsplager',
      beskrivelse: 'Tidligere seponeringsplager eller forverring ved dosereduksjon av olanzapin: regelen kan ikke stå for siste trinn til 0, og planen stopper.',
      inndata: { startdose_mg: 20, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: { ...TIL_ARIPIPRAZOL_NEI, seponeringsplager: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten har tidligere fått seponeringsplager/,
    },
    {
      id: 'uten-vurdering-siste-trinn',
      beskrivelse: 'Uten bekreftet vurdering av siste trinn til 0 stopper beregningen.',
      inndata: { startdose_mg: 20, maldose_mg: 15, bekreftet: ['indikasjon', 'peroral_formulering', 'spesialist_risiko'], pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Må bekreftes før beregning: Siste trinn er vurdert for denne pasienten/,
    },
    {
      id: 'fra-15-mg',
      beskrivelse: 'Olanzapin 15 mg: 11,25 mg kan ikke gis med tablettene, og kilden viser ikke hvordan det skal trappes ned, så ingen komplett plan.',
      inndata: { startdose_mg: 15, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Startdosen 15 mg er utenfor det regelen gjelder for \(20 mg\)/,
    },
    {
      id: 'maldose-20',
      beskrivelse: 'Måldose 20 mg er over kildens område for dette bytte (10–15 mg).',
      inndata: { startdose_mg: 20, maldose_mg: 20, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Måldosen 20 mg er utenfor/,
    },
    {
      id: 'olanzapin-over-20',
      beskrivelse: 'Olanzapin 25 mg er over preparatomtalens doseområde.',
      inndata: { startdose_mg: 25, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Startdosen 25 mg er utenfor/,
    },
    {
      id: 'tilbakefall-innlagt',
      beskrivelse: 'Gjentatte tilbakefall eller innlagt: en annen opptrapping, ikke omfattet.',
      inndata: { startdose_mg: 20, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: { ...TIL_ARIPIPRAZOL_NEI, tilbakefall_innlagt: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten har hatt gjentatte psykotiske tilbakefall/,
    },
    {
      id: 'interaksjon-ukjent',
      beskrivelse: 'CYP-hemmere og -induktorer er ikke vurdert: ukjent stopper.',
      inndata: { startdose_mg: 20, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: { tilbakefall_innlagt: false, alder_65: false } },
      forventet: {},
      stopp: /Må avklares før beregning \(ukjent\): Pasienten bruker en sterk CYP3A4- eller CYP2D6-hemmer/,
    },
    {
      id: 'uten-spesialist',
      beskrivelse: 'Uten bekreftet spesialistvurdering stopper beregningen.',
      inndata: { startdose_mg: 20, maldose_mg: 15, bekreftet: ['indikasjon', 'peroral_formulering'], pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Må bekreftes før beregning: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten/,
    },
  ],
  merknad: 'Ny regel (K3, K0-07): kryss-titrering til aripiprazol etter TARC 2018 (stabile polikliniske pasienter), med nedtrapping av olanzapin til seponering.',
})

const risperidonAripiprazol = tilAripiprazol({
  id: 'antipsykotikabytte-risperidon-aripiprazol',
  fra: 'risperidon',
  fraNavn: 'risperidon',
  kildeeksempel: 4,
  doseomrade: [RISPERDAL.dose, RISPERDAL.maks],
  fraKilder: [RISPERDAL.dose, RISPERDAL.maks],
  seponering: [RISPERDAL.seponering],
  seponeringsplager: 'kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi',
  byteverktoy: { forlop: BYTEVERKTOY.risperidon, risiko: BYTEVERKTOY.risperidonRisiko },
  referanse: 'SwitchAntipsychotics:Rd>Pa',
  eksempler: [
    {
      id: 'fra-4-mg-15',
      beskrivelse: 'Risperidon 4 mg, aripiprazol til 15 mg.',
      inndata: { startdose_mg: 4, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: { fra: ['dag 1–28: 4 mg', 'dag 29–42: 3 mg', 'dag 43–56: 2 mg', 'dag 57–70: 1 mg', 'fra dag 71: seponert'], til: ['dag 1–7: 5 mg', 'dag 8–14: 10 mg', 'fra dag 15: 15 mg'] },
    },
    {
      id: 'fra-4-mg-10',
      beskrivelse: 'Risperidon 4 mg, aripiprazol til 10 mg.',
      inndata: { startdose_mg: 4, maldose_mg: 10, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: { fra: ['dag 1–28: 4 mg', 'dag 29–42: 3 mg', 'dag 43–56: 2 mg', 'dag 57–70: 1 mg', 'fra dag 71: seponert'], til: ['dag 1–7: 5 mg', 'fra dag 8: 10 mg'] },
    },
    {
      id: 'fra-6-mg',
      beskrivelse: 'Risperidon 6 mg: kilden viser ikke forløpet fra denne dosen (siste trinn 1,5 mg til 0), så ingen komplett plan.',
      inndata: { startdose_mg: 6, maldose_mg: 10, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Startdosen 6 mg er utenfor det regelen gjelder for \(4 mg\)/,
    },
    {
      id: 'fra-2-mg',
      beskrivelse: 'Risperidon 2 mg: kilden viser ikke forløpet fra denne dosen (siste trinn 0,5 mg til 0), så ingen komplett plan.',
      inndata: { startdose_mg: 2, maldose_mg: 10, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Startdosen 2 mg er utenfor det regelen gjelder for \(4 mg\)/,
    },
    {
      id: 'risperidon-over-16',
      beskrivelse: 'Risperidon 20 mg er over det preparatomtalen anbefaler.',
      inndata: { startdose_mg: 20, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Startdosen 20 mg er utenfor/,
    },
    {
      id: 'over-65',
      beskrivelse: '65 år eller eldre: regelen gjelder ikke.',
      inndata: { startdose_mg: 4, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: { ...TIL_ARIPIPRAZOL_NEI, alder_65: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten er 65 år eller eldre/,
    },
    {
      id: 'uten-maldose',
      beskrivelse: 'Uten valgt måldose (10 eller 15 mg) velger beregningen ikke selv.',
      inndata: { startdose_mg: 4, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Måldosen må oppgis/,
    },
  ],
  merknad: 'Ny regel (K3, K0-08): kryss-titrering til aripiprazol etter TARC 2018 (stabile polikliniske pasienter), med nedtrapping av risperidon til seponering.',
})

/** FEST-uttrekket reglene testes ende til ende med (`npm run verktoy:regler -- hent-fest`). */
export const FEST_ANTIPSYKOTIKA = 'src/data/verktoy/fest-antipsykotika.json'

/* --- Settet ----------------------------------------------------------------------------- */

/**
 * Den uavhengige kliniske godkjenningen av tre av reglene: ChatGPT, som
 * uavhengig fagkontrollør, i kontrollen av HEAD 63464bd 04.11.2026 (PR #320,
 * kommentar 6626569802, formidlet av Peder). Den gjelder bare nøyaktig
 * versjonen og fingeravtrykket under og den snevre avgrensningen; endres en
 * regel, gjelder godkjenningen ikke lenger, og regelen står til faglig
 * kontroll igjen. De fire andre reglene er ikke godkjent. Utviklerne av
 * reglene er ikke kontrollører.
 */
export const ANTIPSYKOTIKAVEDTAK: Godkjenningsvedtak = {
  av: KONTROLLOR,
  dato: '2026-11-04',
  gjennomgang: 'Kontrollørens ellevte gjennomgang av 63464bd 04.11.2026 (PR #320, kommentar 6626569802)',
  regler: {
    'depot-risperidon-xeplion': {
      versjon: 8,
      fingeravtrykk: '1672334c468f28cf181aa4d786370e60f3f232f76f63d374e0c505d847ab184e',
      avgrensning:
        'bare stabil voksen med schizofreni på 3 mg peroral risperidon daglig, med Xeplion 75 mg månedlig som faktisk valgt mål etter oppstart med 150 mg dag 1 og 100 mg dag 8, normal nyrefunksjon, dokumentert god effekt og toleranse og uten overvekt eller relevante interaksjoner, med vurdering før injeksjonene og vilkårene for individuell doseendring. Russu 2018 gir populasjonsfarmakokinetikk, ikke individuell doseekvivalens; 4–6 mg risperidon til 75 mg er fortsatt avvist. Godkjenningen gjelder en klinisk plausibel, begrenset oppstart, ikke garantert virkning hos alle.',
    },
    'antipsykotikabytte-olanzapin-aripiprazol': {
      versjon: 8,
      fingeravtrykk: 'f141a13a9e9368542d7719cfb0abea7cfb77a41d7d89248e5f9e1d70e0aa5f5e',
      avgrensning:
        'bare stabil voksen poliklinisk pasient med schizofreni: olanzapin 20 → 15 → 10 → 5 → 0 mg, med aripiprazol etablert på forskriverens valgte og tolererte 10 eller 15 mg, minst to ukers overlapp før nedtrappingen, minst 14 dager per reduksjon, tett vurdering av symptomer og bivirkninger, stopp eller individuell omlegging ved plager, og uten tidligere seponeringsproblemer. Dette er en bevisst langsommere strategi etter TARC 2018, ikke en generell regel for seponering av olanzapin.',
    },
    'antipsykotikabytte-risperidon-aripiprazol': {
      versjon: 8,
      fingeravtrykk: '866ac93c58fb921c78cd71518ec91637cb31a175b7a9a480552fcebe54cca870',
      avgrensning:
        'bare tilsvarende stabil voksen poliklinisk pasient med schizofreni: risperidon 4 → 3 → 2 → 1 → 0 mg, med aripiprazol på valgt og tolerert terapeutisk måldose før nedtrappingen, samme overlapp, intervaller, tette oppfølging og stoppkriterier. Ikke en generell regel om seponering av risperidon eller om at alle pasienter tåler 1 → 0 mg.',
    },
  },
}

export const ANTIPSYKOTIKASETT: Regelsett = {
  id: 'ousfar-verktoy-antipsykotikabytter',
  versjon: 1,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Byttereglene for antipsykotika i K3: komplette forløp til et definert sluttmål, bygget på preparatomtaler, Keks 2019 (oversikten og byteverktøyet), Russu 2018 og TARC 2018. To depotrelaterte (Xeplion fra peroral risperidon og fra Risperdal Consta), tre perorale direkte bytter (aripiprazol til olanzapin og til risperidon, kariprazin til kvetiapin) og to kryss-titreringer til aripiprazol (fra olanzapin og fra risperidon, TARC 2018). Tre er klinisk godkjent av en uavhengig kontrollør for nøyaktig sin versjon, sitt fingeravtrykk og en snever avgrensning (ANTIPSYKOTIKAVEDTAK): Xeplion fra peroral risperidon og de to kryss-titreringene til aripiprazol. De fire andre står til faglig kontroll. Verktøyene vises bare for administratorer.',
  regler: godkjenn([risperidonXeplion, constaXeplion, aripiprazolOlanzapin, aripiprazolRisperidon, kariprazinKvetiapin, olanzapinAripiprazol, risperidonAripiprazol], ANTIPSYKOTIKAVEDTAK),
}

export const ANTIPSYKOTIKABYTTER: Domenesett = {
  sett: ANTIPSYKOTIKASETT,
  rapport: {
    fil: 'docs/verktøy-k3-antipsykotikabytter.md',
    tittel: 'K3: regler for bytte av antipsykotikum',
    notater: ['docs/verktøy-k3-antipsykotika.md', 'docs/verktøy-klinisk-leveranseplan-2026-11.md', 'docs/verktøy-p4-regelmodell.md'],
  },
}
