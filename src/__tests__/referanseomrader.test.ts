/**
 * Referanseområdene fortolkningen viser over knappene i steg 2, fra
 * fagmiljøets egen analyttkatalog (`analyttkatalog_koder.referanseomrade`),
 * og migrasjonen som kopierte dem dit fra fagsidene én gang
 * (`20261118090000_fortolkning_skilt_fra_fagsidene.sql`, `docs/domener.md`).
 *
 * Det som prøves, i en ekte database før og etter migrasjonen:
 *
 * 1. Hver kode får det samme området som appen fra før fant: det publiserte
 *    kortet «Referanseområde» på siden til kodens primære stoff, sidens eget
 *    for en kode som bruker sidens kort, og kortet for forbindelsen koden
 *    måler ellers, også når kortet fra før har koden i `gjelder` (OTRAM).
 * 2. Et utkast, et kort som er tatt bort, et kort uten tall, et annet slags
 *    kort og et kort på siden til et stoff koden bare er sekundært koblet til,
 *    gir ingenting; heller ikke en urinanalyse.
 * 3. Faginnholdet endres ikke, og etter migrasjonen følger fortolkningen ikke
 *    fagsidene: en publisert endring på siden endrer ikke katalogen.
 *
 * Bare denne migrasjonen kjøres; den neste fjerner det den kopierte fra
 * (`koblingeneFjernet.test.ts`).
 *
 * Stoffene og kodene er de i katalogen til OUS Klinisk farmakologi, men
 * tallene er syntetiske.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { byggKatalog, lesKatalogdata, referanseomraderI } from '../domain/analyttkatalog'
import { lagFaginnholdslager, type Faginnholdslager } from '../faginnhold/lagring'
import type { Objektstatus } from '../faginnhold/modell'
import { FJERNET } from '../faginnhold/paneler'
import { faginnholdskall, feilFra, kjorMigrasjoner, migrasjonsfiler, nyDatabase, opprettBruker, som, type Faginnholdskall } from './hjelp/testdatabase'

const MIGRASJON = migrasjonsfiler().find((f) => f.endsWith('_fortolkning_skilt_fra_fagsidene.sql'))!
const NESTE = migrasjonsfiler()[migrasjonsfiler().indexOf(MIGRASJON) + 1]

let db: PGlite
let kall: Faginnholdskall
let lager: Faginnholdslager
let bruker: string
let for_: { innhold: unknown; revisjoner: number }
const ider = { tramadol: '', tram: '', revisjon: 0 }

const omrade = (nedre: number | null, ovre: number | null, enhet = 'nmol/L') => ({ nedre, ovre, enhet })

/** Referanseområdene katalogen gir et medlem av OUS Klinisk farmakologi, slik appen leser dem. */
async function iKatalogen(): Promise<[string, unknown][]> {
  const svar = await som(db, bruker, async (tx) => (await tx.query<{ k: unknown }>('select public.les_analyttkatalog() as k')).rows[0]!.k)
  return [...referanseomraderI(byggKatalog(lesKatalogdata(svar)))].sort(([a], [b]) => a.localeCompare(b))
}

const innhold = () => kall.fasit('select objekt_id, tilstand::text, data from public.innholdselementer order by 1, 2')
const revisjoner = async () => (await kall.fasit<{ n: number }>('select count(*)::int as n from public.objektrevisjoner'))[0]!.n

function kort(infoside: string, data: Record<string, unknown>, { elementtype = 'referanseomrade', panel = 'viktige_data' } = {}) {
  return lager.opprettUtkast('innholdselement', { infoside, panel, posisjon: 0, elementtype, data, referanser: [] })
}

async function publiser(...objekter: Objektstatus[]) {
  for (const { id, revisjon } of objekter) await lager.publiserUtkast(id, revisjon!)
}

beforeAll(async () => {
  db = await nyDatabase({ til: MIGRASJON })
  const admin = await opprettBruker(db, { brukernavn: 'redaktor', fornavn: 'Rita', etternavn: 'Redaktør', rolle: 'admin', systemarkitekt: true })
  bruker = await opprettBruker(db, { brukernavn: 'leser', fornavn: 'Lars', etternavn: 'Leser', rolle: 'user' })
  kall = faginnholdskall(db, admin)
  lager = lagFaginnholdslager(kall.klientFor(admin))

  const side = (navn: string) => lager.opprettUtkast('infoside', { navn })
  const tramadol = await side('Tramadol')
  const diazepam = await side('Diazepam')
  const nortriptylin = await side('Nortriptylin')
  const bupropion = await side('Bupropion')
  const sertralin = await side('Sertralin')
  const thc = await side('THC')
  const testmiddel = await side('Testmiddel')
  ider.tramadol = tramadol.id

  // Tramadol: sidens kort for TRAM, og kortet for metabolitten med OUS sin kode i `gjelder`, som i produksjonen.
  const tram = await kort(tramadol.id, { ...omrade(10, 20), forbehold: 'Syntetisk.' })
  ider.tram = tram.id
  const otram = await kort(tramadol.id, { ...omrade(null, 5), gjelder: 'OTRAM' })
  const toksisk = await kort(tramadol.id, omrade(90, null), { elementtype: 'toksisk_omrade' })
  // Diazepam: sidens kort for DIAZ, og kortet for N-desmetyldiazepam med forbindelsen i `gjelder`.
  const diaz = await kort(diazepam.id, omrade(100, 200))
  const dmi = await kort(diazepam.id, { ...omrade(300, 400), gjelder: 'nordiazepam' })
  // Nortriptylin: NOR sitt kort. AMTNORSUM er bare sekundært koblet til nortriptylin.
  const nor = await kort(nortriptylin.id, omrade(30, 60))
  // Bupropion: et kort som er tatt bort, og et uten tall.
  const fjernet = await kort(bupropion.id, omrade(1, 2), { panel: FJERNET })
  const tomt = await kort(bupropion.id, omrade(null, null, ''))
  // Sertralin: bare et utkast.
  await kort(sertralin.id, omrade(3, 4))
  // THC: sidens kort gjelder THC i serum; urinanalysen IRCAK bruker ingen kort.
  const thckort = await kort(thc.id, omrade(5, 6))
  // Et stoff ingen kode er koblet til.
  const ukoblet = await kort(testmiddel.id, omrade(7, 8))
  await publiser(tramadol, diazepam, nortriptylin, bupropion, sertralin, thc, testmiddel, tram, otram, toksisk, diaz, dmi, nor, fjernet, tomt, thckort, ukoblet)
  // Et upublisert utkast av TRAM-kortet gjelder ikke.
  const utkast = await lager.lagreUtkast(tram.id, tram.revisjon!, {
    infoside: tramadol.id,
    panel: 'viktige_data',
    posisjon: 0,
    elementtype: 'referanseomrade',
    data: omrade(11, 22),
    referanser: [],
  })
  ider.revisjon = utkast.revisjon!

  for_ = { innhold: await innhold(), revisjoner: await revisjoner() }
  await kjorMigrasjoner(db, { fra: MIGRASJON, til: NESTE })
}, 120_000)

const FORVENTET = [
  ['DIAZ', omrade(100, 200)],
  ['DMI', omrade(300, 400)],
  ['NOR', omrade(30, 60)],
  ['OTRAM', omrade(null, 5)],
  ['THC', omrade(5, 6)],
  ['TRAM', omrade(10, 20)],
]

describe('referanseområdene i analyttkatalogen', () => {
  it('gir hver kode det publiserte kortet på siden til sitt primære stoff, som appen fra før fant det', async () => {
    expect(await iKatalogen()).toEqual(FORVENTET)
  })

  it('gir ingenting for et utkast, et kort som er tatt bort eller er tomt, en sekundær kobling eller en urinanalyse', async () => {
    const koder = new Map(await iKatalogen())
    for (const kode of ['SERT', 'HBUP', 'AMTNORSUM', 'IRCAK']) expect(koder.has(kode), kode).toBe(false)
    const rader = await kall.fasit<{ kode: string }>(
      'select kode from public.analyttkatalog_koder where referanseomrade is not null and fagmiljo_id <> intern.opprinnelig_fagmiljo()',
    )
    expect(rader).toEqual([])
  })

  it('endrer ikke faginnholdet', async () => {
    expect(await innhold()).toEqual(for_.innhold)
    expect(await revisjoner()).toBe(for_.revisjoner)
  })

  it('følger ikke fagsiden etter migrasjonen: en publisert endring på siden endrer ikke fortolkningen', async () => {
    const endret = await lager.lagreUtkast(ider.tram, ider.revisjon, {
      infoside: ider.tramadol,
      panel: 'viktige_data',
      posisjon: 0,
      elementtype: 'referanseomrade',
      data: omrade(50, 70),
      referanser: [],
    })
    await publiser(endret)
    expect(new Map(await iKatalogen()).get('TRAM')).toEqual(omrade(10, 20))
  })

  it('godtar bare et område med minst én grense, tall eller ingenting som grenser, og en enhet', async () => {
    const sett = (verdi: unknown) =>
      feilFra(() =>
        kall.fasit(`update public.analyttkatalog_koder set referanseomrade = $1::text::jsonb where kode = 'TRAM'`, [JSON.stringify(verdi)]),
      )
    for (const ugyldig of [
      { nedre: null, ovre: null, enhet: 'nmol/L' },
      { nedre: 1, ovre: 2 },
      { ovre: 2, enhet: 'nmol/L' },
      { nedre: '1', ovre: 2, enhet: 'nmol/L' },
      [1, 2],
    ]) {
      expect((await sett(ugyldig))?.message, JSON.stringify(ugyldig)).toMatch(/analyttkatalog_koder_referanseomrade/)
    }
    expect(await sett({ nedre: null, ovre: 2, enhet: 'nmol/L' })).toBeNull()
  })
})
