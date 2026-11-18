/**
 * Brukerens oppsett av panelene på forsiden (`src/forside/moduler.ts`): det
 * lagrede leses slik at ukjente og manglende paneler aldri velter forsiden,
 * og endringene i «Tilpass forsiden» er rene funksjoner.
 */
import { describe, expect, it } from 'vitest'
import { erStandard, flytt, lesOppsett, MODULREKKEFOLGE, settSynlig, STANDARDOPPSETT, synligeModuler } from '../forside/moduler'

describe('Forsideoppsett', () => {
  it('har de fire standardpanelene på og de valgfrie av, i fast rekkefølge', () => {
    expect(synligeModuler(STANDARDOPPSETT)).toEqual(['viktig_nytt', 'aktuelt', 'grupper', 'fagsider'])
    expect(STANDARDOPPSETT.map((v) => v.modul)).toEqual(MODULREKKEFOLGE)
    expect(erStandard(STANDARDOPPSETT)).toBe(true)
  })

  it('bruker standarden uten noe lagret, eller med feil form', () => {
    for (const lagret of [null, undefined, 'tekst', 3, { viktig_nytt: true }]) expect(lesOppsett(lagret)).toBe(STANDARDOPPSETT)
  })

  it('hopper over ukjente paneler, dobbeltføringer og valg med feil form', () => {
    const oppsett = lesOppsett([
      { modul: 'grupper', synlig: true },
      { modul: 'nylig_besokt', synlig: true },
      { modul: 'toString', synlig: true },
      { modul: 'grupper', synlig: false },
      { modul: 'aktuelt', synlig: 'ja' },
      null,
      'viktig_nytt',
      { modul: 'favoritter', synlig: true },
    ])
    expect(oppsett.slice(0, 2)).toEqual([
      { modul: 'grupper', synlig: true },
      { modul: 'favoritter', synlig: true },
    ])
    expect(new Set(oppsett.map((v) => v.modul))).toEqual(new Set(MODULREKKEFOLGE))
    expect(oppsett).toHaveLength(MODULREKKEFOLGE.length)
  })

  it('legger paneler som mangler nederst og skjult, så brukerens egne valg står', () => {
    const oppsett = lesOppsett([
      { modul: 'fagsider', synlig: true },
      { modul: 'viktig_nytt', synlig: false },
    ])
    expect(synligeModuler(oppsett)).toEqual(['fagsider'])
    expect(oppsett.slice(2).every((v) => !v.synlig)).toBe(true)
    expect(oppsett.slice(2).map((v) => v.modul)).toEqual(MODULREKKEFOLGE.filter((m) => m !== 'fagsider' && m !== 'viktig_nytt'))
  })

  it('skrur paneler av og på, og flytter dem ett steg om gangen', () => {
    const uten = settSynlig(STANDARDOPPSETT, 'aktuelt', false)
    expect(synligeModuler(uten)).toEqual(['viktig_nytt', 'grupper', 'fagsider'])
    expect(erStandard(uten)).toBe(false)

    const opp = flytt(STANDARDOPPSETT, 'grupper', -1)
    expect(synligeModuler(opp)).toEqual(['viktig_nytt', 'grupper', 'aktuelt', 'fagsider'])
    expect(flytt(opp, 'grupper', 1)).toEqual(STANDARDOPPSETT)
    // Ytterst står panelet stille.
    expect(flytt(STANDARDOPPSETT, 'viktig_nytt', -1)).toBe(STANDARDOPPSETT)
    expect(flytt(STANDARDOPPSETT, 'favoritter', 1)).toBe(STANDARDOPPSETT)
  })
})
