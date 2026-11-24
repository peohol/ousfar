// @vitest-environment jsdom
/**
 * Driftstatusen for datakildene slik administratorene ser den: kildene med
 * tilstanden, de kliniske endringene først, metadata på forespørsel, og
 * «Hent nå». CPIC og ClinPGx er tatt ut (#554) og vises ikke. Databasen er
 * erstattet med en falsk leser.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { Datakilder } from '../components/konto/Datakilder'
import type { Datakildeleser, Datakildestatus } from '../datakilder/status'

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(cleanup)

const nylig = new Date(Date.now() - 60 * 60 * 1000).toISOString()

const STATUS: Datakildestatus = {
  kjoringer: [
    {
      kilde: 'cypinfo', id: 4, status: 'fullfort', utlost_av: 'cron', startet_kl: nylig, avsluttet_kl: nylig,
      versjon: '2', feil: null, endringer: { klinisk: 1, metadata: 1, grunnlag: 0 },
    },
  ],
  endringer: [
    {
      id: 3, kilde: 'cypinfo', synk_id: 4, type: 'anbefaling', objekt_id: 'a1', kontekst: null, art: 'endret',
      niva: 'klinisk', etikett: 'sertralin · CYP2C19 Redusert enzymaktivitet', felt: ['avsnitt'],
      foer: { avsnitt: 'Gammel anbefaling' }, etter: { avsnitt: 'Ny anbefaling' }, spor: {}, registrert_kl: nylig,
    },
    {
      id: 2, kilde: 'cypinfo', synk_id: 4, type: 'legemiddel', objekt_id: 'l1', kontekst: null, art: 'endret',
      niva: 'metadata', etikett: 'sertralin', felt: ['varenavn'],
      foer: { varenavn: 'A' }, etter: { varenavn: 'B' }, spor: {}, registrert_kl: nylig,
    },
  ],
}

function falskLeser(): Datakildeleser & { hentNa: ReturnType<typeof vi.fn> } {
  return {
    status: vi.fn(async () => STATUS),
    hentNa: vi.fn(async () => ({ status: 'uendret' })),
  }
}

describe('datakildene', () => {
  it('viser hver kilde med tilstanden, og de kliniske endringene uten metadataene', async () => {
    render(<Datakilder apen onLukk={() => {}} leser={falskLeser()} />)
    const cypinfo = await screen.findByRole('region', { name: 'CYPinfo' })
    expect(within(cypinfo).getByText('I orden', { selector: '.merke' })).toBeTruthy()
    expect(within(cypinfo).getByText('Siste henting fant 1 klinisk endring.')).toBeTruthy()
    expect(within(cypinfo).getByText('sertralin · CYP2C19 Redusert enzymaktivitet')).toBeTruthy()
    expect(within(cypinfo).queryByText('B')).toBeNull()
    expect(within(cypinfo).getByText('Ny anbefaling')).toBeTruthy()

    // CPIC og ClinPGx er tatt ut (#554): ingen av dem står i panelet, heller ikke som stanset.
    const lag = screen.getByRole('dialog', { name: 'Datakilder' })
    expect(screen.queryByRole('region', { name: 'ClinPGx' })).toBeNull()
    expect(screen.queryByRole('region', { name: 'CPIC' })).toBeNull()
    expect(within(lag).queryByText('Stanset', { selector: '.merke' })).toBeNull()
    expect(lag.textContent).not.toMatch(/ClinPGx|CPIC|Release/)

    await userEvent.click(screen.getByRole('checkbox', { name: 'Vis også endringer i metadata' }))
    expect(within(cypinfo).getByText('B')).toBeTruthy()
  })

  it('henter fra kilden når administratoren ber om det, og leser statusen på nytt', async () => {
    const leser = falskLeser()
    render(<Datakilder apen onLukk={() => {}} leser={leser} />)
    await userEvent.click(await screen.findByRole('button', { name: 'Hent fra CYPinfo nå' }))
    expect(leser.hentNa).toHaveBeenCalledWith('cypinfo')
    await waitFor(() => expect(screen.getByText('Hentingen er ferdig (Uendret).')).toBeTruthy())
    expect(leser.status).toHaveBeenCalledTimes(2)
  })
})

describe('FEST sammen med de andre kildene', () => {
  const fest = (id: number, status: 'fullfort' | 'feilet', ekstra: Partial<Datakildestatus['kjoringer'][number]> = {}) => ({
    kilde: 'fest' as const, id, status, utlost_av: 'cron' as const, startet_kl: nylig, avsluttet_kl: nylig,
    versjon: null, feil: null, endringer: { klinisk: 0, metadata: 0, grunnlag: 0 }, rader: null,
    ...ekstra,
  })
  const leserMed = (kjoringer: Datakildestatus['kjoringer']): Datakildeleser & { hentNa: ReturnType<typeof vi.fn> } => ({
    status: vi.fn(async () => ({ ...STATUS, kjoringer: [...kjoringer, ...STATUS.kjoringer] })),
    hentNa: vi.fn(async () => ({ status: 'uendret' })),
  })

  it('viser FEST først, med uttrekket, radene og den nattlige jobben, uten endringslogg', async () => {
    const leser = leserMed([fest(9, 'fullfort', { versjon: '2026-09-08T03:09:06', rader: { nye: 3, endrede: 12, utgatte: 1 } })])
    render(<Datakilder apen onLukk={() => {}} leser={leser} />)
    const region = await screen.findByRole('region', { name: 'FEST' })
    expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-labelledby'))).toEqual([
      'datakilde-fest',
      'datakilde-pubchem',
      'datakilde-farmakologiportalen',
      'datakilde-cypinfo',
    ])
    expect(within(region).getByText('I orden', { selector: '.merke' })).toBeTruthy()
    expect(within(region).getByText('Siste henting byttet inn et nytt uttrekk (rader nye: 3, endrede: 12, utgåtte: 1).')).toBeTruthy()
    expect(within(region).getByText('Uttrekk fra DMP')).toBeTruthy()
    expect(within(region).getByText('08.09.2026')).toBeTruthy()
    expect(within(region).getByText('Nattlig jobb')).toBeTruthy()
    expect(within(region).getByRole('columnheader', { name: 'Utgåtte' })).toBeTruthy()
    expect(within(region).queryByText('Kliniske endringer')).toBeNull()
    expect(within(region).getByText(/logges ikke enkeltvis/)).toBeTruthy()

    // De andre kildene vises som før.
    const cypinfo = screen.getByRole('region', { name: 'CYPinfo' })
    expect(within(cypinfo).getByText('Kliniske endringer')).toBeTruthy()
    expect(within(cypinfo).getByText('Ukentlig jobb')).toBeTruthy()
    expect(within(cypinfo).getByRole('columnheader', { name: 'Kliniske' })).toBeTruthy()

    await userEvent.click(within(region).getByRole('button', { name: 'Hent fra FEST nå' }))
    expect(leser.hentNa).toHaveBeenCalledWith('fest')
  })

  it('sier konkret hva som stoppet en FEST-henting, og at de gyldige dataene fortsatt brukes', async () => {
    const feil = 'Strukturkontrollen stoppet FEST-uttrekket, trolig fordi DMP har endret formen på filen: bare 0 % av de 8962 merkevarene har varenavn (krever minst 90 %). Ingenting er byttet inn.'
    render(
      <Datakilder
        apen
        onLukk={() => {}}
        leser={leserMed([fest(10, 'feilet', { feil, utlost_av: 'manuell' }), fest(9, 'fullfort', { versjon: '2026-09-08T03:09:06' })])}
      />,
    )
    const region = await screen.findByRole('region', { name: 'FEST' })
    expect(within(region).getByText('Feilet', { selector: '.merke' })).toBeTruthy()
    expect(
      within(region).getByText(
        `Siste henting feilet: ${feil.replace(/\.$/, '')}. OUSFAR bruker fortsatt siste gyldige FEST-data; ingenting fra den feilede hentingen er tatt i bruk.`,
      ),
    ).toBeTruthy()
    expect(within(region).getByText('Administrator')).toBeTruthy()
    expect(within(region).getByText('08.09.2026')).toBeTruthy()
  })
})
