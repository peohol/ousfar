/**
 * K1 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`: escitalopram,
 * nortriptylin, amitriptylin og sertralin krever en komplett plan helt til
 * seponering (`src/verktoy/regler/komplettplan.ts`), og kontrollgrunnlaget
 * (`docs/verktøy-k1-nedtrapping-kontrollgrunnlag.md`). Kontrollen av PR #323
 * avviste seponering fra laveste døgndose i preparatomtalen og delplaner som
 * klinisk produkt. Testene viser at de nye versjonene er til faglig kontroll,
 * at ingen grense eller avslutning med seponering finnes, at ingen plan i
 * omfanget viser doser uten å være komplett, og at de andre reglene er uendret.
 *
 * Alle doser er syntetiske; ingen pasientopplysninger.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { FORSLAG_K1, KONTROLLFORSLAG, kontrollavvik, lagKontrollgrunnlag, omfangsplaner } from '../verktoy/kontrollgrunnlag'
import { KOMPLETT_IKKE_TILGJENGELIG } from '../verktoy/motor/plan'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { K1_REGLER, medKravOmKomplett, medKravOmKomplettPlan } from '../verktoy/regler/komplettplan'
import { erKliniskGodkjent, fingeravtrykk } from '../verktoy/regler/godkjenning'
import { apneValg, avslutningFor, type Regel } from '../verktoy/regler/modell'
import { kontrollerRegelsett } from '../verktoy/regler/kontroll'
import { NEDTRAPPINGSSETT, NEDTRAPPINGSSETT_FOR_K1 } from '../verktoy/regler/nedtrapping'
import { REGELSETT } from '../verktoy/tilgjengelighet'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekkene = { pilot: JSON.parse(les(FEST_PILOT)) as Festuttrekk, aksept: JSON.parse(les(FEST_AKSEPTTEST)) as Festuttrekk }
const i = (sett: { regler: Regel[] }, id: string) => sett.regler.find((r) => r.id === id)!
const K1 = K1_REGLER.map((k) => k.regel)
const uten = <T extends object, K extends keyof T>(x: T, ...nokler: K[]) => Object.fromEntries(Object.entries(x).filter(([n]) => !nokler.includes(n as K)))

describe('De nye regelversjonene', () => {
  it('er escitalopram, nortriptylin, amitriptylin og sertralin, én versjon over versjonen før, til faglig kontroll og ikke godkjent', () => {
    expect(K1).toEqual(['seponering-escitalopram', 'seponering-nortriptylin', 'seponering-amitriptylin', 'seponering-sertralin'])
    expect(NEDTRAPPINGSSETT.versjon).toBe(NEDTRAPPINGSSETT_FOR_K1.versjon + 1)
    for (const k of K1_REGLER) {
      const for_ = i(NEDTRAPPINGSSETT_FOR_K1, k.regel)
      const ny = i(NEDTRAPPINGSSETT, k.regel)
      expect(for_.versjon, k.regel).toBe(k.fra_versjon)
      expect(ny.versjon, k.regel).toBe(k.fra_versjon + 1)
      expect(ny.godkjenning.status, k.regel).toBe('til_faglig_kontroll')
      expect(ny.godkjenning.historikk.slice(-2).map((s) => [s.status, s.regelversjon, s.rolle]), k.regel).toEqual([
        ['utkast', ny.versjon, 'utvikler'],
        ['til_faglig_kontroll', ny.versjon, 'utvikler'],
      ])
      expect(erKliniskGodkjent(ny), k.regel).toBe(false)
      expect(apneValg(ny), k.regel).toEqual([])
    }
  })

  it('krever en komplett plan, uten avslutning med seponering, grense eller vurderingspunkter; ellers som versjonen før', () => {
    for (const id of K1) {
      const for_ = i(NEDTRAPPINGSSETT_FOR_K1, id)
      const ny = i(NEDTRAPPINGSSETT, id)
      const [forste, ...resten] = ny.plan.forlop
      expect(forste!.krever_komplett, id).toBe(true)
      expect(uten(forste!, 'krever_komplett'), id).toEqual(for_.plan.forlop[0])
      expect(resten, id).toEqual(for_.plan.forlop.slice(1))
      expect(forste!.vurderinger, id).toBeUndefined()
      expect(forste!.faser.map((f) => avslutningFor(f)?.type), id).not.toContain('seponering')
      expect(uten(ny, 'versjon', 'plan', 'fortolkning', 'godkjenning'), id).toEqual(uten(for_, 'versjon', 'plan', 'fortolkning', 'godkjenning'))
      expect(ny.eksempler, id).toEqual(for_.eksempler)
      expect(ny.fortolkning.kildetro, id).toEqual(for_.fortolkning.kildetro)
      expect(ny.fortolkning.tilpasninger.slice(0, -1), id).toEqual(for_.fortolkning.tilpasninger)
      expect(ny.fortolkning.usikkerhet.at(-1), id).toMatch(/^Lave doser med norske preparater: .+ Ingen kilde eller faglig beslutning gir i dag en sluttdose, så regelen gir ingen komplett plan\.$/)
      // Grensen fra preparatomtalen, som kontrollen avviste og Peder trakk tilbake, finnes ikke.
      expect(JSON.stringify(ny), id).not.toMatch(/fra_hoyst_mg|faglig_beslutningstaker/)
    }
  })

  it('består kontrollene i regelsettet appen bruker', () => {
    expect(kontrollerRegelsett(NEDTRAPPINGSSETT)).toEqual([])
  })

  it('er nøyaktig versjonene og fingeravtrykkene i kontrollgrunnlaget', () => {
    expect(FORSLAG_K1.regler.map((k) => k.id).sort()).toEqual([...K1].sort())
    for (const k of FORSLAG_K1.regler) {
      const r = i(REGELSETT, k.id)
      expect([r.versjon, fingeravtrykk(r)], `${k.id} er endret; kontrollgrunnlaget gjelder ikke lenger`).toEqual([k.versjon, k.fingeravtrykk])
    }
  })

  it('endrer ingen andre regler: de har samme versjon og fingeravtrykk, også de godkjente og de langsomme variantene', () => {
    for (const r of NEDTRAPPINGSSETT.regler.filter((x) => !K1.includes(x.id))) {
      const for_ = i(NEDTRAPPINGSSETT_FOR_K1, r.id)
      expect([r.versjon, fingeravtrykk(r)], r.id).toEqual([for_.versjon, fingeravtrykk(for_)])
      expect(r.plan.forlop.some((f) => f.krever_komplett), r.id).toBe(false)
    }
    // De godkjente reglene, med fingeravtrykkene kontrolløren godkjente.
    expect(fingeravtrykk(i(NEDTRAPPINGSSETT, 'seponering-vortioksetin'))).toBe('b28dec93f5ede06c6565e1ce5d6aa62606c69250f1a9088dae0c57d3121101f3')
    expect(fingeravtrykk(i(NEDTRAPPINGSSETT, 'seponering-bupropion'))).toBe('e7536668ac7f2d4dfd9959f24cfdfc4874182a4fc295355f0d10a05f438b5f5f')
    expect(fingeravtrykk(i(NEDTRAPPINGSSETT, 'seponering-agomelatin'))).toBe('6d42863f3573fb2e0d6dbffd27ff78a7f1c2b539c8dce2cfcd36ad417b61a2d1')
  })

  it('bygger bare på nøyaktig versjonen kravet gjelder, og bare på en nedtrapping', () => {
    const esc = i(NEDTRAPPINGSSETT_FOR_K1, 'seponering-escitalopram')
    const k = K1_REGLER[0]!
    expect(() => medKravOmKomplett({ ...esc, versjon: esc.versjon + 1 }, k)).toThrow(/bygger på versjon 12/)
    expect(() => medKravOmKomplett(esc, { ...k, regel: 'seponering-sertralin' })).toThrow(/gjelder seponering-sertralin, ikke seponering-escitalopram/)
    const utenNedtrapping = structuredClone(esc)
    utenNedtrapping.plan.forlop[0]!.faser = []
    expect(() => medKravOmKomplett(utenNedtrapping, k)).toThrow(/nedtrapping som siste fase/)
    expect(() => medKravOmKomplettPlan([esc], [{ ...k, regel: 'seponering-finnes-ikke' }])).toThrow(/ukjente regler: seponering-finnes-ikke/)
  })
})

describe('Kontrollgrunnlaget', () => {
  it('er oppdatert og er et av kontrollforslagene', () => {
    expect(KONTROLLFORSLAG).toContain(FORSLAG_K1)
    expect(les(FORSLAG_K1.fil), 'Kjør `npm run verktoy:regler -- kontrollgrunnlag`').toBe(lagKontrollgrunnlag(FORSLAG_K1, uttrekkene))
  })

  it.each(FORSLAG_K1.kasus.map((k) => [`${k.id}: ${k.hva}`, k] as const))('%s', (_, k) => {
    expect(kontrollavvik(k, uttrekkene)).toEqual([])
  })

  it('har unike id-er, svarer på K0-01–K0-03 og prøver hver regel med «komplett plan ikke tilgjengelig», stopp og uten godkjenning', () => {
    const ider = FORSLAG_K1.kasus.map((k) => k.id)
    expect(new Set(ider).size).toBe(ider.length)
    expect([...new Set(FORSLAG_K1.kasus.flatMap((k) => (k.ref ? [k.ref] : [])))].sort()).toEqual(['K0-01', 'K0-02', 'K0-03'])
    for (const k of FORSLAG_K1.regler) {
      const kasus = FORSLAG_K1.kasus.filter((x) => x.valg.fra?.nokkel === k.id.replace('seponering-', ''))
      expect(kasus.some((x) => x.forventet.utfall === 'stopp' && x.forventet.grunner[0]!.startsWith(KOMPLETT_IKKE_TILGJENGELIG)), k.id).toBe(true)
      expect(kasus.map((x) => x.forventet.utfall), k.id).toContain('ingen')
      expect(kasus.map((x) => x.forventet.utfall), k.id).not.toContain('plan')
    }
  })

  it('viser ingen doser i noen plan i det kliniske omfanget: hver plan stopper med «komplett plan ikke tilgjengelig» og grunnen', () => {
    const planer = omfangsplaner(FORSLAG_K1, uttrekkene).flatMap((o) => o.veier.map((v) => ({ o, v })))
    expect(planer).toHaveLength(18)
    for (const { o, v } of planer) {
      const hva = `${o.regel.id} ${o.form} ${o.startdose_mg} mg`
      expect(v.utfall.utfall, hva).toBe('stopp')
      const grunner = 'grunner' in v.utfall ? v.utfall.grunner : []
      expect(grunner, hva).toHaveLength(1)
      expect(grunner[0], hva).toMatch(new RegExp(`^${KOMPLETT_IKKE_TILGJENGELIG} for \\w+: .+\\.$`))
      // Bare grunnen: ingen dose fra delplanen gjentas i stoppet, og ingen seponering begrunnes med at neste dose mangler.
      expect(grunner[0], hva).not.toMatch(/\d+ mg|[Ss]eponer/)
    }
  })

  it('viser ingen tekst eller lenker fra Psychiatrienet, har ingen avvik, sier at ingen regel er godkjent og har kontrollørens svar og de nye spørsmålene', () => {
    const tekst = les(FORSLAG_K1.fil)
    expect(tekst).toContain('**Ingen regel er godkjent eller aktivert.**')
    expect(tekst).not.toMatch(/psychiatrienet\.(nl|org|com)/i)
    expect(tekst).not.toContain('**avvik:**')
    for (let n = 1; n <= 15; n++) expect(tekst).toContain(`| K1.${n} |`)
    expect(FORSLAG_K1.sporsmal.map((x) => x.nr)).toEqual(['K1.9', 'K1.10', 'K1.11', 'K1.12', 'K1.13', 'K1.14', 'K1.15'])
  })

  it('endrer ikke reglene i regelsettet: den simulerte godkjenningen finnes bare på kopier', () => {
    for (const id of K1) expect(erKliniskGodkjent(i(REGELSETT, id)), id).toBe(false)
  })
})
