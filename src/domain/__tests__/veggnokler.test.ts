/**
 * Nøklene innloggingsveggen kontrollerer øktene med (`src/auth/veggnokler.ts`).
 *
 * Veggen skal ikke stenge en gyldig økt ute fordi Supabase ikke svarte på
 * nøkkelsettet akkurat da — det var det som ga «Fikk ikke hentet appen» rett
 * etter «Oppdater nå» — men den skal heller aldri slippe inn et token som
 * ikke er signert med en av prosjektets nøkler.
 */
import { describe, expect, it } from 'vitest'
import { exportJWK, generateKeyPair, jwtVerify, SignJWT, type JWK } from 'jose'
import { BRUKBARE_I, FERSKE_I, FORSOK_UTEN_NOKLER, NY_NOKKEL_ETTER, veggnokler } from '../../auth/veggnokler'

const ADRESSE = new URL('https://eksempel.supabase.co/auth/v1/.well-known/jwks.json')

async function nokkelpar(kid: string) {
  const { privateKey, publicKey } = await generateKeyPair('ES256', { extractable: true })
  const offentlig: JWK = { ...(await exportJWK(publicKey)), kid, alg: 'ES256', use: 'sig' }
  const token = await new SignJWT({ sub: 'bruker' })
    .setProtectedHeader({ alg: 'ES256', kid })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)
  return { offentlig, token }
}

/** Et Supabase som svarer med køen av svar, ett per forespørsel. */
function supabase(svar: Array<JWK[] | 'feil' | 503>) {
  let teller = 0
  const hent = (async () => {
    const neste = svar[Math.min(teller, svar.length - 1)]
    teller += 1
    if (neste === 'feil') throw new TypeError('fetch failed')
    if (neste === 503) return new Response('nede', { status: 503 })
    return Response.json({ keys: neste })
  }) as typeof fetch
  return { hent, antall: () => teller }
}

const gyldig = async (nokler: ReturnType<typeof veggnokler>, token: string) => {
  try {
    await jwtVerify(token, nokler)
    return true
  } catch {
    return false
  }
}

const utenVenting = { vent: async () => undefined }

describe('veggnokler', () => {
  it('slipper inn et token signert med en av nøklene, og henter settet én gang', async () => {
    const a = await nokkelpar('a')
    const s = supabase([[a.offentlig]])
    const nokler = veggnokler(ADRESSE, { hent: s.hent, ...utenVenting })
    expect(await gyldig(nokler, a.token)).toBe(true)
    expect(await gyldig(nokler, a.token)).toBe(true)
    expect(s.antall()).toBe(1)
  })

  it('avviser et token signert med en annen nøkkel', async () => {
    const a = await nokkelpar('a')
    const falsk = await nokkelpar('a')
    const nokler = veggnokler(ADRESSE, { hent: supabase([[a.offentlig]]).hent, ...utenVenting })
    expect(await gyldig(nokler, falsk.token)).toBe(false)
  })

  it('prøver flere ganger når instansen ikke har nøkler ennå', async () => {
    const a = await nokkelpar('a')
    const s = supabase(['feil', 503, [a.offentlig]])
    const nokler = veggnokler(ADRESSE, { hent: s.hent, ...utenVenting })
    expect(await gyldig(nokler, a.token)).toBe(true)
    expect(s.antall()).toBe(FORSOK_UTEN_NOKLER)
  })

  it('stenger når nøklene ikke lar seg hente i det hele tatt', async () => {
    const a = await nokkelpar('a')
    const s = supabase(['feil'])
    const nokler = veggnokler(ADRESSE, { hent: s.hent, ...utenVenting })
    expect(await gyldig(nokler, a.token)).toBe(false)
    expect(s.antall()).toBe(FORSOK_UTEN_NOKLER)
  })

  it('bruker nøklene den har når Supabase ikke svarer på fornyelsen, men ikke for lenge', async () => {
    const a = await nokkelpar('a')
    let tid = 0
    const s = supabase([[a.offentlig], 'feil'])
    const nokler = veggnokler(ADRESSE, { hent: s.hent, naa: () => tid, ...utenVenting })
    expect(await gyldig(nokler, a.token)).toBe(true)

    tid = FERSKE_I + 1
    expect(await gyldig(nokler, a.token)).toBe(true)
    // Fornyelsen med nøkler i hånden er ett forsøk, så forespørselen ikke venter lenge.
    expect(s.antall()).toBe(2)

    tid = BRUKBARE_I + 1
    expect(await gyldig(nokler, a.token)).toBe(false)
  })

  it('henter settet på nytt når Supabase har byttet nøkler', async () => {
    const a = await nokkelpar('a')
    const b = await nokkelpar('b')
    let tid = 0
    const s = supabase([[a.offentlig], [a.offentlig, b.offentlig]])
    const nokler = veggnokler(ADRESSE, { hent: s.hent, naa: () => tid, ...utenVenting })
    expect(await gyldig(nokler, a.token)).toBe(true)

    // Rett etter en henting spørres det ikke på nytt for hvert ukjent nøkkelnavn.
    expect(await gyldig(nokler, b.token)).toBe(false)
    expect(s.antall()).toBe(1)

    tid = NY_NOKKEL_ETTER + 1
    expect(await gyldig(nokler, b.token)).toBe(true)
    expect(s.antall()).toBe(2)
  })

  it('lar forespørsler som kommer samtidig, dele én henting', async () => {
    const a = await nokkelpar('a')
    const s = supabase([[a.offentlig]])
    const nokler = veggnokler(ADRESSE, { hent: s.hent, ...utenVenting })
    const svar = await Promise.all([gyldig(nokler, a.token), gyldig(nokler, a.token), gyldig(nokler, a.token)])
    expect(svar).toEqual([true, true, true])
    expect(s.antall()).toBe(1)
  })
})
