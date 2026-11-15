/**
 * Kryptert sikkerhetskopi og gjenoppretting (`docs/drift-gjenoppretting.md`):
 *
 *   npm run sikkerhetskopi -- referanse --db-url <ren Supabase> --ut referanse.json
 *   npm run sikkerhetskopi -- ta --db-url <kilde> --api-url <kilde> --referanse referanse.json \
 *       --mottaker <offentlig age-nøkkel> [--mottaker …] --ut <mappe> [--prosjekt <ref>] \
 *       [--kontrollnokkel <privat age-nøkkelfil>]
 *   npm run sikkerhetskopi -- gjenopprett --kopi <fil.tar.age> --identitet <privat age-nøkkelfil> \
 *       --db-url <nytt, tomt prosjekt> --api-url <samme>
 *
 * Nøklene leses fra miljøet, aldri fra kommandolinjen: `KOPI_SECRET_KEY` er
 * den hemmelige nøkkelen (service role) for Storage i prosjektet kommandoen
 * gjelder, og `SUPABASE_ACCESS_TOKEN` brukes bare med `--prosjekt`, for
 * Auth-innstillingene og navnene på hemmelighetene.
 *
 * `--db-url` for `ta` må være en direkte tilkobling eller en tilkobling i
 * sesjonsmodus, fordi kopipunktet holdes i én åpen transaksjon. `pg_dump` må
 * ha minst serverens hovedversjon; ellers settes `KOPI_PG_BILDE` til et
 * Postgres-bilde med den, og dumpene kjøres i Docker.
 *
 * `gjenopprett` nekter produksjonen og et mål som ikke er tomt, og stopper
 * med avvikene hvis noe ikke er likt kilden etterpå.
 */
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Stopp, gjenopprett, lagReferanse, lesReferanse, taKopi } from '../src/drift/sikkerhetskopi/kopi'

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

function nokkel(): string {
  const n = process.env.KOPI_SECRET_KEY
  if (!n) throw new Stopp('Mangler KOPI_SECRET_KEY (hemmelig nøkkel for Storage i prosjektet).')
  return n
}

async function main(argv: string[]): Promise<void> {
  const [kommando, ...resten] = argv
  if (kommando === 'referanse') {
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
    })
    console.log(`Kopien er tatt${forsok > 1 ? ` i forsøk ${forsok}` : ''}: ${fil}`)
  } else if (kommando === 'gjenopprett') {
    const r = await gjenopprett({
      kopi: ett('kopi', resten),
      identitet: ett('identitet', resten),
      dbUrl: ett('db-url', resten),
      apiUrl: ett('api-url', resten),
      nokkel: nokkel(),
    })
    if (r.avvik.length) throw new Stopp(`Gjenopprettingen er ikke lik kilden:\n- ${r.avvik.join('\n- ')}`)
    console.log(`Gjenopprettet og kontrollert på ${r.sekunder} s: like tabeller, filer og tilpasninger.`)
  } else {
    throw new Stopp('Bruk: referanse | ta | gjenopprett (se docs/drift-gjenoppretting.md).')
  }
}

main(process.argv.slice(2)).catch((feil: unknown) => {
  console.error(feil instanceof Stopp ? feil.message : feil)
  process.exit(1)
})
