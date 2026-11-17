/**
 * P7.0: grunnmuren for gruppechatten og sikkerhetsnettet for regelen om
 * pasientopplysninger (docs/gruppechat.md, «Grunnmuren»;
 * docs/pasientopplysninger.md). Prøver at chatten er avslått, at
 * gjenkjenningen av fødselsnumre er den samme i databasen og i appen, at
 * avslaget har teksten appen viser, og at ingenting kan kalles fra
 * nettleseren.
 *
 * Alle numrene lages her av syntetiske datoer og individnumre; ingen gyldige
 * fødselsnumre står i repoet.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { erPersonnummer, lignerPersonnummer, PASIENTREGEL } from '@delt/pasientopplysninger'
import { nyDatabase } from './hjelp/testdatabase'

let db: PGlite

beforeAll(async () => {
  db = await nyDatabase()
})

const VEKT1 = [3, 7, 6, 1, 8, 9, 4, 5, 2]
const VEKT2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

/**
 * Et nummer med gyldige kontrollsifre etter den gamle regelen, eller `null`
 * når individnummeret ikke gir et gyldig nummer. `dag` og `maaned` tar
 * tillegget for D- og H-nummer.
 */
function lagNummer(dag: number, maaned: number, aar: number, individ: number): string | null {
  const ni = `${String(dag).padStart(2, '0')}${String(maaned).padStart(2, '0')}${String(aar).padStart(2, '0')}${String(individ).padStart(3, '0')}`
  const sifre = [...ni].map(Number)
  const kontroll = (vekter: number[], d: number[]) => {
    const k = 11 - (vekter.reduce((s, v, i) => s + v * d[i]!, 0) % 11)
    return k === 11 ? 0 : k
  }
  const k1 = kontroll(VEKT1, sifre)
  if (k1 === 10) return null
  const k2 = kontroll(VEKT2, [...sifre, k1])
  if (k2 === 10) return null
  return `${ni}${k1}${k2}`
}

/** Det første gyldige nummeret for datoen, fra individnummer 500 og oppover. */
function syntetisk(dag: number, maaned: number, aar: number): string {
  for (let individ = 500; individ < 1000; individ++) {
    const nr = lagNummer(dag, maaned, aar, individ)
    if (nr) return nr
  }
  throw new Error('Fant ikke noe nummer')
}

const ENKELT = syntetisk(14, 3, 87)
const D_NUMMER = syntetisk(14 + 40, 3, 87)
const H_NUMMER = syntetisk(14, 3 + 40, 87)
/** Endrer det siste sifferet, så kontrollen feiler. */
const feilKontroll = (nr: string) => nr.slice(0, 10) + String((Number(nr[10]) + 1) % 10)

async function iDatabasen(tekst: string | null): Promise<boolean> {
  return (await db.query<{ ja: boolean }>('select intern.ligner_personnummer($1) as ja', [tekst])).rows[0]!.ja
}

describe('gjenkjenningen av fødselsnumre', () => {
  const tilfeller: [string, string | null, boolean][] = [
    ['et fødselsnummer alene', ENKELT, true],
    ['et D-nummer', D_NUMMER, true],
    ['et H-nummer', H_NUMMER, true],
    ['midt i en setning', `Pasienten ${ENKELT} hadde høyt speil`, true],
    ['med mellomrom etter datoen', `${ENKELT.slice(0, 6)} ${ENKELT.slice(6)}`, true],
    ['med punktum etter datoen', `${ENKELT.slice(0, 6)}.${ENKELT.slice(6)}`, true],
    ['med bindestrek etter datoen', `${ENKELT.slice(0, 6)}-${ENKELT.slice(6)}`, true],
    ['i parentes', `(${ENKELT})`, true],
    ['feil kontrollsiffer', feilKontroll(ENKELT), false],
    ['ti sifre', ENKELT.slice(0, 10), false],
    ['inne i tolv sifre', `1${ENKELT}`, false],
    ['etterfulgt av et siffer', `${ENKELT}0`, false],
    ['dag 00', `00${ENKELT.slice(2)}`, false],
    ['måned 13', `${ENKELT.slice(0, 2)}13${ENKELT.slice(4)}`, false],
    ['en vanlig konsentrasjon', 'Konsentrasjonen var 1250 nmol/L', false],
    ['tom tekst', '', false],
    ['ingen tekst', null, false],
  ]

  it.each(tilfeller)('%s', async (_navn, tekst, ventet) => {
    expect(lignerPersonnummer(tekst)).toBe(ventet)
    expect(await iDatabasen(tekst)).toBe(ventet)
  })

  it('godtar det første kontrollsifferet etter regelen fra 2032', () => {
    // Samme ni første sifre, men et k1 som gir rest 1–3 i stedet for 0.
    const ni = ENKELT.slice(0, 9)
    const sifre = [...ni].map(Number)
    const sum = VEKT1.reduce((s, v, i) => s + v * sifre[i]!, 0)
    const nye = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
      .filter((k1) => (sum + k1) % 11 >= 1 && (sum + k1) % 11 <= 3)
      .map((k1) => {
        const d = [...sifre, k1]
        const k2 = (11 - (VEKT2.reduce((s, v, i) => s + v * d[i]!, 0) % 11)) % 11
        return k2 === 10 ? null : `${ni}${k1}${k2}`
      })
      .filter((x): x is string => x !== null)
    expect(nye.length).toBeGreaterThan(0)
    for (const nr of nye) expect(erPersonnummer(nr)).toBe(true)
  })

  it('databasen og appen er enige om tilfeldige 11-sifrede tall', async () => {
    // Fast frø, så testen gir det samme hver gang.
    let frø = 20261117
    const neste = () => {
      frø = (frø * 1103515245 + 12345) % 2 ** 31
      return frø
    }
    const tall = Array.from({ length: 400 }, () => String(neste() % 10 ** 11).padStart(11, '0'))
    // Og noen som er gyldige, så begge sider av svaret prøves.
    for (let individ = 500; individ < 560; individ++) {
      const nr = lagNummer(1 + (individ % 28), 1 + (individ % 12), individ % 100, individ)
      if (nr) tall.push(nr)
    }
    const { rows } = await db.query<{ t: string; ja: boolean }>(
      'select t, intern.ligner_personnummer(t) as ja from unnest($1::text[]) t',
      [tall],
    )
    const uenige = rows.filter((r) => r.ja !== lignerPersonnummer(r.t))
    expect(uenige).toEqual([])
    expect(rows.some((r) => r.ja)).toBe(true)
    expect(rows.some((r) => !r.ja)).toBe(true)
  })
})

describe('avslaget', () => {
  it('kaster 22023 med teksten appen viser, uten teksten brukeren skrev', async () => {
    const tekst = `Kontroll av ${ENKELT}`
    const feil = await db.query('select intern.krev_uten_personnummer($1)', [tekst]).catch((e: { code?: string; message?: string }) => e)
    expect(feil).toMatchObject({ code: '22023', message: PASIENTREGEL.avvist })
    expect((feil as { message: string }).message).not.toContain(ENKELT)
  })

  it('slipper vanlig tekst gjennom', async () => {
    await expect(db.query('select intern.krev_uten_personnummer($1)', ['Neste møte er 18.11 kl. 14'])).resolves.toBeTruthy()
  })
})

describe('bryteren og varslene', () => {
  it('gruppechatten er avslått', async () => {
    expect((await db.query<{ ja: boolean }>('select intern.gruppechat_aktivert() as ja')).rows[0]!.ja).toBe(false)
  })

  it('merkingen av varslene er tom i grunnmuren', async () => {
    await expect(
      db.query('select intern.merk_gruppechat_varsler_lest(gen_random_uuid(), gen_random_uuid(), 1)'),
    ).resolves.toBeTruthy()
  })

  it('ingen av funksjonene kan kalles fra nettleseren', async () => {
    const { rows } = await db.query<{ navn: string; anon: boolean; innlogget: boolean }>(
      `select p.oid::regprocedure::text as navn,
              has_function_privilege('anon', p.oid, 'execute') as anon,
              has_function_privilege('authenticated', p.oid, 'execute') as innlogget
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'intern'
          and p.proname in ('gruppechat_aktivert', 'ligner_personnummer', 'krev_uten_personnummer', 'merk_gruppechat_varsler_lest')`,
    )
    expect(rows).toHaveLength(4)
    expect(rows.filter((r) => r.anon || r.innlogget)).toEqual([])
  })
})
