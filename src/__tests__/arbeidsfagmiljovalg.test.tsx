// @vitest-environment jsdom
/**
 * «Fagmiljø» i kontomenyen (`Arbeidsfagmiljovalg`): den som er aktivt medlem
 * av flere fagmiljøer, velger selv hvilket appen fortolker med. Databasens
 * side prøves i `arbeidsfagmiljo.test.ts`.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { INGEN_RETTIGHETER, lesFagmiljo, RettigheterKilde, type Fagmiljoreferanse, type Rettigheter } from '../auth/rettigheter'
import { Arbeidsfagmiljovalg } from '../components/konto/Arbeidsfagmiljovalg'

const KF: Fagmiljoreferanse = { id: 'kf', nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi', standard: true, apent: true, ikon: 'laboratorium' }
const RT: Fagmiljoreferanse = { id: 'rt', nokkel: 'ous-rettstoksikologi', navn: 'OUS Rettstoksikologi', standard: false, apent: true, ikon: 'laboratorium' }

afterEach(cleanup)

function vis(rettigheter: Rettigheter, velg: (id: string) => Promise<Rettigheter>, oppdater = vi.fn()) {
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
    vis({ ...INGEN_RETTIGHETER, arbeidsfagmiljo: KF, mineFagmiljoer: [KF], velgbareFagmiljoer: [KF] }, vi.fn())
    expect(screen.queryByText(/Fagmiljø:/)).toBeNull()
  })

  it('vises når det eneste aktive fagmiljøet ikke er det hen arbeider i (som når det er arkivert)', () => {
    vis({ ...INGEN_RETTIGHETER, arbeidsfagmiljo: null, mineFagmiljoer: [KF], velgbareFagmiljoer: [KF] }, vi.fn())
    expect(screen.getByRole('button', { name: /Fagmiljø: ikke valgt/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'OUS Klinisk farmakologi' }).getAttribute('aria-current')).toBeNull()
  })

  it('viser fagmiljøet hen arbeider i, og bytter til et annet og henter rettighetene på nytt', async () => {
    const etter = { ...INGEN_RETTIGHETER, arbeidsfagmiljo: RT, mineFagmiljoer: [KF, RT], velgbareFagmiljoer: [KF, RT] }
    const velg = vi.fn().mockResolvedValue(etter)
    const oppdater = vis({ ...INGEN_RETTIGHETER, arbeidsfagmiljo: KF, mineFagmiljoer: [KF, RT], velgbareFagmiljoer: [KF, RT] }, velg)
    expect(screen.getByRole('button', { name: /Fagmiljø: OUS Klinisk farmakologi/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'OUS Klinisk farmakologi' }).getAttribute('aria-current')).toBe('true')
    expect(screen.getByRole('button', { name: 'OUS Rettstoksikologi' }).getAttribute('aria-current')).toBeNull()

    // Det gjeldende fagmiljøet gjør ingenting.
    await userEvent.click(screen.getByRole('button', { name: 'OUS Klinisk farmakologi' }))
    expect(velg).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'OUS Rettstoksikologi' }))
    expect(velg).toHaveBeenCalledWith('rt')
    // Rettighetene byttet ga, tas i bruk direkte, uten en ny henting som kunne feile.
    await waitFor(() => expect(oppdater).toHaveBeenCalledWith(etter))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('lar en systemarkitekt velge et fagmiljø hen ikke er medlem av, merket «Ikke medlem»', async () => {
    const arkitekt = { ...INGEN_RETTIGHETER, systemarkitekt: true, arbeidsfagmiljo: KF, mineFagmiljoer: [KF], velgbareFagmiljoer: [KF, RT] }
    const etter = { ...arkitekt, arbeidsfagmiljo: RT }
    const velg = vi.fn().mockResolvedValue(etter)
    const oppdater = vis(arkitekt, velg)
    expect(screen.getByRole('button', { name: /Fagmiljø: OUS Klinisk farmakologi/ })).toBeTruthy()
    // Bare det hen ikke er medlem av, er merket.
    expect(screen.getByRole('button', { name: 'OUS Klinisk farmakologi' })).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'OUS Rettstoksikologi Ikke medlem' }))
    expect(velg).toHaveBeenCalledWith('rt')
    await waitFor(() => expect(oppdater).toHaveBeenCalledWith(etter))
  })

  it('viser hvert fagmiljø med sitt eget ikon, og det gjeldende med haken', () => {
    const SK: Fagmiljoreferanse = { id: 'sk', nokkel: 'sandkasse', navn: 'Sandkasse', standard: false, apent: false, ikon: 'sandkasse' }
    vis({ ...INGEN_RETTIGHETER, arbeidsfagmiljo: SK, mineFagmiljoer: [KF, SK], velgbareFagmiljoer: [KF, SK] }, vi.fn())
    const ikon = (navn: RegExp | string) => screen.getByRole('button', { name: navn }).querySelector('[data-ikon]')?.getAttribute('data-ikon')
    expect(ikon(/Fagmiljø: Sandkasse/)).toBe('sandkasse')
    expect(ikon('Sandkasse')).toBe('done')
    expect(ikon('OUS Klinisk farmakologi')).toBe('laboratorium')
  })

  it('viser prøverørene for et ikon appen ikke kjenner, eller ikke får oppgitt', () => {
    const rad = { id: 'x', nokkel: 'x', navn: 'X' }
    expect(lesFagmiljo({ ...rad, ikon: 'sandkasse' })?.ikon).toBe('sandkasse')
    expect(lesFagmiljo({ ...rad, ikon: 'finnesIkke' })?.ikon).toBe('laboratorium')
    expect(lesFagmiljo({ ...rad, ikon: 'toString' })?.ikon).toBe('laboratorium')
    expect(lesFagmiljo(rad)?.ikon).toBe('laboratorium')
  })

  it('sier fra når byttet feiler, og henter ikke rettighetene på nytt', async () => {
    const velg = vi.fn().mockRejectedValue(new Error('nei'))
    const oppdater = vis({ ...INGEN_RETTIGHETER, arbeidsfagmiljo: KF, mineFagmiljoer: [KF, RT], velgbareFagmiljoer: [KF, RT] }, velg)
    await userEvent.click(screen.getByRole('button', { name: 'OUS Rettstoksikologi' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/ble ikke byttet/)
    expect(oppdater).not.toHaveBeenCalled()
  })
})
