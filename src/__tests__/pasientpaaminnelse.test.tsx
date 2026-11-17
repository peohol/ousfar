// @vitest-environment jsdom
/**
 * Regelen om pasientopplysninger ved skrivefeltene som fantes før P7
 * (`docs/pasientopplysninger.md`, tiltak D2): feltet viser `PASIENTREGEL.kort`,
 * advarer mens teksten ligner et fødselsnummer, og skjermlesere leser begge
 * med feltet. Overskrifter, navn, begrunnelser og kilder i de samme skjemaene
 * advarer uten å gjenta regelen (`Fritekstfelt`, `pasientvarsel`). Skjemaene for en ny tråd og
 * en idé prøves direkte; at hver tekstredigerer i samhandlingen har regelen og
 * hvert felt ved siden av advarselen, holdes av kildene, så et nytt skrivefelt
 * ikke kan glemme den. Endringsforslaget med et fødselsnummer bare i
 * begrunnelsen prøves i `forslag.test.tsx`. Gruppenes beskrivelse prøves i
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
const { Felt } = await import('../components/konto/Felt')
const { Fritekstfelt } = await import('../components/Fritekstfelt')
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
  function Forslagsfelt() {
    const [verdi, setVerdi] = useState('')
    return <Tekstomrade merkelapp="Forslag" verdi={verdi} onEndre={setVerdi} maks={4000} hjelp="Vær konkret." pasientregel />
  }

  it('viser regelen, og advarer når et fødselsnummer skrives inn', async () => {
    render(<Forslagsfelt />)
    const felt = screen.getByLabelText('Forslag')
    expect(beskrivelse(felt)).toBe(`Vær konkret. ${PASIENTREGEL.kort}`)
    await userEvent.type(felt, `Pasient ${syntetiskPersonnummer(14, 3, 87)}`)
    expect(screen.getByRole('alert').textContent).toBe(PASIENTREGEL.advarsel)
    expect(beskrivelse(felt)).toBe(`Vær konkret. ${PASIENTREGEL.kort} ${PASIENTREGEL.advarsel}`)
  })

  it('advarer ikke ved et tall med feil kontrollsiffer', async () => {
    render(<Forslagsfelt />)
    const nr = syntetiskPersonnummer(14, 3, 87)
    await userEvent.type(screen.getByLabelText('Forslag'), nr.slice(0, 10) + String((Number(nr[10]) + 1) % 10))
    expect(screen.queryByRole('alert')).toBeNull()
  })
})

describe('overskrifter, navn og begrunnelser', () => {
  function Overskrift() {
    const [verdi, setVerdi] = useState('')
    return <Fritekstfelt merkelapp="Overskrift" value={verdi} onChange={(e) => setVerdi(e.target.value)} />
  }

  it('advarer ved et fødselsnummer uten å gjenta regelen', async () => {
    render(<Overskrift />)
    const felt = screen.getByLabelText('Overskrift')
    expect(screen.queryByText(PASIENTREGEL.kort)).toBeNull()
    expect(beskrivelse(felt)).toBe('')
    await userEvent.type(felt, syntetiskPersonnummer(14, 3, 87))
    expect(screen.getByRole('alert').textContent).toBe(PASIENTREGEL.advarsel)
    expect(beskrivelse(felt)).toBe(PASIENTREGEL.advarsel)
  })

  it('et vanlig felt, som passordet, er som før', () => {
    render(<Felt merkelapp="Passord" value={syntetiskPersonnummer(14, 3, 87)} onChange={() => {}} />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByLabelText('Passord').hasAttribute('aria-describedby')).toBe(false)
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

  // Et `Felt` i et skjema med regelen må være et `Fritekstfelt`, og et `Tekstomrade`
  // ha regelen eller advarselen, unntatt det som ikke deles som fritekst:
  // emojien og brukernavnet som inviteres.
  const UTEN_VARSEL = ['Emoji', 'Brukernavn']

  it('hvert felt i et skjema med regelen advarer ved et fødselsnummer', () => {
    const skjemaer = alle.filter(
      ({ fil, kilde }) => /\bpasientregel\b|usePasientvakt/.test(kilde) && !/\/(Tekstomrade|Rikteksteditor|Fritekstfelt|konto\/Felt)\.tsx$/.test(fil),
    )
    const uten = skjemaer.flatMap(({ fil, kilde }) =>
      (kilde.match(/<(Felt|Tekstomrade)\b[\s\S]*?\/>/g) ?? [])
        .filter((tagg) => !/\bpasient(regel|varsel)\b/.test(tagg))
        .map((tagg) => `${fil.split('/components/')[1]}: ${/merkelapp="([^"]*)"/.exec(tagg)?.[1] ?? tagg}`),
    )
    expect(uten.filter((f) => !UTEN_VARSEL.some((navn) => f.endsWith(`: ${navn}`)))).toEqual([])
  })

  it('bruker den felles regelen, ikke egne tekster om pasientopplysninger', () => {
    const egne = alle.filter(({ kilde }) => /['"`][^'"`]*pasientopplysninger[^'"`]*['"`]/i.test(kilde.replace(/^\s*(\/\/|\/?\*|import\b).*$/gm, '')))
    expect(egne.map((e) => e.fil.split('/components/')[1])).toEqual([])
  })
})
