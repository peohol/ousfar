// @vitest-environment jsdom
/**
 * P7.0: regelen om pasientopplysninger i grensesnittet (`Pasientregel`,
 * `Pasientvarsel`), lesingen av svarene fra chatfunksjonene
 * (`src/gruppechat/modell.ts`) og testchatten tråd B bygger mot
 * (`src/__tests__/hjelp/testchat.ts`). Bare syntetiske data.
 */
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PASIENTREGEL } from '@delt/pasientopplysninger'
import { Pasientregel, Pasientvarsel } from '../components/Pasientregel'
import { avsendernavn, GRUPPECHAT_GRENSER, lesChatendringer, lesChatside, lesGruppemelding } from '../gruppechat/modell'
import { syntetiskeMeldinger, TESTPERSONER, useTestchat } from './hjelp/testchat'

afterEach(cleanup)

/** Et nummer med gyldige kontrollsifre, laget her (ingen gyldige numre står i repoet). */
function syntetiskNummer(): string {
  const v1 = [3, 7, 6, 1, 8, 9, 4, 5, 2]
  const v2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]
  for (let individ = 500; individ < 1000; individ++) {
    const d = [...`140387${individ}`].map(Number)
    const k1 = (11 - (v1.reduce((s, v, i) => s + v * d[i]!, 0) % 11)) % 11
    if (k1 === 10) continue
    const k2 = (11 - (v2.reduce((s, v, i) => s + v * [...d, k1][i]!, 0) % 11)) % 11
    if (k2 === 10) continue
    return `140387${individ}${k1}${k2}`
  }
  throw new Error('Fant ikke noe nummer')
}

describe('regelen i grensesnittet', () => {
  it('Pasientregel viser den korte regelen og kan beskrive et felt', () => {
    render(
      <>
        <textarea aria-describedby="regel" aria-label="Melding" />
        <Pasientregel id="regel" />
      </>,
    )
    const felt = screen.getByRole('textbox', { name: 'Melding' })
    expect(document.getElementById(felt.getAttribute('aria-describedby')!)?.textContent).toBe(PASIENTREGEL.kort)
  })

  it('Pasientvarsel sier fra bare når teksten ligner et fødselsnummer', () => {
    const { rerender } = render(<Pasientvarsel tekst="Vanlig tekst om 1250 nmol/L" />)
    expect(screen.queryByRole('alert')).toBeNull()
    rerender(<Pasientvarsel tekst={`Se ${syntetiskNummer()}`} />)
    expect(screen.getByRole('alert').textContent).toBe(PASIENTREGEL.advarsel)
  })
})

describe('lesingen av svarene', () => {
  const melding = {
    id: 'a',
    nr: 3,
    endring: 7,
    forfatter: { id: 'f', username: 'test.kari', first_name: 'Kari', last_name: 'Testesen', avatar_path: null, updated_at: 'x' },
    tekst: 'Hei',
    skrevet_kl: '2026-11-17T10:00:00Z',
    redigert_kl: null,
    slettet: null,
    egen: false,
    kan_endre: false,
    kan_slette: true,
  }

  it('leser en melding, og en slettet melding har aldri tekst', () => {
    expect(lesGruppemelding(melding)).toMatchObject({ id: 'a', nr: 3, endring: 7, tekst: 'Hei', kan_slette: true })
    expect(lesGruppemelding({ ...melding, slettet: { av: 'moderator', kl: 'k' } })).toMatchObject({
      tekst: null,
      slettet: { av: 'moderator', kl: 'k' },
    })
    expect(lesGruppemelding({ ...melding, nr: 0 })).toBeNull()
    expect(lesGruppemelding('tull')).toBeNull()
  })

  it('sorterer siden etter nr og endringene etter endring, og fyller grensene', () => {
    const side = lesChatside({ meldinger: [{ ...melding, id: 'b', nr: 5 }, melding, 'tull'], siste_endring: 9 })!
    expect(side.meldinger.map((m) => m.nr)).toEqual([3, 5])
    expect(side.grenser).toEqual(GRUPPECHAT_GRENSER)
    expect(side.kan_skrive).toBe(false)
    const endringer = lesChatendringer({ meldinger: [{ ...melding, endring: 9 }, { ...melding, id: 'c', endring: 8 }], siste_endring: 9, flere: true })!
    expect(endringer.meldinger.map((m) => m.endring)).toEqual([8, 9])
    expect(endringer.flere).toBe(true)
    expect(lesChatside(null)).toBeNull()
  })

  it('navnet på avsenderen', () => {
    expect(avsendernavn({ forfatter: null })).toBe('Slettet bruker')
    expect(avsendernavn(lesGruppemelding(melding)!)).toBe('Kari Testesen')
  })
})

describe('testchatten', () => {
  it('sender, endrer, sletter og tar imot meldinger utenfra', async () => {
    const { result } = renderHook(() => useTestchat({ meldinger: syntetiskeMeldinger(3) }))
    act(() => result.current.send('Ny melding'))
    expect(result.current.meldinger.at(-1)).toMatchObject({ nr: 4, tekst: 'Ny melding', egen: true })
    const id = result.current.meldinger.at(-1)!.id
    await act(() => result.current.endre(id, 'Endret'))
    expect(result.current.meldinger.at(-1)).toMatchObject({ tekst: 'Endret' })
    await act(() => result.current.slett(id))
    expect(result.current.meldinger.at(-1)).toMatchObject({ tekst: null, slettet: { av: 'forfatter' } })
    act(() => result.current.utenfra('Fra Kari'))
    expect(result.current.meldinger.at(-1)).toMatchObject({ nr: 5, forfatter: TESTPERSONER.kari, egen: false })
  })

  it('en tekst som ligner et fødselsnummer, blir stående som ikke sendt', () => {
    const { result } = renderHook(() => useTestchat())
    act(() => result.current.send(`Se ${syntetiskNummer()}`))
    expect(result.current.ventende).toMatchObject([{ status: 'feilet', feil: PASIENTREGEL.avvist }])
  })

  it('viser de nyeste først og henter de eldre', async () => {
    const { result } = renderHook(() => useTestchat({ meldinger: syntetiskeMeldinger(120), side: 50 }))
    expect(result.current.meldinger).toHaveLength(50)
    expect(result.current.flereEldre).toBe(true)
    await act(() => result.current.hentEldre())
    expect(result.current.meldinger).toHaveLength(100)
  })
})
