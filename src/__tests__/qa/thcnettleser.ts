/**
 * Nettleserkontrollen av THC-syrefortolkningen etter forenklingen (#586,
 * docs/thc-syre.md), etter mønster fra benzoylekgonin i urin
 * (benzoylekgoninnettleser.ts). I det lokale testmiljøet (docs/qa-testmiljo.md):
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/thcnettleser.ts
 *
 * Prøver at en vanlig fortolkning med kommentaren og kopiknappen får plass på
 * én PC-skjerm, prøvene side om side, feil ved feltet uten en liste over det
 * som mangler, den korte teksten ved en høyere margin, informasjonstegnet,
 * profiltabellen og figuren, forklaringen, de tidligere prøvene, kort og lang
 * tid, under cut-off, kopieringen med tastaturet, simulatoren på
 * redigeringssiden, mørkt tema og mobil. Prøveverdiene er oppdiktede.
 *
 * Den lokale databasen har ikke THC-syrereglene: importen i migrasjonene
 * legges bare inn av administratoren som bestilte den, og den finnes ikke
 * lokalt. Siden får derfor de publiserte reglene og tekstene fra fasiten
 * (`thcRegelsettutgave`, de samme som `thcRegelsettlagring.test.ts` viser at
 * databasen gir) i svaret på lesingen av dem; alt annet går til databasen.
 */
import { thcRegelsettutgave } from '../hjelp/thcgrunnlag'
import { krev, lagKontroll, vent, type Side } from './kontroll'
import { seksjonsluft, somLuft } from './seksjonsluft'
import { marginbobler, somTekst } from './marginbobler'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('thc')
const PC = { viewport: { width: 1440, height: 900 } }
const MOBIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }

const miljo = await apneTestmiljo()
const UTGAVE = thcRegelsettutgave()
const THC_KOMMENTARER = new Set(UTGAVE.kommentarer.map((k) => k.id))

/** Svarer på lesingen av THC-syrereglene og kommentarene deres med fasitens; resten går videre. */
async function medThcRegler(side: Side) {
  const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) })
  await side.route('**/rest/v1/rpc/les_thc_regelsett*', (r: Side) => r.fulfill(json(UTGAVE.regelsett)))
  await side.route('**/rest/v1/rpc/les_kommentarer*', (r: Side) => {
    const ider = (r.request().postDataJSON()?.ider ?? []) as string[]
    if (ider.length === 0 || !ider.every((id) => THC_KOMMENTARER.has(id))) return r.continue()
    return r.fulfill(json(UTGAVE.kommentarer.filter((k) => ider.includes(k.id))))
  })
}

async function apne(side: Side) {
  await medThcRegler(side)
  await side.goto(`${miljo.url}/#/fortolkning/ircak`)
  await side.getByRole('group', { name: 'Forrige prøve' }).waitFor({ timeout: 30_000 })
}

async function fyll(side: Side, gruppe: string, ircak: string, dato?: string) {
  const g = side.getByRole('group', { name: gruppe })
  await g.getByLabel('IRCAK', { exact: true }).fill(ircak)
  if (dato) await g.getByLabel('Prøvedato').fill(dato)
}

const kommentar = (side: Side): Promise<string> => side.locator('.kommentartekst').innerText()
const bortMedFokus = (side: Side) => side.locator('body').click({ position: { x: 5, y: 880 } })

/** Toppen av et element, i skjermpunkter. */
const topp = (l: Side): Promise<number> => l.evaluate((e: Element) => Math.round(e.getBoundingClientRect().top))

/** Feltene i forrige og denne prøve står på samme høyde, uansett «Under cut-off». */
async function feltenePaaLinje(side: Side, forsteIForrige: string) {
  const a = await topp(side.getByRole('group', { name: 'Forrige prøve' }).getByLabel(forsteIForrige, { exact: true }))
  const b = await topp(side.getByRole('group', { name: 'Denne prøven' }).getByLabel('IRCAK', { exact: true }))
  krev(a === b, `feltene står ikke på linje: ${a} og ${b} px`)
}

/** Ingen felt, ledetekst eller valg går ut av rammen rundt prøven sin. */
async function innenforRammene(side: Side) {
  const utenfor = await side.locator('fieldset.be-prove').evaluateAll((rammer: Element[]) =>
    rammer.flatMap((f) => {
      const r = f.getBoundingClientRect()
      return [...f.querySelectorAll('input, .skjemafelt > span, .be-prove__valg')]
        .filter((e) => {
          const b = e.getBoundingClientRect()
          return b.width > 0 && (b.left < r.left - 0.5 || b.right > r.right + 0.5)
        })
        .map((e) => `${f.querySelector('legend')?.textContent}: ${e.textContent || e.getAttribute('type')}`)
    }),
  )
  krev(utenfor.length === 0, `utenfor rammen: ${utenfor.join('; ')}`)
}

/** Valgene i kanten av rammen står midt på linje med navnet i den andre enden. */
async function valgeneIKanten(side: Side) {
  const [navn, valg] = await side
    .getByRole('group', { name: 'Forrige prøve' })
    .evaluate((f: Element) =>
      [f.querySelector('legend')!, f.querySelector('.be-prove__valg')!].map((e) => {
        const r = e.getBoundingClientRect()
        return r.top + r.height / 2
      }),
    )
  krev(Math.abs(navn! - valg!) <= 2, `valgene står ${Math.round(valg! - navn!)} px fra midten av navnet`)
}

/** Siden ruller ikke sideveis. */
async function utenSideveisRulling(side: Side) {
  const [bredde, vindu] = await side.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth])
  krev(bredde! <= vindu!, `siden er ${bredde} px bred i et vindu på ${vindu} px`)
  return `${bredde} px av ${vindu}`
}

try {
  const pc: Side = paa(await miljo.side(PC))

  await punkt('T1 PC: en vanlig fortolkning, prøvene side om side, og alt på én skjerm', async () => {
    paa(pc)
    await apne(pc)
    krev((await pc.locator('.be-venter').innerText()) === 'Kommentaren vises når prøvene er fylt inn.', 'den stille linjen mangler')
    await fyll(pc, 'Forrige prøve', '120', '2026-01-01')
    await fyll(pc, 'Denne prøven', '80', '2026-01-08')
    const k = await kommentar(pc)
    krev(k.length > 40, `kommentaren: ${k}`)
    const t = await pc.locator('main').innerText()
    krev(!/Fyll inn|Vurder høyere sikkerhetsmargin|Samlet vurdering med enda tidligere/i.test(t), `gammel tekst: ${t}`)
    krev((await pc.getByRole('note').count()) === 0, 'det står et banner')
    const [forrige, denne] = await pc.locator('.be-prove').evaluateAll((k: Element[]) => k.map((e) => e.getBoundingClientRect().top))
    krev(forrige === denne, 'prøvene står ikke side om side på PC')
    await feltenePaaLinje(pc, 'IRCAK')
    await innenforRammene(pc)
    await valgeneIKanten(pc)
    // Kopiknappen står rett under kommentaren, og profilene med figuren under den.
    const kopier = pc.getByRole('button', { name: /Kopier kommentar/ })
    const [kTop, knappTop, seksjonTop] = await Promise.all([
      pc.locator('.kommentartekst').evaluate((e: Element) => e.getBoundingClientRect().bottom),
      kopier.evaluate((e: Element) => e.getBoundingClientRect().top),
      pc.locator('.be-seksjoner').evaluate((e: Element) => e.getBoundingClientRect().top),
    ])
    krev(kTop <= knappTop && knappTop < seksjonTop, 'kopiknappen står ikke rett under kommentaren')
    // Kommentaren og kopiknappen får plass uten rulling; profilene og figuren, som
    // alltid står åpne (#592), følger under.
    const bunn = await kopier.evaluate((e: Element) => e.getBoundingClientRect().bottom + window.scrollY)
    const hoyde = await pc.evaluate(() => window.innerHeight)
    krev(bunn <= hoyde, `kopiknappen står ${Math.round(bunn)} px ned i et vindu på ${hoyde} px`)
    await bortMedFokus(pc)
    await vent(300)
    await bilde(pc, '01-resultat-pc')
    return `kopiknappen slutter ${Math.round(bunn)} av ${hoyde} px`
  })

  await punkt('T2 PC: tastaturet til informasjonstegnet, og den forklarte marginen', async () => {
    paa(pc)
    await pc.getByRole('group', { name: 'Denne prøven' }).getByLabel('Prøvedato').focus()
    let knapp: string | undefined
    for (let i = 0; i < 4 && knapp !== '+ Legg til tidligere prøve'; i++) {
      await pc.keyboard.press('Tab')
      knapp = await pc.evaluate(() => (document.activeElement?.tagName === 'BUTTON' ? document.activeElement.textContent?.trim() : undefined))
    }
    krev(knapp === '+ Legg til tidligere prøve', `Tab gikk til ${knapp}`)
    await pc.keyboard.press('Tab')
    const info = await pc.evaluate(() => document.activeElement?.getAttribute('aria-label'))
    krev(info === 'Om sikkerhetsmarginen', `Tab gikk til ${info}`)
    await vent(300)
    const boble = await pc.locator('.tipsboble__innhold').innerText()
    krev(boble.includes('Marginen gjelder bare måleusikkerheten'), `boblen: ${boble}`)
    await bilde(pc, '02-info-pc')
    return 'felt → legg til → info, boblen vises'
  })

  await punkt('T3 PC: en høyere margin gir et mildere utfall, vist i snakkebobler ved marginen', async () => {
    paa(pc)
    // 50 → 40 på tre døgn ved kronisk bruk (standard): 50 % gir nytt inntak, 90 % «kan ikke fastslås», 99 % «ikke nødvendigvis nytt».
    await fyll(pc, 'Forrige prøve', '50', '2026-07-04')
    await fyll(pc, 'Denne prøven', '40', '2026-07-07')
    try {
      const en = await marginbobler(pc)
      krev(somTekst(en) === 'over 99 %: Ikke nødvendigvis nytt', `med 90 %: ${somTekst(en)}`)
      krev((await pc.locator('.thc-merknader').count()) === 0, 'det står fortsatt en tekst om marginen ved kommentaren')
      krev((await pc.getByRole('button', { name: /Bruk \d+/ }).count()) === 0, 'det står en knapp for marginen')
      await pc.locator('.trinnbryter__valg', { hasText: 'Ingen' }).click()
      const to = await marginbobler(pc)
      krev(
        somTekst(to) === 'over 90 %: Kan ikke fastslås; under 99 %: Ikke nødvendigvis nytt',
        `med ingen margin: ${somTekst(to)}`,
      )
      await bortMedFokus(pc)
      await vent(500)
      await bilde(pc, '03-mildere-pc')
      await pc.emulateMedia({ colorScheme: 'dark' })
      await vent(300)
      await bilde(pc, '03-mildere-moerkt-pc')
      await pc.emulateMedia({ colorScheme: 'light' })
      await pc.locator('.trinnbryter__valg', { hasText: '99' }).click()
      krev((await marginbobler(pc)).length === 0, 'det står bobler på den høyeste marginen')
      return `${somTekst(en)} | ${somTekst(to)}`
    } finally {
      await pc.getByRole('button', { name: 'Nullstill' }).click()
    }
  })

  await punkt('T4 PC: tidligere prøver, og det mildere utfallet knyttet til riktig prøve', async () => {
    paa(pc)
    await fyll(pc, 'Forrige prøve', '6,5', '2026-07-04')
    await fyll(pc, 'Denne prøven', '2,5', '2026-07-27')
    try {
      await pc.getByRole('button', { name: '+ Legg til tidligere prøve' }).click()
      const fokus = await pc.evaluate(() => document.activeElement?.closest('fieldset')?.querySelector('legend')?.textContent)
      krev(fokus === 'Tidligere prøve', `fokuset står i ${fokus}`)
      await fyll(pc, 'Tidligere prøve', '3', '2026-06-28')
      krev((await kommentar(pc)).includes('28.06.2026'), `kommentaren: ${await kommentar(pc)}`)
      const en = somTekst(await marginbobler(pc))
      krev(en === 'over 99 %: Kan ikke fastslås', `én tidligere prøve: ${en}`)
      await pc.getByRole('button', { name: '+ Legg til tidligere prøve' }).click()
      await fyll(pc, 'Tidligere prøve 2', '2', '2026-06-01')
      const to = somTekst(await marginbobler(pc))
      krev(to === 'over 99 %: Nytt inntak etter tidligere prøve 01.06.2026', `to tidligere prøver: ${to}`)
      await bortMedFokus(pc)
      await bilde(pc, '04-tidligere-pc', true)
      await pc.getByRole('button', { name: 'Fjern tidligere prøve 2' }).click()
      const etter = await pc.evaluate(() => document.activeElement?.textContent?.trim())
      krev(etter === '+ Legg til tidligere prøve', `fokuset etter fjerning: ${etter}`)
      return `${en} / ${to}`
    } finally {
      await pc.getByRole('button', { name: 'Nullstill' }).click()
    }
  })

  await punkt('T5 PC: profiltabellen og figuren alltid åpne, uten overskrift, og alle marginer', async () => {
    paa(pc)
    await fyll(pc, 'Forrige prøve', '120', '2026-01-01')
    await fyll(pc, 'Denne prøven', '80', '2026-01-08')
    const seksjon = pc.locator('.be-profiler')
    krev((await pc.getByText('Utskillelsesprofiler og figur').count()) === 0, 'overskriften står')
    krev((await seksjon.locator('xpath=ancestor::details').count()) === 0, 'profilene ligger i en skuff')
    const rader = await seksjon.locator('tbody tr').count()
    krev(rader >= 3, `bare ${rader} rader`)
    krev((await seksjon.locator('svg.thc-plot__figur').count()) === 1, 'figuren mangler')
    await bilde(pc, '05-profiler-pc', true)
    await seksjon.getByLabel('Vis alle sikkerhetsmarginer').check()
    await vent(300)
    await bilde(pc, '06-alle-marginer-pc', true)
    const luft = await seksjonsluft(pc)
    await seksjon.getByLabel('Vis alle sikkerhetsmarginer').uncheck()
    return `${rader} rader; ${somLuft(luft)}`
  })

  await punkt('T6 PC: forklaringen med de fire spørsmålene, uten formler', async () => {
    paa(pc)
    await pc.getByText('Forklaring', { exact: true }).click()
    await vent(700)
    const seksjon = pc.locator('details').filter({ hasText: 'Hvorfor blir konklusjonen slik?' })
    const overskrifter = await seksjon.locator('h3').allInnerTexts()
    krev(overskrifter.length === 4, `overskriftene: ${overskrifter.join(' | ')}`)
    const t = await seksjon.innerText()
    krev(!/=|√|\bln\b|forholdstall|kvotient/i.test(t), `formler: ${t}`)
    const apen = await seksjonsluft(pc)
    await bilde(pc, '07-forklaring-pc', true)
    await pc.getByText('Forklaring', { exact: true }).click()
    await vent(500)
    const lukket = await seksjonsluft(pc)
    return `${overskrifter.join(' | ')}; åpen: ${somLuft(apen)}; lukket: ${somLuft(lukket)}`
  })

  await punkt('T7 PC: feil ved feltet, og feil på tvers', async () => {
    paa(pc)
    await fyll(pc, 'Denne prøven', '0')
    await vent(200)
    krev((await pc.getByText('Må være over 0.').count()) === 1, 'feilen ved feltet mangler')
    krev((await pc.locator('.kommentartekst').count()) === 0, 'kommentar med ugyldig felt')
    await bortMedFokus(pc)
    await bilde(pc, '08-feltfeil-pc')
    await fyll(pc, 'Denne prøven', '80', '2025-12-01')
    const feil = await pc.getByRole('alert').innerText()
    krev(feil === 'Denne prøven kan ikke være tatt før forrige prøve.', `feilen: ${feil}`)
    await bilde(pc, '09-tverrfeil-pc')
    return feil
  })

  await punkt('T8 PC: kort tid gir et valg, lang tid et forslag', async () => {
    paa(pc)
    await fyll(pc, 'Denne prøven', '80', '2026-01-02')
    await pc.getByText('Det er bare 1 dag mellom prøvene.').waitFor({ timeout: 5000 })
    const valg = pc.getByLabel('Ikke sammenlign prøvene (kort tid)')
    krev(!(await valg.isChecked()), 'valget er huket av fra start')
    await bortMedFokus(pc)
    await bilde(pc, '10-kort-tid-pc')
    await valg.check()
    await vent(200)
    krev((await pc.getByRole('button', { name: '+ Legg til tidligere prøve' }).count()) === 0, 'tidligere prøver ved kort tid')
    await valg.uncheck()
    await fyll(pc, 'Denne prøven', '80', '2026-03-01')
    await pc.locator('.thc-tidsrom--langt').waitFor({ timeout: 5000 })
    await bortMedFokus(pc)
    await bilde(pc, '11-lang-tid-pc')
    await pc.getByRole('button', { name: 'Fortolk uten forrige prøve' }).click()
    krev(await pc.getByLabel('Ingen tidligere prøve tilgjengelig').isChecked(), 'forslaget ble ikke tatt')
    const fokus = await pc.evaluate(() => document.activeElement?.parentElement?.textContent?.trim())
    krev(fokus === 'Ingen tidligere prøve tilgjengelig', `fokuset: ${fokus}`)
    await pc.getByLabel('Ingen tidligere prøve tilgjengelig').uncheck()
    return 'valget av ved kort tid; forslaget tar «ingen tidligere prøve»'
  })

  await punkt('T9 PC: under cut-off, med beregnet IRCAK og merknaden ved marginen', async () => {
    paa(pc)
    const forrige = pc.getByRole('group', { name: 'Forrige prøve' })
    await forrige.getByLabel('Under cut-off').check()
    await forrige.getByLabel('UCAK (THC-syre)').fill('3')
    await forrige.getByLabel('NKRE (kreatinin)').fill('10')
    await forrige.getByLabel('Prøvedato').fill('2026-01-01')
    await fyll(pc, 'Denne prøven', '0,2', '2026-01-08')
    const beregnet = await forrige.getByRole('status').innerText()
    krev(/Beregnet IRCAK/.test(beregnet), `beregnet: ${beregnet}`)
    await feltenePaaLinje(pc, 'UCAK (THC-syre)')
    await innenforRammene(pc)
    const merknad = await pc.locator('.thc-margin__merknad').innerText()
    krev(merknad.includes('under cut-off'), `merknaden: ${merknad}`)
    await bortMedFokus(pc)
    await bilde(pc, '12-under-cutoff-pc')
    await forrige.getByLabel('Under cut-off').uncheck()
    return `${beregnet}; ${merknad}`
  })

  await punkt('T10 PC: Enter kopierer, og Enter igjen nullstiller', async () => {
    paa(pc)
    await fyll(pc, 'Forrige prøve', '120', '2026-01-01')
    await fyll(pc, 'Denne prøven', '80', '2026-01-08')
    const k = await kommentar(pc)
    await pc.getByRole('group', { name: 'Denne prøven' }).getByLabel('IRCAK', { exact: true }).focus()
    await pc.keyboard.press('Enter')
    await vent(400)
    const utklipp = await pc.evaluate(() => navigator.clipboard.readText())
    krev(utklipp === k, `utklippstavlen: ${utklipp}`)
    await pc.locator('.thc-nullstilltips').waitFor({ timeout: 5000 })
    await bilde(pc, '13-kopiert-pc')
    await pc.keyboard.press('Enter')
    await vent(400)
    const verdi = await pc.getByRole('group', { name: 'Forrige prøve' }).getByLabel('IRCAK', { exact: true }).inputValue()
    krev(verdi === '', `feltet etter nullstilling: ${verdi}`)
    return 'kopiert og nullstilt med Enter'
  })

  await punkt('T11 PC: mørkt tema', async () => {
    paa(pc)
    await pc.emulateMedia({ colorScheme: 'dark' })
    await fyll(pc, 'Forrige prøve', '30', '2026-01-01')
    await fyll(pc, 'Denne prøven', '20', '2026-01-08')
    await bortMedFokus(pc)
    await vent(300)
    await bilde(pc, '14-moerkt-pc')
    await bilde(pc, '15-moerkt-profiler-pc', true)
    await pc.emulateMedia({ colorScheme: 'light' })
    return 'tatt'
  })

  await punkt('T12 PC: simulatoren på redigeringssiden viser det samme', async () => {
    paa(pc)
    await pc.goto(`${miljo.url}/#/fortolkning/ircak/rediger`)
    await pc.reload()
    await pc.getByRole('button', { name: 'Fortolkningsregler' }).click({ timeout: 30_000 })
    await pc.getByRole('button', { name: 'Prøv reglene' }).first().click()
    const sim = pc.locator('.simulator').first()
    await sim.getByRole('group', { name: 'Forrige prøve' }).waitFor({ timeout: 30_000 })
    await sim.getByRole('group', { name: 'Forrige prøve' }).getByLabel('IRCAK', { exact: true }).fill('30')
    await sim.getByRole('group', { name: 'Forrige prøve' }).getByLabel('Prøvedato').fill('2026-01-01')
    await sim.getByRole('group', { name: 'Denne prøven' }).getByLabel('IRCAK', { exact: true }).fill('20')
    await sim.getByRole('group', { name: 'Denne prøven' }).getByLabel('Prøvedato').fill('2026-01-08')
    const t = await sim.innerText()
    krev(t.includes('Satt sammen av'), 'kommentarbolkene mangler')
    const bobler = somTekst(await marginbobler(pc, '.simulator'))
    krev(bobler.startsWith('over 99 %:'), `boblene i simulatoren: ${bobler}`)
    await sim.scrollIntoViewIfNeeded()
    await bilde(pc, '16-simulator-pc', true)
    return `kommentarbolkene står; ${bobler}`
  })

  for (const [navn, tema] of [
    ['T13 mobil: lyst tema, under hverandre, uten sideveis rulling', 'light'],
    ['T14 mobil: mørkt tema, og informasjonstegnet ved et trykk', 'dark'],
  ] as const) {
    await punkt(navn, async () => {
      const side: Side = paa(await miljo.side({ ...MOBIL, colorScheme: tema }))
      await apne(side)
      // Som i T3: uten margin to bobler, over og under bryteren.
      await fyll(side, 'Forrige prøve', '50', '2026-07-04')
      await fyll(side, 'Denne prøven', '40', '2026-07-07')
      await side.locator('.trinnbryter__valg', { hasText: 'Ingen' }).tap()
      await vent(500)
      const bobler = somTekst(await marginbobler(side))
      krev(bobler === 'over 90 %: Kan ikke fastslås; under 99 %: Ikke nødvendigvis nytt', `boblene på mobil: ${bobler}`)
      const svar = `${await utenSideveisRulling(side)}; ${bobler}`
      const [a, b] = await side.locator('.be-prove').evaluateAll((k: Element[]) => k.map((e) => e.getBoundingClientRect().top))
      krev(a! < b!, 'prøvene står ikke under hverandre på mobil')
      await innenforRammene(side)
      if (tema === 'light') {
        // Under cut-off får også plass, med datoen under de to tallfeltene.
        const forrige = side.getByRole('group', { name: 'Forrige prøve' })
        await forrige.getByLabel('Under cut-off').check()
        await utenSideveisRulling(side)
        await innenforRammene(side)
        await bilde(side, '17-mobil-under-cutoff', true)
        await forrige.getByLabel('Under cut-off').uncheck()
      }
      if (tema === 'dark') {
        await side.getByRole('button', { name: 'Om sikkerhetsmarginen' }).tap()
        await vent(300)
        krev((await side.locator('.tipsboble__innhold').count()) === 1, 'boblen kom ikke ved et trykk')
        await bilde(side, '18-mobil-info-moerkt')
        await side.touchscreen.tap(5, 300)
      }
      await bilde(side, tema === 'light' ? '17-mobil' : '19-mobil-moerkt', true)
      return svar
    })
  }
} catch (e) {
  oppsettFeilet(e)
} finally {
  await miljo.avslutt()
}
rapport()
