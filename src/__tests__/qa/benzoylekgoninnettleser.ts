/**
 * Nettleserkontrollen av den tentative fortolkningen av benzoylekgonin i urin
 * (#562, docs/benzoylekgonin-urin.md). I det lokale testmiljøet
 * (docs/qa-testmiljo.md):
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/benzoylekgoninnettleser.ts
 *
 * Modulen er ikke aktivert, så kontrollen legger selv inn en SYNTETISK modell
 * (de bestilte kurvene, oppdiktede enheter og CV-er) og en syntetisk
 * katalogoppføring i OUS Klinisk farmakologi i den lokale databasen, og tar
 * dem bort igjen til slutt.
 */
import { SYNTETISK_MODELL } from '../../domain/__tests__/hjelp/beUrinTestmodell'
import { krev, lagKontroll, vent, type Side } from './kontroll'
import { lokalSql, sikreAdministrator, startLokalDatabase } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('benzoylekgonin')
const PC = { viewport: { width: 1440, height: 1000 } }
const MOBIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
const NOKKEL = 'be-urin-qa'
const KODE = 'QABEU'

const s = await startLokalDatabase()
await sikreAdministrator(s)
const ous = `(select id from public.fagmiljoer where navn = 'OUS Klinisk farmakologi')`
const rydd = () =>
  lokalSql(
    s,
    `delete from public.analyttkatalog_oppforinger where nokkel = '${NOKKEL}'; delete from public.be_urin_modeller where versjon = '${SYNTETISK_MODELL.versjon}';`,
  )
rydd()
lokalSql(
  s,
  `insert into public.be_urin_modeller (fagmiljo_id, versjon, modell) values (${ous}, '${SYNTETISK_MODELL.versjon}', '${JSON.stringify(SYNTETISK_MODELL)}'::jsonb);
   insert into public.analyttkatalog_oppforinger (fagmiljo_id, nokkel, posisjon, type, navn, visningsnavn, gruppe, analysemetode, maleomrade, aliaser)
     values (${ous}, '${NOKKEL}', 900000, 'be_urin', 'Benzoylekgonin i urin', 'Benzoylekgonin i urin (QA)', 'Rusmiddelanalyse', 'UCAK', '{"tekst":"","deler":[]}', '{kokain}');
   insert into public.analyttkatalog_koder (fagmiljo_id, nokkel, posisjon, kode, navn) values (${ous}, '${NOKKEL}', 0, '${KODE}', 'Benzoylekgonin');`,
)

const miljo = await apneTestmiljo()

async function apne(side: Side) {
  await side.goto(`${miljo.url}/#/fortolkning`)
  const sok = side.getByRole('combobox', { name: 'Søk etter analytt eller kode' }).or(side.getByLabel('Søk etter analytt eller kode')).first()
  await sok.waitFor({ timeout: 30_000 })
  await sok.fill('kokain')
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

try {
  const pc: Side = paa(await miljo.side(PC))

  await punkt('B1 PC: søk, felt, Q og resultatet med merkingen, uten kopiering', async () => {
    paa(pc)
    await apne(pc)
    await fyll(pc, 'Forrige prøve', '50', '2', '2026-01-01')
    await fyll(pc, 'Denne prøven', '52,5', '2', '2026-01-04')
    const q = await pc.getByRole('group', { name: 'Forrige prøve' }).getByRole('status').innerText()
    krev(q.includes('25 enhet Q'), `Q: ${q}`)
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
    await fyll(side, 'Denne prøven', '52,5', '2', '2026-01-04')
    const [bredde, vindu] = await side.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
    krev(bredde <= vindu, `siden er ${bredde} px bred i et vindu på ${vindu} px`)
    await bilde(side, '05-mobil')
    await side.locator('svg.thc-plot__figur').scrollIntoViewIfNeeded()
    await bilde(side, '06-mobil-figur')
    return `${bredde} px av ${vindu}`
  })
} catch (e) {
  oppsettFeilet(e)
} finally {
  await miljo.avslutt()
  rydd()
}
rapport()
