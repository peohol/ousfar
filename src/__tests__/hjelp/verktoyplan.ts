/**
 * Isolerte testdata for verktøysidene: syntetiske regler som godkjennes bare i
 * testen, og syntetiske preparater i FESTs form koblet til virkestoffene i
 * kartleggingen, så en positiv doseplan kan vises og kontrolleres. Ingenting
 * her importeres av appen (`verktoyapp.test.ts` håndhever det), og ingen av
 * verdiene har klinisk innhold.
 */
import type { Legemiddelutvalg } from '../../legemiddeldata/lesing'
import { KRYSSREGEL, depotregel, nedtrappingsregel, sp, syntetiskUtvalg, TESTAZAPIN, TESTOKSETIN, TESTPERIDON, type Testpreparat } from '../../verktoy/motor/syntetisk'
import { KARTLEGGING } from '../../verktoy/register'
import { fingeravtrykk } from '../../verktoy/regler/godkjenning'
import type { Regel, Regelsett, Virkestoffvalg } from '../../verktoy/regler/modell'
import { PILOTSETT } from '../../verktoy/regler/pilotsett'

/** Testvirkestoffet → virkestoffet i kartleggingen det står for i testen. */
export const TESTKOBLING = { testoksetin: 'escitalopram', testazapin: 'mirtazapin', testperidon: 'paliperidon' } as const

const festId = (nokkel: string) => KARTLEGGING.virkestoffer.find((v) => v.nokkel === nokkel)!.fest[0]!

/** Erstatter testvirkestoffene med virkestoffene i kartleggingen etter `kobling`, overalt i `x`. */
function omkoble<T>(x: T, ider = false, kobling: Readonly<Record<string, string>> = TESTKOBLING): T {
  let tekst = JSON.stringify(x)
  for (const [test, ekte] of Object.entries(kobling)) {
    tekst = ider
      ? tekst.replaceAll(`ID_SYNTETISK-${test.toUpperCase()}"`, `${festId(ekte)}"`)
      : tekst.replaceAll(`"${test}"`, `"${ekte}"`)
  }
  return JSON.parse(tekst) as T
}

/** Godkjenner regelen klinisk bare i testen: avklarer de åpne valgene og binder godkjenningen til fingeravtrykket. */
export function godkjennITest(r: Regel, id: string): Regel {
  const regel: Regel = structuredClone({ ...r, id })
  const av = { dato: '2026-11-01', av: 'Testkontrollør', rolle: 'uavhengig_kontrollor' as const, regelversjon: regel.versjon }
  const avklar = (x: unknown): void => {
    if (Array.isArray(x)) x.forEach(avklar)
    else if (x && typeof x === 'object') {
      if ((x as { type?: string }).type === 'ousfar_vurdering') (x as { avklaring: unknown }).avklaring = { ...av, merknad: 'Avklart bare for testen.' }
      Object.values(x).forEach(avklar)
    }
  }
  avklar(regel)
  regel.godkjenning = { status: 'klinisk_godkjent', historikk: [{ status: 'klinisk_godkjent', ...av, fingeravtrykk: fingeravtrykk(regel), merknad: 'Godkjent bare i testen.' }] }
  return regel
}

/** Nedtrapping av «escitalopram» med syntetiske verdier: 50 % av startdosen per uke. */
export const TEST_NEDTRAPPING: Regel = godkjennITest(
  omkoble(nedtrappingsregel({ type: 'prosent_av_startdose', prosent: sp(50, 'prosent') }, { avvik_prosent: sp(10, 'prosent') })),
  'test-nedtrapping',
)

/** Som {@link TEST_NEDTRAPPING}, men forskriveren kan velge dager per trinn (14–28). */
export const TEST_JUSTERBAR: Regel = (() => {
  const r = nedtrappingsregel({ type: 'prosent_av_startdose', prosent: sp(50, 'prosent') }, { avvik_prosent: sp(10, 'prosent') }, 'justerbar')
  const fase = r.plan.forlop[0]!.faser[0]!
  if (fase.type === 'nedtrapping') fase.trinnlengde = { ...fase.trinnlengde, omrade: [14, 28], justerbar: 'Dager per trinn' }
  return godkjennITest(omkoble(r), 'test-justerbar')
})()

/**
 * Som {@link TEST_JUSTERBAR}, med et spørsmål som må besvares, og kortere trinn
 * enn 21 dager krever begrunnelse når svaret er ja.
 */
export const TEST_BEGRUNNELSE: Regel = (() => {
  const r = nedtrappingsregel({ type: 'prosent_av_startdose', prosent: sp(50, 'prosent') }, { avvik_prosent: sp(10, 'prosent') }, 'begrunnelse')
  const grunnlag = { type: 'ousfar_vurdering' as const, begrunnelse: 'Syntetisk.', avklaring: null }
  r.sporsmal = [{ id: 'testsporsmal', tekst: 'Et syntetisk spørsmål som må besvares.', ja: 'syntetisk ja', grunnlag }]
  const fase = r.plan.forlop[0]!.faser[0]!
  if (fase.type === 'nedtrapping') {
    fase.trinnlengde = { ...fase.trinnlengde, omrade: [14, 28], justerbar: 'Dager per trinn', begrunnelseskrav: [{ under: 21, ved: 'testsporsmal', grunnlag }] }
  }
  return godkjennITest(omkoble(r), 'test-begrunnelse')
})()

/** Kryssnedtrapping «escitalopram» → «mirtazapin» med syntetiske verdier og måldose fra inndata. */
export const TEST_KRYSS: Regel = godkjennITest(omkoble({ ...KRYSSREGEL, inndata: [{ navn: 'maldose', art: 'bindende_krav', grunnlag: { type: 'ousfar_vurdering', begrunnelse: 'Syntetisk.', avklaring: null } }] } as Regel), 'test-kryss')

/** Oppstart av depot «paliperidon» med syntetiske verdier og et unntak som må besvares. */
export const TEST_DEPOT: Regel = godkjennITest(
  omkoble({
    ...depotregel(),
    unntak: [{ id: 'testunntak', tekst: 'Et syntetisk unntak som må besvares.', grunnlag: { type: 'ousfar_vurdering', begrunnelse: 'Syntetisk.', avklaring: null } }],
  } as Regel),
  'test-depot',
)

/** Pilotsettet med testreglene i tillegg, der de ikke kolliderer med pilotreglene. */
export function testsett(...regler: Regel[]): Regelsett {
  const samme = (a: Virkestoffvalg | null, b: Virkestoffvalg | null) => JSON.stringify(a) === JSON.stringify(b)
  return {
    ...PILOTSETT,
    id: 'testsett',
    regler: [...regler, ...PILOTSETT.regler.filter((p) => !regler.some((r) => samme(r.fra, p.fra) && samme(r.til, p.til)))],
  }
}

/** Preparatene for testvirkestoffene i FESTs form, kontrollert `kontrollert_kl`. */
export function testFest(kontrollert_kl: string | null = '2026-11-01T04:20:00Z', kildedato: string | null = '2026-10-15'): Legemiddelutvalg {
  return { ...omkoble(syntetiskUtvalg([...TESTOKSETIN, ...TESTAZAPIN, ...TESTPERIDON], { kontrollert_kl, kildedato }), true), kilde: 'FEST' }
}

/**
 * Syntetiske preparater i FESTs form for et hvilket som helst virkestoff i
 * kartleggingen: testoksetin-preparatene står for `nokkel`, så en ekte regel
 * kan beregnes med preparater som bare finnes i testen.
 */
export function testFestFor(nokkel: string, preparater: readonly Testpreparat[], kontroll: Parameters<typeof syntetiskUtvalg>[1] = {}): Legemiddelutvalg {
  return { ...omkoble(syntetiskUtvalg(preparater, kontroll), true, { testoksetin: nokkel }), kilde: 'FEST' }
}

/** Tidspunktet testene regner fra: samme dag som FEST-kopien er kontrollert. */
export const TESTKLOKKE = () => new Date('2026-11-01T12:00:00Z')
