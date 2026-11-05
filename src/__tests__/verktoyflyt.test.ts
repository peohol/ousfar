/**
 * Tråd C i `docs/verktøy-brukervennlighet-2026-11.md`: spørsmålskatalogen,
 * avbildningen til motoren, forhåndskontrollen og stoppforklaringene
 * (`src/verktoy/flyt/`). Testene håndhever invariantene S2, S4, S5, S5b, S6
 * og S9 for de godkjente reglene med de lagrede FEST-uttrekkene.
 *
 * Alle doser og svar er syntetiske; ingen pasientopplysninger.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { beregnPlan, medTrinnvalg, TOMT_SKJEMA, type Planskjema } from '../verktoy/doseplan'
import { BESLUTNINGER, type Beslutninger } from '../verktoy/flyt/beslutninger'
import { flytoppsett, medFlytfelt, medIngenAvDisse, SAMLET, standardId, vurderFlyt, type Flytgrunnlag } from '../verktoy/flyt/flyt'
import { forhandskontroll, IKKE_AVKLART, KAN_LAGES_HVIS } from '../verktoy/flyt/forhandskontroll'
import { flyttilstand, medFlytsvar, reglerMedPlan } from '../verktoy/flyt'
import { harKontrollertKatalog, katalogavtrykk, katalogGjelder, KONTROLLERTE_KATALOGER, type Katalogkontroll } from '../verktoy/flyt/katalogkontroll'
import { KATALOGTABELLFIL, lagKatalogtabell } from '../verktoy/flyt/katalogtabell'
import { KATALOGBETINGELSER, KATALOGSPORSMAL, SVARSETT, type Betingelsestype, type Katalogbetingelse } from '../verktoy/flyt/sporsmal'
import { FORKLARINGER, klassifiser, stoppforklaringer } from '../verktoy/flyt/stopp'
import { KOMPLETT_IKKE_TILGJENGELIG, UTENFOR_OMFANG, type Doseplanresultat } from '../verktoy/motor/plan'
import { VERKTOY } from '../verktoy/register'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { FEST_ANTIPSYKOTIKA } from '../verktoy/regler/antipsykotikabytter'
import { fingeravtrykk, godkjenningsfeil } from '../verktoy/regler/godkjenning'
import { gjeldendeBekreftelser, type Regel } from '../verktoy/regler/modell'
import { verktoystatus } from '../verktoy/snarvalg'
import type { Verktoysperre } from '../verktoy/sperrer'
import { FEST_TILLEGG } from '../verktoy/tilleggsgrunnlag'
import { FOR_B2 } from '../verktoy/kontrollsett'
import { REGELSETT, samlet, type Verktoyvalg } from '../verktoy/tilgjengelighet'

const les = (fil: string) => readFileSync(new URL(`../../${fil}`, import.meta.url), 'utf8')
const uttrekk = (fil: string) => JSON.parse(les(fil)) as Festuttrekk
const AKSEPT = uttrekk(FEST_AKSEPTTEST)
const PILOT = uttrekk(FEST_PILOT)
const TILLEGG = uttrekk(FEST_TILLEGG)
const klokke = (u: Festuttrekk) => new Date(u.utvalg.kontrollert_kl!)

const GODKJENTE = REGELSETT.regler.filter((r) => godkjenningsfeil(r).length === 0)
const regel = (id: string) => REGELSETT.regler.find((r) => r.id === id)!
// Escitalopram slik appen har den: versjon 14 med tabletter og dråper (B2, godkjent 05.11.2026), som erstatter versjon 13.
const ESC = regel('seponering-escitalopram-tabletter-og-draper')
/** Escitalopram versjon 13 (K1), som spør «over 65 år»; godkjent, men erstattet i appen av versjon 14. */
const ESC13 = regel('seponering-escitalopram')
const VORT = regel('seponering-vortioksetin')
const VALPROAT = regel('tillegg-valproat-lamotrigin')
const LITIUM = regel('tillegg-litium-lamotrigin')
const [NED, BYTTE_AD, BYTTE_AP, TILLEGGSVERKTOY] = VERKTOY as [(typeof VERKTOY)[number], (typeof VERKTOY)[number], (typeof VERKTOY)[number], (typeof VERKTOY)[number]]

/** Katalogen ført som kontrollert for regelen, bare i testen. */
const kontrollertITest = (...regler: Regel[]): Katalogkontroll[] =>
  regler.map((r) => ({ regel: r.id, regelversjon: r.versjon, fingeravtrykk: fingeravtrykk(r), katalogavtrykk: katalogavtrykk(r), dato: '2026-11-04', av: 'Test', merknad: 'Bare i testen.' }))
const katalog = (r: Regel, b: Partial<Beslutninger> = {}): Flytgrunnlag => ({ kontrollerte: kontrollertITest(r), beslutninger: { ...BESLUTNINGER, ...b } })
/** Reservevisningen for hver regel, også de med kontrollert katalog i appen. */
const RESERVE: Flytgrunnlag = { kontrollerte: [] }

/** Svarene som tillater en plan for hvert synlig spørsmål, til flyten er ferdig. */
function besvarTillatende(r: Regel, g: Flytgrunnlag, start: Record<string, string> = {}): Record<string, string> {
  let svar = { ...start }
  for (let i = 0; i < 40; i++) {
    const f = vurderFlyt(r, svar, g)
    const neste = f.sporsmal.find((s) => s.valgt === undefined)
    if (!neste) return svar
    // Et bekreftende spørsmål besvares ja, et om et forhold ved pasienten nei: det vanlige forløpet uten særlige forhold.
    const bekrefter = f.oppsett.avbildninger.some((a) => a.type === 'bekreftelse' && a.fra.some((k) => k.sporsmal === neste.id))
    svar = { ...svar, [neste.id]: neste.id === 'alder' ? '18_64' : bekrefter ? 'ja' : 'nei' }
  }
  throw new Error('flyten ble ikke ferdig')
}

/** Alderen i år som svarene en kliniker gir. */
const alderssvar = (ar: number): Record<string, string> => (ar < 18 ? { alder: 'under_18' } : ar < 65 ? { alder: '18_64' } : { alder: '65_eller_eldre', eldre_enn_65: ar > 65 ? 'ja' : 'nei' })

describe('katalogen dekker hver betingelse i hver godkjent regel (S5)', () => {
  it('har en oppføring for hvert spørsmål, unntak og hver bekreftelse, og ingen for betingelser som ikke finnes', () => {
    for (const r of GODKJENTE) {
      const alle = [...r.unntak.map((x) => `unntak:${x.id}`), ...(r.sporsmal ?? []).map((x) => `sporsmal:${x.id}`), ...r.bekreftelser.map((x) => `bekreftelse:${x.id}`)]
      const egne = KATALOGBETINGELSER.filter((b) => b.regel === r.id).map((b) => `${b.type}:${b.id}`)
      expect(egne.sort(), r.id).toEqual(alle.sort())
    }
    for (const b of KATALOGBETINGELSER)
      expect(
        REGELSETT.regler.some((r) => r.id === b.regel),
        b.regel,
      ).toBe(true)
  })

  it('har entydige spørsmål, og hver avbildning og betinget visning peker på et spørsmål med svarene den bruker', () => {
    const ider = KATALOGSPORSMAL.map((s) => s.id)
    expect(new Set(ider).size).toBe(ider.length)
    const sporsmal = (id: string) => KATALOGSPORSMAL.find((s) => s.id === id)
    for (const b of KATALOGBETINGELSER) {
      for (const k of b.fra ?? []) {
        const s = sporsmal(k.sporsmal)
        expect(s, `${b.regel} ${b.id} → ${k.sporsmal}`).toBeDefined()
        const verdier: readonly string[] = SVARSETT[s!.svar].map((a) => a.verdi)
        for (const v of [...(k.ja ?? []), ...(k.nei ?? [])]) expect(verdier, `${k.sporsmal}: ${v}`).toContain(v)
      }
      // Bare forbehold står uten spørsmål.
      expect(b.kategori === 'forbehold' || (b.fra ?? []).length > 0, `${b.regel} ${b.id}`).toBe(true)
    }
    for (const s of KATALOGSPORSMAL) if (s.vises) expect(ider).toContain(s.vises.sporsmal)
  })

  it('viser ingen interne begreper eller «Gjelder»-svar til klinikeren', () => {
    for (const r of GODKJENTE) {
      const f = vurderFlyt(r, besvarTillatende(r, katalog(r)), katalog(r))
      for (const s of f.sporsmal) {
        const tekst = [s.tekst, s.hjelp, s.forklaring, ...s.alternativer.map((a) => a.tekst)].join(' ')
        expect(s.alternativer.map((a) => a.tekst).join(' '), s.id).not.toMatch(/Gjelder/)
        expect(tekst, s.id).not.toMatch(/omfang|strategi|regel-?id|fingeravtrykk|formuleringsklasse/i)
        expect(tekst).not.toContain(r.id)
      }
    }
  })

  it('endrer ingen regel og intet fingeravtrykk (S2)', () => {
    const for_ = GODKJENTE.map((r) => [structuredClone(r), fingeravtrykk(r)] as const)
    for (const r of GODKJENTE) {
      vurderFlyt(r, besvarTillatende(r, katalog(r)), katalog(r))
      vurderFlyt(r, besvarTillatende(r, RESERVE), RESERVE)
    }
    GODKJENTE.forEach((r, i) => {
      expect(r).toEqual(for_[i]![0])
      expect(fingeravtrykk(r)).toBe(for_[i]![1])
      expect(godkjenningsfeil(r)).toEqual([])
    })
  })
})

describe('katalogavtrykket (S5b)', () => {
  it('er kontrollert for nøyaktig de sju regelversjonene ChatGPT godkjente 04.11, og ikke for escitalopram v13, vortioksetin eller sertralin → mirtazapin', () => {
    const godkjent = {
      'depot-aripiprazol-maintena': 3,
      'depot-paliperidon-xeplion': 3,
      'depot-risperidon-xeplion': 8,
      'antipsykotikabytte-olanzapin-aripiprazol': 8,
      'antipsykotikabytte-risperidon-aripiprazol': 8,
      'tillegg-valproat-lamotrigin': 2,
      'tillegg-litium-lamotrigin': 2,
    }
    expect(Object.fromEntries(KONTROLLERTE_KATALOGER.map((k) => [k.regel, k.regelversjon]))).toEqual(godkjent)
    expect(KONTROLLERTE_KATALOGER.map((k) => k.regel)).not.toContain(ESC.id)
    for (const k of KONTROLLERTE_KATALOGER) expect(k.merknad).toMatch(/ikke en ny godkjenning av doseringsregelen/)
    for (const r of GODKJENTE) {
      const med = r.id in godkjent
      expect(katalogGjelder(r), r.id).toBe(med)
      expect(harKontrollertKatalog(r), r.id).toBe(med)
      const o = flytoppsett(r)
      expect(o.katalog, r.id).toBe(med)
      // Uten kontrollert katalog: reservevisningen med regelens egne tekster.
      if (!med)
        expect(
          o.sporsmal.every((s) => s.kategori === 'uklassifisert'),
          r.id,
        ).toBe(true)
      else
        expect(
          o.sporsmal.some((s) => s.kategori === 'uklassifisert'),
          r.id,
        ).toBe(false)
    }
  })

  it('brukes bare når nøyaktig avtrykket, regelversjonen og fingeravtrykket er kontrollert', () => {
    const k = kontrollertITest(ESC)[0]!
    expect(katalogGjelder(ESC, [k])).toBe(true)
    expect(katalogGjelder(ESC, [{ ...k, regelversjon: ESC.versjon - 1 }])).toBe(false)
    expect(katalogGjelder(ESC, [{ ...k, fingeravtrykk: '0'.repeat(64) }])).toBe(false)
    expect(katalogGjelder(ESC, [{ ...k, katalogavtrykk: '0'.repeat(64) }])).toBe(false)
    // En endret katalogoppføring gir et nytt avtrykk, og den trygge standarden til ny kontroll er ført.
    const endret: Katalogbetingelse[] = KATALOGBETINGELSER.map((b) => (b.regel === ESC.id && b.id === 'akutt_situasjon' ? { ...b, forklaring: 'Endret.' } : b))
    expect(katalogavtrykk(ESC, endret)).not.toBe(k.katalogavtrykk)
    expect(katalogGjelder(ESC, [k], endret)).toBe(false)
    expect(flytoppsett(ESC, { kontrollerte: [k], katalog: endret }).katalog).toBe(false)
    const endretTekst = KATALOGSPORSMAL.map((s) => (s.id === 'qt_forlengelse' ? { ...s, tekst: 'Endret?' } : s))
    expect(katalogGjelder(ESC, [k], undefined, endretTekst)).toBe(false)
    // Et avtrykk for én regel gjelder ikke en annen.
    expect(katalogGjelder(VORT, [k])).toBe(false)
  })

  it('viser i reservevisningen regelens fullstendige tekst med opprinnelig type og svarlogikk, aldri et generisk spørsmål (S5)', () => {
    for (const r of GODKJENTE) {
      const o = flytoppsett(r, RESERVE)
      const def = (type: Betingelsestype, id: string) => o.sporsmal.find((s) => s.id === standardId(type, id))!
      for (const u of r.unntak) expect(def('unntak', u.id), `${r.id} ${u.id}`).toMatchObject({ tekst: u.tekst, art: 'valg', alternativer: SVARSETT.gjelder })
      for (const s of r.sporsmal ?? []) expect(def('sporsmal', s.id), `${r.id} ${s.id}`).toMatchObject({ tekst: s.tekst, art: 'valg', alternativer: SVARSETT.ja_nei })
      for (const b of r.bekreftelser) expect(def('bekreftelse', b.id), `${r.id} ${b.id}`).toMatchObject({ tekst: b.tekst, art: 'avkrysning', alternativer: SVARSETT.bekreftet })
      for (const s of o.sporsmal) {
        expect(s.hjelp, `${r.id} ${s.id}`).toBeUndefined()
        expect(s.tekst).not.toMatch(/Gjelder dette pasienten/i)
      }
    }
  })

  it('gir i reservevisningen nøyaktig dagens skjemainndata for hvert enkelt svar, og skjuler ingenting etter et stoppende svar', () => {
    for (const r of GODKJENTE) {
      const alle = { svar: Object.fromEntries((r.sporsmal ?? []).map((s) => [s.id, false])), pasientforhold: Object.fromEntries(r.unntak.map((u) => [u.id, false])) }
      const flytsvar = (svar: Record<string, boolean>, pasientforhold: Record<string, boolean>, ikke: string[] = []) => ({
        ...Object.fromEntries(Object.entries(svar).map(([id, v]) => [standardId('sporsmal', id), v ? 'ja' : 'nei'])),
        ...Object.fromEntries(Object.entries(pasientforhold).map(([id, v]) => [standardId('unntak', id), v ? 'ja' : 'nei'])),
        ...Object.fromEntries(r.bekreftelser.filter((b) => !ikke.includes(b.id)).map((b) => [standardId('bekreftelse', b.id), 'ja'])),
      })
      // Dagens skjema: svarene og unntakene som de er krysset av, og de gjeldende bekreftelsene som er krysset av.
      const dagens = (svar: Record<string, boolean>, pasientforhold: Record<string, boolean>, ikke: string[] = []) => ({
        svar,
        pasientforhold,
        bekreftet: gjeldendeBekreftelser(r, svar)
          .map((b) => b.id)
          .filter((id) => !ikke.includes(id)),
      })
      const tilfeller: [Record<string, boolean>, Record<string, boolean>, string[]][] = [
        [alle.svar, alle.pasientforhold, []],
        ...(r.sporsmal ?? []).map((s): [Record<string, boolean>, Record<string, boolean>, string[]] => [{ ...alle.svar, [s.id]: true }, alle.pasientforhold, []]),
        ...r.unntak.map((u): [Record<string, boolean>, Record<string, boolean>, string[]] => [alle.svar, { ...alle.pasientforhold, [u.id]: true }, []]),
        ...r.bekreftelser.map((b): [Record<string, boolean>, Record<string, boolean>, string[]] => [alle.svar, alle.pasientforhold, [b.id]]),
      ]
      for (const [svar, pf, ikke] of tilfeller) expect(vurderFlyt(r, flytsvar(svar, pf, ikke), RESERVE).felt, `${r.id} ${JSON.stringify([svar, pf, ikke])}`).toEqual(dagens(svar, pf, ikke))
    }
  })

  it('gir i standarden de samme motorinndataene som dagens skjema: hvert svar avbildes direkte, og ukjent sendes ikke', () => {
    for (const r of GODKJENTE) {
      const o = flytoppsett(r, RESERVE)
      const svar: Record<string, string> = {}
      for (const u of r.unntak) svar[standardId('unntak', u.id)] = 'nei'
      for (const s of r.sporsmal ?? []) svar[standardId('sporsmal', s.id)] = 'nei'
      for (const b of r.bekreftelser) svar[standardId('bekreftelse', b.id)] = 'ja'
      const f = vurderFlyt(r, svar, RESERVE)
      expect(f.felt, r.id).toEqual({
        svar: Object.fromEntries((r.sporsmal ?? []).map((s) => [s.id, false])),
        pasientforhold: Object.fromEntries(r.unntak.map((u) => [u.id, false])),
        bekreftet: gjeldendeBekreftelser(r, Object.fromEntries((r.sporsmal ?? []).map((s) => [s.id, false]))).map((b) => b.id),
      })
      expect(o.samlet).toEqual([])
      // Ja på et spørsmål gir ja; ukjent gir ingen verdi.
      const s0 = r.sporsmal?.[0]
      if (s0) {
        expect(vurderFlyt(r, { ...svar, [standardId('sporsmal', s0.id)]: 'ja' }, RESERVE).felt.svar[s0.id]).toBe(true)
        expect(s0.id in vurderFlyt(r, { ...svar, [standardId('sporsmal', s0.id)]: 'ukjent' }, RESERVE).felt.svar).toBe(false)
      }
    }
  })
})

describe('«Ukjent» er aldri et trygt svar (S4)', () => {
  it('gir ingen verdi for betingelsene spørsmålet avgjør, i katalogen og i standarden, for hver godkjent regel', () => {
    for (const r of GODKJENTE) {
      for (const g of [katalog(r), katalog(r, { B1: true, B2: true }), RESERVE, {}]) {
        const svar = besvarTillatende(r, g)
        const ok = vurderFlyt(r, svar, g)
        for (const s of ok.sporsmal.filter((x) => x.svar.includes('ukjent'))) {
          const f = vurderFlyt(r, { ...svar, [s.id]: 'ukjent' }, g)
          const avb = f.oppsett.avbildninger.filter((a) => a.fra.some((k) => k.sporsmal === s.id))
          for (const a of avb) {
            if (a.type === 'unntak') expect(a.id in f.felt.pasientforhold, `${r.id} ${s.id} → ${a.id}`).toBe(false)
            if (a.type === 'sporsmal') expect(a.id in f.felt.svar, `${r.id} ${s.id} → ${a.id}`).toBe(false)
            if (a.type === 'bekreftelse') expect(f.felt.bekreftet, `${r.id} ${s.id} → ${a.id}`).not.toContain(a.id)
          }
          expect(f.gjenstar.map((x) => x.id)).toContain(s.id)
          expect(f.sporsmal.find((x) => x.id === s.id)!.forklaring).toBe('Må avklares før verktøyet kan lage en plan.')
        }
        // «Ikke ennå» bekrefter ingenting og står som gjenstående.
        for (const s of ok.sporsmal.filter((x) => x.alternativer === SVARSETT.ja_ikke_enna)) {
          const f = vurderFlyt(r, { ...svar, [s.id]: 'nei' }, g)
          const ider = f.oppsett.avbildninger.filter((a) => a.fra.some((k) => k.sporsmal === s.id)).map((a) => a.id)
          for (const id of ider) expect(f.felt.bekreftet).not.toContain(id)
          expect(f.gjenstar.map((x) => x.id)).toContain(s.id)
        }
      }
    }
  })

  it('gir ingen plan og et «kan lages hvis» med gjenstående i stedet, ikke en stopp eller en plan', () => {
    const g = katalog(ESC)
    const svar = { ...besvarTillatende(ESC, g), akutt_situasjon: 'ukjent' }
    const valg: Verktoyvalg = { fra: { nokkel: 'escitalopram', formulering: 'standard' } }
    const ut = flyttilstand({
      verktoy: NED,
      valg,
      sperrer: [],
      skjema: { ...TOMT_SKJEMA, startdose: '20', flytsvar: svar, formvalg: { fra: { legemiddelform: '748' } } },
      utvalg: AKSEPT.utvalg,
      naa: klokke(AKSEPT),
      flytgrunnlag: g,
    })
    expect(ut.tilstand.steg).toBe('pasient')
    expect(ut.tilstand.kontroll.utfall).toBe('kan_lages_hvis')
    expect(ut.tilstand.kontroll.gjenstar).toBeGreaterThan(0)
    const plan = beregnPlan(ESC, valg, ut.skjema!, AKSEPT.utvalg, klokke(AKSEPT))
    expect(plan.status).toBe('stoppet')
    expect(plan.status === 'stoppet' && plan.stoppgrunner).toContainEqual(expect.stringMatching(/^Må avklares før beregning \(ukjent\): Pasienten har en akutt/))
  })
})

describe('felles spørsmål og grenseverdier (S6)', () => {
  it('spør om alder én gang og avleder «under 18 år» ved 17/18', () => {
    for (const r of [ESC, VORT, VALPROAT, LITIUM]) {
      const g = katalog(r)
      expect(flytoppsett(r, g).sporsmal.filter((s) => s.id === 'alder')).toHaveLength(1)
      expect(vurderFlyt(r, alderssvar(17), g).felt.pasientforhold.under_18).toBe(true)
      expect(vurderFlyt(r, alderssvar(18), g).felt.pasientforhold.under_18).toBe(false)
      expect('under_18' in vurderFlyt(r, { alder: 'ukjent' }, g).felt.pasientforhold).toBe(false)
    }
  })

  it('skiller «over 65 år» (escitalopram versjon 13) fra «65 år eller eldre» (vortioksetin og escitalopram versjon 14) ved 64/65/66', () => {
    const e = (ar: number) => vurderFlyt(ESC13, alderssvar(ar), katalog(ESC13)).felt.svar.eldre
    const v = (ar: number) => vurderFlyt(VORT, alderssvar(ar), katalog(VORT)).felt.svar.eldre
    const e14 = (ar: number) => vurderFlyt(ESC, alderssvar(ar), katalog(ESC)).felt.svar.eldre
    expect([e(17), e(64), e(65), e(66)]).toEqual([false, false, false, true])
    expect([v(17), v(64), v(65), v(66)]).toEqual([false, false, true, true])
    expect([e14(17), e14(64), e14(65), e14(66)]).toEqual([false, false, true, true])
    // Oppfølgingsspørsmålet vises bare ved 65 eller eldre, og bare for escitalopram versjon 13.
    expect(vurderFlyt(ESC, alderssvar(65), katalog(ESC)).sporsmal.map((s) => s.id)).not.toContain('eldre_enn_65')
    expect(vurderFlyt(ESC13, alderssvar(64), katalog(ESC13)).sporsmal.map((s) => s.id)).not.toContain('eldre_enn_65')
    expect(vurderFlyt(ESC13, { alder: '65_eller_eldre' }, katalog(ESC13)).sporsmal.map((s) => s.id)).toContain('eldre_enn_65')
    expect(vurderFlyt(VORT, { alder: '65_eller_eldre' }, katalog(VORT)).sporsmal.map((s) => s.id)).not.toContain('eldre_enn_65')
    // Ved 65 eller eldre er «over 65» ukjent til oppfølgingen er besvart.
    expect('eldre' in vurderFlyt(ESC13, { alder: '65_eller_eldre' }, katalog(ESC13)).felt.svar).toBe(false)
    // Et svar for et skjult oppfølgingsspørsmål teller ikke.
    expect(vurderFlyt(ESC13, { alder: '18_64', eldre_enn_65: 'ja' }, katalog(ESC13)).felt.svar.eldre).toBe(false)
    // «65 år eller eldre» avleder ikke «over 65 år»: regelens eget spørsmål stilles uendret, uten tilleggstekst (kjent avvik for v13, rettet i v14, som har erstattet v13 i appen).
    const oppfolging = vurderFlyt(ESC13, { alder: '65_eller_eldre' }, katalog(ESC13)).sporsmal.find((s) => s.id === 'eldre_enn_65')!
    expect(oppfolging.tekst).toBe(ESC13.sporsmal!.find((s) => s.id === 'eldre')!.tekst)
    expect(oppfolging.hjelp).toBeUndefined()
  })

  it('følger aldersgrensen i hvert antipsykotikabytte ved 64/65/66: «over 65 år» til Xeplion, «65 år eller eldre» til aripiprazol', () => {
    const xeplion = regel('depot-risperidon-xeplion')
    const x = (ar: number) => vurderFlyt(xeplion, alderssvar(ar), katalog(xeplion)).felt.pasientforhold.over_65
    expect([x(17), x(64), x(65), x(66)]).toEqual([false, false, false, true])
    for (const id of ['antipsykotikabytte-olanzapin-aripiprazol', 'antipsykotikabytte-risperidon-aripiprazol']) {
      const r = regel(id)
      const a = (ar: number) => vurderFlyt(r, alderssvar(ar), katalog(r)).felt.pasientforhold.alder_65
      expect([a(17), a(64), a(65), a(66)], id).toEqual([false, false, true, true])
      // Sterk hemmer eller sterk induktor: ett ja er nok, og ett «Ukjent» uten ja gir ingen verdi (S4).
      const cyp = (svar: Record<string, string>) => vurderFlyt(r, svar, katalog(r)).felt.pasientforhold.cyp_aripiprazol
      expect(cyp({ sterk_cyp_hemmer: 'nei', sterk_cyp3a4_induktor: 'ja' })).toBe(true)
      expect(cyp({ sterk_cyp_hemmer: 'nei', sterk_cyp3a4_induktor: 'nei' })).toBe(false)
      expect(cyp({ sterk_cyp_hemmer: 'nei', sterk_cyp3a4_induktor: 'ukjent' })).toBeUndefined()
    }
  })

  it('følger «voksen (18–65 år)» og «over 65 år» i byttene til sertralin ved 17/18 og 64/65/66, og spør om behandlingstiden for seg (K2-8)', () => {
    for (const [id, stoff] of [
      ['bytte-escitalopram-sertralin', 'escitalopram'],
      ['bytte-citalopram-sertralin', 'citalopram'],
    ] as const) {
      const r = regel(id)
      const felt = (ar: number) => vurderFlyt(r, { ...alderssvar(ar), depresjon_bytte: 'ja' }, katalog(r)).felt
      const voksen = (ar: number) => felt(ar).bekreftet.includes('indikasjon')
      expect([17, 18, 64, 65, 66].map(voksen), id).toEqual([false, true, true, true, false])
      expect(
        [17, 18, 64, 65, 66].map((ar) => felt(ar).pasientforhold.over_65),
        id,
      ).toEqual([false, false, false, false, true])
      // Uten depresjon, eller med ukjent indikasjon, er indikasjonen ikke bekreftet.
      for (const d of ['nei', 'ukjent']) expect(vurderFlyt(r, { alder: '18_64', depresjon_bytte: d }, katalog(r)).felt.bekreftet, `${id} ${d}`).not.toContain('indikasjon')
      // Byttereglenes 8 uker er et eget spørsmål, ikke «mange måneder eller lenger» fra «Trappe ned».
      const tid = vurderFlyt(r, {}, katalog(r)).sporsmal.find((q) => q.id === `over_8_uker_${stoff}`)!
      expect(tid.tekst).toBe(`Har pasienten brukt ${stoff} sammenhengende i mer enn 8 uker?`)
      expect(vurderFlyt(r, { [`over_8_uker_${stoff}`]: 'ja' }, katalog(r)).felt.pasientforhold.lang_behandlingstid).toBe(true)
      expect(vurderFlyt(r, {}, katalog(r)).sporsmal.some((q) => q.id === 'lang_behandlingstid')).toBe(false)
    }
  })

  it('gir samme utfall i motoren ved 64/65/66 år som regelens eget spørsmål (escitalopram 20 mg dråper, versjon 14: 65 år stopper)', () => {
    const valg: Verktoyvalg = { fra: { nokkel: 'escitalopram', formulering: 'standard' } }
    const utfall = (ar: number) => {
      const g = katalog(ESC)
      const svar = besvarTillatende(ESC, g, alderssvar(ar))
      return flyttilstand({
        verktoy: NED,
        valg,
        sperrer: [],
        skjema: { ...TOMT_SKJEMA, startdose: '20', flytsvar: svar, formvalg: { fra: { legemiddelform: '748' } } },
        utvalg: AKSEPT.utvalg,
        naa: klokke(AKSEPT),
        flytgrunnlag: g,
      }).tilstand.kontroll.utfall
    }
    expect([utfall(64), utfall(65), utfall(66)]).toEqual(['kan_lages_hvis', 'kan_ikke', 'kan_ikke'])
  })
})

describe('progressiv visning og rekkefølge', () => {
  it('stiller stoppforhold først, så det som endrer planen, så vurderingene', () => {
    for (const r of GODKJENTE) {
      const f = vurderFlyt(r, besvarTillatende(r, katalog(r)), katalog(r))
      const grupper = f.sporsmal.map((s) => ['stopp', 'endrer', 'vurdering'].indexOf(s.gruppe))
      expect(grupper, r.id).toEqual([...grupper].sort((a, b) => a - b))
    }
  })

  it('viser vilkårene for valproat ved graviditet og farskap bare etter svaret som utløser dem, og et skjult svar teller ikke', () => {
    const g = katalog(VALPROAT)
    const ider = (svar: Record<string, string>) => vurderFlyt(VALPROAT, svar, g).sporsmal.map((s) => s.id)
    expect(ider({})).not.toContain('ppp_prevensjon')
    expect(ider({ kan_bli_gravid: 'ja' })).toEqual(expect.arrayContaining(['ppp_indikasjon', 'ppp_informasjon', 'ppp_prevensjon', 'ppp_graviditet']))
    expect(ider({ kan_bli_gravid: 'nei' })).not.toContain('ppp_prevensjon')
    expect(ider({ kan_bli_far: 'ja' })).toEqual(expect.arrayContaining(['far_informasjon', 'far_vurdering']))
    expect(ider({ ostrogen: 'ja' })).toContain('ostrogen_maldose')
    expect(ider({ ostrogen: 'nei' })).not.toContain('ostrogen_maldose')
    const skjult = vurderFlyt(VALPROAT, { kan_bli_gravid: 'nei', ppp_prevensjon: 'ja', ppp_indikasjon: 'ja' }, g)
    expect(skjult.felt.bekreftet).not.toContain('ppp_prevensjon')
    expect(skjult.felt.bekreftet).not.toContain('ppp_indikasjon')
  })

  it('skjuler de senere gruppene når et svar stopper planen, med en forklaring ved spørsmålet', () => {
    const g = katalog(ESC)
    const f = vurderFlyt(ESC, { qt_forlengelse: 'ja' }, g)
    expect(f.sporsmal.every((s) => s.gruppe === 'stopp')).toBe(true)
    const qt = f.sporsmal.find((s) => s.id === 'qt_forlengelse')!
    expect(qt.stopperVed).toEqual(['ja'])
    expect(qt.forklaring).toMatch(/kontraindikasjon i preparatomtalen/)
    expect(f.felt.pasientforhold.qt_forlengelse).toBe(true)
    // Et svar utenfor regelens kliniske omfang stopper også (nedsatt leverfunksjon har ingen godkjent plan).
    const lever = vurderFlyt(ESC, { nedsatt_leverfunksjon: 'ja' }, g).sporsmal.find((s) => s.id === 'nedsatt_leverfunksjon')!
    expect(lever.stopperVed).toEqual(['ja'])
    expect(vurderFlyt(ESC, {}, g).sporsmal.find((s) => s.id === 'lang_behandlingstid')!.stopperVed).toBeUndefined()
  })

  it('deler sammensatte unntak: ett ja gir ja, ukjent uten ja gir ukjent, alle nei gir nei', () => {
    const g = katalog(ESC)
    const u = (svar: Record<string, string>) => vurderFlyt(ESC, svar, g).felt.pasientforhold.ustabil_dose_eller_bytte
    expect(u({ del_av_bytte: 'ja', ustabil_dose: 'nei' })).toBe(true)
    expect(u({ del_av_bytte: 'nei', ustabil_dose: 'ja' })).toBe(true)
    expect(u({ del_av_bytte: 'ukjent', ustabil_dose: 'ja' })).toBe(true)
    expect(u({ del_av_bytte: 'ukjent', ustabil_dose: 'nei' })).toBeUndefined()
    expect(u({ del_av_bytte: 'nei' })).toBeUndefined()
    expect(u({ del_av_bytte: 'nei', ustabil_dose: 'nei' })).toBe(false)
  })
})

describe('forbehold, avledede forutsetninger og «Ingen av disse» (B1, B2, B5)', () => {
  it('bekrefter forbehold samlet til slutt til B1 er akseptert, og viser dem i planen etter det', () => {
    const uten = vurderFlyt(ESC, {}, katalog(ESC, { B1: false }))
    const samlet = uten.sporsmal.find((s) => s.id === SAMLET)!
    expect(samlet.art).toBe('avkrysning')
    expect(samlet.punkter).toEqual([ESC.bekreftelser.find((b) => b.id === 'startforslag')!.tekst])
    expect(uten.felt.bekreftet).not.toContain('startforslag')
    expect(vurderFlyt(ESC, { [SAMLET]: 'ja' }, katalog(ESC, { B1: false })).felt.bekreftet).toContain('startforslag')
    const med = vurderFlyt(ESC, {}, katalog(ESC, { B1: true }))
    expect(med.sporsmal.map((s) => s.id)).not.toContain(SAMLET)
    expect(med.felt.bekreftet).toContain('startforslag')
    expect(med.forutsatt).toEqual([ESC.bekreftelser.find((b) => b.id === 'startforslag')!.tekst])
  })

  it('oppfyller den avledede bekreftelsen for Lithionit bare med et uttrykkelig ja når B2 er akseptert', () => {
    expect(vurderFlyt(LITIUM, {}, katalog(LITIUM, { B2: false })).sporsmal.find((s) => s.id === SAMLET)!.punkter).toEqual([LITIUM.bekreftelser.find((b) => b.id === 'aktuell_dose')!.tekst])
    const g = katalog(LITIUM, { B2: true })
    expect(vurderFlyt(LITIUM, {}, g).sporsmal.map((s) => s.id)).toContain('preparat_lithionit')
    expect(vurderFlyt(LITIUM, {}, g).felt.bekreftet).not.toContain('aktuell_dose')
    const ja = vurderFlyt(LITIUM, { preparat_lithionit: 'ja' }, g)
    expect(ja.felt.bekreftet).toContain('aktuell_dose')
    expect(ja.forutsatt).toContain(LITIUM.bekreftelser.find((b) => b.id === 'aktuell_dose')!.tekst)
    const nei = vurderFlyt(LITIUM, { preparat_lithionit: 'nei' }, g)
    expect(nei.felt.bekreftet).not.toContain('aktuell_dose')
    expect(nei.sporsmal.find((s) => s.id === 'preparat_lithionit')!.forklaring).toMatch(/bare Lithionit 42 mg/)
  })

  it('tilbyr «Ingen av disse» bare med B5, bare for unntak i stoppgruppen, og endrer aldri et svar som er gitt', () => {
    expect(vurderFlyt(ESC, {}, katalog(ESC, { B5: false })).ingenAvDisse).toEqual([])
    // Ikke forhåndsutfylt: uten det aktive valget er stoppforholdene ubesvart.
    expect(vurderFlyt(ESC, { alder: '18_64' }, katalog(ESC)).felt.pasientforhold).not.toHaveProperty('akutt_situasjon')
    const f = vurderFlyt(ESC, { alder: '18_64', qt_forlengelse: 'ukjent' }, katalog(ESC, { B5: true }))
    expect(f.ingenAvDisse).toEqual(['akutt_situasjon', 'del_av_bytte', 'ustabil_dose', 'tidligere_seponeringsplager'])
    const svar = medIngenAvDisse({ alder: '18_64', qt_forlengelse: 'ukjent' }, f.ingenAvDisse)
    expect(svar).toEqual({ alder: '18_64', qt_forlengelse: 'ukjent', akutt_situasjon: 'nei', del_av_bytte: 'nei', ustabil_dose: 'nei', tidligere_seponeringsplager: 'nei' })
    // Bekreftelser om pasienten (indikasjon) er ikke med: der er «nei» ikke det tillatende svaret.
    const maintena = regel('depot-aripiprazol-maintena')
    expect(vurderFlyt(maintena, {}, katalog(maintena, { B5: true })).ingenAvDisse).not.toContain('indikasjon_aripiprazol')
  })

  it('krever begrunnelse når et ja trenger det', () => {
    expect(vurderFlyt(VALPROAT, { ostrogen: 'ja' }, katalog(VALPROAT)).begrunnelse?.hjelp).toMatch(/østrogenholdig/)
    expect(vurderFlyt(VALPROAT, { ostrogen: 'nei' }, katalog(VALPROAT)).begrunnelse).toBeUndefined()
  })
})

describe('forhåndskontrollen (§5, S9)', () => {
  const esc: Verktoyvalg = { fra: { nokkel: 'escitalopram', formulering: 'standard' } }
  const skjema = (x: Partial<Planskjema>): Planskjema => ({ ...TOMT_SKJEMA, ...x })
  const fk = (startdose: string, x: Partial<Planskjema> = {}, b: Partial<Beslutninger> = {}, regelsett = REGELSETT) =>
    forhandskontroll({ verktoy: NED, valg: esc, sperrer: [], skjema: skjema({ startdose, ...x }), utvalg: AKSEPT.utvalg, naa: klokke(AKSEPT), beslutninger: { ...BESLUTNINGER, ...b }, regelsett })
  /** Regelsettene før versjon 14 (B2) ble godkjent: escitalopram versjon 13, som bare gir en komplett plan med dråper. */
  const FOR_V14 = samlet(FOR_B2)

  it('sier straks etter dosen, før pasientspørsmål, at escitalopram 15 mg ikke har en godkjent plan, med dosene som er godkjent', () => {
    const k = fk('15')
    expect(k.utfall).toBe('kan_ikke')
    // Versjon 14 gjelder 10 og 20 mg i begge formene.
    expect(k.grunner[0]!.tekst).toMatch(/^Den godkjente planen gjelder bare startdosene 10 og 20 mg\. /)
    // Med ulike doser per form sier den hvilke: versjon 13 gjaldt bare 20 mg som tablett.
    expect(fk('15', {}, {}, FOR_V14).grunner[0]!.tekst).toMatch(/^Den godkjente planen gjelder bare startdosene 10 og 20 mg \(tablett: 20 mg; dråper, oppløsning: 10 og 20 mg\)\./)
  })

  it('sier at escitalopram 10 mg kan lages med tablett og med dråper i appen (versjon 14, K0-01)', () => {
    const tablett = fk('10', { formvalg: { fra: { legemiddelform: '53' } } })
    expect(tablett.utfall).toBe('kan_lages_hvis')
    expect(tablett.former).toEqual({ fra: ['53', '748'] })
    expect(tablett.grunner.map((g) => g.kode)).not.toContain('formvalg_trengs')
    expect(tablett.regler.map((r) => r.id)).toEqual([ESC.id])
    // Begge formene kan gi en komplett plan, så B4 velger ingen form selv.
    expect(fk('10', {}, { B4: true }).formvalg).toBeUndefined()
  })

  it('sa med versjon 13 at escitalopram 10 mg kan lages med dråper, ikke med tablett, og velger dråper selv bare med B4', () => {
    const fk13 = (startdose: string, x: Partial<Planskjema> = {}, b: Partial<Beslutninger> = {}) => fk(startdose, x, b, FOR_V14)
    const tablett = fk13('10', { formvalg: { fra: { legemiddelform: '53' } } })
    expect(tablett.utfall).toBe('kan_lages_hvis')
    expect(tablett.former).toEqual({ fra: ['748'] })
    expect(tablett.grunner).toEqual([
      expect.objectContaining({
        kode: 'formvalg_trengs',
        tekst: 'Med tablett kan verktøyet ikke lage en komplett plan, men med dråper, oppløsning kan det.',
        handling: 'Velg dråper, oppløsning.',
        losning: 'i_verktoyet',
      }),
    ])
    expect(tablett.formvalg).toBeUndefined()
    const auto = fk13('10', {}, { B4: true })
    expect(auto.formvalg).toEqual({ fra: { legemiddelform: '748' } })
    expect(auto.grunner.map((g) => g.kode)).toEqual(['form_valgt'])
    // Uten B4 må formen velges; en form klinikeren har valgt, byttes aldri ut i stillhet.
    expect(fk13('10', {}, { B4: false }).grunner.map((g) => g.kode)).toEqual(['formvalg_trengs'])
    expect(fk13('10', { formvalg: { fra: { legemiddelform: '53' } } }, { B4: true }).formvalg).toBeUndefined()
  })

  it('sier aldri «kan ikke» når taket stoppet prøveberegningen før en mulig plan ble funnet (ChatGPT 04.11)', () => {
    // Escitalopram 20 mg dråper gir en komplett plan først etter sju dosevalg; et lavere tak når den ikke.
    const med = (provetak?: { beregninger?: number; dosevalg?: number }) =>
      forhandskontroll({
        verktoy: NED,
        valg: esc,
        sperrer: [],
        skjema: skjema({ startdose: '20', formvalg: { fra: { legemiddelform: '748' } } }),
        utvalg: AKSEPT.utvalg,
        naa: klokke(AKSEPT),
        ...(provetak && { provetak }),
      })
    expect(med()).toMatchObject({ utfall: 'kan_lages_hvis', dosevalg: 7 })
    for (const tak of [{ beregninger: 3 }, { dosevalg: 2 }]) {
      const k = med(tak)
      expect(k.utfall, JSON.stringify(tak)).toBe('ukjent')
      expect(k.grunner).toEqual([expect.objectContaining({ kode: 'ikke_avklart', tekst: IKKE_AVKLART })])
    }
  })

  it('følger dosevalgene for trinn i prøveberegningen og regner dem som gjenstående, ikke som stopp', () => {
    const k = fk('20', { formvalg: { fra: { legemiddelform: '748' } } })
    expect(k.utfall).toBe('kan_lages_hvis')
    expect(k.dosevalg).toBeGreaterThan(0)
    // Kontrollen har ingen plan å vise (S9).
    expect(Object.keys(k).sort()).toEqual(['dosevalg', 'former', 'gjenstar', 'grunner', 'regler', 'utfall'])
    expect(KAN_LAGES_HVIS).toBe('En komplett plan kan lages hvis svarene under tillater det.')
  })

  it('lover ingenting før nødstoppen eller FEST er lest, og stopper ved en aktiv sperre', () => {
    expect(forhandskontroll({ verktoy: NED, valg: esc, naa: klokke(AKSEPT) }).utfall).toBe('ukjent')
    expect(forhandskontroll({ verktoy: NED, valg: esc, sperrer: [], skjema: skjema({ startdose: '20' }), naa: klokke(AKSEPT) }).utfall).toBe('ukjent')
    const sperre: Verktoysperre = { id: 's1', omfang: 'verktoy', mal: NED.id, grunn: 'Test', satt_kl: '2026-11-04T10:00:00Z', satt_av: null }
    expect(forhandskontroll({ verktoy: NED, valg: esc, sperrer: [sperre], naa: klokke(AKSEPT) })).toMatchObject({ utfall: 'kan_ikke', grunner: [{ kode: 'sperret' }] })
  })

  it('regner en måldose som ikke er valgt ennå som gjenstående, ikke som et stopp (olanzapin → aripiprazol, måldose 10 eller 15 mg)', () => {
    const ap = uttrekk(FEST_ANTIPSYKOTIKA)
    const valg: Verktoyvalg = { fra: { nokkel: 'olanzapin', formulering: 'standard' }, til: { nokkel: 'aripiprazol', formulering: 'standard' } }
    const g = (x: Partial<Planskjema>) => ({ verktoy: BYTTE_AP, valg, sperrer: [], skjema: skjema({ startdose: '20', ...x }), utvalg: ap.utvalg, naa: klokke(ap) })
    const uten = forhandskontroll(g({}))
    expect(uten.utfall).toBe('kan_lages_hvis')
    expect(uten.grunner.map((x) => x.kode)).not.toContain('dose_utenfor')
    const med = forhandskontroll(g({ maldose: '15' }))
    expect(med.utfall).toBe('kan_lages_hvis')
    // Måldosen er ett av valgene som gjenstår, og flyten blir stående ved behandlingen til den er valgt.
    expect(uten.gjenstar).toBe(med.gjenstar + 1)
    expect(flyttilstand(g({})).tilstand.steg).toBe('behandling')
    expect(flyttilstand(g({ maldose: '15' })).tilstand.steg).not.toBe('behandling')
    // En måldose utenfor regelen er fortsatt et stopp.
    expect(forhandskontroll(g({ maldose: '25' })).utfall).toBe('kan_ikke')
  })

  it('sier fra før skjemaet når verktøyet ikke har noen godkjent plan for valget (P11)', () => {
    const bytte = forhandskontroll({
      verktoy: BYTTE_AD,
      valg: { fra: { nokkel: 'sertralin', formulering: 'standard' }, til: { nokkel: 'mirtazapin', formulering: 'standard' } },
      sperrer: [],
      naa: klokke(AKSEPT),
    })
    expect(bytte).toMatchObject({ utfall: 'kan_ikke', grunner: [{ kode: 'ikke_komplett' }] })
    expect(forhandskontroll({ verktoy: NED, valg: { fra: { nokkel: 'sertralin', formulering: 'standard' } }, sperrer: [], naa: klokke(AKSEPT) })).toMatchObject({
      utfall: 'kan_ikke',
      grunner: [{ kode: 'ikke_godkjent' }],
    })
    expect(forhandskontroll({ verktoy: NED, valg: { fra: { nokkel: 'bupropion', formulering: 'standard' } }, sperrer: [], naa: klokke(AKSEPT) })).toMatchObject({
      utfall: 'kan_ikke',
      grunner: [{ kode: 'fagtekst' }],
    })
  })

  it('stopper Lithionit-dosen 83 mg straks og prøver 84 mg mot FEST', () => {
    const valg: Verktoyvalg = { fra: { nokkel: 'litium', formulering: 'standard' }, til: { nokkel: 'lamotrigin', formulering: 'standard' } }
    const k = (d: string) =>
      forhandskontroll({ verktoy: TILLEGGSVERKTOY, valg, sperrer: [], skjema: skjema({ startdose: d }), utvalg: TILLEGG.utvalg, naa: klokke(TILLEGG), flyt: vurderFlyt(LITIUM, {}) })
    expect(k('83')).toMatchObject({ utfall: 'kan_ikke', grunner: [{ kode: 'utenfor_omfang' }] })
    expect(k('83').grunner[0]!.tekst).toMatch(/^Regelen gjelder bare startdoser på 42, 84, .* og 420 mg litium \(Li⁺\) per døgn\./)
    expect(k('84').utfall).toBe('kan_lages_hvis')
  })

  it('finner depotplanen for Xeplion og ber om formvalget for aripiprazol når begge perorale former kan brukes', () => {
    const xeplion = forhandskontroll({
      verktoy: BYTTE_AP,
      valg: { fra: { nokkel: 'paliperidon', formulering: 'standard' }, til: { nokkel: 'paliperidon', formulering: 'ER' } },
      sperrer: [],
      skjema: skjema({ startdose: '6' }),
      utvalg: PILOT.utvalg,
      naa: klokke(PILOT),
    })
    expect(xeplion).toMatchObject({ utfall: 'kan_lages_hvis', grunner: [] })
    const maintena = forhandskontroll({
      verktoy: BYTTE_AP,
      valg: { fra: { nokkel: 'aripiprazol', formulering: 'standard' }, til: { nokkel: 'aripiprazol', formulering: 'LA' } },
      sperrer: [],
      skjema: skjema({ startdose: '15' }),
      utvalg: PILOT.utvalg,
      naa: klokke(PILOT),
    })
    expect(maintena.utfall).toBe('kan_lages_hvis')
    expect(maintena.grunner).toEqual([expect.objectContaining({ kode: 'formvalg_trengs', handling: expect.stringMatching(/^Velg .+ eller .+\.$/) })])
  })

  it('peker på svaret som gjør at prøveberegningen ikke gir en komplett plan (escitalopram etter lang behandlingstid, K1.13)', () => {
    const g = katalog(ESC)
    const svar = { ...besvarTillatende(ESC, g), lang_behandlingstid: 'ja' }
    const k = forhandskontroll({
      verktoy: NED,
      valg: esc,
      sperrer: [],
      skjema: skjema({ startdose: '20', formvalg: { fra: { legemiddelform: '748' } } }),
      utvalg: AKSEPT.utvalg,
      naa: klokke(AKSEPT),
      flyt: vurderFlyt(ESC, svar, g),
    })
    expect(k.utfall).toBe('kan_ikke')
    expect(k.grunner[0]).toMatchObject({ kode: 'svar_stopper', sporsmal: 'lang_behandlingstid' })
    expect(k.grunner[1]).toMatchObject({ kode: 'ikke_komplett', detalj: expect.stringMatching(/planen står på 9 mg/) })
  })

  it('stopper på et svar i flyten som stopper planen, med flytens forklaring, uten å beregne', () => {
    const g = katalog(ESC)
    const k = forhandskontroll({
      verktoy: NED,
      valg: esc,
      sperrer: [],
      skjema: skjema({ startdose: '20' }),
      utvalg: AKSEPT.utvalg,
      naa: klokke(AKSEPT),
      flyt: vurderFlyt(ESC, { qt_forlengelse: 'ja' }, g),
    })
    expect(k).toMatchObject({ utfall: 'kan_ikke', grunner: [{ kode: 'svar_stopper', sporsmal: 'qt_forlengelse' }] })
  })
})

describe('hele flyten til planen (S1, S9)', () => {
  it('gir escitalopram 20 mg med dråper en klinisk, komplett plan bare fra beregnPlan med de faktiske svarene', () => {
    const valg: Verktoyvalg = { fra: { nokkel: 'escitalopram', formulering: 'standard' } }
    const g = katalog(ESC)
    let s: Planskjema = { ...TOMT_SKJEMA, startdose: '20', formvalg: { fra: { legemiddelform: '748' } } }
    for (const [id, v] of Object.entries(besvarTillatende(ESC, g))) s = medFlytsvar(s, id, v)
    const ut = flyttilstand({ verktoy: NED, valg, sperrer: [], skjema: s, utvalg: AKSEPT.utvalg, naa: klokke(AKSEPT), flytgrunnlag: g })
    expect(ut.regel).toBe(ESC)
    expect(ut.tilstand).toMatchObject({ steg: 'plan', kontroll: { utfall: 'kan_lages_hvis', gjenstar: 0 } })
    // Planen beregnes med motorfeltene fra svarene; dosevalgene gjøres i planen, som i dag.
    let skjema = ut.skjema!
    let plan: Doseplanresultat = beregnPlan(ESC, valg, skjema, AKSEPT.utvalg, klokke(AKSEPT))
    for (let i = 0; plan.status === 'stoppet' && plan.trinnvalg && i < 20; i++) {
      skjema = medTrinnvalg(skjema, plan.trinnvalg[0]!, plan.trinnvalg[0]!.doser[0]!.mg)
      plan = beregnPlan(ESC, valg, skjema, AKSEPT.utvalg, klokke(AKSEPT))
    }
    expect(plan.status).toBe('doseplan')
    expect(plan.status === 'doseplan' && plan.klinisk).toBe(true)
    expect(ut.tilstand.kontroll.dosevalg).toBe(skjema.trinnvalg.length)
  })

  it('gir samme motorinndata i katalogen som regelens egne svar ville gitt for de godkjente reglene', () => {
    for (const r of GODKJENTE) {
      const kat = vurderFlyt(r, besvarTillatende(r, katalog(r, { B1: true, B2: true })), katalog(r, { B1: true, B2: true })).felt
      const std = vurderFlyt(r, besvarTillatende(r, RESERVE), RESERVE).felt
      expect(kat, r.id).toEqual({ ...std, svar: std.svar })
    }
  })

  it('finner reglene som kan gi en komplett plan', () => {
    expect(reglerMedPlan({ verktoy: NED, valg: { fra: { nokkel: 'escitalopram', formulering: 'standard' } } }).map((r) => r.id)).toEqual([ESC.id])
    expect(reglerMedPlan({ verktoy: NED, valg: { fra: { nokkel: 'vortioksetin', formulering: 'standard' } } })).toEqual([])
    expect(medFlytsvar(medFlytsvar(TOMT_SKJEMA, 'a', 'ja'), 'a', undefined).flytsvar).toEqual({})
    expect(medFlytfelt(TOMT_SKJEMA, { svar: { x: true }, pasientforhold: {}, bekreftet: ['y'] })).toMatchObject({ svar: { x: true }, bekreftet: ['y'] })
  })
})

describe('ekte brukerforløp med de godkjente katalogene i appen (ChatGPT 04.11)', () => {
  type Forlop = { verktoy: (typeof VERKTOY)[number]; valg: Verktoyvalg; fest: Festuttrekk; regel: string; skjema: Partial<Planskjema> }
  const AP = uttrekk(FEST_ANTIPSYKOTIKA)
  const FORLOP: Forlop[] = [
    {
      verktoy: BYTTE_AP,
      valg: { fra: { nokkel: 'olanzapin', formulering: 'standard' }, til: { nokkel: 'aripiprazol', formulering: 'standard' } },
      fest: AP,
      regel: 'antipsykotikabytte-olanzapin-aripiprazol',
      skjema: { startdose: '20', maldose: '15' },
    },
    {
      verktoy: BYTTE_AP,
      valg: { fra: { nokkel: 'risperidon', formulering: 'standard' }, til: { nokkel: 'paliperidon', formulering: 'ER' } },
      fest: AP,
      regel: 'depot-risperidon-xeplion',
      skjema: { startdose: '3', maldose: '75' },
    },
    {
      verktoy: TILLEGGSVERKTOY,
      valg: { fra: { nokkel: 'valproat', formulering: 'standard' }, til: { nokkel: 'lamotrigin', formulering: 'standard' } },
      fest: TILLEGG,
      regel: 'tillegg-valproat-lamotrigin',
      skjema: { startdose: '1000', maldose: '100' },
    },
  ]

  /**
   * Klinikerens forløp i appen, uten testkontroller: svarene i `svar` først,
   * så det vanlige svaret på hvert spørsmål som vises (18–64 år, «Ja» der svaret
   * bekrefter, ellers «Nei»), formen fra forhåndskontrollen når den må velges,
   * og planen fra motoren med dosevalgene for trinnene.
   */
  function forlop(f: Forlop, svar: Record<string, string> = {}) {
    const naa = klokke(f.fest)
    let s: Planskjema = { ...TOMT_SKJEMA, ...f.skjema }
    for (const [id, v] of Object.entries(svar)) s = medFlytsvar(s, id, v)
    const tilstand = () => flyttilstand({ verktoy: f.verktoy, valg: f.valg, sperrer: [], skjema: s, utvalg: f.fest.utvalg, naa })
    let ut = tilstand()
    for (let i = 0; i < 60; i++) {
      const neste = ut.tilstand.sporsmal.find((q) => q.valgt === undefined)
      const former = Object.entries(ut.kontroll.former ?? {}).filter(([forlop, k]) => k.length > 0 && !s.formvalg[forlop]?.legemiddelform && !ut.kontroll.formvalg?.[forlop])
      if (!neste && former.length === 0) break
      if (neste) {
        const bekrefter = ut.flyt!.oppsett.avbildninger.some((a) => a.type === 'bekreftelse' && a.fra.some((k) => k.sporsmal === neste.id))
        s = medFlytsvar(s, neste.id, neste.id === 'alder' ? '18_64' : neste.art === 'avkrysning' || bekrefter ? 'ja' : 'nei')
      } else s = { ...s, formvalg: { ...s.formvalg, ...Object.fromEntries(former.map(([forlop, k]) => [forlop, { ...s.formvalg[forlop], legemiddelform: k[0]! }])) } }
      ut = tilstand()
    }
    let skjema = ut.skjema!
    const regel = ut.regel!
    let plan = beregnPlan(regel, f.valg, skjema, f.fest.utvalg, naa)
    for (let i = 0; plan.status === 'stoppet' && plan.trinnvalg?.length && i < 30; i++) {
      skjema = medTrinnvalg(skjema, plan.trinnvalg[0]!, plan.trinnvalg[0]!.doser[0]!.mg)
      plan = beregnPlan(regel, f.valg, skjema, f.fest.utvalg, naa)
    }
    return { ut, plan, skjema }
  }

  it('gir en klinisk, komplett plan med de nye spørsmålene, uten å røre måldosen eller noen klinisk vurdering', () => {
    for (const f of FORLOP) {
      const { ut, plan, skjema } = forlop(f)
      expect(ut.regel?.id, f.regel).toBe(f.regel)
      expect(ut.flyt!.oppsett.katalog, f.regel).toBe(true)
      expect(
        ut.tilstand.sporsmal.every((q) => q.kategori !== 'uklassifisert' && !q.alternativer.some((a) => /Gjelder/.test(a.tekst))),
        f.regel,
      ).toBe(true)
      expect(ut.tilstand, f.regel).toMatchObject({ steg: 'plan', kontroll: { utfall: 'kan_lages_hvis', gjenstar: 0 } })
      expect(skjema.maldose, f.regel).toBe(f.skjema.maldose)
      // Hver klinisk vurdering er besvart uttrykkelig med «Ja» av klinikeren.
      for (const q of ut.tilstand.sporsmal.filter((x) => x.kategori === 'klinisk_vurdering')) expect(q.valgt, `${f.regel} ${q.id}`).toBe('ja')
      expect(plan.status, f.regel).toBe('doseplan')
      expect(plan.status === 'doseplan' && plan.klinisk, f.regel).toBe(true)
    }
  })

  it('gir ingen plan når en klinisk vurdering er «Ikke ennå», et stoppforhold er «Ja» eller «Ukjent», eller måldosen ikke er valgt', () => {
    for (const f of FORLOP) {
      const vanlig = forlop(f).ut
      const sporsmal = vanlig.tilstand.sporsmal
      expect(sporsmal.filter((x) => x.kategori === 'klinisk_vurdering').length, f.regel).toBeGreaterThan(0)
      expect(sporsmal.filter((x) => x.gruppe === 'stopp' && x.stopperVed?.length).length, f.regel).toBeGreaterThan(0)
      for (const q of sporsmal.filter((x) => x.kategori === 'klinisk_vurdering')) {
        const { ut, plan } = forlop(f, { [q.id]: 'nei' })
        expect(plan.status, `${f.regel} ${q.id} ikke ennå`).toBe('stoppet')
        expect(ut.tilstand.steg).not.toBe('plan')
        expect(ut.tilstand.kontroll.gjenstar).toBeGreaterThan(0)
      }
      for (const q of sporsmal.filter((x) => x.gruppe === 'stopp' && x.alternativer === SVARSETT.ja_nei_ukjent)) {
        for (const v of ['ja', 'nei', 'ukjent']) {
          const stopper = v === 'ukjent' || q.stopperVed?.includes(v)
          if (!stopper) continue
          const { ut, plan } = forlop(f, { [q.id]: v })
          expect(plan.status, `${f.regel} ${q.id} ${v}`).toBe('stoppet')
          expect(ut.tilstand.steg, `${f.regel} ${q.id} ${v}`).not.toBe('plan')
          if (v !== 'ukjent') expect(ut.tilstand.kontroll.utfall, `${f.regel} ${q.id} ${v}`).toBe('kan_ikke')
        }
      }
      const { maldose: _m, ...uten } = f.skjema
      const umal = forlop({ ...f, skjema: uten })
      expect(umal.ut.tilstand.steg, f.regel).toBe('behandling')
      expect(umal.skjema.maldose, f.regel).toBe('')
      expect(umal.plan.status, f.regel).toBe('stoppet')
    }
  })
})

describe('flyten og forhåndskontrollen er enige om svar som stopper', () => {
  type Tilfelle = { verktoy: (typeof VERKTOY)[number]; valg: Verktoyvalg; fest: Festuttrekk; skjema: Partial<Planskjema> }
  const AP = uttrekk(FEST_ANTIPSYKOTIKA)
  const ap = (fra: string, til: string, form: Verktoyvalg['fra']['formulering'], startdose: string): Tilfelle => ({
    verktoy: BYTTE_AP,
    valg: { fra: { nokkel: fra, formulering: 'standard' }, til: { nokkel: til, formulering: form } },
    fest: AP,
    skjema: { startdose },
  })
  const tillegg = (fra: string, startdose: string): Tilfelle => ({
    verktoy: TILLEGGSVERKTOY,
    valg: { fra: { nokkel: fra, formulering: 'standard' }, til: { nokkel: 'lamotrigin', formulering: 'standard' } },
    fest: TILLEGG,
    skjema: { startdose },
  })
  /** Hver regel med kontrollert katalog i appen, og escitalopram og byttene til sertralin med katalogen kontrollert i testen. */
  const TILFELLER: Record<string, Tilfelle> = {
    'depot-aripiprazol-maintena': ap('aripiprazol', 'aripiprazol', 'LA', '15'),
    'depot-paliperidon-xeplion': ap('paliperidon', 'paliperidon', 'ER', '6'),
    'depot-risperidon-xeplion': ap('risperidon', 'paliperidon', 'ER', '3'),
    'antipsykotikabytte-olanzapin-aripiprazol': ap('olanzapin', 'aripiprazol', 'standard', '20'),
    'antipsykotikabytte-risperidon-aripiprazol': ap('risperidon', 'aripiprazol', 'standard', '3'),
    'tillegg-valproat-lamotrigin': tillegg('valproat', '1000'),
    'tillegg-litium-lamotrigin': tillegg('litium', '84'),
    [ESC.id]: { verktoy: NED, valg: { fra: { nokkel: 'escitalopram', formulering: 'standard' } }, fest: AKSEPT, skjema: { startdose: '20' } },
    ...Object.fromEntries(
      ['escitalopram', 'citalopram'].map((stoff) => [
        `bytte-${stoff}-sertralin`,
        { verktoy: BYTTE_AD, valg: { fra: { nokkel: stoff, formulering: 'standard' }, til: { nokkel: 'sertralin', formulering: 'standard' } }, fest: PILOT, skjema: { startdose: '20' } },
      ]),
    ),
  }

  it('dekker hver regel med kontrollert katalog', () => {
    expect(KONTROLLERTE_KATALOGER.map((k) => k.regel).filter((id) => !(id in TILFELLER))).toEqual([])
  })

  it('gir «kan ikke» med flytens stoppgrunn for hvert svar flyten sier stopper, i katalogen og i reservevisningen', () => {
    let antall = 0
    for (const [id, t] of Object.entries(TILFELLER)) {
      const r = regel(id)
      for (const [navn, g] of [
        ['katalog', katalog(r)],
        ['reserve', RESERVE],
        ['appen', {}],
      ] as const) {
        const base = besvarTillatende(r, g)
        const vanlig = vurderFlyt(r, base, g)
        expect(vanlig.stopp, `${id} ${navn}`).toEqual([])
        for (const q of vanlig.sporsmal) {
          for (const v of q.stopperVed ?? []) {
            const svar = { ...base, [q.id]: v }
            const flyt = vurderFlyt(r, svar, g)
            const hva = `${id} ${navn} ${q.id}=${v}`
            expect(
              flyt.stopp.map((x) => x.sporsmal),
              hva,
            ).toContain(q.id)
            const skjema: Planskjema = { ...TOMT_SKJEMA, ...t.skjema, flytsvar: svar }
            const grunnlag = { verktoy: t.verktoy, valg: t.valg, sperrer: [], regel: r, skjema, utvalg: t.fest.utvalg, naa: klokke(t.fest) }
            // Samme svar gir samme utfall og samme stoppgrunn, med flyten gitt …
            expect(forhandskontroll({ ...grunnlag, flyt }), hva).toEqual({ utfall: 'kan_ikke', grunner: flyt.stopp, gjenstar: 0, regler: [r] })
            // … og i hele tilstanden: ingenting står igjen, og planen er ikke neste steg.
            const ut = flyttilstand({ ...grunnlag, flytgrunnlag: g })
            expect(ut.tilstand.kontroll, hva).toEqual({ utfall: 'kan_ikke', grunner: flyt.stopp, gjenstar: 0 })
            expect(ut.tilstand.steg, hva).not.toBe('plan')
            // Uten flyten regner forhåndskontrollen den selv fra svarene i skjemaet, med appens katalogoppsett.
            if (navn === 'appen') expect(forhandskontroll(grunnlag), hva).toMatchObject({ utfall: 'kan_ikke', grunner: flyt.stopp })
            antall++
          }
        }
      }
    }
    expect(antall).toBeGreaterThan(100)
  })
})

describe('stoppforklaringene', () => {
  it('kjenner igjen motorens faste tekster', () => {
    expect(klassifiser(`${KOMPLETT_IKKE_TILGJENGELIG}: escitalopram: …`)).toBe('ikke_komplett')
    expect(klassifiser(`Startdosen 15 mg … ${UTENFOR_OMFANG}`)).toBe('utenfor_omfang')
    expect(klassifiser('Regelen gjelder ikke: Pasienten er under 18 år.')).toBe('unntak_gjelder')
    expect(klassifiser('Må avklares før beregning (ukjent): Pasienten er under 18 år.')).toBe('unntak_ukjent')
    expect(klassifiser('Må bekreftes før beregning: Planen er et startforslag')).toBe('bekreftelse_mangler')
    expect(klassifiser('Må besvares før beregning: Er pasienten over 65 år?')).toBe('sporsmal_ubesvart')
    expect(klassifiser('escitalopram (fra) finnes i flere legemiddelformer (Tablett [53] og Dråper [748]); formen må velges, beregningen blander dem ikke av seg selv.')).toBe('formvalg_trengs')
    expect(klassifiser('Noe helt annet.')).toBe('annet')
  })

  it('forklarer et stoppet resultat på vanlig norsk, med motorens tekst som detalj og spørsmålet det gjelder', () => {
    const valg: Verktoyvalg = { fra: { nokkel: 'escitalopram', formulering: 'standard' } }
    const g = katalog(ESC)
    const f = vurderFlyt(ESC, { ...besvarTillatende(ESC, g), tidligere_seponeringsplager: 'ja' }, g)
    const plan = beregnPlan(ESC, valg, medFlytfelt({ ...TOMT_SKJEMA, startdose: '20', formvalg: { fra: { legemiddelform: '748' } } }, f.felt), AKSEPT.utvalg, klokke(AKSEPT))
    const ut = stoppforklaringer(plan, ESC, f.oppsett)
    expect(ut[0]).toMatchObject({ kode: 'unntak_gjelder', sporsmal: 'tidligere_seponeringsplager', losning: 'individuelt', tekst: expect.stringMatching(/langsomme varianten/) })
    expect(ut[0]!.detalj).toMatch(/^Regelen gjelder ikke: /)
    for (const x of Object.values(FORKLARINGER)) expect(x.tekst).not.toMatch(/omfang|strategi|fingeravtrykk/i)
  })
})

describe('oversikten per verktøy (P11)', () => {
  it('sier hva hvert verktøy kan gi nå', () => {
    expect(verktoystatus(NED, [])).toMatchObject({ kanGiPlan: true, tekst: 'Komplett plan kan lages for Escitalopram.' })
    expect(verktoystatus(BYTTE_AD, [])).toMatchObject({ kanGiPlan: true, tekst: 'Komplett plan kan lages for Citalopram → sertralin og Escitalopram → sertralin.' })
    expect(verktoystatus(BYTTE_AD, []).valg.map((v) => v.tekst)).toEqual(['Citalopram → sertralin', 'Escitalopram → sertralin'])
    const alle: Verktoysperre = { id: 's', omfang: 'alle', mal: null, grunn: 'Test', satt_kl: '2026-11-04T10:00:00Z', satt_av: null }
    expect(verktoystatus(TILLEGGSVERKTOY, [alle])).toMatchObject({ kanGiPlan: false, tekst: 'Verktøyet er midlertidig deaktivert. Ingen plan kan lages nå.' })
  })
})

describe('kontrollgrunnlaget for språket (§4.4)', () => {
  it(`${KATALOGTABELLFIL} stemmer med katalogen (lag den på nytt med npx vite-node scripts/verktoy-sporsmalskatalog.ts)`, () => {
    expect(les(KATALOGTABELLFIL)).toBe(lagKatalogtabell())
  })
})
