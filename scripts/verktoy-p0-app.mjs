/**
 * P0 i `docs/verktøy-produktrevisjon-2026-11.md`: kjører brukerforløpene i
 * `scripts/verktoy-p0-forlop.json` i den publiserte appen, slik en kliniker
 * ville gjort det, og skriver hva som skjedde: hver handling, hele teksten på
 * siden, kopien av planen, skjermbilder og eventuelt utskrift (PDF).
 *
 * Forskjellen fra QA-kontrollen (`src/__tests__/qa/appkontroll.ts`) er at
 * hvert forløp angir svarene en kliniker ville gitt (også «Ja» der pasienten
 * har lang behandlingstid), og at dosevalgene i planen telles som egne
 * handlinger i stedet for å velges i det skjulte. Bare lesing: ingenting
 * lagres i appen. Syntetiske pasienter.
 *
 *   npx vite-node scripts/verktoy-p0-app.mjs [id …]
 *
 * Som standard kjøres den i det lokale testmiljøet med egen database
 * (`src/__tests__/qa/testmiljo.ts`, `docs/qa-testmiljo.md`). Mot den publiserte
 * appen bare med `QA_PRODUKSJON=ja`, APP_URL og BOOTSTRAP_ADMIN_*; da gjelder
 * vernets tak (høyst seks forløp, pause mellom dem, ingen nye forsøk) og
 * kjøringen stopper ved første tegn på overbelastning.
 *
 * Uten id kjøres alle forløpene, ett om gangen, i en ny nettleserkontekst hver
 * med innloggingen fra den første. Resultatene skrives til
 * mappen i P0_UT (standard `p0-utdata/`, ikke i git). Kommandoen avslutter med
 * status 1 hvis minst ett forløp feilet, slik at en ufullstendig kjøring ikke
 * kan forveksles med en fullført.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { apneTestmiljo, Teststopp } from '../src/__tests__/qa/testmiljo'

const miljo = await apneTestmiljo()
const URL_ = miljo.url
const UT = process.env.P0_UT ?? 'p0-utdata'
const FORLOP = JSON.parse(readFileSync(new URL('./verktoy-p0-forlop.json', import.meta.url), 'utf8')).forlop

/** Venter til siden er ferdig med å hente preparatene og beregne. */
async function vent(p) {
  await p.waitForTimeout(600)
  await p.waitForSelector('text=/Henter preparatene|Kontrollerer/', { state: 'detached', timeout: 60_000 }).catch(() => undefined)
  await p.waitForTimeout(600)
}

/** Planpanelet viser et endelig stopp: klinikeren får ingen plan uansett hvordan resten besvares. */
const harStoppet = async (p) => /^Ingen plan/m.test(await p.locator('.planpanel').innerText())

/** Synlig tekst i hele verktøyet (spørsmål, svaralternativer, meldinger og planpanelet). */
const sidetekst = async (p) => p.locator('main').first().innerText().catch(() => p.locator('body').innerText())

/**
 * Svarene klinikeren gir: forløpets egne der teksten passer, ellers det trygge svaret («Gjelder ikke», «Nei», «Ja» på bekreftelser).
 * Stopper så snart planpanelet viser et endelig stopp, så handlingene telles til
 * utfallet og ikke til et ferdig utfylt skjema.
 */
async function svarAlle(p, svar, logg) {
  let n = 0
  for (let endret = true; endret; ) {
    endret = false
    if (await harStoppet(p)) {
      logg.push('(planpanelet viser et endelig stopp; resten av spørsmålene besvares ikke)')
      break
    }
    const sporsmal = await p.$$eval('li[data-flytsporsmal]', (ls) =>
      ls.map((l) => ({
        id: l.dataset.flytsporsmal,
        tekst: (l.querySelector('[id]')?.innerText || l.innerText).split('\n')[0].trim(),
        alt: [...l.querySelectorAll('input')].map((i) => ({ type: i.type, lab: i.closest('label')?.innerText.trim(), valgt: i.checked })),
      })),
    )
    for (const s of sporsmal) {
      if (s.alt.some((a) => a.valgt)) continue
      const regel = (svar ?? []).find(([re]) => new RegExp(re, 'i').test(s.tekst))
      if (s.alt[0]?.type === 'checkbox') {
        if (regel?.[1] === 'nei') continue
        await p.locator(`li[data-flytsporsmal="${s.id}"] input[type=checkbox]`).first().check()
        logg.push(`☑ ${s.tekst}`)
      } else {
        const lab = s.alt.map((a) => a.lab)
        const valg = regel?.[1] ?? (lab.includes('Ikke ennå') ? 'Ja' : lab.includes('Gjelder ikke') ? 'Gjelder ikke' : 'Nei')
        const i = lab.indexOf(valg)
        if (i < 0) throw new Error(`Fant ikke «${valg}» blant ${lab.join('/')} for «${s.tekst}».`)
        await p.locator(`li[data-flytsporsmal="${s.id}"] input[type=radio]`).nth(i).click()
        logg.push(`• ${s.tekst} → ${valg} [${lab.join('/')}]`)
      }
      n++
      endret = true
      await vent(p)
      break
    }
  }
  return n
}

async function kjor(f) {
  const mobil = f.mobil === true
  // Logget inn; den forrige konteksten lukkes, så bare én er åpen om gangen.
  const p = await miljo.side(mobil ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } : {})
  const navn = join(UT, f.id)
  const logg = []
  let handlinger = 0
  const gjort = async (beskrivelse) => {
    handlinger++
    logg.push(beskrivelse)
    await vent(p)
  }
  await p.goto(`${URL_}/#/verktoy/${f.verktoy}`, { waitUntil: 'networkidle' })
  await p.getByRole('combobox').first().waitFor({ timeout: 30_000 })
  await vent(p)
  const versjon = (await p.locator('body').innerText()).match(/v(\d+\.\d+\.\d+)/)?.[1]

  // Steg 1: virkestoffene (skrevet inn) eller en snarvei («Kan beregnes nå»).
  for (const [felt, verdi] of f.stoff ?? []) {
    if (felt === 'snarvei') {
      await p.getByRole('button', { name: verdi, exact: true }).first().click()
      await gjort(`snarvei «${verdi}»`)
    } else {
      await p.getByRole('combobox', { name: new RegExp(felt, 'i') }).fill(verdi)
      await p.keyboard.press('Enter')
      await gjort(`${felt}: ${verdi}`)
    }
  }
  // Steg 2: doser og legemiddelform.
  for (const [felt, verdi] of f.felt ?? []) {
    await p.getByRole('textbox', { name: new RegExp(felt, 'i') }).first().fill(verdi)
    await gjort(`${felt}: ${verdi}`)
  }
  for (const form of f.form ?? []) {
    const r = p.getByRole('radio', { name: form, exact: true })
    if ((await r.count()) === 0) logg.push(`(siden spør ikke om legemiddelform «${form}»)`)
    else {
      await r.first().click()
      await gjort(`legemiddelform: ${form}`)
    }
  }
  // Steg 3: spørsmålene om pasienten.
  handlinger += await svarAlle(p, f.svar, logg)
  for (const [felt, verdi] of f.tilpass ?? []) {
    await p.locator('summary', { hasText: 'Tilpass planen' }).click()
    await p.getByRole('textbox', { name: new RegExp(felt, 'i') }).first().fill(verdi)
    await gjort(`Tilpass planen, ${felt}: ${verdi}`)
  }
  await vent(p)
  const forPlan = await p.locator('.planpanel').innerText()
  const forSide = await sidetekst(p)
  await p.locator('.planpanel').screenshot({ path: `${navn}-panel.png` })
  for (const [tekst, fil] of f.bilder ?? []) await p.locator('li[data-flytsporsmal]', { hasText: new RegExp(tekst) }).first().screenshot({ path: `${navn}-${fil}.png` })
  await p.screenshot({ path: `${navn}-steg3.png`, fullPage: true })

  // Steg 4: dosevalgene planen ber om. Har hvert trinn bare én dose, godtas de samlet med ett trykk (spor B);
  // ellers ett om gangen (den første dosen som tilbys).
  const dosevalg = []
  const samlet = p.locator('[data-entydige]')
  if ((await samlet.count()) > 0) {
    const doser = await samlet.locator('li').allInnerTexts()
    await samlet.getByRole('button', { name: 'Bruk disse dosene' }).click()
    dosevalg.push(...doser.map((d) => `${d} (samlet, ett alternativ)`))
    await gjort(`godtok ${doser.length} dosevalg med ett alternativ hvert, med ett trykk`)
  }
  for (let n = 0; n < 30; n++) {
    const region = p.getByRole('region', { name: 'Doser som kan velges' })
    if ((await region.count()) === 0) break
    const knapper = region.getByRole('group').first().getByRole('button')
    const tilbudt = await knapper.allInnerTexts()
    await knapper.first().click()
    dosevalg.push(`${tilbudt[0]} (tilbudt: ${tilbudt.join(' | ')})`)
    await gjort(`dosevalg ${n + 1}: ${tilbudt[0]} av ${tilbudt.length} mulige`)
  }
  await p.screenshot({ path: `${navn}.png`, fullPage: true })
  const plan = await p.locator('.planpanel').innerText()
  const side = await sidetekst(p)
  let kopi = ''
  const kopier = p.getByRole('button', { name: 'Kopier planen' })
  if ((await kopier.count()) > 0) {
    await kopier.click()
    await p.waitForTimeout(500)
    kopi = await p.evaluate(() => navigator.clipboard.readText())
  }
  if (f.utskrift && kopi) {
    await p.emulateMedia({ media: 'print' })
    await p.pdf({ path: `${navn}.pdf`, format: 'A4' })
  }
  const utfall = /Komplett plan til sluttmålet/.test(plan) ? 'komplett plan' : /Ingen plan|kan ikke lage en plan/.test(plan) ? 'stopp' : 'annet'
  const sammendrag = { id: f.id, hva: f.hva, versjon, utfall, handlinger, dosevalg: dosevalg.length, skjermtegn: plan.length, kopitegn: kopi.length, overskrift: plan.split('\n').filter(Boolean).slice(1, 3).join(' / ') }
  writeFileSync(
    `${navn}.md`,
    [`# ${f.id}: ${f.hva}`, '', '```json', JSON.stringify(sammendrag, null, 2), '```', '', '## Handlinger', ...logg.map((l) => `- ${l}`), '', '## Planpanelet før dosevalg', '```', forPlan, '```', '', '## Planpanelet til slutt', '```', plan, '```', '', '## Hele siden før dosevalg', '```', forSide, '```', '', '## Hele siden til slutt', '```', side, '```', '', `## Kopien (${kopi.length} tegn)`, '```', kopi, '```', ''].join('\n'),
  )
  return sammendrag
}

const valgte = process.argv.slice(2)
mkdirSync(UT, { recursive: true })
const resultater = []
let stoppet = null
for (const f of FORLOP.filter((x) => valgte.length === 0 || valgte.includes(x.id))) {
  try {
    // Vernet: taket på forløp og pausen i produksjon, og stopp ved overbelastning.
    await miljo.forlop()
  } catch (e) {
    if (!(e instanceof Teststopp)) throw e
    stoppet = e.message
    break
  }
  try {
    const r = await kjor(f)
    resultater.push(r)
    console.log(JSON.stringify(r))
  } catch (e) {
    console.log(JSON.stringify({ id: f.id, feil: String(e).split('\n')[0] }))
    resultater.push({ id: f.id, feil: String(e).split('\n')[0] })
  }
}
const trafikk = await miljo.avslutt()
// Vernet kan ha stoppet kjøringen under det siste forløpet, uten at et nytt forløp ble forsøkt.
stoppet ??= trafikk.stoppet && `Kjøringen er stoppet: ${trafikk.stoppet}.`
writeFileSync(join(UT, 'sammendrag.json'), JSON.stringify({ kjort: new Date().toISOString(), app: URL_, modus: miljo.modus, trafikk, stoppet, resultater }, null, 2))
if (stoppet) {
  console.error(stoppet)
  process.exitCode = 1
}
const feilet = resultater.filter((r) => r.feil).map((r) => r.id)
if (feilet.length > 0) {
  console.error(`${feilet.length} av ${resultater.length} forløp feilet: ${feilet.join(', ')}`)
  process.exitCode = 1
}
