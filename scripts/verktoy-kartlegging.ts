/**
 * Lager øyeblikksbildene kartleggingen for OUSFAR Verktøy kontrolleres mot
 * (P1 i `docs/verktøy-utviklingsplan.md`), og rapporten.
 *
 *   npm run verktoy:kartlegging -- tabeller            Psychiatrienets tre switchtabeller
 *   npm run verktoy:kartlegging -- lenker [--mellomlager <mappe>]
 *                                                     Om hver lenket side finnes (én om gangen)
 *   npm run verktoy:kartlegging -- fest [<fil.zip>]   Preparatene i FEST (laster ned uten fil)
 *   npm run verktoy:kartlegging -- fagsider           Publiserte fagsider i produksjon (bare lesing;
 *                                                     krever VITE_SUPABASE_URL og SUPABASE_SECRET_KEY)
 *   npm run verktoy:kartlegging -- rapport            docs/verktøy-p1-kartlegging.md
 *
 * Bildene står i `src/data/verktoy/`. Selve kartleggingen
 * (`virkestoffkartlegging.json`) skrives for hånd; `npm test` sier fra når den
 * ikke stemmer med bildene. Ingenting her skriver til databasen eller henter
 * anbefalingstekstene; det er P3.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { lesFest } from '../src/legemiddeldata/fest'
import { FEST_URL } from '../src/legemiddeldata/synk'
import { pakkUt } from '../src/legemiddeldata/zip'
import { lagFestformuleringer } from '../src/verktoy/festformuleringer'
import { KILDETABELLER, lesKildeside, lesSwitchtabell, PSYCHIATRIENET, tabelladresse } from '../src/verktoy/kildetabeller'
import type { Fagsidebilde, Lenkebilde, Tabellbilde, Virkestoffkartlegging } from '../src/verktoy/kartlegging'
import { lagRapport, RAPPORTFIL } from '../src/verktoy/rapport'

const MAPPE = new URL('../src/data/verktoy/', import.meta.url)
const fil = (navn: string) => new URL(navn, MAPPE)
const skriv = (navn: string, data: unknown) => {
  writeFileSync(fil(navn), `${JSON.stringify(data, null, 1)}\n`)
  console.log(`→ src/data/verktoy/${navn}`)
}
const les = <T>(navn: string): T => JSON.parse(readFileSync(fil(navn), 'utf8')) as T
const nå = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z')
const vent = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Høflig mot en liten nettside: ett kall om gangen, med pause. */
const PAUSE_MS = 300

async function hent(url: string): Promise<{ status: number; endelig: string; html: string }> {
  for (let forsok = 1; ; forsok++) {
    try {
      const svar = await fetch(url, { redirect: 'follow' })
      return { status: svar.status, endelig: svar.url, html: await svar.text() }
    } catch (e) {
      if (forsok >= 4) throw e
      await vent(2000 * 2 ** forsok)
    }
  }
}

async function tabeller() {
  const tabeller: Tabellbilde['tabeller'] = []
  for (const t of KILDETABELLER) {
    const url = tabelladresse(t.id)
    const { status, html } = await hent(url)
    if (status !== 200) throw new Error(`${url} svarte ${status}`)
    const start = html.indexOf('<table class="switchtable"')
    const sha256 = createHash('sha256').update(html.slice(start, html.indexOf('</table>', start))).digest('hex')
    tabeller.push({ ...lesSwitchtabell(t.id, html), url, sha256 })
    await vent(PAUSE_MS)
  }
  skriv('psychiatrienet-tabeller.json', { hentet: nå(), tabeller } satisfies Tabellbilde)
}

async function lenker(mellomlager: string | null) {
  const bilde = les<Tabellbilde>('psychiatrienet-tabeller.json')
  const hrefs = [
    ...new Set(
      bilde.tabeller.flatMap((t) => [
        ...t.celler.flatMap((c) => (c.type === 'lenke' ? [c.href] : [])),
        ...t.grupper.flatMap((g) => [g.href, ...g.medlemmer.map((m) => m.href)]).filter((h): h is string => !!h),
      ]),
    ),
  ].sort()
  if (mellomlager) mkdirSync(mellomlager, { recursive: true })
  const sider = []
  for (const [i, href] of hrefs.entries()) {
    const navn = mellomlager && join(mellomlager, href.replace(/^\/switchdetail\//, '').replace(/[^A-Za-z0-9._-]/g, '_'))
    let svar: { status: number; endelig: string; html: string }
    if (navn && existsSync(`${navn}.json`)) {
      svar = JSON.parse(readFileSync(`${navn}.json`, 'utf8'))
    } else {
      svar = await hent(`${PSYCHIATRIENET}${href}`)
      if (navn) writeFileSync(`${navn}.json`, JSON.stringify(svar))
      await vent(PAUSE_MS)
    }
    sider.push(lesKildeside(href, svar.status, svar.endelig, svar.html))
    if ((i + 1) % 100 === 0) console.log(`${i + 1}/${hrefs.length}`)
  }
  skriv('psychiatrienet-lenker.json', { hentet: nå(), sider } satisfies Lenkebilde)
}

async function fest(sti: string | undefined) {
  let zip: Buffer
  let endret: string | null = null
  if (sti) zip = readFileSync(sti)
  else {
    const svar = await fetch(FEST_URL)
    if (!svar.ok) throw new Error(`FEST svarte ${svar.status}`)
    endret = svar.headers.get('last-modified')
    zip = Buffer.from(await svar.arrayBuffer())
  }
  const kart = les<Virkestoffkartlegging>('virkestoffkartlegging.json')
  const festfil = { hentetDato: null as string | null }
  const bilde = await lagFestformuleringer(
    lesFest(pakkUt(zip).tekst, festfil),
    kart.virkestoffer.flatMap((v) => v.fest.map((fest_id) => ({ nokkel: v.nokkel, fest_id }))),
    kart.festoverstyringer,
    { navn: FEST_URL.split('/').pop()!, endret: endret ? new Date(endret).toISOString() : null, hentetDato: () => festfil.hentetDato },
  )
  skriv('fest-formuleringer.json', bilde)
}

async function fagsider() {
  const url = process.env.VITE_SUPABASE_URL
  const nokkel = process.env.SUPABASE_SECRET_KEY
  if (!url || !nokkel) throw new Error('Krever VITE_SUPABASE_URL og SUPABASE_SECRET_KEY')
  const hode = { apikey: nokkel, Authorization: `Bearer ${nokkel}` }
  const get = async <T>(sti: string): Promise<T> => {
    const svar = await fetch(`${url}/rest/v1/${sti}`, { headers: hode })
    if (!svar.ok) throw new Error(`${sti} svarte ${svar.status}`)
    return (await svar.json()) as T
  }
  const sider = await get<{ objekt_id: string; slug: string; navn: string }[]>('infosider?select=objekt_id,slug,navn&tilstand=eq.publisert')
  const koblinger = await get<{ infoside_id: string; data: { virkestoff?: { fest_id: string }[] } }[]>(
    'innholdselementer?select=infoside_id,data&tilstand=eq.publisert&elementtype=eq.legemiddelkobling',
  )
  skriv('ousfar-fagsider.json', {
    hentet: nå(),
    kilde: 'Publiserte fagsider i produksjon (public.infosider) og koblingene deres til FEST (legemiddelkobling)',
    sider: sider
      .map((s) => ({
        slug: s.slug,
        navn: s.navn,
        fest: koblinger.filter((k) => k.infoside_id === s.objekt_id).flatMap((k) => (k.data.virkestoff ?? []).map((v) => v.fest_id)),
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug)),
  } satisfies Fagsidebilde)
}

async function rapport() {
  // Bildene leses først her, så de andre kommandoene kan lage dem fra ingenting.
  const { lesKartdata } = await import('../src/verktoy/kartdata')
  writeFileSync(new URL(`../${RAPPORTFIL}`, import.meta.url), lagRapport(lesKartdata()))
  console.log(`→ ${RAPPORTFIL}`)
}

const [kommando, ...resten] = process.argv.slice(2).filter((a) => a !== '--')
const valg = (navn: string) => {
  const i = resten.indexOf(navn)
  return i >= 0 ? resten[i + 1] ?? null : null
}
const kommandoer: Record<string, () => Promise<void> | void> = {
  tabeller,
  lenker: () => lenker(valg('--mellomlager')),
  fest: () => fest(resten.find((a) => !a.startsWith('--'))),
  fagsider,
  rapport,
}
const k = kommando ? kommandoer[kommando] : undefined
if (!k) {
  console.error(`Bruk: npm run verktoy:kartlegging -- <${Object.keys(kommandoer).join(' | ')}>`)
  process.exit(1)
}
await k()
