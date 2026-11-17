/**
 * Kopien av CYPinfo-katalogen i databasen, slik synkroniseringen skriver til
 * den. Skrivingen krever den hemmelige nøkkelen og skjer bare på serveren.
 * Funksjonene er beskrevet i migrasjonen `*_cypinfo.sql`.
 */
import type { Databasekall } from '../legemiddeldata/lager.js'
import type { Entitetnavn } from './modell.js'

export interface ForrigeSynk {
  /** Genene hvert aktive legemiddel hadde etter siste bytte, per CYPinfo-ID. */
  gener: Record<string, string[]>
}

export interface Innlastingsrad {
  id: string
  data: object
  raa?: unknown
}

/** Det kjøringen fant som noen bør vurdere, til «Datakilder». */
export interface Synkrapport {
  /** Legemidlene som ikke kan kobles til en fagside uten at noen vurderer dem. */
  uavklarte: string[]
  /** Én setning per forhold. */
  merknader: string[]
}

export interface Uttrekksinnhold {
  parserversjon: number
  entiteter: Record<Entitetnavn, { rader: Innlastingsrad[]; forkastet: number }>
  /** Antall kall mot rapporten kjøringen gjorde. */
  kall: number
  rapport: Synkrapport
}

export type Opptelling = Partial<Record<Entitetnavn, { inn: number; nye: number; endrede: number; utgatte: number; forkastet: number }>> &
  Partial<Synkrapport> & { kall?: number }

export interface Cypinfolager {
  forrige(): Promise<ForrigeSynk>
  start(utlostAv: 'cron' | 'manuell'): Promise<number>
  fullfor(synk: number, innhold: Uttrekksinnhold): Promise<{ status: 'fullfort' | 'uendret'; antall: Opptelling }>
  avbryt(synk: number, feil: string): Promise<void>
}

export function lagCypinfolager(kall: Databasekall): Cypinfolager {
  return {
    forrige: async () => ((await kall('cypinfo_forrige_synk', {})) as ForrigeSynk | null) ?? { gener: {} },
    start: async (utlostAv) => Number(await kall('cypinfo_start_synk', { utlost_av: utlostAv })),
    fullfor: async (synk, innhold) =>
      (await kall('cypinfo_fullfor_synk', { synk, innhold })) as { status: 'fullfort' | 'uendret'; antall: Opptelling },
    avbryt: async (synk, feil) => {
      await kall('cypinfo_avbryt_synk', { synk, feil })
    },
  }
}
