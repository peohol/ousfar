/**
 * Alt OUSFAR gjør mot CYPinfo: synkroniseringen av katalogen hver uke fra
 * GitHub Actions (`.github/workflows/cypinfo-synk.yml`), og når en
 * systemarkitekt ber om det. Logikken står i `src/cypinfo/endepunkt.ts`.
 * Står CYPinfo i `STANSEDE_KILDER`, svarer endepunktet 410 uten å kalle kilden.
 */
import { behandleCypinfo } from '../src/cypinfo/endepunkt.js'
import { stansetSvar } from '../src/datakilder/stans.js'

function behandle(request: Request): Promise<Response> {
  return Promise.resolve(stansetSvar('cypinfo', 'CYPinfo') ?? behandleCypinfo(request, process.env))
}

export const GET = behandle
export const POST = behandle
