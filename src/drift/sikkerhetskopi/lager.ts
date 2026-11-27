/**
 * Kopiene i kopilageret (Backblaze B2): legge inn en ny kopi med lås, lese
 * hvilke kopier som finnes og er hele, forlenge låsen på bitene en ny kopi
 * gjenbruker, rydde det som er utløpt, og regne ut hvor mye som brukes
 * (`docs/drift-gjenoppretting.md`, «Kopiene i drift»).
 *
 * En kopi i lageret er tre slags filer, hver med sin egen lås:
 *
 *   kopier/<navn>.tar.age        selve kopien
 *   kopier/<navn>.tar.age.sig    signaturen, som også er innholdslisten
 *   deler/<identitet>.age        bitene, delt mellom kopiene
 *
 * Signaturen legges inn sist. En kopi regnes som hel bare når signaturen er
 * ekte (mot den offentlige signeringsnøkkelen) og hver fil den lister, finnes
 * i lageret med nøyaktig den md5-summen og størrelsen den oppgir. Lageret har
 * versjoner, så en fil kan få en ny versjon med samme navn; da velges alltid
 * versjonen signaturen beskriver, og en annen versjon brukes aldri.
 */
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { createHash, randomBytes } from 'node:crypto'
import { Stopp } from './feil'
import { lesSignatur, type Delfil, type Signatur } from './signatur'
import { S3, type Versjon } from './s3'
import { KVOTER, LAGER, MAKS_ALDER_TIMER, OPPBEVARING_DOGN, PREFIKS, PROVE_LAS_TIMER, RETTIGHETER, URORT_DOGN } from './drift'

const logg = (tekst: string) => console.log(`[kopilageret] ${tekst}`)
const DOGN = 24 * 3600 * 1000

export const kopinavn = (fil: string) => `${PREFIKS.kopier}${fil}`
export const signaturnavn = (fil: string) => `${PREFIKS.kopier}${fil}.sig`
export const delnavn = (identitet: string) => `${PREFIKS.deler}${identitet}.age`

/** Tidspunktet låsen skal vare til for en kopi laget `laget`. */
export const lasTil = (laget: string | Date, dogn = OPPBEVARING_DOGN) => new Date(new Date(laget).getTime() + dogn * DOGN).toISOString()

/** Versjonen med nøyaktig denne md5-summen og størrelsen, den nyeste om det er flere. */
export function velgVersjon(versjoner: readonly Versjon[], navn: string, md5: string, bytes: number): Versjon | undefined {
  return versjoner.filter((v) => v.navn === navn && !v.slettemerke && v.etag === md5 && v.bytes === bytes).sort((a, b) => b.endret.localeCompare(a.endret))[0]
}

export interface LagretKopi {
  signatur: Signatur
  sigVersjon: Versjon
  /** Kopien og bitene, med versjonene signaturen beskriver; tomt når kopien ikke er hel. */
  filer: Versjon[]
  hel: boolean
  /** Det som mangler, når kopien ikke er hel. */
  mangler: string[]
}

export interface Lagerinnhold {
  versjoner: Versjon[]
  /** De ekte signaturene og kopiene de beskriver, den nyeste først. */
  kopier: LagretKopi[]
  /** Signaturfiler som ikke er ekte eller ikke kan leses. */
  ugyldige: Versjon[]
}

/** Kopien og bitene en ekte signatur beskriver, med versjonene som passer. */
export function finnFiler(versjoner: readonly Versjon[], s: Signatur): { filer: Versjon[]; mangler: string[] } {
  const filer: Versjon[] = []
  const mangler: string[] = []
  const onsket: { navn: string; md5?: string; bytes?: number }[] = [
    { navn: kopinavn(s.fil), md5: s.md5, bytes: s.bytes },
    ...(s.deler ?? []).map((d) => ({ navn: delnavn(d.identitet), md5: d.md5, bytes: d.bytes })),
  ]
  for (const o of onsket) {
    const v = o.md5 !== undefined && o.bytes !== undefined ? velgVersjon(versjoner, o.navn, o.md5, o.bytes) : undefined
    if (v) filer.push(v)
    else mangler.push(o.navn)
  }
  return { filer, mangler }
}

/** Leser hva lageret har: alle versjonene, og hver ekte signatur med filene den beskriver. */
export async function lesLageret(s3: S3, offentligPem: string): Promise<Lagerinnhold> {
  const versjoner = await s3.versjoner()
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-signaturer-'))
  chmodSync(mappe, 0o700)
  const kopier: LagretKopi[] = []
  const ugyldige: Versjon[] = []
  try {
    for (const v of versjoner.filter((x) => !x.slettemerke && x.navn.startsWith(PREFIKS.kopier) && x.navn.endsWith('.sig'))) {
      try {
        if (v.bytes > 1024 * 1024) throw new Stopp('for stor til å være en signatur')
        const fil = join(mappe, randomBytes(8).toString('hex'))
        await s3.hent(v.navn, v.versjon, fil)
        const s = lesSignatur(JSON.parse(readFileSync(fil, 'utf8')), offentligPem)
        if (signaturnavn(s.fil) !== v.navn || s.versjon !== 2) throw new Stopp('gjelder en annen fil')
        const { filer, mangler } = finnFiler(versjoner, s)
        kopier.push({ signatur: s, sigVersjon: v, filer: mangler.length ? [] : filer, hel: !mangler.length, mangler })
      } catch {
        ugyldige.push(v)
      }
    }
  } finally {
    rmSync(mappe, { recursive: true, force: true })
  }
  kopier.sort((a, b) => b.signatur.laget.localeCompare(a.signatur.laget))
  return { versjoner, kopier, ugyldige }
}

/** Den nyeste hele kopien, og bitene den har, etter identiteten: dem trenger ikke neste kopi hente på nytt. */
export function sisteHele(innhold: Lagerinnhold): { kopi?: LagretKopi; kjente: Map<string, Delfil> } {
  const kopi = innhold.kopier.find((k) => k.hel)
  return { kopi, kjente: new Map((kopi?.signatur.deler ?? []).map((d) => [d.identitet, d])) }
}

/** Forlenger låsen på hver fil som ikke alt er låst til `til` eller lenger. Gir antallet som ble forlenget. */
export async function forlengLas(s3: S3, filer: readonly Versjon[], til: string): Promise<number> {
  let n = 0
  for (const v of filer) {
    const las = await s3.las(v.navn, v.versjon)
    if (las && las.til >= til) continue
    await s3.forleng(v.navn, v.versjon, til)
    n++
  }
  return n
}

export interface Opplasting {
  fil: string
  /** Mappen kopien ble skrevet til; bitene ligger i `deler/` der. */
  ut: string
  laget: string
  deler: readonly Delfil[]
  nye: readonly string[]
  sha256: string
  md5: string
  bytes: number
}

/**
 * Legger inn en ny kopi: de nye bitene, kopien, låsen på bitene den
 * gjenbruker forlenges, og til sist signaturen. Først når signaturen ligger
 * der, er kopien hel.
 */
export async function leggInnKopi(s3: S3, o: Opplasting, innhold: Lagerinnhold, summerAv: (fil: string) => Promise<{ sha256: string; md5: string; bytes: number }>): Promise<void> {
  const til = lasTil(o.laget)
  const nye = new Set(o.nye)
  for (const d of o.deler.filter((x) => nye.has(x.identitet))) {
    const fil = join(o.ut, 'deler', `${d.identitet}.age`)
    await s3.leggInn(delnavn(d.identitet), { fil, sha256: d.sha256, md5: d.md5, bytes: d.bytes }, til)
  }
  logg(`${nye.size} nye biter lagt inn`)
  await s3.leggInn(kopinavn(basename(o.fil)), { fil: o.fil, sha256: o.sha256, md5: o.md5, bytes: o.bytes }, til)
  // Bitene kopien gjenbruker, må være låst minst like lenge som den.
  const gjenbrukt = o.deler.filter((d) => !nye.has(d.identitet)).map((d) => {
    const v = velgVersjon(innhold.versjoner, delnavn(d.identitet), d.md5, d.bytes)
    if (!v) throw new Stopp(`Biten ${d.identitet} skulle finnes i lageret, men gjør ikke det. Ingen signatur er lagt inn.`)
    return v
  })
  logg(`låsen på ${await forlengLas(s3, gjenbrukt, til)} av ${gjenbrukt.length} gjenbrukte biter forlenget til ${til}`)
  const sig = `${o.fil}.sig`
  const s = await summerAv(sig)
  await s3.leggInn(signaturnavn(basename(o.fil)), { fil: sig, ...s }, til, 'application/json')
}

export interface Bekreftelse {
  hel: boolean
  avvik: string[]
  filer: number
  hentetTilbake: number
}

/**
 * Kontrollerer en kopi i lageret på nytt fra bunnen: signaturen er ekte og
 * beskriver filene som ligger der, hver fil er låst (Governance) minst til
 * `til`, og kopien, signaturen og de nye bitene kan hentes og har nøyaktig
 * innholdet som ble sendt.
 */
export async function bekreftKopi(
  s3: S3,
  offentligPem: string,
  fil: string,
  nye: readonly string[],
  til: string,
  summerAv: (fil: string) => Promise<{ sha256: string; md5: string; bytes: number }>,
): Promise<Bekreftelse> {
  const innhold = await lesLageret(s3, offentligPem)
  const k = innhold.kopier.find((x) => x.signatur.fil === basename(fil))
  if (!k) return { hel: false, avvik: ['signaturen finnes ikke i lageret, eller er ikke ekte'], filer: 0, hentetTilbake: 0 }
  if (!k.hel) return { hel: false, avvik: k.mangler.map((m) => `${m} mangler`), filer: 0, hentetTilbake: 0 }
  const avvik: string[] = []
  for (const v of [...k.filer, k.sigVersjon]) {
    const las = await s3.las(v.navn, v.versjon)
    if (!las) avvik.push(`${v.navn} er ikke låst`)
    else if (las.modus !== 'GOVERNANCE' && las.modus !== 'COMPLIANCE') avvik.push(`${v.navn} har ukjent lås ${las.modus}`)
    else if (las.til < til) avvik.push(`${v.navn} er låst bare til ${las.til}`)
  }
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-bekreft-'))
  chmodSync(mappe, 0o700)
  const nyeNavn = new Set([kopinavn(basename(fil)), ...nye.map(delnavn)])
  const forventet = new Map<string, string>([
    [kopinavn(basename(fil)), k.signatur.sha256],
    ...(k.signatur.deler ?? []).map((d) => [delnavn(d.identitet), d.sha256] as [string, string]),
  ])
  let hentetTilbake = 0
  try {
    for (const v of k.filer.filter((x) => nyeNavn.has(x.navn))) {
      const lokal = join(mappe, 'fil')
      await s3.hent(v.navn, v.versjon, lokal)
      if ((await summerAv(lokal)).sha256 !== forventet.get(v.navn)) avvik.push(`${v.navn} har et annet innhold i lageret`)
      rmSync(lokal)
      hentetTilbake++
    }
  } finally {
    rmSync(mappe, { recursive: true, force: true })
  }
  return { hel: avvik.length === 0, avvik, filer: k.filer.length + 1, hentetTilbake }
}

export interface Oppryddingsplan {
  slett: Versjon[]
  /** Hvorfor ingenting slettes, når det er grunnen. */
  stopp?: string
  /** Filer utenfor kopiens mapper; de røres aldri. */
  ukjente: Versjon[]
}

/**
 * Hva som kan slettes, uten å røre lageret. Ingenting slettes uten en hel
 * kopi som er ny nok; den nyeste hele kopien og alt kopiene i
 * oppbevaringstiden viser til, beholdes alltid, og det samme gjør alt som er
 * yngre enn `URORT_DOGN` og alt utenfor kopiens mapper. Låste versjoner står
 * på lista, men lageret nekter å slette dem til låsen er ute.
 */
export function oppryddingsplan(innhold: Lagerinnhold, naa: Date): Oppryddingsplan {
  const mapper = Object.values(PREFIKS)
  const ukjente = innhold.versjoner.filter((v) => !mapper.some((m) => v.navn.startsWith(m)))
  const hele = innhold.kopier.filter((k) => k.hel)
  const nyeste = hele[0]
  if (!nyeste || naa.getTime() - new Date(nyeste.signatur.laget).getTime() > MAKS_ALDER_TIMER * 3600 * 1000) {
    return { slett: [], ukjente, stopp: 'Ingen hel kopi fra det siste døgnet; ingenting ryddes før kopieringen virker igjen.' }
  }
  const grense = naa.getTime() - OPPBEVARING_DOGN * DOGN
  const beholdes = new Set<string>()
  const nokkel = (v: Versjon) => `${v.navn}\u0000${v.versjon}`
  for (const k of hele.filter((x) => x === nyeste || new Date(x.signatur.laget).getTime() >= grense)) {
    for (const v of [...k.filer, k.sigVersjon]) beholdes.add(nokkel(v))
  }
  const urort = naa.getTime() - URORT_DOGN * DOGN
  const slett = innhold.versjoner.filter(
    (v) => mapper.some((m) => v.navn.startsWith(m)) && !beholdes.has(nokkel(v)) && new Date(v.endret).getTime() < urort,
  )
  return { slett, ukjente }
}

/** Gjennomfører planen. Låste versjoner står igjen; det er ingen feil. */
export async function rydd(s3: S3, plan: Oppryddingsplan): Promise<{ slettet: number; last: number; bytes: number }> {
  let slettet = 0
  let last = 0
  let bytes = 0
  for (const v of plan.slett) {
    if ((await s3.slett(v.navn, v.versjon)) === 'slettet') {
      slettet++
      bytes += v.bytes
    } else last++
  }
  return { slettet, last, bytes }
}

export interface Forbruk {
  lagerBytes: number
  filer: number
  /** Det kopien hentet ut av Supabase i natt, og det samme ganget opp til en måned. */
  trafikkBytes: number
  trafikkManed: number
  varsler: string[]
}

const gb = (b: number) => `${(b / 1000 ** 3).toFixed(2)} GB`

/** Hvor mye som brukes av gratiskvotene, og varslene når grensene nærmer seg. */
export function forbruk(versjoner: readonly Versjon[], trafikkBytes: number): Forbruk {
  const lagerBytes = versjoner.reduce((s, v) => s + v.bytes, 0)
  const trafikkManed = trafikkBytes * 30
  const varsler: string[] = []
  if (lagerBytes >= KVOTER.lagerBytes * KVOTER.lagerVarsel) {
    varsler.push(`Kopilageret bruker ${gb(lagerBytes)} av ${gb(KVOTER.lagerBytes)} uten kostnad.`)
  }
  if (trafikkManed >= KVOTER.trafikkBytesManed * KVOTER.trafikkVarsel) {
    varsler.push(`Kopiene ville hentet ${gb(trafikkManed)} i måneden ut av Supabase, av ${gb(KVOTER.trafikkBytesManed)} gratis for hele appen.`)
  }
  return { lagerBytes, filer: versjoner.length, trafikkBytes, trafikkManed, varsler }
}

/** Om den nyeste hele kopien er ny nok; ellers hva som er galt. */
export function tilsyn(innhold: Lagerinnhold, naa: Date): { ok: boolean; melding: string; siste?: string } {
  const siste = innhold.kopier.find((k) => k.hel)
  if (!siste) return { ok: false, melding: 'Det finnes ingen hel kopi i lageret.' }
  const timer = (naa.getTime() - new Date(siste.signatur.laget).getTime()) / 3600_000
  return timer > MAKS_ALDER_TIMER
    ? { ok: false, melding: `Den nyeste hele kopien er ${Math.round(timer)} timer gammel (fra ${siste.signatur.laget}).`, siste: siste.signatur.laget }
    : { ok: true, melding: `Den nyeste hele kopien er fra ${siste.signatur.laget}.`, siste: siste.signatur.laget }
}

// --- Nøkkelen og bøtta ---------------------------------------------------------

export interface Rettigheter {
  bucket: string
  s3Adresse: string
  rettigheter: string[]
  ekstra: string[]
}

/**
 * Kontrollerer nøkkelen mot Backblaze uten å vise den: den gjelder bare
 * bøtta i `LAGER`, gir adressen i `LAGER`, har rettighetene jobben trenger og
 * ingen av dem den aldri skal ha. Stopper ved avvik i stedet for å gjette.
 */
export async function kontrollerNokkel(nokkelId: string, nokkel: string, adresse = 'https://api.backblazeb2.com/b2api/v4/b2_authorize_account'): Promise<Rettigheter> {
  const svar = await fetch(adresse, { headers: { authorization: `Basic ${Buffer.from(`${nokkelId}:${nokkel}`).toString('base64')}` } })
  if (!svar.ok) throw new Stopp(`Backblaze godtok ikke nøkkelen (${svar.status}).`)
  const k = (await svar.json()) as {
    apiInfo?: { storageApi?: { s3ApiUrl?: string; allowed?: { buckets?: { id: string; name: string | null }[] | null; capabilities?: string[]; namePrefix?: string | null } } }
  }
  const lager = k.apiInfo?.storageApi
  const tillatt = lager?.allowed
  const bøtter = tillatt?.buckets ?? null
  if (!bøtter || bøtter.length !== 1) throw new Stopp('Nøkkelen gjelder ikke bare én bøtte. Kopijobben skal ha en nøkkel som bare gjelder kopibøtta (ingen hovednøkkel).')
  if (bøtter[0]!.name !== LAGER.bucket) throw new Stopp(`Nøkkelen gjelder bøtta «${bøtter[0]!.name}», ikke «${LAGER.bucket}». Jobben gjetter ikke; rett navnet i drift.ts eller nøkkelen.`)
  if (tillatt?.namePrefix) throw new Stopp('Nøkkelen er begrenset til et filprefiks; kopijobben trenger hele bøtta.')
  if ((lager?.s3ApiUrl ?? '').replace(/\/$/, '') !== LAGER.endepunkt) throw new Stopp(`Bøtta ligger på ${lager?.s3ApiUrl}, ikke ${LAGER.endepunkt}.`)
  const rettigheter = [...(tillatt?.capabilities ?? [])].sort()
  const mangler = RETTIGHETER.kreves.filter((r) => !rettigheter.includes(r))
  if (mangler.length) throw new Stopp(`Nøkkelen mangler rettighetene ${mangler.join(', ')}.`)
  const forbudt = RETTIGHETER.forbudt.filter((r) => rettigheter.includes(r))
  if (forbudt.length) throw new Stopp(`Nøkkelen har rettigheter kopijobben aldri skal ha: ${forbudt.join(', ')}. Lag en ny nøkkel uten dem.`)
  const kjente = new Set<string>([...RETTIGHETER.kreves, 'readBucketRetentions', 'listBuckets', 'readBuckets', 'readBucketEncryption'])
  return { bucket: LAGER.bucket, s3Adresse: LAGER.endepunkt, rettigheter, ekstra: rettigheter.filter((r) => !kjente.has(r)) }
}

/**
 * Prøver lageret med en syntetisk fil, uten produksjonsdata: legger den inn
 * med lås, leser låsen, henter den tilbake og prøver å slette den. Slettingen
 * skal nektes, ellers verner ikke låsen kopiene. Fila blir liggende låst i
 * `PROVE_LAS_TIMER` og ryddes senere.
 */
export async function provLageret(s3: S3, naa = new Date()): Promise<string[]> {
  const funn: string[] = []
  const oppsett = await s3.laseoppsett().catch((e: Error) => {
    funn.push(`Låseoppsettet kunne ikke leses: ${e.message}`)
    return null
  })
  if (oppsett && !oppsett.pa) throw new Stopp('Bøtta har ikke Object Lock. Kopiene kan da slettes av den som har nøkkelen.')
  if (oppsett?.standard) funn.push(`Bøtta har standardlås ${oppsett.standard.modus} ${oppsett.standard.dager ?? ''}${oppsett.standard.dager ? ' døgn' : ''}${oppsett.standard.ar ? `${oppsett.standard.ar} år` : ''}.`)
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-lagerprove-'))
  try {
    const innhold = randomBytes(4096)
    const fil = join(mappe, 'prove')
    writeFileSync(fil, innhold)
    const sha256 = createHash('sha256').update(innhold).digest('hex')
    const md5 = createHash('md5').update(innhold).digest('hex')
    const navn = `${PREFIKS.prove}${naa.toISOString().replace(/[:.]/g, '-')}-${randomBytes(4).toString('hex')}`
    const til = new Date(naa.getTime() + PROVE_LAS_TIMER * 3600 * 1000).toISOString()
    const versjon = await s3.leggInn(navn, { fil, sha256, md5, bytes: innhold.length }, til)
    const las = await s3.las(navn, versjon)
    if (!las || las.modus !== 'GOVERNANCE' || las.til < til) throw new Stopp(`Prøvefila ble ikke låst som den skulle (${JSON.stringify(las)}).`)
    const tilbake = join(mappe, 'tilbake')
    await s3.hent(navn, versjon, tilbake)
    if (createHash('sha256').update(readFileSync(tilbake)).digest('hex') !== sha256) throw new Stopp('Prøvefila kom ikke tilbake uendret.')
    if ((await s3.slett(navn, versjon)) !== 'last') throw new Stopp('Den låste prøvefila kunne slettes. Låsen verner ikke kopiene; ingen kopi tas.')
    return funn
  } finally {
    rmSync(mappe, { recursive: true, force: true })
  }
}

/**
 * Sletter prøvefilene fra kontrollene som er eldre enn `URORT_DOGN` (låsen
 * deres er da ute). Rører ingenting annet. Gir antallet som ble slettet.
 */
export async function ryddProver(s3: S3, naa = new Date()): Promise<number> {
  const grense = naa.getTime() - URORT_DOGN * DOGN
  const gamle = (await s3.versjoner(PREFIKS.prove)).filter((v) => v.navn.startsWith(PREFIKS.prove) && new Date(v.endret).getTime() < grense)
  return (await rydd(s3, { slett: gamle, ukjente: [] })).slettet
}

/**
 * Henter en hel kopi fra lageret til en mappe, klar for `gjenopprett`:
 * kopien, signaturen og bitene i `deler/`, hver kontrollert mot signaturen.
 * Uten `fil` hentes den nyeste hele kopien.
 */
export async function hentKopi(
  s3: S3,
  offentligPem: string,
  ut: string,
  summerAv: (fil: string) => Promise<{ sha256: string; md5: string; bytes: number }>,
  fil?: string,
): Promise<{ kopi: string; laget: string }> {
  const innhold = await lesLageret(s3, offentligPem)
  const k = fil ? innhold.kopier.find((x) => x.signatur.fil === fil) : innhold.kopier.find((x) => x.hel)
  if (!k) throw new Stopp(fil ? `Fant ingen ekte signatur for ${fil} i lageret.` : 'Lageret har ingen hel kopi.')
  if (!k.hel) throw new Stopp(`Kopien ${k.signatur.fil} er ikke hel: ${k.mangler.join(', ')} mangler.`)
  mkdirSync(join(ut, 'deler'), { recursive: true, mode: 0o700 })
  const forventet = new Map<string, string>([
    [kopinavn(k.signatur.fil), k.signatur.sha256],
    ...(k.signatur.deler ?? []).map((d) => [delnavn(d.identitet), d.sha256] as [string, string]),
  ])
  for (const v of k.filer) {
    const lokal = v.navn.startsWith(PREFIKS.kopier) ? join(ut, basename(v.navn)) : join(ut, 'deler', basename(v.navn))
    await s3.hent(v.navn, v.versjon, lokal)
    if ((await summerAv(lokal)).sha256 !== forventet.get(v.navn)) throw new Stopp(`${v.navn} har et annet innhold enn signaturen sier.`)
  }
  await s3.hent(k.sigVersjon.navn, k.sigVersjon.versjon, join(ut, `${k.signatur.fil}.sig`))
  logg(`hentet ${k.signatur.fil} med ${k.signatur.deler?.length ?? 0} biter til ${ut}`)
  return { kopi: join(ut, k.signatur.fil), laget: k.signatur.laget }
}
