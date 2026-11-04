/**
 * Tråd B (B1) i `docs/verktøy-brukervennlighet-2026-11.md`: strukturerte
 * stoppkoder, formovergang i et forløp og praktisk belastning i dosevalget,
 * og invarianten S3: motorarbeidet endrer ingen plan verktøyet viser i dag.
 *
 * S3-fasiten (`__snapshots__/verktoy-s3-planer.json`) ble laget med motoren på
 * main før B1 og skal ikke oppdateres for å bli grønn: en endring der betyr
 * at en godkjent plan, et stopp eller et valg verktøyet tilbyr er endret.
 *
 * Alle doser er syntetiske; ingen pasientopplysninger.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { beregnPlan, type Planskjema } from '../verktoy/doseplan'
import { kjorKontrollkasus, KONTROLLFORSLAG, omfangsplaner } from '../verktoy/kontrollgrunnlag'
import { BESLUTNINGER, foretrukket, formForslag, kanBliKomplett, medAutomatiskeTrinnvalg } from '../verktoy/motor/automatikk'
import { beregnDoseplan, kliniskDoseplan, type Doseplanresultat, type Trinnvalg } from '../verktoy/motor/plan'
import { STOPPKODER, regelmotorkoder } from '../verktoy/motor/stoppkoder'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { fingeravtrykk } from '../verktoy/regler/godkjenning'
import { formkjede, formovergangsfeil, type Fase, type Grunnlag, type Regel, type Trinnvalgsvar } from '../verktoy/regler/modell'
import { besvartSkjema, kjorKasus, PILOTKASUS, simulerGodkjenning, tidFor, type Pilotkasus, type Pilotutfall } from '../verktoy/regler/pilotmatrise'
import { REGELSETT } from '../verktoy/tilgjengelighet'
import { FEST_TILLEGG, kjorTilleggskasus } from '../verktoy/tilleggsgrunnlag'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekkene = { pilot: JSON.parse(les(FEST_PILOT)) as Festuttrekk, aksept: JSON.parse(les(FEST_AKSEPTTEST)) as Festuttrekk }
const tillegg = JSON.parse(les(FEST_TILLEGG)) as Festuttrekk

/** Det klinikeren ser og kan velge: utfallet med radene eller grunnene, og dosene som tilbys for neste trinn. */
function kort(u: Pilotutfall & { resultat?: Doseplanresultat }) {
  const { resultat, ...utfall } = u as Pilotutfall & { resultat?: Doseplanresultat; tekst?: string; feil?: string[] }
  delete (utfall as { tekst?: string }).tekst
  const tilbys = resultat?.trinnvalg?.map((t) => `${t.forlop} trinn ${t.trinn} fra ${t.fra_mg} mg: ${t.doser.map((d) => `${d.mg} mg${d.dager !== undefined ? ` (${d.dager} d)` : ''}`).join(' | ')}`)
  return { ...utfall, ...(tilbys && { tilbys }) }
}

/** Alle utfall S3 gjelder: pilotmatrisen, K4-kasusene, kontrollkasusene og hver plan i det kliniske omfanget til reglene i kontrollgrunnlagene. */
function s3utfall() {
  const ut: Record<string, unknown> = {}
  for (const k of PILOTKASUS) ut[`pilot ${k.id}`] = kort(kjorKasus(k, uttrekkene))
  for (const { k, res } of kjorTilleggskasus(tillegg)) ut[`tillegg ${k.id}`] = kort(res)
  for (const f of KONTROLLFORSLAG) {
    for (const k of f.kasus) ut[`kontroll ${f.nr} ${k.id}`] = kort(kjorKontrollkasus(k, uttrekkene))
    for (const o of omfangsplaner(f, uttrekkene)) {
      for (const v of o.veier) ut[`omfang ${f.nr} ${o.regel.id} ${o.form ?? '-'} ${o.startdose_mg} mg [${v.valg.map((x) => x.valgt).join(',')}]`] = kort(v.utfall)
    }
  }
  return ut
}

describe('S3: motorarbeidet endrer ingen plan verktøyet viser', () => {
  it('gir nøyaktig de samme planene, stoppene og valgene som motoren på main før B1', async () => {
    await expect(JSON.stringify(s3utfall(), null, 1)).toMatchFileSnapshot('./__snapshots__/verktoy-s3-planer.json')
  }, 300_000)
})

/* --- Felles for testene under: escitalopram med endringer på en kopi ------------------ */

const ESC = 'seponering-escitalopram'
const TABLETT = '53'
const DRAPER = '748'
/** Et syntetisk grunnlag med en simulert avklaring, så kopien ikke har åpne valg; ingen faglig vurdering. */
const G: Grunnlag = {
  type: 'ousfar_vurdering',
  begrunnelse: 'Syntetisk test; ingen faglig vurdering.',
  henvisninger: [],
  avklaring: { dato: '2026-11-04', av: 'Simulert i testen', rolle: 'uavhengig_kontrollor', regelversjon: 13, merknad: 'Bare i testen; ingen avklaring.' },
}
type Motor = typeof kliniskDoseplan

interface Endring {
  samtidig?: boolean
  praktisk?: number
  automatisk?: boolean
  /** Tilfellet i det kliniske omfanget med tablett → dråper, og en simulert godkjenning av kopien. */
  godkjent?: boolean
}

/** Escitalopram med formovergang tablett → dråper og eventuelt praktisk dosering, automatisk dosevalg og en simulert godkjenning, på en kopi. */
const endret = (e: Endring) => (r: Regel) => {
  const f = r.plan.forlop[0]!
  f.formoverganger = [{ fra: TABLETT, til: DRAPER, ...(e.samtidig && { samtidig: true as const }), grunnlag: G }]
  if (e.praktisk) f.dosevalg = { ...f.dosevalg, praktisk: { draper: e.praktisk, grunnlag: G } }
  if (e.automatisk) (f.faser.at(-1) as Extract<Fase, { type: 'nedtrapping' }>).automatisk_trinnvalg = G
  if (e.godkjent) {
    r.klinisk_omfang = {
      ...r.klinisk_omfang!,
      tilfeller: [{ legemiddelformer: [TABLETT, DRAPER], startdoser: [10, 20], svar: {}, styrker: { fra: [1, 5, 10, 20] }, formstyrker: { [TABLETT]: [5, 10, 20], [DRAPER]: [1] } }],
    }
    simulerGodkjenning(r, { id: r.id, versjon: r.versjon, fingeravtrykk: fingeravtrykk(r) }, '2026-11-04')
  }
}

function kasus(dose: string, skjema: Partial<Planskjema>, e?: Endring): Pilotkasus {
  return {
    id: 'b1',
    kategori: 'vanlig_dose',
    hva: 'B1',
    verktoy: 'trappe-ned-antidepressiv',
    valg: { fra: { nokkel: 'escitalopram', formulering: 'standard' } },
    uttrekk: 'aksept',
    dose,
    skjema,
    regel: { id: ESC, ...(e && { endre: { hva: 'B1', endre: endret(e) } }) },
    forventet: { utfall: 'sperret' },
  }
}

const kjor = (dose: string, skjema: Partial<Planskjema>, e?: Endring, motor: Motor = beregnDoseplan) => kjorKasus(kasus(dose, skjema, e), uttrekkene, undefined, motor)

/** Rett til motoren, også når skjemaet ville bedt om et formvalg først. */
function direkte(dose: string, skjema: Partial<Planskjema>, e?: Endring, motor: Motor = beregnDoseplan): Doseplanresultat {
  const r = structuredClone(REGELSETT.regler.find((x) => x.id === ESC)!)
  if (e) endret(e)(r)
  const k = kasus(dose, skjema)
  return beregnPlan(r, k.valg, besvartSkjema(r, dose, skjema), uttrekkene.aksept.utvalg, tidFor(k, uttrekkene), REGELSETT, undefined, motor)
}

/** Planen når forskriveren ved hvert trinn som ikke kan gis nøyaktig, velger dosen `velg` gir (standard: den foretrukne). */
function fulgt(dose: string, skjema: Partial<Planskjema>, e?: Endring, motor: Motor = beregnDoseplan, velg: (t: Trinnvalg) => number = foretrukket): Doseplanresultat {
  let trinnvalg: Trinnvalgsvar[] = []
  for (let n = 0; n < 20; n++) {
    const r = kjor(dose, { ...skjema, trinnvalg }, e, motor).resultat!
    const t = r.trinnvalg?.find((x) => !x.mellomtrinn)
    if (!t) return r
    trinnvalg = [...trinnvalg, { forlop: t.forlop, trinn: t.trinn, fra_mg: t.fra_mg, mg: velg(t) }]
  }
  throw new Error('for mange valg')
}

const fra = (form: string) => ({ formvalg: { fra: { legemiddelform: form } } })
/** Formene hver periode bruker, som «53», «748» eller «53+748». */
const former = (r: Doseplanresultat) => (r.status === 'doseplan' ? r.forlop[0]!.perioder.map((p) => [...new Set(p.elementer.map((x) => x.preparater[0]!.legemiddelform!.kode))].sort().join('+')) : [])
const doser = (r: Doseplanresultat) => (r.status === 'doseplan' ? r.forlop[0]!.perioder.map((p) => p.mg) : [])
const draper = (r: Doseplanresultat) => (r.status === 'doseplan' ? r.forlop[0]!.perioder.map((p) => p.elementer.filter((x) => x.doseenhet === 'drape').reduce((s, x) => s + x.antall, 0)) : [])
/** Stadiet i overgangen tablett → dråper for hver periode: 0 tabletter, 1 begge, 2 dråper. */
const stadier = (r: Doseplanresultat) => former(r).map((f) => (f === TABLETT ? 0 : f === DRAPER ? 2 : 1))

/* --- Stoppkoder ----------------------------------------------------------------------- */

describe('Stoppkodene', () => {
  const resultater = [...PILOTKASUS.map((k) => kjorKasus(k, uttrekkene).resultat), ...KONTROLLFORSLAG.flatMap((f) => f.kasus.map((k) => kjorKontrollkasus(k, uttrekkene).resultat))].filter(
    (r): r is Doseplanresultat => !!r,
  )

  it('følger hver stoppgrunn og hver sperre, med nøyaktig de samme tekstene og bare kjente koder', () => {
    let n = 0
    for (const r of resultater) {
      const [tekst, koder] = r.status === 'stoppet' ? [r.stoppgrunner, r.stoppkoder] : [r.sperre, r.sperrekoder]
      expect(koder.map((k) => k.tekst)).toEqual(tekst)
      for (const k of koder) expect(Object.keys(STOPPKODER)).toContain(k.kode)
      n += koder.length
    }
    expect(n).toBeGreaterThan(100)
  })

  it('dekker stoppene i kasusene: sperre, ufullstendig plan, omfang, dose, unntak, bekreftelser, preparater og valg', () => {
    const sett = new Set(resultater.flatMap((r) => (r.status === 'stoppet' ? r.stoppkoder : r.sperrekoder).map((k) => k.kode)))
    for (const k of [
      'ikke_klinisk',
      'ikke_komplett',
      'utenfor_omfang',
      'dose_utenfor',
      'begrunnelse_trengs',
      'unntak_gjelder',
      'unntak_ukjent',
      'bekreftelse_mangler',
      'ingen_preparater',
      'godkjenningsfritak_trengs',
      'trinnvalg_trengs',
      'ingen_dose',
    ] as const)
      expect(sett, k).toContain(k)
  })

  it('kjenner igjen unntak, bekreftelser og spørsmål på regelens egen tekst og gir id-en', () => {
    const r = REGELSETT.regler.find((x) => x.id === ESC)!
    const [u, b, s] = [r.unntak[0]!, r.bekreftelser[0]!, r.sporsmal![0]!]
    const tekster = [`Regelen gjelder ikke: ${u.tekst}`, `Må avklares før beregning (ukjent): ${u.tekst}`, `Må bekreftes før beregning: ${b.tekst}`, `Må besvares før beregning: ${s.tekst}`]
    expect(regelmotorkoder(r, {}, tekster).map((k) => [k.kode, k.ref])).toEqual([
      ['unntak_gjelder', u.id],
      ['unntak_ukjent', u.id],
      ['bekreftelse_mangler', b.id],
      ['sporsmal_ubesvart', s.id],
    ])
    // En tekst som bare ligner, får ingen id.
    expect(regelmotorkoder(r, {}, [`Må besvares før beregning: ${s.tekst} (endret)`])).toEqual([{ kode: 'annet', tekst: `Må besvares før beregning: ${s.tekst} (endret)` }])
    expect(regelmotorkoder(r, {}, ['Startdosen 25 mg er utenfor det regelen gjelder for (høyst 20 mg).', 'Regelen er ugyldig: noe.']).map((k) => k.kode)).toEqual(['dose_utenfor', 'regelfeil'])
  })

  it('sier hvilket unntak, spørsmål eller forløp en stopp i appen gjelder', () => {
    const r = REGELSETT.regler.find((x) => x.id === ESC)!
    const u = r.unntak.find((x) => x.id === 'under_18')!
    const koder = (dose: string, skjema: Partial<Planskjema>) => {
      const x = direkte(dose, skjema, undefined, kliniskDoseplan)
      return x.status === 'stoppet' ? x.stoppkoder.map((k) => [k.kode, k.ref]) : x
    }
    expect(koder('10', { ...fra(DRAPER), pasientforhold: { [u.id]: true } })).toEqual([['unntak_gjelder', u.id]])
    // Uten form: et valg trengs i forløpet.
    expect(koder('10', {})).toEqual([['formvalg_trengs', 'fra']])
    // Med dråper og før forskriveren har valgt: et trinnvalg trengs.
    expect(koder('10', fra(DRAPER))).toEqual([['trinnvalg_trengs', 'fra']])
    // Med tabletter er 10 mg utenfor omfanget, og planen er ikke komplett.
    expect(koder('10', fra(TABLETT))).toContainEqual(['utenfor_omfang', undefined])
    // Et valg verktøyet ikke tilbyr: fra 3 mg tilbys bare det minste trinnet til 2 mg (K1-04), ikke 1 mg.
    const tre = fulgt('10', fra(DRAPER), undefined, kliniskDoseplan, (t) => (t.fra_mg === 3 ? 1 : foretrukket(t)))
    expect(tre.status === 'stoppet' && tre.stoppkoder.map((k) => k.kode)).toEqual(['valg_ugyldig'])
  })
})

/* --- Formovergang og praktisk dosering --------------------------------------------- */

describe('Formovergang tablett → dråper (B1)', () => {
  it('er en kjede fra formen pasienten bruker, og ugyldige overganger stopper beregningen', () => {
    const r = structuredClone(REGELSETT.regler.find((x) => x.id === ESC)!)
    endret({})(r)
    expect([formkjede(r.plan.forlop[0]!, TABLETT), formkjede(r.plan.forlop[0]!, DRAPER)]).toEqual([[TABLETT, DRAPER], [DRAPER]])
    expect(formovergangsfeil(r)).toEqual([])
    const med = (o: Regel['plan']['forlop'][0]['formoverganger']) => formovergangsfeil({ ...r, plan: { ...r.plan, forlop: [{ ...r.plan.forlop[0]!, formoverganger: o }] } })
    expect(
      med([
        { fra: TABLETT, til: DRAPER, grunnlag: G },
        { fra: DRAPER, til: TABLETT, grunnlag: G },
      ]),
    ).toContain('fra: formovergangene går i sløyfe')
    expect(
      med([
        { fra: TABLETT, til: DRAPER, grunnlag: G },
        { fra: TABLETT, til: '5', grunnlag: G },
      ]),
    ).toContain('fra: formovergangene forgrener seg')
    expect(med([{ fra: TABLETT, til: TABLETT, grunnlag: G }])).toContain('fra: en formovergang må gå mellom to ulike former')
    expect(formovergangsfeil({ ...r, klinisk_omfang: { ...r.klinisk_omfang!, tilfeller: [{ legemiddelformer: [DRAPER, TABLETT], startdoser: [10], svar: {} }] } })).toEqual([
      'klinisk_omfang.tilfeller[0]: formene følger ingen formovergang i regelen',
    ])
    const ugyldig = kjor('10', fra(TABLETT), {}, beregnDoseplan)
    expect(ugyldig.resultat?.status).toBe('stoppet')
    const sloyfe = kjorKasus(
      {
        ...kasus('10', fra(TABLETT)),
        regel: {
          id: ESC,
          endre: {
            hva: 'sløyfe',
            endre: (x) =>
              void (x.plan.forlop[0]!.formoverganger = [
                { fra: TABLETT, til: DRAPER, grunnlag: G },
                { fra: DRAPER, til: TABLETT, grunnlag: G },
              ]),
          },
        },
      },
      uttrekkene,
      undefined,
      beregnDoseplan,
    )
    expect(sloyfe.resultat?.status === 'stoppet' && sloyfe.resultat.stoppkoder.map((k) => k.kode)).toEqual(['regelfeil', 'regelfeil'])
  })

  it('går fra tabletter til dråper i samme plan, med én form per dose og aldri tilbake', () => {
    const r = fulgt('20', fra(TABLETT), { praktisk: 5 })
    expect(r.status).toBe('doseplan')
    // Dosene er de samme som med dråper i versjon 13 (K1-02); bare 15 mg kan gis med hele tabletter.
    expect(doser(r)).toEqual([15, 12, 9, 7, 6, 5, 4, 3, 2, 1])
    expect(former(r)).toEqual([TABLETT, ...Array(9).fill(DRAPER)])
    expect(r.status === 'doseplan' && r.forlop[0]!.siste_dosedag).not.toBeNull()
  })

  it('kombinerer en tablett og noen dråper i samme dose bare når regelen tillater det, og holder dråpene innenfor preferansen da', () => {
    const r = fulgt('20', fra(TABLETT), { samtidig: true, praktisk: 5 })
    expect(doser(r)).toEqual([15, 12, 9, 7, 6, 5, 4, 3, 2, 1])
    // 12 mg = én tablett à 10 mg og 2 dråper, …; fra 5 mg bare dråper, for planen går aldri tilbake til bare tabletter.
    expect(former(r)).toEqual([TABLETT, ...Array(4).fill(`${TABLETT}+${DRAPER}`), ...Array(5).fill(DRAPER)])
    expect(draper(r)).toEqual([0, 2, 4, 2, 1, 5, 4, 3, 2, 1])
    const s = stadier(r)
    expect(s).toEqual([...s].sort((a, b) => a - b))
  })

  it('bruker bare dråper når pasienten allerede bruker dråper', () => {
    const r = fulgt('20', fra(DRAPER), { samtidig: true, praktisk: 5 })
    expect(new Set(former(r))).toEqual(new Set([DRAPER]))
  })

  it('krever fortsatt at formen pasienten bruker oppgis', () => {
    const r = direkte('20', {}, { praktisk: 5 })
    expect(r.status === 'stoppet' && r.stoppkoder.map((k) => k.kode)).toEqual(['formvalg_trengs'])
  })

  it('regner dråper som én måling uten praktisk dosering, så 15 mg blir 15 dråper; med preferansen 5 blir det tabletter', () => {
    expect(draper(fulgt('20', fra(TABLETT), {}))[0]).toBe(15)
    expect(former(fulgt('20', fra(TABLETT), { praktisk: 5 }))[0]).toBe(TABLETT)
  })

  it('bruker preferansen som en preferanse, ikke en grense: flere dråper gis når ingenting enklere gir dosen', () => {
    expect(Math.max(...draper(fulgt('20', fra(TABLETT), { praktisk: 5 })))).toBe(12)
    // Fra 10 mg tabletter uten samtidig bruk kan ingen tablett gi 8 mg, så planen går over til 8 dråper allerede i første trinn.
    expect(draper(fulgt('10', fra(TABLETT), { praktisk: 5 }))).toEqual([8, 6, 5, 4, 3, 2, 1])
    // Med samtidig bruk: 8 mg = én tablett à 5 mg og 3 dråper, 6 mg = 5 mg og 1 dråpe, så bare dråper.
    const s = fulgt('10', fra(TABLETT), { samtidig: true, praktisk: 5 })
    expect(doser(s)).toEqual([8, 6, 5, 4, 3, 2, 1])
    expect(draper(s)).toEqual([3, 1, 5, 4, 3, 2, 1])
  })
})

describe('Klinisk omfang med flere former', () => {
  it('gjelder bare planer som starter i den første formen', () => {
    const tablett = fulgt('20', fra(TABLETT), { praktisk: 5, godkjent: true }, kliniskDoseplan)
    expect(tablett.status === 'doseplan' && tablett.klinisk).toBe(true)
    const draper = fulgt('20', fra(DRAPER), { praktisk: 5, godkjent: true }, kliniskDoseplan)
    expect(draper.status === 'stoppet' && draper.stoppkoder.map((k) => k.kode)).toContain('utenfor_omfang')
  })
})

/* --- B3 og B4 ----------------------------------------------------------------------- */

describe('Automatisk dosevalg (B3) og formvalg (B4), forberedt men ikke i bruk', () => {
  it('B4 er ikke akseptert, og ingen regel i appen har automatisk dosevalg', () => {
    expect(BESLUTNINGER.B4).toBe(false)
    const automatiske = REGELSETT.regler.flatMap((r) => r.plan.forlop.flatMap((f) => f.faser.filter((x) => x.type === 'nedtrapping' && x.automatisk_trinnvalg)))
    expect(automatiske).toEqual([])
  })

  it('B3: uten feltet i regelen er resultatet nøyaktig planen motoren gir', () => {
    const motor: Motor = (...a) => medAutomatiskeTrinnvalg(...a).resultat
    expect(kjor('10', fra(DRAPER), undefined, motor).resultat).toEqual(kjor('10', fra(DRAPER), undefined, kliniskDoseplan).resultat)
  })

  it('B3: med feltet velger verktøyet den foretrukne dosen ved hvert trinn og gir en komplett plan uten valg fra forskriveren', () => {
    let automatiske: ReturnType<typeof medAutomatiskeTrinnvalg>['automatiske'] = []
    const motor: Motor = (...a) => {
      const x = medAutomatiskeTrinnvalg(...a)
      automatiske = x.automatiske
      return x.resultat
    }
    const r = kjor('20', fra(TABLETT), { praktisk: 5, automatisk: true, godkjent: true }, motor).resultat!
    expect(r.status === 'doseplan' && r.klinisk).toBe(true)
    expect(doser(r)).toEqual(doser(fulgt('20', fra(TABLETT), { praktisk: 5, godkjent: true }, kliniskDoseplan)))
    expect(automatiske.length).toBeGreaterThan(0)
    for (const v of automatiske) expect(v.alternativer).not.toContain(v.mg)
  })

  it('foretrekker dosen nærmest den beregnede, og ved likt den høyeste', () => {
    const t = (beregnet_mg: number, ...mg: number[]) => ({ beregnet_mg, doser: mg.map((x) => ({ mg: x })) }) as unknown as Trinnvalg
    expect(foretrukket(t(7.5, 7, 8))).toBe(8)
    expect(foretrukket(t(11.25, 11, 12))).toBe(11)
    expect(foretrukket(t(2.25, 2))).toBe(2)
  })

  it('B4: velger dråper selv for escitalopram 10 mg når bare dråper kan gi en komplett plan, men bare når beslutningen er akseptert', () => {
    let forslag: [ReturnType<typeof formForslag>, ReturnType<typeof formForslag>] = [null, null]
    const motor: Motor = (...a) => {
      forslag = [formForslag(...a), formForslag(...a, { aktiv: true })]
      return kliniskDoseplan(...a)
    }
    direkte('10', {}, undefined, motor)
    expect(forslag[0]).toBeNull()
    expect(forslag[1]).toMatchObject({ forlop: 'fra', legemiddelform: DRAPER })
    expect(forslag[1]!.grunn).toMatch(/^Bare .* gir en komplett plan innenfor det som er godkjent, så verktøyet har valgt den\.$/)
  })

  it('kanBliKomplett svarer nei for tabletter og ja for dråper, med valgene som gir planen', () => {
    let svar: ReturnType<typeof kanBliKomplett>[] = []
    const motor: Motor = (regel, inndata, ...rest) => {
      svar = [TABLETT, DRAPER].map((f) => kanBliKomplett(regel, { ...inndata, formvalg: { fra: { legemiddelformer: [f] } } }, ...rest))
      return kliniskDoseplan(regel, inndata, ...rest)
    }
    direkte('10', {}, undefined, motor)
    expect(svar[0]).toEqual({ svar: 'nei' })
    expect(svar[1]).toMatchObject({ svar: 'ja' })
  })
})
