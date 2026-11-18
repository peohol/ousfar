// @vitest-environment jsdom
/**
 * Chatmenyen (D4a, docs/gruppechat.md, «Chatmenyen»): boblen med uleste,
 * «Mine grupper» og samtalelista, en samtale i menyen og den samme samtalen
 * på helsiden `#/chat`, «Gjenopprett», Escape gjennom lagstakken, at det å
 * åpne menyen ikke merker noe lest, og en samtale brukeren har mistet
 * tilgangen til.
 *
 * Økten, innstillingene, samtalelista og chattilstanden er erstattet;
 * chattilstanden er testchatten (`hjelp/testchat.ts`), og reglene for den
 * prøves i `gruppechat*.test.ts`.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Gruppechat as Chattilstand } from '../gruppechat/modell'
import type { Gruppesamtale } from '../gruppechat/samtaler'
import type { MineGrupper } from '../grupper/modell'
import { lagTestchat, TESTPERSONER } from './hjelp/testchat'

const tilstand = vi.hoisted(() => ({
  samtaler: [] as Gruppesamtale[],
  chat: new Map<string, Chattilstand>(),
  innstillinger: new Map<string, unknown>(),
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
