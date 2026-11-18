import { describe, expect, it } from 'vitest'
import { menyanalytter } from '../analysemetoder'
import {
  analytterForFortolkning,
  byggKatalog,
  fortolkningsadresseForAnalytt,
  lesKatalogdata,
  referanseomraderI,
  UgyldigKatalog,
} from '../analyttkatalog'
import { ANALYTTKATALOG, FORTOLKNINGSOPPFORINGER, OUS_KATALOGDATA } from '../ouskatalog'
import { search } from '../search'

/**
 * Laboratorieanalyttene fortolkningen kjenner. De er ikke fagsider og peker
 * ikke på noen: fortolkningen og fagsidene er adskilte domener
 * (`docs/domener.md`).
 */
const katalog = ANALYTTKATALOG

describe('laboratorieanalyttene', () => {
  it('har én analytt per kode appen kan fortolke, og ingen andre', () => {
    const koder = FORTOLKNINGSOPPFORINGER.flatMap((a) => menyanalytter(a).map((o) => o.kode))
    expect(katalog.oppforinger.map((o) => o.kode).sort()).toEqual([...koder].sort())
    expect(new Set(koder).size).toBe(koder.length)
  })

  it('gir hver kode gyldig for databasen', () => {
    // Samme regel som laboratorieanalytter_kode i migrasjonen.
    for (const { kode } of katalog.oppforinger) expect(kode).toMatch(/^[A-Z0-9]+([._-][A-Z0-9]+)*$/)
  })

  it('gir en sumanalyse alle stoffene den måler', () => {
    const amt = katalog.finn('amtnorsum')!
    expect(amt.navn).toBe('Amitriptylin + nortriptylin')
    expect(amt.komponenter).toEqual(['Amitriptylin', 'Nortriptylin'])
    expect(katalog.finn('HBUP')!.komponenter).toEqual(['Hydroksybupropion'])
  })

  it('deler modulene opp i én analytt per kode, som fortolker i modulen', () => {
    for (const kode of ['DIAZ', 'DMI', 'OXA']) {
      const o = katalog.finn(kode)!
      expect(o.komponenter).toEqual([o.navn])
      expect(o.fortolkning.kode).toBe('DIAZ · DMI · OXA')
    }
    expect(katalog.finn('UETS')!.fortolkning).toBe(katalog.finn('UETGS')!.fortolkning)
  })

  it('har ingen sideidentitet og ingen vei til fagsidene: ingen sidenavn, stoff, forbindelse eller datakort', () => {
    for (const o of katalog.oppforinger) {
      expect(Object.keys(o).sort()).toEqual([
        'analysemetode',
        'fortolkning',
        'kategori',
        'kode',
        'komponenter',
        'navn',
        'referanseomrade',
      ])
    }
  })

  it('peker fortolkningen på den samme oppføringen som søket gir', () => {
    for (const o of katalog.oppforinger) {
      const treff = search(o.kode, FORTOLKNINGSOPPFORINGER).map((h) => h.analyte)
      expect(treff, o.kode).toContain(o.fortolkning)
    }
  })

  it('finner ingenting for en ukjent kode', () => {
    expect(katalog.finn('FINNESIKKE')).toBeUndefined()
  })
})

describe('fortolkningssidene', () => {
  it('gir hver kode i en fortolkningsmodul, og fortolkningssiden reglene for en kode står på', () => {
    const koder = (kode: string) => analytterForFortolkning(katalog.finn(kode)!.fortolkning, katalog).map((a) => a.kode)
    expect(koder('HBUP')).toEqual(['HBUP'])
    expect(koder('DMI')).toEqual(['DIAZ', 'DMI', 'OXA'])
    expect(koder('IRCAK')).toEqual(['IRCAK'])
    expect(fortolkningsadresseForAnalytt('hbup', katalog)).toBe('#/fortolkning/hbup')
    expect(fortolkningsadresseForAnalytt('DMI', katalog)).toBe('#/fortolkning/diaz-dmi-oxa')
    expect(fortolkningsadresseForAnalytt('IRCAK', katalog)).toBe('#/fortolkning/ircak')
    expect(fortolkningsadresseForAnalytt('FINNESIKKE', katalog)).toBeUndefined()
  })
})

describe('referanseområdet i katalogen', () => {
  /** Svaret databasen gir, med disse referanseområdene på kodene og `null` på de andre. */
  const svar = (perKode: Record<string, unknown>) => ({
    ...OUS_KATALOGDATA,
    oppforinger: OUS_KATALOGDATA.oppforinger.map((o) => ({
      ...o,
      koder: o.koder.map(({ kode, navn }) => ({ kode, navn, referanseomrade: perKode[kode] ?? null })),
    })),
  })

  /**
   * Svaret fra en database der migrasjonen ikke er kjørt: kodene uten
   * `referanseomrade`, med forbindelsen og datakortene, og koblingene.
   */
  const fraFor = {
    ...OUS_KATALOGDATA,
    oppforinger: OUS_KATALOGDATA.oppforinger.map((o) => ({
      ...o,
      koder: o.koder.map(({ kode, navn }) => ({
        kode,
        navn,
        forbindelse: { DMI: 'nordiazepam', OTRAM: 'o-desmetyltramadol' }[kode] ?? null,
        datakort: { DMI: 'forbindelse', OTRAM: 'forbindelse', NOR: 'egne', TRAM: 'egne', DIAZ: 'egne' }[kode] ?? null,
      })),
    })),
    koblinger: [
      { kode: 'NOR', stoff: 'nortriptylin', relasjon: 'moderstoff', primar: true, merknad: null },
      { kode: 'AMTNORSUM', stoff: 'nortriptylin', relasjon: 'sum', primar: false, merknad: null },
      { kode: 'TRAM', stoff: 'tramadol', relasjon: 'moderstoff', primar: true, merknad: null },
      { kode: 'OTRAM', stoff: 'tramadol', relasjon: 'metabolitt', primar: true, merknad: null },
      { kode: 'DIAZ', stoff: 'diazepam', relasjon: 'moderstoff', primar: true, merknad: null },
      { kode: 'DMI', stoff: 'diazepam', relasjon: 'metabolitt', primar: true, merknad: null },
      { kode: 'HBUP', stoff: 'bupropion', relasjon: 'metabolitt', primar: true, merknad: null },
    ],
  }

  it('er fagmiljøets eget, per kode, og står for koden alene', () => {
    const k = byggKatalog(lesKatalogdata(svar({ NOR: { nedre: 200, ovre: 600, enhet: 'nmol/L' }, DMI: { nedre: null, ovre: 1500, enhet: '' } })))
    expect(k.finn('NOR')!.referanseomrade).toEqual({ nedre: 200, ovre: 600, enhet: 'nmol/L' })
    expect(k.finn('DMI')!.referanseomrade).toEqual({ nedre: null, ovre: 1500, enhet: '' })
    // DIAZ deler modul med DMI, men har ikke områdets tall.
    expect(k.finn('DIAZ')!.referanseomrade).toBeNull()
    expect([...referanseomraderI(k)]).toEqual([
      ['NOR', { nedre: 200, ovre: 600, enhet: 'nmol/L' }],
      ['DMI', { nedre: null, ovre: 1500, enhet: '' }],
    ])
    expect(k.eldre).toBeUndefined()
  })

  it('er tomt for et område uten grenser', () => {
    const k = byggKatalog(lesKatalogdata(svar({ NOR: { nedre: null, ovre: null, enhet: 'nmol/L' } })))
    expect(k.finn('NOR')!.referanseomrade).toBeNull()
    expect(k.finn('HBUP')!.referanseomrade).toBeNull()
    expect(referanseomraderI(k).size).toBe(0)
  })

  it('avviser hele katalogen når et referanseområde ikke har formen', () => {
    expect(() => lesKatalogdata(svar({ NOR: { nedre: '200', ovre: 600, enhet: 'nmol/L' } }))).toThrow(UgyldigKatalog)
    expect(() => lesKatalogdata(svar({ NOR: [200, 600] }))).toThrow(UgyldigKatalog)
  })

  it('godtar og overser koblingene, forbindelsene og datakortene databasen gir appen fra før', () => {
    const k = byggKatalog(lesKatalogdata({ ...svar({}), koblinger: fraFor.koblinger }))
    expect(Object.keys(k)).not.toContain('koblinger')
    expect(k.eldre).toBeUndefined()
    expect(k.finn('HBUP')!.fortolkning.kode).toBe('HBUP')
  })

  it('gir i et svar uten områdene kortet hver kode brukte på fagsidene, for overgangen', () => {
    const k = byggKatalog(lesKatalogdata(fraFor))
    expect(referanseomraderI(k).size).toBe(0)
    expect(k.eldre!.bruk).toEqual([
      { kode: 'NOR', stoff: 'nortriptylin', gjelder: null },
      { kode: 'TRAM', stoff: 'tramadol', gjelder: null },
      { kode: 'OTRAM', stoff: 'tramadol', gjelder: 'o-desmetyltramadol' },
      { kode: 'DIAZ', stoff: 'diazepam', gjelder: null },
      { kode: 'DMI', stoff: 'diazepam', gjelder: 'nordiazepam' },
    ])
    expect([...k.eldre!.forbindelser]).toEqual(
      expect.arrayContaining([
        ['OTRAM', 'o-desmetyltramadol'],
        ['DMI', 'nordiazepam'],
      ]),
    )
  })
})
