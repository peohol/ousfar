/**
 * P5 tråd D: de tverrgående kontrollene i testplanen (docs/p5-testplan.md,
 * avsnitt 3 og 8). Trådene prøver sine egne funksjoner i sine egne tester;
 * her prøves hver inngang for hele persongalleriet, med koden kontrakten
 * krever (avsnitt 1): `PT404` for det personen ikke kan se, med samme tekst som
 * for en ID som ikke finnes, og `42501` for det personen ser, men ikke har rett
 * til. Hvert kall kjøres i en transaksjon som rulles tilbake.
 *
 * Bygger på redaktøransvaret (tråd A) og endringsforslagene (tråd B).
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { leggInnP5data, forslagsargumenter, type P5data } from './hjelp/p5data'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { nyDatabase, som } from './hjelp/testdatabase'

/** `V` er tilgang; en kode er avvisningen kontrakten krever; `nei` er avvist med `42501` eller `PT404`. */
type Ventet = 'V' | 'PT404' | '42501' | 'nei'
type Svar = { kode: 'V'; verdi: unknown } | { kode: string; melding: string }

const INGEN = '00000000-0000-4000-8000-00000000d404'

let db: PGlite
let g: Persongalleri
let d: P5data

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  d = await leggInnP5data(db, g)
}, 120_000)

afterAll(async () => {
  await db.close()
})

/** Ett kall: funksjonen i `public` med navngitte argumenter. */
type Steg = readonly [funksjon: string, argumenter: Record<string, unknown>]

const sqlFor = ([funksjon, argumenter]: Steg) => {
  const navn = Object.keys(argumenter)
  return {
    sql: `select public.${funksjon}(${navn.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as v`,
    verdier: Object.values(argumenter).map((v) => (v !== null && typeof v === 'object' ? JSON.stringify(v) : v)),
  }
}

/**
 * Kjører stegene etter hverandre som personen i én transaksjon som alltid
 * rulles tilbake, og gir svaret fra det siste (eller den første feilen).
 */
async function kjede(p: Person, ...steg: Steg[]): Promise<Svar> {
  try {
    return await som(db, g.id[p], async (tx) => {
      try {
        let verdi: unknown
        for (const s of steg) {
          const { sql, verdier } = sqlFor(s)
          verdi = (await tx.query<{ v: unknown }>(sql, verdier)).rows[0]?.v
        }
        return { kode: 'V' as const, verdi }
      } finally {
        await tx.rollback()
      }
    })
  } catch (feil) {
    const { code, message } = feil as { code?: string; message?: string }
    if (!code) throw feil
    return { kode: code, melding: message ?? '' }
  }
}

const kall = (p: Person, funksjon: string, argumenter: Record<string, unknown>) => kjede(p, [funksjon, argumenter])

/** Kaller som personen og lagrer (uten tilbakerulling); kaster ved feil. */
async function utfor(p: Person, funksjon: string, argumenter: Record<string, unknown> = {}): Promise<unknown> {
  const { sql, verdier } = sqlFor([funksjon, argumenter])
  return som(db, g.id[p], async (tx) => (await tx.query<{ v: unknown }>(sql, verdier)).rows[0]?.v)
}

const AVVIST_KODER = ['42501', 'PT404']
const passer = (svar: Svar, ventet: Ventet) => (ventet === 'nei' ? AVVIST_KODER.includes(svar.kode) : svar.kode === ventet)

/** Prøver én inngang for alle personene i raden og samler avvikene, så én kjøring viser alle. */
async function prov(
  inngang: string,
  ventet: Partial<Record<Person, Ventet>>,
  utfor: (p: Person) => Promise<Svar>,
): Promise<void> {
  const avvik: string[] = []
  for (const [p, v] of Object.entries(ventet) as [Person, Ventet][]) {
    const svar = await utfor(p)
    if (!passer(svar, v)) avvik.push(`${p}: ventet ${v}, fikk ${svar.kode}${'melding' in svar ? ` (${svar.melding})` : ''}`)
  }
  expect(avvik, inngang).toEqual([])
}

/** De to uten aktivt medlemskap, med gyldig token: avvist overalt. */
const UTEN: Partial<Record<Person, Ventet>> = { utenMedlemskap: 'nei', tidligereAdmin: 'nei' }

/** Alle med aktivt medlemskap, med samme utfall. */
const AKTIVE = (v: Ventet): Partial<Record<Person, Ventet>> => ({
  vanligA: v,
  vanligB: v,
  dobbeltAB: v,
  avsluttetA: v,
  adminA: v,
  adminB: v,
  systemarkitekt: v,
  arkitektB: v,
  redaktorRessursA: v,
  redaktorFortolkningA: v,
})

describe('3.1 foreslå og følge', () => {
  const foreslaa = (ressurs: () => string, element: () => string | null = () => null) => (p: Person) =>
    kall(p, 'foresla_endring', forslagsargumenter(ressurs(), element()))

  it('et forslag til et lokalt regelsett i A kommer bare fra de aktive i A og systemarkitektene', async () => {
    await prov(
      'foresla_endring(RA1)',
      { ...AKTIVE('V'), vanligB: 'PT404', avsluttetA: 'PT404', adminB: 'PT404', ...UTEN },
      foreslaa(() => d.RA1),
    )
  })

  it('et forslag til et lokalt regelsett i B kommer bare fra de aktive i B og systemarkitektene', async () => {
    await prov(
      'foresla_endring(RB)',
      { ...AKTIVE('V'), vanligA: 'PT404', adminA: 'PT404', redaktorRessursA: 'PT404', redaktorFortolkningA: 'PT404', ...UTEN },
      foreslaa(() => d.RB),
    )
  })

  it('alle med aktivt medlemskap foreslår for en fagside og et kort på den', async () => {
    await prov('foresla_endring(F)', { ...AKTIVE('V'), ...UTEN }, foreslaa(() => d.F))
    await prov('foresla_endring(F, F.kort)', { ...AKTIVE('V'), ...UTEN }, foreslaa(() => d.F, () => d.Fkort))
  })

  it('et forslag ses av forslagsstilleren og de som behandler ressursen, ingen andre', async () => {
    const les = (forslag: () => string) => (p: Person) => kall(p, 'les_forslag', { forslag: forslag() })
    const ingen = { ...AKTIVE('PT404'), ...UTEN }
    // RA1 har en redaktør for regelsettet og en for fortolkningen i A; administratoren og systemarkitektene behandler fortsatt.
    await prov('les_forslag(FA1)', { ...ingen, vanligA: 'V', adminA: 'V', systemarkitekt: 'V', arkitektB: 'V', redaktorRessursA: 'V', redaktorFortolkningA: 'V' }, les(() => d.FA1))
    await prov('les_forslag(FA2)', { ...ingen, vanligA: 'V', adminA: 'V', systemarkitekt: 'V', arkitektB: 'V', redaktorFortolkningA: 'V' }, les(() => d.FA2))
    await prov('les_forslag(FB)', { ...ingen, vanligB: 'V', adminB: 'V', systemarkitekt: 'V', arkitektB: 'V' }, les(() => d.FB))
    await prov('les_forslag(FF)', { ...ingen, vanligB: 'V', systemarkitekt: 'V', arkitektB: 'V' }, les(() => d.FF))
  })

  it('bare forslagsstilleren trekker og svarer; en behandler får 42501, en fremmed PT404', async () => {
    const ventet = { ...AKTIVE('PT404'), ...UTEN, vanligA: 'V', adminA: '42501', systemarkitekt: '42501', arkitektB: '42501', redaktorRessursA: '42501', redaktorFortolkningA: '42501' } as const
    await prov('trekk_forslag(FA1)', ventet, (p) => kall(p, 'trekk_forslag', { forslag: d.FA1, begrunnelse: null }))
    await prov('svar_pa_forslag(FA1)', ventet, (p) => kall(p, 'svar_pa_forslag', { forslag: d.FA1, tekst: 'Syntetisk svar.' }))
  })

  it('«Mine forslag» nevner bare den innloggedes egne', async () => {
    const alle = [d.FA1, d.FA2, d.FB, d.FF]
    const egne: Partial<Record<Person, string[]>> = { vanligA: [d.FA1, d.FA2], vanligB: [d.FB, d.FF] }
    const avvik: string[] = []
    for (const p of Object.keys({ ...AKTIVE('V'), ...UTEN }) as Person[]) {
      const svar = await kall(p, 'les_mine_forslag', {})
      const tekst = svar.kode === 'V' ? JSON.stringify((svar as { verdi: unknown }).verdi) : ''
      const nevnt = alle.filter((id) => tekst.includes(id)).sort()
      if (JSON.stringify(nevnt) !== JSON.stringify((egne[p] ?? []).slice().sort())) avvik.push(`${p}: ${svar.kode} ${nevnt.join(',')}`)
    }
    expect(avvik).toEqual([])
  })

  it('et fremmed forslag gir samme kode og tekst som et som ikke finnes', async () => {
    for (const [funksjon, ekstra] of [
      ['les_forslag', {}],
      ['trekk_forslag', { begrunnelse: null }],
      ['svar_pa_forslag', { tekst: 'Syntetisk svar.' }],
    ] as const) {
      const fremmed = await kall('vanligA', funksjon, { forslag: d.FB, ...ekstra })
      const ukjent = await kall('vanligA', funksjon, { forslag: INGEN, ...ekstra })
      expect(fremmed, funksjon).toEqual(ukjent)
      expect(fremmed.kode, funksjon).toBe('PT404')
    }
  })

  it('et element fra et annet fagmiljø røper ikke at det finnes', async () => {
    const fremmed = await kall('vanligA', 'foresla_endring', forslagsargumenter(d.RA1, d.RBkommentar))
    const ukjent = await kall('vanligA', 'foresla_endring', forslagsargumenter(d.RA1, INGEN))
    expect(fremmed.kode).not.toBe('V')
    expect(fremmed).toEqual(ukjent)
  })

  it('et regelsett i et annet fagmiljø gir samme kode og tekst som et som ikke finnes', async () => {
    const fremmed = await kall('vanligA', 'foresla_endring', forslagsargumenter(d.RB))
    const ukjent = await kall('vanligA', 'foresla_endring', forslagsargumenter(INGEN))
    expect(fremmed).toEqual(ukjent)
    expect(fremmed.kode).toBe('PT404')
  })

  it('et element eller en referanse er ikke en ressurs, og et upublisert regelsett får ikke forslag', async () => {
    for (const ressurs of [d.Fkort, d.RA1kommentar, d.Rutkast]) {
      expect((await kall('vanligA', 'foresla_endring', forslagsargumenter(ressurs))).kode, ressurs).not.toBe('V')
    }
  })
})

describe('3.3 redaktøransvaret på tvers av personene', () => {
  it('fortolkningen i B gis av systemarkitektene og administratoren der, ikke fra A eller til seg selv', async () => {
    const gi = (bruker: Person) => (p: Person) =>
      kall(p, 'tildel_redaktoransvar', { bruker: g.id[bruker], omrade: 'fortolkning', ressurs: null, fagmiljo: g.fagmiljo.B, merknad: null })
    await prov(
      'tildel_redaktoransvar(fortolkning B → vanligB)',
      { systemarkitekt: 'V', arkitektB: 'V', adminB: 'V', adminA: 'nei', vanligB: 'nei', dobbeltAB: 'nei', redaktorFortolkningA: 'nei', ...UTEN },
      gi('vanligB'),
    )
    await prov('tildel_redaktoransvar(fortolkning B → seg selv)', { arkitektB: 'nei', adminB: 'nei' }, (p) => gi(p)(p))
  })

  it('et regelsett gis av administratoren i fagmiljøet; et fra et annet fagmiljø er ukjent', async () => {
    const gi = (ressurs: () => string) => (p: Person) =>
      kall(p, 'tildel_redaktoransvar', { bruker: g.id.vanligA, omrade: 'ressurs', ressurs: ressurs(), fagmiljo: null, merknad: null })
    await prov('tildel_redaktoransvar(RA1 → vanligA)', { adminA: 'V', systemarkitekt: 'V', adminB: 'PT404', vanligA: 'nei', redaktorRessursA: 'nei', ...UTEN }, gi(() => d.RA1))
    await prov('tildel_redaktoransvar(RB → vanligA)', { adminA: 'PT404' }, gi(() => d.RB))
  })

  it('ansvaret for fortolkningen i A tas tilbake av administratoren der og systemarkitektene', async () => {
    const { rows } = await db.query<{ id: string }>(
      `select id from public.redaktoransvar where bruker_id = $1 and omrade = 'fortolkning' and tilbakekalt_kl is null`,
      [g.id.redaktorFortolkningA],
    )
    const ansvar = rows[0]!.id
    await prov(
      'tilbakekall_redaktoransvar(fortolkning A)',
      { adminA: 'V', systemarkitekt: 'V', adminB: 'PT404', redaktorFortolkningA: 'nei', vanligA: 'nei', redaktorRessursA: 'nei', ...UTEN },
      (p) => kall(p, 'tilbakekall_redaktoransvar', { ansvar }),
    )
  })

  it('redaktørene for et regelsett vises for dem som behandler det, og er ukjent for et annet fagmiljø', async () => {
    await prov(
      'ressursens_redaktoransvar(RA1)',
      { adminA: 'V', systemarkitekt: 'V', redaktorRessursA: 'V', redaktorFortolkningA: 'V', vanligA: 'nei', dobbeltAB: 'nei', vanligB: 'PT404', adminB: 'PT404', avsluttetA: 'PT404', ...UTEN },
      (p) => kall(p, 'ressursens_redaktoransvar', { ressurs: d.RA1 }),
    )
  })
})

describe('3.5 direkte i tabellene', () => {
  /** Tabellene, med en kolonne som kan settes til seg selv i en endring. */
  const KOLONNE = { redaktoransvar: 'omrade', endringsforslag: 'sted', endringsforslag_hendelser: 'tekst' } as const
  const TABELLER = Object.keys(KOLONNE) as (keyof typeof KOLONNE)[]
  const personer = Object.keys({ ...AKTIVE('V'), ...UTEN }) as Person[]

  const fasit = async () =>
    Object.fromEntries(
      await Promise.all(
        TABELLER.map(async (t) => [t, (await db.query<{ h: string }>(`select md5(coalesce(string_agg(x::text, '|' order by x::text), '')) as h from public.${t} x`)).rows[0]!.h] as const),
      ),
    )

  /** Antall rader personen fikk lest eller endret; en avvisning (42501) teller som null. */
  const rader = (p: Person, sql: string) =>
    som(db, g.id[p], async (tx) => {
      try {
        return (await tx.query(sql)).affectedRows ?? 0
      } catch (feil) {
        if ((feil as { code?: string }).code === '42501') return 0
        throw feil
      } finally {
        await tx.rollback()
      }
    })

  it('ingen leser, legger inn, endrer eller sletter noe uten funksjonene', async () => {
    const for_ = await fasit()
    const avvik: string[] = []
    for (const p of personer) {
      for (const t of TABELLER) {
        const lest = await som(db, g.id[p], async (tx) => {
          try {
            return (await tx.query(`select * from public.${t}`)).rows.length
          } catch (feil) {
            if ((feil as { code?: string }).code === '42501') return 0
            throw feil
          } finally {
            await tx.rollback()
          }
        })
        const endret = await rader(p, `update public.${t} set ${KOLONNE[t]} = ${KOLONNE[t]}`)
        const slettet = await rader(p, `delete from public.${t}`)
        if (lest + endret + slettet > 0) avvik.push(`${p} ${t}: lest ${lest}, endret ${endret}, slettet ${slettet}`)
      }
      // Selvheving: å gi seg selv ansvar eller legge inn et forslag direkte.
      const ansvar = await feilkode(p, `insert into public.redaktoransvar (bruker_id, omrade, fagmiljo_id) values ('${g.id[p]}', 'fortolkning', '${g.fagmiljo.A}')`)
      const forslag = await feilkode(p, `insert into public.endringsforslag (ressurs_id, stilt_av) values ('${d.RA1}', '${g.id[p]}')`)
      if (ansvar !== '42501') avvik.push(`${p} legger inn ansvar: ${ansvar}`)
      if (forslag !== '42501') avvik.push(`${p} legger inn forslag: ${forslag}`)
    }
    expect(avvik).toEqual([])
    expect(await fasit()).toEqual(for_)
  })

  const feilkode = (p: Person, sql: string) =>
    som(db, g.id[p], async (tx) => {
      try {
        await tx.query(sql)
        return 'V'
      } catch (feil) {
        return (feil as { code?: string }).code ?? 'ukjent'
      } finally {
        await tx.rollback().catch(() => undefined)
      }
    })
})

describe('3.2 behandle', () => {
  /** Behandlerne per forslag (testplanen 3.2); alle andre ser ikke forslaget (PT404), forslagsstilleren får 42501. */
  const BEHANDLERE = (): Record<'FA1' | 'FA2' | 'FB' | 'FF', { stiller: Person; behandlere: Person[] }> => ({
    FA1: { stiller: 'vanligA', behandlere: ['redaktorRessursA', 'redaktorFortolkningA', 'adminA', 'arkitektB', 'systemarkitekt'] },
    FA2: { stiller: 'vanligA', behandlere: ['redaktorFortolkningA', 'adminA', 'arkitektB', 'systemarkitekt'] },
    FB: { stiller: 'vanligB', behandlere: ['adminB', 'arkitektB', 'systemarkitekt'] },
    FF: { stiller: 'vanligB', behandlere: ['arkitektB', 'systemarkitekt'] },
  })
  const ventetFor = (navn: keyof ReturnType<typeof BEHANDLERE>): Partial<Record<Person, Ventet>> => {
    const { stiller, behandlere } = BEHANDLERE()[navn]
    return { ...AKTIVE('PT404'), ...UTEN, [stiller]: '42501', ...Object.fromEntries(behandlere.map((p) => [p, 'V'])) }
  }
  const HANDLINGER: Record<string, (f: string) => Steg[]> = {
    ta_forslag: (f) => [['ta_forslag', { forslag: f }]],
    kommenter_forslag: (f) => [['kommenter_forslag', { forslag: f, tekst: 'Syntetisk kommentar.' }]],
    be_om_presisering: (f) => [
      ['ta_forslag', { forslag: f }],
      ['be_om_presisering', { forslag: f, tekst: 'Syntetisk spørsmål.' }],
    ],
    godkjenn_forslag: (f) => [['godkjenn_forslag', { forslag: f, begrunnelse: null }]],
    avvis_forslag: (f) => [['avvis_forslag', { forslag: f, begrunnelse: 'Syntetisk begrunnelse.' }]],
    marker_forslag_innarbeidet: (f) => [
      ['godkjenn_forslag', { forslag: f, begrunnelse: null }],
      ['marker_forslag_innarbeidet', { forslag: f, objekt: null, revisjon: null }],
    ],
  }

  it.each(Object.keys(HANDLINGER))('%s: bare behandlerne av ressursen', async (handling) => {
    for (const navn of ['FA1', 'FA2', 'FB', 'FF'] as const) {
      await prov(`${handling}(${navn})`, ventetFor(navn), (p) => kjede(p, ...HANDLINGER[handling]!(d[navn])))
    }
  })

  it('arbeidskøen viser hver person nøyaktig forslagene den kan behandle', async () => {
    const avvik: string[] = []
    const behandlere = BEHANDLERE()
    for (const p of Object.keys({ ...AKTIVE('V'), ...UTEN }) as Person[]) {
      const svar = await kall(p, 'les_forslagsko', { filter: 'alle' })
      const ventet = (Object.keys(behandlere) as (keyof typeof behandlere)[]).filter((n) => behandlere[n].behandlere.includes(p)).map((n) => d[n]).sort()
      if (svar.kode !== 'V') {
        if (ventet.length > 0 || !AVVIST_KODER.includes(svar.kode)) avvik.push(`${p}: ${svar.kode}`)
        continue
      }
      const ko = (svar as { verdi: { nye: { id: string }[]; pagaende: { id: string }[]; ferdige: { id: string }[] } }).verdi
      const sett = [...ko.nye, ...ko.pagaende, ...ko.ferdige].map((f) => f.id).filter((id) => [d.FA1, d.FA2, d.FB, d.FF].includes(id)).sort()
      if (JSON.stringify(sett) !== JSON.stringify(ventet)) avvik.push(`${p}: ser ${sett.length}, venter ${ventet.length}`)
    }
    expect(avvik).toEqual([])
  })

  it('innarbeidingen godtar bare en revisjon i ressursen, og et fremmed objekt er som et ukjent', async () => {
    const godkjenn: Steg = ['godkjenn_forslag', { forslag: d.FA1, begrunnelse: null }]
    const innarbeid = (objekt: string | null, revisjon: number | null): Steg => ['marker_forslag_innarbeidet', { forslag: d.FA1, objekt, revisjon }]
    expect((await kjede('adminA', godkjenn, innarbeid(d.RA2, 1))).kode).toBe('22023')
    const fremmed = await kjede('adminA', godkjenn, innarbeid(d.RB, 1))
    expect(fremmed).toEqual(await kjede('adminA', godkjenn, innarbeid(INGEN, 1)))
    expect((await kjede('adminA', godkjenn, innarbeid(d.RA1kommentar, 999))).kode).toBe('22023')
    // Bare et godkjent forslag kan innarbeides.
    expect((await kjede('adminA', innarbeid(null, null))).kode).toBe('PT409')
    expect((await kjede('adminA', ['avvis_forslag', { forslag: d.FA1, begrunnelse: 'Nei.' }], innarbeid(null, null))).kode).toBe('PT409')
  })
})

describe('3.6 og 7: et helt forløp endrer ikke publisert innhold, og varslene går bare til dem som ser forslaget', () => {
  /**
   * Alt publisert, lest uten radsikkerhet: innholdet i hver publiserte
   * revisjon, publiseringene, sideversjonene og regelsettene og kommentarene
   * slik appen leser dem for en vanlig bruker (grunnlaget for fortolkningen).
   */
  const publisert = async () => {
    const { rows } = await db.query<{ innhold: unknown; publiseringer: unknown; sideversjoner: unknown }>(
      `select
         (select jsonb_object_agg(t.objekt_id, jsonb_build_object('revisjon', t.revisjon, 'innhold', intern.les(o.type, o.id, 'publisert')))
            from public.objekttilstander t join public.redigerbare_objekter o on o.id = t.objekt_id where t.tilstand = 'publisert') as innhold,
         (select jsonb_agg(p order by p::text) from public.objektpubliseringer p) as publiseringer,
         (select jsonb_agg(s order by s::text) from public.sideversjoner s) as sideversjoner`,
    )
    const lest = await som(db, g.id.vanligA, async (tx) =>
      (
        await tx.query(`select public.les_intervallregelsett('publisert') as regelsett, public.les_kommentarer('publisert', $1::uuid[]) as kommentarer`, [
          [d.RA1kommentar, d.deltKommentar],
        ])
      ).rows[0],
    )
    return { ...rows[0], ...(lest as object) }
  }

  /** Varslene om forslaget: mottaker → kategori og hendelser. */
  const varslerOm = async (forslag: string) =>
    (
      await db.query<{ mottaker_id: string; kategori: string; arter: string[] }>(
        `select mottaker_id, kategori::text as kategori, array(select h ->> 'art' from jsonb_array_elements(hendelser) h) as arter
         from public.varsler where hendelser @> jsonb_build_array(jsonb_build_object('forslag', $1::text)) order by mottaker_id, kategori`,
        [forslag],
      )
    ).rows
  const navnPa = (id: string) => (Object.keys(g.id) as Person[]).find((p) => g.id[p] === id) ?? id
  const mottakere = async (forslag: string) => (await varslerOm(forslag)).map((v) => `${navnPa(v.mottaker_id)}:${v.kategori}:${v.arter.join('+')}`).sort()

  it('nytt forslag til et regelsett med redaktører går bare til redaktørene', async () => {
    const id = (await utfor('vanligA', 'foresla_endring', forslagsargumenter(d.RA1, d.RA1kommentar))) as string
    expect(await mottakere(id)).toEqual(['redaktorFortolkningA:forslag_til_behandling:opprettet', 'redaktorRessursA:forslag_til_behandling:opprettet'])
    await utfor('vanligA', 'trekk_forslag', { forslag: id, begrunnelse: null })
  })

  it('uten redaktør går et lokalt forslag til administratorene der og systemarkitektene', async () => {
    // Fortolkningsansvaret i A og ansvaret for RA1 tas bort i en transaksjon som rulles tilbake.
    const ventet = ['adminA', 'arkitektB', 'systemarkitekt'].map((p) => `${p}:forslag_til_behandling:opprettet`).sort()
    const fikk = await db.transaction(async (tx) => {
      await tx.query(`select set_config('ousfar.tilgangsgrunn', 'P5-test: uten redaktør (syntetisk)', true)`)
      await tx.query(`update public.redaktoransvar set tilbakekalt_kl = now() where tilbakekalt_kl is null`)
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: g.id.vanligA, role: 'authenticated' })])
      const { sql, verdier } = sqlFor(['foresla_endring', forslagsargumenter(d.RA2)])
      const id = (await tx.query<{ v: string }>(sql, verdier)).rows[0]!.v
      const { rows } = await tx.query<{ mottaker_id: string; kategori: string }>(
        `select mottaker_id, kategori::text as kategori from public.varsler where hendelser @> jsonb_build_array(jsonb_build_object('forslag', $1::text))`,
        [id],
      )
      await tx.rollback()
      return rows.map((r) => `${navnPa(r.mottaker_id)}:${r.kategori}:opprettet`).sort()
    })
    expect(fikk).toEqual(ventet)
  })

  it('godkjent og innarbeidet: publisert innhold er uendret, bare utkastet er endret (REG-P1)', async () => {
    const for_ = await publisert()
    const utkastFor = (await db.query<{ r: number }>(`select revisjon as r from public.objekttilstander where objekt_id = $1 and tilstand = 'utkast'`, [d.RA1kommentar])).rows[0]!.r

    const id = (await utfor('vanligA', 'foresla_endring', forslagsargumenter(d.RA1, d.RA1kommentar))) as string
    await utfor('redaktorRessursA', 'ta_forslag', { forslag: id })
    await utfor('redaktorRessursA', 'be_om_presisering', { forslag: id, tekst: 'Syntetisk spørsmål.' })
    await utfor('vanligA', 'svar_pa_forslag', { forslag: id, tekst: 'Syntetisk svar.' })
    await utfor('redaktorRessursA', 'godkjenn_forslag', { forslag: id, begrunnelse: null })
    // Redaktøren arbeider forslaget inn i utkastet, og markerer det.
    await utfor('redaktorRessursA', 'lagre_utkast', {
      objekt: d.RA1kommentar,
      forventet_revisjon: utkastFor,
      innhold: { navn: 'P5 RA1', tekst: 'Syntetisk tekst, arbeidet inn.', plassholdere: [] },
    })
    await utfor('redaktorRessursA', 'marker_forslag_innarbeidet', { forslag: id, objekt: null, revisjon: null })

    expect(await publisert()).toEqual(for_)
    const utkastEtter = (await db.query<{ r: number }>(`select revisjon as r from public.objekttilstander where objekt_id = $1 and tilstand = 'utkast'`, [d.RA1kommentar])).rows[0]!.r
    expect(utkastEtter).toBe(utkastFor + 1)
    expect((await db.query<{ s: string }>('select status as s from public.endringsforslag where id = $1', [id])).rows[0]!.s).toBe('innarbeidet')

    // Varslene: stilleren får behandlerens hendelser, behandleren svaret, og ingen i B noe.
    const v = await mottakere(id)
    expect(v).toEqual(
      [
        'redaktorFortolkningA:forslag_til_behandling:opprettet',
        'redaktorRessursA:forslag_til_behandling:opprettet+presisering',
        'vanligA:mine_forslag:tatt+presisering_bedt+godkjent+innarbeidet',
      ].sort(),
    )
    // Tilbake til utkastet slik det var, så de andre testene ser det samme.
    await utfor('adminA', 'lagre_utkast', { objekt: d.RA1kommentar, forventet_revisjon: utkastEtter, innhold: { navn: 'P5 RA1', tekst: 'Syntetisk tekst for P5 RA1.', plassholdere: [] } })
  })

  it('avvist og trukket: publisert innhold er uendret (REG-P2)', async () => {
    const for_ = await publisert()
    const avvist = (await utfor('vanligB', 'foresla_endring', forslagsargumenter(d.F, d.Fkort))) as string
    await utfor('systemarkitekt', 'avvis_forslag', { forslag: avvist, begrunnelse: 'Syntetisk avvisning.' })
    const trukket = (await utfor('vanligB', 'foresla_endring', forslagsargumenter(d.RB))) as string
    await utfor('adminB', 'ta_forslag', { forslag: trukket })
    await utfor('vanligB', 'trekk_forslag', { forslag: trukket, begrunnelse: 'Syntetisk.' })
    expect(await publisert()).toEqual(for_)
    // Varslene om forslaget i B når ingen i A.
    const iA = new Set<Person>(['vanligA', 'adminA', 'redaktorRessursA', 'redaktorFortolkningA', 'redaktorNasjonal'])
    expect((await mottakere(trukket)).filter((m) => iA.has(m.split(':')[0] as Person))).toEqual([])
  })

  it('ingen har et varsel om et forslag de ikke kan se', async () => {
    const { rows } = await db.query<{ mottaker: string; forslag: string }>(
      `select v.mottaker_id as mottaker, h ->> 'forslag' as forslag
       from public.varsler v, jsonb_array_elements(v.hendelser) h
       where h ? 'forslag' and not intern.kan_se_forslag((h ->> 'forslag')::uuid, v.mottaker_id)`,
    )
    expect(rows.map((r) => `${navnPa(r.mottaker)} ${r.forslag}`)).toEqual([])
  })
})
