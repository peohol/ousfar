/**
 * Oppslaget i ClinPGx som administratorene bruker til å koble en stoffside.
 * Logikken står i `src/clinpgx/endepunkt.ts`. Står ClinPGx i
 * `STANSEDE_KILDER`, svarer endepunktet 410 uten å kalle kilden.
 */
import { behandleClinpgxSok } from '../src/clinpgx/endepunkt.js'
import { stansetSvar } from '../src/datakilder/stans.js'

export function GET(request: Request): Promise<Response> {
  return Promise.resolve(stansetSvar('clinpgx', 'ClinPGx') ?? behandleClinpgxSok(request, process.env))
}
