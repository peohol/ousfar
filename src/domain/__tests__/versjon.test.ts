/**
 * Holder endringsloggen i form.
 *
 * Føringene skrives for hånd, én per endring, og feil i dem er lette å gjøre
 * og vanskelige å se: en dato på feil form, et merke som er stavet
 * annerledes, et område som ikke finnes. Testen fanger dem her i stedet for
 * hos brukeren, så protokollen i `docs/endringslogg.md` ikke må leses på nytt
 * for å kontrollere arbeidet. Versjonene til de nye endringene beregnes
 * (`versjonering.test.ts`); her kontrolleres at hele loggen, gammel og ny,
 * henger sammen.
 */
import { STOFFREGISTER } from '../stoffregister'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { hentHeleLoggen } from '../../data/endringslogg'
import { berorer, HELE_APPEN, VINDUER } from '../../oppdatering/sider'
import { FORTOLKNINGSOPPFORINGER } from '../ouskatalog'
import {
  FORSIDE,
  FORTOLKNING,
  fortolkningsrute,
  KALENDERFANER,
  lesRute,
  redigeringsrute,
  sidesti,
  sokeside,
  STOFFREGISTERADRESSE,
  type Rute,
} from '../rute'
import { VERKTOY } from '../../verktoy/register'
import {
  endringsomrader,
  ENDRINGSTYPER,
  formaterDato,
  lesVersjon,
  nyesteVersjon,
  oppdateringsversjon,
  OMFANG,
  sammenlignVersjon,
  varsles,
  varslesIBjella,
  type Endring,
} from '../versjon'

/** Hele loggen, slik byggingen delte den i sider. */
const ENDRINGSLOGG = await hentHeleLoggen()

describe('formaterDato', () => {
  it('gir dd.mm.åååå', () => {
    expect(formaterDato('2026-08-17')).toBe('17.08.2026')
  })

  it('beholder de innledende nullene i ensifret dag og måned', () => {
    expect(formaterDato('2026-01-05')).toBe('05.01.2026')
  })

  it('nekter datoer som ikke er på ISO-form', () => {
    expect(() => formaterDato('17.08.2026')).toThrow()
    expect(() => formaterDato('2026-8-17')).toThrow()
  })
})

describe('sammenlignVersjon', () => {
  it('teller MAJOR foran MINOR foran PATCH', () => {
    expect(sammenlignVersjon('1.0.0', '0.9.9')).toBeGreaterThan(0)
    expect(sammenlignVersjon('0.5.1', '0.5.0')).toBeGreaterThan(0)
    expect(sammenlignVersjon('0.5.0', '0.6.0')).toBeLessThan(0)
    expect(sammenlignVersjon('1.2.3', '1.2.3')).toBe(0)
  })

  // Nettopp her ville en ren tekstsammenligning tatt feil: «0.10.0» kommer
  // før «0.9.0» alfabetisk, men er den nyere versjonen.
  it('leser tallene som tall, ikke som tekst', () => {
    expect(sammenlignVersjon('0.10.0', '0.9.0')).toBeGreaterThan(0)
  })

  it('nekter versjoner som ikke er MAJOR.MINOR.PATCH', () => {
    expect(lesVersjon('1.0')).toBeNull()
    expect(lesVersjon('v1.0.0')).toBeNull()
    expect(() => sammenlignVersjon('1.0', '1.0.0')).toThrow()
  })
})

describe('nyesteVersjon', () => {
  it('er den øverste føringen', () => {
    expect(nyesteVersjon(ENDRINGSLOGG)).toBe(ENDRINGSLOGG[0]?.versjon)
  })

  it('sier fra i stedet for å gjette når loggen er tom', () => {
    expect(() => nyesteVersjon([])).toThrow()
  })
})

describe('oppdateringsversjon', () => {
  const foring = (versjon: string, ekstra: Partial<Endring> = {}): Endring => ({
    id: versjon,
    versjon,
    dato: '2026-09-30',
    sammendrag: 'x',
    typer: ['Funksjonalitet'],
    omfang: 'Mindre omfang',
    punkter: ['x'],
    ...ekstra,
  })

  it('er den nyeste føringen som varsles, forbi dem uten varsel', () => {
    expect(oppdateringsversjon([foring('1.2.1', { utenVarsel: true }), foring('1.2.0')])).toBe('1.2.0')
    expect(oppdateringsversjon([foring('1.3.0'), foring('1.2.1', { utenVarsel: true })])).toBe('1.3.0')
  })

  it('tar med en endring i fortolkningen selv om den står uten varsel', () => {
    expect(oppdateringsversjon([foring('1.2.1', { utenVarsel: true, endrerFortolkning: true }), foring('1.2.0')])).toBe(
      '1.2.1',
    )
  })

  it('finnes for loggen slik den står', () => {
    expect(() => oppdateringsversjon(ENDRINGSLOGG)).not.toThrow()
  })
})

describe('varsler i bjella', () => {
  const endring = (ekstra: Partial<Endring> = {}): Endring => ({
    id: '2.0.0',
    versjon: '2.0.0',
    dato: '2026-10-23',
    sammendrag: 'Endring',
    typer: ['Funksjonalitet'],
    omfang: 'Mindre omfang',
    punkter: ['Endret'],
    ...ekstra,
  })

  it('varsler ikke om ordinære endringer, selv når de krever oppdatering', () => {
    expect(varsles(endring())).toBe(true)
    expect(varslesIBjella(endring())).toBe(false)
    expect(oppdateringsversjon([endring()])).toBe('2.0.0')
  })

  it('krever eksplisitt klinisk viktighet for funksjonsvarsler', () => {
    expect(varslesIBjella(endring({ varsleFunksjonsendring: true }))).toBe(true)
    expect(varslesIBjella(endring({ varsleFunksjonsendring: true, utenVarsel: true }))).toBe(false)
  })

  it('beholder obligatoriske faglige varsler selv ved utenVarsel', () => {
    expect(varslesIBjella(endring({ endrerFortolkning: true, utenVarsel: true }))).toBe(true)
    expect(varslesIBjella(endring({ kritiskFagligVarsel: true, utenVarsel: true }))).toBe(true)
    expect(varsles(endring({ kritiskFagligVarsel: true, utenVarsel: true }))).toBe(true)
    expect(oppdateringsversjon([endring({ kritiskFagligVarsel: true, utenVarsel: true })])).toBe('2.0.0')
  })
})

describe('endringsomrader', () => {
  const foring = (versjon: string, ekstra: Partial<Endring> = {}): Endring => ({
    id: versjon,
    versjon,
    dato: '2026-09-30',
    sammendrag: 'x',
    typer: ['Funksjonalitet'],
    omfang: 'Mindre omfang',
    punkter: ['x'],
    ...ekstra,
  })

  it('er de nyeste føringene som varsles, nyest først, med sidene de gjelder', () => {
    const logg = [
      foring('1.3.0', { gjelder: ['stoff'] }),
      foring('1.2.1', { utenVarsel: true }),
      foring('1.2.0'),
      foring('1.1.0', { gjelder: ['sok'] }),
    ]
    expect(endringsomrader(logg)).toEqual([
      { versjon: '1.3.0', gjelder: ['stoff'] },
      { versjon: '1.2.0' },
      { versjon: '1.1.0', gjelder: ['sok'] },
    ])
    expect(endringsomrader(logg, 2).map((e) => e.versjon)).toEqual(['1.3.0', '1.2.0'])
  })
})

/** Den første versjonen der hver føring som varsles, må si hvilke sider den gjelder. */
const FORSTE_MED_OMRADER = '1.91.0'

/** Alle sidene i appen, slik områdene skrives (`sidesti`). */
const ALLE_SIDER = [
  FORSIDE,
  FORTOLKNING,
  ...FORTOLKNINGSOPPFORINGER.flatMap((a) => [fortolkningsrute(a.kode), redigeringsrute(a.kode)]),
  ...STOFFREGISTER.stoffer.map((s): Rute => ({ side: 'stoff', stoff: s.slug })),
  // Versjonene og kurateringsgrenene har adresser som ikke kan listes opp på
  // forhånd; ett eksempel på hver er nok til å kjenne igjen områdene.
  { side: 'versjon', stoff: STOFFREGISTER.stoffer[0]!.slug, nr: 1 } satisfies Rute,
  { side: 'kuratering', gren: '00000000-0000-4000-8000-000000000000' } satisfies Rute,
  // Det samme for gruppene og endringsforslagene.
  { side: 'grupper' } satisfies Rute,
  { side: 'grupper', gruppe: '00000000-0000-4000-8000-000000000000' } satisfies Rute,
  { side: 'forslag' } satisfies Rute,
  { side: 'forslag', forslag: '00000000-0000-4000-8000-000000000000' } satisfies Rute,
  lesRute(sokeside('')),
  lesRute(STOFFREGISTERADRESSE),
  { side: 'verktoy' } satisfies Rute,
  ...VERKTOY.map((v): Rute => ({ side: 'verktoy', verktoy: v.id })),
  // Personalkalenderen og fanene i den (`KALENDERFANER`).
  { side: 'kalender' } satisfies Rute,
  ...KALENDERFANER.map((fane): Rute => ({ side: 'kalender', fane })),
].map(sidesti)

/**
 * Om området er et område appen kjenner: hele appen, vinduene, eller en eller
 * flere sider som finnes. Et område med en skrivefeil ville aldri berørt noen
 * side, og brukerne ville ikke blitt bedt om å oppdatere når de skulle.
 */
function kjentOmrade(omrade: string): boolean {
  return omrade === HELE_APPEN || omrade === VINDUER || ALLE_SIDER.some((side) => berorer(omrade, side, false))
}

describe('områdene en føring gjelder', () => {
  it('kjennes igjen når de er sider, og ikke ellers', () => {
    const kjente = ['hele appen', 'vinduer', 'forside', 'fortolkning', 'fortolkning/hbup', 'fortolkning/*/rediger', 'stoff', 'versjon', 'kuratering', 'grupper', 'forslag']
    for (const omrade of [...kjente, 'stoff/bupropion', 'sok', 'stoffregister', 'verktoy', 'verktoy/bytte-antidepressiv', 'kalender', 'kalender/medarbeidere']) {
      expect(kjentOmrade(omrade), omrade).toBe(true)
    }
    const ukjente = ['alt', 'kalender/finnes-ikke', 'stoff/finnes-ikke', 'verktoy/finnes-ikke', 'fortolkning/xyz', 'sok/kvetiapin', 'fortolkning/hbup/endre']
    for (const omrade of [...ukjente, 'stoff/bupropion/farmakokinetikk', '']) {
      expect(kjentOmrade(omrade), omrade).toBe(false)
    }
  })

  it.each(ENDRINGSLOGG.filter((e) => e.gjelder).map((e) => [e.versjon, e] as const))(
    '%s gjelder sider som finnes',
    (_v, endring) => {
      expect(endring.gjelder?.length, 'tom liste: bruk utenVarsel for en endring ingen merker').toBeGreaterThan(0)
      for (const omrade of endring.gjelder ?? []) expect(kjentOmrade(omrade), omrade).toBe(true)
    },
  )

  it(`er med i hver føring som varsles fra ${FORSTE_MED_OMRADER}`, () => {
    const uten = ENDRINGSLOGG.filter(
      (e) => sammenlignVersjon(e.versjon, FORSTE_MED_OMRADER) >= 0 && varsles(e) && !e.gjelder,
    ).map((e) => e.versjon)
    expect(uten, 'sett `gjelder` etter docs/endringslogg.md').toEqual([])
  })
})

describe('endringsloggen', () => {
  it('har minst én føring', () => {
    expect(ENDRINGSLOGG.length).toBeGreaterThan(0)
  })

  it('står nyest først, med strengt synkende versjoner', () => {
    for (let i = 1; i < ENDRINGSLOGG.length; i++) {
      const nyere = ENDRINGSLOGG[i - 1] as Endring
      const eldre = ENDRINGSLOGG[i] as Endring
      expect(
        sammenlignVersjon(nyere.versjon, eldre.versjon),
        `${nyere.versjon} skal være nyere enn ${eldre.versjon}`,
      ).toBeGreaterThan(0)
    }
  })

  it('bruker hver versjon bare én gang', () => {
    const versjoner = ENDRINGSLOGG.map((e) => e.versjon)
    expect(new Set(versjoner).size).toBe(versjoner.length)
  })

  it('har en ID per føring, og ingen ID er en annen føringens versjon', () => {
    const ider = ENDRINGSLOGG.map((e) => e.id)
    expect(new Set(ider).size).toBe(ider.length)
    const versjoner = new Set(ENDRINGSLOGG.map((e) => e.versjon))
    for (const e of ENDRINGSLOGG) if (e.id !== e.versjon) expect(versjoner.has(e.id), e.id).toBe(false)
  })

  it('går ikke framover i tid nedover i lista', () => {
    for (let i = 1; i < ENDRINGSLOGG.length; i++) {
      const nyere = ENDRINGSLOGG[i - 1] as Endring
      const eldre = ENDRINGSLOGG[i] as Endring
      // ISO-datoer sorterer riktig som tekst.
      expect(
        nyere.dato >= eldre.dato,
        `${nyere.versjon} (${nyere.dato}) kan ikke være eldre enn ${eldre.versjon} (${eldre.dato})`,
      ).toBe(true)
    }
  })

  it.each(ENDRINGSLOGG.map((e) => [e.versjon, e] as const))('%s er fullstendig', (_v, endring) => {
    expect(lesVersjon(endring.versjon), 'versjonen må være MAJOR.MINOR.PATCH').not.toBeNull()

    // Datoen skal både være på riktig form og finnes i kalenderen.
    expect(() => formaterDato(endring.dato)).not.toThrow()
    expect(new Date(`${endring.dato}T00:00:00Z`).toISOString().slice(0, 10)).toBe(endring.dato)

    expect(endring.sammendrag.trim()).not.toBe('')
    expect(endring.punkter.length).toBeGreaterThan(0)
    endring.punkter.forEach((punkt) => expect(punkt.trim()).not.toBe(''))

    expect(endring.typer.length).toBeGreaterThan(0)
    expect(new Set(endring.typer).size).toBe(endring.typer.length)
    endring.typer.forEach((type) => expect(ENDRINGSTYPER).toContain(type))

    expect(OMFANG).toContain(endring.omfang)
  })
})

/**
 * Versjonen brukerne ser, beregnes fra endringsloggen når appen bygges. Den
 * tekniske pakkeversjonen er en fast, intern verdi, så en PR aldri trenger å
 * endre `package.json` eller låsefila bare for å føre en ny versjon, og to
 * PR-er ikke møtes der.
 */
const PAKKEVERSJON = '0.0.0'

describe('package.json', () => {
  it('har den faste, interne pakkeversjonen, ikke appens versjon', () => {
    const sti = fileURLToPath(new URL('../../../package.json', import.meta.url))
    const pakke = JSON.parse(readFileSync(sti, 'utf8')) as { version?: string }
    expect(pakke.version, 'versjonen føres ikke her lenger (docs/endringslogg.md)').toBe(PAKKEVERSJON)
  })

  it('har den samme i låsefila', () => {
    const sti = fileURLToPath(new URL('../../../package-lock.json', import.meta.url))
    const laas = JSON.parse(readFileSync(sti, 'utf8')) as {
      version?: string
      packages?: Record<string, { version?: string }>
    }
    expect(laas.version).toBe(PAKKEVERSJON)
    expect(laas.packages?.['']?.version).toBe(PAKKEVERSJON)
  })
})
