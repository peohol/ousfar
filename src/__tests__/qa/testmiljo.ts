/**
 * Felles oppstart for nettleserkontrollene av appen (`appkontroll.ts`,
 * P0-driveren og nye skript): hvor de kjører, innloggingen, og vernet mot å
 * belaste produksjonsdatabasen (`trafikkvakt.ts`, `docs/qa-testmiljo.md`).
 *
 * - Som standard startes det lokale testmiljøet (`lokalmiljo.ts`), og
 *   kontrollen logger inn som den syntetiske administratoren der. En `APP_URL`
 *   i miljøet brukes ikke da.
 * - Med `QA_PRODUKSJON=ja` kontrolleres den publiserte appen i `APP_URL`,
 *   innlogget med `BOOTSTRAP_ADMIN_*`. Da gjelder
 *   taket i {@link PRODUKSJONSGRENSER}, fagsøkets bakgrunnslesinger blokkeres,
 *   bare én slik kjøring kan gå på maskinen om gangen, og kjøringen stoppes ved
 *   første tegn på overbelastning.
 *
 * Lokalt kommer FEST fra de lagrede uttrekkene (se `lokalmiljo.ts`).
 *
 * Bruk:
 *
 *     const miljo = await apneTestmiljo()
 *     for (const f of forlop) {
 *       await miljo.forlop()          // kaster Teststopp når taket er nådd eller noe er galt
 *       const side = await miljo.side() // logget inn; lukker forrige kontekst
 *       …
 *     }
 *     await miljo.avslutt()
 */
import { closeSync, openSync, readFileSync, rmSync, writeSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { startLokaltMiljo } from './lokalmiljo'
import {
  blokkeresIProduksjon,
  erSupabaseISkyen,
  grenserFor,
  malFor,
  Teststopp,
  trafikklinje,
  Trafikkvakt,
  type Grenser,
  type Modus,
  type Trafikkrapport,
} from './trafikkvakt'

export { Teststopp } from './trafikkvakt'

/** Playwright er forhåndsinstallert i skymiljøet, men ikke en avhengighet i repoet, så den er løst typet. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pw = any

export interface Testmiljo {
  url: string
  modus: Modus
  grenser: Grenser
  /** Før hvert forløp: kaster {@link Teststopp} når kjøringen må stoppe, og venter pausen produksjon krever. */
  forlop(): Promise<void>
  /** En side i en ny nettleserkontekst, logget inn. Forrige kontekst lukkes, så bare én er åpen om gangen. */
  side(valg?: Record<string, unknown>): Promise<Pw>
  /** Lukker nettleseren (og appen lokalt) og gir trafikken i kjøringen. */
  avslutt(): Promise<Trafikkrapport>
}

const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

/** Låsen som hindrer to kjøringer mot produksjonen fra samme maskin samtidig. */
const LAAS = join(tmpdir(), 'ousfar-qa-produksjon.lock')

function laasProduksjon(): () => void {
  const lever = (pid: number) => {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }
  try {
    const fd = openSync(LAAS, 'wx')
    writeSync(fd, String(process.pid))
    closeSync(fd)
  } catch {
    const pid = Number(readFileSync(LAAS, 'utf8'))
    if (lever(pid)) throw new Teststopp(`En annen kontroll mot produksjonen kjører alt (prosess ${pid}). Bare én om gangen.`)
    rmSync(LAAS, { force: true })
    return laasProduksjon()
  }
  return () => rmSync(LAAS, { force: true })
}

async function loggInn(p: Pw, url: string, brukernavn: string, passord: string) {
  await p.goto(url, { waitUntil: 'networkidle' })
  // Passordet skrives bare inn på adressen som ble godkjent, også om siden har sendt nettleseren videre.
  const her = new URL(p.url()).origin
  if (her !== new URL(url).origin) throw new Teststopp(`Innloggingen ble sendt videre til ${her}; passordet brukes bare på ${new URL(url).origin}.`)
  await p.fill('input[name=username]', brukernavn)
  await p.fill('input[name=password]', passord)
  await p.click('button:has-text("Logg inn")')
  await p.waitForSelector('input[name=username]', { state: 'detached', timeout: 30_000 })
}

const miljovariabel = (navn: string) => {
  const x = process.env[navn]
  if (!x) throw new Error(`${navn} mangler.`)
  return x
}

export async function apneTestmiljo(): Promise<Testmiljo> {
  // Avgjøres før noe startes: produksjonen bare med QA_PRODUKSJON=ja, og da med taket i grensene.
  const mal = malFor(process.env)
  const modus = mal.modus
  const grenser = grenserFor(modus, process.env)
  const slippLaas = modus === 'produksjon' ? laasProduksjon() : () => undefined
  const lokalt = mal.modus === 'lokal' ? await startLokaltMiljo() : null
  const url = mal.modus === 'produksjon' ? mal.url : lokalt!.url
  const brukernavn = lokalt?.brukernavn ?? miljovariabel('BOOTSTRAP_ADMIN_USERNAME')
  const passord = lokalt?.passord ?? miljovariabel('BOOTSTRAP_ADMIN_PASSWORD')
  const lokalDatabase = lokalt ? new URL(lokalt.supabaseUrl).host : null

  const vakt = new Trafikkvakt(modus, grenser)
  const tilDatabasen = (adresse: string) => erSupabaseISkyen(adresse) || new URL(adresse).host === lokalDatabase

  const { chromium } = createRequire(import.meta.url)('playwright') as { chromium: Pw }
  const nettleser = await chromium.launch()
  let kontekst: Pw = null
  let innlogging: unknown = null

  // Ved et brudd lukkes konteksten med én gang, så skriptet ikke venter på en side som ikke svarer.
  const vaktur = setInterval(() => {
    vakt.kontroller()
    if (vakt.stoppet && kontekst) {
      console.error(`[testmiljø] stopper: ${vakt.stoppet}`)
      void kontekst.close().catch(() => undefined)
      kontekst = null
    }
  }, 500)

  async function nyKontekst(valg: Record<string, unknown>) {
    const k = await nettleser.newContext({ viewport: { width: 1300, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'], ...valg, ...(innlogging ? { storageState: innlogging } : {}) })
    k.on('request', (r: Pw) => {
      const adresse = r.url()
      if (!tilDatabasen(adresse) || vakt.stoppet || (modus === 'produksjon' && blokkeresIProduksjon(adresse))) return
      vakt.kall(r)
    })
    k.on('response', (r: Pw) => vakt.svar(r.request(), r.status()))
    k.on('requestfailed', (r: Pw) => vakt.avbrutt(r))
    await k.route(
      (adresse: URL) => tilDatabasen(adresse.href),
      async (rute: Pw) => {
        const adresse: string = rute.request().url()
        if (modus === 'lokal' && erSupabaseISkyen(adresse)) {
          vakt.stopp(`den lokale kjøringen prøvde å nå produksjonsdatabasen (${new URL(adresse).host})`)
          return rute.abort('blockedbyclient')
        }
        if (vakt.stoppet) return rute.abort('blockedbyclient')
        if (modus === 'produksjon' && blokkeresIProduksjon(adresse)) {
          vakt.blokkert()
          return rute.abort('blockedbyclient')
        }
        return rute.fallback()
      },
    )
    return k
  }

  return {
    url,
    modus,
    grenser,
    async forlop() {
      const ms = vakt.nyttForlop()
      if (ms > 0) await vent(ms)
    },
    async side(valg = {}) {
      if (vakt.stoppet) throw new Teststopp(`Kjøringen er stoppet: ${vakt.stoppet}.`)
      await kontekst?.close().catch(() => undefined)
      kontekst = await nyKontekst(valg)
      const side = await kontekst.newPage()
      if (!innlogging) {
        await loggInn(side, url, brukernavn, passord)
        // Innloggingen og det appen har lagret i nettleseren (også fagsøket i IndexedDB) følger med til neste kontekst.
        innlogging = await kontekst.storageState({ indexedDB: true })
      }
      return side
    },
    async avslutt() {
      clearInterval(vaktur)
      await nettleser.close().catch(() => undefined)
      await lokalt?.avslutt()
      slippLaas()
      const rapport = vakt.rapport()
      console.log(trafikklinje(rapport))
      return rapport
    },
  }
}
