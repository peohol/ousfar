/**
 * Regelen som holder innloggingsveggen på plass, prøvd ut.
 *
 * `scripts/kontroller-vegg.mjs` er den varige grensen: den avgjør ved hver
 * bygging hva som får utleveres uten innlogging. Derfor skal den selv være
 * kontrollert — og særlig at den feiler lukket, slik at en modul ingen har
 * tenkt på havner innenfor og ikke utenfor.
 */
import { describe, expect, it } from 'vitest'
// @ts-expect-error - byggeskriptet er vanlig JavaScript uten typer.
import { APNE_MODULER, kontroller, LABORATORIEDATA, statiskeKliniskeImporter } from '../../scripts/kontroller-vegg.mjs'
import { STATISKE_RESSURSER } from './data/ressurskatalog'

const KLINISK = 'klinisk-abc123.js'
const APEN = 'index-abc123.js'

/** En åpen pakke satt sammen av de modulene som oppgis. */
function pakke(kilder: string[], innhold = '') {
  return { navn: APEN, kilder: kilder.map((k) => `../../${k}`), innhold }
}

function kjor(apne: ReturnType<typeof pakke>[], beskyttede = [KLINISK]) {
  return kontroller({ beskyttede, apne }).feil as string[]
}

/** Alt som er ført opp som åpent, så bare det som prøves ut skiller seg ut. */
const ALLE_APNE = [...(APNE_MODULER as Map<string, string>).keys()]

describe('egen kode utenfor veggen', () => {
  it('slipper gjennom det som er ført opp som åpent', () => {
    expect(kjor([pakke(ALLE_APNE)])).toEqual([])
  })

  it('stanser en modul som ikke er ført opp, uansett hvor den ligger', () => {
    for (const ny of [
      'src/components/ThcForklaring.tsx',
      'src/hooks/useKommentarflyt.ts',
      'src/nyttOmrade/hvasomhelst.ts',
      'supabase/functions/_delt/noeannet.ts',
    ]) {
      const feil = kjor([pakke([...ALLE_APNE, ny])])
      expect(feil).toHaveLength(1)
      expect(feil[0]).toContain(ny)
    }
  })

  it('stanser en ny modul selv om den ikke inneholder klinisk tekst', () => {
    // Tekstsporene er en ekstra skanse, ikke regelen. Regelen er listen.
    expect(kjor([pakke([...ALLE_APNE, 'src/components/Nykomling.tsx'], 'helt nøytral tekst')]))
      .toHaveLength(1)
  })

  it('bryr seg ikke om moduler hentet inn utenfra', () => {
    expect(kjor([pakke([...ALLE_APNE, 'node_modules/react/index.js'])])).toEqual([])
  })
})

describe('når noe annet er galt med delingen', () => {
  it('feiler når kildekartet mangler, i stedet for å si at veggen står', () => {
    const feil = kjor([{ navn: APEN, kilder: null, innhold: '' } as never])
    expect(feil).toHaveLength(1)
    expect(feil[0]).toContain('Mangler kildekart')
  })

  it('feiler når den kliniske pakken ikke er der', () => {
    expect(kjor([pakke(ALLE_APNE)], []).join(' ')).toContain('0 kliniske pakker')
  })

  it('feiler på klinisk tekst i en åpen pakke', () => {
    const feil = kjor([pakke(ALLE_APNE, 'noe om Referanseområde her')])
    expect(feil).toHaveLength(1)
    expect(feil[0]).toContain('Referanseområde')
  })

  it('sier fra om en oppføring som ikke lenger trengs', () => {
    const feil = kjor([pakke(ALLE_APNE.filter((s) => s !== 'src/auth/bilde.ts'))])
    expect(feil).toHaveLength(1)
    expect(feil[0]).toContain('src/auth/bilde.ts')
  })
})

describe('sidene som hentes når de vises (P1)', () => {
  it('godtar flere kliniske pakker, én for hver side', () => {
    expect(kjor([pakke(ALLE_APNE)], [KLINISK, 'klinisk-Stoffside-def456.js', 'klinisk-Verktoyside-0_9-x.js'])).toEqual([])
  })

  it('lar en åpen pakke hente den kliniske når appen skal vises', () => {
    const innhold = 'const App=()=>import("./klinisk-abc123.js");p(()=>import("./klinisk-App-x.js"),["assets/klinisk-App-x.js"])'
    expect(kjor([pakke(ALLE_APNE, innhold)])).toEqual([])
  })

  it('stanser en åpen pakke som krever en klinisk for å kjøre', () => {
    for (const innhold of [
      'import{a as b}from"./klinisk-abc123.js";',
      'import"./klinisk-abc123.js";',
      'import * as k from "./klinisk-abc123.js"',
      'export{x}from"./klinisk-abc123.js"',
    ]) {
      const feil = kjor([pakke(ALLE_APNE, innhold)])
      expect(feil, innhold).toEqual([`${APEN} krever ${KLINISK} for å kjøre, men den ligger bak veggen.`])
    }
  })

  it('skiller importene en pakke krever, fra dem den henter senere', () => {
    expect(statiskeKliniskeImporter('import{a}from"./klinisk-a.js";const b=()=>import("./klinisk-b.js");import"./riktekst-c.js"')).toEqual(['klinisk-a.js'])
  })
})

describe('listen over åpne moduler', () => {
  it('gir en grunn for hver oppføring', () => {
    for (const [sti, grunn] of APNE_MODULER as Map<string, string>) {
      expect(grunn, sti).toMatch(/\S/)
    }
  })
})

describe('laboratoriets data', () => {
  const data = [...(LABORATORIEDATA as Map<string, string>).keys()]

  it('stanser analyttkatalogen til OUS også bak veggen', () => {
    for (const sti of data) {
      const feil = kontroller({
        beskyttede: [KLINISK],
        beskyttedeKilder: [{ navn: KLINISK, kilder: [`../../${sti}`], innhold: '' }],
        apne: [pakke(ALLE_APNE)],
      }).feil as string[]
      expect(feil, sti).toEqual([expect.stringContaining(`${sti} ligger i ${KLINISK}`)])
    }
  })

  it('dekker hver lokale datafil og hver modul som bygger på dem (P4c)', () => {
    const lokaleFiler = Object.entries(STATISKE_RESSURSER)
      .filter(([sti, k]) => k.rekkevidde === 'lokal' && /^src\/data\/[^/]+\.json$/.test(sti))
      .map(([sti]) => sti)
    expect(lokaleFiler.filter((sti) => !data.includes(sti))).toEqual([])
    expect(data).toEqual(expect.arrayContaining(['src/domain/ouskatalog.ts', 'src/domain/analytes.ts']))
  })
})
