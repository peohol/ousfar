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
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
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
import { avtrykk, hoyPrioritet, kreverVurdering, lagOvervakingsrapport } from '../verktoy/overvaking/rapport'
import { ENDRET_MERKE, MERKER, vaktTiltak, type Sak } from '../verktoy/overvaking/vakt'

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

  it('fører funnene som krevde vurdering videre for en del som ikke er kontrollert på nytt, uten å endre avtrykket', async () => {
    const forrige = {
      kjort_kl: '2026-11-02T06:20:00Z',
      funn: [
        funn({ id: 'psychiatrienet:SwitchAntidepressants:Se>Mz', kilde: 'psychiatrienet', objekt: 'SwitchAntidepressants:Se>Mz' }),
        funn({ id: 'fest:sertralin:ID_X', kilde: 'fest', objekt: 'ID_X' }),
        funn({ id: 'dokument:keks-2016', objekt: 'keks-2016' }),
        funn({ id: 'fest:sertralin:ID_Y', kilde: 'fest', objekt: 'ID_Y', niva: 'informativ' }),
      ],
    }
    const kjor = (f: typeof forrige) =>
      kjorOvervaking({
        regler: REGLER,
        forrige: f,
        // Dokumentene kontrolleres; ingen svarer, så det forrige dokumentfunnet føres ikke videre.
        dokumenter: async () => {
          throw new Error('ikke brukt')
        },
        // FEST stopper; Psychiatrienet er ikke med.
        fest: { grunnlag: [{ navn: 'Syntetisk', uttrekk: { hentet: 'x', utvalg: {} } as unknown as Festuttrekk, virkestoffer: ['sertralin'] }], les: async () => Promise.reject(new Error('innlogging avvist')) },
        na: () => '2026-11-09T06:20:00Z',
      })
    const r = await kjor(forrige)
    expect(kreverVurdering(r).map((f) => [f.id, f.viderefort_fra])).toEqual([
      ['psychiatrienet:SwitchAntidepressants:Se>Mz', '2026-11-02T06:20:00Z'],
      ['fest:sertralin:ID_X', '2026-11-02T06:20:00Z'],
    ])
    // Dokumentdelen ble kjørt, så keks-2016 står med det den fant nå (ikke kontrollert), ikke med det forrige funnet.
    expect(r.funn.find((f) => f.id === 'dokument:keks-2016')).toMatchObject({ art: 'utilgjengelig', niva: 'informativ' })
    expect(r.funn.find((f) => f.id === 'dokument:keks-2016')!.viderefort_fra).toBeUndefined()
    expect(r.funn.some((f) => f.id === 'fest:sertralin:ID_Y')).toBe(false)
    expect(r.grunnlag.find((g) => g.kilde === 'psychiatrienet')!.beskrivelse).toMatch(/1 funn fra en tidligere kjøring står videre/)
    expect(lagOvervakingsrapport(r)).toContain('Funnet i kjøringen 2026-11-02T06:20:00Z; delen er ikke kontrollert på nytt siden')
    // Neste kjøring beholder tidspunktet funnet først ble gjort, og avtrykket er det samme.
    const igjen = await kjor({ kjort_kl: r.kjort_kl, funn: r.funn })
    expect(kreverVurdering(igjen).map((f) => f.viderefort_fra)).toEqual(['2026-11-02T06:20:00Z', '2026-11-02T06:20:00Z'])
    expect(avtrykk(igjen)).toBe(avtrykk(r))
    // En del som ikke er med eller stopper, fører alltid funnene sine videre.
    const ingen = await kjorOvervaking({ regler: REGLER, forrige, psychiatrienet: { arkiv: arkivfil as Kildearkiv, innhent: () => Promise.reject(new Error('stopper')) } })
    expect(kreverVurdering(ingen).map((f) => f.id).sort()).toEqual(['dokument:keks-2016', 'fest:sertralin:ID_X', 'psychiatrienet:SwitchAntidepressants:Se>Mz'])
  })

  it('gir funnene som krever vurdering en prioritet: vanlig bare for en endret kontrollsum i et kildedokument', async () => {
    expect(prioritetFor({ niva: 'krever_vurdering', kilde: 'dokument', art: 'endret' })).toBe('vanlig')
    expect(prioritetFor({ niva: 'krever_vurdering', kilde: 'dokument', art: 'fjernet' })).toBe('hoy')
    expect(prioritetFor({ niva: 'krever_vurdering', kilde: 'fest', art: 'endret' })).toBe('hoy')
    expect(prioritetFor({ niva: 'krever_vurdering', kilde: 'psychiatrienet', art: 'endret' })).toBe('hoy')
    expect(prioritetFor({ niva: 'informativ', kilde: 'fest', art: 'fjernet' })).toBeUndefined()
    const r = await kjorOvervaking({ regler: REGLER, forrige: { kjort_kl: 'x', funn: [funn({ id: 'fest:a', kilde: 'fest' })] } })
    expect(r.funn.map((f) => f.prioritet)).toEqual(['hoy'])
    expect(hoyPrioritet(r)).toHaveLength(1)
    expect(lagOvervakingsrapport(r)).toContain('| Prioritet | Kilde |')
  })

  it('lager en prøvesak med bare det syntetiske funnet, som krever vurdering med høy prioritet uten å berøre noen regel', async () => {
    const r = await kjorOvervaking({ regler: REGLER, provesak: true })
    expect(r.funn).toEqual([PROVEFUNN])
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
    expect(md).toContain(`\`${avtrykk(r)}\``)
  })

  it('har et avtrykk som bare endres når det som krever vurdering endres', () => {
    const a = { funn: [funn({}), funn({ id: 'dokument:y', objekt: 'y' }), funn({ id: 'fest:z', kilde: 'fest', niva: 'informativ' })] }
    const samme = { funn: [funn({ id: 'dokument:y', objekt: 'y', detaljer: ['Nå: dokumentet abc (text/html, hentet 2026-11-09T06:00:00Z).'] }), funn({})] }
    expect(avtrykk(samme)).toBe(avtrykk(a))
    expect(avtrykk({ funn: [funn({}), funn({ id: 'dokument:y', objekt: 'y', detaljer: ['Nå: dokumentet def'] })] })).not.toBe(avtrykk(a))
    expect(avtrykk({ funn: [funn({}), funn({ id: 'dokument:y', objekt: 'y', berorte: [] })] })).not.toBe(avtrykk(a))
    expect(avtrykk({ funn: [] })).toBe(avtrykk({ funn: [funn({ niva: 'informativ' })] }))
  })

  it('endrer ingen regel eller godkjenning, og skriver ikke grunnlaget eller arkivet', async () => {
    const for_ = JSON.stringify(REGELSETTENE)
    const avtrykkene = REGLER.map((g) => g.fingeravtrykk)
    await kjorOvervaking({ regler: REGLER, dokumenter: async () => ({ status: 200, endelig: '', type: 'text/html', bytes: new TextEncoder().encode(KILDETEKST), hentet: 'x' }) })
    expect(JSON.stringify(REGELSETTENE)).toBe(for_)
    expect(godkjenteRegler().map((g) => g.fingeravtrykk)).toEqual(avtrykkene)
    const kode = readdirSync(`${ROT}src/verktoy/overvaking`).map((f) => les(`src/verktoy/overvaking/${f}`)).join('\n')
    expect(kode).not.toMatch(/writeFile|appendFile|\.from\(|\.rpc\(|godkjenning\s*[:=]/)
    // Skriptet skriver bare rapporten og funnene i mappen det får.
    expect([...les('scripts/verktoy-overvaking.ts').matchAll(/writeFileSync\(([^,(]+(?:\([^)]*\))?),/g)].map((m) => m[1])).toEqual(["join(ut, 'rapport.md')", "join(ut, 'funn.json')"])
  })
})

/* --- Arbeidsflyten ----------------------------------------------------------- */

describe('arbeidsflyten', () => {
  const flyt = les('.github/workflows/verktoy-overvaking.yml')

  it('kjører hver uke og for hånd, bare fra main, med testbrukeren i et eget miljø og uten å kunne skrive til repoet', () => {
    expect(flyt).toMatch(/schedule:\n(\s+#.*\n)*\s+- cron: /)
    expect(flyt).toContain('workflow_dispatch:')
    expect(flyt).toContain("github.ref == 'refs/heads/main'")
    expect(flyt).toContain('environment: kuratortest')
    expect(flyt).toContain('contents: read')
    expect(flyt).toContain('issues: write')
    expect(flyt).not.toMatch(/contents: write|git push|SUPABASE_SECRET_KEY/)
    for (const linje of flyt.split('\n').filter((l) => /^\s*- uses: /.test(l))) expect(linje, linje).toMatch(/@[0-9a-f]{40} # v/)
    // Uttrykk står bare som verdien til en nøkkel (som `env`), aldri inne i et skript.
    for (const linje of flyt.split('\n').filter((l) => l.includes('${{'))) expect(linje, linje).toMatch(/^\s*(?!run:)[A-Za-z_-]+:\s/)
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

  interface Steg {
    resultat?: { krever_vurdering: number; avtrykk: string; hoy_prioritet?: number; kjort_kl?: string; funn?: Overvakingsfunn[] }
    apen?: { nr: number; kropp: string } | null
    /** Det `gh issue list` svarer, når det ikke er den åpne saken. */
    liste?: string
    env?: Record<string, string>
  }

  /** Kjører et steg med en falsk `gh` som skriver ned kallene og svarer med den åpne saken, og en `npm` som kjører det ekte skriptet. */
  const kjorSteg = (navn: string, { resultat = { krever_vurdering: 0, avtrykk: '' }, apen = null, liste, env = {} }: Steg = {}) => {
    const mappe = mkdtempSync(join(tmpdir(), 'overvaking-'))
    mkdirSync(join(mappe, 'bin'))
    mkdirSync(join(mappe, 'overvaking-resultat'))
    writeFileSync(join(mappe, 'overvaking-resultat', 'funn.json'), JSON.stringify({ kjort_kl: '2026-11-02T06:20:00Z', funn: [], feil: [], hoy_prioritet: 0, ...resultat }))
    writeFileSync(join(mappe, 'overvaking-resultat', 'rapport.md'), '# Syntetisk rapport\n')
    writeFileSync(join(mappe, 'kropp'), apen?.kropp ?? '')
    writeFileSync(join(mappe, 'liste'), liste ?? `${apen?.nr ?? ''}\n`)
    writeFileSync(
      join(mappe, 'bin', 'gh'),
      `#!/usr/bin/env bash\nalle="$*"\nprintf '%s\\n' "\${alle//$'\\n'/ }" >> "${mappe}/kall"\ncase "$1 $2" in\n  "issue list") cat "${mappe}/liste" ;;\n  "issue view") cat "${mappe}/kropp" ;;\nesac\n`,
    )
    // npm run -s verktoy:overvaking -- <argumenter>
    writeFileSync(join(mappe, 'bin', 'npm'), `#!/usr/bin/env bash\nshift 4\nexec "${ROT}node_modules/.bin/vite-node" --root "${ROT}" "${ROT}scripts/verktoy-overvaking.ts" -- "$@"\n`)
    chmodSync(join(mappe, 'bin', 'gh'), 0o755)
    chmodSync(join(mappe, 'bin', 'npm'), 0o755)
    execFileSync('bash', ['--noprofile', '--norc', '-eo', 'pipefail', '-c', stegskript(navn)], {
      cwd: mappe,
      env: { ...process.env, PATH: `${join(mappe, 'bin')}:${process.env.PATH}`, REPO: 'eier/repo', KJORING: 'https://example.invalid/kjoring/1', ANSVARLIG: 'syntetisk-ansvarlig', OPPGAVE: '', ...env },
      stdio: 'pipe',
    })
    const lesOm = (fil: string) => {
      try {
        return readFileSync(join(mappe, fil), 'utf8')
      } catch {
        return null
      }
    }
    const raa = (lesOm('kall') ?? '').trim().split('\n').filter(Boolean)
    return { raa, kall: raa.map((k) => k.split(' ').slice(0, 2).join(' ')), sak: lesOm('sak.md'), forrige: lesOm('forrige.json') }
  }
  const MELD = 'Åpne eller oppdater saken'
  const HENT = 'Hent funnene fra den åpne saken'
  const meld = (krever: number, avtrykk: string, apen: Steg['apen'], hoy = 0) => kjorSteg(MELD, { resultat: { krever_vurdering: krever, avtrykk, hoy_prioritet: hoy }, apen })

  it('åpner én sak tildelt den ansvarlige når noe krever vurdering, oppdaterer den bare når funnene endres, og lukker den aldri', () => {
    const ny = meld(2, 'a'.repeat(64), null)
    expect(ny.kall).toEqual(['issue list', 'label create', 'label create', 'issue create'])
    expect(ny.raa.at(-1)).toContain('--assignee syntetisk-ansvarlig')
    expect(ny.raa.at(-1)).not.toContain('kildeovervaking-hoy')
    expect(ny.raa[0]).toContain('--search -label:kildeovervaking-prove')
    expect(ny.sak).toContain(`<!-- kildeovervaking-avtrykk: ${'a'.repeat(64)} -->`)
    expect(ny.sak).toContain('# Syntetisk rapport')
    expect(meld(2, 'a'.repeat(64), null, 1).raa.at(-1)).toContain('--label kildeovervaking-hoy')

    expect(meld(2, 'a'.repeat(64), { nr: 7, kropp: ny.sak! }).kall).toEqual(['issue list', 'issue view'])
    const endret = meld(1, 'b'.repeat(64), { nr: 7, kropp: ny.sak! }, 1)
    expect(endret.kall).toEqual(['issue list', 'issue view', 'issue edit', 'issue edit', 'issue edit', 'issue comment'])
    expect(endret.raa[2]).toContain('--add-assignee syntetisk-ansvarlig')
    expect(endret.raa[3]).toContain('--add-label kildeovervaking-hoy')
    // Kommentaren om endrede funn har merket vakten regner fristene fra.
    expect(endret.raa[5]).toContain(ENDRET_MERKE)
    expect(meld(0, 'c'.repeat(64), { nr: 7, kropp: ny.sak! }).kall).toEqual(['issue list', 'issue view', 'issue edit', 'issue edit', 'issue comment'])
    expect(meld(0, 'c'.repeat(64), null).kall).toEqual(['issue list'])
    expect(flyt).not.toMatch(/issue close/)
  })

  it('holder en prøvesak for seg, med eget merke og tittel', () => {
    const prove = kjorSteg(MELD, { resultat: { krever_vurdering: 1, avtrykk: 'd'.repeat(64), hoy_prioritet: 1 }, env: { OPPGAVE: 'provesak' } })
    expect(prove.raa[0]).toContain('--label kildeovervaking-prove')
    expect(prove.raa.at(-1)).toMatch(/--label kildeovervaking --label kildeovervaking-hoy --label kildeovervaking-prove --assignee syntetisk-ansvarlig --title Prøvesak: Kildeovervåking/)
    expect(kjorSteg(HENT, { env: { OPPGAVE: 'provesak' } }).raa[0]).toContain('--label kildeovervaking-prove')
  })

  it('tar vare på funnene som krever vurdering i saken, så neste kjøring kan føre dem videre', () => {
    const krever: Overvakingsfunn = { id: 'psychiatrienet:x', kilde: 'psychiatrienet', art: 'endret', niva: 'krever_vurdering', objekt: 'x', etikett: 'Syntetisk', detaljer: ['sha256_anbefaling: aaa → bbb'], berorte: [] }
    const info: Overvakingsfunn = { ...krever, id: 'fest:y', kilde: 'fest', niva: 'informativ' }
    const ny = kjorSteg(MELD, { resultat: { krever_vurdering: 1, avtrykk: 'a'.repeat(64), funn: [krever, info] } })
    expect(ny.sak).toMatch(/^<!-- kildeovervaking-funn: [A-Za-z0-9+/=]+ -->$/m)
    const hentet = kjorSteg(HENT, { apen: { nr: 7, kropp: ny.sak! } })
    expect(JSON.parse(hentet.forrige!)).toEqual({ kjort_kl: '2026-11-02T06:20:00Z', funn: [krever] })
    // Uten sak, eller en sak uten funnene, kjøres overvåkingen uten forrige.
    expect(kjorSteg(HENT).forrige).toBeNull()
    expect(kjorSteg(HENT, { apen: { nr: 7, kropp: 'Skrevet for hånd' } }).forrige).toBeNull()
  })

  it('har en daglig vakt uten hemmeligheter og uten Claude, som merker og kommenterer etter tiltakene fra skriptet', () => {
    const vakt = flyt.slice(flyt.indexOf('\n  vakt:'))
    expect(vakt).not.toMatch(/secrets\.|environment:/)
    expect(flyt).toMatch(/- cron: '40 7 \* \* \*'/)
    expect(flyt.match(/^\s+ANSVARLIG: /gm)).toHaveLength(1)
    const gammel = (timer: number) => new Date(Date.now() - timer * 3_600_000).toISOString()
    const saker: Sak[] = [
      { number: 3, createdAt: gammel(30), labels: [{ name: MERKER.sak }], comments: [] },
      { number: 4, createdAt: gammel(2), labels: [{ name: MERKER.sak }], comments: [] },
    ]
    const r = kjorSteg('Merk ubehandlede saker', { liste: JSON.stringify(saker) })
    expect(r.kall).toEqual(['issue list', 'label create', 'issue edit', 'issue comment'])
    expect(r.raa[2]).toBe('issue edit 3 --repo eier/repo --add-label kildeovervaking-ubehandlet')
    expect(r.raa[3]).toMatch(/^issue comment 3 --repo eier\/repo --body <!-- kildeovervaking-vakt: teknisk -->/)
    expect(readFileSync(new URL('../../.github/workflows/verktoy-overvaking.yml', import.meta.url), 'utf8')).not.toMatch(/issue close/)
  })
})

/* --- Vakten ------------------------------------------------------------------ */

describe('vakten over sakene', () => {
  const NA = '2026-11-10T07:40:00Z'
  const for_ = (timer: number) => new Date(Date.parse(NA) - timer * 3_600_000).toISOString()
  const kommentar = (body: string, timer: number, authorAssociation = 'OWNER', login = 'syntetisk') => ({ body, createdAt: for_(timer), authorAssociation, author: { login } })
  const sak = (timer: number, merker: string[] = [], comments: Sak['comments'] = []): Sak => ({ number: 1, createdAt: for_(timer), labels: [MERKER.sak, ...merker].map((name) => ({ name })), comments })
  const tiltak = (s: Sak) => vaktTiltak([s], NA, 'syntetisk-ansvarlig')

  it('gjør ingenting med en ny sak, eller en sak uten merket', () => {
    expect(tiltak(sak(23))).toEqual([])
    expect(vaktTiltak([{ ...sak(100), labels: [] }], NA, 'x')).toEqual([])
  })

  it('merker en sak uten teknisk vurdering etter ett døgn, og nevner den ansvarlige én gang', () => {
    const t = tiltak(sak(24))
    expect(t).toMatchObject([{ sak: 1, leggTil: [MERKER.ubehandlet], fjern: [] }])
    expect(t[0]!.kommentarer).toHaveLength(1)
    expect(t[0]!.kommentarer[0]).toMatch(/^<!-- kildeovervaking-vakt: teknisk -->\n@syntetisk-ansvarlig .*«Teknisk vurdering:»/)
    // Merket og kommentaren står alt: ingenting nytt.
    expect(tiltak(sak(48, [MERKER.ubehandlet], [kommentar(t[0]!.kommentarer[0]!, 20, 'NONE', 'github-actions[bot]')]))).toEqual([])
  })

  it('godtar bare en teknisk vurdering fra noen med tilgang til repoet', () => {
    expect(tiltak(sak(30, [], [kommentar('Teknisk vurdering: syntetisk', 10)]))).toEqual([])
    expect(tiltak(sak(30, [], [kommentar('Teknisk vurdering: syntetisk', 10, 'NONE')]))).toMatchObject([{ leggTil: [MERKER.ubehandlet] }])
  })

  it('krever en faglig beslutning etter tre døgn for en sak med høy prioritet', () => {
    const teknisk = kommentar('Teknisk vurdering: syntetisk', 60)
    expect(tiltak(sak(71, [MERKER.hoy], [teknisk]))).toEqual([])
    const t = tiltak(sak(72, [MERKER.hoy], [teknisk]))
    expect(t).toMatchObject([{ leggTil: [MERKER.ubehandlet] }])
    expect(t[0]!.kommentarer[0]).toMatch(/kildeovervaking-vakt: faglig[\s\S]*«Faglig beslutning:»[\s\S]*nødstoppen/)
    // En vanlig sak trenger ingen faglig beslutning innen fristen.
    expect(tiltak(sak(100, [], [teknisk]))).toEqual([])
    // Med begge behandlingene tas merket bort.
    expect(tiltak(sak(100, [MERKER.hoy, MERKER.ubehandlet], [teknisk, kommentar('Faglig beslutning: syntetisk', 5)]))).toEqual([{ sak: 1, leggTil: [], fjern: [MERKER.ubehandlet], kommentarer: [] }])
  })

  it('regner fristene fra siste gang funnene ble endret, så en vurdering av de gamle funnene ikke gjelder de nye', () => {
    const vurdert = kommentar('Teknisk vurdering: syntetisk', 50)
    const endret = kommentar(`${ENDRET_MERKE}\nFunnene er endret.`, 30, 'NONE', 'github-actions[bot]')
    expect(tiltak(sak(60, [], [vurdert, endret]))).toMatchObject([{ leggTil: [MERKER.ubehandlet] }])
    expect(tiltak(sak(60, [MERKER.ubehandlet], [vurdert, { ...endret, createdAt: for_(10) }]))).toEqual([{ sak: 1, leggTil: [], fjern: [MERKER.ubehandlet], kommentarer: [] }])
    // Et merke fra noen uten tilgang flytter ikke fristen.
    expect(tiltak(sak(60, [], [vurdert, { ...endret, createdAt: for_(10), author: { login: 'fremmed' } }]))).toEqual([])
  })
})
