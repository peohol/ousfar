/**
 * Det nettleserkontrollene i det lokale testmiljøet (docs/qa-testmiljo.md)
 * kan dele: punktene med rapporten, skjermbildene, ventingen og de innloggede
 * klientene for de syntetiske kontoene. SQL og bryterne i den lokale databasen
 * står i `lokalmiljo.ts` (`lokalSql`, `slaPaFunksjoner`).
 * Bare for skript som kjøres lokalt; laster ikke Playwright (det gjør bare
 * `testmiljo.ts`, se `nettleservern.test.ts`).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { internAuthAdresse } from '@delt/brukernavn'
import { lokalSql, type Status } from './lokalmiljo'

/** En side i Playwright; løst typet fordi Playwright ikke er en avhengighet i repoet. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Side = any

export const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

export function krev(betingelse: unknown, hva: string): asserts betingelse {
  if (!betingelse) throw new Error(hva)
}

/** Venter til `sjekk` er sann, høyst `ms`; gir tiden det tok. En sjekk som kaster, teller som usann. */
export async function innen(ms: number, hva: string, sjekk: () => boolean | Promise<boolean>, hvert = 150): Promise<number> {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (await Promise.resolve().then(sjekk).catch(() => false)) return Date.now() - start
    await vent(hvert)
  }
  throw new Error(`Ikke innen ${ms / 1000} s: ${hva}`)
}

/** Hva som har fokus, og hvilke lag og vinduer som står åpne: til feilsøking når et punkt feiler. */
async function tilstand(side: Side): Promise<string> {
  return side
    .evaluate(() => {
      const a = document.activeElement as HTMLElement | null
      const fokus = a && a !== document.body ? `${a.tagName.toLowerCase()}.${a.className}${a.getAttribute('aria-label') ? `[${a.getAttribute('aria-label')}]` : ''}` : 'ingen'
      const lag = [...document.querySelectorAll('[data-lag]')].map((e) => e.getAttribute('data-lag')).join(',') || 'ingen'
      const spor = (window as unknown as { __adressespor?: string[] }).__adressespor
      return `${location.hash}, fokus ${fokus}, data-lag ${lag}, ${document.querySelectorAll('dialog[open]').length} vinduer, historikk ${history.length}${spor ? `, adressene ${spor.slice(-6).join(' → ')}` : ''}`
    })
    .catch(() => 'ukjent')
}

export interface Utfall {
  punkt: string
  ok: boolean
  merknad: string
}

/**
 * Punktene i en kontroll: hvert kjøres for seg, så én feil ikke stopper
 * resten, og `rapport()` skriver resultatet og avslutter med feilstatus om
 * noe feilet. `QA_SKJERMBILDER=<mappe>` lagrer skjermbildene, og et punkt som
 * feiler, tas bilde av på siden det sist arbeidet på (`paa`).
 */
export function lagKontroll(merke: string) {
  const logg = (t: string) => console.log(`[${merke}] ${t}`)
  const utfall: Utfall[] = []
  const mappe = process.env.QA_SKJERMBILDER
  if (mappe) mkdirSync(mappe, { recursive: true })
  let sist: Side = null
  // `QA_PUNKTER=N2,N4` kjører bare de punktene (oppsettet kjøres alltid).
  const bare = process.env.QA_PUNKTER?.split(',').map((p) => p.trim())

  /** Skjermbilde av vinduet, eller av hele siden med `helSide`. */
  async function bilde(side: Side, navn: string, helSide = false) {
    if (mappe) await side.screenshot({ path: join(mappe, `${navn}.png`), fullPage: helSide }).catch(() => undefined)
  }
  function noter(punkt: string, ok: boolean, merknad: string) {
    utfall.push({ punkt, ok, merknad })
    logg(`  ${ok ? 'ok' : 'FEIL'} ${merknad}`)
  }
  async function punkt(kode: string, arbeid: () => Promise<string | void>) {
    const navn = kode.split(' ')[0]!
    if (bare && !bare.includes(navn)) return
    logg(kode)
    try {
      noter(kode, true, (await arbeid()) ?? '')
    } catch (e) {
      noter(kode, false, e instanceof Error ? e.message.split('\n')[0]! : String(e))
      if (sist) {
        await bilde(sist, `feil-${navn}`)
        logg(`    tilstand: ${await tilstand(sist)}`)
      }
    }
  }
  return {
    logg,
    utfall,
    punkt,
    bilde,
    /** Siden punktene arbeider på nå; den tas bilde av når et punkt feiler. */
    paa(side: Side) {
      sist = side
      return side
    },
    /** Et feil i oppsettet utenfor punktene, så rapporten tar det med. */
    oppsettFeilet(e: unknown) {
      noter('oppsettet', false, e instanceof Error ? e.message.split('\n')[0]! : String(e))
    },
    rapport(): never {
      console.log('\nRESULTAT')
      for (const u of utfall) console.log(`${u.ok ? 'OK  ' : 'FEIL'} ${u.punkt} ${u.merknad}`)
      process.exit(utfall.length > 0 && utfall.every((u) => u.ok) ? 0 : 1)
    },
  }
}

/** En klient innlogget som den syntetiske kontoen; med `sanntid` også for Realtime. */
export async function klient(s: Status, brukernavn: string, passord: string, { sanntid = false } = {}): Promise<SupabaseClient> {
  const k = createClient(s.API_URL, s.PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await k.auth.signInWithPassword({ email: internAuthAdresse(brukernavn), password: passord })
  if (error) throw error
  if (sanntid) await k.realtime.setAuth(data.session.access_token)
  return k
}

export async function rpc<T>(k: SupabaseClient, navn: string, argumenter: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await k.rpc(navn, argumenter)
  if (error) throw new Error(`${navn}: ${error.message}`)
  return data as T
}

/**
 * Antall abonnementer Realtime har registrert på gruppens chatrad: når det er
 * like mange som åpne chatter, lytter dørklokken, også når Realtime alt var i
 * gang fra en tidligere kontroll.
 */
export function chatabonnementer(s: Status, gruppe: string): number {
  return Number(lokalSql(s, `select count(*) from realtime.subscription where entity = 'public.gruppechatter'::regclass and filters::text like '%${gruppe}%'`))
}

/**
 * Lukker chatmenyen om den står åpen; valget huskes per konto og hentes etter
 * at siden står. Boblen står inne i menyen, så det er panelet som avgjør. Med
 * `tilLista` går menyen først til lista, så den åpner der neste gang og ikke
 * på en samtale (som da merkes lest).
 */
export async function lukkChatmenyen(side: Side, { tilLista = false } = {}): Promise<void> {
  const panel = side.locator('.chatpanel')
  await side.locator('.chatboble:visible, .chatpanel:visible').first().waitFor({ timeout: 30_000 })
  await vent(1500)
  if (!(await panel.isVisible())) return
  const lista = panel.getByRole('button', { name: 'Til alle samtaler' })
  if (tilLista && (await lista.isVisible())) await lista.click()
  await panel.getByRole('button', { name: 'Lukk chatten' }).first().click()
  await side.locator('.chatboble').waitFor({ timeout: 10_000 })
}

/**
 * Arkiverer de aktive gruppene `admin` har laget i tidligere kjøringer, med
 * navn som begynner med et av `prefikser`. Ellers teller de med i boblen, i
 * panelene og i lista, og en kontroll som venter et bestemt antall uleste,
 * feiler etter at en annen har kjørt.
 */
export async function arkiverTidligereGrupper(admin: SupabaseClient, ...prefikser: string[]): Promise<void> {
  const { grupper } = await rpc<{ grupper: { id: string; navn: string; status: string }[] }>(admin, 'mine_grupper')
  for (const g of grupper) {
    if (g.status === 'aktiv' && prefikser.some((p) => g.navn.startsWith(p))) await rpc(admin, 'arkiver_gruppe', { gruppe: g.id, arkivert: true })
  }
}

/**
 * Avslag databasen gir med en SQLSTATE PostgREST gjør om til HTTP 500
 * (issue #470): brukeren får riktig melding, men testmiljøet stopper ved
 * første 5xx (`trafikkvakt.ts`). `lytt(side)` gir dem videre som 409 med samme
 * innhold, så appen oppfører seg likt, og fører dem opp; `rapport()` kaster
 * for alle andre svar med 5xx og nevner de kjente. `lytt` fører også
 * adressene siden har vært innom, til feilsøking ({@link tilstand}).
 */
export function lagAvslagsvakt(kjente: readonly string[] = ['P0002', '54000', '55000']) {
  const kjenteKoder = new Set(kjente)
  const sett = new Set<string>()
  const ukjente: string[] = []
  const lokaltKall = (u: URL) => /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(u.host) && u.pathname.startsWith('/rest/v1/rpc/')
  // En side som lukkes mens et kall står ute, kan ikke svares; det er ingen feil.
  const svarPa = async (rute: Side) => {
    const svar = await rute.fetch().catch(() => null)
    if (!svar) return rute.abort('failed')
    if (svar.status() < 500) return rute.fulfill({ response: svar })
    const kode: unknown = await svar.json().then((j: { code?: unknown }) => j.code, () => null)
    const linje = `${svar.status()} ${new URL(rute.request().url()).pathname.replace('/rest/v1/rpc/', '')} (${String(kode)})`
    if (typeof kode === 'string' && kjenteKoder.has(kode)) {
      sett.add(linje)
      return rute.fulfill({ response: svar, status: 409 })
    }
    ukjente.push(linje)
    return rute.fulfill({ response: svar })
  }
  return {
    async lytt(side: Side): Promise<Side> {
      await side.addInitScript(() => {
        const w = window as unknown as { __adressespor: string[] }
        w.__adressespor = [location.hash]
        addEventListener('hashchange', () => w.__adressespor.push(location.hash))
      })
      await side.route(lokaltKall, (rute: Side) => svarPa(rute).catch(() => undefined))
      return side
    },
    rapport(): string {
      krev(ukjente.length === 0, `svar med 5xx: ${ukjente.join(', ')}`)
      return sett.size ? `kjente avslag med 500 (issue #470): ${[...sett].join(', ')}` : ''
    },
  }
}
