// @vitest-environment jsdom
/**
 * «Fagmiljø» i kontomenyen (`Arbeidsfagmiljovalg`): den som er aktivt medlem
 * av flere fagmiljøer, velger selv hvilket appen fortolker med. Databasens
 * side prøves i `arbeidsfagmiljo.test.ts`.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { INGEN_RETTIGHETER, RettigheterKilde, type Fagmiljoreferanse, type Rettigheter } from '../auth/rettigheter'
import { Arbeidsfagmiljovalg } from '../components/konto/Arbeidsfagmiljovalg'

const KF: Fagmiljoreferanse = { id: 'kf', nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi', standard: true, apent: true }
const RT: Fagmiljoreferanse = { id: 'rt', nokkel: 'ous-rettstoksikologi', navn: 'OUS Rettstoksikologi', standard: false, apent: true }

afterEach(cleanup)

function vis(rettigheter: Rettigheter, velg: (id: string) => Promise<unknown>, oppdater = vi.fn()) {
  render(
    <RettigheterKilde verdi={rettigheter} oppdater={oppdater}>
      <ul>
        <Arbeidsfagmiljovalg apen onVeksle={() => undefined} velg={velg} />
      </ul>
    </RettigheterKilde>,
  )
  return oppdater
}

describe('Arbeidsfagmiljovalg', () => {
  it('vises ikke for den som bare er med i ett fagmiljø', () => {
    vis({ ...INGEN_RETTIGHETER, arbeidsfagmiljo: KF, mineFagmiljoer: [KF] }, vi.fn())
    expect(screen.queryByText(/Fagmiljø:/)).toBeNull()
  })

  it('viser fagmiljøet hen arbeider i, og bytter til et annet og henter rettighetene på nytt', async () => {
    const velg = vi.fn().mockResolvedValue(undefined)
    const oppdater = vis({ ...INGEN_RETTIGHETER, arbeidsfagmiljo: KF, mineFagmiljoer: [KF, RT] }, velg)
    expect(screen.getByRole('button', { name: /Fagmiljø: OUS Klinisk farmakologi/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'OUS Klinisk farmakologi' }).getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('button', { name: 'OUS Rettstoksikologi' }).getAttribute('aria-current')).toBeNull()

    // Det gjeldende fagmiljøet gjør ingenting.
    await userEvent.click(screen.getByRole('button', { name: 'OUS Klinisk farmakologi' }))
    expect(velg).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'OUS Rettstoksikologi' }))
    expect(velg).toHaveBeenCalledWith('rt')
    await waitFor(() => expect(oppdater).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('sier fra når byttet feiler, og henter ikke rettighetene på nytt', async () => {
    const velg = vi.fn().mockRejectedValue(new Error('nei'))
    const oppdater = vis({ ...INGEN_RETTIGHETER, arbeidsfagmiljo: KF, mineFagmiljoer: [KF, RT] }, velg)
    await userEvent.click(screen.getByRole('button', { name: 'OUS Rettstoksikologi' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/ble ikke byttet/)
    expect(oppdater).not.toHaveBeenCalled()
  })
})
