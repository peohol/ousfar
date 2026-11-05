/**
 * Før-måling (tråd D): kjører vanlige forløp i den publiserte appen slik en
 * kliniker ville gjort det, teller hver nødvendig handling og tar skjermbilder.
 * Bare lesing. Nødstoppen prøves ved å svare appen med en syntetisk sperre
 * (nettverksavskjæring i nettleseren), ikke ved å sette en sperre.
 *
 * Resultatene står i `docs/verktøy-brukervennlighet-maling.md`. Etter-målingen
 * kjøres med det samme skriptet, tilpasset den nye flyten, så tallene kan
 * sammenlignes. Ikke en del av `npm test`, fordi den trenger nett og
 * innlogging.
 *
 * Kjøres fra repoets rot: `npx vite-node src/__tests__/qa/maling.ts`
 * Miljø: APP_URL, BOOTSTRAP_ADMIN_USERNAME, BOOTSTRAP_ADMIN_PASSWORD, og valgfritt
 * MALING_UT (mappe, standard en midlertidig mappe), MALING_BILDER=1 (skjermbilder),
 * MALING_FORLOP=id,id (bare disse forløpene), MALING_TEMA=dark.
 * Skjermbildene viser administratorkontoen og legges ikke i repoet.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { createRequire } from 'node:module'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Side = any

type Kategori = 'kopi' | 'valg' | 'tekst' | 'svar' | 'avkrysning' | 'beregn' | 'formvalg' | 'dosevalg'
interface Handling {
  kategori: Kategori
  hva: string
}

interface Forlop {
  id: string
  verktoy: string
  hva: string
  fra: { navn: string; formulering?: string }
  til?: { navn: string; formulering?: string }
  dose: string
  maldose?: string
  /** Legemiddelformen forskriveren velger når siden ber om det (tekst i valget). */
  former?: string[]
  /** Etter første resultat: bytt form og beregn på nytt. */
  formbytte?: string
  sperre?: boolean
  bilder?: boolean
}

const F: Forlop[] = [
  {
    id: 'K0-01',
    verktoy: 'trappe-ned-antidepressiv',
    hva: 'Escitalopram 10 mg tablett, kort behandlingstid (pasienten bruker tabletter)',
    fra: { navn: 'Escitalopram' },
    dose: '10',
    former: ['Tablett'],
    bilder: true,
  },
  {
    id: 'K0-01/H-39',
    verktoy: 'trappe-ned-antidepressiv',
    hva: 'Som K0-01, men forskriveren bytter til dråper etter at tablett ga «ingen plan»',
    fra: { navn: 'Escitalopram' },
    dose: '10',
    former: ['Tablett'],
    formbytte: 'Dråper',
    bilder: true,
  },
  {
    id: 'K0-09',
    verktoy: 'bytte-antipsykotikum',
    hva: 'Aripiprazol 15 mg tablett til Abilify Maintena',
    fra: { navn: 'Aripiprazol', formulering: 'Peroral' },
    til: { navn: 'Aripiprazol', formulering: 'Depotinjeksjon' },
    dose: '15',
    bilder: true,
  },
  {
    id: 'K0-11',
    verktoy: 'kombinere-stemningsstabiliserende',
    hva: 'Litium (4 × Lithionit 42 mg = 168 mg Li⁺), lamotrigin legges til',
    fra: { navn: 'Litium' },
    til: { navn: 'Lamotrigin' },
    dose: '168',
    maldose: '200',
    bilder: true,
  },
  { id: 'K0-12', verktoy: 'kombinere-stemningsstabiliserende', hva: 'Valproat 1000 mg, lamotrigin legges til', fra: { navn: 'Valproat' }, til: { navn: 'Lamotrigin' }, dose: '1000', maldose: '100' },
  { id: 'N-1', verktoy: 'trappe-ned-antidepressiv', hva: 'Escitalopram 15 mg (utenfor godkjent startdose)', fra: { navn: 'Escitalopram' }, dose: '15', former: ['Dråper'], bilder: true },
  { id: 'N-2', verktoy: 'trappe-ned-antidepressiv', hva: 'Sertralin 100 mg (ingen godkjent regel)', fra: { navn: 'Sertralin' }, dose: '100' },
  { id: 'N-3', verktoy: 'bytte-antidepressiv', hva: 'Sertralin 100 mg til mirtazapin (bytte uten godkjent regel)', fra: { navn: 'Sertralin' }, til: { navn: 'Mirtazapin' }, dose: '100', bilder: true },
  {
    id: 'N-4',
    verktoy: 'kombinere-stemningsstabiliserende',
    hva: 'Lithionit 83 mg (83 mg Li⁺, utenfor regelen), lamotrigin legges til',
    fra: { navn: 'Litium' },
    til: { navn: 'Lamotrigin' },
    dose: '83',
    maldose: '200',
    bilder: true,
  },
  { id: 'N-5', verktoy: 'trappe-ned-antidepressiv', hva: 'Escitalopram når verktøyet er stanset med nødstopp (syntetisk sperre)', fra: { navn: 'Escitalopram' }, dose: '10', sperre: true },
  {
    id: 'K0-07*',
    verktoy: 'bytte-antipsykotikum',
    hva: 'Olanzapin 20 mg tablett til aripiprazol tablett (måldose 10 mg; regelen gjelder bare 20 mg)',
    fra: { navn: 'Olanzapin', formulering: 'Peroral' },
    til: { navn: 'Aripiprazol', formulering: 'Peroral' },
    dose: '20',
    maldose: '10',
    bilder: true,
  },
  {
    id: 'K0-08',
    verktoy: 'bytte-antipsykotikum',
    hva: 'Risperidon 4 mg tablett til aripiprazol tablett (måldose 10 mg)',
    fra: { navn: 'Risperidon', formulering: 'Peroral' },
    til: { navn: 'Aripiprazol', formulering: 'Peroral' },
    dose: '4',
    maldose: '10',
  },
  {
    id: 'K0-10*',
    verktoy: 'bytte-antipsykotikum',
    hva: 'Risperidon 3 mg tablett til Xeplion (måldose 75 mg; regelen gjelder bare 3 mg)',
    fra: { navn: 'Risperidon', formulering: 'Peroral' },
    til: { navn: 'Paliperidon', formulering: 'Depotinjeksjon (paliperidonpalmitat)' },
    dose: '3',
    maldose: '75',
  },
  {
    id: 'K0-07',
    verktoy: 'bytte-antipsykotikum',
    hva: 'Olanzapin 10 mg tablett til aripiprazol tablett (måldose 10 mg)',
    fra: { navn: 'Olanzapin', formulering: 'Peroral' },
    til: { navn: 'Aripiprazol', formulering: 'Peroral' },
    dose: '10',
    maldose: '10',
  },
  {
    id: 'K0-10',
    verktoy: 'bytte-antipsykotikum',
    hva: 'Risperidon 4 mg tablett til Xeplion (måldose 75 mg)',
    fra: { navn: 'Risperidon', formulering: 'Peroral' },
    til: { navn: 'Paliperidon', formulering: 'Depotinjeksjon (paliperidonpalmitat)' },
    dose: '4',
    maldose: '75',
  },
  {
    id: 'N-6',
    verktoy: 'bytte-antipsykotikum',
    hva: 'Kvetiapin 400 mg til aripiprazol tablett (bytte uten godkjent regel)',
    fra: { navn: 'Kvetiapin' },
    til: { navn: 'Aripiprazol', formulering: 'Peroral' },
    dose: '400',
    bilder: true,
  },
]

const miljo = (n: string) => {
  const x = process.env[n]
  if (!x) throw new Error(`${n} mangler`)
  return x
}
const UT = process.env.MALING_UT ?? `${tmpdir()}/verktoy-maling`
mkdirSync(UT, { recursive: true })

async function loggInn(p: Side, url: string) {
  await p.goto(url, { waitUntil: 'networkidle' })
  await p.fill('input[name=username]', miljo('BOOTSTRAP_ADMIN_USERNAME'))
  await p.fill('input[name=password]', miljo('BOOTSTRAP_ADMIN_PASSWORD'))
  await p.click('button:has-text("Logg inn")')
  await p.waitForSelector('input[name=username]', { state: 'detached', timeout: 30_000 })
}

async function rolig(p: Side) {
  await p.waitForTimeout(400)
  await p.waitForSelector('text=/Henter preparatene|Kontrollerer/', { state: 'detached', timeout: 60_000 }).catch(() => undefined)
  await p.waitForTimeout(400)
}

interface Resultat {
  id: string
  bredde: number
  handlinger: Handling[]
  utfall: string
  /** Synlige spørsmål/felt i skjemaet idet beregningen ble startet første gang. */
  skjema: { sporsmal: number; avkrysninger: number; felt: number; ord: number; hoyde: number }
  stoppForSkjema: boolean
}

async function skjemamal(p: Side) {
  return p.evaluate(() => {
    const main = document.querySelector('main') ?? document.body
    const skjema = [...main.querySelectorAll('form')]
    const radiogrupper = new Set(skjema.flatMap((f) => [...f.querySelectorAll('input[type=radio]')].map((r) => (r as HTMLInputElement).name)))
    const ord = skjema
      .map((f) => (f as HTMLElement).innerText)
      .join(' ')
      .split(/\s+/)
      .filter(Boolean).length
    return {
      sporsmal: radiogrupper.size,
      avkrysninger: skjema.reduce((n, f) => n + f.querySelectorAll('input[type=checkbox]').length, 0),
      felt: skjema.reduce((n, f) => n + f.querySelectorAll('input[type=text], input[type=date], input[inputmode], textarea, select').length, 0),
      ord,
      hoyde: document.documentElement.scrollHeight,
    }
  })
}

async function kjor(p: Side, url: string, f: Forlop, bredde: number, bilder: boolean): Promise<Resultat> {
  const h: Handling[] = []
  const gjor = async (kategori: Kategori, hva: string, fn: () => Promise<unknown>) => {
    await fn()
    h.push({ kategori, hva })
  }
  const bilde = async (navn: string) => {
    if (bilder) await p.screenshot({ path: `${UT}/${f.id.replace('/', '_')}-${bredde}-${navn}.png`, fullPage: true })
  }
  await p.goto('about:blank')
  await p.goto(`${url}/#/verktoy/${f.verktoy}`, { waitUntil: 'networkidle' })
  await rolig(p)
  const velg = async (etikett: RegExp, v: { navn: string; formulering?: string }) => {
    await gjor('valg', `velg ${v.navn}`, async () => {
      const felt = p.getByRole('form', { name: 'Valg' }).getByRole('combobox', { name: etikett })
      await felt.fill(v.navn)
      await p.keyboard.press('Enter')
    })
    if (v.formulering) {
      const grupper = p.getByRole('group', { name: new RegExp(`Formulering av ${v.navn}`, 'i') })
      const g = (await grupper.count()) > 1 ? grupper.nth(f.til && etikett.source.includes('til') ? 1 : 0) : grupper.first()
      if ((await g.count()) > 0) await gjor('valg', `formulering ${v.formulering}`, () => g.getByRole('radio', { name: v.formulering, exact: true }).check())
    }
  }
  const combo = p.getByRole('form', { name: 'Valg' }).getByRole('combobox')
  const etiketter: string[] = await combo.evaluateAll((els: HTMLInputElement[]) => els.map((e) => e.closest('label')?.querySelector('span')?.textContent ?? ''))
  await velg(new RegExp(etiketter[0]!), f.fra)
  if (f.til) await velg(new RegExp(etiketter[1]!), f.til)
  await rolig(p)
  const beregn = p.getByRole('button', { name: 'Beregn doseplan' })
  const main = p.getByRole('main')
  if ((await beregn.count()) === 0) {
    await bilde('stopp')
    const status = p.locator('.verktoystatus, .verktoyside__hint')
    const linje = ((await status.count()) > 0 ? ((await status.last().innerText()) as string) : 'ingen beregning').replace(/\s+/g, ' ').slice(0, 400)
    return { id: f.id, bredde, handlinger: h, utfall: `stopp før skjema: ${linje}`, skjema: await skjemamal(p), stoppForSkjema: true }
  }
  await gjor('tekst', 'aktuell dose', () => p.getByRole('textbox', { name: /^Aktuell (døgn)?dose/ }).fill(f.dose))
  const mal = p.getByRole('textbox', { name: /^Måldose/ })
  if (f.maldose && (await mal.count()) > 0) await gjor('tekst', 'måldose', () => mal.fill(f.maldose!))
  await bilde('tomt-skjema')
  // Svar og bekreftelser til ingenting mer er ubesvart (betingede bekreftelser dukker opp etter svar).
  for (let runde = 0; runde < 5; runde++) {
    let endret = false
    const pasient = p.getByRole('group', { name: 'Om pasienten' })
    if ((await pasient.count()) > 0) {
      for (const g of await pasient.getByRole('group').all()) {
        const radioer = await g.getByRole('radio').all()
        if (radioer.length < 2) continue
        if (await radioer[0]!.isChecked()) continue
        if (await radioer[1]!.isChecked()) continue
        const navn = ((await g.innerText()) as string).split('\n')[0]!.slice(0, 80)
        await gjor('svar', `nei/gjelder ikke: ${navn}`, () => radioer[1]!.check())
        endret = true
      }
    }
    const bekreft = p.getByRole('group', { name: 'Bekreft før beregning' })
    if ((await bekreft.count()) > 0)
      for (const c of await bekreft.getByRole('checkbox').all()) {
        if (await c.isChecked()) continue
        const navn = ((await c.evaluate((e: HTMLElement) => e.closest('label')?.innerText ?? '')) as string).slice(0, 80)
        await gjor('avkrysning', `bekreft: ${navn}`, () => c.check())
        endret = true
      }
    if (!endret) break
  }
  const mal1 = await skjemamal(p)
  await bilde('utfylt')
  const beregnOgVent = async (hva: string) => {
    await gjor('beregn', hva, () => beregn.click())
    await rolig(p)
  }
  await beregnOgVent('Beregn doseplan')
  // Begrunnelse kreves?
  const feil = p.locator('.verktoyskjema__feil')
  if ((await feil.count()) > 0 && /begrunnelse/i.test(await feil.innerText())) {
    await gjor('tekst', 'begrunnelse', () => p.getByRole('textbox', { name: 'Begrunnelse for valgene' }).fill('Syntetisk testforløp.'))
    await beregnOgVent('Beregn på nytt etter begrunnelse')
  }
  const velgFormer = async (onsket: string[]) => {
    const former = p.getByRole('combobox', { name: /Legemiddelform av|Formulering av/ })
    let n = 0
    for (const s of await former.all()) {
      const opsjoner: { v: string; t: string }[] = await s.locator('option').evaluateAll((o: HTMLOptionElement[]) => o.map((x) => ({ v: x.value, t: x.textContent ?? '' })).filter((x) => x.v))
      const lik = (o: { t: string }, x: string) => o.t.trim().toLowerCase() === x.toLowerCase()
      const begynner = (o: { t: string }, x: string) => o.t.trim().toLowerCase().startsWith(x.toLowerCase())
      const valgt = opsjoner.find((o) => onsket.some((x) => lik(o, x))) ?? opsjoner.find((o) => onsket.some((x) => begynner(o, x))) ?? opsjoner[0]!
      const naa = await s.inputValue()
      if (naa === valgt.v) continue
      await gjor('formvalg', `form: ${valgt.t}`, () => s.selectOption(valgt.v))
      n++
    }
    return n
  }
  if ((await velgFormer(f.former ?? ['Tablett'])) > 0) await beregnOgVent('Beregn på nytt etter formvalg')
  if (f.formbytte) {
    if ((await velgFormer([f.formbytte])) > 0) await beregnOgVent('Beregn på nytt etter formbytte')
  }
  const trinn = p.getByRole('region', { name: 'Doser som kan velges' })
  for (let n = 0; n < 30 && (await trinn.count()) > 0; n++) {
    const knapp = trinn.getByRole('group').first().getByRole('button').first()
    const t = (await knapp.innerText()) as string
    await gjor('dosevalg', `trinn: ${t}`, () => knapp.click())
    await rolig(p)
  }
  const tabell = (await p.locator('table').count()) > 0
  await bilde('resultat')
  let utfall: string
  if (tabell) {
    const kopi = p.getByRole('button', { name: 'Kopier planen' })
    await gjor('kopi', 'kopier planen', () => kopi.click())
    utfall = 'plan'
  } else {
    const status = p.locator('.verktoystatus, .verktoyskjema__feil, .sidevarsel')
    const tekst: string = (await status.count()) > 0 ? await status.last().innerText() : await main.innerText()
    utfall = 'stopp etter skjema: ' + tekst.replace(/\s+/g, ' ').slice(0, 400)
  }
  return { id: f.id, bredde, handlinger: h, utfall, skjema: mal1, stoppForSkjema: false }
}

async function main() {
  const url = miljo('APP_URL').replace(/\/$/, '')
  const kreve = createRequire(import.meta.url)
  const { chromium } = kreve('playwright') as { chromium: { launch(): Promise<Side> } }
  const nettleser = await chromium.launch()
  const alle: Resultat[] = []
  const bare = process.env.MALING_FORLOP?.split(',')
  const tema = (process.env.MALING_TEMA ?? 'light') as 'light' | 'dark'
  for (const [bredde, hoyde, mobil] of [
    [1440, 900, false],
    [390, 844, true],
  ] as const) {
    const kontekst = await nettleser.newContext({
      viewport: { width: bredde, height: hoyde },
      deviceScaleFactor: process.env.MALING_BILDER ? 2 : 1,
      isMobile: mobil,
      hasTouch: mobil,
      colorScheme: tema,
      locale: 'nb-NO',
      timezoneId: 'Europe/Oslo',
      permissions: ['clipboard-read', 'clipboard-write'],
    })
    const p = await kontekst.newPage()
    await loggInn(p, url)
    const versjon = (
      (await p
        .locator('text=/^v\\d+\\.\\d+\\.\\d+$/')
        .first()
        .innerText()
        .catch(() => '?')) as string
    ).trim()
    console.log('versjon', versjon, 'bredde', bredde, 'tema', await p.evaluate(() => document.documentElement.dataset.tema))
    for (const f of F.filter((x) => !bare || bare.includes(x.id))) {
      if (f.sperre)
        await p.route('**/rpc/les_verktoysperrer*', (r: Side) =>
          r.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([{ id: 'syntetisk', omfang: 'alle', mal: null, grunn: 'Syntetisk sperre i før-målingen (ikke lagret).', satt_kl: new Date().toISOString(), satt_av: 'måling' }]),
          }),
        )
      try {
        const r = await kjor(p, url, f, bredde, !!process.env.MALING_BILDER && !!f.bilder)
        alle.push(r)
        console.log(f.id, bredde, r.handlinger.length, r.utfall)
      } catch (e) {
        console.log(f.id, bredde, 'FEIL', String(e).split('\n')[0])
        alle.push({ id: f.id, bredde, handlinger: [], utfall: `feil: ${String(e).split('\n')[0]}`, skjema: { sporsmal: 0, avkrysninger: 0, felt: 0, ord: 0, hoyde: 0 }, stoppForSkjema: false })
      } finally {
        if (f.sperre) await p.unroute('**/rpc/les_verktoysperrer*')
      }
    }
    alle.push({ id: `versjon:${versjon}`, bredde, handlinger: [], utfall: '', skjema: { sporsmal: 0, avkrysninger: 0, felt: 0, ord: 0, hoyde: 0 }, stoppForSkjema: false })
    await kontekst.close()
  }
  await nettleser.close()
  writeFileSync(`${UT}/maling-${tema}.json`, JSON.stringify(alle, null, 2))
}

await main()
