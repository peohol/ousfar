/**
 * Nettleserkontrollen av fortolkningen av benzoylekgonin i urin (#562, #570,
 * docs/benzoylekgonin-urin.md). I det lokale testmiljøet
 * (docs/qa-testmiljo.md):
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/benzoylekgoninnettleser.ts
 *
 * Den lokale databasen er bygd av migrasjonene, så modulen er aktivert som i
 * produksjonen: metoden URUS og koden UBEZ (20261124143000_be_urin_aktivering.sql)
 * og modellen av form 2 med fem profiler (20261125121500_be_urin_fem_profiler.sql)
 * i OUS Klinisk farmakologi. B1–B6 bytter den en stund ut med form-1-modellen
 * som var aktivert før (`ous-kf-2026-11-24`), siden appen fortsatt kan lese
 * den, og setter den aktiverte tilbake. B7–B12 prøver den aktiverte modellen.
 * Prøveverdiene er oppdiktede.
 */
import { SAMME_DAG_FEIL } from '../../domain/beUrinMotor'
import { FORM1_AKTIVERT, PROFILMODELL } from '../../domain/__tests__/hjelp/beUrinTestmodell'
import { krev, lagKontroll, vent, type Side } from './kontroll'
import { lokalSql, sikreAdministrator, startLokalDatabase } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('benzoylekgonin')
const PC = { viewport: { width: 1440, height: 1000 } }
const MOBIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
const KODE = 'UBEZ'

const s = await startLokalDatabase()
await sikreAdministrator(s)

const miljo = await apneTestmiljo()

async function apne(side: Side) {
  await side.goto(`${miljo.url}/#/fortolkning`)
  const sok = side.getByRole('combobox', { name: 'Søk etter analytt eller kode' }).or(side.getByLabel('Søk etter analytt eller kode')).first()
  await sok.waitFor({ timeout: 30_000 })
  await sok.fill('kokain')
  // Serumoppføringen (BEZ1) og urinoppføringen er to treff med hvert sitt navn.
  await side.getByRole('button', { name: /Benzoylekgonin i urin/ }).waitFor({ timeout: 30_000 })
  krev((await side.getByRole('button', { name: /BEZ1/ }).count()) === 1, 'serumoppføringen mangler i søket')
  await side.getByRole('button', { name: new RegExp(KODE) }).first().click()
  await side.getByRole('group', { name: 'Forrige prøve' }).waitFor({ timeout: 30_000 })
}

async function fyll(side: Side, gruppe: string, be: string, kreatinin: string, dato: string) {
  const g = side.getByRole('group', { name: gruppe })
  await g.getByLabel(/^Benzoylekgonin/).fill(be)
  await g.getByLabel(/^Kreatinin/).fill(kreatinin)
  await g.getByLabel('Prøvedato').fill(dato)
}

const resultat = (side: Side): Promise<string> => side.locator('.thc-resultat').innerText()

const OUS = `(select id from public.fagmiljoer where navn = 'OUS Klinisk farmakologi')`
const [aktivertVersjon, aktivertJson] = lokalSql(
  s,
  `select versjon || chr(31) || modell::text from public.be_urin_modeller where fagmiljo_id = ${OUS}`,
).split('\u001f')
const settModell = (versjon: string, json: string) =>
  lokalSql(
    s,
    `delete from public.be_urin_modeller where fagmiljo_id = ${OUS};
     insert into public.be_urin_modeller (fagmiljo_id, versjon, modell) values (${OUS}, '${versjon}', $j$${json}$j$::jsonb);`,
  )

try {
  krev(aktivertVersjon === 'ous-kf-2026-11-25', `den aktiverte modellen er ${aktivertVersjon}`)
  // Samme innhold som den bestilte modellen i testene, uansett rekkefølgen på nøklene.
  const kanonisk = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(kanonisk)
      : v && typeof v === 'object'
        ? Object.fromEntries(Object.entries(v).sort(([x], [y]) => (x < y ? -1 : 1)).map(([k, x]) => [k, kanonisk(x)]))
        : v
  const somBestilt = { ...(JSON.parse(aktivertJson!) as object), versjon: PROFILMODELL.versjon }
  krev(JSON.stringify(kanonisk(somBestilt)) === JSON.stringify(kanonisk(PROFILMODELL)), 'den aktiverte modellen er ikke den bestilte')
  settModell(FORM1_AKTIVERT.versjon, JSON.stringify(FORM1_AKTIVERT))
  try {
    const pc: Side = paa(await miljo.side(PC))

    await punkt('B1 PC: søk, felt, Q og resultatet med merkingen, uten kopiering', async () => {
      paa(pc)
      await apne(pc)
      await fyll(pc, 'Forrige prøve', '50', '2', '2026-01-01')
      await fyll(pc, 'Denne prøven', '60', '2', '2026-01-04')
      const q = await pc.getByRole('group', { name: 'Forrige prøve' }).getByRole('status').innerText()
      krev(q === 'Q (benzoylekgonin/kreatinin): 25', `Q: ${q}`)
      krev((await pc.getByRole('group', { name: 'Forrige prøve' }).getByLabel('Benzoylekgonin', { exact: true }).count()) === 1, 'feltet har en enhet')
      const r = await resultat(pc)
      krev(r.includes('Tentativ modell – ikke klinisk validert.'), 'merkingen mangler')
      krev(r.includes('Nytt inntak.'), `resultatet: ${r}`)
      krev(r.includes('Vurder høyere sikkerhetsmargin'), 'forslaget om høyere margin mangler')
      krev((await pc.getByRole('button', { name: /Kopier/ }).count()) === 0, 'det finnes en kopieringsknapp')
      krev((await pc.locator('svg.thc-plot__figur polyline').count()) === 2, 'figuren har ikke to profiler')
      await bilde(pc, '01-resultat-pc')
      return 'Nytt inntak., banner, to profiler'
    })

    await punkt('B2 PC: alle marginer, og «Bruk 99 %» gir et mildere resultat', async () => {
      paa(pc)
      await pc.getByText('Visualiser med alle sikkerhetsmarginer').click()
      await vent(300)
      krev((await pc.locator('.thc-marginpunkter__punkt').count()) === 3, 'ikke tre punkter')
      await bilde(pc, '02-alle-marginer-pc')
      await pc.getByRole('button', { name: 'Bruk 99 % sikkerhetsmargin' }).click()
      const r = await resultat(pc)
      krev(r.includes('Kan ikke fastslås.'), `etter 99 %: ${r}`)
      return 'tre punkter; 99 % gir «Kan ikke fastslås.»'
    })

    await punkt('B3 PC: Enter og mellomrom gjør ingenting', async () => {
      paa(pc)
      const for_ = await resultat(pc)
      await pc.getByRole('group', { name: 'Denne prøven' }).getByLabel(/^Kreatinin/).focus()
      await pc.keyboard.press('Enter')
      await pc.keyboard.press(' ')
      krev((await resultat(pc)) === for_, 'resultatet endret seg')
      await pc.keyboard.press('Tab')
      const fokus = await pc.evaluate(() => document.activeElement?.getAttribute('type') ?? document.activeElement?.tagName)
      return `uendret; Tab til ${fokus}`
    })

    await punkt('B4 PC: samlet vurdering med en eldre prøve', async () => {
      paa(pc)
      await pc.getByRole('button', { name: 'Nullstill' }).click()
      await pc.getByLabel('Samlet vurdering med enda tidligere prøver').check()
      await fyll(pc, 'Forrige prøve', '50', '2', '2026-01-10')
      await fyll(pc, 'Denne prøven', '36', '2', '2026-01-13')
      await fyll(pc, 'Tidligere prøve', '26', '2', '2026-01-09')
      const r = await resultat(pc)
      krev(r.includes('Kan ikke fastslås.') && r.includes('Nytt inntak etter 09.01.2026 (modellindikasjon)'), `resultatet: ${r}`)
      await bilde(pc, '03-samlet-pc')
      return 'hovedresultatet står, treffet vises for seg'
    })

    await punkt('B5 PC: samme dag og mørkt tema', async () => {
      paa(pc)
      await pc.getByRole('button', { name: 'Nullstill' }).click()
      await fyll(pc, 'Forrige prøve', '50', '2', '2026-01-10')
      await fyll(pc, 'Denne prøven', '40', '2', '2026-01-10')
      const r = await resultat(pc)
      krev(r.includes('Prøvene har samme dato.'), `resultatet: ${r}`)
      krev((await pc.locator('svg.thc-plot__figur').count()) === 0, 'figur samme dag')
      await pc.emulateMedia({ colorScheme: 'dark' })
      await fyll(pc, 'Denne prøven', '30', '2', '2026-01-14')
      await vent(300)
      await bilde(pc, '04-moerkt-pc')
      await pc.emulateMedia({ colorScheme: 'light' })
      return 'ingen figur samme dag'
    })

    await punkt('B6 mobil: alt får plass uten sideveis rulling', async () => {
      const side: Side = paa(await miljo.side(MOBIL))
      await apne(side)
      await fyll(side, 'Forrige prøve', '50', '2', '2026-01-01')
      await fyll(side, 'Denne prøven', '60', '2', '2026-01-04')
      const [bredde, vindu] = await side.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
      krev(bredde <= vindu, `siden er ${bredde} px bred i et vindu på ${vindu} px`)
      await bilde(side, '05-mobil')
      await side.locator('svg.thc-plot__figur').scrollIntoViewIfNeeded()
      await bilde(side, '06-mobil-figur')
      return `${bredde} px av ${vindu}`
    })

  } finally {
    settModell(aktivertVersjon!, aktivertJson!)
  }

  /* --- Form 2: den aktiverte modellen med fem profiler (#570) -------------- */

  {
    const p2: Side = paa(await miljo.side(PC))

    await punkt('B7 PC, form 2: marginsetningen, gradene og de to vurderingene, uten merking og kopiering', async () => {
      paa(p2)
      await apne(p2)
      await fyll(p2, 'Forrige prøve', '200', '2', '2026-01-01')
      await fyll(p2, 'Denne prøven', '200', '2', '2026-01-02')
      const r = await resultat(p2)
      krev(r.includes('Konsentrasjonsendringene er justert for måleusikkerhet med 90 % sikkerhetsmargin.'), `resultatet: ${r}`)
      krev(r.includes('Sporadisk bruk lagt til grunn') && r.includes('Kronisk bruk lagt til grunn'), 'kortene mangler')
      krev(r.includes('Det er sannsynlig at et nytt inntak har skjedd.'), `sporadisk: ${r}`)
      krev(!/tentativ/i.test(r), 'merkingen om tentativ modell står der')
      krev((await p2.getByRole('button', { name: /Kopier/ }).count()) === 0, 'det finnes en kopieringsknapp')
      krev((await p2.locator('svg.thc-plot__figur polyline').count()) === 5, 'figuren har ikke fem profiler')
      const [a, b] = await p2.locator('.be-vurdering').evaluateAll((k: Element[]) => k.map((e) => e.getBoundingClientRect().top))
      krev(a === b, 'kortene står ikke side om side på PC')
      await bilde(p2, '07-form2-resultat-pc')
      await p2.locator('svg.thc-plot__figur').scrollIntoViewIfNeeded()
      await bilde(p2, '08-form2-figur-pc')
      return 'sannsynlig / uavklart, fem profiler, kortene side om side'
    })

    await punkt('B8 PC, form 2: alle marginer og «Bruk 99 %»', async () => {
      paa(p2)
      await p2.getByText('Visualiser med alle sikkerhetsmarginer').click()
      await vent(300)
      krev((await p2.locator('.thc-marginpunkter__punkt').count()) === 3, 'ikke tre punkter')
      await bilde(p2, '09-form2-alle-marginer-pc')
      await p2.getByRole('button', { name: 'Bruk 99 % sikkerhetsmargin' }).click()
      const r = await resultat(p2)
      krev(r.includes('forenlig med utskillelse etter gjentatte doser'), `etter 99 %: ${r}`)
      return '99 % gir «forenlig med gjentatte doser» ved sporadisk bruk'
    })

    await punkt('B9 PC, form 2: beregningen med R, F og enhetene', async () => {
      paa(p2)
      await p2.getByText('Beregningen').click()
      const t = await p2.locator('details').filter({ hasText: 'Profilene' }).innerText()
      krev(t.includes('nmol/mmol') && t.includes('F = R') && t.includes('Ekstrem utskillelse: bieksponentiell'), `beregningen: ${t}`)
      await bilde(p2, '10-form2-beregning-pc')
      return 'R, F og enhetene står'
    })

    await punkt('B10 PC, form 2: samme dag sammenlignes ikke, og mørkt tema', async () => {
      paa(p2)
      await p2.getByRole('button', { name: 'Nullstill' }).click()
      await fyll(p2, 'Forrige prøve', '200', '2', '2026-01-10')
      await fyll(p2, 'Denne prøven', '300', '2', '2026-01-10')
      const r = await resultat(p2)
      krev(r.includes(SAMME_DAG_FEIL) && !r.includes('Sporadisk bruk lagt til grunn'), `samme dag: ${r}`)
      krev((await p2.locator('svg.thc-plot__figur').count()) === 0, 'figur samme dag')
      await p2.emulateMedia({ colorScheme: 'dark' })
      await fyll(p2, 'Denne prøven', '60', '2', '2026-01-20')
      await vent(300)
      await bilde(p2, '11-form2-moerkt-pc')
      await p2.locator('svg.thc-plot__figur').scrollIntoViewIfNeeded()
      await bilde(p2, '12-form2-moerkt-figur-pc')
      await p2.emulateMedia({ colorScheme: 'light' })
      return 'samme dag sammenlignes ikke; mørkt tema'
    })

    await punkt('B11 PC, form 2: nær −100 % etter et langt tidsrom', async () => {
      paa(p2)
      await fyll(p2, 'Denne prøven', '2', '2', '2026-03-01')
      await vent(300)
      krev((await p2.locator('svg.thc-plot__figur polyline').count()) === 5, 'ikke fem profiler')
      await p2.locator('svg.thc-plot__figur').scrollIntoViewIfNeeded()
      await bilde(p2, '13-form2-langt-tidsrom-pc')
      return 'figuren tegnes'
    })

    await punkt('B12 mobil, form 2: kortene under hverandre, uten sideveis rulling', async () => {
      const side: Side = paa(await miljo.side(MOBIL))
      await apne(side)
      await fyll(side, 'Forrige prøve', '200', '2', '2026-01-01')
      await fyll(side, 'Denne prøven', '200', '2', '2026-01-02')
      const [bredde, vindu] = await side.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
      krev(bredde <= vindu, `siden er ${bredde} px bred i et vindu på ${vindu} px`)
      await side.locator('.be-vurderinger').scrollIntoViewIfNeeded()
      await bilde(side, '14-form2-mobil-kort')
      await side.locator('svg.thc-plot__figur').scrollIntoViewIfNeeded()
      await bilde(side, '15-form2-mobil-figur')
      return `${bredde} px av ${vindu}`
    })
  }
} catch (e) {
  oppsettFeilet(e)
} finally {
  await miljo.avslutt()
}
rapport()
