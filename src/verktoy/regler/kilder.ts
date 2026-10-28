/**
 * Kildene pilotreglene i P4 bygger på (`docs/verktøy-p4-regelmodell.md`):
 * norske preparatomtaler fra DMP, sentralt godkjente preparatomtaler fra EMA,
 * NICE-retningslinjen for depresjon og primær- og oversiktslitteratur. Alle
 * ble hentet og lest 28.10.2026; kontrollsummen er av dokumentet slik det ble
 * hentet, så en ny revisjon kan oppdages før en regel kontrolleres på nytt.
 *
 * Reglene gjengir fakta fra kildene med egne ord (en dose, en frist, en
 * metode), aldri teksten. Psychiatrienet er bare en referanse regelen kan
 * sammenlignes med, med henvisning til kildeoppføringen fra P3, aldri med
 * innhold (`docs/verktøy-p3-rettigheter.md`).
 */
import type { Kilde } from './modell'

const DMP = 'https://produktinformasjon.legemiddelsok.no/preparatomtaler'
const EMA = 'https://www.ema.europa.eu/en/documents/product-information'

const OFFENTLIG = 'Offentlig dokument. OUSFAR henviser til det og gjengir fakta med egne ord.'

const preparatomtale = (id: string, tittel: string, nr: string, versjon: string, hentet: string, sha256: string): Kilde => ({
  id,
  type: 'preparatomtale',
  tittel,
  utgiver: 'Direktoratet for medisinske produkter (DMP)',
  url: `${DMP}/${nr}.pdf`,
  versjon,
  hentet,
  sha256,
  bruk: OFFENTLIG,
})

const epar = (id: string, tittel: string, navn: string, versjon: string, hentet: string, sha256: string): Kilde => ({
  id,
  type: 'preparatomtale',
  tittel,
  utgiver: 'European Medicines Agency (EMA)',
  url: `${EMA}/${navn}-epar-product-information_en.pdf`,
  versjon,
  hentet,
  sha256,
  bruk: OFFENTLIG,
})

export const KILDER: readonly Kilde[] = [
  preparatomtale('dmp-cipralex', 'Cipralex (escitalopram) tabletter, preparatomtale', '2002-00713', 'Oppdatert 22.11.2024', '2026-10-28T03:32:50Z', 'a04d22200055055d2cf48436c3a83f0c9bf6d87044f5d218cd39d0d9984d018a'),
  preparatomtale('dmp-cipramil', 'Cipramil (citalopram) tabletter, preparatomtale', '0000-08151', 'Oppdatert 16.05.2024', '2026-10-28T03:32:58Z', '4bc8dfd2e647d273f044bc3019d3fe116a4ca59b1ff47951866230484e2fd8de'),
  preparatomtale('dmp-zoloft', 'Zoloft (sertralin) tabletter, preparatomtale', '0000-08203', 'Oppdatert 07.01.2026', '2026-10-28T03:32:56Z', '4ac8f7305379de98aa2dc9ed576b06890624c9035c9b90633ec32262d9c3d64e'),
  preparatomtale('dmp-fluoxetin', 'Fluoxetine Vitabalans (fluoksetin) tabletter, preparatomtale', '10-7362', 'Oppdatert 12.11.2021', '2026-10-28T03:32:52Z', '221a73511f81243af0c8744ac901e90377fc4c46e1c5f03bbb2bdde564582c17'),
  preparatomtale('dmp-remeron', 'Remeron (mirtazapin) tabletter, preparatomtale', '1997-03657', 'Oppdatert 01.09.2021', '2026-10-28T03:37:07Z', '2bc89cecfe0b2a80a5633e770315971a2726f1bf4e5307d3bcd982c3584f0e54'),
  preparatomtale('dmp-seroquel', 'Seroquel (kvetiapin) tabletter, preparatomtale', '02-1435', 'Oppdatert 03.07.2024', '2026-10-28T03:32:53Z', '87e197ef056358d0bad84b80cf58c18c68e0846bbe3ab5f01e55d2519c30dde4'),
  preparatomtale('dmp-cisordinol', 'Cisordinol (zuklopentiksol) tabletter, preparatomtale', '0000-06778', 'Oppdatert 16.02.2026', '2026-10-28T03:37:09Z', 'e34ae0834fb63bb82fe32ec614c6319f0bcccbcc03dbf7e01dc5dd6d603739fe'),
  epar('ema-abilify', 'Abilify (aripiprazol), produktinformasjon', 'abilify', 'Sist endret 08.10.2026', '2026-10-28T03:32:58Z', '48ec4699460ea38cacf1c891061adc75be0cb67e5657869eb4f756b4f121c005'),
  epar('ema-abilify-maintena', 'Abilify Maintena (aripiprazol depotinjeksjon), produktinformasjon', 'abilify-maintena', 'Sist endret 08.10.2026', '2026-10-28T03:30:15Z', '41ea025269b746fee63511b9edbf4ea222d53988b45b27fd317f27f82cafb4fe'),
  epar('ema-xeplion', 'Xeplion (paliperidonpalmitat depotinjeksjon), produktinformasjon', 'xeplion', 'Sist endret 08.10.2026', '2026-10-28T03:30:16Z', '2d38bdc767adb9ede103df61263cd780b613b64f4605afd38720f25f2e234f90'),
  epar('ema-zyprexa', 'Zyprexa (olanzapin), produktinformasjon', 'zyprexa', 'Sist endret 08.10.2026', '2026-10-28T03:32:59Z', 'd7a60e6f4908c9e7d3e4f8ff39c56bf74a1014719fb7cace04436a065b4d3357'),
  {
    id: 'nice-ng222',
    type: 'retningslinje',
    tittel: 'Depression in adults: treatment and management (NG222), Recommendations',
    utgiver: 'National Institute for Health and Care Excellence (NICE)',
    url: 'https://www.nice.org.uk/guidance/ng222/chapter/Recommendations',
    versjon: 'Publisert 29.06.2022',
    hentet: '2026-10-28T03:30:17Z',
    sha256: '8fb54d455ce9ebeefb76ed19c44238c51f3c3b0c9b43df99db48fd23dccc7e44',
    bruk: OFFENTLIG,
  },
  {
    id: 'horowitz-2019',
    type: 'primærlitteratur',
    tittel: 'Horowitz MA, Taylor D. Tapering of SSRI treatment to mitigate withdrawal symptoms. Lancet Psychiatry 2019;6:538–546',
    utgiver: 'Elsevier',
    url: 'https://doi.org/10.1016/S2215-0366(19)30032-X',
    versjon: 'doi:10.1016/S2215-0366(19)30032-X, PMID 30850328',
    hentet: '2026-10-28T03:34:00Z',
    sha256: null,
    bruk: 'Bare sammendraget er lest (Europe PMC). OUSFAR henviser til artikkelen og gjengir fakta med egne ord.',
  },
  {
    id: 'sorensen-2022',
    type: 'primærlitteratur',
    tittel: 'Sørensen A, Ruhé HG, Munkholm K. The relationship between dose and serotonin transporter occupancy of antidepressants – a systematic review. Mol Psychiatry 2022;27:192–201',
    utgiver: 'Springer Nature (CC BY 4.0)',
    url: 'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8960396/fullTextXML',
    versjon: 'doi:10.1038/s41380-021-01285-w, PMC8960396',
    hentet: '2026-10-28T03:34:05Z',
    sha256: '2b243d8f800a9c27766bfe36a386294099e79ec1fa206db92ecf9c12f785524e',
    bruk: OFFENTLIG,
  },
  {
    id: 'keks-2016',
    type: 'oversiktsartikkel',
    tittel: 'Keks N, Hope J, Keogh S. Switching and stopping antidepressants. Aust Prescr 2016;39:76–83',
    utgiver: 'Australian Prescriber',
    url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/',
    versjon: 'doi:10.18773/austprescr.2016.039, PMC4919171',
    hentet: '2026-10-28T03:35:01Z',
    sha256: '55c5b956f46b02f9cc30153a5d76b0dda2764caa9e90c58ef0189d7a88cb7fe7',
    bruk: OFFENTLIG,
  },
  {
    id: 'keks-2019',
    type: 'oversiktsartikkel',
    tittel: 'Keks N, Schwartz D, Hope J. Stopping and switching antipsychotic drugs. Aust Prescr 2019;42:152–157',
    utgiver: 'Australian Prescriber (CC BY-NC-ND 4.0)',
    url: 'https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML',
    versjon: 'doi:10.18773/austprescr.2019.052, PMC6787301',
    hentet: '2026-10-28T03:34:42Z',
    sha256: '26102eb58a5048765c1ad54e52938422c472f18a07bf71ed60c0112855786930',
    bruk: OFFENTLIG,
  },
  {
    id: 'psychiatrienet',
    type: 'kildeoppføring',
    tittel: 'Psychiatrienet, switchtabellene (kildearkivet fra P3)',
    utgiver: 'De Tijdstroom',
    url: 'https://www.psychiatrienet.nl/switchtabel',
    versjon: 'Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json',
    hentet: '2026-10-27T21:09:00Z',
    sha256: null,
    bruk: 'Ingen lisens. Bare henvisning til kildeoppføringen; innholdet vises aldri, verken ordrett, oversatt eller omskrevet.',
  },
]

export const kildeFor = (id: string): Kilde | undefined => KILDER.find((k) => k.id === id)
