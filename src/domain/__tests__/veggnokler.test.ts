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
import { BRUKBARE_I, FERSKE_I, FORSOK_UTEN_NOKLER, KALD_PAUSE, NY_HENTING_ETTER, veggnokler } from '../../auth/veggnokler'

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

  it('stenger når nøklene ikke lar seg hente, og prøver ikke igjen før pausen er over', async () => {
    const a = await nokkelpar('a')
    let tid = 0
    const s = supabase(['feil', 'feil', 'feil', [a.offentlig]])
    const nokler = veggnokler(ADRESSE, { hent: s.hent, naa: () => tid, ...utenVenting })
    expect(await gyldig(nokler, a.token)).toBe(false)
    expect(s.antall()).toBe(FORSOK_UTEN_NOKLER)

    // Rett etterpå avvises det uten å spørre Supabase.
    tid = KALD_PAUSE - 1
    expect(await gyldig(nokler, a.token)).toBe(false)
    expect(s.antall()).toBe(FORSOK_UTEN_NOKLER)

    tid = KALD_PAUSE
    expect(await gyldig(nokler, a.token)).toBe(true)
  })

  it('bruker nøklene den har når Supabase ikke svarer på fornyelsen, men aldri lenger enn før', async () => {
    const a = await nokkelpar('a')
    let tid = 0
    const s = supabase([[a.offentlig], 'feil'])
    const nokler = veggnokler(ADRESSE, { hent: s.hent, naa: () => tid, ...utenVenting })
    expect(await gyldig(nokler, a.token)).toBe(true)

    tid = FERSKE_I + 1
    expect(await gyldig(nokler, a.token)).toBe(true)
    // Fornyelsen med nøkler i hånden er ett forsøk, så forespørselen ikke venter lenge.
    expect(s.antall()).toBe(2)

    // Den mislykte fornyelsen prøves ikke igjen ved hver forespørsel.
    tid = FERSKE_I + NY_HENTING_ETTER
    expect(await gyldig(nokler, a.token)).toBe(true)
    expect(s.antall()).toBe(2)

    // Grensen er den samme som jose sin `cacheMaxAge` (10 min), som gjaldt før.
    expect(BRUKBARE_I).toBe(10 * 60_000)
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

    // Rett etter en henting spørres det ikke på nytt for et ukjent nøkkelnavn.
    expect(await gyldig(nokler, b.token)).toBe(false)
    expect(s.antall()).toBe(1)

    tid = NY_HENTING_ETTER
    expect(await gyldig(nokler, b.token)).toBe(true)
    expect(s.antall()).toBe(2)
  })

  it('spør høyst én gang per pause for ukjente nøkkelnavn mens Supabase ikke svarer', async () => {
    const a = await nokkelpar('a')
    const ukjent = await nokkelpar('ukjent')
    let tid = 0
    const s = supabase([[a.offentlig], 'feil'])
    const nokler = veggnokler(ADRESSE, { hent: s.hent, naa: () => tid, ...utenVenting })
    expect(await gyldig(nokler, a.token)).toBe(true)

    tid = NY_HENTING_ETTER
    for (let i = 0; i < 20; i++) expect(await gyldig(nokler, ukjent.token)).toBe(false)
    // Ett forsøk for alle tjue, og kjente nøkler slipper fortsatt inn.
    expect(s.antall()).toBe(2)
    expect(await gyldig(nokler, a.token)).toBe(true)
    expect(s.antall()).toBe(2)

    tid = 2 * NY_HENTING_ETTER
    for (let i = 0; i < 20; i++) expect(await gyldig(nokler, ukjent.token)).toBe(false)
    expect(s.antall()).toBe(3)
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
