/**
 * Tilgangen kopijobben får til prosjektet (`src/drift/sikkerhetskopi/prosjekt.ts`),
 * mot et falskt Management API: databaserollen lages først når den trengs
 * (etter den synkrone referansebyggingen), passordet fornyes tre ganger i
 * løpet av levetiden mens kopien tas, og rollen slettes til slutt. En fornying
 * som feiler, gjør at jobben stopper, uten at svaret fra API-et skrives ut.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OffentligStopp } from '../drift/sikkerhetskopi/feil'
import { apneProsjekt, fornyingshyppighet } from '../drift/sikkerhetskopi/prosjekt'

describe('tilgangen til prosjektet', () => {
  const kall: string[] = []
  let feilVedFornying = false
  let passord = 0

  beforeEach(() => {
    vi.useFakeTimers()
    kall.length = 0
    feilVedFornying = false
    passord = 0
    process.env.SUPABASE_ACCESS_TOKEN = 'token'
    vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
      const sti = new URL(url).pathname.replace(/^\/v1\/projects\/[^/]+/, '')
      const metode = init.method ?? 'GET'
      kall.push(`${metode} ${sti}`)
      const json = (v: unknown, status = 200) => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json' } })
      if (sti === '') return json({ database: { version: '17.6.1.166' } })
      if (sti === '/config/database/pooler') return json([{ database_type: 'PRIMARY', db_host: 'pool.example', db_name: 'postgres' }])
      if (sti === '/api-keys') return json([{ name: 'hemmelig', type: 'secret', api_key: 'sb_secret_x' }])
      if (sti === '/auth/v1/health') return json({ version: 'v2.199.0' })
      if (sti === '/storage/v1/version') return new Response('1.100.0')
      if (sti === '/cli/login-role' && metode === 'POST') {
        if (feilVedFornying && passord > 0) return new Response('intern feil med detaljer', { status: 403 })
        return json({ role: 'cli_login_postgres', password: `passord-${++passord}`, ttl_seconds: 300 })
      }
      if (sti === '/cli/login-role' && metode === 'DELETE') return json({})
      return new Response('ukjent', { status: 404 })
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete process.env.PGPASSWORD
  })

  it('lager rollen først ved apneDatabase, fornyer passordet hvert tredjedel av levetiden og sletter rollen', async () => {
    const p = await apneProsjekt('ref')
    expect(p.versjoner).toEqual({ auth: 'v2.199.0', storage: 'v1.100.0', postgres: '17.6.1.166' })
    // Referansen bygges her, synkront; ingen rolle er laget, så ingen passord kan gå ut.
    expect(kall.filter((k) => k.includes('login-role'))).toEqual([])
    const db = await p.apneDatabase()
    expect(db.dbUrl).toBe('postgresql://cli_login_postgres.ref@pool.example:5432/postgres')
    expect(process.env.PGPASSWORD).toBe('passord-1')
    expect(fornyingshyppighet(300)).toBe(100_000)
    // En lang kopi: passordet er alltid fornyet lenge før det går ut.
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(passord).toBe(37)
    expect(process.env.PGPASSWORD).toBe('passord-37')
    await db.lukk()
    expect(kall.at(-1)).toBe('DELETE /cli/login-role')
    expect(process.env.PGPASSWORD).toBeUndefined()
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
    expect(passord).toBe(37)
  })

  it('stopper når en fornying feilet, uten svaret fra API-et', async () => {
    feilVedFornying = true
    const db = await (await apneProsjekt('ref')).apneDatabase()
    await vi.advanceTimersByTimeAsync(150_000)
    const feil = await db.lukk().then(() => null, (e: unknown) => e)
    expect(feil).toBeInstanceOf(OffentligStopp)
    expect((feil as Error).message).toMatch(/login-role svarte 403/)
    expect((feil as Error).message).not.toMatch(/detaljer/)
    expect(kall.at(-1)).toBe('DELETE /cli/login-role')
  })
})
