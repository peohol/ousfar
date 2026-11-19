/**
 * Web Push uten avhengigheter (`supabase/functions/_edge/webpush.ts`):
 * krypteringen mot eksempelet i RFC 8291 (vedlegg A), dekrypteringen slik en
 * nettleser gjør den, og VAPID-signaturen.
 */
import { describe, expect, it } from 'vitest'
import { fraBase64url, krypter, pushforesporsel, sendPush, tilBase64url, vapidhode, vapidnokkel, type Bytes } from '../../supabase/functions/_edge/webpush'
import { dekrypter, nyttAbonnement, nyeVapidnokler } from './hjelp/webpush'

const RFC = {
  tekst: 'When I grow up, I want to be a watermelon',
  asOffentlig: 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8',
  asPrivat: 'yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw',
  uaOffentlig: 'BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4',
  salt: 'DGv6ra1nlYgDCS1FRnbzlw',
  auth: 'BTBZMqHH6r4Tts7J_aSIgg',
  kropp:
    'DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN',
}

describe('krypteringen (RFC 8291)', () => {
  it('gir nøyaktig kroppen i eksempelet i RFC 8291', async () => {
    const kropp = await krypter({ p256dh: RFC.uaOffentlig, auth: RFC.auth }, new TextEncoder().encode(RFC.tekst), {
      offentlig: fraBase64url(RFC.asOffentlig),
      privat: fraBase64url(RFC.asPrivat),
      salt: fraBase64url(RFC.salt),
    })
    expect(tilBase64url(kropp)).toBe(RFC.kropp)
  })

  it('kan leses av nettleseren abonnementet hører til, og ikke av en annen', async () => {
    const mottaker = await nyttAbonnement()
    const annen = await nyttAbonnement()
    const kropp = await krypter(mottaker.abonnement, new TextEncoder().encode('{"tittel":"Hei"}'))
    expect(await dekrypter(kropp, mottaker)).toBe('{"tittel":"Hei"}')
    await expect(dekrypter(kropp, annen)).rejects.toThrow()
  })

  it('bruker en ny engangsnøkkel og et nytt salt for hvert varsel', async () => {
    const { abonnement } = await nyttAbonnement()
    const a = await krypter(abonnement, new Uint8Array([1]))
    const b = await krypter(abonnement, new Uint8Array([1]))
    expect(tilBase64url(a.slice(0, 16))).not.toBe(tilBase64url(b.slice(0, 16)))
    expect(tilBase64url(a.slice(21, 86))).not.toBe(tilBase64url(b.slice(21, 86)))
  })

  it('avviser et abonnement med feil hemmelighet og et for stort varsel', async () => {
    const { abonnement } = await nyttAbonnement()
    await expect(krypter({ ...abonnement, auth: 'AAAA' }, new Uint8Array([1]))).rejects.toThrow()
    await expect(krypter(abonnement, new Uint8Array(4000))).rejects.toThrow('Varselet er for stort.')
  })
})

describe('VAPID (RFC 8292)', () => {
  it('signerer en JWT for push-tjenesten bak endepunktet, som den offentlige nøkkelen bekrefter', async () => {
    const nokler = await nyeVapidnokler()
    const na = Date.UTC(2026, 10, 19, 8)
    const hode = await vapidhode('https://fcm.googleapis.com/fcm/send/abc', nokler, await vapidnokkel(nokler), 'https://ousfar.example', na)
    const [, t, k] = /^vapid t=([^,]+), k=(.+)$/.exec(hode)!
    expect(k).toBe(nokler.offentlig)
    const [h, p, s] = t!.split('.')
    expect(JSON.parse(new TextDecoder().decode(fraBase64url(h!)))).toEqual({ typ: 'JWT', alg: 'ES256' })
    expect(JSON.parse(new TextDecoder().decode(fraBase64url(p!)))).toEqual({
      aud: 'https://fcm.googleapis.com',
      exp: na / 1000 + 12 * 3600,
      sub: 'https://ousfar.example',
    })
    const offentlig = await crypto.subtle.importKey('raw', fraBase64url(nokler.offentlig), { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify'])
    const gyldig = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      offentlig,
      fraBase64url(s!),
      new TextEncoder().encode(`${h}.${p}`),
    )
    expect(gyldig).toBe(true)
  })

  it('avviser en privat nøkkel med feil lengde', async () => {
    const nokler = await nyeVapidnokler()
    await expect(vapidnokkel({ ...nokler, privat: 'AAAA' })).rejects.toThrow()
  })
})

describe('sendingen', () => {
  it('poster det krypterte varselet med hodene push-tjenesten krever', async () => {
    const nokler = await nyeVapidnokler()
    const mottaker = await nyttAbonnement()
    const { url, init } = await pushforesporsel(mottaker.abonnement, { tittel: 'Hei' }, nokler, await vapidnokkel(nokler), {
      levetid: 86400,
      emne: 'abc',
      kontakt: 'https://ousfar.example',
      haster: true,
    })
    expect(url).toBe(mottaker.abonnement.endepunkt)
    expect(init.method).toBe('POST')
    expect(init.headers).toMatchObject({ 'Content-Encoding': 'aes128gcm', TTL: '86400', Urgency: 'high', Topic: 'abc' })
    expect(JSON.parse(await dekrypter(init.body as Bytes, mottaker))).toEqual({ tittel: 'Hei' })
  })

  it.each([
    [201, 'sendt'],
    [404, 'borte'],
    [410, 'borte'],
    [403, 'feil'],
    [500, 'feil'],
  ] as const)('svar %i gir %s', async (status, utfall) => {
    const nokler = await nyeVapidnokler()
    const { abonnement } = await nyttAbonnement()
    const hent = (async () => new Response(null, { status })) as typeof fetch
    expect(await sendPush(abonnement, {}, nokler, await vapidnokkel(nokler), { levetid: 60, kontakt: 'mailto:x@example.org' }, hent)).toBe(utfall)
  })

  it('gir feil, ikke unntak, når push-tjenesten ikke svarer', async () => {
    const nokler = await nyeVapidnokler()
    const { abonnement } = await nyttAbonnement()
    const hent = (async () => {
      throw new TypeError('fetch failed')
    }) as typeof fetch
    expect(await sendPush(abonnement, {}, nokler, await vapidnokkel(nokler), { levetid: 60, kontakt: 'mailto:x@example.org' }, hent)).toBe('feil')
  })
})
