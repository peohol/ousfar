/**
 * Nettleserkontrollen av forsidens kolonner (issue #534, docs/forside.md):
 * panelene står i to uavhengige kolonner på PC, så et høyt panel til høyre
 * ikke gir tom luft under panelet til venstre, og i én kolonne på mobil, i
 * brukerens rekkefølge. I det lokale testmiljøet (docs/qa-testmiljo.md):
 *   QA_SKJERMBILDER=<mappe> npx vite-node src/__tests__/qa/forsidekolonnenettleser.ts
 *
 * Oppsettet gjør høyre kolonne høy øverst: «Mine grupper» (tre grupper) står
 * som panel nr. 2, de korte panelene som nr. 1, 3 og 5. Panelene flyttes ikke
 * i siden, så tastaturet følger brukerens rekkefølge, og når bredden krysser
 * grensen for én kolonne, står panelene og fokus (F6).
 */
import { randomBytes } from 'node:crypto'
import { arkiverTidligereGrupper, klient, krev, lagKontroll, rpc, vent, type Side } from './kontroll'
import { sikreAdministrator, sikreTestkonto, startLokalDatabase } from './lokalmiljo'
import { apneTestmiljo } from './testmiljo'

const { punkt, bilde, paa, oppsettFeilet, rapport } = lagKontroll('forsidekolonner')
const PREFIKS = 'Kolonnegruppe'
const PC = { viewport: { width: 1440, height: 1000 } }
const NETTBRETT = { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true }
const MOBIL = { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }

/** Brukerens rekkefølge; resten er skjult. */
const SYNLIGE = ['aktuelt', 'grupper', 'oppgaver', 'viktig_nytt', 'favoritter'] as const
const SKJULTE = ['fagsider', 'ideer', 'diskusjoner'] as const

interface Panel {
  tittel: string
  kolonne: number
  x: number
  topp: number
  bunn: number
}

/** Panelene slik siden har dem, i rekkefølgen i dokumentet; kolonnen er nummeret på venstrekanten, fra venstre. */
async function paneler(side: Side): Promise<Panel[]> {
  await side.locator('.forside__paneler section.oppsummering[aria-busy="false"]').first().waitFor({ timeout: 30_000 })
  await vent(800)
  const p: Omit<Panel, 'kolonne'>[] = await side.locator('.forside__paneler section.oppsummering').evaluateAll((e: Element[]) =>
    e.map((s) => {
      const r = s.getBoundingClientRect()
      return {
        tittel: document.getElementById(s.getAttribute('aria-labelledby') ?? '')?.textContent?.trim() ?? '',
        x: Math.round(r.left),
        topp: r.top,
        bunn: r.bottom,
      }
    }),
  )
  const kanter = [...new Set(p.map((x) => x.x))].sort((a, b) => a - b)
  return p.map((x) => ({ ...x, kolonne: kanter.indexOf(x.x) }))
}

/** Luften mellom panelene, slik stilarket setter den (den samme i bredden og i høyden). */
const luft = (side: Side): Promise<number> =>
  side.locator('.forside__paneler').evaluate((e: HTMLElement) => parseFloat(getComputedStyle(e).columnGap))

const titler = (p: Panel[]) => p.map((x) => x.tittel)

/** I hver kolonne står hvert panel rett under det forrige, med bare den faste luften imellom. */
function utenEkstraLuft(p: Panel[], gap: number): string {
  const kolonner = new Map<number, Panel[]>()
  for (const x of p) kolonner.set(x.kolonne, [...(kolonner.get(x.kolonne) ?? []), x])
  const avstander: number[] = []
  for (const kolonne of kolonner.values())
    for (let i = 1; i < kolonne.length; i++) {
      const avstand = kolonne[i]!.topp - kolonne[i - 1]!.bunn
      krev(Math.abs(avstand - gap) <= 1, `${Math.round(avstand)} px mellom «${kolonne[i - 1]!.tittel}» og «${kolonne[i]!.tittel}», ventet ${gap}`)
      avstander.push(Math.round(avstand))
    }
  return `luft ${avstander.join('/')} px`
}

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const passord = randomBytes(18).toString('base64url')
await sikreTestkonto(s, 'qa-chat-ada', passord, ['Ada', 'Testesen'])
const miljo = await apneTestmiljo()
try {
  const admin = await klient(s, 'qa-admin', adminpassord)
  await arkiverTidligereGrupper(admin, PREFIKS)
  const ada = await klient(s, 'qa-chat-ada', passord)
  for (const n of [1, 2, 3]) {
    const gruppe = await rpc<string>(admin, 'opprett_gruppe', { navn: `${PREFIKS} ${n}`, beskrivelse: 'Syntetisk.', fagmiljo: null })
    await rpc(admin, 'inviter_til_gruppe', { gruppe, brukernavn: 'qa-chat-ada' })
    await rpc(ada, 'svar_paa_gruppeinvitasjon', { gruppe, godta: true })
  }
  const oppsett = [...SYNLIGE.map((modul) => ({ modul, synlig: true })), ...SKJULTE.map((modul) => ({ modul, synlig: false }))]
  const { error } = await ada.from('brukerinnstillinger').upsert({ nokkel: 'forside.moduler', verdi: oppsett }, { onConflict: 'bruker_id,nokkel' })
  if (error) throw new Error(`oppsettet ble ikke lagret: ${error.message}`)

  const pc: Side = paa(await miljo.brukerside('qa-chat-ada', passord, PC))

  await punkt('F1 PC: to uavhengige kolonner, annethvert i brukerens rekkefølge, uten ekstra luft', async () => {
    paa(pc)
    await pc.goto(`${miljo.url}/#/`)
    await pc.getByText(`${PREFIKS} 3`).waitFor({ timeout: 30_000 })
    const p = await paneler(pc)
    const venstre = p.filter((x) => x.kolonne === 0)
    const hoyre = p.filter((x) => x.kolonne === 1)
    krev(JSON.stringify(titler(venstre)) === JSON.stringify(['Aktuelt for deg', 'Mine oppgaver', 'Favorittfagsider']), `venstre: ${titler(venstre)}`)
    krev(JSON.stringify(titler(hoyre)) === JSON.stringify(['Mine grupper', 'Viktig nytt']), `høyre: ${titler(hoyre)}`)
    krev(new Set(venstre.map((x) => x.x)).size === 1 && new Set(hoyre.map((x) => x.x)).size === 1 && venstre[0]!.x < hoyre[0]!.x, 'kolonnene står ikke rett')
    const [a, g] = [venstre[0]!, hoyre[0]!]
    krev(g.bunn - g.topp > a.bunn - a.topp + 40, '«Mine grupper» er ikke høyere enn «Aktuelt for deg», så kontrollen prøver ikke det den skal')
    krev(Math.abs(a.topp - g.topp) <= 1, 'kolonnene begynner ikke på samme høyde')
    const svar = utenEkstraLuft(p, await luft(pc))
    await bilde(pc, '01-forside-pc')
    return `${svar}; «Mine oppgaver» ${Math.round(g.bunn - venstre[1]!.topp)} px høyere opp enn før`
  })

  await punkt('F2 PC: rekkefølgen i siden (tastatur og skjermleser) er brukerens', async () => {
    paa(pc)
    const rekkefolge: string[] = await pc
      .locator('.forside__paneler section.oppsummering')
      .evaluateAll((e: Element[]) => e.map((s) => document.getElementById(s.getAttribute('aria-labelledby') ?? '')?.textContent?.trim() ?? ''))
    krev(
      JSON.stringify(rekkefolge) === JSON.stringify(['Aktuelt for deg', 'Mine grupper', 'Mine oppgaver', 'Viktig nytt', 'Favorittfagsider']),
      `rekkefølgen i siden: ${rekkefolge}`,
    )
    return rekkefolge.join(' → ')
  })

  await punkt('F3 mørkt tema på PC', async () => {
    paa(pc)
    await pc.emulateMedia({ colorScheme: 'dark' })
    await pc.goto(`${miljo.url}/#/`)
    const svar = utenEkstraLuft(await paneler(pc), await luft(pc))
    await bilde(pc, '02-forside-pc-moerkt')
    await pc.emulateMedia({ colorScheme: 'light' })
    return svar
  })

  await punkt('F6 bredden krysser grensen: panelene står, og fokus blir der det var', async () => {
    paa(pc)
    await pc.setViewportSize(PC.viewport)
    await pc.goto(`${miljo.url}/#/`)
    const rad = pc.locator('.forside__paneler section.oppsummering').nth(1).getByRole('link').first()
    await rad.waitFor({ timeout: 30_000 })
    await rad.evaluate((e: HTMLElement & { merke?: string }) => {
      e.merke = 'samme'
      e.focus()
    })
    const svar: string[] = []
    for (const [navn, bredde] of [
      ['smal', 800],
      ['bred', 1440],
    ] as const) {
      await pc.setViewportSize({ width: bredde, height: 1000 })
      await vent(500)
      const fokus: string = await pc.evaluate(() => (document.activeElement as HTMLElement & { merke?: string })?.merke ?? 'ingen')
      krev(fokus === 'samme', `fokus etter ${navn}: ${fokus}`)
      svar.push(`${navn}: ${new Set((await paneler(pc)).map((x) => x.kolonne)).size} kolonne(r)`)
    }
    return `${svar.join(', ')}; samme element har fokus`
  })

  for (const [kode, navn, valg] of [
    ['F4', 'nettbrett', NETTBRETT],
    ['F5', 'mobil', MOBIL],
  ] as const) {
    await punkt(`${kode} ${navn}: én kolonne i brukerens rekkefølge`, async () => {
      const side: Side = paa(await miljo.brukerside('qa-chat-ada', passord, valg))
      try {
        await side.goto(`${miljo.url}/#/`)
        await side.getByText(`${PREFIKS} 3`).waitFor({ timeout: 30_000 })
        const p = await paneler(side)
        krev(new Set(p.map((x) => x.kolonne)).size === 1 && new Set(p.map((x) => x.x)).size === 1, `${new Set(p.map((x) => x.x)).size} kolonner`)
        const ventet = ['Aktuelt for deg', 'Mine grupper', 'Mine oppgaver', 'Viktig nytt', 'Favorittfagsider']
        krev(JSON.stringify(titler(p)) === JSON.stringify(ventet), `rekkefølgen: ${titler(p)}`)
        const svar = utenEkstraLuft(p, await luft(side))
        await bilde(side, `0${kode === 'F4' ? 3 : 4}-forside-${navn}`)
        return svar
      } finally {
        await side.close()
      }
    })
  }
} catch (e) {
  oppsettFeilet(e)
} finally {
  await miljo.avslutt()
}
rapport()
