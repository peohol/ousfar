/**
 * Rettelsen av faktumet `RCPSYCH.langvarig` etter kontrollørens vurdering
 * 03.11.2026 (`docs/verktøy-kildefunn-1-2.md` §8): de nye regelversjonene,
 * at bare faktumet er endret, at appen er uendret til kontrollørens vurdering
 * av dem er registrert, og kontrollgrunnlaget (`docs/verktøy-rettelse-langvarig.md`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { FAKTUMRETTELSER, RCPSYCH, RCPSYCH_TIDLIGERE } from '../verktoy/regler/bygg'
import { erKliniskGodkjent, fingeravtrykk, kanonisk } from '../verktoy/regler/godkjenning'
import { MAKS_FAKTUM } from '../verktoy/regler/kontroll'
import { henvisninger, type Kildehenvisning, type Regel } from '../verktoy/regler/modell'
import { rett, rettRegel } from '../verktoy/regler/rettelse'
import { forventedeLinjeendringer, lagRettelseskontroll, matrisesammenligning, RETTELSESKONTROLLFIL, rettelsesrader, synlig, tilGodkjenning } from '../verktoy/rettelseskontroll'
import { REGELSETT } from '../verktoy/tilgjengelighet'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekkene = { pilot: JSON.parse(les(FEST_PILOT)) as Festuttrekk, aksept: JSON.parse(les(FEST_AKSEPTTEST)) as Festuttrekk }
const regel = (id: string) => REGELSETT.regler.find((r) => r.id === id)!
const lik = (a: Kildehenvisning) => (b: Kildehenvisning) => kanonisk(a) === kanonisk(b)
const RETTELSE = FAKTUMRETTELSER[0]!
const RADER = rettelsesrader()

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

describe('Appen før kontrollørens vurdering er registrert', () => {
  it('bruker fortsatt versjonene som er godkjent eller vurdert, med faktumet slik det stod', () => {
    for (const r of REGELSETT.regler) {
      expect(henvisninger(r).some(lik(RCPSYCH.langvarig)), r.id).toBe(false)
      expect(henvisninger(r).some(lik(RCPSYCH.proporsjonal)), r.id).toBe(false)
    }
    expect(REGELSETT.regler.filter((r) => henvisninger(r).some(lik(RETTELSE.fra))).map((r) => r.id).sort()).toEqual([...BERORTE].sort())
    expect(erKliniskGodkjent(regel('seponering-vortioksetin'))).toBe(true)
    expect(erKliniskGodkjent(regel('kryssnedtrapping-sertralin-mirtazapin'))).toBe(true)
  })
})

describe('De nye versjonene', () => {
  it('er nøyaktig de 18 reglene som viser til faktumet, hver med versjonen økt med én', () => {
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

  it('beholder hele historikken og får stegene utkast og til faglig kontroll for den nye versjonen, uten godkjenning', () => {
    for (const x of RADER) {
      const h = x.etter.godkjenning.historikk
      expect(h.slice(0, -2), x.for.id).toEqual(x.for.godkjenning.historikk)
      expect(h.slice(-2), x.for.id).toMatchObject([
        { status: 'utkast', regelversjon: x.etter.versjon, dato: '2026-11-03', av: 'Claude Code', rolle: 'utvikler' },
        { status: 'til_faglig_kontroll', regelversjon: x.etter.versjon, dato: '2026-11-03', av: 'Claude Code', rolle: 'utvikler' },
      ])
      expect(h.at(-2)!.merknad, x.for.id).toContain(`Ellers uendret fra versjon ${x.for.versjon} (fingeravtrykk ${fingeravtrykk(x.for)}).`)
      expect(x.etter.godkjenning.status, x.for.id).toBe('til_faglig_kontroll')
      expect(erKliniskGodkjent(x.etter), x.for.id).toBe(false)
    }
  })

  it('lar en regel uten faktumet være nøyaktig som den er, og stopper når faktumet står utenfor en liste over henvisninger', () => {
    const uten = REGELSETT.regler.filter((r) => !BERORTE.includes(r.id))
    expect(uten.length).toBeGreaterThan(0)
    for (const r of uten) expect(rettRegel(r, RETTELSE), r.id).toBe(r)
    expect(rett(uten, FAKTUMRETTELSER)).toEqual(uten)
    const feil = structuredClone(regel('seponering-vortioksetin')) as Regel & { ekstra?: Kildehenvisning }
    feil.ekstra = RETTELSE.fra
    expect(() => rettRegel(feil, RETTELSE)).toThrow(/står ikke i en liste over henvisninger/)
  })
})

describe('Kontrollgrunnlaget', () => {
  it('ber om ny godkjenning av nøyaktig de to godkjente reglene', () => {
    expect(tilGodkjenning(RADER).map((x) => `${x.etter.id} v${x.etter.versjon}`)).toEqual(['kryssnedtrapping-sertralin-mirtazapin v10', 'seponering-vortioksetin v12'])
  })

  it('gir det samme utfallet i testmatrisen med de nye versjonene, unntatt kasusene som prøver neste versjonsnummer', () => {
    const ulike = matrisesammenligning(RADER, uttrekkene).filter((x) => !x.lik)
    expect(ulike.map((x) => x.kasus.id)).toEqual(['V34', 'S18'])
    for (const x of ulike) {
      const tekst = (u: typeof x.i_dag) => ('grunner' in u ? u.grunner.join(' ') : '')
      expect(tekst(x.ny_versjon).replace(/regelversjon (\d+), ikke versjon (\d+)/, (_, a, b) => `regelversjon ${Number(a) - 1}, ikke versjon ${Number(b) - 1}`), x.kasus.id).toBe(tekst(x.i_dag))
    }
  })

  it('sammenligner hele teksten brukeren ser, og fører bare de forventede linjene tilbake', () => {
    const endringer = forventedeLinjeendringer(RADER)
    const planer = matrisesammenligning(RADER, uttrekkene).filter((x) => x.i_dag.utfall === 'plan')
    expect(planer.length).toBeGreaterThan(0)
    const brukt = new Set<string>()
    for (const x of planer) {
      expect(x.lik, x.kasus.id).toBe(true)
      const i_dag = x.i_dag.tekst!.split('\n')
      const ny = x.ny_versjon.tekst!.split('\n')
      expect(ny.length, x.kasus.id).toBe(i_dag.length)
      const forventet = endringer.get(x.ny_versjon.resultat!.regel.id) ?? []
      // Hver linje som er ulik, er en av de forventede, og står med samme linje i dag på samme plass.
      ny.forEach((l, i) => {
        if (l === i_dag[i]) return
        const e = forventet.find((f) => l === `- ${f.ny}`)
        expect(e, `${x.kasus.id}: ${l}`).toBeDefined()
        expect(i_dag[i], x.kasus.id).toBe(`- ${e!.i_dag}`)
        brukt.add(e!.ny)
      })
    }
    // Hver forventet linjeendring forekommer faktisk, så ingen av dem skjuler noe den ikke trenger.
    expect([...endringer.values()].flat().map((e) => e.ny).filter((l) => !brukt.has(l))).toEqual([])
    // En endring utenfor de forventede linjene blir oppdaget, også i advarslene, kildene og versjonene.
    const x = planer.find((p) => endringer.has(p.ny_versjon.resultat!.regel.id))!
    for (const del of ['Advarsler:', 'Kilder:', 'Versjoner:']) {
      const endret = { ...x.ny_versjon, tekst: x.ny_versjon.tekst!.replace(`${del}\n- `, `${del}\n- endret `) }
      expect(endret.tekst, del).not.toBe(x.ny_versjon.tekst)
      expect(synlig(endret, endringer), del).not.toBe(synlig(x.i_dag))
    }
  })

  it('er oppdatert, og sier at appen er uendret og at ingen godkjenning er registrert', () => {
    const tekst = les(RETTELSESKONTROLLFIL)
    expect(tekst, 'Kjør `npm run verktoy:regler -- rettelse`').toBe(lagRettelseskontroll(uttrekkene))
    expect(tekst).toContain('**Appen er uendret.**')
    expect(tekst).toContain('Ingen godkjenning er registrert.')
    expect(tekst).not.toMatch(/psychiatrienet\.(nl|org|com)/i)
  })

  it('brukes bare av skriptet og testene, aldri av appen', () => {
    const filer = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? filer(join(dir, f)) : [join(dir, f)]))
    const src = new URL('../', import.meta.url).pathname
    const brukere = filer(src).filter((f) => !f.includes('__tests__') && /\.tsx?$/.test(f) && /from '[./]+(verktoy\/)?rettelseskontroll'/.test(readFileSync(f, 'utf8')))
    expect(brukere).toEqual([])
  })
})
