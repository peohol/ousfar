// @vitest-environment jsdom
/**
 * Påminnelsen om pasientopplysninger i skrivefeltene for samhandling
 * (`docs/s4-pilotplan.md`, tiltak 12): feltet viser den, og skjermlesere leser
 * den med feltet. Skjemaene for en ny tråd og en idé prøves direkte; at hver
 * tekstredigerer i samhandlingen har den, holdes av kildene, så et nytt
 * skrivefelt ikke kan glemme den. Gruppenes beskrivelse prøves i
 * `grupperside.test.tsx`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { tomtDokument } from '../faginnhold/riktekst'
import { IKKE_PASIENTOPPLYSNINGER } from '../traad/modell'

vi.mock('../diskusjoner/api', () => ({}))
vi.mock('../ideer/api', () => ({}))

const { Rikteksteditor } = await import('../components/stoffside/Rikteksteditor')
const { Traadskjema } = await import('../components/diskusjoner/Skjemaer')
const { Ideskjema } = await import('../components/ideer/Ideskjema')

afterEach(cleanup)

/** Teksten skjermleseren leser med feltet. */
const beskrivelse = (felt: HTMLElement) =>
  (felt.getAttribute('aria-describedby') ?? '')
    .split(' ')
    .filter(Boolean)
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')

describe('tekstredigereren', () => {
  it('viser hjelpeteksten under feltet og knytter den til feltet', () => {
    render(<Rikteksteditor dokument={tomtDokument()} onEndre={() => {}} etikett="Innlegg" hjelp={IKKE_PASIENTOPPLYSNINGER} />)
    expect(screen.getByText(IKKE_PASIENTOPPLYSNINGER)).toBeTruthy()
    expect(beskrivelse(screen.getByRole('textbox', { name: 'Innlegg' }))).toBe(IKKE_PASIENTOPPLYSNINGER)
  })

  it('har ingen hjelpetekst uten `hjelp`', () => {
    render(<Rikteksteditor dokument={tomtDokument()} onEndre={() => {}} etikett="Fagtekst" />)
    expect(screen.queryByText(IKKE_PASIENTOPPLYSNINGER)).toBeNull()
    expect(screen.getByRole('textbox', { name: 'Fagtekst' }).hasAttribute('aria-describedby')).toBe(false)
  })
})

describe('skjemaene i samhandlingen', () => {
  it('en ny tråd i diskusjonene minner om det', () => {
    render(<Traadskjema side="stoff:sertralin" kategorier={[]} onAvbryt={() => {}} onLagret={() => {}} />)
    expect(beskrivelse(screen.getByRole('textbox', { name: 'Innlegg' }))).toBe(IKKE_PASIENTOPPLYSNINGER)
  })

  it('en ny idé minner om det', () => {
    render(
      <Ideskjema onStatus={() => {}} forlater={false} onForkast={() => {}} onFortsett={() => {}} onAvbryt={() => {}} onLagret={() => {}} />,
    )
    expect(beskrivelse(screen.getByRole('textbox', { name: 'Beskrivelse' }))).toBe(IKKE_PASIENTOPPLYSNINGER)
  })
})

describe('kildene', () => {
  const filer = (mappe: string): string[] =>
    readdirSync(mappe).flatMap((navn) => {
      const sti = join(mappe, navn)
      return statSync(sti).isDirectory() ? filer(sti) : sti.endsWith('.tsx') ? [sti] : []
    })

  // Direktelenkene finnes bare i samhandlingen, så de kjennetegner skrivefeltene der.
  const samhandling = filer(join(__dirname, '../components')).flatMap((fil) =>
    (readFileSync(fil, 'utf8').match(/<Rikteksteditor\b[^>]*>/g) ?? [])
      .filter((tagg) => /\bdirektelenker\b/.test(tagg))
      .map((tagg) => ({ fil, tagg })),
  )

  it('finner skrivefeltene for diskusjoner, idéer og kommentarer', () => {
    expect(new Set(samhandling.map((s) => s.fil.split('/components/')[1])).size).toBeGreaterThanOrEqual(4)
  })

  it('hver tekstredigerer i samhandlingen har påminnelsen', () => {
    expect(samhandling.filter((s) => !s.tagg.includes('hjelp={IKKE_PASIENTOPPLYSNINGER}'))).toEqual([])
  })
})
