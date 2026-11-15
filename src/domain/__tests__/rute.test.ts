import { describe, expect, it } from 'vitest'
import {
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
import { byggStoffregister } from '../stoffregister'
import { OUS_KATALOG, OUS_REGISTER } from '../ouskatalog'

describe('adressene til stoffsidene', () => {
  it('har stoffets nøkkel som den eneste identiteten', () => {
    expect(lesRute('#/stoff/bupropion', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'bupropion' })
    expect(lesRute('#/stoff/venlafaksin', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'venlafaksin' })
    expect(lesRute('#/stoff/amitriptylin', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'amitriptylin' })
    expect(lesRute('#/stoff/nortriptylin', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'nortriptylin' })
    expect(lesRute('#/stoff/paliperidon', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'paliperidon' })
    expect(lesRute('#/stoff/etanol', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'etanol' })
    expect(lesRute('#/stoff/thc', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'thc' })
    expect(stoffadresse('bupropion')).toBe('#/stoff/bupropion')
  })

  it('leser og skriver et sted på siden: en seksjon og et detaljkort i den', () => {
    expect(lesRute('#/stoff/bupropion/farmakokinetikk', OUS_REGISTER, OUS_KATALOG)).toEqual({
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
    expect(lesRute('#/stoff/nortriptylin/a/b/c', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'nortriptylin' })
    expect(lesRute('#/stoff/nortriptylin/%E0%A4%A', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'nortriptylin' })
  })

  it('fører et navn eller et alias til stoffets nøkkel, men aldri til en analytt', () => {
    expect(lesRute('#/stoff/Valproat', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'valproat' })
    expect(lesRute('#/stoff/%20Litium%20/', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'litium' })
    expect(lesRute('#/stoff/Hydroksybupropion', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'bupropion' })
    expect(lesRute('#/stoff/N-desmetyldiazepam/tdm', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'diazepam', sted: ['tdm'] })
    expect(lesRute('#/stoff/THC-syre', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'thc' })
    expect(lesRute('#/stoff/EtG', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'etanol' })
    // En side registeret ikke kjenner (laget i databasen), står med nøkkelen sin.
    expect(lesRute('#/stoff/nytt-stoff', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'nytt-stoff' })
    expect(lesRute('#/stoff/', OUS_REGISTER, OUS_KATALOG)).toEqual(FORTOLKNING)
    expect(lesRute('#/stoff/!!!', OUS_REGISTER, OUS_KATALOG)).toEqual(FORTOLKNING)
  })

  it('leser og skriver redigeringen av en fortolkning, under fortolkningssiden', () => {
    const rute = redigeringsrute('DIAZ · DMI · OXA')
    expect(rute).toEqual({ side: 'fortolkning', analytt: 'diaz-dmi-oxa', rediger: true })
    expect(adresse(rute)).toBe('#/fortolkning/diaz-dmi-oxa/rediger')
    expect(lesRute('#/fortolkning/diaz-dmi-oxa/rediger', OUS_REGISTER, OUS_KATALOG)).toEqual(rute)
    expect(lesRute('#/fortolkning/hbup/rediger/', OUS_REGISTER, OUS_KATALOG)).toEqual(redigeringsrute('HBUP'))
    expect(erRedigering(rute)).toBe(true)
    expect(erRedigering(fortolkningsrute('HBUP'))).toBe(false)
    expect(sammeRute(rute, fortolkningsrute('DIAZ · DMI · OXA'))).toBe(false)
    expect(kanoniskAdresse('#/fortolkning/hbup/rediger', OUS_REGISTER, OUS_KATALOG)).toBeNull()
    // Redigeringen kan peke på en del av reglene, og et detaljkort i den.
    const tilKort = { ...rute, sted: ['fortolkning-dmi', 'simulator'] }
    expect(adresse(tilKort)).toBe('#/fortolkning/diaz-dmi-oxa/rediger/fortolkning-dmi/simulator')
    expect(lesRute('#/fortolkning/diaz-dmi-oxa/rediger/fortolkning-dmi/simulator', OUS_REGISTER, OUS_KATALOG)).toEqual(tilKort)
    expect(lesRute('#/fortolkning/diaz-dmi-oxa/rediger/fortolkning-dmi/', OUS_REGISTER, OUS_KATALOG)).toEqual({ ...rute, sted: ['fortolkning-dmi'] })
    // Flere ledd enn siden har nivåer gir redigeringen uten sted.
    expect(lesRute('#/fortolkning/diaz-dmi-oxa/rediger/a/b/c', OUS_REGISTER, OUS_KATALOG)).toEqual(rute)
    // Noe annet etter nøkkelen er ingen side.
    expect(lesRute('#/fortolkning/hbup/annet', OUS_REGISTER, OUS_KATALOG)).toEqual(FORTOLKNING)
  })

  it('leser alt annet som fortolkningen', () => {
    for (const hash of ['', '#', '#/', '#/analytt/', '#/noe/annet', '#element-123', '#/analytt/%E0%A4%A']) {
      expect(lesRute(hash, OUS_REGISTER, OUS_KATALOG), hash).toEqual(FORTOLKNING)
    }
  })
})

describe('gamle adresser', () => {
  it('sender en gammel analyttadresse til stoffsiden koden primært er koblet til', () => {
    expect(lesRute('#/analytt/HBUP', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'bupropion' })
    expect(lesRute('#/analytt/hbup/farmakokinetikk', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'bupropion', sted: ['farmakokinetikk'] })
    expect(lesRute('#/analytt/VENSUM', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'venlafaksin' })
    expect(lesRute('#/analytt/AMTNORSUM', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'amitriptylin' })
    expect(lesRute('#/analytt/NOR', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'nortriptylin' })
    expect(lesRute('#/analytt/PALI', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'paliperidon' })
    expect(lesRute('#/analytt/DMI', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'diazepam' })
    expect(lesRute('#/analytt/OTRAM', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'tramadol' })
    expect(lesRute('#/analytt/UETS', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoff', stoff: 'etanol' })
  })

  it('sender seksjonen med reglene til fortolkningssiden, der reglene nå står', () => {
    expect(lesRute('#/analytt/IRCAK/fortolkning', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'fortolkning', analytt: 'ircak' })
    expect(lesRute('#/analytt/THC/fortolkning/simulator', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'fortolkning', analytt: 'thc' })
    expect(lesRute('#/analytt/DMI/fortolkning', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'fortolkning', analytt: 'diaz-dmi-oxa' })
    expect(lesRute('#/analytt/FINNESIKKE/fortolkning', OUS_REGISTER, OUS_KATALOG)).toEqual(FORTOLKNING)
  })

  it('later ikke som om en fagside finnes når koden ikke har noe primært stoff', () => {
    expect(lesRute('#/analytt/FINNESIKKE', OUS_REGISTER, OUS_KATALOG)).toEqual(FORTOLKNING)
    const utenKobling = byggStoffregister([], { stoffer: [], analyttkoblinger: [] })
    expect(lesRute('#/analytt/HBUP', utenKobling)).toEqual(FORTOLKNING)
    expect(kanoniskAdresse('#/analytt/HBUP', utenKobling)).toBeNull()
  })

  it('skriver adressefeltet om til den kanoniske adressen, og lar den kanoniske stå', () => {
    expect(kanoniskAdresse('#/analytt/HBUP', OUS_REGISTER, OUS_KATALOG)).toBe('#/stoff/bupropion')
    expect(kanoniskAdresse('#/analytt/HBUP/farmakokinetikk', OUS_REGISTER, OUS_KATALOG)).toBe('#/stoff/bupropion/farmakokinetikk')
    expect(kanoniskAdresse('#/analytt/IRCAK/fortolkning', OUS_REGISTER, OUS_KATALOG)).toBe('#/fortolkning/ircak')
    expect(kanoniskAdresse('#/stoff/Hydroksybupropion', OUS_REGISTER, OUS_KATALOG)).toBe('#/stoff/bupropion')
    expect(kanoniskAdresse('#/stoff/Valproat', OUS_REGISTER, OUS_KATALOG)).toBe('#/stoff/valproat')
    expect(kanoniskAdresse('#/stoff/bupropion', OUS_REGISTER, OUS_KATALOG)).toBeNull()
    expect(kanoniskAdresse('#/stoff/bupropion/', OUS_REGISTER, OUS_KATALOG)).toBeNull()
    expect(kanoniskAdresse('#/sok?q=hbup', OUS_REGISTER, OUS_KATALOG)).toBeNull()
    expect(kanoniskAdresse('#/', OUS_REGISTER, OUS_KATALOG)).toBeNull()
  })
})

describe('søkesiden', () => {
  it('leser og skriver søkesiden, med søket i adressen', () => {
    expect(lesRute('#/sok?q=kvetiapin', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'sok', q: 'kvetiapin' })
    expect(lesRute('#/sok', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'sok', q: '' })
    expect(lesRute('#/sok?q=', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'sok', q: '' })
    const rute = { side: 'sok', q: 'sertralin metabolisme & ø' } as const
    expect(adresse(rute)).toBe(sokeside(rute.q))
    expect(lesRute(adresse(rute))).toEqual(rute)
    expect(sammeRute(rute, { side: 'sok', q: 'noe annet' })).toBe(false)
    expect(adresse({ side: 'sok', q: '' })).toBe('#/sok')
    expect(adresse(FORTOLKNING)).toBe('#/')
  })
})

describe('stoffregisteret', () => {
  it('har sin egen adresse, og leses og skrives som det er', () => {
    expect(lesRute(STOFFREGISTERADRESSE)).toEqual({ side: 'stoffregister' })
    expect(lesRute('#/stoffregister/', OUS_REGISTER, OUS_KATALOG)).toEqual({ side: 'stoffregister' })
    expect(adresse({ side: 'stoffregister' })).toBe('#/stoffregister')
    expect(sammeRute({ side: 'stoffregister' }, FORTOLKNING)).toBe(false)
  })
})

describe('siden en rute står på', () => {
  it('er adressen uten stedet på siden og uten søket', () => {
    expect(sidesti(FORTOLKNING)).toBe('fortolkning')
    expect(sidesti(fortolkningsrute('HBUP'))).toBe('fortolkning/hbup')
    expect(sidesti(lesRute('#/fortolkning/hbup/rediger/fortolkning-dmi/simulator', OUS_REGISTER, OUS_KATALOG))).toBe('fortolkning/hbup/rediger')
    expect(sidesti(lesRute('#/stoff/bupropion/farmakokinetikk', OUS_REGISTER, OUS_KATALOG))).toBe('stoff/bupropion')
    expect(sidesti(lesRute(sokeside('kvetiapin')))).toBe('sok')
    expect(sidesti(lesRute(STOFFREGISTERADRESSE))).toBe('stoffregister')
  })
})
