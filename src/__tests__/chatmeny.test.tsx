// @vitest-environment jsdom
/**
 * Chatmenyen (D4a, docs/gruppechat.md, «Chatmenyen»): boblen med uleste,
 * «Mine grupper» og samtalelista, en samtale i menyen og den samme samtalen
 * på helsiden `#/chat`, «Gjenopprett», Escape gjennom lagstakken, at det å
 * åpne menyen ikke merker noe lest, og en samtale brukeren har mistet
 * tilgangen til. Direktemeldingene (D5) i samme meny: radene i samme liste,
 * «Ny chat» og søket, samtalen med den låste linjen, og bryterne.
 *
 * Økten, innstillingene, samtalelista og chattilstanden er erstattet;
 * chattilstanden er testchatten (`hjelp/testchat.ts`), og reglene for den
 * prøves i `gruppechat*.test.ts`.
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Direktemeldinger } from '../direktemeldinger/useDirekte'
import type { Gruppechat as Chattilstand } from '../gruppechat/modell'
import type { Gruppesamtale } from '../gruppechat/samtaler'
import type { MineGrupper } from '../grupper/modell'
import { lagTestchat, TESTPERSONER } from './hjelp/testchat'

const tilstand = vi.hoisted(() => ({
  samtaler: [] as Gruppesamtale[],
  chat: new Map<string, Chattilstand>(),
  innstillinger: new Map<string, unknown>(),
  direkte: null as Direktemeldinger | null,
  api: {} as Record<string, ReturnType<typeof vi.fn>>,
}))

vi.mock('../auth/okt', () => ({ useProfil: () => ({ ...TESTPERSONER.meg, role: 'user' }) }))
vi.mock('../auth/avatarer', () => ({ useAvatarlenker: () => new Map() }))
vi.mock('../auth/innstillinger', () => ({
  hentInnstilling: vi.fn(async (nokkel: string) => tilstand.innstillinger.get(nokkel) ?? null),
  lagreSisteValg: (nokkel: string) => vi.fn(async (verdi: unknown) => void tilstand.innstillinger.set(nokkel, verdi)),
  lengdeinnstilling: () => ({ hent: async () => null, lagre: async () => undefined, sist: () => null }),
}))
vi.mock('../gruppechat/samtaler', async (importer) => ({
  ...(await importer<typeof import('../gruppechat/samtaler')>()),
  useGruppesamtaler: () => ({ samtaler: tilstand.samtaler, kjent: true, oppdater: () => undefined }),
}))
vi.mock('../gruppechat/useGruppechat', () => ({
  useGruppechat: (gruppe: string) => tilstand.chat.get(gruppe) ?? lagTestchat({ status: 'ingen_tilgang', meldinger: [] }),
}))
vi.mock('../direktemeldinger/useDirektesamtale', () => ({
  useDirektesamtale: (samtale: string) => tilstand.chat.get(samtale) ?? lagTestchat({ status: 'ingen_tilgang', meldinger: [] }),
}))
vi.mock('../direktemeldinger/useDirekte', async (importer) => {
  const ekte = await importer<typeof import('../direktemeldinger/useDirekte')>()
  const av: Direktemeldinger = { ...ekte.UTEN_DIREKTE, kjent: true, aktive: new Set(), settValg: async () => undefined, oppdater: () => undefined }
  return { ...ekte, useDirekte: () => tilstand.direkte ?? av }
})
vi.mock('../direktemeldinger/api', () => ({
  direkteapi: new Proxy({}, { get: (_, navn: string) => (tilstand.api[navn] ??= vi.fn(async () => undefined)) }),
}))

const { Chatmeny } = await import('../components/chat/Chatmeny')
const { Chatknapp } = await import('../components/chat/Chatknapp')
const { visGruppesamtale } = await import('../components/chat/chatstyring')
const { GruppekildeProvider } = await import('../grupper/kilde')
const { INGEN_GRUPPER } = await import('../grupper/modell')
const { Bevaringseier } = await import('../oppdatering/Bevaring')

const SANDKASSE = '11111111-1111-4111-8111-111111111111'
const FAGLIG = '22222222-2222-4222-8222-222222222222'
const ANDRES = '33333333-3333-4333-8333-333333333333'

const gruppe = (id: string, navn: string) => ({ id, navn, beskrivelse: '', art: 'tverrfaglig' as const, status: 'aktiv' as const, fagmiljo: null })

const GRUPPER: MineGrupper = {
  ...INGEN_GRUPPER,
  chat_aktivert: true,
  grupper: [
    { ...gruppe(SANDKASSE, 'Sandkassegruppen'), rolle: 'medlem', medlemmer: 8 },
    { ...gruppe(FAGLIG, 'Faglig utvikling'), rolle: 'ansvarlig', medlemmer: 5 },
  ],
}

type Rute = import('../domain/rute').Rute

/** Appen rundt menyen: ruten, veien dit og tilbake, som `useRute` gir dem. */
const INGENTING = () => undefined

function App({ start, gaaTilSpion, tilbakeSpion, grupper = GRUPPER, oppdaterGruppene = INGENTING }: {
  start: Rute
  gaaTilSpion: (r: Rute, valg?: { erstatt?: boolean }) => void
  tilbakeSpion: () => void
  grupper?: MineGrupper
  oppdaterGruppene?: () => void
}) {
  const [rute, setRute] = useState<Rute>(start)
  return (
    <Bevaringseier id={TESTPERSONER.meg.id}>
      <GruppekildeProvider verdi={{ ...grupper, oppdater: oppdaterGruppene }}>
        <Chatknapp />
        <main data-testid="siden">
          <button type="button">På siden</button>
        </main>
        <Chatmeny
          rute={rute}
          gaaTil={(r, valg) => {
            gaaTilSpion(r, valg)
            setRute(r)
          }}
          tilbake={() => {
            tilbakeSpion()
            setRute({ side: 'forside' })
          }}
        />
      </GruppekildeProvider>
    </Bevaringseier>
  )
}

let merkLest: ReturnType<typeof vi.fn<(nr: number) => void>>

beforeEach(() => {
  merkLest = vi.fn()
  tilstand.innstillinger.clear()
  tilstand.samtaler = [
    { gruppe: gruppe(SANDKASSE, 'Sandkassegruppen'), siste_kl: '2026-11-18T13:02:00Z', uleste: 2 },
    { gruppe: gruppe(FAGLIG, 'Faglig utvikling'), siste_kl: '2026-11-17T09:00:00Z', uleste: 0 },
  ]
  tilstand.chat.clear()
  tilstand.chat.set(SANDKASSE, lagTestchat({ merkLest, lestTilNr: 0 }))
  tilstand.chat.set(FAGLIG, lagTestchat({ merkLest }))
})

afterEach(() => {
  cleanup()
  delete document.documentElement.dataset.chatmeny
})

function vis(start: Rute = { side: 'forside' }, grupper?: MineGrupper) {
  const gaaTil = vi.fn()
  const tilbake = vi.fn()
  render(<App start={start} gaaTilSpion={gaaTil} tilbakeSpion={tilbake} grupper={grupper} />)
  return { gaaTil, tilbake }
}

const meny = () => screen.getByRole('complementary', { name: 'Grupper og samtaler' })

describe('chatmenyen', () => {
  it('står som en boble med alle uleste, og gir appen plass til den', () => {
    vis()
    expect(screen.getByRole('button', { name: 'Vis chat (2 uleste meldinger)' })).toBeTruthy()
    expect(document.documentElement.dataset.chatmeny).toBe('lukket')
    // Chatknappen for smale flater viser det samme.
    expect(screen.getByRole('button', { name: 'Chat (2 uleste meldinger)' })).toBeTruthy()
  })

  it('åpner med «Mine grupper» og samtalene, nyeste først, uten å merke noe lest', async () => {
    vis()
    await userEvent.click(screen.getByRole('button', { name: /Vis chat/ }))
    expect(document.documentElement.dataset.chatmeny).toBe('apen')
    expect(tilstand.innstillinger.get('chat.apen')).toBe(true)
    const grupper = within(meny()).getByRole('region', { name: /Mine grupper/ })
    expect(within(grupper).getByRole('link', { name: /Sandkassegruppen/ }).getAttribute('href')).toBe(`#/grupper/${SANDKASSE}`)
    expect(within(grupper).getByRole('link', { name: /Alle grupper/ }).getAttribute('href')).toBe('#/grupper')
    const rader = within(within(meny()).getByRole('region', { name: 'Samtaler' })).getAllByRole('button')
    expect(rader.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Sandkassegruppen'),
      expect.stringContaining('Faglig utvikling'),
    ])
    expect(rader[0]!.textContent).toContain('2 uleste meldinger')
    expect(merkLest).not.toHaveBeenCalled()
  })

  it('søker i samtalene', async () => {
    vis()
    await userEvent.click(screen.getByRole('button', { name: /Vis chat/ }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Søk i samtalene' }), 'faglig')
    const samtaler = within(meny()).getByRole('region', { name: 'Samtaler' })
    expect(within(samtaler).getAllByRole('button').map((r) => r.textContent)).toEqual([expect.stringContaining('Faglig utvikling')])
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Søk i samtalene' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Søk i samtalene' }), 'finnes ikke')
    expect(within(samtaler).getByText('Ingen samtaler passer med søket.')).toBeTruthy()
  })

  it('viser en samtale i menyen, og merker den lest når den vises', async () => {
    vis()
    await userEvent.click(screen.getByRole('button', { name: /Vis chat/ }))
    await userEvent.click(screen.getByRole('button', { name: /Sandkassegruppen/ }))
    expect(within(meny()).getByRole('heading', { name: 'Sandkassegruppen' })).toBeTruthy()
    expect(within(meny()).getByText('Gruppechat · 8 medlemmer')).toBeTruthy()
    expect(within(meny()).getByRole('link', { name: 'Til gruppen' }).getAttribute('href')).toBe(`#/grupper/${SANDKASSE}`)
    expect(within(meny()).getByRole('log', { name: 'Meldinger i Sandkassegruppen' })).toBeTruthy()
    expect(merkLest).toHaveBeenCalled()
    // Oversikten er skjult mens samtalen vises, og «Til alle samtaler» gir den tilbake.
    expect(within(meny()).queryByRole('region', { name: 'Samtaler' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Til alle samtaler' }))
    expect(within(meny()).getByRole('region', { name: 'Samtaler' })).toBeTruthy()
    expect(within(meny()).queryByRole('log')).toBeNull()
  })

  it('har alt chatfanen på gruppesiden hadde (D0 kart §2)', async () => {
    tilstand.chat.set(SANDKASSE, lagTestchat({ merkLest, flereEldre: true, kanModerere: true }))
    vis()
    await userEvent.click(screen.getByRole('button', { name: /Vis chat/ }))
    await userEvent.click(screen.getByRole('button', { name: /Sandkassegruppen/ }))
    const chat = meny()
    // Hvem som leser, meldingene etter dag med avsender, og eldre meldinger.
    expect(within(chat).getByText('Leses av de 3 medlemmene i gruppen og av systemarkitektene i OUSFAR.')).toBeTruthy()
    const logg = within(chat).getByRole('log', { name: 'Meldinger i Sandkassegruppen' })
    expect(within(logg).getAllByRole('heading', { level: 3 }).length).toBeGreaterThan(0)
    expect(logg.querySelectorAll('.chatmelding').length).toBe(5)
    expect(within(logg).getByRole('button', { name: 'Vis eldre meldinger' })).toBeTruthy()
    // Egne meldinger kan endres og slettes fra menyen på meldingen.
    expect(within(logg).getAllByRole('button', { name: /^Handlinger for meldingen fra/ }).length).toBeGreaterThan(0)
    // Skrivefeltet, med utkastet som følger gruppen.
    expect(within(chat).getByRole('textbox', { name: 'Melding til Sandkassegruppen' })).toBeTruthy()
  })

  it('utvider til #/chat med samme samtale og utkast, og gjenoppretter med menyen åpen på den', async () => {
    const { gaaTil, tilbake } = vis()
    await userEvent.click(screen.getByRole('button', { name: /Vis chat/ }))
    await userEvent.click(screen.getByRole('button', { name: /Sandkassegruppen/ }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Melding til Sandkassegruppen' }), 'Halvferdig')

    await userEvent.click(screen.getByRole('button', { name: 'Utvid' }))
    expect(gaaTil).toHaveBeenLastCalledWith({ side: 'chat', samtale: { type: 'gruppe', id: SANDKASSE } }, undefined)
    const helside = screen.getByRole('main', { name: 'Grupper og samtaler' })
    expect(within(helside).getByRole('heading', { level: 1, name: 'Grupper og samtaler' })).toBeTruthy()
    // Lista og samtalen side om side, med utkastet som var skrevet.
    expect(within(helside).getByRole('region', { name: 'Samtaler' })).toBeTruthy()
    expect((within(helside).getByRole('textbox', { name: 'Melding til Sandkassegruppen' }) as HTMLTextAreaElement).value).toBe('Halvferdig')

    // En annen samtale på helsiden bytter adressen uten ny oppføring i historikken.
    await userEvent.click(within(helside).getByRole('button', { name: /Faglig utvikling/ }))
    expect(gaaTil).toHaveBeenLastCalledWith({ side: 'chat', samtale: { type: 'gruppe', id: FAGLIG } }, { erstatt: true })
    // «Til alle samtaler» går til lista (i én kolonne på smale flater er den eneste veien dit).
    await userEvent.click(within(helside).getByRole('button', { name: 'Til alle samtaler' }))
    expect(gaaTil).toHaveBeenLastCalledWith({ side: 'chat' }, { erstatt: true })
    expect(within(helside).getByText('Velg en samtale.')).toBeTruthy()
    await userEvent.click(within(helside).getByRole('button', { name: /Sandkassegruppen/ }))

    await userEvent.click(within(helside).getByRole('button', { name: 'Gjenopprett' }))
    expect(tilbake).toHaveBeenCalledTimes(1)
    expect(within(meny()).getByRole('heading', { name: 'Sandkassegruppen' })).toBeTruthy()
    expect((within(meny()).getByRole('textbox', { name: 'Melding til Sandkassegruppen' }) as HTMLTextAreaElement).value).toBe('Halvferdig')
  })

  it('Escape på helsiden gjenoppretter; i menyen slipper den fokus og lar menyen stå', async () => {
    const { tilbake } = vis({ side: 'chat', samtale: { type: 'gruppe', id: FAGLIG } })
    expect(screen.getByRole('main', { name: 'Grupper og samtaler' })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(tilbake).toHaveBeenCalledTimes(1)
    expect(within(meny()).getByRole('heading', { name: 'Faglig utvikling' })).toBeTruthy()

    // Fokus i skrivefeltet gjør menyen til et lag; Escape slipper fokuset.
    const felt = within(meny()).getByRole('textbox', { name: 'Melding til Faglig utvikling' })
    act(() => felt.focus())
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(document.activeElement).not.toBe(felt)
    expect(document.documentElement.dataset.chatmeny).toBe('apen')
    // Neste Escape gjør ingenting med menyen.
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(tilbake).toHaveBeenCalledTimes(1)
    expect(document.documentElement.dataset.chatmeny).toBe('apen')
  })

  it('lukkeknappen lukker til boblen, og utkastet står der neste gang samtalen åpnes', async () => {
    vis()
    await userEvent.click(screen.getByRole('button', { name: /Vis chat/ }))
    await userEvent.click(screen.getByRole('button', { name: /Faglig utvikling/ }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Melding til Faglig utvikling' }), 'Husk meg')
    await userEvent.click(screen.getByRole('button', { name: 'Lukk chatten' }))
    expect(document.documentElement.dataset.chatmeny).toBe('lukket')
    expect(tilstand.innstillinger.get('chat.apen')).toBe(false)
    expect(screen.queryByRole('log')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Vis chat/ }))
    expect((screen.getByRole('textbox', { name: 'Melding til Faglig utvikling' }) as HTMLTextAreaElement).value).toBe('Husk meg')
  })

  it('en lenke kan åpne menyen på en bestemt gruppechat', async () => {
    vis()
    act(() => visGruppesamtale(FAGLIG))
    expect(document.documentElement.dataset.chatmeny).toBe('apen')
    expect(within(meny()).getByRole('heading', { name: 'Faglig utvikling' })).toBeTruthy()
  })

  it('en samtale som er bedt om før chatten er hentet (den gamle adressen), åpnes når menyen er klar', async () => {
    // Appen åpnes på `#/grupper/<id>/chat`: gruppesiden ber om samtalen før menyen vet at chatten er på.
    act(() => visGruppesamtale(FAGLIG))
    const egenskaper = { start: { side: 'grupper', gruppe: FAGLIG } as Rute, gaaTilSpion: vi.fn(), tilbakeSpion: vi.fn() }
    const { rerender } = render(<App {...egenskaper} grupper={{ ...GRUPPER, chat_aktivert: false }} />)
    await act(() => new Promise((ferdig) => requestAnimationFrame(() => ferdig(undefined))))
    expect(document.documentElement.dataset.chatmeny).toBeUndefined()
    rerender(<App {...egenskaper} grupper={GRUPPER} />)
    await waitFor(() => expect(document.documentElement.dataset.chatmeny).toBe('apen'))
    expect(within(meny()).getByRole('heading', { name: 'Faglig utvikling' })).toBeTruthy()
  })

  it('en samtale uten tilgang viser ingen gruppe, bare at tilgangen mangler', () => {
    // En adresse til en gruppe brukeren ikke er med i: verken navn eller lenke.
    vis({ side: 'chat', samtale: { type: 'gruppe', id: ANDRES } })
    const helside = screen.getByRole('main', { name: 'Grupper og samtaler' })
    expect(within(helside).getByRole('alert').textContent).toContain('Du har ikke lenger tilgang til denne gruppen.')
    expect(within(helside).queryByRole('link', { name: 'Til gruppen' })).toBeNull()
    expect(within(helside).queryByRole('textbox', { name: /Melding til/ })).toBeNull()
  })

  it('mister brukeren tilgangen mens samtalen står åpen, lukkes den (livstegnet)', async () => {
    const oppdaterGruppene = vi.fn()
    const app = (grupper = GRUPPER) => (
      <App start={{ side: 'forside' }} gaaTilSpion={vi.fn()} tilbakeSpion={vi.fn()} grupper={grupper} oppdaterGruppene={oppdaterGruppene} />
    )
    const { rerender } = render(app())
    await userEvent.click(screen.getByRole('button', { name: /Vis chat/ }))
    await userEvent.click(screen.getByRole('button', { name: /Sandkassegruppen/ }))
    expect(within(meny()).getByRole('log')).toBeTruthy()
    expect(oppdaterGruppene).not.toHaveBeenCalled()
    // Livstegnet gir `ingen_tilgang`; gruppen er borte fra lista og gruppene.
    tilstand.chat.set(SANDKASSE, lagTestchat({ status: 'ingen_tilgang', meldinger: [] }))
    tilstand.samtaler = tilstand.samtaler.filter((s) => s.gruppe.id !== SANDKASSE)
    const uten = { ...GRUPPER, grupper: GRUPPER.grupper.filter((g) => g.id !== SANDKASSE) }
    rerender(app(uten))
    // «Mine grupper» hentes på nytt med en gang, én gang.
    expect(oppdaterGruppene).toHaveBeenCalledTimes(1)
    expect(within(meny()).queryByRole('log')).toBeNull()
    expect(within(meny()).queryByRole('heading', { name: 'Sandkassegruppen' })).toBeNull()
    expect(within(meny()).getByRole('alert').textContent).toContain('Du har ikke lenger tilgang')
    await userEvent.click(screen.getByRole('button', { name: 'Til alle samtaler' }))
    const samtaler = within(meny()).getByRole('region', { name: 'Samtaler' })
    expect(within(samtaler).queryByText('Sandkassegruppen')).toBeNull()
    expect(within(meny()).queryByRole('link', { name: /Sandkassegruppen/ })).toBeNull()
  })

  it('en arkivert gruppe kan leses, men ingen kan skrive', () => {
    const arkivert = { ...GRUPPER, grupper: [{ ...gruppe(SANDKASSE, 'Sandkassegruppen'), status: 'arkivert' as const, rolle: null, medlemmer: 8 }] }
    tilstand.samtaler = []
    vis({ side: 'chat', samtale: { type: 'gruppe', id: SANDKASSE } }, arkivert)
    const helside = screen.getByRole('main', { name: 'Grupper og samtaler' })
    expect(within(helside).getByText('Gruppen er arkivert. Chatten kan leses, men ingen kan skrive i den.')).toBeTruthy()
    expect(within(helside).queryByRole('textbox', { name: /Melding til/ })).toBeNull()
    // Arkivert, og ikke medlem: ikke blant «Mine grupper».
    expect(within(helside).queryByRole('link', { name: /Sandkassegruppen/ })).toBeNull()
  })

  it('står ikke i appen når chatten er slått av', () => {
    vis({ side: 'forside' }, { ...GRUPPER, chat_aktivert: false })
    expect(screen.queryByRole('button', { name: /Vis chat/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /^Chat/ })).toBeNull()
    expect(document.documentElement.dataset.chatmeny).toBeUndefined()
  })
})

describe('direktemeldingene i chatmenyen', () => {
  const DM = '44444444-4444-4444-8444-444444444444'
  const kari = { ...TESTPERSONER.kari }
  let settValg: ReturnType<typeof vi.fn<Direktemeldinger['settValg']>>
  let oppdater: ReturnType<typeof vi.fn<() => void>>

  beforeEach(() => {
    settValg = vi.fn<Direktemeldinger['settValg']>(async () => undefined)
    oppdater = vi.fn<() => void>()
    tilstand.api = {}
    tilstand.direkte = {
      pa: true,
      kjent: true,
      samtaler: [{ id: DM, motpart: kari, siste_kl: '2026-11-18T14:00:00Z', uleste: 3, dempet: false, kan_skrive: false }],
      valg: { tillat_direktemeldinger: true, vis_aktiv: false },
      aktive: new Set([kari.id]),
      settValg,
      oppdater,
    }
    tilstand.chat.set(
      DM,
      lagTestchat({
        lesere: { medlemmer: 2, systemarkitekter: false },
        kanSkrive: false,
        direkte: { motpart: kari, sperre: 'mottaker', dempet: false },
      }),
    )
  })

  afterEach(() => {
    tilstand.direkte = null
  })

  const apneMenyen = async () => userEvent.click(screen.getByRole('button', { name: /Vis chat/ }))
  const samtalelista = () => within(meny()).getByRole('region', { name: 'Samtaler' })

  it('står i samme liste som gruppechattene, nyeste først, og teller med på boblen', async () => {
    vis()
    expect(screen.getByRole('button', { name: 'Vis chat (5 uleste meldinger)' })).toBeTruthy()
    await apneMenyen()
    const rader = within(samtalelista()).getAllByRole('listitem')
    expect(rader[0]!.textContent).toContain('Kari Testesen')
    expect(rader[0]!.textContent).toContain('Direktemelding')
    expect(within(rader[0]!).getByRole('img', { name: 'Aktiv nå' })).toBeTruthy()
    expect(rader[1]!.textContent).toContain('Sandkassegruppen')
  })

  it('en dempet samtale teller ikke på boblen', () => {
    tilstand.direkte = { ...tilstand.direkte!, samtaler: [{ ...tilstand.direkte!.samtaler[0]!, dempet: true }] }
    vis()
    expect(screen.getByRole('button', { name: 'Vis chat (2 uleste meldinger)' })).toBeTruthy()
  })

  it('viser samtalen med den andre øverst, hvem som leser og den låste linjen i stedet for skrivefeltet', async () => {
    vis()
    await apneMenyen()
    await userEvent.click(within(samtalelista()).getByRole('button', { name: /Kari Testesen/ }))
    expect(within(meny()).getByRole('heading', { name: 'Kari Testesen' })).toBeTruthy()
    expect(within(meny()).getByText('Direktemelding · @test.kari')).toBeTruthy()
    expect(within(meny()).getByText('Bare dere to kan lese samtalen.')).toBeTruthy()
    expect(within(meny()).getByText('Kari Testesen kan ikke motta nye direktemeldinger. Samtalen kan fortsatt leses.')).toBeTruthy()
    expect(within(meny()).queryByRole('textbox', { name: /Melding til/ })).toBeNull()
  })

  it('åpner samtalen fra adressen #/chat/direkte/<id>, og utvider til den', async () => {
    const { gaaTil } = vis()
    await apneMenyen()
    await userEvent.click(within(samtalelista()).getByRole('button', { name: /Kari Testesen/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Utvid' }))
    expect(gaaTil).toHaveBeenLastCalledWith({ side: 'chat', samtale: { type: 'direkte', id: DM } }, undefined)
    expect(within(screen.getByRole('main', { name: 'Grupper og samtaler' })).getByRole('heading', { name: 'Kari Testesen' })).toBeTruthy()
  })

  it('«Ny chat» søker etter personer og åpner samtalen med den som velges; Escape går tilbake', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      const ola = { id: TESTPERSONER.ola.id, username: 'test.ola', first_name: 'Ola', last_name: 'Prøvesen' }
      tilstand.api.sokDirektemottakere = vi.fn(async () => [ola, { id: kari.id, username: 'test.kari', first_name: 'Kari', last_name: 'Testesen' }])
      tilstand.api.aapneDirektesamtale = vi.fn(async () => DM)
      vis()
      await apneMenyen()
      await userEvent.click(within(meny()).getByRole('button', { name: 'Ny chat' }))
      expect(within(meny()).getByRole('heading', { name: 'Ny direktemelding' })).toBeTruthy()
      await userEvent.type(within(meny()).getByRole('searchbox', { name: 'Søk etter navn eller brukernavn' }), 'te')
      await act(async () => vi.advanceTimersByTimeAsync(300))
      expect(tilstand.api.sokDirektemottakere).toHaveBeenCalledWith('te')
      const treff = within(meny()).getByRole('list', { name: 'Treff' })
      expect(within(treff).getByText('@test.kari · Finnes alt en samtale')).toBeTruthy()
      expect(within(treff).getByText('@test.ola')).toBeTruthy()

      await userEvent.keyboard('{Escape}')
      await userEvent.keyboard('{Escape}')
      expect(within(meny()).queryByRole('heading', { name: 'Ny direktemelding' })).toBeNull()
      expect(within(meny()).getByRole('region', { name: 'Samtaler' })).toBeTruthy()

      await userEvent.click(within(meny()).getByRole('button', { name: 'Ny chat' }))
      await userEvent.type(within(meny()).getByRole('searchbox', { name: 'Søk etter navn eller brukernavn' }), 'kari')
      await act(async () => vi.advanceTimersByTimeAsync(300))
      await userEvent.click(within(meny()).getByRole('button', { name: /Kari Testesen/ }))
      expect(tilstand.api.aapneDirektesamtale).toHaveBeenCalledWith(kari.id)
      expect(oppdater).toHaveBeenCalled()
      expect(within(meny()).getByRole('heading', { name: 'Kari Testesen' })).toBeTruthy()
    } finally {
      vi.useRealTimers()
    }
  })

  it('«Ny chat» med direktemeldingene av ber om å slå dem på, og søker ikke', async () => {
    tilstand.direkte = { ...tilstand.direkte!, valg: { tillat_direktemeldinger: false, vis_aktiv: false } }
    vis()
    await apneMenyen()
    await userEvent.click(within(meny()).getByRole('button', { name: 'Ny chat' }))
    expect(within(meny()).queryByRole('searchbox')).toBeNull()
    await userEvent.click(within(meny()).getByRole('button', { name: 'Slå på' }))
    expect(settValg).toHaveBeenCalledWith({ tillat_direktemeldinger: true })
    expect(tilstand.api.sokDirektemottakere).toBeUndefined()
  })

  it('bryterne står nederst og lagrer valget', async () => {
    vis()
    await apneMenyen()
    const tillat = within(meny()).getByRole('switch', { name: /Tillat direktemeldinger/ }) as HTMLInputElement
    const aktiv = within(meny()).getByRole('switch', { name: /Vis når jeg er aktiv/ }) as HTMLInputElement
    expect(tillat.checked).toBe(true)
    expect(aktiv.checked).toBe(false)
    await userEvent.click(aktiv)
    expect(settValg).toHaveBeenCalledWith({ vis_aktiv: true })
  })

  it('uten direktemeldinger slått på står verken «Ny chat», bryterne eller direktesamtalene der', async () => {
    tilstand.direkte = null
    vis({ side: 'chat', samtale: { type: 'direkte', id: DM } })
    const helside = screen.getByRole('main', { name: 'Grupper og samtaler' })
    expect(within(helside).queryByRole('button', { name: 'Ny chat' })).toBeNull()
    expect(within(helside).queryByRole('switch')).toBeNull()
    expect(within(helside).queryByRole('heading', { name: 'Kari Testesen' })).toBeNull()
    expect(within(helside).getByText('Velg en samtale.')).toBeTruthy()
  })

  it('blokkering bekreftes først, og lista og samtalene hentes på nytt etterpå', async () => {
    tilstand.chat.set(DM, lagTestchat({ kanSkrive: true, direkte: { motpart: kari, sperre: null, dempet: false } }))
    tilstand.api.blokkerBruker = vi.fn(async () => undefined)
    vis()
    await apneMenyen()
    await userEvent.click(within(samtalelista()).getByRole('button', { name: /Kari Testesen/ }))
    await userEvent.click(within(meny()).getByRole('button', { name: 'Valg for samtalen med Kari Testesen' }))
    await userEvent.click(screen.getByRole('button', { name: 'Blokker Kari Testesen' }))
    expect(tilstand.api.blokkerBruker).not.toHaveBeenCalled()
    await userEvent.click(within(within(meny()).getByRole('group', { name: 'Blokkere Kari Testesen?' })).getByRole('button', { name: 'Blokker' }))
    expect(tilstand.api.blokkerBruker).toHaveBeenCalledWith(kari.id)
    expect(oppdater).toHaveBeenCalled()
  })
})
