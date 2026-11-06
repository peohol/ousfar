import { describe, expect, it } from 'vitest'
import { lagFestsvar, lokaltOppsett } from './lokalmiljo'
import {
  betroddProduksjonsadresse,
  blokkeresIProduksjon,
  erLokal,
  erSupabaseISkyen,
  grenserFor,
  LOKALE_GRENSER,
  malFor,
  PRODUKSJONSGRENSER,
  PRODUKSJONSVERTER,
  Teststopp,
  Trafikkvakt,
  type Grenser,
} from './trafikkvakt'

const PROD = 'https://ousfar.vercel.app'

describe('hvor kontrollen kjører', () => {
  it('er lokal som standard, også når APP_URL peker på den publiserte appen', () => {
    expect(malFor({})).toEqual({ modus: 'lokal' })
    expect(malFor({ APP_URL: PROD })).toEqual({ modus: 'lokal' })
    expect(malFor({ APP_URL: PROD, QA_PRODUKSJON: '' })).toEqual({ modus: 'lokal' })
  })

  it('går til produksjonen bare med QA_PRODUKSJON=ja og en adresse utenfor maskinen', () => {
    expect(malFor({ APP_URL: `${PROD}/`, QA_PRODUKSJON: 'ja' })).toEqual({ modus: 'produksjon', url: PROD })
    expect(malFor({ APP_URL: PROD, QA_PRODUKSJON: ' JA ' })).toEqual({ modus: 'produksjon', url: PROD })
    expect(() => malFor({ APP_URL: PROD, QA_PRODUKSJON: 'yes' })).toThrow(/QA_PRODUKSJON må være «ja»/)
    expect(() => malFor({ QA_PRODUKSJON: 'ja' })).toThrow(/krever APP_URL/)
    expect(() => malFor({ APP_URL: 'http://127.0.0.1:4173', QA_PRODUKSJON: 'ja' })).toThrow(/gjelder den publiserte appen/)
  })

  it('godtar i produksjon bare den publiserte appen over HTTPS, før passordet kan brukes', () => {
    const mal = (APP_URL: string) => malFor({ APP_URL, QA_PRODUKSJON: 'ja' })
    expect(PRODUKSJONSVERTER).toEqual(['ousfar.vercel.app'])
    expect(mal('https://ousfar.vercel.app/verktoy?x=1')).toEqual({ modus: 'produksjon', url: PROD })
    expect(mal('https://OUSFAR.vercel.app')).toEqual({ modus: 'produksjon', url: PROD })
    expect(() => mal('http://ousfar.vercel.app')).toThrow(/krever HTTPS/)
    for (const fremmed of [
      'https://evil.example.com',
      'https://ousfar.vercel.app.evil.example.com',
      'https://ousfar-git-gren-peohol.vercel.app',
      'https://ousfar.vercel.app@evil.example.com',
      'https://bruker:passord@ousfar.vercel.app',
      'https://ousfar.vercel.app:8443',
    ])
      expect(() => mal(fremmed), fremmed).toThrow(/godtar bare https:\/\/ousfar\.vercel\.app/)
    expect(() => mal('ousfar.vercel.app')).toThrow(/ikke en gyldig adresse/)
    expect(betroddProduksjonsadresse(`${PROD}/`)).toBe(PROD)
  })

  it('regner bare maskinen selv som lokal, og bare Supabase i skyen som produksjonsdatabasen', () => {
    expect(['http://localhost:4173', 'http://127.0.0.1:54321', 'http://[::1]:4173'].every(erLokal)).toBe(true)
    // En forhåndsvisning på Vercel bruker den samme databasen som produksjonen.
    expect(['https://ousfar-git-gren-peohol.vercel.app', PROD, 'http://192.168.1.5:4173'].some(erLokal)).toBe(false)
    expect(erSupabaseISkyen('https://jfzqowsmjtthpbipnxnf.supabase.co/rest/v1/rpc/les_stoffer')).toBe(true)
    expect(erSupabaseISkyen('http://127.0.0.1:54321/rest/v1/rpc/les_stoffer')).toBe(false)
    expect(erSupabaseISkyen('https://supabase.co.example.com/')).toBe(false)
  })
})

describe('grensene', () => {
  it('har faste tak i produksjon og ingen lokalt, utover nye forsøk', () => {
    expect(grenserFor('produksjon', {})).toEqual(PRODUKSJONSGRENSER)
    expect(PRODUKSJONSGRENSER.nyeForsok).toBe(0)
    expect(grenserFor('lokal', { QA_MAKS_FORLOP: '1' })).toEqual(LOKALE_GRENSER)
  })

  it('kan senkes, men aldri heves, i produksjon; pausen kan bare bli lengre', () => {
    const g = grenserFor('produksjon', { QA_MAKS_FORLOP: '2', QA_MAKS_KALL: '99999', QA_MAKS_NYE_FORSOK: '3', QA_PAUSE_MS: '1000', QA_TREGT_KALL_MS: '2000' })
    expect(g).toMatchObject({ forlop: 2, kall: PRODUKSJONSGRENSER.kall, nyeForsok: 0, pauseMs: PRODUKSJONSGRENSER.pauseMs, tregtKallMs: 2000 })
    expect(grenserFor('produksjon', { QA_PAUSE_MS: '60000' }).pauseMs).toBe(60_000)
    expect(() => grenserFor('produksjon', { QA_MAKS_FORLOP: 'mange' })).toThrow(/QA_MAKS_FORLOP må være et tall/)
    expect(() => grenserFor('produksjon', { QA_MAKS_KALL: '-1' })).toThrow(/QA_MAKS_KALL/)
  })
})

it('blokkerer fagsøkets bakgrunnslesinger, og ikke det verktøyene bruker', () => {
  const rpc = (f: string) => `https://x.supabase.co/rest/v1/rpc/${f}`
  for (const f of ['les_stoffer', 'les_preparatsok', 'les_interaksjonssok', 'les_farmakogenetikk_sok', 'les_cpic', 'les_laboratoriesok']) expect(blokkeresIProduksjon(rpc(f))).toBe(true)
  for (const f of ['les_legemidler', 'les_verktoysperrer', 'les_stoff', 'les_stoffer_x', 'sokedata_versjoner']) expect(blokkeresIProduksjon(rpc(f))).toBe(false)
  expect(blokkeresIProduksjon('https://x.supabase.co/rest/v1/les_stoffer')).toBe(false)
})

describe('trafikkvakten', () => {
  const grenser: Grenser = { forlop: 3, kall: 5, nyeForsok: 0, pauseMs: 1000, tregtKallMs: 500, varighetMs: 60_000 }
  const vakt = (g: Partial<Grenser> = {}) => {
    let na = 0
    const v = new Trafikkvakt('produksjon', { ...grenser, ...g }, () => na)
    return { v, still: (ms: number) => (na += ms) }
  }

  it('godtar raske svar under taket', () => {
    const { v, still } = vakt()
    for (let i = 0; i < 5; i++) {
      v.kall(i)
      still(100)
      v.svar(i, 200)
    }
    expect(v.stoppet).toBeNull()
    expect(v.rapport()).toMatchObject({ kall: 5, feil5xx: 0, tregeste: 100 })
  })

  it('stopper ved første svar med 5xx', () => {
    const { v, still } = vakt()
    v.kall('a')
    still(300)
    v.svar('a', 500)
    expect(v.stoppet).toBe('databasen svarte 500 etter 300 ms')
    expect(() => v.nyttForlop()).toThrow(Teststopp)
  })

  it('stopper når et svar kommer etter grensen, men ikke på grensen', () => {
    const { v, still } = vakt()
    v.kall('a')
    still(500)
    v.svar('a', 200)
    expect(v.stoppet).toBeNull()
    v.kall('b')
    still(501)
    v.svar('b', 200)
    expect(v.stoppet).toMatch(/tok 501 ms/)
  })

  it('stopper når et kall fortsatt venter etter grensen (overbelastnings-timeout)', () => {
    const { v, still } = vakt()
    v.kall('a')
    still(400)
    v.kontroller()
    expect(v.stoppet).toBeNull()
    still(200)
    v.kontroller()
    expect(v.stoppet).toMatch(/ventet i mer enn 500 ms/)
  })

  it('lar avbrutte kall gå uten å stoppe, så lenge de var raske', () => {
    const { v, still } = vakt()
    v.kall('a')
    still(50)
    v.avbrutt('a')
    still(10_000)
    v.kontroller()
    expect(v.stoppet).toBeNull()
  })

  it('stopper ved kall nummer taket + 1', () => {
    const { v } = vakt()
    for (let i = 0; i < 5; i++) v.kall(i)
    expect(v.stoppet).toBeNull()
    v.kall(5)
    expect(v.stoppet).toBe('mer enn 5 kall mot databasen')
  })

  it('teller forløp, krever pause mellom dem og stopper ved taket', () => {
    const { v, still } = vakt()
    expect(v.nyttForlop()).toBe(0)
    still(300)
    expect(v.nyttForlop()).toBe(700)
    still(700 + 2000)
    expect(v.nyttForlop()).toBe(0)
    expect(() => v.nyttForlop()).toThrow(/høyst 3 forløp i produksjon/)
  })

  it('stopper når kjøringen har vart for lenge', () => {
    const { v, still } = vakt()
    still(60_001)
    expect(() => v.nyttForlop()).toThrow(/mer enn 1 min/)
  })

  it('beholder den første grunnen', () => {
    const { v } = vakt()
    v.stopp('første')
    v.stopp('andre')
    expect(v.stoppet).toBe('første')
  })

  it('lokalt: ingen tak, ingen pause', () => {
    const v = new Trafikkvakt('lokal', { ...LOKALE_GRENSER })
    for (let i = 0; i < 1000; i++) v.kall(i)
    for (let i = 0; i < 100; i++) expect(v.nyttForlop()).toBe(0)
    expect(v.stoppet).toBeNull()
  })
})

describe('det lokale testmiljøet', () => {
  it('tar bort bare linjen som slår av innlogging med e-post', () => {
    const toml = ['[auth]', 'enable_signup = false', '', '[auth.email]', '# kommentar', 'enable_signup = false', 'enable_confirmations = false', '', '[auth.sms]', 'enable_signup = false'].join('\n')
    expect(lokaltOppsett(toml).split('\n')).toEqual(['[auth]', 'enable_signup = false', '', '[auth.email]', '# kommentar', 'enable_confirmations = false', '', '[auth.sms]', 'enable_signup = false'])
  })

  it('svarer på FEST fra uttrekket som dekker flest virkestoffer, kontrollert nå', () => {
    const uttrekk = (navn: string, ider: string[]) => ({ hentet: '2026-10-01', utvalg: { kilde: navn, kontrollert_kl: '2026-10-01T00:00:00Z', virkestoff: ider.map((id) => ({ id })) } })
    const svar = lagFestsvar([uttrekk('pilot', ['a', 'b']), uttrekk('bytter', ['b', 'c', 'd'])] as never)
    const for_ = Date.now()
    expect(svar(['c', 'd']).kilde).toBe('bytter')
    expect(svar(['a']).kilde).toBe('pilot')
    // Lik dekning: det første (pilotsettet) vinner, som i den lokale kjøringen.
    expect(svar(['b']).kilde).toBe('pilot')
    expect(Date.parse(svar(['a']).kontrollert_kl!)).toBeGreaterThanOrEqual(for_)
  })
})
