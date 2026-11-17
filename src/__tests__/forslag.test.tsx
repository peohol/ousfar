// @vitest-environment jsdom
/**
 * Endringsforslagene i appen: adressene, det et forslag kan gjelde på en
 * fagside og i fortolkningen, skjemaet «Foreslå endring», knappen ved et kort
 * og sidene «Mine forslag» og ett forslag. Kallene er erstattet; det er
 * skjermbildene og reglene i appen som prøves. Tilgangen selv prøves mot
 * databasen i `endringsforslag.test.ts`.
 */
import { PASIENTREGEL } from '@delt/pasientopplysninger'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Stoffsidedata, Utgave } from '../faginnhold/lesing'
import type { Innholdselementinnhold } from '../faginnhold/modell'
import type { Kommentarinnhold } from '../domain/kommentarobjekt'
import { syntetiskPersonnummer } from './hjelp/syntetiskPersonnummer'

const ID = '0f1e2d3c-4b5a-4968-8776-655443322110'
const SIDE = '11111111-0000-4000-8000-000000000001'
const DOSERING = '22222222-0000-4000-8000-000000000002'
const UPUBLISERT = '33333333-0000-4000-8000-000000000003'
const REGELSETT = '44444444-0000-4000-8000-000000000004'
const KOMMENTAR = '55555555-0000-4000-8000-000000000005'

const api = vi.hoisted(() => ({
  sendForslag: vi.fn(async () => '0f1e2d3c-4b5a-4968-8776-655443322110'),
  hentMineForslag: vi.fn(async (): Promise<unknown[]> => []),
  hentForslag: vi.fn(async (): Promise<unknown> => null),
  trekkForslag: vi.fn(async () => undefined),
  svarPaForslag: vi.fn(async () => undefined),
  hentSideversjon: vi.fn(async (): Promise<number | null> => 7),
}))
vi.mock('../forslag/api', () => api)

const { adresse, forslagsadresse, lesRute, sidesti } = await import('../domain/rute')
const { byggSidemodell } = await import('../faginnhold/stoffside')
const { forslagsvalgForFagside, forslagsreferanser } = await import('../forslag/fagside')
const { forslagsvalgForFortolkning } = await import('../forslag/fortolkning')
const { lesForslag, lesForslagsrader } = await import('../forslag/modell')
const { ForslagskildeProvider, ForslagsstedKilde, useForslagFor } = await import('../components/forslag/Forslagskilde')
const { Forslagsknapp } = await import('../components/forslag/Forslagsknapp')
const { Forslagsside, hvaGjelder } = await import('../components/forslag/Forslagsside')

beforeAll(() => {
  window.scrollTo = () => undefined
  // jsdom har `<dialog>`, men ikke det modale laget.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})
afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  // Svar som én test har satt opp og ikke brukt, skal ikke gå over i den neste.
  api.hentSideversjon.mockReset()
  api.hentSideversjon.mockImplementation(async () => 7)
  window.location.hash = ''
})

const DOK = (tekst: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tekst }] }] })

function utgave<T>(id: string, innhold: T, publisert: number | null = 3): Utgave<T> {
  return {
    id,
    revisjon: publisert ?? 1,
    publisert_revisjon: publisert,
    innhold,
    endret_av_fornavn: 'Rita',
    endret_av_etternavn: 'Redaktør',
    endret_kl: '2026-10-01T12:00:00Z',
  }
}

const tekstelement = (panel: string, tekst: string): Innholdselementinnhold => ({
  infoside: SIDE,
  panel,
  posisjon: 0,
  elementtype: 'riktekst',
  data: { dokument: DOK(tekst) },
  referanser: [],
})

function side(publisert: number | null = 7): Stoffsidedata {
  return {
    stoff: { id: SIDE, slug: 'citalopram', navn: 'Citalopram' },
    infoside: utgave(SIDE, { navn: 'Citalopram', slug: 'citalopram', panelreferanser: {} }, publisert),
    elementer: [
      utgave(DOSERING, tekstelement('dosering', '20 mg om morgenen.')),
      utgave(UPUBLISERT, tekstelement('indikasjon', 'Ikke publisert ennå.'), null),
    ],
    referanser: [],
  }
}

const VALG = forslagsvalgForFagside('Citalopram', side(), byggSidemodell(side()))

describe('adressene', () => {
  it('leser og skriver «Mine forslag», «Til behandling» og ett forslag', () => {
    expect(lesRute('#/forslag')).toEqual({ side: 'forslag' })
    expect(lesRute('#/forslag/til-behandling')).toEqual({ side: 'forslag', fane: 'behandling' })
    expect(lesRute(`#/forslag/${ID}`)).toEqual({ side: 'forslag', forslag: ID })
    for (const a of [forslagsadresse(), forslagsadresse(undefined, 'behandling'), forslagsadresse(ID)]) {
      expect(adresse(lesRute(a))).toBe(a)
    }
    expect(sidesti({ side: 'forslag', forslag: ID })).toBe(`forslag/${ID}`)
  })
})

describe('det et forslag kan gjelde', () => {
  it('på en fagside: hele siden først, så hvert publisert element med teksten slik den står', () => {
    expect(VALG).toEqual([
      { ressurs: SIDE, element: null, grunnrevisjon: 7, sted: 'Citalopram', etikett: 'Hele fagsiden' },
      expect.objectContaining({ ressurs: SIDE, element: DOSERING, grunnrevisjon: 3, utdrag: '20 mg om morgenen.' }),
    ])
    expect(VALG[1]!.sted).toMatch(/^Citalopram · /)
  })

  it('i ord: typen først, men ikke to ganger når stedet alt sier den', () => {
    const regelsett = { id: REGELSETT, type: 'intervallregelsett', navn: 'HBUP', stoff: null, analyttkode: 'HBUP', omfang: 'fagmiljo' }
    expect(hvaGjelder(regelsett, 'Fortolkning av Hydroksybupropion · Reglene for HBUP')).toBe('Fortolkning av Hydroksybupropion · Reglene for HBUP')
    expect(hvaGjelder(regelsett, null)).toBe('Fortolkning · HBUP')
    expect(hvaGjelder({ ...regelsett, id: SIDE, type: 'infoside', navn: 'Citalopram' }, 'Citalopram · Dosering')).toBe('Fagside · Citalopram · Dosering')
  })

  it('ingenting på en fagside som aldri er publisert', () => {
    expect(forslagsvalgForFagside('Citalopram', side(null), byggSidemodell(side(null)))).toEqual([])
  })

  it('bare de redaksjonelle referansene kan velges som kilde', () => {
    const modell = byggSidemodell(side())
    expect(forslagsreferanser({ ...modell, referanser: [{ id: 'r', tittel: 'Studie', forfattere: '', aar: '', lenke: '' } as never] })).toEqual([
      { id: 'r', tittel: 'Studie' },
    ])
  })

  it('i fortolkningen: hvert publisert regelsett og hver publisert kommentar det bruker', () => {
    const kommentar = (id: string, navn: string, publisert: number | null) =>
      utgave<Kommentarinnhold>(id, { navn, tekst: `Teksten i ${navn}.`, plassholdere: [] }, publisert)
    const valg = forslagsvalgForFortolkning('Fortolkning av Citalopram', {
      regelsett: {
        CIT: {
          regelsett: utgave(REGELSETT, {} as never, 4),
          kommentarer: [kommentar(KOMMENTAR, 'Lav', 2), kommentar('ny', 'Utkast', null)],
        },
      },
      thcregelsett: null,
      scenarioregelsett: {},
    })
    expect(valg).toEqual([
      { ressurs: REGELSETT, element: null, grunnrevisjon: 4, sted: 'Fortolkning av Citalopram · Reglene for CIT', etikett: 'Reglene for CIT' },
      {
        ressurs: REGELSETT,
        element: KOMMENTAR,
        grunnrevisjon: 2,
        sted: 'Fortolkning av Citalopram · Reglene for CIT · Lav',
        utdrag: 'Teksten i Lav.',
        etikett: 'Reglene for CIT · Lav',
      },
    ])
  })
})

/** En side med kortet og knappen, inni appens kilde for skjemaet. */
function Fagsideutsnitt() {
  const hele = useForslagFor(null)
  return (
    <>
      <p>20 mg om morgenen.</p>
      <Forslagsknapp element={DOSERING} navn="Dosering" />
      <Forslagsknapp element={UPUBLISERT} navn="Indikasjon" />
      {hele && (
        <button type="button" onClick={hele}>
          Foreslå endring for hele siden
        </button>
      )}
    </>
  )
}

function visFagside() {
  return render(
    <ForslagskildeProvider>
      <ForslagsstedKilde apning={{ tittel: 'Citalopram', valg: VALG, referanser: [{ id: 'r', tittel: 'Studie' }], fagside: 'citalopram' }}>
        <Fagsideutsnitt />
      </ForslagsstedKilde>
    </ForslagskildeProvider>,
  )
}

describe('knappen og skjemaet', () => {
  it('advarer ved feltet der et fødselsnummer står, også når det bare står i begrunnelsen eller en kilde', async () => {
    const bruker = userEvent.setup()
    visFagside()
    await bruker.click(screen.getByRole('button', { name: 'Foreslå endring: Dosering' }))
    const vindu = await screen.findByRole('dialog')
    const forslagsfelt = within(vindu).getByLabelText('Hva foreslår du?')
    const begrunnelse = within(vindu).getByLabelText('Hvorfor?')
    // Regelen står én gang i skjemaet, ved hovedforslaget.
    expect(within(vindu).getAllByText(PASIENTREGEL.kort)).toHaveLength(1)

    await bruker.type(forslagsfelt, '10 mg om morgenen.')
    await bruker.type(begrunnelse, `Sett hos ${syntetiskPersonnummer(14, 3, 87)}`)
    const advarsel = within(vindu).getByText(PASIENTREGEL.advarsel)
    expect(within(vindu).getAllByText(PASIENTREGEL.advarsel)).toHaveLength(1)
    expect(begrunnelse.getAttribute('aria-describedby')).toContain(advarsel.parentElement!.id)
    expect(forslagsfelt.getAttribute('aria-describedby')).not.toContain(advarsel.parentElement!.id)

    await bruker.clear(begrunnelse)
    expect(within(vindu).queryByText(PASIENTREGEL.advarsel)).toBeNull()
    await bruker.click(within(vindu).getByRole('button', { name: 'Legg til kilde' }))
    const kilde = within(vindu).getByLabelText('Kilde 1')
    await bruker.type(kilde, `Journal ${syntetiskPersonnummer(2, 11, 54)}`)
    expect(kilde.getAttribute('aria-describedby')).toContain(within(vindu).getByText(PASIENTREGEL.advarsel).parentElement!.id)
  })

  it('står ikke der forslag ikke kan sendes', () => {
    render(
      <ForslagsstedKilde apning={{ tittel: 'Citalopram', valg: VALG }}>
        <Fagsideutsnitt />
      </ForslagsstedKilde>,
    )
    expect(screen.queryByRole('button', { name: /Foreslå endring/ })).toBeNull()
  })

  it('står ved et publisert kort, ikke ved et som aldri er publisert', () => {
    visFagside()
    expect(screen.getByRole('button', { name: 'Foreslå endring: Dosering' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Foreslå endring: Indikasjon' })).toBeNull()
  })

  it('åpner skjemaet med kortet valgt og teksten sitert, og fokus i det første feltet', async () => {
    const bruker = userEvent.setup()
    visFagside()
    await bruker.click(screen.getByRole('button', { name: 'Foreslå endring: Dosering' }))
    const vindu = await screen.findByRole('dialog', { name: /Foreslå endring/ })
    const valg = within(vindu).getByLabelText<HTMLSelectElement>('Hva gjelder forslaget?')
    expect(valg.value).toBe('1')
    expect(within(vindu).getByText('20 mg om morgenen.', { selector: 'blockquote' })).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(within(vindu).getByLabelText('Hva foreslår du?')))
  })

  it('sier hva som mangler, og sender forslaget med kildene til kortet som er valgt', async () => {
    const bruker = userEvent.setup()
    visFagside()
    await bruker.click(screen.getByRole('button', { name: 'Foreslå endring: Dosering' }))
    const vindu = await screen.findByRole('dialog')
    await bruker.click(within(vindu).getByRole('button', { name: 'Send forslaget' }))
    expect(within(vindu).getByRole('alert').textContent).toBe('Skriv hva du foreslår.')
    // Fokus går til feltet feilen gjelder, som er merket ugyldig og beskrevet av feilen.
    const forslagsfelt = within(vindu).getByLabelText('Hva foreslår du?')
    expect(document.activeElement).toBe(forslagsfelt)
    expect(forslagsfelt.getAttribute('aria-invalid')).toBe('true')
    expect(forslagsfelt.getAttribute('aria-describedby')).toContain(within(vindu).getByRole('alert').id)

    await bruker.type(within(vindu).getByLabelText('Hva foreslår du?'), '10 mg om morgenen.')
    await bruker.type(within(vindu).getByLabelText('Hvorfor?'), 'Ny retningslinje.')
    await bruker.click(within(vindu).getByRole('button', { name: 'Legg til kilde' }))
    // Fokus står i den nye kilden, så tastaturet kan skrive rett inn.
    await waitFor(() => expect(document.activeElement).toBe(within(vindu).getByLabelText('Kilde 1')))
    await bruker.type(within(vindu).getByLabelText('Lenke for kilde 1'), 'http://eksempel.no')
    await bruker.click(within(vindu).getByRole('button', { name: 'Send forslaget' }))
    expect(within(vindu).getByRole('alert').textContent).toMatch(/https:\/\//)
    expect(document.activeElement).toBe(within(vindu).getByLabelText('Lenke for kilde 1'))
    expect(api.sendForslag).not.toHaveBeenCalled()

    await bruker.clear(within(vindu).getByLabelText('Lenke for kilde 1'))
    await bruker.type(within(vindu).getByLabelText('Lenke for kilde 1'), 'https://eksempel.no')
    await bruker.selectOptions(within(vindu).getByLabelText('Eller en referanse fra siden for kilde 1'), 'r')
    await bruker.click(within(vindu).getByRole('button', { name: 'Send forslaget' }))

    // Fagsidens versjon da skjemaet ble åpnet, ikke den nyeste når det sendes.
    expect(api.hentSideversjon).toHaveBeenCalledTimes(1)
    expect(api.hentSideversjon).toHaveBeenCalledWith('citalopram')
    expect(api.sendForslag).toHaveBeenCalledWith({
      mal: VALG[1],
      sideversjon: 7,
      forslag: '10 mg om morgenen.',
      begrunnelse: 'Ny retningslinje.',
      kilder: [{ tekst: '', lenke: 'https://eksempel.no', referanse: 'r' }],
    })
    const kvittering = await screen.findByRole('dialog', { name: /Forslaget er sendt/ })
    // Varslene til forslagsstilleren (`mine_forslag`) kan ikke slås av, så kvitteringen kan love dem.
    expect(kvittering.textContent).toMatch(/varsel når det får ny status/)
    expect(kvittering.textContent).toMatch(/«Mine forslag»/)
    // Fokus står på veien videre, så tastaturet ikke mister plassen.
    await waitFor(() => expect(document.activeElement).toBe(within(kvittering).getByRole('button', { name: 'Se forslaget' })))
    await bruker.click(within(kvittering).getByRole('button', { name: 'Se forslaget' }))
    expect(window.location.hash).toBe(forslagsadresse(ID))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  /** Åpner skjemaet for kortet og fyller ut det som må stå der. */
  async function fyllUt(bruker: ReturnType<typeof userEvent.setup>) {
    await bruker.click(screen.getByRole('button', { name: 'Foreslå endring: Dosering' }))
    const vindu = await screen.findByRole('dialog', { name: /Foreslå endring/ })
    await bruker.type(within(vindu).getByLabelText('Hva foreslår du?'), '10 mg.')
    await bruker.type(within(vindu).getByLabelText('Hvorfor?'), 'Ny retningslinje.')
    return vindu
  }

  it('venter på versjonen av fagsiden, og sender den som ble lest da skjemaet ble åpnet', async () => {
    let svar: (nr: number) => void = () => undefined
    api.hentSideversjon.mockImplementationOnce(() => new Promise<number>((ok) => (svar = ok)))
    // Publiseres siden på nytt underveis, ville et nytt oppslag gitt 8.
    api.hentSideversjon.mockResolvedValueOnce(8)
    const bruker = userEvent.setup()
    visFagside()
    const vindu = await fyllUt(bruker)
    await bruker.click(within(vindu).getByRole('button', { name: 'Send forslaget' }))
    // Oppslaget svarer ikke ennå: forslaget venter.
    expect(api.sendForslag).not.toHaveBeenCalled()
    svar(7)
    await waitFor(() => expect(api.sendForslag).toHaveBeenCalledTimes(1))
    expect(api.sendForslag).toHaveBeenCalledWith(expect.objectContaining({ sideversjon: 7 }))
    expect(api.hentSideversjon).toHaveBeenCalledTimes(1)
  })

  it('sender ikke når versjonen ikke kan leses, men sier fra og prøver igjen ved neste innsending', async () => {
    api.hentSideversjon.mockRejectedValueOnce(new Error('Nettet er nede'))
    api.hentSideversjon.mockRejectedValueOnce(new Error('Nettet er nede'))
    api.hentSideversjon.mockResolvedValueOnce(9)
    const bruker = userEvent.setup()
    visFagside()
    const vindu = await fyllUt(bruker)
    await bruker.click(within(vindu).getByRole('button', { name: 'Send forslaget' }))
    expect((await within(vindu).findByRole('alert')).textContent).toMatch(/Fant ikke hvilken versjon av fagsiden/)
    expect(api.sendForslag).not.toHaveBeenCalled()
    // Det som er skrevet, står igjen, og neste forsøk leser versjonen på nytt.
    expect(within(vindu).getByLabelText<HTMLTextAreaElement>('Hva foreslår du?').value).toBe('10 mg.')
    await bruker.click(within(vindu).getByRole('button', { name: 'Send forslaget' }))
    await waitFor(() => expect(api.sendForslag).toHaveBeenCalledWith(expect.objectContaining({ sideversjon: 9 })))
    expect(api.hentSideversjon).toHaveBeenCalledTimes(3)
  })

  it('sender uten versjon når fagsiden ikke har noen', async () => {
    api.hentSideversjon.mockResolvedValueOnce(null)
    const bruker = userEvent.setup()
    visFagside()
    const vindu = await fyllUt(bruker)
    await bruker.click(within(vindu).getByRole('button', { name: 'Send forslaget' }))
    await waitFor(() => expect(api.sendForslag).toHaveBeenCalledWith(expect.objectContaining({ sideversjon: null })))
  })

  it('spør før et skjema med tekst i lukkes', async () => {
    const bruker = userEvent.setup()
    visFagside()
    await bruker.click(screen.getByRole('button', { name: 'Foreslå endring for hele siden' }))
    const vindu = await screen.findByRole('dialog')
    expect(within(vindu).getByLabelText<HTMLSelectElement>('Hva gjelder forslaget?').value).toBe('0')
    await bruker.type(within(vindu).getByLabelText('Hva foreslår du?'), 'Noe')
    await bruker.click(within(vindu).getByRole('button', { name: 'Avbryt' }))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: /Forkast/ })).toBeTruthy()
  })
})

const RESSURS = { id: SIDE, type: 'infoside', navn: 'Citalopram', stoff: 'citalopram', analyttkode: null, omfang: 'lokal' }

const rad = (ekstra: Record<string, unknown> = {}) => ({
  id: ID,
  status: 'ny',
  ressurs: RESSURS,
  element_id: DOSERING,
  sted: 'Citalopram · Dosering',
  sammendrag: '10 mg om morgenen.',
  opprettet_kl: '2026-11-16T10:00:00Z',
  oppdatert_kl: '2026-11-16T10:00:00Z',
  venter_pa_meg: false,
  ...ekstra,
})

const forslaget = (ekstra: Record<string, unknown> = {}) =>
  lesForslag({
    id: ID,
    status: 'ny',
    ressurs: RESSURS,
    element: { id: DOSERING, type: 'innholdselement' },
    grunnrevisjon: 3,
    sideversjon: 7,
    sted: 'Citalopram · Dosering',
    utdrag: '20 mg om morgenen.',
    forslag: '10 mg om morgenen.',
    begrunnelse: 'Ny retningslinje.',
    kilder: [{ lenke: 'https://eksempel.no' }],
    opprettet_kl: '2026-11-16T10:00:00Z',
    oppdatert_kl: '2026-11-16T10:00:00Z',
    stilt_av: { er_meg: true, navn: 'Anne Ansatt' },
    behandler: null,
    vedtak: null,
    innarbeidet: null,
    hendelser: [{ id: 1, art: 'opprettet', tekst: null, utfort_av: { er_meg: true, navn: 'Anne Ansatt' }, utfort_kl: '2026-11-16T10:00:00Z', data: {} }],
    er_mitt: true,
    kan_behandle: false,
    kan_trekke: true,
    kan_svare: true,
    konflikt: { grunnrevisjon: 3, publisert_revisjon: 3, endret_siden: false },
    ...ekstra,
  })

describe('«Mine forslag»', () => {
  it('sier hvordan et forslag sendes når det ikke finnes noen', async () => {
    api.hentMineForslag.mockResolvedValueOnce([])
    render(<Forslagsside onLukk={() => {}} />)
    expect(await screen.findByText(/Du har ikke sendt noen forslag ennå/)).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1, name: 'Mine forslag' })).toBeTruthy()
  })

  it('lister forslagene med statusen, og sier fra om dem som venter på svar', async () => {
    api.hentMineForslag.mockResolvedValueOnce(
      lesForslagsrader([rad(), rad({ id: 'b', status: 'venter_pa_forslagsstiller', venter_pa_meg: true })]),
    )
    render(<Forslagsside onLukk={() => {}} />)
    const lenker = await screen.findAllByRole('link', { name: /Fagside · Citalopram · Dosering/ })
    expect(lenker).toHaveLength(2)
    expect(lenker[0]!.getAttribute('href')).toBe(forslagsadresse(ID))
    expect(within(lenker[1]!).getByText('Venter på svar fra deg')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Ett forslag venter på svar fra deg.')
  })
})

describe('ett forslag', () => {
  it('viser teksten slik den sto, forslaget, kildene og tidslinjen', async () => {
    api.hentForslag.mockResolvedValueOnce(forslaget())
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    const overskrift = await screen.findByRole('heading', { level: 1, name: 'Fagside · Citalopram · Dosering' })
    // Overskriften får fokus når den vises, også når forslaget først må hentes.
    await waitFor(() => expect(document.activeElement).toBe(overskrift))
    expect(screen.getByText('20 mg om morgenen.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'https://eksempel.no' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Gå til fagsiden' }).getAttribute('href')).toBe('#/stoff/citalopram')
    expect(screen.getByText(/sendte forslaget/)).toBeTruthy()
  })

  it('trekkes tilbake med en valgfri begrunnelse, og hentes på nytt', async () => {
    const bruker = userEvent.setup()
    api.hentForslag.mockResolvedValueOnce(forslaget()).mockResolvedValueOnce(forslaget({ status: 'trukket', kan_trekke: false, kan_svare: false }))
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    await bruker.click(await screen.findByRole('button', { name: 'Trekk tilbake' }))
    await bruker.type(screen.getByLabelText('Hvorfor trekker du forslaget? (valgfritt)'), 'Feil kort.')
    await bruker.click(screen.getByRole('button', { name: 'Trekk forslaget' }))
    expect(api.trekkForslag).toHaveBeenCalledWith(ID, 'Feil kort.')
    expect(await screen.findByText('Trukket tilbake')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Forslaget er trukket tilbake.')
    expect(screen.queryByRole('button', { name: 'Trekk tilbake' })).toBeNull()
  })

  it('svarer når en redaktør har bedt om en presisering', async () => {
    const bruker = userEvent.setup()
    api.hentForslag.mockResolvedValue(forslaget({ status: 'venter_pa_forslagsstiller' }))
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    await bruker.type(await screen.findByLabelText('Svar på spørsmålet'), 'Gjelder voksne.')
    await bruker.click(screen.getByRole('button', { name: 'Send svaret' }))
    expect(api.svarPaForslag).toHaveBeenCalledWith(ID, 'Gjelder voksne.')
    expect(await screen.findByText('Svaret er sendt, og forslaget er tilbake til behandling.')).toBeTruthy()
  })

  it('viser statusen slik behandleren leser den, uten forslagsstillerens handlinger', async () => {
    api.hentForslag.mockResolvedValueOnce(
      forslaget({ status: 'venter_pa_forslagsstiller', er_mitt: false, kan_trekke: false, kan_svare: false, stilt_av: { er_meg: false, navn: 'Kari Kollega' } }),
    )
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    expect(await screen.findByText('Venter på forslagsstilleren')).toBeTruthy()
    expect(screen.getByText(/av Kari Kollega/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Trekk tilbake' })).toBeNull()
  })

  it('viser feilen databasen gir, også for et forslag som ikke finnes eller ikke er ditt', async () => {
    api.hentForslag.mockRejectedValueOnce(new Error('Fant ikke forslaget.'))
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    expect((await screen.findByRole('alert')).textContent).toBe('Fant ikke forslaget.')
  })
})

describe('«Foreslå endring» i fortolkningen', () => {
  it('leser de publiserte reglene først når knappen trykkes, og åpner skjemaet med dem', async () => {
    const bruker = userEvent.setup()
    const { falskLeser } = await import('./hjelp/falskleser')
    const { Fortolkningsforslag } = await import('../components/forslag/Fortolkningsforslag')
    const leser = falskLeser({
      finnIntervallregelsett: vi.fn(async () => ({
        regelsett: utgave(REGELSETT, {} as never, 4),
        kommentarer: [utgave<Kommentarinnhold>(KOMMENTAR, { navn: 'Lav', tekst: 'Lavt nivå.', plassholdere: [] }, 2)],
      })),
    })
    const analytt = { kode: 'CIT', fortolkning: { kode: 'CIT' } } as never
    render(
      <ForslagskildeProvider>
        <Fortolkningsforslag sidenavn="Fortolkning av Citalopram" analytter={[analytt]} leser={leser} />
      </ForslagskildeProvider>,
    )
    expect(leser.finnIntervallregelsett).not.toHaveBeenCalled()
    await bruker.click(screen.getByRole('button', { name: 'Foreslå endring' }))
    expect(leser.finnIntervallregelsett).toHaveBeenCalledWith('CIT', 'publisert')
    const vindu = await screen.findByRole('dialog', { name: /Foreslå endring/ })
    const valg = within(vindu).getByLabelText<HTMLSelectElement>('Hva gjelder forslaget?')
    expect([...valg.options].map((o) => o.text)).toEqual(['Reglene for CIT', 'Reglene for CIT · Lav'])
  })
})
