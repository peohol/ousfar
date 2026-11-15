/**
 * Referanseområdene steg 2 viser under analyttnavnet, lest fra stoffsidene i
 * en ekte database slik appen leser dem: kortene per stoff
 * (`les_stoffreferanseomrader`), knyttet til analyttkodene gjennom koblingene
 * i stoffregisteret (`referanseomraderPerAnalytt`).
 *
 * Det som prøves: at hver kode får kortet «Referanseområde» på siden til sitt
 * primære stoff — hovedanalytten kortet uten `gjelder`, de andre kodene bare
 * kortet merket med forbindelsen koden måler, i det fagmiljøets egen katalog,
 * hva koden enn heter — at en analyttkode ikke kan stå i `gjelder`, at
 * radsikkerheten gjelder (vanlige brukere ser
 * bare det publiserte), at et kort som er tatt bort, et annet kort i «Viktige
 * data», et kort uten tall eller et kort på siden til et stoff koden bare er
 * sekundært koblet til, ikke teller, og at en endring på siden slår ut i steg
 * 2 når den publiseres.
 *
 * Stoffene er de i stoffregisteret (Tramadol med TRAM og OTRAM, Bupropion med
 * HBUP, Nortriptylin med NOR, og som sekundært stoff for AMTNORSUM), men
 * tallene er syntetiske.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { grensepiller } from '../domain/piller'
import { byggKatalog, type Datakortbruk, type Katalogdata } from '../domain/analyttkatalog'
import { referanseomraderPerAnalytt, type Stoffreferanseomrade } from '../domain/koblinger'
import { OUS_KATALOG, OUS_KATALOGDATA, OUS_REGISTER } from '../domain/ouskatalog'
import { lagFaginnholdslager, type Faginnholdslager } from '../faginnhold/lagring'
import { lagFaginnholdsleser, type Faginnholdsleser } from '../faginnhold/lesing'
import type { Objektstatus } from '../faginnhold/modell'
import { FJERNET } from '../faginnhold/paneler'
import type { Analyte } from '../types'
import { faginnholdskall, nyDatabase, opprettBruker, type Faginnholdskall } from './hjelp/testdatabase'

let kall: Faginnholdskall
let bruker: string
let adminleser: Faginnholdsleser
let brukerleser: Faginnholdsleser
let lager: Faginnholdslager
const ider = { tramadol: '', bupropion: '', kort: '', fjernet: '' }

const SYNTETISK = { nedre: 10, ovre: 20, enhet: 'nmol/L', forbehold: 'Syntetisk.' }
const OTRAM = { nedre: null, ovre: 5, enhet: 'nmol/L', forbehold: '', gjelder: 'o-desmetyltramadol' }

/**
 * Katalogen til et annet fagmiljø, med egne koder for de samme analysene og
 * metabolitten først: `ODMT` måler O-desmetyltramadol og bruker kortene for
 * den, `TRML` måler tramadol og bruker sidens egne, og `TRMU` måler tramadol
 * i urin og bruker ingen.
 */
function annenKatalog(): ReturnType<typeof byggKatalog> {
  const mal = OUS_KATALOGDATA.oppforinger.find((o) => o.nokkel === 'CITAL')!
  const oppforing = (kode: string, navn: string, forbindelse: string | null, datakort: Datakortbruk | null) => ({
    ...mal,
    nokkel: kode,
    navn,
    visningsnavn: navn,
    komponenter: [navn],
    koder: [{ kode, navn, forbindelse, datakort }],
  })
  const data: Katalogdata = {
    fagmiljo: { id: 'b', navn: 'Et annet fagmiljø' },
    metoder: OUS_KATALOGDATA.metoder,
    oppforinger: [
      oppforing('ODMT', 'O-desmetyltramadol', 'o-desmetyltramadol', 'forbindelse'),
      oppforing('TRML', 'Tramadol', 'tramadol', 'egne'),
      oppforing('TRMU', 'Tramadol i urin', 'tramadol', null),
    ],
    koblinger: [
      { kode: 'ODMT', stoff: 'tramadol', relasjon: 'metabolitt', primar: true, merknad: null },
      { kode: 'TRML', stoff: 'tramadol', relasjon: 'selve_stoffet', primar: true, merknad: null },
      { kode: 'TRMU', stoff: 'tramadol', relasjon: 'selve_stoffet', primar: true, merknad: null },
    ],
  }
  return byggKatalog(data)
}

function kort(infoside: string, elementtype: string, data: Record<string, unknown>, panel = 'viktige_data') {
  return lager.opprettUtkast('innholdselement', { infoside, panel, posisjon: 0, elementtype, data, referanser: [] })
}

async function publiser(...objekter: Objektstatus[]) {
  for (const { id, revisjon } of objekter) await lager.publiserUtkast(id, revisjon!)
}

beforeAll(async () => {
  const db = await nyDatabase()
  const admin = await opprettBruker(db, { brukernavn: 'redaktor', fornavn: 'Rita', etternavn: 'Redaktør', rolle: 'admin', systemarkitekt: true })
  bruker = await opprettBruker(db, { brukernavn: 'leser', fornavn: 'Lars', etternavn: 'Leser', rolle: 'user' })
  kall = faginnholdskall(db, admin)
  adminleser = lagFaginnholdsleser(kall.klientFor(admin))
  brukerleser = lagFaginnholdsleser(kall.klientFor(bruker))
  lager = lagFaginnholdslager(kall.klientFor(admin))

  const tramadol = await lager.opprettUtkast('infoside', { navn: 'Tramadol' })
  const bupropion = await lager.opprettUtkast('infoside', { navn: 'Bupropion' })
  const nortriptylin = await lager.opprettUtkast('infoside', { navn: 'Nortriptylin' })
  const utenKobling = await lager.opprettUtkast('infoside', { navn: 'Testmiddel' })
  ider.tramadol = tramadol.id
  ider.bupropion = bupropion.id

  // Tramadolsiden: kortet for hovedanalytten TRAM, og et eget for metabolitten OTRAM.
  const referanseomrade = await kort(tramadol.id, 'referanseomrade', SYNTETISK)
  ider.kort = referanseomrade.id
  const otram = await kort(tramadol.id, 'referanseomrade', OTRAM)
  const toksisk = await kort(tramadol.id, 'toksisk_omrade', { nedre: 90, ovre: null, enhet: 'nmol/L', forbehold: '' })
  // Et referanseområde som er tatt bort fra bupropionsiden, teller ikke.
  const fjernet = await kort(bupropion.id, 'referanseomrade', { nedre: 1, ovre: 2, enhet: 'nmol/L', forbehold: '' }, FJERNET)
  ider.fjernet = fjernet.id
  // Nortriptylinsiden: NOR sitt kort. AMTNORSUM er bare sekundært koblet til nortriptylin.
  const nor = await kort(nortriptylin.id, 'referanseomrade', { nedre: 30, ovre: 60, enhet: 'nmol/L', forbehold: '' })
  // Et stoff registeret ikke kobler til noen analytt, gir ingen kode noe.
  const ukoblet = await kort(utenKobling.id, 'referanseomrade', { nedre: 7, ovre: 8, enhet: 'nmol/L', forbehold: '' })
  await publiser(tramadol, bupropion, nortriptylin, utenKobling, referanseomrade, otram, toksisk, fjernet, nor, ukoblet)
}, 60_000)

describe('lesReferanseomrader', () => {
  it('bygger på koblingene i stoffregisteret', () => {
    expect(OUS_REGISTER.analytterFor('tramadol').map((k) => [k.kode, k.primar])).toEqual([
      ['TRAM', true],
      ['OTRAM', true],
    ])
    expect(OUS_REGISTER.primartStoffFor('AMTNORSUM')?.slug).toBe('amitriptylin')
    expect(OUS_REGISTER.primartStoffFor('NOR')?.slug).toBe('nortriptylin')
    expect(OUS_REGISTER.primartStoffFor('HBUP')?.slug).toBe('bupropion')
  })

  it('gir hver kode kortet på siden til sitt primære stoff: hovedanalytten det uten koden, de andre sitt eget', async () => {
    const omrader = await brukerleser.lesReferanseomrader('publisert', OUS_KATALOG)
    expect([...omrader].sort(([a], [b]) => a.localeCompare(b))).toEqual([
      ['NOR', { nedre: 30, ovre: 60, enhet: 'nmol/L', forbehold: '' }],
      ['OTRAM', { nedre: null, ovre: 5, enhet: 'nmol/L', forbehold: '' }],
      ['TRAM', SYNTETISK],
    ])
  })

  it('får kortene fra databasen per stoff, og knytter dem til kodene i appen', async () => {
    const { les_stoffreferanseomrader: kortene } = await kall.rpc<{ les_stoffreferanseomrader: Stoffreferanseomrade[] }>(
      bruker,
      'les_stoffreferanseomrader',
      { sidetilstand: 'publisert' },
    )
    expect(kortene.map((k) => [k.stoff, k.gjelder])).toEqual([
      ['nortriptylin', null],
      ['testmiddel', null],
      ['tramadol', null],
      ['tramadol', 'o-desmetyltramadol'],
    ])
    expect([...referanseomraderPerAnalytt(kortene, OUS_KATALOG).keys()].sort()).toEqual(['NOR', 'OTRAM', 'TRAM'])
  })

  it('gir et annet fagmiljø med egne koder de samme kortene, gjennom forbindelsen kodene måler', async () => {
    const omrader = await brukerleser.lesReferanseomrader('publisert', annenKatalog())
    // Metabolitten står først i katalogen, men får sitt eget kort, og
    // tramadolkoden sidens egne. Urinanalysen får ingenting.
    expect([...omrader].sort(([a], [b]) => a.localeCompare(b))).toEqual([
      ['ODMT', { nedre: null, ovre: 5, enhet: 'nmol/L', forbehold: '' }],
      ['TRML', SYNTETISK],
    ])
    // Uten forbindelsen og datakortene i katalogen får ingen kode noe — heller
    // ikke den som står først — så en ny katalog aldri får et kort ved et uhell.
    const uten = annenKatalog()
    const tom = { koblinger: uten.koblinger, finn: (kode: string) => uten.finn(kode) && { kode, forbindelse: null, datakort: null } }
    expect([...(await brukerleser.lesReferanseomrader('publisert', tom))]).toEqual([])
  })

  it('leser et kort som fra før har analyttkoden i gjelder, som kortet for forbindelsen koden måler', () => {
    // Overgangen til kortene er skrevet om: appen fra før finner kortet med
    // koden, den nye gjennom katalogen eller `ELDRE_DATAKORTKODER`, så også et
    // annet fagmiljø med en egen kode for metabolitten får kortet.
    const kortene = [
      { stoff: 'tramadol', gjelder: null, verdi: 'tramadol' },
      { stoff: 'tramadol', gjelder: 'OTRAM', verdi: 'o-desmetyltramadol' },
    ]
    expect([...referanseomraderPerAnalytt(kortene, OUS_KATALOG)].sort()).toEqual([
      ['OTRAM', 'o-desmetyltramadol'],
      ['TRAM', 'tramadol'],
    ])
    expect([...referanseomraderPerAnalytt(kortene, annenKatalog())].sort()).toEqual([
      ['ODMT', 'o-desmetyltramadol'],
      ['TRML', 'tramadol'],
    ])
  })

  it('gir en sumanalyse ikke kortet på siden til et stoff den bare er sekundært koblet til', async () => {
    expect((await brukerleser.lesReferanseomrader('publisert', OUS_KATALOG)).has('AMTNORSUM')).toBe(false)
  })

  it('gir en vanlig bruker ingenting av utkastet', async () => {
    expect([...(await brukerleser.lesReferanseomrader('utkast', OUS_KATALOG))]).toEqual([])
    expect([...(await adminleser.lesReferanseomrader('utkast', OUS_KATALOG))].map(([kode]) => kode).sort()).toEqual([
      'NOR',
      'OTRAM',
      'TRAM',
    ])
  })

  it('følger siden: en endring gjelder i steg 2 først når den er publisert', async () => {
    const analyte = { kode: 'TRAM', enhet: 'nmol/L' } as Analyte
    const pille = async (tilstand: 'utkast' | 'publisert') =>
      grensepiller(analyte, null, (await adminleser.lesReferanseomrader(tilstand, OUS_KATALOG)).get('TRAM') ?? null)[0]?.verdi

    const endret = await lager.lagreUtkast(ider.kort, 1, {
      infoside: ider.tramadol,
      panel: 'viktige_data',
      posisjon: 0,
      elementtype: 'referanseomrade',
      data: { nedre: 12, ovre: 25, enhet: 'nmol/L', forbehold: '' },
      referanser: [],
    })
    expect(await pille('utkast')).toBe('12 – 25 nmol/L')
    expect(await pille('publisert')).toBe('10 – 20 nmol/L')

    await publiser(endret)
    expect(await pille('publisert')).toBe('12 – 25 nmol/L')
    // Metabolitten beholder sitt eget.
    expect((await brukerleser.lesReferanseomrader('publisert', OUS_KATALOG)).get('OTRAM')).toMatchObject({ ovre: 5 })
  })

  it('tar ikke med et kort uten tall', async () => {
    const tomt = await lager.lagreUtkast(ider.fjernet, 1, {
      infoside: ider.bupropion,
      panel: 'viktige_data',
      posisjon: 0,
      elementtype: 'referanseomrade',
      data: { nedre: null, ovre: null, enhet: '', forbehold: '' },
      referanser: [],
    })
    await publiser(tomt)
    const { les_stoffreferanseomrader: kortene } = await kall.rpc<{ les_stoffreferanseomrader: Stoffreferanseomrade[] }>(
      bruker,
      'les_stoffreferanseomrader',
      { sidetilstand: 'publisert' },
    )
    // Kortet står nå på siden, men har ingen tall å vise.
    expect(kortene.some((k) => k.stoff === 'bupropion')).toBe(true)
    expect((await brukerleser.lesReferanseomrader('publisert', OUS_KATALOG)).has('HBUP')).toBe(false)
  })
})
