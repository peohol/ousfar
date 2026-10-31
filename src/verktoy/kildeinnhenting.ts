/**
 * Innhentingen av Psychiatrienets tre switchtabeller og kildesidene de lenker
 * til (P3 i `docs/verktøy-utviklingsplan.md`), felles for kildeimporten
 * (`npm run verktoy:kildeimport -- hent`, som legger uttrekket til arkivet)
 * og kildeovervåkingen (`npm run verktoy:overvaking`, som bare sammenligner).
 *
 * Sidene leses i minnet og forlater aldri denne funksjonen: resultatet har
 * bare det `kildeside.ts` og `arkivtabell` leser av dem, ingen
 * anbefalingstekst (`docs/verktøy-p3-rettigheter.md`). Den henter ikke sidene
 * for johannesurt eller Start-kolonnen. Vedvarer en forbigående serverfeil,
 * kaster hentingen (`kildehenting.ts`), så en midlertidig feil aldri blir et
 * hull i kilden.
 */
import { createHash } from 'node:crypto'
import type { Innhenting, Sideinnhenting, Tabellinnhenting } from './kildearkiv'
import { importmalForTabeller, undertabellmal, UNDERTABELLDYBDE } from './kildeanbefalinger'
import { hentKilde, type Kildesvar } from './kildehenting'
import { LESERVERSJON, lesKildeinnhold } from './kildeside'
import { arkivtabell, KILDETABELLER, lesSwitchtabell, PSYCHIATRIENET, tabelladresse, type Switchtabell } from './kildetabeller'
import type { Virkestoffkartlegging } from './kartlegging'

/** Høflig mot en liten nettside: ett kall om gangen, med pause. */
export const PAUSE_MS = 300

export interface Innhentingsvalg {
  /** Henter én adresse; `hentKilde` med pause når den ikke er gitt. */
  hent?: (url: string) => Promise<Kildesvar>
  /** Kalles for hver hundrede side. */
  framdrift?: (sider: number) => void
}

const hoflig = async (url: string) => {
  const svar = await hentKilde(url)
  await new Promise((r) => setTimeout(r, PAUSE_MS))
  return svar
}

export async function innhentPsychiatrienet(k: Virkestoffkartlegging, { hent = hoflig, framdrift }: Innhentingsvalg = {}): Promise<Innhenting> {
  const tabeller: Tabellinnhenting[] = []
  const lest: Switchtabell[] = []
  for (const t of KILDETABELLER) {
    const url = tabelladresse(t.id)
    const svar = await hent(url)
    if (svar.status !== 200) throw new Error(`${url} svarte ${svar.status}`)
    const start = svar.html.indexOf('<table class="switchtable"')
    const sha256 = createHash('sha256').update(svar.html.slice(start, svar.html.indexOf('</table>', start))).digest('hex')
    const tabell = lesSwitchtabell(t.id, svar.html)
    lest.push(tabell)
    tabeller.push({ tabell: t.id, url, hentet: svar.hentet, sha256, revisjon: tabell.revisjon, lagret: tabell.lagret, ...arkivtabell(tabell) })
  }

  const sider: Sideinnhenting[] = []
  const hentet = new Set<string>()
  let ko = importmalForTabeller(k, lest)
  for (let dybde = 0; ko.length > 0 && dybde < UNDERTABELLDYBDE; dybde++) {
    const neste: string[] = []
    for (const href of ko) {
      if (hentet.has(href)) continue
      hentet.add(href)
      const url = `${PSYCHIATRIENET}${href}`
      const svar = await hent(url)
      const side: Sideinnhenting = {
        href,
        url,
        hentet: svar.hentet,
        status: svar.status,
        endelig: svar.endelig && svar.endelig !== url ? svar.endelig : null,
        leser: LESERVERSJON,
        innhold: svar.status === 200 ? lesKildeinnhold(svar.html) : null,
      }
      sider.push(side)
      neste.push(...undertabellmal(k, side))
      if (sider.length % 100 === 0) framdrift?.(sider.length)
    }
    ko = neste
  }
  if (ko.some((h) => !hentet.has(h))) throw new Error(`Undertabeller dypere enn ${UNDERTABELLDYBDE} nivåer; øk UNDERTABELLDYBDE`)

  // Tidsrommet sidene faktisk ble hentet i.
  const tider = [...tabeller, ...sider].map((x) => x.hentet).sort()
  return { startet: tider[0]!, ferdig: tider.at(-1)!, leser: LESERVERSJON, tabeller, sider }
}
