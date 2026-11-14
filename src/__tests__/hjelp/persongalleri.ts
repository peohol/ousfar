/**
 * Persongalleriet til tilgangstestene (P2.0-forberedelsen,
 * docs/p2-0-forberedelse.md og docs/ousfar-nasjonal-p0-kartlegging.md §6.4):
 * faste, syntetiske personer i to fagmiljøer, bygd gjennom de samme tabellene
 * og invariantene som P1.1 innførte (docs/fagmiljoer.md).
 *
 * Fagmiljø A er standardfagmiljøet (OUS Klinisk farmakologi), B er OUS
 * Rettstoksikologi. B åpnes for medlemmer i testdatabasen, slik den blir når
 * startporten S2 er passert; i produksjonen er den fortsatt lukket.
 *
 * Personene beskrives som data (`PERSONER`) og bygges av én generell
 * funksjon, så nye roller (lokal redaktør, felles redaktør og gruppeansvarlig
 * fra P5/P6) legges til som nye oppføringer når tabellene deres finnes.
 *
 * To personer har ingen aktive medlemskap. Det tillater ikke databasen i dag
 * (regel 1 i docs/fagmiljoer.md: hver konto har nøyaktig ett aktivt
 * primærmedlemskap), og det blir først mulig med avslutning av medlemskap i
 * P3. Tilstanden lages derfor utenom invariantene, slik P3 vil gi den, fordi
 * P2.0 skal vise at en slik bruker med fortsatt gyldig token verken leser
 * eller skriver noe.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import type { Rolle } from '@delt/profil'
import { opprettBruker, som } from './testdatabase'

/** Fagmiljøene galleriet bruker, etter rollen de har i testene. */
export const FAGMILJOER = {
  A: 'ous-klinisk-farmakologi',
  B: 'ous-rettstoksikologi',
} as const

export type Fagmiljo = keyof typeof FAGMILJOER

/** Begrunnelsen tilgangsloggen får for det galleriet endrer. */
const GRUNN = 'Persongalleri for tilgangstestene (syntetisk)'

export interface Persondefinisjon {
  /** Den gamle globale rollen i `profiles.role`, som `er_admin()` fortsatt bygger på. */
  rolle: Rolle
  /** Fagmiljøet for det aktive primærmedlemskapet, eller `null` for ingen aktive medlemskap. */
  primaer: Fagmiljo | null
  /** Andre aktive medlemskap (ikke primære). */
  ogsaAktivI?: readonly Fagmiljo[]
  /**
   * Fagmiljøet der kontoen startet og der medlemskapet senere er avsluttet.
   * Uten det starter kontoen i primærfagmiljøet.
   */
  avsluttetI?: Fagmiljo
  /** Fagmiljøer der personen er lokal administrator. */
  lokalAdminI?: readonly Fagmiljo[]
  systemarkitekt?: boolean
  /** Hva personen står for i testene. */
  beskrivelse: string
}

/**
 * Personene etter P0 §6.4. Lokale administratorer har også den gamle
 * adminrollen, slik dagens administratorer fikk det i P1.1 (D3).
 */
export const PERSONER = {
  systemarkitekt: {
    rolle: 'admin',
    primaer: 'A',
    systemarkitekt: true,
    beskrivelse: 'Systemarkitekt, primærmedlem i A',
  },
  vanligA: { rolle: 'user', primaer: 'A', beskrivelse: 'Vanlig bruker i A' },
  vanligB: { rolle: 'user', primaer: 'B', beskrivelse: 'Vanlig bruker i B' },
  adminA: { rolle: 'admin', primaer: 'A', lokalAdminI: ['A'], beskrivelse: 'Lokal administrator i A' },
  adminB: { rolle: 'admin', primaer: 'B', lokalAdminI: ['B'], beskrivelse: 'Lokal administrator i B' },
  dobbeltAB: { rolle: 'user', primaer: 'A', ogsaAktivI: ['B'], beskrivelse: 'Aktiv i både A (primær) og B' },
  avsluttetA: {
    rolle: 'user',
    primaer: 'B',
    avsluttetI: 'A',
    beskrivelse: 'Medlemskapet i A er avsluttet; fortsatt aktiv i B',
  },
  utenMedlemskap: {
    rolle: 'user',
    primaer: null,
    avsluttetI: 'A',
    beskrivelse: 'Vanlig bruker uten aktive medlemskap, med fortsatt gyldig token',
  },
  tidligereAdmin: {
    rolle: 'admin',
    primaer: null,
    avsluttetI: 'A',
    beskrivelse: 'Administrator uten aktive medlemskap; den gamle adminrollen står igjen',
  },
} as const satisfies Record<string, Persondefinisjon>

export type Person = keyof typeof PERSONER

export interface Persongalleri {
  /** Konto-ID-en til hver person. */
  id: Record<Person, string>
  /** ID-en til hvert fagmiljø. */
  fagmiljo: Record<Fagmiljo, string>
}

/** Kjører arbeidet i én transaksjon med begrunnelsen tilgangsloggen krever. */
async function medGrunn<T>(db: PGlite, arbeid: (tx: Transaction) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('ousfar.tilgangsgrunn', $1, true)`, [GRUNN])
    return arbeid(tx)
  })
}

/** Gjør brukeren til systemarkitekt, med en grunn i tilgangsloggen. */
export async function gjorTilSystemarkitekt(db: PGlite, brukerId: string): Promise<void> {
  await medGrunn(db, (tx) => tx.query(`insert into public.systemroller (bruker_id, rolle) values ($1, 'systemarkitekt')`, [brukerId]))
}

/** ID-en til fagmiljøet med nøkkelen. */
export async function fagmiljoId(db: PGlite | Transaction, nokkel: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>('select id from public.fagmiljoer where nokkel = $1', [nokkel])
  if (!rows[0]) throw new Error(`Fagmiljøet ${nokkel} finnes ikke.`)
  return rows[0].id
}

/**
 * Oppretter et nytt, åpent fagmiljø med `administrator` som medlem og lokal
 * administrator, i én transaksjon slik invariantene krever.
 */
export async function opprettFagmiljo(
  db: PGlite,
  { nokkel, navn, administrator }: { nokkel: string; navn: string; administrator: string },
): Promise<string> {
  return medGrunn(db, async (tx) => {
    const { rows } = await tx.query<{ id: string }>(
      `insert into public.fagmiljoer (nokkel, navn, apent_for_medlemmer) values ($1, $2, true) returning id`,
      [nokkel, navn],
    )
    const id = rows[0]!.id
    await tx.query('insert into public.medlemskap (bruker_id, fagmiljo_id) values ($1, $2)', [administrator, id])
    await tx.query('insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ($1, $2)', [administrator, id])
    return id
  })
}

/**
 * Gir brukeren aktivt medlemskap i fagmiljøet. Som primærmedlemskap avsluttes
 * det forrige primærmedlemskapet i samme transaksjon.
 */
export async function opprettMedlem(
  db: PGlite,
  brukerId: string,
  fagmiljoId_: string,
  { primaer = false }: { primaer?: boolean } = {},
): Promise<void> {
  await medGrunn(db, async (tx) => {
    if (primaer) {
      await tx.query(
        `update public.medlemskap set status = 'deaktivert', til = now()
         where bruker_id = $1 and primaer and status = 'aktiv'`,
        [brukerId],
      )
    }
    await tx.query('insert into public.medlemskap (bruker_id, fagmiljo_id, primaer) values ($1, $2, $3)', [
      brukerId,
      fagmiljoId_,
      primaer,
    ])
  })
}

/** Avslutter brukerens aktive medlemskap i fagmiljøet. */
export async function avsluttMedlemskap(db: PGlite, brukerId: string, fagmiljoId_: string): Promise<void> {
  await medGrunn(db, (tx) =>
    tx.query(
      `update public.medlemskap set status = 'deaktivert', til = now()
       where bruker_id = $1 and fagmiljo_id = $2 and status = 'aktiv'`,
      [brukerId, fagmiljoId_],
    ),
  )
}

/**
 * Avslutter alle brukerens aktive medlemskap, slik avslutningen i P3 vil gjøre
 * det. Invariantene (regel 1) tillater det ikke i dag, så utløserne slås av
 * for denne ene transaksjonen (`session_replication_role = replica`).
 * Bare for testdatabasen.
 */
export async function fjernAlleMedlemskap(db: PGlite, brukerId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.exec(`set local session_replication_role = replica`)
    await tx.query(
      `update public.medlemskap set status = 'deaktivert', til = now() where bruker_id = $1 and status = 'aktiv'`,
      [brukerId],
    )
  })
}

/** Gjør fagmiljøet til standard; byttet skjer i én transaksjon, slik regel 5 krever. */
async function settStandard(db: PGlite, fagmiljoId_: string): Promise<void> {
  await medGrunn(db, async (tx) => {
    await tx.query('update public.fagmiljoer set standard = false where standard and id <> $1', [fagmiljoId_])
    await tx.query('update public.fagmiljoer set standard = true where id = $1 and not standard', [fagmiljoId_])
  })
}

/**
 * Bygger galleriet i en database der migrasjonene er kjørt. Fagmiljø B åpnes
 * for medlemmer (S2 passert i testdatabasen).
 */
export async function byggPersongalleri(
  db: PGlite,
  personer: Readonly<Record<Person, Persondefinisjon>> = PERSONER,
): Promise<Persongalleri> {
  const fagmiljo = {
    A: await fagmiljoId(db, FAGMILJOER.A),
    B: await fagmiljoId(db, FAGMILJOER.B),
  }
  await db.query('update public.fagmiljoer set apent_for_medlemmer = true where id = $1', [fagmiljo.B])

  const navn = Object.keys(personer) as Person[]
  const startI = (def: Persondefinisjon): Fagmiljo => def.avsluttetI ?? def.primaer ?? 'A'

  // Hver konto opprettes mens fagmiljøet den starter i, er standard, slik at
  // databasen selv gir den primærmedlemskapet der.
  const id = {} as Record<Person, string>
  for (const start of Object.keys(fagmiljo) as Fagmiljo[]) {
    const her = navn.filter((p) => startI(personer[p]) === start)
    if (her.length === 0) continue
    await settStandard(db, fagmiljo[start])
    for (const p of her) {
      id[p] = await opprettBruker(db, {
        brukernavn: `test.${p.toLowerCase()}`,
        fornavn: 'Test',
        etternavn: p,
        rolle: personer[p].rolle,
      })
    }
  }
  await settStandard(db, fagmiljo.A)

  // Systemarkitektene først: medlemskap og administratorer kan da bygges i
  // hvilken som helst rekkefølge.
  for (const p of navn) {
    if (personer[p].systemarkitekt) await gjorTilSystemarkitekt(db, id[p])
  }

  for (const p of navn) {
    const def = personer[p]
    if (def.primaer && def.primaer !== startI(def)) await opprettMedlem(db, id[p], fagmiljo[def.primaer], { primaer: true })
    for (const f of def.ogsaAktivI ?? []) await opprettMedlem(db, id[p], fagmiljo[f])
    for (const f of def.lokalAdminI ?? []) {
      await medGrunn(db, (tx) =>
        tx.query('insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ($1, $2)', [id[p], fagmiljo[f]]),
      )
    }
    if (def.primaer === null) await fjernAlleMedlemskap(db, id[p])
  }
  return { id, fagmiljo }
}

/** Medlemskapene slik de faktisk ligger i databasen, per person. */
export async function medlemskapI(
  db: PGlite,
  galleri: Persongalleri,
): Promise<Record<Person, { aktive: Fagmiljo[]; primaer: Fagmiljo | null; avsluttet: Fagmiljo[] }>> {
  const fagmiljoFor = new Map(Object.entries(galleri.fagmiljo).map(([k, v]) => [v, k as Fagmiljo]))
  const { rows } = await db.query<{ bruker_id: string; fagmiljo_id: string; status: string; primaer: boolean }>(
    'select bruker_id, fagmiljo_id, status, primaer from public.medlemskap order by fra, id',
  )
  const resultat = {} as Record<Person, { aktive: Fagmiljo[]; primaer: Fagmiljo | null; avsluttet: Fagmiljo[] }>
  for (const [p, brukerId] of Object.entries(galleri.id) as [Person, string][]) {
    const egne = rows.filter((r) => r.bruker_id === brukerId)
    const f = (r: (typeof rows)[number]) => fagmiljoFor.get(r.fagmiljo_id)!
    resultat[p] = {
      aktive: egne.filter((r) => r.status === 'aktiv').map(f).sort(),
      primaer: egne.filter((r) => r.status === 'aktiv' && r.primaer).map(f)[0] ?? null,
      avsluttet: egne.filter((r) => r.status === 'deaktivert').map(f).sort(),
    }
  }
  return resultat
}

/** Det galleriets testdata består av; se `leggInnTestdata`. */
export interface Testdata {
  /** En publisert kommentar (fortolkning; lokal for A etter P0 §3), lagd av administratoren i A. */
  publisertKommentar: string
  /** En kommentar som bare finnes som utkast, lagd av administratoren i A. */
  kommentarutkast: string
  /** En tråd på en fortolkningsside (lokal for A), av en vanlig bruker i A. */
  fortolkningstraad: string
  /** En tråd på en fagside (felles), av en vanlig bruker i A. */
  fagsidetraad: string
  /** En idé, av en vanlig bruker i A. */
  ide: string
  /** Profilbildet til en vanlig bruker i A (`storage.objects`, bøtta `avatarer`). */
  profilbilde: string
}

const DOK = (tekst: string) => ({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tekst }] }] })

/** Kjører SQL som den oppgitte brukeren og gir første kolonne i første rad. */
const somBruker = <T>(db: PGlite, brukerId: string, sql: string, parametre: unknown[] = []): Promise<T> =>
  som(db, brukerId, async (tx) => Object.values((await tx.query<Record<string, T>>(sql, parametre)).rows[0]!)[0] as T)

/**
 * Legger inn et lite, syntetisk sett med data som de negative testene prøver
 * seg mot, gjennom de samme funksjonene appen bruker. Ingen kliniske verdier.
 */
export async function leggInnTestdata(db: PGlite, galleri: Persongalleri): Promise<Testdata> {
  const { adminA, vanligA } = galleri.id
  const kommentar = (navn: string) => ({ navn, tekst: `Syntetisk tekst for ${navn}.`, plassholdere: [] })
  const opprett = (innhold: object) =>
    somBruker<{ id: string }>(db, adminA, `select to_jsonb(s) from public.opprett_utkast('kommentar', $1) s`, [
      JSON.stringify(innhold),
    ]).then((s) => s.id)

  const publisertKommentar = await opprett(kommentar('Tilgangstest publisert'))
  await somBruker(db, adminA, 'select public.publiser_utkast($1, 1) is not null', [publisertKommentar])
  const kommentarutkast = await opprett(kommentar('Tilgangstest utkast'))

  const traad = async (side: string, tittel: string) => {
    const kategori = await somBruker<string>(db, vanligA, 'select public.opprett_diskusjonskategori($1, $2, $3)', [
      side,
      'Tilgang',
      '🔒',
    ])
    return somBruker<string>(db, vanligA, 'select public.opprett_diskusjon($1, $2, $3, $4)', [
      side,
      kategori,
      tittel,
      JSON.stringify(DOK('Første innlegg')),
    ])
  }
  const fortolkningstraad = await traad('fortolkning:syntetisk-analytt', 'Lokal tråd')
  const fagsidetraad = await traad('stoff:syntetisk-stoff', 'Felles tråd')
  const ide = await somBruker<string>(
    db,
    vanligA,
    'insert into public.ideer (kategori, tittel, tekst) values ($1, $2, $3) returning id',
    ['fag', 'Syntetisk idé', JSON.stringify(DOK('Idétekst'))],
  )
  const profilbilde = await somBruker<string>(
    db,
    vanligA,
    `insert into storage.objects (bucket_id, name) values ('avatarer', $1) returning id`,
    [`${vanligA}/avatar.webp`],
  )
  return { publisertKommentar, kommentarutkast, fortolkningstraad, fagsidetraad, ide, profilbilde }
}
