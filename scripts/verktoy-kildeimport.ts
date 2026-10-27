/**
 * Henter Psychiatrienets anbefalinger inn i kildearkivet for OUSFAR Verktøy
 * (P3 i `docs/verktøy-utviklingsplan.md`), og lager rapporten.
 *
 *   npm run verktoy:kildeimport -- hent [--mellomlager <mappe>]
 *                                        De tre tabellene og hver side de lenker til (én om gangen)
 *   npm run verktoy:kildeimport -- rapport
 *                                        docs/verktøy-p3-kildegrunnlag.md
 *
 * `hent` legger et nytt uttrekk til `src/data/verktoy/psychiatrienet-kildearkiv.json`
 * og skriver hva som er nytt, endret eller borte siden forrige. Den henter ikke
 * sidene for johannesurt eller Start-kolonnen, og lagrer ingen
 * anbefalingstekst, bare det `src/verktoy/kildeside.ts` leser av siden. Den
 * skriver ikke til databasen og endrer ingen regel. Mellomlageret (utenfor
 * repoet) er til for å kunne kjøre lesingen på nytt uten å hente sidene igjen.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { registrerInnhenting, TOMT_ARKIV, type Kildearkiv, type Sideinnhenting, type Tabellinnhenting } from '../src/verktoy/kildearkiv'
import { importmalForTabeller, undertabellmal, UNDERTABELLDYBDE } from '../src/verktoy/kildeanbefalinger'
import { LESERVERSJON, lesKildeinnhold } from '../src/verktoy/kildeside'
import { KILDETABELLER, lesSwitchtabell, PSYCHIATRIENET, tabelladresse } from '../src/verktoy/kildetabeller'
import type { Virkestoffkartlegging } from '../src/verktoy/kartlegging'

const ARKIV = new URL('../src/data/verktoy/psychiatrienet-kildearkiv.json', import.meta.url)
const KARTLEGGING = new URL('../src/data/verktoy/virkestoffkartlegging.json', import.meta.url)
const nå = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z')
const vent = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** Høflig mot en liten nettside: ett kall om gangen, med pause. */
const PAUSE_MS = 300

interface Svar {
  status: number
  endelig: string
  html: string
  hentet: string
}

async function hent(url: string, mellomlager: string | null): Promise<Svar> {
  const fil = mellomlager && join(mellomlager, `${url.replace(/^https?:\/\//, '').replace(/[^A-Za-z0-9._-]/g, '_')}.json`)
  if (fil && existsSync(fil)) return JSON.parse(readFileSync(fil, 'utf8')) as Svar
  for (let forsok = 1; ; forsok++) {
    try {
      const svar = await fetch(url, { redirect: 'follow' })
      const ut: Svar = { status: svar.status, endelig: svar.url, html: await svar.text(), hentet: nå() }
      if (fil) writeFileSync(fil, JSON.stringify(ut))
      await vent(PAUSE_MS)
      return ut
    } catch (e) {
      if (forsok >= 4) throw e
      await vent(2000 * 2 ** forsok)
    }
  }
}

async function hentAlt(mellomlager: string | null) {
  if (mellomlager) mkdirSync(mellomlager, { recursive: true })
  const k = JSON.parse(readFileSync(KARTLEGGING, 'utf8')) as Virkestoffkartlegging

  const tabeller: Tabellinnhenting[] = []
  for (const t of KILDETABELLER) {
    const url = tabelladresse(t.id)
    const svar = await hent(url, mellomlager)
    if (svar.status !== 200) throw new Error(`${url} svarte ${svar.status}`)
    const start = svar.html.indexOf('<table class="switchtable"')
    const sha256 = createHash('sha256').update(svar.html.slice(start, svar.html.indexOf('</table>', start))).digest('hex')
    const { id: _id, ...tabell } = lesSwitchtabell(t.id, svar.html)
    tabeller.push({ tabell: t.id, url, hentet: svar.hentet, sha256, ...tabell })
  }

  const sider: Sideinnhenting[] = []
  const hentet = new Set<string>()
  let ko = importmalForTabeller(k, tabeller.map((t) => ({ id: t.tabell, celler: t.celler })))
  for (let dybde = 0; ko.length > 0 && dybde < UNDERTABELLDYBDE; dybde++) {
    const neste: string[] = []
    for (const href of ko) {
      if (hentet.has(href)) continue
      hentet.add(href)
      const url = `${PSYCHIATRIENET}${href}`
      const svar = await hent(url, mellomlager)
      const side: Sideinnhenting = {
        href,
        url,
        hentet: svar.hentet,
        status: svar.status,
        endelig: svar.endelig && svar.endelig !== url ? svar.endelig : null,
        leser: LESERVERSJON,
        innhold: svar.status === 200 ? lesKildeinnhold(svar.html) : null,
      }
      sider.push(side)
      neste.push(...undertabellmal(k, side))
      if (sider.length % 100 === 0) console.log(`${sider.length} sider`)
    }
    ko = neste
  }
  if (ko.some((h) => !hentet.has(h))) throw new Error(`Undertabeller dypere enn ${UNDERTABELLDYBDE} nivåer; øk UNDERTABELLDYBDE`)

  const forrige = existsSync(ARKIV) ? (JSON.parse(readFileSync(ARKIV, 'utf8')) as Kildearkiv) : TOMT_ARKIV
  // Tidsrommet sidene faktisk ble hentet i, også når de kommer fra mellomlageret.
  const tider = [...tabeller, ...sider].map((x) => x.hentet).sort()
  const { arkiv, endringer } = registrerInnhenting(forrige, { startet: tider[0]!, ferdig: tider.at(-1)!, leser: LESERVERSJON, tabeller, sider })
  writeFileSync(ARKIV, `${JSON.stringify(arkiv, null, 1)}\n`)
  console.log(`→ src/data/verktoy/psychiatrienet-kildearkiv.json (uttrekk ${arkiv.uttrekk.at(-1)!.nr}, ${sider.length} sider)`)
  for (const type of ['ny', 'endret', 'forsvunnet'] as const) {
    const e = endringer.filter((x) => x.type === type)
    console.log(`${type}: ${e.length}${e.length && e.length <= 30 ? ` – ${e.map((x) => x.id).join(', ')}` : ''}`)
  }
}

async function rapport() {
  const { lagKilderapport, KILDERAPPORTFIL } = await import('../src/verktoy/kilderapport')
  writeFileSync(new URL(`../${KILDERAPPORTFIL}`, import.meta.url), lagKilderapport())
  console.log(`→ ${KILDERAPPORTFIL}`)
}

const [kommando, ...resten] = process.argv.slice(2).filter((a) => a !== '--')
const valg = (navn: string) => {
  const i = resten.indexOf(navn)
  return i >= 0 ? resten[i + 1] ?? null : null
}
const kommandoer: Record<string, () => Promise<void>> = {
  hent: () => hentAlt(valg('--mellomlager')),
  rapport,
}
const k = kommando ? kommandoer[kommando] : undefined
if (!k) {
  console.error(`Bruk: npm run verktoy:kildeimport -- <${Object.keys(kommandoer).join(' | ')}>`)
  process.exit(1)
}
await k()
