/**
 * Ende-til-ende-testmatrisen for de klinisk godkjente reglene i P11.1–P11.4
 * (`src/verktoy/regler/pilotmatrise.ts`, `docs/verktøy-p11-testmatrise.md`):
 * hvert syntetiske kasus går den samme veien som verktøysiden og gir nøyaktig
 * utfallet det forventer; hver godkjent regel og hver kategori i P11.1 er
 * prøvd; og rapporten er oppdatert.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { gjelderFortsatt } from '../verktoy/doseplan'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { erKliniskGodkjent } from '../verktoy/regler/godkjenning'
import { avvikFra, KATEGORIER, kjorKasus, lagPilotmatriserapport, PILOTKASUS, PILOTMATRISEFIL, tidFor, type Kasuskategori } from '../verktoy/regler/pilotmatrise'
import { REGELSETT } from '../verktoy/tilgjengelighet'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekkene = { pilot: JSON.parse(les(FEST_PILOT)) as Festuttrekk, aksept: JSON.parse(les(FEST_AKSEPTTEST)) as Festuttrekk }
const kasus = (id: string) => PILOTKASUS.find((k) => k.id === id)!

describe('testmatrisen for de godkjente reglene (P11.1–P11.4)', () => {
  it.each(PILOTKASUS.map((k) => [`${k.id} ${k.hva}`, k] as const))('%s', (_navn, k) => {
    expect(avvikFra(k, kjorKasus(k, uttrekkene))).toEqual([])
  })

  it('har unike kasus, og ingen kasus endrer uttrekkene eller reglene de deler', () => {
    expect(new Set(PILOTKASUS.map((k) => k.id)).size).toBe(PILOTKASUS.length)
    const for_ = JSON.stringify(uttrekkene)
    const regler = JSON.stringify(REGELSETT.regler)
    for (const k of PILOTKASUS) kjorKasus(k, uttrekkene)
    expect(JSON.stringify(uttrekkene)).toBe(for_)
    expect(JSON.stringify(REGELSETT.regler)).toBe(regler)
  })

  it('prøver hver godkjent regel, og hver beregnbar regel i hver kategori fra P11.1', () => {
    const godkjente = REGELSETT.regler.filter(erKliniskGodkjent)
    const prøvd = new Set(PILOTKASUS.flatMap((k) => (k.regel ? [] : [kjorKasus(k, uttrekkene)]).flatMap((u) => ('resultat' in u && u.resultat ? [u.resultat.regel.id] : u.utfall === 'fagtekst' ? u.regler.map((r) => r.split(' ')[0]!) : []))))
    expect([...prøvd].sort()).toEqual(godkjente.map((r) => r.id).sort())
    const kategorier: Record<string, Kasuskategori[]> = {
      V: ['vanlig_dose', 'uvanlig_dose', 'pasientforhold', 'interaksjon', 'preparat', 'foreldet_fest', 'datakilde', 'injeksjonsdato', 'regelendring', 'ikke_godkjent', 'nodstopp'],
      S: ['vanlig_dose', 'uvanlig_dose', 'pasientforhold', 'interaksjon', 'preparat', 'foreldet_fest', 'injeksjonsdato', 'regelendring', 'nodstopp'],
      M: ['vanlig_dose', 'uvanlig_dose', 'pasientforhold', 'interaksjon', 'preparat', 'foreldet_fest', 'injeksjonsdato', 'nodstopp'],
      X: ['vanlig_dose', 'uvanlig_dose', 'pasientforhold', 'preparat', 'foreldet_fest', 'injeksjonsdato', 'regelendring', 'nodstopp'],
    }
    for (const [prefiks, liste] of Object.entries(kategorier)) {
      const har = new Set(PILOTKASUS.filter((k) => k.id.startsWith(prefiks)).map((k) => k.kategori))
      for (const kat of liste) expect(har.has(kat), `${prefiks}: ${kat}`).toBe(true)
    }
    for (const kat of Object.keys(KATEGORIER)) expect(PILOTKASUS.some((k) => k.kategori === kat), kat).toBe(true)
  })

  it('gir en plan bare etter en godkjent regel, og bare med et fersk FEST-uttrekk', () => {
    for (const k of PILOTKASUS) {
      const u = kjorKasus(k, uttrekkene)
      if (u.utfall !== 'plan') continue
      const r = REGELSETT.regler.find((x) => x.id === u.resultat!.regel.id)!
      expect(erKliniskGodkjent(r), k.id).toBe(true)
      expect(k.regel, k.id).toBeUndefined()
      expect(k.timer ?? 0, k.id).toBeLessThan(48)
      expect(u.resultat, k.id).toMatchObject({ status: 'doseplan', klinisk: true, sperre: [] })
    }
  })

  it('tar bort en plan som står når FEST-kopien blir foreldet eller dagen skifter', () => {
    const u = kjorKasus(kasus('V25'), uttrekkene)
    expect(u.utfall).toBe('plan')
    const naa = tidFor(kasus('V25'), uttrekkene)
    expect(gjelderFortsatt(u.resultat!, naa)).toBe(true)
    // To timer senere er kopien eldre enn 48 timer.
    expect(gjelderFortsatt(u.resultat!, new Date(naa.getTime() + 2 * 3_600_000))).toBe(false)
    // En plan beregnet kl. 22.30 norsk tid gjelder ikke etter midnatt, fordi preparatstatusen gjelder én dag.
    const kveld = { ...kasus('V01'), timer: 17.25 }
    const plan = kjorKasus(kveld, uttrekkene).resultat!
    const tid = tidFor(kveld, uttrekkene)
    expect(gjelderFortsatt(plan, new Date(tid.getTime() + 3_600_000))).toBe(true)
    expect(gjelderFortsatt(plan, new Date(tid.getTime() + 2 * 3_600_000))).toBe(false)
  })

  it('har en oppdatert rapport', () => {
    expect(les(PILOTMATRISEFIL), 'Kjør `npm run verktoy:regler -- pilotmatrise`').toBe(lagPilotmatriserapport(uttrekkene))
  })
})
