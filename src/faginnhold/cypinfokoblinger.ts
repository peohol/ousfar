/**
 * Legemidlene i CYPinfo uten FEST-ID, koblet til fagsidene de gjelder
 * (`docs/cypinfo-integrasjon.md`, «Anbefalt koblingsmetode»).
 *
 * Et legemiddel med FEST-ID kobles automatisk: en fagside viser det når sidens
 * publiserte FEST-kobling har ID-en. De som mangler den, kobles bare her, med
 * samme regel som ClinPGx-koblingene fulgte: navnet og minst ett uavhengig kjennetegn til
 * (ATC-koden, etter normalisering). Et navn alene er aldri nok, og en
 * metabolitt kobles aldri til moderstoffets oppføring. Vurdert mot CYPinfo og
 * fagsidene i produksjonen 16. november 2026.
 *
 * Et legemiddel uten FEST-ID og uten fagside står også her, med `side: null`,
 * så det er vurdert. Synkroniseringen melder hvert legemiddel uten FEST-ID som
 * ikke står her, og dekningsoversikten (`cypinfodekning.ts`) bruker listen.
 * Appen leser den i etappe D.
 */

/** Det som stemmer, utenom navnet. */
export type Cypinfogrunnlag = 'atc' | 'varenavn'

export interface Cypinfokobling {
  /** Navnet på fagsiden, eller `null` når legemiddelet er vurdert og OUSFAR ikke har noen side for det. */
  side: string | null
  /** CYPinfos ID og navn for legemiddelet. */
  cypinfo_id: string
  navn: string
  /** ATC-koden CYPinfo og FEST har, normalisert. */
  atc: string | null
  grunnlag: readonly Cypinfogrunnlag[]
  merknad?: string
}

const kobling = (
  side: string | null,
  cypinfo_id: string,
  navn: string,
  atc: string | null,
  grunnlag: readonly Cypinfogrunnlag[],
  merknad?: string,
): Cypinfokobling => ({ side, cypinfo_id, navn, atc, grunnlag, ...(merknad ? { merknad } : {}) })

export const CYPINFOKOBLINGER: readonly Cypinfokobling[] = [
  kobling('Amisulprid', '67c15e0e-cf91-4cfe-ad29-f3e823bb9a25', 'amisulprid', 'N05AL05', ['atc']),
  kobling(
    'Ketamin',
    '472c4749-82f0-4a50-b6bd-e5ff754af0cb',
    'esketamin',
    'N06AX27',
    ['atc'],
    'Ketaminsiden er koblet til både ketamin og esketamin i FEST. CYPinfo gjelder bare esketamin og skal vises som esketamin.',
  ),
  kobling('Flupentiksol', 'b2026c71-cc73-443e-99a4-469ef8e66338', 'flupentiksol', 'N05AF01', ['atc']),
  kobling(
    'Kariprazin',
    '57ca875b-9347-4263-bca0-26844c4b1cef',
    'kariprazin',
    null,
    ['varenavn'],
    'CYPinfo har ATC-koden N05AX16, som er brekspiprazols; kariprazin er N05AX15. Koblingen hviler på navnet og varenavnet Reagila. Brekspiprazol kobles ikke.',
  ),
  kobling(
    'Klorprotiksen',
    'c41560ad-1d68-45ea-b3d8-324626275fae',
    'klorprotiksen',
    'N05AF02',
    ['atc'],
    'ATC-koden står ikke på siden i FEST, men er WHOs kode for klorprotiksen.',
  ),
  kobling('Klozapin', 'db93975d-468b-48b8-b2d5-27103c16bdf8', 'klozapin', 'N05AH02', ['atc']),
  kobling('Kvetiapin', '864e156a-2dd3-4194-8715-1356ab05da09', 'kvetiapin', 'N05AH04', ['atc']),
  kobling('Levomepromazin', '513d025a-d2ef-46d4-841a-c8f6d1adff91', 'levomepromazin', 'N05AA02', ['atc']),
  kobling('Litium', '5f2579f2-8c69-44ee-9c2a-0d2a4a8642fe', 'litium', 'N05AN01', ['atc']),
  kobling('Lurasidon', '066ac92e-563e-418e-a498-59e86fd7d8dc', 'lurasidon', 'N05AE05', ['atc']),
  kobling('Olanzapin', '8ce78686-bd80-44e1-bd37-4109eb893053', 'olanzapin', 'N05AH03', ['atc']),
  kobling(
    'Paliperidon',
    'cda65314-71e5-4ddf-bf56-88968cfa7bf9',
    'paliperidon',
    'N05AX13',
    ['atc'],
    'Bare Paliperidon. Hydroksyrisperidon er også risperidons metabolitt, og en metabolitt kobles ikke til moderstoffets oppføring.',
  ),
  kobling('Ziprasidon', '4558e01a-5540-4b40-b732-0f07806ef4cb', 'ziprasidon', 'N05AE04', ['atc']),
  // Uten fagside i OUSFAR. Om de skal få en, er et faglig valg.
  kobling(null, 'ae11ae08-b771-47ad-a523-b958982a6363', 'proklorperazin', 'N05AB04', [], 'OUSFAR har ingen fagside for proklorperazin.'),
  kobling(null, '9f2ac98b-3436-4514-9f57-edf68bfbba08', 'reboksetin', 'N06AX18', [], 'OUSFAR har ingen fagside for reboksetin.'),
]

/** CYPinfo-ID-ene som er koblet til en side, per side. */
export function cypinfoIderForSide(side: string, koblinger: readonly Cypinfokobling[] = CYPINFOKOBLINGER): string[] {
  return koblinger.filter((k) => k.side === side).map((k) => k.cypinfo_id)
}
