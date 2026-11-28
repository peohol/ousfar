/**
 * Nettleserkontrollen av inngangen til personalkalenderen (#606,
 * `docs/personal.md` §8.3 og §8.8) i det lokale testmiljøet
 * (docs/qa-testmiljo.md), med bare syntetiske kontoer og et syntetisk
 * Sandkasse:
 *
 * - en vanlig bruker (`qa-personal-vanlig`), også som medlem av Sandkasse,
 *   og systemarkitekten `qa-admin` i et fagmiljø uten funksjonen: ingen
 *   Personal i menyen, `#/kalender` er «Siden finnes ikke», og koden til
 *   personalsiden hentes ikke;
 * - `qa-admin` etter bytte til Sandkasse (testmiljø, funksjonen på
 *   `utprøving`): Kalender under Personal, siden med fagmiljøet og fanene,
 *   koden hentes først nå, og en direkte adresse til en fane;
 * - bytte tilbake fra kalenderen: siden blir «Siden finnes ikke», og menyen
 *   mister Personal.
 *
 * Det lokale Sandkasse lages her, som i `src/__tests__/personal/database.ts`:
 * testmiljø, migrasjonen `personal_utproving` (syntetiske medarbeidere og
 * bryteren på `utprøving`), og `qa-admin` som medlem og lokal administrator.
 * Til slutt arbeider `qa-admin` i standardfagmiljøet igjen, så de andre
 * kontrollene ser den som før.
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/personalnettleser.ts
 */
import { randomBytes } from 'node:crypto'
import { mkdirSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { startportSql } from '../../faginnhold/migrasjonshistorikk'
import { lokalSql, sikreAdministrator, sikreTestkonto, startLokalDatabase, type Status } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Side = any
const logg = (t: string) => console.log(`[personal] ${t}`)
const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

const utfall: { punkt: string; ok: boolean; merknad: string }[] = []
const mappe = process.env.QA_SKJERMBILDER
if (mappe) mkdirSync(mappe, { recursive: true })
async function bilde(side: Side, navn: string) {
  await vent(300)
  if (mappe) await side.screenshot({ path: join(mappe, `${navn}.png`) }).catch(() => undefined)
}
async function punkt(kode: string, arbeid: () => Promise<string | void>) {
  logg(kode)
  try {
    const m = (await arbeid()) ?? ''
    utfall.push({ punkt: kode, ok: true, merknad: m })
    logg(`  ok ${m}`)
  } catch (e) {
    const m = e instanceof Error ? e.message.split('\n')[0]! : String(e)
    utfall.push({ punkt: kode, ok: false, merknad: m })
    logg(`  FEIL ${m}`)
  }
}
function krev(b: unknown, hva: string): asserts b {
  if (!b) throw new Error(hva)
}
async function innen(ms: number, hva: string, sjekk: () => Promise<boolean>) {
  const start = Date.now()
  while (Date.now() - start < ms) {
    if (await sjekk().catch(() => false)) return Date.now() - start
    await vent(100)
  }
  throw new Error(`Ikke innen ${ms / 1000} s: ${hva}`)
}

const SANDKASSE = 'Sandkasse'
const STANDARD = 'OUS Klinisk farmakologi'
const GRUNN = 'QA: personalkalenderen i det lokale testmiljøet (syntetisk)'

/** Det syntetiske Sandkasse, med `qa-admin` som medlem og lokal administrator. */
function sikreSandkasse(s: Status, admin: string) {
  const finnes = lokalSql(s, `select id from public.fagmiljoer where nokkel = 'sandkasse'`)
  const id =
    finnes ||
    lokalSql(
      s,
      `begin; select set_config('ousfar.tilgangsgrunn', '${GRUNN}', true); ${startportSql('sandkasse')}
       with f as (insert into public.fagmiljoer (nokkel, navn, apent_for_medlemmer) values ('sandkasse', '${SANDKASSE}', true) returning id),
            m as (insert into public.medlemskap (bruker_id, fagmiljo_id) select '${admin}', id from f),
            a as (insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) select '${admin}', id from f)
       select id from f; commit;`,
    ).split('\n').find((l) => /^[0-9a-f-]{36}$/.test(l))!
  krev(id, 'Sandkasse ble ikke laget')
  lokalSql(
    s,
    `begin; select set_config('ousfar.tilgangsgrunn', '${GRUNN}', true);
     update public.fagmiljoer set testmiljo = true where id = '${id}' and not testmiljo;
     insert into public.medlemskap (bruker_id, fagmiljo_id) select '${admin}', '${id}'
       where not exists (select 1 from public.medlemskap where bruker_id = '${admin}' and fagmiljo_id = '${id}' and status = 'aktiv');
     insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) select '${admin}', '${id}'
       where not exists (select 1 from public.fagmiljoadministratorer where bruker_id = '${admin}' and fagmiljo_id = '${id}');
     commit;`,
  )
  const fil = readdirSync('supabase/migrations').find((f) => f.endsWith('_personal_utproving.sql'))!
  lokalSql(s, `begin; select set_config('ousfar.tilgangsgrunn', '${GRUNN}', true); ${readFileSync(join('supabase/migrations', fil), 'utf8')}; commit;`)
  return id
}

/** Gir brukeren aktivt medlemskap i fagmiljøet, uten å gjøre det til primærmedlemskap. */
function sikreMedlem(s: Status, bruker: string, fagmiljo: string) {
  lokalSql(
    s,
    `begin; select set_config('ousfar.tilgangsgrunn', '${GRUNN}', true);
     insert into public.medlemskap (bruker_id, fagmiljo_id) select '${bruker}', '${fagmiljo}'
       where not exists (select 1 from public.medlemskap where bruker_id = '${bruker}' and fagmiljo_id = '${fagmiljo}' and status = 'aktiv');
     commit;`,
  )
}

/** Følger med på om koden til personalsiden og kallene til personalfunksjonene hentes. */
function lytt(side: Side) {
  const spor = { kode: [] as string[], kall: [] as string[] }
  side.on('request', (r: { url(): string }) => {
    const url = r.url()
    if (/Personalside[^/]*\.js/.test(url)) spor.kode.push(url)
    const kall = /\/rest\/v1\/rpc\/(personal_[a-z_]+)/.exec(url)
    if (kall) spor.kall.push(kall[1]!)
  })
  return spor
}

const valgene = (side: Side): Promise<string[]> => side.locator('nav.sidemeny .menyniva .menyvalg__navn').allInnerTexts()
const apenMeny = async (side: Side) => (await side.locator('nav.sidemeny').getAttribute('data-apen')) === 'ja'
async function hovedvalgene(side: Side): Promise<string[]> {
  for (let forsok = 0; forsok < 3 && !(await apenMeny(side)); forsok++) {
    await side.keyboard.press('Control+m')
    await innen(1_000, 'menyen åpen', () => apenMeny(side)).catch(() => undefined)
  }
  krev(await apenMeny(side), 'menyen åpnet seg ikke')
  const meny = side.getByRole('navigation', { name: 'Meny', exact: true })
  for (const etikett of ['Til hovedmenyen', /^Tilbake til/]) {
    const knapp = meny.getByRole('button', { name: etikett })
    if (await knapp.count()) await knapp.first().click()
  }
  const valg = await valgene(side)
  await side.keyboard.press('Escape')
  return valg
}

/** Går til adressen i appen, slik en lenke eller adressefeltet gjør. */
async function tilAdressen(side: Side, adresse: string) {
  await side.evaluate((a: string) => (window.location.hash = a), adresse)
}

async function somUkjent(side: Side, adresse: string) {
  await innen(10_000, '«Siden finnes ikke»', async () => (await side.getByRole('heading', { level: 1, name: 'Siden finnes ikke' }).count()) > 0)
  const t: { hash: string; tittel: string; side: string | null } = await side.evaluate(() => ({
    hash: location.hash,
    tittel: document.title,
    side: document.querySelector('.app')?.getAttribute('data-side') ?? null,
  }))
  krev(t.hash === adresse, `adressen ${t.hash}`)
  krev(t.tittel === 'Siden finnes ikke – OUSFAR', `tittelen ${t.tittel}`)
  krev(t.side === 'ukjent', `data-side ${t.side}`)
}

async function byttFagmiljo(side: Side, til: string) {
  await tilAdressen(side, '#/')
  await side.getByRole('button', { name: 'Bytt fagmiljø' }).click()
  await side.getByRole('button', { name: new RegExp(til) }).click()
  await innen(10_000, `arbeider i ${til}`, async () => (await side.locator('.forside__tittel').first().innerText()) === til)
}

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const adminId = lokalSql(s, `select id from public.profiles where username = 'qa-admin'`)
const vanligpassord = randomBytes(18).toString('base64url')
const vanligId = await sikreTestkonto(s, 'qa-personal-vanlig', vanligpassord, ['Vilde', 'Vanlig'])
const sandkasse = sikreSandkasse(s, adminId)
sikreMedlem(s, vanligId, sandkasse)
logg(`Sandkasse ${sandkasse}: ${lokalSql(s, `select count(*) from personal.medarbeidere where fagmiljo_id = '${sandkasse}'`)} syntetiske medarbeidere, bryteren «${lokalSql(s, `select tilstand from public.funksjonsbrytere where funksjon = 'personal' and fagmiljo_id = '${sandkasse}'`)}»`)

const miljo = await apneTestmiljo()
try {
  const vanlig: Side = await miljo.brukerside('qa-personal-vanlig', vanligpassord, { viewport: { width: 1440, height: 900 } })
  const vanligSpor = lytt(vanlig)
  await vanlig.goto(`${miljo.url}/#/`)
  await vanlig.locator('button.menyknapp').waitFor({ timeout: 30_000 })

  await punkt('P1 vanlig bruker: ingen Personal i menyen, #/kalender er en ukjent adresse, ingen personalkode', async () => {
    const valg = await hovedvalgene(vanlig)
    krev(!valg.includes('Personal'), `menyen: ${valg.join(' | ')}`)
    await tilAdressen(vanlig, '#/kalender')
    await somUkjent(vanlig, '#/kalender')
    await vanlig.goto(`${miljo.url}/#/kalender/medarbeidere`)
    await somUkjent(vanlig, '#/kalender/medarbeidere')
    await bilde(vanlig, '01-vanlig-kalender-ukjent')
    krev(vanligSpor.kode.length === 0 && vanligSpor.kall.length === 0, `hentet: ${[...vanligSpor.kode, ...vanligSpor.kall].join(', ')}`)
    return valg.join(' | ')
  })

  await punkt('P2 vanlig bruker i Sandkasse: funksjonen er bare for systemarkitekter under utprøvingen', async () => {
    await byttFagmiljo(vanlig, SANDKASSE)
    const valg = await hovedvalgene(vanlig)
    krev(!valg.includes('Personal'), `menyen: ${valg.join(' | ')}`)
    await tilAdressen(vanlig, '#/kalender')
    await somUkjent(vanlig, '#/kalender')
    krev(vanligSpor.kode.length === 0 && vanligSpor.kall.length === 0, `hentet: ${[...vanligSpor.kode, ...vanligSpor.kall].join(', ')}`)
    await byttFagmiljo(vanlig, STANDARD)
  })
  await vanlig.context().close()

  const admin: Side = await miljo.brukerside('qa-admin', adminpassord, { viewport: { width: 1440, height: 900 } })
  const adminSpor = lytt(admin)
  await admin.goto(`${miljo.url}/#/`)
  await admin.locator('button.menyknapp').waitFor({ timeout: 30_000 })
  // Begynner i standardfagmiljøet, uansett hvor en tidligere kjøring sluttet.
  if ((await admin.locator('.forside__tittel').first().innerText()) !== STANDARD) await byttFagmiljo(admin, STANDARD)

  await punkt('P3 systemarkitekt i et fagmiljø uten funksjonen: det samme som for en vanlig bruker', async () => {
    const valg = await hovedvalgene(admin)
    krev(!valg.includes('Personal'), `menyen: ${valg.join(' | ')}`)
    await admin.goto(`${miljo.url}/#/kalender`)
    await somUkjent(admin, '#/kalender')
    krev(adminSpor.kode.length === 0 && adminSpor.kall.length === 0, `hentet: ${[...adminSpor.kode, ...adminSpor.kall].join(', ')}`)
  })

  await punkt('P4 systemarkitekt i Sandkasse: Kalender under Personal, siden og fanene, koden hentes først nå', async () => {
    await byttFagmiljo(admin, SANDKASSE)
    krev(adminSpor.kode.length === 0, 'personalkoden hentet før siden ble åpnet')
    const valg = await hovedvalgene(admin)
    krev(valg.includes('Personal'), `menyen: ${valg.join(' | ')}`)
    await admin.keyboard.press('Control+m')
    const meny = admin.getByRole('navigation', { name: 'Meny', exact: true })
    await meny.getByRole('button', { name: /^Personal/ }).click()
    await bilde(admin, '02-meny-personal')
    await meny.getByRole('link', { name: 'Kalender' }).click()
    await innen(10_000, 'siden Kalender', async () => (await admin.getByRole('heading', { level: 1, name: 'Kalender' }).count()) > 0)
    const t: { hash: string; tittel: string } = await admin.evaluate(() => ({ hash: location.hash, tittel: document.title }))
    krev(t.hash === '#/kalender' && t.tittel === 'Kalender – OUSFAR', JSON.stringify(t))
    const over = await admin.locator('.personalside .gruppeside__overtittel').textContent()
    krev(over === SANDKASSE, `overtittelen: ${over}`)
    const faner: string[] = await admin.getByRole('navigation', { name: 'Kalender' }).getByRole('link').allInnerTexts()
    krev(faner.join('|') === 'Kalender|Medarbeidere', `fanene: ${faner.join(' | ')}`)
    krev(adminSpor.kode.length > 0, 'personalkoden ble ikke hentet')
    krev(adminSpor.kall.includes('personal_grunnlag'), `kallene: ${adminSpor.kall.join(', ')}`)
    await bilde(admin, '03-kalender')
    return `kode: ${adminSpor.kode.map((u) => u.split('/').pop()).join(', ')}; kall: ${adminSpor.kall.join(', ')}`
  })

  await punkt('P5 direkte adresse til fanen Medarbeidere, også etter ny innlasting', async () => {
    await admin.goto(`${miljo.url}/#/kalender/medarbeidere`)
    await innen(15_000, 'fanen Medarbeidere', async () =>
      (await admin.getByRole('navigation', { name: 'Kalender' }).getByRole('link', { name: 'Medarbeidere' }).getAttribute('aria-current')) === 'page',
    )
    krev(await admin.getByText('Medarbeiderne kommer her.').isVisible(), 'innholdet i fanen')
    await admin.emulateMedia({ colorScheme: 'dark' })
    await bilde(admin, '04-medarbeidere-moerkt')
    await admin.emulateMedia({ colorScheme: 'light' })
  })

  await punkt('P6 bytte tilbake fra kalenderen: siden blir ukjent, og menyen mister Personal', async () => {
    await byttFagmiljo(admin, STANDARD)
    await admin.goto(`${miljo.url}/#/kalender`)
    await somUkjent(admin, '#/kalender')
    const valg = await hovedvalgene(admin)
    krev(!valg.includes('Personal'), `menyen: ${valg.join(' | ')}`)
    await bilde(admin, '05-tilbake-ukjent')
  })
} finally {
  await miljo.avslutt()
  console.log('\nRESULTAT')
  for (const u of utfall) console.log(`${u.ok ? 'OK  ' : 'FEIL'} ${u.punkt} ${u.merknad}`)
  process.exit(utfall.every((u) => u.ok) ? 0 : 1)
}
