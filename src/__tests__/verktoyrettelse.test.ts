/**
 * Rettelsen av faktumet `RCPSYCH.langvarig` etter kontrollørens vurdering
 * 03.11.2026 (`docs/verktøy-kildefunn-1-2.md` §8): de nye regelversjonene, at
 * bare faktumet er endret, registreringen av kontrollørens vurdering av dem
 * (R1–R4 i PR #309) og kontrollgrunnlaget (`docs/verktøy-rettelse-langvarig.md`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { FAKTUMRETTELSER, RCPSYCH, RCPSYCH_TIDLIGERE } from '../verktoy/regler/bygg'
import { disposisjonsfeil, erKliniskGodkjent, fingeravtrykk, godkjenn, kanonisk, kontrollutfall, vedtaksfeil } from '../verktoy/regler/godkjenning'
import { MAKS_FAKTUM } from '../verktoy/regler/kontroll'
import { henvisninger, type Kildehenvisning, type Regel } from '../verktoy/regler/modell'
import { NEDTRAPPINGSDISPOSISJON, NEDTRAPPINGSSETT, NEDTRAPPINGSSETT_FOR_RETTELSENE } from '../verktoy/regler/nedtrapping'
import { PILOTDISPOSISJON, PILOTSETT, PILOTSETT_FOR_RETTELSENE } from '../verktoy/regler/pilotsett'
import { rett, rettRegel } from '../verktoy/regler/rettelse'
import { FOR_RETTELSENE, forventedeLinjeendringer, lagRettelseskontroll, matrisesammenligning, RETTELSESKONTROLLFIL, rettelsesrader, synlig, tilGodkjenning } from '../verktoy/rettelseskontroll'
import { REGELSETT, REGELSETTENE } from '../verktoy/tilgjengelighet'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekkene = { pilot: JSON.parse(les(FEST_PILOT)) as Festuttrekk, aksept: JSON.parse(les(FEST_AKSEPTTEST)) as Festuttrekk }
const lik = (a: Kildehenvisning) => (b: Kildehenvisning) => kanonisk(a) === kanonisk(b)
const RETTELSE = FAKTUMRETTELSER[0]!
const RADER = rettelsesrader()
const KONTROLL = RETTELSE.kontroll!
const KONTROLLOR = 'ChatGPT (uavhengig fagkontrollør)'
const GODKJENT = ['kryssnedtrapping-sertralin-mirtazapin', 'seponering-vortioksetin']

/** Kontrollørens formulering 03.11.2026, ordrett; premisset for rettelsen. */
const KONTROLLORENS_FORMULERING =
  'Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. Andre deler av veiledningen beskriver også proporsjonale reduksjoner beregnet fra sist brukte dose.'

/** Reglene som viser til faktumet: de to godkjente og de 16 som ble vurdert og ikke godkjent 31.10.2026. */
const BERORTE = [
  'kryssnedtrapping-sertralin-mirtazapin',
  'seponering-amitriptylin',
  'seponering-amitriptylin-langsom',
  'seponering-escitalopram',
  'seponering-escitalopram-langsom',
  'seponering-fluoksetin',
  'seponering-fluoksetin-langsom',
  'seponering-fluvoksamin',
  'seponering-fluvoksamin-langsom',
  'seponering-klomipramin',
  'seponering-klomipramin-langsom',
  'seponering-nortriptylin',
  'seponering-nortriptylin-langsom',
  'seponering-sertralin',
  'seponering-sertralin-langsom',
  'seponering-vortioksetin',
  'seponering-vortioksetin-langsom',
  'seponering-fluoksetin-annenhver-dag',
]

/** Verdien på en sti som `forskjeller` skriver den. */
const ved = (x: unknown, sti: string): unknown => sti.split(/\.|(?=\[)/).reduce<unknown>((y, del) => (del.startsWith('[') ? (y as unknown[])[Number(del.slice(1, -1))] : (y as Record<string, unknown>)[del]), x)

describe('Faktumet', () => {
  it('er kontrollørens formulering, ordrett, delt i to fakta med hvert sitt sted i RCPsych', () => {
    expect(RETTELSE.fra).toBe(RCPSYCH_TIDLIGERE.langvarig)
    expect(RETTELSE.til).toEqual([RCPSYCH.langvarig, RCPSYCH.proporsjonal])
    expect(RETTELSE.til.map((h) => ('faktum' in h ? h.faktum : '')).join(' ')).toBe(KONTROLLORENS_FORMULERING)
    expect(RETTELSE.til.map((h) => h.kilde)).toEqual(['rcpsych-stopping', 'rcpsych-stopping'])
    expect(RETTELSE.til.map((h) => ('sted' in h ? h.sted : ''))).toEqual(['If you have been taking antidepressants for longer', 'Examples of tapering plans'])
    for (const h of RETTELSE.til) expect(h.faktum!.length).toBeLessThanOrEqual(MAKS_FAKTUM)
    expect(RETTELSE.dato).toBe('2026-11-03')
    expect(RETTELSE.grunn).toMatch(/kontrollørens vurdering 03\.11\.2026/)
  })
})

describe('Regelsettene før og etter rettelsen', () => {
  it('er de samme settene; settene før rettelsen er appversjon 1.122.1, og appens sett har ny versjon', () => {
    // Leveransenes sett (K2–K4, regelmodell 12) kom etter rettelsen og står etter de to rettede settene.
    expect(FOR_RETTELSENE.map((s) => s.id)).toEqual(REGELSETTENE.slice(0, FOR_RETTELSENE.length).map((s) => s.id))
    expect([PILOTSETT_FOR_RETTELSENE.versjon, PILOTSETT.versjon]).toEqual([16, 17])
    expect([NEDTRAPPINGSSETT_FOR_RETTELSENE.versjon, NEDTRAPPINGSSETT.versjon]).toEqual([14, 15])
    for (const [i, s] of FOR_RETTELSENE.entries()) {
      expect(REGELSETTENE[i]!.beskrivelse.startsWith(s.beskrivelse), s.id).toBe(true)
      expect(rett([...s.regler], FAKTUMRETTELSER), s.id).toEqual(REGELSETTENE[i]!.regler)
    }
  })

  it('før rettelsen viser nøyaktig de 18 reglene til faktumet slik det stod, og to av dem var godkjent', () => {
    const for_ = FOR_RETTELSENE.flatMap((s) => s.regler)
    expect(for_.filter((r) => henvisninger(r).some(lik(RETTELSE.fra))).map((r) => r.id).sort()).toEqual([...BERORTE].sort())
    expect(for_.filter((r) => BERORTE.includes(r.id) && erKliniskGodkjent(r)).map((r) => `${r.id} v${r.versjon}`)).toEqual(['kryssnedtrapping-sertralin-mirtazapin v9', 'seponering-vortioksetin v11'])
  })

  it('appen viser ikke lenger til faktumet slik det stod, bare til de rettede faktaene', () => {
    for (const r of REGELSETT.regler) expect(henvisninger(r).some(lik(RETTELSE.fra)), r.id).toBe(false)
    // De rettede settene viser til de nye faktaene nøyaktig der det gamle stod; senere sett (K2–K4) kan også vise til dem.
    const rettede = [...PILOTSETT.regler, ...NEDTRAPPINGSSETT.regler]
    expect(rettede.filter((r) => henvisninger(r).some(lik(RCPSYCH.langvarig))).map((r) => r.id).sort()).toEqual([...BERORTE].sort())
    expect(rettede.filter((r) => henvisninger(r).some(lik(RCPSYCH.proporsjonal))).map((r) => r.id).sort()).toEqual([...BERORTE].sort())
    // Kontrollørens to fakta står alltid sammen, så ingen regel gjengir bare den ene delen av kilden.
    for (const r of REGELSETT.regler) expect(henvisninger(r).some(lik(RCPSYCH.langvarig)), r.id).toBe(henvisninger(r).some(lik(RCPSYCH.proporsjonal)))
  })
})

describe('De nye versjonene', () => {
  it('er nøyaktig de 18 reglene som viste til faktumet, hver med versjonen økt med én', () => {
    expect(RADER.map((x) => x.for.id)).toEqual(BERORTE)
    for (const x of RADER) {
      expect(x.etter.versjon, x.for.id).toBe(x.for.versjon + 1)
      expect(fingeravtrykk(x.etter), x.for.id).not.toBe(fingeravtrykk(x.for))
    }
  })

  it('skiller seg bare i listene over henvisninger der det gamle faktumet er byttet med de nye', () => {
    for (const x of RADER) {
      expect(x.steder.length, x.for.id).toBeGreaterThan(0)
      for (const sti of x.steder) {
        expect(sti, x.for.id).toMatch(/(^|\.)henvisninger$/)
        const for_ = ved(x.for, sti) as Kildehenvisning[]
        const etter = ved(x.etter, sti) as Kildehenvisning[]
        expect(for_.some(lik(RETTELSE.fra)), `${x.for.id} ${sti}`).toBe(true)
        expect(etter, `${x.for.id} ${sti}`).toEqual(for_.flatMap((h) => (lik(RETTELSE.fra)(h) ? [...RETTELSE.til] : [h])))
      }
      expect(henvisninger(x.etter).some(lik(RETTELSE.fra)), x.for.id).toBe(false)
    }
  })

  it('beholder hele historikken og får stegene utkast og til faglig kontroll og så kontrollørens vurdering av nøyaktig den nye versjonen', () => {
    for (const x of RADER) {
      const h = x.etter.godkjenning.historikk
      expect(h.slice(0, -3), x.for.id).toEqual(x.for.godkjenning.historikk)
      const godkjent = GODKJENT.includes(x.for.id)
      expect(h.slice(-3), x.for.id).toMatchObject([
        { status: 'utkast', regelversjon: x.etter.versjon, dato: '2026-11-03', av: 'Claude Code', rolle: 'utvikler' },
        { status: 'til_faglig_kontroll', regelversjon: x.etter.versjon, dato: '2026-11-03', av: 'Claude Code', rolle: 'utvikler' },
        { status: godkjent ? 'klinisk_godkjent' : 'ikke_godkjent', regelversjon: x.etter.versjon, fingeravtrykk: fingeravtrykk(x.etter), dato: '2026-11-03', av: KONTROLLOR, rolle: 'uavhengig_kontrollor' },
      ])
      expect(h.at(-3)!.merknad, x.for.id).toContain(`Ellers uendret fra versjon ${x.for.versjon} (fingeravtrykk ${fingeravtrykk(x.for)}).`)
      expect(h.at(-1)!.merknad, x.for.id).toMatch(/^Kontrollørens gjennomgang av a38fac14 03\.11\.2026/)
      expect(x.etter.godkjenning.status, x.for.id).toBe(godkjent ? 'klinisk_godkjent' : 'ikke_godkjent')
    }
  })

  it('lar en regel uten faktumet være nøyaktig som den er, og stopper når faktumet står utenfor en liste over henvisninger', () => {
    const uten = FOR_RETTELSENE.flatMap((s) => s.regler).filter((r) => !BERORTE.includes(r.id))
    expect(uten.length).toBeGreaterThan(0)
    for (const r of uten) expect(rettRegel(r, RETTELSE), r.id).toBe(r)
    expect(rett(uten, FAKTUMRETTELSER)).toEqual(uten)
    const feil = structuredClone(RADER.find((x) => x.for.id === 'seponering-vortioksetin')!.for) as Regel & { ekstra?: Kildehenvisning }
    feil.ekstra = RETTELSE.fra
    expect(() => rettRegel(feil, RETTELSE)).toThrow(/står ikke i en liste over henvisninger/)
  })
})

describe('Kontrollørens vurdering (R1–R4)', () => {
  it('R1: nøyaktig de to nye versjonene er klinisk godkjent, med fingeravtrykket og avgrensningen kontrolløren ga', () => {
    expect(Object.keys(KONTROLL.godkjenning.regler)).toEqual(GODKJENT)
    expect(KONTROLL.godkjenning.regler).toMatchObject({
      'kryssnedtrapping-sertralin-mirtazapin': { versjon: 10, fingeravtrykk: '12801aa22a0ca2a576b9ba737d5d5cb52db3a73dc1b437bde7f20a896214c81a' },
      'seponering-vortioksetin': { versjon: 12, fingeravtrykk: 'b28dec93f5ede06c6565e1ce5d6aa62606c69250f1a9088dae0c57d3121101f3' },
    })
    expect(KONTROLL.godkjenning.regler['seponering-vortioksetin']!.avgrensning).toContain('bare én første reduksjon 20 → 15 mg/døgn, med minst 28 dager før ny symptomstyrt vurdering, hos voksne under 65 år')
    expect(KONTROLL.godkjenning.regler['kryssnedtrapping-sertralin-mirtazapin']!.avgrensning).toContain('Dette omfatter ikke videre 25 → 0, opptrapping av mirtazapin, andre doser, langtidsbehandling eller endret trinnlengde. Identisk klinisk omfang som v9.')
    expect([KONTROLL.godkjenning.av, KONTROLL.godkjenning.dato]).toEqual([KONTROLLOR, '2026-11-03'])
    expect(vedtaksfeil(REGELSETT.regler, KONTROLL.godkjenning)).toEqual([])
    expect(tilGodkjenning(RADER).map((x) => `${x.etter.id} v${x.etter.versjon}`)).toEqual(['kryssnedtrapping-sertralin-mirtazapin v10', 'seponering-vortioksetin v12'])
    for (const x of tilGodkjenning(RADER)) expect(erKliniskGodkjent(x.etter), x.etter.id).toBe(true)
  })

  it('R2: de 16 andre nye versjonene er kontrollert og ikke godkjent, for nøyaktig hver versjon og hvert fingeravtrykk', () => {
    const andre = RADER.filter((x) => !GODKJENT.includes(x.for.id))
    expect(andre).toHaveLength(16)
    expect(Object.keys(KONTROLL.disposisjon.regler).sort()).toEqual(andre.map((x) => x.etter.id).sort())
    for (const x of andre) {
      expect(KONTROLL.disposisjon.regler[x.etter.id], x.etter.id).toEqual({ versjon: x.etter.versjon, fingeravtrykk: fingeravtrykk(x.etter) })
      expect(kontrollutfall(x.etter), x.etter.id).toBe('ikke_godkjent')
      expect(erKliniskGodkjent(x.etter), x.etter.id).toBe(false)
    }
    expect(KONTROLL.disposisjon.merknad.beregnbar).toContain('den separate substanskontrollen som kreves før en senere aktivering, bortfaller ikke')
    expect(disposisjonsfeil(REGELSETT.regler, KONTROLL.disposisjon)).toEqual([])
  })

  it('de tidligere disposisjonene står i historikken og er ingen feil, men en regel endret uten registrert ny versjon er det', () => {
    expect(disposisjonsfeil(NEDTRAPPINGSSETT.regler, NEDTRAPPINGSDISPOSISJON)).toEqual([])
    expect(disposisjonsfeil(PILOTSETT.regler, PILOTDISPOSISJON)).toEqual([])
    const r = RADER.find((x) => x.for.id === 'seponering-amitriptylin')!.for
    expect(disposisjonsfeil([{ ...r, versjon: r.versjon + 1 }], NEDTRAPPINGSDISPOSISJON)).toContain(`seponering-amitriptylin: vurdert som versjon ${r.versjon}, men regelen er versjon ${r.versjon + 1}`)
  })

  it('en godkjenning registreres aldri for en annen versjon eller et annet innhold enn kontrolløren godkjente', () => {
    const ny = RADER.find((x) => x.for.id === 'seponering-vortioksetin')!.etter
    const tilKontroll: Regel = { ...ny, godkjenning: { status: 'til_faglig_kontroll', historikk: ny.godkjenning.historikk.slice(0, -1) } }
    expect(godkjenn([tilKontroll], KONTROLL.godkjenning)[0]!.godkjenning.status).toBe('klinisk_godkjent')
    const endret = { ...tilKontroll, tittel: `${tilKontroll.tittel} (endret)` }
    expect(godkjenn([endret], KONTROLL.godkjenning)[0]).toBe(endret)
    const annenVersjon = { ...tilKontroll, versjon: 13 }
    expect(godkjenn([annenVersjon], KONTROLL.godkjenning)[0]).toBe(annenVersjon)
    expect(vedtaksfeil([endret], KONTROLL.godkjenning)).toContain('seponering-vortioksetin: innholdet er endret etter godkjenningen (fingeravtrykket stemmer ikke)')
  })
})

describe('Kontrollgrunnlaget', () => {
  it('gir det samme utfallet i testmatrisen før og etter rettelsen, unntatt kasusene som prøver neste versjonsnummer', () => {
    const ulike = matrisesammenligning(RADER, uttrekkene).filter((x) => !x.lik)
    expect(ulike.map((x) => x.kasus.id)).toEqual(['V34', 'S18'])
    for (const x of ulike) {
      const tekst = (u: typeof x.for) => ('grunner' in u ? u.grunner.join(' ') : '')
      expect(tekst(x.etter).replace(/regelversjon (\d+), ikke versjon (\d+)/, (_: string, a: string, b: string) => `regelversjon ${Number(a) - 1}, ikke versjon ${Number(b) - 1}`), x.kasus.id).toBe(tekst(x.for))
    }
  })

  it('sammenligner hele teksten brukeren ser, og fører bare de forventede linjene tilbake', () => {
    const endringer = forventedeLinjeendringer(RADER)
    const planer = matrisesammenligning(RADER, uttrekkene).filter((x) => x.for.utfall === 'plan')
    expect(planer.length).toBeGreaterThan(0)
    const brukt = new Set<string>()
    for (const x of planer) {
      expect(x.lik, x.kasus.id).toBe(true)
      const for_ = x.for.tekst!.split('\n')
      const etter = x.etter.tekst!.split('\n')
      expect(etter.length, x.kasus.id).toBe(for_.length)
      const forventet = endringer.get(x.etter.resultat!.regel.id) ?? []
      // Hver linje som er ulik, er en av de forventede, og står med samme linje før rettelsen på samme plass.
      etter.forEach((l: string, i: number) => {
        if (l === for_[i]) return
        const e = forventet.find((f) => l === `- ${f.ny}`)
        expect(e, `${x.kasus.id}: ${l}`).toBeDefined()
        expect(for_[i], x.kasus.id).toBe(`- ${e!.for}`)
        brukt.add(e!.ny)
      })
    }
    // Hver forventet linjeendring forekommer faktisk, så ingen av dem skjuler noe den ikke trenger.
    expect([...endringer.values()].flat().map((e) => e.ny).filter((l) => !brukt.has(l))).toEqual([])
    // En endring utenfor de forventede linjene blir oppdaget, også i advarslene, kildene og versjonene.
    const x = planer.find((p) => endringer.has(p.etter.resultat!.regel.id))!
    for (const del of ['Advarsler:', 'Kilder:', 'Versjoner:']) {
      const endret = { ...x.etter, tekst: x.etter.tekst!.replace(`${del}\n- `, `${del}\n- endret `) }
      expect(endret.tekst, del).not.toBe(x.etter.tekst)
      expect(synlig(endret, endringer), del).not.toBe(synlig(x.for))
    }
  })

  it('er oppdatert, og sier at kontrollørens vurdering er registrert', () => {
    const tekst = les(RETTELSESKONTROLLFIL)
    expect(tekst, 'Kjør `npm run verktoy:regler -- rettelse`').toBe(lagRettelseskontroll(uttrekkene))
    expect(tekst).toContain('**Kontrollørens vurdering 03.11.2026 er registrert**')
    expect(tekst).not.toMatch(/psychiatrienet\.(nl|org|com)/i)
  })

  it('brukes bare av skriptet og testene, aldri av appen', () => {
    const filer = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? filer(join(dir, f)) : [join(dir, f)]))
    const src = new URL('../', import.meta.url).pathname
    const brukere = filer(src).filter((f) => !f.includes('__tests__') && /\.tsx?$/.test(f) && /from '[./]+(verktoy\/)?rettelseskontroll'/.test(readFileSync(f, 'utf8')))
    expect(brukere).toEqual([])
  })
})
