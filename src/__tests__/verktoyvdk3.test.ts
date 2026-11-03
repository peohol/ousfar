/**
 * VDK-3, forslag 1: kontrollgrunnlaget for de fire nedtrappingsreglene
 * (`src/verktoy/kontrollgrunnlag.ts`,
 * `docs/verktøy-vdk3-forslag1-kontrollgrunnlag.md`). Kasusene skal gi det de
 * forventer gjennom samme vei som verktøysiden, ingen regel skal bli godkjent
 * eller tilgjengelig av grunnlaget, og den simulerte godkjenningen skal bare
 * finnes på kopier.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  FORSLAG_1,
  godkjenningshindringer,
  kjorKontrollkasus,
  KONTROLLFORSLAG,
  kontrollavvik,
  lagKontrollgrunnlag,
  omfangsplaner,
  SIMULERT_KONTROLLOR,
} from '../verktoy/kontrollgrunnlag'
import { VERKTOY } from '../verktoy/register'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { erKliniskGodkjent, fingeravtrykk, kontrollutfall } from '../verktoy/regler/godkjenning'
import { FAKTUMRETTELSER } from '../verktoy/regler/bygg'
import { NEDTRAPPINGSDISPOSISJON } from '../verktoy/regler/nedtrapping'
import { tilgjengelighet } from '../verktoy/tilgjengelighet'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekkene = { pilot: JSON.parse(les(FEST_PILOT)) as Festuttrekk, aksept: JSON.parse(les(FEST_AKSEPTTEST)) as Festuttrekk }
/** Forslag 1 gjelder versjonene etter rettelsen; K1 har siden gitt tre av dem en ny versjon i appen (`regler/komplettplan.ts`). */
const regel = (id: string) => FORSLAG_1.settene!.flatMap((s) => s.regler).find((r) => r.id === id)!
const PLANER = omfangsplaner(FORSLAG_1, uttrekkene)

describe('Regelversjonene til kontroll', () => {
  it('er de fire i VDK-2-planen, i versjonen etter rettelsen av RCPsych-faktumet, som kontrolløren vurderte 03.11.2026; versjonen før ble vurdert 31.10.2026', () => {
    const plan = les('docs/verktøy-vdk2-prioritering.md')
    const rettelsen = FAKTUMRETTELSER[0]!.kontroll!.disposisjon
    expect(FORSLAG_1.regler.map((k) => k.id)).toEqual(['seponering-amitriptylin', 'seponering-nortriptylin', 'seponering-escitalopram', 'seponering-escitalopram-langsom'])
    for (const k of FORSLAG_1.regler) {
      const r = regel(k.id)
      expect(r.versjon, k.id).toBe(k.versjon)
      expect(fingeravtrykk(r), `${k.id} er endret; kontrollgrunnlaget gjelder ikke lenger`).toBe(k.fingeravtrykk)
      expect(rettelsen.regler[k.id]).toMatchObject({ versjon: k.versjon, fingeravtrykk: k.fingeravtrykk })
      expect(r.godkjenning.historikk.at(-1), k.id).toMatchObject({ status: 'ikke_godkjent', dato: '2026-11-03', regelversjon: k.versjon, fingeravtrykk: k.fingeravtrykk })
      // Versjonen før rettelsen, som bare skiller seg i faktumet, ble vurdert 31.10.2026, og den vurderingen står i historikken.
      const vurdert = NEDTRAPPINGSDISPOSISJON.regler[k.id]!
      expect(vurdert.versjon, k.id).toBe(k.versjon - 1)
      expect(r.godkjenning.historikk, k.id).toContainEqual(expect.objectContaining({ status: 'ikke_godkjent', dato: '2026-10-31', regelversjon: vurdert.versjon, fingeravtrykk: vurdert.fingeravtrykk }))
      expect(plan).toContain(`| \`${k.id}\` | ${k.versjon} | \`${k.fingeravtrykk}\` |`)
    }
  })

  it('er ikke godkjent, og verktøyet tilbyr ingen beregning for dem', () => {
    const verktoy = VERKTOY.find((v) => v.id === FORSLAG_1.verktoy)!
    for (const k of FORSLAG_1.regler) {
      const r = regel(k.id)
      expect(erKliniskGodkjent(r), k.id).toBe(false)
      expect(kontrollutfall(r), k.id).toBe('ikke_godkjent')
      expect(r.godkjenning.historikk.some((s) => s.av === SIMULERT_KONTROLLOR), k.id).toBe(false)
      const t = tilgjengelighet(verktoy, { fra: { nokkel: r.fra!.type === 'virkestoff' ? r.fra!.nokkel : '', formulering: 'standard' } })
      // Appen bruker K1-versjonene, til faglig kontroll; heller ikke de gir en beregning.
      expect(t.status, k.id).toBe('til_kontroll')
    }
  })

  it('har ingen tekniske hindringer for en godkjenning av nøyaktig versjonen, men en endret versjon kan ikke godkjennes', () => {
    for (const k of FORSLAG_1.regler) {
      expect(godkjenningshindringer(k, FORSLAG_1.dato, FORSLAG_1.settene), k.id).toEqual([])
      expect(godkjenningshindringer({ ...k, fingeravtrykk: '0'.repeat(64) }, FORSLAG_1.dato, FORSLAG_1.settene).length, k.id).toBeGreaterThan(0)
      expect(godkjenningshindringer({ ...k, versjon: k.versjon + 1 }, FORSLAG_1.dato, FORSLAG_1.settene).length, k.id).toBeGreaterThan(0)
    }
  })
})

describe('Alle planer i det kliniske omfanget', () => {
  it('dekker hver startdose i hvert tilfelle i omfanget', () => {
    const tilfeller = FORSLAG_1.regler.flatMap((k) => regel(k.id).klinisk_omfang!.tilfeller.flatMap((t) => t.startdoser.map((mg) => `${k.id} ${t.legemiddelform} ${JSON.stringify(t.svar)} ${mg}`)))
    expect(PLANER.map((o) => `${o.regel.id} ${o.tilfelle.legemiddelform} ${JSON.stringify(o.tilfelle.svar)} ${o.startdose_mg}`)).toEqual(tilfeller)
    expect(PLANER).toHaveLength(17)
  })

  it('gir en plan i hvert tilfelle når regelen er godkjent, og hvert valg er en dose innenfor det foretrukne området', () => {
    for (const o of PLANER) {
      for (const v of o.veier) {
        expect(v.utfall.utfall, `${o.regel.id} ${o.startdose_mg} mg`).toBe('plan')
        for (const x of v.valg) {
          const d = x.trinn.doser.find((y) => y.mg === x.valgt)!
          expect(d.prosent).toBeGreaterThanOrEqual(x.trinn.omrade![0])
          expect(d.prosent).toBeLessThanOrEqual(x.trinn.omrade![1] + 1e-9)
        }
      }
    }
  })

  it('tilbyr nøyaktig én dose ved hvert valg, så hver startdose gir én plan', () => {
    expect(PLANER.every((o) => o.veier.length === 1)).toBe(true)
    expect(PLANER.flatMap((o) => o.veier.flatMap((v) => v.valg)).every((x) => x.trinn.doser.length === 1)).toBe(true)
  })

  it('går aldri til null og stopper ved 20 mg (amitriptylin og nortriptylin, kort), 3 mg og 9 mg (escitalopram dråper)', () => {
    const siste = (id: string, mg: number, lang: boolean, form?: string) => {
      const o = PLANER.find((x) => x.regel.id === id && x.startdose_mg === mg && !!x.tilfelle.svar.lang_behandlingstid === lang && (!form || x.form === form))!
      const u = o.veier[0]!.utfall
      return u.utfall === 'plan' ? u.linjer.at(-1) : undefined
    }
    for (const id of ['seponering-amitriptylin', 'seponering-nortriptylin']) for (const mg of [50, 150]) expect(siste(id, mg, false)).toMatch(/: 20 mg = 2 tabletter à 10 mg/)
    expect(siste('seponering-escitalopram', 20, false, '748')).toBe('Fra dag 197: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg')
    expect(siste('seponering-escitalopram', 20, true, '748')).toBe('Fra dag 253: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg')
  })
})

describe('De syntetiske testkasusene', () => {
  it.each(FORSLAG_1.kasus.map((k) => [`${k.id}: ${k.hva}`, k] as const))('%s', (_, k) => {
    expect(kontrollavvik(k, uttrekkene)).toEqual([])
  })

  it('har unike id-er og gjør hvert testkasus i VDK-2-planen (K1-01–K1-15) til en test', () => {
    const ider = FORSLAG_1.kasus.map((k) => k.id)
    expect(new Set(ider).size).toBe(ider.length)
    expect(FORSLAG_1.kasus.flatMap((k) => (k.ref ? [k.ref] : [])).sort()).toEqual(Array.from({ length: 15 }, (_, i) => `K1-${String(i + 1).padStart(2, '0')}`))
  })

  it('prøver hver regel i forslaget både med og uten plan', () => {
    for (const k of FORSLAG_1.regler) {
      const utfall = FORSLAG_1.kasus.filter((x) => x.regel?.id === k.id).map((x) => x.forventet.utfall)
      expect(utfall, k.id).toContain('plan')
      expect(utfall, k.id).toContain('stopp')
    }
  })

  it('avviser et valg verktøyet ikke tilbyr', () => {
    const k = FORSLAG_1.kasus.find((x) => x.id === 'F1-01')!
    expect(kjorKontrollkasus({ ...k, velger: [35] }, uttrekkene).feil).toEqual(['35 mg tilbys ikke (tilbys: 40 mg).'])
  })

  it('endrer ikke reglene i regelsettet', () => {
    for (const k of FORSLAG_1.regler) expect(erKliniskGodkjent(regel(k.id)), k.id).toBe(false)
  })
})

describe('Kontrollgrunnlaget', () => {
  it('er oppdatert', () => {
    for (const f of KONTROLLFORSLAG) expect(les(f.fil), 'Kjør `npm run verktoy:regler -- kontrollgrunnlag`').toBe(lagKontrollgrunnlag(f, uttrekkene))
  })

  it('sier at ingen regel er godkjent, viser ingen tekst eller lenker fra Psychiatrienet, og har ingen avvik', () => {
    const tekst = les(FORSLAG_1.fil)
    expect(tekst).toContain('**Ingen regel er godkjent eller aktivert, og denne PR-en endrer ingen regel.**')
    expect(tekst).toContain('er ingen klinisk godkjenning av forslag 1 eller av spørsmålene 1.1–1.7')
    expect(tekst).not.toMatch(/psychiatrienet\.(nl|org|com)/i)
    expect(tekst).not.toContain('**avvik:**')
    expect(tekst).not.toContain('**nei**')
  })

  it('brukes bare av skriptet og testene, aldri av appen', () => {
    const filer = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? filer(join(dir, f)) : [join(dir, f)]))
    const src = new URL('../', import.meta.url).pathname
    const brukere = filer(src).filter((f) => !f.includes('__tests__') && /\.tsx?$/.test(f) && /from '[./]+(verktoy\/)?kontrollgrunnlag'/.test(readFileSync(f, 'utf8')))
    expect(brukere).toEqual([])
  })
})
