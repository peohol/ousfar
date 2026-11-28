// @vitest-environment jsdom
/**
 * Personalkalenderen i appen (#606, docs/personal.md §8.3 og §8.8), med
 * innloggingen og databasen erstattet og bare syntetiske fagmiljøer:
 *
 * - Uten personalfunksjonen i fagmiljøet den innloggede arbeider i, er
 *   `#/kalender` nøyaktig som en ukjent adresse, «Personal» står ikke i
 *   menyen, databasen spørres ikke, og koden i `src/personal/` hentes ikke
 *   (K-SKJ-2, K-SKJ-8). Det gjelder også en systemarkitekt med funksjonen i
 *   et annet fagmiljø.
 * - Med funksjonen står Kalender under Personal, siden viser fagmiljøet og
 *   fanene rollen databasen gir, og en fane rollen ikke har, blir kalenderen.
 * - Svarer databasen «Finnes ikke.» (funksjonen er slått av siden), er siden,
 *   tittelen og menyen igjen som for en ukjent adresse.
 *
 * Testene som viser at koden ikke er hentet, står først: når den først er
 * hentet, blir den værende i testkjøringen.
 */
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

/** Det databasen svarer og det appen har spurt om, og om personalkoden er hentet. */
const db = vi.hoisted(() => ({
  kall: [] as { funksjon: string; argumenter: Record<string, unknown> }[],
  /** Fagmiljøene den innloggede har personalfunksjonen i. */
  personal: [] as string[],
  /** Rollen `personal_grunnlag` gir, eller feilkoden den svarer med. */
  grunnlag: { rolle: 'localAdmin' } as { rolle: string } | { feil: string },
  personalkodeHentet: false,
}))

vi.mock('../../personal/Personalside', async (original) => {
  db.personalkodeHentet = true
  return original()
})
vi.mock('../../auth/okt', () => ({
  useProfil: () => ({ id: 'syntetisk-bruker', role: 'admin', first_name: 'Sara', last_name: 'Syntetisk', username: 'sara' }),
}))
vi.mock('../../auth/klient', async () => {
  const { DAGENS_REGELSETT, publiserteRader } = await import('../hjelp/dagensregler')
  const { scenarioregeldata } = await import('../hjelp/etggrunnlag')
  const { OUS_KATALOGSVAR } = await import('../hjelp/ouskatalogkilde')
  const { thcRegelsettutgave } = await import('../hjelp/thcgrunnlag')
  const { GRUNNSTRUKTUR } = await import('../hjelp/registerstruktur')
  const vanlige = publiserteRader(DAGENS_REGELSETT)
  const thc = thcRegelsettutgave()
  const rader: Record<string, unknown> = {
    ...vanlige,
    les_kommentarer: [...vanlige.les_kommentarer, ...thc.kommentarer],
    les_thc_regelsett: thc.regelsett,
    les_scenarioregler: scenarioregeldata(),
    les_analyttkatalog: OUS_KATALOGSVAR,
    les_stoffregister: { ...GRUNNSTRUKTUR, sider: [] },
  }
  const sandkasse = { id: 'sandkasse', nokkel: 'sandkasse', navn: 'Sandkasse' }
  const annet = { id: 'annet', nokkel: 'syntetisk-lab', navn: 'Syntetisk lab' }
  return {
    klient: () => ({
      rpc: async (funksjon: string, argumenter: Record<string, unknown> = {}) => {
        db.kall.push({ funksjon, argumenter })
        if (funksjon === 'mine_rettigheter') {
          return {
            data: {
              systemarkitekt: true,
              administrerer: [sandkasse],
              arbeidsfagmiljo: sandkasse,
              mine_fagmiljoer: [sandkasse, annet],
              funksjoner: db.personal.map((fagmiljo) => ({ funksjon: 'personal', fagmiljo })),
            },
            error: null,
          }
        }
        if (funksjon === 'personal_grunnlag') {
          return 'feil' in db.grunnlag
            ? { data: null, error: { code: db.grunnlag.feil, message: db.grunnlag.feil === 'P0002' ? 'Finnes ikke.' : 'intern feil' } }
            : { data: { ...db.grunnlag, medarbeidere: [] }, error: null }
        }
        return { data: rader[funksjon] ?? null, error: null }
      },
    }),
  }
})
vi.mock('../../components/konto/Kontomeny', () => ({ Kontomeny: () => null }))

const { default: App } = await import('../../App')
const { TipsLag } = await import('../../components/Tips')
const { ShortcutVisibilityProvider } = await import('../../hooks/useShortcutVisibility')

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= function () {}
  window.scrollTo = () => {}
})

beforeEach(() => {
  db.kall = []
  db.personal = []
  db.grunnlag = { rolle: 'localAdmin' }
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

async function visApp(adresse: string) {
  window.location.hash = adresse
  render(
    <TipsLag>
      <ShortcutVisibilityProvider>
        <App />
      </ShortcutVisibilityProvider>
    </TipsLag>,
  )
  await waitFor(() => expect(document.querySelector('.port[aria-busy]')).toBeNull())
}

/** Det en ukjent adresse viser: overskriften, tittelen og siden appen sier den står på. */
async function somUkjentAdresse(adresse: string) {
  expect(await screen.findByRole('heading', { level: 1, name: 'Siden finnes ikke' })).toBeTruthy()
  expect(window.location.hash).toBe(adresse)
  // Tittelen settes når siden er vist, og kan komme litt etter overskriften.
  await waitFor(() => expect(document.title).toBe('Siden finnes ikke – OUSFAR'))
  expect(document.querySelector('.app')?.getAttribute('data-side')).toBe('ukjent')
}

/** Navnene på valgene i hovedmenyens øverste nivå. */
async function hovedvalgene() {
  await userEvent.click(screen.getByRole('button', { name: 'Vis menyen' }))
  const meny = screen.getByRole('navigation', { name: 'Meny' })
  const liste = meny.querySelector<HTMLElement>('.menyavsnitt__liste')!
  return { meny, navn: [...liste.children].map((li) => (li.querySelector('a, button')?.textContent ?? '').trim()) }
}

describe('uten personalfunksjonen i fagmiljøet', () => {
  it('er #/kalender som en ukjent adresse, uten Personal i menyen, uten kall og uten personalkoden', async () => {
    await visApp('#/kalender')
    await somUkjentAdresse('#/kalender')
    const { navn } = await hovedvalgene()
    expect(navn.some((n) => n.startsWith('Personal'))).toBe(false)
    expect(db.kall.some((k) => k.funksjon.startsWith('personal_'))).toBe(false)
    expect(db.personalkodeHentet).toBe(false)
  })

  it('er det samme for en systemarkitekt med funksjonen bare i et annet fagmiljø, også på en fane', async () => {
    db.personal = ['annet']
    await visApp('#/kalender/medarbeidere')
    await somUkjentAdresse('#/kalender/medarbeidere')
    const { navn } = await hovedvalgene()
    expect(navn.some((n) => n.startsWith('Personal'))).toBe(false)
    expect(db.kall.some((k) => k.funksjon.startsWith('personal_'))).toBe(false)
    expect(db.personalkodeHentet).toBe(false)
  })
})

describe('med personalfunksjonen i fagmiljøet', () => {
  it('har Kalender under Personal, og siden viser fagmiljøet og fanene til den lokale administratoren', async () => {
    db.personal = ['sandkasse']
    await visApp('#/')
    const { meny, navn } = await hovedvalgene()
    expect(navn).toContain('Personal')
    await userEvent.click(within(meny).getByRole('button', { name: /^Personal/ }))
    const kalender = within(meny).getByRole('link', { name: 'Kalender' })
    expect(kalender.getAttribute('href')).toBe('#/kalender')
    // Personalkoden hentes først når siden vises.
    expect(db.personalkodeHentet).toBe(false)

    act(() => {
      window.location.hash = '#/kalender'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(await screen.findByRole('heading', { level: 1, name: 'Kalender' })).toBeTruthy()
    expect(db.personalkodeHentet).toBe(true)
    expect(document.title).toBe('Kalender – OUSFAR')
    expect(screen.getByText('Sandkasse')).toBeTruthy()
    expect(db.kall.filter((k) => k.funksjon === 'personal_grunnlag').map((k) => k.argumenter)).toEqual([{ fagmiljo: 'sandkasse' }])
    const faner = await screen.findByRole('navigation', { name: 'Kalender' })
    expect(within(faner).getAllByRole('link').map((a) => [a.textContent, a.getAttribute('href'), a.getAttribute('aria-current')])).toEqual([
      ['Kalender', '#/kalender', 'page'],
      ['Medarbeidere', '#/kalender/medarbeidere', null],
    ])
  })

  it('viser Medarbeidere for vaktplanansvarlige, med adressen til fanen', async () => {
    db.personal = ['sandkasse']
    db.grunnlag = { rolle: 'planner' }
    await visApp('#/kalender/medarbeidere')
    const faner = await screen.findByRole('navigation', { name: 'Kalender' })
    expect(within(faner).getByRole('link', { name: 'Medarbeidere' }).getAttribute('aria-current')).toBe('page')
    expect(await screen.findByText('Ingen medarbeidere ennå.')).toBeTruthy()
    expect(window.location.hash).toBe('#/kalender/medarbeidere')
  })

  it('gir en kollega bare kalenderen, og en fane hen ikke har, blir kalenderen', async () => {
    db.personal = ['sandkasse']
    db.grunnlag = { rolle: 'reader' }
    await visApp('#/kalender/medarbeidere')
    expect(await screen.findByText('Kalenderen kommer her.')).toBeTruthy()
    await waitFor(() => expect(window.location.hash).toBe('#/kalender'))
    expect(screen.queryByRole('navigation', { name: 'Kalender' })).toBeNull()
    expect(screen.queryByText('Ingen medarbeidere ennå.')).toBeNull()
  })

  it.each(['P0002', '42501'])('er en ukjent adresse, også i menyen, når databasen svarer %s for kalenderen', async (kode) => {
    db.personal = ['sandkasse']
    db.grunnlag = { feil: kode }
    await visApp('#/kalender')
    const rettighetskall = () => db.kall.filter((k) => k.funksjon === 'mine_rettigheter').length
    const forAvvisningen = rettighetskall()
    await somUkjentAdresse('#/kalender')
    expect(screen.queryByRole('heading', { level: 1, name: 'Kalender' })).toBeNull()
    // Rettighetene hentes på nytt, og menyen har ikke Personal, selv om de
    // gamle rettighetene fortsatt sier at funksjonen finnes.
    await waitFor(() => expect(rettighetskall()).toBeGreaterThan(forAvvisningen))
    const { navn } = await hovedvalgene()
    expect(navn.some((n) => n.startsWith('Personal'))).toBe(false)
    // Grunnlaget hentes ikke igjen for den samme siden.
    expect(db.kall.filter((k) => k.funksjon === 'personal_grunnlag')).toHaveLength(1)
  })

  it('viser feilen med Prøv igjen når grunnlaget ikke kunne hentes', async () => {
    db.personal = ['sandkasse']
    db.grunnlag = { feil: 'XX000' }
    await visApp('#/kalender')
    expect((await screen.findByRole('alert')).textContent).toMatch(/^Noe gikk galt/)
    db.grunnlag = { rolle: 'reader' }
    await userEvent.click(screen.getByRole('button', { name: 'Prøv igjen' }))
    expect(await screen.findByText('Kalenderen kommer her.')).toBeTruthy()
  })
})
