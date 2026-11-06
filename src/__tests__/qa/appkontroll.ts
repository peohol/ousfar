/**
 * Brukerforløpene i {@link BRUKERFORLOP} kjørt i den publiserte appen, som en
 * administrator ville gjort det i firestegsflyten: velge virkestoff og
 * formulering (steg 1), skrive dosen og måldosen og velge legemiddelform der
 * siden ikke har valgt selv (steg 2), svare på spørsmålene og krysse av
 * bekreftelsene (steg 3), og lese planen og kopien i steg 4. Planen beregnes
 * av seg selv når alt er besvart; det finnes ingen «Beregn»-knapp. Resultatet
 * sammenlignes med den lokale kjøringen mot de lagrede FEST-uttrekkene; appen
 * bruker dagens FEST, så et avvik i preparatene kan være en reell endring i
 * FEST og vurderes for seg. Til slutt prøves nødstoppen og FEST-kontrollen
 * ({@link SIKKERHETSKONTROLLER}).
 *
 * Bare lesing: ingen plan, sperre eller innstilling lagres. Kjøres med
 * `npx vite-node src/__tests__/qa/appkontroll.ts` når APP_URL,
 * BOOTSTRAP_ADMIN_USERNAME og BOOTSTRAP_ADMIN_PASSWORD er satt, og skriver
 * {@link APPKONTROLL}. Ikke en del av `npm test`, fordi den trenger nett og
 * innlogging.
 */
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { FEST_FORELDET_ETTER_TIMER } from '../../legemiddeldata/referanser'
import { flytoppsett, klassifiser } from '../../verktoy/flyt'
import { jaVed, type Betingelsestype } from '../../verktoy/flyt/sporsmal'
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

/** Tidslinjen i planpanelet («Planen dag for dag»). */
const TIDSLINJE = 'ul[aria-label="Planen dag for dag"], ol[aria-label="Planen dag for dag"]'

/** Det planpanelet (steg 4) viser mens noe hentes eller beregnes. */
const ARBEIDER = /Henter preparatene|Beregner planen|Kontrollerer/

/**
 * Venter til planpanelet har stått i ro: ingenting hentes eller beregnes, og
 * teksten har vært den samme i et sekund. Planen beregnes av seg selv når alt
 * er besvart, så det finnes ingen knapp å vente på.
 */
async function iRo(p: Side) {
  const panel = p.getByRole('region', { name: /^Steg 4: / })
  let forrige = ''
  let stabil = 0
  for (let i = 0; i < 120; i++) {
    await p.waitForTimeout(250)
    const tekst = ((await panel.innerText().catch(() => '')) as string).trim()
    if (ARBEIDER.test(tekst) || tekst !== forrige) {
      forrige = tekst
      stabil = 0
      continue
    }
    if (++stabil >= 4) return
  }
}

/**
 * Tidslinjen slik den ses, i tabellform (`tidslinjetekst` i
 * `src/__tests__/hjelp/verktoyflyt.ts`): kolonneoverskriftene og én rad per
 * punkt med tiden og én celle per legemiddel. Kjøres i nettleseren, så den er
 * selvstendig.
 */
function lesTidslinje(liste: Element): Tidslinje {
  const enLinje = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()
  const navn = new Map<number, string>()
  for (const el of liste.querySelectorAll('[data-kolonne]')) {
    const k = Number(el.getAttribute('data-kolonne'))
    const n = el.querySelector(':scope > .tidslinje__navn, :scope > .kun-skjermleser')
    if (n && !navn.has(k)) navn.set(k, enLinje(n))
  }
  const antall = Math.max(-1, ...navn.keys()) + 1
  const koloner = ['Når', ...Array.from({ length: antall }, (_, k) => navn.get(k) ?? '')]
  const rader = [...liste.children].map((li) => {
    const type = li.getAttribute('data-type') === 'slutt' ? 'periode' : li.getAttribute('data-type')
    const nar = [...li.querySelector('.tidslinje__nar')!.children].map((x) => x.textContent ?? '').join('')
    const celler = Array.from({ length: antall }, (_, k) => {
      const celle = li.querySelector(`.tidslinje__innhold [data-kolonne="${k}"]`)
      if (!celle) return type === 'periode' ? '–' : ''
      if (type === 'vurdering') {
        const etikett = celle.querySelector('strong')?.textContent ?? ''
        return `Vurdering ${(celle.textContent ?? '').slice(etikett.length).trim()}`
      }
      const kopi = celle.cloneNode(true) as Element
      kopi.querySelectorAll(':scope > .tidslinje__navn, :scope > .kun-skjermleser, :scope > .tidslinje__skifte').forEach((x) => x.remove())
      kopi.querySelectorAll('.tidslinje__dose').forEach((x) => (x.textContent = enLinje(x)))
      return kopi.textContent ?? ''
    })
    return [nar, ...celler]
  })
  return { koloner, rader }
}

/**
 * Velger en radioknapp eller krysser av en boks. Siden regner flyten på nytt
 * etter hvert svar og kan tegne valget om mens det klikkes, så det prøves
 * igjen til valget står. Gir om noe ble endret.
 */
async function sett(x: Side): Promise<boolean> {
  if (await x.isChecked()) return false
  for (let forsok = 0; forsok < 5; forsok++) {
    await x.click()
    for (let i = 0; i < 6; i++) {
      if (await x.isChecked()) return true
      await x.page().waitForTimeout(100)
    }
  }
  throw new Error(`Valget ${await x.evaluate((e: Element) => e.outerHTML.slice(0, 120))} står ikke etter fem klikk`)
}

/** Velger legemiddelformene: de forløpet ønsker når siden tilbyr dem; ellers tablett, eller det første, der siden ikke har valgt selv. */
async function velgFormer(p: Side, onsket: (string | undefined)[]) {
  const grupper = await p.getByRole('radiogroup', { name: /^Legemiddelform av / }).all()
  for (const [i, g] of grupper.entries()) {
    const radioer = await g.getByRole('radio').all()
    const verdier: string[] = await Promise.all(radioer.map((r: Side) => r.getAttribute('value')))
    const valgt = (await Promise.all(radioer.map((r: Side) => r.isChecked()))).some(Boolean)
    const mal = onsket[i] && verdier.includes(onsket[i]!) ? onsket[i] : valgt ? undefined : (['53', verdier[0]].find((x) => x && verdier.includes(x)) ?? undefined)
    if (mal) await sett(radioer[verdier.indexOf(mal)]!)
  }
  return grupper.length > 0
}

/**
 * Svarene i flyten som gir de samme motorinndataene som den lokale kjøringen:
 * for hvert spørsmål og unntak forløpet svarer ja på, svaret som gjør
 * betingelsen sann på spørsmålet (eller spørsmålene) i flyten den avgjøres av.
 * Katalogen gir spørsmålene i flyten egne id-er, så id-en i regelen kan ikke
 * brukes direkte.
 */
function flytsvarFor(r: Forlopsresultat): Record<string, string> {
  if (!r.regel) return {}
  const oppsett = flytoppsett(r.regel)
  const sanne = (type: Betingelsestype, x: Readonly<Record<string, boolean>> | undefined) => Object.entries(x ?? {}).flatMap(([id, v]) => (v ? [[type, id] as const] : []))
  const ut: Record<string, string> = {}
  for (const [type, id] of [...sanne('sporsmal', r.skjema?.svar), ...sanne('unntak', r.skjema?.pasientforhold)]) {
    const a = oppsett.avbildninger.find((x) => x.type === type && x.id === id)
    if (!a) throw new Error(`Flyten avgjør ikke ${type} ${id} i ${r.regel.id}`)
    for (const k of a.kombinasjon === 'en' ? a.fra.slice(0, 1) : a.fra) ut[k.sporsmal] = jaVed(k)[0]!
  }
  return ut
}

/**
 * Svarer på spørsmålene i steg 3 slik den lokale kjøringen gjør: svarene i
 * `onsket` ({@link flytsvarFor}), nei på hvert annet forhold, ja der siden
 * sier at nei stopper planen (en forutsetning), standardsvaret (Ja, 18–64 år)
 * der svaret ikke er ja/nei, og kryss ved hver bekreftelse. Et svar kan vise
 * nye spørsmål, så det fortsetter til ingenting endres.
 */
/** Id-ene til spørsmålene som vises nå. */
const ider = (p: Side): Promise<string[]> => p.$$eval('[data-flytsporsmal]', (x: Element[]) => x.map((e) => e.getAttribute('data-flytsporsmal') ?? ''))

async function besvar(p: Side, onsket: Readonly<Record<string, string>>) {
  const snudd = new Set<string>()
  for (let runde = 0; runde < 20; runde++) {
    let endret = false
    // Spørsmålene leses på nytt etter hvert svar, fordi et svar kan vise eller skjule andre.
    for (const id of await ider(p)) {
      const li = p.locator(`[data-flytsporsmal="${id}"]`)
      if ((await li.count()) === 0) continue
      const boks = li.locator('input[type=checkbox]')
      if ((await boks.count()) > 0) {
        if (await sett(boks)) endret = true
        continue
      }
      const radioer = await li.getByRole('radio').all()
      if (id in onsket) {
        const radio = li.locator(`input[type=radio][value="${onsket[id]}"]`)
        if ((await radio.count()) === 0) throw new Error(`Spørsmålet ${id} har ikke svaret ${onsket[id]}`)
        if (await sett(radio)) endret = true
        continue
      }
      const tekster: string[] = await Promise.all(radioer.map(async (r: Side) => ((await r.evaluate((x: HTMLInputElement) => x.parentElement?.textContent ?? '')) as string).trim()))
      const finn = (m: RegExp) => tekster.findIndex((t) => m.test(t))
      const i = snudd.has(id) ? finn(/^(Ja|Gjelder)$/) : [finn(/^(Nei|Gjelder ikke)$/), finn(/^Ja$/), finn(/^18–64 år$/)].find((x) => x >= 0)
      if (i === undefined || i < 0) throw new Error(`Vet ikke hva som skal svares på spørsmålet ${id} (${tekster.join(' / ')})`)
      if (await sett(radioer[i]!)) endret = true
    }
    await p.waitForTimeout(400)
    // Et nei som stopper planen (merknaden uten «Ukjent»-tone), snus til ja: spørsmålet spør om en forutsetning.
    for (const id of await ider(p)) {
      const li = p.locator(`[data-flytsporsmal="${id}"]`)
      if (id in onsket || snudd.has(id) || (await li.locator('.sporsmal__merknad:not([data-tone])').count()) === 0) continue
      const nei = li.getByRole('radio', { name: /^(Nei|Gjelder ikke)$/ })
      if ((await nei.count()) === 0 || !(await nei.isChecked())) continue
      snudd.add(id)
      endret = true
    }
    if (!endret) return
  }
}

async function kjorIApp(p: Side, url: string, r: Forlopsresultat): Promise<Appresultat> {
  const f = r.forlop
  const verktoy = r.verktoy!
  const skjema = r.skjema ?? {}
  // Siden laster helt på nytt for hvert forløp, så ingen valg eller skjemaverdier fra forrige forløp følger med; innloggingen står.
  await p.goto('about:blank')
  await p.goto(`${url}/#/verktoy/${verktoy.id}`, { waitUntil: 'networkidle' })
  await p.waitForSelector('text=/Kontrollerer/', { state: 'detached', timeout: 20_000 }).catch(() => undefined)
  // Steg 1: virkestoffene og formuleringen.
  const stoff = (n: string) => virkestoffvalg(verktoy).find((v) => v.nokkel === n)!
  const tekster = VALGTEKSTER[verktoy.type]
  const velg = async (etikett: string, nokkel: string, formulering: keyof typeof FORMULERINGSNAVN) => {
    const v = stoff(nokkel)
    await p.getByRole('combobox', { name: etikett }).fill(v.navn)
    if (v.formuleringer.length > 1)
      await sett(p.getByRole('group', { name: `Formulering av ${v.navn.toLowerCase()} (${etikett.toLowerCase()})` }).getByRole('radio', { name: FORMULERINGSNAVN[formulering], exact: true }))
  }
  await velg(tekster.fra, f.valg.fra.nokkel, f.valg.fra.formulering)
  if (tekster.til) await velg(tekster.til, f.valg.til!.nokkel, f.valg.til!.formulering)
  await iRo(p)
  // Med flere godkjente fremgangsmåter velges den samme regelen som i den lokale kjøringen.
  const fremgangsmate = p.getByRole('group', { name: 'Fremgangsmåte' })
  if (r.regel && (await fremgangsmate.count()) > 0) {
    await sett(fremgangsmate.getByRole('radio', { name: r.regel.tittel, exact: true }))
    await iRo(p)
  }
  const panel = p.getByRole('region', { name: /^Steg 4: / })
  const dose = p.getByRole('textbox', { name: /^Aktuell (døgn)?dose av / })
  // Uten plan: hele teksten i steg 4, med detaljene (den tekniske grunnen) åpnet.
  const ingenPlan = async (ekstra: Partial<Appresultat> = {}) => {
    await panel
      .locator('details')
      .evaluateAll((ds: HTMLDetailsElement[]) => ds.forEach((d) => (d.open = true)))
      .catch(() => undefined)
    return { tabell: false, tekst: (await panel.innerText().catch(() => '')) as string, ...ekstra }
  }
  if ((await dose.count()) === 0) return ingenPlan()

  // Steg 2: dosen, måldosen og legemiddelformen.
  await dose.fill(f.dose)
  const maldose = p.getByRole('textbox', { name: /^Måldose av / })
  await p.waitForTimeout(300)
  if (skjema.maldose && (await maldose.count()) > 0) await maldose.fill(skjema.maldose)
  await iRo(p)
  // Formbytte: først formen siden foreslår (eller tablett), så den forskriveren bytter til.
  const onsket = f.formbytte ? [] : [skjema.formvalg?.fra?.legemiddelform, skjema.formvalg?.til?.legemiddelform]
  await velgFormer(p, onsket)
  await iRo(p)

  // Steg 3: spørsmålene og bekreftelsene; planen beregnes av seg selv når alt er besvart.
  const svar = flytsvarFor(r)
  await besvar(p, svar)
  if (skjema.begrunnelse) {
    const felt = p.getByRole('textbox', { name: 'Begrunnelse for valgene' })
    if ((await felt.count()) > 0) await felt.fill(skjema.begrunnelse)
  }
  await iRo(p)
  let planForBytte: boolean | undefined
  if (f.formbytte) {
    planForBytte = (await p.locator(TIDSLINJE).count()) > 0
    await velgFormer(p, [f.formbytte])
    await iRo(p)
    await besvar(p, svar)
    await iRo(p)
  }
  // Der siden lar forskriveren velge dosen for et trinn, velges den samme dosen som i den lokale kjøringen (første eller siste).
  const trinn = p.getByRole('region', { name: 'Doser som kan velges' })
  for (let n = 0; n < r.trinnvalg.length && (await trinn.count()) > 0; n++) {
    const knapper = trinn.getByRole('group').first().getByRole('button')
    await (f.trinn === 'siste' ? knapper.last() : knapper.first()).click()
    await iRo(p)
  }
  const ekstra = planForBytte === undefined ? {} : { planForBytte }
  const liste = p.locator(TIDSLINJE).first()
  if ((await p.locator(TIDSLINJE).count()) === 0) return ingenPlan(ekstra)
  const tidslinje = (await liste.evaluate(lesTidslinje)) as Tidslinje
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
 * Kopien uten «Forutsatt»-delen, og linjene i den. Flyten i appen legger de
 * avledede svarene og forbeholdene den har lagt til grunn i en egen del etter
 * planen (`planTekst`, §4.1); den lokale kjøringen setter motorfeltene direkte
 * og har ikke den delen.
 */
function utenForutsatt(linjer: readonly string[]) {
  const start = linjer.indexOf('Forutsatt:')
  if (start < 0) return { app: [...linjer], forutsatt: [] }
  const slutt = linjer.findIndex((l, i) => i > start && !l.startsWith('- '))
  const til = slutt < 0 ? linjer.length : slutt
  // Den tomme linjen foran delen hører til den.
  const fra = start > 0 && linjer[start - 1] === '' ? start - 1 : start
  return { app: [...linjer.slice(0, fra), ...linjer.slice(til)], forutsatt: linjer.slice(start + 1, til).map((l) => l.slice(2)) }
}

/** Hver linje under «Forutsatt» skal være ordrett en bekreftelse i regelen som den lokale kjøringen også har bekreftet. */
function forutsattavvik(r: Forlopsresultat, forutsatt: readonly string[]): string[] {
  // Uten egne bekreftelser bekrefter den lokale kjøringen alle (`besvartSkjema`).
  const bekreftet = new Set(r.skjema?.bekreftet ?? r.regel?.bekreftelser.map((b) => b.id))
  return forutsatt.flatMap((l) => {
    const b = r.regel?.bekreftelser.find((x) => x.tekst === l)
    return b && bekreftet.has(b.id) ? [] : [`appens kopi forutsetter «${l}», som ikke er en bekreftelse den lokale kjøringen har gitt`]
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
    const { app, forutsatt } = utenForutsatt(linjer(a.tekst))
    if (lokal.length === 0) return ['den lokale kjøringen har ingen kopi å sammenligne med']
    return [
      ...bytte,
      ...forutsattavvik(r, forutsatt),
      ...utenMotstykke(lokal, app).map((l) => `«${l}» mangler i appens kopi`),
      ...utenMotstykke(app, lokal).map((l) => `appens kopi har i tillegg «${l}»`),
      ...(a.tidslinje ? tidslinjeavvik(a.tidslinje, a.tekst) : ['appen viser ingen tidslinje å sammenligne kopien med']),
    ]
  }
  if (r.klasse === 'fagtekst') return /Beregning er ikke tilgjengelig/.test(a.tekst) ? ['appen sier at beregning ikke er tilgjengelig, men viser ikke fagteksten'] : []
  return r.vist.length === 0 || r.vist.some((l) => sammeGrunn(l, a.tekst)) ? [] : [`appens tekst gir ikke samme grunn som «${r.vist[0]!.slice(0, 60)}…»`]
}

/** Tallene i en tekst, som «10, 20 mg» eller «10 og 20 mg». */
const tallI = (t: string) => (t.match(/\d+(?:,\d+)?/g) ?? []).join(' ')

/**
 * Om steg 4 i appen gir samme grunn som den lokale stoppgrunnen `lokal`.
 * Motorens egen tekst står bak «Vis detaljer» når beregningen er kjørt; ellers
 * stopper forhåndskontrollen tidligere med en kort forklaring i vanlig språk
 * (§5 i `docs/verktøy-brukervennlighet-2026-11.md`). Da må forklaringen være
 * den samme: de samme tillatte startdosene, eller at ingen komplett plan kan
 * lages når grunnen lokalt er at planen ikke når sluttmålet, at en dose ikke
 * kan gis eller at tilfellet er utenfor omfanget.
 */
export function sammeGrunn(lokal: string, app: string): boolean {
  if (app.includes(lokal.slice(0, 60))) return true
  const start = /^Startdosen [\d,]+ mg er utenfor det regelen gjelder for \(([^)]*)\)/.exec(lokal)
  if (start) {
    const vist = /Regelen gjelder bare startdoser på ([^.]*)\./.exec(app)
    return !!vist && tallI(vist[1]!) === tallI(start[1]!)
  }
  const kode = klassifiser(lokal)
  if (kode === 'ikke_komplett' || kode === 'ingen_dose' || kode === 'utenfor_omfang')
    return /Ingen godkjent regel gir en komplett plan|kan ikke lage en komplett plan|ingen godkjent plan for denne kombinasjonen/.test(app)
  return false
}

/** Forklaringen i steg 4 når appen ikke viser noen plan: linjen etter «Ingen plan …», eller en kjent stopptekst. */
function stopplinje(tekst: string): string | undefined {
  const linjer = tekst
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  const i = linjer.findIndex((l) => /^Ingen plan (for|med) /.test(l))
  return i >= 0 ? linjer[i + 1] : linjer.find((l) => /^(Beregning er ikke tilgjengelig|OUSFAR har ingen regel|Ingen klinisk doseplan|Verktøyet kan ikke|Med dette svaret)|kan ikke gis/.test(l))
}

const celle = (x: string) => x.replace(/\|/g, '\\|').replace(/\n/g, ' ')

/** Grunnen i den syntetiske nødstoppen; den lagres ikke, men står i svaret appen får. */
const SPERREGRUNN = 'Syntetisk nødstopp i QA-kontrollen (ikke lagret).'

/** Svaret på `les_legemidler` med FEST-kopien kontrollert `timer` timer før nå (og kildedatoen ikke senere enn det). */
const festKontrollert = (timer: number) => async (rute: Side) => {
  const svar = await rute.fetch()
  const kl = new Date(Date.now() - timer * 3_600_000)
  const endre = (u: Record<string, unknown>) => ({
    ...u,
    kontrollert_kl: kl.toISOString(),
    ...(typeof u.kildedato === 'string' && u.kildedato > kl.toISOString().slice(0, 10) && { kildedato: kl.toISOString().slice(0, 10) }),
  })
  const data = await svar.json()
  await rute.fulfill({ response: svar, json: Array.isArray(data) ? data.map(endre) : endre(data) })
}

/**
 * Sikkerhetsstoppene prøvd i appen på forløp som ellers gir en komplett plan:
 * en nødstopp (`les_verktoysperrer`) og en FEST-kopi som ikke er kontrollert
 * på mer enn 48 timer (`les_legemidler`), og grensen rett under. Svarene
 * endres bare i nettleseren; ingenting lagres.
 */
const SIKKERHETSKONTROLLER: readonly { id: string; hva: string; forlop: string; rute: string; svar: (rute: Side) => Promise<void>; plan: boolean; grunn?: RegExp; kreverGrunn?: boolean }[] = [
  ...['K0-01', 'K0-11'].map((forlop) => ({
    id: `N-${forlop}`,
    hva: 'Nødstopp for alle verktøy',
    forlop,
    rute: '**/rpc/les_verktoysperrer*',
    svar: (r: Side) =>
      r.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'syntetisk', omfang: 'alle', mal: null, grunn: SPERREGRUNN, satt_kl: new Date().toISOString(), satt_av: 'QA' }]),
      }),
    plan: false,
    grunn: new RegExp(SPERREGRUNN.replace(/[.()]/g, '\\$&')),
    // Nødstoppen skal si hvem, når og hvorfor (`Verktoyside`).
    kreverGrunn: true,
  })),
  ...['K0-01', 'H-30'].map((forlop) => ({
    id: `F-${forlop}`,
    hva: 'FEST-kopien kontrollert for 72 timer siden',
    forlop,
    rute: '**/rpc/les_legemidler*',
    svar: festKontrollert(72),
    plan: false,
    grunn: /sist kontrollert mot FEST/,
  })),
  { id: 'F-K0-01-47', hva: 'FEST-kopien kontrollert for 47 timer siden (under grensen på 48)', forlop: 'K0-01', rute: '**/rpc/les_legemidler*', svar: festKontrollert(47), plan: true },
]

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
  const verifiserte: string[] = []
  const nyttForsok: string[] = []
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
      // Et tidsavbrudd når siden lastes, er nettet, ikke appen: forløpet kjøres på nytt fra en tom side, høyst to ganger.
      for (let forsok = 1; ; forsok++) {
        try {
          a = await kjorIApp(side, url, r)
          break
        } catch (e) {
          if (forsok > 2 || !/page\.goto: Timeout/.test(String(e))) throw e
          nyttForsok.push(f.id)
        }
      }
    } catch (e) {
      if (process.env.QA_BILDER) await side.screenshot({ path: `${process.env.QA_BILDER}/${f.id}.png`, fullPage: true }).catch(() => undefined)
      console.log(f.id, 'feilet', String(e).split('\n').slice(0, 8).join(' | '))
      rader.push(`| ${f.id} | ${celle(f.hva)} | ${KLASSENAVN[r.klasse]} | kjøringen feilet: ${celle(String(e).split('\n')[0]!)} | ja |`)
      continue
    }
    const avvik = sammenlign(r, a)
    if (avvik.length > 0 && process.env.QA_BILDER) await side.screenshot({ path: `${process.env.QA_BILDER}/${f.id}.png`, fullPage: true })
    // Tidslinjen og kopien slik appen ga dem, eller teksten i steg 4, for å kunne lese sammenligningen etterpå.
    if (process.env.QA_BILDER)
      writeFileSync(`${process.env.QA_BILDER}/${f.id}.json`, JSON.stringify(a.tabell ? { tidslinje: a.tidslinje, kopi: a.tekst } : { lokalt: r.vist, steg4: a.tekst }, null, 2))
    if (a.tabell && avvik.length === 0) verifiserte.push(f.id)
    const app = a.tabell
      ? 'Plan'
      : celle(
          (r.klasse === 'fagtekst'
            ? a.tekst
                .split('\n')
                .filter((l) => !l.startsWith('Beregnet forslag'))
                .find((l) => l.length > 40)
            : stopplinje(a.tekst)) ?? 'Ingen plan',
        )
    rader.push(`| ${f.id} | ${celle(f.hva)} | ${KLASSENAVN[r.klasse]} | ${app} | ${avvik.length ? celle(avvik.join('; ')) : 'nei'} |`)
    console.log(f.id, KLASSENAVN[r.klasse], a.tabell ? 'plan' : 'ingen plan', avvik.join('; '))
  }
  // Sikkerhetsstoppene: samme forløp med et endret svar fra databasen.
  const sikkerhet: string[] = []
  for (const k of SIKKERHETSKONTROLLER.filter((x) => !bare || bare.includes(x.id) || bare.includes(x.forlop))) {
    const r = kjorForlop(BRUKERFORLOP.find((x) => x.id === k.forlop)!, uttrekk)
    await side.route(k.rute, k.svar)
    let a: Appresultat | undefined
    let feil: string | undefined
    try {
      a = await kjorIApp(side, url, r)
    } catch (e) {
      // En nødstopp kan ta bort skjemaet før forløpet er fylt ut; da er det siden som avgjør.
      feil = String(e).split('\n')[0]
    } finally {
      await side.unroute(k.rute)
    }
    const plan = a?.tabell ?? (await side.locator(TIDSLINJE).count()) > 0
    const tekst =
      ((await side
        .locator('body')
        .innerText()
        .catch(() => '')) as string) + (a?.tekst ?? '')
    const avvik = [
      ...(plan !== k.plan ? [k.plan ? 'appen viser ingen plan' : 'appen viser en plan'] : []),
      ...(k.kreverGrunn && !k.grunn!.test(tekst) ? [`siden nevner ikke ${k.grunn!.source}`] : []),
      ...(k.plan && a?.tabell ? sammenlign(r, a) : []),
    ]
    if (avvik.length > 0 && process.env.QA_BILDER) await side.screenshot({ path: `${process.env.QA_BILDER}/${k.id}.png`, fullPage: true })
    // Grunnen siden gir: linjen som nevner den, ellers den første forklaringen i steg 4.
    const forklaring = stopplinje(a?.tekst ?? '')
    const vist = plan ? 'Plan' : `Ingen plan${feil ? ` (skjemaet stoppet: ${feil})` : ''}`
    const nevnt = !k.grunn
      ? '–'
      : k.grunn.test(tekst)
        ? `ja: «${tekst
            .split('\n')
            .find((l) => k.grunn!.test(l))!
            .trim()}»`
        : `nei${forklaring ? `; steg 4 sier «${forklaring}»` : ''}`
    sikkerhet.push(`| ${k.id} | ${celle(k.hva)} (${k.forlop}) | ${k.plan ? 'Plan' : 'Ingen plan'} | ${vist} | ${celle(nevnt)} | ${avvik.length ? celle(avvik.join('; ')) : 'nei'} |`)
    console.log(k.id, plan ? 'plan' : 'ingen plan', avvik.join('; '))
  }
  await nettleser.close()

  writeFileSync(
    APPKONTROLL,
    [
      '<!-- Laget av `npx vite-node src/__tests__/qa/appkontroll.ts`; rediger ikke for hånd. -->',
      '# OUSFAR Verktøy – brukerforløpene i den publiserte appen',
      '',
      `Kjørt ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC mot ${url} (${versjon}) som administrator, med dagens FEST. Hvert forløp er det samme som i \`docs/verktøy-qa-brukerforlop.md\`, gjennomført i firestegsflyten uten «Beregn»-knapp: syntetiske doser, måldosen forløpet velger, legemiddelformen forløpet velger (ellers den siden har valgt selv, eller tablett), i steg 3 det svaret i flyten som gir forløpets ja, nei på hvert annet forhold, ja der siden sier at nei stopper planen, og kryss ved hver bekreftelse. Planen leses når steg 4 har stått i ro. Siden lastes helt på nytt for hvert forløp. Bare lesing; ingenting er lagret. «Avvik» sammenligner med den lokale kjøringen mot de lagrede FEST-uttrekkene: hele kopien linje for linje, og den synlige tidslinjen (hver rad og celle) mot kopien. Kopien i appen har i tillegg en «Forutsatt»-del med forbeholdene flyten har lagt til grunn; hver linje i den må være ordrett en bekreftelse i regelen som den lokale kjøringen også har gitt, og delen holdes ellers utenfor sammenligningen. Uten plan sammenlignes grunnen i steg 4 (med «Vis detaljer» åpnet) med den lokale: motorens tekst når beregningen er kjørt, ellers forhåndskontrollens korte forklaring med de samme tillatte startdosene, eller at ingen komplett plan kan lages når planen lokalt ikke når sluttmålet.`,
      '',
      `Planer teknisk ende-til-ende-verifisert i appen (hele kopien lik den lokale kjøringen linje for linje, bortsett fra FEST-tidspunktet): **${verifiserte.length}** (${verifiserte.join(', ') || 'ingen'}). Dette er en teknisk verifikasjon med syntetiske data, ikke «klinisk prøveverifisert» (plan §8); det krever i tillegg en faglig gjennomgang av hele doseringsforløpet, kildene og de relevante risikoene.`,
      '',
      ...(nyttForsok.length > 0 ? [`Kjørt på nytt fra en tom side etter tidsavbrudd da siden skulle lastes (nettet, ikke appen): ${[...new Set(nyttForsok)].join(', ')}.`, ''] : []),
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
      '## Nødstopp og FEST-kontroll',
      '',
      `Forløp som ellers gir en komplett plan, med en syntetisk nødstopp («${SPERREGRUNN}») eller en FEST-kopi som oppgis kontrollert for 72 eller 47 timer siden (grensen er ${FEST_FORELDET_ETTER_TIMER} timer). Svaret fra databasen endres bare i nettleseren; ingen sperre eller FEST-data lagres.`,
      '',
      '«Grunnen nevnt» er om siden sier hvorfor det ikke er noen plan (nødstoppens grunn, eller at FEST-kopien ikke er kontrollert på lenge). For nødstoppen er det et krav; for FEST-kopien er det bare registrert, fordi kravet er at ingen plan vises.',
      '',
      '| Id | Situasjon | Ventet | I appen | Grunnen nevnt | Avvik |',
      '| --- | --- | --- | --- | --- | --- |',
      ...sikkerhet,
      '',
    ].join('\n'),
  )
}

await main()
