/**
 * Varslene på enheten om nye chatmeldinger (docs/chatvarsler.md): abonnementene,
 * køen, hvem som får varsel, og utsendingen fra Edge-funksjonen ende til ende
 * mot testdatabasen, med en falsk push-tjeneste.
 *
 * Grunnoppsettet: «A-gruppen» har `adminA` som ansvarlig, `vanligA` og
 * `dobbeltAB` som medlemmer og en ubesvart invitasjon til `redaktorRessursA`.
 * Direktesamtalen `K` er mellom `vanligA` og `vanligB`, begge med
 * `Tillat direktemeldinger` på. Chatten og direktemeldingene slås på her.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { chatvarselemne, chatvarselinnhold, erPushtjeneste } from '@delt/chatvarsel'
import { sendChatvarsler, vapidFraMiljo, VAPID_MILJO, type Varseldatabase } from '../../supabase/functions/_edge/chatvarsler'
import type { Bytes, Pushabonnement } from '../../supabase/functions/_edge/webpush'
import { byggPersongalleri, fjernAlleMedlemskap, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'
import { dekrypter, nyeVapidnokler, nyttAbonnement, type Testabonnement } from './hjelp/webpush'

let basis: PGlite
let db: PGlite
let galleri: Persongalleri
let agruppe: string
let K: string

const id = (p: Person) => galleri.id[p]
const SLA_PA = ['gruppechat_aktivert', 'direktemeldinger_aktivert'].map(
  (f) => `create or replace function intern.${f}() returns boolean language sql stable set search_path = '' as 'select true'`,
)

const verdi = async <T,>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db): Promise<T> =>
  som(i, id(person), async (tx) => Object.values((await tx.query<Record<string, T>>(sql, parametre)).rows[0] ?? {})[0] as T)

/** Som Edge-funksjonen: med den hemmelige nøkkelen. */
const somTjeneste = <T,>(arbeid: (tx: Transaction) => Promise<T>, i: PGlite = db) =>
  i.transaction(async (tx) => {
    await tx.query(`select set_config('role', 'service_role', true)`)
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: 'service_role' })])
    return arbeid(tx)
  })

let teller = 0
const nyKlientId = () => `00000000-0000-4000-9000-${String(++teller).padStart(12, '0')}`

const sendGruppe = (p: Person, tekst = 'Hei', gruppe = agruppe) =>
  verdi(p, 'select public.send_gruppemelding($1, $2, $3)', [gruppe, nyKlientId(), tekst])
const sendDirekte = (p: Person, tekst = 'Hei', samtale = K) =>
  verdi(p, 'select public.send_direktemelding($1, $2, $3)', [samtale, nyKlientId(), tekst])
const lagre = (p: Person, a: Pushabonnement, i: PGlite = db) =>
  verdi(p, 'select public.lagre_pushabonnement($1, $2, $3)', [a.endepunkt, a.p256dh, a.auth], i)
const slett = (p: Person, endepunkt: string) => verdi(p, 'select public.slett_pushabonnement($1)', [endepunkt])
const hent = async (avsender: Person) =>
  (await somTjeneste((tx) => tx.query<{ v: Record<string, unknown>[] }>('select public.chatvarsel_hent($1) as v', [id(avsender)]))).rows[0]!.v
const ko = async () => (await db.query<{ slag: string; avsender: string }>('select slag, avsender from intern.chatvarselko')).rows
const abonnementer = async () =>
  (await db.query<{ endepunkt: string; bruker_id: string }>('select endepunkt, bruker_id from public.pushabonnementer order by endepunkt')).rows

/** Databaseklienten Edge-funksjonen bruker, her mot testdatabasen som tjenesten. */
const tjenesteklient = (i: PGlite = db): Varseldatabase => ({
  rpc: async (navn, argumenter) => {
    const navnene = Object.keys(argumenter)
    const sql = `select public.${navn}(${navnene.map((n, k) => `${n} => $${k + 1}`).join(', ')}) as v`
    try {
      const svar = await somTjeneste((tx) => tx.query<{ v: unknown }>(sql, Object.values(argumenter)), i)
      return { data: svar.rows[0]!.v, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },
})

let enheter: Record<'vanligA' | 'vanligB' | 'dobbeltAB' | 'redaktorRessursA' | 'adminA', Testabonnement>

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
  for (const sql of SLA_PA) await basis.exec(sql)
  const medlem = async (p: Person) => {
    await verdi('adminA', 'select public.inviter_til_gruppe($1, $2)', [agruppe, `test.${p.toLowerCase()}`], basis)
    await verdi(p, 'select public.svar_paa_gruppeinvitasjon($1, true)', [agruppe], basis)
  }
  agruppe = await verdi<string>('adminA', 'select public.opprett_gruppe($1, $2, $3)', ['A-gruppen', 'Syntetisk', galleri.fagmiljo.A], basis)
  await medlem('vanligA')
  await medlem('dobbeltAB')
  await verdi('adminA', 'select public.inviter_til_gruppe($1, $2)', [agruppe, 'test.redaktorressursa'], basis)
  for (const p of ['vanligA', 'vanligB'] as const) await verdi(p, 'select public.sett_chatvalg(true, null)', [], basis)
  K = await verdi<string>('vanligA', 'select public.aapne_direktesamtale($1)', [galleri.id.vanligB], basis)
  enheter = {
    vanligA: await nyttAbonnement(),
    vanligB: await nyttAbonnement(),
    dobbeltAB: await nyttAbonnement(),
    redaktorRessursA: await nyttAbonnement(),
    adminA: await nyttAbonnement(),
  }
}, 180_000)

afterAll(async () => {
  await basis.close()
})

beforeEach(async () => {
  db = (await basis.clone()) as PGlite
})

describe('abonnementene', () => {
  it('lagres for den innloggede, og et endepunkt som står på en annen, røres ikke', async () => {
    const a = enheter.vanligA.abonnement
    await lagre('vanligA', a)
    expect(await abonnementer()).toEqual([{ endepunkt: a.endepunkt, bruker_id: id('vanligA') }])
    await lagre('vanligB', { ...a, auth: enheter.vanligB.abonnement.auth })
    expect(await abonnementer()).toEqual([{ endepunkt: a.endepunkt, bruker_id: id('vanligA') }])
    const [rad] = (await db.query<{ auth: string }>('select auth from public.pushabonnementer')).rows
    expect(rad!.auth).toBe(a.auth)
  })

  it('skriver ingenting når abonnementet er uendret', async () => {
    const a = enheter.vanligA.abonnement
    await lagre('vanligA', a)
    await db.exec(`update public.pushabonnementer set endret_kl = '2026-01-01'`)
    await lagre('vanligA', a)
    const [rad] = (await db.query<{ endret_kl: Date }>('select endret_kl from public.pushabonnementer')).rows
    expect(rad!.endret_kl.toISOString()).toBe('2026-01-01T00:00:00.000Z')
  })

  it('slettes bare av den det står på', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    await slett('vanligB', enheter.vanligA.abonnement.endepunkt)
    expect(await abonnementer()).toHaveLength(1)
    await slett('vanligA', enheter.vanligA.abonnement.endepunkt)
    expect(await abonnementer()).toEqual([])
  })

  it('får nye nøkler når nettleseren har byttet dem', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    await lagre('vanligA', { ...enheter.vanligA.abonnement, auth: enheter.vanligB.abonnement.auth })
    const [rad] = (await db.query<{ auth: string }>('select auth from public.pushabonnementer')).rows
    expect(rad!.auth).toBe(enheter.vanligB.abonnement.auth)
  })

  it('holder høyst ti enheter per bruker; den eldste faller ut', async () => {
    for (let n = 1; n <= 11; n++) {
      await lagre('vanligA', { ...enheter.vanligA.abonnement, endepunkt: `https://fcm.googleapis.com/fcm/send/enhet-${String(n).padStart(2, '0')}` })
      await db.exec(`update public.pushabonnementer set endret_kl = now() - interval '1 hour' * (20 - ${n}) where endepunkt like '%enhet-${String(n).padStart(2, '0')}'`)
    }
    const igjen = (await abonnementer()).map((r) => r.endepunkt.slice(-2))
    expect(igjen).toEqual(['02', '03', '04', '05', '06', '07', '08', '09', '10', '11'])
  })

  it('avviser endepunkter som ikke er HTTPS og nøkler som ikke har riktig form', async () => {
    const a = enheter.vanligA.abonnement
    expect((await feilFra(() => lagre('vanligA', { ...a, endepunkt: 'http://fcm.googleapis.com/x' })))?.code).toBe('23514')
    expect((await feilFra(() => lagre('vanligA', { ...a, p256dh: 'kort' })))?.code).toBe('23514')
    expect((await feilFra(() => lagre('vanligA', { ...a, auth: 'ikke base64url!' })))?.code).toBe('23514')
  })

  it('krever aktivt medlemskap, og er stengt for alle som ikke er innlogget', async () => {
    await fjernAlleMedlemskap(db, id('vanligA'))
    expect((await feilFra(() => lagre('vanligA', enheter.vanligA.abonnement)))?.code).toBe('42501')
    const anon = await feilFra(() =>
      som(db, null, (tx) => tx.query('select public.lagre_pushabonnement($1, $2, $3)', ['https://fcm.googleapis.com/x', 'a', 'b'])),
    )
    expect(anon?.code).toBe('42501')
  })

  it('kan ikke leses av nettleseren, og bare tjenesten henter varsler og sletter døde abonnementer', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    for (const sql of [
      'select * from public.pushabonnementer',
      'select * from intern.chatvarselko',
      `select public.chatvarsel_hent('${id('vanligA')}')`,
      `select public.chatvarsel_fjern_abonnementer(array['x'])`,
    ]) {
      expect((await feilFra(() => som(db, id('vanligA'), (tx) => tx.query(sql))))?.code, sql).toBe('42501')
    }
  })

  it('slettes med kontoen', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    await db.query('delete from public.profiles where id = $1', [id('vanligA')])
    expect(await abonnementer()).toEqual([])
  })
})

describe('køen', () => {
  it('får ingenting når ingen mottaker har varsler på', async () => {
    await lagre('adminA', enheter.adminA.abonnement)
    await sendGruppe('adminA')
    await sendDirekte('vanligA')
    expect(await ko()).toEqual([])
  })

  it('får meldingen når en mottaker har varsler på, ikke avsenderens egne enheter', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    await sendGruppe('vanligA')
    expect(await ko()).toEqual([])
    await sendGruppe('adminA')
    expect(await ko()).toEqual([{ slag: 'gruppe', avsender: id('adminA') }])
  })

  it('regner ikke med en som bare er invitert', async () => {
    await lagre('redaktorRessursA', enheter.redaktorRessursA.abonnement)
    await sendGruppe('adminA')
    expect(await ko()).toEqual([])
  })

  it('regner ikke med en som har dempet direktesamtalen', async () => {
    await lagre('vanligB', enheter.vanligB.abonnement)
    await verdi('vanligB', 'select public.demp_direktesamtale($1, true)', [K])
    await sendDirekte('vanligA')
    expect(await ko()).toEqual([])
    await verdi('vanligB', 'select public.demp_direktesamtale($1, false)', [K])
    await sendDirekte('vanligA')
    expect(await ko()).toEqual([{ slag: 'direkte', avsender: id('vanligA') }])
  })
})

describe('varslene som hentes', () => {
  it('gir hver mottaker ett varsel per samtale med antallet uleste, og tømmer avsenderens kø', async () => {
    for (const p of ['vanligA', 'dobbeltAB', 'adminA'] as const) await lagre(p, enheter[p].abonnement)
    await sendGruppe('adminA', 'Første')
    await sendGruppe('adminA', 'Andre')
    const varsler = await hent('adminA')
    expect(varsler).toEqual(
      [enheter.vanligA, enheter.dobbeltAB]
        .map((e) => ({
          endepunkt: e.abonnement.endepunkt,
          p256dh: e.abonnement.p256dh,
          auth: e.abonnement.auth,
          slag: 'gruppe',
          samtale: agruppe,
          gruppenavn: 'A-gruppen',
          uleste: 2,
        }))
        .sort((a, b) => a.endepunkt.localeCompare(b.endepunkt)),
    )
    expect(await hent('adminA')).toEqual([])
    expect(await ko()).toEqual([])
  })

  it('har aldri meldingsteksten eller avsenderen', async () => {
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendDirekte('vanligA', 'Hemmelig innhold')
    const varsler = await hent('vanligA')
    expect(varsler).toHaveLength(1)
    expect(varsler[0]).toMatchObject({ slag: 'direkte', samtale: K, gruppenavn: null, uleste: 1 })
    const tekst = JSON.stringify(varsler)
    expect(tekst).not.toContain('Hemmelig')
    expect(tekst).not.toContain(id('vanligA'))
    expect(tekst).not.toMatch(/vanlig/i)
  })

  it('hopper over en mottaker som alt har lest meldingen', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    const melding = await verdi<{ nr: number }>('adminA', 'select public.send_gruppemelding($1, $2, $3)', [agruppe, nyKlientId(), 'Hei'])
    await verdi('vanligA', 'select public.merk_gruppechat_lest($1, $2)', [agruppe, melding.nr])
    expect(await hent('adminA')).toEqual([])
  })

  it('hopper over en mottaker som har slått av direktemeldinger eller mistet tilgangen etter sendingen', async () => {
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendDirekte('vanligA')
    await verdi('vanligB', 'select public.sett_chatvalg(false, null)')
    expect(await hent('vanligA')).toEqual([])

    await lagre('vanligA', enheter.vanligA.abonnement)
    await sendGruppe('adminA')
    await fjernAlleMedlemskap(db, id('vanligA'))
    expect(await hent('adminA')).toEqual([])
  })

  it('gir ingenting når meldingen er slettet før varselet ble sendt', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    const melding = await verdi<{ id: string }>('adminA', 'select public.send_gruppemelding($1, $2, $3)', [agruppe, nyKlientId(), 'Hei'])
    await verdi('adminA', 'select public.slett_gruppemelding($1)', [melding.id])
    expect(await hent('adminA')).toEqual([])
  })

  it('kaster det som er eldre enn ti minutter, også for andre avsendere', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendGruppe('adminA')
    await sendDirekte('vanligA')
    await db.exec(`update intern.chatvarselko set kl = now() - interval '11 minutes' where slag = 'gruppe'`)
    expect(await hent('vanligA')).toHaveLength(1)
    expect(await ko()).toEqual([])
    expect(await hent('adminA')).toEqual([])
  })

  it('gir ingenting mens chatten er slått av', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    await sendGruppe('adminA')
    await db.exec(SLA_PA[0]!.replace("'select true'", "'select false'"))
    expect(await hent('adminA')).toEqual([])
  })
})

describe('utsendingen fra Edge-funksjonen', () => {
  it('krypterer ett varsel per enhet til push-tjenesten, uten tekst og avsender, og sletter abonnementer som er borte', async () => {
    const nokler = await nyeVapidnokler()
    await lagre('vanligA', enheter.vanligA.abonnement)
    await lagre('dobbeltAB', enheter.dobbeltAB.abonnement)
    await sendGruppe('adminA', 'Dette skal ikke ut')

    const mottatt: { url: string; hoder: Record<string, string>; kropp: Bytes }[] = []
    const falskPush = (async (url: string, init: RequestInit) => {
      mottatt.push({ url, hoder: init.headers as Record<string, string>, kropp: init.body as Bytes })
      return new Response(null, { status: url === enheter.dobbeltAB.abonnement.endepunkt ? 410 : 201 })
    }) as unknown as typeof fetch

    const utfall = await sendChatvarsler({ db: tjenesteklient(), avsender: id('adminA'), nokler, kontakt: 'https://ousfar.example', hent: falskPush })
    expect(utfall).toEqual({ sendt: 1, borte: 1, feil: 0 })
    expect(mottatt).toHaveLength(2)

    const tilA = mottatt.find((m) => m.url === enheter.vanligA.abonnement.endepunkt)!
    expect(tilA.hoder.Topic).toBe(chatvarselemne(agruppe))
    expect(tilA.hoder.Authorization).toMatch(new RegExp(`^vapid t=.+, k=${nokler.offentlig}$`))
    const innhold = JSON.parse(await dekrypter(tilA.kropp, enheter.vanligA))
    expect(innhold).toEqual({
      tittel: 'A-gruppen',
      tekst: 'Ny melding i gruppechatten',
      sti: `#/chat/gruppe/${agruppe}`,
      merke: `chat:gruppe:${agruppe}`,
    })
    expect(await abonnementer()).toEqual([{ endepunkt: enheter.vanligA.abonnement.endepunkt, bruker_id: id('vanligA') }])
  })

  it('sender ikke til et endepunkt utenfor push-tjenestene', async () => {
    const nokler = await nyeVapidnokler()
    await lagre('vanligB', { ...enheter.vanligB.abonnement, endepunkt: 'https://internt.example/samle' })
    await sendDirekte('vanligA')
    const kalt: string[] = []
    const falskPush = (async (url: string) => {
      kalt.push(url)
      return new Response(null, { status: 201 })
    }) as unknown as typeof fetch
    expect(await sendChatvarsler({ db: tjenesteklient(), avsender: id('vanligA'), nokler, kontakt: 'mailto:x@example.org', hent: falskPush })).toEqual({
      sendt: 0,
      borte: 0,
      feil: 0,
    })
    expect(kalt).toEqual([])
  })

  it('leser nøklene fra miljøet, og ingenting når de mangler', () => {
    expect(vapidFraMiljo(() => undefined)).toBeNull()
    expect(vapidFraMiljo((n) => ({ [VAPID_MILJO.offentlig]: ' off ', [VAPID_MILJO.privat]: 'priv' })[n])).toEqual({ offentlig: 'off', privat: 'priv' })
  })
})

describe('innholdet i varselet', () => {
  const samtale = '0f8e3c1a-1111-4222-8333-944445555666'

  it.each([
    [{ slag: 'gruppe', gruppenavn: 'Rusgruppen', uleste: 1 }, 'Rusgruppen', 'Ny melding i gruppechatten'],
    [{ slag: 'gruppe', gruppenavn: 'Rusgruppen', uleste: 4 }, 'Rusgruppen', '4 uleste meldinger i gruppechatten'],
    [{ slag: 'gruppe', gruppenavn: '  ', uleste: 1 }, 'Gruppechat', 'Ny melding i gruppechatten'],
    [{ slag: 'direkte', gruppenavn: null, uleste: 1 }, 'Direktemelding', 'Du har fått en ny direktemelding'],
    [{ slag: 'direkte', gruppenavn: null, uleste: 3 }, 'Direktemelding', '3 uleste direktemeldinger'],
  ] as const)('%o gir «%s: %s»', (grunnlag, tittel, tekst) => {
    const innhold = chatvarselinnhold({ ...grunnlag, samtale })
    expect(innhold).toEqual({ tittel, tekst, sti: `#/chat/${grunnlag.slag}/${samtale}`, merke: `chat:${grunnlag.slag}:${samtale}` })
  })

  it('har et emne push-tjenesten godtar', () => {
    expect(chatvarselemne(samtale)).toMatch(/^[A-Za-z0-9_-]{1,32}$/)
  })

  it.each([
    ['https://fcm.googleapis.com/fcm/send/abc', true],
    ['https://updates.push.services.mozilla.com/wpush/v2/abc', true],
    ['https://web.push.apple.com/abc', true],
    ['https://wns2-par02p.notify.windows.com/w/?token=abc', true],
    ['http://fcm.googleapis.com/fcm/send/abc', false],
    ['https://fcm.googleapis.com:8443/fcm/send/abc', false],
    ['https://user@fcm.googleapis.com/fcm/send/abc', false],
    ['https://fcm.googleapis.com.example.org/abc', false],
    ['https://evilfcm.googleapis.com.evil/abc', false],
    ['https://notpush.apple.com/abc', false],
    ['ikke en adresse', false],
  ])('%s er en push-tjeneste: %s', (endepunkt, svar) => {
    expect(erPushtjeneste(endepunkt)).toBe(svar)
  })
})
