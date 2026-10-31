/**
 * Nedtrappingsreglene i P7 (`docs/verktøy-p7-nedtrapping.md`): utkast til
 * OUSFARs egne regler for seponering av hvert antidepressiv der det finnes
 * forsvarlig kildegrunnlag, laget per virkestoff fra preparatomtalen, NICE og
 * Royal College of Psychiatrists (RCPsych). Hvilke virkestoffer som har regel,
 * bare fagtekst, mangler anbefaling eller har en annen begrensning, står i
 * dekningen (`verktoy/dekning.ts`).
 *
 * Reglene følger ett felles prinsipp, skrevet ut i hver regel så det kan
 * kontrolleres. Valgene følger risikogruppen for seponeringssymptomer
 * (RCPsych) slik fagvurderingen 29.10.2026 (beslutning 1) fastsatte dem: ved
 * høyest risiko 10 % av aktuell dose per trinn (forskriveren kan velge
 * 5–10 %) og minst 28 dager per trinn; ellers 25 % (5–50 %, over 25 % krever
 * begrunnelse) og minst 14 dager (28 for fluoksetin), med 28 dager som
 * standard. Dagene har ingen klinisk øvre grense: et trinn er en minstetid og
 * forlenges så lenge seponeringssymptomene krever det. Forskriveren må oppgi om
 * behandlingstiden er lang; da krever kortere trinn og (ved middels risiko og
 * for fluoksetin) mer enn 10 % begrunnelse.
 *
 * **Ingen plan går til null, og ingen har en fast nedre grense**
 * (fagkontrollene 29. og 30.10.2026): planen viser høyst
 * {@link PLANHORISONT_TRINN} reduksjoner frem i tid ({@link PLANHORISONT_LANGSOM}
 * i de langsomme variantene), aldri et trinn under laveste dose formuleringen
 * kan gi (en praktisk grense), aldri en reduksjon som forsvinner når dosen
 * vises med to desimaler, og stopper ved første trinn som ikke kan gis
 * nøyaktig med norske preparater (P5). Siste dose fortsetter til forskriveren
 * har vurdert videre nedtrapping; planen foreslår aldri en dato for siste dose.
 *
 * Hver plan er et **startforslag**: forskriveren må bekrefte det og at
 * organfunksjon og interaksjoner er vurdert. Startdosen kan være enhver
 * positiv dose opp til høyeste døgndose for voksne i preparatomtalen; over den
 * stopper beregningen uten overstyring. Innenfor den gjelder preparatomtalens
 * grenser for eldre, indikasjoner og nedsatt organfunksjon (substanskontrollen
 * 30.10.2026, beslutning 7): en uttrykkelig høyeste dose stopper, en
 * forsiktighetsgrense krever begrunnelse. Under 18 år, akutte alvorlige
 * forhold, ustabil dose, uregelmessig inntak, bytte og kontraindikasjoner
 * stopper den ordinære planleggingen. Har et tidligere forsøk gitt
 * seponeringssymptomer, gjelder regelens **langsomme variant** (1–5 % per
 * trinn, minst 28 dager), en egen regel. Fluoksetin har i tillegg dosering
 * annenhver dag som valgfri strategi. Reglene har **ingen toleranse**.
 *
 * **Bare to regler er klinisk godkjent**, begge tekstregler uten beregning:
 * bupropion (versjon 5) og agomelatin (versjon 1), med kontrollørens
 * fingeravtrykk. De beregnbare reglene er godkjent med endring og sendt til ny
 * uavhengig kontroll (P7.5). Duloksetin og venlafaksin er tekstregler, fordi
 * depotformuleringene ikke kan gi trinnene; citalopram, mirtazapin, moklobemid
 * og paroksetin etter kontrollørens beslutninger. Et trinn som ikke kan gis,
 * gir bare valg innenfor det foretrukne området, aldri et avvik som krever
 * begrunnelse (gjennomgangen av 9cb420b). Den hyperbolske citalopramregelen
 * ligger bare i sammenligningssettet, som ikke er klinisk. Psychiatrienet står
 * bare som referanse til Stop-oppføringen fra P3; ingen regel bygger på eller
 * gjengir teksten der.
 */
import { kravtekst, omradetekst } from './beregning'
import { FORUTSETNINGER_FELLES, forslag, h, kilde, leveransen, NICE, planhorisont, PLANHORISONT_LANGSOM, PLANHORISONT_TRINN, pn, RCPSYCH, steg, utsagn, vurdert } from './bygg'
import { disponer } from './godkjenning'
import type { Avklaring, Begrunnelseskrav, Bekreftelse, Fase, Forlop, Godkjenningssteg, Grunnlag, Inndatakrav, Kildehenvisning, Kliniskomfang, Nedtrappingsstrategi, Parameter, Regel, Regelsett, Regneeksempel, Sporsmal, Unntak, Utsagn } from './modell'
import { REGELMODELLVERSJON } from './modell'
import { gruppeRestApAripiprazol, seponeringCitalopramHyperbolsk, SPC } from './pilotsett'

/* --- Fakta fra preparatomtalene, med egne ord ----------------------------------------- */

const P7 = {
  sarotexDose: h('dmp-sarotex', 'pkt. 4.2', 'Depresjon: start 50 mg daglig, økes ved behov til 150 mg; eldre starter med 10–25 mg. Ved smerte og migreneprofylakse 25–75 mg daglig, med start 10–25 mg.'),
  sarotexSeponering: h('dmp-sarotex', 'pkt. 4.2 og 4.8', 'Når behandlingen avsluttes, trappes amitriptylin gradvis ned over flere uker; brå seponering etter lang bruk kan gi abstinenssymptomer.'),
  anafranilDose: h('dmp-anafranil', 'pkt. 4.2', 'Depresjon: start 50–75 mg, vanligvis 100–150 mg, høyst 250 mg daglig. Panikklidelse: start 10 mg, vanligvis 25–100 mg, høyst 150 mg. Eldre: start 10 mg.'),
  anafranilSeponering: h('dmp-anafranil', 'pkt. 4.2 og 4.4', 'Brå seponering bør unngås; etter jevnlig bruk lenge trappes dosen gradvis ned, og pasienten følges nøye.'),
  noritrenDose: h('dmp-noritren', 'pkt. 4.2', 'Voksne: vanligvis 50–75 mg daglig i starten (25–30 mg ved lettere tilfeller), opptil 150 mg og sjelden 200 mg. Eldre: start 25–30 mg, vedlikehold 25–50 mg.'),
  noritrenVedlikehold: h('dmp-noritren', 'pkt. 4.2', 'Når effekten er inntrådt, holdes dosen minst 2 uker og trappes så gradvis ned, f.eks. 10–25 mg hver 3.–8. dag, til laveste dose som holder symptomene i sjakk.'),
  noritrenSeponering: h('dmp-noritren', 'pkt. 4.4', 'Brå seponering etter lang tids bruk kan gi abstinenssymptomer.'),
  fevarinDose: h('dmp-fevarin', 'pkt. 4.2', 'Depresjon: start 50 eller 100 mg, anbefalt 100 mg, høyst 300 mg daglig.'),
  fevarinSeponering: h('dmp-fevarin', 'pkt. 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.'),
  seroxatDose: h('dmp-seroxat', 'pkt. 4.2', 'Depresjon: anbefalt 20 mg, høyst 50 mg daglig. Tvangslidelse og panikklidelse: anbefalt 40 mg, høyst 60 mg; ved panikklidelse startes det med 10 mg.'),
  seroxatRegime: h('dmp-seroxat', 'pkt. 4.2', 'I nedtrappingen i de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.'),
  seroxatVarighet: h('dmp-seroxat', 'pkt. 4.4', 'Seponeringsreaksjoner er vanlige; paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov.'),
  efexorDose: h('dmp-efexor-depot', 'pkt. 4.2', 'Depresjon: start 75 mg, høyst 375 mg daglig. Panikklidelse: 37,5 mg daglig den første uken.'),
  efexorSeponering: h('dmp-efexor-depot', 'pkt. 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker, for noen over måneder. Kapslene skal svelges hele.'),
  wellbutrinDose: h('dmp-wellbutrin', 'pkt. 4.2', 'Start 150 mg daglig; kan økes til 300 mg. Tablettene skal ikke deles, knuses eller tygges.'),
  wellbutrinSeponering: h('dmp-wellbutrin', 'pkt. 4.2', 'Seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes; en nedtrappingsperiode bør vurderes.'),
  aurorixDose: h('dmp-aurorix', 'pkt. 4.2', 'Start 300 mg daglig fordelt på to doser; kan økes til 600 mg. Ved alvorlig nedsatt leverfunksjon halveres dosen eller senkes til en tredjedel.'),
  aurorixSeponering: h('dmp-aurorix', 'pkt. 4.2', 'Preparatomtalen gir ingen anvisning om nedtrapping; et annet antidepressiv kan startes dagen etter at moklobemid er avsluttet.'),
  cymbaltaDose: h('ema-cymbalta', 'section 4.2', 'Depresjon: start og anbefalt dose 60 mg daglig; opptil 120 mg er undersøkt. Generalisert angstlidelse: start 30 mg.'),
  cymbaltaSeponering: h('ema-cymbalta', 'section 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.'),
  brintellixDose: h('ema-brintellix', 'section 4.2', 'Start og anbefalt dose 10 mg daglig hos voksne under 65 år; 5–20 mg etter respons.'),
  brintellixSeponering: h('ema-brintellix', 'section 4.2', 'Gradvis dosereduksjon kan vurderes for å unngå seponeringssymptomer, men data er for få til å anbefale en bestemt nedtrappingsplan.'),
  valdoxanDose: h('ema-valdoxan', 'section 4.2', 'Anbefalt dose 25 mg ved sengetid; kan økes til 50 mg.'),
  valdoxanSeponering: h('ema-valdoxan', 'section 4.2', 'Ingen nedtrapping er nødvendig når behandlingen avsluttes.'),
  // Substanskontrollen 30.10.2026 (beslutning 7 og 8): grenser for pasientgrupper, indikasjoner og administrasjon.
  cipramilEldre: h('dmp-cipramil', 'pkt. 4.2', 'Eldre over 65 år: halv dose, 10–20 mg daglig; høyst 20 mg daglig.'),
  cipramilLever: h('dmp-cipramil', 'pkt. 4.2', 'Mild eller moderat nedsatt leverfunksjon: start 10 mg, høyst 20 mg daglig. Alvorlig nedsatt: forsiktighet og ekstra omhyggelig dosetitrering.'),
  cipramilQt: h('dmp-cipramil', 'pkt. 4.3', 'Kontraindisert ved kjent QT-forlengelse eller medfødt langt QT-syndrom, og sammen med andre legemidler som forlenger QT-intervallet.'),
  cipralexEldre: h('dmp-cipralex', 'pkt. 4.2', 'Eldre over 65 år: start 5 mg; kan økes til 10 mg daglig.'),
  cipralexLever: h('dmp-cipralex', 'pkt. 4.2', 'Mild eller moderat nedsatt leverfunksjon: start 5 mg, kan økes til 10 mg daglig. Alvorlig nedsatt: forsiktighet og ekstra omhyggelig dosetitrering.'),
  cipralexQt: h('dmp-cipralex', 'pkt. 4.3', 'Kontraindisert ved kjent QT-forlengelse eller medfødt langt QT-syndrom, og sammen med andre legemidler som forlenger QT-intervallet.'),
  cipralexCyp2c19: h('dmp-cipralex', 'pkt. 4.2', 'Kjent langsom CYP2C19-metaboliserer: start 5 mg, kan økes til 10 mg daglig.'),
  seroxatIndikasjon: h('dmp-seroxat', 'pkt. 4.2', 'Høyst 50 mg daglig ved depresjon, sosial angstlidelse, generalisert angstlidelse og posttraumatisk stresslidelse; høyst 60 mg ved tvangslidelse og panikklidelse.'),
  seroxatEldre: h('dmp-seroxat', 'pkt. 4.2', 'Eldre: startdose som for voksne; dosen bør ikke overstige 40 mg daglig.'),
  seroxatOrgan: h('dmp-seroxat', 'pkt. 4.2', 'Ved kreatininclearance under 30 ml/min og ved nedsatt leverfunksjon er konsentrasjonen høyere; dosen begrenses til nedre del av doseområdet.'),
  efexorIndikasjon: h('dmp-efexor-depot', 'pkt. 4.2', 'Høyst 375 mg daglig ved depressive episoder; høyst 225 mg ved generalisert angstlidelse, sosial angstlidelse og panikklidelse.'),
  anafranilIndikasjon: h('dmp-anafranil', 'pkt. 4.2', 'Depresjon og tvangstilstander: vanligvis 100–150 mg, i vanskelige tilfeller høyst 250 mg daglig. Panikklidelse: vanligvis 25–100 mg, om nødvendig 150 mg. Narkolepsi: 25–100 mg om kvelden.'),
  sarotexEldre: h('dmp-sarotex', 'pkt. 4.2', 'Depresjon hos eldre over 65 år og ved hjerte- og karsykdom: opptil 100–150 mg fordelt på to doser; doser over 100 mg brukes med forsiktighet.'),
  sarotexSmerte: h('dmp-sarotex', 'pkt. 4.2', 'Nevropatisk smerte, kronisk spenningshodepine og migreneprofylakse hos voksne: anbefalt 25–75 mg daglig; over 100 mg med forsiktighet, og hos eldre over 75 mg.'),
  fevarinFordeling: h('dmp-fevarin', 'pkt. 4.2', 'Opptil 150 mg kan gis som én dose; en døgndose over 150 mg bør fordeles på 2 eller 3 doser.'),
  aurorixFordeling: h('dmp-aurorix', 'pkt. 4.2', 'Døgndosen gis fordelt på 2 doser, rett etter måltid.'),
  aurorixKontra: h('dmp-aurorix', 'pkt. 4.3', 'Kontraindisert sammen med selegilin, linezolid, triptaner, petidin, tramadol, bupropion og dekstrometorfan, og ved akutte forvirringstilstander.'),
  cymbaltaKontra: h('ema-cymbalta', 'section 4.3', 'Kontraindisert ved leversykdom med nedsatt leverfunksjon, ved alvorlig nedsatt nyrefunksjon (kreatininclearance under 30 ml/min) og sammen med sterke CYP1A2-hemmere som fluvoksamin.'),
  brintellixEldre: h('ema-brintellix', 'section 4.2', 'Fra 65 år: start alltid med 5 mg; forsiktighet ved doser over 10 mg, der data er begrenset.'),
  niceVoksne: h('nice-ng222', 'tittel og omfang', 'Retningslinjen gjelder behandling av depresjon hos voksne.'),
}




/* --- Felles byggesteiner for P7 ------------------------------------------------------- */

const TIL_KONTROLL = 'Sendt til uavhengig faglig kontroll av kilder, klinisk innhold og regneeksempler (P7.5). Ikke klinisk godkjent.'
/** Datoene for fagkontrollene versjonene bygger på; runde 2 og 3 var samme dag. */
const RUNDE_1 = '2026-10-29'
const RUNDE_2 = '2026-10-30'
const RUNDE_3 = '2026-10-30'
const RUNDE_4 = '2026-10-30'
const RUNDE_5 = '2026-10-30'
/** Kontrollørens gjennomganger av 9cb420b, 0ae6d07, d6cc3dd og f77e1a9, samme dag. */
const RUNDE_7 = '2026-10-31'
const RUNDE_8 = '2026-10-31'
const RUNDE_9 = '2026-10-31'
const RUNDE_11 = '2026-10-31'
/** Kontrollene der kontrolløren har gitt en klinisk godkjenning ({@link klinisk}). */
const SUBSTANSKONTROLLEN = { navn: 'Substanskontrollen 30.10.2026, runde 3', dato: RUNDE_3 }
const GJENNOMGANG_F77E1A9 = { navn: 'Kontrollørens gjennomgang av f77e1a9 31.10.2026 (P7.5), faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen', dato: RUNDE_11 }

/** Hva som er endret i en versjon, og når; regelversjonen er antallet versjoner. */
interface Versjon {
  merknad: string
  dato?: string
}
const UTKAST: Versjon = { merknad: 'Utkast til nedtrappingsregel (P7.2).' }
const KONTROLL_1: Versjon = {
  merknad:
    'Omarbeidet etter første uavhengige kontroll (P7.5): startforslag som må bekreftes, unntak ved tidligere seponeringssymptomer, sluttdose uavhengig av styrkene, langsom variant der NICE krever særlig varsomhet, begrunnede minstevarigheter og lave restdoser.',
}
const KONTROLL_2: Versjon = {
  merknad:
    'Omarbeidet etter andre uavhengige kontroll (P7.5): trinnlengden bygger på RCPsych, ikke NICEs råd om fluoksetin; trinnstørrelsen følger risikoen for seponeringssymptomer; forskriveren kan justere trinnstørrelse og trinnlengde innenfor et område; sluttdosen er merket som uavklart modellforutsetning; minst 28 dager.',
}
const KONTROLL_3: Versjon = {
  merknad:
    'Omarbeidet etter fagvurderingen 29.10.2026 (P7.5): valgområder per risikogruppe (høy risiko 5–10 %, ellers standard 25 % og begrunnelse over 25 %), minst 14 eller 28 dager per trinn uten klinisk øvre grense, lang behandlingstid registreres, begrunnelse for raske valg, og ingen automatisk seponering: planen stopper ved nedre grense, og avslutningen vurderes individuelt.',
  dato: RUNDE_1,
}
const KONTROLL_4: Versjon = {
  merknad:
    'Omarbeidet etter fagkontrollen 30.10.2026 (P7.5): ingen fast nedre grense, men en teknisk planhorisont og praktiske grenser for formuleringene; planen stopper ved første trinn som ikke kan gis; startdose utenfor rammen for indikasjon eller pasientgruppe krever begrunnelse; organfunksjon og interaksjoner bekreftes; tidligere seponeringssymptomer gir den langsomme varianten.',
  dato: RUNDE_2,
}
const KONTROLL_5: Versjon = {
  merknad:
    'Omarbeidet etter substanskontrollen 30.10.2026, runde 3 (P7.5): godkjent med endring. Høyst 12 reduksjoner per plan og 6 i de langsomme variantene; hvert trinn avrundes til den viste dosen, og en reduksjon som forsvinner i avrundingen, er ikke et trinn; ny tekst om siste dose; preparatomtalens grenser for eldre, indikasjoner og nedsatt organfunksjon; stopp under 18 år, ved akutte alvorlige forhold, ustabil dose, uregelmessig inntak, bytte og kontraindikasjoner.',
  dato: RUNDE_3,
}
/** Fluvoksamin og moklobemid etter kontrollrunden 30.10.2026 (P7.5, punkt 4). */
const LIKE_STORE_DOSER: Versjon = {
  merknad: 'Rettet etter kontrollrunden 30.10.2026 (P7.5): at deldosene skal være like store, er regelens eget konservative valg med eget grunnlag, ikke et krav i preparatomtalen eller en felles regel for alle legemidler.',
  dato: RUNDE_4,
}
/** Alle beregnbare P7-regler etter bidragsyterens valg 30.10.2026 (P7.5): forskriveren velger blant dosene som kan gis. */
const VALG_AV_DOSE: Versjon = {
  merknad:
    'Etter bidragsyterens valg 30.10.2026 (P7.5): når et trinn ikke kan gis nøyaktig med preparatene, viser planen de nærmeste dosene som kan gis, med faktisk reduksjon fra dosen før, og forskriveren velger. Bare doser med faktisk reduksjon innenfor valgområdet for risikogruppen kan velges, med de samme kravene om begrunnelse. Åpent forslag til ny kontroll.',
  dato: RUNDE_4,
}
/** Alle beregnbare P7-regler etter kontrollørens beslutninger 30.10.2026 (P7.5, beslutning P7-A og P7-B). */
const KONTROLL_6: Versjon = {
  merknad:
    'Rettet etter kontrollørens beslutninger 30.10.2026 (P7.5, P7-A og P7-B): valg blant dosene som kan gis er akseptert som prinsipp; etter lang behandlingstid er 10 % per trinn forslaget der mer enn 10 % krever begrunnelse, så et større trinn er et synlig avvik; et valg som ikke lenger passer planen eller ikke kan gis, avvises; like store deldoser kreves ikke, og en ulik fordeling merkes.',
  dato: RUNDE_5,
}
/** Alle beregnbare P7-regler etter kontrollørens gjennomgang av 9cb420b 31.10.2026 (P7.5). */
const KONTROLL_7: Versjon = {
  merknad:
    'Rettet etter kontrollørens gjennomgang av 9cb420b 31.10.2026 (P7.5): et avvik som krever begrunnelse, er ikke et godkjent planområde og tilbys ikke lenger som valg. Forskriveren kan bare velge en dose med faktisk reduksjon innenfor det foretrukne området, der ingen begrunnelse kreves; finnes ingen, er planen et forklarende stopp. En plan med én reduksjon er én mulig reduksjon med revurdering, ikke en fullstendig nedtrappingsplan.',
  dato: RUNDE_7,
}
/** Alle beregnbare P7-regler etter kontrollørens gjennomgang av 0ae6d07 31.10.2026 (P7.5). */
const KONTROLL_8: Versjon = {
  merknad:
    'Avgrenset etter kontrollørens gjennomgang av 0ae6d07 31.10.2026 (P7.5): en klinisk godkjenning kan bare gjelde de kontrollerte tilfellene i regelens kliniske omfang (legemiddelform, startdose, behandlingstid og tidligere seponeringssymptomer, med trinnstørrelsen og trinnlengden som er kontrollert). Alt annet stopper med forklaring, også et større trinn forskriveren velger med begrunnelse, og en plan med delte klomipramintabletter.',
  dato: RUNDE_8,
}
/** Alle beregnbare P7-regler etter kontrollørens gjennomgang av d6cc3dd 31.10.2026 (P7.5). */
const KONTROLL_9: Versjon = {
  merknad:
    'Avgrenset etter kontrollørens gjennomgang av d6cc3dd 31.10.2026 (P7.5): hvert tilfelle i det kliniske omfanget gjelder bare preparatstyrkene i FEST som er kontrollert, så en ny styrke i et senere uttrekk ikke stilltiende utvider en plan. Klomipramin har bare 50 mg ved lang behandlingstid med hele tabletter, og vortioksetin ved lang behandlingstid er tatt ut. Etter lang behandlingstid krever mer enn 10 % per trinn begrunnelse også for vortioksetin, så 25 % ikke er en foretrukket reduksjon.',
  dato: RUNDE_9,
}
/**
 * Mirtazapin, moklobemid og paroksetin etter kontrollørens beslutning P7-A:
 * ingen dose innenfor valgområdet kan gis ved første trinn med dagens former,
 * så reglene står som fagtekst.
 */
const IKKE_BEREGNBAR_FORM: Versjon = {
  merknad:
    'Gjort om til fagtekst etter kontrollørens beslutninger 30.10.2026 (P7.5, beslutning P7-A): med dagens norske former ga ingen dose første trinn innenfor valgområdet i aksepttesten, heller ikke med forskriverens valg blant dosene som kan gis. Ingen aktiv beregnbar plan før en dokumentert alternativ formulering og en substansspesifikk kontroll foreligger; den langsomme varianten er tatt ut.',
  dato: RUNDE_5,
}
/** Citalopram etter kontrollørens gjennomgang av 9cb420b 31.10.2026 (P7.5). */
const CITALOPRAM_FAGTEKST: Versjon = {
  merknad:
    'Gjort om til fagtekst etter kontrollørens gjennomgang av 9cb420b 31.10.2026 (P7.5): med tablettene i FEST er den eneste dosen som kan gis ved første trinn fra vanlig dose, en halvering, verken ved kort eller lang behandlingstid. Det er ikke et faglig akseptert standardtrinn, og regelen skal foreløpig ikke aktiveres som klinisk beregnbar regel; den langsomme varianten er tatt ut.',
  dato: RUNDE_7,
}
/** Den første versjonen av en regel laget etter fagkontrollen 30.10.2026. */
const NY_ETTER_RUNDE_2 = (hva: string): Versjon => ({ merknad: `Ny regel etter fagkontrollen 30.10.2026 (P7.5): ${hva}`, dato: RUNDE_2 })

/** Historikken for versjonene, én versjon hver. */
const historikk = (versjoner: Versjon[]) => versjoner.flatMap((v, i) => [steg('utkast', i + 1, v.merknad, v.dato), steg('til_faglig_kontroll', i + 1, TIL_KONTROLL, v.dato)])

const tall = (x: number) => String(x).replace('.', ',')

const kontrollor = { av: 'ChatGPT (uavhengig kontrollør)', rolle: 'uavhengig_kontrollor' } as const

/**
 * Avklaringen fra fagvurderingen 29.10.2026 (beslutning 1): valgområdene per
 * risikogruppe kan innføres som rammer for individuell planlegging. Den gjelder
 * regelversjonen den står i; den er ingen klinisk godkjenning.
 */
const beslutning1 = (regelversjon: number): Avklaring => ({
  dato: RUNDE_1,
  ...kontrollor,
  regelversjon,
  merknad: 'Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier',
})

/** Beslutningene i fagkontrollen 30.10.2026 som avklarer et valg; ingen av dem er en klinisk godkjenning. */
const RUNDE_2_BESLUTNING = {
  langOver: 'Beslutning 5.3: begrunnelse for mer enn 10 % per trinn ved lang behandlingstid i middelsgruppen, ikke utenfor regelen',
  lavtTrinn: 'Beslutning 5.4: høyst 25 % fra laveste døgndose er en konservativ øvre ramme, ikke en anbefaling; en lavere valgt prosent gjelder fortsatt',
  doseramme: 'Beslutning 5.5: høyeste døgndose for voksne er ingen automatisk godkjent ramme; en dose utenfor rammen for indikasjon eller pasientgruppe krever forskriverens særskilte vurdering',
  langsom: 'Beslutning 5.6: en egen langsom variant ved tidligere seponeringssymptomer, 1–5 % per trinn (standard 5 %) og minst 28 dager, i stedet for å utelukke pasientene',
  organfunksjon: 'Beslutning 5.6: organfunksjon og interaksjoner må vurderes for alle stoffer; unntaket for moklobemid alene er ikke nok',
  annenhverDag: 'Beslutning 5.10: fluoksetin 20 mg annenhver dag som valgfri strategi ved 20 mg daglig, i minst fire uker før revurdering, uten automatisk seponering',
} as const

const runde2 = (regelversjon: number, hva: keyof typeof RUNDE_2_BESLUTNING): Avklaring => ({
  dato: RUNDE_2,
  ...kontrollor,
  regelversjon,
  merknad: `Fagkontrollen 30.10.2026, ${RUNDE_2_BESLUTNING[hva]}`,
})

/** Beslutningene i substanskontrollen 30.10.2026 (runde 3) som avklarer et valg; ingen av dem er en klinisk godkjenning. */
const RUNDE_3_BESLUTNING = {
  horisont: 'Beslutning 6: 12 reduksjoner er godkjent som teknisk maksimalhorisont for hovedreglene, forutsatt at ingen reduksjon skjer automatisk',
  horisontLangsom: 'Beslutning 6: høyst 6 reduksjoner per plan i de langsomme variantene, et konservativt systemvalg for tettere revurdering, ikke en validert klinisk grense',
  startdose: 'Beslutning 7: positiv startdose opp til preparatomtalens høyeste voksendose er den ytre beregningsrammen; over den stopper beregningen uten overstyring med fritekst',
  pasientgruppe: 'Beslutning 7: skill mellom anbefalt dose, forsiktighetsgrense og uttrykkelig høyeste dose for pasientgruppe og indikasjon; avvik fra anbefalt dose kan begrunnes, en sikkerhetsbegrunnet høyeste dose stopper',
  stopp: 'Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging',
  kontraindikasjon: 'Beslutning 7 og 8: kontraindikasjoner kan ikke overstyres med en generell begrunnelse',
  fluoksetinLang: 'Beslutning 8: fluoksetin krever begrunnelse for mer enn 10 % per trinn etter lang behandlingstid',
  annenhverDag: 'Beslutning 7 og 8: inngangen er nøyaktig 20 mg daglig; symptomer kan kreve vurdering før dag 28; ikke ved annen startdose eller tidligere seponeringsproblemer uten særskilt vurdering',
} as const

const runde3 = (regelversjon: number, hva: keyof typeof RUNDE_3_BESLUTNING): Avklaring => ({
  dato: RUNDE_3,
  ...kontrollor,
  regelversjon,
  merknad: `Substanskontrollen 30.10.2026, ${RUNDE_3_BESLUTNING[hva]}`,
})

/** Kontrollørens beslutninger 30.10.2026 etter bidragsyterens valg om tilgjengelige doser (P7-A og P7-B); ingen av dem er en klinisk godkjenning. */
const RUNDE_5_BESLUTNING = {
  trinnvalg:
    'Beslutning P7-A: valg blant dosene som kan gis er akseptert som prinsipp; forskriveren velger eksplisitt, aldri automatisk, bare innenfor valgområdet for risikogruppen, og begrunnelsen følger den faktiske reduksjonen',
  langStandard: 'Beslutning P7-A: etter lang behandlingstid i middelsgruppen er 5–10 % det foretrukne utgangspunktet; et større trinn er et synlig, begrunnet avvik, aldri et likeverdig standardforslag',
} as const

/** Kontrollørens beslutning i gjennomgangen av 9cb420b 31.10.2026; ingen klinisk godkjenning. */
const RUNDE_7_BESLUTNING =
  'P7-A–C er grunnlaget for delplaner, men «bare avvik» og «stopp» er ikke godkjente kliniske planområder: standardresponsen er et forklarende stopp, et avvik presenteres ikke som en normal plan, og én reduksjon omtales som én mulig reduksjon med revurdering'

const runde7 = (regelversjon: number): Avklaring => ({ dato: RUNDE_7, ...kontrollor, regelversjon, merknad: `Kontrollørens gjennomgang av 9cb420b 31.10.2026, ${RUNDE_7_BESLUTNING}` })

/** Kontrollørens beslutninger i gjennomgangen av d6cc3dd 31.10.2026; ingen klinisk godkjenning. */
const RUNDE_9_BESLUTNING = {
  omfang:
    'bare kontrollerte tilfeller med faktisk tilgjengelig foretrukket reduksjon er med: vortioksetin ved lang behandlingstid er tatt ut, klomipramin bare 50 → 45 mg ved lang behandlingstid med hele tabletter og bare nei til depresjon og tvangstilstander, og nye eller endrede styrker i FEST utvider ikke et tilfelle',
  vortioksetinLang:
    'vortioksetin ved lang behandlingstid: uten en tilgjengelig reduksjon på 5–10 % er planen et forklarende stopp, ikke et valgbart trinn på 25 %; 25 % skal ikke kalles foretrukket i dette scenariet',
} as const

const runde9 = (regelversjon: number, hva: keyof typeof RUNDE_9_BESLUTNING): Avklaring => ({ dato: RUNDE_9, ...kontrollor, regelversjon, merknad: `Kontrollørens gjennomgang av d6cc3dd 31.10.2026, ${RUNDE_9_BESLUTNING[hva]}` })

const runde5 = (regelversjon: number, hva: keyof typeof RUNDE_5_BESLUTNING): Avklaring => ({
  dato: RUNDE_5,
  ...kontrollor,
  regelversjon,
  merknad: `Kontrollørens beslutninger 30.10.2026, ${RUNDE_5_BESLUTNING[hva]}`,
})

const vurdering = (begrunnelse: string, henvisninger: Kildehenvisning[], avklaring: Avklaring | null): Grunnlag => ({ type: 'ousfar_vurdering', begrunnelse, henvisninger, avklaring })

/**
 * At forskriveren kan velge blant dosene som kan gis når et trinn ikke kan gis
 * nøyaktig (bidragsyterens valg 30.10.2026, P7.5): prinsippet er akseptert i
 * beslutning P7-A, og etter gjennomgangen av 9cb420b bare innenfor det
 * foretrukne området, der ingen begrunnelse kreves.
 */
const trinnvalg = (versjon: number): Grunnlag =>
  vurdering(
    'Når et trinn ikke kan gis nøyaktig med norske preparater, viser planen de nærmeste dosene som kan gis, med faktisk reduksjon fra dosen før, og forskriveren velger; beregningen velger aldri selv. Bare doser med faktisk reduksjon innenfor det foretrukne området kan velges: valgområdet for risikogruppen (ved lav dose høyst 25 % der den grensen gjelder), men aldri en reduksjon som ville krevd begrunnelse, for eksempel over 10 % etter lang behandlingstid. Et avvik som krever begrunnelse, tilbys ikke; finnes ingen dose i det foretrukne området, er planen et forklarende stopp, og en annen plan vurderes individuelt utenfor verktøyet. Neste trinn regnes fra den valgte dosen, og et valg som ikke lenger passer planen eller ikke kan gis, avvises. Et farligere trinn velges aldri for å få en plan, og én reduksjon er én mulig reduksjon med revurdering, ikke en fullstendig nedtrappingsplan.',
    [RCPSYCH.plan, RCPSYCH.smaa, NICE.andel],
    runde7(versjon),
  )

/** Bekreftelsen hver beregnbar regel krever: planen er et startforslag med minstetider, ikke en fast tidsplan. */
export const STARTFORSLAG: Bekreftelse = {
  id: 'startforslag',
  tekst:
    'Planen er et startforslag, ikke en forhåndsgodkjenning av alle reduksjonene: hvert trinn forutsetter en ny vurdering av toleransen, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Ved revurdering, eller når dosen, trinnstørrelsen eller strategien endres, beregnes en ny plan fra dosen pasienten faktisk bruker.',
  grunnlag: { type: 'kilde', henvisninger: [NICE.tempo, NICE.alvorlig, RCPSYCH.tid, RCPSYCH.smaa] },
}

/** Bekreftelsen om organfunksjon og interaksjoner, som gjelder alle stoffer (beslutning 5.6). */
export const ORGANFUNKSJON_ID = 'organfunksjon_interaksjoner'
const organfunksjon = (versjon: number): Bekreftelse => ({
  id: ORGANFUNKSJON_ID,
  tekst:
    'Lever- og nyrefunksjon og interaksjoner er vurdert. Ved nedsatt organfunksjon eller interaksjoner som kan endre konsentrasjonen av legemidlet, må dosen og planen vurderes individuelt.',
  grunnlag: vurdering('Beregningen kan ikke utlede organfunksjon eller interaksjoner fra dosen, og de kan endre hvordan pasienten tåler hvert trinn; forskriveren må vurdere dem for hvert stoff.', [NICE.halveringstid], runde2(versjon, 'organfunksjon')),
})

/** Bekreftelsen i den langsomme varianten: at de tidligere symptomene var seponeringssymptomer (beslutning 5.6). */
export const TIDLIGERE_VURDERT_ID = 'tidligere_seponeringssymptomer_vurdert'
const tidligereVurdert = (versjon: number): Bekreftelse => ({
  id: TIDLIGERE_VURDERT_ID,
  tekst:
    'Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt symptomer som forskriveren har vurdert som seponeringssymptomer, ikke tilbakefall, bivirkninger eller andre årsaker.',
  grunnlag: vurdering('Den langsomme varianten gjelder bare når de tidligere symptomene virkelig var seponeringssymptomer; det kan ikke utledes av dosen.', [NICE.tidligere, RCPSYCH.langvarig], runde2(versjon, 'langsom')),
})

/** Unntaket i hovedregelen: etter seponeringssymptomer ved et tidligere forsøk gjelder den langsomme varianten. */
export const TIDLIGERE_SYMPTOMER_ID = 'tidligere_seponeringssymptomer'
const tidligereSymptomer = (versjon: number): Unntak => ({
  id: TIDLIGERE_SYMPTOMER_ID,
  tekst: 'Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen.',
  grunnlag: vurdering(
    'NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene; den langsomme varianten har 1–5 % per trinn og minst 28 dager.',
    [NICE.tidligere, NICE.alvorlig, RCPSYCH.langvarig],
    runde2(versjon, 'langsom'),
  ),
})

/**
 * Forholdene som stopper ordinær planlegging for alle stoffene
 * (substanskontrollen 30.10.2026, beslutning 7): da passer ikke en langsom
 * standardplan, og nedtrappingen må planlegges individuelt.
 */
export const UNDER_18_ID = 'under_18'
export const AKUTT_ID = 'akutt_situasjon'
export const USTABIL_ID = 'ustabil_dose_eller_bytte'
const fellesStopp = (versjon: number): Unntak[] => [
  {
    id: UNDER_18_ID,
    tekst: 'Pasienten er under 18 år. Reglene er laget for voksne; nedtrapping hos barn og ungdom må vurderes særskilt.',
    grunnlag: vurdering('NICE NG222 og preparatomtalene reglene bygger på, gjelder voksne; pediatrisk bruk må vurderes for seg.', [P7.niceVoksne], runde3(versjon, 'stopp')),
  },
  {
    id: AKUTT_ID,
    tekst: 'Pasienten har en akutt alvorlig bivirkning, en forgiftning eller en alvorlig interaksjon, eller trenger av andre grunner rask seponering.',
    grunnlag: vurdering('Ved alvorlige medisinske forhold kan raskere eller umiddelbar seponering være nødvendig; da er en langsom standardplan ikke nødvendigvis riktig.', [NICE.tempo, NICE.alvorlig], runde3(versjon, 'stopp')),
  },
  {
    id: USTABIL_ID,
    tekst: 'Dosen er ikke stabil, pasienten tar legemidlet uregelmessig, eller seponeringen er del av et bytte til et annet legemiddel.',
    grunnlag: vurdering('Beregningen forutsetter et kjent, stabilt daglig doseringsregime; bytte og uregelmessig eksponering kan kreve egne modeller.', [NICE.bytte, NICE.halveringstid], runde3(versjon, 'stopp')),
  },
]

/** En kontraindikasjon som stopper planleggingen og ikke kan begrunnes bort (beslutning 7). */
const kontraindikasjon = (versjon: number, id: string, tekst: string, ...henvisninger: Kildehenvisning[]): Unntak => ({
  id,
  tekst: `${tekst} Det er en kontraindikasjon i preparatomtalen; en generell begrunnelse kan ikke overstyre den, og nedtrappingen må planlegges individuelt.`,
  grunnlag: vurdering('Preparatomtalen oppgir forholdet som en kontraindikasjon; ordinær planlegging stoppes i stedet for å kreve en begrunnelse.', henvisninger, runde3(versjon, 'kontraindikasjon')),
})

/** Spørsmålet hver beregnbar regel stiller: behandlingstiden registreres og avgjør hvilke valg som krever begrunnelse. */
export const LANG_BEHANDLINGSTID: Sporsmal = {
  id: 'lang_behandlingstid',
  tekst: 'Har pasienten brukt legemidlet i mange måneder eller lenger?',
  ja: 'lang behandlingstid',
  grunnlag: { type: 'kilde', henvisninger: [RCPSYCH.langvarig, RCPSYCH.fireUker, NICE.halveringstid] },
}

/** Spørsmålet om dosen er utenfor rammen for indikasjonen eller pasientgruppen; et ja krever begrunnelse (beslutning 5.5). */
export const UTENFOR_DOSERAMME_ID = 'utenfor_doseramme'
const utenforDoseramme = (versjon: number, kilde: Kildehenvisning): Sporsmal => ({
  id: UTENFOR_DOSERAMME_ID,
  tekst: 'Er dosen ellers utenfor preparatomtalens doseramme for pasientens indikasjon eller pasientgruppe, for eksempel ved nedsatt organfunksjon, utover det spørsmålene om pasientgruppe og indikasjon dekker?',
  ja: 'dose utenfor rammen for indikasjon eller pasientgruppe',
  krever_begrunnelse: true,
  grunnlag: vurdering(
    'Regelen gjelder fra dosen pasienten faktisk bruker, men høyeste døgndose for voksne er ingen automatisk godkjent ramme for alle: en dose utenfor rammen for indikasjonen eller pasientgruppen krever forskriverens særskilte vurdering og vises ikke som automatisk godkjent.',
    [kilde],
    runde2(versjon, 'doseramme'),
  ),
})

/** Feltene forskriveren kan justere, slik de vises i verktøyet. */
export const JUSTERING = { prosent: 'Reduksjon per trinn (% av aktuell dose)', dager: 'Minste antall dager per trinn' } as const

/** Den tekniske øvre grensen for dager per trinn i én beregning; ingen klinisk grense (et trinn kan alltid forlenges). */
export const TEKNISK_MAKS_DAGER = 365

/** Laveste og høyeste døgndose preparatomtalen oppgir for voksne, med kildestedet. */
interface Doser {
  lavest: number
  hoyest: number
  kilde: Kildehenvisning
}

/**
 * En grense for startdosen i preparatomtalen for en pasientgruppe eller
 * indikasjon (substanskontrollen 30.10.2026, beslutning 7): `maks` er en
 * uttrykkelig høyeste dose og stopper beregningen; `forsiktighet` er en grense
 * der en høyere dose krever en skriftlig begrunnelse. `ved` er spørsmålet og
 * svaret grensen gjelder ved; uten gjelder den alltid.
 */
interface Dosegrense {
  ved?: { sporsmal: Sporsmal; svar: boolean }
  hoyest: number
  art: 'maks' | 'forsiktighet'
  henvisning: Kildehenvisning
}

/** Et spørsmål om pasientgruppe, indikasjon eller organfunksjon, med preparatomtalen som grunnlag. */
const sporsmal = (id: string, tekst: string, ja: string, henvisning: Kildehenvisning, valg: { nei?: string; krever_begrunnelse?: true } = {}): Sporsmal => ({
  id,
  tekst,
  ja,
  ...(valg.nei && { nei: valg.nei }),
  ...(valg.krever_begrunnelse && { krever_begrunnelse: true as const }),
  grunnlag: { type: 'kilde', henvisninger: [henvisning] },
})

/**
 * Valgene for en risikogruppe (fagvurderingen 29.10.2026, beslutning 1, og den
 * langsomme varianten fra fagkontrollen 30.10.2026): reduksjon per trinn og
 * minste antall dager per trinn, med standardverdi, område og når et valg
 * krever begrunnelse.
 */
interface Risikogruppe {
  tittel: string
  prosent: { standard: number; omrade: [number, number]; begrunnelseOver?: number; begrunnelse: string; henvisninger: Kildehenvisning[] }
  /** Over denne reduksjonen ved lang behandlingstid kreves begrunnelse (beslutning 5.3, for fluoksetin beslutning 8 i runde 3). */
  langOver?: number
  dager: { standard: number; minst: number; begrunnelseUnderVedLang?: number; begrunnelse: string; henvisninger: Kildehenvisning[] }
  /** Mindre trinn (høyst 25 %) fra laveste døgndose når en større reduksjon er valgt (beslutning 5.4). */
  lavtTrinn: boolean
}

const HOY: Risikogruppe = {
  tittel: 'langsom prosentvis nedtrapping (høy risiko)',
  prosent: {
    standard: 10,
    omrade: [5, 10],
    begrunnelse:
      'Høyest potensiell risiko for seponeringssymptomer (RCPsych): 10 % av aktuell dose per trinn, og forskriveren kan velge 5–10 %. Større reduksjoner er utenfor regelen og krever en individuelt utarbeidet plan.',
    henvisninger: [RCPSYCH.hoyRisiko, RCPSYCH.plan, RCPSYCH.langvarig],
  },
  dager: {
    standard: 28,
    minst: 28,
    begrunnelse: 'Minst 28 dager per trinn ved høyest risiko, uten klinisk fastsatt øvre grense; standard 28. Minstetiden er et konservativt valg, ikke en validert biologisk terskel.',
    henvisninger: [RCPSYCH.tid, NICE.tempo],
  },
  lavtTrinn: false,
}

const MIDDELS: Risikogruppe = {
  tittel: 'gjentatt prosentvis nedtrapping',
  prosent: {
    standard: 25,
    omrade: [5, 50],
    begrunnelseOver: 25,
    begrunnelse:
      'Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som forsiktig standard ved kort behandlingstid. Etter lang behandlingstid er forslaget 10 %, og mer enn 10 % krever begrunnelse. Forskriveren kan velge 5–50 %; over 25 % krever begrunnelse, særlig om behandlingstid og tidligere toleranse.',
    henvisninger: [RCPSYCH.middelsRisiko, RCPSYCH.plan, RCPSYCH.tid, NICE.halveringstid],
  },
  langOver: 10,
  dager: {
    standard: 28,
    minst: 14,
    begrunnelseUnderVedLang: 28,
    begrunnelse: 'Minst 14 dager per trinn, uten klinisk fastsatt øvre grense; standard 28. Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse.',
    henvisninger: [RCPSYCH.tid, RCPSYCH.langvarig, NICE.tempo],
  },
  lavtTrinn: true,
}

/** Fluoksetin: middels risiko, men lang virketid gir minst 28 dager per trinn og ingen mindre trinn ved lav dose. */
const FLUOKSETIN: Risikogruppe = {
  tittel: 'gjentatt prosentvis nedtrapping',
  prosent: {
    ...MIDDELS.prosent,
    begrunnelse:
      'Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som standard ved kort behandlingstid; forskriveren kan velge 5–50 %, og over 25 % krever begrunnelse. Etter lang behandlingstid er forslaget 10 %, og mer enn 10 % krever begrunnelse: den lange halveringstiden kan gjøre større reduksjoner plausible, men symptomene kan komme sent.',
  },
  langOver: 10,
  dager: {
    standard: 28,
    minst: 28,
    begrunnelse:
      'Minst 28 dager per trinn, uten klinisk fastsatt øvre grense: fluoksetin og den aktive metabolitten virker lenge, og seponeringssymptomer kan komme sent. RCPsych anbefaler å vente minst fire uker før neste reduksjon; NICE nevner én til to uker for å vurdere virkningen.',
    henvisninger: [RCPSYCH.fluoksetin, NICE.fluoksetinVurdering],
  },
  lavtTrinn: false,
}

const LAV: Risikogruppe = {
  tittel: 'gjentatt prosentvis nedtrapping',
  prosent: {
    ...MIDDELS.prosent,
    begrunnelse:
      'Lav potensiell risiko (RCPsych) og lang halveringstid: 25 % av aktuell dose per trinn som standard ved kort behandlingstid; forskriveren kan velge 5–50 %, og over 25 % krever begrunnelse. Etter lang behandlingstid er forslaget 10 %, og mer enn 10 % krever begrunnelse (kontrollørens gjennomgang av d6cc3dd).',
    henvisninger: [RCPSYCH.middelsRisiko, RCPSYCH.plan, RCPSYCH.tid, RCPSYCH.langvarig],
  },
  langOver: 10,
  dager: MIDDELS.dager,
  lavtTrinn: true,
}

/** Den langsomme varianten ved tidligere seponeringssymptomer, for alle stoffene (beslutning 5.6). */
const LANGSOM: Risikogruppe = {
  tittel: 'langsom variant etter tidligere seponeringssymptomer',
  prosent: {
    standard: 5,
    omrade: [1, 5],
    begrunnelse:
      'Etter seponeringssymptomer ved et tidligere forsøk: 5 % av aktuell dose per trinn, og forskriveren kan velge 1–5 %. Større reduksjoner er utenfor varianten. Dosene må kunne gis; et trinn som ikke kan gis, stopper planen, med mindre forskriveren velger en dose som kan gis, med faktisk reduksjon på 1–5 %.',
    henvisninger: [RCPSYCH.langvarig, RCPSYCH.smaa, NICE.tidligere, NICE.alvorlig],
  },
  dager: {
    standard: 28,
    minst: 28,
    begrunnelse: 'Minst 28 dager per trinn etter tidligere seponeringssymptomer, uten klinisk fastsatt øvre grense; lengre intervaller kan velges.',
    henvisninger: [RCPSYCH.tid, RCPSYCH.langvarig, NICE.tempo],
  },
  lavtTrinn: false,
}

/** Reduksjonen per trinn for gruppen, med begrunnelseskravene. */
function reduksjon(g: Risikogruppe, avklaring: Avklaring, versjon: number): Parameter {
  const krav: Begrunnelseskrav[] = [
    ...(g.prosent.begrunnelseOver !== undefined
      ? [
          {
            over: g.prosent.begrunnelseOver,
            grunnlag: vurdering(
              `Større reduksjoner enn ${g.prosent.begrunnelseOver} % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet.`,
              [RCPSYCH.plan, RCPSYCH.langvarig],
              avklaring,
            ),
          },
        ]
      : []),
    ...(g.langOver !== undefined
      ? [
          {
            over: g.langOver,
            ved: LANG_BEHANDLINGSTID.id,
            grunnlag: vurdering(
              'Etter lang behandlingstid bør reduksjonen vanligvis være 5–10 % (RCPsych, fagvurderingen 29.10.2026); mer krever begrunnelse, så et raskere valg aldri står som likeverdig standard.',
              [RCPSYCH.langvarig],
              g === FLUOKSETIN ? runde3(versjon, 'fluoksetinLang') : g === LAV ? runde9(versjon, 'vortioksetinLang') : runde2(versjon, 'langOver'),
            ),
          },
        ]
      : []),
  ]
  const p = forslag(g.prosent.standard, 'prosent', g.prosent.begrunnelse, {
    omrade: g.prosent.omrade,
    justerbar: JUSTERING.prosent,
    henvisninger: g.prosent.henvisninger,
    ...(krav.length > 0 && { begrunnelseskrav: krav }),
    avklaring,
  })
  // Etter lang behandlingstid er grensen for begrunnelse også forslaget (beslutning P7-A).
  if (g.langOver === undefined) return p
  return {
    ...p,
    standard_ved: {
      ved: LANG_BEHANDLINGSTID.id,
      verdi: g.langOver,
      grunnlag: vurdering(
        `Etter lang behandlingstid er 5–10 % per trinn det foretrukne utgangspunktet (RCPsych), så forslaget er ${g.langOver} % i stedet for ${g.prosent.standard} %. Et større trinn er et synlig, begrunnet avvik fra det, aldri et likeverdig standardforslag. Et konservativt OUSFAR-valg, ikke en empirisk validert terskel.`,
        [RCPSYCH.langvarig],
        g === LAV ? runde9(versjon, 'vortioksetinLang') : runde5(versjon, 'langStandard'),
      ),
    },
  }
}

/** Minste antall dager per trinn for gruppen: uten klinisk øvre grense, bare en teknisk. */
function dagerPerTrinn(g: Risikogruppe, avklaring: Avklaring): Parameter {
  const krav = g.dager.begrunnelseUnderVedLang
  return forslag(g.dager.standard, 'dager', g.dager.begrunnelse, {
    omrade: [g.dager.minst, TEKNISK_MAKS_DAGER],
    teknisk_maks: true,
    justerbar: JUSTERING.dager,
    henvisninger: g.dager.henvisninger,
    ...(krav !== undefined && {
      begrunnelseskrav: [
        {
          under: krav,
          ved: LANG_BEHANDLINGSTID.id,
          grunnlag: vurdering(`Kortere trinn enn ${krav} dager etter lang behandlingstid krever begrunnelse; etter lang bruk anbefaler RCPsych langsommere nedtrapping.`, [RCPSYCH.langvarig, RCPSYCH.tid], avklaring),
        },
      ],
    }),
    avklaring,
  })
}

/** Det felles prinsippet for stoffets risikogruppe: uten sluttdose, så planen aldri går til null. */
function strategi(d: Doser, g: Risikogruppe, avklaring: Avklaring, versjon: number): Nedtrappingsstrategi {
  const prosent = reduksjon(g, avklaring, versjon)
  if (!g.lavtTrinn) return { type: 'prosent_av_aktuell', prosent }
  const lav = runde2(versjon, 'lavtTrinn')
  return {
    type: 'prosent_av_aktuell',
    prosent,
    lav_prosent: forslag(25, 'prosent', 'Høyst 25 % per trinn fra laveste døgndose: en konservativ øvre ramme etter eksempelet i NICE, ikke en anbefaling. Aldri større enn reduksjonen ellers, så det betyr bare noe når en større reduksjon er valgt.', { henvisninger: [NICE.andel, RCPSYCH.lavDose], avklaring: lav }),
    lav_grense_mg: forslag(d.lavest, 'mg', 'Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav.', { henvisninger: [d.kilde], avklaring: lav }),
  }
}

/** Hva forskriveren kan velge for en parameter, og hva som krever begrunnelse. */
function valgområde(p: Parameter): string {
  if (!p.justerbar || !p.omrade) return ''
  const krav = (p.begrunnelseskrav ?? []).map((k) => kravtekst(k, p, [LANG_BEHANDLINGSTID]))
  return ` (forskriveren kan velge ${omradetekst(p as Parameter & { omrade: [number, number] })}${krav.length > 0 ? `; begrunnelse kreves ${krav.join(' og ')}` : ''})`
}

const utenNull = (horisont: number) =>
  `Planen viser høyst ${horisont} reduksjoner (en teknisk planhorisont) og går ikke til null: siste dose fortsetter til forskriveren har vurdert videre nedtrapping, og avslutningen vurderes individuelt.`

/** Planhorisonten (beslutning 6): 12 reduksjoner i hovedreglene, 6 i de langsomme variantene. */
const horisont = (versjon: number, langsom: boolean) =>
  langsom
    ? planhorisont(PLANHORISONT_LANGSOM, {
        begrunnelse: `Teknisk planhorisont, ikke en klinisk grense: den langsomme varianten viser høyst ${PLANHORISONT_LANGSOM} reduksjoner per plan, omtrent et halvt år med 28 dager per trinn, så pasienten revurderes tettere etter tidligere seponeringsproblemer. Ingen reduksjon skjer automatisk, og ved revurdering beregnes en ny plan fra dosen pasienten faktisk bruker.`,
        avklaring: runde3(versjon, 'horisontLangsom'),
      })
    : planhorisont(PLANHORISONT_TRINN, {
        begrunnelse: `Teknisk planhorisont, ikke en klinisk grense eller anbefalt behandlingsvarighet: planen viser høyst ${PLANHORISONT_TRINN} reduksjoner frem i tid, omtrent ett år med 28 dager per trinn. Ingen reduksjon skjer automatisk, og ved revurdering beregnes en ny plan fra dosen pasienten faktisk bruker.`,
        avklaring: runde3(versjon, 'horisont'),
      })

/** OUSFARs valg i en regel, skrevet ut fra verdiene så teksten aldri kan avvike fra dem. */
function valgtekst(s: Nedtrappingsstrategi, trinnlengde: Parameter, horisont: number): string {
  if (s.type !== 'prosent_av_aktuell') throw new Error(`Strategien ${s.type} brukes ikke i P7`)
  const lav = s.lav_grense_mg ? `, høyst ${s.lav_prosent?.verdi} % fra ${tall(s.lav_grense_mg.verdi!)} mg` : ''
  const lang = s.prosent.standard_ved ? ` (${s.prosent.standard_ved.verdi} % etter lang behandlingstid)` : ''
  return `OUSFAR trapper ned med ${s.prosent.verdi} % av aktuell dose${lang}${valgområde(s.prosent)}${lav}, med minst ${trinnlengde.verdi} dager per trinn${valgområde(trinnlengde)}. ${utenNull(horisont)}`
}

/** Valgene i et regneeksempel: justeringer (prosent, dager), svarene på spørsmålene, og begrunnelsen. */
interface Eksempelvalg {
  justert?: Partial<Record<keyof typeof JUSTERING, number>>
  lang?: boolean
  utenforRamme?: boolean
  /** Svar på stoffets egne spørsmål (pasientgruppe, indikasjon); de andre er nei. */
  svar?: Record<string, boolean>
  begrunnelse?: string
}

/** Et regneeksempel; `forventet` er planen for forløpet `fra`, med linjen om slutten. */
const eks = (id: string, beskrivelse: string, startdose_mg: number, forventet: string[], valg: Eksempelvalg = {}): Regneeksempel => ({
  id,
  beskrivelse,
  inndata: {
    startdose_mg,
    svar: { [LANG_BEHANDLINGSTID.id]: valg.lang ?? false, [UTENFOR_DOSERAMME_ID]: valg.utenforRamme ?? false, ...valg.svar },
    ...(valg.justert && { justert: valg.justert as Record<string, number> }),
    ...(valg.begrunnelse && { begrunnelse: valg.begrunnelse }),
  },
  forventet: { fra: forventet },
})
const stopp = (id: string, beskrivelse: string, startdose_mg: number, grunn: RegExp, valg: Eksempelvalg = {}): Regneeksempel => ({
  ...eks(id, beskrivelse, startdose_mg, [], valg),
  forventet: {},
  stopp: grunn,
})

/** Legemiddelformene i FEST (kodeverket for legemiddelform) reglene her avgrenser til. */
const FEST_FORM = { dispergerbarTablett: '5', tablett: '53', draper: '748' } as const

/** Stien til de justerbare parametrene i en regel bygd her. */
export const STI = { prosent: 'plan.forlop[0].faser[0].strategi.prosent', dager: 'plan.forlop[0].faser[0].trinnlengde' } as const
/** Trinnstørrelsen ved lang behandlingstid som er kontrollert: høyst 10 %, som ikke krever begrunnelse i noen risikogruppe. */
export const LANG_PROSENT = 10

interface Stoffregel {
  nokkel: string
  /** Virkestoffnavnet i tittel og tekst, med liten forbokstav. */
  navn: string
  /** Raden i Psychiatrienets antidepressivtabell; regelen viser til Stop-oppføringen der. */
  kode: string
  dose: Doser
  /** Risikogruppen for seponeringssymptomer etter RCPsych, med valgene fra fagvurderingen. */
  gruppe: Risikogruppe
  /** Versjonene før fagkontrollen 30.10.2026, når regelen har en annen historikk enn P7-reglene (f.eks. fra pilotsettet). */
  tidligere?: Versjon[]
  /** Unntak for stoffet (kontraindikasjoner og annet) i tillegg til de felles; regelversjonen gir avklaringen. */
  unntak?: (versjon: number) => Unntak[]
  /** Preparatomtalens grenser for startdosen ved pasientgruppe og indikasjon, innenfor høyeste døgndose for voksne (beslutning 7). */
  grenser?: Dosegrense[]
  /** Spørsmål for stoffet som ikke styrer en dosegrense, f.eks. om nedsatt organfunksjon som krever en særskilt vurdering. */
  sporsmal?: Sporsmal[]
  /** Døgndoser som skal fordeles på flere doser (preparatomtalen). */
  fordeling?: Forlop['fordeling']
  /** Versjoner etter substanskontrollen (runde 3) for dette stoffet, i begge variantene. */
  senere?: Versjon[]
  /** Eksempler for den langsomme varianten i tillegg til standardeksempelet. */
  langsomEksempler?: Regneeksempel[]
  kildetro: Utsagn[]
  /** Begrunnelser for valg utover det felles prinsippet. */
  tilpasninger?: Utsagn[]
  forutsetninger?: string[]
  usikkerhet: string[]
  /** Eksemplene med bekreftelsene gitt og alle unntak avkreftet; kontrolleksemplene uten dem legges til av {@link seponeringsregel}. */
  eksempler: Regneeksempel[]
  /** Startdosen og planen i eksempelet for den langsomme varianten (standardvalgene). */
  langsom: { startdose_mg: number; forventet: string[] }
  /**
   * Når kontrolløren har besluttet at stoffet ikke skal ha en beregnbar plan
   * med dagens former (beslutning P7-A): grunnen planen viser, og
   * usikkerheten. Regelen blir da fagtekst ({@link tekstFraStoff}).
   */
  ikkeBeregnbar?: {
    grunn: string
    usikkerhet: string[]
    /** Versjonene etter hovedversjonene; uten dem beslutning P7-A ({@link IKKE_BEREGNBAR_FORM}). */
    etter?: Versjon[]
    /** Kontrollørens beslutning i fagteksten; uten den beslutning P7-A. */
    beslutning?: string
  }
  /** Legemiddelformene (FEST-koder) regelen gjelder, når kontrolløren har sperret andre former. */
  former?: { koder: string[]; tilpasning: Utsagn }
  /**
   * Tilfellene kontrolløren har avgrenset en mulig klinisk godkjenning til
   * (gjennomgangen av 0ae6d07, P7.5): startdosene per legemiddelform (FEST-kode)
   * ved kort og lang behandlingstid i hovedregelen og i den langsomme
   * varianten, og styrkene i FEST per form som er kontrollert (gjennomgangen
   * av d6cc3dd). Uten tilfeller gir regelen aldri en klinisk plan.
   */
  klinisk?: { kort?: Startdoser; lang?: Startdoser; langsom?: Startdoser; styrker: Startdoser; uten_deling?: Utsagn }
  /**
   * Kontrollørens avgrensede kliniske godkjenning av hovedregelen (ikke den
   * langsomme varianten), med fingeravtrykket kontrolløren oppga for
   * nøyaktig den regelversjonen. OUSFAR Dev setter den aldri selv.
   */
  godkjent?: { regelversjon: number; fingeravtrykk: string; avgrensning: string }
}

/** Doser i mg per legemiddelform (FEST-kode): startdosene eller styrkene. */
type Startdoser = Partial<Record<string, number[]>>

/**
 * Det kliniske omfanget av en P7-regel ({@link Kliniskomfang}): tilfellene i
 * `doser`, ved lang behandlingstid med trinnstørrelsen som er kontrollert.
 */
function kliniskOmfang(doser: [Startdoser | undefined, boolean][], versjon: number, klinisk?: Stoffregel['klinisk']): Kliniskomfang {
  return {
    tilfeller: doser.flatMap(([d, lang]) =>
      Object.entries(d ?? {}).map(([legemiddelform, startdoser]) => ({
        legemiddelform,
        startdoser: startdoser!,
        svar: lang ? { [LANG_BEHANDLINGSTID.id]: true } : {},
        ...(lang && { justert: { [STI.prosent]: LANG_PROSENT } }),
        styrker: { fra: klinisk!.styrker[legemiddelform]! },
      })),
    ),
    ...(klinisk?.uten_deling && { uten_deling: { grunnlag: vurdering(klinisk.uten_deling.tekst, klinisk.uten_deling.henvisninger, runde9(versjon, 'omfang')) } }),
    grunnlag: vurdering(
      'Tilfellene er cellene i aksepttesten med FEST (startdose, form, scenario og preparatstyrkene) der en første reduksjon med foretrukket faktisk reduksjon kan gis, slik kontrolløren valgte dem ut; ingen laveste styrke og ingen videreføring er med, og bare svarene nei på stoffets spørsmål om pasientgruppe og indikasjon.',
      [],
      runde9(versjon, 'omfang'),
    ),
  }
}

const FORUTSETNINGER_P7 = [
  'Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.',
  'Beregningen kjenner dosen, om behandlingstiden er lang, om dosen er utenfor rammen for indikasjonen eller pasientgruppen, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.',
]

const fellesUsikkerhet = (horisont: number) => [
  'Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.',
  `Ingen fast nedre grense for beregnede trinn er godkjent (fagkontrollen 30.10.2026): en lav dose kan fortsatt gi betydelig reseptorbinding, og noen trenger svært lave doser før seponering (RCPsych). Planen viser derfor høyst ${horisont} reduksjoner, en teknisk horisont uten dokumentasjon for at akkurat dette antallet er bedre enn et annet, og videre nedtrapping beregnes fra dosen pasienten da faktisk bruker. Hvor langt ned den enkelte trenger å gå, avgjøres individuelt.`,
  'Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.',
  'Regelen har ingen toleranse: hvert trinn avrundes til den viste dosen (to desimaler), og en reduksjon som forsvinner i avrundingen, stopper planen ved trinnet før. Kan et trinn ikke gis nøyaktig med norske preparater, stopper planen også der, men forskriveren kan velge en av de nærmeste dosene som kan gis, med faktisk reduksjon innenfor det foretrukne området, der ingen begrunnelse kreves (bidragsyterens valg, kontrollørens beslutning P7-A 30.10.2026 og gjennomgangen av 9cb420b 31.10.2026). Et avvik som krever begrunnelse, tilbys ikke, og er det eneste som kan gis, er planen et forklarende stopp. Den faktiske reduksjonen kan avvike fra den valgte trinnstørrelsen, og hvor nyttig valget er, avhenger av preparatene: ett trinn som kan gis, er én mulig reduksjon med revurdering, ikke en fullstendig nedtrapping.',
]

/** Spørsmålene stoffet stiller om pasientgruppe, indikasjon og organfunksjon, hvert én gang. */
const stoffsporsmal = (s: Pick<Stoffregel, 'grenser' | 'sporsmal'>): Sporsmal[] => [
  ...new Map([...(s.sporsmal ?? []), ...(s.grenser ?? []).flatMap((g) => (g.ved ? [g.ved.sporsmal] : []))].map((x) => [x.id, x])).values(),
]

/** Det hver beregnbar P7-regel stiller som betingelser: bekreftelsene, unntakene og spørsmålene. */
function betingelser(s: Stoffregel, versjon: number, langsom: boolean) {
  return {
    bekreftelser: [STARTFORSLAG, organfunksjon(versjon), ...(langsom ? [tidligereVurdert(versjon)] : [])],
    unntak: [...(langsom ? [] : [tidligereSymptomer(versjon)]), ...fellesStopp(versjon), ...(s.unntak?.(versjon) ?? [])],
    sporsmal: [LANG_BEHANDLINGSTID, ...stoffsporsmal(s), utenforDoseramme(versjon, s.dose.kilde)],
  }
}

/** Svaret nei på hvert spørsmål, så et eksempel bare oppgir det som avviker. */
const neiPaAlle = (r: Pick<Regel, 'sporsmal'>) => Object.fromEntries((r.sporsmal ?? []).map((x) => [x.id, false]))

/** Svarene og bekreftelsene et eksempel bygger på, så bare det eksempelet sier noe om, avviker. */
function besvart(r: Pick<Regel, 'bekreftelser' | 'unntak' | 'sporsmal'>, e: Regneeksempel): Regneeksempel {
  return {
    ...e,
    inndata: {
      bekreftet: r.bekreftelser.map((b) => b.id),
      pasientforhold: Object.fromEntries(r.unntak.map((u) => [u.id, false])),
      ...e.inndata,
      svar: { ...neiPaAlle(r), ...e.inndata.svar },
      ...(e.inndata.justert && { justert: Object.fromEntries(Object.entries(e.inndata.justert).map(([k, v]) => [STI[k as keyof typeof STI], v])) }),
    },
  }
}

const regexTekst = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Kontrolleksemplene hver beregnbar P7-regel har: hver betingelse som mangler, og hvert unntak som gjelder, stopper beregningen. */
function kontrolleksempler(r: Pick<Regel, 'bekreftelser' | 'unntak' | 'sporsmal'>, start: number): Regneeksempel[] {
  const avkreftet = Object.fromEntries(r.unntak.map((u) => [u.id, false]))
  const bekreftet = r.bekreftelser.map((b) => b.id)
  const svar = neiPaAlle(r)
  const ut: Regneeksempel[] = [
    { id: 'uten-bekreftelse', beskrivelse: 'Uten bekreftelsene stopper beregningen.', inndata: { startdose_mg: start, pasientforhold: avkreftet, svar }, forventet: {}, stopp: /Må bekreftes før beregning: Planen er et startforslag/ },
    {
      id: 'uten-organfunksjon',
      beskrivelse: 'Uten bekreftelse av at organfunksjon og interaksjoner er vurdert, stopper beregningen.',
      inndata: { startdose_mg: start, bekreftet: bekreftet.filter((b) => b !== ORGANFUNKSJON_ID), pasientforhold: avkreftet, svar },
      forventet: {},
      stopp: /Må bekreftes før beregning: Lever- og nyrefunksjon og interaksjoner er vurdert/,
    },
    {
      id: 'uten-behandlingstid',
      beskrivelse: 'Uten svar på om behandlingstiden er lang, stopper beregningen.',
      inndata: { startdose_mg: start, bekreftet, pasientforhold: avkreftet, svar: { [UTENFOR_DOSERAMME_ID]: false } },
      forventet: {},
      stopp: /Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger\?/,
    },
    {
      id: 'utenfor-doseramme-uten-begrunnelse',
      beskrivelse: 'En dose utenfor rammen for indikasjonen eller pasientgruppen krever en begrunnelse; uten den stopper beregningen.',
      inndata: { startdose_mg: start, bekreftet, pasientforhold: avkreftet, svar: { ...svar, [UTENFOR_DOSERAMME_ID]: true } },
      forventet: {},
      stopp: /Svaret ja \(dose utenfor rammen for indikasjon eller pasientgruppe\) krever en skriftlig begrunnelse/,
    },
  ]
  if (r.unntak.some((u) => u.id === TIDLIGERE_SYMPTOMER_ID)) {
    ut.push({
      id: 'tidligere-symptomer',
      beskrivelse: 'Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, men den langsomme varianten.',
      inndata: { startdose_mg: start, bekreftet, pasientforhold: { ...avkreftet, [TIDLIGERE_SYMPTOMER_ID]: true }, svar },
      forventet: {},
      stopp: /Regelen gjelder ikke: Et tidligere forsøk .* da gjelder den langsomme varianten/,
    })
  }
  for (const u of r.unntak.filter((x) => x.id !== TIDLIGERE_SYMPTOMER_ID)) {
    ut.push({
      id: `unntak-${u.id.replace(/_/g, '-')}`,
      beskrivelse: 'Når forholdet gjelder, stopper den ordinære planleggingen.',
      inndata: { startdose_mg: start, bekreftet, pasientforhold: { ...avkreftet, [u.id]: true }, svar },
      forventet: {},
      stopp: new RegExp(`Regelen gjelder ikke: ${regexTekst(u.tekst.slice(0, 40))}`),
    })
  }
  return ut
}

/**
 * Grensetestene for startdosen (beslutning 7): rett over høyeste døgndose for
 * voksne og over hver grense for pasientgruppe og indikasjon, med svaret
 * grensen gjelder ved. En høyeste dose stopper; en forsiktighetsgrense
 * krever begrunnelse.
 */
function grenseeksempler(s: Pick<Stoffregel, 'dose' | 'grenser'>): Regneeksempel[] {
  const over = (x: number) => Math.round((x + 0.01) * 100) / 100
  return [
    stopp('over-hoyeste-dose', `${tall(over(s.dose.hoyest))} mg er over høyeste døgndose for voksne (${tall(s.dose.hoyest)} mg); en begrunnelse kan ikke overstyre det.`, over(s.dose.hoyest), utenfor(over(s.dose.hoyest)), { begrunnelse: BEGRUNNELSE_RAMME }),
    ...(s.grenser ?? []).map((g) => {
      const svar = g.ved ? { [g.ved.sporsmal.id]: g.ved.svar } : {}
      const hvor = g.ved ? ` ved ${(g.ved.svar ? g.ved.sporsmal.ja : g.ved.sporsmal.nei) ?? g.ved.sporsmal.id}` : ''
      const id = `over-${tall(g.hoyest).replace(',', '-')}-mg${g.ved ? `-${g.ved.sporsmal.id.replace(/_/g, '-')}-${g.ved.svar ? 'ja' : 'nei'}` : ''}`
      return g.art === 'maks'
        ? stopp(id, `${tall(over(g.hoyest))} mg er over høyeste dose${hvor} (${tall(g.hoyest)} mg); en begrunnelse kan ikke overstyre det.`, over(g.hoyest), utenfor(over(g.hoyest)), { svar, begrunnelse: BEGRUNNELSE_RAMME })
        : stopp(id, `${tall(over(g.hoyest))} mg er over forsiktighetsgrensen${hvor} (${tall(g.hoyest)} mg) og krever en begrunnelse.`, over(g.hoyest), FORSIKTIGHET, { svar })
    }),
  ]
}

/**
 * Inndatakravene for startdosen: fra dosen pasienten bruker, høyst høyeste
 * døgndose for voksne (den ytre rammen), og innenfor den preparatomtalens
 * grenser for pasientgruppe og indikasjon (beslutning 7).
 */
const startdosekrav = (s: Pick<Stoffregel, 'dose' | 'grenser'>, versjon: number): Inndatakrav[] => [
  {
    navn: 'startdose',
    omrade: [0, s.dose.hoyest],
    art: 'bindende_krav',
    grunnlag: vurdering(
      `Regelen gjelder fra dosen pasienten faktisk bruker, også lave restdoser under det ordinære doseområdet, høyst den høyeste døgndosen preparatomtalen oppgir for voksne (${tall(s.dose.hoyest)} mg). Over den stopper beregningen, og en begrunnelse kan ikke overstyre det. Rammen er ingen automatisk godkjenning for alle: grensene for pasientgruppe og indikasjon gjelder i tillegg, og en dose ellers utenfor rammen krever et ja og en begrunnelse.`,
      [s.dose.kilde],
      runde3(versjon, 'startdose'),
    ),
  },
  ...(s.grenser ?? []).map((g): Inndatakrav => {
    const hvor = g.ved ? ` ved ${(g.ved.svar ? g.ved.sporsmal.ja : g.ved.sporsmal.nei) ?? g.ved.sporsmal.id}` : ''
    return {
      navn: 'startdose',
      omrade: [0, g.hoyest],
      ...(g.ved && { ved: { sporsmal: g.ved.sporsmal.id, svar: g.ved.svar } }),
      ...(g.art === 'forsiktighet'
        ? {
            krever_begrunnelse: true as const,
            art: 'veiledende_preferanse' as const,
            grunnlag: vurdering(
              `Preparatomtalen anbefaler forsiktighet eller en lavere dose over ${tall(g.hoyest)} mg${hvor}; høyere doser er ikke utelukket, men krever en skriftlig begrunnelse, så de ikke står som automatisk godkjent.`,
              [g.henvisning],
              runde3(versjon, 'pasientgruppe'),
            ),
          }
        : { art: 'bindende_krav' as const, grunnlag: { type: 'kilde' as const, henvisninger: [g.henvisning] } }),
    }
  }),
]

const FELLES_KILDETRO = [
  utsagn('Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.', NICE.andel, NICE.tempo),
  utsagn('To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.', RCPSYCH.tid, RCPSYCH.plan),
  utsagn('Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.', NICE.tempo, NICE.alvorlig),
]

const fellesTilpasninger = (horisont: number) => [
  utsagn(
    `Planen går ikke til null og foreslår ingen dato for siste dose. Ingen avslutning (nulltrinn) og ingen fast nedre grense er godkjent (fagkontrollene 29. og 30.10.2026). Planen viser høyst ${horisont} reduksjoner, aldri et trinn under laveste dose formuleringen kan gi, og stopper ved første trinn som ikke kan gis, med mindre forskriveren velger en av de nærmeste dosene som kan gis, med faktisk reduksjon innenfor valgområdet. Der stopper planen av tekniske grunner: pasienten fortsetter med dosen til forskriveren har vurdert videre nedtrapping, og dosen er ikke nødvendigvis en sluttdose. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.`,
    RCPSYCH.lavDose,
  ),
  ...STARTDOSE_TILPASNINGER,
]

/** Startdosen og hvem regelen gjelder for (beslutning 7), felles for alle beregnbare P7-regler. */
const STARTDOSE_TILPASNINGER = [
  utsagn(
    'Regelen gjelder fra dosen pasienten faktisk bruker, opp til høyeste døgndose for voksne i preparatomtalen; over den stopper beregningen, og en begrunnelse kan ikke overstyre det. Innenfor den gjelder preparatomtalens grenser for eldre, indikasjoner og nedsatt organfunksjon: en uttrykkelig høyeste dose stopper, en forsiktighetsgrense krever begrunnelse. En dose ellers utenfor rammen krever et ja og en begrunnelse, og organfunksjon og interaksjoner må være vurdert for alle stoffer.',
  ),
  utsagn('Under 18 år, ved akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon eller behov for rask seponering, ved ustabil dose, uregelmessig inntak eller bytte, og ved kontraindikasjoner stopper den ordinære planleggingen; nedtrappingen må da planlegges individuelt.'),
]

/** Versjonene av hovedregelen for stoffet til og med bidragsyterens valg om tilgjengelige doser. */
const hovedversjoner = (s: Stoffregel) => [...(s.tidligere ?? [UTKAST, KONTROLL_1, KONTROLL_2, KONTROLL_3]), KONTROLL_4, KONTROLL_5, ...(s.senere ?? []), VALG_AV_DOSE]

function seponeringsregel(s: Stoffregel, langsom = false): Regel {
  const versjoner = langsom
    ? [NY_ETTER_RUNDE_2(`langsom variant for ${s.navn} etter tidligere seponeringssymptomer.`), KONTROLL_5, ...(s.senere ?? []), VALG_AV_DOSE, KONTROLL_6, KONTROLL_7, KONTROLL_8, KONTROLL_9]
    : [...hovedversjoner(s), KONTROLL_6, KONTROLL_7, KONTROLL_8, KONTROLL_9]
  const versjon = versjoner.length
  const gruppe = langsom ? LANGSOM : s.gruppe
  const avklaring = langsom ? runde2(versjon, 'langsom') : beslutning1(versjon)
  const strat = strategi(s.dose, gruppe, avklaring, versjon)
  const trinnlengde = dagerPerTrinn(gruppe, avklaring)
  const virkestoff = { type: 'virkestoff' as const, nokkel: s.nokkel }
  const vilkar = betingelser(s, versjon, langsom)
  const eksempler = langsom
    ? [
        eks(`fra-${tall(s.langsom.startdose_mg).replace(',', '-')}-mg`, `Fra ${tall(s.langsom.startdose_mg)} mg med standardvalgene: 5 % per trinn, minst 28 dager.`, s.langsom.startdose_mg, s.langsom.forventet),
        stopp('over-5-prosent', 'Mer enn 5 % per trinn er utenfor den langsomme varianten.', s.langsom.startdose_mg, /Reduksjon per trinn \(% av aktuell dose\): 10 % er utenfor det regelen tillater \(1–5 %\)/, { justert: { prosent: 10 } }),
        ...(s.langsomEksempler ?? []),
      ]
    : s.eksempler
  const start = langsom ? s.langsom.startdose_mg : s.eksempler.find((e) => !e.stopp)!.inndata.startdose_mg
  return {
    id: `seponering-${s.nokkel}${langsom ? '-langsom' : ''}`,
    versjon,
    tittel: `Seponering av ${s.navn}, ${gruppe.tittel}`,
    fra: virkestoff,
    til: null,
    plan: {
      form: 'seponering',
      forlop: [
        {
          id: 'fra',
          virkestoff,
          administrasjon: 'peroral',
          ...(s.former && { legemiddelformer: s.former.koder }),
          ...(s.fordeling && { fordeling: s.fordeling }),
          utgangsdose: 'startdose',
          start: { type: 'dag', dag: 1 },
          faser: [{ type: 'nedtrapping', strategi: strat, trinnlengde, avslutning: 'individuell', horisont: horisont(versjon, langsom), trinnvalg: trinnvalg(versjon) }],
        },
      ],
    },
    inndata: startdosekrav(s, versjon),
    ...vilkar,
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [...s.kildetro, ...FELLES_KILDETRO],
      tilpasninger: [
        utsagn(valgtekst(strat, trinnlengde, langsom ? PLANHORISONT_LANGSOM : PLANHORISONT_TRINN), NICE.andel, RCPSYCH.tid),
        langsom
          ? utsagn(
              'Varianten gjelder når et tidligere forsøk har gitt seponeringssymptomer: 1–5 % per trinn (standard 5 %) og minst 28 dager, og dosene må kunne gis. Forskriveren må vurdere og bekrefte at de tidligere symptomene virkelig var seponeringssymptomer.',
              NICE.tidligere,
              RCPSYCH.langvarig,
            )
          : utsagn(
              'Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder den langsomme varianten.',
              NICE.tempo,
              NICE.tidligere,
              RCPSYCH.langvarig,
            ),
        ...fellesTilpasninger(langsom ? PLANHORISONT_LANGSOM : PLANHORISONT_TRINN),
        ...(s.tilpasninger ?? []),
        ...(s.former ? [s.former.tilpasning] : []),
      ],
      forutsetninger: [...FORUTSETNINGER_FELLES, ...FORUTSETNINGER_P7, ...(s.forutsetninger ?? [])],
      usikkerhet: [...fellesUsikkerhet(langsom ? PLANHORISONT_LANGSOM : PLANHORISONT_TRINN), ...s.usikkerhet],
    },
    referanser: [pn(`SwitchAntidepressants:${s.kode}>Stop`)],
    eksempler: [...[...eksempler, ...grenseeksempler(s)].map((e) => besvart(vilkar, e)), ...kontrolleksempler(vilkar, start)],
    klinisk_omfang: kliniskOmfang(langsom ? [[s.klinisk?.langsom, false]] : [[s.klinisk?.kort, false], [s.klinisk?.lang, true]], versjon, s.klinisk),
    godkjenning:
      s.godkjent && !langsom
        ? { status: 'klinisk_godkjent', historikk: [...historikk(versjoner), klinisk(s.godkjent.regelversjon, s.godkjent.fingeravtrykk, s.godkjent.avgrensning, GJENNOMGANG_F77E1A9)] }
        : { status: 'til_faglig_kontroll', historikk: historikk(versjoner) },
  }
}

/** Et stoff med det regelen bygges av; selve regelen lages i {@link seponeringsregel}. */
const stoff = (s: Stoffregel) => s

const utenfor = (mg: number) => new RegExp(`Startdosen ${tall(mg)} mg er utenfor`)
const KREVER_BEGRUNNELSE = /krever en skriftlig begrunnelse fra forskriveren/
const FORSIKTIGHET = /er over forsiktighetsgrensen .* og krever en skriftlig begrunnelse/

/** Syntetisk begrunnelse i eksemplene; aldri pasientopplysninger. */
const BEGRUNNELSE = 'Kort behandlingstid (åtte uker) og ingen tidligere seponeringssymptomer; pasienten ønsker raskere nedtrapping.'
const BEGRUNNELSE_RAMME = 'Dosen er vurdert særskilt for pasientgruppen; syntetisk eksempel.'

/* --- Spørsmål og grenser for pasientgrupper (beslutning 7) ------------------------------ */

const eldreOver65 = (henvisning: Kildehenvisning) => sporsmal('eldre', 'Er pasienten over 65 år?', 'eldre over 65 år', henvisning)
const nedsattLever = (henvisning: Kildehenvisning) =>
  sporsmal('nedsatt_leverfunksjon', 'Har pasienten nedsatt leverfunksjon?', 'nedsatt leverfunksjon, som krever en særskilt vurdering', henvisning, { krever_begrunnelse: true })
const maks = (hoyest: number, henvisning: Kildehenvisning, ved?: Dosegrense['ved']): Dosegrense => ({ hoyest, art: 'maks', henvisning, ...(ved && { ved }) })
const forsiktig = (hoyest: number, henvisning: Kildehenvisning, ved?: Dosegrense['ved']): Dosegrense => ({ hoyest, art: 'forsiktighet', henvisning, ...(ved && { ved }) })
const ja = (sporsmal: Sporsmal) => ({ sporsmal, svar: true })
const nei = (sporsmal: Sporsmal) => ({ sporsmal, svar: false })

const qtKontraindikasjon = (henvisning: Kildehenvisning) => (v: number) => [
  kontraindikasjon(v, 'qt_forlengelse', 'Pasienten har kjent QT-forlengelse eller medfødt langt QT-syndrom, eller bruker et annet legemiddel som forlenger QT-intervallet.', henvisning),
]

const CITALOPRAM_ELDRE = eldreOver65(P7.cipramilEldre)
const CITALOPRAM_LEVER = nedsattLever(P7.cipramilLever)
const ESCITALOPRAM_ELDRE = eldreOver65(P7.cipralexEldre)
const ESCITALOPRAM_LEVER = nedsattLever(P7.cipralexLever)
const ESCITALOPRAM_CYP = sporsmal('langsom_cyp2c19', 'Er pasienten kjent langsom metaboliserer av CYP2C19?', 'kjent langsom CYP2C19-metaboliserer', P7.cipralexCyp2c19)
const PAROKSETIN_ELDRE = sporsmal('eldre', 'Er pasienten eldre? Preparatomtalen angir ingen bestemt aldersgrense.', 'eldre', P7.seroxatEldre)
const PAROKSETIN_INDIKASJON = sporsmal('tvangslidelse_panikklidelse', 'Brukes paroksetin mot tvangslidelse eller panikklidelse?', 'tvangslidelse eller panikklidelse', P7.seroxatIndikasjon, {
  nei: 'depresjon, sosial angstlidelse, generalisert angstlidelse eller posttraumatisk stresslidelse',
})
const PAROKSETIN_ORGAN = sporsmal('nedsatt_nyre_lever', 'Har pasienten kreatininclearance under 30 ml/min eller nedsatt leverfunksjon?', 'alvorlig nedsatt nyrefunksjon eller nedsatt leverfunksjon, som krever en særskilt vurdering', P7.seroxatOrgan, { krever_begrunnelse: true })
const VORTIOKSETIN_ELDRE = sporsmal('eldre', 'Er pasienten 65 år eller eldre?', '65 år eller eldre', P7.brintellixEldre)
const AMITRIPTYLIN_SMERTE = sporsmal('smerte_migrene', 'Brukes amitriptylin mot nevropatisk smerte, kronisk spenningshodepine eller migreneprofylakse?', 'nevropatisk smerte, kronisk spenningshodepine eller migreneprofylakse', P7.sarotexSmerte)
const AMITRIPTYLIN_ELDRE = sporsmal('eldre_hjerte', 'Er pasienten over 65 år eller har hjerte- og karsykdom?', 'eldre over 65 år eller hjerte- og karsykdom', P7.sarotexEldre)
const KLOMIPRAMIN_INDIKASJON = sporsmal('depresjon_tvang', 'Brukes klomipramin mot depresjon eller tvangstilstander?', 'depresjon eller tvangstilstander', P7.anafranilIndikasjon, { nei: 'panikklidelse eller narkolepsi' })
const NORTRIPTYLIN_ELDRE = sporsmal('eldre', 'Er pasienten eldre? Preparatomtalen angir ingen bestemt aldersgrense.', 'eldre', P7.noritrenDose)

/** Kardiovaskulær risiko, antikolinerge effekter og interaksjoner for de trisykliske (substanskontrollen 30.10.2026). */
const TRISYKLISK = 'Kardiovaskulær risiko (blant annet QT-forlengelse og arytmier), antikolinerge effekter og interaksjoner må vurderes særskilt; bekreftelsen om organfunksjon og interaksjoner omfatter dette.'

/* --- Reglene ------------------------------------------------------------------------ */

const citalopram = stoff({
  nokkel: 'citalopram',
  navn: 'citalopram',
  kode: 'Ci',
  dose: { lavest: 10, hoyest: 40, kilde: SPC.cipramilDose },
  gruppe: MIDDELS,
  grenser: [maks(20, P7.cipramilEldre, ja(CITALOPRAM_ELDRE)), maks(20, P7.cipramilLever, ja(CITALOPRAM_LEVER))],
  unntak: qtKontraindikasjon(P7.cipramilQt),
  kildetro: [
    utsagn('Citalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.', SPC.cipramilSeponering),
    utsagn('Hos eldre over 65 år og ved mild eller moderat nedsatt leverfunksjon er høyeste dose 20 mg daglig; ved alvorlig nedsatt leverfunksjon kreves særlig forsiktighet.', P7.cipramilEldre, P7.cipramilLever),
  ],
  usikkerhet: ['Trinnene under 10 mg krever deling av 10 mg, som FEST ikke oppgir som delbar, eller flytende form; uten det stopper planen ved trinnet før.'],
  ikkeBeregnbar: {
    grunn:
      'Med citalopramtablettene i FEST kan den foretrukne reduksjonen fra vanlig dose (20 mg) ikke gis, verken ved kort eller lang behandlingstid; den eneste dosen som kan gis ved første trinn, 10 mg, er en halvering (50 %), et avvik og ikke et faglig akseptert standardtrinn. Regelen beregner ingen trinn.',
    beslutning:
      'Kontrolløren besluttet derfor 31.10.2026 (gjennomgangen av 9cb420b, P7.5) at citalopram foreløpig ikke skal aktiveres som klinisk beregnbar regel; en halvering skal ikke velges bare fordi tablettene ikke tillater et mindre trinn. Regelen står som fagtekst til en dokumentert formulering og en ny substansspesifikk kontroll foreligger.',
    usikkerhet: [
      'Ingen formulering i FEST gir dosene trinnene krever fra vanlig dose; 20 → 10 mg er ikke et faglig akseptert standardtrinn, heller ikke etter lang behandlingstid.',
      'En plan med større trinn kan vurderes individuelt av forskriveren utenfor verktøyet, men er ikke godkjent av regelen.',
    ],
    etter: [KONTROLL_6, CITALOPRAM_FAGTEKST],
  },
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg med standardvalgene: 25 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 20, [
      'dag 1–28: 15 mg',
      'dag 29–56: 11,25 mg',
      'dag 57–84: 8,44 mg',
      'dag 85–112: 6,33 mg',
      'dag 113–140: 4,75 mg',
      'dag 141–168: 3,56 mg',
      'dag 169–196: 2,67 mg',
      'dag 197–224: 2 mg',
      'dag 225–252: 1,5 mg',
      'dag 253–280: 1,13 mg',
      'dag 281–308: 0,85 mg',
      'fra dag 309: 0,64 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
    eks('fra-20-mg-lang', 'Fra 20 mg etter lang behandlingstid: forslaget er da 10 % per trinn, og ingen begrunnelse trengs.', 20, [
      'dag 1–28: 18 mg',
      'dag 29–56: 16,2 mg',
      'dag 57–84: 14,58 mg',
      'dag 85–112: 13,12 mg',
      'dag 113–140: 11,81 mg',
      'dag 141–168: 10,63 mg',
      'dag 169–196: 9,57 mg',
      'dag 197–224: 8,61 mg',
      'dag 225–252: 7,75 mg',
      'dag 253–280: 6,98 mg',
      'dag 281–308: 6,28 mg',
      'fra dag 309: 5,65 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { lang: true }),
    stopp('lang-25-uten-begrunnelse', 'Etter lang behandlingstid er 25 % et avvik fra forslaget på 10 % og krever en begrunnelse.', 20, KREVER_BEGRUNNELSE, { lang: true, justert: { prosent: 25 } }),
    eks('fra-20-mg-50-begrunnet', 'Fra 20 mg med 50 % per trinn og begrunnelse: 10 mg, så høyst 25 % fra laveste døgndose.', 20, [
      'dag 1–28: 10 mg',
      'dag 29–56: 7,5 mg',
      'dag 57–84: 5,63 mg',
      'dag 85–112: 4,22 mg',
      'dag 113–140: 3,17 mg',
      'dag 141–168: 2,38 mg',
      'dag 169–196: 1,79 mg',
      'dag 197–224: 1,34 mg',
      'dag 225–252: 1,01 mg',
      'dag 253–280: 0,76 mg',
      'dag 281–308: 0,57 mg',
      'fra dag 309: 0,43 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { justert: { prosent: 50 }, begrunnelse: BEGRUNNELSE }),
    stopp('50-uten-begrunnelse', '50 % (over 25 %) uten begrunnelse stopper.', 20, KREVER_BEGRUNNELSE, { justert: { prosent: 50 } }),
    eks(
      'fra-2-5-mg-5-prosent',
      'Fra 2,5 mg med 5 % per trinn: ingen nedre grense stopper trinnene (fra 2,5 til omtrent 1 mg er det rundt 18 slike trinn); planen viser 12 reduksjoner, den tekniske horisonten, og regnes på nytt fra dosen pasienten da bruker.',
      2.5,
      [
        'dag 1–28: 2,38 mg',
        'dag 29–56: 2,26 mg',
        'dag 57–84: 2,15 mg',
        'dag 85–112: 2,04 mg',
        'dag 113–140: 1,94 mg',
        'dag 141–168: 1,84 mg',
        'dag 169–196: 1,75 mg',
        'dag 197–224: 1,66 mg',
        'dag 225–252: 1,58 mg',
        'dag 253–280: 1,5 mg',
        'dag 281–308: 1,43 mg',
        'fra dag 309: 1,36 mg',
        'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
      ],
      { justert: { prosent: 5 } },
    ),
    eks('utenfor-doseramme-begrunnet', 'En dose utenfor rammen for indikasjonen eller pasientgruppen gir planen med et ja og en begrunnelse, og begrunnelsen står som kontroll.', 20, [
      'dag 1–28: 15 mg',
      'dag 29–56: 11,25 mg',
      'dag 57–84: 8,44 mg',
      'dag 85–112: 6,33 mg',
      'dag 113–140: 4,75 mg',
      'dag 141–168: 3,56 mg',
      'dag 169–196: 2,67 mg',
      'dag 197–224: 2 mg',
      'dag 225–252: 1,5 mg',
      'dag 253–280: 1,13 mg',
      'dag 281–308: 0,85 mg',
      'fra dag 309: 0,64 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], {
      utenforRamme: true,
      begrunnelse: BEGRUNNELSE_RAMME,
    }),
  ],
  langsom: { startdose_mg: 20, forventet: [
    'dag 1–28: 19 mg',
    'dag 29–56: 18,05 mg',
    'dag 57–84: 17,15 mg',
    'dag 85–112: 16,29 mg',
    'dag 113–140: 15,48 mg',
    'fra dag 141: 14,71 mg',
    'teknisk planhorisont: 6 reduksjoner; avslutning vurderes individuelt',
  ] },
  langsomEksempler: [
    eks('fra-0-55-mg-1-prosent', 'Fra 0,55 mg med 1 % per trinn: hvert trinn avrundes til den viste dosen, og når neste reduksjon forsvinner i avrundingen (0,5 × 0,99 = 0,495, vist som 0,5 mg), stopper planen ved dosen før.', 0.55, [
      'dag 1–28: 0,54 mg',
      'dag 29–56: 0,53 mg',
      'dag 57–84: 0,52 mg',
      'dag 85–112: 0,51 mg',
      'fra dag 113: 0,5 mg',
      'neste reduksjon forsvinner i avrundingen; avslutning vurderes individuelt',
    ], { justert: { prosent: 1 } }),
    stopp('fra-0-5-mg-1-prosent', 'Fra 0,5 mg med 1 % per trinn forsvinner første reduksjon i avrundingen: planen har ingen trinn, og beregningen sier hvorfor.', 0.5, /blir første reduksjon \(til 0,495 mg\) borte/, { justert: { prosent: 1 } }),
  ],
})

const escitalopram = stoff({
  nokkel: 'escitalopram',
  navn: 'escitalopram',
  kode: 'Es',
  dose: { lavest: 5, hoyest: 20, kilde: SPC.cipralexDose },
  gruppe: MIDDELS,
  grenser: [maks(10, P7.cipralexEldre, ja(ESCITALOPRAM_ELDRE)), maks(10, P7.cipralexLever, ja(ESCITALOPRAM_LEVER)), maks(10, P7.cipralexCyp2c19, ja(ESCITALOPRAM_CYP))],
  unntak: qtKontraindikasjon(P7.cipralexQt),
  tidligere: [
    { merknad: 'Utkast til pilotregel (P4.7).' },
    { merknad: 'Kildegrunnlaget for trinnlengden rettet etter kontrollen av P7 (PR #286): NICEs én til to uker gjelder fluoksetin, så forslaget bygger på RCPsychs to til fire uker.' },
    { merknad: 'Flyttet fra pilotsettet (P4) til nedtrappingsreglene (P7), så escitalopram følger det samme prinsippet som de andre antidepressivene.', dato: RUNDE_1 },
    KONTROLL_3,
  ],
  klinisk: {
    kort: { [FEST_FORM.tablett]: [20], [FEST_FORM.draper]: [10, 20] },
    lang: { [FEST_FORM.draper]: [10, 20] },
    langsom: { [FEST_FORM.draper]: [20] },
    styrker: { [FEST_FORM.tablett]: [5, 10, 20], [FEST_FORM.draper]: [1] },
  },
  kildetro: [
    utsagn('Escitalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.', SPC.cipralexSeponering),
    utsagn('Hos eldre over 65 år, ved mild eller moderat nedsatt leverfunksjon og hos kjente langsomme CYP2C19-metaboliserere er høyeste dose 10 mg daglig.', P7.cipralexEldre, P7.cipralexLever, P7.cipralexCyp2c19),
  ],
  tilpasninger: [utsagn('Pilotregelens sluttdose på 2,5 mg er fjernet; fagkontrollene 29. og 30.10.2026 avviste både den og en fast nedre grense.', SPC.cipralexDose)],
  usikkerhet: [
    'Doser under 5 mg krever dråper (1 mg per dråpe i FEST) eller deling. Hele dråper gir bare hele milligram, og avrunding til hele dråper er ingen toleranse: et trinn som ikke kan gis nøyaktig, stopper planen ved trinnet før.',
  ],
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg med standardvalgene: 25 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 20, [
      'dag 1–28: 15 mg',
      'dag 29–56: 11,25 mg',
      'dag 57–84: 8,44 mg',
      'dag 85–112: 6,33 mg',
      'dag 113–140: 4,75 mg',
      'dag 141–168: 3,56 mg',
      'dag 169–196: 2,67 mg',
      'dag 197–224: 2 mg',
      'dag 225–252: 1,5 mg',
      'dag 253–280: 1,13 mg',
      'dag 281–308: 0,85 mg',
      'fra dag 309: 0,64 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
    eks('fra-10-mg-lang', 'Fra 10 mg etter lang behandlingstid med 10 % per trinn.', 10, [
      'dag 1–28: 9 mg',
      'dag 29–56: 8,1 mg',
      'dag 57–84: 7,29 mg',
      'dag 85–112: 6,56 mg',
      'dag 113–140: 5,9 mg',
      'dag 141–168: 5,31 mg',
      'dag 169–196: 4,78 mg',
      'dag 197–224: 4,3 mg',
      'dag 225–252: 3,87 mg',
      'dag 253–280: 3,48 mg',
      'dag 281–308: 3,13 mg',
      'fra dag 309: 2,82 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { lang: true, justert: { prosent: 10 } }),
  ],
  langsom: { startdose_mg: 10, forventet: [
    'dag 1–28: 9,5 mg',
    'dag 29–56: 9,03 mg',
    'dag 57–84: 8,58 mg',
    'dag 85–112: 8,15 mg',
    'dag 113–140: 7,74 mg',
    'fra dag 141: 7,35 mg',
    'teknisk planhorisont: 6 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const sertralin = stoff({
  nokkel: 'sertralin',
  navn: 'sertralin',
  kode: 'Se',
  dose: { lavest: 25, hoyest: 200, kilde: SPC.zoloftDose },
  gruppe: MIDDELS,
  klinisk: { kort: { [FEST_FORM.tablett]: [100, 200] }, styrker: { [FEST_FORM.tablett]: [25, 50, 100] } },
  kildetro: [utsagn('Sertralin trappes ned gradvis over minst én til to uker; noen trenger flere uker eller måneder.', SPC.zoloftSeponering)],
  usikkerhet: [
    'Trinnene under 25 mg kan ikke gis med hele tabletter på 25, 50 og 100 mg. Konsentratet til mikstur (20 mg/ml) brukes ikke før doseringen per ml og måleoppløsningen er dokumentert og nøyaktigheten kontrollert (P5).',
  ],
  eksempler: [
    eks('fra-100-mg', 'Fra 100 mg med standardvalgene: 25 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 100, [
      'dag 1–28: 75 mg',
      'dag 29–56: 56,25 mg',
      'dag 57–84: 42,19 mg',
      'dag 85–112: 31,64 mg',
      'dag 113–140: 23,73 mg',
      'dag 141–168: 17,8 mg',
      'dag 169–196: 13,35 mg',
      'dag 197–224: 10,01 mg',
      'dag 225–252: 7,51 mg',
      'dag 253–280: 5,63 mg',
      'dag 281–308: 4,22 mg',
      'fra dag 309: 3,17 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
    eks('fra-50-mg-lang', 'Fra 50 mg etter lang behandlingstid med 10 % per trinn og 28 dager.', 50, [
      'dag 1–28: 45 mg',
      'dag 29–56: 40,5 mg',
      'dag 57–84: 36,45 mg',
      'dag 85–112: 32,81 mg',
      'dag 113–140: 29,53 mg',
      'dag 141–168: 26,58 mg',
      'dag 169–196: 23,92 mg',
      'dag 197–224: 21,53 mg',
      'dag 225–252: 19,38 mg',
      'dag 253–280: 17,44 mg',
      'dag 281–308: 15,7 mg',
      'fra dag 309: 14,13 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { lang: true, justert: { prosent: 10 } }),
    stopp('lang-14-dager-uten-begrunnelse', 'Etter lang behandlingstid krever 14 dager per trinn (under 28) en begrunnelse.', 50, KREVER_BEGRUNNELSE, { lang: true, justert: { prosent: 10, dager: 14 } }),
    eks('fra-50-mg-kort-14-dager', 'Fra 50 mg etter kort behandlingstid med 14 dager per trinn: ingen begrunnelse trengs.', 50, [
      'dag 1–14: 37,5 mg',
      'dag 15–28: 28,13 mg',
      'dag 29–42: 21,1 mg',
      'dag 43–56: 15,83 mg',
      'dag 57–70: 11,87 mg',
      'dag 71–84: 8,9 mg',
      'dag 85–98: 6,68 mg',
      'dag 99–112: 5,01 mg',
      'dag 113–126: 3,76 mg',
      'dag 127–140: 2,82 mg',
      'dag 141–154: 2,12 mg',
      'fra dag 155: 1,59 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { justert: { dager: 14 } }),
    eks('fra-12-5-mg', 'Lav restdose under ordinært doseområde: 25 % per trinn, uten nedre grense.', 12.5, [
      'dag 1–28: 9,38 mg',
      'dag 29–56: 7,04 mg',
      'dag 57–84: 5,28 mg',
      'dag 85–112: 3,96 mg',
      'dag 113–140: 2,97 mg',
      'dag 141–168: 2,23 mg',
      'dag 169–196: 1,67 mg',
      'dag 197–224: 1,25 mg',
      'dag 225–252: 0,94 mg',
      'dag 253–280: 0,71 mg',
      'dag 281–308: 0,53 mg',
      'fra dag 309: 0,4 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
  ],
  langsom: { startdose_mg: 50, forventet: [
    'dag 1–28: 47,5 mg',
    'dag 29–56: 45,13 mg',
    'dag 57–84: 42,87 mg',
    'dag 85–112: 40,73 mg',
    'dag 113–140: 38,69 mg',
    'fra dag 141: 36,76 mg',
    'teknisk planhorisont: 6 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const fluoksetin = stoff({
  nokkel: 'fluoksetin',
  navn: 'fluoksetin',
  kode: 'Fo',
  dose: { lavest: 20, hoyest: 60, kilde: SPC.fluoksetinDose },
  gruppe: FLUOKSETIN,
  klinisk: { kort: { [FEST_FORM.dispergerbarTablett]: [40, 60], [FEST_FORM.tablett]: [40, 60] }, styrker: { [FEST_FORM.dispergerbarTablett]: [20], [FEST_FORM.tablett]: [20] } },
  kildetro: [
    utsagn('Fluoksetin trappes ned gradvis over minst én til to uker; aktivt stoff finnes i kroppen i flere uker etter seponering.', SPC.fluoksetinSeponering),
    utsagn('Ved 20 mg daglig kan dosering annenhver dag være en egnet reduksjon; ved 40–60 mg brukes gradvis nedtrapping.', NICE.fluoksetin),
    utsagn('Seponeringssymptomer kan komme dager til uker etter en reduksjon; det er best å vente minst fire uker før neste.', RCPSYCH.fluoksetin),
  ],
  tilpasninger: [
    utsagn(
      'Fluoksetin har ikke mindre trinn ved lav dose, i motsetning til de andre reglene med middels risiko: den lange virketiden gir et gradvis fall i konsentrasjonen etter hvert trinn. Fagkontrollen 30.10.2026 beholdt denne særregelen.',
      SPC.fluoksetinSeponering,
      NICE.fluoksetin,
    ),
    utsagn('Trinnene varer minst 28 dager og kan forlenges så lenge det trengs for å fange opp sene seponeringssymptomer, men ikke kortes ned.', RCPSYCH.fluoksetin),
    utsagn('Ved 20 mg daglig kan forskriveren i stedet velge dosering annenhver dag, en egen regel. Om 5 mg brukes som et frivillig punkt for å vurdere avslutningen, avgjør forskriveren; det er ingen sperre i regelen.', NICE.fluoksetin),
  ],
  usikkerhet: ['Doser under 10 mg krever flytende form eller deling i fire; finnes det ikke, stopper planen ved trinnet før.'],
  former: {
    koder: [FEST_FORM.dispergerbarTablett, FEST_FORM.tablett],
    tilpasning: utsagn(
      'Regelen gjelder bare tablettene og de dispergerbare tablettene. Med de harde kapslene kunne ingen dose med foretrukket reduksjon gis i noen av de testede situasjonene; kontrolløren besluttet 31.10.2026 (gjennomgangen av 9cb420b, P7.5) at kapslene foreløpig ikke skal aktiveres i en beregnbar regel. Velges kapslene, stopper planen.',
      SPC.fluoksetinDose,
    ),
  },
  eksempler: [
    eks('fra-40-mg', 'Fra 40 mg med standardvalgene: 25 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 40, [
      'dag 1–28: 30 mg',
      'dag 29–56: 22,5 mg',
      'dag 57–84: 16,88 mg',
      'dag 85–112: 12,66 mg',
      'dag 113–140: 9,5 mg',
      'dag 141–168: 7,13 mg',
      'dag 169–196: 5,35 mg',
      'dag 197–224: 4,01 mg',
      'dag 225–252: 3,01 mg',
      'dag 253–280: 2,26 mg',
      'dag 281–308: 1,7 mg',
      'fra dag 309: 1,28 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
    eks('fra-20-mg-42-dager', 'Fra 20 mg med 42 dager per trinn, så sene seponeringssymptomer kan fanges opp før neste reduksjon.', 20, [
      'dag 1–42: 15 mg',
      'dag 43–84: 11,25 mg',
      'dag 85–126: 8,44 mg',
      'dag 127–168: 6,33 mg',
      'dag 169–210: 4,75 mg',
      'dag 211–252: 3,56 mg',
      'dag 253–294: 2,67 mg',
      'dag 295–336: 2 mg',
      'dag 337–378: 1,5 mg',
      'dag 379–420: 1,13 mg',
      'dag 421–462: 0,85 mg',
      'fra dag 463: 0,64 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { justert: { dager: 42 } }),
    eks('fra-20-mg-50-begrunnet', 'Fra 20 mg med 50 % per trinn og begrunnelse: ingen mindre trinn ved lav dose.', 20, [
      'dag 1–28: 10 mg',
      'dag 29–56: 5 mg',
      'dag 57–84: 2,5 mg',
      'dag 85–112: 1,25 mg',
      'dag 113–140: 0,63 mg',
      'dag 141–168: 0,32 mg',
      'dag 169–196: 0,16 mg',
      'dag 197–224: 0,08 mg',
      'dag 225–252: 0,04 mg',
      'dag 253–280: 0,02 mg',
      'fra dag 281: 0,01 mg',
      'neste reduksjon forsvinner i avrundingen; avslutning vurderes individuelt',
    ], { justert: { prosent: 50 }, begrunnelse: BEGRUNNELSE }),
    stopp('fra-20-mg-14-dager', 'Kortere trinn enn 28 dager er utenfor regelen.', 20, /Minste antall dager per trinn: 14 dager er utenfor det regelen tillater/, { justert: { dager: 14 } }),
  ],
  langsom: { startdose_mg: 20, forventet: [
    'dag 1–28: 19 mg',
    'dag 29–56: 18,05 mg',
    'dag 57–84: 17,15 mg',
    'dag 85–112: 16,29 mg',
    'dag 113–140: 15,48 mg',
    'fra dag 141: 14,71 mg',
    'teknisk planhorisont: 6 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const fluvoksamin = stoff({
  nokkel: 'fluvoksamin',
  navn: 'fluvoksamin',
  kode: 'Fv',
  dose: { lavest: 50, hoyest: 300, kilde: P7.fevarinDose },
  gruppe: MIDDELS,
  fordeling: { over_mg: kilde(150, 'mg', 'bindende_krav', P7.fevarinFordeling), antall: [2, 3], grunnlag: { type: 'kilde', henvisninger: [P7.fevarinFordeling] } },
  senere: [LIKE_STORE_DOSER],
  klinisk: { kort: { [FEST_FORM.tablett]: [100, 300] }, styrker: { [FEST_FORM.tablett]: [50, 100] } },
  kildetro: [
    utsagn('Fluvoksamin trappes ned gradvis over minst én til to uker, ikke seponeres brått.', P7.fevarinSeponering),
    utsagn('Opptil 150 mg kan gis som én dose; en døgndose over 150 mg fordeles på 2 eller 3 doser.', P7.fevarinFordeling),
  ],
  tilpasninger: [
    utsagn(
      'Døgndoser over 150 mg vises fordelt på 2 eller 3 doser, hver høyst 150 mg, med den jevneste fordelingen som kan gis; doseplanen kontrollerer at hver dose kan gis nøyaktig med tablettene og stopper ellers ved trinnet før. En riktig døgndose er ikke nok når fordelingen ikke kan gis. Like store doser kreves ikke, fordi preparatomtalen ikke krever det, men en ulik fordeling merkes i planen (kontrollørens beslutning P7-B 30.10.2026).',
      P7.fevarinFordeling,
    ),
  ],
  usikkerhet: [],
  eksempler: [
    eks('fra-100-mg', 'Fra 100 mg med standardvalgene, til den tekniske planhorisonten.', 100, [
    'dag 1–28: 75 mg',
    'dag 29–56: 56,25 mg',
    'dag 57–84: 42,19 mg',
    'dag 85–112: 31,64 mg',
    'dag 113–140: 23,73 mg',
    'dag 141–168: 17,8 mg',
    'dag 169–196: 13,35 mg',
    'dag 197–224: 10,01 mg',
    'dag 225–252: 7,51 mg',
    'dag 253–280: 5,63 mg',
    'dag 281–308: 4,22 mg',
    'fra dag 309: 3,17 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ]),
    eks('fra-300-mg', 'Fra 300 mg: døgndoser over 150 mg vises fordelt på 2 eller 3 doser, hver høyst 150 mg.', 300, [
      'dag 1–28: 225 mg, fordelt på 2 eller 3 doser',
      'dag 29–56: 168,75 mg, fordelt på 2 eller 3 doser',
      'dag 57–84: 126,56 mg',
      'dag 85–112: 94,92 mg',
      'dag 113–140: 71,19 mg',
      'dag 141–168: 53,39 mg',
      'dag 169–196: 40,04 mg',
      'dag 197–224: 30,03 mg',
      'dag 225–252: 22,52 mg',
      'dag 253–280: 16,89 mg',
      'dag 281–308: 12,67 mg',
      'fra dag 309: 9,5 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
  ],
  langsom: { startdose_mg: 100, forventet: [
    'dag 1–28: 95 mg',
    'dag 29–56: 90,25 mg',
    'dag 57–84: 85,74 mg',
    'dag 85–112: 81,45 mg',
    'dag 113–140: 77,38 mg',
    'fra dag 141: 73,51 mg',
    'teknisk planhorisont: 6 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const vortioksetin = stoff({
  nokkel: 'vortioksetin',
  navn: 'vortioksetin',
  kode: 'Vo',
  dose: { lavest: 5, hoyest: 20, kilde: P7.brintellixDose },
  gruppe: LAV,
  grenser: [forsiktig(10, P7.brintellixEldre, ja(VORTIOKSETIN_ELDRE))],
  klinisk: { kort: { [FEST_FORM.tablett]: [20] }, styrker: { [FEST_FORM.tablett]: [5, 10, 15, 20] } },
  godkjent: {
    regelversjon: 11,
    fingeravtrykk: 'a6e488637de88c9bb109d42153a56a8e616935638c0536d1335076210dd1351e',
    avgrensning:
      'bare én første reduksjon fra vortioksetin 20 til 15 mg én gang daglig, med minst 28 dager på 15 mg før en ny symptomstyrt vurdering, hos voksne under 65 år ved ikke-langvarig behandling og uten tidligere seponeringsplager, etter regelens obligatoriske vurdering av organfunksjon og interaksjoner og de andre stoppene, og bare med markedsførte tabletter (FEST-form 53) og de kontrollerte styrkene 5, 10, 15 og 20 mg. Gjelder ikke dosejusteringer, lavdose, lang behandlingstid (heller ikke med begrunnelse), den langsomme varianten eller neste reduksjon.',
  },
  kildetro: [
    utsagn('Gradvis dosereduksjon kan vurderes, men preparatomtalen har ikke data nok til en bestemt nedtrappingsplan.', P7.brintellixSeponering),
    utsagn('Fra 65 år anbefales forsiktighet ved doser over 10 mg, fordi data er begrenset; det er ingen kontraindikasjon.', P7.brintellixEldre),
  ],
  usikkerhet: ['Nedtrappingen bygger på NICEs og RCPsychs generelle råd; preparatomtalen sier uttrykkelig at data mangler for en bestemt plan.', 'Trinnene under 5 mg krever flytende form (dråper); uten det stopper planen ved trinnet før.'],
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg med standardvalgene, til den tekniske planhorisonten.', 20, [
      'dag 1–28: 15 mg',
      'dag 29–56: 11,25 mg',
      'dag 57–84: 8,44 mg',
      'dag 85–112: 6,33 mg',
      'dag 113–140: 4,75 mg',
      'dag 141–168: 3,56 mg',
      'dag 169–196: 2,67 mg',
      'dag 197–224: 2 mg',
      'dag 225–252: 1,5 mg',
      'dag 253–280: 1,13 mg',
      'dag 281–308: 0,85 mg',
      'fra dag 309: 0,64 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
    eks('fra-10-mg-lang', 'Fra 10 mg etter lang behandlingstid med forslaget 10 % og 28 dager (gjennomgangen av d6cc3dd).', 10, [
      'dag 1–28: 9 mg',
      'dag 29–56: 8,1 mg',
      'dag 57–84: 7,29 mg',
      'dag 85–112: 6,56 mg',
      'dag 113–140: 5,9 mg',
      'dag 141–168: 5,31 mg',
      'dag 169–196: 4,78 mg',
      'dag 197–224: 4,3 mg',
      'dag 225–252: 3,87 mg',
      'dag 253–280: 3,48 mg',
      'dag 281–308: 3,13 mg',
      'fra dag 309: 2,82 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { lang: true }),
    stopp('lang-25-prosent-uten-begrunnelse', 'Etter lang behandlingstid krever mer enn 10 % per trinn en begrunnelse, også ved lav risiko (gjennomgangen av d6cc3dd).', 10, KREVER_BEGRUNNELSE, { lang: true, justert: { prosent: 25 } }),
    stopp('lang-14-dager-uten-begrunnelse', 'Etter lang behandlingstid krever 14 dager per trinn en begrunnelse.', 10, KREVER_BEGRUNNELSE, { lang: true, justert: { dager: 14 } }),
  ],
  langsom: { startdose_mg: 10, forventet: [
    'dag 1–28: 9,5 mg',
    'dag 29–56: 9,03 mg',
    'dag 57–84: 8,58 mg',
    'dag 85–112: 8,15 mg',
    'dag 113–140: 7,74 mg',
    'fra dag 141: 7,35 mg',
    'teknisk planhorisont: 6 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const moklobemid = stoff({
  nokkel: 'moklobemid',
  navn: 'moklobemid',
  kode: 'Mo',
  dose: { lavest: 300, hoyest: 600, kilde: P7.aurorixDose },
  gruppe: HOY,
  fordeling: { antall: [2], grunnlag: { type: 'kilde', henvisninger: [P7.aurorixFordeling] } },
  senere: [LIKE_STORE_DOSER],
  unntak: (v) => [
    {
      id: 'nedsatt_leverfunksjon',
      tekst: 'Pasienten har alvorlig nedsatt leverfunksjon; preparatomtalen reduserer da dosen, og nedtrappingen må vurderes individuelt.',
      grunnlag: { type: 'kilde', henvisninger: [P7.aurorixDose] },
    },
    kontraindikasjon(v, 'kontraindisert_interaksjon', 'Pasienten bruker et legemiddel som er kontraindisert sammen med moklobemid, eller har en akutt forvirringstilstand.', P7.aurorixKontra),
  ],
  kildetro: [
    utsagn('Preparatomtalen gir ingen anvisning om nedtrapping av moklobemid.', P7.aurorixSeponering),
    utsagn('Moklobemid er blant stoffene med høyest potensiell risiko for seponeringssymptomer.', RCPSYCH.hoyRisiko),
    utsagn('Døgndosen gis fordelt på 2 doser etter måltid.', P7.aurorixFordeling),
  ],
  tilpasninger: [
    utsagn('Unntaket ved alvorlig nedsatt leverfunksjon kommer i tillegg til bekreftelsen om organfunksjon og interaksjoner, som gjelder alle stoffene; det alene er ikke nok (fagkontrollen 30.10.2026).', P7.aurorixDose),
    utsagn('Kontraindiserte interaksjoner stopper planleggingen i stedet for å inngå i den generelle bekreftelsen (substanskontrollen 30.10.2026).', P7.aurorixKontra),
  ],
  usikkerhet: [
    'Preparatomtalen og RCPsych trekker i ulik retning: preparatomtalen gir ingen anvisning om nedtrapping, mens RCPsych regner moklobemid blant stoffene med høyest risiko. Regelen følger RCPsych; det må avklares faglig.',
    'Trinnene krever doser som ikke kan settes sammen av tabletter på 150 og 300 mg; uten det stopper planen ved trinnet før.',
  ],
  ikkeBeregnbar: {
    grunn: 'Med tablettene på 150 og 300 mg ligger ingen dose som kan gis innenfor valgområdet for første trinn (5–10 % av aktuell dose ved høy risiko), heller ikke blant de nærmeste dosene forskriveren kan velge; regelen beregner ingen trinn.',
    usikkerhet: [
      'Preparatomtalen og RCPsych trekker i ulik retning: preparatomtalen gir ingen anvisning om nedtrapping, mens RCPsych regner moklobemid blant stoffene med høyest risiko.',
      'Ingen formulering i FEST gir dosene trinnene krever. En alternativ formulering må dokumenteres og kontrolleres før en beregnbar regel vurderes på nytt.',
    ],
  },
  eksempler: [eks('fra-300-mg', 'Fra 300 mg: 10 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 300, [
    'dag 1–28: 270 mg, fordelt på 2 doser',
    'dag 29–56: 243 mg, fordelt på 2 doser',
    'dag 57–84: 218,7 mg, fordelt på 2 doser',
    'dag 85–112: 196,83 mg, fordelt på 2 doser',
    'dag 113–140: 177,15 mg, fordelt på 2 doser',
    'dag 141–168: 159,44 mg, fordelt på 2 doser',
    'dag 169–196: 143,5 mg, fordelt på 2 doser',
    'dag 197–224: 129,15 mg, fordelt på 2 doser',
    'dag 225–252: 116,24 mg, fordelt på 2 doser',
    'dag 253–280: 104,62 mg, fordelt på 2 doser',
    'dag 281–308: 94,16 mg, fordelt på 2 doser',
    'fra dag 309: 84,74 mg, fordelt på 2 doser',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ])],
  langsom: { startdose_mg: 300, forventet: [
    'dag 1–28: 285 mg, fordelt på 2 doser',
    'dag 29–56: 270,75 mg, fordelt på 2 doser',
    'dag 57–84: 257,21 mg, fordelt på 2 doser',
    'dag 85–112: 244,35 mg, fordelt på 2 doser',
    'dag 113–140: 232,13 mg, fordelt på 2 doser',
    'fra dag 141: 220,52 mg, fordelt på 2 doser',
    'teknisk planhorisont: 6 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const mirtazapin = stoff({
  nokkel: 'mirtazapin',
  navn: 'mirtazapin',
  kode: 'Mz',
  dose: { lavest: 15, hoyest: 45, kilde: SPC.remeronDose },
  gruppe: HOY,
  kildetro: [utsagn('Behandlingen med mirtazapin avsluttes gradvis.', SPC.remeronDose), utsagn('Mirtazapin er blant stoffene med høyest potensiell risiko for seponeringssymptomer.', RCPSYCH.hoyRisiko)],
  tilpasninger: [utsagn('Har tidligere seponeringssymptomer vært søvnrelaterte, styres senere reduksjoner av responsen (substanskontrollen 30.10.2026). Nyre- og leverfunksjon vurderes i bekreftelsen om organfunksjon.')],
  usikkerhet: ['Smeltetablettene deles ikke; de fleste trinnene krever flytende form; uten det stopper planen ved trinnet før.'],
  ikkeBeregnbar: {
    grunn: 'Med de norske tablettene og smeltetablettene ligger ingen dose som kan gis innenfor valgområdet for første trinn (5–10 % av aktuell dose ved høy risiko), heller ikke blant de nærmeste dosene forskriveren kan velge; regelen beregner ingen trinn.',
    usikkerhet: ['Ingen formulering i FEST gir dosene trinnene krever, og smeltetablettene deles ikke. En alternativ formulering må dokumenteres og kontrolleres før en beregnbar regel vurderes på nytt.'],
  },
  eksempler: [eks('fra-15-mg', 'Fra 15 mg: 10 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 15, [
    'dag 1–28: 13,5 mg',
    'dag 29–56: 12,15 mg',
    'dag 57–84: 10,94 mg',
    'dag 85–112: 9,85 mg',
    'dag 113–140: 8,87 mg',
    'dag 141–168: 7,98 mg',
    'dag 169–196: 7,18 mg',
    'dag 197–224: 6,46 mg',
    'dag 225–252: 5,81 mg',
    'dag 253–280: 5,23 mg',
    'dag 281–308: 4,71 mg',
    'fra dag 309: 4,24 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ])],
  langsom: { startdose_mg: 15, forventet: [
    'dag 1–28: 14,25 mg',
    'dag 29–56: 13,54 mg',
    'dag 57–84: 12,86 mg',
    'dag 85–112: 12,22 mg',
    'dag 113–140: 11,61 mg',
    'fra dag 141: 11,03 mg',
    'teknisk planhorisont: 6 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const amitriptylin = stoff({
  nokkel: 'amitriptylin',
  navn: 'amitriptylin',
  kode: 'At',
  dose: { lavest: 10, hoyest: 150, kilde: P7.sarotexDose },
  gruppe: MIDDELS,
  grenser: [forsiktig(100, P7.sarotexEldre, ja(AMITRIPTYLIN_ELDRE)), forsiktig(75, P7.sarotexSmerte, ja(AMITRIPTYLIN_SMERTE))],
  klinisk: { kort: { [FEST_FORM.tablett]: [25, 50, 75, 100, 150] }, lang: { [FEST_FORM.tablett]: [50, 75] }, styrker: { [FEST_FORM.tablett]: [10, 25, 50] } },
  kildetro: [
    utsagn('Amitriptylin trappes gradvis ned over flere uker når behandlingen avsluttes.', P7.sarotexSeponering),
    utsagn('Ved depresjon hos eldre over 65 år og ved hjerte- og karsykdom brukes doser over 100 mg med forsiktighet.', P7.sarotexEldre),
    utsagn('Ved nevropatisk smerte, kronisk spenningshodepine og migreneprofylakse er anbefalt dose 25–75 mg daglig.', P7.sarotexSmerte),
  ],
  forutsetninger: ['Regelen gjelder alle indikasjonene i preparatomtalen hos voksne, også smerte og migreneprofylakse med lavere doser; en dose under vanlig antidepressivt område er ikke ugyldig.', TRISYKLISK],
  usikkerhet: ['Tablettene på 10, 25 og 50 mg er ikke oppgitt som delbare; mange ideelle trinn kan derfor ikke gis nøyaktig, og planen stopper ved trinnet før.'],
  eksempler: [eks('fra-50-mg', 'Fra 50 mg med standardvalgene, til den tekniske planhorisonten.', 50, [
    'dag 1–28: 37,5 mg',
    'dag 29–56: 28,13 mg',
    'dag 57–84: 21,1 mg',
    'dag 85–112: 15,83 mg',
    'dag 113–140: 11,87 mg',
    'dag 141–168: 8,9 mg',
    'dag 169–196: 6,68 mg',
    'dag 197–224: 5,01 mg',
    'dag 225–252: 3,76 mg',
    'dag 253–280: 2,82 mg',
    'dag 281–308: 2,12 mg',
    'fra dag 309: 1,59 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ])],
  langsom: { startdose_mg: 50, forventet: [
    'dag 1–28: 47,5 mg',
    'dag 29–56: 45,13 mg',
    'dag 57–84: 42,87 mg',
    'dag 85–112: 40,73 mg',
    'dag 113–140: 38,69 mg',
    'fra dag 141: 36,76 mg',
    'teknisk planhorisont: 6 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const klomipramin = stoff({
  nokkel: 'klomipramin',
  navn: 'klomipramin',
  kode: 'Cl',
  dose: { lavest: 10, hoyest: 250, kilde: P7.anafranilDose },
  gruppe: MIDDELS,
  grenser: [forsiktig(150, P7.anafranilIndikasjon), maks(150, P7.anafranilIndikasjon, nei(KLOMIPRAMIN_INDIKASJON))],
  klinisk: {
    // Bare 50 → 45 mg ved lang behandlingstid gis med hele tabletter (gjennomgangen av d6cc3dd).
    lang: { [FEST_FORM.tablett]: [50] },
    styrker: { [FEST_FORM.tablett]: [10, 25] },
    uten_deling: utsagn(
      'Anafranil 10 mg og 25 mg har ingen delestrek, og at tablettene kan deles, er ikke dokumentert. En plan som deler en tablett, er derfor utenfor det kliniske omfanget til delingen er dokumentert (kontrollørens gjennomgang av 0ae6d07 31.10.2026).',
      P7.anafranilDose,
    ),
  },
  kildetro: [
    utsagn('Brå seponering av klomipramin bør unngås; etter lang bruk trappes dosen gradvis ned.', P7.anafranilSeponering),
    utsagn('Høyste dose er indikasjonsspesifikk: ved depresjon og tvangstilstander vanligvis 100–150 mg og i vanskelige tilfeller høyst 250 mg; ved panikklidelse om nødvendig 150 mg; ved narkolepsi 25–100 mg.', P7.anafranilIndikasjon),
  ],
  tilpasninger: [
    utsagn(
      'Over 150 mg krever en begrunnelse ved alle indikasjoner, fordi preparatomtalen bare gir høyere doser i vanskelige tilfeller ved depresjon og tvangstilstander; ved de andre indikasjonene er 150 mg høyeste dose regelen gjelder for.',
      P7.anafranilIndikasjon,
    ),
  ],
  forutsetninger: [TRISYKLISK],
  usikkerhet: ['Fra høye doser blir planen lang; flere trinn er ikke automatisk bedre (P4.6).'],
  eksempler: [eks('fra-50-mg', 'Fra 50 mg med standardvalgene, til den tekniske planhorisonten.', 50, [
    'dag 1–28: 37,5 mg',
    'dag 29–56: 28,13 mg',
    'dag 57–84: 21,1 mg',
    'dag 85–112: 15,83 mg',
    'dag 113–140: 11,87 mg',
    'dag 141–168: 8,9 mg',
    'dag 169–196: 6,68 mg',
    'dag 197–224: 5,01 mg',
    'dag 225–252: 3,76 mg',
    'dag 253–280: 2,82 mg',
    'dag 281–308: 2,12 mg',
    'fra dag 309: 1,59 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ])],
  langsom: { startdose_mg: 50, forventet: [
    'dag 1–28: 47,5 mg',
    'dag 29–56: 45,13 mg',
    'dag 57–84: 42,87 mg',
    'dag 85–112: 40,73 mg',
    'dag 113–140: 38,69 mg',
    'fra dag 141: 36,76 mg',
    'teknisk planhorisont: 6 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const nortriptylin = stoff({
  nokkel: 'nortriptylin',
  navn: 'nortriptylin',
  kode: 'No',
  dose: { lavest: 25, hoyest: 200, kilde: P7.noritrenDose },
  gruppe: MIDDELS,
  grenser: [forsiktig(150, P7.noritrenDose), forsiktig(50, P7.noritrenDose, ja(NORTRIPTYLIN_ELDRE))],
  klinisk: { kort: { [FEST_FORM.tablett]: [25, 50, 150] }, lang: { [FEST_FORM.tablett]: [50] }, styrker: { [FEST_FORM.tablett]: [10, 25, 50] } },
  kildetro: [
    utsagn('Brå seponering av nortriptylin etter lang tids bruk kan gi abstinenssymptomer.', P7.noritrenSeponering),
    utsagn('Dosen økes om nødvendig til 150 mg daglig og bare i sjeldne tilfeller til 200 mg; hos eldre er vanlig vedlikeholdsdose 25–50 mg.', P7.noritrenDose),
  ],
  tilpasninger: [
    utsagn('Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.', P7.noritrenVedlikehold),
    utsagn('200 mg er ikke et ordinært maksimum: over 150 mg krever en begrunnelse (substanskontrollen 30.10.2026).', P7.noritrenDose),
    utsagn('Hos eldre krever over 50 mg en begrunnelse. Grensen er OUSFARs valg ut fra vedlikeholdsdosen i preparatomtalen, ikke en grense preparatomtalen setter, og «eldre» har ingen bestemt alder der. Den er til uavhengig kontroll.', P7.noritrenDose),
  ],
  forutsetninger: [`${TRISYKLISK} Serumkonsentrasjon (TDM) kan være relevant ved høye doser eller særlig sårbare pasienter.`],
  usikkerhet: ['Preparatomtalen sier ikke hvordan nortriptylin skal trappes ned ved seponering; regelen bygger på NICE og RCPsych.'],
  eksempler: [
    eks('fra-50-mg', 'Fra 50 mg med standardvalgene, til den tekniske planhorisonten.', 50, [
      'dag 1–28: 37,5 mg',
      'dag 29–56: 28,13 mg',
      'dag 57–84: 21,1 mg',
      'dag 85–112: 15,83 mg',
      'dag 113–140: 11,87 mg',
      'dag 141–168: 8,9 mg',
      'dag 169–196: 6,68 mg',
      'dag 197–224: 5,01 mg',
      'dag 225–252: 3,76 mg',
      'dag 253–280: 2,82 mg',
      'dag 281–308: 2,12 mg',
      'fra dag 309: 1,59 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
    eks('fra-15-mg', 'Lav restdose under ordinært doseområde: 25 % per trinn, uten nedre grense.', 15, [
      'dag 1–28: 11,25 mg',
      'dag 29–56: 8,44 mg',
      'dag 57–84: 6,33 mg',
      'dag 85–112: 4,75 mg',
      'dag 113–140: 3,56 mg',
      'dag 141–168: 2,67 mg',
      'dag 169–196: 2 mg',
      'dag 197–224: 1,5 mg',
      'dag 225–252: 1,13 mg',
      'dag 253–280: 0,85 mg',
      'dag 281–308: 0,64 mg',
      'fra dag 309: 0,48 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
  ],
  langsom: { startdose_mg: 50, forventet: [
    'dag 1–28: 47,5 mg',
    'dag 29–56: 45,13 mg',
    'dag 57–84: 42,87 mg',
    'dag 85–112: 40,73 mg',
    'dag 113–140: 38,69 mg',
    'fra dag 141: 36,76 mg',
    'teknisk planhorisont: 6 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const paroksetin = stoff({
  nokkel: 'paroksetin',
  navn: 'paroksetin',
  kode: 'Pa',
  dose: { lavest: 10, hoyest: 60, kilde: P7.seroxatDose },
  gruppe: HOY,
  grenser: [maks(50, P7.seroxatIndikasjon, nei(PAROKSETIN_INDIKASJON)), maks(40, P7.seroxatEldre, ja(PAROKSETIN_ELDRE))],
  sporsmal: [PAROKSETIN_ORGAN],
  kildetro: [
    utsagn('Høyeste dose er 50 mg daglig ved depresjon og de fleste angstlidelser og 60 mg ved tvangslidelse og panikklidelse; hos eldre bør dosen ikke overstige 40 mg.', P7.seroxatIndikasjon, P7.seroxatEldre),
    utsagn('Ved alvorlig nedsatt nyrefunksjon og nedsatt leverfunksjon holdes dosen i nedre del av doseområdet.', P7.seroxatOrgan),
    utsagn('Paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov.', P7.seroxatVarighet),
    utsagn('Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.', P7.seroxatRegime),
    utsagn('Paroksetin gir oftere seponeringssymptomer og krever særlig varsomhet.', NICE.saerligRisiko, RCPSYCH.hoyRisiko),
  ],
  tilpasninger: [
    utsagn(
      'Bakgrunn: i de kliniske studiene i preparatomtalen ble døgndosen redusert med 10 mg hver uke. Det er en historisk strategi fra studiene, ikke en anbefaling, og den beregnes ikke, heller ikke til sammenligning (fagkontrollen 30.10.2026).',
      P7.seroxatRegime,
      P7.seroxatVarighet,
    ),
  ],
  usikkerhet: ['De fleste trinnene krever deling av tabletter eller flytende form (mikstur); uten det stopper planen ved trinnet før.'],
  ikkeBeregnbar: {
    grunn: 'Med de norske tablettene ligger ingen dose som kan gis innenfor valgområdet for første trinn (5–10 % av aktuell dose ved høy risiko), heller ikke blant de nærmeste dosene forskriveren kan velge; regelen beregner ingen trinn.',
    usikkerhet: ['FEST har ingen flytende form av paroksetin. En alternativ formulering må dokumenteres og kontrolleres før en beregnbar regel vurderes på nytt.'],
  },
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg: 10 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 20, [
      'dag 1–28: 18 mg',
      'dag 29–56: 16,2 mg',
      'dag 57–84: 14,58 mg',
      'dag 85–112: 13,12 mg',
      'dag 113–140: 11,81 mg',
      'dag 141–168: 10,63 mg',
      'dag 169–196: 9,57 mg',
      'dag 197–224: 8,61 mg',
      'dag 225–252: 7,75 mg',
      'dag 253–280: 6,98 mg',
      'dag 281–308: 6,28 mg',
      'fra dag 309: 5,65 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
    eks(
      'fra-20-mg-5-prosent',
      'Stresstest fra fagvurderingen: 5 % per trinn fra 20 mg. Planen viser 12 reduksjoner, den tekniske horisonten, ikke en sluttdose; videre nedtrapping regnes fra dosen pasienten da bruker.',
      20,
      [
        'dag 1–28: 19 mg',
        'dag 29–56: 18,05 mg',
        'dag 57–84: 17,15 mg',
        'dag 85–112: 16,29 mg',
        'dag 113–140: 15,48 mg',
        'dag 141–168: 14,71 mg',
        'dag 169–196: 13,97 mg',
        'dag 197–224: 13,27 mg',
        'dag 225–252: 12,61 mg',
        'dag 253–280: 11,98 mg',
        'dag 281–308: 11,38 mg',
        'fra dag 309: 10,81 mg',
        'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
      ],
      { justert: { prosent: 5 } },
    ),
  ],
  langsom: { startdose_mg: 20, forventet: [
    'dag 1–28: 19 mg',
    'dag 29–56: 18,05 mg',
    'dag 57–84: 17,15 mg',
    'dag 85–112: 16,29 mg',
    'dag 113–140: 15,48 mg',
    'fra dag 141: 14,71 mg',
    'teknisk planhorisont: 6 reduksjoner; avslutning vurderes individuelt',
  ] },
})

/* --- Fluoksetin annenhver dag ---------------------------------------------------------- */

/** Annenhver dag etter kontrollørens gjennomgang av 0ae6d07 31.10.2026 (P7.5): ingen tilfeller er kontrollert. */
const ANNENHVER_DAG_UTEN_OMFANG: Versjon = {
  merknad:
    'Avgrenset etter kontrollørens gjennomgang av 0ae6d07 31.10.2026 (P7.5): strategien var ikke blant de kontrollerte tilfellene, så regelen har et tomt klinisk omfang og gir ingen klinisk plan, uansett legemiddelform, før tilfellene er særskilt verifisert.',
  dato: RUNDE_8,
}

/** Annenhver dag etter kontrollørens gjennomgang av d6cc3dd 31.10.2026: grunnlaget for omfanget er felles med de andre reglene, og omfanget er fortsatt tomt. */
const ANNENHVER_DAG_GRUNNLAG: Versjon = {
  merknad: 'Grunnlaget for det kliniske omfanget er oppdatert etter kontrollørens gjennomgang av d6cc3dd 31.10.2026 (P7.5); omfanget er fortsatt tomt, så regelen gir ingen klinisk plan.',
  dato: RUNDE_9,
}

/** Fluoksetin 20 mg annenhver dag: en valgfri strategi ved 20 mg daglig, bare for fluoksetin (beslutning 5.10). */
function fluoksetinAnnenhverDag(): Regel {
  const versjoner = [NY_ETTER_RUNDE_2('fluoksetin 20 mg annenhver dag som valgfri strategi ved 20 mg daglig.'), KONTROLL_5, ANNENHVER_DAG_UTEN_OMFANG, ANNENHVER_DAG_GRUNNLAG]
  const versjon = versjoner.length
  const avklaring = runde2(versjon, 'annenhverDag')
  const inngang = runde3(versjon, 'annenhverDag')
  const virkestoff = { type: 'virkestoff' as const, nokkel: 'fluoksetin' }
  const vilkar = betingelser({ ...fluoksetin, unntak: undefined }, versjon, false)
  const revurdering: Bekreftelse = {
    id: 'revurdering',
    tekst:
      'Dosering annenhver dag er et valgfritt alternativ forskriveren velger. Etter minst fire uker revurderes pasienten, og symptomer kan kreve en vurdering tidligere enn dag 28; videre nedtrapping eller seponering er forskriverens beslutning og beregnes ikke av planen.',
    grunnlag: vurdering('Fagkontrollen godkjente strategien uten automatisk seponering: planen sier ikke hva som skjer etter revurderingen.', [NICE.fluoksetin, RCPSYCH.fluoksetin], avklaring),
  }
  const r: Regel = {
    id: 'seponering-fluoksetin-annenhver-dag',
    versjon,
    tittel: 'Seponering av fluoksetin, 20 mg annenhver dag',
    fra: virkestoff,
    til: null,
    plan: {
      form: 'seponering',
      forlop: [
        {
          id: 'fra',
          virkestoff,
          administrasjon: 'peroral',
          utgangsdose: 'startdose',
          start: { type: 'dag', dag: 1 },
          faser: [
            {
              type: 'intervalldosering',
              dose: { type: 'aktuell' },
              hver: kilde(2, 'dager', 'veiledende_preferanse', NICE.fluoksetin),
              minstetid: forslag(28, 'dager', 'Minst fire uker med dosering annenhver dag før pasienten revurderes, uten klinisk fastsatt øvre grense; lengre tid kan velges.', {
                art: 'bindende_krav',
                omrade: [28, TEKNISK_MAKS_DAGER],
                teknisk_maks: true,
                justerbar: 'Minste antall dager før revurdering',
                henvisninger: [RCPSYCH.fluoksetin],
                avklaring,
              }),
            },
          ],
        },
      ],
    },
    inndata: [
      {
        navn: 'startdose',
        verdier: [20],
        art: 'bindende_krav',
        grunnlag: vurdering(
          'Strategien gjelder bare ved nøyaktig 20 mg daglig, ikke ved en annen startdose eller et annet regime med samme gjennomsnittlige døgndose; ved 40–60 mg brukes gradvis nedtrapping.',
          [NICE.fluoksetin],
          inngang,
        ),
      },
    ],
    bekreftelser: [...vilkar.bekreftelser.filter((b) => b.id !== STARTFORSLAG.id), revurdering],
    unntak: [tidligereSymptomer(versjon), ...fellesStopp(versjon)],
    sporsmal: vilkar.sporsmal,
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [fluoksetin.kildetro[1]!, fluoksetin.kildetro[2]!, fluoksetin.kildetro[0]!],
      tilpasninger: [
        utsagn('Fra 20 mg daglig gis 20 mg annenhver dag i minst 28 dager før pasienten revurderes. Planen gjør ingen ny reduksjon og går ikke til null; videre nedtrapping eller seponering er forskriverens beslutning.', NICE.fluoksetin, RCPSYCH.fluoksetin),
        utsagn('Strategien gjelder bare fluoksetin, fordi den lange virketiden jevner ut konsentrasjonen mellom dosene; den gjelder ikke andre antidepressiva (fagkontrollen 30.10.2026).', NICE.fluoksetin),
        utsagn('Inngangen er nøyaktig 20 mg daglig. Ved en annen startdose eller tidligere seponeringsproblemer brukes strategien ikke uten særskilt vurdering; symptomer kan kreve en vurdering før dag 28 (substanskontrollen 30.10.2026).', NICE.fluoksetin, RCPSYCH.fluoksetin),
        ...STARTDOSE_TILPASNINGER,
      ],
      forutsetninger: [...FORUTSETNINGER_FELLES, FORUTSETNINGER_P7[0]!],
      usikkerhet: ['At dosering annenhver dag gir færre seponeringssymptomer enn en lavere daglig dose, er ikke vist i kontrollerte studier; NICE omtaler den som en mulig egnet reduksjon.'],
    },
    referanser: [pn('SwitchAntidepressants:Fo>Stop')],
    eksempler: [],
    klinisk_omfang: kliniskOmfang([], versjon),
    godkjenning: { status: 'til_faglig_kontroll', historikk: historikk(versjoner) },
  }
  const ok = (e: Regneeksempel) => besvart(r, e)
  r.eksempler = [
    ok(eks('fra-20-mg', 'Fra 20 mg daglig: 20 mg annenhver dag i minst 28 dager før revurdering, uten automatisk seponering.', 20, ['fra dag 1: 20 mg annenhver dag', 'annenhver dag i minst 28 dager; avslutning vurderes individuelt'])),
    ok(stopp('fra-40-mg', 'Ved 40 mg gjelder ikke strategien; da brukes gradvis nedtrapping.', 40, utenfor(40))),
    ok(stopp('fra-19-99-mg', 'Rett under 20 mg gjelder ikke strategien: inngangen er nøyaktig 20 mg daglig.', 19.99, utenfor(19.99))),
    ok(stopp('fra-20-01-mg', 'Rett over 20 mg gjelder ikke strategien: inngangen er nøyaktig 20 mg daglig.', 20.01, utenfor(20.01))),
    ...kontrolleksempler({ ...r, bekreftelser: [STARTFORSLAG, ...r.bekreftelser] }, 20).filter((e) => e.id !== 'uten-bekreftelse'),
  ]
  return r
}

/* --- Regler uten beregning ------------------------------------------------------------- */

/**
 * En klinisk godkjenning fra den uavhengige kontrolløren i substanskontrollen
 * 30.10.2026 (runde 3). OUSFAR Dev setter aldri en klinisk godkjenning selv;
 * den registreres bare der kontrolløren uttrykkelig har godkjent en bestemt
 * regelversjon, med fingeravtrykket kontrolløren oppga.
 */
const klinisk = (regelversjon: number, fingeravtrykk: string, merknad: string, kontroll = SUBSTANSKONTROLLEN): Godkjenningssteg => ({
  status: 'klinisk_godkjent',
  dato: kontroll.dato,
  av: 'ChatGPT (uavhengig fagkontrollør)',
  rolle: 'uavhengig_kontrollor',
  regelversjon,
  fingeravtrykk,
  merknad: `${kontroll.navn}: ${merknad}`,
})

/** En seponeringsregel som bare er fagtekst, uten beregnet plan. */
const tekstregel = (
  r: Pick<Regel, 'id' | 'versjon' | 'tittel' | 'inndata' | 'fortolkning' | 'referanser' | 'godkjenning'> & Partial<Pick<Regel, 'unntak' | 'sporsmal'>> & { nokkel: string; fase: Fase },
): Regel => ({
  id: r.id,
  versjon: r.versjon,
  tittel: r.tittel,
  fra: { type: 'virkestoff', nokkel: r.nokkel },
  til: null,
  plan: { form: 'seponering', forlop: [{ id: 'fra', virkestoff: { type: 'virkestoff', nokkel: r.nokkel }, administrasjon: 'peroral', utgangsdose: 'startdose', start: { type: 'dag', dag: 1 }, faser: [r.fase] }] },
  inndata: r.inndata,
  bekreftelser: [],
  unntak: r.unntak ?? [],
  ...(r.sporsmal && { sporsmal: r.sporsmal }),
  beregnbarhet: 'bare_tekstlig',
  fortolkning: r.fortolkning,
  referanser: r.referanser,
  eksempler: [],
  godkjenning: r.godkjenning,
})

/** Bupropion: med depottablettene som ikke kan deles, er den prosentvise regelen ikke beregnbar (beslutning 3 og 4). Bare fagtekst. */
const BUPROPION_GRUNN = 'Med norske depottabletter, som ikke kan deles, kan ingen døgndose under 150 mg gis; regelen beregner ingen trinn.'
const bupropion = tekstregel({
  id: 'seponering-bupropion',
  versjon: 5,
  tittel: 'Seponering av bupropion',
  nokkel: 'bupropion',
  fase: { type: 'uten_beregning', grunn: BUPROPION_GRUNN },
  inndata: [{ navn: 'startdose', omrade: [150, 300], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [P7.wellbutrinDose] } }],
  fortolkning: {
    kildetro: [
      utsagn('En nedtrappingsperiode bør vurderes; seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes.', P7.wellbutrinSeponering),
      utsagn('Bupropion finnes som tabletter med modifisert frisetting, som ikke skal deles, knuses eller tygges.', P7.wellbutrinDose),
    ],
    tilpasninger: [
      utsagn(`${BUPROPION_GRUNN} Den prosentvise regelen er derfor ikke beregnbar med depotpreparatene (fagkontrollen 30.10.2026).`, P7.wellbutrinDose),
      utsagn('Avslutningen vurderes individuelt fra en dose som kan gis med depottablettene; OUSFAR beregner ingen plan og foreslår ingen dato for siste dose.', P7.wellbutrinSeponering),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES.filter((f) => !f.startsWith('Dosene er')), FORUTSETNINGER_P7[0]!],
    usikkerhet: ['Preparatomtalen sier ikke hvor lenge en nedtrapping bør vare.'],
  },
  referanser: [pn('SwitchAntidepressants:Bu>Stop')],
  godkjenning: {
    status: 'klinisk_godkjent',
    historikk: [
      ...historikk([UTKAST, KONTROLL_1, KONTROLL_2, KONTROLL_3, { merknad: 'Gjort om til fagtekst etter fagkontrollen 30.10.2026 (P7.5): med depottablettene som ikke kan deles, er den prosentvise regelen ikke beregnbar, og avslutningen vurderes individuelt fra en dose som kan gis.', dato: RUNDE_2 }]),
      klinisk(5, 'e7536668ac7f2d4dfd9959f24cfdfc4874182a4fc295355f0d10a05f438b5f5f', 'Godkjent som den står, bare som tekstregel: regelen beregner ingen doseplan og overlater avslutningen til forskriveren.'),
    ],
  },
})

/** Agomelatin: preparatomtalen sier at det ikke trengs nedtrapping. Bare fagtekst, ingen beregning. */
const agomelatin = tekstregel({
  id: 'seponering-agomelatin',
  versjon: 1,
  tittel: 'Seponering av agomelatin',
  nokkel: 'agomelatin',
  fase: { type: 'seponer' },
  inndata: [{ navn: 'startdose', omrade: [25, 50], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [P7.valdoxanDose] } }],
  fortolkning: {
    kildetro: [utsagn('Agomelatin kan seponeres uten nedtrapping.', P7.valdoxanSeponering)],
    tilpasninger: [utsagn('OUSFAR beregner ingen nedtrappingsplan for agomelatin. I Norge finnes agomelatin bare med godkjenningsfritak.')],
    forutsetninger: [...FORUTSETNINGER_FELLES.filter((f) => !f.startsWith('Dosene er')), 'Gjelder seponering, ikke bytte til et annet antidepressiv.'],
    usikkerhet: ['Preparatomtalen er den sentralt godkjente fra EMA; det finnes ingen norsk preparatomtale fordi preparatet ikke er markedsført i Norge.'],
  },
  referanser: [pn('SwitchAntidepressants:Ag>Stop')],
  godkjenning: {
    status: 'klinisk_godkjent',
    historikk: [
      ...historikk([UTKAST]),
      klinisk(
        1,
        '6d42863f3573fb2e0d6dbffd27ff78a7f1c2b539c8dce2cfcd36ad417b61a2d1',
        'Godkjent som egen beslutning (beslutning 9). Godkjenningen gjelder bare agomelatin og utsagnet om at nedtrapping ikke er nødvendig; den gjelder ikke tilbakefallsrisiko, oppfølging av depresjon, leverskade eller overgang til andre legemidler.',
      ),
    ],
  },
})

/**
 * Duloksetin og venlafaksin: substanskontrollen 30.10.2026 (runde 3) godkjente
 * ingen beregnbar plan med dagens formuleringer, verken hovedregelen eller den
 * langsomme varianten. Reglene står som fagtekst til en dokumentert metode for
 * mindre doser foreligger.
 */
const IKKE_BEREGNBAR: Versjon = {
  merknad:
    'Gjort om til fagtekst etter substanskontrollen 30.10.2026, runde 3 (P7.5): ikke godkjent som klinisk beregnbar plan med dagens formuleringer, verken hovedregelen eller den langsomme varianten; kontraindikasjoner og grenser for indikasjon stopper fortsatt.',
  dato: RUNDE_3,
}
const ikkeBeregnbar = (navn: string, formulering: string) =>
  `Med ${formulering}, som ikke kan deles eller åpnes, kan de fleste trinnene i en prosentvis nedtrapping ikke gis nøyaktig; en beregnet ${navn}plan er derfor ikke godkjent før en dokumentert metode for mindre doser foreligger (substanskontrollen 30.10.2026).`
const tekstForutsetninger = (...egne: string[]) => [...FORUTSETNINGER_FELLES.filter((f) => !f.startsWith('Dosene er')), ...egne]

const DULOKSETIN_GRUNN = 'Med enterokapsler på 30 og 60 mg kan ingen trinn mellom 60 og 30 mg eller under 30 mg gis; regelen beregner ingen trinn.'
const duloksetin = tekstregel({
  id: 'seponering-duloksetin',
  versjon: 6,
  tittel: 'Seponering av duloksetin',
  nokkel: 'duloksetin',
  fase: { type: 'uten_beregning', grunn: DULOKSETIN_GRUNN },
  inndata: startdosekrav({ dose: { lavest: 30, hoyest: 120, kilde: P7.cymbaltaDose } }, 6),
  unntak: [
    ...fellesStopp(6),
    kontraindikasjon(6, 'leversykdom', 'Pasienten har leversykdom med nedsatt leverfunksjon.', P7.cymbaltaKontra),
    kontraindikasjon(6, 'alvorlig_nyresvikt', 'Pasienten har alvorlig nedsatt nyrefunksjon (kreatininclearance under 30 ml/min).', P7.cymbaltaKontra),
  ],
  fortolkning: {
    kildetro: [
      utsagn('Duloksetin trappes ned gradvis over minst én til to uker, ikke seponeres brått.', P7.cymbaltaSeponering),
      utsagn('Duloksetin er blant stoffene med høyest potensiell risiko for seponeringssymptomer.', RCPSYCH.hoyRisiko),
      utsagn('Duloksetin er kontraindisert ved leversykdom med nedsatt leverfunksjon og ved kreatininclearance under 30 ml/min.', P7.cymbaltaKontra),
    ],
    tilpasninger: [
      utsagn(ikkeBeregnbar('duloksetin', 'enterokapsler på 30 og 60 mg'), P7.cymbaltaDose),
      utsagn('Nedtrappingen planlegges individuelt, og etter tidligere seponeringssymptomer med mindre trinn og lengre tid; OUSFAR beregner ingen plan og foreslår ingen dato for siste dose.', P7.cymbaltaSeponering, NICE.tidligere),
    ],
    forutsetninger: tekstForutsetninger(FORUTSETNINGER_P7[0]!, 'Alle norske duloksetinpreparater er enterokapsler, som ikke deles eller åpnes; 20 mg finnes bare med godkjenningsfritak.'),
    usikkerhet: ['Det finnes ingen dokumentert metode for doser mellom kapselstyrkene; preparatomtalen sier ikke hvor lenge en nedtrapping bør vare.'],
  },
  referanser: [pn('SwitchAntidepressants:Du>Stop')],
  godkjenning: { status: 'til_faglig_kontroll', historikk: historikk([UTKAST, KONTROLL_1, KONTROLL_2, KONTROLL_3, KONTROLL_4, IKKE_BEREGNBAR]) },
})

const VENLAFAKSIN_DEPRESJON = sporsmal('depressive_episoder', 'Brukes venlafaksin mot depressive episoder?', 'depressive episoder', P7.efexorIndikasjon, {
  nei: 'generalisert angstlidelse, sosial angstlidelse eller panikklidelse',
})
const VENLAFAKSIN_GRUNN = 'Med depotkapsler og depottabletter på 37,5, 75 og 150 mg kan de fleste trinnene ikke gis; regelen beregner ingen trinn.'
const venlafaksin = tekstregel({
  id: 'seponering-venlafaksin',
  versjon: 6,
  tittel: 'Seponering av venlafaksin',
  nokkel: 'venlafaksin',
  fase: { type: 'uten_beregning', grunn: VENLAFAKSIN_GRUNN },
  inndata: startdosekrav({ dose: { lavest: 37.5, hoyest: 375, kilde: P7.efexorDose }, grenser: [maks(225, P7.efexorIndikasjon, nei(VENLAFAKSIN_DEPRESJON))] }, 6),
  unntak: fellesStopp(6),
  sporsmal: [VENLAFAKSIN_DEPRESJON],
  fortolkning: {
    kildetro: [
      utsagn('Venlafaksin trappes ned gradvis over minst én til to uker, for noen over måneder; kapslene svelges hele.', P7.efexorSeponering),
      utsagn('Venlafaksin gir oftere seponeringssymptomer og krever særlig varsomhet.', NICE.saerligRisiko, RCPSYCH.hoyRisiko),
      utsagn('Høyeste døgndose er 375 mg ved depressive episoder og 225 mg ved generalisert angstlidelse, sosial angstlidelse og panikklidelse.', P7.efexorIndikasjon),
    ],
    tilpasninger: [
      utsagn(ikkeBeregnbar('venlafaksin', 'depotkapsler og depottabletter på 37,5, 75 og 150 mg'), P7.efexorSeponering),
      utsagn('Nedtrappingen planlegges individuelt, og etter tidligere seponeringssymptomer med mindre trinn og lengre tid; OUSFAR beregner ingen plan og foreslår ingen dato for siste dose.', P7.efexorSeponering, NICE.tidligere),
    ],
    forutsetninger: tekstForutsetninger(FORUTSETNINGER_P7[0]!, 'Alle norske venlafaksinpreparater har modifisert frisetting; kapslene og depottablettene deles ikke.'),
    usikkerhet: ['Det finnes ingen dokumentert metode for doser mellom kapselstyrkene eller under 37,5 mg.'],
  },
  referanser: [pn('SwitchAntidepressants:Ve>Stop')],
  godkjenning: { status: 'til_faglig_kontroll', historikk: historikk([UTKAST, KONTROLL_1, KONTROLL_2, KONTROLL_3, KONTROLL_4, IKKE_BEREGNBAR]) },
})

const STOFFER = [amitriptylin, citalopram, escitalopram, fluoksetin, fluvoksamin, klomipramin, mirtazapin, moklobemid, nortriptylin, paroksetin, sertralin, vortioksetin]

/**
 * Hovedregelen for et stoff kontrolløren har besluttet ikke skal ha en
 * beregnbar plan med dagens former (beslutning P7-A), som fagtekst: med de
 * samme stoppene, grensene og spørsmålene, men uten beregning og uten den
 * langsomme varianten.
 */
function tekstFraStoff(s: Stoffregel & { ikkeBeregnbar: NonNullable<Stoffregel['ikkeBeregnbar']> }): Regel {
  const versjoner = [...hovedversjoner(s), ...(s.ikkeBeregnbar.etter ?? [IKKE_BEREGNBAR_FORM])]
  const v = versjoner.length
  return tekstregel({
    id: `seponering-${s.nokkel}`,
    versjon: v,
    tittel: `Seponering av ${s.navn}`,
    nokkel: s.nokkel,
    fase: { type: 'uten_beregning', grunn: s.ikkeBeregnbar.grunn },
    inndata: startdosekrav(s, v),
    unntak: [...fellesStopp(v), ...(s.unntak?.(v) ?? [])],
    ...(stoffsporsmal(s).length > 0 && { sporsmal: stoffsporsmal(s) }),
    fortolkning: {
      kildetro: s.kildetro,
      tilpasninger: [
        utsagn(
          `${s.ikkeBeregnbar.grunn} ${s.ikkeBeregnbar.beslutning ?? `Kontrolløren besluttet derfor 30.10.2026 (P7-A) at ${s.navn} ikke skal ha en aktiv beregnbar plan med dagens dokumenterte former; regelen står som fagtekst til en dokumentert alternativ formulering og en substansspesifikk kontroll foreligger.`}`,
          s.dose.kilde,
        ),
        utsagn('Nedtrappingen planlegges individuelt, og etter tidligere seponeringssymptomer med mindre trinn og lengre tid; OUSFAR beregner ingen plan og foreslår ingen dato for siste dose.', NICE.tidligere, RCPSYCH.smaa),
        ...(s.tilpasninger ?? []),
      ],
      forutsetninger: tekstForutsetninger(FORUTSETNINGER_P7[0]!, ...(s.forutsetninger ?? [])),
      usikkerhet: s.ikkeBeregnbar.usikkerhet,
    },
    referanser: [pn(`SwitchAntidepressants:${s.kode}>Stop`)],
    godkjenning: { status: 'til_faglig_kontroll', historikk: historikk(versjoner) },
  })
}
const harTekst = (s: Stoffregel): s is Stoffregel & { ikkeBeregnbar: NonNullable<Stoffregel['ikkeBeregnbar']> } => !!s.ikkeBeregnbar

/** Kontrollørens disposisjon av nedtrappingsreglene 31.10.2026: de 22 reglene, med versjonen og fingeravtrykket som ble vurdert. */
export const NEDTRAPPINGSDISPOSISJON = leveransen({
  'seponering-amitriptylin': vurdert(11, 'dcc526c4db9db4e5a77994b49d7e18890e1799a19c9f4fbc2bf63e31151c4eb7'),
  'seponering-amitriptylin-langsom': vurdert(7, '0f4d32df4883fd056d1f1b19a4f8ba8b52ec1343f3e6b64653c311fbce727deb'),
  'seponering-escitalopram': vurdert(11, 'a2d959cae2780053d15188ae0e160292e06af5155dfacafcfa41b1d850b127db'),
  'seponering-escitalopram-langsom': vurdert(7, '8dcd4f992fe4f9fb55aebf1dc4eda04bc0399d2ef91ca90a14d699979cd53e3d'),
  'seponering-fluoksetin': vurdert(11, '796b98a07017e16850df9f80e53b0fa33ded69a8729df91141dd64934da2caf8'),
  'seponering-fluoksetin-langsom': vurdert(7, '7c8691fc8d08a6fb1fd7423a0c2dec65855fac778c08706cf675290993124dbe'),
  'seponering-fluvoksamin': vurdert(12, '3f1d1e9523137bae72521bc2c7f396eff2aba59080a2af779f07970fa1f53e86'),
  'seponering-fluvoksamin-langsom': vurdert(8, '98fe10b187901eec697df69aa4055f5a36ec6231f9d532c47e9a2a48c8d3b5f0'),
  'seponering-klomipramin': vurdert(11, 'fdf267f7ee7efef2411424e28d78b29a5b98b87c6a0edeacbabb1f5dc2ddc58c'),
  'seponering-klomipramin-langsom': vurdert(7, '78f33b643775fbedd9218be27d5d27a3f4fbdf974451286cfbb1b0fce70bd7af'),
  'seponering-nortriptylin': vurdert(11, 'c2594aabadd1c4ecb41776ab1bac5f2c7cc1b781027fa544726f96c210c25fcd'),
  'seponering-nortriptylin-langsom': vurdert(7, 'dfdb03c5334e9e9d921b3fcdb342b8f7784a398742624a85dff4934b70cce244'),
  'seponering-sertralin': vurdert(11, 'ef83fd9ddbbdf92643ef766a0963a410e1afa5df4aea0db0c81cf6bc2b225953'),
  'seponering-sertralin-langsom': vurdert(7, '7de218da5d775e8785fc6700ca3468fae2bf813d83c68b5012402aa803fb2427'),
  'seponering-vortioksetin-langsom': vurdert(7, '06955d6152fe1060b8f144b9a826d1af56df5a8c16586a471c2f6be45605c05d', 'Bare hovedregelens første reduksjon fra 20 til 15 mg er godkjent; den langsomme varianten er ikke det.'),
  'seponering-fluoksetin-annenhver-dag': vurdert(4, 'cb1187568a3814434df286f6b9f89704956c8ab2d048055233532f3c35bd4f3f'),
  'seponering-duloksetin': vurdert(6, '2c01051c6eebd4a3ff287c2b15c9c89b2870e2b15fd5db0184c6874c21c04edb'),
  'seponering-venlafaksin': vurdert(6, 'b26a1f0cb66af26725bbf55b7f9cfc04c02004ef38611026b8af3baccc313776'),
  'seponering-citalopram': vurdert(9, '88744299aa74fa280c6138fbaaec5d972ef02d7cc49ba3c0fbbaa8422f53d541'),
  'seponering-mirtazapin': vurdert(8, 'c473d6f10c63c423f54886f72456fa87500ec35233651f26de9638333c9efb9f'),
  'seponering-moklobemid': vurdert(9, '15b8fba1db32d3e677c966e69c8f10aad673201089e30f0462034c3f1692dbc4'),
  'seponering-paroksetin': vurdert(8, 'afacbd5ff69e87bb36260cb9def2b4d61c573ef5dc38513375778ea679cc4cda'),
})

export const NEDTRAPPINGSSETT: Regelsett = {
  id: 'ousfar-verktoy-nedtrapping',
  versjon: 14,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Utkast til nedtrappingsregler for antidepressiva (P7): én regel per virkestoff med forsvarlig kildegrunnlag, laget fra preparatomtalen, NICE og RCPsych, og en langsom variant av hver beregnbar regel etter tidligere seponeringssymptomer. Hver plan er et startforslag med minstetider som forskriveren kan justere innenfor valgområdene fra fagvurderingen; ingen plan går til null eller har en fast nedre grense. Kan et trinn ikke gis nøyaktig med preparatene, kan forskriveren velge blant de nærmeste dosene som kan gis, innenfor det foretrukne området der ingen begrunnelse kreves (beslutning P7-A og gjennomgangen av 9cb420b); et avvik tilbys ikke, og planen er da et forklarende stopp. Hver beregnbar regel har et klinisk omfang (gjennomgangen av 0ae6d07): en godkjenning kan bare gjelde de kontrollerte tilfellene av legemiddelform, startdose, behandlingstid, tidligere seponeringssymptomer og trinnstørrelse, og alt annet stopper med forklaring, også en plan med en preparatstyrke som ikke er kontrollert (gjennomgangen av d6cc3dd). Tekstreglene for bupropion og agomelatin er klinisk godkjent etter substanskontrollen 30.10.2026; duloksetin, venlafaksin, citalopram, mirtazapin, moklobemid og paroksetin er tekstregler uten beregning, og fluoksetinregelen gjelder ikke de harde kapslene. Etter gjennomgangen av f77e1a9 er hovedregelen for vortioksetin (versjon 11) klinisk godkjent bare for én første reduksjon fra 20 til 15 mg ved kort behandlingstid hos voksne under 65 år, med tabletter og de kontrollerte styrkene; neste reduksjon beregnes ikke. Etter kontrollørens disposisjon av leveransen 31.10.2026 er alle de øvrige reglene kontrollert og ikke godkjent (tekstreglene som bare fagtekst): de er sperret for klinisk bruk, og en senere aktivering krever en ny kontroll av nøyaktig den versjonen i en egen PR.',
  regler: disponer(
    [
      ...STOFFER.flatMap((s) => (harTekst(s) ? [] : [seponeringsregel(s), seponeringsregel(s, true)])),
      fluoksetinAnnenhverDag(),
      bupropion,
      agomelatin,
      duloksetin,
      venlafaksin,
      ...STOFFER.filter(harTekst).map(tekstFraStoff),
    ],
    NEDTRAPPINGSDISPOSISJON,
  ),
}

/**
 * Regler som bare regnes ut til sammenligning og utvikling (P7.5), som den
 * hyperbolske citalopramregelen (B2). De er ikke i verktøyets regelsett, kan
 * ikke velges klinisk og er ikke kliniske anbefalinger.
 */
export const SAMMENLIGNINGSSETT: Regelsett = {
  id: 'ousfar-verktoy-nedtrapping-sammenligning',
  versjon: 5,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Sammenlignings- og utviklingssett for reglene (P4.8 og P7.5): strategier som ikke er godkjent som valgbare kliniske strategier, og gruppebyttet til aripiprazol som modelleringsdemonstrasjon av gruppebaserte regler. Ikke i verktøyet og ikke kliniske anbefalinger.',
  regler: [seponeringCitalopramHyperbolsk, gruppeRestApAripiprazol],
}
