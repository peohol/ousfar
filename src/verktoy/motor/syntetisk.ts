/**
 * SYNTETISKE TESTDATA for doseplanmotoren (P5). Ingenting her er et
 * virkelig legemiddel, preparat eller en virkelig regel: virkestoffene
 * («testoksetin», «testazapin», «testperidon»), preparatene og reglene er
 * laget for å prøve motoren ved grenseverdiene, og verdiene har ingen klinisk
 * betydning. Reglene har id som begynner med `syntetisk-`, og preparatene har
 * kilden «Syntetiske testdata», så de kan aldri gi en klinisk plan
 * (`kliniskSperre` i `plan.ts`).
 *
 * Testtilfellene står i `docs/verktøy-p5-testtilfeller.md` (laget av
 * `rapport.ts`) og kontrolleres av `src/__tests__/verktoymotor.test.ts`.
 */
import type { Kode, Merkevaredata, Pakningsdata, Styrkedata } from '../../legemiddeldata/fest'
import type { Legemiddelutvalg, MedId } from '../../legemiddeldata/lesing'
import type { Grunnlag, Nedtrappingsstrategi, Parameter, Parameterart, Regel } from '../regler/modell'
import type { Preparatgrunnlag } from './byggesteiner'
import { SYNTETISK_KILDE, SYNTETISK_REGEL, type Doseplaninndata, type Omgivelse } from './plan'

/* --- Preparater --------------------------------------------------------------- */

export const FORMER = {
  tablett: { kode: 'SYN-TAB', tekst: 'Tablett' },
  depottablett: { kode: 'SYN-DEPTAB', tekst: 'Depottablett' },
  kapsel: { kode: 'SYN-KAPS', tekst: 'Kapsel, hard' },
  draper: { kode: 'SYN-DRAP', tekst: 'Dråper, oppløsning' },
  mikstur: { kode: 'SYN-MIKST', tekst: 'Mikstur, oppløsning' },
  depotinjeksjon: { kode: 'SYN-DEPINJ', tekst: 'Depotinjeksjonsvæske, suspensjon' },
} as const satisfies Record<string, Kode>

const ORAL: Kode = { kode: 'SYN-ORAL', tekst: 'Oral bruk' }
const IM: Kode = { kode: 'SYN-IM', tekst: 'Intramuskulær bruk' }
const TYPE: Record<'registrert' | 'fritak' | 'sykehus', Kode> = {
  registrert: { kode: '7', tekst: 'Legemiddel' },
  fritak: { kode: '11', tekst: 'Krever godkj. Fritak' },
  sykehus: { kode: '15', tekst: 'Sykehuspreparat' },
}
const DELING: Record<'0' | '1' | '2' | '4', Kode> = {
  '0': { kode: '0', tekst: 'Ikke spesifisert' },
  '1': { kode: '1', tekst: 'Ikke delbar' },
  '2': { kode: '2', tekst: 'Delbar i 2' },
  '4': { kode: '4', tekst: 'Delbar i 4' },
}

export interface Testpreparat {
  /** Kort id; merkevaren får `ID_SYNTETISK-<id>`. */
  id: string
  virkestoff: 'testoksetin' | 'testazapin' | 'testperidon'
  varenavn: string
  form: keyof typeof FORMER
  /** Styrken i mg, per enhet eller per `nevner`. */
  mg: number
  nevner?: { verdi: number; enhet: string }
  /** Mg per dråpe, som FESTs alternative styrke. */
  per_drape?: number
  deling?: keyof typeof DELING
  type?: keyof typeof TYPE
  /** Styrken er oppgitt for saltet, ikke moderstoffet. */
  salt?: boolean
  /** Inneholder også testazapin. */
  kombinasjon?: boolean
  /** Pakningene: markedsført fra, midlertidig utgått fra, avregistrert fra. Standard: én pakning markedsført 2020-01-01. */
  pakninger?: { fra?: string | null; utgatt?: string | null; avregistrert?: string | null }[]
}

const VIRKESTOFF = {
  testoksetin: { id: 'ID_SYNTETISK-TESTOKSETIN', navn: 'Testoksetin', salt: 'ID_SYNTETISK-TESTOKSETINHYDROKLORID' },
  testazapin: { id: 'ID_SYNTETISK-TESTAZAPIN', navn: 'Testazapin', salt: 'ID_SYNTETISK-TESTAZAPINHEMIHYDRAT' },
  testperidon: { id: 'ID_SYNTETISK-TESTPERIDON', navn: 'Testperidon', salt: 'ID_SYNTETISK-TESTPERIDONPALMITAT' },
} as const

/** Et utvalg i samme form som `les_legemidler` gir, med kilden «Syntetiske testdata». */
export function syntetiskUtvalg(preparater: readonly Testpreparat[], kontroll: { kildedato?: string | null; kontrollert_kl?: string | null } = {}): Legemiddelutvalg {
  const tom = { styrke: null, nevner: null, ovre: null, alternativ_styrke: null, alternativ_nevner: null }
  const styrker: MedId<Styrkedata>[] = []
  const merkevarer: MedId<Merkevaredata>[] = []
  const pakninger: MedId<Pakningsdata>[] = []
  for (const p of preparater) {
    const v = VIRKESTOFF[p.virkestoff]
    const id = `ID_SYNTETISK-${p.id}`
    styrker.push({
      ...tom,
      id: `${id}-STYRKE`,
      virkestoff_id: p.salt ? v.salt : v.id,
      styrke: { verdi: p.mg, enhet: 'mg' },
      nevner: p.nevner ?? null,
      alternativ_styrke: p.per_drape ? { verdi: p.per_drape, enhet: 'mg' } : null,
      alternativ_nevner: p.per_drape ? { verdi: 1, enhet: 'dråpe' } : null,
      operator: { kode: 'L', tekst: 'Lik' },
    })
    if (p.kombinasjon) styrker.push({ ...tom, id: `${id}-STYRKE2`, virkestoff_id: VIRKESTOFF.testazapin.id, styrke: { verdi: 15, enhet: 'mg' }, operator: { kode: 'L', tekst: 'Lik' } })
    const injeksjon = p.form === 'depotinjeksjon'
    merkevarer.push({
      id,
      varenavn: p.varenavn,
      navn_form_styrke: `${p.varenavn} ${FORMER[p.form].tekst.toLowerCase()} ${String(p.mg).replace('.', ',')} mg${p.nevner ? `/${p.nevner.enhet}` : ''}`,
      legemiddelform: FORMER[p.form],
      legemiddelform_lang: null,
      atc: null,
      reseptgruppe: null,
      preparattype: TYPE[p.type ?? 'registrert'],
      administrasjonsveier: [injeksjon ? IM : ORAL],
      deling: p.deling ? DELING[p.deling] : null,
      kan_knuses: null,
      kan_apnes: null,
      produsent: 'Syntetisk',
      referanseprodukt: null,
      preparatomtale: null,
      svart_trekant: false,
      virkestoff_med_styrke: [`${id}-STYRKE`, ...(p.kombinasjon ? [`${id}-STYRKE2`] : [])],
      virkestoff_uten_styrke: [],
    })
    for (const [i, pk] of (p.pakninger ?? [{}]).entries()) {
      pakninger.push({
        id: `${id}-PAKNING-${i + 1}`,
        varenr: `SYN${p.id}${i + 1}`,
        navn_form_styrke: '',
        innhold: [{ merkevare_id: id, pakningsstorrelse: 30, enhet: { kode: 'stk', tekst: 'stk' }, pakningstype: null, mengde: null, antall: null }],
        merkevarer: [id],
        markedsforingsdato: pk.fra === undefined ? '2020-01-01' : pk.fra,
        midlertidig_utgatt_dato: pk.utgatt ?? null,
        avregistrert_dato: pk.avregistrert ?? null,
        byttegrupper: [],
        ean: [],
      })
    }
  }
  return {
    kilde: SYNTETISK_KILDE,
    kontrollert_kl: kontroll.kontrollert_kl === undefined ? '2026-11-01T04:20:00Z' : kontroll.kontrollert_kl,
    kildedato: kontroll.kildedato === undefined ? '2026-10-15' : kontroll.kildedato,
    virkestoff: Object.values(VIRKESTOFF).flatMap((v) => [
      { id: v.id, navn: v.navn, navn_engelsk: null, salter: [v.salt], utgatt: false },
      { id: v.salt, navn: `${v.navn}salt`, navn_engelsk: null, salter: [], utgatt: false },
    ]),
    styrker,
    merkevarer,
    pakninger,
    byttegrupper: [],
  }
}

export function syntetiskGrunnlag(preparater: readonly Testpreparat[], kontroll?: Parameters<typeof syntetiskUtvalg>[1]): Preparatgrunnlag {
  return {
    utvalg: syntetiskUtvalg(preparater, kontroll),
    koblinger: Object.fromEntries(Object.entries(VIRKESTOFF).map(([n, v]) => [n, [v.id]])),
    overstyringer: [],
  }
}

/** Testoksetin: tabletter med ulik deling og status, og andre former. */
export const TESTOKSETIN: Testpreparat[] = [
  { id: 'OKS-TAB20', virkestoff: 'testoksetin', varenavn: 'Testoksetin Syntetisk', form: 'tablett', mg: 20, deling: '4' },
  { id: 'OKS-TAB10', virkestoff: 'testoksetin', varenavn: 'Testoksetin Syntetisk', form: 'tablett', mg: 10, deling: '2' },
  { id: 'OKS-TAB5A', virkestoff: 'testoksetin', varenavn: 'Testoksetin Syntetisk', form: 'tablett', mg: 5, deling: '0' },
  { id: 'OKS-TAB5B', virkestoff: 'testoksetin', varenavn: 'Testoksetin Annen', form: 'tablett', mg: 5, deling: '4' },
  { id: 'OKS-TAB2', virkestoff: 'testoksetin', varenavn: 'Testoksetin Fritak', form: 'tablett', mg: 2, deling: '1', type: 'fritak' },
  { id: 'OKS-TAB1', virkestoff: 'testoksetin', varenavn: 'Testoksetin Avregistrert', form: 'tablett', mg: 1, pakninger: [{ avregistrert: '2026-01-01' }] },
  { id: 'OKS-TAB7', virkestoff: 'testoksetin', varenavn: 'Testoksetin Utgått', form: 'tablett', mg: 7.5, deling: '2', pakninger: [{ utgatt: '2026-09-01' }] },
  { id: 'OKS-TAB3', virkestoff: 'testoksetin', varenavn: 'Testoksetin Sykehus', form: 'tablett', mg: 3, type: 'sykehus' },
  { id: 'OKS-TAB4', virkestoff: 'testoksetin', varenavn: 'Testoksetin Salt', form: 'tablett', mg: 4, salt: true },
  { id: 'OKS-TAB6', virkestoff: 'testoksetin', varenavn: 'Testoksetin Kombi', form: 'tablett', mg: 6, kombinasjon: true },
  { id: 'OKS-KAPS20', virkestoff: 'testoksetin', varenavn: 'Testoksetin Syntetisk', form: 'kapsel', mg: 20 },
  { id: 'OKS-DRAP', virkestoff: 'testoksetin', varenavn: 'Testoksetin Syntetisk', form: 'draper', mg: 20, nevner: { verdi: 1, enhet: 'ml' }, per_drape: 1 },
  { id: 'OKS-MIKST', virkestoff: 'testoksetin', varenavn: 'Testoksetin Syntetisk', form: 'mikstur', mg: 4, nevner: { verdi: 1, enhet: 'ml' } },
  { id: 'OKS-DEPTAB', virkestoff: 'testoksetin', varenavn: 'Testoksetin Depot', form: 'depottablett', mg: 15, deling: '2' },
]

/** Testazapin: hele tabletter, 15 og 30 mg, og 45 mg som avregistreres 2026-12-01. */
export const TESTAZAPIN: Testpreparat[] = [
  { id: 'AZA-TAB15', virkestoff: 'testazapin', varenavn: 'Testazapin Syntetisk', form: 'tablett', mg: 15, deling: '1' },
  { id: 'AZA-TAB30', virkestoff: 'testazapin', varenavn: 'Testazapin Syntetisk', form: 'tablett', mg: 30, deling: '2' },
  { id: 'AZA-TAB45', virkestoff: 'testazapin', varenavn: 'Testazapin Syntetisk', form: 'tablett', mg: 45, deling: '1', pakninger: [{ avregistrert: '2026-12-01' }] },
]

/** Testperidon: perorale depottabletter og to depotinjeksjoner med ulike intervaller. */
export const TESTPERIDON: Testpreparat[] = [
  { id: 'PER-DEPTAB6', virkestoff: 'testperidon', varenavn: 'Testperidon Syntetisk', form: 'depottablett', mg: 6, deling: '1' },
  { id: 'PER-MND100', virkestoff: 'testperidon', varenavn: 'Testdepot Månedlig', form: 'depotinjeksjon', mg: 100, nevner: { verdi: 1, enhet: 'sprøyte' } },
  { id: 'PER-MND150', virkestoff: 'testperidon', varenavn: 'Testdepot Månedlig', form: 'depotinjeksjon', mg: 150, nevner: { verdi: 1, enhet: 'sprøyte' } },
  { id: 'PER-MND75', virkestoff: 'testperidon', varenavn: 'Testdepot Månedlig', form: 'depotinjeksjon', mg: 75, nevner: { verdi: 1, enhet: 'sprøyte' }, type: 'fritak' },
  { id: 'PER-3MND', virkestoff: 'testperidon', varenavn: 'Testdepot Tremånedlig', form: 'depotinjeksjon', mg: 75 },
]

export const ALLE_TESTPREPARATER = [...TESTOKSETIN, ...TESTAZAPIN, ...TESTPERIDON]

/* --- Regler --------------------------------------------------------------- */

const syntetisk: Grunnlag = { type: 'ousfar_vurdering', begrunnelse: 'Syntetisk testverdi uten klinisk betydning.', avklaring: null }
export const sp = (verdi: number | null, enhet: Parameter['enhet'], art: Parameterart = 'bindende_krav'): Parameter => ({ verdi, enhet, art, grunnlag: syntetisk })

const grunnregel = (id: string, tittel: string): Omit<Regel, 'fra' | 'til' | 'plan'> => ({
  id: `${SYNTETISK_REGEL}${id}`,
  versjon: 1,
  tittel: `SYNTETISK TESTREGEL: ${tittel}`,
  inndata: [],
  bekreftelser: [],
  unntak: [],
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: { kildetro: [], tilpasninger: [], forutsetninger: ['Syntetisk testregel uten klinisk innhold.'], usikkerhet: [] },
  referanser: [],
  eksempler: [],
  godkjenning: { status: 'utkast', historikk: [{ status: 'utkast', dato: '2026-10-28', av: 'Claude', rolle: 'utvikler', regelversjon: 1, merknad: 'Syntetisk testregel for P5.' }] },
})

/** Seponering av testoksetin med strategien og dosevalget gitt, 14 dager per trinn. */
export function nedtrappingsregel(strategi: Nedtrappingsstrategi, dosevalg?: Regel['plan']['forlop'][number]['dosevalg'], id = 'nedtrapping'): Regel {
  return {
    ...grunnregel(id, 'seponering av testoksetin'),
    fra: { type: 'virkestoff', nokkel: 'testoksetin' },
    til: null,
    plan: {
      form: 'seponering',
      forlop: [
        {
          id: 'fra',
          virkestoff: { type: 'virkestoff', nokkel: 'testoksetin' },
          administrasjon: 'peroral',
          utgangsdose: 'startdose',
          start: { type: 'dag', dag: 1 },
          faser: [{ type: 'nedtrapping', strategi, trinnlengde: sp(14, 'dager', 'veiledende_preferanse') }],
          ...(dosevalg ? { dosevalg } : {}),
        },
      ],
    },
  }
}

/**
 * Som {@link nedtrappingsregel}, men uten nulltrinn, slik seponeringsreglene i
 * P7 er: høyst `horisont` reduksjoner, og siste dose fortsetter til
 * avslutningen er vurdert individuelt.
 */
export function nedtrappingUtenNull(strategi: Nedtrappingsstrategi, dosevalg?: Regel['plan']['forlop'][number]['dosevalg'], id = 'nedtrapping-uten-null', horisont = 12): Regel {
  const r = nedtrappingsregel(strategi, dosevalg, id)
  for (const fase of r.plan.forlop[0]!.faser) if (fase.type === 'nedtrapping') Object.assign(fase, { avslutning: 'individuell', horisont: sp(horisont, 'trinn') })
  return r
}

/** Som {@link nedtrappingUtenNull}, der døgndoser over `over` mg skal fordeles på `antall` doser, hver høyst `over` mg. */
export function fordeltUtenNull(strategi: Nedtrappingsstrategi, over: number, antall: number[]): Regel {
  const r = nedtrappingUtenNull(strategi, undefined, 'fordelt-uten-null')
  r.plan.forlop[0]!.fordeling = { over_mg: sp(over, 'mg'), antall, grunnlag: syntetisk }
  return r
}

/** Testoksetin hver `hver`. dag i minst 28 dager fra dosen pasienten bruker, uten nulltrinn. */
export function intervallregel(hver = 2): Regel {
  const r = nedtrappingsregel({ type: 'prosent_av_aktuell', prosent: sp(25, 'prosent') }, undefined, 'intervall')
  r.plan.forlop[0]!.faser = [{ type: 'intervalldosering', dose: { type: 'aktuell' }, hver: sp(hver, 'dager'), minstetid: sp(28, 'dager') }]
  return r
}

/** Kryssnedtrapping testoksetin → testazapin: testazapin trappes opp mens testoksetin trappes ned. */
export const KRYSSREGEL: Regel = {
  ...grunnregel('kryss', 'kryssnedtrapping testoksetin → testazapin'),
  fra: { type: 'virkestoff', nokkel: 'testoksetin' },
  til: { type: 'virkestoff', nokkel: 'testazapin' },
  plan: {
    form: 'kryssnedtrapping',
    forlop: [
      {
        id: 'fra',
        virkestoff: { type: 'virkestoff', nokkel: 'testoksetin' },
        administrasjon: 'peroral',
        utgangsdose: 'startdose',
        start: { type: 'dag', dag: 1 },
        faser: [{ type: 'nedtrapping', strategi: { type: 'prosent_av_startdose', prosent: sp(50, 'prosent') }, trinnlengde: sp(7, 'dager') }],
        dosevalg: { avvik_prosent: sp(10, 'prosent') },
      },
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'testazapin' },
        administrasjon: 'peroral',
        utgangsdose: null,
        start: { type: 'dag', dag: 1 },
        faser: [
          { type: 'opptrapping', trinn: [{ mg: sp(15, 'mg'), dager: sp(7, 'dager') }] },
          { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
        ],
        dosevalg: { maks_mg: sp(45, 'mg') },
      },
    ],
  },
}

/**
 * Opptrapping av testazapin (eller `nokkel`) med faste trinn på 7 dager og
 * dosevalget, til å prøve grensene for én dose.
 */
export function fastDose(mg: number[], dosevalg?: Regel['plan']['forlop'][number]['dosevalg'], nokkel = 'testazapin'): Regel {
  return {
    ...grunnregel('fast', `faste doser av ${nokkel}`),
    fra: { type: 'virkestoff', nokkel },
    til: null,
    plan: {
      form: 'seponering',
      forlop: [
        {
          id: 'fra',
          virkestoff: { type: 'virkestoff', nokkel },
          administrasjon: 'peroral',
          utgangsdose: null,
          start: { type: 'dag', dag: 1 },
          faser: [{ type: 'opptrapping', trinn: mg.map((x) => ({ mg: sp(x, 'mg'), dager: sp(7, 'dager') })) }],
          ...(dosevalg ? { dosevalg } : {}),
        },
      ],
    },
  }
}

/** Sekvensielt bytte testoksetin → testazapin med 14 dagers utvasking. */
export const SEKVENSIELL_REGEL: Regel = {
  ...grunnregel('sekvensielt', 'sekvensielt bytte testoksetin → testazapin med utvasking'),
  fra: { type: 'virkestoff', nokkel: 'testoksetin' },
  til: { type: 'virkestoff', nokkel: 'testazapin' },
  plan: {
    form: 'sekvensielt',
    forlop: [
      {
        id: 'fra',
        virkestoff: { type: 'virkestoff', nokkel: 'testoksetin' },
        administrasjon: 'peroral',
        utgangsdose: 'startdose',
        start: { type: 'dag', dag: 1 },
        faser: [{ type: 'nedtrapping', strategi: { type: 'absolutt', mg: sp(5, 'mg') }, trinnlengde: sp(7, 'dager') }],
      },
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'testazapin' },
        administrasjon: 'peroral',
        utgangsdose: null,
        start: { type: 'etter_utvasking', forlop: 'fra', utvasking: sp(14, 'dager') },
        faser: [{ type: 'vedlikehold', dose: { type: 'fast', mg: sp(15, 'mg') } }],
      },
    ],
  },
}

/** Fra perorale testperidon-depottabletter til månedlig depotinjeksjon. */
export function depotregel(preparater: string[] | null = ['Testdepot Månedlig'], vedlikehold = 100): Regel {
  return {
    ...grunnregel('depot', 'oppstart av månedlig testperidon-depot'),
    fra: { type: 'virkestoff', nokkel: 'testperidon' },
    til: { type: 'virkestoff', nokkel: 'testperidon' },
    plan: {
      form: 'oppstart_depot',
      forlop: [
        {
          id: 'fra',
          virkestoff: { type: 'virkestoff', nokkel: 'testperidon' },
          administrasjon: 'peroral',
          utgangsdose: 'startdose',
          start: { type: 'dag', dag: 1 },
          faser: [{ type: 'seponer' }],
        },
        {
          id: 'til',
          virkestoff: { type: 'virkestoff', nokkel: 'testperidon' },
          administrasjon: 'depotinjeksjon',
          ...(preparater ? { preparater } : {}),
          utgangsdose: null,
          start: { type: 'dag', dag: 1 },
          faser: [
            {
              type: 'injeksjoner',
              start: [
                { dag: sp(1, 'dag'), dose: { type: 'fast', mg: sp(150, 'mg') } },
                { dag: sp(8, 'dag'), dose: { type: 'fast', mg: sp(100, 'mg') }, vindu_dager: sp(4, 'dager') },
              ],
              vedlikehold: { dose: { type: 'fast', mg: sp(vedlikehold, 'mg') }, maaneder: sp(1, 'maaneder') },
            },
          ],
        },
      ],
    },
  }
}

/* --- Testtilfellene ------------------------------------------------------------- */

/** Standard omgivelse: preparatstatus 01.11.2026, FEST-kopien kontrollert samme natt. */
export const OMGIVELSE: Omgivelse = { idag: '2026-11-01', naa: '2026-11-01T12:00:00Z' }

const TABLETT = { klasse: 'peroral' as const, legemiddelformer: [FORMER.tablett.kode] }

export interface Testtilfelle {
  id: string
  beskrivelse: string
  /** Hva tilfellet kontrollerer (P5.x). */
  kontrollerer: string
  regel: Regel
  inndata: Doseplaninndata
  preparater: Testpreparat[]
  omgivelse?: Omgivelse
  /** FEST-kopiens kontroll, når den ikke er standard. */
  fest?: Parameters<typeof syntetiskUtvalg>[1]
  /** Forventet `planform` per forløp, eller `stopp` med et mønster for grunnen. */
  forventet: Record<string, string[]> | { stopp: RegExp }
}

const prosent25 = (sluttdose: number): Nedtrappingsstrategi => ({ type: 'prosent_av_aktuell', prosent: sp(25, 'prosent'), sluttdose_mg: sp(sluttdose, 'mg') })

export const TESTTILFELLER: Testtilfelle[] = [
  {
    id: 'prosent-av-startdose-noyaktig',
    beskrivelse: 'Testoksetin 20 mg trappes ned med 25 % av startdosen (5 mg) per trinn. Uten toleranse må hver dose gis nøyaktig.',
    kontrollerer: 'P5.5 prosent av startdosen; P5.3 deling bare der FEST sier det; P5.4 utelatte preparater',
    regel: nedtrappingsregel({ type: 'prosent_av_startdose', prosent: sp(25, 'prosent') }),
    inndata: { startdose_mg: 20, formvalg: { fra: TABLETT } },
    preparater: TESTOKSETIN,
    forventet: {
      fra: ['dag 1–14: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg', 'dag 15–28: 10 mg = 1 tablett à 10 mg', 'dag 29–42: 5 mg = 1 tablett à 5 mg', 'fra dag 43: seponert'],
    },
  },
  {
    id: 'prosent-av-aktuell-toleranse-10',
    beskrivelse: 'Testoksetin 20 mg trappes ned med 25 % av aktuell dose til under 2,5 mg, med høyst 10 % avvik, og forskriveren har valgt bare 10 og 20 mg-tablettene. 11,25 mg kan ikke gis innenfor 10 %: nærmeste doser er 10 mg (−11,1 %, en faktisk reduksjon på 33,3 % fra 15 mg) og 15 mg; 12,5 mg krever en kvart 10 mg-tablett, som ikke er delbar i 4.',
    kontrollerer: 'P5.5 prosent av aktuell dose; valgte preparater; P5.8 stopp uten gjennomførbar dose, med de nærmeste dosene',
    regel: nedtrappingsregel(prosent25(2.5), { avvik_prosent: sp(10, 'prosent') }),
    inndata: { startdose_mg: 20, formvalg: { fra: { ...TABLETT, preparater: ['ID_SYNTETISK-OKS-TAB10', 'ID_SYNTETISK-OKS-TAB20'] } } },
    preparater: TESTOKSETIN,
    forventet: { stopp: /dag 15–28: den ideelle dosen 11,25 mg kan ikke gis .* innenfor ±10 %.*Nærmeste doser som kan settes sammen: 10 mg \(-11,11 %, faktisk reduksjon 33,33 % fra 15 mg\) og 15 mg \(\+33,33 %\)/ },
  },
  {
    id: 'prosent-av-aktuell-toleranse-15',
    beskrivelse: 'Som over med alle tablettene og høyst 15 % avvik: kvarte 5 mg-tabletter (delbar i 4) gir doser i trinn på 1,25 mg.',
    kontrollerer: 'P5.5 valg mellom oppnåelige doser (B3); P5.3 kvarte tabletter bare der FEST sier delbar i 4; P5.6 avvik dokumentert',
    regel: nedtrappingsregel(prosent25(2.5), { avvik_prosent: sp(15, 'prosent') }),
    inndata: { startdose_mg: 20, formvalg: { fra: TABLETT } },
    preparater: TESTOKSETIN,
    forventet: {
      fra: [
        'dag 1–14: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg',
        'dag 15–28: 11,25 mg = 1 tablett à 10 mg + ¼ tablett à 5 mg',
        'dag 29–42: 8,75 mg = 1¾ tabletter à 5 mg (ideelt 8,44 mg, +3,7 %)',
        'dag 43–56: 6,25 mg = 1¼ tabletter à 5 mg (ideelt 6,33 mg, -1,23 %)',
        'dag 57–70: 5 mg = 1 tablett à 5 mg (ideelt 4,75 mg, +5,35 %)',
        'dag 71–84: 3,75 mg = ¾ tablett à 5 mg (ideelt 3,56 mg, +5,35 %)',
        'dag 85–98: 2,5 mg = ½ tablett à 5 mg (ideelt 2,67 mg, -6,36 %)',
        'fra dag 99: seponert',
      ],
    },
  },
  {
    id: 'godkjenningsfritak-valgt',
    beskrivelse: 'Testoksetin 4 mg trappes ned med 2 mg per trinn. 2 mg finnes bare som preparat med godkjenningsfritak; det brukes bare når forskriveren har valgt det.',
    kontrollerer: 'P5.4 godkjenningsfritak brukes bare etter uttrykkelig valg',
    regel: nedtrappingsregel({ type: 'absolutt', mg: sp(2, 'mg') }),
    inndata: { startdose_mg: 4, godkjenningsfritak: true, formvalg: { fra: TABLETT } },
    preparater: TESTOKSETIN,
    forventet: { fra: ['dag 1–14: 2 mg = 1 tablett à 2 mg', 'fra dag 15: seponert'] },
  },
  {
    id: 'godkjenningsfritak-ikke-valgt',
    beskrivelse: 'Som over, uten valget: 2 mg kan ikke gis, og beregningen stopper.',
    kontrollerer: 'P5.4; P5.8',
    regel: nedtrappingsregel({ type: 'absolutt', mg: sp(2, 'mg') }),
    inndata: { startdose_mg: 4, formvalg: { fra: TABLETT } },
    preparater: TESTOKSETIN,
    forventet: { stopp: /dag 1–14: den ideelle dosen 2 mg kan ikke gis med preparatene i FEST nøyaktig/ },
  },
  {
    id: 'flere-former-uten-valg',
    beskrivelse: 'Testoksetin finnes som tablett, kapsel og dråper. Uten valg av form stopper beregningen i stedet for å blande formene.',
    kontrollerer: 'P5.2; P5.8 ingen gjetning om form',
    regel: nedtrappingsregel({ type: 'prosent_av_startdose', prosent: sp(25, 'prosent') }),
    inndata: { startdose_mg: 20, formvalg: { fra: { klasse: 'peroral' } } },
    preparater: TESTOKSETIN,
    forventet: { stopp: /finnes i flere legemiddelformer \(Dråper, oppløsning \[SYN-DRAP\], Kapsel, hard \[SYN-KAPS\] og Tablett \[SYN-TAB\]\); formen må velges/ },
  },
  {
    id: 'flere-formuleringer-uten-valg',
    beskrivelse: 'Testoksetin finnes både med vanlig og modifisert frisetting. Uten valg stopper beregningen.',
    kontrollerer: 'P5.3 modifisert frisetting blandes ikke med vanlig; P5.8',
    regel: nedtrappingsregel({ type: 'prosent_av_startdose', prosent: sp(25, 'prosent') }),
    inndata: { startdose_mg: 20 },
    preparater: TESTOKSETIN,
    forventet: { stopp: /finnes i flere formuleringer \(peroral, vanlig frisetting \[peroral\] og peroral, modifisert frisetting \[peroral_modifisert\]\); formuleringen må velges/ },
  },
  {
    id: 'draper',
    beskrivelse: 'Testoksetin-dråper (1 mg per dråpe etter FEST) med 25 % av aktuell dose til under 2,5 mg, høyst 15 % avvik: hele dråper.',
    kontrollerer: 'P5.2 dose per dråpe fra FEST; P5.6 avrunding til hele dråper',
    regel: nedtrappingsregel(prosent25(2.5), { avvik_prosent: sp(15, 'prosent') }),
    inndata: { startdose_mg: 20, formvalg: { fra: { klasse: 'peroral', legemiddelformer: [FORMER.draper.kode] } } },
    preparater: TESTOKSETIN,
    forventet: {
      fra: [
        'dag 1–14: 15 mg = 15 dråper à 1 mg',
        'dag 15–28: 11 mg = 11 dråper à 1 mg (ideelt 11,25 mg, -2,22 %)',
        'dag 29–42: 8 mg = 8 dråper à 1 mg (ideelt 8,44 mg, -5,19 %)',
        'dag 43–56: 6 mg = 6 dråper à 1 mg (ideelt 6,33 mg, -5,19 %)',
        'dag 57–70: 5 mg = 5 dråper à 1 mg (ideelt 4,75 mg, +5,35 %)',
        'dag 71–84: 4 mg = 4 dråper à 1 mg (ideelt 3,56 mg, +12,37 %)',
        'dag 85–98: 3 mg = 3 dråper à 1 mg (ideelt 2,67 mg, +12,37 %)',
        'fra dag 99: seponert',
      ],
    },
  },
  {
    id: 'kapsel-deles-ikke',
    beskrivelse: 'Bare kapsler à 20 mg: 15 mg kan ikke gis, siden kapsler aldri deles eller åpnes.',
    kontrollerer: 'P5.3 kapsler deles ikke',
    regel: nedtrappingsregel({ type: 'prosent_av_startdose', prosent: sp(25, 'prosent') }),
    inndata: { startdose_mg: 20, formvalg: { fra: { klasse: 'peroral', legemiddelformer: [FORMER.kapsel.kode] } } },
    preparater: TESTOKSETIN,
    forventet: { stopp: /den ideelle dosen 15 mg kan ikke gis med preparatene i FEST nøyaktig/ },
  },
  {
    id: 'depottablett-delbar-i-fest',
    beskrivelse: 'Testoksetin depottablett 15 mg som FEST oppgir som delbar i 2: 15 → 7,5 mg (halvering av aktuell dose, 50 %).',
    kontrollerer: 'P5.3 modifisert frisetting deles bare når FEST oppgir det for preparatet',
    regel: nedtrappingsregel({ type: 'prosent_av_aktuell', prosent: sp(50, 'prosent'), sluttdose_mg: sp(5, 'mg') }),
    inndata: { startdose_mg: 15, formvalg: { fra: { klasse: 'peroral_modifisert' } } },
    preparater: TESTOKSETIN,
    forventet: { fra: ['dag 1–14: 7,5 mg = ½ tablett à 15 mg', 'fra dag 15: seponert'] },
  },
  {
    id: 'kryss-med-maldose-og-dato',
    beskrivelse: 'Kryssnedtrapping testoksetin 20 mg → testazapin 30 mg fra 30.12.2026: testoksetin 10 mg i 7 dager; testazapin 15 mg i 7 dager og så 30 mg.',
    kontrollerer: 'P5.7 samtidige forløp; P5.6 kalenderdatoer over årsskiftet; dosegrense',
    regel: KRYSSREGEL,
    inndata: { startdose_mg: 20, maldose_mg: 30, startdato: '2026-12-30', formvalg: { fra: TABLETT, til: TABLETT } },
    preparater: [...TESTOKSETIN, ...TESTAZAPIN],
    forventet: {
      fra: ['dag 1–7 [30.12.2026–05.01.2027]: 10 mg = 1 tablett à 10 mg', 'fra dag 8 [06.01.2027]: seponert'],
      til: ['dag 1–7 [30.12.2026–05.01.2027]: 15 mg = 1 tablett à 15 mg', 'fra dag 8 [06.01.2027]: 30 mg = 1 tablett à 30 mg'],
    },
  },
  {
    id: 'kryss-over-dosegrense',
    beskrivelse: 'Som over med måldose 60 mg: over regelens høyeste døgndose 45 mg.',
    kontrollerer: 'P5.6 maksimum',
    regel: KRYSSREGEL,
    inndata: { startdose_mg: 20, maldose_mg: 60, formvalg: { fra: TABLETT, til: TABLETT } },
    preparater: [...TESTOKSETIN, ...TESTAZAPIN],
    forventet: { stopp: /den ideelle dosen 60 mg kan ikke gis .* og ikke over 45 mg/ },
  },
  {
    id: 'avregistrering-i-planperioden',
    beskrivelse: 'Testazapin 45 mg er avregistrert fra 01.12.2026. Med start 01.11.2026 kan ikke 45 mg-tabletten brukes etter det; vedlikehold 45 mg gis da med 30 + 15 mg.',
    kontrollerer: 'P5.4 meldt avregistrering; P5.6 datoer',
    regel: KRYSSREGEL,
    inndata: { startdose_mg: 20, maldose_mg: 45, startdato: '2026-11-01', formvalg: { fra: TABLETT, til: TABLETT } },
    preparater: [...TESTOKSETIN, ...TESTAZAPIN],
    forventet: {
      fra: ['dag 1–7 [01.11.2026–07.11.2026]: 10 mg = 1 tablett à 10 mg', 'fra dag 8 [08.11.2026]: seponert'],
      til: ['dag 1–7 [01.11.2026–07.11.2026]: 15 mg = 1 tablett à 15 mg', 'fra dag 8 [08.11.2026]: 45 mg = 1 tablett à 15 mg + 1 tablett à 30 mg'],
    },
  },
  {
    id: 'sekvensielt-utvasking',
    beskrivelse: 'Testoksetin 10 mg trappes ned med 5 mg per uke, så 14 dager uten legemiddel før testazapin 15 mg.',
    kontrollerer: 'P5.7 utvasking bevares i den praktiske planen',
    regel: SEKVENSIELL_REGEL,
    inndata: { startdose_mg: 10, formvalg: { fra: TABLETT, til: TABLETT } },
    preparater: [...TESTOKSETIN, ...TESTAZAPIN],
    forventet: {
      fra: ['dag 1–7: 5 mg = 1 tablett à 5 mg', 'fra dag 8: seponert'],
      til: ['fra dag 22: 15 mg = 1 tablett à 15 mg'],
    },
  },
  {
    id: 'depot-manedlig',
    beskrivelse: 'Fra testperidon depottabletter til månedlig depot fra 31.01.2027: 150 mg dag 1, 100 mg dag 8, så 100 mg hver måned med første vedlikeholdsdose én måned etter dag 8 (07.03.2027, dag 36). Bare det månedlige preparatet regelen nevner brukes, aldri det tremånedlige.',
    kontrollerer: 'P5.7 depot som egen tidsmodell; hele injeksjoner; kalendermåned i februar',
    regel: depotregel(),
    inndata: { startdose_mg: 6, startdato: '2027-01-31' },
    preparater: TESTPERIDON,
    forventet: {
      fra: ['fra dag 1 [31.01.2027]: seponert'],
      til: ['dag 1 [31.01.2027]: 150 mg = 1 injeksjon à 150 mg', 'dag 8 [07.02.2027]: 100 mg = 1 injeksjon à 100 mg', 'hver måned fra 1 måned etter dag 8 [07.03.2027]: 100 mg = 1 injeksjon à 100 mg'],
    },
  },
  {
    id: 'depot-uten-preparat-i-regelen',
    beskrivelse: 'Samme regel uten varenavn for depotet: beregningen velger ikke depotpreparat selv.',
    kontrollerer: 'P5.7; P5.8',
    regel: depotregel(null),
    inndata: { startdose_mg: 6 },
    preparater: TESTPERIDON,
    forventet: { stopp: /Regelen sier ikke hvilket depotpreparat testperidon \(til\) gjelder/ },
  },
  {
    id: 'depot-dose-som-ikke-finnes',
    beskrivelse: 'Vedlikehold 75 mg: det månedlige preparatet har 75 mg bare med godkjenningsfritak (ikke valgt), og det tremånedlige brukes ikke. Ingen sprøyter settes sammen.',
    kontrollerer: 'P5.3 ikke-delbart depot; P5.4; P5.8',
    regel: depotregel(['Testdepot Månedlig'], 75),
    inndata: { startdose_mg: 6 },
    preparater: TESTPERIDON,
    forventet: { stopp: /vedlikeholdet er 75 mg, men FEST har ingen brukbar injeksjon med den styrken \(brukbare styrker: 100, 150 mg\)/ },
  },
  {
    id: 'fest-aldri-hentet',
    beskrivelse: 'Uten en vellykket henting av FEST kan ingen plan beregnes.',
    kontrollerer: 'P5.1',
    regel: nedtrappingsregel({ type: 'prosent_av_startdose', prosent: sp(25, 'prosent') }),
    inndata: { startdose_mg: 20, formvalg: { fra: TABLETT } },
    preparater: TESTOKSETIN,
    fest: { kontrollert_kl: null, kildedato: null },
    forventet: { stopp: /ingen vellykket henting av FEST/ },
  },
  {
    id: 'fest-ugyldig-tidsstempel',
    beskrivelse: 'Et kontrolltidspunkt som ikke kan tolkes, regnes ikke som en vellykket henting av FEST.',
    kontrollerer: 'P5.1',
    regel: nedtrappingsregel({ type: 'prosent_av_startdose', prosent: sp(25, 'prosent') }),
    inndata: { startdose_mg: 20, formvalg: { fra: TABLETT } },
    preparater: TESTOKSETIN,
    fest: { kontrollert_kl: 'ikke-et-tidspunkt' },
    forventet: { stopp: /ikke et gyldig tidspunkt/ },
  },
  {
    id: 'forste-dose-motsatt-vei',
    beskrivelse: 'Nedtrapping fra 10 mg, 10 % per trinn: første ideelle dose er 9 mg. Den eneste tabletten (10,5 mg, ikke delbar) ligger innenfor ±25 %, men ville økt dosen fra dagens 10 mg.',
    kontrollerer: 'P5.5 retningen fra aktuell dose i første periode',
    regel: nedtrappingsregel({ type: 'prosent_av_aktuell', prosent: sp(10, 'prosent'), sluttdose_mg: sp(8.5, 'mg') }, { avvik_prosent: sp(25, 'prosent') }),
    inndata: { startdose_mg: 10, formvalg: { fra: TABLETT } },
    preparater: [{ id: 'OKS-TAB10-5', virkestoff: 'testoksetin', varenavn: 'Testoksetin Syntetisk', form: 'tablett', mg: 10.5, deling: '1' }],
    forventet: { stopp: /første periode er ideelt 9 mg, men ingen dose innenfor rammene er lavere enn dosen forløpet starter med \(10 mg\)/ },
  },
  {
    id: 'avrunding-mellomtrinn',
    beskrivelse: 'Nedtrapping fra 20 mg, 25 % av aktuell dose, seponering under 8 mg, med hele tabletter og ±12 %: mellomtrinnet 11,25 mg kan gis som 10 eller 12,5 mg med likt avvik og like enkelt. Det rundes mot forrige dose (opp), så neste reduksjon blir større.',
    kontrollerer: 'P5.5 avrunding ved ellers likt i et mellomtrinn',
    regel: nedtrappingsregel({ type: 'prosent_av_aktuell', prosent: sp(25, 'prosent'), sluttdose_mg: sp(8, 'mg') }, { avvik_prosent: sp(12, 'prosent') }),
    inndata: { startdose_mg: 20, formvalg: { fra: TABLETT } },
    preparater: [15, 12.5, 10, 7.5].map((mg) => ({ id: `OKS-HEL${mg}`, virkestoff: 'testoksetin' as const, varenavn: 'Testoksetin Hel', form: 'tablett' as const, mg, deling: '1' })),
    forventet: {
      fra: [
        'dag 1–14: 15 mg = 1 tablett à 15 mg',
        'dag 15–28: 12,5 mg = 1 tablett à 12,5 mg (ideelt 11,25 mg, +11,11 %)',
        'dag 29–42: 7,5 mg = 1 tablett à 7,5 mg (ideelt 8,44 mg, -11,11 %)',
        'fra dag 43: seponert',
      ],
    },
  },
  {
    id: 'draper-to-styrker-over-rammen',
    beskrivelse: 'Testazapin-dråper à 1 og 2 mg: 120 mg er 60 dråper, men 121 mg ville krevd 61 dråper til sammen (1 + 60) og stopper.',
    kontrollerer: 'P5.5 rammen på 60 dråper for hele døgndosen',
    regel: fastDose([120, 121]),
    inndata: { startdose_mg: 1, formvalg: { fra: { klasse: 'peroral', legemiddelformer: [FORMER.draper.kode] } } },
    preparater: [1, 2].map((per_drape) => ({ id: `AZA-DRAP${per_drape}`, virkestoff: 'testazapin' as const, varenavn: `Testazapin Dråper ${per_drape}`, form: 'draper' as const, mg: 20 * per_drape, nevner: { verdi: 1, enhet: 'ml' }, per_drape })),
    forventet: { stopp: /121 mg kan ikke gis med preparatene i FEST nøyaktig/ },
  },
  {
    id: 'uten-nulltrinn-stopper-ved-trinnet-for',
    beskrivelse: 'Testoksetin 20 mg trappes ned med 25 % av aktuell dose uten nulltrinn (individuell avslutning), med 10 og 20 mg-tablettene. 15 mg kan gis, men 11,25 mg ikke: planen stopper ved trinnet før og står på 15 mg til avslutningen er vurdert, i stedet for å runde av eller seponere.',
    kontrollerer: 'P5.8 en plan uten nulltrinn stopper ved siste trinn som kan gis, med forklaring (fagkontrollen 30.10.2026, beslutning 3 og 7)',
    regel: nedtrappingUtenNull({ type: 'prosent_av_aktuell', prosent: sp(25, 'prosent') }),
    inndata: { startdose_mg: 20, formvalg: { fra: { ...TABLETT, preparater: ['ID_SYNTETISK-OKS-TAB10', 'ID_SYNTETISK-OKS-TAB20'] } } },
    preparater: TESTOKSETIN,
    forventet: { fra: ['fra dag 1: 15 mg = 1½ tabletter à 10 mg', 'neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt'] },
  },
  {
    id: 'uten-nulltrinn-forste-trinn-kan-ikke-gis',
    beskrivelse: 'Som over fra 10 mg med bare 10 mg-tabletten: allerede 7,5 mg kan ikke gis, så beregningen stopper med de nærmeste dosene og den faktiske reduksjonen.',
    kontrollerer: 'P5.8 stopp med faktisk reduksjon når første trinn ikke kan gis; en annen dose er et nytt forslag',
    regel: nedtrappingUtenNull({ type: 'prosent_av_aktuell', prosent: sp(25, 'prosent') }),
    inndata: { startdose_mg: 10, formvalg: { fra: { ...TABLETT, preparater: ['ID_SYNTETISK-OKS-TAB10'] } } },
    preparater: TESTOKSETIN,
    forventet: { stopp: /dag 1–14: den ideelle dosen 7,5 mg kan ikke gis .*5 mg \(-33,33 %, faktisk reduksjon 50 % fra 10 mg\) og 10 mg \(\+33,33 %\)\. En annen dose, et større avvik eller en annen formulering er et nytt forslag/ },
  },
  {
    id: 'uten-nulltrinn-draper-uten-toleranse',
    beskrivelse: 'Testoksetin-dråper (1 mg per dråpe) fra 20 mg med 10 % av aktuell dose uten nulltrinn og uten toleranse: 18 mg er 18 dråper, men 16,2 mg er ikke et helt antall dråper. Dråpene gir ingen toleranse, så planen stopper ved trinnet før i stedet for å runde av.',
    kontrollerer: 'P5.6 hele dråper uten toleranse; P5.8 stopp ved trinnet før (substanskontrollen 30.10.2026, escitalopram)',
    regel: nedtrappingUtenNull({ type: 'prosent_av_aktuell', prosent: sp(10, 'prosent') }),
    inndata: { startdose_mg: 20, formvalg: { fra: { klasse: 'peroral', legemiddelformer: [FORMER.draper.kode] } } },
    preparater: TESTOKSETIN,
    forventet: { fra: ['fra dag 1: 18 mg = 18 dråper à 1 mg', 'neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt'] },
  },
  {
    id: 'uten-nulltrinn-avrundet-bort',
    beskrivelse: 'Testoksetin 0,5 mg med 1 % av aktuell dose uten nulltrinn: første reduksjon (0,495 mg) blir 0,5 mg når dosen vises med to desimaler. En reduksjon som forsvinner i avrundingen, er ikke et trinn, så beregningen stopper før preparatene vurderes.',
    kontrollerer: 'P5.5 beregnet, vist og gitt dose er den samme (substanskontrollen 30.10.2026, beslutning 6)',
    regel: nedtrappingUtenNull({ type: 'prosent_av_aktuell', prosent: sp(1, 'prosent') }),
    inndata: { startdose_mg: 0.5, formvalg: { fra: TABLETT } },
    preparater: TESTOKSETIN,
    forventet: { stopp: /blir første reduksjon \(til 0,495 mg\) borte når dosen vises med to desimaler/ },
  },
  {
    id: 'fordeling-over-grense',
    beskrivelse: 'Testoksetin 40 mg med 25 % av aktuell dose uten nulltrinn, der døgndoser over 20 mg skal gis fordelt på 2 eller 3 doser, hver høyst 20 mg. Dosene over 20 mg vises fordelt; dosene til og med 20 mg gis som én dose.',
    kontrollerer: 'P5.5 fordeling av døgndosen når preparatomtalen krever det (substanskontrollen 30.10.2026, fluvoksamin og moklobemid)',
    regel: fordeltUtenNull({ type: 'prosent_av_aktuell', prosent: sp(25, 'prosent') }, 20, [2, 3]),
    inndata: { startdose_mg: 40, formvalg: { fra: TABLETT } },
    preparater: TESTOKSETIN,
    forventet: {
      fra: [
        'dag 1–14: 30 mg = 1 tablett à 10 mg + 1 tablett à 20 mg, fordelt på 2 doser: 20 + 10 mg',
        'fra dag 15: 22,5 mg = 1 tablett à 20 mg + ½ tablett à 5 mg, fordelt på 2 doser: 20 + 2,5 mg',
        'neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt',
      ],
    },
  },
  {
    id: 'fordeling-kan-ikke-fordeles',
    beskrivelse: 'Som over fra 40 mg med bare en hel 30 mg-tablett som ikke kan deles: 30 mg kan gis som én dose, men ikke fordeles på doser på høyst 20 mg, så beregningen stopper.',
    kontrollerer: 'P5.5 fordelingen stopper planen når en nøyaktig dose ikke kan fordeles; P5.8',
    regel: fordeltUtenNull({ type: 'prosent_av_aktuell', prosent: sp(25, 'prosent') }, 20, [2, 3]),
    inndata: { startdose_mg: 40, formvalg: { fra: TABLETT } },
    preparater: [{ id: 'OKS-HEL30', virkestoff: 'testoksetin', varenavn: 'Testoksetin Hel', form: 'tablett', mg: 30, deling: '1' }],
    forventet: { stopp: /døgndosen 30 mg skal gis fordelt på 2 eller 3 doser, hver høyst 20 mg \(preparatomtalen\), men ingen nøyaktig dose/ },
  },
  {
    id: 'annenhver-dag',
    beskrivelse: 'Testoksetin 20 mg gis annenhver dag i minst 28 dager: én tablett hver gang, aldri 0 mg, og ingen ny reduksjon av seg selv.',
    kontrollerer: 'P5 intervalldosering: dosen per gang settes sammen som en vanlig dose (fagkontrollen 30.10.2026, beslutning 5.10)',
    regel: intervallregel(),
    inndata: { startdose_mg: 20, formvalg: { fra: TABLETT } },
    preparater: TESTOKSETIN,
    forventet: { fra: ['fra dag 1: 20 mg annenhver dag = 1 tablett à 20 mg', 'annenhver dag i minst 28 dager; avslutning vurderes individuelt'] },
  },
]
