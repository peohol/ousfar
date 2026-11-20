/**
 * Diskusjonene i sanntid mot det lokale testmiljøet, med Supabase Realtime og
 * radsikkerheten slik de er i produksjonen (docs/diskusjoner.md, «Sanntiden»;
 * docs/qa-testmiljo.md). Ingen nettleser: to syntetiske brukere lytter på
 * dørklokken med den samme lyttingen som appen, hver med sin innlogging, og
 * henter tråden med de samme funksjonene.
 *
 * 1. En felles side: Ada lager en tråd, Bo hører det; Bo kommenterer, Adas
 *    åpne tråd får kommentaren uten å hente lista. Ringingen sier hvilken tråd.
 * 2. En gruppe: Bo hører trådene i gruppen så lenge Bo er med. Fjernes Bo,
 *    kommer ingen flere hendelser, og tråden kan ikke hentes.
 *
 * Bare syntetiske kontoer og tekster. Kjøres med
 *
 *   npx vite-node src/__tests__/qa/diskusjonssanntid.ts
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { internAuthAdresse } from '@delt/brukernavn'
import { lagAbonner } from '../../gruppechat/dorklokke'
import { DISKUSJONSKILDE, gjelderTraad, lyttPaDiskusjoner, type Diskusjonsendring } from '../../diskusjoner/klokke'
import type { Diskusjonsside } from '../../diskusjoner/modell'
import { arkiverTidligereGrupper } from './kontroll'
import { lokalSql, sikreAdministrator, sikreTestkonto, startLokalDatabase, type Status } from './lokalmiljo'

const logg = (tekst: string) => console.log(`[diskusjoner i sanntid] ${tekst}`)
const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
const DOK = (tekst: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tekst }] }] })

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

/** Lytter på siden som appen gjør (uten fane som kan skjules), og tar vare på endringene. */
function lytt(klient: SupabaseClient, side: Diskusjonsside) {
  const endringer: Diskusjonsendring[] = []
  const tilkoblet = { na: false }
  const stopp = lyttPaDiskusjoner(lagAbonner(() => klient, DISKUSJONSKILDE), side, {
    vedEndring: (e) => endringer.push(e),
    vedStatus: (na) => (tilkoblet.na = na),
    dokument: null,
  })
  return { endringer, tilkoblet, stopp }
}

/** Abonnementene Realtime har registrert på dørklokken for siden. */
const abonnementer = (s: Status, side: string) =>
  Number(lokalSql(s, `select count(*) from realtime.subscription where entity = 'public.diskusjonsklokker'::regclass and filters::text like '%${side}%'`))

const traad = (klient: SupabaseClient, diskusjon: string) =>
  rpc<{ kommentarer: { tekst: unknown }[] } | null>(klient, 'diskusjonstraad', { diskusjon })
const harTekst = (t: { kommentarer: { tekst: unknown }[] } | null, tekst: string) =>
  !!t && t.kommentarer.some((k) => JSON.stringify(k.tekst).includes(tekst))

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const passord = { ada: randomBytes(18).toString('base64url'), bo: randomBytes(18).toString('base64url') }
await sikreTestkonto(s, 'qa-chat-ada', passord.ada, ['Ada', 'Testesen'])
const boId = await sikreTestkonto(s, 'qa-chat-bo', passord.bo, ['Bo', 'Prøvesen'])

const lyttere: { navn: string; l: ReturnType<typeof lytt> }[] = []
let feilet = false
try {
  const admin = await loggInn(s, 'qa-admin', adminpassord)
  await arkiverTidligereGrupper(admin, 'Syntetisk ')
  const ada = await loggInn(s, 'qa-chat-ada', passord.ada)
  const bo = await loggInn(s, 'qa-chat-bo', passord.bo)
  const merke = Date.now().toString(36)

  // --- 1. En felles side ---------------------------------------------------------
  const felles = `stoff:qa-sanntid-${merke}` as Diskusjonsside
  const adaF = lytt(ada, felles)
  const boF = lytt(bo, felles)
  lyttere.push({ navn: 'Ada (felles)', l: adaF }, { navn: 'Bo (felles)', l: boF })
  await innen(20_000, 'begge er tilkoblet', () => adaF.tilkoblet.na && boF.tilkoblet.na)
  await innen(20_000, 'Realtime har registrert begge abonnementene', () => abonnementer(s, felles) >= 2)

  const tid = Date.now()
  const id = await rpc<string>(ada, 'opprett_diskusjon', {
    side: felles, tittel: 'Syntetisk tråd', tekst: DOK('Syntetisk innlegg'), kategori: null, ny_kategori: 'Syntetisk', ny_emoji: '🧪',
  })
  await innen(10_000, 'Bo hører den nye tråden', () => boF.endringer.some((e) => gjelderTraad(e, id)))
  krev(true, `Bo hørte den nye tråden etter ${Date.now() - tid} ms`)

  const for_ = adaF.endringer.length
  const { error } = await bo.from('diskusjonskommentarer').insert({ diskusjon_id: id, tekst: DOK('Syntetisk kommentar fra Bo') })
  if (error) throw new Error(error.message)
  await innen(10_000, 'Ada hører kommentaren i tråden', () => adaF.endringer.slice(for_).some((e) => e !== 'alle' && e.has(id)))
  krev(harTekst(await traad(ada, id), 'Syntetisk kommentar fra Bo'), 'Ada henter tråden og ser Bos kommentar')

  // --- 2. En gruppe ------------------------------------------------------------------
  const navn = `Syntetisk diskusjonsgruppe ${new Date().toISOString()}`
  const gruppe = await rpc<string>(admin, 'opprett_gruppe', { navn, beskrivelse: 'Kontroll av sanntiden i diskusjonene (syntetisk).', fagmiljo: null })
  for (const brukernavn of ['qa-chat-ada', 'qa-chat-bo']) await rpc(admin, 'inviter_til_gruppe', { gruppe, brukernavn })
  await rpc(ada, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  await rpc(bo, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  const gside = `gruppe:${gruppe}` as Diskusjonsside
  const adaG = lytt(ada, gside)
  const boG = lytt(bo, gside)
  lyttere.push({ navn: 'Ada (gruppe)', l: adaG }, { navn: 'Bo (gruppe)', l: boG })
  await innen(20_000, 'begge er tilkoblet i gruppen', () => adaG.tilkoblet.na && boG.tilkoblet.na)
  await innen(20_000, 'Realtime har registrert begge abonnementene i gruppen', () => abonnementer(s, gside) >= 2)

  const gtraad = await rpc<string>(ada, 'opprett_diskusjon', {
    side: gside, tittel: 'Syntetisk gruppetråd', tekst: null, kategori: null, ny_kategori: 'Syntetisk', ny_emoji: '🧪',
  })
  await innen(10_000, 'Bo hører tråden i gruppen', () => boG.endringer.some((e) => gjelderTraad(e, gtraad)))
  krev(true, 'Bo hører tråden i gruppen mens Bo er med')

  await rpc(admin, 'avslutt_gruppemedlemskap', { gruppe, bruker: boId })
  await vent(1500)
  const boFor = boG.endringer.length
  const adaFor = adaG.endringer.length
  const { error: feil2 } = await ada.from('diskusjonskommentarer').insert({ diskusjon_id: gtraad, tekst: DOK('Syntetisk etter at Bo er fjernet') })
  if (feil2) throw new Error(feil2.message)
  await innen(10_000, 'Ada hører sin egen kommentar', () => adaG.endringer.length > adaFor)
  await vent(5_000)
  krev(boG.endringer.length === boFor, 'Bo får ingen flere hendelser fra gruppen etter fjerningen')
  krev((await traad(bo, gtraad)) === null, 'Bo kan ikke hente tråden i gruppen lenger')
} catch (feil) {
  feilet = true
  console.error(`[diskusjoner i sanntid] FEIL: ${feil instanceof Error ? feil.message : String(feil)}`)
  for (const { navn, l } of lyttere) console.error(`  ${navn}: ${l.tilkoblet.na ? 'tilkoblet' : 'frakoblet'}, ${l.endringer.length} endringer`)
} finally {
  for (const { l } of lyttere) l.stopp()
}
logg(feilet ? 'kontrollen feilet' : 'alle kontrollene gikk')
process.exit(feilet ? 1 : 0)
