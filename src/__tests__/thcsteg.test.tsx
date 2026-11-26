// @vitest-environment jsdom
/**
 * Fortolkningsmodulen for THC-syre med reglene og tekstene fra Supabase,
 * prøvd i en nettleser i minnet: mens de hentes, når de ikke kan brukes, og
 * når de er der. At motoren gir det samme som den opprinnelige modulen for
 * alle innstillinger, prøves i `thcParitet.test.ts` og
 * `fortolkningUendret.test.ts`; her prøves det at modulen faktisk bruker
 * reglene den får.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ThcStep, type ThcStepProps } from '../components/ThcStep'
import { TipsLag } from '../components/Tips'
import { fortolkThc, lagThcModell, tomThcInndata, type ThcInndata, type ThcModell, type ThcRegler } from '../domain/thcMotor'
import type { ThcRegelsett } from '../domain/thcRegelsett'
import type { ThcTekster } from '../domain/thcTekster'
import { thcReglerFra } from '../faginnhold/thcregler'
import { ShortcutVisibilityProvider } from '../hooks/useShortcutVisibility'
import { formaterProsent } from '../domain/thcPlot'
import { THC_SAMLET_UTEN_TREFF, THC_VENTER, marginvalg } from '../domain/thcVisning'
import { marginbeskrivelse, marginbobler } from './hjelp/marginbobler'
import { medPekerhendelser, trykkPaaValg } from './hjelp/pekerhendelser'
import { THC_MODELL, THC_REGELSETT, THC_TEKSTER, thcRegelsettutgave } from './hjelp/thcgrunnlag'
import { THC_ANALYTT } from '../domain/ouskatalog'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= function () {}
  window.scrollBy = () => {}
  medPekerhendelser()
})

afterEach(cleanup)

function visSteg(regler: ThcRegler, visualisering?: ThcStepProps['visualisering']) {
  const copy = vi.fn(async (_tekst: string) => true)
  render(
    <TipsLag>
      <ShortcutVisibilityProvider>
        <ThcStep analyte={THC_ANALYTT} regler={regler} onBack={vi.fn()} copy={copy} flashAt={vi.fn()} visualisering={visualisering} />
      </ShortcutVisibilityProvider>
    </TipsLag>,
  )
  return copy
}

function modell(regler: ThcRegelsett = THC_REGELSETT, tekster: ThcTekster = THC_TEKSTER): ThcModell {
  const m = lagThcModell(regler, tekster)
  if (!m.ok) throw new Error(m.feil.join('\n'))
  return m.modell
}

const gruppe = (navn: string) => within(screen.getByRole('group', { name: navn }))

/** Fyller inn forrige og denne prøven: IRCAK og prøvedato. */
async function fyllInn(
  user: ReturnType<typeof userEvent.setup>,
  { forrige, denne }: { forrige: [string, string]; denne: [string, string] },
) {
  await user.type(gruppe('Forrige prøve').getByRole('textbox', { name: 'IRCAK' }), forrige[0])
  await user.type(gruppe('Forrige prøve').getByLabelText('Prøvedato'), forrige[1])
  await user.type(gruppe('Denne prøven').getByRole('textbox', { name: 'IRCAK' }), denne[0])
  await user.type(gruppe('Denne prøven').getByLabelText('Prøvedato'), denne[1])
}

/** Kommentaren motoren gir for et skjema med endringene, som skal stå på skjermen. */
function kommentarFor(endring: Partial<ThcInndata>, m: ThcModell = THC_MODELL) {
  const r = fortolkThc({ ...tomThcInndata(m.regler), ...endring }, m)
  if (r.type !== 'kommentar') throw new Error('Tilfellet skal gi en kommentar.')
  return r
}

describe('fortolkningsmodulen for THC-syre', () => {
  it('sier fra mens reglene hentes, og har ingenting å kopiere', () => {
    visSteg({ status: 'laster' })
    expect(screen.getByRole('status').textContent).toBe('Fortolkningsreglene hentes …')
    expect(screen.getByRole('heading', { name: 'THC-syre i urin' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Kopier/ })).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('sier hvorfor når reglene ikke kan brukes, og lar brukeren prøve igjen', async () => {
    const user = userEvent.setup()
    const provIgjen = vi.fn()
    visSteg({ status: 'feil', melding: 'Fortolkningsreglene kunne ikke hentes. Nede.', provIgjen })
    expect(screen.getByRole('alert').textContent).toBe('Fortolkningsreglene kunne ikke hentes. Nede.')
    expect(screen.queryByRole('button', { name: /Kopier/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }))
    expect(provIgjen).toHaveBeenCalledOnce()
  })

  it('fortolker med de publiserte reglene og kopierer kommentaren motoren gir', async () => {
    const user = userEvent.setup()
    const copy = visSteg({ status: 'klar', modell: THC_MODELL })
    await fyllInn(user, { forrige: ['120', '2026-02-01'], denne: ['80', '2026-02-08'] })

    const forventet = kommentarFor({ forrigeVerdi: '120', forrigeDato: '2026-02-01', aktuellVerdi: '80', aktuellDato: '2026-02-08' })
    expect(screen.getByText(forventet.kommentar)).toBeTruthy()
    // Profilene med figuren står alltid åpne, uten overskrift, og forklaringen lukket under (#586, #592).
    expect(screen.queryByText('Utskillelsesprofiler og figur')).toBeNull()
    expect(document.querySelector('.be-profiler .thc-plot__figur')!.closest('details')).toBeNull()
    expect(screen.getByText('Forklaring').closest('details')!.open).toBe(false)
    // Ingen overskrifter, bannere eller paneler rundt kommentaren.
    expect(screen.queryByText('Kommentar')).toBeNull()
    expect(screen.queryByText('Visualisering')).toBeNull()
    expect(document.querySelector('.notis')).toBeNull()

    // Kopieringsknappen står rett under kommentaren.
    const knapp = screen.getByRole('button', { name: /Kopier kommentar/ })
    expect(screen.getByText(forventet.kommentar).nextElementSibling?.contains(knapp)).toBe(true)
    await user.click(knapp)
    expect(copy).toHaveBeenCalledWith(forventet.kommentar)
  })

  it('viser ingen liste over det som mangler, bare feilen ved feltet og det som gjelder flere felt', async () => {
    const user = userEvent.setup()
    visSteg({ status: 'klar', modell: THC_MODELL })
    // Tomt skjema: en stille linje, ingen liste og ingen kopiering.
    expect(screen.getByText(THC_VENTER)).toBeTruthy()
    expect(document.querySelector('.mangelliste')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByRole('button', { name: /Kopier kommentar/ })).toBeNull()

    // IRCAK 0 i denne prøven er ugyldig og sies ved feltet; i forrige prøve er 0 gyldig.
    const denne = gruppe('Denne prøven').getByRole('textbox', { name: 'IRCAK' })
    await user.type(denne, '0')
    expect(denne.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(denne.getAttribute('aria-describedby')!)!.textContent).toBe('Må være over 0.')
    await user.type(gruppe('Forrige prøve').getByRole('textbox', { name: 'IRCAK' }), '0')
    expect(gruppe('Forrige prøve').getByRole('textbox', { name: 'IRCAK' }).getAttribute('aria-invalid')).toBeNull()
    expect(screen.getByText(THC_VENTER)).toBeTruthy()

    // Datoer i feil rekkefølge gjelder to felt, og sies der kommentaren ellers står.
    await user.clear(denne)
    await user.type(denne, '5')
    await user.type(gruppe('Forrige prøve').getByLabelText('Prøvedato'), '2026-02-08')
    await user.type(gruppe('Denne prøven').getByLabelText('Prøvedato'), '2026-02-01')
    expect(screen.getByRole('alert').textContent).toBe('Denne prøven kan ikke være tatt før forrige prøve.')
    expect(screen.queryByText(THC_VENTER)).toBeNull()
  })

  it('gir kommentaren motoren gir for hver margin som trykkes på bryteren, og kopierer med mellomrom der', async () => {
    const user = userEvent.setup()
    const copy = visSteg({ status: 'klar', modell: THC_MODELL })
    const inn = { forrigeVerdi: '120', forrigeDato: '2026-02-01', aktuellVerdi: '95', aktuellDato: '2026-02-04' }
    await fyllInn(user, { forrige: ['120', '2026-02-01'], denne: ['95', '2026-02-04'] })

    const skala = screen.getByRole('slider', { name: 'Sikkerhetsmargin' })
    const kommentarer = new Set<string>()
    for (const { margin } of THC_REGELSETT.sikkerhetsmarginer) {
      trykkPaaValg(marginvalg(margin))
      expect(skala.getAttribute('aria-valuetext')).toBe(marginvalg(margin))
      const forventet = kommentarFor({ ...inn, sikkerhetsmargin: margin })
      expect(screen.getByText(forventet.kommentar)).toBeTruthy()
      kommentarer.add(forventet.kommentar)

      // Trykket gir skalaen fokus, og mellomrom kopierer derfra som før.
      expect(document.activeElement).toBe(skala)
      await user.keyboard(' ')
      expect(copy).toHaveBeenLastCalledWith(forventet.kommentar)
    }
    // Tilfellet er valgt så marginen faktisk endrer konklusjonen.
    expect(kommentarer.size).toBeGreaterThan(1)
  })

  it('viser i snakkebobler ved marginen hva en høyere sikkerhetsmargin gir, uten banner og uten knapp', async () => {
    const user = userEvent.setup()
    visSteg({ status: 'klar', modell: THC_MODELL })
    // Kronisk, 50 → 40 på tre døgn: 50 % gir nytt inntak, 90 % «kan ikke fastslås», 99 % «ikke nødvendigvis nytt».
    await fyllInn(user, { forrige: ['50', '2026-07-04'], denne: ['40', '2026-07-07'] })

    expect(marginbobler()).toEqual([{ side: 'over', margin: '99 %', linjer: ['Ikke nødvendigvis nytt'] }])
    expect(marginbeskrivelse()).toEqual([
      'Ved 99 % sikkerhetsmargin har cannabis ikke nødvendigvis vært inntatt etter forrige prøve.',
    ])
    expect(screen.queryByText('Vurder høyere sikkerhetsmargin')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Bruk / })).toBeNull()
    // Det står ikke lenger noe om marginen ved kommentaren.
    expect(document.querySelector('.thc-merknader')).toBeNull()

    // To bobler: den første over bryteren, den neste under, hver ved sin margin.
    trykkPaaValg(marginvalg(0.5))
    expect(marginbobler()).toEqual([
      { side: 'over', margin: '90 %', linjer: ['Kan ikke fastslås'] },
      { side: 'under', margin: '99 %', linjer: ['Ikke nødvendigvis nytt'] },
    ])
    expect(marginbeskrivelse()).toEqual([
      'Ved 90 % sikkerhetsmargin kan et nytt inntak ikke fastslås.',
      'Ved 99 % sikkerhetsmargin har cannabis ikke nødvendigvis vært inntatt etter forrige prøve.',
    ])

    // Brukeren velger selv; på den høyeste marginen er det ingenting mildere å si.
    trykkPaaValg(marginvalg(0.99))
    expect(marginbobler()).toEqual([])
    expect(screen.getByRole('slider', { name: 'Sikkerhetsmargin' }).getAttribute('aria-describedby')).toBeNull()
  })

  it('forklarer sikkerhetsmarginen kort bak informasjonstegnet, med marginene i regelsettet', async () => {
    visSteg({ status: 'klar', modell: THC_MODELL })
    const info = screen.getByRole('button', { name: 'Om sikkerhetsmarginen' })
    const beskrivelse = document.getElementById(info.getAttribute('aria-describedby')!)!.textContent!
    expect(beskrivelse).toContain('Med en høyere sikkerhetsmargin legges en mer forsiktig endring til grunn')
    expect(beskrivelse).toContain('Marginen gjelder bare måleusikkerheten, ikke sannsynligheten for at selve fortolkningen er riktig.')
    expect(beskrivelse).toContain('90 % (standard)')
    expect(beskrivelse).toContain('i 1 av 100 tilfeller')
    expect(screen.queryByText('Hva er sikkerhetsmarginen?')).toBeNull()
  })

  it('bruker tekstene, marginene og varselgrensen i regelsettet den får, og foreslår å fortolke uten forrige prøve', async () => {
    const user = userEvent.setup()
    const regler: ThcRegelsett = {
      ...THC_REGELSETT,
      varsel_dager_mellom: 5,
      sikkerhetsmarginer: THC_REGELSETT.sikkerhetsmarginer.filter((m) => m.margin !== 0.99),
    }
    const tekster = { ...THC_TEKSTER, introsetning: 'Syntetisk åpning: {nivå} konsentrasjon.' }
    visSteg({ status: 'klar', modell: modell(regler, tekster) })

    expect(screen.getByRole('slider', { name: 'Sikkerhetsmargin' }).getAttribute('aria-valuetext')).toBe('90 %')
    expect((screen.getByRole('slider', { name: 'Sikkerhetsmargin' }) as HTMLInputElement).max).toBe('1')

    await fyllInn(user, { forrige: ['120', '2026-02-01'], denne: ['80', '2026-02-08'] })
    expect(screen.getByText(/^Syntetisk åpning: høy konsentrasjon\./)).toBeTruthy()
    expect(screen.getByText('Det er 7 dager mellom prøvene. Vurder å fortolke uten å sammenligne med forrige prøve.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Fortolk uten forrige prøve' }))
    const ingen = screen.getByRole('checkbox', { name: 'Ingen tidligere prøve tilgjengelig' })
    expect(ingen).toHaveProperty('checked', true)
    // Fokuset står på avkryssingen, så valget kan angres med mellomrom.
    expect(document.activeElement).toBe(ingen)
    expect(screen.queryByText(/mellom prøvene\./)).toBeNull()
  })

  it('spør om kort tid mellom prøvene, og vurderer dem ikke mot hverandre når det hukes av', async () => {
    const user = userEvent.setup()
    visSteg({ status: 'klar', modell: THC_MODELL })
    await fyllInn(user, { forrige: ['120', '2026-02-06'], denne: ['80', '2026-02-08'] })

    const inn = { forrigeVerdi: '120', forrigeDato: '2026-02-06', aktuellVerdi: '80', aktuellDato: '2026-02-08' }
    expect(screen.getByText(kommentarFor(inn).kommentar)).toBeTruthy()
    // Meldingen og valget kommer sammen, uten banner, og valget er ikke huket av.
    expect(screen.getByText('Det er bare 2 dager mellom prøvene.')).toBeTruthy()
    expect(document.querySelector('.notis')).toBeNull()
    const kortTid = screen.getByRole('checkbox', { name: 'Ikke sammenlign prøvene (kort tid)' })
    expect(kortTid).toHaveProperty('checked', false)

    await user.click(kortTid)
    const forventet = kommentarFor({ ...inn, kortTid: true })
    expect(forventet.kommentar).toContain(THC_TEKSTER.kort_tid)
    expect(screen.getByText(forventet.kommentar)).toBeTruthy()
    // Prøvene vurderes ikke mot hverandre, så det er ingen margin eller tidligere prøve å velge.
    expect(screen.queryByRole('slider', { name: 'Sikkerhetsmargin' })).toBeNull()
    expect(screen.queryByRole('button', { name: '+ Legg til tidligere prøve' })).toBeNull()

    // Med tre dager eller mer imellom er det ingenting å spørre om.
    await user.clear(gruppe('Forrige prøve').getByLabelText('Prøvedato'))
    await user.type(gruppe('Forrige prøve').getByLabelText('Prøvedato'), '2026-02-05')
    expect(screen.queryByRole('checkbox', { name: 'Ikke sammenlign prøvene (kort tid)' })).toBeNull()
    // Avkryssingen som står igjen, gjelder ikke lenger, og prøvene vurderes mot hverandre.
    const lenger = kommentarFor({ ...inn, forrigeDato: '2026-02-05', kortTid: true })
    expect(lenger.kommentar).not.toContain(THC_TEKSTER.kort_tid)
    expect(screen.getByText(lenger.kommentar)).toBeTruthy()
  })

  it('vurderer mot enda tidligere prøver så snart en er lagt til, og flytter fokuset med knappene', async () => {
    const user = userEvent.setup()
    visSteg({ status: 'klar', modell: THC_MODELL })
    await fyllInn(user, { forrige: ['6,5', '2026-07-04'], denne: ['2,5', '2026-07-27'] })
    expect(screen.getByText(/men gir i seg selv ikke grunnlag for å fastslå/)).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: /Samlet vurdering/ })).toBeNull()
    expect(screen.queryByText(THC_SAMLET_UTEN_TREFF)).toBeNull()

    const leggTil = screen.getByRole('button', { name: '+ Legg til tidligere prøve' })
    await user.click(leggTil)
    const ircak = gruppe('Tidligere prøve').getByRole('textbox', { name: 'IRCAK' })
    expect(document.activeElement).toBe(ircak)
    // En tom tidligere prøve gir ingen kommentar før den er fylt ut eller fjernet.
    expect(screen.getByText(THC_VENTER)).toBeTruthy()

    // En tidligere prøve som ikke gir nytt inntak: den vanlige kommentaren, og en kort merknad.
    await user.type(ircak, '7')
    await user.type(gruppe('Tidligere prøve').getByLabelText('Prøvedato'), '2026-06-30')
    expect(screen.getByText(THC_SAMLET_UTEN_TREFF)).toBeTruthy()
    expect(screen.getByText(/men gir i seg selv ikke grunnlag for å fastslå/)).toBeTruthy()
    expect(screen.queryByText(/tilsier likevel/)).toBeNull()

    // En som gir nytt inntak: den samlede kommentaren, uten merknaden.
    await user.clear(ircak)
    await user.type(ircak, '0,5')
    await user.clear(gruppe('Tidligere prøve').getByLabelText('Prøvedato'))
    await user.type(gruppe('Tidligere prøve').getByLabelText('Prøvedato'), '2026-06-01')
    expect(screen.getByText(/tilsier likevel at det har skjedd minst ett inntak etter prøven tatt 01\.06\.2026\./)).toBeTruthy()
    expect(screen.queryByText(THC_SAMLET_UTEN_TREFF)).toBeNull()

    // En prøve til gir to nummererte prøver, med fokus i den nye.
    await user.click(leggTil)
    expect(gruppe('Tidligere prøve 1')).toBeTruthy()
    expect(document.activeElement).toBe(gruppe('Tidligere prøve 2').getByRole('textbox', { name: 'IRCAK' }))
    // Fjernes den, går fokuset til knappen, og den samlede kommentaren står igjen.
    await user.click(screen.getByRole('button', { name: 'Fjern tidligere prøve 2' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '+ Legg til tidligere prøve' }))
    expect(screen.getByText(/tilsier likevel at det har skjedd minst ett inntak etter prøven tatt 01\.06\.2026\./)).toBeTruthy()
    // Uten tidligere prøver er det den vanlige kommentaren igjen.
    await user.click(screen.getByRole('button', { name: 'Fjern tidligere prøve' }))
    expect(screen.queryByRole('group', { name: /Tidligere prøve/ })).toBeNull()
    expect(screen.queryByText(/tilsier likevel/)).toBeNull()
  })

  it('viser beregnet IRCAK under cut-off, og merknaden om større måleusikkerhet bare når den brukes', async () => {
    const user = userEvent.setup()
    visSteg({ status: 'klar', modell: THC_MODELL })
    const merknad = () => document.querySelector('.thc-margin__merknad')?.textContent ?? null
    const tekst = 'Forrige prøve er under cut-off, så det er lagt til grunn 50\u00a0% høyere måleusikkerhet. Det gjør fortolkningen mer forsiktig.'
    await user.click(gruppe('Forrige prøve').getByRole('checkbox', { name: 'Under cut-off' }))
    expect(gruppe('Forrige prøve').getByRole('status').textContent).toBe('Beregnet IRCAK –')
    // Ikke før UCAK og NKRE gir en IRCAK å fortolke.
    expect(merknad()).toBeNull()
    await user.type(gruppe('Forrige prøve').getByRole('textbox', { name: 'UCAK (THC-syre)' }), '6')
    expect(merknad()).toBeNull()
    await user.type(gruppe('Forrige prøve').getByRole('textbox', { name: 'NKRE (kreatinin)' }), '4')
    expect(gruppe('Forrige prøve').getByRole('status').textContent).toBe('Beregnet IRCAK 1,5')
    expect(merknad()).toBe(tekst)
    expect(document.querySelector('.notis')).toBeNull()

    // Uten margin korrigeres det ikke for usikkerheten, og merknaden er ikke relevant.
    trykkPaaValg(marginvalg(0.5))
    expect(merknad()).toBeNull()
    trykkPaaValg(marginvalg(0.9))
    // Heller ikke når THC-syre er 0: da er det nytt inntak uten beregning.
    const ucak = gruppe('Forrige prøve').getByRole('textbox', { name: 'UCAK (THC-syre)' })
    await user.clear(ucak)
    await user.type(ucak, '0')
    expect(merknad()).toBeNull()
  })

  it('viser tabellen med tersklene for bruksmønsteret, og denne prøven med den valgte eller alle marginene', async () => {
    const user = userEvent.setup()
    // Uten «Ingen» i regelsettet, så den må legges til som eget punkt.
    const uten = { ...THC_REGELSETT, sikkerhetsmarginer: THC_REGELSETT.sikkerhetsmarginer.filter((m) => m.margin !== 0.5) }
    visSteg({ status: 'klar', modell: modell(uten) })
    await fyllInn(user, { forrige: ['120', '2026-02-01'], denne: ['80', '2026-02-08'] })

    const figur = () => document.querySelector('.thc-plot__figur')!
    const kurver = () => [...figur().querySelectorAll('.thc-plot__kurve')].map((k) => k.getAttribute('class'))
    const denne = () => figur().querySelectorAll('circle[class*="thc-plot__punkt--"]')
    const rader = () =>
      within(document.querySelector('.thc-profiltabell') as HTMLElement)
        .getAllByRole('row')
        // Navnet uten tipset om hva profilen står for, som står skjult ved det.
        .map((rad) => Array.from(rad.children, (celle) => (celle.querySelector('.tipsanker') ?? celle).textContent))
    const grunnlag = kommentarFor({ forrigeVerdi: '120', forrigeDato: '2026-02-01', aktuellVerdi: '80', aktuellDato: '2026-02-08' }, modell(uten)).grunnlag!

    // Kronisk bruk: den gule kurven er nedre og den røde øvre terskel.
    expect(kurver()).toEqual([
      'thc-plot__kurve thc-plot__kurve--ubrukt',
      'thc-plot__kurve thc-plot__kurve--nedre',
      'thc-plot__kurve thc-plot__kurve--ovre',
    ])
    // Tabellen er tegnforklaringen: navnet, forventet endring etter dagene og betydningen.
    expect(rader()).toEqual([
      ['Utskillelsesprofil', 'Forventet endring etter 7 dager', 'Betydning for fortolkningen'],
      ['Normal utskillelse', formaterProsent(grunnlag.forventet.gronn * 100), 'Brukes ikke i fortolkningen ved kronisk bruk'],
      ['Moderat utskillelse', formaterProsent(grunnlag.forventet.gul * 100), 'Skiller «ikke nødvendigvis nytt» fra «kan ikke fastslås»'],
      ['Treg utskillelse', formaterProsent(grunnlag.forventet.rod * 100), 'Skiller «kan ikke fastslås» fra «nytt inntak»'],
    ])
    // Streken i tabellen er den samme som i figuren.
    expect([...document.querySelectorAll('.thc-profiltabell line')].map((l) => l.getAttribute('class'))).toEqual(kurver())
    expect(document.querySelector('.thc-legende')).toBeNull()
    expect(denne()).toHaveLength(1)
    expect(figur().textContent).toContain('Denne prøven')

    const alle = screen.getByRole('checkbox', { name: 'Vis alle sikkerhetsmarginer' })
    expect(alle).toHaveProperty('checked', false)
    await user.click(alle)
    // Ett punkt per margin, og ett for «Ingen (50 %)».
    expect(denne()).toHaveLength(uten.sikkerhetsmarginer.length + 1)
    expect(figur().querySelector('.thc-plot__klamme')).toBeTruthy()
    expect(figur().textContent).toContain('(ulike sikkerhetsmarginer)')
    expect([...denne()].map((p) => p.querySelector('title')?.textContent?.split(':')[0])).toEqual([
      'Ingen (50 %) sikkerhetsmargin',
      ...uten.sikkerhetsmarginer.map((m) => `${marginvalg(m.margin)} sikkerhetsmargin`),
    ])
    // De samme punktene står som tekst under figuren, for tastatur, berøring og skjermleser.
    const liste = screen.getByRole('list', { name: 'Denne prøven med hver sikkerhetsmargin' })
    expect(within(liste).getAllByRole('listitem').map((li) => li.textContent)).toEqual(
      [...denne()].map((p) => p.querySelector('title')?.textContent),
    )

    // Uten kronisk bruk er det den grønne og den gule kurven som er terskler.
    await user.click(screen.getByLabelText('Legg kronisk bruk til grunn'))
    expect(kurver()).toEqual([
      'thc-plot__kurve thc-plot__kurve--nedre',
      'thc-plot__kurve thc-plot__kurve--ovre',
      'thc-plot__kurve thc-plot__kurve--ubrukt',
    ])
    expect(rader()[3]![2]).toBe('Brukes ikke i fortolkningen når kronisk bruk ikke legges til grunn')
    expect(document.querySelector('.thc-profiltabell__ubrukt .tipsanker')?.textContent).toBe('Treg utskillelse')

    await user.click(alle)
    expect(denne()).toHaveLength(1)
    expect(figur().querySelector('.thc-plot__klamme')).toBeNull()
    expect(screen.queryByRole('list', { name: 'Denne prøven med hver sikkerhetsmargin' })).toBeNull()
  })

  it('viser visualiseringen brukeren har lagret, og melder fra når den byttes', async () => {
    const user = userEvent.setup()
    const onVelg = vi.fn()
    visSteg({ status: 'klar', modell: THC_MODELL }, { visning: 'alle', onVelg })
    await fyllInn(user, { forrige: ['120', '2026-02-01'], denne: ['80', '2026-02-08'] })

    // Med alle marginene fra start, uten at noe er trykket.
    expect(document.querySelector('.thc-plot__klamme')).toBeTruthy()
    const alle = screen.getByRole('checkbox', { name: 'Vis alle sikkerhetsmarginer' })
    expect(alle).toHaveProperty('checked', true)
    await user.click(alle)
    expect(onVelg).toHaveBeenCalledWith('valgt')
  })

  it('forklarer i fire korte bolker i vanlig språk, med prosent og uten forholdstall', async () => {
    const user = userEvent.setup()
    visSteg({ status: 'klar', modell: THC_MODELL })
    await fyllInn(user, { forrige: ['120', '2026-02-01'], denne: ['80', '2026-02-08'] })
    const forklaring = screen.getByText('Forklaring').closest('details')!
    expect(within(forklaring).getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'Hvor stor er endringen mellom prøvene?',
      'Hvordan er det tatt hensyn til måleusikkerhet?',
      'Hva kan forventes dersom det ikke har skjedd et nytt inntak?',
      'Hvorfor blir konklusjonen slik?',
    ])
    const tekst = forklaring.textContent!
    expect(tekst).toContain('IRCAK er 80 i denne prøven og 120 i forrige prøve, 7 dager tidligere. Det er en nedgang på 33 %.')
    expect(tekst).toContain('Med 90 % sikkerhetsmargin legges en mer forsiktig endring til grunn')
    expect(tekst).toMatch(/høy konsentrasjon\./)
    // Ingen forholdstall eller regneuttrykk.
    expect(tekst).not.toMatch(/forholdstall|80\/120|≠/)
  })

  it('holder den raske tastaturflyten: Enter kopierer, tilbyr nullstilling, og Enter igjen begynner på nytt', async () => {
    const user = userEvent.setup()
    const copy = visSteg({ status: 'klar', modell: THC_MODELL })
    await fyllInn(user, { forrige: ['120', '2026-02-01'], denne: ['80', '2026-02-08'] })
    const forventet = kommentarFor({ forrigeVerdi: '120', forrigeDato: '2026-02-01', aktuellVerdi: '80', aktuellDato: '2026-02-08' })

    // Fra datofeltet: Enter kopierer, også med de nye seksjonene og knappene under.
    await user.keyboard('{Enter}')
    expect(copy).toHaveBeenLastCalledWith(forventet.kommentar)
    expect(screen.getByRole('status', { name: '' }).textContent).toContain('for å nullstille nå')
    await user.keyboard('{Enter}')
    expect(gruppe('Forrige prøve').getByRole('textbox', { name: 'IRCAK' })).toHaveProperty('value', '')
    expect(document.activeElement).toBe(gruppe('Forrige prøve').getByRole('textbox', { name: 'IRCAK' }))
    expect(screen.getByText(THC_VENTER)).toBeTruthy()

    // Fra «+ Legg til tidligere prøve» og sammendragene: Enter kopierer, mellomrom trykker og folder ut.
    await fyllInn(user, { forrige: ['120', '2026-02-01'], denne: ['80', '2026-02-08'] })
    copy.mockClear()
    screen.getByRole('button', { name: '+ Legg til tidligere prøve' }).focus()
    await user.keyboard('{Enter}')
    expect(copy).toHaveBeenCalledWith(forventet.kommentar)
    expect(screen.queryByRole('group', { name: 'Tidligere prøve' })).toBeNull()
    await user.keyboard('{Escape}')
    screen.getByRole('button', { name: '+ Legg til tidligere prøve' }).focus()
    await user.keyboard(' ')
    expect(screen.getByRole('group', { name: 'Tidligere prøve' })).toBeTruthy()
  })

  it('gir kommentaren til manuell kopiering når utklippstavlen ikke er tilgjengelig', async () => {
    const user = userEvent.setup()
    const copy = vi.fn(async () => false)
    render(
      <TipsLag>
        <ShortcutVisibilityProvider>
          <ThcStep analyte={THC_ANALYTT} regler={{ status: 'klar', modell: THC_MODELL }} onBack={vi.fn()} copy={copy} flashAt={vi.fn()} />
        </ShortcutVisibilityProvider>
      </TipsLag>,
    )
    await fyllInn(user, { forrige: ['120', '2026-02-01'], denne: ['80', '2026-02-08'] })
    await user.click(screen.getByRole('button', { name: /Kopier kommentar/ }))
    const forventet = kommentarFor({ forrigeVerdi: '120', forrigeDato: '2026-02-01', aktuellVerdi: '80', aktuellDato: '2026-02-08' })
    expect(within(screen.getByRole('alert')).getByRole('textbox')).toHaveProperty('value', forventet.kommentar)
    // Endres skjemaet, er reserveteksten utdatert og forsvinner.
    await user.type(gruppe('Denne prøven').getByRole('textbox', { name: 'IRCAK' }), '1')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('gir ingen kommentar når nye regler ikke har marginen skjemaet står på', async () => {
    const user = userEvent.setup()
    const vis = (m: ThcModell) => (
      <TipsLag>
        <ShortcutVisibilityProvider>
          <ThcStep analyte={THC_ANALYTT} regler={{ status: 'klar', modell: m }} onBack={vi.fn()} copy={vi.fn()} flashAt={vi.fn()} />
        </ShortcutVisibilityProvider>
      </TipsLag>
    )
    const { rerender } = render(vis(THC_MODELL))
    const skala = screen.getByRole('slider', { name: 'Sikkerhetsmargin' })
    fireEvent.change(skala, { target: { value: '2' } })
    expect(skala.getAttribute('aria-valuetext')).toBe('99 %')
    await fyllInn(user, { forrige: ['120', '2026-02-01'], denne: ['80', '2026-02-08'] })
    expect(screen.getByRole('button', { name: /Kopier kommentar/ })).toBeTruthy()

    const uten99 = THC_REGELSETT.sikkerhetsmarginer.filter((m) => m.margin !== 0.99)
    rerender(vis(modell({ ...THC_REGELSETT, sikkerhetsmarginer: uten99 })))
    expect(screen.getByRole('alert').textContent).toBe('Sikkerhetsmarginen finnes ikke i regelsettet. Velg en av marginene som tilbys.')
    expect(screen.queryByRole('button', { name: /Kopier kommentar/ })).toBeNull()
  })
})

/* --- Reglene slik appen henter dem --------------------------------------- */

describe('THC-reglene slik appen henter dem', () => {
  const provIgjen = () => {}

  it('gir den samme modellen som reglene og tekstene de ble importert fra', () => {
    const regler = thcReglerFra({ status: 'klar', data: thcRegelsettutgave() }, provIgjen)
    expect(regler).toEqual({ status: 'klar', modell: THC_MODELL })
  })

  it('venter mens reglene hentes, og sier fra med en vei til å prøve igjen når de ikke kunne hentes', () => {
    expect(thcReglerFra({ status: 'laster' }, provIgjen)).toEqual({ status: 'laster' })
    expect(thcReglerFra({ status: 'feil', melding: 'Nede.' }, provIgjen)).toEqual({
      status: 'feil',
      melding: 'Fortolkningsreglene kunne ikke hentes. Nede.',
      provIgjen,
    })
  })

  it('sier fra når det ikke finnes noe publisert regelsett', () => {
    expect(thcReglerFra({ status: 'klar', data: null }, provIgjen)).toMatchObject({
      status: 'feil',
      melding: expect.stringContaining('ingen publiserte regler for THC-syre i urin'),
    })
  })

  it('bruker ikke et regelsett som ikke består kontrollen, eller som mangler en tekst', () => {
    const ugyldig = thcRegelsettutgave()
    ugyldig.regelsett.innhold.varsel_dager_mellom = 0
    const utenTekst = thcRegelsettutgave()
    utenTekst.kommentarer = utenTekst.kommentarer.slice(1)
    for (const data of [ugyldig, utenTekst]) {
      expect(thcReglerFra({ status: 'klar', data }, provIgjen)).toMatchObject({
        status: 'feil',
        melding: expect.stringContaining('Reglene for THC-syre i urin er ikke gyldige'),
      })
    }
  })
})
