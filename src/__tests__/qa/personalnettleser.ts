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
 *   koden hentes først nå, og en direkte adresse til fanen Medarbeidere med
 *   de syntetiske medarbeiderne, også etter ny innlasting;
 * - «Vis som» (K-SKJ-7): som kollega forsvinner fanen Medarbeidere, også
 *   etter ny innlasting, og «Avslutt» gir den virkelige rollen tilbake;
 * - hele forløpet i Medarbeidere (K-UI-2/3): «Ny» kvittert med tastaturet og
 *   uten vakter, vakter og vaktandel som står etter ny innlasting, konflikten
 *   mellom to faner, en vaktplanansvarlig utpekt og fjernet, og smal skjerm
 *   med redigeringen åpen; alt gjøres om igjen, så kjøringen kan gjentas;
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
import { addDays, todayIn } from '@delt/personal/dates'
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
    const linjer = e instanceof Error ? e.message.split('\n') : [String(e)]
    utfall.push({ punkt: kode, ok: false, merknad: linjer[0]! })
    logg(`  FEIL ${linjer.slice(0, 8).join('\n       ')}`)
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
/** En av de syntetiske medarbeiderne i Sandkasse (`*_personal_utproving.sql`). */
const SYNTETISK = 'Alma Berg'
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

/** Åpner Medarbeidere i Sandkasse, hentet på nytt, og venter på tabellen. */
async function tilMedarbeidere(side: Side) {
  await side.goto(`${miljo.url}/#/kalender/medarbeidere`)
  // Bare adressen etter # endres fra en annen fane i kalenderen; grunnlaget hentes først ved en ny innlasting.
  await side.reload()
  await innen(15_000, 'tabellen i Medarbeidere', () => side.getByRole('table').isVisible())
}
const raden = (side: Side, navn: string) => side.getByRole('row').filter({ has: side.getByRole('rowheader', { name: new RegExp(navn) }) })
/** Vaktene raden viser som valgt, som «Ja» per oppgave. */
const vakterI = async (side: Side, navn: string) => (await raden(side, navn).getByRole('img', { name: 'Ja' }).count()) as number
async function apneRedigering(side: Side, navn: string) {
  await raden(side, navn).getByRole('button').click()
  const dialog = side.getByRole('dialog')
  await innen(5_000, `redigeringen av ${navn}`, () => dialog.isVisible())
  return dialog
}
async function lukkRedigering(side: Side) {
  await side.keyboard.press('Escape')
  await innen(5_000, 'redigeringen lukket', async () => (await side.getByRole('dialog').count()) === 0)
}
/** Trykker Tab til knappen med navnet har fokus, og trykker Enter, som med tastaturet alene. */
async function medTastaturet(side: Side, knapp: string) {
  for (let i = 0; i < 40; i++) {
    const navn: string = await side.evaluate(() => document.activeElement?.textContent?.trim() ?? '')
    if (navn === knapp) return side.keyboard.press('Enter')
    await side.keyboard.press('Tab')
  }
  throw new Error(`fant ikke ${knapp} med Tab`)
}

/**
 * Hele forløpet i Medarbeidere som lokal administrator i Sandkasse (K-UI-2/3):
 * kvittere «Ny» med tastaturet og uten vakter, endre vakter og vaktandel og se
 * dem etter ny innlasting, utpeke og fjerne en vaktplanansvarlig, konflikten
 * mellom to faner, og smal skjerm med redigeringen åpen. Alt gjøres om igjen,
 * så kjøringen kan gjentas.
 */
async function medarbeiderforlopet(admin: Side) {
  await punkt('P7 «Ny» kvitteres med tastaturet, også uten vakter, og står etter ny innlasting', async () => {
    const navn = `Nora Q${randomBytes(3).toString('hex').replace(/\d/g, 'x')}`
    lokalSql(s, `begin; select set_config('ousfar.tilgangsgrunn', '${GRUNN}', true);
      insert into personal.medarbeidere (fagmiljo_id, syntetisk_navn, aktiv_fra) values ('${sandkasse}', '${navn}', current_date); commit;`)
    await tilMedarbeidere(admin)
    const rad = raden(admin, navn)
    await innen(15_000, `${navn} merket «Ny»`, () => rad.getByText('Ny', { exact: true }).isVisible())
    await rad.getByRole('button', { name: `Velg vakter for ${navn}` }).focus()
    await admin.keyboard.press('Enter')
    await innen(5_000, 'redigeringen', () => admin.getByRole('dialog').isVisible())
    const fokus: string = await admin.evaluate(() => (document.activeElement as HTMLInputElement | null)?.type ?? '')
    krev(fokus === 'checkbox', `fokus i redigeringen: ${fokus}`)
    await medTastaturet(admin, 'Lagre')
    await innen(10_000, 'redigeringen lukket', async () => (await admin.getByRole('dialog').count()) === 0)
    await innen(10_000, '«Ny» borte', async () => (await rad.getByText('Ny', { exact: true }).count()) === 0)
    await admin.reload()
    await innen(15_000, `${navn} etter ny innlasting`, () => rad.isVisible())
    krev((await rad.getByText('Ny', { exact: true }).count()) === 0, '«Ny» tilbake etter ny innlasting')
    // Den syntetiske medarbeideren slutter i dag, så den ikke står i fanen ved neste kjøring (loggen beholder den).
    lokalSql(s, `begin; select set_config('ousfar.tilgangsgrunn', '${GRUNN}', true);
      update personal.medarbeidere set aktiv_til = current_date where fagmiljo_id = '${sandkasse}' and syntetisk_navn = '${navn}'; commit;`)
    return navn
  })

  await punkt('P8 vakter og vaktandel lagres og står etter ny innlasting; tidligere og fremtidige vises', async () => {
    await tilMedarbeidere(admin)
    const for_ = await vakterI(admin, SYNTETISK)
    let dialog = await apneRedigering(admin, SYNTETISK)
    const forste = dialog.getByRole('checkbox').first()
    const var_ = await forste.isChecked()
    await forste.setChecked(!var_)
    await dialog.getByRole('button', { name: 'Lagre' }).click()
    await innen(10_000, 'redigeringen lukket', async () => (await admin.getByRole('dialog').count()) === 0)
    const etter = for_ + (var_ ? -1 : 1)
    await innen(10_000, 'vaktene i tabellen', async () => (await vakterI(admin, SYNTETISK)) === etter)
    await admin.reload()
    await innen(15_000, 'vaktene etter ny innlasting', async () => (await vakterI(admin, SYNTETISK)) === etter)

    const prosent = String(51 + (randomBytes(1)[0]! % 39))
    const fra = addDays(todayIn('Europe/Oslo'), 30)
    dialog = await apneRedigering(admin, SYNTETISK)
    const skjema = dialog.getByRole('form', { name: 'Ordinær vaktandel' })
    await skjema.getByLabel('Ordinær fra').fill(fra)
    await skjema.getByLabel('Prosent').fill(prosent)
    await skjema.getByRole('button', { name: 'Sett' }).click()
    const liste = dialog.getByRole('list', { name: 'Ordinær vaktandel' })
    const ny = liste.getByRole('listitem').filter({ hasText: `${prosent} %` }).filter({ has: admin.getByRole('button', { name: /Fjern/ }) })
    await innen(10_000, 'den nye vaktandelen i lista', () => ny.isVisible())
    await bilde(admin, '06-redigering')
    await lukkRedigering(admin)
    await admin.reload()
    await innen(15_000, 'tabellen etter ny innlasting', () => admin.getByRole('table').isVisible())
    dialog = await apneRedigering(admin, SYNTETISK)
    await innen(10_000, 'vaktandelen etter ny innlasting', () => ny.isVisible())
    const tider: string[] = await liste.getByRole('listitem').allInnerTexts()
    krev(tider.some((t) => /Gjelder nå|Tidligere/.test(t)) || tider.length === 1, `lista: ${tider.join(' / ')}`)
    // Tilbake som før: vaktandelen fjernes og vaktene settes som de var.
    await ny.getByRole('button', { name: /Fjern/ }).click()
    await innen(10_000, 'vaktandelen fjernet', async () => (await ny.count()) === 0)
    await dialog.getByRole('checkbox').first().setChecked(var_)
    await dialog.getByRole('button', { name: 'Lagre' }).click()
    await innen(10_000, 'vaktene som før', async () => (await vakterI(admin, SYNTETISK)) === for_)
    return `vaktandel ${prosent} % fra ${fra}`
  })

  await punkt('P9 to faner: den som lagrer på gamle vakter, får konflikt og ser de nye', async () => {
    await tilMedarbeidere(admin)
    const annen: Side = await admin.context().newPage()
    try {
      await tilMedarbeidere(annen)
      const d1 = await apneRedigering(admin, SYNTETISK)
      const d2 = await apneRedigering(annen, SYNTETISK)
      const v1 = await d1.getByRole('checkbox').first().isChecked()
      await d1.getByRole('checkbox').first().setChecked(!v1)
      await d1.getByRole('button', { name: 'Lagre' }).click()
      await innen(10_000, 'lagret i den første fanen', async () => (await admin.getByRole('dialog').count()) === 0)
      const v2 = await d2.getByRole('checkbox').last().isChecked()
      await d2.getByRole('checkbox').last().setChecked(!v2)
      await d2.getByRole('button', { name: 'Lagre' }).click()
      await innen(10_000, 'konflikten', () => d2.getByRole('alert').isVisible())
      await innen(10_000, 'meldingen om at vaktene er endret', () => d2.getByRole('status').filter({ hasText: 'endret av noen andre' }).isVisible())
      krev((await d2.getByRole('checkbox').first().isChecked()) === !v1, 'de nye vaktene vises ikke')
      await bilde(annen, '07-konflikt')
      // Tilbake som før.
      await lukkRedigering(annen)
      const d = await apneRedigering(admin, SYNTETISK)
      await d.getByRole('checkbox').first().setChecked(v1)
      await d.getByRole('button', { name: 'Lagre' }).click()
      await innen(10_000, 'tilbake som før', async () => (await admin.getByRole('dialog').count()) === 0)
    } finally {
      await annen.close()
    }
  })

  await punkt('P10 vaktplanansvarlig utpekes og fjernes, og står etter ny innlasting', async () => {
    await tilMedarbeidere(admin)
    const boks = () => admin.getByRole('checkbox', { name: 'Vilde Vanlig' })
    await innen(15_000, 'medlemmene å velge blant', () => boks().isVisible())
    const var_ = await boks().isChecked()
    // Avkryssingen følger serveren: den står først når valget er lagret.
    const velg = async (valgt: boolean) => {
      await boks().click()
      await innen(10_000, 'valget lagret', async () => (await boks().isChecked()) === valgt && (await boks().isEnabled()))
    }
    await velg(!var_)
    await admin.reload()
    await innen(15_000, 'valget etter ny innlasting', async () => (await boks().isChecked()) === !var_)
    await velg(var_)
    await admin.reload()
    await innen(15_000, 'tilbake etter ny innlasting', async () => (await boks().isChecked()) === var_)
  })

  await punkt('P11 smal skjerm med redigeringen åpen: ingen sidelengs rulling, og vinduet får plass', async () => {
    await admin.setViewportSize({ width: 390, height: 844 })
    try {
      await tilMedarbeidere(admin)
      await bilde(admin, '08-smal-tabell')
      const tabellside: { side: number; bredde: number } = await admin.evaluate(() => ({ side: document.documentElement.scrollWidth, bredde: window.innerWidth }))
      krev(tabellside.side <= tabellside.bredde, `siden ruller sidelengs med tabellen: ${tabellside.side} > ${tabellside.bredde}`)
      const dialog = await apneRedigering(admin, SYNTETISK)
      await vent(300)
      const mal: { side: number; bredde: number; boks: number } = await admin.evaluate(() => ({
        side: document.documentElement.scrollWidth,
        bredde: window.innerWidth,
        boks: Math.round(document.querySelector('dialog[open]')?.querySelector('*')?.getBoundingClientRect().width ?? 0),
      }))
      await bilde(admin, '09-smal-redigering')
      krev(mal.side <= mal.bredde, `siden ruller sidelengs: ${mal.side} > ${mal.bredde}`)
      krev(mal.boks <= mal.bredde, `vinduet er bredere enn skjermen: ${mal.boks}`)
      krev(await dialog.getByRole('button', { name: 'Lagre' }).isVisible(), '«Lagre» synlig')
      await lukkRedigering(admin)
      return `${mal.boks} av ${mal.bredde} px`
    } finally {
      await admin.setViewportSize({ width: 1440, height: 900 })
    }
  })
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
    const rad = admin.getByRole('row').filter({ has: admin.getByRole('rowheader', { name: SYNTETISK }) })
    await innen(15_000, `${SYNTETISK} i tabellen`, () => rad.isVisible())
    krev(await rad.getByRole('button', { name: new RegExp(SYNTETISK) }).isVisible(), 'knappen for å endre medarbeideren')
    await bilde(admin, '04-medarbeidere')
    await admin.reload()
    await innen(15_000, `${SYNTETISK} etter ny innlasting`, () => rad.isVisible())
    await admin.emulateMedia({ colorScheme: 'dark' })
    await bilde(admin, '04-medarbeidere-moerkt')
    await admin.emulateMedia({ colorScheme: 'light' })
  })

  await punkt('P5b «Vis som» i Sandkasse: som kollega forsvinner Medarbeidere, og valget avsluttes igjen', async () => {
    const visSom = admin.getByRole('group', { name: 'Vis som' })
    const rolle = visSom.getByRole('combobox', { name: 'Rolle' })
    const medarbeiderfaner = () => admin.getByRole('link', { name: 'Medarbeidere' }).count()
    await rolle.selectOption({ label: 'Kollega' })
    await innen(15_000, 'Medarbeidere borte som kollega', async () => (await rolle.inputValue()) === 'reader' && (await medarbeiderfaner()) === 0)
    await bilde(admin, '04b-vis-som-kollega')
    // Serveren håndhever valget: kalenderen svarer som for en kollega, også etter ny innlasting.
    await admin.reload()
    await innen(15_000, 'kollega etter ny innlasting', async () => (await rolle.inputValue()) === 'reader' && (await medarbeiderfaner()) === 0)
    // En direkte adresse til fanen er selve kalenderen for en kollega.
    await tilAdressen(admin, '#/kalender/medarbeidere')
    await innen(10_000, 'adressen skrevet om til #/kalender', async () => (await admin.evaluate(() => location.hash)) === '#/kalender')
    krev((await admin.getByRole('table').count()) === 0, 'tabellen vises for en kollega')
    await visSom.getByRole('button', { name: 'Avslutt' }).click()
    await innen(15_000, 'tilbake som lokal administrator', async () => (await rolle.inputValue()) === 'localAdmin' && (await medarbeiderfaner()) === 1)
  })

  await medarbeiderforlopet(admin)

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
