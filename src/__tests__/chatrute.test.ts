/**
 * Adressene til chatten (D4a): helsiden `#/chat` og en valgt samtale
 * `#/chat/gruppe/<id>`, lest og skrevet tilbake likt, og den gamle adressen
 * til chatfanen i en gruppe uendret til den skrives om i D4b.
 */
import { describe, expect, it } from 'vitest'
import { adresse, chatadresse, lesRute, sidesti } from '../domain/rute'

const ID = '11111111-1111-4111-8111-111111111111'

describe('adressene til chatten', () => {
  it.each([
    ['#/chat', { side: 'chat' }],
    ['#/chat/', { side: 'chat' }],
    [`#/chat/gruppe/${ID}`, { side: 'chat', samtale: { type: 'gruppe', id: ID } }],
    [`#/CHAT/Gruppe/${ID.toUpperCase()}`, { side: 'chat', samtale: { type: 'gruppe', id: ID } }],
  ])('%s', (hash, rute) => {
    expect(lesRute(hash)).toEqual(rute)
    expect(adresse(lesRute(hash))).toBe(chatadresse('samtale' in rute ? (rute.samtale as never) : undefined))
  })

  it('leser adressen tilbake som den samme', () => {
    for (const hash of ['#/chat', `#/chat/gruppe/${ID}`, `#/chat/direkte/${ID}`]) expect(adresse(lesRute(hash))).toBe(hash)
  })

  it('er samme side uansett samtale, så det å bytte samtale ikke er å bytte side', () => {
    expect(sidesti(lesRute('#/chat'))).toBe('chat')
    expect(sidesti(lesRute(`#/chat/gruppe/${ID}`))).toBe('chat')
  })

  it.each(['#/chat/gruppe', '#/chat/gruppe/ikke-en-id', '#/chat/direkte', `#/chat/privat/${ID}`, `#/chat/gruppe/${ID}/mer`, '#/chatten'])(
    '%s er en adresse appen ikke kjenner',
    (hash) => {
      expect(lesRute(hash)).toEqual({ side: 'ukjent', adresse: hash })
    },
  )

  it('lar den gamle adressen til chatfanen i en gruppe stå', () => {
    expect(lesRute(`#/grupper/${ID}/chat`)).toEqual({ side: 'grupper', gruppe: ID, fane: 'chat' })
  })
})
