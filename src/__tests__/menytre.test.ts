/**
 * Den felles modellen for hierarkiske menyer (`src/components/meny/menytre.ts`)
 * og «Fag» i hovedmenyen (`fagmeny.ts`), uten visning (Issue #604).
 *
 * - Skjulte valg og undermenyer uten innhold forsvinner, også når innholdet
 *   ble borte lenger ned; et nivå med en tekst for tomt eller et søk står.
 * - Stien stopper ved et nivå som ikke (lenger) finnes.
 * - Det nye under et valg samles på valgene over det; siden brukeren står på,
 *   merker valgene som fører ned til den.
 * - Stoffregisteret: kategoriene med antallet, stoffene med underkategoriene
 *   som mellomoverskrifter eller i én bolk, og søket på navn og andre navn.
 */
import { describe, expect, it } from 'vitest'
import { fagmeny, stoffsok, type Fagkilder } from '../components/meny/fagmeny'
import { folgSti, gjeldendeUnder, nyttINiva, nyttUnder, punktene, rensNiva, type Menyniva, type Menypunkt } from '../components/meny/menytre'
import { STOFFREGISTERDATA, byggStoffregister } from '../domain/stoffregister'
import type { Rute } from '../domain/rute'
import { VERKTOY } from '../verktoy/register'
import { GRUNNSTRUKTUR } from './hjelp/registerstruktur'

const lenke = (id: string, ekstra: Partial<Menypunkt> = {}): Menypunkt => ({ id, navn: id, adresse: `#/${id}`, ...ekstra })
const under = (id: string, punkter: Menypunkt[], ekstra: Partial<Menyniva> = {}): Menypunkt => ({
  id,
  navn: id,
  undermeny: { navn: id, avsnitt: [{ id, punkter }], ...ekstra },
})
const niva = (...punkter: Menypunkt[]): Menyniva => ({ navn: 'rot', avsnitt: [{ id: 'a', punkter }] })
const ider = (n: Menyniva) => punktene(n).map((p) => p.id)

describe('menytreet', () => {
  it('tar bort skjulte valg og undermenyer uten innhold, også flere nivåer ned', () => {
    const rot = rensNiva(
      niva(
        lenke('synlig'),
        lenke('skjult', { vis: false }),
        under('tom', []),
        under('bare-skjult', [lenke('x', { vis: false })]),
        under('tom-lenger-ned', [under('tom2', [])]),
        under('med-innhold', [lenke('y'), under('tom3', [])]),
        under('med-tekst', [], { tomt: 'Ingen ennå' }),
        under('gren', [lenke('z')]),
      ),
    )
    // Et skjult valg med innhold under forsvinner også.
    const skjult = rensNiva(niva(under('g', [lenke('z')]), { ...under('h', [lenke('w')]), vis: false }))
    expect(ider(skjult)).toEqual(['g'])
    expect(ider(rot)).toEqual(['synlig', 'med-innhold', 'med-tekst', 'gren'])
    expect(ider(punktene(rot).find((p) => p.id === 'med-innhold')!.undermeny!)).toEqual(['y'])
    // Avsnitt uten valg forsvinner.
    expect(rensNiva({ navn: 'r', avsnitt: [{ id: 'tom', punkter: [] }, { id: 'b', punkter: [lenke('q')] }] }).avsnitt.map((a) => a.id)).toEqual(['b'])
  })

  it('følger stien så langt den finnes', () => {
    const rot = niva(under('a', [under('b', [lenke('c')])]), lenke('d'))
    expect(folgSti(rot, ['a', 'b']).map((n) => n.niva.navn)).toEqual(['rot', 'a', 'b'])
    // En ID som ikke finnes, eller som ikke er en undermeny, stopper stien.
    expect(folgSti(rot, ['a', 'borte', 'b']).map((n) => n.niva.navn)).toEqual(['rot', 'a'])
    expect(folgSti(rot, ['d']).map((n) => n.niva.navn)).toEqual(['rot'])
    expect(folgSti(rot, []).map((n) => n.punkt?.id)).toEqual([undefined])
  })

  it('samler det nye under et valg, og merker veien ned til siden brukeren står på', () => {
    const rot = niva(
      lenke('egen', { nytt: 'én ny invitasjon' }),
      under('app', [lenke('ideer', { nytt: 'nye kommentarer' }), under('dypt', [lenke('x', { nytt: 'en sak', gjeldende: true })])]),
    )
    const app = punktene(rot)[1]!
    expect(nyttUnder(app)).toEqual(['nye kommentarer', 'en sak'])
    expect(nyttINiva(rot)).toEqual(['én ny invitasjon', 'nye kommentarer', 'en sak'])
    expect(gjeldendeUnder(app)).toBe(true)
    expect(gjeldendeUnder(punktene(rot)[0]!)).toBe(false)
  })
})

const REGISTER = byggStoffregister([], STOFFREGISTERDATA, GRUNNSTRUKTUR)
const FORSIDEN: Rute = { side: 'forside' }

function kilder(ekstra: Partial<Fagkilder> = {}): Fagkilder {
  return {
    register: REGISTER,
    favoritter: null,
    verktoy: [],
    visUnderkategorier: true,
    settVisUnderkategorier: () => undefined,
    rute: FORSIDEN,
    ...ekstra,
  }
}

/** Nivået under valget med denne stien fra «Fag». */
function nivaet(k: Fagkilder, ...sti: string[]): Menyniva {
  const rot: Menyniva = { navn: 'Meny', avsnitt: [{ id: 'a', punkter: [fagmeny(k)] }] }
  const nivaene = folgSti(rensNiva(rot), ['fag', ...sti])
  expect(nivaene).toHaveLength(sti.length + 2)
  return nivaene[nivaene.length - 1]!.niva
}

describe('Fag i hovedmenyen', () => {
  it('har stoffregisteret alltid, verktøyene og favorittene bare for dem som har dem', () => {
    expect(ider(nivaet(kilder()))).toEqual(['stoffregister'])
    const favoritter = { stoffer: [], erFavoritt: () => false, sett: () => undefined }
    expect(ider(nivaet(kilder({ verktoy: VERKTOY, favoritter })))).toEqual(['stoffregister', 'verktoy', 'favoritter'])
  })

  it('har helsiden og kategoriene med antallet stoffer, og hver kategori sine stoffer med underkategoriene som mellomoverskrifter', () => {
    const register = nivaet(kilder(), 'stoffregister')
    expect(register.sok?.etikett).toBe('Søk i stoffregisteret')
    expect(register.avsnitt.map((a) => a.overskrift)).toEqual([undefined, 'Stoffkategorier'])
    expect(register.avsnitt[0]!.punkter[0]!.adresse).toBe('#/stoffregister')
    const kategorier = register.avsnitt[1]!.punkter
    expect(kategorier.map((k) => k.navn)).toEqual(REGISTER.kategorier.map((k) => k.navn))
    const antidepressiver = kategorier.find((k) => k.navn === 'Antidepressiver')!
    const kategori = REGISTER.kategorier.find((k) => k.navn === 'Antidepressiver')!
    expect(antidepressiver.merke).toBe(String(kategori.stoffer.length))
    expect(antidepressiver.merkeetikett).toBe(`${kategori.stoffer.length} stoffer`)

    const med = nivaet(kilder(), 'stoffregister', antidepressiver.id)
    expect(med.bryter?.pa).toBe(true)
    expect(med.avsnitt.map((a) => a.overskrift)).toContain('TCA')
    const uten = nivaet(kilder({ visUnderkategorier: false }), 'stoffregister', antidepressiver.id)
    expect(uten.avsnitt.map((a) => a.overskrift)).toEqual([undefined])
    // De samme stoffene, bare uten inndelingen.
    expect(ider(uten).sort()).toEqual([...new Set(ider(med))].sort())
    expect(punktene(uten).every((p) => p.adresse === `#/stoff/${p.id}`)).toBe(true)
  })

  it('merker stoffet brukeren står på, og veien ned til det', () => {
    const rute: Rute = { side: 'stoff', stoff: 'bupropion' }
    const register = nivaet(kilder({ rute }), 'stoffregister')
    const antidepressiver = register.avsnitt[1]!.punkter.find((k) => k.navn === 'Antidepressiver')!
    expect(gjeldendeUnder(antidepressiver)).toBe(true)
    expect(punktene(antidepressiver.undermeny!).filter((p) => p.gjeldende).map((p) => p.id)).toEqual(['bupropion'])
  })

  it('søker på begynnelsen av ordene i navnet og de andre navnene, med navnetreffene først', () => {
    const treff = (q: string) => stoffsok(kilder(), q).flatMap((a) => a.punkter.map((p) => [p.id, p.hint]))
    expect(treff('')).toEqual([])
    expect(treff('bupro')).toEqual([['bupropion', undefined]])
    // Et annet navn står ved siden av; store bokstaver og aksenter betyr ingenting.
    expect(treff('BENZOYL')).toEqual([['kokain', 'Benzoylekgonin']])
    // Midt i et ord er ikke et treff.
    expect(treff('propion')).toEqual([])
  })

  it('har favorittene alfabetisk, uten dem i papirkurven, med en knapp som fjerner hver', () => {
    const fjernet: string[] = []
    const favoritter = { stoffer: ['sertralin', 'bupropion', 'ukjent-stoff'], erFavoritt: () => true, sett: (s: string) => void fjernet.push(s) }
    const liste = nivaet(kilder({ favoritter }), 'favoritter')
    expect(liste.tomt).toBeDefined()
    expect(punktene(liste).map((p) => p.navn)).toEqual(['Bupropion', 'Sertralin', 'ukjent-stoff'])
    punktene(liste)[0]!.tillegg!.handling()
    expect(fjernet).toEqual(['bupropion'])
    expect(punktene(liste)[0]!.tillegg!.etikett).toBe('Fjern Bupropion fra favoritter')
  })
})
