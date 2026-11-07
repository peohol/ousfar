/**
 * Synkroniseringen av de strukturerte farmakogenetiske dataene fra CPIC, når
 * en administrator ber om det (`POST`). Logikken står i `src/cpic/endepunkt.ts`.
 *
 * CPIC er stanset fra 6.11.2026 (`src/datakilder/stans.ts`): den ukentlige
 * jobben er tatt ut av `vercel.json`, og endepunktet svarer 410 uten å hente.
 */
import { behandleCpicSynk } from '../src/cpic/endepunkt.js'
import { stansetSvar } from '../src/datakilder/stans.js'

function behandle(request: Request): Promise<Response> {
  return Promise.resolve(stansetSvar('cpic', 'CPIC') ?? behandleCpicSynk(request, process.env))
}

export const GET = behandle
export const POST = behandle
