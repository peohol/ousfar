// @vitest-environment jsdom
/**
 * Ingen påminnelse om pasientopplysninger i appen (Peder 17.11.2026,
 * `docs/pasientopplysninger.md`): brukerne er godt trent i personvern, og
 * påminnelser ved hvert skrivefelt blir bare støy. Regelen gjelder fortsatt,
 * og databasen avviser tekst som ligner et fødselsnummer (`PASIENTREGEL.avvist`,
 * vist som sendefeil). Denne testen holder påminnelsene ute: ingen regeltekst
 * under feltene, ingen advarsel mens det skrives, og ingen kilde som legger
 * dem inn igjen. Bare syntetiske numre.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { PASIENTREGEL } from '@delt/pasientopplysninger'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type Riktekstdokument } from '../faginnhold/riktekst'
import { syntetiskPersonnummer } from './hjelp/syntetiskPersonnummer'

vi.mock('../diskusjoner/api', () => ({}))
vi.mock('../ideer/api', () => ({}))

const { Rikteksteditor } = await import('../components/stoffside/Rikteksteditor')
const { Tekstomrade } = await import('../components/forslag/Tekstomrade')
const { Felt } = await import('../components/konto/Felt')
const { Traadskjema } = await import('../components/diskusjoner/Skjemaer')
const { Ideskjema } = await import('../components/ideer/Ideskjema')

afterEach(cleanup)

const PAAMINNELSE = /pasientopplysning|fødselsnummer|personnummer|kasuistikk/i

/** Alt på siden og alt skjermleseren leser med feltene. */
function sagt(): string {
  const beskrevet = [...document.querySelectorAll('[aria-describedby]')].flatMap((el) =>
    el
      .getAttribute('aria-describedby')!
      .split(' ')
      .map((id) => document.getElementById(id)?.textContent ?? ''),
  )
  return [document.body.textContent ?? '', ...beskrevet].join(' ')
}

const dokumentMed = (tekst: string): Riktekstdokument => ({
  type: 'doc',
  content: [{ type: 'paragraph', content: [{ type: 'text', text: tekst }] }],
})

describe('skrivefeltene sier ingenting om pasientopplysninger', () => {
  it('tekstredigereren, også med et fødselsnummer i teksten', () => {
    render(<Rikteksteditor dokument={dokumentMed(`Gjelder ${syntetiskPersonnummer(14, 3, 87)}`)} onEndre={() => {}} etikett="Innlegg" direktelenker />)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(sagt()).not.toMatch(PAAMINNELSE)
  })

  it('tekstfeltet og et vanlig felt mens et fødselsnummer skrives', async () => {
    function Skjema() {
      const [forslag, setForslag] = useState('')
      const [tittel, setTittel] = useState('')
      return (
        <>
          <Tekstomrade merkelapp="Forslag" verdi={forslag} onEndre={setForslag} maks={4000} hjelp="Vær konkret." />
          <Felt merkelapp="Overskrift" value={tittel} onChange={(e) => setTittel(e.target.value)} />
        </>
      )
    }
    render(<Skjema />)
    await userEvent.type(screen.getByLabelText('Forslag'), `Pasient ${syntetiskPersonnummer(14, 3, 87)}`)
    await userEvent.type(screen.getByLabelText('Overskrift'), syntetiskPersonnummer(2, 11, 54))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(sagt()).not.toMatch(PAAMINNELSE)
    expect(screen.getByLabelText('Overskrift').hasAttribute('aria-describedby')).toBe(false)
  })

  it('skjemaene for en ny tråd og en ny idé', () => {
    render(<Traadskjema side="stoff:sertralin" kategorier={[]} onAvbryt={() => {}} onLagret={() => {}} />)
    expect(sagt()).not.toMatch(PAAMINNELSE)
    cleanup()
    render(<Ideskjema onStatus={() => {}} forlater={false} onForkast={() => {}} onFortsett={() => {}} onAvbryt={() => {}} onLagret={() => {}} />)
    expect(sagt()).not.toMatch(PAAMINNELSE)
  })
})

describe('kildene', () => {
  const filer = (mappe: string): string[] =>
    readdirSync(mappe).flatMap((navn) => {
      const sti = join(mappe, navn)
      return statSync(sti).isDirectory() ? filer(sti) : /\.tsx?$/.test(sti) ? [sti] : []
    })
  const kilder = ['components', 'hooks', 'gruppechat', 'grupper']
    .flatMap((mappe) => filer(join(__dirname, '..', mappe)))
    .map((fil) => ({ fil: fil.split('/src/')[1]!, kilde: readFileSync(fil, 'utf8') }))

  it('ingen komponent sjekker teksten mens den skrives', () => {
    expect(kilder.filter(({ kilde }) => /\b(lignerPersonnummer|erPersonnummer)\b/.test(kilde)).map((k) => k.fil)).toEqual([])
  })

  it('ingen komponent har en påminnelse eller advarsel', () => {
    const utenKommentarer = (kilde: string) => kilde.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
    const med = kilder.filter(
      ({ kilde }) => /\bpasient(regel|varsel|vakt)\b|Pasient(regel|varsel|vakt)/i.test(kilde) || /['"`>][^'"`<]*(pasientopplysning|fødselsnummer)/i.test(utenKommentarer(kilde)),
    )
    expect(med.map((k) => k.fil)).toEqual([])
  })

  it('bare avslaget fra databasen står igjen av tekstene', () => {
    expect(Object.keys(PASIENTREGEL)).toEqual(['avvist'])
  })
})
