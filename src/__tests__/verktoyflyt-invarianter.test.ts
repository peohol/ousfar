// @vitest-environment jsdom
/**
 * Sikkerhetsinvariantene S1–S9 for forenklingen av verktøyene
 * (`docs/verktøy-brukervennlighet-2026-11.md` §2), prøvd mot appens eget
 * regelsett og de lagrede FEST-uttrekkene. Testen eies av tråd D; trådene A–C
 * skal få den grønn uten å endre den, med de unntakene som står ved hver test.
 *
 * Kasusene er syntetiske og finner ikke på doser: for hver godkjent regel som
 * verktøyene tilbyr, prøves hver startdose, legemiddelform og svarkombinasjon
 * regelens kliniske omfang er kontrollert med (`klinisk_omfang.tilfeller`;
 * uten omfang hvert av regelens egne regneeksempler slik det står), og hver
 * måldose regelen tilbyr (eller eksemplets egen).
 * Der siden lar forskriveren velge dose for et trinn, velges den første
 * dosen som tilbys, slik QA-forløpene gjør. Kasusene i P11-matrisen
 * (`PILOTKASUS`) og QA-katalogen (K0-01–K0-12 og H-forløpene,
 * `src/__tests__/qa/`) prøves i tillegg for S3.
 *
 * Ingen regel endres eller godkjennes her, og ingenting her er pasientdata.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { createElement } from 'react'
import type { Legemiddelutvalg } from '../legemiddeldata/lesing'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { glemBildet } from '../oppdatering/bevaring'
import { gjelderFortsatt, osloDato, ubesvart, TOMT_SKJEMA, type Planskjema } from '../verktoy/doseplan'
import { elementtekst, planform, preparatliste, type Doseplanresultat } from '../verktoy/motor/plan'
import { kildelinje, planTekst, planvisning, regellinje } from '../verktoy/planvisning'
import { festkoblinger, KARTLEGGING, VALGTEKSTER, VERKTOY, virkestoffvalg, type Verktoy } from '../verktoy/register'
import { BRUKERFORLOP, kjerne, kjorForlop, komplett, lesUttrekkene, tidslinjeavvik, type Planinndata, type Tidslinje } from './qa/brukerforlop'
import { avrund } from '../verktoy/regler/beregning'
import { erKliniskGodkjent, fingeravtrykk, harBeregning } from '../verktoy/regler/godkjenning'
import type { Regel } from '../verktoy/regler/modell'
import { bareFritak, kjorKasus, PILOTKASUS, tidsstempel, type Pilotkasus, type Pilotutfall, type Uttrekkene } from '../verktoy/regler/pilotmatrise'
import { snarvalg } from '../verktoy/snarvalg'
import { kjorKontrollkasus, KONTROLLFORSLAG, omfangsplaner } from '../verktoy/kontrollgrunnlag'
import { FEST_TILLEGG, kjorTilleggskasus } from '../verktoy/tilleggsgrunnlag'
import { fraForlop, REGELSETT, tilForlop, tilgjengelighet, type Verktoyvalg } from '../verktoy/tilgjengelighet'
import type { Verktoysperre } from '../verktoy/sperrer'

/* --- Grunnlaget ------------------------------------------------------------------ */

const MAPPE = FEST_PILOT.slice(0, FEST_PILOT.lastIndexOf('/'))
/** Stiene er fra repoets rot, der testene kjøres. */
const lesJson = (fil: string) => JSON.parse(readFileSync(fil, 'utf8')) as Partial<Festuttrekk>

/** Hvert lagrede FEST-uttrekk med et preparatutvalg, pilotsettet først (det vinner ved lik dekning). */
const UTTREKKENE: Record<string, Festuttrekk> = Object.fromEntries(
  readdirSync(MAPPE)
    .filter((f) => /^fest-.+\.json$/.test(f))
    .map((f) => `${MAPPE}/${f}`)
    .sort((a, b) => Number(b === FEST_PILOT) - Number(a === FEST_PILOT) || a.localeCompare(b))
    .map((fil) => [fil, lesJson(fil)] as const)
    .filter((x): x is readonly [string, Festuttrekk] => Array.isArray(x[1].utvalg?.virkestoff)),
)

/** Uttrekket som har flest av valgets FEST-virkestoffer, i formen `kjorKasus` tar imot. */
function uttrekkFor(valg: Verktoyvalg): Uttrekkene {
  const ider = Object.values(festkoblinger([valg.fra.nokkel, ...(valg.til ? [valg.til.nokkel] : [])])).flat()
  const dekning = (n: string) => ider.filter((id) => UTTREKKENE[n]!.utvalg.virkestoff.some((v) => v.id === id)).length
  const navn = Object.keys(UTTREKKENE).reduce((a, b) => (dekning(b) > dekning(a) ? b : a))
  return { pilot: UTTREKKENE[navn]!, aksept: UTTREKKENE[navn]! }
}

/** De godkjente reglene med beregning i appens regelsett: det forenklingen ikke får endre. */
const GODKJENTE = REGELSETT.regler.filter((r) => erKliniskGodkjent(r) && harBeregning(r))

const tall = (x: number) => String(avrund(x)).replace('.', ',')
/** FEST-koden for tabletter, som velges når siden ber om form og tilfellet ikke sier noe annet. */
const TABLETT = '53'

/* --- Kasusene ------------------------------------------------------------------- */

interface Omfangskasus {
  /** Det planen beregnes fra: aktuell dose og eventuell måldose, til den uavhengige kontrollen av sluttmålet. */
  inn: Planinndata
  kasus: Pilotkasus
  uttrekk: Uttrekkene
  verktoy: Verktoy
  regel: Regel
}

/** Ett tilfelle regelen er kontrollert eller regnet med: startdosen og det forskriveren har oppgitt. */
interface Tilfelle {
  dose: number
  svar: Record<string, boolean>
  form?: string
  justert?: Record<string, number>
  maldose?: number
  pasientforhold?: Record<string, boolean>
  bekreftet?: string[]
  startdato?: string
}

/**
 * Startdosene, svarene og formene regelen er kontrollert med; uten klinisk
 * omfang hvert av regelens regneeksempler slik det står, med svar, måldose,
 * pasientforhold, bekreftelser og justeringer.
 */
function tilfellene(r: Regel): Tilfelle[] {
  const t = r.klinisk_omfang?.tilfeller
  if (t) return t.flatMap((x) => x.startdoser.map((dose) => ({ dose, svar: x.svar, form: x.legemiddelform, justert: x.justert })))
  const alle = r.eksempler.map(
    ({ inndata: e }): Tilfelle => ({
      dose: e.startdose_mg,
      svar: e.svar ?? {},
      justert: e.justert,
      maldose: e.maldose_mg,
      pasientforhold: e.pasientforhold,
      bekreftet: e.bekreftet,
      startdato: e.startdato,
    }),
  )
  return [...new Map(alle.map((x) => [JSON.stringify(x), x])).values()]
}

/** Det som skiller tilfellet fra regelens vanlige svar, til kasusets navn. */
function avvikende(r: Regel, t: Tilfelle): string[] {
  const ja = (x: Record<string, boolean> = {}) => Object.keys(x).filter((k) => x[k])
  const ubekreftet = t.bekreftet && r.bekreftelser.map((b) => b.id).filter((b) => !t.bekreftet!.includes(b))
  return [
    ja(t.svar).length > 0 && `ja: ${ja(t.svar).join(', ')}`,
    ja(t.pasientforhold).length > 0 && `gjelder: ${ja(t.pasientforhold).join(', ')}`,
    ubekreftet && ubekreftet.length > 0 && `ikke bekreftet: ${ubekreftet.join(', ')}`,
    t.startdato && `start ${t.startdato}`,
  ].filter((x): x is string => Boolean(x))
}

/** Hver godkjent regel × hvert valg verktøyene tilbyr den for × hvert kontrollert tilfelle × hver måldose regelen tilbyr (eller tilfellets egen). */
const OMFANGSKASUS: Omfangskasus[] = VERKTOY.flatMap((verktoy) =>
  snarvalg(verktoy)
    .filter((s) => s.status === 'tilgjengelig')
    .flatMap((s) =>
      tilgjengelighet(verktoy, s.valg)
        .regler.filter((r) => GODKJENTE.includes(r))
        .flatMap((regel) => {
          const verdier = regel.inndata.find((k) => k.navn === 'maldose')?.verdier ?? [undefined]
          return tilfellene(regel).flatMap((t) =>
            (t.maldose !== undefined ? [t.maldose] : verdier).map((mal): Omfangskasus => {
              const fra = fraForlop(regel)!.id
              const skjema: Partial<Planskjema> = {
                svar: t.svar,
                regel: regel.id,
                ...(mal !== undefined && { maldose: tall(mal) }),
                ...(t.form && { formvalg: { [fra]: { legemiddelform: t.form } } }),
                ...(t.justert && { justert: Object.fromEntries(Object.entries(t.justert).map(([k, v]) => [k, tall(v)])) }),
                ...(t.pasientforhold && { pasientforhold: t.pasientforhold }),
                ...(t.bekreftet && { bekreftet: t.bekreftet }),
                ...(t.startdato && { startdato: t.startdato }),
              }
              const id = [verktoy.id, s.tekst, `${tall(t.dose)} mg`, t.form && `form ${t.form}`, mal !== undefined && `mål ${tall(mal)} mg`, ...avvikende(regel, t)].filter(Boolean).join(' · ')
              return {
                verktoy,
                regel,
                uttrekk: uttrekkFor(s.valg),
                inn: { startdose_mg: t.dose, ...(mal !== undefined && { maldose_mg: mal }) },
                kasus: { id, kategori: 'vanlig_dose', hva: id, verktoy: verktoy.id, valg: s.valg, uttrekk: 'pilot', dose: tall(t.dose), skjema, forventet: { utfall: 'sperret' } },
              }
            }),
          )
        }),
    ),
)

type Utfall = Pilotutfall & { resultat?: Doseplanresultat; tekst?: string }

/** Kasuset slik siden ville kjørt det: tablett der siden ber om form, og den første dosen som tilbys der forskriveren velger dose per trinn. */
function kjor(k: Pilotkasus, u: Uttrekkene): { utfall: Utfall; skjema: Partial<Planskjema> } {
  let skjema: Partial<Planskjema> = k.skjema ?? {}
  let utfall: Utfall = kjorKasus({ ...k, skjema }, u)
  if (utfall.utfall === 'formvalg') {
    const formvalg = { ...skjema.formvalg }
    for (const f of utfall.forlop) formvalg[f] = { ...formvalg[f], legemiddelform: formvalg[f]?.legemiddelform ?? TABLETT }
    skjema = { ...skjema, formvalg }
    utfall = kjorKasus({ ...k, skjema }, u)
  }
  for (let n = 0, t = utfall.resultat?.trinnvalg?.[0]; t && t.doser.length > 0 && n < 60; n++, t = utfall.resultat?.trinnvalg?.[0]) {
    skjema = { ...skjema, trinnvalg: [...(skjema.trinnvalg ?? []), { forlop: t.forlop, trinn: t.trinn, fra_mg: t.fra_mg, mg: t.doser[0]!.mg }] }
    utfall = kjorKasus({ ...k, skjema }, u)
  }
  return { utfall, skjema }
}

const KJORT = OMFANGSKASUS.map((o) => ({ ...o, ...kjor(o.kasus, o.uttrekk) }))
const PLANER = KJORT.filter((x) => x.utfall.utfall === 'plan')

/* --- S1 og S9: bare komplette planer, og ingen løfter uten plan -------------------------- */

describe('S1: planen kommer bare fra den kliniske motoren og når alltid sluttmålet', () => {
  it('prøver hver godkjent regel med beregning som verktøyene tilbyr', () => {
    const prøvd = new Set(KJORT.map((x) => x.regel.id))
    const tilbudt = GODKJENTE.filter((r) => VERKTOY.some((v) => snarvalg(v).some((s) => s.status === 'tilgjengelig' && s.regler.some((x) => x.id === r.id))))
    expect([...prøvd].sort()).toEqual(tilbudt.map((r) => r.id).sort())
    expect(PLANER.length).toBeGreaterThan(0)
  })

  /**
   * To vurderinger av sluttmålet, uavhengige av hverandre: planens egen
   * (`planvisning`) og QA-kontrollens (`komplett` i `qa/brukerforlop.ts`),
   * som leser planens forløp mot det forskriveren oppga: nedtrapping er
   * seponert; i et bytte er det gamle seponert og det nye ender på nøyaktig
   * den kliniske måldosen; i et tillegg holdes det eksisterende på nøyaktig
   * den aktuelle dosen og det nye ender på måldosen.
   */
  it.each(PLANER.map((x) => [x.kasus.id, x] as const))('%s: en klinisk, komplett plan til sluttmålet', (_, x) => {
    const r = x.utfall.resultat!
    expect([r.status, r.klinisk, r.status === 'doseplan' && r.sperre]).toEqual(['doseplan', true, []])
    const v = planvisning(r, x.regel)!
    expect(v.utfall.komplett, v.utfall.tekst).toBe(true)
    expect(komplett(x.regel, r, x.inn), 'den uavhengige kontrollen av sluttmålet').toBe(true)
  })

  type Planforlop = Extract<Doseplanresultat, { status: 'doseplan' }>['forlop'][number]
  /** Planen endret med vilje på én måte som gjør den ufullstendig; hver endring skal få S1 til å feile. */
  function feilplaner(x: (typeof PLANER)[number]): [string, Doseplanresultat][] {
    const r = x.utfall.resultat!
    if (r.status !== 'doseplan') return []
    const fra = fraForlop(x.regel)?.id
    const til = tilForlop(x.regel)?.id
    const endret = (hva: string, endre: (f: Planforlop) => boolean, id: string | undefined): [string, Doseplanresultat][] => {
      const kopi = structuredClone(r)
      const f = kopi.forlop.find((y) => y.id === id)
      return f && endre(f) ? [[hva, kopi]] : []
    }
    const sluttdose = (f: Planforlop) => {
      const siste = f.perioder.at(-1)
      const vedlikehold = f.injeksjoner.filter((i) => i.vedlikehold).at(-1)
      if (siste?.til === null) siste.mg += 1
      else if (vedlikehold) vedlikehold.mg += 1
      else return false
      return true
    }
    if (x.verktoy.type === 'seponering')
      return endret(
        'legemidlet seponeres ikke',
        (f) => {
          f.siste_dosedag = null
          const siste = f.perioder.at(-1)
          if (siste) siste.til = null
          return true
        },
        fra,
      )
    return [
      ...endret('det nye legemidlet ender på en annen dose enn måldosen', sluttdose, til),
      ...(x.verktoy.type === 'tillegg'
        ? endret(
            'den eksisterende dosen endres',
            (f) => {
              if (f.uendret_mg !== undefined) f.uendret_mg += 1
              for (const p of f.perioder) p.mg += 1
              return f.uendret_mg !== undefined || f.perioder.length > 0
            },
            fra,
          )
        : endret(
            'legemidlet det byttes fra, seponeres ikke',
            (f) => {
              if (f.siste_dosedag === null) return false
              f.siste_dosedag = null
              const siste = f.perioder.at(-1)
              if (siste) siste.til = null
              return true
            },
            fra,
          )),
    ]
  }

  it.each(PLANER.map((x) => [x.kasus.id, x] as const))('%s: en plan som med vilje er gjort ufullstendig, regnes ikke som komplett', (_, x) => {
    const feil = feilplaner(x)
    expect(feil.length, 'minst én endring kan prøves').toBeGreaterThan(0)
    for (const [hva, r] of feil) expect(komplett(x.regel, r, x.inn), hva).toBe(false)
    // En annen måldose enn den forskriveren valgte, er heller ikke sluttmålet.
    if (x.inn.maldose_mg !== undefined) expect(komplett(x.regel, x.utfall.resultat!, { ...x.inn, maldose_mg: x.inn.maldose_mg + 1 }), 'annen måldose').toBe(false)
  })

  it('hver type feil er prøvd: seponering, sluttdose, eksisterende dose og legemidlet det byttes fra', () => {
    const prøvd = new Set(PLANER.flatMap((x) => feilplaner(x).map(([hva]) => hva)))
    expect([...prøvd].sort()).toEqual([
      'den eksisterende dosen endres',
      'det nye legemidlet ender på en annen dose enn måldosen',
      'legemidlet det byttes fra, seponeres ikke',
      'legemidlet seponeres ikke',
    ])
  })

  it('gir aldri en plan som ikke når sluttmålet, heller ikke i P11-matrisen', () => {
    for (const k of PILOTKASUS) {
      const u = kjorKasus(k, { pilot: UTTREKKENE[FEST_PILOT]!, aksept: UTTREKKENE[`${MAPPE}/fest-aksepttest.json`]! })
      if (u.utfall !== 'plan') continue
      const regel = REGELSETT.regler.find((r) => r.id === u.resultat!.regel.id)!
      const tall = (x: string | undefined) => (x ? Number(x.replace(',', '.')) : undefined)
      const maldose = tall(k.skjema?.maldose)
      expect(planvisning(u.resultat!, regel)?.utfall.komplett, k.id).toBe(true)
      expect(komplett(regel, u.resultat!, { startdose_mg: tall(k.dose)!, ...(maldose !== undefined && { maldose_mg: maldose }) }), `${k.id}: den uavhengige kontrollen`).toBe(true)
    }
  })
})

describe('S9: verktøyet lover ingen plan det ikke kan gi', () => {
  it('hvert valg som tilbys som «kan beregnes», gir en komplett plan i minst ett kontrollert tilfelle', () => {
    for (const v of VERKTOY)
      for (const s of snarvalg(v).filter((x) => x.status === 'tilgjengelig')) {
        const egne = KJORT.filter((x) => x.verktoy === v && JSON.stringify(x.kasus.valg) === JSON.stringify(s.valg))
        expect(
          egne.some((x) => x.utfall.utfall === 'plan'),
          `${v.navn}: ${s.tekst}`,
        ).toBe(true)
      }
  })
  it.todo('forhåndskontrollen (C1) sier aldri «kan lages» uten at motoren har beregnet planen med de faktiske svarene')
})

/* --- S2 og S3: godkjenningene og planene er uendret -------------------------------------- */

describe('S2: ingen godkjent regel får nytt fingeravtrykk', () => {
  /**
   * Fingeravtrykkene godkjenningene gjelder (main 05.11.2026, etter #320 og #318).
   * En ny, godkjent regelversjon legges til her i samme PR som godkjenningen;
   * en linje fjernes bare når regelen er erstattet av en godkjent versjon.
   */
  const FASTE: Record<string, [number, string]> = {
    'kryssnedtrapping-sertralin-mirtazapin': [10, '12801aa22a0ca2a576b9ba737d5d5cb52db3a73dc1b437bde7f20a896214c81a'],
    'depot-aripiprazol-maintena': [3, '04d1debe48f02ea03a31aab3d7cd5cdeb15c56d4b43797bda353f3d857297f20'],
    'depot-paliperidon-xeplion': [3, '21a335eec8c3816ee21627ceec3197e52957ccdf99cdbfaa00a3ca3cb5987bdf'],
    'seponering-escitalopram': [13, 'e8a3c17edda10da43b1df4171a733a23133da50ebcda31cd71a771022a8a78d7'],
    'seponering-vortioksetin': [12, 'b28dec93f5ede06c6565e1ce5d6aa62606c69250f1a9088dae0c57d3121101f3'],
    'seponering-bupropion': [5, 'e7536668ac7f2d4dfd9959f24cfdfc4874182a4fc295355f0d10a05f438b5f5f'],
    'seponering-agomelatin': [1, '6d42863f3573fb2e0d6dbffd27ff78a7f1c2b539c8dce2cfcd36ad417b61a2d1'],
    'depot-risperidon-xeplion': [8, '1672334c468f28cf181aa4d786370e60f3f232f76f63d374e0c505d847ab184e'],
    'antipsykotikabytte-olanzapin-aripiprazol': [8, 'f141a13a9e9368542d7719cfb0abea7cfb77a41d7d89248e5f9e1d70e0aa5f5e'],
    'antipsykotikabytte-risperidon-aripiprazol': [8, '866ac93c58fb921c78cd71518ec91637cb31a175b7a9a480552fcebe54cca870'],
    'tillegg-valproat-lamotrigin': [2, '0a9213f31b5f428935fceeef41498a2999682631b1692749bb7ebe19c82639b8'],
    'tillegg-litium-lamotrigin': [2, '786436a0ea8d115b7927a9a20ffabc736b59bc06c59117769551e5f75e89e44b'],
    'bytte-escitalopram-sertralin': [2, 'c0bf6c61e38c437d4c8e41d36653fe1ce3b1a9c1dfb0f9d9af603e9f7dd0289c'],
    'bytte-citalopram-sertralin': [2, '2b64ff9e383e6f9462600c4921a9dd7828ea2adc4ab404646f142ce306a57aa8'],
  }
  it('de godkjente reglene i appen er nøyaktig disse versjonene, med uendret fingeravtrykk', () => {
    const naa = Object.fromEntries(REGELSETT.regler.filter(erKliniskGodkjent).map((r) => [r.id, [r.versjon, fingeravtrykk(r)]]))
    expect(naa).toEqual(FASTE)
  })
})

/** Dosene siden tilbyr for neste trinn når forskriveren velger dose per trinn. */
const tilbys = (r: Doseplanresultat | undefined) =>
  r?.trinnvalg?.map((t) => `${t.forlop} trinn ${t.trinn} fra ${tall(t.fra_mg)} mg: ${t.doser.map((d) => `${tall(d.mg)} mg${d.dager !== undefined ? ` (${d.dager} d)` : ''}`).join(' | ')}`)

/**
 * Utfallet slik motoren ga det, uten formatering: for en plan dosene og
 * preparatene per forløp, vurderingspunktene og forbeholdene; ellers
 * grunnene. Dosene siden tilbyr for neste trinn står med i begge tilfeller.
 */
function oppsummering(u: Utfall): unknown {
  const valg = tilbys(u.resultat)
  const med = <T extends object>(x: T) => (valg ? { ...x, tilbys: valg } : x)
  if (u.utfall !== 'plan') return med(u.utfall === 'ingen' ? { utfall: u.utfall, status: u.status, grunner: u.grunner } : { ...u, resultat: undefined, tekst: undefined })
  const r = u.resultat!
  // Kontrollkasusene kan regne med en regel som bare er godkjent i kontrollgrunnlaget; da finnes ingen visning.
  const regel = REGELSETT.regler.find((x) => x.id === r.regel.id && fingeravtrykk(x) === r.regel.fingeravtrykk)
  const v = regel && planvisning(r, regel)
  return med({
    regel: `${r.regel.id} v${r.regel.versjon}`,
    forlop: planform(r),
    preparater: preparatliste(r),
    vurderinger: v ? v.vurderinger : null,
    forbehold: r.status === 'doseplan' ? r.forbehold : [],
    avvik: r.status === 'doseplan' ? r.avvik : [],
  })
}

describe('S3: de samme planene for de samme kasusene', () => {
  /**
   * Øyeblikksbildet er planene på main før forenklingen. Et avvik er en
   * klinisk endring: det godtas bare i PR-en der en ny, godkjent
   * regelversjon uttrykkelig tar i bruk ny motoratferd (B2), og da bare
   * for den regelen, med `vitest -u` og oppdateringen vist i PR-beskrivelsen.
   * Dette er det eneste øyeblikksbildet for S3; motorarbeidet (B1) prøves mot det.
   */
  const PILOT = { pilot: UTTREKKENE[FEST_PILOT]!, aksept: UTTREKKENE[`${MAPPE}/fest-aksepttest.json`]! }
  it('omfangskasusene', () => {
    expect(Object.fromEntries(KJORT.map((x) => [x.kasus.id, oppsummering(x.utfall)]))).toMatchSnapshot()
  })
  it('P11-matrisen', () => {
    expect(Object.fromEntries(PILOTKASUS.map((k) => [k.id, oppsummering(kjorKasus(k, PILOT))]))).toMatchSnapshot()
  })
  it('QA-katalogen (K0-01–K0-12 og H-forløpene)', () => {
    const u = lesUttrekkene()
    const ut = Object.fromEntries(
      BRUKERFORLOP.map((f) => {
        const r = kjorForlop(f, u)
        return [f.id, { klasse: r.klasse, ...(r.utfall ? { utfall: oppsummering(r.utfall) } : {}), formvalg: r.formvalg, trinnvalg: r.trinnvalg }]
      }),
    )
    expect(ut).toMatchSnapshot()
  })
  it('K4-kasusene', () => {
    expect(Object.fromEntries(kjorTilleggskasus(UTTREKKENE[FEST_TILLEGG]!).map(({ k, res }) => [k.id, oppsummering(res)]))).toMatchSnapshot()
  })
  it('kontrollkasusene og hver vei gjennom det kliniske omfanget i kontrollgrunnlagene', () => {
    const ut: Record<string, unknown> = {}
    for (const f of KONTROLLFORSLAG) {
      for (const k of f.kasus) ut[`kontroll ${f.nr} ${k.id}`] = oppsummering(kjorKontrollkasus(k, PILOT))
      for (const o of omfangsplaner(f, PILOT))
        for (const v of o.veier) ut[`omfang ${f.nr} ${o.regel.id} ${o.form ?? '-'} ${tall(o.startdose_mg)} mg [${v.valg.map((x) => x.valgt).join(',')}]`] = oppsummering(v.utfall)
    }
    expect(ut).toMatchSnapshot()
  }, 300_000)
})

/* --- S4 og S5: hver betingelse må besvares, og ukjent gir aldri plan ---------------------- */

/** Betingelsene i regelen med svarene i kasuset: spørsmål, unntak og bekreftelsene som gjelder. */
const betingelser = (r: Regel, svar: Record<string, boolean> = {}) => ({
  sporsmal: (r.sporsmal ?? []).map((s) => s.id),
  unntak: r.unntak.map((u) => u.id),
  bekreftelser: r.bekreftelser.filter((b) => !b.ved || svar[b.ved.sporsmal] === b.ved.svar).map((b) => b.id),
})

describe('S4: ukjent er aldri det trygge svaret', () => {
  it.each(PLANER.map((x) => [x.kasus.id, x] as const))('%s: hver betingelse uten svar gir ingen plan', (_, x) => {
    const b = betingelser(x.regel, x.skjema.svar)
    const med = (skjema: Partial<Planskjema>, ubesvart: string[] = []) => kjorKasus({ ...x.kasus, skjema, ubesvart }, x.uttrekk).utfall
    for (const id of [...b.sporsmal, ...b.unntak]) expect(med(x.skjema, [id]), `${id} ubesvart`).not.toBe('plan')
    for (const id of b.bekreftelser) expect(med({ ...x.skjema, bekreftet: b.bekreftelser.filter((y) => y !== id) }), `${id} ikke bekreftet`).not.toBe('plan')
  })
  it.each(PLANER.map((x) => [x.kasus.id, x] as const))('%s: hvert unntak som gjelder, gir ingen plan', (_, x) => {
    for (const id of x.regel.unntak.map((u) => u.id)) {
      const skjema = { ...x.skjema, pasientforhold: { [id]: true } }
      expect(kjorKasus({ ...x.kasus, skjema }, x.uttrekk).utfall, id).not.toBe('plan')
    }
  })
  it.todo('svaret «Ukjent» (C1) avbildes til ubesvart for hver betingelse, og gir en forklaring på hva som må avklares')
})

describe('S5: hver betingelse i hver godkjent regel tas stilling til', () => {
  it.each(GODKJENTE.map((r) => [r.id, r] as const))('%s: skjemaet krever svar på hvert spørsmål og unntak og hver bekreftelse som gjelder', (_, r) => {
    expect(ubesvart(r, TOMT_SKJEMA)).toEqual(betingelser(r))
    // En betinget bekreftelse kreves når svaret den gjelder ved, er gitt.
    for (const b of r.bekreftelser.filter((x) => x.ved)) {
      const svar = { [b.ved!.sporsmal]: b.ved!.svar }
      expect(ubesvart(r, { ...TOMT_SKJEMA, svar }).bekreftelser, b.id).toContain(b.id)
    }
  })
  it.todo('hver betingelse har en kategori i spørsmålskatalogen (C1); en betingelse uten kategori spørres med regelens egen tekst')
})

describe('S6: avledninger ved grenseverdiene', () => {
  it.todo('alder 17/18 og 64/65/66 avbildes til regelens egne spørsmål og unntak (C1)')
  it.todo('dosegrensene i hver godkjent regel prøves rett under, på og rett over grensen (C1)')
})

/* --- S7: sperrer, FEST og klokken ----------------------------------------------------- */

const sperre = (omfang: Verktoysperre['omfang'], mal: string | null): Verktoysperre => ({ id: `s-${omfang}`, omfang, mal, grunn: 'Syntetisk sperre.', satt_kl: '2026-11-04T08:00:00Z', satt_av: null })
/** Ett plankasus per godkjent regel. */
const EN_PER_REGEL = GODKJENTE.flatMap((r) => PLANER.find((x) => x.regel === r) ?? [])

describe('S7: nødstopp, FEST og klokken virker som før', () => {
  it.each(EN_PER_REGEL.map((x) => [x.regel.id, x] as const))('%s', (_, x) => {
    const med = (k: Partial<Pilotkasus>) => kjorKasus({ ...x.kasus, skjema: x.skjema, ...k }, x.uttrekk)
    for (const s of [sperre('alle', null), sperre('verktoy', x.verktoy.id), sperre('regel', x.regel.id)]) expect(med({ sperrer: [s] }).utfall, s.omfang).toBe('sperret')
    expect(med({ timer: 49 }).utfall, 'FEST eldre enn 48 timer').not.toBe('plan')
    expect(med({ timer: -1 }).utfall, 'FEST kontrollert fram i tid').not.toBe('plan')
    expect(med({ fest: tidsstempel('ingen vellykket henting', { kontrollert_kl: null }) }).utfall, 'ingen vellykket henting').not.toBe('plan')
    const fritak = [x.kasus.valg.fra, ...(x.kasus.valg.til ? [x.kasus.valg.til] : [])].map((v) => bareFritak(v.nokkel))
    const alleFritak = { hva: 'bare preparater med godkjenningsfritak', endre: (u: Legemiddelutvalg, idag: string) => fritak.forEach((e) => e.endre(u, idag)) }
    expect(med({ fest: alleFritak }).utfall, alleFritak.hva).not.toBe('plan')
    // Planen gjelder bare den dagen den er beregnet.
    const r = x.utfall.resultat!
    const dagen = new Date(`${r.fest.statusdato}T12:00:00+01:00`)
    expect(gjelderFortsatt(r, new Date(dagen.getTime() + 24 * 3_600_000)), 'en ny dag').toBe(false)
    expect(osloDato(dagen)).toBe(r.fest.statusdato)
  })
})

/* --- S8: kopien har hele planen ------------------------------------------------------- */

/** Teksten i et element slik den leses: tekst i samme element samlet, hvert underelement på sin egen linje. */
function lesbar(el: Element): string {
  const noder = [...el.childNodes]
  if (noder.every((n) => n.nodeType === Node.TEXT_NODE)) return el.textContent ?? ''
  return noder
    .map((n) => (n instanceof Element ? lesbar(n) : (n.textContent ?? '')).trim())
    .filter(Boolean)
    .join('\n')
}
const enLinje = (el: Element) => (el.textContent ?? '').replace(/\s+/g, ' ').trim()

/** Raden sin tid: dagene, og datoene i parentes når planen har en startdato (slik kopien skriver dem). */
function naar(th: Element): string {
  const [dager, ...datoer] = lesbar(th).split('\n')
  return datoer.length > 0 ? `${dager} (${datoer.join(' ')})` : dager!
}

/** Tidslinjen slik planen viser den, i formen `tidslinjeavvik` (QA) sammenligner med kopien. */
function tidslinjen(tabell: HTMLTableElement): Tidslinje {
  return {
    koloner: [...tabell.querySelectorAll('thead th')].map(enLinje),
    rader: [...tabell.querySelectorAll('tbody tr')].map((r) => [...r.children].map((c, i) => (i === 0 ? naar(c) : lesbar(c)))),
  }
}

/** Dagene en rad i tabellen gjelder: «Dag 3», «Dag 1–14» eller «Fra dag 15». */
function dagene(naar: string): [number, number] | null {
  const m = /^(?:Dag (\d+)(?:–(\d+))?|Fra dag (\d+))$/.exec(naar)
  if (!m) return null
  return m[3] ? [Number(m[3]), Infinity] : [Number(m[1]), Number(m[2] ?? m[1])]
}

const linjene = (tekst: string) => tekst.split('\n').map(kjerne)

/**
 * Det motoren beregnet, mot tabellen planen viser, celle for celle: hver
 * periode står i raden for dagen den begynner, under sitt legemiddel, med
 * dosen først og hvert preparat på sin linje; hver injeksjon står i en
 * injeksjonsrad under sitt legemiddel. Kolonnene er legemidlene i
 * forløpenes rekkefølge.
 */
function motoravvik(r: Extract<Doseplanresultat, { status: 'doseplan' }>, tabell: HTMLTableElement): string[] {
  const avvik: string[] = []
  const koloner = [...tabell.querySelectorAll('thead th')].slice(1).map(enLinje)
  const rader = [...tabell.querySelectorAll('tbody tr')].map((tr) => ({
    type: tr.getAttribute('data-type'),
    naar: lesbar(tr.children[0]!).split('\n')[0]!,
    celler: [...tr.children].slice(1).map(lesbar),
  }))
  r.forlop.forEach((f, i) => {
    const navn = KARTLEGGING.virkestoffer.find((v) => v.nokkel === f.virkestoff)?.navn ?? f.virkestoff
    if (!koloner[i]?.startsWith(navn)) avvik.push(`kolonne ${i + 1} er «${koloner[i]}», ikke ${navn}`)
    for (const p of f.perioder) {
      const rad = rader.find((x) => x.type === 'periode' && dagene(x.naar)?.[0] === p.fra)
      const celle = rad && linjene(rad.celler[i] ?? '')
      const dose = kjerne(`${tall(p.mg)} mg`)
      // Dosen står først, og et tall rett etter den (for eksempel «15 mg» for «5 mg») godtas ikke.
      if (!celle || !celle[0]!.startsWith(dose) || /^[\p{N}‡|]/u.test(celle[0]!.slice(dose.length)))
        avvik.push(`${navn} dag ${p.fra}: ${tall(p.mg)} mg står ikke først i cellen (${JSON.stringify(rad?.celler[i])})`)
      for (const e of p.elementer) if (!celle?.includes(kjerne(elementtekst(e)))) avvik.push(`${navn} dag ${p.fra}: «${elementtekst(e)}» står ikke i cellen`)
    }
    for (const inj of f.injeksjoner) {
      const dose = kjerne(`Injeksjon ${tall(inj.mg)} mg`)
      const funnet = rader.some((x) => x.type === 'injeksjon' && linjene(x.celler[i] ?? '').includes(dose) && linjene(x.celler[i] ?? '').includes(kjerne(elementtekst(inj.element))))
      if (!funnet) avvik.push(`${navn}: injeksjonen ${tall(inj.mg)} mg står ikke i en injeksjonsrad under legemidlet`)
    }
  })
  return avvik
}

/** Kopien endret med vilje på én måte; hver endring skal gi et avvik mot tabellen. */
function feilkopier(kopi: string, koloner: readonly string[]): [string, string][] {
  const linjer = kopi.split('\n')
  // Tidslinjen er linjene mellom den første og den andre tomme linjen (planTekst).
  const start = linjer.indexOf('') + 1
  const slutt = linjer.indexOf('', start) < 0 ? linjer.length : linjer.indexOf('', start)
  const endre = (hva: string, finn: (l: string) => boolean, ny: (l: string) => string): [string, string][] => {
    const i = linjer.findIndex((l, j) => j >= start && j < slutt && finn(l))
    return i < 0 ? [] : [[hva, linjer.map((l, j) => (j === i ? ny(l) : l)).join('\n')]]
  }
  return [
    ...endre(
      'dag 1 blir dag 10',
      (l) => /^Dag 1\b(?!\d)/.test(l),
      (l) => l.replace(/^Dag 1/, 'Dag 10'),
    ),
    ...endre(
      'en dose på 5 mg blir 15 mg',
      (l) => /(^|[^\d,])5 mg/.test(l),
      (l) => l.replace(/(^|[^\d,])5 mg/, '$11' + '5 mg'),
    ),
    ...endre(
      'en annen dose får et ekstra siffer foran',
      (l) => /: (\d+(?:,\d+)?) mg/.test(l),
      (l) => l.replace(/: (\d+(?:,\d+)?) mg/, ': 1$1 mg'),
    ),
    ...endre(
      'et desimaltegn faller bort (som 2,5 → 25 mg)',
      (l) => /\d,\d+ mg/.test(l),
      (l) => l.replace(/(\d),(\d+) mg/, '$1$2 mg'),
    ),
    ...endre(
      'et desimaltegn kommer til (som 25 → 2,5 mg)',
      (l) => /(^|[^\d,])(\d)(\d) mg/.test(l),
      (l) => l.replace(/(^|[^\d,])(\d)(\d) mg/, '$1$2,$3 mg'),
    ),
    ...koloner
      .flatMap((a) =>
        koloner
          .filter((b) => b !== a)
          .flatMap((b) =>
            endre(
              'legemidlene bytter plass på samme dag',
              (l) => /^[^:]+: /.test(l) && l.includes(`: ${a}: `) && l.includes(`; ${b}: `),
              (l) => l.replace(`: ${a}: `, ': \u0000: ').replace(`; ${b}: `, `; ${a}: `).replace(': \u0000: ', `: ${b}: `),
            ),
          ),
      )
      .slice(0, 1),
  ]
}

describe('S8: kopien inneholder hele planen', () => {
  afterEach(cleanup)
  const PLANVISNING = import('../components/verktoy/Doseplanvisning')

  /** Planen vist på siden, med tabellen og kopien. */
  async function vist(x: (typeof PLANER)[number]) {
    const { Doseplanvisning } = await PLANVISNING
    const r = x.utfall.resultat!
    if (r.status !== 'doseplan') throw new Error('ingen plan')
    const v = planvisning(r, x.regel)!
    const { container } = render(createElement(Doseplanvisning, { plan: v, overskrift: x.verktoy.navn }))
    return { r, v, tabell: container.querySelector('table')!, kopi: planTekst(v, x.verktoy.navn) }
  }

  it.each(PLANER.map((x) => [x.kasus.id, x] as const))('%s: tabellen har det motoren beregnet, og kopien har tabellen celle for celle', async (_, x) => {
    const { r, tabell, kopi } = await vist(x)
    expect(motoravvik(r, tabell), 'motoren mot tabellen').toEqual([])
    expect(tidslinjeavvik(tidslinjen(tabell), kopi), 'tabellen mot kopien').toEqual([])
  })

  it.each(PLANER.map((x) => [x.kasus.id, x] as const))('%s: kopien har resten av planen linje for linje', async (_, x) => {
    const { r, v, kopi } = await vist(x)
    const linjer = new Set(kopi.split('\n'))
    const mangler = (deler: readonly string[]) => deler.filter((d) => !linjer.has(`- ${d}`))
    expect(mangler(v.vurderinger), 'vurderingspunkter').toEqual([])
    expect(mangler(r.forbehold), 'forbehold').toEqual([])
    expect(mangler(preparatliste(r)), 'preparatene').toEqual([])
    expect(mangler(v.kilder.map(kildelinje)), 'kildene').toEqual([])
    expect(mangler([regellinje(r.regel)]), 'regelversjon og fingeravtrykk').toEqual([])
  })

  it.each(PLANER.map((x) => [x.kasus.id, x] as const))('%s: en kopi eller tabell som med vilje er gjort feil, gir avvik', async (_, x) => {
    const { r, tabell, kopi } = await vist(x)
    const t = tidslinjen(tabell)
    for (const [hva, feil] of feilkopier(kopi, t.koloner.slice(1))) expect(tidslinjeavvik(t, feil), hva).not.toEqual([])
    // Motoren med en annen dose i første periode, eller med forløpene i omvendt rekkefølge, stemmer ikke med tabellen.
    const annenDose = structuredClone(r)
    const periode = annenDose.forlop.flatMap((f) => f.perioder)[0]
    const injeksjon = annenDose.forlop.flatMap((f) => f.injeksjoner)[0]
    if (periode) periode.mg += 10
    else if (injeksjon) injeksjon.mg += 10
    expect(motoravvik(annenDose, tabell), 'en annen dose fra motoren').not.toEqual([])
    if (r.forlop.length > 1) expect(motoravvik({ ...r, forlop: [...r.forlop].reverse() }, tabell), 'legemidlene i omvendt rekkefølge').not.toEqual([])
    // Tabellen med to celler byttet om i første rad med dose under to legemidler.
    const i = t.rader.findIndex((r) => r.slice(1).filter((c) => c && c !== '–').length >= 2)
    if (i >= 0) {
      const rad = t.rader[i]!
      const byttet = { ...t, rader: t.rader.map((r, j) => (j === i ? [r[0]!, ...r.slice(1).reverse()] : r)) }
      if (rad.slice(1).join() !== rad.slice(1).reverse().join()) expect(tidslinjeavvik(byttet, kopi), 'cellene byttet mellom legemidlene').not.toEqual([])
    }
  })

  it('hver type feil er prøvd, og minst én plan har to legemidler samtidig', async () => {
    const prøvd = new Set<string>()
    let samtidig = 0
    for (const x of PLANER) {
      const { tabell, kopi } = await vist(x)
      for (const [hva] of feilkopier(kopi, tidslinjen(tabell).koloner.slice(1))) prøvd.add(hva)
      if (tidslinjen(tabell).rader.some((r) => r.slice(1).filter((c) => c && c !== '–').length >= 2)) samtidig++
      cleanup()
    }
    expect([...prøvd].sort()).toEqual(
      [
        'dag 1 blir dag 10',
        'en annen dose får et ekstra siffer foran',
        'en dose på 5 mg blir 15 mg',
        'et desimaltegn faller bort (som 2,5 → 25 mg)',
        'et desimaltegn kommer til (som 25 → 2,5 mg)',
        'legemidlene bytter plass på samme dag',
      ].sort(),
    )
    expect(samtidig, 'planer med to legemidler samme dag').toBeGreaterThan(0)
  })
})

/* --- Det klinikeren ser: ingen interne begreper ------------------------------------------ */

/** Begreper fra regelmodellen og kontrollen som ikke skal stå i det klinikeren ser før planen (plan §4.2, P9). */
const INTERNE: readonly [string, RegExp][] = [
  ['regel-ID', new RegExp(`\\b(${REGELSETT.regler.map((r) => r.id).join('|')})\\b`)],
  ['fingeravtrykk', /fingeravtrykk/i],
  ['omfang', /\bomfang/i],
  ['strategi', /\bstrategi/i],
  ['formuleringsklasse', /formuleringsklasse/i],
  ['kontrollutfall', /kontrollert, ikke godkjent|til faglig kontroll/i],
]
/** Svaralternativer som ikke sier hva som svares på (P1). */
const UKLARE_SVAR = /^(Gjelder|Gjelder ikke)$/

/**
 * Regelens egne tekster (spørsmål, unntak, bekreftelser og fortolkning). De er
 * klinisk innhold bundet til fingeravtrykket og kan ikke endres av
 * grensesnittet, så begrepene lete etter i det grensesnittet selv skriver.
 */
const REGELTEKSTER = REGELSETT.regler
  .flatMap((r) => [...(r.sporsmal ?? []), ...r.unntak, ...r.bekreftelser, ...r.fortolkning.kildetro, ...r.fortolkning.tilpasninger].map((x) => x.tekst))
  .sort((a, b) => b.length - a.length)

/** Teksten på siden slik den kan leses, uten innholdet i lukkede sammenleggbare deler og uten regelens egne tekster. */
function synligTekst(): string {
  const kopi = document.body.cloneNode(true) as HTMLElement
  for (const d of kopi.querySelectorAll('details:not([open])')) for (const barn of [...d.children]) if (barn.tagName !== 'SUMMARY') barn.remove()
  return REGELTEKSTER.reduce((t, x) => t.split(x).join(' '), kopi.textContent ?? '')
}

/**
 * Katalogkontrollen fra C1 (`src/verktoy/flyt/katalogkontroll.ts`, plan S5b og
 * §4.4): `katalogGjelder(regel)` sier om katalogavtrykket er kontrollert for
 * nøyaktig regelens versjon og fingeravtrykk, og `KONTROLLERTE_KATALOGER` er
 * avtrykkene som er ført. Før C1 er slått sammen finnes ikke modulen; da
 * feiler kriterium 2 med den grunnen. Finnes modulen uten eksportene, feiler
 * hele fila: ingen stille reserve til «ikke kontrollert».
 */
interface Katalogkontrollmodul {
  katalogGjelder: (r: Regel) => boolean
  KONTROLLERTE_KATALOGER: readonly unknown[]
}
const KATALOGKONTROLL = Object.values(import.meta.glob<Partial<Katalogkontrollmodul>>('../verktoy/flyt/katalogkontroll.ts', { eager: true }))[0]
if (KATALOGKONTROLL && (typeof KATALOGKONTROLL.katalogGjelder !== 'function' || !Array.isArray(KATALOGKONTROLL.KONTROLLERTE_KATALOGER)))
  throw new Error('src/verktoy/flyt/katalogkontroll.ts mangler eksporten katalogGjelder eller KONTROLLERTE_KATALOGER')
function katalogGjelder(r: Regel): boolean {
  if (!KATALOGKONTROLL) throw new Error('Katalogkontrollen (C1, src/verktoy/flyt/katalogkontroll.ts) finnes ikke ennå')
  return KATALOGKONTROLL.katalogGjelder!(r)
}
/**
 * De godkjente reglene som med vilje står i reservevisningen til katalogen
 * deres er kontrollert (C1, 3da270b: ChatGPT har godkjent avtrykkene for de
 * sju andre; K2-byttene til sertralin, #318, har katalog som ikke er kontrollert ennå). Den som fører et nytt katalogavtrykk, eller får en ny regel
 * godkjent uten avtrykk, endrer listen i samme PR. Kriterium 2 er helt nådd
 * først når listen er tom (plan §11).
 */
const VENTER_PA_KATALOGKONTROLL: readonly string[] = [
  'kryssnedtrapping-sertralin-mirtazapin v10',
  'seponering-escitalopram v13',
  'seponering-vortioksetin v12',
  'bytte-escitalopram-sertralin v2',
  'bytte-citalopram-sertralin v2',
]

/**
 * Merket på reservevisningen (plan S5): regelens egne tekster og svar,
 * også «Gjelder»/«Gjelder ikke» for unntak, slik dagens skjema viser dem.
 * A1 setter `data-reservevisning` på elementet som viser betingelsene slik.
 */
const RESERVEVISNING = '[data-reservevisning]'

describe('Det klinikeren ser før planen', () => {
  beforeEach(() => {
    window.scrollTo = () => {}
    sessionStorage.clear()
    glemBildet()
  })
  afterEach(cleanup)

  /** For hvert verktøy det første valget (med én formulering) der regelen ikke er godkjent eller venter på kontroll. */
  const UTEN_BEREGNING = VERKTOY.flatMap((v) => {
    const enkle = virkestoffvalg(v).filter((x) => x.formuleringer.length === 1)
    const valgene: Verktoyvalg[] = enkle.flatMap((fra) =>
      VALGTEKSTER[v.type].til
        ? enkle.filter((til) => til !== fra).map((til) => ({ fra: { nokkel: fra.nokkel, formulering: fra.formuleringer[0]! }, til: { nokkel: til.nokkel, formulering: til.formuleringer[0]! } }))
        : [{ fra: { nokkel: fra.nokkel, formulering: fra.formuleringer[0]! } }],
    )
    const valg = valgene.find((x) => ['ikke_godkjent', 'til_kontroll'].includes(tilgjengelighet(v, x).status))
    return valg ? [[`${v.navn}: ${[valg.fra.nokkel, valg.til?.nokkel].filter(Boolean).join(' → ')} (uten beregning)`, v, valg] as const] : []
  })

  /** Hvert valg som kan beregnes, med den første kontrollerte startdosen fylt inn. */
  const VALG = VERKTOY.flatMap((v) =>
    snarvalg(v)
      .filter((s) => s.status === 'tilgjengelig')
      .map((s) => [`${v.navn}: ${s.tekst}`, v, s] as const),
  )

  async function funn(): Promise<string[]> {
    // Siden lastes først her, så modulene den drar inn ikke endrer rekkefølgen grunnlaget over lastes i.
    const { Verktoyside } = await import('../components/verktoy/Verktoyside')
    const ut: string[] = []
    for (const [navn, v, s] of VALG) {
      const side = render(createElement(Verktoyside, { verktoy: v.id, legemidler: undefined, sperrer: { les: async () => [] }, regelvarsler: { les: async () => [] }, onLukk: () => {} }))
      fireEvent.click(await screen.findByRole('button', { name: s.tekst }))
      const dose = await waitFor(() => screen.getByRole('textbox', { name: /^Aktuell/ }))
      const forste = OMFANGSKASUS.find((o) => o.verktoy === v && JSON.stringify(o.kasus.valg) === JSON.stringify(s.valg))
      fireEvent.change(dose, { target: { value: forste?.kasus.dose ?? '10' } })
      // Valget bruker katalogen bare når hver godkjent regel det kan beregnes med, har kontrollert katalog.
      const kontrollert = GODKJENTE.filter((r) => s.regler.some((x) => x.id === r.id)).every(katalogGjelder)
      const reserve = document.querySelector(RESERVEVISNING) !== null
      if (!kontrollert) {
        if (!reserve) ut.push(`${navn}: regelen har ikke kontrollert katalog, men vises ikke i reservevisningen`)
        side.unmount()
        sessionStorage.clear()
        glemBildet()
        continue
      }
      if (reserve) ut.push(`${navn}: reservevisningen brukes selv om katalogen er kontrollert`)
      const tekst = synligTekst()
      for (const [begrep, m] of INTERNE) if (m.test(tekst)) ut.push(`${navn}: ${begrep} («${tekst.match(m)![0]}»)`)
      for (const r of screen.queryAllByRole('radio')) {
        const etikett = (r.closest('label')?.textContent ?? '').trim()
        if (UKLARE_SVAR.test(etikett)) {
          ut.push(`${navn}: svaret «${etikett}»`)
          break
        }
      }
      side.unmount()
      sessionStorage.clear()
      glemBildet()
    }
    // Det som står når valget ikke kan beregnes (regelen er ikke godkjent eller venter på kontroll).
    for (const [navn, v, valg] of UTEN_BEREGNING) {
      const side = render(createElement(Verktoyside, { verktoy: v.id, legemidler: undefined, sperrer: { les: async () => [] }, regelvarsler: { les: async () => [] }, onLukk: () => {} }))
      const tekster = VALGTEKSTER[v.type]
      const skriv = (etikett: string, nokkel: string) =>
        fireEvent.change(screen.getByRole('combobox', { name: etikett }), { target: { value: virkestoffvalg(v).find((x) => x.nokkel === nokkel)!.navn } })
      skriv(tekster.fra, valg.fra.nokkel)
      if (tekster.til && valg.til) skriv(tekster.til, valg.til.nokkel)
      await screen.findByRole('status')
      const tekst = synligTekst()
      for (const [begrep, m] of INTERNE) if (m.test(tekst)) ut.push(`${navn}: ${begrep} («${tekst.match(m)![0]}»)`)
      side.unmount()
      sessionStorage.clear()
      glemBildet()
    }
    return ut
  }

  /**
   * Kriterium 2 (plan §11): for regler med kontrollert katalog står ingen
   * regel-ID, interne begreper, koder eller svaret «Gjelder» i det klinikeren
   * ser. Regler uten kontrollert katalog vises i reservevisningen, som med
   * vilje beholder regelens egne tekster og svar; der kontrolleres bare at
   * reservevisningen brukes, og at den ikke brukes noe annet sted. Valg uten
   * beregning skal heller ikke vise interne begreper.
   *
   * I dag finnes verken katalogen (C1) eller reservevisningen (A1), og
   * skjemaet viser «Gjelder», regel-ID og fingeravtrykk. Testen er derfor
   * merket `fails`; A1 endrer den til `it`.
   */
  it.fails(
    'har ingen regel-ID, interne begreper eller svaret «Gjelder» der katalogen er kontrollert, og reservevisningen bare der den ikke er det (akseptansekriterium 2)',
    async () => {
      expect(await funn()).toEqual([])
    },
    60_000,
  )

  /**
   * Hvilke godkjente regler som står i reservevisningen, er en uttrykkelig
   * liste: settet av godkjente regler uten kontrollert katalog skal være
   * nøyaktig {@link VENTER_PA_KATALOGKONTROLL}. Testen blir rød både når en
   * ny godkjent regel mangler katalog, og når en regel får avtrykk uten at
   * listen krympes. Før C1 er slått sammen, finnes ikke katalogkontrollen, og
   * testen er merket `fails`; den blir en vanlig test av seg selv når modulen
   * finnes.
   */
  ;(KATALOGKONTROLL ? it : it.fails)(
    `de godkjente reglene uten kontrollert katalog er nøyaktig de som venter på katalogkontroll${KATALOGKONTROLL ? '' : ' (venter på C1)'} (akseptansekriterium 2)`,
    () => {
      const uten = GODKJENTE.filter((r) => !katalogGjelder(r)).map((r) => `${r.id} v${r.versjon}`)
      expect(uten.sort(), 'godkjente regler uten kontrollert katalog').toEqual([...VENTER_PA_KATALOGKONTROLL].sort())
    },
  )
})
