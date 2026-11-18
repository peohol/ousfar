/**
 * Sanntiden i gruppechatten mot det lokale testmiljøet, med Supabase Realtime
 * og radsikkerheten slik de er i produksjonen (docs/gruppechat.md, «Sanntiden»,
 * kriterium 1 og 4; docs/qa-testmiljo.md). Ingen nettleser: to syntetiske
 * medlemmer bruker den samme kontrolleren, de samme kallene og den samme
 * dørklokken som appen, hver med sin innlogging.
 *
 * 1. Ada og Bo utveksler meldinger i sanntid, uten livstegnet (kriterium 1),
 *    og Bo får ett varsel om chatten, uten tekst, som merkes lest i chatten.
 * 2. Bo fjernes fra gruppen mens chatten står åpen: ingen flere hendelser fra
 *    dørklokken, direkte kall avvises, og livstegnet stenger chatten hos Bo
 *    (kriterium 4).
 *
 * Bryteren slås på i den lokale databasen mens kontrollen går, og av igjen
 * etterpå. Bare syntetiske kontoer og tekster. Kjøres med
 *
 *   npx vite-node src/__tests__/qa/gruppechatsanntid.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { internAuthAdresse } from '@delt/brukernavn'
import { IngenTilgang, lagChatapi } from '../../gruppechat/kall'
import { lagChatkontroller, LIVSTEGN_MS, type Chatkontroller } from '../../gruppechat/kontroller'
import { lagAbonner, type Abonner } from '../../gruppechat/dorklokke'
import { sikreAdministrator, sikreTestkonto, startLokalDatabase, type Status } from './lokalmiljo'

const logg = (tekst: string) => console.log(`[gruppechat i sanntid] ${tekst}`)
const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

/** Venter til `sjekk` er sann, høyst `ms`; gir tiden det tok. */
async function innen(ms: number, hva: string, sjekk: () => boolean | Promise<boolean>): Promise<number> {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (await sjekk()) return Date.now() - start
    await vent(100)
  }
  throw new Error(`Ikke innen ${ms / 1000} s: ${hva}`)
}

function krev(betingelse: unknown, hva: string): asserts betingelse {
  if (!betingelse) throw new Error(`Feilet: ${hva}`)
  logg(`ok: ${hva}`)
}

function settBryter(s: Status, pa: boolean) {
  if (!s.DB_URL) throw new Error('Det lokale testmiljøet gir ingen databaseadresse.')
  const sql = `create or replace function intern.gruppechat_aktivert() returns boolean language sql stable set search_path = '' as $$ select ${pa} $$;`
  const r = spawnSync('psql', [s.DB_URL, '-v', 'ON_ERROR_STOP=1', '-qc', sql], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`Kunne ikke slå chatten ${pa ? 'på' : 'av'}: ${r.stderr}`)
}

async function loggInn(s: Status, brukernavn: string, passord: string): Promise<SupabaseClient> {
  const klient = createClient(s.API_URL, s.PUBLISHABLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data, error } = await klient.auth.signInWithPassword({ email: internAuthAdresse(brukernavn), password: passord })
  if (error) throw error
  await klient.realtime.setAuth(data.session.access_token)
  return klient
}

async function rpc<T>(klient: SupabaseClient, navn: string, argumenter: Record<string, unknown>): Promise<T> {
  const { data, error } = await klient.rpc(navn, argumenter)
  if (error) throw new Error(`${navn}: ${error.message}`)
  return data as T
}

/** Kontrolleren for en innlogget klient, med en teller for ringingene fra dørklokken. */
function aapneChat(klient: SupabaseClient, gruppe: string) {
  const ringinger = { antall: 0 }
  const dorklokke = lagAbonner(() => klient)
  const abonner: Abonner = (g, valg) =>
    dorklokke(g, {
      ...valg,
      vedRinging: (siste) => {
        ringinger.antall += 1
        valg.vedRinging(siste)
      },
    })
  const api = lagChatapi(() => klient)
  const kontroller = lagChatkontroller(gruppe, {
    ...api,
    abonner,
    nyKlientId: () => crypto.randomUUID(),
    ulesteEndret: () => undefined,
  })
  kontroller.start()
  return { kontroller, ringinger, api }
}

interface Chatvarsel {
  kategori: string
  lest_kl: string | null
  hendelser: { gruppechat?: { id: string } | null }[]
}

/** Antall abonnementer Realtime har registrert på gruppens chatrad. */
function abonnementer(s: Status, gruppe: string): number {
  const sql = `select count(*) from realtime.subscription where entity = 'public.gruppechatter'::regclass and filters::text like '%${gruppe}%'`
  return Number(spawnSync('psql', [s.DB_URL!, '-Atc', sql], { encoding: 'utf8' }).stdout.trim())
}

const tekster = (k: Chatkontroller) => k.hent().meldinger.map((m) => m.tekst)

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const passord = { ada: randomBytes(18).toString('base64url'), bo: randomBytes(18).toString('base64url') }
await sikreTestkonto(s, 'qa-chat-ada', passord.ada, ['Ada', 'Testesen'])
const boId = await sikreTestkonto(s, 'qa-chat-bo', passord.bo, ['Bo', 'Prøvesen'])

settBryter(s, true)
const aapne: { navn: string; kontroller: Chatkontroller; ringinger: { antall: number } }[] = []
let feilet = false
try {
  const admin = await loggInn(s, 'qa-admin', adminpassord)
  const ada = await loggInn(s, 'qa-chat-ada', passord.ada)
  const bo = await loggInn(s, 'qa-chat-bo', passord.bo)

  const navn = `Syntetisk chatgruppe ${new Date().toISOString()}`
  const gruppe = await rpc<string>(admin, 'opprett_gruppe', { navn, beskrivelse: 'Kontroll av sanntiden (syntetisk).', fagmiljo: null })
  for (const brukernavn of ['qa-chat-ada', 'qa-chat-bo']) await rpc(admin, 'inviter_til_gruppe', { gruppe, brukernavn })
  await rpc(ada, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  await rpc(bo, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  logg(`gruppen «${navn}» med Ada og Bo`)

  const a = aapneChat(ada, gruppe)
  const b = aapneChat(bo, gruppe)
  aapne.push({ navn: 'Ada', ...a }, { navn: 'Bo', ...b })
  await innen(20_000, 'begge chattene er klare og tilkoblet', () =>
    [a, b].every((x) => x.kontroller.hent().status === 'klar' && x.kontroller.hent().tilkobling === 'tilkoblet'),
  )
  // Første gang Realtime brukes, starter den lyttingen på databasen litt etter at kanalen er tilkoblet.
  await innen(20_000, 'Realtime har registrert begge abonnementene', () => abonnementer(s, gruppe) >= 2)

  // --- 1. Meldinger i sanntid -------------------------------------------------
  a.kontroller.hent().send('Syntetisk hei fra Ada')
  const tid = await innen(10_000, 'Bo ser Adas melding', () => tekster(b.kontroller).includes('Syntetisk hei fra Ada'))
  krev(tid < LIVSTEGN_MS && b.ringinger.antall > 0, `Bo fikk meldingen gjennom dørklokken etter ${tid} ms, uten livstegnet`)
  b.kontroller.hent().send('Syntetisk svar fra Bo')
  await innen(10_000, 'Ada ser Bos svar', () => tekster(a.kontroller).includes('Syntetisk svar fra Bo'))
  krev(
    JSON.stringify(tekster(a.kontroller)) === JSON.stringify(tekster(b.kontroller)),
    'Ada og Bo ser de samme meldingene i samme rekkefølge',
  )

  const chatvarsler = async () =>
    (await rpc<{ varsler: Chatvarsel[] }>(bo, 'mine_varsler', {})).varsler.filter(
      (v) => v.kategori === 'gruppechat' && v.hendelser.some((h) => h.gruppechat?.id === gruppe),
    )
  const [chatvarsel, ...flere] = await chatvarsler()
  krev(
    chatvarsel && flere.length === 0 && chatvarsel.lest_kl === null && !JSON.stringify(chatvarsel).includes('Syntetisk hei'),
    'Bo har ett ulest varsel om chatten, uten meldingstekst',
  )
  const adasMelding = b.kontroller.hent().meldinger.find((m) => m.tekst === 'Syntetisk hei fra Ada')!
  b.kontroller.hent().merkLest(adasMelding.nr)
  await innen(5_000, 'varselet er lest når chatten er lest', async () => (await chatvarsler()).every((v) => v.lest_kl !== null))
  logg('ok: varselet er lest når Bo har lest meldingen')

  // --- 2. Bo fjernes mens chatten står åpen ----------------------------------
  await rpc(admin, 'avslutt_gruppemedlemskap', { gruppe, bruker: boId })
  const for_ = b.ringinger.antall
  a.kontroller.hent().send('Syntetisk etter at Bo er fjernet')
  await innen(10_000, 'Ada ser sin egen melding', () => tekster(a.kontroller).includes('Syntetisk etter at Bo er fjernet'))
  await vent(5_000)
  krev(b.ringinger.antall === for_, 'Bo får ingen flere hendelser fra dørklokken etter fjerningen')
  krev(!tekster(b.kontroller).includes('Syntetisk etter at Bo er fjernet'), 'Bo ser ikke meldingen som kom etter fjerningen')
  const direkte = await b.api.hentChatendringer(gruppe, 0).then(
    () => null,
    (f: unknown) => f,
  )
  krev(direkte instanceof IngenTilgang, 'Bos direkte kall avvises med «ingen tilgang»')
  logg('venter på livstegnet hos Bo (inntil ett minutt)')
  await innen(LIVSTEGN_MS + 10_000, 'chatten stenges hos Bo', () => b.kontroller.hent().status === 'ingen_tilgang')
  krev(b.kontroller.hent().meldinger.length === 0, 'meldingene er tømt hos Bo, og abonnementet er stoppet')
} catch (feil) {
  feilet = true
  console.error(`[gruppechat i sanntid] FEIL: ${feil instanceof Error ? feil.message : String(feil)}`)
  // Tilstanden hos hver, uten meldingstekst.
  for (const { navn, kontroller, ringinger } of aapne) {
    const c = kontroller.hent()
    console.error(`  ${navn}: ${c.status}, ${c.tilkobling}, ${c.meldinger.length} meldinger, ${c.ventende.length} ventende, ${ringinger.antall} ringinger${c.feil ? `, feil: ${c.feil}` : ''}`)
  }
} finally {
  for (const { kontroller } of aapne) kontroller.stopp()
  settBryter(s, false)
}
logg(feilet ? 'kontrollen feilet' : 'alle kontrollene gikk')
process.exit(feilet ? 1 : 0)
