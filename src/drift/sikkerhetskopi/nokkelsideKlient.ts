/**
 * Nøkkelsiden i nettleseren (`scripts/nokkelside.ts` bygger siden av denne
 * fila og `nokler.ts`). Nøklene lages her, vises bare i denne fanen og
 * sendes ingen steder: siden har ingen nettverkskall, og ingenting lagres.
 */
import { lagKopinokler, nokkelfil } from './nokler'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

async function kopier(knapp: HTMLButtonElement, felt: HTMLTextAreaElement) {
  const opprinnelig = knapp.textContent
  try {
    await navigator.clipboard.writeText(felt.value)
    knapp.textContent = 'Kopiert'
  } catch {
    felt.focus()
    felt.select()
    knapp.textContent = 'Merket – trykk Ctrl+C / ⌘C'
  }
  setTimeout(() => (knapp.textContent = opprinnelig), 2500)
}

async function lag() {
  const knapp = $<HTMLButtonElement>('lag')
  const feil = $<HTMLParagraphElement>('feil')
  feil.hidden = true
  knapp.disabled = true
  try {
    const n = await lagKopinokler()
    const dato = new Date().toISOString().slice(0, 10)
    $<HTMLTextAreaElement>('mottakere').value = n.mottaker
    $<HTMLTextAreaElement>('signering').value = n.signeringPrivat
    $<HTMLTextAreaElement>('nokkelfil').value = nokkelfil(n, dato)
    $('resultat').hidden = false
    $('start').hidden = true
    $('resultat').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  } catch {
    feil.hidden = false
    knapp.disabled = false
  }
}

$<HTMLButtonElement>('lag').addEventListener('click', () => void lag())
for (const knapp of document.querySelectorAll<HTMLButtonElement>('[data-kopier]')) {
  knapp.addEventListener('click', () => void kopier(knapp, $<HTMLTextAreaElement>(knapp.dataset.kopier!)))
}
