/**
 * Synkroniseringen av farmakogenetiske data fra ClinPGx: hver uke fra Vercel
 * (`GET`, tidspunktet står i `vercel.json`), og når en administrator ber om det
 * (`POST`). Logikken står i `src/clinpgx/endepunkt.ts`. Står ClinPGx i
 * `STANSEDE_KILDER`, svarer endepunktet 410 uten å kalle kilden.
 */
import { behandleClinpgxSynk } from '../src/clinpgx/endepunkt.js'
import { stansetSvar } from '../src/datakilder/stans.js'

function behandle(request: Request): Promise<Response> {
  return Promise.resolve(stansetSvar('clinpgx', 'ClinPGx') ?? behandleClinpgxSynk(request, process.env))
}

export function GET(request: Request): Promise<Response> {
  return behandle(request)
}

export function POST(request: Request): Promise<Response> {
  return behandle(request)
}
