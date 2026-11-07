/**
 * Hjelpere for den felles arbeidsflyten på verktøysidene (§3 i
 * `docs/verktøy-brukervennlighet-2026-11.md`): planpanelet i steg 4,
 * tidslinjen, formvalgene i steg 2, spørsmålene i steg 3 og kopien av planen.
 * Planen beregnes av seg selv når alt er besvart; hjelperne venter på den.
 */
import { act, screen, waitFor, within } from '@testing-library/react'
import type userEvent from '@testing-library/user-event'
import { expect } from 'vitest'

export type Bruker = ReturnType<typeof userEvent.setup>

/** Panelet i steg 4, der planen eller det som gjenstår står. */
export const planpanel = () => screen.getByRole('region', { name: /^Steg 4: / })

/** Tidslinjen i planen som vises, eller `null`. */
export const tidslinje = () => screen.queryByRole('list', { name: 'Planen dag for dag' })

/** Teksten slik den ses: uten det som bare er for skjermlesere (navnet på legemidlet når planen har ett). */
const synlig = (el: Element) => {
  const kopi = el.cloneNode(true) as Element
  kopi.querySelectorAll('.kun-skjermleser').forEach((x) => x.remove())
  return kopi.textContent ?? ''
}

/** Punktene i tidslinjen som [når, innhold]: «Dag 1–14» og teksten ved siden av, slik den ses. */
export const punkter = (rot: HTMLElement = screen.getByRole('list', { name: 'Planen dag for dag' })) =>
  [...rot.children].map((li) => [li.querySelector('.tidslinje__dager')!.textContent!, synlig(li.querySelector('.tidslinje__innhold')!)] as const)

/** Teksten i et element på én linje. */
const enLinje = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

/**
 * Tidslinjen planen viser (`Tidslinje`), lest inn i tabellform: én rad per
 * punkt med tiden og én celle per legemiddel (`data-kolonne`), med
 * legemidlets navn som kolonneoverskrift. Navnet og et formskifte («Over til
 * dråper») er merkelapper ved cellen og er ikke med i den; en dose og en
 * injeksjon står på én linje, og en vurdering er «Vurdering» og hele teksten.
 * Et legemiddel uten celle i en doserad har ingen dose («–»). Sluttmålet er en
 * doserad.
 */
export function tidslinjetabell(liste: Element): HTMLTableElement {
  const navn = new Map<number, string>()
  for (const el of liste.querySelectorAll('[data-kolonne]')) {
    const k = Number(el.getAttribute('data-kolonne'))
    const n = el.querySelector(':scope > .tidslinje__navn, :scope > .kun-skjermleser')
    if (n && !navn.has(k)) navn.set(k, enLinje(n))
  }
  const antall = Math.max(-1, ...navn.keys()) + 1
  const lag = <K extends keyof HTMLElementTagNameMap>(tag: K, tekst?: string) => Object.assign(document.createElement(tag), tekst === undefined ? {} : { textContent: tekst })
  const tabell = lag('table')
  const hode = tabell.appendChild(lag('thead')).appendChild(lag('tr'))
  hode.appendChild(lag('th', 'Når'))
  for (let k = 0; k < antall; k++) hode.appendChild(lag('th', navn.get(k) ?? ''))
  const kropp = tabell.appendChild(lag('tbody'))
  for (const li of liste.children) {
    const type = li.getAttribute('data-type') === 'slutt' ? 'periode' : li.getAttribute('data-type')!
    const tr = kropp.appendChild(lag('tr'))
    tr.setAttribute('data-type', type)
    tr.appendChild(lag('th')).append(...[...li.querySelector('.tidslinje__nar')!.children].map((x) => x.cloneNode(true)))
    for (let k = 0; k < antall; k++) {
      const td = tr.appendChild(lag('td'))
      const celle = li.querySelector(`.tidslinje__innhold [data-kolonne="${k}"]`)
      if (!celle) {
        if (type === 'periode') td.textContent = '–'
        continue
      }
      if (type === 'vurdering') {
        const etikett = celle.querySelector('strong')?.textContent ?? ''
        td.textContent = `Vurdering ${(celle.textContent ?? '').slice(etikett.length).trim()}`
        continue
      }
      const kopi = celle.cloneNode(true) as Element
      kopi.querySelectorAll(':scope > .tidslinje__navn, :scope > .kun-skjermleser, :scope > .tidslinje__skifte').forEach((x) => x.remove())
      kopi.querySelectorAll('.tidslinje__dose').forEach((x) => (x.textContent = enLinje(x)))
      td.append(kopi)
    }
  }
  return tabell
}

/** Tidslinjen i tabellform som tekst, i formen `tidslinjeavvik` (QA) sammenligner med kopien: overskriftene og cellene i hver rad. */
export function tidslinjetekst(liste: Element) {
  const tabell = tidslinjetabell(liste)
  return {
    koloner: [...tabell.querySelectorAll('thead th')].map((c) => c.textContent!),
    rader: [...tabell.querySelectorAll('tbody tr')].map((tr) => [...tr.querySelectorAll('th, td')].map((c) => c.textContent!)),
  }
}

/** Venter på planen med tittelen `tittel`. */
export const planen = (tittel: string | RegExp) => screen.findByRole('region', { name: tittel }, { timeout: 3000 })

/** Velger alternativet med verdien `verdi` i formvalget `navn` («Legemiddelform av escitalopram»), når FEST har svart. */
export async function velgForm(user: Bruker, navn: string | RegExp, verdi: string) {
  const gruppe = await screen.findByRole('radiogroup', { name: navn }, { timeout: 3000 })
  const radio = within(gruppe)
    .getAllByRole('radio')
    .find((r) => (r as HTMLInputElement).value === verdi)
  if (!radio) throw new Error(`Fant ikke ${verdi} i ${String(navn)}`)
  await user.click(radio)
}

/** Teksten som kopieres med «Kopier planen», når planen er beregnet. */
export async function kopier(user: Bruker) {
  await user.click(await screen.findByRole('button', { name: 'Kopier planen' }, { timeout: 3000 }))
  return navigator.clipboard.readText()
}

/** Ingen plan, og panelet i steg 4 sier hvorfor. */
export async function stoppet(grunn: RegExp) {
  await waitFor(
    () => {
      expect(tidslinje()).toBeNull()
      expect(planpanel().textContent).toMatch(grunn)
    },
    { timeout: 3000 },
  )
}

/** Gruppene med spørsmål som besvares Ja/Nei/Ukjent, og gruppen med avkrysningene (`Sporsmalsliste`). */
export const VALGGRUPPER = ['Forhold som stopper en automatisk plan', 'Forhold som påvirker planen'] as const
export const BEKREFTELSER = 'Bekreft før planen vises'

/** Teksten som stiller spørsmålet til en radiogruppe. */
const sporsmalstekst = (gruppe: HTMLElement) => document.getElementById(gruppe.getAttribute('aria-labelledby') ?? '')?.textContent ?? ''

/** Spørsmålet med teksten `tekst` (Ja/Nei/Vet ikke). */
export const sporsmal = (tekst: string | RegExp) => screen.getByRole('radiogroup', { name: tekst })

/** Svaret som sier ja (`Ja`, eller «Stemmer» for et unntak i reservevisningen), og svaret som sier nei. */
const JA = /^(Ja|Stemmer)$/
const NEI = /^(Nei|Stemmer ikke)$/
/**
 * Svaret på et spørsmål fra en kontrollert katalog som ikke er ja/nei: en
 * vurdering klinikeren har gjort («Ja» framfor «Ikke ennå»), en voksen
 * pasient under 65 år som følges poliklinisk, og et bytte på grunn av
 * bivirkninger (syntetisk standard).
 */
export const STANDARDSVAR = [/^Ja$/, /^18–64 år$/, /^Poliklinisk$/, /^Bivirkninger$/]

/**
 * Svaret testen ønsker på spørsmålet `valg`: et eget svar i `svar`, ja når det
 * står i `ja` eller i `snudd`, ellers nei eller standardsvaret.
 */
function onsketSvar(valg: HTMLElement, ja: RegExp[], svar: (readonly [RegExp, RegExp])[], snudd: ReadonlySet<string>) {
  const tekst = sporsmalstekst(valg)
  const eget = svar.find(([s]) => s.test(tekst))?.[1]
  const finn = (m: RegExp) => within(valg).queryByRole('radio', { name: m }) as HTMLInputElement | null
  const funnet = eget ? finn(eget) : ja.some((j) => j.test(tekst)) || snudd.has(tekst) ? finn(JA) : (finn(NEI) ?? STANDARDSVAR.map(finn).find(Boolean))
  if (!funnet) throw new Error(`Vet ikke hva som skal svares på «${tekst}»`)
  return funnet
}

/** Om spørsmålet `valg` sier ved seg at svaret stopper planen (merknaden uten «Ukjent»-tone). */
const svaretStopper = (valg: HTMLElement) => !!valg.closest('li')?.querySelector('.sporsmal__merknad:not([data-tone])')

/**
 * Svarer slik at planen kan lages, og krysser av hver bekreftelse: nei på hvert
 * spørsmål og forhold, men ja der siden sier at nei stopper planen (et
 * spørsmål i katalogen som spør om en forutsetning). `ja` er forholdene og
 * spørsmålene som gjelder, og `svar` gir et bestemt svar på et spørsmål
 * (tekst → svar); de snus aldri. Et spørsmål som ikke er ja/nei, får
 * standardsvaret. Et svar kan vise nye spørsmål og bekreftelser, så det
 * fortsetter til ingenting er endret. Venter først på spørsmålene, som kommer
 * når steg 2 er fylt ut og FEST har svart.
 */
export async function besvarAlt(user: Bruker, ja: RegExp[] = [], svar: (readonly [RegExp, RegExp])[] = []) {
  await waitFor(
    () => {
      expect(screen.getByRole('heading', { name: /^Steg 3(, utfylt)?: / })).toBeTruthy()
      expect(screen.queryByText('Spørsmålene kommer når steg 2 er fylt ut.')).toBeNull()
    },
    { timeout: 3000 },
  )
  const snudd = new Set<string>()
  // En kontrollert katalog stiller også vurderingene som spørsmål («Ja»/«Ikke ennå»).
  const grupper = [...VALGGRUPPER, BEKREFTELSER]
  for (;;) {
    let endret = false
    for (const navn of grupper) {
      const gruppe = screen.queryByRole('group', { name: navn })
      for (const valg of gruppe ? within(gruppe).queryAllByRole('radiogroup') : []) {
        const onsket = onsketSvar(valg, ja, svar, snudd)
        if (onsket.checked) continue
        await user.click(onsket)
        endret = true
      }
    }
    // Flyten regnes på nytt etter svarene; et nei som stopper planen, snus til ja.
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })
    for (const navn of grupper) {
      const gruppe = screen.queryByRole('group', { name: navn })
      for (const valg of gruppe ? within(gruppe).queryAllByRole('radiogroup') : []) {
        const tekst = sporsmalstekst(valg)
        if (snudd.has(tekst) || ja.some((j) => j.test(tekst)) || svar.some(([s]) => s.test(tekst)) || !svaretStopper(valg)) continue
        if (!within(valg).queryByRole('radio', { name: NEI, checked: true })) continue
        snudd.add(tekst)
        endret = true
      }
    }
    const bekreft = screen.queryByRole('group', { name: BEKREFTELSER })
    for (const boks of bekreft ? within(bekreft).queryAllByRole('checkbox') : [])
      if (!(boks as HTMLInputElement).checked) {
        await user.click(boks)
        endret = true
      }
    if (!endret) return
  }
}
