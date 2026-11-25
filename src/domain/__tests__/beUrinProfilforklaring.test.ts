/**
 * Forklaringen av vurderingen med fem utskillelsesprofiler (#576): den
 * stemmer med vurderingene for alle utfallene, sier hvordan det er tatt
 * hensyn til måleusikkerheten, og har ingen formler, parametere eller
 * merknader om ekstrapolasjon. Prøveverdiene er oppdiktede.
 */
import { describe, expect, it } from 'vitest'
import { tomBeUrinInndata, type BeUrinInndata, type BeUrinProve } from '../beUrinMotor'
import { beUrinForklaring, endringstekst } from '../beUrinProfilforklaring'
import { fortolkBeUrinProfiler, type BeUrinProfilresultat } from '../beUrinProfiler'
import { BE_URIN_KVALITATIV } from '../beUrinProfilvisning'
import { godkjentProfilmodell } from './hjelp/beUrinTestmodell'

const MODELL = godkjentProfilmodell()
const ENHET = MODELL.enheter.kvotient

const prove = (benzoylekgonin: number, dato: string): BeUrinProve => ({
  benzoylekgonin: String(benzoylekgonin),
  kreatinin: '1',
  dato,
})

function vurdering(inn: Partial<BeUrinInndata> & Pick<BeUrinInndata, 'forrige' | 'denne'>) {
  const r: BeUrinProfilresultat = fortolkBeUrinProfiler({ ...tomBeUrinInndata(MODELL), ...inn }, MODELL)
  if (r.type !== 'vurdering') throw new Error(`Ventet en vurdering, fikk: ${r.feil.join(' ')}`)
  return r
}

/** Forrige prøve 100 og denne 100 · ratio, ett døgn senere. */
const etterEttDogn = (ratio: number, margin = 0.9, tidligere: BeUrinProve[] = []) =>
  vurdering({ forrige: prove(100, '2026-01-02'), denne: prove(100 * ratio, '2026-01-03'), sikkerhetsmargin: margin, tidligere })

const forklaring = (r: ReturnType<typeof vurdering>, tidligere = 0) => beUrinForklaring(r, ENHET, tidligere)
const alt = (r: ReturnType<typeof vurdering>, tidligere = 0) => Object.values(forklaring(r, tidligere)).flat().join(' ')

/** Setningen i «Hvorfor blir konklusjonen slik?» som hører til hvert utfall. */
const SPORADISK_SLUTT = {
  forenlig_enkeltinntak: 'Dersom sporadisk bruk legges til grunn, kan et nytt inntak derfor ikke fastslås.',
  forenlig_gjentatte_doser: 'Dersom sporadisk bruk legges til grunn, kan et nytt inntak derfor ikke fastslås.',
  sannsynlig: 'Dersom sporadisk bruk legges til grunn, er et nytt inntak derfor sannsynlig.',
  nytt_inntak: 'Dersom sporadisk bruk legges til grunn, vurderes det derfor at et nytt inntak har skjedd.',
} as const
const KRONISK_SLUTT = {
  // «… kan imidlertid være så treg at …» etter en streng sporadisk vurdering, ellers «Heller ikke …».
  uavklart: /^(Ved kronisk bruk kan utskillelsen imidlertid være så treg at et nytt inntak ikke kan fastslås\.|Heller ikke dersom kronisk bruk legges til grunn, kan et nytt inntak fastslås\.)$/,
  uavklart_uvanlig: /ikke kan fastslås, siden endringen ikke ligger over ekstrem utskillelse\..*svært uvanlig\.$/,
  sannsynlig: /Dersom kronisk bruk legges til grunn, er et nytt inntak derfor sannsynlig\.$/,
  nytt_inntak: /Dersom kronisk bruk legges til grunn, vurderes det derfor at et nytt inntak har skjedd\.$/,
} as const

describe('forklaringen', () => {
  it('sier hvor stor endringen er, med kvotientene, datoene og døgnene', () => {
    const f = forklaring(etterEttDogn(0.8))
    expect(f.endring).toEqual([
      `Kvotienten er 100 ${ENHET} i forrige prøve (02.01.2026) og 80 ${ENHET} i denne prøven (03.01.2026), ` +
        '1 døgn senere. Det er en nedgang på 20 %.',
    ])
  })

  it('sier hvordan det er tatt hensyn til måleusikkerheten, med og uten margin', () => {
    const med = forklaring(etterEttDogn(0.8)).maleusikkerhet.join(' ')
    expect(med).toContain('Med 90 % sikkerhetsmargin legges en mer forsiktig endring til grunn')
    expect(med).toContain('tvilen kommer prøvegiver til gode')
    expect(med).toMatch(/Endringen som fortolkes, er en nedgang på \d+ %\./)
    const uten = forklaring(etterEttDogn(0.8, 0.5)).maleusikkerhet.join(' ')
    expect(uten).toContain('Uten sikkerhetsmargin tas det ikke hensyn til dette')
    expect(uten).not.toContain('Endringen som fortolkes')
  })

  it('sammenligner med alle fem profilene i «Hva kan forventes»', () => {
    const tekst = forklaring(etterEttDogn(0.8)).forventet.join(' ')
    for (const ord of ['enkeltinntak', 'gjentatte doser', 'moderat', 'treg', 'ekstrem']) expect(tekst).toContain(ord)
    expect(forklaring(etterEttDogn(0.8, 0.5)).forventet[1]).toMatch(/^Den målte endringen ligger /)
  })

  it.each([0.02, 0.1, 0.3, 0.5, 0.7, 0.8, 0.9, 1, 1.5, 3, 5, 20])(
    'stemmer med begge vurderingene ved ratio %s, med alle marginene',
    (ratio) => {
      for (const margin of [0.5, 0.9, 0.99]) {
        const r = etterEttDogn(ratio, margin)
        const [sporadisk, kronisk] = forklaring(r).hvorfor
        expect(sporadisk, `${ratio} ${margin}`).toContain(SPORADISK_SLUTT[r.sammenligning.sporadisk])
        expect(kronisk, `${ratio} ${margin}`).toMatch(KRONISK_SLUTT[r.sammenligning.kronisk])
        // Ingen av de andre utfallenes setninger.
        for (const [utfall, setning] of Object.entries(SPORADISK_SLUTT)) {
          if (setning !== SPORADISK_SLUTT[r.sammenligning.sporadisk]) expect(sporadisk, utfall).not.toContain(setning)
        }
      }
    },
  )

  it('skriver som i bestillingen når sporadisk gir nytt inntak og kronisk ikke kan fastslå det', () => {
    // 100 → 1,45 etter 14 døgn med 90 %: langt over gjentatte doser, men ikke over moderat utskillelse.
    const sterk = vurdering({ forrige: prove(100, '2026-01-02'), denne: prove(1.45, '2026-01-16'), sikkerhetsmargin: 0.9 })
    expect([sterk.sammenligning.sporadisk, sterk.sammenligning.kronisk]).toEqual(['nytt_inntak', 'uavklart'])
    expect(forklaring(sterk).hvorfor.slice(0, 2)).toEqual([
      'Selv etter at vi har tatt hensyn til måleusikkerheten, har kvotienten falt betydelig mindre enn det som ' +
        'forventes etter gjentatte doser innenfor et kort tidsrom. Dersom sporadisk bruk legges til grunn, vurderes ' +
        'det derfor at et nytt inntak har skjedd.',
      'Ved kronisk bruk kan utskillelsen imidlertid være så treg at et nytt inntak ikke kan fastslås.',
    ])
  })

  it('sier at kvotienten har økt, eller er uendret, når den ikke har falt', () => {
    expect(forklaring(etterEttDogn(1.5)).hvorfor[0]).toContain('har kvotienten økt, mens den forventes å falle')
    expect(forklaring(etterEttDogn(1, 0.5)).hvorfor[0]).toContain('er kvotienten uendret, mens den forventes å falle')
    expect(forklaring(etterEttDogn(1, 0.5)).endring[0]).toContain('Det er ingen endring.')
  })

  it('begynner med «Uten sikkerhetsmargin» uten margin', () => {
    expect(forklaring(etterEttDogn(0.8, 0.5)).hvorfor[0]).toMatch(/^Uten sikkerhetsmargin, /)
    expect(forklaring(etterEttDogn(0.05)).hvorfor[0]).toMatch(/^Når vi tar hensyn til måleusikkerheten, /)
  })

  describe('de tidligere prøvene', () => {
    // 100 → 80 etter ett døgn: uavklart, men uvanlig, så den samlede vurderingen er aktuell.
    const forrige = prove(100, '2026-01-02')
    const denne = prove(80, '2026-01-03')
    const med = (tidligere: BeUrinProve[]) => vurdering({ forrige, denne, sikkerhetsmargin: 0.5, tidligere })

    it('sier hvilken prøve det er indikasjon på nytt inntak etter, og at det ikke nødvendigvis er etter forrige', () => {
      const r = med([prove(40, '2025-12-25')])
      expect(r.samlet?.treff?.dato).toBe('2025-12-25')
      expect(forklaring(r, 1).hvorfor).toContain(
        'Sammenlignet med prøven fra 25.12.2025, 9 døgn før denne prøven, ligger endringen derimot over ekstrem ' +
          'utskillelse. Det er en indikasjon på nytt inntak etter den prøven, men ikke nødvendigvis etter forrige prøve.',
      )
    })

    it('sier fra når ingen tidligere prøve gir indikasjon', () => {
      expect(forklaring(med([prove(200, '2026-01-01')]), 1).hvorfor).toContain(
        'Heller ikke sammenlignet med de tidligere prøvene ligger endringen over ekstrem utskillelse.',
      )
    })

    it('sier hvorfor de ikke er brukt, når de ikke er aktuelle', () => {
      const r = etterEttDogn(0.05, 0.9, [prove(40, '2025-12-25')])
      expect(r.samlet).toBeNull()
      expect(alt(r, 1)).toContain('De tidligere prøvene er ikke brukt.')
      expect(alt(r, 0)).not.toContain('tidligere prøvene')
    })
  })

  it('slutter med at vurderingene er kvalitative, og at «Nytt inntak» ikke er et bevis', () => {
    expect(forklaring(etterEttDogn(0.8)).hvorfor.at(-1)).toBe(BE_URIN_KVALITATIV)
    expect(BE_URIN_KVALITATIV).toContain('ikke statistisk kalibrerte sannsynligheter')
    expect(BE_URIN_KVALITATIV).toContain('ikke et matematisk bevis')
  })

  it('sier ingenting om ekstrapolasjon når motoren faktisk har ekstrapolert', () => {
    // BE 300 / kreatinin 2 = Q 150, over startverdien til begge de bieksponentielle profilene.
    const r = vurdering({
      forrige: { benzoylekgonin: '300', kreatinin: '2', dato: '2026-01-01' },
      denne: { benzoylekgonin: '250', kreatinin: '2', dato: '2026-01-03' },
      sikkerhetsmargin: 0.9,
      tidligere: [{ benzoylekgonin: '400', kreatinin: '2', dato: '2025-12-20' }],
    })
    expect(r.forrige.q).toBe(150)
    expect(r.sammenligning.profiler.filter((p) => p.ekstrapolert).map((p) => p.rolle).sort()).toEqual(['ekstrem', 'treg'])
    expect(alt(r, 1)).not.toMatch(/ekstrapol|startverdi|ikke dokumentert/i)
  })

  it('har ingen formler, parametere, logaritmer, SD, regresjon eller ekstrapolasjon', () => {
    // Også svært lange tidsrom, der tersklene ekstrapoleres i modellen.
    const lang = vurdering({ forrige: prove(50, '2025-01-01'), denne: prove(50, '2026-01-01'), sikkerhetsmargin: 0.9 })
    for (const r of [etterEttDogn(0.05), etterEttDogn(0.8), etterEttDogn(20, 0.5), lang]) {
      const tekst = alt(r, 1)
      expect(tekst).not.toMatch(/ekstrapol|logaritm|\bln\b|\blog\b|\bSD\b|standardavvik|regresjon|parameter|e\^|exp|=|√|·/i)
      expect(tekst).not.toMatch(/\bF\b|\bR_|\bz\b/)
    }
  })
})

describe('endringen i ord', () => {
  it('gir nedgang, økning, ingen endring, og ingen prosent for svært store økninger', () => {
    expect(endringstekst(0.69)).toBe('en nedgang på 31 %')
    expect(endringstekst(1.2)).toBe('en økning på 20 %')
    expect(endringstekst(1)).toBe('ingen endring')
    expect(endringstekst(1e5)).toBe('en svært stor økning')
    expect(endringstekst(Infinity)).toBe('en svært stor økning')
  })
})
