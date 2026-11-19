/**
 * De korte navnene i chattene (Peder 19.11.2026): fornavnet, med forbokstaven
 * i etternavnet når flere har samme fornavn, og hele navnet når flere også har
 * samme forbokstav. Bare syntetiske navn.
 */
import { describe, expect, it } from 'vitest'
import { kortnavn, type Navnekort } from '@delt/profil'
import type { Direktesamtale } from '../direktemeldinger/modell'
import { motpartnavn } from '../direktemeldinger/modell'
import { laastTekst } from '../components/grupper/gruppechatvisning'

let neste = 0
const person = (first_name: string, last_name: string, username = `test.${++neste}`): Navnekort => ({
  id: `00000000-0000-4000-8000-${String(++neste).padStart(12, '0')}`,
  username,
  first_name,
  last_name,
})

const navnene = (...personer: Navnekort[]) => {
  const kart = kortnavn(personer)
  return personer.map((p) => kart.get(p.id))
}

describe('kortnavn', () => {
  it('viser bare fornavnet når ingen andre har det samme', () => {
    expect(navnene(person('Kari', 'Testesen'), person('Ola', 'Prøvesen'))).toEqual(['Kari', 'Ola'])
  })

  it('legger til forbokstaven i etternavnet når flere har samme fornavn', () => {
    expect(navnene(person('Ola', 'Nordmann'), person('Ola', 'Andersen'), person('Kari', 'Nordmann'))).toEqual(['Ola N', 'Ola A', 'Kari'])
  })

  it('viser hele navnet når flere også har samme forbokstav, og forbokstaven for den som skiller seg ut', () => {
    expect(navnene(person('Ola', 'Nordmann'), person('Ola', 'Nilsen'), person('Ola', 'Andersen'))).toEqual(['Ola Nordmann', 'Ola Nilsen', 'Ola A'])
  })

  it('ser bort fra store og små bokstaver og ekstra mellomrom', () => {
    expect(navnene(person('ola', 'nordmann'), person('Ola', 'Nilsen'), person('Anne  Marie', 'Berg'))).toEqual([
      'ola nordmann',
      'Ola Nilsen',
      'Anne Marie',
    ])
    expect(navnene(person('Ola', 'nordmann'), person('OLA', 'andersen'))).toEqual(['Ola N', 'OLA A'])
  })

  it('teller samme bruker én gang', () => {
    const ola = person('Ola', 'Nordmann')
    expect(kortnavn([ola, ola, person('Kari', 'Testesen')]).get(ola.id)).toBe('Ola')
  })

  it('bruker brukernavnet uten navn, og fornavnet alene uten etternavn', () => {
    expect(navnene(person('', '', 'test.uten'), person('Ola', ''), person('Ola', 'Andersen'))).toEqual(['test.uten', 'Ola', 'Ola A'])
  })
})

describe('direktesamtalene', () => {
  const samtale = (motpart: Navnekort | null): Direktesamtale =>
    ({ id: `s-${motpart?.id ?? 'borte'}`, motpart: motpart && { ...motpart, avatar_path: null, updated_at: '2026-01-01T00:00:00Z' } }) as Direktesamtale

  it('gir raden og samtalen samme korte navn blant alle i lista, også for en ny', () => {
    const olaN = person('Ola', 'Nordmann')
    const olaA = person('Ola', 'Andersen')
    const kari = person('Kari', 'Testesen')
    const samtaler = [samtale(olaN), samtale(kari)]
    const navn = motpartnavn(samtaler)
    expect([navn(samtaler[0]!.motpart), navn(samtaler[1]!.motpart), navn(null)]).toEqual(['Ola', 'Kari', 'Tidligere bruker'])
    const ny = { ...olaA, avatar_path: null, updated_at: '2026-01-01T00:00:00Z' }
    const medNy = motpartnavn(samtaler, ny)
    expect([medNy(samtaler[0]!.motpart), medNy(ny)]).toEqual(['Ola N', 'Ola A'])
  })

  it('bruker samtalens navn på den andre i den låste linjen', () => {
    const meta = { motpart: null, sperre: 'selv_blokkert' as const, dempet: false }
    expect(laastTekst(true, meta, 'Ola N')).toBe('Du har blokkert Ola N. Opphev blokkeringen for å skrive.')
  })
})
