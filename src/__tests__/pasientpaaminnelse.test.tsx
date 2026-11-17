// @vitest-environment jsdom
/**
 * Regelen om pasientopplysninger ved skrivefeltene som fantes før P7
 * (`docs/pasientopplysninger.md`, tiltak D2): feltet viser `PASIENTREGEL.kort`,
 * advarer mens teksten ligner et fødselsnummer, og skjermlesere leser begge
 * med feltet. Skjemaene for en ny tråd og en idé prøves direkte; at hver
 * tekstredigerer i samhandlingen har regelen, holdes av kildene, så et nytt
 * skrivefelt ikke kan glemme den. Gruppenes beskrivelse prøves i
 * `grupperside.test.tsx`. Bare syntetiske numre.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { PASIENTREGEL } from '@delt/pasientopplysninger'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { tomtDokument, type Riktekstdokument } from '../faginnhold/riktekst'
import { syntetiskPersonnummer } from './hjelp/syntetiskPersonnummer'

vi.mock('../diskusjoner/api', () => ({}))
vi.mock('../ideer/api', () => ({}))

const { Rikteksteditor } = await import('../components/stoffside/Rikteksteditor')
const { Tekstomrade } = await import('../components/forslag/Tekstomrade')
const { Traadskjema } = await import('../components/diskusjoner/Skjemaer')
const { Ideskjema } = await import('../components/ideer/Ideskjema')

afterEach(cleanup)

/** Teksten skjermleseren leser med feltet. */
const beskrivelse = (felt: HTMLElement) =>
  (felt.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .filter(Boolean)
    .join(' ')

const dokumentMed = (tekst: string): Riktekstdokument => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: tekst }] }],
})

describe('tekstredigereren', () => {
  it('viser regelen under feltet og knytter den til feltet', () => {
    render(<Rikteksteditor dokument={tomtDokument()} onEndre={() => {}} etikett="Innlegg" pasientregel />)
    expect(screen.getByText(PASIENTREGEL.kort)).toBeTruthy()
    expect(beskrivelse(screen.getByRole('textbox', { name: 'Innlegg' }))).toBe(PASIENTREGEL.kort)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('advarer mens teksten ligner et fødselsnummer, og skjermleseren leser advarselen med feltet', () => {
    const { rerender } = render(
      <Rikteksteditor dokument={dokumentMed('Se prøven fra i går')} onEndre={() => {}} etikett="Innlegg" pasientregel />,
    )
    expect(screen.queryByRole('alert')).toBeNull()
    rerender(
      <Rikteksteditor dokument={dokumentMed(`Gjelder ${syntetiskPersonnummer(14, 3, 87)}`)} onEndre={() => {}} etikett="Innlegg" pasientregel />,
    )
    expect(screen.getByRole('alert').textContent).toBe(PASIENTREGEL.advarsel)
    expect(beskrivelse(screen.getByRole('textbox', { name: 'Innlegg' }))).toBe(`${PASIENTREGEL.kort} ${PASIENTREGEL.advarsel}`)
  })

  it('har hjelpeteksten og regelen sammen', () => {
    render(<Rikteksteditor dokument={tomtDokument()} onEndre={() => {}} etikett="Innlegg" hjelp="Kort og saklig." pasientregel />)
    expect(beskrivelse(screen.getByRole('textbox', { name: 'Innlegg' }))).toBe(`Kort og saklig. ${PASIENTREGEL.kort}`)
  })

  it('har ingen regel uten `pasientregel`', () => {
    render(<Rikteksteditor dokument={dokumentMed(syntetiskPersonnummer(14, 3, 87))} onEndre={() => {}} etikett="Fagtekst" />)
    expect(screen.queryByText(PASIENTREGEL.kort)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Fagtekst' }).hasAttribute('aria-describedby')).toBe(false)
  })
})

describe('tekstfeltet i endringsforslagene', () => {
  function Felt() {
    const [verdi, setVerdi] = useState('')
    return <Tekstomrade merkelapp="Forslag" verdi={verdi} onEndre={setVerdi} maks={4000} hjelp="Vær konkret." pasientregel />
  }

  it('viser regelen, og advarer når et fødselsnummer skrives inn', async () => {
    render(<Felt />)
    const felt = screen.getByLabelText('Forslag')
    expect(beskrivelse(felt)).toBe(`Vær konkret. ${PASIENTREGEL.kort}`)
    await userEvent.type(felt, `Pasient ${syntetiskPersonnummer(14, 3, 87)}`)
    expect(screen.getByRole('alert').textContent).toBe(PASIENTREGEL.advarsel)
    expect(beskrivelse(felt)).toBe(`Vær konkret. ${PASIENTREGEL.kort} ${PASIENTREGEL.advarsel}`)
  })

  it('advarer ikke ved et tall med feil kontrollsiffer', async () => {
    render(<Felt />)
    const nr = syntetiskPersonnummer(14, 3, 87)
    await userEvent.type(screen.getByLabelText('Forslag'), nr.slice(0, 10) + String((Number(nr[10]) + 1) % 10))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('skjemaene i samhandlingen', () => {
  it('en ny tråd i diskusjonene har regelen', () => {
    render(<Traadskjema side="stoff:sertralin" kategorier={[]} onAvbryt={() => {}} onLagret={() => {}} />)
    expect(beskrivelse(screen.getByRole('textbox', { name: 'Innlegg' }))).toBe(PASIENTREGEL.kort)
  })

  it('en ny idé har regelen', () => {
    render(
      <Ideskjema onStatus={() => {}} forlater={false} onForkast={() => {}} onFortsett={() => {}} onAvbryt={() => {}} onLagret={() => {}} />,
    )
    expect(beskrivelse(screen.getByRole('textbox', { name: 'Beskrivelse' }))).toBe(PASIENTREGEL.kort)
  })
})

describe('kildene', () => {
  const filer = (mappe: string): string[] =>
    readdirSync(mappe).flatMap((navn) => {
      const sti = join(mappe, navn)
      return statSync(sti).isDirectory() ? filer(sti) : sti.endsWith('.tsx') ? [sti] : []
    })
  const alle = filer(join(__dirname, '../components')).map((fil) => ({ fil, kilde: readFileSync(fil, 'utf8') }))

  // Direktelenkene finnes bare i samhandlingen, så de kjennetegner skrivefeltene der.
  const samhandling = alle.flatMap(({ fil, kilde }) =>
    (kilde.match(/<Rikteksteditor\b[^>]*>/g) ?? []).filter((tagg) => /\bdirektelenker\b/.test(tagg)).map((tagg) => ({ fil, tagg })),
  )

  it('finner skrivefeltene for diskusjoner, idéer, kommentarer og gruppeoppgaver', () => {
    expect(new Set(samhandling.map((s) => s.fil.split('/components/')[1])).size).toBeGreaterThanOrEqual(5)
  })

  it('hver tekstredigerer i samhandlingen har regelen', () => {
    expect(samhandling.filter((s) => !/\bpasientregel\b/.test(s.tagg))).toEqual([])
  })

  it('endringsforslagene har regelen i forslaget, svaret og behandlerens melding', () => {
    for (const fil of ['forslag/Forslagsskjema.tsx', 'forslag/Forslagsside.tsx', 'forslag/behandling/Behandlerhandlinger.tsx']) {
      expect(alle.find((a) => a.fil.endsWith(fil))!.kilde, fil).toMatch(/^\s*pasientregel$/m)
    }
  })

  it('bruker den felles regelen, ikke egne tekster om pasientopplysninger', () => {
    const egne = alle.filter(({ kilde }) => /['"`][^'"`]*pasientopplysninger[^'"`]*['"`]/i.test(kilde.replace(/^\s*(\/\/|\/?\*|import\b).*$/gm, '')))
    expect(egne.map((e) => e.fil.split('/components/')[1])).toEqual([])
  })
})
