/**
 * D7: den helhetlige nettleserkontrollen av forsiden, navigasjonen, gruppene,
 * rettighetene, ytelsen og visningen på PC, nettbrett og mobil i lyst og mørkt
 * tema (planen §11 D7 og §12, `docs/d7-kontroll.md`), i det lokale testmiljøet
 * (docs/qa-testmiljo.md). Chatten, direktemeldingene og menyene har egne
 * kontroller (`chatmeny-`, `chatulest-`, `direktemelding-`, `menynettleser.ts`);
 * denne dekker resten av aksepttestene og samspillet mellom delene.
 *
 * Syntetiske kontoer: `qa-d7-ada` (medlem i to fagmiljøer), `qa-d7-bo` (ett
 * fagmiljø) og `qa-d7-cy` (utenfor gruppene), med nye passord hver gang.
 * Bryterne for chatten og direktemeldingene står på mens den går.
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/helhetnettleser.ts
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { randomBytes } from 'node:crypto'
import { arkiverTidligereGrupper, innen, klient, krev, lagAvslagsvakt, lagKontroll, rpc, vent, type Side } from './kontroll'
import { lokalSql, sikreAdministrator, sikreTestkonto, slaPaFunksjoner, startLokalDatabase } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('d7')

const PC = { viewport: { width: 1440, height: 900 } }
const NETTBRETT = { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true }
const MOBIL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }

const hash = (side: Side) => new URL(side.url()).hash || '#/'
const paForsiden = (side: Side) => side.getByRole('button', { name: 'Åpne fortolkning' })
const sokefelt = (side: Side) => side.getByRole('combobox', { name: 'Søk etter analytt eller kode' }).or(side.getByLabel('Søk etter analytt eller kode'))
const panel = (side: Side, tittel: string) => side.getByRole('region', { name: tittel, exact: true })
const sidetekst = (side: Side): Promise<string> => side.evaluate(() => document.body.innerText)
const hovedmenyApen = async (side: Side) => (await side.locator('nav.sidemeny').getAttribute('data-apen')) === 'ja'
/** Siden ruller ikke sideveis: innholdet er ikke bredere enn vinduet. */
const sidebredde = (side: Side): Promise<{ innhold: number; vindu: number }> =>
  side.evaluate(() => ({ innhold: document.documentElement.scrollWidth, vindu: window.innerWidth }))
async function utenSiderulling(side: Side, hvor: string) {
  const { innhold, vindu } = await sidebredde(side)
  krev(innhold <= vindu + 1, `${hvor}: innholdet er ${innhold} px i et vindu på ${vindu} px`)
}
/** Titlene på forsidens panel, i rekkefølgen de står. */
const paneltitler = (side: Side): Promise<string[]> =>
  side
    .locator('.forside__paneler section.oppsummering')
    .evaluateAll((e: Element[]) => e.map((x) => document.getElementById(x.getAttribute('aria-labelledby') ?? '')?.textContent?.trim() ?? ''))
/** Radene i et oppsummeringspanel, når det er ferdig hentet. */
async function panelrader(side: Side, tittel: string): Promise<string[]> {
  const p = panel(side, tittel)
  await innen(15_000, `${tittel} hentet`, async () => (await p.getAttribute('aria-busy')) !== 'true')
  return p.locator('li').allInnerTexts()
}
const avslag = lagAvslagsvakt()
/** Lukker chatmenyen om den står åpen fra en tidligere kjøring (valget huskes på kontoen). */
async function lukkChatten(side: Side) {
  // Seksjonen rundt chatmenyen har også boblen; det er panelet som står åpent eller ikke.
  await vent(1500)
  if (await side.locator('.chatpanel').isVisible()) await side.getByRole('button', { name: 'Lukk chatten' }).first().click()
}
/** Hvert punkt starter på forsiden med chatmenyen lukket, så et punkt som feiler, ikke tar de neste med seg. */
async function fraForsiden(side: Side) {
  await side.goto('about:blank')
  await side.goto(`${miljo.url}/#/`)
  await paForsiden(side).waitFor({ timeout: 30_000 })
  await lukkChatten(side)
}

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const pw = { ada: randomBytes(18).toString('base64url'), bo: randomBytes(18).toString('base64url'), cy: randomBytes(18).toString('base64url') }
const adaId = await sikreTestkonto(s, 'qa-d7-ada', pw.ada, ['Ada', 'Helhet'])
await sikreTestkonto(s, 'qa-d7-bo', pw.bo, ['Bo', 'Helhet'])
await sikreTestkonto(s, 'qa-d7-cy', pw.cy, ['Cy', 'Utenfor'])
const [fagA, fagB] = ['ous-klinisk-farmakologi', 'ous-rettstoksikologi'].map((n) => lokalSql(s, `select id from public.fagmiljoer where nokkel = '${n}'`)) as [string, string]
const navnA = lokalSql(s, `select navn from public.fagmiljoer where id = '${fagA}'`)
const navnB = lokalSql(s, `select navn from public.fagmiljoer where id = '${fagB}'`)
// Ada er medlem i begge fagmiljøene og arbeider i A; forsiden hennes står som standard.
lokalSql(
  s,
  `select set_config('ousfar.tilgangsgrunn', 'D7-kontroll (syntetisk)', true);
   insert into public.medlemskap (bruker_id, fagmiljo_id) select '${adaId}', '${fagB}'
     where not exists (select 1 from public.medlemskap where bruker_id = '${adaId}' and fagmiljo_id = '${fagB}' and status = 'aktiv');
   update public.medlemskap set primaer = false where bruker_id = '${adaId}' and status = 'aktiv';
   update public.medlemskap set primaer = true where bruker_id = '${adaId}' and fagmiljo_id = '${fagA}' and status = 'aktiv';
   delete from public.brukerinnstillinger where bruker_id = '${adaId}' and nokkel = 'forside.moduler';`,
)
const tilbakestillBrytere = slaPaFunksjoner(s, 'gruppechat_aktivert', 'direktemeldinger_aktivert')
const miljo = await apneTestmiljo()
try {
  const admin = await klient(s, 'qa-admin', adminpassord)
  const adaK = await klient(s, 'qa-d7-ada', pw.ada)
  const boK = await klient(s, 'qa-d7-bo', pw.bo)
  const tid = new Date().toISOString().slice(11, 19)
  const navn = { tvers: `D7 tvers ${tid}`, arkiv: `D7 arkiv ${tid}`, invitert: `D7 invitert ${tid}` }
  const nyGruppe = (gruppenavn: string) => rpc<string>(admin, 'opprett_gruppe', { navn: gruppenavn, beskrivelse: 'D7-kontroll (syntetisk).', fagmiljo: null })
  async function medlem(gruppe: string, brukernavn: string, k: SupabaseClient) {
    await rpc(admin, 'inviter_til_gruppe', { gruppe, brukernavn })
    await rpc(k, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  }
  // Det forrige kjøringer la igjen, skal ikke fylle panelene: gamle D7-grupper arkiveres, og Adas varsler er lest.
  await arkiverTidligereGrupper(admin, 'D7 ')
  lokalSql(s, `update public.varsler set lest_kl = now() where mottaker_id = '${adaId}' and lest_kl is null`)
  const tvers = await nyGruppe(navn.tvers)
  await medlem(tvers, 'qa-d7-ada', adaK)
  await medlem(tvers, 'qa-d7-bo', boK)
  const arkiv = await nyGruppe(navn.arkiv)
  await medlem(arkiv, 'qa-d7-ada', adaK)
  await rpc(admin, 'arkiver_gruppe', { gruppe: arkiv, arkivert: true })
  const invitert = await nyGruppe(navn.invitert)
  await rpc(admin, 'inviter_til_gruppe', { gruppe: invitert, brukernavn: 'qa-d7-ada' })
  // Aktivitet fra de andre: en idé fra Bo, og en oppgave Ada får.
  const ideTittel = `D7 idé fra Bo ${tid}`
  const { data: ideRad, error: idefeil } = await boK.from('ideer').insert({ gruppe_id: tvers, kategori: null, tittel: ideTittel, tekst: null }).select('id').single()
  if (idefeil) throw idefeil
  const ide = (ideRad as { id: string }).id
  const oppgaveTittel = `D7 oppgave til Ada ${tid}`
  const oppgave = await rpc<string>(admin, 'opprett_gruppeoppgave', { gruppe: tvers, tittel: oppgaveTittel, beskrivelse: null, prioritet: 'hoy', ansvarlig: adaId })
  await rpc(boK, 'send_gruppemelding', { gruppe: tvers, klient_id: crypto.randomUUID(), tekst: 'Syntetisk D7-melding fra Bo' })
  // Et varsel som hører til fagmiljø A og ett til B: bare det fra fagmiljøet Ada arbeider i, skal vises.
  const lokaltVarsel = (fagmiljo: string) =>
    lokalSql(
      s,
      `insert into public.varsler (mottaker_id, kategori, gruppe, hendelser, fagmiljo_id, oppdatert_kl)
       values ('${adaId}', 'forslag_til_behandling', 'forslag_til_behandling:${crypto.randomUUID()}', '[{"kl":"${new Date().toISOString()}","av":null}]', '${fagmiljo}', now()) returning id`,
    )
  const varselA = lokaltVarsel(fagA)
  const varselB = lokaltVarsel(fagB)
  const aktuelt = async () => ((await rpc<{ varsler?: { id: string }[] }>(adaK, 'forsideoppsummering', { modul: 'aktuelt' })).varsler ?? []).map((v) => v.id)

  // --- Forsiden -------------------------------------------------------------
  const ada: Side = paa(await avslag.lytt(await miljo.brukerside('qa-d7-ada', pw.ada, PC)))
  const kall: string[] = []
  ada.on('request', (r: Side) => {
    const m = /\/rest\/v1\/rpc\/([a-z_]+)/.exec(r.url())
    if (m) kall.push(m[1]!)
  })

  await punkt('F1 innlogging uten dyp lenke åpner forsiden med fagmiljøets navn og fokus på «Åpne fortolkning»', async () => {
    await paForsiden(ada).waitFor({ timeout: 30_000 })
    krev(hash(ada) === '#/', `adressen er ${hash(ada)}`)
    const forste: string = await ada.getByRole('heading', { level: 1 }).first().innerText()
    krev(forste.trim() === '' || forste === navnA, `overskriften viste først «${forste}»`)
    const ms = await innen(10_000, `overskriften er «${navnA}»`, async () => (await ada.getByRole('heading', { level: 1 }).first().innerText()) === navnA)
    const tittel = `${navnA} (etter ${ms} ms)`
    const fokus: string = await ada.evaluate(() => document.activeElement?.textContent ?? '')
    krev(fokus.includes('Åpne fortolkning'), `fokus på «${fokus}»`)
    await lukkChatten(ada)
    await bilde(ada, '01-forside-pc')
    return tittel
  })

  await punkt('F2 standard: fire panel, hvert med høyst tre hendelser', async () => {
    const titler = await paneltitler(ada)
    krev(titler.length === 4, `panelene: ${titler.join(' | ')}`)
    for (const t of ['Viktig nytt', 'Aktuelt for deg', 'Mine grupper', 'Oppdaterte fagsider']) {
      const rader = await panelrader(ada, t)
      krev(rader.length <= 3, `${t} har ${rader.length} rader`)
    }
    const grupper = (await panelrader(ada, 'Mine grupper')).join(' / ')
    krev(grupper.includes(navn.tvers), `Mine grupper: ${grupper}`)
    krev(!grupper.includes(navn.arkiv), 'den arkiverte gruppen vises')
    const forhand = (await panelrader(ada, 'Aktuelt for deg')).join(' / ')
    krev(forhand.includes(navn.invitert) || forhand.includes(oppgaveTittel), `Aktuelt for deg: ${forhand}`)
    return titler.join(' | ')
  })

  await punkt('F3 en hendelse i et panel åpner selve hendelsen, og lukking går tilbake til forsiden', async () => {
    await panel(ada, 'Aktuelt for deg').getByRole('link', { name: new RegExp(oppgaveTittel) }).first().click()
    await innen(10_000, 'oppgaven åpen', async () => hash(ada) === `#/grupper/${tvers}/oppgaver/${oppgave}`)
    await ada.getByRole('dialog').getByText(oppgaveTittel).locator('visible=true').first().waitFor({ timeout: 10_000 })
    await bilde(ada, '02-oppgave-fra-forsiden-pc')
    await ada.keyboard.press('Escape')
    await innen(5_000, 'tilbake på forsiden', async () => hash(ada) === '#/')
  })

  await punkt('F4 Tilpass forsiden: skjul og flytt, valget følger kontoen til en ny maskin, Gjenopprett standard', async () => {
    await ada.getByRole('button', { name: 'Tilpass forsiden' }).click()
    const vindu = ada.getByRole('dialog', { name: 'Tilpass forsiden' })
    await vindu.waitFor()
    await vindu.getByRole('switch', { name: 'Oppdaterte fagsider' }).click()
    await vindu.getByRole('button', { name: 'Flytt Mine grupper opp' }).click()
    await vindu.getByRole('switch', { name: 'Mine oppgaver' }).press('Space')
    await bilde(ada, '03-tilpass-pc')
    await ada.keyboard.press('Escape')
    await innen(3_000, 'vinduet lukket', async () => !(await vindu.isVisible()))
    const titler = () => paneltitler(ada)
    const her = await titler()
    krev(her.join('|') === 'Viktig nytt|Mine grupper|Aktuelt for deg|Mine oppgaver', `her: ${her.join(' | ')}`)
    await innen(5_000, 'lagret i databasen', async () => lokalSql(s, `select count(*) from public.brukerinnstillinger where bruker_id = '${adaId}' and nokkel = 'forside.moduler'`) === '1')
    const annen: Side = await miljo.brukerside('qa-d7-ada', pw.ada, PC)
    await paForsiden(annen).waitFor({ timeout: 30_000 })
    await innen(10_000, 'samme valg på den andre maskinen', async () =>
      (await paneltitler(annen)).join('|') === her.join('|'),
    )
    const oppgaver = (await panelrader(annen, 'Mine oppgaver')).join(' / ')
    krev(oppgaver.includes(oppgaveTittel), `Mine oppgaver: ${oppgaver}`)
    await annen.context().close()
    await ada.getByRole('button', { name: 'Tilpass forsiden' }).click()
    await vindu.getByRole('button', { name: 'Gjenopprett standard' }).click()
    await vindu.getByRole('button', { name: 'Ferdig' }).click()
    await innen(5_000, 'standard igjen', async () => (await titler()).join('|') === 'Viktig nytt|Aktuelt for deg|Mine grupper|Oppdaterte fagsider')
    return her.join(' | ')
  })

  await punkt('F5 en feil i ett panel lar resten virke, og «Prøv igjen» henter bare det', async () => {
    let nede = true
    let hentet = 0
    await ada.route('**/rest/v1/rpc/forsideoppsummering', async (rute: Side) => {
      if (rute.request().postDataJSON()?.modul === 'grupper') {
        if (nede) return rute.abort('failed')
        hentet++
      }
      return rute.fallback()
    })
    await ada.reload()
    const grupper = panel(ada, 'Mine grupper')
    await grupper.getByRole('button', { name: 'Prøv igjen' }).waitFor({ timeout: 20_000 })
    krev((await panelrader(ada, 'Aktuelt for deg')).length > 0, 'Aktuelt for deg er tomt')
    await bilde(ada, '04-panelfeil-pc')
    nede = false
    await grupper.getByRole('button', { name: 'Prøv igjen' }).click()
    await innen(10_000, 'Mine grupper hentet', async () => (await grupper.getByText(navn.tvers).count()) > 0)
    await ada.unroute('**/rest/v1/rpc/forsideoppsummering')
    krev(hentet === 1, `Mine grupper ble hentet ${hentet} ganger etter feilen`)
  })

  await punkt('F6 fagmiljøbytte: nytt navn med en gang, ingen gamle lokale hendelser mens de nye hentes, grupper på tvers blir', async () => {
    const iA = await aktuelt()
    krev(iA.includes(varselA) && !iA.includes(varselB), 'databasen gir bare varselet fra A')
    const forFor = (await panelrader(ada, 'Aktuelt for deg')).join(' / ')
    let slipp: () => void = () => undefined
    const holdt = new Promise<void>((ok) => (slipp = ok))
    await ada.route('**/rest/v1/rpc/forsideoppsummering', async (rute: Side) => {
      await holdt
      return rute.fallback()
    })
    await ada.getByRole('button', { name: 'Bytt fagmiljø' }).click()
    await ada.getByRole('button', { name: new RegExp(navnB) }).click()
    await innen(10_000, 'nytt navn', async () => (await ada.getByRole('heading', { level: 1 }).first().innerText()) === navnB)
    // Mens de nye svarene holdes igjen, skal ingen rad fra A stå igjen.
    await vent(800)
    const underveis: string[] = await ada.locator('.forside__paneler li').allInnerTexts()
    await bilde(ada, '05-fagmiljobytte-underveis-pc')
    slipp()
    await ada.unroute('**/rest/v1/rpc/forsideoppsummering')
    krev(underveis.length === 0, `rader mens de nye hentes: ${underveis.join(' / ')}`)
    const etter = (await panelrader(ada, 'Mine grupper')).join(' / ')
    krev(etter.includes(navn.tvers), `gruppen på tvers er borte: ${etter}`)
    const iB = await aktuelt()
    krev(iB.includes(varselB) && !iB.includes(varselA), 'databasen gir bare varselet fra B')
    await bilde(ada, '06-fagmiljo-b-pc')
    await ada.getByRole('button', { name: 'Bytt fagmiljø' }).click()
    await ada.getByRole('button', { name: new RegExp(navnA) }).click()
    await innen(10_000, 'tilbake i A', async () => (await ada.getByRole('heading', { level: 1 }).first().innerText()) === navnA)
    return `før: ${forFor.slice(0, 80)}`
  })

  await punkt('F7 med bare ett fagmiljø står ingen pil ved navnet', async () => {
    const bo: Side = await miljo.brukerside('qa-d7-bo', pw.bo, PC)
    await paForsiden(bo).waitFor({ timeout: 30_000 })
    await vent(1500)
    krev((await bo.getByRole('button', { name: 'Bytt fagmiljø' }).count()) === 0, 'pila vises')
    await bo.context().close()
  })

  await punkt('F8 bjella har de samme uleste når «Viktig nytt» er slått av', async () => {
    const bjella = ada.getByRole('button', { name: /^Varsler/ }).first()
    await vent(1500)
    const for_ = await bjella.getAttribute('aria-label')
    await ada.getByRole('button', { name: 'Tilpass forsiden' }).click()
    const vindu = ada.getByRole('dialog', { name: 'Tilpass forsiden' })
    await vindu.getByRole('switch', { name: 'Viktig nytt' }).click()
    await vindu.getByRole('button', { name: 'Ferdig' }).click()
    await vent(1500)
    const etter = await bjella.getAttribute('aria-label')
    await ada.getByRole('button', { name: 'Tilpass forsiden' }).click()
    await vindu.getByRole('button', { name: 'Gjenopprett standard' }).click()
    await vindu.getByRole('button', { name: 'Ferdig' }).click()
    krev(for_ === etter, `bjella før: ${for_}, etter: ${etter}`)
    return etter ?? ''
  })

  // --- Ytelse ---------------------------------------------------------------
  await punkt('Y1 «Åpne fortolkning» virker med en gang, også når panelene ikke har svart', async () => {
    await ada.route('**/rest/v1/rpc/forsideoppsummering', async (rute: Side) => {
      await vent(8_000)
      return rute.fallback().catch(() => undefined)
    })
    kall.length = 0
    const start = Date.now()
    await ada.reload()
    await paForsiden(ada).waitFor({ timeout: 30_000 })
    const synlig = Date.now() - start
    await paForsiden(ada).click()
    await sokefelt(ada).first().waitFor({ timeout: 3_000 })
    const inne = Date.now() - start
    krev(hash(ada) === '#/fortolkning', `adressen er ${hash(ada)}`)
    await ada.unroute('**/rest/v1/rpc/forsideoppsummering')
    const tunge = kall.filter((k) => /^les_stoffer|stoffsider_som_json/.test(k))
    krev(inne < 8_000, `søket kom fram etter ${inne} ms`)
    return `knappen etter ${synlig} ms, søket etter ${inne} ms; kall: ${[...new Set(kall)].join(', ')}${tunge.length ? ` (tunge: ${tunge.join(', ')})` : ''}`
  })

  await punkt('Y2 forsiden henter hvert panel én gang', async () => {
    await ada.goto('about:blank')
    kall.length = 0
    await ada.goto(`${miljo.url}/#/`)
    await paForsiden(ada).waitFor({ timeout: 30_000 })
    await panelrader(ada, 'Oppdaterte fagsider')
    await vent(2_000)
    const n = kall.filter((k) => k === 'forsideoppsummering').length
    krev(n <= 4, `forsideoppsummering kalt ${n} ganger: ${kall.join(', ')}`)
    return `${n} kall til forsideoppsummering, ${kall.length} kall i alt`
  })

  // --- Navigasjon -------------------------------------------------------------
  await punkt('N1 fortolkningen: Escape går trinn for trinn til søket og stopper der; «Til forsiden» går hjem', async () => {
    await paForsiden(ada).click()
    await sokefelt(ada).first().fill('cital')
    await ada.keyboard.press('Enter')
    await innen(10_000, 'en analytt valgt', async () => /^#\/fortolkning\/.+/.test(hash(ada)))
    const analytt = hash(ada)
    await bilde(ada, '07-fortolkning-pc')
    for (let i = 0; i < 8 && hash(ada) !== '#/fortolkning'; i++) {
      await ada.keyboard.press('Escape')
      await vent(300)
    }
    krev(hash(ada) === '#/fortolkning', `etter Escape: ${hash(ada)}`)
    for (let i = 0; i < 3; i++) await ada.keyboard.press('Escape')
    await vent(500)
    krev(hash(ada) === '#/fortolkning', `ekstra Escape gikk til ${hash(ada)}`)
    await ada.getByRole('button', { name: 'Til forsiden' }).click()
    await innen(5_000, 'forsiden', async () => hash(ada) === '#/')
    return analytt
  })

  await punkt('N2 Escape i hovedmenyen og chatmenyen over en fortolkning lukker bare laget', async () => {
    await fraForsiden(ada)
    await paForsiden(ada).click()
    await sokefelt(ada).first().fill('cital')
    await ada.keyboard.press('Enter')
    await innen(10_000, 'en analytt valgt', async () => /^#\/fortolkning\/.+/.test(hash(ada)))
    const analytt = hash(ada)
    await ada.keyboard.press('Control+m')
    await innen(3_000, 'hovedmenyen åpen', () => hovedmenyApen(ada))
    await ada.keyboard.press('Escape')
    await innen(3_000, 'hovedmenyen lukket', async () => !(await hovedmenyApen(ada)))
    krev(hash(ada) === analytt, `hovedmenyen: ${hash(ada)}`)
    await ada.locator('.chatboble').click()
    const meny = ada.getByRole('complementary', { name: 'Grupper og samtaler' })
    await meny.getByRole('region', { name: 'Samtaler' }).waitFor({ timeout: 10_000 })
    await innen(3_000, 'fokus i chatmenyen', async () => ada.evaluate(() => !!document.activeElement?.closest('.chatmeny')))
    await ada.keyboard.press('Escape')
    await vent(500)
    krev(hash(ada) === analytt, `chatmenyen: ${hash(ada)}`)
    const sluppet: boolean = await ada.evaluate(() => !document.activeElement?.closest('.chatmeny'))
    krev(sluppet && (await meny.isVisible()), 'Escape slapp ikke fokus, eller menyen lukket seg')
    await meny.getByRole('button', { name: 'Lukk chatten' }).click()
  })

  await punkt('N3 nettleserens tilbake og fram mellom forside, søk, fortolkning, grupper, gruppe og chat', async () => {
    await fraForsiden(ada)
    await paForsiden(ada).waitFor({ timeout: 30_000 })
    const besokt = [hash(ada)]
    await paForsiden(ada).click()
    await innen(5_000, 'søket', async () => hash(ada) === '#/fortolkning')
    besokt.push(hash(ada))
    await sokefelt(ada).first().fill('cital')
    await ada.keyboard.press('Enter')
    await innen(10_000, 'analytten', async () => /^#\/fortolkning\/.+/.test(hash(ada)))
    besokt.push(hash(ada))
    await ada.keyboard.press('Control+m')
    await innen(3_000, 'hovedmenyen åpen', () => hovedmenyApen(ada))
    await ada.getByRole('navigation', { name: 'Meny' }).getByRole('link', { name: /^Grupper/ }).click()
    await innen(5_000, 'gruppene', async () => hash(ada) === '#/grupper')
    besokt.push(hash(ada))
    await ada.getByRole('link', { name: navn.tvers }).first().click()
    await innen(5_000, 'gruppen', async () => hash(ada) === `#/grupper/${tvers}`)
    besokt.push(hash(ada))
    await ada.getByRole('button', { name: 'Åpne chat' }).click()
    const meny = ada.getByRole('complementary', { name: 'Grupper og samtaler' })
    await meny.getByRole('button', { name: 'Utvid' }).click()
    await innen(5_000, 'helsiden', async () => hash(ada).startsWith('#/chat'))
    besokt.push(hash(ada))
    for (let i = besokt.length - 2; i >= 0; i--) {
      await ada.goBack()
      await innen(5_000, `tilbake til ${besokt[i]}`, async () => hash(ada) === besokt[i])
    }
    for (let i = 1; i < besokt.length; i++) {
      await ada.goForward()
      await innen(5_000, `fram til ${besokt[i]}`, async () => hash(ada) === besokt[i])
    }
    await ada.getByRole('main', { name: 'Grupper og samtaler' }).waitFor({ timeout: 10_000 })
    await ada.keyboard.press('Escape')
    await innen(5_000, 'gjenopprettet', async () => hash(ada) === `#/grupper/${tvers}`)
    await meny.getByRole('button', { name: 'Lukk chatten' }).click()
    return besokt.join(' → ')
  })

  await punkt('N4 Tilbake etter inngangsveien: fra forsiden, og trygg reserve ved direkte lenke', async () => {
    await fraForsiden(ada)
    await ada.goto(`${miljo.url}/#/`)
    await paForsiden(ada).waitFor({ timeout: 30_000 })
    await panel(ada, 'Mine grupper').getByRole('link', { name: 'Alle grupper' }).click()
    await innen(5_000, 'gruppene', async () => hash(ada) === '#/grupper')
    // Escape hører siden til når den står der (den lastes første gang den åpnes).
    await ada.getByRole('heading', { name: 'Grupper', level: 1 }).waitFor({ timeout: 10_000 })
    await ada.keyboard.press('Escape')
    await innen(5_000, 'forsiden', async () => hash(ada) === '#/')
    const ny: Side = paa(await avslag.lytt(await miljo.brukerside('qa-d7-ada', pw.ada, PC)))
    await ny.goto(`${miljo.url}/#/grupper/${tvers}`)
    await ny.getByRole('heading', { name: navn.tvers }).waitFor({ timeout: 30_000 })
    await ny.keyboard.press('Escape')
    await innen(5_000, 'reserven er gruppene', async () => hash(ny) === '#/grupper')
    await ny.goto('about:blank')
    await ny.goto(`${miljo.url}/#/stoffregister`)
    await ny.locator('h1.identitet__navn').waitFor({ timeout: 30_000 })
    await ny.keyboard.press('Escape')
    await innen(5_000, 'reserven er forsiden', async () => hash(ny) === '#/')
    await ny.context().close()
    paa(ada)
  })

  await punkt('N5 gamle adresser: analytt, gruppechat, idé og ukjent side', async () => {
    await fraForsiden(ada)
    const m: string[] = []
    await ada.goto(`${miljo.url}/#/analytt/CITAL`)
    await innen(10_000, 'analyttlenken skrives om', async () => hash(ada) === '#/fortolkning/cital')
    m.push(hash(ada))
    await ada.goto(`${miljo.url}/#/grupper/${tvers}/chat`)
    await innen(10_000, 'chatlenken skrives om', async () => hash(ada) === `#/grupper/${tvers}`)
    const meny = ada.getByRole('complementary', { name: 'Grupper og samtaler' })
    await meny.getByRole('log').waitFor({ timeout: 10_000 })
    m.push(hash(ada))
    await meny.getByRole('button', { name: 'Lukk chatten' }).click()
    await ada.goto(`${miljo.url}/#/ide/${ide}`)
    await ada.getByRole('dialog').getByText(ideTittel).locator('visible=true').first().waitFor({ timeout: 15_000 })
    m.push(hash(ada))
    await ada.keyboard.press('Escape')
    await ada.goto(`${miljo.url}/#/finnes-ikke/${tid}`)
    await ada.getByRole('heading', { name: 'Siden finnes ikke' }).waitFor({ timeout: 10_000 })
    krev(hash(ada) === `#/finnes-ikke/${tid}`, `adressen endret til ${hash(ada)}`)
    await bilde(ada, '08-ukjent-side-pc')
    await ada.getByRole('button', { name: 'Til forsiden' }).click()
    await innen(5_000, 'forsiden', async () => hash(ada) === '#/')
    return m.join(' | ')
  })

  // --- Grupper ----------------------------------------------------------------
  await punkt('G1 gruppeoversikten: invitasjonen først, kompakt liste, «Opprett gruppe» som vindu', async () => {
    await fraForsiden(ada)
    await ada.goto(`${miljo.url}/#/grupper`)
    const inv = ada.getByRole('region', { name: 'Invitasjoner' })
    await inv.waitFor({ timeout: 15_000 })
    krev(await inv.getByRole('button', { name: `Godta invitasjonen til ${navn.invitert}` }).isVisible(), 'Godta')
    krev(await inv.getByRole('button', { name: `Avslå invitasjonen til ${navn.invitert}` }).isVisible(), 'Avslå')
    const forst: boolean = await ada.evaluate(() => {
      const i = document.querySelector('[aria-label="Invitasjoner"]')
      const l = document.querySelector('.gruppeside__del:not([aria-label="Invitasjoner"])')
      return !!i && !!l && !!(i.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING)
    })
    krev(forst, 'invitasjonene står ikke først')
    krev((await ada.locator('main form').count()) === 0, 'et skjema står åpent på siden')
    await bilde(ada, '09-grupper-pc')
    const kanOpprette = await ada.getByRole('button', { name: 'Opprett gruppe' }).count()
    if (kanOpprette) {
      await ada.getByRole('button', { name: 'Opprett gruppe' }).click()
      await ada.getByRole('dialog', { name: 'Opprett gruppe' }).waitFor()
      await ada.keyboard.press('Escape')
      await innen(3_000, 'vinduet lukket', async () => (await ada.locator('dialog[open]').count()) === 0)
    }
    return kanOpprette ? 'Opprett gruppe er et vindu' : 'Ada kan ikke opprette grupper (knappen vises ikke)'
  })

  await punkt('G2 gruppesiden: ingen fanerad, høyst tre i Siste aktivitet, fire korte panel og kompakt medlemslinje', async () => {
    await fraForsiden(ada)
    await ada.goto(`${miljo.url}/#/grupper/${tvers}`)
    await ada.getByRole('heading', { name: navn.tvers }).waitFor({ timeout: 15_000 })
    krev((await ada.getByRole('tablist').count()) === 0, 'fanerad på gruppesiden')
    const aktivitet = (await panelrader(ada, 'Siste aktivitet'))
    krev(aktivitet.length > 0 && aktivitet.length <= 3, `Siste aktivitet har ${aktivitet.length} rader`)
    for (const t of ['Idéer', 'Oppgaver', 'Diskusjoner', 'Gruppechat']) krev((await ada.getByRole('heading', { name: t, exact: true }).count()) > 0, `panelet ${t}`)
    await ada.getByRole('button', { name: /Vis medlemmer/ }).click()
    await ada.getByRole('dialog', { name: 'Medlemmer' }).waitFor()
    await bilde(ada, '10-medlemmer-pc')
    await ada.keyboard.press('Escape')
    await bilde(ada, '11-gruppeside-pc')
    return aktivitet.map((r) => r.split('\n')[0]).join(' | ')
  })

  await punkt('G3 aktiviteten åpner riktig idé i arbeidsflaten; Escape tilbake; ulagret tekst gir advarsel', async () => {
    await fraForsiden(ada)
    await ada.goto(`${miljo.url}/#/grupper/${tvers}`)
    await panel(ada, 'Siste aktivitet').getByRole('link', { name: new RegExp(ideTittel) }).first().click()
    await innen(10_000, 'idéen', async () => hash(ada) === `#/grupper/${tvers}/ideer/${ide}`)
    const flate = ada.getByRole('dialog', { name: `Idéer for ${navn.tvers}` })
    await flate.waitFor()
    await flate.getByText(ideTittel).locator('visible=true').first().waitFor()
    await bilde(ada, '12-arbeidsflate-ide-pc')
    await ada.keyboard.press('Escape')
    await innen(5_000, 'gruppesiden', async () => hash(ada) === `#/grupper/${tvers}`)
    await ada.getByRole('link', { name: 'Åpne idéer' }).click()
    await flate.waitFor()
    await flate.getByRole('button', { name: 'Ny idé' }).click()
    await flate.getByRole('form', { name: 'Ny idé' }).getByLabel('Overskrift', { exact: true }).locator('visible=true').first().fill('Syntetisk utkast som ikke er lagret')
    await ada.keyboard.press('Escape')
    await ada.getByText('Du har endringer som ikke er lagret.').waitFor({ timeout: 3_000 })
    krev(hash(ada).startsWith(`#/grupper/${tvers}/ideer`), `adressen etter Escape: ${hash(ada)}`)
    await bilde(ada, '13-ulagret-pc')
    // «Forkast» fullfører lukkingen Escape begynte: tilbake til gruppesiden.
    await ada.getByRole('button', { name: /^Forkast/ }).click()
    await innen(5_000, 'gruppesiden', async () => hash(ada) === `#/grupper/${tvers}`)
  })

  await punkt('G4 arkivert gruppe: bare systemarkitekten leser den, i lesemodus; medlemmet ser den ikke, heller ikke på forsiden', async () => {
    await ada.goto(`${miljo.url}/#/grupper/${arkiv}`)
    await ada.getByText('Gruppen finnes ikke, eller du har ikke tilgang til den.').waitFor({ timeout: 15_000 })
    krev(!(await sidetekst(ada)).includes(navn.arkiv), 'medlemmet ser navnet')
    const arkitekt: Side = paa(await avslag.lytt(await miljo.brukerside('qa-admin', adminpassord, PC)))
    await arkitekt.goto(`${miljo.url}/#/grupper/${arkiv}`)
    await arkitekt.getByRole('note').getByText(/Gruppen er arkivert/).waitFor({ timeout: 15_000 })
    krev((await arkitekt.getByRole('button', { name: 'Åpne diskusjoner' }).count()) === 0, 'diskusjonene kan åpnes')
    await bilde(arkitekt, '14-arkivert-arkitekt-pc')
    await arkitekt.context().close()
    paa(ada)
  })

  // --- Rettigheter og lekkasje --------------------------------------------------
  await punkt('R2 chataktivitet øker ikke bjella', async () => {
    await fraForsiden(ada)
    await ada.goto(`${miljo.url}/#/`)
    await paForsiden(ada).waitFor({ timeout: 30_000 })
    await vent(2_000)
    const bjella = ada.getByRole('button', { name: /^Varsler/ }).first()
    const for_ = await bjella.getAttribute('aria-label')
    const uleste = async () => Number(/\((\d+) ulest/.exec((await ada.locator('.chatboble').getAttribute('aria-label')) ?? '')?.[1] ?? 0)
    const ulesteFor = await uleste()
    await rpc(boK, 'send_gruppemelding', { gruppe: tvers, klient_id: crypto.randomUUID(), tekst: 'Syntetisk melding nummer to' })
    await innen(15_000, 'chatboblen teller én til', async () => (await uleste()) === ulesteFor + 1)
    krev((await bjella.getAttribute('aria-label')) === for_, `bjella endret seg: ${for_} → ${await bjella.getAttribute('aria-label')}`)
  })

  await punkt('R3 en vanlig bruker som åpner verktøyene (bare for administratorer), havner på forsiden', async () => {
    await fraForsiden(ada)
    await ada.goto(`${miljo.url}/#/verktoy`)
    await innen(10_000, 'forsiden', async () => hash(ada) === '#/')
  })

  // --- Mørkt tema, nettbrett og mobil ---------------------------------------------
  await punkt('U1 mørkt tema på PC: forside, gruppe og arbeidsflate', async () => {
    await ada.emulateMedia({ colorScheme: 'dark' })
    await ada.goto(`${miljo.url}/#/`)
    await paForsiden(ada).waitFor({ timeout: 30_000 })
    await panelrader(ada, 'Mine grupper')
    await bilde(ada, '16-forside-pc-moerkt')
    await ada.goto(`${miljo.url}/#/grupper/${tvers}`)
    await panelrader(ada, 'Siste aktivitet')
    await bilde(ada, '17-gruppeside-pc-moerkt')
    await ada.goto(`${miljo.url}/#/grupper/${tvers}/oppgaver/${oppgave}`)
    await ada.getByRole('dialog').getByText(oppgaveTittel).locator('visible=true').first().waitFor({ timeout: 10_000 })
    await bilde(ada, '18-arbeidsflate-pc-moerkt')
    await ada.emulateMedia({ colorScheme: 'light' })
  })

  for (const [geraet, valg, kort] of [['nettbrett', NETTBRETT, 'nettbrett'], ['mobil', MOBIL, 'mobil']] as const) {
    await punkt(`U2 ${geraet}: én kolonne, ingen siderulling, tastene store nok, lyst og mørkt`, async () => {
      const side: Side = paa(await avslag.lytt(await miljo.brukerside('qa-d7-ada', pw.ada, valg)))
      const sider: [string, string, () => Promise<unknown>][] = [
        ['forside', '#/', () => panelrader(side, 'Mine grupper')],
        ['grupper', '#/grupper', () => side.getByRole('region', { name: 'Invitasjoner' }).waitFor({ timeout: 15_000 })],
        ['gruppe', `#/grupper/${tvers}`, () => panelrader(side, 'Siste aktivitet')],
        ['arbeidsflate', `#/grupper/${tvers}/ideer/${ide}`, () => side.getByRole('dialog').getByText(ideTittel).locator('visible=true').first().waitFor({ timeout: 15_000 })],
        ['fortolkning', '#/fortolkning', () => sokefelt(side).first().waitFor({ timeout: 15_000 })],
        ['chat', `#/chat/gruppe/${tvers}`, () => side.getByRole('log').waitFor({ timeout: 15_000 })],
      ]
      const merknader: string[] = []
      for (const [navnet, adresse, klar] of sider) {
        await side.goto(`${miljo.url}/${adresse}`)
        await klar()
        await vent(500)
        await utenSiderulling(side, `${geraet} ${navnet}`)
        if (navnet === 'forside') {
          const kolonner: number = await side.locator('.forside__paneler section.oppsummering').evaluateAll((e: Element[]) => new Set(e.map((x) => Math.round(x.getBoundingClientRect().left))).size)
          krev(kolonner === 1, `forsiden har ${kolonner} kolonner`)
          const hoyde: number = await paForsiden(side).evaluate((e: Element) => e.getBoundingClientRect().height)
          krev(hoyde >= 40, `«Åpne fortolkning» er ${hoyde} px høy`)
          merknader.push(`knapp ${Math.round(hoyde)} px`)
        }
        await bilde(side, `19-${kort}-${navnet}`)
        await side.emulateMedia({ colorScheme: 'dark' })
        await vent(300)
        await bilde(side, `20-${kort}-${navnet}-moerkt`)
        await side.emulateMedia({ colorScheme: 'light' })
      }
      await side.context().close()
      paa(ada)
      return merknader.join(', ')
    })
  }

  // Sist, fordi testmiljøet stopper kjøringen ved første svar med 5xx (`trafikkvakt.ts`).
  await punkt('R1 en som ikke er med i gruppen, ser ingenting av den: side, arbeidsflate, idé, chat og forside', async () => {
    const cy: Side = paa(await avslag.lytt(await miljo.brukerside('qa-d7-cy', pw.cy, PC)))
    const lekker = async (hvor: string) => {
      await vent(2_500)
      const t = await sidetekst(cy)
      krev(!t.includes(navn.tvers) && !t.includes(ideTittel), `${hvor} viser gruppen eller idéen`)
    }
    await paForsiden(cy).waitFor({ timeout: 30_000 })
    await lekker('forsiden')
    for (const adresse of [`#/grupper/${tvers}`, `#/grupper/${tvers}/ideer/${ide}`, `#/grupper/${tvers}/oppgaver/${oppgave}`, `#/ide/${ide}`, `#/chat/gruppe/${tvers}`, `#/chat/direkte/${crypto.randomUUID()}`]) {
      await cy.goto(`${miljo.url}/${adresse}`)
      await lekker(adresse)
    }
    await bilde(cy, '15-uten-tilgang-pc')
    await cy.context().close()
    paa(ada)
  })

  await punkt('X ingen svar med 5xx fra databasen underveis', async () => {
    return avslag.rapport()
  })
} catch (e) {
  oppsettFeilet(e)
} finally {
  tilbakestillBrytere()
  await miljo.avslutt()
  rapport()
}
