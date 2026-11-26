/**
 * Nettleserkontrollen av fortolkningen av benzoylekgonin i urin (#562, #570,
 * #576, docs/benzoylekgonin-urin.md). I det lokale testmiljøet
 * (docs/qa-testmiljo.md):
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/benzoylekgoninnettleser.ts
 *
 * Den lokale databasen er bygd av migrasjonene, så modulen er aktivert som i
 * produksjonen: metoden URUS og koden UBEZ (20261124143000_be_urin_aktivering.sql)
 * og modellen av form 2 med fem profiler (20261125121500_be_urin_fem_profiler.sql)
 * i OUS Klinisk farmakologi. B1–B6 bytter den en stund ut med form-1-modellen
 * som var aktivert før (`ous-kf-2026-11-24`), siden appen fortsatt kan lese
 * den, og setter den aktiverte tilbake. B7–B14 prøver den aktiverte modellen:
 * at en vanlig fortolkning får plass på én PC-skjerm, de nye konklusjonene,
 * høyere margin, tastaturet, informasjonstegnet, profilene og figuren,
 * forklaringen, de tidligere prøvene, feil ved feltet, samme dag, mørkt tema
 * og mobil.
 * Prøveverdiene er oppdiktede.
 */
import { SAMME_DAG_FEIL } from '../../domain/beUrinMotor'
import { FORM1_AKTIVERT, PROFILMODELL } from '../../domain/__tests__/hjelp/beUrinTestmodell'
import { krev, lagKontroll, vent, type Side } from './kontroll'
import { lokalSql, sikreAdministrator, startLokalDatabase } from './lokalmiljo'
import { seksjonsluft, somLuft } from './seksjonsluft'
import { marginbobler, somTekst } from './marginbobler'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('benzoylekgonin')
const PC = { viewport: { width: 1440, height: 900 } }
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
      krev(q === 'Kreatinin-normalisert konsentrasjon 25', `den kreatinin-normaliserte konsentrasjonen: ${q}`)
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
      await pc.getByRole('button', { name: '+ Legg til tidligere prøve' }).click()
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

  /* --- Form 2: den aktiverte modellen med fem profiler (#570, #576) ------ */

  {
    const p2: Side = paa(await miljo.side(PC))
    const tekst = (side: Side): Promise<string> => side.locator('main').innerText()
    const vurdering = (side: Side, navn: string) => side.getByRole('region', { name: navn })
    const konklusjon = (side: Side, navn: string) => vurdering(side, navn).locator('.be-vurdering__konklusjon').innerText()
    const ingenEkstrapolasjon = async (side: Side) =>
      krev(!/ekstrapol|startverdi|ikke dokumentert/i.test(await side.locator('body').innerText()), 'det står noe om ekstrapolasjon')

    await punkt('B7 PC, form 2: vurderingene først, korte, side om side, og alt på én skjerm', async () => {
      paa(p2)
      await apne(p2)
      await fyll(p2, 'Forrige prøve', '200', '2', '2026-01-01')
      await fyll(p2, 'Denne prøven', '200', '2', '2026-01-02')
      krev((await konklusjon(p2, 'Sporadisk bruk lagt til grunn')) === 'Sannsynlig nytt inntak.', 'sporadisk')
      krev((await konklusjon(p2, 'Kronisk bruk lagt til grunn')) === 'Nytt inntak kan ikke fastslås.', 'kronisk')
      // Det en høyere margin gir, står i en snakkeboble ved marginen (#588), ikke ved vurderingen.
      const mildere = somTekst(await marginbobler(p2))
      krev(mildere === 'over 99 %: Sporadisk: Kan ikke fastslås – forenlig med gjentatte doser', `boblene: ${mildere}`)
      krev(!(await p2.locator('.be-vurderinger').innerText()).includes('sikkerhetsmargin'), 'det står en tekst om marginen ved vurderingen')
      const t = await tekst(p2)
      krev(!/tentativ|Konsentrasjonsendringene|Vurder høyere sikkerhetsmargin|Hva er sikkerhetsmarginen/i.test(t), `gammel tekst: ${t}`)
      krev((await p2.getByRole('note').count()) === 0, 'det står et banner')
      krev((await p2.getByRole('button', { name: /Kopier/ }).count()) === 0, 'det finnes en kopieringsknapp')
      const [a, b] = await p2.locator('.be-vurdering').evaluateAll((k: Element[]) => k.map((e) => e.getBoundingClientRect().top))
      krev(a === b, 'vurderingene står ikke side om side på PC')
      const [forrige, denne] = await p2.locator('.be-prove').evaluateAll((k: Element[]) => k.map((e) => e.getBoundingClientRect().top))
      krev(forrige === denne, 'prøvene står ikke side om side på PC')
      // Et femsifret tall og enheten får plass i feltet.
      const felt = p2.getByRole('group', { name: 'Denne prøven' }).getByLabel(/^Benzoylekgonin/)
      await felt.fill('12345')
      const [innhold, synlig] = await felt.evaluate((e: HTMLInputElement) => [e.scrollWidth, e.clientWidth])
      krev(innhold! <= synlig!, `«12345» får ikke plass: ${innhold} av ${synlig} px`)
      await felt.fill('200')
      // Vurderingene og forbeholdet får plass uten rulling; profilene og figuren,
      // som alltid står åpne (#592), følger under.
      const bunn = await p2.locator('.be-forbehold').evaluate((e: Element) => e.getBoundingClientRect().bottom + window.scrollY)
      const hoyde = await p2.evaluate(() => window.innerHeight)
      krev(bunn <= hoyde, `vurderingene slutter ${Math.round(bunn)} px ned i et vindu på ${hoyde} px`)
      await p2.locator('body').click({ position: { x: 5, y: 600 } })
      await vent(300)
      await bilde(p2, '07-form2-resultat-pc')
      return `sannsynlig / kan ikke fastslås; slutter ${Math.round(bunn)} av ${hoyde} px`
    })

    await punkt('B8 PC, form 2: tastaturet, informasjonstegnet og 99 % sikkerhetsmargin', async () => {
      paa(p2)
      // Fra datoen i denne prøven (der Tab først går gjennom dag, måned og år) til
      // «+ Legg til tidligere prøve», så til informasjonstegnet.
      await p2.getByRole('group', { name: 'Denne prøven' }).getByLabel('Prøvedato').focus()
      let knapp: string | undefined
      for (let i = 0; i < 4 && knapp !== '+ Legg til tidligere prøve'; i++) {
        await p2.keyboard.press('Tab')
        knapp = await p2.evaluate(() => (document.activeElement?.tagName === 'BUTTON' ? document.activeElement.textContent?.trim() : undefined))
      }
      krev(knapp === '+ Legg til tidligere prøve', `Tab gikk til ${knapp}`)
      await p2.keyboard.press('Tab')
      const info = await p2.evaluate(() => document.activeElement?.getAttribute('aria-label'))
      krev(info === 'Om sikkerhetsmarginen', `Tab gikk til ${info}`)
      await vent(300)
      const boble = await p2.locator('.tipsboble__innhold').innerText()
      krev(boble.includes('Marginen gjelder bare måleusikkerheten'), `boblen: ${boble}`)
      await bilde(p2, '08-form2-info-pc')
      await p2.keyboard.press('Tab')
      const rolle = await p2.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.getAttribute('type'))
      await p2.keyboard.press('ArrowRight')
      await vent(200)
      krev(
        (await vurdering(p2, 'Sporadisk bruk lagt til grunn').innerText()).includes('forenlig med utskillelse etter gjentatte doser'),
        'pil høyre ga ikke 99 %',
      )
      krev((await marginbobler(p2)).length === 0, 'det står fortsatt en boble om en høyere margin')
      await p2.keyboard.press('ArrowLeft')
      return `Tab: felt → legg til → info (boblen vises) → ${rolle}; pil høyre gir 99 %`
    })

    await punkt('B9 PC, form 2: profiltabellen og figuren alltid åpne, uten overskrift, og alle marginer', async () => {
      paa(p2)
      const seksjon = p2.locator('.be-profiler')
      krev((await p2.getByText('Utskillelsesprofiler og figur').count()) === 0, 'overskriften står')
      krev((await seksjon.locator('xpath=ancestor::details').count()) === 0, 'profilene ligger i en skuff')
      krev((await seksjon.locator('tbody tr:not(.be-profiltabell__gruppe)').count()) === 5, 'ikke fem rader')
      krev((await seksjon.locator('svg.thc-plot__figur polyline').count()) === 5, 'figuren har ikke fem profiler')
      await bilde(p2, '09-form2-profiler-pc', true)
      await seksjon.getByLabel('Vis alle sikkerhetsmarginer').check()
      await vent(300)
      krev((await seksjon.locator('.thc-marginpunkter__punkt').count()) === 3, 'ikke tre punkter')
      await bilde(p2, '10-form2-alle-marginer-pc', true)
      const luft = await seksjonsluft(p2)
      await seksjon.getByLabel('Vis alle sikkerhetsmarginer').uncheck()
      return `fem rader, fem kurver, tre punkter med alle marginer; ${somLuft(luft)}`
    })

    await punkt('B10 PC, form 2: forklaringen med de fire spørsmålene, uten formler', async () => {
      paa(p2)
      await p2.getByText('Forklaring', { exact: true }).click()
      await vent(700)
      const seksjon = p2.locator('details').filter({ hasText: 'Hvorfor blir konklusjonen slik?' })
      const overskrifter = await seksjon.locator('h3').allInnerTexts()
      krev(overskrifter.length === 4, `overskriftene: ${overskrifter.join(' | ')}`)
      const t = await seksjon.innerText()
      krev(!/=|√|\bln\b|\blog\b|\bSD\b|regresjon|bieksponentiell|ekstrapol/i.test(t), `formler: ${t}`)
      krev(t.includes('ikke et matematisk bevis'), 'forbeholdet om «Nytt inntak» mangler')
      const apen = await seksjonsluft(p2)
      await bilde(p2, '11-form2-forklaring-pc', true)
      await p2.getByText('Forklaring', { exact: true }).click()
      await vent(500)
      const lukket = await seksjonsluft(p2)
      return `${overskrifter.join(' | ')}; åpen: ${somLuft(apen)}; lukket: ${somLuft(lukket)}`
    })

    await punkt('B11 PC, form 2: tidligere prøve, indikasjonen under kronisk bruk, og feil ved feltet', async () => {
      paa(p2)
      await p2.getByRole('button', { name: '+ Legg til tidligere prøve' }).click()
      const fokus = await p2.evaluate(() => document.activeElement?.closest('fieldset')?.querySelector('legend')?.textContent)
      krev(fokus === 'Tidligere prøve', `fokuset står i ${fokus}`)
      await fyll(p2, 'Tidligere prøve', '100', '2', '2025-12-31')
      const kronisk = await vurdering(p2, 'Kronisk bruk lagt til grunn').innerText()
      krev(kronisk.includes('Sammenlignet med prøven fra 31.12.2025 er det indikasjon på nytt inntak etter den prøven'), kronisk)
      const bobler = somTekst(await marginbobler(p2))
      krev(
        bobler ===
          'over 99 %: Sporadisk: Kan ikke fastslås – forenlig med gjentatte doser / ' +
            'Kronisk: Kan ikke fastslås, uten indikasjon etter tidligere prøve',
        `boblene: ${bobler}`,
      )
      await p2.locator('body').click({ position: { x: 5, y: 600 } })
      await vent(300)
      await bilde(p2, '12-form2-tidligere-pc')
      await p2.getByRole('group', { name: 'Denne prøven' }).getByLabel(/^Kreatinin/).fill('0')
      await vent(200)
      krev((await p2.getByText('Må være over 0.').count()) === 1, 'feilen ved feltet mangler')
      krev((await p2.getByRole('region', { name: 'Kronisk bruk lagt til grunn' }).count()) === 0, 'vurdering med ugyldig felt')
      krev(!(await tekst(p2)).includes('Fyll inn'), 'det står en liste over det som mangler')
      await bilde(p2, '13-form2-ugyldig-pc')
      await p2.getByRole('button', { name: 'Fjern tidligere prøve' }).click()
      await p2.getByRole('group', { name: 'Denne prøven' }).getByLabel(/^Kreatinin/).fill('2')
      return 'indikasjonen står under kronisk bruk; feilen står ved feltet'
    })

    await punkt('B12 PC, form 2: samme dag sammenlignes ikke, og mørkt tema', async () => {
      paa(p2)
      await p2.getByRole('button', { name: 'Nullstill' }).click()
      await fyll(p2, 'Forrige prøve', '200', '2', '2026-01-10')
      await fyll(p2, 'Denne prøven', '300', '2', '2026-01-10')
      const feil = await p2.getByRole('alert').innerText()
      krev(feil === SAMME_DAG_FEIL, `samme dag: ${feil}`)
      krev((await p2.getByRole('region', { name: 'Sporadisk bruk lagt til grunn' }).count()) === 0, 'vurdering samme dag')
      await bilde(p2, '14-form2-samme-dag-pc')
      await p2.emulateMedia({ colorScheme: 'dark' })
      await fyll(p2, 'Denne prøven', '2000', '2', '2026-01-11')
      await vent(300)
      krev((await konklusjon(p2, 'Kronisk bruk lagt til grunn')) === 'Nytt inntak.', 'kronisk ved stor økning')
      await bilde(p2, '15-form2-moerkt-pc')
      await bilde(p2, '16-form2-moerkt-profiler-pc', true)
      await p2.emulateMedia({ colorScheme: 'light' })
      return 'samme dag sammenlignes ikke; «Nytt inntak.» i mørkt tema'
    })

    await punkt('B13 PC, form 2: ingen merknad om ekstrapolasjon, når den faktisk skjer og etter et svært langt tidsrom', async () => {
      paa(p2)
      // Q 150 (BE 300, kreatinin 2) ligger over startverdien til begge de bieksponentielle
      // profilene (om lag 111 og 120), så tersklene for treg og ekstrem er ekstrapolert.
      await fyll(p2, 'Forrige prøve', '300', '2', '2026-01-01')
      await fyll(p2, 'Denne prøven', '250', '2', '2026-01-03')
      await p2.getByText('Forklaring', { exact: true }).click()
      await vent(700)
      await ingenEkstrapolasjon(p2)
      await bilde(p2, '20-form2-over-startverdien-pc', true)
      await fyll(p2, 'Forrige prøve', '200', '2', '2025-01-01')
      await fyll(p2, 'Denne prøven', '200', '2', '2026-01-01')
      await vent(300)
      await ingenEkstrapolasjon(p2)
      return 'ingen, verken ved Q 150 eller etter et år'
    })

    for (const [navn, tema] of [
      ['B14 mobil, form 2: lyst tema, under hverandre, uten sideveis rulling', 'light'],
      ['B15 mobil, form 2: mørkt tema, og informasjonstegnet ved et trykk', 'dark'],
    ] as const) {
      await punkt(navn, async () => {
        const side: Side = paa(await miljo.side({ ...MOBIL, colorScheme: tema }))
        await apne(side)
        await fyll(side, 'Forrige prøve', '200', '2', '2026-01-01')
        await fyll(side, 'Denne prøven', '200', '2', '2026-01-02')
        const [bredde, vindu] = await side.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
        krev(bredde <= vindu, `siden er ${bredde} px bred i et vindu på ${vindu} px`)
        const [a, b] = await side.locator('.be-vurdering').evaluateAll((k: Element[]) => k.map((e) => e.getBoundingClientRect().top))
        krev(a! < b!, 'vurderingene står ikke under hverandre på mobil')
        const felt = side.getByRole('group', { name: 'Denne prøven' }).getByLabel(/^Benzoylekgonin/)
        await felt.fill('12345')
        const [innhold, synlig] = await felt.evaluate((e: HTMLInputElement) => [e.scrollWidth, e.clientWidth])
        krev(innhold! <= synlig!, `«12345» får ikke plass: ${innhold} av ${synlig} px`)
        // 200 → 240: klinisk ulike mildere utfall står synlig i hver sin linje, og får plass på mobil.
        await felt.fill('240')
        await side.locator('.trinnbryter__valg', { hasText: 'Ingen' }).tap()
        await vent(500)
        const ingen = somTekst(await marginbobler(side))
        krev(
          ingen ===
            'over 90 %: Kronisk: Kan ikke fastslås – svært uvanlig utskillelse; ' +
              'under 99 %: Sporadisk: Kan ikke fastslås – forenlig med gjentatte doser / Kronisk: Kan ikke fastslås',
          `boblene ved Ingen: ${ingen}`,
        )
        await bilde(side, tema === 'light' ? '21-form2-mobil-bobler' : '22-form2-mobil-bobler-moerkt')
        await side.locator('.trinnbryter__valg', { hasText: '90' }).tap()
        await vent(500)
        const ved90 = somTekst(await marginbobler(side))
        krev(
          ved90 ===
            'over 99 %: Sporadisk: Kan ikke fastslås – forenlig med gjentatte doser / ' +
              'Kronisk: Kan ikke fastslås, uten «svært uvanlig utskillelse»',
          `boblene ved 90 %: ${ved90}`,
        )
        const [etter] = await side.evaluate(() => [document.documentElement.scrollWidth])
        krev(etter! <= vindu!, `siden er ${etter} px bred med boblene`)
        if (tema === 'light') await bilde(side, '23-form2-mobil-bobler-90')
        await felt.fill('200')
        if (tema === 'dark') {
          await side.getByRole('button', { name: 'Om sikkerhetsmarginen' }).tap()
          await vent(300)
          krev((await side.locator('.tipsboble__innhold').count()) === 1, 'boblen kom ikke ved et trykk')
          await bilde(side, '18-form2-mobil-info-moerkt')
          await side.touchscreen.tap(5, 300)
        }
        await bilde(side, tema === 'light' ? '17-form2-mobil' : '19-form2-mobil-moerkt', true)
        return `${bredde} px av ${vindu}`
      })
    }
  }
} catch (e) {
  oppsettFeilet(e)
} finally {
  await miljo.avslutt()
}
rapport()
