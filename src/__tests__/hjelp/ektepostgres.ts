/**
 * Forbindelser til en ekte Postgres-server, for testene av samtidige
 * transaksjoner (PGlite har bare én forbindelse og kan ikke vise dem).
 * Serveren er `OUSFAR_POSTGRES_URL`; CI starter Postgres 17, som
 * produksjonen. Testene lager egne, midlertidige databaser på den.
 */
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process'

export const SERVER = process.env.OUSFAR_POSTGRES_URL

/** Adressen til databasen på serveren. */
export function url(database: string): string {
  const u = new URL(SERVER!)
  u.pathname = `/${database}`
  return u.toString()
}

/** Kjører SQL med psql og stopper ved første feil. */
export function psql(database: string, sql: string): string {
  const r = spawnSync('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', url(database)], {
    input: sql,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
  if (r.status !== 0) throw new Error(`psql feilet: ${r.stderr || r.error?.message}`)
  return r.stdout.trim()
}

/**
 * Sletter testdatabasene i én psql-økt, den sist lagde først (kopier før malen).
 * Én økt i stedet for én per database holder oppryddingen kort når CI er travel.
 */
export function slettDatabaser(databaser: readonly string[]): void {
  if (databaser.length === 0) return
  psql('postgres', [...databaser].reverse().map((db) => `drop database if exists ${db} with (force);`).join('\n'))
}

/**
 * Én forbindelse, styrt steg for steg. Hvert steg gir SQLSTATE for det siste
 * kallet (00000 når det gikk bra), lest av psql selv.
 */
export class Okt {
  private readonly prosess: ChildProcessWithoutNullStreams
  private utdata = ''
  private teller = 0

  constructor(database: string) {
    this.prosess = spawn('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=0', url(database)])
    this.prosess.stdout.on('data', (d: Buffer) => (this.utdata += d.toString()))
    this.prosess.stderr.on('data', () => undefined)
  }

  /** Sender et steg uten å vente; svaret hentes med funksjonen som gis tilbake. */
  send(sql: string): () => Promise<string> {
    const merke = `__steg_${++this.teller}__`
    this.prosess.stdin.write(`${sql}\n\\echo ${merke} :SQLSTATE\n`)
    return () => this.vent(merke)
  }

  async kjor(sql: string): Promise<string> {
    return this.send(sql)()
  }

  /** Om steget fortsatt venter (for eksempel på en lås) etter `ms`. */
  async venterFortsatt(svar: Promise<string>, ms: number): Promise<boolean> {
    return Promise.race([svar.then(() => false), new Promise<boolean>((r) => setTimeout(() => r(true), ms))])
  }

  private async vent(merke: string, frist = 20_000): Promise<string> {
    const slutt = Date.now() + frist
    for (;;) {
      const treff = new RegExp(`${merke} (\\w+)`).exec(this.utdata)
      if (treff) return treff[1]!
      if (Date.now() > slutt) throw new Error(`Ingen svar på ${merke}`)
      await new Promise((r) => setTimeout(r, 20))
    }
  }

  avslutt(): void {
    this.prosess.stdin.end('\\q\n')
  }
}
