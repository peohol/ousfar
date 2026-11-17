/**
 * Et utdrag fra CYPinfo og et falskt CYPinfo som svarer med det, til testene
 * av synkroniseringen og dekningen. Ingen test kaller CYPinfo.
 *
 * - `data/cypinfo/legemiddel.json` og `gene.json`: katalogen og gentabellen
 *   slik CYPinfo ga dem 16.11.2026.
 * - `data/cypinfo/anbefalinger.json`: hver anbefaling CYPinfo ga i
 *   kartleggingen 16.–17.11.2026 (alle gen og fenotyper hver for seg, og hele
 *   produktet for gengruppene), med ID-ene, genene, fenotypene og nivåene
 *   slik CYPinfo ga dem, men med **syntetisk tekst** for alle anbefalingene
 *   som avhenger av et resultat. Teksten for legemidlene uten relevante gener
 *   er CYPinfos, siden den er en del av katalogen.
 * - `data/cypinfo/fagsider.json`: de publiserte fagsidene og FEST-ID-ene i
 *   FEST-koblingene deres i produksjonen 16.11.2026.
 *
 * Det falske CYPinfo velger anbefalingene slik CYPinfo gjør (kontrollert mot
 * alle de 104 rapportkallene i kartleggingen): for hvert legemiddel teksten
 * uten relevante gener når den finnes, ellers anbefalingene med flest gener
 * blant dem der alle gen:fenotype-parene er sendt.
 */
import { readFileSync } from 'node:fs'
import type { CypinfoApi } from '../../cypinfo/api'

type Rad = Record<string, unknown>
const json = (sti: string) => JSON.parse(readFileSync(new URL(`../data/cypinfo/${sti}`, import.meta.url), 'utf8')) as unknown

export interface Fixturanbefaling {
  _id: string
  combinations: { gene: { name: string; slug: string }; result: { _id: string; title: { _type: string; current: string } } }[] | null
  drug: { _id: string }
  noRelavantGenes: boolean | null
  severity: string
  text: string
}

export const CYPINFO = {
  legemidler: (json('legemiddel.json') as { data: Rad[] }).data,
  gentabell: (json('gene.json') as { data: Rad[] }).data,
  anbefalinger: json('anbefalinger.json') as Fixturanbefaling[],
  fagsider: json('fagsider.json') as { side: string; fest_ider: string[] }[],
}

export const legemiddelId = (navn: string) => String(CYPINFO.legemidler.find((l) => l.name === navn)?._id)

const navnPa = (v: unknown) => (typeof v === 'object' && v !== null ? ((v as Rad).name as string) : null)

/** Legemiddelet slik rapporten viser det. */
function rapportlegemiddel(l: Rad): Rad {
  return {
    _id: l._id,
    atcCode: (l.atcCodes as string[]).join(','),
    brandNames: l.brandNames,
    category: navnPa(l.category),
    festCode: (l.festCodes as string[])[0] ?? null,
    name: l.name,
    similarNames: null,
    therapyArea: navnPa(l.therapyArea),
  }
}

/** Rapporten CYPinfo gir for disse parene og legemidlene, fra utdraget. */
export function rapportFra(
  anbefalinger: readonly Fixturanbefaling[],
  legemidler: readonly Rad[],
  kombinasjoner: readonly string[],
  spurte: readonly string[],
): Record<string, Rad[]> {
  const sendt = new Set(kombinasjoner)
  const perLegemiddel = new Map<string, Fixturanbefaling[]>()
  for (const a of anbefalinger) perLegemiddel.set(a.drug._id, [...(perLegemiddel.get(a.drug._id) ?? []), a])
  const katalog = new Map(legemidler.map((l) => [String(l._id), l]))
  const svar: Record<string, Rad[]> = {}
  for (const id of spurte) {
    const alle = perLegemiddel.get(id) ?? []
    const uten = alle.filter((a) => a.noRelavantGenes)
    const treff = alle.filter((a) => a.combinations && a.combinations.every((k) => sendt.has(`${k.gene.slug}:${k.result._id}`)))
    const flest = Math.max(0, ...treff.map((a) => a.combinations!.length))
    const valgte = uten.length > 0 ? uten : treff.filter((a) => a.combinations!.length === flest)
    const legemiddel = katalog.get(id)
    if (!legemiddel) continue
    for (const a of valgte) {
      const kategori = navnPa(legemiddel.category) ?? 'Annet'
      ;(svar[kategori] ??= []).push({ ...structuredClone(a), drug: rapportlegemiddel(legemiddel) })
    }
  }
  return svar
}

export interface Endringer {
  legemidler?: (rader: Rad[]) => Rad[]
  gentabell?: (rader: Rad[]) => Rad[]
  anbefalinger?: (anbefalinger: Fixturanbefaling[]) => Fixturanbefaling[]
  /** Endrer svaret på ett rapportkall. */
  rapport?: (svar: Record<string, Rad[]>, kombinasjoner: readonly string[], legemidler: readonly string[]) => unknown
}

/** Et CYPinfo som svarer med utdraget, eventuelt endret, og teller kallene. */
export function falskCypinfoApi(endre: Endringer = {}): CypinfoApi & { kall: { rapport: number; lister: string[] } } {
  const legemidler = (endre.legemidler ?? ((r) => r))(structuredClone(CYPINFO.legemidler))
  const gentabell = (endre.gentabell ?? ((r) => r))(structuredClone(CYPINFO.gentabell))
  const anbefalinger = (endre.anbefalinger ?? ((a) => a))(structuredClone(CYPINFO.anbefalinger))
  const kall = { rapport: 0, lister: [] as string[] }
  return {
    kall,
    legemidler: async () => {
      kall.lister.push('/legemiddel')
      return structuredClone(legemidler)
    },
    gentabell: async () => {
      kall.lister.push('/gene')
      return structuredClone(gentabell)
    },
    rapport: async (kombinasjoner, spurte) => {
      kall.rapport += 1
      const svar = rapportFra(anbefalinger, legemidler, kombinasjoner, spurte)
      return endre.rapport ? endre.rapport(svar, kombinasjoner, spurte) : svar
    },
  }
}
