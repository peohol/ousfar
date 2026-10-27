/**
 * P2 i `docs/verktøy-utviklingsplan.md`: fagsidene virkestoffene i
 * kartleggingen mangler, og koblingene deres til FEST.
 *
 * Navnet og FEST-ID-ene kommer fra kartleggingen
 * (`src/data/verktoy/virkestoffkartlegging.json`), så sidene og koblingene
 * aldri kan gå fra den. Her står bare hvilke virkestoffer som får side, og
 * kategorien i stoffregisteret. Sidene lages uten faginnhold
 * (`src/faginnhold/nyefagsider.ts`) og kobles til moderstoffet i FEST, som
 * saltene og esterne følger med (`src/faginnhold/festkoblinger.ts`).
 * Johannesurt er ekskludert fra kartleggingen og kan ikke få side her.
 */
import kartlegging from '../data/verktoy/virkestoffkartlegging.json'
import type { Festkobling } from '../faginnhold/festkoblinger'
import type { Nyfagside } from '../faginnhold/nyefagsider'
import type { Kartvirkestoff, Virkestoffkartlegging } from './kartlegging'

/**
 * Virkestoffene som manglet fagside etter P1, med kategorien i
 * stoffregisteret. Antidepressivene uten en underkategori som passer, står i
 * hovedkategorien; MAO-hemmerne får sin egen.
 */
export const VERKTOY_KATEGORIER: Readonly<Record<string, Nyfagside['kategori']>> = {
  agomelatin: ['Antidepressiver'],
  dosulepin: ['Antidepressiver', 'TCA'],
  fenelzin: ['Antidepressiver', 'MAO-hemmere'],
  flufenazin: ['Antipsykotika', 'Førstegenerasjonsmidler'],
  imipramin: ['Antidepressiver', 'TCA'],
  loksapin: ['Antipsykotika', 'Førstegenerasjonsmidler'],
  maprotilin: ['Antidepressiver'],
  moklobemid: ['Antidepressiver', 'MAO-hemmere'],
  penfluridol: ['Antipsykotika', 'Førstegenerasjonsmidler'],
  perisiazin: ['Antipsykotika', 'Førstegenerasjonsmidler'],
  pimozid: ['Antipsykotika', 'Førstegenerasjonsmidler'],
  promazin: ['Antipsykotika', 'Førstegenerasjonsmidler'],
  sulpirid: ['Antipsykotika', 'Førstegenerasjonsmidler'],
  tranylcypromin: ['Antidepressiver', 'MAO-hemmere'],
  trazodon: ['Antidepressiver'],
  trifluoperazin: ['Antipsykotika', 'Førstegenerasjonsmidler'],
}

/** Kilden revisjonene av de nye sidene får i historikken. */
export const VERKTOY_FAGSIDEKILDE = 'Ny fagside uten faginnhold for OUSFAR Verktøy (P2)'

function virkestoff(nokkel: string): Kartvirkestoff {
  const v = (kartlegging as Virkestoffkartlegging).virkestoffer.find((x) => x.nokkel === nokkel)
  if (!v) throw new Error(`${nokkel} står ikke i kartleggingen`)
  return v
}

const NYE = Object.entries(VERKTOY_KATEGORIER).map(([nokkel, kategori]) => ({ v: virkestoff(nokkel), kategori }))

export const VERKTOY_FAGSIDER: readonly Nyfagside[] = NYE.map(({ v, kategori }) => ({ navn: v.navn, kategori }))

export const VERKTOY_FESTKOBLINGER: readonly Festkobling[] = NYE.flatMap(({ v }) =>
  v.fest.map((fest_id) => ({ side: v.navn, fest_id })),
)
