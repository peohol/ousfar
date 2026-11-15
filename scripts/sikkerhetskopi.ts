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
 *       [--signatur <fil.sig>] [--fjern-krypterte-faktorer]
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
import { Stopp, gjenopprett, lagReferanse, lesReferanse, taKopi } from '../src/drift/sikkerhetskopi/kopi'
import { lagSigneringsnokler } from '../src/drift/sikkerhetskopi/signatur'

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
  if (!v) throw new Stopp(`Mangler ${navn} (${hva}).`)
  return v
}

const nokkel = () => fraMiljo('KOPI_SECRET_KEY', 'hemmelig nøkkel for Storage i prosjektet')

async function main(argv: string[]): Promise<void> {
  const [kommando, ...resten] = argv
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
      migrasjoner: resolve(dirname(fileURLToPath(import.meta.url)), '../supabase/migrations'),
      prosjekt,
      token: prosjekt ? process.env.SUPABASE_ACCESS_TOKEN : undefined,
      kontrollnokkel,
      signeringsnokkel: fraMiljo('KOPI_SIGNERINGSNOKKEL', 'den private signeringsnøkkelen, PEM'),
    })
    console.log(`Kopien er tatt${forsok > 1 ? ` i forsøk ${forsok}` : ''}: ${fil}`)
  } else if (kommando === 'gjenopprett') {
    const r = await gjenopprett({
      kopi: ett('kopi', resten),
      identitet: ett('identitet', resten),
      dbUrl: ett('db-url', resten),
      apiUrl: ett('api-url', resten),
      nokkel: nokkel(),
      avsender: readFileSync(ett('avsender', resten), 'utf8'),
      signatur: valg('signatur', resten)[0],
      krypterteFaktorer: resten.includes('--fjern-krypterte-faktorer') ? 'fjern' : 'stopp',
    })
    if (r.avvik.length) throw new Stopp(`Gjenopprettingen er ikke lik kilden:\n- ${r.avvik.join('\n- ')}`)
    console.log(`Gjenopprettet og kontrollert på ${r.sekunder} s: like tabeller, filer og tilpasninger.`)
    if (r.fjernedeFaktorer.length) console.log(`Melder inn tofaktor på nytt: ${r.fjernedeFaktorer.join(', ')}`)
  } else {
    throw new Stopp('Bruk: signeringsnokler | referanse | ta | gjenopprett (se docs/drift-gjenoppretting.md).')
  }
}

main(process.argv.slice(2)).catch((feil: unknown) => {
  console.error(feil instanceof Stopp ? feil.message : feil)
  process.exit(1)
})
