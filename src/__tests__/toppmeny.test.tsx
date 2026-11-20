// @vitest-environment jsdom
/**
 * Appskallet fra designsystemet: ikonene, den faste toppmenyen med plassene
 * sidene fyller, fagsøkfeltets snarvei, hovedmenyen med «For hele appen»
 * (idéene, de planlagte oppgavene og administrasjonen), kontomenyen og
 * Innstillinger (D6).
 */
import { readFileSync } from 'node:fs'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Datakildestatus, Kjoring } from '../datakilder/status'
import type { Fagsak, Redaktoroversikt } from '../verktoy/overvaking/fagsak'
import type { Bevegelse, Tema, Valg } from '../domain/systemvalg'
import type { Trinn } from '../components/toppmeny/Toppmeny'
import type { Gruppekilde } from '../grupper/kilde'
import { INGEN_RETTIGHETER, RettigheterKilde, type Rettigheter } from '../auth/rettigheter'

const loggUt = vi.fn(async () => {})
const rolle = vi.hoisted(() => ({ verdi: 'admin' }))
/** Det databasen svarer på `mine_rettigheter` for den innloggede; som standard en systemarkitekt. */
const ARKITEKT: Rettigheter = { ...INGEN_RETTIGHETER, systemarkitekt: true, stoffregister: true, opprettBrukerI: ['a'], behandlerForslag: true }
const rett = vi.hoisted(() => ({ verdi: null as Rettigheter | null }))
vi.mock('../auth/okt', () => ({
  useProfil: () => ({ role: rolle.verdi, first_name: 'Anne', last_name: 'Admin', username: 'aadmin', avatar_path: null }),
  useOkt: () => ({ loggUt }),
}))
vi.mock('../auth/avatarer', () => ({ useAvatarlenker: () => new Map() }))
// Planlagte oppgaver er bare for systemarkitektene (D8); databasen svarer i appen.
const systemarkitekt = vi.hoisted(() => ({ verdi: true }))
vi.mock('../auth/systemrolle', () => ({ useSystemarkitekt: () => systemarkitekt.verdi }))
const ideerMedNytt = vi.hoisted(() => ({ antall: 0 }))
vi.mock('../ideer/api', () => ({ hentIdeerMedNytt: async () => ideerMedNytt.antall }))
// Tallet på endringsforslag som venter på den som behandler dem (P5 tråd C).
const forslagsantall = vi.hoisted(() => ({ nye: 2, pagaende: 4, uten_redaktor: 0, mine: 1 }))
// Egne forslag som venter på svar fra den innloggede.
const mineVenter = vi.hoisted(() => ({ antall: 1 }))
vi.mock('../forslag/behandling', async (original) => ({
  ...(await original<typeof import('../forslag/behandling')>()),
  hentForslagsantall: async () => ({ ...forslagsantall }),
  hentForslagTilMeg: async (behandler: boolean) =>
    mineVenter.antall + (behandler ? forslagsantall.nye + forslagsantall.mine : 0),
}))
// Dialogene bak valgene har egne tester; her holder det at riktig åpnes.
vi.mock('../components/konto/Kontopanel', () => ({
  Kontopanel: ({ apen }: { apen: boolean }) => (apen ? <p>Kontopanelet</p> : null),
}))
vi.mock('../components/konto/Brukerliste', () => ({
  Brukerliste: ({ apen }: { apen: boolean }) => (apen ? <p>Brukerlista</p> : null),
}))
const datakildepanel = vi.hoisted(() => ({ lukk: null as null | (() => void) }))
vi.mock('../components/konto/Datakilder', () => ({
  Datakilder: ({ apen, onLukk }: { apen: boolean; onLukk: () => void }) => {
    datakildepanel.lukk = onLukk
    return apen ? <p>Datakildene</p> : null
  },
}))
vi.mock('../components/kuratering/Utgavelister', () => ({
  Kurateringsoversikt: ({ apen }: { apen: boolean }) => (apen ? <p>Kurateringsoversikten</p> : null),
}))
vi.mock('../components/konto/Kildeovervaking', async () => {
  const { useEffect, useRef } = await import('react')
  return {
    // Som det ekte vinduet (Modallag): å lukke dialogen kaller onLukk, også når vinduet lukkes fordi et annet åpnes.
    Kildeovervaking: function Kildeovervaking({ apen, onLukk, onNodstopp }: { apen: boolean; onLukk: () => void; onNodstopp?: () => void }) {
      const forrige = useRef(apen)
      useEffect(() => {
        if (forrige.current && !apen) onLukk()
        forrige.current = apen
      }, [apen, onLukk])
      return apen ? (
        <>
          <p>Kildeovervåkingen</p>
          <button onClick={onNodstopp}>Åpne nødstoppen</button>
        </>
      ) : null
    },
    // Ingen faglige saker, så prikken ikke står i de andre testene.
    fagsaklager: () => ({ les: async () => ({ saker: [], teknisk: 'normal', sist_kontrollert_kl: null }), beslutt: async () => 'registrert' }),
  }
})
vi.mock('../components/konto/Verktoysperrer', () => ({
  Verktoysperrer: ({ apen }: { apen: boolean }) => (apen ? <p>Nødstoppen</p> : null),
}))
vi.mock('../components/konto/Stillinger', () => ({
  Stillinger: ({ apen }: { apen: boolean }) => (apen ? <p>Stillingslista</p> : null),
}))
vi.mock('../components/konto/Autoerstattregler', () => ({
  Autoerstattregler: ({ apen }: { apen: boolean }) => (apen ? <p>Autoerstatt-reglene</p> : null),
}))
vi.mock('../components/ideer/Ideer', () => ({
  Ideer: ({ apen, onOppgaver }: { apen: boolean; onOppgaver: (oppgave?: string) => void }) =>
    apen ? (
      <>
        <p>Idéene</p>
        <button onClick={() => onOppgaver('o1')}>Til oppgaven</button>
      </>
    ) : null,
}))
vi.mock('../components/ideer/Oppgaver', () => ({
  Oppgaver: ({ apen, oppgave, onIdeer }: { apen: boolean; oppgave?: string; onIdeer: () => void }) =>
    apen ? (
      <>
        <p>Oppgavene {oppgave}</p>
        <button onClick={onIdeer}>Til idéene</button>
      </>
    ) : null,
}))

const { Ikon } = await import('../components/ikon/Ikon')
const { IKONER, IKONFARGER, IKONNAVN } = await import('../components/ikon/register')
const { Toppmeny, faarPlass, trengerToRader, velgTrinn } = await import('../components/toppmeny/Toppmeny')
const { ToppmenyKilde, ToppmenyInnhold } = await import('../components/toppmeny/Toppmenykilde')
const { Fagsokfelt, erFagsokSnarvei } = await import('../components/toppmeny/Fagsokfelt')
const { Kontomeny } = await import('../components/konto/Kontomeny')
const { direktemeldingene } = await import('../direktemeldinger/useDirekte')
const { GruppekildeProvider } = await import('../grupper/kilde')
const { INGEN_GRUPPER } = await import('../grupper/modell')
const { Administrasjon } = await import('../components/konto/Administrasjon')
const { DATAKILDER } = await import('../datakilder/status')
const { Idelag } = await import('../components/ideer/Idelag')
const { Sidemeny } = await import('../components/Sidemeny')
const { STOFFREGISTER } = await import('../domain/stoffregister')
const { meldChatstatus } = await import('../components/chat/chatstyring')
const { TipsLag } = await import('../components/Tips')
const { ShortcutVisibilityProvider, useShortcutVisibility } = await import('../hooks/useShortcutVisibility')

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  loggUt.mockClear()
  rolle.verdi = 'admin'
  systemarkitekt.verdi = true
  rett.verdi = null
  meldChatstatus({ finnes: false, mobilApen: false, uleste: 0 })
})

function Ramme({ children }: { children: React.ReactNode }) {
  return (
    <RettigheterKilde verdi={rett.verdi ?? ARKITEKT}>
      <ShortcutVisibilityProvider>
        <TipsLag>{children}</TipsLag>
      </ShortcutVisibilityProvider>
    </RettigheterKilde>
  )
}

/** `matchMedia` finnes ikke i jsdom. */
/** «Reduser bevegelse» slik skriptet i `<head>` eller `useSystemvalg` setter den. */
function bevegelse(rolig: boolean) {
  document.documentElement.dataset.bevegelse = rolig ? 'redusert' : 'full'
}

describe('ikonene', () => {
  it('bruker bare fargene designsystemet har tokens for', () => {
    const kjente = new Set(Object.keys(IKONFARGER))
    const farger = (deler: readonly unknown[]): string[] =>
      deler.flatMap((d) => {
        const del = d as { col?: string; kids?: unknown[] }
        return [...(del.col ? [del.col] : []), ...(del.kids ? farger(del.kids) : [])]
      })
    for (const navn of IKONNAVN) {
      const { parts, free = [] } = IKONER[navn]
      for (const farge of farger([...parts, ...free])) expect(kjente, `${navn}: ${farge}`).toContain(farge)
    }
  })

  it('er skjult for skjermlesere uten etikett, og et bilde med', () => {
    bevegelse(false)
    const { container } = render(
      <>
        <Ikon navn="search" />
        <Ikon navn="tox" etikett="Toksisk" />
      </>,
    )
    const pynt = container.querySelector('svg')!
    expect(pynt.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByRole('img', { name: 'Toksisk' })).toBeTruthy()
  })

  it('tar navngitte størrelser fra tokens, og tall som piksler', () => {
    bevegelse(false)
    const { container } = render(
      <>
        <Ikon navn="search" storrelse="seksjon" />
        <Ikon navn="search" storrelse={24} />
      </>,
    )
    const [navngitt, tall] = [...container.querySelectorAll('svg')] as [SVGSVGElement, SVGSVGElement]
    expect(navngitt.getAttribute('data-storrelse')).toBe('seksjon')
    expect(tall.getAttribute('width')).toBe('24px')
    expect(tall.hasAttribute('data-storrelse')).toBe(false)
  })

  it('spiller én gang når forelderen får pekeren, men ikke med redusert bevegelse', () => {
    for (const rolig of [false, true]) {
      bevegelse(rolig)
      const { container, unmount } = render(
        <button type="button" data-ih="">
          <Ikon navn="search" />
        </button>,
      )
      fireEvent.mouseEnter(container.querySelector('button')!)
      const svg = container.querySelector('svg')!
      expect(svg.hasAttribute('data-spiller')).toBe(!rolig)
      unmount()
    }
  })

  it('følger et nytt valg av «Reduser bevegelse» med en gang, uten å tegnes på nytt', () => {
    bevegelse(true)
    const { container } = render(
      <button type="button" data-ih="">
        <Ikon navn="search" />
      </button>,
    )
    const knapp = container.querySelector('button')!
    fireEvent.mouseEnter(knapp)
    expect(container.querySelector('svg')!.hasAttribute('data-spiller')).toBe(false)
    bevegelse(false)
    fireEvent.mouseEnter(knapp)
    expect(container.querySelector('svg')!.hasAttribute('data-spiller')).toBe(true)
  })

  it('stopper bare ikonene ved «Reduser bevegelse», og lar dem spille ved nei selv om systemet ber om ro', () => {
    const css = readFileSync('src/styles/ikon.css', 'utf8')
    expect(css).toMatch(/:root\[data-bevegelse='redusert'\] \.ikon \[data-anim\] \{\s*animation: none !important;/)
    expect(css).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*:root\[data-bevegelse='full'\] \.ikon\[data-spiller\] \[data-anim\] \{\s*animation-duration: var\(--ikon-tid\) !important;/,
    )
    // Ikonene står ikke lenger direkte på systemets ønske.
    expect(css).not.toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.ikon/)
    // Hver animasjon har en tid som kan gis tilbake.
    for (const regel of css.match(/\[data-anim='[^']+'\] \{[^}]*animation-name[^}]*\}/g) ?? []) {
      expect(regel).toMatch(/--ikon-tid: \d+ms/)
    }
  })

  it('lar klikket lande på ikonet, ikke på delene som tegnes på nytt', () => {
    // Fokus fra et museklikk spiller animasjonen og bytter ut delene mellom
    // trykk og slipp. Treffer pekeren delene, sender nettleseren ikke klikket.
    const css = readFileSync('src/styles/ikon.css', 'utf8')
    expect(css).toMatch(/\.ikon \*\s*\{[^}]*pointer-events:\s*none/)
  })
})

describe('plassene i toppmenyen', () => {
  function Side() {
    const [trykk, setTrykk] = useState(0)
    return (
      <ToppmenyInnhold spor="redigering">
        <button type="button" onClick={() => setTrykk((n) => n + 1)}>
          Trykket {trykk}
        </button>
      </ToppmenyInnhold>
    )
  }

  it('legger sidens handlinger i menyen, og de beholder sidens tilstand', async () => {
    render(
      <Ramme>
        <ToppmenyKilde>
          <Toppmeny meny={null} konto={null} />
          <main>
            <Side />
          </main>
        </ToppmenyKilde>
      </Ramme>,
    )
    const meny = screen.getByRole('navigation', { name: 'Toppmeny' })
    const knapp = within(meny).getByRole('button', { name: 'Trykket 0' })
    await userEvent.click(knapp)
    expect(within(meny).getByRole('button', { name: 'Trykket 1' })).toBeTruthy()
    expect(within(screen.getByRole('main')).queryByRole('button')).toBeNull()
  })

  it('setter handlingene i plassenes rekkefølge, uansett hvilken side som la dem dit først', () => {
    // Dokken leses fra venstre: søket og hovedhandlingen, så det som gjelder
    // siden, så det som endrer den, og «Lukk» alltid sist.
    const knapp = (navn: string) => (
      <button type="button" aria-label={navn}>
        {navn}
      </button>
    )
    function Sider({ senere }: { senere: boolean }) {
      return (
        <>
          <ToppmenyInnhold spor="lukk">{knapp('Lukk')}</ToppmenyInnhold>
          <ToppmenyInnhold spor="redigering">{knapp('Rediger')}</ToppmenyInnhold>
          {senere && <ToppmenyInnhold spor="endringslogg">{knapp('Endringslogg')}</ToppmenyInnhold>}
          {senere && <ToppmenyInnhold spor="diskusjoner">{knapp('Diskusjoner')}</ToppmenyInnhold>}
          <ToppmenyInnhold spor="favoritt">{knapp('Favoritt')}</ToppmenyInnhold>
          <ToppmenyInnhold spor="hovedhandling">{knapp('Åpne fortolkning')}</ToppmenyInnhold>
          <ToppmenyInnhold spor="sidesok">{knapp('Søk i siden')}</ToppmenyInnhold>
        </>
      )
    }
    const tegn = (senere: boolean) => (
      <Ramme>
        <ToppmenyKilde>
          <Toppmeny meny={null} konto={null} />
          <Sider senere={senere} />
        </ToppmenyKilde>
      </Ramme>
    )
    const { rerender } = render(tegn(false))
    rerender(tegn(true))
    const dokk = screen.getByRole('group', { name: 'Sidehandlinger' })
    expect(within(dokk).getAllByRole('button').map((k) => k.getAttribute('aria-label'))).toEqual([
      'Søk i siden',
      'Åpne fortolkning',
      'Favoritt',
      'Diskusjoner',
      'Endringslogg',
      'Rediger',
      'Lukk',
    ])
    // Søket og hovedhandlingen er første rad når dokken går over to.
    const [hoved, handlinger] = dokk.querySelectorAll('.toppmeny__gruppe')
    expect(within(hoved as HTMLElement).getAllByRole('button')).toHaveLength(2)
    expect(within(handlinger as HTMLElement).getAllByRole('button')).toHaveLength(5)
  })

  it('setter gruppene i dokken på hver sin rad bare når de ikke får plass ved siden av hverandre', () => {
    // Søk og «Åpne fortolkning» (226 px) og seks ikoner (294 px), 6 px imellom.
    expect(trengerToRader([226, 294], 6, 526)).toBe(false)
    expect(trengerToRader([226, 294], 6, 525)).toBe(true)
    // En side med bare én gruppe står alltid på én rad.
    expect(trengerToRader([294], 6, 300)).toBe(false)
    expect(trengerToRader([], 6, 300)).toBe(false)
  })

  it('velger det romsligste trinnet som får plass: tekst, så kompakt, så dokken', () => {
    const plass = (faar: Trinn[]) => (trinn: Trinn) => faar.includes(trinn)
    expect(velgTrinn(false, 'hel', plass(['hel', 'kompakt']))).toBe('hel')
    expect(velgTrinn(false, 'hel', plass(['kompakt']))).toBe('kompakt')
    expect(velgTrinn(false, 'hel', plass([]))).toBe('dokk')
    // På smale flater står sidens handlinger alltid i dokken.
    expect(velgTrinn(true, 'hel', plass(['hel', 'kompakt']))).toBe('dokk')
  })

  it('går bare tilbake til et romsligere trinn når det er plass til overs, så menyen ikke vipper ved grensen', () => {
    const slingringer: [Trinn, boolean][] = []
    const trinn = velgTrinn(false, 'kompakt', (prov, slingring) => {
      slingringer.push([prov, slingring])
      return prov === 'kompakt'
    })
    expect(trinn).toBe('kompakt')
    expect(slingringer).toEqual([
      ['hel', true],
      ['kompakt', false],
    ])
    // Fagsøket i minst 160 px ved siden av resten (500 px) og plassene (300 px).
    expect(faarPlass([500, 160, 300], 6, 972)).toBe(true)
    expect(faarPlass([500, 160, 300], 6, 971)).toBe(false)
  })

  it('flytter plassene til dokken når flaten blir smal, også midt i et søk på siden', () => {
    // jsdom har ingen bredder, så bare den smale flaten kan sende plassene i dokken.
    const flate = { smal: false }
    vi.stubGlobal('matchMedia', (sporring: string) => ({
      get matches() {
        return sporring.includes('max-width') && flate.smal
      },
    }))
    const rot = document.documentElement
    render(
      <Ramme>
        <ToppmenyKilde>
          <Toppmeny meny={null} konto={null} />
          <ToppmenyInnhold spor="sidesok">
            <div className="sidesok">
              <input aria-label="Søk i siden" />
            </div>
          </ToppmenyInnhold>
          <ToppmenyInnhold spor="lukk">
            <button type="button">Lukk</button>
          </ToppmenyInnhold>
        </ToppmenyKilde>
      </Ramme>,
    )
    const endreBredde = (smal: boolean) => {
      flate.smal = smal
      act(() => void window.dispatchEvent(new Event('resize')))
    }
    expect(rot.hasAttribute('data-dokk')).toBe(false)

    const sok = screen.getByRole('textbox', { name: 'Søk i siden' })
    act(() => sok.focus())
    endreBredde(true)
    expect(document.activeElement).toBe(sok)
    expect(rot.hasAttribute('data-dokk')).toBe(true)

    // Bredere igjen midt i søket: menyen flytter seg ikke under markøren.
    endreBredde(false)
    expect(rot.hasAttribute('data-dokk')).toBe(true)
    act(() => sok.blur())
    endreBredde(false)
    expect(rot.hasAttribute('data-dokk')).toBe(false)
  })

  it('gir søket på siden en fast, lesbar bredde mens det brukes i toppmenyen, uten å presse noe sammen', () => {
    const css = readFileSync('src/styles/sok.css', 'utf8')
    expect(css).toMatch(
      /:root:not\(\[data-dokk\]\) \.toppmeny__kontekst \.sidesok:focus-within \{\s*width: var\(--bredde-sidesok-i-bruk\);/,
    )
    // Ingenting i sidens plasser krymper (det la knappene over hverandre).
    expect(css).not.toMatch(/\.toppmeny__(kontekst|gruppe)[^{]*\{[^}]*flex-shrink:\s*1/)
    expect(readFileSync('src/styles/tokens.css', 'utf8')).toMatch(/--bredde-sidesok-i-bruk:\s*16rem/)
  })

  it('lar fagsøkets rullegardin slutte over dokken også på bredere flater', () => {
    const css = readFileSync('src/styles/sok.css', 'utf8')
    expect(css).toMatch(
      /@media \(width > 47\.5em\) \{\s*:root\[data-dokk\] \.fagsok__rullegardin \{\s*max-height: calc\(100dvh - var\(--toppmeny-offset\) - var\(--dokk-offset\)\);/,
    )
  })

  it('går over to rader i dokken heller enn å klemme hovedhandlingen', () => {
    const css = readFileSync('src/styles/toppmeny.css', 'utf8')
    expect(css).toMatch(/:root\[data-dokk\] \.toppmeny__kontekst\s*\{[^}]*flex-wrap:\s*wrap/)
    // Siden og det som står over dokken, regner med den målte høyden.
    expect(readFileSync('src/styles/tokens.css', 'utf8')).toMatch(/--dokk-offset:\s*calc\(var\(--dokkhoyde\)/)
  })

  it('lar handlingene bli stående i siden når den står uten toppmeny', () => {
    render(<Side />)
    expect(screen.getByRole('button', { name: 'Trykket 0' })).toBeTruthy()
  })

  it('har bare hovedmenyen, fagsøket, sidens handlinger, varslene og kontoen: idéene og administrasjonen står i hovedmenyen', () => {
    render(
      <Ramme>
        <GruppekildeProvider verdi={{ ...INGEN_GRUPPER, oppdater: () => undefined }}>
          <ToppmenyKilde>
            <Toppmeny
              meny={<Sidemeny register={STOFFREGISTER} />}
              konto={<Kontomeny tema={{ valg: 'system', velg: () => undefined }} bevegelse={{ valg: 'system', velg: () => undefined }} />}
            />
          </ToppmenyKilde>
        </GruppekildeProvider>
      </Ramme>,
    )
    const toppmeny = screen.getByRole('navigation', { name: 'Toppmeny' })
    const knapper = within(toppmeny).getAllByRole('button').filter((k) => !k.closest('.sidemeny, .nedtrekk__panel'))
    expect(knapper.map((k) => k.getAttribute('aria-label'))).toEqual(['Vis menyen', 'Kontoen din – Anne Admin'])
    for (const knapp of knapper) expect(knapp.querySelector('svg.ikon, .avatar')).not.toBeNull()
  })
})

describe('fagsøkfeltet', () => {
  function Felt() {
    const [verdi, setVerdi] = useState('')
    return <Fagsokfelt verdi={verdi} onEndre={setVerdi} />
  }

  const tast = (valg: KeyboardEventInit) => new KeyboardEvent('keydown', { key: 'k', ...valg })

  it('hentes fram med Ctrl K og Cmd K', () => {
    render(
      <Ramme>
        <Felt />
      </Ramme>,
    )
    const felt = screen.getByRole('searchbox', { name: 'Søk i fagstoffet' })
    for (const valg of [{ ctrlKey: true }, { metaKey: true }]) {
      felt.blur()
      act(() => void window.dispatchEvent(tast(valg)))
      expect(document.activeElement).toBe(felt)
    }
  })

  it('lar tasten være i fred for et redigeringsfelt, et åpent lag og andre kombinasjoner', () => {
    expect(erFagsokSnarvei(tast({ ctrlKey: true }))).toBe(true)
    expect(erFagsokSnarvei(tast({ ctrlKey: true, metaKey: true }))).toBe(false)
    expect(erFagsokSnarvei(tast({ ctrlKey: true, shiftKey: true }))).toBe(false)
    expect(erFagsokSnarvei(tast({}))).toBe(false)

    const lag = document.createElement('div')
    lag.setAttribute('data-lag', 'test')
    document.body.append(lag)
    expect(erFagsokSnarvei(tast({ ctrlKey: true }))).toBe(false)
    lag.remove()

    const redigering = document.createElement('div')
    redigering.contentEditable = 'true'
    redigering.tabIndex = 0
    document.body.append(redigering)
    redigering.focus()
    // jsdom regner ikke ut `isContentEditable`.
    Object.defineProperty(redigering, 'isContentEditable', { value: true })
    expect(erFagsokSnarvei(tast({ ctrlKey: true }))).toBe(false)
    redigering.remove()
  })
})

/** Menyen en knapp styrer. Den står skjult når den er lukket, og har da ikke noe navn å finne den på. */
const panel = (knapp: HTMLElement) => document.getElementById(knapp.getAttribute('aria-controls')!)!

describe('kontomenyen', () => {
  /** Temaet, bevegelsen og hurtigtastene slik appen holder dem, så bryterne kan prøves. */
  function Konto() {
    const [tema, setTema] = useState<Valg<Tema>>('system')
    const [bevegelse, setBevegelse] = useState<Valg<Bevegelse>>('system')
    const { visible } = useShortcutVisibility()
    return (
      <>
        <Kontomeny tema={{ valg: tema, velg: setTema }} bevegelse={{ valg: bevegelse, velg: setBevegelse }} />
        <output>
          {tema} {bevegelse} {visible ? 'med' : 'uten'} hurtigtaster
        </output>
      </>
    )
  }

  function vis(grupper: Partial<Gruppekilde> = {}) {
    render(
      <GruppekildeProvider verdi={{ ...INGEN_GRUPPER, oppdater: () => undefined, ...grupper }}>
        <Ramme>
          <Konto />
        </Ramme>
      </GruppekildeProvider>,
    )
    return screen.getByRole('button', { name: /^Kontoen din – Anne Admin/ })
  }

  it('åpnes fra avataren, er et lag mens den står åpen, og lukkes med Escape', async () => {
    const knapp = vis()
    const meny = panel(knapp)
    expect(meny.hidden).toBe(true)
    expect(knapp.getAttribute('aria-expanded')).toBe('false')

    await userEvent.click(knapp)
    expect(meny.hidden).toBe(false)
    expect(screen.getByRole('group', { name: 'Konto' })).toBe(meny)
    expect(meny.getAttribute('data-lag')).toBe('kontomeny')
    expect(document.activeElement).toBe(within(meny).getByRole('button', { name: /Endre navn, stilling og profilbilde/ }))
    expect(within(meny).getByText('Admin', { selector: '.kontomeny__merke' })).toBeTruthy()

    await userEvent.keyboard('{Escape}')
    expect(meny.hidden).toBe(true)
    expect(meny.hasAttribute('data-lag')).toBe(false)
    expect(document.activeElement).toBe(knapp)
  })

  it('har profilen, forslagene, Innstillinger og utloggingen, men ikke lenger gruppene', async () => {
    const knapp = vis()
    await userEvent.click(knapp)
    // En behandler har også forslagene til behandling, med tallet som venter.
    await within(panel(knapp)).findByText('3 forslag venter')
    const valg = within(panel(knapp)).getAllByRole('button')
    expect(valg.map((v) => v.textContent)).toEqual([
      'Endre navn, stilling og profilbilde',
      'Mine forslag',
      'Til behandling3 forslag venter',
      'InnstillingerVisning',
      'Logg ut',
    ])
    expect(within(panel(knapp)).queryByRole('button', { name: 'Grupper' })).toBeNull()
    expect(within(panel(knapp)).queryByRole('button', { name: 'Preferanser' })).toBeNull()
    expect(document.querySelector('.kontomeny .toppmeny__prikk')).toBeNull()
  })

  it('henter tallet som venter, på nytt hver gang menyen åpnes', async () => {
    const knapp = vis()
    await userEvent.click(knapp)
    await within(panel(knapp)).findByText('3 forslag venter')
    await userEvent.click(knapp)
    forslagsantall.nye = 4
    try {
      await userEvent.click(knapp)
      await within(panel(knapp)).findByText('5 forslag venter')
    } finally {
      forslagsantall.nye = 2
    }
  })

  it('har ikke «Til behandling» for den som ikke behandler forslag', async () => {
    rett.verdi = INGEN_RETTIGHETER
    const knapp = vis()
    await userEvent.click(knapp)
    expect(within(panel(knapp)).queryByRole('button', { name: 'Til behandling' })).toBeNull()
    expect(within(panel(knapp)).getAllByRole('button').map((v) => v.textContent)).toEqual([
      'Endre navn, stilling og profilbilde',
      'Mine forslag',
      'InnstillingerVisning',
      'Logg ut',
    ])
  })

  it('går til «Mine forslag»', async () => {
    const knapp = vis()
    await userEvent.click(knapp)
    await userEvent.click(within(panel(knapp)).getByRole('button', { name: 'Mine forslag' }))
    expect(window.location.hash).toBe('#/forslag')
  })

  it('har ingen prikk for invitasjoner lenger: de står i hovedmenyen', async () => {
    const gruppe = { id: 'g', navn: 'G', beskrivelse: '', art: 'tverrfaglig' as const, status: 'aktiv' as const, fagmiljo: null }
    const knapp = vis({ invitasjoner: [{ gruppe, invitert_kl: '2026-11-14T00:00:00Z', invitert_av: null }] })
    expect(knapp.getAttribute('aria-label')).toBe('Kontoen din – Anne Admin')
    expect(document.querySelector('.kontomeny .toppmeny__prikk')).toBeNull()
  })

  it('åpner Innstillinger med fanen Visning: hurtigtastene, temaet, bevegelsen og måleenheten, som virker derfra', async () => {
    const knapp = vis()
    await userEvent.click(knapp)
    const meny = panel(knapp)
    await userEvent.click(within(meny).getByRole('button', { name: 'Innstillinger' }))
    // Menyen lukkes først, så vinduet gir fokus tilbake til avataren.
    expect(meny.hidden).toBe(true)
    const vindu = screen.getByRole('dialog', { name: 'Innstillinger' })
    // Én fane uten direktemeldingene (Chat står bare når de er på): ingen fanerad.
    expect(within(vindu).queryByRole('tablist')).toBeNull()

    const hurtigtaster = within(vindu).getByRole('switch', { name: 'Vis hurtigtaster' }) as HTMLInputElement
    const tema = within(vindu).getByRole('slider', { name: 'Tema' })
    const bevegelse = within(vindu).getByRole('slider', { name: 'Reduser bevegelse' })
    // Begge følger systemet til brukeren velger noe annet.
    expect(hurtigtaster.checked).toBe(false)
    expect(tema.getAttribute('aria-valuetext')).toBe('Følg system')
    expect(bevegelse.getAttribute('aria-valuetext')).toBe('Følg system')
    // Temaet viser ikoner, bevegelsen ord.
    const merker = (skala: HTMLElement) =>
      [...skala.parentElement!.querySelectorAll('.trinnbryter__valg')].map((v) => v.getAttribute('title') ?? v.textContent)
    expect(merker(tema)).toEqual(['Lyst', 'Mørkt', 'Følg system'])
    expect(merker(bevegelse)).toEqual(['Ja', 'Nei', 'System'])

    fireEvent.change(tema, { target: { value: '1' } })
    fireEvent.change(bevegelse, { target: { value: '0' } })
    await userEvent.click(hurtigtaster)
    expect(hurtigtaster.checked).toBe(true)
    expect(tema.getAttribute('aria-valuetext')).toBe('Mørkt')
    expect(bevegelse.getAttribute('aria-valuetext')).toBe('Ja')
    expect(screen.getByRole('status').textContent).toBe('moerkt redusert med hurtigtaster')

    // Måleenheten konsentrasjonene vises i: de samme tre som laboratorietabellene, µg/L til noe annet er valgt.
    const maleenhet = within(vindu).getByRole('slider', { name: 'Måleenhet' })
    expect(merker(maleenhet)).toEqual(['µg/L', 'nmol/L', 'µmol/L'])
    expect(maleenhet.getAttribute('aria-valuetext')).toBe('µg/L')
    fireEvent.change(maleenhet, { target: { value: '1' } })
    expect(maleenhet.getAttribute('aria-valuetext')).toBe('nmol/L')
    expect(localStorage.getItem('far:maleenhet')).toBe('nmol/L')
  })

  it('har fanen Chat med bryterne fra chatmenyen bare mens direktemeldingene er slått på', async () => {
    const settValg = vi.fn(async () => undefined)
    act(() =>
      direktemeldingene.sett({
        pa: true,
        kjent: true,
        samtaler: [],
        valg: { tillat_direktemeldinger: true, vis_aktiv: false },
        aktive: new Set(),
        settValg,
        oppdater: () => undefined,
      }),
    )
    try {
      const knapp = vis()
      await userEvent.click(knapp)
      expect(within(panel(knapp)).getByRole('button', { name: 'Innstillinger' }).textContent).toContain('Visning og chat')
      await userEvent.click(within(panel(knapp)).getByRole('button', { name: 'Innstillinger' }))
      const vindu = screen.getByRole('dialog', { name: 'Innstillinger' })
      expect(within(vindu).getAllByRole('tab').map((f) => f.textContent)).toEqual(['Visning', 'Chat'])
      await userEvent.click(within(vindu).getByRole('tab', { name: 'Chat' }))
      const tillat = within(vindu).getByRole('switch', { name: /Tillat direktemeldinger/ }) as HTMLInputElement
      expect(tillat.checked).toBe(true)
      await userEvent.click(within(vindu).getByRole('switch', { name: /Vis når jeg er aktiv/ }))
      expect(settValg).toHaveBeenCalledWith({ vis_aktiv: true })
      // Slås de av, forsvinner fanen, og vinduet viser Visning.
      act(() => direktemeldingene.sett(null))
      expect(within(vindu).queryByRole('tablist')).toBeNull()
      expect(within(vindu).getByRole('switch', { name: 'Vis hurtigtaster' })).toBeTruthy()
    } finally {
      act(() => direktemeldingene.sett(null))
    }
  })

  it('lukker Innstillinger med nettleserens egen lukking (Escape), og kontomenyen står lukket', async () => {
    const knapp = vis()
    await userEvent.click(knapp)
    await userEvent.click(within(panel(knapp)).getByRole('button', { name: 'Innstillinger' }))
    const vindu = screen.getByRole('dialog', { name: 'Innstillinger' }) as HTMLDialogElement
    expect(vindu.open).toBe(true)
    // jsdom lukker ikke `<dialog>` på Escape selv; nettleseren gjør det og sender `close`.
    act(() => vindu.close())
    expect(screen.queryByRole('dialog', { name: 'Innstillinger' })).toBeNull()
    expect(panel(knapp).hidden).toBe(true)
  })

  it('lukkes når fokus tabuleres ut av den, også bakover forbi avataren', async () => {
    const knapp = vis()
    await userEvent.click(knapp)
    const meny = panel(knapp)
    await userEvent.tab({ shift: true })
    expect(document.activeElement).toBe(knapp)
    expect(meny.hidden).toBe(false)
    await userEvent.tab({ shift: true })
    expect(meny.hidden).toBe(true)
    expect(meny.hasAttribute('data-lag')).toBe(false)
  })

  it('står åpen når noe i den som ikke tar fokus trykkes, som navnet', async () => {
    const knapp = vis()
    await userEvent.click(knapp)
    await userEvent.click(screen.getByText('aadmin'))
    expect(panel(knapp).hidden).toBe(false)
  })

  it('lukkes av et trykk utenfor', async () => {
    const knapp = vis()
    await userEvent.click(knapp)
    await userEvent.click(document.body)
    expect(panel(knapp).hidden).toBe(true)
  })

  it('fører til profilen og utloggingen', async () => {
    const knapp = vis()
    await userEvent.click(knapp)
    await userEvent.click(screen.getByRole('button', { name: /Endre navn, stilling og profilbilde/ }))
    expect(screen.getByText('Kontopanelet')).toBeTruthy()
    expect(panel(knapp).hidden).toBe(true)

    await userEvent.click(knapp)
    await userEvent.click(screen.getByRole('button', { name: 'Logg ut' }))
    expect(loggUt).toHaveBeenCalledOnce()
  })
})

/** Hovedmenyen slik appen setter den sammen: menyen, og vinduene den åpner under «For hele appen». */
function Hovedmeny({ admin, grupper = {} }: { admin?: Parameters<typeof Administrasjon>[0]; grupper?: Partial<Gruppekilde> }) {
  return (
    <Ramme>
      <GruppekildeProvider verdi={{ ...INGEN_GRUPPER, oppdater: () => undefined, ...grupper }}>
        <Sidemeny register={STOFFREGISTER} />
        <Idelag />
        <Administrasjon {...admin} />
      </GruppekildeProvider>
    </Ramme>
  )
}

const menyknapp = () => screen.getByRole('button', { name: /^Vis menyen/ })
const hovedmenyen = () => screen.getByRole('navigation', { name: 'Meny' })

/** Navnene på valgene i navigasjonsblokken, uten tallene og merknadene. */
const navnene = (liste: HTMLElement) =>
  [...liste.querySelectorAll(':scope > li > .menysnarveier__lenke .menysnarveier__navn')].map((n) => n.textContent)

async function apneMenyen() {
  await userEvent.click(menyknapp())
  const meny = hovedmenyen()
  expect(meny.getAttribute('data-apen')).toBe('ja')
  return meny
}

/** Folder ut «Administrasjon» i hovedmenyen og gir valgene der. */
async function administrasjonen(meny: HTMLElement) {
  const knapp = within(meny).getByRole('button', { name: /^Administrasjon/ })
  if (knapp.getAttribute('aria-expanded') !== 'true') await userEvent.click(knapp)
  return document.getElementById(knapp.getAttribute('aria-controls')!)!
}

async function velgAdmin(valg: string) {
  const liste = await administrasjonen(await apneMenyen())
  await userEvent.click(within(liste).getByRole('button', { name: new RegExp(`^${valg}`) }))
}

describe('hovedmenyen', () => {
  it('har navigasjonen og «For hele appen» over fanene, for en systemarkitekt med alt', async () => {
    const meny = (render(<Hovedmeny />), await apneMenyen())
    const [navigasjon, helApp] = [...meny.querySelectorAll<HTMLElement>('.menynavigasjon > .menysnarveier')]
    expect(navnene(navigasjon!)).toEqual(['Forsiden', 'Fortolkning', 'Grupper', 'Endringsforslag'])
    expect(within(navigasjon!).getByRole('link', { name: /^Grupper/ }).getAttribute('href')).toBe('#/grupper')
    expect(within(navigasjon!).getByRole('link', { name: /^Endringsforslag/ }).getAttribute('href')).toBe('#/forslag')
    expect(navnene(helApp!)).toEqual(['Idéer for appen', 'Planlagte oppgaver', 'Administrasjon'])
    expect(within(helApp!).getByText('Systemarkitekt')).toBeTruthy()
    // Fanene står uendret under.
    expect(within(meny).getAllByRole('tab').map((t) => t.textContent)).toEqual(['Stoffregister'])
  })

  it('har chatten med uleste når den er slått på, og «Chat» åpner chatmenyen', async () => {
    act(() => meldChatstatus({ finnes: true, mobilApen: false, uleste: 3 }))
    render(<Hovedmeny />)
    const meny = await apneMenyen()
    const chat = within(meny).getByRole('button', { name: /^Chat/ })
    expect(chat.textContent).toBe('Chat3 uleste')
    const { lyttEtterChatbeskjed } = await import('../components/chat/chatstyring')
    const beskjeder: unknown[] = []
    const slutt = lyttEtterChatbeskjed((b) => beskjeder.push(b))
    try {
      await userEvent.click(chat)
      expect(beskjeder).toEqual([{ gruppe: null }])
      // Hovedmenyen lukkes, med fokus tilbake til knappen.
      expect(meny.getAttribute('data-apen')).toBe('nei')
      expect(document.activeElement).toBe(menyknapp())
    } finally {
      slutt()
    }
  })

  it('viser hvor mange forslag som venter på deg, og invitasjonene til grupper, med en prikk på knappen for invitasjonen', async () => {
    const gruppe = { id: 'g', navn: 'G', beskrivelse: '', art: 'tverrfaglig' as const, status: 'aktiv' as const, fagmiljo: null }
    render(<Hovedmeny grupper={{ invitasjoner: [{ gruppe, invitert_kl: '2026-11-14T00:00:00Z', invitert_av: null }] }} />)
    expect(menyknapp().getAttribute('aria-label')).toBe('Vis menyen (én ny invitasjon)')
    expect(menyknapp().querySelector('.toppmeny__prikk')).not.toBeNull()
    const meny = await apneMenyen()
    expect(within(meny).getByRole('link', { name: /^Grupper/ }).textContent).toBe('Grupper1 invitasjon')
    // Ett eget forslag venter på svar, og tre i arbeidskøen (to nye, ett hos meg).
    await waitFor(() => expect(within(meny).getByRole('link', { name: /^Endringsforslag/ }).textContent).toBe('Endringsforslag4 til deg'))
  })

  it('har ikke Planlagte oppgaver eller Administrasjon for en vanlig bruker, heller ikke med den gamle adminrollen', async () => {
    for (const r of ['user', 'admin']) {
      rolle.verdi = r
      rett.verdi = INGEN_RETTIGHETER
      systemarkitekt.verdi = false
      render(<Hovedmeny />)
      const meny = await apneMenyen()
      const helApp = meny.querySelectorAll<HTMLElement>('.menynavigasjon > .menysnarveier')[1]!
      expect(navnene(helApp), r).toEqual(['Idéer for appen'])
      expect(within(meny).queryByRole('button', { name: /Planlagte oppgaver/ }), r).toBeNull()
      expect(within(meny).queryByRole('button', { name: /^Administrasjon/ }), r).toBeNull()
      // Den som ikke behandler forslag, får bare egne forslag i tallet.
      await waitFor(() => expect(within(meny).getByRole('link', { name: /^Endringsforslag/ }).textContent).toBe('Endringsforslag1 til deg'))
      cleanup()
    }
  })

  it('åpner ikke de planlagte oppgavene for andre enn systemarkitektene, selv når de bes om', async () => {
    systemarkitekt.verdi = false
    render(<Hovedmeny />)
    const { apneIdelag } = await import('../components/ideer/idevisning')
    act(() => apneIdelag('oppgaver'))
    expect(screen.queryByText(/^Oppgavene/)).toBeNull()
  })

  it('åpner idéene og de planlagte oppgavene, går mellom lagene med bare ett åpent, og gir fokus tilbake til menyknappen', async () => {
    render(<Hovedmeny />)
    const meny = await apneMenyen()
    await userEvent.click(within(meny).getByRole('button', { name: /^Idéer for appen/ }))
    expect(screen.getByText('Idéene')).toBeTruthy()
    expect(meny.getAttribute('data-apen')).toBe('nei')
    expect(document.activeElement).toBe(menyknapp())
    await userEvent.click(screen.getByRole('button', { name: 'Til oppgaven' }))
    expect(screen.getByText('Oppgavene o1')).toBeTruthy()
    expect(screen.queryByText('Idéene')).toBeNull()

    await userEvent.click(within(await apneMenyen()).getByRole('button', { name: /^Planlagte oppgaver/ }))
    expect(screen.getByText('Oppgavene')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Til idéene' }))
    expect(screen.getByText('Idéene')).toBeTruthy()
  })

  it('har en prikk på knappen og på «Idéer for appen» når noen har kommentert noe nytt, og ser etter igjen når fanen får fokus', async () => {
    ideerMedNytt.antall = 2
    try {
      render(<Hovedmeny />)
      await waitFor(() => expect(menyknapp().getAttribute('aria-label')).toBe('Vis menyen (nye kommentarer på 2 idéer)'))
      expect(menyknapp().querySelector('.toppmeny__prikk')).not.toBeNull()
      const meny = await apneMenyen()
      expect(within(meny).getByRole('img', { name: 'nye kommentarer på 2 idéer' })).toBeTruthy()
      ideerMedNytt.antall = 1
      await act(async () => {
        window.dispatchEvent(new Event('focus'))
      })
      expect(menyknapp().getAttribute('aria-label')).toBe('Vis menyen (nye kommentarer på én idé)')
    } finally {
      ideerMedNytt.antall = 0
    }
  })

  it('glemmer tallet på nye idékommentarer når laget forsvinner, som ved utlogging', async () => {
    const { idestatus } = await import('../components/ideer/idevisning')
    ideerMedNytt.antall = 2
    try {
      const { unmount } = render(<Hovedmeny />)
      await waitFor(() => expect(idestatus.les()).toBe(2))
      unmount()
      expect(idestatus.les()).toBe(0)
    } finally {
      ideerMedNytt.antall = 0
    }
  })

  it('lukkes med Escape og Ctrl + M, med fokus tilbake til knappen, og holder fokus i menyen med tabulator', async () => {
    render(<Hovedmeny />)
    const meny = await apneMenyen()
    expect(document.activeElement).toBe(meny)
    await userEvent.keyboard('{Escape}')
    expect(meny.getAttribute('data-apen')).toBe('nei')
    expect(document.activeElement).toBe(menyknapp())

    await userEvent.keyboard('{Control>}m{/Control}')
    expect(meny.getAttribute('data-apen')).toBe('ja')
    // Tabulator bakover fra panelet går til det siste i menyen, ikke ut av den.
    await userEvent.tab({ shift: true })
    expect(meny.contains(document.activeElement)).toBe(true)
    await userEvent.keyboard('{Control>}m{/Control}')
    expect(meny.getAttribute('data-apen')).toBe('nei')
    expect(document.activeElement).toBe(menyknapp())
  })

  it('folder ut administrasjonen med bare «Brukere» og «Redaktører» for en lokal administrator, også med den gamle adminrollen', async () => {
    for (const r of ['user', 'admin']) {
      rolle.verdi = r
      systemarkitekt.verdi = false
      rett.verdi = { ...INGEN_RETTIGHETER, administrerer: [{ id: 'a', nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi', standard: true, apent: true, ikon: 'laboratorium' }], opprettBrukerI: ['a'] }
      render(<Hovedmeny />)
      const liste = await administrasjonen(await apneMenyen())
      expect(navnene(liste), r).toEqual(['Brukere', 'Redaktører'])
      await userEvent.click(within(liste).getByRole('button', { name: 'Brukere' }))
      expect(screen.getByText('Brukerlista')).toBeTruthy()
      // Et vindu den lokale administratoren ikke har, åpnes ikke selv om det bes om.
      const { apneAdminpanel } = await import('../components/konto/adminvisning')
      act(() => apneAdminpanel('datakilder'))
      expect(screen.queryByText('Datakildene')).toBeNull()
      cleanup()
    }
  })

  it('fører til brukerne, redaktørene, stillingene, datakildene, kurateringene, kildeovervåkingen, nødstoppen for verktøyene og autoerstatt-reglene', async () => {
    rolle.verdi = 'user'
    render(<Hovedmeny />)
    const liste = await administrasjonen(await apneMenyen())
    expect(navnene(liste)).toEqual(['Brukere', 'Redaktører', 'Stillinger', 'Datakilder', 'Kurateringer', 'Kildeovervåking', 'Kliniske verktøy', 'Autoerstatt'])
    await userEvent.click(within(liste).getByRole('button', { name: 'Brukere' }))
    expect(screen.getByText('Brukerlista')).toBeTruthy()
    expect(hovedmenyen().getAttribute('data-apen')).toBe('nei')
    expect(document.activeElement).toBe(menyknapp())

    await velgAdmin('Stillinger')
    expect(screen.getByText('Stillingslista')).toBeTruthy()
    await velgAdmin('Datakilder')
    expect(screen.getByText('Datakildene')).toBeTruthy()
    await velgAdmin('Kurateringer')
    expect(screen.getByText('Kurateringsoversikten')).toBeTruthy()
    await velgAdmin('Kildeovervåking')
    expect(screen.getByText('Kildeovervåkingen')).toBeTruthy()
    // En sikkerhetssak peker til nødstoppen, som åpnes i stedet for kildeovervåkingen.
    await userEvent.click(screen.getByRole('button', { name: 'Åpne nødstoppen' }))
    expect(screen.getByText('Nødstoppen')).toBeTruthy()
    expect(screen.queryByText('Kildeovervåkingen')).toBeNull()
    await velgAdmin('Kliniske verktøy')
    expect(screen.getByText('Nødstoppen')).toBeTruthy()
    await velgAdmin('Autoerstatt')
    expect(screen.getByText('Autoerstatt-reglene')).toBeTruthy()
  })

  it('har en prikk når en datakilde bør ses over, og ser etter på nytt når «Datakilder» lukkes', async () => {
    const na = new Date().toISOString()
    const kjoring = (kilde: Kjoring['kilde'], status: Kjoring['status']): Kjoring => ({
      kilde, id: 1, status, utlost_av: 'cron', startet_kl: na, avsluttet_kl: na, release: null, versjon: null,
      feil: status === 'feilet' ? 'Portalen svarte 503' : null, endringer: { klinisk: 0, metadata: 0, grunnlag: 0 },
    })
    const iOrden = DATAKILDER.map((k) => kjoring(k, 'uendret'))
    const status = vi.fn(async (): Promise<Datakildestatus> => ({
      kjoringer: iOrden.map((k) => (k.kilde === 'farmakologiportalen' ? kjoring(k.kilde, 'feilet') : k)),
      endringer: [],
    }))
    render(<Hovedmeny admin={{ leser: { status, hentNa: vi.fn() } }} />)
    // Første sjekk venter til appen er ledig (jsdom har ikke `requestIdleCallback`: et sekund).
    await waitFor(() => expect(menyknapp().getAttribute('aria-label')).toBe('Vis menyen (Farmakologiportalen bør ses over)'), { timeout: 3000 })
    expect(status).toHaveBeenCalledWith(1)
    expect(menyknapp().querySelector('.toppmeny__prikk')).toBeTruthy()
    const meny = await apneMenyen()
    expect(within(meny).getByRole('button', { name: /^Administrasjon/ }).querySelector('.nyprikk')).toBeTruthy()
    const liste = await administrasjonen(meny)
    expect(within(liste).getByRole('img', { name: 'Farmakologiportalen bør ses over' })).toBeTruthy()

    // Hentet på nytt og i orden: prikken forsvinner når panelet lukkes.
    status.mockResolvedValue({ kjoringer: iOrden, endringer: [] })
    await userEvent.click(within(liste).getByRole('button', { name: /^Datakilder/ }))
    expect(screen.getByText('Datakildene')).toBeTruthy()
    act(() => datakildepanel.lukk?.())
    await waitFor(() => expect(menyknapp().getAttribute('aria-label')).toBe('Vis menyen'))
    expect(menyknapp().querySelector('.toppmeny__prikk')).toBeNull()
  })

  it('viser en prikk når kildesakene ikke kan leses, så det aldri ser ut som at ingenting venter, og prøver igjen', async () => {
    const les = vi.fn(async (): Promise<Redaktoroversikt> => {
      throw new Error('Nettverket svarte ikke.')
    })
    render(<Hovedmeny admin={{ fagsaker: { les, beslutt: vi.fn() } }} />)
    await waitFor(() => expect(menyknapp().getAttribute('aria-label')).toBe('Vis menyen (kildeovervåkingen kunne ikke leses)'))
    const liste = await administrasjonen(await apneMenyen())
    expect(within(liste).getByRole('img', { name: 'kildeovervåkingen kunne ikke leses' })).toBeTruthy()

    // Neste sjekk lykkes: prikken forsvinner.
    les.mockResolvedValue({ saker: [], teknisk: 'normal', sist_kontrollert_kl: null })
    await userEvent.click(within(liste).getByRole('button', { name: /^Datakilder/ }))
    act(() => datakildepanel.lukk?.())
    await waitFor(() => expect(menyknapp().getAttribute('aria-label')).toBe('Vis menyen'))
  })

  it('har en prikk bare når en faglig sak venter på beslutning, ikke for tekniske avvik, og ser etter på nytt når et panel lukkes', async () => {
    const naa = new Date().toISOString()
    const sak: Fagsak = {
      id: '5', versjon: 3, fase: 'beslutning', alvor: 'faglig', prove: false, tittel: 'Kilden er revidert', endring: 'Ny takt.',
      kilde: { navn: 'Syntetisk kilde', lenke: null, sammenlignet_kl: naa }, berorte: [{ regel: 'r', versjon: 1, hva: 'takten' }],
      relevans: 'Planen kan bli for rask.', anbefaling: { valg: 'behold', begrunnelse: 'Syntetisk.', av: 'Claude' },
      valg: [{ valg: 'behold', na: [], deretter: ['Nytt grunnlag.'], verktoyet: 'Som før.' }, { valg: 'utsett', na: [], deretter: ['Venter.'], verktoyet: 'Som før.' }],
      status_na: 'Som før.', opprettet_kl: naa, nytt_innhold_kl: null, beslutning: null, tidligere: [], tiltak: [], avsluttet: null,
    }
    // Tekniske avvik alene (teknisk: oppfolging) gir ingen prikk.
    const les = vi.fn(async (): Promise<Redaktoroversikt> => ({ saker: [], teknisk: 'oppfolging', sist_kontrollert_kl: naa }))
    const fagsaker = { les, beslutt: vi.fn() }
    const { unmount } = render(<Hovedmeny admin={{ fagsaker }} />)
    // Første sjekk venter til appen er ledig (jsdom har ikke `requestIdleCallback`: et sekund).
    await waitFor(() => expect(les).toHaveBeenCalled(), { timeout: 3000 })
    expect(menyknapp().getAttribute('aria-label')).toBe('Vis menyen')
    expect(menyknapp().querySelector('.toppmeny__prikk')).toBeNull()
    unmount()

    les.mockResolvedValue({ saker: [sak], teknisk: 'normal', sist_kontrollert_kl: naa })
    render(<Hovedmeny admin={{ fagsaker }} />)
    await waitFor(() => expect(menyknapp().getAttribute('aria-label')).toBe('Vis menyen (Én faglig sak venter på beslutning)'), { timeout: 3000 })
    const liste = await administrasjonen(await apneMenyen())
    expect(within(liste).getByRole('img', { name: 'Én faglig sak venter på beslutning' })).toBeTruthy()

    // Besluttet: prikken forsvinner når et panel lukkes og det sjekkes på nytt.
    les.mockResolvedValue({ saker: [{ ...sak, fase: 'oppfolging' }], teknisk: 'normal', sist_kontrollert_kl: naa })
    await userEvent.click(within(liste).getByRole('button', { name: /^Datakilder/ }))
    act(() => datakildepanel.lukk?.())
    await waitFor(() => expect(menyknapp().getAttribute('aria-label')).toBe('Vis menyen'))
  })
})
