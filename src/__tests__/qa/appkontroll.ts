/**
 * Brukerforløpene i {@link BRUKERFORLOP} kjørt i den publiserte appen, som en
 * administrator ville gjort det: velge
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
import { FORMULERINGSNAVN, VALGTEKSTER, virkestoffvalg } from '../../verktoy/register'
import { BRUKERFORLOP, kjorForlop, KLASSENAVN, lesUttrekkene, tidslinjeavvik, type Brukerforlop, type Forlopsresultat, type Tidslinje } from './brukerforlop'

export const APPKONTROLL = 'docs/verktøy-qa-appkontroll.md'

/** Playwright er forhåndsinstallert i skymiljøet, men ikke en avhengighet i repoet, så siden er løst typet. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Side = any

interface Appresultat {
  tabell: boolean
  /** Kopien når appen viser en plan; ellers teksten i verktøyets resultatdel. */
  tekst: string
  /** Den synlige tidslinjen: kolonneoverskriftene og cellene i hver rad, slik de står på siden. */
  tidslinje?: Tidslinje
  /** Ved formbytte: om appen viste en plan før byttet. */
  planForBytte?: boolean
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

/** Velger legemiddelformene (fra, til) siden ber om: de ønskede når siden tilbyr dem, ellers tablett som i den lokale kjøringen. */
async function velgFormer(p: Side, onsket: (string | undefined)[]) {
  const former = p.getByRole('combobox', { name: /Legemiddelform av/ })
  if ((await former.count()) === 0) return false
  for (const [i, s] of (await former.all()).entries()) {
    const verdier = await s.locator('option').evaluateAll((o: HTMLOptionElement[]) => o.map((x) => x.value).filter(Boolean))
    await s.selectOption([onsket[i], '53'].find((x) => x && verdier.includes(x)) ?? verdier[0]!)
  }
  return true
}

async function kjorIApp(p: Side, url: string, r: Forlopsresultat): Promise<Appresultat> {
  const f = r.forlop
  const verktoy = r.verktoy!
  const skjema = r.skjema ?? {}
  // Siden laster helt på nytt for hvert forløp, så ingen valg eller skjemaverdier fra forrige forløp følger med; innloggingen står.
  await p.goto('about:blank')
  await p.goto(`${url}/#/verktoy/${verktoy.id}`, { waitUntil: 'networkidle' })
  await p.waitForSelector('text=/Kontrollerer/', { state: 'detached', timeout: 20_000 }).catch(() => undefined)
  const stoff = (n: string) => virkestoffvalg(verktoy).find((v) => v.nokkel === n)!
  const tekster = VALGTEKSTER[verktoy.type]
  const fra = stoff(f.valg.fra.nokkel)
  await velg(p, tekster.fra, fra.navn, 'fra', FORMULERINGSNAVN[f.valg.fra.formulering], fra.formuleringer.length > 1)
  if (tekster.til) {
    const til = stoff(f.valg.til!.nokkel)
    await velg(p, tekster.til, til.navn, 'til', FORMULERINGSNAVN[f.valg.til!.formulering], til.formuleringer.length > 1)
  }
  await p.waitForTimeout(1500)
  const beregn = p.getByRole('button', { name: 'Beregn doseplan' })
  if ((await beregn.count()) === 0) return { tabell: false, tekst: await p.getByRole('main').innerText() }

  await p.getByRole('textbox', { name: /^Aktuell (døgn)?dose/ }).fill(f.dose)
  const maldose = p.getByRole('textbox', { name: /^Måldose/ })
  if (skjema.maldose && (await maldose.count()) > 0) await maldose.fill(skjema.maldose)
  const bekreft = p.getByRole('group', { name: 'Bekreft før beregning' })
  for (const c of await bekreft.getByRole('checkbox').all()) if (!(await c.isChecked())) await c.check()
  // Nei / gjelder ikke på alt, unntatt spørsmålene forløpet svarer ja på (for eksempel lang behandlingstid).
  const ja = new Set((r.regel?.sporsmal ?? []).filter((q) => skjema.svar?.[q.id]).map((q) => q.tekst))
  const pasient = p.getByRole('group', { name: 'Om pasienten' })
  for (const g of await pasient.getByRole('group').all()) {
    const navn = ((await g.getAttribute('aria-label')) ?? (await g.innerText()).split('\n')[0]!).trim()
    await (await g.getByRole('radio').all())[[...ja].some((t) => navn.startsWith(t.slice(0, 40))) ? 0 : 1]!.check()
  }
  if (skjema.begrunnelse) await p.getByRole('textbox', { name: 'Begrunnelse for valgene' }).fill(skjema.begrunnelse)
  await beregn.click()
  await beregnet(p)
  // Formbytte: først formen siden foreslår (tablett), så den forskriveren bytter til.
  let planForBytte: boolean | undefined
  if (f.formbytte) {
    if (await velgFormer(p, [])) {
      await beregn.click()
      await beregnet(p)
    }
    planForBytte = (await p.locator('table').count()) > 0
  }
  if (await velgFormer(p, f.formbytte ? [f.formbytte] : [skjema.formvalg?.fra?.legemiddelform, skjema.formvalg?.til?.legemiddelform])) {
    await beregn.click()
    await beregnet(p)
  }
  // Der siden lar forskriveren velge dosen for et trinn, velges den samme dosen som i den lokale kjøringen (første eller siste).
  const trinn = p.getByRole('region', { name: 'Doser som kan velges' })
  for (let n = 0; n < r.trinnvalg.length && (await trinn.count()) > 0; n++) {
    const knapper = trinn.getByRole('group').first().getByRole('button')
    await (f.trinn === 'siste' ? knapper.last() : knapper.first()).click()
    await beregnet(p)
  }
  const ekstra = planForBytte === undefined ? {} : { planForBytte }
  if ((await p.locator('table').count()) === 0) return { tabell: false, tekst: await p.getByRole('main').innerText(), ...ekstra }
  const tidslinje = await p
    .locator('table')
    .first()
    .evaluate((t: HTMLTableElement) => ({
      koloner: [...t.querySelectorAll('thead th')].map((c) => (c as HTMLElement).innerText.trim()),
      rader: [...t.querySelectorAll('tbody tr')].map((r) => [...r.children].map((c) => (c as HTMLElement).innerText.trim())),
    }))
  await p.getByRole('button', { name: 'Kopier planen' }).click()
  return { tabell: true, tekst: await p.evaluate(() => navigator.clipboard.readText()), tidslinje, ...ekstra }
}

/** Linjer i kopien som avhenger av når FEST ble lest, og derfor ventes å være ulike lokalt og i appen. */
const FESTLINJE = /^- (FEST-uttrekk|Preparatgrunnlag) /

/** Linjene i `a` som ikke står like mange ganger i `b`. */
function utenMotstykke(a: readonly string[], b: readonly string[]): string[] {
  const igjen = new Map<string, number>()
  for (const l of b) igjen.set(l, (igjen.get(l) ?? 0) + 1)
  return a.filter((l) => {
    const n = igjen.get(l) ?? 0
    igjen.set(l, n - 1)
    return n <= 0
  })
}

/**
 * Om appen gir det samme som den lokale kjøringen: hele den kopierte planen
 * linje for linje begge veier (rader, undertittel, hver liste, kilder og
 * regelversjon; bare FEST-tidspunktet er unntatt), eller ingen plan og samme
 * første grunn.
 */
function sammenlign(r: Forlopsresultat, a: Appresultat): string[] {
  // En klinisk doseplan skal bare vises når den når sluttmålet; en delplan i appen er et avvik i seg selv.
  if (a.tabell && r.klasse !== 'komplett') return [`appen viser en klinisk doseplan, men den når ikke sluttmålet (lokalt ${KLASSENAVN[r.klasse]})`]
  const lokalPlan = r.klasse === 'komplett'
  if (lokalPlan !== a.tabell) return [`lokalt ${KLASSENAVN[r.klasse]}, i appen ${a.tabell ? 'en plan' : 'ingen plan'}`]
  const bytte = a.planForBytte ? ['appen viste en plan før formbyttet, men lokalt ga formen siden foreslår ingen plan'] : []
  if (lokalPlan && r.utfall?.utfall === 'plan') {
    const linjer = (t: string) => t.split('\n').filter((l) => !FESTLINJE.test(l))
    const lokal = linjer(r.utfall.tekst ?? '')
    const app = linjer(a.tekst)
    if (lokal.length === 0) return ['den lokale kjøringen har ingen kopi å sammenligne med']
    return [
      ...bytte,
      ...utenMotstykke(lokal, app).map((l) => `«${l}» mangler i appens kopi`),
      ...utenMotstykke(app, lokal).map((l) => `appens kopi har i tillegg «${l}»`),
      ...(a.tidslinje ? tidslinjeavvik(a.tidslinje, a.tekst) : ['appen viser ingen tidslinje å sammenligne kopien med']),
    ]
  }
  if (r.klasse === 'fagtekst') return /Beregning er ikke tilgjengelig/.test(a.tekst) ? ['appen sier at beregning ikke er tilgjengelig, men viser ikke fagteksten'] : []
  return r.vist[0] && !a.tekst.includes(r.vist[0].slice(0, 60)) ? [`appens tekst nevner ikke «${r.vist[0].slice(0, 60)}…»`] : []
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
    // En endring i FEST (avregistrert styrke) kan bare prøves mot de lagrede uttrekkene, ikke i appen.
    if (!r.verktoy || f.fest) {
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
    // Tidslinjen og kopien slik appen ga dem, for å kunne lese sammenligningen etterpå.
    if (a.tabell && process.env.QA_BILDER) writeFileSync(`${process.env.QA_BILDER}/${f.id}.json`, JSON.stringify({ tidslinje: a.tidslinje, kopi: a.tekst }, null, 2))
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
      `Kjørt ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC mot ${url} (${versjon}) som administrator, med dagens FEST. Hvert forløp er det samme som i \`docs/verktøy-qa-brukerforlop.md\`: syntetiske doser, alle bekreftelser og nei på hvert unntak og spørsmål (ja der forløpet svarer ja), måldosen forløpet velger, tablett når siden ber om legemiddelform med mindre forløpet velger en annen form eller bytter form underveis. Siden lastes helt på nytt for hvert forløp. Bare lesing; ingenting er lagret. «Avvik» sammenligner med den lokale kjøringen mot de lagrede FEST-uttrekkene: hele kopien linje for linje, og den synlige tidslinjen (hver rad og celle) mot kopien.`,
      '',
      `Planer teknisk ende-til-ende-verifisert i appen (hele kopien lik den lokale kjøringen linje for linje, bortsett fra FEST-tidspunktet): **${verifisert}**. Dette er en teknisk verifikasjon med syntetiske data, ikke «klinisk prøveverifisert» (plan §8); det krever i tillegg en faglig gjennomgang av hele doseringsforløpet, kildene og de relevante risikoene.`,
      '',
      '## Kontroller som ikke er gjort',
      '',
      '- Verktøyene er bare synlige for administratorer. Ingen kontroll her viser hva en kliniker ser, og ingen plan er tilgjengelig for klinikere.',
      '- Kjøringen er en teknisk Playwright-kontroll med syntetiske pasienter, logget inn som administrator. Den er verken klinisk godkjenning eller klinisk prøving; reglenes godkjenning er kontrollørens og Peders, for nøyaktig versjon og fingeravtrykk.',
      '- Klinisk prøving med reelle forløp (plan §8), bruk av kopien i journal eller resept og utskrift er ikke prøvd.',
      '- Forløp med en endret FEST (avregistrert styrke) kan bare prøves mot de lagrede uttrekkene, ikke i appen.',
      '',
      '| Id | Situasjon | Lokalt | I appen | Avvik |',
      '| --- | --- | --- | --- | --- |',
      ...rader,
      '',
    ].join('\n'),
  )
}

await main()
