/**
 * Kildegrunnlaget for OUSFAR Verktøy (P3 i `docs/verktøy-utviklingsplan.md`):
 * lesingen av en kildeside, at kildearkivet bare vokser og viser endringer,
 * og at oppføringene laget av arkivet er fullstendige, har riktig retning,
 * grupper, delte sider og formuleringer, utelater johannesurt og
 * Start-kolonnen, ikke har kildetekst og ikke er regler. At innhentingen
 * skiller en reell 404 fra en forbigående serverfeil, og ikke skriver sidene
 * til disk. Og at rapporten er oppdatert.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import arkivfil from '../data/verktoy/psychiatrienet-kildearkiv.json'
import { lesKartdata } from '../verktoy/kartdata'
import { erSperret, importmal } from '../verktoy/kartlegging'
import {
  registrerInnhenting,
  TOMT_ARKIV,
  utsnitt,
  uttrekksendringer,
  type Innhenting,
  type Kildearkiv,
  type Sideinnhenting,
} from '../verktoy/kildearkiv'
import { importceller, importmalForTabeller, kildedekning, kildegrunnlag } from '../verktoy/kildeanbefalinger'
import { erForbigaende, ForbigaendeFeil, hentKilde } from '../verktoy/kildehenting'
import { lesKildeinnhold } from '../verktoy/kildeside'
import { KILDERAPPORTFIL, lagKilderapport } from '../verktoy/kilderapport'

const ARKIV = arkivfil as Kildearkiv
const DATA = lesKartdata()
const K = DATA.kartlegging
const G = kildegrunnlag(ARKIV, K)
const finn = (id: string) => G.anbefalinger.find((a) => a.id === id)

/* --- Syntetiske kildesider -------------------------------------------------- */

const boks = (navn: string, href = `/switchdetail/${navn.toLowerCase()}`) =>
  `<table class="geneesmiddel" style="float:right"><tbody><tr><td colspan="2" style="font-size:150%">
<a href="${href}" title="${navn}">${navn}</a></td></tr><tr><td>Type</td><td><b>Antidepressant</b></td></tr>
<tr><td colspan="2"><table class="collapsible collapsed"><tbody><tr><th colspan="2">more info</th></tr>
<tr><td><a href="/switchdetail/property-halflife">T<sub>1/2</sub></a></td><td>48h</td></tr></tbody></table></td></tr></tbody></table>`
const gruppeboks = (navn: string, medlemmer: string[]) =>
  `<table class="geneesmiddel"><tbody><tr><td colspan="2">${navn}</td></tr><tr><td colspan="2"><p>${medlemmer
    .map((m) => `<a href="/switchdetail/${m.toLowerCase()}" title="${m}">${m}</a><br>`)
    .join('')}</p></td></tr></tbody></table>`
const avsnitt = (skilt: string, tittel: string, punkter: string[]) =>
  `<div style="font-size:20px"><img alt="${skilt}" src="/x.png"> ${tittel} </div><ul>${punkter.map((p) => `<li>${p}</li>`).join('')}</ul>`
const side = (h1: string, ramme: string, anbefaling: string, tid = '20230225011035') => `<html><body><h1>${h1}</h1>
<div class="mw-parser-output">${ramme ? `<table class="mywrapper"><tbody><tr><td>${ramme}</td></tr></tbody></table>` : ''}
${anbefaling}
<div class="myrefs"><div class="mw-references-wrap"><ol class="references"><li>Stahl 2013</li></ol></div></div>
<!-- NewPP limit report Cached time: ${tid} CPU time usage: 0.0${tid.slice(-2)} seconds -->
</div><!-- Saved in parser cache with key x and timestamp 20230225011035 and revision id 9570 -->
<div class="disclaimer">The editors take the greatest care.</div><script>var t=${tid}</script></body></html>`

const bytteside = (dag = 'Day 2:') =>
  side(
    'Agomelatine-amitriptyline',
    boks('Agomelatine') + boks('Amitriptyline'),
    `<p>Switch medication from <b>agomelatine</b> to <b>amitriptyline</b>.<sup class="reference"><a href="#c1">[1]</a></sup></p>` +
      avsnitt('Nietinrijdenbord.png', 'Stop agomelatine', ['<b>Day 1:</b> Stop agomelatine.']) +
      avsnitt('Eenrichtingbord.png', 'Start amitriptyline', [`<b>${dag}</b> Start with normal dosage.`]) +
      avsnitt('Infobord.png', 'More information', ['A wash-out period is not necessary.']),
  )

describe('Lesingen av en kildeside', () => {
  it('leser et bytte: retningen, hva slags avsnitt og faktaboksene, uten tekst eller overskrifter', () => {
    const s = lesKildeinnhold(bytteside())
    expect(s).toMatchObject({
      overskrift: 'Agomelatine-amitriptyline',
      revisjon: 9570,
      lagret: '2023-02-25T01:10:35Z',
      sidetype: 'bytte',
      retning: { fra: 'agomelatine', til: 'amitriptyline' },
      undertabell: null,
    })
    expect(s.avsnitt).toEqual(['stopp', 'start', 'informasjon'])
    expect(s.legemidler.map((l) => [l.navn, l.href])).toEqual([
      ['Agomelatine', '/switchdetail/agomelatine'],
      ['Amitriptyline', '/switchdetail/amitriptyline'],
    ])
    expect(JSON.stringify(s)).not.toMatch(/Day \d|normal dosage|wash-out|Stop agomelatine|Start amitriptyline|More information|Stahl|greatest care/)
  })

  it('gir samme kontrollsum når bare kommentarer, skript og hurtigbuffer endres, og en ny når teksten endres', () => {
    const a = lesKildeinnhold(bytteside())
    const b = lesKildeinnhold(bytteside().replace(/20230225011035/g, '20261027120000'))
    expect([b.sha256_side, b.sha256_anbefaling]).toEqual([a.sha256_side, a.sha256_anbefaling])
    const c = lesKildeinnhold(bytteside('Day 3:'))
    expect(c.sha256_anbefaling).not.toBe(a.sha256_anbefaling)
    expect(c.sha256_side).not.toBe(a.sha256_side)
  })

  it('skiller en endring i faktaboksen fra en endring i anbefalingen', () => {
    const a = lesKildeinnhold(bytteside())
    const b = lesKildeinnhold(bytteside().replace('48h', '72h'))
    expect(b.sha256_anbefaling).toBe(a.sha256_anbefaling)
    expect(b.sha256_side).not.toBe(a.sha256_side)
  })

  it('leser et tillegg som eksisterende → legges til', () => {
    const s = lesKildeinnhold(side('Combining-Lithium-Valproic acid', boks('Lithium'), '<p>Adding <b>valproic acid</b> to <b>lithium</b>.</p>'))
    expect(s).toMatchObject({ sidetype: 'tillegg', retning: { fra: 'lithium', til: 'valproic acid' } })
  })

  it('leser en Stop-side og en gruppe med medlemmene', () => {
    expect(lesKildeinnhold(side('Stop-doxepin', boks('Doxepin'), avsnitt('x.png', 'Stop doxepin', ['…'])))).toMatchObject({
      sidetype: 'seponering',
      retning: { fra: 'doxepin', til: null },
    })
    const g = lesKildeinnhold(side('Amisulpride-Rest AP', boks('Amisulpride') + gruppeboks('Rest anti-psychotics', ['Loxapine', 'Paliperidone']), '<p>Switch medication from <b>Amisulpride</b> to <b>Rest AP</b>.</p>'))
    expect(g.legemidler[1]).toEqual({
      navn: 'Rest anti-psychotics',
      href: null,
      medlemmer: [
        { navn: 'Loxapine', href: '/switchdetail/loxapine' },
        { navn: 'Paliperidone', href: '/switchdetail/paliperidone' },
      ],
    })
  })

  it('leser en undertabell på siden', () => {
    const s = lesKildeinnhold(
      side(
        'Paliperidone ER-Paliperidone ER',
        '',
        `<div><p><b><a href="/switchdetail/paliperidone-lp">Paliperidone LP</a></b> = Xeplion</p>
        <table class="switchtable"><tbody><tr><th>↓ from</th><th>to →</th><th>Lp</th><th>Sp</th></tr>
        <tr><th>Lp</th><th>Paliperidone LP</th><td> — </td><td><a href="/switchdetail/paliperidone-lp-paliperidone-sp" title="Paliperidone LP-Paliperidone SP">LpSp</a></td></tr>
        <tr><th>Sp</th><th>Paliperidone SP</th><td><a href="/switchdetail/paliperidone-sp-paliperidone-lp" title="x">SpLp</a></td><td> — </td></tr>
        </tbody></table></div>`,
      ),
    )
    expect(s.sidetype).toBe('undertabell')
    expect(s.undertabell!.celler.filter((c) => c.type === 'lenke').map((c) => `${c.rad}>${c.kolonne}`)).toEqual(['Lp>Sp', 'Sp>Lp'])
    // Bare koordinater og lenker: ikke lenketitlene eller -tekstene fra kilden.
    expect(s.undertabell!.celler[1]).toEqual({ rad: 'Lp', kolonne: 'Sp', type: 'lenke', href: '/switchdetail/paliperidone-lp-paliperidone-sp' })
  })

  it('kaster på en side uten MediaWiki-innhold', () => {
    expect(() => lesKildeinnhold('<html><h1>Not found</h1></html>')).toThrow(/MediaWiki/)
  })
})

/* --- Hentingen --------------------------------------------------------------- */

describe('Hentingen av en kildeside', () => {
  /** En `fetch` som svarer med statusene i rekkefølge; en `Error` er et brudd i forbindelsen. */
  const falsk = (svar: (number | Error)[]) => {
    const hent = vi.fn(async (url: string | URL | Request) => {
      const s = svar.shift()!
      if (s instanceof Error) throw s
      return { status: s, url: String(url), text: async () => `<html>${s}</html>` } as Response
    })
    const vent = vi.fn(async () => {})
    return { hent: hent as unknown as typeof fetch, kall: hent, vent, na: () => '2026-10-27T20:00:00Z' }
  }

  it('skiller svar som sier noe om siden fra forbigående serverfeil', () => {
    for (const s of [200, 301, 400, 403, 404, 410]) expect(erForbigaende(s), String(s)).toBe(false)
    for (const s of [408, 425, 429, 500, 502, 503, 504]) expect(erForbigaende(s), String(s)).toBe(true)
  })

  it('godtar en reell 404 med én gang, uten nye forsøk', async () => {
    const f = falsk([404])
    await expect(hentKilde('https://psychiatrienet.nl/switchdetail/stop', f)).resolves.toMatchObject({ status: 404, hentet: '2026-10-27T20:00:00Z' })
    expect(f.kall).toHaveBeenCalledTimes(1)
    expect(f.vent).not.toHaveBeenCalled()
  })

  it('prøver 429, serverfeil og brudd på nytt med økende pause, og bruker svaret når det kommer', async () => {
    const f = falsk([429, 503, new Error('ECONNRESET'), 200])
    await expect(hentKilde('https://psychiatrienet.nl/x', { ...f, pause: 10 })).resolves.toMatchObject({ status: 200, html: '<html>200</html>' })
    expect(f.kall).toHaveBeenCalledTimes(4)
    expect(f.vent.mock.calls).toEqual([[10], [20], [40]])
  })

  it('kaster når feilen vedvarer, så en midlertidig feil aldri blir arkivert som et hull', async () => {
    const f = falsk([500, 500, 429])
    await expect(hentKilde('https://psychiatrienet.nl/x', { ...f, forsok: 3 })).rejects.toThrow(ForbigaendeFeil)
    expect(f.kall).toHaveBeenCalledTimes(3)
  })

  it('skriver bare arkivet og rapporten til disk, aldri sidene selv', () => {
    const skript = readFileSync(new URL('../../scripts/verktoy-kildeimport.ts', import.meta.url), 'utf8')
    expect(skript).not.toMatch(/mellomlager|mkdirSync|appendFileSync|createWriteStream|copyFileSync/)
    expect([...skript.matchAll(/writeFileSync\(([^,]+),/g)].map((m) => m[1]!.trim())).toEqual(['ARKIV', 'new URL(`../${KILDERAPPORTFIL}`'])
    expect(skript).toMatch(/hentKilde\(/)
  })
})

/* --- Arkivet ---------------------------------------------------------------- */

const sideinn = (href: string, sha: string, hentet = '2026-10-27T20:00:00Z'): Sideinnhenting => ({
  href,
  url: `https://psychiatrienet.nl${href}`,
  hentet,
  status: 200,
  endelig: null,
  leser: 1,
  innhold: { ...lesKildeinnhold(bytteside()), sha256_anbefaling: sha },
})
const innhenting = (sider: Sideinnhenting[], tid = '2026-10-27T20:00:00Z'): Innhenting => ({ startet: tid, ferdig: tid, leser: 1, tabeller: [], sider })

describe('Kildearkivet', () => {
  const forste = registrerInnhenting(TOMT_ARKIV, innhenting([sideinn('/a', 'a1'), sideinn('/b', 'b1')]))

  it('legger første innhenting inn som uttrekk 1, uten å endre det tomme arkivet', () => {
    expect(forste.arkiv.uttrekk.map((u) => u.nr)).toEqual([1])
    expect(forste.endringer.map((e) => `${e.type} ${e.id}`)).toEqual(['ny /a', 'ny /b'])
    expect(TOMT_ARKIV.uttrekk).toEqual([])
  })

  it('flytter bare sist_sett for en uendret side, også når den er hentet på et annet tidspunkt', () => {
    const { arkiv, endringer } = registrerInnhenting(forste.arkiv, innhenting([sideinn('/a', 'a1', '2026-11-01T00:00:00Z'), sideinn('/b', 'b1')]))
    expect(arkiv.sider).toHaveLength(2)
    expect(arkiv.sider.map((s) => [s.href, s.forst_sett, s.sist_sett, s.hentet])).toEqual([
      ['/a', 1, 2, '2026-10-27T20:00:00Z'],
      ['/b', 1, 2, '2026-10-27T20:00:00Z'],
    ])
    expect(endringer.every((e) => e.type === 'uendret')).toBe(true)
    expect(uttrekksendringer(arkiv)).toEqual([])
  })

  it('legger en endret side til som ny versjon og beholder den gamle urørt', () => {
    const gammel = JSON.stringify(forste.arkiv.sider.find((s) => s.href === '/a'))
    const { arkiv, endringer } = registrerInnhenting(forste.arkiv, innhenting([sideinn('/a', 'a2'), sideinn('/b', 'b1')]))
    const a = arkiv.sider.filter((s) => s.href === '/a')
    expect(a.map((s) => [s.innhold!.sha256_anbefaling, s.forst_sett, s.sist_sett])).toEqual([
      ['a1', 1, 1],
      ['a2', 2, 2],
    ])
    expect(JSON.stringify(a[0])).toBe(gammel)
    expect(endringer.find((e) => e.id === '/a')!.type).toBe('endret')
    expect(utsnitt(arkiv, 1).sider.get('/a')!.innhold!.sha256_anbefaling).toBe('a1')
    expect(utsnitt(arkiv, 2).sider.get('/a')!.innhold!.sha256_anbefaling).toBe('a2')
    expect(uttrekksendringer(arkiv)).toEqual([{ type: 'endret', hva: 'side', id: '/a' }])
  })

  it('beholder en side som er borte, og gir den en ny versjon når den kommer tilbake', () => {
    const borte = registrerInnhenting(forste.arkiv, innhenting([sideinn('/a', 'a1')]))
    expect(borte.endringer.find((e) => e.id === '/b')!.type).toBe('forsvunnet')
    expect(borte.arkiv.sider.find((s) => s.href === '/b')).toMatchObject({ forst_sett: 1, sist_sett: 1 })
    expect(utsnitt(borte.arkiv).sider.has('/b')).toBe(false)
    const tilbake = registrerInnhenting(borte.arkiv, innhenting([sideinn('/a', 'a1'), sideinn('/b', 'b1')]))
    expect(tilbake.arkiv.sider.filter((s) => s.href === '/b').map((s) => [s.forst_sett, s.sist_sett])).toEqual([
      [1, 1],
      [3, 3],
    ])
  })

  it('godtar ikke samme side to ganger i én innhenting', () => {
    expect(() => registrerInnhenting(TOMT_ARKIV, innhenting([sideinn('/a', 'a1'), sideinn('/a', 'a1')]))).toThrow(/to ganger/)
  })

  it('oppdager en endret kildeside i det virkelige arkivet uten å endre tidligere versjoner eller oppføringer', () => {
    const naa = utsnitt(ARKIV)
    const sider = [...naa.sider.values()].map(({ forst_sett: _f, sist_sett: _s, ...s }) => s)
    const endret = sider.find((s) => s.href === '/switchdetail/agomelatine-amitriptyline')!
    endret.innhold = { ...endret.innhold!, revisjon: 99999, sha256_anbefaling: 'f'.repeat(64) }
    const tabeller = naa.tabeller.map(({ forst_sett: _f, sist_sett: _s, ...t }) => t)
    const { arkiv, endringer } = registrerInnhenting(ARKIV, { startet: '2027-01-01T00:00:00Z', ferdig: '2027-01-01T00:10:00Z', leser: 1, tabeller, sider })
    expect(endringer.filter((e) => e.type !== 'uendret')).toEqual([{ type: 'endret', hva: 'side', id: '/switchdetail/agomelatine-amitriptyline' }])
    const nr = arkiv.uttrekk.at(-1)!.nr
    expect(kildegrunnlag(arkiv, K).anbefalinger.find((a) => a.id === 'SwitchAntidepressants:Ag>At')).toMatchObject({ revisjon: 99999, uttrekk: nr })
    expect(kildegrunnlag(arkiv, K, nr - 1).anbefalinger.find((a) => a.id === 'SwitchAntidepressants:Ag>At')).toEqual(finn('SwitchAntidepressants:Ag>At'))
    expect(arkiv.sider.filter((s) => s.forst_sett < nr)).toEqual(ARKIV.sider.map((s) => (s.sist_sett === nr - 1 && s.href !== endret.href ? { ...s, sist_sett: nr } : s)))
  })
})

/* --- Det virkelige kildegrunnlaget ------------------------------------------ */

describe('Kildegrunnlaget fra Psychiatrienet', () => {
  const tabell = (id: string) => G.tabeller.find((t) => t.tabell === id)!

  it('har ett uttrekk med alle tre tabellene, og hver side tabellene lenker til (utenom de utelatte)', () => {
    expect(G.tabeller.map((t) => t.tabell).sort()).toEqual(['CombiningMoodstabilizers', 'SwitchAntidepressants', 'SwitchAntipsychotics'])
    const mal = importmalForTabeller(K, G.tabeller.map((t) => ({ id: t.tabell, celler: t.celler })))
    const sider = utsnitt(ARKIV).sider
    expect(mal.filter((h) => !sider.has(h))).toEqual([])
  })

  it('gir hver celle i hver tabell nøyaktig én status, og hver lenket importcelle en oppføring eller en undertabell', () => {
    for (const t of G.tabeller) {
      for (const c of t.celler) expect(G.celler.has(`${t.tabell}:${c.rad}>${c.kolonne}`), `${t.tabell}:${c.rad}>${c.kolonne}`).toBe(true)
      for (const c of importceller(K, { id: t.tabell, celler: t.celler })) {
        const id = `${t.tabell}:${c.rad}>${c.kolonne}`
        const s = G.celler.get(id)
        if (s === 'undertabell') expect(G.anbefalinger.some((a) => a.id.startsWith(`${id}/`))).toBe(true)
        else expect(G.anbefalinger.filter((a) => a.id === id), id).toHaveLength(1)
      }
    }
    expect(new Set(G.anbefalinger.map((a) => a.id)).size).toBe(G.anbefalinger.length)
    const dekning = kildedekning(G)
    for (const d of dekning) expect(d.celler).toBe(tabell(d.tabell).celler.length)
    expect([...G.celler.values()]).not.toContain('ukartlagt')
  })

  it('har samme importmål som P1 når tabellene er de samme', () => {
    for (const t of G.tabeller) {
      const p1 = DATA.tabeller.tabeller.find((x) => x.id === t.tabell)!
      if (p1.sha256 !== t.sha256) continue
      const naa = importceller(K, { id: t.tabell, celler: t.celler }).map((c) => `${c.rad}>${c.kolonne}`)
      expect(naa).toEqual(importmal(DATA).filter((c) => c.tabell === t.tabell).map((c) => `${c.rad}>${c.kolonne}`))
    }
  })

  it('har riktig retning: rad → kolonne, og A → B og B → A er hver sin oppføring', () => {
    for (const a of G.anbefalinger) {
      expect(a.fra.kode, a.id).toBe(a.rad)
      if (a.type === 'seponering') expect(a.til, a.id).toBeNull()
      else expect(a.til!.kode, a.id).toBe(a.kolonne)
    }
    expect(finn('SwitchAntidepressants:Ag>At')!.kildeside).toBe('/switchdetail/agomelatine-amitriptyline')
    expect(finn('SwitchAntidepressants:At>Ag')!.kildeside).toBe('/switchdetail/amitriptyline-agomelatine')
    expect(finn('CombiningMoodstabilizers:Ar>Ca')).toMatchObject({ type: 'tillegg', fra: { virkestoffer: ['aripiprazol'] }, til: { virkestoffer: ['karbamazepin'] } })
    // Retningen siden selv oppgir, stemmer med tabellen for nesten alle; avvikene er kildeproblemer, ikke rettet.
    const retningsavvik = G.anbefalinger.filter((a) => a.kildeproblemer.some((p) => p.startsWith('Siden oppgir «') || p.startsWith('Siden er en')))
    expect(retningsavvik.length).toBeLessThan(G.anbefalinger.length / 20)
  })

  it('merker gruppeanbefalingene og løser gruppen opp i medlemmene fra kartleggingen', () => {
    const restAp = K.grupper.find((g) => g.id === 'rest-ap')!.medlemmer.map((m) => m.virkestoff)
    const tilRestAp = G.anbefalinger.filter((a) => a.til?.gruppe === 'rest-ap')
    expect(tilRestAp.length).toBeGreaterThan(0)
    for (const a of tilRestAp) expect(a).toMatchObject({ grunnlag: 'gruppe', til: { type: 'gruppe', virkestoffer: restAp } })
    expect(G.anbefalinger.filter((a) => a.grunnlag === 'gruppe').every((a) => a.tabell === 'SwitchAntipsychotics')).toBe(true)
    expect(finn('SwitchAntipsychotics:RA>RA')).toMatchObject({ grunnlag: 'gruppe', fra: { gruppe: 'rest-ap' }, til: { gruppe: 'rest-ap' } })
    expect(finn('SwitchAntipsychotics:Am>Hp')!.grunnlag).toBe('individuell')
  })

  it('merker sider som deles av flere celler, uten å telle dem som egne anbefalinger', () => {
    const depot = G.anbefalinger.filter((a) => a.kildeside === '/switchdetail/depot-depot')
    expect(depot).toHaveLength(54)
    for (const a of depot) expect(a.delt_med).toHaveLength(53)
    expect(finn('SwitchAntidepressants:Ag>At')!.delt_med).toEqual([])
  })

  it('tar med depot- og MA-formuleringene, og undertabellen mellom paliperidondepotene', () => {
    expect(G.anbefalinger.find((a) => a.rad === 'Da' && a.kolonne === 'Am')).toMatchObject({ fra: { virkestoffer: ['aripiprazol'], formulering: 'LA' } })
    expect(G.anbefalinger.find((a) => a.rad === 'Mz' && a.kolonne === 'Am')).toMatchObject({ fra: { virkestoffer: ['zuklopentiksol'], formulering: 'MA' } })
    expect(G.celler.get('SwitchAntipsychotics:Dp>Dp')).toBe('undertabell')
    const pali = G.anbefalinger.filter((a) => a.under?.side === '/switchdetail/paliperidone-er-paliperidone-er')
    expect(pali.map((a) => `${a.under!.rad}>${a.under!.kolonne}`).sort()).toEqual(['Lp>Sp', 'Lp>Up', 'Sp>Lp', 'Sp>Up', 'Up>Lp', 'Up>Sp'])
    for (const a of pali) expect(a).toMatchObject({ fra: { virkestoffer: ['paliperidon'], formulering: 'ER' }, til: { formulering: 'ER' } })
    expect(pali.find((a) => a.under!.rad === 'Lp')!.fra.variant).toEqual({ kode: 'Lp', navn: 'Paliperidone LP' })
  })

  it('har en Stop-oppføring for hvert antidepressiv utenom johannesurt, og ingen Start', () => {
    const stopp = G.anbefalinger.filter((a) => a.type === 'seponering')
    const rader = tabell('SwitchAntidepressants').rader.filter((r) => r.kode !== 'Hy')
    expect(stopp.map((a) => a.rad).sort()).toEqual(rader.map((r) => r.kode).sort())
    expect(stopp.every((a) => a.tabell === 'SwitchAntidepressants' && a.kolonne === 'Stop')).toBe(true)
    expect(G.anbefalinger.some((a) => a.rad === 'Start' || a.kolonne === 'Start')).toBe(false)
    const start = [...G.celler].filter(([id]) => /:(Start>|.*>Start)/.test(id) && !id.includes('Hy'))
    expect(start).toHaveLength(23)
    expect(start.every(([, s]) => s === 'ikke_importert')).toBe(true)
  })

  it('henter de feillenkede Stop-anbefalingene fra kildens egne sider, og konstruerer ikke den som mangler', () => {
    expect(finn('SwitchAntidepressants:Vo>Stop')).toMatchObject({
      href: '/switchdetail/stop',
      kildeside: '/switchdetail/stop-vortioxetine',
      tilgjengelighet: 'alternativ_adresse',
    })
    expect(finn('SwitchAntidepressants:Dx>Stop')).toMatchObject({ kildeside: '/switchdetail/stop-doxepin', tilgjengelighet: 'alternativ_adresse' })
    const fenelzin = finn('SwitchAntidepressants:Fe>Stop')!
    expect(fenelzin).toMatchObject({ kildeside: null, tilgjengelighet: 'utilgjengelig', sha256_anbefaling: null, revisjon: null })
    expect(fenelzin.kildeproblemer.join(' ')).toMatch(/svarer 404/)
    for (const id of ['Vo', 'Dx']) expect(finn(`SwitchAntidepressants:${id}>Stop`)!.kildeproblemer).toHaveLength(1)
  })

  it('utelater johannesurt helt: ingen celle, side eller oppføring', () => {
    const hy = [...G.celler].filter(([id]) => /:(Hy>|.*>Hy)/.test(id))
    expect(hy.length).toBe(49)
    expect(hy.every(([, s]) => s === 'ekskludert')).toBe(true)
    for (const s of ARKIV.sider) {
      expect(erSperret(K, s.href) || erSperret(K, s.innhold?.overskrift ?? ''), s.href).toBe(false)
      for (const l of s.innhold?.legemidler ?? []) for (const n of [l.navn, ...l.medlemmer.map((m) => m.navn)]) expect(erSperret(K, n), s.href).toBe(false)
    }
    for (const a of G.anbefalinger) for (const p of [a.fra, a.til]) expect(p?.virkestoffer.some((v) => erSperret(K, v)) ?? false).toBe(false)
  })

  it('er kildeoppføringer med kilde, revisjon, tidspunkt og kontrollsum, ikke regler', () => {
    for (const a of G.anbefalinger) {
      expect(a.status).toBe('kildeoppføring')
      if (a.tilgjengelighet === 'utilgjengelig') continue
      expect(a.url, a.id).toMatch(/^https:\/\/psychiatrienet\.nl\/switchdetail\//)
      expect(a.hentet, a.id).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/)
      expect(a.revisjon, a.id).toBeGreaterThan(0)
      expect(a.sha256_anbefaling, a.id).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  it('merker sider med nøyaktig samme anbefalingstekst på ulike adresser', () => {
    for (const a of G.anbefalinger) {
      for (const b of a.samme_tekst_som.map(finn)) {
        expect(b!.sha256_anbefaling).toBe(a.sha256_anbefaling)
        expect(b!.kildeside).not.toBe(a.kildeside)
      }
    }
  })
})

describe('Rettighetene og skillet mot regler', () => {
  /**
   * Hvert felt arkivet har lov til å ha, og hva slags verdi det kan ha. Et
   * nytt felt i arkivet må legges til her med vilje, etter en vurdering mot
   * `docs/verktøy-p3-rettigheter.md`. `navn` er koder og navn fra kilden
   * (virkestoffer, grupper, sidetitler), aldri en setning.
   */
  type Verdi = 'tall' | 'tid' | 'sha' | 'adresse' | 'lenke' | 'kode' | 'navn' | 'egen'
  const AKSER = (p: string): Record<string, Verdi> => ({
    [`${p}.radetikett`]: 'navn',
    [`${p}.kolonneetikett`]: 'navn',
    [`${p}.rader[].kode`]: 'kode',
    [`${p}.rader[].navn`]: 'navn',
    [`${p}.kolonner[].kode`]: 'kode',
    [`${p}.kolonner[].navn`]: 'navn',
    [`${p}.grupper[].navn`]: 'navn',
    [`${p}.grupper[].href`]: 'lenke',
    [`${p}.grupper[].medlemmer[].navn`]: 'navn',
    [`${p}.grupper[].medlemmer[].href`]: 'lenke',
    [`${p}.celler[].rad`]: 'kode',
    [`${p}.celler[].kolonne`]: 'kode',
    [`${p}.celler[].type`]: 'kode',
    [`${p}.celler[].href`]: 'lenke',
  })
  const ARKIVFELT: Record<string, Verdi> = {
    om: 'egen',
    'uttrekk[].nr': 'tall',
    'uttrekk[].startet': 'tid',
    'uttrekk[].ferdig': 'tid',
    'uttrekk[].leser': 'tall',
    'tabeller[].tabell': 'kode',
    'tabeller[].url': 'adresse',
    'tabeller[].hentet': 'tid',
    'tabeller[].sha256': 'sha',
    'tabeller[].revisjon': 'tall',
    'tabeller[].lagret': 'tid',
    'tabeller[].forst_sett': 'tall',
    'tabeller[].sist_sett': 'tall',
    ...AKSER('tabeller[]'),
    'sider[].href': 'lenke',
    'sider[].url': 'adresse',
    'sider[].hentet': 'tid',
    'sider[].status': 'tall',
    'sider[].endelig': 'adresse',
    'sider[].leser': 'tall',
    'sider[].forst_sett': 'tall',
    'sider[].sist_sett': 'tall',
    'sider[].innhold': 'egen',
    'sider[].innhold.overskrift': 'navn',
    'sider[].innhold.revisjon': 'tall',
    'sider[].innhold.lagret': 'tid',
    'sider[].innhold.sha256_side': 'sha',
    'sider[].innhold.sha256_anbefaling': 'sha',
    'sider[].innhold.sidetype': 'kode',
    'sider[].innhold.retning': 'egen',
    'sider[].innhold.retning.fra': 'navn',
    'sider[].innhold.retning.til': 'navn',
    'sider[].innhold.avsnitt[]': 'kode',
    'sider[].innhold.legemidler[].navn': 'navn',
    'sider[].innhold.legemidler[].href': 'lenke',
    'sider[].innhold.legemidler[].medlemmer[].navn': 'navn',
    'sider[].innhold.legemidler[].medlemmer[].href': 'lenke',
    'sider[].innhold.undertabell': 'egen',
    ...AKSER('sider[].innhold.undertabell'),
  }
  const FORM: Record<Verdi, (x: unknown) => boolean> = {
    tall: (x) => typeof x === 'number' && Number.isInteger(x),
    tid: (x) => typeof x === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(x),
    sha: (x) => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x),
    adresse: (x) => typeof x === 'string' && /^https:\/\/psychiatrienet\.nl\/\S*$/.test(x),
    // Også kildens egne lenker til wikien, f.eks. til en side som ikke finnes.
    lenke: (x) => typeof x === 'string' && /^(\/|https?:\/\/([a-z]+\.)?psychiatrienet\.nl\/)\S+$/.test(x),
    kode: (x) => typeof x === 'string' && /^[A-Za-z_]{1,40}$/.test(x),
    // Et navn er kort og har ingen setningsskille.
    navn: (x) => typeof x === 'string' && x.length <= 60 && !/[.:;!?](\s|$)/.test(x),
    egen: () => true,
  }

  /** Felt som ikke er tillatt, eller har en verdi av feil form, i `x` (som ligger på `sti` i arkivet). */
  const feltfeil = (x: unknown, sti = '', feil: string[] = []): string[] => {
    if (Array.isArray(x)) x.forEach((y) => feltfeil(y, `${sti}[]`, feil))
    else if (x && typeof x === 'object') for (const [n, y] of Object.entries(x)) feltfeil(y, sti ? `${sti}.${n}` : n, feil)
    else if (!ARKIVFELT[sti]) feil.push(`${sti}: ikke et tillatt felt`)
    else if (x !== null && !FORM[ARKIVFELT[sti]](x)) feil.push(`${sti}: ${JSON.stringify(x).slice(0, 80)} er ikke ${ARKIVFELT[sti]}`)
    return feil
  }

  it('har bare de tillatte feltene i arkivet, med verdier av riktig form', () => {
    expect([...new Set(feltfeil(ARKIV))]).toEqual([])
  })

  it('oppdager et felt som ikke er tillatt, og en setning i et navnefelt', () => {
    const side = utsnitt(ARKIV).sider.get('/switchdetail/agomelatine-amitriptyline')!
    const med = (endring: Partial<NonNullable<Sideinnhenting['innhold']>> & Record<string, unknown>) =>
      feltfeil({ ...side, innhold: { ...side.innhold!, ...endring } }, 'sider[]').map((f) => f.split(':')[0])
    expect(med({})).toEqual([])
    expect(med({ tekst: 'Day 1: stop.' })).toEqual(['sider[].innhold.tekst'])
    expect(med({ overskrift: 'Stop gradually. Then start.' })).toEqual(['sider[].innhold.overskrift'])
  })

  it('brukes ikke av appen: bare verktøymodulene og testene leser kildearkivet', () => {
    const filer: string[] = []
    const gaa = (mappe: string) => {
      for (const n of readdirSync(mappe)) {
        const sti = join(mappe, n)
        if (statSync(sti).isDirectory()) gaa(sti)
        else if (/\.(ts|tsx)$/.test(n)) filer.push(sti)
      }
    }
    const rot = new URL('../', import.meta.url).pathname
    gaa(rot)
    const brukere = filer
      .filter((f) => /psychiatrienet-kildearkiv|verktoy\/kilde(arkiv|anbefalinger|henting|rapport|side)/.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(rot.length))
      .filter((f) => !f.startsWith('verktoy/') && !f.startsWith('__tests__/'))
    expect(brukere).toEqual([])
  })
})

describe('Rapporten om kildegrunnlaget', () => {
  it('er oppdatert', () => {
    const ny = 'Lag den på nytt med `npm run verktoy:kildeimport -- rapport`.'
    expect(readFileSync(new URL(`../../${KILDERAPPORTFIL}`, import.meta.url), 'utf8'), ny).toBe(lagKilderapport())
  })
})
