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
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { chatvarselemne, chatvarselinnhold, erPushtjeneste } from '@delt/chatvarsel'
import { erUtloser, LEVETID_SEKUNDER, MAKS_RUNDER, sendChatvarsler, vapidFraMiljo, VAPID_MILJO, type Varseldatabase } from '../../supabase/functions/_edge/chatvarsler'
import type { Bytes, Pushabonnement } from '../../supabase/functions/_edge/webpush'
import { byggPersongalleri, fjernAlleMedlemskap, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'
import { dekrypter, nyeVapidnokler, nyttAbonnement, type Testabonnement } from './hjelp/webpush'
import { CHATVARSELKO_KONTROLL_SQL, CHATVARSELKO_RYDD_SQL, vurderLagringstid, type Kontrollsvar, type Ryddesvar } from '../drift/gruppechatLagringstid'

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
/** Som om ventetiden har gått: meldingene i køen er modne, og varsler som venter på et nytt forsøk, kan prøves. */
const tidenGaar = () =>
  db.exec(`update intern.chatvarselko set kl = kl - interval '2 seconds'; update intern.chatvarselutsendinger set neste_kl = now() where neste_kl > now()`)
/** `chatvarsel_hent` som tjenesten, etter ventetiden. */
const hent = async () => {
  await db.exec(`update intern.chatvarselko set kl = kl - interval '2 seconds'`)
  return (await somTjeneste((tx) => tx.query<{ v: Record<string, unknown>[] }>('select public.chatvarsel_hent() as v'))).rows[0]!.v
}
const kvitter = (utfall: unknown[]) => somTjeneste((tx) => tx.query('select public.chatvarsel_kvitter($1)', [JSON.stringify(utfall)]))
const utsendinger = async () =>
  (await db.query<{ endepunkt: string; forsok: number }>('select endepunkt, forsok from intern.chatvarselutsendinger order by endepunkt')).rows
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

// Hver test har sin egen kopi; den lukkes, så minnet ikke vokser med antallet tester.
afterEach(async () => {
  await db.close()
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

  it('kan ikke leses av nettleseren, og bare tjenesten henter varsler og fører svarene', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    for (const sql of [
      'select * from public.pushabonnementer',
      'select * from intern.chatvarselko',
      'select * from intern.chatvarselutsendinger',
      'select public.chatvarsel_hent()',
      `select public.chatvarsel_kvitter('[]')`,
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
  it('gir hver mottaker ett varsel per samtale med antallet uleste, tømmer køen og holder varslene mens de sendes', async () => {
    for (const p of ['vanligA', 'dobbeltAB', 'adminA'] as const) await lagre(p, enheter[p].abonnement)
    await sendGruppe('adminA', 'Første')
    await sendGruppe('adminA', 'Andre')
    const varsler = await hent()
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
          kl: expect.any(String),
        }))
        .sort((a, b) => a.endepunkt.localeCompare(b.endepunkt)),
    )
    expect(await ko()).toEqual([])
    // Holdt mens de sendes: en annen utsending får dem ikke.
    expect(await hent()).toEqual([])
    expect(await utsendinger()).toHaveLength(2)
  })

  it('venter litt på en ny melding, så en mottaker som har samtalen åpen, rekker å lese', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    await sendGruppe('adminA')
    expect((await somTjeneste((tx) => tx.query<{ v: unknown[] }>('select public.chatvarsel_hent() as v'))).rows[0]!.v).toEqual([])
    expect(await ko()).toHaveLength(1)
    expect(await hent()).toHaveLength(1)
  })

  it('har aldri meldingsteksten eller avsenderen', async () => {
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendDirekte('vanligA', 'Hemmelig innhold')
    const varsler = await hent()
    expect(varsler).toHaveLength(1)
    expect(varsler[0]).toMatchObject({ slag: 'direkte', samtale: K, gruppenavn: null, uleste: 1 })
    expect(Object.keys(varsler[0]!).sort()).toEqual(['auth', 'endepunkt', 'gruppenavn', 'kl', 'p256dh', 'samtale', 'slag', 'uleste'])
    const tekst = JSON.stringify(varsler)
    expect(tekst).not.toContain('Hemmelig')
    expect(tekst).not.toContain(id('vanligA'))
    expect(tekst).not.toMatch(/vanlig/i)
  })

  it('hopper over en mottaker som alt har lest meldingen', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    const melding = await verdi<{ nr: number }>('adminA', 'select public.send_gruppemelding($1, $2, $3)', [agruppe, nyKlientId(), 'Hei'])
    await verdi('vanligA', 'select public.merk_gruppechat_lest($1, $2)', [agruppe, melding.nr])
    expect(await hent()).toEqual([])
    expect(await utsendinger()).toEqual([])
  })

  it('hopper over en mottaker som har slått av direktemeldinger eller mistet tilgangen etter sendingen', async () => {
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendDirekte('vanligA')
    await verdi('vanligB', 'select public.sett_chatvalg(false, null)')
    expect(await hent()).toEqual([])

    await lagre('vanligA', enheter.vanligA.abonnement)
    await sendGruppe('adminA')
    await fjernAlleMedlemskap(db, id('vanligA'))
    expect(await hent()).toEqual([])
  })

  it('sender ikke et varsel som venter på et nytt forsøk, til en som har mistet tilgangen eller dempet samtalen', async () => {
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendDirekte('vanligA')
    const [v] = await hent()
    await kvitter([{ ...v, svar: 'feil' }])
    await verdi('vanligB', 'select public.demp_direktesamtale($1, true)', [K])
    await tidenGaar()
    expect(await hent()).toEqual([])
    expect(await utsendinger()).toEqual([])
  })

  // De samme reglene som da varselet ble til (`chatvarselmottakere`), ved hvert nytt forsøk.
  it.each([
    ['blokkerer avsenderen', () => verdi('vanligB', 'select public.blokker_bruker($1)', [id('vanligA')])],
    ['slår av direktemeldinger', () => verdi('vanligB', 'select public.sett_chatvalg(false, null)')],
    ['mister medlemskapet i OUSFAR', () => fjernAlleMedlemskap(db, id('vanligB'))],
  ])('sender ikke en direktemelding som venter på et nytt forsøk, når mottakeren %s', async (_, endring) => {
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendDirekte('vanligA')
    const [v] = await hent()
    await kvitter([{ ...v, svar: 'feil' }])
    expect(await utsendinger()).toEqual([{ endepunkt: enheter.vanligB.abonnement.endepunkt, forsok: 1 }])
    await endring()
    await tidenGaar()
    expect(await hent()).toEqual([])
    expect(await utsendinger()).toEqual([])
  })

  it('gir ingenting når meldingen er slettet før varselet ble sendt', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    const melding = await verdi<{ id: string }>('adminA', 'select public.send_gruppemelding($1, $2, $3)', [agruppe, nyKlientId(), 'Hei'])
    await verdi('adminA', 'select public.slett_gruppemelding($1)', [melding.id])
    expect(await hent()).toEqual([])
  })

  it('kaster det som er eldre enn ti minutter, i køen og blant varslene som venter', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendGruppe('adminA')
    await sendDirekte('vanligA')
    await db.exec(`update intern.chatvarselko set kl = now() - interval '11 minutes' where slag = 'gruppe'`)
    const [v] = await hent()
    expect(v).toMatchObject({ slag: 'direkte' })
    expect(await ko()).toEqual([])
    await kvitter([{ ...v, svar: 'feil' }])
    await db.exec(`update intern.chatvarselutsendinger set kl = now() - interval '11 minutes', neste_kl = now()`)
    expect(await hent()).toEqual([])
    expect(await utsendinger()).toEqual([])
  })

  it('nattjobben tømmer det som er for gammelt, også når ingen sender eller henter mer', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendDirekte('vanligA')
    await hent()
    await sendGruppe('adminA')
    await sendGruppe('adminA')
    expect(await ko()).toHaveLength(2)
    expect(await utsendinger()).toHaveLength(1)
    const for_ = (await db.query<Kontrollsvar>(CHATVARSELKO_KONTROLL_SQL)).rows[0]!
    expect(for_).toMatchObject({ gjenstar: 0, frist: '10 minutter' })
    await db.exec(`update intern.chatvarselko set kl = now() - interval '11 minutes'; update intern.chatvarselutsendinger set kl = now() - interval '11 minutes'`)
    expect((await db.query<Kontrollsvar>(CHATVARSELKO_KONTROLL_SQL)).rows[0]).toMatchObject({ gjenstar: 3 })
    const [rydd] = (await db.query<Ryddesvar>(CHATVARSELKO_RYDD_SQL)).rows
    expect(rydd).toEqual({ slettet: 3 })
    const etter = (await db.query<Kontrollsvar>(CHATVARSELKO_KONTROLL_SQL)).rows[0]!
    expect(etter).toMatchObject({ gjenstar: 0, eldste_dager: null })
    expect(vurderLagringstid(rydd!, etter, 'Køen for chatvarsler', 'meldinger i køen').rapport).toContain('Slettet nå: 3 meldinger i køen eldre enn 10 minutter.')
  })

  it('en ny rad i køen tar med seg det som er for gammelt', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    await sendGruppe('adminA')
    await db.exec(`update intern.chatvarselko set kl = now() - interval '11 minutes'`)
    await sendDirekte('vanligB')
    expect(await ko()).toEqual([{ slag: 'direkte', avsender: expect.any(String) }])
  })

  it('gir ingenting mens chatten er slått av', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    await sendGruppe('adminA')
    await db.exec(SLA_PA[0]!.replace("'select true'", "'select false'"))
    expect(await hent()).toEqual([])
  })
})

describe('utsendingen fra Edge-funksjonen', () => {
  /** En falsk push-tjeneste: svarer med `status(url, n)` på det n-te kallet til adressen, og fører alt den får. */
  const pushtjeneste = (status: (url: string, n: number) => number = () => 201) => {
    const mottatt: { url: string; hoder: Record<string, string>; kropp: Bytes; status: number }[] = []
    const hent = (async (url: string, init: RequestInit) => {
      const n = mottatt.filter((m) => m.url === url).length + 1
      const svar = status(url, n)
      mottatt.push({ url, hoder: init.headers as Record<string, string>, kropp: init.body as Bytes, status: svar })
      return new Response(null, { status: svar })
    }) as unknown as typeof fetch
    return { mottatt, hent }
  }
  /** Ventingen mellom rundene: som om tiden har gått, uten å vente. */
  const vent = async () => void (await tidenGaar())

  it('krypterer ett varsel per enhet til push-tjenesten, uten tekst og avsender, og sletter abonnementer som er borte', async () => {
    const nokler = await nyeVapidnokler()
    await lagre('vanligA', enheter.vanligA.abonnement)
    await lagre('dobbeltAB', enheter.dobbeltAB.abonnement)
    await sendGruppe('adminA', 'Dette skal ikke ut')
    await tidenGaar()

    const push = pushtjeneste((url) => (url === enheter.dobbeltAB.abonnement.endepunkt ? 410 : 201))
    const utfall = await sendChatvarsler({ db: tjenesteklient(), nokler, kontakt: 'https://ousfar.example', hent: push.hent, vent })
    expect(utfall).toEqual({ sendt: 1, borte: 1, feil: 0, hoppet: 0, stoppet: 0 })
    expect(push.mottatt).toHaveLength(2)

    const tilA = push.mottatt.find((m) => m.url === enheter.vanligA.abonnement.endepunkt)!
    expect(tilA.hoder.Topic).toBe(chatvarselemne(agruppe))
    expect(tilA.hoder.TTL).toBe(String(LEVETID_SEKUNDER))
    expect(tilA.hoder.Authorization).toMatch(new RegExp(`^vapid t=.+, k=${nokler.offentlig}$`))
    const innhold = JSON.parse(await dekrypter(tilA.kropp, enheter.vanligA))
    expect(innhold).toEqual({
      tittel: 'A-gruppen',
      tekst: 'Ny melding i gruppechatten',
      sti: `#/chat/gruppe/${agruppe}`,
      merke: `chat:gruppe:${agruppe}`,
    })
    expect(await abonnementer()).toEqual([{ endepunkt: enheter.vanligA.abonnement.endepunkt, bruker_id: id('vanligA') }])
    expect(await utsendinger()).toEqual([])
  })

  it('prøver igjen etter en midlertidig feil, og sender hvert varsel bare én gang', async () => {
    const nokler = await nyeVapidnokler()
    await lagre('vanligA', enheter.vanligA.abonnement)
    await lagre('dobbeltAB', enheter.dobbeltAB.abonnement)
    await sendGruppe('adminA')
    await tidenGaar()
    // vanligA: 503 to ganger, så 201. dobbeltAB: 201 med en gang.
    const push = pushtjeneste((url, n) => (url === enheter.vanligA.abonnement.endepunkt && n <= 2 ? 503 : 201))
    const ventet: number[] = []
    const utfall = await sendChatvarsler({
      db: tjenesteklient(),
      nokler,
      kontakt: 'https://ousfar.example',
      hent: push.hent,
      vent: async (ms) => void (ventet.push(ms), await tidenGaar()),
    })
    expect(utfall).toEqual({ sendt: 2, borte: 0, feil: 2, hoppet: 0, stoppet: 0 })
    expect(ventet).toEqual([1000, 4000])
    expect(push.mottatt.filter((m) => m.status === 201).map((m) => m.url).sort()).toEqual(
      [enheter.vanligA.abonnement.endepunkt, enheter.dobbeltAB.abonnement.endepunkt].sort(),
    )
    expect(push.mottatt.filter((m) => m.url === enheter.dobbeltAB.abonnement.endepunkt)).toHaveLength(1)
    expect(await utsendinger()).toEqual([])
  })

  it('lar et varsel som fortsatt feiler, stå til neste utsending, og gir opp etter fem forsøk', async () => {
    const nokler = await nyeVapidnokler()
    await lagre('vanligA', enheter.vanligA.abonnement)
    await sendGruppe('adminA')
    await tidenGaar()
    const push = pushtjeneste(() => 500)
    const forste = await sendChatvarsler({ db: tjenesteklient(), nokler, kontakt: 'https://ousfar.example', hent: push.hent, vent })
    expect(forste).toEqual({ sendt: 0, borte: 0, feil: MAKS_RUNDER, hoppet: 0, stoppet: 0 })
    expect(await utsendinger()).toEqual([{ endepunkt: enheter.vanligA.abonnement.endepunkt, forsok: MAKS_RUNDER }])
    // Neste utsending (en ny melding et annet sted) tar det femte og siste forsøket.
    await tidenGaar()
    const andre = await sendChatvarsler({ db: tjenesteklient(), nokler, kontakt: 'https://ousfar.example', hent: push.hent, vent })
    expect(andre.feil).toBe(1)
    await tidenGaar()
    expect(await hent()).toEqual([])
    expect(push.mottatt).toHaveLength(5)
  })

  it('sender det nye antallet når en ny melding kommer mens varselet sendes, uten å miste den', async () => {
    await lagre('vanligA', enheter.vanligA.abonnement)
    await sendGruppe('adminA', 'Første')
    const [forste] = await hent()
    expect(forste).toMatchObject({ uleste: 1 })
    await sendGruppe('adminA', 'Andre')
    // Den andre slås sammen med varselet som sendes nå, og venter på det.
    expect(await hent()).toEqual([])
    await kvitter([{ ...forste, svar: 'sendt' }])
    const [andre] = await hent()
    expect(andre).toMatchObject({ endepunkt: enheter.vanligA.abonnement.endepunkt, uleste: 2 })
    await kvitter([{ ...andre, svar: 'sendt' }])
    expect(await utsendinger()).toEqual([])
  })

  it('sletter abonnementet og varslene til det når push-tjenesten sier at det er borte', async () => {
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendDirekte('vanligA')
    const [v] = await hent()
    await kvitter([{ ...v, svar: 'borte' }, { ...v, svar: 'ukjent' }])
    expect(await abonnementer()).toEqual([])
    expect(await utsendinger()).toEqual([])
  })

  it('sender ikke til et endepunkt utenfor push-tjenestene, og prøver det ikke igjen', async () => {
    const nokler = await nyeVapidnokler()
    await lagre('vanligB', { ...enheter.vanligB.abonnement, endepunkt: 'https://internt.example/samle' })
    await sendDirekte('vanligA')
    await tidenGaar()
    const push = pushtjeneste()
    expect(await sendChatvarsler({ db: tjenesteklient(), nokler, kontakt: 'mailto:x@example.org', hent: push.hent, vent })).toEqual({
      sendt: 0,
      borte: 0,
      feil: 0,
      hoppet: 1,
      stoppet: 0,
    })
    expect(push.mottatt).toEqual([])
    expect(await utsendinger()).toEqual([])
  })

  it('leser nøklene fra miljøet, og ingenting når de mangler', () => {
    expect(vapidFraMiljo(() => undefined)).toBeNull()
    expect(vapidFraMiljo((n) => ({ [VAPID_MILJO.offentlig]: ' off ', [VAPID_MILJO.privat]: 'priv' })[n])).toEqual({ offentlig: 'off', privat: 'priv' })
  })

  it('godtar bare den hemmelige nøkkelen databasen sender med', () => {
    expect(erUtloser('hemmelig-nokkel', 'hemmelig-nokkel')).toBe(true)
    for (const gitt of [null, '', 'hemmelig-nokke', 'hemmelig-nokkel!', 'Hemmelig-nokkel']) expect(erUtloser(gitt, 'hemmelig-nokkel'), String(gitt)).toBe(false)
    expect(erUtloser('x', undefined)).toBe(false)
    expect(erUtloser('', '')).toBe(false)
  })
})

describe('databasen ber om utsendingen selv', () => {
  /** pg_net og Vault slik Supabase har dem, så langt utløseren bruker dem; kallene føres i `net.kall`. */
  const medPgNet = async ({ adresse = 'https://ref.supabase.co/functions/v1/chatvarsel-utsending', nokkel = 'hemmelig' as string | null, feiler = false } = {}) => {
    await db.exec(`
      create schema net;
      create table net.kall (url text, body jsonb, headers jsonb, timeout_milliseconds integer);
      create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds integer default 5000)
      returns bigint language plpgsql as $$
      begin
        ${feiler ? "raise exception 'nede';" : ''}
        insert into net.kall values (url, body, headers, timeout_milliseconds);
        return 1;
      end $$;
      create schema vault;
      create table vault.decrypted_secrets (name text, decrypted_secret text);
    `)
    await db.query(`insert into vault.decrypted_secrets values ('chatvarsel_adresse', $1)`, [adresse])
    if (nokkel) await db.query(`insert into vault.decrypted_secrets values ('chatvarsel_utloser', $1)`, [nokkel])
  }
  const kall = async () => (await db.query<{ url: string; headers: Record<string, string> }>('select url, headers from net.kall')).rows

  it('når en ny melding har en mottaker med varsler på, med den hemmelige nøkkelen og uten noe innhold', async () => {
    await medPgNet()
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendDirekte('vanligA', 'Hemmelig innhold')
    const [k, ...flere] = await kall()
    expect(flere).toEqual([])
    expect(k).toEqual({
      url: 'https://ref.supabase.co/functions/v1/chatvarsel-utsending',
      headers: { 'Content-Type': 'application/json', 'x-chatvarsel-utloser': 'hemmelig' },
    })
    expect(JSON.stringify(await db.query('select body from net.kall'))).not.toContain('Hemmelig')
  })

  it('ikke når ingen mottaker har varsler på', async () => {
    await medPgNet()
    await sendDirekte('vanligA')
    await sendGruppe('adminA')
    expect(await kall()).toEqual([])
  })

  it('ikke uten nøkkelen i Vault, og en feil i pg_net stopper aldri meldingen', async () => {
    await medPgNet({ nokkel: null })
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendDirekte('vanligA')
    expect(await kall()).toEqual([])
    expect(await ko()).toHaveLength(1)
    await db.exec(`insert into vault.decrypted_secrets values ('chatvarsel_utloser', 'x');
      create or replace function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds integer default 5000)
      returns bigint language plpgsql as $$ begin raise exception 'nede'; end $$;`)
    await sendDirekte('vanligA', 'Kommer fram likevel')
    expect(await ko()).toHaveLength(2)
  })

  it('uten pg_net (som her i testdatabasen) blir meldingen bare lagt i køen', async () => {
    await lagre('vanligB', enheter.vanligB.abonnement)
    await sendDirekte('vanligA')
    expect(await ko()).toHaveLength(1)
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
