// @vitest-environment jsdom
/**
 * P7 tråd B: chatvisningen på gruppesiden (docs/gruppechat.md,
 * «Brukerflaten»), prøvd mot testchatten i minnet (`useTestchat`), så den er
 * uavhengig av databasen og sanntiden. Fanen og adressen prøves med
 * gruppesiden og kallene erstattet. Tilgangen selv prøves i databasen (tråd
 * A). Bare syntetiske personer og meldinger.
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, type MutableRefObject } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profil } from '@delt/profil'
import { PASIENTREGEL } from '@delt/pasientopplysninger'
import type { Gruppechat as Chattilstand } from '../gruppechat/modell'
import { syntetiskPersonnummer } from './hjelp/syntetiskPersonnummer'
import { lagTestchat, syntetiskeMeldinger, TESTPERSONER, useTestchat, type Testchatstyring, type Testchatvalg } from './hjelp/testchat'

const GRUPPE_ID = '0f1e2d3c-4b5a-4968-8776-655443322110'

const MEG: Profil = {
  id: TESTPERSONER.meg.id,
  username: 'test.meg',
  first_name: 'Test',
  last_name: 'Meg',
  role: 'user',
  avatar_path: null,
  must_change_password: false,
  onboarding_completed: true,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

const api = vi.hoisted(() => ({
  oversikt: null as unknown,
  hentGruppeoversikt: vi.fn(),
  svarPaaInvitasjon: vi.fn(),
  avsluttGruppemedlemskap: vi.fn(),
  settGrupperolle: vi.fn(),
  inviterTilGruppe: vi.fn(),
  opprettGruppe: vi.fn(),
  arkiverGruppe: vi.fn(),
  endreGruppe: vi.fn(),
}))

/** Den innloggede; testene for utkastene bytter konto i samme appinstans. */
let innlogget: Profil = MEG
vi.mock('../auth/okt', () => ({ useProfil: () => innlogget }))
vi.mock('../auth/avatarer', () => ({ useAvatarlenker: () => new Map() }))
vi.mock('../grupper/api', () => api)
// Tilstanden fra sanntiden (tråd C) er prøvd for seg; her gir den testchatten.
const krok = vi.hoisted(() => ({ useGruppechat: vi.fn() }))
vi.mock('../gruppechat/useGruppechat', () => krok)

const { Gruppechat } = await import('../components/grupper/Gruppechat')
const { meldOktskifte } = await import('../auth/oktskifte')
const { Bevaringseier } = await import('../oppdatering/Bevaring')
const { Grupperside } = await import('../components/grupper/Grupperside')
const { GruppekildeProvider } = await import('../grupper/kilde')
const { INGEN_GRUPPER, lesGruppeoversikt } = await import('../grupper/modell')
const { adresse, lesRute, sidesti } = await import('../domain/rute')
const visning = await import('../components/grupper/gruppechatvisning')

const GRUPPE = { id: GRUPPE_ID, navn: 'Litiumgruppen', status: 'aktiv' as const }
/** Gruppen i hver test, med sin egen ID, så utkastet fra én test ikke står i neste. */
let gruppen = GRUPPE

type Styring = Chattilstand & Testchatstyring

/** Chatten med testchatten bak; `styring` gir testen tilgang til den, som «noen andre skriver». */
function Prove({ valg, styring, arkivert = false }: { valg?: Testchatvalg; styring?: MutableRefObject<Styring | null>; arkivert?: boolean }) {
  const chat = useTestchat(valg)
  useEffect(() => {
    if (styring) styring.current = chat
  })
  return <Gruppechat chat={chat} gruppe={{ ...gruppen, status: arkivert ? 'arkivert' : 'aktiv' }} />
}

const styring = () => ({ current: null }) as MutableRefObject<Styring | null>
const logg = () => screen.getByRole('log', { name: 'Meldinger i Litiumgruppen' })
const felt = () => screen.getByRole('textbox', { name: 'Melding til Litiumgruppen' })
const meldingstekster = () => [...logg().querySelectorAll('.chatmelding__tekst, .chatmelding__slettet')].map((p) => p.textContent)

/** Lista later som den har rullet opp: høyere enn den er, og ikke nederst. */
function rullOpp(el: HTMLElement) {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 2000 })
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: 400 })
  el.scrollTop = 600
  fireEvent.scroll(el)
}

let pekeren: 'fin' | 'grov' = 'fin'

beforeEach(() => {
  innlogget = MEG
  gruppen = { ...GRUPPE, id: crypto.randomUUID() }
  pekeren = 'fin'
  window.matchMedia = ((sporring: string) => ({
    matches: sporring.includes('coarse') ? pekeren === 'grov' : false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia
  window.scrollTo = () => undefined
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('det rene', () => {
  it('sier hvem som leser, med og uten systemarkitektene', () => {
    expect(visning.lesertekst({ medlemmer: 4, systemarkitekter: true })).toBe('Leses av de 4 medlemmene i gruppen og av systemarkitektene i OUSFAR.')
    expect(visning.lesertekst({ medlemmer: 1, systemarkitekter: false })).toBe('Leses av det ene medlemmet i gruppen.')
    // En arkivert gruppe har ingen aktive medlemmer og leses bare av systemarkitektene.
    expect(visning.lesertekst({ medlemmer: 0, systemarkitekter: true })).toBe('Leses av systemarkitektene i OUSFAR.')
    expect(visning.lesertekst({ medlemmer: 1, systemarkitekter: true })).toBe('Leses av det ene medlemmet i gruppen og av systemarkitektene i OUSFAR.')
    expect(visning.lesertekst({ medlemmer: 0, systemarkitekter: false })).toBe('Ingen kan lese chatten nå.')
  })

  it('teller bare nær grensen, og sier fra når det er for mye', () => {
    expect(visning.tegnteller('a'.repeat(89), 100)).toBeNull()
    expect(visning.tegnteller('a'.repeat(99), 100)).toEqual({ tekst: '1 tegn igjen', over: false })
    expect(visning.tegnteller('a'.repeat(103), 100)).toEqual({ tekst: '3 tegn for mye', over: true })
    expect(visning.kanSendes('   ', 100)).toBe(false)
    expect(visning.kanSendes(' hei ', 100)).toBe(true)
    expect(visning.kanSendes('a'.repeat(101), 100)).toBe(false)
  })

  it('setter meldinger fra samme avsender tett etter hverandre sammen, men ikke over dager eller pauser', () => {
    const [a, b] = syntetiskeMeldinger(2)
    const lik = { ...b!, forfatter: a!.forfatter }
    expect(visning.henger(a, { ...lik, skrevet_kl: new Date(Date.parse(a!.skrevet_kl) + 60_000).toISOString() })).toBe(true)
    expect(visning.henger(a, { ...lik, skrevet_kl: new Date(Date.parse(a!.skrevet_kl) + visning.SAMMENHENGENDE_MS + 1).toISOString() })).toBe(false)
    expect(visning.henger(a, b!)).toBe(false)
    expect(visning.henger(undefined, a!)).toBe(false)
  })

  it('kaller dagene i dag, i går og med ukedag og dato', () => {
    const naa = new Date(2026, 10, 17, 12, 0)
    expect(visning.dagsnavn(new Date(2026, 10, 17, 8, 0).toISOString(), naa)).toBe('I dag')
    expect(visning.dagsnavn(new Date(2026, 10, 16, 23, 0).toISOString(), naa)).toBe('I går')
    expect(visning.dagsnavn(new Date(2026, 10, 12, 8, 0).toISOString(), naa)).toMatch(/^Torsdag 12\. november$/)
    expect(visning.dagsnavn(new Date(2025, 10, 12, 8, 0).toISOString(), naa)).toMatch(/2025/)
  })
})

describe('chatten', () => {
  it('viser hvem som leser og meldingene med avsender, klokkeslett og dag', () => {
    render(<Prove />)
    expect(screen.getByText('Leses av de 3 medlemmene i gruppen og av systemarkitektene i OUSFAR.')).toBeTruthy()
    const liste = logg()
    expect(liste.getAttribute('aria-live')).toBe('polite')
    expect(liste.getAttribute('aria-relevant')).toBe('additions')
    expect(meldingstekster()).toEqual([1, 2, 3, 4, 5].map((nr) => `Syntetisk melding ${nr}`))
    expect(within(liste).getAllByText('Kari Testesen').length).toBeGreaterThan(0)
    expect(liste.querySelector('time')?.getAttribute('dateTime')).toBe('2026-11-16T08:00:00.000Z')
    expect(within(liste).getByRole('heading', { level: 3 })).toBeTruthy()
    // Ingen påminnelse om pasientopplysninger (Peder 17.11.2026); feltet beskrives bare av tastehjelpen og telleren.
    const beskrevet = felt().getAttribute('aria-describedby')!.split(' ').map((id) => document.getElementById(id)?.textContent ?? '')
    expect(beskrevet.join(' ')).not.toMatch(/pasientopplysninger|fødselsnummer/i)
  })

  it('setter egne meldinger i bobler til høyre uten synlig «(deg)», men sier det til skjermlesere', () => {
    render(<Prove />)
    const egen = logg().querySelector<HTMLElement>('[data-nr="2"]')!
    const annen = logg().querySelector<HTMLElement>('[data-nr="1"]')!
    // Siden (`data-egen`) styrer plasseringen i stilen; teksten står i en boble i begge.
    expect(egen.hasAttribute('data-egen')).toBe(true)
    expect(annen.hasAttribute('data-egen')).toBe(false)
    for (const rad of [egen, annen]) expect(rad.querySelector('.chatmelding__boble')?.textContent).toMatch(/^Syntetisk melding/)
    const deg = within(egen).getByText('(deg)', { exact: false })
    expect(deg.classList.contains('kun-skjermleser')).toBe(true)
    expect(within(annen).queryByText('(deg)', { exact: false })).toBeNull()
  })

  it('sender med Enter, gir ny linje med Shift + Enter, og sender med knappen', async () => {
    render(<Prove />)
    await userEvent.type(felt(), 'Første linje{Shift>}{Enter}{/Shift}andre linje')
    expect((felt() as HTMLTextAreaElement).value).toBe('Første linje\nandre linje')
    await userEvent.type(felt(), '{Enter}')
    expect(meldingstekster().at(-1)).toBe('Første linje\nandre linje')
    expect((felt() as HTMLTextAreaElement).value).toBe('')
    expect(document.activeElement).toBe(felt())

    await userEvent.type(felt(), 'Med knappen')
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(meldingstekster().at(-1)).toBe('Med knappen')
  })

  it('sender ikke tom tekst', async () => {
    render(<Prove />)
    expect(screen.getByRole('button', { name: 'Send' })).toHaveProperty('disabled', true)
    await userEvent.type(felt(), '   {Enter}')
    expect(meldingstekster()).toHaveLength(5)
  })

  it('på berøringsskjerm gir Enter ny linje, og Send-knappen sender', async () => {
    pekeren = 'grov'
    render(<Prove />)
    await userEvent.type(felt(), 'Hei{Enter}der')
    expect((felt() as HTMLTextAreaElement).value).toBe('Hei\nder')
    expect(meldingstekster()).toHaveLength(5)
    await userEvent.click(screen.getByRole('button', { name: 'Send' }))
    expect(meldingstekster().at(-1)).toBe('Hei\nder')
  })

  it('viser en melding som ikke ble sendt, med feilen, «Prøv igjen» og «Forkast»', async () => {
    const fort = 'Du sender meldinger for fort. Vent litt og prøv igjen.'
    const { rerender } = render(<Prove valg={{ sendefeil: fort }} />)
    await userEvent.type(felt(), 'For fort{Enter}')
    expect(screen.getByRole('alert').textContent).toBe(`Ikke sendt: ${fort}`)
    expect(meldingstekster().at(-1)).toBe('For fort')

    rerender(<Prove valg={{ sendefeil: null }} />)
    await userEvent.click(screen.getByRole('button', { name: 'Prøv igjen' }))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(meldingstekster().filter((t) => t === 'For fort')).toHaveLength(1)

    rerender(<Prove valg={{ sendefeil: fort }} />)
    await userEvent.type(felt(), 'Forkastes{Enter}')
    await userEvent.click(screen.getByRole('button', { name: 'Forkast' }))
    expect(meldingstekster()).not.toContain('Forkastes')
  })

  it('advarer ikke mens det skrives, men viser avslaget fra databasen', async () => {
    render(<Prove />)
    await userEvent.type(felt(), `Se ${syntetiskPersonnummer(14, 3, 87)}`)
    expect(screen.queryByRole('alert')).toBeNull()
    await userEvent.type(felt(), '{Enter}')
    expect(screen.getAllByRole('alert').map((a) => a.textContent)).toContain(`Ikke sendt: ${PASIENTREGEL.avvist}`)
  })

  it('viser «Sender …» mens en melding venter', () => {
    render(
      <Gruppechat
        chat={lagTestchat({ ventende: [{ klient_id: 'k', tekst: 'På vei', sendt_kl: '2026-11-17T10:00:00Z', status: 'sender', feil: null }] })}
        gruppe={GRUPPE}
      />,
    )
    expect(within(logg()).getByText('Sender …')).toBeTruthy()
  })

  it('teller tegnene nær grensen, og sender ikke for lang tekst', async () => {
    render(<Gruppechat chat={lagTestchat({ grenser: { maks_tegn: 10, maks_per_minutt: 20 } })} gruppe={GRUPPE} />)
    await userEvent.type(felt(), '123456789')
    expect(screen.getByText('1 tegn igjen')).toBeTruthy()
    await userEvent.type(felt(), 'abc')
    expect(screen.getByText('2 tegn for mye')).toBeTruthy()
    expect(felt().getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByRole('button', { name: 'Send' })).toHaveProperty('disabled', true)
  })
})

describe('endre og slette', () => {
  const menyknapp = (nr: number) => {
    const rad = logg().querySelector<HTMLElement>(`[data-nr="${nr}"]`)!
    return within(rad).getByRole('button', { name: /^Handlinger for meldingen fra/ })
  }

  it('lar forfatteren endre en melding på stedet, med Enter, og avbryte med Escape', async () => {
    render(<Prove />)
    // Melding 2 er den innloggedes egen; 1 og 3 er andres og har ingen meny for et vanlig medlem.
    expect(logg().querySelector('[data-nr="1"] button')).toBeNull()
    expect(logg().querySelector('[data-nr="3"] button')).toBeNull()
    await userEvent.click(menyknapp(2))
    await userEvent.click(screen.getByRole('button', { name: 'Endre' }))
    const endring = screen.getByRole('textbox', { name: 'Meldingen' })
    expect(document.activeElement).toBe(endring)
    await userEvent.clear(endring)
    await userEvent.type(endring, 'Rettet{Enter}')
    await waitFor(() => expect(meldingstekster()[1]).toBe('Rettet (redigert)'))
    await waitFor(() => expect(document.activeElement).toBe(menyknapp(2)))

    await userEvent.click(menyknapp(2))
    await userEvent.click(screen.getByRole('button', { name: 'Endre' }))
    await userEvent.type(screen.getByRole('textbox', { name: 'Meldingen' }), ' mer{Escape}')
    expect(screen.queryByRole('textbox', { name: 'Meldingen' })).toBeNull()
    expect(meldingstekster()[1]).toBe('Rettet (redigert)')
  })

  it('sletter en egen melding etter bekreftelse, og viser at den er slettet', async () => {
    render(<Prove />)
    await userEvent.click(menyknapp(2))
    await userEvent.click(screen.getByRole('button', { name: 'Slett' }))
    const bekreft = screen.getByRole('group', { name: 'Slette meldingen?' })
    expect(document.activeElement).toBe(within(bekreft).getByRole('button', { name: 'Avbryt' }))
    await userEvent.click(within(bekreft).getByRole('button', { name: 'Slett meldingen' }))
    await waitFor(() => expect(meldingstekster()[1]).toBe('Meldingen er slettet'))
    // En slettet melding har ingen handlinger.
    expect(logg().querySelector('[data-nr="2"] button')).toBeNull()
  })

  it('lar en moderator fjerne andres meldinger, men ikke endre dem', async () => {
    render(<Prove valg={{ meldinger: syntetiskeMeldinger(3).map((m) => ({ ...m, kan_slette: true })), kanModerere: true }} />)
    await userEvent.click(menyknapp(1))
    expect(screen.queryByRole('button', { name: 'Endre' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /^Fjern meldingen/ }))
    await userEvent.click(within(screen.getByRole('group', { name: 'Fjerne meldingen fra Ola Prøvesen?' })).getByRole('button', { name: 'Fjern meldingen' }))
    await waitFor(() => expect(meldingstekster()[0]).toBe('Fjernet av en moderator'))
  })

  it('lukker menyen med Escape og gir fokus tilbake til knappen', async () => {
    render(<Prove />)
    await userEvent.click(menyknapp(2))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Endre' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('button', { name: 'Endre' })).toBeNull()
    expect(document.activeElement).toBe(menyknapp(2))
  })
})

describe('rullingen og historikken', () => {
  it('følger nye meldinger nederst, og merker dem lest', () => {
    const s = styring()
    render(<Prove styring={s} />)
    act(() => s.current!.utenfra('Ny fra Kari'))
    expect(meldingstekster().at(-1)).toBe('Ny fra Kari')
    expect(screen.queryByRole('button', { name: /ny melding/ })).toBeNull()
    expect(s.current!.lestTilNr).toBe(6)
  })

  it('står stille når brukeren har rullet opp, og «N nye meldinger» tar hen ned', async () => {
    const s = styring()
    render(<Prove styring={s} />)
    rullOpp(logg())
    act(() => s.current!.utenfra('Én'))
    act(() => s.current!.utenfra('To', TESTPERSONER.ola))
    const knapp = screen.getByRole('button', { name: '2 nye meldinger' })
    expect(logg().scrollTop).toBe(600)
    // Ikke lest mens de ikke er synlige.
    expect(s.current!.lestTilNr).toBe(5)
    await userEvent.click(knapp)
    expect(screen.queryByRole('button', { name: /nye meldinger/ })).toBeNull()
    expect(s.current!.lestTilNr).toBe(7)
  })

  it('henter eldre meldinger med «Vis eldre meldinger», til det ikke er flere', async () => {
    render(<Prove valg={{ meldinger: syntetiskeMeldinger(70), side: 30 }} />)
    expect(meldingstekster()).toHaveLength(30)
    expect(meldingstekster()[0]).toBe('Syntetisk melding 41')
    await userEvent.click(screen.getByRole('button', { name: 'Vis eldre meldinger' }))
    expect(meldingstekster()).toHaveLength(60)
    await userEvent.click(screen.getByRole('button', { name: 'Vis eldre meldinger' }))
    expect(meldingstekster()).toHaveLength(70)
    expect(screen.queryByRole('button', { name: 'Vis eldre meldinger' })).toBeNull()
  })

  it('henter eldre av seg selv ved toppen', () => {
    render(<Prove valg={{ meldinger: syntetiskeMeldinger(40), side: 30 }} />)
    const el = logg()
    Object.defineProperty(el, 'scrollHeight', { configurable: true, value: 2000 })
    Object.defineProperty(el, 'clientHeight', { configurable: true, value: 400 })
    el.scrollTop = 10
    fireEvent.scroll(el)
    expect(meldingstekster()).toHaveLength(40)
  })

  it('markerer de nye siden sist med «Nye meldinger»', () => {
    render(<Gruppechat chat={lagTestchat({ lestTilNr: 3 })} gruppe={GRUPPE} />)
    expect(within(logg()).getByText('Nye meldinger').closest('li')?.nextElementSibling?.getAttribute('data-nr')).toBe('4')
  })
})

describe('tilstandene', () => {
  it('viser ingen meldinger og intet skrivefelt uten tilgang', () => {
    render(<Gruppechat chat={lagTestchat({ status: 'ingen_tilgang' })} gruppe={GRUPPE} />)
    expect(screen.getByRole('alert').textContent).toBe('Du har ikke lenger tilgang til denne gruppen.')
    expect(screen.queryByRole('log')).toBeNull()
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.queryByText(/Syntetisk melding/)).toBeNull()
  })

  it('viser historikken uten skrivefelt i en arkivert gruppe, og ingen kan endre', async () => {
    // Databasen lar bare en systemarkitekt slette i en arkivert gruppe: her melding 1.
    const meldinger = syntetiskeMeldinger(5).map((m) => ({ ...m, kan_slette: m.nr === 1 }))
    render(<Prove arkivert valg={{ meldinger }} />)
    expect(meldingstekster()).toHaveLength(5)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('Gruppen er arkivert. Chatten kan leses, men ingen kan skrive i den.')).toBeTruthy()
    // Egne meldinger (2 og 5) kan ikke endres i en arkivert gruppe, selv om de ellers kunne.
    expect(logg().querySelector('[data-nr="2"] button')).toBeNull()
    await userEvent.click(within(logg().querySelector<HTMLElement>('[data-nr="1"]')!).getByRole('button', { name: /^Handlinger/ }))
    expect(screen.queryByRole('button', { name: 'Endre' })).toBeNull()
    expect(screen.getByRole('button', { name: /^Fjern meldingen/ })).toBeTruthy()
  })

  it('viser lasting, feil, frakobling og en tom chat', () => {
    const { rerender } = render(<Gruppechat chat={lagTestchat({ status: 'laster' })} gruppe={GRUPPE} />)
    expect(screen.getByRole('status').textContent).toBe('Henter meldingene …')
    rerender(<Gruppechat chat={lagTestchat({ status: 'feil', feil: 'Gruppechatten er ikke slått på.' })} gruppe={GRUPPE} />)
    expect(screen.getByRole('alert').textContent).toBe('Gruppechatten er ikke slått på.')
    rerender(<Gruppechat chat={lagTestchat({ tilkobling: 'kobler_til' })} gruppe={GRUPPE} />)
    expect(screen.getByRole('status').textContent).toBe('Kobler til igjen …')
    rerender(<Gruppechat chat={lagTestchat({ meldinger: [] })} gruppe={GRUPPE} />)
    expect(screen.getByText('Ingen meldinger ennå. Skriv den første.')).toBeTruthy()
  })

  it('lar den som ikke kan skrive, lese uten skrivefelt', () => {
    render(<Gruppechat chat={lagTestchat({ kanSkrive: false })} gruppe={GRUPPE} />)
    expect(screen.queryByRole('textbox')).toBeNull()
    expect(screen.getByText('Du kan lese chatten, men ikke skrive i den.')).toBeTruthy()
  })

  it('beholder utkastet når man går fra chatten og tilbake', async () => {
    const { unmount } = render(<Prove />)
    await userEvent.type(felt(), 'Halvskrevet')
    unmount()
    render(<Prove />)
    expect((felt() as HTMLTextAreaElement).value).toBe('Halvskrevet')
    await userEvent.clear(felt())
  })
})

describe('utkastene hører til den innloggede', () => {
  const B: Profil = { ...MEG, id: '00000000-0000-4000-8000-0000000000b2', username: 'test.b', first_name: 'Test', last_name: 'B' }
  /** Som i appen: utkastet bevares under kontoen (`Bevaringseier`). */
  const SomInnlogget = () => (
    <Bevaringseier id={innlogget.id}>
      <Prove />
    </Bevaringseier>
  )

  it('B får aldri As utkast etter at A logger ut og B logger inn i samme fane', async () => {
    const a = render(<SomInnlogget />)
    await userEvent.type(felt(), 'Utkast fra A')
    // A går til en annen fane i gruppen og tilbake: utkastet står.
    a.unmount()
    const igjen = render(<SomInnlogget />)
    expect((felt() as HTMLTextAreaElement).value).toBe('Utkast fra A')
    igjen.unmount()

    // A logger ut, B logger inn i samme appinstans og åpner den samme gruppen.
    act(() => meldOktskifte())
    innlogget = B
    render(<SomInnlogget />)
    expect((felt() as HTMLTextAreaElement).value).toBe('')
  })

  it('skiller utkastene etter kontoen også uten et meldt øktskifte', async () => {
    const a = render(<SomInnlogget />)
    await userEvent.type(felt(), 'Bare for A')
    a.unmount()
    innlogget = B
    const b = render(<SomInnlogget />)
    expect((felt() as HTMLTextAreaElement).value).toBe('')
    b.unmount()
    // A er tilbake (uten skifte imellom): As eget utkast står fortsatt.
    innlogget = MEG
    render(<SomInnlogget />)
    expect((felt() as HTMLTextAreaElement).value).toBe('Bare for A')
    await userEvent.clear(felt())
  })

  it('glemmer utkastet når tilgangen til gruppen er tapt', async () => {
    const a = render(<SomInnlogget />)
    await userEvent.type(felt(), 'Skrevet før tilgangen gikk')
    a.unmount()
    const uten = render(<Gruppechat chat={lagTestchat({ status: 'ingen_tilgang' })} gruppe={gruppen} />)
    uten.unmount()
    render(<SomInnlogget />)
    expect((felt() as HTMLTextAreaElement).value).toBe('')
  })
})

describe('chatpanelet på gruppesiden og chatsiden', () => {
  const OVERSIKT = {
    ...GRUPPE,
    beskrivelse: '',
    art: 'tverrfaglig',
    fagmiljo: null,
    opprettet_kl: '2026-11-01T00:00:00Z',
    rolle: 'medlem',
    kan_styre: false,
    kan_moderere: false,
    kan_forlate: true,
    kan_gjenapne: false,
    medlemmer: [],
  }

  const vis = (fane?: 'chat') =>
    render(
      <GruppekildeProvider verdi={{ ...INGEN_GRUPPER, oppdater: () => undefined }}>
        <Grupperside gruppe={GRUPPE_ID} fane={fane} onLukk={() => undefined} />
      </GruppekildeProvider>,
    )

  beforeEach(() => {
    krok.useGruppechat.mockImplementation(() => lagTestchat())
  })

  const visMed = (samhandling: Record<string, unknown>, fane?: 'chat') => {
    api.hentGruppeoversikt.mockImplementation(async () => lesGruppeoversikt({ ...OVERSIKT, samhandling }))
    return vis(fane)
  }

  it('leser og skriver adressen til chatten', () => {
    expect(lesRute(`#/grupper/${GRUPPE_ID}/chat`)).toEqual({ side: 'grupper', gruppe: GRUPPE_ID, fane: 'chat' })
    expect(lesRute(`#/grupper/${GRUPPE_ID}/CHAT/`)).toEqual({ side: 'grupper', gruppe: GRUPPE_ID, fane: 'chat' })
    expect(adresse({ side: 'grupper', gruppe: GRUPPE_ID, fane: 'chat' })).toBe(`#/grupper/${GRUPPE_ID}/chat`)
    expect(sidesti({ side: 'grupper', gruppe: GRUPPE_ID, fane: 'chat' })).toBe(`grupper/${GRUPPE_ID}`)
  })

  it('står ikke uten tallet fra databasen (chatten er avslått)', async () => {
    visMed({ nye_ideer: 0, venter: 0, mine_oppgaver: 0 })
    await screen.findByRole('region', { name: 'Idéer' })
    expect(screen.queryByRole('region', { name: 'Gruppechat' })).toBeNull()
    expect(screen.queryByRole('link', { name: /chat/i })).toBeNull()
  })

  it('står med tallet på uleste og lenken til chatten når den er slått på', async () => {
    visMed({ nye_ideer: 0, venter: 0, mine_oppgaver: 0, chat_uleste: 4 })
    const panel = await screen.findByRole('region', { name: 'Gruppechat' })
    expect(panel.textContent).toMatch(/4 uleste meldinger/)
    expect(within(panel).getByRole('link', { name: 'Åpne chat' }).getAttribute('href')).toBe(`#/grupper/${GRUPPE_ID}/chat`)
  })

  it('viser chatten på sin egen side, som før', async () => {
    visMed({ nye_ideer: 0, venter: 0, mine_oppgaver: 0, chat_uleste: 2 }, 'chat')
    expect(await screen.findByRole('heading', { level: 1, name: 'Chat i Litiumgruppen' })).toBeTruthy()
    expect(document.title).toBe('Chat – Litiumgruppen – OUSFAR')
    // Siden henter chatten for gruppen og viser den.
    expect(krok.useGruppechat).toHaveBeenCalledWith(GRUPPE_ID)
    expect(meldingstekster()).toHaveLength(5)
  })

  it('sier fra når adressen peker på en chat som ikke er slått på', async () => {
    visMed({ nye_ideer: 0, venter: 0, mine_oppgaver: 0 }, 'chat')
    expect(await screen.findByText('Gruppechatten er ikke slått på.')).toBeTruthy()
    expect(screen.queryByRole('log')).toBeNull()
    expect(krok.useGruppechat).not.toHaveBeenCalled()
  })
})
