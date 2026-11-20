/**
 * Etterkontrollen av ytelsesplanen (P5, #505, `docs/ytelse-synlig-innlasting.md`
 * §8): at det som ble raskere, fortsatt er riktig når nettet og maskinen er
 * trege og ting skjer mens appen laster. I det lokale testmiljøet
 * (docs/qa-testmiljo.md), med de syntetiske dataene fra ytelsesmålingen
 * (`ytelsesdata.ts`), etter at `ytelse.ts` har laget dem:
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/ytelseskontroll.ts
 *
 * Punktene (profilen `treg` der ikke annet står):
 * - K1 utlogging mens en fagside og kildene laster: innloggingssiden, og
 *   ingenting av fagsiden, heller ikke når de sene svarene kommer.
 * - K2 medlemskapet avsluttes mens appen laster: appen stenger forståelig.
 * - K3 FEST svarer 3 s for sent: referansene beholder numrene hele veien, og
 *   siden sier at den henter til svaret står.
 * - K4 FEST feiler: referansene beholder numrene, og siden sier fra.
 * - K5 direkte lenke til en seksjon: seksjonen står åpen og i synsfeltet.
 * - K6 gammel kode etter en oppdatering: en side hvis kode ikke lar seg hente,
 *   laster appen på nytt og vises, i stedet for en tom side.
 * - K7 fagsøket med tastaturet rett etter innlogging: Ctrl + K, navnet, Enter.
 * - K8 mobil: forsiden og en fagside uten vannrett rulling.
 * - K9 navnene på forsiden med mange personer: hvor mange profiler som hentes.
 */
import { randomBytes } from 'node:crypto'
import { AVSLUTTET_MEDLEMSKAP } from '@delt/profil'
import { innen, klient, krev, lagKontroll, rpc, vent, type Side } from './kontroll'
import { lokalSql, sikreAdministrator, sikreTestkonto, startLokalDatabase } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'
import { KOBLEDE_SIDER, stoffnavn } from './ytelsesdata'
import { renummereringer } from './ytelsesmal'
import { apneMaleside, les, loggInn, lukk, ventPaMerke, type Profil } from './ytelsesside'

const { punkt, bilde, paa, oppsettFeilet, rapport, logg } = lagKontroll('ytelseskontroll')
const MEDLEM = 'qa-p5-medlem'
const PC = { viewport: { width: 1440, height: 900 } }
const MOBIL = { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }
const FEST = '**/rest/v1/rpc/les_legemidler*'
const SEN = 3000

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const pw = randomBytes(18).toString('base64url')
const medlemId = await sikreTestkonto(s, MEDLEM, pw, ['Pia', 'Etterkontroll'])
const miljo = await apneTestmiljo()

/** Fagsidene som er koblet til FEST (de første i `ytelsesdata.ts`). */
const koblede = lokalSql(
  s,
  `select slug from public.infosider where tilstand = 'publisert' and slug like 'syntetisk-stoff-%' order by slug limit ${KOBLEDE_SIDER}`,
).split('\n')
krev(koblede.length === KOBLEDE_SIDER && koblede[0], 'fagsidene fra ytelsesmålingen finnes (kjør ytelse.ts først)')
const side0 = koblede[0]!

/** En side med måleren og profilen, innlogget som `bruker`, til toppmenyen står. */
async function innlogget(bruker: string, passord: string, profil: Profil = 'treg', vindu = PC): Promise<Side> {
  const side = paa(await apneMaleside(miljo, profil, { vindu }))
  await loggInn(side, miljo.url, bruker, passord)
  await ventPaMerke(side, 'skall')
  return side
}

/** FEST-svaret holdes tilbake `ms`, eller feiler med `status`. */
const holdFest = (side: Side, valg: { ms?: number; status?: number }) =>
  side.route(FEST, async (r: Side) => {
    if (valg.ms) await vent(valg.ms)
    if (valg.status) return r.fulfill({ status: valg.status, contentType: 'application/json', body: JSON.stringify({ code: 'XX000', message: 'Syntetisk feil i etterkontrollen.' }) })
    return r.fallback()
  })

const finnes = (side: Side, velger: string) => side.locator(velger).count().then((n: number) => n > 0)

try {
  const admin = await klient(s, 'qa-admin', adminpassord)
  const standard = lokalSql(s, `select id from public.fagmiljoer where standard`)
  // Medlemmet står med et aktivt medlemskap i standardfagmiljøet før hvert løp.
  const giMedlemskap = () => rpc(admin, 'gi_medlemskap', { bruker: medlemId, fagmiljo: standard }).catch(() => undefined)
  await giMedlemskap()

  await punkt('K1 utlogging mens fagsiden og kildene laster: innloggingssiden, og ingenting av fagsiden etterpå', async () => {
    const side = await innlogget(MEDLEM, pw)
    try {
      await holdFest(side, { ms: SEN })
      await side.evaluate((slug: string) => (location.hash = `#/stoff/${slug}`), side0)
      await ventPaMerke(side, 'fagside_navn')
      await side.getByRole('button', { name: /^Kontoen din/ }).click()
      await side.getByRole('button', { name: /Logg ut/ }).click()
      await side.waitForSelector('input[name=username]', { timeout: 15_000 })
      await vent(SEN + 1000)
      krev(!(await finnes(side, '.stoffside')), 'fagsiden står ikke igjen etter de sene svarene')
      krev(!(await finnes(side, '.toppmeny')), 'toppmenyen står ikke igjen')
      await bilde(side, 'k1-utlogget')
      return 'innloggingssiden, ingen fagside etter de sene svarene'
    } finally {
      await lukk(side)
    }
  })

  await punkt('K2 medlemskapet avsluttes mens appen laster: appen stenger med beskjeden', async () => {
    await giMedlemskap()
    const side = await innlogget(MEDLEM, pw)
    try {
      await holdFest(side, { ms: SEN })
      await side.evaluate((slug: string) => (location.hash = `#/stoff/${slug}`), side0)
      await rpc(admin, 'avslutt_medlemskap', { bruker: medlemId, fagmiljo: standard })
      // Neste forespørsel svarer med avslaget; et fanebytte spør med en gang.
      await side.evaluate(() => {
        document.dispatchEvent(new Event('visibilitychange'))
        window.dispatchEvent(new Event('focus'))
      })
      await side.evaluate(() => (location.hash = '#/grupper'))
      const ms = await innen(20_000, 'beskjeden om avsluttet medlemskap', () => side.getByText(AVSLUTTET_MEDLEMSKAP).isVisible())
      await vent(SEN)
      krev(!(await finnes(side, '.stoffside')) && !(await finnes(side, '.forside')), 'ingen fagside eller forside bak beskjeden')
      await bilde(side, 'k2-avsluttet')
      return `beskjeden etter ${Math.round(ms)} ms`
    } finally {
      await lukk(side)
      await giMedlemskap()
    }
  })

  /** Åpner en koblet fagside med FEST holdt tilbake eller feilet, til alt er hentet; gir referanseforløpet. */
  async function fagsideMedFest(valg: { ms?: number; status?: number }, nr: number) {
    const side = await innlogget(MEDLEM, pw)
    try {
      await holdFest(side, valg)
      await side.evaluate((slug: string) => (location.hash = `#/stoff/${slug}`), koblede[nr]!)
      await ventPaMerke(side, 'fagside_innhold')
      const henterForSvaret = valg.ms ? await side.locator('.stoffside').getByText(/Henter [^.]*…/).first().isVisible() : null
      await ventPaMerke(side, 'fagside_komplett', { ms: 30_000 })
      await vent(500)
      const m = await les(side)
      return { side, m, henterForSvaret }
    } catch (e) {
      await lukk(side)
      throw e
    }
  }

  await punkt('K3 FEST svarer 3 s for sent: referansene beholder numrene, og siden sier at den henter', async () => {
    const { side, m, henterForSvaret } = await fagsideMedFest({ ms: SEN }, 1)
    try {
      const omnummerert = renummereringer(m.referanser)
      krev(omnummerert === 0, `${omnummerert} referanser fikk et annet nummer underveis`)
      krev(henterForSvaret, '«Henter …» står mens FEST-svaret venter')
      krev(m.merker.fagside_komplett! >= SEN, `komplett først når FEST har svart (${Math.round(m.merker.fagside_komplett!)} ms)`)
      await bilde(side, 'k3-sen-fest')
      return `${m.referanser.length} visninger av listen, 0 nye numre, komplett etter ${Math.round(m.merker.fagside_komplett!)} ms`
    } finally {
      await lukk(side)
    }
  })

  await punkt('K4 FEST feiler: referansene beholder numrene, og siden sier fra', async () => {
    const { side, m } = await fagsideMedFest({ status: 400 }, 2)
    try {
      const omnummerert = renummereringer(m.referanser)
      krev(omnummerert === 0, `${omnummerert} referanser fikk et annet nummer underveis`)
      const melding = side.locator('.stoffside').getByText(/ikke hent|Prøv igjen/i).first()
      krev(await melding.isVisible(), 'en melding om at kilden ikke ble hentet')
      await bilde(side, 'k4-fest-feiler')
      return `meldingen: «${(await melding.innerText()).trim().slice(0, 80)}»`
    } finally {
      await lukk(side)
    }
  })

  await punkt('K5 direkte lenke til en seksjon: seksjonen står åpen og i synsfeltet', async () => {
    const forst = await innlogget(MEDLEM, pw, 'rask')
    let seksjon: string
    try {
      await forst.evaluate((slug: string) => (location.hash = `#/stoff/${slug}`), side0)
      await ventPaMerke(forst, 'fagside_komplett')
      const ider: string[] = await forst.locator('.stoffside section.skuff--seksjon[id^="panel-"]').evaluateAll((e: Element[]) => e.map((x) => x.id))
      krev(ider.length > 1, 'fagsiden har flere seksjoner')
      seksjon = ider.at(-1)!.slice('panel-'.length)
    } finally {
      await lukk(forst)
    }
    const side = paa(await apneMaleside(miljo, 'treg', { vindu: PC }))
    try {
      await loggInn(side, `${miljo.url}/#/stoff/${side0}/${seksjon}`, MEDLEM, pw)
      const el = side.locator(`#panel-${seksjon}`)
      await el.waitFor({ timeout: 30_000 })
      await innen(15_000, 'seksjonen åpen og i synsfeltet', async () =>
        el.evaluate((e: Element) => {
          const r = e.getBoundingClientRect()
          return e.hasAttribute('data-apen') && r.top < innerHeight && r.bottom > 0
        }),
      )
      await bilde(side, 'k5-seksjon')
      return `#/stoff/${side0}/${seksjon}`
    } finally {
      await lukk(side)
    }
  })

  await punkt('K6 gammel kode etter en oppdatering: siden lastes på nytt og vises, ikke en tom side', async () => {
    const side = await innlogget(MEDLEM, pw)
    try {
      let forsok = 0
      await side.route('**/assets/klinisk-Grupperside-*.js', (r: Side) => (forsok++ === 0 ? r.fulfill({ status: 404, body: '' }) : r.fallback()))
      await side.evaluate(() => (location.hash = '#/grupper'))
      await side.getByRole('heading', { name: 'Grupper', exact: true }).waitFor({ timeout: 45_000 })
      krev(forsok >= 2, 'koden til gruppesiden ble avvist første gang og hentet på nytt')
      await bilde(side, 'k6-etter-ny-lasting')
      return `koden avvist første gang, gruppesiden vises etter ${forsok} forsøk`
    } finally {
      await lukk(side)
    }
  })

  await punkt('K7 fagsøket med tastaturet rett etter innlogging: Ctrl + K, navnet og Enter åpner fagsiden', async () => {
    const side = await innlogget(MEDLEM, pw)
    try {
      const navn = stoffnavn(koblede[3]!)
      await side.keyboard.press('Control+k')
      await side.keyboard.type(navn, { delay: 20 })
      await side.locator('.fagsok__treff [role="option"]').filter({ hasText: navn }).first().waitFor({ timeout: 30_000 })
      await side.keyboard.press('ArrowDown')
      await side.keyboard.press('Enter')
      await side.locator('.stoffside .identitet__navn').filter({ hasText: navn }).waitFor({ timeout: 30_000 })
      krev((await side.evaluate(() => location.hash)) === `#/stoff/${koblede[3]}`, 'adressen er fagsidens')
      return navn
    } finally {
      await lukk(side)
    }
  })

  await punkt('K8 mobil: forsiden og en fagside uten vannrett rulling', async () => {
    const side = await innlogget(MEDLEM, pw, 'treg', MOBIL)
    try {
      const bredde = () => side.evaluate(() => ({ innhold: document.documentElement.scrollWidth, vindu: innerWidth }))
      await ventPaMerke(side, 'forside_paneler')
      const forside = await bredde()
      await bilde(side, 'k8-forside-mobil')
      await side.evaluate((slug: string) => (location.hash = `#/stoff/${slug}`), side0)
      await ventPaMerke(side, 'fagside_komplett')
      const fagside = await bredde()
      await bilde(side, 'k8-fagside-mobil')
      krev(forside.innhold <= forside.vindu && fagside.innhold <= fagside.vindu, `vannrett rulling (forsiden ${forside.innhold}/${forside.vindu}, fagsiden ${fagside.innhold}/${fagside.vindu})`)
      return `${forside.vindu} px bredt, ingen vannrett rulling`
    } finally {
      await lukk(side)
    }
  })

  await punkt('K9 navnene på forsiden: hvor mange profiler systemarkitekten henter', async () => {
    const side = await innlogget('qa-admin', adminpassord, 'rask')
    try {
      const svar = side.waitForResponse((r: Side) => new URL(r.url()).pathname === '/rest/v1/profiles', { timeout: 30_000 })
      await ventPaMerke(side, 'forside_paneler')
      const r = await svar
      const rader = ((await r.json()) as unknown[]).length
      const synlige = Number(lokalSql(s, `select count(*) from public.profiles`))
      const tid = Math.round(r.request().timing().responseEnd)
      logg(`    ${rader} av ${synlige} profiler, ${tid} ms`)
      return `${rader} av ${synlige} profiler hentet (${tid} ms)${rader < synlige ? '; resten får navnet «Noen»' : ''}`
    } finally {
      await lukk(side)
    }
  })
} catch (e) {
  oppsettFeilet(e)
} finally {
  await miljo.avslutt()
}
rapport()
