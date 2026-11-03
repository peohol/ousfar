/**
 * Brukerforløpene i {@link BRUKERFORLOP} kjørt i den publiserte appen, som en
 * administrator ville gjort det (plan §8 «Klinisk prøveverifisert»): velge
 * virkestoff og formulering, skrive dosen, bekrefte og svare nei på hvert
 * unntak, beregne, velge tablett når siden ber om legemiddelform, og kopiere
 * planen. Resultatet sammenlignes med den lokale kjøringen mot de lagrede
 * FEST-uttrekkene; appen bruker dagens FEST, så et avvik i preparatene kan
 * være en reell endring i FEST og vurderes for seg.
 *
 * Bare lesing: ingen plan, sperre eller innstilling lagres. Kjøres med
 * `npx vite-node src/__tests__/qa/appkontroll.ts` når APP_URL,
 * BOOTSTRAP_ADMIN_USERNAME og BOOTSTRAP_ADMIN_PASSWORD er satt, og skriver
 * {@link APPKONTROLL}. Ikke en del av `npm test`, fordi den trenger nett og
 * innlogging.
 */
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { FORMULERINGSNAVN, virkestoffvalg } from '../../verktoy/register'
import { BRUKERFORLOP, kjorForlop, KLASSENAVN, lesUttrekkene, type Brukerforlop, type Forlopsresultat } from './brukerforlop'

export const APPKONTROLL = 'docs/verktøy-qa-appkontroll.md'

/** Playwright er forhåndsinstallert i skymiljøet, men ikke en avhengighet i repoet, så siden er løst typet. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Side = any

interface Appresultat {
  tabell: boolean
  /** Kopien når appen viser en plan; ellers teksten i verktøyets resultatdel. */
  tekst: string
}

const miljo = (navn: string) => {
  const x = process.env[navn]
  if (!x) throw new Error(`${navn} mangler.`)
  return x
}

async function loggInn(p: Side, url: string) {
  await p.goto(url, { waitUntil: 'networkidle' })
  await p.fill('input[name=username]', miljo('BOOTSTRAP_ADMIN_USERNAME'))
  await p.fill('input[name=password]', miljo('BOOTSTRAP_ADMIN_PASSWORD'))
  await p.click('button:has-text("Logg inn")')
  await p.waitForSelector('input[name=username]', { state: 'detached', timeout: 30_000 })
}

async function velg(p: Side, felt: string, navn: string, rolle: string, formulering: string, flere: boolean) {
  await p.getByRole('combobox', { name: felt }).fill(navn)
  await p.keyboard.press('Enter')
  if (flere)
    await p
      .getByRole('group', { name: new RegExp(`Formulering av ${navn}.*${rolle}`, 'i') })
      .getByRole('radio', { name: formulering, exact: true })
      .check()
}

/** Venter til siden er ferdig med å hente preparatene og beregne. */
async function beregnet(p: Side) {
  await p.waitForTimeout(500)
  await p.waitForSelector('text=/Henter preparatene/', { state: 'detached', timeout: 60_000 })
  await p.waitForTimeout(500)
}

async function kjorIApp(p: Side, url: string, r: Forlopsresultat): Promise<Appresultat> {
  const f = r.forlop
  const verktoy = r.verktoy!
  await p.goto(`${url}/#/verktoy/${verktoy.id}`, { waitUntil: 'networkidle' })
  await p.waitForSelector('text=Kontrollerer', { state: 'detached', timeout: 20_000 }).catch(() => undefined)
  const stoff = (n: string) => virkestoffvalg(verktoy).find((v) => v.nokkel === n)!
  const fra = stoff(f.valg.fra.nokkel)
  if (verktoy.type === 'seponering') await velg(p, 'Virkestoff pasienten bruker', fra.navn, 'fra', FORMULERINGSNAVN[f.valg.fra.formulering], fra.formuleringer.length > 1)
  else {
    const til = stoff(f.valg.til!.nokkel)
    await velg(p, 'Bytte fra', fra.navn, 'fra', FORMULERINGSNAVN[f.valg.fra.formulering], fra.formuleringer.length > 1)
    await velg(p, 'Bytte til', til.navn, 'til', FORMULERINGSNAVN[f.valg.til!.formulering], til.formuleringer.length > 1)
  }
  await p.waitForTimeout(1500)
  const beregn = p.getByRole('button', { name: 'Beregn doseplan' })
  if ((await beregn.count()) === 0) return { tabell: false, tekst: await p.getByRole('main').innerText() }

  await p.getByRole('textbox', { name: /Aktuell døgndose/ }).fill(f.dose)
  const bekreft = p.getByRole('group', { name: 'Bekreft før beregning' })
  for (const c of await bekreft.getByRole('checkbox').all()) if (!(await c.isChecked())) await c.check()
  const pasient = p.getByRole('group', { name: 'Om pasienten' })
  for (const g of await pasient.getByRole('group').all()) await (await g.getByRole('radio').all())[1]!.check()
  await beregn.click()
  await beregnet(p)
  const former = p.getByRole('combobox', { name: /Legemiddelform av/ })
  if ((await former.count()) > 0) {
    for (const s of await former.all()) {
      const verdier = await s.locator('option').evaluateAll((o: HTMLOptionElement[]) => o.map((x) => x.value).filter(Boolean))
      await s.selectOption(verdier.includes('53') ? '53' : verdier[0]!)
    }
    await beregn.click()
    await beregnet(p)
  }
  if ((await p.locator('table').count()) === 0) return { tabell: false, tekst: await p.getByRole('main').innerText() }
  await p.getByRole('button', { name: 'Kopier planen' }).click()
  return { tabell: true, tekst: await p.evaluate(() => navigator.clipboard.readText()) }
}

/** Om appen gir det samme som den lokale kjøringen: samme rader og undertittel, eller ingen plan og samme første grunn. */
function sammenlign(r: Forlopsresultat, a: Appresultat): string[] {
  const avvik: string[] = []
  const lokalPlan = r.klasse === 'komplett' || r.klasse === 'delplan'
  if (lokalPlan !== a.tabell) return [`lokalt ${KLASSENAVN[r.klasse]}, i appen ${a.tabell ? 'en plan' : 'ingen plan'}`]
  if (lokalPlan && r.utfall?.utfall === 'plan') {
    for (const l of r.utfall.linjer) if (!a.tekst.includes(l)) avvik.push(`raden «${l}» står ikke i appens kopi`)
    if (r.utfall.undertittel && !a.tekst.includes(r.utfall.undertittel)) avvik.push('undertittelen står ikke i appens kopi')
    if (r.regel && !a.tekst.includes(`Regel ${r.regel.id}, versjon ${r.regel.versjon}`)) avvik.push('regelversjonen står ikke i appens kopi')
    if (!/\nKilder:\n- \S/.test(a.tekst)) avvik.push('kildene står ikke i appens kopi')
  } else if (r.klasse === 'fagtekst') {
    if (/Beregning er ikke tilgjengelig/.test(a.tekst)) avvik.push('appen sier at beregning ikke er tilgjengelig, men viser ikke fagteksten')
  } else if (r.vist[0] && !a.tekst.includes(r.vist[0].slice(0, 60))) avvik.push(`appens tekst nevner ikke «${r.vist[0].slice(0, 60)}…»`)
  return avvik
}

const celle = (x: string) => x.replace(/\|/g, '\\|').replace(/\n/g, ' ')

async function main() {
  const url = miljo('APP_URL').replace(/\/$/, '')
  const kreve = createRequire(import.meta.url)
  const { chromium } = kreve('playwright') as { chromium: { launch(): Promise<Side> } }
  const nettleser = await chromium.launch()
  const kontekst = await nettleser.newContext({ viewport: { width: 1300, height: 1000 }, permissions: ['clipboard-read', 'clipboard-write'] })
  const side = await kontekst.newPage()
  await loggInn(side, url)
  const versjon = (
    await side
      .locator('text=/^v\\d+\\.\\d+\\.\\d+$/')
      .first()
      .innerText()
      .catch(() => 'ukjent')
  ).trim()

  const uttrekk = lesUttrekkene()
  const rader: string[] = []
  let verifisert = 0
  const bare = process.env.QA_FORLOP?.split(',')
  for (const f of (BRUKERFORLOP as readonly Brukerforlop[]).filter((x) => !bare || bare.includes(x.id))) {
    const r = kjorForlop(f, uttrekk)
    if (!r.verktoy) {
      rader.push(`| ${f.id} | ${celle(f.hva)} | ${KLASSENAVN[r.klasse]} | – | – |`)
      continue
    }
    let a: Appresultat
    try {
      a = await kjorIApp(side, url, r)
    } catch (e) {
      rader.push(`| ${f.id} | ${celle(f.hva)} | ${KLASSENAVN[r.klasse]} | kjøringen feilet: ${celle(String(e).split('\n')[0]!)} | ja |`)
      continue
    }
    const avvik = sammenlign(r, a)
    if (avvik.length > 0 && process.env.QA_BILDER) await side.screenshot({ path: `${process.env.QA_BILDER}/${f.id}.png`, fullPage: true })
    if (a.tabell && avvik.length === 0) verifisert++
    const app = a.tabell
      ? 'Plan'
      : celle(
          (r.klasse === 'fagtekst'
            ? a.tekst
                .split('\n')
                .filter((l) => !l.startsWith('Beregnet forslag'))
                .find((l) => l.length > 40)
            : a.tekst.split('\n').find((l) => /^(Beregning er ikke tilgjengelig|OUSFAR har ingen regel|Ingen klinisk doseplan)|kan ikke gis/.test(l))) ?? 'Ingen plan',
        )
    rader.push(`| ${f.id} | ${celle(f.hva)} | ${KLASSENAVN[r.klasse]} | ${app} | ${avvik.length ? celle(avvik.join('; ')) : 'nei'} |`)
    console.log(f.id, KLASSENAVN[r.klasse], a.tabell ? 'plan' : 'ingen plan', avvik.join('; '))
  }
  await nettleser.close()

  writeFileSync(
    APPKONTROLL,
    [
      '<!-- Laget av `npx vite-node src/__tests__/qa/appkontroll.ts`; rediger ikke for hånd. -->',
      '# OUSFAR Verktøy – brukerforløpene i den publiserte appen',
      '',
      `Kjørt ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC mot ${url} (${versjon}) som administrator, med dagens FEST. Hvert forløp er det samme som i \`docs/verktøy-qa-brukerforlop.md\`: syntetiske doser, alle bekreftelser og nei på hvert unntak og spørsmål, tablett når siden ber om legemiddelform. Bare lesing; ingenting er lagret. «Avvik» sammenligner med den lokale kjøringen mot de lagrede FEST-uttrekkene.`,
      '',
      `Planer prøvd i appen uten avvik (samme rader, undertittel, kilder og regelversjon i kopien; «klinisk prøveverifisert» i plan §8): **${verifisert}**.`,
      '',
      '| Id | Situasjon | Lokalt | I appen | Avvik |',
      '| --- | --- | --- | --- | --- |',
      ...rader,
      '',
    ].join('\n'),
  )
}

await main()
