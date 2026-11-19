/**
 * Varslene på enheten (`src/chatvarsler/enhet.ts`) med en falsk nettleser:
 * tilstandene, å slå på og av, kontobytte og utlogging, og at
 * tjenestearbeideren og appen er enige om meldingen og adressene.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { chatadresse } from '@delt/chatvarsel'
import { APNE_MELDING, EIERNOKKEL, lagChatvarsler, TJENESTEARBEIDER, type Lagretabonnement, type Varselserver } from '../chatvarsler/enhet'

const NOKKEL = 'BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8'
const nokkelbytes = (b64: string) => {
  const vanlig = b64.replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(vanlig + '='.repeat((4 - (vanlig.length % 4)) % 4)), (c) => c.charCodeAt(0)).buffer
}

function falskAbonnement(endepunkt: string, nokkel = NOKKEL) {
  const a = {
    endpoint: endepunkt,
    options: { applicationServerKey: nokkelbytes(nokkel) },
    getKey: (navn: string) => new Uint8Array(navn === 'auth' ? 16 : 65).fill(7).buffer,
    unsubscribe: vi.fn(async () => {
      abonnert.delete(a)
      return true
    }),
  }
  return a
}
const abonnert = new Set<ReturnType<typeof falskAbonnement>>()

function oppsett({
  tillatelse = 'default' as NotificationPermission,
  svar = 'granted' as NotificationPermission,
  stotte = true,
  ua = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/140.0',
  eier = null as string | null,
  abonnement = null as ReturnType<typeof falskAbonnement> | null,
} = {}) {
  abonnert.clear()
  if (abonnement) abonnert.add(abonnement)
  let registrert = abonnement !== null
  const lager = new Map<string, string>(eier ? [[EIERNOKKEL, eier]] : [])
  const lagret: Lagretabonnement[] = []
  const slettet: string[] = []
  const server: Varselserver = {
    nokkel: vi.fn(async () => NOKKEL),
    lagre: vi.fn(async (a) => void lagret.push(a)),
    slett: vi.fn(async (e) => void slettet.push(e)),
  }
  const pushManager = {
    getSubscription: async () => [...abonnert][0] ?? null,
    subscribe: vi.fn(async () => {
      const a = falskAbonnement('https://fcm.googleapis.com/fcm/send/ny')
      abonnert.add(a)
      return a
    }),
  }
  const Notification = {
    permission: tillatelse,
    requestPermission: vi.fn(async () => (Notification.permission = svar)),
  }
  const register = vi.fn(async () => {
    registrert = true
    return { pushManager }
  })
  const navigator = {
    userAgent: ua,
    platform: ua.includes('iPhone') ? 'iPhone' : 'Linux x86_64',
    maxTouchPoints: 0,
    ...(stotte && {
      serviceWorker: { register, ready: Promise.resolve(), getRegistration: async () => (registrert ? { pushManager } : undefined) },
    }),
  } as unknown as Navigator
  const varsler = lagChatvarsler({
    navigator,
    vindu: {
      isSecureContext: true,
      matchMedia: () => ({ matches: false }) as MediaQueryList,
      ...(stotte && { PushManager: {}, Notification: Notification as unknown as typeof globalThis.Notification }),
    },
    lager: { getItem: (k) => lager.get(k) ?? null, setItem: (k, v) => void lager.set(k, v), removeItem: (k) => void lager.delete(k) },
    server,
    grunnadresse: 'https://ousfar.example/',
  })
  return { varsler, server, lagret, slettet, lager, register, Notification, pushManager }
}

describe('tilstanden', () => {
  it('er «ustottet» uten push i nettleseren, og «hjemskjerm» i Safari på iPhone utenfor Hjem-skjermen', async () => {
    expect(await oppsett({ stotte: false }).varsler.tilstand()).toBe('ustottet')
    expect(await oppsett({ stotte: false, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0) Safari/604.1' }).varsler.tilstand()).toBe('hjemskjerm')
  })

  it('er «blokkert» når brukeren har sagt nei i nettleseren, og «av» før noe er valgt', async () => {
    expect(await oppsett({ tillatelse: 'denied' }).varsler.tilstand()).toBe('blokkert')
    expect(await oppsett().varsler.tilstand()).toBe('av')
    expect(await oppsett({ tillatelse: 'granted' }).varsler.tilstand()).toBe('av')
  })
})

describe('å slå på og av', () => {
  it('ber om tillatelse, registrerer tjenestearbeideren, abonnerer med nøkkelen fra serveren og lagrer abonnementet', async () => {
    const o = oppsett()
    expect(await o.varsler.slaPa('bruker-1')).toBe('pa')
    expect(o.Notification.requestPermission).toHaveBeenCalledOnce()
    expect(o.register).toHaveBeenCalledWith(`https://ousfar.example/${TJENESTEARBEIDER}`, { scope: 'https://ousfar.example/' })
    expect(o.pushManager.subscribe).toHaveBeenCalledWith({ userVisibleOnly: true, applicationServerKey: expect.any(Uint8Array) })
    expect(o.lagret).toEqual([{ endepunkt: 'https://fcm.googleapis.com/fcm/send/ny', p256dh: expect.stringMatching(/^[A-Za-z0-9_-]{87}$/), auth: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/) }])
    expect(o.lager.get(EIERNOKKEL)).toBe('bruker-1')
  })

  it('abonnerer ikke når brukeren sier nei', async () => {
    const o = oppsett({ svar: 'denied' })
    expect(await o.varsler.slaPa('bruker-1')).toBe('blokkert')
    expect(o.pushManager.subscribe).not.toHaveBeenCalled()
    expect(o.lagret).toEqual([])
  })

  it('avslutter abonnementet igjen når serveren ikke lagrer det, så bryteren ikke står på', async () => {
    const o = oppsett()
    vi.mocked(o.server.lagre).mockRejectedValueOnce(new Error('nettverk'))
    await expect(o.varsler.slaPa('bruker-1')).rejects.toThrow('nettverk')
    expect(await o.varsler.tilstand()).toBe('av')
    expect(o.lager.has(EIERNOKKEL)).toBe(false)
  })

  it('lager et nytt abonnement når serveren har byttet nøkkel', async () => {
    const gammelt = falskAbonnement('https://fcm.googleapis.com/fcm/send/gammelt', 'AAAA')
    const o = oppsett({ tillatelse: 'granted', abonnement: gammelt })
    await o.varsler.slaPa('bruker-1')
    expect(gammelt.unsubscribe).toHaveBeenCalled()
    expect(o.lagret.map((a) => a.endepunkt)).toEqual(['https://fcm.googleapis.com/fcm/send/ny'])
  })

  it('slår av: sletter på serveren, avslutter på enheten og glemmer eieren', async () => {
    const a = falskAbonnement('https://fcm.googleapis.com/fcm/send/a')
    const o = oppsett({ tillatelse: 'granted', abonnement: a, eier: 'bruker-1' })
    expect(await o.varsler.slaAv()).toBe('av')
    expect(o.slettet).toEqual([a.endpoint])
    expect(a.unsubscribe).toHaveBeenCalled()
    expect(o.lager.has(EIERNOKKEL)).toBe(false)
  })

  it('avslutter på enheten og glemmer eieren også når serveren ikke svarer', async () => {
    const a = falskAbonnement('https://fcm.googleapis.com/fcm/send/a')
    const o = oppsett({ tillatelse: 'granted', abonnement: a, eier: 'bruker-1' })
    vi.mocked(o.server.slett).mockRejectedValueOnce(new Error('nettverk'))
    await expect(o.varsler.vedUtlogging()).rejects.toThrow('nettverk')
    expect(a.unsubscribe).toHaveBeenCalled()
    expect(o.lager.has(EIERNOKKEL)).toBe(false)
    expect(await o.varsler.tilstand()).toBe('av')
  })

  it('logger ut på samme måte', async () => {
    const a = falskAbonnement('https://fcm.googleapis.com/fcm/send/a')
    const o = oppsett({ tillatelse: 'granted', abonnement: a, eier: 'bruker-1' })
    await o.varsler.vedUtlogging()
    expect(o.slettet).toEqual([a.endpoint])
    expect(await o.varsler.tilstand()).toBe('av')
  })
})

describe('ved innlogging', () => {
  it('lagrer abonnementet på nytt for den det hører til', async () => {
    const a = falskAbonnement('https://fcm.googleapis.com/fcm/send/a')
    const o = oppsett({ tillatelse: 'granted', abonnement: a, eier: 'bruker-1' })
    await o.varsler.synk('bruker-1')
    expect(o.lagret.map((x) => x.endepunkt)).toEqual([a.endpoint])
    expect(a.unsubscribe).not.toHaveBeenCalled()
  })

  it('avslutter et abonnement som hører til en annen konto, uten å lagre det for den nye', async () => {
    for (const eier of ['bruker-1', null]) {
      const a = falskAbonnement('https://fcm.googleapis.com/fcm/send/a')
      const o = oppsett({ tillatelse: 'granted', abonnement: a, eier })
      await o.varsler.synk('bruker-2')
      expect(a.unsubscribe).toHaveBeenCalled()
      expect(o.lagret).toEqual([])
      expect(o.slettet).toEqual([])
    }
  })

  it('gjør ingenting uten abonnement', async () => {
    const o = oppsett({ tillatelse: 'granted' })
    await o.varsler.synk('bruker-1')
    expect(o.server.lagre).not.toHaveBeenCalled()
  })
})

describe('tjenestearbeideren', () => {
  const kilde = readFileSync(resolve(__dirname, '../../public/chatvarsler.js'), 'utf8')
  const chatsti = new RegExp(/const CHATSTI = \/(.+)\/i/.exec(kilde)![1]!, 'i')

  it('sender meldingen appen lytter etter', () => {
    expect(kilde).toContain(`const MELDING = '${APNE_MELDING}'`)
  })

  it('åpner adressene varslene har, og ingen andre', () => {
    const id = '0f8e3c1a-1111-4222-8333-944445555666'
    for (const type of ['gruppe', 'direkte'] as const) expect(chatsti.test(chatadresse({ type, id }))).toBe(true)
    expect(chatsti.test(chatadresse())).toBe(true)
    for (const fremmed of ['#/grupper', 'https://evil.example/#/chat', '#/chat/gruppe/x', `#/chat/gruppe/${id}/mer`]) {
      expect(chatsti.test(fremmed), fremmed).toBe(false)
    }
  })

  it('mellomlagrer ingenting og svarer ikke på forespørsler', () => {
    expect(kilde).not.toMatch(/addEventListener\('fetch'|caches\./)
  })
})
