/**
 * Inndelingen av stoffregisteret slik databasen får den: den migrasjonen
 * `stoffregister_redigering` legger inn (lest fra fila, så testene og
 * databasen aldri går fra hverandre), og plasseringene til fagsidene som er
 * lagt inn senere (`FAGSIDEIMPORTER`), med faste ID-er. Til testene som bygger
 * registeret uten database.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { stoffslug, type Kategorirad, type Plasseringsrad, type Registerstruktur } from '../../domain/stoffregister'
import { FAGSIDEIMPORTER } from '../../faginnhold/nyefagsider'

interface Grunnkategori {
  navn: string
  ikon?: string
  stoffer?: string[]
  underkategorier?: { navn: string; stoffer: string[] }[]
}

// Fra roten av repoet: i jsdom-testene er `import.meta.url` ingen filadresse.
const MIGRASJONER = resolve('supabase/migrations')

function lesGrunninndeling(): Grunnkategori[] {
  const fil = readdirSync(MIGRASJONER).find((f) => f.endsWith('_stoffregister_redigering.sql'))
  if (!fil) throw new Error('Fant ikke migrasjonen stoffregister_redigering.')
  const sql = readFileSync(`${MIGRASJONER}/${fil}`, 'utf8')
  const treff = /\$json\$([\s\S]*?)\$json\$/.exec(sql)
  if (!treff) throw new Error('Fant ikke inndelingen i migrasjonen stoffregister_redigering.')
  return JSON.parse(treff[1]!) as Grunnkategori[]
}

/** Kategoriene fra migrasjonen, med navnet som stoffene i dem. */
export const GRUNNINNDELING: readonly Grunnkategori[] = lesGrunninndeling()

/** ID-en kategorien eller underkategorien får i {@link GRUNNSTRUKTUR}: «Antidepressiver» og «Antidepressiver/SSRI». */
export const kategoriid = (kategori: string, underkategori?: string) =>
  underkategori ? `${kategori}/${underkategori}` : kategori

function bygg(): Registerstruktur {
  const kategorier: Kategorirad[] = []
  const plasseringer: Plasseringsrad[] = []
  GRUNNINNDELING.forEach((k, i) => {
    const id = kategoriid(k.navn)
    kategorier.push({ id, forelder: null, navn: k.navn, posisjon: i, ikon: k.ikon ?? null, arkivert_kl: null })
    for (const stoff of k.stoffer ?? []) plasseringer.push({ stoff, kategori: id })
    k.underkategorier?.forEach((u, j) => {
      const uid = kategoriid(k.navn, u.navn)
      kategorier.push({ id: uid, forelder: id, navn: u.navn, posisjon: j, ikon: null, arkivert_kl: null })
      for (const stoff of u.stoffer) plasseringer.push({ stoff, kategori: uid })
    })
  })
  // Fagsidene som er lagt inn senere, med underkategoriene importen lager når de mangler.
  for (const { navn, kategori: [kategori, under] } of FAGSIDEIMPORTER.flatMap((i) => i.sider)) {
    const id = kategoriid(kategori, under)
    if (under && !kategorier.some((k) => k.id === id)) {
      const posisjon = kategorier.filter((k) => k.forelder === kategoriid(kategori)).length
      kategorier.push({ id, forelder: kategoriid(kategori), navn: under, posisjon, ikon: null, arkivert_kl: null })
    }
    plasseringer.push({ stoff: stoffslug(navn), kategori: id })
  }
  return { kategorier, plasseringer, status: [] }
}

/**
 * Stoffene som plasseres sammen med fagsiden sin (`FAGSIDEIMPORTER`). Det
 * gjør migrasjonen bare når administratoren finnes; uten, som i de fleste
 * testdatabasene, står de i «Andre stoffer» (`verktoyfagsider.test.ts`
 * prøver plasseringen).
 */
export const PLASSERT_MED_SIDEN: ReadonlySet<string> = new Set(
  FAGSIDEIMPORTER.flatMap((i) => i.sider.map((s) => stoffslug(s.navn))),
)

/** Inndelingen fra migrasjonene, uten arkiverte eller slettede stoffer. */
export const GRUNNSTRUKTUR: Registerstruktur = bygg()
