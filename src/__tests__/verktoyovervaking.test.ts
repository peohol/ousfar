/**
 * Kildeovervåkingen for OUSFAR Verktøy (P12.1 og P12.5,
 * `docs/verktøy-p12-overvaking.md`), med syntetiske endringer: at endrede,
 * fjernede, nye og utilgjengelige kildedokumenter, Psychiatrienet-oppføringer
 * og FEST-preparater oppdages; at bare det som treffer en klinisk godkjent
 * regel og sier noe om innholdet, krever ny faglig vurdering; at rapporten
 * ikke har kildetekst; og at overvåkingen ikke endrer reglene, godkjenningene,
 * grunnlaget eller arkivet.
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import arkivfil from '../data/verktoy/psychiatrienet-kildearkiv.json'
import { utsnitt, type Innhenting, type Kildearkiv } from '../verktoy/kildearkiv'
import { kildegrunnlag } from '../verktoy/kildeanbefalinger'
import { ForbigaendeFeil, type Dokumentsvar } from '../verktoy/kildehenting'
import { byggesteiner } from '../verktoy/motor/byggesteiner'
import { festkoblinger, KARTLEGGING } from '../verktoy/register'
import { FEST_AKSEPTTEST, FEST_PILOT, omgivelseFor, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { erKliniskGodkjent, fingeravtrykk } from '../verktoy/regler/godkjenning'
import { KILDER } from '../verktoy/regler/kilder'
import type { Kilde } from '../verktoy/regler/modell'
import { REGELSETTENE } from '../verktoy/tilgjengelighet'
import { godkjenteRegler, virkestofferForFest } from '../verktoy/overvaking/berorte'
import { dokumentgrunnlag, kontrollerDokumenter, kontrollsummer, synligTekst, uovervaketeKilder, type Fastsattgrunnlag } from '../verktoy/overvaking/dokumenter'
import { festfunn, kontrollerFest } from '../verktoy/overvaking/fest'
import { kjorOvervaking, PROVEFUNN } from '../verktoy/overvaking/kjoring'
import { nivaFor, prioritetFor, type Overvakingsfunn } from '../verktoy/overvaking/modell'
import { psychiatrienetfunn } from '../verktoy/overvaking/psychiatrienet'
import { funnavtrykk, kreverVurdering, lagOvervakingsrapport } from '../verktoy/overvaking/rapport'

const ROT = new URL('../../', import.meta.url).pathname
const les = (fil: string) => readFileSync(`${ROT}${fil}`, 'utf8')
const REGLER = godkjenteRegler()
const K = KARTLEGGING
const sha = (x: string | Uint8Array) => createHash('sha256').update(x).digest('hex')
const kopi = <T>(x: T): T => structuredClone(x)

/** Et ord som bare står i den syntetiske kildeteksten; det skal aldri komme med i et funn eller en rapport. */
const KILDETEKST = 'SYNTETISKKILDETEKST'

/* --- De godkjente reglene ---------------------------------------------------- */

describe('hva de godkjente reglene bygger på', () => {
  it('er nøyaktig de klinisk godkjente regelversjonene, med fingeravtrykket godkjenningen gjelder', () => {
    const godkjente = REGELSETTENE.flatMap((s) => s.regler.filter(erKliniskGodkjent).map((r) => `${s.id}/${r.id} v${r.versjon} ${fingeravtrykk(r)}`)).sort()
    expect(REGLER.map((g) => `${g.regelsett}/${g.regel.id} v${g.regel.versjon} ${g.fingeravtrykk}`).sort()).toEqual(godkjente)
    expect(REGLER.map((g) => `${g.regel.id} v${g.regel.versjon}`).sort()).toEqual([
      'depot-aripiprazol-maintena v3',
      'depot-paliperidon-xeplion v3',
      'kryssnedtrapping-sertralin-mirtazapin v9',
      'seponering-agomelatin v1',
      'seponering-bupropion v5',
      'seponering-vortioksetin v11',
    ])
  })

  it('kjenner kildene, Psychiatrienet-oppføringene og om regelen bruker FEST', () => {
    const regel = (id: string) => REGLER.find((g) => g.regel.id === id)!
    const s = regel('kryssnedtrapping-sertralin-mirtazapin')
    expect([...s.kilder].sort()).toEqual(['dmp-remeron', 'dmp-zoloft', 'keks-2016', 'nice-ng222', 'rcpsych-stopping'])
    expect([...s.kildeoppforinger]).toEqual(['SwitchAntidepressants:Se>Mz'])
    expect(regel('seponering-bupropion').beregning).toBe(false)
    expect(regel('seponering-agomelatin').beregning).toBe(false)
    // Tekstreglene bygger ingen plan av preparatene, så FEST kontrolleres bare for de beregnbare.
    expect(virkestofferForFest(REGLER)).toEqual(['aripiprazol', 'mirtazapin', 'paliperidon', 'sertralin', 'vortioksetin'])
  })

  it('gir krever vurdering bare når endringen treffer en godkjent regel og sier noe om innholdet', () => {
    const b = [{ regelsett: 's', regel: 'r', versjon: 1, fingeravtrykk: 'f', hvorfor: 'h' }]
    expect(nivaFor('endret', b)).toBe('krever_vurdering')
    expect(nivaFor('fjernet', b)).toBe('krever_vurdering')
    expect(nivaFor('ny', b)).toBe('krever_vurdering')
    expect(nivaFor('utilgjengelig', b)).toBe('informativ')
    expect(nivaFor('endret', b, false)).toBe('informativ')
    expect(nivaFor('endret', [])).toBe('informativ')
  })
})

/* --- Kildedokumentene -------------------------------------------------------- */

describe('kildedokumentene', () => {
  const PDF = new TextEncoder().encode(`%PDF-1.7 ${KILDETEKST} sertralin 50 mg`)
  const SIDE = (engang: string, tekst = `${KILDETEKST} Stopping antidepressants`) =>
    `<html><head><script>var x="${engang}"</script><style>p{color:red}</style></head><body><!-- ${engang} --><p>${tekst}</p>\n\n<p>Del  2</p></body></html>`
  const svar = (body: string | Uint8Array, status = 200, type = typeof body === 'string' ? 'text/html' : 'application/pdf'): Dokumentsvar => ({
    status,
    endelig: '',
    type,
    bytes: typeof body === 'string' ? new TextEncoder().encode(body) : body,
    hentet: '2026-11-02T06:00:00Z',
  })
  /** En syntetisk utgave av en ekte kilde: samme id, så de godkjente reglene som henviser til den, er med; adresse og kontrollsum er syntetiske. */
  const kilde = (id: string, sha256: string | null, url = `https://kilde.example.invalid/${id}`): Kilde => ({ ...KILDER.find((k) => k.id === id)!, url, sha256, hentet: '2026-10-28T10:00:00Z' })
  const hentFra = (svarene: Record<string, Dokumentsvar | Error>) => async (url: string) => {
    const s = svarene[url]
    if (!s) throw new Error(`Ukjent adresse ${url}`)
    if (s instanceof Error) throw s
    return s
  }
  const kontroller = (kilder: Kilde[], svarene: Record<string, Dokumentsvar | Error>, fastsatt: Fastsattgrunnlag[] = []) =>
    kontrollerDokumenter(REGLER, hentFra(svarene), dokumentgrunnlag(kilder, fastsatt))
  const url = (id: string) => `https://kilde.example.invalid/${id}`

  it('overvåker hver kilde med kontrollsum i regelkildene, og ingen uten', () => {
    expect(dokumentgrunnlag().map((g) => g.kilde.id)).toEqual(KILDER.filter((k) => k.sha256).map((k) => k.id))
    expect(uovervaketeKilder().every((k) => !k.sha256)).toBe(true)
    expect(dokumentgrunnlag().length + uovervaketeKilder().length).toBe(KILDER.length)
    // Grunnlaget i repoet er ikke fastsatt på nytt ennå; da gjelder kontrollsummene i KILDER.
    expect(JSON.parse(les('src/data/verktoy/kildekontroll-grunnlag.json')).dokumenter).toEqual([])
    expect(dokumentgrunnlag().every((g) => g.metode === null)).toBe(true)
  })

  it('godtar et uendret dokument, og en nettside med samme synlige tekst når bare skript og kommentarer skifter', async () => {
    const r = await kontroller([kilde('dmp-zoloft', sha(PDF)), kilde('rcpsych-stopping', sha(synligTekst(SIDE('a'))))], {
      [url('dmp-zoloft')]: svar(PDF),
      [url('rcpsych-stopping')]: svar(SIDE('b')),
    })
    expect(r.funn).toEqual([])
    expect(r.grunnlag).toMatchObject({ kilde: 'dokument', kjort: true, kontrollert: 2 })
  })

  it('leser den synlige teksten uten skript, stil, kommentarer og tagger, med mellomrom samlet', () => {
    expect(synligTekst(SIDE('a', 'Hei'))).toBe('Hei Del 2')
    expect(kontrollsummer(svar(PDF)).synlig_tekst).toBeNull()
  })

  it('melder et endret dokument som krever vurdering, med de godkjente reglene og de nye kontrollsummene, uten kildetekst', async () => {
    const ny = SIDE('a', `${KILDETEKST} Revidert`)
    const r = await kontroller([kilde('keks-2016', sha(SIDE('a')))], { [url('keks-2016')]: svar(ny) })
    expect(r.funn).toHaveLength(1)
    const f = r.funn[0]!
    expect(f).toMatchObject({ id: 'dokument:keks-2016', kilde: 'dokument', art: 'endret', niva: 'krever_vurdering', objekt: 'keks-2016' })
    expect(f.berorte.map((b) => `${b.regel} v${b.versjon}`)).toEqual(['kryssnedtrapping-sertralin-mirtazapin v9'])
    expect(f.berorte[0]!.fingeravtrykk).toBe(fingeravtrykk(REGLER.find((g) => g.regel.id === 'kryssnedtrapping-sertralin-mirtazapin')!.regel))
    expect(f.detaljer.join(' ')).toContain(sha(new TextEncoder().encode(ny)))
    expect(f.detaljer.join(' ')).toContain(sha(synligTekst(ny)))
    expect(JSON.stringify(f)).not.toContain(KILDETEKST)
  })

  it('melder en kilde som er borte (404, 410) som fjernet, og en som ikke svarer som ikke kontrollert', async () => {
    const r = await kontroller(
      [kilde('dmp-zoloft', sha(PDF)), kilde('dmp-remeron', sha(PDF)), kilde('nice-ng222', sha(PDF)), kilde('ema-brintellix', sha(PDF)), kilde('ema-xeplion', sha(PDF))],
      {
        [url('dmp-zoloft')]: svar('', 404),
        [url('dmp-remeron')]: svar('', 410),
        [url('nice-ng222')]: svar('', 503),
        [url('ema-brintellix')]: new ForbigaendeFeil('tidsavbrudd'),
        [url('ema-xeplion')]: new Error('ugyldig sertifikat'),
      },
    )
    const ved = (id: string) => r.funn.find((f) => f.objekt === id)!
    expect(ved('dmp-zoloft')).toMatchObject({ art: 'fjernet', niva: 'krever_vurdering' })
    expect(ved('dmp-remeron')).toMatchObject({ art: 'fjernet', niva: 'krever_vurdering' })
    for (const id of ['nice-ng222', 'ema-brintellix', 'ema-xeplion']) expect(ved(id), id).toMatchObject({ art: 'utilgjengelig', niva: 'informativ' })
    expect(ved('ema-brintellix').detaljer[0]).toMatch(/neste kjøring/)
    expect(ved('ema-xeplion').detaljer[0]).toMatch(/ugyldig sertifikat/)
  })

  it('gir en endring i en kilde ingen godkjent regel henviser til, som informativ', async () => {
    const r = await kontroller([kilde('emc-nardil', sha(PDF))], { [url('emc-nardil')]: svar(new TextEncoder().encode('%PDF-1.7 ny')) })
    expect(r.funn).toMatchObject([{ art: 'endret', niva: 'informativ', berorte: [] }])
  })

  it('bruker det sist fastsatte grunnlaget i stedet for kontrollsummen i KILDER, med bare metoden det ble fastsatt med', async () => {
    const k = kilde('rcpsych-stopping', 'a'.repeat(64))
    const fastsatt = (sha256: string, metode: Fastsattgrunnlag['metode'], tid: string): Fastsattgrunnlag => ({ kilde: k.id, metode, sha256, fastsatt: tid, vurdering: 'Syntetisk vurdering' })
    const side = SIDE('a')
    const nyest = fastsatt(sha(synligTekst(side)), 'synlig_tekst', '2026-11-03T00:00:00Z')
    expect(dokumentgrunnlag([k], [nyest, fastsatt('b'.repeat(64), 'dokument', '2026-11-01T00:00:00Z')])).toEqual([{ kilde: k, sha256: nyest.sha256, metode: 'synlig_tekst', fastsatt: nyest.fastsatt }])
    expect((await kontroller([k], { [k.url]: svar(SIDE('c')) }, [nyest])).funn).toEqual([])
    // Fastsatt for dokumentet slik det kom: en side med samme synlige tekst, men annet skript, er da endret.
    const somDokument = fastsatt(sha(new TextEncoder().encode(side)), 'dokument', '2026-11-03T00:00:00Z')
    expect((await kontroller([k], { [k.url]: svar(side) }, [somDokument])).funn).toEqual([])
    expect((await kontroller([k], { [k.url]: svar(SIDE('c')) }, [somDokument])).funn).toMatchObject([{ art: 'endret', niva: 'krever_vurdering' }])
  })
})

/* --- FEST -------------------------------------------------------------------- */

describe('preparatene i FEST', () => {
  const AKSEPT = JSON.parse(les(FEST_AKSEPTTEST)) as Festuttrekk
  const PILOT = JSON.parse(les(FEST_PILOT)) as Festuttrekk
  const steiner = (u: Festuttrekk, n: string) =>
    byggesteiner({ utvalg: u.utvalg, koblinger: festkoblinger([n], K), overstyringer: K.festoverstyringer }, n, omgivelseFor(u).idag)
  const merkevare = (u: Festuttrekk, id: string) => u.utvalg.merkevarer.find((m) => m.id === id)!
  /** Et preparat i FEST-uttrekket for virkestoffet, valgt etter det beregningen ser. */
  const velg = (n: string, hva: (b: ReturnType<typeof steiner>[number]) => boolean) => steiner(AKSEPT, n).find(hva)!.id
  const SERTRALIN = ['sertralin']
  const tablett = (mg: number) => (b: ReturnType<typeof steiner>[number]) => b.mg === mg && b.legemiddelform?.kode === '53' && b.begrensninger.length === 0

  it('finner ingen endring når uttrekket er det samme', () => {
    expect(festfunn(AKSEPT, kopi(AKSEPT), ['sertralin', 'vortioksetin'], REGLER, K)).toEqual([])
    expect(festfunn(PILOT, kopi(PILOT), virkestofferForFest(REGLER.filter((g) => g.regelsett === 'ousfar-verktoy-pilot')), REGLER, K)).toEqual([])
  })

  it('krever vurdering når et preparat i det godkjente omfanget er borte', () => {
    const id = velg('sertralin', tablett(50))
    const etter = kopi(AKSEPT)
    etter.utvalg.merkevarer = etter.utvalg.merkevarer.filter((m) => m.id !== id)
    const funn = festfunn(AKSEPT, etter, SERTRALIN, REGLER, K)
    expect(funn).toMatchObject([{ id: `fest:sertralin:${id}`, art: 'fjernet', niva: 'krever_vurdering' }])
    expect(funn[0]!.berorte.map((b) => `${b.regel} v${b.versjon}`)).toEqual(['kryssnedtrapping-sertralin-mirtazapin v9'])
    expect(funn[0]!.berorte[0]!.hvorfor).toMatch(/forløpet «fra»/)
  })

  it('krever vurdering når styrke, form eller delbarhet endres, men ikke når bare navnet endres', () => {
    const vortioksetin = velg('vortioksetin', tablett(20))
    const navn = velg('sertralin', tablett(100))
    const etter = kopi(AKSEPT)
    merkevare(etter, vortioksetin).legemiddelform = { kode: '171', tekst: 'Dråper, oppløsning' }
    merkevare(etter, navn).varenavn = 'Syntetisk nytt navn'
    const funn = festfunn(AKSEPT, etter, ['sertralin', 'vortioksetin'], REGLER, K)
    const ved = (id: string) => funn.find((f) => f.objekt === id)!
    expect(ved(vortioksetin)).toMatchObject({ art: 'endret', niva: 'krever_vurdering' })
    expect(ved(vortioksetin).detaljer.some((d) => d.startsWith('legemiddelform: Tablett (53) → Dråper, oppløsning (171)'))).toBe(true)
    // Preparatet var i det godkjente omfanget før endringen, så regelen er berørt selv om det ikke er det etter.
    expect(ved(vortioksetin).berorte.map((b) => b.regel)).toEqual(['seponering-vortioksetin'])
    expect(ved(navn)).toMatchObject({ art: 'endret', niva: 'informativ', detaljer: [expect.stringMatching(/^varenavn: .* → Syntetisk nytt navn$/)] })
    expect(funn).toHaveLength(2)
  })

  it('krever vurdering for et nytt preparat med kontrollert form og styrke, men ikke for et utenfor det godkjente omfanget', () => {
    const innenfor = velg('sertralin', tablett(50))
    const utenfor = velg('sertralin', (b) => b.legemiddelform?.kode !== '53')
    const etter = kopi(AKSEPT)
    etter.utvalg.merkevarer.push({ ...merkevare(AKSEPT, innenfor), id: 'ID_SYNTETISK-INNENFOR' }, { ...merkevare(AKSEPT, utenfor), id: 'ID_SYNTETISK-UTENFOR' })
    const funn = festfunn(AKSEPT, etter, SERTRALIN, REGLER, K)
    expect(funn.find((f) => f.objekt === 'ID_SYNTETISK-INNENFOR')).toMatchObject({ art: 'ny', niva: 'krever_vurdering' })
    expect(funn.find((f) => f.objekt === 'ID_SYNTETISK-UTENFOR')).toMatchObject({ art: 'ny', niva: 'informativ', berorte: [] })
  })

  it('slår sammen samme preparat fra flere grunnlag, og sier hva som ble sammenlignet', () => {
    const id = velg('sertralin', tablett(25))
    const etter = kopi(AKSEPT)
    etter.utvalg.merkevarer = etter.utvalg.merkevarer.filter((m) => m.id !== id)
    const r = kontrollerFest(
      [
        { navn: 'A', foer: AKSEPT, etter, virkestoffer: SERTRALIN },
        { navn: 'B', foer: AKSEPT, etter, virkestoffer: SERTRALIN },
      ],
      REGLER,
      K,
    )
    expect(r.funn.map((f) => f.id)).toEqual([`fest:sertralin:${id}`])
    expect(r.grunnlag).toMatchObject({ kilde: 'fest', kjort: true, kontrollert: 1 })
    expect(r.grunnlag.beskrivelse).toContain(`A: FEST kontrollert ${AKSEPT.utvalg.kontrollert_kl}`)
  })
})

/* --- Psychiatrienet ---------------------------------------------------------- */

describe('kildeoppføringene i Psychiatrienet', () => {
  const ARKIV = arkivfil as Kildearkiv
  const G = kildegrunnlag(ARKIV, K)
  /** En ny innhenting med det samme som siste uttrekk, med endringer i sidene. */
  const innhenting = (endre: (sider: Innhenting['sider']) => void = () => {}): Innhenting => {
    const u = utsnitt(ARKIV)
    const sider = [...u.sider.values()].map(({ forst_sett: _f, sist_sett: _s, ...s }) => kopi(s))
    endre(sider)
    return { startet: '2026-12-01T06:00:00Z', ferdig: '2026-12-01T06:10:00Z', leser: u.uttrekk.leser, tabeller: u.tabeller.map(({ forst_sett: _f, sist_sett: _s, ...t }) => kopi(t)), sider }
  }
  const sideFor = (id: string) => G.anbefalinger.find((a) => a.id === id)!.kildeside!
  const endreSide = (id: string, endring: (s: Innhenting['sider'][number]) => void) => (sider: Innhenting['sider']) => endring(sider.find((s) => s.href === sideFor(id))!)
  const SEMZ = 'SwitchAntidepressants:Se>Mz'

  it('finner ingen endring i en innhenting med det samme innholdet, og endrer ikke arkivet', () => {
    const for_ = JSON.stringify(ARKIV)
    const r = psychiatrienetfunn(ARKIV, innhenting(), K, REGLER)
    expect(r.funn).toEqual([])
    expect(r.grunnlag).toMatchObject({ kilde: 'psychiatrienet', kjort: true, kontrollert: G.anbefalinger.length })
    expect(JSON.stringify(ARKIV)).toBe(for_)
  })

  it('krever vurdering når anbefalingen en godkjent regel sammenlignes med, er endret eller borte', () => {
    const endret = psychiatrienetfunn(ARKIV, innhenting(endreSide(SEMZ, (s) => (s.innhold = { ...s.innhold!, sha256_anbefaling: 'f'.repeat(64) }))), K, REGLER)
    const f = endret.funn.find((x) => x.objekt === SEMZ)!
    expect(f).toMatchObject({ id: `psychiatrienet:${SEMZ}`, art: 'endret', niva: 'krever_vurdering' })
    expect(f.berorte.map((b) => `${b.regel} v${b.versjon}`)).toEqual(['kryssnedtrapping-sertralin-mirtazapin v9'])
    expect(f.detaljer.some((d) => d.startsWith('sha256_anbefaling: ') && d.endsWith(' → ffffffffffff'))).toBe(true)

    const borte = psychiatrienetfunn(ARKIV, innhenting(endreSide(SEMZ, (s) => Object.assign(s, { status: 404, innhold: null }))), K, REGLER)
    expect(borte.funn.find((x) => x.objekt === SEMZ)).toMatchObject({ niva: 'krever_vurdering' })
  })

  it('gir en endring bare i siden rundt anbefalingen, eller i en oppføring ingen godkjent regel bruker, som informativ', () => {
    const revisjon = psychiatrienetfunn(ARKIV, innhenting(endreSide(SEMZ, (s) => (s.innhold = { ...s.innhold!, revisjon: 99999 }))), K, REGLER)
    expect(revisjon.funn.find((x) => x.objekt === SEMZ)).toMatchObject({ art: 'endret', niva: 'informativ' })
    const annen = 'SwitchAntidepressants:Ag>At'
    const ubrukt = psychiatrienetfunn(ARKIV, innhenting(endreSide(annen, (s) => (s.innhold = { ...s.innhold!, sha256_anbefaling: 'f'.repeat(64) }))), K, REGLER)
    expect(ubrukt.funn.find((x) => x.objekt === annen)).toMatchObject({ art: 'endret', niva: 'informativ', berorte: [] })
    expect(kreverVurdering(ubrukt)).toEqual([])
  })
})

/* --- Hele kjøringen og rapporten --------------------------------------------- */

describe('en kjøring og rapporten', () => {
  const funn = (over: Partial<Overvakingsfunn>): Overvakingsfunn => ({
    id: 'dokument:x',
    kilde: 'dokument',
    art: 'endret',
    niva: 'krever_vurdering',
    objekt: 'x',
    etikett: 'Syntetisk kilde',
    detaljer: ['Nå: dokumentet abc (text/html, hentet 2026-11-02T06:00:00Z).'],
    berorte: [{ regelsett: 's', regel: 'r', versjon: 1, fingeravtrykk: 'f'.repeat(64), hvorfor: 'henviser til kilden' }],
    ...over,
  })

  it('kjører delene hver for seg: en del som stopper, eller ikke er med, står som ikke kontrollert', async () => {
    const r = await kjorOvervaking({
      regler: REGLER,
      dokumenter: async () => {
        throw new Error('ikke brukt')
      },
      fest: {
        grunnlag: [{ navn: 'Syntetisk', uttrekk: { hentet: 'x', utvalg: {} } as unknown as Festuttrekk, virkestoffer: ['sertralin'] }],
        les: async () => {
          throw new Error('innlogging avvist')
        },
      },
      na: () => '2026-11-02T06:00:00Z',
    })
    expect(r.grunnlag.map((g) => [g.kilde, g.kjort])).toEqual([
      ['dokument', true],
      ['psychiatrienet', false],
      ['fest', false],
    ])
    expect(r.feil).toEqual(['FEST: innlogging avvist'])
    // En kilde som ikke kunne hentes, er et funn om den kilden, ikke en feil i kjøringen.
    expect(r.funn.every((f) => f.art === 'utilgjengelig' && f.niva === 'informativ')).toBe(true)
    const md = lagOvervakingsrapport(r)
    expect(md).toContain('## Ikke kontrollert\n\n- FEST: innlogging avvist')
    expect(md).toContain('Ingen endringer krever ny faglig vurdering.')
  })

  it('gir funnene som krever vurdering en prioritet: vanlig bare for en endret kontrollsum i et kildedokument', async () => {
    expect(prioritetFor({ niva: 'krever_vurdering', kilde: 'dokument', art: 'endret' })).toBe('vanlig')
    expect(prioritetFor({ niva: 'krever_vurdering', kilde: 'dokument', art: 'fjernet' })).toBe('hoy')
    expect(prioritetFor({ niva: 'krever_vurdering', kilde: 'fest', art: 'endret' })).toBe('hoy')
    expect(prioritetFor({ niva: 'krever_vurdering', kilde: 'psychiatrienet', art: 'endret' })).toBe('hoy')
    expect(prioritetFor({ niva: 'informativ', kilde: 'fest', art: 'fjernet' })).toBeUndefined()
    const r = await kjorOvervaking({ regler: REGLER, provesak: true })
    expect(r.funn.map((f) => f.prioritet)).toEqual(['hoy'])
    const md = lagOvervakingsrapport({ ...r, funn: [funn({ prioritet: 'vanlig' })] })
    expect(md).toContain('| Prioritet | Kilde |')
    expect(md).toContain('| vanlig | Kildedokument |')
  })

  it('lager en prøvesak med bare det syntetiske funnet, som krever vurdering med høy prioritet uten å berøre noen regel', async () => {
    const r = await kjorOvervaking({ regler: REGLER, provesak: true })
    expect(r.funn).toEqual([PROVEFUNN])
    expect(r.provesak).toBe(true)
    expect(r.grunnlag.every((g) => !g.kjort)).toBe(true)
    expect(kreverVurdering(r)).toEqual([PROVEFUNN])
    expect(PROVEFUNN).toMatchObject({ prioritet: 'hoy', berorte: [] })
    expect(lagOvervakingsrapport(r)).toContain('Syntetisk prøvesak')
  })

  it('ordner rapporten med det som krever vurdering først, med regelversjon og fingeravtrykk', () => {
    const r = {
      versjon: 1 as const,
      kjort_kl: '2026-11-02T06:00:00Z',
      grunnlag: [],
      feil: [],
      funn: [funn({ id: 'fest:a', kilde: 'fest' as const, niva: 'informativ' as const, berorte: [] }), funn({})],
    }
    const md = lagOvervakingsrapport(r)
    expect(md.indexOf('## Krever ny faglig vurdering')).toBeGreaterThan(0)
    expect(md.indexOf('## Krever ny faglig vurdering')).toBeLessThan(md.indexOf('## Informative endringer'))
    expect(md).toContain('r v1 (ffffffffffff): henviser til kilden')
    expect(md).toContain('**1 endring krever ny faglig vurdering.**')
    expect(md).toContain('Adminmeny → Kildeovervåking')
  })

  it('gir hvert funn et avtrykk som bare endres når innholdet endres, ikke når kilden bare er hentet på nytt', () => {
    const a = funn({})
    expect(funnavtrykk(funn({ detaljer: ['Nå: dokumentet abc (text/html, hentet 2026-11-09T06:00:00.123Z).'] }))).toBe(funnavtrykk(a))
    expect(funnavtrykk(a)).toMatch(/^[0-9a-f]{64}$/)
    for (const endret of [funn({ detaljer: ['Nå: dokumentet def'] }), funn({ berorte: [] }), funn({ art: 'fjernet' }), funn({ prioritet: 'hoy' }), funn({ id: 'dokument:y' })]) {
      expect(funnavtrykk(endret)).not.toBe(funnavtrykk(a))
    }
  })

  it('endrer ingen regel eller godkjenning, og skriver ikke grunnlaget eller arkivet', async () => {
    const for_ = JSON.stringify(REGELSETTENE)
    const avtrykkene = REGLER.map((g) => g.fingeravtrykk)
    await kjorOvervaking({ regler: REGLER, dokumenter: async () => ({ status: 200, endelig: '', type: 'text/html', bytes: new TextEncoder().encode(KILDETEKST), hentet: 'x' }) })
    expect(JSON.stringify(REGELSETTENE)).toBe(for_)
    expect(godkjenteRegler().map((g) => g.fingeravtrykk)).toEqual(avtrykkene)
    const kode = readdirSync(`${ROT}src/verktoy/overvaking`).map((f) => les(`src/verktoy/overvaking/${f}`)).join('\n')
    expect(kode).not.toMatch(/writeFile|appendFile|\.from\(|\.rpc\(|godkjenning\s*[:=]/)
    // Det eneste den skriver i databasen, er kjøringene, funnene og vurderingene av dem.
    expect([...new Set([...kode.matchAll(/kall\('([a-z_]+)'/g)].map((m) => m[1]))].sort()).toEqual([
      'beslutt_kildefunn',
      'kildefunn_teknisk_fra_agent',
      'les_kildeovervaking',
      'registrer_kildeovervaking',
      'vurder_kildefunn',
    ])
    // Skriptet skriver bare rapporten og funnene i mappen det får.
    expect([...les('scripts/verktoy-overvaking.ts').matchAll(/writeFileSync\(([^,(]+(?:\([^)]*\))?),/g)].map((m) => m[1])).toEqual(["join(ut, 'rapport.md')", "join(ut, 'funn.json')"])
  })
})

/* --- Skriptet ---------------------------------------------------------------- */

describe('skriptet', () => {
  /** Kjører det ekte skriptet uten nettverk og uten tilkobling til FEST; gir funn.json. */
  const kontroll = (...valg: string[]) => {
    const ut = mkdtempSync(join(tmpdir(), 'overvaking-skript-'))
    const env = { ...process.env }
    for (const n of ['VITE_SUPABASE_URL', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'OUSFAR_TESTBRUKER', 'OUSFAR_TESTPASSORD']) delete env[n]
    execFileSync(`${ROT}node_modules/.bin/vite-node`, ['--root', ROT, `${ROT}scripts/verktoy-overvaking.ts`, '--', 'kontroll', '--uten-dokumenter', ...valg, '--ut', ut], { env, stdio: 'pipe' })
    return JSON.parse(readFileSync(join(ut, 'funn.json'), 'utf8')) as { feil: string[]; grunnlag: { kilde: string; kjort: boolean }[] }
  }

  it('gir en feil, ikke en grønn kjøring, når FEST ikke kan kontrolleres fordi tilkoblingen mangler, og utelater FEST bare med --uten-fest', () => {
    const uten = kontroll()
    expect(uten.grunnlag.find((g) => g.kilde === 'fest')).toMatchObject({ kjort: false })
    expect(uten.feil).toEqual(['FEST: mangler tilkoblingen (verken testbrukeren eller nøkkelen er satt), så FEST er ikke kontrollert.'])
    // Det er feilen arbeidsflyten gjør kjøringen rød på, og appen viser «siste kildekontroll stoppet» for.
    expect(les('.github/workflows/verktoy-overvaking.yml')).toContain("feil=$(jq '.feil | length' overvaking-resultat/funn.json)")
    expect(kontroll('--uten-fest').feil).toEqual([])
  }, 60_000)
})

/* --- Arbeidsflyten ----------------------------------------------------------- */

describe('arbeidsflyten', () => {
  const flyt = les('.github/workflows/verktoy-overvaking.yml')

  it('kjører hver uke og for hånd, bare fra main, med testbrukeren i et eget miljø, uten å kunne skrive til repoet og uten GitHub-saker', () => {
    expect(flyt).toMatch(/schedule:\n(\s+#.*\n)*\s+- cron: '20 6 \* \* 1'\n\s+workflow_dispatch:/)
    expect(flyt.match(/- cron: /g)).toHaveLength(1)
    expect(flyt.match(/github\.ref == 'refs\/heads\/main'/g)).toHaveLength(2)
    expect(flyt).toContain('environment: kuratortest')
    expect(flyt).toContain('contents: read')
    expect(flyt).toContain('id-token: write')
    expect(flyt).not.toMatch(/contents: write|issues:|gh issue|git push|SUPABASE_SECRET_KEY/)
    for (const linje of flyt.split('\n').filter((l) => /^\s*- uses: /.test(l))) expect(linje, linje).toMatch(/@[0-9a-f]{40} # v/)
    // Uttrykk står bare som verdien til en nøkkel (som `env`), aldri inne i et skript.
    for (const linje of flyt.split('\n').filter((l) => l.includes('${{'))) expect(linje, linje).toMatch(/^\s*(?!run:)[A-Za-z_-]+:\s/)
    // Bare den planlagte kjøringen, en kontroll og en prøve kjører overvåkingen; den tekniske vurderingen er en egen jobb uten hemmeligheter.
    const teknisk = flyt.slice(flyt.indexOf('\n  teknisk-vurdering:'))
    expect(teknisk).not.toMatch(/secrets\.|environment:/)
  })

  /** Skriptet til steget med navnet, slik Actions kjører det. */
  const stegskript = (navn: string) => {
    const linjer = flyt.split('\n')
    const steg = linjer.findIndex((l) => l.trim() === `- name: ${navn}`)
    const run = linjer.findIndex((l, i) => i > steg && /^\s*run: \|$/.test(l))
    const innrykk = linjer[run]!.search(/\S/)
    const kropp: string[] = []
    for (const l of linjer.slice(run + 1)) {
      if (l.trim() && l.search(/\S/) <= innrykk) break
      kropp.push(l)
    }
    const fjern = Math.min(...kropp.filter((l) => l.trim()).map((l) => l.search(/\S/)))
    return kropp.map((l) => l.slice(fjern)).join('\n')
  }

  /**
   * Kjører et steg med en falsk `curl` som skriver ned kallene og svarer med
   * `kode`, og den ekte `scripts/meld-kildeovervaking.sh`. Gir det som ble
   * sendt, og om steget lyktes.
   */
  const kjorSteg = (navn: string, { kode = '200', env = {} }: { kode?: string; env?: Record<string, string> } = {}) => {
    const mappe = mkdtempSync(join(tmpdir(), 'overvaking-'))
    for (const m of ['bin', 'scripts', 'overvaking-resultat']) mkdirSync(join(mappe, m))
    copyFileSync(`${ROT}scripts/meld-kildeovervaking.sh`, join(mappe, 'scripts', 'meld-kildeovervaking.sh'))
    writeFileSync(join(mappe, 'overvaking-resultat', 'funn.json'), JSON.stringify({ versjon: 1, kjort_kl: '2026-11-02T06:20:00Z', grunnlag: [], funn: [], feil: [] }))
    writeFileSync(
      join(mappe, 'bin', 'curl'),
      `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${mappe}/kall"\nif [[ "$*" == *audience=ousfar* ]]; then echo '{"value":"syntetisk-token"}'; exit 0; fi\necho '{"ok":true}' > svar.json\nprintf '${kode}'\n`,
    )
    chmodSync(join(mappe, 'bin', 'curl'), 0o755)
    let lyktes = true
    try {
      execFileSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', stegskript(navn)], {
        cwd: mappe,
        env: {
          ...process.env,
          PATH: `${join(mappe, 'bin')}:${process.env.PATH}`,
          ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.invalid/token?x=1',
          ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'syntetisk',
          ADRESSE: 'https://example.invalid/api/kildeovervaking',
          KJORING: 'https://github.com/eier/repo/actions/runs/1',
          ...env,
        },
        stdio: 'pipe',
      })
    } catch {
      lyktes = false
    }
    const kall = readFileSync(join(mappe, 'kall'), 'utf8').trim().split('\n')
    return { lyktes, kall, melding: JSON.parse(readFileSync(join(mappe, 'melding.json'), 'utf8')) as Record<string, unknown> }
  }

  it('melder rapporten til appen med et OIDC-token, og stopper når appen ikke tar imot den', () => {
    const r = kjorSteg('Meld funnene til appen')
    expect(r.lyktes).toBe(true)
    expect(r.melding).toEqual({ oppgave: 'registrer', rapport: { versjon: 1, kjort_kl: '2026-11-02T06:20:00Z', grunnlag: [], funn: [], feil: [] }, lenke: 'https://github.com/eier/repo/actions/runs/1' })
    expect(r.kall[0]).toContain('audience=ousfar')
    expect(r.kall[1]).toMatch(/-H Authorization: Bearer syntetisk-token .*--data-binary @melding\.json https:\/\/example\.invalid\/api\/kildeovervaking/)
    expect(kjorSteg('Meld funnene til appen', { kode: '409' }).lyktes).toBe(false)
  })

  it('skriver en teknisk vurdering nøyaktig slik den ble gitt, uten at teksten kan kjøres som kode', () => {
    const vurdering = 'Bare en ny "skrifttype" i dokumentet; $(touch hacket) `id` endrer ingenting.'
    const r = kjorSteg('Skriv vurderingen i appen', { env: { FUNN: '12', VURDERING: vurdering, AV: 'Claude', AKTOR: 'syntetisk-bruker' } })
    expect(r.lyktes).toBe(true)
    expect(r.melding).toEqual({ oppgave: 'teknisk_vurdering', funn: '12', vurdering, av: 'Claude (startet av syntetisk-bruker)' })
  })
})
