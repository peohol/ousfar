/**
 * VDK-1: dekningsoversikten for de tre verktøyene
 * (`docs/verktøy-vdk1-regeldekning.md`, `src/verktoy/regeldekning.ts`).
 * Oversikten skal si nøyaktig det verktøysiden gjør, ikke kunne utvide noen
 * godkjenning, og modellberegningen skal bare regne på kopier av reglene.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { lesKartdata } from '../verktoy/kartdata'
import { ETTER_RETTELSENE } from '../verktoy/kontrollsett'
import { VERKTOY, virkestoffvalg } from '../verktoy/register'
import { AKSEPTSTOFFER, beregnAksept, besvart, FEST_AKSEPTTEST, formerFor, reduksjoner, vanligDose, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { erKliniskGodkjent, fingeravtrykk, kanonisk } from '../verktoy/regler/godkjenning'
import { PILOTKASUS } from '../verktoy/regler/pilotmatrise'
import {
  DEKNINGSUTFALL,
  folsomhet,
  forskriverkasus,
  kasusregel,
  kildeHarAnbefaling,
  kombinasjoner,
  lagRegeldekningsrapport,
  medTrinngrense,
  REGELDEKNINGSFIL,
  regeldekning,
  stigetekst,
  TRINNGRENSER,
  trinnstige,
} from '../verktoy/regeldekning'
import { REGELSETT, tilgjengelighet } from '../verktoy/tilgjengelighet'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekk = JSON.parse(les(FEST_AKSEPTTEST)) as Festuttrekk
const KART = lesKartdata()
const ALLE = new Map(VERKTOY.map((v) => [v.id, regeldekning(v, KART)]))
const verktoy = (id: string) => VERKTOY.find((v) => v.id === id)!

describe('Kombinasjonene', () => {
  it('er hvert valg i seponering og hvert ordnede par av ulike valg i bytte', () => {
    for (const v of VERKTOY) {
      const n = virkestoffvalg(v).reduce((s, x) => s + x.formuleringer.length, 0)
      expect(kombinasjoner(v)).toHaveLength(v.type === 'seponering' ? n : n * (n - 1))
    }
  })

  it('har aldri johannesurt', () => {
    for (const v of VERKTOY) for (const k of kombinasjoner(v)) expect([k.fra.nokkel, k.til?.nokkel].join(' ')).not.toMatch(/johannesurt|hypericum/i)
  })

  it('har det samme utfallet som verktøysiden for hver kombinasjon', () => {
    const status: Record<string, string[]> = {
      beregning: ['tilgjengelig'],
      fagtekst: ['fagtekst'],
      ikke_godkjent: ['ikke_godkjent'],
      fagtekst_ikke_godkjent: ['ikke_godkjent'],
      til_kontroll: ['til_kontroll'],
    }
    for (const v of VERKTOY) {
      for (const k of ALLE.get(v.id)!) {
        const t = tilgjengelighet(v, k.valg)
        expect(status[k.utfall] ?? ['ikke_stottet'], `${v.id} ${JSON.stringify(k.valg)}`).toContain(t.status)
        expect(k.regler.map((r) => r.id)).toEqual(t.regler.map((r) => r.id))
      }
    }
  })

  it('gir beregning bare for kombinasjonene de tolv godkjente reglene med beregning gjelder', () => {
    const beregning = [...ALLE].flatMap(([id, ks]) => ks.filter((k) => k.utfall === 'beregning').map((k) => `${id}: ${k.valg.fra.nokkel}/${k.valg.fra.formulering}${k.valg.til ? ` → ${k.valg.til.nokkel}/${k.valg.til.formulering}` : ''}`))
    expect(beregning.sort()).toEqual(
      [
        'trappe-ned-antidepressiv: vortioksetin/standard',
        // Escitalopram versjon 13 fra K1, godkjent 04.11.2026.
        'trappe-ned-antidepressiv: escitalopram/standard',
        'bytte-antidepressiv: sertralin/standard → mirtazapin/standard',
        // De to byttene til sertralin fra K2, godkjent 05.11.2026 (`K2VEDTAK`).
        'bytte-antidepressiv: escitalopram/standard → sertralin/standard',
        'bytte-antidepressiv: citalopram/standard → sertralin/standard',
        'bytte-antipsykotikum: aripiprazol/standard → aripiprazol/LA',
        'bytte-antipsykotikum: paliperidon/standard → paliperidon/ER',
        // De tre antipsykotikabyttene fra K3, godkjent 04.11.2026 (`ANTIPSYKOTIKAVEDTAK`).
        'bytte-antipsykotikum: olanzapin/standard → aripiprazol/standard',
        'bytte-antipsykotikum: risperidon/standard → aripiprazol/standard',
        'bytte-antipsykotikum: risperidon/standard → paliperidon/ER',
        'kombinere-stemningsstabiliserende: litium/standard → lamotrigin/standard',
        'kombinere-stemningsstabiliserende: valproat/standard → lamotrigin/standard',
      ].sort(),
    )
    expect(new Set([...ALLE.values()].flatMap((ks) => ks.filter((k) => k.utfall === 'beregning').flatMap((k) => k.regler)))).toEqual(
      new Set(REGELSETT.regler.filter((r) => erKliniskGodkjent(r) && r.beregnbarhet !== 'bare_tekstlig')),
    )
  })

  it('skiller kombinasjoner uten regel etter om kildetabellen har en anbefaling', () => {
    const ad = verktoy('bytte-antidepressiv')
    const k = ALLE.get(ad.id)!.find((x) => x.valg.fra.nokkel === 'escitalopram' && x.valg.til?.nokkel === 'vortioksetin')!
    expect(k.utfall).toBe(kildeHarAnbefaling(KART, ad, k.valg) ? 'kilde_har_anbefaling' : 'kilde_uten_anbefaling')
    const ap = ALLE.get('bytte-antipsykotikum')!
    expect(ap.some((x) => x.utfall === 'kilde_uten_anbefaling')).toBe(true)
    expect(ap.filter((x) => x.valg.fra.formulering === 'MA' || x.valg.til?.formulering === 'MA').every((x) => x.utfall === 'mellomlang')).toBe(true)
  })

  it('har en tekst for hvert utfall', () => {
    for (const ks of ALLE.values()) for (const k of ks) expect(DEKNINGSUTFALL[k.utfall]).toBeTruthy()
  })
})

describe('Kasusene fra testmatrisen', () => {
  it('knyttes til regelen verktøysiden ville brukt, og forskriverens valg endrer verken regel, FEST eller nødstopp', () => {
    expect(kasusregel(PILOTKASUS.find((k) => k.id === 'V01')!)).toBe('seponering-vortioksetin')
    const kasus = forskriverkasus('seponering-vortioksetin')
    expect(kasus.length).toBeGreaterThan(0)
    for (const k of kasus) expect(k.regel?.endre ?? k.fest ?? k.sperrer?.length ?? null).toBeFalsy()
  })
})

describe('Modellberegningen av trinngrensen', () => {
  const s = AKSEPTSTOFFER.find((x) => x.nokkel === 'sertralin')!

  it('regner på en kopi: regelen og fingeravtrykket er uendret, og kopien er aldri klinisk godkjent', () => {
    const for_ = fingeravtrykk(s.hoved)
    const kopi = medTrinngrense(s.hoved, 50, false)
    expect(fingeravtrykk(s.hoved)).toBe(for_)
    expect(kopi).not.toBe(s.hoved)
    expect(erKliniskGodkjent(kopi)).toBe(false)
  })

  it('endrer ingenting ved dagens grenser', () => {
    for (const x of AKSEPTSTOFFER) {
      expect(kanonisk(medTrinngrense(x.hoved, TRINNGRENSER.kort[0], false))).toBe(kanonisk(x.hoved))
      expect(kanonisk(medTrinngrense(x.hoved, TRINNGRENSER.lang[0], true))).toBe(kanonisk(x.hoved))
    }
  })

  it('løfter bare begrunnelsesgrensen som gjelder behandlingstiden', () => {
    const fase = (r: typeof s.hoved) => r.plan.forlop[0]!.faser[0]!
    const krav = (r: typeof s.hoved) => {
      const f = fase(r)
      return f.type === 'nedtrapping' && f.strategi.type === 'prosent_av_aktuell' ? (f.strategi.prosent.begrunnelseskrav ?? []).map((k) => [k.ved ?? null, k.over]) : []
    }
    expect(krav(medTrinngrense(s.hoved, 50, false))).toEqual([[null, 50], ['lang_behandlingstid', 10]])
    expect(krav(medTrinngrense(s.hoved, 25, true))).toEqual([[null, 25], ['lang_behandlingstid', 25]])
  })

  it('gir samme plan som aksepttesten fra vanlig dose når grensen er dagens og det ikke trengs noe valg', () => {
    const form = formerFor(uttrekk, s.hoved)[0]!
    const dose = vanligDose(s.hoved)
    const a = beregnAksept(uttrekk, s.hoved, form, besvart(s.hoved, dose))
    expect(reduksjoner(trinnstige(uttrekk, s.hoved, form, besvart(s.hoved, dose), 25))).toBe(reduksjoner(a))
  })

  it('viser hvor langt sertralin kommer fra 100 mg ved hver grense, og at ingen plan går til null', () => {
    const rad = folsomhet(uttrekk).find((r) => r.nokkel === 'sertralin' && !r.lang)!
    expect(rad.planer.map((p) => stigetekst(rad.startdose_mg, p))).toEqual(['100 → 75 mg (1 reduksjon)', '100 → 75 → 50 mg (2 reduksjoner)', '100 → 75 → 50 → 25 mg (3 reduksjoner)'])
    for (const r of folsomhet(uttrekk)) for (const p of r.planer) if (p.status === 'doseplan') expect(p.forlop[0]!.perioder.every((x) => x.mg > 0)).toBe(true)
  })
})

describe('Rapporten', () => {
  const rapport = lagRegeldekningsrapport(uttrekk, KART)

  it('er oppdatert', () => {
    expect(les(REGELDEKNINGSFIL), 'Lag den på nytt med `npm run verktoy:regler -- regeldekning`.').toBe(rapport)
  })

  it('viser ingen lenker eller tekst fra Psychiatrienet', () => {
    expect(rapport).not.toMatch(/switchdetail|psychiatrienet\.nl/i)
  })

  it('tar med hver regel uten godkjenning, også når en annen regel for samme kombinasjon er godkjent', () => {
    const utenPlan = rapport.split('## 5.')[1]!.split('## 6.')[0]!
    const uten = REGELSETT.regler.filter((r) => !erKliniskGodkjent(r) && r.beregnbarhet !== 'mangler_anbefaling')
    expect(uten.map((r) => r.id)).toContain('seponering-vortioksetin-langsom')
    for (const r of uten) expect(utenPlan, r.id).toContain(`\`${r.id}\` v${r.versjon}`)
    for (const r of REGELSETT.regler.filter(erKliniskGodkjent)) expect(utenPlan).not.toContain(`\`${r.id}\` `)
  })

  it('regner 33⅓ % nøyaktig, ikke avrundet', () => {
    expect(TRINNGRENSER.kort[1]).toBe(100 / 3)
    expect(rapport).toContain('høyst 33⅓ %')
  })

  it('sier at modellberegningen ikke er en regel eller noe verktøyet bruker', () => {
    expect(rapport).toContain('ikke en regel, en anbefaling eller noe verktøyet bruker')
  })
})

describe('prioriteringen i VDK-2', () => {
  const plan = readFileSync('docs/verktøy-vdk2-prioritering.md', 'utf8')
  const rader = [...plan.matchAll(/^\| `([a-z0-9-]+)` \| (\d+) \| `([0-9a-f]{64})` \|/gm)]

  it('oppgir versjonen og fingeravtrykket regelen faktisk har, så kontrollen gjelder nøyaktig den', () => {
    expect(rader.map((r) => r[1])).toEqual(['seponering-amitriptylin', 'seponering-nortriptylin', 'seponering-escitalopram', 'seponering-escitalopram-langsom'])
    // Planen gjelder versjonene etter rettelsen av RCPsych-faktumet; K1 har siden gitt escitalopram en ny versjon (`regler/k1.ts`).
    const regler = ETTER_RETTELSENE.flatMap((s) => s.regler)
    for (const [, id, versjon, avtrykk] of rader) {
      const regel = regler.find((r) => r.id === id)!
      expect([regel.versjon, fingeravtrykk(regel)]).toEqual([Number(versjon), avtrykk])
      expect(erKliniskGodkjent(regel)).toBe(false)
    }
  })

  it('aktiverer ingenting selv: regelutkastene som er skrevet siden (K3), godkjennes bare av kontrolløren i K3', () => {
    expect(plan).toContain('Ingenting her er aktivert eller klinisk godkjent')
    // Xeplion fra peroral risperidon er godkjent av kontrolløren 04.11.2026 (`ANTIPSYKOTIKAVEDTAK`); Consta → Xeplion står til faglig kontroll.
    for (const [id, godkjent] of [['depot-risperidon-xeplion', true], ['depot-consta-xeplion', false]] as const) {
      const regel = REGELSETT.regler.find((r) => r.id === id)!
      expect(regel.godkjenning.status, id).toBe(godkjent ? 'klinisk_godkjent' : 'til_faglig_kontroll')
      expect(erKliniskGodkjent(regel), id).toBe(godkjent)
      expect(plan, id).toContain(`\`${id}\` er skrevet som regelutkast i K3`)
    }
  })

  it('viser ingen lenker eller tekst fra Psychiatrienet', () => {
    expect(plan).not.toMatch(/switchdetail|psychiatrienet\.nl/i)
  })
})
