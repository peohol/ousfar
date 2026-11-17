/**
 * P6b: lesingen av idéene og oppgavene i en gruppe, som rene funksjoner
 * (docs/fagmiljoer.md, «Idéer og oppgaver i gruppene»). Reglene databasen
 * håndhever, står i `gruppesamhandling.test.ts`.
 */
import { describe, expect, it } from 'vitest'
import { lesGruppeoversikt } from '../grupper/modell'
import {
  GRUPPEOPPGAVESTATUSNAVN,
  INGEN_GRUPPEOPPGAVER,
  PRIORITETSNAVN,
  lesGruppeoppgave,
  lesGruppeoppgaveliste,
  mineGruppeoppgaver,
} from '../grupper/oppgaver'
import { INGEN_GRUPPEIDEER, idetilstand, lesGruppeideer, lesIdeoversikt } from '../ideer/modell'

const OPPGAVE = {
  id: 'o1',
  gruppe_id: 'g1',
  tittel: 'Lag en sjekkliste',
  beskrivelse: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Kort' }] }] },
  ansvarlig_id: 'kari',
  ansvarlig_har_tilgang: true,
  prioritet: 'hoy',
  status: 'paagaar',
  foreslatt_av: 'ola',
  opprettet_av: 'per',
  opprettet_kl: '2026-11-17T10:00:00Z',
  endret_kl: null,
  status_kl: '2026-11-17T11:00:00Z',
  fullfort_kl: null,
  ide: { id: 'i1', tittel: 'Sjekkliste', kommentarer: 2 },
  kan_endre: false,
  kan_sette_status: true,
  lest_kl: '2026-11-17T12:00:00Z',
}

const IDE = {
  id: 'i1',
  forfatter_id: 'ola',
  kategori: null,
  gruppe_id: 'g1',
  tittel: 'Sjekkliste',
  opprettet_kl: '2026-11-17T09:00:00Z',
  hjerter: 1,
  mitt_hjerte: true,
  kommentarer: 2,
  nye_kommentarer: 0,
  sett: false,
  gruppeoppgave: { id: 'o1', status: 'paagaar', tittel: 'Lag en sjekkliste' },
}

describe('oppgavene i en gruppe', () => {
  it('leser en oppgave, med idéen den kom fra og hva den innloggede kan gjøre', () => {
    const oppgave = lesGruppeoppgave(OPPGAVE)!
    expect(oppgave).toMatchObject({ id: 'o1', prioritet: 'hoy', status: 'paagaar', ansvarlig_id: 'kari', kan_endre: false, kan_sette_status: true, lest_kl: '2026-11-17T12:00:00Z' })
    expect(oppgave.ide).toEqual({ id: 'i1', tittel: 'Sjekkliste', kommentarer: 2 })
    expect(oppgave.beskrivelse?.type).toBe('doc')
    expect(GRUPPEOPPGAVESTATUSNAVN[oppgave.status]).toBe('Pågår')
    expect(PRIORITETSNAVN[oppgave.prioritet]).toBe('Høy')
  })

  it('avviser en oppgave uten formen, og gir normal prioritet når den mangler', () => {
    expect(lesGruppeoppgave({ ...OPPGAVE, status: 'klar' })).toBeNull()
    expect(lesGruppeoppgave({ ...OPPGAVE, gruppe_id: null })).toBeNull()
    expect(lesGruppeoppgave(null)).toBeNull()
    expect(lesGruppeoppgave({ ...OPPGAVE, prioritet: 'akutt', ide: null, beskrivelse: null })).toMatchObject({ prioritet: 'normal', ide: null, beskrivelse: null })
  })

  it('leser lista og finner oppgavene den innloggede har igjen', () => {
    const liste = lesGruppeoppgaveliste({
      kan_opprette: true,
      oppgaver: [OPPGAVE, { ...OPPGAVE, id: 'o2', status: 'fullfort', fullfort_kl: 'x' }, { ...OPPGAVE, id: 'o3', ansvarlig_id: null }, 'tull'],
    })
    expect(liste.kan_opprette).toBe(true)
    expect(liste.oppgaver.map((o) => o.id)).toEqual(['o1', 'o2', 'o3'])
    expect(mineGruppeoppgaver(liste.oppgaver, 'kari').map((o) => o.id)).toEqual(['o1'])
    expect(lesGruppeoppgaveliste('tull')).toEqual(INGEN_GRUPPEOPPGAVER)
  })
})

describe('idéene i en gruppe', () => {
  it('leser en gruppeidé uten kategori, med oppgaven den er gjort om til', () => {
    const svar = lesGruppeideer({ kan_skrive: true, kan_behandle: false, ideer: [IDE] })
    expect(svar).toMatchObject({ kan_skrive: true, kan_behandle: false })
    expect(svar.ideer).toEqual([expect.objectContaining({ id: 'i1', kategori: null, gruppe_id: 'g1', sett: false })])
    expect(idetilstand(svar.ideer[0]!)).toBe('gruppeoppgave')
    expect(lesGruppeideer(null)).toEqual(INGEN_GRUPPEIDEER)
  })

  it('avviser en idé med både kategori og gruppe, eller ingen av dem', () => {
    expect(lesIdeoversikt([{ ...IDE, kategori: 'fag' }])).toEqual([])
    expect(lesIdeoversikt([{ ...IDE, gruppe_id: null }])).toEqual([])
    expect(lesIdeoversikt([{ ...IDE, kategori: 'fag', gruppe_id: null, gruppeoppgave: null }])).toHaveLength(1)
  })
})

describe('tallene til fanene', () => {
  it('leser tallene, og gir null når de mangler', () => {
    const grunn = { id: 'g1', navn: 'Hepatologi', medlemmer: [] }
    expect(lesGruppeoversikt({ ...grunn, samhandling: { nye_ideer: 2, venter: 1, mine_oppgaver: 3 } })?.samhandling).toEqual({
      nye_ideer: 2,
      venter: 1,
      mine_oppgaver: 3,
    })
    expect(lesGruppeoversikt(grunn)?.samhandling).toEqual({ nye_ideer: 0, venter: 0, mine_oppgaver: 0 })
  })
})
