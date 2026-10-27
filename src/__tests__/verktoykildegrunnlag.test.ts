/**
 * Kildegrunnlaget for OUSFAR Verktøy (P3 i `docs/verktøy-utviklingsplan.md`):
 * lesingen av en kildeside, at kildearkivet bare vokser og viser endringer,
 * og at oppføringene laget av arkivet er fullstendige, har riktig retning,
 * grupper, delte sider og formuleringer, utelater johannesurt og
 * Start-kolonnen, ikke har kildetekst og ikke er regler. Og at rapporten er
 * oppdatert.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
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
  it('leser et bytte: retningen, avsnittene og faktaboksene, uten teksten', () => {
    const s = lesKildeinnhold(bytteside())
    expect(s).toMatchObject({
      overskrift: 'Agomelatine-amitriptyline',
      revisjon: 9570,
      lagret: '2023-02-25T01:10:35Z',
      sidetype: 'bytte',
      retning: { fra: 'agomelatine', til: 'amitriptyline' },
      undertabell: null,
    })
    expect(s.avsnitt).toEqual([
      { type: 'stopp', overskrift: 'Stop agomelatine' },
      { type: 'start', overskrift: 'Start amitriptyline' },
      { type: 'informasjon', overskrift: 'More information' },
    ])
    expect(s.legemidler.map((l) => [l.navn, l.href])).toEqual([
      ['Agomelatine', '/switchdetail/agomelatine'],
      ['Amitriptyline', '/switchdetail/amitriptyline'],
    ])
    expect(JSON.stringify(s)).not.toMatch(/Day \d|normal dosage|wash-out/)
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
  })

  it('kaster på en side uten MediaWiki-innhold', () => {
    expect(() => lesKildeinnhold('<html><h1>Not found</h1></html>')).toThrow(/MediaWiki/)
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
  it('har ingen anbefalingstekst i arkivet, bare korte fakta', () => {
    const lange: string[] = []
    const gaa = (x: unknown, sti: string) => {
      if (typeof x === 'string') {
        if (x.length > 200 || /\bDay \d|\bdosage\b|wash-?out|\btaper/i.test(x)) lange.push(`${sti}: ${x.slice(0, 60)}`)
      } else if (Array.isArray(x)) x.forEach((y, i) => gaa(y, `${sti}[${i}]`))
      else if (x && typeof x === 'object') for (const [n, y] of Object.entries(x)) gaa(y, `${sti}.${n}`)
    }
    gaa(ARKIV.sider, 'sider')
    gaa(ARKIV.tabeller, 'tabeller')
    expect(lange).toEqual([])
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
      .filter((f) => /psychiatrienet-kildearkiv|verktoy\/kilde(arkiv|anbefalinger|rapport|side)/.test(readFileSync(f, 'utf8')))
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
