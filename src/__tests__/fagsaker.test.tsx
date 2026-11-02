// @vitest-environment jsdom
/**
 * Redaktørvisningen av kildeovervåkingen (VDR-2,
 * `docs/verktøy-omlegging-2026-11.md` §4 og §6): en faglig redaktør ser bare
 * saker der en faglig beslutning trengs, med hva som er endret, hva det
 * berører, hvorfor det er relevant, anbefalingen, valgene og hva valget vil
 * gjøre, før noe kan bekreftes. En beslutning avslutter ikke saken; den følges
 * opp til tiltakene er utført og kontrollert. Ingen kontrollsummer, interne
 * nøkler eller tidsfrister. Syntetiske data.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Fagsaker } from '../components/konto/Fagsaker'
import { glemBildet } from '../oppdatering/bevaring'
import {
  lesRedaktoroversikt,
  redaktorvarsel,
  sorterSaker,
  type Beslutningsvalg,
  type Fagsak,
  type Fagsaklager,
  type Redaktoroversikt,
} from '../verktoy/overvaking/fagsak'

beforeEach(() => {
  sessionStorage.clear()
  glemBildet()
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(cleanup)

const HASH = 'a3f1'.repeat(16)

const sak = (over: Partial<Fagsak> = {}): Fagsak => ({
  id: '7',
  versjon: 3,
  fase: 'beslutning',
  alvor: 'faglig',
  prove: false,
  tittel: 'Syntetisk retningslinje anbefaler nå langsommere siste trinn',
  endring: 'Den syntetiske retningslinjen anbefaler nå fire uker i stedet for to på siste trinn før seponering.',
  kilde: { navn: 'Syntetisk retningslinje 2026', lenke: 'https://eksempel.invalid/retningslinje', sammenlignet_kl: '2026-11-09T06:20:00Z' },
  berorte: [{ regel: 'seponering-escitalopram', versjon: 11, hva: 'varigheten av siste trinn' }],
  relevans: 'Planen kan bli kortere enn kilden nå anbefaler for pasienter med tidligere seponeringssymptomer.',
  anbefaling: { valg: 'revider', begrunnelse: 'Endringen gjelder et bindende parameter i den godkjente planen.', av: 'Claude, kontrollert av ChatGPT' },
  valg: [
    { valg: 'behold', na: [], deretter: ['Nytt kontrollert sammenligningsgrunnlag for kilden'], verktoyet: 'Planen beregnes som i dag.' },
    { valg: 'revider', na: [], deretter: ['Ny regelversjon med uavhengig klinisk godkjenning'], verktoyet: 'Planen beregnes som i dag til den nye versjonen er godkjent.' },
    { valg: 'deaktiver', na: ['Nødstopp for den berørte regelen'], deretter: [], verktoyet: 'Denne planen vises ikke; andre planer virker som før.' },
    { valg: 'utsett', na: [], deretter: [], verktoyet: 'Planen beregnes som i dag.' },
  ],
  status_na: 'Planen beregnes som normalt.',
  opprettet_kl: '2026-11-09T06:21:00Z',
  beslutning: null,
  tiltak: [],
  avsluttet: null,
  ...over,
})

const oversikt = (saker: Fagsak[], over: Partial<Redaktoroversikt> = {}): Redaktoroversikt => ({ saker, teknisk: 'normal', sist_kontrollert_kl: '2026-11-09T06:20:00Z', ...over })

/** Et lager i minnet som gjør det databasen gjør med en beslutning (`docs` VDR-1-kontrakten). */
function minnelager(data: Redaktoroversikt): Fagsaklager & { beslutt: ReturnType<typeof vi.fn> } {
  return {
    les: async () => structuredClone(data),
    beslutt: vi.fn(async (id: string, versjon: number, valg: Beslutningsvalg, merknad: string | null) => {
      const s = data.saker.find((x) => x.id === id)!
      if (versjon !== s.versjon) return 'endret' as const
      const v = s.valg.find((x) => x.valg === valg)!
      Object.assign(s, {
        versjon: s.versjon + 1,
        beslutning: { valg, merknad, av: 'Ada Admin', kl: '2026-11-10T08:00:00Z' },
        fase: valg === 'utsett' ? 'beslutning' : 'oppfolging',
        tiltak: [...v.na.map((tekst) => ({ tekst, status: 'kontrollert', endret_kl: '2026-11-10T08:00:00Z', lenke: null })), ...v.deretter.map((tekst) => ({ tekst, status: 'bestilt', endret_kl: '2026-11-10T08:00:00Z', lenke: null }))],
      })
      return 'registrert' as const
    }),
  }
}

describe('redaktørvisningen av kildesakene', () => {
  it('viser de seks svarene og hva valget vil gjøre før beslutningen kan registreres, og følger saken opp i stedet for å avslutte den', async () => {
    const user = userEvent.setup()
    const lager = minnelager(oversikt([sak()]))
    render(<Fagsaker apen lager={lager} />)

    const kort = within((await screen.findByRole('article', { name: /langsommere siste trinn/ })) as HTMLElement)
    // 1–3: hva er endret, hva berøres (med navnet, aldri ID-en), hvorfor relevant.
    expect(kort.getByText('Hva er endret?')).toBeTruthy()
    expect(kort.getByText(/fire uker i stedet for to/)).toBeTruthy()
    expect(kort.getByRole('link', { name: 'Syntetisk retningslinje 2026' })).toBeTruthy()
    expect(kort.getByText(/Seponering av escitalopram, gjentatt prosentvis nedtrapping \(godkjent versjon 11\)/)).toBeTruthy()
    expect(kort.getByText(/kortere enn kilden nå anbefaler/)).toBeTruthy()
    // 4: anbefalingen og hvem som har vurdert den.
    expect(kort.getByText('Anbefalt beslutning: Be om revidert anbefaling')).toBeTruthy()
    expect(kort.getByText('Vurdert av Claude, kontrollert av ChatGPT.')).toBeTruthy()
    // 5: alle valgene med hva de betyr for klinikerne; ingen knapp før et valg er tatt.
    const valg = kort.getAllByRole('radio')
    expect(valg).toHaveLength(4)
    expect(kort.getByText('Denne planen vises ikke; andre planer virker som før.')).toBeTruthy()
    expect(kort.queryByRole('button', { name: 'Registrer beslutningen' })).toBeNull()

    // 6: hva som faktisk skjer, for valget som er tatt.
    await user.click(kort.getByRole('radio', { name: /Deaktiver berørt regel/ }))
    expect(kort.getByText('Hvis du velger «Deaktiver berørt regel»')).toBeTruthy()
    expect(kort.getByText('Nødstopp for den berørte regelen')).toBeTruthy()
    await user.click(kort.getByRole('radio', { name: /Be om revidert anbefaling/ }))
    expect(kort.queryByText('Nødstopp for den berørte regelen')).toBeNull()
    expect(kort.getByText('Ingenting endres med en gang.')).toBeTruthy()
    expect(kort.getByText('Ny regelversjon med uavhengig klinisk godkjenning')).toBeTruthy()

    await user.type(kort.getByRole('textbox', { name: /Merknad/ }), 'Syntetisk merknad.')
    await user.click(kort.getByRole('button', { name: 'Registrer beslutningen' }))
    expect(lager.beslutt).toHaveBeenCalledWith('7', 3, 'revider', 'Syntetisk merknad.')

    // Saken er ikke avsluttet: tiltaket er bestilt, og ingenting venter på redaktøren.
    expect(await screen.findByText('Ingenting venter på deg.')).toBeTruthy()
    const oppfolging = within(screen.getByRole('region', { name: 'Oppfølging pågår' }))
    expect(oppfolging.getByText(/Besluttet .* av Ada Admin/)).toBeTruthy()
    expect(oppfolging.getByText('Bestilt')).toBeTruthy()
    expect(oppfolging.getByText(/avsluttes når alle tiltakene er utført og kontrollert/)).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Avsluttede saker' })).toBeNull()
  })

  it('viser ingen kontrollsum, ID, regelnøkkel eller tidsfrist', async () => {
    render(<Fagsaker apen lager={minnelager(oversikt([sak()]))} />)
    await screen.findByRole('article')
    const tekst = document.body.textContent!
    expect(tekst).not.toContain(HASH)
    expect(tekst).not.toMatch(/[0-9a-f]{16,}/)
    expect(tekst).not.toContain('seponering-escitalopram')
    expect(tekst).not.toMatch(/frist|timer|teknisk vurdering/i)
    expect(screen.queryByText(/Funn nr\./)).toBeNull()
  })

  it('avviser en beslutning på en utdatert sak og ber redaktøren lese den på nytt', async () => {
    const user = userEvent.setup()
    const data = oversikt([sak()])
    const lager = minnelager(data)
    render(<Fagsaker apen lager={lager} />)
    const kort = within(await screen.findByRole('article'))
    // Noen andre endret saken mens den var åpen.
    data.saker[0]!.versjon = 4
    await user.click(kort.getByRole('radio', { name: /Behold godkjent regel/ }))
    await user.click(kort.getByRole('button', { name: 'Registrer beslutningen' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Saken ble endret mens du leste den. Les den oppdaterte saken før du bestemmer deg.')
    // Valget er nullstilt, så det tas på nytt mot den oppdaterte saken.
    const ny = within(await screen.findByRole('article'))
    expect((ny.getByRole('radio', { name: /Behold godkjent regel/ }) as HTMLInputElement).checked).toBe(false)
    expect(lager.beslutt).toHaveBeenCalledTimes(1)
  })

  it('forkaster et valg som ikke lenger gjelder når saken er endret, men beholder merknaden', async () => {
    const user = userEvent.setup()
    const data = oversikt([sak()])
    const lager = minnelager(data)
    const { rerender } = render(<Fagsaker apen lager={lager} />)
    let kort = within(await screen.findByRole('article'))
    await user.click(kort.getByRole('radio', { name: /Deaktiver berørt regel/ }))
    await user.type(kort.getByRole('textbox', { name: /Merknad/ }), 'Syntetisk merknad.')
    // Vinduet lukkes, og agenten erstatter spørsmålet: deaktivering tilbys ikke lenger.
    rerender(<Fagsaker apen={false} lager={lager} />)
    Object.assign(data.saker[0]!, { versjon: 4, valg: sak().valg.filter((v) => v.valg !== 'deaktiver') })
    rerender(<Fagsaker apen lager={lager} />)
    await waitFor(() => expect(screen.getAllByRole('radio')).toHaveLength(3))
    kort = within(screen.getByRole('article'))
    expect(kort.queryAllByRole('radio').some((r) => (r as HTMLInputElement).checked)).toBe(false)
    expect(kort.queryByRole('button', { name: 'Registrer beslutningen' })).toBeNull()
    await user.click(kort.getByRole('radio', { name: /Behold godkjent regel/ }))
    expect((kort.getByRole('textbox', { name: /Merknad/ }) as HTMLTextAreaElement).value).toBe('Syntetisk merknad.')
    await user.click(kort.getByRole('button', { name: 'Registrer beslutningen' }))
    expect(lager.beslutt).toHaveBeenCalledWith('7', 4, 'behold', 'Syntetisk merknad.')
  })

  it('beholder valget og merknaden ved en databasefeil, og sier at beslutningen ikke ble registrert', async () => {
    const user = userEvent.setup()
    const lager = minnelager(oversikt([sak()]))
    lager.beslutt.mockRejectedValueOnce(new Error('Beslutningen ble ikke registrert: ingen forbindelse.'))
    render(<Fagsaker apen lager={lager} />)
    const kort = within(await screen.findByRole('article'))
    await user.click(kort.getByRole('radio', { name: /Utsett beslutningen/ }))
    await user.type(kort.getByRole('textbox', { name: /Merknad/ }), 'Venter på ny utgave.')
    await user.click(kort.getByRole('button', { name: 'Registrer beslutningen' }))
    expect((await screen.findByRole('alert')).textContent).toContain('ingen forbindelse')
    expect((kort.getByRole('radio', { name: /Utsett beslutningen/ }) as HTMLInputElement).checked).toBe(true)
    expect((kort.getByRole('textbox', { name: /Merknad/ }) as HTMLTextAreaElement).value).toBe('Venter på ny utgave.')
  })

  it('lar en utsatt sak vente med hvem som utsatte den, og kan besluttes senere', async () => {
    const user = userEvent.setup()
    const lager = minnelager(oversikt([sak()]))
    render(<Fagsaker apen lager={lager} />)
    let kort = within(await screen.findByRole('article'))
    await user.click(kort.getByRole('radio', { name: /Utsett beslutningen/ }))
    await user.click(kort.getByRole('button', { name: 'Registrer beslutningen' }))
    kort = within(await screen.findByRole('article'))
    expect(await kort.findByText(/Utsatt .* av Ada Admin/)).toBeTruthy()
    expect(kort.getAllByRole('radio')).toHaveLength(4)
  })

  it('viser en sikkerhetssak under vurdering straks, uten valg, og peker på nødstoppen', async () => {
    const user = userEvent.setup()
    const nodstopp = vi.fn()
    const s = sak({ alvor: 'sikkerhet', anbefaling: null, valg: [], status_na: 'Planen beregnes fortsatt; ingen sperre er satt.' })
    render(<Fagsaker apen lager={minnelager(oversikt([s]))} onNodstopp={nodstopp} />)
    const kort = within(await screen.findByRole('article'))
    expect(kort.getByText('Sikkerhet')).toBeTruthy()
    expect(kort.getByText('Sikkerhetsproblem under vurdering')).toBeTruthy()
    expect(kort.queryAllByRole('radio')).toHaveLength(0)
    expect(kort.queryByRole('button', { name: 'Registrer beslutningen' })).toBeNull()
    await user.click(kort.getByRole('button', { name: 'Åpne nødstoppen' }))
    expect(nodstopp).toHaveBeenCalled()
  })

  it('samler avsluttede saker, med prøven merket, og sier hvorfor de er avsluttet', async () => {
    const avsluttet = sak({
      id: '3',
      fase: 'avsluttet',
      prove: true,
      tittel: 'Syntetisk prøvesak',
      beslutning: null,
      avsluttet: { kl: '2026-11-10T09:00:00Z', utfall: 'prove' },
    })
    render(<Fagsaker apen lager={minnelager(oversikt([avsluttet]))} />)
    const del = within(await screen.findByRole('region', { name: 'Avsluttede saker' }))
    expect(del.getByText('Avsluttede saker (1)')).toBeTruthy()
    expect(del.getByText('Syntetisk prøvesak (prøve)')).toBeTruthy()
    expect(del.getByText(/prøven er gjennomført og dokumentert/)).toBeTruthy()
  })

  it('sier rolig fra om det tekniske sporet uten å gi redaktøren en oppgave', async () => {
    render(<Fagsaker apen lager={minnelager(oversikt([], { teknisk: 'oppfolging' }))} />)
    expect(await screen.findByText(/Noen kilder følges opp teknisk\. Det krever ingenting av deg/)).toBeTruthy()
    expect(screen.getByText('Ingenting venter på deg.')).toBeTruthy()
  })

  it('sier at sakene ikke kunne leses, i stedet for at ingenting venter, og prøver igjen', async () => {
    const user = userEvent.setup()
    const data = oversikt([sak()])
    let feiler = true
    const lager: Fagsaklager = {
      les: async () => {
        if (feiler) throw new Error('Fikk ikke kontakt med databasen.')
        return structuredClone(data)
      },
      beslutt: async () => 'registrert',
    }
    render(<Fagsaker apen lager={lager} />)
    expect(await screen.findByText('Sakene kunne ikke leses, så det er ukjent om noe venter på deg.')).toBeTruthy()
    expect(screen.queryByText('Ingenting venter på deg.')).toBeNull()
    feiler = false
    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }))
    expect(await screen.findByRole('article')).toBeTruthy()
  })

  it('kan brukes med tastaturet alene', async () => {
    const user = userEvent.setup()
    const lager = minnelager(oversikt([sak()]))
    render(<Fagsaker apen lager={lager} />)
    const kort = within(await screen.findByRole('article'))
    kort.getByRole('radio', { name: /Be om revidert anbefaling/ }).focus()
    await user.keyboard(' ')
    expect((kort.getByRole('radio', { name: /Be om revidert anbefaling/ }) as HTMLInputElement).checked).toBe(true)
    // Valget → merknaden → knappen, i den rekkefølgen de står.
    await user.tab()
    expect(document.activeElement).toBe(kort.getByRole('textbox', { name: /Merknad/ }))
    await user.tab()
    expect(document.activeElement).toBe(kort.getByRole('button', { name: 'Registrer beslutningen' }))
    await user.keyboard('{Enter}')
    expect(lager.beslutt).toHaveBeenCalledWith('7', 3, 'revider', null)
  })
})

describe('formen på sakene fra databasen', () => {
  it('godtar en fullstendig sak og en sikkerhetssak under vurdering', () => {
    expect(lesRedaktoroversikt(oversikt([sak(), sak({ id: '8', alvor: 'sikkerhet', anbefaling: null, valg: [] })])).saker).toHaveLength(2)
  })

  it.each<[string, Partial<Fagsak>]>([
    ['uten anbefaling for en faglig sak', { anbefaling: null, valg: [] }],
    ['uten anbefaling når det finnes valg', { alvor: 'sikkerhet', anbefaling: null }],
    ['med en anbefaling som ikke er blant valgene', { anbefaling: { valg: 'deaktiver', begrunnelse: 'x', av: 'y' }, valg: sak().valg.filter((v) => v.valg !== 'deaktiver') }],
    ['med et valg uten hva det gjør for klinikerne', { valg: [{ valg: 'behold', na: [], deretter: [], verktoyet: '' }], anbefaling: { valg: 'behold', begrunnelse: 'x', av: 'y' } }],
    ['med samme valg to ganger', { valg: [sak().valg[0]!, sak().valg[0]!], anbefaling: { valg: 'behold', begrunnelse: 'x', av: 'y' } }],
    ['med et ukjent valg', { valg: [{ valg: 'slett' as Beslutningsvalg, na: [], deretter: [], verktoyet: 'x' }] }],
    ['uten hva som er endret', { endring: ' ' }],
    ['uten kilde', { kilde: { navn: '', lenke: null, sammenlignet_kl: null } }],
    ['avsluttet mens et tiltak ikke er kontrollert', { fase: 'avsluttet', avsluttet: { kl: 'x', utfall: 'tiltak_kontrollert' }, tiltak: [{ tekst: 'Ny regelversjon', status: 'utfort', endret_kl: 'x', lenke: null }] }],
    ['avsluttet uten utfall', { fase: 'avsluttet', avsluttet: null }],
    ['avsluttet med et ukjent utfall', { fase: 'avsluttet', avsluttet: { kl: 'x', utfall: 'lukket' as 'prove' } }],
    ['i en ukjent fase', { fase: 'lukket' as 'avsluttet' }],
  ])('avviser en sak %s', (_, over) => {
    expect(() => lesRedaktoroversikt(oversikt([sak(over)]))).toThrow('De faglige sakene har en form appen ikke kjenner.')
  })

  it('avviser et ukjent teknisk spor', () => {
    expect(() => lesRedaktoroversikt({ saker: [], teknisk: 'grønn' })).toThrow()
  })
})

describe('prikken i administrasjonsmenyen', () => {
  it('vises bare når en reell sak venter, aldri for prøver, oppfølging eller avsluttede saker', () => {
    expect(redaktorvarsel({ saker: [] })).toEqual([])
    expect(redaktorvarsel({ saker: [sak({ prove: true }), sak({ fase: 'oppfolging' }), sak({ fase: 'avsluttet', avsluttet: { kl: 'x', utfall: 'prove' } })] })).toEqual([])
    expect(redaktorvarsel({ saker: [sak()] })).toEqual(['Én faglig sak venter på beslutning'])
    expect(redaktorvarsel({ saker: [sak(), sak({ id: '8' }), sak({ id: '9', alvor: 'sikkerhet', anbefaling: null, valg: [] })] })).toEqual([
      '2 faglige saker venter på beslutning',
      'Et sikkerhetsproblem under faglig vurdering',
    ])
  })

  it('ordner sikkerhet først blant det som venter, så oppfølging, så avsluttede', () => {
    const rekke = sorterSaker([
      sak({ id: 'a', fase: 'avsluttet', avsluttet: { kl: 'x', utfall: 'prove' } }),
      sak({ id: 'o', fase: 'oppfolging' }),
      sak({ id: 'f' }),
      sak({ id: 's', alvor: 'sikkerhet' }),
    ]).map((s) => s.id)
    expect(rekke).toEqual(['s', 'f', 'o', 'a'])
  })
})
