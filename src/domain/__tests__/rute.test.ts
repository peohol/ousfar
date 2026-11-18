import { describe, expect, it } from 'vitest'
import {
  FORSIDE,
  FORTOLKNING,
  STOFFREGISTERADRESSE,
  adresse,
  erRedigering,
  fortolkningsrute,
  kanoniskAdresse,
  lesRute,
  redigeringsrute,
  sammeRute,
  sidesti,
  sokeside,
  stoffadresse,
} from '../rute'
import { STOFFREGISTER } from '../stoffregister'
import { OUS_KATALOG } from '../ouskatalog'

describe('adressene til stoffsidene', () => {
  it('har stoffets nøkkel som den eneste identiteten', () => {
    expect(lesRute('#/stoff/bupropion', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'bupropion' })
    expect(lesRute('#/stoff/venlafaksin', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'venlafaksin' })
    expect(lesRute('#/stoff/amitriptylin', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'amitriptylin' })
    expect(lesRute('#/stoff/nortriptylin', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'nortriptylin' })
    expect(lesRute('#/stoff/paliperidon', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'paliperidon' })
    expect(lesRute('#/stoff/etanol', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'etanol' })
    expect(lesRute('#/stoff/thc', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'thc' })
    expect(stoffadresse('bupropion')).toBe('#/stoff/bupropion')
  })

  it('leser og skriver et sted på siden: en seksjon og et detaljkort i den', () => {
    expect(lesRute('#/stoff/bupropion/farmakokinetikk', STOFFREGISTER, OUS_KATALOG)).toEqual({
      side: 'stoff',
      stoff: 'bupropion',
      sted: ['farmakokinetikk'],
    })
    const rute = { side: 'stoff', stoff: 'nortriptylin', sted: ['farmakokinetikk', 'kort 1/ø'] } as const
    expect(adresse(rute)).toBe('#/stoff/nortriptylin/farmakokinetikk/kort%201%2F%C3%B8')
    expect(lesRute(adresse(rute))).toEqual(rute)
    // Et annet sted er en annen adresse til den samme siden.
    expect(sammeRute(rute, { side: 'stoff', stoff: 'nortriptylin' })).toBe(false)
  })

  it('åpner siden uten sted når stedet ikke kan leses eller har for mange nivåer', () => {
    expect(lesRute('#/stoff/nortriptylin/a/b/c', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'nortriptylin' })
    expect(lesRute('#/stoff/nortriptylin/%E0%A4%A', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'nortriptylin' })
  })

  it('fører et navn eller et alias til stoffets nøkkel, men aldri til en analytt', () => {
    expect(lesRute('#/stoff/Valproat', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'valproat' })
    expect(lesRute('#/stoff/%20Litium%20/', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'litium' })
    expect(lesRute('#/stoff/Hydroksybupropion', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'bupropion' })
    expect(lesRute('#/stoff/N-desmetyldiazepam/tdm', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'diazepam', sted: ['tdm'] })
    expect(lesRute('#/stoff/THC-syre', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'thc' })
    expect(lesRute('#/stoff/EtG', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'etanol' })
    // En side registeret ikke kjenner (laget i databasen), står med nøkkelen sin.
    expect(lesRute('#/stoff/nytt-stoff', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'nytt-stoff' })
    expect(lesRute('#/stoff/', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'ukjent', adresse: '#/stoff/' })
    expect(lesRute('#/stoff/!!!', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'ukjent', adresse: '#/stoff/!!!' })
  })

  it('leser og skriver redigeringen av en fortolkning, under fortolkningssiden', () => {
    const rute = redigeringsrute('DIAZ · DMI · OXA')
    expect(rute).toEqual({ side: 'fortolkning', analytt: 'diaz-dmi-oxa', rediger: true })
    expect(adresse(rute)).toBe('#/fortolkning/diaz-dmi-oxa/rediger')
    expect(lesRute('#/fortolkning/diaz-dmi-oxa/rediger', STOFFREGISTER, OUS_KATALOG)).toEqual(rute)
    expect(lesRute('#/fortolkning/hbup/rediger/', STOFFREGISTER, OUS_KATALOG)).toEqual(redigeringsrute('HBUP'))
    expect(erRedigering(rute)).toBe(true)
    expect(erRedigering(fortolkningsrute('HBUP'))).toBe(false)
    expect(sammeRute(rute, fortolkningsrute('DIAZ · DMI · OXA'))).toBe(false)
    expect(kanoniskAdresse('#/fortolkning/hbup/rediger', STOFFREGISTER, OUS_KATALOG)).toBeNull()
    // Redigeringen kan peke på en del av reglene, og et detaljkort i den.
    const tilKort = { ...rute, sted: ['fortolkning-dmi', 'simulator'] }
    expect(adresse(tilKort)).toBe('#/fortolkning/diaz-dmi-oxa/rediger/fortolkning-dmi/simulator')
    expect(lesRute('#/fortolkning/diaz-dmi-oxa/rediger/fortolkning-dmi/simulator', STOFFREGISTER, OUS_KATALOG)).toEqual(tilKort)
    expect(lesRute('#/fortolkning/diaz-dmi-oxa/rediger/fortolkning-dmi/', STOFFREGISTER, OUS_KATALOG)).toEqual({ ...rute, sted: ['fortolkning-dmi'] })
    // Flere ledd enn siden har nivåer gir redigeringen uten sted.
    expect(lesRute('#/fortolkning/diaz-dmi-oxa/rediger/a/b/c', STOFFREGISTER, OUS_KATALOG)).toEqual(rute)
    // Noe annet etter nøkkelen er ingen side.
    expect(lesRute('#/fortolkning/hbup/annet', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'ukjent', adresse: '#/fortolkning/hbup/annet' })
  })

  it('åpner på forsiden, også fra et anker som ikke er en side', () => {
    for (const hash of ['', '#', '#/', '#element-123']) {
      expect(lesRute(hash, STOFFREGISTER, OUS_KATALOG), hash).toEqual(FORSIDE)
    }
    expect(adresse(FORSIDE)).toBe('#/')
    expect(sidesti(FORSIDE)).toBe('forside')
  })

  it('har fortolkningssøket på sin egen adresse', () => {
    expect(lesRute('#/fortolkning', STOFFREGISTER, OUS_KATALOG)).toEqual(FORTOLKNING)
    expect(lesRute('#/fortolkning/', STOFFREGISTER, OUS_KATALOG)).toEqual(FORTOLKNING)
    expect(adresse(FORTOLKNING)).toBe('#/fortolkning')
    expect(fortolkningsrute()).toEqual(FORTOLKNING)
    expect(sammeRute(FORSIDE, FORTOLKNING)).toBe(false)
  })

  it('tolker aldri en ukjent adresse som fortolkningen eller forsiden, og lar adressen stå', () => {
    for (const hash of ['#/analytt/', '#/noe/annet', '#/analytt/%E0%A4%A', '#/grupper/ikke-en-id', '#/fortolkningx']) {
      const rute = lesRute(hash, STOFFREGISTER, OUS_KATALOG)
      expect(rute, hash).toEqual({ side: 'ukjent', adresse: hash })
      expect(adresse(rute), hash).toBe(hash)
      expect(sidesti(rute), hash).toBe('ukjent')
    }
  })
})

describe('gamle adresser', () => {
  it('sender en gammel analyttadresse til fortolkningen av koden, aldri til en fagside', () => {
    // Fortolkningen og fagsidene er adskilte domener (docs/domener.md).
    expect(lesRute('#/analytt/HBUP', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'fortolkning', analytt: 'hbup' })
    expect(lesRute('#/analytt/hbup/farmakokinetikk', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'fortolkning', analytt: 'hbup' })
    expect(lesRute('#/analytt/IRCAK/fortolkning', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'fortolkning', analytt: 'ircak' })
    expect(lesRute('#/analytt/THC/fortolkning/simulator', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'fortolkning', analytt: 'thc' })
    expect(lesRute('#/analytt/DMI', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'fortolkning', analytt: 'diaz-dmi-oxa' })
    expect(lesRute('#/analytt/DMI/fortolkning', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'fortolkning', analytt: 'diaz-dmi-oxa' })
  })

  it('åpner fortolkningen for en kode katalogen ikke kjenner', () => {
    expect(lesRute('#/analytt/FINNESIKKE', STOFFREGISTER, OUS_KATALOG)).toEqual(FORTOLKNING)
    expect(lesRute('#/analytt/FINNESIKKE/fortolkning', STOFFREGISTER, OUS_KATALOG)).toEqual(FORTOLKNING)
    // Uten katalog (et fagmiljø uten egne analyser) blir det også fortolkningen.
    expect(lesRute('#/analytt/HBUP', STOFFREGISTER)).toEqual(FORTOLKNING)
  })

  it('skriver adressefeltet om til den kanoniske adressen, og lar den kanoniske stå', () => {
    expect(kanoniskAdresse('#/analytt/HBUP', STOFFREGISTER, OUS_KATALOG)).toBe('#/fortolkning/hbup')
    expect(kanoniskAdresse('#/analytt/HBUP/farmakokinetikk', STOFFREGISTER, OUS_KATALOG)).toBe('#/fortolkning/hbup')
    expect(kanoniskAdresse('#/analytt/IRCAK/fortolkning', STOFFREGISTER, OUS_KATALOG)).toBe('#/fortolkning/ircak')
    expect(kanoniskAdresse('#/stoff/Hydroksybupropion', STOFFREGISTER, OUS_KATALOG)).toBe('#/stoff/bupropion')
    expect(kanoniskAdresse('#/stoff/Valproat', STOFFREGISTER, OUS_KATALOG)).toBe('#/stoff/valproat')
    expect(kanoniskAdresse('#/stoff/bupropion', STOFFREGISTER, OUS_KATALOG)).toBeNull()
    expect(kanoniskAdresse('#/stoff/bupropion/', STOFFREGISTER, OUS_KATALOG)).toBeNull()
    expect(kanoniskAdresse('#/sok?q=hbup', STOFFREGISTER, OUS_KATALOG)).toBeNull()
    expect(kanoniskAdresse('#/', STOFFREGISTER, OUS_KATALOG)).toBeNull()
  })
})

describe('søkesiden', () => {
  it('leser og skriver søkesiden, med søket i adressen', () => {
    expect(lesRute('#/sok?q=kvetiapin', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'sok', q: 'kvetiapin' })
    expect(lesRute('#/sok', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'sok', q: '' })
    expect(lesRute('#/sok?q=', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'sok', q: '' })
    const rute = { side: 'sok', q: 'sertralin metabolisme & ø' } as const
    expect(adresse(rute)).toBe(sokeside(rute.q))
    expect(lesRute(adresse(rute))).toEqual(rute)
    expect(sammeRute(rute, { side: 'sok', q: 'noe annet' })).toBe(false)
    expect(adresse({ side: 'sok', q: '' })).toBe('#/sok')
  })
})

describe('stoffregisteret', () => {
  it('har sin egen adresse, og leses og skrives som det er', () => {
    expect(lesRute(STOFFREGISTERADRESSE)).toEqual({ side: 'stoffregister' })
    expect(lesRute('#/stoffregister/', STOFFREGISTER, OUS_KATALOG)).toEqual({ side: 'stoffregister' })
    expect(adresse({ side: 'stoffregister' })).toBe('#/stoffregister')
    expect(sammeRute({ side: 'stoffregister' }, FORTOLKNING)).toBe(false)
  })
})

describe('siden en rute står på', () => {
  it('er adressen uten stedet på siden og uten søket', () => {
    expect(sidesti(FORTOLKNING)).toBe('fortolkning')
    expect(sidesti(fortolkningsrute('HBUP'))).toBe('fortolkning/hbup')
    expect(sidesti(lesRute('#/fortolkning/hbup/rediger/fortolkning-dmi/simulator', STOFFREGISTER, OUS_KATALOG))).toBe('fortolkning/hbup/rediger')
    expect(sidesti(lesRute('#/stoff/bupropion/farmakokinetikk', STOFFREGISTER, OUS_KATALOG))).toBe('stoff/bupropion')
    expect(sidesti(lesRute(sokeside('kvetiapin')))).toBe('sok')
    expect(sidesti(lesRute(STOFFREGISTERADRESSE))).toBe('stoffregister')
  })
})
