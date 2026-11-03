// @vitest-environment jsdom
/**
 * Stoffsidens øvrige paneler i Atlas-uttrykket (UX-plan PR H): seksjonsikonene,
 * ikonregisteret for farmakokinetikken, doseringskortene og serumtabellen med
 * kildens oppbygning.
 *
 * Serumtabellen er det viktigste: den leser de lagrede radene tilbake til
 * matrisen i `originaldata/Psykofarmaka.pdf`, og skal aldri vise et annet tall
 * eller en annen tekst enn det som er lagret. Derfor prøves den mot hele
 * importdatasettet.
 */
import { readFileSync } from 'node:fs'
import { act, cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { Serumtabell } from '../components/stoffside/Serumtabell'
import { kinetikkikon, seksjonsikon, tekstvisning } from '../components/stoffside/panelvisning'
import { IKONNAVN } from '../components/ikon/register'
import { Detaljkort, Seksjon } from '../components/seksjoner/Seksjon'
import { doseringskort } from '../faginnhold/doseringskort'
import { doserader, kinetikktittel, tilDokument, type Persentiltabell } from '../faginnhold/import'
import { PANELER, PANELER_MED_FASTE_KORT, fasteKort, formaterTall, panelFor, type Doserad } from '../faginnhold/paneler'
import { PSYKOFARMAKA_FILER } from '../faginnhold/psykofarmaka'
import { klartekst } from '../faginnhold/riktekst'
import { lesSerumtabell, persentiltekst, PROSJEKTMERKNAD, type Serumblokk } from '../faginnhold/serumtabell'

beforeAll(() => {
  window.matchMedia = ((sporring: string) => ({ matches: sporring.includes('reduce') })) as typeof window.matchMedia
})

afterEach(cleanup)

/* --- Serumtabellen -------------------------------------------------------- */

/** Matrisen slik importdatasettet har den, med bare dosene som ble lagret (en dose uten tall lagres ikke). */
function forventetMatrise(tabell: Persentiltabell): Serumblokk {
  return {
    slag: 'persentiler',
    stoff: tabell.stoff,
    kilde: tabell.kilde,
    enhet: tabell.enhet,
    kolonner: tabell.doser
      .map((dose, i) => ({
        dose,
        antall: tabell.antall[i] ?? null,
        p10: tabell.p10[i] ?? null,
        median: tabell.median[i] ?? null,
        p90: tabell.p90[i] ?? null,
      }))
      .filter((k) => persentiltekst(k.median, k.p10, k.p90, tabell.enhet) !== ''),
  }
}

describe('serumtabellen leses tilbake til kildens matrise', () => {
  const medSerum = PSYKOFARMAKA_FILER.filter((fil) => fil.serumkonsentrasjoner)

  it.each(medSerum.map((fil) => [fil.kode, fil] as const))('%s: samme tall, stoff og kilder som datasettet', (_, fil) => {
    const serum = fil.serumkonsentrasjoner!
    const forventet: Serumblokk[] = (serum.tabeller ?? []).map(forventetMatrise)
    const prosjekt = serum.referanseomradeprosjektet
    if (prosjekt) forventet.push({ slag: 'prosjekt', doser: prosjekt.doser, enhet: prosjekt.enhet, p10: prosjekt.p10, p90: prosjekt.p90 })
    if (serum.rader?.length) forventet.push({ slag: 'rader', rader: serum.rader })
    expect(lesSerumtabell(doserader(serum))).toEqual(forventet)
  })

  it('dekker hele datasettet: ingen importert rad faller til vanlige rader uten grunn', () => {
    for (const fil of medSerum) {
      const blokker = lesSerumtabell(doserader(fil.serumkonsentrasjoner!))
      const frie = blokker.flatMap((b) => (b.slag === 'rader' ? b.rader : []))
      expect(frie, fil.kode).toEqual(fil.serumkonsentrasjoner!.rader ?? [])
    }
  })

  const kvetiapin = (): Doserad[] => doserader(PSYKOFARMAKA_FILER.find((f) => f.kode === 'KVE')!.serumkonsentrasjoner!)

  it('viser en rad en redaktør har endret, nøyaktig som den er lagret', () => {
    const rader = kvetiapin()
    rader[2] = { ...rader[2]!, konsentrasjon: 'Median ca. 140 nmol/L (10.–90. persentil: 36–272)' }
    const blokker = lesSerumtabell(rader)
    expect(blokker.map((b) => b.slag)).toEqual(['persentiler', 'rader', 'persentiler', 'prosjekt'])
    expect(blokker[1]).toEqual({ slag: 'rader', rader: [rader[2]] })
  })

  it('godtar ikke et tall som ikke skrives tilbake likt', () => {
    const [rad] = kvetiapin()
    // To mellomrom, eller et tall uten norsk tusenskille, lages ikke av importen.
    for (const konsentrasjon of ['Median 46  nmol/L (10.–90. persentil: 16–756)', 'Median 46 nmol/L (10.–90. persentil: 16–0756)']) {
      expect(lesSerumtabell([{ ...rad!, konsentrasjon }])[0]!.slag).toBe('rader')
    }
    expect(lesSerumtabell([{ ...rad!, regime: '1 gang daglig' }])[0]!.slag).toBe('rader')
    expect(lesSerumtabell([{ ...rad!, merknad: 'Kvetiapin. Jönsson et al. (2019).' }])[0]!.slag).toBe('rader')
  })

  it('leser grenser alene og tall med tusenskille', () => {
    const merknad = 'Stoff. 1 200 prøver. Kilde (2020)'
    const rader: Doserad[] = [
      { dose: '10 mg', regime: '', konsentrasjon: persentiltekst(1234, null, 2500, 'nmol/L'), merknad },
      { dose: '20 mg', regime: '', konsentrasjon: persentiltekst(null, 12.5, null, 'nmol/L'), merknad },
      { dose: '1–2 mg', regime: '', konsentrasjon: persentiltekst(null, 5, 9, 'nmol/L'), merknad: PROSJEKTMERKNAD },
    ]
    expect(lesSerumtabell(rader)).toEqual([
      {
        slag: 'persentiler',
        stoff: 'Stoff',
        kilde: 'Kilde (2020)',
        enhet: 'nmol/L',
        kolonner: [
          { dose: '10 mg', antall: 1200, p10: null, median: 1234, p90: 2500 },
          { dose: '20 mg', antall: 1200, p10: 12.5, median: null, p90: null },
        ],
      },
      { slag: 'prosjekt', doser: '1–2 mg', enhet: 'nmol/L', p10: 5, p90: 9 },
    ])
  })
})

describe('serumtabellen på siden', () => {
  it('har dosene som kolonner og målene som rader, som i PDF-en', () => {
    render(<Serumtabell rader={kvetiapinrader()} tittel="Serumkonsentrasjoner" />)
    const [matrise, prosjekt] = screen.getAllByRole('table')
    const kolonner = within(matrise!).getAllByRole('columnheader').map((th) => th.textContent)
    expect(kolonner).toEqual(['Dose', '50 mg', '100 mg', '200 mg', '300 mg', '400 mg', '600 mg', '800 mg', '1000 mg', 'Alle'])
    const rader = within(matrise!).getAllByRole('rowheader').map((th) => th.textContent)
    expect(rader).toEqual(['Antall prøver', '10-persentil (nmol/L)', 'Median (nmol/L)', '90-persentil (nmol/L)'])
    const median = within(matrise!).getByRole('rowheader', { name: 'Median (nmol/L)' }).parentElement!
    expect([...median.querySelectorAll('td')].map((td) => td.textContent)).toEqual(
      ['46', '85', '140', '205', '217', '328', '335', '430', '198'],
    )
    const antall = within(matrise!).getByRole('rowheader', { name: 'Antall prøver' }).parentElement!
    expect(antall.querySelector('td:last-child')!.textContent).toBe('5 853')
    expect(within(prosjekt!).getAllByRole('cell').map((td) => td.textContent)).toEqual(['57', '639'])
    expect(screen.getByRole('heading', { name: 'Referanseområdeprosjektet 2005–2008, dose 50–1000 mg' })).toBeTruthy()
    // Kildene står i panelets referansefelt, ikke som tekst over tabellene.
    expect(screen.queryByText(/Jönsson|Diakonhjemmet/)).toBeNull()
    // Tabellen ruller aldri sidelengs, så den trenger ikke noe rullefelt å stoppe på med tastaturet.
    expect(matrise!.closest('[role="region"]')).toBeNull()
    expect(matrise!.closest('[tabindex]')).toBeNull()
  })

  it('merker et tall kilden ikke har, i stedet for å la cellen stå tom', () => {
    const fil = PSYKOFARMAKA_FILER.find((f) => f.kode === 'AMTNORSUM')!
    const rader = doserader({ tabeller: [{ ...fil.serumkonsentrasjoner!.tabeller![0]!, median: [118, null, 260, 317, 412, 503, 594, 919, null] }] })
    render(<Serumtabell rader={rader} tittel="Serumkonsentrasjoner" />)
    const median = screen.getByRole('rowheader', { name: 'Median (nmol/L)' }).parentElement!
    expect(median.querySelectorAll('td')[1]!.textContent).toBe('—ikke oppgitt')
  })

  it('viser rader som ikke er persentiler med bare kolonnene som er i bruk', () => {
    const rader = PSYKOFARMAKA_FILER.find((f) => f.kode === 'HBUP')!.serumkonsentrasjoner!.rader!
    render(<Serumtabell rader={rader} tittel="Serumkonsentrasjoner" />)
    const kolonner = screen.getAllByRole('columnheader').map((th) => th.textContent)
    expect(kolonner).toEqual(['Dose', 'Doseringsregime', 'Serumkonsentrasjon', 'Betingelser og merknader'])
    expect(screen.getAllByRole('cell').map((td) => td.textContent)).toEqual(
      rader.flatMap((r) => [r.dose, r.regime, r.konsentrasjon, r.merknad]),
    )
  })
})

describe('serumtabellen ruller aldri sidelengs', () => {
  /** Hvor bred rammen rundt tabellen er, og hvor brede utformingene vil være. */
  const bredder = { ramme: 0, kolonner: 0, snudd: 0, rader: 0 }
  const vakter: (() => void)[] = []
  const opprinneligRamme = Element.prototype.getBoundingClientRect

  beforeEach(() => {
    vakter.length = 0
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(private readonly kall: () => void) {}
        observe() {
          vakter.push(() => this.kall())
        }
        disconnect() {}
      },
    )
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains('serumtabell__ramme') ? bredder.ramme : 0
      },
    })
    Element.prototype.getBoundingClientRect = function (this: Element) {
      const bredde = this.classList.contains('serumtabell__tabell--snudd')
        ? bredder.snudd
        : this.classList.contains('serumtabell__tabell--persentiler')
          ? bredder.kolonner
          : this.classList.contains('serumtabell__tabell--rader')
            ? bredder.rader
            : 0
      return { width: bredde } as DOMRect
    }
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    // Bredden er bare overstyrt for HTML-elementer; jsdom har sin egen på Element.
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth
    Element.prototype.getBoundingClientRect = opprinneligRamme
  })

  /** Rammen endrer bredde, som når vinduet gjøres smalere eller bredere. */
  function nyBredde(ramme: number) {
    bredder.ramme = ramme
    act(() => vakter.forEach((vakt) => vakt()))
  }

  const matrise = () => screen.getAllByRole('table')[0]!
  const kolonner = () => within(matrise()).getAllByRole('columnheader').map((th) => th.textContent)
  const radoverskrifter = () => within(matrise()).getAllByRole('rowheader').map((th) => th.textContent)

  it('har dosene som kolonner når de får plass', () => {
    Object.assign(bredder, { ramme: 800, kolonner: 800, snudd: 400 })
    render(<Serumtabell rader={kvetiapinrader()} tittel="Serumkonsentrasjoner" />)
    expect(kolonner()[1]).toBe('50 mg')
    expect(document.querySelector('.serumtabell__tabell--snudd')).toBeNull()
  })

  it('snur tabellen når dosene ikke får plass som kolonner, og snur den tilbake når det blir plass', () => {
    Object.assign(bredder, { ramme: 799, kolonner: 800, snudd: 400 })
    render(<Serumtabell rader={kvetiapinrader()} tittel="Serumkonsentrasjoner" />)
    expect(kolonner()).toEqual(['Dose', 'Antall prøver', '10-persentil (nmol/L)', 'Median (nmol/L)', '90-persentil (nmol/L)'])
    expect(radoverskrifter()).toEqual(['50 mg', '100 mg', '200 mg', '300 mg', '400 mg', '600 mg', '800 mg', '1000 mg', 'Alle'])
    const alle = within(matrise()).getByRole('rowheader', { name: 'Alle' }).parentElement!
    expect([...alle.querySelectorAll('td')].map((td) => td.textContent)).toEqual([5853, 37, 198, 1406].map(formaterTall))
    expect(alle.querySelector('[data-felt="median"]')!.textContent).toBe('198')
    // Det trengs hele bredden tabellen trengte, før den snus tilbake.
    nyBredde(799)
    expect(kolonner()[1]).toBe('Antall prøver')
    nyBredde(800)
    expect(kolonner()[1]).toBe('50 mg')
  })

  it('viser én dose om gangen når heller ikke den snudde tabellen får plass', () => {
    Object.assign(bredder, { ramme: 300, kolonner: 800, snudd: 400 })
    render(<Serumtabell rader={kvetiapinrader()} tittel="Serumkonsentrasjoner" />)
    // Bare referanseområdeprosjektets lille tabell er igjen som tabell.
    expect(screen.getAllByRole('table')).toHaveLength(1)
    const liste = screen.getByRole('list', { name: /Kvetiapin/ })
    const doser = within(liste).getAllByRole('listitem')
    expect(doser).toHaveLength(9)
    const forste = doser[0]!
    expect(forste.querySelector('.serumtabell__dose')!.textContent).toBe('50 mg')
    expect([...forste.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual(
      ['Antall prøver', '10-persentil (nmol/L)', 'Median (nmol/L)', '90-persentil (nmol/L)'],
    )
    expect([...forste.querySelectorAll('dd')].map((dd) => dd.textContent)).toEqual(['252', '16', '46', '756'])
    expect(doser[8]!.hasAttribute('data-samlet')).toBe(true)
    // Bredere igjen: først den snudde tabellen, så dosene som kolonner.
    nyBredde(400)
    expect(kolonner()[1]).toBe('Antall prøver')
    nyBredde(800)
    expect(kolonner()[1]).toBe('50 mg')
  })

  it('viser vanlige rader hver for seg når tabellen ikke får plass', () => {
    const rader = PSYKOFARMAKA_FILER.find((f) => f.kode === 'HBUP')!.serumkonsentrasjoner!.rader!
    Object.assign(bredder, { ramme: 300, rader: 500 })
    render(<Serumtabell rader={rader} tittel="Serumkonsentrasjoner" />)
    expect(screen.queryByRole('table')).toBeNull()
    const elementer = within(screen.getByRole('list', { name: 'Serumkonsentrasjoner' })).getAllByRole('listitem')
    expect(elementer).toHaveLength(rader.length)
    expect([...elementer[0]!.querySelectorAll('dt')].map((dt) => dt.textContent)).toEqual(
      ['Dose', 'Doseringsregime', 'Serumkonsentrasjon', 'Betingelser og merknader'].filter(
        (_, i) => Object.values(rader[0]!)[i] !== '',
      ),
    )
    expect([...elementer[0]!.querySelectorAll('dd')].map((dd) => dd.textContent)).toEqual(
      Object.values(rader[0]!).filter((v) => v !== ''),
    )
    nyBredde(500)
    expect(screen.getByRole('table', { name: 'Serumkonsentrasjoner' })).toBeTruthy()
  })

  it('har ingen rullefelt i stilarket', () => {
    const css = readFileSync('src/styles/monograf.css', 'utf8')
    const ramme = css.match(/\.serumtabell__ramme\s*\{[^}]*\}/)![0]
    expect(ramme).not.toMatch(/overflow(-x)?:\s*(auto|scroll)/)
  })
})

function kvetiapinrader(): Doserad[] {
  return doserader(PSYKOFARMAKA_FILER.find((f) => f.kode === 'KVE')!.serumkonsentrasjoner!)
}

/* --- Ikonene -------------------------------------------------------------- */

describe('seksjonsikonene', () => {
  it('gir alle panelene unntatt identiteten et ikon fra registeret', () => {
    for (const { nokkel } of PANELER) {
      const ikon = seksjonsikon(nokkel)
      if (nokkel === 'identitet') expect(ikon).toBeUndefined()
      else expect(IKONNAVN, nokkel).toContain(ikon)
    }
    expect(seksjonsikon('fortolkning')).toBe('interp')
    expect(seksjonsikon('noe-nytt')).toBeUndefined()
  })

  it('står i sirkelen foran tittelen, som pynt, med tittelen som navn på knappen', () => {
    render(
      <Seksjon id="dosering" ikon="dose" tittel="Dosering" oppsummering="10–40 mg">
        <Detaljkort id="kort" ikon="elim" tittel="Eliminasjon">
          Tekst
        </Detaljkort>
      </Seksjon>,
    )
    const seksjon = document.getElementById('panel-dosering')!
    expect(seksjon.hasAttribute('data-ikon')).toBe(true)
    const ikon = seksjon.querySelector('.skuff__ikon svg')!
    expect(ikon.getAttribute('data-ikon')).toBe('dose')
    expect(ikon.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByRole('button', { name: 'Dosering' })).toBeTruthy()
    expect(document.querySelector('#panel-dosering--kort .skuff__ikon svg')!.getAttribute('data-storrelse')).toBe('underpunkt')
  })

  it('lar en skuff uten ikon være uten', () => {
    render(
      <Seksjon id="x" tittel="X">
        Tekst
      </Seksjon>,
    )
    expect(document.getElementById('panel-x')!.hasAttribute('data-ikon')).toBe(false)
    expect(document.querySelector('#panel-x .skuff__ikon')).toBeNull()
  })
})

describe('ikonregisteret for farmakokinetikken', () => {
  it('kjenner alle overskriftene i datasettet, og bare «Annet» får det generiske', () => {
    const titler = new Set(PSYKOFARMAKA_FILER.flatMap((f) => (f.farmakokinetikk ?? []).map((k) => kinetikktittel(k.tittel))))
    const ikoner = Object.fromEntries([...titler].map((t) => [t, kinetikkikon(t)]))
    expect(ikoner).toEqual({
      Biotilgjengelighet: 'bio',
      tₘₐₓ: 'peak',
      't½': 'hl',
      tₛₛ: 'ss',
      Proteinbinding: 'protein',
      Vd: 'dist',
      Eliminasjon: 'elim',
      'CYP-enzymer (substrat)': 'metab',
      Interaksjoner: 'inter',
      Annet: 'fallback',
    })
  })

  it('leser fri tekst etter mening, og faller trygt tilbake', () => {
    expect(kinetikkikon('Absorpsjon')).toBe('absorp')
    // Hvert fast kort har sitt eget ikon, i alle seksjonene med faste kort.
    for (const panel of PANELER_MED_FASTE_KORT) {
      const ikoner = fasteKort(panelFor(panel)!)!.map(kinetikkikon)
      expect(ikoner, panel).not.toContain('fallback')
      expect(new Set(ikoner).size, panel).toBe(ikoner.length)
    }
    expect(fasteKort(panelFor('toksisitet_forgiftning')!)!.map(kinetikkikon)).toEqual([
      'toksiskDose',
      'tox',
      'forgiftningsbilde',
      'sev',
      'toksikokinetikk',
      'antidot',
    ])
    expect(fasteKort(panelFor('graviditet_amming')!)!.map(kinetikkikon)).toEqual(['foster', 'nyfodt', 'amming', 'fertilitet'])
    // «Amming» står ikke inne i et annet ord.
    expect(kinetikkikon('Stamming')).toBe('fallback')
    expect(kinetikkikon('Toleranseutvikling')).toBe('toleranse')
    expect(kinetikkikon('Abstinens, seponeringssyndrom og rebound-effekter')).toBe('abstinens')
    expect(kinetikkikon('Addiksjon')).toBe('vane')
    expect(kinetikkikon('Lært mestringsavhengighet')).toBe('krykke')
    expect(kinetikkikon('Fenomenologi')).toBe('fenomenologi')
    expect(kinetikkikon('Misbrukspotensial')).toBe('misbruk')
    expect(kinetikkikon('  Distribusjonsvolum ')).toBe('dist')
    expect(kinetikkikon('Metabolisme')).toBe('metab')
    expect(kinetikkikon('Halveringstid')).toBe('hl')
    expect(kinetikkikon('tmax')).toBe('peak')
    expect(kinetikkikon('Tid til steady state')).toBe('ss')
    expect(kinetikkikon('Farmakogenetikk')).toBe('fallback')
    expect(kinetikkikon('')).toBe('fallback')
    expect(IKONNAVN).toContain('fallback')
  })
})

/* --- Doseringen ----------------------------------------------------------- */

describe('doseringskortene', () => {
  const kort = (tekst: Parameters<typeof tilDokument>[0]) => doseringskort(tilDokument(tekst))
  const vis = (k: ReturnType<typeof kort>) => k?.map(({ etikett, innhold }) => [etikett, klartekst({ type: 'doc', content: innhold })])

  it('deler «Etikett: verdi» uten å endre et ord', () => {
    expect(vis(kort(['Immediate release: (25) 50–800 mg', 'Extended release: 50–800 mg']))).toEqual([
      ['Immediate release', '(25) 50–800 mg'],
      ['Extended release', '50–800 mg'],
    ])
    expect(vis(kort(['10–40 mg']))).toEqual([[null, '10–40 mg']])
  })

  it('beholder lenker og formatering i verdien', () => {
    const [depot] = kort(['Depotinjeksjon: 400 mg, se [Abilify Maintena](https://www.felleskatalogen.no/x) for dosering'])!.slice(0)
    expect(depot!.etikett).toBe('Depotinjeksjon')
    expect(depot!.innhold.some((n) => n.marks?.some((m) => m.type === 'link'))).toBe(true)
    expect(klartekst({ type: 'doc', content: depot!.innhold }).replace(/\s+/g, ' ')).toBe('400 mg, se Abilify Maintena for dosering')
  })

  it('deler ikke når det som står foran kolonet, ikke er en etikett', () => {
    expect(vis(kort(['25–150 mg: for depressiv lidelse']))).toEqual([[null, '25–150 mg: for depressiv lidelse']])
    const lang = 'En lang innledning som ikke er en etikett i det hele tatt: 5 mg'
    expect(vis(kort([lang]))).toEqual([[null, lang]])
  })

  it('viser tekst med lister som vanlig tekst', () => {
    expect(kort(['Voksne:', { punkter: ['5 mg'] }])).toBeNull()
  })

  it('gjelder bare doseringen', () => {
    expect(tekstvisning('dosering')).toBe('dosering')
    expect(tekstvisning('farmakodynamikk')).toBe('lesing')
    expect(tekstvisning('indikasjon')).toBe('lesing')
  })
})
