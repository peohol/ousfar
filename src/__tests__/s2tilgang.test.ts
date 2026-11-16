/**
 * Startport S2 (P0 §6.3, docs/s2-kontrollrapport.md): den samlede negative
 * tilgangsmatrisen mellom fagmiljø A (OUS Klinisk farmakologi) og B (OUS
 * Rettstoksikologi), prøvd i **begge retninger** med de samme handlingene.
 *
 * Hvert fagmiljø får de samme lokale dataene — en publisert
 * fortolkningskommentar og et utkast, et konsentrasjonsregelsett, en tråd på
 * fortolkningssiden og en oppføring i analyttkatalogen — og hver person i
 * persongalleriet prøver hver handling mot begge. Hva personen skal få, er
 * avledet av rollene i galleriet (`PERSONER`) etter rettighetsmatrisen i P0
 * §5.2, ikke skrevet for hånd per tilfelle:
 *
 * - **lese**: aktivt medlem av fagmiljøet, eller systemarkitekt;
 * - **endre** og **moderere**: lokal administrator der, eller systemarkitekt;
 * - **administrere medlemskap**: lokal administrator der, eller systemarkitekt;
 * - **fortolke** (katalogen og reglene fortolkningen slår opp): bare
 *   arbeidskonteksten, det aktive primærmedlemskapet — også for en
 *   systemarkitekt, så ingen får et annet fagmiljøs regler som reserve.
 *
 * B er åpnet for medlemmer i testdatabasen, slik den blir når S2 er passert
 * (`byggPersongalleri`). De som har mistet alle medlemskap, med fortsatt
 * gyldig token, får ingenting fra noen av dem.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { byggPersongalleri, FAGMILJOER, PERSONER, type Fagmiljo, type Person, type Persondefinisjon, type Persongalleri } from './hjelp/persongalleri'
import { nyDatabase, som } from './hjelp/testdatabase'

type Utfall = 'tilgang' | 'avvist'
/**
 * `redigere`: lese og lagre utkast, som også redaktøren for fortolkningen får
 * (P5). `endre`: publisere og moderere, som bare administratorene får.
 */
type Rett = 'lese' | 'redigere' | 'endre' | 'administrere' | 'fortolke'

/** Det hvert fagmiljø får av lokale data i testen. */
interface Lokaledata {
  kommentar: string
  utkast: string
  traad: string
  /** En analyttkode med publisert regelsett i fagmiljøet. */
  kode: string
  /** En kode i fagmiljøets analyttkatalog. */
  katalogkode: string
  /** En vanlig bruker som bare er medlem her (målet for medlemskapshandlingene). */
  medlem: Person
  /** En vanlig bruker som bare er medlem i det andre fagmiljøet. */
  utenfor: Person
}

interface Kontekst {
  tx: Transaction
  x: Lokaledata
  g: Persongalleri
  side: Fagmiljo
}

interface Handling {
  navn: string
  rett: Rett
  prov: (k: Kontekst) => Promise<boolean>
}

const SIDER = Object.keys(FAGMILJOER) as Fagmiljo[]
const andre = (side: Fagmiljo): Fagmiljo => SIDER.find((s) => s !== side)!
const DOK = (tekst: string) => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tekst }] }] })
const KOMMENTAR = (navn: string) => ({ navn, tekst: `Syntetisk tekst for ${navn}.`, plassholdere: [] })
const SIDE = 'fortolkning:syntetisk-s2'

const rader = async (k: Kontekst, sql: string, p: unknown[] = []) => (await k.tx.query(sql, p)).rows.length > 0
const verdi = async (k: Kontekst, sql: string, p: unknown[] = []) => {
  const v = Object.values((await k.tx.query<Record<string, unknown>>(sql, p)).rows[0] ?? {})[0]
  return v !== null && v !== undefined && v !== false
}
const lykkes = async (k: Kontekst, sql: string, p: unknown[] = []) => {
  await k.tx.query(sql, p)
  return true
}
const nevner = (k: Kontekst, kall: string, tekst: string, p: unknown[] = []) =>
  verdi(k, `select strpos((${kall})::text, $${p.length + 1}) > 0`, [...p, tekst])

/** Handlingene, hver prøvd mot dataene til begge fagmiljøene. */
const HANDLINGER: readonly Handling[] = [
  // Faginnholdet (P2a): kommentaren, revisjonene, historikken og rekkevidden.
  { navn: 'leser den publiserte kommentaren', rett: 'lese', prov: (k) => nevner(k, `public.les_kommentarer('publisert', array[$1]::uuid[])`, k.x.kommentar, [k.x.kommentar]) },
  { navn: 'leser kommentaren direkte i tabellen', rett: 'lese', prov: (k) => rader(k, 'select 1 from public.kommentarer where objekt_id = $1', [k.x.kommentar]) },
  { navn: 'leser revisjonene av kommentaren', rett: 'lese', prov: (k) => rader(k, 'select 1 from public.objektrevisjoner where objekt_id = $1', [k.x.kommentar]) },
  { navn: 'leser historikken til kommentaren', rett: 'lese', prov: (k) => verdi(k, `select jsonb_array_length(public.les_historikk($1) -> 'hendelser') > 0`, [k.x.kommentar]) },
  { navn: 'leser rekkevidden til kommentaren', rett: 'lese', prov: (k) => rader(k, 'select 1 from public.ressursomfang where objekt_id = $1', [k.x.kommentar]) },
  { navn: 'leser regelsettet direkte i tabellen', rett: 'lese', prov: (k) => rader(k, `select 1 from public.intervallregelsett where analyttkode = $1 and fagmiljo_id = $2`, [k.x.kode, k.g.fagmiljo[k.side]]) },
  { navn: 'leser utkastet', rett: 'redigere', prov: (k) => nevner(k, `public.les_kommentarer('utkast', array[$1]::uuid[])`, k.x.utkast, [k.x.utkast]) },
  { navn: 'lagrer utkastet', rett: 'redigere', prov: (k) => lykkes(k, 'select public.lagre_utkast($1, 1, $2)', [k.x.utkast, JSON.stringify(KOMMENTAR('Endret'))]) },
  { navn: 'publiserer utkastet', rett: 'endre', prov: (k) => lykkes(k, 'select public.publiser_utkast($1, 1)', [k.x.utkast]) },

  // Samhandlingen (P2b): tråden på fortolkningssiden, varslene og lenkene.
  { navn: 'leser tråden på fortolkningssiden', rett: 'lese', prov: (k) => rader(k, 'select 1 from public.diskusjoner where id = $1', [k.x.traad]) },
  { navn: 'leser innleggene i tråden', rett: 'lese', prov: (k) => verdi(k, 'select public.diskusjonstraad($1)', [k.x.traad]) },
  { navn: 'slår opp tråden med direktelenke', rett: 'lese', prov: (k) => verdi(k, `select public.direktelenke('diskusjon', $1)`, [k.x.traad]) },
  { navn: 'skriver i tråden', rett: 'lese', prov: (k) => lykkes(k, 'insert into public.diskusjonskommentarer (diskusjon_id, tekst) values ($1, $2)', [k.x.traad, DOK('Hei')]) },
  { navn: 'skjuler tråden (moderering)', rett: 'endre', prov: (k) => lykkes(k, 'select public.skjul_i_diskusjon($1, null)', [k.x.traad]) },

  // Medlemskapene og kontoene (P1.2a, P3).
  { navn: 'ser medlemslista', rett: 'administrere', prov: (k) => rader(k, 'select 1 from public.medlemsoversikt($1)', [k.g.fagmiljo[k.side]]) },
  { navn: 'gir en bruker fra det andre fagmiljøet medlemskap', rett: 'administrere', prov: (k) => lykkes(k, 'select public.gi_medlemskap($1, $2)', [k.g.id[k.x.utenfor], k.g.fagmiljo[k.side]]) },
  { navn: 'avslutter medlemskapet til en vanlig bruker', rett: 'administrere', prov: (k) => lykkes(k, 'select public.avslutt_medlemskap($1, $2)', [k.g.id[k.x.medlem], k.g.fagmiljo[k.side]]) },
  { navn: 'kan gi nytt passord til en vanlig bruker', rett: 'administrere', prov: (k) => verdi(k, 'select nytt_passord from public.mine_kontohandlinger() where bruker_id = $1', [k.g.id[k.x.medlem]]) },

  // Fortolkningen (P4b, P4c): det oppslagene og katalogen gir.
  { navn: 'får regelsettet i fortolkningen', rett: 'fortolke', prov: (k) => verdi(k, `select public.finn_intervallregelsett($1, 'publisert') is not null`, [k.x.kode]) },
  { navn: 'får regelsettet blant alle regelsettene', rett: 'fortolke', prov: (k) => nevner(k, `public.les_intervallregelsett('publisert')`, `"analyttkode": "${k.x.kode}"`) },
  { navn: 'får koden i analyttkatalogen', rett: 'fortolke', prov: (k) => nevner(k, 'public.les_analyttkatalog()', `"kode": "${k.x.katalogkode}"`) },
]

/** Det personen skal få etter rollene i galleriet (P0 §5.2). */
function forventet(def: Persondefinisjon, side: Fagmiljo, rett: Rett): Utfall {
  const aktiv = def.primaer !== null
  const medlem = aktiv && (def.primaer === side || (def.ogsaAktivI ?? []).includes(side))
  const admin = aktiv && (def.lokalAdminI ?? []).includes(side)
  const arkitekt = aktiv && def.systemarkitekt === true
  const redaktor = medlem && (def.redaktorForFortolkningI ?? []).includes(side)
  const svar: Record<Rett, boolean> = {
    lese: medlem || arkitekt,
    redigere: admin || arkitekt || redaktor,
    endre: admin || arkitekt,
    administrere: admin || arkitekt,
    fortolke: def.primaer === side,
  }
  return svar[rett] ? 'tilgang' : 'avvist'
}

let db: PGlite
let g: Persongalleri
const data = {} as Record<Fagmiljo, Lokaledata>

const somBruker = <T>(brukerId: string, sql: string, p: unknown[] = []): Promise<T> =>
  som(db, brukerId, async (tx) => Object.values((await tx.query<Record<string, T>>(sql, p)).rows[0]!)[0] as T)

/** En vanlig bruker med eneste medlemskap i fagmiljøet, fra galleriet. */
function vanligBareI(side: Fagmiljo): Person {
  const funnet = (Object.entries(PERSONER) as [Person, Persondefinisjon][]).find(
    ([, d]) => d.primaer === side && !d.ogsaAktivI?.length && !d.lokalAdminI?.length && !d.systemarkitekt && d.rolle === 'user' && !d.avsluttetI,
  )
  if (!funnet) throw new Error(`Galleriet har ingen vanlig bruker bare i ${side}.`)
  return funnet[0]
}

/** En lokal administrator i fagmiljøet som ikke er systemarkitekt, fra galleriet. */
function administratorI(side: Fagmiljo): Person {
  const funnet = (Object.entries(PERSONER) as [Person, Persondefinisjon][]).find(
    ([, d]) => d.primaer === side && (d.lokalAdminI ?? []).includes(side) && !d.systemarkitekt,
  )
  if (!funnet) throw new Error(`Galleriet har ingen lokal administrator i ${side}.`)
  return funnet[0]
}

/**
 * Legger inn de samme lokale dataene i fagmiljøet, gjennom de samme
 * funksjonene appen bruker, som den lokale administratoren og en vanlig
 * bruker der. Ingen kliniske verdier: koden og katalogen er syntetiske.
 */
async function leggInnLokaledata(side: Fagmiljo): Promise<Lokaledata> {
  const admin = g.id[administratorI(side)]
  const medlem = vanligBareI(side)
  const opprett = (type: string, innhold: object) =>
    somBruker<string>(admin, `select (public.opprett_utkast($1, $2)).id`, [type, JSON.stringify(innhold)])
  const publiser = (id: string) => somBruker(admin, 'select public.publiser_utkast($1, 1) is not null', [id])

  const kommentar = await opprett('kommentar', KOMMENTAR(`S2 publisert ${side}`))
  await publiser(kommentar)
  const utkast = await opprett('kommentar', KOMMENTAR(`S2 utkast ${side}`))

  const kode = `S2TEST${side}`
  const regelsett = await opprett('intervallregelsett', {
    analyttkode: kode,
    enhet: 'nmol/L',
    desimaler: 0,
    skillepunkter: [],
    intervaller: [{ niva: 'innenfor', handling: null, kommentar }],
    ringegrense: null,
    cutoff: null,
  })
  await publiser(regelsett)

  // Samme navn og emoji i begge: kategoriene er unike i hvert fagmiljøs rom (#395).
  const kategori = await somBruker<string>(g.id[medlem], 'select public.opprett_diskusjonskategori($1, $2, $3)', [SIDE, 'S2', '🔒'])
  const traad = await somBruker<string>(g.id[medlem], 'select public.opprett_diskusjon($1, $2, $3, $4)', [SIDE, kategori, `Tråd i ${side}`, DOK('Første innlegg')])

  // Katalogen endres bare med migrasjoner; testen legger inn en syntetisk oppføring direkte.
  const fagmiljo = g.fagmiljo[side]
  const katalogkode = `S2KAT${side}`
  await db.transaction(async (tx) => {
    await tx.query(
      `insert into public.analyttkatalog_metoder (fagmiljo_id, kode, beskrivelse, posisjon)
       values ($1, 'S2METODE', 'Syntetisk metode', coalesce((select max(posisjon) + 1 from public.analyttkatalog_metoder where fagmiljo_id = $1), 0))`,
      [fagmiljo],
    )
    await tx.query(
      `insert into public.analyttkatalog_oppforinger (fagmiljo_id, nokkel, posisjon, type, navn, visningsnavn, gruppe, analysemetode, maleomrade)
       values ($1, $2, coalesce((select max(posisjon) + 1 from public.analyttkatalog_oppforinger where fagmiljo_id = $1), 0),
               'konsentrasjon', 'Syntetisk analytt', 'Syntetisk analytt', 'Syntetisk', 'S2METODE', '{"deler": []}')`,
      [fagmiljo, katalogkode],
    )
    await tx.query(`insert into public.analyttkatalog_koder (fagmiljo_id, nokkel, posisjon, kode, navn) values ($1, $2, 0, $2, 'Syntetisk analytt')`, [
      fagmiljo,
      katalogkode,
    ])
  })
  return { kommentar, utkast, traad, kode, katalogkode, medlem, utenfor: vanligBareI(andre(side)) }
}

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  for (const side of SIDER) data[side] = await leggInnLokaledata(side)
}, 180_000)

afterAll(async () => {
  await db.close()
})

/** Prøver handlingen som personen, i en transaksjon som alltid rulles tilbake. */
async function utfall(person: Person, side: Fagmiljo, h: Handling): Promise<Utfall> {
  try {
    return await som(db, g.id[person], async (tx) => {
      try {
        return (await h.prov({ tx, x: data[side], g, side })) ? 'tilgang' : 'avvist'
      } finally {
        await tx.rollback()
      }
    })
  } catch (feil) {
    // 42501 er nektet; PT404 er svaret for et objekt personen ikke kan lese, likt som for et som ikke finnes.
    if (['42501', 'PT404'].includes((feil as { code?: string }).code ?? '')) return 'avvist'
    throw feil
  }
}

const TILFELLER = (Object.keys(PERSONER) as Person[]).flatMap((person) =>
  SIDER.flatMap((side) => HANDLINGER.map((h) => [`${person} → ${side}: ${h.navn}`, person, side, h] as const)),
)

describe('tilgangsmatrisen A↔B for startport S2', () => {
  it.each(TILFELLER)('%s', async (_, person, side, h) => {
    expect(await utfall(person, side, h)).toBe(forventet(PERSONER[person], side, h.rett))
  })

  it('prøver hver handling i begge retninger, med både tilgang og avslag', () => {
    for (const h of HANDLINGER) {
      for (const side of SIDER) {
        const svar = new Set((Object.keys(PERSONER) as Person[]).map((p) => forventet(PERSONER[p], side, h.rett)))
        expect([...svar].sort(), `${h.navn} mot ${side}`).toEqual(['avvist', 'tilgang'])
      }
    }
  })

  it('gir ingen fra det andre fagmiljøet et varsel om publiseringen', async () => {
    for (const side of SIDER) {
      for (const person of Object.keys(PERSONER) as Person[]) {
        const fikk = await som(db, g.id[person], async (tx) =>
          (await tx.query(`select 1 from public.varsler where kategori = 'fortolkning' and hendelser::text like '%' || $1 || '%'`, [data[side].kommentar])).rows.length > 0,
        ).catch(() => false)
        if (forventet(PERSONER[person], side, 'lese') === 'avvist') expect(fikk, `${person} om ${side}`).toBe(false)
        // Varslet når fram til medlemmene, så avslaget over ikke er tomt.
        if (person === data[side].medlem) expect(fikk, `${person} om ${side}`).toBe(true)
      }
    }
  })
})
