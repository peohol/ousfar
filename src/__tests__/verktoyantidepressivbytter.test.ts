/**
 * K2: komplette bytter mellom antidepressiva (`src/verktoy/regler/antidepressivbytter.ts`,
 * `docs/verktøy-k2-antidepressivbytter.md`). Reglene er til faglig kontroll og
 * ikke godkjent; planene regnes ende til ende med det lagrede FEST-uttrekket
 * på en kopi med simulert avklaring og godkjenning (`k2kontroll.ts`).
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FEST_K2, K2_KONTROLLFIL, K2_REGELRAPPORT, K2KASUS, k2avvik, kjorK2, lagK2Kontrollgrunnlag, medSluttrinnVedLavesteTablett, sluttrinnApent, somAvklartOgGodkjent, SPORSMAL, type K2kasus, type Sluttrinn } from '../verktoy/k2kontroll'
import { VERKTOY } from '../verktoy/register'
import { BYTTESETT, K2_AVKLARINGER, K2VEDTAK, KORT_BEHANDLINGSTID_UKER, STARTFORLOP_SERTRALIN_MIRTAZAPIN } from '../verktoy/regler/antidepressivbytter'
import { KONTROLLOREN } from '../verktoy/regler/bygg'
import type { Festuttrekk } from '../verktoy/regler/aksepttest'
import { beregn } from '../verktoy/regler/beregning'
import { erstatningsfeil, fingeravtrykk, godkjenningsfeil } from '../verktoy/regler/godkjenning'
import { kontrollerRegelsett, lesKontrollgrunnlag } from '../verktoy/regler/kontroll'
import { LANG_BEHANDLINGSTID } from '../verktoy/regler/nedtrapping'
import { alleGrunnlag, apneValg, type Beregningsinndata, type Regel, type Regelsett } from '../verktoy/regler/modell'
import { PILOTSETT } from '../verktoy/regler/pilotsett'
import { REGELRAPPORTER } from '../verktoy/regler/rapport'
import { kliniskSperre } from '../verktoy/motor/plan'
import { REGELSETTENE, reglerFor, samlet, tilgjengelighet } from '../verktoy/tilgjengelighet'
import { testFest, TESTKLOKKE } from './hjelp/verktoyplan'

/** Fingeravtrykkene til versjon 1 av sertralinreglene, slik kontrolløren gjennomgikk dem i ba2d571 (04.11.2026). */
const VERSJON_1: Record<string, string> = {
  'bytte-escitalopram-sertralin': 'd84eacafe511a9a220561b6e01974eae926ef55a633bd2ef14685f842a319c69',
  'bytte-citalopram-sertralin': 'f74a0606f5c0241af4c03972d6fee8788380c4cace1e87ee3a9ff898969841d4',
}

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const UTTREKK = JSON.parse(les(FEST_K2)) as Festuttrekk
const kasus = (id: string) => {
  const k = K2KASUS.find((x) => x.id === id)
  if (!k) throw new Error(id)
  return k
}
const planlinjer = (k: K2kasus) => {
  const u = kjorK2(k, UTTREKK)
  return u.utfall === 'plan' ? u.linjer : [u.utfall, JSON.stringify(u)]
}
const erVurdering = (l: string) => /^Dag \d+ \([^)]*\): Vurdering /.test(l)
/** Doselinjene i planen, uten vurderingspunktene. */
const linjer = (k: K2kasus) => planlinjer(k).filter((l) => !erVurdering(l))
/** Vurderingspunktene i planen: dagen, legemidlet og om det er før endringen. */
const vurderinger = (k: K2kasus) =>
  planlinjer(k)
    .filter(erVurdering)
    .map((l) => l.replace(/^Dag (\d+) \([^)]*\): Vurdering \((\w+)\): (Før endringen: )?.*$/, (_, d: string, navn: string, for_?: string) => `dag ${d} ${navn}${for_ ? ' før' : ''}`))

/** Inndata med alle bekreftelser og nei på alle unntak, på en kopi med simulert avklaring og godkjenning, og sluttrinnet som oppgitt (K2-2). */
function beregnSomGodkjent(r: Regel, x: Partial<Beregningsinndata>, sluttrinn: Sluttrinn = 'laveste_tablett') {
  const kopi = structuredClone(r)
  somAvklartOgGodkjent(kopi, sluttrinn)
  return beregn(kopi, { startdose_mg: 0, bekreftet: r.bekreftelser.map((b) => b.id), pasientforhold: Object.fromEntries(r.unntak.map((u) => [u.id, false])), ...x })
}

describe('K2: regelsettet', () => {
  it('består regelkontrollen', () => {
    expect(kontrollerRegelsett(BYTTESETT, lesKontrollgrunnlag(), REGELSETTENE.flatMap((x) => x.regler))).toEqual([])
  })

  it('har fem regler, alle til faglig kontroll uten gyldig godkjenning; bare mirtazapinreglene har åpne valg', () => {
    expect(BYTTESETT.regler.map((r) => r.id)).toEqual([
      'bytte-sertralin-mirtazapin',
      'bytte-escitalopram-mirtazapin',
      'bytte-citalopram-mirtazapin',
      'bytte-escitalopram-sertralin',
      'bytte-citalopram-sertralin',
    ])
    // Ingen godkjenning er registrert ennå: kontrolløren har avklart valgene i sertralinreglene, men ikke godkjent fingeravtrykkene.
    expect(K2VEDTAK).toBeNull()
    for (const r of BYTTESETT.regler) {
      expect(r.godkjenning.status).toBe('til_faglig_kontroll')
      expect(godkjenningsfeil(r).length).toBeGreaterThan(0)
      expect(beregn(r, r.eksempler[0]!.inndata).klinisk_godkjent).toBe(false)
      if (sluttrinnApent(r)) {
        expect([r.versjon, apneValg(r).length > 0], r.id).toEqual([1, true])
      } else {
        expect([r.versjon, apneValg(r)], r.id).toEqual([2, []])
        expect(r.godkjenning.historikk.at(-1)).toMatchObject({ status: 'til_faglig_kontroll', regelversjon: 2, merknad: expect.stringMatching(/^Ingen åpne valg; til kontrollørens samlede kontroll av nøyaktig denne versjonen og dette fingeravtrykket\. Ikke klinisk godkjent\./) })
      }
    }
  })

  it('har i versjon 2 av sertralinreglene kontrollørens avklaring av hvert OUSFAR-valg fra gjennomgangen av ba2d571 (kommentar 6633525970), og ingen andre endringer', () => {
    for (const r of BYTTESETT.regler.filter((x) => !sluttrinnApent(x))) {
      const avklarte = alleGrunnlag(r).filter(([, g]) => g.type === 'ousfar_vurdering')
      expect(avklarte.map(([sti]) => sti).sort(), r.id).toEqual(Object.keys(K2_AVKLARINGER).sort())
      for (const [sti, g] of avklarte) {
        expect(g.type === 'ousfar_vurdering' && g.avklaring, `${r.id} ${sti}`).toEqual({
          dato: '2026-11-04',
          av: KONTROLLOREN.av,
          rolle: 'uavhengig_kontrollor',
          regelversjon: 2,
          merknad: `Kontrollørens gjennomgang av ba2d571 04.11.2026 (PR #318, kommentar 6633525970): ${K2_AVKLARINGER[sti]}`,
        })
      }
      // Versjon 1 er det kontrolløren gjennomgikk: uten avklaringene er innholdet det samme.
      const utenAvklaring = structuredClone(r)
      for (const [, g] of alleGrunnlag(utenAvklaring)) if (g.type === 'ousfar_vurdering') g.avklaring = null
      expect(fingeravtrykk({ ...utenAvklaring, versjon: 1 }), r.id).toBe(VERSJON_1[r.id])
    }
    expect(K2_AVKLARINGER.lang_behandlingstid).toMatch(/OUSFARs egen beslutning, ikke studiedata og ingen generell medisinsk terskel; «Trappe ned» endres ikke\./)
  })

  it('bygger ikke på Psychiatrienet: bare kildeoppføringens id som referanse', () => {
    for (const r of BYTTESETT.regler) {
      expect(JSON.stringify({ ...r, referanser: [] })).not.toContain('psychiatrienet')
      expect(r.referanser.every((x) => x.kilde === 'psychiatrienet' && 'kildeoppforing' in x && !('faktum' in x))).toBe(true)
    }
  })

  it('lar det godkjente startforløpet fra sertralin til mirtazapin (versjon 10) stå uendret og fortsatt brukes', () => {
    const v10 = PILOTSETT.regler.find((r) => r.id === 'kryssnedtrapping-sertralin-mirtazapin')!
    expect(v10.versjon).toBe(10)
    expect(fingeravtrykk(v10)).toBe('12801aa22a0ca2a576b9ba737d5d5cb52db3a73dc1b437bde7f20a896214c81a')
    const verktoy = VERKTOY.find((v) => v.id === 'bytte-antidepressiv')!
    const t = tilgjengelighet(verktoy, { fra: { nokkel: 'sertralin', formulering: 'standard' }, til: { nokkel: 'mirtazapin', formulering: 'standard' } })
    expect(t.status).toBe('tilgjengelig')
    expect(t.regler.map((r) => `${r.id} v${r.versjon}`)).toEqual(['kryssnedtrapping-sertralin-mirtazapin v10'])
  })

  describe('ved aktivering erstatter den komplette regelen startforløpet (versjon 10) atomisk', () => {
    const verktoy = VERKTOY.find((v) => v.id === 'bytte-antidepressiv')!
    const valg = { fra: { nokkel: 'sertralin', formulering: 'standard' }, til: { nokkel: 'mirtazapin', formulering: 'standard' } } as const
    const finn = (settene: Regelsett[], id: string) => settene.flatMap((x) => x.regler).find((r) => r.id === id)!
    /** Appens regelsett med den komplette regelen simulert godkjent; `endre` endrer den før eller etter godkjenningen. */
    const aktivert = (endre?: { for?: (r: Regel) => void; etter?: (r: Regel) => void }) => {
      const settene = structuredClone([...REGELSETTENE])
      const komplett = finn(settene, 'bytte-sertralin-mirtazapin')
      endre?.for?.(komplett)
      somAvklartOgGodkjent(komplett, 'laveste_tablett')
      endre?.etter?.(komplett)
      return { settene, sett: samlet(settene), v10: finn(settene, STARTFORLOP_SERTRALIN_MIRTAZAPIN) }
    }
    const tilbudt = (sett: Regelsett) => tilgjengelighet(verktoy, valg, sett).regler.map((r) => r.id).sort()

    it('regelen oppgir startforløpet som den erstatter, og feltet er med i fingeravtrykket kontrolløren godkjenner', () => {
      const komplett = BYTTESETT.regler.find((r) => r.id === 'bytte-sertralin-mirtazapin')!
      expect(komplett.erstatter).toEqual([STARTFORLOP_SERTRALIN_MIRTAZAPIN])
      expect(BYTTESETT.regler.filter((r) => r.erstatter).map((r) => r.id)).toEqual(['bytte-sertralin-mirtazapin'])
      expect(fingeravtrykk({ ...komplett, erstatter: undefined })).not.toBe(fingeravtrykk(komplett))
      expect(erstatningsfeil(REGELSETTENE.flatMap((x) => x.regler))).toEqual([])
    })

    it('før godkjenningen gjelder versjon 10 som før', () => {
      expect(tilbudt(samlet([...REGELSETTENE]))).toEqual([STARTFORLOP_SERTRALIN_MIRTAZAPIN])
    })

    it('godkjent: bare den komplette planen tilbys, uten at versjon 10 endres, og en plan etter versjon 10 stopper', () => {
      const { sett, v10 } = aktivert()
      expect(v10.godkjenning.status).toBe('klinisk_godkjent')
      expect(tilbudt(sett)).toEqual(['bytte-sertralin-mirtazapin'])
      expect(reglerFor(verktoy, valg, sett).map((r) => r.id)).not.toContain(STARTFORLOP_SERTRALIN_MIRTAZAPIN)
      // Den kliniske sperren som stopper hver plan etter versjon 10: bare erstatningen, siden godkjenningen av versjon 10 ellers er gyldig og FEST er fersk.
      expect(kliniskSperre(v10, testFest(), TESTKLOKKE(), sett.regler)).toEqual(['Regelen er trukket: den er erstattet av «Bytte fra sertralin til mirtazapin, kryssnedtrapping til seponering» (regelversjon 1), som er klinisk godkjent.'])
      expect(kliniskSperre(v10, testFest(), TESTKLOKKE(), samlet([...REGELSETTENE]).regler)).toEqual([])
    })

    it('uten erstatningen ville forskriveren fått to godkjente planer å velge mellom', () => {
      expect(tilbudt(aktivert({ for: (r) => delete r.erstatter }).sett)).toEqual(['bytte-sertralin-mirtazapin', STARTFORLOP_SERTRALIN_MIRTAZAPIN])
    })

    it('en erstatning lagt til etter godkjenningen gjør godkjenningen ugyldig, og versjon 10 gjelder fortsatt', () => {
      const { sett } = aktivert({ for: (r) => delete r.erstatter, etter: (r) => { r.erstatter = [STARTFORLOP_SERTRALIN_MIRTAZAPIN] } })
      expect(tilbudt(sett)).toEqual([STARTFORLOP_SERTRALIN_MIRTAZAPIN])
    })
  })

  it('sier at faglig kontroll gjenstår for de nye kombinasjonene', () => {
    const verktoy = VERKTOY.find((v) => v.id === 'bytte-antidepressiv')!
    for (const [fra, til] of [
      ['escitalopram', 'mirtazapin'],
      ['citalopram', 'mirtazapin'],
      ['escitalopram', 'sertralin'],
      ['citalopram', 'sertralin'],
    ] as const) {
      const t = tilgjengelighet(verktoy, { fra: { nokkel: fra, formulering: 'standard' }, til: { nokkel: til, formulering: 'standard' } })
      expect(t.status, `${fra} → ${til}`).toBe('til_kontroll')
    }
  })
})

describe('K2: sluttrinnet ved bytte (K2-2)', () => {
  it('har et konkret sluttrinn bare der sertralin startes dagen etter (direkte overgang), avklart av kontrolløren', () => {
    expect(BYTTESETT.regler.filter((r) => !sluttrinnApent(r)).map((r) => r.id)).toEqual(['bytte-escitalopram-sertralin', 'bytte-citalopram-sertralin'])
    for (const r of BYTTESETT.regler.filter((x) => !sluttrinnApent(x))) {
      const fase = r.plan.forlop[0]!.faser[0]!
      if (fase.type !== 'nedtrapping' || typeof fase.avslutning !== 'object' || fase.strategi.type !== 'prosent_av_aktuell') throw new Error(r.id)
      // Seponeringen gjelder bare fra laveste tablettdose, og bare fordi sertralin startes dagen etter siste dose.
      expect(fase.avslutning.fra_hoyst_mg.verdi, r.id).toBe(fase.strategi.sluttdose_mg!.verdi)
      expect(fase.avslutning.fra_hoyst_mg.grunnlag.type === 'ousfar_vurdering' && fase.avslutning.fra_hoyst_mg.grunnlag.avklaring, r.id).toMatchObject({ av: KONTROLLOREN.av, merknad: expect.stringContaining('K2-2(a): ja for dette snevre omfanget') })
      expect(fase.avslutning.grunnlag.type === 'ousfar_vurdering' && fase.avslutning.grunnlag.begrunnelse, r.id).toMatch(/bare i denne planen, der sertralin startes dagen etter; uten et nytt legemiddel med samme virkningsmekanisme er \d+ mg ingen seponeringsgrense/)
      const start = r.plan.forlop[1]!.start
      expect(start.type === 'etter_utvasking' && start.forlop === 'fra' && start.utvasking.verdi, r.id).toBe(0)
      expect(apneValg(r)).toEqual([])
      expect(r.plan.forlop[0]!.vurderinger!.map((v) => v.nar.type)).toEqual(['for_hvert_trinn', 'etter_seponering'])
    }
  })

  it('lover ikke at sertralin hindrer seponeringssymptomer: virkningen er forventet, ikke garantert, med tett oppfølging og individuell justering (ChatGPT 04.11)', () => {
    for (const r of BYTTESETT.regler.filter((x) => !sluttrinnApent(x))) {
      // Ingen formulering om at sertralin «tar over» eller at siste trinn ikke gir bortfall av virkningen.
      expect(JSON.stringify(r), r.id).not.toMatch(/tar over|bortfall av SSRI-virkningen|ikke gir et bortfall|ikke nødvendige for sluttrinnet/)
      const fase = r.plan.forlop[0]!.faser[0]!
      if (fase.type !== 'nedtrapping' || typeof fase.avslutning !== 'object') throw new Error(r.id)
      const begrunnelse = fase.avslutning.fra_hoyst_mg.grunnlag.type === 'ousfar_vurdering' ? fase.avslutning.fra_hoyst_mg.grunnlag.begrunnelse : ''
      for (const del of ['ventes derfor å fortsette', 'ikke garantert at den hindrer seponeringssymptomer eller forverring', 'planen justeres individuelt ved plager']) expect(begrunnelse, r.id).toContain(del)
      expect((fase.avslutning.fra_hoyst_mg.grunnlag.henvisninger ?? []).map((x) => x.kilde)).toContain('rcpsych-stopping')
      const overgang = r.plan.forlop[0]!.vurderinger!.find((v) => v.id === 'etter_overgang')!
      expect(overgang.ved_funn).toMatch(/planlegges det videre forløpet individuelt, og en eventuell økning av sertralin venter/)
      // Når symptomene vanligvis kommer, står i preparatomtalen for det gamle SSRI-et.
      expect(overgang.grunnlag.type === 'kilde' && overgang.grunnlag.henvisninger[0]).toMatchObject({ kilde: r.fra.type === 'virkestoff' && r.fra.nokkel === 'escitalopram' ? 'dmp-cipralex' : 'dmp-cipramil', sted: 'pkt. 4.4' })
    }
  })

  it('gjelder bare de første ukene av behandlingen, med en kontrollerbar grense som er OUSFARs egen beslutning (avklart for sertralinreglene), stopper over grensen og ikke endrer «Trappe ned» (K2-8)', () => {
    for (const r of BYTTESETT.regler) {
      const u = r.unntak.find((x) => x.id === 'lang_behandlingstid')!
      expect(u.tekst, r.id).toContain(`sammenhengende i mer enn ${KORT_BEHANDLINGSTID_UKER} uker`)
      expect(u.grunnlag.type === 'ousfar_vurdering' && u.grunnlag.begrunnelse, r.id).toMatch(/Grensen er OUSFARs valg, ikke en verdi fra kildene/)
      if (sluttrinnApent(r)) expect(apneValg(r), r.id).toContain('lang_behandlingstid (åpent forslag)')
      else expect(u.grunnlag.type === 'ousfar_vurdering' && u.grunnlag.avklaring?.merknad, r.id).toContain('ja som pilotavgrensning')
      // Motsigelsen mot det felles spørsmålet i «Trappe ned» står uttrykkelig, og det spørsmålet er uendret.
      expect(u.grunnlag.type === 'ousfar_vurdering' && u.grunnlag.begrunnelse, r.id).toContain(`ingen ny felles definisjon av kort behandlingstid: «Trappe ned» spør fortsatt «${LANG_BEHANDLINGSTID.tekst}»`)
    }
    expect(LANG_BEHANDLINGSTID.tekst).toBe('Har pasienten brukt legemidlet i mange måneder eller lenger?')
    expect(SPORSMAL.find((x) => x.nr === 'K2-8')!.sporsmal).toContain(LANG_BEHANDLINGSTID.tekst)
    for (const r of BYTTESETT.regler.filter((x) => !sluttrinnApent(x))) {
      const d = r.inndata.find((x) => x.navn === 'startdose')!.verdier![0]!
      const pasientforhold = Object.fromEntries(r.unntak.map((x) => [x.id, false]))
      expect(beregnSomGodkjent(r, { startdose_mg: d, maldose_mg: 50 }).status, r.id).toBe('modellberegning')
      const lang = beregnSomGodkjent(r, { startdose_mg: d, maldose_mg: 50, pasientforhold: { ...pasientforhold, lang_behandlingstid: true } })
      expect(lang.status, r.id).not.toBe('modellberegning')
      expect(JSON.stringify(lang), r.id).toContain(`Regelen gjelder ikke: Pasienten har brukt`)
    }
  })

  it('bygger oppfølgingen av sertralin på Zoloft-preparatomtalen og vurderer effekt, toleranse og seponeringssymptomer før 50 → 100 mg (ChatGPT 04.11)', () => {
    for (const r of BYTTESETT.regler.filter((x) => !sluttrinnApent(x))) {
      const til = r.plan.forlop[1]!
      const bekreftelse = r.bekreftelser.find((b) => b.id === 'toleranse_bytte')!
      // Ingen respons- eller effekttid for sertralin hentet fra preparatomtalen for escitalopram eller citalopram:
      // derfra står bare det gamle SSRI-ets seponering og halveringstid.
      const henvisningerI = (x: unknown) => [...JSON.stringify(x).matchAll(/\{"kilde":"(dmp-[^"]+)","sted":"([^"]*)","faktum":"([^"]*)"\}/g)].map((m) => ({ kilde: m[1], sted: m[2], faktum: m[3] }))
      const fraSpc = (x: unknown) => henvisningerI(x).filter((h) => h.kilde !== 'dmp-zoloft')
      expect(henvisningerI(til).map((x) => x.kilde), r.id).toContain('dmp-zoloft')
      for (const h of [...fraSpc(til), ...fraSpc(bekreftelse)]) expect(h.faktum, `${r.id} ${h.kilde}`).toMatch(/^(Brå seponering bør unngås|Halveringstiden|Eliminasjonshalveringstiden)/)
      expect(JSON.stringify(r), r.id).not.toContain('før antidepressiv respons')
      const respons = til.vurderinger!.find((v) => v.id === 'respons')!
      expect(respons.grunnlag.type === 'kilde' && respons.grunnlag.henvisninger).toEqual([expect.objectContaining({ kilde: 'dmp-zoloft', faktum: expect.stringMatching(/^Effekten kan ses i løpet av sju dager, men vanligvis trengs lengre observasjonstid/) })])
      const okning = til.vurderinger!.find((v) => v.id === 'for_okning')!
      for (const del of ['Vurder effekten av sertralin så langt og om økningen fortsatt trengs', 'hvordan sertralin tåles', 'seponeringssymptomer etter']) expect(okning.tekst, r.id).toContain(del)
      expect(okning.ved_funn).toMatch(/Vedlikeholdsdosen er forskriverens valg og kan justeres\. Er effekten tilstrekkelig, beholdes dosen\. Ved dårlig toleranse eller seponeringssymptomer økes den ikke nå/)
    }
    // I den viste planen står vurderingen før økningen på dagen sertralin går fra 50 til 100 mg.
    const plan = planlinjer(kasus('bytte-escitalopram-sertralin:20-100'))
    expect(plan).toContain(
      'Dag 43 (21.12.2026): Vurdering (Sertralin): Før endringen: Vurder effekten av sertralin så langt og om økningen fortsatt trengs, hvordan sertralin tåles, og om pasienten har seponeringssymptomer etter escitalopram.',
    )
  })

  it('med utvasking 0 starter sertralin nøyaktig dagen etter siste dose, både i beregningen og i den praktiske planen (P5.7)', () => {
    for (const r of BYTTESETT.regler.filter((x) => !sluttrinnApent(x))) {
      for (const d of r.inndata.find((x) => x.navn === 'startdose')!.verdier!) {
        const res = beregnSomGodkjent(r, { startdose_mg: d, maldose_mg: 50 })
        if (res.status !== 'modellberegning') throw new Error(`${r.id} ${d}: ${JSON.stringify(res)}`)
        const [fra, til] = res.forlop
        expect(til!.start, `${r.id} ${d}`).toBe(fra!.siste_dosedag! + 1)
        expect(til!.perioder[0]!.fra).toBe(fra!.siste_dosedag! + 1)
        expect(res.kontroller.find((k) => k.krav.startsWith('Minst 0 dager uten'))).toMatchObject({ oppfylt: true, detalj: expect.stringMatching(/\(0 dager\)/) })
      }
    }
    // Den praktiske planen med preparater: siste escitalopram dag 28, sertralin fra dag 29 på samme rad.
    const u = kjorK2(kasus('bytte-escitalopram-sertralin:20-50'), UTTREKK)
    expect(u.utfall).toBe('plan')
    expect(u.utfall === 'plan' && u.linjer.filter((l) => !erVurdering(l)).slice(-2)).toEqual([
      'Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg',
      'Fra dag 29 (fra 07.12.2026): Escitalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg',
    ])
  })

  it('begrunner direkte overgang mot moderat bytte og kryssnedtrapping, som alternativene som ikke er valgt', () => {
    for (const r of BYTTESETT.regler.filter((x) => !sluttrinnApent(x))) {
      const start = r.plan.forlop[1]!.start
      if (start.type !== 'etter_utvasking') throw new Error(r.id)
      expect(start.utvasking.grunnlag.type === 'ousfar_vurdering' ? start.utvasking.grunnlag.begrunnelse : start.utvasking.grunnlag.henvisninger.map((h) => h.faktum).join(' '), r.id).toMatch(/Moderat bytte med 2–4 dager uten legemiddel er vurdert og ikke valgt/)
    }
  })

  it('seponerer aldri det gamle SSRI-et til mirtazapin uten et avgjort sluttrinn: hver kombinasjon stopper, også simulert godkjent', () => {
    for (const r of BYTTESETT.regler.filter(sluttrinnApent)) {
      const fase = r.plan.forlop[0]!.faser[0]!
      expect(fase.type === 'nedtrapping' && typeof fase.avslutning === 'object' && fase.avslutning.fra_hoyst_mg.verdi, r.id).toBeNull()
      expect(apneValg(r)).toContain('fra.faser[0].avslutning (åpent forslag)')
      for (const d of r.inndata.find((x) => x.navn === 'startdose')!.verdier!) {
        const res = beregnSomGodkjent(r, { startdose_mg: d, maldose_mg: r.inndata.find((x) => x.navn === 'maldose')!.verdier![0] }, 'ikke_avgjort')
        expect(res.status, `${r.id} ${d}`).toBe('stoppet')
        expect(res.status === 'stoppet' && res.stoppgrunner.join(' '), `${r.id} ${d}`).toMatch(/avslutning\.fra_hoyst_mg mangler og må avklares faglig/)
      }
    }
  })

  it('regler med bare stopp-eksempler godtas bare så lenge sluttrinnet venter; når verdien settes, kreves et beregnet regneeksempel igjen', () => {
    const alle = REGELSETTENE.flatMap((x) => x.regler)
    const vakt = (r: Regel) => kontrollerRegelsett({ ...BYTTESETT, regler: [r] }, lesKontrollgrunnlag(), alle).filter((f) => f.includes('har ingen regneeksempler med beregnet plan'))
    for (const r of BYTTESETT.regler) {
      if (!sluttrinnApent(r)) {
        expect(r.eksempler.some((e) => !e.stopp), r.id).toBe(true)
        expect(vakt(r), r.id).toEqual([])
        continue
      }
      expect(r.eksempler.every((e) => e.stopp), r.id).toBe(true)
      expect(vakt(r), r.id).toEqual([])
      const satt = structuredClone(r)
      medSluttrinnVedLavesteTablett(satt)
      expect(vakt(satt), r.id).toEqual([`${r.id}: har ingen regneeksempler med beregnet plan`])
    }
  })

  it('begrunner ikke seponeringen med laveste dose i preparatomtalen', () => {
    for (const r of BYTTESETT.regler) {
      const fase = r.plan.forlop[0]!.faser[0]!
      if (fase.type !== 'nedtrapping' || fase.strategi.type !== 'prosent_av_aktuell') throw new Error(r.id)
      const g = fase.strategi.sluttdose_mg!.grunnlag
      expect(g.type === 'ousfar_vurdering' && g.begrunnelse, r.id).toMatch(/ingen seponeringsgrense/)
    }
  })
})

describe('K2: planene ende til ende med preparatene i FEST (til sertralin med OUSFARs sluttrinn; til mirtazapin med sluttrinnet simulert som laveste tablettdose, K2-2)', () => {
  it('K0-04: sertralin 100 mg → mirtazapin 30 mg, til sertralin er seponert og mirtazapin står på 30 mg', () => {
    expect(linjer(kasus('bytte-sertralin-mirtazapin:100-30'))).toEqual([
      'Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
      'Dag 15–28 (23.11.2026–06.12.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
      'Fra dag 29 (fra 07.12.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg',
    ])
  })

  it('K0-05: escitalopram 20 mg → mirtazapin 30 mg', () => {
    expect(linjer(kasus('bytte-escitalopram-mirtazapin:20-30'))).toEqual([
      'Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
      'Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
      'Fra dag 29 (fra 07.12.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg',
    ])
  })

  it('K0-06: escitalopram 20 mg → sertralin 100 mg, med direkte overgang: sertralin dagen etter siste dose escitalopram', () => {
    expect(linjer(kasus('bytte-escitalopram-sertralin:20-100'))).toEqual([
      'Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg',
      'Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg',
      'Dag 29–42 (07.12.2026–20.12.2026): Escitalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg',
      'Fra dag 43 (fra 21.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg',
    ])
  })

  it('escitalopram 10 mg → sertralin 50 mg: ett trinn på 5 mg og så sertralin, ingen dag uten SSRI', () => {
    expect(linjer(kasus('bytte-escitalopram-sertralin:10-50'))).toEqual([
      'Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg',
      'Fra dag 15 (fra 23.11.2026): Escitalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg',
    ])
  })

  it('citalopram 40 mg → mirtazapin 15 mg og citalopram 20 mg → sertralin 50 mg', () => {
    expect(linjer(kasus('bytte-citalopram-mirtazapin:40-15'))).toEqual([
      'Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
      'Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
      'Fra dag 29 (fra 07.12.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg',
    ])
    expect(linjer(kasus('bytte-citalopram-sertralin:20-50'))).toEqual([
      'Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg',
      'Fra dag 15 (fra 23.11.2026): Citalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg',
    ])
  })

  it('har vurderingspunktene på riktige dager: før hver reduksjon og seponering, før økningen og respons fire uker etter hver endring', () => {
    expect(vurderinger(kasus('bytte-sertralin-mirtazapin:100-30'))).toEqual([
      'dag 15 Sertralin før',
      'dag 29 Sertralin før',
      'dag 29 Mirtazapin før',
      'dag 29 Mirtazapin',
      'dag 57 Mirtazapin',
    ])
    // En uke etter siste dose escitalopram (dag 28) vurderes overgangen.
    expect(vurderinger(kasus('bytte-escitalopram-sertralin:20-100'))).toEqual([
      'dag 15 Escitalopram før',
      'dag 29 Escitalopram før',
      'dag 35 Escitalopram',
      'dag 43 Sertralin før',
      'dag 57 Sertralin',
      'dag 71 Sertralin',
    ])
    // Uten økning er det ingen vurdering før økning, bare responsen etter oppstarten.
    expect(vurderinger(kasus('bytte-citalopram-mirtazapin:40-15'))).toEqual(['dag 15 Citalopram før', 'dag 29 Citalopram før', 'dag 29 Mirtazapin'])
    expect(vurderinger(kasus('bytte-citalopram-sertralin:20-50'))).toEqual(['dag 15 Citalopram før', 'dag 21 Citalopram', 'dag 43 Sertralin'])
  })

  it('hver plan i omfanget når sluttmålet: det gamle seponert, det nye på valgt vedlikeholdsdose uten slutt', () => {
    for (const r of BYTTESETT.regler) {
      const start = r.inndata.find((x) => x.navn === 'startdose')!.verdier!
      const mal = r.inndata.find((x) => x.navn === 'maldose')!.verdier!
      for (const d of start) {
        for (const m of mal) {
          const res = beregnSomGodkjent(r, { startdose_mg: d, maldose_mg: m })
          expect(res.status, `${r.id} ${d} → ${m}`).toBe('modellberegning')
          expect(res.klinisk_godkjent).toBe(true)
          if (res.status !== 'modellberegning') continue
          const [fra, til] = res.forlop
          expect(fra!.siste_dosedag, `${r.id} ${d}: seponert`).not.toBeNull()
          expect(til!.siste_dosedag).toBeNull()
          expect(til!.perioder.at(-1)).toMatchObject({ til: null, mg: m })
          // Det nye startes dag 1 (kryssnedtrapping) eller dagen etter siste dose av det gamle (direkte overgang): ingen dag uten et antidepressiv.
          const s = r.plan.forlop[1]!.start
          expect(til!.perioder[0]!.fra).toBe(s.type === 'etter_utvasking' ? fra!.siste_dosedag! + 1 : 1)
        }
      }
    }
  })

  it('stopper ved grenseverdier: doser som ikke kan halveres med hele tabletter, og vedlikeholdsdoser utenfor planen', () => {
    const utenfor: Record<string, number[]> = {
      'bytte-sertralin-mirtazapin': [25, 75, 150, 49.99, 100.01, 300],
      'bytte-escitalopram-mirtazapin': [5, 15, 30],
      'bytte-citalopram-mirtazapin': [10, 30, 60],
      'bytte-escitalopram-sertralin': [5, 15, 30],
      'bytte-citalopram-sertralin': [10, 30, 60],
    }
    for (const r of BYTTESETT.regler) {
      const mal = r.inndata.find((x) => x.navn === 'maldose')!.verdier![0]!
      for (const d of utenfor[r.id]!) {
        const res = beregnSomGodkjent(r, { startdose_mg: d, maldose_mg: mal })
        expect(res.status, `${r.id} ${d} mg`).toBe('stoppet')
        expect(res.status === 'stoppet' ? res.stoppgrunner.join(' ') : '').toMatch(/er utenfor det regelen gjelder for/)
      }
      const start = r.inndata.find((x) => x.navn === 'startdose')!.verdier![0]!
      for (const m of r.til?.type === 'virkestoff' && r.til.nokkel === 'mirtazapin' ? [7.5, 22.5, 45, 60] : [25, 75, 150, 200]) {
        const res = beregnSomGodkjent(r, { startdose_mg: start, maldose_mg: m })
        expect(res.status, `${r.id} måldose ${m} mg`).toBe('stoppet')
      }
    }
  })

  it('stopper ved hvert unntak, hvert ubesvart forhold, hver manglende bekreftelse, avregistrert styrke, foreldet FEST og endret regel', () => {
    const avvik = K2KASUS.flatMap((k) => k2avvik(k, kjorK2(k, UTTREKK)).map((f) => `${k.id}: ${f}`))
    expect(avvik).toEqual([])
    const kategorier = new Set(K2KASUS.map((k) => k.kategori))
    for (const k of ['vanlig_dose', 'uvanlig_dose', 'pasientforhold', 'preparat', 'foreldet_fest', 'regelendring', 'ikke_godkjent'] as const) expect(kategorier).toContain(k)
  })
})

describe('K2: rapportene', () => {
  it('regelrapporten skrives og kontrolleres sammen med de andre regelrapportene', () => {
    expect(REGELRAPPORTER.find((r) => r.fil === K2_REGELRAPPORT.fil)?.sett).toBe(BYTTESETT)
  })
  it('kontrollgrunnlaget er oppdatert', () => {
    expect(les(K2_KONTROLLFIL)).toBe(lagK2Kontrollgrunnlag(UTTREKK))
  })
})
