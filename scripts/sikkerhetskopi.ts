/**
 * Kryptert sikkerhetskopi og gjenoppretting (`docs/drift-gjenoppretting.md`):
 *
 *   npm run sikkerhetskopi -- signeringsnokler --ut <mappe>
 *   npm run sikkerhetskopi -- referanse --db-url <ren Supabase> --ut referanse.json
 *   npm run sikkerhetskopi -- ta --db-url <kilde> --api-url <kilde> --referanse referanse.json \
 *       --mottaker <offentlig age-nøkkel> [--mottaker …] --ut <mappe> [--prosjekt <ref>] \
 *       [--kontrollnokkel <privat age-nøkkelfil>]
 *   npm run sikkerhetskopi -- gjenopprett --kopi <fil.tar.age> --identitet <privat age-nøkkelfil> \
 *       --avsender <offentlig signeringsnøkkel> --db-url <nytt, tomt prosjekt> --api-url <samme> \
 *       [--signatur <fil.sig>] [--deler <mappe>] [--fjern-krypterte-faktorer]
 *
 * Kopiene i drift (`.github/workflows/sikkerhetskopi.yml`, «Kopiene i drift»):
 *
 *   npm run sikkerhetskopi -- kontroll     nøkkelen og lageret, uten produksjonsdata
 *   npm run sikkerhetskopi -- natt         nattens kopi av produksjonen til lageret
 *   npm run sikkerhetskopi -- tilsyn       om det finnes en hel kopi fra det siste døgnet
 *   npm run sikkerhetskopi -- nokkelbytte  ny nøkkel til lageret (`.github/workflows/lagernokkel.yml`)
 *   npm run sikkerhetskopi -- hent --avsender <nøkkelfila eller den offentlige signeringsnøkkelen> --ut <mappe> [--kopi <fil.tar.age>]
 *
 * De fire leser nøkkelen til lageret fra `B2_KEY_ID` og `B2_APPLICATION_KEY`.
 * `natt` og `tilsyn` leser også `KOPI_SIGNERINGSNOKKEL`, og `natt` leser
 * `KOPI_MOTTAKERE` (de offentlige age-nøklene, skilt med mellomrom eller
 * komma) og `SUPABASE_ACCESS_TOKEN`. `natt` gjør ingenting før
 * `PRODUKSJONSKOPI_PA` er slått på i `src/drift/sikkerhetskopi/drift.ts`.
 *
 * Nøklene leses fra miljøet, aldri fra kommandolinjen: `KOPI_SECRET_KEY` er
 * den hemmelige nøkkelen (service role) for Storage i prosjektet kommandoen
 * gjelder, og `SUPABASE_ACCESS_TOKEN` brukes bare med `--prosjekt`, for
 * Auth-innstillingene og navnene på hemmelighetene. `KOPI_SIGNERINGSNOKKEL` er
 * den private signeringsnøkkelen (PEM) til `ta`; hver kopi får en signatur,
 * `<kopi>.sig`, og `gjenopprett` kontrollerer den mot `--avsender` før noe i
 * kopien åpnes. `signeringsnokler` lager et nytt par.
 *
 * `--db-url` for `ta` må være en direkte tilkobling eller en tilkobling i
 * sesjonsmodus, fordi kopipunktet holdes i én åpen transaksjon. `pg_dump` må
 * ha minst serverens hovedversjon; ellers settes `KOPI_PG_BILDE` til et
 * Postgres-bilde med den, og dumpene kjøres i Docker.
 *
 * `gjenopprett` nekter produksjonen og et mål som ikke er tomt, og stopper
 * med avvikene hvis noe ikke er likt kilden etterpå. Har kopien tofaktornøkler
 * plattformen har kryptert, begynner den bare med `--fjern-krypterte-faktorer`:
 * de kan ikke leses i et nytt prosjekt, så faktorene fjernes etter kontrollen,
 * og brukerne som må melde inn tofaktor på nytt, skrives ut.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Stopp, gjenopprett, lagReferanse, lesReferanse, summerAv, taKopi } from '../src/drift/sikkerhetskopi/kopi'
import { LAGER, NOKKELBYTTE, PRODUKSJONSKOPI_PA } from '../src/drift/sikkerhetskopi/drift'
import { byttNokkel, bytterapport } from '../src/drift/sikkerhetskopi/nokkelbytte'
import { forbruk, hentKopi, kontrollerNokkel, lesLageret, provLageret, ryddProver, tilsyn } from '../src/drift/sikkerhetskopi/lager'
import { kjorNatt, lesMottakere, rapporttekst } from '../src/drift/sikkerhetskopi/natt'
import { apneProsjekt } from '../src/drift/sikkerhetskopi/prosjekt'
import { aktiverTryggLogg, avsluttMedFeil, masker, oppsummer, settTrinn, skriv } from '../src/drift/sikkerhetskopi/logg'
import { OffentligStopp } from '../src/drift/sikkerhetskopi/feil'
import { PROSJEKT } from '../src/drift/managementApi'
import { lagReferanseMedVersjoner } from '../src/drift/sikkerhetskopi/referanse'
import { offentligFraNokkelfil } from '../src/drift/sikkerhetskopi/nokler'
import { S3 } from '../src/drift/sikkerhetskopi/s3'
import { lagSigneringsnokler, offentligNokkel } from '../src/drift/sikkerhetskopi/signatur'

const MIGRASJONER = resolve(dirname(fileURLToPath(import.meta.url)), '../supabase/migrations')

function valg(navn: string, argv: string[]): string[] {
  const ut: string[] = []
  argv.forEach((a, i) => {
    if (a === `--${navn}` && argv[i + 1]) ut.push(argv[i + 1]!)
  })
  return ut
}

function ett(navn: string, argv: string[]): string {
  const [v] = valg(navn, argv)
  if (!v) throw new Stopp(`Mangler --${navn}.`)
  return v
}

function fraMiljo(navn: string, hva: string): string {
  const v = process.env[navn]
  if (!v) throw new OffentligStopp(`Mangler ${navn} (${hva}).`)
  return v
}

const nokkel = () => fraMiljo('KOPI_SECRET_KEY', 'hemmelig nøkkel for Storage i prosjektet')
const signeringsnokkel = () => fraMiljo('KOPI_SIGNERINGSNOKKEL', 'den private signeringsnøkkelen, PEM')

/** Lageret, etter at nøkkelen er kontrollert: bare kopibøtta, de riktige rettighetene og ingen farlige. */
async function apneLager(): Promise<{ s3: S3; ekstra: string[] }> {
  settTrinn('nøkkelen til lageret')
  const nokkelId = fraMiljo('B2_KEY_ID', 'ID-en til nøkkelen for kopilageret')
  const hemmelig = fraMiljo('B2_APPLICATION_KEY', 'nøkkelen for kopilageret')
  masker(hemmelig)
  const r = await kontrollerNokkel(nokkelId, hemmelig)
  return { s3: new S3({ endepunkt: r.s3Adresse, region: LAGER.region, bucket: r.bucket, nokkelId, nokkel: hemmelig }), ekstra: r.ekstra }
}

/** Nøkkelen og lageret, med en syntetisk prøvefil; ingen produksjonsdata. */
async function kontroll(): Promise<void> {
  const { s3, ekstra } = await apneLager()
  settTrinn('prøven av lageret')
  const funn = await provLageret(s3)
  const ryddet = await ryddProver(s3)
  const linjer = [
    '## Kontroll av kopilageret',
    '',
    `- Nøkkelen gjelder bare ${LAGER.bucket} på ${LAGER.endepunkt}, med rettighetene jobben trenger og ingen av dem den aldri skal ha.${ekstra.length ? ` Den har også: ${ekstra.join(', ')}.` : ''}`,
    '- Bøtta har Object Lock: en syntetisk prøvefil ble lagt inn låst (Governance), hentet tilbake uendret, og slettingen ble nektet.',
    ...funn.map((f) => `- ${f}`),
    `- ${ryddet} gamle prøvefiler ryddet.`,
    `- Kopiering av produksjonen er ${PRODUKSJONSKOPI_PA ? 'slått på' : 'ikke slått på ennå'}.`,
  ]
  if (process.env.KOPI_SIGNERINGSNOKKEL) {
    const t = tilsyn(await lesLageret(s3, offentligNokkel(signeringsnokkel())), new Date())
    linjer.push(`- ${t.melding}`)
  }
  if (process.env.KOPI_MOTTAKERE) linjer.push(`- ${lesMottakere(process.env.KOPI_MOTTAKERE).length} offentlige age-nøkler å kryptere til.`)
  oppsummer(linjer.join('\n'))
}

/** Kommandoene GitHub-jobben kjører; loggen deres er offentlig og får bare det jobben selv setter sammen (`logg.ts`). */
const DRIFTSKOMMANDOER = new Set(['kontroll', 'natt', 'tilsyn', 'nokkelbytte'])

async function main(argv: string[]): Promise<void> {
  const [kommando, ...resten] = argv
  if (DRIFTSKOMMANDOER.has(kommando ?? '')) aktiverTryggLogg()
  if (kommando === 'signeringsnokler') {
    const ut = ett('ut', resten)
    const privat = join(ut, 'signering.privat.pem')
    if (existsSync(privat)) throw new Stopp(`${privat} finnes alt; en nøkkel overskrives aldri.`)
    mkdirSync(ut, { recursive: true, mode: 0o700 })
    const n = lagSigneringsnokler()
    writeFileSync(privat, n.privat, { mode: 0o600 })
    writeFileSync(join(ut, 'signering.offentlig.pem'), n.offentlig)
    console.log(`Nøklene er skrevet til ${ut}: den private til kopijobben, den offentlige til den som gjenoppretter.`)
  } else if (kommando === 'referanse') {
    const ut = ett('ut', resten)
    writeFileSync(ut, JSON.stringify(lagReferanse(ett('db-url', resten)), null, 2))
    console.log(`Referansen er skrevet til ${ut}.`)
  } else if (kommando === 'ta') {
    const [prosjekt] = valg('prosjekt', resten)
    const [kontrollnokkel] = valg('kontrollnokkel', resten)
    const { fil, forsok } = await taKopi({
      dbUrl: ett('db-url', resten),
      apiUrl: ett('api-url', resten),
      nokkel: nokkel(),
      referanse: lesReferanse(ett('referanse', resten)),
      mottakere: valg('mottaker', resten),
      ut: ett('ut', resten),
      migrasjoner: MIGRASJONER,
      prosjekt,
      token: prosjekt ? process.env.SUPABASE_ACCESS_TOKEN : undefined,
      kontrollnokkel,
      signeringsnokkel: signeringsnokkel(),
    })
    console.log(`Kopien er tatt${forsok > 1 ? ` i forsøk ${forsok}` : ''}: ${fil}`)
  } else if (kommando === 'gjenopprett') {
    const r = await gjenopprett({
      kopi: ett('kopi', resten),
      identitet: ett('identitet', resten),
      dbUrl: ett('db-url', resten),
      apiUrl: ett('api-url', resten),
      nokkel: nokkel(),
      avsender: offentligFraNokkelfil(readFileSync(ett('avsender', resten), 'utf8')),
      signatur: valg('signatur', resten)[0],
      deler: valg('deler', resten)[0],
      krypterteFaktorer: resten.includes('--fjern-krypterte-faktorer') ? 'fjern' : 'stopp',
    })
    if (r.avvik.length) throw new Stopp(`Gjenopprettingen er ikke lik kilden:\n- ${r.avvik.join('\n- ')}`)
    console.log(`Gjenopprettet og kontrollert på ${r.sekunder} s: like tabeller, filer og tilpasninger.`)
    if (r.fjernedeFaktorer.length) console.log(`Melder inn tofaktor på nytt: ${r.fjernedeFaktorer.join(', ')}`)
  } else if (kommando === 'kontroll') {
    await kontroll()
  } else if (kommando === 'natt') {
    if (!PRODUKSJONSKOPI_PA) {
      // Til den er slått på, kontrollerer nattjobben bare lageret og rører ikke produksjonen.
      skriv('Kopiering av produksjonen er ikke slått på (PRODUKSJONSKOPI_PA i src/drift/sikkerhetskopi/drift.ts). Bare lageret kontrolleres.')
      return kontroll()
    }
    const mottakere = lesMottakere(fraMiljo('KOPI_MOTTAKERE', 'de offentlige age-nøklene'))
    const privat = signeringsnokkel()
    const { s3 } = await apneLager()
    settTrinn('prosjektet')
    const prosjekt = await apneProsjekt()
    settTrinn('referansen')
    // Referansen bygges før databaserollen lages: den bygges synkront og kan vare lenger enn passordet.
    const referanse = lagReferanseMedVersjoner(prosjekt.versjoner)
    settTrinn('databasen')
    const db = await prosjekt.apneDatabase()
    let rapport
    try {
      rapport = await kjorNatt({
        s3,
        dbUrl: db.dbUrl,
        apiUrl: prosjekt.apiUrl,
        nokkel: prosjekt.nokkel,
        referanse,
        mottakere,
        migrasjoner: MIGRASJONER,
        prosjekt: PROSJEKT,
        token: fraMiljo('SUPABASE_ACCESS_TOKEN', 'tokenet for Management API-et'),
        signeringsnokkel: privat,
      })
    } finally {
      await db.lukk()
    }
    oppsummer(rapporttekst(rapport))
    if (rapport.forbruk.varsler.length) throw new OffentligStopp(`Kopien er tatt, men med varsler:\n- ${rapport.forbruk.varsler.join('\n- ')}`)
  } else if (kommando === 'tilsyn') {
    if (!PRODUKSJONSKOPI_PA) return oppsummer('Kopiering av produksjonen er ikke slått på ennå; det er ingen kopier å holde tilsyn med.')
    const { s3 } = await apneLager()
    const innhold = await lesLageret(s3, offentligNokkel(signeringsnokkel()))
    const t = tilsyn(innhold, new Date(), process.env.KOPI_MOTTAKERE ? lesMottakere(process.env.KOPI_MOTTAKERE) : undefined)
    const f = forbruk(innhold.versjoner, 0)
    oppsummer(`## Tilsyn med kopiene\n\n- ${t.melding}\n- ${innhold.kopier.filter((k) => k.hel).length} hele kopier i lageret.${f.varsler.map((v) => `\n- ${v}`).join('')}`)
    if (!t.ok) throw new OffentligStopp(t.melding)
    if (f.varsler.length) throw new OffentligStopp(f.varsler.join('\n'))
  } else if (kommando === 'nokkelbytte') {
    settTrinn('de midlertidige nøklene')
    const m = NOKKELBYTTE.midlertidige
    const oppsett = { id: fraMiljo(m.id, 'ID-en til den midlertidige nøkkelen i Backblaze'), nokkel: fraMiljo(m.nokkel, 'den midlertidige nøkkelen i Backblaze') }
    const token = fraMiljo(m.github, 'GitHub-tokenet for hemmelighetene i miljøet')
    masker(oppsett.nokkel)
    masker(token)
    const r = await byttNokkel({ oppsett, gammelId: process.env.B2_KEY_ID || undefined, github: { token, repo: fraMiljo('GITHUB_REPOSITORY', 'repoet') } })
    oppsummer(bytterapport(r))
    if (r.stopp) throw new OffentligStopp(r.stopp)
  } else if (kommando === 'hent') {
    const ut = ett('ut', resten)
    mkdirSync(ut, { recursive: true, mode: 0o700 })
    const { s3 } = await apneLager()
    const r = await hentKopi(s3, offentligFraNokkelfil(readFileSync(ett('avsender', resten), 'utf8')), ut, summerAv, valg('kopi', resten)[0])
    console.log(`Kopien fra ${r.laget} er hentet og kontrollert: ${r.kopi}. Gjenopprett med «gjenopprett --kopi ${r.kopi}».`)
  } else {
    throw new Stopp('Bruk: signeringsnokler | referanse | ta | gjenopprett | kontroll | natt | tilsyn | nokkelbytte | hent (se docs/drift-gjenoppretting.md).')
  }
}

main(process.argv.slice(2)).catch(avsluttMedFeil)
