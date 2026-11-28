/**
 * Innstillingene for kopiene i drift (tiltak 3, `docs/drift-gjenoppretting.md`,
 * «Kopiene i drift»), samlet ett sted. Ingen av dem er hemmelige; nøklene
 * ligger i GitHub-miljøet `backup`.
 */

/**
 * Bryteren for kopiering av produksjonen. Står den av, gjør jobben bare
 * kontrollen av lageret (`kontroll`) og ingenting med produksjonsdataene,
 * også om noen starter den med modus `kopi`. Den slås på i en egen PR når
 * nøkkeleieren (Peder, 28.11.2026) har lagt nøklene og tokenet i miljøet
 * `backup` (`docs/sikkerhetskopi-personvern.md`).
 */
export const PRODUKSJONSKOPI_PA = false

/** Kopilageret: Backblaze B2 i EU, med S3-API-et. Avviker nøkkelens bøtte eller adresse, stopper jobben i stedet for å gjette. */
export const LAGER = {
  bucket: 'ousfar-backup',
  endepunkt: 'https://s3.eu-central-003.backblazeb2.com',
  region: 'eu-central-003',
} as const

/** Hvor lenge en kopi tas vare på og er låst (Governance), i døgn. */
export const OPPBEVARING_DOGN = 7

/** Objekter yngre enn dette ryddes aldri, uansett hva de er (en kopi som er under arbeid, en prøve). */
export const URORT_DOGN = 2

/** Den nyeste fullstendige kopien må være yngre enn dette, ellers er en kopi uteblitt. */
export const MAKS_ALDER_TIMER = 26

/** Prøvefilene fra kontrollen av lageret låses så lenge. */
export const PROVE_LAS_TIMER = 24

/** Mappene i bøtta. Det som ligger utenfor dem, røres aldri. */
export const PREFIKS = { kopier: 'kopier/', deler: 'deler/', prove: 'prove/' } as const

/**
 * Gratiskvotene kopiene skal holde seg innenfor (27.11.2026), og når det
 * varsles. 0 kr er målet, ikke en garanti: kvotene kan endres av
 * leverandørene.
 */
export const KVOTER = {
  /** Backblaze B2: 10 GB lagring uten kostnad. */
  lagerBytes: 10 * 1000 ** 3,
  /** Supabase gratisplan: 5 GB trafikk ut i måneden, delt med appen. */
  trafikkBytesManed: 5 * 1000 ** 3,
  /** Varsle når lageret har nådd denne andelen. */
  lagerVarsel: 0.7,
  /** Varsle når kopiene alene ville brukt denne andelen av trafikken i måneden, regnet fra denne natten. */
  trafikkVarsel: 0.3,
} as const

/**
 * Nøkkelrettighetene kopijobben trenger i Backblaze, og de den aldri skal ha.
 * `bypassGovernance` ville latt den som har nøkkelen, slette låste kopier.
 * Nettsiden til Backblaze gir en nøkkel for én bøtte alltid også
 * `bypassGovernance`, `writeBucketRetentions` og `writeBuckets` (sett i den
 * første kontrollen 28.11.2026), så nøkkelen lages av nøkkelbyttet
 * (`nokkelbytte.ts`) med nøyaktig `ny`.
 */
const KREVES = ['listFiles', 'readFiles', 'writeFiles', 'deleteFiles', 'readFileRetentions', 'writeFileRetentions', 'readBucketRetentions'] as const

export const RETTIGHETER = {
  kreves: KREVES,
  /** Det nøkkelbyttet ber Backblaze om: det som kreves, og å finne og lese bøtta. */
  ny: [...KREVES, 'listBuckets', 'readBuckets'],
  /** Med en av disse stopper jobben: nøkkelen kan da slette låste kopier, endre låsen eller bøtta, eller lage nye nøkler. */
  forbudt: ['bypassGovernance', 'writeBucketRetentions', 'writeKeys', 'deleteKeys', 'deleteBuckets', 'writeBuckets'],
} as const

/**
 * Nøkkelbyttet (`.github/workflows/lagernokkel.yml`): GitHub-miljøet med
 * hemmelighetene, navnet de nye nøklene får i Backblaze, og de midlertidige
 * hemmelighetene byttet bruker og som ryddesteget sletter etterpå.
 *
 * Nøkkelen til lageret ligger som ett par, `keyID:nøkkel`, i én hemmelighet
 * (`par`), så ID og nøkkel alltid byttes samlet. `gamle` er de to
 * hemmelighetene paret erstatter; de leses fortsatt når paret mangler
 * (en nøkkel laget for hånd ved en gjenoppretting), og slettes etter et bytte.
 */
export const NOKKELBYTTE = {
  miljo: 'backup',
  navnPrefiks: 'ousfar-kopijobben-',
  hemmeligheter: { par: 'B2_LAGERNOKKEL', gamle: { id: 'B2_KEY_ID', nokkel: 'B2_APPLICATION_KEY' } },
  midlertidige: { id: 'B2_OPPSETT_ID', nokkel: 'B2_OPPSETT_NOKKEL', github: 'KOPI_GITHUB_TOKEN' },
} as const
